import Phaser from 'phaser';
import { Battle, BUnit, ECO_INFO, type Ev } from '../battle/engine';
import { chooseAction, type Choice } from '../battle/ai';
import { REGIONS, STAGES, STAGE_BY_ID, type StageDef } from '../data/stages';
import { EFFECT_INFO, ELEMENT_COLOR, type SkillDef, BUFFS } from '../data/types';
import { UNIT_BY_ID } from '../data/units';
import { ARTS, ART_BOX, artScale } from '../sprites';
import { addUnit, giveXp, persist, save, unitByKey } from '../save';
import { C, H, W, button, drawBackdrop, hex, panel, txt, type Button } from '../ui';

const FIELD_TOP = 150;
const FIELD_BOTTOM = 868;
const BAR_W = 100;

/** Posições no campo (pés). Aliados à esquerda, inimigos espelhados à direita. */
const ALLY_POS = [
  { x: 262, y: 520 }, { x: 262, y: 770 }, { x: 108, y: 430 }, { x: 108, y: 680 },
];
const BOSS_POS = [{ x: 492, y: 660 }, { x: 640, y: 420 }, { x: 645, y: 820 }, { x: 660, y: 560 }];

const FX_COLOR: Record<string, number> = {
  corte: 0xffffff, fogo: 0xff7a30, gelo: 0x7cc8ff, raio: 0xfff27a, sombra: 0xb06bff, luz: 0xfff0b0,
  vento: 0x8cf08a, cura: 0x6dffa8, veneno: 0x9be05a, flecha: 0xffffff,
};

interface View {
  u: BUnit;
  spr: Phaser.GameObjects.Sprite;
  ring: Phaser.GameObjects.Image;
  bars: Phaser.GameObjects.Graphics;
  icons: Phaser.GameObjects.Container;
  el: Phaser.GameObjects.Image;
  lv: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  home: { x: number; y: number };
  hpShown: number;
  /** Altura do corpo na tela */
  height: number;
}

interface SkillBtn {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  name: Phaser.GameObjects.Text;
  info: Phaser.GameObjects.Text;
  cd: Phaser.GameObjects.Text;
}

export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private stage!: StageDef;
  private views = new Map<number, View>();
  private alive = true;
  private queue!: Phaser.GameObjects.Container;
  private waveText!: Phaser.GameObjects.Text;
  private actorName!: Phaser.GameObjects.Text;
  private actorPort!: Phaser.GameObjects.Image;
  private actorEl!: Phaser.GameObjects.Image;
  private hint!: Phaser.GameObjects.Text;
  private descTitle!: Phaser.GameObjects.Text;
  private desc!: Phaser.GameObjects.Text;
  private skillBtns: SkillBtn[] = [];
  private ecoBtn!: Phaser.GameObjects.Container;
  private ecoBar!: Phaser.GameObjects.Graphics;
  private ecoLabel!: Phaser.GameObjects.Text;
  private autoBtn!: Button;
  private speedBtn!: Button;
  /** Entrada do jogador em andamento */
  private pending?: { actor: BUnit; skill: number; resolve: (c: Choice | null) => void };

  constructor() { super('Battle'); }

  init(data: { stage: string }) {
    this.stage = STAGE_BY_ID[data.stage];
    this.views.clear();
    this.skillBtns = [];
    this.alive = true;
    this.pending = undefined;
  }

  create() {
    const s = save();
    const team = s.team.map((k) => unitByKey(k)!).filter(Boolean).map((o) => ({ def: UNIT_BY_ID[o.id], lv: o.lv, key: o.key }));
    this.battle = new Battle(team, this.stage.waves);

    const region = REGIONS[this.stage.region];
    this.add.rectangle(0, 0, W, H, C.bg).setOrigin(0);
    drawBackdrop(this, region, FIELD_TOP - 70, FIELD_BOTTOM);
    this.buildHeader();
    this.buildHud();
    for (const u of this.battle.allies) this.makeView(u);
    this.spawnWave(false);
    this.applySpeed();
    this.events.once('shutdown', () => {
      this.alive = false;
      this.anims.globalTimeScale = 1;
    });
    this.time.delayedCall(450, () => this.runLoop());
  }

  // ───────────────────────── montagem da tela ─────────────────────────

  private buildHeader() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.75, 0.75, 0, 0);
    g.fillRect(0, 0, W, 170);
    button(this, 70, 44, 112, 56, 'Fugir', () => this.confirmFlee(), 0x5a4570, 22);
    txt(this, 316, 24, `${this.stage.id}  ${this.stage.name}`, 21).setOrigin(0.5, 0);
    this.waveText = txt(this, 316, 54, '', 20, C.dim).setOrigin(0.5, 0);
    const s = save();
    this.autoBtn = button(this, W - 166, 44, 104, 56, 'AUTO', () => {
      s.auto = !s.auto;
      persist();
      this.styleToggles();
      if (s.auto && this.pending) {
        const inp = this.pending;
        this.pending = undefined;
        this.clearTargets();
        inp.resolve(chooseAction(this.battle, inp.actor));
      }
    }, 0x3d7a4f, 22);
    this.speedBtn = button(this, W - 54, 44, 84, 56, '1x', () => {
      s.speed = s.speed === 1 ? 2 : 1;
      persist();
      this.applySpeed();
      this.styleToggles();
    }, 0x3d5a7a, 22);
    this.styleToggles();
    this.queue = this.add.container(0, 0).setDepth(2000);
  }

  private styleToggles() {
    const s = save();
    this.autoBtn.setLabel(s.auto ? 'AUTO ✓' : 'AUTO');
    this.autoBtn.label.setColor(s.auto ? '#b8ffcb' : C.text);
    this.speedBtn.setLabel(`${s.speed}x`);
  }

  private applySpeed() {
    const k = save().speed === 2 ? 2 : 1;
    this.time.timeScale = k;
    this.tweens.timeScale = k;
    this.anims.globalTimeScale = k;
  }

  private buildHud() {
    const top = FIELD_BOTTOM;
    const g = this.add.graphics().setDepth(3000);
    g.fillStyle(0x0e0c16, 1);
    g.fillRect(0, top, W, H - top);
    g.fillStyle(C.line, 1);
    g.fillRect(0, top, W, 3);
    const d = 3001;
    this.actorPort = this.add.image(58, top + 56, 'port-gosma').setDisplaySize(76, 76).setDepth(d);
    this.add.graphics().setDepth(d).lineStyle(3, C.gold, 1).strokeRoundedRect(18, top + 16, 80, 80, 10);
    this.actorEl = this.add.image(112, top + 34, 'el-fogo').setDisplaySize(26, 26).setOrigin(0, 0.5).setDepth(d);
    this.actorName = txt(this, 144, top + 34, '', 26).setOrigin(0, 0.5).setDepth(d);
    this.hint = txt(this, 112, top + 74, '', 20, C.dim).setOrigin(0, 0.5).setDepth(d);

    // botão do Eco
    this.ecoBtn = this.add.container(W - 112, top + 56).setDepth(d);
    const eg = this.add.graphics();
    eg.fillStyle(0x1b1628, 1);
    eg.fillRoundedRect(-92, -38, 184, 76, 14);
    eg.lineStyle(2, C.line, 1);
    eg.strokeRoundedRect(-92, -38, 184, 76, 14);
    this.ecoBar = this.add.graphics();
    this.ecoLabel = txt(this, 0, -12, 'ECO', 22).setOrigin(0.5);
    const ecoName = txt(this, 0, 14, '', 16, C.dim).setOrigin(0.5);
    ecoName.setText(ECO_INFO[this.battle.leader.element].name);
    this.ecoBtn.add([eg, this.ecoBar, this.ecoLabel, ecoName]);
    this.ecoBtn.setSize(184, 76).setInteractive({ useHandCursor: true });
    this.ecoBtn.on('pointerup', () => this.tapEco());
    this.ecoBtn.on('pointerover', () => this.showEcoInfo());

    // habilidades
    for (let i = 0; i < 3; i++) {
      const x = 124 + i * 236;
      const y = top + 200;
      const c = this.add.container(x, y).setDepth(d);
      const bg = this.add.graphics();
      const name = txt(this, 0, -36, '', 21, C.text, { align: 'center', wordWrap: { width: 196 } }).setOrigin(0.5);
      const info = txt(this, 0, 30, '', 16, C.dim, { align: 'center' }).setOrigin(0.5);
      const cd = txt(this, 0, -2, '', 22, '#ffd27a').setOrigin(0.5);
      c.add([bg, name, info, cd]);
      c.setSize(220, 150).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.tapSkill(i));
      this.skillBtns.push({ c, bg, name, info, cd });
    }
    // descrição
    panel(this, 16, top + 290, W - 32, 112, 0x1b1628, C.line, 14).setDepth(d);
    this.descTitle = txt(this, 34, top + 302, '', 20, hex(C.gold)).setDepth(d);
    this.desc = txt(this, 34, top + 330, '', 18, C.text, { wordWrap: { width: W - 70 }, strokeThickness: 2 }).setDepth(d);
    this.drawSkills(undefined);
    this.drawEco();
  }

  private makeView(u: BUnit) {
    const a = ARTS[u.def.art];
    const box = ART_BOX[u.def.art];
    const pos = this.posFor(u);
    const scale = artScale(u.def.art, u.boss);
    const ring = this.add.image(pos.x, pos.y, 'ring').setAlpha(0).setScale(1.05, 1);
    const shadow = this.add.ellipse(pos.x, pos.y, Math.min(140, box.w * scale * 0.8), 18, 0x000000, 0.35);
    const spr = this.add.sprite(pos.x, pos.y, `art-${a.key}`, a.idle[0]).setScale(scale);
    const ox = (box.x + box.w / 2) / a.cellW;
    const flip = (u.side === 'enemy') !== !!a.facesLeft;
    spr.setFlipX(flip).setOrigin(flip ? 1 - ox : ox, (box.y + box.h) / a.cellH);
    spr.play({ key: `${a.key}-idle`, startFrame: Math.floor(Math.random() * a.idle.length) });
    spr.setDepth(pos.y);
    ring.setDepth(pos.y - 1);
    shadow.setDepth(pos.y - 2);
    const height = box.h * scale;
    const bars = this.add.graphics().setDepth(1500);
    const el = this.add.image(pos.x - BAR_W / 2 - 14, pos.y + 18, `el-${u.element}`).setDisplaySize(26, 26).setDepth(1501);
    const lv = txt(this, pos.x + BAR_W / 2, pos.y + 34, `Nv${u.lv}`, 14, C.dim).setOrigin(1, 0).setDepth(1501);
    const icons = this.add.container(pos.x - BAR_W / 2, pos.y + 36).setDepth(1501);
    const zone = this.add.zone(pos.x, pos.y - height / 2, Math.max(110, box.w * scale), height + 60).setInteractive({ useHandCursor: true });
    zone.setDepth(1600);
    zone.on('pointerup', () => this.tapUnit(u));
    zone.on('pointerover', () => this.showUnitInfo(u));
    const v: View = { u, spr, ring, bars, icons, el, lv, zone, home: pos, hpShown: u.hp, height };
    (v as unknown as { shadow: Phaser.GameObjects.Ellipse }).shadow = shadow;
    this.views.set(u.uid, v);
    this.drawBars(v);
    return v;
  }

  private posFor(u: BUnit) {
    if (u.side === 'ally') return ALLY_POS[u.slot];
    const hasBoss = this.battle.enemies.some((e) => e.boss);
    if (hasBoss) {
      const order = [...this.battle.enemies].sort((a, b) => Number(b.boss) - Number(a.boss));
      return BOSS_POS[order.indexOf(u)];
    }
    const p = ALLY_POS[u.slot];
    return { x: W - p.x, y: p.y };
  }

  private spawnWave(animate: boolean) {
    for (const u of this.battle.enemies) {
      const v = this.makeView(u);
      if (animate) {
        v.spr.x += 260;
        v.spr.setAlpha(0);
        this.tweens.add({ targets: v.spr, x: v.home.x, alpha: 1, duration: 520, ease: 'Cubic.easeOut' });
      }
    }
    this.waveText.setText(`Onda ${this.battle.wave + 1}/${this.battle.waves.length}`);
  }

  // ───────────────────────── barras e ícones ─────────────────────────

  private drawBars(v: View) {
    const { u, bars } = v;
    const x = v.home.x - BAR_W / 2;
    const y = v.home.y + 12;
    bars.clear();
    if (!u.alive && v.hpShown <= 0) return;
    bars.fillStyle(0x000000, 0.7);
    bars.fillRoundedRect(x - 2, y - 2, BAR_W + 4, 20, 5);
    const pct = Math.max(0, v.hpShown / u.max.hp);
    const col = u.side === 'ally' ? (pct > 0.3 ? 0x4fd06a : 0xe0b23a) : 0xe0484f;
    bars.fillStyle(0x3a1d22, 1);
    bars.fillRect(x, y, BAR_W, 10);
    bars.fillStyle(col, 1);
    bars.fillRect(x, y, BAR_W * pct, 10);
    bars.fillStyle(0xffffff, 0.25);
    bars.fillRect(x, y, BAR_W * pct, 3);
    const sh = u.shield;
    if (sh > 0) {
      bars.fillStyle(0xd8f0ff, 0.9);
      bars.fillRect(x, y + 7, BAR_W * Math.min(1, sh / u.max.hp), 3);
    }
    // barra de turno
    bars.fillStyle(0x10202a, 1);
    bars.fillRect(x, y + 12, BAR_W, 4);
    bars.fillStyle(0x56d6ff, 1);
    bars.fillRect(x, y + 12, BAR_W * Math.min(1, u.gauge / 100), 4);
  }

  private drawIcons(v: View) {
    v.icons.removeAll(true);
    const kinds: string[] = [];
    for (const e of v.u.effects) if (!kinds.includes(e.kind)) kinds.push(e.kind);
    kinds.slice(0, 6).forEach((k, i) => {
      const info = EFFECT_INFO[k as keyof typeof EFFECT_INFO];
      const x = (i % 3) * 34;
      const y = Math.floor(i / 3) * 20;
      const g = this.add.graphics();
      g.fillStyle(info.buff ? 0x1d5a33 : 0x6a1f28, 1);
      g.fillRoundedRect(x, y, 32, 18, 4);
      g.lineStyle(1.5, info.color, 1);
      g.strokeRoundedRect(x, y, 32, 18, 4);
      const arrow = info.buff ? '▲' : '▼';
      const label = ['stun', 'burn', 'taunt', 'silence', 'shield', 'regen', 'imune'].includes(k) ? info.label : `${info.label}${arrow}`;
      const t = txt(this, x + 16, y + 9, label, label.length > 3 ? 10 : 11, '#ffffff', { strokeThickness: 2 }).setOrigin(0.5);
      v.icons.add([g, t]);
    });
  }

  private refreshAll() {
    for (const v of this.views.values()) {
      if (!v.u.alive) continue;
      this.drawBars(v);
      this.drawIcons(v);
    }
    this.drawEco();
    this.drawQueue();
  }

  private drawQueue() {
    this.queue.removeAll(true);
    const list = this.battle.preview(9);
    const cur = this.battle.current;
    const all = cur && cur.alive ? [cur, ...list] : list;
    all.slice(0, 9).forEach((u, i) => {
      const size = i === 0 ? 64 : 52;
      const x = 22 + (i === 0 ? 0 : 74 + (i - 1) * 60);
      const y = 92;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.6);
      g.fillRoundedRect(x - 2, y - 2, size + 4, size + 4, 8);
      const img = this.add.image(x + size / 2, y + size / 2, `port-${u.def.art}`).setDisplaySize(size - 6, size - 6);
      if (u.side === 'enemy') img.setFlipX(true);
      const border = this.add.graphics();
      border.lineStyle(i === 0 ? 4 : 3, i === 0 ? C.gold : u.side === 'ally' ? 0x4fa8ff : 0xff5a5a, 1);
      border.strokeRoundedRect(x, y, size, size, 8);
      const dot = this.add.image(x + size - 6, y + size - 6, `el-${u.element}`).setDisplaySize(18, 18);
      this.queue.add([g, img, border, dot]);
    });
  }

  private drawEco() {
    const pct = this.battle.eco / 100;
    const col = ELEMENT_COLOR[this.battle.leader.element];
    this.ecoBar.clear();
    this.ecoBar.fillStyle(col, pct >= 1 ? 0.55 : 0.28);
    this.ecoBar.fillRoundedRect(-88, -34, 176 * pct, 68, 11);
    this.ecoLabel.setText(pct >= 1 ? 'ECO PRONTO!' : `ECO ${Math.floor(pct * 100)}%`);
    this.ecoLabel.setColor(pct >= 1 ? '#fff6c8' : C.text);
    this.ecoBtn.setAlpha(pct >= 1 ? 1 : 0.85);
    if (pct >= 1 && !this.tweens.isTweening(this.ecoLabel)) {
      this.tweens.add({ targets: this.ecoLabel, scale: 1.12, duration: 380, yoyo: true, repeat: -1 });
    } else if (pct < 1) {
      this.tweens.killTweensOf(this.ecoLabel);
      this.ecoLabel.setScale(1);
    }
  }

  private drawSkills(actor: BUnit | undefined, selected = -1) {
    const ours = actor && actor.side === 'ally';
    this.skillBtns.forEach((b, i) => {
      const sk = ours ? actor.def.skills[i] : undefined;
      const usable = !!(ours && this.battle.usable(actor, i));
      b.bg.clear();
      const sel = i === selected;
      b.bg.fillStyle(0x000000, 0.45);
      b.bg.fillRoundedRect(-108, -70, 220, 150, 14);
      b.bg.fillStyle(sel ? 0x3e2f66 : 0x241e36, ours ? 1 : 0.6);
      b.bg.fillRoundedRect(-110, -75, 220, 150, 14);
      if (sk?.fx) {
        b.bg.fillStyle(FX_COLOR[sk.fx] ?? 0xffffff, 0.85);
        b.bg.fillRoundedRect(-110, -75, 220, 8, { tl: 14, tr: 14, bl: 0, br: 0 });
      }
      b.bg.lineStyle(sel ? 4 : 2, sel ? C.gold : C.line, 1);
      b.bg.strokeRoundedRect(-110, -75, 220, 150, 14);
      b.name.setText(sk ? sk.name : '—').setAlpha(usable ? 1 : 0.45);
      const cd = ours ? actor.cds[i] : 0;
      b.info.setText(sk ? `${targetLabel(sk)}${sk.cooldown ? ` · recarga ${sk.cooldown}` : ''}` : '').setAlpha(usable ? 1 : 0.45).setY(cd > 0 ? 44 : 30);
      b.cd.setText(cd > 0 ? `⟳ ${cd} turno${cd > 1 ? 's' : ''}` : '').setY(4);
      b.name.setY(cd > 0 ? -38 : -30);
    });
  }

  private setDesc(title: string, body: string) {
    this.descTitle.setText(title);
    this.desc.setText(body);
  }

  // ───────────────────────── entrada do jogador ─────────────────────────

  private tapSkill(i: number) {
    const inp = this.pending;
    if (!inp) {
      // fora do turno: só mostra a descrição do monstro que está agindo
      return;
    }
    const sk = inp.actor.def.skills[i];
    if (!this.battle.usable(inp.actor, i)) {
      const why = inp.actor.cds[i] > 0 ? `Recarregando: falta${inp.actor.cds[i] > 1 ? 'm' : ''} ${inp.actor.cds[i]} turno${inp.actor.cds[i] > 1 ? 's' : ''}.` : 'Bloqueada por Silêncio ou Provocação.';
      this.setDesc(sk.name, `${sk.desc}\n${why}`);
      return;
    }
    // segundo toque numa habilidade em área = usar
    if (inp.skill === i && sk.target !== 'enemy' && sk.target !== 'ally') {
      this.submit(this.battle.validTargets(inp.actor, i)[0]);
      return;
    }
    inp.skill = i;
    this.drawSkills(inp.actor, i);
    this.setDesc(sk.name, sk.desc);
    this.showTargets();
  }

  private tapUnit(u: BUnit) {
    const inp = this.pending;
    if (!inp) return;
    const valid = this.battle.validTargets(inp.actor, inp.skill);
    if (valid.includes(u)) this.submit(u);
    else this.showUnitInfo(u);
  }

  private submit(target: BUnit) {
    const inp = this.pending;
    if (!inp) return;
    this.pending = undefined;
    this.clearTargets();
    inp.resolve({ skill: inp.skill, target });
  }

  private showUnitInfo(u: BUnit) {
    if (!u.alive) return;
    const eff = u.effects.length
      ? [...new Set(u.effects.map((e) => e.kind))].map((k) => `${EFFECT_INFO[k].buff ? '▲' : '▼'} ${EFFECT_INFO[k].name} (${Math.max(...u.effects.filter((e) => e.kind === k).map((e) => e.turns))}t)`).join('   ')
      : 'Sem efeitos.';
    this.setDesc(`${u.def.name}  Nv${u.lv}${u.boss ? '  · CHEFE' : ''}`,
      `Vida ${u.hp}/${u.max.hp} · Ataque ${Math.round(u.atk)} · Defesa ${Math.round(u.defv)} · Velocidade ${Math.round(u.spd)}\n${eff}`);
  }

  private showEcoInfo() {
    const info = ECO_INFO[this.battle.leader.element];
    this.setDesc(`Eco do líder: ${info.name}`, `${info.desc}\nEnche quando seus monstros agem e levam golpes. Usar o Eco não gasta o turno.`);
  }

  private async tapEco() {
    this.showEcoInfo();
    const inp = this.pending;
    if (!inp || this.battle.eco < 100) return;
    const pending = inp;
    this.pending = undefined;
    this.clearTargets();
    await this.doEco();
    if (!this.alive) return;
    if (this.battle.status() !== null || !pending.actor.alive) {
      pending.resolve(null);
      return;
    }
    this.pending = pending;
    this.drawSkills(pending.actor, pending.skill);
    this.showTargets();
  }

  private async doEco() {
    const ev = this.battle.useEco();
    await this.play(ev);
    this.refreshAll();
  }

  private showTargets() {
    const inp = this.pending;
    if (!inp) return;
    const valid = this.battle.validTargets(inp.actor, inp.skill);
    for (const v of this.views.values()) {
      this.tweens.killTweensOf(v.ring);
      if (v.u === inp.actor) {
        v.ring.setTint(C.gold).setAlpha(1);
        continue;
      }
      if (valid.includes(v.u)) {
        v.ring.setTint(v.u.side === 'enemy' ? 0xff5a5a : 0x6dffa8).setAlpha(0.9);
        this.tweens.add({ targets: v.ring, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
      } else {
        v.ring.setAlpha(0);
      }
    }
    const sk = inp.actor.def.skills[inp.skill];
    const area = sk.target !== 'enemy' && sk.target !== 'ally';
    this.hint.setText(area ? 'Toque de novo para usar' : sk.target === 'enemy' ? 'Toque num inimigo' : 'Toque num aliado');
  }

  private clearTargets() {
    for (const v of this.views.values()) {
      this.tweens.killTweensOf(v.ring);
      v.ring.setAlpha(0);
    }
  }

  private markActive(u: BUnit) {
    this.clearTargets();
    const v = this.views.get(u.uid);
    if (v) v.ring.setTint(u.side === 'ally' ? C.gold : 0xff5a5a).setAlpha(0.95);
    this.actorPort.setTexture(`port-${u.def.art}`).setFlipX(u.side === 'enemy');
    this.actorEl.setTexture(`el-${u.element}`);
    this.actorName.setText(`${u.def.name}`).setColor(u.side === 'ally' ? C.text : '#ffb0b0');
    this.hint.setText(u.side === 'ally' ? (save().auto ? 'Automático' : 'Sua vez! Escolha uma habilidade') : 'Turno do inimigo');
    this.drawSkills(u.side === 'ally' ? u : undefined, u.side === 'ally' && !save().auto ? 0 : -1);
    if (u.side === 'ally') {
      const sk = u.def.skills[0];
      this.setDesc(sk.name, sk.desc);
    } else {
      this.showUnitInfo(u);
    }
  }

  private playerInput(actor: BUnit): Promise<Choice | null> {
    return new Promise((resolve) => {
      this.pending = { actor, skill: 0, resolve };
      const first = [0, 1, 2].find((i) => this.battle.usable(actor, i)) ?? 0;
      this.pending.skill = first;
      this.drawSkills(actor, first);
      const sk = actor.def.skills[first];
      this.setDesc(sk.name, save().seenTutorial ? sk.desc : 'Escolha uma habilidade embaixo e depois toque no inimigo. Fogo vence Vento, Vento vence Água, Água vence Fogo; Luz e Sombra são fortes uma contra a outra.');
      this.showTargets();
    });
  }

  // ───────────────────────── ciclo da batalha ─────────────────────────

  private wait(ms: number) {
    return new Promise<void>((r) => this.time.delayedCall(ms, r));
  }

  private async runLoop() {
    while (this.alive) {
      const st = this.battle.status();
      if (st === 'win' || st === 'lose') {
        await this.wait(600);
        if (this.alive) this.finish(st === 'win');
        return;
      }
      if (st === 'wave') {
        await this.nextWave();
        continue;
      }
      const { actor, events, skip } = this.battle.startTurn();
      this.refreshAll();
      this.markActive(actor);
      await this.play(events);
      if (!this.alive) return;
      if (!skip && actor.alive && this.battle.status() === null) {
        let choice: Choice | null;
        if (actor.side === 'ally') {
          if (save().auto) {
            await this.wait(260);
            if (this.battle.eco >= 100) await this.doEco();
            choice = this.battle.status() === null ? chooseAction(this.battle, actor) : null;
          } else {
            choice = await this.playerInput(actor);
            if (!save().seenTutorial) {
              save().seenTutorial = true;
              persist();
            }
          }
        } else {
          await this.wait(420);
          choice = chooseAction(this.battle, actor);
        }
        if (!this.alive) return;
        if (choice && actor.alive && this.battle.status() === null) {
          this.drawSkills(actor.side === 'ally' ? actor : undefined, choice.skill);
          const sk = actor.def.skills[choice.skill];
          this.setDesc(`${actor.def.name}: ${sk.name}`, sk.desc);
          await this.play(this.battle.act(actor, choice.skill, choice.target));
        }
      }
      if (!this.alive) return;
      await this.play(this.battle.endTurn(actor));
      this.refreshAll();
      await this.wait(120);
    }
  }

  private async nextWave() {
    // tira os inimigos derrotados da onda anterior
    for (const v of [...this.views.values()]) {
      if (v.u.side !== 'enemy') continue;
      this.destroyView(v);
    }
    this.battle.loadWave(this.battle.wave + 1);
    const banner = txt(this, W / 2, 470, `ONDA ${this.battle.wave + 1}`, 64, '#ffffff').setOrigin(0.5).setDepth(4000).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 250, yoyo: true, hold: 600, onComplete: () => banner.destroy() });
    this.spawnWave(true);
    this.refreshAll();
    await this.wait(1100);
  }

  private destroyView(v: View) {
    v.spr.destroy();
    v.ring.destroy();
    v.bars.destroy();
    v.icons.destroy();
    v.el.destroy();
    v.lv.destroy();
    v.zone.destroy();
    (v as unknown as { shadow: Phaser.GameObjects.Ellipse }).shadow.destroy();
    this.views.delete(v.u.uid);
  }

  // ───────────────────────── animações ─────────────────────────

  private async play(evs: Ev[]) {
    let i = 0;
    while (i < evs.length && this.alive) {
      const e = evs[i];
      if (e.k === 'use') {
        const rest: Ev[] = [];
        let j = i + 1;
        while (j < evs.length && evs[j].k !== 'use') rest.push(evs[j++]);
        await this.animateSkill(e, rest);
        i = j;
      } else if (e.k === 'eco') {
        await this.ecoBanner(e.element);
        i++;
      } else {
        await this.show(e);
        i++;
      }
    }
  }

  private async animateSkill(e: Extract<Ev, { k: 'use' }>, rest: Ev[]) {
    const v = this.views.get(e.u.uid);
    if (!v) return;
    const sk = e.skill;
    const art = ARTS[e.u.def.art];
    const hostile = sk.target === 'enemy' || sk.target === 'allEnemies' || sk.target === 'randomEnemies';
    const dir = e.u.side === 'ally' ? 1 : -1;
    const color = FX_COLOR[sk.fx ?? 'corte'] ?? 0xffffff;
    const name = txt(this, v.home.x, v.home.y - v.height - 26, sk.name, 22, hex(color)).setOrigin(0.5).setDepth(3500);
    this.tweens.add({ targets: name, y: name.y - 24, alpha: 0, delay: 650, duration: 420, onComplete: () => name.destroy() });

    if (sk.anim === 'melee' && hostile) {
      const first = this.views.get(e.targets[0]?.uid);
      const tx = sk.target === 'enemy' && first ? first.home.x - dir * 110 : W / 2 + dir * 40;
      const ty = sk.target === 'enemy' && first ? first.home.y + 2 : 640;
      v.spr.setDepth(ty + 1);
      await this.tweenP({ targets: v.spr, x: tx, y: ty, duration: 240, ease: 'Quad.easeIn' });
      v.spr.play(`${art.key}-atk`);
      await this.wait(130);
      await this.showHits(e, rest, false);
      await this.wait(160);
      v.spr.play(`${art.key}-idle`);
      await this.tweenP({ targets: v.spr, x: v.home.x, y: v.home.y, duration: 240, ease: 'Quad.easeOut' });
      v.spr.setDepth(v.home.y);
    } else {
      v.spr.play(`${art.key}-${sk.anim === 'ranged' ? 'atk' : 'cast'}`);
      v.spr.once('animationcomplete', () => { if (v.spr.active && v.u.alive) v.spr.play(`${art.key}-idle`); });
      if (sk.anim === 'cast') this.castGlow(v, color);
      await this.wait(sk.anim === 'ranged' ? 180 : 260);
      await this.showHits(e, rest, sk.anim === 'ranged' && hostile);
      await this.wait(200);
    }
  }

  /** Mostra os eventos do golpe, com projétil antes de cada dano se for à distância */
  private async showHits(e: Extract<Ev, { k: 'use' }>, rest: Ev[], projectile: boolean) {
    const sk = e.skill;
    const src = this.views.get(e.u.uid)!;
    const color = FX_COLOR[sk.fx ?? 'corte'] ?? 0xffffff;
    const area = sk.target === 'allEnemies' || sk.target === 'allAllies';
    const shotDone = new Set<number>();
    let lastTarget = -1;
    for (let i = 0; i < rest.length && this.alive; i++) {
      const ev = rest[i];
      if (ev.k === 'hit') {
        const tv = this.views.get(ev.u.uid);
        const newVolley = !area || !shotDone.has(ev.u.uid);
        if (projectile && tv && newVolley) {
          if (area) {
            // em área: todos os projéteis saem juntos
            const targets = rest.filter((x) => x.k === 'hit').map((x) => (x as { u: BUnit }).u.uid);
            const uniq = [...new Set(targets)];
            await Promise.all(uniq.map((uid) => this.projectile(src, this.views.get(uid)!, sk.fx)));
            uniq.forEach((u) => shotDone.add(u));
          } else {
            await this.projectile(src, tv, sk.fx);
          }
        } else if (!projectile && tv && (lastTarget !== ev.u.uid || !area)) {
          this.impact(tv, color, sk.fx);
        }
        lastTarget = ev.u.uid;
        this.showHit(ev);
        const multi = (sk.hits ?? 1) > 1;
        await this.wait(area ? 40 : multi ? 190 : 80);
      } else {
        await this.show(ev, true);
      }
    }
  }

  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  private projectile(from: View, to: View, fx?: string) {
    const sx = from.spr.x + (from.u.side === 'ally' ? 40 : -40);
    const sy = from.spr.y - from.height * 0.55;
    const ex = to.spr.x;
    const ey = to.spr.y - to.height * 0.5;
    const color = FX_COLOR[fx ?? 'corte'] ?? 0xffffff;
    const obj = fx === 'flecha'
      ? this.add.image(sx, sy, 'arrow').setRotation(Math.atan2(ey - sy, ex - sx)).setScale(1.1)
      : this.add.image(sx, sy, 'glow').setTint(color).setScale(0.8).setBlendMode(Phaser.BlendModes.ADD);
    obj.setDepth(3200);
    const trail = this.add.particles(0, 0, 'dot', {
      follow: obj, lifespan: 260, speed: 10, scale: { start: 0.9, end: 0 }, alpha: { start: 0.8, end: 0 },
      tint: color, frequency: 18, blendMode: 'ADD',
    }).setDepth(3199);
    return new Promise<void>((r) => this.tweens.add({
      targets: obj, x: ex, y: ey, duration: 260, ease: 'Sine.easeIn',
      onComplete: () => {
        obj.destroy();
        trail.stop();
        this.time.delayedCall(300, () => trail.destroy());
        this.impact(to, color, fx);
        r();
      },
    }));
  }

  private impact(v: View, color: number, fx?: string) {
    const x = v.spr.x;
    const y = v.spr.y - v.height * 0.5;
    if (fx === 'corte' || fx === 'flecha' || !fx) {
      const s = this.add.image(x, y, 'slash').setTint(color).setDepth(3300).setScale(0.4).setRotation(Phaser.Math.FloatBetween(-0.6, 0.6)).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, scale: 1.25, alpha: 0, duration: 260, onComplete: () => s.destroy() });
    } else {
      const g = this.add.image(x, y, 'glow').setTint(color).setDepth(3300).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: g, scale: 2.4, alpha: 0, duration: 340, onComplete: () => g.destroy() });
    }
    const imp = this.add.image(x, y, 'fx-impacto').setDepth(3301).setScale(0.45).setAlpha(0.9).setTint(color);
    this.tweens.add({ targets: imp, scale: 0.75, alpha: 0, duration: 220, onComplete: () => imp.destroy() });
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 80, max: 240 }, lifespan: 380, scale: { start: 0.6, end: 0 }, tint: color, blendMode: 'ADD', emitting: false,
    }).setDepth(3302);
    p.explode(10);
    this.time.delayedCall(500, () => p.destroy());
  }

  private castGlow(v: View, color: number) {
    const r = this.add.image(v.spr.x, v.spr.y - 4, 'ring').setTint(color).setDepth(v.spr.depth - 1).setScale(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: r, scale: 1.8, alpha: 0, duration: 520, onComplete: () => r.destroy() });
    const p = this.add.particles(v.spr.x, v.spr.y - v.height * 0.4, 'spark', {
      speedY: { min: -160, max: -60 }, speedX: { min: -50, max: 50 }, lifespan: 600, scale: { start: 0.55, end: 0 },
      tint: color, blendMode: 'ADD', emitting: false,
    }).setDepth(3300);
    p.explode(14);
    this.time.delayedCall(700, () => p.destroy());
  }

  private showHit(e: Extract<Ev, { k: 'hit' }>) {
    const v = this.views.get(e.u.uid);
    if (!v) return;
    this.flash(v);
    this.number(v, `${e.dmg}`, e.crit ? 0xffd84a : e.edge === 1 ? 0xff9a5a : e.edge === -1 ? 0xb8b8c8 : 0xffffff, e.crit ? 0.62 : 0.5);
    if (e.crit) this.popImage(v, 'fx-crit', -60);
    else if (e.edge === 1) this.label(v, 'Vantagem!', 0xffa060, -64, 18);
    else if (e.edge === -1) this.label(v, 'Desvantagem', 0xb8b8c8, -64, 16);
    this.setHp(v, e.hp);
  }

  private flash(v: View) {
    const art = ARTS[v.u.def.art];
    v.spr.setTintFill(0xffffff);
    if (art.hurt && v.u.alive) {
      v.spr.stop();
      v.spr.setFrame(art.hurt);
    }
    this.time.delayedCall(90, () => { if (v.spr.active) v.spr.clearTint(); });
    this.time.delayedCall(260, () => { if (v.spr.active && v.u.alive && !v.spr.anims.isPlaying) v.spr.play(`${art.key}-idle`); });
    const dx = v.u.side === 'ally' ? -10 : 10;
    this.tweens.add({ targets: v.spr, x: v.spr.x + dx, duration: 60, yoyo: true });
  }

  private number(v: View, s: string, tint: number, scale = 0.5) {
    const x = v.home.x + Phaser.Math.Between(-18, 18);
    const y = v.home.y - v.height - 10;
    const t = this.add.bitmapText(x, y, 'dmg', s).setOrigin(0.5).setScale(scale * 1.4).setTint(tint).setDepth(3600);
    this.tweens.add({ targets: t, scale, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 520, duration: 420, onComplete: () => t.destroy() });
  }

  private label(v: View, s: string, color: number, dy = -40, size = 20) {
    const t = txt(this, v.home.x, v.home.y - v.height + dy, s, size, hex(color)).setOrigin(0.5).setDepth(3601);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 480, duration: 420, onComplete: () => t.destroy() });
  }

  private popImage(v: View, key: string, dy: number) {
    const img = this.add.image(v.home.x, v.home.y - v.height + dy, key).setScale(0.2).setDepth(3602);
    this.tweens.add({ targets: img, scale: 0.6, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, y: img.y - 26, alpha: 0, delay: 520, duration: 360, onComplete: () => img.destroy() });
  }

  private setHp(v: View, hp: number) {
    this.tweens.add({
      targets: v, hpShown: hp, duration: 260, ease: 'Sine.easeOut',
      onUpdate: () => this.drawBars(v),
    });
  }

  /** Eventos soltos (fora do golpe ou depois dele) */
  private async show(e: Ev, quick = false) {
    if (e.k === 'use' || e.k === 'eco') return;
    const v = this.views.get(e.u.uid);
    if (!v) return;
    switch (e.k) {
      case 'hit':
        this.impact(v, 0xffffff);
        this.showHit(e);
        await this.wait(quick ? 50 : 140);
        break;
      case 'dot': {
        this.number(v, `${e.dmg}`, 0xff7a3a, 0.45);
        this.flash(v);
        const p = this.add.particles(v.spr.x, v.spr.y - v.height * 0.4, 'glow', {
          speedY: { min: -120, max: -40 }, speedX: { min: -30, max: 30 }, lifespan: 500, scale: { start: 0.35, end: 0 },
          tint: [0xff5a20, 0xffb030], blendMode: 'ADD', emitting: false,
        }).setDepth(3300);
        p.explode(10);
        this.time.delayedCall(600, () => p.destroy());
        this.setHp(v, e.hp);
        await this.wait(380);
        break;
      }
      case 'heal': {
        if (e.amount <= 0) break;
        this.number(v, `+${e.amount}`, 0x6dff9a, 0.45);
        const p = this.add.particles(v.spr.x, v.spr.y - v.height * 0.3, 'plus', {
          speedY: { min: -110, max: -50 }, speedX: { min: -40, max: 40 }, lifespan: 700, scale: { start: 0.7, end: 0.2 },
          alpha: { start: 1, end: 0 }, tint: 0x7dffb0, emitting: false,
        }).setDepth(3300);
        p.explode(7);
        this.time.delayedCall(800, () => p.destroy());
        this.setHp(v, e.hp);
        await this.wait(quick ? 60 : 260);
        break;
      }
      case 'eff': {
        const info = EFFECT_INFO[e.kind];
        const names: Record<string, string> = {
          atkUp: 'Ataque ▲', defUp: 'Defesa ▲', spdUp: 'Velocidade ▲', critUp: 'Crítico ▲', shield: 'Escudo', regen: 'Regeneração', imune: 'Imunidade',
          atkDown: 'Ataque ▼', defDown: 'Defesa ▼', slow: 'Lento', stun: 'Atordoado!', burn: 'Queimando', taunt: 'Provocado', silence: 'Silêncio',
        };
        this.label(v, names[e.kind], info.buff ? 0x8dffb0 : 0xff8a8a, BUFFS.includes(e.kind) ? -40 : -36, 19);
        this.drawIcons(v);
        this.drawBars(v);
        await this.wait(quick ? 70 : 200);
        break;
      }
      case 'resist':
        this.popImage(v, 'fx-miss', -36);
        this.label(v, 'Resistiu', 0xc8c8d8, -12, 16);
        await this.wait(quick ? 70 : 200);
        break;
      case 'immune':
        this.label(v, 'Imune', 0xffffff, -36, 19);
        await this.wait(quick ? 70 : 200);
        break;
      case 'remove':
        this.drawIcons(v);
        this.drawBars(v);
        break;
      case 'gauge':
        this.label(v, `${e.delta > 0 ? '+' : ''}${Math.round(e.delta)}% turno`, e.delta > 0 ? 0x7fe0ff : 0x7f9cff, -10, 16);
        this.drawBars(v);
        this.drawQueue();
        await this.wait(quick ? 40 : 160);
        break;
      case 'stunned':
        this.label(v, 'Atordoado...', 0xffe066, -36, 22);
        this.tweens.add({ targets: v.spr, angle: { from: -5, to: 5 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => v.spr.setAngle(0) });
        await this.wait(700);
        break;
      case 'extra':
        this.label(v, 'Turno extra!', C.gold, -56, 24);
        await this.wait(400);
        break;
      case 'die':
        await this.die(v);
        break;
    }
  }

  private async die(v: View) {
    const art = ARTS[v.u.def.art];
    v.spr.play(`${art.key}-die`);
    v.ring.setAlpha(0);
    v.icons.removeAll(true);
    v.zone.disableInteractive();
    this.tweens.add({ targets: [v.el, v.lv], alpha: 0, duration: 300 });
    this.time.delayedCall(320, () => {
      v.hpShown = 0;
      this.drawBars(v);
    });
    this.tweens.add({ targets: [v.spr, (v as unknown as { shadow: Phaser.GameObjects.Ellipse }).shadow], alpha: 0, delay: 650, duration: 450 });
    await this.wait(320);
  }

  private async ecoBanner(el: BUnit['element']) {
    const col = ELEMENT_COLOR[el];
    const info = ECO_INFO[el];
    const flash = this.add.rectangle(0, FIELD_TOP - 70, W, FIELD_BOTTOM - FIELD_TOP + 70, col, 0).setOrigin(0).setDepth(3400);
    this.tweens.add({ targets: flash, fillAlpha: 0.35, duration: 160, yoyo: true, hold: 200, onComplete: () => flash.destroy() });
    const band = this.add.rectangle(W / 2, 470, W, 110, 0x000000, 0.6).setDepth(3401);
    const icon = this.add.image(W / 2 - 200, 470, `el-${el}`).setDisplaySize(70, 70).setDepth(3402);
    const t = txt(this, W / 2 + 30, 470, `ECO: ${info.name}`, 44, hex(col)).setOrigin(0.5).setDepth(3402);
    for (const o of [band, icon, t]) {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 180, yoyo: true, hold: 700, onComplete: () => o.destroy() });
    }
    for (const v of this.views.values()) if (v.u.alive && v.u.side === 'ally') this.castGlow(v, col);
    await this.wait(900);
  }

  // ───────────────────────── fim da batalha ─────────────────────────

  private confirmFlee() {
    const layer = this.add.container(0, 0).setDepth(9000);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const p = panel(this, 100, 470, W - 200, 260, C.panel, C.line, 18);
    const t = txt(this, W / 2, 530, 'Fugir da batalha?', 30).setOrigin(0.5);
    const sub = txt(this, W / 2, 575, 'Você não ganha nada.', 20, C.dim).setOrigin(0.5);
    const yes = button(this, W / 2 - 110, 660, 180, 64, 'Fugir', () => this.scene.start('Map', { region: this.stage.region }), 0xb0414f);
    const no = button(this, W / 2 + 110, 660, 180, 64, 'Continuar', () => layer.destroy(), 0x3d7a4f);
    layer.add([shade, p, t, sub, yes, no]);
  }

  private finish(win: boolean) {
    this.pending = undefined;
    const s = save();
    const st = this.stage;
    const firstClear = win && s.cleared[st.id] === undefined;
    const starsWon = win ? Math.max(1, 3 - this.battle.fallen.size) : 0;
    const xp = win ? st.xp : Math.round(st.xp * 0.25);
    const crystals = win ? (firstClear ? st.crystals : Math.round(st.crystals / 5)) : 0;
    const ups: { key: string; ups: number }[] = [];
    for (const u of this.battle.allies) {
      const o = u.key ? unitByKey(u.key) : undefined;
      if (o) ups.push({ key: o.key, ups: giveXp(o, xp) });
    }
    let reward: string | undefined;
    if (firstClear && st.reward) {
      const lvl = Math.max(1, Math.max(...st.waves.flat().map((e) => e.lv)) - 2);
      addUnit(st.reward, lvl);
      reward = st.reward;
    }
    if (win) s.cleared[st.id] = Math.max(s.cleared[st.id] ?? 0, starsWon);
    s.crystals += crystals;
    persist();

    const layer = this.add.container(0, 0).setDepth(9000);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setInteractive();
    this.tweens.add({ targets: shade, fillAlpha: 0.7, duration: 300 });
    layer.add(shade);
    const top = 240;
    const ph = !win ? 500 : reward ? 760 : 640;
    layer.add(panel(this, 50, top, W - 100, ph, C.panel, win ? C.gold : 0x8a3a46, 22));
    layer.add(txt(this, W / 2, top + 54, win ? 'VITÓRIA!' : 'DERROTA', 60, win ? hex(C.gold) : '#ff7a86').setOrigin(0.5));
    if (win) {
      const starTxt = txt(this, W / 2, top + 122, '★'.repeat(starsWon) + '☆'.repeat(3 - starsWon), 50, hex(C.gold)).setOrigin(0.5);
      layer.add(starTxt);
    } else {
      layer.add(txt(this, W / 2, top + 118, 'Suba o nível do time, troque os monstros\nou use a vantagem de elemento.', 20, C.dim, { align: 'center' }).setOrigin(0.5));
    }
    // monstros e XP
    s.team.forEach((k, i) => {
      const o = unitByKey(k);
      if (!o) return;
      const def = UNIT_BY_ID[o.id];
      const x = 130 + i * 154;
      const y = top + 240;
      layer.add(this.add.image(x, y, `port-${def.art}`).setDisplaySize(96, 96));
      const g = this.add.graphics();
      g.lineStyle(3, ELEMENT_COLOR[def.element], 1);
      g.strokeRoundedRect(x - 50, y - 50, 100, 100, 12);
      layer.add(g);
      const up = ups.find((u) => u.key === k)?.ups ?? 0;
      layer.add(txt(this, x, y + 66, `Nv ${o.lv}`, 22).setOrigin(0.5));
      layer.add(txt(this, x, y + 92, up ? `+${up} nível!` : `+${xp} XP`, 18, up ? '#9dffb8' : C.dim).setOrigin(0.5));
    });
    let y = top + 380;
    if (crystals) {
      layer.add(txt(this, W / 2, y, `+${crystals} cristais${firstClear ? ' (primeira vitória)' : ''}`, 26, '#9fe2ff').setOrigin(0.5));
      y += 46;
    }
    if (reward) {
      const def = UNIT_BY_ID[reward];
      layer.add(txt(this, W / 2, y + 10, 'Novo monstro se juntou a você!', 24, hex(C.gold)).setOrigin(0.5));
      const img = this.add.image(W / 2 - 120, y + 84, `port-${def.art}`).setDisplaySize(96, 96);
      layer.add(img);
      layer.add(this.add.image(W / 2 - 70, y + 50, `el-${def.element}`).setDisplaySize(30, 30));
      layer.add(txt(this, W / 2 - 50, y + 70, def.name, 28).setOrigin(0, 0.5));
      layer.add(txt(this, W / 2 - 50, y + 102, `${'★'.repeat(def.stars)}  ${def.role}`, 20, hex(C.gold)).setOrigin(0, 0.5));
      y += 150;
    }
    const idx = STAGES.indexOf(st);
    const next = STAGES[idx + 1];
    const by = top + ph - 70;
    if (win && next) {
      layer.add(button(this, W / 2, by - 84, 400, 70, `Próxima fase ▶`, () => this.scene.start('Team', { stage: next.id }), 0x7a4fd6, 28));
    }
    layer.add(button(this, W / 2 - 140, by, 240, 64, win ? 'Repetir' : 'Tentar de novo', () => this.scene.start('Team', { stage: st.id }), 0x3d5a7a, 24));
    layer.add(button(this, W / 2 + 140, by, 240, 64, 'Mapa', () => this.scene.start('Map', { region: st.region }), 0x5a4570, 24));
    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 300 });
  }
}

function targetLabel(sk: SkillDef) {
  switch (sk.target) {
    case 'enemy': return sk.hits && sk.hits > 1 ? `${sk.hits} golpes` : 'Um inimigo';
    case 'allEnemies': return 'Todos inimigos';
    case 'randomEnemies': return `${sk.hits} aleatórios`;
    case 'ally': return 'Um aliado';
    case 'allAllies': return 'Todo o time';
    case 'self': return 'Si mesmo';
  }
}
