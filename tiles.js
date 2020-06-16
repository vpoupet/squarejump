const tilesSheet = {};

function makeTiles(tilesets) {
    tilesSheet.nbTiles = tilesets.reduce((t, x) => t + x.tilecount, 0);
    tilesSheet.canvas = document.createElement('canvas');
    tilesSheet.canvas.width = 16 * tilesSheet.nbTiles;
    tilesSheet.canvas.height = 128;
    tilesSheet.context = tilesSheet.canvas.getContext('2d');
    tilesSheet.context.imageSmoothingEnabled = false;
    tilesSheet.offsets = {};
    tilesSheet.offset = 0;
    for (const t of tilesets) {
        const img = new Image();
        img.addEventListener('load', () => addTileset(t, img));
        img.src = 'tilemaps/' + t.image;
    }
}

function addTileset(tileset, image) {
    tilesSheet.offsets[tileset.name] = tilesSheet.offset;
    tilesSheet.context.scale(1, -1);
    for (let i = 0; i < tileset.imageheight; i += 16) {
        for (let j = 0; j < tileset.imagewidth; j += 16) {
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            tilesSheet.context.drawImage(image, j, i, 16, 16, tilesSheet.offset, -16, 16, 16);

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 32);
            tilesSheet.context.rotate(Math.PI/2);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 48);
            tilesSheet.context.rotate(Math.PI);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 64);
            tilesSheet.context.rotate(-Math.PI / 2);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            // tilesSheet.context.drawImage(image, j, i, 16, 16, 0, 0, 16, 16);
            // tilesSheet.context.restore();
            //
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            // tilesSheet.context.drawImage(image, j, i, 16, 16, 0, 0, 16, 16);
            // tilesSheet.context.restore();

            tilesSheet.offset += 16;
        }
    }
}

makeTiles([
    {
        "columns": 8,
        "image": "forest_tileset.png",
        "imageheight": 160,
        "imagewidth": 128,
        "margin": 0,
        "name": "forest",
        "spacing": 0,
        "tilecount": 80,
        "tiledversion": "1.3.5",
        "tileheight": 16,
        "tilewidth": 16,
        "type": "tileset",
        "version": 1.2
    },
]);


module.exports = {
    tilesSheet: tilesSheet,
}