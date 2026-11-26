import Phaser from 'phaser';
import { ELEMENT_COLOR, type Element } from './data/types';
import type { RegionDef } from './data/stages';

export const W = 720;
export const H = 1280;
export const FONT = '"Trebuchet MS", "Segoe UI", Roboto, sans-serif';

export const C = {
  bg: 0x14121c,
  panel: 0x221d30,
  panel2: 0x2d2640,
  line: 0x5b4c86,
  gold: 0xf5c451,
  text: '#f3ecff',
  dim: '#a89cc6',
  good: 0x5ee08a,
  bad: 0xff5a5a,
};

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, size = 26, color: string = C.text, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#0b0912', strokeThickness: Math.max(2, Math.round(size / 7)),
    fontStyle: 'bold', ...opts,
  });
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = C.panel, stroke = C.line, r = 16, alpha = 0.96) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x + 3, y + 5, w, h, r);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(2, stroke, 1);
  g.strokeRoundedRect(x, y, w, h, r);
  return g;
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(on: boolean): Button;
  setLabel(s: string): Button;
  label: Phaser.GameObjects.Text;
}

/** Botão arredondado (centro em x,y) */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, color = 0x7a4fd6, size = 26): Button {
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (on: boolean, down = false) => {
    g.clear();
    const base = on ? color : 0x3a3448;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 14);
    g.fillStyle(Phaser.Display.Color.ValueToColor(base).darken(down ? 25 : 0).color, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (down ? 3 : 0), w, h, 14);
    g.fillStyle(0xffffff, on ? 0.16 : 0.05);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4 + (down ? 3 : 0), w - 8, h / 2 - 4, 10);
    g.lineStyle(2, 0xffffff, on ? 0.35 : 0.1);
    g.strokeRoundedRect(-w / 2, -h / 2 + (down ? 3 : 0), w, h, 14);
  };
  let enabled = true;
  draw(true);
  const t = txt(scene, 0, 0, label, size).setOrigin(0.5);
  c.add([g, t]);
  c.label = t;
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { if (enabled) { draw(true, true); t.y = 3; } });
  c.on('pointerout', () => { draw(enabled); t.y = 0; });
  c.on('pointerup', () => {
    draw(enabled);
    t.y = 0;
    if (enabled) onClick();
  });
  c.setEnabled = (on: boolean) => {
    enabled = on;
    draw(on);
    t.setAlpha(on ? 1 : 0.45);
    return c;
  };
  c.setLabel = (s: string) => { t.setText(s); return c; };
  return c;
}

export const stars = (n: number) => '★'.repeat(n);

/** Desenha os símbolos de elemento, partículas e outros enfeites como texturas */
export function makeTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const S = 64;
  const symbol: Record<Element, (g: Phaser.GameObjects.Graphics) => void> = {
    fogo: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(32, 10, 18, 40, 46, 40);
      g.fillCircle(32, 40, 14);
      g.fillStyle(ELEMENT_COLOR.fogo, 1);
      g.fillCircle(32, 44, 6);
    },
    agua: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(32, 10, 19, 36, 45, 36);
      g.fillCircle(32, 39, 13);
    },
    vento: (g) => {
      g.lineStyle(6, 0xffffff, 1);
      g.beginPath(); g.arc(30, 32, 14, Math.PI * 0.9, Math.PI * 2.2); g.strokePath();
      g.beginPath(); g.moveTo(14, 46); g.lineTo(46, 46); g.strokePath();
      g.beginPath(); g.moveTo(14, 20); g.lineTo(30, 20); g.strokePath();
    },
    luz: (g) => {
      g.fillStyle(0xffffff, 1);
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? 9 : 20;
        const a = (i / 16) * Math.PI * 2;
        pts.push(new Phaser.Math.Vector2(32 + Math.cos(a) * r, 32 + Math.sin(a) * r));
      }
      g.fillPoints(pts, true);
    },
    sombra: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(32, 32, 17);
      g.fillStyle(ELEMENT_COLOR.sombra, 1);
      g.fillCircle(40, 27, 15);
    },
  };
  for (const el of Object.keys(symbol) as Element[]) {
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillCircle(S / 2, S / 2 + 2, 30);
    g.fillStyle(ELEMENT_COLOR[el], 1);
    g.fillCircle(S / 2, S / 2, 29);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(S / 2, S / 2, 28);
    symbol[el](g);
    g.generateTexture(`el-${el}`, S, S);
  }
  // brilho redondo (projéteis e partículas)
  g.clear();
  for (let r = 32; r > 0; r -= 2) {
    g.fillStyle(0xffffff, Math.pow(1 - r / 32, 1.6));
    g.fillCircle(32, 32, r);
  }
  g.generateTexture('glow', 64, 64);
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 6, 6);
  g.generateTexture('dot', 12, 12);
  // flecha
  g.clear();
  g.fillStyle(0xe8d9b0, 1);
  g.fillRect(0, 5, 44, 3);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(44, 0, 56, 6.5, 44, 13);
  g.fillStyle(0xc0c0c0, 1);
  g.fillTriangle(0, 1, 8, 6.5, 0, 12);
  g.generateTexture('arrow', 56, 13);
  // anel no chão
  g.clear();
  g.lineStyle(5, 0xffffff, 1);
  g.strokeEllipse(64, 20, 120, 34);
  g.generateTexture('ring', 128, 40);
  // corte (meia-lua)
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.beginPath();
  g.arc(48, 48, 44, -Math.PI * 0.75, Math.PI * 0.25, false);
  g.arc(36, 60, 40, Math.PI * 0.25, -Math.PI * 0.75, true);
  g.closePath();
  g.fillPath();
  g.generateTexture('slash', 96, 96);
  // estrela de 4 pontas (brilho)
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(16, 0, 20, 16, 12, 16);
  g.fillTriangle(16, 32, 20, 16, 12, 16);
  g.fillTriangle(0, 16, 16, 12, 16, 20);
  g.fillTriangle(32, 16, 16, 12, 16, 20);
  g.generateTexture('spark', 32, 32);
  // cruz de cura
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(9, 2, 8, 22);
  g.fillRect(2, 9, 22, 8);
  g.generateTexture('plus', 26, 26);
  g.destroy();
}

/** Cenário de batalha desenhado à mão para cada região */
export function drawBackdrop(scene: Phaser.Scene, region: RegionDef, top: number, bottom: number) {
  const g = scene.add.graphics();
  const h = bottom - top;
  g.fillGradientStyle(region.sky[0], region.sky[0], region.sky[1], region.sky[1], 1);
  g.fillRect(0, top, W, h);
  const rnd = new Phaser.Math.RandomDataGenerator(['pacto', region.deco]);
  const horizon = top + h * 0.38;
  const dark = Phaser.Display.Color.ValueToColor(region.ground).darken(30).color;
  if (region.deco === 'bosque') {
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle(layer ? 0x1e3a2a : 0x2c5038, 1);
      for (let x = -40; x < W + 40; x += rnd.between(50, 80)) {
        const th = rnd.between(120, 220) - layer * 40;
        const base = horizon + 30 + layer * 20;
        g.fillTriangle(x, base - th, x - 44, base, x + 44, base);
        g.fillTriangle(x, base - th * 0.7, x - 52, base + 20, x + 52, base + 20);
      }
    }
    g.fillStyle(0xfff4c0, 0.08);
    for (let i = 0; i < 5; i++) g.fillTriangle(100 + i * 140, top, 60 + i * 140, bottom, 180 + i * 140, bottom);
  } else if (region.deco === 'caverna') {
    g.fillStyle(0x1a0806, 1);
    for (let x = 0; x < W; x += rnd.between(40, 70)) {
      const len = rnd.between(40, 130);
      g.fillTriangle(x - 22, top, x + 22, top, x + rnd.between(-6, 6), top + len);
    }
    g.fillStyle(0xff7a2a, 0.18);
    g.fillEllipse(W / 2, horizon + 10, W * 1.3, 90);
    g.fillStyle(0x2a0e08, 1);
    for (let x = -30; x < W + 30; x += rnd.between(60, 110)) {
      const th = rnd.between(60, 150);
      g.fillTriangle(x, horizon + 40 - th, x - 60, horizon + 50, x + 60, horizon + 50);
    }
  } else {
    g.fillStyle(0x0d0918, 1);
    for (let x = 30; x < W; x += 130) {
      g.fillRect(x, top + 40, 46, horizon - top + 20);
      g.fillRect(x - 10, top + 30, 66, 18);
    }
    g.fillStyle(0x9b7bff, 0.12);
    g.fillCircle(W * 0.72, top + 110, 70);
    g.fillStyle(0xd8c8ff, 0.5);
    g.fillCircle(W * 0.72, top + 110, 26);
  }
  // chão
  g.fillStyle(region.ground, 1);
  g.fillRect(0, horizon + 40, W, bottom - horizon - 40);
  g.fillGradientStyle(dark, dark, region.ground, region.ground, 1);
  g.fillRect(0, horizon + 40, W, 60);
  g.fillStyle(0xffffff, 0.05);
  g.fillEllipse(W / 2, horizon + 290, W * 1.15, 380);
  // pedrinhas e tufos
  for (let i = 0; i < 40; i++) {
    const x = rnd.between(0, W);
    const y = rnd.between(horizon + 60, bottom - 10);
    g.fillStyle(i % 3 ? dark : 0xffffff, i % 3 ? 0.6 : 0.06);
    g.fillEllipse(x, y, rnd.between(6, 18), rnd.between(3, 7));
  }
  return g;
}
