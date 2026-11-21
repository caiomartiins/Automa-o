import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { SKILLS } from './skills';

export interface Upgrade {
  id: string;
  title: string;
  desc: string;
  color: number;
  apply: (g: GameScene) => void;
}

interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  color: number;
  apply: (g: GameScene) => void;
}

export const PASSIVES: PassiveDef[] = [
  { id: 'forca', name: 'Força', desc: '+10% de dano', max: 5, color: 0xff6b6b, apply: (g) => (g.stats.might += 0.1) },
  { id: 'agilidade', name: 'Agilidade', desc: 'Ataques 8% mais rápidos', max: 5, color: 0x6bffb0, apply: (g) => (g.stats.haste += 0.08) },
  { id: 'alcance', name: 'Alcance', desc: '+10% de área das habilidades', max: 5, color: 0xc78bff, apply: (g) => (g.stats.area += 0.1) },
  {
    id: 'vitalidade', name: 'Vitalidade', desc: '+20 de vida máxima', max: 5, color: 0xff4d6d,
    apply: (g) => { g.stats.maxHp += 20; g.hp += 20; },
  },
  { id: 'regeneracao', name: 'Regeneração', desc: '+0,4 de vida por segundo', max: 5, color: 0x7dff6b, apply: (g) => (g.stats.regen += 0.4) },
  { id: 'botas', name: 'Botas Leves', desc: '+16 de velocidade', max: 5, color: 0xffc46b, apply: (g) => (g.stats.speed += 16) },
  { id: 'ima', name: 'Ímã', desc: '+35% de raio de coleta', max: 3, color: 0x6bd5ff, apply: (g) => (g.stats.magnet *= 1.35) },
  { id: 'armadura', name: 'Armadura', desc: '+1 de armadura', max: 5, color: 0xb0b8c8, apply: (g) => (g.stats.armor += 1) },
];

/** Sorteia `n` opções de melhoria disponíveis para o jogador */
export function rollUpgrades(g: GameScene, n: number): Upgrade[] {
  const skillOptions: Upgrade[] = [];
  for (const skill of g.skills.values()) {
    const def = SKILLS[skill.id];
    if (skill.level >= def.maxLevel) continue;
    skillOptions.push({
      id: `skill-${def.id}`,
      title: `${def.name} Nv ${skill.level + 1}`,
      desc: def.levelDesc[skill.level],
      color: def.color,
      apply: () => skill.levelUp(),
    });
  }

  const passiveOptions: Upgrade[] = [];
  for (const p of PASSIVES) {
    const lv = g.passives[p.id] ?? 0;
    if (lv >= p.max) continue;
    passiveOptions.push({
      id: `passive-${p.id}`,
      title: `${p.name} ${lv + 1}/${p.max}`,
      desc: p.desc,
      color: p.color,
      apply: (game) => {
        game.passives[p.id] = lv + 1;
        p.apply(game);
      },
    });
  }

  // Garante pelo menos uma melhoria de habilidade quando houver, para a build evoluir
  const picks: Upgrade[] = [];
  Phaser.Utils.Array.Shuffle(skillOptions);
  if (skillOptions.length) picks.push(skillOptions.shift()!);
  const rest = Phaser.Utils.Array.Shuffle([...skillOptions, ...passiveOptions]);
  while (picks.length < n && rest.length) picks.push(rest.shift()!);

  if (picks.length === 0) {
    picks.push({
      id: 'pocao',
      title: 'Poção de Vida',
      desc: 'Recupera 40 de vida.',
      color: 0xff4d6d,
      apply: (game) => (game.hp = Math.min(game.stats.maxHp, game.hp + 40)),
    });
  }
  return picks;
}
