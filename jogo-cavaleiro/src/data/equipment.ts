import type { Attr } from './rpg';

/**
 * Equipamentos comprados com zeny na loja. Ficam guardados entre partidas
 * e o que estiver equipado vale em todas as próximas partidas.
 */

export type Slot = 'cabeca' | 'corpo' | 'arma' | 'escudo' | 'capa' | 'calcado' | 'acessorio1' | 'acessorio2';
/** Tipo de item (os dois slots de acessório aceitam o mesmo tipo) */
export type ItemSlot = Exclude<Slot, 'acessorio1' | 'acessorio2'> | 'acessorio';

export const SLOT_NAME: Record<Slot, string> = {
  cabeca: 'Cabeça', corpo: 'Corpo', arma: 'Mão direita', escudo: 'Mão esquerda',
  capa: 'Capa', calcado: 'Calçado', acessorio1: 'Acessório', acessorio2: 'Acessório',
};

/** Ordem dos slots na janela: coluna da esquerda e da direita, como na referência */
export const SLOTS_LEFT: Slot[] = ['cabeca', 'arma', 'capa', 'acessorio1'];
export const SLOTS_RIGHT: Slot[] = ['corpo', 'escudo', 'calcado', 'acessorio2'];

export const ITEM_SLOT_NAME: Record<ItemSlot, string> = {
  cabeca: 'Cabeça', corpo: 'Corpo', arma: 'Arma', escudo: 'Escudo', capa: 'Capa', calcado: 'Calçado', acessorio: 'Acessório',
};

export interface EquipStats {
  /** Dano físico (corpo a corpo e à distância), em fração: 0.1 = +10% */
  atk?: number;
  /** Dano mágico */
  matk?: number;
  def?: number;
  hp?: number;
  /** Velocidade de movimento (px/s) */
  speed?: number;
  crit?: number;
  flee?: number;
  /** Velocidade de ataque */
  aspd?: number;
  regen?: number;
  /** Raio de coleta (fração) */
  magnet?: number;
  attrs?: Partial<Record<Attr, number>>;
}

export interface EquipDef {
  id: string;
  name: string;
  slot: ItemSlot;
  price: number;
  /** Textura do ícone e cor aplicada */
  icon: string;
  tint: number;
  stats: EquipStats;
  /** Item raro: não é vendido, só cai do monstro indicado */
  drop?: { monster: string; chance: number };
  /** Item lendário (caro, fim de jogo) */
  legend?: boolean;
  /** Item épico (o tier mais alto da loja) */
  epic?: boolean;
  /** Arma mítica de chefe: o herói brilha com esta cor quando equipada */
  glow?: number;
}

export const EQUIPMENT: EquipDef[] = [
  // ---- cabeça
  { id: 'gorro', name: 'Gorro de Pano', slot: 'cabeca', price: 60, icon: 'eq-chapeu', tint: 0xc8a070, stats: { def: 1, hp: 5 } },
  { id: 'elmo', name: 'Elmo de Ferro', slot: 'cabeca', price: 320, icon: 'eq-elmo', tint: 0xb8c4d4, stats: { def: 3, hp: 15 } },
  { id: 'tiara', name: 'Tiara Arcana', slot: 'cabeca', price: 380, icon: 'eq-tiara', tint: 0xb07aff, stats: { def: 1, matk: 0.1 } },
  { id: 'chifres', name: 'Chifres do Demônio', slot: 'cabeca', price: 1100, icon: 'eq-chifres', tint: 0x7a3a3a, stats: { def: 2, atk: 0.08, matk: 0.08, crit: 0.02 } },
  // ---- corpo
  { id: 'tunica', name: 'Túnica Acolchoada', slot: 'corpo', price: 90, icon: 'eq-armadura', tint: 0xa07a50, stats: { def: 2, hp: 10 } },
  { id: 'malha', name: 'Cota de Malha', slot: 'corpo', price: 450, icon: 'eq-armadura', tint: 0xb8c4d4, stats: { def: 5, hp: 25, speed: -6 } },
  { id: 'manto-sabio', name: 'Manto do Sábio', slot: 'corpo', price: 420, icon: 'eq-manto', tint: 0x4a5ab8, stats: { def: 2, matk: 0.12, regen: 0.2 } },
  { id: 'couro-caca', name: 'Gibão de Caçador', slot: 'corpo', price: 420, icon: 'eq-armadura', tint: 0x5a7a3a, stats: { def: 3, atk: 0.06, flee: 0.03 } },
  // ---- arma
  { id: 'espada-longa', name: 'Espada Longa', slot: 'arma', price: 120, icon: 'eq-espada', tint: 0xdfe5ec, stats: { atk: 0.12 } },
  { id: 'cajado', name: 'Cajado de Carvalho', slot: 'arma', price: 120, icon: 'eq-cajado', tint: 0x9fd0ff, stats: { matk: 0.15 } },
  { id: 'arco', name: 'Arco Composto', slot: 'arma', price: 140, icon: 'eq-arco', tint: 0xc89a5a, stats: { atk: 0.1, crit: 0.03 } },
  { id: 'montante', name: 'Montante Rúnico', slot: 'arma', price: 900, icon: 'eq-espada', tint: 0xffd04a, stats: { atk: 0.3, aspd: -0.05 } },
  { id: 'cetro', name: 'Cetro das Estrelas', slot: 'arma', price: 900, icon: 'eq-cajado', tint: 0xd070ff, stats: { matk: 0.32 } },
  // ---- mão esquerda
  { id: 'broquel', name: 'Broquel', slot: 'escudo', price: 80, icon: 'eq-escudo', tint: 0xa07a50, stats: { def: 2 } },
  { id: 'escudo-torre', name: 'Escudo Torre', slot: 'escudo', price: 500, icon: 'eq-escudo', tint: 0xb8c4d4, stats: { def: 6, hp: 20, speed: -10 } },
  { id: 'grimorio', name: 'Grimório', slot: 'escudo', price: 380, icon: 'eq-livro', tint: 0x9a4a2e, stats: { matk: 0.08, aspd: 0.05 } },
  { id: 'aljava', name: 'Aljava Encantada', slot: 'escudo', price: 380, icon: 'eq-aljava', tint: 0x6a8a4a, stats: { atk: 0.06, aspd: 0.06 } },
  // ---- capa
  { id: 'capa-viagem', name: 'Capa de Viagem', slot: 'capa', price: 70, icon: 'eq-capa', tint: 0x8a6a4a, stats: { flee: 0.02 } },
  { id: 'capuz-sombrio', name: 'Capuz Sombrio', slot: 'capa', price: 420, icon: 'eq-capa', tint: 0x3a2a4a, stats: { flee: 0.05, crit: 0.02 } },
  { id: 'manto-rubi', name: 'Manto Rubi', slot: 'capa', price: 480, icon: 'eq-capa', tint: 0xb3262e, stats: { def: 2, hp: 20 } },
  // ---- calçado
  { id: 'sandalias', name: 'Sandálias', slot: 'calcado', price: 60, icon: 'eq-bota', tint: 0xc8a070, stats: { speed: 10 } },
  { id: 'botas-couro', name: 'Botas de Couro', slot: 'calcado', price: 300, icon: 'eq-bota', tint: 0x6a4a2a, stats: { speed: 15, def: 1 } },
  { id: 'botas-aladas', name: 'Botas Aladas', slot: 'calcado', price: 850, icon: 'eq-bota', tint: 0xe8f0ff, stats: { speed: 30, flee: 0.02 } },
  // ---- acessórios (dois slots)
  { id: 'anel-forca', name: 'Anel da Força', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0xff7a6a, stats: { attrs: { for: 3 } } },
  { id: 'brinco-agil', name: 'Brinco Ágil', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x7ae0a0, stats: { attrs: { agi: 3 } } },
  { id: 'amuleto-vital', name: 'Amuleto Vital', slot: 'acessorio', price: 250, icon: 'eq-colar', tint: 0xffc06a, stats: { attrs: { vit: 3 } } },
  { id: 'anel-mente', name: 'Anel da Mente', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x9a8aff, stats: { attrs: { int: 3 } } },
  { id: 'luva-precisa', name: 'Luva Precisa', slot: 'acessorio', price: 250, icon: 'eq-anel', tint: 0x6ad0ff, stats: { attrs: { des: 3 } } },
  { id: 'trevo', name: 'Trevo da Sorte', slot: 'acessorio', price: 250, icon: 'eq-colar', tint: 0x7aff8a, stats: { attrs: { sor: 3 } } },
  { id: 'ima', name: 'Ímã de Bolso', slot: 'acessorio', price: 180, icon: 'eq-colar', tint: 0xb8c4d4, stats: { magnet: 0.4 } },

  // ---- lendários da loja (meta de zeny do fim do jogo)
  { id: 'lamina-dragao', name: 'Lâmina do Dragão', slot: 'arma', price: 3200, legend: true, icon: 'eq-espada', tint: 0xff6a3a, stats: { atk: 0.45, attrs: { for: 3 } } },
  { id: 'cajado-arcano', name: 'Cajado Arcanista', slot: 'arma', price: 3200, legend: true, icon: 'eq-cajado', tint: 0x7ad8ff, stats: { matk: 0.5, attrs: { int: 3 } } },
  { id: 'arco-elfico', name: 'Arco Élfico', slot: 'arma', price: 3200, legend: true, icon: 'eq-arco', tint: 0x9aff8a, stats: { atk: 0.4, crit: 0.06, attrs: { des: 3 } } },
  { id: 'coroa', name: 'Coroa Real', slot: 'cabeca', price: 2800, legend: true, icon: 'eq-tiara', tint: 0xffd04a, stats: { def: 3, attrs: { for: 2, agi: 2, vit: 2, int: 2, des: 2, sor: 2 } } },
  { id: 'placas', name: 'Armadura de Placas', slot: 'corpo', price: 2400, legend: true, icon: 'eq-armadura', tint: 0xe8eef8, stats: { def: 9, hp: 50, speed: -8 } },
  { id: 'escudo-sagrado', name: 'Escudo Sagrado', slot: 'escudo', price: 2600, legend: true, icon: 'eq-escudo', tint: 0xfff0a0, stats: { def: 8, hp: 30, regen: 0.5 } },
  { id: 'capa-valquiria', name: 'Capa da Valquíria', slot: 'capa', price: 2200, legend: true, icon: 'eq-capa', tint: 0xe8f0ff, stats: { def: 3, hp: 25, flee: 0.04 } },
  { id: 'botas-vento', name: 'Botas do Vento', slot: 'calcado', price: 2400, legend: true, icon: 'eq-bota', tint: 0x9ae8ff, stats: { speed: 40, flee: 0.04, aspd: 0.05 } },
  { id: 'anel-rei', name: 'Anel do Rei', slot: 'acessorio', price: 3000, legend: true, icon: 'eq-anel', tint: 0xffd04a, stats: { attrs: { for: 3, int: 3, des: 3 } } },

  // ---- épicos da loja: o tier mais alto (meta de zeny de longo prazo)
  { id: 'espada-celeste', name: 'Espada Celestial', slot: 'arma', price: 6500, epic: true, icon: 'eq-espada', tint: 0x9ae0ff, stats: { atk: 0.55, crit: 0.05, attrs: { for: 4 } } },
  { id: 'cajado-astral', name: 'Cajado Astral', slot: 'arma', price: 6500, epic: true, icon: 'eq-cajado', tint: 0xc8a0ff, stats: { matk: 0.62, attrs: { int: 4 } } },
  { id: 'arco-celeste', name: 'Arco Celestial', slot: 'arma', price: 6500, epic: true, icon: 'eq-arco', tint: 0xa0e8ff, stats: { atk: 0.5, crit: 0.08, attrs: { des: 4 } } },
  { id: 'martelo-sagrado', name: 'Martelo da Aurora', slot: 'arma', price: 6000, epic: true, icon: 'eq-espada', tint: 0xffe9a0, stats: { atk: 0.4, hp: 40, attrs: { vit: 5 } } },
  { id: 'elmo-celeste', name: 'Elmo Celestial', slot: 'cabeca', price: 5000, epic: true, icon: 'eq-elmo', tint: 0xcfe8ff, stats: { def: 5, hp: 30, attrs: { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 } } },
  { id: 'armadura-celeste', name: 'Armadura Celestial', slot: 'corpo', price: 5500, epic: true, icon: 'eq-armadura', tint: 0xcfe8ff, stats: { def: 12, hp: 70 } },
  { id: 'egide', name: 'Égide Radiante', slot: 'escudo', price: 5500, epic: true, icon: 'eq-escudo', tint: 0xffe9a0, stats: { def: 10, hp: 40, regen: 1 } },
  { id: 'manto-estelar', name: 'Manto Estelar', slot: 'capa', price: 5000, epic: true, icon: 'eq-capa', tint: 0x6a7ad0, stats: { def: 4, flee: 0.06, atk: 0.08, matk: 0.08 } },
  { id: 'botas-hermes', name: 'Botas Aladas de Prata', slot: 'calcado', price: 5000, epic: true, icon: 'eq-bota', tint: 0xe8f0ff, stats: { speed: 50, flee: 0.05, aspd: 0.08 } },
  { id: 'anel-celeste', name: 'Anel Celestial', slot: 'acessorio', price: 8000, epic: true, icon: 'eq-anel', tint: 0x9ae0ff, stats: { attrs: { for: 4, agi: 4, vit: 4, int: 4, des: 4, sor: 4 } } },
  { id: 'amuleto-vida', name: 'Amuleto da Vida Eterna', slot: 'acessorio', price: 4500, epic: true, icon: 'eq-colar', tint: 0x9aff8a, stats: { hp: 60, regen: 1, attrs: { vit: 4 } } },

  // ---- conjunto do Arquimago (loja, épico): magia forte, junto com o Cajado Astral
  { id: 'chapeu-arquimago', name: 'Chapéu do Arquimago', slot: 'cabeca', price: 4500, epic: true, icon: 'eq-chapeu', tint: 0x6a5ad8, stats: { def: 2, matk: 0.15, attrs: { int: 2 } } },
  { id: 'vestes-arquimago', name: 'Vestes do Arquimago', slot: 'corpo', price: 5000, epic: true, icon: 'eq-manto', tint: 0x5a4ac8, stats: { def: 4, hp: 30, matk: 0.18, regen: 0.5 } },
  { id: 'tomo-arquimago', name: 'Tomo do Arquimago', slot: 'escudo', price: 4800, epic: true, icon: 'eq-livro', tint: 0x7a6aff, stats: { matk: 0.14, aspd: 0.08, attrs: { int: 2 } } },

  // ---- conjunto do Abismo: só cai dos chefes e mini-chefes (o set mágico mais forte do jogo)
  { id: 'coroa-abismo', name: 'Coroa do Abismo', slot: 'cabeca', price: 0, drop: { monster: 'bafome', chance: 0.2 }, icon: 'eq-tiara', tint: 0x8a3aff, stats: { def: 3, matk: 0.2, attrs: { int: 3 } } },
  { id: 'orbe-abismo', name: 'Orbe do Abismo', slot: 'escudo', price: 0, drop: { monster: 'minotauro', chance: 0.2 }, icon: 'eq-livro', tint: 0x6a2ad0, stats: { matk: 0.18, aspd: 0.1, attrs: { int: 3 } } },
  { id: 'vestes-abismo', name: 'Vestes do Abismo', slot: 'corpo', price: 0, drop: { monster: 'lich', chance: 0.2 }, icon: 'eq-manto', tint: 0x3a1a6a, stats: { def: 6, hp: 50, matk: 0.22 } },
  { id: 'sapatilhas-abismo', name: 'Sapatilhas do Abismo', slot: 'calcado', price: 0, drop: { monster: 'aranha', chance: 0.15 }, icon: 'eq-bota', tint: 0x5a2a9a, stats: { speed: 25, flee: 0.04, matk: 0.1 } },
  { id: 'selo-abismo', name: 'Selo do Abismo', slot: 'acessorio', price: 0, drop: { monster: 'zumbi', chance: 0.15 }, icon: 'eq-anel', tint: 0x9a4aff, stats: { matk: 0.12, attrs: { int: 4 } } },

  // ---- raros: só caem dos monstros (chance multiplicada pela Sorte)
  { id: 'foice-bafome', name: 'Foice do Bafome', slot: 'arma', price: 0, drop: { monster: 'bafome', chance: 0.35 }, icon: 'eq-espada', tint: 0x9a3a4a, stats: { atk: 0.38, crit: 0.05, attrs: { for: 2 } } },
  { id: 'manto-infernal', name: 'Manto Infernal', slot: 'capa', price: 0, drop: { monster: 'bafome', chance: 0.35 }, icon: 'eq-capa', tint: 0x5a1a2a, stats: { def: 3, atk: 0.1, matk: 0.1 } },
  { id: 'machado-minotauro', name: 'Machado do Minotauro', slot: 'arma', price: 0, drop: { monster: 'minotauro', chance: 0.35 }, icon: 'eq-espada', tint: 0xa87a4a, stats: { atk: 0.42, hp: 20, aspd: -0.06 } },
  { id: 'botas-brutas', name: 'Botas Brutas', slot: 'calcado', price: 0, drop: { monster: 'minotauro', chance: 0.35 }, icon: 'eq-bota', tint: 0x7a4a2a, stats: { speed: 20, def: 2, hp: 20 } },
  { id: 'mortalha', name: 'Mortalha do Carniçal', slot: 'corpo', price: 0, drop: { monster: 'zumbi', chance: 0.25 }, icon: 'eq-manto', tint: 0x6a7a5a, stats: { def: 4, hp: 30, regen: 0.5 } },
  { id: 'cajado-osso', name: 'Cajado de Ossos', slot: 'arma', price: 0, drop: { monster: 'zumbi', chance: 0.25 }, icon: 'eq-cajado', tint: 0xe8e0c8, stats: { matk: 0.36, crit: 0.03 } },
  { id: 'elmo-negro', name: 'Elmo Negro', slot: 'cabeca', price: 0, drop: { monster: 'cavaleiro-negro', chance: 0.05 }, icon: 'eq-elmo', tint: 0x3a3a4a, stats: { def: 4, hp: 15, atk: 0.06 } },
  { id: 'colar-presas', name: 'Colar de Presas', slot: 'acessorio', price: 0, drop: { monster: 'orc', chance: 0.0015 }, icon: 'eq-colar', tint: 0xe8d8b0, stats: { attrs: { for: 2, vit: 2 } } },
  { id: 'brinco-morcego', name: 'Brinco de Morcego', slot: 'acessorio', price: 0, drop: { monster: 'morcego', chance: 0.001 }, icon: 'eq-anel', tint: 0x5a4a6a, stats: { flee: 0.03, attrs: { agi: 2 } } },
  { id: 'veu-fantasma', name: 'Véu Fantasma', slot: 'capa', price: 0, drop: { monster: 'fantasma', chance: 0.0015 }, icon: 'eq-capa', tint: 0xc8d0ff, stats: { flee: 0.06, matk: 0.05 } },
  { id: 'escudo-ossos', name: 'Escudo de Ossos', slot: 'escudo', price: 0, drop: { monster: 'esqueleto', chance: 0.0015 }, icon: 'eq-escudo', tint: 0xe8e0c8, stats: { def: 4, hp: 10 } },
  { id: 'chapeu-cogumelo', name: 'Chapéu de Cogumelo', slot: 'cabeca', price: 0, drop: { monster: 'cogumelo', chance: 0.0015 }, icon: 'eq-chapeu', tint: 0xd04a3a, stats: { hp: 25, regen: 0.3 } },
  // ---- míticas: armas super raras dos chefes (3% na 1ª vez; a chance sobe a cada volta do chefe). Equipada, o herói brilha.
  { id: 'ceifadora-abissal', name: 'Ceifadora Abissal', slot: 'arma', price: 0, drop: { monster: 'bafome', chance: 0.03 }, glow: 0xff3a8a, icon: 'eq-espada', tint: 0xff3a8a, stats: { atk: 0.6, crit: 0.08, attrs: { for: 4 } } },
  { id: 'cetro-eclipse', name: 'Cetro do Eclipse', slot: 'arma', price: 0, drop: { monster: 'bafome', chance: 0.03 }, glow: 0xb070ff, icon: 'eq-cajado', tint: 0xb070ff, stats: { matk: 0.7, attrs: { int: 4 } } },
  { id: 'martelo-titas', name: 'Martelo dos Titãs', slot: 'arma', price: 0, drop: { monster: 'minotauro', chance: 0.03 }, glow: 0xffa030, icon: 'eq-espada', tint: 0xffa030, stats: { atk: 0.65, hp: 40, attrs: { vit: 4 } } },
  { id: 'arco-tempestade', name: 'Arco da Tempestade', slot: 'arma', price: 0, drop: { monster: 'minotauro', chance: 0.03 }, glow: 0x7ae0ff, icon: 'eq-arco', tint: 0x7ae0ff, stats: { atk: 0.55, crit: 0.08, aspd: 0.08, attrs: { des: 4 } } },
  { id: 'foice-almas', name: 'Foice das Almas', slot: 'arma', price: 0, drop: { monster: 'lich', chance: 0.03 }, glow: 0x6aff9a, icon: 'eq-espada', tint: 0x6aff9a, stats: { atk: 0.55, matk: 0.55, crit: 0.1, attrs: { sor: 5 } } },
  { id: 'coroa-ossaria', name: 'Coroa Ossária', slot: 'cabeca', price: 0, drop: { monster: 'lich', chance: 0.35 }, icon: 'eq-tiara', tint: 0xe8e0c8, stats: { def: 4, hp: 25, matk: 0.12 } },
  { id: 'manto-almas', name: 'Manto das Almas', slot: 'capa', price: 0, drop: { monster: 'lich', chance: 0.35 }, icon: 'eq-capa', tint: 0x2a3a2a, stats: { flee: 0.05, atk: 0.08, matk: 0.08 } },
  { id: 'presa-magma', name: 'Presa de Magma', slot: 'acessorio', price: 0, drop: { monster: 'aranha', chance: 0.25 }, icon: 'eq-colar', tint: 0xff6a20, stats: { atk: 0.08, matk: 0.08, attrs: { des: 2 } } },
  { id: 'seda-rainha', name: 'Capa de Seda Rubra', slot: 'capa', price: 0, drop: { monster: 'aranha', chance: 0.25 }, icon: 'eq-capa', tint: 0xb02a1a, stats: { def: 2, flee: 0.05, speed: 10 } },
  { id: 'pele-lobo', name: 'Capa de Pele de Lobo', slot: 'capa', price: 0, drop: { monster: 'lobo', chance: 0.0015 }, icon: 'eq-capa', tint: 0x8a96a8, stats: { flee: 0.03, speed: 12, attrs: { agi: 1 } } },
  { id: 'coroa-folhas', name: 'Coroa de Folhas', slot: 'cabeca', price: 0, drop: { monster: 'arvore', chance: 0.003 }, icon: 'eq-tiara', tint: 0x6ac04a, stats: { hp: 25, regen: 0.4, def: 1 } },
  { id: 'lamina-negra', name: 'Lâmina Negra', slot: 'arma', price: 0, drop: { monster: 'cavaleiro-negro', chance: 0.04 }, icon: 'eq-espada', tint: 0x4a4a6a, stats: { atk: 0.35, crit: 0.04, attrs: { for: 2 } } },
  { id: 'amuleto-bafome', name: 'Amuleto Profano', slot: 'acessorio', price: 0, drop: { monster: 'bafome', chance: 0.25 }, icon: 'eq-colar', tint: 0x9a2a4a, stats: { atk: 0.1, matk: 0.1, crit: 0.02 } },
  { id: 'escudo-minotauro', name: 'Escudo do Labirinto', slot: 'escudo', price: 0, drop: { monster: 'minotauro', chance: 0.3 }, icon: 'eq-escudo', tint: 0x8a5a2a, stats: { def: 7, hp: 35, attrs: { vit: 2 } } },
  { id: 'grimorio-almas', name: 'Grimório das Almas', slot: 'escudo', price: 0, drop: { monster: 'lich', chance: 0.3 }, icon: 'eq-livro', tint: 0x6aff9a, stats: { matk: 0.15, aspd: 0.06, attrs: { int: 3 } } },
  { id: 'anel-carnical', name: 'Anel Pútrido', slot: 'acessorio', price: 0, drop: { monster: 'zumbi', chance: 0.2 }, icon: 'eq-anel', tint: 0x7a8a5a, stats: { regen: 0.6, attrs: { vit: 3 } } },
  { id: 'botas-seda', name: 'Botas de Seda Rubra', slot: 'calcado', price: 0, drop: { monster: 'aranha', chance: 0.2 }, icon: 'eq-bota', tint: 0xb02a1a, stats: { speed: 25, flee: 0.03, attrs: { agi: 2 } } },
  { id: 'gema-gosmenta', name: 'Gema Gosmenta', slot: 'acessorio', price: 0, drop: { monster: 'gosma', chance: 0.001 }, icon: 'eq-colar', tint: 0x5ab0ff, stats: { magnet: 0.3, attrs: { sor: 2 } } },
];

/** Zeny recebido quando cai um raro que você já tem */
export const RARE_DUPLICATE_ZENY = 250;

/**
 * Conjuntos: equipar todas as peças dá um bônus extra.
 */
export interface SetDef { id: string; name: string; items: string[]; bonus: EquipStats }
export const SETS: SetDef[] = [
  { id: 'andarilho', name: 'Andarilho', items: ['gorro', 'capa-viagem', 'sandalias'], bonus: { speed: 15, magnet: 0.2 } },
  { id: 'cacador', name: 'Caçador', items: ['couro-caca', 'aljava', 'arco'], bonus: { atk: 0.1, flee: 0.04 } },
  { id: 'sabio', name: 'Sábio', items: ['tiara', 'manto-sabio', 'grimorio'], bonus: { matk: 0.15, regen: 0.5 } },
  { id: 'ferro', name: 'Guardião de Ferro', items: ['elmo', 'malha', 'escudo-torre'], bonus: { def: 4, hp: 40 } },
  { id: 'demonio', name: 'Pacto Demoníaco', items: ['chifres', 'foice-bafome', 'manto-infernal'], bonus: { atk: 0.15, matk: 0.15, crit: 0.05 } },
  { id: 'real', name: 'Realeza', items: ['coroa', 'anel-rei', 'capa-valquiria'], bonus: { attrs: { for: 3, agi: 3, vit: 3, int: 3, des: 3, sor: 3 } } },
  { id: 'celeste', name: 'Celestial', items: ['elmo-celeste', 'armadura-celeste', 'manto-estelar'], bonus: { atk: 0.12, matk: 0.12, hp: 60 } },
  { id: 'seda', name: 'Seda Rubra', items: ['seda-rainha', 'botas-seda', 'presa-magma'], bonus: { speed: 20, flee: 0.05, crit: 0.04 } },
  { id: 'arquimago', name: 'Arquimago', items: ['chapeu-arquimago', 'vestes-arquimago', 'tomo-arquimago', 'cajado-astral'], bonus: { matk: 0.25, aspd: 0.1, attrs: { int: 5 } } },
  { id: 'abismo', name: 'Soberano do Abismo', items: ['coroa-abismo', 'vestes-abismo', 'orbe-abismo', 'sapatilhas-abismo', 'selo-abismo'], bonus: { matk: 0.4, aspd: 0.15, crit: 0.05, hp: 60, attrs: { int: 8 } } },
  { id: 'guardiao', name: 'Guardião do Labirinto', items: ['escudo-minotauro', 'botas-brutas', 'machado-minotauro'], bonus: { def: 5, hp: 60, atk: 0.1 } },
];

/** Conjuntos completos com o que está equipado */
export function activeSets(equip: Partial<Record<string, string>>) {
  const on = new Set(Object.values(equip));
  return SETS.filter((st) => st.items.every((id) => on.has(id)));
}

/**
 * Coleção: quanto mais itens diferentes você tiver (comprados ou de drop),
 * mais bônus permanentes (valem em todas as partidas, mesmo sem equipar).
 */
export const COLLECTION: { count: number; desc: string; bonus: EquipStats }[] = [
  { count: 10, desc: '+20 de Vida', bonus: { hp: 20 } },
  { count: 20, desc: '+5% de dano (físico e mágico)', bonus: { atk: 0.05, matk: 0.05 } },
  { count: 30, desc: '+1 em todos os atributos', bonus: { attrs: { for: 1, agi: 1, vit: 1, int: 1, des: 1, sor: 1 } } },
  { count: 40, desc: '+10% de velocidade de ataque', bonus: { aspd: 0.1 } },
  { count: 55, desc: '+10% de dano (físico e mágico)', bonus: { atk: 0.1, matk: 0.1 } },
  { count: 70, desc: '+2 em todos os atributos', bonus: { attrs: { for: 2, agi: 2, vit: 2, int: 2, des: 2, sor: 2 } } },
  { count: EQUIPMENT.length, desc: 'Coleção completa: +3 em todos os atributos', bonus: { attrs: { for: 3, agi: 3, vit: 3, int: 3, des: 3, sor: 3 } } },
];

/** Bônus da coleção alcançados com esta quantidade de itens */
export const collectionBonuses = (owned: number) => COLLECTION.filter((m) => owned >= m.count);

export const equipById = (id: string | null | undefined) => (id ? EQUIPMENT.find((e) => e.id === id) : undefined);

/** Slot do item → slots da janela onde ele pode ir */
export function slotsFor(slot: ItemSlot): Slot[] {
  return slot === 'acessorio' ? ['acessorio1', 'acessorio2'] : [slot];
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const ATTR_SHORT: Record<Attr, string> = { for: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', des: 'DES', sor: 'SOR' };

/** Texto curto com os efeitos do item */
export function describe(stats: EquipStats) {
  const out: string[] = [];
  if (stats.atk) out.push(`Atq ${pct(stats.atk)}`);
  if (stats.matk) out.push(`Matq ${pct(stats.matk)}`);
  if (stats.def) out.push(`Def +${stats.def}`);
  if (stats.hp) out.push(`Vida +${stats.hp}`);
  if (stats.speed) out.push(`Mov ${stats.speed > 0 ? '+' : ''}${stats.speed}`);
  if (stats.crit) out.push(`Crít ${pct(stats.crit)}`);
  if (stats.flee) out.push(`Esquiva ${pct(stats.flee)}`);
  if (stats.aspd) out.push(`Vel. ataque ${pct(stats.aspd)}`);
  if (stats.regen) out.push(`Regen +${stats.regen}/s`);
  if (stats.magnet) out.push(`Coleta ${pct(stats.magnet)}`);
  for (const [a, v] of Object.entries(stats.attrs ?? {})) out.push(`${ATTR_SHORT[a as Attr]} +${v}`);
  return out.join(', ');
}
