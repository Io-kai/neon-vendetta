// NEON VENDETTA — Boot: synthesize audio, bake all textures, then title.

import Phaser from 'phaser';
import { bakeAll } from '../art/baker';
import { bakeFont } from '../art/font';
import { buildSfx, buildMusic } from '../audio/synth';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('title_illustration', `${import.meta.env.BASE_URL}art/after-hours.png`);
    for (const area of ['market', 'arcade', 'depot']) this.load.image(`district_${area}`, `${import.meta.env.BASE_URL}art/${area}.png`);
    const sfx = buildSfx();
    for (const [key, uri] of Object.entries(sfx)) {
      this.load.audio(key, uri);
    }
    const music = buildMusic();
    for (const [key, uri] of Object.entries(music)) {
      this.load.audio(`mus_${key}`, uri);
    }
  }

  create(): void {
    bakeFont(this);
    bakeAll(this);
    // Selection portraits are frames into the retained key art, rather than
    // enlarged low-resolution HUD icons. Crop coordinates are normalized.
    if (this.textures.exists('title_illustration')) {
      const art = this.textures.get('title_illustration');
      const source = art.getSourceImage() as HTMLImageElement;
      for (const [id, x, y, w, h] of [
        ['kane', .65, .29, .17, .31],
        ['jinx', .50, .36, .16, .32],
        ['bull', .80, .20, .18, .32],
      ] as [string, number, number, number, number][]) {
        art.add(`portrait_${id}`, 0, Math.floor(source.width*x), Math.floor(source.height*y), Math.floor(source.width*w), Math.floor(source.height*h));
      }
    }
    this.scene.start('TitleScene');
  }
}
