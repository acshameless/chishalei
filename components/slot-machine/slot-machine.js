Component({
  properties: {
    foods: { type: Array, value: [] },
    myMenu: { type: Array, value: [] },
    excludedFoods: { type: Array, value: [] },
    spinning: { type: Boolean, value: false },
    targetIndex: { type: Number, value: -1 }
  },

  data: {
    items0: [], items1: [], items2: [],
    offset0: 0, offset1: 0, offset2: 0,
    anim0: null, anim1: null, anim2: null,
    highlight0: -1, highlight1: -1, highlight2: -1,
    itemHeight: 44,
    colHeight: 240,
    inited: false,
    _foodsHash: ''
  },

  spinTimer: null,

  lifetimes: {
    attached() { this._tryInit(); },
    ready() { this._tryInit(); this._measureHeight(); },
    detached() { this._clearTimers(); }
  },

  observers: {
    'foods': function(foods) {
      if (!foods || foods.length === 0) {
        this.setData({
          items0: [], items1: [], items2: [],
          offset0: 0, offset1: 0, offset2: 0,
          anim0: null, anim1: null, anim2: null,
          highlight0: -1, highlight1: -1, highlight2: -1,
          inited: false, _foodsHash: ''
        });
        return;
      }
      const hash = this._hashFoods(foods);
      if (!this.data.inited || this.data._foodsHash !== hash) {
        this.initColumns(foods);
      }
    }
  },

  methods: {
    _tryInit() {
      const foods = this.data.foods || this.properties.foods;
      if (foods && foods.length > 0 && !this.data.inited) this.initColumns(foods);
    },

    _hashFoods(foods) { return foods.join(','); },

    _clearTimers() {
      if (this.spinTimer) { clearTimeout(this.spinTimer); this.spinTimer = null; }
    },

    _measureHeight() {
      const query = this.createSelectorQuery();
      query.select('.slot-column').boundingClientRect((rect) => {
        if (rect && rect.height > 0) this.setData({ colHeight: rect.height });
      }).exec();
    },

    _getItems(i) {
      return i === 0 ? this.data.items0 : i === 1 ? this.data.items1 : this.data.items2;
    },

    initColumns(foods) {
      if (!foods || foods.length === 0) {
        this.setData({
          items0: [], items1: [], items2: [],
          offset0: 0, offset1: 0, offset2: 0,
          anim0: null, anim1: null, anim2: null,
          highlight0: -1, highlight1: -1, highlight2: -1,
          inited: false
        });
        return;
      }

      const itemHeight = this.data.itemHeight;
      const repeat = Math.min(5, Math.max(3, Math.floor(300 / foods.length)));
      const itemsArr = [0, 1, 2].map(() => {
        const items = [];
        for (let r = 0; r < repeat; r++) items.push(...this._shuffle(foods));
        return items;
      });

      const offsets = [0, 1, 2].map(() =>
        -Math.floor(Math.random() * foods.length) * itemHeight
      );

      const hash = this._hashFoods(foods);

      this.setData({
        items0: itemsArr[0], items1: itemsArr[1], items2: itemsArr[2]
      }, () => {
        this.setData({
          offset0: offsets[0], offset1: offsets[1], offset2: offsets[2],
          anim0: null, anim1: null, anim2: null,
          highlight0: -1, highlight1: -1, highlight2: -1,
          inited: true, _foodsHash: hash
        });
      });
    },

    startSpin(opts) {
      const foods = this.data.foods.length ? this.data.foods : this.properties.foods;
      const foodsLen = foods.length;
      const itemHeight = this.data.itemHeight;
      const targetIndex = (opts && opts.targetIndex !== undefined)
        ? opts.targetIndex
        : (this.data.targetIndex >= 0 ? this.data.targetIndex : this.properties.targetIndex);

      if (!foodsLen || targetIndex < 0 || targetIndex >= foodsLen) return;

      this._clearTimers();

      const colHeight = this.data.colHeight || 240;
      const repeat = Math.min(5, Math.max(3, Math.floor(300 / foodsLen)));
      const cycleHeight = foodsLen * itemHeight;
      const targetCycle = Math.floor(repeat / 2);
      const centerOffset = colHeight / 2 - itemHeight / 2;

      const safeBottom = -(repeat - 2) * cycleHeight;
      const offsets = [this.data.offset0, this.data.offset1, this.data.offset2];
      const needsReset = offsets.some(y => y < safeBottom);
      if (needsReset) this.initColumns(foods);

      // 列配置：同时启动，距离递增，速度大致相同，依次落定
      // extraRounds 越大 → 滚动距离越长 → duration 越长，但速度保持相近
      const colConfigs = [
        { extraRounds: 0, duration: 1.6 }, // 左列：距离最短，最先停
        { extraRounds: 1, duration: 2.2 }, // 中列：距离中等，次停
        { extraRounds: 2, duration: 2.8 }  // 右列：距离最长，最后落定
      ];

      const targetFood = foods[targetIndex];
      const anims = [null, null, null];
      const finalOffsets = [0, 0, 0];
      const finalHighlights = [-1, -1, -1];
      let maxDurationMs = 0;

      for (let i = 0; i < 3; i++) {
        const items = this._getItems(i);
        const { extraRounds, duration } = colConfigs[i];
        const destCycle = targetCycle + extraRounds;
        const cycleStartIdx = destCycle * foodsLen;

        const posInCol = items.indexOf(targetFood, cycleStartIdx);
        const effectivePos = posInCol >= 0 ? posInCol % foodsLen : targetIndex;

        const finalY = -(destCycle * cycleHeight + effectivePos * itemHeight) + centerOffset;
        finalOffsets[i] = finalY;
        finalHighlights[i] = cycleStartIdx + effectivePos;

        maxDurationMs = Math.max(maxDurationMs, (duration + 0.3) * 1000);

        const anim = wx.createAnimation({
          duration: duration * 1000,
          timingFunction: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
          delay: 0
        });
        anim.translateY(finalY).step();
        anims[i] = anim.export();
      }

      this.setData({
        anim0: anims[0], anim1: anims[1], anim2: anims[2],
        highlight0: -1, highlight1: -1, highlight2: -1
      });

      this.spinTimer = setTimeout(() => {
        this.spinTimer = null;
        this.setData({
          offset0: finalOffsets[0], offset1: finalOffsets[1], offset2: finalOffsets[2],
          anim0: null, anim1: null, anim2: null,
          highlight0: finalHighlights[0], highlight1: finalHighlights[1], highlight2: finalHighlights[2]
        });
        this.triggerEvent('onComplete');
      }, maxDurationMs + 100);
    },

    updateHighlight(index) {
      const foods = this.data.foods;
      const foodsLen = foods.length;
      if (!foodsLen || index < 0) return;

      const repeat = Math.min(5, Math.max(3, Math.floor(300 / foodsLen)));
      const targetCycle = Math.floor(repeat / 2);
      const highlights = [-1, -1, -1];

      for (let i = 0; i < 3; i++) {
        const items = this._getItems(i);
        const extraRounds = i; // 与 startSpin 的 colConfigs 对齐
        const destCycle = targetCycle + extraRounds;
        const cycleStartIdx = destCycle * foodsLen;
        const posInCol = items.indexOf(foods[index], cycleStartIdx);
        const effectivePos = posInCol >= 0 ? posInCol % foodsLen : index;
        highlights[i] = cycleStartIdx + effectivePos;
      }

      this.setData({
        highlight0: highlights[0], highlight1: highlights[1], highlight2: highlights[2]
      });
    },

    onItemTap(e) {
      const name = e.currentTarget.dataset.name;
      this.triggerEvent('onToggleFood', name);
    },

    _shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
  }
});
