import Phaser from 'phaser';
import { FX_DEPTH, Skill } from './Skill';
import type { GameScene } from '../scenes/GameScene';

const COUNT_BY_LEVEL = [1, 2, 2, 3, 4];

/** Escudos que orbitam o herói (habilidade do Guarda). */
export class ShieldSkill extends Skill {
  readonly id = 'escudo' as const;
  private shields: Phaser.GameObjects.Image[] = [];
  private angle = 0;

  constructor(g: GameScene) {
    super(g);
    this.syncShields();
  }

  get damage() { return (8 + 4 * (this.level - 1)) * this.g.stats.might; }
  get radius() { return (80 + 6 * (this.level - 1)) * this.g.stats.area; }
  get spin() { return 3 + 0.35 * (this.level - 1); }

  protected onLevelChanged() {
    this.syncShields();
  }

  private syncShields() {
    const count = COUNT_BY_LEVEL[this.level - 1];
    while (this.shields.length < count) {
      this.shields.push(this.g.add.image(0, 0, 'escudo').setDepth(FX_DEPTH));
    }
  }

  update(dt: number) {
    this.angle += (this.spin * dt) / 1000;
    const p = this.g.player;
    const r = this.radius;
    const n = this.shields.length;
    const scale = this.g.stats.area;
    const enemies = this.enemies();

    this.shields.forEach((s, i) => {
      const a = this.angle + (i / n) * Math.PI * 2;
      s.setPosition(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r).setScale(scale).setRotation(a + Math.PI / 2);
      for (const e of enemies) {
        if (e.shieldHitAt > this.g.elapsed) continue;
        const hit = 14 * scale + e.def.radius;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        if (dx * dx + dy * dy < hit * hit) {
          e.shieldHitAt = this.g.elapsed + 400;
          this.g.damageEnemy(e, this.damage, 220, p.x, p.y);
        }
      }
    });
  }

  destroy() {
    this.shields.forEach((s) => s.destroy());
  }
}
