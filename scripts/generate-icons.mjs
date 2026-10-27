/**
 * generate-icons.mjs
 *
 * Renders the app icons (the "व" brand mark on Parchment ink) to PNGs in
 * public/icons/ using a headless Google Chrome, so the Devanagari glyph comes
 * out in the real display font. Re-run after changing the mark or palette.
 *
 * Usage: node scripts/generate-icons.mjs
 * Needs Google Chrome installed (macOS path below; set CHROME to override).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/icons');
const INK = '#2B2118', PAPER = '#F1E6CC', ACCENT = '#B83A26';

// glyph = fraction of the icon height; maskable icons keep it inside the 80% safe zone.
const ICONS = [
  { file: 'icon-192.png',          size: 192, glyph: 0.62 },
  { file: 'icon-512.png',          size: 512, glyph: 0.62 },
  { file: 'icon-maskable-512.png', size: 512, glyph: 0.48 },
  { file: 'apple-touch-icon.png',  size: 180, glyph: 0.62 },
  { file: 'favicon-32.png',        size: 32,  glyph: 0.78 },
];

const page = ({ size, glyph }) => `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&display=block" rel="stylesheet">
<style>html,body{margin:0;background:${INK}}
.i{width:${size}px;height:${size}px;background:${INK};display:grid;place-items:center;position:relative;overflow:hidden}
.g{font-family:'Tiro Devanagari Hindi',serif;color:${PAPER};font-size:${Math.round(size * glyph)}px;line-height:1;transform:translateY(${Math.round(size * 0.03)}px)}
.d{position:absolute;left:50%;bottom:${Math.round(size * 0.14)}px;width:${Math.round(size * 0.07)}px;height:${Math.round(size * 0.07)}px;border-radius:50%;background:${ACCENT};transform:translateX(-50%)}
</style><div class="i"><span class="g">व</span>${size >= 100 ? '<span class="d"></span>' : ''}</div>`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-icons-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9444', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9444/json')).json()).find(t => t.type === 'page'); } catch { await sleep(250); }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pending = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Page.enable');
  fs.mkdirSync(OUT, { recursive: true });
  for (const icon of ICONS) {
    await send('Emulation.setDeviceMetricsOverride', { width: icon.size, height: icon.size, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(page(icon)) });
    await sleep(1800);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: icon.size, height: icon.size, scale: 1 } });
    fs.writeFileSync(path.join(OUT, icon.file), Buffer.from(shot.result.data, 'base64'));
    console.log('wrote', icon.file);
  }
} finally {
  chrome.kill();
  await sleep(800); // let Chrome release its profile before deleting it
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* temp dir; the OS cleans it up */ }
}
process.exit(0);
