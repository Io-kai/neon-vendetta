// NEON VENDETTA — ground pickups: food (heal), cash (score), weapons.

import Phaser from 'phaser';

export type ItemKind = 'pipe' | 'knife' | 'ramen' | 'soda' | 'cash';

export interface ItemDef {
  kind: ItemKind;
  heal?: number;
  score?: number;
  uses?: number;
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  pipe:  { kind: 'pipe',  uses: 6 },
  knife: { kind: 'knife', uses: 5 },
  ramen: { kind: 'ramen', heal: 50 },
  soda:  { kind: 'soda',  heal: 20 },
  cash:  { kind: 'cash',  score: 300 },
};

export class Item {
  def: ItemDef;
  sprite: Phaser.GameObjects.Image;
  fx: number;
  fy: number;
  taken = false;
  private bobT: number;
  private glow: Phaser.GameObjects.Ellipse;
  private glint: Phaser.GameObjects.Star;

  constructor(scene: Phaser.Scene, kind: ItemKind, x: number, y: number) {
    this.def = ITEM_DEFS[kind];
    this.fx = x;
    this.fy = y;
    this.bobT = Math.random() * 60;
    const color = kind === 'ramen' || kind === 'soda' ? 0x7cffcd : kind === 'cash' ? 0xffd284 : 0x9dc9ff;
    this.glow = scene.add.ellipse(x, y + 1, 27, 7, color, 0.16).setDepth(y - 1);
    this.glint = scene.add.star(x + 8, y - 12, 4, 1, 4, color).setDepth(y + 1);
    this.sprite = scene.add.image(x, y, `item_${kind}`);
    this.sprite.setScale(2);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(y - 0.5);
  }

  step(): void {
    this.bobT++;
    const bob = Math.sin(this.bobT / 22) * 2;
    this.sprite.setPosition(Math.round(this.fx), Math.round(this.fy + bob));
    this.glow.setAlpha(0.10 + (bob + 2) * 0.025);
    this.glint.setPosition(this.fx + 8, this.fy - 14 + bob).setAlpha(Math.max(0, Math.sin(this.bobT / 13)));
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
    this.glint.destroy();
  }
}
