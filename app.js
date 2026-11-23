(() => {
  const QUOTE_IDX_KEY = 'daily_checkin_last_quote';
  const MIN_WAIT_MS = 10 * 60 * 1000;

  const $ = (id) => document.getElementById(id);
  const viewHome = $('view-home'), viewHistory = $('view-history');
  const tabHome = $('tab-home'), tabHistory = $('tab-history');
  const checkinBtn = $('checkin-btn'), sessionInfo = $('session-info'), statusEl = $('checkin-status');

  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const fmtDuration = (ms) => {
    const mins = Math.max(1, Math.round(ms / 60000));
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}p` : `${m} phút`;
  };

  const setRandomQuote = () => {
    const lastIdx = Number(localStorage.getItem(QUOTE_IDX_KEY));
    let nextIdx;
    do { nextIdx = Math.floor(Math.random() * QUOTES.length); }
    while (QUOTES.length > 1 && nextIdx === lastIdx);
    localStorage.setItem(QUOTE_IDX_KEY, String(nextIdx));
    $('hero-title').textContent = QUOTES[nextIdx];
  };

  const renderHome = () => {
    const now = new Date();
    const today = Store.toDateKey(now);
    const { history } = Store.load();
    const rec = history[today];

    $('today-date').textContent = now.toLocaleDateString('vi-VN', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
    });

    checkinBtn.className = 'checkin-btn';
    statusEl.className = 'checkin-status';

    if (!rec) {
      checkinBtn.disabled = false;
      checkinBtn.textContent = 'Bắt Đầu Học';
      sessionInfo.classList.add('hidden');
      statusEl.textContent = 'Chưa bắt đầu phiên hôm nay';
    } else if (rec.start && !rec.end) {
      sessionInfo.classList.remove('hidden');
      $('t-start').textContent = fmtTime(rec.start);
      $('t-end').textContent = '--:--';
      $('t-total').textContent = 'Đang học...';

      const remain = MIN_WAIT_MS - (Date.now() - new Date(rec.start).getTime());
      if (remain > 0) {
        const m = String(Math.floor(remain / 60000)).padStart(2, '0');
        const s = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
        checkinBtn.disabled = true;
        checkinBtn.classList.add('waiting');
        checkinBtn.textContent = `Chờ ${m}:${s} để kết thúc`;
        statusEl.textContent = `Đã bắt đầu lúc ${fmtTime(rec.start)} (tối thiểu 10 phút)`;
      } else {
        checkinBtn.disabled = false;
        checkinBtn.classList.add('ready-end');
        checkinBtn.textContent = 'Kết Thúc Học';
        statusEl.textContent = 'Đã đủ 10 phút — sẵn sàng chốt phiên!';
      }
    } else {
      checkinBtn.disabled = true;
      checkinBtn.classList.add('checked');
      checkinBtn.textContent = 'Đã Hoàn Thành ✓';
      sessionInfo.classList.remove('hidden');
      $('t-start').textContent = rec.start ? fmtTime(rec.start) : 'Học bù';
      $('t-end').textContent = rec.end ? fmtTime(rec.end) : '--:--';
      $('t-total').textContent = (rec.start && rec.end) ? fmtDuration(new Date(rec.end) - new Date(rec.start)) : 'Bù';
      statusEl.classList.add('done');
      statusEl.textContent = 'Đã chốt kỷ luật hôm nay!';
    }

    const { streak, total, monthPct } = Store.calcStats(history);
    $('stat-streak').textContent = streak;
    $('stat-total').textContent = total;
    $('stat-month').textContent = `${monthPct}%`;
  };

  const renderCalendar = () => {
    const { history } = Store.load();
    const todayKey = Store.toDateKey(new Date());
    const allKeys = Object.keys(history).sort();
    const firstKey = allKeys[0] || todayKey;

    $('cal-title').textContent = `Tháng ${calMonth + 1} / ${calYear}`;
    const grid = $('cal-grid');
    grid.innerHTML = '';

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const key = Store.toDateKey(dateObj);
      const rec = history[key];
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      if (rec && rec.type === 'makeup') {
        cell.classList.add('yellow');
        cell.onclick = () => { const st = Store.load(); delete st.history[key]; Store.save(st); renderCalendar(); renderHome(); };
      } else if (Store.isCompleted(rec)) {
        cell.classList.add('green');
      } else if (key < todayKey && key >= firstKey) {
        cell.classList.add('red');
        cell.onclick = () => { const st = Store.load(); st.history[key] = { type: 'makeup' }; Store.save(st); renderCalendar(); renderHome(); };
      }
      grid.appendChild(cell);
    }
  };

  checkinBtn.addEventListener('click', () => {
    const st = Store.load();
    const today = Store.toDateKey(new Date());
    const rec = st.history[today];
    if (!rec) {
      st.history[today] = { start: new Date().toISOString(), end: null, type: 'normal' };
    } else if (rec.start && !rec.end) {
      if (Date.now() - new Date(rec.start).getTime() < MIN_WAIT_MS) return;
      rec.end = new Date().toISOString();
    }
    Store.save(st);
    renderHome();
  });

  tabHome.addEventListener('click', () => {
    tabHome.classList.add('active'); tabHistory.classList.remove('active');
    viewHome.classList.remove('hidden'); viewHistory.classList.add('hidden');
    renderHome();
  });

  tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('active'); tabHome.classList.remove('active');
    viewHistory.classList.remove('hidden'); viewHome.classList.add('hidden');
    renderCalendar();
  });

  $('cal-prev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
  });
  $('cal-next').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
  });
  $('quote-card').addEventListener('click', setRandomQuote);

  setRandomQuote();
  renderHome();
  setInterval(renderHome, 1000);
})();
