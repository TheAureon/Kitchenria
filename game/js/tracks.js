// tracks.js — the songs of Kitchenria's soundtrack. All original, played live by music.js.
//
// Each song has: a tempo (bpm), beats per bar (4, or 3 for a waltz), a little swing,
// its chords (MIDI note numbers for the voicing "v" and the bass "b"), sections of 8 bars,
// the order of the sections ("form"), and a step() function that is called on every
// eighth note and decides what plays. `a.play` holds the instruments (see music.js).
//
// To add a song: copy one, give it a new id and a name in lang/en.json ("music.<id>"),
// change the chords and the step() function, and add it to the TRACKS list at the bottom.

// a walking bass line: root, a chord note, another, then a step towards the next chord
function walk(a, vol, instrument = 'upright') {
  if (a.pos % 2) return;
  const beat = a.pos / 2;
  const { b } = a.chord;
  const next = a.nextChord.b;
  const notes = [b, b + (a.rng() < 0.5 ? 4 : 3), b + 7, next + (next > b ? -1 : 1)];
  a.play[instrument](notes[beat % 4] - (beat === 2 && a.rng() < 0.3 ? 12 : 0), a.t, a.beat * 0.95, vol);
}

/** Morning Toast — the first tune: lazy electric piano, music box, swung shaker. */
const toast = {
  id: 'toast', bpm: 72, beats: 4, swing: 0.16, wet: 0.6,
  chords: {
    Fmaj7: { v: [53, 57, 60, 64], b: 41 }, Em7: { v: [52, 55, 59, 62], b: 40 }, Dm7: { v: [50, 53, 57, 60], b: 38 },
    Cmaj7: { v: [48, 52, 55, 59], b: 36 }, G7sus: { v: [55, 60, 62, 65], b: 43 }, Am7: { v: [57, 60, 64, 67], b: 45 },
    G6: { v: [55, 59, 62, 64], b: 43 }, Gsus: { v: [55, 60, 62, 67], b: 43 }, Fadd9: { v: [53, 57, 60, 67], b: 41 },
  },
  sections: {
    A: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', 'G7sus'],
    B: ['Am7', 'Fadd9', 'Cmaj7', 'G6', 'Am7', 'Dm7', 'Fmaj7', 'Gsus'],
  },
  form: ['A', 'A', 'B', 'A'],
  step(a) {
    const { pos, t, chord, play, rng } = a;
    if (pos === 0) {
      chord.v.forEach((n, i) => play.ep(n, t + i * 0.018, a.beat * 3.6, 0.05));
      play.bass(chord.b, t, a.beat * 1.8);
    }
    if (pos === 4) play.bass(rng() < 0.6 ? chord.b + 7 : chord.b, t, a.beat * 1.4, 0.17);
    if (pos === 5 && rng() < 0.45) chord.v.slice(2).forEach((n, i) => play.ep(n, t + a.swingAt(pos) + i * 0.015, a.beat * 1.5, 0.028));
    if (pos % 2 === 1) play.shaker(t + a.swingAt(pos), 0.012 + rng() * 0.006);
    a.improvise((n, tt, v) => play.box(n, tt, v), {
      scale: [72, 74, 76, 79, 81, 84, 86, 88], vol: 0.065,
      rhythms: [[0, 3, 4], [0, 2, 5], [1, 4, 6], [0, 6], [2, 3, 4, 7], [0, 4], null, [0, 3, 6]],
      rest: (x) => x.barInSection === 7,
    });
  },
};

/** Sunday Market — bright and bouncy: ukulele strums, walking bass, a whistled flute, woodblock. */
const market = {
  id: 'market', bpm: 100, beats: 4, swing: 0.1, wet: 0.4, echoBeats: 0.5,
  chords: {
    G: { v: [55, 59, 62, 67], b: 43 }, Em7: { v: [52, 55, 59, 62], b: 40 }, Cmaj7: { v: [52, 55, 59, 60], b: 36 },
    D7: { v: [54, 57, 60, 62], b: 38 }, Am7: { v: [55, 57, 60, 64], b: 45 }, Bm7: { v: [54, 57, 59, 62], b: 47 },
    A7: { v: [55, 57, 61, 64], b: 45 }, C: { v: [52, 55, 60, 64], b: 36 },
  },
  sections: {
    A: ['G', 'Em7', 'Cmaj7', 'D7', 'G', 'Em7', 'Am7', 'D7'],
    B: ['C', 'Bm7', 'Em7', 'A7', 'C', 'D7', 'G', 'G'],
  },
  form: ['A', 'A', 'B', 'A'],
  step(a) {
    const { pos, t, chord, play, rng } = a;
    // the ukulele: down on 1, then a happy "down-up, up-down-up"
    const strum = { 0: 0.055, 3: 0.03, 4: 0.04, 5: 0.03, 7: 0.028 }[pos];
    if (strum) {
      const up = pos % 2 === 1;
      const notes = up ? [...chord.v].reverse() : chord.v;
      notes.forEach((n, i) => play.pluck(n + 12, t + a.swingAt(pos) + i * 0.012, strum * (1 - i * 0.08), 0.45));
    }
    walk(a, 0.2);
    if (pos === 2 || pos === 6) play.woodblock(t, 0.035, pos === 2 ? 1150 : 950);
    if (pos % 2 === 1) play.shaker(t + a.swingAt(pos), 0.01);
    // the flute takes a breath on the B section's first half
    a.improvise((n, tt, v, pattern, p) => {
      const nextHit = pattern.find((x) => x > p) ?? a.perBar;
      play.flute(n, tt, Math.max(0.2, (nextHit - p) * a.eighth * 0.92), v);
    }, {
      scale: [74, 76, 79, 81, 83, 86, 88, 91], vol: 0.05,
      rhythms: [[0, 2, 3, 4, 6], [0, 3, 4], [0, 1, 2, 4], [0, 4, 5, 6], [2, 4, 6], [0, 2, 4, 6], [0, 6], [1, 2, 4]],
      rest: (x) => x.section === 'B' && x.barInSection < 2,
    });
  },
};

/** Rainy Window — slow and dreamy: warm pads, a kalimba, rain on the glass. */
const rain = {
  id: 'rain', bpm: 60, beats: 4, swing: 0, wet: 0.9, echoBeats: 1, rain: true,
  chords: {
    Am9: { v: [57, 60, 64, 71], b: 45 }, Fmaj7: { v: [53, 57, 60, 64], b: 41 }, Cmaj7: { v: [55, 59, 60, 64], b: 36 },
    G6: { v: [55, 59, 62, 64], b: 43 }, Dm9: { v: [53, 57, 60, 64], b: 38 }, Em7: { v: [52, 55, 59, 62], b: 40 },
    Esus: { v: [52, 57, 59, 64], b: 40 },
  },
  sections: {
    A: ['Am9', 'Fmaj7', 'Cmaj7', 'G6', 'Am9', 'Fmaj7', 'Cmaj7', 'G6'],
    B: ['Dm9', 'Em7', 'Fmaj7', 'G6', 'Am9', 'Fmaj7', 'Dm9', 'Esus'],
  },
  form: ['A', 'B', 'A', 'B'],
  step(a) {
    const { pos, t, chord, play, rng } = a;
    if (pos === 0) {
      play.pad(chord.v, t, a.beat * 4, 0.022);
      play.bass(chord.b, t, a.beat * 3.8, 0.16);
    }
    if (pos === 0 || pos === 4) chord.v.forEach((n, i) => { if (rng() < 0.5) play.ep(n + 12, t + i * 0.09, a.beat * 2, 0.018); });
    if (rng() < 0.05) play.drip(t + rng() * a.eighth, 0.012 + rng() * 0.01);
    a.improvise((n, tt, v) => play.kalimba(n, tt, v), {
      scale: [69, 72, 74, 76, 79, 81, 84], vol: 0.075,
      rhythms: [[0, 3], [2, 5], [0], [1, 4, 6], null, [0, 6], [3], [0, 2]],
    });
  },
};

/** Lavender Tea — a little French café waltz: accordion, oom-pah-pah bass, music-box twinkles. */
const tea = {
  id: 'tea', bpm: 132, beats: 3, swing: 0, wet: 0.5, echoBeats: 1,
  chords: {
    F: { v: [57, 60, 65], b: 41 }, Gm7: { v: [55, 58, 62, 65], b: 43 }, C7: { v: [55, 58, 60, 64], b: 36 },
    Dm: { v: [57, 62, 65], b: 38 }, Bb: { v: [58, 62, 65], b: 46 }, Bbm6: { v: [56, 58, 62, 65], b: 46 },
    D7: { v: [54, 57, 60, 62], b: 38 }, A7: { v: [55, 57, 61, 64], b: 45 },
  },
  sections: {
    A: ['F', 'Gm7', 'C7', 'F', 'Dm', 'Gm7', 'C7', 'F'],
    B: ['Bb', 'Bbm6', 'F', 'D7', 'Gm7', 'C7', 'F', 'C7'],
  },
  form: ['A', 'A', 'B', 'A'],
  step(a) {
    const { pos, t, chord, play, bar, rng } = a;
    if (pos === 0) play.bass(bar % 2 ? chord.b + 7 : chord.b, t, a.beat * 0.9, 0.28);   // oom
    if (pos === 2 || pos === 4) play.accordion(chord.v, t, a.beat * 0.55, 0.03);       // pah, pah
    if (pos === 0 && a.barInSection % 4 === 3) play.accordion(chord.v.map((n) => n + 12), t + a.beat * 2.5, a.beat * 0.4, 0.012);
    a.improvise((n, tt, v) => play.box(n, tt, v), {
      scale: [77, 79, 81, 82, 84, 86, 88, 89, 91], vol: 0.08, lift: 24,
      rhythms: [[0, 2, 4], [0, 4], [0, 1, 2, 4], [0, 3], [2, 4], [0, 2, 3, 4], [0], [0, 4, 5]],
      rest: (x) => x.section === 'B' && x.barInSection % 4 === 0 && rng() < 0.3,
    });
  },
};

/** Night Bakery — late-night jazz: mellow piano, vibraphone, brushes, walking upright bass. */
const bakery = {
  id: 'bakery', bpm: 66, beats: 4, swing: 0.22, wet: 0.75,
  chords: {
    Dm9: { v: [53, 57, 60, 64], b: 38 }, G13: { v: [53, 59, 64, 69], b: 43 }, Cmaj9: { v: [52, 55, 59, 62], b: 36 },
    A7b9: { v: [55, 58, 61, 64], b: 45 }, Fmaj9: { v: [57, 60, 64, 67], b: 41 }, E7: { v: [56, 59, 62, 64], b: 40 },
    Bbmaj7: { v: [53, 57, 58, 62], b: 46 }, Am7: { v: [55, 60, 64, 67], b: 45 },
  },
  sections: {
    A: ['Dm9', 'G13', 'Cmaj9', 'A7b9', 'Dm9', 'G13', 'Fmaj9', 'E7'],
    B: ['Am7', 'Dm9', 'G13', 'Cmaj9', 'Bbmaj7', 'A7b9', 'Dm9', 'A7b9'],
  },
  form: ['A', 'A', 'B', 'A'],
  step(a) {
    const { pos, t, chord, play, rng } = a;
    if (pos === 0) chord.v.forEach((n, i) => play.ep(n, t + i * 0.025, a.beat * 2.6, 0.04));
    if (pos === 3 && rng() < 0.5) chord.v.forEach((n, i) => play.ep(n, t + a.swingAt(pos) + i * 0.02, a.beat * 1.2, 0.025));
    walk(a, 0.22);
    if (pos === 2 || pos === 6) play.brush(t, 0.022, 0.32);
    if (pos % 2 === 1 && rng() < 0.7) play.brush(t + a.swingAt(pos), 0.008, 0.08);
    a.improvise((n, tt, v, pattern, p) => {
      const nextHit = pattern.find((x) => x > p) ?? a.perBar;
      play.vibes(n, tt, Math.max(0.5, (nextHit - p) * a.eighth * 1.6), v);
    }, {
      scale: [62, 65, 67, 69, 72, 74, 77, 79, 81], vol: 0.06, lift: 12,
      rhythms: [[0, 3, 5], [1, 2, 4], [0, 6], null, [3, 4, 5, 7], [0, 2], [5, 6, 7], [0]],
      rest: (x) => x.barInSection === 7 && x.section === 'A',
    });
  },
};

export const TRACKS = [toast, market, rain, tea, bakery];
