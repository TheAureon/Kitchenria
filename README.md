# Kitchenria 🍳

A cosy cooking discovery game for your web browser. Drag ingredients onto each other, or onto kitchen tools, to discover new dishes. There are no timers, no losing, no ads, no sign-up and no tracking.

> **Status: Stage 1 of 6.** The kitchen, drag and drop, the pantry shelf, 18 starter items (12 ingredients and 6 tools) and 95 recipes work. The rest of the stages are listed in [the plan](#the-plan) below.

---

## ▶️ Play it on your Mac

1. Download this project. On GitHub, click the green **Code** button, then **Download ZIP**, and double-click the ZIP to unpack it.
2. Open the unpacked folder and double-click **`Start Kitchenria.command`**.
   * The first time, your Mac may say it *"cannot be opened because it is from an unidentified developer"*. If it does, **right-click** (or Control-click) the file, choose **Open**, then click **Open** again. You only need to do this once.
   * If your Mac offers to install **"Command Line Developer Tools"**, click **Install** and wait for it to finish. Then double-click the file again. This is a free Apple download, and the game needs it to run on your computer.
3. Your web browser opens the game at `http://localhost:8123`. Keep the small Terminal window open while you play, and close it when you're done.

**Why can't I just double-click `index.html`?** Browsers block games like this one from loading their own files directly from your disk, for safety. The start file runs a tiny private web server (only your Mac can see it) so the browser is happy. Once the game is on your website, players just visit the address.

## 🎮 How to play

* **Drag** something from the **pantry shelf** onto the **table**.
* Drop one thing **onto another** to combine them. Flour + water = dough!
* Drop an ingredient onto a **tool** (cutting board, pot, pan, oven, blender, mortar) to chop, boil, fry, bake, blend or grind it. Tools never get used up.
* **Tap** a shelf item to put it on the table. **Tap** two things on the table, one after the other, to combine them.
* **Double-click** something on the table to make a copy. Drag it back onto the shelf to put it away. **Tidy table** clears everything.
* **Keyboard:** Tab to an item on the shelf and press Enter to put it on the table. On the table, press Enter on one thing, then Enter on another to combine them. Arrow keys move the selected item, Delete puts it away, and Escape lets go.
* New discoveries sparkle, play a happy sound and get a **New!** tag. Everything saves automatically on this device.

---

## 📁 What's in the folder

```
Kitchenria/
├── Start Kitchenria.command   ← double-click to play on your Mac
├── README.md                  ← this guide
├── game/                      ← THE GAME. This is the folder you upload to your website.
│   ├── index.html             ← the page itself
│   ├── css/main.css           ← all the colours, sizes and animations
│   ├── js/                    ← the game's code, one small file per job:
│   │   ├── main.js            ←   starts everything up
│   │   ├── data.js            ←   reads the recipe and item files
│   │   ├── table.js           ←   the kitchen table: dragging and combining
│   │   ├── shelf.js           ←   the pantry shelf: search, sort and filters
│   │   ├── doodle.js          ←   draws the wobbly hand-drawn pictures
│   │   ├── shapes.js          ←   the library of doodle shapes (apple, pot, bowl…)
│   │   ├── effects.js         ←   sparkles and message bubbles
│   │   ├── audio.js           ←   sound effects, made in code (no sound files)
│   │   ├── state.js           ←   remembers your progress (auto-save)
│   │   └── i18n.js            ←   looks up on-screen text in the language file
│   ├── data/
│   │   ├── items.json         ← every ingredient, tool and dish
│   │   └── recipes.json       ← every combination
│   ├── lang/en.json           ← every piece of on-screen text (for translating)
│   ├── art/items/             ← put your own pictures here (see below)
│   └── fonts/                 ← the Fredoka font and its licence
└── dev/                       ← helper tools for development. NOT needed on your website.
    ├── gallery.html           ← shows every doodle on one page
    ├── check-recipes.mjs      ← checks the recipe files for mistakes
    └── test-game.cjs          ← automatic browser test
```

## 🥕 Adding recipes

Open `game/data/recipes.json` in any text editor. On a Mac, **TextEdit** works: choose *Format → Make Plain Text* first. Free editors like **Visual Studio Code** or **BBEdit** are even nicer. Each line is one combination:

```json
{ "a": "flour", "b": "water", "makes": "dough" },
```

* `a` and `b` are the two things being combined. Order doesn't matter.
* `makes` is the result.
* Use the **id** of each item (the short lowercase name from `items.json`), not its display name.
* A tool (`board`, `pot`, `pan`, `oven`, `blender`, `mortar`) can be `a` or `b`. Tools are never used up.
* Every line ends with a comma **except the last one** in the list.

To add a **brand-new item**, add a line to `game/data/items.json` first:

```json
{ "id": "jam", "name": "Jam", "type": "dish", "tags": ["sweet"], "desc": "Fruit that got very, very cosy.",
  "art": { "shape": "jar", "color": "#c8324a", "accent": "#f2efe8" } },
```

`type` is `ingredient`, `tool`, `prep` (an in-between step like dough) or `dish`. Then use `jam` in a recipe. If you make a typo, the game doesn't break: it skips that line and lists the problem in the browser's console (in Safari, choose *Develop → Show JavaScript Console*).

## 🎨 Replacing the art with your own pictures

Every picture is drawn by code from its `art` settings: a `shape` (see `game/js/shapes.js` or open `dev/gallery.html` to see them all), plus `color`, `accent`, `fill` and an optional `top`ping (`pat`, `steam`, `sparkle`, `specks`, `dots`, `heart`, `swirl`…).

To use **your own picture** for an item:

1. Save it as a square PNG, WebP or SVG, ideally about 256×256 pixels with a transparent background.
2. Put it in `game/art/items/`, e.g. `game/art/items/apple.png`.
3. In `items.json`, add an `image` line inside that item's `art`:

   ```json
   "art": { "shape": "apple", "color": "#e8584c", "image": "art/items/apple.png" }
   ```

That's it. The picture replaces the doodle everywhere. Delete the `image` line to get the doodle back.

## 🌍 Putting it on your website

Upload **the contents of the `game` folder**: `index.html` and the `css`, `js`, `data`, `lang`, `art` and `fonts` folders. Put them together in one folder on your site, e.g. `yoursite.com/kitchenria/`. There is no server code, so any static hosting works: itch.io (upload a ZIP of the `game` folder and choose "HTML"), Netlify, GitHub Pages, Neocities, or your own host. Don't upload the `dev` folder.

---

## The plan

| Stage | What gets built | Status |
|---|---|---|
| **1. Kitchen & core play** | Kitchen scene, drag & drop (mouse, touch, keyboard), pantry shelf with search, sort and filters, doodle art engine, 12 ingredients + 6 tools, 95 recipes, discovery celebrations, sounds, auto-save | ✅ done |
| **2. Big recipe book** | 500+ hand-checked recipes across many cuisines (Italian, French, Japanese, Mexican, Indian, Middle Eastern…), discoverable tools (whisk, grill, steamer, freezer, fermenting jar…), the Recipe Book with how each item was made and a discovery percentage, more doodle shapes | next |
| **3. Kitchen helper AI** | Optional small AI that runs on the player's own device (WebGPU), for combinations that aren't in the book. Asks permission once, shows download size and progress, can be deleted. Validated results, saved forever (IndexedDB), works offline. Gentle "mysterious something" fallback when there's no AI | |
| **4. Progression** | Milestones with rewards, visiting animals who ask for dishes and leave gifts, unlockable pantries (spice shelf, garden, bakery), decorating the kitchen | |
| **5. Atmosphere** | Optional lighting effects (lamp glow, real-time window sunlight, candle flicker, steam, soft shadows, vignette), Low Power mode, ambient music, rain, the kitchen cat, seasonal themes | |
| **6. Full game & app** | Title screen, settings, pause, credits, save export/import/reset, accessibility options, installable app (PWA) that works fully offline, final testing | |

## Credits & licences

* Game code and doodle art: made for Kitchenria.
* Font: [Fredoka](https://github.com/hafontia/Fredoka-One) by The Fredoka Project Authors, SIL Open Font License 1.1 (see `game/fonts/OFL-LICENSE.txt`).
* Sound effects: generated live in code with the Web Audio API. There are no audio files.
