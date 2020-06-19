const spritesSheet = {};

function range(n) {
    return new Array(n).fill(0).map((x, i) => i);
}


function makeSprites() {
    spritesSheet.canvas = document.createElement('canvas');
    spritesSheet.context = spritesSheet.canvas.getContext('2d');
    spritesSheet.context.imageSmoothingEnabled = false;
    const img = new Image();
    img.addEventListener('load', () => addSprites(img));
    img.src = "images/hero_sprites.png";
}


function addSprites(image) {
    spritesSheet.canvas.width = image.width;
    spritesSheet.canvas.height = 2 * image.height;

    for (let i of range(image.height / 16)) {
        for (let j of range(image.width / 16)) {
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, 16 * j, 16 * 2 * i, 16, 16);
            spritesSheet.context.save();
            spritesSheet.context.scale(-1, 1);
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, -16 * (j+1), 16 * (2 * i + 1), 16, 16);
            spritesSheet.context.restore();
        }
    }
}


makeSprites();
module.exports = {
    spritesSheet,
};