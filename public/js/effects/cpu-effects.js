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
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#fff';tX.fillRect(0,0,w,h);
  for(let y=sz/2;y<h;y+=sz)for(let x=sz/2;x<w;x+=sz){
    const pi=(Math.floor(y)*w+Math.floor(x))*4,r=d[pi],g=d[pi+1],b=d[pi+2],rad=(1-lum(r,g,b)/255)*sz/2*.9;
    tX.beginPath();tX.arc(x,y,rad,0,6.28);tX.fillStyle=col?`rgb(${r},${g},${b})`:'#000';tX.fill();
  }
  return tX.getImageData(0,0,w,h);
}

function fxPixelSort(id,w,h){
  const d=new Uint8ClampedArray(id.data),thr=State.P('threshold',80),dir=State.P('direction',0),pct=State.P('length',60)/100;
  function ss(base,len,stride){
    const s=[];for(let i=0;i<len;i++){const pi=(base+i*stride)*4;s.push({r:d[pi],g:d[pi+1],b:d[pi+2],l:lum(d[pi],d[pi+1],d[pi+2])});}
    s.slice(0,s.length*pct|0).sort((a,b)=>a.l-b.l);
    for(let i=0;i<len;i++){const x=s[i],pi=(base+i*stride)*4;d[pi]=x.r;d[pi+1]=x.g;d[pi+2]=x.b;}
  }
  if(!dir){for(let y=0;y<h;y++){let st=-1;for(let x=0;x<=w;x++){const lv=x<w?lum(d[(y*w+x)*4],d[(y*w+x)*4+1],d[(y*w+x)*4+2]):-1;if(st===-1&&lv>thr)st=x;else if(st!==-1&&(lv<=thr||x===w)){ss(y*w+st,x-st,1);st=-1;}}}}
  else{for(let x=0;x<w;x++){let st=-1;for(let y=0;y<=h;y++){const lv=y<h?lum(d[(y*w+x)*4],d[(y*w+x)*4+1],d[(y*w+x)*4+2]):-1;if(st===-1&&lv>thr)st=y;else if(st!==-1&&(lv<=thr||y===h)){ss(st*w+x,y-st,w);st=-1;}}}}
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

function fxThreshold(id,w,h){
  const d=id.data,lv=State.P('level',128),inv=State.P('invert',0),out=new Uint8ClampedArray(d);
  for(let i=0;i<out.length;i+=4){const v=(lum(out[i],out[i+1],out[i+2])>lv)!==!!inv?255:0;out[i]=out[i+1]=out[i+2]=v;}
  return new ImageData(out,w,h);
}

function fxEdge(id,w,h){
  const raw=id.data,str=State.P('strength',5),thr=State.P('threshold',30),mode=State.P('mode',0),blur=State.P('blur',1);
  let d=raw;
  if(blur>0){const tmp=new Uint8ClampedArray(raw),r=blur,sz=(2*r+1)*(2*r+1);for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){let rS=0,gS=0,bS=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const pi=((y+dy)*w+(x+dx))*4;rS+=raw[pi];gS+=raw[pi+1];bS+=raw[pi+2];}const pi=(y*w+x)*4;tmp[pi]=rS/sz|0;tmp[pi+1]=gS/sz|0;tmp[pi+2]=bS/sz|0;}d=tmp;}
  const gr=new Uint8Array(w*h);for(let i=0;i<w*h;i++)gr[i]=lum(d[i*4],d[i*4+1],d[i*4+2]);
  const out=new Uint8ClampedArray(w*h*4),s=str/8;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x,pi=i*4;
    const tl=gr[i-w-1],tc=gr[i-w],tr=gr[i-w+1],cl2=gr[i-1],cr=gr[i+1],bl=gr[i+w-1],bc=gr[i+w],br2=gr[i+w+1];
    const gx=(-tl-2*cl2-bl)+(tr+2*cr+br2),gy=(-tl-2*tc-tr)+(bl+2*bc+br2);
    const mag=Math.sqrt(gx*gx+gy*gy)*s,alive=mag>thr;
    if(mode===0){const v=alive?cl(mag):0;out[pi]=out[pi+1]=out[pi+2]=v;}
    else if(mode===1){for(let c=0;c<3;c++){const get=(ox,oy)=>d[((y+oy)*w+(x+ox))*4+c];const gxc=(-get(-1,-1)-2*get(-1,0)-get(-1,1))+(get(1,-1)+2*get(1,0)+get(1,1));const gyc=(-get(-1,-1)-2*get(0,-1)-get(1,-1))+(get(-1,1)+2*get(0,1)+get(1,1));out[pi+c]=alive?cl(Math.sqrt(gxc*gxc+gyc*gyc)*s):0;}}
    else if(mode===2){const v=alive?cl(mag):0,bst=Math.pow(v/255,.5)*255;out[pi]=cl(bst*.2);out[pi+1]=cl(bst*.9);out[pi+2]=cl(bst);}
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
  const d=id.data,sz=State.P('size',8),sp=State.P('spacing',4),step=sz+sp;
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#000';tX.fillRect(0,0,w,h);
  for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){const pi=(Math.floor(y)*w+Math.floor(x))*4,r=d[pi],g=d[pi+1],b=d[pi+2],rad=lum(r,g,b)/255*sz/2;if(rad<.4)continue;tX.beginPath();tX.arc(x,y,rad,0,6.28);tX.fillStyle=`rgb(${r},${g},${b})`;tX.fill();}
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
  const dn=State.P('density',50)/100,cols=Math.ceil(w/12);
  if(!State.matCols.length||State.matCols.length!==cols)State.matCols=Array.from({length:cols},()=>Math.floor(Math.random()*40));
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.putImageData(id,0,0);
  tX.fillStyle='rgba(0,0,0,.4)';tX.fillRect(0,0,w,h);tX.font='11px monospace';
  for(let i=0;i<State.matCols.length;i++){if(Math.random()>dn*.1)continue;const ch=String.fromCharCode(0x30A0+(Math.random()*96|0)),x=i*12,y=State.matCols[i]*14;tX.fillStyle=`rgba(${Math.random()>.9?200:50},${180+Math.random()*75|0},50,.8)`;tX.fillText(ch,x,y);State.matCols[i]++;if(y>h&&Math.random()>.99)State.matCols[i]=0;}
  return tX.getImageData(0,0,w,h);
}

function fxWaveLines(id,w,h){
  const d=id.data,amp=State.P('amplitude',20),fr=State.P('frequency',10),sp=State.P('spacing',8),spd=State.P('speed',6),col=State.P('color',1);
  const[tc,tX]=Renderer.makeTempCanvas(w,h);tX.fillStyle='#000';tX.fillRect(0,0,w,h);
  const TP=Math.PI*2,mx=w>>1;
  for(let by=0;by<h+amp;by+=sp){tX.beginPath();let first=1;for(let x=0;x<w;x++){const sy=Math.max(0,Math.min(h-1,by)),lv=lum(d[(sy*w+x)*4],d[(sy*w+x)*4+1],d[(sy*w+x)*4+2])/255,y=by+Math.sin((x/w)*TP*fr+State.time*spd)*amp*lv;first?(tX.moveTo(x,y),first=0):tX.lineTo(x,y);}if(col){const sy=Math.max(0,Math.min(h-1,by)),pi=(sy*w+mx)*4;tX.strokeStyle=`rgba(${d[pi]},${d[pi+1]},${d[pi+2]},.85)`;}else tX.strokeStyle='rgba(200,200,200,.8)';tX.lineWidth=1;tX.stroke();}
  return tX.getImageData(0,0,w,h);
}

function fxVoronoi(id,w,h){
  const d=id.data,nc=State.P('cells',60),style=State.P('style',0),col=State.P('color',1);
  if(!State.vorSites||State.vorSites.length!==nc*2||State.vorW!==w||State.vorH!==h){State.vorSites=new Float32Array(nc*2);for(let i=0;i<nc;i++){State.vorSites[i*2]=Math.random()*w;State.vorSites[i*2+1]=Math.random()*h;}State.vorW=w;State.vorH=h;}
  const vs=State.vorSites,GS=Math.ceil(Math.sqrt(nc))*2,cW=w/GS,cH=h/GS;
  const grid=Array.from({length:GS*GS},()=>[]);
  for(let i=0;i<nc;i++){const gx=Math.min(GS-1,vs[i*2]/cW|0),gy=Math.min(GS-1,vs[i*2+1]/cH|0);grid[gy*GS+gx].push(i);}
  const out=new Uint8ClampedArray(w*h*4);
  if(style===0||style===2){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const gx0=Math.max(0,(x/cW|0)-1),gy0=Math.max(0,(y/cH|0)-1),gx1=Math.min(GS-1,(x/cW|0)+1),gy1=Math.min(GS-1,(y/cH|0)+1);let minD=1e10,minI=0;for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++)for(const i of grid[gy*GS+gx]){const dx=x-vs[i*2],dy=y-vs[i*2+1],dd=dx*dx+dy*dy;if(dd<minD){minD=dd;minI=i;}}const sx=Math.max(0,Math.min(w-1,vs[minI*2]|0)),sy=Math.max(0,Math.min(h-1,vs[minI*2+1]|0)),pi=(y*w+x)*4,si=(sy*w+sx)*4;if(col){out[pi]=d[si];out[pi+1]=d[si+1];out[pi+2]=d[si+2];}else{const lv=minI*255/nc|0;out[pi]=lv;out[pi+1]=lv;out[pi+2]=lv;}out[pi+3]=255;}}
  if(style===1||style===2||style===3){const[tc,tX]=Renderer.makeTempCanvas(w,h);if(style===2)tX.putImageData(new ImageData(out,w,h),0,0);else{tX.fillStyle='#000';tX.fillRect(0,0,w,h);}for(let i=0;i<nc;i++){const px=vs[i*2],py=vs[i*2+1];if(style===1&&col){const pi=(Math.min(h-1,py|0)*w+Math.min(w-1,px|0))*4;tX.strokeStyle=`rgb(${d[pi]},${d[pi+1]},${d[pi+2]})`;}else tX.strokeStyle=style===3?'rgba(180,220,255,.6)':'rgba(255,255,255,.25)';tX.lineWidth=style===3?1.5:1;tX.beginPath();const ds=[];for(let j=0;j<nc;j++){if(j===i)continue;const dx=vs[j*2]-px,dy=vs[j*2+1]-py;ds.push([dx*dx+dy*dy,j]);}ds.sort((a,b)=>a[0]-b[0]);for(let n=0;n<Math.min(6,ds.length);n++){tX.moveTo((px+vs[ds[n][1]*2])/2,(py+vs[ds[n][1]*2+1])/2);tX.lineTo(px,py);}tX.stroke();}if(style===3){tX.fillStyle='rgba(100,180,255,.2)';for(let i=0;i<nc;i++){tX.beginPath();tX.arc(vs[i*2],vs[i*2+1],2,0,6.28);tX.fill();}}return tX.getImageData(0,0,w,h);}
  return new ImageData(out,w,h);
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
