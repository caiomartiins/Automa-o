import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';
import { FX_DEPTH } from './fx';

interface Orb {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
}

/**
 * Inteligência do Bafome, o primeiro chefe (aparece no nível 10).
 * Ataques, sempre com aviso antes para o jogador poder desviar:
 *  - Golpe Crescente: de perto, golpe de foice em volta dele
 *  - Rugido Demoníaco: esferas sombrias que voam até o jogador
 *  - Gêiser das Trevas: espinhos sobem do chão onde o jogador está
 */
export class BafomeAI {
  private nextSlash = 0;
  private nextRoar = 2000;
  private nextGeyser = 4500;
  private busyUntil = 0;
  private orbs: Orb[] = [];
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(3, 2.2).setAlpha(0.5);
    const now = g.elapsed;
    this.nextSlash += now;
    this.nextRoar += now;
    this.nextGeyser += now;
  }

  /** Retorna false quando o chefe morreu (e a IA pode ser descartada) */
  update(dt: number): boolean {
    this.updateOrbs(dt);
    const { g, e } = this;
    if (!e.active || e.def.id !== 'bafome') {
      if (this.orbs.length === 0) {
        this.shadow.destroy();
        return false;
      }
      this.shadow.setVisible(false);
      return true;
    }
    this.shadow.setPosition(e.x, e.y + 56).setDepth(e.y - 1);
    const now = g.elapsed;

    // parado enquanto ataca
    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    if (e.anims.currentAnim?.key !== 'en-bafome-move') e.play('en-bafome-move');

    const p = g.player;
    const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
    if (d < 160 && now >= this.nextSlash) this.slash();
    else if (d < 560 && now >= this.nextRoar) this.roar();
    else if (d < 700 && now >= this.nextGeyser) this.geyser();
    return true;
  }

  private busy(ms: number, anim: string) {
    this.busyUntil = this.g.elapsed + ms;
    this.e.play(anim);
  }

  private slash() {
    const { g, e } = this;
    this.nextSlash = g.elapsed + 2600;
    this.busy(800, 'en-bafome-slash');
    const r = 165;
    g.fx.ring(e.x, e.y, r, 1, 480, 0x9a2ab0, 0.22);
    g.time.delayedCall(480, () => {
      if (!e.active) return;
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.setFlipX(Math.cos(a) < 0);
      g.fx.slash(e.x, e.y, a, r, 0x7a2a9a);
      g.fx.slash(e.x, e.y, a + Math.PI, r * 0.8, 0x5a1a7a);
      g.cameras.main.shake(120, 0.006);
      if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < r + 12) g.hurtPlayer(32, true);
    });
  }

  private roar() {
    const { g, e } = this;
    this.nextRoar = g.elapsed + 4600;
    this.busy(700, 'en-bafome-roar');
    g.time.delayedCall(380, () => {
      if (!e.active) return;
      const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.setFlipX(Math.cos(base) < 0);
      for (const off of [-0.32, 0, 0.32]) {
        const a = base + off;
        const img = g.add.image(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40 - 10, 'fx-orbe').setDepth(FX_DEPTH - 2).setScale(0.5);
        this.orbs.push({ img, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 4200 });
      }
    });
  }

  private geyser() {
    const { g, e } = this;
    this.nextGeyser = g.elapsed + 6500;
    this.busy(900, 'en-bafome-slash');
    const p = g.player;
    const spots = [{ x: p.x, y: p.y }];
    for (let k = 0; k < 3; k++) spots.push({ x: p.x + Phaser.Math.Between(-140, 140), y: p.y + Phaser.Math.Between(-110, 110) });
    const r = 52;
    for (const s of spots) g.fx.ring(s.x, s.y, r, 1, 900, 0x6a1a7a, 0.4);
    g.time.delayedCall(900, () => {
      for (const s of spots) {
        const spike = g.add.image(s.x, s.y + 18, 'fx-geiser').setOrigin(0.5, 1).setDepth(s.y + 20).setScale(0.5, 0.05);
        g.tweens.add({ targets: spike, scaleY: 0.5, duration: 120, ease: 'Back.Out' });
        g.tweens.add({ targets: spike, alpha: 0, delay: 450, duration: 300, onComplete: () => spike.destroy() });
        if (Phaser.Math.Distance.Between(s.x, s.y, g.player.x, g.player.y) < r + 10) g.hurtPlayer(28, true);
      }
      g.cameras.main.shake(140, 0.005);
    });
  }

  private updateOrbs(dt: number) {
    const s = dt / 1000;
    const p = this.g.player;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      o.img.x += o.vx * s;
      o.img.y += o.vy * s;
      o.img.rotation += s * 4;
      const hit = Phaser.Math.Distance.Between(o.img.x, o.img.y, p.x, p.y) < 30;
      if (hit) this.g.hurtPlayer(22);
      if (hit || o.life <= 0) {
        o.img.destroy();
        this.orbs.splice(i, 1);
      }
    }
  }
}
