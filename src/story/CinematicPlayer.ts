import Phaser from 'phaser';

export interface FilmShot { speaker: string; text: string; visual?: string; seconds?: number; portrait?: string }

/** Small staged shots over retained city art; every object and tween belongs to the shot. */
export class CinematicPlayer {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private progress?: Phaser.GameObjects.Rectangle;
  constructor(private scene: Phaser.Scene) {}
  private keep<T extends Phaser.GameObjects.GameObject>(o:T):T { this.objects.push(o); return o; }
  private box(x:number,y:number,w:number,h:number,c:number,a=1){return this.keep(this.scene.add.rectangle(x,y,w,h,c,a).setOrigin(0).setScrollFactor(0).setDepth(2200));}
  private label(x:number,y:number,t:string,c='#d9eee9'){
    const line=this.keep(this.scene.add.container(x,y).setScrollFactor(0).setDepth(2205));
    Array.from(t.toUpperCase()).forEach((char,i)=>{const key=`glyph_${char}`;if(char!==' '&&this.scene.textures.exists(key))line.add(this.scene.add.image(i*6,0,key).setOrigin(0).setTint(Number.parseInt(c.slice(1),16)));});
    return line;
  }
  private tween(config:Phaser.Types.Tweens.TweenBuilderConfig){this.tweens.push(this.scene.tweens.add(config));}
  private actor(id:string,x:number,y:number,walk=false,flip=false){
    this.keep(this.scene.add.ellipse(x,y-1,34,5,0x02060a,.75).setScrollFactor(0).setDepth(2201));
    const a=this.keep(this.scene.add.image(x,y,`${id}_${walk?'walk0':'idle0'}`).setOrigin(.5,1).setScale(.68).setFlipX(flip).setScrollFactor(0).setDepth(2202));
    let frame=0;this.timers.push(this.scene.time.addEvent({delay:walk?80:150,loop:true,callback:()=>{frame++;a.setTexture(`${id}_${walk?'walk'+frame%12:'idle'+frame%6}`);}}));return a;
  }
  show(shot:FilmShot,title:string,index:number,total:number):void {
    this.clear();
    const theme=shot.visual?.split('-')[0];
    const campaign=theme && ['club','canal','spire'].includes(theme);
    const backdrop=this.keep(this.scene.add.image(240,126,campaign ? `campaign-${theme}` : (shot.visual==='core'||shot.visual==='restart')?'district_depot':'district_market').setDisplaySize(510,286).setScrollFactor(0).setDepth(2199).setTint(shot.visual==='restart'||shot.visual==='marquee'?0xe4eeee:0x424a61));
    this.tween({targets:backdrop,x:232,duration:(shot.seconds??4)*1000,ease:'Linear'});
    this.box(0,0,480,28,0x030812);this.label(22,11,title.toUpperCase(),'#79dfd1');
    this.label(410,11,`${index+1} / ${total}`,'#78929d');
    this.box(0,170,480,19,0x07101a,.80);
    this.box(0,171,480,.5,0x547775,.4);
    this.stage(shot.visual??'outage', shot.portrait??'kane');
    this.box(0,189,480,81,0x040b13,.96);this.box(22,201,2,40,0x6cdfca);
    this.label(34,201,shot.speaker.toUpperCase(),'#74dfcb');
    const words=shot.text.toUpperCase().replace(/[’]/g,"'").replace(/[—–]/g,'-').split(/\s+/);const lines:string[]=[];let line='';
    for(const word of words){if(line.length+word.length+1>65){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    lines.forEach((text,i)=>this.label(34,216+i*12,text,'#edf0e7'));
    this.label(22,255,'E / SPACE NEXT     ESC SKIP','#82949e');
    this.box(310,258,148,1,0x263840);this.progress=this.box(310,258,1,1,0x80ead7);
  }
  private core(x:number,y:number,stable=false):void {
    this.box(x-23,y-48,46,66,0x08131c).setStrokeStyle(1,0x436472);
    const shell=this.keep(this.scene.add.graphics().setScrollFactor(0).setDepth(2201));
    shell.fillGradientStyle(0x465765,0x182c36,0x18242d,0x07111a);shell.fillRoundedRect(x-22,y-47,44,64,3);
    shell.lineStyle(.7,0x728895,.7);shell.strokeRoundedRect(x-20,y-45,40,60,2);
    shell.fillStyle(0x07111a);shell.fillCircle(x,y-18,17);shell.lineStyle(2,0x4b6470);shell.strokeCircle(x,y-18,17);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;shell.lineStyle(1,0x9aa59e,.8);shell.lineBetween(x+Math.cos(a)*14,y-18+Math.sin(a)*14,x+Math.cos(a)*17,y-18+Math.sin(a)*17);}
    for(const dx of [-17,17])for(const dy of [-40,10]){shell.fillStyle(0xa1aead);shell.fillCircle(x+dx,y+dy,1);}
    const color=stable?'100,255,224':'255,61,100',key=stable?'cinema-core-blue':'cinema-core-red';
    if(!this.scene.textures.exists(key)){
      const t=this.scene.textures.createCanvas(key,192,192)!;const c=t.getContext();const gradient=c.createRadialGradient(96,96,0,96,96,95);
      gradient.addColorStop(0,'rgba(240,255,255,1)');gradient.addColorStop(.12,`rgba(${color},.95)`);gradient.addColorStop(.3,`rgba(${color},.45)`);gradient.addColorStop(1,`rgba(${color},0)`);c.fillStyle=gradient;c.fillRect(0,0,192,192);t.refresh();
    }
    const aura=this.keep(this.scene.add.image(x,y-18,key).setDisplaySize(62,62).setScrollFactor(0).setDepth(2202).setBlendMode(Phaser.BlendModes.ADD));
    const orb=this.keep(this.scene.add.circle(x,y-18,5,stable?0xc8fff6:0xffc5d0,.8).setScrollFactor(0).setDepth(2202));
    this.tween({targets:aura,alpha:stable?.85:.35,scaleX:aura.scaleX*(stable?1.12:.86),scaleY:aura.scaleY*(stable?1.12:.86),duration:stable?1500:230,yoyo:true,repeat:-1});
    this.tween({targets:orb,alpha:stable?.95:.3,duration:stable?1500:230,yoyo:true,repeat:-1});
    for(let i=0;i<4;i++)this.box(x-18,y+7+i*2,36,1,0x547c86,.7).setDepth(2203);
    if(stable){const wash=this.box(0,28,480,161,0x81ffed,.22).setDepth(2204);this.tween({targets:wash,alpha:0,duration:1800});}
  }
  private stage(visual:string,hero:string):void {
    const theme=visual.split('-')[0];
    if(['club','canal','spire'].includes(theme)){
      const exiting=visual.endsWith('-exit');
      const a=this.actor(hero,100,187,exiting);
      if(exiting)this.tween({targets:a,x:250,duration:4800});
      else this.actor(theme==='club'?'sable':theme==='canal'?'cinder':'orison',370,187,false,true);
      if(theme==='spire'&&exiting)this.core(345,156,true);
      return;
    }
    if(visual==='outage') {
      this.core(389,133);
      for(let i=0;i<5;i++){
        const light=this.box(28+i*66,83+(i%2)*24,35,20,i%2?0xfb6dd6:0x6effe2,.5).setDepth(2201);
        this.tween({targets:light,alpha:0,duration:180,delay:300+i*460,repeat:1,yoyo:true,onComplete:()=>light.setAlpha(0)});
      }
      return;
    }
    if(visual==='entrance') {
      this.box(48,86,42,102,0x9debdc,.12);
      const a=this.actor(hero,69,187,true);this.tween({targets:a,x:209,duration:3800});
      this.box(304,137,24,49,0x0b1521).setStrokeStyle(1,0xe76daf);
      this.box(308,143,16,12,0x5ff5df,.8);this.box(308,161,16,19,0x101b2b);
      for(let i=0;i<6;i++)this.box(310,145+i*1.3,12-i,0.5,0x173a45,.8);
      for(const yy of [166,175]){this.keep(this.scene.add.circle(316,yy,3.3,0x344956).setStrokeStyle(.6,0x907787).setScrollFactor(0).setDepth(2202));this.keep(this.scene.add.circle(316,yy,1.2,0x0a1321).setScrollFactor(0).setDepth(2203));}
      for(let i=0;i<3;i++)this.box(309+i*5,157,2,1,0xf3b787).setDepth(2203);
      for(let i=0;i<4;i++){const spark=this.box(315+i*3,140,2,2,0xffe29b).setDepth(2204);this.tween({targets:spark,x:spark.x+12,y:spark.y-13,alpha:0,duration:350+i*100,repeat:-1,delay:i*110});}
      return;
    }
    if(visual==='blockade') {
      this.actor('punk',208,187,false,true);this.actor('punk',315,187,false,true);
      const sign=this.box(140,43,214,28,0x111524).setStrokeStyle(1,0xaa536b);
      const text=this.label(158,54,'PAY OR STAY DARK','#ffb4b2');this.tween({targets:[sign,text],alpha:.18,duration:120,hold:650,yoyo:true,repeat:-1});
      return;
    }
    if(visual==='core') {this.actor(hero,107,187,false);this.core(302,159);this.actor('korvo',379,187,false,true);return;}
    if(visual==='restart') {this.core(242,135,true);return;}
    if(visual==='marquee') {
      const a=this.actor(hero,150,187,true);this.tween({targets:a,x:229,duration:3600});
      for(const [i,id]of ['punk','jinx','bull'].entries()){
        const crowd=this.actor(id,326+i*43,173,false,i%2===0).setScale(.35).setAlpha(.7);this.tween({targets:crowd,y:168,duration:450+i*90,yoyo:true,repeat:-1});
      }
      this.box(117,44,246,28,0x091320).setStrokeStyle(1,0x46726d);this.label(204,55,'BACK ON','#a7ffe9');
      for(let i=0;i<12;i++){const light=this.keep(this.scene.add.circle(125+i*21,47,1.5,0x97ffe2,0).setScrollFactor(0).setDepth(2204));this.tween({targets:light,alpha:1,duration:160,delay:i*120});}
    }
  }
  tick(fraction:number):void {this.progress?.setDisplaySize(148*Math.min(1,Math.max(0,fraction)),1);}
  clear():void {this.timers.forEach(t=>t.remove(false));this.timers=[];this.tweens.forEach(t=>t.remove());this.tweens=[];this.objects.forEach(o=>o.destroy());this.objects=[];this.progress=undefined;}
}
