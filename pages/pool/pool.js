const { FOOD_CATEGORIES } = require('../../utils/data');
const storage = require('../../utils/storage');

Page({
  data: {
    categories: [],
    selectedCount: 0,
    totalFoods: 0
  },

  state: null,

  onLoad() {
    this.loadState();
    this.buildCategories();
  },

  loadState() {
    this.state = storage.load() || this.defaultState();
  },

  saveState() {
    storage.save(this.state);
  },

  defaultState() {
    return {
      selectedCategories: ['河南菜'],
      excludedFoods: [],
      myMenu: []
    };
  },

  buildCategories() {
    const { selectedCategories, excludedFoods } = this.state;
    const categories = FOOD_CATEGORIES.map(cat => ({
      name: cat.name,
      selected: selectedCategories.includes(cat.name),
      expanded: false,
      items: cat.items.map(name => ({
        name,
        excluded: excludedFoods.includes(name)
      }))
    }));

    this.updateStats(categories);
    this.setData({ categories });
  },

  updateStats(categories) {
    const selectedCount = categories.filter(c => c.selected).length;
    let totalFoods = 0;
    categories.forEach(cat => {
      if (cat.selected) {
        totalFoods += cat.items.filter(f => !f.excluded).length;
      }
    });
    this.setData({ selectedCount, totalFoods });
  },

  onToggleCategory(e) {
    const idx = e.currentTarget.dataset.index;
    const categories = this.data.categories;
    const cat = categories[idx];

    cat.selected = !cat.selected;
    this.state.selectedCategories = categories
      .filter(c => c.selected)
      .map(c => c.name);

    this.saveState();
    this.updateStats(categories);
    this.setData({ categories: [...categories] });
  },

  onToggleExpand(e) {
    const idx = e.currentTarget.dataset.index;
    const categories = this.data.categories;
    categories[idx].expanded = !categories[idx].expanded;
    this.setData({ categories: [...categories] });
  },

  onToggleFood(e) {
    const catIdx = e.currentTarget.dataset.cat;
    const foodIdx = e.currentTarget.dataset.food;
    const categories = this.data.categories;
    const food = categories[catIdx].items[foodIdx];

    food.excluded = !food.excluded;

    // 重新计算 excludedFoods
    const excludedFoods = [];
    categories.forEach(cat => {
      cat.items.forEach(f => {
        if (f.excluded) excludedFoods.push(f.name);
      });
    });
    this.state.excludedFoods = excludedFoods;

    this.saveState();
    this.updateStats(categories);
    this.setData({ categories: [...categories] });
  },

  onBack() {
    wx.navigateBack();
  }
});
