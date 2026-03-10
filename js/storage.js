/**
 * GPad Tester — LocalStorage Manager
 * Handles test history, controller profiles, and settings persistence.
 */

const Storage = {
  PREFIX: 'gpad_',

  /** Set a value */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage.set failed:', e);
      return false;
    }
  },

  /** Get a value */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  /** Remove a key */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /** Clear all gpad keys */
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  // --- Test History ---

  /** Save a test result */
  saveTestResult(toolName, result) {
    const key = `history_${toolName}`;
    const history = this.get(key, []);
    history.unshift({
      ...result,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    });
    // Keep last 50 results
    if (history.length > 50) history.length = 50;
    this.set(key, history);
    return history;
  },

  /** Get test history for a tool */
  getTestHistory(toolName) {
    return this.get(`history_${toolName}`, []);
  },

  /** Clear test history for a tool */
  clearTestHistory(toolName) {
    this.remove(`history_${toolName}`);
  },

  // --- Controller Profiles ---

  /** Save controller profile settings */
  saveProfile(controllerId, settings) {
    const profiles = this.get('profiles', {});
    profiles[controllerId] = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    this.set('profiles', profiles);
  },

  /** Get controller profile */
  getProfile(controllerId) {
    const profiles = this.get('profiles', {});
    return profiles[controllerId] || null;
  },

  // --- Settings ---

  /** Save user setting */
  saveSetting(key, value) {
    const settings = this.get('settings', {});
    settings[key] = value;
    this.set('settings', settings);
  },

  /** Get user setting */
  getSetting(key, defaultValue = null) {
    const settings = this.get('settings', {});
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }
};
