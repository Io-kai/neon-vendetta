// NEON VENDETTA — Hero signature weapons. Each hero fights with an innate,
// unbreakable weapon built around their identity; ground pickups still
// override it temporarily (Item.ts WEAPON_DEFS) until they break.
//
// Keep this module free of runtime imports: the headless combat-checks
// harness loads it through a minimal require() stub.

export interface HeroSwing {
  frames: [string, string, string]; // windup, active, recover pose frames
  windup: number;        // ticks before the strike goes live
  swing: number;         // ticks the hitbox stays live
  recover: number;       // ticks after the strike
  reach: number;         // forward reach from attacker center (world px)
  width: number;         // hitbox width
  dmg: number;           // base damage (multiplied by hero power)
  move: number;          // forward drift per tick while the strike is live
  heavy?: boolean;       // heavy hitstop + sfx
  launch?: boolean;      // launcher / knockdown
  stun?: number;         // paralyze ticks instead of launch (baton)
  shockwave?: number;    // radial ground shockwave on connect (sledge)
  slash?: number;        // crescent slash-arc FX radius (mono-edge)
}

export interface HeroWeaponDef {
  id: string;
  name: string;          // flavor name shown in docs
  texture: string;       // baked texture key (`wpn_<id>`)
  grip: number;          // sprite origin X — the hand holds it here (0..1)
  idleAngle: number;     // carry angle (degrees, facing right)
  swingAngle: number;    // mid-swing angle (degrees, facing right)
  idleX: number; idleY: number;   // carry offset from fighter origin
  swingX: number; swingY: number; // mid-swing offset from fighter origin
  combo: HeroSwing[];
}

export const HERO_WEAPONS: Record<string, HeroWeaponDef> = {
  // KANE — "STREETLIGHT" stun baton. Ex-security riot tool: measured reach,
  // and an arc finisher that paralyzes survivors where they stand.
  kane: {
    id: 'baton', name: 'STREETLIGHT', texture: 'wpn_baton', grip: 0.16,
    idleAngle: 65, swingAngle: 8,
    idleX: 11, idleY: 33, swingX: 28, swingY: 38,
    combo: [
      { frames: ['jabWindup', 'jab', 'jabRecover'],       windup: 4, swing: 5, recover: 6,  reach: 38, width: 28, dmg: 8,  move: 1.3 },
      { frames: ['crossWindup', 'cross', 'crossRecover'], windup: 4, swing: 5, recover: 7,  reach: 40, width: 28, dmg: 9,  move: 1.6 },
      { frames: ['swingWindup', 'swing', 'swingRecover'], windup: 7, swing: 7, recover: 10, reach: 44, width: 30, dmg: 14, move: 1.2, heavy: true, stun: 50 },
    ],
  },
  // JINX — "YELLOWLINE" mono-edge. Courier blade: fastest chain in the game,
  // every cut pulls her forward, and the finisher is a dash-through slash
  // that launches everything in a long line.
  jinx: {
    id: 'monoedge', name: 'YELLOWLINE', texture: 'wpn_monoedge', grip: 0.13,
    idleAngle: 55, swingAngle: -6,
    idleX: 11, idleY: 33, swingX: 30, swingY: 36,
    combo: [
      { frames: ['jabWindup', 'jab', 'jabRecover'],       windup: 3, swing: 4, recover: 5, reach: 36, width: 26, dmg: 6,  move: 1.7 },
      { frames: ['crossWindup', 'cross', 'crossRecover'], windup: 3, swing: 4, recover: 5, reach: 38, width: 26, dmg: 7,  move: 1.9 },
      { frames: ['swingWindup', 'swing', 'swingRecover'], windup: 5, swing: 6, recover: 8, reach: 50, width: 28, dmg: 12, move: 3.2, heavy: true, launch: true, slash: 34 },
    ],
  },
  // BULL — "FOUNDATION" hydraulic sledge. Two colossal hits: a sweeping hook
  // and an overhead crusher whose impact detonates a ground shockwave that
  // launches everyone standing nearby.
  bull: {
    id: 'sledge', name: 'FOUNDATION', texture: 'wpn_sledge', grip: 0.1,
    idleAngle: 75, swingAngle: 15,
    idleX: 12, idleY: 34, swingX: 26, swingY: 40,
    combo: [
      { frames: ['crossWindup', 'cross', 'crossRecover'], windup: 7, swing: 7, recover: 9,  reach: 46, width: 34, dmg: 14, move: 1.0, heavy: true },
      { frames: ['slamWindup', 'slam', 'slamRecover'],    windup: 9, swing: 8, recover: 12, reach: 42, width: 34, dmg: 22, move: 0.6, heavy: true, launch: true, shockwave: 72 },
    ],
  },
};
