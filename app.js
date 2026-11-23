(() => {
  const QUOTE_KEY = 'daily_checkin_last_quote';
  const MIN_WAIT_MS = 10 * 60 * 1000;
  const $ = (id) => document.getElementById(id);

  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const fmtDur = (ms) => {
    const m = Math.max(1, Math.round(ms / 60000));
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}p` : `${m} phút`;
  };

  const setQuote = () => {
    if (typeof QUOTES === 'undefined' || !QUOTES.length) return;
    const last = Number(localStorage.getItem(QUOTE_KEY));
    let idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); } while (QUOTES.length > 1 && idx === last);
    localStorage.setItem(QUOTE_KEY, String(idx));
    $('hero-title').textContent = QUOTES[idx];
  };

  const renderHome = () => {
    const now = new Date();
    const today = Store.toDateKey(now);
    const { history } = Store.load();
    const rec = history[today];
    const btn = $('checkin-btn'), info = $('session-info'), st = $('checkin-status');

    $('today-date').textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    btn.className = 'checkin-btn';
    st.className = 'checkin-status';

    if (!rec) {
      btn.disabled = false;
      btn.textContent = 'Bắt Đầu Học';
      info.classList.add('hidden');
      st.textContent = 'Chưa bắt đầu phiên hôm nay';
    } else if (rec.start && !rec.end) {
      info.classList.remove('hidden');
      $('t-start').textContent = fmtTime(rec.start);
      $('t-end').textContent = '--:--';
      $('t-total').textContent = 'Đang học...';
      const remain = MIN_WAIT_MS - (Date.now() - new Date(rec.start).getTime());
      if (remain > 0) {
        const m = String(Math.floor(remain / 60000)).padStart(2, '0');
        const s = String(Math.floor((remain % 60000) / 1000)).padStart(2, '0');
        btn.disabled = true;
        btn.classList.add('waiting');
        btn.textContent = `Chờ ${m}:${s} để kết thúc`;
        st.textContent = `Bắt đầu lúc ${fmtTime(rec.start)} (chạm đúp đây để hủy phiên)`;
      } else {
        btn.disabled = false;
        btn.classList.add('ready-end');
        btn.textContent = 'Kết Thúc Học';
        st.textContent = 'Đã đủ 10 phút — bấm để chốt phiên!';
      }
    } else {
      btn.disabled = true;
      btn.classList.add('checked');
      btn.textContent = 'Đã Hoàn Thành ✓';
      info.classList.remove('hidden');
      $('t-start').textContent = rec.start ? fmtTime(rec.start) : 'Học bù';
      $('t-end').textContent = rec.end ? fmtTime(rec.end) : '--:--';
      $('t-total').textContent = (rec.start && rec.end) ? fmtDur(new Date(rec.end) - new Date(rec.start)) : 'Bù';
      st.classList.add('done');
      st.textContent = 'Đã chốt kỷ luật hôm nay! (chạm đúp để làm lại)';
    }

    const { streak, total, monthPct } = Store.calcStats(history);
    $('stat-streak').textContent = streak;
    $('stat-total').textContent = total;
    $('stat-month').textContent = `${monthPct}%`;
  };

  const renderCal = () => {
    const { history } = Store.load();
    const todayKey = Store.toDateKey(new Date());
    const firstKey = Object.keys(history).sort()[0] || todayKey;
    $('cal-title').textContent = `Tháng ${calMonth + 1} / ${calYear}`;
    const grid = $('cal-grid');
    grid.innerHTML = '';
    const offset = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
    const days = new Date(calYear, calMonth + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.insertAdjacentHTML('beforeend', '<div class="cal-day empty"></div>');
    for (let d = 1; d <= days; d++) {
      const key = Store.toDateKey(new Date(calYear, calMonth, d));
      const rec = history[key];
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;
      if (rec && rec.type === 'makeup') {
        cell.classList.add('yellow');
        cell.onclick = () => { const s = Store.load(); delete s.history[key]; Store.save(s); renderCal(); renderHome(); };
      } else if (Store.isCompleted(rec)) {
        cell.classList.add('green');
      } else if (key < todayKey && key >= firstKey) {
        cell.classList.add('red');
        cell.onclick = () => { const s = Store.load(); s.history[key] = { type: 'makeup' }; Store.save(s); renderCal(); renderHome(); };
      }
      grid.appendChild(cell);
    }
  };

  $('checkin-btn').addEventListener('click', () => {
    const s = Store.load();
    const today = Store.toDateKey(new Date());
    const rec = s.history[today];
    if (!rec) {
      s.history[today] = { start: new Date().toISOString(), end: null, type: 'normal' };
    } else if (rec.start && !rec.end && Date.now() - new Date(rec.start).getTime() >= MIN_WAIT_MS) {
      rec.end = new Date().toISOString();
    }
    Store.save(s);
    renderHome();
  });

  $('checkin-status').addEventListener('dblclick', () => {
    const s = Store.load();
    delete s.history[Store.toDateKey(new Date())];
    Store.save(s);
    renderHome();
  });

  $('tab-home').addEventListener('click', () => {
    $('tab-home').classList.add('active'); $('tab-history').classList.remove('active');
    $('view-home').classList.remove('hidden'); $('view-history').classList.add('hidden');
    renderHome();
  });
  $('tab-history').addEventListener('click', () => {
    $('tab-history').classList.add('active'); $('tab-home').classList.remove('active');
    $('view-history').classList.remove('hidden'); $('view-home').classList.add('hidden');
    renderCal();
  });
  $('cal-prev').addEventListener('click', () => { if (--calMonth < 0) { calMonth = 11; calYear--; } renderCal(); });
  $('cal-next').addEventListener('click', () => { if (++calMonth > 11) { calMonth = 0; calYear++; } renderCal(); });
  $('quote-card').addEventListener('click', setQuote);

  setQuote();
  renderHome();
  setInterval(renderHome, 1000);
})();
