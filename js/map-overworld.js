// Connected exterior coordinates are in tiles; actors retain their area's local coordinates.
const overworld = {
  width: 92,
  height: 96,
  cameraX: 0,
  cameraY: 0,
  regions: ["castleGrounds", "controlledPlains", "sylvan", "azureApex", "sylvanVillage", "azureVillage"]
};

function initializeOverworld() {
  const grounds = createAreaGrid(92, 18, "^", "^");
  fillRectTiles(grounds, 1, 13, 90, 5, "W");
  fillRectTiles(grounds, 40, 13, 4, 5, "=");
  fillRectTiles(grounds, 43, 4, 6, 5, "F");
  grounds[9][45] = "d";
  setTiles(grounds, [[8, 5], [16, 8], [29, 4], [62, 5], [73, 7], [83, 4]], "T");
  areas.castleGrounds = {
    name: "Pristine Castle Grounds", width: 92, height: 18, start: { x: 45, y: 10 },
    cameraX: 0, cameraY: 0, healed: true, enemies: [], map: finishAreaGrid(grounds),
    world: { x: 0, y: 0 }, layer: 1,
    portals: [{ x: 45, y: 9, target: "pristineCastle", label: "Pristine Castle" }],
    landmark: { x: 43, y: 4, width: 6, height: 5, name: "Pristine Castle" }
  };
  const placements = {
    controlledPlains: { x: 0, y: 18 }, sylvan: { x: 38, y: 18 }, azureApex: { x: 38, y: 57 },
    sylvanVillage: { x: 58, y: 36, parent: "sylvan" },
    azureVillage: { x: 54, y: 74, parent: "azureApex" }
  };
  Object.entries(placements).forEach(([id, placement]) => {
    const area = areas[id];
    area.world = placement;
    area.layer = 1;
    area.portals = [];
    const grid = area.map.map(row => [...row]);
    grid.forEach((row, y) => row.forEach((tile, x) => {
      if (tile === "E") row[x] = ".";
      if (placement.parent && (x < 2 || x >= area.width - 2 || y < 2 || y >= area.height - 2)
        && ["^", "T", "R"].includes(tile)) row[x] = ".";
    }));
    if (id === "sylvan") {
      fillRectTiles(grid, 0, 2, 2, 37, ".");
      fillRectTiles(grid, 0, 37, 52, 2, ".");
      fillRectTiles(grid, 2, 0, 4, 2, ".");
    }
    if (id === "azureApex") {
      fillRectTiles(grid, 0, 0, 52, 2, ".");
      fillRectTiles(grid, 0, 0, 2, 37, ".");
    }
    if (id === "controlledPlains") {
      fillRectTiles(grid, 36, 2, 2, 74, ".");
      fillRectTiles(grid, 6, 60, 5, 4, "F");
      grid[64][8] = "d";
      area.portals.push({ x: 8, y: 64, target: "controlledPalace", label: "Controlled Palace" });
      area.landmark = { x: 6, y: 60, width: 5, height: 4, name: "Controlled Palace" };
    }
    area.map = finishAreaGrid(grid);
  });
  areas.pristineCastle.layer = 2;
  areas.pristineCastle.exteriorDoor = { areaId: "castleGrounds", x: 45, y: 9 };
  areas.controlledPalace.layer = 2;
  areas.controlledPalace.exteriorDoor = { areaId: "controlledPlains", x: 8, y: 64 };
  areas.palaceUpper.layer = 3;
  ["sylvanVillage", "azureVillage"].forEach(id => {
    const village = areas[id];
    const exteriorGrid = village.map.map(row => [...row]);
    village.homeSlots.forEach((home, index) => {
      exteriorGrid[home.y][home.x] = "d";
      const interiorId = `${id}House${index + 1}`;
      const grid = createAreaGrid(12, 10, "^", "^");
      grid[8][5] = "E";
      fillRectTiles(grid, 2, 3, 2, 2, "b");
      grid[3][8] = "t";
      areas[interiorId] = {
        name: home.label, width: 12, height: 10, start: { x: 5, y: 7 },
        cameraX: 0, cameraY: 0, healed: true, enemies: [], map: finishAreaGrid(grid),
        layer: 2, houseInterior: true, villageTheme: id,
        exteriorDoor: { areaId: id, x: home.x, y: home.y }
      };
      village.portals.push({ x: home.x, y: home.y, target: interiorId, label: home.label });
    });
    village.map = finishAreaGrid(exteriorGrid);
  });
}

function worldAreaAt(tileX, tileY) {
  return [...overworld.regions].reverse().find(id => {
    const area = areas[id];
    return tileX >= area.world.x && tileX < area.world.x + area.width
      && tileY >= area.world.y && tileY < area.world.y + area.height;
  });
}

function worldTileAt(tileX, tileY) {
  const area = areas[worldAreaAt(tileX, tileY)];
  return area?.map[tileY - area.world.y]?.[tileX - area.world.x];
}

function tileIsEmbeddedVillage(area, x, y) {
  if (!area.world) return false;
  const id = worldAreaAt(area.world.x + x, area.world.y + y);
  return !!(id && areas[id].world.parent && areas[id] !== area);
}

function moveOverworldPlayer(next) {
  const area = areas[currentAreaId];
  const size = config.tileSize;
  const worldX = next.x + area.world.x * size;
  const worldY = next.y + area.world.y * size;
  if (worldRectBlocked({ ...next, x: worldX, y: worldY })) return;
  const targetId = worldAreaAt(Math.floor((worldX + next.width / 2) / size), Math.floor((worldY + next.height / 2) / size));
  if (!targetId) return;
  const changedRegion = targetId !== currentAreaId;
  if (changedRegion) {
    finishAreaDeparture();
    currentAreaId = targetId;
    clearInteractionState();
    contactLockedUntil = performance.now() + config.contactCooldown;
  }
  player.x = worldX - areas[targetId].world.x * size;
  player.y = worldY - areas[targetId].world.y * size;
  if (changedRegion) updateHud();
}

function worldRectBlocked(rect) {
  const size = config.tileSize;
  for (let y = Math.floor(rect.y / size); y <= Math.floor((rect.y + rect.height - 1) / size); y += 1) {
    for (let x = Math.floor(rect.x / size); x <= Math.floor((rect.x + rect.width - 1) / size); x += 1) {
      if (isBlockedTile(worldTileAt(x, y))) return true;
    }
  }
  return false;
}

function finishAreaDeparture() {
  relocateRestoredEnemies(currentAreaId);
  areas[currentAreaId].enemies.forEach(enemy => {
    enemy.chasing = false;
    enemy.route = [];
    enemy.routeUntil = 0;
  });
}

function nearbyWorldPortal() {
  const col = Math.floor((player.x + player.width / 2) / config.tileSize);
  const row = Math.floor((player.y + player.height / 2) / config.tileSize);
  return areas[currentAreaId].portals?.find(portal => portal.x === col && (portal.y === row || portal.y + 1 === row));
}

function enterWorldPortal() {
  const portal = nearbyWorldPortal();
  if (!portal) return;
  finishAreaDeparture();
  enterArea(portal.target);
}

function returnToExterior() {
  const door = areas[currentAreaId].exteriorDoor;
  if (!door || (currentAreaId === "pristineCastle" && !castleState.exitCleared)) return;
  finishAreaDeparture();
  enterArea(door.areaId);
  player.x = door.x * config.tileSize + (config.tileSize - player.width) / 2;
  player.y = (door.y + 1) * config.tileSize - player.height / 2;
  updateCamera();
}

function drawOverworld() {
  const size = config.tileSize;
  const active = areas[currentAreaId];
  ctx.fillStyle = "#18271f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  overworld.regions.forEach(id => {
    const area = areas[id];
    const cameraX = overworld.cameraX - area.world.x * size;
    const cameraY = overworld.cameraY - area.world.y * size;
    if (-cameraX > canvas.width || -cameraY > canvas.height || area.width * size - cameraX < 0 || area.height * size - cameraY < 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-cameraX, -cameraY, area.width * size, area.height * size);
    ctx.clip();
    drawAreaMap(id, cameraX, cameraY, false);
    drawExteriorLandmark(area, cameraX, cameraY);
    ctx.restore();
  });
  drawMapLabel(active.name, active.world.parent ? "Village" : currentAreaId === "castleGrounds" ? "Pristine Bridge | Pristine River" : "");
}

function drawExteriorLandmark(area, cameraX, cameraY) {
  const landmark = area.landmark;
  if (!landmark) return;
  const x = landmark.x * config.tileSize - cameraX;
  const y = landmark.y * config.tileSize - cameraY;
  const w = landmark.width * config.tileSize;
  const h = landmark.height * config.tileSize;
  ctx.fillStyle = "#787d83";
  ctx.fillRect(x, y + 40, w, h - 40);
  ctx.strokeStyle = "#31383e";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y + 40, w, h - 40);
  for (let i = 0; i < w; i += 48) {
    ctx.fillStyle = "#a0a5aa";
    ctx.fillRect(x + i, y + 22, 28, 34);
    ctx.fillStyle = "#31383e";
    ctx.fillRect(x + i + 8, y + 80, 14, 30);
  }
  ctx.fillStyle = "#293238";
  const portal = area.portals[0];
  ctx.fillRect(portal.x * config.tileSize - cameraX - 4, y + h - 54, 56, 54);
}

function drawHouseFurnishings(cameraX, cameraY) {
  const size = config.tileSize;
  const x = 2 * size - cameraX;
  const y = 3 * size - cameraY;
  ctx.fillStyle = "#4b3e35";
  ctx.fillRect(x + 2, y + 2, size * 2 - 4, size * 2 - 4);
  ctx.fillStyle = "#3f7277";
  ctx.fillRect(x + 8, y + 8, size * 2 - 16, size * 2 - 16);
  ctx.fillStyle = "#e4e9dc";
  ctx.fillRect(x + 12, y + 12, size * 2 - 24, 22);
  ctx.fillStyle = "#5c4335";
  ctx.fillRect(8 * size - cameraX + 3, 3 * size - cameraY + 3, size - 6, size - 6);
  ctx.fillStyle = "#e4e9dc";
  ctx.beginPath();
  ctx.arc(8.5 * size - cameraX, 3.5 * size - cameraY, 7, 0, Math.PI * 2);
  ctx.fill();
}
