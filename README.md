# Kitchenria 🍳

A cosy cooking game for your web browser, in the spirit of *Infinite Kitchen*. Put ingredients into kitchen tools (chop, boil, fry, bake, mix, blend…), invent dishes nobody has written down, plate them, and let the food critic Madame Purrline give you 0.0 to 5.0 stars. There are no timers, no ads, no sign-up, no tracking and no server. Everything runs on your own device.

> **Status: Stage 1 (reworked).** The kitchen with tool stations, the food engine that handles *any* combination, plating and critic reviews, chef ranks with unlocks, badges, the Cookbook, 52 ingredients (16 at the start) and 75 classic dishes to discover all work. See [the plan](#the-plan) for what comes next.

## ▶️ Play it on your Mac

1. Download this project. On GitHub, click the green **Code** button, then **Download ZIP**, and double-click the ZIP to unpack it.
2. Open the unpacked folder and **double-click `index.html`**. That's it: the game opens in your web browser. No Terminal, no installing.

`index.html` is the whole game packed into one file. You can copy it anywhere, put it on a USB stick or email it to a friend, and it still works. Your progress is saved in the browser you play in.

**Alternative: `Start Kitchenria.command`.** This runs the game from the `game` folder through a tiny private web server. Use it when you have edited recipes or art and want to see your changes straight away (see [Adding recipes](#-adding-recipes)).
* The first time, your Mac may say it *"cannot be opened because it is from an unidentified developer"*. If it does, **right-click** (or Control-click) the file, choose **Open**, then click **Open** again.
* If your Mac offers to install **"Command Line Developer Tools"**, click **Install**, wait for it to finish, then double-click the file again.
* Keep the small Terminal window open while you play.

Progress is saved separately for each way of playing (and each website), so the two don't share a save. Export and import of saves arrive in stage 6.

## 🎮 How to play

* **Drag** an ingredient from the **pantry** into a **tool** on the counter.
  * The **knife** chops straight away.
  * The **pot, pan, oven, bowl** (and later blender, mortar, freezer, grill, marinade jar, steamer, cellar) hold up to four things. Press their button (**Boil!**, **Fry!**, **Bake!**, **Mix!**…) to cook.
* Anything can go with anything. Tomato + knife = Chopped Tomato; chopped tomato + onion in the pot = Tomato & Onion Sauce; that sauce mixed with pasta = **Spaghetti Pomodoro**, a classic dish! Cook something too often and it burns. Freeze it, marinate it, age it…
* You can also drop one thing **onto another** on the counter to mix them quickly.
* Everything you make goes into the pantry, so you can keep building on it.
* Put food on the **plate** and press **Serve!** The critic tastes it and writes a review with stars. Cooked, balanced, well-paired, classic dishes score best.
* Earn **chef points** for new creations, classic dishes and served plates. Ten **chef ranks** unlock new tools and new pantry shelves (garden, spices, bakery, market, world pantry, orchard & tea).
* The **Cookbook** (top right) keeps every dish you served with its review, your collection of classic dishes, your rank and your badges.
* **Tap instead of drag:** tap food to pick it up, then tap a tool (or another food to mix). **Keyboard:** Tab to food and press Enter, then Tab to a tool and press Enter. Arrow keys move food, Delete puts it away, Escape lets go.
* Double-click food to copy it, drag it onto the pantry to put it away, and **Tidy counter** clears everything. Progress saves automatically.

## 📁 What's in the folder

```
Kitchenria/
├── index.html                 ← double-click to play: the whole game in one file (built automatically)
├── Start Kitchenria.command   ← plays the game/ folder through a mini web server (shows your edits instantly)
├── README.md                  ← this guide
├── game/                      ← THE GAME (the source of everything)
│   ├── index.html             ← the page itself
│   ├── css/main.css           ← colours, sizes and animations
│   ├── js/                    ← the code, one small file per job:
│   │   ├── engine.js          ←   THE FOOD ENGINE: works out what any tool + ingredients make
│   │   ├── critic.js          ←   Madame Purrline: star scores and written reviews
│   │   ├── kitchen.js         ←   cooking & serving, remembering what you made
│   │   ├── progress.js        ←   chef points, ranks, unlocks and badges
│   │   ├── stations.js        ←   the cooking tools on the counter
│   │   ├── table.js           ←   the counter: dragging food around
│   │   ├── shelf.js           ←   the pantry: search, sort and filters
│   │   ├── review.js          ←   the critic's review card
│   │   ├── cookbook.js        ←   the Cookbook window
│   │   ├── doodle.js, shapes.js ← the hand-drawn pictures, made in code
│   │   ├── effects.js, audio.js ← sparkles, messages and sounds (made in code, no files)
│   │   ├── state.js           ←   saving your progress
│   │   ├── data.js, load.js   ←   reading the data files
│   │   ├── i18n.js            ←   looking up on-screen text
│   │   └── main.js            ←   starts everything up
│   ├── data/
│   │   ├── ingredients.json   ← every ingredient and its taste/cooking properties
│   │   ├── signatures.json    ← the classic dishes the game recognises
│   │   └── kitchen.json       ← tools, chef ranks, unlocks, points and badges
│   ├── lang/en.json           ← every piece of text: dish name patterns, critic phrases, buttons
│   ├── art/items/             ← put your own pictures here (see below)
│   └── fonts/                 ← the Fredoka font and its licence
└── dev/                       ← helper tools for development. NOT needed on your website.
    ├── build-standalone.mjs   ← packs game/ into the one-file index.html
    ├── engine-sample.mjs      ← prints what the food engine makes, to check names
    ├── gallery.html           ← shows every doodle on one page
    └── test-game.cjs          ← automatic browser test
```

## 🥕 Adding ingredients and classic dishes

There is no list of every recipe. The **food engine** (`game/js/engine.js`) looks at what goes into a tool and the properties of each ingredient, and works out a sensible result. That's what makes the recipes endless. You can change three things without touching code (any plain-text editor works, e.g. TextEdit after *Format → Make Plain Text*, or the free Visual Studio Code):

**A new ingredient**: add a line to `game/data/ingredients.json`:

```json
{ "id": "pumpkin", "name": "Pumpkin", "mod": "Pumpkin", "cat": "veg", "form": "whole", "flags": [],
  "taste": { "sweet": 2, "rich": 1 }, "color": "#f08a3c", "pack": "garden",
  "desc": "Round, orange and ready for autumn.", "art": { "shape": "apple", "color": "#f08a3c", "accent": "#5f9e45" } },
```

`cat` (veg, fruit, grain, dairy…), `taste` and `flags` decide how it cooks: a `juicy` veg makes sauce in a dry pot, a `raw` one upsets the critic if it isn't cooked, and so on. `pack` decides when it appears (`starter`, or a pack that unlocks with a rank).

**A new classic dish**: add a line to `game/data/signatures.json`. For example, this turns any soup that contains pumpkin into "Pumpkin Soup", with a nicer description and a critic bonus:

```json
{ "id": "pumpkin_soup", "name": "Pumpkin Soup", "arch": ["soup", "creamySoup"], "need": ["pumpkin"], "desc": "Velvety and orange, like autumn in a bowl." },
```

**Tools, ranks, points and badges** are in `game/data/kitchen.json`. **All text** (including the dish name patterns like `"{x} Soup"` and Madame Purrline's phrases) is in `game/lang/en.json`.

Every line ends with a comma **except the last one** in a list. If you make a typo, the game doesn't break: it skips that line and reports it in the browser's console. To see changes in the one-file `index.html`, it needs rebuilding (`node dev/build-standalone.mjs`). I rebuild it at every stage, and **Start Kitchenria.command** always shows your edits straight away.

## 🎨 Replacing the art with your own pictures

Every picture is drawn by code. Ingredients and tools use their `art` settings: a `shape` (see `game/js/shapes.js`, or open `dev/gallery.html` to see them all), plus `color`, `accent` and an optional `top`ping. Cooked creations get their picture automatically from what they are (soup → bowl, cake → cake…) and the colours of their ingredients.

To use **your own picture** for an ingredient or a tool:

1. Save it as a square PNG, WebP or SVG, ideally about 256×256 pixels with a transparent background.
2. Put it in `game/art/items/`, e.g. `game/art/items/apple.png`.
3. In `ingredients.json` (or `kitchen.json` for tools), add an `image` line inside its `art`:

   ```json
   "art": { "shape": "apple", "color": "#e8584c", "image": "art/items/apple.png" }
   ```

That's it. The picture replaces the doodle everywhere. Delete the `image` line to get the doodle back.

## 🌍 Putting it on your website

**Easiest:** upload just the one-file `index.html` from the main folder. It contains everything.

**Or** upload **the contents of the `game` folder**. Later stages will make this the better choice, because it lets players install the game as an app and play offline. That needs the separate files. Upload `index.html` and the `css`, `js`, `data`, `lang`, `art` and `fonts` folders, and put them together in one folder on your site, e.g. `yoursite.com/kitchenria/`. There is no server code, so any static hosting works: itch.io (upload a ZIP of the `game` folder and choose "HTML"), Netlify, GitHub Pages, Neocities, or your own host. Don't upload the `dev` folder.

---

## The plan

| Stage | What gets built | Status |
|---|---|---|
| **1. Kitchen & core play** | Tool stations, the food engine (any combination works), burning/freezing/marinating/ageing, plating, the critic with 0.0–5.0 stars and reviews, painted dish portraits, chef ranks with unlocks, badges, the Cookbook, 52 ingredients, 75 classic dishes, sounds, auto-save, mouse/touch/keyboard | ✅ done |
| **2. Bigger world** | Many more ingredients and classic dishes (aim: 500+ across Italian, French, Japanese, Mexican, Indian, Middle Eastern…), smarter naming, more doodle shapes, better critic variety | next |
| **3. Kitchen helper AI** | Optional small AI on the player's own device (WebGPU) that writes extra-creative names, descriptions and critic reviews. Asks first, shows download size and progress, can be deleted, results saved forever, works offline. The game stays fully playable without it | |
| **4. Visitors & decorating** | Animal visitors who ask for dishes ("something warm") and leave gifts, decorating the kitchen, more rewards | |
| **5. Atmosphere** | Optional lighting effects (lamp glow, real-time sunlight, candle flicker, steam, soft shadows), Low Power mode, music, rain, the kitchen cat, seasons | |
| **6. Full game & app** | Title screen, settings, pause, credits, save export/import/reset, accessibility options, installable app that works fully offline, final testing | |

## Credits & licences

* Game code and doodle art: made for Kitchenria.
* Font: [Fredoka](https://github.com/hafontia/Fredoka-One) by The Fredoka Project Authors, SIL Open Font License 1.1 (see `game/fonts/OFL-LICENSE.txt`).
* Sound effects: generated live in code with the Web Audio API. There are no audio files.
