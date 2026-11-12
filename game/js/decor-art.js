// decor-art.js — doodles for the kitchen decorations and the window views.
// Every function returns an <svg> string. Wallpapers and counters are CSS patterns
// (see "decor" in css/main.css); everything else is drawn here.

const INK = '#4a3426';
const S = (w = 2.4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const leaf = (x, y, rot, c = '#79b55a', s = 1) => `<ellipse cx="${x}" cy="${y}" rx="${6 * s}" ry="${3.5 * s}" fill="${c}" ${S(1.6)} transform="rotate(${rot} ${x} ${y})"/>`;

// ---------- hanging things (right of the rail), 70×110 ----------
const HANG = {
  fern: () => `<path d="M35 0 V22" ${S(2)}/><g class="sway">
    <path d="M18 50 Q8 70 14 92 M30 56 Q26 80 34 104 M50 52 Q62 72 56 96" fill="none" stroke="#5f9e45" stroke-width="3" stroke-linecap="round"/>
    ${leaf(13, 72, 60)}${leaf(16, 88, -50)}${leaf(29, 78, 70, '#8cc46c')}${leaf(34, 98, -60)}${leaf(59, 74, -60, '#8cc46c')}${leaf(56, 90, 50)}
    <path d="M14 30 H56 L52 54 Q35 60 18 54 Z" fill="#e2884f" ${S(2.6)}/><path d="M14 30 L35 22 L56 30" fill="none" ${S(1.6)}/></g>`,
  pothos: () => `<path d="M35 0 V22" ${S(2)}/><g class="sway">
    <path d="M22 52 Q14 76 22 104 M48 52 Q58 74 50 100 M35 56 Q36 70 32 84" fill="none" stroke="#4f8a3a" stroke-width="2.6" stroke-linecap="round"/>
    ${[[18, 66, 40], [22, 84, -30], [21, 100, 30], [54, 66, -40], [55, 82, 30], [50, 98, -20], [34, 74, 60]].map(([x, y, r], i) => `<path d="M${x} ${y} q-7 -6 0 -12 q7 6 0 12z" fill="${i % 2 ? '#79b55a' : '#a5d184'}" ${S(1.4)} transform="rotate(${r} ${x} ${y})"/>`).join('')}
    <path d="M16 32 H54 L50 54 Q35 60 20 54 Z" fill="#f2efe8" ${S(2.6)}/><path d="M16 32 L35 22 L54 32" fill="none" ${S(1.6)}/></g>`,
  lantern: () => `<path d="M35 0 V26" ${S(2)}/><g class="sway">
    <circle cx="35" cy="30" r="5" fill="none" ${S(2)}/>
    <path d="M22 40 H48 L52 46 V82 L48 88 H22 L18 82 V46 Z" fill="#f2b33a" ${S(2.6)}/>
    <rect x="24" y="48" width="22" height="32" rx="4" fill="#fff3c4" class="glow" ${S(1.6)}/>
    <path d="M35 58 q-5 8 0 14 q5 -6 0 -14" fill="#f79a3e"/><path d="M20 88 H50 L46 94 H24 Z" fill="#b98149" ${S(2)}/></g>`,
  garlic: () => `<path d="M35 0 V14" ${S(2)}/><g class="sway">
    <path d="M35 14 Q30 50 35 100" fill="none" stroke="#c9a66b" stroke-width="4"/>
    ${[22, 38, 54, 70, 86].map((y, i) => `<path d="M${35 + (i % 2 ? 6 : -6)} ${y} q-9 2 -9 10 q0 8 9 8 q9 0 9 -8 q0 -8 -9 -10z" fill="#f4eee2" ${S(1.8)}/><path d="M${35 + (i % 2 ? 6 : -6)} ${y + 2} v14" stroke="#c9b8a0" stroke-width="1.2"/>`).join('')}
    <path d="M30 100 l5 8 l5 -8" fill="none" ${S(2)}/></g>`,
  chimes: () => `<path d="M35 0 V16" ${S(2)}/><g class="sway">
    <ellipse cx="35" cy="20" rx="20" ry="5" fill="#b98149" ${S(2.2)}/>
    ${[[20, 52, '#7fb6d6'], [30, 62, '#f2b33a'], [40, 58, '#e8584c'], [50, 48, '#79b55a']].map(([x, len, c]) => `<path d="M${x} 22 V${30}" ${S(1.2)}/><rect x="${x - 3}" y="30" width="6" height="${len - 30}" rx="3" fill="${c}" ${S(1.8)}/>`).join('')}
    <path d="M35 22 V76" ${S(1.2)}/><path d="M30 76 h10 l-5 12 z" fill="#f6d2b8" ${S(1.8)}/></g>`,
  mushroom_lamp: () => `<path d="M35 0 V30" ${S(2)}/><g class="sway">
    <path d="M10 56 Q12 32 35 30 Q58 32 60 56 Z" fill="#e8584c" ${S(2.6)}/>
    <circle cx="24" cy="44" r="4" fill="#fff"/><circle cx="40" cy="38" r="3.5" fill="#fff"/><circle cx="50" cy="48" r="3" fill="#fff"/>
    <ellipse cx="35" cy="58" rx="16" ry="6" fill="#fff3c4" class="glow" ${S(2)}/></g>`,
  honey_lantern: () => `<path d="M35 0 V24" ${S(2)}/><g class="sway">
    <path d="M24 30 H46 V38 H24 Z" fill="#b98149" ${S(2.2)}/>
    <path d="M18 40 Q16 60 22 80 Q35 88 48 80 Q54 60 52 40 Z" fill="#f2b33a" class="glow" ${S(2.6)}/>
    <path d="M22 56 q13 6 26 0" fill="none" stroke="#e2884f" stroke-width="2"/><text x="35" y="74" text-anchor="middle" font-size="12" fill="${INK}">HONEY</text></g>`,
};

// ---------- things on the window sill, 60×50 ----------
const SILL = {
  none: () => '',
  herbpot: () => `<path d="M30 32 q-10 -16 -6 -26 M30 32 q2 -18 8 -26 M30 32 q10 -12 14 -18" fill="none" stroke="#5f9e45" stroke-width="2.4" stroke-linecap="round"/>${leaf(24, 8, -60)}${leaf(38, 7, 60)}${leaf(44, 15, 30, '#8cc46c')}
    <path d="M17 30 H43 L40 48 H20 Z" fill="#e2884f" ${S()}/>`,
  cactus: () => `<path d="M24 34 V10 q6 -8 12 0 V34 M24 22 h-6 v-8 M36 18 h6 v-6" fill="#79b55a" ${S()}/><path d="M18 14 v8 h6 M42 12 v6 h-6" fill="none" ${S()}/>
    <circle cx="30" cy="6" r="3.5" fill="#f28b8b" ${S(1.4)}/><path d="M17 32 H43 L40 48 H20 Z" fill="#c9774a" ${S()}/>`,
  candle: () => `<path d="M30 6 q-5 7 0 12 q5 -5 0 -12" fill="#f79a3e" class="flicker" ${S(1.2)}/><rect x="24" y="18" width="12" height="22" rx="2" fill="#fff6e6" ${S()}/>
    <ellipse cx="30" cy="44" rx="16" ry="5" fill="#d9a66b" ${S()}/>`,
  teapot: () => `<path d="M14 26 Q14 46 30 46 Q46 46 46 26 Z" fill="#7fb6d6" ${S()}/><path d="M46 30 q10 -2 10 -10" fill="none" ${S(3)}/><path d="M14 30 q-8 2 -8 8 q2 4 8 2" fill="none" ${S(2.6)}/>
    <ellipse cx="30" cy="26" rx="16" ry="4" fill="#9fd3ea" ${S(2)}/><circle cx="30" cy="20" r="3" fill="#f2b33a" ${S(1.6)}/>`,
  flowers: () => `${[[22, 10, '#f28b8b'], [32, 6, '#f2b33a'], [40, 12, '#b9a3e3']].map(([x, y, c]) => `<path d="M${x} ${y + 4} L30 34" stroke="#5f9e45" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="${c}" ${S(1.6)}/><circle cx="${x}" cy="${y}" r="1.6" fill="#fff6e6"/>`).join('')}
    <path d="M20 30 H40 Q42 48 30 48 Q18 48 20 30 Z" fill="#dceff7" ${S()}/>`,
  birdhouse: () => `<path d="M12 22 L30 6 L48 22" fill="#e8584c" ${S()}/><rect x="16" y="20" width="28" height="26" rx="2" fill="#e2c48a" ${S()}/><circle cx="30" cy="32" r="5" fill="${INK}"/>
    <path d="M30 40 v6" ${S(2)}/>`,
  lily_pot: () => `<ellipse cx="30" cy="40" rx="22" ry="8" fill="#7fb6d6" ${S()}/><ellipse cx="22" cy="38" rx="10" ry="4" fill="#79b55a" ${S(1.8)}/>
    <path d="M36 34 q-4 -10 2 -14 q6 4 2 14 z M36 34 q-10 -4 -10 -12 q8 0 10 12 z M36 34 q10 -4 10 -12 q-8 0 -10 12 z" fill="#f6c2d0" ${S(1.6)}/>`,
  rubber_duck: () => `<path d="M10 34 Q12 46 30 46 Q50 46 50 34 Q50 26 40 26 Q44 14 34 10 Q22 8 22 20 Q14 22 10 34 Z" fill="#f6d047" ${S()}/>
    <circle cx="32" cy="18" r="2.4" fill="${INK}"/><path d="M40 18 l10 2 l-8 5" fill="#f08a3c" ${S(1.8)}/>`,
};

// ---------- framed things on the wall, 70×80 ----------
const nail = `<path d="M35 4 L18 22 M35 4 L52 22" ${S(1.4)}/><circle cx="35" cy="4" r="2.4" fill="${INK}"/>`;
const FRAME = {
  noframe: () => '',
  fruitart: () => `${nail}<rect x="10" y="20" width="50" height="54" rx="3" fill="#d9a66b" ${S()}/><rect x="16" y="26" width="38" height="42" fill="#fff6e6"/>
    <circle cx="30" cy="52" r="8" fill="#e8584c" ${S(1.6)}/><circle cx="42" cy="54" r="7" fill="#f2b33a" ${S(1.6)}/><path d="M28 38 q8 -6 12 4" fill="#79b55a" ${S(1.4)}/>`,
  catportrait: () => `${nail}<ellipse cx="35" cy="48" rx="25" ry="28" fill="#b98149" ${S()}/><ellipse cx="35" cy="48" rx="19" ry="22" fill="#fbe9cf"/>
    <path d="M23 46 l2 -12 l8 7 z M47 46 l-2 -12 l-8 7 z" fill="#c9c2bb" ${S(1.4)}/><circle cx="35" cy="52" r="11" fill="#ddd6cf" ${S(1.6)}/>
    <path d="M29 50 q2 -2 4 0 M37 50 q2 -2 4 0" fill="none" ${S(1.4)}/><path d="M24 40 q10 -10 22 0 q-10 -3 -22 0z" fill="#d9412e" ${S(1.2)}/>`,
  clock: () => {
    const d = new Date(), h = (d.getHours() % 12) + d.getMinutes() / 60, m = d.getMinutes();
    const hand = (len, ang) => `L${(35 + Math.sin(ang) * len).toFixed(1)} ${(48 - Math.cos(ang) * len).toFixed(1)}`;
    return `${nail}<circle cx="35" cy="48" r="26" fill="#fff6e6" ${S(3)}/>${[0, 1, 2, 3].map((i) => `<circle cx="${35 + Math.sin(i * Math.PI / 2) * 20}" cy="${48 - Math.cos(i * Math.PI / 2) * 20}" r="2" fill="${INK}"/>`).join('')}
      <path class="clock-hands" d="M35 48 ${hand(12, h / 12 * Math.PI * 2)} M35 48 ${hand(18, m / 60 * Math.PI * 2)}" ${S(2.4)}/><circle cx="35" cy="48" r="2.4" fill="#e8584c"/>`;
  },
  recipecard: () => `${nail}<rect x="12" y="20" width="46" height="54" rx="3" fill="#fffaf0" ${S()} transform="rotate(-4 35 47)"/>
    <path d="M20 34 h28 M20 44 h24 M20 52 h28 M20 60 h18" stroke="#c9b8a0" stroke-width="2" transform="rotate(-4 35 47)"/><circle cx="46" cy="64" r="5" fill="#e8584c" opacity=".7"/>`,
  cheese_clock: () => {
    const d = new Date(), m = d.getMinutes(), h = (d.getHours() % 12) + m / 60;
    const hand = (len, ang) => `L${(35 + Math.sin(ang) * len).toFixed(1)} ${(52 - Math.cos(ang) * len).toFixed(1)}`;
    return `${nail}<path d="M8 72 L35 22 L62 72 Z" fill="#f6c94c" ${S(3)}/><circle cx="24" cy="62" r="4" fill="#e2a92e"/><circle cx="46" cy="64" r="3" fill="#e2a92e"/>
      <path class="clock-hands" d="M35 52 ${hand(9, h / 12 * Math.PI * 2)} M35 52 ${hand(13, m / 60 * Math.PI * 2)}" ${S(2.2)}/><circle cx="35" cy="52" r="2" fill="${INK}"/>`;
  },
  autumn_wreath: () => `${nail}${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return leaf(35 + Math.sin(a) * 20, 48 - Math.cos(a) * 20, a * 57 + 90, ['#e8843c', '#d9412e', '#f2b33a'][i % 3], 1.3); }).join('')}
    <path d="M28 66 l7 6 l7 -6" fill="#e8584c" ${S(1.6)}/>`,
};

// ---------- strings of lights across the top of the wall, 1000×40 ----------
const LIGHTS = {
  nolights: () => '',
  fairy: () => `<path d="M0 6 Q250 34 500 12 Q750 34 1000 6" fill="none" ${S(2)}/>${Array.from({ length: 15 }, (_, i) => { const x = 30 + i * 67; const y = 10 + Math.sin((x / 1000) * Math.PI * 2) * 3 + (i % 2 ? 12 : 8) + 8 * Math.sin((x / 500) * Math.PI); return `<circle class="bulb" style="--i:${i}" cx="${x}" cy="${y.toFixed(1)}" r="5" fill="hsl(${i * 47} 85% 70%)" ${S(1.8)}/>`; }).join('')}`,
  bunting: () => `<path d="M0 6 Q250 26 500 10 Q750 26 1000 6" fill="none" ${S(2)}/>${Array.from({ length: 16 }, (_, i) => { const x = 20 + i * 62; const y = 8 + 10 * Math.sin((x / 500) * Math.PI); return `<path d="M${x - 14} ${y.toFixed(1)} L${x + 14} ${y.toFixed(1)} L${x} ${(y + 22).toFixed(1)} Z" fill="${['#e8584c', '#f2b33a', '#7fb6d6', '#79b55a'][i % 4]}" ${S(1.6)}/>`; }).join('')}`,
  carrot_garland: () => `<path d="M0 6 Q250 26 500 10 Q750 26 1000 6" fill="none" stroke="#5f9e45" stroke-width="2.6"/>${Array.from({ length: 14 }, (_, i) => { const x = 36 + i * 70; const y = 10 + 10 * Math.sin((x / 500) * Math.PI); return `<path d="M${x - 6} ${y.toFixed(1)} L${x + 6} ${y.toFixed(1)} L${x} ${(y + 24).toFixed(1)} Z" fill="#f08a3c" ${S(1.6)}/><path d="M${x} ${y.toFixed(1)} l-4 -7 M${x} ${y.toFixed(1)} l4 -7" stroke="#5f9e45" stroke-width="2"/>`; }).join('')}`,
};

// ---------- the view out of the window, inside a 160×110 frame ----------
const VIEWS = {
  meadow: () => `<path d="M8 74 Q40 58 80 70 Q120 82 152 64 V102 H8 Z" fill="#a5d184"/><path d="M8 86 Q60 72 152 84 V102 H8 Z" fill="#79b55a"/>`,
  sea: () => `<path d="M8 66 H152 V102 H8 Z" fill="#7fb6d6"/><path d="M8 72 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="2" opacity=".7" class="waves"/>
    <path d="M100 66 l12 -22 v22 z" fill="#fff6e6" ${S(1.6)}/><path d="M94 66 h28 l-4 6 h-20 z" fill="#e8584c" ${S(1.6)}/><path d="M40 30 q4 -4 8 0 q4 -4 8 0" fill="none" ${S(1.6)}/>`,
  snow: () => `<path d="M8 80 Q60 66 152 78 V102 H8 Z" fill="#f4fafb"/>${[[30, 82], [50, 76], [122, 80], [140, 84]].map(([x, y]) => `<path d="M${x} ${y - 30} L${x - 12} ${y} H${x + 12} Z" fill="#4f8a3a" ${S(1.6)}/><path d="M${x} ${y - 30} L${x - 6} ${y - 16} H${x + 6} Z" fill="#fff"/>`).join('')}
    <g class="snowfall">${Array.from({ length: 18 }, (_, i) => `<circle cx="${12 + (i * 37) % 140}" cy="${10 + (i * 23) % 60}" r="1.8" fill="#fff"/>`).join('')}</g>`,
  blossom: () => `<path d="M20 74 L60 34 L100 74 Z" fill="#b9c6e8" opacity=".8"/><path d="M48 46 L60 34 L72 46 Q60 50 48 46 Z" fill="#fff"/>
    <path d="M8 84 Q80 74 152 86 V102 H8 Z" fill="#a5d184"/>
    <path d="M152 18 Q120 24 100 40 M122 26 q-6 10 -2 18" fill="none" stroke="#7a4a2e" stroke-width="3.5" stroke-linecap="round"/>
    ${[[104, 38], [112, 32], [124, 28], [132, 22], [118, 44], [140, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f6c2d0" ${S(1.2)}/>`).join('')}`,
};

export function windowSvg(view = 'meadow', skyTop = '#bfe3f2', skyBottom = '#fbe9cf') {
  return `<svg class="window" aria-hidden="true" viewBox="0 0 160 110">
    <defs><linearGradient id="sky-${view}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>
    <clipPath id="glass-${view}"><rect x="8" y="8" width="144" height="94" rx="10"/></clipPath></defs>
    <rect x="8" y="8" width="144" height="94" rx="10" fill="url(#sky-${view})"/>
    <g clip-path="url(#glass-${view})">
      <circle cx="128" cy="28" r="9" fill="#ffd77a" opacity=".9"/>
      <g class="cloud"><ellipse cx="44" cy="36" rx="16" ry="7" fill="#fff"/><ellipse cx="54" cy="31" rx="10" ry="7" fill="#fff"/></g>
      ${(VIEWS[view] || VIEWS.meadow)()}
    </g>
    <rect x="8" y="8" width="144" height="94" rx="10" fill="none" stroke="${INK}" stroke-width="3.5"/>
    <path d="M80 9 V101 M9 55 H151" stroke="${INK}" stroke-width="3.5"/>
    <path d="M2 100 H158" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M3 99 H157" stroke="#d9a66b" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

/** The doodle for a decoration (for the scene and for the shop). */
export function decorSvg(slot, id) {
  const box = { hang: '0 0 70 110', sill: '0 0 60 50', frame: '0 0 70 80', lights: '0 0 1000 40' }[slot];
  const draw = { hang: HANG, sill: SILL, frame: FRAME, lights: LIGHTS }[slot]?.[id];
  if (!box || !draw) return '';
  const inner = draw();
  if (!inner) return '';
  return `<svg class="decor decor-${slot}" viewBox="${box}" ${slot === 'lights' ? 'preserveAspectRatio="none"' : ''} aria-hidden="true">${inner}</svg>`;
}

/** A small preview of a window view for the shop. */
export const viewPreview = (view) => windowSvg(view);
