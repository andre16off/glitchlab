/**
 * renderer.js — core pipeline (v3 fixed)
 */
const Renderer = (() => {

  const display  = document.getElementById('main-canvas');
  const displayX = display.getContext('2d');
  const off   = document.createElement('canvas');
  const offX  = off.getContext('2d');
  const proc  = document.createElement('canvas');
  const procX = proc.getContext('2d');

  function makeTempCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }

  function applyAdjustments(data) {
    const br = +document.getElementById('brightness').value / 100;
    const co = +document.getElementById('contrast').value   / 100;
    const sa = +document.getElementById('saturation').value / 100;
    if (!br && !co && sa === 1) return;
    const cF  = (259 * (co * 255 + 255)) / (255 * (259 - co * 255));
    const brA = br * 255;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i+1], b = data[i+2];
      if (co) { r = cF*(r-128)+128; g = cF*(g-128)+128; b = cF*(b-128)+128; }
      if (br) { r += brA; g += brA; b += brA; }
      if (sa !== 1) {
        const gr = .299*r + .587*g + .114*b;
        r = gr+sa*(r-gr); g = gr+sa*(g-gr); b = gr+sa*(b-gr);
      }
      data[i]=cl(r); data[i+1]=cl(g); data[i+2]=cl(b);
    }
  }

  function updateFPS() {
    State.frameCount++;
    const now = performance.now();
    if (now - State.lastFPSTime > 500) {
      const fps = (State.frameCount * 1000 / (now - State.lastFPSTime)) | 0;
      document.getElementById('fps-counter').textContent = fps + ' fps';
      State.frameCount = 0; State.lastFPSTime = now;
    }
  }

  function applyLUT(data) {
    if (!State.activeLUT) return;
    const intensity = +document.getElementById('lut-intensity').value;
    if (intensity > 0) LUTEngine.apply(data, intensity);
  }

  function renderFrame() {
    const src = State.getSource();
    if (!src) return;
    updateFPS();
    State.time += 0.016;

    const { w: sw, h: sh } = State.getSourceSize();
    if (!sw || !sh) return;

    off.width = sw; off.height = sh;
    offX.drawImage(src, 0, 0);

    const pw = Math.round(sw * State.quality);
    const ph = Math.round(sh * State.quality);
    proc.width = pw; proc.height = ph;
    procX.drawImage(off, 0, 0, pw, ph);

    const imageData = procX.getImageData(0, 0, pw, ph);
    applyAdjustments(imageData.data);

    const eff = Effects.registry[State.activeEffect];

    if (eff && eff.type === 'webgl') {
      // ── GPU path ──
      GLRenderer.render(eff, imageData, pw, ph);

      // Some effects (Feedback) need a post-draw step (FBO blit)
      if (eff.postDraw) eff.postDraw(GLRenderer.gl(), pw, ph);

      display.width = sw; display.height = sh;
      displayX.imageSmoothingEnabled = State.quality < 1;
      displayX.drawImage(GLRenderer.getCanvas(), 0, 0, sw, sh);

      if (State.activeLUT) {
        const pixels = displayX.getImageData(0, 0, sw, sh);
        applyLUT(pixels.data);
        displayX.putImageData(pixels, 0, 0);
      }

    } else if (eff && eff.type === 'td') {
      // ── TD path ──
      const result = TDBridge.applyEffect(eff, imageData, pw, ph);
      applyLUT(result.data);
      procX.putImageData(result, 0, 0);
      display.width = sw; display.height = sh;
      displayX.imageSmoothingEnabled = State.quality < 1;
      displayX.drawImage(proc, 0, 0, sw, sh);

    } else {
      // ── CPU path ──
      const result = eff ? eff.fn(imageData, pw, ph) : imageData;
      applyLUT(result.data);
      procX.putImageData(result, 0, 0);
      display.width = sw; display.height = sh;
      const noSmooth = ['ascii','dither','dots'].includes(State.activeEffect);
      displayX.imageSmoothingEnabled = State.quality < 1 && !noSmooth;
      displayX.drawImage(proc, 0, 0, sw, sh);
    }

    document.getElementById('res-label').textContent = `${sw}×${sh}`;
  }

  function startLoop() {
    if (State.animFrame) return;
    const tick = () => { renderFrame(); State.animFrame = requestAnimationFrame(tick); };
    tick();
  }

  function stopLoop() {
    if (State.animFrame) { cancelAnimationFrame(State.animFrame); State.animFrame = null; }
  }

  function exportPNG() {
    const src = State.getSource();
    if (!src) return;
    const { w: sw, h: sh } = State.getSourceSize();
    const [ec, eX] = makeTempCanvas(sw, sh);
    eX.drawImage(src, 0, 0);
    const imageData = eX.getImageData(0, 0, sw, sh);
    applyAdjustments(imageData.data);
    const eff = Effects.registry[State.activeEffect];

    if (eff && eff.type === 'webgl') {
      const oldQ = State.quality; State.quality = 1;
      GLRenderer.render(eff, imageData, sw, sh);
      State.quality = oldQ;
      const gl = GLRenderer.gl();
      const pixels = new Uint8ClampedArray(sw * sh * 4);
      gl.readPixels(0, 0, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      // readPixels is bottom-up — flip vertically
      const flipped = new Uint8ClampedArray(sw * sh * 4);
      for (let y = 0; y < sh; y++) {
        const s = (sh - 1 - y) * sw * 4;
        flipped.set(pixels.subarray(s, s + sw * 4), y * sw * 4);
      }
      applyLUT(flipped);
      eX.putImageData(new ImageData(flipped, sw, sh), 0, 0);
    } else {
      const oldQ = State.quality; State.quality = 1;
      const result = eff ? eff.fn(imageData, sw, sh) : imageData;
      State.quality = oldQ;
      applyLUT(result.data);
      eX.putImageData(result, 0, 0);
    }

    const a = document.createElement('a');
    a.download = `glitchlab_${State.activeEffect}_${Date.now()}.png`;
    a.href = ec.toDataURL('image/png');
    a.click();
  }

  return { renderFrame, startLoop, stopLoop, exportPNG, makeTempCanvas };
})();

function cl(v)        { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
function lum(r, g, b) { return (r * 77 + g * 150 + b * 29) >> 8; }
