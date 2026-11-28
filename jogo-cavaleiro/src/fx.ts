import Phaser from 'phaser';

export const FX_DEPTH = 1_000_000;
/** Avisos de ataque ficam no chão: abaixo dos personagens, acima do piso e das poças */
const WARN_DEPTH = -1e6 + 10;

type Obj = Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText | Phaser.GameObjects.Graphics;
type Kind = 'fade' | 'lance' | 'ring' | 'number' | 'crit' | 'float' | 'miss' | 'pop' | 'fall' | 'balloon' | 'anim' | 'warn' | 'warnfill' | 'warnbar';

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
  /** Animação por quadros (efeitos desenhados): nomes dos quadros e movimento opcional */
  frames?: string[];
  x0?: number;
  x1?: number;
  y1?: number;
  /** Quanto da vida fica com alfa cheio antes de sumir (0 a 1) */
  hold?: number;
}

export interface AnimOpts {
  /** Profundidade (padrão: acima dos personagens) */
  depth?: number;
  rotation?: number;
  /** Move de (x, y) até (x1, y1) durante a vida */
  x1?: number;
  y1?: number;
  alpha?: number;
  /** Repete os quadros em vez de tocar uma vez só */
  loop?: number;
  hold?: number;
  flipX?: boolean;
}

/**
 * Efeitos visuais leves: golpes, estocadas, explosões e números de dano.
 * Tudo usa imagens prontas reaproveitadas (pooling) e é animado aqui mesmo,
 * sem criar objetos, Graphics ou tweens novos a cada golpe.
 */
export class Fx {
  private items: Item[] = [];
  /** Itens de controle já usados, prontos para reaproveitar (evita lixo a cada golpe) */
  private free: Item[] = [];
  private pools = new Map<string, Obj[]>();
  private numbers = 0;
  private misses = 0;
  private anims = 0;
  /** Limite de animações de efeito na tela ao mesmo tempo (celular) */
  maxAnims = 36;
  /** Quantas animações estão na tela (para efeitos opcionais cederem a vez) */
  get animCount() {
    return this.anims;
  }

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

  private push(obj: Obj, kind: Kind, life: number, pool: Obj[], extra?: Partial<Item>) {
    const it = this.free.pop() ?? ({} as Item);
    it.obj = obj;
    it.kind = kind;
    it.life = life;
    it.pool = pool;
    it.age = 0;
    it.alpha = 1;
    it.s0 = 1;
    it.s1 = 1;
    it.y0 = 0;
    it.frames = undefined;
    it.x0 = undefined;
    it.x1 = undefined;
    it.y1 = undefined;
    it.hold = undefined;
    if (extra) Object.assign(it, extra);
    this.items.push(it);
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

  /*
   * Avisos dos ataques dos chefes: o contorno mostra a área e o preenchimento cresce
   * até a borda. Quando enche, o golpe cai (o jogador lê o tempo exato para sair).
   */

  /** Aviso de área redonda no chão */
  warnCircle(x: number, y: number, r: number, ms: number, color: number) {
    // sombra escura por baixo: dá contraste em qualquer piso
    const d = this.image('fx-ring');
    d.img.setPosition(x, y).setScale(r / 16).setTint(0x000000).setDepth(WARN_DEPTH - 1);
    this.push(d.img, 'warn', ms, d.pool, { alpha: 0.22 });
    const a = this.image('fx-anel');
    a.img.setPosition(x, y).setScale(r / 60).setTint(color).setDepth(WARN_DEPTH);
    this.push(a.img, 'warn', ms, a.pool, { alpha: 1 });
    const f = this.image('fx-ring');
    f.img.setPosition(x, y).setScale(0).setTint(color).setDepth(WARN_DEPTH + 1);
    this.push(f.img, 'warnfill', ms, f.pool, { s1: r / 16, alpha: 0.5 });
  }

  /** Aviso de ataque em linha (investidas, raios, jatos), a partir de (x, y) */
  warnLine(x: number, y: number, angle: number, len: number, width: number, ms: number, color: number) {
    const sx = len / 16;
    const b = this.image('fx-quad', 0);
    b.img.setOrigin(0, 0.5).setPosition(x, y).setRotation(angle).setScale(sx, width / 16).setTint(0x000000).setDepth(WARN_DEPTH);
    this.push(b.img, 'warn', ms, b.pool, { alpha: 0.25 });
    const f = this.image('fx-quad', 0);
    f.img.setOrigin(0, 0.5).setPosition(x, y).setRotation(angle).setScale(0, width / 16).setTint(color).setDepth(WARN_DEPTH + 1);
    this.push(f.img, 'warnbar', ms, f.pool, { s1: sx, alpha: 0.55 });
    const nx = (-Math.sin(angle) * width) / 2;
    const ny = (Math.cos(angle) * width) / 2;
    for (const k of [-1, 1]) {
      const e = this.image('fx-quad', 0);
      e.img.setOrigin(0, 0.5).setPosition(x + nx * k, y + ny * k).setRotation(angle).setScale(sx, 4 / 16).setTint(color).setDepth(WARN_DEPTH + 2);
      this.push(e.img, 'warn', ms, e.pool, { alpha: 1 });
    }
  }

  /** Aviso de golpe em leque (115°) apontando para `angle` */
  warnCone(x: number, y: number, angle: number, r: number, ms: number, color: number) {
    const d = this.image('fx-slash');
    d.img.setPosition(x, y).setRotation(angle).setScale(r / 100).setTint(0x000000).setDepth(WARN_DEPTH - 1);
    this.push(d.img, 'warn', ms, d.pool, { alpha: 0.45 });
    const b = this.image('fx-slash');
    b.img.setPosition(x, y).setRotation(angle).setScale(r / 100).setTint(color).setDepth(WARN_DEPTH);
    this.push(b.img, 'warn', ms, b.pool, { alpha: 0.6 });
    const f = this.image('fx-slash');
    f.img.setPosition(x, y).setRotation(angle).setScale(0).setTint(color).setDepth(WARN_DEPTH + 1);
    this.push(f.img, 'warnfill', ms, f.pool, { s1: r / 100, alpha: 0.85 });
  }

  /**
   * Imagem de efeito que aparece e some (explosão, raio, gelo no chão).
   * `grow` = cresce um pouco enquanto some; `depth` padrão: acima dos personagens.
   */
  splash(key: string, x: number, y: number, scale: number, life: number, o: { grow?: boolean; depth?: number; alpha?: number; originY?: number } = {}) {
    const { img, pool } = this.image(key);
    img.setOrigin(0.5, o.originY ?? 0.5).setPosition(x, y).setScale(scale).setDepth(o.depth ?? FX_DEPTH - 3);
    this.push(img, o.grow ? 'pop' : 'fade', life, pool, { s0: scale, alpha: o.alpha ?? 1 });
  }

  /** Coluna de luz colorida (item raro no chão), sumindo devagar */
  beam(x: number, y: number, color: number, life: number) {
    const { img, pool } = this.image('fx-quad');
    img.setOrigin(0.5, 1).setPosition(x, y + 6).setScale(12 / 16, 160 / 16).setTint(color).setDepth(y - 2);
    this.push(img, 'fade', life, pool, { alpha: 0.6 });
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

  /**
   * Número flutuante de dano ou cura, na fonte de números do jogo (branca com contorno,
   * tingida pela cor). Termina com "!" = crítico: amarelo, maior e com estrela de impacto.
   */
  number(x: number, y: number, value: string, color: number, small = false) {
    if (this.numbers >= this.maxNumbers) return;
    const crit = value.endsWith('!');
    const text = value.replace(/[^0-9+-]/g, '');
    const pool = this.pool('number');
    const t = (pool.pop() as Phaser.GameObjects.BitmapText | undefined)
      ?? this.scene.add.bitmapText(0, 0, 'dmg2', '').setOrigin(0.5).setLetterSpacing(-12);
    const s0 = crit ? 0.5 : small ? 0.22 : 0.32;
    t.setText(text).setPosition(x, y).setScale(s0).setTint(crit ? 0xffe23a : color).setAlpha(1)
      .setActive(true).setVisible(true).setDepth(FX_DEPTH + (crit ? 12 : 1));
    this.numbers++;
    this.push(t, crit ? 'crit' : 'number', crit ? 850 : 620, pool, { y0: y, s0 });
    if (crit) {
      // balão (estrela de impacto) atrás do número amarelo, maior que ele e subindo junto;
      // tudo acima dos números normais, e o mais novo por cima dos outros
      const { img, pool: ip } = this.image('fx-impacto');
      const bs = Math.max(0.3, (t.displayWidth * 1.7) / 178);
      img.setPosition(x, y + 2).setScale(bs).setDepth(FX_DEPTH + 11).setRotation(Math.random() * 0.5 - 0.25);
      this.push(img, 'balloon', 850, ip, { s0: bs, y0: y + 2, alpha: 1 });
      const c = this.image('fx-crit');
      c.img.setPosition(x, y - 26).setScale(0.28).setDepth(FX_DEPTH + 13);
      this.push(c.img, 'float', 850, c.pool, { y0: y - 26 });
      const list = this.scene.children;
      list.bringToTop(img);
      list.bringToTop(t);
      list.bringToTop(c.img);
    }
  }

  /**
   * Efeito desenhado em quadros (folha de efeitos). Toca os quadros ao longo de `life` ms
   * (ou `loop` vezes), com movimento opcional e sumindo no fim.
   */
  anim(key: string, frames: string[], x: number, y: number, life: number, scale: number, o: AnimOpts = {}) {
    if (this.anims >= this.maxAnims) return null;
    this.anims++;
    const { img, pool } = this.image(key);
    img.setFrame(frames[0]).setOrigin(0.5).setPosition(x, y).setScale(scale).setRotation(o.rotation ?? 0)
      .setDepth(o.depth ?? FX_DEPTH - 3).setAlpha(o.alpha ?? 1).setFlipX(!!o.flipX);
    const seq = o.loop ? Array.from({ length: frames.length * o.loop }, (_, i) => frames[i % frames.length]) : frames;
    this.push(img, 'anim', life, pool, { frames: seq, x0: x, y0: y, x1: o.x1, y1: o.y1, alpha: o.alpha ?? 1, s0: scale, hold: o.hold ?? 0.7 });
    return img;
  }

  /** "Miss": o golpe errou (esquiva) */
  miss(x: number, y: number) {
    // limite de "Miss" na tela ao mesmo tempo (muitos erros seguidos pesam no celular)
    if (this.misses >= Math.max(4, this.maxNumbers / 3)) return;
    this.misses++;
    const { img, pool } = this.image('fx-miss');
    img.setPosition(x, y).setScale(0.3).setDepth(FX_DEPTH + 2);
    this.push(img, 'miss', 600, pool, { y0: y });
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
        if (it.kind === 'number' || it.kind === 'crit') this.numbers--;
        if (it.kind === 'miss') this.misses--;
        if (it.kind === 'fade') (it.obj as Phaser.GameObjects.Image).setBlendMode?.(Phaser.BlendModes.NORMAL);
        if (it.kind === 'anim') {
          this.anims--;
          (it.obj as Phaser.GameObjects.Image).setFlipX(false).setOrigin(0.5);
        }
        this.free.push(it);
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
        case 'number': {
          // "salta" ao aparecer, sobe e some na segunda metade
          o.y = it.y0 - 30 * k;
          o.setScale(it.s0 * (1 + 0.45 * Math.max(0, 1 - it.age / 90)));
          o.setAlpha(k < 0.5 ? 1 : 1 - (k - 0.5) * 2);
          break;
        }
        case 'crit':
          o.y = it.y0 - 38 * k;
          o.setScale(it.s0 * (1 + 0.9 * Math.max(0, 1 - it.age / 130)));
          o.setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) * 2.5);
          break;
        case 'miss':
        case 'float':
          o.y = it.y0 - 30 * k;
          o.setAlpha(k < 0.5 ? 1 : 1 - (k - 0.5) * 2);
          break;
        case 'anim': {
          const fr = it.frames!;
          (o as Phaser.GameObjects.Image).setFrame(fr[Math.min(fr.length - 1, Math.floor(k * fr.length))]);
          if (it.x1 !== undefined) {
            o.x = it.x0! + (it.x1 - it.x0!) * k;
            o.y = it.y0 + (it.y1! - it.y0) * k;
          }
          const h = it.hold!;
          o.setAlpha(k < h ? it.alpha : it.alpha * (1 - (k - h) / (1 - h)));
          break;
        }
        case 'balloon':
          // estoura grande, assenta e sobe junto com o número; some no fim
          o.y = it.y0 - 38 * k;
          o.setScale(it.s0 * (it.age < 90 ? 0.5 + (it.age / 90) * 0.75 : 1.25 - 0.25 * Math.min(1, (it.age - 90) / 120)));
          o.setAlpha(k < 0.6 ? it.alpha : it.alpha * (1 - (k - 0.6) * 2.5));
          break;
        case 'pop':
          o.setScale(it.s0 * (1 + 0.35 * k));
          o.setAlpha(it.alpha * (1 - k));
          break;
        case 'warn':
          // pisca cada vez mais rápido perto do impacto
          o.setAlpha(it.alpha * (0.7 + 0.3 * Math.sin(it.age / (k > 0.7 ? 35 : 70))));
          break;
        case 'warnfill':
          o.setScale(it.s1 * k);
          o.setAlpha(it.alpha * (0.6 + 0.4 * k));
          break;
        case 'warnbar':
          o.scaleX = it.s1 * k;
          o.setAlpha(it.alpha * (0.6 + 0.4 * k));
          break;
      }
    }
  }
}
