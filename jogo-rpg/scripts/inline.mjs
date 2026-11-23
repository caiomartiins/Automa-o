// Junta o JS e o CSS gerados pelo Vite dentro do HTML.
// Gera dist/index.html (página completa) e dist/artefato.html (só o conteúdo, para publicar como artefato).
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = join(dist, 'assets');
const files = readdirSync(assets);

const safe = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

for (const f of files) {
  const code = readFileSync(join(assets, f), 'utf8');
  if (f.endsWith('.js')) {
    const re = new RegExp(`<script[^>]*src="[^"]*${f.replace('.', '\\.')}"[^>]*></script>`);
    html = html.replace(re, () => `<script type="module">${safe(code)}</script>`);
  } else if (f.endsWith('.css')) {
    const re = new RegExp(`<link[^>]*href="[^"]*${f.replace('.', '\\.')}"[^>]*>`);
    html = html.replace(re, () => `<style>${code}</style>`);
  }
}
// o script vai para o fim do body (o DOM da interface já existe quando ele roda)
const scriptMatch = html.match(/<script type="module">[\s\S]*<\/script>/);
if (scriptMatch) {
  html = html.replace(scriptMatch[0], '');
  html = html.replace('</body>', () => `${scriptMatch[0]}\n</body>`);
}
writeFileSync(join(dist, 'index.html'), html);
rmSync(assets, { recursive: true, force: true });

// versão "artefato": sem doctype/html/head/body (a plataforma coloca o esqueleto)
const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(join(dist, 'artefato.html'), `${head.trim()}\n${body.trim()}\n`);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
console.log(`dist/index.html ${kb(html)} KB`);
