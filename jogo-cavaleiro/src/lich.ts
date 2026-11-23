import Phaser from 'phaser';
import type { GameScene } from './scenes/GameScene';
import type { Enemy } from './objects/Enemy';
import type { BossPower } from './boss';
import { ENEMIES } from './data/enemies';
import { FX_DEPTH } from './fx';

interface Orb {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  homing: number;
}

/** Onda de choque que se expande a partir do chefe */
interface Wave {
  x: number;
  y: number;
  r: number;
  img: Phaser.GameObjects.Image;
  hit: boolean;
}

/** Recargas (ms), danos e quantidades por fase */
const PHASES = [
  { orb: 3000, sweep: 2200, nova: 5200, blink: 6200, rain: 0, orbs: 2, waves: 3, spots: 0, orbDmg: 54, sweepDmg: 64, waveDmg: 58, beamDmg: 75, rainDmg: 56, speed: 1.1 },
  { orb: 2200, sweep: 1700, nova: 3800, blink: 4300, rain: 4600, orbs: 4, waves: 4, spots: 12, orbDmg: 64, sweepDmg: 76, waveDmg: 68, beamDmg: 88, rainDmg: 66, speed: 1.4 },
];

const GREEN = 0x6aff9a;
const VIOLET = 0x8a3ad0;

/**
 * Lorde Ossário: o chefe mais forte (nível 45, depois do Bafome e do Minotauro).
 * Todos os ataques têm aviso antes:
 *  - Esfera da Alma: carrega e lança esferas verdes que perseguem o jogador
 *  - Ceifa Sombria: de perto, golpe giratório em área grande
 *  - Explosão Profana: soca o chão e solta ondas de choque que se espalham
 *    (fique entre as ondas ou longe delas)
 *  - Passo Fantasma: some numa nuvem, reaparece perto do jogador e dispara o Raio Necrótico em linha
 * Com metade da vida entra em FÚRIA: mais rápido, mais esferas, invoca fantasmas e
 * faz cair uma Chuva de Caveiras em volta do jogador.
 */
export class LichAI {
  private nextOrb = 1500;
  private nextSweep = 0;
  private nextNova = 4000;
  private nextBlink = 6000;
  private nextRain = 0;
  private nextSummon = 0;
  private busyUntil = 0;
  private phase = 0;
  private orbs: Orb[] = [];
  private waves: Wave[] = [];
  private shadow: Phaser.GameObjects.Image;

  constructor(private g: GameScene, private e: Enemy, private pw: BossPower = { dmg: 1, cd: 1, enraged: false }) {
    this.shadow = g.add.image(e.x, e.y, 'fx-sombra').setScale(3.2, 2.2).setAlpha(0.5);
    const now = g.elapsed;
    this.nextOrb += now;
    this.nextNova += now;
    this.nextBlink += now;
  }

  private get P() {
    return PHASES[this.phase];
  }

  /** Retorna false quando o chefe morreu e não há mais ataques no ar */
  update(dt: number): boolean {
    this.updateOrbs(dt);
    this.updateWaves(dt);
    const { g, e } = this;
    if (!e.active || e.def.id !== 'lich') {
      if (!this.orbs.length && !this.waves.length) {
        this.shadow.destroy();
        return false;
      }
      this.shadow.setVisible(false);
      return true;
    }
    // flutua: a sombra fica no chão e ele balança devagar
    this.shadow.setPosition(e.x, e.y + 98).setDepth(e.y - 1);
    const now = g.elapsed;
    e.speed = e.def.speed * this.P.speed;
    if (this.phase === 0 && (this.pw.enraged || e.hp <= e.maxHp * 0.5)) this.enrage();
    if (this.phase === 1 && now >= this.nextSummon) this.summon();

    if (now < this.busyUntil) {
      e.vx = e.vy = 0;
      e.knockUntil = this.busyUntil;
      return true;
    }
    if (e.alpha < 1) e.setAlpha(1);
    if (e.anims.currentAnim?.key !== 'en-lich-move') e.play('en-lich-move');

    const p = g.player;
    const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
    if (d < 190 && now >= this.nextSweep) this.sweep();
    else if (d < 420 && now >= this.nextNova) this.nova();
    else if (this.phase && d < 700 && now >= this.nextRain) this.skullRain();
    else if (d < 650 && now >= this.nextOrb) this.soulOrb();
    else if (now >= this.nextBlink) this.blink();
    return true;
  }

  private busy(ms: number, anim: string) {
    this.busyUntil = this.g.elapsed + ms;
    this.e.play(anim);
  }

  private face() {
    const { g, e } = this;
    e.setFlipX(g.player.x < e.x);
  }

  /** 2ª fase: fúria */
  private enrage() {
    const { g, e } = this;
    this.phase = 1;
    this.nextSummon = g.elapsed + 800;
    this.nextRain = g.elapsed + 2500;
    e.def = { ...e.def, tint: 0xb0ffc8 };
    e.restoreTint(g.elapsed);
    g.cameras.main.shake(700, 0.012);
    g.cameras.main.flash(450, 40, 160, 80);
    g.fx.ring(e.x, e.y, 40, 10, 800, GREEN, 0.5);
    g.events.emit('announce', 'O LORDE OSSÁRIO LIBEROU O PODER DAS ALMAS!');
  }

  /** Invoca fantasmas e esqueletos em volta do jogador */
  private summon() {
    const { g } = this;
    this.nextSummon = g.elapsed + 16000;
    this.busy(900, 'en-lich-raise');
    const ghost = ENEMIES.find((d) => d.id === 'fantasma')!;
    const skel = ENEMIES.find((d) => d.id === 'esqueleto')!;
    const p = g.player;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.spawnMinion(k % 3 === 0 ? skel : ghost, p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 200);
    }
    g.fx.ring(p.x, p.y, 40, 6, 600, VIOLET, 0.35);
  }

  /** Esfera da Alma: carrega e lança esferas que perseguem o jogador */
  private soulOrb() {
    const { g, e } = this;
    this.nextOrb = g.elapsed + this.P.orb * this.pw.cd;
    this.busy(900, 'en-lich-orb');
    this.face();
    g.fx.ring(e.x + (e.flipX ? -40 : 40), e.y - 10, 30, 0.4, 600, GREEN, 0.5);
    g.time.delayedCall(600, () => {
      if (!e.active) return;
      const base = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      const n = this.P.orbs;
      for (let k = 0; k < n; k++) {
        const a = base + (n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.2);
        const img = g.add.image(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50 - 10, 'proj-alma').setDepth(FX_DEPTH - 2).setScale(1.5).setTint(GREEN);
        this.orbs.push({ img, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, life: 5200, homing: 2600 });
      }
    });
  }

  /** Ceifa Sombria: golpe giratório em volta dele */
  private sweep() {
    const { g, e } = this;
    this.nextSweep = g.elapsed + this.P.sweep * this.pw.cd;
    this.busy(800, 'en-lich-sweep');
    const r = this.phase ? 250 : 220;
    const warn = this.phase ? 420 : 520;
    g.fx.ring(e.x, e.y, r, 1, warn, VIOLET, 0.25);
    g.time.delayedCall(warn, () => {
      if (!e.active) return;
      for (let k = 0; k < 3; k++) g.fx.slash(e.x, e.y, (k / 3) * Math.PI * 2 + g.elapsed / 300, r, 0xa04ad0);
      g.cameras.main.shake(160, 0.008);
      if (Phaser.Math.Distance.Between(e.x, e.y, g.player.x, g.player.y) < r + 12) g.hurtPlayer(this.P.sweepDmg * this.pw.dmg, true);
    });
  }

  /** Explosão Profana: ondas de choque que se espalham a partir do chefe */
  private nova() {
    const { g, e } = this;
    this.nextNova = g.elapsed + this.P.nova * this.pw.cd;
    this.busy(1300, 'en-lich-slam');
    g.fx.ring(e.x, e.y + 60, 50, 1.6, 650, GREEN, 0.4);
    for (let k = 0; k < this.P.waves; k++) {
      g.time.delayedCall(650 + k * 380, () => {
        if (!e.active) return;
        const img = g.add.image(e.x, e.y + 60, 'fx-anel').setTint(GREEN).setAlpha(0.7).setDepth(-1e5);
        this.waves.push({ x: e.x, y: e.y + 60, r: 30, img, hit: false });
        g.cameras.main.shake(120, 0.006);
      });
    }
  }

  /** Passo Fantasma + Raio Necrótico */
  private blink() {
    const { g, e } = this;
    this.nextBlink = g.elapsed + this.P.blink * this.pw.cd;
    this.busy(1500, 'en-lich-idle');
    g.fx.ring(e.x, e.y + 40, 30, 3, 400, VIOLET, 0.5);
    e.setAlpha(0.25);
    g.time.delayedCall(380, () => {
      if (!e.active) return;
      // reaparece a 260 px do jogador, num ângulo aleatório
      const p = g.player;
      const a = Math.random() * Math.PI * 2;
      e.setPosition(p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 200).setAlpha(1);
      g.fx.ring(e.x, e.y + 40, 20, 4, 400, VIOLET, 0.5);
      e.play('en-lich-cast');
      this.face();
      // aviso em linha e o raio
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      const len = 640;
      const width = this.phase ? 70 : 56;
      g.fx.lance(e.x, e.y, ang, len, width, 0x4a1a6a);
      g.time.delayedCall(650, () => {
        if (!e.active) return;
        g.fx.lance(e.x, e.y, ang, len, width * 1.4, GREEN);
        g.cameras.main.shake(180, 0.008);
        // distância do jogador até a linha do raio
        const px = g.player.x - e.x;
        const py = g.player.y - e.y;
        const along = px * Math.cos(ang) + py * Math.sin(ang);
        const across = Math.abs(-px * Math.sin(ang) + py * Math.cos(ang));
        if (along > 0 && along < len && across < width / 2 + 14) g.hurtPlayer(this.P.beamDmg * this.pw.dmg, true);
      });
    });
  }

  /** Chuva de Caveiras: marcas no chão em volta do jogador e explosões verdes */
  private skullRain() {
    const { g, e } = this;
    this.nextRain = g.elapsed + this.P.rain * this.pw.cd;
    this.busy(1000, 'en-lich-raise');
    const p = g.player;
    const spots = [{ x: p.x, y: p.y }];
    for (let k = 1; k < this.P.spots; k++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 70 + Math.random() * 200;
      spots.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr });
    }
    const r = 58;
    const warn = 900;
    for (const s of spots) g.fx.ring(s.x, s.y, r, 1, warn, GREEN, 0.3);
    let hit = false;
    spots.forEach((s, i) => {
      g.time.delayedCall(warn + i * 40, () => {
        g.fx.fall(s.x, s.y, 'proj-alma', 260, 1.6);
        g.time.delayedCall(260, () => {
          g.fx.ring(s.x, s.y, r * 0.4, 2.6, 300, GREEN, 0.6);
          if (!hit && e.active && Phaser.Math.Distance.Between(s.x, s.y, g.player.x, g.player.y) < r + 10) {
            hit = true;
            if (g.hurtPlayer(this.P.rainDmg * this.pw.dmg, true)) g.afflictPlayer('maldicao', 3000);
          }
        });
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
        o.homing -= dt;
        const want = Math.atan2(p.y - o.img.y, p.x - o.img.x);
        const cur = Math.atan2(o.vy, o.vx);
        const turn = Phaser.Math.Angle.RotateTo(cur, want, 2.0 * s);
        const sp = Math.hypot(o.vx, o.vy);
        o.vx = Math.cos(turn) * sp;
        o.vy = Math.sin(turn) * sp;
      }
      o.img.x += o.vx * s;
      o.img.y += o.vy * s;
      o.img.rotation += s * 3;
      const hit = Phaser.Math.Distance.Between(o.img.x, o.img.y, p.x, p.y) < 36;
      if (hit) this.g.hurtPlayer(this.P.orbDmg * this.pw.dmg);
      if (hit || o.life <= 0) {
        this.g.fx.ring(o.img.x, o.img.y, 14, 3, 300, GREEN, 0.6);
        o.img.destroy();
        this.orbs.splice(i, 1);
      }
    }
  }

  private updateWaves(dt: number) {
    const p = this.g.player;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += (300 * dt) / 1000;
      // anel achatado (perspectiva do chão)
      w.img.setScale(w.r / 64, (w.r * 0.7) / 64).setAlpha(0.8 * (1 - w.r / 600));
      const dx = p.x - w.x;
      const dy = (p.y + 10 - w.y) / 0.7;
      const d = Math.hypot(dx, dy);
      if (!w.hit && Math.abs(d - w.r) < 26) {
        w.hit = true;
        this.g.hurtPlayer(this.P.waveDmg * this.pw.dmg, true);
      }
      if (w.r > 560) {
        w.img.destroy();
        this.waves.splice(i, 1);
      }
    }
  }
}
