import Phaser from 'phaser';
import { Enemy } from '../objects/Enemy';
import { Pickup } from '../objects/Pickup';
import { ZUMBI, BAFOME, MINOTAURO, LICH, BOSS_LEVEL_EVERY, MINI_LEVEL_EVERY, BOSS_ROTATION, HARD_FROM, SHOP_LEVEL_EVERY, levelScale, ENEMIES, MAX_ENEMY_RADIUS, dmgScale, hpScale, speedScale, threatLevel, type EnemyDef } from '../data/enemies';
import { BafomeAI } from '../boss';
import { ZombieAI } from '../miniboss';
import { MinotaurAI } from '../minotaur';
import { LichAI } from '../lich';
import { CLASSES, LINES, lineOf, type ClassDef, type ClassId, type LineId } from '../data/classes';
import { feetOffset, heroScale, needsShadow } from '../sprites';
import { BASE_STATS, type Stats } from '../data/stats';
import { SKILLS, type SkillId } from '../data/skills';
import type { Upgrade } from '../data/upgrades';
import { EQUIPMENT, RARE_DUPLICATE_ZENY, activeSets, collectionBonuses, equipById, type EquipDef, type EquipStats } from '../data/equipment';
import type { Skill } from '../skills/Skill';
import { createSkill } from '../skills';
import { MAX_ACTIVE, MAX_PASSIVE, POINT_CAP_FIRST, POINT_CAP_SECOND, TREE, TREE_CLASSES, TREE_PARENT, nodeMax, treeNode, type PassiveId, type TreeId } from '../data/skilltree';
import { isTouch, onResize } from '../ui';
import { SpatialGrid } from '../spatialGrid';
import { Fx, FX_DEPTH } from '../fx';
import { Projectiles } from '../projectiles';
import {
  ATTR_FX, ATTR_IDS, DROPS, attrCost, matkRange, statPointsForLevel, statusAtk, MAPS, PETS, REFINE_DMG, STATUS, cardOf, elementMult, emptyMods,
  type Attr, type Attrs, type Element as Elem, type MapDef, type Mods, type PetDef, type RpgHost, type StatusId,
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

/** Itens raros por monstro */
const RARE_BY_MONSTER = new Map<string, EquipDef[]>();
for (const item of EQUIPMENT) {
  if (!item.drop) continue;
  const list = RARE_BY_MONSTER.get(item.drop.monster) ?? [];
  list.push(item);
  RARE_BY_MONSTER.set(item.drop.monster, list);
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
  /** Bônus de atributo vindos de equipamento e cartas (não custam pontos) */
  bonusAttrs: Attrs = { for: 0, agi: 0, vit: 0, int: 0, des: 0, sor: 0 };
  /** Soma dos efeitos do equipamento usado nesta partida */
  equipTotals: Required<Omit<EquipStats, 'attrs'>> = { atk: 0, matk: 0, def: 0, hp: 0, speed: 0, crit: 0, flee: 0, aspd: 0, regen: 0, magnet: 0 };
  /** Cartas coletadas (id do monstro), na ordem */
  cards: string[] = [];
  items = { asa: 0, pena: 0 };
  zenyRun = 0;
  jobLevel = 1;
  jobXp = 0;
  /** Pontos de habilidade da árvore (1 por nível de classe na linha do Mago) */
  skillPoints = 0;
  /** Nível das habilidades passivas da árvore */
  passiveLv: Partial<Record<PassiveId, number>> = {};
  /** Redução do dano recebido (Barreira Arcana) */
  private dmgTakenRed = 0;
  /** Flee extra (Vendaval) */
  private skillFlee = 0;
  /** HP máximo extra em % (Dilúvio, Fé...) */
  private hpPct = 0;
  /** Bônus das passivas: HIT, dano do crítico, veneno, revide, fúria, Lembrança Arcana */
  private skillHit = 0;
  private critDmg = 0;
  private poisonChance = 0;
  private counterChance = 0;
  private berserk = 0;
  private recall = 0;
  /** Pontos de habilidade já ganhos na classe atual (há um teto por classe) */
  classPoints = 0;
  /** Níveis comprados com pontos (o que volta ao esquecer a habilidade) */
  paidLv: Partial<Record<TreeId, number>> = {};
  /** Atributos e pontos já confirmados (o que passar disso ainda pode ser desfeito) */
  private committedAttrs: Attrs = { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 };
  private committedPoints = 0;
  pet: PetDef | null = null;
  map!: MapDef;
  /** Estados do jogador */
  curseUntil = 0;
  poisonUntil = 0;
  private nextPoisonTick = 0;
  private nextPoisonFx = 0;
  private petSprite: Phaser.GameObjects.Sprite | null = null;
  private petAttackAt = 0;
  private darkness!: Phaser.GameObjects.Rectangle;

  /** Inimigos ativos neste frame e grade para achar os próximos rapidamente */
  private live: Enemy[] = [];
  private grid = new SpatialGrid<Enemy>(GRID_CELL);
  private nearBuf: Enemy[] = [];

  /** Uma tela de nível/classe está aberta */
  choosing = false;
  private over = false;
  private spawnTimer = 0;
  private nextWaveAt = 60;
  /** Calendário de chefes: a cada 2 min, alternando mini-chefe e chefe */
  /** Chefes por nível: a cada 4 níveis, alternando mini-chefe e chefe */
  private miniDone = 0;
  private pendingMini = 0;
  private bossDone = 0;
  private pendingBoss = 0;
  /** Loja durante a partida a cada 10 níveis */
  private shopVisits = 0;
  private pendingShop = false;
  /** Zeny desta partida já guardado na conta ao usar a loja no meio da partida */
  zenyBanked = 0;
  private appliedEquip: Record<string, string | undefined> = {};
  private appliedStats: EquipStats[] = [];
  /** Brilho da arma mítica */
  private glowFx: Phaser.FX.Glow | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private glowAura: Phaser.GameObjects.Image | null = null;
  private glowColor = 0;
  private appliedRefine = 0;
  private bossRound: Record<string, number> = {};
  private bossAIs: { update(dt: number): boolean }[] = [];
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
    this.bonusAttrs = { for: 0, agi: 0, vit: 0, int: 0, des: 0, sor: 0 };
    this.attrs = { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 };
    this.level = 1;
    // O HP máximo = (HP fixo + HP por nível) × (1 + VIT/100), como no clássico.
    // Somar no maxHp (classe, equipamento, cartas) mexe só na parte fixa.
    let flatHp = this.stats.maxHp;
    Object.defineProperty(this.stats, 'maxHp', {
      configurable: true, enumerable: true,
      get: () => this.effectiveHp(flatHp),
      set: (v: number) => { flatHp += v - this.effectiveHp(flatHp); },
    });
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
    this.choosing = false;
    this.over = false;
    this.spawnTimer = 600;
    this.nextWaveAt = 60;
    this.miniDone = this.pendingMini = this.bossDone = this.pendingBoss = 0;
    this.shopVisits = 0;
    this.pendingShop = false;
    this.zenyBanked = 0;
    this.appliedEquip = {};
    this.glowFx = null;
    this.glowTween = null;
    this.glowAura = null;
    this.glowColor = 0;
    this.appliedRefine = 0;
    this.bossRound = {};
    this.boss = null;
    this.bossAIs = [];
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
    this.attrPoints = ATTR_FX.startPoints;
    this.cards = [];
    this.items = { asa: 0, pena: 0 };
    this.zenyRun = 0;
    this.jobLevel = 1;
    this.jobXp = 0;
    this.skillPoints = 0;
    this.passiveLv = {};
    this.dmgTakenRed = this.skillFlee = this.hpPct = 0;
    this.skillHit = this.critDmg = this.poisonChance = this.counterChance = this.berserk = this.recall = 0;
    this.classPoints = 0;
    this.paidLv = {};
    this.committedAttrs = { ...this.attrs };
    this.committedPoints = this.attrPoints;
    this.pet = null;
    this.petSprite = null;
    this.curseUntil = this.poisonUntil = this.nextPoisonTick = 0;

    // progresso entre partidas: loja, refino, mascote e mapa escolhido
    const save = loadSave();
    this.map = MAPS.find((m) => m.id === save.map) ?? MAPS[0];
    this.bonusAttrs = { for: 0, agi: 0, vit: 0, int: 0, des: 0, sor: 0 };
    this.applyEquipment(save.equip, save.refine);
    this.hp = this.stats.maxHp;

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
    this.updateWeaponGlow();
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
    // começo da partida: distribuir os 48 pontos iniciais
    this.time.delayedCall(60, () => this.openLevelScreens('start'));
  }

  update(_time: number, delta: number) {
    if (this.over || !this.cameras?.main) return;
    const dt = Math.min(delta, 50);
    this.elapsed += dt;
    this.frame++;
    this.sparkBudget = this.sparkMax;
    if (this.frame % 8 === 1) this.updateDecor();

    this.collectEnemies();
    this.bossAIs = this.bossAIs.filter((ai) => ai.update(dt));
    this.updatePlayer(dt);
    this.updatePet(dt);
    this.skills.forEach((s) => s.update(dt));
    this.updateGlowAura();
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
      this.fx.number(this.player.x, this.player.y - 30, '-4', 0x7aff6a, true);
    }
    this.player.setAlpha(this.elapsed < this.invulnUntil ? 0.6 + 0.4 * Math.sin(this.elapsed / 30) : 1);

    this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.regen * dt) / 1000);
  }

  private onEnemyTouch(e: Enemy) {
    if (e.isStopped(this.elapsed)) return;
    const hit = this.hurtPlayer(e.damage, false, e.hit);
    // Contra-Ataque: chance de revidar no agressor
    if (hit && this.counterChance && e.active && Math.random() < this.counterChance) {
      this.fx.slash(this.player.x, this.player.y, Math.atan2(e.y - this.player.y, e.x - this.player.x), 60, 0xffa060);
      this.damageEnemy(e, (40 + this.level * 2) * this.stats.might, 260, this.player.x, this.player.y, 'espada');
    }
    // cogumelos podem envenenar
    if (hit && e.def.id === 'cogumelo' && Math.random() < 0.2) this.afflictPlayer('veneno', 3000);
  }

  /** Aplica maldição (lentidão) ou veneno no jogador; VIT dá chance de resistir */
  afflictPlayer(kind: 'maldicao' | 'veneno', ms: number) {
    if (Math.random() < Math.min(0.5, this.attr('vit') * ATTR_FX.vitResist)) {
      this.fx.miss(this.player.x, this.player.y - 44);
      return;
    }
    if (kind === 'maldicao') this.curseUntil = this.elapsed + ms;
    else this.poisonUntil = this.elapsed + ms;
    this.events.emit('toast', kind === 'maldicao' ? 'Amaldiçoado! (mais lento)' : 'Envenenado!', kind === 'maldicao' ? '#c8a0ff' : '#9aff7a');
  }

  /** Dano no jogador (contato, ataques do chefe). `heavy` ignora parte da armadura. */
  hurtPlayer(amount: number, heavy = false, monsterHit = 20): boolean {
    if (this.over || this.elapsed < this.invulnUntil) return false;
    // ataques de chefe (avisados) só podem ser evitados pela esquiva perfeita; golpes comuns usam Flee
    const dodge = heavy ? this.perfectDodge() : this.evadeChance(monsterHit) + this.perfectDodge();
    if (Math.random() < dodge) {
      this.invulnUntil = this.elapsed + 250;
      this.fx.miss(this.player.x, this.player.y - 34);
      // Caçador de Sombras: some numa nuvem de sombra ao esquivar
      if (this.shadowFx) this.fx.anim('fx-cacador', ['fumaca0', 'fumaca1', 'fumaca2', 'fumaca3'], this.player.x, this.player.y - 18, 420, 0.55, { depth: this.player.y + 2, hold: 0.5 });
      return false;
    }
    if (Math.random() < this.mods.ignoreHit) {
      this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
      this.fx.ring(this.player.x, this.player.y, 22, 1.6, 250, 0xc8c8ff, 0.5);
      return false;
    }
    // DEF dura (%) e DEF macia (VIT); ataques de chefe ignoram metade da DEF dura
    const dmg = Math.max(1, Math.round(amount * (1 - Math.min(0.6, this.dmgTakenRed)) * (1 - this.hardDef() * (heavy ? 0.5 : 1)) - this.softDef()));
    this.hp -= dmg;
    this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
    this.hurtUntil = this.elapsed + 100;
    this.cameras.main.shake(90, 0.004);
    this.fx.number(this.player.x, this.player.y - 30, `-${dmg}`, 0xff3a3a);
    if (this.hp <= 0) {
      if (this.items.pena > 0) this.revive();
      else this.gameOver();
    }
    return true;
  }

  // ---------------------------------------------------------------- fórmulas no estilo clássico

  private effectiveHp(flat: number) {
    return Math.round((flat + (this.level - 1) * ATTR_FX.hpPerLevel) * (1 + this.attr('vit') / 100) * (1 + this.hpPct));
  }

  /** Atq de status físico (corpo a corpo usa FOR, à distância usa DES) */
  physAtk(kind: 'melee' | 'ranged') {
    return kind === 'ranged'
      ? statusAtk(this.attr('des'), this.attr('for'), this.attr('sor'))
      : statusAtk(this.attr('for'), this.attr('des'), this.attr('sor'));
  }

  matk(): [number, number] {
    return matkRange(this.attr('int'));
  }

  /** Bônus de dano dos atributos (Atq ou Matq ÷ 40) para cada tipo de dano */
  attrDamage(kind: 'melee' | 'ranged' | 'magic') {
    if (kind === 'magic') {
      const [a, b] = this.matk();
      return (a + b) / 2 / ATTR_FX.atkDiv;
    }
    return this.physAtk(kind) / ATTR_FX.atkDiv;
  }

  /** HIT do jogador: nível + DES + SOR/3 */
  hit() {
    return this.level + this.attr('des') + Math.floor(this.attr('sor') / 3) + this.skillHit;
  }

  /** Flee do jogador: nível + AGI + SOR/5 */
  flee() {
    return this.level + this.attr('agi') + Math.floor(this.attr('sor') / 5) + this.skillFlee;
  }

  /** Esquiva perfeita: 0,1% por ponto de SOR (desvia até de chefes) */
  perfectDodge() {
    return this.attr('sor') * 0.001;
  }

  /** Chance de o golpe de um monstro acertar o jogador */
  monsterHitChance(monsterHit: number) {
    return Phaser.Math.Clamp(ATTR_FX.hitBase + monsterHit - this.flee(), 5, 95) / 100;
  }

  /** Chance de esquivar de um monstro comum (Flee + bônus de equipamento e mascote) */
  evadeChance(monsterHit = 20) {
    return Math.min(0.95, 1 - this.monsterHitChance(monsterHit) + this.mods.evade);
  }

  critChance() {
    return Math.min(0.6, (1 + this.attr('sor') * 0.3) / 100 + this.mods.crit);
  }

  /** DEF dura: redução em % (equipamento e classe) */
  hardDef() {
    return Math.min(0.6, this.stats.armor * 0.02);
  }

  /** DEF macia: VIT/2, subtraída do dano */
  softDef() {
    return Math.floor(this.attr('vit') / 2);
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
          const speed = e.speed * (e.statusUntil.envenenado > this.elapsed ? STATUS.envenenado.slow! : 1) * (e.statusUntil.lento > this.elapsed ? STATUS.lento.slow! : 1);
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
      // depois dos 4:00 os monstros vêm em maior número
      const lateMin = Math.max(0, t - HARD_FROM) / 60;
      this.spawnTimer = Math.max(lateMin > 0 ? 110 : 160, 1000 - t * 2.8);
      const batch = 1 + Math.floor(t / 45) + Math.floor(lateMin * 1.5);
      for (let i = 0; i < batch; i++) this.spawnEnemy(this.pickEnemy(t));
    }

    // a cada minuto, uma horda cerca o jogador
    if (t >= this.nextWaveAt) {
      this.nextWaveAt += 60;
      const common = ENEMIES.filter((d) => !d.elite && t >= d.from);
      const def = common[common.length - 1];
      const count = 24 + Math.floor(t / 30) * 2 + Math.floor(Math.max(0, t - HARD_FROM) / 60) * 8;
      for (let i = 0; i < count; i++) {
        const p = this.ringPosition((i / count) * Math.PI * 2);
        this.spawnEnemy(def, p.x, p.y);
      }
      const elite = ENEMIES.find((d) => d.elite)!;
      if (t >= 300) this.spawnEnemy(elite);
      {
        const horde = t >= 300 ? 'Uma horda e um Cavaleiro Negro se aproximam!' : 'Uma horda se aproxima!';
        if (Math.floor(t) >= HARD_FROM && Math.floor(t) < HARD_FROM + 60) this.events.emit('toast', 'A partir de agora os monstros vêm em maior número!', '#ff9a7a');
        this.events.emit('announce', `${horde}\nAmeaça ${threatLevel(t)}: os monstros ficaram mais fortes`);
      }
    }

    // mini-chefe a cada 10 níveis e chefe a cada 15 (calendários independentes)
    if (!this.choosing) {
      if (this.pendingMini > 0) {
        this.pendingMini--;
        this.miniDone++;
        this.spawnMiniBoss();
      }
      const bossAlive = !!this.boss && this.boss.active && !!this.boss.def.boss;
      if (this.pendingBoss > 0 && !bossAlive) {
        this.pendingBoss--;
        this.spawnBoss(BOSS_ROTATION[this.bossDone % BOSS_ROTATION.length]);
        this.bossDone++;
      }
    }
  }

  /** Quantas vezes esse chefe já apareceu (cada volta fica mais forte) */
  private nextRound(id: string) {
    const r = this.bossRound[id] ?? 0;
    this.bossRound[id] = r + 1;
    return r;
  }

  private spawnMiniBoss() {
    const round = this.nextRound('zumbi');
    const p = this.ringPosition();
    const e = this.spawnEnemy(ZUMBI, p.x, p.y, true);
    if (!e) return;
    e.hp = e.maxHp = Math.ceil(e.maxHp * (1 + round * 0.8));
    e.damage = Math.round(e.damage * (1 + round * 0.4));
    this.bossAIs.push(new ZombieAI(this, e, round ? 0.7 : 1));
    if (!this.boss || !this.boss.active) this.boss = e;
    this.cameras.main.shake(250, 0.005);
    this.events.emit('announce', round ? `Um Carniçal mais forte surgiu! (${round + 1}ª vez)` : 'Um Carniçal faminto surgiu!');
  }

  private spawnBoss(id: 'bafome' | 'minotauro' | 'lich') {
    const round = this.nextRound(id);
    const def = id === 'bafome' ? BAFOME : id === 'minotauro' ? MINOTAURO : LICH;
    const p = this.ringPosition();
    const e = this.spawnEnemy(def, p.x, p.y, true);
    if (!e) return;
    // da 2ª vez em diante: muito mais forte, já em fúria, ataques mais fortes e seguidos
    e.hp = e.maxHp = Math.ceil(e.maxHp * (1 + round * 1.5));
    const power = { dmg: 1 + round * 0.6, cd: Math.max(0.5, 1 - round * 0.3), enraged: round > 0 };
    this.boss = e;
    this.bossAIs.push(id === 'bafome' ? new BafomeAI(this, e, power) : id === 'minotauro' ? new MinotaurAI(this, e, power) : new LichAI(this, e, power));
    this.cameras.main.shake(500, 0.008);
    const flash = { bafome: [80, 0, 90], minotauro: [120, 60, 20], lich: [30, 140, 70] }[id];
    this.cameras.main.flash(300, flash[0], flash[1], flash[2]);
    const name = { bafome: 'O BAFOME DESPERTOU!', minotauro: 'O MINOTAURO BRUTAL CHEGOU!', lich: 'O LORDE OSSÁRIO ERGUEU-SE DAS SOMBRAS!' }[id];
    this.events.emit('announce', round ? `${name}\nVOLTOU MUITO MAIS FORTE! Desvie dos ataques!` : name);
  }

  /** Poeira no chão (golpes pesados) */
  dust(x: number, y: number) {
    this.fx.ring(x, y, 18, 4, 450, 0xc8a070, 0.45);
    this.fx.ring(x, y, 10, 6, 600, 0xe8d0a0, 0.25);
    this.burst(x, y, 8);
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
    // chefes e mini-chefes crescem na metade do ritmo (já têm muita vida e ataques próprios)
    const ts = def.boss || def.miniboss ? t / 2 : t;
    const boss = def.boss || def.miniboss;
    const lv = boss ? { hp: 1, dmg: 1, speed: 0 } : levelScale(this.level);
    e.spawn(def, x, y, hpScale(ts) * lv.hp, dmgScale(ts) * lv.dmg, def.boss ? 1 : speedScale(t) + lv.speed);
    // nível do monstro: define o acerto (HIT) e a esquiva (Flee)
    const mlv = (def.lv ?? 1) + Math.floor(t / 60) * 2 + Math.max(0, this.level - 7) * 2;
    e.mlv = mlv;
    e.flee = Math.round(mlv * (def.agile ? 1.5 : 1));
    e.hit = Math.round(mlv * 1.5 + 20);
    e.setDepth(y);
    return e;
  }

  /** Servos invocados por chefes (ignoram o limite de inimigos) */
  spawnMinion(def: EnemyDef, x: number, y: number) {
    const e = this.spawnEnemy(def, x, y, true);
    if (e) this.fx.ring(x, y, 20, 2.5, 300, 0x6a1a7a, 0.5);
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
      const crit = Math.random() < this.critChance();
      if (sk && sk.kind !== 'magic' && !crit) {
        const chance = Phaser.Math.Clamp(ATTR_FX.hitBase + this.hit() - e.flee, 5, 95) / 100;
        if (Math.random() > chance) {
          this.fx.miss(e.x, e.y - 24);
          return;
        }
      }
      if (sk) {
        // Matq varia entre o mínimo e o máximo da INT
        const attrBonus = sk.kind === 'magic'
          ? Phaser.Math.Between(...this.matk()) / ATTR_FX.atkDiv
          : this.attrDamage(sk.kind);
        mult *= 1 + attrBonus + this.mods.kindDmg[sk.kind];
        elemMult = elementMult(sk.element, e.def.element);
        mult *= elemMult * (1 + (this.mods.elemDmg[sk.element] ?? 0));
        mult *= sk.sizeMod?.[e.def.size] ?? 1;
      }
      mult *= 1 + (this.mods.raceDmg[e.def.race] ?? 0);
      if (crit) mult *= 1.5 + this.critDmg;
      // Fúria: dano extra com menos da metade do HP
      if (this.berserk && this.hp < this.stats.maxHp / 2) mult *= 1 + this.berserk;
      if (e.blocking) mult *= 0.2;
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
        if (sk?.kind === 'ranged' && this.poisonChance && Math.random() < this.poisonChance) this.applyStatus(e, 'envenenado', dmg);
        if (sk?.status && Math.random() < sk.status.chance + (sk.statusPerLv ?? 0) * ((this.skills.get(sk.id)?.level ?? 1) - 1)) this.applyStatus(e, sk.status.id, dmg);
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
    // nuvem de veneno ao envenenar (só quando o inimigo ainda não estava envenenado)
    // (efeito opcional: no máximo 1 a cada 150 ms e só com folga no limite de animações)
    if (id === 'envenenado' && e.statusUntil.envenenado <= this.elapsed && this.elapsed >= this.nextPoisonFx && this.fx.animCount < 24) {
      this.nextPoisonFx = this.elapsed + 150;
      this.fx.anim('fx-cacador', ['veneno0', 'veneno1', 'veneno2'], e.x, e.y - e.def.radius - 6, 900, 0.32 * Math.max(1, e.def.radius / 14), { loop: 2, hold: 0.6 });
    }
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
    for (const id of ['queimando', 'envenenado', 'sangrando', 'atordoado', 'congelado', 'lento'] as StatusId[]) {
      if (e.statusUntil[id] <= now) continue;
      active = true;
      if (STATUS[id].dot) {
        total += e.statusDot[id];
        color = STATUS[id].tint;
      }
    }
    if (total > 0) {
      e.hp -= total;
      this.fx.number(e.x + 10, e.y - 8, `${total}`, color, true);
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
    if (def.miniboss) {
      // mini-chefe: queda animada, gemas, zeny e chance de carta
      if (this.boss === e) this.boss = null;
      const corpse = this.add.sprite(x, y, def.texture).setScale(e.scaleX).setFlipX(e.flipX).setDepth(y).play(`${def.texture}-die`);
      this.tweens.add({ targets: corpse, alpha: 0, delay: 1600, duration: 600, onComplete: () => corpse.destroy() });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        this.dropPickup('xp', Math.ceil(def.xp / 5), x + Math.cos(a) * 30, y + Math.sin(a) * 30);
      }
      this.dropPickup('zeny', 25 + Math.floor(Math.random() * 30), x, y + 20);
      if (Math.random() < 0.35) this.dropPickup('carta', 0, x + 24, y, def.id);
      this.rollRare(def.id, x, y);
      this.gainJob(15);
      this.events.emit('toast', 'Carniçal derrotado!', '#9aff8a');
      return;
    }
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
      this.rollRare(def.id, x, y);
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
    const luck = 1 + this.attr('sor') * ATTR_FX.sorDrop + this.mods.drop;
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
    this.rollRare(def.id, x, y, luck);
  }

  /** Itens raros que só caem deste monstro */
  private rollRare(monster: string, x: number, y: number, luck = 1 + this.attr('sor') * ATTR_FX.sorDrop + this.mods.drop) {
    const list = RARE_BY_MONSTER.get(monster);
    if (!list) return;
    // armas míticas: a chance multiplica a cada volta do mesmo chefe (2ª vez = x2...)
    const round = Math.max(1, this.bossRound[monster] ?? 1);
    for (const item of list) {
      const chance = item.drop!.chance * luck * (item.glow ? round : 1);
      if (Math.random() >= chance) continue;
      const p = this.dropPickup('equip', 0, x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-10, 20), item.id);
      if (item.glow) {
        // arma mítica: coluna de luz, aviso e vem sozinha até o jogador
        if (p) p.magnetized = true;
        this.fx.ring(x, y, 20, 9, 900, item.glow, 0.6);
        this.cameras.main.flash(400, (item.glow >> 16) & 255, (item.glow >> 8) & 255, item.glow & 255);
        const from = [BAFOME, MINOTAURO, LICH, ZUMBI].find((d) => d.id === monster)?.name ?? 'chefe';
        this.events.emit('announce', `✦ ARMA MÍTICA! ${item.name} caiu do ${from}! ✦`);
      }
    }
  }

  /** Pegou um equipamento raro: entra na coleção (ou vira zeny, se repetido) */
  private collectEquip(id: string) {
    const item = equipById(id);
    if (!item) return;
    const save = loadSave();
    if (save.owned.includes(id)) {
      const z = item.glow ? RARE_DUPLICATE_ZENY * 6 : RARE_DUPLICATE_ZENY;
      this.zenyRun += z;
      this.events.emit('toast', `${item.name} repetido: +${z} zeny`, '#ffd27a');
      return;
    }
    save.owned.push(id);
    writeSave(save);
    this.events.emit('announce', `${item.glow ? '✦ Arma mítica' : 'Item raro'}: ${item.name}! Equipe na loja. (Coleção ${save.owned.length}/${EQUIPMENT.length})`);
    this.cameras.main.flash(250, 255, 230, 150);
  }

  private dropPickup(kind: ItemKind, value: number, x: number, y: number, extra = '') {
    const p = this.pickups.get(x, y) as Pickup | null;
    if (!p) {
      if (kind === 'xp') this.gainXp(value);
      else if (kind !== 'comida') this.collect(kind, value, extra);
      return null;
    }
    p.place(kind, value, x, y, extra);
    return p;
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
      case 'equip': this.collectEquip(extra); break;
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

  // ---------------------------------------------------------------- equipamento e atributos

  /** Soma ou remove (sign = -1) uma lista de efeitos (itens, conjuntos, coleção) */
  private equipEffects(list: EquipStats[], sign: 1 | -1) {
    const t = { atk: 0, matk: 0, def: 0, hp: 0, speed: 0, crit: 0, flee: 0, aspd: 0, regen: 0, magnet: 0 };
    for (const st of list) {
      for (const key of Object.keys(t) as (keyof typeof t)[]) t[key] += st[key] ?? 0;
      for (const [a, v] of Object.entries(st.attrs ?? {})) this.addAttr(a as Attr, sign * v!);
    }
    this.mods.kindDmg.melee += sign * t.atk;
    this.mods.kindDmg.ranged += sign * t.atk;
    this.mods.kindDmg.magic += sign * t.matk;
    this.stats.armor += sign * t.def;
    this.stats.maxHp += sign * t.hp;
    this.stats.speed += sign * t.speed;
    this.mods.crit += sign * t.crit;
    this.mods.evade += sign * t.flee;
    this.stats.haste += sign * t.aspd;
    this.stats.regen += sign * t.regen;
    if (sign > 0) this.stats.magnet *= 1 + t.magnet;
    else this.stats.magnet /= 1 + t.magnet;
    return t;
  }

  /** Efeitos do equipamento: itens equipados + conjuntos completos + bônus da coleção */
  private equipStatsList(equip: Record<string, string | undefined>) {
    const list: EquipStats[] = [];
    for (const id of Object.values(equip)) {
      const item = equipById(id);
      if (item) list.push(item.stats);
    }
    for (const st of activeSets(equip)) list.push(st.bonus);
    for (const m of collectionBonuses(loadSave().owned.length)) list.push(m.bonus);
    return list;
  }

  /**
   * Arma mítica equipada: o herói ganha um contorno brilhante pulsando (WebGL)
   * e uma aura no chão com faíscas da cor da arma.
   */
  updateWeaponGlow() {
    // o herói ainda não existe no começo do create(); chamado de novo depois
    if (!this.player?.scene) return;
    const weapon = equipById(this.appliedEquip.arma);
    const color = weapon?.glow;
    if (this.glowFx) {
      this.player.preFX?.remove(this.glowFx);
      this.glowFx = null;
    }
    this.glowTween?.remove();
    this.glowTween = null;
    this.glowColor = color ?? 0;
    this.glowAura?.setVisible(!!color);
    if (!color) return;
    const fx = this.player.preFX?.addGlow(color, 3, 0, false, 0.1, 10) ?? null;
    this.glowFx = fx;
    if (fx) this.glowTween = this.tweens.add({ targets: fx, outerStrength: 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    if (!this.glowAura) this.glowAura = this.add.image(0, 0, 'fx-ring');
    this.glowAura.setTint(color).setAlpha(0.28).setScale(2.2, 0.8).setVisible(true);
  }

  /** Acompanha a aura e solta faíscas da arma mítica */
  private updateGlowAura() {
    if (!this.glowColor || !this.glowAura) return;
    const p = this.player;
    const t = this.elapsed / 700;
    this.glowAura.setPosition(p.x, p.y + feetOffset(p.texture.key) - 2).setDepth(p.y - 2).setAlpha(0.2 + 0.12 * Math.sin(t * Math.PI));
    if (this.frame % 9 === 0) {
      const a = Math.random() * Math.PI * 2;
      this.fx.ring(p.x + Math.cos(a) * 18, p.y - 20 + Math.sin(a) * 26, 2.5, 1.6, 420, this.glowColor, 0.9);
    }
  }

  /** Aplica os itens equipados, conjuntos, coleção e o refino da arma */
  private applyEquipment(equip: Record<string, string | undefined>, refine: number) {
    this.appliedStats = this.equipStatsList(equip);
    this.equipTotals = this.equipEffects(this.appliedStats, 1);
    this.appliedEquip = { ...equip };
    this.updateWeaponGlow();
    // o refino só vale se houver uma arma equipada
    this.appliedRefine = equip.arma ? refine * REFINE_DMG : 0;
    this.mods.dmgAll += this.appliedRefine;
  }

  /** Depois de comprar na loja no meio da partida: troca os efeitos antigos pelos novos */
  reapplyEquipment() {
    const save = loadSave();
    this.equipEffects(this.appliedStats, -1);
    this.mods.dmgAll -= this.appliedRefine;
    this.applyEquipment(save.equip, save.refine);
    this.hp = Math.min(this.hp, this.stats.maxHp);
  }

  /** Abre a loja no meio da partida: o zeny da partida vai para a conta */
  bankZeny() {
    const save = loadSave();
    save.zeny += this.zenyRun;
    this.zenyBanked += this.zenyRun;
    this.zenyRun = 0;
    writeSave(save);
  }

  /** A loja precisa abrir agora? (consome o pedido) */
  takeShopVisit() {
    const v = this.pendingShop;
    this.pendingShop = false;
    return v;
  }

  /** Valor total do atributo (pontos gastos + equipamento e cartas) */
  attr(a: Attr) {
    return this.attrs[a] + this.bonusAttrs[a];
  }

  /** Efeitos fixos que mudam quando um atributo muda */
  private attrEffects(a: Attr, n: number) {
    if (a === 'agi') this.stats.haste += ATTR_FX.agiAspd * n;
    if (a === 'des') this.stats.haste += ATTR_FX.dexAspd * n;
    if (a === 'vit') this.stats.regen += ATTR_FX.vitRegen * n;
  }

  /** Muda um atributo mantendo a vida atual proporcional ao novo HP máximo */
  private changeAttr(fn: () => void) {
    const before = this.stats.maxHp;
    fn();
    this.hp += this.stats.maxHp - before;
  }

  /** Bônus de atributo de equipamento ou carta (não gasta pontos) */
  addAttr(a: Attr, n: number) {
    this.changeAttr(() => {
      this.bonusAttrs[a] += n;
      this.attrEffects(a, n);
    });
  }

  /** Custo em pontos para subir o atributo */
  attrCostOf(a: Attr) {
    return attrCost(this.attrs[a]);
  }

  /** Gasta pontos de status para subir um atributo (o custo cresce a cada 10) */
  spendAttr(a: Attr) {
    const cost = this.attrCostOf(a);
    if (this.attrPoints < cost || this.attrs[a] >= 99) return false;
    this.attrPoints -= cost;
    this.changeAttr(() => {
      this.attrs[a]++;
      this.attrEffects(a, 1);
    });
    return true;
  }

  /** Pontos colocados no atributo desde a última confirmação */
  pendingAttr(a: Attr) {
    return this.attrs[a] - this.committedAttrs[a];
  }

  hasPendingAttrs() {
    return ATTR_IDS.some((a) => this.pendingAttr(a) > 0);
  }

  /** Tira 1 ponto ainda não confirmado do atributo (botão −) e devolve o custo */
  unspendAttr(a: Attr) {
    if (this.pendingAttr(a) <= 0) return false;
    this.changeAttr(() => {
      this.attrs[a]--;
      this.attrEffects(a, -1);
    });
    this.attrPoints += attrCost(this.attrs[a]);
    return true;
  }

  /** Confirma a distribuição (não dá mais para desfazer) */
  commitAttrs() {
    this.committedAttrs = { ...this.attrs };
    this.committedPoints = this.attrPoints;
  }

  /** Desfaz tudo o que não foi confirmado */
  revertAttrs() {
    for (const a of ATTR_IDS) while (this.unspendAttr(a));
  }

  /** Gasta vários pontos de uma vez (botão +5); devolve quantos subiu */
  spendAttrMany(a: Attr, times: number) {
    let n = 0;
    while (n < times && this.spendAttr(a)) n++;
    return n;
  }

  // ---------------------------------------------------------------- nível de classe

  gainJob(n: number) {
    if (this.jobLevel >= MAX_JOB) return;
    this.jobXp += n;
    while (this.jobXp >= jobForLevel(this.jobLevel) && this.jobLevel < MAX_JOB) {
      this.jobXp -= jobForLevel(this.jobLevel);
      this.jobLevel++;
      if (this.usesTree()) {
        // teto de pontos por classe: 12 na 1ª classe e 18 na 2ª
        if (this.classPoints < this.classPointCap()) {
          this.classPoints++;
          this.skillPoints += 1;
          this.events.emit('toast', `Nível de classe ${this.jobLevel}! +1 ponto de habilidade`, '#9fc3ff');
        }
      } else if (this.jobLevel % 2 === 0) this.levelUpSkill();
      else if (this.jobLevel % 5 === 0) this.events.emit('toast', `Nível de classe ${this.jobLevel}! (+${(this.jobLevel - 1) * 2}% de dano)`, '#9fc3ff');
    }
  }

  // ---------------------------------------------------------------- árvore de habilidades

  /** Caçador de Sombras: flechas e efeitos sombrios */
  get shadowFx() {
    return this.classId === 'cacador';
  }

  /** Textura das flechas do jogador */
  get arrowTex() {
    return this.shadowFx ? 'proj-sombra' : 'proj-flecha';
  }

  /** Teto de pontos de habilidade da classe atual */
  classPointCap() {
    return TREE_PARENT[this.classId] ? POINT_CAP_SECOND : POINT_CAP_FIRST;
  }

  /** Quantas habilidades ativas e passivas estão aprendidas (com o nível dado) */
  slotCount(level: (id: TreeId) => number) {
    let active = 0;
    let passive = 0;
    for (const n of TREE) {
      if (level(n.id) <= 0) continue;
      if (n.passive) passive++;
      else active++;
    }
    return { active, passive };
  }

  /** A classe atual usa a árvore de habilidades */
  usesTree() {
    return TREE_CLASSES.includes(this.classId);
  }

  /** Nível atual de uma habilidade da árvore (ativa ou passiva) */
  nodeLevel(id: TreeId) {
    const n = treeNode(id);
    return n.passive ? (this.passiveLv[id as PassiveId] ?? 0) : (this.skills.get(id as SkillId)?.level ?? 0);
  }

  /** A aba (classe) pode receber pontos agora? (a 1ª classe continua valendo depois da 2ª) */
  canUseTab(cls: ClassId) {
    return cls === this.classId || TREE_PARENT[this.classId] === cls;
  }

  /**
   * Por que não dá para subir a habilidade (ou null se dá).
   * `level` devolve o nível considerado (incluindo mudanças ainda não confirmadas).
   */
  learnBlock(id: TreeId, level: (id: TreeId) => number, pointsLeft: number): string | null {
    const n = treeNode(id);
    if (!this.canUseTab(n.cls)) return `Só para ${CLASSES[n.cls].name}`;
    if (level(id) >= nodeMax(n)) return 'Nível máximo';
    for (const r of n.req) if (level(r.id) < r.lv) return 'Faltam requisitos';
    // limite de build: 4 ativas e 4 passivas
    if (level(id) === 0) {
      const c = this.slotCount(level);
      if (n.passive && c.passive >= MAX_PASSIVE) return `Limite de ${MAX_PASSIVE} passivas`;
      if (!n.passive && c.active >= MAX_ACTIVE) return `Limite de ${MAX_ACTIVE} ativas`;
    }
    if (pointsLeft <= 0) return 'Sem pontos';
    return null;
  }

  /** Aplica as mudanças confirmadas na árvore (id → níveis a subir) */
  learnTree(plan: Partial<Record<TreeId, number>>) {
    let spent = 0;
    // na ordem da árvore, para os requisitos virem antes
    for (const node of TREE) {
      const n = plan[node.id] ?? 0;
      for (let i = 0; i < n; i++) {
        if (this.skillPoints <= 0 || this.learnBlock(node.id, (x) => this.nodeLevel(x), this.skillPoints)) break;
        this.skillPoints--;
        this.paidLv[node.id] = (this.paidLv[node.id] ?? 0) + 1;
        spent++;
        if (node.passive) this.addPassive(node.id as PassiveId);
        else this.addSkill(node.id as SkillId);
      }
    }
    return spent;
  }

  /** Sobe 1 nível de uma passiva e soma o bônus de um nível */
  private addPassive(id: PassiveId) {
    this.passiveLv[id] = (this.passiveLv[id] ?? 0) + 1;
    this.passiveFx(id, 1);
  }

  /** Soma (sign 1) ou tira (sign -1) o bônus de UM nível de uma passiva */
  private passiveFx(id: PassiveId, sign: 1 | -1) {
    const f = treeNode(id).passive!.fx;
    const m = this.mods;
    m.kindDmg.melee += sign * (f.melee ?? 0);
    m.kindDmg.ranged += sign * (f.ranged ?? 0);
    m.kindDmg.magic += sign * (f.magic ?? 0);
    for (const [e, v] of Object.entries(f.elem ?? {}) as [Elem, number][]) m.elemDmg[e] = (m.elemDmg[e] ?? 0) + sign * v;
    for (const [r, v] of Object.entries(f.race ?? {}) as [keyof Mods['raceDmg'], number][]) m.raceDmg[r] = (m.raceDmg[r] ?? 0) + sign * v;
    m.crit += sign * (f.crit ?? 0);
    for (const [a, v] of Object.entries(f.attrs ?? {}) as [Attr, number][]) this.addAttr(a, sign * v);
    if (f.hpPct) this.changeAttr(() => { this.hpPct += sign * f.hpPct!; });
    this.stats.regen += sign * (f.regen ?? 0);
    this.stats.haste += sign * (f.haste ?? 0);
    if (f.speedPct) this.stats.speed = sign > 0 ? this.stats.speed * (1 + f.speedPct) : this.stats.speed / (1 + f.speedPct);
    this.dmgTakenRed += sign * (f.dmgTaken ?? 0);
    this.skillFlee += sign * (f.flee ?? 0);
    this.skillHit += sign * (f.hit ?? 0);
    this.critDmg += sign * (f.critDmg ?? 0);
    this.poisonChance += sign * (f.poison ?? 0);
    this.counterChance += sign * (f.counter ?? 0);
    this.berserk += sign * (f.berserk ?? 0);
    this.recall += sign * (f.recall ?? 0);
    if (this.hp > this.stats.maxHp) this.hp = this.stats.maxHp;
  }

  /** Por que não dá para esquecer a habilidade (ou null se dá) */
  forgetBlock(id: TreeId): string | null {
    if (this.nodeLevel(id) <= 0) return 'Não aprendida';
    const dep = TREE.find((m) => this.nodeLevel(m.id) > 0 && m.req.some((r) => r.id === id));
    if (dep) return `${dep.passive?.name ?? SKILLS[dep.id as SkillId].name} depende dela`;
    return null;
  }

  /** Esquece a habilidade: libera a vaga e devolve os pontos gastos nela */
  forget(id: TreeId) {
    if (this.forgetBlock(id)) return 0;
    const n = treeNode(id);
    if (n.passive) {
      const pid = id as PassiveId;
      for (let i = this.passiveLv[pid] ?? 0; i > 0; i--) this.passiveFx(pid, -1);
      delete this.passiveLv[pid];
    } else {
      this.skills.get(id as SkillId)!.destroy();
      this.skills.delete(id as SkillId);
    }
    const refund = this.paidLv[id] ?? 0;
    this.skillPoints += refund;
    delete this.paidLv[id];
    return refund;
  }

  /** Lembrança Arcana: ao arremessar livros, chance de lançar uma magia de Mago de graça */
  onBookCast() {
    if (!this.recall || Math.random() >= this.recall) return;
    const known = (['fogo', 'gelo', 'relampago'] as SkillId[]).map((id) => this.skills.get(id)).filter((sk) => !!sk);
    if (known.length) Phaser.Utils.Array.GetRandom(known).trigger();
  }

  /** A cada 2 níveis de classe, a habilidade de menor nível sobe (a mais nova desempata) */
  private levelUpSkill() {
    const list = [...this.skills.values()].filter((sk) => sk.level < SKILLS[sk.id].maxLevel);
    if (!list.length) return;
    const minLv = Math.min(...list.map((sk) => sk.level));
    const pick = list.filter((sk) => sk.level === minLv).pop()!;
    pick.levelUp();
    this.events.emit('toast', `${SKILLS[pick.id].name} subiu para o Nv ${pick.level}!`, '#9aff8a');
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
    let gained = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      const hpBefore = this.stats.maxHp;
      this.level++;
      this.hp += this.stats.maxHp - hpBefore;
      this.xpNext = xpForLevel(this.level);
      const pts = statPointsForLevel(this.level);
      this.attrPoints += pts;
      gained += pts;
      // cada nível de base também vale meio nível de classe (mais pontos de habilidade)
      this.gainJob(Math.ceil(jobForLevel(this.jobLevel) / 2));
    }
    if (gained > 0) {
      const shops = Math.floor(this.level / SHOP_LEVEL_EVERY);
      if (shops > this.shopVisits) {
        this.shopVisits = shops;
        this.pendingShop = true;
      }
      const minis = Math.floor(this.level / MINI_LEVEL_EVERY);
      if (minis > this.miniDone + this.pendingMini) this.pendingMini = minis - this.miniDone;
      const bosses = Math.floor(this.level / BOSS_LEVEL_EVERY);
      if (bosses > this.bossDone + this.pendingBoss) this.pendingBoss = bosses - this.bossDone;
      this.events.emit('levelup', this.level, gained);
      this.fx.ring(this.player.x, this.player.y, 24, 4, 450, 0x9fe6ff, 0.5);
      this.openLevelScreens();
    }
  }

  /**
   * Ao upar: só abre tela se for a hora da escolha de classe ou da loja.
   * Os pontos de status e de habilidade ficam esperando no botão do HUD.
   * No começo da partida abre a janela de Status para os pontos iniciais.
   */
  openLevelScreens(reason: 'levelup' | 'start' = 'levelup') {
    if (this.choosing) return;
    const choice = this.classChoice();
    if (reason === 'levelup' && !choice && !this.pendingShop) return;
    this.choosing = true;
    this.scene.pause();
    if (choice) this.scene.launch('LevelUp', choice);
    else if (reason === 'start') this.scene.launch('Status', { reason });
    else this.afterScreens();
  }

  /** Tem pontos de status ou de habilidade esperando para serem distribuídos */
  pendingPoints() {
    // só conta os pontos de status se der para subir algum atributo (o custo cresce a cada 10)
    const cheapest = Math.min(...ATTR_IDS.filter((x) => this.attrs[x] < 99).map((x) => this.attrCostOf(x)));
    return { attr: this.attrPoints >= cheapest ? this.attrPoints : 0, skill: this.usesTree() ? this.skillPoints : 0 };
  }

  /**
   * Depois de uma tela de nível/classe/status: abre a loja se for a vez (a cada 10 níveis)
   * ou volta ao jogo.
   */
  afterScreens() {
    if (this.takeShopVisit()) {
      this.bankZeny();
      this.scene.launch('Shop', { inRun: true });
      return;
    }
    this.scene.resume();
    this.closeLevelScreens();
    this.events.emit('status-closed');
  }

  /** Dados da tela de escolha de classe, se o nível já permitir (senão null) */
  classChoice(): LevelUpData | null {
    const cur = CLASSES[this.classId];
    if (!cur.choices || this.level < CLASSES[cur.choices[0]].minLevel) return null;
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
      level: this.level, promotion: null, options,
      choiceTitle: first ? 'ESCOLHA SUA PROFISSÃO' : 'ESCOLHA SUA 2ª CLASSE',
      choiceSubtitle: first
        ? `Nível ${this.level}: o Aprendiz está pronto para se especializar`
        : `Nível ${this.level}: o ${cur.name} pode seguir dois caminhos`,
    };
  }

  /** Chamado quando a janela de Status (do nível ou da pausa) fecha */
  closeLevelScreens() {
    this.choosing = false;
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
    // pontos de habilidade: o teto conta de novo a cada classe
    this.classPoints = 0;
    if (TREE_PARENT[id]) {
      // 2ª classe: a árvore nova é liberada; as habilidades vêm dos pontos (sem habilidade grátis)
      // 1 ponto na hora, para já poder aprender algo da árvore nova
      this.classPoints = 1;
      this.skillPoints += 1;
      this.events.emit('toast', `Árvore de ${def.name} liberada! Abra Habilidades na janela de Status.`, '#9fc3ff');
    } else if (def.grantsSkill) {
      // 1ª classe: o Golpe de Espada do Aprendiz só continua para o Espadachim
      if (lineOf(id) !== 'espadachim' && this.skills.has('espada')) {
        this.skills.get('espada')!.destroy();
        this.skills.delete('espada');
      }
      this.addSkill(def.grantsSkill);
    }
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
    const runTotal = this.zenyRun + this.zenyBanked;
    if (this.elapsed > save.best.time) save.best.time = this.elapsed;
    if (this.level > save.best.level) save.best.level = this.level;
    writeSave(save);
    const result: RunResult = {
      time: this.elapsed,
      level: this.level,
      className: CLASSES[this.classId].name,
      kills: this.kills,
      line: this.line,
      zeny: runTotal,
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
