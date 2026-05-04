/**
 * 节气主题色 —— 与 Web 端保持一致
 */

const SOLAR_PAPERS = {
  // 春 — 偏嫩绿/暖黄
  '立春': '#EEF0E0', '雨水': '#EBEDE5',
  '惊蛰': '#F0EBE0', '春分': '#E8EDE5',
  '清明': '#E5EBE2', '谷雨': '#EAE8DC',
  // 夏 — 偏暖黄/橙
  '立夏': '#F2E8D5', '小满': '#F0E5D0',
  '芒种': '#EEE2C8', '夏至': '#F0DEC5',
  '小暑': '#F2DCC0', '大暑': '#F5DAC0',
  // 秋 — 偏金/棕
  '立秋': '#F0E8D8', '处暑': '#EDE5D5',
  '白露': '#E8E5D8', '秋分': '#E5E2D5',
  '寒露': '#E2DFD2', '霜降': '#DFDCCF',
  // 冬 — 偏冷灰
  '立冬': '#E5E2DC', '小雪': '#E0DDD7',
  '大雪': '#DBD8D2', '冬至': '#D6D3CD',
  '小寒': '#D1CEC8', '大寒': '#CCC9C3'
};

function getSolarPaperColor() {
  const { getCurrentSolarTerm } = require('./fortune');
  const term = getCurrentSolarTerm();
  return SOLAR_PAPERS[term] || '#F6F1E9';
}

module.exports = {
  SOLAR_PAPERS,
  getSolarPaperColor
};
