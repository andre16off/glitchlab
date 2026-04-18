/**
 * td-effects.js
 * Effects whose parameters are driven by TouchDesigner via WebSocket.
 *
 * Each effect receives (imageData, w, h, tdFrame) where tdFrame is
 * the last JSON object received from TD: { type:'params', values:{...} }
 *
 * Convention: TD sends CHOP channel values normalised 0–1 unless noted.
 *
 * Example TD Python script (WebSocket DAT → Script DAT):
 *   import json
 *   chans = { 'r': op('color_chop')['r'][0], 'g': ..., 'b': ... }
 *   op('websocket1').sendText(json.dumps({'type':'params','effect':'td_colorgrade','values':chans}))
 */
const TDFX = {

  // ── RGB Color Grade ──────────────────────────
  // TD sends: { r, g, b }  (multipliers, e.g. 0.5–2.0)
  td_colorgrade: {
    fn(id, w, h, v={}) {
      const d=new Uint8ClampedArray(id.data);
      const rm=v.r||1, gm=v.g||1, bm=v.b||1;
      for(let i=0;i<d.length;i+=4){d[i]=cl(d[i]*rm);d[i+1]=cl(d[i+1]*gm);d[i+2]=cl(d[i+2]*bm);}
      return new ImageData(d,w,h);
    }
  },

  // ── Warp / Displacement ──────────────────────
  // TD sends: { dx, dy, strength }  (normalised –1..1)
  td_warp: {
    fn(id, w, h, v={}) {
      const d=id.data,out=new Uint8ClampedArray(d);
      const dx=(v.dx||0)*w*.15, dy=(v.dy||0)*h*.15;
      const str=v.strength!==undefined?v.strength:1;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const sx=Math.max(0,Math.min(w-1,(x+dx*str)|0));
        const sy=Math.max(0,Math.min(h-1,(y+dy*str)|0));
        const pi=(y*w+x)*4,si=(sy*w+sx)*4;
        out[pi]=d[si];out[pi+1]=d[si+1];out[pi+2]=d[si+2];out[pi+3]=255;
      }
      return new ImageData(out,w,h);
    }
  },

  // ── TD Texture Passthrough ───────────────────
  // TD sends full image frames via { type:'texture', data:'data:image/png;base64,...' }
  // Those are loaded into State.srcImg by td-bridge.js automatically.
  // This effect just passes through (useful to select the TD input slot).
  td_texture: {
    fn(id, w, h, v={}) { return id; }
  },

  // ── Reactive Glitch ──────────────────────────
  // TD sends: { amount }  (0–1, e.g. from audio amplitude)
  td_glitch: {
    fn(id, w, h, v={}) {
      const d=id.data, out=new Uint8ClampedArray(d);
      const amount=(v.amount||0);
      const lines=Math.floor(amount*h*.5);
      for(let i=0;i<lines;i++){
        const y=Math.random()*h|0;
        const shift=(Math.random()-.5)*amount*w*.3|0;
        for(let x=0;x<w;x++){
          const sx=Math.max(0,Math.min(w-1,x+shift));
          const pi=(y*w+x)*4,si=(y*w+sx)*4;
          out[pi]=d[si];out[pi+1]=d[si+1];out[pi+2]=d[si+2];
        }
      }
      return new ImageData(out,w,h);
    }
  },

  // ── Hue Rotation ────────────────────────────
  // TD sends: { hue }  (0–1 = 0–360°)
  td_hue: {
    fn(id, w, h, v={}) {
      const d=new Uint8ClampedArray(id.data);
      const angle=(v.hue||0)*Math.PI*2;
      const cos=Math.cos(angle),sin=Math.sin(angle);
      const m=[
        .299+cos*.701-sin*.168, .587-cos*.587-sin*.330, .114-cos*.114+sin*.497,
        .299-cos*.299+sin*.328, .587+cos*.413+sin*.035, .114-cos*.114-sin*.363,
        .299-cos*.3  -sin*.497, .587-cos*.587+sin*.330, .114+cos*.886+sin*.167,
      ];
      for(let i=0;i<d.length;i+=4){
        const r=d[i],g=d[i+1],b=d[i+2];
        d[i]=cl(r*m[0]+g*m[1]+b*m[2]);
        d[i+1]=cl(r*m[3]+g*m[4]+b*m[5]);
        d[i+2]=cl(r*m[6]+g*m[7]+b*m[8]);
      }
      return new ImageData(d,w,h);
    }
  },
};
