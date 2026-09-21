import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4174';
const out = new URL('../.e2e/', import.meta.url).pathname;
mkdirSync(out, {recursive:true});
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const checks=[];
const check=(ok,name)=>{checks.push({ok:!!ok,name});console.log(`${ok?'PASS':'FAIL'}: ${name}`);};
try {
 const page=await browser.newPage(); await page.setViewport({width:1440,height:810});
 const press=async key=>{await page.keyboard.down(key);await sleep(70);await page.keyboard.up(key);await sleep(90);};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>window.__NV_GAME__?.scene.isActive('TitleScene'));
 await sleep(500); await page.screenshot({path:out+'premium-title.png'});
 check(await page.evaluate(()=>window.__NV_GAME__.textures.exists('title_illustration')),'title illustration loaded');
 const clipped = await page.evaluate(()=>{
  const textures=window.__NV_GAME__.textures;const bad=[];
  for(const key of textures.getTextureKeys().filter(k=>/^(kane|jinx|bull|punk|blade|brute|korvo)_/.test(k)&&!k.endsWith('portrait'))) {
   const img=textures.get(key).getSourceImage();const c=img.getContext('2d');const {width:w,height:h}=img;
   const data=c.getImageData(0,0,w,h).data;let edge=false;
   for(let y=0;y<h;y++)if(data[(y*w)*4+3]||data[(y*w+w-1)*4+3])edge=true;
   for(let x=0;x<w;x++)if(data[x*4+3])edge=true;
   if(edge)bad.push(key);
  }return bad;
 });
 check(clipped.length===0,'all fighter textures clear top/side clipping: '+clipped.join(','));

 await press('ArrowDown');await press('ArrowDown');await press('Enter');
 await sleep(200); await page.screenshot({path:out+'premium-options.png'});
 await press('ArrowRight');
 check(await page.evaluate(()=>window.__NV_GAME__.registry.get('settings').difficulty==='hard'),'options still change difficulty');
 await press('ArrowLeft');await press('KeyX');
 await press('ArrowUp');await press('Enter');
 await press('ArrowRight');await press('KeyD');
 await sleep(200);await page.screenshot({path:out+'premium-coop-select.png'});
 await press('KeyZ');await press('KeyJ');
 await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));
 await sleep(350);await press('Escape');await sleep(2700);
 check(await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').players.length===2),'co-op confirmation starts two fighters');
 await page.keyboard.down('KeyX');await sleep(90);await page.keyboard.up('KeyX');
 check(await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').players[0].fz>0),'P1 jump responds');
 await sleep(900);await page.keyboard.down('KeyK');await sleep(90);await page.keyboard.up('KeyK');
 check(await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').players[1].fz>0),'P2 jump responds');
 await sleep(900);
 await page.keyboard.down('Enter');await sleep(90);await page.keyboard.up('Enter');
 const pos=await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');return {paused:s.paused,x:s.players[0].fx};});
 await page.keyboard.down('ArrowRight');await sleep(250);await page.keyboard.up('ArrowRight');
 check(pos.paused && await page.evaluate(x=>window.__NV_GAME__.scene.getScene('GameScene').players[0].fx===x,pos.x),'pause freezes fighter movement');
 await page.keyboard.down('Enter');await sleep(90);await page.keyboard.up('Enter');
 for(const [name,cam] of [['market',0],['arcade',1450],['depot',2620]]) {
   await page.evaluate(cam=>{
    const s=window.__NV_GAME__.scene.getScene('GameScene');s.paused=true;s.camX=cam;s.introT=0;
    s.hud.msgImg?.destroy();s.hud.msgImg=null;
    s.players.forEach((p,i)=>{p.minX=cam;p.maxX=cam+480;p.fx=cam+130+i*100;p.fy=210+i*10;p.fz=0;p.vz=0;p.vx=0;p.vy=0;p.setState('idle');p.step();});
    if(cam===2620){s.spawnEnemy('korvo','right');const e=s.enemies.at(-1);e.fx=cam+365;e.fy=212;e.fz=0;e.vz=0;e.vx=0;e.setState('idle');e.step();}
   },cam);
   await sleep(200);await page.screenshot({path:out+`premium-${name}.png`});
 }
 await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');s.scene.start('TitleScene');});
 await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('TitleScene'));await sleep(200);
 await press('Enter');await press('KeyZ');
 await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));await sleep(350);await press('Escape');await sleep(600);
 check(await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');return s.players.length===1&&s.motes.length===0&&!s.paused;}),'restart resets game and effect state');
 await page.keyboard.down('KeyJ');await sleep(100);await page.keyboard.up('KeyJ');
 check(await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').players.length===2),'P2 join-in still works');

 // ---- weapons QA: bat (stage 1) and katana (stage 2) render + pickup ----
 const texPx=await page.evaluate(()=>{
  const t=window.__NV_GAME__.textures;const out={};
  for(const key of ['item_bat','item_katana']){
   if(!t.exists(key)){out[key]=0;continue;}
   const img=t.get(key).getSourceImage();const c=img.getContext('2d');
   const d=c.getImageData(0,0,img.width,img.height).data;let n=0;
   for(let i=3;i<d.length;i+=4)if(d[i])n++;
   out[key]=n;
  }return out;
 });
 check(texPx.item_bat>20,`bat texture has painted pixels (${texPx.item_bat})`);
 check(texPx.item_katana>20,`katana texture has painted pixels (${texPx.item_katana})`);

 for(const [wname,stageIdx] of [['bat',1],['katana',2]]) {
  await page.evaluate(idx=>{window.__NV_GAME__.scene.getScene('GameScene').scene.restart({stageIndex:idx,players:1});},stageIdx);
  await page.waitForFunction(k=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   return window.__NV_GAME__.scene.isActive('GameScene')&&s.players?.length===1&&s.items?.some(i=>i.def.kind===k);
  },{},wname);
  await sleep(350);await press('Escape');await sleep(800);
  // ground placement shot, weapon centered in frame
  await page.evaluate(k=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   s.paused=true;s.introT=0;
   s.hud.msgImg?.destroy();s.hud.msgImg=null;
   const it=s.items.find(i=>i.def.kind===k&&!i.taken);
   s.camX=Math.max(0,it.fx-240);
   const p=s.players[0];
   p.minX=s.camX;p.maxX=s.camX+480;
   p.fx=it.fx+36;p.fy=it.fy;p.fz=0;p.vz=0;p.vx=0;p.vy=0;
   p.setState('idle');p.step();it.step();
  },wname);
  await sleep(200);await page.screenshot({path:out+`premium-weapon-${wname}-ground.png`});
  // walk onto it and pick it up via the real attack-pickup path
  const picked=await page.evaluate(k=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   const p=s.players[0];
   const it=s.items.find(i=>i.def.kind===k&&!i.taken);
   if(!it)return null;
   p.fx=it.fx;p.fy=it.fy;p.setState('idle');
   s.paused=false;s.introT=0;
   s.onGroundAttack(p);
   s.paused=true;
   p.step();p.syncWeaponSprite();
   return p.weapon?.type??null;
  },wname);
  check(picked===wname,`${wname} pickup equips the ${wname}`);
  await sleep(150);await page.screenshot({path:out+`premium-weapon-${wname}-held.png`});
  // swing: advance the player state machine into the active swing pose
  const swung=await page.evaluate(()=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   const p=s.players[0];
   if(!p.weapon)return false;
   const ok=p.swingWeapon();
   for(let i=0;i<9;i++){p.step();p.syncWeaponSprite();}
   return ok;
  });
  check(swung,`${wname} swing activates`);
  await sleep(150);await page.screenshot({path:out+`premium-weapon-${wname}-swing.png`});
 }

 // ---- hero signature weapons: art, carry pose, finisher effects ----
 const wpnPx=await page.evaluate(()=>{
  const t=window.__NV_GAME__.textures;const out={};
  for(const key of ['wpn_baton','wpn_monoedge','wpn_sledge']){
   if(!t.exists(key)){out[key]=0;continue;}
   const img=t.get(key).getSourceImage();const c=img.getContext('2d');
   const d=c.getImageData(0,0,img.width,img.height).data;let n=0;
   for(let i=3;i<d.length;i+=4)if(d[i])n++;
   out[key]=n;
  }return out;
 });
 check(wpnPx.wpn_baton>30,`baton texture has painted pixels (${wpnPx.wpn_baton})`);
 check(wpnPx.wpn_monoedge>30,`mono-edge texture has painted pixels (${wpnPx.wpn_monoedge})`);
 check(wpnPx.wpn_sledge>40,`sledge texture has painted pixels (${wpnPx.wpn_sledge})`);

 for(const [hero,wtex,trait] of [['kane','wpn_baton','stun'],['jinx','wpn_monoedge','slash'],['bull','wpn_sledge','shockwave']]) {
  await page.evaluate(h=>{window.__NV_GAME__.scene.getScene('GameScene').scene.restart({stageIndex:1,players:1,chars:[h]});},hero);
  await page.waitForFunction(h=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   return window.__NV_GAME__.scene.isActive('GameScene')&&s.players?.length===1&&s.players[0].charId===h;
  },{},hero);
  await sleep(400);await press('Escape');
  await page.waitForFunction(()=>!window.__NV_GAME__.scene.getScene('GameScene').storyUi.active);
  await sleep(2500); // let the stage card finish
  // carry pose, weapon in hand — stay left of the first gate so no waves spawn
  const carried=await page.evaluate(t=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   s.paused=true;s.introT=0;
   s.hud.msgImg?.destroy();s.hud.msgImg=null;
   s.camX=0;
   const p=s.players[0];
   p.minX=0;p.maxX=480;p.fx=240;p.fy=212;p.fz=0;p.vz=0;p.vx=0;p.vy=0;
   p.setState('idle');p.step();p.syncWeaponSprite();
   return p.weaponImg?.visible===true&&p.weaponImg?.texture?.key===t;
  },wtex);
  check(carried,`${hero} carries signature weapon (${wtex})`);
  await sleep(150);await page.screenshot({path:out+`premium-hero-${hero}-idle.png`});
  // live finisher: passive punk crowd ahead, deterministic combo drive
  const maxStage={kane:3,jinx:3,bull:2}[hero];
  await page.evaluate(()=>{
   const s=window.__NV_GAME__.scene.getScene('GameScene');
   const p=s.players[0];
   const n=p.charId==='bull'?3:p.charId==='jinx'?2:1;
   for(let i=0;i<n;i++){
    s.spawnEnemy('punk','right');
    const e=s.enemies.at(-1);
    e.fx=p.fx+40+i*24;e.fy=p.fy+(i%2?8:-6);e.fz=0;e.vz=0;e.vx=0;e.vy=0;
    e.cooldown=9999;e.setState('idle');e.step();
   }
   s.paused=false;
   s.onGroundAttack(p); // beginCombo stage 1
  });
  for(let st=1;st<maxStage;st++){
   await page.evaluate(()=>{
    const p=window.__NV_GAME__.scene.getScene('GameScene').players[0];
    p.control({left:false,right:false,up:false,down:false,attack:true,jump:false,special:false,attackPr:true,jumpPr:false,specialPr:false},{minX:p.minX,maxX:p.maxX});
   });
   await page.waitForFunction(exp=>window.__NV_GAME__.scene.getScene('GameScene').players[0].comboStage===exp,{},st+1);
  }
  let live=false;
  for(let i=0;i<70;i++){
   live=await page.evaluate(tr=>{
    const p=window.__NV_GAME__.scene.getScene('GameScene').players[0];
    const k=p.atkSeq[p.atkIdx];
    return !!(k?.hit&&k.hit[tr]);
   },trait);
   if(live)break;
   await sleep(60);
  }
  check(live,`${hero} finisher goes live (${trait})`);
  await sleep(trait==='stun'?120:trait==='slash'?40:200);
  await page.screenshot({path:out+`premium-hero-${hero}-finisher.png`});
 }

 check(errors.length===0,'no runtime exceptions: '+errors.join('; '));
 writeFileSync(out+'visual-checks.json',JSON.stringify(checks,null,2));
} finally { await browser.close(); }
if(checks.some(c=>!c.ok))process.exitCode=1;
