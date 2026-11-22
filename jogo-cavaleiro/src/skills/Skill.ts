import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../objects/Enemy';
import type { SkillId } from '../data/skills';

export { FX_DEPTH } from '../fx';

export abstract class Skill {
  abstract readonly id: SkillId;
  level = 1;
  /** Array reaproveitado nas buscas de inimigos próximos */
  protected near: Enemy[] = [];

  constructor(protected g: GameScene) {}

  /** Chamado todo frame com o delta em ms */
  abstract update(dt: number): void;

  levelUp() {
    this.level++;
    this.onLevelChanged();
  }

  protected onLevelChanged() {}

  /** Lança a habilidade agora (Lembrança Arcana do Professor) */
  trigger() {}

  destroy() {}
}
