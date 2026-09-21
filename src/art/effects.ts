import Phaser from 'phaser';

/** Authored impact silhouettes. Baked once, never allocated in the render loop. */
export function bakePremiumEffects(scene: Phaser.Scene): void {
  for (let frame = 0; frame < 3; frame++) {
    const key = `fx_spark${frame}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, 40, 40)!;
    const c = tex.getContext();
    const star = (outer: number, inner: number, color: string, rotation: number) => {
      c.fillStyle = color;
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8 + rotation;
        const r = i % 2 ? inner : outer * (i % 4 ? 0.72 : 1);
        const x = Math.round(20 + Math.cos(a) * r);
        const y = Math.round(20 + Math.sin(a) * r);
        if (!i) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath(); c.fill();
    };
    if (frame < 2) {
      star(frame ? 19 : 13, 4, '#fb633e', 0.18);
      star(frame ? 15 : 11, 3, '#ffd57a', 0.18);
      star(frame ? 10 : 8, 2, '#fff7dc', 0.18);
      c.fillStyle = '#ffffff'; c.fillRect(18, 18, 4, 4);
    } else {
      c.fillStyle = '#ffdf9a';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + 0.18;
        c.fillRect(Math.round(19 + Math.cos(a) * 16), Math.round(19 + Math.sin(a) * 16), 2, 2);
      }
    }
    tex.refresh();
  }
  if (scene.textures.exists('fx_shadow')) scene.textures.remove('fx_shadow');
  const shadow = scene.textures.createCanvas('fx_shadow', 32, 10)!;
  const c = shadow.getContext();
  c.fillStyle = 'rgba(3,8,18,0.18)'; c.fillRect(3, 1, 26, 8);
  c.fillStyle = 'rgba(3,8,18,0.3)'; c.fillRect(1, 3, 30, 4);
  c.fillStyle = 'rgba(3,8,18,0.42)'; c.fillRect(5, 2, 22, 6);
  c.fillStyle = 'rgba(3,8,18,0.5)'; c.fillRect(9, 3, 14, 4);
  shadow.refresh();
}
