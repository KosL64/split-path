# Regional Boss Progression

## Rules

- The palace ground floor has three regional guardians. Kyle is upstairs with
  his existing 1000 health. Use Z on either staircase to travel between floors.
- Palace guardians can be challenged immediately. A guardian also appears in
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

## Initial Guardian Tuning

Tune `regionalBossDefinitions` in `js/map-data.js`. Names and stats are initial
defaults for classroom playtesting, not values supplied by Luciano.

| Guardian | Displayed Level | Health | Attack | Defense |
| --- | --- | --- | --- | --- |
| Sylvan | 20 | 100 | 8 | 6 |
| Azure | 50 | 160 | 11 | 8 |
| Plains | 100 | 240 | 14 | 10 |

Guardians use explicit combat stats rather than the ordinary-enemy level
formula, so a high displayed level does not automatically cause lethal damage.
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
separate Z presses, then press H while still in the castle. A confirmation
appears. Holding Z does not count as multiple inspections, and H cannot enable
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
