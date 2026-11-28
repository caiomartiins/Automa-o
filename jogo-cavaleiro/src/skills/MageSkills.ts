import Phaser from 'phaser';
import { Skill, FX_DEPTH } from './Skill';
import type { Enemy } from '../objects/Enemy';
import type { GameScene } from '../scenes/GameScene';

/**
 * Habilidades da árvore do Mago, Bruxo e Professor.
 * Todas usam o dano base × poder (might); a fórmula de dano do jogo soma a Matq (INT),
 * elemento, cartas e passivas em damageEnemy().
 */

/** Lança de Gelo: leque de lanças no inimigo mais próximo, podem congelar */
export class IceBoltSkill extends Skill {
  readonly id = 'gelo' as const;
  private timer = 400;
  get damage() { return (10 + 3 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 1050 : 1250) / this.g.castHaste; }
  get count() { return this.level + 1; }
  trigger() { this.timer = 0; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, 500)[0];
    if (!t) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const base = Math.atan2(t.y - p.y, t.x - p.x);
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.13;
      this.g.projectiles.fire('proj-gelo', p.x, p.y - 6, a, { src: this.id, speed: 430, damage: this.damage, pierce: 1, radius: 7, life: 1200, knockback: 60 });
    }
  }
}

/** Ataque Espiritual: esferas que atravessam (fortes contra mortos-vivos) */
export class SoulSkill extends Skill {
  readonly id = 'alma' as const;
  private timer = 500;
  get damage() { return (15 + 5 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 1150 : 1400) / this.g.castHaste; }
  get count() { return [2, 3, 3, 4, 5][this.level - 1]; }
  get pierce() { return this.level >= 3 ? 3 : 2; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 520);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i % 2 ? 0.3 : -0.3) : 0);
      this.g.projectiles.fire('proj-alma', p.x, p.y - 10, a, { src: this.id, speed: 330, damage: this.damage, pierce: this.pierce, radius: 9, life: 1700, knockback: 40 });
    }
  }
}

/** Relâmpago: raios caem do céu nos inimigos mais próximos */
export class ThunderBoltSkill extends Skill {
  readonly id = 'relampago' as const;
  private timer = 600;
  get damage() { return (20 + 7 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 3 ? 1300 : 1550) / this.g.castHaste; }
  get count() { return [1, 2, 2, 3, 4][this.level - 1]; }
  trigger() { this.timer = 0; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 460);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    for (const t of targets) {
      skyBolt(this.g, t.x, t.y);
      this.g.damageEnemy(t, this.damage, 30, p.x, p.y, this.id);
    }
  }
}

/** Raio vertical do céu até (x, y) */
function skyBolt(g: GameScene, x: number, y: number, color = 0xd8f0ff) {
  // raio desenhado caindo do céu, com a base (faíscas) no alvo
  g.fx.splash('fx-raio', x + Phaser.Math.Between(-4, 4), y + 14, 1.25, 260, { originY: 1 });
  g.fx.ring(x, y, 10, 2.4, 200, color, 0.6);
}

/** Tempestade de Raios: vários raios caem em volta de um grupo de inimigos */
export class ThunderstormSkill extends Skill {
  readonly id = 'tempestade' as const;
  private timer = 900;
  private pending: { x: number; y: number; at: number }[] = [];
  get damage() { return (14 + 5 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 2500 : 2900) / this.g.castHaste; }
  get count() { return [4, 5, 6, 7, 9][this.level - 1]; }
  get radius() { return (75 + 8 * this.level) * this.g.stats.area; }

  update(dt: number) {
    const now = this.g.elapsed;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const b = this.pending[i];
      if (now < b.at) continue;
      skyBolt(this.g, b.x, b.y, 0xa8e0ff);
      this.g.explode(b.x, b.y, 42 * this.g.stats.area, this.damage, 40, 0xa8e0ff, this.id);
      this.pending.splice(i, 1);
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, 420)[0];
    if (!t) {
      this.timer = 250;
      return;
    }
    this.timer = this.cooldown;
    const r = this.radius;
    for (let i = 0; i < this.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r;
      this.pending.push({ x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, at: now + i * 90 });
    }
    this.g.fx.ring(t.x, t.y, r * 0.9, 1, this.count * 90 + 100, 0x7ab8ff, 0.18);
  }
}

/** Rajada Congelante: grande lança que atravessa a fila e congela */
export class FrostDiverSkill extends Skill {
  readonly id = 'congelar' as const;
  private timer = 800;
  get damage() { return (34 + 10 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1900 : 2300) / this.g.castHaste; }
  get pierce() { return 2 + this.level; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, 2, 520);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const shots = this.level >= 5 ? 2 : 1;
    for (let i = 0; i < shots; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i && targets.length < 2 ? 0.35 : 0);
      this.g.projectiles.fire('proj-gelo', p.x, p.y - 6, a, {
        src: this.id, speed: 470, damage: this.damage, pierce: this.pierce, radius: 13, life: 1300, knockback: 90, scale: 2.1,
      });
    }
  }
}

/** Campo no chão que fere quem está dentro a cada tique (base da Parede de Fogo e do Pântano) */
abstract class ZoneSkill extends Skill {
  protected timer = 700;
  protected zones: { x: number; y: number; r: number; until: number; nextTick: number; imgs: Phaser.GameObjects.Image[] }[] = [];
  private imgPool: Phaser.GameObjects.Image[] = [];
  protected abstract tick: number;
  protected abstract zoneDamage(): number;
  protected abstract knockback: number;

  protected image(key: string) {
    const img = this.imgPool.pop() ?? this.g.add.image(0, 0, key);
    return img.setTexture(key).setActive(true).setVisible(true).setAlpha(1).clearTint().setScale(1).setRotation(0);
  }

  protected updateZones() {
    const now = this.g.elapsed;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (now >= z.until) {
        for (const img of z.imgs) {
          img.setActive(false).setVisible(false);
          this.imgPool.push(img);
        }
        this.zones.splice(i, 1);
        continue;
      }
      const fade = Math.min(1, (z.until - now) / 300);
      for (const img of z.imgs) img.setAlpha(fade * (img.getData('a') ?? 1));
      if (now < z.nextTick) continue;
      z.nextTick = now + this.tick;
      for (const e of this.g.queryEnemies(z.x, z.y, z.r, this.near).slice() as Enemy[]) {
        if (!e.active) continue;
        if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 > (z.r + e.def.radius) ** 2) continue;
        this.onEnemyInside(e, z.x, z.y);
      }
    }
  }

  protected onEnemyInside(e: Enemy, x: number, y: number) {
    this.g.damageEnemy(e, this.zoneDamage(), this.knockback, x, y, this.id);
  }

  destroy() {
    for (const z of this.zones) z.imgs.forEach((i) => i.destroy());
    this.imgPool.forEach((i) => i.destroy());
  }
}

/** Parede de Fogo: chamas à frente do jogador que queimam e empurram */
export class FireWallSkill extends ZoneSkill {
  readonly id = 'parede' as const;
  protected tick = 400;
  protected knockback = 170;
  protected zoneDamage() { return (6 + 2 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 3800 : 4600) / this.g.castHaste; }
  get segments() { return 3 + Math.min(this.level, 4); }
  get duration() { return 2800 + 300 * this.level; }

  update(dt: number) {
    this.updateZones();
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    if (!this.g.nearestEnemies(p.x, p.y, 1, 360).length) {
      this.timer = 250;
      return;
    }
    this.timer = this.cooldown;
    const dirs = this.level >= 5 ? [1, -1] : [1];
    for (const dir of dirs) {
      const fx = this.g.facing.x * dir;
      const fy = this.g.facing.y * dir;
      // a parede fica a 75 px, de lado em relação à direção do jogador
      const cx = p.x + fx * 75;
      const cy = p.y + fy * 75;
      const n = this.segments;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 30;
        const x = cx - fy * off;
        const y = cy + fx * off;
        const img = this.image('fx-chama').setPosition(x, y - 14).setScale(0.6).setDepth(y + 5).setData('a', 0.95);
        this.zones.push({ x, y, r: 18, until: this.g.elapsed + this.duration, nextTick: this.g.elapsed, imgs: [img] });
      }
    }
  }
}

/** Pântano: chão que deixa os inimigos lentos e fere aos poucos */
export class QuagmireSkill extends ZoneSkill {
  readonly id = 'pantano' as const;
  protected tick = 450;
  protected knockback = 0;
  protected zoneDamage() { return (5 + 2 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 5200 : 6200) / this.g.castHaste; }
  get radius() { return (90 + 12 * this.level) * this.g.stats.area; }
  get duration() { return 4000 + 500 * this.level; }

  update(dt: number) {
    this.updateZones();
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, 2, 420);
    if (!targets.length) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    const n = this.level >= 5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const t = targets[i % targets.length];
      const x = t.x + (i && targets.length < 2 ? 120 : 0);
      const y = t.y;
      const r = this.radius;
      const img = this.image('fx-ring').setPosition(x, y).setScale(r / 16).setTint(0x4a3a1a).setDepth(-1e6).setData('a', 0.42);
      const ring = this.image('fx-ring').setPosition(x, y).setScale((r * 0.7) / 16).setTint(0x6a5a2a).setDepth(-1e6 + 1).setData('a', 0.3);
      this.zones.push({ x, y, r, until: this.g.elapsed + this.duration, nextTick: this.g.elapsed, imgs: [img, ring] });
    }
  }

  protected onEnemyInside(e: Enemy, x: number, y: number) {
    this.g.applyStatus(e, 'lento', 0);
    super.onEnemyInside(e, x, y);
  }
}

/** Nevasca: gira sobre um grupo de inimigos ferindo várias vezes e congelando */
export class StormGustSkill extends Skill {
  readonly id = 'nevasca' as const;
  private timer = 1000;
  private storms: { x: number; y: number; hits: number; next: number }[] = [];
  get damage() { return (14 + 5 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 3600 : 4200) / this.g.castHaste; }
  get radius() { return (100 + 10 * this.level) * this.g.stats.area; }
  get hits() { return 4 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 1 : 0); }

  update(dt: number) {
    const now = this.g.elapsed;
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const s = this.storms[i];
      if (now < s.next) continue;
      s.next = now + 300;
      const r = this.radius;
      this.g.fx.splash('fx-gelo-chao', s.x, s.y, (r * 2) / 124, 420, { grow: true, depth: -1e6 + 3, alpha: 0.9 });
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r * 0.8;
        this.g.fx.ring(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 5, 2, 260, 0xffffff, 0.8);
      }
      this.g.explode(s.x, s.y, r, this.damage, 50, 0x9fe6ff, this.id);
      if (--s.hits <= 0) this.storms.splice(i, 1);
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, 420)[0];
    if (!t) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    this.storms.push({ x: t.x, y: t.y, hits: this.hits, next: now });
  }
}

/** Fúria dos Céus: ondas de raios gigantes em toda a área ao redor do jogador */
export class LordSkill extends Skill {
  readonly id = 'trovao' as const;
  private timer = 1500;
  private waves = 0;
  private nextWave = 0;
  get damage() { return (22 + 7 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 5600 : 6400) / this.g.castHaste; }
  get radius() { return (170 + 15 * this.level) * this.g.stats.area; }
  get waveCount() { return 3 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 1 : 0); }

  update(dt: number) {
    const now = this.g.elapsed;
    const p = this.g.player;
    if (this.waves > 0 && now >= this.nextWave) {
      this.waves--;
      this.nextWave = now + 380;
      const r = this.radius;
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = (0.3 + Math.random() * 0.7) * r;
        skyBolt(this.g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0xfff27a);
      }
      this.g.fx.ring(p.x, p.y, r * 0.5, 2, 300, 0xfff27a, 0.2);
      this.g.explode(p.x, p.y, r, this.damage, 70, 0xfff27a, this.id);
      this.g.cameras.main.shake(80, 0.003);
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.radius).length) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    this.waves = this.waveCount;
    this.nextWave = now;
  }
}

/** Espinhos da Terra: espinhos de pedra brotam embaixo dos inimigos */
export class EarthSpikeSkill extends Skill {
  readonly id = 'espinhos' as const;
  private timer = 500;
  get damage() { return (22 + 8 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 1400 : 1700) / this.g.castHaste; }
  get count() { return [2, 3, 3, 4, 5][this.level - 1]; }
  get radius() { return (this.level >= 3 ? 44 : 36) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 440);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    for (const t of targets) {
      const { x, y } = t;
      const img = this.g.add.image(x, y + 12, 'fx-espinhos').setOrigin(0.5, 1).setScale(0.95, 0.15).setDepth(y + 12);
      this.g.tweens.add({ targets: img, scaleY: 0.95, duration: 90, yoyo: true, hold: 160, onComplete: () => img.destroy() });
      this.g.explode(x, y, this.radius, this.damage, 120, 0xc8a050, this.id);
    }
  }
}
