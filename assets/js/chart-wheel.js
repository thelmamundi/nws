/* ═══════════════════════════════════════════════════════════
   CHART WHEEL: current-sky and transit wheels, drawn pixel by pixel.
   Windows 98 mechanics, not Windows 98 windows: raised and sunken bevels (light from the top left), a low-resolution grid
   scaled up with crisp pixels, Bayer dither fills, and a 16-colour style palette. Every theme has its own SKIN
   (palette, dither densities, marker shape, ornaments), picked from <html data-theme>.

     NwsChart.draw(canvas, { asc, outer: [{ id, lon, retro }], inner: [...] | null, aspects: [{ a, b, type, orb }], bi: bool })
       lon / asc are ecliptic degrees. inner = the natal ring of a transit (bi) wheel.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PG = window.PixelGlyphs, N = 168, C = N / 2, RAD = Math.PI / 180;
  var BAYER = (function () { var m = [[0]]; while (m.length < 8) { var s = m.length, o = [], y, x; for (y = 0; y < s * 2; y++) { o[y] = []; for (x = 0; x < s * 2; x++) o[y][x] = m[y % s][x % s] * 4 + [[0, 2], [3, 1]][y >= s ? 1 : 0][x >= s ? 1 : 0]; } m = o; } return m; })();
  function th(x, y) { return (BAYER[y & 7][x & 7] + 0.5) / 64; }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function H(list) { return list.map(hex); }
  function dith(a, b, t, x, y) { return t > th(x, y) ? b : a; }

  /* ── skins: one per theme ── */
  var SKINS = {
    dos: { desk: '#008080', face: '#c0c0c0', hi: '#ffffff', lo: '#808080', dk: '#000000', well: '#ffffff', dot: '#c0c0c0', line: '#000000', ink: '#000000',
           ring: ['#c00000', '#008000', '#000080', '#008080'], rd: [0.5, 0.5, 0.5, 0.5], glyph: '#ffffff', mk: 'square', mkFace: '#c0c0c0', mkInk: ['#800000', '#000080', '#800080', '#000000'],
           hard: '#c00000', soft: '#0000ff', conj: '#000080', tick: '#000000', hub: 'sun', desktop: 'checker' },
    bios: { desk: '#0000aa', face: '#aaaaaa', hi: '#ffffff', lo: '#555555', dk: '#000000', well: '#0000aa', dot: '#0000dd', line: '#ffff55', ink: '#000000',
            ring: ['#ff5555', '#55ff55', '#5555ff', '#55ffff'], rd: [0.4, 0.4, 0.4, 0.4], glyph: '#ffff55', mk: 'square', mkFace: '#0000aa', mkInk: ['#ffff55', '#55ffff', '#ffffff', '#aaaaaa'],
            hard: '#ff5555', soft: '#55ffff', conj: '#ffff55', tick: '#000000', hub: 'box', desktop: 'plain' },
    phosphor: { desk: '#000000', face: '#052a10', hi: '#39ff5a', lo: '#0a4a1a', dk: '#000000', well: '#010d05', dot: '#04200c', line: '#39ff5a', ink: '#b9ffc8',
                ring: ['#39ff5a', '#39ff5a', '#39ff5a', '#39ff5a'], rd: [0.55, 0.3, 0.42, 0.18], glyph: '#001a08', mk: 'circle', mkFace: '#031a0a', mkInk: ['#b9ffc8', '#62ff7a', '#39ff5a', '#8dffc4'],
                hard: '#b6ff6a', soft: '#39ff5a', conj: '#b9ffc8', tick: '#39ff5a', hub: 'ring', desktop: 'plain' },
    amber: { desk: '#000000', face: '#2a1700', hi: '#ffb000', lo: '#5c3a00', dk: '#000000', well: '#0f0800', dot: '#1c1000', line: '#ffb000', ink: '#ffe1a1',
             ring: ['#ffb000', '#ffb000', '#ffb000', '#ffb000'], rd: [0.55, 0.3, 0.42, 0.18], glyph: '#1a0e00', mk: 'diamond', mkFace: '#1c1000', mkInk: ['#ffe1a1', '#ffb000', '#ffd060', '#c88a1c'],
             hard: '#ffe27a', soft: '#ffb000', conj: '#ffe1a1', tick: '#ffb000', hub: 'ring', desktop: 'plain' },
    paper: { desk: '#f1ecdc', face: '#e4dcc0', hi: '#fffaf0', lo: '#9a9070', dk: '#2b2f8f', well: '#fffaf0', dot: '#e4dcc0', line: '#2b2f8f', ink: '#2b2f8f',
             ring: ['#2b2f8f', '#2b2f8f', '#2b2f8f', '#2b2f8f'], rd: [0.62, 0.38, 0.5, 0.25], glyph: '#fffaf0', mk: 'circle', mkFace: '#fffaf0', mkInk: ['#c1272d', '#2b2f8f', '#12155e', '#0b6f86'],
             hard: '#c1272d', soft: '#0b6f86', conj: '#12155e', tick: '#2b2f8f', hub: 'cross', desktop: 'hatch' },
    legend: { desk: '#000000', face: '#ffc2e0', hi: '#ffffff', lo: '#c0105f', dk: '#580034', well: '#14031c', dot: '#2a0a3a', line: '#ff3f8e', ink: '#7a0a58',
              ring: ['#7a0a58', '#c0105f', '#ff3f8e', '#ff7ab5'], rd: [1, 1, 1, 1], glyph: '#ffffff', mk: 'square', mkFace: '#ffc2e0', mkInk: ['#7a0a58', '#5b84ff', '#7a0a58', '#580034'],
              hard: '#ff3f8e', soft: '#8fd0ff', conj: '#ffffff', tick: '#580034', hub: 'heart', desktop: 'stars', angular: ['#7a0a58', '#c0105f', '#ff3f8e', '#ff80b8', '#ffc2e0', '#ff80b8', '#ff3f8e', '#c0105f'] }
  };
  Object.keys(SKINS).forEach(function (k) { var s = SKINS[k]; ['desk', 'face', 'hi', 'lo', 'dk', 'well', 'dot', 'line', 'ink', 'glyph', 'mkFace', 'hard', 'soft', 'conj', 'tick'].forEach(function (p) { s[p] = hex(s[p]); }); s.ring = H(s.ring); s.mkInk = H(s.mkInk); if (s.angular) s.angular = H(s.angular); });
  function skin() { return SKINS[document.documentElement.getAttribute('data-theme')] || SKINS.dos; }

  /* ── glyph bitmaps from the pixel-glyph rects, thresholded to n x n on/off ── */
  var GB = {};
  function glyph(name, n) {
    var key = name + n; if (GB[key]) return GB[key];
    var out = new Uint8Array(n * n), r = PG && PG.rects(name); if (!r) return (GB[key] = out);
    var S = PG.size, src = new Uint8Array(S * S), i, j, x, y;
    r.forEach(function (q) { for (y = q[1]; y < q[1] + q[3]; y++) for (x = q[0]; x < q[0] + q[2]; x++) src[y * S + x] = 1; });
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var x0 = Math.floor(x * S / n), x1 = Math.ceil((x + 1) * S / n), y0 = Math.floor(y * S / n), y1 = Math.ceil((y + 1) * S / n), on = 0, tot = 0;
      for (j = y0; j < y1; j++) for (i = x0; i < x1; i++) { on += src[j * S + i]; tot++; }
      out[y * n + x] = on / tot >= 0.24 ? 1 : 0;
    }
    return (GB[key] = out);
  }
  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  function gname(id) { return id === 'node' ? 'north_node' : id; }
  /* tiny 3x5 digits for the house numbers */
  var D35 = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];

  /* ── buffer ── */
  function Buf() { this.d = new Uint8ClampedArray(N * N * 4); }
  Buf.prototype.set = function (x, y, c) { if (x < 0 || y < 0 || x >= N || y >= N) return; var i = (y * N + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; };
  Buf.prototype.line = function (x0, y0, x1, y1, c, pat) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, k = 0;
    for (;;) { if (!pat || (pat === 1 && (k & 1) === 0) || (pat === 2 && (k % 4) < 2)) this.set(x0, y0, c); k++; if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } }
  };
  Buf.prototype.bits = function (bits, n, cx, cy, c) { var ox = Math.round(cx - n / 2), oy = Math.round(cy - n / 2), x, y; for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (bits[y * n + x]) this.set(ox + x, oy + y, c); };
  Buf.prototype.rect = function (x0, y0, w, h, c) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) this.set(x, y, c); };
  Buf.prototype.num = function (n, cx, cy, c) { var s = String(n), w = s.length * 4 - 1, ox = Math.round(cx - w / 2), oy = Math.round(cy - 2), i, p, x, y; for (i = 0; i < s.length; i++) { p = D35[+s[i]]; for (y = 0; y < 5; y++) for (x = 0; x < 3; x++) if (p.charAt(y * 3 + x) === '1') this.set(ox + i * 4 + x, oy + y, c); } };
  Buf.prototype.bevel = function (x0, y0, w, h, face, hi, lo, dk, sunk) {            /* a raised (or sunken) box, Win98 style */
    var tl = sunk ? lo : hi, br = sunk ? hi : lo, i;
    this.rect(x0, y0, w, h, face);
    for (i = 0; i < w; i++) { this.set(x0 + i, y0, tl); this.set(x0 + i, y0 + h - 1, dk); }
    for (i = 0; i < h; i++) { this.set(x0, y0 + i, tl); this.set(x0 + w - 1, y0 + i, dk); }
    for (i = 1; i < w - 1; i++) this.set(x0 + i, y0 + h - 2, br);
    for (i = 1; i < h - 1; i++) this.set(x0 + w - 2, y0 + i, br);
  };

  /* ── drawing ── */
  function lonAt(th, asc) { var l = asc + (Math.PI - th) / RAD; return ((l % 360) + 360) % 360; }
  function pos(lon, asc, r) { var t = Math.PI - (lon - asc) * RAD; return [C + Math.cos(t) * r, C + Math.sin(t) * r]; }
  function spread(list, gap) {                            /* nudge crowded markers apart (display angle only) */
    var a = list.map(function (p) { return { p: p, d: p.lon }; }).sort(function (x, y) { return x.d - y.d; }), it, i;
    for (it = 0; it < 120; it++) for (i = 0; i < a.length; i++) { var j = (i + 1) % a.length, dd = a[j].d - a[i].d; if (j === 0) dd += 360; if (dd < gap) { var push = (gap - dd) / 2; a[i].d -= push; a[j].d += push; } }
    a.forEach(function (o) { o.p.dl = o.d; });
  }
  function bandBase(S, band, x, y, r, th_, lon) {         /* one pixel of the wheel's fixed furniture */
    var el = Math.floor(lon / 30) % 4, sign = Math.floor(lon / 30);
    switch (band) {
      case 'frame': return S.face;
      case 'signs':
        if (S.angular) { var t = (lon / 360) * S.angular.length, i = Math.floor(t) % S.angular.length; return dith(S.angular[i], S.angular[(i + 1) % S.angular.length], t - Math.floor(t), x, y); }
        return dith(S.face, S.ring[el], S.rd[el], x, y);
      case 'ticks': return S.face;
      case 'well': return ((x + y) & 1) && (x % 3 === 0) ? S.dot : S.well;
      case 'inner': return S.well;
    }
    return S.desk;
  }
  function draw(canvas, spec) {
    if (!canvas || !PG) return;
    var S = skin(), b = new Buf(), asc = spec.asc || 0, bi = !!spec.inner, x, y;
    var R = bi ? { o: 83, f: 79, s: 66, t: 61, p1: 59, p2: 46, n1: 44, n2: 31, a: 29, hub: 6 } : { o: 83, f: 79, s: 66, t: 61, p1: 59, p2: 44, n1: 0, n2: 0, a: 44, hub: 7 };
    canvas.width = N; canvas.height = N;
    /* furniture */
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.sqrt(dx * dx + dy * dy), t = Math.atan2(dy, dx), lon = lonAt(t, asc), col = null, band = null, edge = null;
      if (r > R.o) { col = S.desk; if (S.desktop === 'checker') col = ((x + y) & 1) ? S.desk : dith(S.desk, S.face, .0, x, y); if (S.desktop === 'stars') { var h = ((x * 73856093) ^ (y * 19349663)) >>> 0; if (h % 97 === 0) col = [255, 255, 255]; else if (h % 211 === 1) col = S.soft; } if (S.desktop === 'hatch' && ((x + y) % 4 === 0)) col = S.lo; }
      else if (r > R.f) { band = 'frame'; edge = [R.f, R.o, false]; }
      else if (r > R.s) { band = 'signs'; edge = [R.s, R.f, true]; }
      else if (r > R.t) { band = 'ticks'; edge = [R.t, R.s, false]; }
      else if (r > R.p2) { band = 'well'; edge = [R.p2, R.p1 + 2, true]; }
      else if (bi && r > R.n1) { band = 'frame'; edge = [R.n1, R.p2, false]; }
      else if (bi && r > R.n2) { band = 'well'; edge = [R.n2, R.n1, true]; }
      else if (bi && r > R.a) { band = 'frame'; edge = [R.a, R.n2, false]; }
      else if (r > R.hub) { band = 'inner'; edge = [R.hub, R.a, true]; }
      else { band = 'frame'; edge = [0, R.hub, false]; }
      if (!col) {
        col = bandBase(S, band, x, y, r, t, lon);
        /* bevel: light from the top left. raised = lit edges face up-left; sunken is the reverse */
        var sunk = edge[2], nx = Math.cos(t), ny = Math.sin(t), lit = -(nx * 0.707 + ny * 0.707);
        if (edge[1] - r < 1.1) { var up = sunk ? lit < 0 : lit > 0; col = (edge[1] - r < 0.55 && !sunk && !up) ? S.dk : (up ? S.hi : S.lo); }       /* outer edge, normal points outward */
        else if (r - edge[0] < 1.1 && edge[0] > 0) { var up2 = sunk ? lit > 0 : lit < 0; col = up2 ? S.hi : S.lo; }
        /* sign divisions and degree ticks */
        if (band === 'signs') { var ds = Math.abs(((lon % 30) + 30) % 30); if (Math.min(ds, 30 - ds) * RAD * r < 0.7) col = S.line; }
        if (band === 'ticks') {
          var fr = lon - Math.round(lon), dpx = Math.abs(fr) * RAD * r, deg = ((Math.round(lon) % 360) + 360) % 360, len = deg % 10 === 0 ? 4 : deg % 5 === 0 ? 3 : 2;
          if (dpx < 0.5 && (R.s - r) < len + 0.5 && (R.s - r) > 0.8) col = S.tick;
        }
        if ((band === 'well' || band === 'inner') && r > R.hub) {          /* whole-sign house lines through the wells */
          var dl = Math.abs(((lon % 30) + 30) % 30); if (Math.min(dl, 30 - dl) * RAD * r < 0.5 && ((x + y) & 1) === 0) col = S.line;
        }
      }
      b.set(x, y, col);
    }
    /* horizon axis (ASC to DSC) */
    b.line(C - R.s + 1, C, C - R.a, C, S.line, 2); b.line(C + R.a, C, C + R.s - 1, C, S.line, 2);
    /* aspect lines */
    var rAsp = R.a - 2;
    (spec.aspects || []).forEach(function (a) {
      var p = pos(a.a, asc, rAsp), q = pos(a.b, asc, rAsp), tight = a.orb < 1;
      var colr = a.type === 'conj' ? S.conj : (a.type === 'sqr' || a.type === 'opp') ? S.hard : S.soft;
      b.line(p[0], p[1], q[0], q[1], colr, (a.type === 'sext' || a.type === 'tri') ? 1 : 0);
      if (tight) b.line(p[0] + 1, p[1], q[0] + 1, q[1], colr, 1);
    });
    /* hub ornament */
    var hx = Math.round(C), hy = Math.round(C);
    if (S.hub === 'sun') { b.set(hx, hy, S.dk); b.set(hx - 1, hy, S.dk); b.set(hx + 1, hy, S.dk); b.set(hx, hy - 1, S.dk); b.set(hx, hy + 1, S.dk); }
    else if (S.hub === 'box') { b.bevel(hx - 3, hy - 3, 7, 7, S.face, S.hi, S.lo, S.dk, false); }
    else if (S.hub === 'ring') { b.line(hx - 3, hy, hx + 3, hy, S.line); b.line(hx, hy - 3, hx, hy + 3, S.line); }
    else if (S.hub === 'cross') { b.line(hx - 4, hy - 4, hx + 4, hy + 4, S.line); b.line(hx - 4, hy + 4, hx + 4, hy - 4, S.line); }
    else if (S.hub === 'heart') { [[-2, -1], [2, -1], [-3, 0], [-1, 0], [1, 0], [3, 0], [-2, 1], [0, 1], [2, 1], [-1, 2], [1, 2], [0, 3], [-3, -1], [3, -1], [-1, -1], [1, -1]].forEach(function (d) { b.set(hx + d[0], hy + d[1] - 1, S.line); }); }
    /* sign glyphs */
    var rs = (R.f + R.s) / 2;
    SIGNS.forEach(function (nm, i) { var p = pos(i * 30 + 15, asc, rs), bc = bandBase(S, 'signs', Math.round(p[0]), Math.round(p[1]), rs, 0, i * 30 + 15), lum = (0.3 * bc[0] + 0.59 * bc[1] + 0.11 * bc[2]) / 255, gc = lum > 0.5 ? S.dk : S.glyph; b.bits(glyph(nm, 11), 11, p[0], p[1], gc); });
    /* house numbers */
    for (var hnum = 1; hnum <= 12; hnum++) { var hp = pos(Math.floor(asc / 30) * 30 + (hnum - 1) * 30 + 15, asc, bi ? (R.a + R.n2) / 2 : R.a - 7); b.num(hnum, hp[0], hp[1], S.line); }
    /* markers: outer ring, then the inner (natal) ring */
    function ring(list, rMid, big) {
      spread(list, Math.min(34, 14 / rMid / RAD));
      list.forEach(function (p, i) {
        var tp = pos(p.lon, asc, R.t - 1), mp = pos(p.dl, asc, rMid), cls = ['sun', 'moon', 'mercury', 'venus', 'mars'].indexOf(p.id) >= 0 ? 0 : ['jupiter', 'saturn'].indexOf(p.id) >= 0 ? 1 : ['uranus', 'neptune', 'pluto'].indexOf(p.id) >= 0 ? 2 : 3, ink = S.mkInk[cls], mx = Math.round(mp[0]), my = Math.round(mp[1]);
        b.line(tp[0], tp[1], mp[0], mp[1], S.line, 1);
        if (S.mk === 'square') b.bevel(mx - 6, my - 6, 13, 13, S.mkFace, S.hi, S.lo, S.dk, false);
        else if (S.mk === 'circle') { var xx, yy; for (yy = -6; yy <= 6; yy++) for (xx = -6; xx <= 6; xx++) { var rr = Math.sqrt(xx * xx + yy * yy); if (rr <= 6.2) b.set(mx + xx, my + yy, rr > 5.2 ? S.line : S.mkFace); } }
        else { var ax, ay; for (ay = -6; ay <= 6; ay++) for (ax = -6; ax <= 6; ax++) { var dd = Math.abs(ax) + Math.abs(ay); if (dd <= 7) b.set(mx + ax, my + ay, dd > 6 ? S.line : S.mkFace); } }
        b.bits(glyph(gname(p.id), 9), 9, mx, my, ink);
        if (p.retro) { b.set(mx + 5, my + 6, S.hard); b.set(mx + 6, my + 6, S.hard); b.set(mx + 5, my + 5, S.hard); }
      });
    }
    ring(spec.outer.map(function (p) { return { id: p.id, lon: p.lon, retro: p.retro }; }), bi ? (R.p1 + R.p2) / 2 : (R.p1 + R.p2) / 2 - 1, !bi);
    if (bi) ring(spec.inner.map(function (p) { return { id: p.id, lon: p.lon, retro: p.retro }; }), (R.n1 + R.n2) / 2, false);
    var ctx = canvas.getContext('2d'); ctx.putImageData(new ImageData(b.d, N, N), 0, 0);
  }
  window.NwsChart = { draw: draw, skins: SKINS };
  window.addEventListener('themechange', function () { if (window.AW98 && window.AW98.render) window.AW98.render(true); });
})();
