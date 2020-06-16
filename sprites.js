const spritesSheet = {};

function range(n) {
    return new Array(n).fill(0).map((x, i) => i);
}


function makeSprites() {
    spritesSheet.canvas = document.createElement('canvas');
    spritesSheet.canvas.width = 16 * 8;
    spritesSheet.canvas.height = 16 * 18;
    spritesSheet.context = spritesSheet.canvas.getContext('2d');
    spritesSheet.context.imageSmoothingEnabled = false;
    const img = new Image();
    img.addEventListener('load', () => addSprites(img));
    img.src = "images/hero_sprites.png";
}


function addSprites(image) {
    spritesSheet.context.scale(1, -1);
    for (let i of range(9)) {
        for (let j of range(8)) {
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, 16 * j, -16 * (2 * i + 1), 16, 16);
            spritesSheet.context.save();
            spritesSheet.context.scale(-1, 1);
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, -16 * (j+1), -16 * (2 * i + 2), 16, 16);
            spritesSheet.context.restore();
        }
    }
}


makeSprites();
module.exports = {
    spritesSheet,
};