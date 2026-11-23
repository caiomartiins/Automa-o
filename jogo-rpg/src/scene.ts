import Phaser from 'phaser';
import { applySheet, hasAnim, preloadAll, setupAll, spriteHeight } from './assets';
import { CLASSES, FIRST_CLASSES, JOB_CHANGE_LEVEL, type ClassId } from './data/classes';
import { item, type ItemDef } from './data/items';
import { MAPS, type MapDef, type SpawnDef } from './data/maps';
import { MONSTERS } from './data/monsters';
import { skill, type SkillDef } from './data/skills';
import {
  baseNeed, canEquip, cannotLearn, defaultHotbar, derive, invAdd, invCount, invRemove, jobNeed, MAX_BASE, normalizeChar, pointsForLevel,
  statCost, syncAuto, type AutoSkill, type Buffs, type CharData, type Derived, type EquipSlot, type StatKey,
} from './game/char';
import { applyDef, elementMod, hitChance, rand, randInt, type Element } from './game/combat';
import { saveChar } from './game/save';
import { blast, damageNumber, DEPTH_FX, floatLabel, hitSpark, levelUpFx, lightning, makeTextures, missText } from './fx';
import { itemCanvas } from './icons';
import { Monster, type Arena } from './monster';
import type { UI } from './ui';
import { TILE, World } from './world';

export type HotSlot = { kind: 'skill'; id: string } | { kind: 'item'; id: string };

interface Drop { id: string; img: Phaser.GameObjects.Image; x: number; y: number; until: number }
interface Proj { img: Phaser.GameObjects.Image; x: number; y: number; target: Monster; speed: number; onHit: (m: Monster) => void }
interface Orb { img: Phaser.GameObjects.Image; vx: number; vy: number; homing: boolean; life: number; m: Monster }
interface NpcObj { def: MapDef['npcs'][number]; sprite: Phaser.GameObjects.Sprite; x: number; y: number }

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() { preloadAll(this); }
  create() {
    setupAll(this);
    makeTextures(this);
    this.game.events.emit('ready');
  }
}

export class GameScene extends Phaser.Scene implements Arena {
  ui!: UI;
  char!: CharData;
  d!: Derived;
  buffs: Buffs = {};
  world!: World;
  mapImage?: Phaser.GameObjects.Image;
  mapObjects: Phaser.GameObjects.GameObject[] = [];
  monsters: Monster[] = [];
  respawns: { spawn: SpawnDef; at: number }[] = [];
  bossRespawnAt: Record<string, number> = {};
  npcs: NpcObj[] = [];
  drops: Drop[] = [];
  projs: Proj[] = [];
  orbs: Orb[] = [];
  portals: { def: MapDef['portals'][number]; pts: [number, number][] }[] = [];

  sprite!: Phaser.GameObjects.Sprite;
  shadow!: Phaser.GameObjects.Image;
  nameTag!: Phaser.GameObjects.Text;
  bars!: Phaser.GameObjects.Graphics;
  player = { x: 0, y: 0, dead: false };

  now = 0;
  path: { x: number; y: number }[] | null = null;
  pathT = 0;
  target: Monster | null = null;
  pendingSkill: string | null = null;
  pendingNpc: NpcObj | null = null;
  pendingDrop: Drop | null = null;
  attackT = 0;
  busyUntil = 0;
  casting: { id: string; lv: number; start: number; end: number; target: Monster | null } | null = null;
  cooldowns = new Map<string, number>();
  itemCdUntil = 0;
  sitting = false;
  slowUntil = 0;
  regenHp = 0;
  regenSp = 0;
  saveT = 0;
  changing = false;
  portalLock = 0;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  /** caça automática */
  auto = false;
  autoThink = 0;
  autoBlacklist = new Map<number, number>();
  chaseStuck = 0;

  constructor() { super('game'); }

  get stage(): Phaser.Scene { return this; }

  init(data: { char: CharData; ui: UI }) {
    this.char = data.char;
    this.ui = data.ui;
  }

  create() {
    normalizeChar(this.char);
    this.recalc();
    if (this.char.hp > this.d.maxHp) this.char.hp = this.d.maxHp;
    if (this.char.sp > this.d.maxSp) this.char.sp = this.d.maxSp;

    this.shadow = this.add.image(0, 0, 'shadow').setDisplaySize(44, 16);
    this.sprite = this.add.sprite(0, 0, CLASSES[this.char.cls].texture);
    this.nameTag = this.add.text(0, 0, this.char.name, {
      fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: '12px', color: '#ffffff', stroke: '#101830', strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.bars = this.add.graphics();
    this.setClassLook();

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    this.input.mouse?.disableContextMenu();

    this.scale.on('resize', () => this.fitZoom());
    this.fitZoom();

    const startMap = MAPS[this.char.map] ? this.char.map : 'campos';
    this.loadMap(startMap, this.char.x > 0 ? [Math.floor(this.char.x / TILE), Math.floor(this.char.y / TILE)] : undefined, true);
    if (this.char.x > 0 && this.world.canStand(this.char.x, this.char.y)) this.sprite.setPosition(this.char.x, this.char.y);
    this.ui.attach(this);
    if (this.char.statPoints > 0 && this.char.baseLv === 1) this.ui.open('status');
    this.ui.log(`Taxa de experiência de teste: ${this.char.expRate}x (mude no Menu).`, 'sys');
  }

  fitZoom() {
    const w = this.scale.width;
    this.cameras.main.setZoom(w < 520 ? 0.78 : w < 900 ? 0.9 : 1);
  }

  // ================================================================ estado

  recalc() {
    this.d = derive(this.char, this.buffs, this.now);
  }

  changed() {
    this.recalc();
    this.char.hp = Math.min(this.char.hp, this.d.maxHp);
    this.char.sp = Math.min(this.char.sp, this.d.maxSp);
    this.ui?.refresh();
  }

  save() {
    this.char.x = this.sprite.x;
    this.char.y = this.sprite.y;
    this.char.map = this.world.def.id;
    saveChar(this.char);
  }

  setClassLook() {
    const tex = CLASSES[this.char.cls].texture;
    applySheet(this.sprite, tex);
    this.sprite.play(`${tex}-idle`);
  }

  // ================================================================ mapa

  loadMap(id: string, arrive?: [number, number], first = false) {
    // limpa o mapa anterior
    for (const m of this.monsters) m.destroy();
    for (const d of this.drops) d.img.destroy();
    for (const p of this.projs) p.img.destroy();
    for (const o of this.orbs) o.img.destroy();
    for (const n of this.npcs) n.sprite.destroy();
    for (const o of this.mapObjects) o.destroy();
    this.monsters = []; this.drops = []; this.projs = []; this.orbs = []; this.npcs = []; this.mapObjects = []; this.respawns = [];
    this.mapImage?.destroy();
    if (this.textures.exists('map')) this.textures.remove('map');
    this.target = null; this.path = null; this.pendingSkill = null; this.pendingNpc = null; this.pendingDrop = null; this.casting = null;

    const def = MAPS[id];
    this.world = new World(this, def);
    this.textures.addCanvas('map', this.world.canvas);
    this.mapImage = this.add.image(0, 0, 'map').setOrigin(0).setDepth(-100000);
    for (const o of this.world.objects) {
      const img = this.add.image(o.x, o.y, o.key).setOrigin(0.5, 1).setFlipX(o.flip);
      img.setScale(o.w / img.width).setDepth(o.y);
      this.mapObjects.push(img);
    }
    // portais
    this.portals = def.portals.map((p) => ({ def: p, pts: p.tiles.map(([x, y]) => this.world.tileCenter(x, y)) }));
    for (const p of this.portals) {
      const cx = p.pts.reduce((s, q) => s + q[0], 0) / p.pts.length, cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length;
      const ring = this.add.image(cx, cy, 'portal').setDepth(cy - 30).setBlendMode('ADD');
      this.tweens.add({ targets: ring, scaleX: 1.12, scaleY: 1.12, alpha: 0.7, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
      const pe = this.add.particles(cx, cy, 'spark', {
        x: { min: -34, max: 34 }, speedY: { min: -90, max: -40 }, lifespan: 1000, scale: { start: 0.45, end: 0 },
        tint: [0x7fd0ff, 0xffffff], quantity: 1, frequency: 70, blendMode: 'ADD',
      }).setDepth(cy + 1);
      const label = this.add.text(cx, cy - 64, p.def.label, {
        fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: '13px', color: '#dff3ff', stroke: '#0b2040', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(DEPTH_FX);
      this.mapObjects.push(ring, pe, label);
    }
    // NPCs
    for (const n of def.npcs) {
      const [x, y] = this.world.tileCenter(n.x, n.y);
      const s = this.add.sprite(x, y + 20, n.texture);
      applySheet(s, n.texture);
      s.play(`${n.texture}-idle`).setFlipX(!!n.flip).setDepth(y + 20);
      const sh = this.add.image(x, y + 20, 'shadow').setDisplaySize(46, 16).setDepth(y - 1000);
      const tag = this.add.text(x, y + 24, n.name, {
        fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: '12px', color: '#ffe9a8', stroke: '#2a1a00', strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(DEPTH_FX - 1);
      const bubble = this.add.text(x, y - spriteHeight(n.texture) + 6, '…', {
        fontFamily: 'Nunito, sans-serif', fontStyle: '800', fontSize: '16px', color: '#1d2742', backgroundColor: '#f3f6fc', padding: { x: 6, y: 0 },
      }).setOrigin(0.5, 1).setDepth(DEPTH_FX - 1);
      this.tweens.add({ targets: bubble, y: bubble.y - 4, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
      this.mapObjects.push(sh, tag, bubble);
      this.npcs.push({ def: n, sprite: s, x, y: y + 20 });
    }
    // monstros
    for (const sp of def.spawns) {
      if (MONSTERS[sp.monster].boss) {
        const at = this.bossRespawnAt[id] ?? 0;
        const wait = Math.max(0, (at - Date.now()) / 1000);
        if (wait > 0) { this.respawns.push({ spawn: sp, at: this.now + wait }); continue; }
      }
      for (let i = 0; i < sp.count; i++) this.spawnMonster(sp);
    }
    // jogador
    const [tx, ty] = arrive ?? def.start;
    const [px, py] = this.world.tileCenter(...this.world.nearestWalkable(tx, ty));
    this.sprite.setPosition(px, py);
    this.cameras.main.setBounds(0, 0, this.world.pxW, this.world.pxH);
    this.cameras.main.startFollow(this.sprite, true, 0.12, 0.12);
    this.cameras.main.centerOn(px, py);
    this.portalLock = this.now + 1;
    this.char.map = id;
    if (!first) this.ui.mapChanged();
  }

  spawnMonster(sp: SpawnDef, x?: number, y?: number) {
    const def = MONSTERS[sp.monster];
    if (x === undefined || y === undefined) {
      // longe do jogador quando possível
      for (let i = 0; i < 6; i++) {
        [x, y] = this.world.randomWalkable(sp.rect);
        if (def.boss || Math.hypot(x - this.sprite.x, y - this.sprite.y) > 260) break;
      }
    }
    const m = new Monster(this, def, sp, x!, y!);
    this.monsters.push(m);
    if (def.boss && this.ui) {
      this.ui.log(`${def.name} apareceu no ${this.world.def.name}!`, 'warn');
    }
    return m;
  }

  goPortal(p: MapDef['portals'][number]) {
    if (this.changing) return;
    this.changing = true;
    this.save();
    this.cameras.main.fadeOut(220, 5, 10, 25);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.loadMap(p.to, p.arrive);
      this.save();
      this.cameras.main.fadeIn(260, 5, 10, 25);
      this.changing = false;
    });
  }

  // ================================================================ entrada

  onKey(e: KeyboardEvent) {
    if (this.ui.typing()) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '8') { this.useHot(Number(k) - 1); return; }
    if (k === 'c') this.ui.toggle('status');
    else if (k === 'i' || k === 'e') this.ui.toggle('itens');
    else if (k === 'k') this.ui.toggle('habilidades');
    else if (k === 'x') this.toggleSit();
    else if (k === 'z') this.toggleAuto();
    else if (k === 'g') this.ui.toggle('auto');
    else if (k === 'escape') { if (!this.ui.closeAll()) this.target = null; }
    else if (k === ' ') { e.preventDefault(); this.targetNearest(); }
  }

  onPointer(p: Phaser.Input.Pointer) {
    if (this.player.dead || this.changing) return;
    const wx = p.worldX, wy = p.worldY;
    this.ui.closeTransient();
    // monstro (o mais próximo do clique)
    let best: Monster | null = null, bd = Infinity;
    for (const m of this.monsters) {
      if (m.dead || !m.contains(wx, wy)) continue;
      const d = Math.hypot(m.x - wx, m.y - m.height / 2 - wy);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) { this.attackTarget(best); return; }
    for (const n of this.npcs) {
      if (Math.abs(wx - n.x) < 30 && wy > n.y - 90 && wy < n.y + 12) {
        this.toggleAuto(false); this.clearActions(); this.pendingNpc = n; this.walkTo(n.x, n.y + 30); return;
      }
    }
    for (const d of this.drops) {
      if (Math.hypot(wx - d.x, wy - d.y) < 24) { this.clearActions(); this.pendingDrop = d; this.walkTo(d.x, d.y); return; }
    }
    this.toggleAuto(false);
    this.clearActions();
    this.walkTo(wx, wy);
    const mark = this.add.image(wx, wy, 'click').setDepth(wy - 900).setTint(0x9ee6ff).setAlpha(0.9);
    this.tweens.add({ targets: mark, scale: 0.4, alpha: 0, duration: 380, onComplete: () => mark.destroy() });
  }

  clearActions() {
    this.target = null; this.pendingSkill = null; this.pendingNpc = null; this.pendingDrop = null;
    if (this.casting) this.cancelCast();
  }

  walkTo(x: number, y: number) {
    this.standUp();
    this.path = this.world.findPath(this.sprite.x, this.sprite.y, x, y);
  }

  attackTarget(m: Monster) {
    this.clearActions();
    this.target = m;
    this.path = null;
    this.standUp();
  }

  targetNearest() {
    const m = this.nearestMonster(10 * TILE);
    if (m) this.attackTarget(m);
  }

  nearestMonster(max: number) {
    let best: Monster | null = null, bd = max;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.x - this.sprite.x, m.y - this.sprite.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  toggleSit() {
    if (this.player.dead) return;
    if (this.sitting) { this.standUp(); return; }
    this.clearActions();
    this.path = null;
    this.sitting = true;
    this.sprite.anims.stop();
    this.sprite.setFrame('idle0');
    this.sprite.setScale(this.sprite.scaleX, this.sprite.scaleX * 0.86);
    this.ui.log('Sentado: recupera HP e SP duas vezes mais rápido.', 'sys');
    this.ui.refresh();
  }

  standUp() {
    if (!this.sitting) return;
    this.sitting = false;
    this.sprite.setScale(this.sprite.scaleX, this.sprite.scaleX);
    this.ui.refresh();
  }

  // ================================================================ barra de atalhos

  hotbar(): (HotSlot | null)[] {
    return this.char.hotbar.map((h) => {
      const [kind, id] = h.split(':');
      if (kind === 'skill' && id) return { kind: 'skill' as const, id };
      if (kind === 'item' && id) return { kind: 'item' as const, id };
      return null;
    });
  }

  setHotbar(i: number, value: string) {
    this.char.hotbar[i] = value;
    this.ui.refresh();
  }

  useHot(i: number) {
    const s = this.hotbar()[i];
    if (!s) return;
    if (s.kind === 'skill') this.useSkill(s.id);
    else this.useItem(s.id);
  }

  cooldownLeft(id: string) {
    return Math.max(0, (this.cooldowns.get(id) ?? 0) - this.now);
  }

  // ================================================================ habilidades

  useSkill(id: string) {
    if (this.player.dead) return;
    const sk = skill(id);
    const lv = this.char.skills[id] ?? 0;
    if (sk.cls !== this.char.cls && sk.cls !== 'aprendiz') return;
    if (!lv) { this.ui.log(`Você ainda não aprendeu ${sk.name}. Abra Habilidades (K).`, 'warn'); return; }
    if (this.cooldownLeft(id) > 0 || this.casting) return;
    const sp = sk.sp?.(lv) ?? 0;
    if (this.char.sp < sp) { this.ui.log('SP insuficiente.', 'warn'); floatLabel(this, this.sprite.x, this.sprite.y - 90, 'SP insuficiente', '#9ec8ff', 12); return; }
    if ((id === 'disparo-duplo' || id === 'chuva-flechas') && !this.d.ranged) { this.ui.log('Esta habilidade precisa de um arco equipado.', 'warn'); return; }
    this.standUp();
    if (sk.target === 'proprio') { this.beginCast(id, lv, null); return; }
    let t = this.target && !this.target.dead ? this.target : null;
    if (!t) t = this.nearestMonster(9 * TILE);
    if (!t) { this.ui.log('Nenhum alvo por perto.', 'warn'); return; }
    this.target = t;
    this.pendingSkill = id;
    this.path = null;
  }

  skillRange(id: string) {
    return skill(id).range ?? this.d.range;
  }

  beginCast(id: string, lv: number, target: Monster | null) {
    const sk = skill(id);
    const t = (sk.cast?.(lv) ?? 0) * this.d.castFactor;
    this.pendingSkill = null;
    if (t < 0.05) { this.execSkill(id, lv, target); return; }
    this.casting = { id, lv, start: this.now, end: this.now + t, target };
    this.path = null;
  }

  cancelCast() {
    if (!this.casting) return;
    this.casting = null;
    floatLabel(this, this.sprite.x, this.sprite.y - 90, 'Cancelado', '#ffb3a6', 12);
  }

  execSkill(id: string, lv: number, target: Monster | null) {
    const sk = skill(id);
    const sp = sk.sp?.(lv) ?? 0;
    if (this.char.sp < sp) { this.ui.log('SP insuficiente.', 'warn'); return; }
    if (target && target.dead && sk.target !== 'proprio') return;
    this.char.sp -= sp;
    this.cooldowns.set(id, this.now + (sk.cd?.(lv) ?? 0.3));
    this.playAttack();
    const px = this.sprite.x, py = this.sprite.y;
    if (target) this.sprite.setFlipX(target.x < px);
    floatLabel(this, px, py - 96, `${sk.name}!`, '#fff2b0', 13);

    switch (id) {
      case 'primeiros-socorros': this.heal(8 + this.char.baseLv, 0); break;
      case 'golpe-poderoso': {
        if (!target) break;
        const hit = this.physHit(target, (100 + 30 * lv) / 100, { hitBonus: 5 * lv });
        if (hit && lv >= 6 && Math.random() < (lv - 5) * 0.05) { target.stunUntil = this.now + 2; floatLabel(this, target.x, target.y - target.height, 'Atordoado', '#ffe08a', 12); }
        break;
      }
      case 'impacto-explosivo': {
        blast(this, px, py - 10, 130, 0xff6a1f);
        this.cameras.main.shake(120, 0.004);
        for (const m of this.monsters) {
          if (m.dead || m.distTo(px, py) > 130) continue;
          this.physHit(m, (100 + 20 * lv) / 100, { element: 'fogo', hitBonus: 10 * lv });
          this.knockback(m, px, py, 48);
        }
        break;
      }
      case 'seta-fogo': case 'seta-gelo': case 'seta-raio': {
        if (!target) break;
        const element: Element = id === 'seta-fogo' ? 'fogo' : id === 'seta-gelo' ? 'agua' : 'vento';
        for (let i = 0; i < lv; i++) {
          this.time.delayedCall(i * 130, () => {
            if (target.dead) return;
            const onHit = (m: Monster) => {
              this.magicHit(m, 1, element);
              if (element === 'agua' && !m.def.boss && !m.dead && Math.random() < 0.03 * lv) {
                m.frozenUntil = this.now + 3; m.sprite.setTint(0x9ee6ff);
                floatLabel(this, m.x, m.y - m.height, 'Congelado', '#bff1ff', 12);
              }
            };
            if (element === 'vento') { lightning(this, target.x, target.y - 10); onHit(target); }
            else this.shoot(element === 'fogo' ? 'bolt-fogo' : 'bolt-gelo', target, 620, onHit);
          });
        }
        break;
      }
      case 'bola-fogo': {
        if (!target) break;
        this.shoot('bolt-fogo', target, 520, (m) => {
          blast(this, m.x, m.y - 10, 100, 0xff4a1f);
          for (const o of this.monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) <= 100 + o.def.radius) this.magicHit(o, (150 + 20 * lv) / 100, 'fogo');
        }, 1.6);
        break;
      }
      case 'disparo-duplo': {
        if (!target) break;
        for (let i = 0; i < 2; i++) this.time.delayedCall(i * 110, () => {
          if (!target.dead) this.shoot('flecha', target, 900, (m) => this.physHit(m, (90 + 10 * lv) / 100));
        });
        break;
      }
      case 'chuva-flechas': {
        if (!target) break;
        const cx = target.x, cy = target.y;
        for (let i = 0; i < 9; i++) {
          const ax = cx + Phaser.Math.Between(-90, 90), ay = cy + Phaser.Math.Between(-60, 60);
          const arrow = this.add.image(ax, ay - 260, 'flecha').setRotation(Math.PI / 2).setDepth(DEPTH_FX).setScale(0.9);
          this.tweens.add({ targets: arrow, y: ay, duration: 230, delay: i * 25, onComplete: () => { arrow.destroy(); hitSpark(this, ax, ay, 0xdfe6ee, 3); } });
        }
        this.time.delayedCall(260, () => {
          for (const m of this.monsters) if (!m.dead && Math.hypot(m.x - cx, m.y - cy) <= 110 + m.def.radius) this.physHit(m, (80 + 5 * lv) / 100);
        });
        break;
      }
      case 'concentracao': {
        this.buffs.conc = { amount: lv + 2, until: this.now + 40 + 20 * lv };
        levelUpFx(this, px, py, 0xc77dd6);
        this.ui.log(`Concentração: +${lv + 2} AGI e DES.`, 'sys');
        this.changed();
        break;
      }
    }
    this.busyUntil = this.now + 0.3;
    this.attackT = Math.max(this.attackT, 0.35);
    this.ui.refresh();
  }

  shoot(tex: string, target: Monster, speed: number, onHit: (m: Monster) => void, scale = 1) {
    const x = this.sprite.x + (target.x > this.sprite.x ? 18 : -18), y = this.sprite.y - 40;
    const img = this.add.image(x, y, tex).setDepth(DEPTH_FX).setScale(scale);
    if (tex !== 'flecha') img.setBlendMode('ADD');
    this.projs.push({ img, x, y, target, speed, onHit });
  }

  knockback(m: Monster, fx: number, fy: number, dist: number) {
    if (m.def.boss) return;
    const a = Math.atan2(m.y - fy, m.x - fx);
    const nx = m.x + Math.cos(a) * dist, ny = m.y + Math.sin(a) * dist;
    if (this.world.canStand(nx, ny, 12)) this.tweens.add({ targets: m.sprite, x: nx, y: ny, duration: 160, ease: 'Quad.easeOut' });
  }

  // ================================================================ dano

  physHit(m: Monster, mult: number, opt: { element?: Element; hitBonus?: number } = {}) {
    if (m.dead) return false;
    const d = this.d;
    const crit = Math.random() * 100 < d.crit;
    const flee = m.def.lv + m.def.agi;
    if (!crit && Math.random() > hitChance(d.hit + (opt.hitBonus ?? 0), flee)) {
      missText(this, m.x, m.y - m.height * 0.8);
      m.hurt(this.now);
      return false;
    }
    const element = opt.element ?? 'neutro';
    const emod = elementMod(element, m.def.element);
    const raw = d.atk * rand(0.92, 1.08) * mult * (1 + (this.char.jobLv - 1) * 0.01);
    let dmg = crit ? Math.round(raw * 1.4) : applyDef(raw, m.def.def, Math.floor(m.def.lv / 2));
    dmg = Math.max(emod > 0 ? 1 : 0, Math.round(dmg * emod));
    this.damageMonster(m, dmg, crit ? 'crit' : emod > 1 ? 'weak' : emod < 1 ? 'resist' : 'normal');
    return true;
  }

  magicHit(m: Monster, mult: number, element: Element) {
    if (m.dead) return;
    const emod = elementMod(element, m.def.element);
    const raw = rand(this.d.matkMin, this.d.matkMax) * mult;
    let dmg = Math.round(raw * (1 - m.def.mdef / 100) - m.def.lv / 3);
    dmg = Math.max(emod > 0 ? 1 : 0, Math.round(dmg * emod));
    this.damageMonster(m, dmg, emod > 1 ? 'weak' : emod < 1 ? 'resist' : 'normal');
  }

  damageMonster(m: Monster, dmg: number, kind: 'normal' | 'crit' | 'weak' | 'resist') {
    m.hp -= dmg;
    m.hurt(this.now);
    damageNumber(this, m.x, m.y - m.height * 0.85, dmg, kind);
    hitSpark(this, m.x + Phaser.Math.Between(-8, 8), m.y - m.height * 0.45, kind === 'crit' ? 0xffe14a : 0xffffff, 5);
    if (m.frozenUntil > this.now && dmg > 0) m.frozenUntil = 0;
    if (m.hp <= 0) this.killMonster(m);
  }

  killMonster(m: Monster) {
    m.die();
    if (this.target === m) { this.target = null; this.pendingSkill = null; }
    this.time.delayedCall(1200, () => {
      m.destroy();
      this.monsters = this.monsters.filter((x) => x !== m);
    });
    const def = m.def;
    if (!m.minion && m.spawn) {
      this.respawns.push({ spawn: m.spawn, at: this.now + m.spawn.respawn });
      if (def.boss) this.bossRespawnAt[this.world.def.id] = Date.now() + m.spawn.respawn * 1000;
    }
    // recompensas
    const mult = (m.minion ? 0.5 : 1) * this.char.expRate;
    this.gainExp(Math.round(def.baseExp * mult), Math.round(def.jobExp * mult));
    let k = 0;
    for (const [id, chance] of def.drops) {
      if (Math.random() < chance * (1 + this.d.stats.luk * 0.01)) this.dropItem(id, m.x, m.y, k++);
    }
    if (def.boss) {
      this.char.mvpKills++;
      this.ui.banner('MVP!', `Você derrotou o ${def.name}`);
      this.ui.log(`MVP! Você derrotou o ${def.name}. Ele volta em ${Math.round((m.spawn?.respawn ?? 300) / 60)} minutos.`, 'item');
      this.cameras.main.flash(300, 255, 230, 150);
      this.save();
    }
  }

  dropItem(id: string, x: number, y: number, k: number) {
    const key = `icon-${id}`;
    if (!this.textures.exists(key)) {
      const it = item(id);
      this.textures.addCanvas(key, itemCanvas(id, it.icon, it.color));
    }
    const a = k * 2.1 + Math.random(), r = 18 + k * 6;
    const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r * 0.6;
    const img = this.add.image(x, y - 20, key).setDisplaySize(30, 30).setDepth(ty);
    this.tweens.add({ targets: img, x: tx, duration: 380 });
    this.tweens.add({ targets: img, y: ty - 34, duration: 190, ease: 'Quad.easeOut', yoyo: false, onComplete: () => this.tweens.add({ targets: img, y: ty, duration: 190, ease: 'Bounce.easeOut' }) });
    this.drops.push({ id, img, x: tx, y: ty, until: this.now + (item(id).type === 'etc' && item(id).sell > 1000 ? 180 : 60) });
  }

  pickUp(d: Drop) {
    const it = item(d.id);
    invAdd(this.char, d.id, 1);
    this.ui.log(`Você pegou ${it.name}.`, 'item');
    d.img.destroy();
    this.drops = this.drops.filter((x) => x !== d);
    if (this.pendingDrop === d) this.pendingDrop = null;
    this.ui.refresh();
  }

  gainExp(base: number, job: number) {
    const c = this.char;
    if (c.baseLv < MAX_BASE) c.baseExp += base;
    const maxJob = CLASSES[c.cls].maxJob;
    if (c.jobLv < maxJob) c.jobExp += job;
    this.ui.log(`+${base} exp base · +${job} exp de classe`, 'exp');
    let up = false;
    while (c.baseLv < MAX_BASE && c.baseExp >= baseNeed(c.baseLv)) {
      c.baseExp -= baseNeed(c.baseLv);
      c.baseLv++;
      c.statPoints += pointsForLevel(c.baseLv);
      up = true;
    }
    if (c.baseLv >= MAX_BASE) c.baseExp = 0;
    if (up) {
      this.recalc();
      c.hp = this.d.maxHp; c.sp = this.d.maxSp;
      levelUpFx(this, this.sprite.x, this.sprite.y);
      this.ui.banner('Level Up!', `Nível de base ${c.baseLv} · ${c.statPoints} pontos de atributo`);
      this.ui.log(`Você subiu para o nível ${c.baseLv}! Use os pontos em Status (C).`, 'sys');
    }
    let jup = false;
    while (c.jobLv < maxJob && c.jobExp >= jobNeed(c.cls, c.jobLv)) {
      c.jobExp -= jobNeed(c.cls, c.jobLv);
      c.jobLv++;
      c.skillPoints++;
      jup = true;
    }
    if (c.jobLv >= maxJob) c.jobExp = 0;
    if (jup) {
      levelUpFx(this, this.sprite.x, this.sprite.y, 0xb48aff);
      if (!up) this.ui.banner('Job Level Up!', `Nível de classe ${c.jobLv}`);
      this.ui.log(`Nível de classe ${c.jobLv}! +1 ponto de habilidade.`, 'sys');
      if (c.cls === 'aprendiz' && c.jobLv >= JOB_CHANGE_LEVEL) this.ui.log('Você já pode mudar de classe! Fale com o Instrutor Dário no acampamento.', 'item');
    }
    if (up || jup) { this.changed(); this.save(); }
  }

  heal(hp: number, sp: number) {
    const c = this.char;
    if (hp) { const v = Math.min(hp, this.d.maxHp - c.hp); c.hp += v; damageNumber(this, this.sprite.x, this.sprite.y - 80, hp, 'heal'); }
    if (sp) c.sp = Math.min(this.d.maxSp, c.sp + sp);
  }

  // ---- dano no jogador (Arena) ----

  monsterHitsPlayer(m: Monster, mult = 1, sure = false) {
    if (this.player.dead || m.dead) return;
    if (!sure && Math.random() > hitChance(m.def.lv + m.def.dex, this.d.flee)) {
      missText(this, this.sprite.x, this.sprite.y - 70);
      return;
    }
    const raw = randInt(m.def.atk[0], m.def.atk[1]) * mult;
    this.hurtPlayer(applyDef(raw, this.d.def, this.d.softDef));
  }

  areaHitsPlayer(m: Monster, x: number, y: number, r: number, mult: number, effect?: 'curse') {
    if (this.player.dead || m.dead) return;
    if (Math.hypot(this.sprite.x - x, (this.sprite.y - y) * 2) > r) return;
    this.monsterHitsPlayer(m, mult, true);
    if (effect === 'curse') {
      this.slowUntil = this.now + 4;
      floatLabel(this, this.sprite.x, this.sprite.y - 100, 'Amaldiçoado', '#d08aff', 13);
    }
  }

  shootOrb(m: Monster, angle: number, homing: boolean) {
    const img = this.add.image(m.x, m.y - 60, 'proj-sombra').setDepth(DEPTH_FX).setScale(1.1).setRotation(angle);
    this.orbs.push({ img, vx: Math.cos(angle) * 260, vy: Math.sin(angle) * 260, homing, life: 3.2, m });
  }

  summon(m: Monster, id: string, n: number) {
    const alive = this.monsters.filter((x) => x.minion && !x.dead).length;
    for (let i = 0; i < Math.min(n, 6 - alive); i++) {
      const a = Math.random() * Math.PI * 2;
      const x = m.x + Math.cos(a) * 90, y = m.y + Math.sin(a) * 60;
      if (!this.world.canStand(x, y, 12)) continue;
      const s = new Monster(this, MONSTERS[id], null, x, y, true);
      s.aggro = true;
      this.monsters.push(s);
      hitSpark(this, x, y - 20, 0xb04aff, 10);
    }
    this.ui.log(`${m.def.name} invocou servos!`, 'warn');
  }

  monsterAggro(m: Monster) {
    if (!m.def.pack) return;
    for (const o of this.monsters) if (o !== m && !o.dead && o.def.id === m.def.id && Math.hypot(o.x - m.x, o.y - m.y) < 380) o.aggro = true;
  }

  hurtPlayer(dmg: number) {
    const c = this.char;
    c.hp -= dmg;
    damageNumber(this, this.sprite.x, this.sprite.y - 70, dmg, 'taken');
    this.sprite.setTint(0xff7070);
    this.time.delayedCall(90, () => this.sprite.clearTint());
    if (this.sitting) this.standUp();
    if (c.hp <= 0) this.playerDie();
  }

  playerDie() {
    this.char.hp = 0;
    this.player.dead = true;
    this.auto = false;
    this.clearActions();
    this.path = null;
    const tex = CLASSES[this.char.cls].texture;
    this.sprite.play(`${tex}-die`);
    for (const m of this.monsters) { m.aggro = false; }
    this.ui.death();
  }

  respawn() {
    const c = this.char;
    if (c.baseLv < MAX_BASE) c.baseExp = Math.max(0, c.baseExp - Math.floor(baseNeed(c.baseLv) * 0.01));
    this.player.dead = false;
    this.recalc();
    c.hp = Math.ceil(this.d.maxHp / 2);
    c.sp = Math.ceil(this.d.maxSp / 2);
    this.setClassLook();
    this.loadMap('campos', MAPS.campos.start);
    this.save();
    this.ui.refresh();
  }

  // ================================================================ itens e NPCs

  useItem(id: string) {
    if (this.player.dead) return;
    const it = item(id);
    if (invCount(this.char, id) <= 0) { this.ui.log(`Você não tem ${it.name}.`, 'warn'); return; }
    if (it.type !== 'consumo') { this.equip(id); return; }
    if (this.now < this.itemCdUntil) return;
    this.itemCdUntil = this.now + 0.25;
    if (it.heal) {
      invRemove(this.char, id);
      this.heal(it.heal.hp ?? 0, it.heal.sp ?? 0);
      if (it.heal.sp) floatLabel(this, this.sprite.x, this.sprite.y - 100, `+${it.heal.sp} SP`, '#9ec8ff', 12);
    } else if (it.teleport === 'mosca') {
      invRemove(this.char, id);
      const [x, y] = this.world.randomWalkable();
      this.clearActions(); this.path = null;
      this.sprite.setPosition(x, y);
      this.cameras.main.centerOn(x, y);
      levelUpFx(this, x, y, 0x9ee6ff);
    } else if (it.teleport === 'borboleta') {
      invRemove(this.char, id);
      this.goPortal({ tiles: [], to: 'campos', arrive: MAPS.campos.start, label: '' });
    }
    this.ui.refresh();
  }

  equip(id: string) {
    const it = item(id);
    const why = canEquip(this.char, id);
    if (why) { this.ui.log(why, 'warn'); return; }
    const slot = it.type as EquipSlot;
    this.char.equip[slot] = id;
    this.ui.log(`${it.name} equipado.`, 'sys');
    this.changed();
  }

  unequip(slot: EquipSlot) {
    const id = this.char.equip[slot];
    if (!id) return;
    delete this.char.equip[slot];
    this.ui.log(`${item(id).name} desequipado.`, 'sys');
    this.changed();
  }

  buy(id: string, n: number) {
    const it = item(id);
    const cost = it.price * n;
    if (this.char.zeny < cost) { this.ui.log('Zeny insuficiente.', 'warn'); return; }
    this.char.zeny -= cost;
    invAdd(this.char, id, n);
    this.ui.log(`Comprou ${n}x ${it.name} por ${cost.toLocaleString('pt-BR')} z.`, 'item');
    this.changed();
    this.save();
  }

  sellable(id: string) {
    const eq = Object.values(this.char.equip).includes(id) ? 1 : 0;
    return invCount(this.char, id) - eq;
  }

  sell(id: string, n: number) {
    const it = item(id);
    n = Math.min(n, this.sellable(id));
    if (n <= 0) return;
    invRemove(this.char, id, n);
    this.char.zeny += it.sell * n;
    this.ui.log(`Vendeu ${n}x ${it.name} por ${(it.sell * n).toLocaleString('pt-BR')} z.`, 'item');
    this.changed();
    this.save();
  }

  addStat(k: StatKey, times = 1) {
    const c = this.char;
    for (let i = 0; i < times; i++) {
      const cost = statCost(c.stats[k]);
      if (c.stats[k] >= 99 || c.statPoints < cost) break;
      c.statPoints -= cost;
      c.stats[k]++;
    }
    this.changed();
  }

  learnSkill(id: string) {
    const why = cannotLearn(this.char, id);
    if (why) { this.ui.log(why, 'warn'); return; }
    this.char.skills[id] = (this.char.skills[id] ?? 0) + 1;
    this.char.skillPoints--;
    this.changed();
  }

  changeClass(cls: ClassId) {
    const c = this.char;
    if (c.cls !== 'aprendiz' || c.jobLv < JOB_CHANGE_LEVEL || !FIRST_CLASSES.includes(cls)) return;
    c.cls = cls;
    c.jobLv = 1;
    c.jobExp = 0;
    const gift: Record<string, [string, string]> = {
      espadachim: ['golpe-poderoso', 'espada-curta'], mago: ['seta-fogo', 'cajado'], arqueiro: ['disparo-duplo', 'arco'],
    };
    const [sk, weapon] = gift[cls];
    c.skills[sk] = Math.max(1, c.skills[sk] ?? 0);
    invAdd(c, weapon, 1);
    c.equip.arma = weapon;
    c.hotbar = defaultHotbar(cls);
    c.auto.skills = [];
    syncAuto(c);
    this.setClassLook();
    this.recalc();
    c.hp = this.d.maxHp; c.sp = this.d.maxSp;
    levelUpFx(this, this.sprite.x, this.sprite.y, 0x9ee6ff);
    this.ui.banner(`${CLASSES[cls].name}!`, 'Você ganhou uma arma nova e a primeira habilidade');
    this.ui.log(`Agora você é ${CLASSES[cls].name}! Você tem ${c.skillPoints} pontos de habilidade (K).`, 'sys');
    this.changed();
    this.save();
  }

  restAtCamp() {
    this.char.hp = this.d.maxHp;
    this.char.sp = this.d.maxSp;
    levelUpFx(this, this.sprite.x, this.sprite.y, 0x6eff7a);
    this.save();
    this.ui.refresh();
  }

  // ================================================================ ataque básico

  playAttack() {
    const tex = CLASSES[this.char.cls].texture;
    this.sprite.play(`${tex}-attack`);
    const dur = this.sprite.anims.currentAnim?.duration ?? 300;
    this.sprite.anims.timeScale = Math.max(1, dur / 1000 / Math.max(0.2, this.d.delay * 0.9));
    this.sprite.once('animationcomplete', () => {
      this.sprite.anims.timeScale = 1;
      if (!this.player.dead && !this.sitting) this.sprite.play(`${tex}-idle`);
    });
  }

  basicAttack(m: Monster) {
    this.attackT = this.d.delay;
    this.playAttack();
    this.sprite.setFlipX(m.x < this.sprite.x);
    if (this.d.ranged) this.shoot('flecha', m, 900, (t) => this.physHit(t, 1));
    else this.time.delayedCall(110, () => this.physHit(m, 1));
    this.busyUntil = this.now + Math.min(0.3, this.d.delay * 0.6);
  }

  // ================================================================ laço principal

  update(_t: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.now += dt;
    const c = this.char;
    if (this.buffs.conc && this.buffs.conc.until <= this.now) { delete this.buffs.conc; this.ui.log('Concentração acabou.', 'sys'); this.changed(); }

    if (this.auto && !this.player.dead && !this.changing) this.updateAuto(dt);
    if (!this.player.dead && !this.changing) this.updatePlayer(dt);
    this.player.x = this.sprite.x;
    this.player.y = this.sprite.y;

    for (const m of this.monsters) m.update(dt, this.now);
    this.updateProjectiles(dt);

    // reaparecimento
    for (const r of [...this.respawns]) {
      if (this.now >= r.at) {
        this.respawns.splice(this.respawns.indexOf(r), 1);
        this.spawnMonster(r.spawn);
      }
    }
    // espólios
    for (const d of [...this.drops]) {
      const left = d.until - this.now;
      if (left <= 0) {
        d.img.destroy(); this.drops.splice(this.drops.indexOf(d), 1);
        if (this.pendingDrop === d) { this.pendingDrop = null; this.path = null; }
        continue;
      }
      d.img.setAlpha(left < 8 ? (Math.sin(this.now * 12) > 0 ? 1 : 0.35) : 1);
    }
    // regeneração
    if (!this.player.dead) {
      const k = this.sitting ? 2 : 1;
      this.regenHp += dt; this.regenSp += dt;
      if (this.regenHp >= 5) { this.regenHp = 0; if (c.hp < this.d.maxHp) c.hp = Math.min(this.d.maxHp, c.hp + this.d.hpRegen * k); }
      if (this.regenSp >= 6) { this.regenSp = 0; if (c.sp < this.d.maxSp) c.sp = Math.min(this.d.maxSp, c.sp + this.d.spRegen * k); }
    }
    this.saveT += dt;
    if (this.saveT > 20) { this.saveT = 0; this.save(); }

    this.drawPlayerBits();
    this.ui.tick();
  }

  private movePlayer(dx: number, dy: number, dt: number) {
    const speed = this.d.speed * (this.slowUntil > this.now ? 0.6 : 1);
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return 0;
    const s = Math.min(len, speed * dt);
    const nx = this.sprite.x + (dx / len) * s, ny = this.sprite.y + (dy / len) * s;
    const w = this.world;
    if (w.canStand(nx, ny)) this.sprite.setPosition(nx, ny);
    else if (w.canStand(nx, this.sprite.y)) this.sprite.x = nx;
    else if (w.canStand(this.sprite.x, ny)) this.sprite.y = ny;
    else return 0;
    if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
    return s;
  }

  private setWalkAnim(walking: boolean) {
    if (this.sitting) return;
    const tex = CLASSES[this.char.cls].texture;
    const cur = this.sprite.anims.currentAnim?.key ?? '';
    if (cur.endsWith('-attack') && this.sprite.anims.isPlaying) return;
    const want = `${tex}-${walking ? 'walk' : 'idle'}`;
    if (cur !== want) this.sprite.play(want);
  }

  private updatePlayer(dt: number) {
    this.attackT -= dt;
    const k = this.keys;
    let kx = 0, ky = 0;
    if (k.A.isDown || k.LEFT.isDown) kx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) kx += 1;
    if (k.W.isDown || k.UP.isDown) ky -= 1;
    if (k.S.isDown || k.DOWN.isDown) ky += 1;
    if ((kx || ky) && !this.ui.typing()) {
      this.toggleAuto(false);
      this.clearActions(); this.path = null; this.standUp();
      this.movePlayer(kx, ky, dt);
      this.setWalkAnim(true);
      this.checkPortals();
      this.autoPickup();
      return;
    }

    // conjurando
    if (this.casting) {
      const cst = this.casting;
      if (cst.target && cst.target.dead) { this.casting = null; }
      else if (this.now >= cst.end) { this.casting = null; this.execSkill(cst.id, cst.lv, cst.target); }
      this.setWalkAnim(false);
      return;
    }
    if (this.now < this.busyUntil) return;

    // perseguindo um alvo
    const t = this.target;
    if (t) {
      if (t.dead) { this.target = null; this.pendingSkill = null; }
      else {
        const range = this.pendingSkill ? this.skillRange(this.pendingSkill) : this.d.range;
        const dist = t.distTo(this.sprite.x, this.sprite.y);
        const ranged = range > 100;
        const canHit = dist <= range && (!ranged || this.world.los(this.sprite.x, this.sprite.y - 20, t.x, t.y - 20, 2));
        if (!canHit) {
          const bx = this.sprite.x, by = this.sprite.y;
          this.chase(t.x, t.y, dt);
          if (Math.hypot(this.sprite.x - bx, this.sprite.y - by) < 0.3) {
            this.chaseStuck += dt;
            if (this.chaseStuck > 1.2) {
              // não consegue chegar no alvo: desiste (e o automático evita esse monstro por um tempo)
              this.chaseStuck = 0;
              if (this.auto) this.autoBlacklist.set(t.id, this.now + 15);
              this.target = null; this.pendingSkill = null; this.path = null;
            }
          } else this.chaseStuck = 0;
          return;
        }
        this.chaseStuck = 0;
        this.setWalkAnim(false);
        this.sprite.setFlipX(t.x < this.sprite.x);
        if (this.pendingSkill) {
          const id = this.pendingSkill;
          this.beginCast(id, this.char.skills[id] ?? 1, t);
        } else if (this.attackT <= 0) this.basicAttack(t);
        return;
      }
    }

    // andando por um caminho
    if (this.path && this.path.length) {
      const p = this.path[0];
      const d = Math.hypot(p.x - this.sprite.x, p.y - this.sprite.y);
      const moved = this.movePlayer(p.x - this.sprite.x, p.y - this.sprite.y, dt);
      if (d < 4 || moved === 0) this.path.shift();
      this.setWalkAnim(true);
      this.checkPortals();
      this.autoPickup();
    } else {
      this.path = null;
      this.setWalkAnim(false);
    }
    // NPC ou item pendente
    if (this.pendingNpc) {
      const n = this.pendingNpc;
      if (Math.hypot(n.x - this.sprite.x, n.y - this.sprite.y) < 80) {
        this.pendingNpc = null; this.path = null;
        this.sprite.setFlipX(n.x < this.sprite.x);
        this.ui.talk(n.def.id, n.def.name);
      } else if (!this.path) this.pendingNpc = null;
    }
    if (this.pendingDrop) {
      const d = this.pendingDrop;
      if (Math.hypot(d.x - this.sprite.x, d.y - this.sprite.y) < 36) this.pickUp(d);
      else if (!this.path) this.pendingDrop = null;
    }
  }

  private chase(tx: number, ty: number, dt: number) {
    this.pathT -= dt;
    if (this.world.los(this.sprite.x, this.sprite.y, tx, ty, 9)) {
      this.path = null;
      this.movePlayer(tx - this.sprite.x, ty - this.sprite.y, dt);
    } else {
      if (!this.path || this.pathT <= 0) { this.path = this.world.findPath(this.sprite.x, this.sprite.y, tx, ty); this.pathT = 0.4; }
      if (this.path && this.path.length) {
        const p = this.path[0];
        const moved = this.movePlayer(p.x - this.sprite.x, p.y - this.sprite.y, dt);
        if (Math.hypot(p.x - this.sprite.x, p.y - this.sprite.y) < 4 || moved === 0) this.path.shift();
      }
    }
    this.setWalkAnim(true);
    this.checkPortals();
  }

  private autoPickup() {
    for (const d of this.drops) if (Math.hypot(d.x - this.sprite.x, d.y - this.sprite.y) < 22) { this.pickUp(d); break; }
  }

  private checkPortals() {
    if (this.now < this.portalLock || this.auto) return;
    for (const p of this.portals) {
      for (const [x, y] of p.pts) {
        if (Math.hypot(x - this.sprite.x, y - this.sprite.y) < 30) { this.goPortal(p.def); return; }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (const p of [...this.projs]) {
      const tx = p.target.x, ty = p.target.y - p.target.height * 0.45;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const s = p.speed * dt;
      if (d <= s || p.target.dead) {
        p.img.destroy();
        this.projs.splice(this.projs.indexOf(p), 1);
        if (!p.target.dead) p.onHit(p.target);
        continue;
      }
      p.x += (dx / d) * s; p.y += (dy / d) * s;
      p.img.setPosition(p.x, p.y).setRotation(Math.atan2(dy, dx));
    }
    for (const o of [...this.orbs]) {
      o.life -= dt;
      const px = this.sprite.x, py = this.sprite.y - 36;
      if (o.homing) {
        const a = Math.atan2(py - o.img.y, px - o.img.x);
        const cur = Math.atan2(o.vy, o.vx);
        const na = cur + Phaser.Math.Angle.Wrap(a - cur) * Math.min(1, dt * 2.2);
        o.vx = Math.cos(na) * 240; o.vy = Math.sin(na) * 240;
      }
      o.img.x += o.vx * dt; o.img.y += o.vy * dt;
      o.img.setRotation(Math.atan2(o.vy, o.vx));
      if (!this.player.dead && Math.hypot(o.img.x - px, o.img.y - py) < 26) {
        this.monsterHitsPlayer(o.m, 0.9, true);
        o.life = 0;
      }
      if (o.life <= 0) { o.img.destroy(); this.orbs.splice(this.orbs.indexOf(o), 1); }
    }
  }

  private drawPlayerBits() {
    const { sprite, shadow, nameTag, bars, d, char: c } = this;
    sprite.setDepth(sprite.y);
    shadow.setPosition(sprite.x, sprite.y).setDepth(sprite.y - 1000);
    nameTag.setPosition(sprite.x, sprite.y + 16).setDepth(DEPTH_FX - 2);
    bars.clear().setDepth(DEPTH_FX - 2);
    const w = 52, x = sprite.x - w / 2, y = sprite.y + 6;
    bars.fillStyle(0x10182e, 0.85); bars.fillRect(x - 1, y - 1, w + 2, 9);
    const hpk = Math.max(0, c.hp / d.maxHp);
    bars.fillStyle(hpk < 0.25 ? 0xe04848 : 0x3fbf5a, 1); bars.fillRect(x, y, w * hpk, 4);
    bars.fillStyle(0x3c7ee0, 1); bars.fillRect(x, y + 4, w * Math.max(0, c.sp / d.maxSp), 3);
    if (this.casting) {
      const k = (this.now - this.casting.start) / (this.casting.end - this.casting.start);
      const cy = sprite.y - spriteHeight(CLASSES[c.cls].texture) - 14;
      bars.fillStyle(0x10182e, 0.85); bars.fillRect(sprite.x - 31, cy - 1, 62, 8);
      bars.fillStyle(0xf2c14e, 1); bars.fillRect(sprite.x - 30, cy, 60 * Math.min(1, k), 6);
    }
    if (this.target && !this.target.dead) {
      const t = this.target;
      bars.lineStyle(2, 0xff5a5a, 0.9);
      bars.strokeEllipse(t.x, t.y, t.def.radius * 2.4 + 8, t.def.radius + 6);
    }
  }

  // ================================================================ caça automática

  toggleAuto(on = !this.auto) {
    if (on === this.auto) return;
    if (on && this.player.dead) return;
    this.auto = on;
    this.autoBlacklist.clear();
    if (on) {
      this.standUp();
      this.ui.log('Caça automática ligada. Andar ou clicar no chão desliga.', 'sys');
    } else {
      this.path = null;
      this.ui.log('Caça automática desligada.', 'sys');
    }
    this.ui.refresh();
  }

  /** Monstros que estão vindo atrás do jogador */
  private attackers() {
    return this.monsters.filter((m) => !m.dead && m.state === 'chase' && Math.hypot(m.x - this.sprite.x, m.y - this.sprite.y) < 420);
  }

  private countNear(x: number, y: number, r: number) {
    let n = 0;
    for (const m of this.monsters) if (!m.dead && Math.hypot(m.x - x, m.y - y) <= r + m.def.radius) n++;
    return n;
  }

  /** A habilidade pode ser usada agora pelo automático? */
  autoReady(e: AutoSkill, target: Monster | null) {
    const c = this.char, sk: SkillDef = skill(e.id);
    const lv = c.skills[e.id] ?? 0;
    if (!e.on || !lv || this.cooldownLeft(e.id) > 0) return false;
    if (c.sp < (sk.sp?.(lv) ?? 0)) return false;
    const kind = sk.auto ?? 'alvo';
    if (kind !== 'cura' && (c.sp / this.d.maxSp) * 100 < c.auto.spReserve) return false;
    if ((e.id === 'disparo-duplo' || e.id === 'chuva-flechas') && !this.d.ranged) return false;
    const need = e.cond === 'grupo3' ? 3 : e.cond === 'grupo2' ? 2 : 1;
    const resisted = (m: Monster) => elementMod(sk.element ?? 'neutro', m.def.element) < 1;
    switch (kind) {
      case 'cura': return (c.hp / this.d.maxHp) * 100 < (e.cond === 'hp30' ? 30 : 50);
      case 'buff': return e.id === 'concentracao' ? !this.buffs.conc : true;
      case 'area-proprio': return this.countNear(this.sprite.x, this.sprite.y, 130) >= need && !!target;
      case 'alvo': return !!target && !resisted(target);
      case 'area-alvo': return !!target && !resisted(target) && this.countNear(target.x, target.y, 100) >= need;
    }
  }

  private pickPotion() {
    const c = this.char, missing = this.d.maxHp - c.hp;
    const order = missing > 260 ? ['pocao-branca', 'folha-vital', 'pocao-laranja', 'pocao-vermelha']
      : missing > 90 ? ['pocao-laranja', 'folha-vital', 'pocao-vermelha', 'pocao-branca']
        : ['pocao-vermelha', 'pocao-laranja', 'folha-vital', 'pocao-branca'];
    return order.find((id) => invCount(c, id) > 0);
  }

  private autoPick(): Monster | null {
    const cfg = this.char.auto;
    const ok = (m: Monster) => !m.dead && (cfg.mvp || !m.def.boss) && (this.autoBlacklist.get(m.id) ?? 0) < this.now;
    const near = this.attackers().filter(ok);
    const pool = near.length ? near : this.monsters.filter(ok);
    let best: Monster | null = null, bd = 30 * TILE;
    for (const m of pool) {
      const d = Math.hypot(m.x - this.sprite.x, m.y - this.sprite.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  private updateAuto(dt: number) {
    const c = this.char, cfg = c.auto;
    // poções (sempre que precisar)
    if (this.now >= this.itemCdUntil) {
      if (cfg.hpPot > 0 && (c.hp / this.d.maxHp) * 100 < cfg.hpPot) {
        const pot = this.pickPotion();
        if (pot) this.useItem(pot);
      } else if (cfg.spPot > 0 && (c.sp / this.d.maxSp) * 100 < cfg.spPot && invCount(c, 'pocao-azul') > 0) {
        this.useItem('pocao-azul');
      }
    }
    this.autoThink -= dt;
    if (this.autoThink > 0) return;
    this.autoThink = 0.2;
    if (this.casting || this.now < this.busyUntil || this.sitting) return;

    let t = this.target && !this.target.dead ? this.target : null;
    // curas e efeitos em si mesmo
    for (const e of cfg.skills) {
      const kind = skill(e.id).auto;
      if ((kind === 'cura' || kind === 'buff') && this.autoReady(e, t)) { this.useSkill(e.id); return; }
    }
    const attackers = this.attackers();
    // espólios por perto (só quando ninguém está atacando)
    if (this.pendingDrop) {
      if (attackers.length) { this.pendingDrop = null; this.path = null; }
      else return;
    }
    if (cfg.loot && !t && !attackers.length) {
      let best: (typeof this.drops)[number] | null = null, bd = 7 * TILE;
      for (const d of this.drops) {
        const dist = Math.hypot(d.x - this.sprite.x, d.y - this.sprite.y);
        if (dist < bd) { bd = dist; best = d; }
      }
      if (best) { this.pendingDrop = best; this.walkTo(best.x, best.y); return; }
    }
    // alvo
    if (!t || (this.autoBlacklist.get(t.id) ?? 0) > this.now || (t.def.boss && !cfg.mvp && !attackers.includes(t))) {
      t = this.autoPick();
      this.target = t;
      this.pendingSkill = null;
      if (t) this.path = null;
    }
    if (!t) {
      // ninguém por perto: passeia por uma área de monstros
      if (!this.path || !this.path.length) {
        const areas = this.world.def.spawns.filter((sp) => !MONSTERS[sp.monster].boss);
        if (areas.length) {
          const a = areas[Math.floor(Math.random() * areas.length)];
          const [x, y] = this.world.randomWalkable(a.rect);
          this.path = this.world.findPath(this.sprite.x, this.sprite.y, x, y);
        }
      }
      return;
    }
    // habilidades de ataque, na ordem de prioridade
    if (!this.pendingSkill) {
      for (const e of cfg.skills) {
        const kind = skill(e.id).auto;
        if (kind === 'cura' || kind === 'buff') continue;
        if (this.autoReady(e, t)) { this.useSkill(e.id); return; }
      }
    }
  }

  moveAutoSkill(id: string, dir: -1 | 1) {
    const list = this.char.auto.skills;
    const i = list.findIndex((e) => e.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.ui.refresh(true);
  }

  // ---- usado pela interface ----
  isAprendizReady() {
    return this.char.cls === 'aprendiz' && this.char.jobLv >= JOB_CHANGE_LEVEL;
  }
  hasAnimFor(anim: string) {
    return hasAnim(this, CLASSES[this.char.cls].texture, anim);
  }
  itemDef(id: string): ItemDef { return item(id); }
}
