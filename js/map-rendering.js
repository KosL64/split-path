// map-rendering: see CODE-OWNERSHIP.md for shared state and loading order.

function drawWorld() {
  if (gameMode === "kingdom") drawKingdomMap();
  else drawAreaMap();
  drawPlayer();
}

function drawKingdomMap() {
  const { cameraX, cameraY } = kingdomMap;
  ctx.fillStyle = "#242631";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawKingdomTerrain(cameraX, cameraY);

  kingdomMap.paths.forEach((path) => {
    ctx.strokeStyle = "#f2c95f";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    path.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x - cameraX, y - cameraY);
      else ctx.lineTo(x - cameraX, y - cameraY);
    });
    ctx.stroke();
    ctx.strokeStyle = "#6b4f22";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  kingdomMap.nodes.forEach((node) => drawKingdomNode(node, cameraX, cameraY));
  drawMapLabel("Kingdom Map", "Choose an area with Z or Enter");
}

function drawKingdomTerrain(cameraX, cameraY) {
  ctx.fillStyle = "#405f5b";
  for (let x = -80; x < kingdomMap.width; x += 160) {
    for (let y = -60; y < kingdomMap.height; y += 140) {
      const drawX = x - cameraX;
      const drawY = y - cameraY;
      if (drawX < -80 || drawY < -80 || drawX > canvas.width + 80 || drawY > canvas.height + 80) continue;
      drawTree(drawX, drawY, 1);
    }
  }

  ctx.fillStyle = "rgba(119, 103, 202, 0.22)";
  ctx.beginPath();
  ctx.arc(1220 - cameraX, 210 - cameraY, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawKingdomNode(node, cameraX, cameraY) {
  const x = node.x - cameraX;
  const y = node.y - cameraY;

  ctx.save();
  ctx.shadowColor = node.unlocked ? "rgba(242,201,95,.7)" : "rgba(20,19,23,.6)";
  ctx.shadowBlur = node.unlocked ? 18 : 0;
  ctx.fillStyle = node.unlocked ? "#f2c95f" : "#5b5962";
  ctx.strokeStyle = "#211f25";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (node.id === "sylvan") drawTinyShrine(x - 18, y - 28);
  if (node.id === "pristineCastle") drawTower(x - 17, y - 48);
  if (node.id === "azureApex") drawRuin(x - 24, y - 30);
  if (node.id === "azureVillage") drawHouse(x - 26, y - 34);
  if (node.id === "sylvanVillage") drawHouse(x - 26, y - 34);
  if (node.id === "controlledPalace") drawTower(x - 17, y - 48);
  if (node.id === "controlledPlains") drawTree(x - 18, y - 35, 1.2);

  ctx.fillStyle = node.unlocked ? "#f3eee1" : "#b8b2a4";
  ctx.font = "800 15px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(node.name, x, y + 48);
  ctx.textAlign = "left";
}

function drawAreaMap() {
  const area = areas[currentAreaId];
  const cameraX = area.cameraX;
  const cameraY = area.cameraY;
  const palette = areaPalette(currentAreaId);

  ctx.fillStyle = area.healed ? palette.healedBase : palette.controlledBase;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startCol = Math.floor(cameraX / config.tileSize);
  const endCol = Math.ceil((cameraX + canvas.width) / config.tileSize);
  const startRow = Math.floor(cameraY / config.tileSize);
  const endRow = Math.ceil((cameraY + canvas.height) / config.tileSize);

  if (currentAreaId === "sylvan" && sylvanGrassPattern) {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ctx.fillStyle = sylvanGrassPattern;
    ctx.fillRect(cameraX, cameraY, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = area.healed ? "rgba(0,0,0,.04)" : "rgba(0,0,0,.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      drawTile(area.map[row]?.[col], col * config.tileSize - cameraX, row * config.tileSize - cameraY, area.healed, currentAreaId);
    }
  }

  drawAreaRocks(area, cameraX, cameraY);
  if (currentAreaId === "pristineCastle") drawCastleWallDecorations(cameraX, cameraY);
  area.enemies.filter((enemy) => !enemy.relocated).forEach((enemy) => drawEnemy(enemy, cameraX, cameraY));
  drawVillageResidents(cameraX, cameraY);
  const subtitle = currentAreaId === "pristineCastle"
    ? playerState.hasStaff
      ? castleState.exitCleared ? "The road to the kingdom is open." : "Use the staff to clear the fallen rocks."
      : "Search the ruined throne room for your staff."
    : area.signs
    ? "Read the signs, then leave through the glowing doorway."
    : villageSourceFor(currentAreaId)
      ? "Restored residents gather here."
      : "Explore the area. Step on the glowing exit to return.";
  drawMapLabel(area.name, subtitle);
}

function areaPalette(areaId) {
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
  const size = config.tileSize;
  const palette = areaPalette(areaId);
  const grassy = areaId === "sylvan" && sylvanGrassPattern;
  ctx.fillStyle = healed ? palette.healedFloor : palette.floor;
  if (!grassy) ctx.fillRect(x, y, size, size);

  if (tile === "^") {
    ctx.fillStyle = areaId === "pristineCastle" ? "#706b7c" : palette.wall;
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
    if (areaId === "sylvan" && readySylvanSprite("tree")) {
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

  if (tile === "H") drawCastleThrone(x, y);
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

  ctx.strokeStyle = "rgba(243,238,225,.05)";
  ctx.lineWidth = 1;
  if (!grassy) ctx.strokeRect(x, y, size, size);
}

function drawCastleThrone(x, y) {
  ctx.fillStyle = "#4b394b";
  ctx.fillRect(x + 4, y - 8, 40, 54);
  ctx.fillStyle = "#8e263f";
  ctx.fillRect(x + 10, y - 2, 28, 39);
  ctx.fillStyle = "#c59c42";
  ctx.fillRect(x + 2, y + 32, 44, 10);
  ctx.fillRect(x + 5, y - 12, 7, 60);
  ctx.fillRect(x + 36, y - 12, 7, 60);
  ctx.strokeStyle = "#29232c";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 4, y - 8, 40, 54);

  if (!playerState.hasStaff) {
    ctx.strokeStyle = "#f2d93d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 38, y - 7);
    ctx.lineTo(x + 26, y + 33);
    ctx.moveTo(x + 34, y - 6);
    ctx.lineTo(x + 42, y - 11);
    ctx.lineTo(x + 43, y - 2);
    ctx.stroke();
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

function drawAreaRocks(area, cameraX, cameraY) {
  const decorations = area.rockDecorations || [];

  decorations.forEach((rock) => {
    const worldX = rock.x * config.tileSize;
    const worldY = rock.y * config.tileSize;
    const boundsWidth = rock.width * config.tileSize;
    const boundsHeight = rock.height * config.tileSize;
    if (worldX + boundsWidth < cameraX || worldX > cameraX + canvas.width) return;
    if (worldY + boundsHeight < cameraY || worldY > cameraY + canvas.height) return;

    const drawSize = rockDrawSize(rock);
    if (currentAreaId === "sylvan") {
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
  const camera = gameMode === "kingdom" ? kingdomMap : areas[currentAreaId];
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

  if (enemy.kind === "boss" && kyleSprite.complete && kyleSprite.naturalWidth > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(x + enemy.width / 2, y + enemy.height - 1, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(kyleSprite, x - 18, y - 55, 82, 108);
    ctx.restore();
    ctx.font = "900 13px Trebuchet MS";
    ctx.fillStyle = "#f2c95f";
    ctx.fillText("Kyle | Lv 100", x - 20, y - 65);
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
  ctx.shadowColor = "rgba(242,201,95,.8)";
  ctx.shadowBlur = 18;
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

function drawVillageResidents(cameraX, cameraY) {
  villageResidents().forEach((resident) => {
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
