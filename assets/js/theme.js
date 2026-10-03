/* Colour schemes: dos (default), bios, phosphor (void glow), amber (void glow), paper, pop (y2k pink).
   No buttons on the page. Pick from the Start menu > Colors or type THEME <name> in the console.
   A tiny inline script in each <head> applies the saved scheme before first paint. */
(function () {
  'use strict';
  var root = document.documentElement, NAMES = ['dos', 'bios', 'phosphor', 'amber', 'paper', 'pop'], VOID = { phosphor: 1, amber: 1 };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bg() { if (document.body) document.body.setAttribute('data-bg', VOID[root.getAttribute('data-theme')] ? 'on' : 'off'); }
  function setTheme(t) {
    if (t === 'green') t = 'phosphor'; if (t === 'pink') t = 'pop';
    if (NAMES.indexOf(t) < 0) return false;
    root.setAttribute('data-theme', t); bg();
    try { localStorage.setItem('nws-theme', t); } catch (e) { /* private mode */ }
    window.dispatchEvent(new Event('themechange')); return true;
  }
  /* CRT scanlines: off by default; the CRT badge in the left rail toggles them */
  function crtLabel() { var on = root.classList.contains('crt'); [].forEach.call(document.querySelectorAll('.crt-toggle'), function (b) { b.innerHTML = 'CRT<br>' + (on ? 'ON' : 'OFF'); b.setAttribute('aria-pressed', on); }); }
  function setCrt(on) { root.classList.toggle('crt', on); try { localStorage.setItem('nws-crt', on ? '1' : '0'); } catch (e) { /* private mode */ } crtLabel(); }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('.crt-toggle'); if (c) { setCrt(!root.classList.contains('crt')); return; }
    var b = e.target.closest && e.target.closest('[data-theme-set]'); if (!b) return;
    e.preventDefault(); setTheme(b.getAttribute('data-theme-set'));
  });
  /* pink pop: a little sparkle trail behind the cursor */
  var last = 0;
  document.addEventListener('pointermove', function (e) {
    if (REDUCED || root.getAttribute('data-theme') !== 'pop' || e.pointerType === 'touch') return;
    var now = Date.now(); if (now - last < 60) return; last = now;
    var s = document.createElement('span'); s.className = 'sparkle';
    s.style.left = (e.clientX + Math.random() * 10 - 5) + 'px'; s.style.top = (e.clientY + Math.random() * 10 - 5) + 'px'; s.style.color = ['#ffffff', '#fff36b', '#6fffd2', '#ff2fa8'][Math.floor(Math.random() * 4)];
    document.body.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 800);
  });
  function ready() { bg(); crtLabel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.addEventListener('load', bg);
  window.Nws = { setTheme: setTheme, setCrt: setCrt, themes: NAMES };
})();
