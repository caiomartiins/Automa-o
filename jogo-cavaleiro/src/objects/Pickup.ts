import Phaser from 'phaser';

import { ITEMS, type ItemKind } from '../data/rpg';
import { equipById } from '../data/equipment';

export type PickupKind = ItemKind;

/** Gema de XP ou comida no chão (também reutilizada via pooling). */
export class Pickup extends Phaser.GameObjects.Image {
  kind: PickupKind = 'xp';
  value = 1;
  magnetized = false;
  /** Id extra (qual carta, qual ovo) */
  extra = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'gem1');
  }

  place(kind: PickupKind, value: number, x: number, y: number, extra = '') {
    this.kind = kind;
    this.value = value;
    this.extra = extra;
    this.magnetized = false;
    // equipamento raro: o próprio ícone do item, maior e colorido
    const eq = kind === 'equip' ? equipById(extra) : undefined;
    const tex = eq ? eq.icon : kind === 'comida' ? 'comida' : kind === 'xp' ? (value >= 10 ? 'gem3' : value >= 3 ? 'gem2' : 'gem1') : ITEMS[kind]!.texture;
    this.setTexture(tex).setScale(eq ? 0.75 : 0.5).setPosition(x, y).setActive(true).setVisible(true).setDepth(-100000);
    if (eq) this.setTint(eq.tint);
    else this.clearTint();
  }

  release() {
    this.setActive(false).setVisible(false);
  }
}
