/**
 * 存储层 —— 单一状态来源
 * 所有页面统一通过此模块读写全局状态
 */

const STORAGE_KEY = 'chisha_state_v10';

// 规范默认状态 —— 与 app.js 保持唯一同步
// 如需增加字段，同时修改此处和 app.js
const DEFAULT_STATE = {
  version: 10,
  foodMode: 'caixi',
  myMenu: [],
  selectedCategories: ['河南菜', '我的菜单'],
  excludedFoods: [],
  categoryOrder: null, // 运行时从 DEFAULT_CATEGORY_ORDER[foodMode] 填充
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

function defaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // 确保基础结构
  if (raw.version == null) raw.version = 1;

  // v6 → v7: 「我的菜单」移入选菜面板，默认选中
  if (raw.version < 7) {
    if (!Array.isArray(raw.selectedCategories)) raw.selectedCategories = [];
    if (!raw.selectedCategories.includes('我的菜单')) {
      raw.selectedCategories.push('我的菜单');
    }
    raw.version = 7;
  }

  // v7 → v8: 引入 categoryOrder，默认按原始顺序
  if (raw.version < 8) {
    raw.categoryOrder = defaultState().categoryOrder;
    raw.version = 8;
  }

  // v8 → v9: 分类体系按省籍地域重组
  if (raw.version < 9) {
    raw.selectedCategories = ['河南菜', '我的菜单'];
    raw.categoryOrder = defaultState().categoryOrder;
    raw.excludedFoods = [];
    raw.version = 9;
  }

  // v9 → v10: 引入 foodMode 模式切换
  if (raw.version < 10) {
    if (raw.foodMode === 'daily') {
      raw.foodMode = 'jiachang';
    } else {
      raw.foodMode = 'caixi';
    }
    raw.version = 10;
  }

  // 确保字段存在
  if (!raw.foodMode || !['caixi', 'shengji', 'jiachang'].includes(raw.foodMode)) {
    raw.foodMode = 'caixi';
  }
  if (!Array.isArray(raw.selectedCategories) || raw.selectedCategories.length === 0) {
    raw.selectedCategories = ['河南菜', '我的菜单'];
  }
  if (!Array.isArray(raw.excludedFoods)) raw.excludedFoods = [];
  if (!Array.isArray(raw.myMenu)) raw.myMenu = [];
  if (!raw.customTips || typeof raw.customTips !== 'object') raw.customTips = {};
  if (!raw.customRecipes || typeof raw.customRecipes !== 'object') raw.customRecipes = {};

  // 兼容旧版 history
  if (!raw.history || typeof raw.history !== 'object') raw.history = {};
  if (Array.isArray(raw.history)) raw.history = { recent: raw.history };

  if (!Array.isArray(raw.history.recent)) raw.history.recent = [];
  if (!Array.isArray(raw.history.favorites)) raw.history.favorites = [];
  if (!Array.isArray(raw.history.blacklist)) raw.history.blacklist = [];
  if (!Array.isArray(raw.history.draws)) raw.history.draws = [];
  if (!('todayFortune' in raw.history)) raw.history.todayFortune = null;
  if (!('todayPick' in raw.history)) raw.history.todayPick = null;

  if (!raw.settings || typeof raw.settings !== 'object') raw.settings = {};
  if (typeof raw.settings.sound !== 'boolean') raw.settings.sound = true;

  // 运行时字段
  if (!raw.currentPool) raw.currentPool = 'all';

  // categoryOrder 允许为 null，运行时会填充
  if (!raw.hasOwnProperty('categoryOrder')) raw.categoryOrder = null;

  return raw;
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
  return defaultState();
}

function save(state) {
  try {
    // 只持久化核心字段，过滤运行时字段
    const toSave = {
      version: state.version,
      foodMode: state.foodMode,
      selectedCategories: state.selectedCategories,
      excludedFoods: state.excludedFoods,
      myMenu: state.myMenu,
      categoryOrder: state.categoryOrder,
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
