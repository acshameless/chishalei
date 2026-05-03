const STORAGE_KEY = 'chisha_state_v6';

function load() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('storage load failed', e);
  }
  return null;
}

function save(state) {
  try {
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('storage save failed', e);
  }
}

module.exports = { load, save };
