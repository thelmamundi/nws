/* Packs figlet.js and every FIGlet font it ships for the Console Lab calendar.
   usage:  npm pack figlet && tar xzf figlet-*.tgz      (gives ./package)
           node scripts/make-figlet-fonts.js ./package
   writes  assets/js/vendor/figlet.js        figlet.js (MIT) as a plain script: window.figlet
           assets/js/vendor/figlet-fonts.js  window.FIGLET_FONTS_GZ = base64 of gzip(JSON {name: flf text})
   The lab page loads both on demand and unpacks the fonts in the browser (DecompressionStream), so it works from disk too. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const pkg = process.argv[2];
if (!pkg || !fs.existsSync(path.join(pkg, 'fonts'))) { console.error('usage: node scripts/make-figlet-fonts.js <unpacked figlet package dir>'); process.exit(1); }
const out = path.join(__dirname, '..', 'assets/js/vendor'); fs.mkdirSync(out, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));

const dist = path.join(pkg, 'dist'), chunk = fs.readdirSync(dist).find(f => /^figlet-.*\.js$/.test(f));
let lib = fs.readFileSync(path.join(dist, chunk), 'utf8');
const exp = /export\s*\{([^}]*)\};?\s*$/.exec(lib); if (!exp) throw new Error('figlet chunk: no export line');
const local = exp[1].split(',').map(s => s.trim().split(/\s+as\s+/)).find(p => p[1] === 't' || p[1] === 'default' || p[0] === 'figlet')[0];
lib = lib.slice(0, exp.index);
const lic = fs.readFileSync(path.join(pkg, 'LICENSE.txt'), 'utf8').trim().split('\n').map(l => ' * ' + l).join('\n');
fs.writeFileSync(path.join(out, 'figlet.js'), `/*! figlet.js ${meta.version} (${meta.homepage || 'https://github.com/patorjk/figlet.js'})\n${lic}\n */\n(function () {\n${lib}\nwindow.figlet = ${local};\n})();\n`);

const fonts = {};
for (const f of fs.readdirSync(path.join(pkg, 'fonts')).filter(f => f.endsWith('.flf')).sort((a, b) => a.localeCompare(b))) fonts[f.slice(0, -4)] = fs.readFileSync(path.join(pkg, 'fonts', f), 'utf8');
const gz = zlib.gzipSync(Buffer.from(JSON.stringify(fonts), 'utf8'), { level: 9 });
fs.writeFileSync(path.join(out, 'figlet-fonts.js'), `/* ${Object.keys(fonts).length} FIGlet fonts from figlet.js ${meta.version}; each font keeps its own author and terms in its header. Packed by scripts/make-figlet-fonts.js */\nwindow.FIGLET_FONTS_GZ="${gz.toString('base64')}";\n`);
console.log('figlet', meta.version, '->', path.relative(process.cwd(), path.join(out, 'figlet.js')));
console.log(Object.keys(fonts).length, 'fonts,', (gz.length / 1048576).toFixed(2), 'MB gzipped ->', path.relative(process.cwd(), path.join(out, 'figlet-fonts.js')));
