import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const postersDir = join(root, 'assets', 'posters');

const mementos = [
  { id: 'black-handbag', model: 'assets/original/black-handbag.glb' },
  { id: 'bronze-bird', model: 'assets/original/bronze-bird.glb' },
  { id: 'su-tu', model: 'assets/original/su-tu.glb' },
  { id: 'flower-metal-sculpture', model: 'assets/original/flower-metal-sculpture.glb' },
  { id: 'vintage-electric-fan', model: 'assets/original/vintage-electric-fan.glb' },
  { id: 'may-bay', model: 'assets/original/may-bay.glb' },
];

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = req.url === '/' ? '/scripts/poster-render.html' : req.url.split('?')[0];
      const filePath = join(root, decodeURIComponent(url));
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const server = await startServer();
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

await import('fs/promises').then((fs) => fs.mkdir(postersDir, { recursive: true }));

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });

for (const item of mementos) {
  const url = `${base}/scripts/poster-render.html?model=${encodeURIComponent(`/${item.model}`)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.__POSTER_READY__ === true', { timeout: 120000 });
  const canvas = await page.$('#c');
  await canvas.screenshot({ path: join(postersDir, `${item.id}.webp`), type: 'webp', quality: 85 });
  console.log(`Generated ${item.id}.webp`);
}

await browser.close();
server.close();
console.log('Done.');
