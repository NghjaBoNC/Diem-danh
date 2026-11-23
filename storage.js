const Store = (() => {
  const STORAGE_KEY = 'daily_checkin_v1';
  const toDateKey = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const load = () => {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { history: {} }; }
    catch { raw = { history: {} }; }
    const history = raw.history || {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = toDateKey(cutoff);
    let changed = false;
    Object.keys(history).forEach((k) => {
      if (k < cutoffKey) { delete history[k]; changed = true; }
      else if (typeof history[k] === 'string') {
        history[k] = { start: history[k], end: history[k], type: 'normal' };
        changed = true;
      }
    });
    if (changed) save({ history });
    return { history };
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
    return { streak, total: keys.length, monthPct: Math.round((monthCount / now.getDate()) * 100) };
  };

  return { toDateKey, load, save, isCompleted, calcStats };
})();
