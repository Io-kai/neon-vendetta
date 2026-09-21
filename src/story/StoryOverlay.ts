import Phaser from 'phaser';
import { CinematicPlayer } from './CinematicPlayer';

interface StoryPage { speaker: string; text: string; portrait?: string; visual?: string; seconds?: number }
interface StoryBeat { id: string; title: string; pages: StoryPage[]; cinematic?: boolean }
interface Choice { id: string; label: string; detail: string }
type RecordEntry = { title: string; pages: StoryPage[] };
type Mode = 'dialogue' | 'choice' | 'journal';

/** Modal story UI. It owns display objects, never scene-wide input listeners. */
export class StoryOverlay {
  private film: CinematicPlayer;
  private cinematic = false;
  private shotStarted = 0;
  private shotDuration = 4000;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private mode: Mode | null = null;
  private title = '';
  private pages: StoryPage[] = [];
  private page = 0;
  private options: Choice[] = [];
  private selected = 0;
  private records: RecordEntry[] = [];
  private record = 0;
  private done?: () => void;
  private pick?: (id: string) => void;
  private readyAt = 0;
  private armed = false;
  private previous = [false, false, false, false, false];
  private keys: Phaser.Input.Keyboard.Key[];

  constructor(private scene: Phaser.Scene) {
    this.film = new CinematicPlayer(scene);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    const kb = scene.input.keyboard;
    this.keys = kb ? ['E', 'SPACE', 'ESC', 'LEFT', 'RIGHT'].map(key => kb.addKey(key)) : [];
  }

  get active(): boolean { return this.mode !== null; }

  show(beat: StoryBeat, onDone: () => void): void {
    this.reset();
    this.mode = 'dialogue';
    this.cinematic = !!beat.cinematic;
    this.title = beat.title;
    this.pages = this.cinematic ? beat.pages : this.paginate(beat.pages);
    this.done = onDone;
    if (!this.pages.length) { this.finish(); return; }
    this.gate();
    this.render();
  }

  choose(title: string, options: Choice[], onPick: (id: string) => void): void {
    if (!options.length) throw new Error('A story decision requires at least one option.');
    this.reset();
    this.mode = 'choice';
    this.title = title;
    this.options = options;
    this.pick = onPick;
    this.gate();
    this.render();
  }

  journal(records: RecordEntry[], onDone: () => void): void {
    this.reset();
    this.mode = 'journal';
    this.records = records;
    this.done = onDone;
    if (!records.length) {
      this.records = [{ title: 'THE NIGHT ARCHIVE', pages: [{ speaker: 'NO RECORDS YET', text: 'Recovered transmissions will appear here as you fight through the city.' }] }];
    }
    this.loadRecord();
    this.gate();
    this.render();
  }

  update(): void {
    if (!this.active) return;
    if (this.cinematic) {
      const elapsed = this.scene.time.now - this.shotStarted;
      this.film.tick(elapsed / this.shotDuration);
      if (elapsed >= this.shotDuration) { this.nextShot(); return; }
    }
    const down = this.keys.map(key => key.isDown);
    const pressed = down.map((value, i) => value && !this.previous[i]);
    this.previous = down;
    // A held combat/menu key cannot consume dialogue or commit a decision.
    if (!this.armed) {
      if (!down.some(Boolean) && this.scene.time.now >= this.readyAt) this.armed = true;
      return;
    }
    if (this.scene.time.now < this.readyAt) return;
    if (pressed[2] && this.mode !== 'choice') { this.finish(); return; }
    if (pressed[3] || pressed[4]) {
      const dir = pressed[3] ? -1 : 1;
      if (this.mode === 'choice') {
        this.selected = (this.selected + dir + this.options.length) % this.options.length;
        this.readyAt = this.scene.time.now + 220;
        this.render();
      } else if (this.mode === 'journal') {
        this.record = (this.record + dir + this.records.length) % this.records.length;
        this.loadRecord();
        this.readyAt = this.scene.time.now + 220;
        this.render();
      }
      return;
    }
    if (!pressed[0] && !pressed[1]) return;
    if (this.mode === 'choice') {
      const callback = this.pick;
      const id = this.options[this.selected].id;
      this.reset();
      callback?.(id);
      return;
    }
    if (this.cinematic) { this.nextShot(); return; }
    if (this.page + 1 < this.pages.length) this.page++;
    else if (this.mode === 'journal') this.page = 0;
    else { this.finish(); return; }
    this.gate();
    this.render();
  }

  destroy(): void { this.reset(); }

  private finish(): void {
    const callback = this.done;
    this.reset();
    callback?.();
  }

  private nextShot(): void {
    if (this.page + 1 >= this.pages.length) { this.finish(); return; }
    this.page++; this.gate(); this.render();
  }

  private reset(): void {
    this.film.clear();
    this.cinematic = false;
    this.clearObjects();
    this.mode = null;
    this.done = undefined;
    this.pick = undefined;
    this.page = 0;
    this.selected = 0;
    this.record = 0;
    this.pages = [];
    this.records = [];
    this.options = [];
  }

  private gate(): void {
    this.readyAt = this.scene.time.now + 220;
    this.armed = false;
    this.previous = this.keys.map(key => key.isDown);
  }

  private loadRecord(): void {
    const record = this.records[this.record];
    this.title = record.title;
    this.pages = this.paginate(record.pages);
    if (!this.pages.length) this.pages = [{ speaker: 'ARCHIVE', text: 'This record contains no transmission.' }];
    this.page = 0;
  }

  private clean(text: string): string {
    return text.toUpperCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, "'")
      .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
  }

  private wrap(text: string, width: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (let word of this.clean(text).split(' ')) {
      if (line && line.length + word.length + 1 > width) { lines.push(line); line = ''; }
      while (word.length > width) { lines.push(word.slice(0, width)); word = word.slice(width); }
      line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  }

  private paginate(pages: StoryPage[]): StoryPage[] {
    // Keep long imported archive entries readable rather than clipping them.
    return pages.flatMap(page => {
      const lines = this.wrap(page.text, 53);
      const result: StoryPage[] = [];
      for (let i = 0; i < lines.length; i += 4) result.push({ ...page, text: lines.slice(i, i + 4).join('\n') });
      return result.length ? result : [page];
    });
  }

  private clearObjects(): void {
    this.objects.forEach(object => object.destroy());
    this.objects = [];
  }

  private rect(x: number, y: number, width: number, height: number, color: number, alpha = 1): Phaser.GameObjects.Rectangle {
    const object = this.scene.add.rectangle(x, y, width, height, color, alpha).setOrigin(0).setScrollFactor(0).setDepth(2100);
    this.objects.push(object);
    return object;
  }

  private text(x: number, y: number, value: string, color = 0xcbdde7): void {
    // Reuse the fixed boot glyph atlas: opening archives never adds textures.
    for (const [index, char] of Array.from(this.clean(value)).entries()) {
      if (char === ' ') continue;
      const texture = `glyph_${char}`;
      if (!this.scene.textures.exists(texture)) continue;
      const glyph = this.scene.add.image(x + index * 6, y, texture).setOrigin(0).setTint(color).setScrollFactor(0).setDepth(2101);
      this.objects.push(glyph);
    }
  }

  private lines(x: number, y: number, text: string, width: number, color = 0xdce7ec, limit = 4): void {
    this.wrap(text, width).slice(0, limit).forEach((line, i) => this.text(x, y + i * 14, line, color));
  }

  private render(): void {
    this.clearObjects();
    if (this.cinematic) {
      this.shotStarted = this.scene.time.now;
      this.shotDuration = (this.pages[this.page].seconds ?? 4) * 1000;
      this.film.show(this.pages[this.page], this.title, this.page, this.pages.length);
      return;
    }
    this.rect(0, 0, 480, 270, 0x030813, 0.84);
    this.rect(22, 44, 436, 186, 0x091423).setStrokeStyle(1, 0x345d70);
    this.rect(22, 44, 3, 186, 0x6de6d9);
    this.rect(36, 94, 408, 1, 0x284351);
    this.text(38, 55, this.mode === 'choice' ? 'DECISION / YOU CARRY THE CONSEQUENCE' : this.mode === 'journal' ? 'NIGHT ARCHIVE / RECOVERED TRANSMISSIONS' : 'NEON VENDETTA / INCOMING TRANSMISSION', 0x79cec9);
    this.lines(38, 72, this.title, 66, 0xffddac, 1);
    if (this.mode === 'choice') { this.renderChoice(); return; }
    const page = this.pages[this.page];
    this.rect(38, 106, 65, 67, 0x122638).setStrokeStyle(1, 0x3b6878);
    const portrait = page.portrait?.toLowerCase();
    const frame = portrait ? `portrait_${portrait}` : '';
    const illustrated = !!portrait && this.scene.textures.exists('title_illustration') && this.scene.textures.get('title_illustration').has(frame);
    const fallback = portrait ? `${portrait}_portrait` : '';
    if (illustrated || (portrait && this.scene.textures.exists(fallback))) {
      const image = this.scene.add.image(70, 139, illustrated ? 'title_illustration' : fallback, illustrated ? frame : undefined)
        .setDisplaySize(60, 60).setScrollFactor(0).setDepth(2101);
      this.objects.push(image);
    } else {
      for (let i = 0; i < 10; i++) this.rect(45 + i * 5, 130 - ((i * 7) % 13), 2, 14 + ((i * 11) % 19), 0x5fd1c8, 0.7);
      this.text(46, 157, 'SIGNAL', 0x79cec9);
    }
    this.text(116, 107, this.clean(page.speaker).slice(0, 53), 0x83f2db);
    this.lines(116, 125, page.text, 53);
    this.text(38, 181, this.mode === 'journal' ? `RECORD ${this.record + 1}/${this.records.length}` : 'CHANNEL / ENCRYPTED', 0x718ea3);
    this.text(356, 181, `PAGE ${this.page + 1}/${this.pages.length}`, 0x91aebb);
    this.rect(36, 197, 408, 1, 0x284351);
    this.text(38, 211, this.mode === 'journal' ? '< > RECORD   E/SPACE PAGE   ESC CLOSE' : 'E/SPACE CONTINUE   ESC SKIP SCENE', 0xa6bdca);
    this.text(38, 242, this.mode === 'journal' ? 'THE RECORD REMAINS. THE CITY REMEMBERS.' : 'COMBAT PAUSED / READ AT YOUR PACE', 0x8ca9b9);
  }

  private renderChoice(): void {
    const current = this.options[this.selected];
    this.text(38, 104, `< ${this.selected + 1}/${this.options.length} >   LEFT/RIGHT TO CONSIDER`, 0x86bccb);
    this.rect(37, 119, 406, 24, 0x19433f).setStrokeStyle(1, 0x66dec5);
    this.lines(46, 127, current.label, 64, 0xc3ffe4, 1);
    this.lines(44, 153, current.detail, 64, 0xdce7ec, 3);
    this.rect(36, 197, 408, 1, 0x284351);
    this.text(38, 211, 'E/SPACE COMMIT   THE CHOICE CANNOT BE SKIPPED', 0xffd5a1);
    this.text(38, 242, 'SHARED CREW DECISION / TAKE YOUR TIME', 0x8ca9b9);
  }
}
