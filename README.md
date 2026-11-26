# Kitchenria 🍳

A cosy cooking game for your web browser. Take ingredients from the pantry, **stack** them on the counter, and use **hand tools** to work them (squish, chop, whisk, roll, mash, grate…) and **appliances** to cook them (boil, fry, bake, blend…). When your dish looks delicious, put it on the plate and serve it to the food critic, Madame Purrline, who gives it 0.0 to 5.0 stars and a written review. There are no timers, no ads, no sign-up, no tracking and no server. Everything runs on your own device.

> **Status: Stage 1 (third version).** Stacking, 8 hand tools, 10 appliances, a food engine that handles any combination, the critic with stars and reviews, the Recipe Book of finished dishes, 52 ingredients (all available from the start) and 75 classic dishes to discover. See [the plan](#the-plan) for what comes next.

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

* The game opens on a **title screen**: a kitchen window whose sky follows your real time of day (sunrise, daytime, sunset or a starry night). Press **Start cooking** (or **Continue cooking**). You can also open the Recipe Book or the AI helper from there.
* **Drag** an ingredient from the **pantry** onto the counter. (Or tap it.)
* Drop food **onto other food** to **stack** it. Nothing happens to a stack yet: it's just a pile, waiting for a tool. Hover over a stack to see what's in it; double-click it to spread it out again.
* **Hand tools** hang on the wall rail. Drag one down onto food or a stack:
  * **Hands** can do lots of things. Drop them on food and a little menu offers what makes sense:
    squish (flour + water + salt → Dough), squeeze (lemon → Lemon Juice, or over fish), peel (banana, orange, boiled egg…),
    crack (eggs, nuts), tear (herbs, bread; cooked chicken → Pulled Chicken), shape (rice → Rice Ball, chicken → Patty,
    dough → Dough Balls that bake into Bread Rolls), toss (several things → a salad), sprinkle (fries + salt → Salted Fries)
    and crumble (bread, cookies, cheese)
  * **Knife**: chop · **Whisk**: whisk (egg → Whisked Eggs) · **Spoon**: stir
  * **Rolling pin**: roll (Dough → Pizza Base, Pastry Dough → Pie Crust)
  * **Masher**: mash · **Grater**: grate (cheese, potato, lemon zest…) · **Mortar**: grind
  * **Peeler**: peel (carrot → Peeled Carrot; peel again → Carrot Ribbons; chocolate or cheese → Shavings)
  * **Piping bag**: pipe soft things into shapes (Meringue Mix → Meringue Swirls, mash → Duchess swirls, dough → Churros or Choux Buns), **fill** buns and doughnuts, or **frost** cakes (cake + whipped cream)
  * **Sushi mat**: roll up (rice + seaweed + fish → Sushi Roll; cake + jam → Swiss Roll; dough + cinnamon → Cinnamon Rolls; cabbage + rice → Cabbage Rolls)
  * **Hands → Garnish**: stack a finished dish with a garnish (chives, cress, sprinkles, edible flowers, sesame, icing sugar, cocoa) and the hands offer **Garnish**. It looks prettier and Madame Purrline gives a little bonus
* **Tools use common sense.** If something makes no sense (whisking a radish, grilling water, mashing a raw potato, a pot with no water), the tool politely says why and your food stays where it was. Mix strong savoury things with sweet treats (fish + chocolate) and you get an honest *Muddle* that Madame Purrline will not enjoy.
* **Appliances** stand along the counter: pot, pan, **wok** (stir-fries, wok noodles, scrambled eggs), oven, blender, **waffle iron** (waffles, waffle cookies, pressed sandwiches), grill, steamer, freezer, marinade jar and cellar. Drop food or a stack into one and it cooks straight away. Cook something too often and it burns!
* Example: stack Pizza Base + Tomato Sauce + Grated Cheese, put the stack in the oven, and you get **Cheese Pizza**, a classic dish!
* Put up to four things on the **plate** and press **Serve!** The critic tastes it and writes a review. Cooked, balanced, well-paired, classic dishes score best. Finished dishes are kept in your **Recipe Book**, along with your collection of classic dishes.
* **Tap instead of drag:** tap food to pick it up, then tap a hand tool, an appliance, or more food (to stack). **Keyboard:** Tab to food and press Enter, then Tab to a tool and press Enter. Arrow keys move food, Delete puts it away, Escape lets go.
* **Music & sound:** five gentle original songs play in the background, one after another with soft crossfades, starting with one that suits the time of day: *Morning Toast* (lazy electric piano), *Sunday Market* (bouncy ukulele and flute), *Rainy Window* (dreamy pads, kalimba and rain), *Lavender Tea* (a French café waltz with accordion) and *Night Bakery* (late-night jazz with vibraphone). The speaker button (top right, and a ♪ button on the title screen) opens a small menu with **Now playing** (skip back and forward, or **Stay on this song**), separate **Music** and **Sound effects** volumes, and **Mute everything**.
* Drag food onto the pantry to put it away. **Tidy counter** clears everything. Progress saves automatically.

### 🦔 Friends, hearts & decorating
* Every few minutes a **friend knocks at the window**: Hazel the Hedgehog, Rosie the Robin, Milo the Mouse, Bibi the Bunny, Felix the Fox, Fern the Frog, Dot the Duck or Bruno the Bear. Their speech bubble says what they'd love ("Something warm, please!", "Something with apple!"). On a phone they sit at the corner of the counter.
* **Drag a dish onto them** (or tap the dish, then tap them). If it fits, they're delighted and leave **hearts ♥**. If not, they give you a gentle hint. They wait as long as you like.
* Make a friend happy **three times** and they bring you a **special present** for your kitchen (a mushroom lamp, a rubber duck, a cheese clock…). The **Friends** page in the Recipe Book shows everyone you've met.
* The **♥ button** (top right) opens the **Decorate** shop. Spend hearts on **themes** (Cottage, Seaside Café, Snowy Cabin, Tea House, each with its own view from the window), **wallpaper**, **counter tops**, a **hanging** plant or lamp, something for the **window sill**, **wall art** (one is a clock that shows the real time) and **string lights**. Everything you buy is yours to keep and swap whenever you like.
* The **📝 button** is **today's recipe card**: one small goal a day (e.g. "Cook something with honey" or "Use the whisk"). Finish it for 5 hearts. A red dot means it's still waiting.
* **Madame Purrline has a favourite flavour each week** (sweet, salty, sour, rich, fresh, spicy or umami). It's a secret: serve her something strongly of that flavour and she gives extra stars, mentions it in her review and gives you bonus hearts. Once found, the Recipe Book shows it until next week.

### 🐈 Kitchen life
* **Mochi the kitchen cat** naps, sits, washes her paws and wanders along the front of the counter. **Tap her** for a purr (and 1 ♥ the first time each day). Drop a **treat** on her (fish, chicken, milk, cream or cheese) and she's thrilled: 2 ♥ once a day. She politely refuses things that are bad for cats, like chocolate, onion or garlic.
* **Seasons follow your calendar.** The view from the window changes (spring blossom, summer butterflies, autumn leaves, winter snow) and the pantry gets an **In season** section with 4 seasonal ingredients: pumpkin, pear, cranberries and chestnuts in autumn; clementine, parsnip, kale and pomegranate in winter; asparagus, peas, rhubarb and radish in spring; watermelon, zucchini, cherries and apricot in summer. There are seasonal classics to find too (Pumpkin Soup, Roasted Parsnips, Cherry Pie…). The Recipe Book hints which season a missing classic needs.
* **Cooking animations:** food drops into the pot and bubbles, the pan sizzles and sparks, the oven glows, the blender whirls, the freezer frosts. Hand tools do their job over the food (the knife chops, the whisk whirls), and hot food steams.
* **♥ → Weather & light** has the switches:
  * **Rain outside:** a grey sky, raindrops on the window and a soft patter
  * **Lighting effects** (on at first): sunlight slants in through the window and moves with the real time of day; in the evening the room dims and a warm lamp glows (from your hanging lamp, if you bought one)
  * **Low Power mode:** stops the lighting, moving decorations and Mochi's wandering, to save battery on a laptop
  * **I live south of the equator:** flips the seasons

### 🍣 More food
* **104 ingredients**, including shrimp, beef, sausage, ham, tofu, lime, mango, pineapple, cucumber, lettuce, eggplant, cabbage, lentils, chickpeas, cream cheese, mozzarella, maple syrup, miso, a **Garnishes** section, and 6 seasonal ingredients for each season.
* **472 classic dishes** to discover, from all over the world: Ramen, Pad Thai, Paella, Tiramisu, Cinnamon Rolls, Croque Monsieur, Pavlova, Bibimbap, Chana Masala, Churros, Macarons…
* **Recipe sketches:** in the Recipe Book → Classics, every dish you haven't found yet is shown as a **pencil sketch**. Stuck? Press **💡 Hint** to learn which tool finishes it, and again to see which ingredients it uses. Filters show **All**, **To find** or **Found**.

## ✨ The Kitchen Helper AI (optional)

Press **✨ AI** in the top bar. The Kitchen Helper AI gives the food you make creative names and cute descriptions, and lets Madame Purrline write her own reviews. The game itself still decides what physically happens to the food (chopped, fried, burnt…); the AI only writes the words.

* **It runs entirely on your own computer**, in the browser. Nothing is sent anywhere, and there's no account or cost.
* **Models:** **Qwen3.5 4B** (recommended, about 3 GB download, needs about 4 GB of graphics memory, which most Macs from 2020 onwards have) or **Qwen3.5 2B** (lighter, about 1.5 GB). In Chrome versions that include Google's built-in on-device AI (Gemini Nano), that's offered too, with no download from us.
* **One-time download**, with a progress bar. After that it works offline, and it switches itself back on next time (loading from your computer takes a few seconds).
* Every name and review is **checked** (length, sensible words, nothing unsuitable) and **saved**, so the same recipe always gets the same name, even with the AI off.
* **Turn it off or delete the download** any time from the same panel. Without it, the game uses its own built-in names and reviews.
* **Needs:** a browser with WebGPU. On a Mac that's Chrome or Edge, or Safari 26 (macOS Tahoe).
* It works in both the one-file `index.html` and the `game` folder version.

Credits: Qwen3.5 models by the Qwen team (Alibaba Cloud), Apache 2.0. WebLLM by MLC AI, Apache 2.0 (in `game/vendor/web-llm/`).

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
│   │   ├── kitchen.js         ←   cooking & serving
│   │   ├── table.js           ←   the counter: dragging, stacking, using hand tools on food
│   │   ├── rack.js            ←   the hand tools on the wall rail
│   │   ├── appliances.js      ←   the pot, pan, oven… and the serving plate
│   │   ├── shelf.js           ←   the pantry: sections and search
│   │   ├── review.js          ←   the critic's review card
│   │   ├── book.js            ←   the Recipe Book window (dishes, classics, friends)
│   │   ├── cozy.js            ←   hearts, what friends wish for, the daily card, the critic's weekly favourite
│   │   ├── visitors.js        ←   the friends at the window
│   │   ├── animals.js         ←   the friends' faces, drawn in code
│   │   ├── decorate.js        ←   the Decorate shop and putting decorations in the kitchen
│   │   ├── decor-art.js       ←   doodles of every decoration and window view
│   │   ├── daily.js           ←   today's recipe card
│   │   ├── cat.js             ←   Mochi the kitchen cat
│   │   ├── season.js          ←   which season it is
│   │   ├── recipes.js         ←   reads the little recipe notes of classic dishes (for sketches & hints)
│   │   ├── atmosphere.js      ←   rain, lighting effects, Low Power mode and the Weather & light switches
│   │   ├── ai.js              ←   the optional Kitchen Helper AI (runs the model, checks and saves its answers)
│   │   ├── ai-ui.js           ←   the AI panel, its button and the one-time offer
│   │   ├── music.js           ←   the music "studio": instruments, echo, playlist and crossfades
│   │   ├── tracks.js          ←   the five songs (chords, tempo, which instrument plays what); add your own here
│   │   ├── sound-ui.js        ←   the sound menu (music & effects volume, mute)
│   │   ├── title.js           ←   the title screen
│   │   ├── doodle.js, shapes.js ← the hand-drawn pictures, made in code
│   │   ├── effects.js, audio.js ← sparkles, messages and sounds (made in code, no files)
│   │   ├── state.js           ←   saving your progress
│   │   ├── data.js, load.js   ←   reading the data files
│   │   ├── i18n.js            ←   looking up on-screen text
│   │   └── main.js            ←   starts everything up
│   ├── data/
│   │   ├── ingredients.json   ← every ingredient and its taste/cooking properties
│   │   ├── signatures.json    ← the classic dishes the game recognises
│   │   ├── kitchen.json       ← hand tools, appliances and pantry sections
│   │   └── cozy.json          ← friends and their wishes & presents, decoration prices, themes, how many hearts things give
│   ├── lang/en.json           ← every piece of text: dish name patterns, critic phrases, buttons
│   ├── art/items/             ← put your own pictures here (see below)
│   └── fonts/                 ← the Fredoka font and its licence
│   └── vendor/web-llm/        ← the WebLLM library that runs the AI (only loaded if you turn the AI on)
└── dev/                       ← helper tools for development. NOT needed on your website.
    ├── build-standalone.mjs   ← packs game/ into the one-file index.html
    ├── check-classics.mjs     ← cooks every classic dish's recipe to prove it can really be made
    ├── engine-expect.mjs      ← 165 common-sense checks ("tomato + water in the pot → soup", "you can't grill water")
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

`cat` (veg, fruit, grain, dairy…), `taste` and `flags` decide how it cooks: a `juicy` veg makes sauce in a dry pot, a `raw` one upsets the critic if it isn't cooked, and so on. `cat` also decides which pantry section it appears in (see `pantry` in `kitchen.json`). Every ingredient is available from the start.

**A new classic dish**: add a line to `game/data/signatures.json`. For example, this turns any soup that contains pumpkin into "Pumpkin Soup", with a nicer description and a critic bonus:

```json
{ "id": "pumpkin_soup", "name": "Pumpkin Soup", "arch": ["soup", "creamySoup"], "need": ["pumpkin"], "season": "autumn",
  "desc": "Velvety and orange, like autumn in a bowl.", "how": "boil(pumpkin,onion,water)" },
```

`how` is one recipe that makes it: each word before a bracket is a tool action (`boil`, `bake`, `chop`, `pipe`, `rollup`, `plate`…) and the rest are ingredient ids. The Recipe Book draws its pencil sketch and hints from it. Run `node dev/check-classics.mjs` to check that every classic's recipe really cooks into that classic (it also warns if a classic higher up the list "steals" it).

**Hand tools, appliances and pantry sections** are in `game/data/kitchen.json`. **All text** (including the dish name patterns like `"{x} Soup"` and Madame Purrline's phrases) is in `game/lang/en.json`.

Every line ends with a comma **except the last one** in a list. If you make a typo, the game doesn't break: it skips that line and reports it in the browser's console. To see changes in the one-file `index.html`, it needs rebuilding (`node dev/build-standalone.mjs`). I rebuild it at every stage, and **Start Kitchenria.command** always shows your edits straight away.

## 🎨 Replacing the art with your own pictures

Every picture is drawn by code. Ingredients and tools use their `art` settings: a `shape` (see `game/js/shapes.js`, or open `dev/gallery.html` to see them all), plus `color`, `accent` and an optional `top`ping. Cooked creations get their picture automatically from what they are (soup → bowl, cake → cake…) and the colours of their ingredients.

To use **your own picture** for an ingredient or a tool:

1. Save it as a square PNG, WebP or SVG, ideally about 256×256 pixels with a transparent background.
2. Put it in `game/art/items/`, e.g. `game/art/items/apple.png`.
3. In `ingredients.json` (or `kitchen.json` for hand tools and appliances), add an `image` line inside its `art`:

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
| **1. Kitchen & core play** | Stacking, hand tools (hands with 9 actions), appliances, the food engine (any combination works), burning/freezing/marinating/ageing, plating, the critic with 0.0–5.0 stars and reviews, painted dish portraits, the Recipe Book, 52 ingredients, 75 classic dishes, sounds, auto-save, mouse/touch/keyboard | ✅ done |
| **2. Bigger world** | 104 ingredients with garnishes and seasonal produce, 472 classic dishes from around the world, new tools (peeler, piping bag, sushi mat, wok, waffle iron), garnishing, recipe sketches & hints in the Recipe Book | ✅ done |
| **3. Kitchen helper AI** | Optional Qwen3.5 4B / 2B (or Chrome's built-in AI) on the player's own device, writing creative names, descriptions and critic reviews. Asks first, shows download size and progress, can be deleted, answers checked and saved forever, works offline | ✅ built (needs testing on a real Mac) |
| **4. Friends & decorating** | 8 animal friends with wishes and presents, hearts, the Decorate shop with 4 themes and 6 kinds of decoration, the daily recipe card, the critic's weekly favourite flavour | ✅ done |
| **5. Kitchen life** | Mochi the cat, seasons with a seasonal pantry and classics, rain, lighting effects (real-time sunlight, evening lamp glow, steam, shadows), Low Power mode, cooking animations, ~~music~~ (done early) | ✅ done |
| **6. Full game & app** | ~~Title screen~~ (done early), settings, pause, credits, save export/import/reset, accessibility options, installable app that works fully offline, final testing | |

## Credits & licences

* Game code and doodle art: made for Kitchenria.
* Font: [Fredoka](https://github.com/hafontia/Fredoka-One) by The Fredoka Project Authors, SIL Open Font License 1.1 (see `game/fonts/OFL-LICENSE.txt`).
* Sound effects and music: original, composed for Kitchenria and generated live in code with the Web Audio API (`game/js/audio.js`, `game/js/music.js` and `game/js/tracks.js`). There are no audio files and no third-party music, so there's nothing to licence: the music is part of your game.
