import Phaser from 'phaser';
import { applySheet, hasAnim, spriteHeight } from './assets';
import type { MonsterDef } from './data/monsters';
import type { SpawnDef } from './data/maps';
import { warnCircle } from './fx';
import type { World } from './world';
import { TILE } from './world';

/** O que o monstro precisa saber do jogo */
export interface Arena {
  stage: Phaser.Scene;
  world: World;
  player: { x: number; y: number; dead: boolean };
  monsterHitsPlayer(m: Monster, mult?: number, sure?: boolean): void;
  areaHitsPlayer(m: Monster, x: number, y: number, r: number, mult: number, effect?: 'curse'): void;
  shootOrb(m: Monster, angle: number, homing: boolean): void;
  summon(m: Monster, id: string, n: number): void;
  monsterAggro(m: Monster): void;
}

let NEXT_ID = 1;

export class Monster {
  id = NEXT_ID++;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  hp: number;
  maxHp: number;
  dead = false;
  aggro = false;
  state: 'idle' | 'chase' | 'return' = 'idle';
  atkT = 0.5;
  wanderT = Phaser.Math.FloatBetween(1, 4);
  wanderTo: { x: number; y: number } | null = null;
  path: { x: number; y: number }[] | null = null;
  pathT = 0;
  frozenUntil = 0;
  stunUntil = 0;
  slowUntil = 0;
  busyUntil = 0;
  lastHurt = -99;
  homeX: number;
  homeY: number;
  /** chefe */
  specialT = 4;
  summonT = 12;
  enraged = false;

  constructor(private arena: Arena, public def: MonsterDef, public spawn: SpawnDef | null, x: number, y: number, public minion = false) {
    const scene = arena.stage;
    this.maxHp = this.hp = def.hp;
    this.homeX = x; this.homeY = y;
    const scale = def.scale ?? 1;
    this.shadow = scene.add.image(x, y, 'shadow').setDisplaySize(def.radius * 2.4, def.radius * 0.9);
    this.sprite = scene.add.sprite(x, y, def.texture);
    applySheet(this.sprite, def.texture, scale);
    this.sprite.play(`${def.texture}-${hasAnim(scene, def.texture, 'idle') ? 'idle' : 'move'}`);
    this.sprite.setFlipX(Math.random() < 0.5);
    this.bar = scene.add.graphics();
    this.sync();
    // surge com um pequeno "pop"
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 300 });
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get height() { return spriteHeight(this.def.texture, this.def.scale ?? 1); }

  /** Distância entre os corpos (centro do jogador até a borda do monstro) */
  distTo(x: number, y: number) {
    return Math.hypot(this.x - x, this.y - y) - this.def.radius;
  }

  /** Clique dentro do sprite? */
  contains(px: number, py: number) {
    const h = this.height, w = this.def.radius * 2 + 16;
    return px > this.x - w / 2 && px < this.x + w / 2 && py > this.y - h && py < this.y + 10;
  }

  sync() {
    const { sprite, shadow, bar } = this;
    shadow.setPosition(sprite.x, sprite.y);
    sprite.setDepth(sprite.y);
    shadow.setDepth(sprite.y - 1000);
    bar.clear();
    if (!this.dead && (this.hp < this.maxHp) && !this.def.boss) {
      const w = Math.max(36, this.def.radius * 1.8), x = sprite.x - w / 2, y = sprite.y + 8;
      bar.fillStyle(0x1a1a2a, 0.85); bar.fillRect(x - 1, y - 1, w + 2, 6);
      bar.fillStyle(0xe04848, 1); bar.fillRect(x, y, w * (this.hp / this.maxHp), 4);
      bar.setDepth(sprite.y + 1);
    }
  }

  private play(anim: string) {
    const key = `${this.def.texture}-${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key && this.arena.stage.anims.exists(key)) this.sprite.play(key);
  }

  /** Anda em direção a (tx, ty) desviando das paredes */
  private stepToward(tx: number, ty: number, speed: number, dt: number) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const s = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * s, ny = this.y + (dy / d) * s;
    const w = this.arena.world;
    const r = Math.min(14, this.def.radius * 0.5);
    if (w.canStand(nx, ny, r)) this.sprite.setPosition(nx, ny);
    else if (w.canStand(nx, this.y, r)) this.sprite.x = nx;
    else if (w.canStand(this.x, ny, r)) this.sprite.y = ny;
    else return true;
    if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
    return d - s < 2;
  }

  private follow(tx: number, ty: number, speed: number, dt: number) {
    const w = this.arena.world;
    this.pathT -= dt;
    if (w.los(this.x, this.y, tx, ty, 12)) {
      this.path = null;
      this.stepToward(tx, ty, speed, dt);
      return;
    }
    if (!this.path || this.pathT <= 0) {
      this.path = w.findPath(this.x, this.y, tx, ty, 1500);
      this.pathT = 0.7;
    }
    if (this.path && this.path.length) {
      const p = this.path[0];
      if (this.stepToward(p.x, p.y, speed, dt)) this.path.shift();
    }
  }

  hurt(now: number) {
    this.lastHurt = now;
    if (!this.aggro) {
      this.aggro = true;
      this.arena.monsterAggro(this);
    }
    this.sprite.setTintFill(0xffffff);
    this.arena.stage.time.delayedCall(70, () => this.sprite.active && this.restoreTint(now));
  }

  restoreTint(now: number) {
    if (this.frozenUntil > now) this.sprite.setTint(0x9ee6ff);
    else if (this.enraged) this.sprite.setTint(0xff8a8a);
    else this.sprite.clearTint();
  }

  update(dt: number, now: number) {
    if (this.dead) return;
    const p = this.arena.player;
    if (this.frozenUntil > now || this.stunUntil > now) {
      this.sprite.anims.pause();
      this.sync();
      return;
    }
    if (this.sprite.anims.isPaused) { this.sprite.anims.resume(); this.restoreTint(now); }
    this.atkT -= dt;
    const speed = this.def.speed * (this.slowUntil > now ? 0.5 : 1) * (this.enraged ? 1.3 : 1);
    const dPlayer = Math.hypot(p.x - this.x, p.y - this.y);
    const leash = Math.hypot(this.x - this.homeX, this.y - this.homeY) > (this.def.boss ? 14 : 11) * TILE;

    if (this.state !== 'return') {
      if (!p.dead && (this.aggro || (this.def.aggressive && dPlayer < 300))) this.state = 'chase';
      else this.state = 'idle';
      if (this.state === 'chase' && leash && !this.minion) {
        this.state = 'return';
        this.aggro = false;
      }
    }

    if (now < this.busyUntil) { this.sync(); return; }

    if (this.state === 'return') {
      this.play('move');
      this.follow(this.homeX, this.homeY, speed * 1.2, dt);
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.2 * dt);
      if (Math.hypot(this.x - this.homeX, this.y - this.homeY) < 40) this.state = 'idle';
    } else if (this.state === 'chase') {
      if (this.def.boss && this.bossLogic(dt, now, dPlayer)) { this.sync(); return; }
      const reach = this.def.radius + 16 + this.def.reach;
      if (dPlayer > reach) {
        this.play('move');
        this.follow(p.x, p.y, speed, dt);
      } else {
        this.sprite.setFlipX(p.x < this.x);
        if (this.atkT <= 0) {
          this.atkT = this.def.atkDelay * (this.enraged ? 0.75 : 1);
          this.play('attack');
          this.arena.stage.time.delayedCall(180, () => {
            if (!this.dead && !p.dead && Math.hypot(p.x - this.x, p.y - this.y) <= reach + 30) this.arena.monsterHitsPlayer(this);
          });
          this.busyUntil = now + 0.35;
        } else if (now > this.busyUntil + 0.1) this.play('idle');
      }
    } else {
      // passeia pela área
      this.wanderT -= dt;
      if (this.wanderTo) {
        this.play('move');
        if (this.stepToward(this.wanderTo.x, this.wanderTo.y, speed * 0.45, dt)) this.wanderTo = null;
      } else this.play('idle');
      if (this.wanderT <= 0) {
        this.wanderT = Phaser.Math.FloatBetween(2.5, 6);
        const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(40, 140);
        let tx = this.x + Math.cos(a) * d, ty = this.y + Math.sin(a) * d;
        if (Math.hypot(tx - this.homeX, ty - this.homeY) > 5 * TILE) { tx = this.homeX; ty = this.homeY; }
        this.wanderTo = this.arena.world.canStand(tx, ty, 14) ? { x: tx, y: ty } : null;
      }
      if (!this.def.aggressive && this.hp < this.maxHp && now - this.lastHurt > 8) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.05 * dt);
    }
    this.sync();
  }

  /** Ataques especiais do Bafome. Devolve true quando está ocupado com um */
  private bossLogic(dt: number, now: number, dPlayer: number) {
    const a = this.arena, p = a.player, scene = a.stage;
    if (!this.enraged && this.hp < this.maxHp / 2) {
      this.enraged = true;
      this.sprite.setTint(0xff8a8a);
      this.summonT = 1;
    }
    if (this.enraged) {
      this.summonT -= dt;
      if (this.summonT <= 0) {
        this.summonT = 20;
        this.play('roar');
        a.summon(this, 'esqueleto', 3);
        this.busyUntil = now + 0.8;
        return true;
      }
    }
    this.specialT -= dt;
    if (this.specialT > 0) return false;
    this.specialT = Phaser.Math.FloatBetween(4, 6.5) * (this.enraged ? 0.7 : 1);
    const roll = Math.random();
    if (dPlayer < 180 && roll < 0.45) {
      // Golpe Crescente: aviso em volta dele, depois a foice gira
      const r = 150;
      warnCircle(scene, this.x, this.y, r, 900);
      this.play('slash');
      this.busyUntil = now + 1.2;
      scene.time.delayedCall(900, () => {
        if (this.dead) return;
        a.areaHitsPlayer(this, this.x, this.y, r, 1.6);
        const sweep = scene.add.image(this.x, this.y - 20, 'ring').setTint(0xb04aff).setBlendMode('ADD').setDepth(this.y + 5);
        sweep.setDisplaySize(40, 20);
        scene.tweens.add({ targets: sweep, displayWidth: r * 2.1, displayHeight: r * 1.05, alpha: 0, duration: 300, onComplete: () => sweep.destroy() });
      });
    } else if (roll < 0.75) {
      // Rugido Demoníaco: três esferas sombrias
      this.play('roar');
      this.busyUntil = now + 0.9;
      const base = Math.atan2(p.y - 30 - (this.y - 60), p.x - this.x);
      scene.time.delayedCall(400, () => {
        if (this.dead) return;
        for (const off of [-0.3, 0, 0.3]) a.shootOrb(this, base + off, this.enraged);
      });
    } else {
      // Gêiser das Trevas: marcas no chão, uma embaixo do jogador
      this.play('roar');
      this.busyUntil = now + 0.7;
      const spots: [number, number][] = [[p.x, p.y]];
      for (let i = 0; i < (this.enraged ? 4 : 2); i++) spots.push([p.x + Phaser.Math.Between(-160, 160), p.y + Phaser.Math.Between(-110, 110)]);
      for (const [x, y] of spots) {
        warnCircle(scene, x, y, 56, 1000, 0x7a2aff);
        scene.time.delayedCall(1000, () => {
          if (this.dead) return;
          a.areaHitsPlayer(this, x, y, 56, 1.1, 'curse');
          const spike = scene.add.particles(x, y, 'spark', {
            speedY: { min: -320, max: -160 }, speedX: { min: -30, max: 30 }, lifespan: 420, scale: { start: 0.9, end: 0 },
            tint: [0x7a2aff, 0x2a0a3a, 0xd08aff], quantity: 18, emitting: false,
          }).setDepth(y + 2);
          spike.explode(18);
          scene.time.delayedCall(600, () => spike.destroy());
        });
      }
    }
    return true;
  }

  die() {
    this.dead = true;
    this.bar.clear();
    this.sprite.clearTint();
    this.sprite.anims.resume();
    const scene = this.arena.stage;
    if (scene.anims.exists(`${this.def.texture}-die`)) this.sprite.play(`${this.def.texture}-die`);
    scene.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, delay: 650, duration: 450 });
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.bar.destroy();
  }
}
