import type { GameScene } from '../scenes/GameScene';

/** Uma opção nas telas de escolha (hoje usada só na escolha de classe) */
export interface Upgrade {
  id: string;
  title: string;
  desc: string;
  color: number;
  apply: (g: GameScene) => void;
  /** Personagem mostrado na carta */
  icon?: string;
}
