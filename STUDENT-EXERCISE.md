# Luciano's Azure Village Dialogue Exercise

Status: completed by Aaron and Luciano. Retained as a record of the exercise.

The exercise added a dialogue override inside `talkToNpc()` in
`js/map-mechanics.js`, before `showTemporaryPrompt(message, 4500);`.
It is already implemented; do not paste a second copy. The current version
also checks the boss's defeat state:

```js
if (currentAreaId === "azureVillage" && !regionalBossStates.azureApex.defeated) {
  message = activeEnemy.visual === "flying"
    ? "Hey... there is a HUGE purple blob thing on Azure Mountain... Are you able to check it out?"
    : "ugh, I keep hearing a roaring sound and a loud banging coming from the mountain.";
}
```

The `if` limits the warning to Azure Village while its guardian is undefeated.
The `?` chooses the first
message for a flying soul; the `:` chooses the second message for a ground cube.
The existing code displays whichever message is chosen and pauses the resident
during the conversation. Other regions keep their current dialogue.

## Try It

1. Reload the game and restore Azure enemies to populate its village. The
   temporary dagger shortcut remains available for classroom testing.
2. Enter Azure Village and talk to a restored ground cube with Z. Confirm the
   roaring-and-banging message appears.
3. Talk to a restored flying soul. Confirm the purple-blob message appears.
4. Press Enter or Space to dismiss either message.
5. Defeat Azure's guardian on the mountain or in the palace, then talk to the
   village residents again. Their normal dialogue should return.
6. Talk to a resident in Sylvan to confirm its original dialogue still works.

This changes dialogue only; it does not add quest rewards or a quest tracker.
