/**
 * 签文系统 + 节气系统 + 时间提示
 * 与 Web 端保持完全一致
 */

const FORTUNES = [
  // ── 食签 (30) ──
  { type: 'food', yi: '宜热食', ji: '忌久饿' },
  { type: 'food', yi: '宜细嚼', ji: '忌匆忙' },
  { type: 'food', yi: '宜加辣', ji: '忌寡淡' },
  { type: 'food', yi: '宜尝新', ji: '忌将就' },
  { type: 'food', yi: '宜汤食', ji: '忌干噎' },
  { type: 'food', yi: '宜慢煮', ji: '忌急火' },
  { type: 'food', yi: '宜对坐', ji: '忌独食' },
  { type: 'food', yi: '宜加醋', ji: '忌无味' },
  { type: 'food', yi: '宜大碗', ji: '忌小气' },
  { type: 'food', yi: '宜蘸料', ji: '忌清汤' },
  { type: 'food', yi: '宜现做', ji: '忌剩饭' },
  { type: 'food', yi: '宜堂食', ji: '忌外带' },
  { type: 'food', yi: '宜面食', ji: '忌凉腹' },
  { type: 'food', yi: '宜炖煮', ji: '忌生冷' },
  { type: 'food', yi: '宜点多', ji: '忌客气' },
  { type: 'food', yi: '宜趁热', ji: '忌等凉' },
  { type: 'food', yi: '宜有肉', ji: '忌全素' },
  { type: 'food', yi: '宜带汁', ji: '忌干巴' },
  { type: 'food', yi: '宜主食', ji: '忌空腹' },
  { type: 'food', yi: '宜分食', ji: '忌争抢' },
  { type: 'food', yi: '宜老店', ji: '忌连锁' },
  { type: 'food', yi: '宜路边', ji: '忌讲究' },
  { type: 'food', yi: '宜加蛋', ji: '忌省事' },
  { type: 'food', yi: '宜手作', ji: '忌速冻' },
  { type: 'food', yi: '宜早食', ji: '忌过午' },
  { type: 'food', yi: '宜饱食', ji: '忌节制' },
  { type: 'food', yi: '宜重口', ji: '忌寡淡' },
  { type: 'food', yi: '宜烫嘴', ji: '忌温吞' },
  { type: 'food', yi: '宜回锅', ji: '忌一遍' },
  { type: 'food', yi: '宜打包', ji: '忌浪费' },
  // ── 节气签 (24) ──
  { type: 'solar', text: '立春回暖，宜一碗春卷' },
  { type: 'solar', text: '雨水润物，宜汤面暖身' },
  { type: 'solar', text: '惊蛰初雷，宜吃梨润燥' },
  { type: 'solar', text: '春分时节，宜荠菜饺子' },
  { type: 'solar', text: '清明踏青，宜青团一枚' },
  { type: 'solar', text: '谷雨生百谷，宜食新茶' },
  { type: 'solar', text: '立夏将至，宜凉皮一碗' },
  { type: 'solar', text: '小满微热，宜绿豆消暑' },
  { type: 'solar', text: '芒种忙种，宜饱食再行' },
  { type: 'solar', text: '夏至长日，宜一碗凉面' },
  { type: 'solar', text: '小暑渐热，宜酸梅汤解' },
  { type: 'solar', text: '大暑极热，宜西瓜消暑' },
  { type: 'solar', text: '立秋转凉，宜贴秋膘' },
  { type: 'solar', text: '处暑余热，宜莲藕清心' },
  { type: 'solar', text: '白露微凉，宜一杯热茶' },
  { type: 'solar', text: '秋分平和，宜蟹黄满腹' },
  { type: 'solar', text: '寒露渐寒，宜羊肉暖身' },
  { type: 'solar', text: '霜降初霜，宜柿子红了' },
  { type: 'solar', text: '立冬入冬，宜涮锅围炉' },
  { type: 'solar', text: '小雪飘雪，宜炖菜暖屋' },
  { type: 'solar', text: '大雪封门，宜红薯暖手' },
  { type: 'solar', text: '冬至团圆，宜饺子一盘' },
  { type: 'solar', text: '小寒刺骨，宜胡辣汤一碗' },
  { type: 'solar', text: '大寒极寒，宜烩面暖透' },
  // ── 微人生感 ──
  { type: 'life', text: '饱腹之后，再谈远方' },
  { type: 'life', text: '日暮归家，灶上有烟' },
  { type: 'life', text: '好饭不怕晚' },
  { type: 'life', text: '慢慢吃，来日方长' },
  { type: 'life', text: '人间烟火气，最抚凡人心' },
  { type: 'life', text: '一碗下肚，万事可缓' },
  { type: 'life', text: '吃饱了不想家' },
  { type: 'life', text: '认真吃饭，就是认真生活' },
  { type: 'life', text: '先干饭，后干事' },
  { type: 'life', text: '有什么事，吃完再说' },
  { type: 'life', text: '忙了一天，这顿值了' },
  { type: 'life', text: '别亏待自己的胃' },
  { type: 'life', text: '能好好吃饭的日子，都是好日子' },
  { type: 'life', text: '今天也是好好吃饭的一天' },
  { type: 'life', text: '胃暖了，心就安了' },
  { type: 'life', text: '不赶时间的饭，最香' },
  { type: 'life', text: '吃完这碗，明天继续' },
  { type: 'life', text: '世事无常，但饭要按时吃' },
  { type: 'life', text: '人间至味是清欢' },
  { type: 'life', text: '粗茶淡饭，胜却人间无数' },
  { type: 'life', text: '一箪食，一瓢饮，足矣' },
  { type: 'life', text: '黄河水宽，不如一碗烩面暖' },
  { type: 'life', text: '洛阳花开，不及一口汤面鲜' },
  { type: 'life', text: '开封城外，烧饼夹肉最解忧' },
  { type: 'life', text: '胡辣汤热，中原的早晨醒了' },
  { type: 'life', text: '烟火深处，自有山河' },
  { type: 'life', text: '米油盐酱醋，人间五味全' },
  { type: 'life', text: '晨起一碗汤，日落一箪食' },
  { type: 'life', text: '此心安处，即是餐桌' },
  { type: 'life', text: '食无定味，适口者珍' },
  { type: 'life', text: '饭要一口一口吃，路要一步一步走' },
  { type: 'life', text: '碗中日月长' },
  { type: 'life', text: '人生如逆旅，我亦是食客' }
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getCurrentSolarTerm() {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  const terms = [
    { name: '立春', m: 2, d: 4 }, { name: '雨水', m: 2, d: 19 },
    { name: '惊蛰', m: 3, d: 5 }, { name: '春分', m: 3, d: 20 },
    { name: '清明', m: 4, d: 4 }, { name: '谷雨', m: 4, d: 19 },
    { name: '立夏', m: 5, d: 5 }, { name: '小满', m: 5, d: 20 },
    { name: '芒种', m: 6, d: 5 }, { name: '夏至', m: 6, d: 21 },
    { name: '小暑', m: 7, d: 6 }, { name: '大暑', m: 7, d: 22 },
    { name: '立秋', m: 8, d: 7 }, { name: '处暑', m: 8, d: 23 },
    { name: '白露', m: 9, d: 7 }, { name: '秋分', m: 9, d: 22 },
    { name: '寒露', m: 10, d: 8 }, { name: '霜降', m: 10, d: 23 },
    { name: '立冬', m: 11, d: 7 }, { name: '小雪', m: 11, d: 22 },
    { name: '大雪', m: 12, d: 6 }, { name: '冬至', m: 12, d: 21 },
    { name: '小寒', m: 1, d: 5 }, { name: '大寒', m: 1, d: 20 }
  ];
  let current = terms[terms.length - 1];
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (month < t.m || (month === t.m && day < t.d)) {
      current = terms[i === 0 ? terms.length - 1 : i - 1];
      break;
    }
  }
  return current.name;
}

function isSolarTermDay() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dates = [
    { m: 2, d: 4 }, { m: 2, d: 19 }, { m: 3, d: 5 }, { m: 3, d: 20 },
    { m: 4, d: 4 }, { m: 4, d: 19 }, { m: 5, d: 5 }, { m: 5, d: 20 },
    { m: 6, d: 5 }, { m: 6, d: 21 }, { m: 7, d: 6 }, { m: 7, d: 22 },
    { m: 8, d: 7 }, { m: 8, d: 23 }, { m: 9, d: 7 }, { m: 9, d: 22 },
    { m: 10, d: 8 }, { m: 10, d: 23 }, { m: 11, d: 7 }, { m: 11, d: 22 },
    { m: 12, d: 6 }, { m: 12, d: 21 }, { m: 1, d: 5 }, { m: 1, d: 20 }
  ];
  return dates.some(t => t.m === month && t.d === day);
}

function getTimeTip() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return '早餐宜温热';
  if (h >= 10 && h < 14) return '午餐要吃饱';
  if (h >= 14 && h < 17) return '下午适量补';
  if (h >= 17 && h < 20) return '晚餐宜清淡';
  if (h >= 20 && h < 24) return '夜宵不宜重';
  return '深夜少食';
}

function getSolarTip() {
  const term = getCurrentSolarTerm();
  const tips = {
    '立春': '春季生发，少食油腻',
    '雨水': '湿气渐重，健脾祛湿',
    '惊蛰': '春雷初动，养肝护目',
    '春分': '阴阳平衡，清淡为主',
    '清明': '清肝明目，多吃绿叶',
    '谷雨': '湿气最盛，注意排湿',
    '立夏': '暑气渐起，多喝水',
    '小满': '湿热交加，清淡饮食',
    '芒种': '闷热多汗，补充盐分',
    '夏至': '昼长夜短，多食瓜果',
    '小暑': '高温闷热，清凉解暑',
    '大暑': '酷热难耐，忌生冷过度',
    '立秋': '秋燥当令，滋阴润肺',
    '处暑': '暑去凉来，养胃健脾',
    '白露': '早晚转凉，温热饮食',
    '秋分': '昼夜均分，润燥养阴',
    '寒露': '寒气渐盛，暖胃驱寒',
    '霜降': '深秋寒凉，温补为宜',
    '立冬': '冬气始至，温补暖身',
    '小雪': '寒意渐浓，热汤暖身',
    '大雪': '严寒降临，进补正时',
    '冬至': '阴极阳生，羊肉温补',
    '小寒': '冷在三九，防寒暖胃',
    '大寒': '一年最冷，温热进补'
  };
  return tips[term] || '';
}

function getDailyFortune() {
  const today = new Date().toISOString().slice(0, 10);

  // 精确的节气日 → 显示对应节气签（横排）
  if (isSolarTermDay()) {
    const term = getCurrentSolarTerm();
    const solar = FORTUNES.find(f => f.type === 'solar' && f.text.startsWith(term));
    if (solar) return solar;
  }

  // 非节气日 → 从食签中按日期 hash 选取（竖排宜/忌）
  const foods = FORTUNES.filter(f => f.type === 'food');
  const seed = Math.abs(hashCode(today));
  return foods[seed % foods.length];
}

function toChineseUpper(n) {
  const cn = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];
  if (n <= 10) return cn[n];
  if (n < 20) return '拾' + (n % 10 === 0 ? '' : cn[n % 10]);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return cn[tens] + '拾';
  return cn[tens] + '拾' + cn[ones];
}

/**
 * 获取签号：基于食物名 + 当前时间戳的组合，每次点击签数不同
 * @param {string} foodName - 食物名
 * @returns {number} 1-100 的签号
 */
function getSignNumber(foodName) {
  const seed = Math.abs(hashCode((foodName || '') + Date.now()));
  return (seed % 100) + 1;
}

/**
 * 格式化签文为显示文本
 * 返回 { text, yi, ji, type } — food 类型包含 yi/ji，其他类型使用 text
 */
function formatFortune(fortune) {
  if (!fortune) return { text: '', type: '', yi: '', ji: '' };
  if (fortune.type === 'food') {
    return { text: '', type: 'food', yi: fortune.yi || '', ji: fortune.ji || '' };
  }
  return { text: fortune.text || '', type: fortune.type || '', yi: '', ji: '' };
}

module.exports = {
  FORTUNES,
  getCurrentSolarTerm,
  isSolarTermDay,
  getTimeTip,
  getSolarTip,
  getDailyFortune,
  toChineseUpper,
  getSignNumber,
  formatFortune
};