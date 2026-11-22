// Tiny WebAudio synth — no audio assets, everything is an oscillator.
// A soft blip on loot, a low two-note sting when spotted, a rising sweep on
// lockdown, a little arpeggio when a heist is cleared.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    loot() { tone(880, 0.12, 'sine', 0.12); tone(1318, 0.18, 'sine', 0.1, 0.07); },
    spotted() { tone(196, 0.16, 'sawtooth', 0.09); tone(147, 0.24, 'sawtooth', 0.09, 0.1); },
    lockdown() { tone(220, 0.5, 'sawtooth', 0.1, 0, 440); tone(330, 0.4, 'square', 0.06, 0.12, 660); },
    cleared() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.09));
    },
    caught() { tone(110, 0.5, 'sawtooth', 0.12, 0, 55); },
    click() { tone(660, 0.06, 'sine', 0.08); },
  };
}
