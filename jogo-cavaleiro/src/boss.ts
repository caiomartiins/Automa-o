import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';

/** Força extra de um chefe que volta (2ª vez em diante) */
export interface BossPower {
  dmg: number;
  cd: number;
  enraged: boolean;
}
import { ENEMIES } from './data/enemies';
import { FX_DEPTH } from './fx';

interface Orb {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  /** Esferas da 2ª fase perseguem o jogador por um tempo */
  homing: number;
  /** Dano próprio (as da espiral ferem menos) */
  dmg?: number;
}

/** Tempos de recarga (ms) e quantidades por fase */
const PHASES = [
  { slash: 2400, roar: 4000, geyser: 5800, dash: 7800, spiral: 9500, arms: 2, shots: 10, orbs: 5, spots: 5, slashDmg: 36, orbDmg: 22, geyserDmg: 29, dashDmg: 32, speed: 1 },
  { slash: 1800, roar: 2900, geyser: 4300, dash: 5200, spiral: 7000, arms: 3, shots: 14, orbs: 7, spots: 8, slashDmg: 44, orbDmg: 27, geyserDmg: 36, dashDmg: 40, speed: 1.25 },
];

/**
 * Inteligência do Bafome, o primeiro chefe (aparece no nível 15).
 * Ataques, sempre com aviso antes para o jogador poder desviar:
 *  - Golpe Crescente: de perto, golpe de foice em volta dele
 *  - Rugido Demoníaco: leque de esferas sombrias
 *  - Gêiser das Trevas: espinhos sobem do chão em volta do jogador (amaldiçoam)
 *  - Investida das Sombras: avança muito rápido em linha reta
 *  - Espiral Infernal: gira no lugar soltando braços de esferas (passe entre eles)
 * Com metade da vida entra em FÚRIA: fica vermelho, mais rápido, ataca mais
 * e invoca servos (esqueletos e o Cavaleiro Negro).
 */
export class BafomeAI {
  private nextSlash = 0;
  private nextRoar = 1500;
  private nextGeyser = 3500;
  private nextDash = 5500;
  private nextSpiral = 8000;
  private nextSummon = 0;
  private busyUntil = 0;
  private phase = 0;
  private orbs: Orb[] = [];
  private shadow: Phaser.GameObjects.Image;
  private dash: { vx: number; vy: number; until: number; hit: boolean } | null = null;

  constructor(private g: GameScene, private e: Enemy, private pw: BossPower = { dmg: 1, cd: 1, enraged: false }) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(3, 2.2).setAlpha(0.5);
    const now = g.elapsed;
    this.nextSlash += now;
    this.nextRoar += now;
    this.nextGeyser += now;
    this.nextDash += now;
    this.nextSpiral += now;
  }

  private get alive() {
    return this.e.active && this.e.def.id === 'bafome';
  }

  private get P() {
    return PHASES[this.phase];
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

    // velocidade de acordo com a fase (o resto do movimento é feito pelo jogo)
    e.speed = e.def.speed * this.P.speed;

    if (this.phase === 0 && (this.pw.enraged || e.hp <= e.maxHp * 0.5)) this.enrage();
    if (this.phase === 1 && now >= this.nextSummon) this.summon();

    // investida em andamento
    if (this.dash) {
      e.vx = this.dash.vx;
      e.vy = this.dash.vy;
      e.knockUntil = now + 50;
      g.fx.ring(e.x, e.y + 20, 26, 1.6, 220, this.phase ? 0xff3a3a : 0x6a1a7a, 0.35);
      if (!this.dash.hit && Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < 70) {
        this.dash.hit = g.hurtPlayer(this.P.dashDmg * this.pw.dmg, true);
      }
      if (now >= this.dash.until) {
        this.dash = null;
        e.vx = e.vy = 0;
      }
      return true;
    }

    // parado enquanto ataca
    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    if (e.anims.currentAnim?.key !== 'en-bafome-move') e.play('en-bafome-move');

    const p = g.player;
    const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
    if (d < 170 && now >= this.nextSlash) this.slash();
    else if (d > 220 && d < 650 && now >= this.nextDash) this.startDash();
    else if (d < 520 && now >= this.nextSpiral) this.spiral();
    else if (d < 600 && now >= this.nextRoar) this.roar();
    else if (d < 750 && now >= this.nextGeyser) this.geyser();
    return true;
  }

  private busy(ms: number, anim: string) {
    this.busyUntil = this.g.elapsed + ms;
    this.e.play(anim);
  }

  /** 2ª fase: fúria */
  private enrage() {
    const { g, e } = this;
    this.phase = 1;
    this.nextSummon = g.elapsed + 500;
    e.def = { ...e.def, tint: 0xff8a8a };
    e.restoreTint(g.elapsed);
    g.cameras.main.shake(600, 0.012);
    g.cameras.main.flash(400, 150, 0, 30);
    g.fx.ring(e.x, e.y, 40, 9, 700, 0xff2a2a, 0.5);
    g.events.emit('announce', 'O BAFOME ENTROU EM FÚRIA!');
  }

  /** Invoca servos em volta dele */
  private summon() {
    const { g, e } = this;
    this.nextSummon = g.elapsed + 18000;
    const skeleton = ENEMIES.find((d) => d.id === 'esqueleto')!;
    const knight = ENEMIES.find((d) => d.id === 'cavaleiro-negro')!;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.spawnMinion(k === 0 ? knight : skeleton, e.x + Math.cos(a) * 110, e.y + Math.sin(a) * 110);
    }
    g.fx.ring(e.x, e.y, 30, 5, 500, 0x6a1a7a, 0.5);
  }

  private slash() {
    const { g, e } = this;
    this.nextSlash = g.elapsed + this.P.slash * this.pw.cd;
    this.busy(700, 'en-bafome-slash');
    const r = this.phase ? 200 : 175;
    const warn = this.phase ? 380 : 450;
    g.fx.warnCircle(e.x, e.y, r, warn, this.phase ? 0xff3a3a : 0x9a2ab0);
    g.time.delayedCall(warn, () => {
      if (!this.alive) return;
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.setFlipX(Math.cos(a) < 0);
      g.fx.slash(e.x, e.y, a, r, 0x7a2a9a);
      g.fx.slash(e.x, e.y, a + Math.PI, r * 0.85, 0x5a1a7a);
      g.cameras.main.shake(140, 0.007);
      if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < r + 12) g.hurtPlayer(this.P.slashDmg * this.pw.dmg, true);
    });
  }

  private roar() {
    const { g, e } = this;
    this.nextRoar = g.elapsed + this.P.roar * this.pw.cd;
    this.busy(650, 'en-bafome-roar');
    const n = this.P.orbs;
    const homing = this.phase ? 1600 : 0;
    g.time.delayedCall(350, () => {
      if (!e.active) return;
      const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.setFlipX(Math.cos(base) < 0);
      const spread = this.phase ? 1.6 : 1.1;
      for (let k = 0; k < n; k++) {
        const a = base + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spread);
        const img = g.add.image(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40 - 10, 'fx-orbe').setDepth(FX_DEPTH - 2).setScale(0.55);
        if (this.phase) img.setTint(0xff8a8a);
        this.orbs.push({ img, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 4500, homing });
      }
    });
  }

  private geyser() {
    const { g, e } = this;
    this.nextGeyser = g.elapsed + this.P.geyser * this.pw.cd;
    this.busy(800, 'en-bafome-slash');
    const p = g.player;
    const spots = [{ x: p.x, y: p.y }];
    for (let k = 1; k < this.P.spots; k++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 60 + Math.random() * 150;
      spots.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr });
    }
    const r = 56;
    const warn = this.phase ? 700 : 850;
    for (const s of spots) g.fx.warnCircle(s.x, s.y, r, warn, this.phase ? 0xc82a4a : 0x8a2ab0);
    g.time.delayedCall(warn, () => {
      let hit = false;
      for (const s of spots) {
        const spike = g.add.image(s.x, s.y + 18, 'fx-geiser').setOrigin(0.5, 1).setDepth(s.y + 20).setScale(0.55, 0.05);
        g.tweens.add({ targets: spike, scaleY: 0.55, duration: 120, ease: 'Back.Out' });
        g.tweens.add({ targets: spike, alpha: 0, delay: 450, duration: 300, onComplete: () => spike.destroy() });
        if (!hit && Phaser.Math.Distance.Between(s.x, s.y, g.player.x, g.player.y) < r + 10) {
          hit = true;
          if (g.hurtPlayer(this.P.geyserDmg * this.pw.dmg, true)) g.afflictPlayer('maldicao', 3500);
        }
      }
      g.cameras.main.shake(140, 0.006);
    });
  }

  /** Investida das Sombras: aviso em linha e avanço muito rápido */
  private startDash() {
    const { g, e } = this;
    this.nextDash = g.elapsed + this.P.dash * this.pw.cd;
    this.busy(650, 'en-bafome-roar');
    const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
    e.setFlipX(Math.cos(a) < 0);
    const len = 520;
    g.fx.warnLine(e.x, e.y + 20, a, len, 90, 650, this.phase ? 0xff3a3a : 0x8a2ab0);
    g.time.delayedCall(650, () => {
      if (!this.alive) return;
      const speed = 900;
      this.dash = { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, until: g.elapsed + (len / speed) * 1000, hit: false };
    });
  }

  /** Espiral Infernal: braços de esferas girando a partir dele */
  private spiral() {
    const { g, e } = this;
    const P = this.P;
    this.nextSpiral = g.elapsed + P.spiral * this.pw.cd;
    const warn = 650;
    const every = 110;
    this.busy(warn + P.shots * every + 250, 'en-bafome-roar');
    const color = this.phase ? 0xff3a3a : 0x9a2ab0;
    g.fx.warnCircle(e.x, e.y + 20, 120, warn, color);
    const base = Math.random() * Math.PI * 2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const speed = this.phase ? 230 : 200;
    let k = 0;
    g.time.delayedCall(warn, () => {
      if (!this.alive) return;
      g.cameras.main.shake(160, 0.005);
      g.time.addEvent({
        delay: every,
        repeat: P.shots - 1,
        callback: () => {
          if (!this.alive) return;
          for (let arm = 0; arm < P.arms; arm++) {
            const a = base + dir * k * 0.34 + (arm / P.arms) * Math.PI * 2;
            const img = g.add.image(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40 - 10, 'fx-orbe').setDepth(FX_DEPTH - 2).setScale(0.42);
            if (this.phase) img.setTint(0xff8a8a);
            this.orbs.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 3200, homing: 0, dmg: P.orbDmg * 0.8 });
          }
          k++;
        },
      });
    });
  }

  private updateOrbs(dt: number) {
    const s = dt / 1000;
    const p = this.g.player;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      if (o.homing > 0) {
        // curva suave em direção ao jogador
        o.homing -= dt;
        const want = Math.atan2(p.y - o.img.y, p.x - o.img.x);
        const cur = Math.atan2(o.vy, o.vx);
        const turn = Phaser.Math.Angle.RotateTo(cur, want, 2.2 * s);
        const sp = Math.hypot(o.vx, o.vy);
        o.vx = Math.cos(turn) * sp;
        o.vy = Math.sin(turn) * sp;
      }
      o.img.x += o.vx * s;
      o.img.y += o.vy * s;
      o.img.rotation += s * 4;
      const hit = Phaser.Math.Distance.Between(o.img.x, o.img.y, p.x, p.y) < 30;
      if (hit) this.g.hurtPlayer((o.dmg ?? this.P.orbDmg) * this.pw.dmg);
      if (hit || o.life <= 0) {
        o.img.destroy();
        this.orbs.splice(i, 1);
      }
    }
  }
}
