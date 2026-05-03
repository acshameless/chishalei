App({
  globalData: {
    // 全局状态（小程序内跨页面共享）
    state: null,
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d4grijtvbfa3bf741', // 后续替换为你的云开发环境 ID
        traceUser: true
      });
    }
    // 初始化音频上下文
    this.initAudio();
    // 加载状态
    this.loadState();
  },

  initAudio() {
    // 小程序不支持 Web Audio API，使用 InnerAudioContext
    this.woodblock = wx.createInnerAudioContext();
    this.stamp = wx.createInnerAudioContext();
    this.woodblock.src = '/sounds/woodblock.m4a';
    this.stamp.src = '/sounds/stamp.m4a';
  },

  loadState() {
    try {
      const raw = wx.getStorageSync('chisha_state');
      if (raw) {
        this.globalData.state = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('loadState failed', e);
    }
    if (!this.globalData.state) {
      this.globalData.state = this.defaultState();
    }
  },

  saveState() {
    try {
      wx.setStorageSync('chisha_state', JSON.stringify(this.globalData.state));
    } catch (e) {
      console.warn('saveState failed', e);
    }
  },

  defaultState() {
    return {
      version: 6,
      selectedCategories: ['河南菜'],
      excludedFoods: [],
      myMenu: [],
      customTips: {},
      customRecipes: {},
      history: {
        recent: [],
        favorites: [],
        blacklist: [],
        todayFortune: null,
        todayPick: null,
        draws: []
      },
      settings: { sound: true }
    };
  }
});
