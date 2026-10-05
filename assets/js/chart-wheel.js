/* ═══════════════════════════════════════════════════════════
   CHART WHEEL: current-sky and transit wheels, drawn pixel by pixel.
   Windows 98 mechanics, not Windows 98 windows: a silver body with raised and sunken bevels (light from the top left),
   solid theme colour in the sign ring and on the planet buttons, and a fine pixel grid (1.5 px cells on screen).
   No dither. Every theme has its own SKIN (colour, marker shape, hub), picked from <html data-theme>.
   Glyphs are 32 px on screen.

     NwsChart.draw(canvas, { asc, outer: [{ id, lon, retro }], inner: [...] | null, aspects: [{ a, b, type, orb }] })
       lon / asc are ecliptic degrees. inner = the natal ring of a transit (bi) wheel.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PG = window.PixelGlyphs, N = 336, C = N / 2, RAD = Math.PI / 180, GL = 21;           /* 336 cells shown at 504 px = 1.5 px per cell; 21 cells = 32 px */
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }

  /* ── skins: silver body, theme colour ── */
  var SILVER = { face: '#c0c0c0', hi: '#ffffff', lo: '#808080', dk: '#202020', line: '#000000' };
  var SKINS = {
    dos:      { desk: '#008080', well: '#ffffff', ring: ['#800000', '#008000', '#000080', '#008080'], glyph: '#ffffff', mk: 'square',  mkInk: ['#800000', '#000080', '#800080', '#000000'], hard: '#c00000', soft: '#0000ff', conj: '#000080', hub: 'sun' },
    bios:     { desk: '#0000aa', well: '#d8d8f4', ring: ['#0000aa', '#0044cc', '#000080', '#0066aa'], glyph: '#ffff55', mk: 'square',  mkInk: ['#0000aa', '#000080', '#0044cc', '#000000'], hard: '#c00000', soft: '#0000aa', conj: '#000080', hub: 'box' },
    phosphor: { desk: '#000000', well: '#dff0df', ring: ['#0a4a1a', '#0f6a26', '#14862f', '#1fa63c'], glyph: '#e8ffe8', mk: 'circle',  mkInk: ['#0a4a1a', '#14862f', '#0f6a26', '#000000'], hard: '#0a5a1f', soft: '#1fa63c', conj: '#0a4a1a', hub: 'ring' },
    amber:    { desk: '#000000', well: '#f4e8d0', ring: ['#6a3c00', '#8a5000', '#a86a00', '#c88a00'], glyph: '#fff0cc', mk: 'diamond', mkInk: ['#6a3c00', '#a86a00', '#8a5000', '#000000'], hard: '#8a4a00', soft: '#d09020', conj: '#6a3c00', hub: 'ring' },
    paper:    { desk: '#f1ecdc', well: '#fffaf0', ring: ['#2b2f8f', '#12155e', '#4a4fb0', '#0b6f86'], glyph: '#fffaf0', mk: 'circle',  mkInk: ['#c1272d', '#2b2f8f', '#12155e', '#0b6f86'], hard: '#c1272d', soft: '#0b6f86', conj: '#12155e', hub: 'cross' },
    legend:   { desk: null, well: null, dim: '#ff9ac8', ring: ['#7a0a58', '#c0105f', '#ff3f8e', '#ff7ab5'], glyph: '#ffffff', mk: 'square',  mkInk: ['#7a0a58', '#2a4fd6', '#7a0a58', '#580034'], hard: '#ff3f8e', soft: '#8fd0ff', conj: '#ffffff', hub: 'heart' }
  };
  Object.keys(SKINS).forEach(function (k) {
    var s = SKINS[k], key;
    for (key in SILVER) s[key] = SILVER[key];
    ['face', 'hi', 'lo', 'dk', 'line', 'desk', 'well', 'dim', 'glyph', 'hard', 'soft', 'conj'].forEach(function (p) { if (s[p]) s[p] = hex(s[p]); });
    s.ring = s.ring.map(hex); s.mkInk = s.mkInk.map(hex);
  });
  function skin() { return SKINS[document.documentElement.getAttribute('data-theme')] || SKINS.dos; }

  /* ── glyph bitmaps: the pixel-glyph rects thresholded to n x n on/off ── */
  var GB = {};
  function glyph(name, n) {
    var key = name + n; if (GB[key]) return GB[key];
    var out = new Uint8Array(n * n), r = PG && PG.rects(name); if (!r) return (GB[key] = out);
    var S = PG.size, src = new Uint8Array(S * S), i, j, x, y;
    r.forEach(function (q) { for (y = q[1]; y < q[1] + q[3]; y++) for (x = q[0]; x < q[0] + q[2]; x++) src[y * S + x] = 1; });
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var x0 = Math.floor(x * S / n), x1 = Math.ceil((x + 1) * S / n), y0 = Math.floor(y * S / n), y1 = Math.ceil((y + 1) * S / n), on = 0, tot = 0;
      for (j = y0; j < y1; j++) for (i = x0; i < x1; i++) { on += src[j * S + i]; tot++; }
      out[y * n + x] = on / tot >= 0.3 ? 1 : 0;
    }
    return (GB[key] = out);
  }
  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  function gname(id) { return id === 'node' ? 'north_node' : id; }
  var D35 = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];

  /* ── pixel buffer ── */
  function Buf() { this.d = new Uint8ClampedArray(N * N * 4); }
  Buf.prototype.set = function (x, y, c) { if (!c || x < 0 || y < 0 || x >= N || y >= N) return; var i = (y * N + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; };
  Buf.prototype.line = function (x0, y0, x1, y1, c, pat) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, k = 0;
    for (;;) { if (!pat || (pat === 1 && (k & 3) < 2) || (pat === 2 && (k % 8) < 4)) this.set(x0, y0, c); k++; if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
  };
  Buf.prototype.bits = function (bits, n, cx, cy, c) { var ox = Math.round(cx - n / 2), oy = Math.round(cy - n / 2), x, y; for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (bits[y * n + x]) this.set(ox + x, oy + y, c); };
  Buf.prototype.rect = function (x0, y0, w, h, c) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) this.set(x, y, c); };
  Buf.prototype.num = function (n, cx, cy, c) {                    /* 3x5 digits drawn 2x2 */
    var s = String(n), w = s.length * 8 - 2, ox = Math.round(cx - w / 2), oy = Math.round(cy - 5), i, p, x, y;
    for (i = 0; i < s.length; i++) { p = D35[+s[i]]; for (y = 0; y < 5; y++) for (x = 0; x < 3; x++) if (p.charAt(y * 3 + x) === '1') this.rect(ox + i * 8 + x * 2, oy + y * 2, 2, 2, c); }
  };
  Buf.prototype.bevel = function (x0, y0, w, h, face, hi, lo, dk, sunk) {          /* raised (or sunken) box, 2 cells of edge */
    var tl = sunk ? lo : hi, br = sunk ? hi : lo, i, k;
    this.rect(x0, y0, w, h, face);
    for (k = 0; k < 2; k++) for (i = 0; i < w; i++) { this.set(x0 + i, y0 + k, tl); this.set(x0 + i, y0 + h - 1 - k, k ? br : dk); }
    for (k = 0; k < 2; k++) for (i = 0; i < h; i++) { this.set(x0 + k, y0 + i, tl); this.set(x0 + w - 1 - k, y0 + i, k ? br : dk); }
    for (i = 2; i < w - 2; i++) this.set(x0 + i, y0 + h - 2, br);
    for (i = 2; i < h - 2; i++) this.set(x0 + w - 2, y0 + i, br);
  };

  /* ── geometry ── */
  function lonAt(th, asc) { var l = asc + (Math.PI - th) / RAD; return ((l % 360) + 360) % 360; }
  function pos(lon, asc, r) { var t = Math.PI - (lon - asc) * RAD; return [C + Math.cos(t) * r, C + Math.sin(t) * r]; }
  function spread(list, gap) {                                   /* nudge crowded markers apart (display angle only) */
    var a = list.map(function (p) { return { p: p, d: p.lon }; }).sort(function (x, y) { return x.d - y.d; }), it, i;
    for (it = 0; it < 160; it++) for (i = 0; i < a.length; i++) { var j = (i + 1) % a.length, dd = a[j].d - a[i].d; if (j === 0) dd += 360; if (dd < gap) { var push = (gap - dd) / 2; a[i].d -= push; a[j].d += push; } }
    a.forEach(function (o) { o.p.dl = o.d; });
  }

  function draw(canvas, spec) {
    if (!canvas || !PG) return;
    var S = skin(), b = new Buf(), asc = spec.asc || 0, bi = !!spec.inner, x, y;
    var R = bi ? { o: 166, f: 158, s: 132, t: 122, p1: 118, p2: 92, n1: 88, n2: 62, a: 58, hub: 12 } : { o: 166, f: 158, s: 132, t: 122, p1: 118, p2: 88, n1: 0, n2: 0, a: 88, hub: 14 };
    canvas.width = N; canvas.height = N;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.sqrt(dx * dx + dy * dy), t = Math.atan2(dy, dx), lon = lonAt(t, asc), col = S.desk, band = null, edge = null;
      if (r > R.o) { if (S.stars) { var h = ((x * 73856093) ^ (y * 19349663)) >>> 0; if (h % 211 === 0) col = [255, 255, 255]; else if (h % 523 === 1) col = S.soft; } }
      else if (r > R.f) { band = 'frame'; edge = [R.f, R.o, false]; }
      else if (r > R.s) { band = 'signs'; edge = [R.s, R.f, true]; }
      else if (r > R.t) { band = 'ticks'; edge = [R.t, R.s, false]; }
      else if (r > R.p2) { band = 'well'; edge = [R.p2, R.t, true]; }
      else if (bi && r > R.n1) { band = 'frame'; edge = [R.n1, R.p2, false]; }
      else if (bi && r > R.n2) { band = 'well'; edge = [R.n2, R.n1, true]; }
      else if (bi && r > R.a) { band = 'frame'; edge = [R.a, R.n2, false]; }
      else if (r > R.hub) { band = 'well'; edge = [R.hub, R.a, true]; }
      else { band = 'frame'; edge = [0, R.hub, false]; }
      if (band) {
        col = band === 'signs' ? S.ring[Math.floor(lon / 30) % 4] : band === 'well' ? S.well : S.face;
        /* bevel: light from the top left. raised = lit edges face up-left; sunken is the reverse. 2 cells wide, dark outermost line on raised edges */
        var sunk = edge[2], nx = Math.cos(t), ny = Math.sin(t), lit = -(nx * 0.707 + ny * 0.707);
        if (edge[1] - r < 2.2) { var up = sunk ? lit < 0 : lit > 0; col = (edge[1] - r < 1.1 && !sunk && !up) ? S.dk : (up ? S.hi : S.lo); }
        else if (r - edge[0] < 2.2 && edge[0] > 0) { var up2 = sunk ? lit > 0 : lit < 0; col = up2 ? S.hi : S.lo; }
        if (band === 'signs') { var ds = ((lon % 30) + 30) % 30; if (Math.min(ds, 30 - ds) * RAD * r < 0.9 && r - R.s > 2.2 && R.f - r > 2.2) col = S.line; }
        if (band === 'ticks') {
          var fr = lon - Math.round(lon), dpx = Math.abs(fr) * RAD * r, deg = ((Math.round(lon) % 360) + 360) % 360, len = deg % 10 === 0 ? 9 : deg % 5 === 0 ? 6 : 4;
          if (dpx < 0.6 && (R.s - r) < len + 2.5 && (R.s - r) > 2.5) col = S.line;
        }
        if (band === 'well' && r > R.hub + 1) { var dl = ((lon % 30) + 30) % 30; if (Math.min(dl, 30 - dl) * RAD * r < 0.6 && ((x + y) & 1) === 0 && r - edge[0] > 2.2 && edge[1] - r > 2.2) col = S.dim || S.lo; }
      }
      b.set(x, y, col);
    }
    /* horizon axis (ASC to DSC) */
    b.line(C - R.s + 3, C, C - R.a, C, S.dim || S.lo, 2); b.line(C + R.a, C, C + R.s - 3, C, S.dim || S.lo, 2);
    /* aspect lines */
    var rAsp = R.a - 5;
    (spec.aspects || []).forEach(function (a) {
      var p = pos(a.a, asc, rAsp), q = pos(a.b, asc, rAsp), colr = a.type === 'conj' ? S.conj : (a.type === 'sqr' || a.type === 'opp') ? S.hard : S.soft;
      b.line(p[0], p[1], q[0], q[1], colr, (a.type === 'sext' || a.type === 'tri') ? 1 : 0);
      if (a.orb < 1) b.line(p[0] + 1, p[1], q[0] + 1, q[1], colr, (a.type === 'sext' || a.type === 'tri') ? 1 : 0);
    });
    /* hub ornament */
    var hx = Math.round(C), hy = Math.round(C);
    if (S.hub === 'sun') { b.rect(hx - 3, hy - 3, 6, 6, S.lo); b.rect(hx - 1, hy - 1, 2, 2, S.hi); }
    else if (S.hub === 'box') { b.bevel(hx - 7, hy - 7, 14, 14, S.face, S.hi, S.lo, S.dk, false); }
    else if (S.hub === 'ring') { b.line(hx - 7, hy, hx + 7, hy, S.lo); b.line(hx, hy - 7, hx, hy + 7, S.lo); }
    else if (S.hub === 'cross') { b.line(hx - 8, hy - 8, hx + 8, hy + 8, S.lo); b.line(hx - 8, hy + 8, hx + 8, hy - 8, S.lo); }
    else if (S.hub === 'heart') { [[-4, -3], [-2, -4], [2, -4], [4, -3], [-5, -1], [5, -1], [-4, 1], [4, 1], [-2, 3], [2, 3], [0, 5], [-3, -2], [3, -2], [-1, -2], [1, -2], [-4, 0], [4, 0], [-3, 2], [3, 2], [-1, 4], [1, 4]].forEach(function (d) { b.rect(hx + d[0], hy + d[1] - 1, 2, 2, S.ring[2]); }); }
    /* sign glyphs, 32 px */
    var rs = (R.f + R.s) / 2;
    SIGNS.forEach(function (nm, i) { var p = pos(i * 30 + 15, asc, rs); b.bits(glyph(nm, GL), GL, p[0], p[1], S.glyph); });
    /* house numbers */
    for (var hn = 1; hn <= 12; hn++) { var hp = pos(Math.floor(asc / 30) * 30 + (hn - 1) * 30 + 15, asc, bi ? (R.a + R.n2) / 2 : R.a - 14); b.num(hn, hp[0], hp[1], S.dim || S.lo); }
    /* planet buttons: outer ring, then the inner (natal) ring. 32 px glyph in a raised silver button */
    function ring(list, rMid, box) {
      spread(list, Math.min(34, (box + 3) / rMid / RAD));
      list.forEach(function (p) {
        var tp = pos(p.lon, asc, R.t - 2), mp = pos(p.dl, asc, rMid), cls = ['sun', 'moon', 'mercury', 'venus', 'mars'].indexOf(p.id) >= 0 ? 0 : ['jupiter', 'saturn'].indexOf(p.id) >= 0 ? 1 : ['uranus', 'neptune', 'pluto'].indexOf(p.id) >= 0 ? 2 : 3,
            ink = S.mkInk[cls], mx = Math.round(mp[0]), my = Math.round(mp[1]), half = Math.floor(box / 2);
        b.line(tp[0], tp[1], mp[0], mp[1], S.lo, 1);
        if (S.mk === 'square') b.bevel(mx - half, my - half, box, box, S.face, S.hi, S.lo, S.dk, false);
        else if (S.mk === 'circle') { var xx, yy; for (yy = -half; yy <= half; yy++) for (xx = -half; xx <= half; xx++) { var rr = Math.sqrt(xx * xx + yy * yy); if (rr <= half + .3) { var lt = -((xx / (rr || 1)) * 0.707 + (yy / (rr || 1)) * 0.707); b.set(mx + xx, my + yy, rr > half - 2 ? (rr > half - 1 ? S.dk : (lt > 0 ? S.hi : S.lo)) : S.face); } } }
        else { var ax, ay; for (ay = -half; ay <= half; ay++) for (ax = -half; ax <= half; ax++) { var dd = Math.abs(ax) + Math.abs(ay); if (dd <= half + 4) b.set(mx + ax, my + ay, dd > half + 2 ? S.dk : dd > half ? ((ax + ay) < 0 ? S.hi : S.lo) : S.face); } }
        b.bits(glyph(gname(p.id), GL), GL, mx, my, ink);
        if (p.retro) b.rect(mx + half - 6, my + half - 5, 5, 3, S.hard);
      });
    }
    ring(spec.outer.map(function (p) { return { id: p.id, lon: p.lon, retro: p.retro }; }), (R.p1 + R.p2) / 2, bi ? 26 : 27);
    if (bi) ring(spec.inner.map(function (p) { return { id: p.id, lon: p.lon, retro: p.retro }; }), (R.n1 + R.n2) / 2, 26);
    canvas.getContext('2d').putImageData(new ImageData(b.d, N, N), 0, 0);
  }
  window.NwsChart = { draw: draw, skins: SKINS };
  window.addEventListener('themechange', function () { if (window.AW98 && window.AW98.render) window.AW98.render(true); });
})();
