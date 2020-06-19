(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

// From Celeste source code
const MAX_RUN_SPEED = 90;
const RUN_ACCELERATION = 1000;
const RUN_DECELERATION = 400;
const AIR_FACTOR = .65;
const JUMP_SPEED = 105;
const JUMP_HORIZONTAL_BOOST = 40;
const MAX_FALL_SPEED = 160;
const GRAVITY = 900;
const JUMP_GRACE_TIME = .1;
const VAR_JUMP_TIME = .2;
const CLIMB_UP_SPEED = 45;
const CLIMB_SLIP_SPEED = 30;
const WALL_JUMP_CHECK_DISTANCE = 3;
const WALL_JUMP_HSPEED = MAX_RUN_SPEED + JUMP_HORIZONTAL_BOOST;
const DASH_SPEED = 240;
const END_DASH_SPEED = 160;
const END_DASH_UP_FACTOR = .75;
const DASH_TIME = .15;
const DASH_COOLDOWN = .2;

// Other constants
const MOMENTUM_STORE_TIME = .1;
const MOMENTUM_FACTOR = .75;
const DASH_FREEZE_TIME = .05;
const BOUNCE_TIME = .2;
const BOUNCE_SPEED = 180;
const DYING_TIME = .8;
const STATE_NORMAL = 0;
const STATE_JUMP = 1;
const STATE_DASH = 2;
const STATE_DEAD = 3;
const STATE_BOUNCE = 4;

const GRID_SIZE = 8;
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;

module.exports = {
    MAX_RUN_SPEED,
    RUN_ACCELERATION,
    RUN_DECELERATION,
    AIR_FACTOR,
    JUMP_SPEED,
    JUMP_HORIZONTAL_BOOST,
    MAX_FALL_SPEED,
    GRAVITY,
    JUMP_GRACE_TIME,
    VAR_JUMP_TIME,
    CLIMB_UP_SPEED,
    CLIMB_SLIP_SPEED,
    WALL_JUMP_CHECK_DISTANCE,
    WALL_JUMP_HSPEED,
    DASH_SPEED,
    END_DASH_SPEED,
    END_DASH_UP_FACTOR,
    DASH_TIME,
    DASH_COOLDOWN,
    MOMENTUM_STORE_TIME,
    MOMENTUM_FACTOR,
    DASH_FREEZE_TIME,
    BOUNCE_TIME,
    BOUNCE_SPEED,
    DYING_TIME,
    STATE_NORMAL,
    STATE_JUMP,
    STATE_DASH,
    STATE_DEAD,
    STATE_BOUNCE,
    GRID_SIZE,
    VIEW_WIDTH,
    VIEW_HEIGHT,
};

},{}],2:[function(require,module,exports){
"use strict";
const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
let pressedKeys = new Set();
let pressedButtons = new Set();
let gamepadPressedButtons = [];

class PlayerInputs {
    constructor() {
        this.xAxis = 0;
        this.yAxis = 0;
        this.jumpPressedBuffer = false;
        this.jumpHeld = false;
        this.gamepadIndex = 0;
        this.gamepadmap = {
            jump: 0,
            dash: 1,
            up: 12,
            down: 13,
            left: 14,
            right: 15,
        }
        this.keymap = {
            right: 'ArrowRight',
            left: 'ArrowLeft',
            up: 'ArrowUp',
            down: 'ArrowDown',
            jump: 'g',
            dash: 'f',
        }
        this.timers = {
            jumpBuffer: 0,
            dashBuffer: 0,
        };
    }

    updateGamepad() {
        pressedButtons.clear();
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (gamepad) {
            for (let j = 0; j < gamepad.buttons; j++) {
                if (gamepad.buttons[j].pressed) {
                    pressedButtons.add(j);
                }
            }
        }
    }

    update(deltaTime) {
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        // this.updateGamepad();

        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        this.xAxis = 0;
        this.yAxis = 0;
        if (pressedKeys.has(this.keymap.left) ||
            (gamepad && gamepad.buttons[this.gamepadmap.left].pressed)) {
            this.xAxis -= 1;
        }
        if (pressedKeys.has(this.keymap.right) ||
            (gamepad && gamepad.buttons[this.gamepadmap.right].pressed)) {
            this.xAxis += 1;
        }
        if (pressedKeys.has(this.keymap.up) ||
            (gamepad && gamepad.buttons[this.gamepadmap.up].pressed)) {
            this.yAxis += 1;
        }
        if (pressedKeys.has(this.keymap.down) ||
            (gamepad && gamepad.buttons[this.gamepadmap.down].pressed)) {
            this.yAxis -= 1;
        }
        const prevJump = this.jumpHeld;
        this.jumpHeld = pressedKeys.has(this.keymap.jump) ||
            (gamepad && gamepad.buttons[this.gamepadmap.jump].pressed);
        if (!prevJump && this.jumpHeld) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
            this.jumpPressedBuffer = true;
        } else {
            this.jumpPressedBuffer &= this.timers.jumpBuffer > 0;
        }

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap.dash) ||
            (gamepad && gamepad.buttons[this.gamepadmap.dash].pressed);
        if (!prevDash && this.dashHeld) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (this.timers.dashBuffer > 0);
    }
}


module.exports = {
    PlayerInputs,
    gamepadPressedButtons,
    pressedKeys,
}

},{}],3:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const inputs = require('./inputs');
const player = require('./player');
const maps = require('./maps');
const sprites = require('./sprites');

const SCALING = 3;
let SLOWDOWN_FACTOR = 1;
const FIXED_DELTA_TIME = true;
const FRAME_RATE = 60;

let context;
let currentScene;
let lastUpdate = Date.now();
let isRunning = false;
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();
let slowdownCounter = 0;
let scrollX = 0;
let scrollY = 0;

function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
}


function setScroll(x, y) {
    context.translate(scrollX - x, scrollY - y);
    scrollX = x;
    scrollY = y;
}


function start() {
    isRunning = true;
    update();
}


function stop() {
    isRunning = false;
}


function update() {
    const timeNow = Date.now();

    if (isRunning) {
        slowdownCounter += 1;
        if (slowdownCounter >= SLOWDOWN_FACTOR) {
            slowdownCounter -= SLOWDOWN_FACTOR;
            frameCounter += 1;

            if (timeNow - frameRateStartTime >= 1000 * frameRateRefresh) {
                console.log(`${frameCounter / frameRateRefresh} FPS`);
                frameCounter = 0;
                frameRateStartTime = timeNow;
            }
            const deltaTime = FIXED_DELTA_TIME ?
                1 / FRAME_RATE :
                Math.min((timeNow - lastUpdate) / (1000 * SLOWDOWN_FACTOR), .05);

            context.clearRect(0, 0, SCALING * constants.VIEW_WIDTH, SCALING * constants.VIEW_HEIGHT);
            currentScene.update(deltaTime);

            // Transition from one room to another
            if (currentScene.transition) {
                const prevScene = currentScene;
                currentScene = currentScene.transition.targetScene;
                prevScene.transition = undefined;
            }
            setScroll(currentScene.scrollX, currentScene.scrollY);
            currentScene.draw(context);
            lastUpdate = timeNow;
        }
        requestAnimationFrame(update);
    }
}

window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
        switch (e.key) {
            case 'w':
                if (SLOWDOWN_FACTOR === 1) {
                    slowdown(8);
                } else {
                    slowdown(1);
                }
                break;
        }
    });
    document.addEventListener('keyup', e => {
        inputs.pressedKeys.delete(e.key);
    });

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;
    const canvas = document.getElementById("layer1");
    context = canvas.getContext('2d');

    canvas.width = SCALING * constants.VIEW_WIDTH;
    canvas.height = SCALING * constants.VIEW_HEIGHT;
    context.scale(SCALING, SCALING);
    context.imageSmoothingEnabled = false;

    // load all scenes and start game
    maps.loadScenes.then(() => {
        currentScene = maps.scenes.CELESTE_01;
        currentScene.spawnPointIndex = 1;
        currentScene.setPlayer(new player.Player());
        currentScene.player.respawn();
        start();
    });
};


// Gamepad API
window.addEventListener("gamepadconnected", (event) => {
    console.log("A gamepad connected:");
    console.log(event.gamepad);
    inputs.gamepadPressedButtons[event.gamepad.index] = new Set();
});

window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.gamepadPressedButtons[event.gamepad.index] = undefined;
});

},{"./constants":1,"./inputs":2,"./maps":4,"./player":7,"./sprites":9}],4:[function(require,module,exports){
"use strict"
const scene = require('./scene');
const movement = require('./movement');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;

const scenes = {};


function makeTransitionUp(scene1, x1, index1, scene2, x2, index2, width) {
    scene1.addElement(new physics.Transition(x1 * U, -U, width * U, 0, scene2, x2 * U, scene2.height - 3 * U, index2));
    scene2.addElement(new physics.Transition(x2 * U, scene2.height, width * U, 0, scene1, x1 * U, 2 * U, index1));
}


function makeTransitionRight(scene1, y1, index1, scene2, y2, index2, height) {
    scene1.addElement(new physics.Transition(scene1.width, y1 * U, 0, height * U, scene2, U, y2 * U, index2));
    scene2.addElement(new physics.Transition(0, y2 * U, 0, height * U, scene1, scene1.width - U, y1 * U, index1));
}


const loadScenes = new Promise(resolve => {
    Promise.all([
        fetch("tilemaps/celeste01.json").then(response => response.json()),
        fetch("tilemaps/celeste02.json").then(response => response.json()),
        fetch("tilemaps/celeste03.json").then(response => response.json()),
        fetch("tilemaps/celeste04.json").then(response => response.json()),
        fetch("tilemaps/celeste05.json").then(response => response.json()),
        fetch("tilemaps/celeste06.json").then(response => response.json()),
        fetch("tilemaps/celeste07.json").then(response => response.json()),
        fetch("tilemaps/celeste08.json").then(response => response.json()),
        fetch("tilemaps/celeste09.json").then(response => response.json()),
        fetch("tilemaps/celeste10.json").then(response => response.json()),
        fetch("tilemaps/celeste11.json").then(response => response.json()),
        fetch("tilemaps/celeste12.json").then(response => response.json()),
        fetch("tilemaps/celeste13.json").then(response => response.json()),
        fetch("tilemaps/celeste14.json").then(response => response.json()),
        fetch("tilemaps/louis01.json").then(response => response.json()),
        fetch("tilemaps/louis02.json").then(response => response.json()),
        fetch("tilemaps/louis03.json").then(response => response.json()),
        fetch("tilemaps/louis04.json").then(response => response.json()),

    ]).then(responses => {
        const sceneNames = [
            "CELESTE_01",
            "CELESTE_02",
            "CELESTE_03",
            "CELESTE_04",
            "CELESTE_05",
            "CELESTE_06",
            "CELESTE_07",
            "CELESTE_08",
            "CELESTE_09",
            "CELESTE_10",
            "CELESTE_11",
            "CELESTE_12",
            "CELESTE_13",
            "CELESTE_14",
            "LOUIS_01",
            "LOUIS_02",
            "LOUIS_03",
            "LOUIS_04"];
        for (let i = 0; i < sceneNames.length; i++) {
            scenes[sceneNames[i]] = scene.Scene.fromJSON(responses[i]);
        }

        scenes.CELESTE_04.addSolid(new physics.TriggerBlock(14 * U, 10 * U, 3 * U, 2 * U, new movement.SequenceMovement([
            new movement.Movement(.75),
            new movement.LinearMovement(14 * U, 10 * U, 23 * U, 9 * U, .5),
            new movement.Movement(1),
            new movement.LinearMovement(23 * U, 9 * U, 14 * U, 10 * U, 1.5),
        ])));

        scenes.CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, 33 * U, 4 * U, 2 * U, new movement.SequenceMovement([
            new movement.Movement(.75),
            new movement.LinearMovement(13 * U, 33 * U, 13 * U, 23 * U, .45),
            new movement.Movement(1),
            new movement.LinearMovement(13 * U, 23 * U, 13 * U, 33 * U, 1.5),
        ])));

        scenes.CELESTE_08.addSolid(new physics.TriggerBlock(14 * U, 16 * U, 2 * U, 3 * U, new movement.SequenceMovement([
            new movement.Movement(.75),
            new movement.LinearMovement(14 * U, 16 * U, 21 * U, 12 * U, .5),
            new movement.Movement(1),
            new movement.LinearMovement(21 * U, 12 * U, 14 * U, 16 * U, 2),
        ])));

        scenes.CELESTE_14.addSolid(new physics.TriggerBlock(11 * U, 29 * U, 4 * U, 2 * U, new movement.SequenceMovement([
            new movement.Movement(.75),
            new movement.LinearMovement(11 * U, 29 * U, 19 * U, 29 * U, .35),
            new movement.Movement(1),
            new movement.LinearMovement(19 * U, 29 * U, 11 * U, 29 * U, 1.5),
        ])));

        scenes.CELESTE_14.addSolid(new physics.TriggerBlock(26 * U, 28 * U, 5 * U, 2 * U, new movement.SequenceMovement([
            new movement.Movement(.75),
            new movement.LinearMovement(26 * U, 28 * U, 26 * U, 22 * U, .35),
            new movement.Movement(1),
            new movement.LinearMovement(26 * U, 22 * U, 26 * U, 28 * U, 1.5),
        ])));

        makeTransitionUp(scenes.CELESTE_01, 31, 0, scenes.CELESTE_02, 1, 1, 5);
        makeTransitionUp(scenes.CELESTE_02, 34, 0, scenes.CELESTE_03, 2, 1, 4);
        makeTransitionUp(scenes.CELESTE_03, 33, 0, scenes.CELESTE_04, 3, 1, 4);
        makeTransitionUp(scenes.CELESTE_04, 21, 0, scenes.CELESTE_05, 4, 1, 4);
        makeTransitionUp(scenes.CELESTE_05, 22, 0, scenes.CELESTE_06, 3, 1, 4);
        makeTransitionRight(scenes.CELESTE_07, 29, 0, scenes.CELESTE_06, 30, 1, 3);
        makeTransitionRight(scenes.CELESTE_06, 30, 2, scenes.CELESTE_08, 5, 0, 4);
        makeTransitionUp(scenes.CELESTE_06, 35, 0, scenes.CELESTE_09, 1, 2, 3);
        makeTransitionRight(scenes.CELESTE_10, 7, 0, scenes.CELESTE_09, 7, 1, 4);
        makeTransitionRight(scenes.CELESTE_11, 8, 1, scenes.CELESTE_10, 8, 1, 4);
        makeTransitionUp(scenes.CELESTE_10, 2, 1, scenes.CELESTE_12, 42, 1, 3);
        makeTransitionUp(scenes.CELESTE_11, 3, 0, scenes.CELESTE_12, 3, 0, 2);
        makeTransitionRight(scenes.CELESTE_09, 0, 0, scenes.CELESTE_13, 0, 0, 10);
        makeTransitionRight(scenes.CELESTE_13, 0, 1, scenes.CELESTE_14, 22, 2, 10);


        makeTransitionUp(scenes.LOUIS_01, 35, 0, scenes.LOUIS_02, 4, 1, 3);
        makeTransitionUp(scenes.LOUIS_03, 3, 0, scenes.LOUIS_02, 13, 0, 3);
        makeTransitionUp(scenes.LOUIS_03, 30, 1, scenes.LOUIS_02, 23, 2, 3);
        makeTransitionUp(scenes.LOUIS_04, 4, 0, scenes.LOUIS_02, 35, 3, 3);

        resolve();
    });
});


module.exports = {
    scenes,
    loadScenes,
}

},{"./constants":1,"./movement":5,"./physics":6,"./scene":8}],5:[function(require,module,exports){
"use strict";


class Movement {
    constructor(duration, count = 1) {
        this.duration = duration;
        this.timer = 0;
        this.count = count;
        this.remainingCount = count;
    }

    update(deltaTime, thing) {
        this.timer += deltaTime;
        if (this.duration && this.remainingCount && this.timer > this.duration) {
            this.remainingCount -= 1;
            if (this.remainingCount) {
                this.timer -= this.duration;
            }
        }
    }

    reset() {
        this.timer = 0;
        this.remainingCount = this.count;
    }
}


class LinearMovement extends Movement {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.mx = (x2 - x1) / duration;
        this.my = (y2 - y1) / duration;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        if (this.timer < this.duration) {
            const r = this.timer / this.duration;
            thing.moveTo((1 - r) * this.x1 + r * this.x2, (1 - r) * this.y1 + r * this.y2);
            thing.setMomentum(this.mx, this.my);
        } else {
            thing.moveTo(this.x2, this.y2);
        }
    }
}


class SequenceMovement extends Movement {
    constructor(movements, count = 1) {
        super(undefined, count);
        this.movements = movements;
        this.index = 0;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        while (this.remainingCount && deltaTime > 0) {
            this.movements[this.index].update(deltaTime, thing);
            deltaTime = this.movements[this.index].timer - this.movements[this.index].duration;
            if (deltaTime > 0) {
                this.index += 1;
                if (this.index >= this.movements.length) {
                    this.index = 0;
                    this.remainingCount -= 1;
                }
                this.movements[this.index].reset();
            }
        }
    }
}


class SineMovement extends Movement {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.duration = duration;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        if (this.timer < this.duration) {
            const angle = this.timer * 2 * Math.PI / this.duration;
            const ratio = (Math.cos(angle) + 1) / 2;
            thing.moveTo(ratio * this.x1 + (1 - ratio) * this.x2, ratio * this.y1 + (1 - ratio) * this.y2);
            const dratio = Math.PI * Math.sin(angle) / this.duration;
            const mx = dratio * (this.x2 - this.x1);
            const my = dratio * (this.y2 - this.y1);
            thing.setMomentum(mx, my);
        } else {
            thing.moveTo(this.x1, this.y1);
        }
    }
}


module.exports = {
    Movement,
    LinearMovement,
    SequenceMovement,
    SineMovement,
}
},{}],6:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const U = constants.GRID_SIZE;

const tileset = new Image();
tileset.src = 'tilemaps/tileset.png';

/**
 * Tests whether two segments on a 1D line overlap.
 * The function returns true if the intersection of both segments is of non-zero measure (if the end of one segment
 * coincides with the start of the next, they are not considered as overlapping)
 *
 * @param start1 {number} coordinate of the start of the first segment
 * @param size1 {number} width of the first segment
 * @param start2 {number} coordinate of the start of the second segment
 * @param size2 {number} width of the first segment
 * @returns {boolean} whether the two segments overlap
 */
function segmentsOverlap(start1, size1, start2, size2) {
    return start1 < start2 + size2 && start2 < start1 + size1;
}


/**
 * Things are the superclass of all objects that interact in the physics model (obstacles, platforms, players, hazards,
 * etc.)
 * All things are represented as axis-aligned bounding boxes and the space they occupy in a scene is therefore defined
 * as a position (x, y) and a size (width, height). At all times, positions and sizes should be integers. Sub-integer
 * positions are considered with the use of the `xRemainder` and `yRemainder` attributes (that should have an absolute
 * value < 1)
 */
class Thing {
    constructor(x, y, width, height, tileData = undefined) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.tileData = tileData;
        this.color = '#000000';
        this.movement = undefined;
        this.scene = undefined;
        this.timers = {};
        this.isActive = true;
    }

    overlaps(other) {
        return (this.x + this.width > other.x &&
            other.x + other.width > this.x &&
            this.y + this.height > other.y &&
            other.y + other.height > this.y);
    }

    draw(ctx) {
        if (this.tileData !== undefined) {
            ctx.drawImage(
                tileset,
                16 * this.tileData.x, 16 * this.tileData.y,
                16, 16,
                this.x + this.tileData.shiftX, this.y + this.tileData.shiftY,
                8, 8);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        if (this.movement) {
            this.movement.update(deltaTime, this);
        }
    }

    move(dx, dy) {
    }

    moveTo(x, y) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder);
    }

    setMovement(movement) {
        this.movement = movement;
        return this;
    }
}


class Actor extends Thing {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.movedSelfX = 0;
        this.movedSelfY = 0;
        this.movedX = 0;
        this.movedY = 0;
    }

    moveX(amount, onCollide = undefined) {
        this.xRemainder += amount;
        let move = Math.round(this.xRemainder);
        this.xRemainder -= move;

        if (move) {
            let newX = this.x + move;
            let collisionSolid = undefined;
            if (move > 0) {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, move, 0)) {
                        if (solid.x - this.width < newX) {
                            newX = solid.x - this.width;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, move, 0)) {
                        if (solid.x + solid.width > newX) {
                            newX = solid.x + solid.width;
                            collisionSolid = solid;
                        }
                    }
                }
            }
            const dx = newX - this.x;
            this.x = newX;
            if (collisionSolid && onCollide) {
                onCollide();
            }
            this.movedX += dx;
        }
    }

    moveY(amount, onCollide = undefined) {
        this.yRemainder += amount;
        let move = Math.round(this.yRemainder);
        this.yRemainder -= move;

        if (move) {
            let newY = this.y + move;
            let collisionSolid = undefined;
            if (move > 0) {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, 0, move)) {
                        if (solid.y - this.height < newY) {
                            newY = solid.y - this.height;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, 0, move)) {
                        if (solid.y + solid.height > newY) {
                            newY = solid.y + solid.height;
                            collisionSolid = solid;
                        }
                    }
                }
            }
            const dy = newY - this.y;
            this.y = newY;
            if (collisionSolid && onCollide) {
                onCollide();
            }
            this.movedY += dy;
        }
    }

    beforeUpdate(deltaTime) {
        this.movedX = 0;
        this.movedY = 0;
        this.movedSelfX = 0;
        this.movedSelfY = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
    }

    afterUpdate(deltaTime) {
        this.movedSelfX = this.movedX;
        this.movedSelfY = this.movedY;
        this.movedX = 0;
        this.movedY = 0;
    }

    isRiding(solid) {
        return this.y + this.height === solid.y && segmentsOverlap(this.x, this.width, solid.x, solid.width);
    }

    squish() {
    }
}


class Solid extends Thing {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
        this.collidable = true;
        this.color = '#6c2c0b';
        this.momentumX = 0;
        this.momentumY = 0;
        this.timers.momentum = 0;
        this.canBeClimbed = true;
    }

    getMomentumX() {
        if (this.timers.momentum > 0) {
            return this.momentumX;
        }
        return 0;
    }

    getMomentumY() {
        if (this.timers.momentum > 0) {
            return this.momentumY;
        }
        return 0;
    }

    move(dx, dy, mx = undefined, my = undefined) {
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        if (moveX || moveY) {
            const riding = new Set();
            for (const actor of this.scene.actors) {
                if (actor.isActive && actor.isRiding(this)) {
                    riding.add(actor);
                }
            }
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;

                if (moveX > 0) {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveX(this.x + this.width - actor.x, () => actor.squish());

                            } else if (riding.has(actor)) {
                                if (actor.movedX <= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX < moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                            } else if (riding.has(actor)) {
                                if (actor.movedX >= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX > moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                            }
                        }
                    }
                }
            }
            if (moveY) {
                this.yRemainder -= moveY;
                this.y += moveY;

                if (moveY > 0) {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                            } else if (riding.has(actor)) {
                                if (actor.movedY <= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY < moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                            } else if (riding.has(actor)) {
                                if (actor.movedY >= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY > moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                            }
                        }
                    }
                }
            }
            this.collidable = true;
        }
    }

    setMomentum(mx, my) {
        this.timers.momentum = constants.MOMENTUM_STORE_TIME;
        this.momentumX = mx;
        this.momentumY = my;
    }

    collidesWithMovingActor(actor, dx = 0, dy = 0) {
        if (dx > 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width + dx) &&
                segmentsOverlap(this.y, this.height, actor.y, actor.height);
        } else if (dx < 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x + dx, actor.width - dx) &&
                segmentsOverlap(this.y, this.height, actor.y, actor.height);
        } else if (dy > 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width) &&
                segmentsOverlap(this.y, this.height, actor.y, actor.height + dy);
        } else if (dy < 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width) &&
                segmentsOverlap(this.y, this.height, actor.y + dy, actor.height - dy);
        }
        return false;
    }
}


class Hazard extends Thing {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
        this.collidable = true;
        this.color = '#f31314';
    }

    onContactWith(player) {
        player.die();
    }

    move(dx, dy) {
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        this.xRemainder -= moveX;
        this.x += moveX;
        this.yRemainder -= moveY;
        this.y += moveY;
    }
}


class Platform extends Solid {
    constructor(x, y, width, tileData) {
        super(x, y, width, U / 2, tileData);
        this.color = "#a8612a";
        this.canBeClimbed = false;
    }

    collidesWithMovingActor(actor, dx = 0, dy = 0) {
        if (dy > 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width) &&
                actor.y + actor.height <= this.y &&
                actor.y + actor.height + dy > this.y;
        }
        return false;
    }

    draw(ctx) {
        if (this.tileData !== undefined) {
            ctx.drawImage(
                tileset,
                16 * (this.tileData.x), 16 * this.tileData.y,
                16, 16,
                this.x, this.y,
                8, 8);
        } else {
            super.draw(ctx);
        }
    }
}


class Spring extends Thing {
    constructor(x, y, tileData) {
        super(x, y + U / 2, U, U / 2, tileData);
        this.tileData.shiftY = -U / 2;
    }

    onContactWith(player) {
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
    }
}


class DashDiamond extends Thing {
    constructor(x, y, tileData) {
        super(x, y, U, U, tileData);
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    onContactWith(player) {
        if (player.restoreDash()) {
            this.isActive = false;
            this.timers.cooldown = 2;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


class Strawberry extends Thing {
    constructor(x, y, tileData) {
        super(x, y, U, U, tileData);
    }

    onContactWith(player) {
        if (player.isActive) {
            player.temporaryStrawberries.add(this);
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


class Transition extends Thing {
    constructor(x, y, width, height, targetScene, targetX, targetY, spawnPointIndex = 0) {
        super(x, y, width, height);
        this.targetScene = targetScene;
        this.targetX = targetX;
        this.targetY = targetY;
        this.spawnPointIndex = spawnPointIndex;
    }

    onContactWith(player) {
        player.x += this.targetX - this.x;
        player.y += this.targetY - this.y;
        player.makeTransition(this);
        this.scene.transition = this;
    }
}


class CrumblingBlock extends Solid {
    constructor(x, y, tileData) {
        super(x, y, U, U, tileData);
        this.isFalling = false;
        this.timers.fall = 0;
        this.timers.cooldown = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isFalling) {
            if (this.timers.fall <= 0) {
                this.isFalling = false;
                this.isActive = false;
                this.timers.cooldown = 2;
            }
        } else if (!this.isActive) {
            if (this.timers.cooldown <= 0) {
                let shouldBecomeActive = true;
                for (const actor of this.scene.actors) {
                    if (actor.isActive && this.overlaps(actor)) {
                        shouldBecomeActive = false;
                    }
                }
                if (shouldBecomeActive) {
                    this.isActive = true;
                }
            }
        } else {
            if (this.scene.player && this.scene.player.isRiding(this)) {
                this.isFalling = true;
                this.timers.fall = .5;
            }
        }
    }

    draw(ctx) {
        if (this.isActive) {
            if (this.isFalling) {
                const alpha = 2 * this.timers.fall;
                ctx.save();
                ctx.globalAlpha = alpha;
                super.draw(ctx);
                ctx.restore();
            } else {
                super.draw(ctx);
            }
        }
    }
}


class TriggerBlock extends Solid {
    constructor(x, y, width, height, movement) {
        super(x, y, width, height);
        this.triggeredMovement = movement;
        this.spriteIndexes = new Array((width / U) * (height / U)).fill(0).map(_ => Math.floor(Math.random() * 3));
    }

    update(deltaTime) {
        super.update(deltaTime);
        const player = this.scene.player;
        if (player) {
            if (this.movement && this.movement.remainingCount === 0) {
                this.movement = undefined;
            }
            if (this.movement === undefined && player.isRiding(this)) {
                this.movement = this.triggeredMovement;
                this.movement.reset();
            }
        }
    }

    draw(ctx) {
        let index = 0;
        for (let x = this.x; x < this.x + this.width; x += U) {
            for (let y = this.y; y < this.y + this.height; y += U) {
                ctx.drawImage(
                    tileset,
                    16 * this.spriteIndexes[index], 16 * 8,
                    16, 16,
                    x, y,
                    8, 8);
                index += 1;
            }
        }
    }
}


class SpikesUp extends Thing {
    constructor(x, y, tileData) {
        tileData.shiftY = -U/2;
        super(x, y + U/2, U, U/2, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


class SpikesDown extends Thing {
    constructor(x, y, tileData) {
        super(x, y, U, U/2, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


class SpikesRight extends Thing {
    constructor(x, y, tileData) {
        super(x, y, U / 2, U, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


class SpikesLeft extends Thing {
    constructor(x, y, tileData) {
        tileData.shiftX = -U/2;
        super(x + U/2, y, U/2, U, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


module.exports = {
    segmentsOverlap,
    Hazard,
    Solid,
    Actor,
    Platform,
    Spring,
    DashDiamond,
    Strawberry,
    Transition,
    TriggerBlock,
    CrumblingBlock,
    SpikesUp,
    SpikesDown,
    SpikesLeft,
    SpikesRight,
}

},{"./constants":1}],7:[function(require,module,exports){
"use strict"
const inputs = require('./inputs');
const physics = require('./physics');
const constants = require('./constants');
const sprites = require('./sprites');
const ANIMATION_SLOWDOWN = 6;

const ANIMATION_IDLE = [4, 4];
const ANIMATION_RUN = [1, 6];
const ANIMATION_JUMP = [6, 3];
const ANIMATION_FALL = [5, 3];
const ANIMATION_DIE = [0, 8];

class Player extends physics.Actor {
    constructor(x = 0, y = 0) {
        super(x, y, 8, 14);
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.nbDashes = 1;

        this.inputs = new inputs.PlayerInputs;
        this.isGrounded = true;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;
        this.carryingSolids = new Set();
        this.temporaryStrawberries = new Set();
        this.strawberries = new Set();

        this.state = constants.STATE_NORMAL;
        this.sprite_direction = 1;
        this.sprite_row = 1;
        this.nb_sprites = 4;
        this.animation_counter = 0;

        // timers
        this.timers.jumpGrace = 0;
        this.timers.dashCooldown = 0;
        this.timers.dashFreeze = 0;
        this.timers.dash = 0;
        this.timers.varJump = 0;
        this.timers.dying = 0;
        this.timers.bounce = 0;
    }

    draw(ctx) {
        const index = ~~(this.animation_counter / ANIMATION_SLOWDOWN);
        const row = 2 * this.sprite_row + (this.sprite_direction === -1 ? 1 : 0);
        ctx.drawImage(
            sprites.spritesSheet.canvas,
            16 * index, 16 * row,
            16, 16,
            this.x - 4, this.y - 2,
            16, 16);
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.inputs.update(deltaTime);
        this.animation_counter += 1;
        this.animation_counter %= this.nb_sprites * ANIMATION_SLOWDOWN;

        // check environment
        this.isGrounded = false;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;
        this.carryingSolids.clear();
        for (const solid of this.scene.solids) {
            if (solid.isActive) {
                if (this.y + this.height === solid.y && physics.segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                    // player is standing on a solid
                    this.carryingSolids.add(solid);
                    this.isGrounded = true;
                }
                if (solid.canBeClimbed && physics.segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                    // check for walls on right and left at distance <= WALL_JUMP_CHECK_DISTANCE
                    const distanceLeft = this.x - solid.x - solid.width;
                    if (0 <= distanceLeft && distanceLeft < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallLeft = true;
                    }
                    const distanceRight = solid.x - this.x - this.width;
                    if (0 <= distanceRight && distanceRight < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallRight = true;
                    }

                    if ((this.inputs.xAxis === 1 && this.x + this.width === solid.x) ||
                        (this.inputs.xAxis === -1 && this.x === solid.x + solid.width)) {
                        // check if player is hugging a wall
                        this.carryingSolids.add(solid);
                        this.isHuggingWall = true;
                    }
                }
            }
        }

        if (this.isGrounded) {
            this.timers.jumpGrace = constants.JUMP_GRACE_TIME;
            if (this.state !== constants.STATE_DASH || this.dashSpeedY <= 0) {
                this.restoreDash();
            }
        }

        this.updateMovement(deltaTime);
        this.updateAnimation();

        this.moveX(this.speedX * deltaTime, () => this.speedX = 0);
        this.moveY(this.speedY * deltaTime, () => this.speedY = 0);

        // interact with objects
        for (const element of this.scene.elements) {
            if (element.isActive && this.overlaps(element)) {
                element.onContactWith(this);
            }
        }

        if (this.y >= this.scene.height) {
            this.die();
        }
    }

    updateMovement(deltaTime) {
        switch (this.state) {
            case constants.STATE_DEAD:
                if (this.timers.dying <= 0) {
                    this.respawn();
                }
                this.speedX = 0;
                this.speedY = 0;
                break;
            case constants.STATE_NORMAL:
                if (this.tryUpdateDash(deltaTime)) break;
                if (this.tryUpdateJump(deltaTime)) break;
                this.updateHorizontalMovement(deltaTime);
                this.updateVerticalMovement(deltaTime);
                break;
            case constants.STATE_JUMP:
                if (this.inputs.jumpHeld && this.timers.varJump > 0) {
                    this.speedY = Math.min(this.speedY, -constants.JUMP_SPEED);
                } else {
                    this.setState(constants.STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                break;
            case constants.STATE_DASH:
                if (this.timers.dash > constants.DASH_TIME) {
                    this.speedX = 0;
                    this.speedY = 0;
                } else if (0 < this.timers.dash && this.timers.dash <= constants.DASH_TIME) {
                    this.speedX = this.dashSpeedX;
                    this.speedY = this.dashSpeedY;
                    if (this.tryUpdateJump(deltaTime)) break;
                } else {
                    // end of dash
                    const speed = this.dashSpeedX && this.dashSpeedY ? constants.END_DASH_SPEED / Math.sqrt(2) : constants.END_DASH_SPEED;
                    this.speedX = Math.sign(this.dashSpeedX) * speed;
                    this.speedY = Math.sign(this.dashSpeedY) * speed;
                    if (this.dashSpeedY < 0) {
                        this.speedY *= constants.END_DASH_UP_FACTOR;
                    }
                    this.setState(constants.STATE_NORMAL);
                }
                break;
            case constants.STATE_BOUNCE:
                if (this.timers.bounce > 0) {
                    this.speedY = -constants.BOUNCE_SPEED;
                } else {
                    this.setState(constants.STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                break;
        }
    }

    tryUpdateDash(deltaTime) {
        if (this.nbDashes > 0 &&
            this.inputs.dashPressedBuffer &&
            this.timers.dashCooldown <= 0 &&
            (this.inputs.xAxis || this.inputs.yAxis)
        ) {
            const dashSpeed = this.inputs.xAxis && this.inputs.yAxis ? constants.DASH_SPEED / Math.sqrt(2) : constants.DASH_SPEED;
            this.dashSpeedX = this.inputs.xAxis * Math.max(Math.abs(this.speedX), dashSpeed);
            this.dashSpeedY = -this.inputs.yAxis * dashSpeed;
            this.speedX = 0;
            this.speedY = 0;
            this.inputs.dashPressedBuffer = false;
            this.timers.dashCooldown = constants.DASH_COOLDOWN + constants.DASH_FREEZE_TIME;
            this.setState(constants.STATE_DASH);
            this.nbDashes -= 1;
            return true;
        }
        return false;
    }

    tryUpdateJump(deltaTime) {
        let didJump = false;
        if (this.inputs.jumpPressedBuffer && this.timers.jumpGrace > 0) {
            // regular jump
            this.inputs.jumpPressedBuffer = false;
            this.speedX += this.inputs.xAxis * constants.JUMP_HORIZONTAL_BOOST;
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        } else if (this.inputs.jumpPressedBuffer && (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            this.inputs.jumpPressedBuffer = false;
            let dx = this.hasWallLeft ? 1 : -1;
            this.speedX = dx * constants.WALL_JUMP_HSPEED;
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        }
        if (didJump) {
            let mx = 0;
            let my = 0;
            for (const solid of this.carryingSolids) {
                const sx = solid.getMomentumX();
                const sy = solid.getMomentumY();
                if (Math.abs(sx) > Math.abs(mx)) mx = sx;
                if (Math.abs(sy) > Math.abs(my)) my = sy;
            }
            this.speedX += constants.MOMENTUM_FACTOR * mx;
            this.speedY += constants.MOMENTUM_FACTOR * my;
        }
        return didJump;
    }

    updateHorizontalMovement(deltaTime) {
        if (this.inputs.xAxis !== 0) this.sprite_direction = this.inputs.xAxis;

        // horizontal movement
        let sx = Math.abs(this.speedX);        // absolute value of the horizontal speed of the player
        const dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        const mult = this.isGrounded ? 1 : constants.AIR_FACTOR;

        // passive deceleration
        if (dx * this.inputs.xAxis <= 0) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, 0);
        } else if (sx > constants.MAX_RUN_SPEED) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        }

        // active acceleration
        if (dx * this.inputs.xAxis > 0 && sx < constants.MAX_RUN_SPEED) {
            sx = Math.min(sx + constants.RUN_ACCELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        } else if (dx * this.inputs.xAxis < 0) {
            sx -= constants.RUN_ACCELERATION * deltaTime * mult;
        }
        this.speedX = dx * sx;
    }

    updateVerticalMovement(deltaTime) {
        if (!this.isGrounded) {
            if (this.isHuggingWall) {
                if (this.inputs.yAxis === 1) {
                    this.speedY = -constants.CLIMB_UP_SPEED;
                } else {
                    this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.CLIMB_SLIP_SPEED);
                }
            } else {
                this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.MAX_FALL_SPEED);
            }
        }
    }

    updateAnimation() {
        if (this.state === constants.STATE_DEAD) {

        } else {
            if (this.isGrounded) {
                if (this.inputs.xAxis !== 0) {
                    this.setAnimation(...ANIMATION_RUN);
                } else {
                    this.setAnimation(...ANIMATION_IDLE);
                }
            } else if (this.isHuggingWall) {
                this.setAnimation(...ANIMATION_IDLE);
            } else {
                if (this.speedY > 0) {
                    this.setAnimation(...ANIMATION_JUMP);
                } else {
                    this.setAnimation(...ANIMATION_FALL);
                }
            }
        }
    }

    setState(newState) {
        if (newState !== this.state) {
            switch (this.state) {
                // on leave state actions
                case constants.STATE_NORMAL:
                    break;
                case constants.STATE_JUMP:
                    this.timers.varJump = 0;
                    break;
                case constants.STATE_DASH:
                    this.timers.dash = 0;
                    break;
                case constants.STATE_DEAD:
                    break;
                case constants.STATE_BOUNCE:
                    this.timers.bounce = 0;
                    break;
            }
            switch (newState) {
                // on enter state actions
                case constants.STATE_NORMAL:
                    break;
                case constants.STATE_JUMP:
                    this.timers.jumpGrace = 0;
                    this.timers.varJump = constants.VAR_JUMP_TIME;
                    this.inputs.jumpPressedBuffer = false;
                    break;
                case constants.STATE_DASH:
                    this.timers.dashCooldown = constants.DASH_COOLDOWN;
                    this.timers.dash = constants.DASH_TIME + constants.DASH_FREEZE_TIME;
                    break;
                case constants.STATE_DEAD:
                    this.timers.dying = constants.DYING_TIME;
                    break;
                case constants.STATE_BOUNCE:
                    this.timers.bounce = constants.BOUNCE_TIME;
                    break;
            }
            this.state = newState;
        }
    }

    makeTransition(transition) {
        // validate temporary strawberries
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.scene.removeElement(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        this.scene.setPlayer(undefined);
        transition.targetScene.setPlayer(this);
        transition.targetScene.spawnPointIndex = transition.spawnPointIndex;
    }

    die() {
        // reactivate temporary strawberries
        this.isActive = false;
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.isActive = true;
        }
        this.temporaryStrawberries.clear();
        this.setState(constants.STATE_DEAD);
        this.setAnimation(...ANIMATION_DIE);
    }

    respawn() {
        const point = this.scene.spawnPoints[this.scene.spawnPointIndex];
        this.x = point.x;
        this.y = point.y - 6;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        for (const t in this.timers) {
            this.timers[t] = 0;
        }
        this.setState(constants.STATE_NORMAL);
        this.isActive = true;
        this.restoreDash();
    }

    restoreDash() {
        if (this.nbDashes === 1) {
            return false;
        } else {
            this.nbDashes = 1;
            return true;
        }
    }

    squish() {
        this.die();
    }

    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                physics.segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.inputs.xAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.inputs.xAxis === 1 && solid.x === this.x + this.width)
                )
            );
    }

    setAnimation(sprite_row, nb_sprites) {
        if (sprite_row !== this.sprite_row) {
            this.sprite_row = sprite_row;
            this.animation_counter = 0;
            this.nb_sprites = nb_sprites;
        }
    }
}


module.exports = {
    Player,
}
},{"./constants":1,"./inputs":2,"./physics":6,"./sprites":9}],8:[function(require,module,exports){
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
        for (const decoration of this.decorations) {
            decoration.draw(ctx);
        }
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

},{"./constants":1,"./physics":6}],9:[function(require,module,exports){
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
},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzcHJpdGVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTgwO1xuY29uc3QgRFlJTkdfVElNRSA9IC44O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmVzc2VkQnV0dG9ucyA9IG5ldyBTZXQoKTtcbmxldCBnYW1lcGFkUHJlc3NlZEJ1dHRvbnMgPSBbXTtcblxuY2xhc3MgUGxheWVySW5wdXRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5nYW1lcGFkSW5kZXggPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRtYXAgPSB7XG4gICAgICAgICAgICBqdW1wOiAwLFxuICAgICAgICAgICAgZGFzaDogMSxcbiAgICAgICAgICAgIHVwOiAxMixcbiAgICAgICAgICAgIGRvd246IDEzLFxuICAgICAgICAgICAgbGVmdDogMTQsXG4gICAgICAgICAgICByaWdodDogMTUsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rZXltYXAgPSB7XG4gICAgICAgICAgICByaWdodDogJ0Fycm93UmlnaHQnLFxuICAgICAgICAgICAgbGVmdDogJ0Fycm93TGVmdCcsXG4gICAgICAgICAgICB1cDogJ0Fycm93VXAnLFxuICAgICAgICAgICAgZG93bjogJ0Fycm93RG93bicsXG4gICAgICAgICAgICBqdW1wOiAnZycsXG4gICAgICAgICAgICBkYXNoOiAnZicsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7XG4gICAgICAgICAgICBqdW1wQnVmZmVyOiAwLFxuICAgICAgICAgICAgZGFzaEJ1ZmZlcjogMCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVHYW1lcGFkKCkge1xuICAgICAgICBwcmVzc2VkQnV0dG9ucy5jbGVhcigpO1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICBpZiAoZ2FtZXBhZCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnM7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmJ1dHRvbnNbal0ucHJlc3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcmVzc2VkQnV0dG9ucy5hZGQoaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZUdhbWVwYWQoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAubGVmdCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAubGVmdF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnJpZ2h0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5yaWdodF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnlBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJldkp1bXAgPSB0aGlzLmp1bXBIZWxkO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmp1bXApIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmp1bXBdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZKdW1wICYmIHRoaXMuanVtcEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPSBKVU1QX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyICY9IHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldkRhc2ggPSB0aGlzLmRhc2hIZWxkO1xuICAgICAgICB0aGlzLmRhc2hIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRhc2gpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRhc2hdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZEYXNoICYmIHRoaXMuZGFzaEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPSBEQVNIX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgJiYgKHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPiAwKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVySW5wdXRzLFxuICAgIGdhbWVwYWRQcmVzc2VkQnV0dG9ucyxcbiAgICBwcmVzc2VkS2V5cyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuY29uc3QgbWFwcyA9IHJlcXVpcmUoJy4vbWFwcycpO1xuY29uc3Qgc3ByaXRlcyA9IHJlcXVpcmUoJy4vc3ByaXRlcycpO1xuXG5jb25zdCBTQ0FMSU5HID0gMztcbmxldCBTTE9XRE9XTl9GQUNUT1IgPSAxO1xuY29uc3QgRklYRURfREVMVEFfVElNRSA9IHRydWU7XG5jb25zdCBGUkFNRV9SQVRFID0gNjA7XG5cbmxldCBjb250ZXh0O1xubGV0IGN1cnJlbnRTY2VuZTtcbmxldCBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcbmxldCBpc1J1bm5pbmcgPSBmYWxzZTtcbmxldCBmcmFtZUNvdW50ZXIgPSAwO1xubGV0IGZyYW1lUmF0ZVJlZnJlc2ggPSA1O1xubGV0IGZyYW1lUmF0ZVN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5sZXQgc2xvd2Rvd25Db3VudGVyID0gMDtcbmxldCBzY3JvbGxYID0gMDtcbmxldCBzY3JvbGxZID0gMDtcblxuZnVuY3Rpb24gc2xvd2Rvd24oZmFjdG9yKSB7XG4gICAgU0xPV0RPV05fRkFDVE9SID0gZmFjdG9yO1xuICAgIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpIC8gKFNMT1dET1dOX0ZBQ1RPUiAqIDEwMDApO1xufVxuXG5cbmZ1bmN0aW9uIHNldFNjcm9sbCh4LCB5KSB7XG4gICAgY29udGV4dC50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpc1J1bm5pbmcgPSB0cnVlO1xuICAgIHVwZGF0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaXNSdW5uaW5nID0gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGlzUnVubmluZykge1xuICAgICAgICBzbG93ZG93bkNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHNsb3dkb3duQ291bnRlciA+PSBTTE9XRE9XTl9GQUNUT1IpIHtcbiAgICAgICAgICAgIHNsb3dkb3duQ291bnRlciAtPSBTTE9XRE9XTl9GQUNUT1I7XG4gICAgICAgICAgICBmcmFtZUNvdW50ZXIgKz0gMTtcblxuICAgICAgICAgICAgaWYgKHRpbWVOb3cgLSBmcmFtZVJhdGVTdGFydFRpbWUgPj0gMTAwMCAqIGZyYW1lUmF0ZVJlZnJlc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgIGZyYW1lUmF0ZVN0YXJ0VGltZSA9IHRpbWVOb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSBGSVhFRF9ERUxUQV9USU1FID9cbiAgICAgICAgICAgICAgICAxIC8gRlJBTUVfUkFURSA6XG4gICAgICAgICAgICAgICAgTWF0aC5taW4oKHRpbWVOb3cgLSBsYXN0VXBkYXRlKSAvICgxMDAwICogU0xPV0RPV05fRkFDVE9SKSwgLjA1KTtcblxuICAgICAgICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRILCBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoZGVsdGFUaW1lKTtcblxuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgICAgICAgICBsYXN0VXBkYXRlID0gdGltZU5vdztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbiAgICB9XG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgY2FzZSAndyc6XG4gICAgICAgICAgICAgICAgaWYgKFNMT1dET1dOX0ZBQ1RPUiA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93big4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93bigxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgU0NBTElORyk7XG4gICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblxuICAgIC8vIGxvYWQgYWxsIHNjZW5lcyBhbmQgc3RhcnQgZ2FtZVxuICAgIG1hcHMubG9hZFNjZW5lcy50aGVuKCgpID0+IHtcbiAgICAgICAgY3VycmVudFNjZW5lID0gbWFwcy5zY2VuZXMuQ0VMRVNURV8wMTtcbiAgICAgICAgY3VycmVudFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IDE7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoKSk7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5wbGF5ZXIucmVzcGF3bigpO1xuICAgICAgICBzdGFydCgpO1xuICAgIH0pO1xufTtcblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBtb3ZlbWVudCA9IHJlcXVpcmUoJy4vbW92ZW1lbnQnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MiAqIFUsIHNjZW5lMi5oZWlnaHQsIHdpZHRoICogVSwgMCwgc2NlbmUxLCB4MSAqIFUsIDIgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lMSwgeTEsIGluZGV4MSwgc2NlbmUyLCB5MiwgaW5kZXgyLCBoZWlnaHQpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5jb25zdCBsb2FkU2NlbmVzID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDIuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTAzLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDUuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA2Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDguanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA5Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTEuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTEyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTQuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcblxuICAgIF0pLnRoZW4ocmVzcG9uc2VzID0+IHtcbiAgICAgICAgY29uc3Qgc2NlbmVOYW1lcyA9IFtcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wMVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzAyXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDNcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wNFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA1XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDZcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wN1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA4XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDlcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xMFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzExXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTJcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xM1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzE0XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAxXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAyXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAzXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA0XCJdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjZW5lTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNjZW5lc1tzY2VuZU5hbWVzW2ldXSA9IHNjZW5lLlNjZW5lLmZyb21KU09OKHJlc3BvbnNlc1tpXSk7XG4gICAgICAgIH1cblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAxMCAqIFUsIDMgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxMCAqIFUsIDIzICogVSwgOSAqIFUsIC41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMyAqIFUsIDkgKiBVLCAxNCAqIFUsIDEwICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNi5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTMgKiBVLCAzMyAqIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCAzMyAqIFUsIDEzICogVSwgMjMgKiBVLCAuNDUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDEzICogVSwgMjMgKiBVLCAxMyAqIFUsIDMzICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wOC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAxNiAqIFUsIDIgKiBVLCAzICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxNiAqIFUsIDIxICogVSwgMTIgKiBVLCAuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjEgKiBVLCAxMiAqIFUsIDE0ICogVSwgMTYgKiBVLCAyKSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTEgKiBVLCAyOSAqIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTEgKiBVLCAyOSAqIFUsIDE5ICogVSwgMjkgKiBVLCAuMzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE5ICogVSwgMjkgKiBVLCAxMSAqIFUsIDI5ICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMjYgKiBVLCAyOCAqIFUsIDUgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjYgKiBVLCAyOCAqIFUsIDI2ICogVSwgMjIgKiBVLCAuMzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDI2ICogVSwgMjIgKiBVLCAyNiAqIFUsIDI4ICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAxLCAzMSwgMCwgc2NlbmVzLkNFTEVTVEVfMDIsIDEsIDEsIDUpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAyLCAzNCwgMCwgc2NlbmVzLkNFTEVTVEVfMDMsIDIsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAzLCAzMywgMCwgc2NlbmVzLkNFTEVTVEVfMDQsIDMsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA0LCAyMSwgMCwgc2NlbmVzLkNFTEVTVEVfMDUsIDQsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA1LCAyMiwgMCwgc2NlbmVzLkNFTEVTVEVfMDYsIDMsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA3LCAyOSwgMCwgc2NlbmVzLkNFTEVTVEVfMDYsIDMwLCAxLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wNiwgMzAsIDIsIHNjZW5lcy5DRUxFU1RFXzA4LCA1LCAwLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNiwgMzUsIDAsIHNjZW5lcy5DRUxFU1RFXzA5LCAxLCAyLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMCwgNywgMCwgc2NlbmVzLkNFTEVTVEVfMDksIDcsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzExLCA4LCAxLCBzY2VuZXMuQ0VMRVNURV8xMCwgOCwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTAsIDIsIDEsIHNjZW5lcy5DRUxFU1RFXzEyLCA0MiwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTEsIDMsIDAsIHNjZW5lcy5DRUxFU1RFXzEyLCAzLCAwLCAyKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wOSwgMCwgMCwgc2NlbmVzLkNFTEVTVEVfMTMsIDAsIDAsIDEwKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMywgMCwgMSwgc2NlbmVzLkNFTEVTVEVfMTQsIDIyLCAyLCAxMCk7XG5cblxuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMSwgMzUsIDAsIHNjZW5lcy5MT1VJU18wMiwgNCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAzLCAzLCAwLCBzY2VuZXMuTE9VSVNfMDIsIDEzLCAwLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMwLCAxLCBzY2VuZXMuTE9VSVNfMDIsIDIzLCAyLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDQsIDQsIDAsIHNjZW5lcy5MT1VJU18wMiwgMzUsIDMsIDMpO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbiAgICBsb2FkU2NlbmVzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuY2xhc3MgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gY291bnQ7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMudGltZXIgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIpO1xuICAgICAgICAgICAgdGhpbmcuc2V0TW9tZW50dW0odGhpcy5teCwgdGhpcy5teSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2VxdWVuY2VNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihtb3ZlbWVudHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5tb3ZlbWVudHMgPSBtb3ZlbWVudHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udGltZXIgLSB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMubW92ZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNpbmVNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHJhdGlvICogdGhpcy54MSArICgxIC0gcmF0aW8pICogdGhpcy54MiwgcmF0aW8gKiB0aGlzLnkxICsgKDEgLSByYXRpbykgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIGNvbnN0IGRyYXRpbyA9IE1hdGguUEkgKiBNYXRoLnNpbihhbmdsZSkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgbXggPSBkcmF0aW8gKiAodGhpcy54MiAtIHRoaXMueDEpO1xuICAgICAgICAgICAgY29uc3QgbXkgPSBkcmF0aW8gKiAodGhpcy55MiAtIHRoaXMueTEpO1xuICAgICAgICAgICAgdGhpbmcuc2V0TW9tZW50dW0obXgsIG15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNb3ZlbWVudCxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTZXF1ZW5jZU1vdmVtZW50LFxuICAgIFNpbmVNb3ZlbWVudCxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3QgdGlsZXNldCA9IG5ldyBJbWFnZSgpO1xudGlsZXNldC5zcmMgPSAndGlsZW1hcHMvdGlsZXNldC5wbmcnO1xuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdHdvIHNlZ21lbnRzIG9uIGEgMUQgbGluZSBvdmVybGFwLlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnggPSB4O1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnRpbGVEYXRhID0gdGlsZURhdGE7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIH1cblxuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgMTYgKiB0aGlzLnRpbGVEYXRhLngsIDE2ICogdGhpcy50aWxlRGF0YS55LFxuICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICB0aGlzLnggKyB0aGlzLnRpbGVEYXRhLnNoaWZ0WCwgdGhpcy55ICsgdGhpcy50aWxlRGF0YS5zaGlmdFksXG4gICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgfVxuXG4gICAgbW92ZVRvKHgsIHkpIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIpO1xuICAgIH1cblxuICAgIHNldE1vdmVtZW50KG1vdmVtZW50KSB7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIEFjdG9yIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWSA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGR4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW92ZVkoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WSA9IHRoaXMueSArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgLSB0aGlzLmhlaWdodCA8IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSAtIHRoaXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSArIHNvbGlkLmhlaWdodCA+IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSArIHNvbGlkLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHkgPSBuZXdZIC0gdGhpcy55O1xuICAgICAgICAgICAgdGhpcy55ID0gbmV3WTtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYmVmb3JlVXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZZID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgIH1cblxuICAgIGFmdGVyVXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLm1vdmVkU2VsZlggPSB0aGlzLm1vdmVkWDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZZID0gdGhpcy5tb3ZlZFk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgIH1cbn1cblxuXG5jbGFzcyBTb2xpZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzZjMmMwYic7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IDA7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVgoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVkoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSwgbXggPSB1bmRlZmluZWQsIG15ID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54ICsgdGhpcy53aWR0aCAtIGFjdG9yLngsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYIDwgbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggLSBhY3Rvci54IC0gYWN0b3Iud2lkdGgsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW92ZVkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPCBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA+IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0TW9tZW50dW0obXgsIG15KSB7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbmNsYXNzIEhhemFyZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnI2YzMTMxNCc7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuICAgIH1cbn1cblxuXG5jbGFzcyBQbGF0Zm9ybSBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNhODYxMmFcIjtcbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgPD0gdGhpcy55ICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCArIGR5ID4gdGhpcy55O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgMTYgKiAodGhpcy50aWxlRGF0YS54KSwgMTYgKiB0aGlzLnRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgIHRoaXMueCwgdGhpcy55LFxuICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwcmluZyBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMudGlsZURhdGEuc2hpZnRZID0gLVUgLyAyO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfQk9VTkNFKTtcbiAgICAgICAgcGxheWVyLnNwZWVkWCA9IDA7XG4gICAgICAgIHBsYXllci5zcGVlZFkgPSBjb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICBwbGF5ZXIucmVzdG9yZURhc2goKTtcbiAgICB9XG59XG5cblxuY2xhc3MgRGFzaERpYW1vbmQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSlcbiAgICAgICAgaWYgKCF0aGlzLmlzQWN0aXZlICYmIHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5yZXN0b3JlRGFzaCgpKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuYWRkKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZLCBzcGF3blBvaW50SW5kZXggPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIHRoaXMudGFyZ2V0WSA9IHRhcmdldFk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludEluZGV4ID0gc3Bhd25Qb2ludEluZGV4O1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICBwbGF5ZXIubWFrZVRyYW5zaXRpb24odGhpcyk7XG4gICAgICAgIHRoaXMuc2NlbmUudHJhbnNpdGlvbiA9IHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIENydW1ibGluZ0Jsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5mYWxsIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNob3VsZEJlY29tZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEJlY29tZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRCZWNvbWVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IDIgKiB0aGlzLnRpbWVycy5mYWxsO1xuICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gYWxwaGE7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzID0gbmV3IEFycmF5KCh3aWR0aCAvIFUpICogKGhlaWdodCAvIFUpKS5maWxsKDApLm1hcChfID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnNjZW5lLnBsYXllcjtcbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQgJiYgdGhpcy5tb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCA9PT0gdW5kZWZpbmVkICYmIHBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB0aGlzLnRyaWdnZXJlZE1vdmVtZW50O1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGZvciAobGV0IHggPSB0aGlzLng7IHggPCB0aGlzLnggKyB0aGlzLndpZHRoOyB4ICs9IFUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSB0aGlzLnk7IHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDsgeSArPSBVKSB7XG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICAgICAgdGlsZXNldCxcbiAgICAgICAgICAgICAgICAgICAgMTYgKiB0aGlzLnNwcml0ZUluZGV4ZXNbaW5kZXhdLCAxNiAqIDgsXG4gICAgICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICAgICAgeCwgeSxcbiAgICAgICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICB0aWxlRGF0YS5zaGlmdFkgPSAtVS8yO1xuICAgICAgICBzdXBlcih4LCB5ICsgVS8yLCBVLCBVLzIsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwaWtlc0Rvd24gZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVS8yLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBTcGlrZXNSaWdodCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVIC8gMiwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG59XG5cblxuY2xhc3MgU3Bpa2VzTGVmdCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICB0aWxlRGF0YS5zaGlmdFggPSAtVS8yO1xuICAgICAgICBzdXBlcih4ICsgVS8yLCB5LCBVLzIsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNlZ21lbnRzT3ZlcmxhcCxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgQ3J1bWJsaW5nQmxvY2ssXG4gICAgU3Bpa2VzVXAsXG4gICAgU3Bpa2VzRG93bixcbiAgICBTcGlrZXNMZWZ0LFxuICAgIFNwaWtlc1JpZ2h0LFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3Qgc3ByaXRlcyA9IHJlcXVpcmUoJy4vc3ByaXRlcycpO1xuY29uc3QgQU5JTUFUSU9OX1NMT1dET1dOID0gNjtcblxuY29uc3QgQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBBTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgQU5JTUFUSU9OX0pVTVAgPSBbNiwgM107XG5jb25zdCBBTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cbmNsYXNzIFBsYXllciBleHRlbmRzIHBoeXNpY3MuQWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCA4LCAxNCk7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IDE7XG4gICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IDE7XG4gICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IDQ7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuXG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB+fih0aGlzLmFuaW1hdGlvbl9jb3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gMiAqIHRoaXMuc3ByaXRlX3JvdyArICh0aGlzLnNwcml0ZV9kaXJlY3Rpb24gPT09IC0xID8gMSA6IDApO1xuICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgc3ByaXRlcy5zcHJpdGVzU2hlZXQuY2FudmFzLFxuICAgICAgICAgICAgMTYgKiBpbmRleCwgMTYgKiByb3csXG4gICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICB0aGlzLnggLSA0LCB0aGlzLnkgLSAyLFxuICAgICAgICAgICAgMTYsIDE2KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmlucHV0cy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciArPSAxO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICU9IHRoaXMubmJfc3ByaXRlcyAqIEFOSU1BVElPTl9TTE9XRE9XTjtcblxuICAgICAgICAvLyBjaGVjayBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5jbGVhcigpO1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIHN0YW5kaW5nIG9uIGEgc29saWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc29saWQuY2FuQmVDbGltYmVkICYmIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHdhbGxzIG9uIHJpZ2h0IGFuZCBsZWZ0IGF0IGRpc3RhbmNlIDw9IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZUxlZnQgPSB0aGlzLnggLSBzb2xpZC54IC0gc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlTGVmdCAmJiBkaXN0YW5jZUxlZnQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZVJpZ2h0ID0gc29saWQueCAtIHRoaXMueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlUmlnaHQgJiYgZGlzdGFuY2VSaWdodCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy54ICsgdGhpcy53aWR0aCA9PT0gc29saWQueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy54ID09PSBzb2xpZC54ICsgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBwbGF5ZXIgaXMgaHVnZ2luZyBhIHdhbGxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSBjb25zdGFudHMuSlVNUF9HUkFDRV9USU1FO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IGNvbnN0YW50cy5TVEFURV9EQVNIIHx8IHRoaXMuZGFzaFNwZWVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnVwZGF0ZUFuaW1hdGlvbigpO1xuXG4gICAgICAgIHRoaXMubW92ZVgodGhpcy5zcGVlZFggKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRYID0gMCk7XG4gICAgICAgIHRoaXMubW92ZVkodGhpcy5zcGVlZFkgKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRZID0gMCk7XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBvYmplY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLnNjZW5lLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbkNvbnRhY3RXaXRoKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMueSA+PSB0aGlzLnNjZW5lLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmR5aW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNwYXduKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wSGVsZCAmJiB0aGlzLnRpbWVycy52YXJKdW1wID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZLCAtY29uc3RhbnRzLkpVTVBfU1BFRUQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5kYXNoID4gY29uc3RhbnRzLkRBU0hfVElNRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDAgPCB0aGlzLnRpbWVycy5kYXNoICYmIHRoaXMudGltZXJzLmRhc2ggPD0gY29uc3RhbnRzLkRBU0hfVElNRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IHRoaXMuZGFzaFNwZWVkWDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSB0aGlzLmRhc2hTcGVlZFk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZW5kIG9mIGRhc2hcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3BlZWQgPSB0aGlzLmRhc2hTcGVlZFggJiYgdGhpcy5kYXNoU3BlZWRZID8gY29uc3RhbnRzLkVORF9EQVNIX1NQRUVEIC8gTWF0aC5zcXJ0KDIpIDogY29uc3RhbnRzLkVORF9EQVNIX1NQRUVEO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFgpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWSkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGFzaFNwZWVkWSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZICo9IGNvbnN0YW50cy5FTkRfREFTSF9VUF9GQUNUT1I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmJvdW5jZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMubmJEYXNoZXMgPiAwICYmXG4gICAgICAgICAgICB0aGlzLmlucHV0cy5kYXNoUHJlc3NlZEJ1ZmZlciAmJlxuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duIDw9IDAgJiZcbiAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyB8fCB0aGlzLmlucHV0cy55QXhpcylcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBkYXNoU3BlZWQgPSB0aGlzLmlucHV0cy54QXhpcyAmJiB0aGlzLmlucHV0cy55QXhpcyA/IGNvbnN0YW50cy5EQVNIX1NQRUVEIC8gTWF0aC5zcXJ0KDIpIDogY29uc3RhbnRzLkRBU0hfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSB0aGlzLmlucHV0cy54QXhpcyAqIE1hdGgubWF4KE1hdGguYWJzKHRoaXMuc3BlZWRYKSwgZGFzaFNwZWVkKTtcbiAgICAgICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IC10aGlzLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTiArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREFTSCk7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpIHtcbiAgICAgICAgbGV0IGRpZEp1bXAgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IHRoaXMuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5KVU1QX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfSlVNUCk7XG4gICAgICAgICAgICBkaWRKdW1wID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy5oYXNXYWxsTGVmdCB8fCB0aGlzLmhhc1dhbGxSaWdodCkpIHtcbiAgICAgICAgICAgIC8vIHdhbGxqdW1wXG4gICAgICAgICAgICB0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IGR4ID0gdGhpcy5oYXNXYWxsTGVmdCA/IDEgOiAtMTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBjb25zdGFudHMuV0FMTF9KVU1QX0hTUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5KVU1QX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfSlVNUCk7XG4gICAgICAgICAgICBkaWRKdW1wID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlkSnVtcCkge1xuICAgICAgICAgICAgbGV0IG14ID0gMDtcbiAgICAgICAgICAgIGxldCBteSA9IDA7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuY2FycnlpbmdTb2xpZHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzeCA9IHNvbGlkLmdldE1vbWVudHVtWCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN5ID0gc29saWQuZ2V0TW9tZW50dW1ZKCk7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN4KSA+IE1hdGguYWJzKG14KSkgbXggPSBzeDtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3kpID4gTWF0aC5hYnMobXkpKSBteSA9IHN5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIG14O1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIG15O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWRKdW1wO1xuICAgIH1cblxuICAgIHVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB0aGlzLnNwcml0ZV9kaXJlY3Rpb24gPSB0aGlzLmlucHV0cy54QXhpcztcblxuICAgICAgICAvLyBob3Jpem9udGFsIG1vdmVtZW50XG4gICAgICAgIGxldCBzeCA9IE1hdGguYWJzKHRoaXMuc3BlZWRYKTsgICAgICAgIC8vIGFic29sdXRlIHZhbHVlIG9mIHRoZSBob3Jpem9udGFsIHNwZWVkIG9mIHRoZSBwbGF5ZXJcbiAgICAgICAgY29uc3QgZHggPSB0aGlzLnNwZWVkWCA+PSAwID8gMSA6IC0xOyAgICAvLyBkaXJlY3Rpb24gaW4gd2hpY2ggdGhlIHBsYXllciBpcyBtb3ZpbmdcbiAgICAgICAgY29uc3QgbXVsdCA9IHRoaXMuaXNHcm91bmRlZCA/IDEgOiBjb25zdGFudHMuQUlSX0ZBQ1RPUjtcblxuICAgICAgICAvLyBwYXNzaXZlIGRlY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA8PSAwKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzeCA+IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhY3RpdmUgYWNjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzID4gMCAmJiBzeCA8IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWluKHN4ICsgY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA8IDApIHtcbiAgICAgICAgICAgIHN4IC09IGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogc3g7XG4gICAgfVxuXG4gICAgdXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMueUF4aXMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkNMSU1CX1VQX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLkNMSU1CX1NMSVBfU1BFRUQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuTUFYX0ZBTExfU1BFRUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlQW5pbWF0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gY29uc3RhbnRzLlNUQVRFX0RFQUQpIHtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fUlVOKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNwZWVkWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0pVTVApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9GQUxMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRTdGF0ZShuZXdTdGF0ZSkge1xuICAgICAgICBpZiAobmV3U3RhdGUgIT09IHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGxlYXZlIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAobmV3U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBlbnRlciBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gY29uc3RhbnRzLlZBUl9KVU1QX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlVHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgICAgIC8vIHZhbGlkYXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LnNjZW5lLnJlbW92ZUVsZW1lbnQoc3RyYXdiZXJyeSk7XG4gICAgICAgICAgICB0aGlzLnN0cmF3YmVycmllcy5hZGQoc3RyYXdiZXJyeSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zY2VuZS5zZXRQbGF5ZXIodW5kZWZpbmVkKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5zZXRQbGF5ZXIodGhpcyk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gdHJhbnNpdGlvbi5zcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgZGllKCkge1xuICAgICAgICAvLyByZWFjdGl2YXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RFQUQpO1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRElFKTtcbiAgICB9XG5cbiAgICByZXNwYXduKCkge1xuICAgICAgICBjb25zdCBwb2ludCA9IHRoaXMuc2NlbmUuc3Bhd25Qb2ludHNbdGhpcy5zY2VuZS5zcGF3blBvaW50SW5kZXhdO1xuICAgICAgICB0aGlzLnggPSBwb2ludC54O1xuICAgICAgICB0aGlzLnkgPSBwb2ludC55IC0gNjtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpICYmXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHNvbGlkLnggKyBzb2xpZC53aWR0aCA9PT0gdGhpcy54KSB8fFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHNldEFuaW1hdGlvbihzcHJpdGVfcm93LCBuYl9zcHJpdGVzKSB7XG4gICAgICAgIGlmIChzcHJpdGVfcm93ICE9PSB0aGlzLnNwcml0ZV9yb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IHNwcml0ZV9yb3c7XG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jbGFzcyBTY2VuZSB7XG4gICAgY29uc3RydWN0b3Iod2lkdGgsIGhlaWdodCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogV2lkdGggb2YgdGhlIFNjZW5lIGluIHBpeGVsc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogSGVpZ2h0IG9mIHRoZSBzY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnNjcm9sbFggPSAwO1xuICAgICAgICB0aGlzLnNjcm9sbFkgPSBVIC8gMjtcbiAgICAgICAgdGhpcy5zb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuYWN0b3JzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmRlY29yYXRpb25zID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRzID0gW107XG4gICAgICAgIHRoaXMudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludEluZGV4ID0gMDtcbiAgICB9XG5cbiAgICBzdGF0aWMgZnJvbUpTT04oZGF0YSkge1xuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZShkYXRhLndpZHRoICogVSwgZGF0YS5oZWlnaHQgKiBVKTtcbiAgICAgICAgLy8gbWFrZSB3YWxsc1xuICAgICAgICBjb25zdCB3YWxscyA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAtMS41ICogVSwgZGF0YS53aWR0aCAqIFUsIDApLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKC0uNSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoKGRhdGEud2lkdGggKyAuNSkgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgZm9yIChjb25zdCB3YWxsIG9mIHdhbGxzKSB7XG4gICAgICAgICAgICB3YWxsLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgc2NlbmUuYWRkU29saWQod2FsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYWluTGF5ZXIgPSBkYXRhLmxheWVycy5maW5kKGwgPT4gbC5uYW1lID09PSAnbWFpbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1haW5MYXllci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG1haW5MYXllci5kYXRhW2ldO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IChpICUgbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IH5+KGkgLyBtYWluTGF5ZXIud2lkdGgpICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogKGluZGV4IC0gMSkgJSA4LFxuICAgICAgICAgICAgICAgICAgICB5OiB+figoaW5kZXggLSAxKSAvIDgpLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0WTogMCxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmRleCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuRGFzaERpYW1vbmQoeCArIFUgLyAyLCB5ICsgVSAvIDIsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLnNwYXduUG9pbnRzLnB1c2goe3g6IHgsIHk6IHl9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ1OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ2OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuUGxhdGZvcm0oeCwgeSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcGlrZXNVcCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3Bpa2VzRG93bih4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5IYXphcmQoeCwgeSwgVSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TdHJhd2JlcnJ5KHggKyBVIC8gMiwgeSArIFUgLyAyLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5DcnVtYmxpbmdCbG9jayh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTA6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5Tb2xpZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xuICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIGFjdG9yLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgYWN0b3IuYWZ0ZXJVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRpb24gb2YgdGhpcy5kZWNvcmF0aW9ucykge1xuICAgICAgICAgICAgZGVjb3JhdGlvbi51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNjcm9sbCB2aWV3XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPiAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPCAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPiAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFkgPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQgLSBjb25zdGFudHMuVklFV19IRUlHSFQsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZIDwgLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgIFUgLyAyLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVjb3JhdGlvbiBvZiB0aGlzLmRlY29yYXRpb25zKSB7XG4gICAgICAgICAgICBkZWNvcmF0aW9uLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFBsYXllcihwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUFjdG9yKHRoaXMucGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEFjdG9yKHBsYXllcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgfVxuXG4gICAgYWRkQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuYWRkKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmRlbGV0ZShhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5yZW1vdmUoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5hZGQoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2NlbmUsXG59XG4iLCJjb25zdCBzcHJpdGVzU2hlZXQgPSB7fTtcblxuZnVuY3Rpb24gcmFuZ2Uobikge1xuICAgIHJldHVybiBuZXcgQXJyYXkobikuZmlsbCgwKS5tYXAoKHgsIGkpID0+IGkpO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTcHJpdGVzKCkge1xuICAgIHNwcml0ZXNTaGVldC5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBzcHJpdGVzU2hlZXQuY29udGV4dCA9IHNwcml0ZXNTaGVldC5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IGFkZFNwcml0ZXMoaW1nKSk7XG4gICAgaW1nLnNyYyA9IFwiaW1hZ2VzL2hlcm9fc3ByaXRlcy5wbmdcIjtcbn1cblxuXG5mdW5jdGlvbiBhZGRTcHJpdGVzKGltYWdlKSB7XG4gICAgc3ByaXRlc1NoZWV0LmNhbnZhcy53aWR0aCA9IGltYWdlLndpZHRoO1xuICAgIHNwcml0ZXNTaGVldC5jYW52YXMuaGVpZ2h0ID0gMiAqIGltYWdlLmhlaWdodDtcblxuICAgIGZvciAobGV0IGkgb2YgcmFuZ2UoaW1hZ2UuaGVpZ2h0IC8gMTYpKSB7XG4gICAgICAgIGZvciAobGV0IGogb2YgcmFuZ2UoaW1hZ2Uud2lkdGggLyAxNikpIHtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMTYgKiBqLCAxNiAqIGksIDE2LCAxNiwgMTYgKiBqLCAxNiAqIDIgKiBpLCAxNiwgMTYpO1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuc2F2ZSgpO1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuc2NhbGUoLTEsIDEpO1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAxNiAqIGosIDE2ICogaSwgMTYsIDE2LCAtMTYgKiAoaisxKSwgMTYgKiAoMiAqIGkgKyAxKSwgMTYsIDE2KTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tYWtlU3ByaXRlcygpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3ByaXRlc1NoZWV0LFxufTsiXX0=
