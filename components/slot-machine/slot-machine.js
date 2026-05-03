Component({
  properties: {
    foods: { type: Array, value: [] },
    spinning: { type: Boolean, value: false },
    targetIndex: { type: Number, value: -1 }
  },

  data: {
    columns: [],
    itemHeight: 44,
    colHeight: 240,
    inited: false
  },

  lifetimes: {
    attached() { this.tryInit(); },
    ready() { this.tryInit(); }
  },

  observers: {
    'foods': function(foods) {
      if (foods && foods.length > 0 && !this.data.inited) {
        this.initColumns(foods);
      }
    },
    'spinning': function(spinning) {
      if (spinning && this.data.inited) {
        this.startSpin();
      }
    }
  },

  methods: {
    tryInit() {
      const { foods, inited } = this.data;
      if (!inited && foods && foods.length > 0) {
        this.initColumns(foods);
      }
    },

    initColumns(foods) {
      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const columns = [0, 1, 2].map(() => {
        const order = this.shuffle([...foods]);
        const items = [];
        for (let r = 0; r < repeat; r++) {
          items.push(...order);
        }
        const randomOffset = Math.floor(Math.random() * foods.length) * this.data.itemHeight;
        return {
          items,
          offsetY: -randomOffset,
          transition: 'none',
          highlightIndex: -1,
          animData: null
        };
      });
      this.setData({ columns, inited: true });
    },

    startSpin() {
      const { foods, targetIndex, columns, itemHeight, colHeight } = this.data;
      if (!foods.length || targetIndex < 0) return;

      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const cycleHeight = foods.length * itemHeight;
      const targetCycle = Math.floor(repeat / 2);
      const centerOffset = colHeight / 2 - itemHeight / 2;

      let maxDurationMs = 0;

      const newColumns = columns.map((col, i) => {
        const posInCol = col.items.findIndex((name, idx) => {
          return idx >= targetCycle * foods.length && name === foods[targetIndex];
        });
        const effectivePos = posInCol >= 0 ? posInCol % foods.length : targetIndex;

        const baseY = -(targetCycle * cycleHeight + effectivePos * itemHeight) + centerOffset;
        const distFromMid = Math.abs(i - 1);
        const extraRounds = distFromMid;
        const finalY = baseY - extraRounds * cycleHeight;

        const delay = distFromMid * 0.12;
        const duration = 1.8 + distFromMid * 0.35;

        // 使用小程序 animation API，这是唯一能可靠触发滚动动画的方式
        const anim = wx.createAnimation({
          duration: duration * 1000,
          timingFunction: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
          delay: delay * 1000
        });
        anim.translateY(finalY).step();

        maxDurationMs = Math.max(maxDurationMs, (duration + delay + 0.3) * 1000);

        return {
          ...col,
          offsetY: finalY,
          transition: 'none',
          highlightIndex: effectivePos + (targetCycle + extraRounds) * foods.length,
          animData: anim.export()
        };
      });

      this.setData({ columns: newColumns });

      setTimeout(() => {
        this.triggerEvent('onComplete');
      }, maxDurationMs);
    },

    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  }
});
