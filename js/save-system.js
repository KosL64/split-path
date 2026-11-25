// Four independent browser-local saves. Only durable world state crosses a reload.
const saveVersion = 1;
const saveKey = index => `split-path.save.v${saveVersion}.${index + 1}`;
let activeSaveSlot = null;
let saveSession = null;
let loadingSave = false;
let saveConfirmation = null;
let saveStatusTimer = null;
let saveStorageFailed = false;
const memorySaveSlots = Array(4).fill(null);
const volatileSaveSlots = new Set();
const savedEnemyFields = (`id name kind visual originArea level attack defense maxHealth controlMax control
  x y width height spawnX spawnY restored relocated permanentResident facing talked stationary earlyKyle regionBoss
  villageSlot homeAreaId villageX villageY plainsFirstCubeDialogueSaid plainsFollowupDialogueSaid
  villageBadDaySaid villageLeftAfterBadDay villageApologyReady villageApologySaid`).split(/\s+/);

function saveNotice(message, persistent = false) {
  window.clearTimeout(saveStatusTimer);
  document.querySelector('#save-status').textContent = message;
  if (!persistent) saveStatusTimer = window.setTimeout(() => { document.querySelector('#save-status').textContent = ''; }, 4000);
}

function storageFailure() {
  saveStorageFailed = true;
  const message = 'Browser storage is unavailable. Changes will only last until this page closes. Existing saves have not been deleted.';
  document.querySelector('#save-storage-note').textContent = message;
  saveNotice(message, true);
}

function validSave(data) {
  if (!data || data.version !== saveVersion || !data.playerState || !data.world || !data.player
    || !areas[data.areaId] || typeof data.introComplete !== 'boolean' || typeof data.completed !== 'boolean'
    || !Number.isFinite(data.createdAt) || !Number.isFinite(data.updatedAt)
    || Object.keys(data.world).length !== Object.keys(areas).length || Object.keys(data.world).some(id => !areas[id])
    || !Array.isArray(data.stickers) || data.stickers.some(id => typeof id !== 'string' || id.length > 48 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    || !Number.isInteger(data.storyIndex) || data.storyIndex < 0 || data.storyIndex >= storySlides.length) return false;
  const primitive = value => ['string', 'boolean'].includes(typeof value) || (Number.isFinite(value) && Math.abs(value) <= 10000000);
  for (const [key, value] of Object.entries(playerState)) {
    if (key === 'upgrades') continue;
    if (typeof data.playerState[key] !== typeof value || !primitive(data.playerState[key])) return false;
    if (typeof value === 'number' && data.playerState[key] < 0) return false;
  }
  if (!data.playerState.upgrades || !Object.keys(playerState.upgrades).every(key => [0, 1].includes(data.playerState.upgrades[key]))
    || data.playerState.maxHealth < 1 || data.playerState.health > data.playerState.maxHealth) return false;
  if (!['x', 'y', 'facing'].every(key => Number.isFinite(data.player[key]))
    || !['front', 'back', 'side'].includes(data.player.view)
    || Math.abs(data.player.x) > 100000 || Math.abs(data.player.y) > 100000) return false;
  if (!data.castle || typeof data.castle.exitCleared !== 'boolean' || !data.regions || !data.dialogue
    || !Array.isArray(data.dialogue.restoredAreas) || data.dialogue.restoredAreas.some(id => !areas[id])) return false;
  if (![data.dialogue.firstCube, data.dialogue.specialResident, data.dialogue.friendAskedBy].every(id => id === null || typeof id === 'string')
    || typeof data.dialogue.friendThanks !== 'boolean') return false;
  const ids = new Set();
  for (const [areaId, area] of Object.entries(areas)) {
    const state = data.world[areaId];
    if (!state || typeof state.healed !== 'boolean' || !Array.isArray(state.enemies) || state.enemies.length > 200) return false;
    for (const enemy of state.enemies) {
      if (!enemy || typeof enemy.id !== 'string' || ids.has(enemy.id) || !areas[enemy.originArea]
        || !['ground', 'flying', 'boss'].includes(enemy.visual) || typeof enemy.restored !== 'boolean'
        || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(enemy[key]))
        || enemy.width <= 0 || enemy.height <= 0
        || Object.entries(enemy).some(([key, value]) => !savedEnemyFields.includes(key) || !primitive(value))) return false;
      ids.add(enemy.id);
    }
    // Every ordinary creature must exist, even when it is displayed in a village.
    if (areaEnemyGoals[areaId] && state.enemies.filter(enemy => !enemy.regionBoss && !enemy.permanentResident).length !== areaEnemyGoals[areaId]) return false;
  }
  for (const region of Object.keys(regionalBossDefinitions)) {
    const state = data.regions[region];
    if (!state || typeof state.defeated !== 'boolean' || typeof state.revealed !== 'boolean'
      || !data.world.controlledPalace.enemies.some(enemy => enemy.regionBoss === region)) return false;
  }
  if (Object.keys(data.regions).length !== Object.keys(regionalBossDefinitions).length) return false;
  if (!data.world.palaceUpper.enemies.some(enemy => enemy.id === 'kyle-boss')) return false;
  return [data.dialogue.firstCube, data.dialogue.specialResident, data.dialogue.friendAskedBy].every(id => id === null || ids.has(id));
}

function readSaveSlot(index) {
  let raw;
  try { raw = volatileSaveSlots.has(index) ? memorySaveSlots[index] : localStorage.getItem(saveKey(index)); }
  catch { storageFailure(); raw = memorySaveSlots[index]; }
  if (!raw) return { status: 'empty', data: null };
  try {
    const data = JSON.parse(raw);
    return validSave(data) ? { status: 'ready', data } : { status: 'damaged', data: null };
  } catch { return { status: 'damaged', data: null }; }
}

function captureSave() {
  const world = {};
  for (const [id, area] of Object.entries(areas)) {
    world[id] = { healed: !!area.healed, enemies: area.enemies.map(enemy => Object.fromEntries(
      savedEnemyFields.filter(key => enemy[key] !== undefined).map(key => [key, enemy[key]]))) };
  }
  const completed = !!areas.palaceUpper.enemies.find(enemy => enemy.id === 'kyle-boss')?.restored;
  return {
    version: saveVersion, createdAt: saveSession.createdAt, updatedAt: Date.now(),
    introComplete: saveSession.introComplete, completed, stickers: [...saveSession.stickers], storyIndex,
    areaId: currentAreaId,
    player: { x: castleState.sitting ? castleState.standX : player.x,
      y: castleState.sitting ? castleState.standY : player.y, facing: player.facing, view: player.view },
    playerState: JSON.parse(JSON.stringify(playerState)), world,
    castle: { exitCleared: castleState.exitCleared },
    regions: Object.fromEntries(Object.entries(regionalBossStates).map(([id, state]) => [id, { defeated: state.defeated, revealed: state.revealed }])),
    dialogue: { firstCube: firstControlledPlainsCubeId, specialResident: specialVillageResident?.id || null,
      friendAskedBy: sylvanFriendAskedBy, friendThanks: sylvanFriendThanksSaid, restoredAreas: [...restoredEnemyAreas] }
  };
}

function saveProgress(restorationComplete = false) {
  if (activeSaveSlot === null || loadingSave || !saveSession) return;
  if (!['game', 'upgrades', 'story', 'credits'].includes(currentScreen)
    && !(restorationComplete && currentScreen === 'battle' && activeEnemy?.restored)) return;
  const raw = JSON.stringify(captureSave());
  memorySaveSlots[activeSaveSlot] = raw;
  try { localStorage.setItem(saveKey(activeSaveSlot), raw); }
  catch { volatileSaveSlots.add(activeSaveSlot); storageFailure(); }
}

function awardSaveSticker(id) {
  if (activeSaveSlot !== null && saveSession && !saveSession.stickers.has(id)) {
    saveSession.stickers.add(id);
    saveNotice('A new sticker was added to your save!');
    saveProgress();
  }
}

function openSaveMenu() {
  saveProgress();
  activeSaveSlot = null;
  clearInteractionState();
  renderSaveSlots();
  showScreen('saves');
}

function renderSaveSlots() {
  const list = document.querySelector('#save-slots');
  list.replaceChildren();
  for (let index = 0; index < 4; index += 1) {
    const slot = readSaveSlot(index);
    const card = document.createElement('article'); card.className = 'save-card';
    const open = document.createElement('button'); open.className = 'save-open'; open.dataset.slot = index;
    const heading = document.createElement('strong'); heading.textContent = `Save ${index + 1}`;
    const summary = document.createElement('span');
    if (slot.status === 'ready') {
      const data = slot.data;
      const restored = Object.values(data.world).flatMap(area => area.enemies)
        .filter(enemy => enemy.restored && !enemy.permanentResident && ['sylvan', 'azureApex', 'controlledPlains'].includes(enemy.originArea) && enemy.kind !== 'boss').length;
      summary.textContent = `${data.completed ? 'Journey complete' : !data.introComplete ? 'New journey' : areas[data.areaId].name} · ${restored}/106 restored`;
      const date = document.createElement('span'); date.textContent = `Saved ${new Date(data.updatedAt).toLocaleString()}`;
      open.append(heading, summary, date);
      const stickerNames = { patience: 'Waiting Game', 'night-plains': 'Pink at Night', 'rare-kyle': 'Too early Kyle!', 'full-restoration': 'Full Restoration', 'kyle-defeated': 'Recrowned' };
      const stickerSprites = {
        patience: 'img/assets/stickers/waiting-game.png',
        'night-plains': 'img/assets/stickers/pink-at-night.png',
        'rare-kyle': 'img/assets/stickers/too-early-kyle.png',
        'full-restoration': 'img/assets/stickers/full-restoration.png',
        'kyle-defeated': 'img/assets/stickers/recrowned.png'
      };
      data.stickers.forEach((id, stickerIndex) => {
        const sticker = document.createElement('span');
        const sprite = stickerSprites[id];
        sticker.className = `save-sticker ${sprite ? 'sticker-sprite' : stickerIndex % 2 ? 'sticker-magenta' : 'sticker-blue'}`;
        sticker.style.left = `${24 + stickerIndex * 52 + (sprite ? 0 : 14)}px`;
        if (sprite) sticker.style.backgroundImage = `url("${sprite}")`;
        sticker.title = stickerNames[id] || 'Sticker'; sticker.setAttribute('role', 'img');
        sticker.setAttribute('aria-label', `${stickerNames[id] || 'Game'} sticker`); card.append(sticker);
      });
    } else {
      summary.textContent = slot.status === 'empty' ? 'Empty slot · Begin a new journey' : 'This save cannot be loaded. Other saves are unaffected.';
      open.append(heading, summary); open.disabled = slot.status === 'damaged';
    }
    open.addEventListener('click', () => selectSaveSlot(index)); card.append(open);
    if (slot.status !== 'empty') {
      const trash = document.createElement('button'); trash.className = 'save-delete'; trash.dataset.deleteSlot = index;
      trash.setAttribute('aria-label', `Delete Save ${index + 1}`);
      trash.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg>';
      trash.addEventListener('click', () => requestSaveConfirmation('delete', index)); card.append(trash);
    }
    list.append(card);
  }
}

function selectSaveSlot(index) {
  const slot = readSaveSlot(index);
  if (slot.status === 'damaged') return;
  loadingSave = true;
  activeSaveSlot = null;
  resetGame();
  if (slot.data) restoreSave(slot.data);
  else { storyIndex = 0; saveSession = { createdAt: Date.now(), stickers: new Set(), introComplete: false }; }
  activeSaveSlot = index;
  loadingSave = false;
  awardNightPlainsStickerIfEligible();
  checkFullRestorationSticker();
  renderStory(); updateBattleActions(); updateUpgradeButtons(); updateCamera(); drawWorld();
  if (slot.data?.completed) {
    document.querySelector('#credits-message').textContent = restoredEnemyAreas.size === 2 ? 'I think you missed a spot!' : 'Thank you for playing Split Path.';
    showScreen('credits');
  } else showScreen(saveSession.introComplete ? 'game' : 'story');
  if (!animationFrameId) { lastTime = performance.now(); animationFrameId = requestAnimationFrame(gameLoop); }
}

function restoreSave(data) {
  Object.assign(playerState, data.playerState, { upgrades: { ...data.playerState.upgrades } });
  for (const [id, state] of Object.entries(data.world)) {
    areas[id].healed = state.healed;
    areas[id].enemies = state.enemies.map(enemy => ({ ...enemy, route: [], routeUntil: 0,
      movingUntil: 0, waitUntil: 0, villageMovingUntil: 0, villageWaitUntil: 0, moveX: 0, moveY: 0, chasing: false }));
  }
  for (const [region, state] of Object.entries(data.regions)) {
    Object.assign(regionalBossStates[region], state, { palaceEnemy: areas.controlledPalace.enemies.find(enemy => enemy.regionBoss === region) });
  }
  castleState.exitCleared = data.castle.exitCleared;
  firstControlledPlainsCubeId = data.dialogue.firstCube;
  specialVillageResident = Object.values(areas).flatMap(area => area.enemies).find(enemy => enemy.id === data.dialogue.specialResident) || null;
  sylvanFriendAskedBy = data.dialogue.friendAskedBy; sylvanFriendThanksSaid = data.dialogue.friendThanks;
  restoredEnemyAreas = new Set(data.dialogue.restoredAreas);
  storyIndex = data.storyIndex;
  saveSession = { createdAt: data.createdAt, stickers: new Set(data.stickers), introComplete: data.introComplete };
  currentAreaId = data.areaId; Object.assign(player, data.player);
  clearInteractionState(); keys.clear();
  contactLockedUntil = performance.now() + 2500;
  updateVillageLocks(); updatePlainsRestoration();
}

function requestSaveConfirmation(action, index) {
  saveConfirmation = { action, index };
  const restart = action === 'restart';
  document.querySelector('#save-confirm-heading').textContent = `${restart ? 'Restart' : 'Delete'} Save ${index + 1}?`;
  document.querySelector('#save-confirm-copy').textContent = `All progress and stickers in Save ${index + 1} will be ${restart ? 'reset' : 'deleted'}. Other saves will stay as they are.`;
  document.querySelector('#save-confirm-yes').textContent = restart ? 'Yes, restart' : 'Yes, delete';
  document.querySelector('#save-confirm').showModal(); keys.clear();
}

function confirmRestartSave() {
  if (activeSaveSlot === null) { resetGame(); return; }
  requestSaveConfirmation('restart', activeSaveSlot);
}

function initializeSaveSystem() {
  const dialog = document.querySelector('#save-confirm');
  document.querySelector('#save-confirm-no').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { saveConfirmation = null; keys.clear(); });
  document.querySelector('#save-confirm-yes').addEventListener('click', () => {
    const pending = saveConfirmation;
    if (!pending) return;
    if (pending.action === 'delete') {
      try { localStorage.removeItem(saveKey(pending.index)); }
      catch { saveNotice('This save could not be deleted. Please try again.', true); return; }
      memorySaveSlots[pending.index] = null;
      volatileSaveSlots.delete(pending.index);
      if (activeSaveSlot === pending.index) activeSaveSlot = null;
      dialog.close(); renderSaveSlots();
      document.querySelector(`[data-slot="${pending.index}"]`).focus();
    } else {
      activeSaveSlot = null; resetGame(); storyIndex = 0;
      saveSession = { createdAt: Date.now(), stickers: new Set(), introComplete: false };
      activeSaveSlot = pending.index; dialog.close(); renderStory(); showScreen('story');
    }
  });
  document.querySelector('#save-back').addEventListener('click', () => showScreen('title'));
  window.setInterval(saveProgress, 5000);
  window.addEventListener('pagehide', () => saveProgress());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); saveProgress(); } });
}
