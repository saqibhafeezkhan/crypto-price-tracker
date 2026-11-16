import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handleApi } from './api.js';

const projectRoot = path.resolve(import.meta.dirname, '..');
const distDir = path.join(projectRoot, 'dist');

try {
  // Optional: lets `npm start` reuse the same file the dev server reads.
  process.loadEnvFile(path.join(projectRoot, '.env.local'));
} catch {
  // No .env.local; rely on the ambient environment.
}

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

const sendFile = async (res, pathname) => {
  // Resolve under dist and reject anything that escapes it.
  const target = path.resolve(distDir, `.${pathname}`);
  if (!target.startsWith(`${distDir}${path.sep}`)) return false;

  try {
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': CONTENT_TYPES.get(path.extname(target)) || 'application/octet-stream',
      'cache-control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (await handleApi(req, res, url)) return;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return;
  }

  // Serve the asset, then fall back to the app shell for client-side routes.
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  if (await sendFile(res, requested)) return;
  if (requested !== '/index.html' && (await sendFile(res, '/index.html'))) return;

  res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('No build found. Run "npm run build" first.');
});

const port = Number(process.env.PORT) || 8787;

server.listen(port, () => {
  console.log(`Crypto tracker running on http://localhost:${port}`);
});
