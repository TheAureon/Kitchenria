// ai.js — the optional Kitchen Helper AI.
//
// What it does: gives creative names and cute descriptions to the food you make, and lets
// Madame Purrline write her own reviews. The food engine (engine.js) still decides what
// physically happens (chopped, fried, burnt…); the AI only writes the words.
//
// How it runs: entirely on the player's own device, in the browser, using WebGPU.
//   * Qwen3.5 4B (recommended) or Qwen3.5 2B (lighter), run by the WebLLM library
//     (game/vendor/web-llm/, Apache 2.0). The model is downloaded once, then kept in the
//     browser's storage so it works offline.
//   * Or Chrome's built-in on-device AI (Gemini Nano), when that browser offers it.
// Nothing is ever sent to a server. If the AI is off, missing or slow, the game simply
// uses the engine's own names and reviews.
//
// Every answer is checked (length, no odd or unsuitable words) and saved for good in
// IndexedDB, so the same recipe always gets the same name, even offline.

import { state, save } from './state.js';

export const MODELS = {
  qwen4b: { f16: 'Qwen3.5-4B-q4f16_1-MLC', f32: 'Qwen3.5-4B-q4f32_1-MLC' },
  qwen2b: { f16: 'Qwen3.5-2B-q4f16_1-MLC', f32: 'Qwen3.5-2B-q4f32_1-MLC' },
};

/** Live status for the screen: off | loading | ready | error. */
export const ai = { status: 'off', progress: 0, detail: '', error: '', choice: null };
const listeners = new Set();
export function onAiChange(fn) { listeners.add(fn); }
function set(patch) { Object.assign(ai, patch); listeners.forEach((f) => f(ai)); }

const settings = () => (state.settings.ai ||= { choice: 'qwen4b', on: false, asked: false });

// A test-only stand-in for the real model (?aimock in the address), so the game's AI
// screens can be checked automatically on computers without a graphics chip.
const isMock = () => typeof location !== 'undefined' && /[?&]aimock/.test(location.search);

// ---------- what can this device do? ----------
export async function checkSupport() {
  const res = { webgpu: false, f16: false, chrome: 'unavailable', mock: isMock() };
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) { res.webgpu = true; res.f16 = adapter.features.has('shader-f16'); }
    }
  } catch { /* no WebGPU */ }
  try { if (globalThis.LanguageModel) res.chrome = await globalThis.LanguageModel.availability(); } catch { /* not Chrome */ }
  if (res.mock) res.webgpu = true;
  return res;
}

// ---------- loading the WebLLM library ----------
// The library is one big file. On a website it's fetched from game/vendor; in the one-file
// index.html it's packed inside the page. Either way we load it from memory, which also works
// when the game is opened straight from the disk.
let libPromise = null;
const blobUrl = (text) => URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
function loadLibrary() {
  libPromise ||= (async () => {
    const packed = document.getElementById('webllm-src');
    const text = packed ? packed.textContent : await (await fetch('vendor/web-llm/web-llm.js')).text();
    const lib = await import(blobUrl(text));
    // the same code, as a plain worker script, runs the model in the background
    const workerText = '"use strict";\n' + text.replace(/\nexport \{[^}]*\};?\s*$/, '\n')
      + '\nconst kitchenriaHandler = new WebWorkerMLCEngineHandler();\nself.onmessage = (msg) => kitchenriaHandler.onmessage(msg);\n';
    return { lib, workerUrl: blobUrl(workerText) };
  })();
  libPromise.catch(() => { libPromise = null; });
  return libPromise;
}
const appConfigFor = (lib) => ({ ...lib.prebuiltAppConfig, cacheBackend: location.protocol === 'file:' ? 'indexeddb' : 'cache' });

// ---------- the three kinds of brain ----------
async function startWebLLM(choice, onProgress, support) {
  const modelId = MODELS[choice][support.f16 ? 'f16' : 'f32'];
  const { lib, workerUrl } = await loadLibrary();
  const worker = new Worker(workerUrl);
  const engine = await lib.CreateWebWorkerMLCEngine(worker, modelId, {
    appConfig: appConfigFor(lib),
    initProgressCallback: (r) => onProgress(r.progress, r.text),
  });
  return {
    async complete(system, user, schema) {
      const r = await engine.chat.completions.create({
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.7, max_tokens: 260,
        response_format: { type: 'json_object', schema: JSON.stringify(schema) },
        extra_body: { enable_thinking: false },
      });
      return r.choices[0].message.content;
    },
    async unload() { try { await engine.unload(); } finally { worker.terminate(); } },
  };
}

async function startChrome(onProgress) {
  const LM = globalThis.LanguageModel;
  const base = await LM.create({ monitor(m) { m.addEventListener('downloadprogress', (e) => onProgress(e.loaded, '')); } });
  return {
    async complete(system, user, schema) {
      const s = await LM.create({ initialPrompts: [{ role: 'system', content: system }] });
      try { return await s.prompt(user, { responseConstraint: schema }); } finally { s.destroy(); }
    },
    async unload() { base.destroy(); },
  };
}

function startMock(onProgress) {
  return new Promise((resolve) => {
    let p = 0;
    const tick = setInterval(() => {
      p += 0.25;
      onProgress(Math.min(p, 1), 'Loading the pretend model…');
      if (p >= 1) {
        clearInterval(tick);
        resolve({
          async complete(system, user) {
            await new Promise((r) => setTimeout(r, 150));
            const facts = JSON.parse(user.slice(user.indexOf('{')));
            if (facts.kitchen_guess) {
              if (/water/i.test(facts.kitchen_guess)) return '{"name":"As an AI language model I cannot name this","description":"Sorry."}';
              return JSON.stringify({ name: `Cozy ${facts.kitchen_guess}`.slice(0, 40), description: 'A pretend description from the test model.' });
            }
            return JSON.stringify({ review: `A pretend review for ${facts.stars} stars. Lovely work, little chef!`, dishName: facts.must_keep_name || 'Pretend Plate' });
          },
          async unload() {},
        });
      }
    }, 60);
  });
}

let brain = null;
let starting = null;

/** Starts the AI (downloading the model the first time). Safe to call more than once. */
export function startAI() {
  if (brain) return Promise.resolve(true);
  if (starting) return starting;
  const { choice } = settings();
  set({ status: 'loading', progress: 0, detail: '', error: '', choice });
  const onProgress = (p, detail) => set({ progress: Math.max(0, Math.min(1, p || 0)), detail: detail || '' });
  starting = (async () => {
    try {
      const support = await checkSupport();
      if (isMock()) brain = await startMock(onProgress);
      else if (choice === 'chrome') brain = await startChrome(onProgress);
      else if (!support.webgpu) throw new Error('nowebgpu');
      else brain = await startWebLLM(choice, onProgress, support);
      set({ status: 'ready', progress: 1 });
      return true;
    } catch (e) {
      console.warn('[Kitchenria] The AI helper could not start:', e);
      set({ status: 'error', error: e?.message === 'nowebgpu' ? 'nowebgpu' : /fetch|network|Failed to fetch|NetworkError/i.test(String(e?.message || e)) ? 'network' : /memory|OOM|allocate|device lost/i.test(String(e?.message || e)) ? 'memory' : 'other' });
      brain = null;
      return false;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

/** Player chose a model and pressed Download / Turn on. */
export function enableAI(choice) {
  Object.assign(settings(), { choice, on: true, asked: true });
  save();
  return startAI();
}

/** Turns the AI off for now; the downloaded model stays (so it can come back offline). */
export async function turnOffAI() {
  settings().on = false;
  save();
  const b = brain; brain = null;
  await b?.unload().catch(() => {});
  set({ status: 'off', progress: 0 });
}

/** Removes the downloaded model files from this browser. */
export async function deleteModel(choice) {
  await turnOffAI();
  if (choice === 'chrome' || isMock()) return true;
  const { lib } = await loadLibrary();
  const cfg = appConfigFor(lib);
  for (const id of Object.values(MODELS[choice])) await lib.deleteModelAllInfoInCache(id, cfg).catch(() => {});
  return true;
}

/** Is a model already downloaded in this browser? */
export async function isDownloaded(choice) {
  if (choice === 'chrome' || isMock()) return false;
  try {
    const { lib } = await loadLibrary();
    const cfg = appConfigFor(lib);
    for (const id of Object.values(MODELS[choice])) if (await lib.hasModelInCache(id, cfg)) return true;
  } catch { /* library not reachable */ }
  return false;
}

export const markAsked = () => { settings().asked = true; save(); };
export const aiSettings = settings;

// ---------- saved answers (IndexedDB) ----------
const memory = new Map();
let dbPromise = null;
function db() {
  dbPromise ||= new Promise((resolve) => {
    try {
      const req = indexedDB.open('kitchenria-ai', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('texts');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
/** Loads every saved AI answer into memory (call once at start). */
export async function loadSavedTexts() {
  const d = await db();
  if (!d) return;
  await new Promise((resolve) => {
    const tx = d.transaction('texts', 'readonly');
    const req = tx.objectStore('texts').openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { memory.set(c.key, c.value); c.continue(); } else resolve(); };
    req.onerror = () => resolve();
  });
}
function remember(key, value) {
  memory.set(key, value);
  db().then((d) => { if (d) d.transaction('texts', 'readwrite').objectStore('texts').put(value, key); });
}

// ---------- checking what the AI says ----------
const BLOCKED = /\b(ai|a\.i\.|assistant|language model|json|sorry|cannot|can't|kill|killer|blood|dead|death|die|poison|vomit|puke|shit|fuck|damn|hell|crap|sex|sexy|drug|drugs|drunk|wine|beer|vodka|whiskey|whisky|alcohol|booze|cocaine|weed|nazi|hate|stupid|idiot|ugly|gross|disgusting)\b/i;
const EMOJI = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

export function cleanName(s) {
  s = String(s ?? '').replace(EMOJI, '').replace(/["“”*#_<>{}[\]`]/g, '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
  if (s.length < 3 || s.length > 42) return null;
  if (s.split(' ').length > 6) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’&,.\-]*$/u.test(s)) return null;
  if (BLOCKED.test(s)) return null;
  // Title Case, but little words stay small ("Pasta with Pesto")
  const small = new Set(['and', 'with', 'of', 'in', 'on', 'a', 'the', 'al', 'au', 'de', 'di', 'or']);
  return s.split(' ').map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
}
export function cleanSentence(s, min, max) {
  s = String(s ?? '').replace(EMOJI, '').replace(/[*#_<>{}[\]`]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length < min || s.length > max) return null;
  if (BLOCKED.test(s)) return null;
  if (!/[\p{L}]/u.test(s)) return null;
  return s;
}
function parseJSON(text) {
  try { return JSON.parse(text); } catch { /* maybe wrapped in words */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
}

// one question at a time, so the model isn't asked two things at once
let queue = Promise.resolve();
function ask(system, user, schema, ms) {
  const run = () => Promise.race([
    brain ? brain.complete(system, user, schema) : Promise.reject(new Error('off')),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

// ---------- naming food ----------
const DOING = {
  squish: 'squished together by hand', chop: 'chopped with a knife', whisk: 'whisked', mix: 'stirred together with a spoon',
  roll: 'rolled flat with a rolling pin', mash: 'mashed', grate: 'grated', grind: 'ground in a mortar and pestle',
  squeeze: 'squeezed by hand', peel: 'peeled by hand', crack: 'cracked open', tear: 'torn by hand', shape: 'shaped by hand',
  toss: 'tossed together by hand', season: 'sprinkled on top', crumble: 'crumbled by hand',
  boil: 'cooked in a pot', fry: 'fried in a pan', bake: 'baked in the oven', blend: 'blended in a blender', grill: 'grilled',
  steam: 'steamed', freeze: 'frozen in the freezer', marinate: 'marinated in a jar', age: 'aged in the cellar',
};
const NAME_SYSTEM = `You name food in Kitchenria, a cosy, gentle cooking game for all ages.
The player just made something. Give it a short, appetising name like on a cosy café menu, and a one-sentence cute description.
Rules:
- The name must describe what this food really is, using only the ingredients and cooking listed. Never invent ingredients.
- 2 to 5 words, Title Case. No brand names, no people's names, no emoji, no quotation marks.
- If it is burnt, frozen, raw or strange, say so in a playful, kind way.
- The description is one short, warm, playful sentence (at most 16 words).
- If the kitchen's guess is already the perfect name (for example a classic dish like "Pancakes"), you may keep it.
Answer only with JSON: {"name": "...", "description": "..."}`;
const NAME_SCHEMA = { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'description'] };

/** A saved AI name for a recipe, if there is one (instant, no waiting). */
export function savedName(key) {
  const v = memory.get('name:' + key);
  return v && v.name ? v : null;
}

/**
 * Asks the AI to name a freshly made item. Resolves to { name, desc } or null
 * (null = keep the engine's own name). Classic dishes keep their real names.
 */
export async function nameFood(item, inputs, ING) {
  if (!item || item.sig || item.kind !== 'creation') return null;
  const known = memory.get('name:' + item.key);
  if (known) return known.name ? known : null;
  if (ai.status !== 'ready') return null;
  const op = item.from?.op;
  const facts = {
    what_the_player_did: `${inputs.map((i) => i.name).join(' + ')}, ${DOING[op] || op}`,
    basic_ingredients_inside: Object.keys(item.parts).map((id) => ING.get(id)?.name || id),
    state: [item.burnt ? 'burnt' : null, item.frozen ? 'frozen' : null, item.heat > 0 ? 'cooked' : 'not cooked', item.rawW > 0.2 ? 'contains raw ingredients that should be cooked' : null].filter(Boolean),
    kind_of_food: item.form,
    kitchen_guess: item.name,
  };
  try {
    const out = parseJSON(await ask(NAME_SYSTEM, `Name this food:\n${JSON.stringify(facts)}`, NAME_SCHEMA, 30000));
    const name = cleanName(out?.name);
    const desc = cleanSentence(out?.description, 8, 140);
    const value = name && desc ? { name, desc } : { name: null }; // a rejected answer is remembered too, so we don't keep asking
    remember('name:' + item.key, value);
    return value.name ? value : null;
  } catch (e) {
    return null; // timeout or the AI was turned off: keep the engine's name, ask again next time
  }
}

// ---------- the critic ----------
const REVIEW_SYSTEM = `You are Madame Purrline, a fussy but kind cat who is the food critic of Kitchenria, a cosy cooking game for all ages.
Write your review of the plate described. Rules:
- 2 or 3 sentences, at most 55 words. Warm and witty. Gentle teasing is fine, never mean.
- Mention the actual food on the plate. React to how it was cooked (burnt, raw, frozen, fresh, warm…).
- Your mood must match the star rating you already gave (0 = horrified, 5 = delighted). Do not write a number of stars.
- Also give the whole plate a cosy menu name (2 to 6 words). If "must_keep_name" is given, use exactly that name.
Answer only with JSON: {"review": "...", "dishName": "..."}`;
const REVIEW_SCHEMA = { type: 'object', properties: { review: { type: 'string' }, dishName: { type: 'string' } }, required: ['review', 'dishName'] };
const NOTES = {
  signature: 'a true classic dish', balance: 'well balanced flavours', pairing: 'ingredients that go well together', technique: 'several cooking techniques',
  complex: 'layers of flavour', warm: 'served warm', sweetSalty: 'sweet and salty together', fresh: 'fresh and bright', rich: 'rich', sweet: 'a nice sweet treat',
  plated: 'thoughtfully plated with sides', cool: 'refreshingly cold', raw: 'some of it should have been cooked', burnt: 'burnt', salty: 'too salty',
  bitter: 'bitter', bland: 'a bit plain', busy: 'too many things at once', clash: 'flavours that clash', lonely: 'just one raw ingredient on a plate',
  sour: 'very sour', spicy: 'very spicy', weird: 'a strange combination',
};

export function savedReview(key) {
  const v = memory.get('review:' + key);
  return v && v.review ? v : null;
}

/** Asks Madame Purrline (the AI) for a review. Resolves to { review, dishName } or null. */
export async function reviewDish(dish, score) {
  const known = memory.get('review:' + dish.key);
  if (known) return known.review ? known : null;
  if (ai.status !== 'ready') return null;
  const facts = {
    on_the_plate: (dish.components || []).map((c) => `${c.name}${c.burnt ? ' (burnt)' : ''}${c.frozen ? ' (frozen)' : ''}${c.heat > 0 ? '' : ' (not cooked)'}`),
    stars: score.stars,
    good_points: score.good.map((g) => NOTES[g] || g),
    bad_points: score.bad.map((b) => NOTES[b] || b),
    ...(dish.sig ? { must_keep_name: dish.name } : {}),
  };
  try {
    const out = parseJSON(await ask(REVIEW_SYSTEM, `Review this plate:\n${JSON.stringify(facts)}`, REVIEW_SCHEMA, 45000));
    const review = cleanSentence(out?.review, 20, 420);
    const dishName = dish.sig ? dish.name : cleanName(out?.dishName);
    const value = review ? { review, dishName: dishName || dish.name } : { review: null };
    remember('review:' + dish.key, value);
    return value.review ? value : null;
  } catch {
    return null;
  }
}
