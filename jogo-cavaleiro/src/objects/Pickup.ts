import Phaser from 'phaser';

import { ITEMS, type ItemKind } from '../data/rpg';

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
    const tex = kind === 'comida' ? 'comida' : kind === 'xp' ? (value >= 10 ? 'gem3' : value >= 3 ? 'gem2' : 'gem1') : ITEMS[kind]!.texture;
    this.setTexture(tex).setScale(0.5).setPosition(x, y).setActive(true).setVisible(true).setDepth(-100000);
  }

  release() {
    this.setActive(false).setVisible(false);
  }
}
