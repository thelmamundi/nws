/* Static page builder: src/pages/*.html + src/partials/*.html -> ./*.html (committed, so any static host works).
   usage: node build.js */
const fs = require('fs'), path = require('path');
const P = (n) => fs.readFileSync(path.join(__dirname, 'src/partials', n + '.html'), 'utf8');
const head = P('head'), side = P('sidebar'), foot = P('footer');
for (const f of fs.readdirSync(path.join(__dirname, 'src/pages'))) {
  const page = f.replace(/\.html$/, ''), src = fs.readFileSync(path.join(__dirname, 'src/pages', f), 'utf8');
  const m = /<!--meta title: (.*?) \| description: (.*?) -->/.exec(src);
  const body = src.replace(/<!--meta.*?-->\n?/, '');
  const sb = side.replace(/\{\{here:(\w+)\}\}/g, (_, k) => k === page ? ' here' : '').replace(/\{\{open:(\w+)\}\}/g, (_, k) => k === page ? ' open' : '');
  const html = (head + body.replace('{{sidebar}}', sb) + '\n' + foot)
    .replace(/\{\{title\}\}/g, m[1]).replace(/\{\{description\}\}/g, m[2]).replace(/\{\{pageUpper\}\}/g, page.toUpperCase());
  fs.writeFileSync(path.join(__dirname, page + '.html'), html);
  console.log('built', page + '.html');
}
