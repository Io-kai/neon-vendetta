import Phaser from 'phaser';
import { BODIES, CHAR_ART } from './parts';

/** Three physical samples per world pixel preserve facial and articulated armor detail. */
export const FIGHTER_TEXTURE_SCALE = 3;
type Point = [number, number];
type Suit = { skin:string; shadow:string; alloy:string; light:string; neon:string; accent:string; hair:string; width:number; height:number };
const SUITS:Record<string,Suit> = {
  kane: {skin:'#d69d85',shadow:'#211726',alloy:'#253b51',light:'#72929f',neon:'#31edff',accent:'#ff567d',hair:'#dbbd88',width:0,height:0},
  jinx: {skin:'#dfb2a2',shadow:'#25172e',alloy:'#3c294e',light:'#987cab',neon:'#fa52ef',accent:'#56ffec',hair:'#49dec9',width:-.7,height:-1},
  bull: {skin:'#ab785b',shadow:'#142629',alloy:'#25464b',light:'#8baea5',neon:'#80ffb1',accent:'#fff279',hair:'#20272f',width:1.5,height:1},
  punk: {skin:'#ba8c79',shadow:'#26152e',alloy:'#42304f',light:'#aa7fba',neon:'#ff4db3',accent:'#67e7ff',hair:'#fa76c2',width:-.4,height:0},
  blade: {skin:'#b59e86',shadow:'#141d2a',alloy:'#283c54',light:'#799bb8',neon:'#82a9ff',accent:'#b3ffff',hair:'#262d40',width:0,height:1},
  brute: {skin:'#ab755d',shadow:'#2d201e',alloy:'#574034',light:'#b99e7a',neon:'#ffb636',accent:'#ff5757',hair:'#262c36',width:2,height:1},
  korvo: {skin:'#cbaa92',shadow:'#271b30',alloy:'#4c2a4f',light:'#b183a7',neon:'#ff487f',accent:'#ffe6a1',hair:'#c3cdd9',width:1.6,height:2},
};
Object.assign(SUITS, {
 razor:{...SUITS.blade,neon:'#ff834c',accent:'#fff08c',width:-.5},
 husk:{...SUITS.brute,skin:'#98a37a',neon:'#bafa56',accent:'#ffd870',width:2.6},
 sentinel:{...SUITS.blade,alloy:'#344956',light:'#bed5dc',neon:'#73e5ff',hair:'#15232c'},
 sable:{...SUITS.jinx,neon:'#ff4adb',accent:'#fff4af',height:2,width:-.8},
 cinder:{...SUITS.brute,skin:'#929d70',neon:'#c8ff40',accent:'#ff974f',width:3.2,height:2},
 orison:{...SUITS.korvo,alloy:'#bac7cb',light:'#f5f0d9',neon:'#78ecff',accent:'#ffe49a',width:2}
});
const INK='#090e1a';
function shape(c:CanvasRenderingContext2D,points:Point[],fill:string|CanvasGradient,stroke?:string,width=.35){
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c:CanvasRenderingContext2D,points:Point[],color:string,width=.4){
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function glow(c:CanvasRenderingContext2D,points:Point[],color:string,width=.5){
  c.save();c.shadowColor=color;c.shadowBlur=3.5;line(c,points,color,width);c.shadowBlur=0;line(c,points,'#edffff',width*.3);c.restore();
}
function metal(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,p:Suit,rear=false){
 const g=c.createLinearGradient(x,y,x+w,y+h);
 g.addColorStop(0,rear?p.alloy:p.light);g.addColorStop(.22,p.alloy);
 g.addColorStop(.56,rear?p.shadow:p.alloy);g.addColorStop(1,p.shadow);return g;
}
function segment(c:CanvasRenderingContext2D,a:Point,b:Point,ra:number,rb:number,p:Suit,rear=false){
  const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;
  const at=(t:number,r:number):Point=>[a[0]+dx*t+nx*r,a[1]+dy*t+ny*r];
  // Rounded muscle volume beneath a fitted, bevelled shell.
  c.beginPath();c.moveTo(...at(0,-ra*.65));c.quadraticCurveTo(...at(-.04,ra),...at(.16,ra));
  c.bezierCurveTo(...at(.42,ra*.93),...at(.74,rb),...at(1,rb*.65));
  c.quadraticCurveTo(...at(1.05,0),...at(1,-rb*.65));
  c.bezierCurveTo(...at(.77,-rb),...at(.3,-ra),...at(0,-ra*.65));c.closePath();
  c.fillStyle=metal(c,a[0]-ra,a[1],ra*2,dy*.2,p,rear);c.fill();c.strokeStyle=INK;c.lineWidth=.38;c.stroke();
  shape(c,[at(.08,-ra*.65),at(.68,-rb*.65),at(.84,-rb*.15),at(.25,ra*.08)],metal(c,a[0]-ra,a[1],ra*2,dy*.4,p,rear));
  line(c,[at(.2,ra*.55),at(.76,rb*.5)],INK,.45);
  glow(c,[at(.12,-ra*.8),at(.45,-ra*.72),at(.58,-rb*.32),at(.82,-rb*.3)],p.neon,rear?.27:.42);
  line(c,[at(.82,-rb*.6),at(.82,rb*.6)],INK,.6);
  for(let i=0;i<3;i++)line(c,[at(.86+i*.04,-rb*.55),at(.86+i*.04,rb*.55)],rear?p.alloy:p.light,.2);
}
const ATTACKS=['jab','cross','uppercut','kick','grab','swing','rising','lariat','slam','charge'];

/** Shared render geometry, exported so capture QA can verify arm/leg counter-swing. */
export function fighterWalkGeometry(id:string,phase:number,x=35,hip=33,ground=53,top=20,tx=36){
 const stride=44/(4*CHAR_ART[id].scale);
 const gait=(a:number,offset:number):[Point,Point]=>{
   const cycle=((a-Math.PI/2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
   const stance=cycle<Math.PI,t=stance?cycle/Math.PI:(cycle-Math.PI)/Math.PI;
   const step=stance?1-2*t:-Math.cos(t*Math.PI),lift=stance?0:Math.sin(t*Math.PI)*4.2;
   const foot:Point=[x+offset+step*stride,ground-.8-lift],joint:Point=[x+offset,hip];
   const dx=foot[0]-joint[0],dy=foot[1]-joint[1],distance=Math.hypot(dx,dy);
   const upper=10.3,lower=10.7,d=Math.min(distance,upper+lower-.01);
   const projection=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-projection*projection));
   const knee:Point=[joint[0]+dx/distance*projection+dy/distance*bend,joint[1]+dy/distance*projection-dx/distance*bend];
   return[knee,foot];
 };
 const [backKnee,backFoot]=gait(phase+Math.PI,-.9),[frontKnee,frontFoot]=gait(phase,.9);
 const nearStep=(frontFoot[0]-x-.9)/stride,farStep=(backFoot[0]-x+.9)/stride;
 const rearShoulder:Point=[tx-1.4,top+2.5],shoulder:Point=[tx+1.1,top+2.9];
 const rearElbow:Point=[rearShoulder[0]-farStep*2.8,rearShoulder[1]+5.5];
 const rearFist:Point=[rearElbow[0]+1-farStep*1.6,rearElbow[1]+4.3];
 const elbow:Point=[shoulder[0]-nearStep*2.8,shoulder[1]+5.5];
 const fist:Point=[elbow[0]+1-nearStep*1.6,elbow[1]+4.3];
 return{backKnee,backFoot,frontKnee,frontFoot,rearShoulder,shoulder,rearElbow,rearFist,elbow,fist,nearStep,farStep};
}

function renderFighter(c:CanvasRenderingContext2D,id:string,frame:string){
 const p=SUITS[id],w=p.width;
 const walkMatch=frame.match(/^walk(\d+)$/),idleMatch=frame.match(/^idle(\d+)$/);
 const walking=!!walkMatch||frame==='walkA'||frame==='walkB';
 const phase=walkMatch?Number(walkMatch[1])/12*Math.PI*2:frame==='walkB'?Math.PI:0;
 const breath=idleMatch?Math.sin(Number(idleMatch[1])/6*Math.PI*2):frame==='idle2'?1:0;
 const windup=frame.endsWith('Windup'),recover=frame.endsWith('Recover');
 const action=frame.replace(/Windup$|Recover$/,'');
 const strike=ATTACKS.includes(action),amount=windup?-.3:recover?.25:1;
 const air=['jump','jumpFall','rising','slam'].includes(action),hurt=action==='hurt';
 const bob=walking?-Math.abs(Math.sin(phase))*.8:breath*.35;
 const x=35+(hurt?-3:strike?amount*1.3:0),ground=53;
 const hip=ground-20+bob,top=hip-13-p.height;
 const lean=hurt?-3:action==='charge'?5:strike?amount*2:walking?1:0;
 const tx=x+lean;
 c.save();
 if(action==='down'){c.translate(36,43);c.rotate(-Math.PI/2);c.scale(.88,.88);c.translate(-35,-30);}
 const backHip:Point=[x-(walking?.9:2.4),hip],frontHip:Point=[x+(walking?.9:2.1),hip];
 let backFoot:Point=[x-4.5,ground-1.3],frontFoot:Point=[x+7,ground-.8];
 let backKnee:Point=[x-1.5,hip+9.8],frontKnee:Point=[x+5.5,hip+9.1];
 if(walking){({backKnee,backFoot,frontKnee,frontFoot}=fighterWalkGeometry(id,phase,x,hip,ground,top,tx));}
 if(air){backKnee=[x-6,hip+5];backFoot=[x-9,hip+11];frontKnee=[x+8,hip+4];frontFoot=[x+6,hip+12];}
 if(action==='jumpFall'){backKnee=[x-5,hip+7];backFoot=[x-7,hip+17];frontKnee=[x+6,hip+7];frontFoot=[x+8,hip+17];}
 if(action==='kick'){
   frontKnee=[x+6+amount*4,hip-3-amount*2];frontFoot=windup?[x+5,hip+5]:[x+12+amount*12,hip-3-amount*3];
 }
 const leg=(a:Point,k:Point,f:Point,rear:boolean)=>{
   segment(c,a,k,2.5+w*.3,1.8+w*.2,p,rear);
   ellipse(c,k[0],k[1],1.9+w*.15,1.6,INK);
   shape(c,[[k[0]-1.5,k[1]-1.5],[k[0]+1.3,k[1]-1.5],[k[0]+1.7,k[1]+.6],[k[0],k[1]+1.6],[k[0]-1.5,k[1]+.7]],rear?p.alloy:p.light);
   glow(c,[[k[0]-1,k[1]],[k[0]+.9,k[1]]],p.accent,.3);
   segment(c,[k[0],k[1]+1],f,1.8+w*.2,1.15+w*.15,p,rear);
   const lift=walking&&f[1]<ground-2?-.7:0;
   // Low articulated boots roll into a rounded toe instead of a square block.
   c.beginPath();c.moveTo(f[0]-1.5,f[1]-2.5);c.lineTo(f[0]+1.25,f[1]-2.4);
   c.quadraticCurveTo(f[0]+1.5,f[1]-.3,f[0]+3.6,f[1]+.15+lift);
   c.quadraticCurveTo(f[0]+4.7,f[1]+.4+lift,f[0]+4.4,f[1]+1.25+lift);
   c.lineTo(f[0]-1.8,f[1]+1.25);c.quadraticCurveTo(f[0]-2.1,f[1]-.2,f[0]-1.5,f[1]-2.5);c.closePath();
   c.fillStyle=metal(c,f[0]-1.5,f[1]-2,5,3,p,rear);c.fill();c.strokeStyle=INK;c.lineWidth=.35;c.stroke();
   line(c,[[f[0]-.7,f[1]-.7],[f[0]+1.3,f[1]-.35],[f[0]+2.9,f[1]+.4]],p.light,.3);
   glow(c,[[f[0]-1.3,f[1]+.9],[f[0]+1.2,f[1]+.9],[f[0]+3.7,f[1]+.85+lift]],p.neon,.32);
   line(c,[[f[0]-.5,f[1]-1.2],[f[0]+1,f[1]-1.2]],p.light,.3);
 };
 leg(backHip,backKnee,backFoot,true);
 if(id==='korvo'||id==='blade'){
  const flutter=walking?Math.sin(phase)*2:breath;
  shape(c,[[tx-6-w,top+3],[x-4,hip-3],[x-3+flutter,hip+14],[x-10+flutter,hip+11],[x-8,hip]],p.shadow,INK,.6);
  shape(c,[[tx-5-w,top+5],[x-5,hip],[x-5+flutter,hip+11],[x-8+flutter,hip+9]],p.alloy);
  glow(c,[[x-7,hip-1],[x-8+flutter,hip+8],[x-5+flutter,hip+10]],p.neon,.5);
 }
 leg(frontHip,frontKnee,frontFoot,false);
 const rearShoulder:Point=[tx-(walking?1.4:5.3+w),top+2.5],shoulder:Point=[tx+(walking?1.1:4.2+w),top+2.9];
 let re:Point=[tx-7.4-w,top+8],rf:Point=[tx-4.5,top+6];
 let elbow:Point=[tx+7+w,top+8],fist:Point=[tx+9+w,top+3.5];
 if(walking){
   // Both arms counter the corresponding foot displacement around profile pivots.
   const gait=fighterWalkGeometry(id,phase,x,hip,ground,top,tx);
   re=gait.rearElbow;rf=gait.rearFist;elbow=gait.elbow;fist=gait.fist;
 }
 if(strike){elbow=[tx+8+amount*4,top+5-amount*2];fist=[tx+10+amount*(action==='cross'?14:11),top+5-amount*3];re=[tx-7,top+7];rf=[tx-1,top+4];}
 if(action==='uppercut'||action==='rising'){elbow=[tx+8,top+5-amount*4];fist=[tx+7+amount*2,top+4-amount*11];}
 if(action==='kick'){elbow=[tx+5,top+7];fist=[tx+1,top+3];re=[tx-8,top+6];rf=[tx-10,top+4];}
 if(action==='lariat'){re=[tx-11*amount,top+4];rf=[tx-21*amount,top+4];elbow=[tx+10*amount,top+3];fist=[tx+22*amount,top+3];}
 if(action==='slam'){elbow=[tx+7,top+5+amount*4];fist=[tx+5,top+4+amount*10];}
 if(hurt){elbow=[tx+7,top+9];fist=[tx+11,top+11];re=[tx-9,top+5];rf=[tx-12,top+2];}
 const arm=(a:Point,b:Point,f:Point,rear:boolean)=>{
   segment(c,a,b,1.9+w*.3,1.35+w*.2,p,rear);ellipse(c,b[0],b[1],1.4+w*.2,1.5,INK);
   ellipse(c,b[0]-.3,b[1],.8,.8,rear?p.alloy:p.light);
   segment(c,b,f,1.6+w*.25,1.35+w*.15,p,rear);
   if(!rear&&(id==='brute'||id==='punk')){
     const mutant:Suit={...p,alloy:id==='brute'?'#856f60':'#9b736d',light:'#cfb59a',shadow:'#493e42'};
     segment(c,b,f,id==='brute'?3.8:2.6,id==='brute'?2.8:1.8,mutant);
     if(id==='brute'){
       ellipse(c,a[0]-.1,a[1]+.2,3.7,3.4,'#877965');
       shape(c,[[a[0]-3,a[1]],[a[0]-3.5,a[1]-3],[a[0]-1.7,a[1]-2.2],[a[0]-.3,a[1]-4],[a[0]+1,a[1]-2],[a[0]+3.8,a[1]-2.3],[a[0]+2.9,a[1]+1],[a[0]+1.2,a[1]+2.8]],'#afa687','#524b48',.4);
       line(c,[[a[0]-1.4,a[1]-1.8],[a[0]-.6,a[1]+.2],[a[0]+1.2,a[1]+1.6]],'#52483f',.4);
       shape(c,[[b[0]-2,b[1]+.6],[b[0]-3.7,b[1]+2.2],[b[0]-1.8,b[1]+4],[b[0]+.7,b[1]+2.9]],'#b8ac8d','#615846',.3);
     }else{
       for(let i=0;i<3;i++)ellipse(c,b[0]-1+i*.7,b[1]+1+i*1.2,1.2,.9,i%2?'#ba9d87':'#77675d');
     }
     // Treatment cuff and scars distinguish surviving tissue from clean armor.
     line(c,[[f[0]-1.5,f[1]-1.7],[f[0]+1.2,f[1]-1.7]],p.accent,.6);
     line(c,[[b[0]-.8,b[1]+1],[b[0]+.2,b[1]+2.7],[b[0]-.5,b[1]+3.8]],'#513d42',.45);
   }
   ellipse(c,f[0]+.35,f[1],1.9+w*.12,1.55,INK);
   shape(c,[[f[0]-1,f[1]-1.3],[f[0]+1.4,f[1]-1.3],[f[0]+2,f[1]],[f[0]+1,f[1]+1.2],[f[0]-1.2,f[1]+1]],rear?p.alloy:p.light);
   glow(c,[[f[0]-.6,f[1]-1],[f[0]+1.2,f[1]-.8]],p.accent,.45);
   for(let i=0;i<3;i++)line(c,[[f[0]+i*.55-.2,f[1]],[f[0]+i*.55-.2,f[1]+.8]],p.shadow,.2);
 };
 arm(rearShoulder,re,rf,true);
 if(!walking){
 // A tapered thorax, armored abdominal plates and flexible waist replace block torsos.
 shape(c,[[tx-4-w,top],[tx+3+w,top],[tx+6+w,top+3],[x+3.6,hip-1],[x-3.8,hip],[tx-6-w,top+3]],metal(c,tx-5,top,11,12,p),INK,.4);
 shape(c,[[tx-4-w,top+.7],[tx-.3,top+1],[tx-.4,top+6],[x-3.5,hip-3],[tx-5-w,top+3]],metal(c,tx-5,top,6,10,p),p.light,.2);
 shape(c,[[tx+.3,top+1],[tx+3+w,top+.7],[tx+4.8+w,top+3],[x+3,hip-3],[tx+.3,top+6]],metal(c,tx,top,7,10,p),p.light,.2);
 shape(c,[[tx-3.6-w,top+1],[tx-.6,top+1.5],[tx-.8,top+3.6],[tx-4.7-w,top+3]],metal(c,tx-5,top,6,4,p));
 shape(c,[[tx+.7,top+1.5],[tx+2.9+w,top+1],[tx+4.2+w,top+2.5],[tx+.7,top+3.6]],metal(c,tx,top,6,4,p));
 glow(c,[[tx-4.3-w,top+2],[tx-3,top+5],[tx-.6,top+5.8],[x-.6,hip-3]],p.neon,.55);
 glow(c,[[tx+3.6+w,top+2],[tx+2.8,top+5],[tx+.6,top+5.8],[x+.6,hip-3]],p.neon,.55);
 for(let i=0;i<3;i++){
   const yy=top+7+i*1.6,xx=tx+(x-tx)*(i+2)/5;
   shape(c,[[xx-2.3,yy],[xx+2.3,yy],[xx+1.8,yy+1.2],[xx-1.8,yy+1.2]],p.alloy,p.light,.18);
 }
 ellipse(c,tx,top+4.6,1.3,1.3,INK);ellipse(c,tx,top+4.6,.75,.75,p.neon);ellipse(c,tx-.2,top+4.4,.25,.25,'#fff');
 line(c,[[x-4,hip-1],[x+4,hip-1]],INK,1.7);
 glow(c,[[x-3.7,hip-1],[x-1,hip-1],[x-.4,hip-1.7],[x+1,hip-1.7],[x+1.6,hip-1],[x+3.7,hip-1]],p.accent,.45);
 // Independent shoulder plates and lit insignia vary the silhouette of each class.
 for(const [sx,sy] of [rearShoulder,shoulder]){
  shape(c,[[sx-2-w*.2,sy-1.3],[sx+.8,sy-2],[sx+2+w*.25,sy-.3],[sx+1.7,sy+1.2],[sx-1.7,sy+1.5]],metal(c,sx-2,sy-2,4,4,p),p.light,.2);
  glow(c,[[sx-1.5,sy-.8],[sx+.5,sy-1.2],[sx+1.4,sy-.3]],p.neon,.45);
 }
 if(id==='bull'||id==='brute'){
   for(let j=0;j<3;j++)line(c,[[tx-4-w,top+5+j],[tx-2.6-w,top+5+j]],p.accent,.35);
   segment(c,[tx-6-w,top+2],[tx-6-w,top+8],1,1,p,true);
 }
 // Personal gear is asymmetric and changes the outline, not just the color.
 if(id==='bull'){
   const sx=rearShoulder[0]-1,sy=rearShoulder[1];
   shape(c,[[sx-3,sy-2],[sx+1,sy-3],[sx+3,sy],[sx+2,sy+4],[sx-3,sy+5],[sx-4,sy+1]],metal(c,sx-4,sy-3,7,8,p),INK,.4);
   glow(c,[[sx-2.5,sy-1],[sx+.8,sy-1.7],[sx+1.6,sy]],p.neon,.55);
   for(let i=0;i<3;i++)line(c,[[sx-2.7,sy+1+i],[sx-.3,sy+.6+i]],p.light,.3);
   line(c,[[sx-3,sy+4],[sx-4,sy+7],[tx-5,top+10]],p.shadow,1.3);
   glow(c,[[sx-3,sy+4],[sx-4,sy+6.5],[tx-5,top+9]],p.accent,.3);
 }
 if(id==='jinx'){
   const sx=rearShoulder[0],sy=rearShoulder[1];
   shape(c,[[sx-2.2,sy-1.8],[sx+.5,sy-2.6],[sx+2,sy],[sx-.8,sy+2.6],[sx-3,sy+1]],metal(c,sx-3,sy-2,5,5,p),INK,.3);
   glow(c,[[sx-2.2,sy-1],[sx-.2,sy-1.6]],p.accent,.45);
   line(c,[[tx-2,top+2],[x+3,hip-3]],INK,1.6);
   line(c,[[tx-2.2,top+2],[x+2.8,hip-3]],p.light,.4);
   shape(c,[[x+2,hip-3],[x+5,hip-2],[x+4.7,hip+1],[x+2,hip]],p.shadow,p.accent,.25);
 }
 if(id==='kane'){
   shape(c,[[tx-3,top+1],[tx-3.7,top-2],[tx-1.2,top-1],[tx+.1,top+2],[tx+1.3,top-1],[tx+3.6,top-1.7],[tx+3.1,top+1.3]],metal(c,tx-4,top-2,8,4,p),INK,.3);
   glow(c,[[tx-3.3,top-1.1],[tx-2,top],[tx-.2,top+2]],p.accent,.4);
 }
 }else{
   // Dedicated profile thorax: curved back, forward sternum and foreshortened pelvis.
   // This is a different silhouette, not a squeezed front-facing breastplate.
   c.beginPath();c.moveTo(tx-1.8-w*.3,top-.2);
   c.quadraticCurveTo(tx-4-w*.3,top+3,tx-2.9-w*.2,top+7);
   c.lineTo(x-2.1,hip-1);c.quadraticCurveTo(x,hip+.8,x+2.4,hip-1);
   c.lineTo(tx+3,top+8);c.quadraticCurveTo(tx+5+w*.3,top+3,tx+1.6,top-.3);c.closePath();
   c.fillStyle=metal(c,tx-3,top,7,12,p);c.fill();c.strokeStyle=INK;c.lineWidth=.45;c.stroke();
   shape(c,[[tx+1.5,top+1],[tx+3.3,top+3],[tx+3.4,top+5.7],[tx+1.5,top+7],[tx+.6,top+3]],metal(c,tx+.5,top+1,3,6,p),p.light,.23);
   glow(c,[[tx+1.4,top+1],[tx+2.6,top+3],[tx+2.6,top+5.3],[tx+1.3,top+7],[x+1.4,hip-2]],p.neon,.48);
   glow(c,[[tx-2.2,top+3],[tx-2.1,top+7],[x-1.7,hip-2]],p.accent,.28);
   for(let i=0;i<3;i++)line(c,[[tx-.5,top+8+i],[tx+2.2,top+8.3+i]],p.light,.24);
   line(c,[[x-2.1,hip-1],[x+2.4,hip-1.2]],INK,1.4);
   glow(c,[[x+.3,hip-1],[x+2.2,hip-1.2]],p.accent,.4);
   // Compact utility pack follows the back plane, leaving the front silhouette readable.
   shape(c,[[tx-3,top+2],[tx-4.4,top+2.3],[tx-4.5,top+8],[tx-2.7,top+8.5]],p.shadow,p.light,.25);
   line(c,[[tx-4,top+3],[tx-4,top+5]],p.accent,.3);
   if(id==='bull'){
     shape(c,[[tx-3,top],[tx+.6,top+.5],[tx+2.2,top+3],[tx+1,top+5],[tx-2.7,top+4.6],[tx-4,top+2]],metal(c,tx-4,top,6,6,p),INK,.35);
     glow(c,[[tx-2.7,top+1],[tx,top+1.5],[tx+1,top+2.6]],p.neon,.5);
     for(let i=0;i<3;i++)line(c,[[tx-2.5,top+2+i*.7],[tx-.8,top+2.3+i*.7]],p.light,.25);
   }else{
     ellipse(c,shoulder[0],shoulder[1],1.8+w*.3,2.1,p.alloy);
     glow(c,[[shoulder[0]-.9,shoulder[1]-1.2],[shoulder[0]+.6,shoulder[1]-1]],p.neon,.4);
   }
   if(id==='kane'){
     shape(c,[[tx-2.1,top+1],[tx-2.4,top-1.7],[tx-1.1,top-1.6],[tx+.1,top+1]],p.alloy,p.accent,.3);
   }
 }
 // Small human heads, jaw planes, ears, visor glass and distinct hair profiles.
 const hx=tx+(walking?1.5:.5),hy=top-6.9;
 shape(c,[[hx-1.3,top-2],[hx+1.7,top-2],[hx+2,top+.3],[hx-1.4,top+.3]],p.skin,INK,.4);
 line(c,[[hx-1.3,top-.6],[hx+1.8,top-.6]],p.neon,.35);
 shape(c,[[hx-2.5,hy+1],[hx-.9,hy-.3],[hx+1.4,hy],[hx+2.4,hy+1.6],[hx+2.5,hy+3],[hx+3.3,hy+3.6],[hx+2.3,hy+4.1],[hx+1.7,hy+5.8],[hx-.1,hy+6.3],[hx-2.1,hy+4.8]],(()=>{const g=c.createLinearGradient(hx-2.4,hy,hx+2.3,hy+4);g.addColorStop(0,'#765b65');g.addColorStop(.48,p.skin);g.addColorStop(1,'#f0c8ac');return g;})(),INK,.3);
 shape(c,[[hx-2.3,hy+1.2],[hx-1.2,hy+2.7],[hx-.8,hy+5],[hx+1.6,hy+5.7],[hx-.1,hy+6.1],[hx-2,hy+4.7]],'#976c71');
 shape(c,[[hx+.1,hy+3.3],[hx+1.3,hy+3.3],[hx+1.6,hy+4.2],[hx+.5,hy+4.6]],p.skin);
 line(c,[[hx+2.3,hy+2.9],[hx+2.2,hy+3.6],[hx+2.8,hy+3.7]],'#ffd9ba',.2);
 line(c,[[hx+.9,hy+4.7],[hx+2,hy+4.5]],p.shadow,.28);
 line(c,[[hx+.3,hy+5.6],[hx+1.5,hy+5.5]],'#f1c8b1',.25);
 ellipse(c,hx-1.8,hy+3.3,.65,1,p.skin);ellipse(c,hx-2,hy+3.3,.35,.55,p.shadow);
 // Curved blue-black visor retains a nose and jaw; Blade has a sealed respirator.
 shape(c,[[hx-1.2,hy+1.8],[hx+2.2,hy+1.6],[hx+2.7,hy+2.8],[hx+.3,hy+3.2],[hx-1.2,hy+2.9]],'#0c2636',p.light,.2);
 glow(c,[[hx-1.1,hy+2.1],[hx+1.9,hy+2],[hx+2.3,hy+2.4]],p.neon,.38);
 line(c,[[hx-.7,hy+2.4],[hx+.5,hy+2.3]],'#d5f9ff',.2);
 if(id==='blade'){shape(c,[[hx-.5,hy+3.5],[hx+2.4,hy+3.6],[hx+1.8,hy+5.6],[hx,hy+5.8]],p.alloy,p.light,.25);for(let j=0;j<3;j++)line(c,[[hx+.2+j*.5,hy+4],[hx+.2+j*.5,hy+5]],p.accent,.2);}
 if(id==='jinx'||id==='punk'){
   shape(c,[[hx-2.7,hy+2],[hx-3,hy-.4],[hx-.8,hy-2],[hx+1.9,hy-.9],[hx+2.1,hy+.6],[hx-.3,hy+.5],[hx-1.9,hy+3]],p.hair,INK,.3);
   glow(c,[[hx-2.2,hy],[hx-.6,hy-1.2],[hx+1.4,hy-.5]],p.accent,.35);
   if(id==='jinx'){
    const sway=walking?Math.sin(phase)*1.2:0;
    shape(c,[[hx-2.5,hy],[hx-5,hy+1],[hx-6.3+sway,hy+7],[hx-4.9+sway,hy+9],[hx-3.9,hy+3]],p.hair,INK,.3);
    line(c,[[hx-4,hy+2],[hx-5+sway,hy+6]],p.accent,.35);
   }
 }else if(id!=='brute'){
   shape(c,[[hx-2.7,hy+2],[hx-2.8,hy-.1],[hx-1.3,hy-1.5],[hx+.1,hy-.8],[hx+1.4,hy-1.2],[hx+2.1,hy+.6],[hx-.8,hy+.7],[hx-1.8,hy+2.5]],p.hair,INK,.25);
   for(let j=0;j<4;j++)line(c,[[hx-1.9+j*.65,hy-.5],[hx-1.4+j*.65,hy+.2]],id==='korvo'?'#edf5ff':'#f0d3a6',.2);
 }else{line(c,[[hx-1.5,hy+.5],[hx+.6,hy+.3]],p.light,.4);}
 if(id==='korvo'){line(c,[[hx-.5,hy+5],[hx+.2,hy+6],[hx+1.5,hy+5.7]],p.hair,.8);}
 // Fallout alterations: irregular living tissue, old scars and treatment hardware.
 if(id==='brute'){
   ellipse(c,hx-2.4,hy+1.2,1.4,1.7,'#9a8a72');
   shape(c,[[hx-3.4,hy+1],[hx-3.3,hy-.8],[hx-1.8,hy-1.2],[hx-.5,hy+.1],[hx-1.5,hy+1.8]],'#b5a788','#61594e',.3);
   line(c,[[hx-.4,hy+.3],[hx-.9,hy+1.6],[hx-.2,hy+3.7],[hx-.6,hy+5]],'#7b4d48',.55);
   for(let i=0;i<3;i++)line(c,[[hx-1,hy+1.2+i],[hx+.1,hy+1.7+i]],'#d5b6a0',.22);
 }else if(id==='punk'){
   ellipse(c,hx-1.7,hy+5.7,.85,1.3,'#9d8772');ellipse(c,hx-2.1,hy+4.4,.65,.8,'#b8a17e');
   line(c,[[hx-1.2,hy+4.7],[hx-.5,hy+5.9],[hx-.8,top-.5]],'#675047',.35);
 }else if(id==='blade'){
   line(c,[[hx+.8,hy+.4],[hx+1.1,hy+1.6],[hx+.5,hy+3.7]],'#e2c5b8',.42);
   line(c,[[hx+.5,hy+.5],[hx+.8,hy+1.5]],'#795650',.28);
 }else if(id==='korvo'){
   shape(c,[[hx-2.8,hy+.7],[hx-1.5,hy+.1],[hx-.8,hy+2.4],[hx-1.5,hy+4],[hx-2.4,hy+3.5]],'#8c9283','#515955',.25);
   line(c,[[hx-2.2,hy+1],[hx-1.7,hy+2],[hx-2,hy+3.1]],p.accent,.35);
 }
 // The foreground arm stays in front of the rib cage throughout a punch.
 arm(shoulder,elbow,fist,false);
 if(id==='blade'){
  const end:Point=[Math.min(69,fist[0]+7),Math.max(2,fist[1]-6)];
  line(c,[[fist[0]+1,fist[1]],end],p.neon,1.5);glow(c,[[fist[0]+1,fist[1]],end],p.accent,.7);
 }
 if(['husk','cinder'].includes(id)){
   for(let i=0;i<5;i++){
     const xx=tx-5-i*.65,yy=top+1+i*1.7;
     shape(c,[[xx,yy],[xx-4-i%2,yy-5],[xx+2,yy+2]],'#a2aa79',p.shadow,.4);
   }
   ellipse(c,fist[0],fist[1],3.5,3,'#899868');
   for(let i=0;i<3;i++)line(c,[[fist[0]+i-1,fist[1]],[fist[0]+i,fist[1]+4]],'#e4d6a2',.8);
 }
 if(['sable','razor'].includes(id)){
   glow(c,[[fist[0],fist[1]],[fist[0]+9,fist[1]-9]],p.neon,1.1);
   if(id==='sable'){
     glow(c,[[rf[0],rf[1]],[rf[0]-7,rf[1]-8]],p.accent,1.1);
     line(c,[[hx-2,hy],[hx-6,hy+5],[hx-8,hy+11]],p.neon,1.8);
   }
 }
 if(['sentinel','orison'].includes(id)){
   shape(c,[[hx-3,hy-1],[hx+3,hy],[hx+3,hy+5],[hx-2,hy+6]],p.alloy,INK,.5);
   glow(c,[[hx-2,hy+2],[hx+2.5,hy+2]],p.neon,.7);
   if(id==='orison'){
     for(let i=0;i<3;i++)shape(c,[[tx-6,top+i*3],[tx-10,top-2+i*3],[tx-8,top+4+i*3]],p.light,p.accent,.35);
     ellipse(c,tx,top+5,2.1,2.1,INK);glow(c,[[tx-1,top+5],[tx+1,top+5]],p.accent,.9);
   }
 }
 if(id==='korvo'){
  ellipse(c,tx-6-w,top+6,1.5,2.3,INK);glow(c,[[tx-6-w,top+4.8],[tx-6-w,top+7]],p.accent,.65);
 }
 c.restore();
}

export function bakePremiumCharacters(scene: Phaser.Scene):void{
 for(const [id,art] of Object.entries(CHAR_ART)){
  const frames=new Set(['jumpFall',...Object.keys(BODIES[art.body].frames),...Array.from({length:12},(_,i)=>`walk${i}`),...Array.from({length:6},(_,i)=>`idle${i}`),...ATTACKS.flatMap(a=>[a,`${a}Windup`,`${a}Recover`])]);
  for(const frame of frames){
   const key=`${id}_${frame}`;if(scene.textures.exists(key))continue;
   const texture=scene.textures.createCanvas(key,72*FIGHTER_TEXTURE_SCALE,56*FIGHTER_TEXTURE_SCALE);if(!texture)continue;
   const c=texture.getContext();c.scale(FIGHTER_TEXTURE_SCALE,FIGHTER_TEXTURE_SCALE);renderFighter(c,id,frame);texture.refresh();
  }
  const key=`${id}_portrait`;if(scene.textures.exists(key))continue;
  const portrait=scene.textures.createCanvas(key,28,28);if(!portrait)continue;
  const c=portrait.getContext(),p=SUITS[id];
  c.fillStyle='#101a2a';c.fillRect(0,0,28,28);
  const bg=c.createLinearGradient(0,0,28,28);bg.addColorStop(0,p.alloy);bg.addColorStop(1,'#070c19');c.fillStyle=bg;c.fillRect(0,0,28,28);
  c.save();c.beginPath();c.rect(1,1,26,26);c.clip();c.translate(-58,-23+p.height*2);c.scale(2,2);renderFighter(c,id,'idle');c.restore();
  glow(c,[[1,26],[1,1],[10,1]],p.neon,.7);glow(c,[[18,27],[27,27],[27,18]],p.accent,.7);portrait.refresh();
 }
}
