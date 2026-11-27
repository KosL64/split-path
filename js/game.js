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
  thorns: { cost: 10, requires: "defense", path: "defense", tier: 2, conflictsWith: "greaterDefense" },
  critRate: { cost: 15, requires: "greaterDamage", path: "damage", tier: 3, conflictsWith: "doubleAttack" },
  doubleAttack: { cost: 15, requires: "greaterDamage", path: "damage", tier: 3, conflictsWith: "critRate" },
  lightSpell2: { cost: 15, requires: "magic", path: "damage", tier: 3, conflictsWith: "soulSpell2" },
  soulSpell2: { cost: 15, requires: "magic", path: "damage", tier: 3, conflictsWith: "lightSpell2" },
  wither: { cost: 15, requires: "lifeSteal", path: "health", tier: 3 },
  higherHealth: { cost: 15, requires: "greaterHealth", path: "health", tier: 3, choiceGroup: "greaterHealthTier3", choiceLimit: 2 },
  strengthen: { cost: 15, requires: "greaterHealth", path: "health", tier: 3, choiceGroup: "greaterHealthTier3", choiceLimit: 2 },
  healOverTime: { cost: 15, requires: "greaterHealth", path: "health", tier: 3, choiceGroup: "greaterHealthTier3", choiceLimit: 2 },
  dodge: { cost: 15, requiresAny: ["greaterDefense", "thorns"], path: "defense", tier: 3 },
  flurry: { cost: 15, requiresAll: ["lightSpell2", "doubleAttack", "critRate"], path: "damage", tier: 4, attackBonus: 5 },
  soulSpell3: { cost: 15, requires: "soulSpell2", path: "damage", tier: 4, attackBonus: 5, choiceGroup: "soulSpellTier4", choiceLimit: 1 },
  soulBomb: { cost: 15, requires: "soulSpell2", path: "damage", tier: 4, attackBonus: 5, choiceGroup: "soulSpellTier4", choiceLimit: 1 },
  poison: { cost: 15, requires: "wither", path: "health", tier: 4, healthBonus: 10, choiceGroup: "poisonTier4", choiceLimit: 1 },
  venom: { cost: 15, requires: "wither", path: "health", tier: 4, healthBonus: 10, choiceGroup: "poisonTier4", choiceLimit: 1 },
  strengthen2: { cost: 15, requires: "strengthen", path: "health", tier: 4, healthBonus: 10 },
  healOverTime2: { cost: 15, requires: "healOverTime", path: "health", tier: 4, healthBonus: 10 },
  defendPlus: { cost: 15, requires: "greaterDefense", path: "defense", tier: 4, defenseBonus: 7 },
  reflect: { cost: 15, requires: "thorns", path: "defense", tier: 5, defenseBonus: 8 }
};

const storySlides = [
  "Once upon a time, the Pristine King ruled over the Pristine Kingdom.",
  "But one day, a shadow appeared, killed the king, and took his place.",
  "Every cube fell under control except for one.",
  "That cube was the king, reborn as a cube and drained of his power.",
  "By restoring cubes, the king can regain their power."
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
  keys.clear();
  if (["game", "upgrades", "credits", "story"].includes(name)) saveProgress();
}

function startGame() {
  if (activeSaveSlot !== null) saveSession.introComplete = true;
  enterArea("pristineCastle");
  showScreen("game");
  if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
}

function renderStory() {
  const slide = storySlides[storyIndex];
  document.querySelector("#story-slide").innerHTML = `
    <div class="story-copy">
      <p class="eyebrow">Story ${storyIndex + 1} / ${storySlides.length}</p>
      <p class="story-text">${slide}</p>
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
  const locationName = areas[currentAreaId].name;
  document.querySelector("#divine-points").textContent = `DP: ${playerState.divinePoints}`;
  document.querySelector("#player-stats").textContent = `${locationName} | Power ${playerState.restorePower} | Guard ${playerState.defense} | Health ${playerState.health}/${playerState.maxHealth}`;
  document.querySelector("#upgrade-points").textContent = `DP: ${playerState.divinePoints}`;
}

function startBattle(enemy) {
  if (bossDefeated(enemy) || battleBusy) return;
  saveProgress();
  clearAttackTiming();
  clearSkillChecks();
  window.clearTimeout(battleTimer);
  soulSpellUsed = false;
  soulSpellUsesThisBattle = 0;
  enemyStunTurns = 0;
  enemy.poisonStacks = [];
  defendPlusTriggered = false;
  defendPlusBlockNext = false;
  extraLifeActive = false;
  lastPlayerAction = null;
  battleAttackBoost = 0;
  battleDefenseBoost = 0;
  witherAttackCount = 0;
  healOverTimeAttackCount = 0;
  strengthenMenuOpen = false;
  activeEnemy = enemy;
  battleBusy = false;
  battleDefending = false;
  enemy.control = enemy.controlMax;
  magicMenuOpen = false;
  const battleEnemy = document.querySelector("#battle-enemy");
  battleEnemy.classList.remove("restored", "boss-cube");
  battleEnemy.style.backgroundImage = "";
  const bossSprite = enemy.regionBoss ? regionalBossSprites[enemy.regionBoss] : kyleSprite;
  if (enemy.kind === "boss" && bossSprite.complete && bossSprite.naturalWidth > 0) {
    battleEnemy.classList.add("boss-cube");
    battleEnemy.style.backgroundImage = `url("${bossSprite.src}")`;
  }
  document.querySelector("#battle-message").textContent = enemy.regionBoss
    ? "A guardian has appeared."
    : enemy.kind === "boss"
    ? `${enemy.name} blocks the path. The final battle begins!`
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
  const hasStrengthen = playerState.upgrades.strengthen > 0;
  document.querySelector("#attack-action").textContent = playerState.magic ? "Magic" : "Attack";
  document.querySelector("#attack-action").setAttribute("aria-expanded", String(playerState.magic && magicMenuOpen));
  const starfallUnlocked = daggerTestMode.starfallUnlocked && playerState.magic;
  document.querySelector("#light-spell-action").classList.toggle("hidden", !playerState.magic || !magicMenuOpen || starfallUnlocked);
  document.querySelector("#soul-spell-action").classList.toggle("hidden", !playerState.magic || !magicMenuOpen || starfallUnlocked);
  document.querySelector("#starfall-action").classList.toggle("hidden", !starfallUnlocked || !magicMenuOpen);
  document.querySelector("#heal-now-action").classList.toggle("hidden", !hasStrengthen || !strengthenMenuOpen);
  document.querySelector("#strengthen-attack-action").classList.toggle("hidden", !hasStrengthen || !strengthenMenuOpen);
  document.querySelector("#strengthen-defense-action").classList.toggle("hidden", !hasStrengthen || !strengthenMenuOpen);
  document.querySelector("#attack-action").disabled = battleBusy || !playerState.hasStaff;
  document.querySelector("#light-spell-action").disabled = battleBusy || !playerState.hasStaff || !playerState.magic;
  document.querySelector("#starfall-action").disabled = battleBusy || !playerState.hasStaff || !starfallUnlocked;
  const soulButton = document.querySelector("#soul-spell-action");
  const soulUsesLeft = Math.max(0, (playerState.upgrades.soulSpell3 ? 2 : 1) - soulSpellUsesThisBattle);
  soulButton.disabled = battleBusy || !playerState.hasStaff || !playerState.magic || soulUsesLeft === 0;
  soulButton.classList.toggle("spell-used", soulUsesLeft === 0);
  soulButton.setAttribute("aria-label", soulUsesLeft === 0 ? "Soul Spell, no uses left this battle"
    : `Soul Spell, ${soulUsesLeft} use${soulUsesLeft === 1 ? "" : "s"} left`);
  ["#heal-action", "#heal-now-action", "#strengthen-attack-action", "#strengthen-defense-action"].forEach((id) => { document.querySelector(id).disabled = battleBusy; });
}
function playBattleEffect(name) {
  const stage = document.querySelector(".battle-stage");
  stage.classList.remove("attack-effect", "defend-effect", "heal-effect");
  void stage.offsetWidth;
  stage.classList.add(name);
}

function enemyTurn() {
  if (currentScreen !== "battle" || !activeEnemy || activeEnemy.restored) return;
  const finishTurn = () => {
    battleDefending = false;
    tickPoison();
    updateBattleStats();
    if (activeEnemy?.control === 0) { finishRestoration(); return; }
    setBattleButtons(false);
  };
  if (enemyStunTurns > 0) {
    enemyStunTurns -= 1;
    document.querySelector("#battle-message").textContent += " The enemy is stunned and cannot attack.";
    finishTurn();
    return;
  }
  if (playerState.upgrades.venom && Math.random() < 0.05) applyPoison(activeEnemy, "Venom");
  if (playerState.upgrades.dodge && Math.random() < 0.07) {
    document.querySelector("#battle-message").textContent += " You dodge the enemy attack!";
    finishTurn();
    return;
  }
  const critical = rollCriticalHit();
  const effectiveDefense = Math.round(playerState.defense * (1 + battleDefenseBoost));
  const baseDamage = Math.max(1, activeEnemy.attack - effectiveDefense);
  const guardedCritical = critical && !(battleDefending && playerState.strongDefend);
  const incomingDamage = guardedCritical ? baseDamage * 2 : baseDamage;
  let damage = battleDefending && !guardedCritical ? Math.max(1, Math.round(incomingDamage / 2)) : incomingDamage;
  let reflectedDamage = 0;
  if (battleDefending && playerState.upgrades.reflect && Math.random() < 0.20) {
    damage = 0;
    reflectedDamage = Math.max(1, Math.round(incomingDamage * 0.40));
  }
  if (battleDefending && defendPlusBlockNext) {
    damage = 0;
    defendPlusBlockNext = false;
  }
  const thornsDamage = playerState.thorns ? Math.max(1, Math.round(activeEnemy.attack / 4)) : 0;
  battleDefending = false;
  playerState.health = Math.max(0, playerState.health - damage);
  const totalReflected = thornsDamage + reflectedDamage;
  if (totalReflected && activeEnemy) {
    activeEnemy.control = Math.max(0, activeEnemy.control - totalReflected);
  }
  updateBattleStats();

  if (activeEnemy?.control === 0) {
    document.querySelector("#battle-message").textContent += ` Your defenses reflect ${totalReflected} Control damage.`;
    finishRestoration();
    return;
  }

  if (playerState.health === 0) {
    if (extraLifeActive) {
      extraLifeActive = false;
      playerState.health = playerState.maxHealth;
      if (playerState.upgrades.venom) applyPoison(activeEnemy, "Extra Life venom");
      document.querySelector("#battle-message").textContent += " Extra Life brings you back at full health!";
    } else {
      tickPoison();
      if (activeEnemy?.control === 0) finishRestoration(); else showLoseScreen();
      return;
    }
  }

  const criticalText = critical && playerState.strongDefend && damage === baseDamage
    ? " Your stronger guard cancels the critical hit."
    : "";
  const thornsText = totalReflected ? ` Your defenses reflect ${totalReflected} Control damage.` : "";
  document.querySelector("#battle-message").textContent += guardedCritical
    ? ` Critical hit! The cube strikes back for ${damage} damage.`
    : ` The cube strikes back for ${damage} damage.`;
  document.querySelector("#battle-message").textContent += criticalText + thornsText;
  tickPoison();
  if (activeEnemy?.control === 0) { finishRestoration(); return; }
  setBattleButtons(false);
}

function applyPoison(enemy, source) {
  if (!enemy || enemy.restored || enemy.control <= 0) return;
  if (!Array.isArray(enemy.poisonStacks)) enemy.poisonStacks = [];
  const initialControl = enemy.control;
  enemy.poisonStacks.push({ initialControl, dealt: 0, cap: Math.floor(initialControl * 2 / 3) });
  document.querySelector("#battle-message").textContent += ` ${source} poisons the enemy.`;
}

function tickPoison() {
  if (!playerState.upgrades.poison || !activeEnemy?.poisonStacks?.length || activeEnemy.restored) return;
  let damageTotal = 0;
  activeEnemy.poisonStacks = activeEnemy.poisonStacks.filter((stack) => {
    const remaining = Math.max(0, stack.cap - stack.dealt);
    const damage = Math.min(remaining, Math.max(1, Math.floor(stack.initialControl * 0.10)), activeEnemy.control);
    if (damage > 0) {
      activeEnemy.control -= damage;
      stack.dealt += damage;
      damageTotal += damage;
    }
    return stack.dealt < stack.cap && activeEnemy.control > 0;
  });
  if (damageTotal) document.querySelector("#battle-message").textContent += ` Poison deals ${damageTotal} Control damage.`;
}

function queueEnemyTurn() {
  battleTimer = window.setTimeout(enemyTurn, 650);
}

function rollCriticalHit() {
  return Math.random() < playerState.criticalChance;
}

function showLoseScreen() {
  clearSkillChecks();
  clearAttackTiming();
  window.clearTimeout(battleTimer);
  setBattleButtons(false);
  showScreen("lose");
}

function revivePlayerAtAreaStart() {
  const area = areas[currentAreaId];
  playerState.health = playerState.maxHealth;
  player.x = area.start.x * config.tileSize + (config.tileSize - player.width) / 2;
  player.y = area.start.y * config.tileSize + 2;
  area.enemies.forEach((enemy) => {
    if (enemy.chasing || enemy.regionBoss) {
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
    }
    enemy.chasing = false;
    delete enemy.guardianPursuit;
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
  if (!playerState.hasStaff) { document.querySelector("#battle-message").textContent = "You need the Pristine Staff to attack."; return; }
  if (playerState.magic) { magicMenuOpen = !magicMenuOpen; updateBattleActions(); return; }
  performPlayerAttack({ name: "Attack", verb: "Your radiant slash", attackPower: playerState.restorePower, extraHeal: 0, canDouble: true });
}
function lightSpellAction() {
  if (battleBusy || !activeEnemy || !playerState.magic || !playerState.hasStaff) return;
  magicMenuOpen = false;
  updateBattleActions();
  performPlayerAttack({
    name: "Light Spell",
    verb: "Your light spell",
    attackPower: currentAttackPower() + 2 + playerState.lightSpellBonus,
    extraHeal: 0
  });
}

function starfallAction() {
  if (battleBusy || !activeEnemy || !playerState.magic || !playerState.hasStaff || !daggerTestMode.starfallUnlocked) return;
  magicMenuOpen = false;
  updateBattleActions();
  const stunTurns = playerState.soulSpellStunBonus ? 2 : 1;
  performPlayerAttack({ name: "Starfall Vengence", verb: "Starfall Vengence",
    fixedDamage: playerState.lightSpellBonus ? 55 : 50, stunTurns, areaAttack: true });
}

function soulSpellAction() {
  const maxUses = playerState.upgrades.soulSpell3 ? 2 : 1;
  if (battleBusy || !activeEnemy || soulSpellUsesThisBattle >= maxUses || !playerState.magic || !playerState.hasStaff) return;
  soulSpellUsesThisBattle += 1;
  soulSpellUsed = soulSpellUsesThisBattle >= maxUses;
  enemyStunTurns = 2 + playerState.soulSpellStunBonus;
  magicMenuOpen = false;
  updateBattleActions();
  performPlayerAttack({
    name: "Soul Spell",
    verb: "Your soul spell",
    fixedDamage: 2 + playerState.soulSpellBonus,
    extraHeal: 0,
    stunTurns: enemyStunTurns
  });
}

function performPlayerAttack(action) {
  if (currentScreen !== "battle" || !activeEnemy || activeEnemy.restored || battleBusy) return;
  setBattleButtons(true); playBattleEffect("attack-effect");
  const baseAttack = action.fixedDamage ?? Math.round(action.attackPower * (1 + battleAttackBoost));
  const critical = action.fixedDamage === undefined && rollCriticalHit();
  const oneStrike = action.fixedDamage === undefined ? damageAfterEnemyDefense(critical ? baseAttack * 2 : baseAttack, activeEnemy.defense) : action.fixedDamage;
  const doubleStrike = action.canDouble && playerState.doubleAttack && !playerState.upgrades.flurry && Math.random() < 0.15;
  const hitCount = doubleStrike ? 2 : 1;
  const power = oneStrike * hitCount;
  document.querySelector("#battle-message").textContent = "Your attack is ready.";
  updateBattleStats();
  const startedAt = performance.now();
  pendingAttack = { enemy: activeEnemy, power, extraHeal: action.extraHeal, hitCount, doubleStrike, canDouble: !!action.canDouble, verb: action.verb,
    stunTurns: action.stunTurns || 0, startedAt, deadline: startedAt + attackTimingDuration };
  const timing = document.querySelector("#attack-timing"); timing.classList.remove("timing-open"); void timing.offsetWidth; timing.classList.add("timing-open");
  document.querySelector("#attack-boost").disabled = false; attackTimingTimer = window.setTimeout(resolvePlayerAttack, attackTimingDuration);
}
function boostPlayerAttack() {
  if (currentScreen !== "battle" || !pendingAttack || performance.now() >= pendingAttack.deadline) return;
  const position = clamp((performance.now() - pendingAttack.startedAt) / attackTimingDuration, 0, 1);
  const distanceFromCenter = Math.abs(position - 0.5);
  const bonus = distanceFromCenter <= 0.025 ? 0.25 : distanceFromCenter <= 0.12 ? 0.2 : 0;
  resolvePlayerAttack(bonus);
}

function clearAttackTiming() {
  window.clearTimeout(attackTimingTimer);
  attackTimingTimer = null;
  pendingAttack = null;
  document.querySelector("#attack-timing").classList.remove("timing-open");
  document.querySelector("#attack-boost").disabled = true;
}

function resolvePlayerAttack(bonus = 0) {
  if (!pendingAttack) return;
  const { enemy, power: basePower, extraHeal, hitCount, critical, doubleStrike: pendingDoubleStrike, canDouble, verb, stunTurns } = pendingAttack;
  clearAttackTiming();
  if (currentScreen !== "battle" || enemy !== activeEnemy || enemy.restored) return;
  const flurry = playerState.upgrades.flurry && bonus === 0.25;
  const doubleStrike = canDouble && playerState.upgrades.flurry && playerState.doubleAttack
    ? Math.random() < (flurry ? 0.075 : 0.15)
    : pendingDoubleStrike;
  let power = Math.round(basePower * (1 + bonus));
  let effectiveHitCount = hitCount;
  if (flurry) {
    const lightSpellHit = damageAfterEnemyDefense(currentAttackPower() + 2 + playerState.lightSpellBonus, enemy.defense);
    power = Math.max(1, lightSpellHit - 3) * 4 * (doubleStrike ? 6 : 4);
    effectiveHitCount = doubleStrike ? 6 : 4;
  }
  const stunned = stunTurns > 0 && bonus === 0.25;
  if (stunned) enemyStunTurns = stunTurns;
  enemy.control = Math.max(0, enemy.control - power);
  const timingText = bonus === 0.25 ? "Perfect! +25%. " : bonus === 0.2 ? "Center hit! +20%. " : "";
  document.querySelector("#battle-message").textContent = `${timingText}${critical ? "Critical hit! " : ""}${flurry ? "Flurry" : verb} reduces Control by ${power}.${stunned ? ` Enemy stunned for ${stunTurns} turn${stunTurns === 1 ? "" : "s"}.` : ""}${doubleStrike ? " Double attack!" : ""}`;
  if (playerState.upgrades.poison && playerState.lifeSteal) {
    for (let hit = 0; hit < effectiveHitCount; hit += 1) if (Math.random() < 0.05) applyPoison(enemy, "Life Steal");
  }
  const lifeStealHeal = playerState.lifeSteal ? Math.max(1, Math.round(power / 2)) : 0;
  const finishAttack = (bonus) => completePlayerAttack(enemy, lifeStealHeal + Math.ceil(lifeStealHeal * bonus) + extraHeal, effectiveHitCount);
  if (playerState.lifeSteal) startSkillChecks('lifeSteal', skillCheckSettings.lifeStealCount, finishAttack);
  else finishAttack(0);
}

function completePlayerAttack(enemy, totalHeal, hitCount) {
  if (currentScreen !== 'battle' || activeEnemy !== enemy || enemy.restored) return;
  lastPlayerAction = "attack";
  if (totalHeal) { playerState.health = Math.min(playerState.maxHealth, playerState.health + totalHeal); document.querySelector("#battle-message").textContent += ` You restore ${totalHeal} health.`; }
  applyAttackMilestones(hitCount); updateBattleStats();
  if (activeEnemy.control === 0) { finishRestoration(); return; }
  queueEnemyTurn();
}
function applyAttackMilestones(hitCount) {
  if (playerState.wither) { witherAttackCount += hitCount; while (witherAttackCount >= 5) { witherAttackCount -= 5; const witherRate = activeEnemy.kind === "boss" ? 0.05 : 0.15; const damage = Math.round(activeEnemy.controlMax * witherRate); activeEnemy.control = Math.max(0, activeEnemy.control - damage); document.querySelector("#battle-message").textContent += ` Wither removes ${damage} Control.`; if (playerState.upgrades.poison && Math.random() < 0.25) applyPoison(activeEnemy, "Wither"); } }
  if (playerState.healOverTime) { healOverTimeAttackCount += hitCount; while (healOverTimeAttackCount >= 10) { healOverTimeAttackCount -= 10; const baseHeal = Math.round((playerState.maxHealth - playerState.health) * 0.2); const bonusHeal = playerState.upgrades.healOverTime2 ? healOverTimeBonus + 5 : 0; const healed = Math.min(baseHeal + bonusHeal, playerState.maxHealth - playerState.health); if (healed > 0) { playerState.health += healed; document.querySelector("#battle-message").textContent += ` Heal Over Time restores ${healed} health.`; } if (playerState.upgrades.healOverTime2) healOverTimeBonus += 5; } }
}
function currentAttackPower() {
  return playerState.magic ? playerState.restorePower + 1 : playerState.restorePower;
}

function damageAfterEnemyDefense(attack, defense) {
  return Math.max(1, Math.round(attack / Math.max(1, defense / 2)));
}

function defendAction() {
  if (currentScreen !== "battle" || !activeEnemy || bossDefeated(activeEnemy) || battleBusy) return;
  setBattleButtons(true);
  if (daggerTestMode.enabled) {
    battleDefending = false;
    playBattleEffect("defend-effect");
    activeEnemy.control = 0;
    updateBattleStats();
    finishRestoration();
    return;
  }
  const previousAction = lastPlayerAction;
  battleDefending = true;
  if (playerState.upgrades.defendPlus && !defendPlusTriggered) {
    const chance = Math.random() < 0.30;
    if (chance && previousAction === "attack") {
      defendPlusTriggered = true;
      defendPlusBlockNext = true;
      document.querySelector("#battle-message").textContent = "Defend+ activates! The next enemy attack deals no damage.";
    } else if (chance && previousAction === "heal") {
      defendPlusTriggered = true;
      extraLifeActive = true;
      if (playerState.upgrades.venom && Math.random() < 0.30) applyPoison(activeEnemy, "Defend+ venom");
      document.querySelector("#battle-message").textContent = "Defend+ activates! Extra Life will restore you to full health if you fall.";
    }
  }
  lastPlayerAction = "defend";
  playBattleEffect("defend-effect");
  if (!document.querySelector("#battle-message").textContent.startsWith("Defend+")) document.querySelector("#battle-message").textContent = playerState.strongDefend
    ? "A stronger protective light surrounds you. Enemy critical hits are canceled while defending."
    : "A protective light surrounds you. Your next hit is reduced.";
  queueEnemyTurn();
}

function healAction() {
  if (battleBusy) return;
  if (playerState.upgrades.strengthen) { strengthenMenuOpen = !strengthenMenuOpen; updateBattleActions(); return; }
  useHeal();
}
function useHeal() {
  if (currentScreen !== 'battle' || battleBusy || !activeEnemy || bossDefeated(activeEnemy)) return;
  setBattleButtons(true); playBattleEffect("heal-effect");
  healOverTimeBonus = 0;
  const enemy = activeEnemy;
  const finishHeal = (bonus) => {
    if (currentScreen !== 'battle' || activeEnemy !== enemy || enemy.restored) return;
    const amount = Math.round(playerState.healAmount * (1 + bonus));
    const restored = Math.min(amount, playerState.maxHealth - playerState.health);
    playerState.health += restored;
    lastPlayerAction = "heal";
    document.querySelector('#battle-message').textContent = restored ? `Warm light restores ${restored} health.` : 'Your health is already full.';
    updateBattleStats();
    queueEnemyTurn();
  };
  if (playerState.upgrades.health) startSkillChecks('heal', 1, finishHeal);
  else finishHeal(0);
}
function strengthenAction(stat) {
  if (battleBusy || playerState.health <= 1) return;
  setBattleButtons(true); const sacrifice = Math.ceil(playerState.health * (playerState.upgrades.strengthen2 ? 0.45 : 0.5)); playerState.health = Math.max(1, playerState.health - sacrifice);
  if (stat === "attack") battleAttackBoost += playerState.upgrades.strengthen2 ? 0.30 : 0.15; else battleDefenseBoost += playerState.upgrades.strengthen2 ? 0.30 : 0.15;
  strengthenMenuOpen = false; playBattleEffect("defend-effect");
  lastPlayerAction = "strengthen";
  document.querySelector("#battle-message").textContent = `Strengthen sacrifices ${sacrifice} health. ${stat === "attack" ? "Attack" : "Defense"} is boosted by ${playerState.upgrades.strengthen2 ? 30 : 15}% for this battle.`;
  updateBattleStats(); queueEnemyTurn();
}
function finishRestoration() {
  if (!activeEnemy || bossDefeated(activeEnemy)) return;
  const restoredEnemy = activeEnemy;
  if (restoredEnemy.id === "kyle-boss") awardSaveSticker("kyle-defeated");
  clearAttackTiming();
  clearSkillChecks();
  window.clearTimeout(battleTimer);
  const reward = restoredEnemy.kind !== "boss" && restoredEnemy.visual === "flying" ? 10 : config.restoreReward;
  playerState.divinePoints += reward;
  const { area, remainingEnemies, areaCleared } = restoreMapEnemy(activeEnemy, currentAreaId);
  checkFullRestorationSticker();
  saveProgress(true);
  document.querySelector("#battle-enemy").classList.add("restored");
  document.querySelector("#battle-message").textContent = `RESTORED! You earned ${reward} Divine Points.`;
  updateHud();

  window.clearTimeout(restorationTimer);
  restorationTimer = window.setTimeout(() => {
    restorationTimer = null;
    if (currentScreen !== "battle" || activeEnemy !== restoredEnemy) return;
    contactLockedUntil = performance.now() + config.contactCooldown;
    setBattleButtons(false);
    if (restoredEnemy.id === "kyle-boss") {
      document.querySelector("#credits-message").textContent = restoredEnemyAreas.size === 2
        ? "I think you missed a spot!"
        : "Thank you for playing Split Path.";
      showScreen("credits");
      return;
    }
    showScreen("upgrades");
    updateUpgradeButtons();
    document.querySelector("#upgrade-message").textContent = restoredEnemy.regionBoss
      ? `${restoredEnemy.name} is free. Its restored inhabitants now roam ${areas[restoredEnemy.regionBoss].name}.`
      : restoredEnemy.kind === "boss"
      ? "Kyle has been defeated. The Controlled Palace is free."
      : areaCleared
      ? regionalBossStates[currentAreaId]?.defeated
        ? `${area.name} is cleared. Its restored inhabitants are free.`
        : regionalBossDefinitions[currentAreaId]?.encounterArea
        ? `${area.name}: all ordinary enemies are restored. Its guardian awaits on ${areas[regionalBossDefinitions[currentAreaId].encounterArea].name}.`
        : `${area.name}: all ordinary enemies are restored. Its guardian has appeared.`
      : `${area.name}: ${remainingEnemies} controlled creatures remain.`;
  }, 900);
}

function checkFullRestorationSticker() {
  const restoredCount = Object.values(areas).flatMap(area => area.enemies).filter(enemy =>
    enemy.restored && !enemy.permanentResident
      && ['sylvan', 'azureApex', 'controlledPlains'].includes(enemy.originArea)
      && enemy.kind !== 'boss').length;
  if (restoredCount >= 106 && Object.values(regionalBossStates).every(boss => boss.defeated)) {
    awardSaveSticker('full-restoration');
  }
}

function buyUpgrade(type) {
  const upgrade = upgradeDefinitions[type]; if (!upgrade) return;
  if (playerState.upgrades[type]) { document.querySelector("#upgrade-message").textContent = "That path step is already chosen."; return; }
  if (upgrade.requires && !playerState.upgrades[upgrade.requires]) { document.querySelector("#upgrade-message").textContent = "Choose the earlier step on that path first."; return; }
  if (upgrade.requiresAll && !upgrade.requiresAll.every((id) => playerState.upgrades[id])) { document.querySelector("#upgrade-message").textContent = "Choose all required upgrades first."; return; }
  if (upgrade.requiresAny && !upgrade.requiresAny.some((id) => playerState.upgrades[id])) { document.querySelector("#upgrade-message").textContent = "Choose Greater Defense or Thorns first."; return; }
  if (upgrade.conflictsWith && playerState.upgrades[upgrade.conflictsWith]) { document.querySelector("#upgrade-message").textContent = "That branch is locked because you chose the other path."; return; }
  const choicesUsed = upgrade.choiceGroup ? Object.keys(upgradeDefinitions).filter((id) => upgradeDefinitions[id].choiceGroup === upgrade.choiceGroup && playerState.upgrades[id]).length : 0;
  if (upgrade.choiceGroup && choicesUsed >= upgrade.choiceLimit) { document.querySelector("#upgrade-message").textContent = "You can choose only two upgrades from this branch."; return; }
  if (playerState.divinePoints < upgrade.cost) { document.querySelector("#upgrade-message").textContent = `You need ${upgrade.cost} Divine Points.`; return; }
  playerState.divinePoints -= upgrade.cost; playerState.upgrades[type] = 1;
  if (upgrade.attackBonus) playerState.restorePower += upgrade.attackBonus;
  if (upgrade.healthBonus) {
    playerState.maxHealth += upgrade.healthBonus;
    playerState.health = Math.min(playerState.maxHealth, playerState.health + upgrade.healthBonus);
  }
  if (upgrade.defenseBonus) playerState.defense += upgrade.defenseBonus;
  if (["wither", "strengthen", "healOverTime"].includes(type)) {
    playerState.maxHealth += 3;
    playerState.health = Math.min(playerState.maxHealth, playerState.health + 3);
  }
  if (type === "damage") { playerState.restorePower += 5; document.querySelector("#upgrade-message").textContent = "Radiant Force I learned. Attack rises by 5."; }
  if (type === "defense") { playerState.defense += 5; document.querySelector("#upgrade-message").textContent = "Pristine Guard I learned. Defense rises by 5."; }
  if (type === "health") { playerState.maxHealth += 5; playerState.health = playerState.maxHealth; document.querySelector("#upgrade-message").textContent = "Soul Light I learned. Maximum health increased."; }
  if (type === "lifeSteal") { playerState.maxHealth += 3; playerState.health = Math.min(playerState.maxHealth, playerState.health + 3); playerState.lifeSteal = 1; document.querySelector("#upgrade-message").textContent = "Soul Siphon I learned. Health rises by 3 and attacks now restore health."; }
  if (type === "greaterHealth") { playerState.maxHealth += 13; playerState.health = playerState.maxHealth; playerState.healAmount += 5; document.querySelector("#upgrade-message").textContent = "Greater Soul Light learned."; }
  if (type === "greaterDamage") { playerState.restorePower += 5; document.querySelector("#upgrade-message").textContent = "Radiant Force II learned. Attack rises by 5."; }
  if (type === "magic") { playerState.restorePower += 4; playerState.magic = true; updateBattleActions(); document.querySelector("#upgrade-message").textContent = "Split Spellcraft learned. Attack rises by 4."; }
  if (type === "greaterDefense") { playerState.defense += 3; playerState.strongDefend = true; document.querySelector("#upgrade-message").textContent = "Pristine Guard II learned."; }
  if (type === "thorns") { playerState.defense += 3; playerState.thorns = true; document.querySelector("#upgrade-message").textContent = "Pristine Thorns learned."; }
  if (type === "critRate") { playerState.restorePower += 3; playerState.criticalChance = 0.30; document.querySelector("#upgrade-message").textContent = "Crit Rate learned: Attack rises by 3; 30% critical chance."; }
  if (type === "doubleAttack") { playerState.restorePower += 3; playerState.doubleAttack = true; document.querySelector("#upgrade-message").textContent = "Double Attack learned: Attack rises by 3; 15% chance to strike twice."; }
  if (type === "lightSpell2") { playerState.lightSpellBonus = 3; document.querySelector("#upgrade-message").textContent = "Light Spell 2 learned: +3 damage."; }
  if (type === "soulSpell2") { playerState.soulSpellBonus = 1; playerState.soulSpellStunBonus = 1; document.querySelector("#upgrade-message").textContent = "Soul Spell 2 learned."; }
  if (type === "wither") { playerState.wither = true; document.querySelector("#upgrade-message").textContent = "Wither learned: Health rises by 3; every 5 hits remove 15% maximum Control, or 5% against bosses."; }
  if (type === "higherHealth") { playerState.maxHealth += 10; playerState.health = playerState.maxHealth; document.querySelector("#upgrade-message").textContent = "Higher Health learned: +10 maximum health."; }
  if (type === "strengthen") { document.querySelector("#upgrade-message").textContent = "Strengthen learned. Health rises by 3; Heal now opens battle boosts."; }
  if (type === "healOverTime") { playerState.healOverTime = true; document.querySelector("#upgrade-message").textContent = "Heal Over Time learned. Health rises by 3."; }
  if (type === "dodge") { playerState.defense += 3; document.querySelector("#upgrade-message").textContent = "Dodge learned: Defense rises by 3; 7% chance to avoid attacks."; }
  if (upgrade.tier >= 4) document.querySelector("#upgrade-message").textContent = `${type.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`).replace(/^./, letter => letter.toUpperCase())} learned.`;
  updateUpgradeButtons();
  saveProgress();
}
function initializeDivineTree() {
  const tree = document.querySelector(".divine-tree");
  const buttons = new Map([...tree.querySelectorAll("[data-upgrade]")].map(button => [button.dataset.upgrade, button]));
  for (const button of buttons.values()) {
    const positionTooltip = () => {
      const bounds = button.getBoundingClientRect();
      const left = clamp(bounds.left + bounds.width / 2 - 95, 12, innerWidth - 202);
      button.style.setProperty("--tooltip-x", `${left - bounds.left}px`);
    };
    button.addEventListener("pointerenter", positionTooltip);
    button.addEventListener("focus", positionTooltip);
  }
  const element = (className) => {
    const node = document.createElement("div");
    node.className = className;
    return node;
  };
  const paths = element("divine-paths");
  const tierOrder = {
    damage: {
      2: ["greaterDamage", "magic"],
      3: ["critRate", "doubleAttack", "lightSpell2", "soulSpell2"],
      4: ["flurry", "soulSpell3", "soulBomb"]
    },
    health: {
      2: ["lifeSteal", "greaterHealth"],
      3: ["wither", "higherHealth", "strengthen", "healOverTime"],
      4: ["poison", "venom", "strengthen2", "healOverTime2"]
    },
    defense: {
      2: ["greaterDefense", "thorns"],
      3: ["dodge"],
      4: ["defendPlus", "reflect"]
    }
  };
  const groups = [];
  for (const path of ["damage", "health", "defense"]) {
    const group = element(`divine-path divine-path-${path}`);
    const connectors = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    connectors.classList.add("divine-connectors");
    connectors.setAttribute("aria-hidden", "true");
    group.append(connectors);
    for (const tier of [4, 3, 2, 1]) {
      const row = element(`divine-tier divine-tier-${tier}`);
      const ids = tier === 1 ? [path] : tierOrder[path][tier];
      row.style.gridTemplateColumns = `repeat(${ids.length}, minmax(0, 1fr))`;
      ids.forEach(id => row.append(buttons.get(id)));
      group.append(row);
    }
    groups.push(group);
    paths.append(group);
  }
  tree.replaceChildren(paths);
  const drawConnectors = () => {
    for (const group of groups) {
      const svg = group.querySelector(".divine-connectors");
      const bounds = group.getBoundingClientRect();
      svg.replaceChildren();
      svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      svg.setAttribute("width", bounds.width);
      svg.setAttribute("height", bounds.height);
      const nodes = new Map([...group.querySelectorAll("[data-upgrade]")].map(node => [node.dataset.upgrade, node]));
      for (const [id, child] of nodes) {
        const definition = upgradeDefinitions[id];
        const parents = definition.requiresAll || (definition.requiresAny ? definition.requiresAny : definition.requires ? [definition.requires] : definition.tier === 2 ? [definition.path] : []);
        for (const parentId of parents) {
          const parent = nodes.get(parentId);
          if (!parent) continue;
          const childRect = child.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          let x1 = childRect.left + childRect.width / 2;
          let y1 = childRect.bottom;
          let x2 = parentRect.left + parentRect.width / 2;
          let y2 = parentRect.top;
          if (childRect.top < parentRect.top && childRect.bottom > parentRect.top) {
            if (childRect.left < parentRect.left) { x1 = childRect.right; x2 = parentRect.left; }
            else { x1 = childRect.left; x2 = parentRect.right; }
            y1 = childRect.top + childRect.height / 2;
            y2 = parentRect.top + parentRect.height / 2;
          }
          line.setAttribute("x1", `${x1 - bounds.left}`);
          line.setAttribute("y1", `${y1 - bounds.top}`);
          line.setAttribute("x2", `${x2 - bounds.left}`);
          line.setAttribute("y2", `${y2 - bounds.top}`);
          line.classList.add("divine-connector-line");
          svg.append(line);
        }
      }
    }
  };
  requestAnimationFrame(drawConnectors);
  new ResizeObserver(drawConnectors).observe(tree);
  window.addEventListener("resize", drawConnectors);
}

function updateUpgradeButtons() {
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    const upgrade = upgradeDefinitions[button.dataset.upgrade];
    const purchased = playerState.upgrades[button.dataset.upgrade] > 0;
    const locked = upgrade?.requires && !playerState.upgrades[upgrade.requires];
    const requiresAnyLocked = upgrade?.requiresAny && !upgrade.requiresAny.some((id) => playerState.upgrades[id]);
    const requiresAllLocked = upgrade?.requiresAll && !upgrade.requiresAll.every((id) => playerState.upgrades[id]);
    const branchLocked = upgrade?.conflictsWith && playerState.upgrades[upgrade.conflictsWith];
    const choicesUsed = upgrade?.choiceGroup ? Object.keys(upgradeDefinitions).filter((id) => upgradeDefinitions[id].choiceGroup === upgrade.choiceGroup && playerState.upgrades[id]).length : 0;
    const choiceLocked = upgrade?.choiceGroup && choicesUsed >= upgrade.choiceLimit && !purchased;
    button.classList.toggle("purchased", purchased);
    button.classList.toggle("locked", !!locked || !!requiresAnyLocked || !!requiresAllLocked || !!branchLocked || !!choiceLocked);
    button.disabled = purchased || locked || requiresAnyLocked || requiresAllLocked || branchLocked || choiceLocked;
  });
  updateHud();
}
function resetGame() {
  clearSkillChecks();
  daggerTestMode.inspections = 0;
  daggerTestMode.enabled = false;
  daggerTestMode.starfallUnlocked = false;
  window.clearTimeout(restorationTimer);
  restorationTimer = null;
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
    hasStaff: false,
    criticalChance: config.criticalChance, doubleAttack: false, wither: false, healOverTime: false,
    lightSpellBonus: 0, soulSpellBonus: 0, soulSpellStunBonus: 0
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
    thorns: 0,
    critRate: 0, doubleAttack: 0, lightSpell2: 0, soulSpell2: 0, wither: 0,
    higherHealth: 0, strengthen: 0, healOverTime: 0, dodge: 0,
    flurry: 0, soulSpell3: 0, soulBomb: 0, poison: 0, venom: 0,
    strengthen2: 0, healOverTime2: 0, defendPlus: 0, reflect: 0
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

  if (currentScreen === "game" && delta < 80 && !document.querySelector('#save-confirm').open) {
    movePlayer();
    moveEnemies();
    updateCamera();
    checkAreaEncounters();
    if (currentScreen !== "game") {
      animationFrameId = requestAnimationFrame(gameLoop);
      return;
    }
    drawWorld();
    updateInteractionPrompt();
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

document.querySelector("#play-button").addEventListener("click", () => {
  openSaveMenu();
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
document.querySelector("#reset-button").addEventListener("click", confirmRestartSave);
document.querySelector("#save-menu-button").addEventListener("click", openSaveMenu);
document.querySelector("#credits-return").addEventListener("click", () => {
  saveProgress(); activeSaveSlot = null; resetGame(); showScreen("title");
});
document.querySelector("#attack-action").addEventListener("click", attackAction);
document.querySelector("#light-spell-action").addEventListener("click", lightSpellAction);
document.querySelector("#soul-spell-action").addEventListener("click", soulSpellAction);
document.querySelector("#starfall-action").addEventListener("click", starfallAction);
document.querySelector("#attack-boost").addEventListener("click", boostPlayerAttack);
document.querySelector('#skillcheck-hit').addEventListener('click', submitSkillCheck);
document.querySelector("#defend-action").addEventListener("click", defendAction);
document.querySelector("#heal-action").addEventListener("click", healAction);
document.querySelector("#heal-now-action").addEventListener("click", useHeal);
document.querySelector("#strengthen-attack-action").addEventListener("click", () => strengthenAction("attack"));
document.querySelector("#strengthen-defense-action").addEventListener("click", () => strengthenAction("defense"));
initializeDivineTree();
document.querySelectorAll("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
});

window.addEventListener("keydown", (event) => {
  if (document.querySelector('#save-confirm').open || currentScreen === 'saves') return;
  const key = event.key.toLowerCase();
  if (key === "d" && !event.repeat && currentScreen === "game" && gameMode === "area"
    && currentAreaId === "pristineCastle" && daggerTestMode.inspections > 0 && nearbyCastleFeature() === "dagger") {
    event.preventDefault();
    keys.delete(key);
    daggerTestMode.inspections = 0;
    daggerTestMode.enabled = false;
    daggerTestMode.starfallUnlocked = false;
    magicMenuOpen = false;
    updateBattleActions();
    showTemporaryPrompt("The dagger's hidden power fades.");
    return;
  }
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "s", "d", "w", " "].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);

  if (currentScreen === "battle" && key === "z") {
    event.preventDefault();
    if (!event.repeat) {
      if (activeSkillCheck) submitSkillCheck();
      else boostPlayerAttack();
    }
    return;
  }

  if (currentScreen === "lose" && (key === "z" || key === " ")) {
    revivePlayerAtAreaStart();
    return;
  }

  if (currentScreen === "game" && !event.repeat && (key === "enter" || key === " ") && dismissDialogue()) {
    event.preventDefault();
    return;
  }
  if (currentScreen === "game" && !event.repeat && (key === "e" || key === "m")) {
    quickExitInterior();
    return;
  }

  const daggerCodeReady = !event.repeat && currentScreen === "game" && gameMode === "area"
    && currentAreaId === "pristineCastle" && daggerTestMode.inspections >= 3;
  if (key === "h" && daggerCodeReady && !daggerTestMode.enabled) {
    daggerTestMode.enabled = true;
  }
  if (key === "=" && daggerCodeReady && !daggerTestMode.starfallUnlocked) {
    daggerTestMode.starfallUnlocked = true;
  }
  if ((key === "z" || key === "enter") && !event.repeat) usePrompt();
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

initializeOverworld();
initializeAreaRockDecorations();
initializeAreaEnemies();
initializeBoss();
chooseSpecialVillageResident();
updateHud();
updateBattleActions();
renderStory();
drawWorld();
initializeSaveSystem();
