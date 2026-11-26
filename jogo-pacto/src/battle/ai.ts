import { BUFFS, elementEdge } from '../data/types';
import type { Battle, BUnit } from './engine';

export interface Choice { skill: number; target: BUnit }

/** Escolhe habilidade e alvo (usado pelos inimigos e pelo modo automático) */
export function chooseAction(b: Battle, u: BUnit, rng: () => number = Math.random): Choice {
  const foes = b.foesOf(u);
  const friends = b.friendsOf(u);
  let best: Choice = { skill: 0, target: u.taunter ?? foes[0] };
  let bestScore = -Infinity;

  for (let i = 0; i < 3; i++) {
    if (!b.usable(u, i)) continue;
    const sk = u.def.skills[i];
    const effects = sk.effects ?? [];
    const candidates = b.validTargets(u, i);
    if (!candidates.length) continue;

    // valor de um golpe em um alvo
    const hitValue = (t: BUnit) => {
      let v = 0;
      if (sk.mult) {
        const est = b.estimate(u, sk, t) * (sk.hits ?? 1);
        v += Math.min(est, t.hp) / t.max.hp;
        if (est >= t.hp) v += 0.6;
      }
      for (const fx of effects) {
        if (fx.to !== 'target' || BUFFS.includes(fx.kind)) continue;
        if (t.has(fx.kind) && fx.kind !== 'burn') continue;
        const w = fx.kind === 'stun' ? 0.5 : fx.kind === 'defDown' || fx.kind === 'atkDown' ? 0.22 : 0.14;
        v += w * fx.chance;
      }
      if (sk.gauge && sk.gauge < 0) v += (Math.min(t.gauge, -sk.gauge) / 100) * 0.5;
      if (sk.strip && t.effects.some((e) => BUFFS.includes(e.kind))) v += 0.2;
      v *= 1 + 0.25 * elementEdge(u.element, t.element);
      return v;
    };

    // valor de apoio ao time
    let support = 0;
    if (sk.heal) {
      for (const f of friends) support += (Math.min(f.max.hp * sk.heal, f.max.hp - f.hp) / f.max.hp) * 1.6;
      if (support < 0.15) support -= 0.3;
    }
    if (sk.cleanse) support += friends.reduce((a, f) => a + f.effects.filter((e) => !BUFFS.includes(e.kind)).length * 0.15, 0);
    for (const fx of effects) {
      if (!BUFFS.includes(fx.kind)) continue;
      const who = fx.to === 'self' ? [u] : fx.to === 'allies' ? friends : [];
      const lacking = who.filter((f) => !f.has(fx.kind)).length;
      support += (lacking / Math.max(1, friends.length)) * (fx.kind === 'shield' || fx.kind === 'imune' ? 0.35 : 0.28);
    }
    if (sk.allyGauge) support += 0.25;
    if (sk.target === 'self' && sk.gauge) support += 0.15;
    if (effects.some((e) => e.kind === 'taunt' && sk.target === 'allEnemies')) support += 0.2;

    if (sk.target === 'enemy') {
      for (const t of candidates) {
        const s = hitValue(t) + support + (i > 0 ? 0.08 : 0) + rng() * 0.08;
        if (s > bestScore) { bestScore = s; best = { skill: i, target: t }; }
      }
    } else if (sk.target === 'allEnemies') {
      const s = candidates.reduce((a, t) => a + hitValue(t), 0) + support + 0.08 + rng() * 0.08;
      if (s > bestScore) { bestScore = s; best = { skill: i, target: candidates[0] }; }
    } else if (sk.target === 'randomEnemies') {
      const avg = candidates.reduce((a, t) => a + hitValue(t), 0) / candidates.length;
      const s = avg * Math.min(sk.hits ?? 1, 4) * 0.8 + support + 0.08 + rng() * 0.08;
      if (s > bestScore) { bestScore = s; best = { skill: i, target: candidates[0] }; }
    } else {
      const weakest = [...candidates].sort((a, c) => a.hp / a.max.hp - c.hp / c.max.hp)[0];
      const s = support + rng() * 0.05;
      if (s > bestScore) { bestScore = s; best = { skill: i, target: weakest }; }
    }
  }
  return best;
}
