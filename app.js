(() => {
  const STORAGE_KEY = 'daily_checkin_v1';
  const QUOTE_IDX_KEY = 'daily_checkin_last_quote';

  const quoteCard = document.getElementById('quote-card');
  const heroTitle = document.getElementById('hero-title');
  const todayDateEl = document.getElementById('today-date');
  const checkinBtn = document.getElementById('checkin-btn');
  const statusEl = document.getElementById('checkin-status');
  const statStreak = document.getElementById('stat-streak');
  const statTotal = document.getElementById('stat-total');
  const statMonth = document.getElementById('stat-month');

  const toDateKey = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const loadState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { history: {} }; }
    catch { return { history: {} }; }
  };
  const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  const setRandomQuote = () => {
    const lastIdx = Number(localStorage.getItem(QUOTE_IDX_KEY));
    let nextIdx;
    do { nextIdx = Math.floor(Math.random() * QUOTES.length); }
    while (QUOTES.length > 1 && nextIdx === lastIdx);
    localStorage.setItem(QUOTE_IDX_KEY, String(nextIdx));
    heroTitle.textContent = QUOTES[nextIdx];
  };

  const calcStats = (history) => {
    const keys = Object.keys(history);
    const total = keys.length;
    const now = new Date();
    const monthPrefix = toDateKey(now).slice(0, 7);
    const monthCount = keys.filter((k) => k.startsWith(monthPrefix)).length;
    const monthPct = Math.round((monthCount / now.getDate()) * 100);

    let streak = 0;
    const cursor = new Date(now);
    if (!history[toDateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (history[toDateKey(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { streak, total, monthPct };
  };

  const render = () => {
    const now = new Date();
    const today = toDateKey(now);
    const history = loadState().history;
    const stamp = history[today];

    todayDateEl.textContent = now.toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });

    checkinBtn.classList.toggle('checked', Boolean(stamp));
    checkinBtn.textContent = stamp ? 'Đã Điểm Danh ✓' : 'Điểm Danh';

    if (stamp) {
      const timeStr = new Date(stamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      statusEl.textContent = `Đã ghi nhận lúc ${timeStr}`;
      statusEl.classList.add('done');
    } else {
      statusEl.textContent = 'Chưa ghi nhận hôm nay';
      statusEl.classList.remove('done');
    }

    const { streak, total, monthPct } = calcStats(history);
    statStreak.textContent = `${streak} ngày`;
    statTotal.textContent = total;
    statMonth.textContent = `${monthPct}%`;
  };

  quoteCard.addEventListener('click', setRandomQuote);
  checkinBtn.addEventListener('click', () => {
    const state = loadState();
    const today = toDateKey(new Date());
    state.history[today] ? delete state.history[today] : (state.history[today] = new Date().toISOString());
    saveState(state);
    render();
  });

  setRandomQuote();
  render();
})();
