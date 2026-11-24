# Code Ownership

Map work and combat work use separate files to reduce merge conflicts. The split
preserves the existing plain JavaScript setup: `index.html` still works when
opened directly, with no build step or module server.

| File | Work here for |
| --- | --- |
| `js/map-data.js` | Region directory, area layouts, tile placement, home slots, enemy counts and level ranges |
| `js/map-assets.js` | Map textures, rock and character sprite loading |
| `js/map-mechanics.js` | Movement, collision, spawning, NPC behavior, pathfinding, camera, interactions, restoration progression, world reset |
| `js/map-rendering.js` | World, castle, village, terrain, player and NPC canvas rendering |
| `js/map-overworld.js` | Connected exterior placement, bridge, building portals, house interiors and shared exterior camera |
| `js/map-landmarks.js` | Terrain expansion, forest, cliff gates, stairs, paths, spring healing and mountain clouds |
| `js/game.js` | Combat, spells, timing bonuses, upgrades, story, UI bindings and game loop |
| `js/battle-skillchecks.js` | Circular healing and Life Steal checks, timing and sequence cleanup |
| `js/save-system.js` | Four save slots, validation, browser storage, checkpoints, stickers and save UI |
| `js/game-state.js` | Shared player state, configuration, combat state and geometry/canvas helpers |
| `css/styles.css` | HTML UI styling, including battle and upgrade screens |

## Loading And Shared State

`index.html` loads `game-state`, `map-data`, `map-assets`, `map-mechanics`,
`map-rendering`, `map-landmarks`, `map-overworld`, `battle-skillchecks`, `save-system`, then `game`. Keep that order. Only `game.js` starts world
initialization after all scripts have loaded. The map files define data, load
images, and declare functions; they do not start the game loop or bind keys.

These are classic scripts sharing the existing global lexical scope, not isolated
ES modules. This minimizes behavior changes and preserves local-file play. Keep
top-level names unique. New map-specific settings belong in a map file rather
than expanding shared state unnecessarily.

## Map And Combat Boundary

- `game.js` calls `restoreMapEnemy(enemy, areaId)` after a battle. Map code owns
  resident assignment, area healing, village locks and area renaming. The returned
  `area`, `remainingEnemies` and `areaCleared` drive the existing battle UI.
- `game.js` calls `resetMapState()` on a new game, then `enterArea()` to position
  the player. Combat owns player stats, upgrades, spell use and battle timers.
- Map encounters call `startBattle(enemy)`. Enemies retain their existing fields;
  `statsForLevel()` in `game.js` supplies combat stats during map initialization.
- The game loop calls movement, encounters and drawing functions from the map
  files. Keep these entry points stable when changing map internals.
- Map rendering reads shared player/enemy state. It does not calculate battle
  damage or change spell use.
- `initializeOverworld()` runs before enemy spawning, so village and building
  footprints are excluded from enemy spawn choices. See `OVERWORLD.md` for
  coordinates, region crossing and interior return rules.

## Branch Workflow

Land this file split on `omega` first, then merge that commit into the map branch
before further map edits. Do not separately recreate the split on both branches.
If the map branch already changed the old `game.js`, move those edits into their
new owning files while resolving that first merge.

After both branches share the split, normal map work should stay in `map-*.js`;
combat work should stay in `game.js`. Shared state and `index.html` still require
coordination. Separate files reduce conflicts but do not eliminate behavioral
dependencies, so check castle interactions, movement, encounters, restoration,
reset, spells and timing bonuses when merging.

## Verification

### Browser Saves

Play opens four independent save slots. Empty slots show the introduction;
existing slots resume exploration or their completed ending. Each slot is stored
under `split-path.save.v1.1` through `split-path.save.v1.4` in localStorage.
Saves belong to this browser/profile and game location; they do not sync between
computers. Moving a local-file copy or switching to a hosted URL can use a
different storage area. No server or build step is required.

Save after purchases, castle/NPC messages, safe screen transitions, victories,
every five seconds during exploration, and when the page is hidden or closed.
A battle keeps its pre-encounter checkpoint until victory or revival. Reloading
mid-battle resumes exploration from that checkpoint, with a short contact grace
period. Victory rewards and completed endings are stored before their animation
finishes. Enemy turn timers, circular checks, pursuit, held keys and the temporary
dagger cheat are not restored.

The save includes player stats/upgrades, location, castle exit, all creature and
resident identities/positions, guardian states and dialogue milestones. Object
references and Sets are reconstructed after loading. Patience awards a small
colored border sticker in that slot. Restart Save confirms before resetting only
the active slot, including its stickers; deletion confirms on the selection
screen. Save & Quit returns to selection. Credits retain the completed save.

Save data is versioned and validated per slot. An unreadable or incompatible
slot can be explicitly deleted without affecting the other three. Storage
failures show an in-game message and retain the current session in memory;
that fallback cannot survive closing the page.

Run `node tests/map-regression.cjs --saves-only` for desktop HTTP and mobile
direct-file tests of slot isolation, refresh, dialogue/boss/resident persistence,
stickers, battle checkpoints, victory rewards, completed endings, deletion,
restart, damaged records and unavailable storage. Save-screen screenshots go to
the OS temporary folder.

Run `node tests/map-regression.cjs` for browser checks of the map/combat boundary
and direct local-file startup. The test uses an installed `playwright` package,
or the Codex desktop bundled runtime, and launches installed Edge by default.
Set `PLAYWRIGHT_CHANNEL` when using another installed Playwright browser channel.
The temporary HTTP test server and browser are closed when the test finishes.

The suite also verifies full-hitbox routes to every exterior entrance, safe
interior arrivals and returns, river collision, cross-region walking, restoration
persistence, and desktop/mobile screenshots. The optional `--baseline` mode
requires a compatible game/UI and should not be used to compare the connected
overworld with the intentionally different old Kingdom Map selector.
