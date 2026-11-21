import type { GameScene } from '../scenes/GameScene';
import type { SkillId } from '../data/skills';
import type { Skill } from './Skill';
import { SwordSkill } from './SwordSkill';
import { ShieldSkill } from './ShieldSkill';
import { LanceSkill } from './LanceSkill';
import { FireballSkill } from './FireballSkill';
import { LightningSkill } from './LightningSkill';
import { MeteorSkill } from './MeteorSkill';
import { ArrowSkill } from './ArrowSkill';
import { ArrowRainSkill } from './ArrowRainSkill';
import { SniperSkill } from './SniperSkill';

const FACTORIES: Record<SkillId, new (g: GameScene) => Skill> = {
  espada: SwordSkill,
  escudo: ShieldSkill,
  lanca: LanceSkill,
  fogo: FireballSkill,
  raio: LightningSkill,
  meteoro: MeteorSkill,
  flecha: ArrowSkill,
  chuva: ArrowRainSkill,
  tiro: SniperSkill,
};

export function createSkill(id: SkillId, g: GameScene): Skill {
  return new FACTORIES[id](g);
}
