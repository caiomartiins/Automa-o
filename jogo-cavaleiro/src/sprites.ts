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
import zumbiUrl from './assets/zumbi.webp?inline';
import minotauroUrl from './assets/minotauro.webp?inline';
import dmgFontUrl from './assets/dmgfont.webp?inline';
import missUrl from './assets/fx-miss.webp?inline';
import critUrl from './assets/fx-crit.webp?inline';
import impactoUrl from './assets/fx-impacto.webp?inline';
import fxSombraUrl from './assets/fx-cacador.webp?inline';
import lichUrl from './assets/lich.webp?inline';
import aranhaUrl from './assets/aranha.webp?inline';
import enGosmaUrl from './assets/en-gosma.webp?inline';
import enEsqueletoUrl from './assets/en-esqueleto.webp?inline';
import enLoboUrl from './assets/en-lobo.webp?inline';
import enArvoreUrl from './assets/en-arvore.webp?inline';
import projSombraUrl from './assets/proj-sombra.webp?inline';
import projFogoUrl from './assets/proj-fogo.webp?inline';
import projGeloUrl from './assets/proj-gelo.webp?inline';
import fxMeteoroUrl from './assets/fx-meteoro.webp?inline';
import fxExplosaoUrl from './assets/fx-explosao.webp?inline';
import fxRaioUrl from './assets/fx-raio.webp?inline';
import fxGeloChaoUrl from './assets/fx-gelo-chao.webp?inline';
import fxEspinhosUrl from './assets/fx-espinhos.webp?inline';

/** Imagens soltas (efeitos e a fonte dos números de dano) */
const IMAGES: [string, string][] = [
  ['dmgfont', dmgFontUrl], ['fx-miss', missUrl], ['fx-crit', critUrl], ['fx-impacto', impactoUrl],
  ['fx-cacador', fxSombraUrl], ['proj-sombra', projSombraUrl],
  // efeitos das magias (Mago, Bruxo e Professor)
  ['proj-fogo', projFogoUrl], ['proj-gelo', projGeloUrl], ['fx-meteoro', fxMeteoroUrl], ['fx-explosao', fxExplosaoUrl],
  ['fx-raio', fxRaioUrl], ['fx-gelo-chao', fxGeloChaoUrl], ['fx-espinhos', fxEspinhosUrl],
];

/** Folhas de efeitos: quadros quadrados lado a lado, na ordem dos nomes */
const FX_SHEETS: { key: string; cell: number; names: string[] }[] = [
  {
    // efeitos do Caçador de Sombras
    key: 'fx-cacador', cell: 144,
    names: [
      'flecha0', 'flecha1', 'queda0', 'impacto0', 'impacto1', 'impacto2', 'impacto3', 'circulo0', 'circulo1',
      'explosao0', 'explosao1', 'explosao2', 'explosao3', 'explosao4', 'explosao5',
      'falcao0', 'falcao1', 'falcao2', 'falcao3', 'armadilha0', 'armadilha1',
      'garra0', 'garra1', 'garra2', 'veneno0', 'veneno1', 'veneno2', 'fumaca0', 'fumaca1', 'fumaca2', 'fumaca3',
    ],
  },
];
/** Fonte dos números: células de 52x69 com 0-9, + e - */
const DMG_FONT = { cellW: 52, cellH: 69, chars: '0123456789+-' };

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
  /** Linha dos pés dentro do quadro (padrão: FEET_Y) */
  feetY?: number;
  frames: string[];
  /** Escala de exibição no jogo */
  scale: number;
  anims: { name: string; frames: string[]; rate: number; repeat: number }[];
}


/**
 * Atalho para os personagens recortados das imagens enviadas (quadros 160x128).
 * `res` > 1 = folha em alta resolução (quadros maiores, mesma altura na tela).
 */
function hero(key: string, url: string, idle: number, walk: number, atk: number, die: number, hurt = true, res = 1): SheetDef {
  const seq = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);
  const frames = [...seq('idle', idle), ...seq('walk', walk), ...seq('atk', atk), ...(hurt ? ['hurt'] : []), ...seq('die', die)];
  const idleLoop = idle > 2 ? [...seq('idle', idle), ...seq('idle', idle).slice(1, -1).reverse()] : seq('idle', idle);
  return {
    key, url, cellW: 160 * res, cellH: 128 * res, feetY: Math.round(FEET_Y * res), frames, scale: SPRITE_SCALE / res,
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

/** Monstros comuns desenhados (8 quadros: f0..f7). Mostrados com escala 0,5 (a arte é 2x). */
function monster(key: string, url: string, cellW: number, cellH: number, feetY: number, move: number[], rate: number): SheetDef {
  const f = (i: number) => `f${i}`;
  return {
    key, url, cellW, cellH, feetY, scale: 0.5,
    frames: [0, 1, 2, 3, 4, 5, 6, 7].map(f),
    anims: [
      { name: 'move', frames: move.map(f), rate, repeat: -1 },
      { name: 'attack', frames: [f(5)], rate: 1, repeat: 0 },
      { name: 'die', frames: [f(6), f(7)], rate: 4, repeat: 0 },
    ],
  };
}

const SHEETS: SheetDef[] = [
  monster('en-gosma', enGosmaUrl, 136, 104, 98, [0, 2, 3, 4], 6),
  monster('en-esqueleto', enEsqueletoUrl, 150, 140, 134, [0, 3, 1, 3], 6),
  monster('en-lobo', enLoboUrl, 170, 112, 106, [2, 3, 4, 3], 9),
  monster('en-arvore', enArvoreUrl, 160, 150, 144, [0, 2, 1, 3], 5),
  {
    // Rainha Magmática: quadros 480x180 (corpo no centro), pés na linha 172 (efeitos de ataque à direita)
    key: 'en-aranha', url: aranhaUrl, cellW: 480, cellH: 180, feetY: 172, scale: SPRITE_SCALE,
    frames: ['idle', 'spit', 'rear', 'stomp', 'crouch', 'step', 'web', 'rage', 'webbig', 'acid', 'rage2'],
    anims: [
      { name: 'move', frames: ['idle', 'step', 'crouch', 'step'], rate: 7, repeat: -1 },
      { name: 'rage', frames: ['rage', 'step', 'rage2', 'step'], rate: 9, repeat: -1 },
      { name: 'spit', frames: ['crouch', 'spit'], rate: 5, repeat: 0 },
      { name: 'stomp', frames: ['rear', 'rear', 'stomp'], rate: 5, repeat: 0 },
      { name: 'web', frames: ['web', 'webbig'], rate: 3, repeat: 0 },
      { name: 'acid', frames: ['crouch', 'acid'], rate: 3, repeat: 0 },
      { name: 'crouch', frames: ['crouch'], rate: 1, repeat: 0 },
      { name: 'step', frames: ['step'], rate: 1, repeat: 0 },
      { name: 'die', frames: ['rage2', 'crouch'], rate: 3, repeat: 0 },
    ],
  },
  {
    // Lorde Ossário: folha em alta resolução (quadros 300x236, pés na linha 226)
    key: 'en-lich', url: lichUrl, cellW: 300, cellH: 236, feetY: 226, scale: SPRITE_SCALE,
    frames: ['idle0', 'idle1', 'move0', 'move1', 'move2', 'cast', 'hurt', 'die', 'orb0', 'orb1', 'orb2', 'sweep', 'raise', 'slam0', 'slam1', 'punch'],
    anims: [
      { name: 'move', frames: ['move0', 'move1', 'move2', 'move1'], rate: 6, repeat: -1 },
      { name: 'idle', frames: ['idle1', 'idle0'], rate: 4, repeat: 0 },
      { name: 'orb', frames: ['orb0', 'orb1', 'orb2'], rate: 4, repeat: 0 },
      { name: 'sweep', frames: ['punch', 'sweep'], rate: 6, repeat: 0 },
      { name: 'slam', frames: ['raise', 'slam0', 'slam1'], rate: 4, repeat: 0 },
      { name: 'raise', frames: ['raise'], rate: 1, repeat: 0 },
      { name: 'cast', frames: ['cast'], rate: 1, repeat: 0 },
      { name: 'die', frames: ['hurt', 'die'], rate: 2.5, repeat: 0 },
    ],
  },
  {
    key: 'en-minotauro', url: minotauroUrl, cellW: 160, cellH: 128, scale: SPRITE_SCALE,
    frames: [
      'idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'run0', 'run1', 'run2', 'run3',
      'swing0', 'swing1', 'smash0', 'smash1', 'smash2', 'block', 'hurt', 'die0', 'die1',
    ],
    anims: [
      { name: 'move', frames: ['walk0', 'walk1', 'walk2', 'walk3', 'walk4'], rate: 7, repeat: -1 },
      { name: 'run', frames: ['run0', 'run1', 'run2', 'run3'], rate: 12, repeat: -1 },
      { name: 'swing', frames: ['swing0', 'swing1'], rate: 5, repeat: 0 },
      { name: 'smash', frames: ['smash0', 'smash1', 'smash2'], rate: 6, repeat: 0 },
      { name: 'block', frames: ['block'], rate: 1, repeat: 0 },
      { name: 'die', frames: ['die0', 'die1'], rate: 2.5, repeat: 0 },
    ],
  },
  {
    key: 'en-zumbi', url: zumbiUrl, cellW: 160, cellH: 128, scale: SPRITE_SCALE,
    frames: [
      'idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7',
      'atk0', 'atk1', 'atk2', 'atk3', 'atk4', 'atk5', 'atk6', 'hurt0', 'hurt1', 'hurt2',
      'die0', 'die1', 'die2', 'die3', 'die4', 'die5', 'die6',
    ],
    anims: [
      { name: 'move', frames: ['walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7'], rate: 8, repeat: -1 },
      { name: 'attack', frames: ['atk0', 'atk1', 'atk2', 'atk3', 'atk4', 'atk5', 'atk6'], rate: 12, repeat: 0 },
      { name: 'die', frames: ['die0', 'die1', 'die2', 'die3', 'die4', 'die5', 'die6'], rate: 8, repeat: 0 },
    ],
  },
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
  hero('hero-cavaleiro', cavaleiroUrl, 2, 3, 1, 2, true, 2),
  hero('hero-paladino', paladinoUrl, 2, 4, 1, 2, true, 2),
  hero('hero-mago', magoUrl, 2, 4, 2, 2, false, 2),
  hero('hero-bruxo', bruxoUrl, 2, 4, 2, 2, true, 2),
  hero('hero-professor', professorUrl, 2, 4, 3, 2, false, 2),
  hero('hero-arqueiro', arqueiroUrl, 2, 4, 1, 2, true, 1.5),
  hero('hero-atirador', atiradorUrl, 3, 3, 1, 1),
  hero('hero-cacador-sombras', cacadorSombrasUrl, 2, 3, 1, 2, false, 1.5),
  hero('hero-aprendiz', aprendizUrl, 2, 4, 3, 2, true, 2),

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
  return s ? ((s.feetY ?? FEET_Y) - s.cellH / 2) * s.scale : 33;
}

export function preloadSprites(scene: Phaser.Scene) {
  for (const s of SHEETS) scene.load.image(s.key, s.url);
  for (const [key, url] of IMAGES) scene.load.image(key, url);
}

/** Cria os quadros com nome e as animações (chamar depois do carregamento) */
export function setupSprites(scene: Phaser.Scene) {
  if (!scene.cache.bitmapFont.exists('dmg2')) {
    scene.cache.bitmapFont.add('dmg2', Phaser.GameObjects.RetroFont.Parse(scene, {
      image: 'dmgfont', width: DMG_FONT.cellW, height: DMG_FONT.cellH, chars: DMG_FONT.chars,
      charsPerRow: DMG_FONT.chars.length, 'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
    }));
  }
  for (const f of FX_SHEETS) {
    const tex = scene.textures.get(f.key);
    f.names.forEach((name, i) => {
      if (!tex.has(name)) tex.add(name, 0, i * f.cell, 0, f.cell, f.cell);
    });
  }
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
