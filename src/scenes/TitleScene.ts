// NEON VENDETTA — Title screen, options, and character select.

import Phaser from 'phaser';
import { GAME_H, GAME_W, GameSettings, DEFAULT_SETTINGS } from '../config';
import { textWidth } from '../art/font';
import { Background } from '../world/Stage';
import { ROSTER } from '../actors/Player';
import { Jukebox } from '../audio/jukebox';
import { applyCRT } from '../fx/CRTPipeline';
import { StoryOverlay } from '../story/StoryOverlay';
import { CASE_FILES, HERO_STORIES, HeroId } from '../story/story';
import { readProgress } from '../story/progress';

import { CAMPAIGN } from '../world/Stage';

type Mode = 'title' | 'options' | 'select';

const MENU = ['1 PLAYER', '2 PLAYERS', 'OPTIONS'] as const;

export class TitleScene extends Phaser.Scene {
  private bg!: Background;
  private storyUi!: StoryOverlay;
  private camX = 0;
  private mode: Mode = 'title';
  private settings: GameSettings;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private menuIdx = 0;
  private numPlayers: 1 | 2 = 1;
  private sel1 = 0;
  private sel2 = 1;
  private ready1 = false;
  private ready2 = false;
  private optIdx = 0;
  private starting = false;
  private stageIndex = 0;
  private keyListeners: (() => void)[] = [];

  constructor() {
    super('TitleScene');
    this.settings = { ...DEFAULT_SETTINGS };
  }

  create(): void {
    const saved = this.registry.get('settings') as GameSettings | undefined;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
    this.registry.set('settings', this.settings);
    Jukebox.musicEnabled = this.settings.music;
    Jukebox.sfxEnabled = this.settings.sfx;

    this.bg = new Background(this);
    this.storyUi = new StoryOverlay(this);
    this.cameras.main.removeBounds();
    this.cameras.main.setOrigin(0, 0).setZoom(3);
    this.cameras.main.setScroll(0, 0);
    applyCRT(this, this.settings.crt);

    this.mode = 'title';
    this.menuIdx = 0;
    this.buildTitle();
    Jukebox.playMusic(this, 'mus_title', 0.5);

    const kb = this.input.keyboard!;
    const on = (key: string, fn: () => void) => {
      const handler = () => { if (!this.storyUi.active) fn(); };
      kb.on(`keydown-${key}`, handler);
      this.keyListeners.push(() => kb.off(`keydown-${key}`, handler));
    };
    on('UP', () => this.nav(-1, 1));
    on('DOWN', () => this.nav(1, 1));
    on('LEFT', () => this.side(-1, 1));
    on('RIGHT', () => this.side(1, 1));
    on('Z', () => this.confirm(1));
    on('ENTER', () => this.confirm(1));
    on('W', () => this.nav(-1, 2));
    on('S', () => this.nav(1, 2));
    on('A', () => this.side(-1, 2));
    on('D', () => this.side(1, 2));
    on('J', () => this.confirm(2));
    on('X', () => this.back());
    on('ESC', () => this.back());
    on('E', () => this.showCasebook());
    for(let i=1;i<=4;i++)on(['ONE','TWO','THREE','FOUR'][i-1],()=>{
      if(this.mode!=='select'||this.starting||this.ready1||this.ready2)return;
      this.stageIndex=i-1;this.buildSelect();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.keyListeners.forEach((off) => off());
      this.keyListeners = [];
    });
  }

  update(): void {
    this.storyUi.update();
    this.camX += 0.25;
    this.bg.update(this.camX);
  }

  // ------------------------------------------------------------------ UI ---
  private clearUi(): void {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
  }

  private t(x:number,y:number,text:string,color='#ffffff',scale=1):Phaser.GameObjects.Container {
    const row=this.add.container(x,y);
    for(const [i,char] of Array.from(text.toUpperCase()).entries()){
      const key=`glyph_${char}`;
      if(char!==' '&&this.textures.exists(key))row.add(this.add.image(i*6*scale,0,key).setOrigin(0).setScale(scale).setTint(parseInt(color.slice(1),16)));
    }
    this.ui.push(row);return row;
  }

  private tc(cx:number,y:number,text:string,color='#ffffff',scale=1):Phaser.GameObjects.Container {
    return this.t(cx-textWidth(text,scale)/2,y,text,color,scale);
  }

  private panel(x: number, y: number, w: number, h: number, color = 0x10172a, alpha = 0.92): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0);
    this.ui.push(rect);
    return rect;
  }

  private chrome(label: string): void {
    this.panel(0, 0, GAME_W, GAME_H, 0x030916, this.mode === 'title' ? 0.08 : 0.55);
    this.panel(0, 0, GAME_W, 24, 0x050c19, 0.96);
    this.panel(0, 248, GAME_W, 22, 0x050c19, 0.96);
    this.panel(18, 23, 444, 1, 0x387486, 0.65);
    this.t(18, 9, 'NV / AFTER HOURS', '#78e6e3');
    this.t(318, 9, label, '#a6b7c7');
    this.t(18, 257, 'P1 Z HIT  X JUMP  C SPECIAL', '#91a7bc');
    this.t(266, 257, 'P2 J HIT  K JUMP  L SPECIAL', '#91a7bc');
  }

  private logo(): void {
    const key = 'nv_title_chrome';
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, 430, 100)!;
      const ctx = tex.getContext();
      ctx.save();
      ctx.transform(1, 0, -0.16, 1, 20, 0);
      ctx.font = '900 24px Arial, sans-serif';
      ctx.fillStyle = '#6cf8ea';
      ctx.fillText('N E O N', 12, 24);
      ctx.font = '900 65px Arial Black, Arial, sans-serif';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#070a1d';
      ctx.lineWidth = 8;
      ctx.strokeText('VENDETTA', 3, 82, 403);
      ctx.fillStyle = '#881c52';
      ctx.fillText('VENDETTA', 6, 87, 403);
      const gradient = ctx.createLinearGradient(0, 34, 0, 84);
      gradient.addColorStop(0, '#fff0d9');
      gradient.addColorStop(0.43, '#ffcaa8');
      gradient.addColorStop(0.46, '#f25d86');
      gradient.addColorStop(1, '#df235d');
      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#ffb7bb';
      ctx.lineWidth = 1;
      ctx.strokeText('VENDETTA', 3, 82, 403);
      ctx.fillText('VENDETTA', 3, 82, 403);
      ctx.restore();
      ctx.fillStyle = '#62ebe5';
      ctx.fillRect(128, 18, 280, 1);
      ctx.fillStyle = '#fa5979';
      ctx.fillRect(16, 94, 380, 2);
      tex.refresh();
    }
    const logo = this.add.image(20, 30, key).setOrigin(0).setDisplaySize(300, 70);
    this.ui.push(logo);
  }

  private buildTitle(): void {
    this.clearUi();
    this.mode = 'title';
    this.starting = false;
    this.ready1 = false;
    this.ready2 = false;
    if (this.textures.exists('title_illustration')) {
      const illustration = this.add.image(0, 0, 'title_illustration', '__BASE').setOrigin(0).setDisplaySize(GAME_W, GAME_H);
      this.ui.push(illustration);
    }
    this.chrome('MIDNIGHT TRANSMISSION');
    this.logo();
    this.t(28, 112, 'THE DISTRICT WENT DARK.', '#cadbe0');
    this.t(28, 125, 'NOT TONIGHT.', '#f8d5ad', 2);
    this.panel(28, 152, 191, 83, 0x081222, 0.92).setStrokeStyle(1, 0x284457);
    MENU.forEach((m, i) => {
      const sel = i === this.menuIdx;
      const y = 159 + i * 23;
      if (sel) {
        this.panel(30, y - 3, 187, 22, 0x25525c, 0.72);
        this.panel(28, y - 3, 3, 22, 0x6af3dc);
      }
      this.t(39, y + 3, `0${i + 1}`, sel ? '#75f8df' : '#516c83');
      this.t(63, y, m, sel ? '#f9e7c1' : '#9caec1', 2);
    });
    this.panel(0, 236, GAME_W, 12, 0x081222, 0.88);
    this.tc(240, 239, 'ENTER: PLAY   E: CASE FILES', '#9aacbb');
  }

  private showCasebook(): void {
    if (this.starting || this.mode === 'options') return;
    if (this.mode === 'select') {
      const id = Object.keys(ROSTER)[this.sel1] as HeroId;
      const hero = HERO_STORIES[id];
      this.storyUi.show({id: `dossier-${id}`, title: `${id.toUpperCase()} / DOSSIER`, pages: [
        {speaker: 'PROFILE', text: hero.secret, portrait: id},
      ]}, () => {});
      return;
    }
    const progress = readProgress();
    const records = CASE_FILES.filter(file => file.unlock <= progress.unlocked);
    this.storyUi.journal(records, () => {});
  }

  private buildOptions(): void {
    this.clearUi();
    this.mode = 'options';
    this.chrome('SYSTEM CONFIGURATION');
    this.t(52, 41, 'TUNE YOUR NIGHT', '#e9eee9', 3);
    this.t(54, 70, 'YOUR CITY. YOUR RULES.', '#71c5cc');
    this.panel(48, 91, 384, 137, 0x081221, 0.94).setStrokeStyle(1, 0x31526a);
    const rows = this.optionRows();
    rows.forEach((r, i) => {
      const sel = i === this.optIdx;
      const y = 98 + i * 21;
      if (sel) {
        this.panel(50, y - 4, 380, 23, 0x20505a, 0.8);
        this.panel(48, y - 4, 3, 23, 0x7cf6df);
      }
      this.t(62, y + 3, `0${i + 1}`, '#6eb0ba');
      this.t(94, y, r, sel ? '#f8e1b1' : '#9fafc3', 2);
    });
    this.tc(GAME_W / 2, 236, 'LEFT/RIGHT CHANGE - X BACK', '#90aabc');
  }

  private optionRows(): string[] {
    return [
      `DIFFICULTY: ${this.settings.difficulty.toUpperCase()}`,
      `CRT FILTER: ${this.settings.crt ? 'ON' : 'OFF'}`,
      `MUSIC: ${this.settings.music ? 'ON' : 'OFF'}`,
      `SFX: ${this.settings.sfx ? 'ON' : 'OFF'}`,
      `STORY: ${this.settings.story ? 'ON' : 'OFF'}`,
      'BACK',
    ];
  }

  private buildSelect(): void {
    this.clearUi();
    this.mode = 'select';
    this.chrome(this.numPlayers === 2 ? 'LOCAL CO-OP / 02' : 'SOLO OPERATION / 01');
    this.t(23, 33, 'CHOOSE YOUR FIGHTER', '#e9efea', 2);
    this.t(23, 53, `START: ${CAMPAIGN[this.stageIndex].sub}`, '#7ba8b8');
    this.t(300,53,'1-4: STARTING STAGE', '#72dbce');
    const ids = Object.keys(ROSTER);
    const cols = [91, 240, 389];
    ids.forEach((id, i) => {
      const st = ROSTER[id];
      const x = cols[i];
      const selBy1 = i === this.sel1;
      const selBy2 = this.numPlayers === 2 && i === this.sel2;
      const active = selBy1 || selBy2;
      const color = active ? 0x65e8d5 : 0x304b64;
      this.panel(x - 68, 69, 136, 159, active ? 0x12283a : 0x0a1524, 0.95).setStrokeStyle(1, color);
      this.panel(x - 67, 70, 134, 2, color);
      this.t(x - 59, 78, `0${i + 1}`, active ? '#76efde' : '#526e82');
      const port = this.add.image(x, 103, this.textures.exists('title_illustration') ? 'title_illustration' : `${id}_portrait`, this.textures.exists('title_illustration') ? `portrait_${id}` : undefined).setDisplaySize(64, 64).setAlpha(active ? 1 : 0.66);
      this.ui.push(port);
      this.tc(x, 139, st.name, active ? '#ffe3ac' : '#9aacbc', 2);
      this.tc(x, 157, st.title, '#86a6b6');
      const bars: [string, number][] = [['PW', st.pw], ['SP', st.sp], ['SK', st.sk]];
      bars.forEach(([label, v], bi) => {
        this.t(x - 51, 171 + bi * 9, label, '#8ca5b9');
        for (let b = 0; b < 5; b++) {
          this.panel(x - 25 + b * 14, 172 + bi * 9, 11, 5, b < v ? (active ? 0x6adecd : 0x527184) : 0x25364a);
        }
      });
      this.tc(x, 202, st.specialName, active ? '#f692a6' : '#866a85');
      this.tc(x, 214, HERO_STORIES[id as HeroId].tagline, active ? '#aac5cc' : '#617d92');
      // Separate badge rows remain legible when both players choose the same fighter.
      if (selBy1) this.badge(x + 42, 80, 'P1', this.ready1, 0xffd18e);
      if (selBy2) this.badge(x + 42, 96, 'P2', this.ready2, 0x6cf3df);
    });
    this.tc(GAME_W / 2, 237, this.numPlayers === 2 ? 'P1 L/R+Z  P2 A/D+J  E DOSSIER  X BACK' : 'L/R CHOOSE  Z READY  E DOSSIER  X BACK', '#9ab4c3');
  }

  private badge(x: number, y: number, player: string, ready: boolean, color: number): void {
    this.panel(x - 20, y - 3, 38, 13, ready ? 0x22664c : 0x0b192a).setStrokeStyle(1, ready ? 0x79f4b0 : color);
    this.tc(x - 1, y, ready ? `${player} OK` : player, ready ? '#8bffbf' : '#f4ead0');
  }

  // --------------------------------------------------------------- input ---
  private nav(dir: number, player: 1 | 2): void {
    if (this.mode === 'title') {
      if (player !== 1) return;
      this.menuIdx = (this.menuIdx + dir + MENU.length) % MENU.length;
      Jukebox.sfx(this, 'move');
      this.buildTitle();
    } else if (this.mode === 'options') {
      if (player !== 1) return;
      this.optIdx = (this.optIdx + dir + 6) % 6;
      Jukebox.sfx(this, 'move');
      this.buildOptions();
    } else {
      // select: up/down do nothing
    }
  }

  private side(dir: number, player: 1 | 2): void {
    if (this.mode === 'options' && player === 1) {
      this.changeOption(dir);
      return;
    }
    if (this.mode !== 'select') return;
    const n = Object.keys(ROSTER).length;
    if (player === 1 && !this.ready1) {
      this.sel1 = (this.sel1 + dir + n) % n;
      Jukebox.sfx(this, 'move');
    }
    if (player === 2 && this.numPlayers === 2 && !this.ready2) {
      this.sel2 = (this.sel2 + dir + n) % n;
      Jukebox.sfx(this, 'move');
    }
    this.buildSelect();
  }

  private changeOption(dir: number): void {
    const s = this.settings;
    switch (this.optIdx) {
      case 0: {
        const order: GameSettings['difficulty'][] = ['easy', 'normal', 'hard'];
        const i = (order.indexOf(s.difficulty) + dir + 3) % 3;
        s.difficulty = order[i];
        break;
      }
      case 1:
        s.crt = !s.crt;
        applyCRT(this, s.crt);
        break;
      case 2:
        s.music = !s.music;
        Jukebox.setMusicEnabled(this, s.music);
        if (s.music) Jukebox.playMusic(this, 'mus_title', 0.5);
        break;
      case 3:
        s.sfx = !s.sfx;
        Jukebox.sfxEnabled = s.sfx;
        break;
      case 4:
        s.story = !s.story;
        break;
      case 5:
        this.buildTitle();
        return;
    }
    this.registry.set('settings', s);
    Jukebox.sfx(this, 'move');
    this.buildOptions();
  }

  private confirm(player: 1 | 2): void {
    if (this.starting) return;
    if (this.mode === 'title') {
      if (player !== 1) return;
      Jukebox.sfx(this, 'select');
      if (this.menuIdx === 0) { this.numPlayers = 1; this.enterSelect(); }
      else if (this.menuIdx === 1) { this.numPlayers = 2; this.enterSelect(); }
      else this.buildOptions();
      return;
    }
    if (this.mode === 'options') {
      if (player !== 1) return;
      if (this.optIdx === 5) { Jukebox.sfx(this, 'select'); this.buildTitle(); }
      else this.changeOption(1);
      return;
    }
    // select
    if (player === 1 && !this.ready1) { this.ready1 = true; Jukebox.sfx(this, 'select'); }
    if (player === 2 && this.numPlayers === 2 && !this.ready2) { this.ready2 = true; Jukebox.sfx(this, 'select'); }
    this.buildSelect();
    const go = this.numPlayers === 1 ? this.ready1 : this.ready1 && this.ready2;
    if (go) {
      this.starting = true;
      this.panel(139, 114, 202, 29, 0x081522, 0.97).setStrokeStyle(1, 0x73f5bd);
      this.tc(GAME_W / 2, 121, 'GET READY...', '#8bffbf', 2);
      const ids = Object.keys(ROSTER);
      this.time.delayedCall(450, () => {
        this.scene.start('GameScene', {
          stageIndex:this.stageIndex,
          players: this.numPlayers,
          chars: [ids[this.sel1], ids[this.sel2]],
          settings: this.settings,
        });
      });
    }
  }

  private enterSelect(): void {
    this.ready1 = false;
    this.ready2 = false;
    this.starting = false;
    this.buildSelect();
  }

  private back(): void {
    if (this.starting) return;
    if (this.mode === 'select' && (this.ready1 || this.ready2) && !this.starting) {
      // first X cancels the ready state, second X exits to title
      this.ready1 = false;
      this.ready2 = false;
      Jukebox.sfx(this, 'move');
      this.buildSelect();
      return;
    }
    if (this.mode === 'options' || this.mode === 'select') {
      Jukebox.sfx(this, 'move');
      this.buildTitle();
    }
  }
}
