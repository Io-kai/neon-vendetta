// Regression checks against transpiled production actors, with only Phaser's
// renderer/input boundaries stubbed so combat state remains real and repeatable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
const math = { Clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)), Linear: (a, b, t) => a + (b - a) * t };
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const filename = path.join(root, 'src/actors', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const require = (id) => {
    if (id === 'phaser') return { Math: math };
    if (id === '../config') return { GRAVITY: 0.38, LANE_TOP: 150, LANE_BOTTOM: 230 };
    if (id === '../art/parts') return { CHAR_ART: { kane: { scale: 2 }, punk: { scale: 2 }, brute: { scale: 2.5 } } };
    if (id === '../art/fighters') return { FIGHTER_TEXTURE_SCALE: 3 };
    if (id.startsWith('./')) return load(id.slice(2));
    throw Error(`Unexpected import ${id}`);
  };
  vm.runInNewContext(code, { require, exports: mod.exports, module: mod, console, Math, Set }, { filename });
  cache.set(name, mod.exports);
  return mod.exports;
}
// Each image needs its own fluent proxy rather than a shared mutable object.
function makeImage() {
  const value = { texture: '', scale: 1 };
  let proxy;
  proxy = new Proxy(value, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === 'setTexture') target.texture = args[0];
      if (key === 'setScale') target.scale = args[0];
      return proxy;
    };
  } });
  return proxy;
}
const scene = {
  add: { image: makeImage }, textures: { exists: () => true },
  events: { emit() {} }, input: { keyboard: { addKey: () => ({ isDown: false }) } },
};
const { Fighter } = load('Fighter');
const { Player } = load('Player');
const { Enemy } = load('Enemy');
let checks = 0;
function check(title, fn) { fn(); checks++; console.log(`PASS ${title}`); }
const fighter = () => new Fighter(scene, 'kane', 'player', 100, 190);
const neutral = { left: false, right: false, up: false, down: false, attack: false, jump: false, special: false, attackPr: false, jumpPr: false, specialPr: false };
const bounds = { minX: 0, maxX: 800 };
check('high resolution texture retains logical size', () => assert.equal(fighter().sprite.scale, 2 / 3));
check('walking sustains phase and exact requested travel', () => {
  const f = fighter(); const poses = new Set();
  for (let i = 0; i < 60; i++) { f.setState('walk'); f.vx = 1.5; f.step(); poses.add(f.sprite.texture); }
  assert.equal(f.fx, 190); assert.equal(f.stateT, 60); assert.equal(poses.size, 12);
});
check('idle breathes through six poses', () => { const f = fighter(); const poses = new Set(); for (let i = 0; i < 54; i++) { f.step(); poses.add(f.sprite.texture); } assert.equal(poses.size, 6); });
check('strike stays live through active pose and remembers each victim', () => {
  const f = fighter(); f.startAttack([{ frame: 'jab', dur: 5, hit: { reach: 30, width: 26, dmg: 6 } }, { frame: 'jabRecover', dur: 4 }]);
  const first = f.consumeHit(); assert.ok(first); first.already.add(12);
  f.step(); const second = f.consumeHit(); assert.ok(second); assert.ok(second.already.has(12));
  for (let i = 0; i < 4; i++) f.step(); assert.equal(f.consumeHit(), null);
});
check('taking damage cancels a pending strike', () => {
  const f = fighter(); f.startAttack([{ frame: 'jab', dur: 8, hit: { reach: 30, width: 26, dmg: 6 } }]);
  f.takeHit(fighter(), { reach: 20, width: 20, dmg: 3 }); assert.equal(f.consumeHit(), null); assert.equal(f.atkSeq.length, 0);
});
check('replacement attack cannot inherit a stale strike', () => {
  const f = fighter(); f.startAttack([{ frame: 'jab', dur: 8, hit: { reach: 30, width: 26, dmg: 6 } }]);
  f.startAttack([{ frame: 'crossWindup', dur: 4 }]); assert.equal(f.consumeHit(), null);
});
check('finished aerial strike returns to flight', () => {
  const f = fighter(); f.fz = 50; f.vz = 3; f.vx = 2; f.startAttack([{ frame: 'kick', dur: 2 }]); f.step(); f.step(); assert.equal(f.state, 'jump'); assert.equal(f.vx, 2);
});
check('buffered combo waits for strike before next windup', () => {
  const p = new Player(scene, 0, 'kane', 100, 190); p.beginCombo();
  p.control({ ...neutral, attackPr: true }, bounds); assert.equal(p.atkIdx, 0);
  for (let i = 0; i < 5; i++) { p.step(); p.control(neutral, bounds); }
  assert.equal(p.atkSeq[0].frame, 'jabWindup');
  for (let i = 0; i < 5; i++) { p.step(); p.control(neutral, bounds); }
  assert.equal(p.atkSeq[0].frame, 'crossWindup');
});
check('a surviving knee retains the grab for a second knee and throw', () => {
  const p = new Player(scene, 0, 'kane', 100, 190); const victim = new Enemy(scene, 'punk', 115, 190, 1);
  p.grabHold(victim); p.control({ ...neutral, attackPr: true }, bounds); assert.equal(p.held, victim);
  p.control({ ...neutral, attackPr: true }, bounds); assert.equal(p.held, victim);
  p.control({ ...neutral, attackPr: true }, bounds); assert.equal(victim.state, 'thrown'); assert.equal(p.held, null);
});
check('completed enemy attack releases token and starts recovery positioning', () => {
  const e = new Enemy(scene, 'punk', 160, 190, 1); e.mode = 'chase'; e.hasToken = true;
  e.startAttack([{ frame: 'jabRecover', dur: 1 }]); e.step(); let released = 0;
  e.ai({ target: fighter(), aggro: 1, tryStartAttack: () => true, endAttack: () => { released++; } });
  assert.equal(released, 1); assert.equal(e.hasToken, false); assert.ok(e.cooldown > 0); assert.equal(e.mode, 'reposition');
});
check('heavy armor cannot bypass invulnerability', () => {
  const e = new Enemy(scene, 'brute', 160, 190, 1); e.invulnT = 20;
  assert.equal(e.takeHit(fighter(), { reach: 20, width: 20, dmg: 5 }), false); assert.equal(e.hp, e.maxHp);
});
console.log(`${checks} combat regression checks passed.`);
