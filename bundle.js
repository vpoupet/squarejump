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
            // "CELESTE_14",
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

        // scenes.CELESTE_14.addSolid(new physics.TriggerBlock(11 * U, 29 * U, 4 * U, 2 * U, new movement.SequenceMovement([
        //     new movement.Movement(.75),
        //     new movement.LinearMovement(11 * U, 29 * U, 19 * U, 29 * U, .35),
        //     new movement.Movement(1),
        //     new movement.LinearMovement(19 * U, 29 * U, 11 * U, 29 * U, 1.5),
        // ])));
        //
        // scenes.CELESTE_14.addSolid(new physics.TriggerBlock(26 * U, 28 * U, 5 * U, 2 * U, new movement.SequenceMovement([
        //     new movement.Movement(.75),
        //     new movement.LinearMovement(26 * U, 28 * U, 26 * U, 22 * U, .35),
        //     new movement.Movement(1),
        //     new movement.LinearMovement(26 * U, 22 * U, 26 * U, 28 * U, 1.5),
        // ])));

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
        // makeTransitionRight(scenes.CELESTE_13, 0, 1, scenes.CELESTE_14, 22, 2, 10);


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzcHJpdGVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTgwO1xuY29uc3QgRFlJTkdfVElNRSA9IC44O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmVzc2VkQnV0dG9ucyA9IG5ldyBTZXQoKTtcbmxldCBnYW1lcGFkUHJlc3NlZEJ1dHRvbnMgPSBbXTtcblxuY2xhc3MgUGxheWVySW5wdXRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5nYW1lcGFkSW5kZXggPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRtYXAgPSB7XG4gICAgICAgICAgICBqdW1wOiAwLFxuICAgICAgICAgICAgZGFzaDogMSxcbiAgICAgICAgICAgIHVwOiAxMixcbiAgICAgICAgICAgIGRvd246IDEzLFxuICAgICAgICAgICAgbGVmdDogMTQsXG4gICAgICAgICAgICByaWdodDogMTUsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rZXltYXAgPSB7XG4gICAgICAgICAgICByaWdodDogJ0Fycm93UmlnaHQnLFxuICAgICAgICAgICAgbGVmdDogJ0Fycm93TGVmdCcsXG4gICAgICAgICAgICB1cDogJ0Fycm93VXAnLFxuICAgICAgICAgICAgZG93bjogJ0Fycm93RG93bicsXG4gICAgICAgICAgICBqdW1wOiAnZycsXG4gICAgICAgICAgICBkYXNoOiAnZicsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7XG4gICAgICAgICAgICBqdW1wQnVmZmVyOiAwLFxuICAgICAgICAgICAgZGFzaEJ1ZmZlcjogMCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVHYW1lcGFkKCkge1xuICAgICAgICBwcmVzc2VkQnV0dG9ucy5jbGVhcigpO1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICBpZiAoZ2FtZXBhZCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnM7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmJ1dHRvbnNbal0ucHJlc3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcmVzc2VkQnV0dG9ucy5hZGQoaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZUdhbWVwYWQoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAubGVmdCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAubGVmdF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnJpZ2h0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5yaWdodF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnlBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJldkp1bXAgPSB0aGlzLmp1bXBIZWxkO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmp1bXApIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmp1bXBdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZKdW1wICYmIHRoaXMuanVtcEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPSBKVU1QX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyICY9IHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldkRhc2ggPSB0aGlzLmRhc2hIZWxkO1xuICAgICAgICB0aGlzLmRhc2hIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRhc2gpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRhc2hdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZEYXNoICYmIHRoaXMuZGFzaEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPSBEQVNIX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgJiYgKHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPiAwKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVySW5wdXRzLFxuICAgIGdhbWVwYWRQcmVzc2VkQnV0dG9ucyxcbiAgICBwcmVzc2VkS2V5cyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuY29uc3QgbWFwcyA9IHJlcXVpcmUoJy4vbWFwcycpO1xuY29uc3Qgc3ByaXRlcyA9IHJlcXVpcmUoJy4vc3ByaXRlcycpO1xuXG5jb25zdCBTQ0FMSU5HID0gMztcbmxldCBTTE9XRE9XTl9GQUNUT1IgPSAxO1xuY29uc3QgRklYRURfREVMVEFfVElNRSA9IHRydWU7XG5jb25zdCBGUkFNRV9SQVRFID0gNjA7XG5cbmxldCBjb250ZXh0O1xubGV0IGN1cnJlbnRTY2VuZTtcbmxldCBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcbmxldCBpc1J1bm5pbmcgPSBmYWxzZTtcbmxldCBmcmFtZUNvdW50ZXIgPSAwO1xubGV0IGZyYW1lUmF0ZVJlZnJlc2ggPSA1O1xubGV0IGZyYW1lUmF0ZVN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5sZXQgc2xvd2Rvd25Db3VudGVyID0gMDtcbmxldCBzY3JvbGxYID0gMDtcbmxldCBzY3JvbGxZID0gMDtcblxuZnVuY3Rpb24gc2xvd2Rvd24oZmFjdG9yKSB7XG4gICAgU0xPV0RPV05fRkFDVE9SID0gZmFjdG9yO1xuICAgIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpIC8gKFNMT1dET1dOX0ZBQ1RPUiAqIDEwMDApO1xufVxuXG5cbmZ1bmN0aW9uIHNldFNjcm9sbCh4LCB5KSB7XG4gICAgY29udGV4dC50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpc1J1bm5pbmcgPSB0cnVlO1xuICAgIHVwZGF0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaXNSdW5uaW5nID0gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGlzUnVubmluZykge1xuICAgICAgICBzbG93ZG93bkNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHNsb3dkb3duQ291bnRlciA+PSBTTE9XRE9XTl9GQUNUT1IpIHtcbiAgICAgICAgICAgIHNsb3dkb3duQ291bnRlciAtPSBTTE9XRE9XTl9GQUNUT1I7XG4gICAgICAgICAgICBmcmFtZUNvdW50ZXIgKz0gMTtcblxuICAgICAgICAgICAgaWYgKHRpbWVOb3cgLSBmcmFtZVJhdGVTdGFydFRpbWUgPj0gMTAwMCAqIGZyYW1lUmF0ZVJlZnJlc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgIGZyYW1lUmF0ZVN0YXJ0VGltZSA9IHRpbWVOb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSBGSVhFRF9ERUxUQV9USU1FID9cbiAgICAgICAgICAgICAgICAxIC8gRlJBTUVfUkFURSA6XG4gICAgICAgICAgICAgICAgTWF0aC5taW4oKHRpbWVOb3cgLSBsYXN0VXBkYXRlKSAvICgxMDAwICogU0xPV0RPV05fRkFDVE9SKSwgLjA1KTtcblxuICAgICAgICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRILCBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoZGVsdGFUaW1lKTtcblxuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgICAgICAgICBsYXN0VXBkYXRlID0gdGltZU5vdztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbiAgICB9XG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgY2FzZSAndyc6XG4gICAgICAgICAgICAgICAgaWYgKFNMT1dET1dOX0ZBQ1RPUiA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93big4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93bigxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgU0NBTElORyk7XG4gICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblxuICAgIC8vIGxvYWQgYWxsIHNjZW5lcyBhbmQgc3RhcnQgZ2FtZVxuICAgIG1hcHMubG9hZFNjZW5lcy50aGVuKCgpID0+IHtcbiAgICAgICAgY3VycmVudFNjZW5lID0gbWFwcy5zY2VuZXMuQ0VMRVNURV8wMTtcbiAgICAgICAgY3VycmVudFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IDE7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoKSk7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5wbGF5ZXIucmVzcGF3bigpO1xuICAgICAgICBzdGFydCgpO1xuICAgIH0pO1xufTtcblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBtb3ZlbWVudCA9IHJlcXVpcmUoJy4vbW92ZW1lbnQnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MiAqIFUsIHNjZW5lMi5oZWlnaHQsIHdpZHRoICogVSwgMCwgc2NlbmUxLCB4MSAqIFUsIDIgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lMSwgeTEsIGluZGV4MSwgc2NlbmUyLCB5MiwgaW5kZXgyLCBoZWlnaHQpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5jb25zdCBsb2FkU2NlbmVzID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDIuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTAzLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDUuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA2Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDguanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA5Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTEuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTEyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTQuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcblxuICAgIF0pLnRoZW4ocmVzcG9uc2VzID0+IHtcbiAgICAgICAgY29uc3Qgc2NlbmVOYW1lcyA9IFtcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wMVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzAyXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDNcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wNFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA1XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDZcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wN1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA4XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDlcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xMFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzExXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTJcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xM1wiLFxuICAgICAgICAgICAgLy8gXCJDRUxFU1RFXzE0XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAxXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAyXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAzXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA0XCJdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjZW5lTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNjZW5lc1tzY2VuZU5hbWVzW2ldXSA9IHNjZW5lLlNjZW5lLmZyb21KU09OKHJlc3BvbnNlc1tpXSk7XG4gICAgICAgIH1cblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAxMCAqIFUsIDMgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxMCAqIFUsIDIzICogVSwgOSAqIFUsIC41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMyAqIFUsIDkgKiBVLCAxNCAqIFUsIDEwICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNi5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTMgKiBVLCAzMyAqIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCAzMyAqIFUsIDEzICogVSwgMjMgKiBVLCAuNDUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDEzICogVSwgMjMgKiBVLCAxMyAqIFUsIDMzICogVSwgMS41KSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wOC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAxNiAqIFUsIDIgKiBVLCAzICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxNiAqIFUsIDIxICogVSwgMTIgKiBVLCAuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjEgKiBVLCAxMiAqIFUsIDE0ICogVSwgMTYgKiBVLCAyKSxcbiAgICAgICAgXSkpKTtcblxuICAgICAgICAvLyBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTEgKiBVLCAyOSAqIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAvLyAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC43NSksXG4gICAgICAgIC8vICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTEgKiBVLCAyOSAqIFUsIDE5ICogVSwgMjkgKiBVLCAuMzUpLFxuICAgICAgICAvLyAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAvLyAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE5ICogVSwgMjkgKiBVLCAxMSAqIFUsIDI5ICogVSwgMS41KSxcbiAgICAgICAgLy8gXSkpKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDI2ICogVSwgMjggKiBVLCA1ICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgLy8gICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguNzUpLFxuICAgICAgICAvLyAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDI2ICogVSwgMjggKiBVLCAyNiAqIFUsIDIyICogVSwgLjM1KSxcbiAgICAgICAgLy8gICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgLy8gICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyNiAqIFUsIDIyICogVSwgMjYgKiBVLCAyOCAqIFUsIDEuNSksXG4gICAgICAgIC8vIF0pKSk7XG5cbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMSwgMzEsIDAsIHNjZW5lcy5DRUxFU1RFXzAyLCAxLCAxLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMiwgMzQsIDAsIHNjZW5lcy5DRUxFU1RFXzAzLCAyLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMywgMzMsIDAsIHNjZW5lcy5DRUxFU1RFXzA0LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNCwgMjEsIDAsIHNjZW5lcy5DRUxFU1RFXzA1LCA0LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNSwgMjIsIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wNywgMjksIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzMCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDYsIDMwLCAyLCBzY2VuZXMuQ0VMRVNURV8wOCwgNSwgMCwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDYsIDM1LCAwLCBzY2VuZXMuQ0VMRVNURV8wOSwgMSwgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTAsIDcsIDAsIHNjZW5lcy5DRUxFU1RFXzA5LCA3LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMSwgOCwgMSwgc2NlbmVzLkNFTEVTVEVfMTAsIDgsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzEwLCAyLCAxLCBzY2VuZXMuQ0VMRVNURV8xMiwgNDIsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzExLCAzLCAwLCBzY2VuZXMuQ0VMRVNURV8xMiwgMywgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDksIDAsIDAsIHNjZW5lcy5DRUxFU1RFXzEzLCAwLCAwLCAxMCk7XG4gICAgICAgIC8vIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTMsIDAsIDEsIHNjZW5lcy5DRUxFU1RFXzE0LCAyMiwgMiwgMTApO1xuXG5cbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDEsIDM1LCAwLCBzY2VuZXMuTE9VSVNfMDIsIDQsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMywgMywgMCwgc2NlbmVzLkxPVUlTXzAyLCAxMywgMCwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAzLCAzMCwgMSwgc2NlbmVzLkxPVUlTXzAyLCAyMywgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzA0LCA0LCAwLCBzY2VuZXMuTE9VSVNfMDIsIDM1LCAzLCAzKTtcblxuICAgICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzY2VuZXMsXG4gICAgbG9hZFNjZW5lcyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbmNsYXNzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGltZXIgKz0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAmJiB0aGlzLnJlbWFpbmluZ0NvdW50ICYmIHRoaXMudGltZXIgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1haW5pbmdDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgfVxufVxuXG5cbmNsYXNzIExpbmVhck1vdmVtZW50IGV4dGVuZHMgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICB0aGlzLm15ID0gKHkyIC0geTEpIC8gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIHRoaW5nLnNldE1vbWVudHVtKHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHRoaXMueDIsIHRoaXMueTIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNlcXVlbmNlTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IobW92ZW1lbnRzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMubW92ZW1lbnRzID0gbW92ZW1lbnRzO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0uZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLm1vdmVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTaW5lTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gdGhpcy50aW1lciAqIDIgKiBNYXRoLlBJIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhdGlvID0gKE1hdGguY29zKGFuZ2xlKSArIDEpIC8gMjtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyhyYXRpbyAqIHRoaXMueDEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueDIsIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55Mik7XG4gICAgICAgICAgICBjb25zdCBkcmF0aW8gPSBNYXRoLlBJICogTWF0aC5zaW4oYW5nbGUpIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IG14ID0gZHJhdGlvICogKHRoaXMueDIgLSB0aGlzLngxKTtcbiAgICAgICAgICAgIGNvbnN0IG15ID0gZHJhdGlvICogKHRoaXMueTIgLSB0aGlzLnkxKTtcbiAgICAgICAgICAgIHRoaW5nLnNldE1vbWVudHVtKG14LCBteSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8odGhpcy54MSwgdGhpcy55MSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTW92ZW1lbnQsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2VxdWVuY2VNb3ZlbWVudCxcbiAgICBTaW5lTW92ZW1lbnQsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbmNvbnN0IHRpbGVzZXQgPSBuZXcgSW1hZ2UoKTtcbnRpbGVzZXQuc3JjID0gJ3RpbGVtYXBzL3RpbGVzZXQucG5nJztcblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqIFRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUgaWYgdGhlIGludGVyc2VjdGlvbiBvZiBib3RoIHNlZ21lbnRzIGlzIG9mIG5vbi16ZXJvIG1lYXN1cmUgKGlmIHRoZSBlbmQgb2Ygb25lIHNlZ21lbnRcbiAqIGNvaW5jaWRlcyB3aXRoIHRoZSBzdGFydCBvZiB0aGUgbmV4dCwgdGhleSBhcmUgbm90IGNvbnNpZGVyZWQgYXMgb3ZlcmxhcHBpbmcpXG4gKlxuICogQHBhcmFtIHN0YXJ0MSB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHNpemUxIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc3RhcnQyIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBzZWNvbmQgc2VnbWVudFxuICogQHBhcmFtIHNpemUyIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgdHdvIHNlZ21lbnRzIG92ZXJsYXBcbiAqL1xuZnVuY3Rpb24gc2VnbWVudHNPdmVybGFwKHN0YXJ0MSwgc2l6ZTEsIHN0YXJ0Miwgc2l6ZTIpIHtcbiAgICByZXR1cm4gc3RhcnQxIDwgc3RhcnQyICsgc2l6ZTIgJiYgc3RhcnQyIDwgc3RhcnQxICsgc2l6ZTE7XG59XG5cblxuLyoqXG4gKiBUaGluZ3MgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgaW50ZXJhY3QgaW4gdGhlIHBoeXNpY3MgbW9kZWwgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZXRjLilcbiAqIEFsbCB0aGluZ3MgYXJlIHJlcHJlc2VudGVkIGFzIGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3hlcyBhbmQgdGhlIHNwYWNlIHRoZXkgb2NjdXB5IGluIGEgc2NlbmUgaXMgdGhlcmVmb3JlIGRlZmluZWRcbiAqIGFzIGEgcG9zaXRpb24gKHgsIHkpIGFuZCBhIHNpemUgKHdpZHRoLCBoZWlnaHQpLiBBdCBhbGwgdGltZXMsIHBvc2l0aW9ucyBhbmQgc2l6ZXMgc2hvdWxkIGJlIGludGVnZXJzLiBTdWItaW50ZWdlclxuICogcG9zaXRpb25zIGFyZSBjb25zaWRlcmVkIHdpdGggdGhlIHVzZSBvZiB0aGUgYHhSZW1haW5kZXJgIGFuZCBgeVJlbWFpbmRlcmAgYXR0cmlidXRlcyAodGhhdCBzaG91bGQgaGF2ZSBhbiBhYnNvbHV0ZVxuICogdmFsdWUgPCAxKVxuICovXG5jbGFzcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy50aWxlRGF0YSA9IHRpbGVEYXRhO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyMwMDAwMDAnO1xuICAgICAgICB0aGlzLm1vdmVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBvdmVybGFwcyhvdGhlcikge1xuICAgICAgICByZXR1cm4gKHRoaXMueCArIHRoaXMud2lkdGggPiBvdGhlci54ICYmXG4gICAgICAgICAgICBvdGhlci54ICsgb3RoZXIud2lkdGggPiB0aGlzLnggJiZcbiAgICAgICAgICAgIHRoaXMueSArIHRoaXMuaGVpZ2h0ID4gb3RoZXIueSAmJlxuICAgICAgICAgICAgb3RoZXIueSArIG90aGVyLmhlaWdodCA+IHRoaXMueSk7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMudGlsZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICB0aWxlc2V0LFxuICAgICAgICAgICAgICAgIDE2ICogdGhpcy50aWxlRGF0YS54LCAxNiAqIHRoaXMudGlsZURhdGEueSxcbiAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgdGhpcy54ICsgdGhpcy50aWxlRGF0YS5zaGlmdFgsIHRoaXMueSArIHRoaXMudGlsZURhdGEuc2hpZnRZLFxuICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQpIHtcbiAgICAgICAgICAgIHRoaXMubW92ZW1lbnQudXBkYXRlKGRlbHRhVGltZSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSkge1xuICAgIH1cblxuICAgIG1vdmVUbyh4LCB5KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyKTtcbiAgICB9XG5cbiAgICBzZXRNb3ZlbWVudChtb3ZlbWVudCkge1xuICAgICAgICB0aGlzLm1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cblxuXG5jbGFzcyBBY3RvciBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLm1vdmVkU2VsZlggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkU2VsZlkgPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICB9XG5cbiAgICBtb3ZlWChhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdYID0gdGhpcy54ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCAtIHRoaXMud2lkdGggPCBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCArIHNvbGlkLndpZHRoID4gbmV3WCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ggPSBzb2xpZC54ICsgc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR4ID0gbmV3WCAtIHRoaXMueDtcbiAgICAgICAgICAgIHRoaXMueCA9IG5ld1g7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmVZKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55IC0gdGhpcy5oZWlnaHQgPCBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgLSB0aGlzLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgPiBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR5ID0gbmV3WSAtIHRoaXMueTtcbiAgICAgICAgICAgIHRoaXMueSA9IG5ld1k7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBkeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWSA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICB9XG5cbiAgICBhZnRlclVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZYID0gdGhpcy5tb3ZlZFg7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWSA9IHRoaXMubW92ZWRZO1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gdGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICB9XG59XG5cblxuY2xhc3MgU29saWQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyM2YzJjMGInO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW0gPSAwO1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgZ2V0TW9tZW50dW1YKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW0gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb21lbnR1bVg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgZ2V0TW9tZW50dW1ZKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW0gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb21lbnR1bVk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbW92ZShkeCwgZHksIG14ID0gdW5kZWZpbmVkLCBteSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54IC0gYWN0b3IueCAtIGFjdG9yLndpZHRoLCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPiBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSArIHRoaXMuaGVpZ2h0IC0gYWN0b3IueSwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZIDwgbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgLSBhY3Rvci55IC0gYWN0b3IuaGVpZ2h0LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtKG14LCBteSkge1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IGNvbnN0YW50cy5NT01FTlRVTV9TVE9SRV9USU1FO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IG14O1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IG15O1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGggKyBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54ICsgZHgsIGFjdG9yLndpZHRoIC0gZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCArIGR5KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSArIGR5LCBhY3Rvci5oZWlnaHQgLSBkeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG5jbGFzcyBIYXphcmQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyNmMzEzMTQnO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICB9XG59XG5cblxuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjYTg2MTJhXCI7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0IDw9IHRoaXMueSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgKyBkeSA+IHRoaXMueTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMudGlsZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICB0aWxlc2V0LFxuICAgICAgICAgICAgICAgIDE2ICogKHRoaXMudGlsZURhdGEueCksIDE2ICogdGhpcy50aWxlRGF0YS55LFxuICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICB0aGlzLngsIHRoaXMueSxcbiAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTcHJpbmcgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCBVLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLnRpbGVEYXRhLnNoaWZ0WSA9IC1VIC8gMjtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0JPVU5DRSk7XG4gICAgICAgIHBsYXllci5zcGVlZFggPSAwO1xuICAgICAgICBwbGF5ZXIuc3BlZWRZID0gY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgcGxheWVyLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIERhc2hEaWFtb25kIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTdHJhd2JlcnJ5IGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgVHJhbnNpdGlvbiBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICB0aGlzLnRhcmdldFggPSB0YXJnZXRYO1xuICAgICAgICB0aGlzLnRhcmdldFkgPSB0YXJnZXRZO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IHNwYXduUG9pbnRJbmRleDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgcGxheWVyLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzaG91bGRCZWNvbWVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRCZWNvbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQmVjb21lQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNjZW5lLnBsYXllciAmJiB0aGlzLnNjZW5lLnBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gLjU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxwaGEgPSAyICogdGhpcy50aW1lcnMuZmFsbDtcbiAgICAgICAgICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IGFscGhhO1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgVHJpZ2dlckJsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIG1vdmVtZW50KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlcyA9IG5ldyBBcnJheSgod2lkdGggLyBVKSAqIChoZWlnaHQgLyBVKSkuZmlsbCgwKS5tYXAoXyA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5zY2VuZS5wbGF5ZXI7XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm1vdmVtZW50ICYmIHRoaXMubW92ZW1lbnQucmVtYWluaW5nQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQgPT09IHVuZGVmaW5lZCAmJiBwbGF5ZXIuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50ID0gdGhpcy50cmlnZ2VyZWRNb3ZlbWVudDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50LnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKGxldCB4ID0gdGhpcy54OyB4IDwgdGhpcy54ICsgdGhpcy53aWR0aDsgeCArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gdGhpcy55OyB5IDwgdGhpcy55ICsgdGhpcy5oZWlnaHQ7IHkgKz0gVSkge1xuICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgICAgIDE2ICogdGhpcy5zcHJpdGVJbmRleGVzW2luZGV4XSwgMTYgKiA4LFxuICAgICAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgICAgIHgsIHksXG4gICAgICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU3Bpa2VzVXAgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgdGlsZURhdGEuc2hpZnRZID0gLVUvMjtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUvMiwgVSwgVS8yLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBTcGlrZXNEb3duIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUvMiwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG59XG5cblxuY2xhc3MgU3Bpa2VzUmlnaHQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSAvIDIsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwaWtlc0xlZnQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgdGlsZURhdGEuc2hpZnRYID0gLVUvMjtcbiAgICAgICAgc3VwZXIoeCArIFUvMiwgeSwgVS8yLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZWdtZW50c092ZXJsYXAsXG4gICAgSGF6YXJkLFxuICAgIFNvbGlkLFxuICAgIEFjdG9yLFxuICAgIFBsYXRmb3JtLFxuICAgIFNwcmluZyxcbiAgICBEYXNoRGlhbW9uZCxcbiAgICBTdHJhd2JlcnJ5LFxuICAgIFRyYW5zaXRpb24sXG4gICAgVHJpZ2dlckJsb2NrLFxuICAgIENydW1ibGluZ0Jsb2NrLFxuICAgIFNwaWtlc1VwLFxuICAgIFNwaWtlc0Rvd24sXG4gICAgU3Bpa2VzTGVmdCxcbiAgICBTcGlrZXNSaWdodCxcbn1cbiIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHNwcml0ZXMgPSByZXF1aXJlKCcuL3Nwcml0ZXMnKTtcbmNvbnN0IEFOSU1BVElPTl9TTE9XRE9XTiA9IDY7XG5cbmNvbnN0IEFOSU1BVElPTl9JRExFID0gWzQsIDRdO1xuY29uc3QgQU5JTUFUSU9OX1JVTiA9IFsxLCA2XTtcbmNvbnN0IEFOSU1BVElPTl9KVU1QID0gWzYsIDNdO1xuY29uc3QgQU5JTUFUSU9OX0ZBTEwgPSBbNSwgM107XG5jb25zdCBBTklNQVRJT05fRElFID0gWzAsIDhdO1xuXG5jbGFzcyBQbGF5ZXIgZXh0ZW5kcyBwaHlzaWNzLkFjdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcih4ID0gMCwgeSA9IDApIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgOCwgMTQpO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG5cbiAgICAgICAgdGhpcy5pbnB1dHMgPSBuZXcgaW5wdXRzLlBsYXllcklucHV0cztcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBjb25zdGFudHMuU1RBVEVfTk9STUFMO1xuICAgICAgICB0aGlzLnNwcml0ZV9kaXJlY3Rpb24gPSAxO1xuICAgICAgICB0aGlzLnNwcml0ZV9yb3cgPSAxO1xuICAgICAgICB0aGlzLm5iX3Nwcml0ZXMgPSA0O1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcblxuICAgICAgICAvLyB0aW1lcnNcbiAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaEZyZWV6ZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gfn4odGhpcy5hbmltYXRpb25fY291bnRlciAvIEFOSU1BVElPTl9TTE9XRE9XTik7XG4gICAgICAgIGNvbnN0IHJvdyA9IDIgKiB0aGlzLnNwcml0ZV9yb3cgKyAodGhpcy5zcHJpdGVfZGlyZWN0aW9uID09PSAtMSA/IDEgOiAwKTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgIHNwcml0ZXMuc3ByaXRlc1NoZWV0LmNhbnZhcyxcbiAgICAgICAgICAgIDE2ICogaW5kZXgsIDE2ICogcm93LFxuICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgdGhpcy54IC0gNCwgdGhpcy55IC0gMixcbiAgICAgICAgICAgIDE2LCAxNik7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5pbnB1dHMudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgKz0gMTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciAlPSB0aGlzLm5iX3Nwcml0ZXMgKiBBTklNQVRJT05fU0xPV0RPV047XG5cbiAgICAgICAgLy8gY2hlY2sgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuY2xlYXIoKTtcbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMueSArIHRoaXMuaGVpZ2h0ID09PSBzb2xpZC55ICYmIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBsYXllciBpcyBzdGFuZGluZyBvbiBhIHNvbGlkXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvbGlkLmNhbkJlQ2xpbWJlZCAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciB3YWxscyBvbiByaWdodCBhbmQgbGVmdCBhdCBkaXN0YW5jZSA8PSBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VMZWZ0ID0gdGhpcy54IC0gc29saWQueCAtIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZUxlZnQgJiYgZGlzdGFuY2VMZWZ0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VSaWdodCA9IHNvbGlkLnggLSB0aGlzLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZVJpZ2h0ICYmIGRpc3RhbmNlUmlnaHQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMueCArIHRoaXMud2lkdGggPT09IHNvbGlkLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgcGxheWVyIGlzIGh1Z2dpbmcgYSB3YWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCB8fCB0aGlzLmRhc2hTcGVlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy51cGRhdGVBbmltYXRpb24oKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIGludGVyYWN0IHdpdGggb2JqZWN0c1xuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5zY2VuZS5lbGVtZW50cykge1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyhlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQub25Db250YWN0V2l0aCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnkgPj0gdGhpcy5zY2VuZS5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5keWluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzcGF3bigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcEhlbGQgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5pbnB1dHMueUF4aXMgKiBkYXNoU3BlZWQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlucHV0cy5kYXNoUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciAmJiB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPiAwKSB7XG4gICAgICAgICAgICAvLyByZWd1bGFyIGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSB0aGlzLmlucHV0cy54QXhpcyAqIGNvbnN0YW50cy5KVU1QX0hPUklaT05UQUxfQk9PU1Q7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgKHRoaXMuaGFzV2FsbExlZnQgfHwgdGhpcy5oYXNXYWxsUmlnaHQpKSB7XG4gICAgICAgICAgICAvLyB3YWxsanVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBkeCA9IHRoaXMuaGFzV2FsbExlZnQgPyAxIDogLTE7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gdGhpcy5pbnB1dHMueEF4aXM7XG5cbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5DTElNQl9TTElQX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IGNvbnN0YW50cy5TVEFURV9ERUFEKSB7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX1JVTik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVlZFkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9KVU1QKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRkFMTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IGNvbnN0YW50cy5WQVJfSlVNUF9USU1FO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IGNvbnN0YW50cy5EQVNIX1RJTUUgKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSBjb25zdGFudHMuRFlJTkdfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSBjb25zdGFudHMuQk9VTkNFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWFrZVRyYW5zaXRpb24odHJhbnNpdGlvbikge1xuICAgICAgICAvLyB2YWxpZGF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVFbGVtZW50KHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc2V0UGxheWVyKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IHRyYW5zaXRpb24uc3Bhd25Qb2ludEluZGV4O1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgLy8gcmVhY3RpdmF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzcGF3bigpIHtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnNjZW5lLnNwYXduUG9pbnRzW3RoaXMuc2NlbmUuc3Bhd25Qb2ludEluZGV4XTtcbiAgICAgICAgdGhpcy54ID0gcG9pbnQueDtcbiAgICAgICAgdGhpcy55ID0gcG9pbnQueSAtIDY7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiBzb2xpZC54ICsgc29saWQud2lkdGggPT09IHRoaXMueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHNvbGlkLnggPT09IHRoaXMueCArIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBzZXRBbmltYXRpb24oc3ByaXRlX3JvdywgbmJfc3ByaXRlcykge1xuICAgICAgICBpZiAoc3ByaXRlX3JvdyAhPT0gdGhpcy5zcHJpdGVfcm93KSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZV9yb3cgPSBzcHJpdGVfcm93O1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLm5iX3Nwcml0ZXMgPSBuYl9zcHJpdGVzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5kZWNvcmF0aW9ucyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50cyA9IFtdO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucGxheWVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IDA7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21KU09OKGRhdGEpIHtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoZGF0YS53aWR0aCAqIFUsIGRhdGEuaGVpZ2h0ICogVSk7XG4gICAgICAgIC8vIG1ha2Ugd2FsbHNcbiAgICAgICAgY29uc3Qgd2FsbHMgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgtLjUgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKChkYXRhLndpZHRoICsgLjUpICogVSwgMCwgMCwgZGF0YS5oZWlnaHQgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IChpbmRleCAtIDEpICUgOCxcbiAgICAgICAgICAgICAgICAgICAgeTogfn4oKGluZGV4IC0gMSkgLyA4KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRYOiAwLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFk6IDAsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLkRhc2hEaWFtb25kKHggKyBVIC8gMiwgeSArIFUgLyAyLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zcGF3blBvaW50cy5wdXNoKHt4OiB4LCB5OiB5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3Bpa2VzVXAoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1ODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3RyYXdiZXJyeSh4ICsgVSAvIDIsIHkgKyBVIC8gMiwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDU3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuQ3J1bWJsaW5nQmxvY2soeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDUwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUyOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcHJpbmcoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuU29saWQoeCwgeSwgVSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5lO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGVsZW1lbnQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IuYmVmb3JlVXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICBhY3Rvci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIGFjdG9yLmFmdGVyVXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBkZWNvcmF0aW9uIG9mIHRoaXMuZGVjb3JhdGlvbnMpIHtcbiAgICAgICAgICAgIGRlY29yYXRpb24udXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53aWR0aCAtIGNvbnN0YW50cy5WSUVXX1dJRFRILFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYIDwgLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVpZ2h0IC0gY29uc3RhbnRzLlZJRVdfSEVJR0hULFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA8IC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRpb24gb2YgdGhpcy5kZWNvcmF0aW9ucykge1xuICAgICAgICAgICAgZGVjb3JhdGlvbi5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBlbGVtZW50LmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRQbGF5ZXIocGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVBY3Rvcih0aGlzLnBsYXllcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5hZGRBY3RvcihwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgIH1cblxuICAgIGFkZEFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmFkZChhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5kZWxldGUoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMucmVtb3ZlKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIiwiY29uc3Qgc3ByaXRlc1NoZWV0ID0ge307XG5cbmZ1bmN0aW9uIHJhbmdlKG4pIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KG4pLmZpbGwoMCkubWFwKCh4LCBpKSA9PiBpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ByaXRlcygpIHtcbiAgICBzcHJpdGVzU2hlZXQuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgc3ByaXRlc1NoZWV0LmNvbnRleHQgPSBzcHJpdGVzU2hlZXQuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiBhZGRTcHJpdGVzKGltZykpO1xuICAgIGltZy5zcmMgPSBcImltYWdlcy9oZXJvX3Nwcml0ZXMucG5nXCI7XG59XG5cblxuZnVuY3Rpb24gYWRkU3ByaXRlcyhpbWFnZSkge1xuICAgIHNwcml0ZXNTaGVldC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcbiAgICBzcHJpdGVzU2hlZXQuY2FudmFzLmhlaWdodCA9IDIgKiBpbWFnZS5oZWlnaHQ7XG5cbiAgICBmb3IgKGxldCBpIG9mIHJhbmdlKGltYWdlLmhlaWdodCAvIDE2KSkge1xuICAgICAgICBmb3IgKGxldCBqIG9mIHJhbmdlKGltYWdlLndpZHRoIC8gMTYpKSB7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDE2ICogaiwgMTYgKiBpLCAxNiwgMTYsIDE2ICogaiwgMTYgKiAyICogaSwgMTYsIDE2KTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnNjYWxlKC0xLCAxKTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMTYgKiBqLCAxNiAqIGksIDE2LCAxNiwgLTE2ICogKGorMSksIDE2ICogKDIgKiBpICsgMSksIDE2LCAxNik7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubWFrZVNwcml0ZXMoKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNwcml0ZXNTaGVldCxcbn07Il19
