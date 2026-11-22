import type { ClassId } from './classes';
import type { Attr, Element, Race } from './rpg';
import { SKILLS, type SkillId } from './skills';

/**
 * Árvores de habilidades (no estilo do RPG clássico): cada nível de classe dá
 * 1 ponto de habilidade, até o teto da classe. Habilidades ativas atacam sozinhas;
 * passivas dão bônus permanentes.
 *
 * Regras de build:
 * - no máximo 4 habilidades ATIVAS e 4 PASSIVAS aprendidas;
 * - 1ª classe dá até 12 pontos e a 2ª classe até 18 (30 no total). Deixar as 8
 *   habilidades no nível 5 custaria 40, então é preciso escolher onde investir.
 */
export const MAX_ACTIVE = 4;
export const MAX_PASSIVE = 4;
export const POINT_CAP_FIRST = 12;
export const POINT_CAP_SECOND = 18;

export type PassiveId =
  // Mago / Bruxo / Professor
  | 'foco' | 'barreira' | 'dominio'
  | 'lembranca' | 'vulcao' | 'diluvio' | 'vendaval' | 'dracologia' | 'conjuracao'
  // Espadachim / Cavaleiro / Paladino
  | 'pericia' | 'vigor' | 'recuperar' | 'furia'
  | 'periciaLanca' | 'rapidez' | 'contra' | 'montaria'
  | 'fe' | 'defensor' | 'cura'
  // Arqueiro / Caçador de Sombras / Atirador de Elite
  | 'coruja' | 'aguia' | 'concentracao'
  | 'feras' | 'veneno' | 'sombra'
  | 'mira' | 'fatal' | 'respiracao' | 'pes';

export type TreeId = SkillId | PassiveId;

/** Efeito de UM nível de uma passiva (somado a cada nível) */
export interface PassiveFx {
  /** Dano por tipo (0.05 = +5%) */
  melee?: number;
  ranged?: number;
  magic?: number;
  elem?: Partial<Record<Element, number>>;
  race?: Partial<Record<Race, number>>;
  /** Redução do dano recebido */
  dmgTaken?: number;
  flee?: number;
  hit?: number;
  /** Velocidade de ataque (0.04 = +4%) */
  haste?: number;
  /** Velocidade de movimento em % */
  speedPct?: number;
  /** HP por segundo */
  regen?: number;
  /** HP máximo em % */
  hpPct?: number;
  /** Chance de crítico */
  crit?: number;
  /** Dano extra do crítico (0.1 = ×1,6 em vez de ×1,5) */
  critDmg?: number;
  attrs?: Partial<Record<Attr, number>>;
  /** Chance de envenenar com ataques à distância */
  poison?: number;
  /** Chance de revidar ao ser atingido */
  counter?: number;
  /** Dano extra com menos da metade do HP */
  berserk?: number;
  /** Chance de lançar uma magia de Mago ao arremessar livros */
  recall?: number;
}

export interface TreeNode {
  id: TreeId;
  /** Classe dona da habilidade (aba da árvore) */
  cls: ClassId;
  /** Posição na grade da aba (coluna 0-2, linha 0-2) */
  col: number;
  row: number;
  /** Requisitos: outras habilidades em certo nível */
  req: { id: TreeId; lv: number }[];
  /** Passiva (bônus permanente); sem isso é uma habilidade ativa de SKILLS */
  passive?: { name: string; max: number; color: number; desc: string; per: (lv: number) => string; fx: PassiveFx };
}

const P = (name: string, color: number, desc: string, per: (lv: number) => string, fx: PassiveFx) => ({ name, max: 5, color, desc, per, fx });


export const TREE: TreeNode[] = [
  // ================= Mago
  { id: 'fogo', cls: 'mago', col: 0, row: 0, req: [] },
  { id: 'gelo', cls: 'mago', col: 1, row: 0, req: [] },
  { id: 'relampago', cls: 'mago', col: 2, row: 0, req: [] },
  { id: 'parede', cls: 'mago', col: 0, row: 1, req: [{ id: 'fogo', lv: 3 }] },
  { id: 'congelar', cls: 'mago', col: 1, row: 1, req: [{ id: 'gelo', lv: 3 }] },
  { id: 'tempestade', cls: 'mago', col: 2, row: 1, req: [{ id: 'relampago', lv: 3 }] },
  {
    id: 'foco', cls: 'mago', col: 0, row: 2, req: [],
    passive: P('Foco Arcano', 0xb07aff, 'Concentração mágica: aumenta o dano de todas as magias.', (l) => `+${l * 6}% de dano mágico`, { magic: 0.06 }),
  },
  { id: 'alma', cls: 'mago', col: 1, row: 2, req: [] },
  {
    id: 'barreira', cls: 'mago', col: 2, row: 2, req: [{ id: 'alma', lv: 2 }],
    passive: P('Barreira Arcana', 0x9ab0ff, 'Uma película de mana reduz o dano que você recebe.', (l) => `-${l * 4}% de dano recebido`, { dmgTaken: 0.04 }),
  },

  // ================= Bruxo
  { id: 'raio', cls: 'bruxo', col: 0, row: 0, req: [{ id: 'relampago', lv: 1 }] },
  {
    id: 'dominio', cls: 'bruxo', col: 1, row: 0, req: [],
    passive: P('Domínio Elemental', 0xffb040, 'Mestre dos elementos: mais dano de Fogo, Água e Vento.', (l) => `+${l * 7}% de dano de Fogo, Água e Vento`, { elem: { fogo: 0.07, agua: 0.07, vento: 0.07 } }),
  },
  { id: 'nevasca', cls: 'bruxo', col: 2, row: 0, req: [{ id: 'congelar', lv: 2 }] },
  { id: 'trovao', cls: 'bruxo', col: 0, row: 1, req: [{ id: 'raio', lv: 3 }, { id: 'tempestade', lv: 3 }] },
  { id: 'meteoro', cls: 'bruxo', col: 1, row: 1, req: [{ id: 'tempestade', lv: 2 }, { id: 'parede', lv: 1 }] },
  { id: 'pantano', cls: 'bruxo', col: 2, row: 1, req: [{ id: 'nevasca', lv: 1 }] },

  // ================= Professor
  { id: 'livro', cls: 'professor', col: 0, row: 0, req: [] },
  { id: 'espinhos', cls: 'professor', col: 1, row: 0, req: [] },
  {
    id: 'dracologia', cls: 'professor', col: 2, row: 0, req: [],
    passive: P('Dracologia', 0x7ad0a0, 'Estudos antigos: aumenta a INT (que dá Matq).', (l) => `+${l * 2} INT`, { attrs: { int: 2 } }),
  },
  {
    id: 'lembranca', cls: 'professor', col: 0, row: 1, req: [{ id: 'livro', lv: 2 }],
    passive: P('Lembrança Arcana', 0xffd27a, 'Ao arremessar livros, pode lançar de graça uma magia de Mago que você saiba (Bola de Fogo, Lança de Gelo ou Relâmpago).', (l) => `${l * 8}% de chance por arremesso`, { recall: 0.08 }),
  },
  {
    id: 'vulcao', cls: 'professor', col: 1, row: 1, req: [{ id: 'espinhos', lv: 2 }],
    passive: P('Vulcão', 0xff6a3a, 'O calor da terra fortalece suas magias de Fogo e Terra.', (l) => `+${l * 8}% de dano de Fogo e Terra`, { elem: { fogo: 0.08, terra: 0.08 } }),
  },
  {
    id: 'diluvio', cls: 'professor', col: 2, row: 1, req: [{ id: 'dracologia', lv: 2 }],
    passive: P('Dilúvio', 0x5ab0ff, 'Águas curativas: mais vida máxima e regeneração.', (l) => `+${l * 5}% de HP máx. e +${(l * 0.4).toFixed(1)} HP/s`, { hpPct: 0.05, regen: 0.4 }),
  },
  {
    id: 'conjuracao', cls: 'professor', col: 0, row: 2, req: [{ id: 'lembranca', lv: 1 }],
    passive: P('Conjuração Livre', 0xe0e0ff, 'Conjura andando: ataques mais rápidos e mais velocidade de movimento.', (l) => `+${l * 4}% vel. de ataque e +${l * 3}% de movimento`, { haste: 0.04, speedPct: 0.03 }),
  },
  {
    id: 'vendaval', cls: 'professor', col: 1, row: 2, req: [{ id: 'vulcao', lv: 1 }],
    passive: P('Vendaval', 0x9ae8a0, 'Ventos ao seu redor: mais esquiva e dano de Vento.', (l) => `+${l * 4} Flee e +${l * 6}% de dano de Vento`, { flee: 4, elem: { vento: 0.06 } }),
  },

  // ================= Espadachim
  { id: 'espada', cls: 'espadachim', col: 0, row: 0, req: [] },
  { id: 'escudo', cls: 'espadachim', col: 1, row: 0, req: [] },
  {
    id: 'pericia', cls: 'espadachim', col: 2, row: 0, req: [],
    passive: P('Perícia com Espada', 0xd8d8e8, 'Treino com a espada: mais dano corpo a corpo e mais acerto.', (l) => `+${l * 5}% de dano corpo a corpo e +${l * 2} HIT`, { melee: 0.05, hit: 2 }),
  },
  { id: 'explosao', cls: 'espadachim', col: 0, row: 1, req: [{ id: 'espada', lv: 3 }] },
  {
    id: 'vigor', cls: 'espadachim', col: 1, row: 1, req: [{ id: 'escudo', lv: 2 }],
    passive: P('Vigor Inabalável', 0x5a8cff, 'Aguenta firme: menos dano recebido.', (l) => `-${l * 4}% de dano recebido`, { dmgTaken: 0.04 }),
  },
  {
    id: 'recuperar', cls: 'espadachim', col: 2, row: 1, req: [],
    passive: P('Recuperar HP', 0x7ae07a, 'Corpo treinado: mais vida máxima e regeneração.', (l) => `+${l * 4}% de HP máx. e +${(l * 0.5).toFixed(1)} HP/s`, { hpPct: 0.04, regen: 0.5 }),
  },
  {
    id: 'furia', cls: 'espadachim', col: 0, row: 2, req: [{ id: 'explosao', lv: 1 }],
    passive: P('Fúria', 0xff5a4a, 'Quanto mais ferido, mais forte: dano extra com menos da metade do HP.', (l) => `+${l * 8}% de dano com HP abaixo de 50%`, { berserk: 0.08 }),
  },

  // ================= Cavaleiro
  { id: 'lanca', cls: 'cavaleiro', col: 0, row: 0, req: [] },
  { id: 'impacto', cls: 'cavaleiro', col: 1, row: 0, req: [] },
  {
    id: 'contra', cls: 'cavaleiro', col: 2, row: 0, req: [],
    passive: P('Contra-Ataque', 0xffa060, 'Ao ser atingido, chance de revidar com um golpe forte no agressor.', (l) => `${l * 8}% de chance de revidar`, { counter: 0.08 }),
  },
  { id: 'brandir', cls: 'cavaleiro', col: 0, row: 1, req: [{ id: 'lanca', lv: 3 }] },
  {
    id: 'rapidez', cls: 'cavaleiro', col: 1, row: 1, req: [{ id: 'impacto', lv: 1 }],
    passive: P('Rapidez com Duas Mãos', 0xffe080, 'Golpes mais rápidos com armas grandes.', (l) => `+${l * 6}% de velocidade de ataque`, { haste: 0.06 }),
  },
  {
    id: 'montaria', cls: 'cavaleiro', col: 2, row: 1, req: [],
    passive: P('Montaria', 0xc8a070, 'Monta no seu peco-peco: mais rápido e mais difícil de acertar.', (l) => `+${l * 4}% de movimento e +${l * 3} Flee`, { speedPct: 0.04, flee: 3 }),
  },
  {
    id: 'periciaLanca', cls: 'cavaleiro', col: 0, row: 2, req: [{ id: 'lanca', lv: 1 }],
    passive: P('Perícia com Lança', 0xffd04a, 'Domínio da lança: mais dano e acerto, ainda mais contra alvos grandes.', (l) => `+${l * 5}% de dano corpo a corpo e +${l * 3} HIT`, { melee: 0.05, hit: 3 }),
  },

  // ================= Paladino
  { id: 'aura', cls: 'paladino', col: 0, row: 0, req: [] },
  { id: 'bumerangue', cls: 'paladino', col: 1, row: 0, req: [{ id: 'escudo', lv: 1 }] },
  {
    id: 'fe', cls: 'paladino', col: 2, row: 0, req: [],
    passive: P('Fé', 0xfff0a0, 'A fé fortalece o corpo e a luz sagrada.', (l) => `+${l * 5}% de HP máx. e +${l * 8}% de dano Sagrado`, { hpPct: 0.05, elem: { sagrado: 0.08 } }),
  },
  { id: 'cruz', cls: 'paladino', col: 0, row: 1, req: [{ id: 'aura', lv: 3 }] },
  {
    id: 'cura', cls: 'paladino', col: 1, row: 1, req: [{ id: 'aura', lv: 1 }],
    passive: P('Cura Divina', 0x9aff8a, 'Uma luz suave cura você o tempo todo.', (l) => `+${(l * 0.7).toFixed(1)} HP/s`, { regen: 0.7 }),
  },
  {
    id: 'defensor', cls: 'paladino', col: 2, row: 1, req: [{ id: 'fe', lv: 2 }],
    passive: P('Defensor', 0x8ab0ff, 'Postura de escudo: bem menos dano recebido.', (l) => `-${l * 5}% de dano recebido`, { dmgTaken: 0.05 }),
  },

  // ================= Arqueiro
  { id: 'flecha', cls: 'arqueiro', col: 0, row: 0, req: [] },
  {
    id: 'coruja', cls: 'arqueiro', col: 1, row: 0, req: [],
    passive: P('Olhos de Coruja', 0xc9a46a, 'Visão treinada: aumenta a DES.', (l) => `+${l * 2} DES`, { attrs: { des: 2 } }),
  },
  { id: 'rajada', cls: 'arqueiro', col: 2, row: 0, req: [] },
  { id: 'duplo', cls: 'arqueiro', col: 0, row: 1, req: [{ id: 'flecha', lv: 3 }] },
  {
    id: 'aguia', cls: 'arqueiro', col: 1, row: 1, req: [{ id: 'coruja', lv: 3 }],
    passive: P('Olhos de Águia', 0xe8c890, 'Mira de longe: mais dano à distância e mais acerto.', (l) => `+${l * 5}% de dano à distância e +${l * 3} HIT`, { ranged: 0.05, hit: 3 }),
  },
  {
    id: 'concentracao', cls: 'arqueiro', col: 2, row: 1, req: [{ id: 'coruja', lv: 1 }],
    passive: P('Concentração', 0x7ee07e, 'Foco total: atira mais rápido, com mais AGI e DES.', (l) => `+${l * 4}% vel. de ataque, +${l} AGI e +${l} DES`, { haste: 0.04, attrs: { agi: 1, des: 1 } }),
  },

  // ================= Caçador de Sombras
  { id: 'chuva', cls: 'cacador', col: 0, row: 0, req: [] },
  { id: 'armadilha', cls: 'cacador', col: 1, row: 0, req: [] },
  { id: 'falcao', cls: 'cacador', col: 2, row: 0, req: [] },
  {
    id: 'veneno', cls: 'cacador', col: 0, row: 1, req: [{ id: 'chuva', lv: 2 }],
    passive: P('Flechas Envenenadas', 0x9aff7a, 'Seus ataques à distância podem envenenar (dano contínuo e lentidão).', (l) => `${l * 5}% de chance de envenenar`, { poison: 0.05 }),
  },
  {
    id: 'feras', cls: 'cacador', col: 1, row: 1, req: [],
    passive: P('Caça às Feras', 0xc89a6a, 'Caçador experiente: mais dano contra Brutos, Insetos e Plantas.', (l) => `+${l * 8}% de dano contra Bruto, Inseto e Planta`, { race: { bruto: 0.08, inseto: 0.08, planta: 0.08 } }),
  },
  {
    id: 'sombra', cls: 'cacador', col: 2, row: 1, req: [{ id: 'falcao', lv: 1 }],
    passive: P('Passo Sombrio', 0x9a7ad0, 'Move-se como uma sombra: mais esquiva e movimento.', (l) => `+${l * 4} Flee e +${l * 3}% de movimento`, { flee: 4, speedPct: 0.03 }),
  },

  // ================= Atirador de Elite
  { id: 'tiro', cls: 'patrulheiro', col: 0, row: 0, req: [] },
  { id: 'explosiva', cls: 'patrulheiro', col: 1, row: 0, req: [] },
  {
    id: 'mira', cls: 'patrulheiro', col: 2, row: 0, req: [],
    passive: P('Mira Certeira', 0xffe36a, 'Pontos fracos: mais crítico e acerto.', (l) => `+${l * 2}% de crítico e +${l * 3} HIT`, { crit: 0.02, hit: 3 }),
  },
  {
    id: 'respiracao', cls: 'patrulheiro', col: 0, row: 1, req: [{ id: 'tiro', lv: 1 }],
    passive: P('Respiração Calma', 0xe8edf2, 'Tiros firmes: mais dano à distância.', (l) => `+${l * 6}% de dano à distância`, { ranged: 0.06 }),
  },
  {
    id: 'pes', cls: 'patrulheiro', col: 1, row: 1, req: [],
    passive: P('Pés Ligeiros', 0x9ae8a0, 'Reposiciona rápido: mais movimento e esquiva.', (l) => `+${l * 4}% de movimento e +${l * 3} Flee`, { speedPct: 0.04, flee: 3 }),
  },
  {
    id: 'fatal', cls: 'patrulheiro', col: 2, row: 1, req: [{ id: 'mira', lv: 2 }],
    passive: P('Tiro Fatal', 0xff6a3a, 'Críticos devastadores.', (l) => `Crítico causa ×${(1.5 + l * 0.12).toFixed(2)} (normal ×1,5)`, { critDmg: 0.12 }),
  },
];

export const treeNode = (id: TreeId) => TREE.find((n) => n.id === id)!;
export const isPassive = (id: TreeId) => !!treeNode(id).passive;
export const nodeName = (n: TreeNode) => n.passive?.name ?? SKILLS[n.id as SkillId].name;
export const nodeMax = (n: TreeNode) => n.passive?.max ?? SKILLS[n.id as SkillId].maxLevel;
export const nodeColor = (n: TreeNode) => n.passive?.color ?? SKILLS[n.id as SkillId].color;


/** Classes que usam a árvore */
export const TREE_CLASSES: ClassId[] = ['espadachim', 'cavaleiro', 'paladino', 'mago', 'bruxo', 'professor', 'arqueiro', 'cacador', 'patrulheiro'];
/** 1ª classe de cada 2ª classe (as habilidades dela continuam valendo) */
export const TREE_PARENT: Partial<Record<ClassId, ClassId>> = {
  cavaleiro: 'espadachim', paladino: 'espadachim', bruxo: 'mago', professor: 'mago', cacador: 'arqueiro', patrulheiro: 'arqueiro',
};
