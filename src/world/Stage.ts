// NEON VENDETTA — Stage 1 "NEON DISTRICT": layout, enemy waves, item
// placement, and the parallax background runtime. Data-driven so new
// stages are just new entries.

import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { ItemKind } from '../actors/Item';

export interface WaveSpawn {
  type: string;
  count: number;
  side: 'right' | 'left' | 'drop' | 'mix';
  delay?: number;    // frames between individual spawns
}

export interface Gate {
  x: number;               // camera max X that triggers the wave
  spawns: WaveSpawn[];
  items?: { kind: ItemKind; x: number; y: number }[];
  boss?: boolean;
}

export interface StageDef {
  id: string;
  name: string;
  sub: string;
  length: number;          // world width in px
  gates: Gate[];
  items: { kind: ItemKind; x: number; y: number }[];
  music: string;
  bossId?: string;
  theme?: string;
}

export const STAGE_1: StageDef = {
  id: 'stage1',
  name: 'STAGE 1',
  sub: 'LIGHTS OUT / NEON WARD',
  length: 3200,
  music: 'mus_stage',
  gates: [
    { x: 330,  spawns: [{ type: 'punk', count: 3, side: 'right', delay: 30 }] },
    { x: 800,  spawns: [{ type: 'punk', count: 3, side: 'mix', delay: 26 }, { type: 'blade', count: 1, side: 'right', delay: 1 }] },
    { x: 1280, spawns: [{ type: 'punk', count: 2, side: 'left', delay: 20 }, { type: 'blade', count: 2, side: 'right', delay: 40 }] },
    { x: 1760, spawns: [{ type: 'brute', count: 1, side: 'right', delay: 1 }, { type: 'blade', count: 2, side: 'mix', delay: 46 }] },
    { x: 2240, spawns: [{ type: 'brute', count: 2, side: 'mix', delay: 60 }, { type: 'punk', count: 2, side: 'drop', delay: 30 }] },
    { x: 2620, spawns: [{ type: 'korvo', count: 1, side: 'right', delay: 1 }], boss: true },
  ],
  items: [
    { kind: 'knife', x: 520, y: 205 },
    { kind: 'soda', x: 740, y: 226 },
    { kind: 'pipe', x: 1330, y: 200 },
    { kind: 'ramen', x: 1450, y: 228 },
    { kind: 'cash', x: 1650, y: 210 },
    { kind: 'cash', x: 1980, y: 224 },
    { kind: 'pipe', x: 2150, y: 206 },
    { kind: 'ramen', x: 2520, y: 222 },
  ],
};

export const CAMPAIGN: StageDef[] = [STAGE_1,
  {id:'vesper',name:'STAGE 2',sub:'VESPER ROW',theme:'club',bossId:'sable',length:2800,music:'mus_stage',
   gates:[{x:220,spawns:[{type:'razor',count:3,side:'mix'}]},
    {x:680,spawns:[{type:'blade',count:2,side:'right'},{type:'razor',count:2,side:'left'}]},
    {x:1160,spawns:[{type:'brute',count:1,side:'right'},{type:'razor',count:3,side:'mix'}]},
    {x:1660,spawns:[{type:'razor',count:4,side:'drop',delay:55}]},
    {x:2220,spawns:[{type:'sable',count:1,side:'right'}],boss:true}],
   items:[{kind:'knife',x:520,y:215},{kind:'ramen',x:1030,y:220},{kind:'bat',x:1450,y:215},{kind:'soda',x:1580,y:225},{kind:'ramen',x:2160,y:210}]},
  {id:'canal',name:'STAGE 3',sub:'ASH CANAL',theme:'canal',bossId:'cinder',length:3000,music:'mus_stage',
   gates:[{x:240,spawns:[{type:'husk',count:2,side:'right'}]},
    {x:760,spawns:[{type:'husk',count:2,side:'mix'},{type:'razor',count:2,side:'right'}]},
    {x:1280,spawns:[{type:'husk',count:3,side:'mix',delay:65}]},
    {x:1810,spawns:[{type:'brute',count:1,side:'right'},{type:'husk',count:2,side:'left'}]},
    {x:2420,spawns:[{type:'cinder',count:1,side:'right'}],boss:true}],
   items:[{kind:'pipe',x:570,y:218},{kind:'ramen',x:1110,y:220},{kind:'soda',x:1730,y:207},{kind:'katana',x:2000,y:212},{kind:'ramen',x:2350,y:225}]},
  {id:'spire',name:'STAGE 4',sub:'GLASS SPIRE',theme:'spire',bossId:'orison',length:3200,music:'mus_stage',
   gates:[{x:240,spawns:[{type:'sentinel',count:3,side:'right'}]},
    {x:800,spawns:[{type:'sentinel',count:2,side:'mix'},{type:'razor',count:2,side:'drop'}]},
    {x:1370,spawns:[{type:'sentinel',count:3,side:'mix'},{type:'husk',count:1,side:'right'}]},
    {x:1950,spawns:[{type:'sentinel',count:4,side:'drop',delay:65}]},
    {x:2620,spawns:[{type:'orison',count:1,side:'right'}],boss:true}],
   items:[{kind:'pipe',x:570,y:210},{kind:'bat',x:900,y:214},{kind:'ramen',x:1220,y:220},{kind:'soda',x:1830,y:220},{kind:'ramen',x:2510,y:210}]},
];

// ---------------------------------------------------------------------------
// Parallax background: tile strips drawn by the baker, scrolled at factors.
// ---------------------------------------------------------------------------

export class Background {
  private sky: Phaser.GameObjects.TileSprite;
  private far: Phaser.GameObjects.TileSprite;
  private midA: Phaser.GameObjects.TileSprite;
  private midB: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;
  private fore: Phaser.GameObjects.TileSprite;
  private flickT = 0;
  private rain: Phaser.GameObjects.Graphics;
  private mist: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private weather = true) {
    this.sky = scene.add.tileSprite(0, 0, GAME_W, 120, 'bg_sky').setOrigin(0, 0);
    this.far = scene.add.tileSprite(0, 20, GAME_W, 150, 'bg_far').setOrigin(0, 0);
    this.midA = scene.add.tileSprite(0, 0, GAME_W, 190, 'bg_mid_a').setOrigin(0, 0);
    this.midB = scene.add.tileSprite(0, 0, GAME_W, 190, 'bg_mid_b').setOrigin(0, 0);
    this.ground = scene.add.tileSprite(0, 150, GAME_W, GAME_H - 150, 'bg_ground').setOrigin(0, 0);
    this.fore = scene.add.tileSprite(0, GAME_H - 14, GAME_W, 26, 'bg_fore').setOrigin(0, 0);

    this.sky.setScrollFactor(0).setDepth(-100);
    this.far.setScrollFactor(0).setDepth(-90);
    this.midA.setScrollFactor(0).setDepth(-80);
    this.midB.setScrollFactor(0).setDepth(-79);
    this.ground.setScrollFactor(0).setDepth(-70);
    this.fore.setScrollFactor(0).setDepth(400);
    this.midB.setAlpha(0);
    this.rain = scene.add.graphics().setScrollFactor(0).setDepth(350).setAlpha(0.35);
    this.mist = scene.add.graphics().setScrollFactor(0).setDepth(-65);

  }

  update(camX: number): void {
    this.sky.tilePositionX = camX * 0.08;
    this.far.tilePositionX = camX * 0.18;
    this.midA.tilePositionX = camX * 0.42;
    this.midB.tilePositionX = camX * 0.42;
    this.ground.tilePositionX = camX;
    this.fore.tilePositionX = camX * 1.25;

    // Only neon tubes flicker; architecture remains opaque and stable.
    this.flickT++;
    const flicker = this.flickT % 241;
    this.midB.setAlpha(flicker === 4 || flicker === 7 || flicker === 13 ? 1 : 0);
    this.rain.clear();
    this.rain.lineStyle(1, 0x94b8c8, 0.5);
    for (let i = 0; i < (this.weather ? 42 : 0); i++) {
      const x = ((i * 83.7 - this.flickT * 0.7 - camX * 0.12) % (GAME_W + 20) + GAME_W + 20) % (GAME_W + 20);
      const y = (i * 47.3 + this.flickT * (2.8 + i % 3)) % GAME_H;
      this.rain.lineBetween(Math.floor(x), Math.floor(y), Math.floor(x - 2), Math.floor(y + 5));
    }
    // Low steam drifts above the drain grates behind the actor plane.
    this.mist.clear();
    for (let i = 0; i < 4; i++) {
      const x = ((i * 143 - camX * 0.6 + Math.sin(this.flickT / 90 + i) * 13) % 580 + 580) % 580 - 50;
      this.mist.fillStyle(0x8ba4b5, 0.025);
      this.mist.fillEllipse(x, 173 + Math.sin(this.flickT / 65 + i) * 3, 88, 14);
    }
  }
}
