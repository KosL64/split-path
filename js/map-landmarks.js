// Outdoor expansion and progression features; combat remains in game.js.
const landscape = {
  sylvan: { width: 94, height: 68 }, plains: { width: 66, height: 136 },
  groundsHeight: 31, riverY: 22, bridgeX: 68, bridgeWidth: 4,
  sylvanVillage: { x: 58, y: 6 }, azureVillage: { x: 46, y: 34 },
  thicket: { x: 40, y: 2, width: 53, height: 38 },
  spring: { x: 26, y: 55, width: 10, height: 7 }
};
const environmentState = { springSince: null, cloudSince: null };
let landscapeReachableTiles = new Set();

function initializeLandscapeReachability() {
  // Cache traversable player configurations before spawning enemies, with villages locked.
  const start = [73, 13];
  const queue = [start];
  const key = (x, y) => `${x},${y}`;
  landscapeReachableTiles = new Set([key(...start)]);
  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (landscapeReachableTiles.has(key(nx, ny)) || worldRectBlocked({
        x: (nx + 0.5) * config.tileSize - player.width / 2,
        y: (ny + 1) * config.tileSize - player.height / 2,
        width: player.width, height: player.height
      })) continue;
      landscapeReachableTiles.add(key(nx, ny));
      queue.push([nx, ny]);
    }
  }
}

function landscapeSpawnReachable(area, x, y) {
  if (!area.world) return true;
  const wx = area.world.x + x, wy = area.world.y + y;
  return landscapeReachableTiles.has(`${wx},${wy}`) || landscapeReachableTiles.has(`${wx},${wy - 1}`);
}

function expandRegion(area, width, height) {
  const previous = area.map;
  const sx = width / area.width;
  const sy = height / area.height;
  const grid = createAreaGrid(width, height, "^", "T");
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      const tile = previous[Math.min(area.height - 3, Math.max(2, Math.floor(y / sy)))]
        [Math.min(area.width - 3, Math.max(2, Math.floor(x / sx)))];
      grid[y][x] = ["E", "P", "S", "C"].includes(tile) ? "." : tile;
    }
  }
  previous.forEach((row, y) => [...row].forEach((tile, x) => {
    if (["C", "S", "P"].includes(tile) && !(area === areas.sylvan && tile === "P")) {
      grid[Math.min(height - 3, Math.round(y * sy))][Math.min(width - 3, Math.round(x * sx))] = tile;
    }
  }));
  area.start = { x: Math.round(area.start.x * sx), y: Math.round(area.start.y * sy) };
  area.width = width;
  area.height = height;
  area.map = finishAreaGrid(grid);
}

function prepareExpandedRegions() {
  expandRegion(areas.sylvan, landscape.sylvan.width, landscape.sylvan.height);
  expandRegion(areas.azureApex, landscape.sylvan.width, landscape.sylvan.height);
  expandRegion(areas.controlledPlains, landscape.plains.width, landscape.plains.height);
  const sylvanVillage = areas.sylvanVillage;
  const villageGrid = createAreaGrid(sylvanVillage.width, 20, "^", "^");
  sylvanVillage.map.forEach((row, y) => [...row].forEach((tile, x) => {
    if (x > 1 && x < sylvanVillage.width - 2 && y > 1 && y < sylvanVillage.height - 2) villageGrid[y][x] = tile;
  }));
  sylvanVillage.height = 20;
  sylvanVillage.map = finishAreaGrid(villageGrid);
  const village = areas.azureVillage;
  const grid = createAreaGrid(44, 30, "^", "^");
  village.map.forEach((row, y) => [...row].forEach((tile, x) => {
    if (x > 1 && x < village.width - 2 && y > 1 && y < village.height - 1) grid[y + 8][x + 4] = tile;
  }));
  village.homeSlots.forEach(home => { home.x += 4; home.y += 8; });
  village.garageHome.x += 4;
  village.garageHome.y += 8;
  village.width = 44;
  village.height = 30;
  village.start = { x: 22, y: 26 };
  village.map = finishAreaGrid(grid);
}

function regionRestored(region) {
  const enemies = ordinaryEnemies(areas[region]);
  return enemies.length > 0 && enemies.every(enemy => enemy.restored);
}

function canEnterLandscapeArea(id) {
  if (id === "sylvanVillage" || id.startsWith("sylvanVillageHouse")) return regionRestored("sylvan");
  if (id === "azureVillage" || id === "azureMountain" || id.startsWith("azureVillageHouse")) return regionRestored("azureApex");
  return true;
}

function resolveLandscapeTile(tile) {
  if (tile === "G") return regionRestored("sylvan") ? "." : "T";
  if (tile === "U") return regionRestored("azureApex") ? "u" : "X";
  return tile;
}

function paintLandscapePath(grid, points, tile = "p", excluded = null) {
  for (let index = 1; index < points.length; index += 1) {
    const [ax, ay] = points[index - 1];
    const [bx, by] = points[index];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let step = 0; step <= steps; step += 1) {
      const x = Math.round(ax + (bx - ax) * step / Math.max(1, steps));
      const y = Math.round(ay + (by - ay) * step / Math.max(1, steps));
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const col = x + dx, row = y + dy;
          if (!grid[row]?.[col] || col < 1 || row < 1 || col >= grid[0].length - 1 || row >= grid.length - 1) continue;
          if (excluded && col >= excluded.x && col < excluded.x + excluded.width && row >= excluded.y && row < excluded.y + excluded.height) continue;
          grid[row][col] = tile;
        }
      }
    }
  }
}

function buildLandscapeFeatures() {
  const sylvan = areas.sylvan.map.map(row => [...row]);
  const forest = landscape.thicket;
  for (let y = forest.y; y < forest.y + forest.height; y += 1) {
    for (let x = forest.x; x < forest.x + forest.width; x += 1) {
      if ((x * 7 + y * 11) % 5 < 3) sylvan[y][x] = "T";
    }
  }
  const sv = { ...landscape.sylvanVillage, width: areas.sylvanVillage.width, height: areas.sylvanVillage.height };
  paintLandscapePath(sylvan, [[4, 2], [4, 20], [22, 26], [26, 58], [38, 66]]);
  paintLandscapePath(sylvan, [[4, 20], [45, 20], [45, 36], [76, 36], [76, 24]], "p", sv);
  paintLandscapePath(sylvan, [[4, 20], [1, 20]]);
  sylvan[10][8] = "s";
  areas.sylvan.landmarkSigns = { "8,10": "W lc me to Sylvan" };
  areas.sylvan.map = finishAreaGrid(sylvan);

  const azure = areas.azureApex.map.map(row => [...row]);
  const av = { ...landscape.azureVillage, width: areas.azureVillage.width, height: areas.azureVillage.height };
  paintLandscapePath(azure, [[38, 1], [40, 18], [58, 22], [58, 54], [68, 64]], "p", av);
  paintLandscapePath(azure, [[40, 18], [40, 48], [46, 48]], "p", av);
  paintLandscapePath(azure, [[40, 48], [31, 48], [31, 58]], "p", av);
  const spring = landscape.spring;
  fillRectTiles(azure, spring.x, spring.y, spring.width, spring.height, "R");
  fillRectTiles(azure, spring.x + 1, spring.y + 1, spring.width - 2, spring.height - 2, "~");
  fillRectTiles(azure, spring.x + 4, spring.y, 3, 2, "~");
  areas.azureApex.map = finishAreaGrid(azure);

  const plains = areas.controlledPlains.map.map(row => [...row]);
  paintLandscapePath(plains, [[64, 20], [54, 28], [34, 60], [8, 108]]);
  fillRectTiles(plains, 52, 25, 5, 10, "j");
  fillRectTiles(plains, 53, 29, 3, 2, ".");
  fillRectTiles(plains, 6, 104, 5, 4, "F");
  plains[108][8] = "d";
  areas.controlledPlains.map = finishAreaGrid(plains);

  ["sylvanVillage", "azureVillage"].forEach(id => {
    const area = areas[id];
    const grid = area.map.map(row => [...row]);
    for (let y = 0; y < area.height; y += 1) {
      for (let x = 0; x < area.width; x += 1) {
        if (x < 2 || x >= area.width - 2 || y < 2 || y >= area.height - 2) grid[y][x] = id === "sylvanVillage" ? "T" : "X";
      }
    }
    if (id === "sylvanVillage") fillRectTiles(grid, 16, area.height - 2, 4, 2, "G");
    else {
      fillRectTiles(grid, 20, area.height - 2, 4, 2, "U");
      fillRectTiles(grid, 0, 13, 2, 4, "U");
      fillRectTiles(grid, 28, 2, 14, 7, "Y");
      fillRectTiles(grid, 29, 3, 12, 5, ".");
      fillRectTiles(grid, 32, 8, 4, 2, "u");
      fillRectTiles(grid, 32, 4, 7, 2, "o");
    }
    area.map = finishAreaGrid(grid);
  });
  const mountain = createAreaGrid(40, 28, "^", "^");
  for (let y = 5; y < 22; y += 5) fillRectTiles(mountain, y % 2 ? 12 : 22, y, 5, 2, "R");
  mountain[25][5] = "E";
  areas.azureMountain = {
    name: "Azure Mountain", width: 40, height: 28, start: { x: 5, y: 23 },
    cameraX: 0, cameraY: 0, healed: true, enemies: [], layer: 2,
    map: finishAreaGrid(mountain), exteriorDoor: { areaId: "azureVillage", x: 34, y: 7 }
  };
}

function updateWorldEnvironment() {
  const now = performance.now();
  const col = Math.floor((player.x + player.width / 2) / config.tileSize);
  const row = Math.floor((player.y + player.height / 2) / config.tileSize);
  const tile = areas[currentAreaId].map[row]?.[col];
  if (currentAreaId === "azureApex" && tile === "~" && currentScreen === "game") {
    if (environmentState.springSince === null) environmentState.springSince = now;
    const ticks = Math.floor((now - environmentState.springSince) / 500);
    if (ticks > 0) {
      playerState.health = Math.min(playerState.maxHealth, playerState.health + ticks);
      environmentState.springSince += ticks * 500;
      updateHud();
    }
  } else environmentState.springSince = null;
  if (currentAreaId === "azureVillage" && tile === "o" && regionRestored("azureApex") && currentScreen === "game") {
    if (environmentState.cloudSince === null) environmentState.cloudSince = now;
    if (now - environmentState.cloudSince >= 650) {
      environmentState.cloudSince = null;
      finishAreaDeparture();
      enterArea("azureMountain");
    }
  } else environmentState.cloudSince = null;
}

function landscapeLocationName() {
  if (currentAreaId === "sylvan") {
    const x = player.x / config.tileSize, y = player.y / config.tileSize, t = landscape.thicket;
    if (x >= t.x && x < t.x + t.width && y >= t.y && y < t.y + t.height) return "Sylvan Thicket";
  }
  if (currentAreaId === "azureApex" && areas.azureApex.map[Math.floor(player.y / config.tileSize)]?.[Math.floor(player.x / config.tileSize)] === "~") return "Azure Hot Spring";
  return areas[currentAreaId].name;
}

function drawLandscapeTile(tile, x, y) {
  const size = config.tileSize;
  if (["X", "Y"].includes(tile)) {
    ctx.fillStyle = tile === "X" ? "#566b81" : "#8a9aa7";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#b4c4c8";
    ctx.fillRect(x, y, size, 7);
    ctx.strokeStyle = "#344558";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 17); ctx.lineTo(x + 8, y + 42);
    ctx.moveTo(x + 30, y + 12); ctx.lineTo(x + 34, y + 46); ctx.stroke();
  }
  if (tile === "u") {
    ctx.fillStyle = "#b9c4cb"; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#657384";
    for (let i = 7; i < size; i += 9) ctx.fillRect(x, y + i, size, 3);
  }
  if (tile === "p") {
    ctx.fillStyle = "#b3ad79"; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#888b6f";
    ctx.fillRect(x + 9, y + 8, 12, 7); ctx.fillRect(x + 30, y + 29, 10, 6);
  }
  if (tile === "j") {
    ctx.fillStyle = "#392440"; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#9c789f"; ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 23, y + 20); ctx.lineTo(x + 17, y + 36); ctx.lineTo(x + 31, y + size); ctx.stroke();
  }
  if (tile === "~") {
    ctx.fillStyle = "#73b8bb"; ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#b9dddd"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 25); ctx.quadraticCurveTo(x + 22, y + 16, x + 44, y + 25); ctx.stroke();
  }
  if (tile === "s") {
    ctx.fillStyle = "#65513d"; ctx.fillRect(x + 20, y + 24, 7, 24);
    ctx.fillStyle = "#3a6c40"; ctx.fillRect(x + 2, y + 7, size - 4, 26);
    ctx.strokeStyle = "#92b866"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 8, y + 32); ctx.lineTo(x + 16, y + 38); ctx.stroke();
    ctx.fillStyle = "#e2e8bd"; ctx.font = "700 6px sans-serif";
    ctx.fillText("W lc me to", x + 12, y + 18); ctx.fillText("Sylvan", x + 15, y + 27);
  }
}

function drawWorldAtmosphere() {
  const village = areas.azureVillage;
  if (!areas[currentAreaId].world) return;
  const size = config.tileSize;
  const x = (village.world.x + 32) * size - overworld.cameraX;
  const y = (village.world.y + 4) * size - overworld.cameraY;
  if (x > canvas.width || y > canvas.height || x + 7 * size < 0 || y + 2 * size < 0) return;
  ctx.save();
  ctx.fillStyle = "rgba(235,242,245,.94)";
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + 18 + i * 33, y + 36 + (i % 3) * 17, 43, 35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
