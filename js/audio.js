// Procedural audio - everything synthesised with WebAudio, no external assets.
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.started = false;
    this.engine = null;
    this.wind = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    // iOS: keep game audio audible even with the hardware mute switch on
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* not supported */ }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.55 : 0.0;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    this._buildEngine();
    this._buildWind();
    this.started = true;
  }

  _noiseBuffer(seconds = 2) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  _buildEngine() {
    const ctx = this.ctx;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'triangle';
    o1.frequency.value = 72;
    o2.frequency.value = 108;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    o1.start();
    o2.start();

    this.engine = { o1, o2, filter, gain };
  }

  _buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(3);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
    this.wind = { src, bp, g };
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(v ? 0.55 : 0, this.ctx.currentTime, 0.05);
    }
  }

  // continuous flight sound
  flight(speed01, boost01, active) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const e = this.engine;
    const w = this.wind;
    if (!e) return;
    const target = active ? 0.075 + speed01 * 0.05 + boost01 * 0.03 : 0.0;
    e.gain.gain.setTargetAtTime(target, t, 0.12);
    e.o1.frequency.setTargetAtTime(58 + speed01 * 62 + boost01 * 22, t, 0.16);
    e.o2.frequency.setTargetAtTime(92 + speed01 * 96 + boost01 * 30, t, 0.16);
    e.filter.frequency.setTargetAtTime(480 + speed01 * 900 + boost01 * 700, t, 0.16);
    w.g.gain.setTargetAtTime(active ? 0.018 + speed01 * 0.05 + boost01 * 0.045 : 0.0, t, 0.18);
    w.bp.frequency.setTargetAtTime(520 + speed01 * 900, t, 0.2);
  }

  _env(node, t0, a, d, peak) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  tone(freq, t0, dur, type = 'sine', peak = 0.12) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.connect(g);
    g.connect(this.master);
    this._env(g, t0, 0.012, dur, peak);
    o.start(t0);
    o.stop(t0 + dur + 0.06);
  }

  ring() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.tone(784, t0, 0.16, 'triangle', 0.1);
    this.tone(1175, t0 + 0.055, 0.2, 'triangle', 0.075);
    this.tone(1568, t0 + 0.11, 0.24, 'sine', 0.05);
  }

  deliver() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone(f, t0 + i * 0.085, 0.34, 'triangle', 0.11));
    this.tone(261.6, t0, 0.5, 'sine', 0.06);
  }

  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(1.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(320, t0);
    bp.frequency.exponentialRampToValueAtTime(1900, t0 + 0.35);
    bp.frequency.exponentialRampToValueAtTime(500, t0 + 0.8);
    const g = ctx.createGain();
    this._env(g, t0, 0.07, 0.7, 0.11);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + 0.9);
  }

  bump() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(140, t0);
    o.frequency.exponentialRampToValueAtTime(58, t0 + 0.18);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    this._env(g, t0, 0.01, 0.2, 0.14);
    o.start(t0);
    o.stop(t0 + 0.3);
  }

  ui() {
    if (!this.ctx) return;
    this.tone(660, this.ctx.currentTime, 0.09, 'sine', 0.07);
  }
}
