/* Colour schemes: dos (default), bios, phosphor (void glow), amber (void glow), paper, legend (LITERAL LEGEND).
   No buttons on the page. Pick from the Start menu > Colors or type THEME <name> in the console.
   A tiny inline script in each <head> applies the saved scheme before first paint. */
(function () {
  'use strict';
  var root = document.documentElement, NAMES = ['dos', 'bios', 'phosphor', 'amber', 'paper', 'legend'], VOID = { phosphor: 1, amber: 1 };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bg() { if (document.body) document.body.setAttribute('data-bg', VOID[root.getAttribute('data-theme')] ? 'on' : 'off'); }
  function setTheme(t) {
    if (t === 'green') t = 'phosphor'; if (t === 'pink' || t === 'pop' || t === 'literal' || t === 'll') t = 'legend';
    if (NAMES.indexOf(t) < 0) return false;
    root.setAttribute('data-theme', t); bg();
    try { localStorage.setItem('nws-theme', t); } catch (e) { /* private mode */ }
    badgeLabel(); window.dispatchEvent(new Event('themechange')); return true;
  }
  /* Effects are opt-in. The badge in the left rail is CRT (scanlines) on most schemes and GLOW on the void schemes. */
  function isVoid() { return !!VOID[root.getAttribute('data-theme')]; }
  function badgeLabel() {
    var v = isVoid(), on = root.classList.contains(v ? 'glow' : 'crt');
    [].forEach.call(document.querySelectorAll('.crt-toggle'), function (b) { b.innerHTML = (v ? 'GLOW' : 'CRT') + '<br>' + (on ? 'ON' : 'OFF'); b.setAttribute('aria-pressed', on); });
  }
  function setFx(kind, on) { root.classList.toggle(kind, on); try { localStorage.setItem('nws-' + kind, on ? '1' : '0'); } catch (e) { /* private mode */ } badgeLabel(); }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('.crt-toggle'); if (c) { var k = isVoid() ? 'glow' : 'crt'; setFx(k, !root.classList.contains(k)); return; }
    var b = e.target.closest && e.target.closest('[data-theme-set]'); if (!b) return;
    e.preventDefault(); setTheme(b.getAttribute('data-theme-set'));
  });
  /* LITERAL LEGEND: a little pixel sparkle trail behind the cursor */
  var last = 0;
  document.addEventListener('pointermove', function (e) {
    if (REDUCED || root.getAttribute('data-theme') !== 'legend' || e.pointerType === 'touch') return;
    var now = Date.now(); if (now - last < 60) return; last = now;
    var s = document.createElement('span'); s.className = 'sparkle';
    s.style.left = (e.clientX + Math.random() * 10 - 5) + 'px'; s.style.top = (e.clientY + Math.random() * 10 - 5) + 'px'; s.style.color = ['#ffffff', '#ffff00', '#00ffff', '#ff00ff'][Math.floor(Math.random() * 4)];
    document.body.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 800);
  });
  function ready() { bg(); badgeLabel(); }
  /* Dogica (the Literal Legend page's pixel font): switches on only if the font is installed or assets/fonts/dogica.ttf exists */
  try { if (document.fonts && document.fonts.load) document.fonts.load('16px dogica').then(function () { if (document.fonts.check('16px dogica')) root.classList.add('dogica'); }); } catch (e) { /* ignore */ }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clocks() { var d = new Date(), t = pad(d.getHours()) + ':' + pad(d.getMinutes()); [].forEach.call(document.querySelectorAll('[data-clock]'), function (n) { n.textContent = t; }); }
  setInterval(clocks, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ready(); clocks(); }); else ready();
  window.addEventListener('load', bg);
  window.Nws = { setTheme: setTheme, setFx: setFx, themes: NAMES };
})();
