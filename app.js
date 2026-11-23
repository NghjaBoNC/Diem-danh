(() => {
  const STORAGE_KEY = 'daily_checkin_v1';
  const QUOTE_IDX_KEY = 'daily_checkin_last_quote';
  const heroTitle = document.getElementById('hero-title');
  const checkinBtn = document.getElementById('checkin-btn');

  const setRandomQuote = () => {
    const lastIdx = Number(localStorage.getItem(QUOTE_IDX_KEY));
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * QUOTES.length);
    } while (QUOTES.length > 1 && nextIdx === lastIdx);
    localStorage.setItem(QUOTE_IDX_KEY, String(nextIdx));
    heroTitle.textContent = QUOTES[nextIdx];
  };

  const getTodayKey = () => {
    const now = new Date();
    return new Date(now - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };
  const loadState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { history: {} }; }
    catch { return { history: {} }; }
  };
  const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const render = () => {
    const isChecked = Boolean(loadState().history[getTodayKey()]);
    checkinBtn.classList.toggle('checked', isChecked);
    checkinBtn.textContent = isChecked ? 'Đã Điểm Danh ✓' : 'Điểm Danh';
  };

  heroTitle.addEventListener('click', setRandomQuote);
  checkinBtn.addEventListener('click', () => {
    const state = loadState();
    const today = getTodayKey();
    state.history[today] ? delete state.history[today] : (state.history[today] = new Date().toISOString());
    saveState(state);
    render();
  });

  setRandomQuote();
  render();
})();
