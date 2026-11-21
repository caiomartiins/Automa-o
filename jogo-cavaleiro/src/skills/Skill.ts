import type { GameScene } from '../scenes/GameScene';
import type { Enemy } from '../objects/Enemy';
import type { SkillId } from '../data/skills';

export const FX_DEPTH = 1_000_000;

export abstract class Skill {
  abstract readonly id: SkillId;
  level = 1;

  constructor(protected g: GameScene) {}

  /** Chamado todo frame com o delta em ms */
  abstract update(dt: number): void;

  levelUp() {
    this.level++;
    this.onLevelChanged();
  }

  protected onLevelChanged() {}

  destroy() {}

  /** Lista dos inimigos vivos */
  protected enemies(): Enemy[] {
    return (this.g.enemies.getChildren() as Enemy[]).filter((e) => e.active);
  }
}
