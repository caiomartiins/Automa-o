import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';

/**
 * Inteligência do Carniçal (mini-chefe zumbi).
 *  - Garras Pútridas: de perto, para e ataca com as garras (fere e envenena)
 *  - Investida Faminta: de média distância, dispara na direção do jogador
 */
export class ZombieAI {
  private nextClaw = 0;
  private nextLunge = 3000;
  private busyUntil = 0;
  private lungeUntil = 0;
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy, private cd = 1) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(2.1, 1.6).setAlpha(0.45);
    this.nextLunge += g.elapsed;
  }

  /** Retorna false quando o mini-chefe morreu */
  update(): boolean {
    const { g, e } = this;
    if (!e.active || e.def.id !== 'zumbi') {
      this.shadow.destroy();
      return false;
    }
    const now = g.elapsed;
    this.shadow.setPosition(e.x, e.y + 46).setDepth(e.y - 1);

    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    // investida em andamento: corre mais rápido
    e.speed = e.def.speed * (now < this.lungeUntil ? 3.2 : 1);
    if (now >= this.lungeUntil && e.anims.currentAnim?.key !== 'en-zumbi-move') e.play('en-zumbi-move');

    const d = Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y);
    if (d < 95 && now >= this.nextClaw) this.claw();
    else if (d > 170 && d < 420 && now >= this.nextLunge) this.lunge();
    return true;
  }

  private claw() {
    const { g, e } = this;
    this.nextClaw = g.elapsed + 1900 * this.cd;
    this.busyUntil = g.elapsed + 620;
    e.setFlipX(g.player.x < e.x);
    e.play('en-zumbi-attack');
    g.fx.ring(e.x, e.y, 105, 1, 320, 0x6a9a3a, 0.25);
    g.time.delayedCall(330, () => {
      if (!e.active) return;
      if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < 110 && g.hurtPlayer(e.damage, true)) {
        g.afflictPlayer('veneno', 3000);
      }
    });
  }

  private lunge() {
    const { g, e } = this;
    this.nextLunge = g.elapsed + 6500 * this.cd;
    // pequena pausa de aviso e depois dispara
    this.busyUntil = g.elapsed + 450;
    g.fx.ring(e.x, e.y + 30, 30, 2.5, 450, 0x9aff7a, 0.4);
    this.lungeUntil = g.elapsed + 450 + 900;
  }
}
