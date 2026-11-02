// music.js — Kitchenria's background music, composed and played live in code.
//
// It's an original, gentle lo-fi kitchen tune: soft electric-piano chords on a warm
// jazzy chord progression, a round bass, a light shaker, and a little music-box melody
// that improvises over the chords, so it never repeats exactly. Everything is made with
// the Web Audio API: there are no audio files, so it works offline and there's no
// licence to worry about (the music is part of the game).
//
// Form: sections of 8 bars, in the order A A B A, then round again with new melodies.

import { audioParts } from './audio.js';

const BPM = 72;
const BEAT = 60 / BPM;           // seconds per beat
const STEP = BEAT / 2;           // we schedule in eighth notes
const STEPS_PER_BAR = 8;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// chords as MIDI notes (a soft, close voicing) plus the bass root
const CH = {
  Fmaj7: { v: [53, 57, 60, 64], b: 41 }, Em7: { v: [52, 55, 59, 62], b: 40 }, Dm7: { v: [50, 53, 57, 60], b: 38 },
  Cmaj7: { v: [48, 52, 55, 59], b: 36 }, G7sus: { v: [55, 60, 62, 65], b: 43 }, Am7: { v: [57, 60, 64, 67], b: 45 },
  G6: { v: [55, 59, 62, 64], b: 43 }, Gsus: { v: [55, 60, 62, 67], b: 43 }, Fadd9: { v: [53, 57, 60, 67], b: 41 },
};
const SECTIONS = {
  A: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', 'G7sus'],
  B: ['Am7', 'Fadd9', 'Cmaj7', 'G6', 'Am7', 'Dm7', 'Fmaj7', 'Gsus'],
};
const FORM = ['A', 'A', 'B', 'A'];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88]; // C major pentatonic, around the music box's sweet spot
// little rhythm patterns for the melody (eighth-note steps within a bar, null = rest bar)
const RHYTHMS = [[0, 3, 4], [0, 2, 5], [1, 4, 6], [0, 6], [2, 3, 4, 7], [0, 4], null, [0, 3, 6]];

let parts = null;          // { ctx, musicBus }
let out = null, epBus = null, verb = null, echo = null, noiseBuf = null;
let playing = false, timer = null, nextTime = 0, step = 0, round = 0;
let rng = Math.random;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Builds the little studio: a gentle compressor, a cosy room echo and a soft delay. */
function build() {
  const { ctx, musicBus } = parts;
  out = ctx.createGain();
  out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
  out.connect(comp).connect(musicBus);

  // a room echo made from a burst of fading noise
  verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.28;
  verb.connect(wet).connect(out);

  // a soft dotted-eighth echo for the music box
  echo = ctx.createDelay(1);
  echo.delayTime.value = STEP * 1.5;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const echoTone = ctx.createBiquadFilter(); echoTone.type = 'lowpass'; echoTone.frequency.value = 2400;
  echo.connect(echoTone).connect(fb).connect(echo);
  const echoOut = ctx.createGain(); echoOut.gain.value = 0.35;
  echoTone.connect(echoOut).connect(out);
  echoOut.connect(verb);

  // the electric piano gets a warm filter and a slow wobble (tremolo)
  epBus = ctx.createGain();
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 1700; warm.Q.value = 0.4;
  const trem = ctx.createGain(); trem.gain.value = 0.85;
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.value = 4.2; depth.gain.value = 0.15;
  lfo.connect(depth).connect(trem.gain); lfo.start();
  epBus.connect(warm).connect(trem).connect(out);
  trem.connect(verb);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}

// ---------- instruments ----------
function epNote(n, t, dur, vol) {
  const { ctx } = parts;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.025);
  g.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [type, detune, mul, lvl] of [['sine', 0, 1, 1], ['triangle', 4, 1, 0.35], ['sine', -3, 2, 0.12]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = type; o.frequency.value = midi(n) * mul; o.detune.value = detune; og.gain.value = lvl;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + dur + 0.05);
  }
  g.connect(epBus);
}

function bassNote(n, t, dur, vol = 0.22) {
  const { ctx } = parts;
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sine'; o.frequency.value = midi(n);
  o2.type = 'triangle'; o2.frequency.value = midi(n + 12);
  const g2 = ctx.createGain(); g2.gain.value = 0.12;
  f.type = 'lowpass'; f.frequency.value = 420;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o2.connect(g2).connect(g);
  g.connect(f).connect(out);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

function musicBox(n, t, vol = 0.07) {
  const { ctx } = parts;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  for (const [mul, lvl] of [[1, 1], [3, 0.12], [4.2, 0.05]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine'; o.frequency.value = midi(n) * mul; og.gain.value = lvl;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + 1.5);
  }
  g.connect(out); g.connect(echo); g.connect(verb);
}

function shaker(t, vol) {
  const { ctx } = parts;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, 0.12);
}

// ---------- the composer ----------
let melodyNote = 79;
function chordAt(bar) {
  const section = FORM[Math.floor(bar / 8) % FORM.length];
  return CH[SECTIONS[section][bar % 8]];
}

/** Plays one eighth-note step of the song at time t. */
function playStep(s, t) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const pos = s % STEPS_PER_BAR;
  const chord = chordAt(bar);
  const swing = pos % 2 ? STEP * 0.16 : 0; // a lazy, swung feel
  if (bar % 32 === 0 && pos === 0) { round++; rng = seeded(round * 7919 + 17); }

  if (pos === 0) {
    chord.v.forEach((n, i) => epNote(n, t + i * 0.018, BEAT * 3.6, 0.05)); // a soft rolled chord
    bassNote(chord.b, t, BEAT * 1.8);
  }
  if (pos === 4) bassNote(rng() < 0.6 ? chord.b + 7 : chord.b, t, BEAT * 1.4, 0.17);
  if (pos === 5 && rng() < 0.45) chord.v.slice(2).forEach((n, i) => epNote(n, t + swing + i * 0.015, BEAT * 1.5, 0.028));
  if (pos % 2 === 1) shaker(t + swing, 0.012 + rng() * 0.006);

  // the music box improvises: chord tones on strong beats, pentatonic steps in between
  const pattern = RHYTHMS[(bar * 3 + round * 5) % RHYTHMS.length];
  const quietBar = bar % 8 === 7 || (Math.floor(bar / 8) % FORM.length === 0 && round % 2 === 1 && bar % 2 === 1);
  if (pattern && !quietBar && pattern.includes(pos)) {
    if (pos === 0 || rng() < 0.3) {
      const tones = chord.v.map((n) => n + 24).filter((n) => n >= 72 && n <= 88);
      if (tones.length) melodyNote = tones.reduce((a, b) => (Math.abs(b - melodyNote) < Math.abs(a - melodyNote) ? b : a));
    } else {
      const i = Math.max(0, PENTA.findIndex((p) => p >= melodyNote));
      const move = rng() < 0.5 ? -1 : 1;
      melodyNote = PENTA[Math.min(PENTA.length - 1, Math.max(0, i + move + (rng() < 0.2 ? move : 0)))];
    }
    musicBox(melodyNote, t + swing, 0.055 + rng() * 0.025);
  }
}

function scheduler() {
  const { ctx } = parts;
  while (nextTime < ctx.currentTime + 0.35) {
    playStep(step, nextTime);
    step++;
    nextTime += STEP;
  }
  timer = setTimeout(scheduler, 60);
}

// ---------- start & stop ----------
/** Starts the music with a gentle fade-in. Needs a click or key press first (browser rule). */
export function startMusic() {
  if (playing) return true;
  parts = parts || audioParts();
  if (!parts) return false;
  if (!out) build();
  const { ctx } = parts;
  playing = true;
  nextTime = ctx.currentTime + 0.15;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  scheduler();
  return true;
}

/** Fades the music out and stops. */
export function stopMusic() {
  if (!playing) return;
  playing = false;
  clearTimeout(timer);
  const { ctx } = parts;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
}

export const isMusicPlaying = () => playing;

// be polite: pause while the game is in a hidden tab, carry on when it comes back
let pausedByTab = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) { stopMusic(); pausedByTab = true; }
  else if (!document.hidden && pausedByTab) { pausedByTab = false; startMusic(); }
});

/**
 * Renders the music into an audio buffer without playing it (used by the automatic test,
 * and to make preview recordings). Not used during the game.
 */
export async function renderMusic(seconds = 30, sampleRate = 44100) {
  const saved = { parts, out, epBus, verb, echo, noiseBuf, step, nextTime, round, rng, melodyNote };
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = offline.createGain(); bus.gain.value = 0.5; bus.connect(offline.destination);
  parts = { ctx: offline, musicBus: bus };
  out = null; build();
  out.gain.value = 1;
  step = 0; round = 0; rng = seeded(1);
  for (let t = 0.05; t < seconds; t += STEP) playStep(step++, t);
  const buffer = await offline.startRendering();
  ({ parts, out, epBus, verb, echo, noiseBuf, step, nextTime, round, rng, melodyNote } = saved);
  return buffer;
}
