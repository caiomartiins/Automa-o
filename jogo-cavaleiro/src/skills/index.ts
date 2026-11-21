import type { GameScene } from '../scenes/GameScene';
import type { SkillId } from '../data/skills';
import type { Skill } from './Skill';
import { SwordSkill } from './SwordSkill';
import { ShieldSkill } from './ShieldSkill';
import { LanceSkill } from './LanceSkill';

export function createSkill(id: SkillId, g: GameScene): Skill {
  switch (id) {
    case 'espada': return new SwordSkill(g);
    case 'escudo': return new ShieldSkill(g);
    case 'lanca': return new LanceSkill(g);
  }
}
