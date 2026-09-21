// NEON VENDETTA — color palettes (original)
// Each character is a palette swap over a shared body-part library,
// the exact technique Genesis brawlers used for enemy variety.

export type Palette = Record<string, string>;

// Shared semantic keys used by the pixel maps:
//  o outline | s skin | S skin shade | h hair | H hair light
//  j jacket  | J jacket shade       | t inner shirt
//  p pants   | P pants shade        | b boots/belt | w white | g gloves | m metal
const BASE: Palette = {
  '.': 'rgba(0,0,0,0)',
  o: '#101018',
  e: '#101018',
  w: '#f2f2ea',
  m: '#aab2c0',
};

export const CHAR_PALETTES: Record<string, Palette> = {
  // ---- Playable trio -------------------------------------------------
  kane: {
    ...BASE,
    s: '#eab688', S: '#c78e5e',
    h: '#d8a438', H: '#f4d878',
    j: '#d43a3a', J: '#8c1f28',
    t: '#f0f0e8',
    p: '#3a5fa8', P: '#24407c',
    b: '#2a2a32', g: '#7a1f1f',
  },
  jinx: {
    ...BASE,
    s: '#f2c49a', S: '#d09a6e',
    h: '#2fd0dc', H: '#8ff0f4',
    j: '#9a4ad0', J: '#5c2a8a',
    t: '#26262e',
    p: '#26262e', P: '#16161c',
    b: '#3a2a4a', g: '#d8d8e0',
  },
  bull: {
    ...BASE,
    s: '#c98f60', S: '#a06a42',
    h: '#1c1c22', H: '#3a3a44',
    j: '#4a7a3c', J: '#2c5224',
    t: '#202024',
    p: '#6a6f3a', P: '#464a24',
    b: '#33261c', g: '#2a2a2a',
  },
  // ---- Street punks ---------------------------------------------------
  punk: {
    ...BASE,
    s: '#dda87a', S: '#b8825a',
    h: '#e04aa0', H: '#f080c0',
    j: '#2a9a8a', J: '#1a6a5e',
    t: '#303036',
    p: '#4a4a56', P: '#2e2e38',
    b: '#22222a', g: '#c8c8d0',
  },
  blade: {
    ...BASE,
    s: '#caa06a', S: '#a67e4e',
    h: '#222228', H: '#3a3a44',
    j: '#3a4a7a', J: '#242e52',
    t: '#d8d8e0',
    p: '#2e3a5a', P: '#1c2438',
    b: '#1a1a22', g: '#e8e8f0',
  },
  // ---- Heavies ---------------------------------------------------------
  brute: {
    ...BASE,
    s: '#b87a50', S: '#8a5836',
    h: '#2a1a10', H: '#4a3020',
    j: '#d07828', J: '#9a4e14',
    t: '#d07828', T: '#9a4e14',
    p: '#5a5a62', P: '#3a3a42',
    b: '#2a2018', g: '#c8b8a8',
  },
  korvo: {
    ...BASE,
    s: '#e0aa78', S: '#b8845a',
    h: '#c0c0cc', H: '#ececf4',
    j: '#a02a68', J: '#5e1440',
    t: '#e8c860', T: '#a88c30',
    p: '#2a2a34', P: '#191920',
    b: '#1a1418', g: '#e8c860',
  },
};

// Palette for items / FX pixel maps (fixed, not per-character)
export const FX_PALETTE: Palette = {
  '.': 'rgba(0,0,0,0)',
  o: '#14141c',
  w: '#f0f0f0',
  m: '#b8c0cc',
  b: '#2a2a34',
  r: '#e04848',
  R: '#f09090',
  g: '#e8c860',
  G: '#f6e8a0',
  n: '#d08030',
  N: '#f0d090',
  y: '#ffd858',
  c: '#5df2ff',
  e: '#2f9fd8',
  s: '#626e7c',
  '*': '#ffffff',
  d: '#8a8496',
  k: 'rgba(8,8,16,0.42)',
};
