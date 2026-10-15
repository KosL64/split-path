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
  for (const id of Object.keys(initial)) {
    await page.evaluate(id => {
      resetGame();
      showScreen('game');
      enterArea(id);
      updateCamera();
      drawWorld();
    }, id);
    images[id] = await page.locator('#game-canvas').screenshot();
  }
  await page.evaluate(() => { enterKingdom(); updateCamera(); drawWorld(); });
  images.kingdom = await page.locator('#game-canvas').screenshot();
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
    check(areas.controlledPalace.enemies[0].controlMax === 1000, 'Kyle retains 1000 health');
    const resident = areas.sylvan.enemies.find(enemy => enemy.visual === 'ground');
    activeEnemy = resident;
    finishRestoration();
    check(resident.restored && !resident.relocated && playerState.divinePoints === 5, 'Restoration grants points and keeps the resident in the area');
    leaveArea();
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
    check(kingdomMap.nodes.find(node => node.areaId === 'controlledPlains').name === 'The Ancient Plains', 'Kingdom Map shows the restored plains name');
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
  assert.equal(await page.evaluate(() => gameMode), 'kingdom', `${label}: Z exits to the Kingdom Map`);
  await page.evaluate(() => resetGame());
  assert.equal(await page.evaluate(() => playerState.hasStaff || castleState.exitCleared), false, `${label}: reset restores castle progression`);
  console.log(`${label}: movement, staff pickup, throne sitting/standing, rubble, exit and reset pass.`);
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
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
