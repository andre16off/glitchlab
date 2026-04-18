const State = {
  activeEffect: 'none',
  srcImg: null, srcVid: null, camStream: null,
  isVideo: false, isCam: false,
  quality: 0.5,
  zoom: 100,
  animFrame: null,
  time: 0, frameCount: 0, lastFPSTime: performance.now(),
  params: {},
  vorSites: null, vorW: 0, vorH: 0,
  matCols: [],
  activeLUT: null,   // Float32Array LUT table (256*256*256 * 3) or null
  lutName: 'none',
  td: { connected: false, lastFrame: null },

  getParam(id, key, def) {
    if (!this.params[id]) this.params[id] = {};
    const v = this.params[id][key];
    return v !== undefined ? v : def;
  },
  setParam(id, key, val) {
    if (!this.params[id]) this.params[id] = {};
    this.params[id][key] = val;
  },
  P(key, def) { return this.getParam(this.activeEffect, key, def); },
  getSource() { return this.isVideo || this.isCam ? this.srcVid : this.srcImg; },
  getSourceSize() {
    const s = this.getSource();
    if (!s) return { w: 0, h: 0 };
    return { w: s.naturalWidth||s.videoWidth||s.width||0, h: s.naturalHeight||s.videoHeight||s.height||0 };
  },
};
