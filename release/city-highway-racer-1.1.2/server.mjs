import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createServer } from 'node:http';

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav']
]);

function resolveFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const requestedPath = join(root, safePath || 'index.html');
  if (!requestedPath.startsWith(root)) return null;
  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) return requestedPath;
  const fallbackPath = join(requestedPath, 'index.html');
  return existsSync(fallbackPath) && statSync(fallbackPath).isFile() ? fallbackPath : null;
}

createServer((request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  const filePath = resolveFilePath(request.url);
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const contentType = contentTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`City Highway Racer is running at http://localhost:${port}`);
});
