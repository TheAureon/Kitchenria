// shapes.js — the doodle library.
//
// Each shape is a small function that draws one kind of thing inside a 100×100 box.
// It receives the drawing kit "k" (see doodle.js) and colours "o":
//   o.c = main colour, o.a = accent colour, o.f = fill/contents colour.
// It returns { body, face, top }:
//   body = the SVG drawing, face = [x, y, size] where the cute face goes (or null),
//   top  = [x, y, width] where toppings (butter, sparkles, steam…) are placed.
//
// To add a new shape: copy one that looks similar, rename it, tweak the points,
// then use its name as "shape" in items.json.

const { PI, cos, sin } = Math;

/** Shared bowl drawing used by "bowl" and some toppings. */
function bowl(k, o) {
  const rim = k.ellipsePts(50, 50, 38, 10, 14);
  const body = [[12, 50], [16, 66], [30, 82], [50, 87], [70, 82], [84, 66], [88, 50]];
  let s = k.shape(body.concat([[50, 52]]), o.c, { tension: 0.9 });
  s += k.fill([[18, 64], [30, 80], [50, 85], [70, 80], [82, 64], [70, 76], [50, 80], [30, 76]], k.shade(o.c, -0.12), { opacity: 0.6 });
  s += k.shape(rim, k.shade(o.c, -0.08), { sw: 2.8 });
  s += k.fill(k.ellipsePts(50, 50.5, 33, 7, 12), o.f);
  return s;
}

export const SHAPES = {
  // ---------------- basic ingredients ----------------
  sack(k, o) {
    const pts = [[24, 87], [50, 91], [76, 87], [83, 62], [75, 39], [62, 31], [67, 20], [57, 24], [50, 15], [43, 24], [33, 20], [38, 31], [25, 39], [17, 62]];
    let s = k.shape(pts, o.c, { wob: 1.4 });
    s += k.fill([[22, 70], [26, 85], [50, 88], [74, 85], [79, 70], [50, 80]], k.shade(o.c, -0.1), { opacity: 0.7 });
    s += k.line([[37, 32], [50, 34], [63, 32]], { color: o.a, sw: 4 });
    s += k.line([[44, 72], [50, 66], [56, 72]], { color: o.a, sw: 2.4 }); // little wheat mark
    s += k.line([[50, 66], [50, 80]], { color: o.a, sw: 2.4 });
    return { body: s, face: [50, 54, 1], top: [50, 40, 30] };
  },
  egg(k, o) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * PI * 2;
      const ry = cos(t) > 0 ? 34 : 29;
      pts.push([50 + sin(t) * 27, 57 - cos(t) * ry]);
    }
    let s = k.shape(pts, o.c, { wob: 0.9 });
    s += k.fill([[28, 66], [36, 82], [50, 87], [64, 82], [72, 66], [50, 78]], o.a, { opacity: 0.6 });
    s += k.shine(39, 40, 6, 3.5, -50);
    return { body: s, face: [50, 60, 1], top: [50, 28, 30] };
  },
  drop(k, o) {
    const pts = [[50, 11], [61, 30], [73, 50], [75, 66], [65, 82], [50, 88], [35, 82], [25, 66], [27, 50], [39, 30]];
    let s = k.shape(pts, o.c, { wob: 1 });
    s += k.fill([[30, 68], [38, 81], [50, 85], [62, 81], [70, 68], [50, 77]], o.a, { opacity: 0.5 });
    s += k.shine(40, 50, 4, 7, 20);
    return { body: s, face: [50, 64, 1], top: [50, 22, 26] };
  },
  carton(k, o) {
    let s = k.shape(k.polyPts([[28, 88], [72, 88], [72, 40], [61, 24], [39, 24], [28, 40]]), o.c, { wob: 1, tension: 0.4 });
    s += k.shape(k.polyPts([[38, 24], [62, 24], [62, 15], [38, 15]]), k.shade(o.c, -0.08), { wob: 0.8, tension: 0.4, sw: 2.6 });
    s += k.line([[28, 40], [72, 40]], { sw: 2.4 });
    s += k.fill(k.polyPts([[29, 70], [71, 66], [71, 86], [29, 86]]), o.a, { wob: 1, tension: 0.6 });
    s += k.line([[31, 68], [40, 64], [50, 68], [60, 63], [70, 66]], { color: k.shade(o.a, -0.2), sw: 2 });
    return { body: s, face: [50, 54, 1], top: [50, 18, 26] };
  },
  block(k, o) {
    let s = k.shape(k.polyPts([[82, 47], [90, 35], [90, 68], [82, 81]]), k.shade(o.c, -0.18), { wob: 0.8, tension: 0.3, sw: 3 });
    s += k.shape(k.polyPts([[16, 47], [28, 35], [90, 35], [82, 47]]), k.shade(o.c, 0.35), { wob: 0.8, tension: 0.3, sw: 3 });
    s += k.shape(k.polyPts([[16, 47], [82, 47], [82, 81], [16, 81]]), o.c, { wob: 0.9, tension: 0.3 });
    s += k.fill(k.polyPts([[18, 74], [80, 74], [80, 79], [18, 79]]), o.a, { opacity: 0.6, tension: 0.3 });
    return { body: s, face: [49, 61, 1], top: [55, 38, 40] };
  },
  shaker(k, o) {
    let s = k.shape(k.rectPts(31, 38, 38, 50, 9), o.c, { wob: 1 });
    s += k.shape(k.rectPts(29, 21, 42, 19, 8), o.a, { wob: 0.9, sw: 3 });
    for (const [x, y] of [[40, 28], [50, 26], [60, 28], [45, 33], [55, 33]]) s += `<circle cx="${x}" cy="${y}" r="1.6" fill="#4a3426"/>`;
    s += k.shine(38, 50, 3, 7, 0);
    return { body: s, face: [50, 64, 1], top: [50, 20, 28] };
  },
  cubes(k, o) {
    const cube = (x, y, w, rot) => {
      const t = `transform="rotate(${rot} ${x + w / 2} ${y + w / 2})"`;
      return `<g ${t}>` +
        k.shape(k.polyPts([[x, y], [x + w * 0.3, y - w * 0.28], [x + w * 1.3, y - w * 0.28], [x + w, y]]), k.shade(o.c, -0.04), { wob: 0.6, tension: 0.3, sw: 2.6, sketch: false }) +
        k.shape(k.polyPts([[x + w, y], [x + w * 1.3, y - w * 0.28], [x + w * 1.3, y + w * 0.72], [x + w, y + w]]), o.a, { wob: 0.6, tension: 0.3, sw: 2.6, sketch: false }) +
        k.shape(k.polyPts([[x, y], [x + w, y], [x + w, y + w], [x, y + w]]), o.c, { wob: 0.7, tension: 0.3, sw: 2.8 }) + '</g>';
    };
    let s = cube(14, 58, 28, -4) + cube(48, 58, 28, 3) + cube(31, 26, 28, -2);
    return { body: s, face: [45, 42, 0.8], top: [50, 20, 30] };
  },
  apple(k, o) {
    const pts = k.ellipsePts(50, 58, 31, 29, 14);
    pts[0] = [50, 38]; // dimple at the top
    let s = k.line([[50, 38], [51, 28], [54, 18]], { color: '#7a5230', sw: 4 });
    s += k.shape([[54, 26], [64, 17], [76, 18], [68, 27]], o.a, { wob: 0.8, sw: 2.6, sketch: false });
    s += k.shape(pts, o.c, { wob: 1.3 });
    s += k.fill([[26, 68], [38, 84], [50, 86], [64, 84], [76, 68], [50, 80]], k.shade(o.c, -0.18), { opacity: 0.55 });
    s += k.shine(36, 48, 6, 4, -40);
    return { body: s, face: [50, 62, 1], top: [50, 36, 34] };
  },
  tomato(k, o) {
    let s = k.shape(k.ellipsePts(50, 58, 34, 28, 14), o.c, { wob: 1.4 });
    s += k.fill([[22, 66], [36, 82], [50, 85], [64, 82], [78, 66], [50, 78]], k.shade(o.c, -0.18), { opacity: 0.5 });
    const star = [];
    for (let i = 0; i < 10; i++) { const t = (i / 10) * PI * 2 - PI / 2; const r = i % 2 ? 6 : 15; star.push([50 + cos(t) * r, 33 + sin(t) * r * 0.55]); }
    s += k.shape(star, o.a, { wob: 0.6, sw: 2.4, tension: 0.5, sketch: false });
    s += k.line([[50, 31], [51, 22]], { color: k.shade(o.a, -0.25), sw: 3.4 });
    s += k.shine(34, 48, 6, 3.5, -30);
    return { body: s, face: [50, 62, 1], top: [50, 36, 36] };
  },
  potato(k, o) {
    const pts = k.ellipsePts(50, 56, 36, 25, 13).map(([x, y], i) => [x, y + (i % 3 === 0 ? 2 : 0)]);
    let s = k.shape(pts, o.c, { wob: 2.4 });
    s += k.fill([[20, 62], [34, 77], [50, 80], [66, 77], [82, 62], [50, 72]], o.a, { opacity: 0.45 });
    for (const [x, y] of [[28, 50], [70, 46], [74, 64], [34, 70]]) s += `<path d="M${x},${y} q2,-2 4,0" fill="none" stroke="${o.a}" stroke-width="2.2" stroke-linecap="round"/>`;
    return { body: s, face: [50, 56, 1], top: [50, 36, 36] };
  },
  leaves(k, o) {
    const leaf = (bx, by, ang, len, w, col) => {
      const tx = bx + cos(ang) * len, ty = by + sin(ang) * len;
      const nx = -sin(ang) * w, ny = cos(ang) * w;
      const mx = (bx + tx) / 2, my = (by + ty) / 2;
      return k.shape([[bx, by], [mx + nx, my + ny], [tx, ty], [mx - nx, my - ny]], col, { wob: 0.8, sw: 2.6, sketch: false }) +
        k.line([[bx, by], [mx, my], [tx * 0.9 + bx * 0.1, ty * 0.9 + by * 0.1]], { color: k.shade(col, -0.3), sw: 1.4, opacity: 0.8 });
    };
    let s = k.line([[50, 90], [48, 66]], { color: o.a, sw: 3.2 });
    s += k.line([[50, 90], [36, 62]], { color: o.a, sw: 3 });
    s += k.line([[50, 90], [64, 62]], { color: o.a, sw: 3 });
    s += leaf(36, 64, -2.2, 34, 9, o.c) + leaf(64, 64, -0.95, 34, 9, o.c) + leaf(48, 66, -1.6, 46, 11, k.shade(o.c, 0.12));
    s += k.shape([[38, 82], [62, 82], [60, 90], [40, 90]], '#e2a95b', { wob: 0.6, sw: 2.4, sketch: false }); // twine
    return { body: s, face: [48, 44, 0.75], top: [50, 22, 30] };
  },
  flame(k, o) {
    const pts = [[50, 9], [61, 27], [72, 40], [77, 58], [71, 76], [58, 87], [42, 87], [29, 76], [23, 58], [29, 43], [37, 49], [39, 30]];
    let s = k.shape(pts, o.c, { wob: 1.2 });
    s += k.shape([[51, 38], [60, 53], [64, 66], [58, 79], [42, 79], [36, 66], [42, 55]], o.a, { wob: 1, sw: 2.4, sketch: false });
    return { body: s, face: [50, 68, 0.9], top: [50, 18, 24] };
  },

  // ---------------- tools ----------------
  board(k, o) {
    let s = k.shape(k.rectPts(80, 46, 14, 22, 7), o.c, { wob: 0.8 });
    s += k.shape(k.rectPts(8, 32, 76, 50, 10), o.c, { wob: 1.2 });
    s += `<circle cx="88" cy="57" r="3" fill="#4a3426"/>`;
    for (const y of [44, 56, 68]) s += k.line([[16, y], [40, y + 2], [62, y - 1], [76, y + 1]], { color: o.a, sw: 1.6, opacity: 0.7 });
    // a little knife resting on the board
    s += k.shape([[22, 54], [60, 46], [64, 50], [26, 62]], '#dfe5ea', { wob: 0.6, sw: 2.4, sketch: false });
    s += k.shape([[60, 46], [76, 43], [78, 48], [64, 50]], '#6b4a33', { wob: 0.5, sw: 2.4, sketch: false });
    return { body: s, face: null, top: [46, 30, 40] };
  },
  pot(k, o) {
    let s = k.line([[16, 50], [8, 48], [8, 58], [16, 58]], { sw: 3.4 });
    s += k.line([[84, 50], [92, 48], [92, 58], [84, 58]], { sw: 3.4 });
    s += k.shape([[16, 46], [18, 74], [28, 86], [50, 89], [72, 86], [82, 74], [84, 46], [50, 52]], o.c, { tension: 0.8 });
    s += k.fill([[19, 70], [28, 83], [50, 86], [72, 83], [81, 70], [50, 80]], o.a, { opacity: 0.6 });
    s += k.shape(k.ellipsePts(50, 46, 35, 9, 14), k.shade(o.c, -0.12), { sw: 2.8 });
    s += k.fill(k.ellipsePts(50, 46.5, 30, 6, 12), '#bfe3f2');
    s += `<circle cx="40" cy="46" r="2.4" fill="#fff" opacity=".9"/><circle cx="58" cy="45" r="1.8" fill="#fff" opacity=".9"/>`;
    s += k.line([[36, 34], [33, 26], [37, 18]], { color: '#4a3426', sw: 2, opacity: 0.35, cls: 'steam-wisp' });
    s += k.line([[58, 34], [61, 26], [57, 17]], { color: '#4a3426', sw: 2, opacity: 0.35, cls: 'steam-wisp' });
    for (const x of [30, 70]) s += `<circle cx="${x}" cy="66" r="2" fill="#fff" opacity=".5"/>`;
    return { body: s, face: null, top: [50, 40, 40] };
  },
  pan(k, o) {
    let s = k.shape([[62, 52], [92, 42], [95, 49], [66, 60]], o.a, { wob: 0.6, sw: 3, tension: 0.4 });
    s += k.shape(k.ellipsePts(38, 58, 32, 26, 16), o.c, { wob: 1 });
    s += k.fill(k.ellipsePts(38, 57, 24, 19, 14), k.shade(o.c, 0.15), { wob: 0.8 });
    s += k.shine(28, 48, 7, 3, -30);
    s += `<circle cx="90" cy="46" r="1.8" fill="#4a3426"/>`;
    return { body: s, face: null, top: [38, 50, 40] };
  },
  oven(k, o) {
    let s = k.shape(k.rectPts(14, 16, 72, 74, 10), o.c, { wob: 1 });
    s += k.line([[16, 34], [84, 34]], { sw: 2.4 });
    for (const x of [26, 40, 54]) s += k.circle(x, 25, 4, k.shade(o.c, -0.3), { sw: 2 });
    s += k.circle(72, 25, 3, o.a, { sw: 2 });
    s += k.shape(k.rectPts(24, 42, 52, 38, 8), '#5a3d2e', { wob: 0.9, sw: 3 });
    s += k.fill(k.ellipsePts(50, 70, 18, 6, 10), o.a, { opacity: 0.85 });
    s += k.fill(k.ellipsePts(50, 66, 10, 4, 8), '#fbd25a', { opacity: 0.8 });
    s += k.line([[30, 46], [42, 46]], { color: '#fff', sw: 2, opacity: 0.4 });
    return { body: s, face: null, top: [50, 14, 40] };
  },
  blender(k, o) {
    let s = k.shape(k.rectPts(28, 66, 44, 24, 6), o.a, { wob: 0.9 });
    s += k.circle(50, 78, 4, '#fff', { sw: 2 });
    s += k.shape(k.polyPts([[30, 18], [70, 18], [64, 66], [36, 66]]), o.c, { wob: 0.9, tension: 0.4 });
    s += k.fill(k.polyPts([[35, 44], [66, 44], [64, 64], [37, 64]]), '#f7d2c4', { opacity: 0.85, tension: 0.4 });
    s += k.shape(k.rectPts(27, 10, 46, 11, 5), k.shade(o.a, -0.1), { wob: 0.7, sw: 2.6, sketch: false });
    s += k.line([[44, 56], [50, 50], [56, 56], [50, 60]], { color: k.shade(o.a, -0.2), sw: 2 });
    s += k.line([[36, 26], [38, 40]], { color: '#fff', sw: 3, opacity: 0.7 });
    return { body: s, face: null, top: [50, 10, 34] };
  },
  mortar(k, o) {
    let s = k.shape([[52, 52], [76, 12], [84, 16], [62, 54]], k.shade(o.c, -0.2), { wob: 0.6, sw: 3, tension: 0.5 });
    s += k.shape([[12, 52], [16, 68], [30, 82], [36, 90], [64, 90], [70, 82], [84, 68], [88, 52], [50, 56]], o.c, { tension: 0.8 });
    s += k.fill([[18, 66], [32, 81], [50, 86], [68, 81], [82, 66], [50, 78]], o.a, { opacity: 0.6 });
    s += k.shape(k.ellipsePts(50, 52, 38, 9, 14), k.shade(o.c, 0.15), { sw: 2.8 });
    s += k.fill(k.ellipsePts(50, 53, 31, 5.5, 12), o.a, { opacity: 0.8 });
    for (const [x, y] of [[30, 70], [62, 74], [46, 66]]) s += `<circle cx="${x}" cy="${y}" r="1.3" fill="#4a3426" opacity=".4"/>`;
    return { body: s, face: null, top: [50, 46, 40] };
  },

  // ---------------- prepared things & dishes ----------------
  blob(k, o) {
    let s = k.shape(k.ellipsePts(50, 60, 35, 25, 12), o.c, { wob: 2.6 });
    s += k.fill([[20, 66], [34, 80], [50, 84], [66, 80], [80, 66], [50, 76]], k.shade(o.c, -0.12), { opacity: 0.7 });
    s += k.shine(36, 48, 7, 3.5, -20);
    return { body: s, face: [50, 60, 1], top: [50, 46, 46] };
  },
  loaf(k, o) {
    const pts = [[12, 78], [88, 78], [90, 64], [84, 46], [70, 34], [50, 30], [30, 34], [16, 46], [10, 64]];
    let s = k.shape(pts, o.c, { wob: 1.6 });
    s += k.fill([[12, 72], [88, 72], [86, 77], [14, 77]], k.shade(o.c, -0.2), { opacity: 0.6 });
    for (const x of [30, 48, 66]) s += k.line([[x - 5, 52], [x + 7, 38]], { color: o.a, sw: 4.5 });
    return { body: s, face: [50, 62, 1], top: [50, 40, 50] };
  },
  slice(k, o) {
    const outer = [[22, 86], [78, 86], [79, 44], [87, 33], [81, 17], [63, 11], [50, 15], [37, 11], [19, 17], [13, 33], [21, 44]];
    const inner = outer.map(([x, y]) => [50 + (x - 50) * 0.8, 51 + (y - 51) * 0.8]);
    let s = k.shape(outer, o.a, { wob: 1.2, tension: 0.9 });
    s += k.fill(inner, o.c, { wob: 1, tension: 0.9 });
    for (const [x, y] of [[36, 40], [58, 34], [64, 62], [40, 70], [52, 52]]) s += `<circle cx="${x}" cy="${y}" r="1.2" fill="${k.shade(o.c, -0.25)}"/>`;
    return { body: s, face: [50, 58, 1], top: [50, 46, 44] };
  },
  friedEgg(k, o) {
    let s = k.shape(k.ellipsePts(50, 54, 38, 30, 11), o.c, { wob: 3.6 });
    s += k.shape(k.ellipsePts(53, 50, 14, 13, 10), o.a, { wob: 0.8, sw: 2.8 });
    s += k.shine(48, 45, 4, 2.5, -30);
    return { body: s, face: [53, 51, 0.62], top: [50, 40, 40] };
  },
  nest(k, o) {
    let s = k.shape(k.ellipsePts(50, 60, 34, 22, 12), o.c, { wob: 2.4 });
    for (let i = 0; i < 6; i++) {
      const y = 48 + i * 4.4, w = 26 - Math.abs(i - 2.5) * 3;
      s += k.line([[50 - w, y], [50 - w / 2, y - 4], [50, y + 2], [50 + w / 2, y - 3], [50 + w, y + 1]], { color: o.a, sw: 2.2, wob: 1.4 });
    }
    return { body: s, face: null, top: [50, 44, 40] };
  },
  bowl(k, o) {
    return { body: bowl(k, o), face: [50, 70, 0.9], top: [50, 46, 46] };
  },
  plate(k, o) {
    let s = k.shape(k.ellipsePts(50, 64, 44, 22, 16), o.c, { wob: 1 });
    s += k.fill(k.ellipsePts(50, 63, 33, 15, 14), k.shade(o.c, -0.07), { wob: 0.8 });
    s += k.shape(k.ellipsePts(50, 58, 25, 13, 12), o.f, { wob: 2.4, sw: 2.6, sketch: false });
    return { body: s, face: null, top: [50, 54, 40] };
  },
  pieces(k, o) {
    const spots = [[30, 66], [52, 70], [72, 62], [40, 48], [62, 46], [50, 58]];
    let s = '';
    spots.forEach(([x, y], i) => {
      const w = i === 5 ? 15 : 11;
      const pts = o.round ? k.ellipsePts(x, y, w, w * 0.78, 9) : k.polyPts([[x - w, y - w], [x + w, y - w], [x + w, y + w], [x - w, y + w]]);
      s += k.shape(pts, i % 2 ? o.c : k.shade(o.c, 0.08), { wob: 1.2, sw: 2.6, tension: o.round ? 1 : 0.5, sketch: false });
      s += `<circle cx="${x - w * 0.35}" cy="${y - w * 0.35}" r="${w * 0.25}" fill="${o.a}" opacity=".6"/>`;
    });
    return { body: s, face: [50, 59, 0.62], top: [50, 40, 46] };
  },
  jar(k, o) {
    let s = k.shape(k.rectPts(25, 32, 50, 56, 12), o.c, { wob: 1.1 });
    s += k.shape(k.rectPts(28, 19, 44, 15, 5), o.a, { wob: 0.8, sw: 2.8 });
    s += k.fill(k.rectPts(29, 50, 42, 22, 4), '#fff8ec', { opacity: 0.8 });
    s += k.shine(33, 42, 3, 6, 0);
    return { body: s, face: [50, 61, 0.9], top: [50, 18, 34] };
  },
  sticks(k, o) {
    let s = '';
    [[-14, 22], [-6, 30], [2, 26], [10, 32], [18, 24]].forEach(([dx, len], i) => {
      const x = 50 + dx, rot = -10 + i * 5;
      s += `<g transform="rotate(${rot} ${x} 62)">` + k.shape(k.rectPts(x - 4, 62 - len, 8, len * 2 - 6, 3), i % 2 ? o.c : k.shade(o.c, 0.1), { wob: 0.8, sw: 2.4, sketch: false }) + '</g>';
    });
    return { body: s, face: null, top: [50, 36, 40] };
  },
  fries(k, o) {
    let s = '';
    [[30, -12], [38, -4], [46, 4], [54, -6], [62, 8], [70, 0], [42, 10], [58, 2]].forEach(([x, r], i) => {
      s += `<g transform="rotate(${r} ${x} 50)">` + k.shape(k.rectPts(x - 4, 16 + (i % 3) * 4, 8, 44, 3), i % 2 ? o.c : k.shade(o.c, 0.15), { wob: 0.7, sw: 2.4, sketch: false }) + '</g>';
    });
    s += k.shape(k.polyPts([[22, 48], [78, 48], [70, 90], [30, 90]]), o.a, { wob: 1, tension: 0.4 });
    s += k.line([[26, 56], [74, 56]], { color: '#fff', sw: 2, opacity: 0.6 });
    return { body: s, face: [50, 72, 0.9], top: [50, 26, 36] };
  },
  wedges(k, o) {
    const wedge = (cx, cy, rot) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = PI + (i / 8) * PI; pts.push([cx + cos(t) * 18, cy + sin(t) * 18]); }
      return `<g transform="rotate(${rot} ${cx} ${cy})">` +
        k.shape(pts, o.a, { wob: 0.8, sw: 2.8, tension: 0.8, sketch: false }) +
        k.fill(pts.map(([x, y]) => [cx + (x - cx) * 0.8, cy + (y - cy) * 0.75 + 1]), o.c, { wob: 0.6 }) +
        `<ellipse cx="${cx}" cy="${cy - 7}" rx="2" ry="3" fill="#6b4a33"/></g>`;
    };
    const s = wedge(30, 74, -20) + wedge(70, 74, 20) + wedge(50, 52, 0);
    return { body: s, face: [50, 43, 0.6], top: [50, 36, 44] };
  },
  pie(k, o) {
    let s = k.shape(k.ellipsePts(50, 64, 42, 20, 16), k.shade(o.c, -0.25), { wob: 1 });
    s += k.shape(k.ellipsePts(50, 58, 38, 16, 16), o.c, { wob: 1.2 });
    for (const x of [-20, -7, 6, 19]) s += k.line([[50 + x - 6, 47], [50 + x + 6, 70]], { color: o.a, sw: 3.2 });
    for (const y of [52, 62]) s += k.line([[18, y], [50, y + 1], [82, y]], { color: o.a, sw: 3.2 });
    for (let i = 0; i < 16; i++) { const t = (i / 16) * PI * 2; s += `<circle cx="${(50 + cos(t) * 38).toFixed(1)}" cy="${(58 + sin(t) * 16).toFixed(1)}" r="3" fill="${k.shade(o.c, 0.12)}" stroke="#4a3426" stroke-width="1.2"/>`; }
    return { body: s, face: null, top: [50, 40, 40] };
  },
  glass(k, o) {
    let s = k.line([[62, 30], [70, 6]], { color: o.a, sw: 4.5 });
    s += k.shape(k.polyPts([[28, 18], [72, 18], [66, 88], [34, 88]]), '#f4fafb', { wob: 0.9, tension: 0.4 });
    s += k.fill(k.polyPts([[31, 34], [69, 34], [65, 85], [35, 85]]), o.c, { wob: 0.8, tension: 0.4 });
    s += k.line([[33, 34], [50, 36], [68, 34]], { color: k.shade(o.c, 0.3), sw: 2 });
    s += k.line([[36, 24], [38, 76]], { color: '#fff', sw: 3, opacity: 0.7 });
    return { body: s, face: [50, 60, 0.9], top: [50, 20, 34] };
  },
  mug(k, o) {
    let s = k.line([[70, 46], [86, 46], [88, 64], [70, 74]], { sw: 7 });
    s += k.line([[70, 46], [86, 46], [88, 64], [70, 74]], { color: o.c, sw: 3 });
    s += k.shape(k.rectPts(20, 32, 52, 56, 10), o.c, { wob: 1.1 });
    s += k.fill(k.ellipsePts(46, 36, 22, 5, 12), o.f, { wob: 0.6 });
    s += k.line([[24, 36], [46, 38], [68, 36]], { color: '#4a3426', sw: 1.6, opacity: 0.5 });
    s += k.fill([[22, 76], [70, 76], [70, 86], [22, 86]], k.shade(o.c, -0.15), { opacity: 0.5, tension: 0.4 });
    return { body: s, face: [46, 60, 0.95], top: [46, 30, 30] };
  },
  candyApple(k, o) {
    let s = k.line([[50, 40], [50, 6]], { color: '#c99a63', sw: 5 });
    const pts = k.ellipsePts(50, 60, 30, 28, 14); pts[0] = [50, 40];
    s += k.shape(pts, o.c, { wob: 1.1 });
    s += k.shape([[22, 54], [28, 42], [40, 34], [50, 40], [60, 34], [72, 42], [78, 54], [70, 60], [64, 54], [58, 64], [50, 56], [42, 64], [36, 54], [28, 60]], o.a, { wob: 0.8, sw: 2.6, sketch: false });
    s += k.shine(36, 47, 5, 3, -40);
    return { body: s, face: [50, 70, 0.9], top: [50, 32, 30] };
  },
  mound(k, o) {
    const pts = [[12, 82], [30, 80], [50, 82], [70, 80], [88, 82], [80, 62], [64, 40], [50, 30], [36, 40], [20, 62]];
    let s = k.shape(pts, o.c, { wob: 1.6 });
    s += k.fill([[16, 78], [50, 79], [84, 78], [76, 64], [50, 72], [24, 64]], o.a, { opacity: 0.8 });
    return { body: s, face: [50, 62, 1], top: [50, 30, 30] };
  },
  ramekin(k, o) {
    let s = k.shape([[20, 48], [22, 78], [36, 86], [64, 86], [78, 78], [80, 48]], o.c, { wob: 0.8, tension: 0.7 });
    for (const x of [28, 36, 44, 52, 60, 68]) s += k.line([[x + 2, 54], [x + 2, 82]], { color: '#4a3426', sw: 1.2, opacity: 0.25 });
    s += k.shape(k.ellipsePts(50, 48, 31, 10, 14), o.a, { wob: 0.9, sw: 2.8 });
    s += k.fill(k.ellipsePts(46, 47, 14, 4, 8), k.shade(o.a, -0.25), { opacity: 0.6, wob: 1.5 });
    return { body: s, face: [50, 68, 0.9], top: [50, 40, 34] };
  },
  stack(k, o) {
    let s = '';
    [84, 72, 60, 48].forEach((y, i) => {
      s += k.shape(k.ellipsePts(50, y, 37 - i, 10, 14), k.shade(o.c, -0.12), { wob: 1.2, sw: 2.8, sketch: false });
      s += k.fill(k.ellipsePts(50, y - 3, 35 - i, 8, 14), o.c, { wob: 1 });
    });
    s += k.shape(k.polyPts([[42, 38], [58, 38], [58, 48], [42, 48]]), o.a, { wob: 0.8, sw: 2.4, tension: 0.5, sketch: false });
    s += k.line([[30, 46], [26, 58], [28, 66]], { color: '#c98a45', sw: 4, opacity: 0.8 });
    return { body: s, face: [50, 70, 0.75], top: [50, 38, 40] };
  },
  flat(k, o) {
    let s = k.shape(k.ellipsePts(50, 58, 42, 24, 14), o.c, { wob: 2.4 });
    for (const [x, y, r] of [[30, 52, 4], [58, 46, 3], [68, 64, 4.5], [42, 68, 3], [52, 58, 2.5]]) s += k.fill(k.ellipsePts(x, y, r, r * 0.7, 7), o.a, { opacity: 0.6, wob: 0.8 });
    return { body: s, face: [50, 58, 1], top: [50, 44, 46] };
  },
  pretzel(k, o) {
    const d = 'M50 40 C34 16, 8 30, 16 58 C22 80, 44 84, 50 70 C56 84, 78 80, 84 58 C92 30, 66 16, 50 40 Z M50 40 C42 54, 34 64, 28 80 M50 40 C58 54, 66 64, 72 80';
    let s = `<path d="${d}" fill="none" stroke="#4a3426" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${o.c}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M24 46 C26 38, 32 34, 38 34" fill="none" stroke="#fff" stroke-width="2.5" opacity=".4" stroke-linecap="round"/>`;
    for (const [x, y] of [[22, 52], [36, 30], [64, 30], [80, 52], [44, 74], [58, 76], [30, 70]]) s += `<rect x="${x}" y="${y}" width="3" height="3" fill="${o.a}" transform="rotate(30 ${x} ${y})"/>`;
    return { body: s, face: null, top: [50, 30, 40] };
  },
  bottle(k, o) {
    let s = k.shape(k.rectPts(41, 14, 18, 30, 4), '#f4fafb', { wob: 0.7, sw: 2.8 });
    s += k.shape(k.rectPts(39, 8, 22, 9, 3), o.a, { wob: 0.6, sw: 2.6, sketch: false });
    s += k.shape(k.rectPts(29, 38, 42, 52, 12), o.c, { wob: 1 });
    s += k.fill(k.rectPts(33, 56, 34, 18, 4), '#fff8ec', { opacity: 0.8 });
    s += k.shine(35, 46, 2.5, 5, 0);
    return { body: s, face: [50, 64, 0.85], top: [50, 12, 26] };
  },
  cookie(k, o) {
    const pts = [];
    for (let i = 0; i < 20; i++) { const t = (i / 20) * PI * 2, r = i % 2 ? 33 : 36; pts.push([50 + cos(t) * r, 54 + sin(t) * r * 0.92]); }
    let s = k.shape(pts, o.c, { wob: 1, tension: 0.8 });
    s += k.fill(k.ellipsePts(50, 54, 25, 23, 12), k.shade(o.c, 0.12), { wob: 1 });
    for (const [x, y] of [[36, 40], [62, 38], [70, 60], [32, 64], [52, 72]]) s += `<circle cx="${x}" cy="${y}" r="1.8" fill="${o.a}"/>`;
    return { body: s, face: [50, 54, 1], top: [50, 40, 40] };
  },
  crumbs(k, o) {
    let s = '';
    for (let i = 0; i < 16; i++) {
      const x = 22 + k.rng() * 56, y = 52 + k.rng() * 30 - Math.abs(x - 50) * 0.35, r = 4 + k.rng() * 4;
      s += k.shape(k.ellipsePts(x, y, r, r * 0.8, 6), i % 3 ? o.c : o.a, { wob: 1.2, sw: 2, sketch: false });
    }
    return { body: s, face: null, top: [50, 46, 40] };
  },
  pizza(k, o) {
    let s = k.shape(k.ellipsePts(50, 54, 40, 36, 16), o.c, { wob: 1.6 });
    s += k.fill(k.ellipsePts(50, 54, 32, 28, 14), o.a, { wob: 1.6 });
    for (const [x, y] of [[38, 44], [60, 42], [64, 62], [42, 66], [50, 54]]) s += k.circle(x, y, 5, '#fbeec4', { sw: 1.8 });
    for (const [x, y] of [[48, 38], [70, 52], [34, 58], [56, 70]]) s += `<ellipse cx="${x}" cy="${y}" rx="3.5" ry="2" fill="#5f9e45" transform="rotate(30 ${x} ${y})"/>`;
    for (const a of [0.3, 1.9, 3.5, 5.1]) s += k.line([[50, 54], [50 + cos(a) * 36, 54 + sin(a) * 32]], { sw: 1.2, opacity: 0.35 });
    return { body: s, face: null, top: [50, 34, 40] };
  },
  eggSlices(k, o) {
    let s = '';
    for (const [x, y] of [[30, 62], [52, 54], [72, 66]]) {
      s += k.shape(k.ellipsePts(x, y, 17, 13, 12), o.c, { wob: 0.9, sw: 2.6, sketch: false });
      s += k.shape(k.ellipsePts(x, y, 8, 7, 9), o.a, { wob: 0.6, sw: 2, sketch: false });
    }
    return { body: s, face: [52, 55, 0.5], top: [50, 40, 40] };
  },
  sandwich(k, o) {
    let s = k.shape(k.polyPts([[16, 80], [84, 80], [50, 22]]), k.shade(o.c, -0.15), { wob: 1, tension: 0.6 });
    s += k.line([[20, 78], [36, 72], [50, 76], [66, 70], [82, 76]], { color: o.a, sw: 7 });
    s += k.line([[24, 72], [40, 66], [52, 70], [68, 64], [78, 70]], { color: '#79b55a', sw: 4 });
    s += k.shape(k.polyPts([[22, 70], [80, 70], [50, 18]]), o.c, { wob: 1, tension: 0.6 });
    s += k.line([[22, 70], [50, 18], [80, 70]], { color: '#d29a5a', sw: 4, opacity: 0.8 });
    return { body: s, face: [50, 52, 0.85], top: [50, 30, 30] };
  },
};

// ---------------- toppings (drawn on top of any shape) ----------------
const pat = (k, x, y, col) => `<g transform="rotate(-8 ${x} ${y})">` + k.shape(k.polyPts([[x - 8, y - 6], [x + 8, y - 6], [x + 8, y + 6], [x - 8, y + 6]]), col, { wob: 0.8, sw: 2.4, tension: 0.5, sketch: false }) + k.shine(x - 3, y - 2, 3, 1.5, 0) + '</g>';
const scatter = (k, [x, y, w], n, draw) => { let s = ''; for (let i = 0; i < n; i++) s += draw(x + (k.rng() - 0.5) * w, y + (k.rng() - 0.5) * w * 0.45, i); return s; };
const fluffy = (k, [x, y, w], col) => { let s = ''; for (const [dx, dy, r] of [[-10, 2, 9], [8, 3, 10], [0, -5, 9], [-2, 6, 8], [14, -3, 7]]) s += k.shape(k.ellipsePts(x + dx * w / 40, y + dy, r, r * 0.8, 8), col, { wob: 1.2, sw: 2, sketch: false }); return s; };
const noodles = (k, [x, y, w], col) => { let s = ''; for (let i = 0; i < 5; i++) { const yy = y - 4 + i * 2.5, ww = w * 0.6; s += k.line([[x - ww, yy], [x - ww / 2, yy - 4], [x, yy + 2], [x + ww / 2, yy - 3], [x + ww, yy]], { color: col, sw: 2.2, wob: 1.4 }); } return s; };
const specks = (k, a, col) => scatter(k, a, 9, (x, y) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.9" ry="1.2" fill="${col}" transform="rotate(${Math.round(k.rng() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
const sparkle = (x, y, r, col) => `<path d="M${x},${y - r} Q${x + r * 0.2},${y - r * 0.2} ${x + r},${y} Q${x + r * 0.2},${y + r * 0.2} ${x},${y + r} Q${x - r * 0.2},${y + r * 0.2} ${x - r},${y} Q${x - r * 0.2},${y - r * 0.2} ${x},${y - r}Z" fill="${col}" stroke="#4a3426" stroke-width="1.2" stroke-linejoin="round"/>`;

export const TOPPINGS = {
  pat: (k, [x, y], col) => pat(k, x, y, col),
  steam: (k, [x, y]) => ['-10', '2', '12'].map((dx, i) => k.line([[x + +dx, y - 2], [x + +dx - 3, y - 9], [x + +dx + 2, y - 16], [x + +dx - 1, y - 22]], { color: '#4a3426', sw: 2, opacity: 0.3, cls: `steam-wisp w${i}` })).join(''),
  noodles: (k, a, col) => noodles(k, a, col),
  noodlesSpecks: (k, a, col, o) => noodles(k, a, k.shade(o.f, -0.15)) + specks(k, a, col),
  sauce: (k, [x, y], col) => k.shape(k.ellipsePts(x, y - 2, 15, 7, 10), col, { wob: 2, sw: 2.4, sketch: false }) + `<ellipse cx="${x + 4}" cy="${y - 6}" rx="2.5" ry="1.4" fill="#79b55a"/>`,
  sparkle: (k, [x, y, w], col) => sparkle(x - w * 0.35, y - 4, 5, col) + sparkle(x + w * 0.3, y - 10, 4, col) + sparkle(x + w * 0.05, y + 6, 3.5, col),
  mound: (k, [x, y], col) => k.shape([[x - 24, y + 4], [x - 14, y - 10], [x, y - 16], [x + 14, y - 10], [x + 24, y + 4]], col, { wob: 1.5, sw: 2.6, sketch: false }),
  moundPat: (k, [x, y], col, o) => TOPPINGS.mound(k, [x, y], o.f) + pat(k, x + 2, y - 14, col),
  heart: (k, [x, y], col) => `<path d="M${x},${y - 2} c-3,-6 -11,-4 -10,2 c1,5 10,10 10,10 c0,0 9,-5 10,-10 c1,-6 -7,-8 -10,-2Z" fill="${col}" stroke="#4a3426" stroke-width="1.8" stroke-linejoin="round" transform="translate(0 -14)"/>`,
  specks: (k, a, col) => specks(k, a, col),
  swirl: (k, [x, y], col) => k.line([[x - 18, y + 4], [x - 6, y - 2], [x + 6, y + 3], [x + 2, y + 6], [x - 4, y + 3], [x + 14, y - 1]], { color: col, sw: 2.4, wob: 0.6 }),
  dots: (k, a, col) => scatter(k, a, 7, (x, y) => k.circle(x, y, 3.4, col, { sw: 1.6 })),
  dotsMix: (k, a, col) => scatter(k, a, 6, (x, y, i) => k.circle(x, y, 3.6, i % 2 ? '#79b55a' : col, { sw: 1.6 })),
  fluffy: (k, a, col) => fluffy(k, a, col),
  fluffySpecks: (k, a, col, o) => fluffy(k, a, o.f) + specks(k, a, col),
  char: (k, a, col) => scatter(k, a, 5, (x, y) => k.fill(k.ellipsePts(x, y, 3.5, 2.4, 6), col, { opacity: 0.6 })),
  foam: (k, [x, y, w], col) => { let s = ''; for (let i = 0; i < 5; i++) s += k.circle(x - w * 0.45 + (i * w * 0.9) / 4, y + 14 - (i % 2) * 3, 7, col, { sw: 2.2 }); return s; },
};
