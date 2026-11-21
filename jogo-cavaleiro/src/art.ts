import Phaser from 'phaser';

/**
 * Arte original do jogo, desenhada por código (Canvas 2D) no estilo chibi de RPG:
 * cabeça grande, olhos de anime, contorno escuro, sombreado suave e sombra no chão.
 *
 * Tudo é desenhado em 2x e exibido com escala 0.5, para ficar nítido.
 * Cada personagem vira uma "spritesheet" com quadros de animação.
 *
 * Para trocar por arte desenhada à mão depois: carregue spritesheets com as mesmas
 * chaves e nomes de quadro (ex.: 'hero-guarda' com 'idle0', 'walk0'...).
 */

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const OUT = '#2a1c14';

// ------------------------------------------------------------------ utilidades de desenho

/** Clareia (amt > 0) ou escurece (amt < 0) uma cor #rrggbb */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const ch = (v: number) => Math.round((t - v) * p + v);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Preenche um caminho e contorna com a linha escura (o "outline" do estilo) */
function paint(c: Ctx, path: () => void, fill: string | CanvasGradient, line = 1.1, stroke = OUT) {
  c.beginPath();
  path();
  c.fillStyle = fill;
  c.fill();
  if (line > 0) {
    c.lineWidth = line;
    c.strokeStyle = stroke;
    c.stroke();
  }
}

function vgrad(c: Ctx, y0: number, y1: number, top: string, bottom: string) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

function ell(c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  return () => c.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function groundShadow(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.3) {
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.translate(x, y);
  c.scale(1, ry / rx);
  c.translate(-x, -y);
  c.beginPath();
  c.arc(x, y, rx, 0, TAU);
  c.fillStyle = g;
  c.fill();
  c.restore();
}

/** Olho de anime: contorno escuro, íris colorida e brilho */
function eye(c: Ctx, x: number, y: number, rx: number, ry: number, color: string) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = '#1d1420';
  c.fill();
  c.beginPath();
  c.ellipse(x, y + ry * 0.22, rx * 0.72, ry * 0.62, 0, 0, TAU);
  c.fillStyle = vgrad(c, y - ry * 0.4, y + ry, shade(color, -0.2), shade(color, 0.35));
  c.fill();
  c.beginPath();
  c.arc(x + rx * 0.25, y - ry * 0.35, rx * 0.4, 0, TAU);
  c.fillStyle = '#ffffff';
  c.fill();
}

/** Osso/linha com contorno (usado no esqueleto) */
function bone(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: string) {
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.strokeStyle = '#3a2e22';
  c.lineWidth = w + 1.8;
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}

/** Cria uma textura com vários quadros lado a lado, desenhados em 2x */
function sheet(scene: Phaser.Scene, key: string, w: number, h: number, frames: string[], draw: (c: Ctx, frame: string, i: number) => void) {
  if (scene.textures.exists(key)) return;
  const W = w * 2;
  const H = h * 2;
  const tex = scene.textures.createCanvas(key, W * frames.length, H);
  if (!tex) return;
  const c = tex.getContext();
  frames.forEach((f, i) => {
    c.save();
    c.translate(i * W, 0);
    c.beginPath();
    c.rect(0, 0, W, H);
    c.clip();
    c.scale(2, 2);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    draw(c, f, i);
    c.restore();
    tex.add(f, 0, i * W, 0, W, H);
  });
  tex.refresh();
}

/** Textura de um quadro só, desenhada em 2x */
function single(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w * 2, h * 2);
  if (!tex) return;
  const c = tex.getContext();
  c.scale(2, 2);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  tex.refresh();
}

// ------------------------------------------------------------------ heróis

interface HeroLook {
  skin: string;
  hair: string;
  eye: string;
  tunic: string;
  trim: string;
  pants: string;
  boots: string;
  blade: string;
  bladeLength: number;
  armor?: string;
  helm?: 'cap' | 'full';
  helmColor?: string;
  circlet?: string;
  cape?: string;
}

interface Pose {
  leg: number;
  arm: number;
  bob: number;
  atk?: boolean;
}

const HERO_POSES: Record<string, Pose> = {
  idle0: { leg: 0, arm: 0, bob: 0 },
  idle1: { leg: 0, arm: 0.15, bob: 0.8 },
  walk0: { leg: 1, arm: -1, bob: 0 },
  walk1: { leg: 0, arm: 0, bob: -1.2 },
  walk2: { leg: -1, arm: 1, bob: 0 },
  walk3: { leg: 0, arm: 0, bob: -1.2 },
  atk: { leg: 0.5, arm: 0, bob: 0.5, atk: true },
};
export const HERO_FRAMES = Object.keys(HERO_POSES);

function heroLeg(c: Ctx, x: number, y: number, L: HeroLook, lift: number) {
  paint(c, () => rr(c, x - 3.5, y, 7, 11, 2.5), vgrad(c, y, y + 11, shade(L.pants, 0.1), shade(L.pants, -0.25)));
  paint(c, () => rr(c, x - 4, y + 9 + lift, 10, 6.5, 2.8), vgrad(c, y + 9, y + 16, shade(L.boots, 0.2), shade(L.boots, -0.3)));
}

function heroArm(c: Ctx, x: number, y: number, angle: number, sleeve: string, skin: string) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  paint(c, () => rr(c, -3, -1, 6, 9.5, 3), vgrad(c, 0, 9, shade(sleeve, 0.15), shade(sleeve, -0.2)));
  paint(c, ell(c, 0, 11, 2.9, 2.9), skin);
  c.restore();
}

function drawHero(c: Ctx, L: HeroLook, p: Pose) {
  const b = p.bob;
  groundShadow(c, 32, 73, 17, 4.5, 0.38);

  // capa (atrás de tudo)
  if (L.cape) {
    const fl = p.leg * 1.6;
    paint(c, () => {
      c.moveTo(37, 40 + b);
      c.lineTo(24, 40 + b);
      c.quadraticCurveTo(14, 52, 10 + fl, 67);
      c.lineTo(16, 64.5);
      c.lineTo(21, 69);
      c.quadraticCurveTo(27, 58, 35, 52 + b);
      c.closePath();
    }, vgrad(c, 40, 70, L.cape, shade(L.cape, -0.45)));
  }

  // braço de trás
  heroArm(c, 25, 43 + b, 0.25 + p.arm * 0.35, L.armor ?? L.tunic, shade(L.skin, -0.08));

  // pernas
  heroLeg(c, 28 - p.leg * 3, 56 + b, L, p.leg > 0 ? -0.6 : 0);
  heroLeg(c, 35 + p.leg * 3, 56 + b, L, p.leg < 0 ? -0.6 : 0);

  // corpo
  paint(c, () => {
    c.moveTo(21, 51 + b);
    c.lineTo(43, 51 + b);
    c.lineTo(45.5, 60 + b);
    c.lineTo(18.5, 60 + b);
    c.closePath();
  }, vgrad(c, 51, 60, shade(L.tunic, -0.05), shade(L.tunic, -0.35)));
  c.beginPath();
  c.moveTo(19, 58.5 + b);
  c.lineTo(45, 58.5 + b);
  c.strokeStyle = L.trim;
  c.lineWidth = 1.6;
  c.stroke();
  paint(c, () => rr(c, 22, 39.5 + b, 20, 15, 6), vgrad(c, 40, 55, shade(L.tunic, 0.25), shade(L.tunic, -0.15)));
  paint(c, () => rr(c, 21.5, 50 + b, 21, 3.4, 1.2), '#5a3a22', 0.9);
  paint(c, () => rr(c, 33, 49.5 + b, 4.4, 4.4, 1), '#e8c04a', 0.8);

  if (L.armor) {
    paint(c, () => rr(c, 23.5, 40.5 + b, 17, 9.5, 4), vgrad(c, 40, 50, shade(L.armor, 0.45), shade(L.armor, -0.2)));
    c.beginPath();
    c.moveTo(26, 43 + b);
    c.lineTo(30, 42.5 + b);
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 1.2;
    c.stroke();
    paint(c, ell(c, 23, 42.5 + b, 5.8, 4.6, -0.3), vgrad(c, 38, 47, shade(L.armor, 0.4), shade(L.armor, -0.25)));
    paint(c, ell(c, 41.5, 42.5 + b, 5.8, 4.6, 0.3), vgrad(c, 38, 47, shade(L.armor, 0.4), shade(L.armor, -0.25)));
  }

  // cabeça
  const hx = 33;
  const hy = 25 + b;
  if (L.helm === 'full') {
    const metal = L.helmColor ?? '#555';
    paint(c, ell(c, hx, hy, 14.5, 13.5), vgrad(c, hy - 14, hy + 14, shade(metal, 0.35), shade(metal, -0.35)));
    paint(c, () => {
      c.moveTo(hx - 4, hy - 13.5);
      c.quadraticCurveTo(hx + 2, hy - 22, hx + 10, hy - 20);
      c.quadraticCurveTo(hx + 4, hy - 16, hx + 3, hy - 12.5);
      c.closePath();
    }, '#8a1f1f');
    paint(c, () => rr(c, hx - 3, hy - 0.5, 17, 4.6, 2), '#120c10', 0.8);
    c.save();
    c.shadowColor = '#ff2a2a';
    c.shadowBlur = 5;
    c.fillStyle = '#ff5050';
    c.beginPath();
    c.ellipse(hx + 5, hy + 1.8, 1.8, 1.2, 0, 0, TAU);
    c.ellipse(hx + 10.5, hy + 1.8, 1.6, 1.1, 0, 0, TAU);
    c.fill();
    c.restore();
    c.beginPath();
    c.moveTo(hx - 9, hy - 8);
    c.quadraticCurveTo(hx - 2, hy - 12, hx + 6, hy - 10);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.4;
    c.stroke();
  } else {
    // cabelo de trás
    paint(c, ell(c, hx - 2, hy - 1.5, 15.5, 14.5), vgrad(c, hy - 16, hy + 12, shade(L.hair, 0.15), shade(L.hair, -0.35)));
    // rosto
    paint(c, ell(c, hx + 1, hy + 2, 12.5, 11.5), vgrad(c, hy - 9, hy + 13, shade(L.skin, 0.12), shade(L.skin, -0.1)));
    eye(c, hx + 7, hy + 3, 2.5, 3.5, L.eye);
    eye(c, hx - 1.5, hy + 3, 2.1, 3.2, L.eye);
    c.fillStyle = 'rgba(255,110,110,0.3)';
    c.beginPath();
    c.ellipse(hx + 8.5, hy + 8, 2.6, 1.3, 0, 0, TAU);
    c.ellipse(hx - 2.5, hy + 8, 2.1, 1.1, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(hx + 3, hy + 9.6);
    c.quadraticCurveTo(hx + 4.6, hy + 10.8, hx + 6.2, hy + 9.6);
    c.strokeStyle = '#7a3b2a';
    c.lineWidth = 0.9;
    c.stroke();
    // franja
    paint(c, () => {
      c.moveTo(hx - 15, hy + 7);
      c.quadraticCurveTo(hx - 18, hy - 12, hx - 2, hy - 15.5);
      c.quadraticCurveTo(hx + 13, hy - 15.5, hx + 15.5, hy - 2);
      c.lineTo(hx + 13.5, hy + 2.5);
      c.lineTo(hx + 10.5, hy - 4);
      c.lineTo(hx + 8.5, hy + 1);
      c.lineTo(hx + 4.5, hy - 5.5);
      c.lineTo(hx + 1.5, hy + 0.5);
      c.lineTo(hx - 2.5, hy - 5);
      c.lineTo(hx - 6, hy + 1.5);
      c.lineTo(hx - 9, hy - 3);
      c.lineTo(hx - 11.5, hy + 6);
      c.closePath();
    }, vgrad(c, hy - 16, hy + 4, shade(L.hair, 0.3), shade(L.hair, -0.12)));
    // pontas do cabelo
    paint(c, () => {
      c.moveTo(hx - 10, hy - 11.5);
      c.quadraticCurveTo(hx - 11, hy - 16, hx - 7, hy - 17.5);
      c.quadraticCurveTo(hx - 6, hy - 15, hx - 3, hy - 14.8);
      c.quadraticCurveTo(hx - 1, hy - 18.5, hx + 3, hy - 17.8);
      c.quadraticCurveTo(hx + 2, hy - 15.5, hx + 4.5, hy - 14.5);
      c.closePath();
    }, shade(L.hair, 0.15));
    c.beginPath();
    c.arc(hx - 3, hy - 4, 9, -2.4, -1.6);
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.lineWidth = 1.5;
    c.stroke();

    if (L.helm === 'cap') {
      const metal = L.helmColor ?? '#9aa6b5';
      paint(c, () => {
        c.moveTo(hx - 15.5, hy - 3);
        c.quadraticCurveTo(hx - 15.5, hy - 19.5, hx, hy - 19.5);
        c.quadraticCurveTo(hx + 15.5, hy - 19.5, hx + 15.5, hy - 3);
        c.closePath();
      }, vgrad(c, hy - 20, hy - 3, shade(metal, 0.45), shade(metal, -0.25)));
      paint(c, () => rr(c, hx - 16.5, hy - 5.5, 33, 4.4, 2), shade(metal, -0.15));
      c.fillStyle = '#e8c04a';
      for (const rx of [-10, 0, 10]) {
        c.beginPath();
        c.arc(hx + rx, hy - 3.3, 0.9, 0, TAU);
        c.fill();
      }
    }
    if (L.circlet) {
      paint(c, () => rr(c, hx - 13.5, hy - 7, 28, 2.8, 1.4), L.circlet, 0.8);
      paint(c, ell(c, hx + 6, hy - 5.6, 2, 2), '#4fb3ff', 0.7);
    }
  }

  // braço da frente com a arma
  const af = p.atk ? -1.5 : -0.35 - p.arm * 0.35;
  const tw = p.atk ? -0.12 : -1.1;
  c.save();
  c.translate(39, 43 + b);
  c.rotate(af);
  paint(c, () => rr(c, -3, -1, 6, 9.5, 3), vgrad(c, 0, 9, shade(L.armor ?? L.tunic, 0.2), shade(L.armor ?? L.tunic, -0.15)));
  c.save();
  c.translate(0, 11);
  c.rotate(tw - Math.PI / 2 - af);
  const bl = L.bladeLength;
  paint(c, () => rr(c, -1.3, -6, 2.6, 6, 1), '#6b4424', 0.8);
  paint(c, () => rr(c, -4.8, -0.6, 9.6, 2.6, 1.2), L.trim, 0.8);
  paint(c, () => {
    c.moveTo(-2.1, 2);
    c.lineTo(2.1, 2);
    c.lineTo(1.7, bl - 3);
    c.lineTo(0, bl + 1);
    c.lineTo(-1.7, bl - 3);
    c.closePath();
  }, (() => {
    const g = c.createLinearGradient(-2, 0, 2, 0);
    g.addColorStop(0, shade(L.blade, 0.5));
    g.addColorStop(1, shade(L.blade, -0.3));
    return g;
  })(), 0.9);
  c.restore();
  paint(c, ell(c, 0, 11, 3, 3), L.skin);
  c.restore();

  if (p.atk) {
    // rastro de movimento do golpe
    c.beginPath();
    c.arc(39, 50 + b, 22, -1.2, 0.2);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    c.stroke();
  }
}

const HEROES: Record<string, HeroLook> = {
  'hero-aprendiz': {
    skin: '#f7d3b0', hair: '#8a5a32', eye: '#4f8f3a', tunic: '#b98a52', trim: '#e9d9b6',
    pants: '#6e5a45', boots: '#6b4226', blade: '#c9cfd6', bladeLength: 14,
  },
  'hero-guarda': {
    skin: '#f5d0ad', hair: '#3b4a6b', eye: '#3a6ac0', tunic: '#3e6bb8', trim: '#dfe7f2',
    pants: '#3a3f4f', boots: '#4a4038', blade: '#dfe5ec', bladeLength: 18, armor: '#aeb8c6', helm: 'cap', helmColor: '#9aa6b5',
  },
  'hero-cavaleiro': {
    skin: '#f7d6b5', hair: '#e6be6a', eye: '#3d7fd6', tunic: '#f2f0ea', trim: '#d6a84a',
    pants: '#4a4458', boots: '#6b4a2e', blade: '#f3f7ff', bladeLength: 22, armor: '#dfe3ea', circlet: '#e0b43a', cape: '#b3262e',
  },
  'en-cavaleiro-negro': {
    skin: '#d9c3b0', hair: '#2a2a33', eye: '#ff3030', tunic: '#2b2733', trim: '#7a2020',
    pants: '#2a2630', boots: '#1f1b22', blade: '#9a2a2a', bladeLength: 22, armor: '#4a4556', helm: 'full', helmColor: '#3d3947', cape: '#3a0f14',
  },
};

// ------------------------------------------------------------------ monstros

const MONSTER_FRAMES = ['f0', 'f1', 'f2', 'f3'];

function drawSlime(c: Ctx, i: number) {
  const s = [1, 0.9, 0.82, 0.9][i];
  const rx = 15 * (1 + (1 - s) * 0.8);
  const ry = 14 * s;
  const base = 40;
  const top = base - ry * 1.55;
  groundShadow(c, 24, base, rx * 1.05, 3.8, 0.35);
  const g = c.createRadialGradient(24 - rx * 0.35, top + ry * 0.5, 1, 24, base - ry * 0.6, rx * 1.3);
  g.addColorStop(0, '#d6ffab');
  g.addColorStop(0.45, '#73d150');
  g.addColorStop(1, '#2c8030');
  paint(c, () => {
    c.moveTo(24 - rx, base);
    c.bezierCurveTo(24 - rx * 1.05, top, 24 + rx * 1.05, top, 24 + rx, base);
    c.quadraticCurveTo(24, base + 2, 24 - rx, base);
  }, g, 1.3, '#1c4a1e');
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.beginPath();
  c.ellipse(24 - rx * 0.45, top + ry * 0.55, 3.6, 2.2, -0.5, 0, TAU);
  c.fill();
  const ey = base - ry * 0.75;
  eye(c, 28.5, ey, 2.3, 3.2, '#3a2a1a');
  eye(c, 20.5, ey, 2, 2.9, '#3a2a1a');
  c.beginPath();
  c.moveTo(23, ey + 4.5);
  c.quadraticCurveTo(24.8, ey + 6, 26.6, ey + 4.5);
  c.strokeStyle = '#1c4a1e';
  c.lineWidth = 0.9;
  c.stroke();
  // brotinho no topo
  const ly = top + ry * 0.25;
  c.beginPath();
  c.moveTo(24, ly + 1);
  c.quadraticCurveTo(24.5, ly - 3, 26, ly - 5);
  c.strokeStyle = '#3f7a28';
  c.lineWidth = 1.2;
  c.stroke();
  paint(c, ell(c, 29, ly - 6, 4, 2.2, -0.4), vgrad(c, ly - 8, ly - 4, '#a8ee7a', '#4caf3a'), 0.8, '#1c4a1e');
}

function drawBat(c: Ctx, i: number) {
  const by = 20 + [0, 1, 2, 1][i];
  const wy = [-12, -2, 8, -2][i];
  groundShadow(c, 26, 41, 10, 2.5, 0.22);
  for (const side of [-1, 1]) {
    paint(c, () => {
      c.moveTo(26 + side * 4, by - 2);
      c.quadraticCurveTo(26 + side * 13, by - 7 + wy * 0.5, 26 + side * 24, by + wy - 4);
      c.lineTo(26 + side * 21.5, by + wy + 2);
      c.quadraticCurveTo(26 + side * 19, by + wy * 0.6 + 1, 26 + side * 16, by + wy * 0.5 + 5);
      c.quadraticCurveTo(26 + side * 13, by + 2.5, 26 + side * 9, by + 6.5);
      c.lineTo(26 + side * 4, by + 3);
      c.closePath();
    }, vgrad(c, by - 12, by + 12, '#9a72d4', '#4a2f78'), 1.1, '#24143a');
  }
  paint(c, () => {
    c.moveTo(19.5, by - 4);
    c.lineTo(20, by - 13);
    c.lineTo(24, by - 7);
    c.lineTo(28, by - 7);
    c.lineTo(32, by - 13);
    c.lineTo(32.5, by - 4);
    c.closePath();
  }, '#5a3b8c', 1, '#24143a');
  const g = c.createRadialGradient(23, by - 3, 1, 26, by, 10);
  g.addColorStop(0, '#9d7ad6');
  g.addColorStop(1, '#4b2f7d');
  paint(c, ell(c, 26, by, 9, 8.5), g, 1.1, '#24143a');
  paint(c, ell(c, 26, by + 3.5, 5, 3.6), 'rgba(200,170,240,0.55)', 0);
  c.save();
  c.shadowColor = '#ff2a2a';
  c.shadowBlur = 4;
  c.fillStyle = '#ff5a5a';
  c.beginPath();
  c.ellipse(22.5, by - 1, 1.9, 2.3, 0, 0, TAU);
  c.ellipse(29.5, by - 1, 1.9, 2.3, 0, 0, TAU);
  c.fill();
  c.restore();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(24, by + 3);
  c.lineTo(25, by + 5.5);
  c.lineTo(25.8, by + 3);
  c.moveTo(26.6, by + 3);
  c.lineTo(27.4, by + 5.5);
  c.lineTo(28.2, by + 3);
  c.fill();
}

function drawSkeleton(c: Ctx, i: number) {
  const leg = [1, 0, -1, 0][i];
  const b = [0, -1, 0, -1][i];
  const boneC = '#eee7d5';
  groundShadow(c, 24, 59, 13, 3.5, 0.35);
  bone(c, 22, 42 + b, 21 - leg * 3, 55, 2.6, boneC);
  bone(c, 27, 42 + b, 28 + leg * 3, 55, 2.6, boneC);
  paint(c, ell(c, 20.5 - leg * 3, 56.5, 3.4, 1.8), boneC, 1, '#3a2e22');
  paint(c, ell(c, 29.5 + leg * 3, 56.5, 3.4, 1.8), boneC, 1, '#3a2e22');
  bone(c, 19, 30 + b, 15 + leg * 2, 40 + b, 2.2, '#d8cfb8');
  paint(c, ell(c, 24.5, 42.5 + b, 6.5, 3.2), boneC, 1, '#3a2e22');
  bone(c, 24.5, 30 + b, 24.5, 42 + b, 2.4, boneC);
  paint(c, () => rr(c, 17, 28 + b, 15, 12, 5), vgrad(c, 28, 40, '#fbf6e8', '#c9bea2'), 1.1, '#3a2e22');
  c.strokeStyle = '#7a6a50';
  c.lineWidth = 1;
  for (const ry of [31.5, 34.5, 37.5]) {
    c.beginPath();
    c.moveTo(18.5, ry + b);
    c.quadraticCurveTo(24.5, ry + 1.5 + b, 30.5, ry + b);
    c.stroke();
  }
  // braço da frente e espada enferrujada
  bone(c, 30, 30 + b, 35, 37 + b, 2.2, boneC);
  c.save();
  c.translate(35.5, 37.5 + b);
  c.rotate(-0.9);
  paint(c, () => rr(c, -1.2, -1, 2.4, 4, 1), '#5a3a22', 0.8);
  paint(c, () => rr(c, -3.5, -2, 7, 2, 1), '#8a7a5a', 0.8);
  paint(c, () => {
    c.moveTo(-1.6, -2);
    c.lineTo(1.6, -2);
    c.lineTo(1.2, -15);
    c.lineTo(0, -18);
    c.lineTo(-1.2, -15);
    c.closePath();
  }, vgrad(c, -18, -2, '#c9c2b2', '#8a6a4a'), 0.9);
  c.restore();
  // crânio
  paint(c, ell(c, 25, 17 + b, 11, 10), vgrad(c, 7, 27, '#fffaf0', '#cfc4a8'), 1.2, '#3a2e22');
  paint(c, () => rr(c, 20, 21 + b, 11, 6.5, 2.5), '#e6dcc4', 1.1, '#3a2e22');
  c.strokeStyle = '#7a6a50';
  c.lineWidth = 0.8;
  for (let t = 22; t <= 29; t += 2.2) {
    c.beginPath();
    c.moveTo(t, 23.5 + b);
    c.lineTo(t, 27 + b);
    c.stroke();
  }
  c.fillStyle = '#2a1e22';
  c.beginPath();
  c.ellipse(29, 16 + b, 3, 3.5, 0, 0, TAU);
  c.ellipse(21.5, 16 + b, 2.6, 3.2, 0, 0, TAU);
  c.fill();
  c.save();
  c.shadowColor = '#ff4020';
  c.shadowBlur = 4;
  c.fillStyle = '#ff6a3a';
  c.beginPath();
  c.arc(29.5, 16.5 + b, 1, 0, TAU);
  c.arc(22, 16.5 + b, 0.9, 0, TAU);
  c.fill();
  c.restore();
}

function drawOrc(c: Ctx, i: number) {
  const leg = [1, 0, -1, 0][i];
  const b = [0, -1, 0, -1][i];
  const skin = '#6fa043';
  groundShadow(c, 30, 62, 19, 4.5, 0.38);
  for (const [x, sgn] of [[24, -1], [36, 1]] as const) {
    const lx = x + leg * 3 * sgn;
    paint(c, () => rr(c, lx - 4.5, 47 + b, 9, 11, 3), vgrad(c, 47, 58, shade(skin, 0.1), shade(skin, -0.3)), 1.2, '#1e2c12');
    paint(c, ell(c, lx + 1, 59, 5.5, 2.8), '#5a3a22', 1.1, '#1e2c12');
  }
  // braço de trás
  paint(c, ell(c, 16, 38 + b, 4.5, 8, 0.3 - leg * 0.2), shade(skin, -0.12), 1.2, '#1e2c12');
  const g = c.createRadialGradient(26, 32 + b, 2, 30, 38 + b, 18);
  g.addColorStop(0, '#9ccc6a');
  g.addColorStop(1, '#46752a');
  paint(c, () => rr(c, 15, 27 + b, 30, 22, 10), g, 1.3, '#1e2c12');
  paint(c, () => {
    c.moveTo(17, 44 + b);
    c.lineTo(43, 44 + b);
    c.lineTo(41, 54 + b);
    c.lineTo(19, 54 + b);
    c.closePath();
  }, vgrad(c, 44, 54, '#8a5f38', '#5a3a1e'), 1.1, '#2a1a0e');
  paint(c, () => rr(c, 16, 42.5 + b, 28, 3, 1.4), '#c9a46a', 0.9, '#2a1a0e');
  // cabeça
  paint(c, () => {
    c.moveTo(22, 15 + b);
    c.lineTo(14, 9 + b);
    c.lineTo(22.5, 21 + b);
    c.closePath();
  }, skin, 1.1, '#1e2c12');
  paint(c, ell(c, 33, 19 + b, 12.5, 11.5), vgrad(c, 8, 31, '#a3d36e', '#4f8030'), 1.3, '#1e2c12');
  paint(c, () => {
    c.moveTo(24, 9.5 + b);
    for (let k = 0; k < 5; k++) {
      c.lineTo(26 + k * 3.2, 3 + b + (k % 2) * 2);
      c.lineTo(27.6 + k * 3.2, 9 + b);
    }
    c.closePath();
  }, '#2a1e16', 1, '#140c08');
  c.beginPath();
  c.moveTo(30, 14 + b);
  c.lineTo(35.5, 16 + b);
  c.moveTo(43, 14 + b);
  c.lineTo(38.5, 16 + b);
  c.strokeStyle = '#1e2c12';
  c.lineWidth = 1.6;
  c.stroke();
  for (const ex of [33, 40]) {
    paint(c, ell(c, ex, 18 + b, 2.3, 1.8), '#ffd23b', 0.8, '#1e2c12');
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(ex + 0.5, 18.3 + b, 0.9, 0, TAU);
    c.fill();
  }
  for (const tx of [32, 40]) {
    paint(c, () => {
      c.moveTo(tx - 1.5, 26 + b);
      c.lineTo(tx + 1.5, 26 + b);
      c.lineTo(tx, 21.5 + b);
      c.closePath();
    }, '#fff6d8', 0.8, '#3a2e22');
  }
  // braço da frente com clava
  c.save();
  c.translate(43, 33 + b);
  c.rotate(-0.4 + leg * 0.15);
  paint(c, () => rr(c, -2, -24, 5.5, 26, 2.5), vgrad(c, -24, 2, '#a06a3a', '#5e3a1c'), 1.1, '#2a1a0e');
  paint(c, ell(c, 0.8, -22, 5.5, 6.5), vgrad(c, -29, -15, '#b07a46', '#6a4422'), 1.1, '#2a1a0e');
  c.fillStyle = '#d8d0c0';
  for (const [sx, sy] of [[-4.5, -24], [5.5, -21], [0.5, -28.5]]) {
    c.beginPath();
    c.arc(sx, sy, 1.1, 0, TAU);
    c.fill();
  }
  c.restore();
  paint(c, ell(c, 44, 34 + b, 5, 5), skin, 1.2, '#1e2c12');
}

// ------------------------------------------------------------------ itens, chão e decoração

function drawGem(c: Ctx, color: string) {
  groundShadow(c, 6, 15, 5, 1.5, 0.3);
  paint(c, () => {
    c.moveTo(6, 0.8);
    c.lineTo(11, 6);
    c.lineTo(6, 14);
    c.lineTo(1, 6);
    c.closePath();
  }, vgrad(c, 0, 14, shade(color, 0.45), shade(color, -0.35)), 0.9, shade(color, -0.6));
  c.fillStyle = shade(color, 0.7);
  c.beginPath();
  c.moveTo(6, 1.5);
  c.lineTo(3.4, 6);
  c.lineTo(6, 6);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.arc(8.6, 4.3, 0.8, 0, TAU);
  c.fill();
}

function drawGrass(scene: Phaser.Scene) {
  if (scene.textures.exists('grama')) return;
  const S = 256;
  const tex = scene.textures.createCanvas('grama', S, S);
  if (!tex) return;
  const c = tex.getContext();
  c.fillStyle = '#5a8f3e';
  c.fillRect(0, 0, S, S);
  const rnd = new Phaser.Math.RandomDataGenerator(['grama-v2']);
  // desenha algo repetido nas bordas para o ladrilho emendar sem costura
  const wrap = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) draw(dx, dy);
  };
  for (let i = 0; i < 18; i++) {
    const x = rnd.between(0, S);
    const y = rnd.between(0, S);
    const r = rnd.between(20, 55);
    const light = rnd.frac() < 0.5;
    wrap((dx, dy) => {
      const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, light ? 'rgba(160,200,90,0.25)' : 'rgba(30,70,30,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  const blades = ['#6fa64a', '#4c7d34', '#7fb556', '#3f6e2c'];
  c.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const x = rnd.between(0, S);
    const y = rnd.between(0, S);
    const h = rnd.between(3, 7);
    const lean = rnd.realInRange(-2, 2);
    c.strokeStyle = rnd.pick(blades);
    c.lineWidth = rnd.realInRange(0.8, 1.4);
    wrap((dx, dy) => {
      c.beginPath();
      c.moveTo(x + dx, y + dy);
      c.lineTo(x + dx + lean, y + dy - h);
      c.stroke();
    });
  }
  tex.refresh();
}

function drawDecor(scene: Phaser.Scene) {
  single(scene, 'deco-tuft', 20, 14, (c) => {
    const cols = ['#7fbf56', '#5c9a3e', '#9ad06a'];
    for (let k = 0; k < 7; k++) {
      const x = 4 + k * 2;
      c.beginPath();
      c.moveTo(x, 13);
      c.quadraticCurveTo(x + (k - 3) * 0.8, 7, x + (k - 3) * 1.6, 2 + (k % 2) * 3);
      c.strokeStyle = cols[k % 3];
      c.lineWidth = 1.4;
      c.stroke();
    }
  });
  single(scene, 'deco-flores', 24, 18, (c) => {
    const flowers: [number, number, string][] = [[5, 8, '#ffffff'], [13, 5, '#ffd84a'], [19, 10, '#ff9ad0']];
    for (const [x, y, col] of flowers) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, 17);
      c.strokeStyle = '#4c8a34';
      c.lineWidth = 1;
      c.stroke();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        paint(c, ell(c, x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.7, 1.7), col, 0.5, 'rgba(60,40,40,0.6)');
      }
      paint(c, ell(c, x, y, 1.2, 1.2), '#f0a020', 0);
    }
  });
  single(scene, 'deco-pedra', 22, 16, (c) => {
    groundShadow(c, 11, 13, 10, 2.5, 0.3);
    paint(c, () => {
      c.moveTo(2, 13);
      c.quadraticCurveTo(3, 4, 10, 3);
      c.quadraticCurveTo(19, 3, 20, 13);
      c.closePath();
    }, vgrad(c, 3, 13, '#c4c8cc', '#7a8088'), 1, '#3a3e44');
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.ellipse(8, 6.5, 3, 1.4, -0.3, 0, TAU);
    c.fill();
  });
  single(scene, 'deco-arbusto', 40, 32, (c) => {
    groundShadow(c, 20, 28, 17, 4, 0.35);
    const g = (x: number, y: number, r: number) => {
      const gr = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
      gr.addColorStop(0, '#8fd060');
      gr.addColorStop(1, '#2f6a28');
      paint(c, ell(c, x, y, r, r * 0.9), gr, 1.1, '#1a3a16');
    };
    g(11, 20, 8);
    g(29, 20, 8);
    g(20, 14, 10);
    c.fillStyle = '#e8404a';
    for (const [x, y] of [[15, 12], [25, 17], [9, 21]]) {
      c.beginPath();
      c.arc(x, y, 1.4, 0, TAU);
      c.fill();
    }
  });
  single(scene, 'deco-cogumelo', 16, 18, (c) => {
    groundShadow(c, 8, 16, 6, 1.8, 0.3);
    paint(c, () => rr(c, 5.5, 8, 5, 8, 2), '#f2e8d6', 0.9);
    paint(c, () => {
      c.moveTo(1, 9.5);
      c.quadraticCurveTo(1.5, 1, 8, 1);
      c.quadraticCurveTo(14.5, 1, 15, 9.5);
      c.closePath();
    }, vgrad(c, 1, 10, '#ff6a5a', '#b8282a'), 1);
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[5, 5, 1.3], [10, 4, 1.1], [12, 7.5, 0.9]]) {
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  });
}

// ------------------------------------------------------------------ montagem

export const DECOR_KEYS = ['deco-tuft', 'deco-flores', 'deco-pedra', 'deco-arbusto', 'deco-cogumelo'] as const;

export function createArt(scene: Phaser.Scene) {
  // heróis (e o Cavaleiro Negro, que usa o mesmo corpo)
  for (const [key, look] of Object.entries(HEROES)) {
    sheet(scene, key, 64, 80, HERO_FRAMES, (c, f) => drawHero(c, look, HERO_POSES[f]));
  }
  sheet(scene, 'en-gosma', 48, 44, MONSTER_FRAMES, (c, _f, i) => drawSlime(c, i));
  sheet(scene, 'en-morcego', 52, 44, MONSTER_FRAMES, (c, _f, i) => drawBat(c, i));
  sheet(scene, 'en-esqueleto', 48, 62, MONSTER_FRAMES, (c, _f, i) => drawSkeleton(c, i));
  sheet(scene, 'en-orc', 60, 66, MONSTER_FRAMES, (c, _f, i) => drawOrc(c, i));

  // itens
  single(scene, 'gem1', 12, 16, (c) => drawGem(c, '#3d8bff'));
  single(scene, 'gem2', 12, 16, (c) => drawGem(c, '#3bd16f'));
  single(scene, 'gem3', 12, 16, (c) => drawGem(c, '#ff4466'));
  single(scene, 'comida', 24, 18, (c) => {
    groundShadow(c, 12, 16, 10, 2, 0.3);
    paint(c, () => rr(c, 1, 7, 9, 4, 2), '#f4efe2', 0.9);
    paint(c, ell(c, 2, 6.5, 2.4, 2.4), '#f4efe2', 0.9);
    paint(c, ell(c, 2, 11.5, 2.4, 2.4), '#f4efe2', 0.9);
    paint(c, ell(c, 15, 9, 8, 6.5, -0.2), vgrad(c, 2, 16, '#d9773f', '#8a3a1a'), 1);
    c.fillStyle = 'rgba(255,230,190,0.7)';
    c.beginPath();
    c.ellipse(13, 6, 3.5, 1.6, -0.3, 0, TAU);
    c.fill();
  });
  single(scene, 'escudo', 24, 28, (c) => {
    paint(c, () => {
      c.moveTo(2, 2);
      c.lineTo(22, 2);
      c.quadraticCurveTo(22, 18, 12, 27);
      c.quadraticCurveTo(2, 18, 2, 2);
      c.closePath();
    }, vgrad(c, 2, 27, '#f2d27a', '#a87a20'), 1.2);
    paint(c, () => {
      c.moveTo(5, 4.5);
      c.lineTo(19, 4.5);
      c.quadraticCurveTo(19, 16.5, 12, 23.5);
      c.quadraticCurveTo(5, 16.5, 5, 4.5);
      c.closePath();
    }, vgrad(c, 4, 24, '#4f86e8', '#1f3f9a'), 0.8);
    paint(c, () => rr(c, 10.8, 6, 2.4, 14, 1), '#f4f4f4', 0.6);
    paint(c, () => rr(c, 7, 10, 10, 2.4, 1), '#f4f4f4', 0.6);
  });

  drawGrass(scene);
  drawDecor(scene);

  // animações
  const anims = scene.anims;
  const frames = (key: string, names: string[]) => names.map((frame) => ({ key, frame }));
  for (const key of ['hero-aprendiz', 'hero-guarda', 'hero-cavaleiro']) {
    if (anims.exists(`${key}-idle`)) continue;
    anims.create({ key: `${key}-idle`, frames: frames(key, ['idle0', 'idle1']), frameRate: 2.5, repeat: -1 });
    anims.create({ key: `${key}-walk`, frames: frames(key, ['walk0', 'walk1', 'walk2', 'walk3']), frameRate: 9, repeat: -1 });
  }
  const move: [string, string[], number][] = [
    ['en-gosma', MONSTER_FRAMES, 6],
    ['en-morcego', MONSTER_FRAMES, 12],
    ['en-esqueleto', MONSTER_FRAMES, 7],
    ['en-orc', MONSTER_FRAMES, 6],
    ['en-cavaleiro-negro', ['walk0', 'walk1', 'walk2', 'walk3'], 6],
  ];
  for (const [key, names, rate] of move) {
    if (!anims.exists(`${key}-move`)) anims.create({ key: `${key}-move`, frames: frames(key, names), frameRate: rate, repeat: -1 });
  }
}
