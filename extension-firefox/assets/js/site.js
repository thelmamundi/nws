/* ═══════════════════════════════════════════════════════════
   SITE CHROME: Start menu, window minimize + taskbar buttons,
   visit odometer, mailing-list form. No tracking, no network
   calls except the subscribe form posting to Ghost itself.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document;

  /* ── DOMAIN CHIP: with no label set in Design settings, show this site's own address ── */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-host]'), function (n) { if (location.hostname) n.textContent = location.hostname.replace(/^www\./, '').toUpperCase(); });

  /* ── DAY GLYPH: the classical ruler of today's weekday next to headings (Sun=Sun, Mon=Moon, Tue=Mars ...) ── */
  var DAY_GLYPH = ['\u2609', '\u263D', '\u2642', '\u263F', '\u2643', '\u2640', '\u2644'], DAY_NAME = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  var dow = new Date().getDay(), PGL = window.PixelGlyphs;
  Array.prototype.forEach.call(doc.querySelectorAll('.aw-day-glyph'), function (el) { if (PGL && PGL.has(DAY_NAME[dow])) el.innerHTML = PGL.svg(DAY_NAME[dow]); else el.textContent = DAY_GLYPH[dow] + '\uFE0E'; });
  if (PGL) PGL.fill(doc);

  /* ── ARCHIVE: hide rows that already appear as home tiles ── */
  var tileLinks = {};
  Array.prototype.forEach.call(doc.querySelectorAll('.tri .tile-link'), function (a) { tileLinks[a.getAttribute('href')] = 1; });
  Array.prototype.forEach.call(doc.querySelectorAll('.rows .row'), function (r) { var a = r.querySelector('.row-link'); if (a && tileLinks[a.getAttribute('href')]) r.hidden = true; });

  /* ── START MENU ── */
  var btn = doc.getElementById('start-btn'), menu = doc.getElementById('start-menu');
  function setMenu(open) {
    if (!btn || !menu) return;
    menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  }
  if (btn && menu) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(menu.hidden); });
    doc.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
  }

  /* ── MINIMIZE / RESTORE (title bar "_" button or double-click the title) ── */
  var tasks = doc.getElementById('tasks'), minimized = [];
  function title(win) { var n = win.querySelector('.win-name'); return n ? n.textContent.trim() : 'Window'; }
  function minimize(win) {
    if (win.classList.contains('is-min')) { restore(win); return; }
    win.classList.add('is-min');
    var b = doc.createElement('button'); b.type = 'button'; b.textContent = title(win); b.title = 'Restore ' + title(win);
    b.addEventListener('click', function () { restore(win); });
    if (tasks) tasks.appendChild(b);
    minimized.push({ win: win, btn: b });
  }
  function restore(win) {
    win.classList.remove('is-min');
    minimized = minimized.filter(function (m) { if (m.win === win) { if (m.btn.parentNode) m.btn.parentNode.removeChild(m.btn); return false; } return true; });
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.wb-min'); if (!b) return;
    var win = b.closest('.win'); if (win) minimize(win);
  });
  doc.addEventListener('dblclick', function (e) {
    var t = e.target.closest && e.target.closest('.win-title'); if (!t) return;
    var win = t.closest('.win'); if (win && win.querySelector('.wb-min')) minimize(win);
  });

  /* ── ODOMETER: counts visits from this browser (once per session) ── */
  var odo = doc.getElementById('odometer');
  if (odo) {
    var n = 1;
    try {
      n = parseInt(localStorage.getItem('aw98_visits') || '0', 10) || 0;
      if (!sessionStorage.getItem('aw98_counted')) { n += 1; localStorage.setItem('aw98_visits', String(n)); sessionStorage.setItem('aw98_counted', '1'); }
      if (n < 1) n = 1;
    } catch (e) { n = 1; }
    odo.textContent = ('000000' + n).slice(-6);
  }

  /* ── MAILING LIST: Ghost members magic link ── */
  qsa('form.subscribe').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]'), b = form.querySelector('button'), msg = form.parentNode.querySelector('.subscribe-msg');
      var email = input && input.value.trim(); if (!email) return;
      if (b) { b.disabled = true; b.textContent = 'Sending...'; }
      fetch('/members/api/send-magic-link/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, emailType: 'subscribe' }) })
        .then(function (res) { if (!res.ok) throw new Error('bad status'); if (msg) msg.textContent = '✔ Check your inbox: your signup link is on the way.'; if (input) input.value = ''; if (b) b.textContent = 'Sent'; })
        .catch(function () { if (msg) msg.textContent = 'Something went wrong. Try again in a moment.'; if (b) { b.disabled = false; b.textContent = 'Subscribe'; } });
    });
  });
  function qsa(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
})();
