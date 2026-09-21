import puppeteer from 'puppeteer';
import {mkdirSync} from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4175';
const out=new URL('../.e2e/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--mute-audio','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:810});
 const tap=async k=>{await page.keyboard.down(k);await sleep(80);await page.keyboard.up(k);await sleep(270);};
 const check=(ok,text)=>{if(!ok)throw Error(text);console.log('PASS: '+text);};
 await page.goto(base,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__NV_GAME__?.scene.isActive('TitleScene'));
 await tap('ArrowDown');await tap('ArrowDown');await tap('Enter');for(let i=0;i<4;i++)await tap('ArrowDown');await tap('ArrowRight');
 check(await page.evaluate(()=>window.__NV_GAME__.registry.get('settings').story===false),'options can disable story');
 await page.screenshot({path:out+'story-options.png'});
 await tap('KeyX');await tap('ArrowUp');await tap('ArrowUp');await tap('Enter');await tap('KeyZ');
 await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));await sleep(350);
 check(await page.evaluate(()=>!window.__NV_GAME__.scene.getScene('GameScene').storyUi.active),'arcade selection respects story-off setting');
 await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').scene.start('TitleScene'));await sleep(350);
 await tap('ArrowDown');await tap('ArrowDown');await tap('Enter');await tap('ArrowRight');
 check(await page.evaluate(()=>window.__NV_GAME__.registry.get('settings').story===true),'options can restore story');
 await tap('KeyX');await tap('ArrowUp');await tap('ArrowUp');await tap('Enter');await tap('KeyZ');
 await page.waitForFunction(()=>window.__NV_GAME__.scene.isActive('GameScene'));await sleep(350);
 check(await page.evaluate(()=>window.__NV_GAME__.scene.getScene('GameScene').storyUi.active),'installed story opens on normal play');
 await tap('KeyE');await page.screenshot({path:out+'installed-story.png'});
 check(errors.length===0,'no runtime errors');
}finally{await browser.close();}
