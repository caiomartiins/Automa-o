import Phaser from 'phaser';
import { Skill } from './Skill';
import type { GameScene } from '../scenes/GameScene';

/** Paladino: aura sagrada que fere quem chega perto e cura o herói. */
export class AuraSkill extends Skill {
  readonly id = 'aura' as const;
  private tick = 0;
  private ring: Phaser.GameObjects.Image;
  private rune: Phaser.GameObjects.Image;

  constructor(g: GameScene) {
    super(g);
    this.ring = g.add.image(0, 0, 'fx-ring').setTint(0xffe9a0).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);
    this.rune = g.add.image(0, 0, 'fx-anel').setTint(0xffd04a).setAlpha(0.55);
  }

  get damage() { return (7 + 3 * (this.level - 1)) * this.g.stats.might; }
  get radius() { return (85 + (this.level >= 5 ? 45 : 12 * (this.level - 1))) * this.g.stats.area; }
  get heal() { return 0.35 * this.level; }

  update(dt: number) {
    const p = this.g.player;
    const r = this.radius;
    const pulse = 1 + Math.sin(this.g.elapsed / 220) * 0.04;
    this.ring.setPosition(p.x, p.y + 10).setScale((r / 16) * pulse, (r / 16) * pulse * 0.75).setDepth(p.y - 2);
    // borda dourada da aura, pulsando
    this.rune.setPosition(p.x, p.y + 10).setScale((r / 64) * pulse, (r / 64) * pulse * 0.75).setDepth(p.y - 1).setAlpha(0.4 + 0.2 * Math.sin(this.g.elapsed / 180));

    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 500;
    this.g.hp = Math.min(this.g.stats.maxHp, this.g.hp + this.heal);
    // brilhos dourados subindo dentro da aura
    for (let k = 0; k < 2; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.8;
      this.g.fx.ring(p.x + Math.cos(a) * d, p.y + 10 + Math.sin(a) * d * 0.75, 3, 1.8, 450, 0xfff0a0, 0.9);
    }
    for (const e of this.g.queryEnemies(p.x, p.y, r, this.near)) {
      if (e.active && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (r + e.def.radius) ** 2) {
        this.g.damageEnemy(e, this.damage, 70, p.x, p.y, this.id);
      }
    }
  }

  destroy() {
    this.ring.destroy();
    this.rune.destroy();
  }
}
