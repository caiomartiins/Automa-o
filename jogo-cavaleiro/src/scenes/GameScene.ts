import Phaser from 'phaser';
import { Enemy } from '../objects/Enemy';
import { Pickup } from '../objects/Pickup';
import { BOSSES, BOSS_INTERVAL, ENEMIES, MAX_ENEMY_RADIUS, hpScale, type EnemyDef } from '../data/enemies';
import { CLASSES, LINES, PROFESSION_LEVEL, type ClassDef, type ClassId, type LineId } from '../data/classes';
import { heroScale, needsShadow } from '../sprites';
import { BASE_STATS, type Stats } from '../data/stats';
import { SKILLS, type SkillId } from '../data/skills';
import { rollUpgrades, type Upgrade } from '../data/upgrades';
import type { Skill } from '../skills/Skill';
import { createSkill } from '../skills';
import { isTouch, onResize } from '../ui';
import { SpatialGrid } from '../spatialGrid';
import { Fx, FX_DEPTH } from '../fx';
import { DECOR_KEYS } from '../art';
import { Projectiles } from '../projectiles';

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
  /** true na tela de escolha de profissão */
  profession?: boolean;
}

export interface RunResult {
  time: number;
  level: number;
  className: string;
  kills: number;
  line: LineId | null;
}

export class GameScene extends Phaser.Scene {
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

    const { width, height } = this.scale;
    this.bg = this.add.tileSprite(0, 0, width, height, 'grama').setOrigin(0).setScrollFactor(0).setDepth(-1e7);
    onResize(this, () => this.bg.setSize(this.scale.width, this.scale.height));

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

    // Atalho de teste: L sobe um nível (só no modo de desenvolvimento)
    if (import.meta.env.DEV) kb.on('keydown-L', () => this.gainXp(this.xpNext - this.xp));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.skills.forEach((s) => s.destroy());
      kb.removeAllListeners('keydown-L');
    });

    this.scene.launch('UI');
  }

  update(_time: number, delta: number) {
    if (this.over) return;
    const dt = Math.min(delta, 50);
    this.elapsed += dt;
    this.frame++;
    this.sparkBudget = this.sparkMax;
    if (this.frame % 8 === 1) this.updateDecor();

    this.collectEnemies();
    this.updatePlayer(dt);
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
          const r = rnd();
          const type = r < 0.38 ? DECOR_KEYS[0] : r < 0.62 ? DECOR_KEYS[1] : r < 0.78 ? DECOR_KEYS[2] : r < 0.92 ? DECOR_KEYS[3] : DECOR_KEYS[4];
          const x = (cx + rnd()) * C;
          const y = (cy + rnd()) * C;
          const img = this.decorPool.pop() ?? this.add.image(0, 0, type);
          img.setTexture(type).setPosition(x, y).setScale(0.5).setFlipX(rnd() < 0.5).setVisible(true);
          // arbustos ficam "em pé" (o herói passa na frente ou atrás); o resto fica no chão
          img.setDepth(type === 'deco-arbusto' ? y + 8 : -200000);
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
      const step = (this.stats.speed * dt) / 1000;
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
    this.shadow.setVisible(needsShadow(tex)).setPosition(this.player.x, this.player.y + 33).setDepth(this.player.y - 1);

    if (this.elapsed < this.hurtUntil) this.player.setTintFill(0xff5555);
    else this.player.clearTint();
    this.player.setAlpha(this.elapsed < this.invulnUntil ? 0.6 + 0.4 * Math.sin(this.elapsed / 30) : 1);

    this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.regen * dt) / 1000);
  }

  private onEnemyTouch(e: Enemy) {
    if (this.over || this.elapsed < this.invulnUntil) return;
    const dmg = Math.max(1, e.def.damage - this.stats.armor);
    this.hp -= dmg;
    this.invulnUntil = this.elapsed + PLAYER_IFRAMES;
    this.hurtUntil = this.elapsed + 100;
    this.cameras.main.shake(90, 0.004);
    this.fx.number(this.player.x, this.player.y - 30, `-${dmg}`, 0xff5c5c);
    if (this.hp <= 0) this.gameOver();
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

      if (this.elapsed > e.knockUntil) {
        const d = Math.sqrt(d2) || 1;
        e.vx = (dx / d) * e.def.speed + e.sepX;
        e.vy = (dy / d) * e.def.speed + e.sepY;
      }
      e.x += e.vx * s;
      e.y += e.vy * s;
      e.setFlipX(dx < 0);
      if (sortDepth) e.setDepth(e.y);
      if (e.flashUntil && this.elapsed > e.flashUntil) {
        e.restoreTint();
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
        this.events.emit('announce', t >= 300 ? 'Uma horda e um Cavaleiro Negro se aproximam!' : 'Uma horda se aproxima!');
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
    const total = pool.reduce((s, d) => s + d.weight, 0);
    let r = Math.random() * total;
    for (const d of pool) {
      r -= d.weight;
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
    e.spawn(def, x, y, hpScale(this.elapsed / 1000));
    e.setDepth(y);
    return e;
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
  explode(x: number, y: number, radius: number, damage: number, knockback: number, color: number) {
    this.fx.ring(x, y, radius * 0.35, 2.8, 260, color, 0.55);
    this.burst(x, y, 6);
    const hits = this.queryEnemies(x, y, radius, this.nearBuf).slice();
    for (const e of hits) {
      if (e.active && (e.x - x) ** 2 + (e.y - y) ** 2 <= (radius + e.def.radius) ** 2) {
        this.damageEnemy(e, damage, knockback, x, y);
      }
    }
  }

  /** Aplica dano a um inimigo (usado por todas as habilidades) */
  damageEnemy(e: Enemy, amount: number, knockback: number, fromX: number, fromY: number) {
    if (!e.active) return;
    const dmg = Math.max(1, Math.round(amount * Phaser.Math.FloatBetween(0.9, 1.1)));
    e.hp -= dmg;
    e.setTintFill(0xffffff);
    e.flashUntil = this.elapsed + 70;
    this.fx.number(e.x, e.y - 20, `${dmg}`, 0xffffff);
    this.burst(e.x, e.y, 2);

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

  private killEnemy(e: Enemy) {
    const { x, y } = e;
    const def = e.def;
    e.kill();
    this.kills++;
    this.fx.ring(x, y, def.radius, 1.8, 200, 0xffffff, 0.5);
    this.burst(x, y, def.elite || def.boss ? 12 : 4);
    if (def.boss) {
      // chefe derrotado: chuva de gemas e comida
      if (this.boss === e) this.boss = null;
      this.cameras.main.flash(300, 255, 240, 200);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        this.dropPickup('xp', Math.ceil(def.xp / 8), x + Math.cos(a) * 40, y + Math.sin(a) * 40);
      }
      this.dropPickup('comida', 60, x, y);
      this.events.emit('announce', `${def.name} foi derrotado!`);
      return;
    }
    this.dropPickup('xp', def.xp, x, y);
    if (Math.random() < (def.elite ? 1 : 0.012)) this.dropPickup('comida', 30, x + 12, y);
  }

  // ---------------------------------------------------------------- itens e XP

  private dropPickup(kind: 'xp' | 'comida', value: number, x: number, y: number) {
    const p = this.pickups.get(x, y) as Pickup | null;
    if (!p) {
      if (kind === 'xp') this.gainXp(value);
      return;
    }
    p.place(kind, value, x, y);
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
        if (p.kind === 'xp') this.gainXp(p.value);
        else {
          this.hp = Math.min(this.stats.maxHp, this.hp + p.value);
          this.fx.number(px, py - 30, `+${p.value}`, 0x7dff6b);
        }
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

    // Aprendiz no nível 5: escolhe a profissão
    const cur = CLASSES[this.classId];
    if (cur.choices && this.resolvedLevel >= PROFESSION_LEVEL) {
      const options: Upgrade[] = cur.choices.map((id) => {
        const def = CLASSES[id];
        const line = Object.values(LINES).find((l) => l.classes[0] === id)!;
        return {
          id: `classe-${id}`,
          title: def.name,
          desc: def.description,
          color: line.color,
          icon: def.texture,
          apply: (g: GameScene) => g.chooseProfession(id),
        };
      });
      return { level: this.resolvedLevel, promotion: null, options, profession: true };
    }

    let promotion: ClassDef | null = null;
    const next = cur.next;
    if (next && this.resolvedLevel >= CLASSES[next].minLevel) {
      this.promote(next);
      promotion = CLASSES[next];
    }
    return { level: this.resolvedLevel, promotion, options: rollUpgrades(this, 3) };
  }

  // ---------------------------------------------------------------- classes e habilidades

  /** Chamado ao escolher a profissão no nível 5 */
  chooseProfession(id: ClassId) {
    this.line = (Object.values(LINES).find((l) => l.classes.includes(id))?.id ?? null);
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
    const result: RunResult = {
      time: this.elapsed,
      level: this.level,
      className: CLASSES[this.classId].name,
      kills: this.kills,
      line: this.line,
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
