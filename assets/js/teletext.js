/* ═══════════════════════════════════════════════════════════
   TELETEXT / LED SCREEN: a 40 x 25 Mode 7 page drawn as a lit LED dot matrix.
   Characters are set in Bedstead (an accurate SAA5050 teletext emulation, CC0, assets/fonts/bedstead.otf) on the real 6 x 10 dot cell, so every dot you see is a design pixel of the font.
   Astro glyphs are dots too: real teletext "sixel" mosaics, or (in transit rows) dot bitmaps from the pixel-glyph set.
   Colours are the seven Mode 7 colours; unlit dots are a faint grey so the matrix is visible.

     Teletext.render(canvas, { page:'P101', brand:'WEATHERGIRL', kicker:'RETROGRADES', head:'NEXT MERCURY RETROGRADE',
                               glyphs:['mercury','scorpio'],                 big mosaic glyphs (optional)
                               rows:[[{g:'mercury',c:'yellow'},{t:'RX',c:'red'},{g:'scorpio',c:'cyan'},{t:"20°58'"}], ...],   transit rows: glyph and text tokens
                               lines:[['yellow','plain text'], ...],          plain text lines (used when there are no rows)
                               excerpt:'', published:'2026-09-28T14:03:11Z', clock:true, pitch:4, fixedClock:'THU 01 OCT 22:03/41' })
   Returns { stop() }. Needs PixelGlyphs. Call after fonts are ready: Teletext.ready().then(...)
═══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var COLS = 40, ROWS = 25, CW = 6, CH = 10;
  var COL = { black: '#000000', red: '#ff2a2a', green: '#2aff2a', yellow: '#ffd000', blue: '#2a2aff', magenta: '#ff2aff', cyan: '#2affff', white: '#ffffff', grey: '#8a8a8a', amber: '#ffb000' };
  var ASPG = { conj: 'conjunction', sext: 'sextile', sqr: 'square', tri: 'trine', opp: 'opposition' };
  /* a 3 x 5 dot font for the very smallest line (the sky-publish timestamp): the matrix cannot go below its own dot size otherwise */
  var F35 = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111', 'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101',
    'N': '110101101101101', 'O': '010101101101010', 'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010', 'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010', 'Z': '111001010100111',
    '-': '000000111000000', ':': '000010000010000', '.': '000000000000010', '/': '001001010100100', ' ': '000000000000000' };
  function ready() {
    if (!root.document || !document.fonts) return Promise.resolve();
    return Promise.all([document.fonts.load('10px Bedstead'), document.fonts.ready]).then(function () {});
  }
  var BM = {};
  function bitmap(name, n) {                      /* n x n on/off dot grid from the glyph rect data */
    var key = name + n; if (BM[key]) return BM[key];
    var PG = root.PixelGlyphs, S = PG.size, src = new Uint8Array(S * S), out = new Uint8Array(n * n), x, y, i, j;
    PG.rects(name).forEach(function (r) { for (var yy = r[1]; yy < r[1] + r[3]; yy++) for (var xx = r[0]; xx < r[0] + r[2]; xx++) src[yy * S + xx] = 1; });
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var x0 = Math.floor(x * S / n), x1 = Math.ceil((x + 1) * S / n), y0 = Math.floor(y * S / n), y1 = Math.ceil((y + 1) * S / n), on = 0, tot = 0;
      for (j = y0; j < y1; j++) for (i = x0; i < x1; i++) { on += src[j * S + i]; tot++; }
      out[y * n + x] = on / tot >= 0.26 ? 1 : 0;
    }
    return (BM[key] = out);
  }
  function wrap(text, width) {
    var words = String(text || '').replace(/\s+/g, ' ').trim().split(' '), lines = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > width) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur); return lines;
  }
  function render(canvas, s) {
    s = s || {}; var P = s.pitch || 4, W = COLS * CW, H = ROWS * CH, off = document.createElement('canvas'), ctx = off.getContext('2d'), out = canvas.getContext('2d'), timer = null;
    off.width = W; off.height = H; canvas.width = W * P; canvas.height = H * P;
    ctx.font = '100px Bedstead, monospace'; var adv = ctx.measureText('M').width / 100 || 0.6, FS = CW / adv;     /* the font size at which one character is exactly one 6-dot cell */
    function text(str, x, row, color, o) {                           /* x in dots; o.dbl = double height */
      o = o || {}; ctx.save(); ctx.fillStyle = COL[color] || color; ctx.font = FS + 'px Bedstead, monospace'; ctx.textBaseline = 'alphabetic';
      if (o.dbl) { ctx.translate(0, row * CH); ctx.scale(1, 2); for (var q = 0; q < str.length; q++) ctx.fillText(str[q], x + q * CW, CH * 0.82); }
      else for (var q2 = 0; q2 < str.length; q2++) ctx.fillText(str[q2], x + q2 * CW, row * CH + CH * 0.82);
      ctx.restore(); return str.length * CW;
    }
    function bar(row, color, c0, c1) { ctx.fillStyle = COL[color]; ctx.fillRect((c0 || 0) * CW, row * CH, ((c1 === undefined ? COLS : c1) - (c0 || 0)) * CW, CH); }
    var SY = [0, 3, 7, 10];                                          /* sixel row heights 3, 4, 3: how real teletext slices a 10 dot cell */
    function mosaic(name, col, row, color) {                         /* 6 x 4 cells = 12 x 12 sixels */
      var m = bitmap(name, 12), x, y; ctx.fillStyle = COL[color];
      for (y = 0; y < 12; y++) for (x = 0; x < 12; x++) if (m[y * 12 + x]) { var r = row + Math.floor(y / 3), sy = y % 3; ctx.fillRect(col * CW + x * 3, r * CH + SY[sy], 3, SY[sy + 1] - SY[sy]); }
    }
    function glyphDots(name, x, row, color, n) { var m = bitmap(name, n), px, py; ctx.fillStyle = COL[color]; for (py = 0; py < n; py++) for (px = 0; px < n; px++) if (m[py * n + px]) ctx.fillRect(x + px, row * CH + 3 + py, 1, 1); }
    function clockStr() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()] + ' ' + p(d.getDate()) + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()] + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + '/' + p(d.getSeconds()); }
    function chipRow(tokens, row) {                                  /* one transit row, two character rows tall: glyph dots and double-height text */
      var x = CW, gap = 4, n = 18;
      tokens.forEach(function (t) {
        if (t.g) { glyphDots(t.g, x, row + 0.1, t.c || 'yellow', n); x += n + gap; }
        else if (t.t) { x += text(String(t.t), x, row, t.c || 'white', { dbl: true }) + gap; }
      });
    }
    function paint() {
      ctx.fillStyle = COL.black; ctx.fillRect(0, 0, W, H);
      bar(0, 'blue'); text(String(s.page || 'P101'), CW, 0, 'white'); text(String(s.brand || '').slice(0, 13), CW * 6, 0, 'yellow');
      var cl = s.fixedClock || clockStr(); text(cl, (COLS - cl.length - 1) * CW, 0, 'white');
      var r = 2;
      if (s.kicker) { bar(r, 'cyan', 0, 1); bar(r + 1, 'cyan', 0, 1); text(String(s.kicker).toUpperCase().slice(0, 36), CW * 2, r, 'cyan', { dbl: true }); r += 3; }
      if (s.head) { text(String(s.head).slice(0, 38), CW, r, 'white', { dbl: true }); r += 3; }
      var gl = (s.glyphs || []).slice(0, 4), gcols = ['yellow', 'cyan', 'white', 'green'];
      if (gl.length && !(s.rows && s.rows.length)) { gl.forEach(function (n, i) { mosaic(n, 2 + i * 8, r, gcols[i % 4]); }); r += 5; }
      if (s.rows && s.rows.length) { s.rows.slice(0, 7).forEach(function (tokens) { chipRow(tokens, r); r += 3; }); }
      else (s.lines || []).slice(0, 8).forEach(function (l) { text(String(l[1]).slice(0, 38), CW, r, l[0]); r += 1; });
      r += 1; wrap(s.excerpt, 38).slice(0, Math.max(0, 22 - r)).forEach(function (t) { text(t, CW, r, 'white'); r += 1; });
      if (s.published) { var tx = 'SKY PUBLISHED ' + s.published, q, px, py; ctx.fillStyle = COL.grey; for (q = 0; q < tx.length; q++) { var gm = F35[tx[q]] || F35[' ']; for (py = 0; py < 5; py++) for (px = 0; px < 3; px++) if (gm.charAt(py * 3 + px) === '1') ctx.fillRect(CW + q * 4 + px, 22 * CH + 3 + py, 1, 1); } }
      var fx = [['red', 'WEATHER'], ['green', 'SKY'], ['yellow', 'MY WEATHER'], ['cyan', 'ABOUT']], x = 0;
      fx.forEach(function (f) { var w = Math.max(f[1].length + 1, 9); bar(24, f[0], x, x + w); text(f[1], x * CW, 24, 'black'); x += w; });
      /* dotify: every source dot becomes a round LED, lit in its own colour at full strength, unlit ones a faint grey */
      var img = ctx.getImageData(0, 0, W, H).data, x2, y2, rad = P * 0.4;
      out.fillStyle = '#000'; out.fillRect(0, 0, canvas.width, canvas.height); out.fillStyle = '#15171c';
      out.beginPath(); for (y2 = 0; y2 < H; y2++) for (x2 = 0; x2 < W; x2++) { out.moveTo(x2 * P + P / 2 + rad, y2 * P + P / 2); out.arc(x2 * P + P / 2, y2 * P + P / 2, rad, 0, 6.2832); } out.fill();
      for (y2 = 0; y2 < H; y2++) for (x2 = 0; x2 < W; x2++) {
        var i = (y2 * W + x2) * 4, rr = img[i], gg = img[i + 1], bb = img[i + 2], mx = Math.max(rr, gg, bb);
        if (mx < 110) continue;
        var k = 255 / mx; out.fillStyle = 'rgb(' + Math.min(255, rr * k | 0) + ',' + Math.min(255, gg * k | 0) + ',' + Math.min(255, bb * k | 0) + ')';
        out.beginPath(); out.arc(x2 * P + P / 2, y2 * P + P / 2, rad, 0, 6.2832); out.fill();
      }
    }
    paint();
    if (s.clock && !s.fixedClock) timer = setInterval(paint, 1000);
    return { stop: function () { if (timer) clearInterval(timer); } };
  }
  root.Teletext = { bitmap: bitmap, render: render, ready: ready, COLS: COLS, ROWS: ROWS, ASPG: ASPG };
})(typeof self !== 'undefined' ? self : this);
