/**
 * webgl-effects.js — GPU shader effects
 * Each entry: { id, fragSrc, uniforms(gl, prog, w, h) }
 */
const WGLFX = {

  // ── LIQUID GLASS ─────────────────────────────────────────────
  liquidGlass: {
    id: 'liquidglass_gl',
    fragSrc: `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_resolution;
uniform float u_time, u_scale, u_distortion, u_speed, u_chromatic, u_highlight;
out vec4 o;

vec2 hash2(vec2 p) {
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(
    mix(dot(hash2(i),          f),           dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
    u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p  = uv * u_scale * 0.015;
  float t = u_time * u_speed * 0.05;
  vec2 off = vec2(0.0);
  float amp = u_distortion;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), sc = pow(2.0, fi), ph = fi * 2.4;
    off.x += vnoise(p * sc + t * 0.7 + ph) * amp / sc * 0.5;
    off.y += vnoise(p * sc + t * 0.4 + ph + 5.0) * amp / sc * 0.5;
    amp *= 0.6;
  }
  off /= u_resolution;
  float ch = u_chromatic * 0.002;
  float r = texture(u_tex, uv + off + vec2( ch,  ch*0.6)).r;
  float g = texture(u_tex, uv + off).g;
  float b = texture(u_tex, uv + off - vec2( ch,  ch*0.6)).b;
  float wm = length(off) * u_resolution.x;
  float hl = max(0.0, 1.0 - wm / max(u_distortion, 0.001)) * u_highlight * 0.8;
  o = vec4(r + hl*0.015, g + hl*0.012, b + hl*0.018, 1.0);
}`,
    uniforms(gl, p, w, h) {
      const u = n => gl.getUniformLocation(p, n);
      gl.uniform1f(u('u_scale'),       State.P('scale', 60));
      gl.uniform1f(u('u_distortion'),  State.P('distortion', 22));
      gl.uniform1f(u('u_speed'),       State.P('speed', 6));
      gl.uniform1f(u('u_chromatic'),   State.P('chromatic', 6));
      gl.uniform1f(u('u_highlight'),   State.P('highlight', 50) / 100);
    }
  },

  // ── NOISE FIELD ──────────────────────────────────────────────
  noiseField: {
    id: 'noise_gl',
    fragSrc: `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_resolution;
uniform float u_time, u_scale, u_intensity;
uniform int   u_type;
out vec4 o;

vec2 hash2(vec2 p) {
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(
    mix(dot(hash2(i),          f),           dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
    u.y);
}
float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv  = gl_FragCoord.xy / u_resolution;
  vec4 col = texture(u_tex, uv);
  float n;
  if      (u_type == 0) n = vnoise(uv * u_scale * 0.1 + u_time * 0.3) * 0.5 + 0.5;
  else if (u_type == 1) n = rand(uv + u_time);
  else if (u_type == 2) n = mod(gl_FragCoord.y, 4.0) < 2.0 ? 0.8 : 1.2;
  else                  n = rand(uv + u_time) > 0.5 ? 1.0 : 0.0;
  o = vec4(col.rgb * (1.0 - u_intensity + u_intensity * n), 1.0);
}`,
    uniforms(gl, p, w, h) {
      const u = n => gl.getUniformLocation(p, n);
      gl.uniform1f(u('u_scale'),     State.P('scale', 50));
      gl.uniform1f(u('u_intensity'), State.P('intensity', 60) / 100);
      gl.uniform1i(u('u_type'),      State.P('type', 0));
    }
  },

  // ── CHROMATIC WARP ───────────────────────────────────────────
  chromaWarp: {
    id: 'chromwarp_gl',
    fragSrc: `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_resolution;
uniform float u_time, u_aberration, u_barrel, u_vignette, u_scanlines;
out vec4 o;

vec2 barrel(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  return 0.5 + c * (1.0 + k * dot(c, c));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float k  = u_barrel * 0.08;
  float ab = u_aberration * 0.003;
  vec2 uvR = barrel(uv, k + ab);
  vec2 uvG = barrel(uv, k);
  vec2 uvB = barrel(uv, k - ab);
  float r = texture(u_tex, uvR).r;
  float g = texture(u_tex, uvG).g;
  float b = texture(u_tex, uvB).b;
  vec4 col = vec4(r, g, b, 1.0);
  if (u_scanlines > 0.0)
    col.rgb *= mix(1.0, sin(gl_FragCoord.y * 3.14159) * 0.5 + 0.5, u_scanlines * 0.4);
  vec2 vc = uv - 0.5;
  col.rgb *= clamp(1.0 - dot(vc, vc) * u_vignette * 4.0, 0.0, 1.0);
  // Fade out-of-bounds pixels to black
  if (any(lessThan(uvG, vec2(0.0))) || any(greaterThan(uvG, vec2(1.0)))) col = vec4(0.0);
  o = col;
}`,
    uniforms(gl, p, w, h) {
      const u = n => gl.getUniformLocation(p, n);
      gl.uniform1f(u('u_aberration'), State.P('aberration', 8));
      gl.uniform1f(u('u_barrel'),     State.P('barrel', 3));
      gl.uniform1f(u('u_vignette'),   State.P('vignette', 50) / 100);
      gl.uniform1f(u('u_scanlines'),  State.P('scanlines', 1));
    }
  },

  // ── PARTICLE FIELD ───────────────────────────────────────────
  particles: {
    id: 'particles_gl',
    fragSrc: `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_resolution;
uniform float u_time, u_density, u_size, u_speed, u_glow;
out vec4 o;

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)))) * 43758.5453);
}

void main() {
  vec2 uv   = gl_FragCoord.xy / u_resolution;
  vec4 src  = texture(u_tex, uv);
  float grid = u_density;
  vec2 cell  = floor(uv * grid);
  vec2 h     = hash2(cell);
  vec2 pos   = (cell + 0.5 + sin(h * 6.2832 + u_time * u_speed * 0.5) * 0.3) / grid;
  vec4 pcol  = texture(u_tex, clamp(pos, 0.0, 1.0));
  float brightness = dot(pcol.rgb, vec3(0.299, 0.587, 0.114));
  float r    = u_size * 0.008 * (0.3 + brightness * 0.7);
  float d    = length(uv - pos) * max(u_resolution.x, u_resolution.y);
  float circle = 1.0 - smoothstep(r * 0.5, r, d / grid);
  float glow   = u_glow * exp(-d * grid * 6.0) * brightness;
  vec3 particle = pcol.rgb * circle + pcol.rgb * glow;
  o = vec4(src.rgb * 0.15 + particle, 1.0);
}`,
    uniforms(gl, p, w, h) {
      const u = n => gl.getUniformLocation(p, n);
      gl.uniform1f(u('u_density'), State.P('density', 30));
      gl.uniform1f(u('u_size'),    State.P('size', 60));
      gl.uniform1f(u('u_speed'),   State.P('speed', 4));
      gl.uniform1f(u('u_glow'),    State.P('glow', 80) / 100);
    }
  },

  // ── FEEDBACK / TRAILS ────────────────────────────────────────
  // Self-contained: manages its own ping-pong FBOs.
  // Never touches the default framebuffer mid-frame.
  feedback: {
    id: 'feedback_gl',
    _pp: null,

    _initPP(gl, w, h) {
      if (this._pp && this._pp.w === w && this._pp.h === h) return;
      // Clean up old FBOs if they exist
      if (this._pp) {
        [this._pp.a, this._pp.b].forEach(({ fb, tex }) => {
          gl.deleteFramebuffer(fb);
          gl.deleteTexture(tex);
        });
      }
      const make = () => {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // immediately unbind
        gl.bindTexture(gl.TEXTURE_2D, null);
        return { fb, tex };
      };
      this._pp = { a: make(), b: make(), w, h, frame: 0 };
    },

    fragSrc: `#version 300 es
precision highp float;
uniform sampler2D u_tex;   // current frame  (unit 0)
uniform sampler2D u_prev;  // previous trail (unit 1)
uniform vec2  u_resolution;
uniform float u_time, u_decay, u_zoom, u_rotate, u_displace;
out vec4 o;

vec2 hash2(vec2 p) {
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(
    mix(dot(hash2(i),          f),           dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
    u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c  = uv - 0.5;
  float a = u_rotate * 0.008;
  vec2 rot = vec2(cos(a)*c.x - sin(a)*c.y, sin(a)*c.x + cos(a)*c.y);
  vec2 puv = rot / (1.0 + u_zoom * 0.008) + 0.5;
  float nd = u_displace * 0.0015;
  vec2 dp = vec2(
    vnoise(puv * 3.0 + u_time * 0.3),
    vnoise(puv * 3.0 + u_time * 0.3 + 5.0)
  ) * nd;
  vec4 prev = texture(u_prev, clamp(puv + dp, 0.0, 1.0)) * u_decay;
  vec4 cur  = texture(u_tex, uv);
  o = clamp(prev + cur * 0.55, 0.0, 1.0);
}`,

    uniforms(gl, prog, w, h) {
      this._initPP(gl, w, h);
      const pp   = this._pp;
      const read = pp.frame % 2 === 0 ? pp.a : pp.b;   // read from this
      const write= pp.frame % 2 === 0 ? pp.b : pp.a;   // write to this

      // Set feedback transform uniforms
      const u = n => gl.getUniformLocation(prog, n);
      gl.uniform1f(u('u_decay'),    State.P('decay', 88) / 100);
      gl.uniform1f(u('u_zoom'),     State.P('zoom', 2));
      gl.uniform1f(u('u_rotate'),   State.P('rotate', 1));
      gl.uniform1f(u('u_displace'), State.P('displace', 30));

      // Bind previous trail to unit 1
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, read.tex);
      gl.uniform1i(u('u_prev'), 1);

      // After the draw (which happens in render() after uniforms()),
      // we need to blit the result into the write FBO.
      // We do this by scheduling a post-draw copy using a flag.
      this._pendingWrite = write;
      pp.frame++;
    },

    // Called by GLRenderer after drawArrays to copy result → write FBO
    postDraw(gl, w, h) {
      if (!this._pendingWrite) return;
      const write = this._pendingWrite;
      this._pendingWrite = null;

      // Blit default framebuffer → write FBO texture
      // We read from the just-drawn canvas pixels via a blit
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);       // read from screen
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, write.fb);   // write to texture
      gl.blitFramebuffer(
        0, 0, w, h,
        0, 0, w, h,
        gl.COLOR_BUFFER_BIT, gl.NEAREST
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); // always clean up
    }
  },
};
