// animals.js — the visiting friends, drawn in code: hedgehog, robin, mouse, bunny,
// fox, frog, duck and bear. Each can look 'wait' (hopeful), 'happy' or 'hmm'.

const INK = '#4a3426';
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

function eyes(mood, x1 = 38, x2 = 62, y = 52, size = 1) {
  if (mood === 'happy') return `<path d="M${x1 - 5} ${y} q5 -6 10 0 M${x2 - 5} ${y} q5 -6 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const r = 3.4 * size, ry = 4.6 * size;
  const look = mood === 'hmm' ? 2 : 0;
  return `<ellipse cx="${x1 + look}" cy="${y}" rx="${r}" ry="${ry}" fill="${INK}"/><ellipse cx="${x2 + look}" cy="${y}" rx="${r}" ry="${ry}" fill="${INK}"/>
    <circle cx="${x1 + look + 1.2}" cy="${y - 1.8}" r="1.2" fill="#fff"/><circle cx="${x2 + look + 1.2}" cy="${y - 1.8}" r="1.2" fill="#fff"/>`;
}
const cheeks = (x1 = 34, x2 = 66, y = 62) => `<ellipse cx="${x1}" cy="${y}" rx="5.5" ry="3" fill="#f28b8b" opacity=".55"/><ellipse cx="${x2}" cy="${y}" rx="5.5" ry="3" fill="#f28b8b" opacity=".55"/>`;
function mouth(mood, x = 50, y = 66) {
  if (mood === 'happy') return `<path d="M${x - 6} ${y} q6 7 12 0" fill="#f28b8b" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  if (mood === 'hmm') return `<path d="M${x - 5} ${y + 2} q5 -3 10 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `<path d="M${x - 4} ${y} q4 4 8 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
}

const ANIMALS = {
  hedgehog(m) {
    let spikes = '';
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (1.05 + i * 0.09), x = 50 + Math.cos(a) * 40, y = 58 + Math.sin(a) * 36;
      const x2 = 50 + Math.cos(a) * 50, y2 = 58 + Math.sin(a) * 46;
      spikes += `<path d="M${(x - 5).toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(x + 5).toFixed(1)} ${(y + 2).toFixed(1)}" fill="#8a5c3a" ${S}/>`;
    }
    return `${spikes}<ellipse cx="50" cy="60" rx="38" ry="31" fill="#b98a5e" ${S}/>
      <ellipse cx="50" cy="64" rx="27" ry="23" fill="#f3dcc0"/>
      <circle cx="30" cy="36" r="6" fill="#f3dcc0" ${S}/><circle cx="70" cy="36" r="6" fill="#f3dcc0" ${S}/>
      ${eyes(m, 40, 60, 56)}${cheeks(33, 67, 65)}
      <ellipse cx="50" cy="66" rx="5" ry="3.6" fill="${INK}"/>${mouth(m, 50, 72)}`;
  },
  robin(m) {
    return `<ellipse cx="50" cy="58" rx="36" ry="33" fill="#a0704a" ${S}/>
      <ellipse cx="50" cy="70" rx="24" ry="19" fill="#e8704a"/>
      <path d="M44 26 q4 -14 12 -8 q-6 2 -6 9" fill="#a0704a" ${S}/>
      ${eyes(m, 38, 62, 50)}
      <path d="M44 58 L56 58 L50 68 Z" fill="#f2b33a" ${S}/>
      ${m === 'happy' ? '<path d="M45 70 q5 4 10 0" fill="none" stroke="#4a3426" stroke-width="2" stroke-linecap="round"/>' : ''}`;
  },
  mouse(m) {
    return `<circle cx="22" cy="34" r="17" fill="#c9c2bb" ${S}/><circle cx="22" cy="34" r="10" fill="#f2b8c0"/>
      <circle cx="78" cy="34" r="17" fill="#c9c2bb" ${S}/><circle cx="78" cy="34" r="10" fill="#f2b8c0"/>
      <ellipse cx="50" cy="60" rx="32" ry="28" fill="#ddd6cf" ${S}/>
      ${eyes(m, 39, 61, 54)}${cheeks(31, 69, 64)}
      <ellipse cx="50" cy="66" rx="4.5" ry="3.4" fill="#e88a95" ${S}/>
      <path d="M30 66 h-16 M30 71 l-14 4 M70 66 h16 M70 71 l14 4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>${mouth(m, 50, 72)}`;
  },
  bunny(m) {
    return `<ellipse cx="36" cy="22" rx="9" ry="24" fill="#f1ece4" ${S} transform="rotate(-10 36 22)"/><ellipse cx="36" cy="22" rx="4.5" ry="17" fill="#f2b8c0" transform="rotate(-10 36 22)"/>
      <ellipse cx="64" cy="22" rx="9" ry="24" fill="#f1ece4" ${S} transform="rotate(12 64 22)"/><ellipse cx="64" cy="22" rx="4.5" ry="17" fill="#f2b8c0" transform="rotate(12 64 22)"/>
      <ellipse cx="50" cy="62" rx="32" ry="28" fill="#f1ece4" ${S}/>
      ${eyes(m, 39, 61, 56)}${cheeks(31, 69, 66)}
      <path d="M46 64 h8 l-4 4 z" fill="#e88a95" ${S}/>${mouth(m, 50, 72)}`;
  },
  fox(m) {
    return `<path d="M20 44 L18 12 L42 30 Z M80 44 L82 12 L58 30 Z" fill="#e8843c" ${S}/>
      <path d="M22 36 L21 20 L33 30 Z M78 36 L79 20 L67 30 Z" fill="#4a3426"/>
      <path d="M14 46 Q50 20 86 46 Q84 80 50 90 Q16 80 14 46 Z" fill="#e8843c" ${S}/>
      <path d="M26 62 Q50 54 74 62 Q66 86 50 90 Q34 86 26 62 Z" fill="#fff6ea"/>
      ${eyes(m, 38, 62, 54)}
      <ellipse cx="50" cy="74" rx="5" ry="3.6" fill="${INK}"/>${mouth(m, 50, 80)}`;
  },
  frog(m) {
    return `<circle cx="30" cy="34" r="15" fill="#79b55a" ${S}/><circle cx="70" cy="34" r="15" fill="#79b55a" ${S}/>
      <circle cx="30" cy="34" r="9" fill="#fff"/><circle cx="70" cy="34" r="9" fill="#fff"/>
      <ellipse cx="50" cy="64" rx="40" ry="27" fill="#79b55a" ${S}/>
      ${m === 'happy' ? `<path d="M24 35 q6 -6 12 0 M64 35 q6 -6 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
        : `<circle cx="${m === 'hmm' ? 32 : 30}" cy="35" r="4.5" fill="${INK}"/><circle cx="${m === 'hmm' ? 72 : 70}" cy="35" r="4.5" fill="${INK}"/>`}
      ${cheeks(28, 72, 66)}
      <path d="M28 66 Q50 ${m === 'happy' ? 84 : m === 'hmm' ? 70 : 78} 72 66" fill="${m === 'happy' ? '#f28b8b' : 'none'}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  },
  duck(m) {
    return `<path d="M50 14 q-4 8 0 10 q6 -6 10 -2" fill="#f6d047" ${S}/>
      <ellipse cx="50" cy="56" rx="34" ry="34" fill="#f6d047" ${S}/>
      ${eyes(m, 38, 62, 48)}${cheeks(30, 70, 60)}
      <path d="M34 62 Q50 54 66 62 Q60 74 50 74 Q40 74 34 62 Z" fill="#f08a3c" ${S}/>
      <path d="M38 64 q12 4 24 0" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  },
  bear(m) {
    return `<circle cx="24" cy="30" r="13" fill="#a8703f" ${S}/><circle cx="24" cy="30" r="6" fill="#e2c49a"/>
      <circle cx="76" cy="30" r="13" fill="#a8703f" ${S}/><circle cx="76" cy="30" r="6" fill="#e2c49a"/>
      <ellipse cx="50" cy="58" rx="36" ry="32" fill="#a8703f" ${S}/>
      <ellipse cx="50" cy="70" rx="16" ry="12" fill="#e2c49a"/>
      ${eyes(m, 37, 63, 52)}${cheeks(28, 72, 62)}
      <ellipse cx="50" cy="65" rx="5.5" ry="4" fill="${INK}"/>${mouth(m, 50, 74)}`;
  },
};

/** An animal friend's face as an <svg>. kind: hedgehog, robin… mood: 'wait' | 'happy' | 'hmm' */
export function animalFace(kind, mood = 'wait') {
  const draw = ANIMALS[kind] || ANIMALS.mouse;
  return `<svg class="animal-face" viewBox="0 0 100 100" aria-hidden="true">${draw(mood)}</svg>`;
}

/** A plain shadow of a friend you haven't met yet. */
export function animalSilhouette(kind) {
  return `<svg class="animal-face silhouette" viewBox="0 0 100 100" aria-hidden="true"><g opacity=".22" style="filter: grayscale(1) brightness(.2)">${(ANIMALS[kind] || ANIMALS.mouse)('wait')}</g></svg>`;
}
