import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';

import type { BossPower } from './boss';

const PHASES = [
  { swing: 1900, smash: 4000, charge: 5200, quake: 6500, lines: 3, swingDmg: 40, smashDmg: 48, chargeDmg: 46, quakeDmg: 44, speed: 1, warn: 360, smashWarn: 650 },
  { swing: 1500, smash: 3200, charge: 4200, quake: 5000, lines: 5, swingDmg: 48, smashDmg: 58, chargeDmg: 56, quakeDmg: 54, speed: 1.3, warn: 300, smashWarn: 550 },
];

/**
 * Inteligência do Minotauro Brutal (segundo chefe).
 *  - Golpe Horizontal: de perto, um giro da maça em volta dele
 *  - Golpe Vertical: marca o chão onde o jogador está, salta e esmaga (onda de choque)
 *  - Investida de Touro: faixa de aviso e corrida muito rápida em linha reta
 *    (na fúria emenda três investidas seguidas, mirando de novo a cada uma)
 *  - Fenda Sísmica: soca o chão e abre rachaduras em leque na direção do jogador
 *  - 2ª fase (metade da vida): BLOQUEIO com escudo, recebendo 80% menos dano por 2,5 s
 */
export class MinotaurAI {
  private nextSwing = 0;
  private nextSmash = 2500;
  private nextCharge = 4500;
  private nextQuake = 3500;
  private nextBlock = 0;
  /** Investidas que ainda faltam na sequência da fúria */
  private combo = 0;
  private busyUntil = 0;
  private phase = 0;
  private charge: { vx: number; vy: number; until: number; hit: boolean } | null = null;
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy, private pw: BossPower = { dmg: 1, cd: 1, enraged: false }) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(3, 2.2).setAlpha(0.5);
    const now = g.elapsed;
    this.nextSmash += now;
    this.nextCharge += now;
    this.nextQuake += now;
  }

  private get alive() {
    return this.e.active && this.e.def.id === 'minotauro';
  }

  private get P() {
    return PHASES[this.phase];
  }

  /** Retorna false quando o chefe morreu */
  update(): boolean {
    const { g, e } = this;
    if (!e.active || e.def.id !== 'minotauro') {
      this.shadow.destroy();
      return false;
    }
    const now = g.elapsed;
    this.shadow.setPosition(e.x, e.y + 54).setDepth(e.y - 1);
    e.speed = e.def.speed * this.P.speed;
    if (this.phase === 0 && (this.pw.enraged || e.hp <= e.maxHp * 0.5)) this.enrage();

    if (this.charge) {
      e.vx = this.charge.vx;
      e.vy = this.charge.vy;
      e.knockUntil = now + 50;
      if (!this.charge.hit && Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < 72) {
        this.charge.hit = g.hurtPlayer(this.P.chargeDmg * this.pw.dmg, true);
      }
      if (now >= this.charge.until) {
        this.charge = null;
        e.vx = e.vy = 0;
        g.dust(e.x, e.y + 30);
        if (this.combo > 0) {
          // fúria: mira de novo e investe outra vez, com aviso mais curto
          this.combo--;
          this.startCharge(430);
        } else e.play('en-minotauro-move');
      }
      return true;
    }
    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    if (e.blocking) {
      e.blocking = false;
      e.restoreTint(now);
    }
    if (e.anims.currentAnim?.key !== 'en-minotauro-move') e.play('en-minotauro-move');

    const d = Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y);
    if (this.phase === 1 && now >= this.nextBlock) this.block();
    else if (d < 160 && now >= this.nextSwing) this.swing();
    else if (d > 240 && d < 640 && now >= this.nextCharge) this.startCharge();
    else if (d > 150 && d < 600 && now >= this.nextQuake) this.quake();
    else if (d < 560 && now >= this.nextSmash) this.smash();
    return true;
  }

  private busy(ms: number, anim: string) {
    this.busyUntil = this.g.elapsed + ms;
    this.e.play(anim);
  }

  private enrage() {
    const { g, e } = this;
    this.phase = 1;
    this.nextBlock = g.elapsed + 800;
    e.def = { ...e.def, tint: 0xffa0a0 };
    e.restoreTint(g.elapsed);
    g.cameras.main.shake(500, 0.01);
    g.fx.ring(e.x, e.y, 40, 8, 600, 0xff6a3a, 0.5);
    g.events.emit('announce', 'O MINOTAURO ESTÁ FURIOSO!');
  }

  /** Bloqueio: recebe 80% menos dano por 2,5 s */
  private block() {
    const { g, e } = this;
    this.nextBlock = g.elapsed + 9000;
    this.busy(2500, 'en-minotauro-block');
    e.blocking = true;
    e.setTint(0xb8c8ff);
    g.events.emit('toast', 'O Minotauro está bloqueando!', '#b8c8ff');
  }

  private swing() {
    const { g, e } = this;
    this.nextSwing = g.elapsed + this.P.swing * this.pw.cd;
    this.busy(600, 'en-minotauro-swing');
    const r = 170;
    g.fx.warnCircle(e.x, e.y, r, this.P.warn, 0xd8843a);
    g.time.delayedCall(this.P.warn, () => {
      if (!this.alive) return;
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.setFlipX(Math.cos(a) < 0);
      g.fx.slash(e.x, e.y, a, r, 0xe8c08a);
      g.fx.slash(e.x, e.y, a + Math.PI, r * 0.9, 0xc89a6a);
      g.cameras.main.shake(130, 0.007);
      if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < r + 10) g.hurtPlayer(this.P.swingDmg * this.pw.dmg, true);
    });
  }

  /** Golpe Vertical: salta até a marca e esmaga, com onda de choque */
  private smash() {
    const { g, e } = this;
    this.nextSmash = g.elapsed + this.P.smash * this.pw.cd;
    const tx = g.player.x;
    const ty = g.player.y;
    const r = this.phase ? 150 : 125;
    const warn = this.P.smashWarn;
    this.busy(warn + 250, 'en-minotauro-smash');
    g.fx.warnCircle(tx, ty, r, warn, 0xd8642a);
    g.tweens.add({ targets: e, x: tx, y: ty - 20, duration: warn, ease: 'Sine.InOut' });
    g.time.delayedCall(warn, () => {
      if (!this.alive) return;
      g.cameras.main.shake(220, 0.012);
      g.fx.ring(tx, ty, r * 0.4, 2.6, 380, 0xe8a060, 0.6);
      g.dust(tx, ty + 20);
      if (Phaser.Math.Distance.Between(tx, ty, g.player.x, g.player.y) < r + 10) {
        if (g.hurtPlayer(this.P.smashDmg * this.pw.dmg, true)) g.afflictPlayer('maldicao', 2000);
      }
    });
  }

  private startCharge(windup = 600) {
    const { g, e } = this;
    if (windup === 600) {
      this.nextCharge = g.elapsed + this.P.charge * this.pw.cd;
      this.combo = this.phase ? 2 : 0;
    }
    this.busy(windup, 'en-minotauro-block');
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    e.setFlipX(Math.cos(a) < 0);
    const len = 560;
    g.fx.warnLine(e.x, e.y + 20, a, len, 100, windup, 0xd8642a);
    g.time.delayedCall(windup, () => {
      if (!this.alive) return;
      e.play('en-minotauro-run');
      const speed = 1150;
      this.charge = { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, until: g.elapsed + (len / speed) * 1000, hit: false };
    });
  }

  /** Fenda Sísmica: rachaduras em leque saem do chão na direção do jogador */
  private quake() {
    const { g, e } = this;
    const P = this.P;
    this.nextQuake = g.elapsed + P.quake * this.pw.cd;
    const warn = this.phase ? 650 : 760;
    this.busy(warn + 350, 'en-minotauro-smash');
    const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    e.setFlipX(Math.cos(base) < 0);
    const n = P.lines;
    const spread = this.phase ? 1.5 : 0.95;
    const len = 540;
    const width = 56;
    const ox = e.x;
    const oy = e.y + 30;
    const angles = Array.from({ length: n }, (_, k) => base + (k / (n - 1) - 0.5) * spread);
    for (const a of angles) g.fx.warnLine(ox, oy, a, len, width, warn, 0xd8843a);
    g.time.delayedCall(warn, () => {
      if (!this.alive) return;
      g.cameras.main.shake(260, 0.012);
      g.dust(ox, oy);
      // a rachadura corre do Minotauro para longe
      for (const a of angles) {
        for (let s = 1; s <= 8; s++) {
          const x = ox + Math.cos(a) * (s / 8) * len;
          const y = oy + Math.sin(a) * (s / 8) * len;
          g.time.delayedCall(s * 26, () => {
            const spike = g.add.image(x, y + 14, 'fx-geiser').setOrigin(0.5, 1).setDepth(y + 14).setTint(0xb48050).setScale(0.42, 0.05);
            g.tweens.add({ targets: spike, scaleY: 0.42, duration: 110, ease: 'Back.Out' });
            g.tweens.add({ targets: spike, alpha: 0, delay: 380, duration: 260, onComplete: () => spike.destroy() });
          });
        }
      }
      const px = g.player.x - ox;
      const py = g.player.y - oy;
      for (const a of angles) {
        const along = px * Math.cos(a) + py * Math.sin(a);
        const across = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
        if (along > 0 && along < len && across < width / 2 + 12) {
          if (g.hurtPlayer(P.quakeDmg * this.pw.dmg, true)) g.afflictPlayer('maldicao', 1500);
          break;
        }
      }
    });
  }
}
