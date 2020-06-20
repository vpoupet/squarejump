"use strict";
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;

class Scene {
    constructor(width, height) {
        /**
         * Width of the Scene in pixels
         * @type {number}
         */
        this.width = width;
        /**
         * Height of the scene in pixels
         * @type {number}
         */
        this.height = height;
        this.scrollX = 0;
        this.scrollY = U / 2;
        this.solids = new Set();
        this.actors = new Set();
        this.elements = new Set();
        this.decorations = new Set();
        this.spawnPoints = [];
        this.transition = undefined;
        this.player = undefined;
        this.spawnPointIndex = 0;
    }

    static fromJSON(data) {
        const scene = new Scene(data.width * U, data.height * U);
        // make walls
        const walls = [
                new physics.Solid(0, -1.5 * U, data.width * U, 0),
                new physics.Solid(-.5 * U, 0, 0, data.height * U),
                new physics.Solid((data.width + .5) * U, 0, 0, data.height * U),
            ];
        for (const wall of walls) {
            wall.canBeClimbed = false;
            scene.addSolid(wall);
        }

        const mainLayer = data.layers.find(l => l.name === 'main');
        for (let i = 0; i < mainLayer.data.length; i++) {
            const index = mainLayer.data[i];
            if (index !== 0) {
                const x = (i % mainLayer.width) * U;
                const y = ~~(i / mainLayer.width) * U;
                const tileData = {
                    x: (index - 1) % 8,
                    y: ~~((index - 1) / 8),
                    shiftX: 0,
                    shiftY: 0,
                };

                switch (index - 1) {
                    case 21:
                        scene.addElement(new physics.DashDiamond(x + U / 2, y + U / 2, tileData));
                        break;
                    case 31:
                        scene.spawnPoints.push({x: x, y: y});
                        break;
                    case 37:
                    case 38:
                    case 39:
                    case 45:
                    case 46:
                    case 47:
                        scene.addSolid(new physics.Platform(x, y, U, tileData));
                        break;
                    case 40:
                        scene.addElement(new physics.SpikesUp(x, y, tileData));
                        break;
                    case 41:
                        scene.addElement(new physics.SpikesRight(x, y, tileData));
                        break;
                    case 42:
                        scene.addElement(new physics.SpikesDown(x, y, tileData));
                        break;
                    case 43:
                        scene.addElement(new physics.SpikesLeft(x, y, tileData));
                        break;
                    case 49:
                    case 58:
                    case 59:
                    case 60:
                    case 61:
                        scene.addElement(new physics.Hazard(x, y, U, U, tileData));
                        break;
                    case 13:
                        scene.addElement(new physics.Strawberry(x + U / 2, y + U / 2, tileData));
                        break;
                    case 57:
                        scene.addSolid(new physics.CrumblingBlock(x, y, tileData));
                        break;
                    case 50:
                    case 52:
                    case 53:
                        scene.addElement(new physics.Spring(x, y, tileData));
                        break;
                    default:
                        scene.addSolid(new physics.Solid(x, y, U, U, tileData));
                }
            }
        }
        return scene;
    }

    update(deltaTime) {
        for (const element of this.elements) {
            element.update(deltaTime);
        }
        for (const actor of this.actors) {
            actor.beforeUpdate(deltaTime);
            actor.update(deltaTime);
            actor.afterUpdate(deltaTime);
        }
        for (const solid of this.solids) {
            solid.update(deltaTime);
        }
        for (const decoration of this.decorations) {
            decoration.update(deltaTime);
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
        for (const element of this.elements) {
            element.draw(ctx);
        }
        for (const solid of this.solids) {
            solid.draw(ctx);
        }
        for (const decoration of this.decorations) {
            decoration.draw(ctx);
        }
        for (const actor of this.actors) {
            actor.draw(ctx);
        }
    }

    setPlayer(player) {
        if (this.player) {
            this.removeActor(this.player);
        }
        if (player) {
            this.addActor(player);
        }
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
