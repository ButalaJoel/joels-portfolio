/**
 * All sound is synthesised with Web Audio — no audio files to download.
 * Engine buzz, horn ("pipi!"), impacts, and a goal jingle.
 */
export class WorldAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  engineGain: GainNode | null = null;
  osc1: OscillatorNode | null = null;
  osc2: OscillatorNode | null = null;
  filter: BiquadFilterNode | null = null;
  lfo: OscillatorNode | null = null;
  muted = false;
  private lastImpact = 0;
  private noiseBuffer: AudioBuffer | null = null;

  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(ctx.destination);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 900;
    this.filter.Q.value = 4;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.filter.connect(this.engineGain).connect(this.master);

    this.osc1 = ctx.createOscillator();
    this.osc1.type = "sawtooth";
    this.osc2 = ctx.createOscillator();
    this.osc2.type = "square";
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    this.osc1.connect(this.filter);
    this.osc2.connect(g2).connect(this.filter);

    // putt-putt wobble of a small single-cylinder engine
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 11;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.osc1.frequency);
    lfoGain.connect(this.osc2.frequency);

    this.osc1.start();
    this.osc2.start();
    this.lfo.start();

    const len = ctx.sampleRate * 0.4;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  suspend() {
    this.ctx?.suspend();
  }
  resume() {
    this.ctx?.resume();
  }

  /** speed in m/s, throttle 0..1 */
  updateEngine(speed: number, throttle: number, boost: boolean, airborne: boolean) {
    if (!this.ctx || !this.osc1 || !this.osc2 || !this.engineGain || !this.filter || !this.lfo) return;
    const t = this.ctx.currentTime;
    const s = Math.abs(speed);
    // gears: pitch climbs then drops a bit every ~7 m/s
    const gear = Math.floor(s / 7);
    const inGear = s - gear * 7;
    let f = 48 + inGear * 9 + gear * 14 + throttle * 18 + (boost ? 25 : 0);
    if (airborne) f += 30 * throttle;
    this.osc1.frequency.setTargetAtTime(f, t, 0.06);
    this.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
    this.lfo.frequency.setTargetAtTime(9 + f * 0.08, t, 0.1);
    this.filter.frequency.setTargetAtTime(500 + throttle * 900 + s * 25, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.045 + throttle * 0.05 + Math.min(s, 20) * 0.002, t, 0.1);
  }

  horn() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const play = (start: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.18, start + 0.01);
      g.gain.setValueAtTime(0.18, start + 0.13);
      g.gain.linearRampToValueAtTime(0, start + 0.16);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 900;
      f.Q.value = 1.2;
      g.connect(f).connect(this.master!);
      for (const hz of [420, 530]) {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = hz;
        o.connect(g);
        o.start(start);
        o.stop(start + 0.17);
      }
    };
    const t = ctx.currentTime;
    play(t);
    play(t + 0.2);
  }

  impact(strength: number) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const now = performance.now();
    if (now - this.lastImpact < 70) return;
    this.lastImpact = now;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 300 + Math.min(strength, 10) * 120;
    const g = ctx.createGain();
    const v = Math.min(0.5, 0.06 + strength * 0.04);
    g.gain.setValueAtTime(v, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 0.3);
  }

  chime(notes = [523, 659, 784, 1046]) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    notes.forEach((hz, i) => {
      const t = ctx.currentTime + i * 0.09;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.4);
    });
  }

  dispose() {
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
