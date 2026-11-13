// map-mechanics: see CODE-OWNERSHIP.md for shared state and loading order.

let gameMode = "area";
let currentAreaId = "sylvan";
let contactLockedUntil = 0;
let dialogueUntil = 0;
let dialogueTimer = null;
let temporaryMessageActive = false;
let talkingResident = null;
let promptMode = "";
let activeEnemy = null;
let activeNode = null;
let activeSign = null;
let activeHouse = null;
let bossDialogue = [];
let bossDialogueIndex = 0;
let activeCastleFeature = null;
const regionalBossStates = {};

function ordinaryEnemies(area) {
  return area.enemies.filter((enemy) => enemy.kind !== "boss" && !enemy.permanentResident);
}

function bossDefeated(enemy) {
  return enemy.restored || (enemy.regionBoss && regionalBossStates[enemy.regionBoss].defeated);
}

function visibleAreaEnemies(areaId = currentAreaId) {
  return areas[areaId].enemies.filter((enemy) => enemy.kind === "boss" ? !bossDefeated(enemy) : !enemy.relocated);
}

const castleState = {
  exitCleared: false,
  sitting: false,
  sittingStartedAt: 0,
  standX: 0,
  standY: 0
};

// Combat reports restoration here; map progression owns the resulting world changes.
function restoreMapEnemy(enemy, areaId) {
  enemy.restored = true;
  if (enemy.regionBoss) defeatRegionalBoss(enemy.regionBoss);
  if (enemy.kind !== "boss" && !enemy.permanentResident) initializeVillageResident(enemy);
  const area = areas[areaId];
  const ordinary = ordinaryEnemies(area);
  const remainingEnemies = ordinary.filter((candidate) => !candidate.restored).length;
  const areaCleared = ordinary.length > 0 ? remainingEnemies === 0 : area.enemies.some((candidate) => candidate.kind === "boss") && area.enemies.filter((candidate) => candidate.kind === "boss").every(bossDefeated);
  area.healed = areaCleared;
  revealRegionalBosses();
  updatePlainsRestoration();
  updateVillageLocks();
  return { area, remainingEnemies, areaCleared };
}

function resetMapState() {
  environmentState.springSince = null;
  environmentState.cloudSince = null;
  Object.assign(castleState, {
    exitCleared: false,
    sitting: false,
    sittingStartedAt: 0,
    standX: 0,
    standY: 0
  });
  Object.values(areas).forEach((area) => {
    area.enemies = area.enemies.filter((enemy) => !enemy.permanentResident && !enemy.regionBoss);
    area.healed = !!area.signs || !!area.houseInterior || !!area.world?.parent || area === areas.castleGrounds;
    area.enemies.forEach((enemy) => {
      enemy.restored = false;
      enemy.relocated = false;
      enemy.control = enemy.controlMax;
      enemy.moveX = 0;
      enemy.moveY = 0;
      enemy.movingUntil = 0;
      enemy.waitUntil = 0;
      enemy.chasing = false;
      enemy.route = [];
      enemy.routeUntil = 0;
      enemy.talked = false;
      enemy.facing = 1;
      delete enemy.gazeX;
      delete enemy.gazeY;
      delete enemy.villageSlot;
      delete enemy.villageX;
      delete enemy.villageY;
      delete enemy.villageMoveX;
      delete enemy.villageMoveY;
      delete enemy.villageMovingUntil;
      delete enemy.villageWaitUntil;
      delete enemy.homeAreaId;
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
    });
  });
  initializeRegionalBosses();
  regionDirectory.nodes.forEach((node) => {
    node.unlocked = node.kind !== "village";
  });
  updatePlainsRestoration();
  currentAreaId = "sylvan";
  updateVillageLocks();
}

function initializeBoss() {
  const area = areas.palaceUpper;
  const stats = statsForLevel(100);
  const bossHealth = 1000;
  area.enemies = [{
    id: "kyle-boss",
    name: "Kyle",
    kind: "boss",
    visual: "boss",
    originArea: "palaceUpper",
    level: 100,
    attack: stats.attack,
    defense: stats.defense,
    maxHealth: bossHealth,
    controlMax: bossHealth,
    control: bossHealth,
    x: 15 * config.tileSize + 7,
    y: 9 * config.tileSize + 5,
    spawnX: 15 * config.tileSize + 7,
    spawnY: 9 * config.tileSize + 5,
    width: 42,
    height: 48,
    restored: false,
    stationary: true,
    facing: -1,
    talked: false,
    chasing: false,
    route: [],
    routeUntil: 0,
    moveX: 0,
    moveY: 0,
    movingUntil: 0,
    waitUntil: 0
  }];
  initializeRegionalBosses();
}

function initializeRegionalBosses() {
  areas.controlledPalace.enemies = [];
  Object.entries(regionalBossDefinitions).forEach(([region, definition]) => {
    const stats = statsForLevel(definition.level);
    const enemy = {
      id: `${region}-guardian-palace`, name: definition.name, regionBoss: region,
      kind: "boss", visual: "boss", originArea: region,
      level: definition.level, attack: stats.attack * 2, defense: stats.defense * 2,
      maxHealth: stats.health * 2, controlMax: stats.health * 2, control: stats.health * 2,
      x: definition.palaceX * config.tileSize + 3, y: 9 * config.tileSize,
      width: 42, height: 48, restored: false, facing: -1,
      route: [], routeUntil: 0, moveX: 0, moveY: 0
    };
    enemy.spawnX = enemy.x;
    enemy.spawnY = enemy.y;
    regionalBossStates[region] = { defeated: false, revealed: false, palaceEnemy: enemy };
    areas.controlledPalace.enemies.push(enemy);
  });
}

function revealRegionalBosses() {
  Object.entries(regionalBossStates).forEach(([region, state]) => {
    const enemies = ordinaryEnemies(areas[region]);
    if (state.defeated || state.revealed || !enemies.length || enemies.some((enemy) => !enemy.restored)) return;
    const tiles = guardianSpawnTiles(region, state.palaceEnemy);
    if (!tiles.length) return;
    const spawn = tiles[Math.floor(Math.random() * tiles.length)];
    const enemy = { ...state.palaceEnemy, id: `${region}-guardian-home`, x: spawn.x * config.tileSize + 3, y: spawn.y * config.tileSize,
      guardianPursuit: undefined, chasing: false, route: [], routeUntil: 0 };
    enemy.spawnX = enemy.x;
    enemy.spawnY = enemy.y;
    areas[region].enemies.push(enemy);
    state.revealed = true;
  });
}

function guardianSpawnTiles(region, guardian) {
  const area = areas[region];
  const offset = enemyTileOffset(guardian);
  const size = config.tileSize;
  const clearAt = (x, y) => {
    const left = Math.floor(x / size), right = Math.floor((x + guardian.width - 1) / size);
    const top = Math.floor(y / size), bottom = Math.floor((y + guardian.height - 1) / size);
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (isBlockedTile(area.map[row]?.[col]) || area.map[row]?.[col] === "f" || tileIsEmbeddedVillage(area, col, row)) return false;
      }
    }
    return true;
  };
  return collectEnemySpawnTiles(area).filter(({ x, y }) => {
    if (region === "sylvan") {
      const forest = landscape.thicket;
      if (x >= forest.x - 1 && x < forest.x + forest.width + 1 && y >= forest.y - 1 && y < forest.y + forest.height + 1) return false;
    }
    const px = x * size + offset.x, py = y * size + offset.y;
    return clearAt(px, py) && [[size, 0], [-size, 0], [0, size], [0, -size]].every(([dx, dy]) => clearAt(px + dx, py + dy));
  });
}

function defeatRegionalBoss(region) {
  const state = regionalBossStates[region];
  if (state.defeated) return;
  state.defeated = true;
  Object.values(areas).forEach((area) => area.enemies.forEach((enemy) => {
    if (enemy.regionBoss === region) enemy.restored = true;
  }));
  const definition = regionalBossDefinitions[region];
  const area = areas[region];
  const tiles = collectEnemySpawnTiles(area);
  for (let index = 0; index < definition.cubes + definition.souls; index += 1) {
    const tile = tiles[(index * 7) % tiles.length];
    area.enemies.push({
      id: `${region}-released-${index}`, visual: index < definition.cubes ? "ground" : "flying",
      originArea: region, permanentResident: true, restored: true, relocated: false,
      x: tile.x * config.tileSize + 7, y: tile.y * config.tileSize + 5,
      width: 34, height: 38, level: 1, facing: 1, talked: false,
      moveX: 0, moveY: 0, movingUntil: 0, waitUntil: 0, route: [], control: 0, controlMax: 1
    });
  }
  areas.controlledPalace.healed = Object.values(regionalBossStates).every((boss) => boss.defeated);
}

function initializeAreaRockDecorations() {
  enhancedRockAreas.forEach((areaId) => {
    const area = areas[areaId];
    if (!area) return;
    area.rockDecorations = buildRockDecorations(area, areaId);
  });
}

function buildRockDecorations(area, areaId) {
  const decorations = [];
  const occupied = new Set();
  const isRock = (x, y) => area.map[y]?.[x] === "R";
  const keyFor = (x, y) => `${x},${y}`;

  area.map.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (tile !== "R" || occupied.has(keyFor(x, y))) return;

      let width = 1;
      let height = 1;
      let size = "small";

      if (isRock(x + 1, y) && isRock(x, y + 1) && isRock(x + 1, y + 1)) {
        width = 2;
        height = 2;
        size = "large";
      } else if (areaId !== "sylvan" && isRock(x + 1, y)) {
        width = 2;
        size = "medium";
      } else if (areaId !== "sylvan" && isRock(x, y + 1)) {
        height = 2;
        size = "medium";
      }

      for (let rowOffset = 0; rowOffset < height; rowOffset += 1) {
        for (let colOffset = 0; colOffset < width; colOffset += 1) {
          occupied.add(keyFor(x + colOffset, y + rowOffset));
        }
      }

      decorations.push({
        x,
        y,
        width,
        height,
        size,
        image: pickRockSprite(areaId, size, x, y)
      });
    });
  });

  return decorations;
}

function pickRockSprite(areaId, size, x, y) {
  const sprites = rockSprites[areaId]?.[size] || [];
  if (!sprites.length) return null;
  return sprites[Math.abs((x * 17 + y * 31 + size.length) % sprites.length)];
}

function initializeAreaEnemies() {
  Object.entries(areaEnemyGoals).forEach(([areaId, count]) => {
    const area = areas[areaId];
    if (!area) return;
    area.enemies = createEnemiesForArea(area, count, areaId);
  });
}

function createEnemiesForArea(area, count, seedText) {
  const positions = collectEnemySpawnTiles(area);
  const marked = positions.filter((position) => position.tile === "C");
  const shuffled = seededShuffle(positions.filter((position) => position.tile !== "C"), seedFromText(seedText));
  const orderedPositions = [...marked, ...shuffled];
  const levelRange = areaLevelRanges[seedText] || { min: 1, max: 1 };
  const selectedPositions = orderedPositions.slice(0, count);
  const preferredLevels = selectedPositions.map((_, index) => {
    const visual = index % 4 === 3 ? "flying" : "ground";
    return visual === "flying"
      ? levelForEnemy(Math.floor(index / 4), Math.floor(count / 4), soulLevelRanges[seedText] || levelRange)
      : levelForEnemy(index, count, levelRange);
  });
  const levels = seedText === "sylvan"
    ? replaceDuplicateLevels(preferredLevels, levelRange)
    : preferredLevels;

  return selectedPositions.map((position, index) => {
    const visual = index % 4 === 3 ? "flying" : "ground";
    const level = levels[index];
    const stats = statsForLevel(level);

    return {
      id: `${seedText}-cube-${index + 1}`,
      visual,
      originArea: seedText,
      facing: 1,
      talked: false,
      chasing: false,
      route: [],
      routeUntil: 0,
      spawnX: position.x * config.tileSize + 7,
      spawnY: position.y * config.tileSize + 5,
      level,
      attack: stats.attack,
      defense: stats.defense,
      maxHealth: stats.health,
      x: position.x * config.tileSize + 7,
      y: position.y * config.tileSize + 5,
      width: 34,
      height: 38,
      restored: false,
      relocated: false,
      controlMax: stats.health,
      control: stats.health,
      moveX: 0,
      moveY: 0,
      movingUntil: 0,
      waitUntil: 0
    };
  });
}

function replaceDuplicateLevels(levels, range) {
  const uniqueLevels = new Set(levels);
  const missingLevels = [];
  for (let level = range.min; level <= range.max; level += 1) {
    if (!uniqueLevels.has(level)) missingLevels.push(level);
  }

  const usedLevels = new Set();
  return levels.map((level) => {
    if (!usedLevels.has(level)) {
      usedLevels.add(level);
      return level;
    }
    const replacement = missingLevels.shift();
    usedLevels.add(replacement);
    return replacement;
  });
}

function levelForEnemy(index, totalEnemies, range) {
  if (totalEnemies <= 1) return range.min;
  const progress = index / (totalEnemies - 1);
  return Math.round(range.min + (range.max - range.min) * progress);
}

function collectEnemySpawnTiles(area) {
  const preferred = [];
  const fallback = [];

  area.map.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      const distanceFromStart = Math.hypot(x - area.start.x, y - area.start.y);
      if (distanceFromStart < 4 || tile === "E" || tile === "d" || isBlockedTile(tile) || tileIsEmbeddedVillage(area, x, y) || !landscapeSpawnReachable(area, x, y)) return;
      if (tile === "C" || tile === "g") preferred.push({ x, y, tile });
      else if (tile === ".") fallback.push({ x, y, tile });
    });
  });

  return [...preferred, ...fallback];
}

function seededShuffle(items, seed) {
  const shuffled = [...items];
  let state = seed;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function seedFromText(text) {
  return [...text].reduce((total, letter) => total + letter.charCodeAt(0) * 17, 97);
}

function enterArea(areaId) {
  const area = areas[areaId];
  clearInteractionState();
  gameMode = "area";
  currentAreaId = areaId;
  player.x = area.start.x * config.tileSize + (config.tileSize - player.width) / 2;
  player.y = area.start.y * config.tileSize + 2;
  contactLockedUntil = performance.now() + config.contactCooldown;
  updateHud();
}

function leaveArea() {
  if (!isPlayerOnExit()) return;
  returnToExterior();
}

function relocateRestoredEnemies(areaId) {
  areas[areaId].enemies.forEach((enemy) => {
    if (enemy.kind !== "boss" && enemy.restored && !enemy.permanentResident) enemy.relocated = true;
  });
}

function usePalaceStairs() {
  const stairs = areas[currentAreaId].stairs;
  if (!stairs) return;
  finishAreaDeparture();
  enterArea(stairs.target);
  player.x = stairs.arrival.x * config.tileSize + 2;
  player.y = stairs.arrival.y * config.tileSize;
  updateCamera();
}

function clearInteractionState() {
  window.clearTimeout(dialogueTimer);
  dialogueTimer = null;
  temporaryMessageActive = false;
  talkingResident = null;
  dialogueUntil = 0;
  promptMode = "";
  activeEnemy = null;
  activeNode = null;
  activeSign = null;
  activeHouse = null;
  activeCastleFeature = null;
  bossDialogue = [];
  bossDialogueIndex = 0;
  setPrompt("");
}

function movePlayer() {
  let horizontal = 0;
  let vertical = 0;

  if (keys.has("arrowleft") || keys.has("a")) horizontal -= 1;
  if (keys.has("arrowright") || keys.has("d")) horizontal += 1;
  if (keys.has("arrowup") || keys.has("w")) vertical -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vertical += 1;

  if ((horizontal || vertical) && castleState.sitting) standFromThrone();

  if (horizontal && vertical) {
    horizontal *= 0.707;
    vertical *= 0.707;
  }

  if (horizontal) player.facing = horizontal > 0 ? 1 : -1;
  if (vertical < 0) player.view = "back";
  else if (horizontal || vertical > 0) player.view = "front";

  const baseSpeed = config.areaMoveSpeed;
  const speed = isSprinting() ? baseSpeed * config.sprintMultiplier : baseSpeed;
  attemptMove(horizontal * speed, vertical * speed);
  updateWorldEnvironment();
}

function isSprinting() {
  return keys.has("x") || keys.has("shift");
}

function attemptMove(deltaX, deltaY) {
  if (!deltaX && !deltaY) return;
  tryMove(deltaX, 0);
  tryMove(0, deltaY);
}

function tryMove(deltaX, deltaY) {
  const next = { ...player, x: player.x + deltaX, y: player.y + deltaY };

  if (areas[currentAreaId].world) return moveOverworldPlayer(next);

  if (!collidesWithBlockedTile(next)) {
    player.x = next.x;
    player.y = next.y;
  }
}

function moveEnemies() {
  if (gameMode !== "area") return;
  const area = areas[currentAreaId];

  area.enemies.forEach((enemy) => {
    if (enemy.regionBoss) {
      if (!bossDefeated(enemy)) moveGuardian(enemy, performance.now());
      return;
    }
    if (pauseResidentConversation(enemy, enemy, performance.now())) return;
    if (enemy.stationary) return;
    if (enemy.restored) {
      if (!enemy.relocated && (enemy.visual === "ground" || enemy.permanentResident)) moveEnemy(enemy);
      return;
    }
    moveEnemy(enemy);
  });
  moveVillageResidents();
}

function moveVillageResidents() {
  const now = performance.now();
  villageResidents().forEach((resident) => {
    initializeVillageResident(resident);
    if (pauseResidentConversation(resident, positionedResident(resident), now)) return;
    if (now < resident.villageWaitUntil) return;
    if (now >= resident.villageMovingUntil) {
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
      const [x, y] = directions[Math.floor(Math.random() * directions.length)];
      resident.villageMoveX = x;
      resident.villageMoveY = y;
      resident.villageMovingUntil = now + 700 + Math.random() * 900;
      resident.villageWaitUntil = x || y ? 0 : now + 600;
      return;
    }
    const next = {
      ...resident,
      x: resident.villageX + resident.villageMoveX * 0.55,
      y: resident.villageY + resident.villageMoveY * 0.55
    };
    if (collidesWithBlockedTile(next)) {
      resident.villageMovingUntil = 0;
      resident.villageWaitUntil = now + 350;
      return;
    }
    resident.villageX = next.x;
    resident.villageY = next.y;
    if (resident.villageMoveX) resident.facing = Math.sign(resident.villageMoveX);
  });
}

function guardianCanSeePlayer(enemy, cardinalOnly) {
  const size = config.tileSize;
  const area = areas[currentAreaId];
  const x = enemy.x + enemy.width / 2, y = enemy.y + enemy.height / 2;
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  let col = Math.floor(x / size), row = Math.floor(y / size);
  const targetCol = Math.floor(px / size), targetRow = Math.floor(py / size);
  if (cardinalOnly && col !== targetCol && row !== targetRow) return false;
  const blocksSight = (tx, ty) => {
    const tile = area.world ? worldTileAt(area.world.x + tx, area.world.y + ty) : area.map[ty]?.[tx];
    return tile === "f" || isBlockedTile(tile);
  };
  const dx = px - x, dy = py - y;
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const intervalX = dx ? size / Math.abs(dx) : Infinity;
  const intervalY = dy ? size / Math.abs(dy) : Infinity;
  let nextX = dx ? Math.abs((col + (stepX > 0 ? 1 : 0)) * size - x) / Math.abs(dx) : Infinity;
  let nextY = dy ? Math.abs((row + (stepY > 0 ? 1 : 0)) * size - y) / Math.abs(dy) : Infinity;
  // Visit each tile crossed by the sight line, including both sides of a corner.
  while (col !== targetCol || row !== targetRow) {
    const crossX = col !== targetCol ? nextX : Infinity;
    const crossY = row !== targetRow ? nextY : Infinity;
    if (Math.abs(crossX - crossY) < 1e-9) {
      if (blocksSight(col + stepX, row) || blocksSight(col, row + stepY)) return false;
      col += stepX; row += stepY; nextX += intervalX; nextY += intervalY;
    } else if (crossX < crossY) {
      col += stepX; nextX += intervalX;
    } else {
      row += stepY; nextY += intervalY;
    }
    if (blocksSight(col, row)) return false;
  }
  return true;
}

function moveGuardian(enemy, now) {
  if (now < contactLockedUntil || rectanglesOverlap(player, enemy)) return;
  const pursuit = enemy.guardianPursuit ||= { target: null, lastSeen: 0, retreatUntil: 0 };
  if (now < pursuit.retreatUntil) {
    retreatGuardian(enemy);
    return;
  }
  if (guardianCanSeePlayer(enemy, !pursuit.target)) {
    pursuit.target = { x: player.x, y: player.y, width: player.width, height: player.height };
    pursuit.lastSeen = now;
    enemy.chasing = true;
  }
  if (!pursuit.target) return;
  if (now - pursuit.lastSeen >= 5000) {
    pursuit.target = null;
    pursuit.retreatUntil = now + 1200;
    enemy.chasing = false;
    enemy.route = [];
    enemy.routeUntil = 0;
    retreatGuardian(enemy);
    return;
  }
  chaseTarget(enemy, pursuit.target, now);
}

function retreatGuardian(enemy) {
  const distance = distanceToRect(enemy);
  const step = config.areaMoveSpeed * 0.6;
  const next = [[step, 0], [-step, 0], [0, step], [0, -step]]
    .map(([dx, dy]) => ({ ...enemy, x: enemy.x + dx, y: enemy.y + dy }))
    .filter(candidate => distanceToRect(candidate) > distance && !collidesWithBlockedTile(candidate))
    .sort((a, b) => distanceToRect(b) - distanceToRect(a))[0];
  if (!next) return;
  if (next.x !== enemy.x) enemy.facing = Math.sign(next.x - enemy.x);
  enemy.x = next.x;
  enemy.y = next.y;
}

function moveEnemy(enemy) {
  const now = performance.now();
  if (pauseResidentConversation(enemy, enemy, now)) return;
  const restoredTarget = enemy.restored ? null : nearestRestoredCube(enemy, config.tileSize * 4);

  if (enemy.restored && enemy.visual === "ground") {
    const threat = nearestControlledEnemy(enemy, config.tileSize * 4);
    if (threat) {
      fleeFromEnemy(enemy, threat, now);
      return;
    }
  }

  if (restoredTarget) {
    chaseTarget(enemy, restoredTarget, now);
    return;
  }

  if (!enemy.restored && enemy.visual === "flying" && now >= contactLockedUntil) {
    const size = config.tileSize;
    const playerCol = Math.floor((player.x + player.width / 2) / size);
    const playerRow = Math.floor((player.y + player.height / 2) / size);
    const enemyCol = Math.floor((enemy.x + enemy.width / 2) / size);
    const enemyRow = Math.floor((enemy.y + enemy.height / 2) / size);
    if (Math.abs(playerCol - enemyCol) <= 1 && Math.abs(playerRow - enemyRow) <= 1) enemy.chasing = true;
    if (enemy.chasing) {
      chaseTarget(enemy, player, now);
      return;
    }
  }

  if (now < enemy.waitUntil) return;

  if (now >= enemy.movingUntil) {
    chooseEnemyDirection(enemy);
    return;
  }

  const speed = enemyMoveSpeed(enemy);
  const next = {
    ...enemy,
    x: enemy.x + enemy.moveX * speed,
    y: enemy.y + enemy.moveY * speed
  };

  if (collidesWithBlockedTile(next)) {
    enemy.movingUntil = 0;
    enemy.waitUntil = now + 350;
    return;
  }

  enemy.x = next.x;
  enemy.y = next.y;
  if (enemy.moveX) enemy.facing = Math.sign(enemy.moveX);
}

function nearestRestoredCube(enemy, range) {
  return nearestEnemyMatching(enemy, range, (candidate) => candidate.restored && !candidate.relocated && candidate.visual === "ground");
}

function nearestControlledEnemy(enemy, range) {
  return nearestEnemyMatching(enemy, range, (candidate) => !candidate.restored && candidate.kind !== "boss");
}

function nearestEnemyMatching(enemy, range, predicate) {
  let nearest = null;
  let nearestDistance = range;
  areas[currentAreaId].enemies.forEach((candidate) => {
    if (candidate === enemy || !predicate(candidate)) return;
    const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  });
  return nearest;
}

function fleeFromEnemy(enemy, threat, now) {
  if (now >= enemy.movingUntil || enemy.fleeingFrom !== threat.id) {
    const horizontal = enemy.x - threat.x;
    const vertical = enemy.y - threat.y;
    const preferred = Math.abs(horizontal) >= Math.abs(vertical)
      ? [{ x: Math.sign(horizontal) || 1, y: 0 }, { x: 0, y: Math.sign(vertical) || 1 }]
      : [{ x: 0, y: Math.sign(vertical) || 1 }, { x: Math.sign(horizontal) || 1, y: 0 }];
    const directions = [...preferred, ...preferred.map(({ x, y }) => ({ x: -x, y: -y }))];
    const direction = directions.find(({ x, y }) => !collidesWithBlockedTile({
      ...enemy,
      x: enemy.x + x * enemyMoveSpeed(enemy),
      y: enemy.y + y * enemyMoveSpeed(enemy)
    }));
    if (!direction) return;
    enemy.moveX = direction.x;
    enemy.moveY = direction.y;
    enemy.movingUntil = now + 500;
    enemy.fleeingFrom = threat.id;
  }

  moveEnemyInCurrentDirection(enemy, now, 0.9);
}

function chaseTarget(enemy, targetEntity, now) {
  const size = config.tileSize;
  const goal = {
    x: Math.floor((targetEntity.x + targetEntity.width / 2) / size),
    y: Math.floor((targetEntity.y + targetEntity.height / 2) / size)
  };
  const goalKey = `${goal.x},${goal.y}`;
  const offset = enemyTileOffset(enemy);
  const atTileCenter = Math.abs((enemy.x - offset.x) / size - Math.round((enemy.x - offset.x) / size)) < 0.001
    && Math.abs((enemy.y - offset.y) / size - Math.round((enemy.y - offset.y) / size)) < 0.001;
  if ((!enemy.route.length && now >= enemy.routeUntil)
    || (atTileCenter && now >= enemy.routeUntil && enemy.routeGoal !== goalKey)) {
    enemy.route = findEnemyRoute(enemy, goal, targetEntity);
    enemy.routeGoal = goalKey;
    enemy.routeUntil = now + 400;
  }
  const target = enemy.route[0];
  if (!target) return;
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const speed = enemyMoveSpeed(enemy);
  const next = { ...enemy };
  if (distance <= speed) {
    next.x = target.x;
    next.y = target.y;
    enemy.route.shift();
  } else {
    next.x += dx / distance * speed;
    next.y += dy / distance * speed;
  }
  if (collidesWithBlockedTile(next)) {
    if (enemy.regionBoss) enemy.route = [];
    enemy.routeUntil = enemy.regionBoss ? now + 180 : 0;
    return;
  }
  if (Math.abs(dx) > 0.1) enemy.facing = Math.sign(dx);
  enemy.x = next.x;
  enemy.y = next.y;
}

function findEnemyRoute(enemy, goal, targetEntity = player) {
  const area = areas[currentAreaId];
  const size = config.tileSize;
  const offset = enemyTileOffset(enemy);
  const start = {
    x: Math.floor((enemy.x + enemy.width / 2) / size),
    y: Math.floor((enemy.y + enemy.height / 2) / size)
  };
  const key = (tile) => `${tile.x},${tile.y}`;
  const startKey = key(start);
  const goalKey = key(goal);
  const queue = [start];
  const parents = new Map([[startKey, null]]);
  // Four-direction breadth-first search finds the shortest traversable tile route.
  for (let cursor = 0; cursor < queue.length && !parents.has(goalKey); cursor += 1) {
    const tile = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: tile.x + dx, y: tile.y + dy };
      if (parents.has(key(next)) || isBlockedTile(area.map[next.y]?.[next.x]) || (!enemy.restored && !landscapeSpawnReachable(area, next.x, next.y))) continue;
      if (enemy.regionBoss && collidesWithBlockedTile({ ...enemy, x: next.x * size + offset.x, y: next.y * size + offset.y })) continue;
      parents.set(key(next), tile);
      queue.push(next);
    }
  }
  if (!parents.has(goalKey)) return [];
  const route = [];
  for (let tile = goal; tile; tile = parents.get(key(tile))) {
    route.unshift({ x: tile.x * size + offset.x, y: tile.y * size + offset.y });
  }
  // Center within the starting tile before turning through narrow passages.
  if (route.length === 1) return [{ x: targetEntity.x + (targetEntity.width - enemy.width) / 2,
    y: targetEntity.y + (targetEntity.height - enemy.height) / 2 }];
  return route;
}

function enemyMoveSpeed(enemy) {
  if (enemy.regionBoss) return config.areaMoveSpeed * config.sprintMultiplier * 1.2;
  return enemy.visual === "flying" ? 1 : 0.8;
}

function enemyTileOffset(enemy) {
  return enemy.regionBoss ? { x: (config.tileSize - enemy.width) / 2, y: (config.tileSize - enemy.height) / 2 }
    : { x: 7, y: 5 };
}

function moveEnemyInCurrentDirection(enemy, now, speed = enemyMoveSpeed(enemy)) {
  const next = {
    ...enemy,
    x: enemy.x + enemy.moveX * speed,
    y: enemy.y + enemy.moveY * speed
  };
  if (collidesWithBlockedTile(next)) {
    enemy.movingUntil = 0;
    enemy.waitUntil = now + 200;
    return;
  }
  enemy.x = next.x;
  enemy.y = next.y;
  if (enemy.moveX) enemy.facing = Math.sign(enemy.moveX);
}

function chooseEnemyDirection(enemy) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 0, y: 0 }
  ];
  const direction = directions[Math.floor(Math.random() * directions.length)];
  enemy.moveX = direction.x;
  enemy.moveY = direction.y;
  enemy.movingUntil = performance.now() + 700 + Math.random() * 900;
  enemy.waitUntil = direction.x || direction.y ? 0 : performance.now() + 600;
}

function collidesWithBlockedTile(rect) {
  const area = areas[currentAreaId];
  if (rect.id && !rect.restored && !landscapeSpawnReachable(area,
    Math.floor((rect.x + rect.width / 2) / config.tileSize),
    Math.floor((rect.y + rect.height / 2) / config.tileSize))) return true;
  if (area.world && !rect.id) return worldRectBlocked({ ...rect,
    x: rect.x + area.world.x * config.tileSize, y: rect.y + area.world.y * config.tileSize });
  if (rect.id && tileIsEmbeddedVillage(area,
    Math.floor((rect.x + rect.width / 2) / config.tileSize),
    Math.floor((rect.y + rect.height / 2) / config.tileSize))) return true;
  const left = Math.floor(rect.x / config.tileSize);
  const right = Math.floor((rect.x + rect.width - 1) / config.tileSize);
  const top = Math.floor(rect.y / config.tileSize);
  const bottom = Math.floor((rect.y + rect.height - 1) / config.tileSize);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (isBlockedTile(area.map[y]?.[x])) return true;
    }
  }

  return false;
}

function isBlockedTile(tile) {
  tile = resolveLandscapeTile(tile);
  return !tile || tile === "^" || tile === "T" || tile === "W" || tile === "X" || tile === "Y" || tile === "H" || tile === "K" || tile === "V" || tile === "h" || tile === "L" || tile === "F" || tile === "b" || tile === "t" || (tile === "B" && !castleState.exitCleared);
}

function updateCamera() {
  const area = areas[currentAreaId];
  if (area.world) {
    overworld.cameraX = clamp(player.x + area.world.x * config.tileSize - canvas.width / 2, 0, overworld.width * config.tileSize - canvas.width);
    overworld.cameraY = clamp(player.y + area.world.y * config.tileSize - canvas.height / 2, 0, overworld.height * config.tileSize - canvas.height);
    area.cameraX = overworld.cameraX - area.world.x * config.tileSize;
    area.cameraY = overworld.cameraY - area.world.y * config.tileSize;
    return;
  }
  area.cameraX = area.width * config.tileSize < canvas.width
    ? (area.width * config.tileSize - canvas.width) / 2
    : clamp(player.x - canvas.width / 2, 0, area.width * config.tileSize - canvas.width);
  area.cameraY = area.height * config.tileSize < canvas.height
    ? (area.height * config.tileSize - canvas.height) / 2
    : clamp(player.y - canvas.height / 2, 0, area.height * config.tileSize - canvas.height);
}

function updateInteractionPrompt() {
  if (currentScreen !== "game") return;
  if (performance.now() < dialogueUntil) return;
  if (promptMode === "boss-dialogue") return;
  activeNode = null;
  activeSign = null;
  activeHouse = null;
  activeCastleFeature = null;
  promptMode = "";

  const portal = nearbyWorldPortal();
  if (portal) {
    promptMode = "world-portal";
    setPrompt(`Press Z to enter ${portal.label}`);
    return;
  }

  if (gameMode === "area") {
    const castleFeature = nearbyCastleFeature();
    if (castleFeature) {
      activeCastleFeature = castleFeature;
      promptMode = `castle-${castleFeature}`;
      const prompts = {
        throne: castleState.sitting ? "Press Z to stand up" : playerState.hasStaff ? "Press Z to sit on the throne" : "Press Z to reclaim your staff",
        rocks: playerState.hasStaff ? "Press Z to shatter the fallen rocks" : "You need your staff to clear these rocks",
        cloaks: "Press Z to inspect the old cloaks",
        dagger: "Press Z to inspect the dusty dagger"
      };
      setPrompt(prompts[castleFeature]);
      return;
    }

    const stairs = areas[currentAreaId].stairs;
    if (stairs && Math.abs(player.x + player.width / 2 - (stairs.x + 0.5) * config.tileSize) < config.tileSize
      && Math.abs(player.y + player.height / 2 - (stairs.y + 0.5) * config.tileSize) < config.tileSize) {
      promptMode = "palace-stairs";
      setPrompt(currentAreaId === "palaceUpper" ? "Press Z to go downstairs" : "Press Z to climb to Kyle's chamber");
      return;
    }

    const boss = areas[currentAreaId].enemies.find((enemy) => enemy.kind === "boss" && !enemy.regionBoss && !bossDefeated(enemy) && rectanglesOverlap(player, enemy));
    if (boss) {
      activeEnemy = boss;
      promptMode = "challenge-boss";
      setPrompt(`Press Z to confront ${boss.name}`);
      return;
    }

    const resident = nearestVillageResident();
    if (resident) {
      activeEnemy = resident;
      promptMode = "talk";
      setPrompt("Press Z to talk");
      return;
    }

    const house = nearbyVillageHouseDoor();
    if (house) {
      activeHouse = house;
      promptMode = "inspect-house";
      setPrompt(`Press Z to enter ${house.label}`);
      return;
    }

    const sign = nearbySign();
    if (sign) {
      activeSign = sign;
      promptMode = "read-sign";
      setPrompt("Press Z to read the sign");
      return;
    }

    if (isPlayerOnExit()) {
      promptMode = "leave-area";
      setPrompt("Press Z to go outside");
      return;
    }
  }

  setPrompt("");
}

function usePrompt() {
  if (currentScreen !== "game") return;
  if (promptMode === "world-portal") return enterWorldPortal();
  if (promptMode === "leave-area") return leaveArea();
  if (promptMode === "talk") return talkToNpc();
  if (promptMode === "inspect-house") return inspectHouse();
  if (promptMode === "read-sign") return readSign();
  if (promptMode === "challenge-boss") return beginBossDialogue();
  if (promptMode === "boss-dialogue") return advanceBossDialogue();
  if (promptMode === "palace-stairs") return usePalaceStairs();
  if (promptMode.startsWith("castle-")) interactWithCastle(activeCastleFeature);
}

function setPrompt(text) {
  const prompt = document.querySelector("#interaction-prompt");
  prompt.textContent = text;
  prompt.classList.toggle("hidden", !text);
}

function nearestEnemy(restoredOnly = false) {
  const area = areas[currentAreaId];
  return area.enemies.reduce((nearest, enemy) => {
    if (restoredOnly && !enemy.restored) return nearest;
    const distance = distanceToRect(enemy);
    return distance < 96 && (!nearest || distance < distanceToRect(nearest)) ? enemy : nearest;
  }, null);
}

function villageSourceFor(areaId) {
  return regionDirectory.nodes.find((node) => node.areaId === areaId)?.residentsFrom || null;
}

function villageAreaForSource(sourceId) {
  return regionDirectory.nodes.find((node) => node.kind === "village" && node.residentsFrom === sourceId)?.areaId || null;
}

function villageResidents(areaId = currentAreaId) {
  const sourceId = villageSourceFor(areaId);
  if (!sourceId) return [];
  return areas[sourceId].enemies.filter((enemy) => enemy.restored && enemy.relocated && enemy.kind !== "boss" && !enemy.permanentResident);
}

function residentPosition(index, villageAreaId = currentAreaId) {
  const home = areas[villageAreaId]?.homeSlots?.[index];
  if (home) {
    return {
      x: home.x * config.tileSize + 7,
      y: home.y * config.tileSize + 5
    };
  }

  return {
    x: (5 + index % 8 * 3) * config.tileSize + 7,
    y: (7 + Math.floor(index / 8) * 3) * config.tileSize + 5
  };
}

function initializeVillageResident(resident) {
  if (Number.isFinite(resident.villageX)) return;
  const source = areas[resident.originArea]?.enemies || [];
  const usedSlots = new Set(source.filter((enemy) => Number.isInteger(enemy.villageSlot)).map((enemy) => enemy.villageSlot));
  let slot = 0;
  while (usedSlots.has(slot)) slot += 1;
  const villageAreaId = villageAreaForSource(resident.originArea);
  const position = residentPosition(slot, villageAreaId);
  resident.villageSlot = slot;
  resident.homeAreaId = villageAreaId;
  resident.villageX = position.x;
  resident.villageY = position.y;
  resident.villageMoveX = 0;
  resident.villageMoveY = 0;
  resident.villageMovingUntil = 0;
  resident.villageWaitUntil = 0;
}

function positionedResident(resident) {
  initializeVillageResident(resident);
  return { ...resident, x: resident.villageX, y: resident.villageY };
}

function nearestVillageResident() {
  const residents = villageResidents();
  let nearest = null;
  residents.forEach((resident) => {
    const positioned = positionedResident(resident);
    if (distanceToRect(positioned) < 78 && (!nearest || distanceToRect(positioned) < distanceToRect(nearest.positioned))) {
      nearest = { resident, positioned };
    }
  });
  areas[currentAreaId].enemies.forEach((resident) => {
    if (!resident.restored || resident.relocated || resident.kind === "boss") return;
    if (distanceToRect(resident) < 78 && (!nearest || distanceToRect(resident) < distanceToRect(nearest.positioned))) {
      nearest = { resident, positioned: resident };
    }
  });
  return nearest?.resident || null;
}

function pauseResidentConversation(resident, positioned, now) {
  if (resident !== talkingResident || now >= dialogueUntil) return false;
  const dx = player.x + player.width / 2 - (positioned.x + positioned.width / 2);
  const dy = player.y + player.height / 2 - (positioned.y + positioned.height / 2);
  const distance = Math.hypot(dx, dy) || 1;
  resident.gazeX = dx / distance * 3;
  resident.gazeY = dy / distance * 3;
  if (dx) resident.facing = Math.sign(dx);
  return true;
}

function nearbyVillageHouseDoor() {
  const area = areas[currentAreaId];
  if (!area.homeSlots) return null;
  const playerCol = Math.floor((player.x + player.width / 2) / config.tileSize);
  const playerRow = Math.floor((player.y + player.height / 2) / config.tileSize);
  return area.homeSlots.find((home) => Math.abs(home.x - playerCol) <= 0 && Math.abs(home.y - playerRow) <= 0) || null;
}

function nearbySign() {
  const area = areas[currentAreaId];
  const signs = area.signs || area.landmarkSigns;
  if (!signs) return null;
  const playerCol = Math.floor((player.x + player.width / 2) / config.tileSize);
  const playerRow = Math.floor((player.y + player.height / 2) / config.tileSize);
  return Object.entries(signs).find(([position]) => {
    const [x, y] = position.split(",").map(Number);
    return Math.abs(x - playerCol) <= 1 && Math.abs(y - playerRow) <= 1;
  }) || null;
}

function nearbyCastleFeature() {
  if (currentAreaId !== "pristineCastle") return null;
  const playerCol = Math.floor((player.x + player.width / 2) / config.tileSize);
  const playerRow = Math.floor((player.y + player.height / 2) / config.tileSize);
  const near = (x, y, radius = 1) => Math.abs(x - playerCol) <= radius && Math.abs(y - playerRow) <= radius;

  const throne = areas.pristineCastle.throne;
  const throneLeft = throne.x * config.tileSize;
  const throneRight = (throne.x + throne.width) * config.tileSize;
  const throneFront = (throne.y + throne.height) * config.tileSize;
  const atThroneFront = player.x + player.width > throneLeft && player.x < throneRight
    && player.y >= throneFront && player.y - throneFront <= config.tileSize * 0.75;
  if (castleState.sitting || atThroneFront) return "throne";
  if (!castleState.exitCleared && ([11, 12, 13].some((x) => near(x, 13)))) return "rocks";
  if ([[19, 2], [20, 2], [21, 2]].some(([x, y]) => near(x, y))) return "cloaks";
  if (playerCol === 17 && playerRow === 6) return "dagger";
  return null;
}

function interactWithCastle(feature) {
  if (feature === "throne") {
    if (!playerState.hasStaff) {
      playerState.hasStaff = true;
      updateBattleActions();
      showTemporaryPrompt("You reclaim the Pristine Staff. Its light still answers you.");
      return;
    }
    if (castleState.sitting) standFromThrone();
    else sitOnThrone();
    return;
  }

  if (feature === "rocks") {
    if (!playerState.hasStaff) {
      showTemporaryPrompt("The rocks will not move. You need your staff.");
      return;
    }
    castleState.exitCleared = true;
    showTemporaryPrompt("The staff flashes. The fallen rocks break apart!");
    return;
  }

  if (feature === "cloaks") showTemporaryPrompt("they dont seem to fit you.");
  if (feature === "dagger" && currentScreen === "game" && gameMode === "area"
    && currentAreaId === "pristineCastle" && nearbyCastleFeature() === "dagger") {
    daggerTestMode.inspections = Math.min(3, daggerTestMode.inspections + 1);
    showTemporaryPrompt("its covered in dust.");
  }
}

function sitOnThrone() {
  castleState.standX = player.x;
  castleState.standY = player.y;
  castleState.sitting = true;
  castleState.sittingStartedAt = performance.now();
  const throne = areas.pristineCastle.throne;
  player.x = (throne.x + throne.width / 2) * config.tileSize - player.width / 2;
  player.y = throne.y * config.tileSize + 112 - player.height - 6;
  player.facing = 1;
  player.view = "front";
  showTemporaryPrompt("The throne remembers its King.", 1800);
}

function standFromThrone() {
  if (!castleState.sitting) return;
  castleState.sitting = false;
  player.x = castleState.standX;
  player.y = castleState.standY;
}

function showTemporaryPrompt(message, duration = 3000) {
  window.clearTimeout(dialogueTimer);
  temporaryMessageActive = true;
  dialogueUntil = performance.now() + duration;
  setPrompt(message);
  dialogueTimer = window.setTimeout(clearTemporaryMessage, duration);
}

function clearTemporaryMessage() {
  window.clearTimeout(dialogueTimer);
  dialogueTimer = null;
  temporaryMessageActive = false;
  dialogueUntil = 0;
  talkingResident = null;
  updateInteractionPrompt();
}

function dismissDialogue() {
  if (promptMode === "boss-dialogue") {
    advanceBossDialogue();
    return true;
  }
  if (!temporaryMessageActive) return false;
  clearTemporaryMessage();
  return true;
}

function readSign() {
  if (!activeSign) return;
  showTemporaryPrompt(activeSign[1], 5000);
}

function inspectHouse() {
  if (!activeHouse) return;
  enterWorldPortal();
}

function hasRestoredVeteran() {
  return Object.values(areas).some((area) => area.enemies.some((enemy) => enemy.kind !== "boss" && enemy.restored && enemy.level >= 25));
}

function beginBossDialogue() {
  bossDialogue = hasRestoredVeteran()
    ? ["Ah king... your here at last.", "Your probably wondering who i am aren't you?", "well... its ???.", "But you can call me Kyle!"]
    : ["OH? who are you?", "no matter, ill just kill you anyways."];
  bossDialogueIndex = 0;
  promptMode = "boss-dialogue";
  setPrompt(`${bossDialogue[0]}  Press Z`);
}

function advanceBossDialogue() {
  bossDialogueIndex += 1;
  if (bossDialogueIndex < bossDialogue.length) {
    setPrompt(`${bossDialogue[bossDialogueIndex]}  Press Z`);
    return;
  }
  setPrompt("");
  startBattle(activeEnemy);
}

function distanceToRect(rect) {
  return Math.hypot(
    player.x + player.width / 2 - (rect.x + rect.width / 2),
    player.y + player.height / 2 - (rect.y + rect.height / 2)
  );
}

function distanceToPoint(x, y) {
  return Math.hypot(player.x + player.width / 2 - x, player.y + player.height / 2 - y);
}

function isPlayerOnExit() {
  if (currentAreaId === "pristineCastle" && !castleState.exitCleared) return false;
  return tileAt(player.x + player.width / 2, player.y + player.height / 2) === "E";
}

function tileAt(worldX, worldY) {
  const area = areas[currentAreaId];
  const tileX = Math.floor(worldX / config.tileSize);
  const tileY = Math.floor(worldY / config.tileSize);
  return area.map[tileY]?.[tileX] || "";
}

function checkAreaEncounters() {
  if (currentScreen !== "game" || gameMode !== "area" || performance.now() < contactLockedUntil) return;
  const overlaps = candidate => !bossDefeated(candidate) && rectanglesOverlap(player, candidate);
  const enemies = areas[currentAreaId].enemies;
  const enemy = enemies.find(candidate => candidate.regionBoss && overlaps(candidate))
    || enemies.find(candidate => candidate.kind !== "boss" && overlaps(candidate));
  if (enemy) startBattle(enemy);
}

function updateVillageLocks() {
  regionDirectory.nodes.forEach((node) => {
    if (node.kind !== "village") return;
    node.unlocked = true;
  });
}

function updatePlainsRestoration() {
  const plains = areas.controlledPlains;
  plains.name = plains.healed ? "The Ancient Plains" : "Controlled Plains";
  regionDirectory.nodes.find((node) => node.areaId === "controlledPlains").name = plains.name;
}

function talkToNpc() {
  if (currentScreen === "game" && promptMode === "talk") {
    if (!activeEnemy?.restored) return;
    talkingResident = activeEnemy;
    const positioned = activeEnemy.relocated ? positionedResident(activeEnemy) : activeEnemy;
    let message;
    if (activeEnemy?.visual === "flying") {
      message = activeEnemy.talked
        ? "hey... you look kind of familiar. I don't know. probably just my head."
        : "Huff... what happened?";
      activeEnemy.talked = true;
    } else {
      message = "What happened? Hello? Who are you? Well... either way, thanks for saving me.";
    }
    // Luciano's exercise: add the Azure village dialogue override here.
    if (currentAreaId === "azureVillage") {
      message = activeEnemy.visual === "flying"
        ? "Hey... there is a HUGE purple blob thing on Azure Mountain... Are you able to check it out?"
        : "ugh, I keep hearing a roaring sound and a loud banging coming from the mountain.";
    }
    
    showTemporaryPrompt(message, 4500);
    pauseResidentConversation(activeEnemy, positioned, performance.now());
  }
}
