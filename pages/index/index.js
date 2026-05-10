const { getFoods, getFoodsWithSource, getTips, FOOD_MODES, DEFAULT_CATEGORY_ORDER } = require('../../utils/data');
const storage = require('../../utils/storage');
const fortune = require('../../utils/fortune');
const { getSolarPaperColor } = require('../../utils/solar-theme');
const { getGanZhiDate } = require('../../utils/ganzhi');
const calendar = require('../../utils/calendar');

Page({
  data: {
    // 主题
    pageBg: '#F6F1E9',
    // 日期
    dateGregorian: '',
    dateLunar: '',
    // 结果
    isSpinning: false,
    landed: false,
    resultText: '待君问签',
    targetIndex: -1,
    tipVisible: false,
    tipText: '',
    tipSub: '',
    signNumberText: '',
    // 签文
    fortuneVisible: false,
    fortuneText: '',
    fortuneType: '',
    fortuneYi: '',
    fortuneJi: '',
    // 按钮
    btnText: '问问天意',
    btnKanji: '签',
    // 分享/做法
    shareVisible: false,
    cookVisible: false,
    cookLoading: false,
    cookBtnText: '做法',
    cookMaterials: [],
    cookSteps: [],
    cookTips: [],
    // Slot machine
    foods: [],
    foodsCount: 0,
    hasWinner: false,
    // 状态
    state: {
      foodMode: 'caixi',
      excludedFoods: [],
      myMenu: [],
      selectedCategories: ['河南菜', '我的菜单'],
      categoryOrder: null,
      customTips: {},
      customRecipes: {},
      history: { recent: [], favorites: [], blacklist: [], draws: [] },
      settings: { sound: true }
    },
    // 分享图 overlay
    shareOverlayVisible: false,
    shareImageUrl1: '',
    shareImageUrl2: '',
    shareNavVisible: false,
    shareDotsVisible: false,
    shareDotIndex: 0,
    shareScrollLeft: 0,
    shareHint: '长按保存图片',
    // 历史
    historyVisible: false,
    historyList: [],
    // 分类选择器
    categoryVisible: false,
    foodModeLabel: '🍲 菜系',
    allSelected: false,
    myMenuSelected: true,
    myMenuCountText: '0/0',
    myMenuExpanded: false,
    myMenuAdding: false,
    categoryList: [],
    expandedCategoryIndex: -1,
    // 签筒弹窗
    poolVisible: false,
    poolFoods: [],
    // Fly animation
    flyAnim: {},
    flyOpacity: 0,
    flyText: '',
    // Toast
    toastVisible: false,
    toastMsg: ''
  },

  state: null,
  toastTimer: null,
  currentIndex: -1,
  spinInterval: null,
  lastShown: 0,
  _dateCacheKey: '',
  _fortuneCacheKey: '',
  _lastNavColor: '',

  onLoad() {
    this.applySolarTheme();
    this.loadState();
    this.refreshFoods();
    this.renderFortune();
    this.renderDate();
  },

  onShow() {
    this.loadState();
    this.applySolarTheme();
    this.refreshFoods();
    this.renderFortune();
    this.renderDate();
  },

  onUnload() {
    if (this.spinInterval) clearTimeout(this.spinInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  },

  onReady() {
    setTimeout(() => {
      const slotMachine = this.selectComponent('#slotMachine');
      if (slotMachine && this.data.foods.length > 0 && !slotMachine.data.inited) {
        slotMachine.initColumns(this.data.foods);
      }
    }, 200);
  },

  onShareAppMessage() {
    const { resultText, signNumberText, fortuneText, fortuneYi, fortuneJi } = this.data;
    let title = '吃啥嘞 — 今天吃什么？';
    if (resultText !== '待君问签') {
      title = `今日食运：${resultText}（${signNumberText}）`;
      const ft = fortuneText || (fortuneYi ? fortuneYi + ' · ' + fortuneJi : '');
      if (ft) title += ` · ${ft}`;
    }
    return { title, path: '/pages/index/index' };
  },

  // ══════════ 主题 ══════════
  applySolarTheme() {
    const color = getSolarPaperColor();
    this.setData({ pageBg: color });
    if (this._lastNavColor !== color) {
      this._lastNavColor = color;
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: color });
    }
  },

  // ══════════ 状态 ══════════
  loadState() {
    this.state = storage.load();
    // 初始化 categoryOrder
    if (!this.state.categoryOrder) {
      this.state.categoryOrder = DEFAULT_CATEGORY_ORDER[this.state.foodMode || 'shengji'];
    }
    this.setData({ state: this.state });
  },

  saveState() {
    storage.save(this.state);
    this.setData({ state: this.state });
  },

  // ══════════ 食物 ══════════
  refreshFoods() {
    const foods = getFoods(this.state);
    this.setData({ foods, foodsCount: foods.length });
    const slotMachine = this.selectComponent('#slotMachine');
    if (slotMachine && foods.length > 0 && !slotMachine.data.inited) {
      slotMachine.initColumns(foods);
    }
  },

  // ══════════ 签文 ══════════
  renderFortune() {
    const today = new Date().toDateString();
    if (this._fortuneCacheKey === today) return;
    this._fortuneCacheKey = today;
    const daily = fortune.getDailyFortune();
    if (daily) {
      const f = fortune.formatFortune(daily);
      this.setData({
        fortuneText: f.text || '',
        fortuneType: f.type || '',
        fortuneYi: f.yi || '',
        fortuneJi: f.ji || ''
      });
    }
  },

  // ══════════ 日期 ══════════
  renderDate() {
    const today = new Date().toDateString();
    if (this._dateCacheKey === today) return;
    this._dateCacheKey = today;
    const now = new Date();
    // 公历
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateGregorian = `${y}.${m}.${d}`;
    // 农历 + 四柱
    let dateLunar = '';
    try {
      const yi = parseInt(m);
      const di = parseInt(d);
      const l = calendar.solar2lunar(y, yi, di);
      if (l && l !== -1) {
        const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
        const hour = now.getHours();

        // 年干支以立春为界
        const gzYear = this._getYearGZ(y, yi, di);

        // 日干支
        const gzDay = l.gzDay;

        // 时干支（23:00 算次日子时，时干用次日日柱推算）
        let hourDayGz = gzDay;
        if (hour === 23) {
          const t = new Date(now);
          t.setDate(t.getDate() + 1);
          const nextL = calendar.solar2lunar(t.getFullYear(), t.getMonth() + 1, t.getDate());
          if (nextL && nextL !== -1) hourDayGz = nextL.gzDay;
        }

        // 月干支以节气为界
        const gzMonth = this._getMonthGZ(y, yi, di, gzYear[0]);

        // 时干支
        const dayGan = Gan.indexOf(hourDayGz[0]);
        const zhiIdx = Math.floor(((hour + 1) % 24) / 2);
        const ganStart = (dayGan % 5) * 2;
        const ganIdx = (ganStart + zhiIdx) % 10;
        const gzHour = Gan[ganIdx] + Zhi[zhiIdx];

        dateLunar = gzYear + '·' + gzMonth + '·' + gzDay + '·' + gzHour;
      }
    } catch (e) {
      console.warn('[calendar] error:', e.message);
      const { ganZhi } = getGanZhiDate(now);
      dateLunar = `${ganZhi.year}·${ganZhi.month}·${ganZhi.day}`;
    }
    this.setData({ dateGregorian, dateLunar });
  },

  _getYearGZ(y, m, d) {
    const liChun = calendar.getTerm(y, 3);
    const yearForGZ = (m < 2 || (m === 2 && d < liChun)) ? y - 1 : y;
    return calendar.toGanZhiYear(yearForGZ);
  },

  _getMonthGZ(y, m, d, yearGan) {
    const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const jieN = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
    const monthIdxMap = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let currentMonthIdx = 11;
    for (let year = y - 1; year <= y + 1; year++) {
      for (let i = 0; i < 12; i++) {
        const n = jieN[i];
        const termM = Math.floor((n - 1) / 2) + 1;
        const termD = calendar.getTerm(year, n);
        if (year < y || (year === y && termM < m) || (year === y && termM === m && termD <= d)) {
          currentMonthIdx = monthIdxMap[i];
        }
      }
    }
    const yearGanIdx = Gan.indexOf(yearGan);
    let startGan;
    if (yearGanIdx === 0 || yearGanIdx === 5) startGan = 2;
    else if (yearGanIdx === 1 || yearGanIdx === 6) startGan = 4;
    else if (yearGanIdx === 2 || yearGanIdx === 7) startGan = 6;
    else if (yearGanIdx === 3 || yearGanIdx === 8) startGan = 8;
    else startGan = 0;
    const ganIdx = (startGan + currentMonthIdx) % 10;
    const zhiIdx = (2 + currentMonthIdx) % 12;
    return Gan[ganIdx] + Zhi[zhiIdx];
  },

  // ══════════ 抽签 ══════════
  spin() {
    if (this.data.isSpinning) {
      this.stopSpin();
      return;
    }

    const foods = this.data.foods;
    if (foods.length === 0) {
      this.showToast('暂无可选菜品');
      return;
    }

    const targetIndex = Math.floor(Math.random() * foods.length);
    this.currentIndex = targetIndex;
    this.lastShown = targetIndex;

    const slotMachine = this.selectComponent('#slotMachine');
    if (slotMachine) slotMachine.startSpin({ targetIndex });

    this.setData({
      targetIndex,
      landed: false,
      hasWinner: false,
      tipVisible: false,
      shareVisible: false,
      cookVisible: false,
      cookBtnText: '做法',
      signNumberText: '',
      resultText: foods[targetIndex],
      fortuneVisible: false
    });
    this.setSpinState(true);
    this.playWoodblock();

    let rounds = 0;
    const total = foods.length < 20 ? 12 + Math.floor(Math.random() * 4) : 14 + Math.floor(Math.random() * 5);

    const nextTick = () => {
      const f = this.data.foods;
      if (!f || f.length === 0) return;
      this.lastShown = Math.floor(Math.random() * f.length);
      this.setData({ resultText: f[this.lastShown] });
      rounds++;

      if (rounds >= total) {
        this.spinInterval = null;
        this.setSpinState(false);
        this.playStamp();
        this.lastShown = targetIndex;
        this.setData({ resultText: f[this.lastShown] });
        this.pick(this.lastShown);
        this.addToRecent(f[this.lastShown]);
        this.addDraw(f[this.lastShown]);
        this.saveState();
        return;
      }

      const delay = rounds < 9 ? 50 : 50 + (rounds - 9) * 18;
      this.spinInterval = setTimeout(nextTick, delay);
    };

    this.spinInterval = setTimeout(nextTick, 50);
  },

  stopSpin() {
    if (!this.spinInterval) return;
    clearTimeout(this.spinInterval);
    this.spinInterval = null;
    this.setSpinState(false);
    this.playStamp();
    const foods = this.data.foods;
    const idx = this.lastShown;
    if (idx >= 0 && idx < foods.length) {
      this.pick(idx);
      this.addToRecent(foods[idx]);
      this.addDraw(foods[idx]);
      this.saveState();
    }
  },

  setSpinState(on) {
    this.setData({
      isSpinning: on,
      btnText: on ? '就这个了' : '问问天意',
      btnKanji: on ? '止' : '签'
    });
  },

  onSpinComplete() {
    // slot machine 动画完成回调（已由 spin() 内部逻辑处理）
  },

  // ══════════ 预览（点击菜名）══════════
  onPreviewFood(e) {
    const name = e.detail;
    if (!name) return;
    this.previewByName(name);
  },

  previewByName(name) {
    const tips = getTips(this.state);
    const tipText = tips[name] || this.state.customTips[name] || '';
    const tipSub = fortune.getTimeTip() + ' · ' + fortune.getSolarTip();

    this.setData({
      resultText: name,
      landed: true,
      hasWinner: true,
      tipVisible: true,
      tipText: tipText,
      tipSub: tipSub,
      signNumberText: '',
      shareVisible: true,
      cookVisible: false,
      cookBtnText: '做法',
      fortuneVisible: false
    });

    const foods = this.data.foods;
    const idx = foods.indexOf(name);
    if (idx >= 0) {
      const slotMachine = this.selectComponent('#slotMachine');
      if (slotMachine) slotMachine.updateHighlight && slotMachine.updateHighlight(idx);
    }

    if (!tipText) {
      this.fetchCookFor(name);
    }
  },

  pick(idx) {
    const foods = this.data.foods;
    if (idx < 0 || idx >= foods.length) return;
    const name = foods[idx];
    const tips = getTips(this.state);
    const tipText = tips[name] || this.state.customTips[name] || '';
    const tipSub = fortune.getTimeTip() + ' · ' + fortune.getSolarTip();

    const signNum = fortune.getSignNumber(name);
    const signStr = '第' + fortune.toChineseUpper(signNum) + '签';

    this.setData({
      resultText: name,
      landed: true,
      hasWinner: true,
      tipVisible: true,
      tipText: tipText,
      tipSub: tipSub,
      signNumberText: signStr,
      shareVisible: true
    });

    const slotMachine = this.selectComponent('#slotMachine');
    if (slotMachine) slotMachine.updateHighlight && slotMachine.updateHighlight(idx);

    if (!tipText) {
      this.fetchCookFor(name);
    }
  },

  flyAnimation(name) {
    const query = wx.createSelectorQuery();
    query.select('#result-card').boundingClientRect();
    query.select('#particle-container').boundingClientRect();
    query.exec((res) => {
      if (!res[0] || !res[1]) return;
      const cardRect = res[0];
      const machineRect = res[1];
      const startX = machineRect.left + machineRect.width / 2;
      const startY = machineRect.top + machineRect.height / 2;
      const endX = cardRect.left + cardRect.width / 2;
      const endY = cardRect.top + cardRect.height / 2;

      this.setData({ flyText: name, flyOpacity: 1 });

      const anim = wx.createAnimation({
        duration: 0,
        timingFunction: 'step-start'
      });
      anim.left(startX).top(startY).scale(1).opacity(1).step({ duration: 0 });

      const anim2 = wx.createAnimation({
        duration: 300,
        timingFunction: 'cubic-bezier(0.08, 0.9, 0.15, 1)'
      });
      anim2.left(endX).top(endY).scale(1.5).opacity(0.1).step({ duration: 300 });

      this.setData({ flyAnim: anim.export() });
      setTimeout(() => {
        this.setData({ flyAnim: anim2.export() });
      }, 50);

      setTimeout(() => {
        this.setData({ flyOpacity: 0 });
      }, 400);
    });
  },

  addToRecent(foodName) {
    const recent = this.state.history.recent;
    if (recent.length > 0 && recent[0].name === foodName) return;
    recent.unshift({ name: foodName, date: new Date().toISOString().slice(0, 10) });
    if (recent.length > 30) recent.length = 30;
  },

  addDraw(foodName) {
    const daily = fortune.getDailyFortune();
    const draws = this.state.history.draws;
    const now = new Date();
    const signNum = fortune.getSignNumber(foodName);
    const tips = getTips(this.state);
    const draw = {
      name: foodName,
      date: now.toISOString().slice(0, 10),
      time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
      signNumber: '第' + fortune.toChineseUpper(signNum) + '签',
      fortune: daily.type === 'food' ? daily.yi + ' · ' + daily.ji : daily.text,
      tip: tips[foodName] || this.state.customTips[foodName] || ''
    };
    draws.unshift(draw);
    if (draws.length > 100) draws.length = 100;
  },

  // ══════════ 做法 ══════════
  askCook() {
    if (this.data.resultText === '待君问签') return;
    if (this.data.cookVisible) {
      this.exportCookCard();
      return;
    }
    const dish = this.data.resultText;
    if (this.state.customRecipes[dish]) {
      this.renderCook(this.state.customRecipes[dish]);
      this.setData({ cookVisible: true, cookBtnText: '导出' });
      return;
    }
    this.setData({
      cookLoading: true,
      cookVisible: true,
      cookBtnText: '生成中…',
      cookMaterials: [],
      cookSteps: [],
      cookTips: []
    });
    wx.cloud.callFunction({
      name: 'cook',
      data: { dish },
      success: (res) => {
        const data = res.result;
        if (data && data.error) {
          console.error('[index] cook cloud error:', data.error, data.detail);
          this.renderCook(this.getCookFallback(dish));
          this.showToast('做法服务异常：' + data.error);
          this.setData({ cookLoading: false, cookBtnText: '做法' });
          return;
        }
        if (data && data.recipe) {
          this.state.customRecipes[dish] = data.recipe;
          if (data.tip) {
            this.state.customTips[dish] = data.tip;
            if (this.data.resultText === dish && this.data.tipVisible) {
              this.setData({ tipText: data.tip });
            }
          }
          this.saveState();
          this.renderCook(data.recipe);
          this.setData({ cookLoading: false, cookBtnText: '导出' });
        } else {
          console.error('[index] cook invalid response:', data);
          this.renderCook(this.getCookFallback(dish));
          this.showToast('获取做法失败，已显示通用做法');
          this.setData({ cookLoading: false, cookBtnText: '做法' });
        }
      },
      fail: (err) => {
        console.error('[index] cook callFunction fail:', err);
        this.renderCook(this.getCookFallback(dish));
        const msg = err && err.errMsg ? err.errMsg : '网络异常';
        this.showToast('调用失败：' + msg + '，已显示通用做法');
        this.setData({ cookLoading: false, cookBtnText: '做法' });
      }
    });
  },

  fetchCookFor(dish) {
    if (this.state.customRecipes[dish]) return;
    wx.cloud.callFunction({
      name: 'cook',
      data: { dish },
      success: (res) => {
        const data = res.result;
        if (data && data.recipe) {
          this.state.customRecipes[dish] = data.recipe;
          if (data.tip) this.state.customTips[dish] = data.tip;
          this.saveState();
          if (this.data.resultText === dish && this.data.tipVisible) {
            this.setData({ tipText: data.tip || this.data.tipText });
          }
        }
      }
    });
  },

  getCookFallback(dish) {
    const patterns = [
      { p: /面|条|粉|烩|卤/, m: [{n:'面粉',a:'300克'},{n:'五花肉',a:'200克'},{n:'黄豆芽',a:'150克'},{n:'葱姜蒜',a:'适量'},{n:'老抽生抽',a:'各1勺'}], s: [{t:'蒸面',d:'细面拌油，上锅蒸15分钟至八分熟',w:'拌油防止粘连，蒸透才好入味',h:'大火蒸15分钟'},{t:'炒肉',d:'五花肉煸出油，加葱姜蒜爆香',w:'煸出猪油，菜才香',h:'中火煸炒5分钟'},{t:'拌面',d:'蒸好的面倒入菜汤中拌匀，再蒸5分钟',w:'二次蒸让面条吸饱汤汁',h:'大火蒸5分钟'}], tips: ['面条拌点油再蒸，不容易粘连','菜汤要多一点，面才能吸饱味儿','卤面讲究"蒸两次"，第一次蒸面第二次拌'] },
      { p: /汤|胡辣|油茶|羊肉/, m: [{n:'羊肉/牛肉',a:'300克'},{n:'面筋',a:'100克'},{n:'粉条',a:'1把'},{n:'香料包',a:'1个'},{n:'胡椒粉',a:'2勺'}], s: [{t:'熬汤',d:'骨头熬汤2小时，滤出清汤',w:'高汤是胡辣汤的底味',h:'小火熬2小时'},{t:'下面',d:'面筋撕块、粉条泡软下锅',w:'面筋撕块更易入味',h:'中火煮10分钟'},{t:'勾芡',d:'水淀粉勾薄芡，撒胡椒葱花',w:'芡汁不能太稠，要能流动',h:'小火搅匀'}], tips: ['胡辣汤要勾薄芡，太稠容易坨','胡椒粉最后放，香气更冲','面筋手撕比刀切更入味'] },
      { p: /鸡|鸭|肉|羊|牛|烧|焖/, m: [{n:'肉类',a:'500克'},{n:'葱姜',a:'适量'},{n:'料酒',a:'2勺'},{n:'香料',a:'少许'}], s: [{t:'焯水',d:'冷水下锅，加料酒焯去血沫',w:'冷水下锅，血沫才能充分析出',h:'大火烧开2分钟'},{t:'煸炒',d:'沥干后下锅煸炒至表面微焦',w:'焦化反应产生香味',h:'中火煸炒5分钟'},{t:'炖煮',d:'加开水没过肉，小火炖至软烂',w:'开水炖肉不发柴',h:'小火炖1小时'}], tips: ['冷水下锅焯水，血沫去得干净','煸炒时少翻动，焦化才香','炖肉用开水，冷水会让肉收缩'] },
      { p: /包|饺|馍|饼|煎|蒸/, m: [{n:'面粉',a:'300克'},{n:'馅料',a:'200克'},{n:'温水',a:'150毫升'}], s: [{t:'和面',d:'温水和面，揉至光滑醒30分钟',w:'温水激活面筋，面团更软',h:'常温醒30分钟'},{t:'包馅',d:'分剂擀皮，包入馅料捏紧',w:'中间厚边缘薄，不容易破',h:'手工包制'},{t:'蒸煎',d:'上锅蒸/平底锅中火煎至金黄',w:'煎包底部要煎出脆壳',h:'中火蒸15分钟或煎8分钟'}], tips: ['面要醒够，皮才软和','包子收口要捏紧，蒸时漏汤','水煎包底部喷水再焖，底更脆'] },
      { p: /炸|酥|焦|紫/, m: [{n:'主料',a:'300克'},{n:'淀粉',a:'3勺'},{n:'鸡蛋',a:'1个'},{n:'食用油',a:'足量'}], s: [{t:'腌制',d:'主料切块，加盐料酒腌制15分钟',w:'入味去腥，底味要足',h:'常温腌制'},{t:'挂糊',d:'裹上淀粉蛋液糊，静置5分钟',w:'糊要稠一点，炸出来更酥',h:'静置5分钟'},{t:'油炸',d:'六成油温下锅，炸至金黄捞出',w:'六成油温约180度，筷子入油起密集泡',h:'中火炸至金黄'}], tips: ['复炸一次更酥脆','油温不够会吸油，太虚','挂糊后静置，糊更贴合'] },
      { p: /凉|皮|豆腐|萝卜/, m: [{n:'凉粉/豆腐',a:'300克'},{n:'蒜泥',a:'2勺'},{n:'辣椒油',a:'1勺'},{n:'香醋',a:'2勺'},{n:'榨菜/香菜',a:'适量'}], s: [{t:'切配',d:'凉粉切方块或豆腐划薄片',w:'凉粉切粗一点，煎时不易碎',h:'刀工处理'},{t:'煎炒',d:'少许油将凉粉煎至两面焦黄',w:'煎至起焦壳才香',h:'中火煎5分钟'},{t:'调味',d:'加蒜泥辣椒油香醋拌匀',w:'调料提前调好，味道更融合',h:'小火翻匀'}], tips: ['凉粉切厚一点，煎时不容易碎','豆腐脑要趁热吃，凉了发酸','调料汁提前10分钟调好'] }
    ];
    for (const item of patterns) {
      if (item.p.test(dish)) {
        return {
          materials: item.m.map(x => ({ name: x.n, amount: x.a })),
          steps: item.s.map(x => ({ title: x.t, desc: x.d, why: x.w, heat: x.h })),
          tips: item.tips
        };
      }
    }
    return {
      materials: [{name:'主料',a:'300克'},{name:'配菜',a:'适量'},{name:'调料',a:'适量'}],
      steps: [{title:'备料',desc:'食材洗净切配',why:'预处理到位，炒菜不慌',heat:'刀工处理'},{title:'烹制',desc:'按火候要求烹饪至熟',why:'火候是家常菜的关键',heat:'中火翻炒'},{title:'调味',desc:'加盐酱油等调味出锅',why:'调味分两次，中间尝咸淡',heat:'小火拌匀'}],
      tips: ['火候到位，味道自然好','调味分两次，中间尝咸淡','食材预处理做足，炒菜才顺手']
    };
  },

  renderCook(recipe) {
    if (!recipe) return;
    const steps = (recipe.steps || []).map((s, i) => ({
      num: this.toChineseNum(i + 1),
      title: s.title || '',
      desc: s.desc || '',
      why: s.why || '',
      heat: s.heat || ''
    }));
    this.setData({
      cookMaterials: recipe.materials || [],
      cookSteps: steps,
      cookTips: recipe.tips || []
    });
  },

  toChineseNum(n) {
    const cn = ['零','壹','贰','叁','肆','伍','陆','柒','捌','玖','拾'];
    if (n <= 10) return cn[n];
    if (n < 20) return '拾' + (n % 10 === 0 ? '' : cn[n % 10]);
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    if (ones === 0) return cn[tens] + '拾';
    return cn[tens] + '拾' + cn[ones];
  },

  // ══════════ 分享图 ══════════
  async shareFood() {
    const dish = this.data.resultText;
    if (dish === '待君问签') return;
    try {
      this.setData({
        shareOverlayVisible: true,
        shareImageUrl1: '',
        shareImageUrl2: '',
        shareNavVisible: false,
        shareDotsVisible: false,
        shareHint: '生成中…',
        shareScrollLeft: 0,
        shareDotIndex: 0
      });
      const tempPath = await this.drawFortuneCard(dish);
      this.setData({
        shareImageUrl1: tempPath,
        shareNavVisible: true,
        shareDotsVisible: true,
        shareHint: '左右滑动切换 · 长按保存'
      });
    } catch (e) {
      console.error('[index] share card fail:', e);
      this.showToast('生成失败，请重试');
      this.setData({ shareOverlayVisible: false });
    }
  },

  async exportCookCard() {
    const dish = this.data.resultText;
    const recipe = this.state.customRecipes[dish];
    if (!recipe) {
      this.showToast('暂无做法可导出');
      return;
    }
    try {
      this.setData({
        shareOverlayVisible: true,
        shareImageUrl1: '',
        shareImageUrl2: '',
        shareNavVisible: false,
        shareDotsVisible: false,
        shareHint: '生成中…',
        shareScrollLeft: 0,
        shareDotIndex: 0
      });
      const tempPath = await this.drawCookCard(dish, recipe);
      this.setData({
        shareImageUrl2: tempPath,
        shareNavVisible: true,
        shareDotsVisible: true,
        shareHint: '左右滑动切换 · 长按保存'
      });
    } catch (e) {
      console.error('[index] export fail:', e);
      this.showToast('生成失败，请重试');
      this.setData({ shareOverlayVisible: false });
    }
  },

  drawFortuneCard(dish) {
    const that = this;
    return new Promise((resolve, reject) => {
      const tips = getTips(this.state);
      const tipText = tips[dish] || this.state.customTips[dish] || '';
      const timeTip = fortune.getTimeTip();
      const solarTip = fortune.getSolarTip();
      const d = new Date();
      const dateStr = d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');

      wx.createSelectorQuery().select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) { reject(new Error('canvas not found')); return; }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = 540, H = 960;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#F6F1E9';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#CBC0AE';
        for (let x = 10; x < W; x += 20) {
          for (let y = 10; y < H; y += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#8A3D27';
        ctx.font = '600 48px serif';
        ctx.textAlign = 'center';
        ctx.fillText(dish, W / 2, 420);

        let y = 480;
        if (tipText) {
          ctx.fillStyle = '#6B6055';
          ctx.font = '400 14px sans-serif';
          ctx.fillText(tipText, W / 2, y);
          y += 28;
        }
        ctx.fillStyle = '#A89F94';
        ctx.font = '400 12px sans-serif';
        ctx.fillText(timeTip + ' · ' + solarTip, W / 2, y);
        y += 32;

        ctx.fillStyle = '#A89F94';
        ctx.font = '400 13px serif';
        ctx.fillText('吃啥嘞', W / 2, H - 80);
        ctx.fillStyle = '#CBC0AE';
        ctx.font = '300 10px sans-serif';
        ctx.fillText('chisha.shameless.top', W / 2, H - 60);
        ctx.fillStyle = '#CBC0AE';
        ctx.font = '400 10px serif';
        ctx.fillText(dateStr, W / 2, H - 40);

        wx.canvasToTempFilePath({ canvas, success: r => resolve(r.tempFilePath), fail: reject });
      });
    });
  },

  drawCookCard(dish, recipe) {
    const that = this;
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) { reject(new Error('canvas not found')); return; }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const W = 540;
        const MAX_H = 5000;
        canvas.width = W * dpr;
        canvas.height = MAX_H * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#F6F1E9';
        ctx.fillRect(0, 0, W, MAX_H);
        ctx.fillStyle = '#CBC0AE';
        for (let x = 10; x < W; x += 20) {
          for (let y = 10; y < MAX_H; y += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        let y = 70;
        ctx.fillStyle = '#8A3D27';
        ctx.font = '600 36px serif';
        ctx.textAlign = 'center';
        ctx.fillText(dish, W / 2, y);
        y += 50;
        const ds = new Date().getFullYear() + '.' + String(new Date().getMonth() + 1).padStart(2, '0') + '.' + String(new Date().getDate()).padStart(2, '0');
        ctx.fillStyle = '#A89F94';
        ctx.font = '400 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ds, W / 2, y);
        ctx.textAlign = 'left';
        y += 50;

        const mats = recipe.materials || [];
        const steps = recipe.steps || [];
        const tips = recipe.tips || [];

        if (mats.length) {
          ctx.fillStyle = '#B85438';
          ctx.font = '600 13px sans-serif';
          ctx.fillText('食材', 48, y);
          y += 24;
          ctx.fillStyle = '#6B6055';
          ctx.font = '400 12px sans-serif';
          mats.forEach(m => {
            ctx.fillText(m.name + '    ' + m.amount, 48, y);
            y += 24;
          });
          y += 16;
        }
        if (steps.length) {
          ctx.fillStyle = '#B85438';
          ctx.font = '600 13px sans-serif';
          ctx.fillText('步骤', 48, y);
          y += 24;
          steps.forEach((s, i) => {
            ctx.fillStyle = '#B85438';
            ctx.font = '600 16px serif';
            ctx.fillText(String(i + 1), 48, y + 4);
            ctx.fillStyle = '#23201B';
            ctx.font = '600 14px sans-serif';
            ctx.fillText(s.title || '', 72, y);
            y += 22;
            ctx.fillStyle = '#6B6055';
            ctx.font = '400 12px sans-serif';
            if (s.desc) y = that._drawWrapped(ctx, s.desc, 72, y, W - 96, 20);
            if (s.why) {
              ctx.fillStyle = '#A89F94';
              ctx.font = 'italic 400 11px sans-serif';
              y = that._drawWrapped(ctx, '→ ' + s.why, 72, y, W - 96, 18);
            }
            if (s.heat) {
              ctx.fillStyle = '#8A3D27';
              ctx.font = '400 11px sans-serif';
              ctx.fillText(s.heat, 72, y);
              y += 22;
            }
            y += 12;
          });
          y += 8;
        }
        if (tips.length) {
          ctx.fillStyle = '#B85438';
          ctx.font = '600 13px sans-serif';
          ctx.fillText('小贴士', 48, y);
          y += 24;
          ctx.fillStyle = '#6B6055';
          ctx.font = '400 12px sans-serif';
          tips.forEach(t => {
            y = that._drawWrapped(ctx, '· ' + t, 48, y, W - 96, 20);
            y += 4;
          });
        }

        y += 48;
        ctx.fillStyle = '#A89F94';
        ctx.font = '400 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('吃啥嘞', W / 2, y);
        ctx.fillText('chisha.shameless.top', W / 2, y + 18);

        const actualH = Math.max(y + 40, 960);
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width: W, height: actualH,
          success: r => resolve(r.tempFilePath),
          fail: reject
        });
      });
    });
  },

  _drawWrapped(ctx, text, x, y, maxW, lh) {
    if (!text) return y;
    const chars = text.split('');
    let line = '', cy = y;
    for (let i = 0; i < chars.length; i++) {
      const tl = line + chars[i];
      if (ctx.measureText(tl).width > maxW && i > 0) {
        ctx.fillText(line, x, cy);
        line = chars[i];
        cy += lh;
      } else {
        line = tl;
      }
    }
    ctx.fillText(line, x, cy);
    return cy + lh;
  },

  // ══════════ 分享 Overlay ══════════
  closeShareOverlay() {
    this.setData({
      shareOverlayVisible: false,
      shareImageUrl1: '',
      shareImageUrl2: ''
    });
  },

  scrollShare(e) {
    const dir = parseInt(e.currentTarget.dataset.dir) || 0;
    const newLeft = this.data.shareScrollLeft + dir * 300;
    this.setData({ shareScrollLeft: newLeft });
  },

  onShareScroll(e) {
    const { scrollLeft, scrollWidth } = e.detail;
    const index = Math.round(scrollLeft / (scrollWidth / 2));
    this.setData({ shareDotIndex: index });
  },

  // ══════════ 历史记录 ══════════
  showHistory() {
    const list = (this.state.history.draws || []).map(d => ({
      name: d.name,
      date: d.date || '',
      time: d.time || '',
      signNumber: d.signNumber || '',
      fortune: d.fortune || '',
      tip: d.tip || ''
    }));
    this.setData({ historyVisible: true, historyList: list });
  },

  closeHistory() {
    this.setData({ historyVisible: false });
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有抽签历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.state.history.draws = [];
          this.saveState();
          this.setData({ historyList: [] });
        }
      }
    });
  },

  // ══════════ 分类选择器 ══════════
  showCategoryPicker() {
    this.renderCategoryList();
    this.setData({ categoryVisible: true });
  },

  closeCategoryPicker() {
    this.setData({ categoryVisible: false });
  },

  switchFoodMode() {
    const modes = ['shengji', 'caixi', 'jiachang'];
    const current = this.state.foodMode || 'shengji';
    const nextIndex = (modes.indexOf(current) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    this.state.foodMode = nextMode;
    this.state.selectedCategories = [DEFAULT_CATEGORY_ORDER[nextMode][0], '我的菜单'];
    this.state.excludedFoods = [];
    this.state.categoryOrder = DEFAULT_CATEGORY_ORDER[nextMode];
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
  },

  toggleAllCategories() {
    const mode = FOOD_MODES[this.state.foodMode] || FOOD_MODES.shengji;
    const allCatNames = (mode.categories || []).map(c => c.name);
    const allSelected = allCatNames.length > 0 && allCatNames.every(name => this.state.selectedCategories.includes(name));
    if (allSelected) {
      this.state.selectedCategories = this.state.selectedCategories.filter(name => name === '我的菜单');
    } else {
      const newSelected = new Set([...this.state.selectedCategories, ...allCatNames]);
      this.state.selectedCategories = Array.from(newSelected);
    }
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
  },

  toggleMyMenuCategory() {
    const idx = this.state.selectedCategories.indexOf('我的菜单');
    if (idx >= 0) {
      this.state.selectedCategories.splice(idx, 1);
    } else {
      this.state.selectedCategories.push('我的菜单');
    }
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
  },

  toggleExpandMyMenu(e) {
    e.stopPropagation && e.stopPropagation();
    this.setData({ myMenuExpanded: !this.data.myMenuExpanded });
  },

  removeMyMenuItem(e) {
    e.stopPropagation && e.stopPropagation();
    const name = e.currentTarget.dataset.name;
    const idx = this.state.myMenu.indexOf(name);
    if (idx >= 0) {
      this.state.myMenu.splice(idx, 1);
      this.saveState();
      this.refreshFoods();
      this.renderCategoryList();
    }
  },

  showMyMenuAddInput(e) {
    e.stopPropagation && e.stopPropagation();
    this.setData({ myMenuAdding: true });
  },

  onMyMenuAddConfirm(e) {
    const val = (e.detail.value || '').trim();
    this.setData({ myMenuAdding: false });
    if (val) this.addToMyMenu(val);
  },

  onMyMenuAddBlur(e) {
    const val = (e.detail.value || '').trim();
    this.setData({ myMenuAdding: false });
    if (val) this.addToMyMenu(val);
  },

  addToMyMenu(val) {
    if (this.state.myMenu.includes(val)) {
      this.showToast('「' + val + '」已在菜单中');
      return;
    }
    this.state.myMenu.push(val);
    if (!this.state.selectedCategories.includes('我的菜单')) {
      this.state.selectedCategories.push('我的菜单');
    }
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
    this.fetchCookFor(val);
  },

  renderCategoryList() {
    const { foodMode, selectedCategories, excludedFoods, myMenu } = this.state;
    const mode = FOOD_MODES[foodMode] || FOOD_MODES.shengji;
    const allCatNames = (mode.categories || []).map(c => c.name);
    const allSelected = allCatNames.length > 0 && allCatNames.every(name => selectedCategories.includes(name));

    const myMenuSelected = selectedCategories.includes('我的菜单');
    const myMenuCount = myMenu.length;
    const myMenuCountText = (myMenuSelected ? myMenuCount : 0) + '/' + myMenuCount;

    const foodModeLabel = {
      shengji: '🏛️ 省籍',
      caixi: '🏛️ 菜系',
      jiachang: '🏛️ 家常'
    }[foodMode] || '🏛️ 省籍';

    const expandedCategoryIndex = this.data.expandedCategoryIndex;
    const categoryList = (mode.categories || []).map((cat, i) => {
      const isSelected = selectedCategories.includes(cat.name);
      const excludedCount = cat.items.filter(n => excludedFoods.includes(n)).length;
      const inPoolCount = isSelected ? cat.items.length - excludedCount : 0;
      const statusText = (isSelected ? inPoolCount : 0) + '/' + cat.items.length;
      return {
        name: cat.name,
        selected: isSelected,
        expanded: expandedCategoryIndex === i,
        statusText,
        items: cat.items.map(name => ({
          name,
          inPool: isSelected && !excludedFoods.includes(name)
        }))
      };
    });

    this.setData({
      categoryList,
      allSelected,
      myMenuSelected,
      myMenuCountText,
      foodModeLabel
    });
  },

  toggleCategory(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.categoryList;
    const cat = list[idx];
    const catName = cat.name;
    const sIdx = this.state.selectedCategories.indexOf(catName);
    if (sIdx >= 0) {
      this.state.selectedCategories.splice(sIdx, 1);
      const mode = FOOD_MODES[this.state.foodMode] || FOOD_MODES.shengji;
      const catData = (mode.categories || []).find(c => c.name === catName);
      if (catData) {
        catData.items.forEach(name => {
          const eIdx = this.state.excludedFoods.indexOf(name);
          if (eIdx >= 0) this.state.excludedFoods.splice(eIdx, 1);
        });
      }
    } else {
      this.state.selectedCategories.push(catName);
    }
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
  },

  toggleExpandCategory(e) {
    e.stopPropagation && e.stopPropagation();
    const idx = e.currentTarget.dataset.index;
    const current = this.data.expandedCategoryIndex;
    this.setData({ expandedCategoryIndex: current === idx ? -1 : idx });
    this.renderCategoryList();
  },

  toggleFoodExclude(e) {
    e.stopPropagation && e.stopPropagation();
    const name = e.currentTarget.dataset.name;
    const catIdx = e.currentTarget.dataset.cat;
    const cat = this.data.categoryList[catIdx];
    if (!this.state.selectedCategories.includes(cat.name)) {
      this.state.selectedCategories.push(cat.name);
    }
    const idx = this.state.excludedFoods.indexOf(name);
    if (idx >= 0) {
      this.state.excludedFoods.splice(idx, 1);
    } else {
      this.state.excludedFoods.push(name);
    }
    this.saveState();
    this.refreshFoods();
    this.renderCategoryList();
  },

  // ══════════ 签筒弹窗 ══════════
  showAllFoods() {
    const foodsWithSource = getFoodsWithSource(this.state);
    const poolFoods = foodsWithSource.map((item, i) => ({
      name: item.name,
      source: item.source,
      themeIndex: i % 7,
      removable: item.source === '我的菜单'
    }));
    this.setData({ poolVisible: true, poolFoods });
  },

  closePoolOverlay() {
    this.setData({ poolVisible: false });
  },

  onPoolItemTap(e) {
    const name = e.currentTarget.dataset.name;
    this.previewByName(name);
    this.setData({ poolVisible: false });
  },

  onPoolItemLongPress(e) {
    const name = e.currentTarget.dataset.name;
    const idx = this.state.myMenu.indexOf(name);
    if (idx >= 0) {
      wx.showModal({
        title: '删除确认',
        content: '从「我的菜单」中删除「' + name + '」？',
        success: (res) => {
          if (res.confirm) {
            this.state.myMenu.splice(idx, 1);
            this.saveState();
            this.refreshFoods();
            if (this.data.poolVisible) this.showAllFoods();
          }
        }
      });
    }
  },

  onPoolItemRemove(e) {
    e.stopPropagation && e.stopPropagation();
    const name = e.currentTarget.dataset.name;
    const idx = this.state.myMenu.indexOf(name);
    if (idx >= 0) {
      this.state.myMenu.splice(idx, 1);
      this.saveState();
      this.refreshFoods();
      this.showAllFoods();
    }
  },

  // ══════════ 音效 ══════════
  toggleSound() {
    this.state.settings.sound = !this.state.settings.sound;
    this.saveState();
    if (this.state.settings.sound) this.playWoodblock();
  },

  playWoodblock() {
    const app = getApp();
    if (app.woodblock && this.state.settings.sound !== false) {
      app.woodblock.stop();
      app.woodblock.play();
    }
  },

  playStamp() {
    const app = getApp();
    if (app.stamp && this.state.settings.sound !== false) {
      app.stamp.stop();
      app.stamp.play();
    }
  },

  // ══════════ Toast ══════════
  showToast(msg) {
    this.setData({ toastVisible: true, toastMsg: msg });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.setData({ toastVisible: false }); }, 2000);
  },

  onPanelTap() {
    // 阻止冒泡
  },

  // ══════════ 触摸滑动 ══════════
  onTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      // 左右滑动可切换签筒与选菜，此处暂不处理
    }
  },

  onOverlayTouchStart(e) {
    if (e.touches.length === 1) {
      this.overlayTouchStartX = e.touches[0].clientX;
      this.overlayTouchStartY = e.touches[0].clientY;
    }
  },

  onOverlayTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - this.overlayTouchStartX;
    const dy = e.changedTouches[0].clientY - this.overlayTouchStartY;
    if (Math.abs(dx) > 80 || dy > 80) {
      if (this.data.shareOverlayVisible) this.closeShareOverlay();
      else if (this.data.historyVisible) this.closeHistory();
      else if (this.data.categoryVisible) this.closeCategoryPicker();
      else if (this.data.poolVisible) this.closePoolOverlay();
    }
  }
});
