import { BOSS_HP, type EnemySpec } from '../data/stages';
import { BUFFS, elementEdge, type EffectKind, type Element, type SkillDef, type Stats } from '../data/types';
import { UNIT_BY_ID, statsAt, type UnitDef } from '../data/units';

export type Side = 'ally' | 'enemy';

export interface Effect {
  kind: EffectKind;
  turns: number;
  /** Quem provocou (provocar) */
  src?: BUnit;
  /** Escudo restante */
  value?: number;
  /** Aplicado no próprio turno do alvo: não conta este turno */
  fresh?: boolean;
}

let nextUid = 1;

export class BUnit {
  readonly uid = nextUid++;
  hp: number;
  gauge = 0;
  cds = [0, 0, 0];
  effects: Effect[] = [];
  alive = true;
  readonly max: Stats;

  constructor(
    readonly def: UnitDef,
    readonly lv: number,
    readonly side: Side,
    readonly slot: number,
    readonly boss = false,
    /** Identificador do monstro no save (só aliados) */
    readonly key?: string,
  ) {
    const s = statsAt(def, lv);
    if (boss) {
      s.hp = Math.round(s.hp * BOSS_HP);
      s.atk = Math.round(s.atk * 1.1);
    }
    this.max = s;
    this.hp = s.hp;
  }

  get element(): Element { return this.def.element; }
  has(k: EffectKind) { return this.effects.some((e) => e.kind === k); }
  get atk() { return this.max.atk * (this.has('atkUp') ? 1.5 : 1) * (this.has('atkDown') ? 0.6 : 1); }
  get defv() { return this.max.def * (this.has('defUp') ? 1.7 : 1) * (this.has('defDown') ? 0.4 : 1); }
  get spd() { return this.max.spd * (this.has('spdUp') ? 1.3 : 1) * (this.has('slow') ? 0.7 : 1); }
  get shield() { return this.effects.filter((e) => e.kind === 'shield').reduce((a, e) => a + (e.value ?? 0), 0); }
  get taunter(): BUnit | undefined {
    const t = this.effects.find((e) => e.kind === 'taunt');
    return t?.src?.alive ? t.src : undefined;
  }
}

export type Ev =
  | { k: 'use'; u: BUnit; skill: SkillDef; targets: BUnit[] }
  | { k: 'hit'; u: BUnit; src: BUnit; dmg: number; crit: boolean; edge: -1 | 0 | 1; absorbed: number; hp: number }
  | { k: 'dot'; u: BUnit; dmg: number; hp: number }
  | { k: 'heal'; u: BUnit; amount: number; hp: number }
  | { k: 'eff'; u: BUnit; kind: EffectKind }
  | { k: 'resist'; u: BUnit }
  | { k: 'immune'; u: BUnit }
  | { k: 'remove'; u: BUnit; kinds: EffectKind[] }
  | { k: 'gauge'; u: BUnit; delta: number }
  | { k: 'stunned'; u: BUnit }
  | { k: 'extra'; u: BUnit }
  | { k: 'die'; u: BUnit }
  | { k: 'eco'; element: Element };

export interface TeamMember { def: UnitDef; lv: number; key?: string }

/** Velocidade de enchimento da barra de turno por ponto de velocidade */
const GAUGE_RATE = 0.07;
/** Eco: quanto enche por turno aliado e por golpe recebido */
const ECO_PER_TURN = 9;
const ECO_PER_HIT = 3;

export const ECO_INFO: Record<Element, { name: string; desc: string }> = {
  fogo: { name: 'Erupção', desc: 'Dano 2,0× do ataque do líder em todos os inimigos e Queimadura por 2 turnos.' },
  agua: { name: 'Maré Curativa', desc: 'Cura 30% da vida de todos os aliados e remove os efeitos negativos.' },
  vento: { name: 'Vendaval', desc: 'Aliados ganham 35% de barra de turno e inimigos perdem 35%.' },
  luz: { name: 'Aurora', desc: 'Escudo de 25% da vida em cada aliado por 2 turnos e remove os efeitos negativos.' },
  sombra: { name: 'Eclipse', desc: 'Quebra a defesa e reduz o ataque de todos os inimigos por 2 turnos (não pode ser resistido).' },
};

export class Battle {
  allies: BUnit[];
  enemies: BUnit[] = [];
  wave = 0;
  eco = 0;
  current?: BUnit;
  turns = 0;
  /** Aliados que caíram em algum momento (para as estrelas da fase) */
  fallen = new Set<number>();

  constructor(team: TeamMember[], readonly waves: EnemySpec[][], readonly rng: () => number = Math.random) {
    this.allies = team.map((m, i) => new BUnit(m.def, m.lv, 'ally', i, false, m.key));
    this.loadWave(0);
  }

  get leader() { return this.allies[0]; }

  loadWave(i: number) {
    this.wave = i;
    this.enemies = this.waves[i].map((s, slot) => new BUnit(UNIT_BY_ID[s.id], s.lv, 'enemy', slot, !!s.boss));
    for (const u of this.allies) u.gauge = 0;
    // pequena vantagem aleatória para não começar sempre igual
    for (const u of this.living()) u.gauge = this.rng() * 8;
  }

  sideOf(side: Side) { return side === 'ally' ? this.allies : this.enemies; }
  foesOf(u: BUnit) { return (u.side === 'ally' ? this.enemies : this.allies).filter((x) => x.alive); }
  friendsOf(u: BUnit) { return (u.side === 'ally' ? this.allies : this.enemies).filter((x) => x.alive); }
  living() { return [...this.allies, ...this.enemies].filter((u) => u.alive); }

  /** 'win' = todas as ondas vencidas, 'wave' = onda vencida, 'lose' = time derrotado */
  status(): 'win' | 'wave' | 'lose' | null {
    if (!this.allies.some((u) => u.alive)) return 'lose';
    if (!this.enemies.some((u) => u.alive)) return this.wave >= this.waves.length - 1 ? 'win' : 'wave';
    return null;
  }

  /** Avança as barras de turno até alguém chegar a 100 */
  private advance(units: { u: BUnit; g: number; spd: number }[]) {
    let best = units[0];
    let bestT = Infinity;
    for (const x of units) {
      const t = Math.max(0, (100 - x.g) / (x.spd * GAUGE_RATE));
      if (t < bestT - 1e-9 || (Math.abs(t - bestT) < 1e-9 && (x.g > best.g || (x.g === best.g && x.spd > best.spd)))) {
        best = x;
        bestT = t;
      }
    }
    for (const x of units) x.g += x.spd * GAUGE_RATE * bestT;
    best.g = 0;
    return best.u;
  }

  /** Próximos `n` a agir (sem contar efeitos que ainda vão acontecer) */
  preview(n: number): BUnit[] {
    const sim = this.living().map((u) => ({ u, g: u.gauge, spd: u.spd }));
    const out: BUnit[] = [];
    for (let i = 0; i < n && sim.length; i++) out.push(this.advance(sim));
    return out;
  }

  /** Escolhe quem age, aplica queimadura/regeneração e diz se perdeu o turno */
  startTurn(): { actor: BUnit; events: Ev[]; skip: boolean } {
    const sim = this.living().map((u) => ({ u, g: u.gauge, spd: u.spd }));
    const actor = this.advance(sim);
    for (const x of sim) x.u.gauge = Math.min(100, x.g);
    actor.gauge = 0;
    this.current = actor;
    this.turns++;
    const events: Ev[] = [];
    for (const e of actor.effects.filter((x) => x.kind === 'burn')) {
      void e;
      const dmg = Math.round(actor.max.hp * (actor.boss ? 0.02 : 0.05));
      actor.hp = Math.max(0, actor.hp - dmg);
      events.push({ k: 'dot', u: actor, dmg, hp: actor.hp });
      if (actor.hp <= 0) {
        this.kill(actor, events);
        return { actor, events, skip: true };
      }
    }
    if (actor.has('regen')) {
      const amount = Math.min(actor.max.hp - actor.hp, Math.round(actor.max.hp * 0.12));
      actor.hp += amount;
      events.push({ k: 'heal', u: actor, amount, hp: actor.hp });
    }
    if (actor.has('stun')) {
      events.push({ k: 'stunned', u: actor });
      return { actor, events, skip: true };
    }
    return { actor, events, skip: false };
  }

  /** Fim do turno: recargas e duração dos efeitos */
  endTurn(actor: BUnit): Ev[] {
    const events: Ev[] = [];
    actor.cds = actor.cds.map((c) => Math.max(0, c - 1));
    if (!actor.alive) return events;
    const gone: EffectKind[] = [];
    for (const e of actor.effects) {
      if (e.fresh) e.fresh = false;
      else e.turns--;
    }
    actor.effects = actor.effects.filter((e) => {
      if (e.turns > 0 && !(e.kind === 'shield' && (e.value ?? 0) <= 0)) return true;
      if (!gone.includes(e.kind)) gone.push(e.kind);
      return false;
    });
    // efeitos que ainda continuam com outra cópia não "somem" da tela
    const still = gone.filter((k) => !actor.has(k));
    if (still.length) events.push({ k: 'remove', u: actor, kinds: still });
    if (actor.side === 'ally') this.eco = Math.min(100, this.eco + ECO_PER_TURN);
    return events;
  }

  /** Habilidade pode ser usada agora? */
  usable(u: BUnit, i: number) {
    if (u.cds[i] > 0) return false;
    if (i > 0 && (u.has('silence') || u.taunter)) return false;
    return true;
  }

  /** Alvos que o jogador pode tocar para essa habilidade */
  validTargets(u: BUnit, i: number): BUnit[] {
    const sk = u.def.skills[i];
    const taunt = u.taunter;
    if (sk.target === 'enemy' && taunt) return [taunt];
    switch (sk.target) {
      case 'enemy': case 'allEnemies': case 'randomEnemies': return this.foesOf(u);
      case 'ally': case 'allAllies': return this.friendsOf(u);
      case 'self': return [u];
    }
  }

  /** Estimativa de dano (sem sorte) usada pela IA */
  estimate(src: BUnit, sk: SkillDef, tgt: BUnit) {
    if (!sk.mult) return 0;
    const edge = elementEdge(src.element, tgt.element);
    const base = this.scaleStat(src, sk) * sk.mult;
    const cc = Math.min(1, Math.max(0, src.max.crate + (src.has('critUp') ? 0.3 : 0) + edge * 0.15));
    return base * (1 + cc * src.max.cdmg) * (edge === 1 ? 1.3 : edge === -1 ? 0.8 : 1) * this.reduction(tgt.defv * (1 - (sk.pierce ?? 0)));
  }

  private scaleStat(src: BUnit, sk: SkillDef) {
    const atkBonus = src.atk / src.max.atk;
    // chefes têm vida extra, mas o golpe usa a vida normal
    if (sk.scale === 'hp') return (src.boss ? src.max.hp / BOSS_HP : src.max.hp) * atkBonus;
    if (sk.scale === 'def') return src.defv * atkBonus;
    return src.atk;
  }

  private reduction(def: number) { return 1000 / (1000 + def * 3.5); }

  private kill(u: BUnit, ev: Ev[]) {
    u.alive = false;
    u.hp = 0;
    u.effects = [];
    u.gauge = 0;
    if (u.side === 'ally') this.fallen.add(u.uid);
    ev.push({ k: 'die', u });
  }

  private damage(src: BUnit, tgt: BUnit, sk: SkillDef, ev: Ev[], flat?: number) {
    const edge = elementEdge(src.element, tgt.element);
    const cc = src.max.crate + (src.has('critUp') ? 0.3 : 0) + edge * 0.15;
    const crit = this.rng() < cc;
    const base = flat ?? this.scaleStat(src, sk) * (sk.mult ?? 0);
    let dmg = base * (crit ? 1 + src.max.cdmg : 1) * (edge === 1 ? 1.3 : edge === -1 ? 0.8 : 1);
    dmg *= this.reduction(tgt.defv * (1 - (sk.pierce ?? 0))) * (0.95 + this.rng() * 0.1);
    dmg = Math.max(1, Math.round(dmg));
    // o escudo absorve primeiro
    let absorbed = 0;
    for (const e of tgt.effects) {
      if (e.kind !== 'shield' || !e.value) continue;
      const a = Math.min(e.value, dmg - absorbed);
      e.value -= a;
      absorbed += a;
    }
    const lost = dmg - absorbed;
    tgt.hp = Math.max(0, tgt.hp - lost);
    ev.push({ k: 'hit', u: tgt, src, dmg, crit, edge, absorbed, hp: tgt.hp });
    if (tgt.side === 'ally') this.eco = Math.min(100, this.eco + ECO_PER_HIT);
    if (sk.drain && src.alive) this.heal(src, Math.round(lost * sk.drain), ev);
    if (tgt.hp <= 0) this.kill(tgt, ev);
    return lost;
  }

  private heal(u: BUnit, amount: number, ev: Ev[]) {
    if (!u.alive) return;
    const a = Math.min(amount, u.max.hp - u.hp);
    u.hp += a;
    ev.push({ k: 'heal', u, amount: a, hp: u.hp });
  }

  /** Aplica um efeito; negativos passam por chance, imunidade e resistência */
  applyEffect(src: BUnit, tgt: BUnit, kind: EffectKind, turns: number, chance: number, ev: Ev[], opts: { value?: number; sure?: boolean } = {}) {
    if (!tgt.alive) return;
    const buff = BUFFS.includes(kind);
    if (!buff) {
      if (this.rng() >= chance) return;
      if (tgt.has('imune')) { ev.push({ k: 'immune', u: tgt }); return; }
      if (tgt.boss && kind === 'stun') { ev.push({ k: 'resist', u: tgt }); return; }
      if (!opts.sure) {
        const resist = Math.max(0.15, tgt.max.res - src.max.acc);
        if (this.rng() < resist) { ev.push({ k: 'resist', u: tgt }); return; }
      }
    }
    const fresh = tgt === this.current;
    if (kind === 'burn') {
      if (tgt.effects.filter((e) => e.kind === 'burn').length < 3) tgt.effects.push({ kind, turns, fresh });
    } else {
      const old = tgt.effects.find((e) => e.kind === kind);
      if (old) {
        old.turns = Math.max(old.turns, turns);
        old.fresh = old.fresh || fresh;
        if (kind === 'shield') old.value = Math.max(old.value ?? 0, opts.value ?? 0);
        if (kind === 'taunt') old.src = src;
      } else {
        tgt.effects.push({ kind, turns, fresh, src: kind === 'taunt' ? src : undefined, value: opts.value });
      }
    }
    ev.push({ k: 'eff', u: tgt, kind });
  }

  private changeGauge(u: BUnit, delta: number, ev: Ev[]) {
    if (!u.alive || !delta) return;
    const before = u.gauge;
    u.gauge = Math.max(0, Math.min(100, u.gauge + delta));
    if (u.gauge !== before) ev.push({ k: 'gauge', u, delta: u.gauge - before });
  }

  /** Executa a habilidade `i` de `actor` mirando `target` */
  act(actor: BUnit, i: number, target?: BUnit): Ev[] {
    const sk = actor.def.skills[i];
    const ev: Ev[] = [];
    const foes = this.foesOf(actor);
    const friends = this.friendsOf(actor);
    let targets: BUnit[];
    switch (sk.target) {
      case 'enemy': targets = [actor.taunter ?? (target && target.alive && target.side !== actor.side ? target : foes[0])]; break;
      case 'allEnemies': case 'randomEnemies': targets = foes; break;
      case 'ally': targets = [target && target.alive && target.side === actor.side ? target : friends[0]]; break;
      case 'allAllies': targets = friends; break;
      case 'self': targets = [actor]; break;
    }
    actor.cds[i] = sk.cooldown;
    ev.push({ k: 'use', u: actor, skill: sk, targets });
    const hostile = sk.target === 'enemy' || sk.target === 'allEnemies' || sk.target === 'randomEnemies';
    let killed = false;

    // dano e efeitos nos alvos
    const hits = sk.hits ?? 1;
    const strike = (t: BUnit) => {
      if (!t.alive) return;
      if (sk.mult) {
        this.damage(actor, t, sk, ev);
        if (!t.alive) { killed = true; return; }
      }
      for (const fx of sk.effects ?? []) {
        if (fx.to === 'target') this.applyEffect(actor, t, fx.kind, fx.turns, fx.chance, ev, { value: fx.value ? Math.round(actor.max.hp * fx.value) : undefined });
      }
    };
    if (sk.target === 'randomEnemies') {
      for (let h = 0; h < hits; h++) {
        const alive = this.foesOf(actor);
        if (!alive.length) break;
        strike(alive[Math.floor(this.rng() * alive.length)]);
      }
    } else if (hostile) {
      for (const t of targets) for (let h = 0; h < hits; h++) strike(t);
    }

    // apoio
    for (const t of targets) {
      if (!t.alive) continue;
      if (sk.heal) this.heal(t, Math.round(t.max.hp * sk.heal), ev);
      if (sk.cleanse) {
        const kinds = t.effects.filter((e) => !BUFFS.includes(e.kind)).map((e) => e.kind);
        if (kinds.length) {
          t.effects = t.effects.filter((e) => BUFFS.includes(e.kind));
          ev.push({ k: 'remove', u: t, kinds });
        }
      }
      if (sk.strip && hostile) {
        const idx = t.effects.map((e) => BUFFS.includes(e.kind)).lastIndexOf(true);
        if (idx >= 0) {
          const [gone] = t.effects.splice(idx, 1);
          ev.push({ k: 'remove', u: t, kinds: [gone.kind] });
        }
      }
      if (sk.gauge) this.changeGauge(t, sk.gauge, ev);
    }
    for (const fx of sk.effects ?? []) {
      const value = fx.value ? Math.round(actor.max.hp * fx.value) : undefined;
      if (fx.to === 'self') this.applyEffect(actor, actor, fx.kind, fx.turns, fx.chance, ev, { value });
      if (fx.to === 'allies') for (const f of this.friendsOf(actor)) this.applyEffect(actor, f, fx.kind, fx.turns, fx.chance, ev, { value });
      if (fx.to === 'target' && !hostile) for (const t of targets) this.applyEffect(actor, t, fx.kind, fx.turns, fx.chance, ev, { value });
    }
    if (sk.allyGauge) for (const f of this.friendsOf(actor)) if (f !== actor) this.changeGauge(f, sk.allyGauge, ev);
    if (sk.selfGauge) this.changeGauge(actor, sk.selfGauge, ev);
    if (sk.extraOnKill && killed && actor.alive && this.foesOf(actor).length) {
      actor.gauge = 100;
      ev.push({ k: 'extra', u: actor });
    }
    return ev;
  }

  /** Usa o Eco do time (não gasta o turno) */
  useEco(): Ev[] {
    const ev: Ev[] = [];
    if (this.eco < 100) return ev;
    this.eco = 0;
    const leader = this.allies.find((u) => u.alive) ?? this.leader;
    const el = this.leader.element;
    ev.push({ k: 'eco', element: el });
    const foes = this.enemies.filter((u) => u.alive);
    const allies = this.allies.filter((u) => u.alive);
    const fake: SkillDef = { name: 'Eco', desc: '', cooldown: 0, target: 'allEnemies', mult: 2, anim: 'cast' };
    switch (el) {
      case 'fogo':
        for (const t of foes) {
          this.damage(leader, t, fake, ev, leader.atk * 2);
          if (t.alive) this.applyEffect(leader, t, 'burn', 2, 1, ev);
        }
        break;
      case 'agua':
        for (const a of allies) {
          this.heal(a, Math.round(a.max.hp * 0.3), ev);
          const kinds = a.effects.filter((e) => !BUFFS.includes(e.kind)).map((e) => e.kind);
          if (kinds.length) { a.effects = a.effects.filter((e) => BUFFS.includes(e.kind)); ev.push({ k: 'remove', u: a, kinds }); }
        }
        break;
      case 'vento':
        for (const a of allies) this.changeGauge(a, 35, ev);
        for (const t of foes) this.changeGauge(t, -35, ev);
        break;
      case 'luz':
        for (const a of allies) {
          const kinds = a.effects.filter((e) => !BUFFS.includes(e.kind)).map((e) => e.kind);
          if (kinds.length) { a.effects = a.effects.filter((e) => BUFFS.includes(e.kind)); ev.push({ k: 'remove', u: a, kinds }); }
          this.applyEffect(leader, a, 'shield', 2, 1, ev, { value: Math.round(a.max.hp * 0.25) });
        }
        break;
      case 'sombra':
        for (const t of foes) {
          this.applyEffect(leader, t, 'defDown', 2, 1, ev, { sure: true });
          this.applyEffect(leader, t, 'atkDown', 2, 1, ev, { sure: true });
        }
        break;
    }
    return ev;
  }
}
