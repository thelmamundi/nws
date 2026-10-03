/* ═══════════════════════════════════════════════════════════
   ASTRO EVENT ENGINE  (shared by the ticker and every widget)

   Pure functions of time. No DOM, no network, no storage.
   ephemeris -> positions -> aspects -> normalized events

   Accuracy: JPL "approximate positions" Keplerian elements
   (1800-2050) for the planets, a perturbed Keplerian Moon.
   Good to a few arc-minutes for the Moon and inner planets and
   about 0.1 degree for Jupiter/Saturn. Plenty for a public
   instrument panel; not a replacement for a full ephemeris.
   Exact-time countdowns are therefore "approx" for the slowest
   pairs, and the UI says so.

   Event envelope (everything the widgets draw is one of these):
     { type, t (ms UTC), a, b, aspect, sign, dir, label, ... }
   type: aspect | ingress | station | lunation
═══════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AstroSky = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RAD = Math.PI / 180, DEG = 180 / Math.PI;
  var H = 3600000, DAY = 86400000;

  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function wrap180(x) { x = norm(x); return x > 180 ? x - 360 : x; }
  function jd(ms) { return ms / DAY + 2440587.5; }

  /* text-presentation selector: stops phones turning glyphs into emoji */
  var TP = '︎';
  var SIGNS = [
    ['Aries', '♈'], ['Taurus', '♉'], ['Gemini', '♊'], ['Cancer', '♋'],
    ['Leo', '♌'], ['Virgo', '♍'], ['Libra', '♎'], ['Scorpio', '♏'],
    ['Sagittarius', '♐'], ['Capricorn', '♑'], ['Aquarius', '♒'], ['Pisces', '♓']
  ].map(function (s) { return { name: s[0], glyph: s[1] + TP }; });

  /* body table. typical = mean geocentric motion (deg/day); lo/hi = usual speed range */
  var BODIES = [
    { id: 'sun',     name: 'Sun',     glyph: '☉' + TP, typical: 0.9856,  lo: 0.953,  hi: 1.019 },
    { id: 'moon',    name: 'Moon',    glyph: '☽' + TP, typical: 13.176,  lo: 11.8,   hi: 15.4 },
    { id: 'mercury', name: 'Mercury', glyph: '☿' + TP, typical: 1.383,   lo: -1.40,  hi: 2.20 },
    { id: 'venus',   name: 'Venus',   glyph: '♀' + TP, typical: 1.2,     lo: -0.72,  hi: 1.26 },
    { id: 'mars',    name: 'Mars',    glyph: '♂' + TP, typical: 0.524,   lo: -0.40,  hi: 0.80 },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃' + TP, typical: 0.0831,  lo: -0.14,  hi: 0.24 },
    { id: 'saturn',  name: 'Saturn',  glyph: '♄' + TP, typical: 0.0335,  lo: -0.12,  hi: 0.13 },
    { id: 'uranus',  name: 'Uranus',  glyph: '♅' + TP, typical: 0.01172, lo: -0.06,  hi: 0.07 },
    { id: 'neptune', name: 'Neptune', glyph: '♆' + TP, typical: 0.00598, lo: -0.04,  hi: 0.045 },
    { id: 'pluto',   name: 'Pluto',   glyph: '♇' + TP, typical: 0.00397, lo: -0.035, hi: 0.04 },
    { id: 'node',    name: 'N.Node',  glyph: '☊' + TP, typical: -0.0530, lo: -0.07,  hi: -0.03, point: true }
  ];
  var BY_ID = {}; BODIES.forEach(function (b, i) { b.i = i; BY_ID[b.id] = b; });
  var PLANETS = BODIES.filter(function (b) { return !b.point; });   /* things that make aspects */

  /* aspects: angle, glyph, name, max orb for "active", weight for the activity index */
  var ASPECTS = [
    { id: 'conj', name: 'conjunction', short: 'conj', angle: 0,   glyph: '☌' + TP, orb: 6, w: 1.0 },
    { id: 'sext', name: 'sextile',     short: 'sext', angle: 60,  glyph: '⚹' + TP, orb: 4, w: 0.5 },
    { id: 'sqr',  name: 'square',      short: 'sqr',  angle: 90,  glyph: '□',      orb: 5, w: 1.0 },
    { id: 'tri',  name: 'trine',       short: 'tri',  angle: 120, glyph: '△',      orb: 5, w: 0.7 },
    { id: 'opp',  name: 'opposition',  short: 'opp',  angle: 180, glyph: '☍' + TP, orb: 6, w: 1.0 }
  ];
  var ASPECT_BY_ID = {}; ASPECTS.forEach(function (a) { ASPECT_BY_ID[a.id] = a; });

  /* ── PLANET ELEMENTS (JPL Table 1, J2000 ecliptic) ──
     [a, da, e, de, I, dI, L, dL, peri, dperi, node, dnode]  (per Julian century) */
  var EL = {
    mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
    venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
    earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
    mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
    jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
    saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
    uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
    neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
    pluto:   [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482]
  };

  function kepler(M, e) {            /* M radians -> E radians */
    var E = M + e * Math.sin(M);
    for (var i = 0; i < 8; i++) {
      var d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d; if (Math.abs(d) < 1e-10) break;
    }
    return E;
  }

  function helio(el, T) {            /* heliocentric ecliptic xyz (AU), J2000 */
    var a = el[0] + el[1] * T, e = el[2] + el[3] * T, I = (el[4] + el[5] * T) * RAD,
        L = el[6] + el[7] * T, w = el[8] + el[9] * T, N = (el[10] + el[11] * T) * RAD;
    var M = wrap180(L - w) * RAD, E = kepler(M, e);
    var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var om = (w * RAD) - N;
    var co = Math.cos(om), so = Math.sin(om), cN = Math.cos(N), sN = Math.sin(N), cI = Math.cos(I), sI = Math.sin(I);
    return {
      x: (co * cN - so * sN * cI) * xp + (-so * cN - co * sN * cI) * yp,
      y: (co * sN + so * cN * cI) * xp + (-so * sN + co * cN * cI) * yp,
      z: (so * sI) * xp + (co * sI) * yp
    };
  }

  function precession(T) { return 1.396971 * T + 0.0003086 * T * T; }

  /* Moon: perturbed Keplerian (lon/lat in ecliptic of date, ~2 arc-min) */
  function moonLonLat(ms) {
    var d = jd(ms) - 2451543.5;
    var N = norm(125.1228 - 0.0529538083 * d), i = 5.1454 * RAD,
        w = norm(318.0634 + 0.1643573223 * d), e = 0.0549,
        M = norm(115.3654 + 13.0649929509 * d);
    var E = kepler(M * RAD, e);
    var xv = 60.2666 * (Math.cos(E) - e), yv = 60.2666 * Math.sqrt(1 - e * e) * Math.sin(E);
    var v = Math.atan2(yv, xv) * DEG, r = Math.sqrt(xv * xv + yv * yv);
    var vw = (v + w) * RAD, Nr = N * RAD;
    var xh = r * (Math.cos(Nr) * Math.cos(vw) - Math.sin(Nr) * Math.sin(vw) * Math.cos(i));
    var yh = r * (Math.sin(Nr) * Math.cos(vw) + Math.cos(Nr) * Math.sin(vw) * Math.cos(i));
    var zh = r * Math.sin(vw) * Math.sin(i);
    var lon = Math.atan2(yh, xh) * DEG, lat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) * DEG;
    var Ms = norm(356.0470 + 0.9856002585 * d), ws = 282.9404 + 4.70935e-5 * d,
        Ls = Ms + ws, Lm = M + w + N, D = Lm - Ls, F = Lm - N;
    function s(x) { return Math.sin(x * RAD); }
    lon += -1.274 * s(M - 2 * D) + 0.658 * s(2 * D) - 0.186 * s(Ms) - 0.059 * s(2 * M - 2 * D)
         - 0.057 * s(M - 2 * D + Ms) + 0.053 * s(M + 2 * D) + 0.046 * s(2 * D - Ms)
         + 0.041 * s(M - Ms) - 0.035 * s(D) - 0.031 * s(M + Ms) - 0.015 * s(2 * F - 2 * D) + 0.011 * s(M - 4 * D);
    lat += -0.173 * s(F - 2 * D) - 0.055 * s(M - F - 2 * D) - 0.046 * s(M + F - 2 * D) + 0.033 * s(F + 2 * D) + 0.017 * s(2 * M + F);
    return { lon: norm(lon), lat: lat, r: r };
  }

  /* longitude/latitude of one body (tropical, of date) */
  function lonLat(id, ms) {
    var T = (jd(ms) - 2451545.0) / 36525;
    if (id === 'moon') return moonLonLat(ms);
    if (id === 'node') return { lon: norm(125.04452 - 1934.136261 * T + 0.0020708 * T * T), lat: 0 };
    var ea = helio(EL.earth, T);
    if (id === 'sun') return { lon: norm(Math.atan2(-ea.y, -ea.x) * DEG + precession(T) - 0.0057), lat: 0 };
    var p = helio(EL[id], T), x = p.x - ea.x, y = p.y - ea.y, z = p.z - ea.z;
    return { lon: norm(Math.atan2(y, x) * DEG + precession(T)), lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG };
  }
  function lon(id, ms) { return lonLat(id, ms).lon; }
  function speed(id, ms) {           /* deg/day, centred difference */
    var dt = id === 'moon' ? H / 4 : H;
    return wrap180(lon(id, ms + dt) - lon(id, ms - dt)) / (2 * dt) * DAY;
  }


  /* Topocentric Moon: the Moon seen from a place on Earth's surface instead of the centre. The parallax (up to ~1 degree) is why the
     Moon's degrees and minutes differ by place. ll = { lon, lat, r (Earth radii) }; observer lat/lng in degrees (N+, E+). */
  function topoMoon(ms, ll, lat, lng) {
    var d = jd(ms) - 2451545.0, T = d / 36525, gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T,
        th = norm(gmst + lng) * RAD, eps = (23.4392911 - 0.0130042 * T) * RAD, l = ll.lon * RAD, b = ll.lat * RAD, phi = lat * RAD,
        ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)),
        dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l)),
        sp = 1 / ll.r, rc = Math.cos(phi), rs = 0.99664719 * Math.sin(phi), H = th - ra,
        dra = Math.atan2(-rc * sp * Math.sin(H), Math.cos(dec) - rc * sp * Math.cos(H)),
        dec2 = Math.atan2((Math.sin(dec) - rs * sp) * Math.cos(dra), Math.cos(dec) - rc * sp * Math.cos(H)), ra2 = ra + dra;
    return { lon: norm(Math.atan2(Math.sin(ra2) * Math.cos(eps) + Math.tan(dec2) * Math.sin(eps), Math.cos(ra2)) * DEG),
             lat: Math.asin(Math.sin(dec2) * Math.cos(eps) - Math.cos(dec2) * Math.sin(eps) * Math.sin(ra2)) * DEG, r: ll.r };
  }

  var EPS = 23.4393 * RAD;
  function declination(l, b) {
    return Math.asin(Math.sin(b * RAD) * Math.cos(EPS) + Math.cos(b * RAD) * Math.sin(EPS) * Math.sin(l * RAD)) * DEG;
  }

  /* ── POSITIONS ── */
  function fmtPos(l) {
    var s = Math.floor(l / 30), within = l - s * 30, dg = Math.floor(within), mn = Math.floor((within - dg) * 60);
    return { sign: s, deg: dg, min: mn };
  }
  function positions(ms, opts) {
    var withDec = !opts || opts.dec !== false;
    return BODIES.map(function (b) {
      var ll = lonLat(b.id, ms), sp = speed(b.id, ms);
      if (b.id === 'moon' && opts && opts.topo) ll = topoMoon(ms, ll, opts.topo.lat, opts.topo.lng);   /* position as seen from the observer */
      var p = fmtPos(ll.lon);
      return {
        id: b.id, name: b.name, glyph: b.glyph, body: b, lon: ll.lon, lat: ll.lat, speed: sp,
        retro: sp < 0 && b.id !== 'node', sign: p.sign, signName: SIGNS[p.sign].name, signGlyph: SIGNS[p.sign].glyph,
        deg: p.deg, min: p.min,
        dec: withDec ? declination(ll.lon, ll.lat) : 0,
        oob: withDec && b.id !== 'node' && Math.abs(declination(ll.lon, ll.lat)) > 23.4393
      };
    });
  }
  function posText(p) { return p.deg + '°' + (p.min < 10 ? '0' : '') + p.min + '′ ' + p.signGlyph; }


  /* ── ESSENTIAL DIGNITY (domicile / exaltation / detriment / fall; the seven classical bodies, plus the modern rulers for domicile and detriment) ── */
  var DOMICILE = { sun: [4], moon: [3], mercury: [2, 5], venus: [1, 6], mars: [0, 7], jupiter: [8, 11], saturn: [9, 10], uranus: [10], neptune: [11], pluto: [7] };
  var EXALT = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 };
  function dignity(id, sign) {
    var dom = DOMICILE[id], ex = EXALT[id];
    if (dom && dom.indexOf(sign) >= 0) return 'domicile';
    if (ex !== undefined && ex === sign) return 'exaltation';
    if (dom && dom.some(function (d) { return (d + 6) % 12 === sign; })) return 'detriment';
    if (ex !== undefined && (ex + 6) % 12 === sign) return 'fall';
    return dom || ex !== undefined ? 'peregrine' : null;
  }

  /* ── ASPECTS ── */
  function sepAbs(a, b) { return Math.abs(wrap180(a - b)); }
  function orbLimit(asp, A, B) {
    var o = asp.orb;
    if (A.id === 'moon' || B.id === 'moon') o = Math.min(o, 3);
    return o;
  }
  /* active aspects at ms. 'posNow' = positions(ms); applying is tested against +1h. */
  function aspects(ms, posNow, opts) {
    posNow = posNow || positions(ms, { dec: false });
    var maxOrb = opts && opts.maxOrb;
    var out = [], lonsH = {};
    PLANETS.forEach(function (b) { lonsH[b.id] = lon(b.id, ms + H); });
    for (var i = 0; i < PLANETS.length; i++) {
      for (var j = i + 1; j < PLANETS.length; j++) {
        var A = posNow[PLANETS[i].i], B = posNow[PLANETS[j].i];
        var s = sepAbs(A.lon, B.lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k], orb = Math.abs(s - asp.angle), lim = maxOrb || orbLimit(asp, A, B);
          if (maxOrb && (A.id === 'moon' || B.id === 'moon')) lim = Math.min(lim, maxOrb);
          if (orb <= lim) {
            var orbH = Math.abs(sepAbs(lonsH[A.id], lonsH[B.id]) - asp.angle);
            out.push({ a: A, b: B, aspect: asp, orb: orb, limit: lim, applying: orbH < orb, strength: Math.pow(1 - orb / lim, 2) * asp.w });
            break;
          }
        }
      }
    }
    return out.sort(function (x, y) { return x.orb - y.orb; });
  }

  /* ── EVENT SCANNER ── */
  function bisect(f, t0, t1, iters) {   /* f(t0), f(t1) opposite signs -> root time */
    var f0 = f(t0);
    for (var n = 0; n < (iters || 18); n++) {
      var tm = (t0 + t1) / 2, fm = f(tm);
      if ((fm < 0) === (f0 < 0)) { t0 = tm; f0 = fm; } else t1 = tm;
    }
    return (t0 + t1) / 2;
  }

  /* scan [from, to] for exact aspects, ingresses, stations, lunations. step = ms between samples */
  function scan(from, to, opts) {
    opts = opts || {};
    var step = opts.step || H, n = Math.ceil((to - from) / step), ts = [], L = [], i, k, ev = [];
    for (i = 0; i <= n; i++) {
      var t = from + i * step; ts.push(t);
      var row = {};
      BODIES.forEach(function (b) { row[b.id] = lon(b.id, t); });
      L.push(row);
    }
    function push(e) { if (e.t >= from && e.t <= to) ev.push(e); }

    /* aspects */
    for (var a = 0; a < PLANETS.length; a++) {
      for (var b = a + 1; b < PLANETS.length; b++) {
        var ia = PLANETS[a].id, ib = PLANETS[b].id;
        for (k = 0; k < ASPECTS.length; k++) {
          var asp = ASPECTS[k];
          var signs = (asp.angle === 0 || asp.angle === 180) ? [1] : [1, -1];
          signs.forEach(function (sg) {
            function h(tt, la, lb) { return wrap180(wrap180((la === undefined ? lon(ia, tt) : la) - (lb === undefined ? lon(ib, tt) : lb)) - sg * asp.angle); }
            var prev = h(ts[0], L[0][ia], L[0][ib]);
            for (var q = 1; q < ts.length; q++) {
              var cur = h(ts[q], L[q][ia], L[q][ib]);
              if (((prev < 0) !== (cur < 0)) && Math.abs(prev) < 30 && Math.abs(cur) < 30) {
                var te = bisect(function (tt) { return h(tt); }, ts[q - 1], ts[q], 16);
                push({ type: 'aspect', t: te, a: ia, b: ib, aspect: asp.id, glyph: asp.glyph,
                  applyingBefore: true });
              }
              prev = cur;
            }
          });
        }
      }
    }
    /* ingresses */
    PLANETS.forEach(function (bd) {
      var id = bd.id;
      for (var q = 1; q < ts.length; q++) {
        var s0 = Math.floor(L[q - 1][id] / 30), s1 = Math.floor(L[q][id] / 30);
        if (s0 !== s1) {
          var dirn = wrap180(L[q][id] - L[q - 1][id]) >= 0 ? 1 : -1;
          var bnd = dirn > 0 ? s1 * 30 : s0 * 30;
          var te = bisect(function (tt) { return wrap180(lon(id, tt) - bnd); }, ts[q - 1], ts[q], 16);
          var toSign = dirn > 0 ? s1 : s0 === s1 ? s1 : s0;
          /* retro ingress goes into the sign it is moving toward */
          toSign = s1;
          push({ type: 'ingress', t: te, a: id, sign: toSign, dir: dirn });
        }
      }
    });
    /* stations (planets only, not Sun/Moon/node) */
    PLANETS.forEach(function (bd) {
      var id = bd.id; if (id === 'sun' || id === 'moon') return;
      for (var q = 1; q < ts.length - 1; q++) {
        var d0 = wrap180(L[q][id] - L[q - 1][id]), d1 = wrap180(L[q + 1][id] - L[q][id]);
        if ((d0 < 0) !== (d1 < 0)) {
          var te = bisect(function (tt) { return speed(id, tt); }, ts[q - 1], ts[q + 1], 14);
          push({ type: 'station', t: te, a: id, dir: d1 >= 0 ? 1 : -1, label: d1 >= 0 ? 'stations direct' : 'stations retrograde' });
        }
      }
    });
    /* lunations / quarters */
    for (i = 1; i < ts.length; i++) {
      var e0 = norm(L[i - 1].moon - L[i - 1].sun), e1 = norm(L[i].moon - L[i].sun);
      var q0 = Math.floor(e0 / 90), q1 = Math.floor(e1 / 90);
      if (q0 !== q1) {
        var target = q1 * 90, quarter = q1;
        var te2 = bisect(function (tt) { return wrap180(lon('moon', tt) - lon('sun', tt) - target); }, ts[i - 1], ts[i], 16);
        var names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
        push({ type: 'lunation', t: te2, quarter: quarter, name: names[quarter], sign: Math.floor(lon('moon', te2) / 30) });
      }
    }
    ev.sort(function (x, y) { return x.t - y.t; });
    return ev;
  }

  /* ── MOON STATUS: phase, VOC window ── */
  var PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  function moonPhase(ms) {
    var el = norm(lon('moon', ms) - lon('sun', ms));
    return { elong: el, name: PHASES[Math.floor(((el + 22.5) % 360) / 45)], illum: (1 - Math.cos(el * RAD)) / 2 };
  }
  /* events: result of scan() covering at least from `ms` to the Moon's next ingress */
  function moonVoc(ms, events) {
    var ing = null, i;
    for (i = 0; i < events.length; i++) if (events[i].type === 'ingress' && events[i].a === 'moon' && events[i].t > ms) { ing = events[i]; break; }
    if (!ing) return null;
    var last = null, next = null;
    events.forEach(function (e) {
      if (e.type !== 'aspect' || (e.a !== 'moon' && e.b !== 'moon')) return;
      if (e.t <= ms) last = e;                                   /* most recent already perfected */
      else if (e.t < ing.t && !next) next = e;
    });
    var lastBefore = null;
    events.forEach(function (e) {
      if (e.type === 'aspect' && (e.a === 'moon' || e.b === 'moon') && e.t < ing.t) lastBefore = e;
    });
    return { ingress: ing, lastAspect: lastBefore, nextAspect: next,
             voc: lastBefore ? lastBefore.t <= ms : true, vocStart: lastBefore ? lastBefore.t : null };
  }

  /* ── PERIOD IN ORB around an exact aspect (enter / exact / leave), for the radar ── */
  function orbWindow(a, b, aspId, tExact, orb) {
    var asp = ASPECT_BY_ID[aspId];
    function g(tt) {   /* distance from exact minus the orb, in degrees */
      return Math.abs(wrap180(sepAbs(lon(a, tt), lon(b, tt)) - asp.angle)) - orb;
    }
    var span = (a === 'moon' || b === 'moon') ? 2 * DAY : 30 * DAY, out = { enter: null, leave: null };
    var s = span / 48, t;
    for (t = tExact; t > tExact - span; t -= s) if (g(t - s) > 0) { out.enter = bisect(g, t - s, t, 14); break; }
    for (t = tExact; t < tExact + span; t += s) if (g(t + s) > 0) { out.leave = bisect(g, t, t + s, 14); break; }
    return out;
  }

  /* ── ACTIVITY INDEX (public formula v1) ──
     sum over active aspects of (1 - orb/limit)^2 * type weight, mapped to 0..100.
     Not a good/bad score; a measure of how crowded and how exact the sky is. */
  function activity(ms) {
    var p = positions(ms, { dec: false }), list = aspects(ms, p), sum = 0, parts = [];
    list.forEach(function (x) { sum += x.strength; parts.push({ aspect: x, v: x.strength }); });
    parts.sort(function (x, y) { return y.v - x.v; });
    return { value: Math.round(100 * (1 - Math.exp(-sum / 6))), parts: parts, sum: sum };
  }

  /* ── PLANETARY DAY / HOUR ── */
  var CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
  var DAY_RULER = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  /* sunrise/sunset (ms) for the solar day containing `ms` at lat/lon (deg; east +) */
  function sunTimes(ms, lat, lng) {
    var n = Math.ceil(jd(ms) - 2451545.0 + 0.0008);
    var Jstar = n - lng / 360;
    var M = norm(357.5291 + 0.98560028 * Jstar), Mr = M * RAD;
    var C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
    var lam = norm(M + C + 180 + 102.9372) * RAD;
    var Jt = 2451545.0 + Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lam);
    var dec = Math.asin(Math.sin(lam) * Math.sin(23.4397 * RAD));
    var cosw = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
    var toMs = function (J) { return (J - 2440587.5) * DAY; };
    if (cosw > 1 || cosw < -1) return { noon: toMs(Jt), rise: toMs(Jt) - 6 * H, set: toMs(Jt) + 6 * H, polar: true };
    var w0 = Math.acos(cosw) * DEG / 360;
    return { noon: toMs(Jt), rise: toMs(Jt - w0), set: toMs(Jt + w0), polar: false };
  }
  /* local weekday (0=Sun) of an instant in an IANA zone */
  function weekdayIn(ms, tz) {
    try {
      var s = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(new Date(ms));
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s);
    } catch (e) { return new Date(ms).getDay(); }
  }
  function planetaryClock(ms, lat, lng, tz) {
    var cands = [-1, 0, 1].map(function (k) { return sunTimes(ms + k * DAY, lat, lng); });
    /* choose the latest sunrise <= ms; fall back to the earliest */
    var idx = 0, i;
    for (i = 0; i < cands.length; i++) if (cands[i].rise <= ms) idx = i;
    var today = cands[idx], next = cands[idx + 1] || sunTimes(ms + 2 * DAY, lat, lng);
    var dayLen = (today.set - today.rise) / 12, nightLen = (next.rise - today.set) / 12;
    var rulerIdx = weekdayIn(today.rise + H, tz);
    var dayRuler = DAY_RULER[rulerIdx], start = CHALDEAN.indexOf(dayRuler);
    var hours = [];
    for (i = 0; i < 24; i++) {
      var day = i < 12, t0 = day ? today.rise + i * dayLen : today.set + (i - 12) * nightLen;
      hours.push({ n: i, day: day, ruler: CHALDEAN[(start + i) % 7], start: t0, end: t0 + (day ? dayLen : nightLen) });
    }
    var cur = 0; hours.forEach(function (hr, ix) { if (ms >= hr.start && ms < hr.end) cur = ix; });
    return { dayRuler: dayRuler, rise: today.rise, set: today.set, nextRise: next.rise, hours: hours, current: hours[cur],
             next: [hours[cur + 1], hours[cur + 2], hours[cur + 3]].filter(Boolean), polar: today.polar };
  }

  /* ── SINCE-LAST-VISIT DIFF (also powers the two-moment sky diff) ── */
  function diff(msA, msB) {
    var pa = positions(msA, { dec: false }), pb = positions(msB, { dec: false });
    var moved = pa.map(function (p, i) {
      var q = pb[i];
      return { id: p.id, from: p, to: q, delta: wrap180(q.lon - p.lon), signChange: p.sign !== q.sign };
    });
    var A = aspects(msA, pa), B = aspects(msB, pb), key = function (x) { return x.a.id + '|' + x.b.id + '|' + x.aspect.id; };
    var mapA = {}, mapB = {}; A.forEach(function (x) { mapA[key(x)] = x; }); B.forEach(function (x) { mapB[key(x)] = x; });
    var added = B.filter(function (x) { return !mapA[key(x)]; });
    var removed = A.filter(function (x) { return !mapB[key(x)]; });
    var changed = B.filter(function (x) { return mapA[key(x)]; }).map(function (x) { return { now: x, then: mapA[key(x)] }; });
    return { moved: moved, added: added, removed: removed, changed: changed };
  }


  /* ── LONG-RANGE LOOKUPS (one body, one kind of event; used by the members' forecast) ── */
  function nextIngress(id, from, maxDays) {
    var step = 12 * H, t = from, prev = lon(id, from);
    for (var i = 0; i < (maxDays || 400) * 2; i++) {
      var t2 = t + step, l2 = lon(id, t2), s0 = Math.floor(prev / 30), s1 = Math.floor(l2 / 30);
      if (s0 !== s1) {
        var dirn = wrap180(l2 - prev) >= 0 ? 1 : -1, bnd = dirn > 0 ? s1 * 30 : s0 * 30;
        return { type: 'ingress', t: bisect(function (tt) { return wrap180(lon(id, tt) - bnd); }, t, t2, 16), a: id, sign: s1, dir: dirn };
      }
      prev = l2; t = t2;
    }
    return null;
  }
  function nextStation(id, from, maxDays) {
    var step = 12 * H, t = from, l0 = lon(id, t - step), l1 = lon(id, t), d0 = wrap180(l1 - l0);
    for (var i = 0; i < (maxDays || 400) * 2; i++) {
      var t2 = t + step, l2 = lon(id, t2), d1 = wrap180(l2 - l1);
      if ((d0 < 0) !== (d1 < 0)) {
        var te = bisect(function (tt) { return speed(id, tt); }, t - step, t2, 14);
        if (te > from) return { type: 'station', t: te, a: id, dir: d1 >= 0 ? 1 : -1 };
      }
      l1 = l2; d0 = d1; t = t2;
    }
    return null;
  }
  /* quarters: array of 0 New, 1 First Quarter, 2 Full, 3 Last Quarter (default: all) */
  function nextLunation(from, quarters, maxDays) {
    var step = 6 * H, t = from, prev = norm(lon('moon', t) - lon('sun', t));
    for (var i = 0; i < (maxDays || 40) * 4; i++) {
      var t2 = t + step, e2 = norm(lon('moon', t2) - lon('sun', t2)), q0 = Math.floor(prev / 90), q1 = Math.floor(e2 / 90);
      if (q0 !== q1 && (!quarters || quarters.indexOf(q1) >= 0)) {
        var target = q1 * 90, te = bisect(function (tt) { return wrap180(lon('moon', tt) - lon('sun', tt) - target); }, t, t2, 16);
        return { type: 'lunation', t: te, quarter: q1, name: ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'][q1], sign: Math.floor(lon('moon', te) / 30) };
      }
      prev = e2; t = t2;
    }
    return null;
  }
  /* void-of-course windows (last Ptolemaic aspect before each Moon ingress) inside [from, to], from a scan() list */
  function vocWindows(events, from, to) {
    var ings = events.filter(function (e) { return e.type === 'ingress' && e.a === 'moon'; }), out = [], prevT = -Infinity;
    ings.forEach(function (ing) {
      var last = null;
      events.forEach(function (e) { if (e.type === 'aspect' && (e.a === 'moon' || e.b === 'moon') && e.t > prevT && e.t < ing.t) last = e; });
      if (last && ing.t >= from && last.t <= to) out.push({ start: last.t, end: ing.t, sign: ing.sign, last: last });
      prevT = ing.t;
    });
    return out;
  }


  /* ── NATAL HELPERS (used for the members' personal aspects; all math runs in the browser) ── */
  /* Ascendant longitude for a UTC instant and place (lat deg N+, lng deg E+). Whole-sign houses use only its sign. */
  function ascendant(ms, lat, lng) {
    var d = jd(ms) - 2451545.0, T = d / 36525;
    var gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T;
    var ramc = norm(gmst + lng) * RAD, eps = (23.4392911 - 0.0130042 * T) * RAD, phi = lat * RAD;
    var y = Math.cos(ramc), x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
    return norm(Math.atan2(y, x) * DEG);
  }
  /* Midheaven longitude (the ecliptic point culminating) */
  function midheaven(ms, lng) {
    var d = jd(ms) - 2451545.0, T = d / 36525, gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T;
    var ramc = norm(gmst + lng) * RAD, eps = (23.4392911 - 0.0130042 * T) * RAD;
    return norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * DEG);
  }
  function natalChart(ms, lat, lng, noTime) {
    var pos = positions(ms, { dec: false }), asc = noTime ? null : ascendant(ms, lat, lng);
    return { ms: ms, pos: pos, asc: asc, mc: noTime ? null : midheaven(ms, lng), ascSign: asc === null ? -1 : Math.floor(asc / 30) };
  }
  /* exact hits of a transiting body to a fixed ecliptic point (natal position) at a given aspect angle, within [from, to] */
  function exactsToPoint(id, point, angle, from, to, step) {
    var out = [], sgs = (angle === 0 || angle === 180) ? [1] : [1, -1];
    step = step || 6 * H;
    sgs.forEach(function (sg) {
      function h(t) { return wrap180(lon(id, t) - point - sg * angle); }
      var t = from, prev = h(t);
      while (t < to) {
        var t2 = Math.min(to, t + step), cur = h(t2);
        if (((prev < 0) !== (cur < 0)) && Math.abs(prev) < 30 && Math.abs(cur) < 30) out.push(bisect(h, t, t2, 16));
        prev = cur; t = t2;
      }
    });
    return out.sort(function (a, b) { return a - b; });
  }

  /* ── text helpers ── */
  function aspectLabel(e) {
    var A = BY_ID[e.a], B = BY_ID[e.b], asp = ASPECT_BY_ID[e.aspect];
    return A.glyph + ' ' + asp.glyph + ' ' + B.glyph;
  }
  function eventLabel(e) {
    if (e.type === 'aspect') return aspectLabel(e);
    if (e.type === 'ingress') return BY_ID[e.a].glyph + ' ' + (e.dir > 0 ? 'ENTERS' : 'RE-ENTERS') + ' ' + SIGNS[e.sign].glyph + ' ' + SIGNS[e.sign].name.toUpperCase();
    if (e.type === 'station') return BY_ID[e.a].glyph + ' STATIONS ' + (e.dir > 0 ? 'DIRECT' : 'RETROGRADE');
    if (e.type === 'lunation') return '☽ ' + e.name.toUpperCase() + ' ' + SIGNS[e.sign].glyph;
    return e.type;
  }
  function eventPlain(e) {
    if (e.type === 'aspect') return BY_ID[e.a].name + ' ' + ASPECT_BY_ID[e.aspect].name + ' ' + BY_ID[e.b].name;
    if (e.type === 'ingress') return BY_ID[e.a].name + ' enters ' + SIGNS[e.sign].name;
    if (e.type === 'station') return BY_ID[e.a].name + ' ' + e.label;
    if (e.type === 'lunation') return e.name + ' in ' + SIGNS[e.sign].name;
    return e.type;
  }
  function countdown(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600; var m = Math.floor(s / 60); s -= m * 60;
    function z(x) { return (x < 10 ? '0' : '') + x; }
    return (d ? d + 'D ' : '') + z(h) + ':' + z(m) + ':' + z(s);
  }
  function fmtOrb(o) { var d = Math.floor(o), m = Math.round((o - d) * 60); if (m === 60) { d++; m = 0; } return d + '°' + (m < 10 ? '0' : '') + m + '′'; }

  return {
    H: H, DAY: DAY, BODIES: BODIES, PLANETS: PLANETS, BY_ID: BY_ID, SIGNS: SIGNS, ASPECTS: ASPECTS, ASPECT_BY_ID: ASPECT_BY_ID,
    CHALDEAN: CHALDEAN, DAY_RULER: DAY_RULER, norm: norm, wrap180: wrap180, sepAbs: sepAbs,
    lon: lon, lonLat: lonLat, speed: speed, positions: positions, posText: posText, aspects: aspects,
    scan: scan, moonPhase: moonPhase, moonVoc: moonVoc, orbWindow: orbWindow, activity: activity,
    sunTimes: sunTimes, planetaryClock: planetaryClock, diff: diff, topoMoon: topoMoon, dignity: dignity, ascendant: ascendant, midheaven: midheaven, natalChart: natalChart, exactsToPoint: exactsToPoint, nextIngress: nextIngress, nextStation: nextStation, nextLunation: nextLunation, vocWindows: vocWindows,
    aspectLabel: aspectLabel, eventLabel: eventLabel, eventPlain: eventPlain, countdown: countdown, fmtOrb: fmtOrb
  };
});
