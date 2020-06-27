"use strict";
const constants = require('./constants');
const globals = require('./globals');
const graphics = require('./graphics');
const inputs = require('./inputs');
const menu = require('./menu');
const physics = require('./physics');

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
        this.things = new Set();
        this.spawnPoints = [];
        this.transition = undefined;
        this.spawnPointIndex = 0;
        this.shouldReset = false;
        this.isRunning = true;
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
                const tileData = new graphics.TileData(index - 1);

                switch (index - 1) {
                    case 21:
                        scene.addThing(new physics.DashDiamond(x + U / 2, y + U / 2));
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
                        scene.addThing(new physics.SpikesUp(x, y));
                        break;
                    case 41:
                        scene.addThing(new physics.SpikesRight(x, y));
                        break;
                    case 42:
                        scene.addThing(new physics.SpikesDown(x, y));
                        break;
                    case 43:
                        scene.addThing(new physics.SpikesLeft(x, y));
                        break;
                    case 49:
                    case 58:
                    case 59:
                    case 60:
                    case 61:
                        scene.addThing(new physics.Hazard(x, y, U, U, tileData));
                        break;
                    case 13:
                        scene.addThing(new physics.Strawberry(x + U / 2, y + U / 2));
                        break;
                    case 57:
                        scene.addSolid(new physics.CrumblingBlock(x, y));
                        break;
                    case 50:
                    case 52:
                    case 53:
                        scene.addThing(new physics.Spring(x, y, tileData));
                        break;
                    default:
                        scene.addSolid(new physics.Solid(x, y, U, U, tileData));
                }
            }
        }
        return scene;
    }

    update(deltaTime) {
        if (this.isRunning) {
            if (inputs.isTappedKey("Escape") || globals.players.some(p => p.inputs.isTapped("pause"))) {
                menu.menuStack.unshift(menu.mainMenu);
                return;
            }
            // update all elements
            for (const solid of this.solids) {
                solid.beforeUpdate(deltaTime);
            }
            for (const thing of this.things) {
                thing.beforeUpdate(deltaTime);
            }
            for (const actor of this.actors) {
                actor.beforeUpdate(deltaTime);
            }

            for (const solid of this.solids) {
                solid.update(deltaTime);
            }
            for (const thing of this.things) {
                thing.update(deltaTime);
            }
            for (const actor of this.actors) {
                actor.update(deltaTime);
            }

            // scroll view
            if (globals.players.length > 0) {
                if (globals.players[0].character.x - this.scrollX > .60 * constants.VIEW_WIDTH) {
                    this.scrollX = Math.min(
                        this.width - constants.VIEW_WIDTH,
                        globals.players[0].character.x - .60 * constants.VIEW_WIDTH);
                } else if (globals.players[0].character.x - this.scrollX < .40 * constants.VIEW_WIDTH) {
                    this.scrollX = Math.max(
                        0,
                        globals.players[0].character.x - .40 * constants.VIEW_WIDTH);
                }
                if (globals.players[0].character.y - this.scrollY > .60 * constants.VIEW_HEIGHT) {
                    this.scrollY = Math.min(
                        this.height - constants.VIEW_HEIGHT,
                        globals.players[0].character.y - .60 * constants.VIEW_HEIGHT);
                } else if (globals.players[0].character.y - this.scrollY < .40 * constants.VIEW_HEIGHT) {
                    this.scrollY = Math.max(
                        U / 2,
                        globals.players[0].character.y - .40 * constants.VIEW_HEIGHT);
                }
            }

            // reset scene if needed
            if (this.shouldReset) {
                this.reset();
            }
        }
    }

    reset() {
        this.shouldReset = false;
        for (const thing of this.things) {
            thing.reset();
        }
        for (const solid of this.solids) {
            solid.reset();
        }
        for (const actor of this.actors) {
            actor.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-this.scrollX, -this.scrollY);
        for (const thing of this.things) {
            thing.draw(ctx);
        }
        for (const solid of this.solids) {
            solid.draw(ctx);
        }
        for (const actor of this.actors) {
            actor.draw(ctx);
        }
        ctx.restore();
        // draw HUD
        ctx.save();
        ctx.fillStyle = "#ffffffaa";
        ctx.fillRect(1, 1, 42, 10);
        ctx.fillStyle = "#000000";
        ctx.textAlign = "right";
        ctx.font = 'normal 6px gameboy';
        ctx.fillText(`${globals.players[0].character.strawberries.size + globals.players[0].character.temporaryStrawberries.size}/20`, 40, 8);
        ctx.drawImage(graphics.sheets.tiles, 80, 16, 16, 16, 2, 2, 8, 8);
        ctx.restore();
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

    addThing(thing) {
        this.things.add(thing);
        thing.scene = this;
    }

    removeThing(thing) {
        this.things.delete(thing);
        thing.scene = undefined;
    }
}


module.exports = {
    Scene,
}
