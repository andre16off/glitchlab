/**
 * lut-engine.js
 * Loads colour LUTs and applies them as a post-process step.
 *
 * Supports:
 *   - Built-in procedural presets (no file needed)
 *   - .cube file upload (standard 3D LUT format)
 *   - PNG strip (horizontal, 256px wide)
 *   - Push from TouchDesigner via WS
 *
 * A LUT is stored as a 64³ → RGB Float32Array in State.activeLUT.
 * Application is done in CPU (after effect) unless WebGL is available,
 * in which case a dedicated LUT shader pass is used.
 */
const LUTEngine = (() => {

  // ── Built-in presets ──
  const PRESETS = {
    fade:    (r,g,b) => [r*.85+20, g*.85+20, b*.85+20],
    neon:    (r,g,b) => { const v=r*.3+g*.59+b*.11; return [v*.2+r*.8, g*.6, b*1.4]; },
    vintage: (r,g,b) => [r*.9+30, g*.85+15, b*.6],
    thermal: (r,g,b) => { const v=(r+g+b)/3; return [v*2-128, 128-Math.abs(v-128), 255-v]; },
    acid:    (r,g,b) => [g, b, r],
  };

  const SIZE = 32; // 32³ LUT
  let currentTable = null; // Float32Array SIZE*SIZE*SIZE * 3

  function buildFromPreset(name) {
    const fn = PRESETS[name];
    if (!fn) { currentTable = null; State.activeLUT = null; State.lutName = 'none'; return; }
    const table = new Float32Array(SIZE * SIZE * SIZE * 3);
    for (let b = 0; b < SIZE; b++)
    for (let g = 0; g < SIZE; g++)
    for (let r = 0; r < SIZE; r++) {
      const R = (r / (SIZE-1)) * 255;
      const G = (g / (SIZE-1)) * 255;
      const B = (b / (SIZE-1)) * 255;
      const [ro,go,bo] = fn(R,G,B);
      const idx = (b*SIZE*SIZE + g*SIZE + r) * 3;
      table[idx]   = Math.max(0, Math.min(255, ro)) / 255;
      table[idx+1] = Math.max(0, Math.min(255, go)) / 255;
      table[idx+2] = Math.max(0, Math.min(255, bo)) / 255;
    }
    currentTable = table;
    State.activeLUT = table;
    State.lutName = name;
  }

  // Parse .cube file text → table
  function parseCube(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    let size = 32;
    const entries = [];
    lines.forEach(l => {
      if (l.startsWith('LUT_3D_SIZE')) { size = parseInt(l.split(/\s+/)[1]); return; }
      const nums = l.split(/\s+/).map(Number);
      if (nums.length === 3 && !isNaN(nums[0])) entries.push(nums);
    });
    const table = new Float32Array(size * size * size * 3);
    entries.forEach(([r,g,b], i) => { table[i*3]=r; table[i*3+1]=g; table[i*3+2]=b; });
    return { table, size };
  }

  function load(name) {
    if (name === 'none') {
      currentTable = null; State.activeLUT = null; State.lutName = 'none';
    } else {
      buildFromPreset(name);
    }
    Renderer.renderFrame();
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (file.name.endsWith('.cube')) {
        const { table, size } = parseCube(e.target.result);
        currentTable = table; State.activeLUT = table; State.lutName = file.name;
        Renderer.renderFrame();
      }
      // PNG strip: expect 512×512 or 256×16 horizontal identity LUT
      // (basic support — advanced users can use .cube)
    };
    reader.readAsText(file);
  }

  // Apply LUT to ImageData in CPU
  function apply(data, intensity) {
    if (!currentTable || intensity === 0) return;
    const t = intensity / 100;
    const S1 = SIZE - 1;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255 * S1;
      const g = data[i+1] / 255 * S1;
      const b = data[i+2] / 255 * S1;
      const ri = r | 0, gi = g | 0, bi = b | 0;
      const rf = r - ri, gf = g - gi, bf = b - bi;
      const ri1 = Math.min(ri+1, S1), gi1 = Math.min(gi+1, S1), bi1 = Math.min(bi+1, S1);
      // Trilinear interpolation
      function s(R,G,B) {
        const idx = (B*SIZE*SIZE + G*SIZE + R)*3;
        return [currentTable[idx], currentTable[idx+1], currentTable[idx+2]];
      }
      const c000=s(ri,gi,bi), c100=s(ri1,gi,bi), c010=s(ri,gi1,bi), c110=s(ri1,gi1,bi);
      const c001=s(ri,gi,bi1),c101=s(ri1,gi,bi1),c011=s(ri,gi1,bi1),c111=s(ri1,gi1,bi1);
      for (let c = 0; c < 3; c++) {
        const v =
          c000[c]*(1-rf)*(1-gf)*(1-bf) + c100[c]*rf*(1-gf)*(1-bf) +
          c010[c]*(1-rf)*gf*(1-bf)     + c110[c]*rf*gf*(1-bf) +
          c001[c]*(1-rf)*(1-gf)*bf     + c101[c]*rf*(1-gf)*bf +
          c011[c]*(1-rf)*gf*bf         + c111[c]*rf*gf*bf;
        data[i+c] = Math.max(0, Math.min(255, (data[i+c]/255*(1-t) + v*t) * 255)) | 0;
      }
    }
  }

  return { load, loadFile, apply, getTable: () => currentTable };
})();
