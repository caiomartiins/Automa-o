import Phaser from 'phaser';
import { Enemy } from '../objects/Enemy';
import { Pickup } from '../objects/Pickup';
import { ENEMIES, hpScale, type EnemyDef } from '../data/enemies';
import { CLASSES, type ClassDef, type ClassId } from '../data/classes';
import { BASE_STATS, type Stats } from '../data/stats';
import type { SkillId } from '../data/skills';
import { rollUpgrades, type Upgrade } from '../data/upgrades';
import type { Skill } from '../skills/Skill';
import { FX_DEPTH } from '../skills/Skill';
import { createSkill } from '../skills';

/** XP necessária para passar do nível `l` para o `l + 1` */
export const xpForLevel = (l: number) => Math.floor(4 + (l - 1) * 3 + Math.pow(l - 1, 1.5));

const MAX_ENEMIES = 400;
const PLAYER_IFRAMES = 500;

export interface LevelUpData {
  level: number;
  promotion: ClassDef | null;
  options: Upgrade[];
}

export interface RunResult {
  time: number;
  level: number;
  className: string;
  kills: number;
}

export class GameScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  enemies!: Phaser.Physics.Arcade.Group;
  pickups!: Phaser.GameObjects.Group;

  // estado da partida (zerado em create(), pois a cena é reutilizada ao reiniciar)
  stats!: Stats;
  hp = 0;
  level = 1;
  xp = 0;
  xpNext = 0;
  classId: ClassId = 'aprendiz';
  skills = new Map<SkillId, Skill>();
  passives: Record<string, number> = {};
  facing = new Phaser.Math.Vector2(1, 0);
  elapsed = 0;
  kills = 0;

  private resolvedLevel = 1;
  private pendingLevelUps = 0;
  private choosing = false;
  private over = false;
  private spawnTimer = 0;
  private nextWaveAt = 60;
  private invulnUntil = 0;
  private hurtUntil = 0;
  private floatingTexts = 0;

  private bg!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private move = new Phaser.Math.Vector2();
  private joyOrigin: Phaser.Math.Vector2 | null = null;
  private joyVec = new Phaser.Math.Vector2();
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;

  constructor() {
    super('Game');
  }

  create() {
    this.stats = { ...BASE_STATS };
    this.hp = this.stats.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);
    this.classId = 'aprendiz';
    this.skills = new Map();
    this.passives = {};
    this.facing.set(1, 0);
    this.elapsed = 0;
    this.kills = 0;
    this.resolvedLevel = 1;
    this.pendingLevelUps = 0;
    this.choosing = false;
    this.over = false;
    this.spawnTimer = 600;
    this.nextWaveAt = 60;
    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.floatingTexts = 0;

    const { width, height } = this.scale;
    this.bg = this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0).setScrollFactor(0).setDepth(-1e7);

    this.player = this.physics.add.sprite(0, 0, CLASSES.aprendiz.texture);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(12, 8, 22);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.enemies = this.physics.add.group({ classType: Enemy, maxSize: MAX_ENEMIES });
    this.pickups = this.add.group({ classType: Pickup, maxSize: 600 });
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onEnemyTouch(e as unknown as Enemy));

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as typeof this.wasd;
    this.setupJoystick();

    this.addSkill(CLASSES.aprendiz.grantsSkill!);

    // Atalho de teste: L sobe um nível (só no modo de desenvolvimento)
    if (import.meta.env.DEV) kb.on('keydown-L', () => this.gainXp(this.xpNext - this.xp));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.skills.forEach((s) => s.destroy());
      kb.removeAllListeners('keydown-L');
    });

    this.scene.launch('UI');
  }

  update(_time: number, delta: number) {
    if (this.over) return;
    const dt = Math.min(delta, 50);
    this.elapsed += dt;

    this.updatePlayer(dt);
    this.skills.forEach((s) => s.update(dt));
    this.updateEnemies();
    this.updatePickups(dt);
    this.updateSpawner(dt);

    const cam = this.cameras.main;
    this.bg.setTilePosition(cam.scrollX, cam.scrollY);
  }

  // ---------------------------------------------------------------- jogador

  private updatePlayer(dt: number) {
    const m = this.move.set(0, 0);
    if (this.cursors.left.isDown || this.wasd.A.isDown) m.x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) m.x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) m.y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) m.y += 1;
    if (m.lengthSq() === 0 && this.joyVec.lengthSq() > 0) m.copy(this.joyVec);

    const moving = m.lengthSq() > 0;
    if (moving) {
      m.normalize();
      this.facing.copy(m);
      if (m.x !== 0) this.player.setFlipX(m.x < 0);
    }
    this.player.setVelocity(m.x * this.stats.speed, m.y * this.stats.speed);
    this.player.setAngle(moving ? Math.sin(this.elapsed / 70) * 7 : 0);
    this.player.setDepth(this.player.y);

    if (this.elapsed < this.hurtUntil) this.player.setTintFill(0xff5555);
    else this.player.clearTint();
    this.player.setAlpha(this.elapsed < this.invulnUntil ? 0.6 + 0.4 * Math.sin(this.elapsed / 30) : 1);

    this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.regen * dt) / 1000);
  }

  private onEnemyTouch(e: Enemy) {
    if (this.over || !e.active || this.elapsed < this.invulnUntil) return;
    const dmg = Math.max(1, e.def.damage - this.stats.armor);
    this.hp -= dmg;
    this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
    this.hurtUntil = this.elapsed + 100;
    this.cameras.main.shake(90, 0.004);
    this.floatText(this.player.x, this.player.y - 30, `-${dmg}`, '#ff5c5c');
    if (this.hp <= 0) this.gameOver();
  }

  private setupJoystick() {
    // joystick virtual simples para celular: toque e arraste em qualquer lugar
    this.joyBase = this.add.circle(0, 0, 50, 0xffffff, 0.12).setScrollFactor(0).setDepth(FX_DEPTH + 10).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 22, 0xffffff, 0.35).setScrollFactor(0).setDepth(FX_DEPTH + 11).setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) return;
      this.joyOrigin = new Phaser.Math.Vector2(p.x, p.y);
      this.joyBase.setPosition(p.x, p.y).setVisible(true);
      this.joyKnob.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joyOrigin || !p.isDown) return;
      const v = new Phaser.Math.Vector2(p.x - this.joyOrigin.x, p.y - this.joyOrigin.y);
      const len = Math.min(v.length(), 50);
      if (len < 8) { this.joyVec.set(0, 0); return; }
      v.normalize();
      this.joyVec.copy(v);
      this.joyKnob.setPosition(this.joyOrigin.x + v.x * len, this.joyOrigin.y + v.y * len);
    });
    const release = () => {
      this.joyOrigin = null;
      this.joyVec.set(0, 0);
      this.joyBase.setVisible(false);
      this.joyKnob.setVisible(false);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  // ---------------------------------------------------------------- inimigos

  private updateEnemies() {
    const px = this.player.x;
    const py = this.player.y;
    const cam = this.cameras.main;
    const farSq = (Math.hypot(cam.width, cam.height) * 0.9) ** 2;

    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      const dx = px - e.x;
      const dy = py - e.y;
      // inimigos que ficaram muito para trás reaparecem na frente do jogador
      if (dx * dx + dy * dy > farSq) {
        const p = this.ringPosition(0);
        e.setPosition(p.x, p.y);
        continue;
      }
      if (this.elapsed > e.knockUntil) {
        const a = Math.atan2(dy, dx);
        e.setVelocity(Math.cos(a) * e.def.speed, Math.sin(a) * e.def.speed);
      }
      e.setFlipX(dx < 0);
      e.setDepth(e.y);
      if (e.flashUntil && this.elapsed > e.flashUntil) {
        e.clearTint();
        e.flashUntil = 0;
      }
    }
  }

  private updateSpawner(dt: number) {
    const t = this.elapsed / 1000;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(160, 1000 - t * 2.8);
      const batch = 1 + Math.floor(t / 45);
      for (let i = 0; i < batch; i++) this.spawnEnemy(this.pickEnemy(t));
    }

    // a cada minuto, uma horda cerca o jogador
    if (t >= this.nextWaveAt) {
      this.nextWaveAt += 60;
      const common = ENEMIES.filter((d) => !d.elite && t >= d.from);
      const def = common[common.length - 1];
      const count = 24 + Math.floor(t / 30) * 2;
      for (let i = 0; i < count; i++) {
        const p = this.ringPosition((i / count) * Math.PI * 2);
        this.spawnEnemy(def, p.x, p.y);
      }
      const elite = ENEMIES.find((d) => d.elite)!;
      if (t >= 300) this.spawnEnemy(elite);
      this.events.emit('announce', t >= 300 ? 'Uma horda e um Cavaleiro Negro se aproximam!' : 'Uma horda se aproxima!');
    }
  }

  private pickEnemy(t: number): EnemyDef {
    const pool = ENEMIES.filter((d) => t >= d.from);
    const total = pool.reduce((s, d) => s + d.weight, 0);
    let r = Math.random() * total;
    for (const d of pool) {
      r -= d.weight;
      if (r <= 0) return d;
    }
    return pool[0];
  }

  /** Ponto logo fora da tela, ao redor do jogador */
  private ringPosition(angle?: number) {
    const cam = this.cameras.main;
    const r = Math.hypot(cam.width, cam.height) / 2 + 50;
    const a = angle ?? Math.random() * Math.PI * 2;
    return { x: this.player.x + Math.cos(a) * r, y: this.player.y + Math.sin(a) * r };
  }

  private spawnEnemy(def: EnemyDef, x?: number, y?: number) {
    if (this.enemies.countActive(true) >= MAX_ENEMIES) return;
    if (x === undefined || y === undefined) ({ x, y } = this.ringPosition());
    const e = this.enemies.get(x, y) as Enemy | null;
    if (!e) return;
    e.spawn(def, x, y, hpScale(this.elapsed / 1000));
  }

  /** Aplica dano a um inimigo (usado por todas as habilidades) */
  damageEnemy(e: Enemy, amount: number, knockback: number, fromX: number, fromY: number) {
    if (!e.active) return;
    const dmg = Math.max(1, Math.round(amount * Phaser.Math.FloatBetween(0.9, 1.1)));
    e.hp -= dmg;
    e.setTintFill(0xffffff);
    e.flashUntil = this.elapsed + 70;
    this.floatText(e.x, e.y - 20, `${dmg}`, '#ffffff');

    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    const kb = knockback * e.def.knockback;
    if (kb > 0) {
      const a = Math.atan2(e.y - fromY, e.x - fromX);
      e.setVelocity(Math.cos(a) * kb, Math.sin(a) * kb);
      e.knockUntil = this.elapsed + 120;
    }
  }

  private killEnemy(e: Enemy) {
    const { x, y } = e;
    const def = e.def;
    e.kill();
    this.kills++;

    const poof = this.add.circle(x, y, def.radius, 0xffffff, 0.5).setDepth(FX_DEPTH);
    this.tweens.add({ targets: poof, scale: 1.8, alpha: 0, duration: 200, onComplete: () => poof.destroy() });

    this.dropPickup('xp', def.xp, x, y);
    if (Math.random() < (def.elite ? 1 : 0.012)) this.dropPickup('comida', 30, x + 12, y);
  }

  // ---------------------------------------------------------------- itens e XP

  private dropPickup(kind: 'xp' | 'comida', value: number, x: number, y: number) {
    const p = this.pickups.get(x, y) as Pickup | null;
    if (!p) {
      if (kind === 'xp') this.gainXp(value);
      return;
    }
    p.place(kind, value, x, y);
  }

  private updatePickups(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    const magnetSq = this.stats.magnet ** 2;
    const step = (450 * dt) / 1000;

    for (const p of this.pickups.getChildren() as Pickup[]) {
      if (!p.active) continue;
      const dx = px - p.x;
      const dy = py - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 20 * 20) {
        p.release();
        if (p.kind === 'xp') this.gainXp(p.value);
        else {
          this.hp = Math.min(this.stats.maxHp, this.hp + p.value);
          this.floatText(px, py - 30, `+${p.value}`, '#7dff6b');
        }
        if (this.choosing) return;
        continue;
      }
      if (p.magnetized || d2 < magnetSq) {
        p.magnetized = true;
        const d = Math.sqrt(d2);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
  }

  gainXp(amount: number) {
    if (this.over) return;
    this.xp += amount;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0 && !this.choosing) {
      this.choosing = true;
      const data = this.nextLevelUp()!;
      this.scene.pause();
      this.scene.launch('LevelUp', data);
    }
  }

  /**
   * Prepara a próxima tela de level up (ou null se não houver mais).
   * Chamada pela LevelUpScene depois de cada escolha.
   */
  nextLevelUp(): LevelUpData | null {
    if (this.pendingLevelUps <= 0) {
      this.choosing = false;
      return null;
    }
    this.pendingLevelUps--;
    this.resolvedLevel++;

    let promotion: ClassDef | null = null;
    const next = CLASSES[this.classId].next;
    if (next && this.resolvedLevel >= CLASSES[next].minLevel) {
      this.promote(next);
      promotion = CLASSES[next];
    }
    return { level: this.resolvedLevel, promotion, options: rollUpgrades(this, 3) };
  }

  // ---------------------------------------------------------------- classes e habilidades

  addSkill(id: SkillId) {
    const existing = this.skills.get(id);
    if (existing) existing.levelUp();
    else this.skills.set(id, createSkill(id, this));
  }

  private promote(id: ClassId) {
    const def = CLASSES[id];
    this.classId = id;
    for (const [k, v] of Object.entries(def.statBonus) as [keyof Stats, number][]) this.stats[k] += v;
    this.hp = this.stats.maxHp;
    this.player.setTexture(def.texture);
    if (def.grantsSkill) this.addSkill(def.grantsSkill);
    this.cameras.main.flash(500, 255, 230, 150);

    // onda de choque da promoção empurra os inimigos próximos
    const blast = this.add.circle(this.player.x, this.player.y, 30, 0xffe9a0, 0.5).setDepth(FX_DEPTH);
    this.tweens.add({ targets: blast, scale: 8, alpha: 0, duration: 500, onComplete: () => blast.destroy() });
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 240) {
        this.damageEnemy(e, 40 * this.stats.might, 500, this.player.x, this.player.y);
      }
    }
  }

  // ---------------------------------------------------------------- utilidades

  private floatText(x: number, y: number, text: string, color: string) {
    if (this.floatingTexts > 60) return;
    this.floatingTexts++;
    const t = this.add
      .text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '16px', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1);
    this.tweens.add({
      targets: t, y: y - 26, alpha: 0, duration: 550,
      onComplete: () => { t.destroy(); this.floatingTexts--; },
    });
  }

  private gameOver() {
    this.over = true;
    this.physics.pause();
    this.player.setTint(0x555555);
    const result: RunResult = {
      time: this.elapsed,
      level: this.level,
      className: CLASSES[this.classId].name,
      kills: this.kills,
    };
    this.time.delayedCall(800, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', result);
    });
  }
}
