# Regional Boss Progression

## Rules

- The palace ground floor has three regional guardians. Kyle is upstairs with
  his existing 1000 health. Use Z on either staircase to travel between floors.
- Palace guardians start battle on contact. A guardian also appears in
  its home region when all ordinary enemies there have been restored.
- Both appearances share one defeat state. Winning at either location removes
  both and releases the region's restored inhabitants exactly once.
- Sylvan releases 3 cubes; Azure Apex releases 5 cubes and 1 soul;
  Controlled Plains releases 6 cubes. These residents wander their home region
  and remain there after travel. They do not occupy village homes or count as
  controlled enemies. New Game resets bosses and removes these extra residents.
- Cubes award 5 DP, ordinary controlled souls award 10 DP, and bosses retain
  the existing 5 DP reward. Released inhabitants do not award additional points.
- Wither triggers every five attack hits: 15% maximum Control against ordinary
  enemies and 5% against guardians and Kyle.

## Guardian Pursuit And Stats

Guardians spot the King anywhere on an unobstructed row or column in their
area. Once pursuing, they track him in any direction while visible, moving 20%
faster than his sprint. Trees, including walk-through thicket trees, and other
solid terrain break sight; passable rocks do not. Guardians follow the last seen
position, then break pursuit and walk away after five seconds without sight.
Contact opens battle with `A guardian has appeared.` No interaction key is needed.
Leaving an area or reviving clears pursuit. Kyle retains his separate dialogue
and encounter upstairs.

Home-region guardians now select a random reachable clearing with full-body
clearance and room in all four directions. Sylvan's guardian excludes the
thicket and village grounds, and therefore appears in the open field portion.

Enter or Space dismisses temporary exploration messages and NPC dialogue,
releasing paused residents and restoring the nearby interaction prompt. During
Kyle's scripted conversation these keys advance one line, preserving the battle
sequence. Z continues to work for interactions and scripted dialogue.

The Divine Path groups tier-three choices over their required tier-two node.
Dodge is shared above both defense branches. Existing costs, branch locks and
ability effects are retained. Narrow screens stack the three complete paths.
Azure Village's new dialogue is intentionally left as the classroom exercise in
`STUDENT-EXERCISE.md`.

Guardians have twice the ordinary attack, defense, and health for their level.

| Guardian | Displayed Level | Health | Attack | Defense |
| --- | --- | --- | --- | --- |
| Sylvan | 20 | 160 | 46 | 14 |
| Azure | 50 | 340 | 106 | 26 |
| Plains | 100 | 640 | 206 | 46 |

The stairs remain available without defeating all three guardians.

## Upgrade Balance Audit

The actual purchase flow increases player stats correctly. Buying Health,
Greater Health, Higher Health, Damage, Greater Damage, Defense, and Greater
Defense produces 48 maximum health, 15 attack, and 11 defense.

The Power Scaling 2 update also grants +3 maximum/current health with Wither,
Strengthen, or Heal Over Time; +3 attack with Crit Rate or Double Attack; and
+3 defense with Dodge. Greater Damage now grants +5 attack and Magic grants
+4 attack. Existing branch choices, costs and ability behavior are retained.

Ordinary level 50 enemies currently have 53 attack, so they deal 42 damage
against that defense, or 84 on a critical hit. Level 100 enemies and Kyle have
103 attack, dealing 92 damage before critical hits. Those enemies can kill a
player using that upgrade selection in one critical or ordinary hit respectively.

This confirms a late-game scaling gap, not a failure to apply purchased stats.
The requested soul rewards, Wither buff and Power Scaling 2 upgrade bonuses
are implemented. Ordinary stat formulas and Kyle's stats are unchanged;
player growth versus ordinary enemy scaling still needs a separate tuning decision.

## Temporary Dagger Test Mode

In Pristine Castle, stand over the dusty dagger and inspect it with three
separate Z presses, then press H while still in the castle. Activation is silent.
Holding Z does not count as multiple inspections, and H cannot enable
the shortcut outside the castle or before the third inspection.

While active, Defend instantly restores the current opponent without an enemy
counterattack. It works for cubes, souls, guardians and Kyle, using normal
victory rewards and boss progression. New Game clears the inspection count and
the mode. It is not saved between page reloads.

This shortcut is temporary. To remove it later, remove `daggerTestMode` from
`js/game-state.js`, its counting branch in `interactWithCastle`, the H-key
activation and reset entries in `js/game.js`, and its `defendAction` branch.
Keep the ordinary Defend validity guard and key-repeat suppression.

## Sprite Preparation

The built-in imagegen tool prepared transparent cutouts from Luciano's source
drawings. Original files are preserved. Outputs used by both canvas exploration
and HTML battles are:

- `img/assets/sylvan/boss-transparent.png`
- `img/assets/Azure Apex/boss-transparent.png`
- `img/assets/plains-boss-transparent.png`

Prompt specifications used for each source:

- Sylvan: background extraction; remove outside white background and caption;
  close crop with transparent padding; preserve rough drawing, dark plum fills,
  black outlines, white eyes and interior whites, left-facing pose, attached
  cubes, horns and proportions; no redesign, polish, detail or shadows.
- Azure: background extraction; remove outside white background and caption;
  close crop with transparent padding; preserve rough black outlines, plum
  fills, white eyes, cubes, toothed floating head and lower body, proportions
  and left-facing pose; no redesign, polish or shadows.
- Plains: background extraction; remove outside white background and caption;
  close crop with transparent padding; preserve rough black outlines, plum
  fills, white eyes, horns, large mouth, attached cubes and left-facing pose;
  no redesign, polish, shadow or proportion changes.

## Verification

Run `node tests/map-regression.cjs`. It checks castle progression, existing
combat, exact boss release counts, rewards, Wither, shared defeat state, safe
spawns, resident movement and persistence, stairs, reset, sprite transparency,
and desktop/mobile local-file loading. Boss screenshots go to the OS temp
folder for visual inspection.
