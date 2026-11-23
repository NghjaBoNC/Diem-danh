const Store = (() => {
  const STORAGE_KEY = 'daily_checkin_v1';
  const toDateKey = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const load = () => {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { raw = {}; }
    const history = raw.history || {};
    const targets = raw.targets || {};
    const customQuotes = Array.isArray(raw.customQuotes) ? raw.customQuotes : [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = toDateKey(cutoff);
    let changed = false;
    Object.keys(history).forEach((k) => {
      if (k < cutoffKey) { delete history[k]; changed = true; }
      else if (typeof history[k] === 'string') {
        history[k] = { start: history[k], end: history[k], type: 'normal', note: '' };
        changed = true;
      }
    });
    const state = { history, targets, customQuotes };
    if (changed) save(state);
    return state;
  };

  const save = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const isCompleted = (r) => Boolean(r && (r.type === 'makeup' || (r.start && r.end)));

  const calcStats = (history) => {
    const keys = Object.keys(history).filter((k) => isCompleted(history[k]));
    const now = new Date();
    const monthCount = keys.filter((k) => k.startsWith(toDateKey(now).slice(0, 7))).length;
    let streak = 0;
    const cur = new Date(now);
    if (!isCompleted(history[toDateKey(cur)])) cur.setDate(cur.getDate() - 1);
    while (isCompleted(history[toDateKey(cur)])) { streak++; cur.setDate(cur.getDate() - 1); }

    let totalMins = 0;
    keys.forEach((k) => {
      const r = history[k];
      if (r.start && r.end) totalMins += Math.max(1, Math.round((new Date(r.end) - new Date(r.start)) / 60000));
    });

    return { streak, total: keys.length, monthPct: Math.round((monthCount / now.getDate()) * 100), totalMins };
  };

  return { toDateKey, load, save, isCompleted, calcStats };
})();
