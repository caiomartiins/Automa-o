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
  /** Arma na mão (padrão: espada) */
  weapon?: 'sword' | 'staff' | 'bow';
  /** Cor do orbe do cajado */
  orb?: string;
  bowColor?: string;
  /** Chapéu de mago ou capuz de arqueiro */
  hat?: 'wizard' | 'hood';
  hatColor?: string;
  hatStar?: boolean;
  /** Túnica longa (magos) */
  robe?: boolean;
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

/** Cajado no referencial da arma (+y aponta para a ponta) */
function drawStaff(c: Ctx, orb: string, trim: string) {
  paint(c, () => rr(c, -1.4, -14, 2.8, 41, 1.3), vgrad(c, -14, 27, '#a87444', '#5a3a1e'), 0.9);
  paint(c, () => {
    c.moveTo(-3.5, 25);
    c.quadraticCurveTo(-5, 30, -2, 33);
    c.lineTo(0, 30);
    c.lineTo(2, 33);
    c.quadraticCurveTo(5, 30, 3.5, 25);
    c.closePath();
  }, trim, 0.8);
  c.save();
  c.shadowColor = orb;
  c.shadowBlur = 8;
  const g = c.createRadialGradient(-1, 30, 0.5, 0, 31, 4.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, shade(orb, 0.3));
  g.addColorStop(1, shade(orb, -0.2));
  paint(c, ell(c, 0, 31, 4.2, 4.2), g, 0.8);
  c.restore();
}

/** Arco no referencial da arma (+y ao longo do arco; -x é para a frente) */
function drawBow(c: Ctx, wood: string, drawn: boolean) {
  const pull = drawn ? 6 : 0;
  c.beginPath();
  c.moveTo(0, -13);
  c.lineTo(pull, 0);
  c.lineTo(0, 13);
  c.strokeStyle = 'rgba(240,235,220,0.9)';
  c.lineWidth = 0.7;
  c.stroke();
  c.beginPath();
  c.moveTo(0, -14);
  c.quadraticCurveTo(-9, 0, 0, 14);
  c.strokeStyle = OUT;
  c.lineWidth = 3.4;
  c.stroke();
  c.strokeStyle = wood;
  c.lineWidth = 2;
  c.stroke();
  if (drawn) {
    c.beginPath();
    c.moveTo(pull, 0);
    c.lineTo(-14, 0);
    c.strokeStyle = '#7a5530';
    c.lineWidth = 1.2;
    c.stroke();
    paint(c, () => {
      c.moveTo(-17, 0);
      c.lineTo(-13, -1.8);
      c.lineTo(-13, 1.8);
      c.closePath();
    }, '#d8dde4', 0.6);
  }
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

  // túnica longa (cobre as pernas, só as botas aparecem)
  if (L.robe) {
    paint(c, () => {
      c.moveTo(21, 50 + b);
      c.lineTo(43, 50 + b);
      c.quadraticCurveTo(46, 60, 48 + p.leg * 1.2, 69);
      c.lineTo(16 + p.leg * 1.2, 69);
      c.quadraticCurveTo(18, 60, 21, 50 + b);
      c.closePath();
    }, vgrad(c, 50, 69, shade(L.tunic, 0.05), shade(L.tunic, -0.4)));
    c.beginPath();
    c.moveTo(17 + p.leg * 1.2, 67);
    c.lineTo(47 + p.leg * 1.2, 67);
    c.strokeStyle = L.trim;
    c.lineWidth = 1.8;
    c.stroke();
  }

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
    // cabelo de trás (ou o capuz)
    if (L.hat === 'hood') {
      const hc = L.hatColor ?? '#3f6e3a';
      paint(c, ell(c, hx - 2.5, hy, 17, 16.5), vgrad(c, hy - 17, hy + 16, shade(hc, 0.15), shade(hc, -0.4)));
    } else {
      paint(c, ell(c, hx - 2, hy - 1.5, 15.5, 14.5), vgrad(c, hy - 16, hy + 12, shade(L.hair, 0.15), shade(L.hair, -0.35)));
    }
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

    if (L.hat === 'wizard') {
      const hc = L.hatColor ?? '#2f3f99';
      paint(c, ell(c, hx, hy - 7, 19.5, 4.8), vgrad(c, hy - 12, hy - 2, shade(hc, 0.1), shade(hc, -0.35)));
      paint(c, () => {
        c.moveTo(hx - 12.5, hy - 8.5);
        c.quadraticCurveTo(hx - 5, hy - 24, hx - 16, hy - 35);
        c.quadraticCurveTo(hx + 4, hy - 27, hx + 12.5, hy - 8.5);
        c.quadraticCurveTo(hx, hy - 5.5, hx - 12.5, hy - 8.5);
        c.closePath();
      }, vgrad(c, hy - 35, hy - 8, shade(hc, 0.3), shade(hc, -0.25)));
      paint(c, () => {
        c.moveTo(hx - 12, hy - 11);
        c.quadraticCurveTo(hx, hy - 8.5, hx + 12, hy - 11);
        c.lineTo(hx + 11.5, hy - 14);
        c.quadraticCurveTo(hx, hy - 11.5, hx - 11, hy - 14);
        c.closePath();
      }, '#e8c04a', 0.8);
      if (L.hatStar) {
        c.save();
        c.translate(hx - 4, hy - 21);
        c.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 1.5 : 3.6;
          const a = (k / 10) * TAU - Math.PI / 2;
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        c.fillStyle = '#ffe36a';
        c.fill();
        c.restore();
      }
    }
    if (L.hat === 'hood') {
      const hc = L.hatColor ?? '#3f6e3a';
      paint(c, () => {
        c.moveTo(hx - 16.5, hy + 9);
        c.quadraticCurveTo(hx - 19, hy - 19, hx, hy - 19);
        c.quadraticCurveTo(hx + 16, hy - 19, hx + 17, hy - 3);
        c.lineTo(hx + 13, hy - 6);
        c.quadraticCurveTo(hx + 1, hy - 14, hx - 10, hy - 5);
        c.quadraticCurveTo(hx - 12.5, hy + 2, hx - 11, hy + 9);
        c.closePath();
      }, vgrad(c, hy - 19, hy + 9, shade(hc, 0.3), shade(hc, -0.25)));
    }
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
  const weapon = L.weapon ?? 'sword';
  const af = p.atk ? -1.5 : -0.35 - p.arm * 0.35;
  const tw = weapon === 'bow' ? -Math.PI / 2 : weapon === 'staff' ? (p.atk ? -0.6 : -1.45) : p.atk ? -0.12 : -1.1;
  c.save();
  c.translate(39, 43 + b);
  c.rotate(af);
  paint(c, () => rr(c, -3, -1, 6, 9.5, 3), vgrad(c, 0, 9, shade(L.armor ?? L.tunic, 0.2), shade(L.armor ?? L.tunic, -0.15)));
  c.save();
  c.translate(0, 11);
  c.rotate(tw - Math.PI / 2 - af);
  if (weapon === 'staff') drawStaff(c, L.orb ?? '#ff9a3a', L.trim);
  else if (weapon === 'bow') drawBow(c, L.bowColor ?? '#9a6a3a', !!p.atk);
  else {
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
  }
  c.restore();
  paint(c, ell(c, 0, 11, 3, 3), L.skin);
  c.restore();

  if (p.atk && weapon === 'sword') {
    // rastro de movimento do golpe
    c.beginPath();
    c.arc(39, 50 + b, 22, -1.2, 0.2);
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    c.stroke();
  }
}

/** Visual dos personagens desenhados por código (hoje só o Cavaleiro Negro; os heróis usam sprites) */
const HEROES: Record<string, HeroLook> = {
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

function drawGhost(c: Ctx, i: number) {
  const bob = [0, -1.5, -2.5, -1.5][i];
  const ph = (i / 4) * TAU;
  groundShadow(c, 22, 47, 9, 2.2, 0.18);
  const top = 6 + bob;
  const bottom = 40 + bob;
  const g = c.createRadialGradient(17, top + 10, 1, 22, top + 16, 22);
  g.addColorStop(0, 'rgba(255,255,255,0.97)');
  g.addColorStop(1, 'rgba(190,175,235,0.9)');
  paint(c, () => {
    c.moveTo(8, bottom - 4);
    c.quadraticCurveTo(6, top, 22, top);
    c.quadraticCurveTo(38, top, 36, bottom - 4);
    for (let k = 0; k <= 4; k++) {
      const x = 36 - k * 7;
      c.quadraticCurveTo(x - 3.5, bottom + 3 + Math.sin(ph + k) * 2, x - 7, bottom - 3);
    }
    c.closePath();
  }, g, 1.1, '#4a3a7a');
  paint(c, ell(c, 7.5, top + 20, 3, 4.5, 0.6), 'rgba(235,230,255,0.95)', 1, '#4a3a7a');
  c.fillStyle = '#2a1e3a';
  c.beginPath();
  c.ellipse(26, top + 13, 2.6, 3.8, 0, 0, TAU);
  c.ellipse(18, top + 13, 2.2, 3.4, 0, 0, TAU);
  c.ellipse(22.5, top + 21, 2.2, 2.8, 0, 0, TAU);
  c.fill();
  c.fillStyle = 'rgba(255,120,180,0.35)';
  c.beginPath();
  c.ellipse(29, top + 18, 2.4, 1.3, 0, 0, TAU);
  c.fill();
}

function drawMushroomMonster(c: Ctx, i: number) {
  const leg = [1, 0, -1, 0][i];
  const b = [0, -1, 0, -1][i];
  groundShadow(c, 22, 47, 13, 3.4, 0.35);
  for (const [x, sgn] of [[17, -1], [27, 1]] as const) {
    paint(c, ell(c, x + leg * 2.5 * sgn, 45, 4, 2.6), '#8a5a3a', 1, '#3a2418');
  }
  paint(c, () => rr(c, 13, 25 + b, 18, 19, 7), vgrad(c, 25, 44, '#fbf3e2', '#d6c7a8'), 1.1, '#5a4030');
  // rosto zangado no caule
  eye(c, 26, 32 + b, 2, 2.8, '#3a2418');
  eye(c, 19, 32 + b, 1.8, 2.6, '#3a2418');
  c.beginPath();
  c.moveTo(16.5, 27.5 + b);
  c.lineTo(21, 29.5 + b);
  c.moveTo(29, 27.5 + b);
  c.lineTo(24.5, 29.5 + b);
  c.strokeStyle = '#3a2418';
  c.lineWidth = 1.3;
  c.stroke();
  c.beginPath();
  c.moveTo(20, 38.5 + b);
  c.quadraticCurveTo(22.5, 37 + b, 25, 38.5 + b);
  c.stroke();
  // chapéu
  paint(c, () => {
    c.moveTo(2, 25 + b);
    c.quadraticCurveTo(3, 4 + b, 22, 4 + b);
    c.quadraticCurveTo(41, 4 + b, 42, 25 + b);
    c.quadraticCurveTo(22, 30 + b, 2, 25 + b);
    c.closePath();
  }, vgrad(c, 4, 28, '#ff6a5a', '#a82024'), 1.2, '#4a1012');
  c.fillStyle = '#fff6ea';
  for (const [x, y, r] of [[12, 13, 3], [24, 9, 2.4], [32, 17, 2.8], [19, 20, 1.8]]) {
    c.beginPath();
    c.arc(x, y + b, r, 0, TAU);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(10, 9 + b, 4, 1.8, -0.5, 0, TAU);
  c.fill();
}

function drawProjectiles(scene: Phaser.Scene) {
  single(scene, 'proj-fogo', 28, 20, (c) => {
    // apontando para a direita, com cauda de chamas
    const tail = c.createLinearGradient(0, 10, 18, 10);
    tail.addColorStop(0, 'rgba(255,80,20,0)');
    tail.addColorStop(1, 'rgba(255,140,40,0.9)');
    c.fillStyle = tail;
    c.beginPath();
    c.moveTo(1, 10);
    c.quadraticCurveTo(10, 2, 19, 4.5);
    c.lineTo(19, 15.5);
    c.quadraticCurveTo(10, 18, 1, 10);
    c.fill();
    c.save();
    c.shadowColor = '#ff7a20';
    c.shadowBlur = 6;
    const g = c.createRadialGradient(20, 9, 0.5, 19, 10, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#ffe36a');
    g.addColorStop(1, '#ff5a1a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(19, 10, 6.5, 0, TAU);
    c.fill();
    c.restore();
  });
  single(scene, 'proj-flecha', 30, 8, (c) => {
    c.beginPath();
    c.moveTo(3, 4);
    c.lineTo(25, 4);
    c.strokeStyle = OUT;
    c.lineWidth = 2.4;
    c.stroke();
    c.strokeStyle = '#a8743e';
    c.lineWidth = 1.2;
    c.stroke();
    paint(c, () => {
      c.moveTo(29.5, 4);
      c.lineTo(23, 0.8);
      c.lineTo(23, 7.2);
      c.closePath();
    }, '#e8edf2', 0.8);
    paint(c, () => {
      c.moveTo(1, 0.8);
      c.lineTo(7, 4);
      c.lineTo(1, 7.2);
      c.lineTo(4, 4);
      c.closePath();
    }, '#f2f2f2', 0.7);
  });
  single(scene, 'proj-livro', 26, 20, (c) => {
    paint(c, () => rr(c, 2, 3, 22, 15, 2), vgrad(c, 3, 18, '#9a5a2e', '#5a2e14'), 1.1);
    paint(c, () => rr(c, 4, 4.5, 18, 10, 1), '#f4ecd8', 0.6);
    c.strokeStyle = '#b8a890';
    c.lineWidth = 0.6;
    for (const y of [7, 9.5, 12]) {
      c.beginPath();
      c.moveTo(6, y);
      c.lineTo(20, y);
      c.stroke();
    }
    paint(c, () => rr(c, 2, 3, 4, 15, 1.5), '#7a3e1e', 0.8);
    paint(c, ell(c, 4, 10.5, 1.2, 1.2), '#e0b43a', 0);
  });
  single(scene, 'fx-orbe', 40, 40, (c) => {
    c.save();
    c.shadowColor = '#b040ff';
    c.shadowBlur = 8;
    const g = c.createRadialGradient(17, 17, 1, 20, 20, 17);
    g.addColorStop(0, '#1a0a22');
    g.addColorStop(0.55, '#3a1450');
    g.addColorStop(1, '#9a4ad0');
    paint(c, ell(c, 20, 20, 15, 15), g, 1.2, '#12061a');
    c.restore();
    c.strokeStyle = 'rgba(210,160,255,0.7)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(20, 20, 10, -0.5, 1.8);
    c.stroke();
  });
  single(scene, 'fx-geiser', 70, 80, (c) => {
    const spikes: [number, number, number][] = [[14, 46, 7], [26, 70, 9], [37, 78, 10], [48, 62, 8], [58, 40, 6], [8, 28, 5], [65, 26, 5]];
    for (const [x, h, w] of spikes) {
      paint(c, () => {
        c.moveTo(x - w, 80);
        c.lineTo(x + w * 0.15, 80 - h);
        c.lineTo(x + w, 80);
        c.closePath();
      }, vgrad(c, 80 - h, 80, '#c8a0e8', '#1e0a2a'), 1, '#0c0410');
    }
  });
  single(scene, 'proj-gelo', 30, 14, (c) => {
    // lança de gelo apontando para a direita
    c.save();
    c.shadowColor = '#7ad8ff';
    c.shadowBlur = 5;
    paint(c, () => {
      c.moveTo(29, 7);
      c.lineTo(17, 1.5);
      c.lineTo(3, 5);
      c.lineTo(0.5, 7);
      c.lineTo(3, 9);
      c.lineTo(17, 12.5);
      c.closePath();
    }, vgrad(c, 1, 13, '#f4fdff', '#5ab8f0'), 1, '#1a5a8a');
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(5, 6.2);
    c.lineTo(25, 6.6);
    c.stroke();
  });
  single(scene, 'proj-alma', 24, 24, (c) => {
    // esfera espiritual azul-clara brilhante
    c.save();
    c.shadowColor = '#b8c0ff';
    c.shadowBlur = 8;
    const g = c.createRadialGradient(11, 11, 0.5, 12, 12, 9);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#d8dcff');
    g.addColorStop(1, 'rgba(120,130,255,0.15)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(12, 12, 9, 0, TAU);
    c.fill();
    c.restore();
  });
  single(scene, 'fx-chama', 40, 56, (c) => {
    // chama da Parede de Fogo (base embaixo)
    c.save();
    c.shadowColor = '#ff6a10';
    c.shadowBlur = 8;
    const outer = c.createLinearGradient(0, 4, 0, 54);
    outer.addColorStop(0, 'rgba(255,120,30,0.2)');
    outer.addColorStop(0.5, '#ff7a1a');
    outer.addColorStop(1, '#c82a0a');
    c.fillStyle = outer;
    c.beginPath();
    c.moveTo(20, 2);
    c.quadraticCurveTo(36, 22, 34, 40);
    c.quadraticCurveTo(32, 54, 20, 54);
    c.quadraticCurveTo(8, 54, 6, 40);
    c.quadraticCurveTo(5, 26, 14, 14);
    c.quadraticCurveTo(16, 24, 20, 2);
    c.fill();
    c.restore();
    const inner = c.createLinearGradient(0, 22, 0, 52);
    inner.addColorStop(0, 'rgba(255,240,150,0.3)');
    inner.addColorStop(1, '#fff2a0');
    c.fillStyle = inner;
    c.beginPath();
    c.moveTo(20, 20);
    c.quadraticCurveTo(28, 34, 27, 44);
    c.quadraticCurveTo(25, 52, 20, 52);
    c.quadraticCurveTo(14, 52, 13, 44);
    c.quadraticCurveTo(13, 32, 20, 20);
    c.fill();
  });
  single(scene, 'proj-escudo', 26, 30, (c) => {
    // escudo do Paladino: branco, pontudo, com borda e cruz douradas
    const shape = () => {
      c.moveTo(13, 1.5);
      c.quadraticCurveTo(23, 3, 24, 6);
      c.quadraticCurveTo(24.5, 19, 13, 28.5);
      c.quadraticCurveTo(1.5, 19, 2, 6);
      c.quadraticCurveTo(3, 3, 13, 1.5);
      c.closePath();
    };
    c.save();
    c.shadowColor = '#ffe08a';
    c.shadowBlur = 5;
    paint(c, shape, vgrad(c, 2, 28, '#f0c850', '#a87818'), 1.2, '#4a3008');
    c.restore();
    c.save();
    c.translate(13, 15);
    c.scale(0.78, 0.8);
    c.translate(-13, -15);
    paint(c, shape, vgrad(c, 2, 28, '#ffffff', '#d8dde8'), 0.6, '#8a7a5a');
    c.restore();
    c.fillStyle = '#d8a828';
    c.fillRect(11.6, 7, 2.8, 15);
    c.fillRect(7.5, 11.5, 11, 2.8);
  });
  single(scene, 'fx-armadilha', 40, 28, (c) => {
    // armadilha no chão: placa de metal com pavio aceso
    paint(c, ell(c, 20, 16, 17, 9), vgrad(c, 7, 25, '#8a8a90', '#3a3a40'), 1.2, '#16161a');
    paint(c, ell(c, 20, 15, 10, 5), vgrad(c, 10, 20, '#c8a050', '#6a4a20'), 0.8, '#2a1a08');
    c.fillStyle = '#ff5a1a';
    c.beginPath();
    c.arc(20, 14, 2.4, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,220,120,0.8)';
    c.beginPath();
    c.arc(20, 13.5, 1.1, 0, TAU);
    c.fill();
  });
  single(scene, 'fx-meteoro', 36, 60, (c) => {
    // caindo de cima para baixo, com rastro de fogo
    const trail = c.createLinearGradient(0, 0, 0, 44);
    trail.addColorStop(0, 'rgba(255,90,20,0)');
    trail.addColorStop(1, 'rgba(255,160,40,0.95)');
    c.fillStyle = trail;
    c.beginPath();
    c.moveTo(12, 0);
    c.lineTo(24, 0);
    c.lineTo(29, 44);
    c.lineTo(7, 44);
    c.closePath();
    c.fill();
    c.save();
    c.shadowColor = '#ff6a20';
    c.shadowBlur = 8;
    paint(c, ell(c, 18, 46, 11, 11), vgrad(c, 35, 57, '#8a5a40', '#3a2018'), 1.2);
    c.restore();
    c.fillStyle = '#ffb040';
    c.beginPath();
    c.arc(14, 48, 2.2, 0, TAU);
    c.arc(22, 43, 1.6, 0, TAU);
    c.fill();
  });
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

// ------------------------------------------------------------------ itens de RPG

function drawItems(scene: Phaser.Scene) {
  const potion = (key: string, liquid: string) =>
    single(scene, key, 16, 20, (c) => {
      groundShadow(c, 8, 18.5, 6, 1.6, 0.3);
      paint(c, () => {
        c.moveTo(6, 2);
        c.lineTo(10, 2);
        c.lineTo(10, 6);
        c.quadraticCurveTo(15, 9, 14.5, 13.5);
        c.quadraticCurveTo(14, 18.5, 8, 18.5);
        c.quadraticCurveTo(2, 18.5, 1.5, 13.5);
        c.quadraticCurveTo(1, 9, 6, 6);
        c.closePath();
      }, vgrad(c, 6, 18, shade(liquid, 0.25), shade(liquid, -0.35)), 1);
      paint(c, () => rr(c, 5.5, 0.5, 5, 3, 1), '#9a6a3a', 0.8);
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.beginPath();
      c.ellipse(5.5, 11, 1.3, 3, 0.3, 0, TAU);
      c.fill();
    });
  potion('item-pocao1', '#e8403a');
  potion('item-pocao2', '#ff9a2a');
  potion('item-pocao3', '#f4f0ff');

  single(scene, 'item-asa', 22, 18, (c) => {
    groundShadow(c, 11, 16.5, 8, 1.6, 0.3);
    paint(c, () => {
      c.moveTo(3, 13);
      c.quadraticCurveTo(2, 3, 13, 1.5);
      c.quadraticCurveTo(21, 1, 20, 5);
      c.quadraticCurveTo(15, 5, 14, 8);
      c.quadraticCurveTo(10, 9, 9, 12);
      c.quadraticCurveTo(6, 13, 3, 13);
      c.closePath();
    }, vgrad(c, 1, 13, '#ffffff', '#9fd0ff'), 1, '#3a5a8a');
    c.strokeStyle = 'rgba(58,90,138,0.6)';
    c.lineWidth = 0.7;
    for (const t of [0.35, 0.55, 0.75]) {
      c.beginPath();
      c.moveTo(4, 12);
      c.lineTo(4 + 14 * t, 2 + 6 * t);
      c.stroke();
    }
  });

  single(scene, 'item-pena', 14, 22, (c) => {
    groundShadow(c, 7, 20.5, 5, 1.4, 0.3);
    paint(c, () => {
      c.moveTo(7, 1);
      c.quadraticCurveTo(13.5, 7, 8, 17);
      c.quadraticCurveTo(1, 9, 7, 1);
      c.closePath();
    }, vgrad(c, 1, 17, '#fff6c0', '#e0a030'), 1, '#7a5010');
    c.strokeStyle = '#7a5010';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(7, 3);
    c.lineTo(7.5, 21);
    c.stroke();
  });

  single(scene, 'item-zeny', 14, 14, (c) => {
    groundShadow(c, 7, 12.5, 5, 1.3, 0.3);
    paint(c, ell(c, 7, 6.5, 5.5, 5.5), vgrad(c, 1, 12, '#fff2a0', '#c89020'), 1, '#6a4a08');
    paint(c, ell(c, 7, 6.5, 3.2, 3.2), '#f0c040', 0.6, '#8a6010');
    c.fillStyle = '#8a6010';
    c.font = 'bold 5px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Z', 7, 6.8);
  });

  single(scene, 'item-carta', 16, 20, (c) => {
    groundShadow(c, 8, 19, 6, 1.4, 0.3);
    c.save();
    c.shadowColor = '#ffe36a';
    c.shadowBlur = 5;
    paint(c, () => rr(c, 1.5, 1, 13, 17, 2), vgrad(c, 1, 18, '#fff8e0', '#e8d8a8'), 1, '#6a5020');
    c.restore();
    paint(c, () => rr(c, 3.5, 3, 9, 8, 1), vgrad(c, 3, 11, '#9ad0ff', '#4a7ac0'), 0.6, '#3a4a6a');
    c.fillStyle = '#8a6a3a';
    c.fillRect(4, 13, 8, 1);
    c.fillRect(4, 15, 6, 1);
  });

  single(scene, 'item-ovo', 14, 18, (c) => {
    groundShadow(c, 7, 16.5, 5.5, 1.4, 0.3);
    paint(c, ell(c, 7, 9, 5.5, 7), vgrad(c, 2, 16, '#fffaf0', '#e0d0b0'), 1, '#6a5a40');
    c.fillStyle = '#f08ab0';
    for (const [x, y, r] of [[5, 7, 1.2], [9, 10, 1.4], [6, 12.5, 1]]) {
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  });
}

// ------------------------------------------------------------------ chãos e decoração dos mapas

/** Chão ladrilhável com manchas e pontos, em uma paleta */
function drawGround(scene: Phaser.Scene, key: string, base: string, blotches: string[], dots: string[], extra?: (c: Ctx, rnd: Phaser.Math.RandomDataGenerator, wrap: (f: (dx: number, dy: number) => void) => void) => void) {
  if (scene.textures.exists(key)) return;
  const S = 256;
  const tex = scene.textures.createCanvas(key, S, S);
  if (!tex) return;
  const c = tex.getContext();
  c.fillStyle = base;
  c.fillRect(0, 0, S, S);
  const rnd = new Phaser.Math.RandomDataGenerator([key]);
  const wrap = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) draw(dx, dy);
  };
  for (let i = 0; i < 16; i++) {
    const x = rnd.between(0, S);
    const y = rnd.between(0, S);
    const r = rnd.between(24, 60);
    const col = rnd.pick(blotches);
    wrap((dx, dy) => {
      const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  for (let i = 0; i < 380; i++) {
    const x = rnd.between(0, S);
    const y = rnd.between(0, S);
    const sz = rnd.realInRange(0.8, 2.2);
    c.fillStyle = rnd.pick(dots);
    wrap((dx, dy) => c.fillRect(x + dx, y + dy, sz, sz));
  }
  extra?.(c, rnd, wrap);
  tex.refresh();
}

function drawMapGrounds(scene: Phaser.Scene) {
  drawGround(scene, 'chao-areia', '#d8b870', ['rgba(240,210,140,0.35)', 'rgba(170,130,70,0.25)'], ['#c8a058', '#e8cc88', '#b08a48'], (c, rnd, wrap) => {
    // ondulações de duna
    c.strokeStyle = 'rgba(160,120,60,0.25)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = rnd.between(0, 256);
      const y = rnd.between(0, 256);
      wrap((dx, dy) => {
        c.beginPath();
        c.moveTo(x + dx - 18, y + dy);
        c.quadraticCurveTo(x + dx, y + dy - 6, x + dx + 18, y + dy);
        c.stroke();
      });
    }
  });
  drawGround(scene, 'chao-caverna', '#3a3640', ['rgba(80,70,100,0.35)', 'rgba(20,18,26,0.4)'], ['#4a4650', '#2a2630', '#5a5468'], (c, rnd, wrap) => {
    // rachaduras
    c.strokeStyle = 'rgba(15,12,20,0.6)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) {
      const x = rnd.between(0, 256);
      const y = rnd.between(0, 256);
      const pts = [[0, 0], [rnd.between(-14, 14), rnd.between(6, 16)], [rnd.between(-20, 20), rnd.between(18, 30)]];
      wrap((dx, dy) => {
        c.beginPath();
        pts.forEach(([px, py], k) => (k ? c.lineTo(x + dx + px, y + dy + py) : c.moveTo(x + dx + px, y + dy + py)));
        c.stroke();
      });
    }
  });
  drawGround(scene, 'chao-ruinas', '#6a7a5a', ['rgba(90,110,70,0.35)', 'rgba(60,60,55,0.3)'], ['#5a6a4a', '#7a8a6a', '#4a5a3a'], (c) => {
    // lajotas de pedra antigas
    for (let gy = 0; gy < 256; gy += 64) {
      for (let gx = 0; gx < 256; gx += 64) {
        const off = (gy / 64) % 2 ? 32 : 0;
        c.fillStyle = 'rgba(150,150,135,0.32)';
        c.fillRect(gx + off + 3, gy + 3, 58, 58);
        c.strokeStyle = 'rgba(40,40,35,0.35)';
        c.lineWidth = 1.5;
        c.strokeRect(gx + off + 3, gy + 3, 58, 58);
      }
    }
  });

  single(scene, 'deco-cacto', 22, 34, (c) => {
    groundShadow(c, 11, 32, 9, 2.2, 0.35);
    const g = vgrad(c, 2, 32, '#6ab05a', '#2e6a2a');
    paint(c, () => rr(c, 7.5, 2, 7, 30, 3.5), g, 1.1, '#1a3a16');
    paint(c, () => rr(c, 1.5, 11, 5, 11, 2.5), g, 1, '#1a3a16');
    paint(c, () => rr(c, 15.5, 8, 5, 12, 2.5), g, 1, '#1a3a16');
    paint(c, ell(c, 11, 2.5, 2.2, 2.2), '#ff7ab0', 0.6, '#7a2a4a');
  });
  single(scene, 'deco-ossos', 22, 14, (c) => {
    groundShadow(c, 11, 12.5, 9, 1.6, 0.25);
    for (const [x0, y0, x1, y1] of [[3, 9, 18, 5], [5, 4, 17, 11]]) {
      bone(c, x0, y0, x1, y1, 1.8, '#efe8d6');
      for (const [x, y] of [[x0, y0], [x1, y1]]) paint(c, ell(c, x, y, 1.8, 1.8), '#efe8d6', 0.8, '#3a2e22');
    }
  });
  single(scene, 'deco-cristal', 20, 26, (c) => {
    groundShadow(c, 10, 24, 8, 2, 0.35);
    c.save();
    c.shadowColor = '#b080ff';
    c.shadowBlur = 6;
    for (const [x, h, w, col] of [[6, 16, 4, '#9a7aff'], [11, 22, 5, '#c8a8ff'], [15, 12, 3.5, '#8a6ae0']] as const) {
      paint(c, () => {
        c.moveTo(x - w, 24);
        c.lineTo(x - w * 0.6, 24 - h * 0.8);
        c.lineTo(x, 24 - h);
        c.lineTo(x + w * 0.6, 24 - h * 0.8);
        c.lineTo(x + w, 24);
        c.closePath();
      }, vgrad(c, 24 - h, 24, '#ffffff', col), 0.9, '#3a2a6a');
    }
    c.restore();
  });
  single(scene, 'deco-coluna', 22, 44, (c) => {
    groundShadow(c, 11, 42, 10, 2.4, 0.35);
    const g = (() => {
      const gr = c.createLinearGradient(4, 0, 18, 0);
      gr.addColorStop(0, '#d8d4c8');
      gr.addColorStop(1, '#8a867a');
      return gr;
    })();
    paint(c, () => rr(c, 2, 36, 18, 6, 1.5), '#a8a498', 1, '#3a3a34');
    paint(c, () => {
      c.moveTo(5, 36);
      c.lineTo(5, 12);
      c.lineTo(9, 8);
      c.lineTo(12, 13);
      c.lineTo(17, 10);
      c.lineTo(17, 36);
      c.closePath();
    }, g, 1, '#3a3a34');
    c.strokeStyle = 'rgba(60,60,52,0.5)';
    c.lineWidth = 0.8;
    for (const x of [8.5, 11.5, 14.5]) {
      c.beginPath();
      c.moveTo(x, 14);
      c.lineTo(x, 35);
      c.stroke();
    }
    c.fillStyle = 'rgba(90,130,70,0.7)';
    c.beginPath();
    c.ellipse(7, 30, 3, 2, 0, 0, TAU);
    c.fill();
  });
}

// ------------------------------------------------------------------ ícones de equipamento
// Desenhados em tons claros com contorno escuro: a cor de cada item é aplicada com tint.

function drawEquipIcons(scene: Phaser.Scene) {
  const L = '#f4f4f4';
  const M = '#cfcfcf';
  const D = '#9a9a9a';
  const icon = (key: string, draw: (c: Ctx) => void) => single(scene, key, 24, 24, draw);
  icon('eq-chapeu', (c) => {
    paint(c, ell(c, 12, 17, 11, 3.5), M, 1);
    paint(c, () => { c.moveTo(5, 17); c.quadraticCurveTo(6, 5, 12, 4); c.quadraticCurveTo(18, 5, 19, 17); c.closePath(); }, vgrad(c, 4, 17, L, M), 1);
    paint(c, () => rr(c, 5.5, 13, 13, 3, 1), D, 0.8);
  });
  icon('eq-elmo', (c) => {
    paint(c, () => { c.moveTo(4, 20); c.quadraticCurveTo(3, 4, 12, 3); c.quadraticCurveTo(21, 4, 20, 20); c.closePath(); }, vgrad(c, 3, 20, L, D), 1);
    paint(c, () => rr(c, 7, 11, 10, 3, 1), '#3a3a3a', 0.6);
    paint(c, () => rr(c, 11, 3, 2, 8, 1), M, 0.6);
  });
  icon('eq-tiara', (c) => {
    paint(c, () => { c.moveTo(3, 17); c.quadraticCurveTo(12, 11, 21, 17); c.lineTo(20, 19); c.quadraticCurveTo(12, 14, 4, 19); c.closePath(); }, M, 1);
    paint(c, () => { c.moveTo(9, 14); c.lineTo(12, 5); c.lineTo(15, 14); c.closePath(); }, L, 1);
    paint(c, ell(c, 12, 10, 1.8, 1.8), '#ffffff', 0.6);
  });
  icon('eq-chifres', (c) => {
    paint(c, () => { c.moveTo(5, 20); c.quadraticCurveTo(1, 8, 8, 3); c.quadraticCurveTo(6, 10, 10, 18); c.closePath(); }, vgrad(c, 3, 20, L, D), 1);
    paint(c, () => { c.moveTo(19, 20); c.quadraticCurveTo(23, 8, 16, 3); c.quadraticCurveTo(18, 10, 14, 18); c.closePath(); }, vgrad(c, 3, 20, L, D), 1);
  });
  icon('eq-armadura', (c) => {
    paint(c, () => { c.moveTo(6, 4); c.lineTo(18, 4); c.lineTo(22, 9); c.lineTo(18, 11); c.lineTo(18, 21); c.lineTo(6, 21); c.lineTo(6, 11); c.lineTo(2, 9); c.closePath(); }, vgrad(c, 4, 21, L, M), 1);
    paint(c, () => { c.moveTo(9, 4); c.quadraticCurveTo(12, 8, 15, 4); }, 'rgba(0,0,0,0)', 1);
    c.strokeStyle = D; c.lineWidth = 1; c.beginPath(); c.moveTo(12, 8); c.lineTo(12, 20); c.stroke();
  });
  icon('eq-manto', (c) => {
    paint(c, () => { c.moveTo(8, 3); c.lineTo(16, 3); c.lineTo(21, 21); c.lineTo(3, 21); c.closePath(); }, vgrad(c, 3, 21, L, M), 1);
    paint(c, () => rr(c, 9, 3, 6, 4, 2), D, 0.8);
  });
  icon('eq-espada', (c) => {
    paint(c, () => { c.moveTo(19, 2); c.lineTo(22, 5); c.lineTo(9, 18); c.lineTo(6, 15); c.closePath(); }, vgrad(c, 2, 18, '#ffffff', M), 1);
    paint(c, () => { c.moveTo(4, 13); c.lineTo(11, 20); c.lineTo(9.5, 21.5); c.lineTo(2.5, 14.5); c.closePath(); }, D, 1);
    paint(c, () => { c.moveTo(5, 18); c.lineTo(2, 21); c.lineTo(3, 22); c.lineTo(6, 19); c.closePath(); }, '#7a5a3a', 0.8);
  });
  icon('eq-cajado', (c) => {
    c.strokeStyle = '#2a1c14'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(4, 22); c.lineTo(17, 7); c.stroke();
    c.strokeStyle = '#b08050'; c.lineWidth = 2; c.stroke();
    paint(c, ell(c, 18.5, 5.5, 4.2, 4.2), vgrad(c, 1, 10, '#ffffff', M), 1);
  });
  icon('eq-arco', (c) => {
    c.beginPath(); c.moveTo(6, 2); c.lineTo(6, 22); c.strokeStyle = '#555'; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(6, 2); c.quadraticCurveTo(22, 12, 6, 22); c.strokeStyle = '#2a1c14'; c.lineWidth = 3.4; c.stroke();
    c.strokeStyle = L; c.lineWidth = 2; c.stroke();
  });
  icon('eq-escudo', (c) => {
    paint(c, () => { c.moveTo(4, 4); c.lineTo(20, 4); c.quadraticCurveTo(20, 16, 12, 22); c.quadraticCurveTo(4, 16, 4, 4); c.closePath(); }, vgrad(c, 4, 22, L, M), 1);
    paint(c, () => { c.moveTo(7, 7); c.lineTo(17, 7); c.quadraticCurveTo(17, 15, 12, 19); c.quadraticCurveTo(7, 15, 7, 7); c.closePath(); }, D, 0.8);
  });
  icon('eq-livro', (c) => {
    paint(c, () => rr(c, 4, 3, 16, 19, 2), vgrad(c, 3, 22, L, M), 1);
    paint(c, () => rr(c, 4, 3, 4, 19, 1.5), D, 0.8);
    paint(c, ell(c, 14, 12, 3, 3), '#ffffff', 0.8);
  });
  icon('eq-aljava', (c) => {
    paint(c, () => rr(c, 7, 7, 10, 15, 3), vgrad(c, 7, 22, L, M), 1);
    for (const x of [9, 12, 15]) {
      c.strokeStyle = '#2a1c14'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, 8); c.lineTo(x - 1, 2); c.stroke();
      paint(c, () => { c.moveTo(x - 2.5, 3.5); c.lineTo(x - 1, 1); c.lineTo(x + 0.5, 3.5); c.closePath(); }, '#ffffff', 0.6);
    }
  });
  icon('eq-capa', (c) => {
    paint(c, () => { c.moveTo(7, 3); c.lineTo(17, 3); c.quadraticCurveTo(22, 14, 20, 22); c.lineTo(4, 22); c.quadraticCurveTo(2, 14, 7, 3); c.closePath(); }, vgrad(c, 3, 22, L, D), 1);
    paint(c, ell(c, 12, 4, 3, 1.6), M, 0.8);
  });
  icon('eq-bota', (c) => {
    paint(c, () => { c.moveTo(7, 3); c.lineTo(14, 3); c.lineTo(14, 14); c.lineTo(21, 17); c.lineTo(21, 21); c.lineTo(6, 21); c.closePath(); }, vgrad(c, 3, 21, L, M), 1);
    paint(c, () => rr(c, 6, 19, 15, 2.5, 1), D, 0.8);
  });
  icon('eq-anel', (c) => {
    c.beginPath(); c.ellipse(12, 15, 7, 6, 0, 0, TAU); c.strokeStyle = '#2a1c14'; c.lineWidth = 4; c.stroke();
    c.strokeStyle = M; c.lineWidth = 2.4; c.stroke();
    paint(c, () => { c.moveTo(8, 9); c.lineTo(12, 3); c.lineTo(16, 9); c.lineTo(12, 11); c.closePath(); }, '#ffffff', 1);
  });
  icon('eq-colar', (c) => {
    c.beginPath(); c.moveTo(4, 3); c.quadraticCurveTo(12, 16, 20, 3); c.strokeStyle = '#2a1c14'; c.lineWidth = 2.4; c.stroke();
    c.strokeStyle = M; c.lineWidth = 1.2; c.stroke();
    paint(c, () => { c.moveTo(12, 11); c.lineTo(17, 16); c.lineTo(12, 22); c.lineTo(7, 16); c.closePath(); }, vgrad(c, 11, 22, '#ffffff', M), 1);
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
  sheet(scene, 'en-fantasma', 44, 50, MONSTER_FRAMES, (c, _f, i) => drawGhost(c, i));
  sheet(scene, 'en-cogumelo', 44, 50, MONSTER_FRAMES, (c, _f, i) => drawMushroomMonster(c, i));
  drawProjectiles(scene);

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
  drawItems(scene);
  drawMapGrounds(scene);
  drawEquipIcons(scene);

  // animações
  const anims = scene.anims;
  const frames = (key: string, names: string[]) => names.map((frame) => ({ key, frame }));
  for (const key of Object.keys(HEROES).filter((k) => k.startsWith('hero-'))) {
    if (anims.exists(`${key}-idle`)) continue;
    anims.create({ key: `${key}-idle`, frames: frames(key, ['idle0', 'idle1']), frameRate: 2.5, repeat: -1 });
    anims.create({ key: `${key}-walk`, frames: frames(key, ['walk0', 'walk1', 'walk2', 'walk3']), frameRate: 9, repeat: -1 });
  }
  const move: [string, string[], number][] = [
    ['en-gosma', MONSTER_FRAMES, 6],
    ['en-morcego', MONSTER_FRAMES, 12],
    ['en-esqueleto', MONSTER_FRAMES, 7],
    ['en-orc', MONSTER_FRAMES, 6],
    ['en-fantasma', MONSTER_FRAMES, 6],
    ['en-cogumelo', MONSTER_FRAMES, 8],
    ['en-cavaleiro-negro', ['walk0', 'walk1', 'walk2', 'walk3'], 6],
  ];
  for (const [key, names, rate] of move) {
    if (!anims.exists(`${key}-move`)) anims.create({ key: `${key}-move`, frames: frames(key, names), frameRate: rate, repeat: -1 });
  }
}
