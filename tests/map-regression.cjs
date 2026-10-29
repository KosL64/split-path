const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

let playwright;
try { playwright = require('playwright'); }
catch {
  playwright = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}
const root = path.resolve(__dirname, '..');
const baseline = process.argv.find(arg => arg.startsWith('--baseline='))?.split('=')[1];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

async function inspect(page, url) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    performance.now = () => 5000;
    Math.random = () => 0.5;
  });
  await page.goto(url);
  await page.waitForFunction(() => typeof areas !== 'undefined' && Object.values(sylvanSprites).every(image => image.complete) && kyleSprite.complete && Object.values(rockSprites).every(sizes => Object.values(sizes).flat().every(image => image.complete)));
  const initial = await page.evaluate(() => Object.fromEntries(Object.entries(areas).map(([id, area]) => [id, {
    name: area.name, width: area.width, height: area.height, map: area.map,
    start: area.start, homeSlots: area.homeSlots,
    enemies: area.enemies.map(enemy => ({ id: enemy.id, level: enemy.level, visual: enemy.visual, x: enemy.x, y: enemy.y, attack: enemy.attack, defense: enemy.defense, controlMax: enemy.controlMax }))
  }])));
  const images = {};
  for (const id of Object.keys(initial).filter(id => !/House\d+$/.test(id))) {
    await page.evaluate(id => {
      resetGame();
      showScreen('game');
      enterArea(id);
      updateCamera();
      drawWorld();
    }, id);
    images[id] = await page.locator('#game-canvas').screenshot();
  }
  await page.evaluate(() => { enterArea('castleGrounds'); updateCamera(); drawWorld(); });
  images.overworld = await page.locator('#game-canvas').screenshot();
  const checks = await page.evaluate(() => {
    const passed = [];
    const check = (condition, label) => {
      if (!condition) throw new Error(label);
      passed.push(label);
    };
    resetGame();
    showScreen('game');
    check(!playerState.hasStaff && !castleState.exitCleared && currentAreaId === 'pristineCastle', 'New game starts in the locked castle');
    interactWithCastle('throne');
    check(playerState.hasStaff, 'Staff collection still works');
    interactWithCastle('throne');
    check(castleState.sitting, 'Throne sitting still works');
    standFromThrone();
    interactWithCastle('rocks');
    check(castleState.exitCleared && !isBlockedTile('B'), 'Staff clears the exit rocks');
    enterArea('sylvan');
    check(collidesWithBlockedTile({ x: 0, y: 0, width: 20, height: 20 }), 'Map boundary still blocks movement');
    const before = player.x;
    attemptMove(1, 0);
    check(player.x === before + 1, 'Player movement still works');
    check(areas.sylvan.enemies.length === 20 && areas.azureApex.enemies.length === 31 && areas.controlledPlains.enemies.length === 55, 'Enemy counts are preserved');
    check(areas.sylvanVillage.homeSlots.length === 21 && areas.azureVillage.homeSlots.length === 32, 'Village homes include the additional garage house');
    check(areas.palaceUpper.enemies[0].controlMax === 1000, 'Kyle retains 1000 health upstairs');
    const resident = areas.sylvan.enemies.find(enemy => enemy.visual === 'ground');
    activeEnemy = resident;
    finishRestoration();
    check(resident.restored && !resident.relocated && playerState.divinePoints === 5, 'Restoration grants points and keeps the resident in the area');
    finishAreaDeparture();
    check(resident.relocated, 'Leaving relocates restored residents');
    enterArea('sylvanVillage');
    const positioned = positionedResident(resident);
    player.x = positioned.x - 30;
    player.y = positioned.y;
    activeEnemy = resident;
    promptMode = 'talk';
    talkToNpc();
    const villageX = resident.villageX;
    moveVillageResidents();
    check(resident.villageX === villageX && resident.gazeX < 0, 'Village dialogue stops the resident and faces the king');
    enterArea('controlledPlains');
    areas.controlledPlains.enemies.forEach(enemy => { enemy.restored = true; });
    activeEnemy = areas.controlledPlains.enemies.at(-1);
    activeEnemy.restored = false;
    finishRestoration();
    check(areas.controlledPlains.healed && areas.controlledPlains.name === 'The Ancient Plains', 'Final plains restoration changes the area name');
    check(regionDirectory.nodes.find(node => node.areaId === 'controlledPlains').name === 'The Ancient Plains', 'Region directory shows the restored plains name');
    check(areaPalette('controlledPlains').healedGrass === '#e0df70', 'Restored plains retain yellow-green grass');
    resetGame();
    check(areas.controlledPlains.name === 'Controlled Plains' && !areas.controlledPlains.healed && !talkingResident, 'Reset clears map progression and dialogue');
    playerState.divinePoints = 5;
    buyUpgrade('damage');
    check(playerState.restorePower === 10 && playerState.divinePoints === 0, 'Combat upgrade still works');
    enterArea('sylvan');
    playerState.hasStaff = true;
    const enemy = areas.sylvan.enemies[0];
    const nearbyResident = areas.sylvan.enemies[1];
    nearbyResident.restored = true;
    nearbyResident.control = 0;
    nearbyResident.x = player.x;
    nearbyResident.y = player.y;
    startBattle(enemy);
    updateInteractionPrompt();
    check(activeEnemy === enemy, 'Map prompts cannot replace the enemy during a battle');
    Object.assign(enemy, { controlMax: 100, defense: 2, attack: 8 });
    startBattle(enemy);
    attackAction();
    check(enemy.control === 100 && pendingAttack && pendingAttack.deadline - pendingAttack.startedAt === 500, 'Attack waits for a half-second timing result');
    pendingAttack.startedAt = performance.now() - 220;
    boostPlayerAttack();
    check(enemy.control === 88 && !pendingAttack, 'Timing bonus still applies rounded 20 percent damage');
    boostPlayerAttack();
    check(enemy.control === 88, 'Timing bonus cannot repeat');
    window.clearTimeout(battleTimer);
    setBattleButtons(false);
    startBattle(enemy);
    attackAction();
    pendingAttack.startedAt = performance.now() - 250;
    boostPlayerAttack();
    check(enemy.control === 87, 'Perfect center awards rounded 25 percent damage');
    window.clearTimeout(battleTimer);
    setBattleButtons(false);
    startBattle(enemy);
    attackAction();
    boostPlayerAttack();
    check(enemy.control === 90, 'An early strike receives no timing bonus');
    window.clearTimeout(battleTimer);
    setBattleButtons(false);
    playerState.magic = true;
    startBattle(enemy);
    soulSpellAction();
    resolvePlayerAttack();
    check(enemy.control === 98 && enemyStunTurns === 2 && soulSpellUsed, 'Soul Spell still deals 2 damage and stuns for two turns');
    window.clearTimeout(battleTimer);
    const health = playerState.health;
    enemyTurn();
    enemyTurn();
    check(health === playerState.health && enemyStunTurns === 0, 'Stun skips exactly two enemy turns');
    enemyTurn();
    check(playerState.health < health, 'Enemy resumes attacking after stun');
    attackAction();
    check(document.querySelector('#soul-spell-action').disabled && document.querySelector('#soul-spell-action').classList.contains('spell-used'), 'Used Soul Spell stays disabled and crossed out');
    showLoseScreen();
    revivePlayerAtAreaStart();
    check(playerState.health === playerState.maxHealth && currentScreen === 'game', 'Loss recovery still restores health and returns to the area');
    resetGame();
    return passed;
  });
  assert.deepEqual(errors, [], 'No browser errors');
  return { initial, images, checks };
}

async function verifyOverworld(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = await page.evaluate(() => {
    cancelAnimationFrame(animationFrameId);
    resetGame();
    showScreen('game');
    playerState.hasStaff = true;
    castleState.exitCleared = true;
    returnToExterior();
    const passed = [];
    const check = (value, message) => { if (!value) throw new Error(message); passed.push(message); };
    check(currentAreaId === 'castleGrounds' && gameMode === 'area', 'Castle exits directly to the overworld');
    check(areas.sylvan.height === 68 && areas.azureApex.height === 68 && areas.controlledPlains.height === 136, 'Expanded regions preserve vertical alignment');
    check(overworld.width * overworld.height / (92 * 96) > 2.95 && overworld.width * overworld.height / (92 * 96) < 3.1, 'Outdoor terrain is approximately three times the original area');
    check(areas.castleGrounds.map.slice(22).every(row => [...row].filter(tile => tile === '=').length === 4), 'Stone bridge keeps its four-tile width throughout the nine-tile river crossing');
    check(resolveLandscapeTile('G') === 'T' && resolveLandscapeTile('U') === 'X', 'Both villages start locked');
    for (const [region, gate] of [['sylvan', 'G'], ['azureApex', 'U']]) {
      const enemies = ordinaryEnemies(areas[region]);
      enemies.slice(0, -1).forEach(enemy => { enemy.restored = true; });
      check(!canEnterLandscapeArea(region === 'sylvan' ? 'sylvanVillage' : 'azureVillage'), `${region}: one remaining ordinary enemy keeps the village locked`);
      restoreMapEnemy(enemies.at(-1), region);
      check(!regionalBossStates[region].defeated && !isBlockedTile(gate), `${region}: final ordinary restoration opens access before guardian defeat`);
    }
    const key = (x, y) => `${x},${y}`;
    const start = [73, 13];
    const queue = [start];
    const parents = new Map([[key(...start), null]]);
    for (let i = 0; i < queue.length; i += 1) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = [x + dx, y + dy];
        if (parents.has(key(...next)) || worldRectBlocked({
          x: (next[0] + 0.5) * config.tileSize - player.width / 2,
          y: (next[1] + 1) * config.tileSize - player.height / 2,
          width: player.width, height: player.height
        })) continue;
        parents.set(key(...next), [x, y]);
        queue.push(next);
      }
    }
    let portals = 0;
    for (const id of ['sylvan', 'azureApex', 'controlledPlains']) {
      const area = areas[id];
      for (const enemy of ordinaryEnemies(area)) {
        const x = area.world.x + Math.floor(enemy.spawnX / config.tileSize);
        const y = area.world.y + Math.floor(enemy.spawnY / config.tileSize);
        if (!parents.has(key(x, y)) && !parents.has(key(x, y - 1))) throw new Error(`Unreachable controlled enemy: ${enemy.id} at ${x},${y}`);
      }
    }
    check(true, 'All ordinary enemies spawn within reach of the full player hitbox');
    check(parents.has(key(areas.azureVillage.world.x + 34, areas.azureVillage.world.y + 4)), 'Higher terrace and mountain clouds are reachable through the village');
    check(parents.has(key(areas.azureApex.world.x + 31, areas.azureApex.world.y + 58)), 'Hot spring is reachable on foot');
    for (const id of overworld.regions) {
      const area = areas[id];
      for (const portal of area.portals || []) {
        check(parents.has(key(area.world.x + portal.x, area.world.y + portal.y)), `${portal.label}: entrance reachable from castle grounds`);
        enterArea(id);
        player.x = portal.x * config.tileSize + (config.tileSize - player.width) / 2;
        player.y = (portal.y + 1) * config.tileSize - player.height / 2;
        updateInteractionPrompt();
        if (promptMode !== 'world-portal') throw new Error(`Missing entrance prompt: ${portal.label}`);
        usePrompt();
        if (currentAreaId !== portal.target || collidesWithBlockedTile(player)) throw new Error(`Unsafe interior arrival: ${portal.label}`);
        const interior = areas[currentAreaId];
        if (interior.layer !== 2) throw new Error(`Wrong building layer: ${portal.label}`);
        if (interior.houseInterior) {
          player.x = 5 * config.tileSize + (config.tileSize - player.width) / 2;
          player.y = 8 * config.tileSize + (config.tileSize - player.height) / 2;
        } else {
          const exitRow = interior.map.findIndex(row => row.includes('E'));
          player.x = interior.map[exitRow].indexOf('E') * config.tileSize + (config.tileSize - player.width) / 2;
          player.y = exitRow * config.tileSize + (config.tileSize - player.height) / 2;
        }
        leaveArea();
        if (currentAreaId !== id || collidesWithBlockedTile(player)) throw new Error(`Unsafe exterior return: ${portal.label}`);
        portals += 1;
      }
    }
    check(portals === 55, 'All 53 homes and both castles enter and exit safely');
    const walkTo = target => {
      if (!parents.has(key(...target))) throw new Error(`No walking route to ${target}`);
      const route = [];
      for (let cell = target; cell; cell = parents.get(key(...cell))) route.unshift(cell);
      enterArea('castleGrounds');
      player.x = start[0] * config.tileSize + (config.tileSize - player.width) / 2;
      player.y = (start[1] + 1) * config.tileSize - player.height / 2;
      const crossed = new Set([currentAreaId]);
      for (const [x, y] of route) {
        let steps = 0;
        for (;;) {
          const area = areas[currentAreaId];
          const dx = (x - area.world.x + 0.5) * config.tileSize - player.x - player.width / 2;
          const dy = (y - area.world.y + 1) * config.tileSize - player.y - player.height / 2;
          if (Math.abs(dx) + Math.abs(dy) < 0.01) break;
          if (++steps > 40) throw new Error(`Movement stuck at ${x},${y} in ${currentAreaId}`);
          attemptMove(Math.sign(dx) * Math.min(Math.abs(dx), 5), Math.sign(dy) * Math.min(Math.abs(dy), 5));
          crossed.add(currentAreaId);
        }
      }
      return crossed;
    };
    const sylvanResident = areas.sylvan.enemies[0];
    sylvanResident.restored = true;
    initializeVillageResident(sylvanResident);
    const crossed = walkTo([70, 104]);
    check(crossed.has('sylvan') && currentAreaId === 'azureApex', 'Walking crosses the bridge, Sylvan, and Azure without a selector');
    check(sylvanResident.relocated && sylvanResident.restored, 'Crossing a regional boundary preserves restoration and relocates the resident');
    walkTo([8, 140]);
    check(currentAreaId === 'controlledPlains', 'Controlled Plains is reachable on foot beside the stacked regions');
    for (const region of ['sylvan', 'azureApex']) {
      check(ordinaryEnemies(areas[region]).every(enemy => !tileIsEmbeddedVillage(areas[region], Math.floor(enemy.spawnX / config.tileSize), Math.floor(enemy.spawnY / config.tileSize))), `${region}: controlled enemies spawn outside village grounds`);
    }
    enterArea('castleGrounds');
    player.x = 67 * config.tileSize + (config.tileSize - player.width) / 2;
    player.y = 21 * config.tileSize - player.height / 2;
    const y = player.y;
    for (let i = 0; i < 20; i += 1) attemptMove(0, 5);
    check(currentAreaId === 'castleGrounds' && player.y < y + config.tileSize, 'River blocks travel outside the bridge');
    const cliff = areas.azureVillage;
    for (let row = 0; row < cliff.height; row += 1) {
      for (let col = 0; col < cliff.width; col += 1) {
        if (col < 2 || col >= cliff.width - 2 || row < 2 || row >= cliff.height - 2) {
          const tile = cliff.map[row][col];
          if (tile !== 'U' && !isBlockedTile(tile)) throw new Error('Cliff can be climbed outside a staircase');
        }
      }
    }
    check(true, 'Azure cliff stays impassable everywhere except the designated stairs');
    enterArea('azureApex');
    player.x = 31 * config.tileSize;
    player.y = 58 * config.tileSize;
    playerState.health = 5;
    updateWorldEnvironment();
    environmentState.springSince = performance.now() - 1500;
    updateWorldEnvironment();
    check(playerState.health === 8, 'Hot spring restores health over elapsed time');
    environmentState.springSince = performance.now() - 100000;
    updateWorldEnvironment();
    check(playerState.health === playerState.maxHealth, 'Hot spring healing stops at maximum health');
    player.x = 20 * config.tileSize;
    updateWorldEnvironment();
    check(environmentState.springSince === null, 'Healing timer clears outside the spring');
    enterArea('azureVillage');
    player.x = 34 * config.tileSize;
    player.y = 4 * config.tileSize;
    updateWorldEnvironment();
    environmentState.cloudSince = performance.now() - 700;
    updateWorldEnvironment();
    check(currentAreaId === 'azureMountain' && !collidesWithBlockedTile(player), 'Walking into the clouds enters Azure Mountain safely');
    returnToExterior();
    check(currentAreaId === 'azureVillage' && !collidesWithBlockedTile(player), 'Mountain exit returns safely below the clouds');
    enterArea('sylvan');
    player.x = 8 * config.tileSize;
    player.y = 10 * config.tileSize;
    check(nearbySign()?.[1] === 'W lc me to Sylvan', 'Weathered welcome sign can be read');
    resetGame();
    check(currentAreaId === 'pristineCastle' && !playerState.hasStaff && !sylvanResident.restored, 'New Game resets progression and starts inside the castle');
    check(isBlockedTile('G') && isBlockedTile('U') && !canEnterLandscapeArea('azureMountain'), 'New Game relocks both villages and the mountain');
    return passed;
  });
  console.log(results.join('\n'));
  const scenes = [
    ['bridge', 'castleGrounds', 70, 26], ['region-seam', 'sylvan', 4, 66],
    ['village', 'sylvanVillage', 16, 10], ['palace-exterior', 'controlledPlains', 8, 109],
    ['house', 'sylvanVillageHouse1', 5, 7], ['thicket', 'sylvan', 76, 28],
    ['cliff', 'azureVillage', 22, 28], ['clouds', 'azureVillage', 34, 4],
    ['spring', 'azureApex', 31, 58], ['walkway', 'controlledPlains', 54, 28],
    ['sign', 'sylvan', 8, 11], ['mountain', 'azureMountain', 5, 23]
  ];
  for (const [name, id, x, y] of scenes) {
    await page.evaluate(({ id, x, y }) => {
      enterArea(id);
      showScreen('game');
      player.x = x * config.tileSize;
      player.y = y * config.tileSize;
      updateCamera(); drawWorld();
    }, { id, x, y });
    // Screenshot pixels remain readable when file:// sprites taint the game canvas.
    const shot = await page.locator('#game-canvas').screenshot();
    const colors = await page.evaluate(async dataUrl => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const probe = document.createElement('canvas');
      probe.width = image.width; probe.height = image.height;
      const context = probe.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 128) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return colors.size;
    }, `data:image/png;base64,${shot.toString('base64')}`);
    assert.ok(colors >= 10, 'World canvas is nonblank');
    await page.screenshot({ path: path.join(os.tmpdir(), `split-path-overworld-${name}-${label}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: no horizontal overflow`);
  }
  await page.evaluate(() => {
    ordinaryEnemies(areas.azureApex).forEach(enemy => { enemy.restored = true; });
    enterArea('azureVillage');
    player.x = 22 * config.tileSize; player.y = 28 * config.tileSize;
    updateCamera(); drawWorld();
  });
  await page.screenshot({ path: path.join(os.tmpdir(), `split-path-overworld-stairs-open-${label}.png`) });
  await page.evaluate(() => { enterArea('azureMountain'); });
  await page.keyboard.press('m');
  assert.equal(await page.evaluate(() => currentAreaId), 'azureMountain', 'M no longer bypasses doors');
  assert.deepEqual(errors, [], 'No overworld runtime errors');
  console.log(`${label}: connected overworld screenshots and canvas pixels verified.`);
}

async function verifyCastleRoute(page, label) {
  await page.evaluate(() => {
    cancelAnimationFrame(animationFrameId);
    resetGame();
    showScreen('game');
  });
  const walk = async (key, frames) => page.evaluate(({ key, frames }) => {
    keys.clear();
    keys.add(key);
    for (let frame = 0; frame < frames; frame += 1) movePlayer();
    keys.clear();
    dialogueUntil = performance.now();
    updateCamera();
    updateInteractionPrompt();
    drawWorld();
    if (collidesWithBlockedTile(player)) throw new Error('Walking entered a solid object');
  }, { key, frames });

  await walk('arrowdown', 200);
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => castleState.exitCleared), false, `${label}: rubble needs the staff`);
  await walk('arrowup', 200);
  assert.equal(await page.evaluate(() => promptMode), 'castle-throne', `${label}: staff prompt is reachable from spawn`);
  await page.evaluate(() => {
    const throne = areas.pristineCastle.throne;
    const pixel = ctx.getImageData((throne.x * config.tileSize + 120) - areas.pristineCastle.cameraX,
      (throne.y * config.tileSize + 85) - areas.pristineCastle.cameraY, 1, 1).data;
    if (pixel[0] !== 197 || pixel[1] !== 156 || pixel[2] !== 66) throw new Error('Floor overwrote the throne arm');
  });
  const screenshot = path.join(os.tmpdir(), `split-path-castle-${label}.png`);
  await page.locator('#game-canvas').screenshot({ path: screenshot });
  console.log(`Castle screenshot: ${screenshot}`);
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => playerState.hasStaff), true, `${label}: Z collects the staff`);
  await walk('arrowup', 1);
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => castleState.sitting), true, `${label}: Z seats the King`);
  await page.evaluate(() => { dialogueUntil = performance.now(); updateInteractionPrompt(); });
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => castleState.sitting || collidesWithBlockedTile(player)), false, `${label}: Z stands on clear ground`);
  await page.evaluate(() => { dialogueUntil = performance.now(); updateInteractionPrompt(); });
  await page.keyboard.press('z');
  await walk('arrowdown', 1);
  assert.equal(await page.evaluate(() => castleState.sitting), false, `${label}: movement also leaves the throne`);
  await walk('arrowdown', 200);
  assert.equal(await page.evaluate(() => promptMode), 'castle-rocks', `${label}: rubble is reachable`);
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => castleState.exitCleared), true, `${label}: Z clears the rocks`);
  await walk('arrowdown', 200);
  assert.equal(await page.evaluate(() => promptMode), 'leave-area', `${label}: doorway is reachable`);
  await page.keyboard.press('z');
  assert.equal(await page.evaluate(() => currentAreaId), 'castleGrounds', `${label}: Z exits to the castle grounds`);
  await page.evaluate(() => resetGame());
  assert.equal(await page.evaluate(() => playerState.hasStaff || castleState.exitCleared), false, `${label}: reset restores castle progression`);
  console.log(`${label}: movement, staff pickup, throne sitting/standing, rubble, exit and reset pass.`);
}

async function verifyGuardianProgression(page) {
  await page.waitForFunction(() => Object.values(regionalBossSprites).every(image => image.complete && image.naturalWidth > 0));
  const results = await page.evaluate(() => {
    const passed = [];
    const check = (value, label) => { if (!value) throw new Error(label); passed.push(label); };
    resetGame();
    showScreen('game');
    playerState.hasStaff = true;
    enterArea('controlledPalace');
    check(visibleAreaEnemies().length === 3, 'Palace first floor starts with three guardians');
    player.x = 15 * config.tileSize;
    player.y = 4 * config.tileSize;
    updateInteractionPrompt();
    check(promptMode === 'palace-stairs', 'Upstairs prompt is reachable');
    usePrompt();
    check(currentAreaId === 'palaceUpper' && !collidesWithBlockedTile(player), 'Stairs arrive safely in Kyle chamber');
    player.y = 16 * config.tileSize;
    updateInteractionPrompt();
    usePrompt();
    check(currentAreaId === 'controlledPalace' && !collidesWithBlockedTile(player), 'Downstairs returns to the lower staircase');
    enterArea('palaceUpper');
    leaveArea();
    check(currentAreaId === 'palaceUpper', 'Upper floor cannot bypass the stairs to leave the palace');
    enterArea('controlledPalace');
    returnToExterior();
    check(currentAreaId === 'controlledPlains' && !collidesWithBlockedTile(player), 'Palace ground floor returns safely to its overworld entrance');

    enterArea('sylvan');
    let enemy = ordinaryEnemies(areas.sylvan).find(candidate => candidate.visual === 'flying');
    startBattle(enemy);
    finishRestoration();
    finishRestoration();
    check(playerState.divinePoints === 10, 'Soul awards 10 points exactly once');
    resetGame();
    showScreen('game');
    playerState.hasStaff = true;
    enterArea('sylvan');
    enemy = ordinaryEnemies(areas.sylvan)[0];
    startBattle(enemy);
    finishRestoration();
    check(playerState.divinePoints === 5, 'Cube retains its 5-point reward');
    resetGame();
    showScreen('game');
    playerState.hasStaff = true;
    enterArea('sylvan');
    enemy = ordinaryEnemies(areas.sylvan)[0];
    startBattle(enemy);
    playerState.wither = true;
    enemy.control = enemy.controlMax = 200;
    applyAttackMilestones(4);
    check(enemy.control === 200, 'Wither waits for five hits');
    applyAttackMilestones(1);
    check(enemy.control === 170, 'Wither removes 15 percent from ordinary enemies');
    window.clearTimeout(battleTimer);
    setBattleButtons(false);
    startBattle(areas.controlledPalace.enemies[0]);
    activeEnemy.control = activeEnemy.controlMax = 200;
    applyAttackMilestones(5);
    check(activeEnemy.control === 190, 'Wither removes 5 percent from guardians');
    startBattle(areas.palaceUpper.enemies[0]);
    applyAttackMilestones(5);
    check(activeEnemy.control === 950, 'Wither retains 5 percent damage against Kyle');

    resetGame();
    showScreen('game');
    for (const region of Object.keys(regionalBossDefinitions)) {
      const area = areas[region];
      check(!area.enemies.some(candidate => candidate.regionBoss), `${region}: guardian starts hidden at home`);
      const ordinary = ordinaryEnemies(area);
      ordinary.slice(0, -1).forEach(candidate => { candidate.restored = true; });
      restoreMapEnemy(ordinary.at(-1), region);
      const boss = area.enemies.find(candidate => candidate.regionBoss === region);
      check(boss && !boss.restored, `${region}: clearing ordinary enemies reveals its guardian`);
      enterArea(region);
      check(!collidesWithBlockedTile(boss), `${region}: guardian spawns on clear ground`);
      player.x = boss.x;
      player.y = boss.y;
      updateInteractionPrompt();
      check(promptMode === 'challenge-boss', `${region}: guardian uses contact and Z`);
      playerState.hasStaff = true;
      if (region === 'azureApex') {
        enterArea('controlledPalace');
        startBattle(regionalBossStates[region].palaceEnemy);
      } else usePrompt();
      check(currentScreen === 'battle' && activeEnemy.regionBoss === region, `${region}: guardian battle opens`);
      const points = playerState.divinePoints;
      finishRestoration();
      finishRestoration();
      const restored = area.enemies.filter(candidate => candidate.permanentResident);
      const definition = regionalBossDefinitions[region];
      check(restored.filter(candidate => candidate.visual === 'ground').length === definition.cubes
        && restored.filter(candidate => candidate.visual === 'flying').length === definition.souls, `${region}: exact released cube and soul counts`);
      check(playerState.divinePoints === points + 5, `${region}: guardian reward occurs once`);
      check(!visibleAreaEnemies('controlledPalace').some(candidate => candidate.regionBoss === region)
        && !visibleAreaEnemies(region).some(candidate => candidate.regionBoss === region), `${region}: defeat removes both appearances`);
      const count = restored.length;
      defeatRegionalBoss(region);
      revealRegionalBosses();
      check(area.enemies.filter(candidate => candidate.permanentResident).length === count, `${region}: released residents cannot duplicate`);
      window.clearTimeout(restorationTimer);
      restorationTimer = null;
      setBattleButtons(false);
      showScreen('game');
      enterArea(region);
      restored.forEach(candidate => {
        check(!collidesWithBlockedTile(candidate), `${region}: released resident has a safe spawn`);
        candidate.moveX = 1; candidate.moveY = 0; candidate.waitUntil = 0;
        candidate.movingUntil = performance.now() + 1000;
        const x = candidate.x;
        moveEnemies();
        check(candidate.x > x, `${region}: released ${candidate.visual} can wander`);
      });
      finishAreaDeparture();
      enterArea(region);
      check(restored.every(candidate => !candidate.relocated), `${region}: boss residents stay in their region after travel`);
      const village = villageAreaForSource(region);
      if (village) check(villageResidents(village).every(candidate => !candidate.permanentResident), `${region}: boss residents never use village slots`);
    }
    resetGame();
    check(Object.values(regionalBossStates).every(state => !state.defeated && !state.revealed)
      && Object.values(areas).every(area => area.enemies.every(candidate => !candidate.permanentResident))
      && visibleAreaEnemies('controlledPalace').length === 3, 'Reset restores all guardians and removes released residents');
    restoreMapEnemy(regionalBossStates.sylvan.palaceEnemy, 'controlledPalace');
    ordinaryEnemies(areas.sylvan).forEach(candidate => { candidate.restored = true; });
    revealRegionalBosses();
    check(!areas.sylvan.enemies.some(candidate => candidate.regionBoss)
      && areas.sylvan.enemies.filter(candidate => candidate.permanentResident).length === 3,
      'Defeating a palace guardian before clearing its region prevents a later duplicate');
    resetGame();
    playerState.divinePoints = 1000;
    ['health', 'greaterHealth', 'higherHealth', 'damage', 'greaterDamage', 'defense', 'greaterDefense'].forEach(buyUpgrade);
    check(playerState.maxHealth === 48 && playerState.restorePower === 15 && playerState.defense === 11,
      'Purchased health, damage and defense branches apply their advertised stat increases');
    playerState.hasStaff = true;
    enterArea('azureApex');
    const highEnemy = ordinaryEnemies(areas.azureApex).find(candidate => candidate.level === 50);
    startBattle(highEnemy);
    enemyTurn();
    check(playerState.health === 6, 'Balance audit: level 50 deals 42 damage against upgraded Guard 11');
    resetGame();
    return passed;
  });
  console.log(results.join('\n'));
}

async function verifyBossVisuals(page, label, inspectAlpha = false) {
  await page.waitForFunction(() => Object.values(regionalBossSprites).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(() => {
    cancelAnimationFrame(animationFrameId);
    resetGame();
    playerState.hasStaff = true;
    showScreen('game');
    enterArea('controlledPalace');
    player.y = 10 * config.tileSize;
    updateCamera();
    drawWorld();
  });
  await page.locator('#game-canvas').screenshot({ path: path.join(os.tmpdir(), `split-path-palace-${label}.png`) });
  for (const region of ['sylvan', 'azureApex', 'controlledPlains']) {
    const image = await page.evaluate(({ region, inspectAlpha }) => {
      if (inspectAlpha) {
        const sprite = regionalBossSprites[region];
        const canvas = document.createElement('canvas');
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        const context = canvas.getContext('2d');
        context.drawImage(sprite, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let opaque = 0, transparent = 0;
        for (let offset = 3; offset < pixels.length; offset += 4) {
          if (pixels[offset] > 240) opaque += 1;
          if (pixels[offset] === 0) transparent += 1;
        }
        if (!opaque || !transparent) throw new Error(`${region}: sprite needs visible art and transparency`);
      }
      startBattle(regionalBossStates[region].palaceEnemy);
      return document.querySelector('#battle-enemy').style.backgroundImage;
    }, { region, inspectAlpha });
    assert.ok(image.includes('transparent.png'), `${region}: battle uses the prepared art`);
    await page.locator('#battle-screen .battle-panel').screenshot({ path: path.join(os.tmpdir(), `split-path-${region}-battle-${label}.png`) });
    await page.evaluate(() => { showScreen('game'); setBattleButtons(false); });
  }
  await page.evaluate(() => {
    enterArea('palaceUpper');
    player.y = 10 * config.tileSize;
    updateCamera();
    drawWorld();
  });
  await page.locator('#game-canvas').screenshot({ path: path.join(os.tmpdir(), `split-path-kyle-floor-${label}.png`) });
  await page.evaluate(() => resetGame());
  console.log(`${label}: palace floors and all boss battle artwork render; screenshots saved to the temp folder.`);
}

async function verifyScalingAndDagger(page) {
  const checks = await page.evaluate(() => {
    const passed = [];
    const check = (value, label) => { if (!value) throw new Error(label); passed.push(label); };
    const prepare = () => { resetGame(); showScreen('game'); playerState.divinePoints = 1000; };
    for (const ability of ['wither', 'strengthen', 'healOverTime']) {
      prepare();
      ['health', ability === 'wither' ? 'lifeSteal' : 'greaterHealth'].forEach(buyUpgrade);
      playerState.health -= 7;
      const before = { health: playerState.health, max: playerState.maxHealth, points: playerState.divinePoints };
      buyUpgrade(ability);
      check(playerState.maxHealth === before.max + 3 && playerState.health === before.health + 3
        && playerState.divinePoints === before.points - 15, `${ability}: purchase grants exactly 3 current and maximum health`);
      buyUpgrade(ability);
      check(playerState.maxHealth === before.max + 3 && playerState.divinePoints === before.points - 15,
        `${ability}: repeat purchase grants no extra stats and spends no points`);
    }
    for (const ability of ['critRate', 'doubleAttack']) {
      prepare();
      ['damage', 'greaterDamage'].forEach(buyUpgrade);
      check(playerState.restorePower === 15, 'Greater Damage adds 5 attack');
      buyUpgrade(ability);
      check(playerState.restorePower === 18, `${ability}: adds 3 attack`);
      check(ability === 'critRate' ? playerState.criticalChance === 0.3 : playerState.doubleAttack,
        `${ability}: original ability is retained`);
      const points = playerState.divinePoints;
      buyUpgrade(ability);
      buyUpgrade(ability === 'critRate' ? 'doubleAttack' : 'critRate');
      check(playerState.restorePower === 18 && playerState.divinePoints === points,
        `${ability}: repeat and conflicting purchases cannot add stats`);
    }
    prepare();
    ['damage', 'magic'].forEach(buyUpgrade);
    check(playerState.restorePower === 14 && playerState.magic, 'Magic adds 4 attack and retains spells');
    prepare();
    ['defense', 'greaterDefense', 'dodge'].forEach(buyUpgrade);
    check(playerState.defense === 14 && playerState.upgrades.dodge, 'Dodge adds 3 defense and retains its passive');
    prepare();
    buyUpgrade('wither');
    buyUpgrade('dodge');
    check(playerState.maxHealth === 20 && playerState.defense === 3, 'Locked upgrades cannot grant stat bonuses');
    ['health', 'greaterHealth', 'strengthen', 'healOverTime'].forEach(buyUpgrade);
    const health = playerState.maxHealth;
    buyUpgrade('higherHealth');
    check(playerState.maxHealth === health && !playerState.upgrades.higherHealth,
      'Health branch still permits only two tier-three choices');
    resetGame();
    showScreen('game');
    playerState.hasStaff = true;
    enterArea('sylvan');
    const enemy = ordinaryEnemies(areas.sylvan)[0];
    startBattle(enemy);
    defendAction();
    check(!enemy.restored && enemy.control === enemy.controlMax && !daggerTestMode.enabled,
      'Defend retains normal behavior before the cheat is activated');
    resetGame();
    showScreen('game');
    player.x = 17 * config.tileSize + 2;
    player.y = 6 * config.tileSize - 8;
    updateInteractionPrompt();
    check(promptMode === 'castle-dagger', 'Standing over the dagger offers its inspection');
    return passed;
  });
  console.log(checks.join('\n'));
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => daggerTestMode.enabled), false, 'H alone cannot activate the cheat');
  await page.keyboard.press('z');
  await page.keyboard.down('z');
  await page.keyboard.down('z');
  await page.keyboard.up('z');
  assert.equal(await page.evaluate(() => daggerTestMode.inspections), 2, 'Held Z cannot count as multiple dagger inspections');
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => daggerTestMode.enabled), false, 'Two inspections are insufficient');
  await page.keyboard.press('z');
  await page.evaluate(() => enterArea('sylvan'));
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => daggerTestMode.enabled), false, 'H only activates in Pristine Castle');
  await page.evaluate(() => enterArea('pristineCastle'));
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => daggerTestMode.enabled), true, 'Three inspections and H activate test mode');
  for (const target of ['cube', 'soul', 'sylvan', 'azureApex', 'controlledPlains', 'kyle']) {
    const before = await page.evaluate(target => {
      playerState.hasStaff = true;
      let enemy;
      if (target === 'kyle') { enterArea('palaceUpper'); enemy = areas.palaceUpper.enemies[0]; }
      else if (regionalBossStates[target]) { enterArea('controlledPalace'); enemy = regionalBossStates[target].palaceEnemy; }
      else {
        enterArea('sylvan');
        enemy = ordinaryEnemies(areas.sylvan).find(candidate => candidate.visual === (target === 'soul' ? 'flying' : 'ground') && !candidate.restored);
      }
      startBattle(enemy);
      return { health: playerState.health, points: playerState.divinePoints };
    }, target);
    await page.locator('#defend-action').click();
    await page.evaluate(() => defendAction());
    await page.waitForFunction(() => currentScreen === 'upgrades');
    const result = await page.evaluate(() => ({ health: playerState.health, points: playerState.divinePoints,
      restored: activeEnemy.restored, control: activeEnemy.control }));
    assert.equal(result.health, before.health, `${target}: test defense prevents enemy damage`);
    assert.equal(result.points, before.points + (target === 'soul' ? 10 : 5), `${target}: normal reward granted exactly once`);
    assert.ok(result.restored && result.control === 0, `${target}: Defend restores the opponent`);
    await page.locator('#close-upgrades').click();
  }
  assert.equal(await page.evaluate(() => Object.values(regionalBossStates).every(state => state.defeated)
    && areas.azureApex.enemies.filter(enemy => enemy.permanentResident).length === 6), true,
    'Cheat-assisted guardian victories still release the normal residents');
  await page.evaluate(() => resetGame());
  await page.keyboard.press('h');
  assert.equal(await page.evaluate(() => daggerTestMode.enabled || daggerTestMode.inspections !== 0), false,
    'New Game clears the test mode and inspection count');
  console.log('Dagger keyboard sequence, all enemy types, rewards, boss progression and reset pass.');
}

(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const isBaseline = url.pathname.startsWith('/baseline/');
    const relative = decodeURIComponent(url.pathname.replace(/^\/(baseline\/)?/, '')) || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const body = isBaseline && ['index.html', 'js/game.js'].includes(relative)
        ? execFileSync('git', ['show', `${baseline}:${relative}`], { cwd: root })
        : fs.readFileSync(target);
      res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    if (process.argv.includes('--overworld-only')) {
      await desktop.goto(origin + '/index.html');
      await desktop.waitForFunction(() => Object.values(sylvanSprites).every(image => image.complete));
      await verifyOverworld(desktop, 'desktop');
      const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await mobile.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await mobile.waitForFunction(() => Object.values(sylvanSprites).every(image => image.complete));
      await verifyOverworld(mobile, 'mobile-local');
      return;
    }
    const current = await inspect(desktop, origin + '/index.html');
    console.log(current.checks.join('\n'));
    await desktop.evaluate(() => {
      resetGame();
      enterArea('sylvan');
      playerState.hasStaff = true;
      const enemy = areas.sylvan.enemies.find(candidate => candidate.level === 8);
      const resident = areas.sylvan.enemies.find(candidate => candidate !== enemy);
      resident.restored = true;
      resident.control = 0;
      Object.assign(enemy, statsForLevel(8), { controlMax: 44, restored: false });
      resident.x = player.x = enemy.x;
      resident.y = player.y = enemy.y;
      contactLockedUntil = 0;
      showScreen('game');
      lastTime = performance.now() - 16;
      gameLoop(performance.now());
      if (activeEnemy !== enemy || currentScreen !== 'battle') throw new Error('Level 8 encounter target was replaced');
      attackAction();
      pendingAttack.startedAt = performance.now() - 250;
    });
    await desktop.keyboard.press('z');
    assert.equal(await desktop.evaluate(() => activeEnemy.control), 41, 'Normal level 8 attack cannot instantly restore it');
    await desktop.evaluate(() => {
      window.clearTimeout(battleTimer);
      setBattleButtons(false);
      playerState.restorePower = 999;
      attackAction();
      resolvePlayerAttack();
      finishRestoration();
      if (playerState.divinePoints !== 5) throw new Error('Restoration reward repeated');
    });
    await desktop.waitForFunction(() => currentScreen === 'upgrades');
    await desktop.locator('#close-upgrades').click();
    await desktop.evaluate(() => { contactLockedUntil = 0; checkAreaEncounters(); });
    assert.equal(await desktop.evaluate(() => currentScreen), 'game', 'Restored level 8 enemy cannot restart its encounter');
    console.log('Level 8 encounter, keyboard perfect strike, single restoration reward, and Return recovery pass.');
    await verifyCastleRoute(desktop, 'desktop');
    await verifyGuardianProgression(desktop);
    await verifyBossVisuals(desktop, 'desktop', true);
    await verifyScalingAndDagger(desktop);
    await verifyOverworld(desktop, 'desktop');
    if (baseline) {
      const previous = await inspect(await browser.newPage({ viewport: { width: 1280, height: 900 } }), origin + '/baseline/index.html');
      assert.deepEqual(current.initial, previous.initial, 'Initial map and enemy data must match baseline');
      for (const id of Object.keys(current.images)) assert.deepEqual(current.images[id], previous.images[id], `${id} canvas must match baseline pixel for pixel`);
      assert.deepEqual(current.checks, previous.checks);
      console.log('Baseline matches: initial map/enemy state, eight canvas screenshots, and gameplay checks.');
    }
    const local = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const localErrors = [];
    local.on('pageerror', error => localErrors.push(error.message));
    await local.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await local.locator('#play-button').click();
    await local.locator('#story-skip').click();
    assert.equal(await local.evaluate(() => currentScreen), 'game');
    assert.equal(await local.evaluate(() => currentAreaId), 'pristineCastle');
    assert.deepEqual(localErrors, []);
    console.log('Direct local-file play and mobile startup pass with no runtime errors.');
    await verifyCastleRoute(local, 'mobile-local');
    await verifyBossVisuals(local, 'mobile-local');
    await verifyOverworld(local, 'mobile-local');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
