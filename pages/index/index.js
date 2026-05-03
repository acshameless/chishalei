const { getFoods, FOOD_TIPS } = require('../../utils/data');
const storage = require('../../utils/storage');

const app = getApp();

Page({
  data: {
    currentPool: 'all',
    foods: [],
    isSpinning: false,
    targetIndex: -1,
    resultText: '待君问签',
    landed: false,
    signNumber: '',
    tipVisible: false,
    tipText: '',
    timeTip: '',
    shareVisible: false,
    cookVisible: false,
    cookBtnText: '做法',
    cookHtml: '',
    toastVisible: false,
    toastMsg: '',
    btnText: '问问天意',
    btnKanji: '抽签',
  },

  state: null,
  toastTimer: null,
  currentIndex: -1,

  onLoad() {
    this.loadState();
    this.refreshFoods();
    this.updateTimeTip();
  },

  onShow() {
    this.updateTimeTip();
  },

  onShareAppMessage() {
    const { resultText, signNumber } = this.data;
    return {
      title: resultText !== '待君问签'
        ? `今日食运：${resultText}（第${signNumber}签）`
        : '吃啥嘞 — 今天吃什么？',
      path: '/pages/index/index'
    };
  },

  loadState() {
    let s = storage.load();
    if (!s) s = app.defaultState();
    this.state = s;
    this.setData({ currentPool: s.currentPool || 'all' });
  },

  saveState() {
    storage.save(this.state);
  },

  refreshFoods() {
    const foods = getFoods({
      currentPool: this.data.currentPool,
      selectedCategories: this.state.selectedCategories,
      excludedFoods: this.state.excludedFoods,
      myMenu: this.state.myMenu
    });
    this.setData({ foods });
  },

  updateTimeTip() {
    const d = new Date();
    const hours = ['子', '丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午', '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥', '子'];
    const tip = `${hours[d.getHours()]}时 · ${d.getMonth() + 1}月${d.getDate()}日`;
    this.setData({ timeTip: tip });
  },

  onSwitchPool(e) {
    const pool = e.currentTarget.dataset.pool;
    this.state.currentPool = pool;
    this.saveState();
    this.setData({
      currentPool: pool,
      cookVisible: false,
      cookBtnText: '做法'
    });
    this.refreshFoods();
  },

  onSpin() {
    if (this.data.isSpinning) return;
    const { foods } = this.data;
    if (foods.length === 0) {
      this.showToast('暂无可选菜品');
      return;
    }

    const idx = Math.floor(Math.random() * foods.length);
    this.currentIndex = idx;

    this.setData({
      isSpinning: true,
      targetIndex: idx,
      landed: false,
      tipVisible: false,
      shareVisible: false,
      cookVisible: false,
      cookBtnText: '做法',
      btnText: '正在问天…',
      btnKanji: '转动',
      signNumber: ''
    });

    // 模拟音效（后续接入 InnerAudioContext）
    // this.playWoodblock();
  },

  onSpinComplete() {
    const { foods } = this.data;
    const name = foods[this.currentIndex];
    const tip = FOOD_TIPS[name] || '用心烹饪，味道自然不会差';
    const sign = this.generateSignNumber();

    this.setData({
      isSpinning: false,
      resultText: name,
      landed: true,
      tipVisible: true,
      tipText: tip,
      signNumber: sign,
      shareVisible: true,
      btnText: '问问天意',
      btnKanji: '抽签'
    });

    // this.playStamp();

    // 记录历史
    this.state.history.draws.unshift({ name, time: Date.now() });
    if (this.state.history.draws.length > 50) {
      this.state.history.draws.pop();
    }
    this.saveState();
  },

  generateSignNumber() {
    const today = new Date().toDateString();
    if (this.state.history.todayPick !== today) {
      this.state.history.todayPick = today;
      this.state.history.todayFortune = Math.floor(Math.random() * 100) + 1;
      this.saveState();
    }
    return String(this.state.history.todayFortune).padStart(2, '0');
  },

  onReset() {
    this.setData({
      resultText: '待君问签',
      landed: false,
      tipVisible: false,
      shareVisible: false,
      cookVisible: false,
      cookBtnText: '做法',
      signNumber: ''
    });
    this.currentIndex = -1;
  },

  onToggleCook() {
    if (!this.data.landed) return;
    const { cookVisible, resultText } = this.data;

    if (!cookVisible) {
      this.fetchCook(resultText);
      this.setData({ cookVisible: true, cookBtnText: '导出' });
    } else {
      // 导出图片
      this.exportCookCard();
    }
  },

  fetchCook(dish) {
    let recipe = this.state.customRecipes[dish];
    if (recipe) {
      this.renderCook(recipe);
      return;
    }

    // 调用后端接口
    // 注意：需要把域名配置到小程序后台 request 合法域名
    wx.request({
      url: 'https://chisha.shameless.top/api/cook',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { dish },
      success: (res) => {
        if (res.data && res.data.recipe) {
          this.state.customRecipes[dish] = res.data.recipe;
          if (res.data.tip) {
            this.state.customTips[dish] = res.data.tip;
          }
          this.saveState();
          this.renderCook(res.data.recipe);
        } else {
          this.renderCook(this.getCookFallback(dish));
        }
      },
      fail: () => {
        this.renderCook(this.getCookFallback(dish));
      }
    });
  },

  getCookFallback(dish) {
    return {
      materials: [{ name: dish, amount: '300克' }],
      steps: [{ title: '烹制', desc: '按个人口味烹饪至熟即可', why: '火候到位味道自然好', heat: '中火' }],
      tips: ['食材预处理做足，炒菜才顺手', '调味分两次，中间尝咸淡']
    };
  },

  renderCook(recipe) {
    if (!recipe) return;
    let html = '';

    if (recipe.materials && recipe.materials.length) {
      html += '<view class="cook-section"><view class="cook-section-title">食材</view>';
      recipe.materials.forEach(m => {
        html += `<view class="cook-material"><text class="cook-material-name">${m.name}</text><text class="cook-material-amount">${m.amount}</text></view>`;
      });
      html += '</view>';
    }

    if (recipe.steps && recipe.steps.length) {
      html += '<view class="cook-section"><view class="cook-section-title">步骤</view>';
      recipe.steps.forEach((s, i) => {
        html += `<view class="cook-step">
          <view class="cook-step-num">${i + 1}</view>
          <view class="cook-step-body">
            <view class="cook-step-title">${s.title}</view>
            <view class="cook-step-desc">${s.desc}</view>
            ${s.why ? `<view class="cook-step-why">→ ${s.why}</view>` : ''}
            ${s.heat ? `<view class="cook-step-heat">${s.heat}</view>` : ''}
          </view>
        </view>`;
      });
      html += '</view>';
    }

    if (recipe.tips && recipe.tips.length) {
      html += '<view class="cook-section"><view class="cook-section-title">小贴士</view>';
      recipe.tips.forEach(t => {
        html += `<view class="cook-tips-item">${t}</view>`;
      });
      html += '</view>';
    }

    this.setData({ cookHtml: html });
  },

  exportCookCard() {
    // TODO: canvas 绘制做法卡片并保存
    this.showToast('做法卡片绘制中…');
  },

  onSaveShareImage() {
    // TODO: canvas 绘制签签卡片并保存相册
    this.showToast('分享卡片绘制中…');
  },

  onMenuAdd(e) {
    const val = e.detail;
    if (!val) return;
    if (this.state.myMenu.includes(val)) {
      if (this.data.currentPool === 'myMenu') {
        this.showToast(`「${val}」已在菜单中`);
      }
      return;
    }
    this.state.myMenu.push(val);
    this.saveState();
    this.refreshFoods();
    this.showToast(`已添加「${val}」`);
  },

  onMenuRemove(e) {
    const idx = e.detail;
    this.state.myMenu.splice(idx, 1);
    this.saveState();
    this.refreshFoods();
  },

  showToast(msg) {
    this.setData({ toastVisible: true, toastMsg: msg });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000);
  }
});
