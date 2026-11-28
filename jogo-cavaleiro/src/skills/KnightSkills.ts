import Phaser from 'phaser';
import { Skill } from './Skill';

/**
 * Habilidades de lança e de espada de duas mãos do Cavaleiro (10 níveis).
 * Cada nível deixa a habilidade mais forte; em alguns níveis ela também ganha área ou golpes extras.
 */

/** Perfurar: estocadas rápidas no alvo mais próximo; 1, 2 ou 3 golpes conforme o tamanho do alvo */
export class PierceSkill extends Skill {
  readonly id = 'perfurar' as const;
  private timer = 400;
  get damage() { return (24 + 9 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (1000 - 35 * (this.level - 1)) / this.g.atkHaste; }
  get range() { return (150 + 8 * this.level) * this.g.stats.area; }
  /** Nv 4+: a lança atravessa e fere quem estiver atrás; Nv 7+: faixa mais larga */
  get width() { return (this.level >= 7 ? 44 : this.level >= 4 ? 30 : 0) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, this.range)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    const hits = (t.def.size === 'grande' ? 3 : t.def.size === 'medio' ? 2 : 1) + (this.level >= 10 ? 1 : 0);
    for (let i = 0; i < hits; i++) {
      this.g.time.delayedCall(i * 90, () => {
        if (!t.active) return;
        const len = Math.hypot(t.x - p.x, t.y - p.y) + 30;
        this.g.fx.lance(p.x, p.y - 6, a, len, 22, 0xfff0b0);
        this.g.damageEnemy(t, this.damage, i === hits - 1 ? 140 : 20, p.x, p.y, this.id);
        if (this.width > 0) {
          // atravessa: fere também quem está na linha, atrás do alvo
          const far = len + 90;
          for (const e of this.g.queryEnemies(p.x + Math.cos(a) * far / 2, p.y + Math.sin(a) * far / 2, far / 2 + this.width, this.near).slice()) {
            if (!e.active || e === t) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const along = dx * Math.cos(a) + dy * Math.sin(a);
            const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
            if (along > 0 && along < far && across < this.width / 2 + e.def.radius) this.g.damageEnemy(e, this.damage * 0.6, 40, p.x, p.y, this.id);
          }
        }
      });
    }
  }
}

/** Estocada: golpe rápido em linha que joga os inimigos longe (e pode atordoar) */
export class SpearStabSkill extends Skill {
  readonly id = 'estocada' as const;
  private timer = 600;
  get damage() { return (45 + 14 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (1800 - 60 * (this.level - 1)) / this.g.atkHaste; }
  get length() { return (150 + 15 * this.level) * this.g.stats.area; }
  get width() { return (40 + 3 * this.level) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, this.length)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const base = Math.atan2(t.y - p.y, t.x - p.x);
    // Nv 6+: estoca também para os lados; Nv 10: em 4 direções
    const dirs = this.level >= 10 ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : this.level >= 6 ? [0, 0.6, -0.6] : [0];
    for (const d of dirs) this.thrust(base + d);
  }

  private thrust(a: number) {
    const p = this.g.player;
    const len = this.length;
    const w = this.width;
    this.g.fx.lance(p.x, p.y - 6, a, len, w, 0xffd04a);
    for (const e of this.g.queryEnemies(p.x + Math.cos(a) * len / 2, p.y + Math.sin(a) * len / 2, len / 2 + w, this.near).slice()) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const along = dx * Math.cos(a) + dy * Math.sin(a);
      const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
      if (along > -e.def.radius && along < len + e.def.radius && across < w / 2 + e.def.radius) this.g.damageEnemy(e, this.damage, 520, p.x, p.y, this.id);
    }
  }
}

/** Lança Bumerangue: arremessa a lança num alvo distante, empurrando */
export class SpearBoomerangSkill extends Skill {
  readonly id = 'lancabum' as const;
  private timer = 500;
  get damage() { return (70 + 30 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (1700 - 100 * (this.level - 1)) / this.g.atkHaste; }
  get range() { return (480 + 40 * this.level) * this.g.stats.area; }
  get pierce() { return 1 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 1 : 0); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const n = this.level >= 5 ? 2 : 1;
    const targets = this.g.nearestEnemies(p.x, p.y, 6, this.range);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    // mira nos mais distantes do alcance (é a habilidade de longe do Cavaleiro)
    for (let i = 0; i < n; i++) {
      const t = targets[Math.max(0, targets.length - 1 - i)];
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      this.g.projectiles.fire('fx-lance', p.x, p.y - 8, a, {
        src: this.id, speed: 620, damage: this.damage, pierce: this.pierce, radius: 12, life: 1100, knockback: 300, scale: 0.55, tint: 0xffe08a,
      });
    }
  }
}

/** Brandir Lança: grande leque à frente que empurra grupos */
export class BrandishSkill extends Skill {
  readonly id = 'brandir' as const;
  private timer = 700;
  get damage() { return (40 + 12 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (2300 - 70 * (this.level - 1)) / this.g.atkHaste; }
  get range() { return (120 + 10 * this.level) * this.g.stats.area; }
  /** Abertura do leque: 150°, 200° no Nv 6+ */
  get arc() { return Phaser.Math.DegToRad(this.level >= 6 ? 200 : 150); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, this.range)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const angle = Math.atan2(t.y - p.y, t.x - p.x);
    this.sweep(angle);
    // Nv 10: gira para trás também
    if (this.level >= 10) this.g.time.delayedCall(140, () => this.sweep(angle + Math.PI));
  }

  private sweep(angle: number) {
    const p = this.g.player;
    const r = this.range;
    this.g.fx.slash(p.x, p.y, angle, r, 0xffe080);
    this.g.fx.slash(p.x, p.y, angle, r * 0.7, 0xffffff);
    if (this.level >= 6) {
      this.g.fx.slash(p.x, p.y, angle + 0.6, r * 0.9, 0xffe080);
      this.g.fx.slash(p.x, p.y, angle - 0.6, r * 0.9, 0xffe080);
    }
    for (const e of this.g.queryEnemies(p.x, p.y, r, this.near).slice()) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (r + e.def.radius) ** 2) continue;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) <= this.arc / 2) this.g.damageEnemy(e, this.damage, 260, p.x, p.y, this.id);
    }
  }
}

/** Impacto do Titã: golpe de espadão que acerta duas vezes todos em volta do alvo */
export class TitanImpactSkill extends Skill {
  readonly id = 'titan' as const;
  private timer = 800;
  get damage() { return (55 + 16 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (2600 - 80 * (this.level - 1)) / this.g.atkHaste; }
  get radius() { return (70 + 8 * this.level) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, 260)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const { x, y } = t;
    for (let k = 0; k < 2; k++) {
      this.g.time.delayedCall(k * 160, () => {
        const a = Math.atan2(y - p.y, x - p.x) + (k ? 0.5 : -0.5);
        this.g.fx.slash(x, y, a, this.radius, 0xffffff);
        this.g.fx.ring(x, y, this.radius * 0.3, 3, 260, 0xffd27a, 0.5);
        this.g.explode(x, y, this.radius, this.damage, k ? 260 : 60, 0xffd27a, this.id);
        if (k) this.g.cameras.main.shake(100, 0.005);
      });
    }
  }
}

/** Golpe Fulminante: golpe forte num alvo; atordoa a partir do Nv 6 e ganha onda de choque nos níveis altos */
export class BashSkill extends Skill {
  readonly id = 'fulminante' as const;
  private timer = 300;
  get damage() { return (50 + 15 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (1300 - 40 * (this.level - 1)) / this.g.atkHaste; }
  /** Nv 4+: onda de choque em volta do alvo; cresce no Nv 7 e 10 */
  get splash() { return (this.level >= 10 ? 95 : this.level >= 7 ? 75 : this.level >= 4 ? 55 : 0) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, 130 * this.g.stats.area)[0];
    if (!t) {
      this.timer = 120;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    this.g.fx.slash(t.x, t.y, a, 60, 0xfff0c0);
    this.g.fx.ring(t.x, t.y, 12, 3, 220, 0xffffff, 0.6);
    this.g.damageEnemy(t, this.damage, 200, p.x, p.y, this.id);
    if (this.splash > 0) this.g.explode(t.x, t.y, this.splash, this.damage * 0.5, 120, 0xffe0a0, this.id);
  }
}

/** Provocar: atrai e enfraquece os inimigos em volta (defesa menor, mas batem um pouco mais forte) */
export class ProvokeSkill extends Skill {
  readonly id = 'provocar' as const;
  private timer = 800;
  get cooldown() { return (6000 - 200 * (this.level - 1)) / this.g.atkHaste; }
  get radius() { return (140 + 14 * this.level) * this.g.stats.area; }
  /** Dano extra que os provocados recebem */
  get defDown() { return 0.06 + 0.03 * (this.level - 1); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.radius).length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.fx.ring(p.x, p.y, this.radius * 0.2, 5, 400, 0xff4a4a, 0.4);
    const until = this.g.elapsed + 4000 + 200 * this.level;
    for (const e of this.g.queryEnemies(p.x, p.y, this.radius, this.near)) {
      // não funciona em chefes nem em mortos-vivos
      if (!e.active || e.def.boss || e.def.miniboss || e.def.race === 'mortovivo') continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > this.radius ** 2) continue;
      e.tauntUntil = until;
      e.tauntDef = this.defDown;
      e.setTint(0xff9a9a);
    }
  }
}
