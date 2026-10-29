// map-rendering: see CODE-OWNERSHIP.md for shared state and loading order.

function drawWorld() {
  if (areas[currentAreaId].world) drawOverworld();
  else drawAreaMap();
  drawPlayer();
  drawWorldAtmosphere();
}

function drawAreaMap(areaId = currentAreaId, cameraX = areas[areaId].cameraX, cameraY = areas[areaId].cameraY, label = true) {
  const area = areas[areaId];
  const palette = areaPalette(areaId);

  ctx.fillStyle = area.houseInterior ? "#20242a" : area.healed ? palette.healedBase : palette.controlledBase;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startCol = Math.floor(cameraX / config.tileSize);
  const endCol = Math.ceil((cameraX + canvas.width) / config.tileSize);
  const startRow = Math.floor(cameraY / config.tileSize);
  const endRow = Math.ceil((cameraY + canvas.height) / config.tileSize);

  const groundPattern = ["sylvan", "sylvanVillage"].includes(areaId) ? sylvanGrassPattern
    : ["azureApex", "azureVillage", "azureMountain"].includes(areaId) ? azureGroundPattern : null;
  if (groundPattern) {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ctx.fillStyle = groundPattern;
    ctx.fillRect(cameraX, cameraY, canvas.width, canvas.height);
    ctx.restore();
    const groundHealed = areaId === "sylvanVillage" ? areas.sylvan.healed : areaId === "azureVillage" ? areas.azureApex.healed : area.healed;
    ctx.fillStyle = groundHealed ? "rgba(0,0,0,.04)" : "rgba(0,0,0,.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      drawTile(area.map[row]?.[col], col * config.tileSize - cameraX, row * config.tileSize - cameraY, area.healed, areaId);
    }
  }

  if (area.garageHome) drawVillageGarageHouse(area.garageHome.x * config.tileSize - cameraX, area.garageHome.y * config.tileSize - cameraY, palette);
  if (area.houseInterior) drawHouseFurnishings(cameraX, cameraY);
  drawAreaRocks(area, cameraX, cameraY, areaId);
  if (areaId === "pristineCastle") {
    drawCastleThrone((area.throne.x + 1) * config.tileSize - cameraX, (area.throne.y + 1) * config.tileSize - cameraY);
    drawCastleWallDecorations(cameraX, cameraY);
  }
  visibleAreaEnemies(areaId).forEach((enemy) => drawEnemy(enemy, cameraX, cameraY));
  drawVillageResidents(cameraX, cameraY, areaId);
  if (!label) return;
  const subtitle = areaId === "pristineCastle"
    ? playerState.hasStaff
      ? castleState.exitCleared ? "The road to the kingdom is open." : "Use the staff to clear the fallen rocks."
      : "Search the ruined throne room for your staff."
    : area.signs
    ? "Read the signs, then leave through the glowing doorway."
    : villageSourceFor(areaId)
      ? "Restored residents gather here."
      : "";
  drawMapLabel(area.name, subtitle);
}

function areaPalette(areaId) {
  if (areaId === "azureMountain") areaId = "azureApex";
  if (areaId === "castleGrounds") areaId = "sylvanVillage";
  if (areas[areaId]?.houseInterior) areaId = areas[areaId].villageTheme;
  const palettes = {
    sylvan: {
      controlledBase: "#20352b",
      healedBase: "#2f7045",
      floor: "#31593b",
      healedFloor: "#3f8050",
      wall: "#18271f",
      tree: "#27643a",
      grass: "#84d66d",
      water: "#2f766e",
      houseRoof: "#356b3f",
      houseBody: "#d7c889",
      door: "#6e4f2c"
    },
    sylvanVillage: {
      controlledBase: "#2f7045",
      healedBase: "#3f8a52",
      floor: "#4f9a5a",
      healedFloor: "#58a962",
      wall: "#21482d",
      tree: "#1f6a3a",
      grass: "#a2e076",
      water: "#32766b",
      houseRoof: "#2f7a43",
      houseBody: "#e1d79a",
      door: "#71542d"
    },
    azureApex: {
      controlledBase: "#253a4c",
      healedBase: "#2f6874",
      floor: "#33556a",
      healedFloor: "#3a7c86",
      wall: "#1b2937",
      tree: "#237070",
      grass: "#63d2aa",
      water: "#1d5f91",
      houseRoof: "#1c5f91",
      houseBody: "#c8e2da",
      door: "#31506d"
    },
    azureVillage: {
      controlledBase: "#2f6874",
      healedBase: "#367f8e",
      floor: "#3d8990",
      healedFloor: "#49a19b",
      wall: "#233a4b",
      tree: "#197b73",
      grass: "#75ddb8",
      water: "#1f6ea5",
      houseRoof: "#1f67a5",
      houseBody: "#d5eee8",
      door: "#31506d"
    },
    controlledPlains: {
      controlledBase: "#242631",
      healedBase: areaId === "controlledPlains" ? "#a9b94c" : "#405f5b",
      floor: "#393944",
      healedFloor: areaId === "controlledPlains" ? "#bdc85b" : "#496f59",
      wall: "#181820",
      tree: "#252934",
      grass: "#514c62",
      healedGrass: areaId === "controlledPlains" ? "#e0df70" : "#514c62",
      water: "#252d47",
      houseRoof: "#dd6c7b",
      houseBody: "#f3eee1",
      door: "#6b4f22"
    }
  };
  return palettes[areaId] || palettes.controlledPlains;
}

function drawTile(tile, x, y, healed, areaId) {
  if (!tile) return;
  tile = resolveLandscapeTile(tile);
  const size = config.tileSize;
  const palette = areaPalette(areaId);
  if (areas[areaId]?.houseInterior) {
    ctx.fillStyle = "#859493";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#647a78";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
    if (tile !== "^" && tile !== "E") {
      return;
    }
  }
  const grassy = (["sylvan", "sylvanVillage"].includes(areaId) && sylvanGrassPattern)
    || (["azureApex", "azureVillage", "azureMountain"].includes(areaId) && azureGroundPattern);
  ctx.fillStyle = healed ? palette.healedFloor : palette.floor;
  if (!grassy) ctx.fillRect(x, y, size, size);

  if (tile === "^") {
    ctx.fillStyle = areas[areaId]?.houseInterior ? "#525557" : areaId === "pristineCastle" ? "#706b7c" : palette.wall;
    ctx.fillRect(x, y, size, size);
    if (areaId === "pristineCastle") {
      ctx.strokeStyle = "#393641";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    }
  }

  if (areaId === "pristineCastle" && tile !== "^") {
    ctx.fillStyle = "#bbb3a4";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(x + 2, y + 2, size - 4, size / 2 - 3);
  }

  if (tile === "T") {
    ctx.fillStyle = healed ? palette.tree : palette.wall;
    if (!grassy) ctx.fillRect(x, y, size, size);
    if (["sylvan", "sylvanVillage"].includes(areaId) && readySylvanSprite("tree")) {
      ctx.drawImage(sylvanSprites.tree, x - 13, y - 60, size + 26, size + 60);
    } else {
      drawTree(x + 8, y + 2, areaId === "sylvanVillage" ? 0.95 : 0.72, palette.tree);
    }
  }

  if (tile === "R" && !enhancedRockAreas.has(areaId)) {
    ctx.fillStyle = "#6b6576";
    ctx.fillRect(x + 4, y + 8, size - 8, size - 12);
    ctx.strokeStyle = "#34313b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 8, size - 8, size - 12);
  }

  if (tile === "g") {
    ctx.fillStyle = healed ? palette.healedGrass || palette.grass : palette.grass;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + 6 + i * 8, y + 30 - (i % 2) * 7, 5, 12);
    }
  }

  if (tile === "W") {
    ctx.fillStyle = palette.water;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "rgba(243,238,225,.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 22);
    ctx.quadraticCurveTo(x + 18, y + 14, x + 29, y + 22);
    ctx.quadraticCurveTo(x + 38, y + 29, x + 45, y + 22);
    ctx.stroke();
  }

  if (tile === "=") {
    ctx.fillStyle = "#a4adb1";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#586975";
    ctx.lineWidth = 2;
    for (let row = 0; row < size; row += 16) {
      ctx.beginPath();
      ctx.moveTo(x, y + row);
      ctx.lineTo(x + size, y + row);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + (row % 32 ? 12 : 32), y + row);
      ctx.lineTo(x + (row % 32 ? 12 : 32), y + row + 16); ctx.stroke();
    }
  }

  drawLandscapeTile(tile, x, y);

  if (tile === "h") drawVillageHouse(x, y, palette);

  if (tile === "d") {
    ctx.fillStyle = palette.door;
    ctx.fillRect(x + 15, y, 18, 26);
    ctx.fillStyle = "rgba(242,201,95,.24)";
    ctx.fillRect(x + 7, y + 28, size - 14, 12);
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

  if (tile === "Q") {
    ctx.fillStyle = "#66503a";
    ctx.fillRect(x + 21, y + 22, 7, 24);
    ctx.fillStyle = "#8c8069";
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 8);
    ctx.lineTo(x + 39, y + 5);
    ctx.lineTo(x + 43, y + 25);
    ctx.lineTo(x + 28, y + 29);
    ctx.lineTo(x + 22, y + 25);
    ctx.lineTo(x + 7, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#4a433a";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 14);
    ctx.lineTo(x + 35, y + 12);
    ctx.moveTo(x + 11, y + 21);
    ctx.lineTo(x + 30, y + 19);
    ctx.stroke();
  }

  if (tile === "V") drawFallenKingStatue(x, y);
  if (tile === "D") drawDustyDagger(x, y);

  if (tile === "B" && !castleState.exitCleared) {
    drawFallbackRock(x - 5, y + 4, 58, 48);
    ctx.strokeStyle = "#4c4653";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 13);
    ctx.lineTo(x + 26, y + 25);
    ctx.lineTo(x + 20, y + 37);
    ctx.stroke();
  }

  if (tile === "E") {
    ctx.fillStyle = "rgba(242,201,95,.28)";
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    ctx.strokeStyle = "#f2c95f";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 9, y + 9, size - 18, size - 18);
  }

  if (tile === "<" || tile === ">") {
    ctx.fillStyle = "#c4c0ba";
    ctx.fillRect(x + 6, y + 5, size - 12, size - 10);
    ctx.strokeStyle = "#47424f";
    ctx.lineWidth = 3;
    for (let step = 0; step < 4; step += 1) {
      const inset = tile === "<" ? 6 + step * 3 : 15 - step * 3;
      ctx.strokeRect(x + inset, y + 9 + step * 7, size - inset * 2, 6);
    }
  }

  ctx.strokeStyle = "rgba(243,238,225,.05)";
  ctx.lineWidth = 1;
  if (!grassy) ctx.strokeRect(x, y, size, size);
}

function drawCastleThrone(x, y) {
  const left = x - 48;
  const top = y - 48;
  ctx.fillStyle = "#4b394b";
  roundRect(left + 8, top + 8, 128, 132, 10); ctx.fill();
  ctx.fillStyle = "#8e263f";
  roundRect(left + 28, top + 30, 88, 88, 8); ctx.fill();
  ctx.fillStyle = "#c59c42";
  ctx.fillRect(left + 4, top + 112, 136, 22);
  ctx.fillRect(left + 12, top + 2, 18, 136);
  ctx.fillRect(left + 114, top + 2, 18, 136);
  ctx.strokeStyle = "#29232c"; ctx.lineWidth = 5; ctx.strokeRect(left + 8, top + 8, 128, 132);
  if (!playerState.hasStaff) {
    ctx.strokeStyle = "#f2d93d"; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(left + 92, top + 58); ctx.lineTo(left + 80, top + 98);
    ctx.moveTo(left + 88, top + 59); ctx.lineTo(left + 96, top + 54); ctx.lineTo(left + 97, top + 63); ctx.stroke();
  }
}
function drawFallenKingStatue(x, y) {
  ctx.save();
  ctx.translate(x + 2, y + 34);
  ctx.rotate(-0.52);
  ctx.fillStyle = "#918b91";
  ctx.strokeStyle = "#4d4952";
  ctx.lineWidth = 3;
  ctx.fillRect(0, -15, 45, 27);
  ctx.strokeRect(0, -15, 45, 27);
  ctx.beginPath();
  ctx.arc(38, -2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, -14);
  ctx.lineTo(18, -3);
  ctx.lineTo(13, 9);
  ctx.moveTo(29, -13);
  ctx.lineTo(25, -1);
  ctx.lineTo(34, 8);
  ctx.stroke();
  ctx.restore();
}

function drawDustyDagger(x, y) {
  ctx.save();
  ctx.translate(x + 13, y + 10);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#a7a4a0";
  ctx.strokeStyle = "#3c3940";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(15, 26);
  ctx.lineTo(8, 36);
  ctx.lineTo(1, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6e4f2c";
  ctx.fillRect(4, -9, 8, 12);
  ctx.fillRect(-1, 1, 18, 5);
  ctx.restore();
}

function drawCastleWallDecorations(cameraX, cameraY) {
  [19, 20, 21].forEach((col, index) => {
    const x = col * config.tileSize - cameraX + 7;
    const y = 2 * config.tileSize - cameraY - 5;
    ctx.fillStyle = ["#594361", "#68464f", "#465769"][index];
    ctx.strokeStyle = "#302b35";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 17, y);
    ctx.quadraticCurveTo(x + 3, y + 15, x + 7, y + 43);
    ctx.lineTo(x + 29, y + 43);
    ctx.quadraticCurveTo(x + 33, y + 15, x + 17, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#a99058";
    ctx.fillRect(x + 5, y - 4, 25, 4);
  });
}

function drawAreaRocks(area, cameraX, cameraY, areaId = currentAreaId) {
  const decorations = area.rockDecorations || [];

  decorations.forEach((rock) => {
    const worldX = rock.x * config.tileSize;
    const worldY = rock.y * config.tileSize;
    const boundsWidth = rock.width * config.tileSize;
    const boundsHeight = rock.height * config.tileSize;
    if (worldX + boundsWidth < cameraX || worldX > cameraX + canvas.width) return;
    if (worldY + boundsHeight < cameraY || worldY > cameraY + canvas.height) return;

    const drawSize = rockDrawSize(rock);
    if (areaId === "sylvan") {
      const spriteName = rock.size === "large" ? "rockLarge" : ((rock.x + rock.y) % 2 ? "rockSmall" : "rockWide");
      const sprite = readySylvanSprite(spriteName);
      if (sprite) {
        const spriteWidth = rock.size === "large" ? boundsWidth - 6 : boundsWidth - 8;
        const spriteHeight = spriteWidth * sprite.height / sprite.width;
        ctx.drawImage(sprite, worldX - cameraX + (boundsWidth - spriteWidth) / 2,
          worldY - cameraY + boundsHeight - spriteHeight - 3, spriteWidth, spriteHeight);
        return;
      }
    }
    const drawX = worldX - cameraX + (boundsWidth - drawSize.width) / 2;
    const drawY = worldY - cameraY + boundsHeight - drawSize.height - 4;

    if (rock.image?.complete && rock.image.naturalWidth > 0) {
      ctx.drawImage(rock.image, drawX, drawY, drawSize.width, drawSize.height);
    } else {
      drawFallbackRock(drawX, drawY, drawSize.width, drawSize.height);
    }
  });
}

function rockDrawSize(rock) {
  if (rock.size === "large") return { width: 86, height: 82 };
  if (rock.width > rock.height) return { width: 68, height: 54 };
  if (rock.height > rock.width) return { width: 54, height: 68 };
  if (rock.size === "medium") return { width: 58, height: 58 };
  return { width: 38, height: 38 };
}

function drawFallbackRock(x, y, width, height) {
  ctx.fillStyle = "#6b6576";
  ctx.fillRect(x + 4, y + 6, width - 8, height - 10);
  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 4, y + 6, width - 8, height - 10);
}

function drawPlayer() {
  const camera = areas[currentAreaId];
  const screenX = player.x - camera.cameraX;
  const screenY = player.y - camera.cameraY;
  const sitProgress = castleState.sitting ? Math.min(1, (performance.now() - castleState.sittingStartedAt) / 260) : 0;
  const spriteScale = 0.72;
  const spriteWidth = 78 * spriteScale;
  const spriteHeight = 132 * spriteScale;
  const drawX = screenX + player.width / 2 - spriteWidth / 2;
  const drawY = screenY + player.height - spriteHeight + 8 + sitProgress * 24;
  ctx.save();
  ctx.translate(drawX + (player.facing === -1 ? spriteWidth : 0), drawY);
  ctx.scale(player.facing * spriteScale, spriteScale * (1 - sitProgress * 0.2));
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

  const bossSprite = enemy.regionBoss ? regionalBossSprites[enemy.regionBoss] : kyleSprite;
  if (enemy.kind === "boss" && bossSprite.complete && bossSprite.naturalWidth > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(x + enemy.width / 2, y + enemy.height - 1, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const height = 108;
    const width = height * bossSprite.naturalWidth / bossSprite.naturalHeight;
    ctx.drawImage(bossSprite, x + enemy.width / 2 - width / 2, y + enemy.height - height, width, height);
    ctx.restore();
    ctx.font = "900 13px Trebuchet MS";
    ctx.fillStyle = "#f2c95f";
    ctx.fillText(`${enemy.name} | Lv ${enemy.level}`, x - 32, y - 65);
    return;
  }

  if (enemy.restored) {
    if (enemy.visual === "flying") drawRestoredSoul(enemy, x, y);
    else drawRestoredCube(enemy, x, y);
    return;
  }

  const sprite = enemy.originArea === "sylvan" ? readySylvanSprite(enemy.visual) : null;
  if (sprite) {
    const flying = enemy.visual === "flying";
    const width = enemy.width + 6;
    const height = width * sprite.height / sprite.width;
    const hover = flying ? 12 + Math.sin(performance.now() / 260 + enemy.level) * 3 : 0;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(x + enemy.width / 2, y + enemy.height - 2, flying ? 16 : 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.restored) {
      ctx.shadowColor = "#f2c95f";
      ctx.shadowBlur = 12;
    }
    ctx.translate(x + enemy.width / 2, y + enemy.height - height - hover);
    ctx.scale(-(enemy.facing || 1), 1);
    ctx.drawImage(sprite, -width / 2, 0, width, height);
    ctx.restore();
    ctx.font = "800 12px Trebuchet MS";
    ctx.fillStyle = enemy.restored ? "#f2c95f" : "#f3eee1";
    ctx.fillText(enemy.restored ? "..." : `Lv ${enemy.level}`, x - 2, y + enemy.height - height - hover - 8);
    return;
  }

  ctx.save();
  if (enemy.facing === -1) {
    ctx.translate(2 * x + enemy.width, 0);
    ctx.scale(-1, 1);
  }
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

  ctx.restore();
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

function drawRestoredCube(enemy, x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(x + enemy.width / 2, y + enemy.height + 1, enemy.width / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "#f1ead8";
  roundRect(x, y, enemy.width, enemy.height, 9);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#34313b";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#34313b";
  const talking = enemy === talkingResident && performance.now() < dialogueUntil;
  const eyeShift = talking ? enemy.gazeX : enemy.facing === -1 ? -3 : 3;
  const eyeY = y + 14 + (talking ? enemy.gazeY : 0);
  roundRect(x + 10 + eyeShift, eyeY, 5, 12, 3);
  ctx.fill();
  roundRect(x + 24 + eyeShift, eyeY, 5, 12, 3);
  ctx.fill();
  drawRestoredLabel(x, y - 10);
}

function drawRestoredSoul(enemy, x, y) {
  const hover = 9 + Math.sin(performance.now() / 260 + enemy.level) * 2;
  const centerX = x + enemy.width / 2;
  const baseY = y + enemy.height - hover;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.beginPath();
  ctx.ellipse(centerX, y + enemy.height, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(centerX, baseY);
  ctx.scale(1.2, 1.2);
  ctx.fillStyle = "#f4e84c";
  ctx.strokeStyle = "#242129";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, -19);
  ctx.quadraticCurveTo(-18, -6, -15, 12);
  ctx.quadraticCurveTo(0, 18, 15, 12);
  ctx.quadraticCurveTo(18, -6, 12, -19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fffdf4";
  ctx.fillRect(-11, -30, 22, 16);
  ctx.strokeRect(-11, -30, 22, 16);
  ctx.fillStyle = "#242129";
  const talking = enemy === talkingResident && performance.now() < dialogueUntil;
  const eyeX = talking ? enemy.gazeX : (enemy.facing || 1) * 2;
  const eyeY = talking ? enemy.gazeY : 0;
  ctx.fillRect(-6 + eyeX, -25 + eyeY, 3, 7);
  ctx.fillRect(4 + eyeX, -25 + eyeY, 3, 7);
  ctx.strokeStyle = "#f2d93d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -29);
  ctx.lineTo(-13, -32);
  ctx.lineTo(-15, -36);
  ctx.moveTo(-13, -32);
  ctx.lineTo(-17, -33);
  ctx.moveTo(8, -29);
  ctx.lineTo(13, -32);
  ctx.lineTo(15, -36);
  ctx.moveTo(13, -32);
  ctx.lineTo(17, -33);
  ctx.stroke();
  ctx.restore();
  drawRestoredLabel(x, baseY - 50);
}

function drawRestoredLabel(x, y) {
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillStyle = "#f2c95f";
  ctx.fillText("...", x + 10, y);
}

function drawVillageResidents(cameraX, cameraY, areaId = currentAreaId) {
  villageResidents(areaId).forEach((resident) => {
    drawEnemy(positionedResident(resident), cameraX, cameraY);
  });
}

function drawVillageHouse(x, y, palette) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath();
  ctx.ellipse(x + 24, y + 45, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.houseRoof;
  ctx.strokeStyle = "#242129";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 24, y - 22);
  ctx.lineTo(x - 7, y + 9);
  ctx.lineTo(x + 55, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.houseBody;
  roundRect(x - 1, y + 8, 50, 42, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.door;
  ctx.fillRect(x + 17, y + 23, 15, 27);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.fillRect(x + 6, y + 20, 9, 10);
  ctx.fillRect(x + 35, y + 20, 9, 10);
  ctx.restore();
}
function drawVillageGarageHouse(x, y, palette) {
  const size = config.tileSize;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(x + size * 1.5, y + size * 2 + 5, size * 1.65, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = palette.houseRoof; ctx.strokeStyle = "#242129"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + size * 1.5, y - 28); ctx.lineTo(x - 10, y + 24); ctx.lineTo(x + size * 3 + 10, y + 24); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.houseBody; roundRect(x, y + 22, size * 3, size * 1.75, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.door; ctx.fillRect(x + size * .25, y + size * 1.1, size * .42, size * .65);
  ctx.fillStyle = "#62727a"; ctx.fillRect(x + size * 1.25, y + size * .82, size * 1.45, size * .93);
  ctx.strokeStyle = "#2a3137"; ctx.lineWidth = 3; ctx.strokeRect(x + size * 1.25, y + size * .82, size * 1.45, size * .93);
  ctx.restore();
}
function drawTree(x, y, scale, leafColor = "#7ac878") {
  ctx.fillStyle = "#6b4f22";
  ctx.fillRect(x + 15 * scale, y + 25 * scale, 8 * scale, 22 * scale);
  ctx.fillStyle = leafColor;
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
  const labelWidth = Math.min(470, canvas.width - 36);
  ctx.fillStyle = "rgba(20,19,23,.75)";
  roundRect(18, 18, labelWidth, 62, 8);
  ctx.fill();
  ctx.fillStyle = "#f3eee1";
  ctx.font = "900 22px Trebuchet MS";
  ctx.fillText(title, 34, 45);
  ctx.fillStyle = "#b8b2a4";
  ctx.font = "700 14px Trebuchet MS";
  ctx.fillText(subtitle, 34, 67);
}
