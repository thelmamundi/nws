/* Dashboard: clock, colour picker, and fit-to-screen. Add #bare to the address (or ?bare) to hide the top bar, for wallpapers. */
(function () {
  'use strict';
  var stage = document.getElementById('stage'), cols = document.getElementById('db-cols'), GAP = 16, PAD = 16;
  if (/bare/.test(location.hash + location.search)) document.documentElement.classList.add('bare');
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
  /* try 2..12 columns at several column widths; keep the layout whose scaled stage is biggest while still fitting the window */
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight, best = null, n, cw, W, H, s;
    stage.style.transform = 'none';
    for (cw = 360; cw <= 480; cw += 20) for (n = 2; n <= 12; n++) {
      W = n * cw + (n - 1) * GAP + PAD * 2; stage.style.width = W + 'px'; cols.style.columnCount = n;
      H = stage.offsetHeight; s = Math.min(vw / W, vh / H);
      if (!best || s > best.s + 0.002) best = { n: n, W: W, s: s };
    }
    stage.style.width = best.W + 'px'; cols.style.columnCount = best.n;
    H = stage.offsetHeight; s = Math.min(vw / best.W, vh / H);
    stage.style.transform = 'translate(' + Math.max(0, (vw - best.W * s) / 2) + 'px,' + Math.max(0, (vh - H * s) / 2) + 'px) scale(' + s + ')';
  }
  var t = null; function later() { clearTimeout(t); t = setTimeout(fit, 150); }
  window.addEventListener('resize', later); window.addEventListener('themechange', later);
  document.addEventListener('aw98:ready', later); window.addEventListener('load', later);
  setInterval(fit, 60000); fit();
})();
