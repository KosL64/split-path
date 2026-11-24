const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

module.exports = async function verifySaveSystem(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => { for (let index = 0; index < 4; index++) localStorage.removeItem(saveKey(index)); });
  await page.reload();
  await page.locator('#play-button').click();
  assert.equal(await page.locator('.save-card').count(), 4);
  await page.locator('[data-slot="0"]').click();
  assert.equal(await page.evaluate(() => currentScreen), 'story');
  await page.locator('#story-skip').click();
  assert.equal(await page.evaluate(() => validSave(readSaveSlot(0).data)), true, 'New save validates');
  await page.evaluate(() => {
    playerState.hasStaff = true; castleState.exitCleared = false;
    sitOnThrone(); castleState.sittingStartedAt = 1;
    const now = performance.now.bind(performance); performance.now = () => 10000;
    standFromThrone(); interactWithCastle('rocks'); performance.now = now;
    playerState.divinePoints = 200; buyUpgrade('health'); buyUpgrade('lifeSteal');
    ordinaryEnemies(areas.azureApex).forEach(enemy => restoreMapEnemy(enemy, 'azureApex'));
    relocateRestoredEnemies('azureApex');
    ordinaryEnemies(areas.controlledPlains).forEach(enemy => restoreMapEnemy(enemy, 'controlledPlains'));
    relocateRestoredEnemies('controlledPlains');
    defeatRegionalBoss('sylvan');
    const first = areas.controlledPlains.enemies.find(enemy => enemy.id === firstControlledPlainsCubeId);
    first.plainsFirstCubeDialogueSaid = true; first.plainsFollowupDialogueSaid = true;
    specialVillageResident.villageBadDaySaid = true;
    sylvanFriendAskedBy = 'sylvan-cube-6'; sylvanFriendThanksSaid = true;
    enterArea('castleGrounds'); player.x = 70 * config.tileSize; player.y = 23 * config.tileSize;
    playerState.health = 13; updateCamera(); saveProgress();
    if (!validSave(readSaveSlot(0).data)) throw new Error('Progress snapshot is invalid');
  });
  const saved = await page.evaluate(() => readSaveSlot(0).data);
  await page.locator('#save-menu-button').click();
  assert.equal(await page.locator('.save-sticker').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(os.tmpdir(), `split-path-save-slots-${label}.png`) });
  await page.locator('[data-slot="1"]').click(); await page.locator('#story-next').click();
  await page.reload(); await page.locator('#play-button').click(); await page.locator('[data-slot="1"]').click();
  assert.deepEqual(await page.evaluate(() => [currentScreen, storyIndex]), ['story', 1], 'Refresh preserves an unfinished introduction');
  await page.locator('#story-skip').click();
  assert.deepEqual(await page.evaluate(() => [playerState.health, playerState.hasStaff, saveSession.stickers.size]), [20, false, 0]);
  await page.locator('#save-menu-button').click();
  await page.reload(); await page.locator('#play-button').click();
  await page.locator('[data-slot="0"]').click();
  const restored = await page.evaluate(() => ({
    screen: currentScreen, hp: playerState.health, staff: playerState.hasStaff, upgrade: playerState.upgrades.lifeSteal,
    position: [currentAreaId, player.x, player.y], bridge: villageResidents('castleGrounds').length,
    azure: villageResidents('azureVillage').length, guardian: regionalBossStates.azureApex.revealed,
    released: areas.sylvan.enemies.filter(enemy => enemy.permanentResident).length,
    sticker: saveSession.stickers.has('patience'), exit: castleState.exitCleared,
    first: areas.controlledPlains.enemies.find(enemy => enemy.id === firstControlledPlainsCubeId).plainsFollowupDialogueSaid,
    special: specialVillageResident.villageBadDaySaid, friend: sylvanFriendThanksSaid,
    linked: regionalBossStates.azureApex.palaceEnemy === areas.controlledPalace.enemies.find(enemy => enemy.regionBoss === 'azureApex')
  }));
  assert.equal(restored.screen, 'game', 'Existing save skips introduction');
  assert.equal(restored.hp, 13); assert.equal(restored.staff, true); assert.equal(restored.upgrade, 1);
  assert.deepEqual(restored.position, [saved.areaId, saved.player.x, saved.player.y]);
  assert.equal(restored.bridge, 55); assert.equal(restored.azure, 31); assert.equal(restored.released, 3);
  for (const key of ['guardian', 'sticker', 'exit', 'first', 'special', 'friend', 'linked']) assert.equal(restored[key], true, key);
  await page.evaluate(() => {
    enterArea('sylvan'); playerState.health = 13; playerState.hasStaff = true;
    startBattle(ordinaryEnemies(areas.sylvan)[0]);
    playerState.health = 2; performPlayerAttack({ attackPower: 5, extraHeal: 0, hitCount: 1, verb: 'Test' });
    saveProgress();
    if (readSaveSlot(0).data.playerState.health !== 13) throw new Error('Battle overwrote checkpoint');
  });
  await page.reload(); await page.locator('#play-button').click(); await page.locator('[data-slot="0"]').click();
  assert.deepEqual(await page.evaluate(() => [currentScreen, playerState.health, !!pendingAttack, !!activeSkillCheck, daggerTestMode.enabled]), ['game', 13, false, false, false]);
  await page.evaluate(() => {
    startBattle(ordinaryEnemies(areas.sylvan)[0]); playerState.health = 0; showLoseScreen(); saveProgress();
  });
  await page.reload(); await page.locator('#play-button').click(); await page.locator('[data-slot="0"]').click();
  assert.equal(await page.evaluate(() => playerState.health), 13, 'Loss screen does not overwrite the safe checkpoint');
  await page.evaluate(() => {
    startBattle(ordinaryEnemies(areas.sylvan)[0]); activeEnemy.control = 0; finishRestoration();
  });
  const afterVictory = await page.evaluate(() => readSaveSlot(0).data.playerState.divinePoints);
  // Reload during the victory animation: rewards must already be durable.
  await page.reload(); await page.locator('#play-button').click(); await page.locator('[data-slot="0"]').click();
  assert.equal(await page.evaluate(() => playerState.divinePoints), afterVictory);
  assert.equal(await page.evaluate(() => ordinaryEnemies(areas.sylvan)[0].restored), true);
  await page.evaluate(() => {
    enterArea('palaceUpper'); startBattle(areas.palaceUpper.enemies[0]);
    activeEnemy.control = 0; finishRestoration();
  });
  await page.reload(); await page.locator('#play-button').click(); await page.locator('[data-slot="0"]').click();
  assert.equal(await page.evaluate(() => currentScreen), 'credits');
  await page.locator('#credits-return').click();
  assert.equal(await page.evaluate(() => readSaveSlot(0).data.completed), true);
  await page.locator('#play-button').click();
  const beforeDelete = await page.evaluate(() => localStorage.getItem(saveKey(0)));
  await page.locator('[data-delete-slot="0"]').click(); await page.locator('#save-confirm-no').click();
  assert.equal(await page.evaluate(() => localStorage.getItem(saveKey(0))), beforeDelete);
  await page.locator('[data-delete-slot="0"]').click(); await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => localStorage.getItem(saveKey(0))), beforeDelete);
  await page.locator('[data-delete-slot="0"]').click(); await page.locator('#save-confirm-yes').click();
  assert.equal(await page.evaluate(() => readSaveSlot(0).status), 'empty');
  assert.equal(await page.evaluate(() => readSaveSlot(1).status), 'ready');
  await page.locator('[data-slot="1"]').click();
  await page.evaluate(() => { awardSaveSticker('patience'); playerState.divinePoints = 25; saveProgress(); });
  await page.locator('#reset-button').click(); await page.locator('#save-confirm-no').click();
  assert.equal(await page.evaluate(() => playerState.divinePoints), 25);
  await page.locator('#reset-button').click(); await page.locator('#save-confirm-yes').click();
  assert.equal(await page.evaluate(() => currentScreen), 'story');
  assert.deepEqual(await page.evaluate(() => [playerState.divinePoints, saveSession.stickers.size]), [0, 0]);
  await page.locator('#story-skip').click(); await page.locator('#save-menu-button').click();
  await page.evaluate(() => { localStorage.setItem(saveKey(2), '{broken'); localStorage.setItem(saveKey(3), JSON.stringify({ version: 999 })); });
  await page.reload(); await page.locator('#play-button').click();
  assert.equal(await page.locator('[data-slot="2"]').isDisabled(), true);
  assert.equal(await page.locator('[data-slot="3"]').isDisabled(), true);
  assert.equal(await page.locator('[data-slot="1"]').isDisabled(), false);
  await page.locator('[data-delete-slot="2"]').click(); await page.locator('#save-confirm-yes').click();
  assert.equal(await page.locator('[data-slot="2"]').isDisabled(), false);
  await page.evaluate(() => {
    selectSaveSlot(1); saveProgress();
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Storage full'); };
    playerState.divinePoints = 99; saveProgress();
    Storage.prototype.setItem = setItem;
    if (!saveStorageFailed || readSaveSlot(1).data.playerState.divinePoints !== 99) throw new Error('Storage failure was not handled');
  });
  assert.match(await page.locator('#save-status').textContent(), /unavailable/);
  assert.deepEqual(errors, []);
  console.log(`${label}: four slots, refresh, full world state, story, stickers, battle checkpoint, victory rewards, completed saves, delete/cancel, restart, corrupt saves and storage failure pass.`);
};
