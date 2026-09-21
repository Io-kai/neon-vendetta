// NEON VENDETTA — GameScene: the brawler itself.
// Fixed 60Hz logic, belt-scroll camera, wave gates, hit resolution with
// hitstop/sparks/shake, HUD, co-op join-in, continues, stage clear tally.

import Phaser from 'phaser';
import {
  GAME_W, GAME_H, LANE_TOP, LANE_BOTTOM,
  GameSettings, DEFAULT_SETTINGS, DIFF_TABLE, boxesOverlap,
} from '../config';
import { Fighter, HitSpec } from '../actors/Fighter';
import { Player, ROSTER } from '../actors/Player';
import { Enemy, ENEMY_TYPES } from '../actors/Enemy';
import { Item, ItemKind, WEAPON_DEFS } from '../actors/Item';
import { Background, STAGE_1, StageDef, CAMPAIGN } from '../world/Stage';
import { addText, addTextCentered, bakeText, textWidth } from '../art/font';
import { Jukebox } from '../audio/jukebox';
import { applyCRT } from '../fx/CRTPipeline';
import { addCampaignArt } from '../world/CampaignArt';
import { campaignBeat } from '../story/campaign';
import { addAfterHours } from '../world/AfterHours';
import { StoryOverlay } from '../story/StoryOverlay';
import { opening, midpoint, ending, CASE_FILES, HeroId } from '../story/story';
import { readProgress, unlockStory } from '../story/progress';

const MAX_ENEMIES = 4;
const SPECIAL_COST = 12;

interface SpawnEntry { type: string; side: string; timer: number; done?: boolean }

interface Fx {
  img: Phaser.GameObjects.Image;
  t: number;
  kind: 'spark' | 'dust' | 'trail';
}

interface HudSlot {
  root: (Phaser.GameObjects.GameObject | null)[];
  life: Phaser.GameObjects.Graphics;
  scoreImg: Phaser.GameObjects.Image | null;
  comboImg: Phaser.GameObjects.Image | null;
  livesImg: Phaser.GameObjects.Image | null;
  lastScore: number;
  lastCombo: number;
  lastLives: number;
}

export class GameScene extends Phaser.Scene {
  private settings!: GameSettings;
  private numPlayers: 1 | 2 = 1;
  private chars: string[] = ['kane', 'jinx'];
  private stage: StageDef = STAGE_1;

  private stageIndex = 0;
  private carry?: {score:number;lives:number}[];
  private carriedContinues = 3;
  private clearReady = false;
  private bg!: Background;
  private blackout!: Phaser.GameObjects.Rectangle;
  private storyUi!: StoryOverlay;
  private storySeen = new Set<number>();
  private combatInk!: Phaser.GameObjects.Graphics;
  private routeInk!: Phaser.GameObjects.Graphics;
  private motes: {x:number; y:number; vx:number; vy:number; life:number; max:number; color:number}[] = [];
  private players: Player[] = [];
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private fx: Fx[] = [];

  private camX = 0;
  private gateIdx = 0;
  private gateActive = false;
  private spawnQueue: SpawnEntry[] = [];
  private goT = 0;

  private boss: Enemy | null = null;
  private bossActive = false;

  private hitstopT = 0;
  private introT = 0;
  private paused = false;
  private cleared = false;
  private clearT = -1;
  private gameOverT = -1;
  private continueT = -1;
  private continues = 3;
  private respawnQueue: { p: Player; timer: number }[] = [];
  private out = new Map<number, boolean>();
  private elapsedSteps = 0;
  private accumulator = 0;

  private attackers = new Set<number>();
  private thrownHits = new Map<number, Set<number>>();

  private hud!: {
    slots: HudSlot[];
    bossBar: Phaser.GameObjects.Graphics;
    bossName: Phaser.GameObjects.Image | null;
    msgImg: Phaser.GameObjects.Image | null;
    msgT: number;
    overlay: Phaser.GameObjects.GameObject[];
  };

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('GameScene');
  }

  init(data: { players?: 1 | 2; chars?: string[]; settings?: GameSettings; stageIndex?:number; carry?:{score:number;lives:number}[]; continues?:number }): void {
    this.stageIndex = Phaser.Math.Clamp(Math.floor(data.stageIndex ?? 0),0,CAMPAIGN.length-1);
    this.stage = CAMPAIGN[this.stageIndex];
    this.carry = data.carry;
    this.carriedContinues = data.continues ?? 3;
    this.numPlayers = data.players ?? 1;
    this.chars = data.chars ?? ['kane', 'jinx'];
    this.settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? this.registry.get('settings')) };
  }

  // ------------------------------------------------------------------ setup
  create(): void {
    // Phaser reuses this scene instance across starts — reset all run state.
    this.camX = 0;
    this.storySeen = new Set();
    this.gateIdx = 0;
    this.gateActive = false;
    this.spawnQueue = [];
    this.goT = 0;
    this.boss = null;
    this.bossActive = false;
    this.hitstopT = 0;
    this.paused = false;
    this.cleared = false;
    this.clearT = -1;
    this.gameOverT = -1;
    this.continueT = -1;
    this.continues = this.carriedContinues;
    this.clearReady = false;
    this.respawnQueue = [];
    this.out = new Map();
    this.elapsedSteps = 0;
    this.accumulator = 0;
    this.attackers.clear();
    this.thrownHits.clear();
    this.fx = [];
    this.motes = [];

    this.cameras.main.removeBounds();
    this.cameras.main.setOrigin(0, 0).setZoom(3);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#05060a');
    applyCRT(this, this.settings.crt);

    Jukebox.musicEnabled = this.settings.music;
    Jukebox.sfxEnabled = this.settings.sfx;

    this.bg = new Background(this, this.stage.theme!=='club' && this.stage.theme!=='spire');
    if(this.stage.theme) addCampaignArt(this,this.stage.theme,this.stage.length);
    else addAfterHours(this);
    this.blackout = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x040915, this.stageIndex===0 ? 0.45 : 0).setOrigin(0).setScrollFactor(0).setDepth(-48);
    this.storyUi = new StoryOverlay(this);
    this.combatInk = this.add.graphics().setDepth(390);

    // players
    this.players = [];
    for (let i = 0; i < this.numPlayers; i++) {
      const p = new Player(this, i as 0 | 1, this.chars[i], 70 + i * 30, 205 + i * 12);
      if(this.carry?.[i]) {p.score=this.carry[i].score;p.lives=Math.max(0,this.carry[i].lives);}
      this.players.push(p);
    }
    this.enemies = [];
    this.items = this.stage.items.map((d) => new Item(this, d.kind, d.x, d.y));

    // input helpers
    const kb = this.input.keyboard!;
    this.keys = {
      enter: kb.addKey('ENTER'), f: kb.addKey('F'), m: kb.addKey('M'),
      j: kb.addKey('J'), z: kb.addKey('Z'), x: kb.addKey('X'), tab: kb.addKey('TAB'),
    };

    this.buildHud();
    this.wireEvents();

    // intro card
    this.introT = 150;
    if (this.settings.story) {
      this.storyUi.show(this.stageIndex===0 ? opening(this.chars[0] as HeroId, this.numPlayers === 2) : campaignBeat(this.stageIndex,false,this.chars[0]), () => this.showStageCard());
    } else this.showStageCard();
  }

  private wireEvents(): void {
    this.events.on('sfx', (key: string) => Jukebox.sfx(this, key));
    this.events.on('dust', (x: number, y: number) => this.spawnFx('dust', x, y));
    this.events.on('melee-landed', (attacker: Fighter, spec: HitSpec, victim: Fighter) => {
      this.hitLanded(attacker, spec, victim, false);
    });
    this.events.on('weapon-broken', () => Jukebox.sfx(this, 'hitHeavy'));
    this.events.on('bull-slam', (f: Fighter) => {
      this.cameras.main.shake(140, 0.006);
      this.spawnFx('dust', f.fx - 40, f.fy);
      this.spawnFx('dust', f.fx + 40, f.fy);
      this.spawnFx('dust', f.fx, f.fy + 6);
    });
    this.events.on('boss-phase2', (boss:Enemy) => {
      this.setMessage(`${boss.type.id.toUpperCase()} - PHASE 2`, '#ff2a68', 2, 110);
      this.cameras.main.flash(160, 255, 40, 60);
      this.cameras.main.shake(200, 0.006);
    });
    this.events.on('boss-warning', (boss:Enemy,radius:number,frames:number) => {
      const ring=this.add.ellipse(boss.fx,boss.fy,radius*2,30,0xff627a,.12).setStrokeStyle(1,0xffd277,.8).setDepth(boss.fy-1);
      this.tweens.add({targets:ring,alpha:.65,duration:frames*1000/60,onComplete:()=>ring.destroy()});
    });
    this.events.on('player-attack-ground' , (p: Player) => this.onGroundAttack(p));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // Keep Phaser's START/UPDATE listeners: its plugins reuse them on restart.
      for (const event of ['sfx', 'dust', 'melee-landed', 'weapon-broken', 'bull-slam', 'boss-phase2', 'boss-warning', 'player-attack-ground']) this.events.removeAllListeners(event);
    });
  }

  // ------------------------------------------------------------------- HUD
  private buildHud(): void {
    const mkSlot = (i: number): HudSlot => {
      const life = this.add.graphics().setScrollFactor(0).setDepth(1002);
      return { root: [], life, scoreImg: null, comboImg: null, livesImg: null, lastScore: -1, lastCombo: -1, lastLives: -1 };
    };
    this.hud = {
      slots: [mkSlot(0), mkSlot(1)],
      bossBar: this.add.graphics().setScrollFactor(0).setDepth(1002),
      bossName: null,
      msgImg: null,
      msgT: 0,
      overlay: [],
    };
    this.routeInk = this.add.graphics().setScrollFactor(0).setDepth(1000);
    addTextCentered(this, GAME_W / 2, 9, this.stageIndex===0 ? 'NEON WARD' : this.stage.sub, '#a2b8c8', 1).setScrollFactor(0).setDepth(1001);
    addTextCentered(this, GAME_W / 2, 32, 'TAB: CASE FILES', '#7993a5', 1).setScrollFactor(0).setDepth(1001);
    this.refreshHudChrome();
  }

  private refreshHudChrome(): void {
    // portraits + names (static per joined player)
    this.players.forEach((p, i) => {
      const slot = this.hud.slots[i];
      slot.root.forEach((o) => o?.destroy());
      slot.root = [];
      const leftSide = i === 0;
      const plateX = leftSide ? 5 : GAME_W - 137;
      const plate = this.add.graphics().setScrollFactor(0).setDepth(1000);
      plate.fillStyle(0x07121e, 0.88).fillRect(plateX, 5, 132, 45);
      plate.lineStyle(1, 0x335468, 0.8).strokeRect(plateX, 5, 132, 45);
      plate.fillStyle(leftSide ? 0x68f3da : 0xf57dac).fillRect(leftSide ? plateX : plateX + 129, 5, 3, 31);
      slot.root.push(plate);
      const px = leftSide ? 8 : GAME_W - 36;
      const port = this.add.image(px, 8, `${p.charId}_portrait`).setOrigin(0, 0).setScrollFactor(0).setDepth(1001);
      const name = addText(this, leftSide ? 40 : GAME_W - 40 - textWidth(p.stats.name, 1), 10, p.stats.name, '#ffffff', 1)
        .setScrollFactor(0).setDepth(1001);
      slot.root.push(port, name);
      slot.lastScore = -1; slot.lastCombo = -1; slot.lastLives = -1;
    });
  }

  private hudText(img: Phaser.GameObjects.Image | null, x: number, y: number, text: string, color: string, alignRight = false): Phaser.GameObjects.Image {
    img?.destroy();
    const key = bakeText(this, text, color, 1, true);
    const w = textWidth(text, 1);
    const nx = alignRight ? x - w : x;
    return this.add.image(nx, y, key).setOrigin(0, 0).setScrollFactor(0).setDepth(1001);
  }

  private syncHud(): void {
    this.routeInk.clear();
    this.routeInk.fillStyle(0x172b3b).fillRect(194, 22, 92, 2);
    this.routeInk.fillStyle(0x65efd5).fillRect(194, 22, Math.max(2, Math.round(92 * this.camX / (this.stage.length - GAME_W))), 2);
    this.players.forEach((p, i) => {
      const slot = this.hud.slots[i];
      const leftSide = i === 0;
      const bx = leftSide ? 40 : GAME_W - 40 - 92;
      const by = 20;

      // life bar
      const g = slot.life;
      g.clear();
      g.fillStyle(0x0a0a12, 1).fillRect(bx - 1, by - 1, 94, 9);
      const frac = Math.max(0, p.hp / p.maxHp);
      const color = frac > 0.5 ? 0x40d9bd : frac > 0.25 ? 0xf7bc67 : 0xf45d76;
      g.fillStyle(color, 1).fillRect(bx, by, Math.round(92 * frac), 7);
      g.fillStyle(0xd5fff1, 0.65).fillRect(bx, by, Math.round(92 * frac), 1);
      g.fillStyle(0x0a0a12, 1);
      for (let t = 1; t < 4; t++) g.fillRect(bx + t * 23, by, 1, 7);

      // score
      if (p.score !== slot.lastScore) {
        slot.lastScore = p.score;
        slot.scoreImg = this.hudText(slot.scoreImg, leftSide ? 40 : GAME_W - 40, 31,
          `${p.score}`.padStart(7, '0'), '#ffd858', !leftSide);
      }
      // lives
      if (p.lives !== slot.lastLives) {
        slot.lastLives = p.lives;
        slot.livesImg = this.hudText(slot.livesImg, leftSide ? 10 : GAME_W - 10, 42,
          `X${Math.max(0, p.lives)}`, '#e8e8f0', !leftSide);
      }
      // combo
      if (p.comboHits !== slot.lastCombo) {
        slot.lastCombo = p.comboHits;
        slot.comboImg?.destroy();
        slot.comboImg = null;
        if (p.comboHits >= 2) {
          const tx = leftSide ? 66 : GAME_W - 66;
          slot.comboImg = addTextCentered(this, tx, 57, `${p.comboHits} HITS!`, '#ffcf8c', 2)
            .setScrollFactor(0).setDepth(1001);
          this.tweens.add({targets: slot.comboImg, y: 53, duration: 120, ease: 'Cubic.Out'});
        }
      }
    });

    // join hint for empty P2 slot
    if (this.players.length < 2 && !this.out.get(1)) {
      if (!this.hud.slots[1].root.length) {
        const hint = addText(this, GAME_W - 116, 12, 'PRESS J: 2P JOIN', '#7878a0', 1).setScrollFactor(0).setDepth(1001);
        this.hud.slots[1].root.push(hint);
      } else {
        this.hud.slots[1].root.forEach((o) => (o as Phaser.GameObjects.Image).setVisible(this.time.now % 900 < 600));
      }
    }

    // boss bar
    const bg = this.hud.bossBar;
    bg.clear();
    if (this.bossActive && this.boss && !this.boss.removeMe) {
      if (!this.hud.bossName) {
        this.hud.bossName = addTextCentered(this, GAME_W / 2, 244, `${this.boss.type.id.toUpperCase()} - ${this.stage.sub}`, '#ff2a68', 1)
          .setScrollFactor(0).setDepth(1001);
      }
      const bw = 200;
      const bx = GAME_W / 2 - bw / 2;
      const by = 258;
      bg.fillStyle(0x0a0a12, 1).fillRect(bx - 1, by - 1, bw + 2, 8);
      bg.fillStyle(0xa02a68, 1).fillRect(bx, by, Math.round(bw * Math.max(0, this.boss.hp / this.boss.maxHp)), 6);
    } else if (this.hud.bossName) {
      this.hud.bossName.destroy();
      this.hud.bossName = null;
    }

    // message timer
    if (this.hud.msgT > 0) {
      this.hud.msgT--;
      if (this.hud.msgImg) this.hud.msgImg.setVisible(this.hud.msgT % 20 < 14);
      if (this.hud.msgT === 0) {
        this.hud.msgImg?.destroy();
        this.hud.msgImg = null;
      }
    }
  }

  private setMessage(text: string, color = '#ffffff', scale = 2, frames = 120): void {
    this.hud.msgImg?.destroy();
    this.hud.msgImg = addTextCentered(this, GAME_W / 2, 104, text, color, scale)
      .setScrollFactor(0).setDepth(1003);
    this.hud.msgT = frames;
  }

  private showStageCard(): void {
    const band = this.add.rectangle(0, 100, GAME_W, 56, 0x05060a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(1004);
    const t1 = addTextCentered(this, GAME_W / 2, 110, this.stage.name, '#28e0c8', 3).setScrollFactor(0).setDepth(1005);
    const t2 = addTextCentered(this, GAME_W / 2, 138, this.stage.sub, '#ff2a68', 2).setScrollFactor(0).setDepth(1005);
    this.hud.overlay.push(band, t1, t2);
    this.time.delayedCall(2300, () => {
      band.destroy(); t1.destroy(); t2.destroy();
      this.hud.overlay = [];
    });
  }

  // ------------------------------------------------------------------- FX
  private spawnFx(kind: 'spark' | 'dust', x: number, y: number): void {
    const key = kind === 'spark' ? 'fx_spark1' : 'fx_dust';
    const img = this.add.image(x, y, key).setScale(kind === 'spark' ? 1.25 : 2).setDepth(391);
    this.fx.push({ img, t: 0, kind });
  }

  private stepFx(): void {
    this.combatInk.clear();
    // Brief luminous echoes follow actual active strike poses, never wind-ups.
    // Hitstop freezes emission so a landed punch does not pile up copies.
    if (this.hitstopT === 0) {
      for (const fighter of [...this.players, ...this.enemies]) {
        const key = fighter.atkSeq[fighter.atkIdx];
        if (!fighter.dead && (fighter.state === 'attack' || fighter.state === 'special') && key?.hit && fighter.atkT % 3 === 1) {
          const color = fighter.team === 'player' ? 0x66ffee : 0xff70bb;
          const img = this.add.image(fighter.sprite.x - fighter.facing * 3, fighter.sprite.y, fighter.sprite.texture.key)
            .setOrigin(0.5, 1).setScale(fighter.sprite.scaleX, fighter.sprite.scaleY)
            .setFlipX(fighter.facing < 0).setTint(color).setAlpha(0.23)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(fighter.fy - 0.2);
          this.fx.push({ img, t: 0, kind: 'trail' });
        }
      }
    }
    for (const m of this.motes) {
      m.life--; m.x += m.vx; m.y += m.vy; m.vy += 0.16;
      this.combatInk.lineStyle(1, m.color, m.life / m.max);
      this.combatInk.lineBetween(m.x, m.y, m.x - m.vx * 2, m.y - m.vy * 2);
    }
    this.motes = this.motes.filter(m => m.life > 0);
    for (const f of this.fx) {
      f.t++;
      if (f.kind === 'spark') {
        const fr = Math.floor(f.t / 4);
        if (fr === 0) f.img.setTexture('fx_spark0');
        else if (fr === 1) f.img.setTexture('fx_spark1');
        else if (fr === 2) f.img.setTexture('fx_spark2');
      } else if (f.kind === 'trail') {
        f.img.setAlpha(Math.max(0, 0.23 * (1 - f.t / 10)));
      } else {
        f.img.setAlpha(1 - f.t / 18);
        f.img.setScale(2 + f.t / 8);
      }
    }
    this.fx = this.fx.filter((f) => {
      if (f.t > 14) { f.img.destroy(); return false; }
      return true;
    });
  }

  // ---------------------------------------------------------------- combat
  private hitLanded(attacker: Fighter, spec: HitSpec, victim: Fighter, playSfx = true): void {
    if (!victim || victim.removeMe) return;
    const sx = victim.fx;
    const sy = victim.fy - victim.fz - (victim.isBig ? 52 : 38);
    this.spawnFx('spark', sx, sy);
    const count = spec.heavy || spec.launch ? 14 : 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.4 + (i % 4) * 0.8;
      this.motes.push({x:sx,y:sy,vx:Math.cos(angle)*speed + attacker.facing,
        vy:Math.sin(angle)*speed-1,life:18,max:18,color:i%2 ? 0xffd899 : 0x8bfff0});
    }
    if (this.motes.length > 160) this.motes.splice(0, this.motes.length - 160);

    if (playSfx) {
      Jukebox.sfx(this, victim.dead ? 'ko' : spec.heavy || spec.launch ? 'hitHeavy' : 'hit');
    }
    this.hitstopT = Math.max(this.hitstopT, spec.heavy || spec.launch ? 8 : 4);
    if (spec.heavy || spec.launch) this.cameras.main.shake(80, 0.004);

    if (attacker instanceof Player) {
      attacker.comboHits++;
      attacker.comboT = 90;
      attacker.score += 5 * attacker.comboHits;
      if (victim.dead && victim instanceof Enemy) {
        attacker.score += victim.type.score;
        this.maybeDrop(victim);
      }
    }
  }

  private maybeDrop(victim: Enemy): void {
    if (victim.type.boss) return;
    // armed enemies can drop their gear; armored foes rarely drop the good stuff
    if (victim.type.knifeVisual && Math.random() < 0.3) {
      this.items.push(new Item(this, 'knife', victim.fx, victim.fy));
      return;
    }
    if ((victim.type.id === 'brute' || victim.type.id === 'husk') && Math.random() < 0.1) {
      this.items.push(new Item(this, 'bat', victim.fx, victim.fy));
      return;
    }
    if (victim.type.id === 'sentinel' && Math.random() < 0.12) {
      this.items.push(new Item(this, 'katana', victim.fx, victim.fy));
      return;
    }
    if (Math.random() < 0.2) {
      const r = Math.random();
      const kind: ItemKind = r < 0.3 ? 'ramen' : r < 0.65 ? 'soda' : 'cash';
      this.items.push(new Item(this, kind, victim.fx, victim.fy));
    }
  }

  private resolveCombat(): void {
    const all: Fighter[] = [...this.players, ...this.enemies];
    for (const f of all) {
      const consumed = f.consumeHit();
      if (!consumed) continue;
      const { spec, already } = consumed;
      const box = f.attackBox(spec);
      const opponents: Fighter[] = f.team === 'player' ? this.enemies : this.players;
      let hits = 0;
      for (const o of opponents) {
        if (already.has(o.id)) continue;
        if (o.invulnT > 0) continue;
        if (o.state === 'down' || o.removeMe) continue;
        if (boxesOverlap(box, o.bodyBox())) {
          if (o.takeHit(f, spec)) {
            already.add(o.id);
            hits++;
            this.hitLanded(f, spec, o);
          }
        }
      }
      if (hits > 0 && spec.special && f instanceof Player && !f.hitConnected) {
        f.hp = Math.max(1, f.hp - SPECIAL_COST);
      }
      if (hits > 0) f.hitConnected = true;
    }

    // thrown enemies are wrecking balls
    for (const e of this.enemies) {
      if (e.state !== 'thrown') {
        this.thrownHits.delete(e.id);
        continue;
      }
      let set = this.thrownHits.get(e.id);
      if (!set) { set = new Set(); this.thrownHits.set(e.id, set); }
      const box = e.bodyBox();
      box.hh = 10;
      for (const o of this.enemies) {
        if (o === e || o.dead || set.has(o.id)) continue;
        if (o.state === 'down' || o.state === 'thrown') continue;
        if (boxesOverlap(box, o.bodyBox())) {
          const spec: HitSpec = { reach: 0, width: 0, dmg: 16, launch: true, heavy: true };
          if (o.takeHit(e.thrownBy ?? e, spec)) {
            set.add(o.id);
            this.hitLanded(e.thrownBy ?? e, spec, o);
          }
        }
      }
    }
  }

  private onGroundAttack(p: Player): void {
    if (this.introT > 0 || this.cleared || this.paused) return;
    if (p.weapon) { p.swingWeapon(); return; }
    // pick up a nearby weapon
    for (const it of this.items) {
      if (it.taken || !WEAPON_DEFS[it.def.kind]) continue;
      if (Math.abs(it.fx - p.fx) < 20 && Math.abs(it.fy - p.fy) < 10) {
        it.taken = true;
        p.weapon = { type: it.def.kind, uses: it.def.uses ?? 5 };
        it.destroy();
        Jukebox.sfx(this, 'pickup');
        return;
      }
    }
    if (p.tryGrab(this.enemies)) return;
    p.beginCombo();
  }

  // ----------------------------------------------------------------- waves
  private activateGate(): void {
    const gate = this.stage.gates[this.gateIdx];
    this.gateActive = true;
    let base = 0;
    for (const s of gate.spawns) {
      for (let i = 0; i < s.count; i++) {
        const side = s.side === 'mix' ? (i % 2 === 0 ? 'right' : 'left') : s.side;
        this.spawnQueue.push({ type: s.type, side, timer: base + i * (s.delay ?? 24) });
      }
      base += 10;
    }
    if (gate.boss) {
      this.setMessage('WARNING', '#ff2a68', 3, 100);
      Jukebox.playMusic(this, 'mus_boss', 0.6);
    }
  }

  private processSpawns(): void {
    let alive = this.enemies.filter((e) => !e.dead && !e.removeMe).length;
    for (const s of this.spawnQueue) {
      s.timer--;
      if (s.timer > 0) continue;
      const isBoss = ENEMY_TYPES[s.type]?.boss;
      if (!isBoss && alive >= MAX_ENEMIES) { s.timer = 20; continue; }
      s.timer = 0;
      s.done = true;
      this.spawnEnemy(s.type, s.side);
      alive++;
    }
    this.spawnQueue = this.spawnQueue.filter((s) => !s.done);
  }

  private spawnEnemy(type: string, side: string): void {
    const diff = DIFF_TABLE[this.settings.difficulty];
    let x: number;
    let destX: number;
    const lane = LANE_TOP + 8 + Math.random() * (LANE_BOTTOM - LANE_TOP - 16);
    if (side === 'left') {
      x = this.camX - 24 - Math.random() * 40;
      destX = this.camX + 60 + Math.random() * 80;
    } else if (side === 'drop') {
      x = this.camX + 90 + Math.random() * (GAME_W - 180);
      destX = x + (Math.random() < 0.5 ? -20 : 20);
    } else {
      x = this.camX + GAME_W + 24 + Math.random() * 40;
      destX = this.camX + GAME_W - 70 - Math.random() * 80;
    }
    x = Phaser.Math.Clamp(x, 8, this.stage.length - 8);
    const e = new Enemy(this, type, x, lane, diff.hp, destX);
    e.destY = lane;
    e.minX = 0;
    e.maxX = this.stage.length;
    if (side === 'drop') {
      e.fz = 150;
      e.setState('jump');
      e.setFrame('jump');
    }
    if (e.type.boss) {
      this.boss = e;
      this.bossActive = true;
    }
    this.enemies.push(e);
  }

  // ------------------------------------------------------------------ loop
  update(_time: number, delta: number): void {
    // Dialogue input is separate from combat input; no hit or movement leaks
    // through on the frame that a page or casebook closes.
    const wasReading = this.storyUi.active;
    this.storyUi.update();
    if (wasReading || this.storyUi.active) {
      this.accumulator = 0;
      this.bg.update(this.camX);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.tab) && this.continueT < 0 && this.gameOverT < 0 && !this.cleared) {
      const progress = readProgress();
      this.storyUi.journal(CASE_FILES.filter(file => file.unlock <= progress.unlocked), () => {});
      this.accumulator = 0;
      return;
    }
    if(this.clearReady) {
      if(Phaser.Input.Keyboard.JustDown(this.keys.z)) {this.clearReady=false;this.scene.start('TitleScene');return;}
      if(Phaser.Input.Keyboard.JustDown(this.keys.x)) {this.clearReady=false;this.advanceStage();return;}
    }
    // global keys
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) {
      this.settings.crt = !this.settings.crt;
      this.registry.set('settings', this.settings);
      applyCRT(this, this.settings.crt);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.settings.music = !this.settings.music;
      this.registry.set('settings', this.settings);
      Jukebox.setMusicEnabled(this, this.settings.music);
      if (this.settings.music && !this.cleared) {
        Jukebox.playMusic(this, this.bossActive ? 'mus_boss' : 'mus_stage', 0.6);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) && this.introT <= 0 && !this.cleared) {
      this.paused = !this.paused;
      this.setMessage(this.paused ? 'PAUSED' : '', '#ffffff', 2, this.paused ? 99999 : 1);
    }

    // P2 join-in
    if (this.players.length < 2 && Phaser.Input.Keyboard.JustDown(this.keys.j) && !this.cleared) {
      this.joinP2();
    }

    // fixed-step simulation
    this.accumulator = Math.min(this.accumulator + delta, 100);
    const STEP = 1000 / 60;
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.simStep();
    }

    this.bg.update(this.camX);
    this.cameras.main.setScroll(Math.round(this.camX), 0);
    this.syncHud();
  }

  private simStep(): void {
    if (this.paused || this.storyUi.active) return;
    this.stepFx();

    if (this.hitstopT > 0) {
      this.hitstopT--;
      return;
    }
    this.elapsedSteps++;

    if (this.introT > 0) {
      this.introT--;
      if (this.introT === 0) {
        Jukebox.playMusic(this, this.stage.music, 0.6);
      }
      // idle animation still ticks
      for (const p of this.players) p.step();
      return;
    }

    // stage-clear cinematic timer
    if (this.clearT >= 0) {
      this.clearT--;
      for (const p of this.players) p.step();
      if (this.clearT === 0) { this.clearT = -1; this.finishStory(); }
      return;
    }
    if (this.cleared) return;
    if (this.gameOverT >= 0) {
      this.gameOverT--;
      if (this.gameOverT === 0) this.scene.start('TitleScene');
      return;
    }

    // continue countdown
    if (this.continueT >= 0) {
      this.continueTick();
      return;
    }

    // ---- players ----
    const minX = this.camX + 18;
    const maxX = this.camX + GAME_W - 34;
    for (const p of this.players) {
      if (this.out.get(p.slot)) continue;
      const pad = p.readPad();
      p.control(pad, { minX, maxX });
      p.step();
      p.syncWeaponSprite();

      // out-of-lives tracking
      if (p.dead && p.removeMe && !this.out.get(p.slot) && !this.respawnQueue.some(r => r.p === p)) {
        p.lives--;
        if (p.lives >= 0) {
          this.respawnQueue.push({ p, timer: 80 });
        } else {
          this.out.set(p.slot, true);
          p.sprite.setVisible(false);
          p.shadow.setVisible(false);
        }
      }
    }

    // respawns
    for (const r of this.respawnQueue) {
      r.timer--;
      if (r.timer <= 0) {
        r.p.respawn(this.camX + GAME_W / 2 + (r.p.slot === 0 ? -24 : 24), 205);
        r.p.removeMe = false;
        r.p.sprite.setVisible(true);
        r.p.shadow.setVisible(true);
      }
    }
    this.respawnQueue = this.respawnQueue.filter((r) => r.timer > 0);

    // rejoin of an out player via continue
    for (const p of this.players) {
      if (!this.out.get(p.slot)) continue;
      const key = p.slot === 0 ? this.keys.z : this.keys.j;
      if (Phaser.Input.Keyboard.JustDown(key) && this.continues > 0) {
        this.continues--;
        p.lives = 1;
        this.out.set(p.slot, false);
        p.respawn(this.camX + GAME_W / 2, 205);
        p.removeMe = false;
        p.sprite.setVisible(true);
        p.shadow.setVisible(true);
        this.setMessage(`PLAYER ${p.slot + 1} BACK IN!`, '#58ff70', 2, 80);
      }
    }

    // all out?
    if (this.players.every((p) => this.out.get(p.slot))) {
      this.startContinue();
      return;
    }

    // ---- enemies ----
    const diff = DIFF_TABLE[this.settings.difficulty];
    const alivePlayers = this.players.filter((p) => !p.dead && !this.out.get(p.slot));
    for (const e of this.enemies) {
      const target = this.nearestPlayer(e, alivePlayers);
      e.ai({
        target,
        aggro: diff.aggro,
        tryStartAttack: (en) => {
          const max = this.settings.difficulty === 'easy' ? 1 : this.settings.difficulty === 'hard' ? 3 : 2;
          if (this.attackers.size >= max && !this.attackers.has(en.id)) return false;
          this.attackers.add(en.id);
          return true;
        },
        endAttack: (en) => this.attackers.delete(en.id),
      });
      e.step();
      e.syncWeaponSprite();
      if (!e.hasToken) this.attackers.delete(e.id);
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.removeMe) {
        if (e === this.boss) this.onBossDown();
        e.destroy();
        return false;
      }
      return true;
    });

    // ---- items ----
    for (const it of this.items) {
      it.step();
      if (it.taken) continue;
      if (WEAPON_DEFS[it.def.kind]) continue; // manual pickup
      for (const p of alivePlayers) {
        if (p.busy || p.airborne) continue;
        if (Math.abs(it.fx - p.fx) < 14 && Math.abs(it.fy - p.fy) < 8) {
          it.taken = true;
          if (it.def.heal) p.hp = Math.min(p.maxHp, p.hp + it.def.heal);
          if (it.def.score) p.score += it.def.score;
          Jukebox.sfx(this, it.def.score ? 'oneUp' : 'pickup');
          it.destroy();
          break;
        }
      }
    }
    this.items = this.items.filter((i) => !i.taken);

    // ---- combat ----
    this.resolveCombat();

    // ---- waves / camera ----
    if (!this.gateActive && this.gateIdx < this.stage.gates.length) {
      const gate = this.stage.gates[this.gateIdx];
      if (this.camX >= gate.x) this.activateGate();
    }
    this.processSpawns();
    if (this.gateActive && this.spawnQueue.length === 0 &&
        this.enemies.every((e) => e.dead || e.removeMe)) {
      this.gateActive = false;
      this.gateIdx++;
      this.attackers.clear();
      this.onStoryCheckpoint(this.gateIdx - 1);
      if (this.storyUi.active) return;
      if (this.gateIdx < this.stage.gates.length && !this.cleared) {
        this.goT = 160;
        Jukebox.sfx(this, 'go');
      }
    }

    if (this.goT > 0) {
      this.goT--;
      if (this.goT % 30 < 18 && !this.hud.msgImg) {
        // GO indicator handled via message below
      }
    }
    if (this.goT === 160) {
      this.setMessage('GO >>', '#58ff70', 3, 150);
      this.goT = 0;
    }

    // camera follows the leader, never scrolls back
    if (!this.gateActive && alivePlayers.length > 0) {
      const lead = Math.max(...alivePlayers.map((p) => p.fx));
      const target = lead - GAME_W * 0.55;
      const maxCam = this.stage.length - GAME_W;
      this.camX = Phaser.Math.Clamp(Math.max(this.camX, target), 0, maxCam);
    }
  }

  private nearestPlayer(e: Enemy, alive: Player[]): Player | null {
    let best: Player | null = null;
    let bd = Infinity;
    for (const p of alive) {
      const d = Math.abs(p.fx - e.fx) + Math.abs(p.fy - e.fy) * 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  private joinP2(): void {
    const p = new Player(this, 1, this.chars[1] ?? 'jinx', this.camX + GAME_W / 2 + 30, 215);
    p.invulnT = 90;
    this.players.push(p);
    this.numPlayers = 2;
    this.out.set(1, false);
    // clear join hint
    this.hud.slots[1].root.forEach((o) => o?.destroy());
    this.hud.slots[1].root = [];
    this.refreshHudChrome();
    this.setMessage('PLAYER 2 JOINED!', '#28e0c8', 2, 90);
    Jukebox.sfx(this, 'oneUp');
  }

  // ------------------------------------------------------------- continue
  private startContinue(): void {
    Jukebox.stopMusic();
    if (this.continues <= 0) {
      this.gameOverT = 200;
      this.setMessage('GAME OVER', '#ff2a68', 4, 190);
      return;
    }
    this.continueT = 60 * 10;
    this.showContinueOverlay(10);
  }

  private showContinueOverlay(count: number): void {
    this.hud.overlay.forEach((o) => o.destroy());
    this.hud.overlay = [];
    const band = this.add.rectangle(0, 90, GAME_W, 70, 0x05060a, 0.85).setOrigin(0, 0).setScrollFactor(0).setDepth(1004);
    const t1 = addTextCentered(this, GAME_W / 2, 100, 'CONTINUE?', '#ffd858', 3).setScrollFactor(0).setDepth(1005);
    const t2 = addTextCentered(this, GAME_W / 2, 130, `${count}`, '#ffffff', 3).setScrollFactor(0).setDepth(1005);
    const t3 = addTextCentered(this, GAME_W / 2, 150, 'PRESS Z OR J', '#7878a0', 1).setScrollFactor(0).setDepth(1005);
    this.hud.overlay.push(band, t1, t2, t3);
  }

  private continueTick(): void {
    this.continueT--;
    const count = Math.ceil(this.continueT / 60);
    if (this.continueT % 60 === 0) this.showContinueOverlay(count);

    const yes = Phaser.Input.Keyboard.JustDown(this.keys.z) || Phaser.Input.Keyboard.JustDown(this.keys.j);
    if (yes && this.continues > 0) {
      this.continues--;
      this.continueT = -1;
      this.hud.overlay.forEach((o) => o.destroy());
      this.hud.overlay = [];
      for (const p of this.players) {
        this.out.set(p.slot, false);
        p.lives = 2;
        p.respawn(this.camX + GAME_W / 2 + (p.slot === 0 ? -24 : 24), 205 + p.slot * 12);
        p.removeMe = false;
        p.sprite.setVisible(true);
        p.shadow.setVisible(true);
      }
      Jukebox.playMusic(this, this.bossActive ? 'mus_boss' : this.stage.music, 0.6);
      return;
    }
    if (this.continueT <= 0) {
      this.continueT = -1;
      this.hud.overlay.forEach((o) => o.destroy());
      this.hud.overlay = [];
      this.gameOverT = 200;
      this.setMessage('GAME OVER', '#ff2a68', 4, 190);
    }
  }

  private onStoryCheckpoint(index: number): void {
    if(this.stageIndex > 0) return;
    if (index > 4 || this.storySeen.has(index)) return;
    this.storySeen.add(index);
    unlockStory(index + 1);
    // One short scene at the cleared halfway gate. Other waves never interrupt.
    if (index !== 2 || !this.settings.story) return;
    this.storyUi.show(midpoint(this.chars[0] as HeroId), () => { this.goT = 160; });
  }

  private finishStory(): void {
    unlockStory(6, 'back-on');
    if (!this.settings.story) { this.showClearTally(); return; }
    this.storyUi.show(this.stageIndex===0 ? ending(this.chars[0] as HeroId) : campaignBeat(this.stageIndex,true,this.chars[0]), () => this.showClearTally());
  }

  // ------------------------------------------------------------ stage end
  private onBossDown(): void {
    this.bossActive = false;
    this.tweens.add({targets:this.blackout,alpha:0,duration:1600});
    this.cleared = true;
    this.clearT = 110;
    this.attackers.clear();
    Jukebox.stopMusic();
    Jukebox.sfx(this, 'ko');
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(300, 0.008);
  }

  private showClearTally(): void {
    Jukebox.sfx(this, 'oneUp');
    const secs = Math.floor(this.elapsedSteps / 60);
    const timeBonus = Math.max(0, 5000 - secs * 10);
    const lifeBonus = this.players.reduce((a, p) => a + Math.round((Math.max(0, p.hp) / p.maxHp) * 2000), 0);
    const total = timeBonus + lifeBonus;
    this.players[0].score += total;

    const band = this.add.rectangle(0, 60, GAME_W, 140, 0x05060a, 0.88).setOrigin(0, 0).setScrollFactor(0).setDepth(1004);
    const lines = [
      addTextCentered(this, GAME_W / 2, 70, this.stageIndex===3?'CAMPAIGN CLEAR!':'STAGE CLEAR!', '#58ff70', 3).setScrollFactor(0).setDepth(1005),
      addTextCentered(this, GAME_W / 2, 104, `TIME BONUS  ${timeBonus}`, '#e8e8f0', 2).setScrollFactor(0).setDepth(1005),
      addTextCentered(this, GAME_W / 2, 122, `LIFE BONUS  ${lifeBonus}`, '#e8e8f0', 2).setScrollFactor(0).setDepth(1005),
      addTextCentered(this, GAME_W / 2, 144, `TOTAL       ${total}`, '#ffd858', 2).setScrollFactor(0).setDepth(1005),
      addTextCentered(this, GAME_W / 2, 172, this.stageIndex===3 ? 'THE GRID BELONGS TO THE DISTRICT' : `NEXT: ${CAMPAIGN[this.stageIndex+1].sub}`, '#7878a0', 1).setScrollFactor(0).setDepth(1005),
      addTextCentered(this, GAME_W / 2, 186, this.stageIndex===3?'Z: TITLE    X: NEW CAMPAIGN':'Z: TITLE    X: NEXT STAGE', '#28e0c8', 1).setScrollFactor(0).setDepth(1005),
    ];
    this.hud.overlay.push(band, ...lines);

    // Poll keys only while the tally is active; no listeners survive a restart.
    this.clearReady = true;
  }

  private advanceStage():void {
    const next=this.stageIndex+1;
    this.scene.restart({stageIndex:next<CAMPAIGN.length?next:0,
      players:this.players.length,chars:this.players.map(p=>p.charId),settings:this.settings,
      carry:next<CAMPAIGN.length?this.players.map(p=>({score:p.score,lives:p.lives})):undefined,
      continues:next<CAMPAIGN.length?this.continues:3});
  }
}
