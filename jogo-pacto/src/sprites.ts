import Phaser from 'phaser';
// Sprites desenhados à mão, reaproveitados do jogo do cavaleiro.
// O "?inline" embute a imagem no código (o jogo vira um arquivo só ao publicar).
import espadachimUrl from './assets/espadachim.webp?inline';
import cavaleiroUrl from './assets/cavaleiro.webp?inline';
import paladinoUrl from './assets/paladino.webp?inline';
import magoUrl from './assets/mago.webp?inline';
import bruxoUrl from './assets/bruxo.webp?inline';
import professorUrl from './assets/professor.webp?inline';
import arqueiroUrl from './assets/arqueiro.webp?inline';
import atiradorUrl from './assets/atirador.webp?inline';
import cacadorUrl from './assets/cacador-sombras.webp?inline';
import bafomeUrl from './assets/bafome.webp?inline';
import zumbiUrl from './assets/zumbi.webp?inline';
import minotauroUrl from './assets/minotauro.webp?inline';
import lichUrl from './assets/lich.webp?inline';
import aranhaUrl from './assets/aranha.webp?inline';
import gosmaUrl from './assets/en-gosma.webp?inline';
import esqueletoUrl from './assets/en-esqueleto.webp?inline';
import loboUrl from './assets/en-lobo.webp?inline';
import arvoreUrl from './assets/en-arvore.webp?inline';
import dmgFontUrl from './assets/dmgfont.webp?inline';
import missUrl from './assets/fx-miss.webp?inline';
import critUrl from './assets/fx-crit.webp?inline';
import impactoUrl from './assets/fx-impacto.webp?inline';

/** Como cada personagem é recortado e animado */
export interface ArtDef {
  key: string;
  url: string;
  cellW: number;
  cellH: number;
  frames: string[];
  idle: string[];
  idleRate: number;
  atk: string[];
  /** Pose de magia (se não tiver, usa o ataque) */
  cast?: string[];
  hurt?: string;
  die: string[];
  /** Altura na tela em pixels (antes do bônus de chefe) */
  height: number;
  /** A arte original olha para a esquerda */
  facesLeft?: boolean;
}

const seq = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);

/** Heróis recortados (quadros 160x128 × resolução) */
function hero(key: string, url: string, idle: number, walk: number, atk: number, die: number, hurt = true, res = 1, height = 118): ArtDef {
  return {
    key, url, cellW: 160 * res, cellH: 128 * res,
    frames: [...seq('idle', idle), ...seq('walk', walk), ...seq('atk', atk), ...(hurt ? ['hurt'] : []), ...seq('die', die)],
    idle: seq('idle', idle), idleRate: 3, atk: seq('atk', atk), hurt: hurt ? 'hurt' : undefined, die: seq('die', die), height,
  };
}

/** Monstros de 8 quadros (f0..f7) */
function monster(key: string, url: string, cellW: number, cellH: number, idle: number[], atk: number[], hurt: number, die: number[], height: number): ArtDef {
  const f = (i: number) => `f${i}`;
  return {
    key, url, cellW, cellH, frames: seq('f', 8), idle: idle.map(f), idleRate: 3, atk: atk.map(f), hurt: f(hurt), die: die.map(f), height,
  };
}

export const ARTS: Record<string, ArtDef> = Object.fromEntries([
  monster('gosma', gosmaUrl, 136, 104, [0, 1, 2, 1], [4, 5], 6, [6, 7], 66),
  monster('lobo', loboUrl, 170, 112, [0, 1], [2, 5], 6, [6, 7], 84),
  monster('esqueleto', esqueletoUrl, 150, 140, [0, 1], [4, 5], 6, [7], 112),
  monster('arvore', arvoreUrl, 160, 150, [0, 1], [4, 5], 6, [7], 132),
  hero('espadachim', espadachimUrl, 2, 4, 2, 2),
  hero('cavaleiro', cavaleiroUrl, 2, 3, 1, 2, true, 2, 124),
  hero('paladino', paladinoUrl, 2, 4, 1, 2, true, 2, 128),
  hero('mago', magoUrl, 2, 4, 1, 2, false),
  hero('bruxo', bruxoUrl, 2, 4, 3, 3),
  hero('professor', professorUrl, 2, 3, 2, 2),
  hero('arqueiro', arqueiroUrl, 2, 4, 1, 2, true, 1.5),
  hero('atirador', atiradorUrl, 3, 3, 1, 1),
  hero('cacador', cacadorUrl, 2, 3, 1, 2, false, 1.5),
  {
    key: 'minotauro', url: minotauroUrl, cellW: 160, cellH: 128,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'run0', 'run1', 'run2', 'run3',
      'swing0', 'swing1', 'smash0', 'smash1', 'smash2', 'block', 'hurt', 'die0', 'die1'],
    idle: ['idle0', 'idle1', 'idle2', 'idle1'], idleRate: 4, atk: ['swing0', 'swing1'], cast: ['smash0', 'smash1', 'smash2'],
    hurt: 'hurt', die: ['die0', 'die1'], height: 136,
  },
  {
    key: 'zumbi', url: zumbiUrl, cellW: 160, cellH: 128,
    frames: [...seq('idle', 4), ...seq('walk', 8), ...seq('atk', 7), ...seq('hurt', 3), ...seq('die', 7)],
    idle: seq('idle', 4), idleRate: 4, atk: ['atk2', 'atk3', 'atk4', 'atk5'], hurt: 'hurt0', die: seq('die', 7), height: 122,
  },
  {
    key: 'bafome', url: bafomeUrl, cellW: 160, cellH: 128,
    frames: [...seq('idle', 3), ...seq('walk', 3), ...seq('atk', 3), ...seq('cast', 3), ...seq('hurt', 2), ...seq('die', 3)],
    idle: ['idle0', 'idle1', 'idle2', 'idle1'], idleRate: 4, atk: seq('atk', 3), cast: seq('cast', 3), hurt: 'hurt0', die: ['die1', 'die2'], height: 146,
  },
  {
    key: 'lich', url: lichUrl, cellW: 300, cellH: 236,
    frames: ['idle0', 'idle1', 'move0', 'move1', 'move2', 'cast', 'hurt', 'die', 'orb0', 'orb1', 'orb2', 'sweep', 'raise', 'slam0', 'slam1', 'punch'],
    idle: ['idle0', 'idle1'], idleRate: 2.5, atk: ['punch', 'sweep'], cast: ['orb0', 'orb1', 'orb2'], hurt: 'hurt', die: ['hurt', 'die'], height: 150,
  },
  {
    key: 'aranha', url: aranhaUrl, cellW: 480, cellH: 180,
    frames: ['idle', 'spit', 'rear', 'stomp', 'crouch', 'step', 'web', 'rage', 'webbig', 'acid', 'rage2'],
    idle: ['idle', 'step', 'idle', 'crouch'], idleRate: 3, atk: ['crouch', 'spit'], cast: ['crouch', 'acid'], hurt: 'rage2', die: ['rage2', 'crouch'], height: 78,
  },
].map((a) => [a.key, a]));

/** Fonte dos números: células de 52x69 com 0-9, + e - */
const DMG_FONT = { cellW: 52, cellH: 69, chars: '0123456789+-' };

export function preloadSprites(scene: Phaser.Scene) {
  for (const a of Object.values(ARTS)) scene.load.image(`art-${a.key}`, a.url);
  scene.load.image('dmgfont', dmgFontUrl);
  scene.load.image('fx-miss', missUrl);
  scene.load.image('fx-crit', critUrl);
  scene.load.image('fx-impacto', impactoUrl);
}

/** Caixa visível (sem transparência) do primeiro quadro de cada personagem */
export interface ArtBox { x: number; y: number; w: number; h: number }
export const ART_BOX: Record<string, ArtBox> = {};

/** Cria quadros, animações, retratos e mede cada personagem */
export function setupSprites(scene: Phaser.Scene) {
  if (!scene.cache.bitmapFont.exists('dmg')) {
    scene.cache.bitmapFont.add('dmg', Phaser.GameObjects.RetroFont.Parse(scene, {
      image: 'dmgfont', width: DMG_FONT.cellW, height: DMG_FONT.cellH, chars: DMG_FONT.chars,
      charsPerRow: DMG_FONT.chars.length, 'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    }));
  }
  for (const a of Object.values(ARTS)) {
    const key = `art-${a.key}`;
    const tex = scene.textures.get(key);
    a.frames.forEach((name, i) => {
      if (!tex.has(name)) tex.add(name, 0, i * a.cellW, 0, a.cellW, a.cellH);
    });
    const anim = (name: string, frames: string[], rate: number, repeat: number) => {
      const k = `${a.key}-${name}`;
      if (!scene.anims.exists(k)) scene.anims.create({ key: k, frames: frames.map((frame) => ({ key, frame })), frameRate: rate, repeat });
    };
    anim('idle', a.idle, a.idleRate, -1);
    anim('atk', a.atk, a.atk.length > 2 ? 10 : 6, 0);
    anim('cast', a.cast ?? a.atk, (a.cast ?? a.atk).length > 2 ? 8 : 5, 0);
    anim('die', a.die, 5, 0);
    measure(scene, a);
  }
}

/** Lê os pixels do primeiro quadro para achar o corpo e gerar o retrato */
function measure(scene: Phaser.Scene, a: ArtDef) {
  const img = scene.textures.get(`art-${a.key}`).getSourceImage() as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = a.cellW;
  c.height = a.cellH;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, a.cellW, a.cellH, 0, 0, a.cellW, a.cellH);
  const data = ctx.getImageData(0, 0, a.cellW, a.cellH).data;
  let x0 = a.cellW, y0 = a.cellH, x1 = 0, y1 = 0;
  for (let y = 0; y < a.cellH; y++) {
    for (let x = 0; x < a.cellW; x++) {
      if (data[(y * a.cellW + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const box = { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) };
  ART_BOX[a.key] = box;

  // retrato quadrado: parte de cima do corpo
  const portKey = `port-${a.key}`;
  if (scene.textures.exists(portKey)) return;
  let side: number, sx: number, sy: number;
  if (box.h > box.w) {
    side = Math.min(box.h, Math.max(box.w * 1.05, box.h * 0.62));
    sx = box.x + box.w / 2 - side / 2;
    sy = box.y - side * 0.04;
  } else {
    side = Math.min(box.w, Math.max(box.h * 1.1, box.w * 0.7));
    sx = a.facesLeft ? box.x : box.x + box.w - side;
    sy = box.y + box.h / 2 - side / 2;
  }
  const size = 128;
  const pc = document.createElement('canvas');
  pc.width = size;
  pc.height = size;
  const pctx = pc.getContext('2d')!;
  pctx.imageSmoothingQuality = 'high';
  pctx.drawImage(c, sx, sy, side, side, 0, 0, size, size);
  scene.textures.addCanvas(portKey, pc);
}

/** Escala para o personagem aparecer com a altura desejada */
export function artScale(art: string, boss = false) {
  const a = ARTS[art];
  const box = ART_BOX[art];
  return (a.height * (boss ? 1.45 : 1)) / (box?.h ?? a.cellH);
}
