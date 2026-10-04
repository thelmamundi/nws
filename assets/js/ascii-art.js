/* ═══════════════════════════════════════════════════════════
   ASCII ART: a planet or a glyph drawn in text. Amber lit side, blue shadow, and a glow in the planet's dignity colour.
   It is ALIVE: planets spin on their axis (their surface turns), glyphs spin like a coin, the dither grain slides, the glow twinkles,
   and now and then a row slips sideways.

     AsciiArt.html(id, { cols:54, rows:26, dignity:'domicile', t:0 })        -> HTML for a <pre> at frame t (pure: same input = same art)
         id    a planet: sun moon mercury venus mars jupiter saturn uranus neptune pluto
               or a glyph: 'glyph:scorpio', 'glyph:north_node', 'glyph:mars' ... (any name in pixel-glyphs.js)
     AsciiArt.mount(el, { id, dignity, cols, rows, every:110 })              -> fills el and animates; returns { stop() }
   Markup classes: a amber, h pale amber, b blue, d deep blue, k dim grey.   prefers-reduced-motion: draws once.
═══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var BAY = (function () { var m = [[0, 2], [3, 1]], n = 2; while (n < 8) { var q = []; for (var y = 0; y < n * 2; y++) { q.push([]); for (var x = 0; x < n * 2; x++) q[y].push(4 * m[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]); } m = q; n *= 2; } return m; })();
  function bth(x, y) { return (BAY[((y % 8) + 8) % 8][((x % 8) + 8) % 8] + 0.5) / 64; }
  var RAMP = ' .,:;-=+*#%@';
  function hash(a, b, s) { var h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, s) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); function h(i, j) { return hash(((i % 32) + 32) % 32, j, s); } return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; }
  var GLOW = { domicile: ['a', 1.0], exaltation: ['h', 1.25], detriment: ['b', 0.8], fall: ['d', 0.55], peregrine: ['k', 0.28] };
  /* surface at longitude u (radians; this is what turns) and latitude v (-1..1); strong blobs so the spin reads in text */
  function feature(id, u, v) {
    var x = (u / 6.2832 + 0.5) * 32, blob = (vn(x * 0.55, v * 3.2, 4) - 0.5);
    switch (id) {
      case 'jupiter': return Math.sin(v * 11 + 1.4 * vn(x * 0.4, v * 4, 1)) * 0.2 + blob * 0.5 + (Math.pow((u - 0.6) / 0.3, 2) + Math.pow((v + 0.3) / 0.1, 2) < 1 ? -0.5 : 0);
      case 'saturn': return Math.sin(v * 8 + vn(x * 0.3, v * 3, 2)) * 0.12 + blob * 0.3;
      case 'mars': return (Math.abs(v) > 0.82 ? 0.5 : 0) + blob * 0.9;
      case 'moon': case 'mercury': return blob * 0.7 - (vn(x * 1.3, v * 9, 5) > 0.72 ? 0.3 : 0);
      case 'venus': return (vn(x * 0.3 + v * 2, v * 4, 6) - 0.5) * 0.5;
      case 'uranus': case 'neptune': return Math.sin(v * 7 + vn(x * 0.3, v * 3, 7)) * 0.12 + blob * 0.4;
      case 'pluto': return blob * 0.8;
      case 'sun': return (vn(x * 1.6, v * 12, 9) - 0.5) * 0.5;
      default: return 0;
    }
  }
  var BM = {};
  function bitmap(name) {                                         /* the glyph's own 48 x 48 pixel art as an on/off grid */
    if (BM[name]) return BM[name]; var PG = root.PixelGlyphs, N = PG.size, b = new Uint8Array(N * N);
    PG.rects(name).forEach(function (r) { for (var y = r[1]; y < r[1] + r[3]; y++) for (var x = r[0]; x < r[0] + r[2]; x++) b[y * N + x] = 1; });
    var x0 = N, x1 = 0, y0 = N, y1 = 0, x, y; for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (b[y * N + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    b.cx = (x0 + x1 + 1) / 2; b.cy = (y0 + y1 + 1) / 2; b.s = Math.max(x1 - x0 + 1, y1 - y0 + 1) / 2 * 1.12;      /* centre and scale the glyph by its own bounds */
    return (BM[name] = b);
  }
  function runs(cells) {                                           /* merge neighbouring characters of one class into one span */
    var out = '', i = 0, n = cells.length;
    while (i < n) { var c = cells[i][1], str = '', j = i; while (j < n && cells[j][1] === c) { str += cells[j][0]; j++; } out += c ? '<span class="' + c + '">' + str + '</span>' : str; i = j; }
    return out;
  }
  function html(id, o) {
    o = o || {}; var COLS = o.cols || 54, ROWS = o.rows || 26, t = o.t || 0, cx = COLS / 2, cy = ROWS / 2, g = GLOW[o.dignity] || null, out = '', y, x, bx = t % 8, by = (t >> 1) % 8;
    var slip = {}; if (t % 17 === 9) slip[(hash(t, 1, 11) * ROWS) | 0] = (hash(t, 2, 11) < 0.5 ? -1 : 1);       /* a row slips sideways now and then */
    var isGlyph = /^glyph:/.test(id), name = isGlyph ? id.slice(6) : id;
    if (isGlyph && !(root.PixelGlyphs && root.PixelGlyphs.has(name))) isGlyph = false, name = 'moon';
    var Rr = isGlyph ? 0.46 * ROWS : (name === 'saturn' ? 0.28 : 0.42) * ROWS, Rc = Rr * 2.08, ring = !isGlyph && name === 'saturn';
    var L = [-0.5 + 0.1 * Math.sin(t * 0.13), -0.55, 0.67], ln = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ln, L[1] / ln, L[2] / ln];
    var spin = t * 0.09, cs = Math.cos(spin), faceUp = cs >= 0, sx = Math.max(Math.abs(cs), 0.045), bmp = isGlyph ? bitmap(name) : null, GN = isGlyph ? root.PixelGlyphs.size : 0;
    for (y = 0; y < ROWS; y++) {
      var cells = [], sh = slip[y] || 0;
      for (x = 0; x < COLS; x++) {
        var xx = x - sh, dx = (xx + 0.5 - cx) / Rc, dy = (y + 0.5 - cy) / Rr, d = Math.hypot(dx, dy), ch = ' ', cl = '';
        if (isGlyph) {
          /* the glyph turns like a coin about its vertical axis: its width follows cos, the back is the mirror image, the edge-on moment is a thin bright line */
          var u = dx / sx, gx = Math.floor(bmp.cx + (faceUp ? u : -u) * bmp.s), gy = Math.floor(bmp.cy + dy * bmp.s), on = gx >= 0 && gy >= 0 && gx < GN && gy < GN && bmp[gy * GN + gx] && Math.abs(u) <= 1;
          if (on) { var v = 0.5 + 0.45 * Math.abs(cs) - (dy > 0 ? 0.12 * dy : 0) + (faceUp ? 0 : -0.1), q = Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1) + bth(xx + bx, y + by))); ch = RAMP.charAt(Math.max(3, q)); cl = v > 0.78 ? 'h' : v > 0.5 ? 'a' : 'b'; }
          else if (Math.abs(cs) < 0.06 && Math.abs(dx) < 0.012 && Math.abs(dy) < 0.9) { ch = '|'; cl = 'h'; }
          else if (g) {                                                  /* the glow hugs the glyph: distance (in glyph pixels) to the nearest lit pixel */
            var near = 99, kx, ky, rad = 7; for (ky = -rad; ky <= rad; ky += 2) for (kx = -rad; kx <= rad; kx += 2) { var qx = gx + kx, qy = gy + ky; if (qx >= 0 && qy >= 0 && qx < GN && qy < GN && bmp[qy * GN + qx]) { var dq = Math.hypot(kx, ky); if (dq < near) near = dq; } }
            var e = 1 - near / (rad * Math.max(0.55, g[1])); if (e > 0 && e * e > bth(xx + t * 3, y + t * 5)) { ch = e > 0.5 ? '*' : '.'; cl = g[0]; }
          }
        } else {
          var inRing = false, behind = false;
          if (ring) { var q2 = Math.hypot(dx * Rc / Rr, dy / 0.3); inRing = q2 > 1.45 && q2 < 2.2 && !(q2 > 1.75 && q2 < 1.85); behind = dy < 0; }
          if (d <= 1 && !(inRing && !behind)) {
            var nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), l = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]), u2 = Math.atan2(dx, nz) + spin * 2.2, f = feature(name, u2, dy),
                v2 = name === 'sun' ? 0.8 + f : Math.max(0, Math.min(1, 0.04 + l * 0.92 + f)), tt = v2 * (RAMP.length - 1), b0 = Math.floor(tt), qn = Math.min(RAMP.length - 1, b0 + ((tt - b0) > bth(xx + bx, y + by) ? 1 : 0));
            ch = RAMP.charAt(qn); cl = v2 > 0.8 ? 'h' : v2 > 0.5 ? 'a' : v2 > 0.22 ? 'b' : 'd';
          } else if (inRing) { ch = behind ? '-' : '='; cl = behind ? 'd' : 'a'; }
          else if (g && d > 1) { var e2 = 1 - (d - 1) / g[1]; if (e2 > 0 && e2 * e2 > bth(xx + t * 3, y + t * 5)) { ch = e2 > 0.5 ? '*' : '.'; cl = g[0]; } }
        }
        cells.push([ch, ch === ' ' ? '' : cl]);
      }
      out += runs(cells) + '\n';
    }
    return out;
  }
  function mount(el, o) {
    o = o || {}; var t = 0, timer = null, reduce = false; try { reduce = root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
    function draw() { el.innerHTML = html(o.id, { cols: o.cols, rows: o.rows, dignity: o.dignity, t: t }); }
    draw();
    if (!reduce) timer = setInterval(function () { if (root.document && document.hidden) return; t++; draw(); }, o.every || 110);
    return { stop: function () { if (timer) clearInterval(timer); } };
  }
  root.AsciiArt = { html: html, mount: mount };
})(typeof self !== 'undefined' ? self : this);
