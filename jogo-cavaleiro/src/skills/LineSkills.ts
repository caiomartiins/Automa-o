import Phaser from 'phaser';
import { Skill } from './Skill';

/**
 * Habilidades das árvores do Espadachim (Cavaleiro / Paladino) e do Arqueiro
 * (Caçador de Sombras / Atirador de Elite). O dano final passa por damageEnemy():
 * Atq de status (FOR ou DES), HIT x Flee, elemento, cartas e passivas.
 */

/** Impacto Explosivo: explosão de fogo em volta do jogador que empurra */
export class MagnumSkill extends Skill {
  readonly id = 'explosao' as const;
  private timer = 600;
  get damage() { return (30 + 10 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 2200 : 2700) / this.g.stats.haste; }
  get radius() { return (85 + 10 * this.level + (this.level >= 5 ? 20 : 0)) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.radius).length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    this.g.fx.ring(p.x, p.y, this.radius * 0.3, 3.2, 300, 0xffb040, 0.35);
    this.g.explode(p.x, p.y, this.radius, this.damage, 340, 0xff6a20, this.id);
    this.g.cameras.main.shake(90, 0.004);
  }
}

/** Brandir Lança: grande leque à frente (e atrás no nível 5) */
export class BrandishSkill extends Skill {
  readonly id = 'brandir' as const;
  private timer = 700;
  private readonly arc = Phaser.Math.DegToRad(150);
  get damage() { return (40 + 14 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1900 : 2300) / this.g.stats.haste; }
  get range() { return (120 + 12 * this.level) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.range).length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const angle = this.g.facing.angle();
    this.sweep(angle);
    if (this.level >= 5) this.sweep(angle + Math.PI);
  }

  private sweep(angle: number) {
    const p = this.g.player;
    const r = this.range;
    this.g.fx.slash(p.x, p.y, angle, r, 0xffe080);
    this.g.fx.slash(p.x, p.y, angle, r * 0.7, 0xffffff);
    for (const e of this.g.queryEnemies(p.x, p.y, r, this.near).slice()) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (r + e.def.radius) ** 2) continue;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) <= this.arc / 2) this.g.damageEnemy(e, this.damage, 220, p.x, p.y, this.id);
    }
  }
}

/** Escudo Bumerangue: escudo arremessado que atravessa os inimigos */
export class ShieldBoomerangSkill extends Skill {
  readonly id = 'bumerangue' as const;
  private timer = 500;
  get damage() { return (36 + 12 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return 1300 / this.g.stats.haste; }
  get count() { return [1, 1, 2, 2, 3][this.level - 1]; }
  get pierce() { return 3 + (this.level >= 2 ? 1 : 0) + (this.level >= 4 ? 1 : 0); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 480);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i % 2 ? 0.3 : -0.3) : 0);
      this.g.projectiles.fire('proj-escudo', p.x, p.y - 8, a, { src: this.id, speed: 470, damage: this.damage, pierce: this.pierce, radius: 13, life: 1200, knockback: 180 });
    }
  }
}

/** Cruz Sagrada: feixes de luz em cruz a partir do jogador */
export class GrandCrossSkill extends Skill {
  readonly id = 'cruz' as const;
  private timer = 800;
  get damage() { return (35 + 12 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 2200 : 2700) / this.g.stats.haste; }
  get length() { return (140 + 15 * this.level) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const len = this.length;
    if (!this.g.nearestEnemies(p.x, p.y, 1, len).length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const dirs = this.level >= 5 ? 8 : 4;
    const half = 22;
    this.g.fx.ring(p.x, p.y, 18, 4, 380, 0xffd04a, 0.55);
    this.g.fx.ring(p.x, p.y, 10, 2.5, 250, 0xffffff, 0.8);
    for (let d = 0; d < dirs; d++) {
      const a = (d / dirs) * Math.PI * 2;
      this.g.fx.lance(p.x, p.y, a, len, half * 2, 0xffd04a);
      this.g.fx.lance(p.x, p.y, a, len * 0.95, half * 0.8, 0xffffff);
    }
    for (const e of this.g.queryEnemies(p.x, p.y, len, this.near).slice()) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > len + e.def.radius) continue;
      // distância do inimigo até o feixe mais próximo
      const a = Math.atan2(dy, dx);
      const step = (Math.PI * 2) / dirs;
      const off = Math.abs(Phaser.Math.Angle.Wrap(a - Math.round(a / step) * step));
      if (Math.sin(off) * d <= half + e.def.radius) this.g.damageEnemy(e, this.damage, 160, p.x, p.y, this.id);
    }
  }
}

/** Disparo Duplo: duas flechas fortes seguidas */
export class DoubleStrafeSkill extends Skill {
  readonly id = 'duplo' as const;
  private timer = 400;
  get damage() { return (28 + 9 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1250 : 1550) / this.g.stats.haste; }
  get targets() { return 1 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 1 : 0); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.targets, 560);
    if (!targets.length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (const t of targets) {
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      for (let k = 0; k < 2; k++) {
        this.g.time.delayedCall(k * 110, () => {
          const shadow = this.g.shadowFx;
          this.g.projectiles.fire(this.g.arrowTex, p.x, p.y - 4, a, { src: this.id, speed: 700, damage: this.damage, pierce: 1, radius: 8, life: 1000, knockback: 120, scale: shadow ? 1.2 : 1.4, tint: shadow ? undefined : 0xfff0c0 });
        });
      }
    }
  }
}

/** Chuva de Flechas: flechas caem sobre um grupo e empurram */
export class ArrowShowerSkill extends Skill {
  readonly id = 'rajada' as const;
  private timer = 700;
  get damage() { return (20 + 7 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1900 : 2300) / this.g.stats.haste; }
  get radius() { return (70 + 8 * this.level) * this.g.stats.area; }
  get areas() { return this.level >= 5 ? 3 : this.level >= 3 ? 2 : 1; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, 8, 480);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    Phaser.Utils.Array.Shuffle(targets);
    for (let i = 0; i < this.areas; i++) {
      const t = targets[i % targets.length];
      const { x, y } = t;
      const r = this.radius;
      for (let k = 0; k < 5; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * r;
        this.g.fx.lance(x + Math.cos(a) * d, y + Math.sin(a) * d - 46, Math.PI / 2, 46, 10, 0xd8b070);
      }
      this.g.time.delayedCall(140, () => this.g.explode(x, y, r, this.damage, 240, 0xd8b070, this.id));
    }
  }
}

/** Armadilha Explosiva: armadilhas no chão que explodem quando pisadas */
export class TrapSkill extends Skill {
  readonly id = 'armadilha' as const;
  private timer = 600;
  private traps: { img: Phaser.GameObjects.Image; until: number }[] = [];
  get damage() { return (40 + 14 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1400 : 1800) / this.g.stats.haste; }
  get maxTraps() { return 1 + this.level; }
  get radius() { return (70 + (this.level >= 3 ? 12 : 0) + (this.level >= 5 ? 14 : 0)) * this.g.stats.area; }

  update(dt: number) {
    const now = this.g.elapsed;
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      const hit = this.g.queryEnemies(t.img.x, t.img.y, 26, this.near).some((e) => e.active && (e.x - t.img.x) ** 2 + (e.y - t.img.y) ** 2 < (26 + e.def.radius) ** 2);
      if (hit) {
        const r = this.radius;
        this.g.fx.anim('fx-cacador', ['explosao0', 'explosao1', 'explosao2', 'explosao3', 'explosao4', 'explosao5'], t.img.x, t.img.y - r * 0.25, 560, (r * 2.1) / 144, { hold: 0.75 });
        this.g.explode(t.img.x, t.img.y, r, this.damage, 260, 0xff8a3a, this.id);
        this.g.cameras.main.shake(70, 0.003);
      } else {
        // pavio piscando
        t.img.setFrame(Math.floor(now / 250) % 2 ? 'armadilha1' : 'armadilha0');
      }
      if (hit || now >= t.until) {
        t.img.destroy();
        this.traps.splice(i, 1);
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cooldown;
    if (this.traps.length >= this.maxTraps) return;
    const p = this.g.player;
    // deixa a armadilha um pouco atrás do jogador (os inimigos vêm seguindo)
    const x = p.x - this.g.facing.x * 30;
    const y = p.y - this.g.facing.y * 30 + 10;
    const img = this.g.add.image(x, y, 'fx-cacador', 'armadilha0').setScale(0.32).setDepth(-1e6 + 2);
    this.traps.push({ img, until: now + 14000 });
  }

  destroy() {
    this.traps.forEach((t) => t.img.destroy());
  }
}

/** Ataque do Falcão: mergulhos sobre inimigos da tela */
export class FalconSkill extends Skill {
  readonly id = 'falcao' as const;
  private timer = 800;
  get damage() { return (22 + 8 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 3 ? 1700 : 2100) / this.g.stats.haste; }
  get dives() { return [2, 3, 3, 4, 5][this.level - 1]; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, 16, 520);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    Phaser.Utils.Array.Shuffle(targets);
    for (let i = 0; i < this.dives; i++) {
      const t = targets[i % targets.length];
      const { x, y } = t;
      // o falcão mergulha de cima/esquerda até o alvo e as garras aparecem no impacto
      const from = Math.random() < 0.5 ? -1 : 1;
      this.g.time.delayedCall(i * 120, () => {
        this.g.fx.anim('fx-cacador', ['falcao0', 'falcao1', 'falcao2', 'falcao3'], x - 150 * from, y - 170, 260, 0.42, { x1: x - 8 * from, y1: y - 22, hold: 0.9, flipX: from < 0, depth: 2e6 });
      });
      this.g.time.delayedCall(i * 120 + 250, () => {
        this.g.fx.anim('fx-cacador', ['garra0', 'garra1', 'garra2'], x, y - 12, 300, 0.36, { hold: 0.5, flipX: from < 0 });
        if (t.active) this.g.explode(t.x, t.y, 40 * this.g.stats.area, this.damage, 80, 0xe8d0a0, this.id);
      });
    }
  }
}

/** Flecha Explosiva: flecha que explode em área */
export class ExplosiveArrowSkill extends Skill {
  readonly id = 'explosiva' as const;
  private timer = 500;
  get damage() { return (22 + 7 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 1400 : 1700) / this.g.stats.haste; }
  get count() { return [1, 1, 2, 2, 3][this.level - 1]; }
  get blast() { return (48 + 6 * this.level) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 560);
    if (!targets.length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i % 2 ? 0.2 : -0.2) : 0);
      this.g.projectiles.fire('proj-flecha', p.x, p.y - 4, a, {
        src: this.id, speed: 560, damage: this.damage, pierce: 1, radius: 8, life: 1100, knockback: 150, scale: 1.3, tint: 0xff9a50, explode: this.blast, explodeColor: 0xff7a2a,
      });
    }
  }
}


/** Investida Heroica: o Cavaleiro avança em linha reta ferindo todos no caminho (invulnerável no avanço) */
export class HeroicChargeSkill extends Skill {
  readonly id = 'investida' as const;
  private timer = 600;
  get damage() { return (60 + 18 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 3 ? 1700 : 2100) / this.g.stats.haste; }
  get dist() { return (130 + (this.level >= 2 ? 25 : 0) + (this.level >= 4 ? 25 : 0)) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, this.dist + 60)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    this.dash(a);
    // nível 5: volta com um segundo avanço
    if (this.level >= 5) this.g.time.delayedCall(260, () => this.dash(a + Math.PI));
  }

  private dash(a: number) {
    const p = this.g.player;
    const len = this.dist;
    const x0 = p.x;
    const y0 = p.y;
    this.g.grantInvuln(320);
    this.g.fx.lance(x0, y0 - 8, a, len + 30, 46, 0xe8eef8);
    // rastro de "imagens" do herói pelo caminho
    for (let k = 1; k <= 3; k++) this.g.fx.ring(x0 + Math.cos(a) * len * (k / 4), y0 + Math.sin(a) * len * (k / 4), 14, 1.8, 220, 0xcfe0ff, 0.35);
    p.setPosition(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
    p.setFlipX(Math.cos(a) < 0);
    for (const e of this.g.queryEnemies(x0 + Math.cos(a) * len / 2, y0 + Math.sin(a) * len / 2, len / 2 + 40, this.near).slice()) {
      if (!e.active) continue;
      const px = e.x - x0;
      const py = e.y - y0;
      const along = px * Math.cos(a) + py * Math.sin(a);
      const across = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
      if (along > -10 && along < len + 20 && across < 34 + e.def.radius) this.g.damageEnemy(e, this.damage, 220, x0, y0, this.id);
    }
  }
}

/** Corte em X: dois cortes cruzados à frente (cada inimigo leva dois golpes) */
export class XSlashSkill extends Skill {
  readonly id = 'cortex' as const;
  private timer = 400;
  private readonly arc = Phaser.Math.DegToRad(120);
  get damage() { return (24 + 10 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 3 ? 1250 : 1550) / this.g.stats.haste; }
  get range() { return (105 + (this.level >= 2 ? 15 : 0) + (this.level >= 4 ? 15 : 0)) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const t = this.g.nearestEnemies(p.x, p.y, 1, this.range + 20)[0];
    if (!t) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const a = Math.atan2(t.y - p.y, t.x - p.x);
    this.cross(a);
    if (this.level >= 5) this.cross(a + Math.PI);
  }

  private cross(a: number) {
    const p = this.g.player;
    const r = this.range;
    this.g.fx.slash(p.x, p.y, a - 0.5, r, 0xffffff);
    this.g.time.delayedCall(90, () => this.g.fx.slash(p.x, p.y, a + 0.5, r, 0xcfe0ff));
    const hit = (dmg: number) => {
      for (const e of this.g.queryEnemies(p.x, p.y, r, this.near).slice()) {
        if (!e.active) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy > (r + e.def.radius) ** 2) continue;
        if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - a)) <= this.arc / 2) this.g.damageEnemy(e, dmg, 90, p.x, p.y, this.id);
      }
    };
    hit(this.damage);
    this.g.time.delayedCall(90, () => hit(this.damage));
  }
}

/** Turbilhão de Lâminas: gira com a espada golpeando tudo em volta várias vezes */
export class WhirlwindSkill extends Skill {
  readonly id = 'turbilhao' as const;
  private timer = 900;
  get damage() { return (15 + 5 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 4 ? 3600 : 4200) / this.g.stats.haste; }
  get radius() { return (105 + 8 * this.level) * this.g.stats.area; }
  get spins() { return 3 + (this.level >= 3 ? 1 : 0) + (this.level >= 5 ? 2 : 0); }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.radius).length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let k = 0; k < this.spins; k++) {
      this.g.time.delayedCall(k * 140, () => {
        const pl = this.g.player;
        const r = this.radius;
        const a = k * 2.1;
        this.g.fx.slash(pl.x, pl.y, a, r, 0xcfe0ff);
        this.g.fx.slash(pl.x, pl.y, a + Math.PI, r * 0.9, 0xffffff);
        for (const e of this.g.queryEnemies(pl.x, pl.y, r, this.near).slice()) {
          if (e.active && (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 <= (r + e.def.radius) ** 2) this.g.damageEnemy(e, this.damage, 60, pl.x, pl.y, this.id);
        }
      });
    }
  }
}
