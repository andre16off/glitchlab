/**
 * ui.js
 * Defines Effects.registry (all effects + params) and builds the UI.
 */

const Effects = {
  registry: {

    // ── CPU ───────────────────────────────────────
    none:       { id:'none',       name:'Sin efecto',      type:'cpu', fn:id=>id, params:{} },
    ascii:      { id:'ascii',      name:'Arte ASCII',      type:'cpu', fn:fxASCII,
      params:{ charSize:{min:4,max:32,val:12,step:1,label:'Tamaño carácter'}, color:{type:'cb',val:1,label:'Color'} } },
    dither:     { id:'dither',     name:'Tramado',         type:'cpu', fn:fxDither,
      params:{ levels:{min:2,max:16,val:4,step:1,label:'Niveles'}, method:{type:'sel',opts:['Floyd-Steinberg','Ordenado 4×4','Ordenado 8×8','Aleatorio'],val:0,label:'Método'} } },
    halftone:   { id:'halftone',   name:'Semitonos',       type:'cpu', fn:fxHalftone,
      params:{ size:{min:4,max:40,val:14,step:1,label:'Tamaño'}, color:{type:'cb',val:0,label:'Color'} } },
    matrix:     { id:'matrix',     name:'Lluvia Matrix',   type:'cpu', anim:true, fn:fxMatrix,
      params:{ speed:{min:1,max:10,val:5,step:1,label:'Velocidad'}, density:{min:10,max:100,val:50,step:1,label:'Densidad'} } },
    dots: { id:'dots', name:'Puntos', type:'cpu', fn:fxDots,
    params:{ size:{min:2,max:30,val:8,step:1,label:'Tamaño'}, spacing:{min:1,max:20,val:4,step:1,label:'Espaciado'}, shape:{type:'sel',opts:['Cuadrado','Rombo','Cruz'],val:0,label:'Forma'} } },
    contour:    { id:'contour',    name:'Contornos',       type:'cpu', fn:fxContour,
      params:{ levels:{min:2,max:32,val:8,step:1,label:'Niveles'}, thickness:{min:1,max:5,val:1,step:1,label:'Grosor'} } },
    pixelsort: { id:'pixelsort', name:'Orden píxeles', type:'cpu', fn:fxPixelSort,
  params:{ threshold:{min:0,max:255,val:60,step:1,label:'Umbral'}, direction:{type:'sel',opts:['Horizontal','Vertical'],val:0,label:'Dirección'}, mode:{type:'sel',opts:['Luminancia','Rojo','Saturación'],val:0,label:'Ordenar por'} } },
    blockify:   { id:'blockify',   name:'Pixelado',        type:'cpu', fn:fxBlockify,
      params:{ size:{min:2,max:64,val:16,step:1,label:'Tamaño bloque'} } },
    threshold:  { id:'threshold',  name:'Umbral',          type:'cpu', fn:fxThreshold,
      params:{ level:{min:0,max:255,val:128,step:1,label:'Nivel'}, invert:{type:'cb',val:0,label:'Invertir'} } },
    edge:       { id:'edge',       name:'Detec. bordes',   type:'cpu', hot:true, fn:fxEdge,
      params:{ strength:{min:1,max:20,val:5,step:1,label:'Intensidad'}, threshold:{min:0,max:255,val:30,step:1,label:'Umbral'}, mode:{type:'sel',opts:['B/N','Color','Neón','Invertido','Overlay'],val:0,label:'Modo'}, blur:{min:0,max:3,val:1,step:1,label:'Suavizado'} } },
    crosshatch: { id:'crosshatch', name:'Rayado cruzado',  type:'cpu', fn:fxCrosshatch,
      params:{ spacing:{min:4,max:32,val:10,step:1,label:'Espaciado'} } },
    wavelines:  { id:'wavelines',  name:'Wave Lines',      type:'cpu', anim:true, fn:fxWaveLines,
      params:{ amplitude:{min:1,max:60,val:20,step:1,label:'Amplitud'}, frequency:{min:1,max:40,val:10,step:1,label:'Frecuencia'}, spacing:{min:2,max:30,val:8,step:1,label:'Espaciado'}, speed:{min:0,max:20,val:6,step:1,label:'Velocidad'}, color:{type:'cb',val:1,label:'Color imagen'} } },
   voronoi: { id:'voronoi', name:'Voronoi', type:'cpu', fn:fxVoronoi,
  params:{ cells:{min:10,max:200,val:60,step:1,label:'Celdas'}, style:{type:'sel',opts:['Sin bordes','Con bordes'],val:1,label:'Estilo'}, color:{type:'cb',val:1,label:'Color imagen'} } },
    vhs:        { id:'vhs',        name:'Glitch VHS',      type:'cpu', anim:true, fn:fxVHS,
      params:{ distort:{min:0,max:100,val:40,step:1,label:'Distorsión'}, color:{min:0,max:100,val:50,step:1,label:'Sangrado'}, scanlines:{type:'cb',val:1,label:'Scanlines'} } },
    noise_cpu:  { id:'noise_cpu',  name:'Ruido (CPU)',     type:'cpu', anim:true, fn:fxNoiseCPU,
      params:{ scale:{min:1,max:200,val:50,step:1,label:'Escala'}, intensity:{min:0,max:100,val:60,step:1,label:'Intensidad'}, type:{type:'sel',opts:['Perlin','Grano','Escaneo','Estático'],val:0,label:'Tipo'} } },

    // ── WebGL (GPU) ───────────────────────────────
    liquidglass_gl: { id:'liquidglass_gl', name:'Liquid Glass',     type:'webgl', anim:true, hot:true,
      fragSrc: WGLFX.liquidGlass.fragSrc, uniforms: WGLFX.liquidGlass.uniforms.bind(WGLFX.liquidGlass),
      params:{ scale:{min:10,max:200,val:60,step:1,label:'Escala'}, distortion:{min:1,max:60,val:22,step:1,label:'Distorsión'}, speed:{min:1,max:20,val:6,step:1,label:'Velocidad'}, chromatic:{min:0,max:20,val:6,step:1,label:'Aberración'}, highlight:{min:0,max:100,val:50,step:1,label:'Destellos'} } },
    noise_gl: { id:'noise_gl', name:'Noise Field (GPU)',  type:'webgl', anim:true,
      fragSrc: WGLFX.noiseField.fragSrc, uniforms: WGLFX.noiseField.uniforms.bind(WGLFX.noiseField),
      params:{ scale:{min:1,max:200,val:50,step:1,label:'Escala'}, intensity:{min:0,max:100,val:60,step:1,label:'Intensidad'}, type:{type:'sel',opts:['Perlin','Grano','Escaneo','Estático'],val:0,label:'Tipo'} } },
    feedback_gl: { id:'feedback_gl', name:'Feedback / Trails', type:'webgl', anim:true, hot:true,
      fragSrc: WGLFX.feedback.fragSrc, uniforms: WGLFX.feedback.uniforms.bind(WGLFX.feedback),
      params:{ decay:{min:50,max:99,val:88,step:1,label:'Decay %'}, zoom:{min:0,max:20,val:2,step:1,label:'Zoom'}, rotate:{min:-10,max:10,val:1,step:1,label:'Rotación'}, displace:{min:0,max:100,val:30,step:1,label:'Desplaz.'} } },
    chromwarp_gl: { id:'chromwarp_gl', name:'Chromatic Warp',    type:'webgl',
      fragSrc: WGLFX.chromaWarp.fragSrc, uniforms: WGLFX.chromaWarp.uniforms.bind(WGLFX.chromaWarp),
      params:{ aberration:{min:0,max:30,val:8,step:1,label:'Aberración'}, barrel:{min:-10,max:10,val:3,step:1,label:'Barrel'}, vignette:{min:0,max:100,val:50,step:1,label:'Viñeta'}, scanlines:{type:'cb',val:1,label:'Scanlines'} } },
    particles_gl: { id:'particles_gl', name:'Particle Field',    type:'webgl', anim:true, hot:true,
      fragSrc: WGLFX.particles.fragSrc, uniforms: WGLFX.particles.uniforms.bind(WGLFX.particles),
      params:{ density:{min:5,max:80,val:30,step:1,label:'Densidad'}, size:{min:10,max:120,val:60,step:1,label:'Tamaño'}, speed:{min:1,max:15,val:4,step:1,label:'Velocidad'}, glow:{min:0,max:100,val:80,step:1,label:'Brillo'} } },

    // ── TouchDesigner ─────────────────────────────
    td_colorgrade: { id:'td_colorgrade', name:'TD Color Grade',   type:'td', fn:TDFX.td_colorgrade.fn, params:{} },
    td_warp:       { id:'td_warp',       name:'TD Warp',          type:'td', fn:TDFX.td_warp.fn,       params:{} },
    td_glitch:     { id:'td_glitch',     name:'TD Reactive Glitch',type:'td', anim:true, fn:TDFX.td_glitch.fn, params:{} },
    td_hue:        { id:'td_hue',        name:'TD Hue Rotation',  type:'td', fn:TDFX.td_hue.fn,        params:{} },
    td_texture:    { id:'td_texture',    name:'TD Texture Input', type:'td', fn:TDFX.td_texture.fn,    params:{} },
  }
};

// ── UI Builder ─────────────────────────────────────────────────
const UI = {
  build() {
    const groups = { cpu:'effects-cpu', webgl:'effects-gpu', td:'effects-td' };
    let counts = { cpu:0, webgl:0, td:0 };

    Object.values(Effects.registry).forEach(eff => {
      const el = document.createElement('div');
      el.className = 'effect-item' + (eff.id === State.activeEffect ? ' active' : '');
      el.id = 'eff_' + eff.id;
      let h = `<span class="nm">${eff.name}</span>`;
    
      el.innerHTML = h;
      el.onclick = () => App.selectEffect(eff.id);
      const target = groups[eff.type];
      if (target) { document.getElementById(target).appendChild(el); counts[eff.type]++; }
    });

    document.getElementById('cpu-count').textContent = counts.cpu;
    document.getElementById('gpu-count').textContent = counts.webgl;
    this.buildParams('none');
  },

  buildParams(id) {
    const eff = Effects.registry[id];
    const params = eff?.params || {};
    let h = '';

    Object.entries(params).forEach(([key, def]) => {
      if (State.getParam(id, key, undefined) === undefined)
        State.setParam(id, key, def.val ?? 0);
      const cur = State.getParam(id, key, def.val);
      const chg = `State.setParam('${id}','${key}',`;

      if (def.type === 'cb') {
        h += `<label class="checkbox-row">
          <input type="checkbox" ${cur ? 'checked' : ''} onchange="${chg}this.checked?1:0);Renderer.renderFrame()">
          <span>${def.label}</span></label>`;
      } else if (def.type === 'sel') {
        h += `<div class="param-row"><div class="param-label"><span>${def.label}</span></div>
          <select onchange="${chg}this.selectedIndex);if('${id}'==='voronoi')State.vorSites=null;Renderer.renderFrame()">`;
        def.opts.forEach((o,i) => h += `<option ${i===cur?'selected':''}>${o}</option>`);
        h += `</select></div>`;
      } else {
        h += `<div class="param-row">
          <div class="param-label"><span>${def.label}</span><span class="val" id="pv_${id}_${key}">${cur}</span></div>
          <input type="range" min="${def.min}" max="${def.max}" step="${def.step||1}" value="${cur}"
            oninput="${chg}+this.value);document.getElementById('pv_${id}_${key}').textContent=this.value;Renderer.renderFrame()">
          </div>`;
      }
    });

    document.getElementById('settings-content').innerHTML =
      h || `<span class="muted-hint">${eff?.type==='td' ? 'Parámetros via TD WebSocket' : 'Sin parámetros'}</span>`;
  },

  setActive(id) {
    document.querySelectorAll('.effect-item').forEach(el => el.classList.remove('active'));
    document.getElementById('eff_' + id)?.classList.add('active');
    const name = Effects.registry[id]?.name || '— sin efecto —';
    document.getElementById('current-effect-name').textContent = name;
    const label = document.getElementById('effect-label');
    label.textContent = name.toUpperCase();
    label.classList.add('show');
    clearTimeout(UI._labelTimer);
    UI._labelTimer = setTimeout(() => label.classList.remove('show'), 1800);
    this.buildParams(id);
  },

  showCanvas() {
    document.getElementById('main-canvas').style.display = 'block';
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('mode-badge').textContent = 'EN VIVO';
  },

  hideCanvas() {
    document.getElementById('main-canvas').style.display = 'none';
    document.getElementById('placeholder').style.display = 'block';
    document.getElementById('mode-badge').textContent = 'LISTO';
  },
};
