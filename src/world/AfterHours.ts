import Phaser from 'phaser';
import { addTextCentered } from '../art/font';

/** Street storytelling: ordinary background objects; never captures input or pauses combat. */
export function addAfterHours(scene: Phaser.Scene): void {
  const sign = (x:number,y:number,title:string,sub:string,color:number) => {
    scene.add.rectangle(x,y,84,24,0x060c16,.80).setStrokeStyle(.5,color,.75).setDepth(-52);
    scene.add.rectangle(x,y-11,80,1,color,.8).setDepth(-51);
    addTextCentered(scene,x,y-8,title,`#${color.toString(16).padStart(6,'0')}`,1).setDepth(-50);
    addTextCentered(scene,x,y+3,sub,'#9aadb6',1).setDepth(-50);
  };
  sign(2490,111,'THE CORE','PAY OR STAY DARK',0x76bdcf);
  sign(170,119,'VESPER','AFTERHOURS',0xe967aa);
  sign(1740,116,'HOT ZONE','NO CLEAN WATER',0xd4d867);
  const key='afterhours-adults';
  if(!scene.textures.exists(key)) {
    const texture=scene.textures.createCanvas(key,216,210)!;const c=texture.getContext();c.scale(3,3);
    const line=(points:number[][],color:string,width:number)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
    const oval=(x:number,y:number,rx:number,ry:number,color:string)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fillStyle=color;c.fill();};
    c.fillStyle='#111524';c.fillRect(6,37,23,3);c.fillRect(8,39,2,26);c.fillRect(26,39,2,26);
    // An adult club patron slumps on a stool, inhaler in hand, half-finished drink.
    line([[16,36],[25,48],[31,64]],'#252539',6);line([[14,37],[12,51],[15,64]],'#34374a',6);
    line([[16,21],[16,38]],'#37283e',11);line([[13,23],[9,31],[18,19]],'#6b4655',3.7);
    oval(17,15,4,5,'#a47a6a');line([[14,12],[19,11]],'#262132',3);
    line([[21,21],[23,30],[31,32]],'#75535b',3.2);
    c.fillStyle='#ed81af';c.fillRect(18,17,2,4);c.fillStyle='#ad7b38';c.fillRect(30,29,3,5);
    line([[12,24],[11,33]],'#ba5d98',.6);line([[29,64],[34,64]],'#10141c',3);
    // A fallout survivor off shift, exposed grafted arm, leans at the door.
    line([[53,38],[50,62]],'#293638',6);line([[56,38],[62,62]],'#1c2630',6);
    line([[53,20],[54,39]],'#253c40',12);oval(53,14,3.7,5,'#9b8f76');
    line([[48,23],[44,33],[52,35]],'#899481',4.5);oval(45,29,3,3,'#697966');
    line([[58,22],[61,33]],'#354348',4);line([[51,22],[55,31]],'#73ada2',.6);
    c.fillStyle='#121d24';c.fillRect(51,15,6,2);c.fillStyle='#83d4c5';c.fillRect(56,15,1,1);
    texture.refresh();
  }
  for(const x of [185,1220]) {
    scene.add.image(x,173,key).setOrigin(.5,1).setScale(.20).setTint(0x95a3ac).setAlpha(.70).setDepth(163);
    // A little vapour makes the vice visible without a dialogue interruption.
    for(let i=0;i<3;i++){
      const haze=scene.add.ellipse(x-11,143-i*2,3+i*2,2+i*2,0xb9a1c9,.15).setDepth(164);
      scene.tweens.add({targets:haze,y:haze.y-9,x:haze.x+4,alpha:0,scale:1.6,duration:1800+i*250,delay:i*400,repeat:-1});
    }
  }
  for(const x of [545,1710,1840,2510]) {
    const g=scene.add.graphics().setDepth(172);g.fillStyle(0x303d37);g.fillRoundedRect(x,155,14,20,2);
    g.lineStyle(1,0x8b9160);g.strokeEllipse(x+7,156,13,3);g.lineBetween(x,161,x+14,161);g.lineBetween(x,171,x+14,171);
    g.fillStyle(0xc8ba56);g.fillTriangle(x+7,162,x+3,169,x+11,169);g.fillStyle(0x17242a);g.fillCircle(x+7,167,1);
    g.lineStyle(.6,0x92ad73,.7);g.lineBetween(x+12,169,x+15,176);
  }
}
