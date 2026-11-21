import Phaser from 'phaser';
import { Enemy } from '../objects/Enemy';
import { Pickup } from '../objects/Pickup';
import { BAFOME, BAFOME_LEVEL, BOSSES, BOSS_INTERVAL, ENEMIES, MAX_ENEMY_RADIUS, dmgScale, hpScale, speedScale, threatLevel, type EnemyDef } from '../data/enemies';
import { BafomeAI } from '../boss';
import { CLASSES, LINES, lineOf, type ClassDef, type ClassId, type LineId } from '../data/classes';
import { feetOffset, heroScale, needsShadow } from '../sprites';
import { BASE_STATS, type Stats } from '../data/stats';
import { SKILLS, type SkillId } from '../data/skills';
import { rollUpgrades, type Upgrade } from '../data/upgrades';
import type { Skill } from '../skills/Skill';
import { createSkill } from '../skills';
import { isTouch, onResize } from '../ui';
import { SpatialGrid } from '../spatialGrid';
import { Fx, FX_DEPTH } from '../fx';
import { Projectiles } from '../projectiles';
import {
  ATTR_FOCUS, ATTR_IDS, ATTR_POINTS_PER_LEVEL, DROPS, MAPS, PETS, REFINE_DMG, STATUS, cardOf, elementMult, emptyMods,
  type Attr, type Attrs, type MapDef, type Mods, type PetDef, type RpgHost, type StatusId,
} from '../data/rpg';
import { loadSave, writeSave } from '../save';
import type { ItemKind } from '../data/rpg';

/** XP necessária para passar do nível `l` para o `l + 1` */
export const xpForLevel = (l: number) => Math.floor(4 + (l - 1) * 3 + Math.pow(l - 1, 1.5));

const PLAYER_RADIUS = 12;
const PLAYER_IFRAMES = 500;
const GRID_CELL = 64;

/**
 * Limites de desempenho. No celular começam menores e, durante a partida,
 * diminuem sozinhos se o FPS cair (ver adaptQuality).
 */
const PERF = {
  desktop: { maxEnemies: 400, maxPickups: 600, maxNumbers: 60, minEnemies: 200 },
  mobile: { maxEnemies: 220, maxPickups: 300, maxNumbers: 25, minEnemies: 110 },
};

export interface LevelUpData {
  level: number;
  promotion: ClassDef | null;
  options: Upgrade[];
  /** Preenchidos na tela de escolha de classe */
  choiceTitle?: string;
  choiceSubtitle?: string;
}

export interface RunResult {
  time: number;
  level: number;
  className: string;
  kills: number;
  line: LineId | null;
  zeny: number;
  zenyTotal: number;
  cards: number;
}

/** Experiência para o próximo nível de classe */
export const jobForLevel = (j: number) => 10 + j * 8;
export const MAX_JOB = 50;

export class GameScene extends Phaser.Scene implements RpgHost {
  player!: Phaser.GameObjects.Sprite;
  enemies!: Phaser.GameObjects.Group;
  pickups!: Phaser.GameObjects.Group;
  fx!: Fx;

  // estado da partida (zerado em create(), pois a cena é reutilizada ao reiniciar)
  stats!: Stats;
  hp = 0;
  level = 1;
  xp = 0;
  xpNext = 0;
  classId: ClassId = 'aprendiz';
  skills = new Map<SkillId, Skill>();
  passives: Record<string, number> = {};
  facing = new Phaser.Math.Vector2(1, 0);
  elapsed = 0;
  kills = 0;

  // ---- sistemas de RPG
  mods: Mods = emptyMods();
  attrs: Attrs = { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 };
  /** Pontos de atributo ainda não distribuídos */
  attrPoints = 0;
  /** Cartas coletadas (id do monstro), na ordem */
  cards: string[] = [];
  items = { asa: 0, pena: 0 };
  zenyRun = 0;
  jobLevel = 1;
  jobXp = 0;
  pet: PetDef | null = null;
  map!: MapDef;
  /** Estados do jogador */
  curseUntil = 0;
  poisonUntil = 0;
  private nextPoisonTick = 0;
  private petSprite: Phaser.GameObjects.Sprite | null = null;
  private petAttackAt = 0;
  private darkness!: Phaser.GameObjects.Rectangle;

  /** Inimigos ativos neste frame e grade para achar os próximos rapidamente */
  private live: Enemy[] = [];
  private grid = new SpatialGrid<Enemy>(GRID_CELL);
  private nearBuf: Enemy[] = [];

  private resolvedLevel = 1;
  private pendingLevelUps = 0;
  private choosing = false;
  private over = false;
  private spawnTimer = 0;
  private nextWaveAt = 60;
  private nextBossAt = BOSS_INTERVAL;
  private bossCount = 0;
  private bafomeSpawned = false;
  private bossAI: BafomeAI | null = null;
  /** Chefe vivo no momento (a barra de vida aparece no HUD) */
  boss: Enemy | null = null;
  /** Linhagem escolhida no nível 5 (null enquanto ainda é Aprendiz) */
  line: LineId | null = null;
  private shadow!: Phaser.GameObjects.Image;
  projectiles!: Projectiles;
  private invulnUntil = 0;
  private hurtUntil = 0;
  private frame = 0;
  private maxEnemies = 0;
  private minEnemies = 0;
  private qualityTimer = 0;
  private attackUntil = 0;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Faíscas permitidas por frame (menos no celular) */
  private sparkBudget = 0;
  private sparkMax = 12;
  /** Decoração do chão: imagens por célula do mapa, reaproveitadas */
  private decor = new Map<number, Phaser.GameObjects.Image[]>();
  private decorPool: Phaser.GameObjects.Image[] = [];

  private bg!: Phaser.GameObjects.TileSprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private move = new Phaser.Math.Vector2();
  private joyOrigin: Phaser.Math.Vector2 | null = null;
  private joyVec = new Phaser.Math.Vector2();
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;

  constructor() {
    super('Game');
  }

  init() {
    this.line = null;
  }

  create() {
    const perf = isTouch(this) ? PERF.mobile : PERF.desktop;
    this.stats = { ...BASE_STATS };
    this.hp = this.stats.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);
    this.classId = 'aprendiz';
    // bônus da classe inicial (ex.: magos começam com menos vida)
    for (const [k, v] of Object.entries(CLASSES[this.classId].statBonus) as [keyof Stats, number][]) this.stats[k] += v;
    this.hp = this.stats.maxHp;
    this.skills = new Map();
    this.passives = {};
    this.facing.set(1, 0);
    this.elapsed = 0;
    this.kills = 0;
    this.live = [];
    this.resolvedLevel = 1;
    this.pendingLevelUps = 0;
    this.choosing = false;
    this.over = false;
    this.spawnTimer = 600;
    this.nextWaveAt = 60;
    this.nextBossAt = BOSS_INTERVAL;
    this.bossCount = 0;
    this.boss = null;
    this.bafomeSpawned = false;
    this.bossAI = null;
    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.frame = 0;
    this.maxEnemies = perf.maxEnemies;
    this.minEnemies = perf.minEnemies;
    this.qualityTimer = 0;
    this.attackUntil = 0;
    this.sparkMax = isTouch(this) ? 6 : 12;
    this.decor = new Map();
    this.decorPool = [];
    this.mods = emptyMods();
    this.attrs = { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 };
    this.attrPoints = 0;
    this.cards = [];
    this.items = { asa: 0, pena: 0 };
    this.zenyRun = 0;
    this.jobLevel = 1;
    this.jobXp = 0;
    this.pet = null;
    this.petSprite = null;
    this.curseUntil = this.poisonUntil = this.nextPoisonTick = 0;

    // progresso entre partidas: loja, refino, mascote e mapa escolhido
    const save = loadSave();
    const up = (id: string) => save.up[id] ?? 0;
    this.map = MAPS.find((m) => m.id === save.map) ?? MAPS[0];
    this.stats.maxHp += 10 * up('vida');
    this.hp = this.stats.maxHp;
    this.mods.dmgAll += 0.05 * up('dano') + save.refine * REFINE_DMG;
    this.stats.magnet *= 1 + 0.15 * up('ima');
    this.mods.zeny += 0.1 * up('zeny');
    this.items.asa += up('asa') ? 2 : 0;
    this.items.pena += up('pena') ? 1 : 0;
    this.attrPoints += 2 * up('pontos');

    const { width, height } = this.scale;
    this.bg = this.add.tileSprite(0, 0, width, height, this.map.ground).setOrigin(0).setScrollFactor(0).setDepth(-1e7);
    this.darkness = this.add.rectangle(0, 0, width, height, 0x05040a, this.map.darkness).setOrigin(0).setScrollFactor(0).setDepth(FX_DEPTH - 5);
    onResize(this, () => {
      this.bg.setSize(this.scale.width, this.scale.height);
      this.darkness.setSize(this.scale.width, this.scale.height);
    });

    this.fx = new Fx(this, perf.maxNumbers);
    const startTex = CLASSES[this.classId].texture;
    this.shadow = this.add.image(0, 0, 'fx-sombra').setAlpha(0.45);
    this.player = this.add.sprite(0, 0, startTex, 'idle0').setScale(heroScale(startTex));
    this.player.play(`${startTex}-idle`);
    this.projectiles = new Projectiles(this);
    this.sparks = this.add.particles(0, 0, 'fx-spark', {
      speed: { min: 70, max: 220 },
      lifespan: 280,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfff2b0, 0xffffff, 0xffd060],
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(FX_DEPTH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.enemies = this.add.group({ classType: Enemy, maxSize: perf.maxEnemies });
    this.pickups = this.add.group({ classType: Pickup, maxSize: perf.maxPickups });

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as typeof this.wasd;
    this.setupJoystick();

    this.addSkill(CLASSES[this.classId].grantsSkill!);
    if (save.pet && PETS[save.pet]) this.equipPet(save.pet, false);
    kb.on('keydown-Q', () => this.useWing());

    // Atalho de teste: L sobe um nível (só no modo de desenvolvimento)
    if (import.meta.env.DEV) kb.on('keydown-L', () => this.gainXp(this.xpNext - this.xp));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.skills.forEach((s) => s.destroy());
      kb.removeAllListeners('keydown-L');
      kb.removeAllListeners('keydown-Q');
    });

    this.scene.launch('UI');
  }

  update(_time: number, delta: number) {
    if (this.over || !this.cameras?.main) return;
    const dt = Math.min(delta, 50);
    this.elapsed += dt;
    this.frame++;
    this.sparkBudget = this.sparkMax;
    if (this.frame % 8 === 1) this.updateDecor();

    this.collectEnemies();
    this.updateBafome(dt);
    this.updatePlayer(dt);
    this.updatePet(dt);
    this.skills.forEach((s) => s.update(dt));
    this.projectiles.update(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateSpawner(dt);
    this.fx.update(dt);
    this.adaptQuality(dt);

    const cam = this.cameras.main;
    this.bg.setTilePosition(cam.scrollX, cam.scrollY);
  }

  /** Chamado pela espada: mostra a pose de ataque por um instante */
  playerAttacked() {
    const tex = CLASSES[this.classId].texture;
    const anim = this.anims.get(`${tex}-attack`);
    if (anim) {
      // sprite com animação de ataque de verdade: toca ela inteira
      if (this.elapsed < this.attackUntil) return;
      this.player.play(anim.key);
      this.attackUntil = this.elapsed + anim.duration;
      return;
    }
    this.attackUntil = this.elapsed + 150;
  }

  private burst(x: number, y: number, n: number) {
    if (this.sparkBudget <= 0) return;
    const count = Math.min(n, this.sparkBudget);
    this.sparkBudget -= count;
    this.sparks.explode(count, x, y);
  }

  // ---------------------------------------------------------------- decoração do chão

  /**
   * Espalha tufos, flores, pedras, arbustos e cogumelos pelo mapa infinito.
   * Cada célula do mapa sempre recebe a mesma decoração (sorteio pela posição),
   * e só as células perto da câmera existem de fato.
   */
  private updateDecor() {
    const C = 200;
    const view = this.cameras.main.worldView;
    const x0 = Math.floor((view.x - C) / C);
    const x1 = Math.floor((view.right + C) / C);
    const y0 = Math.floor((view.y - C) / C);
    const y1 = Math.floor((view.bottom + C) / C);
    const key = (cx: number, cy: number) => (cx + 50000) * 100000 + (cy + 50000);

    for (const [k, imgs] of this.decor) {
      const cx = Math.floor(k / 100000) - 50000;
      const cy = (k % 100000) - 50000;
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) {
        for (const img of imgs) this.decorPool.push(img.setVisible(false));
        this.decor.delete(k);
      }
    }

    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = key(cx, cy);
        if (this.decor.has(k)) continue;
        const rnd = cellRandom(cx, cy);
        const imgs: Phaser.GameObjects.Image[] = [];
        const n = rnd() < 0.3 ? 0 : 1 + Math.floor(rnd() * 3);
        for (let j = 0; j < n; j++) {
          const type = pickWeighted(this.map.decor, rnd());
          const x = (cx + rnd()) * C;
          const y = (cy + rnd()) * C;
          const img = this.decorPool.pop() ?? this.add.image(0, 0, type);
          img.setTexture(type).setPosition(x, y).setScale(0.5).setFlipX(rnd() < 0.5).setVisible(true);
          // arbustos ficam "em pé" (o herói passa na frente ou atrás); o resto fica no chão
          img.setDepth(TALL_DECOR.has(type) ? y + 8 : -200000);
          imgs.push(img);
        }
        this.decor.set(k, imgs);
      }
    }
  }

  /** Inimigos ativos perto de um ponto (usado pelas habilidades) */
  queryEnemies(x: number, y: number, r: number, out: Enemy[]): Enemy[] {
    return this.grid.query(x, y, r + MAX_ENEMY_RADIUS, out);
  }

  // ---------------------------------------------------------------- jogador

  private updatePlayer(dt: number) {
    const m = this.move.set(0, 0);
    if (this.cursors.left.isDown || this.wasd.A.isDown) m.x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) m.x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) m.y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) m.y += 1;
    if (m.lengthSq() === 0 && this.joyVec.lengthSq() > 0) m.copy(this.joyVec);

    const moving = m.lengthSq() > 0;
    if (moving) {
      m.normalize();
      this.facing.copy(m);
      if (m.x !== 0) this.player.setFlipX(m.x < 0);
      const slow = this.elapsed < this.curseUntil ? 0.6 : 1;
      const step = (this.stats.speed * slow * dt) / 1000;
      this.player.x += m.x * step;
      this.player.y += m.y * step;
    }
    // animação: pose de ataque por um instante, senão andando ou parado
    const tex = CLASSES[this.classId].texture;
    if (this.elapsed < this.attackUntil) {
      if (!this.anims.exists(`${tex}-attack`) && this.player.frame.name !== 'atk') {
        this.player.stop();
        this.player.setFrame('atk');
      }
    } else {
      const anim = `${tex}-${moving ? 'walk' : 'idle'}`;
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== anim) this.player.play(anim);
    }
    this.player.setDepth(this.player.y);
    // sombra no chão para os sprites que não têm sombra desenhada
    this.shadow.setVisible(needsShadow(tex)).setPosition(this.player.x, this.player.y + feetOffset(tex) - 2).setDepth(this.player.y - 1);

    if (this.elapsed < this.hurtUntil) this.player.setTintFill(0xff5555);
    else if (this.elapsed < this.curseUntil) this.player.setTint(0xb080ff);
    else if (this.elapsed < this.poisonUntil) this.player.setTint(0xa0ff8a);
    else this.player.clearTint();

    // veneno: perde vida aos poucos
    if (this.elapsed < this.poisonUntil && this.elapsed >= this.nextPoisonTick) {
      this.nextPoisonTick = this.elapsed + 1000;
      this.hp = Math.max(1, this.hp - 4);
      this.fx.number(this.player.x, this.player.y - 30, '-4', 0x7aff6a);
    }
    this.player.setAlpha(this.elapsed < this.invulnUntil ? 0.6 + 0.4 * Math.sin(this.elapsed / 30) : 1);

    this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.regen * dt) / 1000);
  }

  private onEnemyTouch(e: Enemy) {
    if (e.isStopped(this.elapsed)) return;
    const hit = this.hurtPlayer(e.damage);
    // cogumelos podem envenenar
    if (hit && e.def.id === 'cogumelo' && Math.random() < 0.2) this.afflictPlayer('veneno', 3000);
  }

  /** Aplica maldição (lentidão) ou veneno no jogador; VIT dá chance de resistir */
  afflictPlayer(kind: 'maldicao' | 'veneno', ms: number) {
    if (Math.random() < Math.min(0.5, this.attrs.vit * 0.01)) {
      this.fx.number(this.player.x, this.player.y - 44, '0', 0xdddddd);
      return;
    }
    if (kind === 'maldicao') this.curseUntil = this.elapsed + ms;
    else this.poisonUntil = this.elapsed + ms;
    this.events.emit('toast', kind === 'maldicao' ? 'Amaldiçoado! (mais lento)' : 'Envenenado!', kind === 'maldicao' ? '#c8a0ff' : '#9aff7a');
  }

  /** Dano no jogador (contato, ataques do chefe). `heavy` ignora parte da armadura. */
  hurtPlayer(amount: number, heavy = false): boolean {
    if (this.over || this.elapsed < this.invulnUntil) return false;
    // esquiva (AGI, mascote) e cartas que anulam o golpe
    if (Math.random() < this.evadeChance()) {
      this.invulnUntil = this.elapsed + 250;
      this.fx.number(this.player.x, this.player.y - 34, '0', 0xdddddd);
      return false;
    }
    if (Math.random() < this.mods.ignoreHit) {
      this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
      this.fx.ring(this.player.x, this.player.y, 22, 1.6, 250, 0xc8c8ff, 0.5);
      return false;
    }
    const dmg = Math.max(1, Math.round(amount - this.stats.armor * (heavy ? 0.5 : 1)));
    this.hp -= dmg;
    this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
    this.hurtUntil = this.elapsed + 100;
    this.cameras.main.shake(90, 0.004);
    this.fx.number(this.player.x, this.player.y - 30, `-${dmg}`, 0xff5c5c);
    if (this.hp <= 0) {
      if (this.items.pena > 0) this.revive();
      else this.gameOver();
    }
    return true;
  }

  evadeChance() {
    return Math.min(0.4, this.attrs.agi * 0.003 + this.mods.evade);
  }

  critChance() {
    return Math.min(0.6, this.attrs.sor * 0.005 + this.mods.crit);
  }

  /** Pena da Ressurreição: volta com metade da vida */
  private revive() {
    this.items.pena--;
    this.hp = this.stats.maxHp * 0.5;
    this.invulnUntil = this.elapsed + 2500;
    this.cameras.main.flash(600, 255, 255, 220);
    this.fx.ring(this.player.x, this.player.y, 30, 8, 600, 0xfff0a0, 0.6);
    for (const e of this.queryEnemies(this.player.x, this.player.y, 220, this.nearBuf).slice()) {
      if (e.active && !e.def.boss) this.damageEnemy(e, 0, 600, this.player.x, this.player.y);
    }
    this.events.emit('announce', 'A Pena da Ressurreição te trouxe de volta!');
  }

  /** Asa de Teletransporte: some e reaparece longe da horda */
  useWing() {
    if (this.over || this.items.asa <= 0 || this.choosing || !this.scene.isActive()) return;
    this.items.asa--;
    this.fx.ring(this.player.x, this.player.y, 20, 3, 300, 0x9fe6ff, 0.6);
    const a = Math.random() * Math.PI * 2;
    this.player.x += Math.cos(a) * 520;
    this.player.y += Math.sin(a) * 520;
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.invulnUntil = this.elapsed + 1200;
    this.fx.ring(this.player.x, this.player.y, 20, 3, 300, 0x9fe6ff, 0.6);
  }

  private setupJoystick() {
    // joystick virtual simples para celular: toque e arraste em qualquer lugar
    this.joyBase = this.add.circle(0, 0, 50, 0xffffff, 0.12).setScrollFactor(0).setDepth(FX_DEPTH + 10).setVisible(false);
    this.joyKnob = this.add.circle(0, 0, 22, 0xffffff, 0.35).setScrollFactor(0).setDepth(FX_DEPTH + 11).setVisible(false);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) return;
      this.joyOrigin = new Phaser.Math.Vector2(p.x, p.y);
      this.joyBase.setPosition(p.x, p.y).setVisible(true);
      this.joyKnob.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joyOrigin || !p.isDown) return;
      const dx = p.x - this.joyOrigin.x;
      const dy = p.y - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        this.joyVec.set(0, 0);
        return;
      }
      const len = Math.min(d, 50);
      this.joyVec.set(dx / d, dy / d);
      this.joyKnob.setPosition(this.joyOrigin.x + this.joyVec.x * len, this.joyOrigin.y + this.joyVec.y * len);
    });
    const release = () => {
      this.joyOrigin = null;
      this.joyVec.set(0, 0);
      this.joyBase.setVisible(false);
      this.joyKnob.setVisible(false);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  // ---------------------------------------------------------------- inimigos

  private collectEnemies() {
    this.live.length = 0;
    this.grid.clear();
    const all = this.enemies.getChildren() as Enemy[];
    for (let i = 0; i < all.length; i++) {
      const e = all[i];
      if (!e.active) continue;
      this.live.push(e);
      this.grid.insert(e);
    }
  }

  private updateEnemies(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    const s = dt / 1000;
    const cam = this.cameras.main;
    const farSq = (Math.hypot(cam.width, cam.height) * 0.9) ** 2;
    const sortDepth = this.frame % 3 === 0;
    const parity = this.frame & 1;
    const live = this.live;

    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      if (!e.active) continue;
      const dx = px - e.x;
      const dy = py - e.y;
      const d2 = dx * dx + dy * dy;

      // inimigos que ficaram muito para trás reaparecem na frente do jogador
      if (d2 > farSq) {
        const p = this.ringPosition();
        e.setPosition(p.x, p.y);
        continue;
      }

      // contato com o jogador
      const touch = PLAYER_RADIUS + e.def.radius;
      if (d2 < touch * touch) this.onEnemyTouch(e);

      // afastamento entre inimigos: metade deles por frame, alternando
      if ((i & 1) === parity) this.computeSeparation(e);

      if (e.hasStatus) this.tickStatus(e);
      if (this.elapsed > e.knockUntil) {
        if (e.isStopped(this.elapsed)) {
          e.vx = e.vy = 0;
        } else {
          const d = Math.sqrt(d2) || 1;
          const speed = e.speed * (e.statusUntil.envenenado > this.elapsed ? STATUS.envenenado.slow! : 1);
          e.vx = (dx / d) * speed + e.sepX;
          e.vy = (dy / d) * speed + e.sepY;
        }
      }
      if (!e.active) continue;
      e.x += e.vx * s;
      e.y += e.vy * s;
      e.setFlipX(dx < 0);
      if (sortDepth) e.setDepth(e.y);
      if (e.flashUntil && this.elapsed > e.flashUntil) {
        e.restoreTint(this.elapsed);
        e.flashUntil = 0;
      }
    }
  }

  /** Empurra o inimigo para longe dos vizinhos para eles não se empilharem */
  private computeSeparation(e: Enemy) {
    const near = this.grid.query(e.x, e.y, e.def.radius + MAX_ENEMY_RADIUS, this.nearBuf);
    let sx = 0;
    let sy = 0;
    for (let j = 0; j < near.length; j++) {
      const o = near[j];
      if (o === e) continue;
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const min = e.def.radius + o.def.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      if (d2 < 0.01) {
        sx += Math.random() - 0.5;
        sy += Math.random() - 0.5;
        continue;
      }
      const d = Math.sqrt(d2);
      const push = (min - d) / min;
      sx += (dx / d) * push;
      sy += (dy / d) * push;
    }
    // elites quase não são empurrados
    const strength = e.def.elite ? 20 : 140;
    e.sepX = sx * strength;
    e.sepY = sy * strength;
  }

  private updateSpawner(dt: number) {
    const t = this.elapsed / 1000;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(160, 1000 - t * 2.8);
      const batch = 1 + Math.floor(t / 45);
      for (let i = 0; i < batch; i++) this.spawnEnemy(this.pickEnemy(t));
    }

    // a cada minuto, uma horda cerca o jogador
    if (t >= this.nextWaveAt) {
      this.nextWaveAt += 60;
      const common = ENEMIES.filter((d) => !d.elite && t >= d.from);
      const def = common[common.length - 1];
      const count = 24 + Math.floor(t / 30) * 2;
      for (let i = 0; i < count; i++) {
        const p = this.ringPosition((i / count) * Math.PI * 2);
        this.spawnEnemy(def, p.x, p.y);
      }
      const elite = ENEMIES.find((d) => d.elite)!;
      if (t >= 300) this.spawnEnemy(elite);
      if (t < this.nextBossAt - 5) {
        const horde = t >= 300 ? 'Uma horda e um Cavaleiro Negro se aproximam!' : 'Uma horda se aproxima!';
        this.events.emit('announce', `${horde}\nAmeaça ${threatLevel(t)}: os monstros ficaram mais fortes`);
      }
    }

    // a cada 5 minutos, um chefe (alternando entre os chefes, cada volta mais forte)
    if (t >= this.nextBossAt && !this.boss) {
      this.nextBossAt += BOSS_INTERVAL;
      const def = BOSSES[this.bossCount % BOSSES.length];
      const round = Math.floor(this.bossCount / BOSSES.length);
      this.bossCount++;
      const p = this.ringPosition();
      const e = this.spawnEnemy(def, p.x, p.y, true);
      if (e) {
        e.hp = e.maxHp = Math.ceil(e.maxHp * (1 + round * 0.8));
        this.boss = e;
        this.cameras.main.shake(400, 0.006);
        this.events.emit('announce', `CHEFE: ${def.name}!`);
      }
    }
  }

  private pickEnemy(t: number): EnemyDef {
    const pool = ENEMIES.filter((d) => t >= d.from);
    const w = (d: EnemyDef) => d.weight * (this.map.weights[d.id] ?? 1);
    const total = pool.reduce((s, d) => s + w(d), 0);
    let r = Math.random() * total;
    for (const d of pool) {
      r -= w(d);
      if (r <= 0) return d;
    }
    return pool[0];
  }

  /** Ponto logo fora da borda da tela, na direção `angle` a partir do jogador */
  private ringPosition(angle?: number) {
    const cam = this.cameras.main;
    const a = angle ?? Math.random() * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // distância até a borda do retângulo visível (funciona deitado e em pé)
    const toEdge = Math.min(
      Math.abs(cos) > 1e-6 ? cam.width / 2 / Math.abs(cos) : Infinity,
      Math.abs(sin) > 1e-6 ? cam.height / 2 / Math.abs(sin) : Infinity,
    );
    const r = toEdge + 60;
    return { x: this.player.x + cos * r, y: this.player.y + sin * r };
  }

  private spawnEnemy(def: EnemyDef, x?: number, y?: number, force = false): Enemy | null {
    if (!force && this.enemies.countActive(true) >= this.maxEnemies) return null;
    if (x === undefined || y === undefined) ({ x, y } = this.ringPosition());
    let e = this.enemies.get(x, y) as Enemy | null;
    if (!e && force) {
      // chefe com o grupo cheio: reaproveita o primeiro inimigo comum
      e = (this.enemies.getChildren() as Enemy[]).find((o) => !o.def?.boss) ?? null;
    }
    if (!e) return null;
    const t = this.elapsed / 1000;
    // chefes não ganham velocidade extra (já têm ataques próprios)
    // chefes crescem na metade do ritmo (já têm muita vida e ataques próprios)
    const ts = def.boss ? t / 2 : t;
    e.spawn(def, x, y, hpScale(ts), dmgScale(ts), def.boss ? 1 : speedScale(t));
    e.setDepth(y);
    return e;
  }

  /** Servos invocados por chefes (ignoram o limite de inimigos) */
  spawnMinion(def: EnemyDef, x: number, y: number) {
    const e = this.spawnEnemy(def, x, y, true);
    if (e) this.fx.ring(x, y, 20, 2.5, 300, 0x6a1a7a, 0.5);
  }

  /** Bafome entra em cena quando o jogador chega ao nível 10 */
  private updateBafome(dt: number) {
    if (this.bossAI && !this.bossAI.update(dt)) this.bossAI = null;
    if (this.bafomeSpawned || this.level < BAFOME_LEVEL || this.choosing) return;
    this.bafomeSpawned = true;
    const p = this.ringPosition();
    const e = this.spawnEnemy(BAFOME, p.x, p.y, true);
    if (!e) return;
    this.boss = e;
    this.bossAI = new BafomeAI(this, e);
    this.cameras.main.shake(500, 0.008);
    this.cameras.main.flash(300, 80, 0, 90);
    this.events.emit('announce', 'O BAFOME DESPERTOU!');
  }

  /** Os `n` inimigos mais próximos de (x, y), até `maxDist` */
  nearestEnemies(x: number, y: number, n: number, maxDist: number): Enemy[] {
    const maxSq = maxDist * maxDist;
    const found: { e: Enemy; d: number }[] = [];
    for (const e of this.live) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d > maxSq) continue;
      if (found.length < n) {
        found.push({ e, d });
        found.sort((a, b) => a.d - b.d);
      } else if (d < found[found.length - 1].d) {
        found[found.length - 1] = { e, d };
        found.sort((a, b) => a.d - b.d);
      }
    }
    return found.map((f) => f.e);
  }

  /** Explosão em área: fere todos os inimigos no raio (bola de fogo, meteoro) */
  explode(x: number, y: number, radius: number, damage: number, knockback: number, color: number, src?: SkillId) {
    this.fx.ring(x, y, radius * 0.35, 2.8, 260, color, 0.55);
    this.burst(x, y, 6);
    const hits = this.queryEnemies(x, y, radius, this.nearBuf).slice();
    for (const e of hits) {
      if (e.active && (e.x - x) ** 2 + (e.y - y) ** 2 <= (radius + e.def.radius) ** 2) {
        this.damageEnemy(e, damage, knockback, x, y, src);
      }
    }
  }

  /** Aplica dano a um inimigo (usado por todas as habilidades) */
  damageEnemy(e: Enemy, amount: number, knockback: number, fromX: number, fromY: number, src?: SkillId) {
    if (!e.active) return;
    if (amount > 0) {
      // ---- fórmula de dano: atributos, elemento, raça, tamanho, refino, nível de classe e crítico
      const sk = src ? SKILLS[src] : null;
      let mult = (1 + this.mods.dmgAll) * (1 + (this.jobLevel - 1) * 0.02);
      let elemMult = 1;
      if (sk) {
        const attrBonus = sk.kind === 'melee' ? this.attrs.for * 0.02 : sk.kind === 'ranged' ? this.attrs.des * 0.025 : this.attrs.int * 0.025;
        mult *= 1 + attrBonus + this.mods.kindDmg[sk.kind];
        elemMult = elementMult(sk.element, e.def.element);
        mult *= elemMult * (1 + (this.mods.elemDmg[sk.element] ?? 0));
        mult *= sk.sizeMod?.[e.def.size] ?? 1;
      }
      mult *= 1 + (this.mods.raceDmg[e.def.race] ?? 0);
      const crit = Math.random() < this.critChance();
      if (crit) mult *= 1.8;
      const dmg = Math.max(1, Math.round(amount * mult * Phaser.Math.FloatBetween(0.9, 1.1)));
      e.hp -= dmg;
      e.setTintFill(0xffffff);
      e.flashUntil = this.elapsed + 70;
      // cor do número: crítico em dourado, fraqueza em laranja, resistência em cinza
      const color = crit ? 0xffd23b : elemMult > 1 ? 0xffa040 : elemMult < 1 ? 0x9a9a9a : 0xffffff;
      this.fx.number(e.x, e.y - 20, crit ? `${dmg}!` : `${dmg}`, color);
      this.burst(e.x, e.y, crit ? 5 : 2);

      // estados alterados
      if (e.hp > 0) {
        if (sk?.status && Math.random() < sk.status.chance) this.applyStatus(e, sk.status.id, dmg);
        if (this.mods.freezeChance && Math.random() < this.mods.freezeChance) this.applyStatus(e, 'congelado', dmg);
      }
    }

    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    const kb = knockback * e.def.knockback;
    if (kb > 0) {
      const a = Math.atan2(e.y - fromY, e.x - fromX);
      e.vx = Math.cos(a) * kb;
      e.vy = Math.sin(a) * kb;
      e.knockUntil = this.elapsed + 120;
    }
  }

  /** Aplica um estado alterado num inimigo (chefes sofrem bem menos com os que paralisam) */
  applyStatus(e: Enemy, id: StatusId, hitDamage: number) {
    const st = STATUS[id];
    const dur = st.stops && (e.def.boss || e.def.elite) ? st.duration * 0.25 : st.duration;
    e.statusUntil[id] = Math.max(e.statusUntil[id], this.elapsed + dur);
    if (st.dot) e.statusDot[id] = Math.max(e.statusDot[id], Math.max(1, Math.round(hitDamage * st.dot)));
    if (!e.hasStatus) e.nextDot = this.elapsed + 500;
    e.hasStatus = true;
    if (!e.flashUntil) e.restoreTint(this.elapsed);
  }

  /** Dano contínuo dos estados e fim dos estados */
  private tickStatus(e: Enemy) {
    const now = this.elapsed;
    if (now < e.nextDot) return;
    e.nextDot = now + 500;
    let active = false;
    let total = 0;
    let color = 0xffffff;
    for (const id of ['queimando', 'envenenado', 'sangrando', 'atordoado', 'congelado'] as StatusId[]) {
      if (e.statusUntil[id] <= now) continue;
      active = true;
      if (STATUS[id].dot) {
        total += e.statusDot[id];
        color = STATUS[id].tint;
      }
    }
    if (total > 0) {
      e.hp -= total;
      this.fx.number(e.x + 10, e.y - 8, `${total}`, color);
      if (e.hp <= 0) {
        this.killEnemy(e);
        return;
      }
    }
    if (!active) {
      e.hasStatus = false;
      for (const id of Object.keys(e.statusDot) as StatusId[]) e.statusDot[id] = 0;
    }
    if (!e.flashUntil) e.restoreTint(now);
  }

  private killEnemy(e: Enemy) {
    const { x, y } = e;
    const def = e.def;
    e.kill();
    this.kills++;
    this.fx.ring(x, y, def.radius, 1.8, 200, 0xffffff, 0.5);
    this.burst(x, y, def.elite || def.boss ? 12 : 4);
    if (def.boss) {
      // chefe derrotado: animação de morte, chuva de gemas e comida
      if (this.boss === e) this.boss = null;
      const dieAnim = `${def.texture}-die`;
      if (this.anims.exists(dieAnim)) {
        const corpse = this.add.sprite(x, y, def.texture).setScale(e.scaleX).setFlipX(e.flipX).setDepth(y).play(dieAnim);
        this.tweens.add({ targets: corpse, alpha: 0, delay: 1800, duration: 700, onComplete: () => corpse.destroy() });
      }
      this.cameras.main.flash(300, 255, 240, 200);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        this.dropPickup('xp', Math.ceil(def.xp / 8), x + Math.cos(a) * 40, y + Math.sin(a) * 40);
      }
      this.dropPickup('comida', 40, x, y);
      this.dropPickup('zeny', 60 + Math.floor(Math.random() * 60), x - 30, y + 10);
      if (cardOf(def.id)) this.dropPickup('carta', 0, x + 30, y + 10, def.id);
      if (def.id === 'bafome') this.dropPickup('pena', 1, x, y + 36);
      this.gainJob(50);
      this.events.emit('announce', `${def.name} foi derrotado!`);
      return;
    }
    this.gainJob(def.elite ? 5 : 1);
    if (this.mods.killHeal && Math.random() < 0.35) this.hp = Math.min(this.stats.maxHp, this.hp + this.mods.killHeal);
    this.dropPickup('xp', def.xp, x, y);
    if (Math.random() < (def.elite ? 0.35 : 0.0035)) this.dropPickup('comida', 20, x + 12, y);
    this.rollDrops(def, x, y);
  }

  // ---------------------------------------------------------------- itens e XP

  /** Sorteia zeny, poções, asas, penas, cartas e ovos (a Sorte aumenta as chances) */
  private rollDrops(def: EnemyDef, x: number, y: number) {
    const luck = 1 + this.attrs.sor * 0.02 + this.mods.drop;
    const elite = def.elite ? 10 : 1;
    const r = () => Math.random();
    const off = () => Phaser.Math.Between(-14, 14);
    if (r() < DROPS.zeny * (def.elite ? 3 : 1)) this.dropPickup('zeny', def.elite ? 15 + Math.floor(r() * 15) : 1 + Math.floor(r() * 3), x + off(), y + off());
    if (r() < DROPS.pocao1 * luck * elite) this.dropPickup('pocao1', 0, x + off(), y + off());
    if (r() < DROPS.pocao2 * luck * elite) this.dropPickup('pocao2', 0, x + off(), y + off());
    if (r() < DROPS.pocao3 * luck * elite) this.dropPickup('pocao3', 0, x + off(), y + off());
    if (r() < DROPS.asa * luck * elite) this.dropPickup('asa', 1, x + off(), y + off());
    if (r() < DROPS.pena * luck * elite) this.dropPickup('pena', 1, x + off(), y + off());
    if (cardOf(def.id) && r() < DROPS.carta * luck * (def.elite ? 12 : 1)) this.dropPickup('carta', 0, x, y, def.id);
    if (PETS[def.id] && r() < DROPS.ovo * luck) this.dropPickup('ovo', 0, x + off(), y + off(), def.id);
  }

  private dropPickup(kind: ItemKind, value: number, x: number, y: number, extra = '') {
    const p = this.pickups.get(x, y) as Pickup | null;
    if (!p) {
      if (kind === 'xp') this.gainXp(value);
      else if (kind !== 'comida') this.collect(kind, value, extra);
      return;
    }
    p.place(kind, value, x, y, extra);
  }

  /** Efeito de pegar um item do chão */
  private collect(kind: ItemKind, value: number, extra: string) {
    const px = this.player.x;
    const py = this.player.y;
    const heal = (n: number) => {
      const v = Math.round(Math.min(n, this.stats.maxHp - this.hp));
      this.hp += v;
      this.fx.number(px, py - 30, `+${v}`, 0x7dff6b);
    };
    switch (kind) {
      case 'xp': this.gainXp(value * (1 + this.mods.xp)); break;
      case 'comida': heal(value); break;
      case 'pocao1': heal(20); break;
      case 'pocao2': heal(45); break;
      case 'pocao3': heal(this.stats.maxHp * 0.3); break;
      case 'asa':
        this.items.asa++;
        this.events.emit('toast', 'Asa de Teletransporte! (Q ou botão para usar)', '#9fe6ff');
        break;
      case 'pena':
        this.items.pena++;
        this.events.emit('toast', 'Pena da Ressurreição!', '#fff0a0');
        break;
      case 'zeny': {
        const z = Math.max(1, Math.round(value * (1 + this.mods.zeny)));
        this.zenyRun += z;
        this.fx.number(px, py - 36, `+${z}z`, 0xffd23b);
        break;
      }
      case 'carta': this.collectCard(extra); break;
      case 'ovo': this.equipPet(extra, true); break;
    }
  }

  collectCard(monster: string) {
    const card = cardOf(monster);
    if (!card) return;
    this.cards.push(monster);
    card.apply(this);
    this.cameras.main.flash(250, 255, 220, 120);
    this.events.emit('announce', `${card.name}: ${card.desc}`);
  }

  // ---------------------------------------------------------------- atributos

  /** Soma pontos num atributo e aplica os efeitos que mudam atributos fixos */
  addAttr(a: Attr, n: number) {
    this.attrs[a] += n;
    if (a === 'agi') this.stats.haste += 0.012 * n;
    if (a === 'vit') {
      this.stats.maxHp += 5 * n;
      this.hp += 5 * n;
      this.stats.regen += 0.03 * n;
    }
  }

  /** Gasta um ponto escolhido pelo jogador */
  spendAttr(a: Attr) {
    if (this.attrPoints <= 0) return false;
    this.attrPoints--;
    this.addAttr(a, 1);
    return true;
  }

  /** Distribui os pontos que sobraram conforme o foco da classe */
  autoSpendAttrs() {
    const focus = ATTR_FOCUS[this.line ?? 'aprendiz'];
    const ids = ATTR_IDS.filter((a) => focus[a]);
    const total = ids.reduce((s, a) => s + focus[a]!, 0);
    while (this.attrPoints > 0) {
      let r = Math.random() * total;
      const pick = ids.find((a) => (r -= focus[a]!) <= 0) ?? ids[0];
      this.spendAttr(pick);
    }
  }

  // ---------------------------------------------------------------- nível de classe

  gainJob(n: number) {
    if (this.jobLevel >= MAX_JOB) return;
    this.jobXp += n;
    while (this.jobXp >= jobForLevel(this.jobLevel) && this.jobLevel < MAX_JOB) {
      this.jobXp -= jobForLevel(this.jobLevel);
      this.jobLevel++;
      if (this.jobLevel % 5 === 0) this.events.emit('toast', `Nível de classe ${this.jobLevel}! (+${(this.jobLevel - 1) * 2}% de dano)`, '#9fc3ff');
    }
  }

  // ---------------------------------------------------------------- mascote

  equipPet(id: string, announce: boolean) {
    const def = PETS[id];
    if (!def) return;
    if (this.pet) {
      const b = this.pet.bonus;
      if (b.magnet) this.stats.magnet /= 1 + b.magnet;
      if (b.regen) this.stats.regen -= b.regen;
      if (b.evade) this.mods.evade -= b.evade;
    }
    this.petSprite?.destroy();
    this.pet = def;
    const b = def.bonus;
    if (b.magnet) this.stats.magnet *= 1 + b.magnet;
    if (b.regen) this.stats.regen += b.regen;
    if (b.evade) this.mods.evade += b.evade;
    this.petSprite = this.add.sprite(this.player.x - 30, this.player.y - 20, def.texture).setScale(0.3).play(`${def.texture}-move`);
    const save = loadSave();
    save.pet = id;
    writeSave(save);
    if (announce) this.events.emit('announce', `Novo mascote: ${def.name}! ${def.desc}`);
  }

  private updatePet(dt: number) {
    const s = this.petSprite;
    if (!s || !this.pet) return;
    const tx = this.player.x - this.facing.x * 38;
    const ty = this.player.y - 24 - this.facing.y * 20;
    const k = Math.min(1, dt / 160);
    s.x += (tx - s.x) * k;
    s.y += (ty - s.y) * k + Math.sin(this.elapsed / 180) * 0.15;
    s.setFlipX(this.player.flipX).setDepth(s.y);
    const atk = this.pet.attack;
    if (atk && this.elapsed >= this.petAttackAt) {
      const target = this.nearestEnemies(s.x, s.y, 1, 260)[0];
      if (target) {
        this.petAttackAt = this.elapsed + atk.every;
        this.fx.bolt([{ x: s.x, y: s.y }, { x: target.x, y: target.y }], 0xc8a0ff);
        this.damageEnemy(target, (atk.damage + this.level * 1.5) * this.stats.might, 40, s.x, s.y);
      }
    }
  }

  private updatePickups(dt: number) {
    const px = this.player.x;
    const py = this.player.y;
    const magnetSq = this.stats.magnet ** 2;
    const step = (450 * dt) / 1000;
    const all = this.pickups.getChildren() as Pickup[];

    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      if (!p.active) continue;
      const dx = px - p.x;
      const dy = py - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 20 * 20) {
        p.release();
        this.collect(p.kind, p.value, p.extra);
        if (this.choosing) return;
        continue;
      }
      if (p.magnetized || d2 < magnetSq) {
        p.magnetized = true;
        const d = Math.sqrt(d2);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
  }

  gainXp(amount: number) {
    if (this.over) return;
    this.xp += amount;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevelUps++;
      this.attrPoints += ATTR_POINTS_PER_LEVEL;
    }
    if (this.pendingLevelUps > 0 && !this.choosing) {
      this.choosing = true;
      const data = this.nextLevelUp()!;
      this.scene.pause();
      this.scene.launch('LevelUp', data);
    }
  }

  /**
   * Prepara a próxima tela de level up (ou null se não houver mais).
   * Chamada pela LevelUpScene depois de cada escolha.
   */
  nextLevelUp(): LevelUpData | null {
    if (this.pendingLevelUps <= 0) {
      this.choosing = false;
      return null;
    }
    this.pendingLevelUps--;
    this.resolvedLevel++;

    // hora de escolher a próxima classe (1ª classe no nível 5, 2ª no nível 15)
    const cur = CLASSES[this.classId];
    if (cur.choices && this.resolvedLevel >= CLASSES[cur.choices[0]].minLevel) {
      const options: Upgrade[] = cur.choices.map((id) => {
        const def = CLASSES[id];
        const line = LINES[lineOf(id)!];
        return {
          id: `classe-${id}`,
          title: def.name,
          desc: def.description,
          color: line.color,
          icon: def.texture,
          apply: (g: GameScene) => g.chooseProfession(id),
        };
      });
      const first = this.classId === 'aprendiz';
      return {
        level: this.resolvedLevel, promotion: null, options,
        choiceTitle: first ? 'ESCOLHA SUA PROFISSÃO' : 'ESCOLHA SUA 2ª CLASSE',
        choiceSubtitle: first
          ? `Nível ${this.resolvedLevel}: o Aprendiz está pronto para se especializar`
          : `Nível ${this.resolvedLevel}: o ${cur.name} pode seguir dois caminhos`,
      };
    }
    const promotion: ClassDef | null = null;
    return { level: this.resolvedLevel, promotion, options: rollUpgrades(this, 3) };
  }

  // ---------------------------------------------------------------- classes e habilidades

  /** Chamado ao escolher a profissão no nível 5 */
  chooseProfession(id: ClassId) {
    this.line = lineOf(id);
    this.promote(id);
  }

  addSkill(id: SkillId) {
    const existing = this.skills.get(id);
    if (existing) {
      if (existing.level < SKILLS[id].maxLevel) existing.levelUp();
    }
    else this.skills.set(id, createSkill(id, this));
  }

  private promote(id: ClassId) {
    const def = CLASSES[id];
    this.classId = id;
    this.jobLevel = 1;
    this.jobXp = 0;
    for (const [k, v] of Object.entries(def.statBonus) as [keyof Stats, number][]) this.stats[k] += v;
    this.hp = this.stats.maxHp;
    this.player.setTexture(def.texture, 'idle0').setScale(heroScale(def.texture));
    this.attackUntil = 0;
    this.player.play(`${def.texture}-idle`);
    this.sparkBudget = 40;
    this.burst(this.player.x, this.player.y, 40);
    if (def.grantsSkill) this.addSkill(def.grantsSkill);
    this.cameras.main.flash(500, 255, 230, 150);

    // onda de choque da promoção empurra os inimigos próximos
    this.fx.ring(this.player.x, this.player.y, 30, 8, 500, 0xffe9a0, 0.5);
    for (const e of this.queryEnemies(this.player.x, this.player.y, 240, this.nearBuf).slice()) {
      if (e.active && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 240) {
        this.damageEnemy(e, 40 * this.stats.might, 500, this.player.x, this.player.y);
      }
    }
  }

  // ---------------------------------------------------------------- desempenho

  /**
   * A cada 2 segundos confere o FPS real. Se estiver baixo, reduz o limite de
   * inimigos e de números de dano até o jogo voltar a rodar liso.
   */
  private adaptQuality(dt: number) {
    this.qualityTimer += dt;
    if (this.qualityTimer < 2000) return;
    this.qualityTimer = 0;
    const fps = this.game.loop.actualFps;
    if (fps < 45 && this.maxEnemies > this.minEnemies) {
      this.maxEnemies = Math.max(this.minEnemies, Math.round(this.maxEnemies * 0.85));
      this.fx.maxNumbers = Math.max(8, this.fx.maxNumbers - 5);
    }
  }

  private gameOver() {
    this.over = true;
    const dieAnim = `${CLASSES[this.classId].texture}-die`;
    if (this.anims.exists(dieAnim)) this.player.play(dieAnim);
    else this.player.setTint(0x555555);
    const save = loadSave();
    save.zeny += this.zenyRun;
    if (this.elapsed > save.best.time) save.best.time = this.elapsed;
    if (this.level > save.best.level) save.best.level = this.level;
    writeSave(save);
    const result: RunResult = {
      time: this.elapsed,
      level: this.level,
      className: CLASSES[this.classId].name,
      kills: this.kills,
      line: this.line,
      zeny: this.zenyRun,
      zenyTotal: save.zeny,
      cards: this.cards.length,
    };
    this.time.delayedCall(800, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', result);
    });
  }
}

/** Gerador pseudoaleatório fixo por célula do mapa (mesma célula = mesma decoração) */
function cellRandom(cx: number, cy: number) {
  let h = Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decorações "em pé" (o herói passa na frente ou atrás) */
const TALL_DECOR = new Set(['deco-arbusto', 'deco-cacto', 'deco-coluna', 'deco-cristal']);

/** Escolhe um item de uma lista [valor, peso] usando um número de 0 a 1 */
function pickWeighted(list: [string, number][], r: number) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let acc = r * total;
  for (const [v, w] of list) {
    acc -= w;
    if (acc <= 0) return v;
  }
  return list[list.length - 1][0];
}
