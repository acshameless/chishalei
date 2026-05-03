const { getFoods, FOOD_TIPS } = require('../../utils/data');
const storage = require('../../utils/storage');

const app = getApp();

const FORTUNES = [
  '天时地利，今日宜尝鲜',
  '食运亨通，美味在望',
  '吉时吉日，好菜自来',
  '食神眷顾，口福不浅',
  '今日食缘，命中注定',
  '菜香四溢，好运连连',
  '天时人和，一餐美满',
  '食来运转，美味当前'
];

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
    fortuneVisible: false,
    fortuneText: '',
    shareVisible: false,
    cookVisible: false,
    cookBtnText: '做法',
    cookMaterials: [],
    cookSteps: [],
    cookTips: [],
    toastVisible: false,
    toastMsg: '',
    btnText: '问问天意',
    btnKanji: '签',
    historyVisible: false,
    historyList: [],
    shareOverlayVisible: false,
    shareImageUrl: ''
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
    this.loadState();
    this.refreshFoods();
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
    if (!s) s = app.defaultState ? app.defaultState() : this.defaultState();
    this.state = s;
    this.setData({ currentPool: s.currentPool || 'all' });
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
        recent: [], favorites: [], blacklist: [],
        todayFortune: null, todayPick: null, draws: []
      },
      settings: { sound: true }
    };
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
    const hours = ['子','丑','丑','寅','寅','卯','卯','辰','辰','巳','巳','午','午','未','未','申','申','酉','酉','戌','戌','亥','亥','子'];
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
      fortuneVisible: false,
      cookVisible: false,
      cookBtnText: '做法',
      btnText: '正在问天…',
      btnKanji: '转动',
      signNumber: '',
      resultText: foods[idx]
    });

    this.playWoodblock();
  },

  onSpinComplete() {
    const { foods } = this.data;
    const name = foods[this.currentIndex];
    const tip = FOOD_TIPS[name] || '用心烹饪，味道自然不会差';
    const sign = this.generateSignNumber();
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];

    this.setData({
      isSpinning: false,
      resultText: name,
      landed: true,
      tipVisible: true,
      tipText: tip,
      signNumber: sign,
      fortuneVisible: true,
      fortuneText: fortune,
      shareVisible: true,
      btnText: '问问天意',
      btnKanji: '签'
    });

    this.playStamp();

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
      fortuneVisible: false,
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
      this.setData({ cookVisible: true, cookBtnText: '收起' });
    } else {
      this.setData({ cookVisible: false, cookBtnText: '做法' });
    }
  },

  fetchCook(dish) {
    let recipe = this.state.customRecipes[dish];
    if (recipe) {
      this.renderCook(recipe);
      return;
    }

    wx.cloud.callFunction({
      name: 'cook',
      data: { dish },
      success: (res) => {
        const data = res.result;
        if (data && data.recipe) {
          this.state.customRecipes[dish] = data.recipe;
          if (data.tip) this.state.customTips[dish] = data.tip;
          this.saveState();
          this.renderCook(data.recipe);
        } else if (data && data.error) {
          console.warn('cook cloud function error:', data.error, data.detail);
          this.renderCook(this.getCookFallback(dish));
        } else {
          this.renderCook(this.getCookFallback(dish));
        }
      },
      fail: (err) => {
        console.error('cook cloud function failed:', err);
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
    this.setData({
      cookMaterials: recipe.materials || [],
      cookSteps: recipe.steps || [],
      cookTips: recipe.tips || []
    });
  },

  async onSaveShareImage() {
    const { resultText, signNumber, timeTip } = this.data;
    if (resultText === '待君问签') {
      this.showToast('先抽签再分享');
      return;
    }
    try {
      const tempPath = await this.drawShareCard(resultText, signNumber, timeTip);
      this.setData({ shareImageUrl: tempPath, shareOverlayVisible: true });
    } catch (e) {
      console.error('draw share card failed', e);
      this.showToast('生成失败，请重试');
    }
  },

  drawShareCard(dish, sign, dateStr) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            reject(new Error('canvas not found'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const width = 540;
          const height = 960;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // Background
          ctx.fillStyle = '#F6F1E9';
          ctx.fillRect(0, 0, width, height);

          // Dot grid
          ctx.fillStyle = '#CBC0AE';
          for (let x = 10; x < width; x += 20) {
            for (let y = 10; y < height; y += 20) {
              ctx.beginPath();
              ctx.arc(x, y, 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Dish name
          ctx.fillStyle = '#8A3D27';
          ctx.font = '600 48px serif';
          ctx.textAlign = 'center';
          ctx.fillText(dish, width / 2, 360);

          // Sign number
          ctx.fillStyle = '#6B6055';
          ctx.font = '400 14px sans-serif';
          ctx.fillText(`第 ${sign} 签 · ${dateStr}`, width / 2, 420);

          // Divider
          ctx.strokeStyle = '#E8DFD0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(width / 2 - 16, 480);
          ctx.lineTo(width / 2 + 16, 480);
          ctx.stroke();

          // Brand
          ctx.fillStyle = '#A89F94';
          ctx.font = '400 12px sans-serif';
          ctx.fillText('吃啥嘞', width / 2, 540);
          ctx.fillText('chisha.shameless.top', width / 2, 565);

          wx.canvasToTempFilePath({
            canvas,
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          });
        });
    });
  },

  onCloseShareOverlay() {
    this.setData({ shareOverlayVisible: false });
  },

  onGoPool() {
    wx.navigateTo({ url: '/pages/pool/pool' });
  },

  onShowHistory() {
    const draws = this.state.history.draws || [];
    const list = draws.slice(0, 30).map(d => {
      const t = new Date(d.time);
      return {
        name: d.name,
        timeStr: `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
      };
    });
    this.setData({ historyVisible: true, historyList: list });
  },

  onCloseHistory() {
    this.setData({ historyVisible: false });
  },

  onClearHistory() {
    this.state.history.draws = [];
    this.saveState();
    this.setData({ historyList: [] });
  },

  onPanelTap() {
    // 阻止冒泡，防止点击 panel 内容时关闭 overlay
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

  playWoodblock() {
    const appInstance = getApp();
    if (appInstance.woodblock && this.state.settings.sound) {
      appInstance.woodblock.stop();
      appInstance.woodblock.play();
    }
  },

  playStamp() {
    const appInstance = getApp();
    if (appInstance.stamp && this.state.settings.sound) {
      appInstance.stamp.stop();
      appInstance.stamp.play();
    }
  },

  showToast(msg) {
    this.setData({ toastVisible: true, toastMsg: msg });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000);
  }
});
