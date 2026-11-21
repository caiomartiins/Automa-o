import Phaser from 'phaser';

export type PickupKind = 'xp' | 'comida';

/** Gema de XP ou comida no chão (também reutilizada via pooling). */
export class Pickup extends Phaser.GameObjects.Image {
  kind: PickupKind = 'xp';
  value = 1;
  magnetized = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'gem1');
  }

  place(kind: PickupKind, value: number, x: number, y: number) {
    this.kind = kind;
    this.value = value;
    this.magnetized = false;
    const tex = kind === 'comida' ? 'comida' : value >= 10 ? 'gem3' : value >= 3 ? 'gem2' : 'gem1';
    this.setTexture(tex).setScale(0.5).setPosition(x, y).setActive(true).setVisible(true).setDepth(-100000);
  }

  release() {
    this.setActive(false).setVisible(false);
  }
}
