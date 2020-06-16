"use strict";
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;

class Scene {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = U / 2;
        this.solids = new Set();
        this.actors = new Set();
        this.elements = new Set();
        this.transition = undefined;
        this.player = undefined;
        this.startPositionX = undefined;
        this.startPositionY = undefined;
    }

    setStartPosition(x, y) {
        this.startPositionX = x;
        this.startPositionY = y;
    }

    static fromString(s) {
        const lines = s.split('\n');
        const height = lines.length;
        const width = lines[0].length;
        const scene = new Scene(width * U, height * U);
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines[i].length; j++) {
                const x = j * U;
                const y = (height - i - 1) * U;
                switch (lines[i][j]) {
                    case 'x':
                        scene.addSolid(new physics.Solid(x, y, U, U));
                        break;
                    case '!':
                        scene.addElement(new physics.Hazard(x, y, U, U));
                        break;
                    case 'P':
                        scene.setStartPosition(x, y);
                        break;
                    case 'B':
                        scene.addElement(new physics.Spring(x, y));
                        break;
                    case 'D':
                        scene.addElement(new physics.DashDiamond(x, y));
                        break;
                    case 'S':
                        scene.addElement(new physics.Strawberry(x, y));
                        break;
                    case '-':
                        scene.addSolid(new physics.Platform(x, y, U));
                        break;
                    case '=':
                        scene.addSolid(new physics.CrumblingBlock(x, y, U, U));
                        break;
                    default:
                        break;
                }
            }
        }
        return scene;
    }

    static fromJSON(data) {
        const scene = new Scene(data.width * U, data.height * U);
        const mainLayer = data.layers.find(l => l.name === 'main');
        for (let i = 0; i < mainLayer.data.length; i++) {
            const v = mainLayer.data[i] & 0x0FFFFFFF;
            const f = (mainLayer.data[i] >> 28) & 0xF;
            if (v !== 0) {
                const x = (i % mainLayer.width) * U;
                const y = (mainLayer.height - ~~(i / mainLayer.width) - 1) * U;
                let rotation;
                switch(f) {
                    case 0b0000:
                        rotation = 0;
                        break;
                    case 0b1010:
                        rotation = 1;
                        break;
                    case 0b1100:
                        rotation = 2;
                        break;
                    case 0b0110:
                        rotation = 3;
                        break;
                    default:
                        rotation = -1;
                }
                const tileData = {
                    'set': 'forest',
                    'index': v & 0x00FFFFFF,
                    'rotation': rotation,
                }

                switch(v) {
                    case 38:
                    case 39:
                    case 40:
                    case 46:
                    case 47:
                    case 48:
                        scene.addSolid(new physics.Platform(x, y, U, tileData));
                        break;
                    case 73:
                        scene.addElement(new physics.Hazard(x, y, U, U, tileData));
                        break;
                    default:
                        scene.addSolid(new physics.Solid(x, y, U, U, tileData));
                }
            }
        }
        return scene;
    }

    update(deltaTime) {
        for (const solid of this.solids) {
            solid.update(deltaTime);
        }
        for (const element of this.elements) {
            element.update(deltaTime);
        }
        for (const actor of this.actors) {
            actor.update(deltaTime);
        }
        // scroll view
        if (this.player) {
            if (this.player.x - this.scrollX > .60 * constants.VIEW_WIDTH) {
                this.scrollX = Math.min(
                    this.width - constants.VIEW_WIDTH,
                    this.player.x - .60 * constants.VIEW_WIDTH);
            } else if (this.player.x - this.scrollX < .40 * constants.VIEW_WIDTH) {
                this.scrollX = Math.max(
                    0,
                    this.player.x - .40 * constants.VIEW_WIDTH);
            }
            if (this.player.y - this.scrollY > .60 * constants.VIEW_HEIGHT) {
                this.scrollY = Math.min(
                    this.height - constants.VIEW_HEIGHT,
                    this.player.y - .60 * constants.VIEW_HEIGHT);
            } else if (this.player.y - this.scrollY < .40 * constants.VIEW_HEIGHT) {
                this.scrollY = Math.max(
                    U / 2,
                    this.player.y - .40 * constants.VIEW_HEIGHT);
            }
        }
    }

    draw(ctx) {
        for (const solid of this.solids) {
            solid.draw(ctx);
        }
        for (const element of this.elements) {
            element.draw(ctx);
        }
        for (const actor of this.actors) {
            actor.draw(ctx);
        }
    }

    setPlayer(player) {
        if (this.player) this.removeActor(this.player);
        if (player) this.addActor(player);
        this.player = player;
    }

    addActor(actor) {
        this.actors.add(actor);
        actor.scene = this;
    }

    removeActor(actor) {
        this.actors.delete(actor);
        actor.scene = undefined;
    }

    addSolid(solid) {
        this.solids.add(solid);
        solid.scene = this;
    }

    removeSolid(solid) {
        this.solids.remove(solid);
        solid.scene = undefined;
    }

    addElement(element) {
        this.elements.add(element);
        element.scene = this;
    }

    removeElement(element) {
        this.elements.delete(element);
        element.scene = undefined;
    }
}


module.exports = {
    Scene,
}
