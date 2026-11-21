import Phaser from 'phaser';

/**
 * Gráficos placeholder desenhados por código, para o protótipo não depender de assets.
 * Para usar arte de verdade, carregue imagens no BootScene (this.load.image / spritesheet)
 * com as MESMAS chaves usadas aqui e remova a geração correspondente.
 */

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

interface HeroLook {
  tunic: number;
  trim: number;
  hair: number;
  blade: number;
  helm?: number;
  plume?: number;
  cape?: number;
  eyes?: number;
}

/** Herói 40x48 virado para a direita */
function drawHero(g: Phaser.GameObjects.Graphics, o: HeroLook) {
  if (o.cape !== undefined) {
    g.fillStyle(o.cape);
    g.fillTriangle(10, 18, 30, 18, 33, 44);
    g.fillTriangle(10, 18, 5, 44, 33, 44);
  }
  // pernas
  g.fillStyle(0x3b2a1a);
  g.fillRect(13, 36, 5, 10);
  g.fillRect(22, 36, 5, 10);
  // corpo
  g.fillStyle(o.tunic);
  g.fillRoundedRect(10, 18, 20, 20, 4);
  g.fillStyle(o.trim);
  g.fillRect(10, 30, 20, 3);
  // cabeça
  g.fillStyle(0xf1c27d);
  g.fillCircle(20, 12, 8);
  if (o.helm !== undefined) {
    g.fillStyle(o.helm);
    g.fillRoundedRect(11, 2, 18, 11, 4);
    g.fillStyle(o.eyes ?? 0x1a1a1a);
    g.fillRect(17, 9, 11, 2);
  } else {
    g.fillStyle(o.hair);
    g.fillRect(12, 3, 16, 5);
    g.fillRect(12, 3, 4, 9);
    g.fillStyle(0x1a1a1a);
    g.fillRect(19, 11, 2, 2);
    g.fillRect(24, 11, 2, 2);
  }
  if (o.plume !== undefined) {
    g.fillStyle(o.plume);
    g.fillTriangle(14, 3, 22, 0, 10, -1);
    g.fillRect(14, 0, 8, 3);
  }
  // espada
  g.fillStyle(o.blade);
  g.fillRect(33, 6, 3, 24);
  g.fillStyle(o.trim);
  g.fillRect(30, 29, 9, 3);
  g.fillStyle(0x5a3a1a);
  g.fillRect(33, 32, 3, 6);
}

export function createTextures(scene: Phaser.Scene) {
  // ---- chão ----
  make(scene, 'grama', 128, 128, (g) => {
    g.fillStyle(0x2f4f2a);
    g.fillRect(0, 0, 128, 128);
    const rnd = new Phaser.Math.RandomDataGenerator(['grama']);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(rnd.pick([0x37592f, 0x294524, 0x3d6334]));
      g.fillRect(rnd.between(0, 124), rnd.between(0, 124), rnd.between(2, 4), rnd.between(2, 6));
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle(rnd.pick([0xb8a64a, 0xa86aa8, 0x8fa88a]));
      g.fillCircle(rnd.between(4, 124), rnd.between(4, 124), 2);
    }
  });

  // ---- heróis ----
  make(scene, 'hero-aprendiz', 40, 48, (g) =>
    drawHero(g, { tunic: 0x8b5a2b, trim: 0x5c3a1c, hair: 0x6b3f1f, blade: 0xb08050 }));
  make(scene, 'hero-guarda', 40, 48, (g) =>
    drawHero(g, { tunic: 0x3a5fa8, trim: 0x9aa8bc, hair: 0x000000, blade: 0xc8d0dc, helm: 0x8a9bb0 }));
  make(scene, 'hero-cavaleiro', 40, 48, (g) =>
    drawHero(g, {
      tunic: 0xd9d9e6, trim: 0xe0b43a, hair: 0x000000, blade: 0xf2f6ff, helm: 0xe6e6f0, plume: 0xc42f2f, cape: 0xb02a2a,
    }));

  // ---- inimigos ----
  make(scene, 'en-gosma', 28, 24, (g) => {
    g.fillStyle(0x4fae4f);
    g.fillEllipse(14, 15, 26, 18);
    g.fillStyle(0x7ee07e);
    g.fillEllipse(10, 11, 8, 5);
    g.fillStyle(0x1a1a1a);
    g.fillRect(9, 14, 3, 4);
    g.fillRect(17, 14, 3, 4);
  });
  make(scene, 'en-morcego', 34, 22, (g) => {
    g.fillStyle(0x5b3a7a);
    g.fillTriangle(17, 10, 0, 2, 4, 18);
    g.fillTriangle(17, 10, 34, 2, 30, 18);
    g.fillStyle(0x3e2656);
    g.fillCircle(17, 12, 7);
    g.fillStyle(0xff3b3b);
    g.fillRect(13, 10, 3, 3);
    g.fillRect(18, 10, 3, 3);
  });
  make(scene, 'en-esqueleto', 28, 38, (g) => {
    g.fillStyle(0xe8e4d4);
    g.fillCircle(14, 9, 8);
    g.fillRect(12, 16, 4, 14);
    for (let i = 0; i < 3; i++) g.fillRect(7, 18 + i * 4, 14, 2);
    g.fillRect(9, 30, 3, 8);
    g.fillRect(16, 30, 3, 8);
    g.fillStyle(0x1a1a1a);
    g.fillRect(9, 7, 4, 4);
    g.fillRect(15, 7, 4, 4);
  });
  make(scene, 'en-orc', 38, 40, (g) => {
    g.fillStyle(0x4a6b2f);
    g.fillRoundedRect(5, 14, 28, 22, 6);
    g.fillStyle(0x5f8a3c);
    g.fillCircle(19, 12, 11);
    g.fillStyle(0x6b4a2a);
    g.fillRect(5, 26, 28, 4);
    g.fillStyle(0xfff6d8);
    g.fillTriangle(13, 16, 15, 16, 14, 11);
    g.fillTriangle(23, 16, 25, 16, 24, 11);
    g.fillStyle(0xffd23b);
    g.fillRect(13, 8, 4, 3);
    g.fillRect(21, 8, 4, 3);
  });
  make(scene, 'en-cavaleiro-negro', 40, 48, (g) =>
    drawHero(g, { tunic: 0x26232e, trim: 0x6b1d1d, hair: 0, blade: 0x8a1f1f, helm: 0x34303d, cape: 0x3a0f14, eyes: 0xff2a2a }));

  // ---- habilidades e itens ----
  make(scene, 'escudo', 24, 28, (g) => {
    g.fillStyle(0xe0b43a);
    g.fillRoundedRect(0, 0, 24, 18, 4);
    g.fillTriangle(0, 14, 24, 14, 12, 28);
    g.fillStyle(0x2f5bd1);
    g.fillRoundedRect(3, 3, 18, 13, 3);
    g.fillTriangle(3, 13, 21, 13, 12, 24);
    g.fillStyle(0xffffff);
    g.fillRect(11, 5, 2, 14);
    g.fillRect(7, 9, 10, 2);
  });

  const gem = (key: string, color: number, light: number) =>
    make(scene, key, 12, 16, (g) => {
      g.fillStyle(color);
      g.fillTriangle(6, 0, 0, 8, 12, 8);
      g.fillTriangle(0, 8, 12, 8, 6, 16);
      g.fillStyle(light);
      g.fillTriangle(6, 2, 3, 8, 6, 8);
    });
  gem('gem1', 0x3d8bff, 0xbcd8ff);
  gem('gem2', 0x3bd16f, 0xc4ffd8);
  gem('gem3', 0xff4466, 0xffc4cf);

  make(scene, 'comida', 22, 16, (g) => {
    g.fillStyle(0xf2efe6);
    g.fillRect(0, 6, 8, 4);
    g.fillCircle(2, 5, 3);
    g.fillCircle(2, 11, 3);
    g.fillStyle(0xb5542a);
    g.fillEllipse(14, 8, 16, 14);
    g.fillStyle(0xd9773f);
    g.fillEllipse(12, 6, 7, 5);
  });
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

  // fonte bitmap só com os caracteres dos números de dano
  const chars = '0123456789+-';
  const cw = 14;
  const ch = 20;
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
