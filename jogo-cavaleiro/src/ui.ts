import Phaser from 'phaser';

export const FONT = 'Arial Black, Arial, sans-serif';

/** Texto com contorno, padrão do jogo */
export function text(scene: Phaser.Scene, x: number, y: number, value: string, size = 20, color = '#ffffff') {
  return scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: Math.max(3, Math.round(size / 6)),
  });
}

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** true em celulares/tablets (tela de toque) */
export const isTouch = (scene: Phaser.Scene) => scene.sys.game.device.input.touch && !scene.sys.game.device.os.desktop;
