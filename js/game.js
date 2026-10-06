// game: see CODE-OWNERSHIP.md for shared state and loading order.

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

const storySlides = [
  { title: "The King", text: "Long ago, the Pristine King watched over the cubes and souls of the land.", image: "img/split-path-lore.png" },
  { title: "The Takeover", text: "A mysterious figure appeared. One by one, cubes across the kingdom fell under its control.", image: "img/split-path-1.jpg" },
  { title: "Reborn", text: "The king's power was taken, and he awakened again in a new form.", image: "img/split-path-1.jpg" },
  { title: "Divine Points", text: "By restoring controlled creatures, the king earns Divine Points: chips of light created through good deeds.", image: "notes/NOT DWIN POINTS!!!.png" },
  { title: "The Split Path", text: "Every point brings him closer to his former power, but the path back can split in many directions.", image: "img/split-path-2.jpg" }
];

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

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
  currentScreen = name;
}

function startGame() {
  enterArea("pristineCastle");
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

function startBattle(enemy) {
  if (enemy.restored || battleBusy) return;
  clearAttackTiming();
  window.clearTimeout(battleTimer);
  soulSpellUsed = false;
  enemyStunTurns = 0;
  activeEnemy = enemy;
  battleBusy = false;
  battleDefending = false;
  enemy.control = enemy.controlMax;
  magicMenuOpen = false;
  const battleEnemy = document.querySelector("#battle-enemy");
  battleEnemy.classList.remove("restored", "boss-cube");
  battleEnemy.style.backgroundImage = "";
  if (enemy.kind === "boss" && kyleSprite.complete && kyleSprite.naturalWidth > 0) {
    battleEnemy.classList.add("boss-cube");
    battleEnemy.style.backgroundImage = `url('${kyleSpritePath}')`;
  }
  document.querySelector("#battle-message").textContent = enemy.kind === "boss"
    ? "Kyle blocks the path. The final battle begins!"
    : enemy.visual === "flying"
    ? `A lv ${enemy.level} controlled soul spotted you.`
    : `A level ${enemy.level} controlled cube lashes out. Purify it with your attacks.`;
  updateBattleActions();
  showScreen("battle");
  setBattleButtons(false);
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
  if (!playerState.hasStaff) {
    document.querySelector("#attack-action").disabled = true;
    document.querySelector("#light-spell-action").disabled = true;
    document.querySelector("#soul-spell-action").disabled = true;
  }
  updateBattleActions();
}

function updateBattleActions() {
  document.querySelector("#attack-action").textContent = playerState.magic ? "Magic" : "Attack";
  document.querySelector("#attack-action").setAttribute("aria-expanded", String(playerState.magic && magicMenuOpen));
  document.querySelector("#light-spell-action").classList.toggle("hidden", !playerState.magic || !magicMenuOpen);
  document.querySelector("#soul-spell-action").classList.toggle("hidden", !playerState.magic || !magicMenuOpen);
  document.querySelector("#attack-action").disabled = battleBusy || !playerState.hasStaff;
  document.querySelector("#light-spell-action").disabled = battleBusy || !playerState.hasStaff || !playerState.magic;
  const soulButton = document.querySelector("#soul-spell-action");
  soulButton.disabled = battleBusy || !playerState.hasStaff || !playerState.magic || soulSpellUsed;
  soulButton.classList.toggle("spell-used", soulSpellUsed);
  soulButton.setAttribute("aria-label", soulSpellUsed ? "Soul Spell, already used this battle" : "Soul Spell");
}

function playBattleEffect(name) {
  const stage = document.querySelector(".battle-stage");
  stage.classList.remove("attack-effect", "defend-effect", "heal-effect");
  void stage.offsetWidth;
  stage.classList.add(name);
}

function enemyTurn() {
  if (enemyStunTurns > 0) {
    enemyStunTurns -= 1;
    battleDefending = false;
    document.querySelector("#battle-message").textContent += " The enemy is stunned and cannot attack.";
    setBattleButtons(false);
    return;
  }
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
  clearAttackTiming();
  window.clearTimeout(battleTimer);
  setBattleButtons(false);
  showScreen("lose");
}

function revivePlayerAtAreaStart() {
  const area = areas[currentAreaId];
  playerState.health = playerState.maxHealth;
  player.x = area.start.x * config.tileSize + 6;
  player.y = area.start.y * config.tileSize + 2;
  area.enemies.forEach((enemy) => {
    if (enemy.chasing) {
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
    }
    enemy.chasing = false;
    enemy.route = [];
    enemy.routeUntil = 0;
    enemy.movingUntil = 0;
  });
  contactLockedUntil = performance.now() + config.contactCooldown * 2;
  updateHud();
  showScreen("game");
}

function attackAction() {
  if (battleBusy || !activeEnemy) return;
  if (!playerState.hasStaff) {
    document.querySelector("#battle-message").textContent = "You need the Pristine Staff to attack.";
    return;
  }
  if (playerState.magic) {
    magicMenuOpen = !magicMenuOpen;
    updateBattleActions();
    return;
  }
  performPlayerAttack({
    name: "Attack",
    verb: "Your radiant slash",
    attackPower: playerState.restorePower,
    extraHeal: 0
  });
}

function lightSpellAction() {
  if (battleBusy || !activeEnemy || !playerState.magic || !playerState.hasStaff) return;
  magicMenuOpen = false;
  updateBattleActions();
  performPlayerAttack({
    name: "Light Spell",
    verb: "Your light spell",
    attackPower: currentAttackPower() + 2,
    extraHeal: 0
  });
}

function soulSpellAction() {
  if (battleBusy || !activeEnemy || soulSpellUsed || !playerState.magic || !playerState.hasStaff) return;
  soulSpellUsed = true;
  enemyStunTurns = 2;
  magicMenuOpen = false;
  updateBattleActions();
  performPlayerAttack({
    name: "Soul Spell",
    verb: "Your soul spell",
    fixedDamage: 2,
    extraHeal: 0
  });
}

function performPlayerAttack(action) {
  setBattleButtons(true);
  playBattleEffect("attack-effect");
  const critical = action.fixedDamage === undefined && rollCriticalHit();
  const attackPower = action.attackPower;
  const power = action.fixedDamage ?? damageAfterEnemyDefense(critical ? attackPower * 2 : attackPower, activeEnemy.defense);
  activeEnemy.control = Math.max(0, activeEnemy.control - power);
  document.querySelector("#battle-message").textContent = critical
    ? `Critical hit! ${action.verb} reduces Control by ${power}.`
    : `${action.verb} reduces Control by ${power}.`;
  if (action.fixedDamage !== undefined) document.querySelector("#battle-message").textContent += " Stunned for 2 turns.";
  updateBattleStats();

  pendingAttack = { power, extraHeal: action.extraHeal, deadline: performance.now() + 1000 };
  const timing = document.querySelector("#attack-timing");
  timing.classList.remove("timing-open");
  void timing.offsetWidth;
  timing.classList.add("timing-open");
  document.querySelector("#attack-boost").disabled = false;
  attackTimingTimer = window.setTimeout(resolvePlayerAttack, 1000);
}

function boostPlayerAttack() {
  if (currentScreen !== "battle" || !pendingAttack || performance.now() >= pendingAttack.deadline) return;
  const boostedPower = Math.round(pendingAttack.power * 1.2);
  activeEnemy.control = Math.max(0, activeEnemy.control - (boostedPower - pendingAttack.power));
  pendingAttack.power = boostedPower;
  document.querySelector("#battle-message").textContent = `Boosted! Your attack reduces Control by ${boostedPower}.`;
  updateBattleStats();
  resolvePlayerAttack();
}

function clearAttackTiming() {
  window.clearTimeout(attackTimingTimer);
  attackTimingTimer = null;
  pendingAttack = null;
  document.querySelector("#attack-timing").classList.remove("timing-open");
  document.querySelector("#attack-boost").disabled = true;
}

function resolvePlayerAttack() {
  if (!pendingAttack) return;
  const { power, extraHeal } = pendingAttack;
  clearAttackTiming();
  const lifeStealHeal = playerState.lifeSteal ? Math.max(1, Math.round(power / 2)) : 0;
  const totalHeal = lifeStealHeal + extraHeal;
  if (totalHeal) {
    playerState.health = Math.min(playerState.maxHealth, playerState.health + totalHeal);
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
  clearAttackTiming();
  window.clearTimeout(battleTimer);
  playerState.divinePoints += config.restoreReward;
  const { area, remainingEnemies, areaCleared } = restoreMapEnemy(activeEnemy, currentAreaId);
  document.querySelector("#battle-enemy").classList.add("restored");
  document.querySelector("#battle-message").textContent = `RESTORED! You earned ${config.restoreReward} Divine Points.`;
  updateHud();

  window.setTimeout(() => {
    contactLockedUntil = performance.now() + config.contactCooldown;
    setBattleButtons(false);
    showScreen("upgrades");
    updateUpgradeButtons();
    document.querySelector("#upgrade-message").textContent = activeEnemy.kind === "boss"
      ? "Kyle has been defeated. The Controlled Palace is free."
      : areaCleared
      ? `${area.name} is cleared. Every restored resident is safe in the village.`
      : `${area.name}: ${remainingEnemies} controlled creatures remain.`;
  }, 900);
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
    playerState.restorePower += 5;
    document.querySelector("#upgrade-message").textContent = "Radiant Force I learned. Attack rises by 5.";
  }

  if (type === "defense") {
    playerState.defense += 5;
    document.querySelector("#upgrade-message").textContent = "Pristine Guard I learned. Defense rises by 5.";
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
  clearAttackTiming();
  window.clearTimeout(battleTimer);
  soulSpellUsed = false;
  enemyStunTurns = 0;
  battleBusy = false;
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
    magic: false,
    hasStaff: false
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
  resetMapState();
  document.querySelector("#attack-action").textContent = "Attack";
  updateBattleActions();
  magicMenuOpen = false;
  enterArea("pristineCastle");
  contactLockedUntil = 0;
  updateUpgradeButtons();
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
document.querySelector("#attack-boost").addEventListener("click", boostPlayerAttack);
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

  if (currentScreen === "battle" && key === "z") {
    event.preventDefault();
    if (!event.repeat) boostPlayerAttack();
    return;
  }

  if (currentScreen === "lose" && (key === "z" || key === " ")) {
    revivePlayerAtAreaStart();
    return;
  }

  if (key === "z" || key === "enter") usePrompt();
  if (key === "m" && currentScreen === "game" && gameMode === "area" && (currentAreaId !== "pristineCastle" || castleState.exitCleared)) leaveArea();
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

initializeAreaRockDecorations();
initializeAreaEnemies();
initializeBoss();
updateHud();
updateBattleActions();
renderStory();
drawWorld();
