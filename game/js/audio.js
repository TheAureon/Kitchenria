// audio.js — cute sound effects made in code with the Web Audio API.
// No audio files are needed: each sound is a few tiny synthesised notes.

let ctx = null;
let master = null;
let muted = false;

/** Browsers only allow sound after the player touches the page, so we start lazily. */
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
window.addEventListener('pointerdown', ensure, { once: true, capture: true });
window.addEventListener('keydown', ensure, { once: true, capture: true });

export function setMuted(m) { muted = m; }

/** One soft note. type: sine/triangle, f0 → f1 pitch glide, dur in seconds. */
function tone({ f0, f1 = f0, dur = 0.15, type = 'sine', vol = 0.25, at = 0 }) {
  const c = ensure(); if (!c || muted) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

/** A soft puff of filtered noise (for "poof" and sizzle-y sounds). */
function puff({ dur = 0.2, freq = 1200, vol = 0.12, at = 0 }) {
  const c = ensure(); if (!c || muted) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const SOUNDS = {
  pick:    () => tone({ f0: 520, f1: 760, dur: 0.09, vol: 0.16 }),
  drop:    () => { tone({ f0: 240, f1: 150, dur: 0.12, type: 'triangle', vol: 0.22 }); puff({ dur: 0.08, freq: 600, vol: 0.05 }); },
  combine: () => { tone({ f0: 400, f1: 620, dur: 0.1, vol: 0.18 }); tone({ f0: 620, f1: 900, dur: 0.12, vol: 0.16, at: 0.08 }); puff({ dur: 0.18, freq: 2200, vol: 0.05 }); },
  discover: () => {
    // a happy little major arpeggio with a soft bell on top
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone({ f0: f, dur: 0.35, type: 'triangle', vol: 0.18, at: i * 0.09 });
      tone({ f0: f * 2, dur: 0.25, vol: 0.05, at: i * 0.09 });
    });
  },
  nope:    () => { tone({ f0: 330, f1: 300, dur: 0.12, type: 'triangle', vol: 0.14 }); tone({ f0: 262, f1: 240, dur: 0.16, type: 'triangle', vol: 0.14, at: 0.11 }); },
  poof:    () => puff({ dur: 0.22, freq: 900, vol: 0.12 }),
  click:   () => tone({ f0: 880, f1: 700, dur: 0.05, vol: 0.08 }),
};

export function play(name) {
  try { SOUNDS[name]?.(); } catch (e) { /* sound is never important enough to crash */ }
}
