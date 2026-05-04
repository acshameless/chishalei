/**
 * 干支历计算工具
 * 年/日/时 精确计算，月柱为基于公历月份的简化版（五虎遁月近似）
 */

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 获取某年的干支（精确） */
function getYearGanZhi(year) {
  const offset = (year - 4) % 60;
  return TIAN_GAN[offset % 10] + DI_ZHI[offset % 12];
}

/** 获取某日的干支（精确，以1900-01-31甲辰日为基准） */
function getDayGanZhi(date) {
  const base = Date.UTC(1900, 0, 31); // 甲辰日 = 第40个干支
  const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((target - base) / (24 * 60 * 60 * 1000));
  const offset = (40 + diff) % 60;
  return TIAN_GAN[offset % 10] + DI_ZHI[offset % 12];
}

/** 获取某时的干支（精确，五鼠遁时） */
function getHourGanZhi(dayGanZhi, hour) {
  const dayGanIndex = TIAN_GAN.indexOf(dayGanZhi[0]);
  // 甲己日起甲子(0)，乙庚日起丙子(2)，丙辛日起戊子(4)，丁壬日起庚子(6)，戊癸日起壬子(8)
  const startGan = (dayGanIndex % 5) * 2;
  // 地支：0-1子(0)，1-3丑(1)，3-5寅(2)...
  const zhiIndex = Math.floor((hour + 1) / 2) % 12;
  return TIAN_GAN[(startGan + zhiIndex) % 10] + DI_ZHI[zhiIndex];
}

/** 获取月干支（简化版：基于公历月份近似，不精确到节气） */
function getMonthGanZhi(yearGanZhi, month) {
  const yearGanIndex = TIAN_GAN.indexOf(yearGanZhi[0]);
  // 五虎遁月：正月(寅)起始天干
  const startGan = (yearGanIndex * 2 + 2) % 10;
  // 简化月地支：公历月份映射（1→丑/腊月，2→寅/正月...12→子/十一月）
  const zhiIndex = month % 12;
  // 正月(寅,zhiIndex=2) 为基准，计算当前月份与正月的偏移
  const offset = (zhiIndex - 2 + 12) % 12;
  const ganIndex = (startGan + offset) % 10;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/** 格式化公历日期：YYYY.MM.DD */
function formatSolarDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/**
 * 获取当前时间的干支历信息
 * @param {Date} [date] 默认为当前时间
 * @returns {{ ganZhi: {year,month,day,hour}, solar: string }}
 */
function getGanZhiDate(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const hour = d.getHours();

  const yearGZ = getYearGanZhi(year);
  const monthGZ = getMonthGanZhi(yearGZ, month);
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
