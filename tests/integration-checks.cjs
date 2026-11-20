const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

module.exports = async function verifyBranchIntegration(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForFunction(() => readySylvanSprite('ground') && readySylvanSprite('flying'));
  const checks = await page.evaluate(() => {
    const passed = [];
    const check = (value, message) => { if (!value) throw new Error(message); passed.push(message); };
    resetGame(); showScreen('game');
    enterArea('controlledPlains');
    ordinaryEnemies(areas.controlledPlains).forEach(enemy => restoreMapEnemy(enemy, 'controlledPlains'));
    finishAreaDeparture(); enterArea('castleGrounds');
    const bridgeResidents = villageResidents();
    check(bridgeResidents.length === 55, 'All 55 restored Plains residents reach the bridge');
    const positions = bridgeResidents.map(positionedResident);
    check(new Set(positions.map(resident => `${resident.x},${resident.y}`)).size === 55
      && positions.every(resident => !collidesWithBlockedTile(resident)), 'Bridge and approach slots are unique and passable');
    check(positions.every(resident => ![69, 70].includes(Math.floor(resident.x / config.tileSize))), 'Bridge center stays clear');
    for (let frame = 0; frame < 60; frame += 1) moveEnemies();
    check(bridgeResidents.every((resident, index) => resident.villageX === positions[index].x && resident.villageY === positions[index].y), 'Bridge residents remain stationary');
    finishAreaDeparture(); enterArea('sylvan'); finishAreaDeparture(); enterArea('castleGrounds');
    check(villageResidents().length === 55 && visibleAreaEnemies('controlledPlains').every(enemy => enemy.kind === 'boss'), 'Travel preserves bridge residents without field duplicates');
    const originalDrawImage = ctx.drawImage;
    const sprites = [];
    ctx.drawImage = function(sprite, ...args) { sprites.push(sprite); return originalDrawImage.call(this, sprite, ...args); };
    for (const originArea of ['azureApex', 'controlledPlains']) {
      for (const visual of ['ground', 'flying']) {
        drawEnemy({ originArea, visual, x: 100, y: 100, width: 36, height: 40, level: 1, facing: -1 }, 0, 0);
        check(sprites.at(-1) === sylvanSprites[visual], `${originArea} uses Luciano's ${visual} artwork`);
      }
    }
    ctx.drawImage = originalDrawImage;
    const realPlayer = drawPlayer, realLabel = drawMapLabel;
    const drawOrder = [];
    drawPlayer = () => drawOrder.push('player'); drawMapLabel = () => drawOrder.push('label');
    drawWorld(); check(drawOrder.at(-1) === 'label' && drawOrder.includes('player'), 'Exterior panel draws above the player');
    enterArea('pristineCastle'); drawOrder.length = 0; drawWorld();
    check(drawOrder.join(',') === 'player,label', 'Interior panel draws above the player');
    drawPlayer = realPlayer; drawMapLabel = realLabel;
    resetGame(); showScreen('game');
    check(specialVillageResident && ['sylvan', 'azureApex'].includes(specialVillageResident.originArea)
      && !specialVillageResident.permanentResident, 'Special resident is eligible');
    const talk = (resident, areaId) => {
      enterArea(areaId); activeEnemy = resident; promptMode = 'talk'; talkToNpc();
      const text = document.querySelector('#interaction-prompt').textContent;
      check(temporaryMessageActive, 'Conversation is dismissible'); dismissDialogue(); return text;
    };
    const special = specialVillageResident;
    ordinaryEnemies(areas[special.originArea]).forEach(enemy => { enemy.restored = true; });
    areas[special.originArea].healed = true;
    initializeVillageResident(special); special.relocated = true;
    const village = villageAreaForSource(special.originArea);
    check(talk(special, village).includes('bad day'), 'Village complaint wording is preserved');
    finishAreaDeparture(); enterArea(special.originArea);
    check(talk(special, village).includes('sorry about earlier'), 'Return visit unlocks apology');
    check(!talk(special, village).includes('sorry about earlier'), 'Apology occurs once');
    resetGame(); showScreen('game');
    const plains = ordinaryEnemies(areas.controlledPlains);
    const soul = plains.find(enemy => enemy.visual === 'flying');
    const cube = plains.find(enemy => enemy.visual === 'ground');
    restoreMapEnemy(soul, 'controlledPlains'); restoreMapEnemy(cube, 'controlledPlains');
    check(firstControlledPlainsCubeId === cube.id, 'First Plains cube excludes souls');
    check(talk(cube, 'controlledPlains').includes('where do I go'), 'First Plains greeting is preserved');
    check(talk(cube, 'controlledPlains') === 'You never answered my question.', 'Dialogue follow-up overrides the old note');
    check(talk(cube, 'controlledPlains') === '...', 'Final Plains response is preserved');
    resetGame(); showScreen('game');
    const first = areas.sylvan.enemies.find(enemy => enemy.id === 'sylvan-cube-6');
    const second = areas.sylvan.enemies.find(enemy => enemy.id === 'sylvan-cube-9');
    restoreMapEnemy(first, 'sylvan');
    check(talk(first, 'sylvan').includes('save my friend'), 'Sylvan friend request works');
    restoreMapEnemy(second, 'sylvan');
    check(talk(first, 'sylvan') === 'thank you for saving my friend!', 'Saving the friend unlocks thanks');
    check(talk(first, 'sylvan') === 'Hi there!', 'Friend greeting follows thanks');
    enterArea('pristineCastle'); playerState.hasStaff = true;
    setPrompt(''); sitOnThrone();
    check(!temporaryMessageActive && !document.querySelector('#interaction-prompt').textContent.includes('remembers'), 'Throne stays silent');
    const realNow = performance.now.bind(performance);
    castleState.sittingStartedAt = 1;
    performance.now = () => 10000;
    standFromThrone(); const health = playerState.maxHealth;
    interactWithCastle('rocks'); interactWithCastle('rocks');
    performance.now = realNow;
    check(playerState.maxHealth === health + 1, 'Patience reward occurs once');
    resetGame(); showScreen('game'); enterArea('controlledPalace');
    check(visibleAreaEnemies().length === 3, 'Palace starts with three guardians');
    const ordinary = ordinaryEnemies(areas.azureApex);
    ordinary.slice(0, -1).forEach(enemy => { enemy.restored = true; });
    restoreMapEnemy(ordinary.at(-1), 'azureApex');
    check(!visibleAreaEnemies('controlledPalace').some(enemy => enemy.regionBoss === 'azureApex')
      && visibleAreaEnemies('azureMountain').some(enemy => enemy.regionBoss === 'azureApex')
      && !regionalBossStates.azureApex.defeated, 'Reveal hands guardian from palace to mountain without defeat');
    const hidden = regionalBossStates.azureApex.palaceEnemy;
    player.x = hidden.x; player.y = hidden.y; contactLockedUntil = 0; checkAreaEncounters();
    check(currentScreen === 'game', 'Hidden guardian cannot cause an invisible battle');
    resetGame(); showScreen('game'); playerState.hasStaff = true;
    enterArea('sylvan'); const enemy = ordinaryEnemies(areas.sylvan)[0];
    Object.assign(enemy, { controlMax: 100, defense: 2, attack: 1 });
    startBattle(enemy); playerState.health = 5; playerState.criticalChance = 0;
    useHeal(); check(playerState.health === 10 && !activeSkillCheck, 'Unupgraded heal stays immediate');
    window.clearTimeout(battleTimer); setBattleButtons(false);
    playerState.divinePoints = 100; buyUpgrade('health'); playerState.health = 5;
    useHeal();
    check(activeSkillCheck?.kind === 'heal' && battleBusy && playerState.health === 5, 'Upgraded heal starts a ring and locks the turn');
    return passed;
  });
  console.log(`${label}: ${checks.join('\n')}`);
  const perfect = () => page.evaluate(() => {
    activeSkillCheck.startedAt = performance.now() - skillCheckSettings.duration / 2;
    activeSkillCheck.deadline = performance.now() + skillCheckSettings.duration / 2;
  });
  await page.locator('#battle-screen .battle-panel').screenshot({ path: path.join(os.tmpdir(), `split-path-heal-ring-${label}.png`) });
  await perfect(); await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => playerState.health), 11, 'Perfect heal earns 25-percent bonus');
  await page.evaluate(() => {
    window.clearTimeout(battleTimer); setBattleButtons(false);
    playerState.health = 5; useHeal(); resolveSkillCheck(0);
    if (playerState.health !== 10) throw new Error('Missed heal lost baseline healing');
    window.clearTimeout(battleTimer); setBattleButtons(false);
    buyUpgrade('lifeSteal'); playerState.health = 5;
    attackAction(); resolvePlayerAttack();
    if (activeSkillCheck?.kind !== 'lifeSteal' || activeSkillCheck.count !== 3) throw new Error('Life Steal needs three rings');
  });
  for (let index = 0; index < 3; index += 1) {
    const before = await page.evaluate(() => ({ index: activeSkillCheck.index, health: playerState.health,
      bounds: document.querySelector('#skillcheck-hit').getBoundingClientRect().toJSON(),
      panel: document.querySelector('#battle-screen .battle-panel').getBoundingClientRect().toJSON() }));
    assert.equal(before.index, index); assert.equal(before.health, 5);
    assert.ok(before.bounds.left >= before.panel.left && before.bounds.right <= before.panel.right
      && before.bounds.top >= before.panel.top && before.bounds.bottom <= before.panel.bottom, 'Random ring fits battle panel');
    if (!index) await page.locator('#battle-screen .battle-panel').screenshot({ path: path.join(os.tmpdir(), `split-path-life-steal-ring-${label}.png`) });
    await perfect(); await page.keyboard.press('z');
  }
  assert.equal(await page.evaluate(() => activeSkillCheck), null);
  assert.equal(await page.evaluate(() => playerState.health), 9, 'Life Steal preserves base and adds bonus');
  await page.evaluate(() => {
    window.clearTimeout(battleTimer); setBattleButtons(false); playerState.health = 5;
    attackAction(); resolvePlayerAttack();
    resolveSkillCheck(0); resolveSkillCheck(0); resolveSkillCheck(0);
    if (playerState.health !== 8) throw new Error('Missed Life Steal lost baseline healing');
    window.clearTimeout(battleTimer); setBattleButtons(false);
    attackAction(); resolvePlayerAttack(); resetGame();
    if (activeSkillCheck || skillCheckTimer || pendingAttack) throw new Error('Reset left active QTE state');
    playerState.hasStaff = true; enterArea('palaceUpper');
    restoredEnemyAreas = new Set(['sylvan', 'azureApex']);
    startBattle(areas.palaceUpper.enemies[0]); daggerTestMode.enabled = true; defendAction();
  });
  await page.waitForFunction(() => currentScreen === 'credits');
  assert.equal(await page.locator('#credits-message').textContent(), 'I think you missed a spot!');
  await page.locator('#credits-return').click();
  assert.equal(await page.evaluate(() => currentScreen), 'title');
  assert.equal(await page.evaluate(() => areas.palaceUpper.enemies[0].restored), false);
  await page.evaluate(() => {
    resetGame(); showScreen('game'); enterArea('controlledPlains');
    ordinaryEnemies(areas.controlledPlains).forEach(enemy => restoreMapEnemy(enemy, 'controlledPlains'));
    finishAreaDeparture(); enterArea('castleGrounds');
    player.x = 70 * config.tileSize; player.y = 23 * config.tileSize;
    updateCamera(); drawWorld();
  });
  await page.locator('#game-canvas').screenshot({ path: path.join(os.tmpdir(), `split-path-bridge-residents-${label}.png`) });
  await page.evaluate(() => { resetGame(); showScreen('title'); });
  assert.deepEqual(errors, []);
  console.log(`${label}: circle timing, three-stage Life Steal, misses, cleanup and credits pass.`);
};
