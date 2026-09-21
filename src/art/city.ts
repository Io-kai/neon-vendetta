import Phaser from 'phaser';

// Authored, seeded 1920px district panorama. Rasterised once at boot; no
// per-frame canvas or blur work. All linework lands on the native pixel grid.
const W = 1920;
const glyphs: Record<string, string> = {
  A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',C:'01111100001000010000100001000001111',D:'11110100011000110001100011000111110',E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',G:'01111100001000010111100011000101111',H:'10001100011000111111100011000110001',I:'11111001000010000100001000010011111',J:'00111000100001000010100101001001100',K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',W:'10001100011000110101101011101110001',X:'10001100010101000100010101000110001',Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111',0:'01110100011001110101110011000101110',1:'00100011000010000100001000010001110',2:'01110100010000100010001000100011111',3:'11110000010000101110000010000111110',4:'00010001100101010010111110001000010',7:'11111000010001000100010000100001000',9:'01110100011000101111000010000101110','-':'00000000000000011111000000000000000', '.':'00000000000000000000000000011000110', '/':'00001000100001000100010000100010000'
};
function rect(c: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string) { c.fillStyle=color;c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h)); }
function label(c: CanvasRenderingContext2D,s:string,x:number,y:number,color:string,scale=1) {
  for(const ch of s){const bits=glyphs[ch];if(bits)for(let j=0;j<35;j++)if(bits[j]==='1')rect(c,x+(j%5)*scale,y+Math.floor(j/5)*scale,scale,scale,color);x+=6*scale;}
}
function line(c:CanvasRenderingContext2D,x:number,y:number,xx:number,yy:number,col:string){c.strokeStyle=col;c.lineWidth=1;c.beginPath();c.moveTo(x+.5,y+.5);c.lineTo(xx+.5,yy+.5);c.stroke();}
function random(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function canvas(scene:Phaser.Scene,key:string,h:number,draw:(c:CanvasRenderingContext2D)=>void,w=W){if(scene.textures.exists(key))return;const t=scene.textures.createCanvas(key,w,h);if(!t)return;const c=t.getContext();c.imageSmoothingEnabled=false;draw(c);t.refresh();}
function sign(c:CanvasRenderingContext2D,text:string,x:number,y:number,color:string,scale=1){const w=text.length*6*scale+9,h=7*scale+9;rect(c,x-2,y-2,w+4,h+4,'#080e1c');rect(c,x,y,w,h,'#162338');rect(c,x+1,y+1,w-2,1,color);rect(c,x+1,y+h-2,w-2,1,color);rect(c,x+1,y+2,1,h-4,color);rect(c,x+w-2,y+2,1,h-4,color);label(c,text,x+5,y+5,color,scale);}

export function bakePremiumBackgrounds(scene:Phaser.Scene):void {
  // Align each painted block's curb with the walkable plane. Source art is
  // retained at full resolution in public/art; the native pixel texture is
  // composed once here. The procedural district below remains a load fallback.
  const blocks = [{id:'market', curb:0.837}, {id:'arcade', curb:0.82}, {id:'depot', curb:0.79}];
  if (blocks.every(b => scene.textures.exists(`district_${b.id}`))) {
    for (const variant of ['a','b']) canvas(scene, `bg_mid_${variant}`, 190, c => {
      blocks.forEach((b,i) => {
        const img = scene.textures.get(`district_${b.id}`).getSourceImage() as HTMLImageElement;
        const h = 164 / b.curb;
        c.drawImage(img, 0, 0, img.width, img.height, i * 576, 0, 576, h);
        // Soft shadow seams belong to the alleys, not the storefronts.
        const edge = c.createLinearGradient(i*576,0,i*576+8,0);
        edge.addColorStop(0,'rgba(5,12,23,0.7)'); edge.addColorStop(1,'rgba(5,12,23,0)');
        c.fillStyle=edge;c.fillRect(i*576,0,8,164);
        if(variant==='b') { c.fillStyle='rgba(38,224,203,0.06)';c.fillRect(i*576+180,97,95,50); }
      });
    }, 1728);
  }
  canvas(scene,'bg_sky',120,c=>{
    const g=c.createLinearGradient(0,0,0,120);g.addColorStop(0,'#090f24');g.addColorStop(.6,'#172342');g.addColorStop(1,'#593456');c.fillStyle=g;c.fillRect(0,0,W,120);
    const r=random(71);for(let i=0;i<100;i++)rect(c,r()*W,r()*80,1,1,'#697291');
    // Crescent behind the industrial skyline.
    c.fillStyle='#c7d6ce';c.beginPath();c.arc(320,37,16,0,Math.PI*2);c.fill();c.fillStyle='#14203b';c.beginPath();c.arc(314,32,15,0,Math.PI*2);c.fill();
    for(let i=0;i<100;i++){const x=r()*W,y=15+r()*86;rect(c,x,y,25+r()*110,1+r()*3,'rgba(64,61,88,0.25)');}
  });
  canvas(scene,'bg_far',150,c=>{
    const r=random(642);for(let pass=0;pass<2;pass++)for(let x=-10;x<W;){const w=16+Math.floor(r()*38),h=34+Math.floor(r()*95),y=150-h;const body=pass?'#182b40':'#24364b';rect(c,x,y,w,h,body);rect(c,x+3,y-3,w-6,3,body);rect(c,x+w*.6,y-13,1,13,body);rect(c,x+w*.6,y-14,1,1,'#c56773');rect(c,x+w-2,y,2,h,'#325066');for(let wy=y+7;wy<145;wy+=6)for(let wx=x+4;wx<x+w-4;wx+=5)if(r()>.48)rect(c,wx,wy,2,2,r()>.8?'#ab8163':'#42667a');if(w>35){rect(c,x+8,y+12,w-16,1,'#587e90');rect(c,x+8,y+14,w-16,1,'#2c4b67');}x+=w+3+Math.floor(r()*15);}
    // Elevated transit line breaks up the skyline rhythm.
    rect(c,0,120,W,4,'#142032');rect(c,0,120,W,1,'#496278');for(let x=35;x<W;x+=122){rect(c,x,124,5,26,'#122033');line(c,x-18,124,x,137,'#203449');}
  });
  for(const variant of ['a','b'])canvas(scene,`bg_mid_${variant}`,190,c=>{
    const r=random(338);const colors=['#f7956e','#53d6d0','#cf82c3','#80bacb','#deb36b','#77c0a6','#e17b93','#699dcb'];
    const names=['NOODLE 24','CASSETTE','HOTEL','NIGHT OWL','KOWLOON','LAUNDRY','ARCADE','TERMINAL'];
    for(let block=0;block<12;block++){
      const x=block*160,roof=27+Math.floor(r()*33),accent=colors[block%8];
      // Narrow alley between each individually built facade.
      rect(c,x+142,68,18,98,'#080f1b');rect(c,x+145,106,8,60,'#122337');rect(c,x+148,118,1,39,'#2c4a5d');
      rect(c,x,roof,142,139-roof,'#1b2939');rect(c,x+1,roof+2,137,129-roof,block%2?'#273143':'#253443');rect(c,x+135,roof,7,132-roof,'#101b2c');
      // Masonry, broken plaster, lintels and concrete cornices.
      for(let y=roof+5;y<108;y+=5){rect(c,x+2,y,132,1,'#304050');for(let xx=x+4+(y%2)*8;xx<x+134;xx+=17)rect(c,xx,y-4,1,4,'#1d2a39');}
      rect(c,x-2,roof-2,145,3,'#435468');rect(c,x,roof+1,140,2,'#151d2e');rect(c,x+2,roof+4,132,1,'#3c4b5c');
      // Rooftop ventilation units and antennae.
      rect(c,x+18,roof-12,24,10,'#1c2c3e');rect(c,x+19,roof-13,22,1,'#516072');for(let v=0;v<4;v++)rect(c,x+22+v*4,roof-10,1,6,'#35475a');rect(c,x+104,roof-20,2,18,'#40505e');line(c,x+94,roof-15,x+116,roof-15,'#526576');
      for(let wy=roof+12;wy<100;wy+=25)for(let wx=x+11;wx<x+130;wx+=29){rect(c,wx-1,wy-1,18,21,'#111b2a');rect(c,wx,wy,16,18,'#101c2b');const lit=r();if(lit>.28){rect(c,wx+2,wy+2,12,14,lit>.77?'#92775a':'#38596b');rect(c,wx+3,wy+2,3,14,lit>.77?'#d7ac71':'#699694');rect(c,wx+2,wy+7,12,1,'#26343e');}rect(c,wx+8,wy,1,18,'#182433');rect(c,wx-2,wy+18,20,2,'#4a5963');}
      // Fire escape platforms and zigzag stairs.
      if(block%3===1){for(let y=roof+28;y<110;y+=25){rect(c,x+72,y,42,2,'#0b1525');rect(c,x+73,y-6,40,1,'#657381');for(let xx=x+73;xx<x+115;xx+=7)rect(c,xx,y-6,1,6,'#33475b');line(c,x+77,y+2,x+99,y+23,'#7a827c');line(c,x+83,y+2,x+105,y+23,'#273f4e');for(let k=0;k<8;k++)line(c,x+78+k*3,y+3+k*3,x+84+k*3,y+3+k*3,'#485664');}}
      // Drainpipe, collars and oxidised fittings.
      rect(c,x+128,roof+6,3,112-roof,'#0d1b29');rect(c,x+128,roof+6,1,112-roof,'#60757b');for(let y=roof+15;y<115;y+=18)rect(c,x+127,y,5,2,'#617077');
      rect(c,x,109,139,55,'#101c2c');rect(c,x+3,112,133,2,'#5b6871');
      // Shop glazing: interiors are authored silhouettes, never flat neon panels.
      rect(c,x+7,128,90,32,'#111524');rect(c,x+9,130,85,29,block%2?'#26384a':'#3e3337');for(let k=0;k<4;k++){rect(c,x+12+k*20,134,15,1,accent);rect(c,x+13+k*20,143,13,1,'#746966');rect(c,x+15+k*20,135,4,7,block%2?'#324c5e':'#8a6252');rect(c,x+12+k*20,147,15,9,'#1a2232');rect(c,x+27+k*20,130,2,30,'#152030');}rect(c,x+10,157,83,2,'#667073');
      rect(c,x+101,127,30,37,'#091421');rect(c,x+104,130,24,30,'#223648');rect(c,x+116,131,1,30,'#63717a');rect(c,x+120,146,2,4,'#b9aea1');rect(c,x+105,132,21,1,accent);
      // Alternating awnings, lit marquee, and vertical hotel sign.
      rect(c,x+5,122,131,5,'#172034');for(let xx=x+5;xx<x+133;xx+=11)rect(c,xx,122,6,4,block%2?'#52727b':'#995363');rect(c,x+5,126,131,1,accent);
      sign(c,names[block%8],x+10,105,variant==='b'&&block%3===0?'#725b68':accent);
      if(block%3===2){rect(c,x+131,55,21,54,'#0a1425');rect(c,x+133,56,17,51,'#543e58');rect(c,x+135,57,1,49,accent);'HOTEL'.split('').forEach((ch,i)=>label(c,ch,x+140,59+i*9,accent));}
      if(block%4===0){sign(c,'OPEN',x+68,136,'#e3a46f');rect(c,x+4,146,11,16,'#283746');rect(c,x+5,147,9,1,'#859296');label(c,'24',x+5,150,'#d3b77f');}
      // Vending machine in selected alleys.
      if(block%2===0){rect(c,x+142,130,15,33,'#963954');rect(c,x+143,131,12,1,'#ee8d9c');rect(c,x+144,134,10,19,'#152538');for(let yy=136;yy<150;yy+=5)for(let xx=x+145;xx<x+153;xx+=4){rect(c,xx,yy,2,3,'#96cfce');}rect(c,x+145,157,8,3,'#101c27');}
      rect(c,x,163,141,3,'#101a29');rect(c,x+4,161,128,1,'#53606a');
      // Cables sag across the block, rather than repeating diagonal noise.
      c.strokeStyle='#0c1420';c.lineWidth=1;c.beginPath();c.moveTo(x-9,roof+12);c.quadraticCurveTo(x+75,roof+40,x+169,roof+10);c.stroke();
      // Warm suspended streetlamp.
      rect(c,x+151,85,2,79,'#273d4b');line(c,x+151,85,x+140,81,'#69808a');rect(c,x+134,80,10,3,'#89958e');rect(c,x+135,83,8,1,'#f5d8a3');
    }
  });
  canvas(scene,'bg_ground',120,c=>{
    const r=random(178);rect(c,0,14,W,106,'#192736');rect(c,0,14,W,13,'#34434b');rect(c,0,14,W,1,'#6b777a');rect(c,0,27,W,4,'#101e2d');rect(c,0,28,W,1,'#4b636e');
    for(let x=0;x<W;x+=24){rect(c,x,15,1,11,'#22323e');rect(c,x+1,16,1,9,'#40505a');}rect(c,0,23,W,1,'#263640');
    const g=c.createLinearGradient(0,31,0,120);g.addColorStop(0,'#172839');g.addColorStop(.55,'#243443');g.addColorStop(1,'#152331');c.fillStyle=g;c.fillRect(0,31,W,89);
    for(let i=0;i<5300;i++){const y=32+r()*88;rect(c,r()*W,y,1+r()*3,1,r()>.5?'#2c3d4b':'#142637');}
    // Fractured neon reflected in horizontal wet-road facets; leave fighters readable.
    const colors=['84,174,179','186,89,118','190,146,91','89,123,171'];for(let x=18;x<W;x+=160){const col=colors[Math.floor(x/160)%4];for(let i=0;i<65;i++){const yy=31+r()*76,span=16+(yy-31)*.6;rect(c,x+35+(r()-.5)*span*2,yy,2+r()*14,1,`rgba(${col},${.07+r()*.15})`);}}
    for(let x=60;x<W;x+=293){for(let j=0;j<12;j++)rect(c,x+j*2,82+j%3,44-j*3,1,'#101f2e');rect(c,x+5,82,33,1,'#4b6470');rect(c,x+9,86,21,1,'#354e61');}
    for(let x=0;x<W;x+=80){rect(c,x+12,101,43,2,'#7d8068');rect(c,x+17,101,3,1,'#283844');rect(c,x+28,102,5,1,'#263848');}
    // Storm drains at the curb; inset access plates on the street.
    for(let x=103;x<W;x+=240){rect(c,x,25,27,5,'#0a1826');for(let xx=x+2;xx<x+25;xx+=4)rect(c,xx,26,1,3,'#52616a');rect(c,x+78,56,26,9,'#101f2c');rect(c,x+80,56,22,1,'#4d616a');for(let xx=x+82;xx<x+101;xx+=5)rect(c,xx,58,2,5,'#354955');}
  });
  canvas(scene,'bg_fore',26,c=>{
    // Discontinuous foreground silhouettes preserve the feet and lane visibility.
    for(let x=0;x<W;x+=480){rect(c,x+210,17,104,9,'#080f1a');rect(c,x+211,16,102,1,'#263b48');rect(c,x+224,5,4,21,'#0a1421');rect(c,x+221,4,10,3,'#243b49');rect(c,x+294,5,4,21,'#0a1421');rect(c,x+291,4,10,3,'#243b49');line(c,x+228,9,x+293,13,'#223846');rect(c,x+400,22,47,4,'#0b1421');}
  });
}
