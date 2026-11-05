// music.js — Kitchenria's background music, composed and played live in code.
//
// The songs themselves are in tracks.js. This file is the "studio": the instruments
// (electric piano, bass, music box, ukulele, flute, kalimba, vibraphone, accordion, pad,
// shaker, woodblock, brushes, rain…), a cosy room echo, the clock that plays each note
// at the right moment, and the playlist that moves from song to song with a soft crossfade.
// Everything is made with the Web Audio API: there are no audio files, so it works offline
// and there's no licence to worry about (the music is part of the game).

import { audioParts } from './audio.js';
import { TRACKS } from './tracks.js';

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const SONG_MINUTES = 2.6;         // about how long each song plays before the next one

let parts = null;                 // { ctx, musicBus }
let studio = null;                // shared effects, built once per audio context
let trackOut = null;              // the current song's own volume (for crossfades)
let song = null;                  // the song playing now, with its own little memory
let playing = false, timer = null, nextTime = 0, switching = false;
let stayOnTrack = false;
const listeners = new Set();

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- the studio: compressor, room echo, soft delay, noise ----------
function buildStudio(ctx, musicBus) {
  const s = {};
  s.main = ctx.createGain(); s.main.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
  s.main.connect(comp).connect(musicBus);

  s.verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  s.verb.buffer = ir;
  s.wet = ctx.createGain(); s.wet.gain.value = 0.28;
  s.verb.connect(s.wet).connect(s.main);

  s.echo = ctx.createDelay(2);
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400;
  s.echo.connect(tone).connect(fb).connect(s.echo);
  const echoOut = ctx.createGain(); echoOut.gain.value = 0.35;
  tone.connect(echoOut).connect(s.main);
  echoOut.connect(s.verb);

  s.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = s.noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return s;
}

/** A fresh output for one song: dry sound goes to the mix, and a share goes into the room echo. */
function newTrackOut(ctx, track) {
  const o = ctx.createGain(); o.gain.value = 0;
  o.connect(studio.main);
  const send = ctx.createGain(); send.gain.value = track.wet ?? 0.6;
  o.connect(send).connect(studio.verb);
  studio.echo.delayTime.setValueAtTime((60 / track.bpm) * (track.echoBeats ?? 0.75), ctx.currentTime);
  return o;
}

// ---------- instruments ----------
// Each takes MIDI note numbers, a start time, and plays into the current song's output.
function makeInstruments(ctx, out) {
  const osc = (type, f, t, stop, dest, lvl = 1, detune = 0) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune; g.gain.value = lvl;
    o.connect(g).connect(dest); o.start(t); o.stop(stop);
    return o;
  };
  const env = (t, a, peak, d, sustain, rel, dest) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sustain), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
    g.connect(dest);
    return g;
  };
  const filt = (type, f, dest, q = 0.5) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; };
  const noiseHit = (t, vol, type, f, dur, q = 0.8, dest = out) => {
    const src = ctx.createBufferSource(); src.buffer = studio.noise;
    const g = env(t, 0.005, vol, dur * 0.4, 0.3, dur, dest);
    src.connect(filt(type, f, g, q));
    src.start(t, Math.random() * 1.5, dur + 0.05);
  };

  return {
    /** soft electric piano (a sine with a little shimmer), for chords */
    ep(n, t, dur, vol) {
      const g = env(t, 0.025, vol, 0.6, 0.45, dur, filt('lowpass', 1700, out, 0.4));
      osc('sine', midi(n), t, t + dur + 0.05, g, 1);
      osc('triangle', midi(n), t, t + dur + 0.05, g, 0.35, 4);
      osc('sine', midi(n) * 2, t, t + dur + 0.05, g, 0.12, -3);
    },
    /** round sine bass */
    bass(n, t, dur, vol = 0.22) {
      const g = env(t, 0.03, vol, dur * 0.6, 0.5, dur, filt('lowpass', 420, out));
      osc('sine', midi(n), t, t + dur + 0.05, g, 1);
      osc('triangle', midi(n + 12), t, t + dur + 0.05, g, 0.12);
    },
    /** upright bass: a plucky, woody version */
    upright(n, t, dur, vol = 0.24) {
      const g = env(t, 0.012, vol, 0.25, 0.35, dur, filt('lowpass', 600, out, 1));
      osc('triangle', midi(n), t, t + dur + 0.05, g, 1);
      osc('sine', midi(n), t, t + dur + 0.05, g, 0.8);
    },
    /** music box: a bright bell that rings out, with an echo */
    box(n, t, vol = 0.07) {
      const g = env(t, 0.006, vol, 0.3, 0.3, 1.4, out);
      g.connect(studio.echo);
      osc('sine', midi(n), t, t + 1.5, g, 1);
      osc('sine', midi(n) * 3, t, t + 1.5, g, 0.12);
      osc('sine', midi(n) * 4.2, t, t + 1.5, g, 0.05);
    },
    /** kalimba: a soft thumb-piano plink with a tiny pitch drop */
    kalimba(n, t, vol = 0.08) {
      const g = env(t, 0.004, vol, 0.15, 0.4, 1.8, out);
      g.connect(studio.echo);
      const o = osc('sine', midi(n), t, t + 1.9, g, 1);
      o.frequency.setValueAtTime(midi(n) * 1.01, t);
      o.frequency.exponentialRampToValueAtTime(midi(n), t + 0.05);
      osc('sine', midi(n) * 5.4, t, t + 0.25, g, 0.08);
    },
    /** ukulele-ish pluck: a bright attack that quickly mellows */
    pluck(n, t, vol = 0.06, dur = 0.5) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.18);
      const g = env(t, 0.004, vol, 0.12, 0.35, dur, out);
      f.connect(g);
      osc('triangle', midi(n), t, t + dur + 0.05, f, 1);
      osc('sawtooth', midi(n), t, t + dur + 0.05, f, 0.25, 6);
    },
    /** flute / whistle: a breathy sine with a gentle vibrato that grows in */
    flute(n, t, dur, vol = 0.06) {
      const g = env(t, 0.06, vol, dur * 0.5, 0.75, dur, out);
      g.connect(studio.echo);
      const o = osc('sine', midi(n), t, t + dur + 0.05, g, 1);
      osc('triangle', midi(n) * 2, t, t + dur + 0.05, g, 0.05);
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(midi(n) * 0.006, t + 0.25);
      lfo.connect(depth).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
      noiseHit(t, vol * 0.25, 'bandpass', midi(n) * 2, 0.12, 2);
    },
    /** vibraphone: a mellow metal bar with a slow wobble */
    vibes(n, t, dur, vol = 0.06) {
      const g = env(t, 0.008, vol, 0.4, 0.5, dur, out);
      const wob = ctx.createGain(); wob.gain.value = 0.8;
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 5; depth.gain.value = 0.2;
      lfo.connect(depth).connect(wob.gain); lfo.start(t); lfo.stop(t + dur + 0.05);
      wob.connect(g);
      g.connect(studio.echo);
      osc('sine', midi(n), t, t + dur + 0.05, wob, 1);
      osc('sine', midi(n) * 4, t, t + 0.4, wob, 0.1);
    },
    /** accordion: two slightly out-of-tune reeds (the "musette" shimmer) */
    accordion(notes, t, dur, vol = 0.03) {
      const g = env(t, 0.03, vol, dur * 0.5, 0.7, dur, filt('lowpass', 1900, out, 0.3));
      for (const n of notes) {
        osc('sawtooth', midi(n), t, t + dur + 0.05, g, 0.5, -9);
        osc('square', midi(n), t, t + dur + 0.05, g, 0.25, 9);
      }
    },
    /** warm pad: slow-blooming detuned saws behind a dark filter */
    pad(notes, t, dur, vol = 0.025) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.4, dur * 0.4));
      g.gain.setValueAtTime(vol, t + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
      g.connect(filt('lowpass', 900, out, 0.3));
      for (const n of notes) {
        osc('sawtooth', midi(n), t, t + dur + 1.7, g, 0.5, -7);
        osc('sawtooth', midi(n), t, t + dur + 1.7, g, 0.5, 7);
      }
    },
    shaker(t, vol = 0.014) { noiseHit(t, vol, 'highpass', 7000, 0.09); },
    woodblock(t, vol = 0.05, f = 1100) {
      const g = env(t, 0.002, vol, 0.04, 0.2, 0.09, out);
      osc('sine', f, t, t + 0.1, g, 1);
      noiseHit(t, vol * 0.4, 'bandpass', f * 2, 0.03, 4);
    },
    brush(t, vol = 0.02, dur = 0.28) { noiseHit(t, vol, 'bandpass', 3800, dur, 0.6); },
    drip(t, vol = 0.03) {
      const g = env(t, 0.002, vol, 0.05, 0.2, 0.12, out);
      const o = osc('sine', 1800, t, t + 0.13, g, 1);
      o.frequency.exponentialRampToValueAtTime(2900, t + 0.05);
    },
  };
}

/** Gentle rain on the window, for songs that want it. Returns a stop function. */
function startRain(ctx, out, t) {
  const src = ctx.createBufferSource(); src.buffer = studio.noise; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 3);
  const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 0.08; depth.gain.value = 0.006;
  lfo.connect(depth).connect(g.gain);
  src.connect(hp).connect(lp).connect(g).connect(out);
  src.start(t); lfo.start(t);
  return (when) => { g.gain.setTargetAtTime(0.0001, when, 0.5); src.stop(when + 3); lfo.stop(when + 3); };
}

// ---------- the improviser: little melodies that change every time ----------
function improvise(api, voice, o) {
  const { pos, bar, chord, rng, mem } = api;
  const pattern = o.rhythms[(bar * 3 + api.round * 5) % o.rhythms.length];
  if (!pattern || !pattern.includes(pos) || (o.rest && o.rest(api))) return;
  if (mem.note == null) mem.note = o.scale[Math.floor(o.scale.length / 2)];
  if (pos === pattern[0] && rng() < 0.7) {
    // land on a chord note near where we are
    const tones = chord.v.map((n) => n + (o.lift ?? 24)).flatMap((n) => [n - 12, n, n + 12]).filter((n) => n >= o.scale[0] && n <= o.scale[o.scale.length - 1]);
    if (tones.length) mem.note = tones.reduce((a, b) => (Math.abs(b - mem.note) < Math.abs(a - mem.note) ? b : a));
  } else {
    const i = Math.max(0, o.scale.findIndex((p) => p >= mem.note));
    const move = rng() < 0.5 ? -1 : 1;
    mem.note = o.scale[Math.min(o.scale.length - 1, Math.max(0, i + move + (rng() < 0.2 ? move : 0)))];
  }
  voice(mem.note, api.t + api.swingAt(pos), o.vol * (0.8 + rng() * 0.4), pattern, pos);
}

// ---------- playing a song ----------
function newSong(track, startTime, seed = 1) {
  return {
    track, startTime, step: 0, round: 0, rng: seeded(seed), mem: {},
    stopRain: track.rain ? startRain(parts.ctx, trackOut, startTime) : null,
  };
}

function chordAt(track, bar) {
  const name = track.sections[track.form[Math.floor(bar / 8) % track.form.length]][bar % 8];
  return track.chords[name];
}

function playStep(s, t) {
  const track = s.track;
  const perBar = track.beats * 2;
  const stepDur = 60 / track.bpm / 2;
  const bar = Math.floor(s.step / perBar);
  const pos = s.step % perBar;
  if (bar % (track.form.length * 8) === 0 && pos === 0) { s.round++; s.rng = seeded(s.round * 7919 + track.bpm); }
  const api = {
    t, bar, pos, perBar, beat: stepDur * 2, eighth: stepDur, round: s.round, rng: s.rng, mem: s.mem,
    chord: chordAt(track, bar), nextChord: chordAt(track, bar + 1),
    section: track.form[Math.floor(bar / 8) % track.form.length], barInSection: bar % 8,
    swingAt: (p) => (p % 2 ? stepDur * (track.swing ?? 0) : 0),
    play: instruments, improvise: (voice, o) => improvise(api, voice, o),
  };
  track.step(api);
  s.step++;
}

let instruments = null;

function scheduler() {
  const { ctx } = parts;
  while (song && nextTime < ctx.currentTime + 0.35) {
    // after a few minutes, move on to the next song at the start of a section
    const t = song.track;
    const atSection = song.step % (t.beats * 2 * 8) === 0;
    if (!stayOnTrack && !switching && atSection && nextTime - song.startTime > SONG_MINUTES * 60) { changeTrack(1); return; }
    playStep(song, nextTime);
    nextTime += 60 / t.bpm / 2;
  }
  timer = setTimeout(scheduler, 60);
}

/** Starts a song now (fading it in). */
function begin(trackId) {
  const { ctx } = parts;
  const track = TRACKS.find((x) => x.id === trackId) || TRACKS[0];
  trackOut = newTrackOut(ctx, track);
  instruments = makeInstruments(ctx, trackOut);
  nextTime = ctx.currentTime + 0.12;
  song = newSong(track, nextTime, Math.floor(Math.random() * 1e6));
  trackOut.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
  listeners.forEach((f) => f(track.id));
}

/** Crossfades to the next (dir = 1) or previous (dir = -1) song, or to a given song id. */
export function changeTrack(dir = 1) {
  if (!parts || !song) { pendingTrack = typeof dir === 'string' ? dir : pendingTrack; return; }
  const { ctx } = parts;
  const i = TRACKS.indexOf(song.track);
  const nextId = typeof dir === 'string' ? dir : TRACKS[(i + dir + TRACKS.length) % TRACKS.length].id;
  switching = true;
  clearTimeout(timer);
  const oldOut = trackOut, oldSong = song;
  oldOut.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  oldSong.stopRain?.(ctx.currentTime);
  setTimeout(() => { try { oldOut.disconnect(); } catch { /* already gone */ } }, 4000);
  song = null;
  pendingTrack = null;
  setTimeout(() => {
    switching = false;
    const id = pendingTrack || nextId; // a second click during the crossfade wins
    pendingTrack = null;
    if (!playing) { pendingTrack = id; return; }
    begin(id);
    scheduler();
  }, 1600);
}

let pendingTrack = null;

// ---------- start & stop ----------
/** Starts the music with a gentle fade-in. Needs a click or key press first (browser rule). */
export function startMusic(trackId) {
  if (playing) return true;
  parts = parts || audioParts();
  if (!parts) return false;
  const { ctx, musicBus } = parts;
  if (!studio) studio = buildStudio(ctx, musicBus);
  playing = true;
  studio.main.gain.cancelScheduledValues(ctx.currentTime);
  studio.main.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  if (switching) return true; // the crossfade will start the next song
  if (!song) begin(trackId || pendingTrack || TRACKS[0].id);
  pendingTrack = null;
  nextTime = Math.max(nextTime, ctx.currentTime + 0.1);
  scheduler();
  return true;
}

/** Fades the music out and stops (the song carries on from where it was next time). */
export function stopMusic() {
  if (!playing) return;
  playing = false;
  clearTimeout(timer);
  const { ctx } = parts;
  studio.main.gain.cancelScheduledValues(ctx.currentTime);
  studio.main.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
}

export const isMusicPlaying = () => playing;
export const currentTrack = () => song?.track.id || pendingTrack || null;
export const trackIds = () => TRACKS.map((x) => x.id);
/** true = keep playing the same song; false = move through all the songs. */
export function setStayOnTrack(on) { stayOnTrack = on; }
/** Calls fn(trackId) whenever a new song starts. */
export function onTrackChange(fn) { listeners.add(fn); }
/** Which song to start with, if the music hasn't started yet. */
export function chooseFirstTrack(id) { if (!song) pendingTrack = id; }

// be polite: pause while the game is in a hidden tab, carry on when it comes back
let pausedByTab = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) { stopMusic(); pausedByTab = true; }
  else if (!document.hidden && pausedByTab) { pausedByTab = false; startMusic(); }
});

/**
 * Renders a song into an audio buffer without playing it (used by the automatic test,
 * and to make preview recordings). Not used during the game.
 */
export async function renderMusic(seconds = 30, sampleRate = 44100, trackId = TRACKS[0].id) {
  const saved = { parts, studio, trackOut, song, instruments };
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = offline.createGain(); bus.gain.value = 0.5; bus.connect(offline.destination);
  parts = { ctx: offline, musicBus: bus };
  studio = buildStudio(offline, bus);
  studio.main.gain.value = 1;
  const track = TRACKS.find((x) => x.id === trackId) || TRACKS[0];
  trackOut = newTrackOut(offline, track);
  trackOut.gain.value = 1;
  instruments = makeInstruments(offline, trackOut);
  const s = newSong(track, 0.05, 1);
  for (let t = 0.05; t < seconds; t += 60 / track.bpm / 2) playStep(s, t);
  const buffer = await offline.startRendering();
  ({ parts, studio, trackOut, song, instruments } = saved);
  return buffer;
}
