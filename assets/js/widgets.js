/* ═══════════════════════════════════════════════════════════
   WIDGETS: the LED instruments, as DOS screens.
   Every widget is a view over one shared event stream (astro-engine.js).
   Mount with <div data-widget="name" data-compact="1"></div>.

   names: ticker, mini, conditions, nextexact, flight, speed
   Text mode on purpose: three-letter body codes, ASCII aspect codes, block-character bars (no emoji, no icon fonts).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var S = window.AstroSky; if (!S) return;
  var H = S.H, DAY = S.DAY, doc = document;

  var BODY = { sun: 'SUN', moon: 'MOO', mercury: 'MER', venus: 'VEN', mars: 'MAR', jupiter: 'JUP', saturn: 'SAT', uranus: 'URA', neptune: 'NEP', pluto: 'PLU', node: 'NOD' };
  var ASP = { conj: 'CNJ', sext: 'SXT', sqr: 'SQR', tri: 'TRI', opp: 'OPP' };
  var SIGN3 = ['ARI', 'TAU', 'GEM', 'CAN', 'LEO', 'VIR', 'LIB', 'SCO', 'SAG', 'CAP', 'AQU', 'PIS'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dayName(ms) { return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(ms).getDay()]; }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function stamp(ms, ref) { return (sameDay(ms, ref) ? '' : dayName(ms) + ' ') + hm(ms); }
  function midnight(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function tz(ms) { try { var p = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date(ms)); for (var i = 0; i < p.length; i++) if (p[i].type === 'timeZoneName') return p[i].value; } catch (e) { /* ignore */ } return ''; }
  function cd(t, now) { return '<span class="cd" data-t="' + Math.round(t) + '">' + S.countdown(t - now) + '</span>'; }
  function short(ms) { var m = Math.round(Math.abs(ms) / 60000); if (m < 1) return '<1M'; var d = Math.floor(m / 1440); m -= d * 1440; var h = Math.floor(m / 60); m -= h * 60; return d ? d + 'D ' + h + 'H' : (h ? h + 'H' + pad(m) + 'M' : m + 'M'); }
  function posS(p) { return pad(p.deg) + '°' + pad(p.min) + "' " + SIGN3[p.sign]; }
  function bar(v, w) { w = w || 12; var n = Math.round(Math.max(0, Math.min(1, v)) * w); return '<span class="bar">[' + '█'.repeat(n) + '░'.repeat(w - n) + ']</span>'; }
  function lvl(v) { return v < 20 ? 'QUIET' : v < 35 ? 'LIGHT' : v < 50 ? 'STEADY' : v < 65 ? 'BUSY' : v < 80 ? 'HEAVY' : 'INTENSE'; }

  function evText(e) {
    if (e.type === 'aspect') return BODY[e.a] + ' ' + ASP[e.aspect] + ' ' + BODY[e.b];
    if (e.type === 'ingress') return BODY[e.a] + (e.dir < 0 ? ' RX' : '') + ' > ' + SIGN3[e.sign];
    if (e.type === 'station') return BODY[e.a] + ' STATION ' + (e.dir > 0 ? 'DIRECT' : 'RETRO');
    if (e.type === 'lunation') return e.name.toUpperCase() + ' ' + SIGN3[e.sign];
    return e.type;
  }
  function evCat(e) { return e.type === 'aspect' && (e.a === 'moon' || e.b === 'moon') ? 'moon' : e.type; }

  /* one shared computation, refreshed as time moves */
  var cache = { ev: null, from: 0 };
  function events(t) {
    if (!cache.ev || Math.abs(t - cache.from) > 12 * H) { cache.from = t; cache.ev = S.scan(t - 72 * H, t + 9 * DAY); }
    return cache.ev;
  }
  function ctx() { var t = Date.now(); return { t: t, pos: S.positions(t), events: events(t) }; }
  function next(c, pred) { for (var i = 0; i < c.events.length; i++) if (c.events[i].t > c.t && (!pred || pred(c.events[i]))) return c.events[i]; return null; }

  var ui = { flightTab: '24h', nextKind: 'any' };
  var KINDS = [['any', 'ANY'], ['aspect', 'ASPECT'], ['planets', 'NO MOON'], ['ingress', 'INGRESS'], ['station', 'STATION'], ['lunation', 'LUNAR']];
  var PRED = {
    any: null, aspect: function (e) { return e.type === 'aspect'; }, planets: function (e) { return e.type === 'aspect' && e.a !== 'moon' && e.b !== 'moon'; },
    ingress: function (e) { return e.type === 'ingress'; }, station: function (e) { return e.type === 'station'; }, lunation: function (e) { return e.type === 'lunation'; }
  };
  var W = {};

  W.ticker = function (el, c) {
    if (el._done) return; el._done = 1;                                  /* render once: re-rendering would restart the scroll */
    var items = c.pos.filter(function (p) { return p.id !== 'node'; }).map(function (p) { return '<span class="pos">' + BODY[p.id] + ' ' + posS(p) + (p.retro ? ' RX' : '') + '</span>'; });
    var evs = c.events.filter(function (e) { return e.t > c.t - 3 * H && e.t < c.t + 36 * H; }).slice(0, 14).map(function (e) {
      return '<span class="' + (e.type === 'aspect' ? 'asp' : 'nx') + '">' + evText(e) + ' ' + stamp(e.t, c.t) + '</span>';
    });
    el.innerHTML = '<span class="inner">' + items.concat(evs).join(' <span class="dm">║</span> ') + '</span>';
  };

  W.mini = function (el, c) {
    var m = c.pos[1], ph = S.moonPhase(c.t), act = S.activity(c.t), nx = next(c);
    var rx = c.pos.filter(function (p) { return p.retro; }).map(function (p) { return BODY[p.id]; });
    el.innerHTML = '<div class="scr"><div class="led-small">' + BODY.moon + ' ' + pad(m.deg) + '° ' + SIGN3[m.sign] + '</div>' +
      '<div class="wh">' + ph.name.toUpperCase() + ' ' + Math.round(ph.illum * 100) + '%</div>' +
      '<div class="kv"><span class="k">RETRO</span><span class="v ' + (rx.length ? 'bad' : 'dm') + '">' + (rx.join(' ') || 'NONE') + '</span>' +
      '<span class="k">IMPACT</span><span class="v ' + (act.value >= 50 ? 'am' : 'cy') + '">' + lvl(act.value) + '</span></div>' +
      '<div>' + bar(act.value / 100, 14) + ' ' + act.value + '</div>' +
      (nx ? '<div class="dm">NEXT ' + evText(nx) + '</div><div class="am">' + cd(nx.t, c.t) + '</div>' : '') + '</div>';
  };

  W.conditions = function (el, c, o) {
    var ph = S.moonPhase(c.t), act = S.activity(c.t);
    var rows = c.pos.filter(function (p) { return !(o.compact && p.id === 'node'); }).map(function (p) {
      return '<tr><td class="t">' + BODY[p.id] + '</td><td class="ev">' + p.name.toUpperCase() + '</td><td class="t">' + posS(p) + '</td>' +
        '<td class="num">' + (p.speed >= 0 ? '+' : '-') + Math.abs(p.speed).toFixed(p.id === 'moon' ? 1 : 2) + '°/d</td><td class="' + (p.retro ? 'bad' : 'ok') + '">' + (p.retro ? 'R' : (p.id === 'node' ? '' : 'D')) + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="scr"><span class="dm">' + dayName(c.t) + ' ' + new Date(c.t).toDateString().slice(4).toUpperCase() + ' ' + hm(c.t) + ' ' + tz(c.t) + '</span>' +
      '<div class="kv"><span class="k">MOON</span><span class="v">' + ph.name.toUpperCase() + ' ' + Math.round(ph.illum * 100) + '%</span>' +
      '<span class="k">IMPACT</span><span class="v ' + (act.value >= 50 ? 'am' : 'cy') + '">' + lvl(act.value) + ' ' + bar(act.value / 100, 12) + ' ' + act.value + '</span></div></div>' +
      '<div class="scr"><table class="board"><thead><tr><th></th><th>BODY</th><th>POSITION</th><th style="text-align:right">SPEED</th><th title="D direct, R retrograde">D/R</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">Geocentric, tropical. R = retrograde.' + (o.compact ? ' <a href="sky.html">All instruments &raquo;</a>' : '') + '</p>';
  };

  W.nextexact = function (el, c) {
    var e = next(c, PRED[ui.nextKind]);
    var tabs = KINDS.map(function (k) { return '<button type="button" data-act="nextKind" data-val="' + k[0] + '" aria-pressed="' + (ui.nextKind === k[0]) + '">' + k[1] + '</button>'; }).join('');
    el.innerHTML = '<div class="tabs" role="group" aria-label="Kind of event">' + tabs + '</div><div class="scr">' +
      (e ? '<div class="wh">' + esc(S.eventPlain(e).toUpperCase()) + '</div><div class="dm">EXACT IN</div><div class="led-time">' + cd(e.t, c.t) + '</div>' +
        '<div class="kv"><span class="k">EXACT AT</span><span class="v">' + stamp(e.t, c.t) + ' ' + tz(e.t) + '</span><span class="k">CODE</span><span class="v">' + evText(e) + '</span></div>'
        : '<div class="dm">NOTHING OF THAT KIND IN THE NEXT 9 DAYS</div>') + '</div>';
  };

  W.flight = function (el, c, o) {
    var t = c.t, tab = o.compact ? '24h' : ui.flightTab, from, to;
    if (tab === 'now') { from = t - 2 * H; to = t + 6 * H; } else if (tab === 'today') { from = midnight(t); to = from + DAY; } else if (tab === '24h') { from = t; to = t + DAY; } else { from = t; to = t + 7 * DAY; }
    var list = c.events.filter(function (e) { return e.t >= from && e.t < to; }), cap = o.compact ? 7 : 40, more = Math.max(0, list.length - cap);
    list = list.slice(0, cap);
    var rows = list.map(function (e) {
      var d = e.t - t, st, cls = '';
      if (d < 0) { st = 'DEPARTED'; cls = 'st-past'; } else if (d < 5 * 60000) { st = 'EXACT'; cls = 'st-exact'; } else if (d < H) { st = 'IMMINENT'; cls = 'st-soon'; } else st = e.type === 'aspect' ? 'APPLYING' : 'SCHEDULED';
      return '<tr class="' + (d < 0 ? 'past' : '') + '"><td class="t">' + stamp(e.t, t) + '</td><td class="ev">' + evText(e) + '</td><td class="' + cls + '">' + st + '</td><td class="cd">' + (d < 0 ? short(d) + ' AGO' : cd(e.t, t)) + '</td></tr>';
    }).join('');
    var tabs = o.compact ? '' : '<div class="tabs" role="group" aria-label="Time window">' + [['now', 'NOW'], ['today', 'TODAY'], ['24h', '24H'], ['7d', '7D']].map(function (k) {
      return '<button type="button" data-act="flightTab" data-val="' + k[0] + '" aria-pressed="' + (tab === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>';
    el.innerHTML = tabs + '<div class="scr"><table class="board"><thead><tr><th>TIME</th><th>EVENT</th><th>STATUS</th><th class="cd">IN</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="dm">NO EVENTS IN THIS WINDOW</td></tr>') + '</tbody></table></div>' +
      '<p class="note">' + (more ? '+' + more + ' more. ' : '') + 'Times in ' + tz(t) + '. Exact times for the slowest pairs are approximate.' + (o.compact ? ' <a href="sky.html">Full board &raquo;</a>' : '') + '</p>';
  };

  W.speed = function (el, c) {
    var rows = c.pos.filter(function (p) { return p.id !== 'node'; }).map(function (p) {
      var b = p.body, pct = Math.max(0, Math.min(1, (p.speed - b.lo) / (b.hi - b.lo)));
      return '<tr><td class="t">' + BODY[p.id] + '</td><td>' + bar(pct, 16) + '</td><td class="num">' + (p.speed >= 0 ? '+' : '-') + Math.abs(p.speed).toFixed(p.id === 'moon' ? 2 : 3) + '</td><td class="' + (p.retro ? 'bad' : 'dm') + '">' + (p.retro ? 'RETRO' : '') + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="scr"><table class="board"><thead><tr><th></th><th>SLOW → FAST (OWN USUAL RANGE)</th><th style="text-align:right">°/DAY</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  };

  /* ── mount, tick, refresh ── */
  function mounts() { return Array.prototype.slice.call(doc.querySelectorAll('[data-widget]')); }
  function render() {
    var c = ctx();
    mounts().forEach(function (el) {
      var fn = W[el.getAttribute('data-widget')]; if (!fn) return;
      fn(el, c, { compact: el.getAttribute('data-compact') !== null });
    });
  }
  function countdowns() {
    var now = Date.now();
    Array.prototype.forEach.call(doc.querySelectorAll('.cd[data-t]'), function (n) { n.textContent = S.countdown(+n.getAttribute('data-t') - now); });
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
    ui[b.getAttribute('data-act')] = b.getAttribute('data-val'); render();
  });
  function init() { render(); setInterval(countdowns, 1000); setInterval(render, 60000); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
