#!/usr/bin/env node
/* Renders the YouTube kit from youtube.html into youtube/ (needs Chromium + ffmpeg; run `node build.js --youtube` first).
   usage: node scripts/render-youtube.js [--theme legend] [--title "My Channel"] [--sub "live sky"] [--only intro,thumb,shoulder]
   outputs (in youtube/<theme>/): credits.mp4, chat.mp4, chat.png, shoulder-left.png, shoulder-right.png, intro.mp4, end.mp4, card.mp4, lowerthird.webm (transparent), lowerthird.png, bug.png, thumbnail.png
   env: CHROME=/path/to/chrome (default: Playwright's Chromium), needs the `playwright-core` package (npm i playwright-core) */
const fs = require('fs'), path = require('path'), cp = require('child_process');
let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require('playwright'); } catch (e2) { console.error('npm i playwright-core first'); process.exit(1); } }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const theme = arg('theme', 'legend'), title = arg('title', 'The sky, live'), sub = arg('sub', ''), only = (arg('only', '') || '').split(',').filter(Boolean);
const OUT = path.join(__dirname, '..', 'youtube', theme), URL = 'file://' + path.join(__dirname, '..', 'youtube.html'), FPS = 12;
fs.mkdirSync(OUT, { recursive: true });
const DASH = 'file://' + path.join(__dirname, '..', 'dashboard.html');
const want = n => !only.length || only.includes(n);
(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  async function open(kind, w, h, extra) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript(t => localStorage.setItem('nws-theme', t), theme);
    await p.goto(URL + '?kind=' + kind + '&theme=' + theme + '&title=' + encodeURIComponent(title) + '&sub=' + encodeURIComponent(sub) + (extra || '')); await p.waitForFunction('window.ytReady === true'); await p.waitForTimeout(400); return p;
  }
  async function video(kind, name, ext) {
    const p = await open(kind, 1920, 1080), dur = await p.evaluate('window.ytDuration'), dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'yt-')), n = Math.round(dur * FPS), alpha = ext === 'webm';
    for (let i = 0; i < n; i++) { await p.evaluate(t => window.setT(t), i / FPS); await p.waitForTimeout(30); await p.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.png'), omitBackground: alpha }); }
    const enc = alpha ? ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30'] : ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20'];
    cp.execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'), '-r', '30', ...enc, path.join(OUT, name + '.' + ext)]);
    fs.rmSync(dir, { recursive: true, force: true }); await p.close(); console.log(name + '.' + ext);
  }
  async function still(kind, name, w, h, t, alpha) {
    const p = await open(kind, w, h); await p.evaluate(x => window.setT(x), t); await p.waitForTimeout(100); await p.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: !!alpha }); await p.close(); console.log(name + '.png');
  }
  if (want('intro')) await video('intro', 'intro', 'mp4');
  if (want('end')) await video('end', 'end', 'mp4');
  if (want('card')) await video('card', 'card', 'mp4');
  if (want('credits')) await video('credits', 'credits', 'mp4');
  if (want('chat')) { await video('chat', 'chat', 'mp4'); await still('chat', 'chat', 1920, 1080, 10); }
  if (want('lower')) { await video('lower', 'lowerthird', 'webm'); await still('lower', 'lowerthird', 1920, 1080, 2.5, true); }
  if (want('bug')) await still('bug', 'bug', 1920, 1080, 0, true);
  if (want('shoulder')) for (const side of ['left', 'right']) {   /* over-the-shoulder backdrop: the LED gadget wall with room for you (needs dashboard.html: node build.js --dashboard) */
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); await p.addInitScript(t => localStorage.setItem('nws-theme', t), theme);
    await p.goto(DASH + '?bare&shoulder=' + side + '&only=chartnow,conditions,nextexact,moon,flight,speed'); await p.waitForTimeout(3500); await p.screenshot({ path: path.join(OUT, 'shoulder-' + side + '.png') }); await p.close(); console.log('shoulder-' + side + '.png');
  }
  if (want('thumb')) await still('thumb', 'thumbnail', 1280, 720, 0);
  await browser.close();
})();
