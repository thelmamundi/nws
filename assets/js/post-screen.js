/* Teletext screen for posts: reads the post's data attributes, routes to the right sky facts, and draws the page (see sky-topic.js, teletext.js). */
(function () {
  'use strict';
  var nodes = document.querySelectorAll('[data-teletext]');
  if (!nodes.length || !window.Teletext || !window.SkyTopic || !window.AstroSky) return;
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function plain(str) {                                           /* astro glyphs in the excerpt become words, since teletext text has no such characters */
    var PG = window.PixelGlyphs; if (!PG) return str;
    return str.replace(/[☉☽☿♀♂♃♄♅♆♇♈-♓]︎?/g, function (c) { var n = PG.nameFor(c); return n ? n.toUpperCase().replace('_', ' ') : ''; });
  }
  window.Teletext.ready().then(function () {
    Array.prototype.forEach.call(nodes, function (n) {
      var cv = n.querySelector('canvas'), d = n.dataset, ms = Date.parse(d.published) || Date.now(), tags = (d.tags || '').split('|').filter(Boolean),
          topic = window.SkyTopic.detect({ title: d.title, tags: tags, excerpt: d.excerpt }), f = window.SkyTopic.facts(topic, ms, Date.now());
      window.Teletext.render(cv, { page: 'P' + (100 + hash(d.slug || d.title) % 800), brand: 'WEATHERGIRL', kicker: d.kicker || '', head: f.head, glyphs: f.glyphs, rows: f.rows, lines: f.lines, excerpt: '', published: f.published, clock: true, pitch: 4 });
      var txt = f.head + '. ' + f.lines.map(function (l) { return l[1].trim(); }).join('. ') + '. Sky published ' + f.published + '.';
      cv.setAttribute('aria-label', 'Teletext screen. ' + txt); var sr = n.querySelector('.tt-sr'); if (sr) sr.textContent = txt;
    });
  });
})();
