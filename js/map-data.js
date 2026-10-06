// map-data: see CODE-OWNERSHIP.md for shared state and loading order.

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

const soulLevelRanges = {
  sylvan: { min: 11, max: 20 },
  azureApex: { min: 40, max: 50 },
  controlledPlains: { min: 70, max: 100 }
};

const kingdomMap = {
  width: 1680,
  height: 1080,
  cameraX: 0,
  cameraY: 0,
  paths: [
    [[180, 260], [180, 520]],
    [[180, 520], [430, 520], [620, 390], [860, 390]],
    [[620, 390], [820, 270], [1050, 250]],
    [[430, 520], [520, 720], [760, 770], [1010, 690]],
    [[860, 390], [1100, 370], [1280, 500], [1430, 500]],
    [[1010, 690], [1190, 820], [1440, 760]]
  ],
  nodes: [
    { id: "pristineCastle", name: "Pristine Castle", x: 180, y: 260, areaId: "pristineCastle", unlocked: true, kind: "castle" },
    { id: "sylvan", name: "Sylvan", x: 180, y: 520, areaId: "sylvan", unlocked: true, kind: "area" },
    { id: "azureApex", name: "Azure Apex", x: 620, y: 390, areaId: "azureApex", unlocked: true, kind: "area" },
    { id: "azureVillage", name: "Azure Village", x: 1050, y: 250, areaId: "azureVillage", unlocked: true, kind: "village", residentsFrom: "azureApex" },
    { id: "sylvanVillage", name: "Sylvan Village", x: 1010, y: 690, areaId: "sylvanVillage", unlocked: true, kind: "village", residentsFrom: "sylvan" },
    { id: "controlledPalace", name: "Controlled Palace", x: 1430, y: 500, areaId: "controlledPalace", unlocked: true, kind: "area" },
    { id: "controlledPlains", name: "Controlled Plains", x: 1440, y: 760, areaId: "controlledPlains", unlocked: true, kind: "area" }
  ]
};

const areas = {
  pristineCastle: makePristineCastle(),
  sylvan: makeSylvanArea(),
  azureApex: makeAzureApexArea(),
  azureVillage: makeVillageArea("Azure Village", "azureVillage", 31),
  sylvanVillage: makeVillageArea("Sylvan Village", "sylvanVillage", 20),
  controlledPalace: makePreviewArea("Controlled Palace", false),
  controlledPlains: makeControlledPlainsArea()
};

function makePristineCastle() {
  const width = 24;
  const height = 16;
  const grid = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) =>
    row === 0 || row === height - 1 || col === 0 || col === width - 1 ? "^" : "."));
  grid[2][12] = "H";
  grid[4][8] = "V";
  grid[4][16] = "V";
  grid[6][17] = "D";
  [[20, 6], [20, 7], [20, 8], [20, 9], [20, 10]].forEach(([x, y]) => { grid[y][x] = "Q"; });
  [[11, 13], [12, 13], [13, 13]].forEach(([x, y]) => { grid[y][x] = "B"; });
  grid[height - 2][12] = "E";
  return {
    name: "Pristine Castle",
    width,
    height,
    start: { x: 12, y: 8 },
    cameraX: 0,
    cameraY: 0,
    healed: true,
    enemies: [],
    signs: {
      "20,6": "Move with WASD or the arrow keys. Hold Shift or X to sprint.",
      "20,7": "Press Z or Enter near signs, residents, and map locations.",
      "20,8": "Restore controlled creatures to earn Divine Points.",
      "20,9": "Open the Divine Path with U to choose permanent upgrades.",
      "20,10": "Find your staff before leaving the ruined castle."
    },
    map: grid.map((row) => row.join(""))
  };
}

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

function createAreaGrid(width, height, borderTile = "^", innerBorderTile = "T") {
  const grid = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
    if (row === 0 || row === height - 1 || col === 0 || col === width - 1) return borderTile;
    if (row === 1 || row === height - 2 || col === 1 || col === width - 2) return innerBorderTile;
    return ".";
  }));
  return grid;
}

function setTiles(grid, points, tile) {
  points.forEach(([x, y]) => {
    if (grid[y]?.[x]) grid[y][x] = tile;
  });
}

function fillRectTiles(grid, x, y, width, height, tile) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (grid[row]?.[col]) grid[row][col] = tile;
    }
  }
}

function finishAreaGrid(grid) {
  return grid.map((row) => row.join(""));
}

function makeSylvanArea() {
  const width = 54;
  const height = 26;
  const grid = createAreaGrid(width, height, "^", "T");

  [
    [8, 5, 3, 2], [17, 4, 5, 1], [31, 5, 4, 2], [44, 6, 3, 2],
    [5, 17, 4, 2], [22, 18, 3, 2], [35, 16, 5, 2], [46, 18, 3, 2]
  ].forEach(([x, y, w, h]) => fillRectTiles(grid, x, y, w, h, "R"));

  [
    [14, 8], [15, 8], [16, 8], [15, 9],
    [28, 11], [29, 11], [30, 11], [29, 12],
    [40, 13], [41, 13], [42, 13], [41, 14],
    [11, 21], [12, 21], [13, 21], [12, 20]
  ].forEach(([x, y]) => { grid[y][x] = "T"; });

  setTiles(grid, [[9, 8], [20, 7], [25, 16], [33, 9], [43, 20], [47, 11], [16, 14], [38, 22]], "g");
  setTiles(grid, [[20, 12], [32, 7], [37, 18], [45, 15], [12, 11], [27, 21]], "C");
  grid[6][18] = "P";
  grid[12][5] = "S";
  grid[22][49] = "E";

  return {
    name: "Sylvan",
    width,
    height,
    start: { x: 4, y: 12 },
    cameraX: 0,
    cameraY: 0,
    healed: false,
    enemies: [],
    map: finishAreaGrid(grid)
  };
}

function makeAzureApexArea() {
  const width = 54;
  const height = 26;
  const grid = createAreaGrid(width, height, "^", "R");

  [
    [7, 4, 5, 2], [19, 7, 4, 3], [35, 5, 6, 2], [44, 10, 3, 4],
    [10, 18, 7, 2], [27, 17, 4, 3], [39, 20, 6, 2]
  ].forEach(([x, y, w, h]) => fillRectTiles(grid, x, y, w, h, "R"));

  [
    [14, 13, 5, 1], [23, 4, 1, 5], [31, 12, 6, 1], [48, 17, 1, 4]
  ].forEach(([x, y, w, h]) => fillRectTiles(grid, x, y, w, h, "W"));

  setTiles(grid, [[8, 12], [15, 16], [26, 9], [30, 20], [42, 8], [46, 21], [35, 14], [20, 21]], "g");
  setTiles(grid, [[13, 9], [24, 14], [32, 7], [41, 16], [47, 12], [18, 20], [36, 21]], "C");
  grid[5][24] = "P";
  grid[12][5] = "S";
  grid[22][49] = "E";

  return {
    name: "Azure Apex",
    width,
    height,
    start: { x: 4, y: 12 },
    cameraX: 0,
    cameraY: 0,
    healed: false,
    enemies: [],
    hasEnemies: true,
    map: finishAreaGrid(grid)
  };
}

function makeControlledPlainsArea() {
  const width = 38;
  const height = 78;
  const grid = createAreaGrid(width, height, "^", "T");

  for (let y = 8; y < height - 8; y += 9) {
    fillRectTiles(grid, 7, y, 6, 2, "R");
    fillRectTiles(grid, 25, y + 3, 5, 3, "R");
    setTiles(grid, [[17, y + 1], [18, y + 1], [19, y + 1], [20, y + 1]], "g");
    setTiles(grid, [[11, y + 4], [19, y + 5], [28, y + 1], [30, y + 6]], "C");
  }

  for (let y = 15; y < height - 10; y += 14) {
    fillRectTiles(grid, 15, y, 1, 5, "W");
    fillRectTiles(grid, 16, y + 4, 5, 1, "W");
  }

  grid[5][18] = "P";
  grid[11][5] = "S";
  grid[74][19] = "E";

  return {
    name: "Controlled Plains",
    width,
    height,
    start: { x: 19, y: 3 },
    cameraX: 0,
    cameraY: 0,
    healed: false,
    enemies: [],
    hasEnemies: true,
    map: finishAreaGrid(grid)
  };
}

function makeVillageArea(name, areaId, homeCount) {
  const sylvan = areaId === "sylvanVillage";
  const width = sylvan ? 32 : 36;
  const height = sylvan ? 18 : 20;
  const grid = createAreaGrid(width, height, "^", sylvan ? "T" : "R");
  const homeSlots = [];
  const columns = sylvan ? [5, 10, 15, 20, 25] : [5, 10, 15, 20, 25, 30];
  const rows = sylvan ? [4, 8, 12, 15] : [4, 7, 10, 13, 16, 18];

  rows.forEach((row, rowIndex) => {
    columns.forEach((col, colIndex) => {
      if (homeSlots.length >= homeCount) return;
      const houseY = Math.max(2, row - 1);
      grid[houseY][col] = "h";
      grid[row][col] = "d";
      if ((rowIndex + colIndex) % 2 === 0 && grid[row]?.[col + 1]) grid[row][col + 1] = "g";
      homeSlots.push({ x: col, y: row, label: `${name} Home ${homeSlots.length + 1}` });
    });
  });

  setTiles(grid, sylvan ? [[3, 5], [28, 7], [3, 13], [28, 14]] : [[3, 5], [32, 7], [4, 15], [31, 16]], "T");
  grid[height - 3][Math.floor(width / 2)] = "E";
  grid[Math.floor(height / 2)][3] = "S";

  return {
    name,
    width,
    height,
    start: { x: Math.floor(width / 2), y: height - 4 },
    cameraX: 0,
    cameraY: 0,
    healed: true,
    enemies: [],
    villageTheme: areaId,
    homeSlots,
    map: finishAreaGrid(grid)
  };
}
