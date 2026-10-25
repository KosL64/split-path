# Connected Overworld

Implemented on Map-Updates from Luciano's `Map Update Major.txt` and
`img/assets/Castle Map.png`. The Kingdom Map selector and M-key travel are removed.

## Layout

Exterior placement lives in `js/map-overworld.js`. Coordinates are tiles, measured
from the northwest corner of the complete 92 by 96 exterior.

| Exterior | Origin | Size | Notes |
| --- | --- | --- | --- |
| Castle grounds | 0, 0 | 92 by 18 | Castle entrance, river and four-tile-wide bridge |
| Controlled Plains | 0, 18 | 38 by 78 | West of both eastern regions; palace entrance in the southwest |
| Sylvan | 38, 18 | 54 by 39 | Immediately below the bridge |
| Azure Apex | 38, 57 | 54 by 39 | Directly south of Sylvan |
| Sylvan Village | 58, 36 | 32 by 18 | Walk-in exterior within Sylvan |
| Azure Village | 54, 74 | 36 by 20 | Walk-in exterior within Azure Apex |

Village chunks take priority over the underlying region when selecting collision
tiles and player location. The renderer draws visible neighbors with one camera,
so region changes do not recenter the view or teleport the player. Regional actor
coordinates remain local; region boundaries convert only the player's position.

The three major regions keep their existing dimensions, enemy counts, levels,
landmarks and progression. Border strips are opened at connecting edges, village
perimeter walls are removed, and old regional exit tiles are replaced with floor.
One Azure home moves from column 31 to 33 on row 18 to give the house above it
enough doorway clearance for the King's 44 by 62 hitbox. Home slot IDs remain stable.

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
Region actors remain within their own chunk; they do not roam into a neighboring
village or follow the player across regions. Boss pursuit and stat changes from
the separate `Boss update.txt` are intentionally still pending.

New Game resets progression and starts inside Pristine Castle. Direct local-file
play is retained; no dev server or build step is required.

## Checks

Run `node tests/map-regression.cjs`. It covers combat and guardian regressions,
all 55 exterior entrances and return points, full-hitbox route reachability,
walking across the bridge and region seams, river collision, restoration and
reset. Desktop and mobile screenshots plus nonblank canvas checks include the
bridge, a three-region junction, a village, the palace entrance and a home.
Screenshots are written to the OS temporary folder as `split-path-overworld-*`.
