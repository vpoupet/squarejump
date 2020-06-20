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
        currentScene = maps.scenes.CELESTE_13;
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
        fetch("tilemaps/celeste15.json").then(response => response.json()),
        fetch("tilemaps/celeste16.json").then(response => response.json()),
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
            "CELESTE_15",
            "CELESTE_16",
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
            new movement.Movement(.25),
            new movement.LinearMovement(11 * U, 29 * U, 19 * U, 29 * U, .35),
            new movement.Movement(1),
            new movement.LinearMovement(19 * U, 29 * U, 11 * U, 29 * U, 1.5),
        ])));

        scenes.CELESTE_14.addSolid(new physics.TriggerBlock(26 * U, 28 * U, 5 * U, 2 * U, new movement.SequenceMovement([
            new movement.Movement(.25),
            new movement.LinearMovement(26 * U, 28 * U, 26 * U, 22 * U, .35),
            new movement.Movement(1),
            new movement.LinearMovement(26 * U, 22 * U, 26 * U, 28 * U, 1.5),
        ])));

        {
            const triggerBlock = new physics.TriggerBlock(24 * U, 6 * U, 2 * U, 7 * U, new movement.SequenceMovement([
                new movement.Movement(.25),
                new movement.LinearMovement(24 * U, 6 * U, 24 * U, 17 * U, .35),
                new movement.Movement(1),
                new movement.LinearMovement(24 * U, 17 * U, 24 * U, 6 * U, 1.5),
            ]));
            const tileData = {
                x: 0,
                y: 5,
                shiftX: 0,
                shiftY: 0,
            };
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U, tileData);
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U, tileData);
            triggerBlock.attachedThings.add(spikes1);
            triggerBlock.attachedThings.add(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addElement(spikes1);
            scenes.CELESTE_15.addElement(spikes2);
        }

        scenes.CELESTE_15.addSolid(new physics.TriggerBlock(15 * U, 20 * U, 2 * U, 4 * U, new movement.SequenceMovement([
            new movement.Movement(.25),
            new movement.LinearMovement(15 * U, 20 * U, 9 * U, 20 * U, .35),
            new movement.Movement(1),
            new movement.LinearMovement(9 * U, 20 * U, 15 * U, 20 * U, 1.5),
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
        makeTransitionRight(scenes.CELESTE_15, 22, 1, scenes.CELESTE_14, 4, 0, 5);
        makeTransitionRight(scenes.CELESTE_16, 19, 0, scenes.CELESTE_15, 2, 0, 2);

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
        this.attachedThings = new Set();
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
        for (const thing of this.attachedThings) {
            thing.move(dx, dy);
        }

        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        this.xRemainder -= moveX;
        this.x += moveX;
        this.yRemainder -= moveY;
        this.y += moveY;
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

    move(dx, dy) {
        for (const thing of this.attachedThings) {
            thing.move(dx, dy);
        }

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
        tileData.shiftY = -U / 2;
        super(x, y + U / 2, U, U / 2, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


class SpikesDown extends Thing {
    constructor(x, y, tileData) {
        super(x, y, U, U / 2, tileData);
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
        tileData.shiftX = -U / 2;
        super(x + U / 2, y, U / 2, U, tileData);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzcHJpdGVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfVVBfU1BFRUQgPSA0NTtcbmNvbnN0IENMSU1CX1NMSVBfU1BFRUQgPSAzMDtcbmNvbnN0IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSA9IDM7XG5jb25zdCBXQUxMX0pVTVBfSFNQRUVEID0gTUFYX1JVTl9TUEVFRCArIEpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbmNvbnN0IERBU0hfU1BFRUQgPSAyNDA7XG5jb25zdCBFTkRfREFTSF9TUEVFRCA9IDE2MDtcbmNvbnN0IEVORF9EQVNIX1VQX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfVElNRSA9IC4xNTtcbmNvbnN0IERBU0hfQ09PTERPV04gPSAuMjtcblxuLy8gT3RoZXIgY29uc3RhbnRzXG5jb25zdCBNT01FTlRVTV9TVE9SRV9USU1FID0gLjE7XG5jb25zdCBNT01FTlRVTV9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX0ZSRUVaRV9USU1FID0gLjA1O1xuY29uc3QgQk9VTkNFX1RJTUUgPSAuMjtcbmNvbnN0IEJPVU5DRV9TUEVFRCA9IDE4MDtcbmNvbnN0IERZSU5HX1RJTUUgPSAuODtcbmNvbnN0IFNUQVRFX05PUk1BTCA9IDA7XG5jb25zdCBTVEFURV9KVU1QID0gMTtcbmNvbnN0IFNUQVRFX0RBU0ggPSAyO1xuY29uc3QgU1RBVEVfREVBRCA9IDM7XG5jb25zdCBTVEFURV9CT1VOQ0UgPSA0O1xuXG5jb25zdCBHUklEX1NJWkUgPSA4O1xuY29uc3QgVklFV19XSURUSCA9IDMyMDtcbmNvbnN0IFZJRVdfSEVJR0hUID0gMTgwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNQVhfUlVOX1NQRUVELFxuICAgIFJVTl9BQ0NFTEVSQVRJT04sXG4gICAgUlVOX0RFQ0VMRVJBVElPTixcbiAgICBBSVJfRkFDVE9SLFxuICAgIEpVTVBfU1BFRUQsXG4gICAgSlVNUF9IT1JJWk9OVEFMX0JPT1NULFxuICAgIE1BWF9GQUxMX1NQRUVELFxuICAgIEdSQVZJVFksXG4gICAgSlVNUF9HUkFDRV9USU1FLFxuICAgIFZBUl9KVU1QX1RJTUUsXG4gICAgQ0xJTUJfVVBfU1BFRUQsXG4gICAgQ0xJTUJfU0xJUF9TUEVFRCxcbiAgICBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UsXG4gICAgV0FMTF9KVU1QX0hTUEVFRCxcbiAgICBEQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1VQX0ZBQ1RPUixcbiAgICBEQVNIX1RJTUUsXG4gICAgREFTSF9DT09MRE9XTixcbiAgICBNT01FTlRVTV9TVE9SRV9USU1FLFxuICAgIE1PTUVOVFVNX0ZBQ1RPUixcbiAgICBEQVNIX0ZSRUVaRV9USU1FLFxuICAgIEJPVU5DRV9USU1FLFxuICAgIEJPVU5DRV9TUEVFRCxcbiAgICBEWUlOR19USU1FLFxuICAgIFNUQVRFX05PUk1BTCxcbiAgICBTVEFURV9KVU1QLFxuICAgIFNUQVRFX0RBU0gsXG4gICAgU1RBVEVfREVBRCxcbiAgICBTVEFURV9CT1VOQ0UsXG4gICAgR1JJRF9TSVpFLFxuICAgIFZJRVdfV0lEVEgsXG4gICAgVklFV19IRUlHSFQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBKVU1QX0JVRkZFUl9USU1FID0gLjE7XG5jb25zdCBEQVNIX0JVRkZFUl9USU1FID0gLjE7XG5sZXQgcHJlc3NlZEtleXMgPSBuZXcgU2V0KCk7XG5sZXQgcHJlc3NlZEJ1dHRvbnMgPSBuZXcgU2V0KCk7XG5sZXQgZ2FtZXBhZFByZXNzZWRCdXR0b25zID0gW107XG5cbmNsYXNzIFBsYXllcklucHV0cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZ2FtZXBhZEluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5nYW1lcGFkbWFwID0ge1xuICAgICAgICAgICAganVtcDogMCxcbiAgICAgICAgICAgIGRhc2g6IDEsXG4gICAgICAgICAgICB1cDogMTIsXG4gICAgICAgICAgICBkb3duOiAxMyxcbiAgICAgICAgICAgIGxlZnQ6IDE0LFxuICAgICAgICAgICAgcmlnaHQ6IDE1LFxuICAgICAgICB9XG4gICAgICAgIHRoaXMua2V5bWFwID0ge1xuICAgICAgICAgICAgcmlnaHQ6ICdBcnJvd1JpZ2h0JyxcbiAgICAgICAgICAgIGxlZnQ6ICdBcnJvd0xlZnQnLFxuICAgICAgICAgICAgdXA6ICdBcnJvd1VwJyxcbiAgICAgICAgICAgIGRvd246ICdBcnJvd0Rvd24nLFxuICAgICAgICAgICAganVtcDogJ2cnLFxuICAgICAgICAgICAgZGFzaDogJ2YnLFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGltZXJzID0ge1xuICAgICAgICAgICAganVtcEJ1ZmZlcjogMCxcbiAgICAgICAgICAgIGRhc2hCdWZmZXI6IDAsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdXBkYXRlR2FtZXBhZCgpIHtcbiAgICAgICAgcHJlc3NlZEJ1dHRvbnMuY2xlYXIoKTtcbiAgICAgICAgY29uc3QgZ2FtZXBhZCA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpW3RoaXMuZ2FtZXBhZEluZGV4XTtcbiAgICAgICAgaWYgKGdhbWVwYWQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ2FtZXBhZC5idXR0b25zOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2FtZXBhZC5idXR0b25zW2pdLnByZXNzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlc3NlZEJ1dHRvbnMuYWRkKGopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgY29uc3QgZ2FtZXBhZCA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpW3RoaXMuZ2FtZXBhZEluZGV4XTtcbiAgICAgICAgLy8gdGhpcy51cGRhdGVHYW1lcGFkKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmxlZnQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmxlZnRdLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnhBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5yaWdodCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAucmlnaHRdLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnhBeGlzICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC51cCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAudXBdLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnlBeGlzICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5kb3duKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5kb3duXS5wcmVzc2VkKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByZXZKdW1wID0gdGhpcy5qdW1wSGVsZDtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5qdW1wKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5qdW1wXS5wcmVzc2VkKTtcbiAgICAgICAgaWYgKCFwcmV2SnVtcCAmJiB0aGlzLmp1bXBIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID0gSlVNUF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciAmPSB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZEYXNoID0gdGhpcy5kYXNoSGVsZDtcbiAgICAgICAgdGhpcy5kYXNoSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5kYXNoKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5kYXNoXS5wcmVzc2VkKTtcbiAgICAgICAgaWYgKCFwcmV2RGFzaCAmJiB0aGlzLmRhc2hIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQnVmZmVyID0gREFTSF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyICYmICh0aGlzLnRpbWVycy5kYXNoQnVmZmVyID4gMCk7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcklucHV0cyxcbiAgICBnYW1lcGFkUHJlc3NlZEJ1dHRvbnMsXG4gICAgcHJlc3NlZEtleXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcbmNvbnN0IHNwcml0ZXMgPSByZXF1aXJlKCcuL3Nwcml0ZXMnKTtcblxuY29uc3QgU0NBTElORyA9IDM7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5sZXQgY29udGV4dDtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5sZXQgc2Nyb2xsWCA9IDA7XG5sZXQgc2Nyb2xsWSA9IDA7XG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHQudHJhbnNsYXRlKHNjcm9sbFggLSB4LCBzY3JvbGxZIC0geSk7XG4gICAgc2Nyb2xsWCA9IHg7XG4gICAgc2Nyb2xsWSA9IHk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB1cGRhdGUoKTtcbn1cblxuXG5mdW5jdGlvbiBzdG9wKCkge1xuICAgIGlzUnVubmluZyA9IGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc1J1bm5pbmcpIHtcbiAgICAgICAgc2xvd2Rvd25Db3VudGVyICs9IDE7XG4gICAgICAgIGlmIChzbG93ZG93bkNvdW50ZXIgPj0gU0xPV0RPV05fRkFDVE9SKSB7XG4gICAgICAgICAgICBzbG93ZG93bkNvdW50ZXIgLT0gU0xPV0RPV05fRkFDVE9SO1xuICAgICAgICAgICAgZnJhbWVDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7ZnJhbWVDb3VudGVyIC8gZnJhbWVSYXRlUmVmcmVzaH0gRlBTYCk7XG4gICAgICAgICAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRklYRURfREVMVEFfVElNRSA/XG4gICAgICAgICAgICAgICAgMSAvIEZSQU1FX1JBVEUgOlxuICAgICAgICAgICAgICAgIE1hdGgubWluKCh0aW1lTm93IC0gbGFzdFVwZGF0ZSkgLyAoMTAwMCAqIFNMT1dET1dOX0ZBQ1RPUiksIC4wNSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUudXBkYXRlKGRlbHRhVGltZSk7XG5cbiAgICAgICAgICAgIC8vIFRyYW5zaXRpb24gZnJvbSBvbmUgcm9vbSB0byBhbm90aGVyXG4gICAgICAgICAgICBpZiAoY3VycmVudFNjZW5lLnRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICAgICAgY3VycmVudFNjZW5lID0gY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICAgICAgcHJldlNjZW5lLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRTY3JvbGwoY3VycmVudFNjZW5lLnNjcm9sbFgsIGN1cnJlbnRTY2VuZS5zY3JvbGxZKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5kcmF3KGNvbnRleHQpO1xuICAgICAgICAgICAgbGFzdFVwZGF0ZSA9IHRpbWVOb3c7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG4gICAgfVxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgICAgIGlmIChTTE9XRE9XTl9GQUNUT1IgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG5cbiAgICAvLyBwcmVwYXJlIGNhbnZhcyBhbmQgY29udGV4dFxuICAgIGNvbnN0IHNjcmVlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lLXNjcmVlbicpO1xuICAgIHNjcmVlbi5zdHlsZS53aWR0aCA9IGAke2NvbnN0YW50cy5WSUVXX1dJRFRIICogU0NBTElOR31weGA7XG4gICAgc2NyZWVuLnN0eWxlLmhlaWdodCA9IGAke2NvbnN0YW50cy5WSUVXX0hFSUdIVCAqIFNDQUxJTkd9cHhgO1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGF5ZXIxXCIpO1xuICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgIGNhbnZhcy53aWR0aCA9IFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICBjb250ZXh0LnNjYWxlKFNDQUxJTkcsIFNDQUxJTkcpO1xuICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICAvLyBsb2FkIGFsbCBzY2VuZXMgYW5kIHN0YXJ0IGdhbWVcbiAgICBtYXBzLmxvYWRTY2VuZXMudGhlbigoKSA9PiB7XG4gICAgICAgIGN1cnJlbnRTY2VuZSA9IG1hcHMuc2NlbmVzLkNFTEVTVEVfMTM7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zcGF3blBvaW50SW5kZXggPSAxO1xuICAgICAgICBjdXJyZW50U2NlbmUuc2V0UGxheWVyKG5ldyBwbGF5ZXIuUGxheWVyKCkpO1xuICAgICAgICBjdXJyZW50U2NlbmUucGxheWVyLnJlc3Bhd24oKTtcbiAgICAgICAgc3RhcnQoKTtcbiAgICB9KTtcbn07XG5cblxuLy8gR2FtZXBhZCBBUElcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiZ2FtZXBhZGNvbm5lY3RlZFwiLCAoZXZlbnQpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcIkEgZ2FtZXBhZCBjb25uZWN0ZWQ6XCIpO1xuICAgIGNvbnNvbGUubG9nKGV2ZW50LmdhbWVwYWQpO1xuICAgIGlucHV0cy5nYW1lcGFkUHJlc3NlZEJ1dHRvbnNbZXZlbnQuZ2FtZXBhZC5pbmRleF0gPSBuZXcgU2V0KCk7XG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkZGlzY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGRpc2Nvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IHVuZGVmaW5lZDtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IHNjZW5lID0gcmVxdWlyZSgnLi9zY2VuZScpO1xuY29uc3QgbW92ZW1lbnQgPSByZXF1aXJlKCcuL21vdmVtZW50Jyk7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbmNvbnN0IHNjZW5lcyA9IHt9O1xuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmUxLCB4MSwgaW5kZXgxLCBzY2VuZTIsIHgyLCBpbmRleDIsIHdpZHRoKSB7XG4gICAgc2NlbmUxLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MSAqIFUsIC1VLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCBzY2VuZTIuaGVpZ2h0IC0gMyAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oeDIgKiBVLCBzY2VuZTIuaGVpZ2h0LCB3aWR0aCAqIFUsIDAsIHNjZW5lMSwgeDEgKiBVLCAyICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHkxLCBpbmRleDEsIHNjZW5lMiwgeTIsIGluZGV4MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihzY2VuZTEud2lkdGgsIHkxICogVSwgMCwgaGVpZ2h0ICogVSwgc2NlbmUyLCBVLCB5MiAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsIHNjZW5lMS53aWR0aCAtIFUsIHkxICogVSwgaW5kZXgxKSk7XG59XG5cblxuY29uc3QgbG9hZFNjZW5lcyA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDEuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDQuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA1Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDcuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA4Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwOS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTAuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTExLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTE0Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxNS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTYuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcblxuICAgIF0pLnRoZW4ocmVzcG9uc2VzID0+IHtcbiAgICAgICAgY29uc3Qgc2NlbmVOYW1lcyA9IFtcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wMVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzAyXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDNcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wNFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA1XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDZcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wN1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA4XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDlcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xMFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzExXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTJcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xM1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzE0XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTVcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xNlwiLFxuICAgICAgICAgICAgXCJMT1VJU18wMVwiLFxuICAgICAgICAgICAgXCJMT1VJU18wMlwiLFxuICAgICAgICAgICAgXCJMT1VJU18wM1wiLFxuICAgICAgICAgICAgXCJMT1VJU18wNFwiXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2VuZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzY2VuZXNbc2NlbmVOYW1lc1tpXV0gPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihyZXNwb25zZXNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTAgKiBVLCAzICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguNzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE0ICogVSwgMTAgKiBVLCAyMyAqIFUsIDkgKiBVLCAuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjMgKiBVLCA5ICogVSwgMTQgKiBVLCAxMCAqIFUsIDEuNSksXG4gICAgICAgIF0pKSk7XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDYuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDEzICogVSwgMzMgKiBVLCA0ICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguNzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDEzICogVSwgMzMgKiBVLCAxMyAqIFUsIDIzICogVSwgLjQ1KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIDIzICogVSwgMTMgKiBVLCAzMyAqIFUsIDEuNSksXG4gICAgICAgIF0pKSk7XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDguYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTYgKiBVLCAyICogVSwgMyAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguNzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE0ICogVSwgMTYgKiBVLCAyMSAqIFUsIDEyICogVSwgLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDIxICogVSwgMTIgKiBVLCAxNCAqIFUsIDE2ICogVSwgMiksXG4gICAgICAgIF0pKSk7XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDExICogVSwgMjkgKiBVLCA0ICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguMjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDExICogVSwgMjkgKiBVLCAxOSAqIFUsIDI5ICogVSwgLjM1KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxOSAqIFUsIDI5ICogVSwgMTEgKiBVLCAyOSAqIFUsIDEuNSksXG4gICAgICAgIF0pKSk7XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDI2ICogVSwgMjggKiBVLCA1ICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguMjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDI2ICogVSwgMjggKiBVLCAyNiAqIFUsIDIyICogVSwgLjM1KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyNiAqIFUsIDIyICogVSwgMjYgKiBVLCAyOCAqIFUsIDEuNSksXG4gICAgICAgIF0pKSk7XG5cbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDI0ICogVSwgNiAqIFUsIDIgKiBVLCA3ICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguMjUpLFxuICAgICAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyNCAqIFUsIDYgKiBVLCAyNCAqIFUsIDE3ICogVSwgLjM1KSxcbiAgICAgICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDI0ICogVSwgMTcgKiBVLCAyNCAqIFUsIDYgKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpO1xuICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiA1LFxuICAgICAgICAgICAgICAgIHNoaWZ0WDogMCxcbiAgICAgICAgICAgICAgICBzaGlmdFk6IDAsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI0ICogVSwgNSAqIFUsIHRpbGVEYXRhKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDUgKiBVLCB0aWxlRGF0YSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoZWRUaGluZ3MuYWRkKHNwaWtlczEpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaGVkVGhpbmdzLmFkZChzcGlrZXMyKTtcblxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzE1LmFkZEVsZW1lbnQoc3Bpa2VzMSk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRFbGVtZW50KHNwaWtlczIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE1ICogVSwgMjAgKiBVLCAyICogVSwgNCAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguMjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE1ICogVSwgMjAgKiBVLCA5ICogVSwgMjAgKiBVLCAuMzUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDkgKiBVLCAyMCAqIFUsIDE1ICogVSwgMjAgKiBVLCAxLjUpLFxuICAgICAgICBdKSkpO1xuXG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDEsIDMxLCAwLCBzY2VuZXMuQ0VMRVNURV8wMiwgMSwgMSwgNSk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDIsIDM0LCAwLCBzY2VuZXMuQ0VMRVNURV8wMywgMiwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDMsIDMzLCAwLCBzY2VuZXMuQ0VMRVNURV8wNCwgMywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDQsIDIxLCAwLCBzY2VuZXMuQ0VMRVNURV8wNSwgNCwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDUsIDIyLCAwLCBzY2VuZXMuQ0VMRVNURV8wNiwgMywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDcsIDI5LCAwLCBzY2VuZXMuQ0VMRVNURV8wNiwgMzAsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA2LCAzMCwgMiwgc2NlbmVzLkNFTEVTVEVfMDgsIDUsIDAsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA2LCAzNSwgMCwgc2NlbmVzLkNFTEVTVEVfMDksIDEsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzEwLCA3LCAwLCBzY2VuZXMuQ0VMRVNURV8wOSwgNywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTEsIDgsIDEsIHNjZW5lcy5DRUxFU1RFXzEwLCA4LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8xMCwgMiwgMSwgc2NlbmVzLkNFTEVTVEVfMTIsIDQyLCAxLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8xMSwgMywgMCwgc2NlbmVzLkNFTEVTVEVfMTIsIDMsIDAsIDIpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA5LCAwLCAwLCBzY2VuZXMuQ0VMRVNURV8xMywgMCwgMCwgMTApO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzEzLCAwLCAxLCBzY2VuZXMuQ0VMRVNURV8xNCwgMjIsIDIsIDEwKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xNSwgMjIsIDEsIHNjZW5lcy5DRUxFU1RFXzE0LCA0LCAwLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xNiwgMTksIDAsIHNjZW5lcy5DRUxFU1RFXzE1LCAyLCAwLCAyKTtcblxuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMSwgMzUsIDAsIHNjZW5lcy5MT1VJU18wMiwgNCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAzLCAzLCAwLCBzY2VuZXMuTE9VSVNfMDIsIDEzLCAwLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMwLCAxLCBzY2VuZXMuTE9VSVNfMDIsIDIzLCAyLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDQsIDQsIDAsIHNjZW5lcy5MT1VJU18wMiwgMzUsIDMsIDMpO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbiAgICBsb2FkU2NlbmVzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuY2xhc3MgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gY291bnQ7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMudGltZXIgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIpO1xuICAgICAgICAgICAgdGhpbmcuc2V0TW9tZW50dW0odGhpcy5teCwgdGhpcy5teSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2VxdWVuY2VNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihtb3ZlbWVudHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5tb3ZlbWVudHMgPSBtb3ZlbWVudHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udGltZXIgLSB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMubW92ZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNpbmVNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHJhdGlvICogdGhpcy54MSArICgxIC0gcmF0aW8pICogdGhpcy54MiwgcmF0aW8gKiB0aGlzLnkxICsgKDEgLSByYXRpbykgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIGNvbnN0IGRyYXRpbyA9IE1hdGguUEkgKiBNYXRoLnNpbihhbmdsZSkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgbXggPSBkcmF0aW8gKiAodGhpcy54MiAtIHRoaXMueDEpO1xuICAgICAgICAgICAgY29uc3QgbXkgPSBkcmF0aW8gKiAodGhpcy55MiAtIHRoaXMueTEpO1xuICAgICAgICAgICAgdGhpbmcuc2V0TW9tZW50dW0obXgsIG15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNb3ZlbWVudCxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTZXF1ZW5jZU1vdmVtZW50LFxuICAgIFNpbmVNb3ZlbWVudCxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3QgdGlsZXNldCA9IG5ldyBJbWFnZSgpO1xudGlsZXNldC5zcmMgPSAndGlsZW1hcHMvdGlsZXNldC5wbmcnO1xuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdHdvIHNlZ21lbnRzIG9uIGEgMUQgbGluZSBvdmVybGFwLlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnggPSB4O1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnRpbGVEYXRhID0gdGlsZURhdGE7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLmF0dGFjaGVkVGhpbmdzID0gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgMTYgKiB0aGlzLnRpbGVEYXRhLngsIDE2ICogdGhpcy50aWxlRGF0YS55LFxuICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICB0aGlzLnggKyB0aGlzLnRpbGVEYXRhLnNoaWZ0WCwgdGhpcy55ICsgdGhpcy50aWxlRGF0YS5zaGlmdFksXG4gICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZFRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGR4O1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gZHk7XG4gICAgICAgIGNvbnN0IG1vdmVYID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICBjb25zdCBtb3ZlWSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgfVxuXG4gICAgbW92ZVRvKHgsIHkpIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIpO1xuICAgIH1cblxuICAgIHNldE1vdmVtZW50KG1vdmVtZW50KSB7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIEFjdG9yIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRTZWxmWSA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGR4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW92ZVkoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WSA9IHRoaXMueSArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgLSB0aGlzLmhlaWdodCA8IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSAtIHRoaXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSArIHNvbGlkLmhlaWdodCA+IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSArIHNvbGlkLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHkgPSBuZXdZIC0gdGhpcy55O1xuICAgICAgICAgICAgdGhpcy55ID0gbmV3WTtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYmVmb3JlVXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZZID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgIH1cblxuICAgIGFmdGVyVXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLm1vdmVkU2VsZlggPSB0aGlzLm1vdmVkWDtcbiAgICAgICAgdGhpcy5tb3ZlZFNlbGZZID0gdGhpcy5tb3ZlZFk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgIH1cbn1cblxuXG5jbGFzcyBTb2xpZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzZjMmMwYic7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IDA7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVgoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVkoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRUaGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmUoZHgsIGR5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54ICsgdGhpcy53aWR0aCAtIGFjdG9yLngsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYIDwgbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggLSBhY3Rvci54IC0gYWN0b3Iud2lkdGgsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW92ZVkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPCBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA+IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0TW9tZW50dW0obXgsIG15KSB7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbmNsYXNzIEhhemFyZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnI2YzMTMxNCc7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBQbGF0Zm9ybSBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNhODYxMmFcIjtcbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgPD0gdGhpcy55ICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCArIGR5ID4gdGhpcy55O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgMTYgKiAodGhpcy50aWxlRGF0YS54KSwgMTYgKiB0aGlzLnRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgIHRoaXMueCwgdGhpcy55LFxuICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwcmluZyBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMudGlsZURhdGEuc2hpZnRZID0gLVUgLyAyO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfQk9VTkNFKTtcbiAgICAgICAgcGxheWVyLnNwZWVkWCA9IDA7XG4gICAgICAgIHBsYXllci5zcGVlZFkgPSBjb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICBwbGF5ZXIucmVzdG9yZURhc2goKTtcbiAgICB9XG59XG5cblxuY2xhc3MgRGFzaERpYW1vbmQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSlcbiAgICAgICAgaWYgKCF0aGlzLmlzQWN0aXZlICYmIHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5yZXN0b3JlRGFzaCgpKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuYWRkKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZLCBzcGF3blBvaW50SW5kZXggPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIHRoaXMudGFyZ2V0WSA9IHRhcmdldFk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludEluZGV4ID0gc3Bhd25Qb2ludEluZGV4O1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICBwbGF5ZXIubWFrZVRyYW5zaXRpb24odGhpcyk7XG4gICAgICAgIHRoaXMuc2NlbmUudHJhbnNpdGlvbiA9IHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIENydW1ibGluZ0Jsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5mYWxsIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNob3VsZEJlY29tZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEJlY29tZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRCZWNvbWVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IDIgKiB0aGlzLnRpbWVycy5mYWxsO1xuICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gYWxwaGE7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzID0gbmV3IEFycmF5KCh3aWR0aCAvIFUpICogKGhlaWdodCAvIFUpKS5maWxsKDApLm1hcChfID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnNjZW5lLnBsYXllcjtcbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQgJiYgdGhpcy5tb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCA9PT0gdW5kZWZpbmVkICYmIHBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB0aGlzLnRyaWdnZXJlZE1vdmVtZW50O1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGZvciAobGV0IHggPSB0aGlzLng7IHggPCB0aGlzLnggKyB0aGlzLndpZHRoOyB4ICs9IFUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IHkgPSB0aGlzLnk7IHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDsgeSArPSBVKSB7XG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICAgICAgdGlsZXNldCxcbiAgICAgICAgICAgICAgICAgICAgMTYgKiB0aGlzLnNwcml0ZUluZGV4ZXNbaW5kZXhdLCAxNiAqIDgsXG4gICAgICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICAgICAgeCwgeSxcbiAgICAgICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICB0aWxlRGF0YS5zaGlmdFkgPSAtVSAvIDI7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwaWtlc0Rvd24gZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwaWtlc1JpZ2h0IGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUgLyAyLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBTcGlrZXNMZWZ0IGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHRpbGVEYXRhLnNoaWZ0WCA9IC1VIC8gMjtcbiAgICAgICAgc3VwZXIoeCArIFUgLyAyLCB5LCBVIC8gMiwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2VnbWVudHNPdmVybGFwLFxuICAgIEhhemFyZCxcbiAgICBTb2xpZCxcbiAgICBBY3RvcixcbiAgICBQbGF0Zm9ybSxcbiAgICBTcHJpbmcsXG4gICAgRGFzaERpYW1vbmQsXG4gICAgU3RyYXdiZXJyeSxcbiAgICBUcmFuc2l0aW9uLFxuICAgIFRyaWdnZXJCbG9jayxcbiAgICBDcnVtYmxpbmdCbG9jayxcbiAgICBTcGlrZXNVcCxcbiAgICBTcGlrZXNEb3duLFxuICAgIFNwaWtlc0xlZnQsXG4gICAgU3Bpa2VzUmlnaHQsXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBzcHJpdGVzID0gcmVxdWlyZSgnLi9zcHJpdGVzJyk7XG5jb25zdCBBTklNQVRJT05fU0xPV0RPV04gPSA2O1xuXG5jb25zdCBBTklNQVRJT05fSURMRSA9IFs0LCA0XTtcbmNvbnN0IEFOSU1BVElPTl9SVU4gPSBbMSwgNl07XG5jb25zdCBBTklNQVRJT05fSlVNUCA9IFs2LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9GQUxMID0gWzUsIDNdO1xuY29uc3QgQU5JTUFUSU9OX0RJRSA9IFswLCA4XTtcblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuXG4gICAgICAgIHRoaXMuaW5wdXRzID0gbmV3IGlucHV0cy5QbGF5ZXJJbnB1dHM7XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcblxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzLlNUQVRFX05PUk1BTDtcbiAgICAgICAgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gMTtcbiAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gMTtcbiAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gNDtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG5cbiAgICAgICAgLy8gdGltZXJzXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IH5+KHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgLyBBTklNQVRJT05fU0xPV0RPV04pO1xuICAgICAgICBjb25zdCByb3cgPSAyICogdGhpcy5zcHJpdGVfcm93ICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzcHJpdGVzLnNwcml0ZXNTaGVldC5jYW52YXMsXG4gICAgICAgICAgICAxNiAqIGluZGV4LCAxNiAqIHJvdyxcbiAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgIHRoaXMueCAtIDQsIHRoaXMueSAtIDIsXG4gICAgICAgICAgICAxNiwgMTYpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICs9IDE7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgJT0gdGhpcy5uYl9zcHJpdGVzICogQU5JTUFUSU9OX1NMT1dET1dOO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jYW5CZUNsaW1iZWQgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiB0aGlzLnggPT09IHNvbGlkLnggKyBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBsYXllciBpcyBodWdnaW5nIGEgd2FsbFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IGNvbnN0YW50cy5KVU1QX0dSQUNFX1RJTUU7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gY29uc3RhbnRzLlNUQVRFX0RBU0ggfHwgdGhpcy5kYXNoU3BlZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMudXBkYXRlQW5pbWF0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5tb3ZlWCh0aGlzLnNwZWVkWCAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFggPSAwKTtcbiAgICAgICAgdGhpcy5tb3ZlWSh0aGlzLnNwZWVkWSAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFkgPSAwKTtcblxuICAgICAgICAvLyBpbnRlcmFjdCB3aXRoIG9iamVjdHNcbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuc2NlbmUuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHMoZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uQ29udGFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55ID49IHRoaXMuc2NlbmUuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZHlpbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3Bhd24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBIZWxkICYmIHRoaXMudGltZXJzLnZhckp1bXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFksIC1jb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyICYmXG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPD0gMCAmJlxuICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzIHx8IHRoaXMuaW5wdXRzLnlBeGlzKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhc2hTcGVlZCA9IHRoaXMuaW5wdXRzLnhBeGlzICYmIHRoaXMuaW5wdXRzLnlBeGlzID8gY29uc3RhbnRzLkRBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuREFTSF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IHRoaXMuaW5wdXRzLnhBeGlzICogTWF0aC5tYXgoTWF0aC5hYnModGhpcy5zcGVlZFgpLCBkYXNoU3BlZWQpO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gLXRoaXMuaW5wdXRzLnlBeGlzICogZGFzaFNwZWVkO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9EQVNIKTtcbiAgICAgICAgICAgIHRoaXMubmJEYXNoZXMgLT0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkge1xuICAgICAgICBsZXQgZGlkSnVtcCA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgdGhpcy50aW1lcnMuanVtcEdyYWNlID4gMCkge1xuICAgICAgICAgICAgLy8gcmVndWxhciBqdW1wXG4gICAgICAgICAgICB0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gdGhpcy5pbnB1dHMueEF4aXMgKiBjb25zdGFudHMuSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaWRKdW1wKSB7XG4gICAgICAgICAgICBsZXQgbXggPSAwO1xuICAgICAgICAgICAgbGV0IG15ID0gMDtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5jYXJyeWluZ1NvbGlkcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN4ID0gc29saWQuZ2V0TW9tZW50dW1YKCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3kgPSBzb2xpZC5nZXRNb21lbnR1bVkoKTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3gpID4gTWF0aC5hYnMobXgpKSBteCA9IHN4O1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeSkgPiBNYXRoLmFicyhteSkpIG15ID0gc3k7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogbXg7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogbXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZEp1bXA7XG4gICAgfVxuXG4gICAgdXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IHRoaXMuaW5wdXRzLnhBeGlzO1xuXG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQ0xJTUJfVVBfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5NQVhfRkFMTF9TUEVFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVBbmltYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9SVU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSlVNUCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXRlKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gbGVhdmUgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChuZXdTdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGVudGVyIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV047XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSBjb25zdGFudHMuREFTSF9USU1FICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gY29uc3RhbnRzLkRZSU5HX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gY29uc3RhbnRzLkJPVU5DRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1ha2VUcmFuc2l0aW9uKHRyYW5zaXRpb24pIHtcbiAgICAgICAgLy8gdmFsaWRhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuc2NlbmUucmVtb3ZlRWxlbWVudChzdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzLmFkZChzdHJhd2JlcnJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNjZW5lLnNldFBsYXllcih1bmRlZmluZWQpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNldFBsYXllcih0aGlzKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5zcGF3blBvaW50SW5kZXggPSB0cmFuc2l0aW9uLnNwYXduUG9pbnRJbmRleDtcbiAgICB9XG5cbiAgICBkaWUoKSB7XG4gICAgICAgIC8vIHJlYWN0aXZhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREVBRCk7XG4gICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9ESUUpO1xuICAgIH1cblxuICAgIHJlc3Bhd24oKSB7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5zY2VuZS5zcGF3blBvaW50c1t0aGlzLnNjZW5lLnNwYXduUG9pbnRJbmRleF07XG4gICAgICAgIHRoaXMueCA9IHBvaW50Lng7XG4gICAgICAgIHRoaXMueSA9IHBvaW50LnkgLSA2O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICB9XG5cbiAgICByZXN0b3JlRGFzaCgpIHtcbiAgICAgICAgaWYgKHRoaXMubmJEYXNoZXMgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzcXVpc2goKSB7XG4gICAgICAgIHRoaXMuZGllKCk7XG4gICAgfVxuXG4gICAgaXNSaWRpbmcoc29saWQpIHtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmlzUmlkaW5nKHNvbGlkKSB8fFxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkgJiZcbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiBzb2xpZC54ID09PSB0aGlzLnggKyB0aGlzLndpZHRoKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgc2V0QW5pbWF0aW9uKHNwcml0ZV9yb3csIG5iX3Nwcml0ZXMpIHtcbiAgICAgICAgaWYgKHNwcml0ZV9yb3cgIT09IHRoaXMuc3ByaXRlX3Jvdykge1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gc3ByaXRlX3JvdztcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gbmJfc3ByaXRlcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXIsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbmNsYXNzIFNjZW5lIHtcbiAgICBjb25zdHJ1Y3Rvcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaWR0aCBvZiB0aGUgU2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWlnaHQgb2YgdGhlIHNjZW5lIGluIHBpeGVsc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuc2Nyb2xsWCA9IDA7XG4gICAgICAgIHRoaXMuc2Nyb2xsWSA9IFUgLyAyO1xuICAgICAgICB0aGlzLnNvbGlkcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5hY3RvcnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuZGVjb3JhdGlvbnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKGRhdGEud2lkdGggKiBVLCBkYXRhLmhlaWdodCAqIFUpO1xuICAgICAgICAvLyBtYWtlIHdhbGxzXG4gICAgICAgIGNvbnN0IHdhbGxzID0gW1xuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKDAsIC0xLjUgKiBVLCBkYXRhLndpZHRoICogVSwgMCksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoLS41ICogVSwgMCwgMCwgZGF0YS5oZWlnaHQgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgoZGF0YS53aWR0aCArIC41KSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IHdhbGwgb2Ygd2FsbHMpIHtcbiAgICAgICAgICAgIHdhbGwuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgICAgICAgICBzY2VuZS5hZGRTb2xpZCh3YWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1haW5MYXllciA9IGRhdGEubGF5ZXJzLmZpbmQobCA9PiBsLm5hbWUgPT09ICdtYWluJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWFpbkxheWVyLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gbWFpbkxheWVyLmRhdGFbaV07XG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0gKGkgJSBtYWluTGF5ZXIud2lkdGgpICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gfn4oaSAvIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGVEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiAoaW5kZXggLSAxKSAlIDgsXG4gICAgICAgICAgICAgICAgICAgIHk6IH5+KChpbmRleCAtIDEpIC8gOCksXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0WDogMCxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRZOiAwLFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGluZGV4IC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMiwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuc3Bhd25Qb2ludHMucHVzaCh7eDogeCwgeTogeX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDU6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwaWtlc1VwKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQyOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcGlrZXNEb3duKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjA6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLkhhemFyZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCArIFUgLyAyLCB5ICsgVSAvIDIsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLkNydW1ibGluZ0Jsb2NrKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3ByaW5nKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuZTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBlbGVtZW50LnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgYWN0b3IudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICBhY3Rvci5hZnRlclVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZGVjb3JhdGlvbiBvZiB0aGlzLmRlY29yYXRpb25zKSB7XG4gICAgICAgICAgICBkZWNvcmF0aW9uLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIHZpZXdcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA+IC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2lkdGggLSBjb25zdGFudHMuVklFV19XSURUSCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA8IC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA+IC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAtIGNvbnN0YW50cy5WSUVXX0hFSUdIVCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFkgPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgVSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRpb24gb2YgdGhpcy5kZWNvcmF0aW9ucykge1xuICAgICAgICAgICAgZGVjb3JhdGlvbi5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWN0b3IocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZEVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmFkZChlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuZGVsZXRlKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTY2VuZSxcbn1cbiIsImNvbnN0IHNwcml0ZXNTaGVldCA9IHt9O1xuXG5mdW5jdGlvbiByYW5nZShuKSB7XG4gICAgcmV0dXJuIG5ldyBBcnJheShuKS5maWxsKDApLm1hcCgoeCwgaSkgPT4gaSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVNwcml0ZXMoKSB7XG4gICAgc3ByaXRlc1NoZWV0LmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHNwcml0ZXNTaGVldC5jb250ZXh0ID0gc3ByaXRlc1NoZWV0LmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4gYWRkU3ByaXRlcyhpbWcpKTtcbiAgICBpbWcuc3JjID0gXCJpbWFnZXMvaGVyb19zcHJpdGVzLnBuZ1wiO1xufVxuXG5cbmZ1bmN0aW9uIGFkZFNwcml0ZXMoaW1hZ2UpIHtcbiAgICBzcHJpdGVzU2hlZXQuY2FudmFzLndpZHRoID0gaW1hZ2Uud2lkdGg7XG4gICAgc3ByaXRlc1NoZWV0LmNhbnZhcy5oZWlnaHQgPSAyICogaW1hZ2UuaGVpZ2h0O1xuXG4gICAgZm9yIChsZXQgaSBvZiByYW5nZShpbWFnZS5oZWlnaHQgLyAxNikpIHtcbiAgICAgICAgZm9yIChsZXQgaiBvZiByYW5nZShpbWFnZS53aWR0aCAvIDE2KSkge1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAxNiAqIGosIDE2ICogaSwgMTYsIDE2LCAxNiAqIGosIDE2ICogMiAqIGksIDE2LCAxNik7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5zY2FsZSgtMSwgMSk7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDE2ICogaiwgMTYgKiBpLCAxNiwgMTYsIC0xNiAqIChqKzEpLCAxNiAqICgyICogaSArIDEpLCAxNiwgMTYpO1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0LmNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1ha2VTcHJpdGVzKCk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzcHJpdGVzU2hlZXQsXG59OyJdfQ==
