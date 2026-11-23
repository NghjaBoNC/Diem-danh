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
  const fmtTotalMins = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}p` : `${m} phút`;

  const getGreeting = (h) => h < 5 ? 'Khuya rồi' : h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const getRank = (streak) => {
    if (streak < 7) return { name: 'Tập Sự', next: 7 };
    if (streak < 14) return { name: 'Kỷ Luật Thép', next: 14 };
    if (streak < 30) return { name: 'Chiến Binh Thức Đêm', next: 30 };
    return { name: 'Bất Bại', next: 60 };
  };

  const getAllQuotes = () => [...(typeof QUOTES !== 'undefined' ? QUOTES : []), ...Store.load().customQuotes];

  const setQuote = (animate = false) => {
    const list = getAllQuotes();
    if (!list.length) return;
    const last = Number(localStorage.getItem(QUOTE_KEY));
    let idx;
    do { idx = Math.floor(Math.random() * list.length); } while (list.length > 1 && idx === last);
    localStorage.setItem(QUOTE_KEY, String(idx));
    const el = $('hero-title');
    if (animate) {
      el.classList.add('fade');
      setTimeout(() => { el.textContent = list[idx]; el.classList.remove('fade'); }, 150);
    } else {
      el.textContent = list[idx];
    }
  };

  const renderWeekStrip = (history, todayKey) => {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIdx);

    const wrap = $('week-strip');
    wrap.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = Store.toDateKey(d);
      const rec = history[key];
      let cls = 'w-dot';
      if (rec && rec.type === 'makeup') cls += ' makeup';
      else if (Store.isCompleted(rec)) cls += ' done';
      if (key === todayKey) cls += ' today';
      wrap.insertAdjacentHTML('beforeend', `<div class="w-day"><span>${labels[i]}</span><div class="${cls}">${d.getDate()}</div></div>`);
    }
  };

  const renderRecent = (history, todayKey) => {
    const prevKeys = Object.keys(history).filter((k) => k < todayKey && Store.isCompleted(history[k])).sort();
    const lastKey = prevKeys[prevKeys.length - 1];
    const el = $('recent-text');
    if (!lastKey) { el.textContent = 'Bắt đầu chuỗi kỷ luật từ hôm nay'; return; }
    const rec = history[lastKey];
    const [, m, d] = lastKey.split('-');
    const noteSuffix = rec.note ? ` · ${rec.note}` : '';
    if (rec.type === 'makeup') el.textContent = `${d}/${m} · Học bù${noteSuffix}`;
    else if (rec.start && rec.end) el.textContent = `${d}/${m} · ${fmtDur(new Date(rec.end) - new Date(rec.start))}${noteSuffix}`;
    else el.textContent = `${d}/${m} · Hoàn thành${noteSuffix}`;
  };

  const renderHome = () => {
    const now = new Date();
    const today = Store.toDateKey(now);
    const state = Store.load();
    const { history, targets } = state;
    const rec = history[today];
    const btn = $('checkin-btn'), info = $('session-info'), st = $('checkin-status');

    $('greeting-text').textContent = `${getGreeting(now.getHours())}, Nghĩa`;
    $('today-date').textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const tObj = targets[today] || { text: '', done: false };
    if (document.activeElement !== $('target-input')) $('target-input').value = tObj.text;
    $('target-input').classList.toggle('checked', Boolean(tObj.done));
    $('target-check').classList.toggle('checked', Boolean(tObj.done));
    $('target-check').textContent = tObj.done ? '✓' : '';

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
        st.textContent = `Bắt đầu ${fmtTime(rec.start)} (chạm đúp để hủy)`;
      } else {
        btn.disabled = false;
        btn.classList.add('ready-end');
        btn.textContent = 'Kết Thúc Học';
        st.textContent = 'Đã đủ 10 phút — bấm để chốt phiên!';
      }
    } else {
      btn.disabled = true;
      btn.classList.add('checked');
      btn.textContent = 'Đã Hoàn Thành';
      info.classList.remove('hidden');
      $('t-start').textContent = rec.start ? fmtTime(rec.start) : 'Học bù';
      $('t-end').textContent = rec.end ? fmtTime(rec.end) : '--:--';
      $('t-total').textContent = (rec.start && rec.end) ? fmtDur(new Date(rec.end) - new Date(rec.start)) : 'Bù';
      st.classList.add('done');
      st.textContent = rec.note ? `✓ ${rec.note}` : '✓ Đã chốt kỷ luật hôm nay!';
    }

    const { streak, bestStreak, total } = Store.calcStats(history);
    $('stat-streak').textContent = streak;
    $('stat-total').textContent = total;
    $('stat-best').textContent = bestStreak;

    const rk = getRank(streak);
    $('rank-name').textContent = `Hạng: ${rk.name}`;
    $('rank-next').textContent = `${streak} / ${rk.next} ngày`;
    $('rank-fill').style.width = `${Math.min(100, Math.round((streak / rk.next) * 100))}%`;

    renderWeekStrip(history, today);
    renderRecent(history, today);
  };

  const renderCal = () => {
    const { history } = Store.load();
    const todayKey = Store.toDateKey(new Date());
    const firstKey = Object.keys(history).sort()[0] || todayKey;
    $('cal-title').textContent = `Tháng ${calMonth + 1} / ${calYear}`;
    $('total-hours').textContent = fmtTotalMins(Store.calcStats(history).totalMins);
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
        cell.onclick = () => {
          $('day-detail').innerHTML = `Ngày ${d}/${calMonth + 1}: Đã đánh dấu học bù · <u id="undo-mk">Hủy bù</u>`;
          $('undo-mk').onclick = () => { const s = Store.load(); delete s.history[key]; Store.save(s); renderCal(); renderHome(); };
        };
      } else if (Store.isCompleted(rec)) {
        cell.classList.add('green');
        cell.onclick = () => {
          const timeInfo = (rec.start && rec.end) ? `${fmtTime(rec.start)}–${fmtTime(rec.end)} (${fmtDur(new Date(rec.end) - new Date(rec.start))})` : 'Đã hoàn thành';
          $('day-detail').textContent = `Ngày ${d}/${calMonth + 1}: ${timeInfo}${rec.note ? ' · ' + rec.note : ''}`;
        };
      } else if (key < todayKey && key >= firstKey) {
        cell.classList.add('red');
        cell.onclick = () => { const s = Store.load(); s.history[key] = { type: 'makeup' }; Store.save(s); renderCal(); renderHome(); };
      }
      grid.appendChild(cell);
    }
  };

  const finishSession = (noteText) => {
    const s = Store.load();
    const today = Store.toDateKey(new Date());
    if (s.history[today] && s.history[today].start && !s.history[today].end) {
      s.history[today].end = new Date().toISOString();
      s.history[today].note = noteText.trim();
      Store.save(s);
    }
    $('note-modal').classList.add('hidden');
    $('session-note-input').value = '';
    renderHome();
  };

  $('checkin-btn').addEventListener('click', () => {
    const s = Store.load();
    const today = Store.toDateKey(new Date());
    const rec = s.history[today];
    if (!rec) {
      s.history[today] = { start: new Date().toISOString(), end: null, type: 'normal', note: '' };
      Store.save(s);
      renderHome();
    } else if (rec.start && !rec.end && Date.now() - new Date(rec.start).getTime() >= MIN_WAIT_MS) {
      $('note-modal').classList.remove('hidden');
    }
  });

  $('note-save').addEventListener('click', () => finishSession($('session-note-input').value));
  $('note-skip').addEventListener('click', () => finishSession(''));

  $('target-input').addEventListener('change', (e) => {
    const s = Store.load();
    const today = Store.toDateKey(new Date());
    s.targets[today] = { ...(s.targets[today] || {}), text: e.target.value.trim() };
    Store.save(s);
    renderHome();
  });

  $('target-check').addEventListener('click', () => {
    const s = Store.load();
    const today = Store.toDateKey(new Date());
    const cur = s.targets[today] || { text: $('target-input').value.trim(), done: false };
    s.targets[today] = { ...cur, done: !cur.done };
    Store.save(s);
    renderHome();
  });

  $('user-badge').addEventListener('click', () => {
    $('backup-box').value = '';
    $('profile-modal').classList.remove('hidden');
  });
  $('close-profile').addEventListener('click', () => $('profile-modal').classList.add('hidden'));

  $('add-quote-btn').addEventListener('click', () => {
    const txt = $('new-quote-input').value.trim();
    if (!txt) return;
    const s = Store.load();
    s.customQuotes.push(txt);
    Store.save(s);
    $('new-quote-input').value = '';
    $('hero-title').textContent = txt;
    $('profile-modal').classList.add('hidden');
  });

  $('export-btn').addEventListener('click', () => {
    const code = JSON.stringify(Store.load());
    $('backup-box').value = code;
    navigator.clipboard?.writeText(code);
    $('export-btn').textContent = 'Đã Copy ✓';
    setTimeout(() => ($('export-btn').textContent = 'Xuất & Copy'), 1500);
  });

  $('import-btn').addEventListener('click', () => {
    try {
      const parsed = JSON.parse($('backup-box').value.trim());
      if (!parsed || typeof parsed !== 'object' || !parsed.history) throw new Error();
      Store.save(parsed);
      $('profile-modal').classList.add('hidden');
      renderHome();
    } catch { alert('Mã sao lưu không hợp lệ!'); }
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
  $('quote-card').addEventListener('click', () => setQuote(true));

  setQuote(false);
  renderHome();
  setInterval(renderHome, 1000);
})();
