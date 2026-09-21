// NEON VENDETTA — ground pickups: food (heal), cash (score), weapons.

import Phaser from 'phaser';

export type ItemKind = 'pipe' | 'knife' | 'bat' | 'katana' | 'baton' | 'monoedge' | 'sledge' | 'ramen' | 'soda' | 'cash';
export interface ItemDef {
  kind: ItemKind;
  heal?: number;
  score?: number;
  uses?: number;
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  pipe:  { kind: 'pipe',  uses: 6 },
  knife: { kind: 'knife', uses: 5 },
  bat:   { kind: 'bat',   uses: 8 },
  katana:{ kind: 'katana',uses: 4 },
  baton:   { kind: 'baton',   uses: 10 },
  monoedge:{ kind: 'monoedge',uses: 6 },
  sledge:  { kind: 'sledge',  uses: 4 },
  ramen: { kind: 'ramen', heal: 50 },
  soda:  { kind: 'soda',  heal: 20 },
  cash:  { kind: 'cash',  score: 300 },
};

/** Per-weapon swing behavior + held-sprite geometry. Presence here marks the
 *  item kind as a weapon. */
export interface WeaponDef {
  dmg: number; reach: number; width: number;
  launch: boolean; heavy: boolean;
  windup: number; swing: number; recover: number;
  stun?: number;        // paralyze ticks instead of launch (baton)
  slash?: number;       // crescent slash-arc FX radius (mono-edge)
  shockwave?: number;   // radial ground shockwave on first connect (sledge)
  move?: number;        // forward drift per tick while live (default 1.4)
  arc?: 'swing' | 'smash' | 'stab'; // swing animation path (default 'swing')
  // held-sprite geometry (the grip is pinned to the fist each frame)
  grip?: number;        // sprite origin X — the hand holds it here
  idleAngle?: number;   // carry angle, tip-up negative (degrees, facing right)
  swingAngle?: number;  // follow-through angle at the end of the arc
}

export const WEAPON_DEFS: Partial<Record<ItemKind, WeaponDef>> = {
  pipe:   { dmg: 15, reach: 48, width: 30, launch: true,  heavy: true,  windup: 6, swing: 6, recover: 8 },
  knife:  { dmg: 11, reach: 40, width: 26, launch: false, heavy: false, windup: 4, swing: 5, recover: 6,
            arc: 'stab', idleAngle: -70, swingAngle: 0 },
  bat:    { dmg: 13, reach: 56, width: 32, launch: false, heavy: true,  windup: 7, swing: 7, recover: 9 },
  katana: { dmg: 22, reach: 46, width: 28, launch: true,  heavy: true,  windup: 5, swing: 6, recover: 8, swingAngle: -6 },
  // STREETLIGHT stun baton — arc hits paralyze survivors upright.
  baton:  { dmg: 11, reach: 46, width: 30, launch: false, heavy: true,  windup: 6, swing: 6, recover: 8,
            stun: 35, grip: 0.16, swingAngle: 8 },
  // YELLOWLINE mono-edge — dash-through slashes that launch.
  monoedge:{ dmg: 16, reach: 50, width: 28, launch: true, heavy: true,  windup: 4, swing: 6, recover: 7,
            slash: 34, move: 2.6, grip: 0.13, swingAngle: -6 },
  // FOUNDATION hydraulic sledge — overhead smash; impact detonates a shockwave.
  sledge: { dmg: 24, reach: 42, width: 34, launch: true,  heavy: true,  windup: 9, swing: 8, recover: 12,
            shockwave: 72, arc: 'smash', grip: 0.1, idleAngle: 68, swingAngle: 72 },
};

/** Glow color per weapon kind (falls back to the generic weapon blue). */
export const WEAPON_GLOW: Partial<Record<ItemKind, number>> = {
  baton: 0x5df2ff,
  monoedge: 0x5df2ff,
  sledge: 0xffd858,
};

export class Item {
  def: ItemDef;
  sprite: Phaser.GameObjects.Image;
  fx: number;
  fy: number;
  taken = false;
  /** Remaining durability when re-dropped from a player's hand. */
  usesLeft?: number;
  private bobT: number;
  private glow: Phaser.GameObjects.Ellipse;
  private glint: Phaser.GameObjects.Star;

  constructor(scene: Phaser.Scene, kind: ItemKind, x: number, y: number, usesLeft?: number) {
    this.def = ITEM_DEFS[kind];
    this.usesLeft = usesLeft;
    this.fx = x;
    this.fy = y;
    this.bobT = Math.random() * 60;
    const color = kind === 'ramen' || kind === 'soda' ? 0x7cffcd : kind === 'cash' ? 0xffd284 : (WEAPON_GLOW[kind] ?? 0x9dc9ff);
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
