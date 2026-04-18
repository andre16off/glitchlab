const Perlin = (() => {
  const PM = new Uint8Array(512);
  (() => {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.random()*(i+1)|0; [p[i],p[j]]=[p[j],p[i]]; }
    for (let i = 0; i < 512; i++) PM[i] = p[i & 255];
  })();
  const g = (h,x,y) => { const hh=h&3,u=hh<2?x:y,v=hh<2?y:x; return ((hh&1)?-u:u)+((hh&2)?-v:v); };
  function noise(x, y) {
    const X=Math.floor(x)&255, Y=Math.floor(y)&255, fx=x-Math.floor(x), fy=y-Math.floor(y);
    const u=fx*fx*fx*(fx*(fx*6-15)+10), v=fy*fy*fy*(fy*(fy*6-15)+10);
    const A=PM[X]+Y, B=PM[X+1]+Y;
    return ((g(PM[A],fx,fy)*(1-u)+g(PM[B],fx-1,fy)*u)*(1-v)+
            (g(PM[A+1],fx,fy-1)*(1-u)+g(PM[B+1],fx-1,fy-1)*u)*v);
  }
  return { noise, noise2: (x,y,s) => noise(x+s*13.7, y+s*7.3) };
})();
