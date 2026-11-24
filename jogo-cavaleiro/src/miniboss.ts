import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';
import { Hazards } from './hazards';

/**
 * Inteligência do Carniçal (mini-chefe zumbi).
 *  - Garras Pútridas: de perto, para e ataca com as garras (fere e envenena)
 *  - Investida Faminta: de média distância, dispara na direção do jogador
 *  - Vômito Pútrido: leque de vômito que envenena e deixa uma poça tóxica no chão
 */
export class ZombieAI {
  private nextClaw = 0;
  private nextLunge = 3000;
  private nextVomit = 4500;
  private busyUntil = 0;
  private hazards: Hazards;
  private lungeUntil = 0;
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy, private cd = 1) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(2.1, 1.6).setAlpha(0.45);
    this.nextLunge += g.elapsed;
    this.nextVomit += g.elapsed;
    this.hazards = new Hazards(g);
  }

  private get alive() {
    return this.e.active && this.e.def.id === 'zumbi';
  }

  /** O jogador está no leque (115°) à frente, até `r`? */
  private inCone(a: number, r: number) {
    const { g, e } = this;
    const d = Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(g.player.y - e.y, g.player.x - e.x) - a));
    return d < r + 10 && (diff < 1.05 || d < 40);
  }

  /** Retorna false quando o mini-chefe morreu */
  update(): boolean {
    this.hazards.update();
    const { g, e } = this;
    if (!e.active || e.def.id !== 'zumbi') {
      this.hazards.clear();
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
    else if (d > 90 && d < 230 && now >= this.nextVomit) this.vomit();
    else if (d > 170 && d < 420 && now >= this.nextLunge) this.lunge();
    return true;
  }

  private claw() {
    const { g, e } = this;
    this.nextClaw = g.elapsed + 1900 * this.cd;
    this.busyUntil = g.elapsed + 620;
    e.setFlipX(g.player.x < e.x);
    e.play('en-zumbi-attack');
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    g.fx.warnCone(e.x, e.y, a, 115, 330, 0xe8ff4a);
    g.time.delayedCall(330, () => {
      if (!this.alive) return;
      g.fx.slash(e.x, e.y, a, 115, 0xb8ff8a);
      if (this.inCone(a, 115) && g.hurtPlayer(e.damage, true)) g.afflictPlayer('veneno', 3000);
    });
  }

  private lunge() {
    const { g, e } = this;
    this.nextLunge = g.elapsed + 6500 * this.cd;
    // pequena pausa de aviso e depois dispara
    this.busyUntil = g.elapsed + 450;
    g.fx.ring(e.x, e.y + 30, 30, 2.5, 450, 0x9aff7a, 0.4);
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    g.fx.warnLine(e.x, e.y + 20, a, 300, 60, 450, 0xe8ff4a);
    this.lungeUntil = g.elapsed + 450 + 900;
  }

  /** Vômito Pútrido: leque que envenena e deixa uma poça tóxica que fere por um tempo */
  private vomit() {
    const { g, e } = this;
    this.nextVomit = g.elapsed + 7000 * this.cd;
    this.busyUntil = g.elapsed + 950;
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    e.setFlipX(Math.cos(a) < 0);
    e.play('en-zumbi-attack');
    const r = 190;
    g.fx.warnCone(e.x, e.y, a, r, 620, 0xd8ff3a);
    g.time.delayedCall(620, () => {
      if (!this.alive) return;
      g.fx.slash(e.x, e.y, a, r, 0x9ad04a);
      for (let k = 0; k < 3; k++) {
        const dd = 60 + k * 50;
        g.fx.ring(e.x + Math.cos(a) * dd, e.y + Math.sin(a) * dd, 16, 2.4, 380, 0x8ad04a, 0.55);
      }
      if (this.inCone(a, r) && g.hurtPlayer(e.damage * 0.8, true)) g.afflictPlayer('veneno', 3500);
      const px = e.x + Math.cos(a) * 115;
      const py = e.y + Math.sin(a) * 115;
      const pr = 80;
      const img = g.add.image(px, py, 'fx-ring').setTint(0xd8f040).setAlpha(0.5).setScale(pr / 16, (pr * 0.6) / 16).setDepth(-1e6 + 2);
      this.hazards.add({ x: px, y: py, r: pr, flat: 0.6, until: g.elapsed + 4200, dmg: e.damage * 0.3, every: 600, img, delay: 300, status: { kind: 'veneno', ms: 2500 } });
    });
  }
}
