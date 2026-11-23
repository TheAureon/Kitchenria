// season.js — the seasons follow your calendar: spring, summer, autumn and winter each bring
// their own view out of the window and a few seasonal ingredients to the pantry.
// (Players south of the equator can flip this in Decorate → Weather & light.)

import { state } from './state.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const FLIP = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' };

/** The season right now (?season=winter pretends it's winter up north, for testing). */
export function currentSeason(d = new Date()) {
  const force = location.search.match(/[?&]season=(\w+)/)?.[1];
  const m = d.getMonth(); // 0 = January
  const north = SEASONS.includes(force) ? force : m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  return state.settings.hemisphere === 'south' ? FLIP[north] : north;
}

/** Can this ingredient be found in the pantry right now? */
export const inSeason = (ing) => !ing.season || ing.season === currentSeason();
