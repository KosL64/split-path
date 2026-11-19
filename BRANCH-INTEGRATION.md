# Dialogue and Omega Integration

Dialogue is the source of truth for conflicting dialogue and story behavior.
Omega supplies the latest map, progression, combat and upgrade systems. The
integration preserves both branch histories and is shared by the active
`omega`, `Dialogue` and `Map-Updates` branches. Historical `main` and `alpha`
are outside this synchronization.

Dialogue retains its village complaint/apology, first Plains cube sequence,
Sylvan friends and following behavior, rare friendly Kyle cameo, silent throne,
rock messages and ending. Special NPC conversations use the same dismissible
message and resident pause system as ordinary conversations. The castle's
patience reward can only be earned once per game.

Clearing a region now hides its undefeated guardian in the palace and reveals
the regional encounter. Hidden guardians cannot trigger contact battles.

After buying the first Health upgrade, Heal opens one circular timing check.
Life Steal opens three smaller purple checks in random battle-panel positions
after the attack bar. Use Z or click/tap the circle as its shrinking ring matches
the circle's border. Each check lasts 900 milliseconds, with the target halfway
through. The center window adds 20%; the narrow perfect window adds 25%.
These timing settings live in `js/battle-skillchecks.js`.

Missing a check retains baseline healing. Heal rounds its bonus-adjusted amount
to the nearest integer. Life Steal uses the average of its three timing bonuses
and rounds the added healing upward. Healing never exceeds maximum health.
The enemy turn waits for the entire sequence, including on a finishing blow.
Reset, loss and battle completion clear active checks and timers.

Run `node tests/map-regression.cjs` for the complete browser suite, or append
`--integration-only` for focused integration checks. Both cover desktop HTTP
and mobile direct-file play. Screenshots are written to the OS temporary folder.
