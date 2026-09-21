// NEON VENDETTA — procedural audio: SFX + chiptune music, rendered to
// 16-bit PCM WAV data-URIs at boot. No audio files; everything synthesized.

const SR = 22050;

function midiHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// -- primitive oscillators ---------------------------------------------------
function square(t: number): number {
  return t - Math.floor(t) < 0.5 ? 1 : -1;
}
function saw(t: number): number {
  return 2 * (t - Math.floor(t)) - 1;
}

export class Pcm {
  data: Float32Array;
  constructor(seconds: number) {
    this.data = new Float32Array(Math.ceil(seconds * SR));
  }
  add(i: number, v: number): void {
    if (i >= 0 && i < this.data.length) this.data[i] += v;
  }
  // simple oscillators with linear decay envelope
  tone(start: number, dur: number, hz0: number, hz1: number, vol: number, kind: 'sq' | 'saw' | 'sin'): void {
    const s0 = Math.floor(start * SR);
    const n = Math.floor(dur * SR);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const hz = hz0 + (hz1 - hz0) * t;
      phase += hz / SR;
      const env = Math.min(1, t * 40) * (1 - t);
      let v = 0;
      if (kind === 'sq') v = square(phase);
      else if (kind === 'saw') v = saw(phase);
      else v = Math.sin(phase * Math.PI * 2);
      this.add(s0 + i, v * vol * env);
    }
  }
  noise(start: number, dur: number, vol: number, lp = 0.4): void {
    const s0 = Math.floor(start * SR);
    const n = Math.floor(dur * SR);
    let last = 0;
    let seed = 22222;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const w = (seed / 0xffffffff) * 2 - 1;
      last = last + lp * (w - last); // cheap lowpass
      const t = i / n;
      this.add(s0 + i, last * vol * (1 - t) * Math.min(1, t * 60));
    }
  }
  toWavDataUri(): string {
    const n = this.data.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const dv = new DataView(buf);
    const wstr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
    };
    wstr(0, 'RIFF');
    dv.setUint32(4, 36 + n * 2, true);
    wstr(8, 'WAVE');
    wstr(12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, SR, true);
    dv.setUint32(28, SR * 2, true);
    dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true);
    wstr(36, 'data');
    dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const v = Math.max(-1, Math.min(1, this.data[i]));
      dv.setInt16(44 + i * 2, Math.round(v * 32767), true);
    }
    // base64
    const bytes = new Uint8Array(buf);
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CH));
    }
    return `data:audio/wav;base64,${btoa(bin)}`;
  }
}

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------

export function buildSfx(): Record<string, string> {
  const out: Record<string, string> = {};

  let p = new Pcm(0.12);
  p.noise(0, 0.1, 0.5, 0.5);
  p.tone(0, 0.08, 300, 90, 0.35, 'sin');
  out.punch = p.toWavDataUri();

  p = new Pcm(0.16);
  p.noise(0, 0.12, 0.6, 0.3);
  p.tone(0, 0.14, 140, 50, 0.55, 'sin');
  out.hit = p.toWavDataUri();

  p = new Pcm(0.3);
  p.noise(0, 0.25, 0.7, 0.25);
  p.tone(0, 0.26, 90, 32, 0.8, 'sin');
  p.tone(0, 0.1, 400, 120, 0.25, 'sq');
  out.hitHeavy = p.toWavDataUri();

  p = new Pcm(0.14);
  p.noise(0, 0.13, 0.35, 0.7);
  out.swing = p.toWavDataUri();

  p = new Pcm(0.14);
  p.tone(0, 0.13, 280, 660, 0.3, 'sq');
  out.jump = p.toWavDataUri();

  p = new Pcm(0.1);
  p.noise(0, 0.07, 0.4, 0.25);
  p.tone(0, 0.08, 110, 60, 0.4, 'sin');
  out.land = p.toWavDataUri();

  p = new Pcm(0.24);
  p.tone(0, 0.07, 660, 660, 0.3, 'sq');
  p.tone(0.07, 0.07, 880, 880, 0.3, 'sq');
  p.tone(0.14, 0.09, 1320, 1320, 0.3, 'sq');
  out.pickup = p.toWavDataUri();

  p = new Pcm(0.5);
  p.tone(0, 0.45, 180, 1900, 0.3, 'saw');
  p.noise(0.05, 0.4, 0.3, 0.5);
  out.special = p.toWavDataUri();

  p = new Pcm(0.6);
  p.noise(0, 0.5, 0.8, 0.2);
  p.tone(0, 0.5, 70, 24, 0.9, 'sin');
  out.ko = p.toWavDataUri();

  p = new Pcm(0.08);
  p.tone(0, 0.06, 880, 880, 0.3, 'sq');
  out.select = p.toWavDataUri();

  p = new Pcm(0.09);
  p.tone(0, 0.07, 440, 440, 0.28, 'sq');
  out.move = p.toWavDataUri();

  p = new Pcm(0.34);
  p.tone(0, 0.12, 523, 523, 0.32, 'sq');
  p.tone(0.12, 0.2, 784, 784, 0.32, 'sq');
  out.go = p.toWavDataUri();

  p = new Pcm(0.5);
  [880, 1046, 1318, 1568, 2093].forEach((f, i) => p.tone(i * 0.08, 0.1, f, f, 0.28, 'sq'));
  out.oneUp = p.toWavDataUri();

  p = new Pcm(0.2);
  p.tone(0, 0.18, 1200, 300, 0.25, 'saw');
  out.grab = p.toWavDataUri();

  p = new Pcm(0.22);
  p.noise(0, 0.2, 0.5, 0.35);
  p.tone(0.02, 0.16, 200, 60, 0.4, 'sin');
  out.throwSfx = p.toWavDataUri();

  p = new Pcm(0.18);
  p.tone(0, 0.16, 220, 90, 0.4, 'sq');
  p.noise(0, 0.1, 0.3, 0.4);
  out.hurt = p.toWavDataUri();

  return out;
}

// ---------------------------------------------------------------------------
// MUSIC — mini tracker rendered to a looping WAV. Original chiptunes.
// ---------------------------------------------------------------------------

interface SongStep {
  b?: number;   // bass midi note (0 = rest)
  l?: number;   // lead midi note
  k?: boolean;  // kick
  s?: boolean;  // snare
  h?: boolean;  // hat
}

function renderSong(bpm: number, steps: SongStep[], loopGuard = 1.05): string {
  const stepDur = 60 / bpm / 4; // 16th notes
  const total = steps.length * stepDur * loopGuard;
  const pcm = new Pcm(total);

  steps.forEach((st, i) => {
    const t = i * stepDur;
    if (st.k) {
      pcm.tone(t, 0.11, 120, 40, 0.65, 'sin');
    }
    if (st.s) {
      pcm.noise(t, 0.09, 0.4, 0.55);
      pcm.tone(t, 0.06, 210, 160, 0.2, 'sq');
    }
    if (st.h) {
      pcm.noise(t, 0.03, 0.16, 0.9);
    }
    if (st.b) {
      pcm.tone(t, stepDur * 0.95, midiHz(st.b), midiHz(st.b), 0.3, 'sq');
    }
    if (st.l) {
      pcm.tone(t, stepDur * 1.6, midiHz(st.l), midiHz(st.l), 0.16, 'saw');
      pcm.tone(t, stepDur * 1.6, midiHz(st.l) * 1.005, midiHz(st.l) * 1.005, 0.1, 'sq');
    }
  });

  return pcm.toWavDataUri();
}

// Note helper: name like "A2" -> midi
function N(name: string): number {
  const names: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  return names[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}

// Build the stage theme: driving 8-bar loop, A minor (i - VI - III - VII).
function stageTheme(): string {
  const bpm = 152;
  const bassRiff = (root: string): (number | undefined)[] => {
    const r = N(root);
    // 16 steps of driving 8ths with octave pops
    return [r, 0, r, 0, r + 12, 0, r, 0, r, 0, r, 0, r + 12, 0, r + 10, r + 12];
  };
  const leadBar = (notes: (number | undefined)[]): (number | undefined)[] => notes;

  const bars: { bass: (number | undefined)[]; lead: (number | undefined)[] }[] = [
    { bass: bassRiff('A1'), lead: leadBar([N('A4'), 0, 0, N('C5'), 0, 0, N('E5'), 0, 0, 0, N('D5'), 0, N('C5'), 0, N('D5'), 0]) },
    { bass: bassRiff('A1'), lead: leadBar([N('E5'), 0, 0, N('G5'), 0, 0, N('A5'), 0, 0, 0, N('G5'), 0, N('E5'), 0, N('D5'), 0]) },
    { bass: bassRiff('F1'), lead: leadBar([N('F5'), 0, 0, N('A5'), 0, 0, N('C6'), 0, 0, 0, N('A5'), 0, N('G5'), 0, N('A5'), 0]) },
    { bass: bassRiff('C2'), lead: leadBar([N('G5'), 0, 0, N('E5'), 0, 0, N('C5'), 0, 0, 0, N('E5'), 0, N('G5'), 0, N('E5'), 0]) },
    { bass: bassRiff('A1'), lead: leadBar([N('A4'), 0, 0, N('C5'), 0, 0, N('E5'), 0, 0, 0, N('D5'), 0, N('C5'), 0, N('D5'), 0]) },
    { bass: bassRiff('A1'), lead: leadBar([N('E5'), 0, N('A5'), 0, N('G5'), 0, N('E5'), 0, N('D5'), 0, N('E5'), 0, N('C5'), 0, N('D5'), 0]) },
    { bass: bassRiff('F1'), lead: leadBar([N('F5'), 0, 0, N('E5'), 0, 0, N('F5'), 0, 0, 0, N('G5'), 0, N('A5'), 0, N('G5'), 0]) },
    { bass: bassRiff('G1'), lead: leadBar([N('G5'), 0, N('B5'), 0, N('D6'), 0, N('B5'), 0, N('G5'), 0, N('A5'), 0, N('B5'), 0, N('G5'), 0]) },
  ];

  const steps: SongStep[] = [];
  bars.forEach((bar, bi) => {
    for (let s = 0; s < 16; s++) {
      const beat = s % 4 === 0;
      const backbeat = s % 8 === 4;
      steps.push({
        b: bar.bass[s],
        l: bar.lead[s],
        k: beat || (bi % 2 === 1 && s === 14),
        s: backbeat,
        h: s % 2 === 0,
      });
    }
  });
  return renderSong(bpm, steps);
}

// Boss theme: faster, tenser, E minor phrygian-ish.
function bossTheme(): string {
  const bpm = 168;
  const bassRiff = (root: string): (number | undefined)[] => {
    const r = N(root);
    return [r, r, 0, r, 0, r, r + 1, 0, r, r, 0, r, 0, r + 12, 0, r + 1];
  };
  const bars: { bass: (number | undefined)[]; lead: (number | undefined)[] }[] = [
    { bass: bassRiff('E1'), lead: [N('E5'), 0, N('F5'), 0, N('E5'), 0, N('B4'), 0, N('E5'), 0, N('F5'), 0, N('G5'), 0, N('F5'), 0] },
    { bass: bassRiff('E1'), lead: [N('E5'), 0, N('F5'), 0, N('E5'), 0, N('B4'), 0, N('D5'), 0, N('C5'), 0, N('B4'), 0, N('C5'), 0] },
    { bass: bassRiff('C2'), lead: [N('C5'), 0, N('D5'), 0, N('C5'), 0, N('G4'), 0, N('C5'), 0, N('D5'), 0, N('E5'), 0, N('D5'), 0] },
    { bass: bassRiff('B1'), lead: [N('B4'), 0, N('C5'), 0, N('B4'), 0, N('F#4'), 0, N('B4'), 0, N('D5'), 0, N('F5'), 0, N('E5'), 0] },
  ];
  const steps: SongStep[] = [];
  bars.forEach((bar, bi) => {
    for (let s = 0; s < 16; s++) {
      steps.push({
        b: bar.bass[s],
        l: bar.lead[s],
        k: s % 4 === 0 || s === 10,
        s: s % 8 === 4,
        h: true,
      });
    }
  });
  return renderSong(bpm, steps);
}

// Title sting: short heroic loop.
function titleTheme(): string {
  const bpm = 120;
  const bars: { bass: (number | undefined)[]; lead: (number | undefined)[] }[] = [
    { bass: [N('A1'), 0, 0, 0, N('A1'), 0, 0, 0, N('C2'), 0, 0, 0, N('E2'), 0, 0, 0], lead: [N('A4'), 0, N('C5'), 0, N('E5'), 0, N('A5'), 0, N('G5'), 0, N('E5'), 0, N('C5'), 0] },
    { bass: [N('F1'), 0, 0, 0, N('F1'), 0, 0, 0, N('G1'), 0, 0, 0, N('G1'), 0, 0, 0], lead: [N('F5'), 0, N('A5'), 0, N('C6'), 0, N('B5'), 0, N('G5'), 0, N('B5'), 0, N('D6'), 0] },
  ];
  const steps: SongStep[] = [];
  bars.forEach((bar) => {
    for (let s = 0; s < 16; s++) {
      steps.push({
        b: bar.bass[s],
        l: bar.lead[s],
        k: s % 8 === 0,
        s: s % 8 === 4,
        h: s % 4 === 2,
      });
    }
  });
  return renderSong(bpm, steps);
}

export function buildMusic(): Record<string, string> {
  return {
    stage: stageTheme(),
    boss: bossTheme(),
    title: titleTheme(),
  };
}
