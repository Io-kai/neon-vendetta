import puppeteer from 'puppeteer';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=new URL('../.e2e/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[];function check(ok,label){results.push({ok,label});console.log(ok?'PASS':'FAIL',label);if(!ok)throw Error(label);}
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:810});
 await p.goto(process.argv[2]||'http://127.0.0.1:4181');await p.waitForFunction(()=>window.__NV_GAME__?.scene.isActive('TitleScene'),{timeout:60000});
 await p.keyboard.press('Enter');
 await p.waitForFunction(()=>window.__NV_GAME__.scene.getScene('TitleScene').mode==='select');
 await p.keyboard.press('3');
 check(await p.evaluate(()=>window.__NV_GAME__.scene.getScene('TitleScene').stageIndex===2),'number keys select a starting stage');
 await p.screenshot({path:out+'campaign-select.png'});
 await p.evaluate(()=>window.__NV_GAME__.scene.getScene('TitleScene').scene.start('GameScene',{players:2,chars:['kane','jinx'],settings:{story:false,crt:false,music:false,sfx:false}}));
 await p.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));
 for(let level=0;level<4;level++){
  await p.waitForFunction(i=>window.__NV_GAME__.scene.getScene('GameScene').stageIndex===i,{},level);
  const data=await p.evaluate(level=>{const s=window.__NV_GAME__.scene.getScene('GameScene');s.paused=true;s.introT=0;if(level===0){s.players[0].score=1234;s.players[0].lives=1;s.continues=2;}return {stage:s.stage.id,players:s.players.length,score:s.players[0].score,continues:s.continues,lives:s.players[0].lives};},level);
  check(data.players===2&&data.continues===2,`stage ${level+1}: co-op and continues preserved`);
  if(level>0)check(data.score>1234 && data.lives===1,`stage ${level+1}: score and remaining lives carried forward`);
  // Visit every configured gate, spawn via normal wave queue, defeat via Fighter.takeHit.
  const wave=await p.evaluate(()=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');const seen=[];
   for(let i=0;i<s.stage.gates.length;i++){
    s.gateIdx=i;s.camX=s.stage.gates[i].x;s.players.forEach((p,j)=>{p.fx=s.camX+140+j*30;p.fy=212;p.invulnT=100000;});
    s.activateGate();let guard=0;
    while((s.spawnQueue.length||s.enemies.length)&&guard++<1500){
     s.processSpawns();
     for(const e of s.enemies){seen.push(e.type.id);e.invulnT=0;if(!e.dead)e.takeHit(s.players[0],{dmg:99999,reach:300,width:50,launch:true,heavy:true});for(let j=0;j<200;j++)e.step();}
     s.enemies=s.enemies.filter(e=>{if(e.removeMe){if(e===s.boss)s.onBossDown();e.destroy();return false;}return true;});
    }
    if(guard>=1500)return {ok:false,seen};
   }
   s.finishStory();return {ok:s.cleared&&s.clearReady,seen:[...new Set(seen)],boss:s.boss?.type.id};
  });
  check(wave.ok,`stage ${level+1}: all gates and boss clear (${wave.seen.join(', ')})`);
  await p.screenshot({path:out+`campaign-clear-${level+1}.png`});
  await p.keyboard.down('x');await new Promise(r=>setTimeout(r,150));await p.keyboard.up('x');
 }
 await p.waitForFunction(()=>window.__NV_GAME__.scene.getScene('GameScene').stageIndex===0);
 check(true,'final tally starts a fresh campaign');
 for(let level=1;level<4;level++){
  await p.evaluate(i=>window.__NV_GAME__.scene.getScene('GameScene').scene.restart({stageIndex:i,settings:{story:true,crt:false,music:false,sfx:false}}),level);
  await p.waitForFunction(i=>{const s=window.__NV_GAME__.scene.getScene('GameScene');return s.stageIndex===i&&s.storyUi.active;},{},level);
  await new Promise(r=>setTimeout(r,600));await p.screenshot({path:out+`campaign-intro-${level+1}.png`});
  await p.waitForFunction(()=>!window.__NV_GAME__.scene.getScene('GameScene').storyUi.active,{timeout:12000});
  check(true,`stage ${level+1}: intro auto-advances`);
  const pattern=await p.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');s.paused=true;s.introT=0;s.spawnEnemy(s.stage.bossId,'right');const e=s.boss;e.fx=330;e.fy=218;e.mode='idle';e.thinkT=0;e.cooldown=0;s.players[0].fx=295;s.players[0].fy=218;
   e.ai({target:s.players[0],aggro:1,tryStartAttack:()=>true,endAttack:()=>{}});
   const first=e.atkSeq.map(f=>({frame:f.frame,hit:f.hit}));e.hp=e.maxHp*.4;e.ai({target:s.players[0],aggro:1,tryStartAttack:()=>true,endAttack:()=>{}});e.step();s.players[0].step();
   s.hud.overlay.forEach(o=>o.destroy());s.syncHud();return {first,phase2:e.phase2};});
  check(pattern.first.length>0&&pattern.phase2,`stage ${level+1}: boss attacks and enters phase two`);
  if(level===1)check(pattern.first.filter(f=>f.hit).length===2,'Sable has two separate combo hits');
  if(level===2)check(pattern.first.some(f=>f.hit?.around&&f.hit.reach===78),'Cinder has ground shockwave');
  if(level===3)check(pattern.first.some(f=>f.hit?.around&&f.hit.reach===110),'Orison has wider pulse');
  await new Promise(r=>setTimeout(r,500));await p.screenshot({path:out+`campaign-boss-${level+1}.png`});
 }
 check(errors.length===0,'no browser exceptions: '+errors.join(';'));
}finally{writeFileSync(out+'campaign-checks.json',JSON.stringify(results,null,2));await browser.close();}
