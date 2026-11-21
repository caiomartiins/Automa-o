import Phaser from 'phaser';
// Sprites desenhados à mão (PNG). O "?inline" embute a imagem no código,
// assim o jogo continua sendo um arquivo só na hora de publicar.
import aprendizUrl from './assets/aprendiz.webp?inline';
import espadachimUrl from './assets/espadachim.webp?inline';
import cavaleiroUrl from './assets/cavaleiro.webp?inline';
import paladinoUrl from './assets/paladino.webp?inline';
import magoUrl from './assets/mago.webp?inline';
import bruxoUrl from './assets/bruxo.webp?inline';
import professorUrl from './assets/professor.webp?inline';
import arqueiroUrl from './assets/arqueiro.webp?inline';
import atiradorUrl from './assets/atirador.webp?inline';
import cacadorSombrasUrl from './assets/cacador-sombras.webp?inline';
import bafomeUrl from './assets/bafome.webp?inline';

/**
 * Personagens com arte em PNG (spritesheet de quadros 128x128, pés na linha 122,
 * virados para a direita). Os demais continuam com a arte gerada em art.ts.
 */
interface SheetDef {
  key: string;
  url: string;
  /** Largura e altura de cada quadro */
  cellW: number;
  cellH: number;
  frames: string[];
  /** Escala de exibição no jogo */
  scale: number;
  anims: { name: string; frames: string[]; rate: number; repeat: number }[];
}


/** Atalho para os personagens recortados das imagens enviadas (quadros 160x128) */
function hero(key: string, url: string, idle: number, walk: number, atk: number, die: number, hurt = true): SheetDef {
  const seq = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);
  const frames = [...seq('idle', idle), ...seq('walk', walk), ...seq('atk', atk), ...(hurt ? ['hurt'] : []), ...seq('die', die)];
  const idleLoop = idle > 2 ? [...seq('idle', idle), ...seq('idle', idle).slice(1, -1).reverse()] : seq('idle', idle);
  return {
    key, url, cellW: 160, cellH: 128, frames, scale: SPRITE_SCALE,
    anims: [
      { name: 'idle', frames: idleLoop, rate: 3.5, repeat: -1 },
      { name: 'walk', frames: seq('walk', walk), rate: walk >= 6 ? 10 : 7, repeat: -1 },
      { name: 'attack', frames: seq('atk', atk), rate: atk === 1 ? 5 : 11, repeat: 0 },
      { name: 'die', frames: seq('die', die), rate: 4, repeat: 0 },
    ],
  };
}

/** Escala dos sprites recortados (deixa do tamanho dos personagens desenhados) */
const SPRITE_SCALE = 0.72;
/** Linha dos pés dentro de cada quadro */
const FEET_Y = 122;

const SHEETS: SheetDef[] = [
  {
    key: 'en-bafome', url: bafomeUrl, cellW: 160, cellH: 128, scale: SPRITE_SCALE,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'atk0', 'atk1', 'atk2', 'cast0', 'cast1', 'cast2', 'hurt0', 'hurt1', 'die0', 'die1', 'die2'],
    anims: [
      { name: 'move', frames: ['walk0', 'walk1', 'walk2'], rate: 6, repeat: -1 },
      { name: 'slash', frames: ['cast2'], rate: 2, repeat: 0 },
      { name: 'roar', frames: ['cast0', 'cast1'], rate: 5, repeat: 0 },
      { name: 'die', frames: ['die1', 'die2'], rate: 2.5, repeat: 0 },
    ],
  },
  hero('hero-espadachim', espadachimUrl, 2, 4, 2, 2),
  hero('hero-cavaleiro', cavaleiroUrl, 3, 5, 3, 2),
  hero('hero-paladino', paladinoUrl, 3, 6, 3, 2),
  hero('hero-mago', magoUrl, 2, 4, 1, 2, false),
  hero('hero-bruxo', bruxoUrl, 2, 4, 3, 3),
  hero('hero-professor', professorUrl, 2, 3, 2, 2),
  hero('hero-arqueiro', arqueiroUrl, 2, 4, 1, 2),
  hero('hero-atirador', atiradorUrl, 3, 3, 1, 1),
  hero('hero-cacador-sombras', cacadorSombrasUrl, 2, 3, 1, 2, false),
  {
    key: 'hero-aprendiz',
    url: aprendizUrl,
    cellW: 128,
    cellH: 128,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'atk0', 'atk1', 'atk2', 'hurt', 'die0', 'die1', 'die2'],
    scale: SPRITE_SCALE,
    anims: [
      { name: 'idle', frames: ['idle0', 'idle1', 'idle2', 'idle1'], rate: 4, repeat: -1 },
      { name: 'walk', frames: ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5'], rate: 10, repeat: -1 },
      { name: 'attack', frames: ['atk0', 'atk1', 'atk2'], rate: 14, repeat: 0 },
      { name: 'die', frames: ['die0', 'die1', 'die2'], rate: 5, repeat: 0 },
    ],
  },
];

/** Escala de exibição de cada personagem (a arte gerada é 2x, por isso 0.5) */
export function heroScale(texture: string) {
  return SHEETS.find((s) => s.key === texture)?.scale ?? 0.5;
}

/** A arte gerada já tem sombra desenhada; os PNGs não */
export function needsShadow(texture: string) {
  return SHEETS.some((s) => s.key === texture);
}

/** Distância do centro do sprite até os pés, já na escala do jogo */
export function feetOffset(texture: string) {
  const s = SHEETS.find((d) => d.key === texture);
  return s ? (FEET_Y - s.cellH / 2) * s.scale : 33;
}

export function preloadSprites(scene: Phaser.Scene) {
  for (const s of SHEETS) scene.load.image(s.key, s.url);
}

/** Cria os quadros com nome e as animações (chamar depois do carregamento) */
export function setupSprites(scene: Phaser.Scene) {
  for (const s of SHEETS) {
    const tex = scene.textures.get(s.key);
    s.frames.forEach((name, i) => {
      if (!tex.has(name)) tex.add(name, 0, i * s.cellW, 0, s.cellW, s.cellH);
    });
    for (const a of s.anims) {
      const key = `${s.key}-${a.name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: a.frames.map((frame) => ({ key: s.key, frame })),
        frameRate: a.rate,
        repeat: a.repeat,
      });
    }
  }
}
