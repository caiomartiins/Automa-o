import Phaser from 'phaser';

export const FX_DEPTH = 1_000_000;

type Obj = Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText | Phaser.GameObjects.Graphics;
type Kind = 'fade' | 'lance' | 'ring' | 'number' | 'fall';

interface Item {
  obj: Obj;
  kind: Kind;
  age: number;
  life: number;
  alpha: number;
  s0: number;
  s1: number;
  y0: number;
  pool: Obj[];
}

/**
 * Efeitos visuais leves: golpes, estocadas, explosões e números de dano.
 * Tudo usa imagens prontas reaproveitadas (pooling) e é animado aqui mesmo,
 * sem criar objetos, Graphics ou tweens novos a cada golpe.
 */
export class Fx {
  private items: Item[] = [];
  private pools = new Map<string, Obj[]>();
  private numbers = 0;

  constructor(private scene: Phaser.Scene, public maxNumbers: number) {}

  private pool(key: string) {
    let pool = this.pools.get(key);
    if (!pool) this.pools.set(key, (pool = []));
    return pool;
  }

  private image(key: string, originX = 0.5) {
    const pool = this.pool(key);
    const img = (pool.pop() as Phaser.GameObjects.Image | undefined) ?? this.scene.add.image(0, 0, key).setOrigin(originX, 0.5);
    img.setActive(true).setVisible(true).setDepth(FX_DEPTH).clearTint().setAlpha(1).setScale(1).setRotation(0);
    return { img, pool };
  }

  private push(obj: Obj, kind: Kind, life: number, pool: Obj[], extra: Partial<Item> = {}) {
    this.items.push({ obj, kind, life, pool, age: 0, alpha: 1, s0: 1, s1: 1, y0: 0, ...extra });
  }

  /** Arco do golpe de espada (textura com raio 100) */
  slash(x: number, y: number, angle: number, radius: number, color: number) {
    const { img, pool } = this.image('fx-slash');
    img.setPosition(x, y).setRotation(angle).setScale(radius / 100).setTint(color);
    this.push(img, 'fade', 180, pool, { alpha: 0.9 });
  }

  /** Estocada de lança (textura com 256 x 40) */
  lance(x: number, y: number, angle: number, length: number, width: number, tint?: number) {
    const { img, pool } = this.image('fx-lance', 0);
    img.setPosition(x, y).setRotation(angle);
    if (tint !== undefined) img.setTint(tint);
    img.scaleY = width / 40;
    this.push(img, 'lance', 320, pool, { s1: length / 256 });
  }

  /** Círculo que cresce e some (morte de inimigo, onda de choque) */
  ring(x: number, y: number, radius: number, grow: number, life: number, color: number, alpha: number) {
    const { img, pool } = this.image('fx-ring');
    const s0 = radius / 16;
    img.setPosition(x, y).setScale(s0).setTint(color).setAlpha(alpha);
    this.push(img, 'ring', life, pool, { s0, s1: s0 * grow, alpha });
  }

  /** Raio em zigue-zague passando pelos pontos (corrente de raios) */
  bolt(points: { x: number; y: number }[], color = 0x9fe6ff) {
    if (points.length < 2) return;
    const pool = this.pool('bolt');
    const g = (pool.pop() as Phaser.GameObjects.Graphics | undefined) ?? this.scene.add.graphics();
    g.clear().setActive(true).setVisible(true).setAlpha(1).setDepth(FX_DEPTH);
    for (const [w, col, a] of [[6, color, 0.35], [2.5, 0xffffff, 1]] as const) {
      g.lineStyle(w, col, a);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        // dois desvios aleatórios entre cada par de pontos
        for (const t of [0.33, 0.66]) {
          const nx = -(p1.y - p0.y);
          const ny = p1.x - p0.x;
          const len = Math.hypot(nx, ny) || 1;
          const off = (Math.random() - 0.5) * 22;
          g.lineTo(p0.x + (p1.x - p0.x) * t + (nx / len) * off, p0.y + (p1.y - p0.y) * t + (ny / len) * off);
        }
        g.lineTo(p1.x, p1.y);
      }
      g.strokePath();
    }
    this.push(g, 'fade', 200, pool, { alpha: 1 });
  }

  /** Objeto caindo do céu até (x, y) em `life` ms (meteoro) */
  fall(x: number, y: number, key: string, life: number, scale = 1) {
    const { img, pool } = this.image(key);
    img.setOrigin(0.5, 1).setPosition(x, y - 320).setScale(scale * 0.5);
    this.push(img, 'fall', life, pool, { y0: y, s0: scale * 0.5 });
  }

  /** Número flutuante de dano ou cura */
  number(x: number, y: number, value: string, color: number) {
    if (this.numbers >= this.maxNumbers) return;
    const pool = this.pool('number');
    const t = (pool.pop() as Phaser.GameObjects.BitmapText | undefined) ?? this.scene.add.bitmapText(0, 0, 'dmg', '').setOrigin(0.5).setLetterSpacing(-4);
    t.setText(value).setPosition(x, y).setTint(color).setAlpha(1).setActive(true).setVisible(true).setDepth(FX_DEPTH + 1);
    this.numbers++;
    this.push(t, 'number', 550, pool, { y0: y });
  }

  update(dt: number) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      const k = it.age / it.life;
      if (k >= 1) {
        it.obj.setActive(false).setVisible(false);
        it.pool.push(it.obj);
        if (it.kind === 'number') this.numbers--;
        items[i] = items[items.length - 1];
        items.pop();
        continue;
      }
      const o = it.obj;
      switch (it.kind) {
        case 'fade':
          o.setAlpha(it.alpha * (1 - k));
          break;
        case 'lance': {
          const grow = Math.min(1, it.age / 90);
          o.scaleX = it.s1 * (0.15 + 0.85 * (1 - (1 - grow) ** 3));
          o.setAlpha(it.age < 120 ? 1 : 1 - (it.age - 120) / (it.life - 120));
          break;
        }
        case 'ring':
          o.setScale(it.s0 + (it.s1 - it.s0) * k);
          o.setAlpha(it.alpha * (1 - k));
          break;
        case 'fall':
          o.y = it.y0 - 320 * (1 - k * k);
          o.setAlpha(Math.min(1, k * 4));
          break;
        case 'number':
          o.y = it.y0 - 26 * k;
          o.setAlpha(1 - k);
          break;
      }
    }
  }
}
