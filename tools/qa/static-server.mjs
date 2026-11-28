// Serveur statique d'un dossier pour les harnais de mouvement : `const { base, close } = await staticServer(dossier)`.
// `BASE` (variable d'environnement) désigne un serveur déjà lancé et remplace le serveur local ; `base: null` l'ignore.
// `spa` : tout chemin sans extension sert `index.html` (application Angular à routes).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };

export async function staticServer(dir, { spa = false, base = process.env.BASE, headers = () => ({}) } = {}) { // `headers` : en-têtes ajoutés à chaque réponse (évalué à chaque requête)
  if (base) return { base, close() {} };
  const server = createServer(async (request, response) => {
    const requested = path.normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(dir, spa && !path.extname(requested) ? 'index.html' : requested);
    let body;
    try {
      body = await readFile(file); // lire avant d'écrire les en-têtes : un fichier absent doit donner 404, pas un 200 vide
    } catch {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...headers() }).end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
