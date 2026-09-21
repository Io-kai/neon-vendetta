import puppeteer from 'puppeteer';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.argv[2];if(!url)throw Error('URL required');
const out=new URL('../.e2e/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[];function check(ok,label){results.push({ok,label});console.log(ok?'PASS':'FAIL',label);if(!ok)throw Error(label);}
try{
 const p=await b.newPage();const errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await p.setViewport({width:1440,height:810});const response=await p.goto(url,{waitUntil:'networkidle0',timeout:60000});check(response.status()===200,'public page loads anonymously');
 await p.waitForFunction(()=>window.__NV_GAME__?.scene.isActive('TitleScene'),{timeout:60000});check(true,'game boots on Vercel');
 await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__NV_GAME__.scene.getScene('TitleScene').mode==='select');
 await p.keyboard.press('2');await p.keyboard.press('z');
 await p.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));
 await new Promise(r=>setTimeout(r,700));await p.keyboard.press('Escape');
 await p.waitForFunction(()=>{const s=window.__NV_GAME__.scene.getScene('GameScene');return !s.storyUi.active&&s.introT===0;},{timeout:30000});
 check(await p.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').stage.id==='vesper'),'new stage starts through keyboard menu');
 const x=await p.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').players[0].fx);
 await p.keyboard.down('ArrowRight');await new Promise(r=>setTimeout(r,700));await p.keyboard.up('ArrowRight');
 check(await p.evaluate(x=>window.__NV_GAME__.scene.getScene('GameScene').players[0].fx>x+5,x),'walking responds to input');
 await p.keyboard.down('z');await p.waitForFunction(()=>window.__NV_GAME__.scene.getScene('GameScene').players[0].state==='attack',{timeout:5000});await p.keyboard.up('z');check(true,'attack responds to input');
 await p.screenshot({path:out+'vercel-playable.png'});
 check(!errors.length,'no browser exceptions');check(!bad.length,'all requested resources loaded');
}finally{writeFileSync(out+'vercel-checks.json',JSON.stringify({url,results},null,2));await b.close();}
