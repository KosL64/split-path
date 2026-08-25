const screens = {
  title: document.querySelector("#title-screen"),
  story: document.querySelector("#story-screen"),
  game: document.querySelector("#game-screen"),
  battle: document.querySelector("#battle-screen"),
  upgrades: document.querySelector("#upgrade-screen")
};

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const config = {
  gravity: 0.75,
  moveSpeed: 4.2,
  jumpStrength: 14,
  restoreReward: 5,
  upgradeCost: 5,
  enemyAttack: 4,
  worldWidth: 2200,
  worldHeight: 540
};

const playerState = {
  divinePoints: 0,
  health: 20,
  maxHealth: 20,
  restorePower: 3,
  defense: 0,
  upgrades: {
    damage: 0,
    defense: 0,
    health: 0
  }
};

const player = {
  x: 90,
  y: 360,
  width: 46,
  height: 46,
  velocityX: 0,
  velocityY: 0,
  onGround: false,
  facing: 1
};

const enemy = {
  x: 940,
  y: 382,
  width: 50,
  height: 50,
  restored: false,
  controlMax: 12,
  control: 12
};

const world = {
  cameraX: 0,
  healingGlow: 0,
  platforms: [
    { x: 0, y: 432, width: 1340, height: 80 },
    { x: 1450, y: 432, width: 750, height: 80 },
    { x: 355, y: 334, width: 160, height: 24 },
    { x: 625, y: 282, width: 150, height: 24 },
    { x: 1230, y: 342, width: 180, height: 24 }
  ],
  restoredPlants: [
    { x: 1080, y: 402 },
    { x: 1125, y: 406 },
    { x: 1180, y: 398 }
  ]
};

const keys = new Set();
let currentScreen = "title";
let storyIndex = 0;
let battleGuarding = false;
let battleFocus = false;
let lastTime = 0;
let animationFrameId = null;

const storySlides = [
  {
    title: "The King",
    text: "Long ago, the Pristine King watched over the cubes and souls of the land.",
    image: "img/split-path-lore.png"
  },
  {
    title: "The Takeover",
    text: "A mysterious figure appeared. One by one, cubes across the kingdom fell under its control.",
    image: "img/split-path-1.jpg"
  },
  {
    title: "Reborn",
    text: "The king's power was taken, and he awakened again as a simple cube.",
    image: "img/split-path-1.jpg"
  },
  {
    title: "Divine Points",
    text: "By restoring controlled creatures, the king earns Divine Points: chips of light created through good deeds.",
    image: "New folder/NOT DWIN POINTS!!!.png"
  },
  {
    title: "The Split Path",
    text: "Every point brings him closer to his former power, but the path back can split in many directions.",
    image: "img/split-path-2.jpg"
  }
];

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  currentScreen = name;
}

function startGame() {
  showScreen("game");
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

function renderStory() {
  const slide = storySlides[storyIndex];
  document.querySelector("#story-slide").innerHTML = `
    <div class="story-visual" style="background-image: url('${slide.image.replace("'", "%27")}')"></div>
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
  if (storyIndex >= storySlides.length - 1) {
    startGame();
    return;
  }
  storyIndex += 1;
  renderStory();
}

function previousStory() {
  storyIndex = Math.max(0, storyIndex - 1);
  renderStory();
}

function updateHud() {
  document.querySelector("#divine-points").textContent = `DP: ${playerState.divinePoints}`;
  document.querySelector("#player-stats").textContent = `Power ${playerState.restorePower} | Guard ${playerState.defense} | Health ${playerState.maxHealth}`;
  document.querySelector("#upgrade-points").textContent = `DP: ${playerState.divinePoints}`;
}

function rectangleOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function movePlayer() {
  player.velocityX = 0;

  if (keys.has("arrowleft") || keys.has("a")) {
    player.velocityX = -config.moveSpeed;
    player.facing = -1;
  }

  if (keys.has("arrowright") || keys.has("d")) {
    player.velocityX = config.moveSpeed;
    player.facing = 1;
  }

  player.x += player.velocityX;
  player.x = Math.max(0, Math.min(config.worldWidth - player.width, player.x));

  player.velocityY += config.gravity;
  player.y += player.velocityY;
  player.onGround = false;

  for (const platform of world.platforms) {
    const wasAbove = player.y + player.height - player.velocityY <= platform.y;
    if (rectangleOverlap(player, platform) && wasAbove) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.onGround = true;
    }
  }

  if (player.y > config.worldHeight) {
    player.x = 90;
    player.y = 320;
    player.velocityY = 0;
  }

  const maxCamera = config.worldWidth - canvas.width;
  world.cameraX = Math.max(0, Math.min(maxCamera, player.x - canvas.width * 0.42));
}

function jump() {
  if (currentScreen === "game" && player.onGround) {
    player.velocityY = -config.jumpStrength;
    player.onGround = false;
  }
}

function playerNearEnemy() {
  if (enemy.restored) {
    return false;
  }

  const distance = Math.abs((player.x + player.width / 2) - (enemy.x + enemy.width / 2));
  return distance < 260 && Math.abs(player.y - enemy.y) < 120;
}

function interact() {
  if (currentScreen === "game" && playerNearEnemy()) {
    startBattle();
  }
}

function startBattle() {
  enemy.control = enemy.controlMax;
  battleGuarding = false;
  battleFocus = false;
  document.querySelector("#battle-enemy").classList.remove("restored");
  document.querySelector("#battle-message").textContent = "A controlled cube blocks the path.";
  showScreen("battle");
  updateBattleStats();
}

function updateBattleStats() {
  document.querySelector("#player-health-meter").max = playerState.maxHealth;
  document.querySelector("#player-health-meter").value = playerState.health;
  document.querySelector("#player-health").textContent = `${playerState.health} / ${playerState.maxHealth}`;
  document.querySelector("#enemy-control-meter").max = enemy.controlMax;
  document.querySelector("#enemy-control-meter").value = enemy.control;
  document.querySelector("#enemy-control").textContent = enemy.control;
}

function enemyTurn() {
  let damage = config.enemyAttack - playerState.defense;
  if (battleGuarding) {
    damage -= 2;
  }
  damage = Math.max(1, damage);
  playerState.health = Math.max(1, playerState.health - damage);
  battleGuarding = false;
  document.querySelector("#battle-message").textContent += ` The cube pushes back for ${damage} damage.`;
  updateBattleStats();
}

function restoreAction() {
  let power = playerState.restorePower;
  if (battleFocus) {
    power += 2;
    battleFocus = false;
  }

  enemy.control = Math.max(0, enemy.control - power);
  document.querySelector("#battle-message").textContent = `You shine pristine light and lower Control by ${power}.`;
  updateBattleStats();

  if (enemy.control <= 0) {
    finishRestoration();
    return;
  }

  window.setTimeout(enemyTurn, 420);
}

function guardAction() {
  battleGuarding = true;
  document.querySelector("#battle-message").textContent = "You brace behind a square little shield.";
  window.setTimeout(enemyTurn, 420);
}

function focusAction() {
  battleFocus = true;
  playerState.health = Math.min(playerState.maxHealth, playerState.health + 2);
  document.querySelector("#battle-message").textContent = "You gather light. Next Restore is stronger, and you recover 2 health.";
  updateBattleStats();
  window.setTimeout(enemyTurn, 420);
}

function finishRestoration() {
  enemy.restored = true;
  playerState.divinePoints += config.restoreReward;
  world.healingGlow = 1;
  document.querySelector("#battle-enemy").classList.add("restored");
  document.querySelector("#battle-message").textContent = `RESTORED! You earned ${config.restoreReward} Divine Points.`;
  updateHud();

  window.setTimeout(() => {
    showScreen("upgrades");
    updateUpgradeButtons();
    document.querySelector("#upgrade-message").textContent = "Your first branch is ready.";
  }, 900);
}

function buyUpgrade(type) {
  if (playerState.upgrades[type] > 0) {
    document.querySelector("#upgrade-message").textContent = "That first step is already chosen.";
    return;
  }

  if (playerState.divinePoints < config.upgradeCost) {
    document.querySelector("#upgrade-message").textContent = "Restore more cubes to earn enough Divine Points.";
    return;
  }

  playerState.divinePoints -= config.upgradeCost;
  playerState.upgrades[type] = 1;

  if (type === "damage") {
    playerState.restorePower += 1;
    document.querySelector("#upgrade-message").textContent = "Radiant Force I learned. Restore is stronger.";
  }

  if (type === "defense") {
    playerState.defense += 1;
    document.querySelector("#upgrade-message").textContent = "Pristine Guard I learned. Damage is reduced.";
  }

  if (type === "health") {
    playerState.maxHealth += 5;
    playerState.health = playerState.maxHealth;
    document.querySelector("#upgrade-message").textContent = "Soul Light I learned. Maximum health increased.";
  }

  updateHud();
  updateUpgradeButtons();
}

function updateUpgradeButtons() {
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    const type = button.dataset.upgrade;
    const purchased = playerState.upgrades[type] > 0;
    button.classList.toggle("purchased", purchased);
    button.disabled = purchased;
  });
  updateHud();
}

function resetGame() {
  playerState.divinePoints = 0;
  playerState.health = 20;
  playerState.maxHealth = 20;
  playerState.restorePower = 3;
  playerState.defense = 0;
  playerState.upgrades.damage = 0;
  playerState.upgrades.defense = 0;
  playerState.upgrades.health = 0;
  player.x = 90;
  player.y = 360;
  player.velocityX = 0;
  player.velocityY = 0;
  enemy.restored = false;
  enemy.control = enemy.controlMax;
  world.healingGlow = 0;
  updateHud();
  updateUpgradeButtons();
}

function drawBackground() {
  const healed = world.healingGlow;
  const skyTop = healed ? "#31425c" : "#242631";
  const skyBottom = healed ? "#405f5b" : "#191923";
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, skyTop);
  gradient.addColorStop(1, skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = healed ? "rgba(242, 201, 95, 0.5)" : "rgba(221, 108, 123, 0.22)";
  ctx.beginPath();
  ctx.arc(760 - world.cameraX * 0.22, 96, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(243, 238, 225, 0.12)";
  for (let x = -200; x < canvas.width + 260; x += 180) {
    ctx.fillRect(x - (world.cameraX * 0.28) % 180, 390, 80, 42);
    ctx.fillRect(x + 36 - (world.cameraX * 0.28) % 180, 330, 24, 60);
  }
}

function drawPlatforms() {
  for (const platform of world.platforms) {
    const drawX = platform.x - world.cameraX;
    ctx.fillStyle = enemy.restored ? "#4f7c5c" : "#454251";
    ctx.fillRect(drawX, platform.y, platform.width, platform.height);
    ctx.fillStyle = enemy.restored ? "#85d7c2" : "#6b6576";
    ctx.fillRect(drawX, platform.y, platform.width, 8);
  }
}

function drawPlayer() {
  const x = player.x - world.cameraX;
  const y = player.y;
  ctx.fillStyle = "#f1ead8";
  roundRect(x, y, player.width, player.height, 9);
  ctx.fill();
  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#34313b";
  ctx.fillRect(x + 14, y + 18, 5, 14);
  ctx.fillRect(x + 28, y + 18, 5, 14);

  ctx.strokeStyle = "#f2c95f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  const staffX = player.facing === 1 ? x + 54 : x - 8;
  ctx.moveTo(staffX, y + 3);
  ctx.lineTo(staffX, y + 48);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(staffX, y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemy() {
  const x = enemy.x - world.cameraX;
  const y = enemy.y;

  ctx.save();
  ctx.shadowColor = enemy.restored ? "rgba(242, 201, 95, 0.8)" : "rgba(221, 108, 123, 0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = enemy.restored ? "#f1ead8" : "#383445";
  roundRect(x, y, enemy.width, enemy.height, 9);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = enemy.restored ? "#34313b" : "#dd6c7b";
  ctx.fillRect(x + 16, y + 18, 5, 15);
  ctx.fillRect(x + 31, y + 18, 5, 15);

  if (enemy.restored) {
    ctx.fillStyle = "#f2c95f";
    ctx.fillText("Thank you!", x - 15, y - 16);
  }
}

function drawDetails() {
  ctx.font = "700 18px Trebuchet MS";
  ctx.fillStyle = "#f3eee1";
  ctx.fillText("Old Sign: Restore, do not destroy.", 176 - world.cameraX, 398);

  ctx.strokeStyle = enemy.restored ? "#f2c95f" : "#7767ca";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(690 - world.cameraX, 214);
  ctx.lineTo(650 - world.cameraX, 270);
  ctx.lineTo(730 - world.cameraX, 270);
  ctx.closePath();
  ctx.stroke();

  if (enemy.restored) {
    ctx.fillStyle = "#7ac878";
    for (const plant of world.restoredPlants) {
      ctx.beginPath();
      ctx.ellipse(plant.x - world.cameraX, plant.y, 8, 24, 0.4, 0, Math.PI * 2);
      ctx.ellipse(plant.x + 12 - world.cameraX, plant.y + 2, 8, 24, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#312f38";
    ctx.fillRect(1060 - world.cameraX, 408, 150, 24);
  }
}

function drawGateHint() {
  if (!enemy.restored) {
    ctx.fillStyle = "rgba(20, 19, 23, 0.7)";
    ctx.fillRect(1340 - world.cameraX, 268, 36, 164);
    ctx.fillStyle = "#dd6c7b";
    ctx.font = "800 16px Trebuchet MS";
    ctx.fillText("Blocked", 1324 - world.cameraX, 250);
  } else {
    ctx.fillStyle = "#85d7c2";
    ctx.font = "800 18px Trebuchet MS";
    ctx.fillText("The path opens.", 1320 - world.cameraX, 250);
  }
}

function drawWorld() {
  drawBackground();
  drawDetails();
  drawPlatforms();
  drawGateHint();
  drawEnemy();
  drawPlayer();
}

function updateInteractionPrompt() {
  document.querySelector("#interaction-prompt").classList.toggle("hidden", !playerNearEnemy());
}

function gameLoop(time) {
  const delta = time - lastTime;
  lastTime = time;

  if (currentScreen === "game" && delta < 80) {
    movePlayer();
    drawWorld();
    updateInteractionPrompt();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
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
document.querySelector("#story-prev").addEventListener("click", previousStory);
document.querySelector("#story-next").addEventListener("click", nextStory);
document.querySelector("#story-skip").addEventListener("click", startGame);
document.querySelector("#upgrade-button").addEventListener("click", () => {
  updateUpgradeButtons();
  showScreen("upgrades");
});
document.querySelector("#close-upgrades").addEventListener("click", () => showScreen("game"));
document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#restore-action").addEventListener("click", restoreAction);
document.querySelector("#guard-action").addEventListener("click", guardAction);
document.querySelector("#focus-action").addEventListener("click", focusAction);

document.querySelectorAll("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", "arrowup", " ", "a", "d", "w"].includes(key)) {
    event.preventDefault();
  }

  keys.add(key);

  if (key === " " || key === "arrowup" || key === "w") {
    jump();
  }

  if (key === "e") {
    interact();
  }

  if (key === "u" && currentScreen === "game") {
    updateUpgradeButtons();
    showScreen("upgrades");
  }

  if (key === "escape" && currentScreen === "game") {
    updateUpgradeButtons();
    showScreen("upgrades");
  }

  if (currentScreen === "story" && key === "arrowright") {
    nextStory();
  }

  if (currentScreen === "story" && key === "arrowleft") {
    previousStory();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

updateHud();
renderStory();
drawWorld();
