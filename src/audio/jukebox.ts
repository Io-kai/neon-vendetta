// NEON VENDETTA — audio playback wrapper (SFX + looping music).

import Phaser from 'phaser';

export class Jukebox {
  private static music: Phaser.Sound.BaseSound | null = null;
  private static musicKey = '';
  static musicEnabled = true;
  static sfxEnabled = true;

  static sfx(scene: Phaser.Scene, key: string, volume = 1): void {
    if (!this.sfxEnabled) return;
    if (!scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { volume });
  }

  static playMusic(scene: Phaser.Scene, key: string, volume = 0.65): void {
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.stopMusic();
    this.musicKey = key;
    if (!this.musicEnabled) return;
    if (!scene.cache.audio.exists(key)) return;
    this.music = scene.sound.add(key, { loop: true, volume });
    this.music.play();
  }

  static stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    this.musicKey = '';
  }

  static setMusicEnabled(scene: Phaser.Scene, on: boolean): void {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
  }
}
