/* Colour schemes: dos (default), bios, phosphor, amber, paper.
   No buttons on the page. Pick from the Start menu or type THEME <name> in the console.
   A tiny inline script in each <head> applies the saved scheme before first paint. */
(function () {
  'use strict';
  var root = document.documentElement, NAMES = ['dos', 'bios', 'phosphor', 'amber', 'paper'];
  function setTheme(t) {
    if (t === 'green') t = 'phosphor';
    if (NAMES.indexOf(t) < 0) return false;
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('nws-theme', t); } catch (e) { /* private mode */ }
    window.dispatchEvent(new Event('themechange')); return true;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set]'); if (!b) return;
    e.preventDefault(); setTheme(b.getAttribute('data-theme-set'));
  });
  window.Nws = { setTheme: setTheme, themes: NAMES };
})();
