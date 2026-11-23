import Phaser from 'phaser';

export const DEPTH_FX = 100000;

/**
 * Efeitos visuais com reaproveitamento de objetos: números, rótulos, faíscas e explosões
 * voltam para uma reserva quando terminam, em vez de criar e destruir objetos (e texturas
 * de texto) a cada golpe. O visual é o mesmo, com menos trabalho por quadro.
 */

/** Texturas simples geradas por código (projéteis, brilhos, sombra) */
export function makeTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string, w: number, h: number, draw: () => void) => {
    if (scene.textures.exists(key)) return;
    g.clear(); draw(); g.generateTexture(key, w, h);
  };
  tex('shadow', 64, 24, () => { g.fillStyle(0x000000, 0.28); g.fillEllipse(32, 12, 60, 20); });
  tex('spark', 16, 16, () => { g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 6); g.fillStyle(0xffffff, 0.5); g.fillCircle(8, 8, 8); });
  tex('bolt-fogo', 44, 20, () => {
    g.fillStyle(0xff5a1f, 0.35); g.fillEllipse(20, 10, 40, 18);
    g.fillStyle(0xff8a24, 1); g.fillEllipse(26, 10, 26, 12);
    g.fillStyle(0xffe08a, 1); g.fillEllipse(30, 10, 12, 7);
  });
  tex('bolt-gelo', 40, 16, () => {
    g.fillStyle(0x9ee6ff, 0.35); g.fillEllipse(18, 8, 34, 14);
    g.fillStyle(0xbff1ff, 1); g.fillTriangle(4, 8, 30, 3, 30, 13); g.fillTriangle(30, 3, 38, 8, 30, 13);
    g.fillStyle(0xffffff, 1); g.fillTriangle(16, 8, 34, 6, 34, 10);
  });
  tex('flecha', 40, 8, () => {
    g.fillStyle(0x6b4226, 1); g.fillRect(4, 3, 28, 2);
    g.fillStyle(0xdfe6ee, 1); g.fillTriangle(30, 0, 40, 4, 30, 8);
    g.fillStyle(0xf2f2f2, 1); g.fillTriangle(0, 0, 8, 4, 0, 8);
  });
  tex('portal', 96, 48, () => {
    g.fillStyle(0x4fb6ff, 0.18); g.fillEllipse(48, 24, 96, 48);
    g.lineStyle(5, 0x7fd0ff, 0.9); g.strokeEllipse(48, 24, 78, 36);
    g.lineStyle(2, 0xffffff, 0.9); g.strokeEllipse(48, 24, 60, 26);
  });
  tex('ring', 128, 128, () => { g.lineStyle(6, 0xffffff, 1); g.strokeCircle(64, 64, 58); });
  tex('disc', 128, 128, () => { g.fillStyle(0xffffff, 1); g.fillCircle(64, 64, 62); });
  tex('click', 40, 20, () => { g.lineStyle(3, 0xffffff, 1); g.strokeEllipse(20, 10, 34, 14); });
  // anel do alvo e aviso no chão: desenhados uma vez (bordas suaves), depois só posicionados
  tex('target-ring', 128, 64, () => { g.lineStyle(3, 0xff5a5a, 0.9); g.strokeEllipse(64, 32, 122, 58); });
  tex('warn-ring', 256, 128, () => { g.lineStyle(5, 0xffffff, 0.85); g.strokeEllipse(128, 64, 248, 120); });
  tex('warn-disc', 256, 128, () => { g.fillStyle(0xffffff, 1); g.fillEllipse(128, 64, 256, 128); });
  g.destroy();
}

// ---------------------------------------------------------------- reservas

type Pools = {
  nums: Phaser.GameObjects.BitmapText[];
  imgs: Map<string, Phaser.GameObjects.Image[]>;
  labels: Map<string, Phaser.GameObjects.Text[]>;
  emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter>;
};
const pools = new WeakMap<Phaser.Scene, Pools>();
function P(scene: Phaser.Scene): Pools {
  let p = pools.get(scene);
  if (!p) { p = { nums: [], imgs: new Map(), labels: new Map(), emitters: new Map() }; pools.set(scene, p); }
  return p;
}

function takeImage(scene: Phaser.Scene, key: string) {
  const list = P(scene).imgs.get(key);
  const img = list?.pop() ?? scene.add.image(0, 0, key);
  return img.setVisible(true).setActive(true).setAlpha(1).setScale(1).setRotation(0).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
}
function giveImage(scene: Phaser.Scene, key: string, img: Phaser.GameObjects.Image) {
  img.setVisible(false).setActive(false);
  const p = P(scene);
  if (!p.imgs.has(key)) p.imgs.set(key, []);
  p.imgs.get(key)!.push(img);
}

/** Emissor de partículas compartilhado (um por tipo e cor), disparado com explode() */
function emitter(scene: Phaser.Scene, key: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number) {
  const p = P(scene);
  let e = p.emitters.get(key);
  if (!e || !e.scene) {
    e = scene.add.particles(0, 0, 'spark', { ...config, emitting: false }).setDepth(depth);
    p.emitters.set(key, e);
  }
  return e;
}

type Kind = 'normal' | 'crit' | 'taken' | 'heal' | 'weak' | 'resist';
const COLORS: Record<Kind, number> = { normal: 0xffffff, crit: 0xffe14a, taken: 0xff5a5a, heal: 0x6eff7a, weak: 0xffa040, resist: 0xa8a8a8 };

/** Números de dano no estilo clássico: sobem e caem num arco */
export function damageNumber(scene: Phaser.Scene, x: number, y: number, value: number, kind: Kind) {
  const text = (kind === 'heal' ? '+' : '') + String(Math.max(0, Math.round(value)));
  const pool = P(scene).nums;
  const t = pool.pop() ?? scene.add.bitmapText(0, 0, 'dmg', '').setOrigin(0.5);
  t.setText(text).setPosition(x, y).setAlpha(1).setVisible(true).setActive(true).setDepth(DEPTH_FX + 10);
  const base = kind === 'crit' ? 0.62 : kind === 'taken' ? 0.42 : 0.46;
  t.setScale(base).setTint(COLORS[kind]);
  const done = () => { t.setVisible(false).setActive(false); pool.push(t); };
  if (kind === 'crit') {
    const star = takeImage(scene, 'fx-impacto').setPosition(x, y).setScale(0.42).setDepth(DEPTH_FX + 9).setAlpha(0.9);
    scene.tweens.add({ targets: star, scale: 0.55, alpha: 0, duration: 700, onComplete: () => giveImage(scene, 'fx-impacto', star) });
  }
  if (kind === 'heal') {
    scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: done });
    return;
  }
  const dir = Phaser.Math.Between(-1, 1) || 1;
  scene.tweens.add({ targets: t, x: x + dir * 34, duration: 900, ease: 'Linear' });
  scene.tweens.add({
    targets: t, y: y - 46, duration: 300, ease: 'Quad.easeOut',
    onComplete: () => scene.tweens.add({ targets: t, y: y + 4, alpha: 0, duration: 600, ease: 'Quad.easeIn', onComplete: done }),
  });
}

export function missText(scene: Phaser.Scene, x: number, y: number) {
  const m = takeImage(scene, 'fx-miss').setPosition(x, y).setScale(0.3).setDepth(DEPTH_FX + 10);
  scene.tweens.add({ targets: m, y: y - 30, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => giveImage(scene, 'fx-miss', m) });
}

/** Rótulos flutuantes ("Golpe Poderoso!", "Congelado"): o texto é desenhado uma vez e reaproveitado */
export function floatLabel(scene: Phaser.Scene, x: number, y: number, label: string, color = '#ffffff', size = 14) {
  const key = `${label}|${color}|${size}`;
  const p = P(scene);
  if (!p.labels.has(key)) p.labels.set(key, []);
  const list = p.labels.get(key)!;
  const t = list.pop() ?? scene.add.text(0, 0, label, {
    fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: `${size}px`, color, stroke: '#1a1000', strokeThickness: 4,
  }).setOrigin(0.5);
  t.setPosition(x, y).setAlpha(1).setVisible(true).setActive(true).setDepth(DEPTH_FX + 12);
  scene.tweens.add({
    targets: t, y: y - 36, alpha: 0, duration: 1300, ease: 'Cubic.easeOut',
    onComplete: () => { t.setVisible(false).setActive(false); list.push(t); },
  });
}

/** Flash e faíscas no ponto do golpe */
export function hitSpark(scene: Phaser.Scene, x: number, y: number, color = 0xffffff, n = 6) {
  emitter(scene, `spark-${color}`, {
    speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.6, end: 0 }, tint: color, blendMode: 'ADD',
  }, DEPTH_FX + 5).explode(n, x, y);
}

/** Explosão circular (Impacto Explosivo, Bola de Fogo) */
export function blast(scene: Phaser.Scene, x: number, y: number, radius: number, color = 0xff7a24) {
  const ring = takeImage(scene, 'ring').setPosition(x, y).setTint(color).setDepth(DEPTH_FX + 4).setBlendMode(Phaser.BlendModes.ADD);
  ring.setDisplaySize(10, 5);
  scene.tweens.add({ targets: ring, displayWidth: radius * 2.2, displayHeight: radius * 1.1, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => giveImage(scene, 'ring', ring) });
  const disc = takeImage(scene, 'disc').setPosition(x, y).setTint(color).setDepth(DEPTH_FX + 3).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
  disc.setDisplaySize(radius * 1.6, radius * 0.8);
  scene.tweens.add({ targets: disc, alpha: 0, duration: 380, onComplete: () => giveImage(scene, 'disc', disc) });
  emitter(scene, `blast-${color}`, {
    speed: { min: 80, max: 260 }, angle: { min: 200, max: 340 }, lifespan: 500, gravityY: 300,
    scale: { start: 0.9, end: 0 }, tint: [color, 0xffe08a, 0xffffff], blendMode: 'ADD',
  }, DEPTH_FX + 5).explode(22, x, y - 10);
}

/** Espinhos sombrios do Gêiser das Trevas */
export function spikes(scene: Phaser.Scene, x: number, y: number) {
  const e = emitter(scene, 'spikes', {
    speedY: { min: -320, max: -160 }, speedX: { min: -30, max: 30 }, lifespan: 420, scale: { start: 0.9, end: 0 },
    tint: [0x7a2aff, 0x2a0a3a, 0xd08aff],
  }, y + 2);
  e.setDepth(y + 2);
  e.explode(18, x, y);
}

/** Raio caindo do céu */
export function lightning(scene: Phaser.Scene, x: number, y: number) {
  const g = scene.add.graphics().setDepth(DEPTH_FX + 6).setBlendMode('ADD');
  const pts: [number, number][] = [];
  let cx = x + Phaser.Math.Between(-30, 30);
  for (let yy = y - 360; yy < y; yy += 30) { pts.push([cx, yy]); cx += Phaser.Math.Between(-16, 16); }
  pts.push([x, y]);
  for (const [w, c, a] of [[9, 0x8ab8ff, 0.5], [4, 0xfff6b0, 1]] as const) {
    g.lineStyle(w, c, a);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts) g.lineTo(px, py);
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 260, delay: 60, onComplete: () => g.destroy() });
  hitSpark(scene, x, y, 0xfff6b0, 8);
}

/** Coluna de luz dourada do "subiu de nível" */
export function levelUpFx(scene: Phaser.Scene, x: number, y: number, color = 0xffd36b) {
  const col = scene.add.rectangle(x, y - 70, 70, 160, color, 0.35).setDepth(DEPTH_FX + 2).setBlendMode('ADD');
  scene.tweens.add({ targets: col, scaleX: 0.1, alpha: 0, duration: 1100, ease: 'Cubic.easeIn', onComplete: () => col.destroy() });
  const p = scene.add.particles(x, y, 'spark', {
    x: { min: -30, max: 30 }, speedY: { min: -220, max: -90 }, lifespan: 900, scale: { start: 0.55, end: 0 },
    tint: [color, 0xffffff], quantity: 3, frequency: 30, blendMode: 'ADD',
  }).setDepth(DEPTH_FX + 3);
  scene.time.delayedCall(600, () => p.stop());
  scene.time.delayedCall(1600, () => p.destroy());
}

/** Aviso no chão (ataques do chefe): elipse com contorno que vai se enchendo */
export function warnCircle(scene: Phaser.Scene, x: number, y: number, r: number, ms: number, color = 0xb04aff) {
  const base = takeImage(scene, 'warn-disc').setPosition(x, y).setTint(color).setAlpha(0.16).setDepth(5);
  base.setDisplaySize(r * 2, r);
  const ring = takeImage(scene, 'warn-ring').setPosition(x, y).setTint(color).setDepth(5);
  ring.setDisplaySize(r * 2, r);
  const fill = takeImage(scene, 'warn-disc').setPosition(x, y).setTint(color).setAlpha(0.3).setDepth(5);
  fill.setDisplaySize(1, 1);
  scene.tweens.add({
    targets: fill, displayWidth: r * 2, displayHeight: r, duration: ms, ease: 'Linear',
    onComplete: () => { giveImage(scene, 'warn-disc', base); giveImage(scene, 'warn-ring', ring); giveImage(scene, 'warn-disc', fill); },
  });
}
