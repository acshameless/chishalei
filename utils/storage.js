/**
 * 存储层 —— 单一状态来源
 * 所有页面统一通过此模块读写全局状态
 */

const STORAGE_KEY = 'chisha_state_v6';

// 规范默认状态 —— 与 app.js 保持唯一同步
// 如需增加字段，同时修改此处和 app.js
const DEFAULT_STATE = {
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
  settings: {
    sound: true
  },
  // 运行时字段（不持久化）
  currentPool: 'all'
};

function migrate(s) {
  if (!s || typeof s !== 'object') return null;

  // 确保基础结构
  if (s.version == null) s.version = 1;
  if (!Array.isArray(s.selectedCategories) || s.selectedCategories.length === 0) {
    s.selectedCategories = ['河南菜'];
  }
  // 过滤掉已不存在的分类名（兼容旧版本数据）
  const validCats = ['河南菜','川菜','粤菜','鲁菜','苏菜','浙菜','闽菜','湘菜','徽菜','东北菜','西北菜','西南菜-云贵','京鄂沪'];
  s.selectedCategories = s.selectedCategories.filter(name => validCats.includes(name));
  if (s.selectedCategories.length === 0) {
    s.selectedCategories = ['河南菜'];
  }
  if (!Array.isArray(s.excludedFoods)) s.excludedFoods = [];
  if (!Array.isArray(s.myMenu)) s.myMenu = [];
  if (!s.customTips || typeof s.customTips !== 'object') s.customTips = {};
  if (!s.customRecipes || typeof s.customRecipes !== 'object') s.customRecipes = {};

  // 兼容旧版 history
  if (!s.history || typeof s.history !== 'object') s.history = {};
  if (Array.isArray(s.history)) s.history = { recent: s.history };

  if (!Array.isArray(s.history.recent)) s.history.recent = [];
  if (!Array.isArray(s.history.favorites)) s.history.favorites = [];
  if (!Array.isArray(s.history.blacklist)) s.history.blacklist = [];
  if (!Array.isArray(s.history.draws)) s.history.draws = [];
  if (!('todayFortune' in s.history)) s.history.todayFortune = null;
  if (!('todayPick' in s.history)) s.history.todayPick = null;

  if (!s.settings || typeof s.settings !== 'object') s.settings = {};
  if (typeof s.settings.sound !== 'boolean') s.settings.sound = true;

  // 运行时字段
  if (!s.currentPool) s.currentPool = 'all';

  // 标记已迁移到当前版本
  s.version = DEFAULT_STATE.version;
  return s;
}

function load() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      const migrated = migrate(state);
      if (migrated) return migrated;
    }
  } catch (e) {
    console.warn('[storage] load failed:', e.message);
  }
  // 返回深拷贝的默认状态
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function save(state) {
  try {
    // 只持久化核心字段，过滤运行时字段
    const toSave = {
      version: state.version,
      selectedCategories: state.selectedCategories,
      excludedFoods: state.excludedFoods,
      myMenu: state.myMenu,
      customTips: state.customTips,
      customRecipes: state.customRecipes,
      history: state.history,
      settings: state.settings
    };
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[storage] save failed:', e.message);
  }
}

module.exports = { STORAGE_KEY, DEFAULT_STATE, load, save, migrate };