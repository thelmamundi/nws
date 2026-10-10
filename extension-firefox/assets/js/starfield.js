/* ═══════════════════════════════════════════════════════════
   STARFIELD: the Astrological Weathergirl background.
   A perspective flythrough of Bayer-dithered 4-pixel stars drawn
   at half resolution into #bg and scaled up with crisp pixels.
   Ported from the original theme (night mode). Respects
   prefers-reduced-motion (one still frame), and the sidebar
   ▦ button turns it off (remembered in localStorage).
   Hidden entirely in the white "paper" look.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var cv = document.getElementById('bg');
  if (!cv) return;
  var cx = cv.getContext('2d'), body = document.body;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SC = 2;
  var BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];   /* 4x4 Bayer matrix */
  var FOCAL = 60, MIN_Z = 1, MAX_Z = 90, SPEED = 26;
  var t = 0, lt = null, stars = [];
  var ARMS = [
    [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
    [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }],
    [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }],
    [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }]
  ];
  function off() { return body.getAttribute('data-bg') === 'off' || body.getAttribute('data-look') === 'paper'; }

  function spawn(W, H, anyDepth) {
    return { x: (Math.random() * 2 - 1) * W * 0.5, y: (Math.random() * 2 - 1) * H * 0.5,
      z: anyDepth ? MIN_Z + Math.random() * (MAX_Z - MIN_Z) : MAX_Z,
      variant: Math.floor(Math.random() * 4), phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.8, peak: 170 + Math.random() * 85 };
  }
  function seed(W, H) {
    var n = Math.max(70, Math.min(Math.round(W * H / 1400), 200));
    stars = []; for (var i = 0; i < n; i++) stars.push(spawn(W, H, true));
  }
  function resize() {
    cv.width = Math.ceil(window.innerWidth / SC); cv.height = Math.ceil(window.innerHeight / SC);
    cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
    seed(cv.width, cv.height);
  }
  function respawn(s, W, H) {
    var f = spawn(W, H, false);
    s.x = f.x; s.y = f.y; s.z = f.z; s.variant = f.variant; s.phase = f.phase; s.speed = f.speed; s.peak = f.peak;
  }
  function draw(W, H, d, dt) {
    for (var p = 0; p < d.length; p += 4) { d[p] = d[p + 1] = d[p + 2] = 0; d[p + 3] = 255; }
    var cx0 = W / 2, cy0 = H / 2;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (dt) s.z -= SPEED * dt;
      if (s.z <= MIN_Z) respawn(s, W, H);
      var k = FOCAL / s.z, sx = cx0 + s.x * k, sy = cy0 + s.y * k;
      if (sx < -4 || sx >= W + 4 || sy < -4 || sy >= H + 4) { respawn(s, W, H); continue; }
      var depth = 1 - (s.z - MIN_Z) / (MAX_Z - MIN_Z);
      var tw = (Math.sin(t * s.speed + s.phase) + 1) / 2;
      var br = Math.min(1, depth * (0.25 + 0.85 * tw));
      var px0 = Math.round(sx), py0 = Math.round(sy), a = ARMS[s.variant], v = Math.round(s.peak);
      var xs = [px0, px0 + a[0].dx, px0 + a[1].dx, px0 + a[2].dx], ys = [py0, py0 + a[0].dy, py0 + a[1].dy, py0 + a[2].dy];
      for (var c = 0; c < 4; c++) {
        var px = xs[c], py = ys[c];
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        if (br > BY[((py % 4) + 4) % 4][((px % 4) + 4) % 4] / 16) {
          var idx = (py * W + px) * 4; d[idx] = d[idx + 1] = d[idx + 2] = v; d[idx + 3] = 255;
        }
      }
    }
  }
  function frame(ts, animate) {
    if (!lt) lt = ts;
    var dt = animate ? Math.min((ts - lt) / 1000, 0.05) : 0; t += dt; lt = ts;
    if (!off() && cv.width > 0 && cv.height > 0) {
      var img = cx.createImageData(cv.width, cv.height);
      draw(cv.width, cv.height, img.data, dt); cx.putImageData(img, 0, 0);
    }
    if (animate) requestAnimationFrame(function (n) { frame(n, true); });
  }
  window.addEventListener('resize', function () { resize(); if (REDUCED) frame(performance.now(), false); });
  resize();
  if (REDUCED) frame(performance.now(), false); else requestAnimationFrame(function (n) { frame(n, true); });

  /* ── sidebar ▦ toggle ── */
  var KEY = 'awBgOff', btns = document.querySelectorAll('.bg-toggle');
  function apply(isOff) {
    body.setAttribute('data-bg', isOff ? 'off' : 'on');
    btns.forEach(function (b) { b.innerHTML = (isOff ? '▢' : '▦') + '<br>STARS ' + (isOff ? 'OFF' : 'ON'); b.setAttribute('aria-pressed', String(!isOff)); b.setAttribute('title', isOff ? 'Starfield off' : 'Starfield on'); });
    if (!isOff && REDUCED) frame(performance.now(), false);
  }
  var saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
  apply(saved);
  btns.forEach(function (b) { b.addEventListener('click', function () {
    var next = body.getAttribute('data-bg') !== 'off'; try { localStorage.setItem(KEY, next ? '1' : '0'); } catch (e) { /* ignore */ } apply(next);
  }); });
})();
