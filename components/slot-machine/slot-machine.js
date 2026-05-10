Component({
  properties: {
    foods: {
      type: Array,
      value: [],
      observer: function(newVal) {
        if (!newVal || newVal.length === 0) {
          this.setData({ items0: [], items1: [], items2: [] });
          return;
        }
        const hash = newVal.join(',');
        // 如果还未初始化，或者食物列表发生变化，则重新初始化列数据
        if (!this.data.inited || this.data._foodsHash !== hash) {
          this.initColumns(newVal);
        }
      }
    },
    myMenu: { type: Array, value: [] },
    excludedFoods: { type: Array, value: [] },
    spinning: { type: Boolean, value: false },
    targetIndex: { type: Number, value: -1 }
  },

  data: {
    items0: [], items1: [], items2: [],
    anim0: {}, anim1: {}, anim2: {},
    highlight0: -1, highlight1: -1, highlight2: -1,
    inited: false,
    itemHeight: 44, // 与 css 中保持一致
    colHeight: 240, // .slot-column 高度（默认480rpx -> ~240px，在 ready 测量）
    _foodsHash: ''
  },

  lifetimes: {
    attached() { this._tryInit(); },
    ready()    { this._tryInit(); this._measureHeight(); },
    detached() { this._clearTimers(); }
  },

  methods: {
    _tryInit() {
      const foods = this.properties.foods;
      if (foods && foods.length > 0 && !this.data.inited) this.initColumns(foods);
    },

    _clearTimers() {
      // 只清动画相关 timer，不清高度测量 timer
      if (this._spinTimer) { clearTimeout(this._spinTimer); this._spinTimer = null; }
      (this._delayTimers || []).forEach(function(t) { clearTimeout(t); });
      this._delayTimers = [];
    },

    _measureHeight() {
      // machine-area 高度固定（480rpx），只需在 ready() 量一次
      if (this._measureTimer) { clearTimeout(this._measureTimer); this._measureTimer = null; }
      this._measureTimer = setTimeout(function() {
        var query = this.createSelectorQuery();
        query.select('.slot-column').boundingClientRect(function(rect) {
          if (rect && rect.height > 0) this.setData({ colHeight: rect.height });
        }.bind(this)).exec();
      }.bind(this), 150);
    },

    // ─── 核心逻辑 ──────────────────────────────────────────────────

    /**
     * 构建一列的 items。
     * 为彻底解决数量变化导致的诸多问题（动画过慢、高度越界、留白穿帮、高亮错乱），
     * 采用“定长架构”：每列固定 40 个节点，目标菜品永远固定在第 30 个节点。
     */
    _buildColumn(foods, targetFood) {
      var items = [];
      var targetTotal = 40;
      var targetPos = 30;

      for (var i = 0; i < targetTotal; i++) {
        var food = foods[Math.floor(Math.random() * foods.length)];
        if (i === targetPos && targetFood !== undefined) {
          food = targetFood;
        }
        items.push({ id: i, name: food });
      }
      return items;
    },

    _calcFinalY() {
      var itemHeight = this.data.itemHeight;
      var colHeight  = this.data.colHeight || 240;
      var targetPos = 30;
      return targetPos * itemHeight + itemHeight / 2 - colHeight / 2;
    },

    // ─── 列初始化 ──────────────────────────────────────────────────

    initColumns(foods, targetFood, cb) {
      if (typeof targetFood === 'function') { cb = targetFood; targetFood = undefined; }

      if (!foods || foods.length === 0) {
        this.setData({
          items0: [], items1: [], items2: [],
          anim0: {}, anim1: {}, anim2: {},
          highlight0: -1, highlight1: -1, highlight2: -1,
          inited: false
        }, cb);
        return;
      }

      var items0 = this._buildColumn(foods, targetFood);
      var items1 = this._buildColumn(foods, targetFood);
      var items2 = this._buildColumn(foods, targetFood);
      var hash   = foods.join(',');

      var a0 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
      var a1 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
      var a2 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
      a0.translateY(0).step();
      a1.translateY(0).step();
      a2.translateY(0).step();

      this.setData({
        items0: items0, items1: items1, items2: items2,
        anim0: a0.export(), anim1: a1.export(), anim2: a2.export(),
        highlight0: -1, highlight1: -1, highlight2: -1,
        inited: true, _foodsHash: hash
      }, cb);
    },

    // ─── 主入口：开始旋转 ──────────────────────────────────────────

    startSpin(opts) {
      var foods = this.properties.foods.length ? this.properties.foods : this.data.foods;
      var foodsLen = foods.length;
      var targetIndex = (opts && opts.targetIndex !== undefined) ? opts.targetIndex : this.properties.targetIndex;

      if (!foodsLen || targetIndex < 0 || targetIndex >= foodsLen) return;

      this._clearTimers();

      var targetFood = foods[targetIndex];
      var self = this;

      // 重建 items + anim 归零
      this.initColumns(foods, targetFood, function() {
        wx.nextTick(function() {
          wx.nextTick(function() {
            self._runSpinAnimation();
          });
        });
      });
    },

    _runSpinAnimation() {
      var self     = this;
      var duration = 2800;
      var delays   = [0, 120, 240];
      var finalY   = this._calcFinalY();

      this._delayTimers = [];

      for (var i = 0; i < 3; i++) {
        (function(col, delay) {
          var t = setTimeout(function() {
            var anim = wx.createAnimation({
              duration: duration,
              timingFunction: 'ease-out'
            });
            anim.translateY(-finalY).step();
            var patch = {};
            patch['anim' + col] = anim.export();
            self.setData(patch);
          }, delay);
          self._delayTimers.push(t);
        })(i, delays[i]);
      }

      var totalTime = duration + delays[2] + 100;
      this._spinTimer = setTimeout(function() {
        self._onSpinComplete();
      }, totalTime);
    },

    _onSpinComplete() {
      this.setData({
        highlight0: 30,
        highlight1: 30,
        highlight2: 30
      });
      this.triggerEvent('onComplete');
    },

    // ─── 外部高亮更新 ──────────────────────────────────────────────

    updateHighlight(index) {
      var foods = this.properties.foods.length ? this.properties.foods : this.data.foods;
      if (!foods || foods.length === 0 || index < 0) return;

      var targetFood = foods[index];
      var targetPos = 30;

      // 如果 items 尚未初始化，先初始化
      if (!this.data.items0 || this.data.items0.length === 0) {
        this.initColumns(foods, targetFood, function() {
          var self = this;
          wx.nextTick(function() {
            wx.nextTick(function() {
              self.updateHighlight(index);
            });
          });
        }.bind(this));
        return;
      }

      // 直接将当前滚动目标位置（30）替换为要预览的菜品
      var items0 = this.data.items0.slice();
      var items1 = this.data.items1.slice();
      var items2 = this.data.items2.slice();

      items0[targetPos] = { id: items0[targetPos].id, name: targetFood };
      items1[targetPos] = { id: items1[targetPos].id, name: targetFood };
      items2[targetPos] = { id: items2[targetPos].id, name: targetFood };

      // 瞬间跳转到目标位置（无动画），确保预览的高亮可见
      var finalY = this._calcFinalY();
      var a0 = wx.createAnimation({ duration: 0 }); a0.translateY(-finalY).step();
      var a1 = wx.createAnimation({ duration: 0 }); a1.translateY(-finalY).step();
      var a2 = wx.createAnimation({ duration: 0 }); a2.translateY(-finalY).step();

      this.setData({
        items0: items0, items1: items1, items2: items2,
        highlight0: targetPos, highlight1: targetPos, highlight2: targetPos,
        anim0: a0.export(), anim1: a1.export(), anim2: a2.export()
      });
    },

    // ─── 事件 ──────────────────────────────────────────────────────

    onItemTap(e) {
      this.triggerEvent('onPreviewFood', e.currentTarget.dataset.name);
    },

    onItemLongPress(e) {
      this.triggerEvent('onToggleFood', e.currentTarget.dataset.name);
    }
  }
});
