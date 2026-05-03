Component({
  properties: {
    foods: { type: Array, value: [] },
    spinning: { type: Boolean, value: false },
    targetIndex: { type: Number, value: -1 }
  },

  data: {
    columns: [
      { items: [], offsetY: 0, transition: 'none', highlightIndex: -1 },
      { items: [], offsetY: 0, transition: 'none', highlightIndex: -1 },
      { items: [], offsetY: 0, transition: 'none', highlightIndex: -1 }
    ],
    itemHeight: 44, // px
    colHeight: 240  // px
  },

  lifetimes: {
    ready() {
      const { foods } = this.data;
      if (foods && foods.length > 0) {
        this.initColumns(foods);
      }
    }
  },

  observers: {
    'foods': function(foods) {
      if (!foods || foods.length === 0) return;
      this.initColumns(foods);
    },
    'spinning': function(spinning) {
      if (spinning) {
        this.startSpin();
      }
    }
  },

  methods: {
    initColumns(foods) {
      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const columns = this.data.columns.map(() => {
        // 每列独立随机排列
        const order = this.shuffle([...foods]);
        const items = [];
        for (let r = 0; r < repeat; r++) {
          items.push(...order);
        }
        // 初始随机偏移
        const randomOffset = Math.floor(Math.random() * foods.length) * this.data.itemHeight;
        return {
          items,
          offsetY: -randomOffset,
          transition: 'none',
          highlightIndex: -1
        };
      });
      this.setData({ columns });
    },

    startSpin() {
      const { foods, targetIndex, columns, itemHeight, colHeight } = this.data;
      if (!foods.length || targetIndex < 0) return;

      const repeat = Math.min(8, Math.max(3, Math.floor(600 / foods.length)));
      const cycleHeight = foods.length * itemHeight;
      const targetCycle = Math.floor(repeat / 2);
      const centerOffset = colHeight / 2 - itemHeight / 2;

      const newColumns = columns.map((col, i) => {
        const posInCol = col.items.findIndex((name, idx) => {
          return idx >= targetCycle * foods.length && name === foods[targetIndex];
        });
        const effectivePos = posInCol >= 0 ? posInCol % foods.length : targetIndex;

        const baseY = -(targetCycle * cycleHeight + effectivePos * itemHeight) + centerOffset;
        const distFromMid = Math.abs(i - 1); // 中间列索引为1
        const extraRounds = distFromMid;
        const finalY = baseY - extraRounds * cycleHeight;

        const delay = distFromMid * 0.12;
        const duration = 1.8 + distFromMid * 0.35;

        return {
          ...col,
          offsetY: finalY,
          transition: `transform ${duration}s cubic-bezier(0.22, 0.8, 0.3, 1) ${delay}s`,
          highlightIndex: effectivePos + (targetCycle + extraRounds) * foods.length
        };
      });

      this.setData({ columns: newColumns });

      // 动画结束后通知父组件
      const maxDuration = 1.8 + 1 * 0.35 + 0.12 + 0.3;
      setTimeout(() => {
        this.triggerEvent('onComplete');
      }, maxDuration * 1000);
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
