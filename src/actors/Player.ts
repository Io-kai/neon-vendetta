// NEON VENDETTA — Player: input, combos, jumps, grabs/throws, weapons,
// health-costing specials, lives & score. Supports 2P local co-op + gamepads.

import Phaser from 'phaser';
import { Fighter, AttackKey, HitSpec } from './Fighter';
import { WEAPON_DEFS, ItemKind } from './Item';

export interface CharStats {
  id: string;
  name: string;
  title: string;
  walk: number;
  lane: number;
  power: number;      // damage multiplier
  jumpV: number;
  specialName: string;
  desc: string[];   // select-screen blurb, short lines (<= 20 chars)
  pw: number; sp: number; sk: number; // select-screen stat bars (0-5)
}

export const ROSTER: Record<string, CharStats> = {
  kane: {
    id: 'kane', name: 'KANE', title: 'THE ALL-ROUNDER',
    walk: 1.75, lane: 1.1, power: 1.0, jumpV: 7.6,
    specialName: 'TYPHOON LARIAT',
    desc: ['BALANCED BRAWLER', 'LARIAT HITS', 'ALL SIDES'],
    pw: 3, sp: 3, sk: 3,
  },
  jinx: {
    id: 'jinx', name: 'JINX', title: 'THE BLUR',
    walk: 2.15, lane: 1.35, power: 0.82, jumpV: 8.2,
    specialName: 'DRAGON RISE',
    desc: ['FASTEST OF TRIO', 'UPPERCUT', 'LAUNCHES FOES'],
    pw: 2, sp: 5, sk: 4,
  },
  bull: {
    id: 'bull', name: 'BULL', title: 'THE WALL',
    walk: 1.4, lane: 0.9, power: 1.4, jumpV: 6.8,
    specialName: 'SEISMIC SLAM',
    desc: ['SLOW BUT HUGE', 'SLAM SHOCKWAVE', 'KNOCKS ALL DOWN'],
    pw: 5, sp: 2, sk: 2,
  },
};

export interface PadState {
  left: boolean; right: boolean; up: boolean; down: boolean;
  attack: boolean; jump: boolean; special: boolean;
  // edge triggers
  attackPr: boolean; jumpPr: boolean; specialPr: boolean;
}

/** Cocked windup pose per swing-arc style (facing right; offsets from the
 *  fighter origin, y measured upward from the feet). */
const ARC_RAISE: Record<string, { x: number; y: number; a: number }> = {
  swing: { x: -8, y: 46, a: -150 },  // raised back over the shoulder
  smash: { x: -4, y: 54, a: -165 },  // hoisted high overhead
  stab:  { x: -6, y: 30, a: 25 },    // pulled back at the hip, tip forward
};

export class Player extends Fighter {
  slot: 0 | 1;
  stats: CharStats;
  score = 0;
  lives = 3;
  comboHits = 0;
  comboT = 0;
  weapon: { type: ItemKind; uses: number } | null = null;

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private prev = { attack: false, jump: false, special: false };
  private comboStage = 0;      // 0 none, 1 jab shown, 2 cross, 3 uppercut done
  private comboQueued = false;
  private grabT = 0;
  private kneeCount = 0;

  constructor(scene: Phaser.Scene, slot: 0 | 1, charId: string, x: number, y: number) {
    super(scene, charId, 'player', x, y);
    this.slot = slot;
    this.stats = ROSTER[charId];
    this.walkSpeed = this.stats.walk;
    this.laneSpeed = this.stats.lane;
    this.maxHp = 100;
    this.hp = 100;
    this.facing = 1;

    const kb = scene.input.keyboard!;
    if (slot === 0) {
      this.keys = {
        left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'),
        up: kb.addKey('UP'), down: kb.addKey('DOWN'),
        attack: kb.addKey('Z'), jump: kb.addKey('X'), special: kb.addKey('C'),
      };
    } else {
      this.keys = {
        left: kb.addKey('A'), right: kb.addKey('D'),
        up: kb.addKey('W'), down: kb.addKey('S'),
        attack: kb.addKey('J'), jump: kb.addKey('K'), special: kb.addKey('L'),
      };
    }
  }

  readPad(): PadState {
    const k = this.keys;
    const st: PadState = {
      left: k.left.isDown, right: k.right.isDown, up: k.up.isDown, down: k.down.isDown,
      attack: k.attack.isDown, jump: k.jump.isDown, special: k.special.isDown,
      attackPr: false, jumpPr: false, specialPr: false,
    };
    // gamepad overlay
    const pads = this.scene.input.gamepad?.gamepads ?? [];
    const gp = pads[this.slot === 0 ? 0 : 1];
    if (gp) {
      const ax = gp.axes[0]?.getValue() ?? 0;
      const ay = gp.axes[1]?.getValue() ?? 0;
      st.left ||= ax < -0.35 || gp.left;
      st.right ||= ax > 0.35 || gp.right;
      st.up ||= ay < -0.35 || gp.up;
      st.down ||= ay > 0.35 || gp.down;
      st.attack ||= gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
      st.jump ||= gp.buttons[1]?.pressed;
      st.special ||= gp.buttons[3]?.pressed || gp.buttons[5]?.pressed;
    }
    st.attackPr = st.attack && !this.prev.attack;
    st.jumpPr = st.jump && !this.prev.jump;
    st.specialPr = st.special && !this.prev.special;
    this.prev = { attack: st.attack, jump: st.jump, special: st.special };
    return st;
  }

  /** Called by GameScene each fixed tick with the current input state. */
  control(p: PadState, canMove: { minX: number; maxX: number }): void {
    this.minX = canMove.minX;
    this.maxX = canMove.maxX;
    if (this.dead) return;

    if (this.comboT > 0) {
      this.comboT--;
      if (this.comboT === 0) this.comboHits = 0;
    }

    switch (this.state) {
      case 'idle':
      case 'walk': {
        // facing & movement
        let mx = 0;
        let my = 0;
        if (p.left) { mx = -1; this.facing = -1; }
        if (p.right) { mx = 1; this.facing = 1; }
        if (p.up) my = -1;
        if (p.down) my = 1;
        if (mx !== 0 || my !== 0) {
          const diagonal = mx !== 0 && my !== 0 ? 0.86 : 1;
          this.vx = Phaser.Math.Linear(this.vx, mx * this.walkSpeed * diagonal, 0.48);
          this.vy = Phaser.Math.Linear(this.vy, my * this.laneSpeed * diagonal, 0.48);
          this.setState('walk');
        } else {
          if (this.state === 'walk') this.setState('idle');
        }
        if (p.jumpPr) {
          this.vz = this.stats.jumpV;
          this.setState('jump');
          this.setFrame('jump');
          this.scene.events.emit('sfx', 'jump');
          break;
        }
        if (p.specialPr) {
          this.doSpecial();
          break;
        }
        if (p.attackPr) {
          this.scene.events.emit('player-attack-ground', this);
        }
        break;
      }
      case 'jump': {
        // air control
        if (p.left) this.vx = -this.walkSpeed * 0.9;
        else if (p.right) this.vx = this.walkSpeed * 0.9;
        if (p.up) this.vy = -this.laneSpeed * 0.7;
        else if (p.down) this.vy = this.laneSpeed * 0.7;
        if (p.attackPr && this.atkSeq.length === 0) {
          // jumping kick — active until landing
          const dmg = Math.round(10 * this.stats.power);
          this.startAttack([
            { frame: 'kickWindup', dur: 3 },
            { frame: 'kick', dur: 18, hit: { reach: 30, width: 28, dmg, launch: true, heavy: false, z1: 70 } },
            { frame: 'kickRecover', dur: 7 },
          ]);
          this.scene.events.emit('sfx', 'swing');
        }
        break;
      }
      case 'attack': {
        // combo chaining: buffer next attack press, chain at/after the hit key
        if (p.attackPr) this.comboQueued = true;
        if (this.comboQueued && !this.airborne && this.atkIdx >= 2 && this.atkIdx < this.atkSeq.length && this.comboStage > 0 && this.comboStage < 3) {
          this.comboQueued = false;
          this.nextComboStage();
        }
        break;
      }
      case 'grab': {
        this.grabT++;
        if (!this.held) { this.setState('idle'); break; }
        if (p.attackPr) {
          if (this.kneeCount < 2) {
            this.kneeCount++;
            this.setFrame('jab');
            // Capture the victim BEFORE takeHit: a killing blow releases the
            // hold inside takeHit and nulls this.held.
            const victim = this.held;
            const spec: HitSpec = { reach: 20, width: 20, dmg: Math.round(6 * this.stats.power) };
            victim.takeHit(this, spec);
            // A knee releases the victim inside takeHit; restore a surviving
            // hold so the documented two knees -> throw sequence can continue.
            if (!victim.dead) this.grabHold(victim);
            this.scene.events.emit('sfx', 'hit');
            this.scene.events.emit('melee-landed', this, spec, victim);
          } else {
            this.doThrow();
          }
        } else if (p.jumpPr || this.grabT > 130) {
          this.doThrow();
        }
        break;
      }
    }
  }

  /** Begin the ground combo (called via event after GameScene checks grabs/items). */
  beginCombo(): void {
    this.comboStage = 1;
    this.comboQueued = false;
    const dmg = Math.round(6 * this.stats.power);
    this.startAttack([
      { frame: 'jabWindup', dur: 4, move: 0.4 },
      { frame: 'jab', dur: 5, move: 1.3, hit: { reach: 30, width: 26, dmg } },
      { frame: 'jabRecover', dur: 6 },
    ]);
    this.scene.events.emit('sfx', 'swing');
  }

  private nextComboStage(): void {
    const pw = this.stats.power;
    if (this.comboStage === 1) {
      this.comboStage = 2;
      this.startAttack([
        { frame: 'crossWindup', dur: 4, move: 0.3 },
        { frame: 'cross', dur: 5, move: 1.7, hit: { reach: 32, width: 26, dmg: Math.round(7 * pw) } },
        { frame: 'crossRecover', dur: 7 },
      ]);
    } else {
      this.comboStage = 3;
      this.startAttack([
        { frame: 'uppercutWindup', dur: 6, move: 0.4 },
        { frame: 'uppercut', dur: 7, move: 1.9, hit: { reach: 30, width: 26, dmg: Math.round(12 * pw), launch: true, heavy: true, z1: 76 } },
        { frame: 'uppercutRecover', dur: 9 },
      ]);
    }
    this.scene.events.emit('sfx', 'swing');
  }

  /** Weapon swing (stats from WEAPON_DEFS). Returns false if no weapon. */
  swingWeapon(): boolean {
    if (!this.weapon) return false;
    const w = this.weapon;
    const def = WEAPON_DEFS[w.type] ?? WEAPON_DEFS.pipe!;
    w.uses--;
    const dmg = Math.round(def.dmg * this.stats.power);
    this.comboStage = 0;
    this.startAttack([
      { frame: 'swingWindup', dur: def.windup, move: 0.3 },
      { frame: 'swing', dur: def.swing, move: def.move ?? 1.4, hit: {
        reach: def.reach, width: def.width, dmg, heavy: def.heavy, launch: def.launch,
        stun: def.stun, shockwave: def.shockwave, slash: def.slash,
      } },
      { frame: 'swingRecover', dur: def.recover },
    ]);
    this.scene.events.emit('sfx', 'swing');
    if (w.uses <= 0) {
      this.scene.events.emit('weapon-broken', this);
      this.weapon = null;
    }
    return true;
  }

  tryGrab(enemies: Fighter[]): boolean {
    if (this.weapon) return false;
    for (const e of enemies) {
      if (e.dead || e.holder || e.invulnT > 0 || e.team !== 'enemy') continue;
      if (e.state === 'launched' || e.state === 'thrown' || e.state === 'down' || e.state === 'grabbed') continue;
      const dx = (e.fx - this.fx) * this.facing;
      if (dx > 4 && dx < 26 && Math.abs(e.fy - this.fy) < 9 && Math.abs(e.fz) < 4) {
        this.kneeCount = 0;
        this.grabT = 0;
        this.grabHold(e);
        this.scene.events.emit('sfx', 'grab');
        return true;
      }
    }
    return false;
  }

  private doThrow(): void {
    if (!this.held) return;
    this.throwHeld();
    this.kneeCount = 0;
    this.scene.events.emit('sfx', 'throwSfx');
  }

  doSpecial(): void {
    if (this.airborne) return;
    const pw = this.stats.power;
    this.scene.events.emit('sfx', 'special');
    if (this.charId === 'kane') {
      const spec: HitSpec = { reach: 52, width: 0, dmg: Math.round(22 * pw), heavy: true, launch: true, around: true, special: true, hh: 12 };
      this.startAttack([
        { frame: 'lariatWindup', dur: 4 },
        { frame: 'lariat', dur: 6, move: 0.9, hit: spec },
        { frame: 'lariatRecover', dur: 3 },
        { frame: 'lariat', dur: 6, move: 0.9, hit: spec },
        { frame: 'lariatRecover', dur: 8 },
      ], true);
    } else if (this.charId === 'jinx') {
      this.vz = 7.8;
      this.vx = this.facing * 2.2;
      const spec: HitSpec = { reach: 26, width: 26, dmg: Math.round(20 * pw), heavy: true, launch: true, special: true, z1: 130 };
      this.startAttack([{ frame: 'rising', dur: 18, hit: spec }, { frame: 'risingRecover', dur: 200 }], true);
    } else {
      const spec: HitSpec = { reach: 105, width: 105, dmg: Math.round(24 * pw), heavy: true, launch: true, special: true, hh: 14, z1: 40 };
      this.startAttack([
        { frame: 'slamWindup', dur: 8 },
        { frame: 'slam', dur: 10, hit: spec },
        { frame: 'slamRecover', dur: 12 },
      ], true);
      this.scene.events.emit('bull-slam', this);
    }
  }

  respawn(x: number, y: number): void {
    this.dead = false;
    this.hp = this.maxHp;
    this.fx = x;
    this.fy = y;
    this.fz = 130;
    this.vz = 0;
    this.vx = 0;
    this.vy = 0;
    this.comboQueued = false;
    this.weapon = null;
    this.comboStage = 0;
    this.setState('jump');
    this.setFrame('jump');
    this.invulnT = 90;
    this.sprite.setAlpha(1);
    this.fadeT = -1;
  }

  protected onLandSoft(): void {
    this.atkSeq = [];
    this.comboStage = 0;
    this.scene.events.emit('sfx', 'land');
    this.scene.events.emit('dust', this.fx, this.fy);
  }

  protected onLandHard(): void {
    this.atkSeq = [];
    this.comboStage = 0;
    this.scene.events.emit('dust', this.fx, this.fy);
    this.scene.events.emit('sfx', 'land');
  }

  /** Update the attached weapon sprite (called each tick by GameScene).
   *  The weapon is animated through a real swing: it rises into a cocked
   *  windup pose, snaps through an arc during the active frames, then
   *  settles back to the carry pose through recovery. Carry is tip-up at
   *  the side. Per-weapon geometry/arc style comes from WEAPON_DEFS. */
  syncWeaponSprite(): void {
    if (this.weapon) {
      const def = WEAPON_DEFS[this.weapon.type];
      const texture = `item_${this.weapon.type}`;
      if (!this.weaponImg || this.weaponImg.texture.key !== texture) {
        this.weaponImg?.destroy();
        this.weaponImg = this.scene.add.image(this.fx, this.fy, texture);
        this.weaponImg.setScale(2);
      }
      const carry = { x: def?.idleX ?? 9, y: def?.idleY ?? 32, a: def?.idleAngle ?? -80 };
      const raise = ARC_RAISE[def?.arc ?? 'swing'];
      const follow = { x: def?.swingX ?? 30, y: def?.swingY ?? 40, a: def?.swingAngle ?? 12 };
      const attacking = (this.state === 'attack' || this.state === 'special') && this.atkSeq.length > 0;
      let px = carry.x, py = carry.y, ang = carry.a;
      if (attacking && this.atkIdx === 0) {
        // windup: ease from carry into the cocked raise pose
        const t = Math.min(1, this.atkT / Math.max(1, this.atkSeq[0].dur));
        const e = t * t * (3 - 2 * t);
        px = carry.x + (raise.x - carry.x) * e;
        py = carry.y + (raise.y - carry.y) * e;
        ang = carry.a + (raise.a - carry.a) * e;
      } else if (attacking && this.atkIdx === 1) {
        // active: snap through the arc (fast-out easing reads as a strike)
        const t = Math.min(1, this.atkT / Math.max(1, this.atkSeq[1].dur));
        const e = Math.pow(t, 0.42);
        px = raise.x + (follow.x - raise.x) * e;
        py = raise.y + (follow.y - raise.y) * e;
        ang = raise.a + (follow.a - raise.a) * e;
      } else if (attacking) {
        // recover: settle from follow-through back to carry
        const t = Math.min(1, this.atkT / Math.max(1, this.atkSeq[this.atkIdx]?.dur ?? 8));
        const e = t * t * (3 - 2 * t);
        px = follow.x + (carry.x - follow.x) * e;
        py = follow.y + (carry.y - follow.y) * e;
        ang = follow.a + (carry.a - follow.a) * e;
      }
      this.weaponImg.setOrigin(def?.grip ?? 0.2, 0.5);
      this.weaponImg.setPosition(this.fx + this.facing * px, this.fy - this.fz - py);
      this.weaponImg.setAngle(this.facing > 0 ? ang : 180 - ang);
      this.weaponImg.setFlipX(this.facing < 0);
      this.weaponImg.setDepth(this.fy + 1);
      this.weaponImg.setVisible(!this.dead);
      // blink when one swing remains so low durability reads at a glance
      this.weaponImg.setAlpha(this.weapon.uses <= 1 && (this.scene.time.now >> 5) % 2 === 0 ? 0.35 : 1);
    } else if (this.weaponImg) {
      this.weaponImg.setVisible(false);
    }
  }
}
