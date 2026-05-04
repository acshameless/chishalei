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

    _setItems(itemsArr) {
      this.setData({ items0: itemsArr[0], items1: itemsArr[1], items2: itemsArr[2] });
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

      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const itemsArr = [0, 1, 2].map(() => {
        const items = [];
        for (let r = 0; r < repeat; r++) items.push(...this._shuffle([...foods]));
        return items;
      });

      const offsets = [0, 1, 2].map(() =>
        -Math.floor(Math.random() * foods.length) * this.data.itemHeight
      );

      this.setData({
        items0: itemsArr[0], items1: itemsArr[1], items2: itemsArr[2],
        offset0: offsets[0], offset1: offsets[1], offset2: offsets[2],
        anim0: null, anim1: null, anim2: null,
        highlight0: -1, highlight1: -1, highlight2: -1,
        inited: true, _foodsHash: this._hashFoods(foods)
      });
    },

    startSpin(opts) {
      const foods = this.data.foods.length ? this.data.foods : this.properties.foods;
      const itemHeight = this.data.itemHeight;
      const targetIndex = (opts && opts.targetIndex !== undefined)
        ? opts.targetIndex
        : (this.data.targetIndex >= 0 ? this.data.targetIndex : this.properties.targetIndex);

      if (!foods.length || targetIndex < 0 || targetIndex >= foods.length) return;

      this._clearTimers();

      const colHeight = this.data.colHeight || 240;
      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const cycleHeight = foods.length * itemHeight;
      const targetCycle = Math.floor(repeat / 2);
      const centerOffset = colHeight / 2 - itemHeight / 2;

      // 若当前位置接近列底部，重新 initColumns 避免空白
      const safeBottom = -(repeat - 2) * cycleHeight;
      const offsets = [this.data.offset0, this.data.offset1, this.data.offset2];
      const needsReset = offsets.some(y => y < safeBottom);
      if (needsReset) this.initColumns(foods);

      let maxDurationMs = 0;
      const anims = [null, null, null];
      const finalOffsets = [0, 0, 0];
      const finalHighlights = [-1, -1, -1];

      [0, 1, 2].forEach(i => {
        const items = this._getItems(i);
        const distFromMid = Math.abs(i - 1);
        const extraRounds = distFromMid * 2;
        const destCycle = targetCycle + extraRounds;

        // 在目标 cycle 中查找这道菜的位置（每个 cycle 的 _shuffle 是独立的）
        const posInCol = items.findIndex((name, idx) =>
          idx >= destCycle * foods.length && name === foods[targetIndex]
        );
        const effectivePos = posInCol >= 0 ? posInCol % foods.length : targetIndex;

        const finalY = -(destCycle * cycleHeight + effectivePos * itemHeight) + centerOffset;
        finalOffsets[i] = finalY;
        finalHighlights[i] = destCycle * foods.length + effectivePos;

        const delay = distFromMid * 0.25;
        const duration = 1.6 + distFromMid * 0.6;
        maxDurationMs = Math.max(maxDurationMs, (duration + delay + 0.3) * 1000);

        const anim = wx.createAnimation({
          duration: duration * 1000,
          timingFunction: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
          delay: delay * 1000
        });
        anim.translateY(finalY).step();
        anims[i] = anim.export();
      });

      // 只更新 animation 和 highlight，绝不触碰庞大的 items
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
      if (!foods.length || index < 0) return;

      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const targetCycle = Math.floor(repeat / 2);
      const highlights = [-1, -1, -1];

      [0, 1, 2].forEach(i => {
        const items = this._getItems(i);
        const distFromMid = Math.abs(i - 1);
        const extraRounds = distFromMid * 2;
        const destCycle = targetCycle + extraRounds;
        const posInCol = items.findIndex((name, idx) =>
          idx >= destCycle * foods.length && name === foods[index]
        );
        const effectivePos = posInCol >= 0 ? posInCol % foods.length : index;
        highlights[i] = destCycle * foods.length + effectivePos;
      });

      this.setData({
        highlight0: highlights[0], highlight1: highlights[1], highlight2: highlights[2]
      });
    },

    onItemTap(e) {
      const name = e.currentTarget.dataset.name;
      this.triggerEvent('onToggleFood', name);
    },

    _shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  }
});
