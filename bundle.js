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


class Effect {
    constructor(duration, count = 1) {
        this.duration = duration;
        this.timer = 0;
        this.count = count;
        this.remainingCount = count;
    }

    update(deltaTime, element) {
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


class EffectSequence extends Effect {
    constructor(effects, count = 1) {
        super(undefined, count);
        this.effects = effects;
        this.index = 0;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        while (this.remainingCount && deltaTime > 0) {
            this.effects[this.index].update(deltaTime, element);
            deltaTime = this.effects[this.index].timer - this.effects[this.index].duration;
            if (deltaTime > 0) {
                this.index += 1;
                if (this.index >= this.effects.length) {
                    this.index = 0;
                    this.remainingCount -= 1;
                }
                this.effects[this.index].reset();
            }
        }
    }

    reset() {
        super.reset();
        this.index = 0;
        for (const effect of this.effects) {
            effect.reset();
        }
    }
}


class LinearMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.mx = (x2 - x1) / duration;
        this.my = (y2 - y1) / duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer < this.duration) {
            const r = this.timer / this.duration;
            element.moveTo((1 - r) * this.x1 + r * this.x2, (1 - r) * this.y1 + r * this.y2);
            element.setMomentum(this.mx, this.my);
        } else {
            element.moveTo(this.x2, this.y2);
        }
    }
}


class SineMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.duration = duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer < this.duration) {
            const angle = this.timer * 2 * Math.PI / this.duration;
            const ratio = (Math.cos(angle) + 1) / 2;
            element.moveTo(ratio * this.x1 + (1 - ratio) * this.x2, ratio * this.y1 + (1 - ratio) * this.y2);
            const dratio = Math.PI * Math.sin(angle) / this.duration;
            const mx = dratio * (this.x2 - this.x1);
            const my = dratio * (this.y2 - this.y1);
            element.setMomentum(mx, my);
        } else {
            element.moveTo(this.x1, this.y1);
        }
    }
}


module.exports = {
    Effect,
    EffectSequence,
    LinearMovement,
    SineMovement,
}
},{}],3:[function(require,module,exports){
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
            (gamepad && gamepad.buttons[this.gamepadmap.left].pressed) ||
            (gamepad && gamepad.axes[0] < -.2)) {
            this.xAxis -= 1;
        }
        if (pressedKeys.has(this.keymap.right) ||
            (gamepad && gamepad.buttons[this.gamepadmap.right].pressed) ||
            (gamepad && gamepad.axes[0] > .2)){
            this.xAxis += 1;
        }
        if (pressedKeys.has(this.keymap.up) ||
            (gamepad && gamepad.buttons[this.gamepadmap.up].pressed) ||
            (gamepad && gamepad.axes[1] < -.2)) {
            this.yAxis += 1;
        }
        if (pressedKeys.has(this.keymap.down) ||
            (gamepad && gamepad.buttons[this.gamepadmap.down].pressed) ||
            (gamepad && gamepad.axes[1] > .2)) {
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

},{}],4:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const inputs = require('./inputs');
const player = require('./player');
const sound = require('./sound');
const maps = require('./maps');

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
    sound.playSound(sound.music);
    update();
}


function stop() {
    isRunning = false;
    music.stop();
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

    // Prepare button
    document.getElementById("start-button").addEventListener("click", e => {
        e.target.hidden = true;
        start();
    });

    // load all scenes and start game
    maps.loadScenes.then(() => {
        currentScene = maps.scenes.CELESTE_01;
        currentScene.spawnPointIndex = 1;
        currentScene.setPlayer(new player.Player());
        currentScene.reset();
        document.getElementById("start-button").removeAttribute("disabled");
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

},{"./constants":1,"./inputs":3,"./maps":5,"./player":7,"./sound":9}],5:[function(require,module,exports){
"use strict"
const scene = require('./scene');
const effect = require('./effect');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;

const scenes = {};


function makeTransitionUp(scene1, x1, index1, scene2, x2, index2, width) {
    scene1.addThing(new physics.Transition(x1 * U, -U, width * U, 0, scene2, x2 * U, scene2.height - 3 * U, index2));
    scene2.addThing(new physics.Transition(x2 * U, scene2.height, width * U, 0, scene1, x1 * U, 2 * U, index1));
}


function makeTransitionRight(scene1, y1, index1, scene2, y2, index2, height) {
    scene1.addThing(new physics.Transition(scene1.width, y1 * U, 0, height * U, scene2, U, y2 * U, index2));
    scene2.addThing(new physics.Transition(0, y2 * U, 0, height * U, scene1, scene1.width - U, y1 * U, index1));
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
        fetch("tilemaps/louis05.json").then(response => response.json()),
        fetch("tilemaps/louis06.json").then(response => response.json()),
        fetch("tilemaps/louis07.json").then(response => response.json()),
        fetch("tilemaps/louis08.json").then(response => response.json()),

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
            "LOUIS_04",
            "LOUIS_05",
            "LOUIS_06",
            "LOUIS_07",
            "LOUIS_08",
        ];
        for (let i = 0; i < sceneNames.length; i++) {
            scenes[sceneNames[i]] = scene.Scene.fromJSON(responses[i]);
        }

        {
            // CELESTE_04
            scenes.CELESTE_04.addSolid(new physics.TriggerBlock(14 * U, 10 * U, 3 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(14 * U, 10 * U, 23 * U, 9 * U, .5),
                new effect.Effect(1),
                new effect.LinearMovement(23 * U, 9 * U, 14 * U, 10 * U, 1.5),
            ])));
        }

        {
            // CELESTE_06
            scenes.CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, 33 * U, 4 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(13 * U, 33 * U, 13 * U, 23 * U, .45),
                new effect.Effect(1),
                new effect.LinearMovement(13 * U, 23 * U, 13 * U, 33 * U, 1.5),
            ])));
        }

        {
            // CELESTE_08
            scenes.CELESTE_08.addSolid(new physics.TriggerBlock(14 * U, 16 * U, 2 * U, 3 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(14 * U, 16 * U, 21 * U, 12 * U, .5),
                new effect.Effect(1),
                new effect.LinearMovement(21 * U, 12 * U, 14 * U, 16 * U, 2),
            ])));
        }


        {
            // CELESTE_14
            scenes.CELESTE_14.addSolid(new physics.TriggerBlock(11 * U, 29 * U, 4 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(11 * U, 29 * U, 19 * U, 29 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(19 * U, 29 * U, 11 * U, 29 * U, 1.5),
            ])));

            scenes.CELESTE_14.addSolid(new physics.TriggerBlock(26 * U, 28 * U, 5 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(26 * U, 28 * U, 26 * U, 22 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(26 * U, 22 * U, 26 * U, 28 * U, 1.5),
            ])));
        }

        {
            // CELESTE_15
            const triggerBlock = new physics.TriggerBlock(24 * U, 6 * U, 2 * U, 7 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(24 * U, 6 * U, 24 * U, 17 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(24 * U, 17 * U, 24 * U, 6 * U, 1.5),
            ]));
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U, new physics.TileData(40));
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U, new physics.TileData(40));
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addThing(spikes1);
            scenes.CELESTE_15.addThing(spikes2);

            scenes.CELESTE_15.addSolid(new physics.TriggerBlock(15 * U, 20 * U, 2 * U, 4 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(15 * U, 20 * U, 9 * U, 20 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(9 * U, 20 * U, 15 * U, 20 * U, 1.5),
            ])));
        }

        {
            // LOUIS_06
            scenes.LOUIS_06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.LOUIS_08, U, 13 * U, 0));
            scenes.LOUIS_08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.LOUIS_06, 10 * U, 15 * U, 1));

        }

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
        makeTransitionUp(scenes.LOUIS_05, 33, 0, scenes.LOUIS_06, 1, 1, 5);
        makeTransitionRight(scenes.LOUIS_06, 8, 0, scenes.LOUIS_07, 8, 1, 6);

        resolve();
    });
});


module.exports = {
    scenes,
    loadScenes,
}

},{"./constants":1,"./effect":2,"./physics":6,"./scene":8}],6:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const sound = require('./sound');

const U = constants.GRID_SIZE;

/**
 * Tiles sheet
 * @type {HTMLImageElement}
 */
const tileset = new Image();
tileset.src = 'tilemaps/tileset.png';


/**
 * Information about the tile to be used when representing an element of the scene
 */
class TileData {
    constructor(index, shiftX = 0, shiftY = 0) {
        /**
         * Index of the tile in the tileset
         * @type {number}
         */
        this.index = index;
        /**
         * x-position of the tile in the tileset
         * @type {number}
         */
        this.x = this.index % 8;
        /**
         * y-position of the tile in the tileset
         * @type {number}
         */
        this.y = this.index >> 3;
        /**
         * x-offset to draw the tile from the SceneElement's position
         * @type {number}
         */
        this.shiftX = shiftX;
        /**
         * y-offset to draw the tile from the SceneElement's position
         * @type {number}
         */
        this.shiftY = shiftY;
    }
}


/**
 * Tests whether two segments on a 1D line overlap.
 *
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
 * SceneElements are the superclass of all objects that appear in a scene (obstacles, platforms, players, hazards,
 * decorations, etc.)
 *
 * All Elements are represented as axis-aligned bounding boxes and the space they occupy in a scene is therefore defined
 * as a position (x, y) and a size (width, height). At all times, positions and sizes should be integers. Sub-integer
 * positions are considered with the use of the `xRemainder` and `yRemainder` attributes (that should have an absolute
 * value < 1)
 */
class SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        /**
         * x-coordinate of the leftmost side of the bounding box (in pixels)
         * @type {number}
         */
        this.x = x;
        /**
         * y-coordinate of the leftmost side of the bounding box (in pixels)
         * @type {number}
         */
        this.y = y;
        /**
         * initial x-coordinate (used for reset())
         */
        this.startX = x;
        /**
         * initial y-coordinate (used for reset())
         */
        this.startY = y;
        /**
         * width of the SceneElement (in pixels)
         * @type {number}
         */
        this.width = width;
        /**
         * height of the SceneElement (in pixels)
         * @type {number}
         */
        this.height = height;
        /**
         * fractional part of the x-position of the SceneElement (position of an element should always be an integer,
         * but fractional parts of the computed position can be remembered for next move)
         * @type {number}
         */
        this.xRemainder = 0;
        /**
         * fractional part of the y-position of the SceneElement (position of an element should always be an integer,
         * but fractional parts of the computed position can be remembered for next move)
         * @type {number}
         */
        this.yRemainder = 0;
        /**
         * Amount moved on the x-axis since last update
         * (reset by beforeUpdate(), incremented automatically by this.move())
         * @type {number}
         */
        this.movedX = 0;
        /**
         * Amount moved on the y-axis since last update
         * (reset by beforeUpdate(), incremented automatically by this.move())
         * @type {number}
         */
        this.movedY = 0;
        /**
         * Whether the SceneElement should be considered by the Engine or not (inactive SceneElements are ignored when
         * interactions are computed)
         * @type {boolean}
         */
        this.isActive = true;
        /**
         * Information about the tile used to represent the SceneElement (if represented by a single tile)
         * @type {undefined}
         */
        this.tileData = tileData;
        /**
         * Current effects applied to the SceneElement
         * @type {[Effect]}
         */
        this.effects = [];
        /**
         * Scene in which the SceneElement is included
         * @type {undefined}
         */
        this.scene = undefined;
        /**
         * Dictionary of timers (numbers) that are automatically decremented at each update
         * @type {{number}}
         */
        this.timers = {};
        /**
         * Set of SceneElements that are attached to the SceneElement
         * Whenever `this` is moved, all attached Elements will also be moved by the same amount
         *
         * Warning: Because of the special constraints on Actor positions, Actors should not be attached to a
         * SceneElement. The particular case of Actors "riding" a Solid is handled separately in the Solid.move()
         * method.
         * @type {Set<SceneElement>}
         */
        this.attachedElements = new Set();
    }

    /**
     * Returns true if the bounding rectangle of `this` overlaps the bounding rectangle of `other`.
     *
     * Two SceneElements overlap if for both dimensions the end position of each SceneElement is strictly greater than
     * the start position of the other.
     *
     * @param other {SceneElement}
     * @returns {boolean|boolean}
     */
    overlaps(other) {
        return (this.x + this.width > other.x &&
            other.x + other.width > this.x &&
            this.y + this.height > other.y &&
            other.y + other.height > this.y);
    }

    /**
     * Draws the SceneElement in the Canvas associated to the Context given as argument
     * @param ctx {CanvasRenderingContext2D} context of the canvas in which the SceneElement is drawn
     */
    draw(ctx) {
        if (this.tileData !== undefined) {
            ctx.drawImage(
                tileset,
                16 * this.tileData.x, 16 * this.tileData.y,
                16, 16,
                this.x + this.tileData.shiftX, this.y + this.tileData.shiftY,
                8, 8);
        }
    }

    /**
     * Reset properties at the start of a new update of the Scene
     */
    beforeUpdate() {
        this.movedX = 0;
        this.movedY = 0;
    }

    /**
     * Update the state of the SceneElement (called at each frame when the Scene is active)
     * @param deltaTime {number} time elapsed since last update (in seconds)
     */
    update(deltaTime) {
        // update timers
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        // update effects
        for (const effect of this.effects) {
            effect.update(deltaTime, this);
        }
    }

    /**
     * Moves the SceneElement by a given amount
     * @param dx {number} number of pixels to move right
     * @param dy {number} number of pixels to move down
     */
    move(dx, dy) {
        // move all elements attached to this
        for (const thing of this.attachedElements) {
            thing.move(dx, dy);
        }

        // change position
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        this.xRemainder -= moveX;
        this.x += moveX;
        this.movedX += moveX;
        this.yRemainder -= moveY;
        this.y += moveY;
        this.movedY += moveY;
    }

    /**
     * Move the Scene Element to a given position
     * @param x {number} x-coordinate of the target position
     * @param y {number} y-coordinate of the target position
     */
    moveTo(x, y) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder);
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.isActive = true;
        for (const timer in this.timers) {
            this.timers[timer] = 0;
        }
        this.effects.length = 0;    // clear all effects
    }

    addEffect(effect) {
        this.effects.push(effect);
        return this;
    }

    removeEffect(effect) {
        const index = this.effects.indexOf(effect);
        if (index !== -1) {
            this.effects.splice(index, 1);
        }
        return this;
    }

    /**
     * Attaches a given SceneElement to this
     * @param element {SceneElement} the SceneElement to attach
     */
    attach(element) {
        this.attachedElements.add(element);
    }

    /**
     * Detaches a given SceneElement to this
     * @param element {SceneElement} the SceneElement to detach
     */
    detach(elements) {
        this.attachedElements.delete(element);
    }
}


/**
 * Actors are SceneElements in a Scene that cannot pass through Solids (player characters and enemies for instance)
 */
class Actor extends SceneElement {
    constructor(x, y, width, height) {
        super(x, y, width, height);
    }

    /**
     * Move the Actor a given amount on the x-axis
     *
     * This method tries to move the Actor by the given amount on the x-axis but stops if there is a collision with a
     * Solid (the position is set immediately before the overlap with the Solid). If there was a collision, the function
     * given as parameter is called.
     *
     * @param amount {number} amount to move on the x-axis
     * @param onCollide {function()} function to run if the Actor collides with a Solid
     */
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
                this.movedX += dx;      // if movement was stopped by a Solid, moved distance is an integer
            } else {
                this.movedX += amount;  // if movement was not stopped, moved distance might be fractional
            }
        } else {
            this.movedX += amount;  // movement that is insufficient to move by a pixel is still counted
        }
    }

    /**
     * Move the Actor a given amount on the y-axis
     *
     * This method tries to move the Actor by the given amount on the y-axis but stops if there is a collision with a
     * Solid (the position is set immediately before the overlap with the Solid). If there was a collision, the function
     * given as parameter is called.
     *
     * @param amount {number} amount to move on the x-axis
     * @param onCollide {function()} function to run if the Actor collides with a Solid
     */
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
                this.movedY += dy;      // if movement was stopped by a Solid, moved distance is an integer
            } else {
                this.movedY += amount;  // if movement was not stopped, moved distance might be fractional
            }
        } else {
            this.movedY += amount;  // movement that is insufficient to move by a pixel is still counted
        }
    }

    /**
     * Returns true if the Actor is currently "riding" the Solid given as parameter, meaning that when the Solid
     * moves it should move the Actor too.
     * An Actor is considered to be riding a Solid it is standing directly on top of it.
     *
     * @param solid {Solid}
     * @returns {boolean} true if the Actor is riding the solid
     */
    isRiding(solid) {
        return this.y + this.height === solid.y && segmentsOverlap(this.x, this.width, solid.x, solid.width);
    }

    /**
     * Method to call when the Actor collides with a Solid while being pushed by another
     */
    squish() {}
}


/**
 * Solids are SceneElements that Actors cannot pass through. There should never be an Actor overlapping a Solid (unless
 * either one is marked as inactive). When Solids move, they interact with Actors that might otherwise overlap (they
 * might push them, kill them, etc.).
 *
 * Two Solids might overlap, and in general the movement of a Solid is not affected by other Solids.
 */
class Solid extends SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
        /**
         * Whether the Solid should be considered when checking collisions with an Actor
         * This attribute is used automatically by the move() method when the Solid pushes an Actor. It should not be
         * changed in other circumstances (use isActive to disable the Solid).
         * @type {boolean}
         */
        this.collidable = true;
        /**
         * Momentum on the x-axis given to Actors riding the Solid (in pixels/s)
         * @type {number}
         */
        this.momentumX = 0;
        /**
         * Momentum on the y-axis given to Actors riding the Solid (in pixels/s)
         * @type {number}
         */
        this.momentumY = 0;
        /**
         * Timer used to store momentum for a few frames after the Solid stops moving
         * @type {number}
         */
        this.timers.momentum = 0;
        /**
         * Whether a Player character can climb on (or slowly slide against) the sides of the Solid
         * @type {boolean}
         */
        this.canBeClimbed = true;
    }

    /**
     * @returns {number} the momentum of the solid on the x-axis if the momentum counter has not expired (0 otherwise)
     */
    getMomentumX() {
        if (this.timers.momentum > 0) {
            return this.momentumX;
        }
        return 0;
    }

    /**
     * @returns {number} the momentum of the solid on the x-axis if the momentum counter has not expired (0 otherwise)
     */
    getMomentumY() {
        if (this.timers.momentum > 0) {
            return this.momentumY;
        }
        return 0;
    }

    move(dx, dy) {
        for (const thing of this.attachedElements) {
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
                this.movedX += moveX;

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
                this.movedY += moveY;

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

    /**
     * Returns true if the Solid is considered to collide with an Actor moving by a given amount in both axes.
     *
     * To simplify the computation, the function checks if the bounding box of the solid overlaps with the smallest
     * rectangle containing the areas occupied by the Actor at the start and end of its movement.
     *
     * @param actor {Actor}
     * @param dx {number} amount traveled by the Actor on the x-axis from its current position
     * @param dy {number} amount traveled by the Actor on the y-axis from its current position
     * @returns {boolean} whether the Solid overlaps the Actor at any point during its movement
     */
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


/**
 * Hazards are SceneElements that kill the player on contact
 */
class Hazard extends SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


/**
 * Platforms are flat Solids (0 height) that Actors can pass through when moving upwards but not downwards (if they are
 * entirely higher than the Platform)
 *
 * Contrary to regular Solids, Platforms are allowed to overlap with Actors.
 */
class Platform extends Solid {
    constructor(x, y, width, tileData) {
        super(x, y, width, 0, tileData);
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
}


/**
 * Springs are SceneElements that throw Actors up on contact
 */
class Spring extends SceneElement {
    constructor(x, y, tileData) {
        super(x, y + U / 2, U, U / 2, tileData);
        this.tileData.shiftY = -U / 2;
    }

    onContactWith(player) {
        sound.playSound(sound.springSound);
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
    }
}


/**
 * DashDiamonds are SceneElements that restore the dash counter of the Players who touch them
 */
class DashDiamond extends SceneElement {
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
            sound.playSound(sound.dashDiamondSound);
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


/**
 * Strawberries are collectibles that Player take on contact.
 * If a Player dies after collecting a Strawberry before changing Scene, the Strawberry is restored in the Scene
 * (and removed from the Player's list of collected Strawberries)
 */
class Strawberry extends SceneElement {
    constructor(x, y, tileData) {
        super(x, y, U, U, tileData);
    }

    onContactWith(player) {
        if (player.isActive) {
            sound.playSound(sound.strawberrySound);
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


/**
 * Transitions are SceneElements that transfer a Player from one Scene to another on contact
 */
class Transition extends SceneElement {
    constructor(x, y, width, height, targetScene, targetX, targetY, spawnPointIndex = 0) {
        super(x, y, width, height);
        /**
         * The Scene to which the Player is taken when touching the Transition
         * @type {Scene}
         */
        this.targetScene = targetScene;
        /**
         * x-coordinate in the target Scene corresponding to this.x (when the Player transitions to the target Scene,
         * its position is set to its current x-position + this.targetX - this.x
         * @type {number}
         */
        this.targetX = targetX;
        /**
         * y-coordinate in the target Scene corresponding to this.y (when the Player transitions to the target Scene,
         * its position is set to its current y-position + this.targetY + this.y
         * @type {number}
         */
        this.targetY = targetY;
        /**
         * The index of the spawn point (in the target Scene's list of spawn points) corresponding to the Transition
         * @type {number}
         */
        this.spawnPointIndex = spawnPointIndex;
    }

    onContactWith(player) {
        this.targetScene.reset();
        player.x += this.targetX - this.x;
        player.y += this.targetY - this.y;
        player.makeTransition(this);
        this.scene.transition = this;
    }
}


/**
 * CrumblingBlocks are Solids that disappear shortly after a Player hits it (only when the Player is considered to be
 * "carried" by the CrumblingBlock).
 * They reappear after a given time (if there are no Actors on their position)
 */
class CrumblingBlock extends Solid {
    constructor(x, y, tileData) {
        super(x, y, U, U, tileData);
        /**
         * Whether the block is disappearing
         * @type {boolean}
         */
        this.isFalling = false;
        /**
         * Timer for disappearance
         * @type {number}
         */
        this.timers.fall = 0;
        /**
         * Timer for reappearance
         * @type {number}
         */
        this.timers.cooldown = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isFalling) {
            if (this.timers.fall <= 0) {
                this.isFalling = false;
                this.isActive = false;
                this.timers.cooldown = 2;   // duration before reappearing
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
                sound.playSound(sound.crumblingBlockSound);
                this.isFalling = true;
                this.timers.fall = .5;  // duration before disappearing
            }
        }
    }

    reset() {
        super.reset();
        this.isFalling = false;
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


/**
 * TriggerBlocks are Solids that start moving when an Actor is carried by them
 */
class TriggerBlock extends Solid {
    constructor(x, y, width, height, movement) {
        super(x, y, width, height);
        /**
         * movement to execute when triggered by an Actor
         * @type {Effect}
         */
        this.triggeredMovement = movement;
        /**
         * Tile indexes to use when drawing the TriggerBlock on the Scene
         * @type {number[]}
         */
        this.spriteIndexes = new Array((width / U) * (height / U)).fill(0).map(_ => Math.floor(Math.random() * 3));
    }

    update(deltaTime) {
        super.update(deltaTime);
        const player = this.scene.player;
        if (player) {
            if (this.effects.includes(this.triggeredMovement) && this.triggeredMovement.remainingCount === 0) {
                this.removeEffect(this.triggeredMovement);
            }
            if (!this.effects.includes(this.triggeredMovement) && player.isRiding(this)) {
                this.triggeredMovement.reset();
                this.addEffect(this.triggeredMovement);
            }
        }
    }

    reset() {
        super.reset();
        this.triggeredMovement.reset();
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


/**
 * SpikesUp are Hazards that kill the Player if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y, tileData) {
        tileData.shiftY = -U / 2;
        super(x, y + U / 2, U, U / 2, tileData);
    }

    onContactWith(player) {
        if (player.movedY - this.movedY >= 0) {
            player.die();
        }
    }
}


/**
 * SpikesDown are Hazards that kill the Player if it moves upwards on them
 */
class SpikesDown extends SceneElement {
    constructor(x, y, tileData) {
        super(x, y, U, U / 2, tileData);
    }

    onContactWith(player) {
        if (player.movedY - this.movedY < 0) {
            player.die();
        }
    }
}


/**
 * SpikesRight are Hazards that kill the Player if it moves leftwards on them
 */
class SpikesRight extends SceneElement {
    constructor(x, y, tileData) {
        super(x, y, U / 2, U, tileData);
    }

    onContactWith(player) {
        if (player.movedX - this.movedX < 0) {
            player.die();
        }
    }
}


/**
 * SpikesUp are Hazards that kill the Player if it moves rightwards on them
 */
class SpikesLeft extends SceneElement {
    constructor(x, y, tileData) {
        tileData.shiftX = -U / 2;
        super(x + U / 2, y, U / 2, U, tileData);
    }

    onContactWith(player) {
        if (player.movedX - this.movedX > 0) {
            player.die();
        }
    }
}


module.exports = {
    segmentsOverlap,
    TileData,
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

},{"./constants":1,"./sound":9}],7:[function(require,module,exports){
"use strict"
const inputs = require('./inputs');
const physics = require('./physics');
const constants = require('./constants');
const sprites = require('./sprites');
const sound = require('./sound');

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

        // interact with Things
        if (this.isActive) {
            for (const thing of this.scene.things) {
                if (thing.isActive && this.overlaps(thing)) {
                    thing.onContactWith(this);
                }
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
                    this.scene.shouldReset = true;
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
                    sound.playSound(sound.jumpSound);
                    this.timers.jumpGrace = 0;
                    this.timers.varJump = constants.VAR_JUMP_TIME;
                    this.inputs.jumpPressedBuffer = false;
                    break;
                case constants.STATE_DASH:
                    sound.playSound(sound.dashSound);
                    this.timers.dashCooldown = constants.DASH_COOLDOWN;
                    this.timers.dash = constants.DASH_TIME + constants.DASH_FREEZE_TIME;
                    break;
                case constants.STATE_DEAD:
                    sound.playSound(sound.dieSound);
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
            strawberry.scene.removeThing(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        this.scene.setPlayer(undefined);
        transition.targetScene.setPlayer(this);
        transition.targetScene.spawnPointIndex = transition.spawnPointIndex;
    }

    die() {
        this.isActive = false;
        this.temporaryStrawberries.clear();
        this.setState(constants.STATE_DEAD);
        this.setAnimation(...ANIMATION_DIE);
    }

    reset() {
        super.reset();
        const point = this.scene.spawnPoints[this.scene.spawnPointIndex];
        this.x = point.x;
        this.y = point.y - 6;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.setState(constants.STATE_NORMAL);
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
},{"./constants":1,"./inputs":3,"./physics":6,"./sound":9,"./sprites":10}],8:[function(require,module,exports){
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
        this.things = new Set();
        this.spawnPoints = [];
        this.transition = undefined;
        this.player = undefined;
        this.spawnPointIndex = 0;
        this.shouldReset = false;
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
                        scene.addThing(new physics.DashDiamond(x + U / 2, y + U / 2, tileData));
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
                        scene.addThing(new physics.SpikesUp(x, y, tileData));
                        break;
                    case 41:
                        scene.addThing(new physics.SpikesRight(x, y, tileData));
                        break;
                    case 42:
                        scene.addThing(new physics.SpikesDown(x, y, tileData));
                        break;
                    case 43:
                        scene.addThing(new physics.SpikesLeft(x, y, tileData));
                        break;
                    case 49:
                    case 58:
                    case 59:
                    case 60:
                    case 61:
                        scene.addThing(new physics.Hazard(x, y, U, U, tileData));
                        break;
                    case 13:
                        scene.addThing(new physics.Strawberry(x + U / 2, y + U / 2, tileData));
                        break;
                    case 57:
                        scene.addSolid(new physics.CrumblingBlock(x, y, tileData));
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

        if (this.shouldReset) {
            this.reset();
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
        for (const thing of this.things) {
            thing.draw(ctx);
        }
        for (const solid of this.solids) {
            solid.draw(ctx);
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

},{"./constants":1,"./physics":6}],9:[function(require,module,exports){
const jumpSound = new Audio('sound/char_mad_jump.ogg');
const dashSound = new Audio('sound/char_mad_dash_pink_left.ogg');
const dieSound = new Audio('sound/char_mad_death.ogg');
const crumblingBlockSound = new Audio('sound/game_gen_fallblock_shake.ogg');
const strawberrySound = new Audio('sound/game_gen_strawberry_red_get_1up.ogg');
const dashDiamondSound = new Audio('sound/game_gen_diamond_touch_01.ogg');
const springSound = new Audio('sound/game_gen_spring.ogg');

const music = new Audio('sound/bg_music.wav');
music.loop = true;
music.volume = .5;


function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}


module.exports = {
    playSound,
    jumpSound,
    dashSound,
    dieSound,
    crumblingBlockSound,
    strawberrySound,
    dashDiamondSound,
    springSound,
    music,
}
},{}],10:[function(require,module,exports){
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwicGh5c2ljcy5qcyIsInBsYXllci5qcyIsInNjZW5lLmpzIiwic291bmQuanMiLCJzcHJpdGVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Q5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBGcm9tIENlbGVzdGUgc291cmNlIGNvZGVcbmNvbnN0IE1BWF9SVU5fU1BFRUQgPSA5MDtcbmNvbnN0IFJVTl9BQ0NFTEVSQVRJT04gPSAxMDAwO1xuY29uc3QgUlVOX0RFQ0VMRVJBVElPTiA9IDQwMDtcbmNvbnN0IEFJUl9GQUNUT1IgPSAuNjU7XG5jb25zdCBKVU1QX1NQRUVEID0gMTA1O1xuY29uc3QgSlVNUF9IT1JJWk9OVEFMX0JPT1NUID0gNDA7XG5jb25zdCBNQVhfRkFMTF9TUEVFRCA9IDE2MDtcbmNvbnN0IEdSQVZJVFkgPSA5MDA7XG5jb25zdCBKVU1QX0dSQUNFX1RJTUUgPSAuMTtcbmNvbnN0IFZBUl9KVU1QX1RJTUUgPSAuMjtcbmNvbnN0IENMSU1CX1VQX1NQRUVEID0gNDU7XG5jb25zdCBDTElNQl9TTElQX1NQRUVEID0gMzA7XG5jb25zdCBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UgPSAzO1xuY29uc3QgV0FMTF9KVU1QX0hTUEVFRCA9IE1BWF9SVU5fU1BFRUQgKyBKVU1QX0hPUklaT05UQUxfQk9PU1Q7XG5jb25zdCBEQVNIX1NQRUVEID0gMjQwO1xuY29uc3QgRU5EX0RBU0hfU1BFRUQgPSAxNjA7XG5jb25zdCBFTkRfREFTSF9VUF9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX1RJTUUgPSAuMTU7XG5jb25zdCBEQVNIX0NPT0xET1dOID0gLjI7XG5cbi8vIE90aGVyIGNvbnN0YW50c1xuY29uc3QgTU9NRU5UVU1fU1RPUkVfVElNRSA9IC4xO1xuY29uc3QgTU9NRU5UVU1fRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9GUkVFWkVfVElNRSA9IC4wNTtcbmNvbnN0IEJPVU5DRV9USU1FID0gLjI7XG5jb25zdCBCT1VOQ0VfU1BFRUQgPSAxODA7XG5jb25zdCBEWUlOR19USU1FID0gLjg7XG5jb25zdCBTVEFURV9OT1JNQUwgPSAwO1xuY29uc3QgU1RBVEVfSlVNUCA9IDE7XG5jb25zdCBTVEFURV9EQVNIID0gMjtcbmNvbnN0IFNUQVRFX0RFQUQgPSAzO1xuY29uc3QgU1RBVEVfQk9VTkNFID0gNDtcblxuY29uc3QgR1JJRF9TSVpFID0gODtcbmNvbnN0IFZJRVdfV0lEVEggPSAzMjA7XG5jb25zdCBWSUVXX0hFSUdIVCA9IDE4MDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTUFYX1JVTl9TUEVFRCxcbiAgICBSVU5fQUNDRUxFUkFUSU9OLFxuICAgIFJVTl9ERUNFTEVSQVRJT04sXG4gICAgQUlSX0ZBQ1RPUixcbiAgICBKVU1QX1NQRUVELFxuICAgIEpVTVBfSE9SSVpPTlRBTF9CT09TVCxcbiAgICBNQVhfRkFMTF9TUEVFRCxcbiAgICBHUkFWSVRZLFxuICAgIEpVTVBfR1JBQ0VfVElNRSxcbiAgICBWQVJfSlVNUF9USU1FLFxuICAgIENMSU1CX1VQX1NQRUVELFxuICAgIENMSU1CX1NMSVBfU1BFRUQsXG4gICAgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFLFxuICAgIFdBTExfSlVNUF9IU1BFRUQsXG4gICAgREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9VUF9GQUNUT1IsXG4gICAgREFTSF9USU1FLFxuICAgIERBU0hfQ09PTERPV04sXG4gICAgTU9NRU5UVU1fU1RPUkVfVElNRSxcbiAgICBNT01FTlRVTV9GQUNUT1IsXG4gICAgREFTSF9GUkVFWkVfVElNRSxcbiAgICBCT1VOQ0VfVElNRSxcbiAgICBCT1VOQ0VfU1BFRUQsXG4gICAgRFlJTkdfVElNRSxcbiAgICBTVEFURV9OT1JNQUwsXG4gICAgU1RBVEVfSlVNUCxcbiAgICBTVEFURV9EQVNILFxuICAgIFNUQVRFX0RFQUQsXG4gICAgU1RBVEVfQk9VTkNFLFxuICAgIEdSSURfU0laRSxcbiAgICBWSUVXX1dJRFRILFxuICAgIFZJRVdfSEVJR0hULFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbmNsYXNzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHRoaXMudGltZXIgKz0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAmJiB0aGlzLnJlbWFpbmluZ0NvdW50ICYmIHRoaXMudGltZXIgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1haW5pbmdDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgfVxufVxuXG5cbmNsYXNzIEVmZmVjdFNlcXVlbmNlIGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihlZmZlY3RzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMuZWZmZWN0cyA9IGVmZmVjdHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS50aW1lciAtIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMuZWZmZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICB0aGlzLm15ID0gKHkyIC0geTEpIC8gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy50aW1lciAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0TW9tZW50dW0odGhpcy5teCwgdGhpcy5teSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngyLCB0aGlzLnkyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTaW5lTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8ocmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLCByYXRpbyAqIHRoaXMueTEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueTIpO1xuICAgICAgICAgICAgY29uc3QgZHJhdGlvID0gTWF0aC5QSSAqIE1hdGguc2luKGFuZ2xlKSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCBteCA9IGRyYXRpbyAqICh0aGlzLngyIC0gdGhpcy54MSk7XG4gICAgICAgICAgICBjb25zdCBteSA9IGRyYXRpbyAqICh0aGlzLnkyIC0gdGhpcy55MSk7XG4gICAgICAgICAgICBlbGVtZW50LnNldE1vbWVudHVtKG14LCBteSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFZmZlY3QsXG4gICAgRWZmZWN0U2VxdWVuY2UsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXNzZWRCdXR0b25zID0gbmV3IFNldCgpO1xubGV0IGdhbWVwYWRQcmVzc2VkQnV0dG9ucyA9IFtdO1xuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmdhbWVwYWRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZG1hcCA9IHtcbiAgICAgICAgICAgIGp1bXA6IDAsXG4gICAgICAgICAgICBkYXNoOiAxLFxuICAgICAgICAgICAgdXA6IDEyLFxuICAgICAgICAgICAgZG93bjogMTMsXG4gICAgICAgICAgICBsZWZ0OiAxNCxcbiAgICAgICAgICAgIHJpZ2h0OiAxNSxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtleW1hcCA9IHtcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHVwOiAnQXJyb3dVcCcsXG4gICAgICAgICAgICBkb3duOiAnQXJyb3dEb3duJyxcbiAgICAgICAgICAgIGp1bXA6ICdnJyxcbiAgICAgICAgICAgIGRhc2g6ICdmJyxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpbWVycyA9IHtcbiAgICAgICAgICAgIGp1bXBCdWZmZXI6IDAsXG4gICAgICAgICAgICBkYXNoQnVmZmVyOiAwLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHVwZGF0ZUdhbWVwYWQoKSB7XG4gICAgICAgIHByZXNzZWRCdXR0b25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVwYWQuYnV0dG9uczsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tqXS5wcmVzc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXNzZWRCdXR0b25zLmFkZChqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIC8vIHRoaXMudXBkYXRlR2FtZXBhZCgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5sZWZ0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5sZWZ0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdIDwgLS4yKSkge1xuICAgICAgICAgICAgdGhpcy54QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAucmlnaHQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLnJpZ2h0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdID4gLjIpKXtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYXhlc1sxXSA8IC0uMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmF4ZXNbMV0gPiAuMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmV2SnVtcCA9IHRoaXMuanVtcEhlbGQ7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuanVtcCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuanVtcF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkp1bXAgJiYgdGhpcy5qdW1wSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgJj0gdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA+IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2RGFzaCA9IHRoaXMuZGFzaEhlbGQ7XG4gICAgICAgIHRoaXMuZGFzaEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuZGFzaCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuZGFzaF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkRhc2ggJiYgdGhpcy5kYXNoSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA+IDApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgZ2FtZXBhZFByZXNzZWRCdXR0b25zLFxuICAgIHByZXNzZWRLZXlzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcblxuY29uc3QgU0NBTElORyA9IDM7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5sZXQgY29udGV4dDtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5sZXQgc2Nyb2xsWCA9IDA7XG5sZXQgc2Nyb2xsWSA9IDA7XG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHQudHJhbnNsYXRlKHNjcm9sbFggLSB4LCBzY3JvbGxZIC0geSk7XG4gICAgc2Nyb2xsWCA9IHg7XG4gICAgc2Nyb2xsWSA9IHk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICBzb3VuZC5wbGF5U291bmQoc291bmQubXVzaWMpO1xuICAgIHVwZGF0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaXNSdW5uaW5nID0gZmFsc2U7XG4gICAgbXVzaWMuc3RvcCgpO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc1J1bm5pbmcpIHtcbiAgICAgICAgc2xvd2Rvd25Db3VudGVyICs9IDE7XG4gICAgICAgIGlmIChzbG93ZG93bkNvdW50ZXIgPj0gU0xPV0RPV05fRkFDVE9SKSB7XG4gICAgICAgICAgICBzbG93ZG93bkNvdW50ZXIgLT0gU0xPV0RPV05fRkFDVE9SO1xuICAgICAgICAgICAgZnJhbWVDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7ZnJhbWVDb3VudGVyIC8gZnJhbWVSYXRlUmVmcmVzaH0gRlBTYCk7XG4gICAgICAgICAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRklYRURfREVMVEFfVElNRSA/XG4gICAgICAgICAgICAgICAgMSAvIEZSQU1FX1JBVEUgOlxuICAgICAgICAgICAgICAgIE1hdGgubWluKCh0aW1lTm93IC0gbGFzdFVwZGF0ZSkgLyAoMTAwMCAqIFNMT1dET1dOX0ZBQ1RPUiksIC4wNSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUudXBkYXRlKGRlbHRhVGltZSk7XG5cbiAgICAgICAgICAgIC8vIFRyYW5zaXRpb24gZnJvbSBvbmUgcm9vbSB0byBhbm90aGVyXG4gICAgICAgICAgICBpZiAoY3VycmVudFNjZW5lLnRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICAgICAgY3VycmVudFNjZW5lID0gY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICAgICAgcHJldlNjZW5lLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRTY3JvbGwoY3VycmVudFNjZW5lLnNjcm9sbFgsIGN1cnJlbnRTY2VuZS5zY3JvbGxZKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5kcmF3KGNvbnRleHQpO1xuICAgICAgICAgICAgbGFzdFVwZGF0ZSA9IHRpbWVOb3c7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG4gICAgfVxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgICAgIGlmIChTTE9XRE9XTl9GQUNUT1IgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG5cbiAgICAvLyBwcmVwYXJlIGNhbnZhcyBhbmQgY29udGV4dFxuICAgIGNvbnN0IHNjcmVlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lLXNjcmVlbicpO1xuICAgIHNjcmVlbi5zdHlsZS53aWR0aCA9IGAke2NvbnN0YW50cy5WSUVXX1dJRFRIICogU0NBTElOR31weGA7XG4gICAgc2NyZWVuLnN0eWxlLmhlaWdodCA9IGAke2NvbnN0YW50cy5WSUVXX0hFSUdIVCAqIFNDQUxJTkd9cHhgO1xuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGF5ZXIxXCIpO1xuICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgIGNhbnZhcy53aWR0aCA9IFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICBjb250ZXh0LnNjYWxlKFNDQUxJTkcsIFNDQUxJTkcpO1xuICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICAvLyBQcmVwYXJlIGJ1dHRvblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBlID0+IHtcbiAgICAgICAgZS50YXJnZXQuaGlkZGVuID0gdHJ1ZTtcbiAgICAgICAgc3RhcnQoKTtcbiAgICB9KTtcblxuICAgIC8vIGxvYWQgYWxsIHNjZW5lcyBhbmQgc3RhcnQgZ2FtZVxuICAgIG1hcHMubG9hZFNjZW5lcy50aGVuKCgpID0+IHtcbiAgICAgICAgY3VycmVudFNjZW5lID0gbWFwcy5zY2VuZXMuQ0VMRVNURV8wMTtcbiAgICAgICAgY3VycmVudFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IDE7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoKSk7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5yZXNldCgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0LWJ1dHRvblwiKS5yZW1vdmVBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiKTtcbiAgICB9KTtcblxufTtcblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jb25zdCBzY2VuZXMgPSB7fTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIGluZGV4MSwgc2NlbmUyLCB4MiwgaW5kZXgyLCB3aWR0aCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oeDIgKiBVLCBzY2VuZTIuaGVpZ2h0LCB3aWR0aCAqIFUsIDAsIHNjZW5lMSwgeDEgKiBVLCAyICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHkxLCBpbmRleDEsIHNjZW5lMiwgeTIsIGluZGV4MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oc2NlbmUxLndpZHRoLCB5MSAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMiwgVSwgeTIgKiBVLCBpbmRleDIpKTtcbiAgICBzY2VuZTIuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5jb25zdCBsb2FkU2NlbmVzID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgUHJvbWlzZS5hbGwoW1xuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDIuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTAzLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDUuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA2Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDguanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA5Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTEuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTEyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTQuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTE1Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxNi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczAxLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDIuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczA0Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDUuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczA3Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDguanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG5cbiAgICBdKS50aGVuKHJlc3BvbnNlcyA9PiB7XG4gICAgICAgIGNvbnN0IHNjZW5lTmFtZXMgPSBbXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDFcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wMlwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzAzXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDRcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wNVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA2XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDdcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wOFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA5XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTBcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xMVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzEyXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTNcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xNFwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzE1XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTZcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDFcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDJcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDNcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDRcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDVcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDZcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDdcIixcbiAgICAgICAgICAgIFwiTE9VSVNfMDhcIixcbiAgICAgICAgXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzY2VuZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzY2VuZXNbc2NlbmVOYW1lc1tpXV0gPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihyZXNwb25zZXNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQ0VMRVNURV8wNFxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTAgKiBVLCAzICogVSwgMiAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC43NSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxNCAqIFUsIDEwICogVSwgMjMgKiBVLCA5ICogVSwgLjUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMjMgKiBVLCA5ICogVSwgMTQgKiBVLCAxMCAqIFUsIDEuNSksXG4gICAgICAgICAgICBdKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQ0VMRVNURV8wNlxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDYuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDEzICogVSwgMzMgKiBVLCA0ICogVSwgMiAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC43NSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIDMzICogVSwgMTMgKiBVLCAyMyAqIFUsIC40NSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIDIzICogVSwgMTMgKiBVLCAzMyAqIFUsIDEuNSksXG4gICAgICAgICAgICBdKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQ0VMRVNURV8wOFxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDguYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTYgKiBVLCAyICogVSwgMyAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC43NSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxNCAqIFUsIDE2ICogVSwgMjEgKiBVLCAxMiAqIFUsIC41KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDIxICogVSwgMTIgKiBVLCAxNCAqIFUsIDE2ICogVSwgMiksXG4gICAgICAgICAgICBdKSkpO1xuICAgICAgICB9XG5cblxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBDRUxFU1RFXzE0XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTEgKiBVLCAyOSAqIFUsIDQgKiBVLCAyICogVSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoLjI1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDExICogVSwgMjkgKiBVLCAxOSAqIFUsIDI5ICogVSwgLjM1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDE5ICogVSwgMjkgKiBVLCAxMSAqIFUsIDI5ICogVSwgMS41KSxcbiAgICAgICAgICAgIF0pKSk7XG5cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzE0LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygyNiAqIFUsIDI4ICogVSwgNSAqIFUsIDIgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguMjUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMjYgKiBVLCAyOCAqIFUsIDI2ICogVSwgMjIgKiBVLCAuMzUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMjYgKiBVLCAyMiAqIFUsIDI2ICogVSwgMjggKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIENFTEVTVEVfMTVcbiAgICAgICAgICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygyNCAqIFUsIDYgKiBVLCAyICogVSwgNyAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC4yNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgyNCAqIFUsIDYgKiBVLCAyNCAqIFUsIDE3ICogVSwgLjM1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDI0ICogVSwgMTcgKiBVLCAyNCAqIFUsIDYgKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI0ICogVSwgNSAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDApKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuXG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRUaGluZyhzcGlrZXMyKTtcblxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE1ICogVSwgMjAgKiBVLCAyICogVSwgNCAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC4yNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxNSAqIFUsIDIwICogVSwgOSAqIFUsIDIwICogVSwgLjM1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDkgKiBVLCAyMCAqIFUsIDE1ICogVSwgMjAgKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIExPVUlTXzA2XG4gICAgICAgICAgICBzY2VuZXMuTE9VSVNfMDYuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigxMS41ICogVSwgMTUgKiBVLCAwLCAzICogVSwgc2NlbmVzLkxPVUlTXzA4LCBVLCAxMyAqIFUsIDApKTtcbiAgICAgICAgICAgIHNjZW5lcy5MT1VJU18wOC5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKDAsIDEzICogVSwgMCwgMyAqIFUsIHNjZW5lcy5MT1VJU18wNiwgMTAgKiBVLCAxNSAqIFUsIDEpKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMSwgMzEsIDAsIHNjZW5lcy5DRUxFU1RFXzAyLCAxLCAxLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMiwgMzQsIDAsIHNjZW5lcy5DRUxFU1RFXzAzLCAyLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMywgMzMsIDAsIHNjZW5lcy5DRUxFU1RFXzA0LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNCwgMjEsIDAsIHNjZW5lcy5DRUxFU1RFXzA1LCA0LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNSwgMjIsIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wNywgMjksIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzMCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDYsIDMwLCAyLCBzY2VuZXMuQ0VMRVNURV8wOCwgNSwgMCwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDYsIDM1LCAwLCBzY2VuZXMuQ0VMRVNURV8wOSwgMSwgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTAsIDcsIDAsIHNjZW5lcy5DRUxFU1RFXzA5LCA3LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMSwgOCwgMSwgc2NlbmVzLkNFTEVTVEVfMTAsIDgsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzEwLCAyLCAxLCBzY2VuZXMuQ0VMRVNURV8xMiwgNDIsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzExLCAzLCAwLCBzY2VuZXMuQ0VMRVNURV8xMiwgMywgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDksIDAsIDAsIHNjZW5lcy5DRUxFU1RFXzEzLCAwLCAwLCAxMCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTMsIDAsIDEsIHNjZW5lcy5DRUxFU1RFXzE0LCAyMiwgMiwgMTApO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE1LCAyMiwgMSwgc2NlbmVzLkNFTEVTVEVfMTQsIDQsIDAsIDUpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE2LCAxOSwgMCwgc2NlbmVzLkNFTEVTVEVfMTUsIDIsIDAsIDIpO1xuXG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAxLCAzNSwgMCwgc2NlbmVzLkxPVUlTXzAyLCA0LCAxLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMsIDAsIHNjZW5lcy5MT1VJU18wMiwgMTMsIDAsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMywgMzAsIDEsIHNjZW5lcy5MT1VJU18wMiwgMjMsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wNCwgNCwgMCwgc2NlbmVzLkxPVUlTXzAyLCAzNSwgMywgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzA1LCAzMywgMCwgc2NlbmVzLkxPVUlTXzA2LCAxLCAxLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuTE9VSVNfMDYsIDgsIDAsIHNjZW5lcy5MT1VJU18wNywgOCwgMSwgNik7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2NlbmVzLFxuICAgIGxvYWRTY2VuZXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcblxuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbi8qKlxuICogVGlsZXMgc2hlZXRcbiAqIEB0eXBlIHtIVE1MSW1hZ2VFbGVtZW50fVxuICovXG5jb25zdCB0aWxlc2V0ID0gbmV3IEltYWdlKCk7XG50aWxlc2V0LnNyYyA9ICd0aWxlbWFwcy90aWxlc2V0LnBuZyc7XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB0byBiZSB1c2VkIHdoZW4gcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQgb2YgdGhlIHNjZW5lXG4gKi9cbmNsYXNzIFRpbGVEYXRhIHtcbiAgICBjb25zdHJ1Y3RvcihpbmRleCwgc2hpZnRYID0gMCwgc2hpZnRZID0gMCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5kZXggb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHRoaXMuaW5kZXggJSA4O1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1wb3NpdGlvbiBvZiB0aGUgdGlsZSBpbiB0aGUgdGlsZXNldFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0gdGhpcy5pbmRleCA+PiAzO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFggPSBzaGlmdFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LW9mZnNldCB0byBkcmF3IHRoZSB0aWxlIGZyb20gdGhlIFNjZW5lRWxlbWVudCdzIHBvc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNoaWZ0WSA9IHNoaWZ0WTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlIGlmIHRoZSBpbnRlcnNlY3Rpb24gb2YgYm90aCBzZWdtZW50cyBpcyBvZiBub24temVybyBtZWFzdXJlIChpZiB0aGUgZW5kIG9mIG9uZSBzZWdtZW50XG4gKiBjb2luY2lkZXMgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIG5leHQsIHRoZXkgYXJlIG5vdCBjb25zaWRlcmVkIGFzIG92ZXJsYXBwaW5nKVxuICpcbiAqIEBwYXJhbSBzdGFydDEge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMSB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHN0YXJ0MiB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgc2Vjb25kIHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMiB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIHR3byBzZWdtZW50cyBvdmVybGFwXG4gKi9cbmZ1bmN0aW9uIHNlZ21lbnRzT3ZlcmxhcChzdGFydDEsIHNpemUxLCBzdGFydDIsIHNpemUyKSB7XG4gICAgcmV0dXJuIHN0YXJ0MSA8IHN0YXJ0MiArIHNpemUyICYmIHN0YXJ0MiA8IHN0YXJ0MSArIHNpemUxO1xufVxuXG5cbi8qKlxuICogU2NlbmVFbGVtZW50cyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBhcHBlYXIgaW4gYSBzY2VuZSAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBkZWNvcmF0aW9ucywgZXRjLilcbiAqXG4gKiBBbGwgRWxlbWVudHMgYXJlIHJlcHJlc2VudGVkIGFzIGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3hlcyBhbmQgdGhlIHNwYWNlIHRoZXkgb2NjdXB5IGluIGEgc2NlbmUgaXMgdGhlcmVmb3JlIGRlZmluZWRcbiAqIGFzIGEgcG9zaXRpb24gKHgsIHkpIGFuZCBhIHNpemUgKHdpZHRoLCBoZWlnaHQpLiBBdCBhbGwgdGltZXMsIHBvc2l0aW9ucyBhbmQgc2l6ZXMgc2hvdWxkIGJlIGludGVnZXJzLiBTdWItaW50ZWdlclxuICogcG9zaXRpb25zIGFyZSBjb25zaWRlcmVkIHdpdGggdGhlIHVzZSBvZiB0aGUgYHhSZW1haW5kZXJgIGFuZCBgeVJlbWFpbmRlcmAgYXR0cmlidXRlcyAodGhhdCBzaG91bGQgaGF2ZSBhbiBhYnNvbHV0ZVxuICogdmFsdWUgPCAxKVxuICovXG5jbGFzcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBvZiB0aGUgbGVmdG1vc3Qgc2lkZSBvZiB0aGUgYm91bmRpbmcgYm94IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB4LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBpbml0aWFsIHktY29vcmRpbmF0ZSAodXNlZCBmb3IgcmVzZXQoKSlcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3RhcnRZID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHdpZHRoIG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGhlaWdodCBvZiB0aGUgU2NlbmVFbGVtZW50IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGZyYWN0aW9uYWwgcGFydCBvZiB0aGUgeC1wb3NpdGlvbiBvZiB0aGUgU2NlbmVFbGVtZW50IChwb3NpdGlvbiBvZiBhbiBlbGVtZW50IHNob3VsZCBhbHdheXMgYmUgYW4gaW50ZWdlcixcbiAgICAgICAgICogYnV0IGZyYWN0aW9uYWwgcGFydHMgb2YgdGhlIGNvbXB1dGVkIHBvc2l0aW9uIGNhbiBiZSByZW1lbWJlcmVkIGZvciBuZXh0IG1vdmUpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB5LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgbW92ZWQgb24gdGhlIHgtYXhpcyBzaW5jZSBsYXN0IHVwZGF0ZVxuICAgICAgICAgKiAocmVzZXQgYnkgYmVmb3JlVXBkYXRlKCksIGluY3JlbWVudGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhpcy5tb3ZlKCkpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgbW92ZWQgb24gdGhlIHktYXhpcyBzaW5jZSBsYXN0IHVwZGF0ZVxuICAgICAgICAgKiAocmVzZXQgYnkgYmVmb3JlVXBkYXRlKCksIGluY3JlbWVudGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhpcy5tb3ZlKCkpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBTY2VuZUVsZW1lbnQgc2hvdWxkIGJlIGNvbnNpZGVyZWQgYnkgdGhlIEVuZ2luZSBvciBub3QgKGluYWN0aXZlIFNjZW5lRWxlbWVudHMgYXJlIGlnbm9yZWQgd2hlblxuICAgICAgICAgKiBpbnRlcmFjdGlvbnMgYXJlIGNvbXB1dGVkKVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdXNlZCB0byByZXByZXNlbnQgdGhlIFNjZW5lRWxlbWVudCAoaWYgcmVwcmVzZW50ZWQgYnkgYSBzaW5nbGUgdGlsZSlcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGlsZURhdGEgPSB0aWxlRGF0YTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEN1cnJlbnQgZWZmZWN0cyBhcHBsaWVkIHRvIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgICAgICogQHR5cGUge1tFZmZlY3RdfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lZmZlY3RzID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTY2VuZSBpbiB3aGljaCB0aGUgU2NlbmVFbGVtZW50IGlzIGluY2x1ZGVkXG4gICAgICAgICAqIEB0eXBlIHt1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgICAgICAvKipcbiAgICAgICAgICogRGljdGlvbmFyeSBvZiB0aW1lcnMgKG51bWJlcnMpIHRoYXQgYXJlIGF1dG9tYXRpY2FsbHkgZGVjcmVtZW50ZWQgYXQgZWFjaCB1cGRhdGVcbiAgICAgICAgICogQHR5cGUge3tudW1iZXJ9fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7fTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCBvZiBTY2VuZUVsZW1lbnRzIHRoYXQgYXJlIGF0dGFjaGVkIHRvIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgICAgICogV2hlbmV2ZXIgYHRoaXNgIGlzIG1vdmVkLCBhbGwgYXR0YWNoZWQgRWxlbWVudHMgd2lsbCBhbHNvIGJlIG1vdmVkIGJ5IHRoZSBzYW1lIGFtb3VudFxuICAgICAgICAgKlxuICAgICAgICAgKiBXYXJuaW5nOiBCZWNhdXNlIG9mIHRoZSBzcGVjaWFsIGNvbnN0cmFpbnRzIG9uIEFjdG9yIHBvc2l0aW9ucywgQWN0b3JzIHNob3VsZCBub3QgYmUgYXR0YWNoZWQgdG8gYVxuICAgICAgICAgKiBTY2VuZUVsZW1lbnQuIFRoZSBwYXJ0aWN1bGFyIGNhc2Ugb2YgQWN0b3JzIFwicmlkaW5nXCIgYSBTb2xpZCBpcyBoYW5kbGVkIHNlcGFyYXRlbHkgaW4gdGhlIFNvbGlkLm1vdmUoKVxuICAgICAgICAgKiBtZXRob2QuXG4gICAgICAgICAqIEB0eXBlIHtTZXQ8U2NlbmVFbGVtZW50Pn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cyA9IG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgdGhpc2Agb3ZlcmxhcHMgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgb3RoZXJgLlxuICAgICAqXG4gICAgICogVHdvIFNjZW5lRWxlbWVudHMgb3ZlcmxhcCBpZiBmb3IgYm90aCBkaW1lbnNpb25zIHRoZSBlbmQgcG9zaXRpb24gb2YgZWFjaCBTY2VuZUVsZW1lbnQgaXMgc3RyaWN0bHkgZ3JlYXRlciB0aGFuXG4gICAgICogdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBvdGhlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciB7U2NlbmVFbGVtZW50fVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG4gICAgICovXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBTY2VuZUVsZW1lbnQgaW4gdGhlIENhbnZhcyBhc3NvY2lhdGVkIHRvIHRoZSBDb250ZXh0IGdpdmVuIGFzIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIGN0eCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0IG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBkcmF3blxuICAgICAqL1xuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbGVEYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgdGlsZXNldCxcbiAgICAgICAgICAgICAgICAxNiAqIHRoaXMudGlsZURhdGEueCwgMTYgKiB0aGlzLnRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgIHRoaXMueCArIHRoaXMudGlsZURhdGEuc2hpZnRYLCB0aGlzLnkgKyB0aGlzLnRpbGVEYXRhLnNoaWZ0WSxcbiAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHByb3BlcnRpZXMgYXQgdGhlIHN0YXJ0IG9mIGEgbmV3IHVwZGF0ZSBvZiB0aGUgU2NlbmVcbiAgICAgKi9cbiAgICBiZWZvcmVVcGRhdGUoKSB7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgc3RhdGUgb2YgdGhlIFNjZW5lRWxlbWVudCAoY2FsbGVkIGF0IGVhY2ggZnJhbWUgd2hlbiB0aGUgU2NlbmUgaXMgYWN0aXZlKVxuICAgICAqIEBwYXJhbSBkZWx0YVRpbWUge251bWJlcn0gdGltZSBlbGFwc2VkIHNpbmNlIGxhc3QgdXBkYXRlIChpbiBzZWNvbmRzKVxuICAgICAqL1xuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgLy8gdXBkYXRlIHRpbWVyc1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgZWZmZWN0c1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLmVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmVzIHRoZSBTY2VuZUVsZW1lbnQgYnkgYSBnaXZlbiBhbW91bnRcbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIHJpZ2h0XG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSBkb3duXG4gICAgICovXG4gICAgbW92ZShkeCwgZHkpIHtcbiAgICAgICAgLy8gbW92ZSBhbGwgZWxlbWVudHMgYXR0YWNoZWQgdG8gdGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hhbmdlIHBvc2l0aW9uXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG4gICAgICAgIHRoaXMubW92ZWRYICs9IG1vdmVYO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgU2NlbmUgRWxlbWVudCB0byBhIGdpdmVuIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHgge251bWJlcn0geC1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0geSB7bnVtYmVyfSB5LWNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldCBwb3NpdGlvblxuICAgICAqL1xuICAgIG1vdmVUbyh4LCB5KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy54ID0gdGhpcy5zdGFydFg7XG4gICAgICAgIHRoaXMueSA9IHRoaXMuc3RhcnRZO1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgZm9yIChjb25zdCB0aW1lciBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdGltZXJdID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVmZmVjdHMubGVuZ3RoID0gMDsgICAgLy8gY2xlYXIgYWxsIGVmZmVjdHNcbiAgICB9XG5cbiAgICBhZGRFZmZlY3QoZWZmZWN0KSB7XG4gICAgICAgIHRoaXMuZWZmZWN0cy5wdXNoKGVmZmVjdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmVmZmVjdHMuaW5kZXhPZihlZmZlY3QpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLmVmZmVjdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGdpdmVuIFNjZW5lRWxlbWVudCB0byB0aGlzXG4gICAgICogQHBhcmFtIGVsZW1lbnQge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudCB0byBhdHRhY2hcbiAgICAgKi9cbiAgICBhdHRhY2goZWxlbWVudCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGRldGFjaFxuICAgICAqL1xuICAgIGRldGFjaChlbGVtZW50cykge1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMuZGVsZXRlKGVsZW1lbnQpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEFjdG9ycyBhcmUgU2NlbmVFbGVtZW50cyBpbiBhIFNjZW5lIHRoYXQgY2Fubm90IHBhc3MgdGhyb3VnaCBTb2xpZHMgKHBsYXllciBjaGFyYWN0ZXJzIGFuZCBlbmVtaWVzIGZvciBpbnN0YW5jZSlcbiAqL1xuY2xhc3MgQWN0b3IgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBBY3RvciBpcyBjdXJyZW50bHkgXCJyaWRpbmdcIiB0aGUgU29saWQgZ2l2ZW4gYXMgcGFyYW1ldGVyLCBtZWFuaW5nIHRoYXQgd2hlbiB0aGUgU29saWRcbiAgICAgKiBtb3ZlcyBpdCBzaG91bGQgbW92ZSB0aGUgQWN0b3IgdG9vLlxuICAgICAqIEFuIEFjdG9yIGlzIGNvbnNpZGVyZWQgdG8gYmUgcmlkaW5nIGEgU29saWQgaXQgaXMgc3RhbmRpbmcgZGlyZWN0bHkgb24gdG9wIG9mIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvbGlkIHtTb2xpZH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNhbGwgd2hlbiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkIHdoaWxlIGJlaW5nIHB1c2hlZCBieSBhbm90aGVyXG4gICAgICovXG4gICAgc3F1aXNoKCkge31cbn1cblxuXG4vKipcbiAqIFNvbGlkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IEFjdG9ycyBjYW5ub3QgcGFzcyB0aHJvdWdoLiBUaGVyZSBzaG91bGQgbmV2ZXIgYmUgYW4gQWN0b3Igb3ZlcmxhcHBpbmcgYSBTb2xpZCAodW5sZXNzXG4gKiBlaXRoZXIgb25lIGlzIG1hcmtlZCBhcyBpbmFjdGl2ZSkuIFdoZW4gU29saWRzIG1vdmUsIHRoZXkgaW50ZXJhY3Qgd2l0aCBBY3RvcnMgdGhhdCBtaWdodCBvdGhlcndpc2Ugb3ZlcmxhcCAodGhleVxuICogbWlnaHQgcHVzaCB0aGVtLCBraWxsIHRoZW0sIGV0Yy4pLlxuICpcbiAqIFR3byBTb2xpZHMgbWlnaHQgb3ZlcmxhcCwgYW5kIGluIGdlbmVyYWwgdGhlIG1vdmVtZW50IG9mIGEgU29saWQgaXMgbm90IGFmZmVjdGVkIGJ5IG90aGVyIFNvbGlkcy5cbiAqL1xuY2xhc3MgU29saWQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNvbGlkIHNob3VsZCBiZSBjb25zaWRlcmVkIHdoZW4gY2hlY2tpbmcgY29sbGlzaW9ucyB3aXRoIGFuIEFjdG9yXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIGlzIHVzZWQgYXV0b21hdGljYWxseSBieSB0aGUgbW92ZSgpIG1ldGhvZCB3aGVuIHRoZSBTb2xpZCBwdXNoZXMgYW4gQWN0b3IuIEl0IHNob3VsZCBub3QgYmVcbiAgICAgICAgICogY2hhbmdlZCBpbiBvdGhlciBjaXJjdW1zdGFuY2VzICh1c2UgaXNBY3RpdmUgdG8gZGlzYWJsZSB0aGUgU29saWQpLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb21lbnR1bSBvbiB0aGUgeC1heGlzIGdpdmVuIHRvIEFjdG9ycyByaWRpbmcgdGhlIFNvbGlkIChpbiBwaXhlbHMvcylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1vbWVudHVtIG9uIHRoZSB5LWF4aXMgZ2l2ZW4gdG8gQWN0b3JzIHJpZGluZyB0aGUgU29saWQgKGluIHBpeGVscy9zKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgdXNlZCB0byBzdG9yZSBtb21lbnR1bSBmb3IgYSBmZXcgZnJhbWVzIGFmdGVyIHRoZSBTb2xpZCBzdG9wcyBtb3ZpbmdcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgYSBQbGF5ZXIgY2hhcmFjdGVyIGNhbiBjbGltYiBvbiAob3Igc2xvd2x5IHNsaWRlIGFnYWluc3QpIHRoZSBzaWRlcyBvZiB0aGUgU29saWRcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge251bWJlcn0gdGhlIG1vbWVudHVtIG9mIHRoZSBzb2xpZCBvbiB0aGUgeC1heGlzIGlmIHRoZSBtb21lbnR1bSBjb3VudGVyIGhhcyBub3QgZXhwaXJlZCAoMCBvdGhlcndpc2UpXG4gICAgICovXG4gICAgZ2V0TW9tZW50dW1YKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW0gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb21lbnR1bVg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQHJldHVybnMge251bWJlcn0gdGhlIG1vbWVudHVtIG9mIHRoZSBzb2xpZCBvbiB0aGUgeC1heGlzIGlmIHRoZSBtb21lbnR1bSBjb3VudGVyIGhhcyBub3QgZXhwaXJlZCAoMCBvdGhlcndpc2UpXG4gICAgICovXG4gICAgZ2V0TW9tZW50dW1ZKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW0gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb21lbnR1bVk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgbW92ZShkeCwgZHkpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLmF0dGFjaGVkRWxlbWVudHMpIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmUoZHgsIGR5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54ICsgdGhpcy53aWR0aCAtIGFjdG9yLngsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYIDwgbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggLSBhY3Rvci54IC0gYWN0b3Iud2lkdGgsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW92ZVkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPCBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA+IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0TW9tZW50dW0obXgsIG15KSB7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBTb2xpZCBpcyBjb25zaWRlcmVkIHRvIGNvbGxpZGUgd2l0aCBhbiBBY3RvciBtb3ZpbmcgYnkgYSBnaXZlbiBhbW91bnQgaW4gYm90aCBheGVzLlxuICAgICAqXG4gICAgICogVG8gc2ltcGxpZnkgdGhlIGNvbXB1dGF0aW9uLCB0aGUgZnVuY3Rpb24gY2hlY2tzIGlmIHRoZSBib3VuZGluZyBib3ggb2YgdGhlIHNvbGlkIG92ZXJsYXBzIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgICogcmVjdGFuZ2xlIGNvbnRhaW5pbmcgdGhlIGFyZWFzIG9jY3VwaWVkIGJ5IHRoZSBBY3RvciBhdCB0aGUgc3RhcnQgYW5kIGVuZCBvZiBpdHMgbW92ZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYWN0b3Ige0FjdG9yfVxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBhbW91bnQgdHJhdmVsZWQgYnkgdGhlIEFjdG9yIG9uIHRoZSB4LWF4aXMgZnJvbSBpdHMgY3VycmVudCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBkeSB7bnVtYmVyfSBhbW91bnQgdHJhdmVsZWQgYnkgdGhlIEFjdG9yIG9uIHRoZSB5LWF4aXMgZnJvbSBpdHMgY3VycmVudCBwb3NpdGlvblxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSBTb2xpZCBvdmVybGFwcyB0aGUgQWN0b3IgYXQgYW55IHBvaW50IGR1cmluZyBpdHMgbW92ZW1lbnRcbiAgICAgKi9cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR4ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoICsgZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCArIGR4LCBhY3Rvci53aWR0aCAtIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQgKyBkeSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnkgKyBkeSwgYWN0b3IuaGVpZ2h0IC0gZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBIYXphcmRzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQga2lsbCB0aGUgcGxheWVyIG9uIGNvbnRhY3RcbiAqL1xuY2xhc3MgSGF6YXJkIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFBsYXRmb3JtcyBhcmUgZmxhdCBTb2xpZHMgKDAgaGVpZ2h0KSB0aGF0IEFjdG9ycyBjYW4gcGFzcyB0aHJvdWdoIHdoZW4gbW92aW5nIHVwd2FyZHMgYnV0IG5vdCBkb3dud2FyZHMgKGlmIHRoZXkgYXJlXG4gKiBlbnRpcmVseSBoaWdoZXIgdGhhbiB0aGUgUGxhdGZvcm0pXG4gKlxuICogQ29udHJhcnkgdG8gcmVndWxhciBTb2xpZHMsIFBsYXRmb3JtcyBhcmUgYWxsb3dlZCB0byBvdmVybGFwIHdpdGggQWN0b3JzLlxuICovXG5jbGFzcyBQbGF0Zm9ybSBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIDAsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgPD0gdGhpcy55ICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCArIGR5ID4gdGhpcy55O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcHJpbmdzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgdGhyb3cgQWN0b3JzIHVwIG9uIGNvbnRhY3RcbiAqL1xuY2xhc3MgU3ByaW5nIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMudGlsZURhdGEuc2hpZnRZID0gLVUgLyAyO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5zcHJpbmdTb3VuZCk7XG4gICAgICAgIHBsYXllci5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfQk9VTkNFKTtcbiAgICAgICAgcGxheWVyLnNwZWVkWCA9IDA7XG4gICAgICAgIHBsYXllci5zcGVlZFkgPSBjb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICBwbGF5ZXIucmVzdG9yZURhc2goKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBEYXNoRGlhbW9uZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCByZXN0b3JlIHRoZSBkYXNoIGNvdW50ZXIgb2YgdGhlIFBsYXllcnMgd2hvIHRvdWNoIHRoZW1cbiAqL1xuY2xhc3MgRGFzaERpYW1vbmQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRhc2hEaWFtb25kU291bmQpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFN0cmF3YmVycmllcyBhcmUgY29sbGVjdGlibGVzIHRoYXQgUGxheWVyIHRha2Ugb24gY29udGFjdC5cbiAqIElmIGEgUGxheWVyIGRpZXMgYWZ0ZXIgY29sbGVjdGluZyBhIFN0cmF3YmVycnkgYmVmb3JlIGNoYW5naW5nIFNjZW5lLCB0aGUgU3RyYXdiZXJyeSBpcyByZXN0b3JlZCBpbiB0aGUgU2NlbmVcbiAqIChhbmQgcmVtb3ZlZCBmcm9tIHRoZSBQbGF5ZXIncyBsaXN0IG9mIGNvbGxlY3RlZCBTdHJhd2JlcnJpZXMpXG4gKi9cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuc3RyYXdiZXJyeVNvdW5kKTtcbiAgICAgICAgICAgIHBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuYWRkKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFRyYW5zaXRpb25zIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgdHJhbnNmZXIgYSBQbGF5ZXIgZnJvbSBvbmUgU2NlbmUgdG8gYW5vdGhlciBvbiBjb250YWN0XG4gKi9cbmNsYXNzIFRyYW5zaXRpb24gZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZLCBzcGF3blBvaW50SW5kZXggPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lIHRvIHdoaWNoIHRoZSBQbGF5ZXIgaXMgdGFrZW4gd2hlbiB0b3VjaGluZyB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7U2NlbmV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueCAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeC1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WCAtIHRoaXMueFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRYID0gdGFyZ2V0WDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBpbiB0aGUgdGFyZ2V0IFNjZW5lIGNvcnJlc3BvbmRpbmcgdG8gdGhpcy55ICh3aGVuIHRoZSBQbGF5ZXIgdHJhbnNpdGlvbnMgdG8gdGhlIHRhcmdldCBTY2VuZSxcbiAgICAgICAgICogaXRzIHBvc2l0aW9uIGlzIHNldCB0byBpdHMgY3VycmVudCB5LXBvc2l0aW9uICsgdGhpcy50YXJnZXRZICsgdGhpcy55XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFkgPSB0YXJnZXRZO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGluZGV4IG9mIHRoZSBzcGF3biBwb2ludCAoaW4gdGhlIHRhcmdldCBTY2VuZSdzIGxpc3Qgb2Ygc3Bhd24gcG9pbnRzKSBjb3JyZXNwb25kaW5nIHRvIHRoZSBUcmFuc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IHNwYXduUG9pbnRJbmRleDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lLnJlc2V0KCk7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICBwbGF5ZXIubWFrZVRyYW5zaXRpb24odGhpcyk7XG4gICAgICAgIHRoaXMuc2NlbmUudHJhbnNpdGlvbiA9IHRoaXM7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQ3J1bWJsaW5nQmxvY2tzIGFyZSBTb2xpZHMgdGhhdCBkaXNhcHBlYXIgc2hvcnRseSBhZnRlciBhIFBsYXllciBoaXRzIGl0IChvbmx5IHdoZW4gdGhlIFBsYXllciBpcyBjb25zaWRlcmVkIHRvIGJlXG4gKiBcImNhcnJpZWRcIiBieSB0aGUgQ3J1bWJsaW5nQmxvY2spLlxuICogVGhleSByZWFwcGVhciBhZnRlciBhIGdpdmVuIHRpbWUgKGlmIHRoZXJlIGFyZSBubyBBY3RvcnMgb24gdGhlaXIgcG9zaXRpb24pXG4gKi9cbmNsYXNzIENydW1ibGluZ0Jsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIHRpbGVEYXRhKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGJsb2NrIGlzIGRpc2FwcGVhcmluZ1xuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgZGlzYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgcmVhcHBlYXJhbmNlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyOyAgIC8vIGR1cmF0aW9uIGJlZm9yZSByZWFwcGVhcmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzaG91bGRCZWNvbWVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRCZWNvbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQmVjb21lQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNjZW5lLnBsYXllciAmJiB0aGlzLnNjZW5lLnBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5jcnVtYmxpbmdCbG9ja1NvdW5kKTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IC41OyAgLy8gZHVyYXRpb24gYmVmb3JlIGRpc2FwcGVhcmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFscGhhID0gMiAqIHRoaXMudGltZXJzLmZhbGw7XG4gICAgICAgICAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBhbHBoYTtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogVHJpZ2dlckJsb2NrcyBhcmUgU29saWRzIHRoYXQgc3RhcnQgbW92aW5nIHdoZW4gYW4gQWN0b3IgaXMgY2FycmllZCBieSB0aGVtXG4gKi9cbmNsYXNzIFRyaWdnZXJCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBtb3ZlbWVudCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1vdmVtZW50IHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3JcbiAgICAgICAgICogQHR5cGUge0VmZmVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbGUgaW5kZXhlcyB0byB1c2Ugd2hlbiBkcmF3aW5nIHRoZSBUcmlnZ2VyQmxvY2sgb24gdGhlIFNjZW5lXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlcyA9IG5ldyBBcnJheSgod2lkdGggLyBVKSAqIChoZWlnaHQgLyBVKSkuZmlsbCgwKS5tYXAoXyA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5zY2VuZS5wbGF5ZXI7XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkgJiYgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkgJiYgcGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVzZXQoKTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBsZXQgaW5kZXggPSAwO1xuICAgICAgICBmb3IgKGxldCB4ID0gdGhpcy54OyB4IDwgdGhpcy54ICsgdGhpcy53aWR0aDsgeCArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gdGhpcy55OyB5IDwgdGhpcy55ICsgdGhpcy5oZWlnaHQ7IHkgKz0gVSkge1xuICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgICAgIDE2ICogdGhpcy5zcHJpdGVJbmRleGVzW2luZGV4XSwgMTYgKiA4LFxuICAgICAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgICAgIHgsIHksXG4gICAgICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyBkb3dud2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIEhhemFyZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgdGlsZURhdGEuc2hpZnRZID0gLVUgLyAyO1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNEb3duIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIHVwd2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNEb3duIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPCAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNSaWdodCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyBsZWZ0d2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNSaWdodCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSAvIDIsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWCAtIHRoaXMubW92ZWRYIDwgMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzVXAgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgcmlnaHR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0xlZnQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHRpbGVEYXRhLnNoaWZ0WCA9IC1VIC8gMjtcbiAgICAgICAgc3VwZXIoeCArIFUgLyAyLCB5LCBVIC8gMiwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRYIC0gdGhpcy5tb3ZlZFggPiAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2VnbWVudHNPdmVybGFwLFxuICAgIFRpbGVEYXRhLFxuICAgIEhhemFyZCxcbiAgICBTb2xpZCxcbiAgICBBY3RvcixcbiAgICBQbGF0Zm9ybSxcbiAgICBTcHJpbmcsXG4gICAgRGFzaERpYW1vbmQsXG4gICAgU3RyYXdiZXJyeSxcbiAgICBUcmFuc2l0aW9uLFxuICAgIFRyaWdnZXJCbG9jayxcbiAgICBDcnVtYmxpbmdCbG9jayxcbiAgICBTcGlrZXNVcCxcbiAgICBTcGlrZXNEb3duLFxuICAgIFNwaWtlc0xlZnQsXG4gICAgU3Bpa2VzUmlnaHQsXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBzcHJpdGVzID0gcmVxdWlyZSgnLi9zcHJpdGVzJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcblxuY29uc3QgQU5JTUFUSU9OX1NMT1dET1dOID0gNjtcblxuY29uc3QgQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBBTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgQU5JTUFUSU9OX0pVTVAgPSBbNiwgM107XG5jb25zdCBBTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuXG4gICAgICAgIHRoaXMuaW5wdXRzID0gbmV3IGlucHV0cy5QbGF5ZXJJbnB1dHM7XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcblxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzLlNUQVRFX05PUk1BTDtcbiAgICAgICAgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gMTtcbiAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gMTtcbiAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gNDtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG5cbiAgICAgICAgLy8gdGltZXJzXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IH5+KHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgLyBBTklNQVRJT05fU0xPV0RPV04pO1xuICAgICAgICBjb25zdCByb3cgPSAyICogdGhpcy5zcHJpdGVfcm93ICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzcHJpdGVzLnNwcml0ZXNTaGVldC5jYW52YXMsXG4gICAgICAgICAgICAxNiAqIGluZGV4LCAxNiAqIHJvdyxcbiAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgIHRoaXMueCAtIDQsIHRoaXMueSAtIDIsXG4gICAgICAgICAgICAxNiwgMTYpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICs9IDE7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgJT0gdGhpcy5uYl9zcHJpdGVzICogQU5JTUFUSU9OX1NMT1dET1dOO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jYW5CZUNsaW1iZWQgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiB0aGlzLnggPT09IHNvbGlkLnggKyBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBsYXllciBpcyBodWdnaW5nIGEgd2FsbFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IGNvbnN0YW50cy5KVU1QX0dSQUNFX1RJTUU7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gY29uc3RhbnRzLlNUQVRFX0RBU0ggfHwgdGhpcy5kYXNoU3BlZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMudXBkYXRlQW5pbWF0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5tb3ZlWCh0aGlzLnNwZWVkWCAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFggPSAwKTtcbiAgICAgICAgdGhpcy5tb3ZlWSh0aGlzLnNwZWVkWSAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFkgPSAwKTtcblxuICAgICAgICAvLyBpbnRlcmFjdCB3aXRoIFRoaW5nc1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnNjZW5lLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIGlmICh0aGluZy5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKHRoaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGluZy5vbkNvbnRhY3RXaXRoKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnkgPj0gdGhpcy5zY2VuZS5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5keWluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NlbmUuc2hvdWxkUmVzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcEhlbGQgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5pbnB1dHMueUF4aXMgKiBkYXNoU3BlZWQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlucHV0cy5kYXNoUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciAmJiB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPiAwKSB7XG4gICAgICAgICAgICAvLyByZWd1bGFyIGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSB0aGlzLmlucHV0cy54QXhpcyAqIGNvbnN0YW50cy5KVU1QX0hPUklaT05UQUxfQk9PU1Q7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgKHRoaXMuaGFzV2FsbExlZnQgfHwgdGhpcy5oYXNXYWxsUmlnaHQpKSB7XG4gICAgICAgICAgICAvLyB3YWxsanVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBkeCA9IHRoaXMuaGFzV2FsbExlZnQgPyAxIDogLTE7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gdGhpcy5pbnB1dHMueEF4aXM7XG5cbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5DTElNQl9TTElQX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IGNvbnN0YW50cy5TVEFURV9ERUFEKSB7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX1JVTik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVlZFkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9KVU1QKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRkFMTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmp1bXBTb3VuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRhc2hTb3VuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZGllU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlVHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgICAgIC8vIHZhbGlkYXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LnNjZW5lLnJlbW92ZVRoaW5nKHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc2V0UGxheWVyKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IHRyYW5zaXRpb24uc3Bhd25Qb2ludEluZGV4O1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5zY2VuZS5zcGF3blBvaW50c1t0aGlzLnNjZW5lLnNwYXduUG9pbnRJbmRleF07XG4gICAgICAgIHRoaXMueCA9IHBvaW50Lng7XG4gICAgICAgIHRoaXMueSA9IHBvaW50LnkgLSA2O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiBzb2xpZC54ICsgc29saWQud2lkdGggPT09IHRoaXMueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHNvbGlkLnggPT09IHRoaXMueCArIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBzZXRBbmltYXRpb24oc3ByaXRlX3JvdywgbmJfc3ByaXRlcykge1xuICAgICAgICBpZiAoc3ByaXRlX3JvdyAhPT0gdGhpcy5zcHJpdGVfcm93KSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZV9yb3cgPSBzcHJpdGVfcm93O1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLm5iX3Nwcml0ZXMgPSBuYl9zcHJpdGVzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21KU09OKGRhdGEpIHtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoZGF0YS53aWR0aCAqIFUsIGRhdGEuaGVpZ2h0ICogVSk7XG4gICAgICAgIC8vIG1ha2Ugd2FsbHNcbiAgICAgICAgY29uc3Qgd2FsbHMgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgtLjUgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKChkYXRhLndpZHRoICsgLjUpICogVSwgMCwgMCwgZGF0YS5oZWlnaHQgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IChpbmRleCAtIDEpICUgOCxcbiAgICAgICAgICAgICAgICAgICAgeTogfn4oKGluZGV4IC0gMSkgLyA4KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRYOiAwLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFk6IDAsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMiwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuc3Bhd25Qb2ludHMucHVzaCh7eDogeCwgeTogeX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDU6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNVcCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNEb3duKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCArIFUgLyAyLCB5ICsgVSAvIDIsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLkNydW1ibGluZ0Jsb2NrKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5Tb2xpZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIHZpZXdcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA+IC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2lkdGggLSBjb25zdGFudHMuVklFV19XSURUSCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA8IC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA+IC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAtIGNvbnN0YW50cy5WSUVXX0hFSUdIVCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFkgPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgVSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkUmVzZXQpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRQbGF5ZXIocGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVBY3Rvcih0aGlzLnBsYXllcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5hZGRBY3RvcihwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgIH1cblxuICAgIGFkZEFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmFkZChhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5kZWxldGUoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMucmVtb3ZlKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkVGhpbmcodGhpbmcpIHtcbiAgICAgICAgdGhpcy50aGluZ3MuYWRkKHRoaW5nKTtcbiAgICAgICAgdGhpbmcuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmRlbGV0ZSh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTY2VuZSxcbn1cbiIsImNvbnN0IGp1bXBTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfanVtcC5vZ2cnKTtcbmNvbnN0IGRhc2hTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfZGFzaF9waW5rX2xlZnQub2dnJyk7XG5jb25zdCBkaWVTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfZGVhdGgub2dnJyk7XG5jb25zdCBjcnVtYmxpbmdCbG9ja1NvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9mYWxsYmxvY2tfc2hha2Uub2dnJyk7XG5jb25zdCBzdHJhd2JlcnJ5U291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3N0cmF3YmVycnlfcmVkX2dldF8xdXAub2dnJyk7XG5jb25zdCBkYXNoRGlhbW9uZFNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9kaWFtb25kX3RvdWNoXzAxLm9nZycpO1xuY29uc3Qgc3ByaW5nU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3NwcmluZy5vZ2cnKTtcblxuY29uc3QgbXVzaWMgPSBuZXcgQXVkaW8oJ3NvdW5kL2JnX211c2ljLndhdicpO1xubXVzaWMubG9vcCA9IHRydWU7XG5tdXNpYy52b2x1bWUgPSAuNTtcblxuXG5mdW5jdGlvbiBwbGF5U291bmQoc291bmQpIHtcbiAgICBzb3VuZC5jdXJyZW50VGltZSA9IDA7XG4gICAgc291bmQucGxheSgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBsYXlTb3VuZCxcbiAgICBqdW1wU291bmQsXG4gICAgZGFzaFNvdW5kLFxuICAgIGRpZVNvdW5kLFxuICAgIGNydW1ibGluZ0Jsb2NrU291bmQsXG4gICAgc3RyYXdiZXJyeVNvdW5kLFxuICAgIGRhc2hEaWFtb25kU291bmQsXG4gICAgc3ByaW5nU291bmQsXG4gICAgbXVzaWMsXG59IiwiY29uc3Qgc3ByaXRlc1NoZWV0ID0ge307XG5cbmZ1bmN0aW9uIHJhbmdlKG4pIHtcbiAgICByZXR1cm4gbmV3IEFycmF5KG4pLmZpbGwoMCkubWFwKCh4LCBpKSA9PiBpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlU3ByaXRlcygpIHtcbiAgICBzcHJpdGVzU2hlZXQuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgc3ByaXRlc1NoZWV0LmNvbnRleHQgPSBzcHJpdGVzU2hlZXQuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgc3ByaXRlc1NoZWV0LmNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiBhZGRTcHJpdGVzKGltZykpO1xuICAgIGltZy5zcmMgPSBcImltYWdlcy9oZXJvX3Nwcml0ZXMucG5nXCI7XG59XG5cblxuZnVuY3Rpb24gYWRkU3ByaXRlcyhpbWFnZSkge1xuICAgIHNwcml0ZXNTaGVldC5jYW52YXMud2lkdGggPSBpbWFnZS53aWR0aDtcbiAgICBzcHJpdGVzU2hlZXQuY2FudmFzLmhlaWdodCA9IDIgKiBpbWFnZS5oZWlnaHQ7XG5cbiAgICBmb3IgKGxldCBpIG9mIHJhbmdlKGltYWdlLmhlaWdodCAvIDE2KSkge1xuICAgICAgICBmb3IgKGxldCBqIG9mIHJhbmdlKGltYWdlLndpZHRoIC8gMTYpKSB7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDE2ICogaiwgMTYgKiBpLCAxNiwgMTYsIDE2ICogaiwgMTYgKiAyICogaSwgMTYsIDE2KTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnNhdmUoKTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnNjYWxlKC0xLCAxKTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgMTYgKiBqLCAxNiAqIGksIDE2LCAxNiwgLTE2ICogKGorMSksIDE2ICogKDIgKiBpICsgMSksIDE2LCAxNik7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubWFrZVNwcml0ZXMoKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNwcml0ZXNTaGVldCxcbn07Il19
