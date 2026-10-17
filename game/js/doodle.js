// doodle.js — turns an item's "art" description into a hand-drawn looking SVG.
//
// How it works:
//  * Every item has art like { shape: "apple", color: "#e8584c", accent: "#7cb35b" }.
//  * shapes.js knows how to draw each shape out of a few points.
//  * Before drawing, every point gets nudged a little by a random number generator
//    that is "seeded" with the item id, so the wobble is unique per item but
//    always the same every time the game is opened.
//  * If art.image is set (e.g. "art/items/apple.png") that picture is used instead,
//    so you can replace any doodle with your own artwork.

import { SHAPES, TOPPINGS } from './shapes.js';

export const INK = '#4a3426'; // the warm brown "pen" colour used for outlines

// ---------- tiny seeded random numbers ----------
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function makeRng(seed) {
  let a = hashString(String(seed));
  return () => { // mulberry32
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour helpers ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mix a colour towards white (amt > 0) or black (amt < 0). amt in -1..1 */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  const m = (c) => Math.round(c + (t - c) * p).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

// ---------- geometry helpers ----------
const r1 = (n) => Math.round(n * 10) / 10;

/** Nudge every point a little so lines look hand drawn. */
export function jitter(pts, rng, amt = 1.6) {
  return pts.map(([x, y]) => [x + (rng() - 0.5) * 2 * amt, y + (rng() - 0.5) * 2 * amt]);
}
/** Smooth closed curve through points (Catmull-Rom converted to Bézier curves). */
export function smoothClosed(pts, tension = 1) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension, c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension, c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C${r1(c1x)},${r1(c1y)} ${r1(c2x)},${r1(c2y)} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d + 'Z';
}
/** Smooth open curve (for lines, stems, squiggles). */
export function smoothOpen(pts) {
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])},${r1(p2[1])}`;
  }
  return d;
}
/** Points around an ellipse. */
export function ellipsePts(cx, cy, rx, ry, n = 12, start = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = start + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return out;
}
/** Points around a rounded rectangle (good for boxes, jars, cartons). */
export function rectPts(x, y, w, h, r = 6) {
  r = Math.min(r, w / 2, h / 2);
  const out = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 2; i++) { const a = a0 + (i / 2) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); out.push([x + w, y + h / 2]);
  corner(x + w - r, y + h - r, 0); out.push([x + w / 2, y + h]);
  corner(x + r, y + h - r, Math.PI / 2); out.push([x, y + h / 2]);
  corner(x + r, y + r, Math.PI); out.push([x + w / 2, y]);
  return out;
}
/** Polygon with straight-ish edges: corners are kept but edges get extra wobbly points. */
export function polyPts(pts, steps = 2) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    for (let s = 0; s < steps; s++) out.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
  }
  return out;
}

/**
 * The drawing kit handed to every shape. All functions return SVG strings.
 * "shape" fills an outline and adds a faint second pencil line for a sketchy look.
 */
export function makeKit(rng) {
  const kit = {
    rng, INK, shade, ellipsePts, rectPts, polyPts, jitter, smoothClosed, smoothOpen,
    /** Filled, outlined wobbly shape. */
    shape(pts, fill, { wob = 1.5, sw = 3.2, tension = 1, sketch = true, stroke = INK, extra = '' } = {}) {
      const d = smoothClosed(jitter(pts, rng, wob), tension);
      let s = `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
      if (sketch) s += `<path d="${smoothClosed(jitter(pts, rng, wob * 1.4), tension)}" fill="none" stroke="${stroke}" stroke-width="1.1" opacity=".28"/>`;
      return s;
    },
    /** Filled shape with no outline (shading, highlights, contents). */
    fill(pts, fill, { wob = 1.2, opacity = 1, tension = 1 } = {}) {
      return `<path d="${smoothClosed(jitter(pts, rng, wob), tension)}" fill="${fill}" opacity="${opacity}"/>`;
    },
    /** Wobbly open line. */
    line(pts, { color = INK, sw = 3, wob = 1, opacity = 1, cls = '' } = {}) {
      return `<path ${cls ? `class="${cls}"` : ''} d="${smoothOpen(jitter(pts, rng, wob))}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
    },
    circle(cx, cy, r, fill, { outline = true, sw = 2.6, wob = 0.8 } = {}) {
      const n = r < 6 ? 7 : 10;
      return outline ? kit.shape(ellipsePts(cx, cy, r, r, n), fill, { wob, sw, sketch: false }) : kit.fill(ellipsePts(cx, cy, r, r, n), fill, { wob });
    },
    /** Soft white shine in the top-left of a shape. */
    shine(cx, cy, rx = 6, ry = 3.5, rot = -30) {
      return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${r1(cx)} ${r1(cy)})" fill="#fff" opacity=".55"/>`;
    },
  };
  return kit;
}

/** A tiny happy face: two dot eyes, a smile and rosy cheeks. */
function face(x, y, s = 1) {
  const e = 4.2 * s, ry = 2.6 * s;
  return `<g class="face">
    <ellipse cx="${r1(x - 7 * s)}" cy="${r1(y + 3.5 * s)}" rx="${r1(3.4 * s)}" ry="${r1(2 * s)}" fill="#f28b8b" opacity=".55"/>
    <ellipse cx="${r1(x + 7 * s)}" cy="${r1(y + 3.5 * s)}" rx="${r1(3.4 * s)}" ry="${r1(2 * s)}" fill="#f28b8b" opacity=".55"/>
    <ellipse class="eye" cx="${r1(x - e)}" cy="${r1(y - 1)}" rx="${r1(1.5 * s)}" ry="${r1(ry)}" fill="${INK}"/>
    <ellipse class="eye" cx="${r1(x + e)}" cy="${r1(y - 1)}" rx="${r1(1.5 * s)}" ry="${r1(ry)}" fill="${INK}"/>
    <path d="M${r1(x - 2.6 * s)},${r1(y + 2.6 * s)} Q${r1(x)},${r1(y + 5.4 * s)} ${r1(x + 2.6 * s)},${r1(y + 2.6 * s)}" fill="none" stroke="${INK}" stroke-width="${r1(1.5 * s)}" stroke-linecap="round"/>
  </g>`;
}

const cache = new Map();
const r2 = (n) => Math.round(n * 10) / 10;

/** The inside of a doodle (no outer <svg>), so doodles can be nested into portraits. */
export function artInner(art = {}, seed = 'x', type = '') {
  if (art.image) return `<image href="${art.image}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  const rng = makeRng(seed);
  const kit = makeKit(rng);
  const draw = SHAPES[art.shape] || SHAPES.blob;
  const opts = {
    c: art.color || '#e9d3a8',
    a: art.accent || shade(art.color || '#e9d3a8', -0.25),
    f: art.fill || art.accent || '#f5d779',
    color: art.color,
    round: !!art.round,
  };
  const out = draw(kit, opts);
  let inner = out.body;
  const anchor = out.top || [50, 46, 34];
  if (art.top && TOPPINGS[art.top]) inner += TOPPINGS[art.top](kit, anchor, art.topColor || '#ffffff', opts);
  const wantsFace = art.face ?? (type !== 'tool');
  if (wantsFace && out.face) inner += face(...out.face);
  if (art.emoji) inner += `<text x="50" y="62" font-size="34" text-anchor="middle">${art.emoji}</text>`;
  return inner;
}

/**
 * A "painted portrait" of a plated dish for the critic: a soft backdrop, a plate,
 * the main food big in the middle and the sides tucked in front.
 */
function portraitInner(art, seed) {
  const rng = makeRng(seed + 'p');
  const kit = makeKit(rng);
  const layers = art.layers || [];
  let s = `<rect x="2" y="2" width="96" height="96" rx="14" fill="#fbe9cf"/>`;
  s += `<path d="M2 62 H98 V84 Q98 98 84 98 H16 Q2 98 2 84 Z" fill="#e8b88a" opacity=".55"/>`;
  s += `<circle cx="78" cy="20" r="12" fill="#fff6dc" opacity=".8"/>`;
  s += kit.shape(ellipsePts(50, 72, 44, 17, 18), '#f7f3ea', { wob: 0.8, sw: 2.6 });
  s += kit.fill(ellipsePts(50, 71, 34, 12, 14), '#efe8da', { wob: 0.6 });
  const spots = [[50, 46, 62], [22, 64, 34], [78, 64, 34], [50, 74, 26]];
  const order = layers.length > 1 ? [1, 2, 3, 0].filter((i) => i < layers.length) : [0];
  for (const i of order) {
    const [cx, cy, size] = spots[i];
    const lay = layers[i];
    const shadow = `<ellipse cx="${cx}" cy="${r2(cy + size * 0.42)}" rx="${r2(size * 0.36)}" ry="${r2(size * 0.08)}" fill="#4a3426" opacity=".12"/>`;
    s += shadow + `<svg x="${r2(cx - size / 2)}" y="${r2(cy - size / 2)}" width="${size}" height="${size}" viewBox="0 0 100 100" overflow="visible">${artInner({ ...lay, face: i === 0 ? lay.face : false }, seed + i)}</svg>`;
  }
  if (art.hot) for (const [x, c] of [[40, ''], [52, ' w1'], [64, ' w2']]) s += kit.line([[x, 18], [x - 3, 11], [x + 2, 5]], { color: '#4a3426', sw: 1.6, opacity: 0.28, cls: `steam-wisp${c}` });
  s += `<rect x="2" y="2" width="96" height="96" rx="14" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
  return s;
}

/**
 * Returns the HTML (an <svg> or <img>) for one item. Results are cached by item id.
 * @param {object} item  an ingredient, creation or plated dish (anything with id + art)
 */
export function renderArt(item) {
  if (cache.has(item.id)) return cache.get(item.id);
  const art = item.art || {};
  let html;
  if (art.image) {
    // Your own artwork wins. Square PNG/SVG/WebP images around 256×256 look best.
    html = `<img class="doodle doodle-img" src="${art.image}" alt="" draggable="false" loading="lazy">`;
  } else {
    const inner = art.shape === 'portrait' ? portraitInner(art, item.id) : artInner(art, item.id, item.type);
    html = `<svg class="doodle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
  }
  cache.set(item.id, html);
  return html;
}

/** Draws any art description directly (used for tools, which aren't items). */
export function renderArtRaw(art, seed, type = '') {
  return `<svg class="doodle" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${artInner(art, seed, type)}</svg>`;
}
