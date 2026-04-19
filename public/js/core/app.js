/**
 * app.js — Main controller. Boots everything.
 */
const App = (() => {

  function selectEffect(id) {
    Renderer.stopLoop();
    State.activeEffect = id;
    UI.setActive(id);
    if (id === 'matrix') State.matCols = [];
    if (id === 'voronoi') State.vorSites = null;
    const eff = Effects.registry[id];
    const hasMedia = State.srcImg || State.srcVid;
    if (hasMedia) {
      if (eff?.anim || State.isCam || State.isVideo) Renderer.startLoop();
      else Renderer.renderFrame();
    }
  }

  function setQ(q) {
    State.quality = q; State.vorSites = null;
    ['low','mid','hi'].forEach(k => document.getElementById('q-'+k).classList.remove('on'));
    document.getElementById(q===.25?'q-low':q===.5?'q-mid':'q-hi').classList.add('on');
    Renderer.renderFrame();
  }

  function zoom(d) {
    const cv = document.getElementById('main-canvas');
    State.zoom = Math.max(25, Math.min(400, State.zoom + d));
    document.getElementById('zoom-label').textContent = State.zoom + '%';
    cv.style.transform = `scale(${State.zoom/100})`;
    cv.style.transformOrigin = 'center';
  }

  function resetZoom() {
    const cv = document.getElementById('main-canvas');
    State.zoom = 100;
    cv.style.transform = '';
    document.getElementById('zoom-label').textContent = '100%';
  }

  function loadFile(file) {
    Renderer.stopLoop(); stopCam();
    if (file.type.startsWith('video/')) {
      const v = document.createElement('video');
      v.src = URL.createObjectURL(file);
      v.loop = v.muted = v.playsInline = true;
      v.onloadeddata = () => {
        v.play(); State.srcVid=v; State.srcImg=null; State.isVideo=true; State.isCam=false;
        UI.showCanvas(); Renderer.startLoop();
      };
    } else {
      const img = new Image();
      img.onload = () => {
        State.srcImg=img; State.srcVid=null; State.isVideo=false; State.isCam=false; State.vorSites=null;
        UI.showCanvas();
        const eff = Effects.registry[State.activeEffect];
        if (eff?.anim) Renderer.startLoop(); else Renderer.renderFrame();
      };
      img.src = URL.createObjectURL(file);
    }
  }

  async function toggleWebcam() {
    if (State.isCam) { stopCam(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{width:{ideal:1280},height:{ideal:720}} });
      Renderer.stopLoop();
      const v = document.createElement('video');
      v.srcObject=stream; v.autoplay=v.playsInline=v.muted=true;
      v.onloadedmetadata = () => {
        v.play(); State.srcVid=v; State.srcImg=null; State.isVideo=false; State.isCam=true; State.camStream=stream;
        const btn=document.getElementById('cam-btn');btn.textContent='⊗ Cam';btn.classList.add('on');
        UI.showCanvas(); Renderer.startLoop();
      };
    } catch(e) { alert('Webcam no disponible: '+e.message); }
  }

  function stopCam() {
    if (State.camStream) { State.camStream.getTracks().forEach(t=>t.stop()); State.camStream=null; }
    State.isCam=false;
    const btn=document.getElementById('cam-btn');btn.textContent='⊙ Cam';btn.classList.remove('on');
    if (!State.srcImg && !State.srcVid) { Renderer.stopLoop(); UI.hideCanvas(); }
  }

  function exportImage() { Renderer.exportPNG(); }

  function bindEvents() {
    document.getElementById('file-input').addEventListener('change', e => { if(e.target.files[0])loadFile(e.target.files[0]); });
    const dz=document.getElementById('drop-zone');
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);});
    document.addEventListener('paste',e=>{const it=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'));if(it)loadFile(it.getAsFile());});
    document.addEventListener('keydown',e=>{
      if(e.key==='1')setQ(.25);
      if(e.key==='2')setQ(.5);
      if(e.key==='3')setQ(1);
      if(e.key==='Escape')stopCam();
    });
  }

  function init() {
    UI.build();
    bindEvents();
    if (!GLRenderer.isOk()) {
      console.warn('[App] WebGL2 unavailable — GPU effects disabled');
      document.querySelectorAll('.ebadge.gpu').forEach(el => el.style.opacity='.25');
    }
    console.log('%cGLITCHLAB v3.0', 'color:#d4f542;font-weight:bold;font-size:16px');
    console.log('http://localhost:3000  |  ws://localhost:3000');
    console.log('TD → Node WS hub (role:"td") → Browser');
  }

  init();
  return { selectEffect, setQ, zoom, resetZoom, loadFile, toggleWebcam, exportImage };
})();

// ── Mobile menu ──────────────────────────────────────────────
const MobileMenu = (() => {
  const sidebar  = document.getElementById('sidebar');
  const settings = document.getElementById('settings-panel');
  const overlay  = document.getElementById('mobile-overlay');

  function openSidebar() {
    sidebar.classList.add('open');
    settings.classList.remove('open');
    overlay.classList.add('active');
  }
  function openSettings() {
    settings.classList.add('open');
    sidebar.classList.remove('open');
    overlay.classList.add('active');
  }
  function close() {
    sidebar.classList.remove('open');
    settings.classList.remove('open');
    overlay.classList.remove('active');
  }
  function toggle() {
    if (sidebar.classList.contains('open') || settings.classList.contains('open')) {
      close();
    } else {
      openSidebar();
    }
  }

  // Close panels when an effect is selected on mobile
  document.addEventListener('click', e => {
    if (e.target.closest('.effect-item') && window.innerWidth <= 768) {
      setTimeout(close, 150);
    }
  });

  return { toggle, openSidebar, openSettings, close };
})();
