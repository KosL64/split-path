# Split Path — Phase One Game Scope

## Project Overview

**Split Path** is a story-driven side-scrolling RPG designed around restoring corrupted/controlled cube creatures rather than destroying them.

The player begins as a weakened version of the **Pristine King**, a mythical cube ruler whose kingdom has been taken over by a mysterious figure. The king has been reborn as a basic cube and must restore controlled cubes, earn **Divine Points**, follow the branching **Divine Path**, and gradually regain his former power.

Phase One should establish the game's tone, story, movement, first enemy encounter, restoration mechanic, Divine Point reward loop, and the beginnings of the upgrade system.

---

# Original Game Concept

## Plot

You play as a cube who must restore enemies back to normal while upgrading yourself along the way.

As the player upgrades, the character gradually evolves back toward the Pristine King's original form.

## Story

The player was once the **Pristine King**, ruler of the Pristine Cubes in the area.

One day, a mysterious figure took the king's place and gained control over the cubes throughout the land.

The Pristine King was reborn in a weakened form as a normal cube.

To regain his powers, the player must:

1. Explore the world.
2. Find controlled cubes and Pristine Souls.
3. Restore them instead of defeating them permanently.
4. Earn Divine Points by doing good deeds.
5. Spend Divine Points on the Divine Path.
6. Grow stronger and eventually regain the form and powers of the Pristine King.

---

# Lore

## Pristine Cubes and Pristine Souls

The world contains several cube-like beings, including:

- Regular Pristine Cubes
- Pristine Souls
- The Pristine King

The **Pristine King** is the leader of the Pristine Cubes and is more powerful than ordinary cubes and souls.

The player begins the game as a weakened form of this king.

## Divine Points

**Divine Points** are chips or pieces of light.

They are earned through good deeds, especially restoring controlled creatures.

Divine Points act as the game's primary upgrade currency.

The harder the controlled enemy is to restore, the more Divine Points the player can earn.

## The Divine Path

The **Divine Path** is a special upgrade path used by Pristine Souls and the player.

It begins with three main upgrade categories:

- **Damage**
- **Defense**
- **Health**

Each category can eventually split into multiple branches.

The player's choices can create a different Divine Path from another player's choices.

This branching upgrade system is the reason the game is called **Split Path**.

## The Pristine King

The Pristine King is the most powerful Pristine being.

Finishing the Divine Path is part of the process of becoming the Pristine King again.

---

# Larger Game Ideas

These ideas belong to the full game and should guide development, but most do **not** need to be completed during Phase One.

## Controlled Cubes

Controlled cubes are not meant to be killed.

When encountered, the player uses the Pristine King's staff or restoring power to return them to normal.

Restoring controlled enemies gives the player Divine Points.

## Bosses

Bosses are different from normal controlled enemies.

Planned rules:

- There is approximately one boss for each major area.
- Bosses do not award normal Divine Points.
- A boss should only become available after the controlled cubes and souls in its area have been restored.
- Defeating/restoring the area's boss frees the land.

## Map Changes and Villages

The world should visually react to the player's progress.

After all controlled creatures in an area have been restored and the boss is defeated:

- abandoned areas may reopen;
- villages may become active;
- NPCs may return;
- scenery may become brighter and healthier;
- terrain may change;
- new paths or locations may become available.

This should eventually make the player's progress visible in the world itself.

---

# Phase One Goal

Create a small but polished playable prototype in **vanilla HTML, CSS, and JavaScript**.

The prototype should feel like the beginning of Split Path rather than a generic platformer.

The player should be able to:

1. Start the game.
2. View an interactive story introduction.
3. Enter a side-scrolling level.
4. Move and jump as the weakened cube hero.
5. Explore a small first area.
6. Encounter at least one controlled cube.
7. Enter a simple restoration battle or encounter.
8. Restore the controlled cube.
9. Earn Divine Points.
10. See the Divine Points total update.
11. Spend or preview Divine Points in the three starting Divine Path categories.
12. Return to the level after the encounter.

The goal is to create the game's first complete playable loop.

---

# Recommended Technology

Use:

- HTML5
- CSS3
- Vanilla JavaScript
- HTML5 Canvas for the side-scrolling game world
- Standard DOM elements for menus, story panels, HUD, and upgrade screens

Do **not** use React, Phaser, Unity, or another framework for Phase One.

The code should be easy for a coding student to read, modify, and learn from.

---

# Suggested File Structure

```text
split-path/
│
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── game.js
│   ├── player.js
│   ├── world.js
│   ├── enemies.js
│   ├── battle.js
│   ├── story.js
│   └── upgrades.js
│
└── assets/
    ├── images/
    ├── sprites/
    └── audio/
```

If this structure feels too complicated for the first implementation, Codex may begin with fewer JavaScript files, but the code should still be organized into clear sections/classes or modules.

---

# Screen Flow

```text
TITLE SCREEN
     ↓
STORY INTRO SLIDER
     ↓
FIRST SIDE-SCROLLING AREA
     ↓
CONTROLLED CUBE ENCOUNTER
     ↓
RESTORATION BATTLE
     ↓
DIVINE POINT REWARD
     ↓
DIVINE PATH / UPGRADE PREVIEW
     ↓
RETURN TO WORLD
```

---

# 1. Title Screen

Create a simple title screen containing:

- Split Path logo/title
- Play button
- short subtitle such as:
  **Restore the land. Reclaim the crown. Choose your path.**

Optional visual elements:

- glowing Divine Point symbol;
- silhouette of the Pristine King;
- weakened cube player;
- dark controlled cube in the background.

Clicking **Play** begins the story introduction.

---

# 2. Interactive Story Slider

Before gameplay begins, show a short interactive story sequence.

This should use HTML/CSS rather than Canvas so text remains easy to edit.

The player should be able to move through the story using:

- Previous button
- Next button
- progress dots
- optional keyboard arrow controls

A **Skip Story** button may also be included.

## Suggested Story Slides

### Slide 1 — The King

**Text:**

Long ago, the Pristine King watched over the cubes and souls of the land.

**Visual:**

The full Pristine King with crown, staff, beard, or other details inspired by the student's drawings.

### Slide 2 — The Takeover

**Text:**

Then a mysterious figure appeared. One by one, the cubes of the kingdom fell under its control.

**Visual:**

Darkened controlled cubes and the shadow/silhouette of the mysterious figure.

### Slide 3 — Reborn

**Text:**

The king's power was taken from him, and he awakened again as a simple cube.

**Visual:**

Transition from Pristine King to the small basic player cube.

### Slide 4 — Divine Points

**Text:**

By restoring controlled creatures, the king can earn Divine Points — pieces of light created through good deeds.

**Visual:**

A glowing Divine Point symbol floating beside the player.

### Slide 5 — The Split Path

**Text:**

Every Divine Point brings him closer to his former power. But the path back to the throne can split in many directions.

**Visual:**

Three branches labeled Damage, Defense, and Health.

### Slide 6 — Begin

**Text:**

Restore the land. Follow your Divine Path. Become the Pristine King once more.

**Button:**

**Begin Journey**

---

# 3. Side-Scrolling World

After the story sequence, launch the first playable side-scrolling area.

## Player

For Phase One, use a simple cube sprite based on the student's basic cube drawing.

The player should support:

- Move left
- Move right
- Jump
- Gravity
- Ground collision
- Basic platform collision

Suggested controls:

```text
A / Left Arrow  = Move Left
D / Right Arrow = Move Right
W / Up Arrow / Space = Jump
E = Interact
Esc = Pause
```

## Camera

The camera should follow the player horizontally.

The world should be wider than the visible screen.

Do not allow the camera to scroll outside the level boundaries.

## Visual Style

Phase One can use simple shapes and temporary art.

Preferred look:

- hand-drawn / storybook feel;
- rounded cube characters;
- mystical ruins;
- dim environment while the land is controlled;
- glowing Divine Point symbols;
- warm light around restored characters.

Temporary CSS/Canvas shapes are acceptable until final art is created.

---

# 4. First Level

Create one small test area.

Suggested elements:

- starting clearing;
- small platforms;
- ruined sign or abandoned structure;
- one decorative Divine Path symbol;
- one controlled cube;
- end boundary that cannot be crossed until the controlled cube is restored.

The level does not need to contain a boss yet.

The purpose of the first level is to teach:

- movement;
- exploration;
- interaction;
- restoration;
- Divine Points.

---

# 5. Controlled Cube Encounter

Place one controlled cube in the level.

The controlled cube should look visually different from a normal cube.

Possible visual differences:

- darker body;
- glowing or shadowed eyes;
- dark particles;
- pulsing aura.

When the player gets close, show:

**Press E to Restore**

Pressing E begins the encounter.

---

# 6. Restoration Battle

The student's original plan describes the game shifting into a 2D battle when a controlled cube is encountered.

For Phase One, keep this battle intentionally simple.

## Battle Screen

Display:

- player on the left;
- controlled cube on the right;
- player health;
- enemy/control meter;
- Restore button;
- Guard button;
- optional Focus button.

Rather than calling the enemy meter "Health," consider calling it:

**Control**

The goal is to reduce the enemy's Control to zero.

## Suggested Phase One Actions

### Restore

Uses the player's staff/light ability.

Reduces enemy Control.

### Guard

Reduces the strength of the enemy's next attack.

### Focus

Optional.

Restores a small amount of the player's energy or makes the next Restore action stronger.

## Battle Result

When enemy Control reaches zero:

- do not destroy the enemy;
- animate the dark cube becoming bright/normal;
- show **RESTORED!**;
- award Divine Points;
- return to the side-scrolling world.

For Phase One, one restored cube can award approximately **5 Divine Points**.

Keep this value in a JavaScript configuration object so it can easily be changed later.

---

# 7. Divine Points HUD

During gameplay, show the player's current Divine Point total.

Example:

```text
△  Divine Points: 5
```

Use the triangular Divine Point symbol from the student's concept art as inspiration.

For Phase One, a simple CSS or Canvas symbol is acceptable.

---

# 8. Divine Path Screen

After the first restoration, briefly introduce the upgrade system.

Create a simple overlay or menu showing:

```text
              BASIC
            /   |   \
        DAMAGE DEFENSE HEALTH
```

Each path should have one available Phase One upgrade.

Example:

### Damage

**Radiant Force I**

Restore attacks deal +1 power.

### Defense

**Pristine Guard I**

Reduce incoming damage by 1.

### Health

**Soul Light I**

Increase maximum health by 5.

Each first upgrade can cost **5 Divine Points**.

Only basic first-tier upgrades need to function during Phase One.

The larger branching tree should be saved for a later phase.

---

# 9. Player Progression

Use a central player state object.

Example:

```javascript
const playerState = {
  divinePoints: 0,
  health: 20,
  maxHealth: 20,
  restorePower: 3,
  defense: 0,
  upgrades: {
    damage: 0,
    defense: 0,
    health: 0
  }
};
```

The exact values can change.

The important requirement is that game data is not scattered through many unrelated variables.

---

# 10. First World Transformation

After the controlled cube is restored, create one small visible change in the overworld.

Examples:

- a dead plant becomes green;
- the sky becomes slightly brighter;
- a lantern turns on;
- a dark patch of ground becomes colorful;
- the restored cube appears peacefully in the world.

This is important because the full game is intended to make the world visibly heal as the player restores it.

Phase One only needs **one** demonstration of this idea.

---

# 11. Save System

A full save system is not required yet.

Optional:

Use `localStorage` to remember:

- whether the intro has been viewed;
- Divine Point total;
- chosen first upgrade.

If implemented, include a **Reset Game** button for testing.

---

# 12. Responsive Behavior

The primary target is desktop/laptop.

The game should still scale reasonably on smaller browser windows.

Requirements:

- Canvas maintains its aspect ratio.
- Menus remain readable.
- Story slider does not overflow the screen.
- Controls should be explained on-screen.

Touch/mobile controls are not required in Phase One.

---

# 13. Accessibility

Include:

- readable text contrast;
- visible button focus states;
- keyboard-operable story slider;
- keyboard-operable menus;
- reduced-motion friendly transitions where practical.

Do not place important story text directly inside the Canvas if normal HTML can be used instead.

---

# Phase One Visual Assets

Codex should begin with temporary artwork if finished assets do not yet exist.

Suggested temporary assets:

- basic player cube;
- controlled cube;
- restored cube;
- Divine Point symbol;
- Pristine King silhouette;
- mysterious figure silhouette;
- staff;
- simple ruins/ground/platform tiles.

The student's original drawings should guide the design language, but Phase One should prioritize functionality over perfect artwork.

---

# Phase One Non-Goals

Do **not** build these yet:

- multiple full areas;
- multiple bosses;
- large branching Divine Path tree;
- inventory system;
- equipment system;
- complex NPC dialogue;
- quests;
- shops;
- complete village system;
- final Pristine King transformation;
- multiplayer;
- mobile touch controls;
- procedural generation;
- advanced animation system.

These can be introduced in later phases.

---

# Acceptance Criteria

Phase One is complete when all of the following work:

- [ ] Opening Split Path title screen appears.
- [ ] Play button opens the story slider.
- [ ] Story slider contains multiple panels and Previous/Next controls.
- [ ] Begin Journey launches the first level.
- [ ] Player can move left and right.
- [ ] Player can jump.
- [ ] Camera follows the player horizontally.
- [ ] Player collides with the ground/platforms.
- [ ] A controlled cube exists in the world.
- [ ] Player can interact with the controlled cube.
- [ ] Encounter transitions into a battle/restoration screen.
- [ ] Player can use Restore.
- [ ] Enemy Control can reach zero.
- [ ] Enemy becomes restored instead of being killed.
- [ ] Player receives Divine Points.
- [ ] Divine Point HUD updates immediately.
- [ ] Divine Path screen contains Damage, Defense, and Health.
- [ ] At least one first-tier upgrade can be purchased.
- [ ] Purchased upgrade changes player stats.
- [ ] The overworld shows at least one positive visual change after restoration.
- [ ] Player can continue moving after returning from the encounter.
- [ ] No JavaScript console errors appear during the main gameplay loop.

---

# Starter `index.html`

Codex may alter the markup if necessary, but Phase One can begin from this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Split Path</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>

<body>
  <main id="app">

    <section id="title-screen" class="screen active">
      <div class="title-card">
        <h1>Split Path</h1>
        <p>Restore the land. Reclaim the crown. Choose your path.</p>
        <button id="play-button">Play</button>
      </div>
    </section>

    <section id="story-screen" class="screen" aria-label="Story introduction">
      <div class="story-slider">
        <div id="story-slide" class="story-slide"></div>

        <div class="story-progress" id="story-progress"></div>

        <div class="story-controls">
          <button id="story-prev">Previous</button>
          <button id="story-next">Next</button>
          <button id="story-skip">Skip Story</button>
        </div>
      </div>
    </section>

    <section id="game-screen" class="screen">
      <div id="hud">
        <span id="divine-points">△ Divine Points: 0</span>
        <button id="upgrade-button">Divine Path</button>
      </div>

      <canvas
        id="game-canvas"
        width="960"
        height="540"
        aria-label="Split Path game world"
      ></canvas>

      <div id="interaction-prompt" class="hidden">
        Press E to Restore
      </div>
    </section>

    <section id="battle-screen" class="screen">
      <div class="battle-panel">
        <div id="battle-player"></div>
        <div id="battle-enemy"></div>

        <div class="battle-stats">
          <p>Player Health: <span id="player-health"></span></p>
          <p>Enemy Control: <span id="enemy-control"></span></p>
        </div>

        <div class="battle-actions">
          <button id="restore-action">Restore</button>
          <button id="guard-action">Guard</button>
          <button id="focus-action">Focus</button>
        </div>

        <p id="battle-message"></p>
      </div>
    </section>

    <section id="upgrade-screen" class="screen">
      <div class="upgrade-panel">
        <h2>Divine Path</h2>
        <p>Choose how your path begins.</p>

        <div class="upgrade-grid">
          <button data-upgrade="damage">
            <strong>Damage</strong>
            <span>Radiant Force I</span>
          </button>

          <button data-upgrade="defense">
            <strong>Defense</strong>
            <span>Pristine Guard I</span>
          </button>

          <button data-upgrade="health">
            <strong>Health</strong>
            <span>Soul Light I</span>
          </button>
        </div>

        <button id="close-upgrades">Return</button>
      </div>
    </section>

  </main>

  <script src="js/story.js"></script>
  <script src="js/player.js"></script>
  <script src="js/world.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/battle.js"></script>
  <script src="js/upgrades.js"></script>
  <script src="js/game.js"></script>
</body>
</html>
```

---

# Suggested Story Data

Keep the intro slides in JavaScript data so the student can rewrite them without changing the slider code.

```javascript
const storySlides = [
  {
    title: "The King",
    text: "Long ago, the Pristine King watched over the cubes and souls of the land.",
    image: "assets/images/story-king.png"
  },
  {
    title: "The Takeover",
    text: "Then a mysterious figure appeared. One by one, the cubes of the kingdom fell under its control.",
    image: "assets/images/story-takeover.png"
  },
  {
    title: "Reborn",
    text: "The king's power was taken from him, and he awakened again as a simple cube.",
    image: "assets/images/story-reborn.png"
  },
  {
    title: "Divine Points",
    text: "By restoring controlled creatures, the king can earn Divine Points — pieces of light created through good deeds.",
    image: "assets/images/story-divine-points.png"
  },
  {
    title: "The Split Path",
    text: "Every Divine Point brings him closer to his former power, but the path back to the throne can split in many directions.",
    image: "assets/images/story-path.png"
  }
];
```

---

# Codex Implementation Instructions

Build Phase One incrementally.

## Milestone 1 — App Shell

Create:

- title screen;
- story screen;
- game screen;
- battle screen;
- Divine Path screen;
- shared screen switching logic.

Verify screen navigation before building gameplay.

## Milestone 2 — Story Slider

Implement:

- slide data;
- Previous/Next;
- progress dots;
- keyboard arrows;
- Begin Journey;
- Skip Story.

## Milestone 3 — Side Scroller

Implement:

- Canvas;
- game loop;
- keyboard input;
- player cube;
- gravity;
- movement;
- jumping;
- collision;
- camera;
- simple level geometry.

## Milestone 4 — Controlled Cube

Implement:

- enemy placement;
- proximity detection;
- interaction prompt;
- E-key interaction;
- battle transition.

## Milestone 5 — Restoration Battle

Implement:

- player stats;
- enemy Control stat;
- Restore;
- Guard;
- Focus;
- simple enemy turn;
- restoration victory state.

Keep the combat rules transparent and easy to tune.

## Milestone 6 — Divine Points

Implement:

- Divine Point reward;
- HUD;
- player state;
- upgrade cost checks.

## Milestone 7 — Divine Path

Implement:

- Damage first-tier upgrade;
- Defense first-tier upgrade;
- Health first-tier upgrade;
- stat changes;
- purchased state.

## Milestone 8 — World Healing

After the first cube is restored:

- replace the controlled cube with its normal version;
- brighten one part of the environment;
- optionally unlock the right edge of the test area.

## Milestone 9 — Polish

Add:

- transitions;
- small particles;
- hover/focus states;
- instructions;
- reset button;
- basic responsive scaling;
- comments explaining important code.

---

# Important Development Rule

The project is being built as part of a coding class.

Codex should favor **clear, teachable code** over clever or highly abstract code.

When possible:

- use descriptive variable names;
- comment major systems;
- keep functions focused;
- avoid unnecessary dependencies;
- keep gameplay values in easy-to-find configuration objects;
- make each milestone playable before moving to the next one.

---

# Future Phase Ideas

After Phase One works, possible later phases include:

1. More controlled enemy types.
2. Larger levels.
3. Pristine Souls.
4. Dialogue and NPCs.
5. Full branching Divine Path.
6. Multiple areas.
7. Boss encounters.
8. Villages reopening.
9. World-state transformations.
10. Visible evolution of the player's cube form.
11. Final restoration of the Pristine King.
12. Expanded lore for the mysterious figure.

---

# Notes From the Handwritten Concept

The original concept art includes:

- the Pristine King;
- a basic/normal cube;
- controlled cube designs;
- a mysterious horned figure;
- a staff;
- Divine Point coin/chip concepts;
- a branching upgrade path;
- Pristine Soul concepts;
- a symbol/logo of light.

Those drawings should remain the primary visual reference as the game's art direction develops.

One handwritten character label appears to possibly read **"Kyle"** near the mysterious figure. Keep that name as a placeholder only until the student confirms the character's final name.
