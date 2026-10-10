/* Stream overlay controls come from the address, so OBS needs no editing:
     overlay.html?scene=live|starting|brb|ending   &title=My+Stream  &sub=Tarot+night  &mins=10 (or &until=21:00)  &theme=legend  &cam=0 (hide the cam frame)
   OBS: Browser source, 1920 x 1080, "Shutdown source when not visible" off. */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search), h = (location.hash || '').replace('#', '').split('&')[0], root = document.documentElement, stage = document.getElementById('stage');
  var scene = q.get('scene') || (/^(starting|brb|ending)$/.test(h) ? h : 'live');
  root.setAttribute('data-scene', scene === 'live' ? 'live' : 'card'); if (q.get('cam') === '0') root.setAttribute('data-cam', '0');
  var T = { starting: 'STARTING SOON', brb: 'BE RIGHT BACK', ending: 'THANKS FOR WATCHING', live: '' };
  function set(id, v) { var n = document.getElementById(id); if (n) n.textContent = v; }
  var title = q.get('title') || 'The sky, live';
  set('ov-h1', title); set('ov-big', T[scene] || T.starting); set('ov-sub', q.get('sub') || title);
  var tm = q.get('theme'); if (tm && window.Nws) window.Nws.setTheme(tm);
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var end = null;
  if (q.get('mins')) end = Date.now() + parseFloat(q.get('mins')) * 60000;
  else if (q.get('until')) { var m = /^(\d{1,2}):(\d{2})$/.exec(q.get('until')); if (m) { var d = new Date(); d.setHours(+m[1], +m[2], 0, 0); if (d < Date.now()) d.setDate(d.getDate() + 1); end = +d; } }
  function tick() {
    var d = new Date(), D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    set('ov-time', pad(d.getHours()) + ':' + pad(d.getMinutes())); set('ov-date', D[d.getDay()] + ' ' + M[d.getMonth()] + ' ' + d.getDate());
    var c = document.getElementById('ov-count');
    if (end) { var s = Math.max(0, Math.round((end - Date.now()) / 1000)); c.textContent = s ? pad(Math.floor(s / 60)) + ':' + pad(s % 60) : '...'; } else c.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  tick(); setInterval(tick, 1000);
  function fit() { var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080); stage.style.transform = 'scale(' + s + ')'; }
  window.addEventListener('resize', fit); fit();
})();
