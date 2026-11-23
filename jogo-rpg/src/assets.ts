import Phaser from 'phaser';
// Arte reaproveitada da "Ascensão do Cavaleiro" (../jogo-cavaleiro/src/assets)
import aprendizUrl from './assets/aprendiz.webp';
import espadachimUrl from './assets/espadachim.webp';
import magoUrl from './assets/mago.webp';
import arqueiroUrl from './assets/arqueiro.webp';
import paladinoUrl from './assets/paladino.webp';
import professorUrl from './assets/professor.webp';
import bafomeUrl from './assets/bafome.webp';
import gosmaUrl from './assets/en-gosma.webp';
import loboUrl from './assets/en-lobo.webp';
import esqueletoUrl from './assets/en-esqueleto.webp';
import arvoreUrl from './assets/en-arvore.webp';
import dmgFontUrl from './assets/dmgfont.webp';
import missUrl from './assets/fx-miss.webp';
import critUrl from './assets/fx-crit.webp';
import impactoUrl from './assets/fx-impacto.webp';
import sombraUrl from './assets/proj-sombra.webp';
import vilaUrl from './assets/vila.webp';

/** Tiles recortados das imagens enviadas (scripts/recortar_tiles.py) */
const TILE_URLS = import.meta.glob('./assets/tiles/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

export const TITLE_IMAGE = vilaUrl;

interface SheetDef {
  key: string;
  url: string;
  cellW: number;
  cellH: number;
  feetY: number;
  frames: string[];
  scale: number;
  anims: { name: string; frames: string[]; rate: number; repeat: number }[];
}

const HERO_SCALE = 0.72;

/** Heróis: quadros 160x128 (res = 1), pés na linha 122, virados para a direita */
function hero(key: string, url: string, idle: number, walk: number, atk: number, die: number, hurt = true, res = 1): SheetDef {
  const seq = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);
  const frames = [...seq('idle', idle), ...seq('walk', walk), ...seq('atk', atk), ...(hurt ? ['hurt'] : []), ...seq('die', die)];
  return {
    key, url, cellW: 160 * res, cellH: 128 * res, feetY: Math.round(122 * res), frames, scale: HERO_SCALE / res,
    anims: [
      { name: 'idle', frames: seq('idle', idle), rate: 3, repeat: -1 },
      { name: 'walk', frames: seq('walk', walk), rate: walk >= 6 ? 10 : 7, repeat: -1 },
      { name: 'attack', frames: seq('atk', atk), rate: atk === 1 ? 6 : 10, repeat: 0 },
      { name: 'die', frames: seq('die', die), rate: 4, repeat: 0 },
    ],
  };
}

/** Monstros comuns: 8 quadros f0..f7, arte em 2x */
function monster(key: string, url: string, cellW: number, cellH: number, feetY: number, move: number[], rate: number): SheetDef {
  const f = (i: number) => `f${i}`;
  return {
    key, url, cellW, cellH, feetY, scale: 0.5,
    frames: [0, 1, 2, 3, 4, 5, 6, 7].map(f),
    anims: [
      { name: 'idle', frames: [f(0), f(1)], rate: 2, repeat: -1 },
      { name: 'move', frames: move.map(f), rate, repeat: -1 },
      { name: 'attack', frames: [f(5)], rate: 1, repeat: 0 },
      { name: 'die', frames: [f(6), f(7)], rate: 4, repeat: 0 },
    ],
  };
}

const SHEETS: SheetDef[] = [
  {
    key: 'hero-aprendiz', url: aprendizUrl, cellW: 128, cellH: 128, feetY: 122, scale: HERO_SCALE,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'atk0', 'atk1', 'atk2', 'hurt', 'die0', 'die1', 'die2'],
    anims: [
      { name: 'idle', frames: ['idle0', 'idle1', 'idle2', 'idle1'], rate: 4, repeat: -1 },
      { name: 'walk', frames: ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'], rate: 10, repeat: -1 },
      { name: 'attack', frames: ['atk0', 'atk1', 'atk2'], rate: 12, repeat: 0 },
      { name: 'die', frames: ['die0', 'die1', 'die2'], rate: 5, repeat: 0 },
    ],
  },
  hero('hero-espadachim', espadachimUrl, 2, 4, 2, 2),
  hero('hero-mago', magoUrl, 2, 4, 1, 2, false),
  hero('hero-arqueiro', arqueiroUrl, 2, 4, 1, 2, true, 1.5),
  hero('npc-paladino', paladinoUrl, 2, 4, 1, 2, true, 2),
  hero('npc-professor', professorUrl, 2, 3, 2, 2),
  monster('en-gosma', gosmaUrl, 136, 104, 98, [0, 2, 3, 4], 6),
  monster('en-esqueleto', esqueletoUrl, 150, 140, 134, [0, 3, 1, 3], 6),
  monster('en-lobo', loboUrl, 170, 112, 106, [2, 3, 4, 3], 9),
  monster('en-arvore', arvoreUrl, 160, 150, 144, [0, 2, 1, 3], 5),
  {
    key: 'en-bafome', url: bafomeUrl, cellW: 160, cellH: 128, feetY: 122, scale: HERO_SCALE,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'atk0', 'atk1', 'atk2', 'cast0', 'cast1', 'cast2', 'hurt0', 'hurt1', 'die0', 'die1', 'die2'],
    anims: [
      { name: 'idle', frames: ['idle0', 'idle1', 'idle2', 'idle1'], rate: 4, repeat: -1 },
      { name: 'move', frames: ['walk0', 'walk1', 'walk2'], rate: 6, repeat: -1 },
      { name: 'attack', frames: ['atk0', 'atk1', 'atk2'], rate: 9, repeat: 0 },
      { name: 'slash', frames: ['cast2'], rate: 2, repeat: 0 },
      { name: 'roar', frames: ['cast0', 'cast1'], rate: 5, repeat: 0 },
      { name: 'die', frames: ['die0', 'die1', 'die2'], rate: 3, repeat: 0 },
    ],
  },
];

const DMG_FONT = { cellW: 52, cellH: 69, chars: '0123456789+-' };

export function sheet(key: string) {
  return SHEETS.find((s) => s.key === key)!;
}

/** Ajusta o sprite para que (x, y) seja a posição dos pés */
export function applySheet(sprite: Phaser.GameObjects.Sprite, key: string, extraScale = 1) {
  const s = sheet(key);
  sprite.setTexture(key, s.frames[0]);
  sprite.setOrigin(0.5, s.feetY / s.cellH);
  sprite.setScale(s.scale * extraScale);
}

/** Altura do sprite na tela (para barras e nomes) */
export function spriteHeight(key: string, extraScale = 1) {
  const s = sheet(key);
  return s.feetY * s.scale * extraScale;
}

export function hasAnim(scene: Phaser.Scene, key: string, anim: string) {
  return scene.anims.exists(`${key}-${anim}`);
}

export function preloadAll(scene: Phaser.Scene) {
  for (const s of SHEETS) scene.load.image(s.key, s.url);
  scene.load.image('dmgfont', dmgFontUrl);
  scene.load.image('fx-miss', missUrl);
  scene.load.image('fx-crit', critUrl);
  scene.load.image('fx-impacto', impactoUrl);
  scene.load.image('proj-sombra', sombraUrl);
  for (const [path, url] of Object.entries(TILE_URLS)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    scene.load.image(`tile-${name}`, url);
  }
}

export function setupAll(scene: Phaser.Scene) {
  if (!scene.cache.bitmapFont.exists('dmg')) {
    scene.cache.bitmapFont.add('dmg', Phaser.GameObjects.RetroFont.Parse(scene, {
      image: 'dmgfont', width: DMG_FONT.cellW, height: DMG_FONT.cellH, chars: DMG_FONT.chars,
      charsPerRow: DMG_FONT.chars.length, 'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    }));
  }
  for (const s of SHEETS) {
    const tex = scene.textures.get(s.key);
    s.frames.forEach((name, i) => {
      if (!tex.has(name)) tex.add(name, 0, i * s.cellW, 0, s.cellW, s.cellH);
    });
    for (const a of s.anims) {
      const key = `${s.key}-${a.name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({ key, frames: a.frames.map((frame) => ({ key: s.key, frame })), frameRate: a.rate, repeat: a.repeat });
    }
  }
}
