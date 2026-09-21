// NEON VENDETTA — Fighter: shared combat/physics base for players & enemies.
// Classic belt-scroll brawler model: x = world position, y = lane depth,
// z = height above ground (jumps/launches). Fixed 60Hz logic ticks.

import Phaser from 'phaser';
import { GRAVITY, HitBox, LANE_BOTTOM, LANE_TOP } from '../config';
import { CHAR_ART } from '../art/parts';
import { FIGHTER_TEXTURE_SCALE } from '../art/fighters';

export interface HitSpec {
  reach: number;        // forward reach from attacker center (world px)
  width: number;        // hitbox width
  dmg: number;
  launch?: boolean;     // launcher / knockdown
  heavy?: boolean;      // heavy hitstop + sfx
  around?: boolean;     // hitbox centered on attacker (spins/shockwaves)
  special?: boolean;    // costs HP on connect (player specials)
  z0?: number;
  z1?: number;
  hh?: number;          // lane half-tolerance
  stun?: number;        // paralyze ticks instead of a launch (baton arc)
  shockwave?: number;   // ground shockwave radius on first connect (sledge)
  slash?: number;       // crescent slash-arc FX radius (mono-edge dash)
}

export interface AttackKey {
  frame: string;
  dur: number;          // frames this pose lasts
  hit?: HitSpec;
  move?: number;        // forward drift per frame while key is active
}

export type Team = 'player' | 'enemy';

export type FighterState =
  | 'idle' | 'walk' | 'attack' | 'special' | 'jump' | 'hurt'
  | 'launched' | 'down' | 'getup' | 'grab' | 'grabbed' | 'thrown' | 'dead';

let NEXT_ID = 1;

export class Fighter {
  id = NEXT_ID++;
  scene: Phaser.Scene;
  charId: string;
  team: Team;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  weaponImg: Phaser.GameObjects.Image | null = null;

  fx = 0;
  fy = 200;
  fz = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  facing: 1 | -1 = 1;

  maxHp = 100;
  hp = 100;
  walkSpeed = 1.6;
  laneSpeed = 1.0;

  state: FighterState = 'idle';
  stateT = 0;
  private gaitDistance = 0;

  atkSeq: AttackKey[] = [];
  atkIdx = 0;
  atkT = 0;
  pendingHit: HitSpec | null = null;
  hitConnected = false;
  private atkHits = new Set<number>();

  hurtT = 0;
  downT = 0;
  invulnT = 0;
  flashT = 0;

  dead = false;
  removeMe = false;
  fadeT = -1;

  holder: Fighter | null = null;
  held: Fighter | null = null;
  thrownBy: Fighter | null = null;

  minX = 0;
  maxX = 99999;

  constructor(scene: Phaser.Scene, charId: string, team: Team, x: number, y: number) {
    this.scene = scene;
    this.charId = charId;
    this.team = team;
    this.fx = x;
    this.fy = y;

    const scale = CHAR_ART[charId]?.scale ?? 2;
    this.sprite = scene.add.image(x, y, `${charId}_idle`);
    this.sprite.setScale(scale / FIGHTER_TEXTURE_SCALE);
    this.sprite.setOrigin(0.5, 1);
    this.shadow = scene.add.image(x, y, 'fx_shadow');
    this.shadow.setScale(scale * 1.1, scale * 0.9);
    this.setState('idle');
  }

  get isBig(): boolean {
    return (CHAR_ART[this.charId]?.scale ?? 2) > 2;
  }

  get bodyHeight(): number {
    return this.isBig ? 84 : 62;
  }

  get airborne(): boolean {
    return this.fz > 0.01 || this.vz !== 0;
  }

  get busy(): boolean {
    return (
      this.state === 'attack' || this.state === 'special' || this.state === 'hurt' ||
      this.state === 'launched' || this.state === 'down' || this.state === 'getup' ||
      this.state === 'grabbed' || this.state === 'thrown' || this.state === 'grab'
    );
  }

  bodyBox(): HitBox {
    const hw = this.isBig ? 15 : 11;
    return { x: this.fx, y: this.fy, hw, hh: 7, z0: this.fz, z1: this.fz + this.bodyHeight };
  }

  attackBox(spec: HitSpec): HitBox {
    if (spec.around) {
      return {
        x: this.fx, y: this.fy, hw: spec.reach, hh: spec.hh ?? 10,
        z0: this.fz + (spec.z0 ?? 0), z1: this.fz + (spec.z1 ?? this.bodyHeight),
      };
    }
    const cx = this.fx + this.facing * (spec.reach * 0.5 + 10);
    return {
      x: cx, y: this.fy, hw: spec.width / 2, hh: spec.hh ?? 9,
      z0: this.fz + (spec.z0 ?? 0), z1: this.fz + (spec.z1 ?? this.bodyHeight),
    };
  }

  setFrame(name: string): void {
    const key = `${this.charId}_${name}`;
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
  }

  setState(s: FighterState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
    // Interrupted attacks must never retain an active hit or resume on recovery.
    if (s !== 'attack' && s !== 'special') {
      this.pendingHit = null;
      this.atkSeq = [];
    }
  }

  startAttack(seq: AttackKey[], asSpecial = false): void {
    this.pendingHit = null;
    this.vy = 0;
    this.atkSeq = seq;
    this.atkIdx = 0;
    this.atkT = 0;
    this.hitConnected = false;
    this.atkHits.clear();
    this.setState(asSpecial ? 'special' : 'attack');
    this.stateT = 0;
    this.applyAttackKey();
  }

  private applyAttackKey(): void {
    const key = this.atkSeq[this.atkIdx];
    this.setFrame(key.frame);
    this.atkHits.clear();
    this.pendingHit = key.hit ?? null;
  }

  // Keep each active pose live throughout its motion. The shared victim set
  // ensures a multi-tick strike still hits each opponent only once per key.
  consumeHit(): { spec: HitSpec; already: Set<number> } | null {
    if (!this.pendingHit || this.dead || (this.state !== 'attack' && this.state !== 'special')) return null;
    const spec = this.pendingHit;
    return { spec, already: this.atkHits };
  }

  takeHit(from: Fighter, spec: HitSpec): boolean {
    if (this.dead || this.invulnT > 0) return false;
    if (this.state === 'launched' || this.state === 'thrown') {
      // already flying — only special juggles allowed; skip for simplicity
      return false;
    }
    this.hp -= spec.dmg;
    this.hitConnectedAttacker(from);
    const dir = this.fx >= from.fx ? 1 : -1;
    this.flashT = 4;

    if (this.held) this.releaseHold();
    if (this.holder) this.holder.releaseHold();

    if (this.hp <= 0) {
      this.dead = true;
      this.vz = 7.5;
      this.vx = dir * 4.6;
      this.setState('launched');
      this.setFrame('hurt');
      return true;
    }
    if (spec.launch) {
      this.vz = 6.2;
      this.vx = dir * 3.1;
      this.setState('launched');
      this.setFrame('hurt');
    } else {
      // A stun holds the victim upright and paralyzed instead of knocking
      // them back — crowd control rather than damage output.
      this.hurtT = spec.stun ?? (spec.heavy ? 16 : 11);
      this.vx = dir * (spec.stun ? 0.3 : spec.heavy ? 2.0 : 1.1);
      this.setState('hurt');
      this.setFrame('hurt');
    }
    return true;
  }

  protected hitConnectedAttacker(_from: Fighter): void {
    // hook for subclasses
  }

  grabHold(victim: Fighter): void {
    this.held = victim;
    victim.holder = this;
    victim.vx = 0; victim.vy = 0; victim.vz = 0; victim.fz = 0;
    victim.setState('grabbed');
    this.setState('grab');
    this.setFrame('grab');
  }

  releaseHold(): void {
    if (this.held) {
      this.held.holder = null;
      if (this.held.state === 'grabbed') this.held.setState('idle');
      this.held = null;
    }
    if (this.state === 'grab') this.setState('idle');
  }

  throwHeld(): void {
    if (!this.held) return;
    const v = this.held;
    this.held = null;
    v.holder = null;
    v.thrownBy = this;
    v.vx = this.facing * 7.2;
    v.vz = 3.4;
    v.vy = 0;
    v.setState('thrown');
    v.invulnT = 0;
    this.startAttack([{ frame: 'cross', dur: 5 }, { frame: 'crossRecover', dur: 6 }]);
  }

  /** One fixed 60Hz logic tick. Returns pending ground-impact if landing. */
  step(): void {
    this.stateT++;
    if (this.invulnT > 0) this.invulnT--;
    if (this.flashT > 0) this.flashT--;

    switch (this.state) {
      case 'idle':
      case 'walk': {
        if (this.state === 'idle') {
          this.vx *= 0.68;
          this.vy *= 0.68;
          if (Math.abs(this.vx) < 0.025) this.vx = 0;
          if (Math.abs(this.vy) < 0.025) this.vy = 0;
          this.setFrame(`idle${Math.floor(this.stateT / 9) % 6}`);
        } else {
          // Link footfalls to displacement rather than time: a planted foot
          // does not moonwalk when an AI slows down or backs away.
          const nx = Phaser.Math.Clamp(this.fx + this.vx, this.minX, this.maxX) - this.fx;
          const ny = Phaser.Math.Clamp(this.fy + this.vy, LANE_TOP, LANE_BOTTOM) - this.fy;
          const direction = Math.abs(nx) > 0.05 ? Math.sign(nx) * this.facing : 1;
          this.gaitDistance += Math.hypot(nx, ny * 1.35) * direction;
          const pose = ((Math.floor(this.gaitDistance / (44 / 12)) % 12) + 12) % 12;
          this.setFrame(`walk${pose}`);
        }
        break;
      }
      case 'attack':
      case 'special': {
        const key = this.atkSeq[this.atkIdx];
        if (key?.move) this.vx = this.facing * key.move;
        else if (!this.airborne) this.vx *= 0.6;
        this.atkT++;
        if (this.atkT >= (key?.dur ?? 1)) {
          this.atkIdx++;
          this.atkT = 0;
          if (this.atkIdx >= this.atkSeq.length) {
            this.atkSeq = [];
            this.pendingHit = null;
            this.setState(this.airborne ? 'jump' : 'idle');
          } else {
            this.applyAttackKey();
          }
        }
        break;
      }
      case 'hurt': {
        this.vx *= 0.8;
        this.hurtT--;
        if (this.hurtT <= 0) this.setState('idle');
        break;
      }
      case 'grab': {
        this.vx = 0;
        if (!this.held) this.setState('idle');
        break;
      }
      case 'grabbed': {
        if (this.holder) {
          this.fx = this.holder.fx + this.holder.facing * 14;
          this.fy = this.holder.fy;
          this.fz = 0;
          this.facing = this.holder.facing === 1 ? -1 : 1;
          this.setFrame('hurt');
        } else {
          this.setState('idle');
        }
        break;
      }
      case 'launched':
      case 'thrown':
      case 'jump': {
        if (this.state === 'jump') this.setFrame(this.vz > 0 ? 'jump' : 'jumpFall');
        // handled by physics below
        break;
      }
      case 'down': {
        this.downT--;
        if (this.downT <= 0) {
          if (this.dead) {
            if (this.fadeT < 0) this.fadeT = 40;
          } else {
            this.setState('getup');
            this.invulnT = 34;
            this.setFrame('hurt');
          }
        }
        break;
      }
      case 'getup': {
        if (this.stateT > 14) this.setState('idle');
        break;
      }
    }

    // --- shared physics ---
    if (this.airborne || this.state === 'launched' || this.state === 'thrown') {
      this.vz -= GRAVITY;
      this.fz += this.vz;
      if (this.fz <= 0) {
        this.fz = 0;
        const wasFlying = this.state === 'launched' || this.state === 'thrown';
        this.vz = 0;
        if (wasFlying) {
          this.vx = 0;
          this.setState('down');
          this.setFrame('down');
          this.downT = this.dead ? 46 : 34;
          this.onLandHard();
        } else if (this.state === 'jump' || this.state === 'attack' || this.state === 'special') {
          this.atkSeq = [];
          this.pendingHit = null;
          this.setState('idle');
          this.onLandSoft();
        }
      }
    }

    this.fx += this.vx;
    this.fy += this.vy;
    if (this.state !== 'grabbed') {
      this.fy = Phaser.Math.Clamp(this.fy, LANE_TOP, LANE_BOTTOM);
      this.fx = Phaser.Math.Clamp(this.fx, this.minX, this.maxX);
    }

    // --- visual sync ---
    this.sprite.setPosition(this.fx, this.fy - this.fz);
    this.sprite.setFlipX(this.facing < 0);
    this.sprite.setDepth(this.fy);
    this.sprite.setAlpha(this.invulnT > 0 && !this.dead && this.state !== 'grabbed'
      ? (this.stateT % 4 < 2 ? 0.45 : 1) : 1);
    if (this.flashT > 0) this.sprite.setTintFill(0xffffff);
    else this.sprite.clearTint();

    const shScale = Math.max(0.35, 1 - this.fz / 130);
    this.shadow.setPosition(Math.round(this.fx), Math.round(this.fy + 2));
    this.shadow.setScale((CHAR_ART[this.charId]?.scale ?? 2) * 1.1 * shScale, (CHAR_ART[this.charId]?.scale ?? 2) * 0.85 * shScale);
    this.shadow.setDepth(this.fy - 1);
    this.shadow.setAlpha(this.state === 'down' || this.dead ? 0 : 0.9);

    if (this.fadeT >= 0) {
      this.fadeT--;
      this.sprite.setAlpha(Math.max(0, this.fadeT / 40));
      if (this.fadeT <= 0) this.removeMe = true;
    }
  }

  protected onLandHard(): void {
    // dust hook (subclass/scene adds FX)
  }
  protected onLandSoft(): void {
    // soft landing hook
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.weaponImg?.destroy();
  }
}
