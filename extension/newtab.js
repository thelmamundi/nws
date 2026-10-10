/* New-tab dashboard: clock, search, colour picker, and which gadgets show (saved in this browser). Gadget order: drag the title bar. */
(function () {
  'use strict';
  var KEY = 'nwsnt-gadgets', ORDER = 'nwsnt-order', grid = document.getElementById('nt-grid'), picker = document.getElementById('nt-picker');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var d = new Date(), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    document.getElementById('nt-time').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    document.getElementById('nt-date').textContent = D[d.getDay()] + ' ' + M[d.getMonth()] + ' ' + d.getDate();
  }
  tick(); setInterval(tick, 5000);
  var sel = document.getElementById('nt-theme');
  sel.value = document.documentElement.getAttribute('data-theme') || 'dos';
  sel.addEventListener('change', function () { if (window.Nws) window.Nws.setTheme(sel.value); });
  var cards = [].slice.call(grid.querySelectorAll('[data-widget]'));
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v || d; } catch (e) { return d; } }
  var on = load(KEY, null) || cards.filter(function (c) { return c.getAttribute('data-default') !== '0'; }).map(function (c) { return c.getAttribute('data-widget'); });
  function apply() { cards.forEach(function (c) { c.hidden = on.indexOf(c.getAttribute('data-widget')) < 0; }); [].forEach.call(picker.querySelectorAll('input'), function (i) { i.checked = on.indexOf(i.value) >= 0; }); }
  var ord = load(ORDER, null);
  if (ord) ord.forEach(function (n) { var c = grid.querySelector('[data-widget="' + n + '"]'); if (c) grid.appendChild(c); });
  apply();
  picker.addEventListener('change', function (e) {
    var i = e.target; if (!i.value) return;
    on = on.filter(function (n) { return n !== i.value; }); if (i.checked) on.push(i.value);
    try { localStorage.setItem(KEY, JSON.stringify(on)); } catch (x) { /* storage blocked */ } apply();
  });
  var btn = document.getElementById('nt-edit');
  btn.addEventListener('click', function () { var open = picker.hidden; picker.hidden = !open; btn.setAttribute('aria-expanded', open); });
  /* drag a gadget by its title bar to reorder */
  var drag = null;
  grid.addEventListener('dragstart', function (e) { var w = e.target.closest && e.target.closest('[data-widget]'); if (!w) return; drag = w; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', w.getAttribute('data-widget')); } catch (x) { /* ignore */ } });
  grid.addEventListener('dragover', function (e) { if (drag) e.preventDefault(); });
  grid.addEventListener('drop', function (e) {
    var t = e.target.closest && e.target.closest('[data-widget]'); if (!drag || !t || t === drag) return; e.preventDefault();
    var r = t.getBoundingClientRect(), after = (e.clientY - r.top) > r.height / 2 && (e.clientX - r.left) > r.width / 2;
    grid.insertBefore(drag, after ? t.nextSibling : t);
    try { localStorage.setItem(ORDER, JSON.stringify([].map.call(grid.querySelectorAll('[data-widget]'), function (c) { return c.getAttribute('data-widget'); }))); } catch (x) { /* ignore */ }
    drag = null;
  });
  [].forEach.call(grid.querySelectorAll('.win-title'), function (t) { t.setAttribute('draggable', 'true'); t.style.cursor = 'grab'; });
})();
