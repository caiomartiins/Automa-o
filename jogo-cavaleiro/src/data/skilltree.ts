import type { ClassId } from './classes';
import { SKILLS, type SkillId } from './skills';

/**
 * Árvore de habilidades (no estilo do RPG clássico): cada nível de classe dá
 * 1 ponto de habilidade. Habilidades ativas atacam sozinhas; passivas dão bônus.
 * Por enquanto só a linha do Mago (Mago → Bruxo ou Professor) usa a árvore.
 */
export type PassiveId =
  | 'foco' | 'barreira'
  | 'dominio'
  | 'lembranca' | 'vulcao' | 'diluvio' | 'vendaval' | 'dracologia' | 'conjuracao';

export type TreeId = SkillId | PassiveId;

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
  passive?: { name: string; max: number; color: number; desc: string; per: (lv: number) => string };
}

const P = (name: string, max: number, color: number, desc: string, per: (lv: number) => string) => ({ name, max, color, desc, per });

export const TREE: TreeNode[] = [
  // ---------------- Mago
  { id: 'fogo', cls: 'mago', col: 0, row: 0, req: [] },
  { id: 'gelo', cls: 'mago', col: 1, row: 0, req: [] },
  { id: 'relampago', cls: 'mago', col: 2, row: 0, req: [] },
  { id: 'parede', cls: 'mago', col: 0, row: 1, req: [{ id: 'fogo', lv: 3 }] },
  { id: 'congelar', cls: 'mago', col: 1, row: 1, req: [{ id: 'gelo', lv: 3 }] },
  { id: 'tempestade', cls: 'mago', col: 2, row: 1, req: [{ id: 'relampago', lv: 3 }] },
  {
    id: 'foco', cls: 'mago', col: 0, row: 2, req: [],
    passive: P('Foco Arcano', 5, 0xb07aff, 'Concentração mágica: aumenta o dano de todas as magias.', (l) => `+${l * 5}% de dano mágico`),
  },
  { id: 'alma', cls: 'mago', col: 1, row: 2, req: [] },
  {
    id: 'barreira', cls: 'mago', col: 2, row: 2, req: [{ id: 'alma', lv: 2 }],
    passive: P('Barreira Arcana', 5, 0x9ab0ff, 'Uma película de mana reduz o dano que você recebe.', (l) => `-${l * 4}% de dano recebido`),
  },

  // ---------------- Bruxo
  { id: 'raio', cls: 'bruxo', col: 0, row: 0, req: [{ id: 'relampago', lv: 1 }] },
  {
    id: 'dominio', cls: 'bruxo', col: 1, row: 0, req: [],
    passive: P('Domínio Elemental', 5, 0xffb040, 'Mestre dos elementos: mais dano de Fogo, Água e Vento.', (l) => `+${l * 6}% de dano de Fogo, Água e Vento`),
  },
  { id: 'nevasca', cls: 'bruxo', col: 2, row: 0, req: [{ id: 'congelar', lv: 2 }] },
  { id: 'trovao', cls: 'bruxo', col: 0, row: 1, req: [{ id: 'raio', lv: 3 }, { id: 'tempestade', lv: 3 }] },
  { id: 'meteoro', cls: 'bruxo', col: 1, row: 1, req: [{ id: 'tempestade', lv: 2 }, { id: 'parede', lv: 1 }] },
  { id: 'pantano', cls: 'bruxo', col: 2, row: 1, req: [{ id: 'nevasca', lv: 1 }] },

  // ---------------- Professor
  { id: 'livro', cls: 'professor', col: 0, row: 0, req: [] },
  { id: 'espinhos', cls: 'professor', col: 1, row: 0, req: [] },
  {
    id: 'dracologia', cls: 'professor', col: 2, row: 0, req: [],
    passive: P('Dracologia', 5, 0x7ad0a0, 'Estudos antigos: aumenta a INT (que dá Matq).', (l) => `+${l * 2} INT`),
  },
  {
    id: 'lembranca', cls: 'professor', col: 0, row: 1, req: [{ id: 'livro', lv: 2 }],
    passive: P('Lembrança Arcana', 5, 0xffd27a, 'Ao arremessar livros, pode lançar de graça uma magia de Mago que você saiba (Bola de Fogo, Lança de Gelo ou Relâmpago).', (l) => `${l * 8}% de chance por arremesso`),
  },
  {
    id: 'vulcao', cls: 'professor', col: 1, row: 1, req: [{ id: 'espinhos', lv: 2 }],
    passive: P('Vulcão', 5, 0xff6a3a, 'O calor da terra fortalece suas magias de Fogo e Terra.', (l) => `+${l * 7}% de dano de Fogo e Terra`),
  },
  {
    id: 'diluvio', cls: 'professor', col: 2, row: 1, req: [{ id: 'dracologia', lv: 2 }],
    passive: P('Dilúvio', 5, 0x5ab0ff, 'Águas curativas: mais vida máxima e regeneração.', (l) => `+${l * 5}% de HP máx. e +${(l * 0.4).toFixed(1)} HP/s`),
  },
  {
    id: 'conjuracao', cls: 'professor', col: 0, row: 2, req: [{ id: 'lembranca', lv: 1 }],
    passive: P('Conjuração Livre', 5, 0xe0e0ff, 'Conjura andando: ataques mais rápidos e mais velocidade de movimento.', (l) => `+${l * 4}% vel. de ataque e +${l * 3}% de movimento`),
  },
  {
    id: 'vendaval', cls: 'professor', col: 1, row: 2, req: [{ id: 'vulcao', lv: 1 }],
    passive: P('Vendaval', 5, 0x9ae8a0, 'Ventos ao seu redor: mais esquiva e dano de Vento.', (l) => `+${l * 4} Flee e +${l * 6}% de dano de Vento`),
  },
];

export const treeNode = (id: TreeId) => TREE.find((n) => n.id === id)!;
export const nodeName = (n: TreeNode) => n.passive?.name ?? SKILLS[n.id as SkillId].name;
export const nodeMax = (n: TreeNode) => n.passive?.max ?? SKILLS[n.id as SkillId].maxLevel;
export const nodeColor = (n: TreeNode) => n.passive?.color ?? SKILLS[n.id as SkillId].color;

/** Classes que usam a árvore e as abas que cada uma enxerga */
export const TREE_CLASSES: ClassId[] = ['mago', 'bruxo', 'professor'];
/** Classe da 1ª profissão de cada 2ª classe (as habilidades dela continuam valendo) */
export const TREE_PARENT: Partial<Record<ClassId, ClassId>> = { bruxo: 'mago', professor: 'mago' };

/** Ponto de habilidade da classe: 1 por nível de classe (a habilidade inicial da classe vem de graça) */
export const SKILL_POINTS_PER_JOB = 1;
