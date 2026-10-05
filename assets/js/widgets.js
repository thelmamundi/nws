/* ═══════════════════════════════════════════════════════════
   WIDGETS: every instrument is a VIEW over the same event stream
   (astro-engine.js). A widget is { render(body, ctx, opts, win) }.
   Mount points are [data-widget="name"] elements in the templates
   (see partials/widget.hbs), so a page picks its instruments just
   by including the partial. Unknown names are ignored.

   Time model: one shared clock. LIVE by default; the Time Control
   panel can freeze it at any moment (+/- 30 days) and every panel
   redraws for that moment. The ON AIR ticker and Sky Now box
   always stay on real time.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var S = window.AstroSky;
  if (!S) return;
  var H = S.H, DAY = S.DAY, doc = document;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── small utils ── */
  function qsa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var fmtHM = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  var fmtDM = new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit' });
  var fmtFull = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function hm(ms) { return fmtHM.format(new Date(ms)); }
  function dayName(ms) { return fmtDay.format(new Date(ms)).toUpperCase(); }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function stamp(ms, ref) { return (sameDay(ms, ref) ? '' : dayName(ms) + ' ') + hm(ms); }
  function stampLong(ms) { return fmtFull.format(new Date(ms)).toUpperCase(); }
  function tzAbbr(ms) {
    try {
      var p = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date(ms));
      for (var i = 0; i < p.length; i++) if (p[i].type === 'timeZoneName') return p[i].value;
    } catch (e) { /* ignore */ }
    return '';
  }
  function short(ms) {
    var m = Math.round(Math.abs(ms) / 60000);
    if (m < 1) return '<1M';
    var d = Math.floor(m / 1440); m -= d * 1440; var h = Math.floor(m / 60); m -= h * 60;
    return d ? d + 'D ' + h + 'H' : (h ? h + 'H' + pad(m) + 'M' : m + 'M');
  }
  function localInput(ms) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function midnight(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function cd(t, now) { return '<span class="cd" data-t="' + Math.round(t) + '">' + S.countdown(t - now) + '</span>'; }

  /* glyph helpers */
  var PG = window.PixelGlyphs;
  function g(s) {
    var n = PG && PG.nameFor(s);
    return n && PG.has(n) ? PG.svg(n) : '<span class="g">' + s + '</span>';
  }
  function gl(id) { return g(S.BY_ID[id].glyph); }
  function aspHTML(a, b, aspId) { return gl(a) + ' ' + g(S.ASPECT_BY_ID[aspId].glyph) + ' ' + gl(b); }
  function posHTML(p) { return p.deg + '°' + pad(p.min) + '′ ' + g(p.signGlyph); }
  function bar(frac, n, full, empty) {
    var k = Math.round(clamp(frac, 0, 1) * n), s = '';
    for (var i = 0; i < n; i++) s += i < k ? (full || '█') : (empty || '░');
    return s;
  }
  function level(s) { return s < 0.2 ? 'LOW' : s < 0.45 ? 'MODERATE' : s < 0.7 ? 'HIGH' : 'SEVERE'; }

  /* a small SHARE button for one ITEM inside a widget (an event, an aspect). It carries its own sentence and moment; share.js does the rest. */
  function utcStr(ms) { return new Date(ms).toUTCString().slice(0, 22) + ' UTC'; }
  function shareBtn() { return ''; }   /* no share server on the static site */
  function evHTML(e, plain) {
    var lab;
    if (e.type === 'aspect') lab = aspHTML(e.a, e.b, e.aspect);
    else if (e.type === 'ingress') lab = gl(e.a) + ' ' + (e.dir > 0 ? 'ENTERS' : 'RE-ENTERS') + ' ' + g(S.SIGNS[e.sign].glyph) + ' ' + S.SIGNS[e.sign].name.toUpperCase();
    else if (e.type === 'station') lab = gl(e.a) + ' STATIONS ' + (e.dir > 0 ? 'DIRECT' : 'RETROGRADE');
    else lab = g('☽︎') + ' ' + e.name.toUpperCase() + ' ' + g(S.SIGNS[e.sign].glyph);
    return lab + (plain ? '<small>' + esc(S.eventPlain(e)) + '</small>' : '');
  }
  function evCat(e) {
    if (e.type === 'aspect') return (e.a === 'moon' || e.b === 'moon') ? 'moon' : 'aspect';
    return e.type;
  }

  /* ── LOCATION (planetary hours only) ── */
  var CITIES = [
    ['New York', 'America/New_York', 40.71, -74.01], ['Los Angeles', 'America/Los_Angeles', 34.05, -118.24], ['Chicago', 'America/Chicago', 41.88, -87.63],
    ['Denver', 'America/Denver', 39.74, -104.99], ['Phoenix', 'America/Phoenix', 33.45, -112.07], ['Anchorage', 'America/Anchorage', 61.22, -149.9],
    ['Honolulu', 'Pacific/Honolulu', 21.31, -157.86], ['Toronto', 'America/Toronto', 43.65, -79.38], ['Vancouver', 'America/Vancouver', 49.28, -123.12],
    ['Mexico City', 'America/Mexico_City', 19.43, -99.13], ['Sao Paulo', 'America/Sao_Paulo', -23.55, -46.63], ['Buenos Aires', 'America/Argentina/Buenos_Aires', -34.6, -58.38],
    ['Reykjavik', 'Atlantic/Reykjavik', 64.15, -21.94], ['London', 'Europe/London', 51.51, -0.13], ['Dublin', 'Europe/Dublin', 53.35, -6.26],
    ['Paris', 'Europe/Paris', 48.86, 2.35], ['Berlin', 'Europe/Berlin', 52.52, 13.4], ['Madrid', 'Europe/Madrid', 40.42, -3.7], ['Rome', 'Europe/Rome', 41.9, 12.5],
    ['Athens', 'Europe/Athens', 37.98, 23.73], ['Istanbul', 'Europe/Istanbul', 41.01, 28.98], ['Moscow', 'Europe/Moscow', 55.75, 37.62],
    ['Cairo', 'Africa/Cairo', 30.04, 31.24], ['Lagos', 'Africa/Lagos', 6.52, 3.38], ['Nairobi', 'Africa/Nairobi', -1.29, 36.82], ['Johannesburg', 'Africa/Johannesburg', -26.2, 28.05],
    ['Dubai', 'Asia/Dubai', 25.2, 55.27], ['Mumbai', 'Asia/Kolkata', 19.08, 72.88], ['Bangkok', 'Asia/Bangkok', 13.76, 100.5], ['Singapore', 'Asia/Singapore', 1.35, 103.82],
    ['Hong Kong', 'Asia/Hong_Kong', 22.32, 114.17], ['Shanghai', 'Asia/Shanghai', 31.23, 121.47], ['Seoul', 'Asia/Seoul', 37.57, 126.98], ['Tokyo', 'Asia/Tokyo', 35.68, 139.69],
    ['Sydney', 'Australia/Sydney', -33.87, 151.21], ['Auckland', 'Pacific/Auckland', -36.85, 174.76]
  ];
  var userTz = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  function defaultLoc() {
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i][1] === userTz) return { name: CITIES[i][0], tz: userTz, lat: CITIES[i][2], lng: CITIES[i][3], approx: false };
    return { name: 'Your time zone (approx.)', tz: userTz, lat: 40, lng: -new Date().getTimezoneOffset() / 60 * 15, approx: true };
  }
  var loc = (function () {
    try { var s = JSON.parse(store('aw98_loc') || 'null'); if (s && isFinite(s.lat) && isFinite(s.lng) && s.tz) return s; } catch (e) { /* ignore */ }
    return defaultLoc();
  })();
  function setLoc(l) { loc = l; store('aw98_loc', JSON.stringify(l)); ctxCache = {}; }
  function topoOpt() { return loc && !loc.approx ? { topo: { lat: loc.lat, lng: loc.lng } } : undefined; }   /* the Moon, as seen from where you are */
  function clockFor(t) { return S.planetaryClock(t, loc.lat, loc.lng, loc.tz); }


  /* ── PLACE SEARCH: city / state autocomplete (OpenStreetMap Nominatim) + time zone (Open-Meteo). Runs only when the visitor types or taps. ── */
  function placeLabel(r) {
    var a = r.address || {}, name = a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || r.name || '',
        st = a['ISO3166-2-lvl4'] ? String(a['ISO3166-2-lvl4']).split('-').pop() : (a.state || ''), cc = (a.country_code || '').toUpperCase();
    return name + (st ? ', ' + st : '') + (cc && cc !== 'US' ? ', ' + (a.country || cc) : '');
  }
  function nearestCity(lat, lng) {
    var best = null, bd = 1e9; CITIES.forEach(function (c) { var d = Math.pow(c[2] - lat, 2) + Math.pow((c[3] - lng) * Math.cos(lat * Math.PI / 180), 2); if (d < bd) { bd = d; best = c; } });
    return best;
  }
  function lookupTz(lat, lng) {                                    /* resolves { tz, guessed } */
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(3) + '&longitude=' + lng.toFixed(3) + '&current=temperature_2m&timezone=auto')
      .then(function (r) { if (!r.ok) throw new Error('tz'); return r.json(); })
      .then(function (j) { if (!j.timezone) throw new Error('tz'); return { tz: j.timezone, guessed: false }; })
      .catch(function () { var c = nearestCity(lat, lng); return { tz: c[1], guessed: true }; });
  }
  function placeSearch(host, opts) {
    opts = opts || {};
    var id = 'ps' + Math.floor(Math.random() * 1e6), timer = null, ctl = null, results = [], cur = -1;
    host.innerHTML = '<div class="psearch"><input id="' + id + '" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id + '-l" autocomplete="off" spellcheck="false" maxlength="80" placeholder="' + esc(opts.placeholder || 'City, State (or country)') + '">' +
      '<ul id="' + id + '-l" class="plist" role="listbox" hidden></ul>' + (opts.geo ? '<button type="button" class="chip-btn pgeo">' + esc(opts.geoLabel || 'Use my current location') + '</button>' : '') + '<span class="pnote" role="status" aria-live="polite"></span></div>';
    var inp = host.querySelector('input'), ul = host.querySelector('.plist'), note = host.querySelector('.pnote');
    function close() { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); cur = -1; }
    function pick(r) {
      close(); var label = r.label; inp.value = label; note.textContent = 'Finding the time zone…';
      lookupTz(r.lat, r.lng).then(function (z) { note.textContent = z.guessed ? 'Time zone estimated from the nearest listed city. Check the result.' : ''; if (opts.onPick) opts.onPick({ name: label, lat: r.lat, lng: r.lng, tz: z.tz, guessed: z.guessed }); });
    }
    function draw() {
      ul.innerHTML = results.map(function (r, i) { return '<li role="option" id="' + id + '-o' + i + '" data-i="' + i + '" aria-selected="' + (i === cur) + '">' + esc(r.label) + '</li>'; }).join('');
      ul.hidden = !results.length; inp.setAttribute('aria-expanded', String(!!results.length));
    }
    function search(q) {
      if (ctl) ctl.abort(); ctl = window.AbortController ? new AbortController() : null; note.textContent = 'Searching…';
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=' + encodeURIComponent(q), ctl ? { signal: ctl.signal } : {})
        .then(function (r) { if (!r.ok) throw new Error('search'); return r.json(); })
        .then(function (j) {
          var seen = {}; results = j.filter(function (r) { return r.lat && r.lon; }).map(function (r) { return { label: placeLabel(r), lat: +r.lat, lng: +r.lon }; }).filter(function (r) { if (!r.label || seen[r.label]) return false; seen[r.label] = 1; return true; });
          note.textContent = results.length ? '' : 'No match. Try the city and state, or pick from the list below.'; draw();
        }).catch(function (e) { if (e && e.name === 'AbortError') return; note.textContent = 'Place search is not available right now. Pick from the list instead.'; results = []; draw(); });
    }
    inp.addEventListener('input', function () { clearTimeout(timer); var q = inp.value.trim(); if (q.length < 3) { results = []; draw(); note.textContent = ''; return; } timer = setTimeout(function () { search(q); }, 500); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); cur = (cur + 1) % results.length; draw(); inp.setAttribute('aria-activedescendant', id + '-o' + cur); }
      else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); cur = (cur - 1 + results.length) % results.length; draw(); inp.setAttribute('aria-activedescendant', id + '-o' + cur); }
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); pick(results[cur]); }
      else if (e.key === 'Escape') close();
    });
    ul.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); pick(results[+li.getAttribute('data-i')]); } });
    inp.addEventListener('blur', function () { setTimeout(close, 120); });
    var gb = host.querySelector('.pgeo');
    if (gb) gb.addEventListener('click', function () {
      if (!navigator.geolocation) { note.textContent = 'Your browser cannot share its location.'; return; }
      note.textContent = 'Asking your device…';
      navigator.geolocation.getCurrentPosition(function (p) {
        var lat = p.coords.latitude, lng = p.coords.longitude;
        fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=en&lat=' + lat + '&lon=' + lng).then(function (r) { return r.json(); }).then(function (j) { return placeLabel(j) || 'My location'; }, function () { return 'My location'; })
          .then(function (label) { inp.value = label; pick({ label: label, lat: lat, lng: lng }); });
      }, function () { note.textContent = 'Location was not shared. Search for a place instead.'; }, { timeout: 10000, maximumAge: 600000 });
    });
    return { set: function (label) { inp.value = label; } };
  }

  /* ── STATE ── */
  var state = { frozen: false, ms: Date.now() };
  var ui = { nextKind: 'any', flightTab: 'today', flightTypes: { aspect: 1, moon: 1, ingress: 1, station: 1, lunation: 1 }, logWin: 'midnight',
             speedMode: 'gauge', radarWin: 24, actWin: 24, seisWin: 24, diffA: null, diffB: null, actHover: null, aspFilter: 'all' };
  function nowMs() { return state.frozen ? state.ms : Date.now(); }

  /* ── CONTEXT CACHE: one position/aspect/event computation shared by all widgets ── */
  var evSlots = {}, ctxCache = {};
  function eventsFor(t, slot) {
    var e = evSlots[slot];
    if (!e || Math.abs(t - e.center) > 12 * H) {
      e = { center: t, from: t - 72 * H, to: t + 9 * DAY };
      e.list = S.scan(e.from, e.to);
      evSlots[slot] = e;
    }
    return evSlots[slot].list;
  }
  function ctx(t, slot) {
    slot = slot || 'main';
    var key = slot + Math.floor(t / 1000), c = ctxCache[key];
    if (c) return c;
    ctxCache = {};
    c = { t: t, slot: slot, pos: S.positions(t, topoOpt()) };
    c.asp = S.aspects(t, topoOpt() ? S.positions(t) : c.pos);
    c.events = eventsFor(t, slot);
    c.live = !state.frozen || slot === 'live';
    ctxCache[key] = c;
    return c;
  }
  function nextEvent(c, pred) {
    for (var i = 0; i < c.events.length; i++) if (c.events[i].t > c.t && (!pred || pred(c.events[i]))) return c.events[i];
    return null;
  }
  function prevEvent(c, pred) {
    for (var i = c.events.length - 1; i >= 0; i--) if (c.events[i].t <= c.t && (!pred || pred(c.events[i]))) return c.events[i];
    return null;
  }

  var W = {};          /* name -> widget */

  /* ───────────────────────── CURRENT CONDITIONS ───────────────────────── */
  W.conditions = { render: function (el, c, o) {
    var ph = S.moonPhase(c.t), ck = clockFor(c.t), act = S.activity(c.t);
    var hour = ck.current, ie = impactWhy(c, c.t, c.t + 24 * H), iw = ie ? { a: ie.a, b: ie.b, aspect: ie.aspect, t: ie.t } : null;
    var head = '<span class="hd">' + stampLong(c.t) + ' ' + tzAbbr(c.t) + (c.live ? '' : ' <span class="red">[FROZEN]</span>') + '</span>' +
      '<div class="kv">' +
      '<span class="k">MOON</span><span class="v">' + g('☽︎') + ' ' + esc(ph.name.toUpperCase()) + ' ' + Math.round(ph.illum * 100) + '%</span>' +
      '<span class="k">DAY / HOUR</span><span class="v">' + gl(ck.dayRuler) + ' / ' + gl(hour.ruler) + '</span>' +
      '<span class="k">IMPACT</span><span class="v ' + (act.value >= 50 ? 'amber' : 'cy') + '">' + impactWord(act.value) + (iw ? ' <span class="dm">' + aspHTML(iw.a, iw.b, iw.aspect) + ' ' + hm(iw.t) + '</span>' : '') + '</span>' +
      '</div>';
    var rows = c.pos.filter(function (p) { return !(o.compact && p.id === 'node'); }).map(function (p) {
      return '<tr><td class="t">' + g(p.glyph) + '</td><td class="ev">' + p.name.toUpperCase() + '</td><td class="t">' + posHTML(p) + '</td>' +
        '<td class="num col-st">' + (p.speed >= 0 ? '+' : '−') + Math.abs(p.speed).toFixed(p.id === 'moon' ? 1 : 2) + '°/d</td>' +
        '<td class="' + (p.retro ? 'rx red' : 'st-soon') + '">' + (p.retro ? '℞' : (p.id === 'node' ? '' : 'D')) + '</td></tr>';
    }).join('');
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div data-main></div><div class="locrow"><div data-ps></div><p class="note" data-locnote></p></div>';
      placeSearch(el.querySelector('[data-ps]'), { placeholder: 'Your city, state', geo: true, geoLabel: 'Use my location', onPick: function (p) { setLoc({ name: p.name, tz: p.tz, lat: p.lat, lng: p.lng, approx: false }); schedule(true); } });
    }
    el.querySelector('[data-locnote]').innerHTML = loc.approx ? 'Moon shown as seen from the centre of the Earth. Add your place and it is shown as seen from <em>where you are</em> (it can differ by up to a degree).' : 'Moon degrees and minutes are for <b>' + esc(loc.name) + '</b>. From other places the Moon sits up to a degree away.';
    el.querySelector('[data-main]').innerHTML = '<div class="sunken scr">' + head + '</div>' +
      '<div class="sunken"><table class="board"><thead><tr><th></th><th>BODY</th><th>POSITION</th><th class="col-st">SPEED</th><th title="D = direct, R = retrograde">D/R</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (o.compact ? '<p class="note"><a href="/sky/">All instruments &raquo;</a></p>' : '<p class="note">Positions are geocentric tropical.</p>');
  } };

  /* ───────────────────────── NEXT EXACT THING ───────────────────────── */
  var KINDS = [['any', 'ANY'], ['aspect', 'ASPECT'], ['planets', 'NO MOON'], ['ingress', 'INGRESS'], ['station', 'STATION'], ['lunation', 'LUNAR']];
  function kindPred(k) {
    return {
      any: null,
      aspect: function (e) { return e.type === 'aspect'; },
      planets: function (e) { return e.type === 'aspect' && e.a !== 'moon' && e.b !== 'moon'; },
      ingress: function (e) { return e.type === 'ingress'; },
      station: function (e) { return e.type === 'station'; },
      lunation: function (e) { return e.type === 'lunation'; }
    }[k];
  }
  W.nextexact = { render: function (el, c) {
    var e = nextEvent(c, kindPred(ui.nextKind)), detail = '', note = '';
    if (e) {
      if (e.type === 'aspect') {
        var A = S.BY_ID[e.a], B = S.BY_ID[e.b], asp = S.ASPECT_BY_ID[e.aspect];
        var orb = Math.abs(S.sepAbs(S.lon(e.a, c.t), S.lon(e.b, c.t)) - asp.angle);
        detail = '<span class="k">CURRENT ORB</span><span class="v">' + S.fmtOrb(orb) + ' applying</span>';
        var rel = Math.abs(S.speed(e.a, e.t) - S.speed(e.b, e.t));
        if (rel < 0.08) note = '<p class="note">Slow pair (' + rel.toFixed(3) + '°/day apart): the exact time is approximate, give or take several hours.</p>';
      } else if (e.type === 'ingress') {
        var p = c.pos[S.BY_ID[e.a].i];
        detail = '<span class="k">POSITION NOW</span><span class="v">' + posHTML(p) + '</span>';
      } else if (e.type === 'station') {
        var q = c.pos[S.BY_ID[e.a].i];
        detail = '<span class="k">SPEED NOW</span><span class="v">' + (q.speed >= 0 ? '+' : '−') + Math.abs(q.speed).toFixed(3) + '°/day</span>';
      } else {
        var m = c.pos[1];
        detail = '<span class="k">MOON NOW</span><span class="v">' + posHTML(m) + '</span>';
      }
    }
    var tabs = KINDS.map(function (k) { return '<button type="button" data-act="nextKind" data-val="' + k[0] + '" aria-pressed="' + (ui.nextKind === k[0]) + '">' + k[1] + '</button>'; }).join('');
    el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Kind of event">' + tabs + '</div>' +
      '<div class="sunken scr">' +
      (e ? '<div class="big-label">' + evHTML(e) + shareBtn(S.eventPlain(e) + ', exact ' + utcStr(e.t) + '.', e.t) + '</div><div class="dm">EXACT IN</div><div class="led-time">' + cd(e.t, c.t) + '</div>' +
           '<div class="kv"><span class="k">EXACT AT</span><span class="v">' + stampLong(e.t) + ' ' + tzAbbr(e.t) + '</span>' + detail + '</div>'
         : '<div class="dm">NOTHING OF THAT KIND IN THE NEXT 9 DAYS</div>') +
      '</div>' + note;
  } };

  /* ───────────────────────── FLIGHT BOARD ───────────────────────── */
  var FTABS = [['now', 'NOW'], ['today', 'TODAY'], ['24h', '24H'], ['7d', '7D']];
  var FCHIPS = [['aspect', '☌ Aspects'], ['moon', '☽ Moon'], ['ingress', '♈ Ingress'], ['station', '℞ Stations'], ['lunation', '● Lunations']];
  W.flight = { render: function (el, c, o) {
    var t = c.t, from, to, tab = o.compact ? (o.tab || '24h') : ui.flightTab;
    if (tab === 'now') { from = t - 2 * H; to = t + 6 * H; }
    else if (tab === 'today') { from = midnight(t); to = from + DAY; }
    else if (tab === '24h') { from = t; to = t + DAY; }
    else { from = t; to = t + 7 * DAY; }
    var types = ui.flightTypes;
    var list = c.events.filter(function (e) { return e.t >= from && e.t < to && types[evCat(e)]; });
    var cap = o.compact ? 6 : 40, more = Math.max(0, list.length - cap);
    if (o.compact && tab === 'today') { /* keep the next few, not the stale morning */
      var upcoming = list.filter(function (e) { return e.t >= t - 30 * 60000; }); if (upcoming.length) list = upcoming;
    }
    list = list.slice(0, cap);
    var rows = list.map(function (e) {
      var d = e.t - t, st, cls = '';
      if (d < 0) { st = 'DEPARTED'; cls = 'st-past'; }
      else if (d < 5 * 60000) { st = 'EXACT'; cls = 'st-exact'; }
      else if (d < H) { st = 'IMMINENT'; cls = 'st-soon'; }
      else if (e.type === 'aspect') st = 'APPLYING';
      else st = 'SCHEDULED';
      return '<tr class="' + (d < 0 ? 'past ' : '') + (evCat(e) === 'moon' ? 'moon' : '') + '"><td class="t">' + stamp(e.t, t) + '</td><td class="ev">' + evHTML(e, !o.compact) + shareBtn(S.eventPlain(e) + ', exact ' + utcStr(e.t) + '.', e.t) + '</td>' +
        '<td class="col-st ' + cls + '">' + st + '</td><td class="cd">' + (d < 0 ? short(d) + ' AGO' : cd(e.t, t)) + '</td></tr>';
    }).join('');
    var tabsHtml = o.compact ? '' : '<div class="panel-row"><div class="tabs" role="group" aria-label="Time window">' +
      FTABS.map(function (k) { return '<button type="button" data-act="flightTab" data-val="' + k[0] + '" aria-pressed="' + (tab === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<div class="tabs" role="group" aria-label="Event types">' + FCHIPS.map(function (k) {
        return '<button type="button" data-act="flightType" data-val="' + k[0] + '" aria-pressed="' + !!types[k[0]] + '">' + k[1] + '</button>'; }).join('') + '</div></div>';
    el.innerHTML = tabsHtml +
      '<div class="sunken"><table class="board"><thead><tr><th>TIME</th><th>EVENT</th><th class="col-st">STATUS</th><th style="text-align:right">IN</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="dm">NO EVENTS IN THIS WINDOW</td></tr>') + '</tbody></table></div>' +
      (more ? '<p class="note">+' + more + ' more in this window. Narrow the filters to see them.</p>' : '') +
      (o.compact ? '<p class="note"><a href="/sky/">Full board &raquo;</a> &nbsp; times in ' + tzAbbr(t) + '</p>' : '<p class="note">Times in ' + tzAbbr(t) + '. Exact times for the slowest planet pairs are approximate.</p>');
  } };

  /* ───────────────────────── SKY CHANGELOG ───────────────────────── */
  var LOGW = [['midnight', 'SINCE MIDNIGHT'], ['6h', 'LAST 6H'], ['24h', 'LAST 24H'], ['48h', 'LAST 48H']];
  W.changelog = { render: function (el, c) {
    var t = c.t, from = ui.logWin === 'midnight' ? midnight(t) : t - ({ '6h': 6, '24h': 24, '48h': 48 }[ui.logWin]) * H;
    var d = new Date(t), ver = 'v' + d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
    var today = c.events.filter(function (e) { return e.t >= midnight(t) && e.t <= t; }).length;
    var items = c.events.filter(function (e) { return e.t >= from && e.t <= t; }).map(function (e) {
      return { t: e.t, html: evHTML(e) + (e.type === 'aspect' ? ' <span class="dm">perfected</span>' : '') + shareBtn(S.eventPlain(e) + ' at ' + utcStr(e.t) + '.', e.t) };
    });
    var ck = clockFor(t);
    if (ck.rise >= from && ck.rise <= t) items.push({ t: ck.rise, html: g('☉︎') + ' <span class="dm">planetary day began</span> ' + gl(ck.dayRuler) });
    if (ck.set >= from && ck.set <= t) items.push({ t: ck.set, html: g('☉︎') + ' <span class="dm">night hours began</span>' });
    items.sort(function (a, b) { return b.t - a.t; });
    var lines = items.map(function (i) { return '<div><span class="wh">' + stamp(i.t, t) + '</span>  ' + i.html + '</div>'; }).join('');
    var tabs = LOGW.map(function (k) { return '<button type="button" data-act="logWin" data-val="' + k[0] + '" aria-pressed="' + (ui.logWin === k[0]) + '">' + k[1] + '</button>'; }).join('');
    el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Window">' + tabs + '</div>' +
      '<div class="sunken scr"><span class="hd">SKY CHANGELOG ' + ver + ' r' + today + '</span>' +
      (lines || '<span class="dm">NO CHANGES IN THIS WINDOW</span>') + '</div>';
  } };

  /* ───────────────────────── SINCE YOUR LAST VISIT ───────────────────────── */
  var visit = (function () {
    var prev = null;
    try {
      var seen = sessionStorage.getItem('aw98_seen'), last = localStorage.getItem('aw98_last');
      if (seen) prev = +sessionStorage.getItem('aw98_prev') || null;
      else { prev = last ? +last : null; if (prev) sessionStorage.setItem('aw98_prev', String(prev)); sessionStorage.setItem('aw98_seen', '1'); localStorage.setItem('aw98_last', String(Date.now())); }
      window.addEventListener('pagehide', function () { try { localStorage.setItem('aw98_last', String(Date.now())); } catch (e) { /* ignore */ } });
    } catch (e) { /* storage blocked: feature quietly off */ }
    return prev;
  })();
  var sinceCache = {};
  W.since = { render: function (el, c, o, win) {
    var hide = function (v) { if (win) win.hidden = v; };
    var now = Date.now();
    if (!visit || visit > now) { if (o.home) { hide(true); return; } hide(false); el.innerHTML = '<div class="sunken scr"><span class="dm">FIRST VISIT ON THIS BROWSER. Come back later and this panel will show what moved while you were away. Nothing leaves your browser; the time of your last visit is stored locally.</span></div>'; return; }
    var gap = now - visit;
    if (gap < 5 * 60000) { if (o.home) { hide(true); return; } hide(false); el.innerHTML = '<div class="sunken scr"><span class="dm">WELCOME BACK. Less than five minutes since your last visit; nothing to report yet.</span></div>'; return; }
    hide(false);
    var prev = Math.max(visit, now - 30 * DAY), key = Math.floor(now / 60000);
    var s = sinceCache[key];
    if (!s) {
      var df = S.diff(prev, now), ev = S.scan(prev, now, { step: gap > 7 * DAY ? 3 * H : H }).filter(function (e) { return !(e.type === 'aspect' && (e.a === 'moon' || e.b === 'moon')); });
      sinceCache = {}; s = sinceCache[key] = { df: df, ev: ev };
    }
    var df2 = s.df, lines = [];
    df2.moved.filter(function (m) { return m.id !== 'node'; }).forEach(function (m) {
      if (m.id === 'moon' || m.signChange) lines.push('<div>' + gl(m.id) + ' <span class="wh">' + posHTML(m.from) + '</span> → <span class="wh">' + posHTML(m.to) + '</span>' + (m.signChange && m.id !== 'moon' ? ' <span class="pk">CHANGED SIGN</span>' : '') + '</div>');
    });
    df2.changed.slice(0, o.home ? 4 : 8).forEach(function (x) {
      var st = (x.then.applying && !x.now.applying) ? '<span class="red">PASSED EXACT, NOW SEPARATING</span>' : (x.now.orb < x.then.orb ? '<span class="gr">TIGHTENING</span>' : '<span class="amber">LOOSENING</span>');
      lines.push('<div>' + aspHTML(x.now.a.id, x.now.b.id, x.now.aspect.id) + ' <span class="dm">' + S.fmtOrb(x.then.orb) + ' → ' + S.fmtOrb(x.now.orb) + '</span> ' + st + '</div>');
    });
    df2.added.slice(0, 4).forEach(function (x) { lines.push('<div><span class="gr">+</span> ' + aspHTML(x.a.id, x.b.id, x.aspect.id) + ' <span class="dm">entered orb (' + S.fmtOrb(x.orb) + ')</span></div>'); });
    df2.removed.slice(0, 4).forEach(function (x) { lines.push('<div><span class="red">−</span> ' + aspHTML(x.a.id, x.b.id, x.aspect.id) + ' <span class="dm">left orb</span></div>'); });
    var exact = s.ev.filter(function (e) { return e.type === 'aspect'; }).slice(-4).map(function (e) { return '<div><span class="pk">EXACT</span> ' + evHTML(e) + ' <span class="dm">' + short(now - e.t) + ' ago</span></div>'; });
    el.innerHTML = '<div class="sunken scr"><span class="hd">SINCE YOUR LAST VISIT · ' + short(gap) + ' AGO</span>' + (lines.join('') + exact.join('') || '<span class="dm">NOTHING MAJOR MOVED.</span>') + '</div>' +
      '<p class="note">Compared against your own last visit, stored only in this browser.</p>';
  } };


  /* ───────────────────────── CURRENT ASPECTS (members): every aspect in orb, with exact and leave-orb times ───────────────────────── */
  var exactCache2 = {};
  function exactNear(a, b, asp, t, c) {
    var key = a + b + asp.id + Math.floor(t / (6 * H));
    if (key in exactCache2) return exactCache2[key];
    var best = null, i;
    if (a === 'moon' || b === 'moon') {
      c.events.forEach(function (e) { if (e.type === 'aspect' && e.aspect === asp.id && ((e.a === a && e.b === b) || (e.a === b && e.b === a)) && (!best || Math.abs(e.t - t) < Math.abs(best - t))) best = e.t; });
    } else {
      var fast = ['sun', 'mercury', 'venus', 'mars'], isFast = fast.indexOf(a) >= 0 && fast.indexOf(b) >= 0, span = isFast ? 40 * DAY : 220 * DAY, step = isFast ? 4 * H : 12 * H, sgs = (asp.angle === 0 || asp.angle === 180) ? [1] : [1, -1];
      sgs.forEach(function (sg) {
        var h = function (tt) { return S.wrap180(S.wrap180(S.lon(a, tt) - S.lon(b, tt)) - sg * asp.angle); }, tt = t - span, prev = h(tt);
        for (i = 0; i < span * 2 / step; i++) {
          var t2 = tt + step, cur = h(t2);
          if (((prev < 0) !== (cur < 0)) && Math.abs(prev) < 30 && Math.abs(cur) < 30) {
            var lo = tt, hi = t2, f0 = prev;
            for (var n = 0; n < 16; n++) { var mid = (lo + hi) / 2, fm = h(mid); if ((fm < 0) === (f0 < 0)) { lo = mid; f0 = fm; } else hi = mid; }
            var te = (lo + hi) / 2; if (!best || Math.abs(te - t) < Math.abs(best - t)) best = te;
          }
          prev = cur; tt = t2;
        }
      });
    }
    if (Object.keys(exactCache2).length > 300) exactCache2 = {};
    return (exactCache2[key] = best);
  }
  W.aspects = { render: function (el, c) {
    var modes = [['all', 'ALL'], ['nomoon', 'NO MOON'], ['tight', 'TIGHT (UNDER 1°)']];
    var list = c.asp.filter(function (x) { return ui.aspFilter === 'nomoon' ? (x.a.id !== 'moon' && x.b.id !== 'moon') : ui.aspFilter === 'tight' ? x.orb < 1 : true; });
    var tight = c.asp.filter(function (x) { return x.orb < 1; }).length;
    var rows = list.map(function (x) {
      var ex = exactNear(x.a.id, x.b.id, x.aspect, c.t, c), lv = ex ? S.orbWindow(x.a.id, x.b.id, x.aspect.id, ex, x.limit) : null;
      return '<tr><td class="ev">' + aspHTML(x.a.id, x.b.id, x.aspect.id) + shareBtn(x.a.name + ' ' + x.aspect.name.toLowerCase() + ' ' + x.b.name + ', ' + S.fmtOrb(x.orb) + (x.applying ? ' and applying' : ' and separating') + (ex ? ', exact ' + utcStr(ex) : '') + '.', ex || c.t) + '</td><td class="t">' + S.fmtOrb(x.orb) + '</td><td class="' + (x.applying ? 'amber' : 'dm') + '">' + (x.applying ? 'APPLYING' : 'SEPARATING') + '</td>' +
        '<td class="t">' + (ex ? stamp(ex, c.t) + '<small>' + (ex > c.t ? 'in ' + short(ex - c.t) : short(c.t - ex) + ' ago') + '</small>' : '—') + '</td>' +
        '<td class="t col-st">' + (lv && lv.leave ? stamp(lv.leave, c.t) + '<small>' + (lv.leave > c.t ? 'in ' + short(lv.leave - c.t) : 'past') + '</small>' : '—') + '</td>' +
        '<td class="amber col-st blocks">' + bar(x.strength, 8) + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Filter">' + modes.map(function (m) { return '<button type="button" data-act="aspFilter" data-val="' + m[0] + '" aria-pressed="' + (ui.aspFilter === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<div class="sunken scr"><span class="hd">' + c.asp.length + ' ACTIVE ASPECTS · ' + tight + ' TIGHT</span><span class="dm">Orbs: conjunction/opposition 6°, square/trine 5°, sextile 4° (Moon 3°). Exact times for the slowest pairs are approximate.</span></div>' +
      '<div class="sunken"><table class="board"><thead><tr><th>ASPECT</th><th>ORB</th><th>STATE</th><th>EXACT</th><th class="col-st">LEAVES ORB</th><th class="col-st">PRESSURE</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6" class="dm">NOTHING IN ORB</td></tr>') + '</tbody></table></div>';
  } };

  /* ───────────────────────── MOON ───────────────────────── */
  W.moon = { render: function (el, c) {
    var m = c.pos[1], ph = S.moonPhase(c.t), ing = nextEvent(c, function (e) { return e.type === 'ingress' && e.a === 'moon'; });
    var nx = nextEvent(c, function (e) { return e.type === 'aspect' && (e.a === 'moon' || e.b === 'moon'); });
    var voc = S.moonVoc(c.t, c.events), vocHtml = '';
    if (voc && voc.ingress) {
      var ingT = voc.ingress.t, startT = voc.lastAspect ? voc.lastAspect.t : c.t;
      var win = ingT - Math.max(startT, c.t), span = ingT - c.t, N = 34;
      var vs = clamp((Math.max(startT, c.t) - c.t) / span, 0, 1), k0 = Math.round(vs * N), line = '';
      for (var i = 0; i < N; i++) line += i < k0 ? '─' : '█';
      vocHtml = '<span class="hd">LUNAR CONNECTION</span>' +
        '<div class="big-label ' + (voc.voc ? 'red' : 'gr') + '">' + (voc.voc ? '● VOID OF COURSE' : '● CONNECTED') + '</div>' +
        '<div class="kv"><span class="k">LAST ASPECT BEFORE INGRESS</span><span class="v">' + (voc.lastAspect ? evHTML(voc.lastAspect) + ' ' + stamp(voc.lastAspect.t, c.t) : '—') + '</span>' +
        '<span class="k">INGRESS</span><span class="v">' + g(S.SIGNS[voc.ingress.sign].glyph) + ' ' + stamp(ingT, c.t) + '</span>' +
        '<span class="k">VOC WINDOW</span><span class="v">' + short(win) + '</span></div>' +
        '<pre class="blocks">' + line + '\n' + hm(c.t) + ' now' + new Array(21).join(' ') + hm(ingT) + '</pre>' +
        '<span class="dm">Ptolemaic aspects to Sun–Pluto, 1° of exactness (modern definition).</span>';
    }
    var sp = m.speed, spd = Math.floor(sp) + '°' + pad(Math.round((sp - Math.floor(sp)) * 60)) + '′';
    el.innerHTML = '<div class="sunken scr"><div class="big-label">' + g('☽︎') + ' ' + posHTML(m) + '</div><div class="kv">' +
      '<span class="k">SPEED</span><span class="v">' + spd + '/day</span>' +
      '<span class="k">PHASE</span><span class="v">' + esc(ph.name) + '</span>' +
      '<span class="k">ILLUMINATION</span><span class="v amber">' + bar(ph.illum, 14) + ' ' + (ph.illum * 100).toFixed(1) + '%</span>' +
      '<span class="k">DECLINATION</span><span class="v">' + (m.dec >= 0 ? '+' : '−') + Math.abs(m.dec).toFixed(1) + '°' + (m.oob ? ' <span class="pk">OUT OF BOUNDS</span>' : '') + '</span>' +
      '<span class="k">NEXT ASPECT</span><span class="v">' + (nx ? evHTML(nx) + ' <span class="cy">' + cd(nx.t, c.t) + '</span>' : '—') + '</span>' +
      '<span class="k">NEXT INGRESS</span><span class="v">' + (ing ? g(S.SIGNS[ing.sign].glyph) + ' ' + S.SIGNS[ing.sign].name.toUpperCase() + ' <span class="cy">' + cd(ing.t, c.t) + '</span>' : '—') + '</span>' +
      '</div></div>' + (vocHtml ? '<div class="sunken scr">' + vocHtml + '</div>' : '');
  } };

  /* ───────────────────────── PLANETARY CLOCK ───────────────────────── */
  W.clock = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="panel-row"><label for="loc-sel">Location:</label> <select id="loc-sel" data-loc></select> <button type="button" class="chip-btn" data-act="geo">Use my location</button></div><div data-out></div>';
      var sel = el.querySelector('select');
      var names = CITIES.map(function (x) { return x[0]; }), html = '';
      if (names.indexOf(loc.name) < 0) html += '<option value="__cur">' + esc(loc.name) + '</option>';
      CITIES.forEach(function (x, i) { html += '<option value="' + i + '">' + esc(x[0]) + '</option>'; });
      sel.innerHTML = html;
      sel.addEventListener('change', function () {
        var v = sel.value; if (v === '__cur') return;
        var x = CITIES[+v]; setLoc({ name: x[0], tz: x[1], lat: x[2], lng: x[3], approx: false }); schedule(true);
      });
    }
    var sel2 = el.querySelector('select');
    var idx = -1; CITIES.forEach(function (x, i) { if (x[0] === loc.name) idx = i; });
    sel2.value = idx >= 0 ? String(idx) : '__cur';
    var ck = clockFor(c.t), hr = ck.current, frac = (c.t - hr.start) / (hr.end - hr.start);
    var next = ck.next.map(function (h) { return '<div>' + gl(h.ruler) + ' ' + h.ruler.toUpperCase() + '  <span class="wh">' + hm(h.start) + '</span></div>'; }).join('');
    var tzNote = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: loc.tz });
    el.querySelector('[data-out]').innerHTML = '<div class="sunken scr"><span class="hd">PLANETARY CLOCK</span>' +
      '<div class="kv"><span class="k">DAY RULER</span><span class="v">' + gl(ck.dayRuler) + ' ' + ck.dayRuler.toUpperCase() + '</span>' +
      '<span class="k">CURRENT HOUR</span><span class="v">' + gl(hr.ruler) + ' ' + hr.ruler.toUpperCase() + ' <span class="dm">(' + (hr.day ? 'day' : 'night') + ' hour ' + ((hr.n % 12) + 1) + ')</span></span>' +
      '<span class="k">REMAINING</span><span class="v cy">' + short(hr.end - c.t) + '</span>' +
      '<span class="k">SUNRISE / SUNSET</span><span class="v">' + tzNote.format(new Date(ck.rise)) + ' / ' + tzNote.format(new Date(ck.set)) + ' <span class="dm">(' + esc(loc.name) + ')</span></span></div>' +
      '<div class="amber">' + bar(frac, 28) + '</div>' +
      '<span class="hd" style="margin-top:6px">NEXT</span>' + next +
      (ck.polar ? '<div class="red">Polar day/night here: using 12 equal hours around solar noon.</div>' : '') +
      (loc.approx ? '<div class="dm">Location guessed from your time zone. Pick a city or use your location for better sunrise times.</div>' : '') + '</div>';
  } };

  /* ───────────────────────── SPEED ───────────────────────── */
  W.speed = { render: function (el, c) {
    var rows = c.pos.filter(function (p) { return p.id !== 'node'; });
    var modes = [['gauge', 'GAUGES'], ['race', 'RACE'], ['pct', 'RACE % TYPICAL']];
    var tabs = '<div class="panel-row tabs" role="group" aria-label="View">' + modes.map(function (m) { return '<button type="button" data-act="speedMode" data-val="' + m[0] + '" aria-pressed="' + (ui.speedMode === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>';
    var out = '';
    function stationNote(p) {
      var e = nextEvent(c, function (x) { return x.type === 'station' && x.a === p.id; });
      if (!e) return p.retro ? 'RETROGRADE · station not within 9 days' : (p.id === 'sun' || p.id === 'moon' ? '' : 'DIRECT');
      return (p.retro ? 'RETROGRADE' : 'DIRECT') + ' · stations ' + (e.dir > 0 ? 'direct' : 'retrograde') + ' in ' + short(e.t - c.t);
    }
    if (ui.speedMode === 'gauge') {
      rows.forEach(function (p) {
        var b = p.body, span = b.hi - b.lo, pos = clamp((p.speed - b.lo) / span, 0, 1) * 100, zero = b.lo < 0 ? clamp((0 - b.lo) / span, 0, 1) * 100 : -10;
        out += '<div class="speed-row"><span class="wh">' + g(p.glyph) + ' ' + p.name.toUpperCase() + '</span>' +
          '<div><div class="gauge' + (p.retro ? ' retro' : '') + '"><span class="zero" style="left:' + zero + '%"></span><i style="left:calc(' + pos + '% - 2px)"></i></div><small class="dm">' + stationNote(p) + '</small></div>' +
          '<span class="' + (p.retro ? 'red' : 'amber') + '" style="text-align:right">' + (p.speed >= 0 ? '+' : '−') + Math.abs(p.speed).toFixed(p.id === 'moon' ? 2 : 3) + '°/d</span></div>';
      });
      out += '<div class="dm">&#9666; slow / retrograde &nbsp; dashed line = station (zero speed) &nbsp; fast &#9656;</div>';
    } else {
      var arr = rows.slice().sort(function (a, b) { return Math.abs(b.speed) - Math.abs(a.speed); });
      var mx = ui.speedMode === 'race' ? Math.abs(arr[0].speed) : 2;
      arr.forEach(function (p) {
        var v = ui.speedMode === 'race' ? Math.abs(p.speed) / mx : Math.abs(p.speed) / p.body.typical / mx;
        var n = Math.max(v > 0 ? 1 : 0, Math.round(clamp(v, 0, 1) * 24));
        var pct = Math.round(Math.abs(p.speed) / p.body.typical * 100);
        out += '<div class="speed-row"><span class="wh">' + g(p.glyph) + ' ' + p.name.toUpperCase() + '</span><span class="blocks ' + (p.retro ? 'red' : 'amber') + '">' + (n ? bar(1, n, '█') : '▏') + '</span>' +
          '<span class="' + (p.retro ? 'red' : 'amber') + '" style="text-align:right">' + (ui.speedMode === 'race' ? Math.abs(p.speed).toFixed(2) + '°/d' : pct + '%') + '</span></div>';
      });
      out += '<div class="dm">' + (ui.speedMode === 'race' ? 'Bars scaled to the fastest body (the Moon).' : 'Full bar = 200% of a planet’s typical daily motion. Near 0% means a station is close.') + '</div>';
    }
    el.innerHTML = tabs + '<div class="sunken scr">' + out + '</div>';
  } };

  /* ───────────────────────── SYSTEM STATUS ───────────────────────── */
  W.status = { render: function (el, c) {
    var rows = c.pos.filter(function (p) { return p.id !== 'node'; }).map(function (p) {
      var st = 'OPERATIONAL', cls = '';
      var tight = c.asp.filter(function (x) { return (x.a.id === p.id || x.b.id === p.id) && x.orb < (p.id === 'moon' ? 0.3 : 0.1); });
      var close = c.asp.filter(function (x) { return (x.a.id === p.id || x.b.id === p.id) && x.orb < 2; });
      var ingr = nextEvent(c, function (e) { return e.type === 'ingress' && e.a === p.id; });
      var stat = c.events.filter(function (e) { return e.type === 'station' && e.a === p.id && Math.abs(e.t - c.t) < 72 * H; })[0];
      var slow = p.id !== 'sun' && p.id !== 'moon' && Math.abs(p.speed) / p.body.typical < 0.12;
      if (tight.length) { st = 'EXACT ASPECT'; cls = 'bad'; }
      else if (slow || stat) { st = 'STATION WARNING'; cls = 'bad'; }
      else if (ingr && ingr.t - c.t < (p.id === 'moon' ? 3 * H : 24 * H)) { st = 'INGRESS IMMINENT'; cls = 'warn'; }
      else if (close.length >= 3) { st = 'HIGH ACTIVITY'; cls = 'warn'; }
      else if (p.retro) { st = 'RETROGRADE'; cls = 'warn'; }
      else if (p.oob) { st = 'OUT OF BOUNDS'; cls = 'warn'; }
      return '<div class="status-row ' + cls + '"><span class="wh"><i class="led-dot"></i>' + g(p.glyph) + ' ' + p.name.toUpperCase() + '</span><span class="' + (cls === 'bad' ? 'red' : cls === 'warn' ? 'amber' : 'gr') + '">' + st + '</span></div>';
    }).join('');
    el.innerHTML = '<div class="sunken scr"><span class="hd">CELESTIAL SYSTEM STATUS</span><div class="status-grid">' + rows + '</div>' +
      '<div class="dm" style="margin-top:6px">LAST CALCULATED ' + hm(c.t) + ':' + pad(new Date(c.t).getSeconds()) + '</div></div>' +
      '<p class="note">A joke status page: planets are not servers. Statuses come from retrograde state, speed near a station, ingresses within a day, exact aspects, and declination.</p>';
  } };

  /* ───────────────────────── SKY DIFF ───────────────────────── */
  W.diff = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="panel-row"><label>A <input type="datetime-local" data-diff="A"></label> <label>B <input type="datetime-local" data-diff="B"></label></div>' +
        '<div class="panel-row tabs"><button type="button" data-act="diffPreset" data-val="yday">NOW vs 24H AGO</button><button type="button" data-act="diffPreset" data-val="tmrw">NOW vs TOMORROW</button><button type="button" data-act="diffPreset" data-val="week">NOW vs 7 DAYS AGO</button></div><div data-out></div>';
      qsa('[data-diff]', el).forEach(function (inp) {
        inp.addEventListener('change', function () {
          var v = Date.parse(inp.value); if (isNaN(v)) return;
          ui['diff' + inp.getAttribute('data-diff')] = v; schedule(true);
        });
      });
    }
    if (ui.diffA == null) { ui.diffA = c.t - DAY; ui.diffB = c.t; }
    var a = el.querySelector('[data-diff="A"]'), b = el.querySelector('[data-diff="B"]');
    if (doc.activeElement !== a) a.value = localInput(ui.diffA);
    if (doc.activeElement !== b) b.value = localInput(ui.diffB);
    var d = S.diff(ui.diffA, ui.diffB), lines = '';
    d.moved.filter(function (m) { return m.id !== 'node'; }).forEach(function (m) {
      lines += '<div>' + gl(m.id) + ' <span class="wh">' + posHTML(m.from) + '</span> → <span class="wh">' + posHTML(m.to) + '</span>' + (m.signChange ? ' <span class="pk">SIGN</span>' : '') + (m.from.retro !== m.to.retro ? ' <span class="red">' + (m.to.retro ? 'NOW ℞' : 'NOW DIRECT') + '</span>' : '') + '</div>';
    });
    var plus = d.added.map(function (x) { return '<div class="gr">+ ' + aspHTML(x.a.id, x.b.id, x.aspect.id) + ' <span class="dm">' + S.fmtOrb(x.orb) + '</span></div>'; }).join('');
    var minus = d.removed.map(function (x) { return '<div class="red">− ' + aspHTML(x.a.id, x.b.id, x.aspect.id) + ' <span class="dm">' + S.fmtOrb(x.orb) + '</span></div>'; }).join('');
    var chg = d.changed.map(function (x) { return '<div>~ ' + aspHTML(x.now.a.id, x.now.b.id, x.now.aspect.id) + ' <span class="dm">' + S.fmtOrb(x.then.orb) + ' → ' + S.fmtOrb(x.now.orb) + '</span></div>'; }).join('');
    el.querySelector('[data-out]').innerHTML = '<div class="sunken scr"><span class="hd">' + stampLong(ui.diffA) + ' → ' + stampLong(ui.diffB) + '</span>' + lines +
      '<span class="hd" style="margin-top:6px">NEW ASPECTS</span>' + (plus || '<span class="dm">none</span>') +
      '<span class="hd" style="margin-top:6px">REMOVED</span>' + (minus || '<span class="dm">none</span>') +
      '<span class="hd" style="margin-top:6px">CHANGED</span>' + (chg || '<span class="dm">none</span>') + '</div>';
  } };

  /* ───────────────────────── TIME CONTROL ───────────────────────── */
  W.scrub = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="scrub"><button type="button" class="btn" data-act="live">&#9679; LIVE</button>' +
        '<button type="button" class="btn" data-act="step" data-val="-1440" aria-label="Back one day">&laquo; 1D</button><button type="button" class="btn" data-act="step" data-val="-60" aria-label="Back one hour">&lsaquo; 1H</button>' +
        '<input type="range" min="-720" max="720" step="1" value="0" data-scrub aria-label="Time offset in hours, plus or minus 30 days">' +
        '<button type="button" class="btn" data-act="step" data-val="60" aria-label="Forward one hour">1H &rsaquo;</button><button type="button" class="btn" data-act="step" data-val="1440" aria-label="Forward one day">1D &raquo;</button>' +
        '<input type="datetime-local" data-scrubdt aria-label="Jump to date and time"></div><p class="note" data-state></p>';
      var rng = el.querySelector('[data-scrub]'), dt = el.querySelector('[data-scrubdt]');
      rng.addEventListener('input', function () {
        var off = +rng.value;
        state.frozen = off !== 0; state.ms = Math.round((Date.now() + off * H) / 60000) * 60000; schedule(true);
      });
      dt.addEventListener('change', function () { var v = Date.parse(dt.value); if (!isNaN(v)) { state.frozen = true; state.ms = v; schedule(true); } });
    }
    var rng2 = el.querySelector('[data-scrub]'), dt2 = el.querySelector('[data-scrubdt]');
    if (doc.activeElement !== rng2) rng2.value = state.frozen ? clamp(Math.round((state.ms - Date.now()) / H), -720, 720) : 0;
    if (doc.activeElement !== dt2) dt2.value = localInput(c.t);
    el.querySelector('[data-state]').innerHTML = state.frozen
      ? '<span class="frozen">FROZEN at ' + stampLong(c.t) + ' ' + tzAbbr(c.t) + '</span> — every panel on this page shows that moment. The ON AIR ticker stays live.'
      : '<span class="live-dot">&#9679; LIVE</span> — updating every few seconds. Drag the slider to look up to 30 days back or ahead.';
  } };


  /* ───────────────────────── MY WEATHER: shareable 3-day ASCII card ───────────────────────── */
  var DAYNAME = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MONTH3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var ASP_ASCII = { conj: '☌', sext: '✶', sqr: '□', tri: '△', opp: '☍' };

  /* general-astrology life-area keywords per house (themes, not predictions) */
  var HOUSE = [['self, body, fresh starts', 'identity and first impressions'], ['money, values, possessions', 'earning and what you value'], ['talking, learning, short trips', 'messages, siblings, neighbours'],
    ['home, family, roots', 'private life and the base you return to'], ['creativity, romance, play', 'what you make and enjoy'], ['work routines, health habits', 'daily tasks and service'],
    ['partnerships, contracts', 'close one-to-one relationships'], ['shared money, debts, intimacy', 'what is merged with others'], ['travel, study, beliefs', 'big-picture learning and publishing'],
    ['career, public role', 'reputation and direction'], ['friends, networks, hopes', 'groups and long-range wishes'], ['rest, solitude, endings', 'what happens behind the scenes']];
  var PKEY = { sun: 'vitality, focus', moon: 'mood, needs', mercury: 'thinking, messages', venus: 'values, relating', mars: 'drive, friction', jupiter: 'growth, openings', saturn: 'structure, limits', uranus: 'surprise, change', neptune: 'dreams, fog', pluto: 'intensity, deep change' };
  function houseOf(signIdx, rising) { return ((signIdx - rising + 12) % 12) + 1; }
  function ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  function meter(v) { var k = Math.round(clamp(v, 0, 100) / 10), s = ''; for (var i = 0; i < 10; i++) s += i < k ? '#' : '.'; return '[' + s + ']'; }
  function lvl(v) { return v < 20 ? 'QUIET' : v < 35 ? 'MODERATE' : v < 50 ? 'BUSY' : 'HEAVY'; }
  function gp(id) { return S.BY_ID[id].glyph; }
  function evShort(e) {
    if (e.type === 'aspect') return gp(e.a) + S.ASPECT_BY_ID[e.aspect].glyph + gp(e.b);
    if (e.type === 'ingress') return gp(e.a) + '→' + S.SIGNS[e.sign].glyph;
    if (e.type === 'station') return gp(e.a) + (e.dir > 0 ? ' D' : ' ℞');
    return '☽ ' + ['NEW', '1Q', 'FULL', '3Q'][e.quarter];
  }
  function evPrio(e) { return e.type === 'aspect' ? ((e.a === 'moon' || e.b === 'moon') ? 2 : 0) : 1; }
  /* data for one forecast: three local days, plus the live transits */
  function forecast(t, signIdx, nDays) {
    var events = eventsFor(t, 'share'), days = [], base = new Date(t); base.setHours(0, 0, 0, 0);
    for (var i = 0; i < (nDays || 3); i++) {
      var d0 = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), start = d0.getTime(), end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i + 1).getTime();
      var at = i === 0 ? t : start + 12 * H, wd = d0.getDay(), ruler = S.DAY_RULER[wd];
      var ml = S.lon('moon', at), msign = Math.floor(ml / 30), ph = S.moonPhase(at), peak = 0;
      for (var k = 0; k < 6; k++) peak = Math.max(peak, S.activity(start + (k * 4 + 2) * H).value);
      var evs = events.filter(function (e) { return e.t >= start && e.t < end && e.t >= t - 3 * H; })
        .sort(function (a, b) { return evPrio(a) - evPrio(b) || a.t - b.t; }).slice(0, 3).sort(function (a, b) { return a.t - b.t; });
      days.push({ start: start, wd: wd, ruler: ruler, label: DAYNAME[wd] + ' ' + pad(d0.getDate()), msign: msign, mdeg: Math.floor(ml % 30), phase: ph, load: peak, events: evs,
                  house: signIdx >= 0 ? ((msign - signIdx + 12) % 12) + 1 : 0 });
    }
    var pos = S.positions(t, { dec: false }), asp = S.aspects(t, pos);
    return { t: t, days: days, pos: pos, asp: asp, sign: signIdx, events: events };
  }
  function bodyText(f) {
    var D = [], rule = '+' + new Array(41).join('-'), t = f.t, now = new Date(t);
    D.push(rule);
    D.push('| MY ASTRO WEATHER . 3-DAY FORECAST');
    D.push('| ' + (f.sign >= 0 ? S.SIGNS[f.sign].name.toUpperCase() + ' RISING . ' : 'GENERAL SKY . ') + DAYNAME[now.getDay()] + ' ' + pad(now.getDate()) + ' ' + MONTH3[now.getMonth()] + ' ' + now.getFullYear());
    D.push(rule);
    f.days.forEach(function (d, i) {
      D.push('| ' + d.label + '  ' + gp(d.ruler) + ' ' + S.BY_ID[d.ruler].name.toUpperCase() + ' DAY' + (i === 0 ? '  (today)' : ''));
      D.push('|   moon  ' + gp('moon') + ' ' + S.SIGNS[d.msign].glyph + ' ' + d.mdeg + '° ' + d.phase.name.toLowerCase() + ' ' + Math.round(d.phase.illum * 100) + '%');
      if (d.house) D.push('|   you   ' + ord(d.house) + ' house: ' + HOUSE[d.house - 1][0].split(',')[0]);
      D.push('|   impact ' + meter(d.load) + ' ' + lvl(d.load));
      if (d.events.length) d.events.forEach(function (e) { D.push('|   ' + hm(e.t) + ' ' + evShort(e)); }); else D.push('|   (no exact aspects)');
      D.push('|');
    });
    D.pop(); D.push(rule);
    D.push('| TRANSITS NOW');
    var line = '|  ';
    f.pos.filter(function (p) { return p.id !== 'node'; }).forEach(function (p) {
      var piece = p.glyph + p.signGlyph + p.deg + (p.retro ? '℞' : '') + ' ';
      if (Array.from(line + piece).length > 42) { D.push(line.replace(/\s+$/, '')); line = '|  '; }
      line += piece;
    });
    D.push(line.replace(/\s+$/, ''));
    if (f.sign >= 0) {
      var hs = f.pos.filter(function (p) { return ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(p.id) >= 0; })
        .map(function (p) { return p.glyph + ((p.sign - f.sign + 12) % 12 + 1); }).join(' ');
      D.push('|  houses (from rising): ' + hs);
    }
    f.asp.slice(0, 4).forEach(function (x) { D.push('|  ' + gp(x.a.id) + x.aspect.glyph + gp(x.b.id) + ' ' + S.fmtOrb(x.orb) + (x.applying ? ' applying' : ' separating')); });
    D.push(rule);
    return D.join('\n');
  }
  function tweetText(f, url) {
    var LIMIT = 280 - 24, head = 'MY ASTRO WEATHER' + (f.sign >= 0 ? ' (' + S.SIGNS[f.sign].name + ' rising)' : '') + '\n';
    function dayBlock(d, nEv) {
      var s = d.label + ' ' + gp(d.ruler) + ' ' + gp('moon') + S.SIGNS[d.msign].glyph + ' ' + meter(d.load).replace(/[\[\]]/g, '') + ' ' + lvl(d.load);
      if (d.house) s += ' (' + ord(d.house) + ')';
      var ev = d.events.slice(0, nEv).map(function (e) { return hm(e.t) + ' ' + evShort(e); }).join('  ');
      return s + (ev ? '\n  ' + ev : '') + '\n';
    }
    function build(nEv, withNow) {
      var out = head; f.days.forEach(function (d) { out += dayBlock(d, nEv); });
      if (withNow) out += 'NOW ' + f.pos.filter(function (p) { return ['sun', 'moon', 'mercury', 'venus', 'mars'].indexOf(p.id) >= 0; }).map(function (p) { return p.glyph + p.signGlyph + p.deg; }).join(' ') + (f.asp[0] ? '  ' + gp(f.asp[0].a.id) + f.asp[0].aspect.glyph + gp(f.asp[0].b.id) : '') + '\n';
      return out + (url ? url : '');
    }
    var tries = [[2, true], [2, false], [1, true], [1, false], [0, true], [0, false]];
    for (var i = 0; i < tries.length; i++) { var s = build(tries[i][0], tries[i][1]); if (Array.from(s.replace(url || '', '')).length <= LIMIT) return s; }
    return build(0, false);
  }
  var shareSign = (function () {
    var h = (location.hash || '').replace('#', '').toLowerCase(), i;
    for (i = 0; i < 12; i++) if (S.SIGNS[i].name.toLowerCase() === h) { store('aw98_sign', String(i)); return i; }
    var v = store('aw98_sign'); return v !== null && v !== undefined && v !== '' && +v >= 0 && +v < 12 ? +v : -1;
  })();
  function copyText(txt, btn) {
    function done(ok) { var old = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', old); btn.textContent = ok ? 'Copied!' : 'Select + copy manually'; setTimeout(function () { btn.textContent = old; }, 1600); }
    try { navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }
  var shareN = 0;
  W.share = { render: function (el, c, o) {
    if (!el._init) {
      el._init = true;
      var opts = '<option value="-1">General sky (no sign)</option>' + S.SIGNS.map(function (s, i) { return '<option value="' + i + '">' + s.name + '</option>'; }).join('');
      var uid = ++shareN;
      el.innerHTML = (o.general ? '<p class="note">Sky for everyone: no sign, no birth data. Members can make it personal.</p>' : '<div class="panel-row"><label for="share-sign-' + uid + '">Your rising sign:</label> <select id="share-sign-' + uid + '" data-sign>' + opts + '</select></div>') +
        '<div class="share-grid"><div><pre class="card-ascii" data-card tabindex="0" aria-label="Three-day forecast card"></pre>' +
        '<div class="share-bar"><button type="button" class="btn" data-share="card">Copy card</button></div></div>' +
        '<div><label for="tweet-box-' + uid + '"><b>Post-ready version</b></label><textarea id="tweet-box-' + uid + '" class="tweet-box" data-tweet readonly></textarea>' +
        '<div class="share-bar"><a class="btn btn-primary" data-tweetlink target="_blank" rel="noopener noreferrer">Post to X / Twitter</a><button type="button" class="btn" data-share="tweet">Copy text</button><span class="count" data-count></span></div>' +
        '<p class="note">Houses are counted whole-sign from your rising sign. Not sure of it? It comes from your birth time and place and changes about every two hours; pick General sky until you know. A quick read, not a birth chart. Times in your time zone.</p></div></div>';
      var sel = el.querySelector('[data-sign]');
      if (sel) sel.addEventListener('change', function () { shareSign = +sel.value; store('aw98_sign', String(shareSign)); schedule(true); });
      el.addEventListener('click', function (ev) {
        var b = ev.target.closest && ev.target.closest('[data-share]'); if (!b) return;
        copyText(b.getAttribute('data-share') === 'card' ? el.querySelector('[data-card]').textContent : el.querySelector('[data-tweet]').value, b);
      });
    }
    var sg = o.general ? -1 : shareSign, sel2 = el.querySelector('[data-sign]');
    if (sel2) sel2.value = String(sg);
    var f = forecast(c.t, sg), origin = /^https?:/.test(location.origin || '') ? location.origin : '';
    var url = origin ? origin + '/forecast/' + (sg >= 0 ? '#' + S.SIGNS[sg].name.toLowerCase() : '') : '';
    var card = bodyText(f) + (url ? '\n| ' + url.replace(/^https?:\/\//, '') : '');
    el.querySelector('[data-card]').textContent = card;
    var tw = tweetText(f, url), n = Array.from(tw.replace(url, '')).length + (url ? 23 : 0), box = el.querySelector('[data-tweet]');
    box.value = tw;
    var cnt = el.querySelector('[data-count]'); cnt.textContent = n + '/280'; cnt.className = 'count' + (n > 280 ? ' over' : '');
    el.querySelector('[data-tweetlink]').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(url ? tw.replace(url, '').replace(/\n$/, '') : tw) + (url ? '&url=' + encodeURIComponent(url) : '');
    el._forecast = f;
  } };


  /* ───────────────────────── MEMBERS: deeper forecast by house (context, not a reading) ───────────────────────── */
  var stCache = {};
  function stationFor(id, t) { var k = id + Math.floor(t / DAY); if (!(k in stCache)) { stCache = {}; stCache[k] = S.nextStation(id, t, 500); } return stCache[k]; }
  var lunCache = {};
  function lunFor(t) { var k = Math.floor(t / DAY); if (!lunCache[k]) { var a = S.nextLunation(t, [0, 2], 40), b = a ? S.nextLunation(a.t + DAY, [0, 2], 40) : null; lunCache = {}; lunCache[k] = [a, b]; } return lunCache[k]; }
  var ingCache = {};
  function ingFor(id, t) { var k = id + Math.floor(t / DAY); if (!(k in ingCache)) { ingCache[k] = S.nextIngress(id, t, id === 'saturn' ? 1100 : 500); } return ingCache[k]; }
  function dateShort(ms) { return dayName(ms) + ' ' + fmtDM.format(new Date(ms)).toUpperCase(); }
  /* ───────────────────────── WHO IS BEING HIT, AND THE "GOOD TIME TO BOOK" NUDGE ───────────────────────── */
  var NUDGE_URL = '/readings/', BOOK_URL = '/book/';   /* the nudge leads to the readings page; the Book buttons go straight to /book/ (after booking: /booked/) */
  function signG(i) { return g(S.SIGNS[i].glyph); }
  function whyHTML(tok) {
    if (tok.a) return aspHTML(tok.a, tok.b, tok.asp);
    if (tok.st) return gl(tok.st) + ' <span class="dm">stationing</span>';
    if (tok.rx) return gl(tok.rx) + ' <span class="dm">retrograde</span>';
    if (tok.lun) return g('☽︎') + ' <span class="dm">' + esc(tok.lun) + '</span>';
    return '';
  }
  var hitCache = { k: -1, v: null };
  function hitNow(t) { var k = Math.floor(t / 60000); if (hitCache.k !== k) { hitCache = { k: k, v: window.SkyTopic.hit(t) }; } return hitCache.v; }
  W.hitnow = { render: function (el, c) {
    if (!window.SkyTopic) return; var h = hitNow(c.t);
    var rows = h.signs.slice(0, 3).map(function (sg, i) {
      return '<tr><td class="t">' + (i + 1) + '</td><td class="t">' + signG(sg.sign) + '</td><td class="ev">' + esc(sg.name.toUpperCase()) + '</td><td class="dm">' + sg.why.map(whyHTML).join(' &nbsp; ') + '</td></tr>';
    }).join('');
    var deg = h.degrees.map(function (d) { return d.deg + '° ' + signG(d.sign); }).join(' &nbsp;&middot;&nbsp; ');
    el.innerHTML = '<div class="sunken scr"><span class="hd">WHO IS BEING HIT RIGHT NOW</span><div class="kv"><span class="k">IMPACT</span><span class="v ' + (h.activity >= 50 ? 'amber' : 'cy') + '">' + h.level + '</span>' +
      (h.top ? '<span class="k">BIGGEST</span><span class="v">' + aspHTML(h.top.a, h.top.b, h.top.asp) + (h.top.t ? ' <span class="dm">exact ' + stamp(h.top.t, c.t) + '</span>' : '') + '</span>' : '') + '</div></div>' +
      '<div class="sunken"><table class="board"><thead><tr><th>#</th><th></th><th>SIGN</th><th>BECAUSE</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (deg ? '<p class="note"><b>Degrees to watch:</b> ' + deg + '. If you have a planet or an angle at those degrees, this is about you.</p>' : '') +
      '<p class="ctas"><a class="btn btn-primary" href="' + BOOK_URL + '">Is this you? Book a reading</a></p>';
  } };

  /* what this post does to a member's own chart (birth data from the account or typed locally) */
  function personalVerdict(c, onlyPlanet) {
    var rows = personalRows(c).filter(function (r) { return !onlyPlanet || r.id === onlyPlanet; }), heavy = [], watch = [];
    rows.forEach(function (r) {
      var hard = r.asp.id === 'conj' || r.asp.id === 'sqr' || r.asp.id === 'opp', outer = ['mars', 'saturn', 'uranus', 'neptune', 'pluto'].indexOf(r.id) >= 0, key = r.pt.id === 'sun' || r.pt.id === 'moon' || r.pt.id === 'asc';
      if (hard && outer && key && r.orb / r.lim < 0.5) heavy.push(r); else if (outer && r.orb / r.lim < 0.8) watch.push(r);
    });
    return { level: heavy.length ? 'HEAVY' : watch.length ? 'WATCH' : 'CALM', heavy: heavy, watch: watch, rows: rows };
  }
  function topicOf(el) {
    var n = doc.querySelector('[data-teletext]'); if (!n || !window.SkyTopic) return { kind: 'general' };
    return window.SkyTopic.detect({ title: n.dataset.title, tags: (n.dataset.tags || '').split('|').filter(Boolean), excerpt: n.dataset.excerpt || '' });
  }
  W.postread = { render: function (el, c) {
    if (acct.state === 'init') loadAccount();
    if (!birth) {
      el.innerHTML = '<div class="sunken scr"><span class="hd">MEMBERS READ</span><div class="dm">' + (acct.state === 'loading' ? 'Looking up your birth details…' : 'Add your birth details and this post is applied to your own chart.') + '</div></div>' +
        (acct.state === 'loading' ? '' : '<p class="ctas"><a class="btn btn-primary" href="/birth-details/">Add my birth details</a></p>'); return;
    }
    var tp = topicOf(el), planet = (tp.kind === 'retrograde' || tp.kind === 'planet') ? tp.planet : null, v = personalVerdict(c, planet && planet !== 'moon' ? planet : null), out = [];
    if (planet && planet !== 'moon' && planet !== 'sun') {
      var cur = c.pos[S.BY_ID[planet].i], house = birth.asc !== null ? ((cur.sign - birth.ascSign + 12) % 12) + 1 : 0;
      out.push('<span class="k">' + gl(planet) + ' NOW IN</span><span class="v">' + signG(cur.sign) + ' ' + esc(cur.signName.toUpperCase()) + (house ? ' <span class="dm">your house ' + house + '</span>' : '') + (cur.retro ? ' <span class="red">RETROGRADE</span>' : '') + '</span>');
    }
    var top = v.heavy.concat(v.watch).concat(v.rows).slice(0, 3);
    top.forEach(function (r) { out.push('<span class="k">TOUCHES</span><span class="v">' + gl(r.id) + ' ' + g(r.asp.glyph) + ' ' + r.pt.label + ' <span class="dm">' + S.fmtOrb(r.orb) + (r.exact ? ' · exact ' + stamp(r.exact, c.t) : '') + '</span></span>'); });
    if (!top.length) out.push('<span class="k">TOUCHES</span><span class="v dm">nothing of yours within orb right now</span>');
    el.innerHTML = '<div class="sunken scr"><span class="hd">APPLIED TO YOUR CHART</span><div class="kv">' + out.join('') + '<span class="k">FOR YOU</span><span class="v ' + (v.level === 'HEAVY' ? 'red' : v.level === 'WATCH' ? 'amber' : 'cy') + '">' + v.level + '</span></div></div>' +
      (v.level === 'HEAVY' ? '<p class="note">A hard aspect from a heavy planet is sitting on your Sun, Moon or rising sign. <a href="' + NUDGE_URL + '"><b>Looks like a good time to book.</b></a></p>' : '<p class="note">A quick read, not a reading. It only looks at the tightest contacts to your Sun, Moon, rising sign and personal planets.</p>');
  } };
  W.booknudge = { render: function (el, c, o, win) {
    var box = win || el;
    if (!window.SkyTopic) return;
    if (acct.state === 'init') loadAccount();
    var h = hitNow(c.t), msg = '', why = '';
    if (birth) { var v = personalVerdict(c); if (v.level === 'HEAVY') { var r = v.heavy[0]; why = 'Your chart: ' + gl(r.id) + ' ' + g(r.asp.glyph) + ' ' + r.pt.label; msg = 'Something heavy is sitting on your own chart.'; } }
    if (!msg && h.level === 'HEAVY') { msg = 'The sky is heavy today.'; why = h.top ? aspHTML(h.top.a, h.top.b, h.top.asp) : ''; }
    if (!msg) { box.hidden = true; return; }
    box.hidden = false;
    el.innerHTML = '<span class="bn-msg"><b>' + esc(msg) + '</b> ' + why + '</span> <a class="btn btn-primary" href="' + NUDGE_URL + '">Looks like a good time to book</a>';
  } };

  W.member = { render: function (el, c) {
    if (shareSign < 0) {
      el.innerHTML = '<div class="sunken scr"><span class="hd">PICK YOUR RISING SIGN</span><span class="dm">Choose it in the forecast card above. The house-by-house view needs it, because every house number is counted from your rising sign.</span></div>';
      return;
    }
    var f = forecast(c.t, shareSign, 7), rs = shareSign, t = c.t, out = '';
    /* 1. week at a glance */
    var voc = S.vocWindows(f.events, f.days[0].start, f.days[6].start + DAY);
    out += '<div class="sunken scr"><span class="hd">THE WEEK AT A GLANCE · 7 DAYS FROM ' + S.SIGNS[rs].name.toUpperCase() + ' RISING</span>';
    f.days.forEach(function (d, i) {
      var h = d.house, dayVoc = voc.filter(function (v) { return v.end > d.start && v.start < d.start + DAY; });
      out += '<div class="mday"><span class="wh">' + d.label + '</span> ' + gl(d.ruler) + ' <span class="amber">' + meter(d.load) + '</span> ' + lvl(d.load) + (i === 0 ? ' <span class="dm">today</span>' : '') +
        '<br>&nbsp;&nbsp;<span class="dm">MOON</span> ' + g('☽︎') + ' ' + g(S.SIGNS[d.msign].glyph) + ' in your <span class="wh">' + ord(h) + '</span> <span class="dm">(' + HOUSE[h - 1][0] + ')</span>';
      d.events.forEach(function (e) {
        var hh = '';
        if (e.type === 'aspect' && e.a !== 'moon' && e.b !== 'moon') hh = ' <span class="dm">houses ' + houseOf(Math.floor(S.lon(e.a, e.t) / 30), rs) + ' &amp; ' + houseOf(Math.floor(S.lon(e.b, e.t) / 30), rs) + '</span>';
        else if (e.type === 'ingress') hh = ' <span class="dm">into your ' + ord(houseOf(e.sign, rs)) + '</span>';
        out += '<br>&nbsp;&nbsp;<span class="cy">' + hm(e.t) + '</span> ' + evHTML(e) + hh;
      });
      dayVoc.forEach(function (v) { out += '<br>&nbsp;&nbsp;<span class="pk">VOID MOON</span> ' + stamp(Math.max(v.start, d.start), t) + ' → ' + stamp(v.end, t) + ' <span class="dm">(' + short(v.end - v.start) + ')</span>'; });
      out += '</div>';
    });
    out += '</div>';
    /* 2. where the sky is active */
    var byHouse = {}; f.pos.filter(function (p) { return p.id !== 'node'; }).forEach(function (p) { (byHouse[houseOf(p.sign, rs)] = byHouse[houseOf(p.sign, rs)] || []).push(p); });
    var rows = '', quiet = [];
    for (var h = 1; h <= 12; h++) {
      if (!byHouse[h]) { quiet.push(ord(h)); continue; }
      rows += '<tr><td class="t">' + ord(h) + '</td><td class="ev">' + HOUSE[h - 1][0] + '<small>' + HOUSE[h - 1][1] + '</small></td><td class="t">' + byHouse[h].map(function (p) { return g(p.glyph) + (p.retro ? '<span class="rx">℞</span>' : ''); }).join(' ') + '</td></tr>';
    }
    out += '<div class="sunken"><table class="board"><thead><tr><th>HOUSE</th><th>LIFE AREA</th><th>WHO IS THERE NOW</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">Quiet right now: ' + (quiet.join(', ') || 'none') + '. A planet in a house points the sky’s attention at that area of life. These are themes, not predictions.</p>';
    /* themes for the week */
    var themes = Object.keys(byHouse).map(function (k) { return { h: +k, n: byHouse[k].length }; }).sort(function (a, b) { return b.n - a.n; }).filter(function (x) { return x.n >= 2; }).slice(0, 3);
    if (themes.length) out += '<div class="sunken scr"><span class="hd">LOUDEST AREAS</span>' + themes.map(function (x) { return '<div>' + ord(x.h) + ' house <span class="dm">(' + HOUSE[x.h - 1][0] + ')</span> ' + byHouse[x.h].map(function (p) { return gl(p.id); }).join(' ') + '</div>'; }).join('') + '</div>';
    /* 3. retrograde watch */
    var rxl = f.pos.filter(function (p) { return p.retro && p.id !== 'node'; }).map(function (p) {
      var st = stationFor(p.id, t);
      return '<div>' + gl(p.id) + ' <span class="wh">' + p.name.toUpperCase() + '</span> ℞ in your ' + ord(houseOf(p.sign, rs)) + ' <span class="dm">(' + HOUSE[houseOf(p.sign, rs) - 1][0] + ')</span><br>&nbsp;&nbsp;' +
        (st ? 'stations direct ' + dateShort(st.t) + ' <span class="cy">(in ' + short(st.t - t) + ')</span>' : '<span class="dm">station not found within 500 days</span>') + '</div>';
    }).join('');
    out += '<div class="sunken scr"><span class="hd">RETROGRADE WATCH</span>' + (rxl || '<span class="dm">NOTHING RETROGRADE RIGHT NOW</span>') + '</div>';
    /* 4. next big dates */
    var lu = lunFor(t), big = '';
    (lu || []).forEach(function (e) { if (e) big += '<div>' + g('☽︎') + ' <span class="wh">' + e.name.toUpperCase() + '</span> ' + dateShort(e.t) + ' ' + hm(e.t) + ' in your ' + ord(houseOf(e.sign, rs)) + ' <span class="dm">(' + HOUSE[houseOf(e.sign, rs) - 1][0] + ')</span></div>'; });
    ['mars', 'jupiter', 'saturn'].forEach(function (id) {
      var ing = ingFor(id, t); if (!ing) return;
      big += '<div>' + gl(id) + ' enters ' + g(S.SIGNS[ing.sign].glyph) + ' ' + dateShort(ing.t) + ' ' + new Date(ing.t).getFullYear() + ' → your <span class="wh">' + ord(houseOf(ing.sign, rs)) + '</span> <span class="dm">(' + HOUSE[houseOf(ing.sign, rs) - 1][0] + ')</span></div>';
    });
    out += '<div class="sunken scr"><span class="hd">NEXT BIG DATES FOR YOUR HOUSES</span>' + big + '</div>';
    /* 5. how to use it */
    out += '<div class="sunken scr"><span class="hd">HOW TO USE THIS</span>' +
      '<div class="gr">GOOD FOR</div><div>Seeing which parts of life the sky is loud about this week, picking your moments (void Moon, busy and quiet days), and planning around retrograde and lunation dates.</div>' +
      '<div class="red" style="margin-top:4px">NOT FOR</div><div>Predictions, diagnoses, or big decisions. It uses one sign, so it cannot see your planets, your aspects, or your birth time. A reading connects all of that to your full chart.</div></div>';
    el.innerHTML = out;
  } };


  /* ───────────────────────── MEMBERS: personal aspects (birth data from the member's client record, or typed locally) ───────────────────────── */
  var birth = null, acct = { state: 'init' };                    /* acct.state: init | loading | ok | none | error | off */
  function tzOffsetMs(ms, tz) {
    var p = {}, parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
    parts.forEach(function (q) { p[q.type] = +q.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  }
  function wallToUtc(date, time, o) {                              /* 'YYYY-MM-DD', 'HH:MM[:SS]' in a zone (IANA name or fixed UTC offset in hours) */
    var d = date.split('-').map(Number), t = (time || '12:00:00').split(':').map(Number), guess = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1] || 0, t[2] || 0);
    if (o.tz) { var off = tzOffsetMs(guess, o.tz), utc = guess - off, off2 = tzOffsetMs(utc, o.tz); return off2 !== off ? guess - off2 : utc; }
    return guess - (o.off || 0) * H;
  }
  function makeBirth(o) {
    var ms = wallToUtc(o.date, o.time, o), ch = S.natalChart(ms, o.lat, o.lng, !o.time);
    ch.src = o.src; ch.raw = o; return ch;
  }
  function applyBirth(b) {
    birth = b;
    if (b.ascSign >= 0) { shareSign = b.ascSign; store('aw98_sign', String(shareSign)); }
  }
  try { var lb = JSON.parse(store('aw98_birth') || 'null'); if (lb && lb.date) applyBirth(makeBirth(lb)); } catch (e) { /* ignore */ }
  function loadAccount() {
    var url = doc.body.getAttribute('data-birth-api');
    if (!url) { acct.state = 'off'; return; }
    try { var cached = JSON.parse(sessionStorage.getItem('aw98_acct') || 'null'); if (cached) { applyBirth(makeBirth(acctToOpts(cached))); acct.state = 'ok'; return; } } catch (e) { /* ignore */ }
    acct.state = 'loading';
    fetch('/members/api/session', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('no session'); return r.text(); })
      .then(function (tok) { return fetch(url, { credentials: 'same-origin', headers: { Authorization: 'Bearer ' + tok.replace(/^"|"$/g, '') } }); })
      .then(function (r) { if (r.status === 404 || r.status === 204) { acct.state = 'none'; return null; } if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (j) {
        if (j) { try { sessionStorage.setItem('aw98_acct', JSON.stringify(j)); } catch (e) { /* ignore */ } applyBirth(makeBirth(acctToOpts(j))); acct.state = 'ok'; }
        schedule(true);
      })
      .catch(function () { acct.state = 'error'; schedule(true); });
  }
  function acctToOpts(j) { return { date: j.birth_date, time: j.birth_time || null, tz: j.timezone, lat: +j.latitude, lng: +j.longitude, src: 'account' }; }

  var PERS = [['sun', 1.5], ['mercury', 1], ['venus', 1], ['mars', 2], ['jupiter', 3], ['saturn', 3], ['uranus', 3], ['neptune', 3], ['pluto', 3]];
  var NKEY = { sun: 'identity, vitality', moon: 'emotional needs', mercury: 'mind, voice', venus: 'love, values', mars: 'drive, action', asc: 'self-presentation' };
  var exactCache = {};
  function exactsFor(id, point, aspId, t) {
    var k = id + '|' + Math.round(point * 10) + '|' + aspId + '|' + Math.floor(t / DAY);
    if (!(k in exactCache)) {
      if (Object.keys(exactCache).length > 200) exactCache = {};
      var slow = PERS.filter(function (p) { return p[0] === id; })[0][1] >= 3 || id === 'mars', a = S.ASPECT_BY_ID[aspId].angle;
      exactCache[k] = slow ? S.exactsToPoint(id, point, a, t - 150 * DAY, t + 300 * DAY, 12 * H) : S.exactsToPoint(id, point, a, t - 20 * DAY, t + 40 * DAY, 4 * H);
    }
    return exactCache[k];
  }
  function personalRows(c) {
    var t = c.t, rows = [], pts = [];
    ['sun', 'moon', 'mercury', 'venus', 'mars'].forEach(function (id) { pts.push({ id: id, lon: birth.pos[S.BY_ID[id].i].lon, label: gl(id) }); });
    if (birth.asc !== null) pts.push({ id: 'asc', lon: birth.asc, label: '<span class="g">AC</span>' });
    PERS.forEach(function (pr) {
      var id = pr[0], l0 = S.lon(id, t), l1 = S.lon(id, t + H);
      pts.forEach(function (pt) {
        for (var k = 0; k < S.ASPECTS.length; k++) {
          var asp = S.ASPECTS[k], lim = pr[1] * (asp.angle === 60 ? 0.6 : 1), orb = Math.abs(S.sepAbs(l0, pt.lon) - asp.angle);
          if (orb <= lim) { rows.push({ id: id, pt: pt, asp: asp, orb: orb, lim: lim, applying: Math.abs(S.sepAbs(l1, pt.lon) - asp.angle) < orb }); break; }
        }
      });
    });
    rows.sort(function (a, b) { return a.orb / a.lim - b.orb / b.lim; });
    return rows.slice(0, 12).map(function (r) {
      var ex = exactsFor(r.id, r.pt.lon, r.asp.id, t).slice().sort(function (a, b) { return Math.abs(a - t) - Math.abs(b - t); });
      r.exact = ex.length ? ex[0] : null; r.others = ex.slice(1, 3); return r;
    });
  }
  /* ───────────────────────── MEMBERS: birth-details form (the page linked from the welcome email) ───────────────────────── */
  function sendBirth(payload) {                                  /* resolves 'sent' when the endpoint took it, 'local' when none is configured */
    var url = doc.body.getAttribute('data-birth-api');
    if (!url) return Promise.resolve('local');
    return fetch('/members/api/session', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('signin'); return r.text(); })
      .then(function (tok) { return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { Authorization: 'Bearer ' + tok.replace(/^"|"$/g, ''), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); })
      .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return 'sent'; });
  }
  W.birthform = { render: function (el) {
    if (el._init) return;
    el._init = true;
    var cities = CITIES.map(function (x, i) { return '<option value="' + i + '">' + esc(x[0]) + '</option>'; }).join('');
    el.innerHTML = '<form class="bform bform-page" data-bform novalidate>' +
      '<label for="bf-date">Birth date</label><input id="bf-date" type="date" required autocomplete="bday">' +
      '<label for="bf-time">Birth time</label><input id="bf-time" type="time"> <label class="inl" for="bf-notime"><input id="bf-notime" type="checkbox"> I don&rsquo;t know it</label>' +
      '<span class="hint">As close as you can. It sets your rising sign. Without it you still get your planets.</span>' +
      '<label for="bf-place-s">Birth place</label><span class="psfield" data-ps></span>' +
      '<span class="hint">Start typing the city and state (or country) and pick it from the list. Tap the button if you happen to be there now.</span>' +
      '<details class="alt"><summary>Can&rsquo;t find it? Pick from a short list or enter coordinates</summary><span class="altbody"><label for="bf-city">City</label><select id="bf-city"><option value="">(search above)</option>' + cities + '<option value="other">Somewhere else</option></select>' +
      '<span class="other" data-other hidden><label for="bf-place">Place name</label><input id="bf-place" type="text" maxlength="80" placeholder="Town, region, country">' +
      '<label for="bf-lat">Latitude</label><input id="bf-lat" type="number" step="0.01" placeholder="40.71">' +
      '<label for="bf-lng">Longitude</label><input id="bf-lng" type="number" step="0.01" placeholder="-74.01 (west is negative)">' +
      '<label for="bf-off">UTC offset at birth (hours)</label><input id="bf-off" type="number" step="0.25" placeholder="-5"></span></span></details>' +
      '<span class="consent"><input id="bf-ok" type="checkbox"> <label class="inl" for="bf-ok">Use these details to build my chart on this site. I can send a correction any time.</label></span>' +
      '<span class="bbtns"><button type="submit" class="btn btn-primary">Send my birth details</button></span></form>' +
      '<p class="note">Typing a place sends that text to OpenStreetMap, and the place you pick sends its coordinates to Open-Meteo for the time zone. Nothing else leaves this page until you press send.</p><p class="note" data-bnote role="status" aria-live="polite"></p><div data-bdone></div>';
    var sel = el.querySelector('#bf-city'), other = el.querySelector('[data-other]'), note = el.querySelector('[data-bnote]'), form = el.querySelector('[data-bform]');
    var picked = null, ps = placeSearch(el.querySelector('[data-ps]'), { placeholder: 'City, State', geo: true, geoLabel: 'I am there now: use my location', onPick: function (p) { picked = p; sel.value = ''; other.hidden = true; } });
    sel.addEventListener('change', function () { other.hidden = sel.value !== 'other'; if (sel.value) { picked = null; ps.set(''); } });
    el.querySelector('#bf-notime').addEventListener('change', function (e) { el.querySelector('#bf-time').disabled = e.target.checked; });
    if (birth && birth.raw) {                                                    /* editing: start from what is already saved here */
      var r = birth.raw; el.querySelector('#bf-date').value = r.date || '';
      if (r.time) el.querySelector('#bf-time').value = String(r.time).slice(0, 5); else { el.querySelector('#bf-notime').checked = true; el.querySelector('#bf-time').disabled = true; }
      if (typeof r.city === 'number') sel.value = String(r.city);
      else if (r.place) { picked = { name: r.place, lat: r.lat, lng: r.lng, tz: r.tz }; ps.set(r.place); }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var date = el.querySelector('#bf-date').value, noTime = el.querySelector('#bf-notime').checked, time = noTime ? '' : el.querySelector('#bf-time').value, o, label;
      if (!date) { note.textContent = 'Enter your birth date.'; return; }
      if (!noTime && !time) { note.textContent = 'Enter your birth time, or tick that you do not know it.'; return; }
      if (!el.querySelector('#bf-ok').checked) { note.textContent = 'Tick the box to say we may use these details.'; return; }
      if (picked) { label = picked.name; o = { date: date, time: time || null, tz: picked.tz, lat: picked.lat, lng: picked.lng, place: label, src: 'local' }; }
      else if (!sel.value) { note.textContent = 'Pick your birth place from the search results.'; return; }
      else if (sel.value === 'other') {
        var la = parseFloat(el.querySelector('#bf-lat').value), ln = parseFloat(el.querySelector('#bf-lng').value), of = parseFloat(el.querySelector('#bf-off').value);
        label = el.querySelector('#bf-place').value.trim();
        if (!label || !isFinite(la) || !isFinite(ln) || !isFinite(of)) { note.textContent = 'For somewhere else, enter the place name, latitude, longitude and the UTC offset at birth.'; return; }
        o = { date: date, time: time || null, lat: la, lng: ln, off: of, src: 'local' };
      } else { var cc = CITIES[+sel.value]; label = cc[0]; o = { date: date, time: time || null, tz: cc[1], lat: cc[2], lng: cc[3], city: +sel.value, src: 'local' }; }
      var chart; try { chart = makeBirth(o); } catch (err) { note.textContent = 'That date or place did not work. Check it and try again.'; return; }
      var payload = { birth_date: date, birth_time: time ? time + ':00' : null, time_known: !!time, place: label, latitude: o.lat, longitude: o.lng, timezone: o.tz || null, utc_offset: o.tz ? null : o.off };
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending…';
      sendBirth(payload).then(function (how) {
        applyBirth(chart); store('aw98_birth', JSON.stringify(o)); try { sessionStorage.removeItem('aw98_acct'); } catch (x) { /* ignore */ }
        var b = chart, rising = b.ascSign >= 0 ? ' &nbsp; Rising ' + g(S.SIGNS[b.ascSign].glyph) + ' ' + S.SIGNS[b.ascSign].name : ' &nbsp; (no time, so no rising sign)';
        el.querySelector('[data-bdone]').innerHTML = '<div class="sunken scr"><span class="big">' + (how === 'sent' ? 'RECEIVED' : 'SAVED') + '</span><div class="dm">Sun ' + g(S.SIGNS[b.pos[0].sign].glyph) + ' ' + S.SIGNS[b.pos[0].sign].name + ' &nbsp; Moon ' + g(S.SIGNS[b.pos[1].sign].glyph) + ' ' + S.SIGNS[b.pos[1].sign].name + rising + '</div>' +
          '<div class="dm">' + (how === 'sent' ? 'Thank you. Your details are with us.' : 'Saved in this browser only, because this site has no member endpoint switched on yet.') + '</div></div>' +
          '<p class="ctas"><a class="btn btn-primary" href="/forecast/">See my weather</a></p>';
        note.textContent = ''; form.hidden = true; btn.disabled = false;
      }).catch(function () { btn.disabled = false; note.textContent = 'That did not go through. Check your connection and try again, or reply to your welcome email.'; });
    });
  } };

  W.personal = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      var cities = CITIES.map(function (x, i) { return '<option value="' + i + '">' + esc(x[0]) + '</option>'; }).join('');
      el.innerHTML = '<div data-out></div><details class="bdetails" data-wrap><summary data-sum>Add your birth details</summary>' +
        '<form class="bform" data-bform novalidate>' +
        '<label for="b-date">Birth date</label><input id="b-date" type="date" required>' +
        '<label for="b-time">Birth time</label><input id="b-time" type="time"> <label class="inl" for="b-notime"><input id="b-notime" type="checkbox"> I don’t know it</label>' +
        '<label for="b-city">Birth place</label><select id="b-city">' + cities + '<option value="other">Other (enter coordinates)</option></select>' +
        '<span class="other" data-other hidden><label for="b-lat">Latitude</label><input id="b-lat" type="number" step="0.01"><label for="b-lng">Longitude</label><input id="b-lng" type="number" step="0.01"><label for="b-off">UTC offset (hours)</label><input id="b-off" type="number" step="0.25"></span>' +
        '<span class="bbtns"><button type="submit" class="btn btn-primary">Save</button> <button type="button" class="btn" data-bclear>Clear</button></span></form>' +
        '<p class="note" data-bnote>Saved only in this browser. Nothing is sent anywhere.</p></details>';
      var sel = el.querySelector('#b-city'), other = el.querySelector('[data-other]');
      sel.addEventListener('change', function () { other.hidden = sel.value !== 'other'; });
      el.querySelector('#b-notime').addEventListener('change', function (e) { el.querySelector('#b-time').disabled = e.target.checked; });
      el.querySelector('[data-bform]').addEventListener('submit', function (e) {
        e.preventDefault();
        var date = el.querySelector('#b-date').value, time = el.querySelector('#b-notime').checked ? '' : el.querySelector('#b-time').value, o;
        if (!date) { el.querySelector('[data-bnote]').textContent = 'Enter your birth date.'; return; }
        if (sel.value === 'other') {
          var la = parseFloat(el.querySelector('#b-lat').value), ln = parseFloat(el.querySelector('#b-lng').value), of = parseFloat(el.querySelector('#b-off').value);
          if (!isFinite(la) || !isFinite(ln) || !isFinite(of)) { el.querySelector('[data-bnote]').textContent = 'Enter latitude, longitude and the UTC offset at birth.'; return; }
          o = { date: date, time: time || null, lat: la, lng: ln, off: of, src: 'local' };
        } else { var cc = CITIES[+sel.value]; o = { date: date, time: time || null, tz: cc[1], lat: cc[2], lng: cc[3], city: +sel.value, src: 'local' }; }
        try { applyBirth(makeBirth(o)); store('aw98_birth', JSON.stringify(o)); } catch (err) { el.querySelector('[data-bnote]').textContent = 'That date or place did not work. Check it and try again.'; return; }
        schedule(true);
      });
      el.querySelector('[data-bclear]').addEventListener('click', function () {
        birth = null; try { localStorage.removeItem('aw98_birth'); sessionStorage.removeItem('aw98_acct'); } catch (e) { /* ignore */ }
        if (acct.state === 'ok') acct.state = 'none'; schedule(true);
      });
    }
    if (acct.state === 'init') loadAccount();
    var wrap = el.querySelector('[data-wrap]'), out = el.querySelector('[data-out]');
    wrap.hidden = acct.state === 'ok';
    el.querySelector('[data-sum]').textContent = birth ? 'Edit birth details (saved in this browser)' : 'Add your birth details';
    if (acct.state === 'loading') { out.innerHTML = '<div class="sunken scr"><span class="dm">LOOKING UP YOUR BIRTH DETAILS…</span></div>'; return; }
    if (!birth) {
      out.innerHTML = '<div class="sunken scr"><span class="hd">YOUR ACTIVE PERSONAL ASPECTS</span><span class="dm">' +
        (acct.state === 'none' || acct.state === 'error' ? 'We could not find birth details for your account yet. <a href="/birth-details/">Send them here</a>. ' : '') +
        'Add your birth date, time and place below. This view compares the sky right now with your own planets, and also works out your rising sign.</span></div>';
      wrap.open = true; return;
    }
    var rows = personalRows(c), b = birth, big = [gl('sun') + ' ' + g(S.SIGNS[b.pos[0].sign].glyph) + ' ' + b.pos[0].deg + '°', gl('moon') + ' ' + g(S.SIGNS[b.pos[1].sign].glyph) + ' ' + b.pos[1].deg + '°'];
    if (b.asc !== null) big.push('<span class="g">AC</span> ' + g(S.SIGNS[b.ascSign].glyph) + ' ' + Math.floor(b.asc % 30) + '°');
    var html = '<div class="sunken scr"><span class="hd">YOUR BIG THREE</span><div class="big-label">' + big.join('&nbsp;&nbsp;') + '</div>' +
      '<div class="dm">' + (b.src === 'account' ? 'From your account record.' : 'From the details saved in this browser.') + (b.asc === null ? ' No birth time, so no rising sign.' : ' Rising sign sets your houses in My Weather.') + '</div></div>';
    html += '<div class="sunken scr"><span class="hd">ACTIVE PERSONAL ASPECTS · THE SKY NOW vs YOUR CHART</span>' + (rows.length ? rows.map(function (r) {
      var ex = r.exact ? 'exact ' + dateShort(r.exact) + ' <span class="cy">(' + (r.exact > c.t ? 'in ' + short(r.exact - c.t) : short(c.t - r.exact) + ' ago') + ')</span>' + (r.others.length ? ' <span class="dm">also ' + r.others.map(dateShort).join(', ') + '</span>' : '') : '<span class="dm">exact date outside the search window</span>';
      return '<div class="mday">' + gl(r.id) + ' ' + g(r.asp.glyph) + ' ' + r.pt.label + '  <span class="' + (r.applying ? 'amber' : 'dm') + '">' + S.fmtOrb(r.orb) + (r.applying ? ' applying' : ' separating') + '</span>' +
        '<br>&nbsp;&nbsp;' + ex + '<br>&nbsp;&nbsp;<span class="dm">' + PKEY[r.id] + ' meets ' + NKEY[r.pt.id] + '</span></div>';
    }).join('') : '<span class="dm">NOTHING IN ORB RIGHT NOW. A quiet stretch for your chart.</span>') + '</div>' +
      '<p class="note">Transiting Sun, Mercury, Venus, Mars and Jupiter–Pluto against your natal Sun, Moon, Mercury, Venus, Mars' + (b.asc !== null ? ' and Ascendant' : '') + '. Orbs: Sun/Mercury/Venus 1–1.5°, Mars 2°, outer planets 3°, sextiles tighter. Moon transits are on the Flight Board. Themes only: not a reading, and it does not see your full chart.</p>';
    out.innerHTML = html;
  } };


  /* ───────────────────────── SKY LINK (evergreen articles) ─────────────────────────
     An article names its topic (data-opts="topic=communication"). The card finds that topic's ruling planet and
     points at the CLOSEST real phenomenon to this moment, last or next (station, sign change, lunation, exact aspect),
     so the article never goes stale. With a chart linked, a second card shows where it lands in the reader's own chart. */
  var TOPICS = {
    communication: ['mercury', 'COMMUNICATION & CONTRACTS'], contracts: ['mercury', 'CONTRACTS & PAPERWORK'], technology: ['mercury', 'TECHNOLOGY & TRAVEL'], learning: ['mercury', 'LEARNING & WRITING'],
    love: ['venus', 'LOVE & RELATIONSHIPS'], money: ['venus', 'MONEY & VALUES'], beauty: ['venus', 'BEAUTY & ART'],
    drive: ['mars', 'DRIVE & CONFLICT'], energy: ['mars', 'ENERGY & ACTION'],
    luck: ['jupiter', 'LUCK & GROWTH'], travel: ['jupiter', 'BELIEF & EXPANSION'],
    discipline: ['saturn', 'DISCIPLINE & BOUNDARIES'], career: ['saturn', 'CAREER & STRUCTURE'],
    change: ['uranus', 'CHANGE & DISRUPTION'], dreams: ['neptune', 'DREAMS & ILLUSION'], power: ['pluto', 'POWER & TRANSFORMATION'],
    emotions: ['moon', 'EMOTIONS & HOME'], rhythm: ['moon', 'RHYTHM & CYCLES'], identity: ['sun', 'IDENTITY & VITALITY'], purpose: ['node', 'DIRECTION & PURPOSE']
  };
  var slCache = {};
  function bis(id, a, b, target) {                                       /* time when the planet crosses a longitude boundary or station, refined to ~1 minute */
    for (var i = 0; i < 18; i++) { var m = (a + b) / 2; if (target(m)) b = m; else a = m; }
    return (a + b) / 2;
  }
  function prevIngress(id, t, maxDays) {
    var step = 6 * H, cur = t, sg = Math.floor(S.lon(id, cur) / 30);
    for (var i = 0; i < maxDays * 4; i++) {
      var back = cur - step, sb = Math.floor(S.lon(id, back) / 30);
      if (sb !== sg) { var te = bis(id, back, cur, function (m) { return Math.floor(S.lon(id, m) / 30) === sg; }); return { type: 'ingress', t: te, a: id, sign: sg, dir: S.wrap180(S.lon(id, cur) - S.lon(id, back)) >= 0 ? 1 : -1 }; }
      cur = back;
    }
    return null;
  }
  function prevStation(id, t) {
    var from = t - 1100 * DAY, last = null, guard = 0, st = S.nextStation(id, from, 1100);
    while (st && st.t < t && guard++ < 14) { last = st; st = S.nextStation(id, st.t + DAY, 1100); }
    return last;
  }
  function prevLunation(t) { var from = t - 36 * DAY, last = null, guard = 0, l = S.nextLunation(from, [0, 2], 40); while (l && l.t < t && guard++ < 4) { last = l; l = S.nextLunation(l.t + DAY, [0, 2], 40); } return last; }
  function slEvents(id, t) {
    var key = id + Math.floor(t / (6 * H)); if (slCache[key]) return slCache[key];
    var out = [];
    function add(kind, e) { if (e) out.push(e); }
    if (id === 'moon') { add(0, S.nextLunation(t, [0, 2], 40)); add(0, prevLunation(t)); }
    else {
      if (id !== 'node' && id !== 'sun') { add(0, S.nextStation(id, t, 1100)); add(0, prevStation(id, t)); }
      add(0, S.nextIngress(id, t, id === 'pluto' ? 3000 : 1200)); add(0, prevIngress(id, t, id === 'pluto' ? 700 : 1000));
    }
    slCache = {}; slCache[key] = out; return out;
  }
  function slLabel(e) {
    var A = S.BY_ID[e.a || 'moon'];
    if (e.type === 'station') return gl(e.a) + ' STATIONS ' + (e.dir > 0 ? 'DIRECT' : 'RETROGRADE');
    if (e.type === 'ingress') return gl(e.a) + ' ' + (e.dir > 0 ? 'ENTERS' : 'RE-ENTERS') + ' ' + signG(e.sign) + ' ' + S.SIGNS[e.sign].name.toUpperCase();
    if (e.type === 'lunation') return g('☽︎') + ' ' + e.name.toUpperCase() + ' ' + signG(e.sign);
    return esc(S.eventPlain(e));
  }
  function slSign(e) { return e.type === 'station' ? Math.floor(S.lon(e.a, e.t) / 30) : e.sign; }
  function ordinal(n) { return n + (['TH', 'ST', 'ND', 'RD'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]); }
  function whenAgo(e, t) { return e.t > t ? 'IN <span class="cd" data-t="' + Math.round(e.t) + '">' + S.countdown(e.t - t) + '</span>' : short(t - e.t) + ' AGO'; }
  var slN = 0;
  W.skylink = { render: function (el, c, o) {
    var topic = TOPICS[o.topic] || null, id = topic ? topic[0] : (o.planet && S.BY_ID[o.planet] ? o.planet : null);
    if (!id) { var tp = window.SkyTopic && window.SkyTopic.detect({ title: (doc.querySelector('.doc-title') || {}).textContent || doc.title, tags: [], excerpt: '' }); id = tp && tp.planet ? tp.planet : 'sun'; }
    var label = topic ? topic[1] : id.toUpperCase(), body = S.BY_ID[id], p = c.pos[body.i], t = c.t;
    if (acct.state === 'init') loadAccount();
    if (!el._init) { el._init = true; el._uid = ++slN; el.innerHTML = '<div data-sl-a></div><div data-sl-b></div>'; }
    var dg = id === 'node' ? null : S.dignity(id, p.sign), list = slEvents(id, t).slice().sort(function (a, b) { return Math.abs(a.t - t) - Math.abs(b.t - t); });
    var nextE = list.filter(function (e) { return e.t > t; }).sort(function (a, b) { return a.t - b.t; })[0], lastE = list.filter(function (e) { return e.t <= t; }).sort(function (a, b) { return b.t - a.t; })[0];
    var near = list[0], extra = c.events.filter(function (e) { return e.type === 'aspect' && e.t > t && (e.a === id || e.b === id) && id !== 'moon'; })[0];
    function row(tag, e) { return e ? '<span class="k">' + tag + (near === e ? ' <span class="am">► CLOSEST</span>' : '') + '</span><span class="v">' + slLabel(e) + ' <span class="dm">' + stampLong(e.t).slice(0, 11) + ' · ' + whenAgo(e, t) + '</span></span>' : ''; }
    var a = '<div class="sunken scr"><span class="hd">SKY LINK · ' + label + ' → ' + gl(id) + ' ' + body.name.toUpperCase() + '</span>' +
      '<div class="kv"><span class="k">NOW</span><span class="v">' + gl(id) + ' ' + posHTML(p) + ' ' + (p.retro ? '<span class="red">RETROGRADE</span>' : '<span class="gr">DIRECT</span>') + '</span>' +
      '<span class="k">SPEED</span><span class="v">' + (p.speed >= 0 ? '+' : '−') + Math.abs(p.speed).toFixed(id === 'moon' ? 1 : 3) + '°/day <span class="dm">' + Math.round(Math.abs(p.speed) / body.typical * 100) + '% of typical</span></span>' +
      (dg ? '<span class="k">DIGNITY</span><span class="v">' + dg.toUpperCase() + '</span>' : '') + row('LAST', lastE) + row('NEXT', nextE) +
      (extra ? '<span class="k">NEXT ASPECT</span><span class="v">' + evHTML(extra) + ' <span class="dm">' + stamp(extra.t, t) + ' · in ' + short(extra.t - t) + '</span></span>' : '') + '</div></div>' +
      '<p class="note">Written once, true every time you open it: the card finds the nearest real ' + body.name + ' event to <em>today</em>. Times in ' + tzAbbr(t) + '.</p>';
    el.querySelector('[data-sl-a]').innerHTML = a;
    var B = el.querySelector('[data-sl-b]');
    if (birth) {
      var house = birth.asc !== null ? ((p.sign - birth.ascSign + 12) % 12) + 1 : 0, nat = birth.pos[body.i];
      var mine = personalRows(c).filter(function (r) { return r.id === id; }).slice(0, 2), lines = [];
      lines.push('<span class="k">YOUR NATAL</span><span class="v">' + gl(id) + ' ' + posHTML(nat) + '</span>');
      lines.push('<span class="k">IT IS IN</span><span class="v">' + signG(p.sign) + ' ' + esc(p.signName.toUpperCase()) + (house ? ' <span class="am">your ' + ordinal(house) + ' house</span>' : ' <span class="dm">add a birth time for houses</span>') + '</span>');
      [lastE, nextE].forEach(function (e, i) { if (!e) return; var sg = slSign(e), h = birth.asc !== null ? ((sg - birth.ascSign + 12) % 12) + 1 : 0; lines.push('<span class="k">' + (i ? 'NEXT LANDS' : 'LAST LANDED') + '</span><span class="v">' + signG(sg) + ' ' + esc(S.SIGNS[sg].name.toUpperCase()) + (h ? ' <span class="am">your ' + ordinal(h) + ' house</span>' : '') + '</span>'); });
      mine.forEach(function (r) { lines.push('<span class="k">TOUCHING</span><span class="v">' + gl(r.id) + ' ' + g(r.asp.glyph) + ' ' + r.pt.label + ' <span class="dm">' + S.fmtOrb(r.orb) + (r.exact ? ' · exact ' + stamp(r.exact, t) : '') + '</span></span>'); });
      if (!mine.length && id !== 'moon') lines.push('<span class="k">TOUCHING</span><span class="v dm">none of your planets right now</span>');
      B.innerHTML = '<div class="sunken scr"><span class="hd">IN YOUR CHART · ' + label + '</span><div class="kv">' + lines.join('') + '</div></div>' +
        '<p class="note">Houses are whole-sign from your rising sign. Saved in this browser only. <button type="button" class="chip-btn" data-act="skylinkClear">Unlink my chart</button></p>';
      return;
    }
    if (!B._form) {
      B._form = true; var u = 'sl' + el._uid, cities = CITIES.map(function (x, i) { return '<option value="' + i + '">' + esc(x[0]) + '</option>'; }).join('');
      B.innerHTML = '<div class="sunken scr"><span class="hd">LINK YOUR OWN CHART</span><span class="dm">Add your birth date, time and place and this card shows where ' + body.name.toUpperCase() + ' lands in <em>your</em> chart: the house, the signs it is moving through, the planets it touches. Nothing leaves your browser.</span></div>' +
        '<details class="bdetails" data-wrap><summary class="btn btn-primary">Link my chart</summary><form class="bform" data-bform novalidate>' +
        '<label for="' + u + '-d">Birth date</label><input id="' + u + '-d" type="date" required>' +
        '<label for="' + u + '-t">Birth time</label><input id="' + u + '-t" type="time"> <label class="inl" for="' + u + '-n"><input id="' + u + '-n" type="checkbox"> I don’t know it</label>' +
        '<label for="' + u + '-c">Birth place</label><select id="' + u + '-c">' + cities + '</select>' +
        '<span class="bbtns"><button type="submit" class="btn btn-primary">Link</button></span></form><p class="note" data-bnote>Saved only in this browser.</p></details>';
      B.querySelector('#' + u + '-n').addEventListener('change', function (e) { B.querySelector('#' + u + '-t').disabled = e.target.checked; });
      B.querySelector('[data-bform]').addEventListener('submit', function (e) {
        e.preventDefault();
        var date = B.querySelector('#' + u + '-d').value, time = B.querySelector('#' + u + '-n').checked ? '' : B.querySelector('#' + u + '-t').value, cc = CITIES[+B.querySelector('#' + u + '-c').value];
        if (!date) { B.querySelector('[data-bnote]').textContent = 'Enter your birth date.'; return; }
        var ob = { date: date, time: time || null, tz: cc[1], lat: cc[2], lng: cc[3], city: +B.querySelector('#' + u + '-c').value, src: 'local' };
        try { applyBirth(makeBirth(ob)); store('aw98_birth', JSON.stringify(ob)); } catch (err) { B.querySelector('[data-bnote]').textContent = 'That date or place did not work.'; return; }
        B._form = false; schedule(true);
      });
    }
  } };


  /* ───────────────────────── CHARTS: current-sky wheel and transit wheel (chart-wheel.js draws them) ───────────────────────── */
  var SAMPLE = { date: '1990-05-17', time: '14:30', tz: 'America/New_York', lat: 40.71, lng: -74.01, src: 'sample' }, sampleChart = null;
  function wheelPos(list) { return list.filter(function (p) { return true; }).map(function (p) { return { id: p.id, lon: p.lon, retro: !!p.retro }; }); }
  function aspectsBetween(A, B, same, lim) {                       /* aspects between two position lists, tightest first */
    var out = [];
    A.forEach(function (p, i) { B.forEach(function (q, j) {
      if (same && j <= i) return; if (p.id === 'node' || q.id === 'node') return;
      var sep = S.sepAbs(p.lon, q.lon);
      for (var k = 0; k < S.ASPECTS.length; k++) { var asp = S.ASPECTS[k], orb = Math.abs(sep - asp.angle), L = lim * ((p.id === 'moon' || q.id === 'moon') ? 0.7 : 1) * (asp.angle === 60 ? 0.7 : 1); if (orb <= L) { out.push({ a: p.lon, b: q.lon, ida: p.id, idb: q.id, type: asp.id, orb: orb }); break; } }
    }); });
    return out.sort(function (x, y) { return x.orb - y.orb; });
  }
  function aspName(id) { return S.ASPECT_BY_ID[id].glyph; }
  function houseOf(sign, ascSign) { return ((sign - ascSign + 12) % 12) + 1; }
  function chartShell(el, uid, side) {
    if (!el._init) { el._init = true; el.innerHTML = '<div class="chart-wrap"><div class="chart-pane"><canvas class="wheel" data-wheel width="336" height="336" role="img" aria-label="Astrological chart wheel"></canvas></div><div class="chart-side" data-side></div></div><div data-after></div>'; }
    return { cv: el.querySelector('[data-wheel]'), side: el.querySelector('[data-side]'), after: el.querySelector('[data-after]') };
  }
  W.chartnow = { render: function (el, c, o) {
    var sh = chartShell(el), asc = S.ascendant(c.t, loc.lat, loc.lng), ascSign = Math.floor(asc / 30), pl = wheelPos(c.pos);
    var asp = aspectsBetween(c.pos, c.pos, true, 6);
    window.NwsChart && NwsChart.draw(sh.cv, { asc: asc, outer: pl, inner: null, aspects: asp.slice(0, 24) });
    var rows = c.pos.map(function (p) { return '<tr><td class="t">' + g(p.glyph) + '</td><td class="ev">' + p.name.toUpperCase() + '</td><td class="t">' + posHTML(p) + '</td><td class="num">' + ordinal(houseOf(p.sign, ascSign)) + '</td><td class="' + (p.retro ? 'red' : 'dm') + '">' + (p.retro ? 'R' : '') + '</td></tr>'; }).join('');
    sh.side.innerHTML = '<div class="sunken scr"><span class="hd">CURRENT SKY · ' + stampLong(c.t) + ' ' + tzAbbr(c.t) + '</span>' +
      '<div class="kv"><span class="k">RISING</span><span class="v">' + signG(ascSign) + ' ' + esc(S.SIGNS[ascSign].name.toUpperCase()) + ' ' + Math.floor(asc % 30) + '°</span><span class="k">PLACE</span><span class="v">' + esc(loc.name) + '</span><span class="k">HOUSES</span><span class="v dm">whole sign</span></div></div>' +
      '<div class="sunken"><table class="board"><thead><tr><th></th><th>BODY</th><th>POSITION</th><th>HSE</th><th>R</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    sh.after.innerHTML = '<div class="sunken scr"><span class="hd">ASPECTS IN ORB · ' + asp.length + '</span>' + (asp.slice(0, 8).map(function (a) { return '<div>' + gl(a.ida) + ' ' + g(aspName(a.type)) + ' ' + gl(a.idb) + ' <span class="dm">' + S.fmtOrb(a.orb) + '</span></div>'; }).join('') || '<span class="dm">NONE</span>') + '</div>' +
      '<p class="note">Wheel: Ascendant on the left, signs counter-clockwise, whole-sign houses. Red lines are hard aspects, blue are easy ones. Place: ' + (loc.approx ? 'your time zone (approximate): add your city on the Sky page for a precise rising sign.' : esc(loc.name) + '.') + '</p>';
  } };
  W.charttransit = { render: function (el, c, o) {
    var sh = chartShell(el);
    if (acct.state === 'init') loadAccount();
    var useSample = !birth, nat = birth || (sampleChart || (sampleChart = makeBirth(SAMPLE))), natPos = nat.pos, asc = nat.asc !== null ? nat.asc : 0, ascSign = nat.asc !== null ? nat.ascSign : 0;
    var asp = aspectsBetween(c.pos, natPos, false, 3);
    window.NwsChart && NwsChart.draw(sh.cv, { asc: asc, outer: wheelPos(c.pos), inner: wheelPos(natPos), aspects: asp.slice(0, 22) });
    var rows = asp.slice(0, 10).map(function (a) { return '<tr><td class="ev">' + gl(a.ida) + '</td><td class="t">' + g(aspName(a.type)) + '</td><td class="ev">' + gl(a.idb) + '</td><td class="num">' + S.fmtOrb(a.orb) + '</td></tr>'; }).join('');
    var tp = c.pos.filter(function (p) { return p.id !== 'node'; }).map(function (p) { return gl(p.id) + ' ' + houseOf(p.sign, ascSign); }).join('  ');
    sh.side.innerHTML = '<div class="sunken scr"><span class="hd">TRANSITS · ' + (useSample ? 'SAMPLE CHART' : 'YOUR CHART') + '</span><div class="kv"><span class="k">OUTER RING</span><span class="v">the sky now</span><span class="k">INNER RING</span><span class="v">' + (useSample ? 'sample natal' : 'your natal') + '</span><span class="k">RISING</span><span class="v">' + (nat.asc !== null ? signG(ascSign) + ' ' + esc(S.SIGNS[ascSign].name.toUpperCase()) : '<span class="dm">no birth time</span>') + '</span></div></div>' +
      '<div class="sunken"><table class="board"><thead><tr><th>TRANSIT</th><th></th><th>NATAL</th><th>ORB</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="dm">NOTHING IN ORB</td></tr>') + '</tbody></table></div>';
    var af = sh.after;
    if (birth) { af.innerHTML = '<p class="note">Saved in this browser only. Transit houses count from your rising sign. <button type="button" class="chip-btn" data-act="skylinkClear">Unlink my chart</button></p>'; af._form = false; return; }
    if (!af._form) {
      af._form = true; var u = 'ct' + (++slN), cities = CITIES.map(function (x, i) { return '<option value="' + i + '">' + esc(x[0]) + '</option>'; }).join('');
      af.innerHTML = '<div class="sunken scr"><span class="hd">SAMPLE NATAL CHART IS SHOWN</span><span class="dm">Link your own and the inner ring becomes your birth chart, and the lines show what the sky is touching right now. Nothing leaves your browser.</span></div>' +
        '<details class="bdetails"><summary class="btn btn-primary">Link my chart</summary><form class="bform" data-bform novalidate>' +
        '<label for="' + u + '-d">Birth date</label><input id="' + u + '-d" type="date" required><label for="' + u + '-t">Birth time</label><input id="' + u + '-t" type="time"> <label class="inl" for="' + u + '-n"><input id="' + u + '-n" type="checkbox"> I don’t know it</label>' +
        '<label for="' + u + '-c">Birth place</label><select id="' + u + '-c">' + cities + '</select><span class="bbtns"><button type="submit" class="btn btn-primary">Link</button></span></form><p class="note" data-bnote>Saved only in this browser.</p></details>';
      af.querySelector('#' + u + '-n').addEventListener('change', function (e) { af.querySelector('#' + u + '-t').disabled = e.target.checked; });
      af.querySelector('[data-bform]').addEventListener('submit', function (e) {
        e.preventDefault();
        var date = af.querySelector('#' + u + '-d').value, time = af.querySelector('#' + u + '-n').checked ? '' : af.querySelector('#' + u + '-t').value, ci = +af.querySelector('#' + u + '-c').value, cc = CITIES[ci];
        if (!date) { af.querySelector('[data-bnote]').textContent = 'Enter your birth date.'; return; }
        var ob = { date: date, time: time || null, tz: cc[1], lat: cc[2], lng: cc[3], city: ci, src: 'local' };
        try { applyBirth(makeBirth(ob)); store('aw98_birth', JSON.stringify(ob)); } catch (err) { af.querySelector('[data-bnote]').textContent = 'That date or place did not work.'; return; }
        af._form = false; schedule(true);
      });
    }
  } };

  /* ───────────────────────── PUBLIC SKY STRIP (home) ───────────────────────── */
  W.strip = { render: function (el) {
    var c = ctx(Date.now(), 'live'), ph = S.moonPhase(c.t), act = S.activity(c.t), nx = nextEvent(c, null);
    var rx = c.pos.filter(function (p) { return p.retro && p.id !== 'node'; });
    el.innerHTML = '<span class="hd">PUBLIC SKY</span><div class="kv">' +
      '<span class="k">MOON</span><span class="v">' + g('\u263D\uFE0E') + ' ' + esc(ph.name.toUpperCase()) + ' ' + Math.round(ph.illum * 100) + '% ' + g(c.pos[1].signGlyph) + '</span>' +
      '<span class="k">RETROGRADE</span><span class="v ' + (rx.length ? 'red' : 'dm') + '">' + (rx.length ? rx.map(function (p) { return gl(p.id); }).join(' ') : 'NONE') + '</span>' +
      '<span class="k">IMPACT</span><span class="v ' + (act.value >= 50 ? 'amber' : 'cy') + '">' + impactWord(act.value) + '</span>' +
      (nx ? '<span class="k">NEXT EXACT</span><span class="v">' + evHTML(nx) + ' <span class="cd cy" data-t="' + Math.round(nx.t) + '">' + S.countdown(nx.t - c.t) + '</span></span>' : '') +
      '</div><span class="dm">UPDATED ' + hm(c.t) + ' ' + tzAbbr(c.t) + '</span>';
  } };

  /* ───────────────────────── MINI (sidebar) ───────────────────────── */
  W.mini = { render: function (el) {
    var c = ctx(Date.now(), 'live'), ph = S.moonPhase(c.t), ck = clockFor(c.t), m = c.pos[1];
    var rx = c.pos.filter(function (p) { return p.retro; }).map(function (p) { return p.glyph; }).join(' ');
    el.innerHTML = '<div class="mini-body"><div class="big"><span class="g">' + S.BY_ID.moon.glyph + '</span> ' + m.deg + '° <span class="g">' + m.signGlyph + '</span></div>' +
      '<div class="sm">' + esc(ph.name.toUpperCase()) + ' ' + Math.round(ph.illum * 100) + '%</div>' +
      '<div>DAY ' + g(S.BY_ID[ck.dayRuler].glyph) + ' HOUR ' + g(S.BY_ID[ck.current.ruler].glyph) + '</div>' +
      '<div class="' + (rx ? 'red' : 'dm') + '">' + (rx ? '℞ <span class="g">' + rx + '</span>' : 'NO RETROGRADES') + '</div></div>';
  } };

  /* ───────────────────────── RADAR ───────────────────────── */
  var RWIN = [6, 12, 24, 72];
  function strengthColor(s) { return s < 0.25 ? [47, 224, 90] : s < 0.5 ? [255, 235, 60] : s < 0.75 ? [255, 150, 30] : [255, 50, 50]; }
  var radarState = { raf: 0, sweep: 0, base: null };
  W.radar = { render: function (el, c, o) {
    if (!el._init) {
      el._init = true;
      if (o.window) ui.radarWin = +o.window;
      el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Window">' + RWIN.map(function (w) { return '<button type="button" data-act="radarWin" data-val="' + w + '">NEXT ' + w + 'H</button>'; }).join('') + '</div>' +
        '<div class="radar-wrap"><canvas class="radar" role="img" aria-label="Radar-style wheel of the zodiac showing planets and the aspects between them"></canvas><div class="sunken scr" data-list></div></div>';
      el._cv = el.querySelector('canvas');
    }
    qsa('[data-act="radarWin"]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-val') === ui.radarWin)); });
    var win = ui.radarWin * H, t = c.t;

    /* build cells: aspects active now + exact events inside the window */
    var cells = {}, key = function (a, b, k) { return (a < b ? a + '|' + b : b + '|' + a) + '|' + k; };
    c.asp.forEach(function (x) { if (x.orb <= (ui.radarWin <= 12 ? 2 : 3)) cells[key(x.a.id, x.b.id, x.aspect.id)] = { a: x.a.id, b: x.b.id, asp: x.aspect.id, now: x }; });
    c.events.forEach(function (e) {
      if (e.type !== 'aspect' || e.t < t || e.t > t + win) return;
      if ((e.a === 'moon' || e.b === 'moon') && ui.radarWin > 12) return;
      var k = key(e.a, e.b, e.aspect); cells[k] = cells[k] || { a: e.a, b: e.b, asp: e.aspect, now: null }; cells[k].exact = e;
    });
    var list = Object.keys(cells).map(function (k) {
      var cl = cells[k];
      if (!cl.exact) { /* nearest exact (past or future) in the cache */
        var best = null; c.events.forEach(function (e) { if (e.type === 'aspect' && key(e.a, e.b, e.aspect) === k && (!best || Math.abs(e.t - t) < Math.abs(best.t - t))) best = e; });
        cl.exact = best;
      }
      var A = S.lon(cl.a, t), B = S.lon(cl.b, t), aspo = S.ASPECT_BY_ID[cl.asp];
      cl.orb = Math.abs(S.sepAbs(A, B) - aspo.angle);
      cl.lim = (cl.a === 'moon' || cl.b === 'moon') ? 3 : aspo.orb;
      cl.s = Math.pow(clamp(1 - cl.orb / cl.lim, 0, 1), 2) * aspo.w;
      cl.applying = cl.exact ? cl.exact.t > t : false;
      return cl;
    }).sort(function (x, y) { return (y.s + (y.exact && y.exact.t > t ? 0.2 : 0)) - (x.s + (x.exact && x.exact.t > t ? 0.2 : 0)); }).slice(0, 7);

    var html = '<span class="hd">CELLS · NEXT ' + ui.radarWin + 'H</span>';
    list.forEach(function (cl) {
      var st = cl.exact ? (cl.exact.t > t ? 'APPLYING' : 'SEPARATING') : '—';
      var thr = 1, w = cl.exact ? S.orbWindow(cl.a, cl.b, cl.asp, cl.exact.t, thr) : { enter: null, leave: null };
      html += '<div style="margin-bottom:6px"><span class="wh">' + aspHTML(cl.a, cl.b, cl.asp) + '</span> <span class="' + (cl.applying ? 'amber' : 'dm') + '">' + st + ' ' + S.fmtOrb(cl.orb) + '</span><br>' +
        '&nbsp;&nbsp;<span class="dm">' + (cl.exact && cl.exact.t > t ? 'PEAK' : 'PEAKED') + '</span> ' + (cl.exact ? stamp(cl.exact.t, t) + (cl.exact.t > t ? ' <span class="cy">in ' + short(cl.exact.t - t) + '</span>' : ' <span class="dm">' + short(t - cl.exact.t) + ' ago</span>') : '—') + '<br>' +
        (w.enter && w.leave ? '&nbsp;&nbsp;<span class="dm">WITHIN 1°</span> ' + stamp(w.enter, t) + ' → ' + stamp(w.leave, t) + '<br>' : '') +
        '&nbsp;&nbsp;<span class="dm">PRESSURE</span> <span class="amber">' + bar(cl.s, 10) + '</span> ' + level(cl.s) + '</div>';
    });
    if (!list.length) html += '<span class="dm">CLEAR SKIES. No configurations in this window.</span>';
    qsa('[data-list]', el)[0].innerHTML = html;
    el._cells = list; el._c = c;
    drawRadar(el);
    startSweep();
  } };

  /* ── ORDERED-DITHER PIXEL BUFFERS: no smooth gradients anywhere; tones come from a 4x4 Bayer matrix ── */
  var BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function bth(x, y) { return (BAY[y & 3][x & 3] + 0.5) / 16; }
  var BAY8 = (function () { var m = [[0, 2], [3, 1]], n = 2; while (n < 8) { var q = []; for (var y = 0; y < n * 2; y++) { q.push([]); for (var x = 0; x < n * 2; x++) q[y].push(4 * m[y % n][x % n] + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]); } m = q; n *= 2; } return m; })();
  function bth8(x, y) { return (BAY8[y & 7][x & 7] + 0.5) / 64; }
  /* multi-level ordered dither: quantise a 0..1 amount to L tones, using the 8x8 matrix only for the in-between fraction (smooth, still dithered) */
  function dlevel(a, x, y, L) { if (a <= 0) return 0; if (a >= 1) return 1; var t = a * (L - 1), base = Math.floor(t); return (base + ((t - base) > bth8(x, y) ? 1 : 0)) / (L - 1); }
  function bGet(b, x, y) { var i = (y * b.cw + x) * 4, d = b.img.data; return [d[i], d[i + 1], d[i + 2]]; }
  function mix(a, c, q) { return [a[0] + (c[0] - a[0]) * q, a[1] + (c[1] - a[1]) * q, a[2] + (c[2] - a[2]) * q]; }
  var HEAT = [[0, [20, 150, 60]], [0.3, [47, 224, 90]], [0.5, [255, 235, 60]], [0.72, [255, 150, 30]], [1, [255, 50, 50]]];
  function heat(v) { v = clamp(v, 0, 1); for (var i = 1; i < HEAT.length; i++) if (v <= HEAT[i][0]) { var a = HEAT[i - 1], b = HEAT[i], t = (v - a[0]) / (b[0] - a[0]); return mix(a[1], b[1], t); } return HEAT[HEAT.length - 1][1]; }
  function pixBuf(cv, cell) {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300, h = cv.clientHeight || w;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var cw = Math.ceil(w / cell), ch = Math.ceil(h / cell);
    return { cv: cv, x: cv.getContext('2d'), w: w, h: h, dpr: dpr, cell: cell, cw: cw, ch: ch, img: new ImageData(cw, ch) };
  }
  function bFill(b, c) { var d = b.img.data; for (var i = 0; i < d.length; i += 4) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } }
  function bPx(b, x, y, c) { if (x < 0 || y < 0 || x >= b.cw || y >= b.ch) return; var i = (y * b.cw + x) * 4, d = b.img.data; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  function bLine(b, x0, y0, x1, y1, c, dash) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, n = 0;
    for (;;) { if (!dash || (n >> 1) % 2 === 0) bPx(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } n++; }
  }
  function bFlush(b) {
    var off = b.cv._off || (b.cv._off = document.createElement('canvas'));
    if (off.width !== b.cw || off.height !== b.ch) { off.width = b.cw; off.height = b.ch; }
    off.getContext('2d').putImageData(b.img, 0, 0);
    b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.imageSmoothingEnabled = false;
    b.x.drawImage(off, 0, 0, b.cw, b.ch, 0, 0, Math.round(b.cw * b.cell * b.dpr), Math.round(b.ch * b.cell * b.dpr));
    b.x.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
  }

  function bStamp(b, name, cx, cy, n, col) {
    if (name === 'node') name = 'north_node';
    if (!PG || !PG.has(name)) return false;
    var m = PG.mask(name, n), x0 = Math.round(cx - n / 2), y0 = Math.round(cy - n / 2);
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y * n + x]) bPx(b, x0 + x, y0 + y, col);
    return true;
  }
  function bRect(b, x0, y0, w, h, col, fill) { for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (fill || y === 0 || y === h - 1 || x === 0 || x === w - 1) bPx(b, x0 + x, y0 + y, col); }
  var SIGN_NAMES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var GLYPHFONT = '"Noto Sans Symbols 2","Segoe UI Symbol","DejaVu Sans",sans-serif';
  function drawRadar(el) {
    var cv = el._cv; if (!cv) return;
    var cell = 2, b = pixBuf(cv, cell), cw = b.cw, c = el._c, R = Math.min(cw, b.ch) / 2 - 2, cx = cw / 2, cy = b.ch / 2;
    bFill(b, [1, 7, 2]);
    function pt(lon, r) { var a = lon * Math.PI / 180; return [cx - r * Math.cos(a), cy - r * Math.sin(a)]; }
    /* dithered dome: brighter toward the centre */
    var x, y;
    for (y = 0; y < b.ch; y++) for (x = 0; x < cw; x++) { var r = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / R; if (r <= 1) { var q0 = dlevel(0.42 * Math.pow(1 - r, 1.3), x, y, 4); if (q0) bPx(b, x, y, mix([1, 7, 2], [11, 66, 24], q0)); } }
    /* dotted range rings + sign spokes */
    [0.34, 0.56, 0.78, 1].forEach(function (f) { for (var a = 0; a < 720; a++) { if (a % 2) continue; var q = pt(a / 2, R * f); bPx(b, Math.round(q[0]), Math.round(q[1]), [30, 100, 44]); } });
    for (var i = 0; i < 12; i++) { var p0 = pt(i * 30, R * 0.78), p1 = pt(i * 30, R); bLine(b, p0[0], p0[1], p1[0], p1[1], [30, 100, 44], true); }
    /* cells: dithered glow at the midpoint, crisp line between the two bodies */
    var rp = R * 0.66, byId = {};
    c.pos.forEach(function (p) { byId[p.id] = pt(p.lon, rp); });
    var cells = (el._cells || []).map(function (cl) {
      var A = byId[cl.a], B = byId[cl.b];
      return { cl: cl, A: A, B: B, col: strengthColor(cl.s), mx: (A[0] + B[0]) / 2 * 0.55 + cx * 0.45, my: (A[1] + B[1]) / 2 * 0.55 + cy * 0.45,
               rad: R * (0.12 + 0.3 * clamp(cl.s * 1.3, 0, 1)), amp: (0.3 + 0.7 * clamp(cl.s * 1.4, 0, 1)) * (cl.applying ? 1 : 0.6) };
    });
    for (y = 0; y < b.ch; y++) for (x = 0; x < cw; x++) {
      var sum = 0;
      for (var k = 0; k < cells.length; k++) { var q = cells[k], dd = Math.sqrt((x - q.mx) * (x - q.mx) + (y - q.my) * (y - q.my)) / q.rad; if (dd < 1) sum += q.amp * Math.pow(1 - dd, 1.6); }
      if (sum > 0.02) { var lv = dlevel(clamp(sum * 1.05, 0, 1), x, y, 4); if (lv) bPx(b, x, y, mix(bGet(b, x, y), heat(sum * 0.95), lv)); }
    }
    cells.forEach(function (q) { bLine(b, q.A[0], q.A[1], q.B[0], q.B[1], q.col, !q.cl.applying); });
    /* sign ring + planet blips, as pixel glyphs */
    /* glyphs are drawn at full resolution (the 64-grid artwork scaled down) on an overlay, not stamped into the 2px grid */
    var ov = document.createElement('canvas'); ov.width = cv.width; ov.height = cv.height;
    var ox = ov.getContext('2d'); ox.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
    for (i = 0; i < 12; i++) { var ang = (i * 30 + 15) * Math.PI / 180; if (PG) PG.draw(ox, SIGN_NAMES[i], (cx - R * 0.89 * Math.cos(ang)) * cell, (cy - R * 0.89 * Math.sin(ang)) * cell, 26, 'rgb(90,215,120)'); }
    c.pos.forEach(function (p) {
      var q = byId[p.id], bx = Math.round(q[0]), by = Math.round(q[1]);
      bRect(b, bx - 8, by - 8, 17, 17, [2, 24, 8], true); bRect(b, bx - 8, by - 8, 17, 17, p.retro ? [255, 110, 110] : [110, 245, 140], false);
      if (PG) PG.draw(ox, p.id, bx * cell, by * cell, 27, p.retro ? 'rgb(255,140,140)' : 'rgb(215,255,225)');
    });
    radarState.base = { b: b, data: new Uint8ClampedArray(b.img.data), ov: ov, cx: cx, cy: cy, R: R, el: el, byId: byId, c: c, W: b.w };
    paintRadar();
  }
  function paintRadar() {
    var st = radarState.base; if (!st) return;
    var b = st.b, d = b.img.data; d.set(st.data);
    /* dithered sweep wedge + crisp leading edge */
    var a = radarState.sweep, trail = 0.9, cx = st.cx, cy = st.cy, R = st.R, x, y;
    var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(b.cw - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(b.ch - 1, Math.ceil(cy + R));
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
      var dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > R * R) continue;
      var df = ((a - Math.atan2(dy, dx)) % 6.2832 + 6.2832) % 6.2832;
      if (df < trail) { var ql = dlevel(0.34 * Math.pow(1 - df / trail, 1.8), x, y, 4); if (ql) bPx(b, x, y, mix(bGet(b, x, y), [90, 255, 140], ql)); }
    }
    bLine(b, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, [200, 255, 210]);
    bFlush(b);
    b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.drawImage(st.ov, 0, 0); b.x.setTransform(b.dpr, 0, 0, b.dpr, 0, 0);
  }
  function startSweep() {
    if (REDUCED || radarState.raf) return;
    var last = 0;
    (function loop(ts) {
      radarState.raf = requestAnimationFrame(loop);
      var b = radarState.base; if (!b || !b.b.cv.isConnected) return;
      var r = b.b.cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
      var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
      radarState.sweep = (radarState.sweep + dt * 0.9) % 6.2832; paintRadar();
    })(0);
  }

  /* ── IMPACT: plain words instead of an index. QUIET / STEADY / BUSY / HEAVY, with the reason attached. ── */
  function impactWord(v) { return lvl(v); }
  function impactCls(v) { return v >= 50 ? 'hi' : v >= 35 ? 'mid' : 'lo'; }          /* amber (bright / plain) over blue */
  function impactWhy(c, t0, t1) {                                  /* the next exact aspect that explains the number */
    var best = null; c.events.forEach(function (e) { if (e.type === 'aspect' && e.t >= t0 && e.t <= t1 && (!best || (e.a !== 'moon' && e.b !== 'moon' && (best.a === 'moon' || best.b === 'moon')))) best = e; });
    return best;
  }
  W.activity = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Window"><button type="button" data-act="actWin" data-val="24">24H</button><button type="button" data-act="actWin" data-val="72">72H</button><button type="button" data-act="actWin" data-val="168">7D</button></div>' +
        '<canvas class="graph" role="img" aria-label="Sky impact over time"></canvas><div class="sunken scr" data-read style="margin-top:6px"></div>' +
        '<p class="note">How hard the sky is hitting, in plain words: QUIET, MODERATE, BUSY or HEAVY. It counts how many big aspects are active and how close each is to exact. It is not good or bad.</p>';
      var cv = el.querySelector('canvas');
      function hover(ev) {
        var d = el._act; if (!d) return; var r = cv.getBoundingClientRect(), fx = clamp((ev.clientX - r.left) / r.width, 0, 1);
        ui.actHover = Math.round(fx * (d.samples.length - 1)); paintAct(el);
      }
      cv.addEventListener('pointermove', hover); cv.addEventListener('pointerdown', hover);
      cv.addEventListener('pointerleave', function () { ui.actHover = null; paintAct(el); });
    }
    qsa('[data-act="actWin"]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-val') === ui.actWin)); });
    var w = ui.actWin * H, t0 = c.t - w * 0.25, N = 96, step = w / N, samples = [];
    for (var i = 0; i <= N; i++) { var tt = t0 + i * step; samples.push({ t: tt, a: S.activity(tt) }); }
    el._act = { samples: samples, t0: t0, w: w, now: c.t };
    paintAct(el);
  } };
  /* the Impact graph: an ordered-dither area graph in pixels (2px cells, 4x4 Bayer). Amber where it hits hard, dithering out to blue toward the baseline. */
  function paintAct(el) {
    var d = el._act; if (!d) return;
    var cv = el.querySelector('canvas'), cell = 2, b = pixBuf(cv, cell), cw = b.cw, ch = b.ch, SCALE = 80;
    var padL = Math.ceil(78 / cell), padB = Math.ceil(22 / cell), padT = 3, padR = 3, iw = cw - padL - padR, ih = ch - padT - padB, base = padT + ih;
    bFill(b, [3, 6, 15]);
    var n = d.samples.length - 1, X, Y, v;
    [20, 35, 50].forEach(function (g) { Y = base - Math.round(g / SCALE * ih); for (X = padL; X < padL + iw; X += 2) bPx(b, X, Y, [22, 40, 96]); });
    function val(i) { var f = i / (iw - 1) * n, k = Math.min(n - 1, Math.floor(f)), t = f - k; return d.samples[k].a.value * (1 - t) + d.samples[k + 1].a.value * t; }
    var prevY = null, i, top;
    for (i = 0; i < iw; i++) {
      top = base - Math.round(Math.min(1, val(i) / SCALE) * ih); X = padL + i;
      var span = Math.max(1, base - top);
      for (Y = top; Y < base; Y++) {
        var lvl = 0.05 + 0.9 * Math.pow(1 - (Y - top) / span, 1.2);                       /* dense at the line, thinning to the baseline */
        if (lvl > bth(X, Y)) bPx(b, X, Y, lvl > 0.55 && val(i) >= 35 ? [255, 176, 0] : [58, 141, 255]);        /* amber near the line when it is busy, blue below it and when it is quiet */
      }
      var y0 = prevY === null ? top : prevY, y1 = top, ya = Math.min(y0, y1), yb = Math.max(y0, y1);
      for (Y = ya; Y <= yb; Y++) bPx(b, X, Y, val(i) >= 50 ? [255, 232, 140] : val(i) >= 35 ? [255, 190, 60] : [140, 190, 255]);
      prevY = top;
    }
    for (X = padL; X < padL + iw; X++) bPx(b, X, base, [40, 70, 150]);
    var nowI = (d.now - d.t0) / d.w * (iw - 1), nx = padL + Math.round(nowI);
    for (Y = padT; Y < base; Y += 2) bPx(b, nx, Y, [200, 225, 255]);
    var hi = ui.actHover == null ? Math.round(clamp(nowI / (iw - 1), 0, 1) * n) : clamp(ui.actHover, 0, n);
    if (ui.actHover != null) { var hx = padL + Math.round(hi / n * (iw - 1)); for (Y = padT; Y < base; Y += 2) bPx(b, hx, Y, [255, 232, 140]); }
    bFlush(b);
    var x = b.x; x.font = '16px "PerfectDOS","VT323","Courier New",monospace'; x.textBaseline = 'middle'; x.textAlign = 'right';
    [['HEAVY', 65, '#ffe078'], ['BUSY', 42, '#ffb000'], ['MODERATE', 27, '#6fa8ff'], ['QUIET', 10, '#4b6fc9']].forEach(function (L) { x.fillStyle = L[2]; x.fillText(L[0], padL * cell - 8, (base - L[1] / SCALE * ih) * cell); });
    x.fillStyle = '#8fa8ff'; x.textAlign = 'center'; var ticks = 5;
    for (var k = 0; k <= ticks; k++) x.fillText(stamp(d.t0 + d.w * k / ticks, d.now), (padL + iw * k / ticks) * cell, b.h - 8);
    x.fillStyle = '#cfe0ff'; x.textAlign = 'left'; x.fillText('NOW', nx * cell + 4, 8);
    var sm = d.samples[hi], act = sm.a, why = act.parts.slice(0, 3).map(function (p) { return aspHTML(p.aspect.a.id, p.aspect.b.id, p.aspect.aspect.id); }).join('  ');
    el.querySelector('[data-read]').innerHTML = '<span class="hd">' + (ui.actHover == null ? 'NOW' : stampLong(sm.t)) + ' · <span class="' + (act.value >= 50 ? 'amber' : 'cy') + '">' + impactWord(act.value) + '</span></span>' +
      (why ? '<div>Driven by ' + why + '</div>' : '<span class="dm">No major aspects in orb.</span>') + '<div class="dm">Move over the graph to read any moment.</div>';
  }

  /* ───────────────────────── SEISMOGRAPH ───────────────────────── */
  var AMBER = [255, 176, 0], AMBERHI = [255, 224, 120], BLUE = [48, 92, 255], BLUEHI = [96, 150, 255];
  W.seismo = { render: function (el, c) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="panel-row tabs" role="group" aria-label="Window"><button type="button" data-act="seisWin" data-val="24">24H</button><button type="button" data-act="seisWin" data-val="72">72H</button></div>' +
        '<canvas class="graph seismo" role="img" aria-label="Seismograph traces of the strongest aspects over time"></canvas><ul class="sr" data-sr></ul>' +
        '<p class="note">Each trace is one configuration. Amber = at or near exact (the peak, or impact); it dithers out to blue as the aspect loosens. Only aspects within 2° of exact are drawn.</p>';
    }
    qsa('[data-act="seisWin"]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-val') === ui.seisWin)); });
    var w = ui.seisWin * H, t0 = c.t - w * 0.2, N = 120, step = w / N, series = {}, maxes = {}, i, k;
    for (i = 0; i <= N; i++) {
      var tt = t0 + i * step, list = S.aspects(tt, S.positions(tt, { dec: false }));
      list.forEach(function (x) {
        k = x.a.id + '|' + x.b.id + '|' + x.aspect.id;
        if (!series[k]) series[k] = { a: x.a.id, b: x.b.id, asp: x.aspect.id, v: new Array(N + 1).fill(0) };
        series[k].v[i] = clamp(1 - x.orb / 2, 0, 1);
        maxes[k] = Math.max(maxes[k] || 0, series[k].v[i]);
      });
    }
    var keys = Object.keys(series).filter(function (kk) { return maxes[kk] > 0.05; }).sort(function (p, q) { return maxes[q] - maxes[p]; }).slice(0, 6), R = Math.max(1, keys.length);
    var cv = el.querySelector('canvas'), cell = 2, rowCss = 48; cv.style.height = (R * rowCss + 26) + 'px';
    var b = pixBuf(cv, cell), cw = b.cw, rh = rowCss / cell, padL = 44, padR = 3, iw = cw - padL - padR, half = 9, X, Y;
    bFill(b, [3, 6, 15]);
    var nowX = padL + Math.round((c.t - t0) / w * (iw - 1));
    var labels = [];
    keys.forEach(function (kk, r) {
      var sr = series[kk], cy = r * rh + Math.round(rh / 2), best = 0, bestI = 0;
      for (X = padL; X < padL + iw; X += 2) bPx(b, X, cy, [20, 36, 90]);                       /* baseline */
      for (i = 0; i < iw; i++) {
        var f = i / (iw - 1) * N, i0 = Math.min(N - 1, Math.floor(f)), v = sr.v[i0] * (1 - (f - i0)) + sr.v[i0 + 1] * (f - i0), amp = v > 0.02 ? Math.max(1, Math.round(v * half)) : 0;
        if (v > best) { best = v; bestI = i; }
        X = padL + i;
        for (var dy = -amp; dy <= amp; dy++) {
          Y = cy + dy;
          var level = v * (1 - 0.8 * Math.abs(dy) / (amp + 1));
          var ad = clamp((level - 0.25) / 0.75, 0, 1);
          if (ad > bth(X, Y)) bPx(b, X, Y, level > 0.85 ? AMBERHI : AMBER);                      /* impact: amber */
          else if (clamp(0.3 + level * 0.9, 0, 1) > bth(X + 2, Y + 1)) bPx(b, X, Y, level < 0.35 ? BLUE : BLUEHI);   /* dithered out to blue */
        }
      }
      if (best > 0.9) { for (Y = cy - half - 2; Y <= cy + half + 2; Y++) if ((Y & 1) === 0) bPx(b, padL + bestI, Y, AMBERHI); }
      var A = c.pos, ga = [S.BY_ID[sr.a].id, S.ASPECT_BY_ID[sr.asp].id === 'conj' ? 'conjunction' : S.ASPECT_BY_ID[sr.asp].id === 'sext' ? 'sextile' : S.ASPECT_BY_ID[sr.asp].id === 'sqr' ? 'square' : S.ASPECT_BY_ID[sr.asp].id === 'tri' ? 'trine' : 'opposition', S.BY_ID[sr.b].id];
      labels.push({ ga: ga, cy: cy });
    });
    for (Y = 0; Y < R * rh; Y += 2) bPx(b, nowX, Y, [120, 160, 255]);
    bFlush(b);
    var x = b.x;
    labels.forEach(function (lb) { lb.ga.forEach(function (nm, q) { if (PG) PG.draw(x, nm, 17 + q * 30, lb.cy * cell, 28, q === 1 ? 'rgb(255,190,60)' : 'rgb(215,228,255)'); }); });
    x.font = '16px "PerfectDOS","VT323","Courier New",monospace'; x.textBaseline = 'middle'; x.fillStyle = '#8fa8ff'; x.textAlign = 'center';
    for (k = 0; k <= 5; k++) x.fillText(stamp(t0 + w * k / 5, c.t), (padL + iw * k / 5) * cell, R * rowCss + 14);
    x.textAlign = 'left'; x.fillStyle = '#cfe0ff'; x.fillText('NOW', nowX * cell + 4, 8);
    el.querySelector('[data-sr]').innerHTML = keys.map(function (kk) { return '<li>' + S.eventPlain({ type: 'aspect', a: series[kk].a, b: series[kk].b, aspect: series[kk].asp }) + '</li>'; }).join('');
  } };

  /* ───────────────────────── TRAFFIC ───────────────────────── */
  W.traffic = { render: function (el, c) {
    var start = Math.floor(c.t / H) * H, rows = '', labels = ['QUIET', 'MODERATE', 'BUSY', 'HEAVY'], shades = ['░░', '▒▒', '▓▓', '██'];
    for (var b = 0; b < 8; b++) {
      var bs = start + b * 3 * H, best = null;
      for (var j = 0; j < 3; j++) { var a = S.activity(bs + j * H + H / 2); if (!best || a.value > best.value) best = a; }
      var lvl = best.value < 20 ? 0 : best.value < 35 ? 1 : best.value < 50 ? 2 : 3;
      var top = best.parts.slice(0, 2).map(function (p) { return aspHTML(p.aspect.a.id, p.aspect.b.id, p.aspect.aspect.id); }).join(' · ');
      rows += '<tr><td class="t">' + stamp(bs, c.t) + '</td><td class="amber blocks">' + shades[lvl] + ' ' + bar(best.value / 100, 10, '█', '░') + '</td><td class="ev">' + labels[lvl] + '</td><td class="dm">' + (top || '') + '</td></tr>';
    }
    el.innerHTML = '<div class="sunken"><table class="board"><thead><tr><th>FROM</th><th>LOAD</th><th>LEVEL</th><th>BUSIEST CONFIGURATIONS</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">Each row is a three-hour block, rated by its busiest moment: quiet, moderate, busy or heavy.</p>';
  } };

  /* ═══════════════ RENDER LOOP ═══════════════ */
  var nodes = [], queued = false, forceNext = false;
  function parseOpts(s) {
    var o = {}; (s || '').split(/[,\s]+/).forEach(function (kv) { if (!kv) return; var p = kv.split('='); o[p[0]] = p.length > 1 ? p[1] : true; }); return o;
  }
  function mount() {
    nodes = qsa('[data-widget]').map(function (n) {
      var w = W[n.getAttribute('data-widget')]; if (!w) return null;
      return { win: n, body: n.querySelector('[data-body]'), w: w, o: parseOpts(n.getAttribute('data-opts')) };
    }).filter(Boolean);
  }
  function renderAll(force) {
    var t = nowMs(), main = null, act = doc.activeElement, key = null;
    if (act && act.getAttribute && act.getAttribute('data-act')) key = act.getAttribute('data-act') + '|' + (act.getAttribute('data-val') || '');
    nodes.forEach(function (n) {
      try {
        var live = n.w === W.mini || n.w === W.strip;
        if (!force && !live && act && n.win.contains(act) && /^(INPUT|SELECT|TEXTAREA)$/.test(act.tagName)) return;
        var c = live ? null : (main || (main = ctx(t, state.frozen ? 'scrub' : 'main')));
        n.w.render(n.body, c, n.o, n.win);
      } catch (err) { n.body.innerHTML = '<span class="red">(this panel hit an error)</span>'; if (window.console) console.error(err); }
    });
    if (key) { var again = qsa('[data-act]').filter(function (b) { return b.getAttribute('data-act') + '|' + (b.getAttribute('data-val') || '') === key; })[0]; if (again && again !== act) again.focus(); }
  }
  function schedule(force) {
    forceNext = forceNext || !!force;
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; var f = forceNext; forceNext = false; renderAll(f); });
  }
  function tick() {
    if (!state.frozen) {
      var now = Date.now();
      qsa('span.cd').forEach(function (n) { n.textContent = S.countdown(+n.getAttribute('data-t') - now); });
    }
    var tc = doc.getElementById('tray-clock'), nowD = new Date(); if (tc) tc.textContent = pad(nowD.getHours()) + ':' + pad(nowD.getMinutes()) + ':' + pad(nowD.getSeconds());
    var tm = doc.getElementById('tray-moon');                                   /* the icon is the planetary hour's ruler; refreshed each minute */
    if (tm) {
      var mk = Math.floor(nowD.getTime() / 60000);
      if (trayMin !== mk) { trayMin = mk; try { var hr = clockFor(nowD.getTime()).current.ruler; if (hr && hr !== trayRuler) { trayRuler = hr; tm.innerHTML = g(S.BY_ID[hr].glyph); var tr = tm.parentNode; if (tr) tr.setAttribute('title', 'Planetary hour of ' + S.BY_ID[hr].name + ' (' + loc.name + ')'); } } catch (e) { /* keep the last icon */ } }
    }
  }
  var trayMin = -1, trayRuler = '';


  /* ───────────────────────── MAST CHIPS (page header): date, time, cycling next-up ───────────────────────── */
  function mastInit() {
    var vEl = doc.getElementById('mast-value'); if (!vEl) return;
    var dEl = doc.getElementById('mast-date'), tEl = doc.getElementById('mast-time'), items = [], idx = 0;
    function build() {
      var c = ctx(Date.now(), 'live'), t = c.t; items = [];
      c.events.filter(function (e) { return e.t > t; }).slice(0, 3).forEach(function (e) { items.push(evHTML(e) + ' ' + hm(e.t) + ' (in ' + short(e.t - t) + ')'); });
      c.asp.slice(0, 2).forEach(function (x) { items.push(aspHTML(x.a.id, x.b.id, x.aspect.id) + ' ' + (x.applying ? 'applying' : 'separating') + ' ' + S.fmtOrb(x.orb)); });
      if (!items.length) items.push('Clear skies');
    }
    function show() { vEl.innerHTML = items[idx % items.length]; idx++; }
    function clockTick() {
      var d = new Date();
      if (dEl) dEl.textContent = dayName(d.getTime()) + ', ' + fmtDM.format(d).toUpperCase();
      if (tEl) tEl.textContent = hm(d.getTime()) + ':' + pad(d.getSeconds()) + ' ' + tzAbbr(d.getTime());
    }
    build(); show(); clockTick();
    setInterval(clockTick, 1000);
    setInterval(show, 4500);
    setInterval(build, 60000);
  }

  var acts = {
    nextKind: function (v) { ui.nextKind = v; }, aspFilter: function (v) { ui.aspFilter = v; }, flightTab: function (v) { ui.flightTab = v; },
    flightType: function (v) { ui.flightTypes[v] = ui.flightTypes[v] ? 0 : 1; }, logWin: function (v) { ui.logWin = v; },
    speedMode: function (v) { ui.speedMode = v; }, radarWin: function (v) { ui.radarWin = +v; }, actWin: function (v) { ui.actWin = +v; }, seisWin: function (v) { ui.seisWin = +v; },
    live: function () { state.frozen = false; },
    skylinkClear: function () { birth = null; try { localStorage.removeItem('aw98_birth'); sessionStorage.removeItem('aw98_acct'); } catch (e) { /* ignore */ } },
    step: function (v) { var base = nowMs(); state.frozen = true; state.ms = base + (+v) * 60000; if (Math.abs(state.ms - Date.now()) < 30000) state.frozen = false; },
    diffPreset: function (v) { var n = nowMs(); ui.diffB = n; ui.diffA = v === 'yday' ? n - DAY : v === 'week' ? n - 7 * DAY : n; if (v === 'tmrw') { ui.diffA = n; ui.diffB = n + DAY; } },
    geo: function () {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function (p) {
        setLoc({ name: 'My location', tz: userTz, lat: p.coords.latitude, lng: p.coords.longitude, approx: false });
        var sel = doc.querySelector('[data-loc]'); if (sel && !sel.querySelector('option[value="__cur"]')) { var op = doc.createElement('option'); op.value = '__cur'; op.textContent = 'My location'; sel.insertBefore(op, sel.firstChild); }
        schedule(true);
      }, function () { /* denied: keep the current location */ }, { timeout: 8000, maximumAge: 3600000 });
    }
  };
  doc.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-act]'); if (!b || !acts[b.getAttribute('data-act')]) return;
    acts[b.getAttribute('data-act')](b.getAttribute('data-val')); schedule(true);
  });

  /* ═══════════════ ON AIR TICKER ═══════════════ */
  function buildTicker() {
    var track = doc.getElementById('onair-track'); if (!track) return;
    var c = ctx(Date.now(), 'live'), t = c.t, parts = [], plain = [];
    function add(cls, html, txt) { parts.push('<span class="it ' + cls + '">' + html + '</span>'); plain.push(txt); }
    c.pos.filter(function (p) { return p.id !== 'node'; }).forEach(function (p) {
      add('pos' + (p.retro ? ' rx' : ''), g(p.glyph) + ' ' + posHTML(p) + (p.retro ? ' <span class="rx">℞</span>' : ''), p.name + ' ' + p.deg + ' degrees ' + p.signName + (p.retro ? ' retrograde' : ''));
    });
    parts.push('<span class="bar">✦</span>');
    c.asp.filter(function (x) { return x.orb <= 3; }).slice(0, 8).forEach(function (x) {
      add('asp', aspHTML(x.a.id, x.b.id, x.aspect.id) + ' ' + S.fmtOrb(x.orb) + ' ' + (x.applying ? 'APPLYING' : 'SEPARATING'),
        x.a.name + ' ' + x.aspect.name + ' ' + x.b.name + ', ' + (x.applying ? 'applying' : 'separating'));
    });
    parts.push('<span class="bar">✦ NEXT</span>');
    var n = 0;
    for (var i = 0; i < c.events.length && n < 5; i++) {
      var e = c.events[i]; if (e.t <= t) continue; n++;
      add('nx', evHTML(e) + ' ' + hm(e.t) + ' (' + short(e.t - t) + ')', S.eventPlain(e) + ' in ' + short(e.t - t));
    }
    var ph = S.moonPhase(t); parts.push('<span class="bar">✦</span>');
    add('pos', g('☽︎') + ' ' + esc(ph.name.toUpperCase()) + ' ' + Math.round(ph.illum * 100) + '%', ph.name + ' ' + Math.round(ph.illum * 100) + ' percent');
    var html = parts.join('') + '<span class="bar">◆◆◆</span>';
    track.innerHTML = html + html;
    var host = doc.getElementById('onair'), srEl = host.querySelector('.sr');
    if (!srEl) { srEl = doc.createElement('span'); srEl.className = 'sr'; host.appendChild(srEl); }
    srEl.textContent = 'Current transits: ' + plain.join('; ');
    track.setAttribute('aria-hidden', 'true');
    if (!REDUCED) {
      var mult = { Slow: 1.6, Fast: 0.6 }[doc.body.getAttribute('data-ticker')] || 1;
      track.style.setProperty('--ticker-dur', Math.max(60, Math.round(track.textContent.length / 2 * 0.2 * mult)) + 's');
      track.classList.add('go');
    }
  }

  function init() {
    mount();
    try { buildTicker(); } catch (e) { if (window.console) console.error(e); }
    try { mastInit(); } catch (e) { if (window.console) console.error(e); }
    renderAll(true); tick();
    window.AW98_READY = true; try { doc.dispatchEvent(new Event('aw98:ready')); } catch (e) { /* old browser: the loader has a timer fallback */ }   /* the SigiLoader waits for this: the sky engine and first panels are drawn */
    setInterval(tick, 1000);
    setInterval(function () { if (!state.frozen) renderAll(false); }, 20000);
    setInterval(function () { try { buildTicker(); } catch (e) { /* keep the last ticker */ } }, 120000);
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { schedule(true); }, 150); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();

  window.AW98 = { ui: ui, state: state, render: schedule };
})();
