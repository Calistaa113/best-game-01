// Every sound is synthesised with the Web Audio API — short oscillator blips and
// filtered noise, no audio files — so the game needs no network and no assets.
// The context is created lazily and resumed on the first gesture; if the browser
// refuses audio, every call below is a silent no-op.

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 1, delay = 0 }) {
    const ctx = ensure();
    if (!ctx || !master) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration = 0.2, volume = 1, lowpass = 1200 }) {
    const ctx = ensure();
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    /** Call from any user gesture so the browser unlocks audio. */
    unlock() {
      ensure();
    },
    shoot() {
      tone({ type: 'square', from: 720, to: 320, duration: 0.07, volume: 0.5 });
    },
    hit() {
      noise({ duration: 0.08, volume: 0.5, lowpass: 2400 });
    },
    explode() {
      noise({ duration: 0.28, volume: 0.9, lowpass: 900 });
      tone({ type: 'sine', from: 160, to: 40, duration: 0.25, volume: 0.8 });
    },
    hurt() {
      tone({ type: 'sawtooth', from: 220, to: 70, duration: 0.22, volume: 0.9 });
    },
    ember() {
      tone({ type: 'sine', from: 880, to: 1320, duration: 0.09, volume: 0.35 });
    },
    waveClear() {
      tone({ type: 'triangle', from: 523, duration: 0.12, volume: 0.7 });
      tone({ type: 'triangle', from: 659, duration: 0.12, volume: 0.7, delay: 0.1 });
      tone({ type: 'triangle', from: 784, duration: 0.2, volume: 0.7, delay: 0.2 });
    },
    upgrade() {
      tone({ type: 'triangle', from: 392, to: 784, duration: 0.16, volume: 0.7 });
    },
    gameOver() {
      tone({ type: 'triangle', from: 392, to: 196, duration: 0.5, volume: 0.7 });
      tone({ type: 'triangle', from: 311, to: 155, duration: 0.6, volume: 0.6, delay: 0.15 });
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, i) => tone({ type: 'triangle', from: frequency, duration: 0.22, volume: 0.7, delay: i * 0.12 }));
    },
  };
}
