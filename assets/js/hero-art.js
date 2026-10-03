/* The ASCII art in page headers (see ascii-art.js). Each page can have its own: change the table below.
     'day'              today's ruling planet (the Sun on Sunday, the Moon on Monday ...), spinning
     'planet:mars'      a given planet, spinning            (or just 'mars')
     'glyph:scorpio'    a glyph turning like a coin: any name in pixel-glyphs.js (planets, signs, north_node, the aspect symbols)
   A post shows its own topic's planet. Override one page's art in its markup with data-art="glyph:venus". The glow is the planet's essential dignity in its sign today. */
(function () {
  'use strict';
  var ART = {
    '/': 'day',
    '/weather/': 'glyph:moon', '/sky/': 'glyph:sun', '/forecast/': 'glyph:venus', '/birth-details/': 'glyph:north_node',
    '/readings/': 'glyph:saturn', '/book/': 'glyph:mars', '/booked/': 'glyph:jupiter', '/resources/': 'glyph:mercury', '/about/': 'glyph:pluto',
    tag: 'glyph:north_node', error: 'glyph:pluto', '*': 'day'
  };
  var S = window.AstroSky, A = window.AsciiArt, nodes = document.querySelectorAll('[data-ascii-art]');
  if (!S || !A || !nodes.length) return;
  function norm(p) { return p.replace(/(^|\/)(index|home)\.html$/, '/').replace(/\.html$/, '/').replace(/\/\/+/g, '/'); }
  function dignityOf(id) { if (!S.BY_ID[id]) return null; var p = S.positions(Date.now(), { dec: false }).filter(function (q) { return q.id === id; })[0]; return p ? S.dignity(id, p.sign) : null; }
  var path = norm(location.pathname), cls = document.body.className || '';
  Array.prototype.forEach.call(nodes, function (n) {
    var spec = n.getAttribute('data-art') || ART[path] || (cls.indexOf('tag-template') >= 0 && ART.tag) || (cls.indexOf('error-template') >= 0 && ART.error) || ART['*'];
    if (n.dataset.title && window.SkyTopic && !n.getAttribute('data-art')) {                     /* a post: its own topic's planet */
      var t = window.SkyTopic.detect({ title: n.dataset.title, tags: (n.dataset.tags || '').split('|').filter(Boolean), excerpt: n.dataset.excerpt || '' });
      spec = t.planet ? t.planet : t.kind === 'moon' ? 'moon' : 'day';
    }
    var id = spec === 'day' ? S.DAY_RULER[new Date().getDay()] : spec.replace(/^planet:/, '');
    A.mount(n, { id: id, dignity: dignityOf(id.replace(/^glyph:/, '')), cols: 54, rows: 26, every: 110 });
  });
})();
