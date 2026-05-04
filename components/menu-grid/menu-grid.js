Component({
  properties: {
    foods: { type: Array, value: [] }
  },

  data: {
    isEditing: false
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
      if (val) {
        this.triggerEvent('onAdd', val);
      }
    },

    onInputBlur(e) {
      const val = (e.detail.value || '').trim();
      this.setData({ isEditing: false });
      if (val) {
        this.triggerEvent('onAdd', val);
      }
    }
  }
});
