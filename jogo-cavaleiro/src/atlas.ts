import Phaser from 'phaser';
import { MAPS } from './data/rpg';

/**
 * Atlas de texturas montado no carregamento.
 *
 * No celular o Phaser desenha com UMA textura por vez (Mobile Pipeline): cada troca de
 * textura entre dois objetos vira uma chamada de desenho nova. Como monstros, decoração,
 * gemas e efeitos são desenhados intercalados (ordenados pela altura na tela), isso dava
 * ~280 chamadas por quadro. Aqui todas essas texturas pequenas são copiadas para uma
 * ou poucas folhas grandes e os quadros existentes passam a apontar para elas: o resto do
 * jogo continua usando os mesmos nomes de textura e de quadro, sem mudar nada.
 */

const PAGE = 2048;
const PAD = 2;

/** Texturas que ficam de fora: heróis e chefes (um por vez), pisos (precisam repetir), fontes */
function skip(scene: Phaser.Scene, key: string) {
  if (key.startsWith('__') || key.startsWith('hero-') || key.startsWith('ui-')) return true;
  // textos e texturas sem nome (UUID) mudam em tempo real: nunca entram no atlas
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(key)) return true;
  if (['en-lich', 'en-aranha', 'en-bafome', 'en-minotauro', 'en-zumbi', 'dmgfont', 'dmg-font'].includes(key)) return true;
  if (MAPS.some((m) => m.ground === key)) return true;
  // texturas geradas sem nome (textos, janelas) e muito grandes também ficam de fora
  const t = scene.textures.get(key);
  const names = t.getFrameNames(false);
  return (names.length ? names : ['__BASE']).some((n) => {
    const f = t.get(n);
    return f.cutWidth > 600 || f.cutHeight > 600;
  });
}

/** Ordem de prioridade: o que é desenhado intercalado no mundo vem primeiro (mesma folha) */
function rank(key: string) {
  if (key.startsWith('en-')) return 0;
  if (key.startsWith('deco-') || key === 'fx-sombra' || key === 'escudo') return 1;
  if (key.startsWith('gem') || key.startsWith('item-') || key === 'comida' || key.startsWith('eq-') || key.startsWith('pet-')) return 2;
  return 3;
}

interface Piece { frame: Phaser.Textures.Frame; w: number; h: number; page: number; x: number; y: number }

export function packAtlas(scene: Phaser.Scene) {
  const tm = scene.textures;
  const keys = tm.getTextureKeys().filter((k) => !skip(scene, k)).sort((a, b) => rank(a) - rank(b));

  // quadros de cada textura (o __BASE de folhas com quadros vira o 1º quadro, não é copiado)
  const pieces: Piece[] = [];
  const baseOf = new Map<Phaser.Textures.Texture, Phaser.Textures.Frame>();
  for (const key of keys) {
    const t = tm.get(key);
    const names = t.getFrameNames(false);
    const list = names.length ? names.map((n) => t.get(n)) : [t.get('__BASE')];
    if (names.length) baseOf.set(t, t.get('__BASE'));
    for (const frame of list) pieces.push({ frame, w: frame.cutWidth, h: frame.cutHeight, page: 0, x: 0, y: 0 });
  }

  // empacotamento em prateleiras, mantendo a ordem de prioridade entre grupos
  let page = 0;
  let x = PAD;
  let y = PAD;
  let shelf = 0;
  const groups = [0, 1, 2, 3].map((r) => pieces.filter((p) => rank(p.frame.texture.key) === r).sort((a, b) => b.h - a.h || b.w - a.w));
  for (const group of groups) {
    for (const p of group) {
      if (x + p.w + PAD > PAGE) {
        x = PAD;
        y += shelf + PAD;
        shelf = 0;
      }
      if (y + p.h + PAD > PAGE) {
        page++;
        x = PAD;
        y = PAD;
        shelf = 0;
      }
      p.page = page;
      p.x = x;
      p.y = y;
      x += p.w + PAD;
      shelf = Math.max(shelf, p.h);
    }
  }

  // desenha as folhas a partir das imagens originais
  const pages: Phaser.Textures.CanvasTexture[] = [];
  for (let i = 0; i <= page; i++) {
    const used = pieces.filter((p) => p.page === i);
    const h = Phaser.Math.Pow2.GetNext(Math.max(...used.map((p) => p.y + p.h)) + PAD);
    const tex = tm.createCanvas(`__atlas${i}`, PAGE, Math.min(PAGE, h))!;
    const ctx = tex.getContext();
    for (const p of used) {
      const f = p.frame;
      ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, p.w, p.h, p.x, p.y, p.w, p.h);
    }
    tex.refresh();
    pages.push(tex);
  }

  // os quadros passam a apontar para o atlas (as animações e objetos guardam os mesmos quadros)
  const oldSources = new Set<Phaser.Textures.TextureSource>();
  for (const p of pieces) {
    const src = pages[p.page].source[0];
    oldSources.add(p.frame.source);
    p.frame.source = src;
    p.frame.sourceIndex = 0;
    p.frame.setSize(p.w, p.h, p.x, p.y);
  }
  for (const [t, base] of baseOf) {
    // __BASE de folhas: mostra o 1º quadro (nunca a folha inteira)
    const first = t.get(t.firstFrame);
    oldSources.add(base.source);
    base.source = first.source;
    base.sourceIndex = 0;
    base.setSize(first.cutWidth, first.cutHeight, first.cutX, first.cutY);
  }
  for (const key of keys) {
    const t = tm.get(key);
    const any = t.get(t.firstFrame);
    t.source = [any.source];
  }
  // libera as texturas antigas da memória de vídeo
  for (const s of oldSources) if (!pages.some((pg) => pg.source[0] === s)) s.destroy();

  return { texturas: keys.length, quadros: pieces.length, folhas: pages.length };
}
