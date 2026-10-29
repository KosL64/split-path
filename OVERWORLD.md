# Connected Overworld

Implemented on Map-Updates from Luciano's `Map Update Major.txt` and
`img/assets/Castle Map.png`. The Kingdom Map selector and M-key travel are removed.

## Layout

Exterior placement lives in `js/map-overworld.js`. Coordinates are tiles, measured
from the northwest corner of the complete 160 by 167 exterior. This is 26,720
tiles versus the original 8,832: approximately three times the outdoor area,
not three times both dimensions. Actors, houses and interiors keep their scale.

| Exterior | Origin | Size | Notes |
| --- | --- | --- | --- |
| Castle grounds | 0, 0 | 160 by 31 | Stone bridge remains four tiles wide; river crossing length grows from five to nine tiles |
| Controlled Plains | 0, 31 | 66 by 136 | West of both eastern regions; palace entrance in the southwest |
| Sylvan | 66, 31 | 94 by 68 | Immediately below the bridge |
| Azure Apex | 66, 99 | 94 by 68 | Directly south of Sylvan |
| Sylvan Village | 124, 37 | 32 by 20 | Northeast Sylvan, surrounded by Sylvan Thicket |
| Azure Village | 112, 133 | 44 by 30 | Southeast Azure Apex, raised cliff with a higher cloud terrace |

Village chunks take priority over the underlying region when selecting collision
tiles and player location. The renderer draws visible neighbors with one camera,
so region changes do not recenter the view or teleport the player. Regional actor
coordinates remain local; region boundaries convert only the player's position.

The three major regions keep their existing enemy counts, levels and progression.
Terrain is expanded without increasing actor or building size. Border strips are
opened at connecting regional edges; village boundaries now implement the access
rules described below. Old regional exit tiles remain replaced with floor.
One Azure home moves from column 31 to 33 on row 18 to give the house above it
enough doorway clearance for the King's 44 by 62 hitbox. Home slot IDs remain stable.
Azure's homes shift four columns right and eight rows down to make space for the
new higher terrace. Sylvan gains two rows of clearance below its houses.

## Landmarks And Village Access

`js/map-landmarks.js` owns expansion, paths, progression tiles and environmental
effects. The ground art comes from Luciano's existing Sylvan sprites and
`img/assets/Azure Apex/Azure Apex background 2.jpg`. Sylvan Village shares
Sylvan's ground texture. The green welcome sign reads `W lc me to Sylvan` and
can be inspected with the normal sign interaction.

Sylvan Thicket is a large forest around the village, with a path to its southern
entrance. The village's two-tile tree boundary has a four-tile gate that clears
only when every ordinary Sylvan cube and soul is restored.

Azure Village has an impassable cliff boundary. Four-tile stair entrances on its
west and south sides appear only when every ordinary Azure enemy is restored.
The rest of the cliff remains blocked. Guardians and released permanent residents
do not count toward either village unlock. New Game restores both barriers.

Inside Azure Village, a second raised terrace has permanent stairs leading into
ground clouds. Remaining in the cloud tiles for 650 ms enters Azure Mountain;
clouds render over the King during approach. Mountain exit returns below the
clouds to avoid an immediate re-entry. Azure Mountain is currently an explorable
40 by 28 area without added enemies, puzzles or rewards, pending Luciano's content.

The Azure Hot Spring restores one health every 500 ms while standing in its
enterable water, capped at maximum health. Leaving the water clears the timer.
Paths follow the annotated drawing and reach the settlements, spring and palace.
The cracked purple Controlled Walkway is traversable scenery, not a repair quest.

## Layers And Doors

- Layer 1: connected terrain and village exteriors.
- Layer 2: Pristine Castle, the palace ground floor, and all 53 village homes,
  including both garage houses. Each home has a separate, simply furnished room.
- Layer 3: Kyle's chamber. Existing palace stairs connect the two palace floors.

Z or Enter activates doors and interior exits. Outdoor arrivals place the King
below the same entrance, using his full hitbox for clearance. The Pristine Castle
staff and rubble requirements still apply. The upper palace floor cannot bypass
the staircase to reach the exterior. Holding an interaction key does not cause
repeated door transitions.

## Progression And Actors

Leaving a region, including entering its village or a building, relocates ordinary
restored inhabitants and clears chase routes as before. Walking between exterior
chunks preserves exact world position. Guardian defeat states, released permanent
inhabitants, village home assignments and The Ancient Plains transformation remain
owned by their original regions. Interior transitions do not regenerate enemies.

Village footprints and building tiles are excluded from hostile spawn choices.
Before spawning enemies, the expanded world caches full-hitbox walking routes
with the villages locked. Hostiles spawn and move only in reachable terrain,
preventing forest pockets from trapping an enemy needed to unlock a village.
Region actors remain within their own chunk; they do not roam into a neighboring
village or follow the player across regions. Boss pursuit and stat changes from
the separate `Boss update.txt` are intentionally still pending.

New Game resets progression and starts inside Pristine Castle. Direct local-file
play is retained; no dev server or build step is required.

## Checks

Run `node tests/map-regression.cjs`. It covers combat and guardian regressions,
all 55 exterior entrances and return points after unlocking, full-hitbox route reachability,
walking across the bridge and region seams, river collision, restoration and
reset. Desktop and mobile screenshots plus nonblank canvas checks include the
bridge, a three-region junction, villages, the palace entrance, a home, the thicket,
cliff, opened stairs, clouds, hot spring, walkway, sign and mountain. Village locks,
guardian-independent unlocks, cliff boundaries, healing, cloud transitions and
reset are included.
Screenshots are written to the OS temporary folder as `split-path-overworld-*`.
