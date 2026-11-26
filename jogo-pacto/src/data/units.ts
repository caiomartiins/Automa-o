import type { Element, Role, SkillDef, Stats } from './types';

export interface UnitDef {
  id: string;
  name: string;
  /** Apelido curto que aparece na batalha */
  title: string;
  element: Element;
  role: Role;
  stars: 2 | 3 | 4 | 5;
  /** Chave da arte em sprites.ts */
  art: string;
  /** Atributos no nível 1 */
  base: Stats;
  skills: [SkillDef, SkillDef, SkillDef];
}

/** Atributos padrão por raridade; cada monstro ajusta os seus */
function stats(stars: number, o: Partial<Stats>): Stats {
  const k = 1 + (stars - 2) * 0.11;
  return {
    hp: Math.round(950 * k), atk: Math.round(88 * k), def: Math.round(72 * k), spd: 100,
    crate: 0.15, cdmg: 0.5, acc: 0, res: 0.15, ...o,
  };
}

export const UNITS: UnitDef[] = [
  // ───────────── 2 estrelas ─────────────
  {
    id: 'gosma', name: 'Gosma Rosada', title: 'Gosma', element: 'agua', role: 'Suporte', stars: 2, art: 'gosma',
    base: stats(2, { hp: 1050, atk: 74, def: 70, spd: 103, res: 0.25 }),
    skills: [
      { name: 'Pulo Grudento', desc: 'Pula no alvo (dano 3,0×) e tem 30% de chance de deixá-lo Lento por 2 turnos.', cooldown: 0, target: 'enemy', mult: 3.0, anim: 'melee', fx: 'gelo',
        effects: [{ kind: 'slow', turns: 2, chance: 0.3, to: 'target' }] },
      { name: 'Gota Curativa', desc: 'Cura 22% da vida de todos os aliados.', cooldown: 3, target: 'allAllies', heal: 0.22, anim: 'cast', fx: 'cura' },
      { name: 'Membrana Elástica', desc: 'Dá um escudo de 18% da vida da Gosma a todos os aliados por 2 turnos.', cooldown: 4, target: 'allAllies', anim: 'cast', fx: 'gelo',
        effects: [{ kind: 'shield', turns: 2, chance: 1, to: 'allies', value: 0.18 }] },
    ],
  },
  {
    id: 'lobo', name: 'Lobo Cinzento', title: 'Lobo', element: 'vento', role: 'Ataque', stars: 2, art: 'lobo',
    base: stats(2, { hp: 880, atk: 96, def: 62, spd: 112, crate: 0.25 }),
    skills: [
      { name: 'Mordida', desc: 'Morde o alvo (dano 3,2×).', cooldown: 0, target: 'enemy', mult: 3.2, anim: 'melee', fx: 'corte' },
      { name: 'Uivo da Matilha', desc: 'Aumenta o ataque e a velocidade de todos os aliados por 2 turnos.', cooldown: 4, target: 'allAllies', anim: 'cast', fx: 'vento',
        effects: [{ kind: 'atkUp', turns: 2, chance: 1, to: 'allies' }, { kind: 'spdUp', turns: 2, chance: 1, to: 'allies' }] },
      { name: 'Caçada', desc: 'Ataca 2 vezes (2,4× cada). Se derrotar o alvo, ganha um turno extra.', cooldown: 3, target: 'enemy', mult: 2.4, hits: 2, extraOnKill: true, anim: 'melee', fx: 'corte' },
    ],
  },
  {
    id: 'esqueleto', name: 'Esqueleto Guerreiro', title: 'Esqueleto', element: 'sombra', role: 'Ataque', stars: 2, art: 'esqueleto',
    base: stats(2, { hp: 900, atk: 94, def: 68, spd: 101 }),
    skills: [
      { name: 'Corte Ósseo', desc: 'Corta o alvo (dano 3,1×) com 25% de chance de Quebrar a Defesa por 2 turnos.', cooldown: 0, target: 'enemy', mult: 3.1, anim: 'melee', fx: 'corte',
        effects: [{ kind: 'defDown', turns: 2, chance: 0.25, to: 'target' }] },
      { name: 'Lâmina Enferrujada', desc: 'Golpe pesado (dano 4,2×) que deixa o alvo Queimando por 2 turnos (60%).', cooldown: 3, target: 'enemy', mult: 4.2, anim: 'melee', fx: 'veneno',
        effects: [{ kind: 'burn', turns: 2, chance: 0.6, to: 'target' }] },
      { name: 'Dança Macabra', desc: 'Gira as lâminas e atinge todos os inimigos (dano 2,3×).', cooldown: 4, target: 'allEnemies', mult: 2.3, anim: 'melee', fx: 'corte' },
    ],
  },
  // ───────────── 3 estrelas ─────────────
  {
    id: 'ent', name: 'Ent Ancião', title: 'Ent', element: 'agua', role: 'Defesa', stars: 3, art: 'arvore',
    base: stats(3, { hp: 1200, atk: 78, def: 112, spd: 92, res: 0.35 }),
    skills: [
      { name: 'Galhada', desc: 'Golpe com o galho baseado na DEFESA (dano 3,4×).', cooldown: 0, target: 'enemy', mult: 3.4, scale: 'def', anim: 'melee', fx: 'corte' },
      { name: 'Raízes Presas', desc: 'Provoca o alvo por 1 turno e reduz a barra de turno dele em 30% (dano 2,6× pela DEFESA).', cooldown: 3, target: 'enemy', mult: 2.6, scale: 'def', gauge: -30, anim: 'cast', fx: 'veneno',
        effects: [{ kind: 'taunt', turns: 1, chance: 0.8, to: 'target' }] },
      { name: 'Casca Ancestral', desc: 'Aumenta a defesa de todos os aliados por 2 turnos e ganha Regeneração.', cooldown: 4, target: 'allAllies', anim: 'cast', fx: 'cura',
        effects: [{ kind: 'defUp', turns: 2, chance: 1, to: 'allies' }, { kind: 'regen', turns: 2, chance: 1, to: 'self' }] },
    ],
  },
  {
    id: 'espadachim', name: 'Espadachim', title: 'Espadachim', element: 'fogo', role: 'Ataque', stars: 3, art: 'espadachim',
    base: stats(3, { hp: 1000, atk: 104, def: 76, spd: 104 }),
    skills: [
      { name: 'Corte Flamejante', desc: 'Corta o alvo (dano 3,3×).', cooldown: 0, target: 'enemy', mult: 3.3, anim: 'melee', fx: 'fogo' },
      { name: 'Escudo Giratório', desc: 'Atinge todos os inimigos (dano 2,2×) e ganha Defesa +70% por 2 turnos.', cooldown: 3, target: 'allEnemies', mult: 2.2, anim: 'melee', fx: 'corte',
        effects: [{ kind: 'defUp', turns: 2, chance: 1, to: 'self' }] },
      { name: 'Impacto Explosivo', desc: 'Explosão no alvo (dano 5,0×) com 35% de chance de Atordoar.', cooldown: 4, target: 'enemy', mult: 5.0, anim: 'melee', fx: 'fogo',
        effects: [{ kind: 'stun', turns: 1, chance: 0.35, to: 'target' }] },
    ],
  },
  {
    id: 'arqueiro', name: 'Arqueiro', title: 'Arqueiro', element: 'vento', role: 'Ataque', stars: 3, art: 'arqueiro',
    base: stats(3, { hp: 960, atk: 106, def: 72, spd: 108, crate: 0.25, acc: 0.15 }),
    skills: [
      { name: 'Flecha', desc: 'Dispara no alvo (dano 3,2×).', cooldown: 0, target: 'enemy', mult: 3.2, anim: 'ranged', fx: 'flecha' },
      { name: 'Disparo Duplo', desc: 'Duas flechas (2,2× cada); cada uma tem 40% de chance de deixar o alvo Lento.', cooldown: 2, target: 'enemy', mult: 2.2, hits: 2, anim: 'ranged', fx: 'flecha',
        effects: [{ kind: 'slow', turns: 2, chance: 0.4, to: 'target' }] },
      { name: 'Chuva de Flechas', desc: 'Atinge todos os inimigos (dano 2,5×) e reduz a barra de turno deles em 20%.', cooldown: 4, target: 'allEnemies', mult: 2.5, gauge: -20, anim: 'ranged', fx: 'flecha' },
    ],
  },
  {
    id: 'mago', name: 'Mago', title: 'Mago', element: 'fogo', role: 'Ataque', stars: 3, art: 'mago',
    base: stats(3, { hp: 900, atk: 112, def: 66, spd: 102, acc: 0.2 }),
    skills: [
      { name: 'Bola de Fogo', desc: 'Lança fogo no alvo (dano 3,2×) com 30% de chance de Queimar.', cooldown: 0, target: 'enemy', mult: 3.2, anim: 'ranged', fx: 'fogo',
        effects: [{ kind: 'burn', turns: 2, chance: 0.3, to: 'target' }] },
      { name: 'Parede de Fogo', desc: 'Atinge todos os inimigos (dano 2,2×) com 50% de chance de Queimar cada um.', cooldown: 3, target: 'allEnemies', mult: 2.2, anim: 'cast', fx: 'fogo',
        effects: [{ kind: 'burn', turns: 2, chance: 0.5, to: 'target' }] },
      { name: 'Meteoro', desc: 'Um meteoro esmaga o alvo (dano 6,0×).', cooldown: 5, target: 'enemy', mult: 6.0, anim: 'cast', fx: 'fogo' },
    ],
  },
  {
    id: 'professor', name: 'Professor', title: 'Professor', element: 'agua', role: 'Suporte', stars: 3, art: 'professor',
    base: stats(3, { hp: 1020, atk: 92, def: 80, spd: 106, acc: 0.15, res: 0.25 }),
    skills: [
      { name: 'Livro Voador', desc: 'Arremessa um livro (dano 3,0×).', cooldown: 0, target: 'enemy', mult: 3.0, anim: 'ranged', fx: 'gelo' },
      { name: 'Aula Particular', desc: 'Aumenta a barra de turno dos aliados em 30% e dá Ataque +50% por 2 turnos.', cooldown: 4, target: 'allAllies', allyGauge: 30, anim: 'cast', fx: 'luz',
        effects: [{ kind: 'atkUp', turns: 2, chance: 1, to: 'allies' }] },
      { name: 'Dilúvio', desc: 'Atinge todos os inimigos (dano 2,1×) com 50% de chance de deixá-los Lentos.', cooldown: 3, target: 'allEnemies', mult: 2.1, anim: 'cast', fx: 'gelo',
        effects: [{ kind: 'slow', turns: 2, chance: 0.5, to: 'target' }] },
    ],
  },
  {
    id: 'carnical', name: 'Carniçal', title: 'Carniçal', element: 'sombra', role: 'Vida', stars: 3, art: 'zumbi',
    base: stats(3, { hp: 1320, atk: 92, def: 74, spd: 96 }),
    skills: [
      { name: 'Mordida Pútrida', desc: 'Morde (dano 3,0×) e recupera 30% do dano causado.', cooldown: 0, target: 'enemy', mult: 3.0, drain: 0.3, anim: 'melee', fx: 'veneno' },
      { name: 'Grito Podre', desc: 'Reduz o ataque de todos os inimigos por 2 turnos (70%).', cooldown: 3, target: 'allEnemies', anim: 'cast', fx: 'veneno',
        effects: [{ kind: 'atkDown', turns: 2, chance: 0.7, to: 'target' }] },
      { name: 'Devorar', desc: 'Devora o alvo (dano 4,6×) e recupera 50% do dano causado.', cooldown: 4, target: 'enemy', mult: 4.6, drain: 0.5, anim: 'melee', fx: 'veneno' },
    ],
  },
  // ───────────── 4 estrelas ─────────────
  {
    id: 'rainha', name: 'Rainha Magmática', title: 'Rainha', element: 'fogo', role: 'Suporte', stars: 4, art: 'aranha',
    base: stats(4, { hp: 1150, atk: 108, def: 84, spd: 107, acc: 0.25 }),
    skills: [
      { name: 'Cuspe de Magma', desc: 'Cospe magma (dano 3,1×) com 40% de chance de Queimar por 2 turnos.', cooldown: 0, target: 'enemy', mult: 3.1, anim: 'ranged', fx: 'fogo',
        effects: [{ kind: 'burn', turns: 2, chance: 0.4, to: 'target' }] },
      { name: 'Teia Pegajosa', desc: 'Deixa todos os inimigos Lentos por 2 turnos (80%) e reduz a barra de turno deles em 25%.', cooldown: 3, target: 'allEnemies', gauge: -25, anim: 'cast', fx: 'vento',
        effects: [{ kind: 'slow', turns: 2, chance: 0.8, to: 'target' }] },
      { name: 'Chuva Ácida', desc: 'Atinge todos os inimigos (dano 2,4×) com 60% de chance de Quebrar a Defesa.', cooldown: 4, target: 'allEnemies', mult: 2.4, anim: 'cast', fx: 'veneno',
        effects: [{ kind: 'defDown', turns: 2, chance: 0.6, to: 'target' }] },
    ],
  },
  {
    id: 'minotauro', name: 'Minotauro Brutal', title: 'Minotauro', element: 'fogo', role: 'Vida', stars: 4, art: 'minotauro',
    base: stats(4, { hp: 1480, atk: 110, def: 82, spd: 98 }),
    skills: [
      { name: 'Machadada', desc: 'Golpe de machado baseado na VIDA (dano 0,32× da vida máxima).', cooldown: 0, target: 'enemy', mult: 0.32, scale: 'hp', anim: 'melee', fx: 'corte' },
      { name: 'Investida', desc: 'Avança no alvo (dano 0,45× da vida) com 45% de chance de Atordoar.', cooldown: 3, target: 'enemy', mult: 0.45, scale: 'hp', anim: 'melee', fx: 'corte',
        effects: [{ kind: 'stun', turns: 1, chance: 0.45, to: 'target' }] },
      { name: 'Fúria Taurina', desc: 'Ganha Ataque +50% e Regeneração por 3 turnos e provoca todos os inimigos por 1 turno.', cooldown: 5, target: 'allEnemies', anim: 'cast', fx: 'fogo',
        effects: [{ kind: 'atkUp', turns: 3, chance: 1, to: 'self' }, { kind: 'regen', turns: 3, chance: 1, to: 'self' }, { kind: 'taunt', turns: 1, chance: 0.75, to: 'target' }] },
    ],
  },
  {
    id: 'paladino', name: 'Paladino', title: 'Paladino', element: 'luz', role: 'Defesa', stars: 4, art: 'paladino',
    base: stats(4, { hp: 1260, atk: 92, def: 118, spd: 101, res: 0.4 }),
    skills: [
      { name: 'Cruz Sagrada', desc: 'Golpe sagrado baseado na DEFESA (dano 3,3×).', cooldown: 0, target: 'enemy', mult: 3.3, scale: 'def', anim: 'melee', fx: 'luz' },
      { name: 'Aura Sagrada', desc: 'Cura 18% da vida de todos os aliados e remove todos os efeitos negativos.', cooldown: 3, target: 'allAllies', heal: 0.18, cleanse: true, anim: 'cast', fx: 'luz' },
      { name: 'Baluarte', desc: 'Dá Imunidade e Defesa +70% a todos os aliados por 2 turnos.', cooldown: 5, target: 'allAllies', anim: 'cast', fx: 'luz',
        effects: [{ kind: 'imune', turns: 2, chance: 1, to: 'allies' }, { kind: 'defUp', turns: 2, chance: 1, to: 'allies' }] },
    ],
  },
  {
    id: 'bruxo', name: 'Bruxo das Tempestades', title: 'Bruxo', element: 'vento', role: 'Ataque', stars: 4, art: 'bruxo',
    base: stats(4, { hp: 1020, atk: 122, def: 74, spd: 106, acc: 0.25 }),
    skills: [
      { name: 'Relâmpago', desc: 'Raio no alvo (dano 3,3×) com 20% de chance de Atordoar.', cooldown: 0, target: 'enemy', mult: 3.3, anim: 'cast', fx: 'raio',
        effects: [{ kind: 'stun', turns: 1, chance: 0.2, to: 'target' }] },
      { name: 'Corrente de Raios', desc: 'Atinge todos os inimigos (dano 2,4×) e reduz a barra de turno deles em 15%.', cooldown: 3, target: 'allEnemies', mult: 2.4, gauge: -15, anim: 'cast', fx: 'raio' },
      { name: 'Fúria dos Céus', desc: '4 raios em inimigos aleatórios (dano 2,1× cada), com 15% de chance de Atordoar.', cooldown: 4, target: 'randomEnemies', mult: 2.1, hits: 4, anim: 'cast', fx: 'raio',
        effects: [{ kind: 'stun', turns: 1, chance: 0.15, to: 'target' }] },
    ],
  },
  {
    id: 'atirador', name: 'Atiradora de Elite', title: 'Atiradora', element: 'luz', role: 'Ataque', stars: 4, art: 'atirador',
    base: stats(4, { hp: 980, atk: 124, def: 72, spd: 110, crate: 0.3, cdmg: 0.7 }),
    skills: [
      { name: 'Tiro Certeiro', desc: 'Dispara no alvo (dano 3,4×).', cooldown: 0, target: 'enemy', mult: 3.4, anim: 'ranged', fx: 'flecha' },
      { name: 'Respiração Calma', desc: 'Ganha Crítico +30% e Ataque +50% por 3 turnos e enche a própria barra de turno em 50%.', cooldown: 4, target: 'self', gauge: 50, anim: 'cast', fx: 'luz',
        effects: [{ kind: 'critUp', turns: 3, chance: 1, to: 'self' }, { kind: 'atkUp', turns: 3, chance: 1, to: 'self' }] },
      { name: 'Tiro Perfurante', desc: 'Dano 5,4× que ignora 50% da defesa e remove 1 efeito positivo do alvo.', cooldown: 3, target: 'enemy', mult: 5.4, pierce: 0.5, strip: true, anim: 'ranged', fx: 'luz' },
    ],
  },
  {
    id: 'cacador', name: 'Caçador de Sombras', title: 'Caçador', element: 'sombra', role: 'Ataque', stars: 4, art: 'cacador',
    base: stats(4, { hp: 1000, atk: 118, def: 74, spd: 114, crate: 0.25, acc: 0.25 }),
    skills: [
      { name: 'Flecha Sombria', desc: 'Dispara no alvo (dano 3,3×) com 30% de chance de Silenciar por 1 turno.', cooldown: 0, target: 'enemy', mult: 3.3, anim: 'ranged', fx: 'sombra',
        effects: [{ kind: 'silence', turns: 1, chance: 0.3, to: 'target' }] },
      { name: 'Armadilha', desc: 'Dano 3,6× com 60% de chance de Atordoar por 1 turno.', cooldown: 4, target: 'enemy', mult: 3.6, anim: 'cast', fx: 'sombra',
        effects: [{ kind: 'stun', turns: 1, chance: 0.6, to: 'target' }] },
      { name: 'Saraivada das Sombras', desc: '5 flechas em inimigos aleatórios (dano 1,9× cada), cada uma pode Quebrar a Defesa (30%).', cooldown: 3, target: 'randomEnemies', mult: 1.9, hits: 5, anim: 'ranged', fx: 'sombra',
        effects: [{ kind: 'defDown', turns: 2, chance: 0.3, to: 'target' }] },
    ],
  },
  {
    id: 'cavaleiro', name: 'Cavaleiro Alvo', title: 'Cavaleiro', element: 'luz', role: 'Ataque', stars: 4, art: 'cavaleiro',
    base: stats(4, { hp: 1120, atk: 116, def: 90, spd: 104 }),
    skills: [
      { name: 'Investida Heroica', desc: 'Avança no alvo (dano 3,4×) e enche a própria barra de turno em 15%.', cooldown: 0, target: 'enemy', mult: 3.4, selfGauge: 15, anim: 'melee', fx: 'corte' },
      { name: 'Corte em X', desc: 'Dois cortes (2,6× cada) com 50% de chance de Quebrar a Defesa.', cooldown: 3, target: 'enemy', mult: 2.6, hits: 2, anim: 'melee', fx: 'luz',
        effects: [{ kind: 'defDown', turns: 2, chance: 0.5, to: 'target' }] },
      { name: 'Golpe Devastador', desc: 'Dano 6,2× que ignora 30% da defesa. Se derrotar o alvo, ganha um turno extra.', cooldown: 4, target: 'enemy', mult: 6.2, pierce: 0.3, extraOnKill: true, anim: 'melee', fx: 'luz' },
    ],
  },
  // ───────────── 5 estrelas ─────────────
  {
    id: 'bafome', name: 'Bafome', title: 'Bafome', element: 'sombra', role: 'Ataque', stars: 5, art: 'bafome',
    base: stats(5, { hp: 1300, atk: 126, def: 92, spd: 108, crate: 0.25, acc: 0.25, res: 0.3 }),
    skills: [
      { name: 'Foice Infernal', desc: 'Golpe de foice (dano 3,6×) com 30% de chance de Quebrar a Defesa.', cooldown: 0, target: 'enemy', mult: 3.6, anim: 'melee', fx: 'sombra',
        effects: [{ kind: 'defDown', turns: 2, chance: 0.3, to: 'target' }] },
      { name: 'Rugido Abissal', desc: 'Atinge todos os inimigos (dano 2,4×) com 20% de chance de Atordoar cada um.', cooldown: 4, target: 'allEnemies', mult: 2.4, anim: 'cast', fx: 'sombra',
        effects: [{ kind: 'stun', turns: 1, chance: 0.2, to: 'target' }] },
      { name: 'Pacto Sombrio', desc: 'Dano 6,2× que ignora 40% da defesa e recupera 30% do dano causado.', cooldown: 5, target: 'enemy', mult: 6.2, pierce: 0.4, drain: 0.3, anim: 'melee', fx: 'sombra' },
    ],
  },
  {
    id: 'ossario', name: 'Lorde Ossário', title: 'Lorde', element: 'sombra', role: 'Suporte', stars: 5, art: 'lich',
    base: stats(5, { hp: 1340, atk: 120, def: 96, spd: 105, acc: 0.3, res: 0.35 }),
    skills: [
      { name: 'Orbe Espectral', desc: 'Lança um orbe (dano 3,4×) que reduz a barra de turno do alvo em 20%.', cooldown: 0, target: 'enemy', mult: 3.4, gauge: -20, anim: 'ranged', fx: 'sombra' },
      { name: 'Ceifar Almas', desc: 'Atinge todos os inimigos (dano 2,5×), remove 1 efeito positivo de cada e deixa-os Lentos (60%).', cooldown: 3, target: 'allEnemies', mult: 2.5, strip: true, anim: 'cast', fx: 'sombra',
        effects: [{ kind: 'slow', turns: 2, chance: 0.6, to: 'target' }] },
      { name: 'Coroa dos Mortos', desc: 'Dá Ataque +50% e Imunidade aos aliados por 2 turnos e enche a barra de turno deles em 25%.', cooldown: 5, target: 'allAllies', allyGauge: 25, anim: 'cast', fx: 'sombra',
        effects: [{ kind: 'atkUp', turns: 2, chance: 1, to: 'allies' }, { kind: 'imune', turns: 2, chance: 1, to: 'allies' }] },
    ],
  },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

/** Nível máximo por raridade */
export const maxLevel = (stars: number) => 10 + stars * 5;

/** XP para passar do nível `lv` para o próximo */
export const xpToNext = (lv: number) => 30 + lv * 18;

/** Atributos no nível informado (vida, ataque e defesa crescem 9% do valor base por nível) */
export function statsAt(def: UnitDef, lv: number): Stats {
  const g = 1 + 0.09 * (lv - 1);
  const b = def.base;
  return { ...b, hp: Math.round(b.hp * g), atk: Math.round(b.atk * g), def: Math.round(b.def * g) };
}
