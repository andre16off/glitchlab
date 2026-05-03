/* cpu-effects.js — pure (ImageData,w,h)→ImageData functions */

function fxASCII(id,w,h){
  const d=id.data,cs=State.P('charSize',10),cm=State.P('color',1);
  const AC=' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#000';tX.fillRect(0,0,w,h);tX.font=`${cs}px monospace`;
  for(let y=0;y<h;y+=cs)for(let x=0;x<w;x+=cs){
    let rS=0,gS=0,bS=0,cnt=0;
    for(let dy=0;dy<cs&&y+dy<h;dy++)for(let dx=0;dx<cs&&x+dx<w;dx++){const pi=((y+dy)*w+(x+dx))*4;rS+=d[pi];gS+=d[pi+1];bS+=d[pi+2];cnt++;}
    const r=rS/cnt|0,g=gS/cnt|0,b=bS/cnt|0,lv=lum(r,g,b);
    tX.fillStyle=cm?`rgb(${r},${g},${b})`:`rgb(${lv},${lv},${lv})`;
    tX.fillText(AC[lv*(AC.length-1)/255|0],x,y+cs);
  }
  return tX.getImageData(0,0,w,h);
}

function fxDither(id,w,h){
  const d=new Uint8ClampedArray(id.data),m=State.P('method',0),lv=State.P('levels',4),step=255/(lv-1);
  if(m===0){
    const g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=lum(d[i*4],d[i*4+1],d[i*4+2]);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,old=g[i],nw=Math.round(old/step)*step,err=old-nw;g[i]=nw;if(x+1<w)g[i+1]+=err*.4375;if(y+1<h){if(x>0)g[i+w-1]+=err*.1875;g[i+w]+=err*.3125;if(x+1<w)g[i+w+1]+=err*.0625;}}
    for(let i=0;i<w*h;i++){const v=cl(g[i]);d[i*4]=d[i*4+1]=d[i*4+2]=v;}
  }else if(m===1||m===2){
    const sz=m===1?4:8;
    const b4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    const b8=[0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
    const bay=sz===4?b4:b8,sc=sz*sz;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const pi=(y*w+x)*4,v=lum(d[pi],d[pi+1],d[pi+2])>(bay[(y%sz)*sz+(x%sz)]/sc*255)?255:0;d[pi]=d[pi+1]=d[pi+2]=v;}
  }else{for(let i=0;i<w*h*4;i+=4){const v=Math.round((lum(d[i],d[i+1],d[i+2])+(Math.random()-.5)*60)/step)*step;d[i]=d[i+1]=d[i+2]=cl(v);}}
  return new ImageData(d,w,h);
}

function fxHalftone(id,w,h){
  const d=id.data,sz=State.P('size',14),col=State.P('color',0);
  const[tc,tX]=Renderer.makeTempCanvas(w,h);
  tX.fillStyle='#fff';tX.fillRect(0,0,w,h);
  for(let y=sz/2;y<h;y+=sz)for(let x=sz/2;x<w;x+=sz){
    let rS=0,gS=0,bS=0,cnt=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const px=Math.min(w-1,Math.max(0,Math.floor(x)+dx));
      const py=Math.min(h-1,Math.max(0,Math.floor(y)+dy));
      const pi=(py*w+px)*4;rS+=d[pi];gS+=d[pi+1];bS+=d[pi+2];cnt++;
    }
    const r=rS/cnt|0,g=gS/cnt|0,b=bS/cnt|0;
    const lv=lum(r,g,b)/255;
    const rad=Math.pow(1-lv,1.4)*sz/2*0.95;
    if(rad<0.3)continue;
    tX.beginPath();tX.arc(x,y,rad,0,6.28);
    tX.fillStyle=col?`rgb(${r},${g},${b})`:'#000';
    tX.fill();
  }
  return tX.getImageData(0,0,w,h);
}

/* ── Pixel Sort mejorado — gradiente suave, efecto visible ── */
function fxPixelSort(id,w,h){
  const d=new Uint8ClampedArray(id.data);
  const thr=State.P('threshold',80);
  const dir=State.P('direction',0);
  const mode=State.P('mode',0);
  const softness=State.P('softness',30); // mezcla con original

  function getVal(pi){
    if(mode===0)return lum(d[pi],d[pi+1],d[pi+2]);
    if(mode===1)return d[pi];
    const r=d[pi]/255,g=d[pi+1]/255,b=d[pi+2]/255;
    return(Math.max(r,g,b)-Math.min(r,g,b))*255;
  }

  const orig=new Uint8ClampedArray(id.data);
  const tLow=thr*0.6, tHigh=thr;

  function sortSeg(base,len,stride){
    if(len<2)return;
    const seg=[];
    for(let i=0;i<len;i++){
      const pi=(base+i*stride)*4;
      seg.push({r:d[pi],g:d[pi+1],b:d[pi+2],v:getVal(pi)});
    }
    seg.sort((a,b)=>a.v-b.v);
    for(let i=0;i<len;i++){
      const x=seg[i],pi=(base+i*stride)*4;
      // Blend suave con original en los bordes del segmento
      const edgeFade=Math.min(i,len-1-i)/Math.max(1,len*0.15);
      const t=Math.min(1,edgeFade)*(softness/100<0.5?1:1-(softness-50)/50*0.5);
      d[pi]=cl(x.r*t+orig[pi]*(1-t));
      d[pi+1]=cl(x.g*t+orig[pi+1]*(1-t));
      d[pi+2]=cl(x.b*t+orig[pi+2]*(1-t));
    }
  }

  if(!dir){
    for(let y=0;y<h;y++){
      let st=-1;
      for(let x=0;x<=w;x++){
        const v=x<w?getVal((y*w+x)*4):-1;
        if(st===-1&&v>tLow)st=x;
        else if(st!==-1&&(v<tLow||x===w)){
          if(x-st>3)sortSeg(y*w+st,x-st,1);
          st=-1;
        }
      }
    }
  }else{
    for(let x=0;x<w;x++){
      let st=-1;
      for(let y=0;y<=h;y++){
        const v=y<h?getVal((y*w+x)*4):-1;
        if(st===-1&&v>tLow)st=y;
        else if(st!==-1&&(v<tLow||y===h)){
          if(y-st>3)sortSeg(st*w+x,y-st,w);
          st=-1;
        }
      }
    }
  }
  return new ImageData(d,w,h);
}

function fxBlockify(id,w,h){
  const d=id.data,sz=State.P('size',16),out=new Uint8ClampedArray(d);
  for(let y=0;y<h;y+=sz)for(let x=0;x<w;x+=sz){
    let r=0,g=0,b=0,n=0;const y2=Math.min(y+sz,h),x2=Math.min(x+sz,w);
    for(let yy=y;yy<y2;yy++)for(let xx=x;xx<x2;xx++){const pi=(yy*w+xx)*4;r+=d[pi];g+=d[pi+1];b+=d[pi+2];n++;}
    r=r/n|0;g=g/n|0;b=b/n|0;
    for(let yy=y;yy<y2;yy++)for(let xx=x;xx<x2;xx++){const pi=(yy*w+xx)*4;out[pi]=r;out[pi+1]=g;out[pi+2]=b;}
  }
  return new ImageData(out,w,h);
}

function fxEdge(id,w,h){
  const raw=id.data,str=State.P('strength',5),thr=State.P('threshold',30);
  const mode=State.P('mode',0),blur=State.P('blur',1);
  let d=raw;
  if(blur>0){
    const tmp=new Uint8ClampedArray(raw),r=blur,sz=(2*r+1)*(2*r+1);
    for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){
      let rS=0,gS=0,bS=0;
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        const pi=((y+dy)*w+(x+dx))*4;rS+=raw[pi];gS+=raw[pi+1];bS+=raw[pi+2];
      }
      const pi=(y*w+x)*4;tmp[pi]=rS/sz|0;tmp[pi+1]=gS/sz|0;tmp[pi+2]=bS/sz|0;
    }
    d=tmp;
  }
  const gr=new Float32Array(w*h);
  for(let i=0;i<w*h;i++)gr[i]=lum(d[i*4],d[i*4+1],d[i*4+2]);
  const out=new Uint8ClampedArray(w*h*4);
  const s=str/6;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x,pi=i*4;
    const tl=gr[i-w-1],tc=gr[i-w],tr=gr[i-w+1];
    const ml=gr[i-1],mr=gr[i+1];
    const bl=gr[i+w-1],bc=gr[i+w],br=gr[i+w+1];
    const gx=(-tl-2*ml-bl)+(tr+2*mr+br);
    const gy=(-tl-2*tc-tr)+(bl+2*bc+br);
    const sx=(-3*tl-10*ml-3*bl)+(3*tr+10*mr+3*br);
    const sy=(-3*tl-10*tc-3*tr)+(3*bl+10*bc+3*br);
    const mag=Math.sqrt(gx*gx+gy*gy)*s*0.6+Math.sqrt(sx*sx+sy*sy)*s*0.4;
    const alive=mag>thr;
    if(mode===0){const v=alive?cl(mag):0;out[pi]=out[pi+1]=out[pi+2]=v;}
    else if(mode===1){
      for(let c=0;c<3;c++){
        const get=(ox,oy)=>d[((y+oy)*w+(x+ox))*4+c];
        const gxc=(-get(-1,-1)-2*get(-1,0)-get(-1,1))+(get(1,-1)+2*get(1,0)+get(1,1));
        const gyc=(-get(-1,-1)-2*get(0,-1)-get(1,-1))+(get(-1,1)+2*get(0,1)+get(1,1));
        out[pi+c]=alive?cl(Math.sqrt(gxc*gxc+gyc*gyc)*s):0;
      }
    }
    else if(mode===2){const v=alive?cl(mag):0,bst=Math.pow(v/255,.5)*255;out[pi]=cl(bst*.15);out[pi+1]=cl(bst*.85);out[pi+2]=cl(bst);}
    else if(mode===3){const v=alive?255-cl(mag):255;out[pi]=out[pi+1]=out[pi+2]=v;}
    else{const v=alive?cl(mag):0,a=v/255;out[pi]=cl(raw[pi]*(1-a)+255*a);out[pi+1]=cl(raw[pi+1]*(1-a)+255*a);out[pi+2]=cl(raw[pi+2]*(1-a));}
    out[pi+3]=255;
  }
  return new ImageData(out,w,h);
}

function fxCrosshatch(id,w,h){
  const d=id.data,sp=State.P('spacing',10);
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#fff';tX.fillRect(0,0,w,h);tX.strokeStyle='#111';tX.lineWidth=.8;
  const gW=Math.ceil(w/sp)+1,gH=Math.ceil(h/sp)+1,lg=new Float32Array(gW*gH);
  for(let gy=0;gy<gH;gy++)for(let gx=0;gx<gW;gx++){const px=Math.min(w-1,gx*sp),py=Math.min(h-1,gy*sp);lg[gy*gW+gx]=lum(d[(py*w+px)*4],d[(py*w+px)*4+1],d[(py*w+px)*4+2])/255;}
  for(let gy=0;gy<gH;gy++)for(let gx=0;gx<gW;gx++){const dn=1-lg[gy*gW+gx],x=gx*sp,y=gy*sp,h2=sp*.5,h3=sp*.3;tX.beginPath();if(dn>.2){tX.moveTo(x-h2,y);tX.lineTo(x,y-h2);}if(dn>.45){tX.moveTo(x,y+h2);tX.lineTo(x+h2,y);}if(dn>.65){tX.moveTo(x-h2,y+h2);tX.lineTo(x+h2,y-h2);}if(dn>.82){tX.moveTo(x-h3,y);tX.lineTo(x,y-h3);}tX.stroke();}
  return tX.getImageData(0,0,w,h);
}

function fxDots(id,w,h){
  const d=id.data,sz=State.P('size',8),sp=State.P('spacing',4);
  const shape=State.P('shape',0);
  const step=sz+sp;
  const[tc,tX]=Renderer.makeTempCanvas(w,h);
  tX.fillStyle='#000';tX.fillRect(0,0,w,h);
  for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
    const pi=(Math.floor(y)*w+Math.floor(x))*4;
    const r=d[pi],g=d[pi+1],b=d[pi+2];
    const s=lum(r,g,b)/255*sz*0.9;
    if(s<0.5)continue;
    tX.fillStyle=`rgb(${r},${g},${b})`;
    tX.beginPath();
    if(shape===0){
      tX.save();tX.translate(x,y);tX.rotate(Math.PI/4);
      tX.fillRect(-s/2,-s/2,s,s);tX.restore();
    }else if(shape===1){
      tX.moveTo(x,y-s/2);tX.lineTo(x+s/2,y);
      tX.lineTo(x,y+s/2);tX.lineTo(x-s/2,y);tX.closePath();tX.fill();
    }else{
      const t=s/3;
      tX.fillRect(x-s/2,y-t/2,s,t);
      tX.fillRect(x-t/2,y-s/2,t,s);
    }
  }
  return tX.getImageData(0,0,w,h);
}

function fxContour(id,w,h){
  const d=id.data,lvs=State.P('levels',8),th=State.P('thickness',1);
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#fff';tX.fillRect(0,0,w,h);
  const gr=new Uint8Array(w*h);for(let i=0;i<w*h;i++)gr[i]=lum(d[i*4],d[i*4+1],d[i*4+2]);
  tX.lineWidth=th;
  for(let lv=1;lv<lvs;lv++){const thr=lv/lvs*255;tX.strokeStyle=`hsl(${lv*360/lvs},60%,30%)`;tX.beginPath();for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){const a=gr[y*w+x],b=gr[y*w+x+1],c=gr[(y+1)*w+x];if((a<thr)!==(b<thr)){tX.moveTo(x+(thr-a)/(b-a),y);tX.lineTo(x,y);}if((a<thr)!==(c<thr)){tX.moveTo(x,y+(thr-a)/(c-a));tX.lineTo(x,y);}}tX.stroke();}
  return tX.getImageData(0,0,w,h);
}

function fxMatrix(id,w,h){
  const d=id.data,dn=State.P('density',50)/100,spd=State.P('speed',5);
  const cols=Math.ceil(w/12);
  if(!State.matCols.length||State.matCols.length!==cols)
    State.matCols=Array.from({length:cols},()=>Math.floor(Math.random()*40));
  const[tc,tX]=Renderer.makeTempCanvas(w,h);
  tX.putImageData(id,0,0);
  tX.fillStyle='rgba(0,20,0,0.75)';tX.fillRect(0,0,w,h);
  tX.font='bold 11px monospace';
  for(let i=0;i<cols;i++){
    if(Math.random()>dn*0.15)continue;
    const ch=String.fromCharCode(0x30A0+(Math.random()*96|0));
    const x=i*12,y=State.matCols[i]*14;
    if(State.matCols[i]>0){tX.fillStyle='rgba(255,255,255,0.95)';tX.fillText(ch,x,y);}
    for(let t=1;t<6;t++){
      const ty=y-t*14;if(ty<0)continue;
      const alpha=Math.max(0,(6-t)/6*0.8);
      const green=Math.floor(150+Math.random()*105);
      tX.fillStyle=`rgba(50,${green},50,${alpha})`;
      tX.fillText(String.fromCharCode(0x30A0+(Math.random()*96|0)),x,ty);
    }
    State.matCols[i]+=spd>5?2:1;
    if(y>h+50&&Math.random()>0.97)State.matCols[i]=0;
  }
  return tX.getImageData(0,0,w,h);
}

/* ── Wave Lines mejorado — líneas que siguen la imagen visible ── */
function fxWaveLines(id,w,h){
  const d=id.data;
  const amp=State.P('amplitude',20);
  const fr=State.P('frequency',10);
  const sp=State.P('spacing',8);
  const spd=State.P('speed',6);
  const col=State.P('color',1);
  const thick=State.P('thickness',1);

  const[tc,tX]=Renderer.makeTempCanvas(w,h);

  // Fondo: imagen original oscurecida para que las líneas sean visibles
  tX.putImageData(id,0,0);
  tX.fillStyle='rgba(0,0,0,0.55)';
  tX.fillRect(0,0,w,h);

  const TP=Math.PI*2;

  for(let by=sp/2;by<h+amp;by+=sp){
    tX.beginPath();
    let first=true;

    for(let x=0;x<w;x++){
      // Leer luminancia del pixel para modular la amplitud
      const sy=Math.max(0,Math.min(h-1,Math.round(by)));
      const pi=(sy*w+x)*4;
      const lv=lum(d[pi],d[pi+1],d[pi+2])/255;

      // Amplitud modulada por la imagen — zonas brillantes ondean más
      const waveAmp=amp*(0.3+lv*0.7);
      const y=by+Math.sin((x/w)*TP*fr+State.time*spd)*waveAmp;

      if(first){tX.moveTo(x,y);first=false;}
      else tX.lineTo(x,y);
    }

    // Color de la línea: tomado del píxel central de esa fila
    if(col){
      const sy=Math.max(0,Math.min(h-1,Math.round(by)));
      const pi=(sy*w+(w>>1))*4;
      const lv=lum(d[pi],d[pi+1],d[pi+2])/255;
      const alpha=0.5+lv*0.45;
      tX.strokeStyle=`rgba(${d[pi]},${d[pi+1]},${d[pi+2]},${alpha})`;
    }else{
      const sy=Math.max(0,Math.min(h-1,Math.round(by)));
      const pi=(sy*w+(w>>1))*4;
      const lv=lum(d[pi],d[pi+1],d[pi+2])/255;
      tX.strokeStyle=`rgba(220,220,220,${0.4+lv*0.5})`;
    }

    tX.lineWidth=thick;
    tX.stroke();
  }

  return tX.getImageData(0,0,w,h);
}

function fxVHS(id,w,h){
  const d=id.data,di=State.P('distort',40)/100,cb=State.P('color',50)/100,sl=State.P('scanlines',1),out=new Uint8ClampedArray(d),bl=Math.floor(cb*8);
  for(let y=0;y<h;y++){const dr=(Math.sin(y*.1+State.time*2)*.5+Math.random()*.5)*di*20|0;for(let x=0;x<w;x++){const sx=Math.min(w-1,Math.max(0,x+dr)),pi=(y*w+x)*4,si=(y*w+sx)*4,ri=(y*w+Math.min(w-1,sx+bl))*4,bi=(y*w+Math.max(0,sx-bl))*4;out[pi]=d[ri];out[pi+1]=d[si+1];out[pi+2]=d[bi+2];out[pi+3]=255;if(sl&&y%3===0){out[pi]=out[pi]*.6|0;out[pi+1]=out[pi+1]*.6|0;out[pi+2]=out[pi+2]*.6|0;}}}
  return new ImageData(out,w,h);
}

function fxNoiseCPU(id,w,h){
  const d=id.data,out=new Uint8ClampedArray(d),sc=State.P('scale',50),it=State.P('intensity',60)/100,tp=State.P('type',0),iS=1/sc,tO=State.time*.3;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const pi=(y*w+x)*4;let n=tp===0?Perlin.noise(x*iS+tO,y*iS)*.5+.5:tp===1?Math.random():tp===2?y%4<2?.8:1.2:Math.random()>.5?1:0;const bl=1-it+it*n;out[pi]=cl(d[pi]*bl);out[pi+1]=cl(d[pi+1]*bl);out[pi+2]=cl(d[pi+2]*bl);}
  return new ImageData(out,w,h);
}

/* ══════════════════════════════════════════════════════════════
   NUEVOS EFECTOS
══════════════════════════════════════════════════════════════ */

/* ── Duotono — mapea grises a gradiente entre dos colores ── */
function fxDuotone(id,w,h){
  const d=id.data,out=new Uint8ClampedArray(d);
  const preset=State.P('preset',0);
  const intensity=State.P('intensity',100)/100;

  // Paletas: [sombra, luz]
  const palettes=[
    [[0,0,0],[255,0,128]],       // Negro + Rosa
    [[20,20,80],[255,220,50]],   // Azul marino + Dorado
    [[80,0,120],[255,100,0]],    // Púrpura + Naranja
    [[0,30,60],[0,255,200]],     // Azul oscuro + Cian
    [[20,10,0],[255,180,80]],    // Marrón + Amarillo (vintage)
    [[10,0,30],[180,255,100]],   // Negro + Verde neón
  ];

  const[c0,c1]=palettes[Math.min(preset,palettes.length-1)];

  for(let i=0;i<out.length;i+=4){
    const t=lum(out[i],out[i+1],out[i+2])/255;
    // Curva de contraste suave en S
    const tc=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    const r=c0[0]+(c1[0]-c0[0])*tc;
    const g=c0[1]+(c1[1]-c0[1])*tc;
    const b=c0[2]+(c1[2]-c0[2])*tc;
    out[i  ]=cl(out[i  ]*(1-intensity)+r*intensity);
    out[i+1]=cl(out[i+1]*(1-intensity)+g*intensity);
    out[i+2]=cl(out[i+2]*(1-intensity)+b*intensity);
  }
  return new ImageData(out,w,h);
}

/* ── Gradient Map — reemplaza colores por gradiente según brillo ── */
function fxGradientMap(id,w,h){
  const d=id.data,out=new Uint8ClampedArray(d);
  const preset=State.P('preset',0);
  const intensity=State.P('intensity',100)/100;

  // Gradientes de N paradas: [[t,r,g,b], ...]
  const gradients=[
    // Sunset
    [[0,20,0,40],[0.3,120,0,80],[0.6,255,80,0],[0.85,255,180,0],[1,255,240,180]],
    // Cyberpunk
    [[0,0,0,40],[0.3,0,50,180],[0.6,120,0,255],[0.85,255,0,180],[1,255,220,255]],
    // Vintage
    [[0,30,20,10],[0.4,100,70,30],[0.7,200,150,80],[1,255,230,170]],
    // Acid
    [[0,0,20,0],[0.25,0,180,0],[0.5,180,255,0],[0.75,255,100,0],[1,255,255,0]],
    // Thermal
    [[0,0,0,60],[0.25,0,0,200],[0.5,0,200,200],[0.75,255,200,0],[1,255,255,255]],
    // Monochrome Blue
    [[0,0,0,30],[0.5,20,80,180],[1,180,220,255]],
  ];

  function sampleGrad(stops,t){
    for(let i=0;i<stops.length-1;i++){
      const[t0,r0,g0,b0]=stops[i],[t1,r1,g1,b1]=stops[i+1];
      if(t>=t0&&t<=t1){
        const f=(t-t0)/(t1-t0);
        return[r0+(r1-r0)*f,g0+(g1-g0)*f,b0+(b1-b0)*f];
      }
    }
    const last=stops[stops.length-1];return[last[1],last[2],last[3]];
  }

  const stops=gradients[Math.min(preset,gradients.length-1)];

  for(let i=0;i<out.length;i+=4){
    const t=lum(out[i],out[i+1],out[i+2])/255;
    const[r,g,b]=sampleGrad(stops,t);
    out[i  ]=cl(out[i  ]*(1-intensity)+r*intensity);
    out[i+1]=cl(out[i+1]*(1-intensity)+g*intensity);
    out[i+2]=cl(out[i+2]*(1-intensity)+b*intensity);
  }
  return new ImageData(out,w,h);
}

/* ── Soft Glow — blur + blending aditivo ── */
function fxSoftGlow(id,w,h){
  const d=id.data;
  const radius=State.P('blur',8);
  const strength=State.P('strength',60)/100;
  const threshold=State.P('threshold',30)/100; // solo brillos generan glow

  // Box blur rápido en dos pasadas
  const tmp=new Float32Array(w*h*3);
  const blurred=new Float32Array(w*h*3);

  // Extraer solo los highlights
  for(let i=0,j=0;i<d.length;i+=4,j+=3){
    const lv=lum(d[i],d[i+1],d[i+2])/255;
    const boost=Math.max(0,lv-threshold)/(1-threshold);
    tmp[j  ]=d[i  ]*boost;
    tmp[j+1]=d[i+1]*boost;
    tmp[j+2]=d[i+2]*boost;
  }

  // Blur horizontal
  const r=Math.max(1,radius|0);
  const inv=1/(2*r+1);
  const rowBuf=new Float32Array(w*3);

  for(let y=0;y<h;y++){
    // Acumular primera ventana
    let rS=0,gS=0,bS=0;
    for(let x=-r;x<=r;x++){const xi=Math.min(w-1,Math.max(0,x)),j=(y*w+xi)*3;rS+=tmp[j];gS+=tmp[j+1];bS+=tmp[j+2];}
    for(let x=0;x<w;x++){
      rowBuf[x*3]=rS*inv;rowBuf[x*3+1]=gS*inv;rowBuf[x*3+2]=bS*inv;
      const xl=Math.max(0,x-r),xr=Math.min(w-1,x+r+1);
      const jl=(y*w+xl)*3,jr=(y*w+xr)*3;
      rS+=tmp[jr]-tmp[jl];gS+=tmp[jr+1]-tmp[jl+1];bS+=tmp[jr+2]-tmp[jl+2];
    }
    for(let x=0;x<w;x++){const j=(y*w+x)*3;blurred[j]=rowBuf[x*3];blurred[j+1]=rowBuf[x*3+1];blurred[j+2]=rowBuf[x*3+2];}
  }

  // Blur vertical
  const colBuf=new Float32Array(h*3);
  for(let x=0;x<w;x++){
    let rS=0,gS=0,bS=0;
    for(let y=-r;y<=r;y++){const yi=Math.min(h-1,Math.max(0,y)),j=(yi*w+x)*3;rS+=blurred[j];gS+=blurred[j+1];bS+=blurred[j+2];}
    for(let y=0;y<h;y++){
      colBuf[y*3]=rS*inv;colBuf[y*3+1]=gS*inv;colBuf[y*3+2]=bS*inv;
      const yl=Math.max(0,y-r),yr=Math.min(h-1,y+r+1);
      const jl=(yl*w+x)*3,jr=(yr*w+x)*3;
      rS+=blurred[jr]-blurred[jl];gS+=blurred[jr+1]-blurred[jl+1];bS+=blurred[jr+2]-blurred[jl+2];
    }
    for(let y=0;y<h;y++){const j=(y*w+x)*3;blurred[j]=colBuf[y*3];blurred[j+1]=colBuf[y*3+1];blurred[j+2]=colBuf[y*3+2];}
  }

  // Blend aditivo (screen) con original
  const out=new Uint8ClampedArray(d);
  for(let i=0,j=0;i<out.length;i+=4,j+=3){
    // Screen blend: 1-(1-a)(1-b)
    const br=blurred[j]*strength,bg=blurred[j+1]*strength,bb=blurred[j+2]*strength;
    out[i  ]=cl(255-(255-out[i  ])*(255-br)/255);
    out[i+1]=cl(255-(255-out[i+1])*(255-bg)/255);
    out[i+2]=cl(255-(255-out[i+2])*(255-bb)/255);
  }
  return new ImageData(out,w,h);
}

/* ── Sharpen HD — kernel de enfoque con intensidad ajustable ── */
function fxSharpen(id,w,h){
  const d=id.data,out=new Uint8ClampedArray(d);
  const strength=State.P('strength',50)/100;
  const radius=State.P('radius',1); // 1=suave, 2=agresivo

  // Unsharp mask: original + (original - blur) * strength
  const blurred=new Float32Array(w*h*3);
  const r=radius;
  const sz=(2*r+1)*(2*r+1);

  // Box blur del original
  for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){
    let rS=0,gS=0,bS=0;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const pi=((y+dy)*w+(x+dx))*4;
      rS+=d[pi];gS+=d[pi+1];bS+=d[pi+2];
    }
    const j=(y*w+x)*3;
    blurred[j]=rS/sz;blurred[j+1]=gS/sz;blurred[j+2]=bS/sz;
  }

  // Unsharp mask con clamp anti-artefactos
  for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){
    const pi=(y*w+x)*4,j=(y*w+x)*3;
    for(let c=0;c<3;c++){
      const orig=d[pi+c],blur=blurred[j+c];
      const detail=orig-blur;
      // Limitar el realce para evitar halos
      const boost=detail*strength*2.5;
      out[pi+c]=cl(orig+boost);
    }
  }
  return new ImageData(out,w,h);
}

/* ── Retro 2005 — cámara digital barata de los 2000s ── */
function fxRetro2005(id,w,h){
  const d=id.data;
  const intensity=State.P('intensity',70)/100;
  const grain=State.P('grain',60)/100;
  const jpegBlock=State.P('jpeg',40)/100;

  // 1. Pixelación (baja resolución simulada)
  const downScale=Math.max(1,Math.round(2+intensity*3));
  const tmp=new Uint8ClampedArray(d);

  if(downScale>1){
    for(let y=0;y<h;y+=downScale)for(let x=0;x<w;x+=downScale){
      let rS=0,gS=0,bS=0,n=0;
      for(let dy=0;dy<downScale&&y+dy<h;dy++)for(let dx=0;dx<downScale&&x+dx<w;dx++){
        const pi=((y+dy)*w+(x+dx))*4;rS+=d[pi];gS+=d[pi+1];bS+=d[pi+2];n++;
      }
      const r=rS/n|0,g=gS/n|0,b=bS/n|0;
      for(let dy=0;dy<downScale&&y+dy<h;dy++)for(let dx=0;dx<downScale&&x+dx<w;dx++){
        const pi=((y+dy)*w+(x+dx))*4;tmp[pi]=r;tmp[pi+1]=g;tmp[pi+2]=b;
      }
    }
  }

  // 2. Artefactos JPEG (bloques 8x8 con cuantización)
  const blockSz=8;
  const qStrength=jpegBlock*60;
  if(qStrength>0){
    for(let y=0;y<h;y+=blockSz)for(let x=0;x<w;x+=blockSz){
      let rS=0,gS=0,bS=0,n=0;
      const y2=Math.min(y+blockSz,h),x2=Math.min(x+blockSz,w);
      for(let yy=y;yy<y2;yy++)for(let xx=x;xx<x2;xx++){
        const pi=(yy*w+xx)*4;rS+=tmp[pi];gS+=tmp[pi+1];bS+=tmp[pi+2];n++;
      }
      const avgR=rS/n,avgG=gS/n,avgB=bS/n;
      for(let yy=y;yy<y2;yy++)for(let xx=x;xx<x2;xx++){
        const pi=(yy*w+xx)*4;
        const blend=jpegBlock*0.35;
        tmp[pi  ]=cl(tmp[pi  ]*(1-blend)+avgR*blend+(Math.random()-.5)*qStrength*0.3);
        tmp[pi+1]=cl(tmp[pi+1]*(1-blend)+avgG*blend+(Math.random()-.5)*qStrength*0.3);
        tmp[pi+2]=cl(tmp[pi+2]*(1-blend)+avgB*blend+(Math.random()-.5)*qStrength*0.3);
      }
    }
  }

  const out=new Uint8ClampedArray(tmp);

  // 3. Grano/ruido
  const grainAmt=grain*60;
  for(let i=0;i<out.length;i+=4){
    const n=(Math.random()-.5)*grainAmt;
    out[i  ]=cl(out[i  ]+n);
    out[i+1]=cl(out[i+1]+n*0.9);
    out[i+2]=cl(out[i+2]+n*1.1);
  }

  // 4. Colores lavados + brillo +  saturación reducida
  for(let i=0;i<out.length;i+=4){
    const r=out[i],g=out[i+1],b=out[i+2];
    const lv=lum(r,g,b);
    // Desaturar ligeramente
    const desat=0.25*intensity;
    const dr=r+(lv-r)*desat,dg=g+(lv-g)*desat,db=b+(lv-b)*desat;
    // Lavar colores (aclarar sombras)
    const washLift=15*intensity;
    out[i  ]=cl(dr+washLift);
    out[i+1]=cl(dg+washLift);
    out[i+2]=cl(db+washLift);
  }

  // 5. Sharpen fuerte (característica de cámaras baratas)
  const sharpenAmt=intensity*1.8;
  const sharpOut=new Uint8ClampedArray(out);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const pi=(y*w+x)*4;
    for(let c=0;c<3;c++){
      const center=out[pi+c];
      const neighbors=out[((y-1)*w+x)*4+c]+out[((y+1)*w+x)*4+c]+out[(y*w+x-1)*4+c]+out[(y*w+x+1)*4+c];
      sharpOut[pi+c]=cl(center+sharpenAmt*(center-neighbors/4)*0.5);
    }
  }

  // 6. Aberración cromática leve (misalignment de canales)
  const shift=Math.round(intensity*2);
  const finalOut=new Uint8ClampedArray(sharpOut);
  if(shift>0){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const pi=(y*w+x)*4;
      const rX=Math.min(w-1,x+shift),bX=Math.max(0,x-shift);
      finalOut[pi  ]=sharpOut[(y*w+rX)*4  ];
      finalOut[pi+2]=sharpOut[(y*w+bX)*4+2];
    }
  }

  return new ImageData(finalOut,w,h);
}