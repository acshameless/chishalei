const storage = require('./utils/storage');

App({
  globalData: {
    state: null
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d4grijtvbfa3bf741',
        traceUser: true
      });
    }
    // 初始化音频上下文
    this.initAudio();
  },

  initAudio() {
    // 小程序不支持 Web Audio API，使用 InnerAudioContext
    this.woodblock = wx.createInnerAudioContext();
    this.stamp = wx.createInnerAudioContext();
    // 使用 .m4a 以获得更好的 iOS/Android 兼容性
    this.woodblock.src = '/sounds/woodblock.m4a';
    this.stamp.src = '/sounds/stamp.m4a';
  },

  // 规范默认状态 —— 与 utils/storage.js 保持同步
  defaultState() {
    return storage.DEFAULT_STATE;
  }
});