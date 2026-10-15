/* ═══════════════════════════════════════════════════════════
   CONSOLE LAB: ASCII astro calendar.
   A month as one block of text: a FIGlet title (any of the 332 fonts), a grid of days,
   the sky's events (lunations, stations, sign changes, aspects) and transits to your natal chart.

   NwsFiglet (loaded on every page, tiny until used):
     NwsFiglet.ready()                -> Promise; loads assets/js/vendor/figlet.js + figlet-fonts.js on first call
     NwsFiglet.fonts()                -> sorted font names (after ready)
     NwsFiglet.text(str, font, width) -> array of lines, blank top/bottom rows and trailing spaces trimmed
   The calendar mounts on [data-lab="astrocal"] (src/pages/lab.html). Settings stay in this browser (nws-lab-cal).
   The natal chart is the one the other personal panels use (window.AW98.birth()).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document;

  /* ── FIGlet loader ── */
  var BASE = (function () {
    var s = doc.currentScript && doc.currentScript.src;
    return s ? s.replace(/lab-calendar\.js(\?.*)?$/, '') : 'assets/js/';
  })();
  var FONTS = null, PARSED = {}, readyP = null;
  function load(src) {
    return new Promise(function (ok, bad) { var s = doc.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('could not load ' + src)); }; doc.head.appendChild(s); });
  }
  function gunzip(b64) {
    var bin = atob(b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('this browser cannot unpack the fonts (no DecompressionStream)'));
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function ready() {
    if (readyP) return readyP;
    readyP = (window.figlet ? Promise.resolve() : load(BASE + 'vendor/figlet.js'))
      .then(function () { return window.FIGLET_FONTS_GZ ? null : load(BASE + 'vendor/figlet-fonts.js'); })
      .then(function () { return gunzip(window.FIGLET_FONTS_GZ); })
      .then(function (txt) { FONTS = JSON.parse(txt); window.FIGLET_FONTS_GZ = null; return Object.keys(FONTS); });
    readyP.catch(function () { readyP = null; });
    return readyP;
  }
  function fontNames() { return FONTS ? Object.keys(FONTS).sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; }) : []; }
  function figText(str, font, width) {
    if (!FONTS || !FONTS[font]) return [str];
    if (!PARSED[font]) { window.figlet.parseFont(font, FONTS[font]); PARSED[font] = 1; }
    var out;
    try { out = window.figlet.textSync(str, { font: font, width: width || 1000, whitespaceBreak: true }); } catch (e) { return [str]; }
    var L = out.split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
    while (L.length && !L[L.length - 1]) L.pop();
    while (L.length && !L[0]) L.shift();
    return L.length ? L : [str];
  }
  window.NwsFiglet = { ready: ready, fonts: fontNames, text: figText };

  var root = doc.querySelector('[data-lab="astrocal"]'), S = window.AstroSky;
  if (!root || !S) return;
  var H = S.H, DAY = S.DAY;

  /* ── settings ── */
  var DEF = { ym: '', title: '{month}', font: 'Doom', sub: '{year}', subFont: 'Small', dayFont: '', start: 1, cw: 19, rows: 6, border: 'single',
    lun: 1, sta: 1, ing: 1, asp: 1, moonIng: 1, moonAsp: 0, natal: 1, natalMoon: 0, times: 1, moonLine: 1, log: 1, color: 1, paper: 0, fit: 1 };
  var cfg = {}; Object.keys(DEF).forEach(function (k) { cfg[k] = DEF[k]; });
  try { var sv = JSON.parse(localStorage.getItem('nws-lab-cal') || 'null'); if (sv) Object.keys(DEF).forEach(function (k) { if (sv[k] !== undefined) cfg[k] = sv[k]; }); } catch (e) { /* ignore */ }
  function save() { try { localStorage.setItem('nws-lab-cal', JSON.stringify(cfg)); } catch (e) { /* ignore */ } }
  var hm = /#(\d{4})-(\d{2})/.exec(location.hash); if (hm) cfg.ym = hm[1] + '-' + hm[2];
  function ym() {
    var m = /^(\d{4})-(\d{2})$/.exec(cfg.ym || ''), d = new Date();
    return m ? { y: +m[1], m: +m[2] - 1 } : { y: d.getFullYear(), m: d.getMonth() };
  }

  /* ── ASCII names ── */
  var PL = { sun: 'Su', moon: 'Mo', mercury: 'Me', venus: 'Ve', mars: 'Ma', jupiter: 'Ju', saturn: 'Sa', uranus: 'Ur', neptune: 'Ne', pluto: 'Pl', node: 'Nn', asc: 'As', mc: 'Mc' };
  var PLN = { asc: 'Ascendant', mc: 'Midheaven' };
  var SG = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
  var AS = { conj: 'cnj', sext: 'sxt', sqr: 'sqr', tri: 'tri', opp: 'opp' };
  var LUN = ['NEW MOON', '1ST QTR', 'FULL MOON', 'LAST QTR'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function degSign(l) { var s = Math.floor(l / 30), d = Math.floor(l - s * 30); return d + SG[s]; }
  function bname(id) { return PLN[id] || S.BY_ID[id].name; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── the month's events ── */
  function birthChart() { return window.AW98 && window.AW98.birth ? window.AW98.birth() : null; }
  function monthEvents(y, m) {
    var from = new Date(y, m, 1).getTime(), to = new Date(y, m + 1, 1).getTime(), ev = [];
    S.scan(from, to, { step: H }).forEach(function (e) {
      var moon = e.a === 'moon' || e.b === 'moon', k;
      if (e.type === 'lunation') k = 'lun';
      else if (e.type === 'station') k = 'sta';
      else if (e.type === 'ingress') k = moon ? 'moonIng' : 'ing';
      else if (e.type === 'aspect') k = moon ? 'moonAsp' : 'asp';
      if (!k || !cfg[k]) return;
      var x = { t: e.t, k: k, e: e };
      if (k === 'lun') { x.short = LUN[e.quarter] + ' ' + degSign(S.lon('moon', e.t)); x.long = e.name + ' at ' + degSign(S.lon('moon', e.t)); x.pr = e.quarter % 2 ? 1 : 0; }
      else if (k === 'sta') { x.short = PL[e.a] + (e.dir > 0 ? ' SD' : ' SRx'); x.long = S.BY_ID[e.a].name + ' ' + e.label + ' at ' + degSign(S.lon(e.a, e.t)); x.pr = 1; }
      else if (k === 'ing' || k === 'moonIng') { x.short = PL[e.a] + (e.dir > 0 ? '>' : '<') + SG[e.sign]; x.long = S.BY_ID[e.a].name + (e.dir > 0 ? ' enters ' : ' backs into ') + S.SIGNS[e.sign].name; x.pr = k === 'ing' ? 3 : 6; }
      else { x.short = PL[e.a] + ' ' + AS[e.aspect] + ' ' + PL[e.b]; x.long = S.eventPlain(e); x.pr = k === 'asp' ? 4 : 7; }
      ev.push(x);
    });
    var b = cfg.natal ? birthChart() : null;
    if (b) {
      var pts = [];
      S.PLANETS.forEach(function (p) { pts.push({ id: p.id, lon: b.pos[p.i].lon }); });
      if (b.asc !== null && b.asc !== undefined) pts.push({ id: 'asc', lon: b.asc });
      if (b.mc !== null && b.mc !== undefined) pts.push({ id: 'mc', lon: b.mc });
      S.PLANETS.forEach(function (tp) {
        if (tp.id === 'moon' && !cfg.natalMoon) return;
        pts.forEach(function (np) {
          S.ASPECTS.forEach(function (a) {
            S.exactsToPoint(tp.id, np.lon, a.angle, from, to, tp.id === 'moon' ? 2 * H : 6 * H).forEach(function (t) {
              var slow = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(tp.id) >= 0;
              ev.push({ t: t, k: 'nat', short: PL[tp.id] + ' ' + AS[a.id] + ' n' + PL[np.id], long: S.BY_ID[tp.id].name + ' ' + a.name + ' your ' + bname(np.id), pr: slow ? 2 : tp.id === 'moon' ? 8 : 5 });
            });
          });
        });
      });
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    return { from: from, to: to, ev: ev, birth: b };
  }

  /* ── a character canvas: text, a class per cell, and line bits (up 1, right 2, down 4, left 8) for borders ── */
  function Canvas(w, h) {
    this.w = w; this.h = h; this.c = []; this.a = []; this.b = [];
    for (var y = 0; y < h; y++) { this.c.push(new Array(w).fill(' ')); this.a.push(new Array(w).fill('')); this.b.push(new Array(w).fill(0)); }
  }
  Canvas.prototype.put = function (x, y, s, cls) {
    if (y < 0 || y >= this.h) return;
    for (var i = 0; i < s.length; i++) { var xx = x + i; if (xx < 0 || xx >= this.w) continue; this.c[y][xx] = s[i]; this.a[y][xx] = cls || ''; }
  };
  Canvas.prototype.hline = function (x0, x1, y) { for (var x = x0; x <= x1; x++) { if (x < x1) this.b[y][x] |= 2; if (x > x0) this.b[y][x] |= 8; } };
  Canvas.prototype.vline = function (x, y0, y1) { for (var y = y0; y <= y1; y++) { if (y < y1) this.b[y][x] |= 4; if (y > y0) this.b[y][x] |= 1; } };
  Canvas.prototype.box = function (x0, y0, x1, y1) { this.hline(x0, x1, y0); this.hline(x0, x1, y1); this.vline(x0, y0, y1); this.vline(x1, y0, y1); };
  var BOX = {
    single: { 5: '│', 1: '│', 4: '│', 10: '─', 2: '─', 8: '─', 6: '┌', 12: '┐', 3: '└', 9: '┘', 7: '├', 13: '┤', 14: '┬', 11: '┴', 15: '┼' },
    double: { 5: '║', 1: '║', 4: '║', 10: '═', 2: '═', 8: '═', 6: '╔', 12: '╗', 3: '╚', 9: '╝', 7: '╠', 13: '╣', 14: '╦', 11: '╩', 15: '╬' }
  };
  function borderChar(style, bits, x, y) {
    var horiz = !(bits & 5), vert = !(bits & 10);
    if (BOX[style]) return BOX[style][bits] || '+';
    if (style === 'shade') return '░';
    if (style === 'dashed') return horiz ? (x % 2 ? ' ' : '-') : vert ? (y % 2 ? ':' : '¦') : '+';
    return horiz ? '-' : vert ? '|' : '+';
  }
  Canvas.prototype.resolve = function (style) {
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) if (this.b[y][x] && this.c[y][x] === ' ') { this.c[y][x] = borderChar(style, this.b[y][x], x, y); this.a[y][x] = 'brd'; }
  };
  Canvas.prototype.text = function () { return this.c.map(function (r) { return r.join('').replace(/\s+$/, ''); }).join('\n'); };
  /* characters the DOS font has; anything else (quarter blocks, braille, emoji in some fonts) is held to one cell so the grid stays square */
  var SAFE = '─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬░▒▓█▄▀▌▐■°¦·';
  function cell(ch) { return ch.charCodeAt(0) < 128 || SAFE.indexOf(ch) >= 0 ? esc(ch) : '<span class="lab-w">' + esc(ch) + '</span>'; }
  Canvas.prototype.html = function () {
    return this.c.map(function (r, y) {
      var a = this.a[y], out = '', cur = null, run = '', end = r.join('').replace(/\s+$/, '').length;
      function flush() { if (run) out += cur ? '<span class="ac-' + cur + '">' + run + '</span>' : run; run = ''; }
      for (var x = 0; x < end; x++) { if (a[x] !== cur) { flush(); cur = a[x]; } run += cell(r[x]); }
      flush();
      return out;
    }, this).join('\n');
  };

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), dn = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dn);
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
  }
  function usWeek(d) { var j = new Date(d.getFullYear(), 0, 1); return Math.floor((Math.round((d - j) / DAY) + j.getDay()) / 7) + 1; }
  function fill(s, y, m) { return String(s).replace(/\{month\}/g, MONTHS[m]).replace(/\{mon\}/g, MONTHS[m].slice(0, 3)).replace(/\{year\}/g, y).replace(/\{yy\}/g, String(y).slice(2)); }
  function center(lines, w) { var lw = Math.max.apply(null, lines.map(function (l) { return l.length; }).concat([0])); var x = Math.max(0, Math.floor((w - lw) / 2)); return { x: x, w: lw }; }

  /* ── build the whole page of text ── */
  function build() {
    var M = ym(), y = M.y, m = M.m, data = monthEvents(y, m);
    var cw = Math.max(12, Math.min(30, +cfg.cw || 19)), wk = 4, W = wk + 7 * cw + 1, inner = cw - 3;
    var first = new Date(y, m, 1), ndays = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() - cfg.start + 7) % 7, nweeks = Math.ceil((lead + ndays) / 7);
    var today = new Date(), isToday = function (d) { return today.getFullYear() === y && today.getMonth() === m && today.getDate() === d; };

    /* events by local day */
    var byDay = {}; data.ev.forEach(function (e) { var d = new Date(e.t).getDate(); (byDay[d] = byDay[d] || []).push(e); });

    /* day numbers (figlet, if it fits the cell) */
    var num = {}, numH = 1;
    for (var d = 1; d <= ndays; d++) {
      var L = cfg.dayFont ? figText(String(d), cfg.dayFont) : [String(d)];
      if (Math.max.apply(null, L.map(function (l) { return l.length; })) > cw - 2 || L.length > 6) L = [String(d)];
      num[d] = L; numH = Math.max(numH, L.length);
    }
    var rows = Math.max(+cfg.rows || 6, numH + 1), rowH = rows + 1;

    /* header */
    var title = cfg.title ? figText(fill(cfg.title, y, m), cfg.font, W) : [], sub = cfg.sub ? figText(fill(cfg.sub, y, m), cfg.subFont || cfg.font, W) : [];
    var top = (title.length ? title.length + 1 : 0) + (sub.length ? sub.length + 1 : 0);
    var gridTop = top + 2, gridH = nweeks * rowH + 1;

    /* lists under the grid */
    var list = [], natal = [];
    if (cfg.log) {
      var cols = W >= 110 ? 2 : 1, colW = Math.floor((W - (cols - 1) * 3) / cols);
      var fmt = function (e) { var dd = new Date(e.t); return pad(dd.getDate()) + ' ' + hhmm(e.t) + '  ' + e.long; };
      var sky = data.ev.filter(function (e) { return e.k !== 'nat' && e.k !== 'moonIng' && e.k !== 'moonAsp'; }).map(fmt);
      var nat = data.ev.filter(function (e) { return e.k === 'nat'; }).map(fmt);
      list.push({ head: 'THE SKY IN ' + MONTHS[m].toUpperCase() + ' (your time zone)', lines: sky.length ? sky : ['(nothing ticked to show)'], cls: '' });
      if (data.birth) list.push({ head: 'TRANSITS TO YOUR CHART', lines: nat.length ? nat : ['(none this month)'], cls: 'nat' });
      if (data.birth) {
        natal = S.PLANETS.concat([S.BY_ID.node]).map(function (p) { var q = data.birth.pos[p.i]; return pad2(p.name, 8) + ' ' + q.deg + '°' + pad(q.min) + '\'' + ' ' + S.SIGNS[q.sign].name + (q.retro ? ' Rx' : ''); });
        if (data.birth.asc !== null) natal.push(pad2('Asc', 8) + ' ' + fmtDeg(data.birth.asc), pad2('MC', 8) + ' ' + fmtDeg(data.birth.mc));
        else natal.push('(no birth time: no Asc or MC)');
      }
      list.forEach(function (s) { s.colW = colW; s.cols = cols; s.h = Math.ceil(s.lines.length / cols); });
    }
    var legend = 'Su Mo Me Ve Ma Ju Sa Ur Ne Pl planets  > enters  < backs into  SRx/SD stations  cnj sxt sqr tri opp' + (data.birth ? '  nSu = your natal Sun' : '');
    var below = 0; list.forEach(function (s) { below += s.h + 3; }); if (natal.length) below += natal.length + 3;
    var total = gridTop + gridH + 1 + below + 2;
    var cv = new Canvas(W, total);

    /* title + subtitle, centred */
    var yy = 0;
    if (title.length) { var c1 = center(title, W); title.forEach(function (l, i) { cv.put(c1.x, yy + i, l, 'ttl'); }); yy += title.length + 1; }
    if (sub.length) { var c2 = center(sub, W); sub.forEach(function (l, i) { cv.put(c2.x, yy + i, l, 'sub'); }); yy += sub.length + 1; }
    cv.hline(0, W - 1, gridTop - 2);

    /* weekday names */
    cv.put(0, gridTop - 1, 'wk', 'dim');
    for (var c = 0; c < 7; c++) cv.put(wk + c * cw + 1, gridTop - 1, WD[(c + cfg.start) % 7], 'dim');

    /* cells */
    for (d = 1; d <= ndays; d++) {
      var idx = lead + d - 1, r = Math.floor(idx / 7), col = idx % 7, x0 = wk + col * cw, y0 = gridTop + r * rowH;
      cv.box(x0, y0, x0 + cw, y0 + rowH);
      var nm = num[d], nw = Math.max.apply(null, nm.map(function (l) { return l.length; }));
      nm.forEach(function (l, i) { cv.put(x0 + cw - 1 - nw, y0 + 1 + i, l, isToday(d) ? 'today' : 'num'); });
      var line = y0 + 1 + nm.length;
      if (cfg.moonLine) {                                            /* Moon's sign as the day starts; on its own line if the number is wide */
        var ms = 'Mo ' + SG[Math.floor(S.lon('moon', new Date(y, m, d).getTime()) / 30)];
        if (nw + ms.length + 3 <= cw - 1) cv.put(x0 + 2, y0 + 1, ms, 'dim'); else cv.put(x0 + 2, line++, ms, 'dim');
      }
      var evs = (byDay[d] || []).slice(), room = y0 + rowH - line;
      if (evs.length > room) {
        var keep = evs.slice().sort(function (a, b) { return a.pr - b.pr || a.t - b.t; }).slice(0, Math.max(0, room - 1));
        var more = evs.length - keep.length; evs = keep.sort(function (a, b) { return a.t - b.t; });
        evs.push({ short: '+' + more + ' more', k: 'dim', more: 1 });
      }
      evs.forEach(function (e, i) {
        var s = (cfg.times && !e.more ? hhmm(e.t) + ' ' : '') + e.short;
        if (s.length > inner) s = (cfg.times && !e.more && e.short.length <= inner ? e.short : s.slice(0, inner));
        cv.put(x0 + 2, line + i, s, e.k);
      });
      if (col === 0 || d === 1) cv.put(0, y0 + 1, String(cfg.start === 1 ? isoWeek(new Date(y, m, d)) : usWeek(new Date(y, m, d))), 'dim');
    }

    /* lists */
    yy = gridTop + gridH + 1;
    if (cfg.log) cv.put(0, yy++, legend.slice(0, W), 'dim');
    list.forEach(function (s) {
      yy++; cv.put(0, yy, s.head, s.cls || 'ttl'); cv.hline(s.head.length + 1, W - 1, yy); yy++;
      s.lines.forEach(function (l, i) { var cc = Math.floor(i / s.h), rr = i % s.h; cv.put(cc * (s.colW + 3), yy + rr, l.slice(0, s.colW), s.cls); });
      yy += s.h + 1;
    });
    if (natal.length) {
      yy++; cv.put(0, yy, 'YOUR NATAL CHART', 'nat'); cv.hline(17, W - 1, yy); yy++;
      var nc = W >= 110 ? 3 : 2, nh = Math.ceil(natal.length / nc), ncw = Math.floor(W / nc);
      natal.forEach(function (l, i) { cv.put(Math.floor(i / nh) * ncw, yy + (i % nh), l, ''); });
      yy += nh + 1;
    }
    cv.resolve(cfg.border);
    cv.h = Math.min(cv.h, yy + 1); cv.c.length = cv.h; cv.a.length = cv.h;
    return { cv: cv, y: y, m: m, data: data, W: W };
  }
  function pad2(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function fmtDeg(l) { var s = Math.floor(l / 30), w = l - s * 30, d = Math.floor(w), mi = Math.floor((w - d) * 60); return d + '°' + pad(mi) + '\' ' + S.SIGNS[s].name; }

  /* ── the panel ── */
  var Q = function (s) { return root.querySelector(s); };
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  var DAYFONTS = ['miniwi', 'Tmplr', 'Mini', 'Short', 'Three Point', 'Future', 'Digital', 'Bigfig', 'Pagga', 'Small Block', 'Straight', 'Small', 'Thin', 'Italic', 'Cygnet', 'Wavy'];
  function chk(k, label) { return '<label class="inl"><input type="checkbox" data-k="' + k + '"' + (cfg[k] ? ' checked' : '') + '> ' + label + '</label>'; }

  root.innerHTML =
    '<div class="lab-ctl">' +
      '<div class="lab-row"><label for="lc-ym">Month</label><button type="button" class="btn" data-step="-1" aria-label="Previous month">&lt;</button><input id="lc-ym" type="month"><button type="button" class="btn" data-step="1" aria-label="Next month">&gt;</button><button type="button" class="btn" data-step="0">This month</button></div>' +
      '<div class="lab-row"><label for="lc-title">Title</label><input id="lc-title" type="text" data-k="title" size="16"><select id="lc-font" data-k="font" aria-label="Title font"><option>Loading fonts…</option></select><button type="button" class="btn" data-rand="font">Random</button></div>' +
      '<div class="lab-row"><label for="lc-sub">Second line</label><input id="lc-sub" type="text" data-k="sub" size="16"><select id="lc-subfont" data-k="subFont" aria-label="Second line font"></select><button type="button" class="btn" data-rand="subFont">Random</button></div>' +
      '<div class="lab-row"><label for="lc-dayfont">Day numbers</label><select id="lc-dayfont" data-k="dayFont"></select>' +
        '<label for="lc-border">Lines</label><select id="lc-border" data-k="border">' + [['single', 'single ┌─┐'], ['double', 'double ╔═╗'], ['ascii', 'ascii +-|'], ['dashed', 'dashed - ¦'], ['shade', 'shade ░']].map(function (b) { return opt(b[0], b[1], cfg.border === b[0]); }).join('') + '</select>' +
        '<label for="lc-start">Week starts</label><select id="lc-start" data-k="start">' + opt(1, 'Monday', cfg.start === 1) + opt(0, 'Sunday', cfg.start === 0) + '</select></div>' +
      '<div class="lab-row"><label for="lc-cw">Cell width</label><input id="lc-cw" type="number" min="12" max="30" data-k="cw"><label for="lc-rows">Cell lines</label><input id="lc-rows" type="number" min="3" max="14" data-k="rows"></div>' +
      '<div class="lab-row lab-checks"><span class="lab-lbl">Sky</span>' + chk('lun', 'lunations') + chk('sta', 'stations') + chk('ing', 'sign changes') + chk('asp', 'aspects') + chk('moonIng', 'Moon sign changes') + chk('moonAsp', 'Moon aspects') + '</div>' +
      '<div class="lab-row lab-checks"><span class="lab-lbl">Natal</span>' + chk('natal', 'transits to my chart') + chk('natalMoon', 'include the Moon') + '<span data-natal-note class="dm"></span></div>' +
      '<div class="lab-row lab-checks"><span class="lab-lbl">Show</span>' + chk('times', 'times') + chk('moonLine', 'Moon sign per day') + chk('log', 'lists under the grid') + chk('color', 'colour') + chk('paper', 'ink on paper') + chk('fit', 'fit to width') + '</div>' +
      '<details class="bdetails lab-birth" data-birth><summary>Birth chart</summary><div data-birth-body></div></details>' +
      '<div class="lab-row lab-actions"><button type="button" class="btn btn-primary" data-act="copy">Copy text</button><button type="button" class="btn" data-act="txt">Save .txt</button><button type="button" class="btn" data-act="html">Save .html</button><button type="button" class="btn" data-act="print">Print</button><span class="dm" data-msg></span></div>' +
    '</div>' +
    '<div class="lab-out-wrap"><pre class="lab-out" data-out aria-label="ASCII calendar">Loading 332 FIGlet fonts…</pre></div>' +
    '<details class="bdetails lab-browse" data-browse><summary>Browse every font</summary><div class="lab-row"><label for="lc-filter">Filter</label><input id="lc-filter" type="text" size="14"><label for="lc-sample">Sample</label><input id="lc-sample" type="text" size="14" value="{month}"><span class="dm" data-bcount></span></div><div class="lab-grid" data-bgrid></div><p><button type="button" class="btn" data-bmore>Show more</button></p></details>';

  var out = Q('[data-out]'), wrap = Q('.lab-out-wrap'), last = null;
  function syncInputs() {
    var M = ym(); Q('#lc-ym').value = M.y + '-' + pad(M.m + 1);
    Q('#lc-title').value = cfg.title; Q('#lc-sub').value = cfg.sub; Q('#lc-cw').value = cfg.cw; Q('#lc-rows').value = cfg.rows;
    ['font', 'subFont', 'dayFont'].forEach(function (k) { var s = root.querySelector('[data-k="' + k + '"]'); if (s.options.length) s.value = cfg[k]; });
  }
  function fit() {
    if (!last) return;
    out.style.fontSize = '';
    if (!cfg.fit) return;
    var probe = doc.createElement('span'); probe.textContent = '0000000000'; out.appendChild(probe);
    var ratio = probe.getBoundingClientRect().width / 10 / parseFloat(getComputedStyle(out).fontSize) || 0.5; probe.remove();   /* glyph width per px of font size */
    out.style.fontSize = Math.max(6, Math.min(18, (wrap.clientWidth - 20) / (last.W * ratio))) + 'px';
  }
  function draw() {
    var r; try { r = build(); } catch (e) { out.textContent = 'The calendar hit an error: ' + e.message; if (window.console) console.error(e); return; }
    last = r;
    out.classList.toggle('lab-mono', !cfg.color); out.classList.toggle('lab-paper', !!cfg.paper);
    out.innerHTML = r.cv.html(); fit();
    var b = birthChart(), nn = Q('[data-natal-note]');
    nn.textContent = b ? '' : '(no birth chart saved: open Birth chart below)';
    if (!doc.querySelector('.npage') && history.replaceState) history.replaceState(null, '', '#' + r.y + '-' + pad(r.m + 1));   /* the one-file preview uses the hash for its tabs */
  }
  function setK(k, v) { cfg[k] = v; save(); draw(); }

  root.addEventListener('change', function (e) {
    var t = e.target, k = t.getAttribute('data-k');
    if (t.id === 'lc-ym') { if (t.value) setK('ym', t.value); return; }
    if (!k) return;
    if (t.type === 'checkbox') setK(k, t.checked ? 1 : 0);
    else if (t.type === 'number' || k === 'start') setK(k, +t.value);
    else setK(k, t.value);
  });
  root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k === 'title' || k === 'sub') { cfg[k] = e.target.value; save(); draw(); } });
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var st = t.getAttribute('data-step'), rk = t.getAttribute('data-rand'), act = t.getAttribute('data-act');
    if (st !== null) {
      var M = ym(), d = +st === 0 ? new Date() : new Date(M.y, M.m + +st, 1);
      cfg.ym = d.getFullYear() + '-' + pad(d.getMonth() + 1); save(); syncInputs(); draw();
    } else if (rk) {
      var names = fontNames(); if (!names.length) return;
      cfg[rk] = names[Math.floor(Math.random() * names.length)]; save(); syncInputs(); draw();
    } else if (act) doAct(act);
  });
  window.addEventListener('resize', fit);

  /* ── copy / save / print ── */
  function msg(s) { var el = Q('[data-msg]'); el.textContent = s; clearTimeout(msg.t); msg.t = setTimeout(function () { el.textContent = ''; }, 3000); }
  function fileName(ext) { return 'astro-calendar-' + last.y + '-' + pad(last.m + 1) + '.' + ext; }
  function download(name, type, body) {
    var a = doc.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: type })); a.download = name;
    doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function standalone() {
    var cs = getComputedStyle(out), vars = ['--led', '--pink', '--redc', '--ledg', '--cyan', '--panel'].map(function (v) { return v + ':' + getComputedStyle(doc.documentElement).getPropertyValue(v); }).join(';');
    return '<!doctype html><meta charset="utf-8"><title>' + MONTHS[last.m] + ' ' + last.y + '</title><style>:root{' + vars + '}body{margin:0;background:' + cs.backgroundColor + '}' +
      'pre{margin:0;padding:16px;font:14px/1 "Perfect DOS VGA 437","PerfectDOS",ui-monospace,Menlo,Consolas,monospace;color:' + cs.color + ';background:' + cs.backgroundColor + '}' + LABCSS + '@media print{body,pre{background:#fff;color:#000}pre span{color:inherit!important}}</style><pre class="' + out.className + '">' + last.cv.html() + '</pre>';
  }
  var LABCSS = '.ac-ttl{color:var(--led)}.ac-sub{color:var(--cyan)}.ac-nat{color:var(--pink)}.ac-lun{color:#fff}.ac-sta{color:var(--redc)}.ac-ing{color:var(--ledg)}.ac-today{color:var(--panel);background:var(--led)}.ac-brd,.ac-dim,.ac-moonIng,.ac-moonAsp{color:var(--lab-dim)}pre{--lab-dim:color-mix(in srgb,#fff 55%,var(--panel))}' +
    '.lab-paper span{color:#000}.lab-paper .ac-brd,.lab-paper .ac-dim{color:#555}.lab-paper .ac-nat,.lab-paper .ac-sta{color:#b0002a}.lab-paper .ac-today{color:#fff;background:#000}' +
    '.lab-mono span{color:inherit!important;background:none!important}.lab-w{display:inline-block;width:1ch;overflow:hidden;vertical-align:top}';
  function doAct(a) {
    if (!last) return;
    var txt = last.cv.text();
    if (a === 'copy') {
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { msg('Copied.'); }, function () {
        var ta = doc.createElement('textarea'); ta.value = txt; doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); msg('Copied.'); } catch (e) { msg('Copy did not work here; use Save .txt.'); } ta.remove();
      });
    } else if (a === 'txt') download(fileName('txt'), 'text/plain;charset=utf-8', txt + '\n');
    else if (a === 'html') download(fileName('html'), 'text/html;charset=utf-8', standalone());
    else if (a === 'print') {
      var w = window.open('', '_blank'); if (!w) { msg('Allow pop-ups to print, or use Save .html.'); return; }
      w.document.write(standalone().replace('</style>', 'pre{font-size:' + Math.max(6, Math.floor(1000 / (last.W * 0.6))) + 'px}</style>')); w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
    }
  }

  /* ── birth chart form (same storage as the other personal panels) ── */
  function birthForm() {
    var body = Q('[data-birth-body]'), A = window.AW98, b = birthChart();
    if (!A || !A.setBirth) { body.innerHTML = '<p class="dm">The sky engine is not loaded on this page.</p>'; return; }
    var r = (b && b.raw) || {};
    body.innerHTML = '<form class="bform" novalidate>' +
      (b ? '<p class="note">Saved here: Sun ' + esc(S.SIGNS[b.pos[0].sign].name) + ', Moon ' + esc(S.SIGNS[b.pos[1].sign].name) + (b.ascSign >= 0 ? ', rising ' + esc(S.SIGNS[b.ascSign].name) : ', no birth time') + '.</p>' : '') +
      '<label for="lb-date">Birth date</label><input id="lb-date" type="date" value="' + esc(r.date || '') + '">' +
      '<label for="lb-time">Birth time</label><input id="lb-time" type="time" value="' + esc(r.time ? String(r.time).slice(0, 5) : '') + '"> <label class="inl"><input id="lb-notime" type="checkbox"' + (r.date && !r.time ? ' checked' : '') + '> I don’t know it</label>' +
      '<label for="lb-city">Birth place</label><select id="lb-city">' + A.cities.map(function (c, i) { return opt(i, c[0], r.city === i); }).join('') + opt('other', 'Other (enter coordinates)', r.date && typeof r.city !== 'number') + '</select>' +
      '<span data-other hidden><label for="lb-lat">Latitude</label><input id="lb-lat" type="number" step="0.01" value="' + (r.lat !== undefined && typeof r.city !== 'number' ? r.lat : '') + '"><label for="lb-lng">Longitude</label><input id="lb-lng" type="number" step="0.01" value="' + (r.lng !== undefined && typeof r.city !== 'number' ? r.lng : '') + '"><label for="lb-off">UTC offset at birth (hours)</label><input id="lb-off" type="number" step="0.25" value="' + (r.off !== undefined ? r.off : '') + '"></span>' +
      '<span class="bbtns"><button type="submit" class="btn btn-primary">Save</button> <button type="button" class="btn" data-bclear>Clear</button></span></form>' +
      '<p class="note" data-bnote>Saved only in this browser. The Sky page’s personal panels use the same chart.</p>';
    var sel = body.querySelector('#lb-city'), other = body.querySelector('[data-other]'), note = body.querySelector('[data-bnote]');
    other.hidden = sel.value !== 'other';
    sel.addEventListener('change', function () { other.hidden = sel.value !== 'other'; });
    body.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var date = body.querySelector('#lb-date').value, time = body.querySelector('#lb-notime').checked ? '' : body.querySelector('#lb-time').value, o;
      if (!date) { note.textContent = 'Enter a birth date.'; return; }
      if (sel.value === 'other') {
        var la = parseFloat(body.querySelector('#lb-lat').value), ln = parseFloat(body.querySelector('#lb-lng').value), of = parseFloat(body.querySelector('#lb-off').value);
        if (!isFinite(la) || !isFinite(ln) || !isFinite(of)) { note.textContent = 'Enter latitude, longitude and the UTC offset at birth.'; return; }
        o = { date: date, time: time || null, lat: la, lng: ln, off: of, src: 'local' };
      } else { var c = A.cities[+sel.value]; o = { date: date, time: time || null, tz: c[1], lat: c[2], lng: c[3], city: +sel.value, src: 'local' }; }
      try { A.setBirth(o); } catch (err) { note.textContent = 'That date or place did not work.'; return; }
      birthForm(); draw();
    });
    body.querySelector('[data-bclear]').addEventListener('click', function () { A.clearBirth(); birthForm(); draw(); });
  }

  /* ── font browser ── */
  var shown = 0;
  function browse(reset) {
    var grid = Q('[data-bgrid]'), f = Q('#lc-filter').value.trim().toLowerCase(), M = ym(), sample = fill(Q('#lc-sample').value || '{month}', M.y, M.m);
    var names = fontNames().filter(function (n) { return !f || n.toLowerCase().indexOf(f) >= 0; });
    if (reset) { grid.innerHTML = ''; shown = 0; }
    Q('[data-bcount]').textContent = names.length + ' fonts';
    names.slice(shown, shown + 24).forEach(function (n) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'lab-tile'; b.title = 'Use ' + n + ' for the title';
      b.innerHTML = '<span class="lab-tname">' + esc(n) + '</span><pre>' + figText(sample, n, 80).map(function (l) { return l.split('').map(cell).join(''); }).join('\n') + '</pre>';
      b.addEventListener('click', function () { cfg.font = n; save(); syncInputs(); draw(); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      grid.appendChild(b);
    });
    shown = Math.min(names.length, shown + 24);
    Q('[data-bmore]').hidden = shown >= names.length;
  }
  Q('[data-browse]').addEventListener('toggle', function (e) { if (e.target.open && FONTS && !shown) browse(true); });
  Q('#lc-filter').addEventListener('input', function () { browse(true); });
  Q('#lc-sample').addEventListener('input', function () { browse(true); });
  Q('[data-bmore]').addEventListener('click', function () { browse(false); });

  syncInputs(); birthForm();
  ready().then(function () {
    var names = fontNames(), all = names.map(function (n) { return opt(n, n, false); }).join('');
    Q('#lc-font').innerHTML = all; Q('#lc-subfont').innerHTML = all;
    Q('#lc-dayfont').innerHTML = opt('', 'plain digits', false) + '<optgroup label="Small enough for a cell">' + DAYFONTS.filter(function (n) { return FONTS[n]; }).map(function (n) { return opt(n, n, false); }).join('') + '</optgroup><optgroup label="All fonts">' + all + '</optgroup>';
    if (!FONTS[cfg.font]) cfg.font = DEF.font; if (cfg.subFont && !FONTS[cfg.subFont]) cfg.subFont = DEF.subFont; if (cfg.dayFont && !FONTS[cfg.dayFont]) cfg.dayFont = '';
    syncInputs(); draw();
  }, function (err) { out.textContent = 'Could not load the FIGlet fonts: ' + err.message + '\nThe calendar is drawn below with plain text instead.'; setTimeout(draw, 1200); });
})();
