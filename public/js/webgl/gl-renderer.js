/**
 * gl-renderer.js — WebGL2 engine (v3 — feedback loop fix)
 *
 * Root cause of GL_INVALID_OPERATION feedback loop:
 *   The Feedback effect binds its ping-pong FBO, then the main render()
 *   call uploads the source texture while that FBO is still bound.
 *   WebGL detects read+write on the same texture and refuses to draw.
 *
 * Fix: always unbind the FBO (bind null) before the standard draw path.
 *      The Feedback effect manages its own FBO entirely inside its render fn.
 */
const GLRenderer = (() => {

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: true,
    antialias: false,
  });
  const ok = !!gl;

  if (ok) {
    document.getElementById('gpu-badge').textContent = 'WEBGL2';
    document.getElementById('gpu-badge').classList.add('active');
  } else {
    console.warn('[GLRenderer] WebGL2 not available.');
  }

  const QUAD = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);

  // Per-effect cache: id → { prog, vao }
  const cache = {};

  // Shared source texture (unit 0)
  let srcTex = null;

  // ── Vertex shader ─────────────────────────────────────────
  const VERT = `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
     
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // ── Compile + link ────────────────────────────────────────
  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[GL] Shader compile error:\n', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function getEntry(eff) {
    if (eff.id in cache) return cache[eff.id];

    const vert = compileShader(VERT, gl.VERTEX_SHADER);
    const frag = compileShader(eff.fragSrc, gl.FRAGMENT_SHADER);
    if (!vert || !frag) { cache[eff.id] = null; return null; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[GL] Link error:', gl.getProgramInfoLog(prog));
      cache[eff.id] = null;
      return null;
    }

    // VAO per program — survives canvas resizes
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    cache[eff.id] = { prog, vao };
    return cache[eff.id];
  }

  // ── Upload ImageData → TEXTURE0 ───────────────────────────
  function uploadSourceTexture(imageData, w, h) {
    if (!srcTex) srcTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Must pass Uint8ClampedArray with explicit w/h (ImageData object alone doesn't work)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      w, h, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      imageData.data
    );
    return srcTex;
  }

  // ── Main render ───────────────────────────────────────────
  function render(eff, imageData, pw, ph) {
    if (!ok) return;

    canvas.width  = pw;
    canvas.height = ph;

    // ★ KEY FIX: always unbind any FBO before the standard draw.
    //   The Feedback effect leaves its FBO bound after writing the previous
    //   frame. If we draw into the default framebuffer while that texture
    //   is also the active sampler → feedback loop → GL_INVALID_OPERATION.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pw, ph);

    const entry = getEntry(eff);
    if (!entry) return;

    const { prog, vao } = entry;
    gl.useProgram(prog);
    gl.bindVertexArray(vao);

    // Upload source and bind to unit 0
    uploadSourceTexture(imageData, pw, ph);
    const u = n => gl.getUniformLocation(prog, n);
    gl.uniform1i(u('u_tex'), 0);

    // Standard uniforms available to every shader
    gl.uniform2f(u('u_resolution'), pw, ph);
    gl.uniform1f(u('u_time'),       State.time);
    gl.uniform1f(u('u_quality'),    State.quality);

    // Effect-specific uniforms (may bind additional textures on units 1+)
    if (eff.uniforms) eff.uniforms(gl, prog, pw, ph);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  return {
    render,
    getCanvas:  () => canvas,
    isOk:       () => ok,
    gl:         () => gl,
    getSrcTex:  () => srcTex,   // exposed for Feedback ping-pong blit
  };
})();
