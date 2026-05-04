Component({
  properties: {
    foods: { type: Array, value: [] }
  },

  data: {
    isEditing: false,
    scanning: false,
    scanIndex: -1,
    highlightIndex: -1
  },

  scanTimer: null,

  lifetimes: {
    detached() {
      if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null; }
    }
  },

  methods: {
    onAddTap() {
      this.setData({ isEditing: true });
    },

    onItemTap(e) {
      const name = e.currentTarget.dataset.item;
      this.triggerEvent('onPreviewFood', name);
    },

    onItemLongPress(e) {
      const idx = e.currentTarget.dataset.index;
      this.triggerEvent('onRemove', idx);
    },

    onInputConfirm(e) {
      const val = (e.detail.value || '').trim();
      this.setData({ isEditing: false });
      if (val) this.triggerEvent('onAdd', val);
    },

    onInputBlur(e) {
      const val = (e.detail.value || '').trim();
      this.setData({ isEditing: false });
      if (val) this.triggerEvent('onAdd', val);
    },

    updateHighlight(name) {
      const foods = this.data.foods;
      const idx = foods.indexOf(name);
      if (idx >= 0) this.startScan(idx);
    },

    // 用于 spin() 每轮同步更新扫描位置
    setScanIndex(index) {
      this.setData({ scanning: true, scanIndex: index, highlightIndex: -1 });
    },

    // 用于 pick() 设置最终高亮
    setFinalHighlight(index) {
      if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null; }
      this.setData({ scanning: false, scanIndex: -1, highlightIndex: index });
    },

    startScan(targetIndex) {
      if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = null; }

      const foods = this.data.foods;
      const len = foods.length;
      if (!len) return;

      // 生成扫描序列：随机跳跃，保证至少 8 步，目标在最后
      const minSteps = Math.max(8, len);
      const seq = [];
      for (let i = 0; i < minSteps - 1; i++) {
        let r;
        do { r = Math.floor(Math.random() * len); } while (r === targetIndex && len > 1);
        seq.push(r);
      }
      seq.push(targetIndex);

      this.setData({ scanning: true, highlightIndex: -1 });

      let step = 0;
      const total = seq.length;
      const baseDelay = 55;

      const next = () => {
        if (step >= total) {
          this.scanTimer = null;
          this.setData({ scanning: false, scanIndex: -1, highlightIndex: targetIndex });
          return;
        }
        this.setData({ scanIndex: seq[step] });
        step++;
        const progress = step / total;
        const delay = baseDelay + progress * progress * 280;
        this.scanTimer = setTimeout(next, delay);
      };

      next();
    }
  }
});
