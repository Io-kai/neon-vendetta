import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const load=(file,imports={})=>{const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(new URL('../src/art/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module:mod,exports:mod.exports,require:id=>imports[id]??{},Math,Set});return mod.exports;};
const parts=load('parts.ts');const {fighterWalkGeometry:g}=load('fighters.ts',{'./parts':parts});let count=0;
for(const [id,{scale}] of Object.entries(parts.CHAR_ART)){
 for(let i=0;i<12;i++){
  const v=g(id,i*Math.PI/6);
  assert((v.fist[0]-v.shoulder[0]-1)*v.nearStep<=1e-9,`${id}: near arm must oppose near leg`);
  assert((v.rearFist[0]-v.rearShoulder[0]-1)*v.farStep<=1e-9,`${id}: rear arm must oppose rear leg`);
  assert(Math.abs(v.shoulder[0]-v.rearShoulder[0])<3,`${id}: walking shoulders must be foreshortened`);
  assert(v.frontFoot[1]<=53&&v.backFoot[1]<=53,`${id}: feet do not pass below ground`);count++;
 }
 const start=g(id,Math.PI/2),end=g(id,Math.PI*1.5);
 assert(Math.abs((start.frontFoot[0]-end.frontFoot[0])*scale-22)<1e-6,`${id}: planted foot travel matches actor displacement`);
}
console.log(`PASS ${count} gait poses: contralateral arms, profile shoulders, foot clearance; all seven planted stride lengths match world movement`);
