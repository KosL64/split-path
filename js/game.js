const screens = {
  title: document.querySelector("#title-screen"), story: document.querySelector("#story-screen"),
  game: document.querySelector("#game-screen"), battle: document.querySelector("#battle-screen"),
  upgrades: document.querySelector("#upgrade-screen")
};
const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const config = { moveSpeed: 3.6, restoreReward: 5, upgradeCost: 5, enemyAttack: 4, healAmount: 5, worldWidth: 2200, worldHeight: 540, contactCooldown: 900 };
const playerState = { divinePoints: 0, health: 20, maxHealth: 20, restorePower: 3, defense: 0, upgrades: { damage: 0, defense: 0, health: 0 } };
const player = { x: 90, y: 355, width: 58, height: 78, facing: 1, view: "front" };
const enemy = { x: 940, y: 370, width: 42, height: 52, restored: false, controlMax: 12, control: 12, speed: 0.85, patrolLeft: 820, patrolRight: 1120, patrolTop: 285, patrolBottom: 380, moveX: 0, moveY: 0, movingUntil: 0, waitUntil: 0 };
const world = { cameraX: 0, healingGlow: 0, restoredPlants: [{ x: 1080, y: 402 }, { x: 1125, y: 406 }, { x: 1180, y: 398 }] };
const keys = new Set();
let currentScreen = "title", storyIndex = 0, lastTime = 0, animationFrameId = null;
let battleDefending = false, battleBusy = false, battleTimer = null, contactLockedUntil = 0, dialogueUntil = 0, promptMode = "";
const storySlides = [
  { title: "The King", text: "Long ago, the Pristine King watched over the cubes and souls of the land.", image: "img/split-path-lore.png" },
  { title: "The Takeover", text: "A mysterious figure appeared. One by one, cubes across the kingdom fell under its control.", image: "img/split-path-1.jpg" },
  { title: "Reborn", text: "The king's power was taken, and he awakened again in a new form.", image: "img/split-path-1.jpg" },
  { title: "Divine Points", text: "By restoring controlled creatures, the king earns Divine Points: chips of light created through good deeds.", image: "New folder/NOT DWIN POINTS!!!.png" },
  { title: "The Split Path", text: "Every point brings him closer to his former power, but the path back can split in many directions.", image: "img/split-path-2.jpg" }
];
function showScreen(name) { Object.values(screens).forEach((screen) => screen.classList.remove("active")); screens[name].classList.add("active"); currentScreen = name; }
function startGame() { showScreen("game"); if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop); }
function renderStory() {
  const slide = storySlides[storyIndex];
  document.querySelector("#story-slide").innerHTML = `<div class="story-visual" style="background-image:url('${slide.image.replace("'", "%27")}')"></div><div class="story-copy"><p class="eyebrow">Story ${storyIndex + 1} / ${storySlides.length}</p><h2>${slide.title}</h2><p>${slide.text}</p></div>`;
  const progress = document.querySelector("#story-progress"); progress.innerHTML = "";
  storySlides.forEach((_, index) => { const dot = document.createElement("button"); dot.className = `story-dot${index === storyIndex ? " active" : ""}`; dot.setAttribute("aria-label", `Go to story slide ${index + 1}`); dot.addEventListener("click", () => { storyIndex = index; renderStory(); }); progress.append(dot); });
  document.querySelector("#story-prev").disabled = storyIndex === 0;
  document.querySelector("#story-next").textContent = storyIndex === storySlides.length - 1 ? "Begin Journey" : "Next";
}
function nextStory() { if (storyIndex >= storySlides.length - 1) startGame(); else { storyIndex += 1; renderStory(); } }
function updateHud() { document.querySelector("#divine-points").textContent = `DP: ${playerState.divinePoints}`; document.querySelector("#player-stats").textContent = `Attack ${playerState.restorePower} | Guard ${playerState.defense} | Health ${playerState.health}/${playerState.maxHealth}`; document.querySelector("#upgrade-points").textContent = `DP: ${playerState.divinePoints}`; }
function rectangleOverlap(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function distanceToEnemy() { return Math.hypot(player.x + player.width / 2 - (enemy.x + enemy.width / 2), player.y + player.height / 2 - (enemy.y + enemy.height / 2)); }
function movePlayer() {
  let horizontal = 0, vertical = 0;
  if (keys.has("arrowleft") || keys.has("a")) horizontal -= 1;
  if (keys.has("arrowright") || keys.has("d")) horizontal += 1;
  if (keys.has("arrowup") || keys.has("w")) vertical -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vertical += 1;
  if (horizontal && vertical) { horizontal *= 0.707; vertical *= 0.707; }
  if (horizontal) player.facing = horizontal > 0 ? 1 : -1;
  if (vertical < 0) player.view = "back";
  else if (horizontal || vertical > 0) player.view = "front";
  player.x = Math.max(0, Math.min(config.worldWidth - player.width, player.x + horizontal * config.moveSpeed));
  player.y = Math.max(200, Math.min(432 - player.height, player.y + vertical * config.moveSpeed));
  world.cameraX = Math.max(0, Math.min(config.worldWidth - canvas.width, player.x - canvas.width * 0.42));
}
function chooseEnemyDirection() {
  const moveHorizontally = Math.random() < 0.5;
  const direction = Math.random() < 0.5 ? -1 : 1;
  enemy.moveX = moveHorizontally ? direction : 0;
  enemy.moveY = moveHorizontally ? 0 : direction;
  enemy.movingUntil = performance.now() + 1100 + Math.random() * 1300;
}
function moveEnemy() {
  if (enemy.restored || performance.now() < enemy.waitUntil) return;
  if (performance.now() >= enemy.movingUntil) {
    enemy.moveX = 0;
    enemy.moveY = 0;
    const pauseDuration = 1200 + Math.random() * 700;
    enemy.waitUntil = performance.now() + pauseDuration;
    window.setTimeout(chooseEnemyDirection, pauseDuration);
    return;
  }

  const nextX = enemy.x + enemy.moveX * enemy.speed;
  const nextY = enemy.y + enemy.moveY * enemy.speed;
  if (nextX < enemy.patrolLeft || nextX + enemy.width > enemy.patrolRight || nextY < enemy.patrolTop || nextY > enemy.patrolBottom) {
    enemy.movingUntil = 0;
    return;
  }
  enemy.x = nextX;
  enemy.y = nextY;
}
function setPrompt(text) { const prompt = document.querySelector("#interaction-prompt"); prompt.textContent = text; prompt.classList.toggle("hidden", !text); }
function updateInteractionPrompt() {
  if (performance.now() < dialogueUntil) return;
  if (enemy.restored && distanceToEnemy() < 105) { promptMode = "talk"; setPrompt("Press Z to talk"); }
  else { promptMode = ""; setPrompt(""); }
}
function startBattle() {
  if (enemy.restored || battleBusy || performance.now() < contactLockedUntil) return;
  battleBusy = false; battleDefending = false; enemy.control = enemy.controlMax;
  document.querySelector("#battle-enemy").classList.remove("restored");
  document.querySelector("#battle-message").textContent = "A controlled cube lashes out. Purify it with your attacks.";
  showScreen("battle"); updateBattleStats();
}
function updateBattleStats() {
  document.querySelector("#player-health-meter").max = playerState.maxHealth; document.querySelector("#player-health-meter").value = playerState.health;
  document.querySelector("#player-health").textContent = `${playerState.health} / ${playerState.maxHealth}`;
  document.querySelector("#enemy-control-meter").value = enemy.control; document.querySelector("#enemy-control").textContent = enemy.control;
}
function setBattleButtons(disabled) { battleBusy = disabled; document.querySelectorAll(".battle-actions button").forEach((button) => { button.disabled = disabled; }); }
function playBattleEffect(name) { const stage = document.querySelector(".battle-stage"); stage.classList.remove("attack-effect", "defend-effect", "heal-effect"); void stage.offsetWidth; stage.classList.add(name); }
function enemyTurn() {
  let damage = Math.max(1, config.enemyAttack - playerState.defense - (battleDefending ? 2 : 0));
  battleDefending = false; playerState.health = Math.max(0, playerState.health - damage); updateBattleStats();
  if (playerState.health === 0) { document.querySelector("#battle-message").textContent = "You retreat and recover your strength."; window.setTimeout(() => { playerState.health = playerState.maxHealth; player.x = 90; player.y = 355; contactLockedUntil = performance.now() + config.contactCooldown; showScreen("game"); updateHud(); setBattleButtons(false); }, 900); return; }
  document.querySelector("#battle-message").textContent += ` The cube strikes back for ${damage} damage.`; setBattleButtons(false);
}
function queueEnemyTurn() { battleTimer = window.setTimeout(enemyTurn, 650); }
function attackAction() {
  if (battleBusy) return; setBattleButtons(true); playBattleEffect("attack-effect");
  const power = playerState.restorePower; enemy.control = Math.max(0, enemy.control - power);
  document.querySelector("#battle-message").textContent = `Your radiant slash reduces Control by ${power}.`; updateBattleStats();
  if (enemy.control === 0) { finishRestoration(); return; } queueEnemyTurn();
}
function defendAction() { if (battleBusy) return; setBattleButtons(true); battleDefending = true; playBattleEffect("defend-effect"); document.querySelector("#battle-message").textContent = "A protective light surrounds you. Your next hit is reduced."; queueEnemyTurn(); }
function healAction() { if (battleBusy) return; setBattleButtons(true); playBattleEffect("heal-effect"); const restored = Math.min(config.healAmount, playerState.maxHealth - playerState.health); playerState.health += restored; document.querySelector("#battle-message").textContent = restored ? `Warm light restores ${restored} health.` : "Your health is already full."; updateBattleStats(); queueEnemyTurn(); }
function finishRestoration() {
  window.clearTimeout(battleTimer); enemy.restored = true; playerState.divinePoints += config.restoreReward; world.healingGlow = 1;
  document.querySelector("#battle-enemy").classList.add("restored"); document.querySelector("#battle-message").textContent = `RESTORED! You earned ${config.restoreReward} Divine Points.`; updateHud();
  window.setTimeout(() => { player.x = enemy.x - player.width - 78; player.y = enemy.y; contactLockedUntil = performance.now() + config.contactCooldown; setBattleButtons(false); showScreen("upgrades"); updateUpgradeButtons(); document.querySelector("#upgrade-message").textContent = "Your first branch is ready."; }, 900);
}
function buyUpgrade(type) {
  if (playerState.upgrades[type]) { document.querySelector("#upgrade-message").textContent = "That first step is already chosen."; return; }
  if (playerState.divinePoints < config.upgradeCost) { document.querySelector("#upgrade-message").textContent = "You need 5 Divine Points."; return; }
  playerState.divinePoints -= config.upgradeCost; playerState.upgrades[type] = 1;
  if (type === "damage") { playerState.restorePower += 1; document.querySelector("#upgrade-message").textContent = "Radiant Force I learned. Attack is stronger."; }
  if (type === "defense") { playerState.defense += 1; document.querySelector("#upgrade-message").textContent = "Pristine Guard I learned. Damage is reduced."; }
  if (type === "health") { playerState.maxHealth += 5; playerState.health = playerState.maxHealth; document.querySelector("#upgrade-message").textContent = "Soul Light I learned. Maximum health increased."; }
  updateUpgradeButtons();
}
function updateUpgradeButtons() { document.querySelectorAll("[data-upgrade]").forEach((button) => { const purchased = playerState.upgrades[button.dataset.upgrade] > 0; button.classList.toggle("purchased", purchased); button.disabled = purchased; }); updateHud(); }
function resetGame() { Object.assign(playerState, { divinePoints: 0, health: 20, maxHealth: 20, restorePower: 3, defense: 0 }); Object.assign(playerState.upgrades, { damage: 0, defense: 0, health: 0 }); Object.assign(player, { x: 90, y: 355, facing: 1, view: "front" }); Object.assign(enemy, { x: 940, y: 370, restored: false, control: enemy.controlMax, moveX: 0, moveY: 0, movingUntil: 0, waitUntil: 0 }); world.healingGlow = 0; contactLockedUntil = 0; updateUpgradeButtons(); }
function drawBackground() { const healed = world.healingGlow; const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height); gradient.addColorStop(0, healed ? "#31425c" : "#242631"); gradient.addColorStop(1, healed ? "#405f5b" : "#191923"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = healed ? "rgba(242,201,95,.48)" : "rgba(221,108,123,.22)"; ctx.beginPath(); ctx.arc(760 - world.cameraX * .22, 96, 44, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = healed ? "#4f7c5c" : "#454251"; ctx.fillRect(0, 432, canvas.width, 108); ctx.fillStyle = healed ? "#85d7c2" : "#6b6576"; ctx.fillRect(0, 432, canvas.width, 8); }
function drawPlayer() {
  const screenX = player.x - world.cameraX;
  const y = player.y;
  ctx.save();
  ctx.translate(screenX + (player.facing === -1 ? player.width : 0), 0);
  ctx.scale(player.facing, 1);
  const x = 0;
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  if (player.view === "back") {
    // Back-facing pose: hood and cloak only, with no visible face.
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
      ctx.beginPath(); ctx.moveTo(x + x1, y + y1); ctx.quadraticCurveTo(x + x1 - 4, y + (y1 + y2) / 2, x + x2, y + y2); ctx.stroke();
    });

    ctx.strokeStyle = "#f2d93d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 17); ctx.lineTo(x + 2, y + 11); ctx.lineTo(x - 4, y - 3);
    ctx.moveTo(x + 3, y + 7); ctx.lineTo(x - 8, y + 4); ctx.lineTo(x - 8, y - 8);
    ctx.moveTo(x + 48, y + 17); ctx.lineTo(x + 64, y + 11); ctx.lineTo(x + 70, y - 3);
    ctx.moveTo(x + 63, y + 7); ctx.lineTo(x + 74, y + 4); ctx.lineTo(x + 74, y - 8);
    ctx.stroke();

    ctx.fillStyle = "#f2d93d";
    ctx.strokeStyle = "#201f25";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 10); ctx.lineTo(x + 19, y - 6); ctx.lineTo(x + 28, y + 1);
    ctx.lineTo(x + 33, y - 11); ctx.lineTo(x + 40, y + 1); ctx.lineTo(x + 49, y - 6);
    ctx.lineTo(x + 48, y + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }

  // The raised yellow hood frames the head before the robe falls below it.
  ctx.fillStyle = "#f4e84c";
  ctx.beginPath();
  ctx.arc(x + 33, y + 29, 31, Math.PI, 0);
  ctx.lineTo(x + 60, y + 48);
  ctx.lineTo(x + 6, y + 48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // The flowing robe is wider than the head, like the reference drawing.
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

  // Dark robe folds echo the hand-drawn lines in the concept art.
  ctx.strokeStyle = "#28251e";
  ctx.lineWidth = 3;
  [[16, 50, 12, 105], [26, 48, 22, 112], [38, 47, 42, 114], [49, 52, 54, 108], [10, 64, 4, 92]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x + x1, y + y1); ctx.quadraticCurveTo(x + x1 - 5, y + (y1 + y2) / 2, x + x2, y + y2); ctx.stroke();
  });

  // Rounded pale head.
  ctx.fillStyle = "#f4f1dc";
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 4;
  roundRect(x + 7, y + 8, 51, 43, 12);
  ctx.fill();
  ctx.stroke();

  // Simple vertical eyes from the drawing.
  ctx.fillStyle = "#201f25";
  roundRect(x + 23, y + 25, 4, 15, 2); ctx.fill();
  roundRect(x + 43, y + 25, 4, 15, 2); ctx.fill();

  // Gold crown sits in front of the antlers.
  ctx.fillStyle = "#f2d93d";
  ctx.strokeStyle = "#201f25";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 10); ctx.lineTo(x + 18, y - 6); ctx.lineTo(x + 27, y + 1);
  ctx.lineTo(x + 33, y - 11); ctx.lineTo(x + 40, y + 1); ctx.lineTo(x + 50, y - 6);
  ctx.lineTo(x + 49, y + 11); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Wide branching antlers, placed behind the crown and head edges.
  ctx.strokeStyle = "#f2d93d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 18); ctx.lineTo(x + 2, y + 12); ctx.lineTo(x - 4, y - 2);
  ctx.moveTo(x + 3, y + 7); ctx.lineTo(x - 8, y + 4); ctx.lineTo(x - 8, y - 8);
  ctx.moveTo(x - 1, y + 9); ctx.lineTo(x + 9, y - 2);
  ctx.moveTo(x + 48, y + 18); ctx.lineTo(x + 64, y + 12); ctx.lineTo(x + 70, y - 2);
  ctx.moveTo(x + 63, y + 7); ctx.lineTo(x + 74, y + 4); ctx.lineTo(x + 74, y - 8);
  ctx.moveTo(x + 67, y + 9); ctx.lineTo(x + 57, y - 2);
  ctx.stroke();
  ctx.restore();
}function drawEnemy() { const x = enemy.x - world.cameraX, y = enemy.y; ctx.save(); ctx.shadowColor = enemy.restored ? "rgba(242,201,95,.8)" : "rgba(221,108,123,.8)"; ctx.shadowBlur = 18; ctx.fillStyle = enemy.restored ? "#f1ead8" : "#383445"; roundRect(x, y, enemy.width, enemy.height, 9); ctx.fill(); ctx.restore(); ctx.strokeStyle = "#34313b"; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = enemy.restored ? "#34313b" : "#dd6c7b"; roundRect(x + 11, y + 18, 5, 11, 3); ctx.fill(); roundRect(x + 27, y + 18, 5, 11, 3); ctx.fill(); if (enemy.restored) { ctx.font = "700 15px Trebuchet MS"; ctx.fillStyle = "#f2c95f"; ctx.fillText("...", x + 14, y - 14); } }
function drawDetails() { ctx.font = "700 18px Trebuchet MS"; ctx.fillStyle = "#f3eee1"; ctx.fillText("Old Sign: Restore, do not destroy.", 176 - world.cameraX, 398); ctx.strokeStyle = "#7767ca"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(690 - world.cameraX, 214); ctx.lineTo(650 - world.cameraX, 270); ctx.lineTo(730 - world.cameraX, 270); ctx.closePath(); ctx.stroke(); if (enemy.restored) { ctx.fillStyle = "#7ac878"; world.restoredPlants.forEach((plant) => { ctx.beginPath(); ctx.ellipse(plant.x - world.cameraX, plant.y, 8, 24, .4, 0, Math.PI * 2); ctx.ellipse(plant.x + 12 - world.cameraX, plant.y + 2, 8, 24, -.4, 0, Math.PI * 2); ctx.fill(); }); } }
function drawWorld() { drawBackground(); drawDetails(); drawEnemy(); drawPlayer(); }
function gameLoop(time) { const delta = time - lastTime; lastTime = time; if (currentScreen === "game" && delta < 80) { movePlayer(); moveEnemy(); if (!enemy.restored && performance.now() >= contactLockedUntil && rectangleOverlap(player, enemy)) startBattle(); drawWorld(); updateInteractionPrompt(); } animationFrameId = requestAnimationFrame(gameLoop); }
function roundRect(x, y, width, height, radius) { ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); }
function talkToNpc() { if (currentScreen === "game" && promptMode === "talk") { dialogueUntil = performance.now() + 4500; setPrompt("What happened? Hello? Who are you? Well... either way, thanks for saving me."); window.setTimeout(updateInteractionPrompt, 4500); } }
document.querySelector("#play-button").addEventListener("click", () => { storyIndex = 0; renderStory(); showScreen("story"); });
document.querySelector("#story-prev").addEventListener("click", () => { storyIndex = Math.max(0, storyIndex - 1); renderStory(); }); document.querySelector("#story-next").addEventListener("click", nextStory); document.querySelector("#story-skip").addEventListener("click", startGame);
document.querySelector("#upgrade-button").addEventListener("click", () => { updateUpgradeButtons(); showScreen("upgrades"); }); document.querySelector("#close-upgrades").addEventListener("click", () => showScreen("game")); document.querySelector("#reset-button").addEventListener("click", resetGame);
document.querySelector("#attack-action").addEventListener("click", attackAction); document.querySelector("#defend-action").addEventListener("click", defendAction); document.querySelector("#heal-action").addEventListener("click", healAction); document.querySelectorAll("[data-upgrade]").forEach((button) => button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade)));
window.addEventListener("keydown", (event) => { const key = event.key.toLowerCase(); if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "s", "d", "w"].includes(key)) event.preventDefault(); keys.add(key); if (key === "z") talkToNpc(); if (key === "u" && currentScreen === "game") { updateUpgradeButtons(); showScreen("upgrades"); } if (key === "escape" && currentScreen === "game") { updateUpgradeButtons(); showScreen("upgrades"); } if (currentScreen === "story" && key === "arrowright") nextStory(); if (currentScreen === "story" && key === "arrowleft") { storyIndex = Math.max(0, storyIndex - 1); renderStory(); } });
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
updateHud(); renderStory(); drawWorld();
