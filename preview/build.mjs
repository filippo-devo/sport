// Builds design/preview/training.html: one self-contained file (JS + Barlow
// fonts inlined) that runs the whole app with no server.
// Usage: npm run preview:build
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pkgPath = path.join(root, 'package.json');
const outDir = path.join(root, 'node_modules/.cache/preview-dist');
const outFile = path.join(root, 'design/preview/training.html');
const FONTS = ['Barlow_400Regular', 'Barlow_500Medium', 'Barlow_600SemiBold', 'Barlow_700Bold'];

// `expo export` bundles package.json#main, so point it at the preview entry, and turn off
// async routes so the whole app lands in one bundle. Both files are restored afterwards.
const appPath = path.join(root, 'app.json');
const pkgSource = fs.readFileSync(pkgPath, 'utf8');
const appSource = fs.readFileSync(appPath, 'utf8');
try {
  fs.writeFileSync(pkgPath, JSON.stringify({ ...JSON.parse(pkgSource), main: './preview/entry.tsx' }, null, 2) + '\n');
  const app = JSON.parse(appSource);
  app.expo.plugins = app.expo.plugins.map((p) => (p === 'expo-router' ? ['expo-router', { asyncRoutes: false }] : p));
  fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
  fs.rmSync(outDir, { recursive: true, force: true });
  execSync(`npx expo export --platform web --output-dir "${outDir}"`, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, EXPO_OFFLINE: '1', CI: '1' },
  });
} finally {
  fs.writeFileSync(pkgPath, pkgSource);
  fs.writeFileSync(appPath, appSource);
}

let html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(\/_expo\/[^"]+)" defer><\/script>/g)].map((m) => m[1]);
const js = scripts
  .map((s) => fs.readFileSync(path.join(outDir, s), 'utf8'))
  .join('\n;')
  .replaceAll('</script', '<\\/script');

const fontDir = path.join(outDir, 'assets/node_modules/@expo-google-fonts/barlow');
const fonts = {};
for (const dir of fs.readdirSync(fontDir)) {
  for (const file of fs.readdirSync(path.join(fontDir, dir))) {
    const name = file.split('.')[0];
    if (FONTS.includes(name)) {
      fonts[name] = 'data:font/ttf;base64,' + fs.readFileSync(path.join(fontDir, dir, file)).toString('base64');
    }
  }
}

// expo-font injects `@font-face{src:url("/assets/.../Barlow_*.ttf")}` rules (insertRule, or a text
// node as fallback); rewrite those URLs to the embedded copies so no file needs to be fetched.
const fontPatch = `<script>(function(){var F=${JSON.stringify(fonts)};
function fix(css){return typeof css!=='string'?css:css.replace(/url\\("([^"]+)"\\)/g,function(m,u){for(var k in F){if(u.indexOf(k)>-1)return 'url("'+F[k]+'")';}return m;});}
var ins=CSSStyleSheet.prototype.insertRule;CSSStyleSheet.prototype.insertRule=function(r,i){return ins.call(this,fix(r),i);};
var txt=Document.prototype.createTextNode;Document.prototype.createTextNode=function(t){return txt.call(this,fix(t));};})();</script>`;

html = html
  .replace(/<script src="\/_expo\/[^"]+" defer><\/script>/g, '')
  .replace('<link rel="icon" href="/favicon.ico"/>', '<style>html,body{background:#0A0F16;margin:0}</style>')
  .replace('</body>', () => `${fontPatch}<script>${js}</script>\n</body>`);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
console.log(`${path.relative(root, outFile)} — ${Math.round(fs.statSync(outFile).size / 1024)} KB, fonts: ${Object.keys(fonts).join(', ')}`);
