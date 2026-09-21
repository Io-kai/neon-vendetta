import Phaser from 'phaser';

/** Architecture is baked once at high resolution; moving lighting stays separate. */
export function addCampaignArt(scene:Phaser.Scene,theme:string,length:number):void {
 const key=`campaign-${theme}`;
 const color=theme==='club'?'#f04ccd':theme==='canal'?'#b4db57':'#75dfff';
 if(!scene.textures.exists(key)){
  const t=scene.textures.createCanvas(key,1920,810)!;const c=t.getContext();c.scale(3,3);
  const grad=c.createLinearGradient(0,0,0,270);grad.addColorStop(0,'#030813');grad.addColorStop(.6,theme==='club'?'#20112b':theme==='canal'?'#172822':'#163149');grad.addColorStop(1,'#070c14');c.fillStyle=grad;c.fillRect(0,0,640,270);
  const rect=(x:number,y:number,w:number,h:number,col:string)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x:number,y:number,x2:number,y2:number,col:string,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
  const neon=(x:number,y:number,w:number,h:number)=>{c.save();c.shadowColor=color;c.shadowBlur=12;rect(x,y,w,h,color);c.restore();};
  if(theme==='club'){
   for(let i=0;i<8;i++){
    const x=i*80;rect(x,40,5,134,'#354154');line(x+5,42,x+5,174,'#816882');
    rect(x+10,55,58,78,'#0a1220');neon(x+10,54,58,1);neon(x+10,55,1,78);
    for(let j=0;j<9;j++)rect(x+16+j*5,117-(j*17%42),3,12+j*17%42,j%2?'#823767':'#347f8d');
    rect(x+8,145,64,25,'#101c2b');line(x+8,146,x+72,146,'#68556d');
    for(let j=0;j<6;j++){rect(x+13+j*9,136,3,8,j%2?'#c07fa3':'#69b5bc');}
   }
   rect(200,66,240,49,'#080c18');c.font='bold 28px monospace';c.fillStyle=color;c.shadowColor=color;c.shadowBlur=14;c.fillText('VESPER',268,99);c.shadowBlur=0;
   rect(252,138,138,29,'#182031');neon(252,138,138,2);
   for(let x=0;x<640;x+=40){line(x,175,x-80,270,'#273044');}for(let y=181;y<270;y+=15)line(0,y,640,y,'#292a41');
  }else if(theme==='canal'){
   for(let i=0;i<5;i++){
    const x=i*139;rect(x+12,35,85,137,'#1e3032');rect(x+17,40,75,130,'#243b3b');
    for(let y=45;y<170;y+=11)line(x+18,y,x+90,y,'#354a47');
    c.strokeStyle='#718077';c.lineWidth=10;c.beginPath();c.moveTo(x,50);c.lineTo(x+45,50);c.lineTo(x+45,148);c.lineTo(x+110,148);c.stroke();
    c.strokeStyle='#283d3a';c.lineWidth=5;c.stroke();
    for(let y=62;y<145;y+=22)rect(x+38,y,14,4,'#899080');
    c.fillStyle='#121f23';c.beginPath();c.arc(x+68,96,18,0,7);c.fill();c.strokeStyle='#aeb278';c.lineWidth=1;c.stroke();
    for(let a=0;a<6;a++){const q=a*Math.PI/3;line(x+68,96,x+68+Math.cos(q)*15,96+Math.sin(q)*15,'#576e62',3);}
    neon(x+17,164,75,2);
   }
   rect(0,243,640,27,'#123429');for(let i=0;i<60;i++)line(i*13%640,247+i%18,i*13%640+23,247+i%18,'#3c6750',.5);
   rect(0,175,640,65,'#263234');for(let x=0;x<640;x+=16)line(x,177,x,239,'#344342',.5);
   for(let x=0;x<640;x+=24){rect(x,174,12,3,'#c7b35b');rect(x,237,12,3,'#c7b35b');}
  }else{
   for(let i=0;i<10;i++){
    const x=i*64;rect(x+3,29,57,138,'#152f44');
    for(let j=0;j<9;j++){
     const bx=x+5+j*6,ht=30+(i*37+j*13)%65;rect(bx,165-ht,5,ht,'#09131f');
     for(let y=169-ht;y<165;y+=7)rect(bx+1,y,1,2,(i+j)%2?'#a4c7a4':'#527b98');
    }
    rect(x,28,4,146,'#758b98');neon(x+4,30,1,144);line(x+8,33,x+51,102,'#42677f',.5);
   }
   rect(0,171,640,99,'#102030');
   for(let x=0;x<640;x+=64){line(x,172,x-60,270,'#557180',.5);neon(x,175,40,1);}
   for(let y=191;y<270;y+=25)line(0,y,640,y,'#344958');
   rect(247,62,139,48,'#0c1626');c.font='18px monospace';c.fillStyle='#d6e6e6';c.fillText('ORISON',278,90);neon(255,104,122,1);
  }
  for(let i=0;i<220;i++){c.fillStyle=i%2?'rgba(194,226,233,.035)':'rgba(0,0,0,.12)';c.fillRect((i*73)%640,(i*41)%270,17,1);}
  t.refresh();
 }
 for(let x=0;x<length;x+=640)scene.add.image(x,0,key).setOrigin(0).setScale(1/3).setDepth(-60);
 const col=Number.parseInt(color.slice(1),16);
 for(let x=120;x<length;x+=320){
  const lamp=scene.add.ellipse(x,170,140,8,col,.08).setDepth(-55);
  scene.tweens.add({targets:lamp,alpha:.23,duration:theme==='club'?650:2300,yoyo:true,repeat:-1});
  if(theme==='club'){
   const beam=scene.add.triangle(x,85,0,0,-48,100,48,100,col,.07).setDepth(-54);
   scene.tweens.add({targets:beam,angle:25,duration:2700,yoyo:true,repeat:-1});
  }
 }
}
