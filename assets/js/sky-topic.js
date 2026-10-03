/* ═══════════════════════════════════════════════════════════
   SKY TOPIC: works out what a post is about and fetches the matching live sky facts.
     SkyTopic.detect({ title, tags: ['Retrogrades'], excerpt })  ->  { kind, planet?, sign? }
     SkyTopic.facts(topic, publishedMs, nowMs)                    ->  { kind, planet, glyphs: ['mercury','virgo'], head, lines: [[colour, text], ...] }
   Routing:
     retrograde  any post about retrogrades or stations. ALWAYS shows the next retrograde from nowMs (so the screen never goes stale);
                 with no planet named, Mercury.
     planet      a planet's condition (sign, degree, direct or retrograde, speed, dignity, what comes next) as of the PUBLISH instant.
     moon        phase and sign at publish, and the next lunation.
     general     the Sun, the Moon and any retrogrades at publish.
   Needs AstroSky (astro-engine.js). Runs in the browser and in Node.
═══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var S = root.AstroSky || (typeof require !== 'undefined' ? require('./astro-engine.js') : null), DAY = 86400000;
  var PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'sun', 'moon'];
  var SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  function detect(p) {
    var text = ((p.title || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.excerpt || '')).toLowerCase(), title = (p.title || '').toLowerCase(), planet = null, i;
    for (i = 0; i < PLANETS.length; i++) if (new RegExp('\\b' + PLANETS[i] + '\\b').test(title)) { planet = PLANETS[i]; break; }
    if (!planet) for (i = 0; i < PLANETS.length; i++) if (new RegExp('\\b' + PLANETS[i] + '\\b').test(text)) { planet = PLANETS[i]; break; }
    if (/\bretro(grade|grades)?\b|\brx\b/.test(text) || (planet && /\bstation(s|ing)?\b/.test(title))) return { kind: 'retrograde', planet: (planet && planet !== 'sun' && planet !== 'moon') ? planet : 'mercury' };
    if (planet && planet !== 'moon') return { kind: 'planet', planet: planet };
    if (planet === 'moon' || /\b(new|full) moon\b|\blunar\b|\beclipse/.test(text)) return { kind: 'moon' };
    return { kind: 'general' };
  }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function isoFull(ms) { return new Date(ms).toISOString().slice(0, 19) + 'Z'; }
  function deg(l) { var s = Math.floor(l / 30), w = l - s * 30, d = Math.floor(w), m = Math.floor((w - d) * 60); return { sign: s, text: d + '°' + (m < 10 ? '0' : '') + m + "'" }; }
  function upper(id) { return id.toUpperCase(); }
  function inDays(ms, now) { var d = Math.round((ms - now) / DAY); return d <= 0 ? 'TODAY' : d === 1 ? 'IN 1 DAY' : 'IN ' + d + ' DAYS'; }
  function at(id, t) { var l = S.lon(id, t), d = deg(l); return { sign: S.SIGNS[d.sign].name.toUpperCase(), signId: SIGN_IDS[d.sign], text: d.text }; }
  var ASPG = { conj: 'conjunction', sext: 'sextile', sqr: 'square', tri: 'trine', opp: 'opposition' };
  function md(ms) { return iso(ms).slice(5).replace('-', '/'); }
  function G(id, c) { return { g: id, c: c || 'yellow' }; }
  function T(t, c) { return { t: String(t), c: c || 'white' }; }
  function aspRows(t, planet, max) {                                    /* the planet's aspects at instant t, as glyph triples */
    var pos = S.positions(t, { dec: false }), list = S.aspects(t, pos).filter(function (x) { return !planet || x.a.id === planet || x.b.id === planet; }).slice(0, max || 2);
    return list.map(function (x) { return [G(x.a.id, 'yellow'), G(ASPG[x.aspect.id] || 'conjunction', 'white'), G(x.b.id, 'cyan'), T(S.fmtOrb ? S.fmtOrb(x.orb) : x.orb.toFixed(1), 'green')]; });
  }
  function retro(planet, now) {
    var sp = S.speed(planet, now), lines = [], glyphs = [planet], st, next, end;
    if (sp < 0) {
      end = S.nextStation(planet, now, 500);
      lines.push(['yellow', upper(planet) + ' IS RETROGRADE NOW']);
      if (end) { var e = at(planet, end.t); lines.push(['white', 'TURNS DIRECT ' + iso(end.t)], ['cyan', '  ' + e.text + ' ' + e.sign], ['green', '  ' + inDays(end.t, now)]); glyphs.push(e.signId); }
      next = end && S.nextStation(planet, end.t + DAY, 900);
      if (next) lines.push(['white', 'NEXT RETROGRADE ' + iso(next.t)]);
      var rowsR = [[G(planet), T('RX', 'red'), T('NOW', 'red')]];
      if (end) { var e2 = at(planet, end.t); rowsR.push([G(planet), T('D', 'green'), G(e2.signId, 'cyan'), T(e2.text, 'cyan'), T(md(end.t), 'white')], [T(inDays(end.t, now), 'green')]); }
      return { kind: 'retrograde', planet: planet, glyphs: glyphs, head: 'NEXT ' + upper(planet) + ' RETROGRADE', lines: lines, rows: rowsR };
    }
    st = S.nextStation(planet, now, 900);
    if (!st) return { kind: 'retrograde', planet: planet, glyphs: glyphs, head: upper(planet) + ' RETROGRADE', lines: [['white', 'NO STATION FOUND SOON']] };
    var a = at(planet, st.t); end = S.nextStation(planet, st.t + DAY, 900);
    lines.push(['yellow', 'STARTS ' + iso(st.t)], ['cyan', '  ' + a.text + ' ' + a.sign], ['green', '  ' + inDays(st.t, now)]);
    if (end) { var b = at(planet, end.t); lines.push(['white', 'TURNS DIRECT ' + iso(end.t)], ['cyan', '  ' + b.text + ' ' + b.sign]); }
    glyphs.push(a.signId);
    var rowsN = [[G(planet), T('RX', 'red'), G(a.signId, 'cyan'), T(a.text, 'cyan'), T(md(st.t), 'white')]];
    if (end) { var b2 = at(planet, end.t); rowsN.push([G(planet), T('D', 'green'), G(b2.signId, 'cyan'), T(b2.text, 'cyan'), T(md(end.t), 'white')]); }
    rowsN.push([T(inDays(st.t, now), 'green')]);
    return { kind: 'retrograde', planet: planet, glyphs: glyphs, head: 'NEXT ' + upper(planet) + ' RETROGRADE', lines: lines, rows: rowsN };
  }
  function planetFacts(planet, pub, now) {
    var l = S.lon(planet, pub), d = deg(l), sp = S.speed(planet, pub), b = S.BY_ID[planet], dg = S.dignity(planet, d.sign), lines = [], glyphs = [planet, SIGN_IDS[d.sign]];
    lines.push(['yellow', upper(planet) + ' ' + d.text + ' ' + S.SIGNS[d.sign].name.toUpperCase()]);
    lines.push([sp < 0 ? 'red' : 'green', sp < 0 ? 'RETROGRADE' : 'DIRECT'], ['white', 'SPEED ' + Math.abs(sp).toFixed(planet === 'moon' ? 1 : 3) + ' DEG/DAY']);
    if (dg) lines.push([dg === 'domicile' || dg === 'exaltation' ? 'yellow' : dg === 'peregrine' ? 'white' : 'cyan', 'DIGNITY ' + upper(dg)]);
    var ing = planet === 'moon' ? null : S.nextIngress(planet, pub, 900);
    if (ing) lines.push(['white', 'NEXT SIGN ' + upper(S.SIGNS[ing.sign].name) + ' ' + iso(ing.t)]);
    var rowsP = [[G(planet), G(SIGN_IDS[d.sign], 'cyan'), T(d.text, 'cyan'), T(sp < 0 ? 'RX' : 'D', sp < 0 ? 'red' : 'green')]];
    if (dg) rowsP.push([T(upper(dg), dg === 'domicile' || dg === 'exaltation' ? 'yellow' : dg === 'peregrine' ? 'white' : 'cyan')]);
    aspRows(pub, planet, 2).forEach(function (r) { rowsP.push(r); });
    if (ing) rowsP.push([T('NEXT', 'white'), G(SIGN_IDS[ing.sign], 'cyan'), T(md(ing.t), 'white')]);
    return { kind: 'planet', planet: planet, glyphs: glyphs, head: upper(planet) + ' AT PUBLISH', lines: lines, rows: rowsP };
  }
  function moonFacts(pub) {
    var ph = S.moonPhase(pub), ml = S.lon('moon', pub), d = deg(ml), nx = S.nextLunation(pub, [0, 2], 40), lines = [];
    lines.push(['yellow', upper(ph.name) + ' ' + Math.round(ph.illum * 100) + '%'], ['cyan', 'MOON ' + d.text + ' ' + S.SIGNS[d.sign].name.toUpperCase()]);
    if (nx) lines.push(['white', 'NEXT ' + upper(nx.name) + ' ' + iso(nx.t)], ['cyan', '  ' + S.SIGNS[nx.sign].name.toUpperCase()]);
    var rowsM = [[G('moon', 'white'), G(SIGN_IDS[d.sign], 'cyan'), T(d.text, 'cyan')], [T(upper(ph.name) + ' ' + Math.round(ph.illum * 100) + '%', 'yellow')]];
    if (nx) rowsM.push([T(nx.name === 'Full Moon' ? 'FULL' : 'NEW', 'white'), G(SIGN_IDS[nx.sign], 'cyan'), T(md(nx.t), 'white')]);
    aspRows(pub, 'moon', 1).forEach(function (r) { rowsM.push(r); });
    return { kind: 'moon', planet: 'moon', glyphs: ['moon', SIGN_IDS[d.sign]], head: 'THE MOON AT PUBLISH', lines: lines, rows: rowsM, phase: ph.phase };
  }
  function general(pub) {
    var pos = S.positions(pub, { dec: false }), sun = pos[0], moon = pos[1], rx = pos.filter(function (p) { return p.retro; }), lines = [];
    lines.push(['yellow', 'SUN  ' + sun.deg + '° ' + sun.signName.toUpperCase()], ['cyan', 'MOON ' + moon.deg + '° ' + moon.signName.toUpperCase()]);
    lines.push([rx.length ? 'red' : 'green', rx.length ? 'RETROGRADE: ' + rx.map(function (p) { return upper(p.name); }).join(' ') : 'NO PLANETS RETROGRADE']);
    var rowsG = [[G('sun'), G(SIGN_IDS[sun.sign], 'cyan'), T(sun.deg + '\u00B0', 'cyan'), G('moon', 'white'), G(SIGN_IDS[moon.sign], 'cyan'), T(moon.deg + '\u00B0', 'cyan')]];
    aspRows(pub, null, 2).forEach(function (r) { rowsG.push(r); });
    if (rx.length) rowsG.push([T('RX', 'red')].concat(rx.slice(0, 5).map(function (p) { return G(p.id, 'red'); })));
    return { kind: 'general', planet: 'sun', glyphs: ['sun', 'moon', SIGN_IDS[sun.sign]], head: 'THE SKY AT PUBLISH', lines: lines, rows: rowsG };
  }
  function facts(topic, pub, now) {
    var f = topic.kind === 'retrograde' ? retro(topic.planet, now || Date.now()) : topic.kind === 'planet' ? planetFacts(topic.planet, pub, now) : topic.kind === 'moon' ? moonFacts(pub) : general(pub);
    f.published = isoFull(pub); return f;
  }
  /* one-line summaries used by cards: a hook, when, and who (sign) */
  function summary(f, pub, now) {
    var o = { hook: '', when: '', whoSign: null, whoName: '' };
    f.lines.forEach(function (l) { if (!o.when) { var m = /(\d{4}-\d{2}-\d{2})/.exec(l[1]); if (m) o.when = m[1]; } });
    var sg = f.kind === 'general' ? null : f.glyphs.filter(function (g) { return SIGN_IDS.indexOf(g) >= 0; })[0]; if (sg) { o.whoSign = sg; o.whoName = sg.toUpperCase(); }
    if (f.kind === 'retrograde') o.hook = upper(f.planet) + ' TURNS RETROGRADE ' + (o.when ? o.when.slice(5).replace('-', '/') : '') + (o.whoName ? ' IN ' + o.whoName : '');
    else if (f.kind === 'planet') o.hook = upper(f.planet) + ' IN ' + o.whoName + (f.lines.filter(function (l) { return /^DIGNITY/.test(l[1]); })[0] || [0, ''])[1].replace('DIGNITY', ' \u00B7').toUpperCase();
    else if (f.kind === 'moon') o.hook = f.lines[0][1];
    return o;
  }

  /* WHO IS BEING HIT: ranks the twelve signs by what the sky is doing to them at instant ms, with the reasons.
     Used for the Book card, the "Who is hit right now" panel and the "good time to book" nudge. Returns:
       { level: 'QUIET'|'MODERATE'|'BUSY'|'HEAVY', activity, signs: [{ sign, id, name, score, why: [token...] }], top: { a, b, asp, orb, t (next exact) } | null, degrees: [{ planet, sign, id, deg }] } */
  function hit(ms) {
    var pos = S.positions(ms, { dec: false }), asp = S.aspects(ms, pos), score = {}, why = {}, i;
    function add(sign, v, tok) { score[sign] = (score[sign] || 0) + v; (why[sign] = why[sign] || []).push({ v: v, tok: tok }); }
    asp.forEach(function (x) {
      var hard = x.aspect.id === 'sqr' || x.aspect.id === 'opp' || x.aspect.id === 'conj', w = x.strength * ((x.a.id === 'moon' || x.b.id === 'moon') ? 0.35 : 1) * (hard ? 1.2 : 0.6), tok = { a: x.a.id, b: x.b.id, asp: x.aspect.id, orb: x.orb };
      add(Math.floor(S.lon(x.a.id, ms) / 30), w, tok); add(Math.floor(S.lon(x.b.id, ms) / 30), w, tok);
    });
    pos.forEach(function (p) { if (p.id === 'node' || p.id === 'sun' || p.id === 'moon') return; var r = Math.abs(p.speed) / p.body.typical; if (r < 0.25) add(p.sign, 1.2, { st: p.id }); else if (p.retro && p.id === 'mercury') add(p.sign, 0.4, { rx: p.id }); });
    var lun = S.nextLunation(ms - 36 * 3600000, [0, 2], 3); if (lun && Math.abs(lun.t - ms) < 36 * 3600000) add(lun.sign, 1.5, { lun: lun.name });
    var signs = []; for (i = 0; i < 12; i++) if (score[i]) signs.push({ sign: i, id: SIGN_IDS[i], name: S.SIGNS[i].name, score: score[i], why: why[i].sort(function (a, b) { return b.v - a.v; }).slice(0, 2).map(function (q) { return q.tok; }) });
    signs.sort(function (a, b) { return b.score - a.score; });
    var topA = asp.slice().sort(function (a, b) { return b.strength - a.strength; })[0] || null, top = null, degrees = [];
    if (topA) {
      var ev = null; S.scan(ms - 6 * 3600000, ms + 60 * 3600000).forEach(function (e) { if (!ev && e.type === 'aspect' && e.a === topA.a.id && e.b === topA.b.id && e.aspect === topA.aspect.id && e.t >= ms - 6 * 3600000) ev = e; });
      top = { a: topA.a.id, b: topA.b.id, asp: topA.aspect.id, orb: topA.orb, t: ev ? ev.t : null };
      [topA.a.id, topA.b.id].forEach(function (id) { var l = S.lon(id, ms), sg = Math.floor(l / 30); degrees.push({ planet: id, sign: sg, id: SIGN_IDS[sg], name: S.SIGNS[sg].name, deg: Math.floor(l - sg * 30) }); });
    }
    /* every active aspect, grouped by the modality of its first planet's sign (cardinal / fixed / mutable), hardest to easiest, tightest first */
    var MODS = ['cardinal', 'fixed', 'mutable'], HARD = { opp: 5, sqr: 5, conj: 4, sext: 2, tri: 1 }, groups = { cardinal: [], fixed: [], mutable: [] };
    asp.forEach(function (x) { var sg = Math.floor(S.lon(x.a.id, ms) / 30); groups[MODS[sg % 3]].push({ a: x.a.id, b: x.b.id, asp: x.aspect.id, orb: x.orb, hard: HARD[x.aspect.id] || 1, strength: x.strength }); });
    MODS.forEach(function (m) { groups[m].sort(function (p, q) { return q.hard - p.hard || p.orb - q.orb; }); });
    var act = S.activity(ms).value;
    return { groups: groups, level: act < 20 ? 'QUIET' : act < 35 ? 'MODERATE' : act < 50 ? 'BUSY' : 'HEAVY', activity: act, signs: signs, top: top, degrees: degrees };
  }
  var api = { hit: hit, ASPG: ASPG, summary: summary, detect: detect, facts: facts, iso: iso, isoFull: isoFull, SIGN_IDS: SIGN_IDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SkyTopic = api;
})(typeof self !== 'undefined' ? self : this);
