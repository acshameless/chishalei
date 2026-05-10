/**
 * slot-machine 组件
 *
 * 动画方案：wx.createAnimation（微信官方动画 API）
 * 每列使用独立的 animation 对象，彻底避免原始 Bug：
 *   - 原始 Bug：reset.export() 调用 3 次，export() 只消费队列一次，
 *     anim1/anim2 拿到空对象 {actions:[]}，导致后两列没有重置动画。
 *   - 修复：每列独立 createAnimation，每次 export() 只调用一次。
 */
Component({
  properties: {
    foods:         { type: Array,   value: [] },
    myMenu:        { type: Array,   value: [] },
    excludedFoods: { type: Array,   value: [] },
    spinning:      { type: Boolean, value: false },
    targetIndex:   { type: Number,  value: -1 }
  },

  data: {
    items0: [], items1: [], items2: [],
    anim0: {}, anim1: {}, anim2: {},
    highlight0: -1, highlight1: -1, highlight2: -1,
    itemHeight: 44,
    colHeight: 240,
    inited: false,
    _foodsHash: ''
  },

  // 非响应式私有字段
  _spinTimer: null,
  _delayTimers: [],
  _measureTimer: null,

  lifetimes: {
    attached() { this._tryInit(); },
    ready()    { this._tryInit(); this._measureHeight(); },
    detached() {
      this._clearTimers();
      if (this._measureTimer) { clearTimeout(this._measureTimer); this._measureTimer = null; }
    }
  },

  observers: {
    'foods': function(foods) {
      if (!foods || foods.length === 0) {
        this.setData({
          items0: [], items1: [], items2: [],
          highlight0: -1, highlight1: -1, highlight2: -1,
          inited: false, _foodsHash: ''
        });
        return;
      }
      const hash = foods.join(',');
      if (!this.data.inited || this.data._foodsHash !== hash) {
        this.initColumns(foods);
      }
    }
  },

  methods: {

    // ─── 初始化 ────────────────────────────────────────────────────

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

    // ─── 工具方法 ──────────────────────────────────────────────────

    _getRepeat(foodsLen) {
      if (foodsLen <= 0) return 2;
      // 每列节点数控制在 800 以内，避免 WXML 渲染层裁剪节点
      return Math.max(2, Math.min(3, Math.floor(800 / foodsLen)));
    },

    _shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },

    /**
     * 构建一列的 items。
     * 当 targetFood 定义时，将其放到最后一个 cycle 的首位，
     * 确保 _calcFinalY 能稳定找到目标位置。
     */
    _buildColumn(foods, targetFood, repeat) {
      var items = [];
      for (var r = 0; r < repeat; r++) {
        var shuffled = this._shuffle(foods);
        if (r === repeat - 1 && targetFood !== undefined) {
          var idx = shuffled.indexOf(targetFood);
          if (idx > 0) {
            shuffled.splice(idx, 1);
            shuffled.unshift(targetFood);
          } else if (idx < 0) {
            shuffled.unshift(targetFood);
            shuffled.pop();
          }
        }
        for (var k = 0; k < shuffled.length; k++) items.push(shuffled[k]);
      }
      return items;
    },

    /**
     * 计算 strip 需要向上滚动多少 px，才能让 targetFood 精确居中。
     * 公式：item 中心 = posInCol * itemH + itemH/2
     *       令其等于 colHeight/2
     *       => finalY = posInCol * itemH + itemH/2 - colHeight/2
     */
    _calcFinalY(items, targetFood, foods, repeat) {
      var itemHeight = this.data.itemHeight;
      var colHeight  = this.data.colHeight || 240;
      var foodsLen   = foods.length;
      var lastCycleStart = (repeat - 1) * foodsLen;

      var posInCol = -1;
      for (var i = lastCycleStart; i < items.length; i++) {
        if (items[i] === targetFood) { posInCol = i; break; }
      }
      if (posInCol < 0) posInCol = lastCycleStart;

      return posInCol * itemHeight + itemHeight / 2 - colHeight / 2;
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

      var repeat = this._getRepeat(foods.length);
      var items0 = this._buildColumn(foods, targetFood, repeat);
      var items1 = this._buildColumn(foods, targetFood, repeat);
      var items2 = this._buildColumn(foods, targetFood, repeat);
      var hash   = foods.join(',');

      // 每列独立创建 animation 对象（duration:0 = 瞬间归位到 Y=0）
      // 关键：不能复用同一个 animation 对象，export() 只消费一次
      var a0 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
      a0.translateY(0).step();
      var a1 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
      a1.translateY(0).step();
      var a2 = wx.createAnimation({ duration: 0, timingFunction: 'linear' });
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
      var foods = this.properties.foods.length
        ? this.properties.foods : this.data.foods;
      var foodsLen = foods.length;
      var targetIndex = (opts && opts.targetIndex !== undefined)
        ? opts.targetIndex : this.properties.targetIndex;

      if (!foodsLen || targetIndex < 0 || targetIndex >= foodsLen) return;

      this._clearTimers();

      var targetFood = foods[targetIndex];
      var repeat     = this._getRepeat(foodsLen);
      var self       = this;

      // Step 1: 重建 items + anim 归零（duration:0，瞬间到 Y=0）
      this.initColumns(foods, targetFood, function() {
        // Step 2: 等两帧，确保渲染层已把 duration:0 的动画提交完毕
        wx.nextTick(function() {
          wx.nextTick(function() {
            // Step 3: 触发滚动动画
            self._runSpinAnimation(foods, targetFood, repeat);
          });
        });
      });
    },

    _runSpinAnimation(foods, targetFood, repeat) {
      var self     = this;
      var duration = 2800;
      var delays   = [0, 120, 240];

      var items    = [this.data.items0, this.data.items1, this.data.items2];
      var finalYs  = [
        this._calcFinalY(items[0], targetFood, foods, repeat),
        this._calcFinalY(items[1], targetFood, foods, repeat),
        this._calcFinalY(items[2], targetFood, foods, repeat)
      ];

      this._delayTimers = [];

      // 三列各自独立创建 animation 对象，stagger 启动
      for (var i = 0; i < 3; i++) {
        (function(col, delay, finalY) {
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
        })(i, delays[i], finalYs[i]);
      }

      // 最后一列动画结束后处理高亮和回调
      var totalTime = duration + delays[2] + 100;
      this._spinTimer = setTimeout(function() {
        self._onSpinComplete(foods, targetFood, repeat);
      }, totalTime);
    },

    _onSpinComplete(foods, targetFood, repeat) {
      var foodsLen = foods.length;
      if (!foodsLen) return;

      var items = [this.data.items0, this.data.items1, this.data.items2];
      var highlights = [0, 1, 2].map(function(i) {
        var lastCycleStart = (repeat - 1) * foodsLen;
        for (var j = lastCycleStart; j < items[i].length; j++) {
          if (items[i][j] === targetFood) return j;
        }
        return lastCycleStart;
      });

      this.setData({
        highlight0: highlights[0],
        highlight1: highlights[1],
        highlight2: highlights[2]
      });
      this.triggerEvent('onComplete');
    },

    // ─── 外部高亮更新 ──────────────────────────────────────────────

    updateHighlight(index) {
      var foods = this.properties.foods.length
        ? this.properties.foods : this.data.foods;
      var foodsLen = foods.length;
      if (!foodsLen || index < 0) return;

      var targetFood     = foods[index];
      var repeat         = this._getRepeat(foodsLen);
      var lastCycleStart = (repeat - 1) * foodsLen;

      var items = [this.data.items0, this.data.items1, this.data.items2];
      var highlights = [0, 1, 2].map(function(i) {
        for (var j = lastCycleStart; j < items[i].length; j++) {
          if (items[i][j] === targetFood) return j;
        }
        return lastCycleStart + index;
      });

      this.setData({
        highlight0: highlights[0],
        highlight1: highlights[1],
        highlight2: highlights[2]
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
