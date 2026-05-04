/**
 * 干支历计算工具
 * 年/月 以节气为界（立春分年，十二节分月），日/时精确计算
 */

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/* ═══════════════════════════════════════
   节气计算（基于简化 VSOP87 太阳黄经模型）
   ═══════════════════════════════════════ */

/** 角度转弧度 */
function _toRad(deg) { return deg * Math.PI / 180; }

/** 儒略日（UT） */
function _julianDay(year, month, day, hour) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

/** 太阳黄经（度），简化 VSOP87 */
function _sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(_toRad(M))
          + (0.019993 - 0.000101 * T) * Math.sin(_toRad(2 * M))
          + 0.000289 * Math.sin(_toRad(3 * M));
  let L = (L0 + C) % 360;
  if (L < 0) L += 360;
  return L;
}

// 24 节气的目标黄经（从小寒 285° 开始，每节气 +15°）
const TARGET_LONG = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270];

/** 查找某年某节气的精确 UT 儒略日 */
function _findSolarTermJD(year, stIndex) {
  const target = TARGET_LONG[stIndex];
  const month = Math.floor(stIndex / 2) + 1;
  const baseDay = stIndex % 2 === 0 ? 6 : 21;
  const baseJD = _julianDay(year, month, baseDay, 0);

  let bestJD = baseJD;
  let bestDiff = 360;

  // 粗搜：每 0.05 天（1.2 小时）
  for (let jd = baseJD - 5; jd <= baseJD + 5; jd += 0.05) {
    const L = _sunLongitude(jd);
    let diff = Math.abs(L - target);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) {
      bestDiff = diff;
      bestJD = jd;
    }
  }

  // 精搜：每 0.0005 天（43 秒）
  for (let jd = bestJD - 0.05; jd <= bestJD + 0.05; jd += 0.0005) {
    const L = _sunLongitude(jd);
    let diff = Math.abs(L - target);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) {
      bestDiff = diff;
      bestJD = jd;
    }
  }

  return bestJD;
}

/** 获取节气 UT 时间戳（毫秒） */
function _termUtcMs(year, stIndex) {
  return (_findSolarTermJD(year, stIndex) - 2440587.5) * 86400000;
}

/** 将本地北京时间转为 UT 时间戳（用于和节气比较） */
function _localToUtcMs(year, month, day, hour) {
  return Date.UTC(year, month, day, hour - 8, 0, 0);
}

/* ═══════════════════════════════════════
   十二"节"（月首）与月地支的对应
   ═══════════════════════════════════════ */
const JIE_MAP = [
  { st: 2, zhi: 2 },   // 立春 → 寅月
  { st: 4, zhi: 3 },   // 惊蛰 → 卯月
  { st: 6, zhi: 4 },   // 清明 → 辰月
  { st: 8, zhi: 5 },   // 立夏 → 巳月
  { st: 10, zhi: 6 },  // 芒种 → 午月
  { st: 12, zhi: 7 },  // 小暑 → 未月
  { st: 14, zhi: 8 },  // 立秋 → 申月
  { st: 16, zhi: 9 },  // 白露 → 酉月
  { st: 18, zhi: 10 }, // 寒露 → 戌月
  { st: 20, zhi: 11 }, // 立冬 → 亥月
  { st: 22, zhi: 0 },  // 大雪 → 子月
  { st: 0, zhi: 1 },   // 小寒 → 丑月
];

/* ═══════════════════════════════════════
   年柱（以立春为界）
   ═══════════════════════════════════════ */
function getYearGanZhi(year, month, day, hour) {
  const lichenMs = _termUtcMs(year, 2); // 当年立春 UT
  const localMs = _localToUtcMs(year, month, day, hour);
  const effectiveYear = localMs >= lichenMs ? year : year - 1;
  const offset = (effectiveYear - 4) % 60;
  const pos = ((offset % 60) + 60) % 60;
  return TIAN_GAN[pos % 10] + DI_ZHI[pos % 12];
}

/* ═══════════════════════════════════════
   月柱（以十二节为界）
   ═══════════════════════════════════════ */
function getMonthGanZhi(yearGanZhi, year, month, day, hour) {
  const localMs = _localToUtcMs(year, month, day, hour);

  // 收集前后各一年的所有"节"时间点
  const points = [];
  for (let y = year - 1; y <= year + 1; y++) {
    for (const j of JIE_MAP) {
      const stYear = j.st === 0 ? y + 1 : y; // 小寒可能跨到下一年
      points.push({ ms: _termUtcMs(stYear, j.st), zhi: j.zhi });
    }
  }
  points.sort((a, b) => a.ms - b.ms);

  // 找到当前日期之前最近的一个节
  let zhi = 1; // 默认丑月
  for (const p of points) {
    if (localMs >= p.ms) zhi = p.zhi;
  }

  // 五虎遁月：由年干推出正月（寅月）天干
  const yearGanIndex = TIAN_GAN.indexOf(yearGanZhi[0]);
  const startGan = (yearGanIndex * 2 + 2) % 10; // 寅月天干
  const offset = (zhi - 2 + 12) % 12; // 当前月与寅月的偏移
  const ganIndex = (startGan + offset) % 10;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhi];
}

/* ═══════════════════════════════════════
   日柱（精确，以1900-01-31甲辰日为基准）
   ═══════════════════════════════════════ */
function getDayGanZhi(date) {
  const base = Date.UTC(1900, 0, 31); // 甲辰日 = 第40个干支
  const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((target - base) / (24 * 60 * 60 * 1000));
  const offset = (40 + diff) % 60;
  const pos = ((offset % 60) + 60) % 60;
  return TIAN_GAN[pos % 10] + DI_ZHI[pos % 12];
}

/* ═══════════════════════════════════════
   时柱（精确，五鼠遁时）
   ═══════════════════════════════════════ */
function getHourGanZhi(dayGanZhi, hour) {
  const dayGanIndex = TIAN_GAN.indexOf(dayGanZhi[0]);
  const startGan = (dayGanIndex % 5) * 2;
  const zhiIndex = Math.floor((hour + 1) / 2) % 12;
  return TIAN_GAN[(startGan + zhiIndex) % 10] + DI_ZHI[zhiIndex];
}

/* ═══════════════════════════════════════
   公历日期格式化
   ═══════════════════════════════════════ */
function formatSolarDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/* ═══════════════════════════════════════
   主接口
   ═══════════════════════════════════════ */
function getGanZhiDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const hour = d.getHours();

  const yearGZ = getYearGanZhi(year, month, day, hour);
  const monthGZ = getMonthGanZhi(yearGZ, year, month, day, hour);
  const dayGZ = getDayGanZhi(d);
  const hourGZ = getHourGanZhi(dayGZ, hour);

  return {
    ganZhi: {
      year: yearGZ,
      month: monthGZ,
      day: dayGZ,
      hour: hourGZ
    },
    solar: formatSolarDate(d)
  };
}

module.exports = { getGanZhiDate };
