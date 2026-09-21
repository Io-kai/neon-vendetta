import puppeteer from 'puppeteer';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4177';
const out=new URL('../.e2e/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const checks=[];const check=(ok,label)=>{checks.push({ok:!!ok,label});console.log(`${ok?'PASS':'FAIL'} ${label}`);};
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:810});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const tap=async(k,wait=140)=>{await page.keyboard.down(k);await sleep(60);await page.keyboard.up(k);await sleep(wait);};
 await page.goto(base,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__NV_GAME__?.scene.isActive('TitleScene'));
 const atlas=await page.evaluate(()=>{
   const g=window.__NV_GAME__,ids=['kane','jinx','bull','punk','blade','brute','korvo'],poses=['idle0','walk2','walk8','jabWindup','jab','cross','kick','uppercut','down'];
   const c=document.createElement('canvas');c.width=poses.length*216;c.height=ids.length*192;const x=c.getContext('2d');x.fillStyle='#091421';x.fillRect(0,0,c.width,c.height);
   for(let r=0;r<ids.length;r++)for(let j=0;j<poses.length;j++){x.drawImage(g.textures.get(`${ids[r]}_${poses[j]}`).getSourceImage(),j*216,r*192+24);x.font='12px sans-serif';x.fillStyle='#bbdedf';x.fillText(`${ids[r]} / ${poses[j]}`,j*216+10,r*192+18);}
   return c.toDataURL().split(',')[1];
 });writeFileSync(out+'neon-pose-sheet.png',Buffer.from(atlas,'base64'));
 await tap('Enter');await tap('KeyZ');await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));await sleep(300);await tap('Escape');await page.waitForFunction(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');return !s.storyUi.active&&s.introT===0;},{timeout:20000});
 await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');window.walkFrames=new Set();window.walkStart=s.players[0].fx;window.watch=setInterval(()=>window.walkFrames.add(s.players[0].sprite.texture.key),12);});
 await page.keyboard.down('ArrowRight');await sleep(950);await page.keyboard.up('ArrowRight');
 const walking=await page.evaluate(()=>{clearInterval(window.watch);const s=window.__NV_GAME__.scene.getScene('GameScene');return {frames:[...window.walkFrames],distance:s.players[0].fx-window.walkStart,fps:window.__NV_GAME__.loop.actualFps};});
 check(walking.frames.filter(k=>k.includes('_walk')).length>=10,'live input traverses at least ten walk poses');check(walking.distance>50,'walk translates across street');console.log(JSON.stringify(walking));
 await page.screenshot({path:out+'neon-walking.png'});
 await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene'),p=s.players[0];p.fx=190;p.fy=214;p.vx=0;p.vy=0;s.spawnEnemy('punk','right');const e=s.enemies.at(-1);e.fx=230;e.fy=214;e.hp=e.maxHp=1000;e.mode='chase';e.cooldown=999;e.destX=230;e.destY=214;window.enemy=e;window.combatFrames=new Set();window.watch=setInterval(()=>window.combatFrames.add(p.sprite.texture.key),8);});
 await tap('KeyZ',170);await tap('KeyZ',200);await tap('KeyZ',400);
 const hit=await page.evaluate(()=>{clearInterval(window.watch);const s=window.__NV_GAME__.scene.getScene('GameScene');return {hp:window.enemy.hp,frames:[...window.combatFrames],combo:s.players[0].comboHits};});
 check(hit.hp<1000,'keyboard combo damages live opponent');check(hit.frames.some(k=>k.includes('Windup'))&&hit.frames.some(k=>k.includes('Recover')),'live attack shows anticipation and recovery');console.log(JSON.stringify(hit));
 await page.screenshot({path:out+'neon-combat.png'});
 // Inspect every authored pose including bottom edge; a one-pixel glow fringe is allowed but opaque anatomy is not.
 const clipped=await page.evaluate(()=>{const t=window.__NV_GAME__.textures,bad=[];for(const k of t.getTextureKeys().filter(k=>/^(kane|jinx|bull|punk|blade|brute|korvo)_/.test(k)&&!k.endsWith('portrait'))){const c=t.get(k).getSourceImage(),w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;let n=0;for(let x=0;x<w;x++)if(d[((h-1)*w+x)*4+3]>100)n++;if(n>2)bad.push(k);}return bad;});check(!clipped.length,'no opaque bottom-edge clipping: '+clipped.join(','));

 const respawn=await page.evaluate(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene'),p=s.players[0];s.enemies.forEach(e=>e.destroy());s.enemies=[];s.spawnQueue=[];s.gateActive=false;s.gateIdx=0;s.hitstopT=0;p.dead=true;p.removeMe=true;p.setState('down');p.downT=999;p.lives=3;for(let i=0;i<10;i++)s.simStep();const first={lives:p.lives,queued:s.respawnQueue.length,out:s.out.get(p.slot)};for(let i=0;i<71;i++)s.simStep();const alive=!p.dead&&!p.removeMe&&p.lives===2; p.invulnT=0;p.lives=0;p.dead=true;p.removeMe=true;p.setState('down');p.downT=999;s.simStep();return {first,alive,continueT:s.continueT};});
 check(respawn.first.lives===2&&respawn.first.queued===1&&!respawn.first.out,'one death consumes one life and queues one respawn');check(respawn.alive,'queued fighter returns after respawn delay');check(respawn.continueT>0,'last life reaches continue screen');
 check(!errors.length,'no browser exceptions: '+errors.join(';'));writeFileSync(out+'neon-checks.json',JSON.stringify({checks,walking,hit},null,2));
} finally {await browser.close();}
if(checks.some(c=>!c.ok))process.exitCode=1;
