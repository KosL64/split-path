// map-assets: see CODE-OWNERSHIP.md for shared state and loading order.

const rockAssetPath = "img/assets/rocks/Objects_separately";
const enhancedRockAreas = new Set(["sylvan", "azureApex"]);
let sylvanGrassPattern = null;
const sylvanGrass = new Image();
sylvanGrass.onload = () => {
  const tile = document.createElement("canvas");
  tile.width = 192;
  tile.height = 108;
  tile.getContext("2d").drawImage(sylvanGrass, 0, 0, tile.width, tile.height);
  sylvanGrassPattern = ctx.createPattern(tile, "repeat");
};
sylvanGrass.src = "img/assets/sylvan/grass.jpg";
const restoredSylvanSprites = Object.fromEntries(
  ["ground", "flying"].map((name) => {
    const image = new Image();
    image.src = `img/assets/sylvan/${name}-restored.png`;
    return [name, image];
  })
);
const sylvanSprites = Object.fromEntries(
  ["rockWide", "rockLarge", "rockSmall", "tree", "ground", "flying"].map((name) => {
    const image = new Image();
    image.src = `img/assets/sylvan/${name}.png`;
    return [name, image];
  })
);

const kyleSpritePath = "img/assets/enemy-kyle-boss/Kyle-transparent.png";
const kyleSprite = new Image();
kyleSprite.src = kyleSpritePath;

function readySylvanSprite(name, restored = false) {
  const sprite = restored ? restoredSylvanSprites[name] : sylvanSprites[name];
  return sprite?.complete && sprite.naturalWidth > 0 ? sprite : null;
}
const rockSpriteFiles = {
  sylvan: {
    large: ["Rock1_grass_shadow1.png", "Rock2_grass_shadow2.png", "Rock4_grass_shadow3.png"],
    medium: ["Rock5_grass_shadow1.png", "Rock6_grass_shadow2.png", "Rock1_grass_shadow4.png"],
    small: ["Rock2_grass_shadow5.png", "Rock4_grass_shadow5.png", "Rock6_grass_shadow5.png"]
  },
  azureApex: {
    large: ["Rock8_1.png", "Rock7_1.png", "Rock4_1.png"],
    medium: ["Rock8_3.png", "Rock7_3.png", "Rock4_3.png"],
    small: ["Rock8_5.png", "Rock7_5.png", "Rock4_5.png"]
  }
};
const rockSprites = Object.fromEntries(
  Object.entries(rockSpriteFiles).map(([areaId, sizes]) => [
    areaId,
    Object.fromEntries(
      Object.entries(sizes).map(([size, files]) => [
        size,
        files.map((fileName) => {
          const image = new Image();
          image.src = `${rockAssetPath}/${fileName}`;
          return image;
        })
      ])
    )
  ])
);
