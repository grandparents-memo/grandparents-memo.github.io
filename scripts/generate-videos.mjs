import { createServer } from 'http';
import { readFile, mkdir, rm } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const videosDir = join(root, 'assets', 'videos');
const FRAMES = 72;
const FPS = 24;

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
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = req.url === '/' ? '/scripts/video-render.html' : req.url.split('?')[0];
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

await mkdir(videosDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });

for (const item of mementos) {
  const framesDir = join(root, 'assets', 'videos', `.frames-${item.id}`);
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const url = `${base}/scripts/video-render.html?model=${encodeURIComponent(`/${item.model}`)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.__VIDEO_READY__ === true', { timeout: 120000 });

  const canvas = await page.$('#c');
  for (let i = 0; i < FRAMES; i++) {
    await page.evaluate(
      (index, total) => window.renderFrame(index, total),
      i,
      FRAMES
    );
    const framePath = join(framesDir, `${String(i).padStart(3, '0')}.png`);
    await canvas.screenshot({ path: framePath });
  }

  const outputPath = join(videosDir, `${item.id}.mp4`);
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${framesDir}/%03d.png" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 28 "${outputPath}"`,
    { stdio: 'inherit' }
  );

  await rm(framesDir, { recursive: true, force: true });
  console.log(`Generated ${item.id}.mp4`);
}

await browser.close();
server.close();
console.log('Done.');
