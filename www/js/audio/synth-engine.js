/**
 * @fileoverview Motor de síntesis polifónica Web Audio API (timbres realistas de Guitarra y Piano).
 */
'use strict';

window.FM = window.FM || {};

(function initAudioEngine(FM) {
  const { midiToFreq } = FM.theory;

  class SynthEngine {
    constructor() {
      this.ctx = null;
      this.timerIds = [];
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.ctx = new AudioContextClass();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    clearScheduled() {
      while (this.timerIds.length > 0) {
        clearTimeout(this.timerIds.pop());
      }
    }

    schedule(fn, delayMs) {
      const id = setTimeout(fn, delayMs);
      this.timerIds.push(id);
      return id;
    }

    playNote(midi, { instrument = 'guitar', volume = 0.75, muted = false, durationSec = 1.45 } = {}) {
      if (muted) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freq = midiToFreq(midi);
      const masterGain = ctx.createGain();
      const peakGain = Math.max(0.02, volume * 0.28);

      if (instrument === 'piano') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'triangle'; osc1.frequency.setValueAtTime(freq, now);
        osc2.type = 'sine';     osc2.frequency.setValueAtTime(freq * 2, now);
        osc3.type = 'sine';     osc3.frequency.setValueAtTime(freq * 3, now);

        const g1 = ctx.createGain(); g1.gain.value = 0.72;
        const g2 = ctx.createGain(); g2.gain.value = 0.22;
        const g3 = ctx.createGain(); g3.gain.value = 0.06;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(5500, freq * 7), now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.8), now + durationSec);

        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.linearRampToValueAtTime(peakGain, now + 0.012);
        masterGain.gain.exponentialRampToValueAtTime(peakGain * 0.42, now + 0.22);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        osc1.connect(g1); osc2.connect(g2); osc3.connect(g3);
        g1.connect(filter); g2.connect(filter); g3.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc1.start(now); osc2.start(now); osc3.start(now);
        osc1.stop(now + durationSec + 0.05);
        osc2.stop(now + durationSec + 0.05);
        osc3.stop(now + durationSec + 0.05);
      } else {
        const oscBody = ctx.createOscillator();
        const oscWarm = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        oscBody.type = 'sawtooth'; oscBody.frequency.setValueAtTime(freq, now);
        oscWarm.type = 'triangle'; oscWarm.frequency.setValueAtTime(freq, now);
        oscWarm.detune.setValueAtTime(2.5, now);

        const gBody = ctx.createGain(); gBody.gain.value = 0.55;
        const gWarm = ctx.createGain(); gWarm.gain.value = 0.55;

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(2.2, now);
        filter.frequency.setValueAtTime(Math.min(6200, freq * 8.5), now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 1.6), now + durationSec * 0.85);

        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
        masterGain.gain.exponentialRampToValueAtTime(peakGain * 0.38, now + 0.18);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        oscBody.connect(gBody); oscWarm.connect(gWarm);
        gBody.connect(filter);  gWarm.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        oscBody.start(now); oscWarm.start(now);
        oscBody.stop(now + durationSec + 0.05);
        oscWarm.stop(now + durationSec + 0.05);
      }
    }
  }

  FM.audio = new SynthEngine();
})(window.FM);
