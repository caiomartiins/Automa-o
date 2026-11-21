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

/** true quando a tela está em pé (retrato) */
export const isPortrait = (scene: Phaser.Scene) => scene.scale.height > scene.scale.width;

/**
 * Tamanho lógico do jogo para uma tela de w x h pixels.
 * O lado menor fica sempre em 720 e o maior acompanha o formato da tela,
 * assim o jogo preenche a tela inteira (sem faixas pretas), deitado ou em pé.
 */
export function gameSizeFor(w: number, h: number) {
  if (!w || !h) return { width: 1280, height: 720 };
  const ratio = w / h;
  if (ratio >= 1) return { width: Math.round(Phaser.Math.Clamp(720 * ratio, 960, 1680)), height: 720 };
  return { width: 720, height: Math.round(Phaser.Math.Clamp(720 / ratio, 960, 1680)) };
}

/**
 * Chama `fn` quando o tamanho do jogo mudar (ex.: o celular foi girado).
 * Ignora mudanças só de tamanho na tela (como a barra do navegador aparecendo),
 * e remove o ouvinte quando a cena é encerrada.
 */
export function onResize(scene: Phaser.Scene, fn: () => void) {
  let last = `${scene.scale.width}x${scene.scale.height}`;
  const handler = (size: Phaser.Structs.Size) => {
    const now = `${size.width}x${size.height}`;
    if (now === last) return;
    last = now;
    fn();
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, handler));
}
