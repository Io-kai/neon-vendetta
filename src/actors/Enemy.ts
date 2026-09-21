// NEON VENDETTA — Enemy AI: enter, chase, attack tokens, repositioning,
// heavy armor, charge attacks, and the stage boss with a second phase.

import Phaser from 'phaser';
import { Fighter, HitSpec } from './Fighter';

export interface EnemyType {
  id: string;
  hp: number;
  walk: number;
  lane: number;
  dmg: number;
  reach: number;
  score: number;
  knifeVisual?: boolean;
  armor?: number;          // chance to shrug off light hitstun
  chargeAttack?: boolean;
  boss?: boolean;
  pattern?: string;
}

export const ENEMY_TYPES: Record<string, EnemyType> = {
  razor:{id:'razor',hp:48,walk:1.85,lane:1.25,dmg:8,reach:34,score:180,knifeVisual:true},
  husk:{id:'husk',hp:115,walk:.8,lane:.6,dmg:14,reach:39,score:330,armor:.2,chargeAttack:true},
  sentinel:{id:'sentinel',hp:72,walk:1.35,lane:1.05,dmg:11,reach:38,score:240,armor:.15},
  sable:{id:'sable',hp:540,walk:2.05,lane:1.6,dmg:16,reach:42,score:3000,boss:true,pattern:'duelist'},
  cinder:{id:'cinder',hp:660,walk:.95,lane:.75,dmg:24,reach:46,score:4000,boss:true,pattern:'quake',chargeAttack:true,armor:.3},
  orison:{id:'orison',hp:720,walk:1.4,lane:1.1,dmg:22,reach:45,score:6000,boss:true,pattern:'pulse',chargeAttack:true,armor:.25},
  punk:  { id: 'punk',  hp: 32,  walk: 1.05, lane: 0.8,  dmg: 6,  reach: 26, score: 100 },
  blade: { id: 'blade', hp: 44,  walk: 1.5,  lane: 1.1,  dmg: 8,  reach: 36, score: 150, knifeVisual: true },
  brute: { id: 'brute', hp: 100, walk: 0.85, lane: 0.62, dmg: 14, reach: 36, score: 300, armor: 0.45, chargeAttack: true },
  korvo: { id: 'korvo', hp: 400, walk: 1.25, lane: 0.95, dmg: 20, reach: 42, score: 2000, armor: 0.3, chargeAttack: true, boss: true },
};

export interface AiContext {
  target: Fighter | null;
  tryStartAttack: (e: Enemy) => boolean;
  endAttack: (e: Enemy) => void;
  aggro: number;
}

type AiMode = 'enter' | 'idle' | 'chase' | 'reposition';

export class Enemy extends Fighter {
  type: EnemyType;
  mode: AiMode = 'enter';
  destX = 0;
  destY = 0;
  thinkT = 0;
  cooldown = 0;
  repoT = 0;
  hasToken = false;
  chargeT = 0;
  slamPending = false;
  phase2 = false;

  constructor(scene: Phaser.Scene, typeId: string, x: number, y: number, hpMul: number, enterX?: number) {
    const type = ENEMY_TYPES[typeId];
    super(scene, type.id, 'enemy', x, y);
    this.type = type;
    this.maxHp = Math.round(type.hp * hpMul * (type.boss ? 1 : 1));
    this.hp = this.maxHp;
    this.walkSpeed = type.walk;
    this.laneSpeed = type.lane;
    this.destX = enterX ?? x;
    this.destY = y;
    this.facing = x > 0 ? -1 : 1;
  }

  takeHit(from: Fighter, spec: HitSpec): boolean {
    if (this.dead || this.invulnT > 0 || this.state === 'launched' || this.state === 'thrown') return false;
    // heavies can shrug off light hits
    if (this.type.armor && !spec.launch && this.hp > spec.dmg) {
      if (Math.random() < this.type.armor) {
        this.hp -= spec.dmg;
        this.flashT = 3;
        if (this.hp <= 0) {
          this.dead = true;
          const dir = this.fx >= from.fx ? 1 : -1;
          this.vz = 7.5;
          this.vx = dir * 4.6;
          this.setState('launched');
          this.releaseToken();
        }
        return true;
      }
    }
    const ok = super.takeHit(from, spec);
    if (ok) this.releaseToken();
    return ok;
  }

  private releaseToken(): void {
    this.hasToken = false;
    this.slamPending = false;
  }

  ai(ctx: AiContext): void {
    if (this.dead) { this.releaseToken(); return; }

    // boss second phase
    if (this.type.boss && !this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.walkSpeed *= 1.3;
      this.scene.events.emit('boss-phase2', this);
    }

    // Fighter.step ends sequences by returning to idle. Release the attack
    // slot here, outside the attack state, so rivals actually recover and circle.
    if (this.hasToken && !this.busy && this.state !== 'jump') {
      ctx.endAttack(this);
      this.hasToken = false;
      // bosses recover and press again far faster than grunts
      const baseCd = this.type.boss ? 24 + Math.random() * 22 : 45 + Math.random() * 40;
      this.cooldown = Math.round(baseCd / Math.max(0.4, ctx.aggro));
      this.mode = 'reposition';
      this.repoT = 24 + Math.random() * 24;
      if (ctx.target) {
        const side = this.fx < ctx.target.fx ? -1 : 1;
        this.destX = Phaser.Math.Clamp(ctx.target.fx + side * (54 + (this.id % 3) * 13), this.minX, this.maxX);
        this.destY = ctx.target.fy + (this.id % 2 ? -1 : 1) * (12 + this.id % 3 * 5);
      }
    }

    switch (this.state) {
      case 'attack':
      case 'special':
        return;
      case 'hurt':
      case 'launched':
      case 'thrown':
      case 'down':
      case 'getup':
      case 'grabbed':
      case 'grab':
        if (this.hasToken) { ctx.endAttack(this); this.hasToken = false; }
        return;
      case 'jump':
        return; // boss slam in flight
    }

    if (this.cooldown > 0) this.cooldown--;
    const t = ctx.target;
    if (!t) { this.vx = 0; this.vy = 0; this.setState('idle'); return; }

    const dx = t.fx - this.fx;
    const dy = t.fy - this.fy;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.mode === 'enter') {
      const ddx = this.destX - this.fx;
      if (Math.abs(ddx) < 8) {
        this.mode = 'idle';
        this.thinkT = 10 + Math.random() * 30;
        this.setState('idle');
        this.vx = 0; this.vy = 0;
      } else {
        this.vx = Math.sign(ddx) * this.walkSpeed;
        this.facing = this.vx >= 0 ? 1 : -1;
        // drift to own lane
        this.vy = Math.abs(this.destY - this.fy) > 2 ? Math.sign(this.destY - this.fy) * this.laneSpeed * 0.5 : 0;
        this.setState('walk');
      }
      return;
    }

    if (this.mode === 'reposition') {
      this.repoT--;
      const ddx = this.destX - this.fx;
      const ddy = this.destY - this.fy;
      if (this.repoT <= 0 || (Math.abs(ddx) < 6 && Math.abs(ddy) < 6)) {
        this.mode = 'idle';
        this.thinkT = 8 + Math.random() * 22;
        this.vx = 0; this.vy = 0;
        this.setState('idle');
      } else {
        this.vx = Math.sign(ddx) * this.walkSpeed * 0.8;
        this.vy = Math.abs(ddy) > 4 ? Math.sign(ddy) * this.laneSpeed : 0;
        this.setState('walk');
      }
      return;
    }

    // idle / chase brain
    const inRange = adx < this.type.reach && ady < 9;

    if (this.thinkT > 0) {
      this.thinkT--;
      this.vx = 0; this.vy = 0;
      if (this.state === 'walk') this.setState('idle');
      return;
    }

    if (inRange && this.cooldown <= 0) {
      if (this.hasToken || ctx.tryStartAttack(this)) {
        this.hasToken = true;
        this.doAttack(ctx);
        return;
      }
    }

    // charge attack for heavies at mid distance
    if (this.type.chargeAttack && this.cooldown <= 0 && adx > 90 && adx < 260 && ady < 12 && Math.random() < 0.02 * ctx.aggro) {
      if (this.hasToken || ctx.tryStartAttack(this)) {
        this.hasToken = true;
        this.doCharge(ctx);
        return;
      }
    }

    // boss jump-slam in phase 2
    if (this.type.boss && this.type.pattern !== 'duelist' && this.type.pattern !== 'pulse' && this.phase2 && this.cooldown <= 0 && adx > 60 && Math.random() < 0.03 * ctx.aggro) {
      if (ctx.tryStartAttack(this)) {
        this.hasToken = true;
        this.doJumpSlam(t);
        return;
      }
    }

    if (this.type.pattern === 'pulse' && adx < 125 && this.cooldown <= 0 && ctx.tryStartAttack(this)) {
      this.hasToken = true; this.doAttack(ctx); return;
    }
    // otherwise chase: align lane, then close distance
    this.mode = 'chase';
    let mvx = 0;
    let mvy = 0;
    // Approach on staggered lanes, then step into range. Cooling enemies
    // keep a little air around the player instead of stacking in one position.
    const waiting = this.cooldown > 0;
    const laneOffset = waiting || adx > 90 ? (this.id % 3 - 1) * 13 : 0;
    const laneDelta = dy + laneOffset;
    const spacing = waiting ? this.type.reach + 22 : this.type.reach * 0.8;
    if (Math.abs(laneDelta) > 4) mvy = Math.sign(laneDelta);
    if (adx > spacing + 4) mvx = Math.sign(dx);
    else if (adx < spacing - 8) mvx = -Math.sign(dx);
    this.vx = Phaser.Math.Linear(this.vx, mvx * this.walkSpeed, 0.4);
    this.vy = Phaser.Math.Linear(this.vy, mvy * this.laneSpeed, 0.4);
    if (mvx !== 0 || mvy !== 0) this.setState('walk');
    else {
      this.setState('idle');
      this.thinkT = 6 + Math.random() * 14;
    }
  }

  private doAttack(ctx: AiContext): void {
    const dmg = Math.round(this.type.dmg * ctx.aggro);
    this.vx = 0; this.vy = 0;
    if(this.type.pattern === 'duelist') {
      const strike={reach:54,width:28,dmg,heavy:false};
      this.startAttack([{frame:'swingWindup',dur:20},{frame:'swing',dur:7,move:2.8,hit:strike},
        {frame:'crossWindup',dur:this.phase2?6:12},{frame:'cross',dur:7,move:2,hit:{...strike,launch:this.phase2}},
        {frame:'swingRecover',dur:28}]);return;
    }
    if(this.type.pattern === 'quake' || this.type.pattern === 'pulse') {
      const pulse=this.type.pattern === 'pulse';
      this.startAttack([{frame:'slamWindup',dur:pulse?36:30},
        {frame:'slam',dur:8,hit:{reach:pulse?110:78,width:0,around:true,hh:pulse?20:13,z1:24,dmg,heavy:true,launch:true}},
        {frame:'slamRecover',dur:pulse?34:38}]);
      this.scene.events.emit('boss-warning',this,pulse?110:78,pulse?36:30);return;
    }
    const frame = this.type.knifeVisual ? 'swing' : 'jab';
    this.startAttack([
      { frame: `${frame}Windup`, dur: this.type.boss ? 10 : 12 },
      { frame, dur: 6, move: this.type.knifeVisual ? 1.8 : 1.0, hit: { reach: this.type.reach + 8, width: 26, dmg, heavy: this.isBig, launch: this.isBig && Math.random() < 0.4 } },
      { frame: `${frame}Recover`, dur: 12 },
    ]);
    this.scene.events.emit('sfx', 'swing');
  }

  private doCharge(ctx: AiContext): void {
    const dmg = Math.round((this.type.dmg + 4) * ctx.aggro);
    // telegraph then run
    this.startAttack([
      { frame: 'chargeWindup', dur: 22 },
      { frame: 'charge', dur: 62, move: 3.4, hit: { reach: 30, width: 30, dmg, heavy: true, launch: true } },
      { frame: 'chargeRecover', dur: 18 },
    ]);
    this.scene.events.emit('sfx', 'special');
  }

  private doJumpSlam(t: Fighter): void {
    this.slamPending = true;
    this.vz = 8.6;
    const dx = t.fx - this.fx;
    this.vx = Phaser.Math.Clamp(dx / 40, -3.4, 3.4);
    this.setState('jump');
    this.setFrame('jump');
    this.scene.events.emit('sfx', 'jump');
  }

  protected onLandSoft(): void {
    if (this.slamPending) {
      this.slamPending = false;
      const shock: HitSpec = { reach: 74, width: 0, dmg: this.type.dmg, heavy: true, launch: true, around: true, hh: 14, z1: 34 };
      this.startAttack([
        { frame: 'charge', dur: 8, hit: shock },
        { frame: 'slamRecover', dur: 20 },
      ]);
      this.scene.events.emit('bull-slam', this);
      this.scene.events.emit('sfx', 'ko');
    } else {
      this.scene.events.emit('sfx', 'land');
    }
  }

  protected onLandHard(): void {
    this.scene.events.emit('dust', this.fx, this.fy);
  }

  /** knife visual for blade enemies */
  syncWeaponSprite(): void {
    if (!this.type.knifeVisual) return;
    if (!this.weaponImg) {
      this.weaponImg = this.scene.add.image(this.fx, this.fy, 'item_knife');
      this.weaponImg.setScale(2);
      this.weaponImg.setOrigin(0.2, 0.5);
    }
    const attacking = this.state === 'attack' && this.atkIdx > 0;
    this.weaponImg.setPosition(this.fx + this.facing * (attacking ? 26 : 12), this.fy - this.fz - 38);
    this.weaponImg.setAngle(this.facing > 0 ? 15 : 165);
    this.weaponImg.setDepth(this.fy + 1);
    this.weaponImg.setVisible(!this.dead && this.state !== 'down');
  }
}
