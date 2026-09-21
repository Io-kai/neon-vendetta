// NEON VENDETTA — original pixel-art part library.
// Sprites are composed from small hand-drawn body-part pixel maps
// (strings; one char = one pixel, keys resolved through a Palette),
// then assembled into animation frames via per-frame part placements.
// Origin for every frame: feet-center at (0,0), up = negative Y, facing right.

export type PixMap = string[];

export interface FramePart {
  p: string;      // part key
  x: number;      // top-left x relative to origin
  y: number;      // top-left y relative to origin
  fx?: boolean;   // flip part horizontally
}

export type FrameDef = FramePart[];

export interface BodyDef {
  parts: Record<string, PixMap>;
  frames: Record<string, FrameDef>;
}

// ---------------------------------------------------------------------------
// STANDARD BODY (players, punk, blade)
// ---------------------------------------------------------------------------

const head: PixMap = [
  '.oooooo...',
  'ohhhhhho..',
  'ohHhhhho..',
  'ohssssso..',
  'osssessso.',
  'ossssssso.',
  'osssssssos',
  '.osSSSSo..',
  '..oooo....',
];

const torso: PixMap = [
  'oooooooooooo',
  'ojjjjjjjjjjo',
  'ojJjjttjjJjo',
  'ojJjjttjjJjo',
  'ojJjjttttJjo',
  'ojJjjttttJjo',
  'ojJjjjttjJjo',
  'ojjjjjjjjjjo',
  'obbbbbbbbbbo',
  'oppppppppppo',
  '.oooooooooo.',
];

const arm: PixMap = [
  '.oo.',
  'ojjo',
  'ojJo',
  'ojjo',
  'ojJo',
  'ojjo',
  'ojjo',
  'oggo',
  'oggo',
];

const punch: PixMap = [
  '.oooooooo.',
  'ojjjjjjjjo',
  'ojjJJggggo',
  '.oooooooo.',
];

const upper: PixMap = [
  '.ogo.',
  'oggo',
  'oggo',
  'ojjo',
  'ojjo',
  'ojJo',
  'ojjo',
  'ojjo',
  '.oo.',
];

const legsStand: PixMap = [
  'oppppppppppo',
  'oppppppppppo',
  'oppppPpppppo',
  'opppoooppppo',
  'opppo..opppo',
  'opppo..opppo',
  'oppPo..oPppo',
  'opppo..opppo',
  'opppo..opppo',
  'obbbo..obbbo',
  'obbbboobbbbo',
  'obbbboobbbbo',
];

const legsWalk: PixMap = [
  'oppppppppppo',
  'oppppppppppo',
  'oppppPpppppo',
  'opppo.oppppo',
  'opppo..opppo',
  'oppp...opppo',
  'oppp....oppp',
  'oppp....oppp',
  'opbb....obbo',
  'obbb....obbb',
  'obbbo..obbbo',
  'obbbo..obbbo',
];

const legsJump: PixMap = [
  'oppppppppppo',
  'oppppPpppppo',
  'opppPooPpppo',
  'opppo..opppo',
  'opppo..opppo',
  'obbbo..obbbo',
  '.obbo..obbo.',
];

const legsKick: PixMap = [
  '..oppppppo....',
  '..oppppppo....',
  '..oppppppppppo',
  '..opppobbbbbbo',
  '..opppo.......',
  '..opppo.......',
  '..opPpo.......',
  '..opppo.......',
  '..obbbo.......',
  '..obbbo.......',
];

const smash: PixMap = [
  'oggg..gggo',
  'ojjo..ojjo',
  'ojjo..ojjo',
  'ojjo..ojjo',
  '.oo....oo.',
];

const down: PixMap = [
  '....................',
  '..oooooooooooooo....',
  '.oppppppjjjjjjjohhho',
  'oppppppPjjjjJjjohsso',
  'obbbbbbojjjjjjjoosso',
  '.ooooooobbbbbbbo.oo.',
  '....................',
];

// ---------------------------------------------------------------------------
// BIG BODY (brute, boss)
// ---------------------------------------------------------------------------

const headBig: PixMap = [
  '..ooooooo..',
  '.ossssssso.',
  'ossssssssso',
  'osssessseso',
  'ossssssssso',
  'ohhhhhhhhho',
  'ohhhhhhhhho',
  '.ohhhhhhho.',
  '..ooooooo..',
];

const torsoBig: PixMap = [
  'ooooooooooooooo',
  'osstttttttttsso',
  'osstttttttttsso',
  'ottttttTtttttto',
  'otttttTTTttttto',
  'otttttTTTttttto',
  'ottttttTtttttto',
  'ottttttttttttto',
  'ottttttttttttto',
  'obbbbbbbbbbbbbo',
  'opppppppppppppo',
  'opppppppppppppo',
  '.ooooooooooooo.',
];

const armBig: PixMap = [
  '.ooo.',
  'ossso',
  'ossso',
  'ossso',
  'ossso',
  'ossso',
  'ossso',
  'ossso',
  'ogggg',
  'ogggg',
];

const punchBig: PixMap = [
  '.oooooooooo.',
  'osssssssssso',
  'osssssgggggo',
  'osssssssssso',
  '.oooooooooo.',
];

const legsBig: PixMap = [
  'oppppppppppppo',
  'oppppppppppppo',
  'opppppPPpppppo',
  'oppppooooppppo',
  'oppppo..oppppo',
  'oppppo..oppppo',
  'oppPPo..oPPppo',
  'oppppo..oppppo',
  'oppppo..oppppo',
  'oppppo..oppppo',
  'obbbbo..obbbbo',
  'obbbbo..obbbbo',
  'obbbbbo.obbbbo',
];

const downBig: PixMap = [
  '........................',
  '..oooooooooooooooo......',
  '.oppppppppttttttttohho',
  'opppppppPPttttTtttosso',
  'obbbbbbooottttttttosso',
  '.oooooo..obbbbbbbo.oo.',
  '........................',
];

// ---------------------------------------------------------------------------
// FRAME TABLES
// ---------------------------------------------------------------------------

const stdFrames: Record<string, FrameDef> = {
  idle: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -6, y: -23 },
    { p: 'arm', x: -10, y: -22 },
    { p: 'head', x: -6, y: -31 },
    { p: 'arm', x: 6, y: -22 },
  ],
  idle2: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -6, y: -24 },
    { p: 'arm', x: -10, y: -23 },
    { p: 'head', x: -6, y: -32 },
    { p: 'arm', x: 6, y: -23 },
  ],
  walkA: [
    { p: 'legsWalk', x: -6, y: -12 },
    { p: 'torso', x: -6, y: -24 },
    { p: 'arm', x: -11, y: -23 },
    { p: 'head', x: -6, y: -32 },
    { p: 'arm', x: 7, y: -23 },
  ],
  walkB: [
    { p: 'legsWalk', x: -6, y: -12, fx: true },
    { p: 'torso', x: -6, y: -23 },
    { p: 'arm', x: -9, y: -22 },
    { p: 'head', x: -6, y: -31 },
    { p: 'arm', x: 5, y: -22 },
  ],
  jab: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -5, y: -23 },
    { p: 'arm', x: -9, y: -22 },
    { p: 'head', x: -5, y: -31 },
    { p: 'punch', x: 3, y: -21 },
  ],
  cross: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -4, y: -23 },
    { p: 'arm', x: -10, y: -22 },
    { p: 'head', x: -4, y: -31 },
    { p: 'punch', x: 3, y: -22 },
  ],
  uppercut: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -5, y: -22 },
    { p: 'arm', x: -9, y: -21 },
    { p: 'head', x: -4, y: -30 },
    { p: 'upper', x: 2, y: -30 },
  ],
  swing: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -5, y: -23 },
    { p: 'arm', x: -9, y: -22 },
    { p: 'head', x: -5, y: -31 },
    { p: 'punch', x: 3, y: -20 },
  ],
  grab: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -5, y: -23 },
    { p: 'punch', x: 2, y: -21 },
    { p: 'head', x: -5, y: -31 },
    { p: 'punch', x: 2, y: -18 },
  ],
  kick: [
    { p: 'legsKick', x: -6, y: -10 },
    { p: 'torso', x: -7, y: -22 },
    { p: 'arm', x: -11, y: -21 },
    { p: 'head', x: -7, y: -30 },
    { p: 'arm', x: 1, y: -20 },
  ],
  jump: [
    { p: 'legsJump', x: -6, y: -9 },
    { p: 'torso', x: -6, y: -21 },
    { p: 'arm', x: -10, y: -20 },
    { p: 'head', x: -6, y: -29 },
    { p: 'arm', x: 6, y: -20 },
  ],
  hurt: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -8, y: -23 },
    { p: 'arm', x: -12, y: -22 },
    { p: 'head', x: -9, y: -31 },
    { p: 'arm', x: 4, y: -22 },
  ],
  down: [{ p: 'down', x: -10, y: -6 }],
  lariat: [
    { p: 'legsStand', x: -6, y: -12 },
    { p: 'torso', x: -6, y: -23 },
    { p: 'punch', x: -14, y: -20, fx: true },
    { p: 'head', x: -6, y: -31 },
    { p: 'punch', x: 4, y: -20 },
  ],
  slam: [
    { p: 'legsJump', x: -6, y: -9 },
    { p: 'torso', x: -6, y: -20 },
    { p: 'smash', x: -4, y: -12 },
    { p: 'head', x: -6, y: -27 },
  ],
  rising: [
    { p: 'legsJump', x: -6, y: -9 },
    { p: 'torso', x: -6, y: -21 },
    { p: 'arm', x: -10, y: -20 },
    { p: 'head', x: -5, y: -29 },
    { p: 'upper', x: 2, y: -34 },
  ],
};

const bigFrames: Record<string, FrameDef> = {
  idle: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -7, y: -26 },
    { p: 'armBig', x: -12, y: -25 },
    { p: 'headBig', x: -6, y: -35 },
    { p: 'armBig', x: 7, y: -25 },
  ],
  idle2: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -7, y: -27 },
    { p: 'armBig', x: -12, y: -26 },
    { p: 'headBig', x: -6, y: -36 },
    { p: 'armBig', x: 7, y: -26 },
  ],
  walkA: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -7, y: -27 },
    { p: 'armBig', x: -13, y: -26 },
    { p: 'headBig', x: -6, y: -36 },
    { p: 'armBig', x: 8, y: -26 },
  ],
  walkB: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -7, y: -26 },
    { p: 'armBig', x: -11, y: -25 },
    { p: 'headBig', x: -6, y: -35 },
    { p: 'armBig', x: 6, y: -25 },
  ],
  jab: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -6, y: -26 },
    { p: 'armBig', x: -12, y: -25 },
    { p: 'headBig', x: -5, y: -35 },
    { p: 'punchBig', x: 5, y: -24 },
  ],
  charge: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -4, y: -26 },
    { p: 'armBig', x: -14, y: -25 },
    { p: 'headBig', x: -3, y: -35 },
    { p: 'armBig', x: -16, y: -24 },
  ],
  hurt: [
    { p: 'legsBig', x: -7, y: -13 },
    { p: 'torsoBig', x: -9, y: -26 },
    { p: 'armBig', x: -14, y: -25 },
    { p: 'headBig', x: -10, y: -35 },
    { p: 'armBig', x: 5, y: -25 },
  ],
  down: [{ p: 'downBig', x: -12, y: -7 }],
};

// ---------------------------------------------------------------------------

export const BODIES: Record<string, BodyDef> = {
  std: {
    parts: { head, torso, arm, punch, upper, legsStand, legsWalk, legsJump, legsKick, smash, down },
    frames: stdFrames,
  },
  big: {
    parts: { headBig, torsoBig, armBig, punchBig, legsBig, downBig },
    frames: bigFrames,
  },
};

// Which body + palette each character uses, and display scale (map px -> world px)
export interface CharArtDef {
  body: string;
  palette: string;
  scale: number;
}

export const CHAR_ART: Record<string, CharArtDef> = {
  razor: {body:'std',palette:'blade',scale:2},
  husk: {body:'big',palette:'brute',scale:2.35},
  sentinel: {body:'std',palette:'blade',scale:2.1},
  sable: {body:'std',palette:'jinx',scale:2.2},
  cinder: {body:'big',palette:'brute',scale:2.65},
  orison: {body:'big',palette:'korvo',scale:2.5},
  kane:  { body: 'std', palette: 'kane',  scale: 2 },
  jinx:  { body: 'std', palette: 'jinx',  scale: 2 },
  bull:  { body: 'std', palette: 'bull',  scale: 2 },
  punk:  { body: 'std', palette: 'punk',  scale: 2 },
  blade: { body: 'std', palette: 'blade', scale: 2 },
  brute: { body: 'big', palette: 'brute', scale: 2.25 },
  korvo: { body: 'big', palette: 'korvo', scale: 2.5 },
};

// ---------------------------------------------------------------------------
// ITEMS & FX MAPS
// ---------------------------------------------------------------------------

export const ITEM_MAPS: Record<string, PixMap> = {
  // Steel pipe: bright crown highlight, mid body, shadowed belly, open mouth.
  pipe: [
    '..oooooooooooooooo....',
    '.omwwwwwwwwwwwwwwsoo..',
    'ommmmmmmmmmmmmmmmmosmo',
    '.osssssssssssssssssoo.',
    '..oooooooooooooooo....',
  ],
  // Street knife: pommel, wrapped grip, guard, bright-edge blade with fuller.
  knife: [
    '.......ooooooooo...',
    '......omwwwwwwwwo..',
    '..oooommmmmmmmmmo..',
    '.osbbooosssssssso..',
    '..obbo.............',
    '...bb..............',
  ],
  // Wooden bat: thin taped handle swelling into a heavy barrel, pale grain
  // highlight along the crown, warm brown body beneath.
  bat: [
    '..........ooooooooooo...',
    '.........onNNNNNNNNNNNo..',
    '.oooooooonNnnnnnnnnnnNNo',
    'onnnnnnnoNnnnnnnnnnnnnNo',
    'onnnnnnnoNnnnnnnnnnnnnNo',
    '.oooooooonnnnnnnnnnnnNo.',
    '.........onnnnnnnnnnno..',
    '..........ooooooooooo...',
  ],
  // Katana: dark wrapped tsuka, bright 2-row blade with a full white hamon
  // edge and polished tip glint.
  katana: [
    '........ooooooooooooooooo.',
    '.......ommmmmmmmmmmmmmmmwo',
    '..ooooowwwwwwwwwwwwwwwwwwo',
    '.osbbso...................',
    '..sbbs....................',
    '...bbb....................',
    '....oo....................',
  ],
  // "STREETLIGHT" stun baton: ribbed riot grip, banded steel shaft, twin
  // emitter rings and a fat crackling blue-white electrode.
  baton: [
    '..................owwo.....',
    '..ooooooooooooooocccco....',
    '.obbbbbbbmmmmmmmeewwwweo..',
    'obsbsbsbmmmmmmccewwwwwceo.',
    '.obbbbbbbmmmmmmmeewwwweo..',
    '..ooooooooooooooocccco....',
    '..................owwo.....',
  ],
  // "YELLOWLINE" mono-edge: courier-yellow wrapped grip, guard, long steel
  // spine over a glowing cyan monomolecular edge.
  monoedge: [
    '..........oooooooooooooooooo..',
    '..ooooooommmmmmmmmmmmmmmmmwoc.',
    '.oybybyboccccccccccccccccccewo',
    '..ooooooo......................',
    '...bbbbb.......................',
    '....oooo.......................',
  ],
  // "FOUNDATION" hydraulic sledge: banded steel haft, massive block head
  // with hazard chevrons and a dark hydraulic piston band.
  sledge: [
    '...........oooooooooooo...',
    '..........ommmmmmmmmmmmo..',
    '..........ommyyyyyyymmmo..',
    '..........ommmmmmmmmmmmo..',
    '..........omssssssssssmo..',
    '..oooooooomsmmmmmmmmmsmo..',
    '.ommmmmmmommmmmmmmmmmmmo..',
    '.ommmmmmmommmmmmmmmmmmmo..',
    '..oooooooomsmmmmmmmmmsmo..',
    '..........omssssssssssmo..',
    '..........ommmmmmmmmmmmo..',
    '..........ommyyyyyyymmmo..',
    '..........ommmmmmmmmmmmo..',
    '...........oooooooooooo...',
  ],
  ramen: [
    '..w..w......',
    '.wwwwwwwwww.',
    'owwowowwowwo',
    '.onnnnnnnno.',
    '.onNNNNNNno.',
    '.onnnnnnnno.',
    '..onnnnnno..',
    '..oooooooo..',
    '...oooooo...',
  ],
  soda: [
    '.ooooo.',
    'ommmmmmo',
    'omrrrrmo',
    'omrRRrmo',
    'omrrrrmo',
    'ommmmmmo',
    'ommmmmmo',
    '.ooooo.',
  ],
  cash: [
    '.ooooooo.',
    'ogggggggo',
    'ogGgggGgo',
    'ogggggggo',
    'ogGgggGgo',
    'ogggggggo',
    '.ooooooo.',
  ],
};

export const FX_MAPS: Record<string, PixMap> = {
  spark0: [
    '..........',
    '....yy....',
    '...y**y...',
    '..y*yy*y..',
    '..y*yy*y..',
    '...y**y...',
    '....yy....',
    '..........',
  ],
  spark1: [
    '..y....y..',
    '...y..y...',
    '....yy....',
    'y..y**y..y',
    '..yy**yy..',
    'y..y**y..y',
    '....yy....',
    '...y..y...',
    '..y....y..',
  ],
  spark2: [
    '..........',
    '.y......y.',
    '..........',
    '....yy....',
    '...y..y...',
    '....yy....',
    '..........',
    '.y......y.',
    '..........',
  ],
  dust: [
    '.d..d...',
    'd.dd.dd.',
    'dddddddd',
    '.dddddd.',
    '..d..d..',
  ],
  shadow: [
    '....kkkkkkkk....',
    '..kkkkkkkkkkkk..',
    '.kkkkkkkkkkkkkk.',
    '..kkkkkkkkkkkk..',
    '....kkkkkkkk....',
  ],
};

// Fix soda rows that need exact widths (kept readable above)
ITEM_MAPS.soda = [
  '.ooooo.',
  'ommmmmmo',
  'omrrrrmo',
  'omrRRrmo',
  'omrrrrmo',
  'ommmmmmo',
  'ommmmmmo',
  '.ooooo.',
];
