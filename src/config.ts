// NEON VENDETTA — global game constants & shared types
// An original 16-bit style beat 'em up inspired by the Genesis-era brawlers
// (Streets of Rage 2, Final Fight, Paprium). All art, music and code are original.

export const GAME_W = 480;
export const GAME_H = 270;

// The brawler "ground plane": lane Y range the fighters can walk in.
export const LANE_TOP = 176;
export const LANE_BOTTOM = 238;

export const GRAVITY = 0.55;       // z-axis (jump) gravity per frame
export const HITSTOP_LIGHT = 4;    // freeze frames on light hit
export const HITSTOP_HEAVY = 8;    // freeze frames on launcher/knockdown hit

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  difficulty: Difficulty;
  crt: boolean;
  music: boolean;
  sfx: boolean;
  story: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  crt: true,
  music: true,
  sfx: true,
  story: true,
};

// Difficulty modifiers applied to enemy stats
export const DIFF_TABLE: Record<Difficulty, { hp: number; dmg: number; aggro: number }> = {
  easy:   { hp: 0.75, dmg: 0.6, aggro: 0.7 },
  normal: { hp: 1.0,  dmg: 1.0, aggro: 1.0 },
  hard:   { hp: 1.35, dmg: 1.5, aggro: 1.4 },
};

export interface PlayerChoice {
  charId: string;   // 'kane' | 'jinx' | 'bull'
  players: 1 | 2;
  settings: GameSettings;
}

// Physics-ish rectangle used for hit tests on the ground plane + z height.
export interface HitBox {
  x: number;      // center x
  y: number;      // lane y
  hw: number;     // half width
  hh: number;     // half lane depth
  z0: number;     // bottom of vertical range (height above ground)
  z1: number;     // top of vertical range
}

export function boxesOverlap(a: HitBox, b: HitBox): boolean {
  return (
    Math.abs(a.x - b.x) < a.hw + b.hw &&
    Math.abs(a.y - b.y) < a.hh + b.hh &&
    a.z0 < b.z1 && b.z0 < a.z1
  );
}
