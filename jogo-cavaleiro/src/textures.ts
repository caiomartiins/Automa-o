import Phaser from 'phaser';

/** Texturas simples dos efeitos visuais. A arte dos personagens fica em art.ts. */

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Texturas dos efeitos (desenhadas uma vez e reaproveitadas) e fonte dos números de dano */
export function createFxTextures(scene: Phaser.Scene) {
  // arco do golpe: raio 100, abertura de 115°, apontando para a direita
  make(scene, 'fx-slash', 200, 200, (g) => {
    const half = Phaser.Math.DegToRad(115) / 2;
    g.fillStyle(0xffffff, 0.45);
    g.slice(100, 100, 98, -half, half, false);
    g.fillPath();
    g.lineStyle(3, 0xffffff, 0.95);
    g.beginPath();
    g.arc(100, 100, 98, -half, half, false);
    g.strokePath();
  });

  // estocada da lança: 256 x 40, começa na esquerda
  make(scene, 'fx-lance', 256, 40, (g) => {
    g.fillStyle(0xffd04a, 0.35);
    g.fillRect(0, 3, 256, 34);
    g.fillStyle(0xfff3c4, 0.95);
    g.fillRect(0, 17, 236, 6);
    g.fillTriangle(232, 10, 232, 30, 256, 20);
  });

  // círculo branco de raio 16 (tingido e escalado pelos efeitos)
  make(scene, 'fx-ring', 32, 32, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(16, 16, 16);
  });

  // faísca suave para as partículas
  make(scene, 'fx-spark', 12, 12, (g) => {
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 2.5);
  });

  // fonte bitmap só com os caracteres dos números de dano
  const chars = '0123456789+-';
  const cw = 14;
  const ch = 20;
  if (scene.textures.exists('dmg-font')) return;
  const tex = scene.textures.createCanvas('dmg-font', cw * chars.length, ch);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';
  [...chars].forEach((c, i) => {
    ctx.strokeText(c, i * cw + cw / 2, ch / 2 + 1);
    ctx.fillText(c, i * cw + cw / 2, ch / 2 + 1);
  });
  tex.refresh();
  scene.cache.bitmapFont.add(
    'dmg',
    Phaser.GameObjects.RetroFont.Parse(scene, {
      image: 'dmg-font',
      width: cw,
      height: ch,
      chars,
      charsPerRow: chars.length,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 0,
    }),
  );
}
