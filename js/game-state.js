// game-state: see CODE-OWNERSHIP.md for shared state and loading order.

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
  hasStaff: false,
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
let storyIndex = 0;
let lastTime = 0;
let animationFrameId = null;
let battleDefending = false;
let battleBusy = false;
let battleTimer = null;
let attackTimingTimer = null;
let pendingAttack = null;
let soulSpellUsed = false;
let enemyStunTurns = 0;
let magicMenuOpen = false;
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
