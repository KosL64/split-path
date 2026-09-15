const screens = {
  title: document.querySelector("#title-screen"),
  story: document.querySelector("#story-screen"),
  game: document.querySelector("#game-screen"),
  battle: document.querySelector("#battle-screen"),
  lose: document.querySelector("#lose-screen"),
  upgrades: document.querySelector("#upgrade-screen")
};

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const config = {
  tileSize: 48,
  mapMoveSpeed: 3,
  areaMoveSpeed: 3.4,
  sprintMultiplier: 1.55,
  criticalChance: 0.25,
  restoreReward: 5,
  upgradeCost: 5,
  branchUpgradeCost: 10,
  enemyAttack: 4,
  healAmount: 5,
  contactCooldown: 900
};

const upgradeDefinitions = {
  damage: { cost: 5, requires: null, path: "damage", tier: 1 },
  defense: { cost: 5, requires: null, path: "defense", tier: 1 },
  health: { cost: 5, requires: null, path: "health", tier: 1 },
  lifeSteal: { cost: 10, requires: "health", path: "health", tier: 2, conflictsWith: "greaterHealth" },
  greaterHealth: { cost: 10, requires: "health", path: "health", tier: 2, conflictsWith: "lifeSteal" },
  greaterDamage: { cost: 10, requires: "damage", path: "damage", tier: 2, conflictsWith: "magic" },
  magic: { cost: 10, requires: "damage", path: "damage", tier: 2, conflictsWith: "greaterDamage" },
  greaterDefense: { cost: 10, requires: "defense", path: "defense", tier: 2, conflictsWith: "thorns" },
  thorns: { cost: 10, requires: "defense", path: "defense", tier: 2, conflictsWith: "greaterDefense" }
};

const areaEnemyGoals = {
  sylvan: 20,
  azureApex: 31,
  controlledPlains: 55
};

const areaLevelRanges = {
  sylvan: { min: 1, max: 20 },
  azureApex: { min: 21, max: 50 },
  controlledPlains: { min: 50, max: 100 }
};

const playerState = {
  divinePoints: 0,
  health: 20,
  maxHealth: 20,
  restorePower: 5,
  defense: 3,
  healAmount: 5,
  lifeSteal: 0,
  thorns: false,
  strongDefend: false,
  magic: false,
  upgrades: {
    damage: 0,
    defense: 0,
    health: 0,
    lifeSteal: 0,
    greaterHealth: 0,
    greaterDamage: 0,
    magic: 0,
    greaterDefense: 0,
    thorns: 0
  }
};

const player = {
  x: 140,
  y: 240,
  width: 44,
  height: 62,
  facing: 1,
  view: "front"
};

const keys = new Set();
let currentScreen = "title";
let gameMode = "kingdom";
let currentAreaId = "sylvan";
let storyIndex = 0;
let lastTime = 0;
let animationFrameId = null;
let battleDefending = false;
let battleBusy = false;
let battleTimer = null;
let contactLockedUntil = 0;
let dialogueUntil = 0;
let promptMode = "";
let activeEnemy = null;
let activeNode = null;

const storySlides = [
  { title: "The King", text: "Long ago, the Pristine King watched over the cubes and souls of the land.", image: "img/split-path-lore.png" },
  { title: "The Takeover", text: "A mysterious figure appeared. One by one, cubes across the kingdom fell under its control.", image: "img/split-path-1.jpg" },
  { title: "Reborn", text: "The king's power was taken, and he awakened again in a new form.", image: "img/split-path-1.jpg" },
  { title: "Divine Points", text: "By restoring controlled creatures, the king earns Divine Points: chips of light created through good deeds.", image: "notes/NOT DWIN POINTS!!!.png" },
  { title: "The Split Path", text: "Every point brings him closer to his former power, but the path back can split in many directions.", image: "img/split-path-2.jpg" }
];

const kingdomMap = {
  width: 1680,
  height: 1080,
  cameraX: 0,
  cameraY: 0,
  paths: [
    [[180, 520], [430, 520], [620, 390], [860, 390]],
    [[430, 520], [520, 720], [760, 770], [1010, 690]],
    [[860, 390], [1100, 370], [1280, 500], [1430, 500]],
    [[1010, 690], [1190, 820], [1440, 760]]
  ],
  nodes: [
    { id: "sylvan", name: "Sylvan", x: 180, y: 520, areaId: "sylvan", unlocked: true, kind: "area" },
    { id: "azureApex", name: "Azure Apex", x: 620, y: 390, areaId: "azureApex", unlocked: true, kind: "area" },
    { id: "sylvanVillage", name: "Sylvan Village", x: 1010, y: 690, areaId: "sylvanVillage", unlocked: false, kind: "village", unlocksAfter: "sylvan" },
    { id: "controlledPalace", name: "Controlled Palace", x: 1430, y: 500, areaId: "controlledPalace", unlocked: true, kind: "area" },
    { id: "controlledPlains", name: "Controlled Plains", x: 1440, y: 760, areaId: "controlledPlains", unlocked: true, kind: "area" }
  ]
};

const areas = {
  sylvan: {
    name: "Sylvan",
    width: 36,
    height: 26,
    start: { x: 4, y: 12 },
    cameraX: 0,
    cameraY: 0,
    healed: false,
    enemies: [],
    map: [
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
      "^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT^",
      "^T......g.....g..............TTTTT.^",
      "^T..RRRRRR......RRRRR............T.^",
      "^T..R...R...........R......gg....T.^",
      "^T..R...R...TTT.....R............T.^",
      "^T..........TPT..................T.^",
      "^T....gg....TTT......RRRR........T.^",
      "^T...................R..R........T.^",
      "^T.....TTT...........R..R...gg...T.^",
      "^T.....T.T.......................T.^",
      "^T...............................T.^",
      "^T...S............C..............T.^",
      "^T...............................T.^",
      "^T...........gg...........RRR....T.^",
      "^T.......................R...R...T.^",
      "^T....RRRR...............R...R...T.^",
      "^T....R..R.......................T.^",
      "^T..........................gg...T.^",
      "^T...........TTT.................T.^",
      "^T....gg.....T.T......RRRR.......T.^",
      "^T............E.......R..R.......T.^",
      "^T....................RRRR.......T.^",
      "^T................................^",
      "^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT^",
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
    ]
  },
  azureApex: makePreviewArea("Azure Apex", true),
  sylvanVillage: makePreviewArea("Sylvan Village", false),
  controlledPalace: makePreviewArea("Controlled Palace", false),
  controlledPlains: makePreviewArea("Controlled Plains", true)
};

function makePreviewArea(name, hasEnemies) {
  return {
    name,
    width: 30,
    height: 20,
    start: { x: 4, y: 10 },
    cameraX: 0,
    cameraY: 0,
    healed: false,
    enemies: [],
    hasEnemies,
    map: [
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
      "^TTTTTTTTTTTTTTTTTTTTTTTTTTTT^",
      "^T..........................T^",
      "^T......RRRRRRRRRR..........T^",
      "^T......R......R.R..........T^",
      "^T......R..P...R.R..........T^",
      "^T......RRRRRRRRRR..........T^",
      "^T..........................T^",
      "^T..........gggg............T^",
      "^T..........................T^",
      "^T...S......................T^",
      "^T..........................T^",
      "^T...........RRRRR..........T^",
      "^T...........R...R..........T^",
      "^T...........RRRRR..........T^",
      "^T..........................T^",
      "^T....................E.....T^",
      "^T..........................T^",
      "^TTTTTTTTTTTTTTTTTTTTTTTTTTTT^",
      "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
    ]
  };
}

initializeAreaEnemies();

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

  return orderedPositions.slice(0, count).map((position, index) => {
    const level = levelForEnemy(index, count, levelRange);
    const stats = statsForLevel(level);

    return {
      id: `${seedText}-cube-${index + 1}`,
      level,
      attack: stats.attack,
      defense: stats.defense,
      maxHealth: stats.health,
      x: position.x * config.tileSize + 7,
      y: position.y * config.tileSize + 5,
      width: 34,
      height: 38,
      restored: false,
      controlMax: stats.health,
      control: stats.health,
      moveX: 0,
      moveY: 0,
      movingUntil: 0,
      waitUntil: 0
    };
  });
}

function levelForEnemy(index, totalEnemies, range) {
  if (totalEnemies <= 1) return range.min;
  const progress = index / (totalEnemies - 1);
  return Math.round(range.min + (range.max - range.min) * progress);
}

function statsForLevel(level) {
  return {
    attack: minimumStat(Math.round((level - 2) + 5)),
    defense: minimumStat(Math.round((level / 5) + 3)),
    health: minimumStat(Math.round((level * 3) + 20))
  };
}

function minimumStat(value) {
  return Math.max(1, value);
}

function collectEnemySpawnTiles(area) {
  const preferred = [];
  const fallback = [];

  area.map.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      const distanceFromStart = Math.hypot(x - area.start.x, y - area.start.y);
      if (distanceFromStart < 4 || tile === "E" || isBlockedTile(tile)) return;
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

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  currentScreen = name;
}

function startGame() {
  enterKingdom();
  showScreen("game");
  if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
}

function renderStory() {
  const slide = storySlides[storyIndex];
  document.querySelector("#story-slide").innerHTML = `
    <div class="story-visual" style="background-image:url('${slide.image.replace("'", "%27")}')"></div>
    <div class="story-copy">
      <p class="eyebrow">Story ${storyIndex + 1} / ${storySlides.length}</p>
      <h2>${slide.title}</h2>
      <p>${slide.text}</p>
    </div>
  `;

  const progress = document.querySelector("#story-progress");
  progress.innerHTML = "";
  storySlides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = `story-dot${index === storyIndex ? " active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to story slide ${index + 1}`);
    dot.addEventListener("click", () => {
      storyIndex = index;
      renderStory();
    });
    progress.append(dot);
  });

  document.querySelector("#story-prev").disabled = storyIndex === 0;
  document.querySelector("#story-next").textContent = storyIndex === storySlides.length - 1 ? "Begin Journey" : "Next";
}

function nextStory() {
  if (storyIndex >= storySlides.length - 1) startGame();
  else {
    storyIndex += 1;
    renderStory();
  }
}

function updateHud() {
  const locationName = gameMode === "kingdom" ? "Kingdom Map" : areas[currentAreaId].name;
  document.querySelector("#divine-points").textContent = `DP: ${playerState.divinePoints}`;
  document.querySelector("#player-stats").textContent = `${locationName} | Power ${playerState.restorePower} | Guard ${playerState.defense} | Health ${playerState.health}/${playerState.maxHealth}`;
  document.querySelector("#upgrade-points").textContent = `DP: ${playerState.divinePoints}`;
}

function enterKingdom() {
  gameMode = "kingdom";
  const node = kingdomMap.nodes.find((mapNode) => mapNode.areaId === currentAreaId) || kingdomMap.nodes[0];
  player.x = node.x - player.width / 2;
  player.y = node.y - player.height / 2;
  updateHud();
}

function enterArea(areaId) {
  const area = areas[areaId];
  gameMode = "area";
  currentAreaId = areaId;
  player.x = area.start.x * config.tileSize + 6;
  player.y = area.start.y * config.tileSize + 2;
  contactLockedUntil = performance.now() + config.contactCooldown;
  updateHud();
}

function leaveArea() {
  enterKingdom();
  setPrompt("");
}

function movePlayer() {
  let horizontal = 0;
  let vertical = 0;

  if (keys.has("arrowleft") || keys.has("a")) horizontal -= 1;
  if (keys.has("arrowright") || keys.has("d")) horizontal += 1;
  if (keys.has("arrowup") || keys.has("w")) vertical -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vertical += 1;

  if (horizontal && vertical) {
    horizontal *= 0.707;
    vertical *= 0.707;
  }

  if (horizontal) player.facing = horizontal > 0 ? 1 : -1;
  if (vertical < 0) player.view = "back";
  else if (horizontal || vertical > 0) player.view = "front";

  const baseSpeed = gameMode === "kingdom" ? config.mapMoveSpeed : config.areaMoveSpeed;
  const speed = isSprinting() ? baseSpeed * config.sprintMultiplier : baseSpeed;
  attemptMove(horizontal * speed, vertical * speed);
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

  if (gameMode === "kingdom") {
    player.x = clamp(next.x, 0, kingdomMap.width - player.width);
    player.y = clamp(next.y, 0, kingdomMap.height - player.height);
    return;
  }

  if (!collidesWithBlockedTile(next)) {
    player.x = next.x;
    player.y = next.y;
  }
}

function moveEnemies() {
  if (gameMode !== "area") return;
  const area = areas[currentAreaId];

  area.enemies.forEach((enemy) => {
    if (enemy.restored) return;
    moveEnemy(enemy);
  });
}

function moveEnemy(enemy) {
  const now = performance.now();

  if (now < enemy.waitUntil) return;

  if (now >= enemy.movingUntil) {
    chooseEnemyDirection(enemy);
    return;
  }

  const speed = 0.8;
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
  return !tile || tile === "^" || tile === "T" || tile === "W";
}

function updateCamera() {
  if (gameMode === "kingdom") {
    kingdomMap.cameraX = clamp(player.x - canvas.width / 2, 0, kingdomMap.width - canvas.width);
    kingdomMap.cameraY = clamp(player.y - canvas.height / 2, 0, kingdomMap.height - canvas.height);
    return;
  }

  const area = areas[currentAreaId];
  area.cameraX = clamp(player.x - canvas.width / 2, 0, area.width * config.tileSize - canvas.width);
  area.cameraY = clamp(player.y - canvas.height / 2, 0, area.height * config.tileSize - canvas.height);
}

function updateInteractionPrompt() {
  if (performance.now() < dialogueUntil) return;
  activeNode = null;
  promptMode = "";

  if (gameMode === "kingdom") {
    const node = kingdomMap.nodes.find((mapNode) => distanceToPoint(mapNode.x, mapNode.y) < 56);
    if (node) {
      activeNode = node;
      promptMode = node.unlocked ? "enter-area" : "";
      setPrompt(node.unlocked ? `Press Z to enter ${node.name}` : `${node.name} is still sealed`);
      return;
    }
  }

  if (gameMode === "area") {
    const enemy = nearestEnemy();
    if (enemy && enemy.restored && distanceToRect(enemy) < 78) {
      activeEnemy = enemy;
      promptMode = "talk";
      setPrompt("Press Z to talk");
      return;
    }

    if (isPlayerOnExit()) {
      promptMode = "leave-area";
      setPrompt("Press Z to return to the Kingdom Map");
      return;
    }
  }

  setPrompt("");
}

function usePrompt() {
  if (currentScreen !== "game") return;
  if (promptMode === "enter-area" && activeNode?.unlocked) enterArea(activeNode.areaId);
  if (promptMode === "leave-area") leaveArea();
  if (promptMode === "talk") talkToNpc();
}

function setPrompt(text) {
  const prompt = document.querySelector("#interaction-prompt");
  prompt.textContent = text;
  prompt.classList.toggle("hidden", !text);
}

function nearestEnemy() {
  const area = areas[currentAreaId];
  return area.enemies.find((enemy) => distanceToRect(enemy) < 96) || null;
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
  return tileAt(player.x + player.width / 2, player.y + player.height / 2) === "E";
}

function tileAt(worldX, worldY) {
  const area = areas[currentAreaId];
  const tileX = Math.floor(worldX / config.tileSize);
  const tileY = Math.floor(worldY / config.tileSize);
  return area.map[tileY]?.[tileX] || "";
}

function checkAreaEncounters() {
  if (gameMode !== "area" || performance.now() < contactLockedUntil) return;
  const enemy = nearestEnemy();
  if (enemy && !enemy.restored && rectanglesOverlap(player, enemy)) startBattle(enemy);
}

function startBattle(enemy) {
  if (enemy.restored || battleBusy) return;
  activeEnemy = enemy;
  battleBusy = false;
  battleDefending = false;
  enemy.control = enemy.controlMax;
  document.querySelector("#battle-enemy").classList.remove("restored");
  document.querySelector("#battle-message").textContent = `A level ${enemy.level} controlled cube lashes out. Purify it with your attacks.`;
  updateBattleActions();
  showScreen("battle");
  updateBattleStats();
}

function updateBattleStats() {
  document.querySelector("#player-health-meter").max = playerState.maxHealth;
  document.querySelector("#player-health-meter").value = playerState.health;
  document.querySelector("#player-health").textContent = `${playerState.health} / ${playerState.maxHealth}`;
  document.querySelector("#enemy-control-meter").max = activeEnemy?.controlMax || 12;
  document.querySelector("#enemy-control-meter").value = activeEnemy?.control || 0;
  document.querySelector("#enemy-control").textContent = activeEnemy
    ? `${activeEnemy.control} / ${activeEnemy.controlMax} | Lv ${activeEnemy.level} | Atk ${activeEnemy.attack} | Def ${activeEnemy.defense}`
    : "0";
}

function setBattleButtons(disabled) {
  battleBusy = disabled;
  document.querySelectorAll(".battle-actions button").forEach((button) => {
    button.disabled = disabled;
  });
}

function updateBattleActions() {
  document.querySelector("#attack-action").textContent = playerState.magic ? "Magic" : "Attack";
  document.querySelector("#light-spell-action").classList.toggle("hidden", !playerState.magic);
  document.querySelector("#soul-spell-action").classList.toggle("hidden", !playerState.magic);
}

function playBattleEffect(name) {
  const stage = document.querySelector(".battle-stage");
  stage.classList.remove("attack-effect", "defend-effect", "heal-effect");
  void stage.offsetWidth;
  stage.classList.add(name);
}

function enemyTurn() {
  const critical = rollCriticalHit();
  const baseDamage = Math.max(1, activeEnemy.attack - playerState.defense - (battleDefending ? 2 : 0));
  const guardedCritical = critical && !(battleDefending && playerState.strongDefend);
  const damage = guardedCritical ? baseDamage * 2 : baseDamage;
  const thornsDamage = playerState.thorns ? Math.max(1, Math.round(activeEnemy.attack / 4)) : 0;
  battleDefending = false;
  playerState.health = Math.max(0, playerState.health - damage);
  if (thornsDamage && activeEnemy) {
    activeEnemy.control = Math.max(0, activeEnemy.control - thornsDamage);
  }
  updateBattleStats();

  if (activeEnemy?.control === 0) {
    document.querySelector("#battle-message").textContent += ` Thorns reflect ${thornsDamage} control damage.`;
    finishRestoration();
    return;
  }

  if (playerState.health === 0) {
    showLoseScreen();
    return;
  }

  const criticalText = critical && playerState.strongDefend && damage === baseDamage
    ? " Your stronger guard cancels the critical hit."
    : "";
  const thornsText = thornsDamage ? ` Thorns reflect ${thornsDamage} control damage.` : "";
  document.querySelector("#battle-message").textContent += guardedCritical
    ? ` Critical hit! The cube strikes back for ${damage} damage.`
    : ` The cube strikes back for ${damage} damage.`;
  document.querySelector("#battle-message").textContent += criticalText + thornsText;
  setBattleButtons(false);
}

function queueEnemyTurn() {
  battleTimer = window.setTimeout(enemyTurn, 650);
}

function rollCriticalHit() {
  return Math.random() < config.criticalChance;
}

function showLoseScreen() {
  window.clearTimeout(battleTimer);
  setBattleButtons(false);
  showScreen("lose");
}

function revivePlayerAtAreaStart() {
  const area = areas[currentAreaId];
  playerState.health = playerState.maxHealth;
  player.x = area.start.x * config.tileSize + 6;
  player.y = area.start.y * config.tileSize + 2;
  contactLockedUntil = performance.now() + config.contactCooldown * 2;
  updateHud();
  showScreen("game");
}

function attackAction() {
  if (battleBusy || !activeEnemy) return;
  performPlayerAttack({
    name: playerState.magic ? "Magic" : "Attack",
    verb: attackVerb(),
    attackPower: currentAttackPower(),
    extraHeal: 0
  });
}

function lightSpellAction() {
  if (battleBusy || !activeEnemy) return;
  performPlayerAttack({
    name: "Light Spell",
    verb: "Your light spell",
    attackPower: currentAttackPower() + 2,
    extraHeal: 0
  });
}

function soulSpellAction() {
  if (battleBusy || !activeEnemy) return;
  performPlayerAttack({
    name: "Soul Spell",
    verb: "Your soul spell",
    attackPower: Math.max(1, currentAttackPower() - 1),
    extraHeal: 2
  });
}

function performPlayerAttack(action) {
  setBattleButtons(true);
  playBattleEffect("attack-effect");
  const critical = rollCriticalHit();
  const attackPower = action.attackPower;
  const power = damageAfterEnemyDefense(critical ? attackPower * 2 : attackPower, activeEnemy.defense);
  activeEnemy.control = Math.max(0, activeEnemy.control - power);
  const lifeStealHeal = playerState.lifeSteal ? Math.max(1, Math.round(power / 2)) : 0;
  const totalHeal = lifeStealHeal + action.extraHeal;
  if (totalHeal) {
    playerState.health = Math.min(playerState.maxHealth, playerState.health + totalHeal);
  }
  document.querySelector("#battle-message").textContent = critical
    ? `Critical hit! ${action.verb} reduces Control by ${power}.`
    : `${action.verb} reduces Control by ${power}.`;
  if (totalHeal) {
    document.querySelector("#battle-message").textContent += ` You restore ${totalHeal} health.`;
  }
  updateBattleStats();

  if (activeEnemy.control === 0) {
    finishRestoration();
    return;
  }

  queueEnemyTurn();
}

function currentAttackPower() {
  return playerState.magic ? playerState.restorePower + 1 : playerState.restorePower;
}

function attackVerb() {
  return playerState.magic ? "Your split spell" : "Your radiant slash";
}

function damageAfterEnemyDefense(attack, defense) {
  return Math.max(1, Math.round(attack / Math.max(1, defense / 2)));
}

function defendAction() {
  if (battleBusy) return;
  setBattleButtons(true);
  battleDefending = true;
  playBattleEffect("defend-effect");
  document.querySelector("#battle-message").textContent = playerState.strongDefend
    ? "A stronger protective light surrounds you. Enemy critical hits are canceled while defending."
    : "A protective light surrounds you. Your next hit is reduced.";
  queueEnemyTurn();
}

function healAction() {
  if (battleBusy) return;
  setBattleButtons(true);
  playBattleEffect("heal-effect");
  const restored = Math.min(playerState.healAmount, playerState.maxHealth - playerState.health);
  playerState.health += restored;
  document.querySelector("#battle-message").textContent = restored ? `Warm light restores ${restored} health.` : "Your health is already full.";
  updateBattleStats();
  queueEnemyTurn();
}

function finishRestoration() {
  window.clearTimeout(battleTimer);
  activeEnemy.restored = true;
  playerState.divinePoints += config.restoreReward;
  const area = areas[currentAreaId];
  const remainingEnemies = area.enemies.filter((enemy) => !enemy.restored).length;
  const areaCleared = area.enemies.length > 0 && remainingEnemies === 0;
  area.healed = areaCleared;
  updateVillageLocks();
  document.querySelector("#battle-enemy").classList.add("restored");
  document.querySelector("#battle-message").textContent = `RESTORED! You earned ${config.restoreReward} Divine Points.`;
  updateHud();

  window.setTimeout(() => {
    contactLockedUntil = performance.now() + config.contactCooldown;
    setBattleButtons(false);
    showScreen("upgrades");
    updateUpgradeButtons();
    document.querySelector("#upgrade-message").textContent = areaCleared
      ? `${area.name} is cleared. A village path opened on the kingdom map.`
      : `${area.name}: ${remainingEnemies} controlled cubes remain.`;
  }, 900);
}

function updateVillageLocks() {
  kingdomMap.nodes.forEach((node) => {
    if (node.kind !== "village") return;
    const requiredArea = areas[node.unlocksAfter];
    node.unlocked = !!requiredArea && requiredArea.enemies.length > 0 && requiredArea.enemies.every((enemy) => enemy.restored);
  });
}

function buyUpgrade(type) {
  const upgrade = upgradeDefinitions[type];
  if (!upgrade) return;

  if (playerState.upgrades[type]) {
    document.querySelector("#upgrade-message").textContent = "That path step is already chosen.";
    return;
  }

  if (upgrade.requires && !playerState.upgrades[upgrade.requires]) {
    document.querySelector("#upgrade-message").textContent = "Choose the first step on that path before this branch.";
    return;
  }

  if (upgrade.conflictsWith && playerState.upgrades[upgrade.conflictsWith]) {
    document.querySelector("#upgrade-message").textContent = "That branch is locked because you chose the other path.";
    return;
  }

  if (playerState.divinePoints < upgrade.cost) {
    document.querySelector("#upgrade-message").textContent = `You need ${upgrade.cost} Divine Points.`;
    return;
  }

  playerState.divinePoints -= upgrade.cost;
  playerState.upgrades[type] = 1;

  if (type === "damage") {
    playerState.restorePower += 1;
    document.querySelector("#upgrade-message").textContent = "Radiant Force I learned. Attack is stronger.";
  }

  if (type === "defense") {
    playerState.defense += 1;
    document.querySelector("#upgrade-message").textContent = "Pristine Guard I learned. Damage taken -1.";
  }

  if (type === "health") {
    playerState.maxHealth += 5;
    playerState.health = playerState.maxHealth;
    document.querySelector("#upgrade-message").textContent = "Soul Light I learned. Maximum health increased.";
  }

  if (type === "lifeSteal") {
    playerState.maxHealth += 3;
    playerState.health = Math.min(playerState.maxHealth, playerState.health + 3);
    playerState.lifeSteal = 1;
    document.querySelector("#upgrade-message").textContent = "Soul Siphon I learned. Health rises by 3 and attacks now restore health.";
  }

  if (type === "greaterHealth") {
    playerState.maxHealth += 13;
    playerState.health = playerState.maxHealth;
    playerState.healAmount += 5;
    document.querySelector("#upgrade-message").textContent = "Greater Soul Light learned. Health rises by 3, and maximum health and Heal are stronger.";
  }

  if (type === "greaterDamage") {
    playerState.restorePower += 3;
    document.querySelector("#upgrade-message").textContent = "Radiant Force II learned. Attack rises by 3.";
  }

  if (type === "magic") {
    playerState.restorePower += 3;
    playerState.magic = true;
    updateBattleActions();
    document.querySelector("#upgrade-message").textContent = "Split Spellcraft learned. Attack rises by 3 and becomes magic.";
  }

  if (type === "greaterDefense") {
    playerState.defense += 3;
    playerState.strongDefend = true;
    document.querySelector("#upgrade-message").textContent = "Pristine Guard II learned. Defense rises by 3 and Defend cancels enemy critical hits.";
  }

  if (type === "thorns") {
    playerState.defense += 3;
    playerState.thorns = true;
    document.querySelector("#upgrade-message").textContent = "Pristine Thorns learned. Defense rises by 3 and enemies take recoil.";
  }

  updateUpgradeButtons();
}

function updateUpgradeButtons() {
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    const upgrade = upgradeDefinitions[button.dataset.upgrade];
    const purchased = playerState.upgrades[button.dataset.upgrade] > 0;
    const locked = upgrade?.requires && !playerState.upgrades[upgrade.requires];
    const branchLocked = upgrade?.conflictsWith && playerState.upgrades[upgrade.conflictsWith];
    button.classList.toggle("purchased", purchased);
    button.classList.toggle("locked", !!locked || !!branchLocked);
    button.disabled = purchased || locked || branchLocked;
  });
  updateHud();
}

function resetGame() {
  Object.assign(playerState, {
    divinePoints: 0,
    health: 20,
    maxHealth: 20,
    restorePower: 5,
    defense: 3,
    healAmount: 5,
    lifeSteal: 0,
    thorns: false,
    strongDefend: false,
    magic: false
  });
  Object.assign(playerState.upgrades, {
    damage: 0,
    defense: 0,
    health: 0,
    lifeSteal: 0,
    greaterHealth: 0,
    greaterDamage: 0,
    magic: 0,
    greaterDefense: 0,
    thorns: 0
  });
  Object.values(areas).forEach((area) => {
    area.healed = false;
    area.enemies.forEach((enemy) => {
      enemy.restored = false;
      enemy.control = enemy.controlMax;
      enemy.moveX = 0;
      enemy.moveY = 0;
      enemy.movingUntil = 0;
      enemy.waitUntil = 0;
    });
  });
  kingdomMap.nodes.forEach((node) => {
    node.unlocked = node.kind !== "village";
  });
  currentAreaId = "sylvan";
  updateVillageLocks();
  document.querySelector("#attack-action").textContent = "Attack";
  updateBattleActions();
  enterKingdom();
  contactLockedUntil = 0;
  updateUpgradeButtons();
}

function drawWorld() {
  if (gameMode === "kingdom") drawKingdomMap();
  else drawAreaMap();
  drawPlayer();
}

function drawKingdomMap() {
  const { cameraX, cameraY } = kingdomMap;
  ctx.fillStyle = "#242631";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawKingdomTerrain(cameraX, cameraY);

  kingdomMap.paths.forEach((path) => {
    ctx.strokeStyle = "#f2c95f";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    path.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x - cameraX, y - cameraY);
      else ctx.lineTo(x - cameraX, y - cameraY);
    });
    ctx.stroke();
    ctx.strokeStyle = "#6b4f22";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  kingdomMap.nodes.forEach((node) => drawKingdomNode(node, cameraX, cameraY));
  drawMapLabel("Kingdom Map", "Choose an area with Z or Enter");
}

function drawKingdomTerrain(cameraX, cameraY) {
  ctx.fillStyle = "#405f5b";
  for (let x = -80; x < kingdomMap.width; x += 160) {
    for (let y = -60; y < kingdomMap.height; y += 140) {
      const drawX = x - cameraX;
      const drawY = y - cameraY;
      if (drawX < -80 || drawY < -80 || drawX > canvas.width + 80 || drawY > canvas.height + 80) continue;
      drawTree(drawX, drawY, 1);
    }
  }

  ctx.fillStyle = "rgba(119, 103, 202, 0.22)";
  ctx.beginPath();
  ctx.arc(1220 - cameraX, 210 - cameraY, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawKingdomNode(node, cameraX, cameraY) {
  const x = node.x - cameraX;
  const y = node.y - cameraY;

  ctx.save();
  ctx.shadowColor = node.unlocked ? "rgba(242,201,95,.7)" : "rgba(20,19,23,.6)";
  ctx.shadowBlur = node.unlocked ? 18 : 0;
  ctx.fillStyle = node.unlocked ? "#f2c95f" : "#5b5962";
  ctx.strokeStyle = "#211f25";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (node.id === "sylvan") drawTinyShrine(x - 18, y - 28);
  if (node.id === "azureApex") drawRuin(x - 24, y - 30);
  if (node.id === "sylvanVillage") drawHouse(x - 26, y - 34);
  if (node.id === "controlledPalace") drawTower(x - 17, y - 48);
  if (node.id === "controlledPlains") drawTree(x - 18, y - 35, 1.2);

  ctx.fillStyle = node.unlocked ? "#f3eee1" : "#b8b2a4";
  ctx.font = "800 15px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(node.name, x, y + 48);
  ctx.textAlign = "left";
}

function drawAreaMap() {
  const area = areas[currentAreaId];
  const cameraX = area.cameraX;
  const cameraY = area.cameraY;

  ctx.fillStyle = area.healed ? "#405f5b" : "#242631";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startCol = Math.floor(cameraX / config.tileSize);
  const endCol = Math.ceil((cameraX + canvas.width) / config.tileSize);
  const startRow = Math.floor(cameraY / config.tileSize);
  const endRow = Math.ceil((cameraY + canvas.height) / config.tileSize);

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      drawTile(area.map[row]?.[col], col * config.tileSize - cameraX, row * config.tileSize - cameraY, area.healed);
    }
  }

  area.enemies.forEach((enemy) => drawEnemy(enemy, cameraX, cameraY));
  drawMapLabel(area.name, "Explore the area. Step on the glowing exit to return.");
}

function drawTile(tile, x, y, healed) {
  const size = config.tileSize;
  ctx.fillStyle = healed ? "#496f59" : "#393944";
  ctx.fillRect(x, y, size, size);

  if (tile === "^") {
    ctx.fillStyle = "#181820";
    ctx.fillRect(x, y, size, size);
  }

  if (tile === "T") {
    ctx.fillStyle = healed ? "#315b3e" : "#252934";
    ctx.fillRect(x, y, size, size);
    drawTree(x + 10, y + 5, 0.72);
  }

  if (tile === "R") {
    ctx.fillStyle = "#6b6576";
    ctx.fillRect(x + 4, y + 8, size - 8, size - 12);
    ctx.strokeStyle = "#34313b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 8, size - 8, size - 12);
  }

  if (tile === "g") {
    ctx.fillStyle = healed ? "#7ac878" : "#514c62";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + 6 + i * 8, y + 30 - (i % 2) * 7, 5, 12);
    }
  }

  if (tile === "P") {
    ctx.strokeStyle = "#7767ca";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 8);
    ctx.lineTo(x + 10, y + size - 10);
    ctx.lineTo(x + size - 10, y + size - 10);
    ctx.closePath();
    ctx.stroke();
  }

  if (tile === "S") drawTinyShrine(x + 8, y + 6);

  if (tile === "E") {
    ctx.fillStyle = "rgba(242,201,95,.28)";
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    ctx.strokeStyle = "#f2c95f";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 9, y + 9, size - 18, size - 18);
  }

  ctx.strokeStyle = "rgba(243,238,225,.05)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);
}

function drawPlayer() {
  const camera = gameMode === "kingdom" ? kingdomMap : areas[currentAreaId];
  const screenX = player.x - camera.cameraX;
  const screenY = player.y - camera.cameraY;
  const spriteScale = 0.72;
  const spriteWidth = 78 * spriteScale;
  const spriteHeight = 132 * spriteScale;
  const drawX = screenX + player.width / 2 - spriteWidth / 2;
  const drawY = screenY + player.height - spriteHeight + 8;
  ctx.save();
  ctx.translate(drawX + (player.facing === -1 ? spriteWidth : 0), drawY);
  ctx.scale(player.facing * spriteScale, spriteScale);
  const x = 0;
  const y = 0;
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";

  if (player.view === "back") {
    ctx.fillStyle = "#f4e84c";
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 35);
    ctx.quadraticCurveTo(x - 3, y + 52, x + 4, y + 78);
    ctx.lineTo(x - 5, y + 117);
    ctx.quadraticCurveTo(x + 17, y + 126, x + 31, y + 119);
    ctx.quadraticCurveTo(x + 46, y + 127, x + 66, y + 117);
    ctx.lineTo(x + 58, y + 78);
    ctx.quadraticCurveTo(x + 64, y + 52, x + 48, y + 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e9d83e";
    ctx.beginPath();
    ctx.arc(x + 33, y + 27, 29, Math.PI, 0);
    ctx.lineTo(x + 58, y + 46);
    ctx.lineTo(x + 8, y + 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#28251e";
    ctx.lineWidth = 3;
    [[15, 48, 10, 107], [27, 45, 24, 114], [39, 45, 43, 114], [51, 50, 56, 108]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x + x1, y + y1);
      ctx.quadraticCurveTo(x + x1 - 4, y + (y1 + y2) / 2, x + x2, y + y2);
      ctx.stroke();
    });

    ctx.strokeStyle = "#f2d93d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 17);
    ctx.lineTo(x + 2, y + 11);
    ctx.lineTo(x - 4, y - 3);
    ctx.moveTo(x + 3, y + 7);
    ctx.lineTo(x - 8, y + 4);
    ctx.lineTo(x - 8, y - 8);
    ctx.moveTo(x + 48, y + 17);
    ctx.lineTo(x + 64, y + 11);
    ctx.lineTo(x + 70, y - 3);
    ctx.moveTo(x + 63, y + 7);
    ctx.lineTo(x + 74, y + 4);
    ctx.lineTo(x + 74, y - 8);
    ctx.stroke();

    ctx.fillStyle = "#f2d93d";
    ctx.strokeStyle = "#201f25";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 10);
    ctx.lineTo(x + 19, y - 6);
    ctx.lineTo(x + 28, y + 1);
    ctx.lineTo(x + 33, y - 11);
    ctx.lineTo(x + 40, y + 1);
    ctx.lineTo(x + 49, y - 6);
    ctx.lineTo(x + 48, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#f4e84c";
  ctx.beginPath();
  ctx.arc(x + 33, y + 29, 31, Math.PI, 0);
  ctx.lineTo(x + 60, y + 48);
  ctx.lineTo(x + 6, y + 48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f4e84c";
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 36);
  ctx.quadraticCurveTo(x - 2, y + 48, x + 4, y + 76);
  ctx.lineTo(x - 4, y + 116);
  ctx.quadraticCurveTo(x + 18, y + 126, x + 30, y + 120);
  ctx.quadraticCurveTo(x + 43, y + 127, x + 65, y + 118);
  ctx.lineTo(x + 57, y + 76);
  ctx.quadraticCurveTo(x + 64, y + 48, x + 48, y + 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#28251e";
  ctx.lineWidth = 3;
  [[16, 50, 12, 105], [26, 48, 22, 112], [38, 47, 42, 114], [49, 52, 54, 108], [10, 64, 4, 92]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x + x1, y + y1);
    ctx.quadraticCurveTo(x + x1 - 5, y + (y1 + y2) / 2, x + x2, y + y2);
    ctx.stroke();
  });

  ctx.fillStyle = "#f4f1dc";
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 4;
  roundRect(x + 7, y + 8, 51, 43, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#201f25";
  roundRect(x + 23, y + 25, 4, 15, 2);
  ctx.fill();
  roundRect(x + 43, y + 25, 4, 15, 2);
  ctx.fill();

  ctx.fillStyle = "#f2d93d";
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 10);
  ctx.lineTo(x + 18, y - 6);
  ctx.lineTo(x + 27, y + 1);
  ctx.lineTo(x + 33, y - 11);
  ctx.lineTo(x + 40, y + 1);
  ctx.lineTo(x + 50, y - 6);
  ctx.lineTo(x + 49, y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#f2d93d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 18);
  ctx.lineTo(x + 2, y + 12);
  ctx.lineTo(x - 4, y - 2);
  ctx.moveTo(x + 3, y + 7);
  ctx.lineTo(x - 8, y + 4);
  ctx.lineTo(x - 8, y - 8);
  ctx.moveTo(x - 1, y + 9);
  ctx.lineTo(x + 9, y - 2);
  ctx.moveTo(x + 48, y + 18);
  ctx.lineTo(x + 64, y + 12);
  ctx.lineTo(x + 70, y - 2);
  ctx.moveTo(x + 63, y + 7);
  ctx.lineTo(x + 74, y + 4);
  ctx.lineTo(x + 74, y - 8);
  ctx.moveTo(x + 67, y + 9);
  ctx.lineTo(x + 57, y - 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(enemy, cameraX, cameraY) {
  const x = enemy.x - cameraX;
  const y = enemy.y - cameraY;

  ctx.save();
  ctx.shadowColor = enemy.restored ? "rgba(242,201,95,.8)" : "rgba(221,108,123,.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = enemy.restored ? "#f1ead8" : "#383445";
  roundRect(x, y, enemy.width, enemy.height, 9);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = enemy.restored ? "#34313b" : "#dd6c7b";
  roundRect(x + 10, y + 14, 5, 12, 3);
  ctx.fill();
  roundRect(x + 24, y + 14, 5, 12, 3);
  ctx.fill();

  if (enemy.restored) {
    ctx.font = "700 14px Trebuchet MS";
    ctx.fillStyle = "#f2c95f";
    ctx.fillText("...", x + 11, y - 10);
  } else {
    ctx.font = "800 12px Trebuchet MS";
    ctx.fillStyle = "#f3eee1";
    ctx.fillText(`Lv ${enemy.level}`, x - 2, y - 10);
  }
}

function drawTree(x, y, scale) {
  ctx.fillStyle = "#6b4f22";
  ctx.fillRect(x + 15 * scale, y + 25 * scale, 8 * scale, 22 * scale);
  ctx.fillStyle = "#7ac878";
  ctx.beginPath();
  ctx.arc(x + 18 * scale, y + 18 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuin(x, y) {
  ctx.fillStyle = "#6b6576";
  ctx.fillRect(x, y + 16, 48, 34);
  ctx.fillStyle = "#34313b";
  ctx.fillRect(x + 8, y + 26, 8, 18);
  ctx.fillRect(x + 32, y + 26, 8, 18);
}

function drawHouse(x, y) {
  ctx.fillStyle = "#dd6c7b";
  ctx.beginPath();
  ctx.moveTo(x + 26, y);
  ctx.lineTo(x, y + 22);
  ctx.lineTo(x + 52, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f3eee1";
  ctx.fillRect(x + 6, y + 22, 40, 30);
}

function drawTower(x, y) {
  ctx.fillStyle = "#7767ca";
  ctx.fillRect(x, y, 34, 70);
  ctx.fillStyle = "#f2c95f";
  ctx.fillRect(x + 8, y + 10, 7, 12);
  ctx.fillRect(x + 20, y + 10, 7, 12);
}

function drawTinyShrine(x, y) {
  ctx.fillStyle = "#f2c95f";
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x, y + 24);
  ctx.lineTo(x + 36, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#34313b";
  ctx.fillRect(x + 14, y + 24, 8, 20);
}

function drawMapLabel(title, subtitle) {
  ctx.fillStyle = "rgba(20,19,23,.75)";
  roundRect(18, 18, 350, 62, 8);
  ctx.fill();
  ctx.fillStyle = "#f3eee1";
  ctx.font = "900 22px Trebuchet MS";
  ctx.fillText(title, 34, 45);
  ctx.fillStyle = "#b8b2a4";
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillText(subtitle, 34, 67);
}

function gameLoop(time) {
  const delta = time - lastTime;
  lastTime = time;

  if (currentScreen === "game" && delta < 80) {
    movePlayer();
    moveEnemies();
    updateCamera();
    checkAreaEncounters();
    drawWorld();
    updateInteractionPrompt();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function talkToNpc() {
  if (currentScreen === "game" && promptMode === "talk") {
    dialogueUntil = performance.now() + 4500;
    setPrompt("What happened? Hello? Who are you? Well... either way, thanks for saving me.");
    window.setTimeout(updateInteractionPrompt, 4500);
  }
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

document.querySelector("#play-button").addEventListener("click", () => {
  storyIndex = 0;
  renderStory();
  showScreen("story");
});

document.querySelector("#story-prev").addEventListener("click", () => {
  storyIndex = Math.max(0, storyIndex - 1);
  renderStory();
});
document.querySelector("#story-next").addEventListener("click", nextStory);
document.querySelector("#story-skip").addEventListener("click", startGame);
document.querySelector("#upgrade-button").addEventListener("click", () => {
  updateUpgradeButtons();
  showScreen("upgrades");
});
document.querySelector("#close-upgrades").addEventListener("click", () => showScreen("game"));
document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#attack-action").addEventListener("click", attackAction);
document.querySelector("#light-spell-action").addEventListener("click", lightSpellAction);
document.querySelector("#soul-spell-action").addEventListener("click", soulSpellAction);
document.querySelector("#defend-action").addEventListener("click", defendAction);
document.querySelector("#heal-action").addEventListener("click", healAction);
document.querySelectorAll("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "s", "d", "w", " "].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);

  if (currentScreen === "lose" && (key === "z" || key === " ")) {
    revivePlayerAtAreaStart();
    return;
  }

  if (key === "z" || key === "enter") usePrompt();
  if (key === "m" && currentScreen === "game" && gameMode === "area") leaveArea();
  if (key === "u" && currentScreen === "game") {
    updateUpgradeButtons();
    showScreen("upgrades");
  }
  if (key === "escape" && currentScreen === "game") {
    updateUpgradeButtons();
    showScreen("upgrades");
  }
  if (currentScreen === "story" && key === "arrowright") nextStory();
  if (currentScreen === "story" && key === "arrowleft") {
    storyIndex = Math.max(0, storyIndex - 1);
    renderStory();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

updateHud();
updateBattleActions();
renderStory();
drawWorld();
