import Phaser from 'phaser';
// Sprites desenhados à mão (PNG). O "?inline" embute a imagem no código,
// assim o jogo continua sendo um arquivo só na hora de publicar.
import aprendizUrl from './assets/aprendiz.png?inline';

/**
 * Personagens com arte em PNG (spritesheet de quadros 128x128, pés na linha 122,
 * virados para a direita). Os demais continuam com a arte gerada em art.ts.
 */
interface SheetDef {
  key: string;
  url: string;
  cell: number;
  frames: string[];
  /** Escala de exibição no jogo */
  scale: number;
  anims: { name: string; frames: string[]; rate: number; repeat: number }[];
}

const SHEETS: SheetDef[] = [
  {
    key: 'hero-aprendiz',
    url: aprendizUrl,
    cell: 128,
    frames: ['idle0', 'idle1', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'atk0', 'atk1', 'atk2', 'hurt', 'die0', 'die1', 'die2'],
    scale: 0.62,
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

export function preloadSprites(scene: Phaser.Scene) {
  for (const s of SHEETS) scene.load.image(s.key, s.url);
}

/** Cria os quadros com nome e as animações (chamar depois do carregamento) */
export function setupSprites(scene: Phaser.Scene) {
  for (const s of SHEETS) {
    const tex = scene.textures.get(s.key);
    s.frames.forEach((name, i) => {
      if (!tex.has(name)) tex.add(name, 0, i * s.cell, 0, s.cell, s.cell);
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
