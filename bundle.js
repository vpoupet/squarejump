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

const SCALING = 2;
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

            context.clearRect(0, 0, currentScene.width, currentScene.height);
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
    player.loadAllSprites.then(() => {
        maps.loadScenes.then(() => {
            currentScene = maps.scenes.CELESTE_01;
            currentScene.spawnPointIndex = 1;
            currentScene.setPlayer(new player.Player());
            currentScene.reset();
            document.getElementById("start-button").removeAttribute("disabled");
        })
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
        makeTransitionRight(scenes.CELESTE_13, .5, 1, scenes.CELESTE_14, 22.5, 2, 10);
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
const sound = require('./sound');

const ANIMATION_SLOWDOWN = 6;
const ANIMATION_IDLE = [4, 4];
const ANIMATION_RUN = [1, 6];
const ANIMATION_JUMP = [6, 3];
const ANIMATION_FALL = [5, 3];
const ANIMATION_DIE = [0, 8];

const spritesSheets = {};


function loadSprites(color) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            spritesSheets[color] = image;
            resolve();
        });
        image.src = `images/hero_${color}.png`;
    });
}


const loadAllSprites = Promise.all([
    loadSprites('red'),
    loadSprites('green'),
    loadSprites('blue'),
]);


class Player extends physics.Actor {
    constructor(x = 0, y = 0, colorName = 'blue') {
        super(x, y, 8, 14);
        this.colorName = colorName;
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
        const row = 4 * this.sprite_row + (this.nbDashes ? 0 : 2) + (this.sprite_direction === -1 ? 1 : 0);
        ctx.drawImage(
            spritesSheets[this.colorName],
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
            if (this.state !== constants.STATE_DASH || this.dashSpeedY >= 0) {
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
        this.restoreDash();
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
    loadAllSprites,
}
},{"./constants":1,"./inputs":3,"./physics":6,"./sound":9}],8:[function(require,module,exports){
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwicGh5c2ljcy5qcyIsInBsYXllci5qcyIsInNjZW5lLmpzIiwic291bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0OUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfVVBfU1BFRUQgPSA0NTtcbmNvbnN0IENMSU1CX1NMSVBfU1BFRUQgPSAzMDtcbmNvbnN0IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSA9IDM7XG5jb25zdCBXQUxMX0pVTVBfSFNQRUVEID0gTUFYX1JVTl9TUEVFRCArIEpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbmNvbnN0IERBU0hfU1BFRUQgPSAyNDA7XG5jb25zdCBFTkRfREFTSF9TUEVFRCA9IDE2MDtcbmNvbnN0IEVORF9EQVNIX1VQX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfVElNRSA9IC4xNTtcbmNvbnN0IERBU0hfQ09PTERPV04gPSAuMjtcblxuLy8gT3RoZXIgY29uc3RhbnRzXG5jb25zdCBNT01FTlRVTV9TVE9SRV9USU1FID0gLjE7XG5jb25zdCBNT01FTlRVTV9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX0ZSRUVaRV9USU1FID0gLjA1O1xuY29uc3QgQk9VTkNFX1RJTUUgPSAuMjtcbmNvbnN0IEJPVU5DRV9TUEVFRCA9IDE4MDtcbmNvbnN0IERZSU5HX1RJTUUgPSAuODtcbmNvbnN0IFNUQVRFX05PUk1BTCA9IDA7XG5jb25zdCBTVEFURV9KVU1QID0gMTtcbmNvbnN0IFNUQVRFX0RBU0ggPSAyO1xuY29uc3QgU1RBVEVfREVBRCA9IDM7XG5jb25zdCBTVEFURV9CT1VOQ0UgPSA0O1xuXG5jb25zdCBHUklEX1NJWkUgPSA4O1xuY29uc3QgVklFV19XSURUSCA9IDMyMDtcbmNvbnN0IFZJRVdfSEVJR0hUID0gMTgwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNQVhfUlVOX1NQRUVELFxuICAgIFJVTl9BQ0NFTEVSQVRJT04sXG4gICAgUlVOX0RFQ0VMRVJBVElPTixcbiAgICBBSVJfRkFDVE9SLFxuICAgIEpVTVBfU1BFRUQsXG4gICAgSlVNUF9IT1JJWk9OVEFMX0JPT1NULFxuICAgIE1BWF9GQUxMX1NQRUVELFxuICAgIEdSQVZJVFksXG4gICAgSlVNUF9HUkFDRV9USU1FLFxuICAgIFZBUl9KVU1QX1RJTUUsXG4gICAgQ0xJTUJfVVBfU1BFRUQsXG4gICAgQ0xJTUJfU0xJUF9TUEVFRCxcbiAgICBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UsXG4gICAgV0FMTF9KVU1QX0hTUEVFRCxcbiAgICBEQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1VQX0ZBQ1RPUixcbiAgICBEQVNIX1RJTUUsXG4gICAgREFTSF9DT09MRE9XTixcbiAgICBNT01FTlRVTV9TVE9SRV9USU1FLFxuICAgIE1PTUVOVFVNX0ZBQ1RPUixcbiAgICBEQVNIX0ZSRUVaRV9USU1FLFxuICAgIEJPVU5DRV9USU1FLFxuICAgIEJPVU5DRV9TUEVFRCxcbiAgICBEWUlOR19USU1FLFxuICAgIFNUQVRFX05PUk1BTCxcbiAgICBTVEFURV9KVU1QLFxuICAgIFNUQVRFX0RBU0gsXG4gICAgU1RBVEVfREVBRCxcbiAgICBTVEFURV9CT1VOQ0UsXG4gICAgR1JJRF9TSVpFLFxuICAgIFZJRVdfV0lEVEgsXG4gICAgVklFV19IRUlHSFQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuY2xhc3MgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgRWZmZWN0U2VxdWVuY2UgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKGVmZmVjdHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5lZmZlY3RzID0gZWZmZWN0cztcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLmR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5lZmZlY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVmZmVjdHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5lZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIpO1xuICAgICAgICAgICAgZWxlbWVudC5zZXRNb21lbnR1bSh0aGlzLm14LCB0aGlzLm15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKHRoaXMueDIsIHRoaXMueTIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNpbmVNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IHRoaXMudGltZXIgKiAyICogTWF0aC5QSSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYXRpbyA9IChNYXRoLmNvcyhhbmdsZSkgKyAxKSAvIDI7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyhyYXRpbyAqIHRoaXMueDEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueDIsIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55Mik7XG4gICAgICAgICAgICBjb25zdCBkcmF0aW8gPSBNYXRoLlBJICogTWF0aC5zaW4oYW5nbGUpIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IG14ID0gZHJhdGlvICogKHRoaXMueDIgLSB0aGlzLngxKTtcbiAgICAgICAgICAgIGNvbnN0IG15ID0gZHJhdGlvICogKHRoaXMueTIgLSB0aGlzLnkxKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0TW9tZW50dW0obXgsIG15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKHRoaXMueDEsIHRoaXMueTEpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEVmZmVjdCxcbiAgICBFZmZlY3RTZXF1ZW5jZSxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTaW5lTW92ZW1lbnQsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBKVU1QX0JVRkZFUl9USU1FID0gLjE7XG5jb25zdCBEQVNIX0JVRkZFUl9USU1FID0gLjE7XG5sZXQgcHJlc3NlZEtleXMgPSBuZXcgU2V0KCk7XG5sZXQgcHJlc3NlZEJ1dHRvbnMgPSBuZXcgU2V0KCk7XG5sZXQgZ2FtZXBhZFByZXNzZWRCdXR0b25zID0gW107XG5cbmNsYXNzIFBsYXllcklucHV0cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZ2FtZXBhZEluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5nYW1lcGFkbWFwID0ge1xuICAgICAgICAgICAganVtcDogMCxcbiAgICAgICAgICAgIGRhc2g6IDEsXG4gICAgICAgICAgICB1cDogMTIsXG4gICAgICAgICAgICBkb3duOiAxMyxcbiAgICAgICAgICAgIGxlZnQ6IDE0LFxuICAgICAgICAgICAgcmlnaHQ6IDE1LFxuICAgICAgICB9XG4gICAgICAgIHRoaXMua2V5bWFwID0ge1xuICAgICAgICAgICAgcmlnaHQ6ICdBcnJvd1JpZ2h0JyxcbiAgICAgICAgICAgIGxlZnQ6ICdBcnJvd0xlZnQnLFxuICAgICAgICAgICAgdXA6ICdBcnJvd1VwJyxcbiAgICAgICAgICAgIGRvd246ICdBcnJvd0Rvd24nLFxuICAgICAgICAgICAganVtcDogJ2cnLFxuICAgICAgICAgICAgZGFzaDogJ2YnLFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGltZXJzID0ge1xuICAgICAgICAgICAganVtcEJ1ZmZlcjogMCxcbiAgICAgICAgICAgIGRhc2hCdWZmZXI6IDAsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdXBkYXRlR2FtZXBhZCgpIHtcbiAgICAgICAgcHJlc3NlZEJ1dHRvbnMuY2xlYXIoKTtcbiAgICAgICAgY29uc3QgZ2FtZXBhZCA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpW3RoaXMuZ2FtZXBhZEluZGV4XTtcbiAgICAgICAgaWYgKGdhbWVwYWQpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ2FtZXBhZC5idXR0b25zOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2FtZXBhZC5idXR0b25zW2pdLnByZXNzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJlc3NlZEJ1dHRvbnMuYWRkKGopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgY29uc3QgZ2FtZXBhZCA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpW3RoaXMuZ2FtZXBhZEluZGV4XTtcbiAgICAgICAgLy8gdGhpcy51cGRhdGVHYW1lcGFkKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmxlZnQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmxlZnRdLnByZXNzZWQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmF4ZXNbMF0gPCAtLjIpKSB7XG4gICAgICAgICAgICB0aGlzLnhBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5yaWdodCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAucmlnaHRdLnByZXNzZWQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmF4ZXNbMF0gPiAuMikpe1xuICAgICAgICAgICAgdGhpcy54QXhpcyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAudXApIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLnVwXS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzFdIDwgLS4yKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuZG93bikgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuZG93bl0ucHJlc3NlZCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYXhlc1sxXSA+IC4yKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByZXZKdW1wID0gdGhpcy5qdW1wSGVsZDtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5qdW1wKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5qdW1wXS5wcmVzc2VkKTtcbiAgICAgICAgaWYgKCFwcmV2SnVtcCAmJiB0aGlzLmp1bXBIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID0gSlVNUF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciAmPSB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZEYXNoID0gdGhpcy5kYXNoSGVsZDtcbiAgICAgICAgdGhpcy5kYXNoSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5kYXNoKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5kYXNoXS5wcmVzc2VkKTtcbiAgICAgICAgaWYgKCFwcmV2RGFzaCAmJiB0aGlzLmRhc2hIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQnVmZmVyID0gREFTSF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyICYmICh0aGlzLnRpbWVycy5kYXNoQnVmZmVyID4gMCk7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcklucHV0cyxcbiAgICBnYW1lcGFkUHJlc3NlZEJ1dHRvbnMsXG4gICAgcHJlc3NlZEtleXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcbmNvbnN0IHNvdW5kID0gcmVxdWlyZSgnLi9zb3VuZCcpO1xuY29uc3QgbWFwcyA9IHJlcXVpcmUoJy4vbWFwcycpO1xuXG5jb25zdCBTQ0FMSU5HID0gMjtcbmxldCBTTE9XRE9XTl9GQUNUT1IgPSAxO1xuY29uc3QgRklYRURfREVMVEFfVElNRSA9IHRydWU7XG5jb25zdCBGUkFNRV9SQVRFID0gNjA7XG5cbmxldCBjb250ZXh0O1xubGV0IGN1cnJlbnRTY2VuZTtcbmxldCBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcbmxldCBpc1J1bm5pbmcgPSBmYWxzZTtcbmxldCBmcmFtZUNvdW50ZXIgPSAwO1xubGV0IGZyYW1lUmF0ZVJlZnJlc2ggPSA1O1xubGV0IGZyYW1lUmF0ZVN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5sZXQgc2xvd2Rvd25Db3VudGVyID0gMDtcbmxldCBzY3JvbGxYID0gMDtcbmxldCBzY3JvbGxZID0gMDtcblxuZnVuY3Rpb24gc2xvd2Rvd24oZmFjdG9yKSB7XG4gICAgU0xPV0RPV05fRkFDVE9SID0gZmFjdG9yO1xuICAgIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpIC8gKFNMT1dET1dOX0ZBQ1RPUiAqIDEwMDApO1xufVxuXG5cbmZ1bmN0aW9uIHNldFNjcm9sbCh4LCB5KSB7XG4gICAgY29udGV4dC50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpc1J1bm5pbmcgPSB0cnVlO1xuICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5tdXNpYyk7XG4gICAgdXBkYXRlKCk7XG59XG5cblxuZnVuY3Rpb24gc3RvcCgpIHtcbiAgICBpc1J1bm5pbmcgPSBmYWxzZTtcbiAgICBtdXNpYy5zdG9wKCk7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGlzUnVubmluZykge1xuICAgICAgICBzbG93ZG93bkNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHNsb3dkb3duQ291bnRlciA+PSBTTE9XRE9XTl9GQUNUT1IpIHtcbiAgICAgICAgICAgIHNsb3dkb3duQ291bnRlciAtPSBTTE9XRE9XTl9GQUNUT1I7XG4gICAgICAgICAgICBmcmFtZUNvdW50ZXIgKz0gMTtcblxuICAgICAgICAgICAgaWYgKHRpbWVOb3cgLSBmcmFtZVJhdGVTdGFydFRpbWUgPj0gMTAwMCAqIGZyYW1lUmF0ZVJlZnJlc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgIGZyYW1lUmF0ZVN0YXJ0VGltZSA9IHRpbWVOb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSBGSVhFRF9ERUxUQV9USU1FID9cbiAgICAgICAgICAgICAgICAxIC8gRlJBTUVfUkFURSA6XG4gICAgICAgICAgICAgICAgTWF0aC5taW4oKHRpbWVOb3cgLSBsYXN0VXBkYXRlKSAvICgxMDAwICogU0xPV0RPV05fRkFDVE9SKSwgLjA1KTtcblxuICAgICAgICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgY3VycmVudFNjZW5lLndpZHRoLCBjdXJyZW50U2NlbmUuaGVpZ2h0KTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoZGVsdGFUaW1lKTtcblxuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgICAgICAgICBsYXN0VXBkYXRlID0gdGltZU5vdztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbiAgICB9XG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgY2FzZSAndyc6XG4gICAgICAgICAgICAgICAgaWYgKFNMT1dET1dOX0ZBQ1RPUiA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93big4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93bigxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgU0NBTElORyk7XG4gICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcblxuICAgIC8vIFByZXBhcmUgYnV0dG9uXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGFydC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGUgPT4ge1xuICAgICAgICBlLnRhcmdldC5oaWRkZW4gPSB0cnVlO1xuICAgICAgICBzdGFydCgpO1xuICAgIH0pO1xuXG4gICAgLy8gbG9hZCBhbGwgc2NlbmVzIGFuZCBzdGFydCBnYW1lXG4gICAgcGxheWVyLmxvYWRBbGxTcHJpdGVzLnRoZW4oKCkgPT4ge1xuICAgICAgICBtYXBzLmxvYWRTY2VuZXMudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBtYXBzLnNjZW5lcy5DRUxFU1RFXzAxO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IDE7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuc2V0UGxheWVyKG5ldyBwbGF5ZXIuUGxheWVyKCkpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLnJlc2V0KCk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0LWJ1dHRvblwiKS5yZW1vdmVBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn07XG5cblxuLy8gR2FtZXBhZCBBUElcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiZ2FtZXBhZGNvbm5lY3RlZFwiLCAoZXZlbnQpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcIkEgZ2FtZXBhZCBjb25uZWN0ZWQ6XCIpO1xuICAgIGNvbnNvbGUubG9nKGV2ZW50LmdhbWVwYWQpO1xuICAgIGlucHV0cy5nYW1lcGFkUHJlc3NlZEJ1dHRvbnNbZXZlbnQuZ2FtZXBhZC5pbmRleF0gPSBuZXcgU2V0KCk7XG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkZGlzY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGRpc2Nvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IHVuZGVmaW5lZDtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IHNjZW5lID0gcmVxdWlyZSgnLi9zY2VuZScpO1xuY29uc3QgZWZmZWN0ID0gcmVxdWlyZSgnLi9lZmZlY3QnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MSAqIFUsIC1VLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCBzY2VuZTIuaGVpZ2h0IC0gMyAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgyICogVSwgc2NlbmUyLmhlaWdodCwgd2lkdGggKiBVLCAwLCBzY2VuZTEsIHgxICogVSwgMiAqIFUsIGluZGV4MSkpO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB5MSwgaW5kZXgxLCBzY2VuZTIsIHkyLCBpbmRleDIsIGhlaWdodCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsIHNjZW5lMS53aWR0aCAtIFUsIHkxICogVSwgaW5kZXgxKSk7XG59XG5cblxuY29uc3QgbG9hZFNjZW5lcyA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDEuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwMy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDQuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA1Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwNi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMDcuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTA4Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUwOS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTAuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTExLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxMi5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvY2VsZXN0ZTE0Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2NlbGVzdGUxNS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9jZWxlc3RlMTYuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwMS5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczAyLmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDMuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNC5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczA1Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuICAgICAgICBmZXRjaChcInRpbGVtYXBzL2xvdWlzMDYuanNvblwiKS50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSksXG4gICAgICAgIGZldGNoKFwidGlsZW1hcHMvbG91aXMwNy5qc29uXCIpLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKSxcbiAgICAgICAgZmV0Y2goXCJ0aWxlbWFwcy9sb3VpczA4Lmpzb25cIikudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpLFxuXG4gICAgXSkudGhlbihyZXNwb25zZXMgPT4ge1xuICAgICAgICBjb25zdCBzY2VuZU5hbWVzID0gW1xuICAgICAgICAgICAgXCJDRUxFU1RFXzAxXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDJcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wM1wiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA0XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDVcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wNlwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzA3XCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMDhcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8wOVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzEwXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTFcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xMlwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzEzXCIsXG4gICAgICAgICAgICBcIkNFTEVTVEVfMTRcIixcbiAgICAgICAgICAgIFwiQ0VMRVNURV8xNVwiLFxuICAgICAgICAgICAgXCJDRUxFU1RFXzE2XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAxXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAyXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzAzXCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA0XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA1XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA2XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA3XCIsXG4gICAgICAgICAgICBcIkxPVUlTXzA4XCIsXG4gICAgICAgIF07XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2NlbmVOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgc2NlbmVzW3NjZW5lTmFtZXNbaV1dID0gc2NlbmUuU2NlbmUuZnJvbUpTT04ocmVzcG9uc2VzW2ldKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIENFTEVTVEVfMDRcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzA0LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxNCAqIFUsIDEwICogVSwgMyAqIFUsIDIgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguNzUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxMCAqIFUsIDIzICogVSwgOSAqIFUsIC41KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDIzICogVSwgOSAqIFUsIDE0ICogVSwgMTAgKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIENFTEVTVEVfMDZcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzA2LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxMyAqIFUsIDMzICogVSwgNCAqIFUsIDIgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguNzUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCAzMyAqIFUsIDEzICogVSwgMjMgKiBVLCAuNDUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCAyMyAqIFUsIDEzICogVSwgMzMgKiBVLCAxLjUpLFxuICAgICAgICAgICAgXSkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIENFTEVTVEVfMDhcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzA4LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxNCAqIFUsIDE2ICogVSwgMiAqIFUsIDMgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguNzUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxNiAqIFUsIDIxICogVSwgMTIgKiBVLCAuNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgyMSAqIFUsIDEyICogVSwgMTQgKiBVLCAxNiAqIFUsIDIpLFxuICAgICAgICAgICAgXSkpKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQ0VMRVNURV8xNFxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDExICogVSwgMjkgKiBVLCA0ICogVSwgMiAqIFUsIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KC4yNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxMSAqIFUsIDI5ICogVSwgMTkgKiBVLCAyOSAqIFUsIC4zNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgxOSAqIFUsIDI5ICogVSwgMTEgKiBVLCAyOSAqIFUsIDEuNSksXG4gICAgICAgICAgICBdKSkpO1xuXG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMjYgKiBVLCAyOCAqIFUsIDUgKiBVLCAyICogVSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoLjI1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDI2ICogVSwgMjggKiBVLCAyNiAqIFUsIDIyICogVSwgLjM1KSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KDI2ICogVSwgMjIgKiBVLCAyNiAqIFUsIDI4ICogVSwgMS41KSxcbiAgICAgICAgICAgIF0pKSk7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBDRUxFU1RFXzE1XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMjQgKiBVLCA2ICogVSwgMiAqIFUsIDcgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguMjUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMjQgKiBVLCA2ICogVSwgMjQgKiBVLCAxNyAqIFUsIC4zNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCgyNCAqIFUsIDE3ICogVSwgMjQgKiBVLCA2ICogVSwgMS41KSxcbiAgICAgICAgICAgIF0pKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDUgKiBVLCBuZXcgcGh5c2ljcy5UaWxlRGF0YSg0MCkpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI1ICogVSwgNSAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcblxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzE1LmFkZFRoaW5nKHNwaWtlczEpO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkVGhpbmcoc3Bpa2VzMik7XG5cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzE1LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxNSAqIFUsIDIwICogVSwgMiAqIFUsIDQgKiBVLCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCguMjUpLFxuICAgICAgICAgICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoMTUgKiBVLCAyMCAqIFUsIDkgKiBVLCAyMCAqIFUsIC4zNSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgICAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCg5ICogVSwgMjAgKiBVLCAxNSAqIFUsIDIwICogVSwgMS41KSxcbiAgICAgICAgICAgIF0pKSk7XG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBMT1VJU18wNlxuICAgICAgICAgICAgc2NlbmVzLkxPVUlTXzA2LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMTEuNSAqIFUsIDE1ICogVSwgMCwgMyAqIFUsIHNjZW5lcy5MT1VJU18wOCwgVSwgMTMgKiBVLCAwKSk7XG4gICAgICAgICAgICBzY2VuZXMuTE9VSVNfMDguYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCAxMyAqIFUsIDAsIDMgKiBVLCBzY2VuZXMuTE9VSVNfMDYsIDEwICogVSwgMTUgKiBVLCAxKSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDEsIDMxLCAwLCBzY2VuZXMuQ0VMRVNURV8wMiwgMSwgMSwgNSk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDIsIDM0LCAwLCBzY2VuZXMuQ0VMRVNURV8wMywgMiwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDMsIDMzLCAwLCBzY2VuZXMuQ0VMRVNURV8wNCwgMywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDQsIDIxLCAwLCBzY2VuZXMuQ0VMRVNURV8wNSwgNCwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDUsIDIyLCAwLCBzY2VuZXMuQ0VMRVNURV8wNiwgMywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDcsIDI5LCAwLCBzY2VuZXMuQ0VMRVNURV8wNiwgMzAsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA2LCAzMCwgMiwgc2NlbmVzLkNFTEVTVEVfMDgsIDUsIDAsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA2LCAzNSwgMCwgc2NlbmVzLkNFTEVTVEVfMDksIDEsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzEwLCA3LCAwLCBzY2VuZXMuQ0VMRVNURV8wOSwgNywgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTEsIDgsIDEsIHNjZW5lcy5DRUxFU1RFXzEwLCA4LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8xMCwgMiwgMSwgc2NlbmVzLkNFTEVTVEVfMTIsIDQyLCAxLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8xMSwgMywgMCwgc2NlbmVzLkNFTEVTVEVfMTIsIDMsIDAsIDIpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA5LCAwLCAwLCBzY2VuZXMuQ0VMRVNURV8xMywgMCwgMCwgMTApO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzEzLCAuNSwgMSwgc2NlbmVzLkNFTEVTVEVfMTQsIDIyLjUsIDIsIDEwKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xNSwgMjIsIDEsIHNjZW5lcy5DRUxFU1RFXzE0LCA0LCAwLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xNiwgMTksIDAsIHNjZW5lcy5DRUxFU1RFXzE1LCAyLCAwLCAyKTtcblxuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMSwgMzUsIDAsIHNjZW5lcy5MT1VJU18wMiwgNCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAzLCAzLCAwLCBzY2VuZXMuTE9VSVNfMDIsIDEzLCAwLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMwLCAxLCBzY2VuZXMuTE9VSVNfMDIsIDIzLCAyLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDQsIDQsIDAsIHNjZW5lcy5MT1VJU18wMiwgMzUsIDMsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wNSwgMzMsIDAsIHNjZW5lcy5MT1VJU18wNiwgMSwgMSwgNSk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkxPVUlTXzA2LCA4LCAwLCBzY2VuZXMuTE9VSVNfMDcsIDgsIDEsIDYpO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbiAgICBsb2FkU2NlbmVzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG4vKipcbiAqIFRpbGVzIHNoZWV0XG4gKiBAdHlwZSB7SFRNTEltYWdlRWxlbWVudH1cbiAqL1xuY29uc3QgdGlsZXNldCA9IG5ldyBJbWFnZSgpO1xudGlsZXNldC5zcmMgPSAndGlsZW1hcHMvdGlsZXNldC5wbmcnO1xuXG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdG8gYmUgdXNlZCB3aGVuIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IG9mIHRoZSBzY2VuZVxuICovXG5jbGFzcyBUaWxlRGF0YSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHNoaWZ0WCA9IDAsIHNoaWZ0WSA9IDApIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LXBvc2l0aW9uIG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnggPSB0aGlzLmluZGV4ICUgODtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueSA9IHRoaXMuaW5kZXggPj4gMztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtb2Zmc2V0IHRvIGRyYXcgdGhlIHRpbGUgZnJvbSB0aGUgU2NlbmVFbGVtZW50J3MgcG9zaXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRYID0gc2hpZnRYO1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSBzaGlmdFk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0d28gc2VnbWVudHMgb24gYSAxRCBsaW5lIG92ZXJsYXAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFNjZW5lRWxlbWVudHMgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgYXBwZWFyIGluIGEgc2NlbmUgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZGVjb3JhdGlvbnMsIGV0Yy4pXG4gKlxuICogQWxsIEVsZW1lbnRzIGFyZSByZXByZXNlbnRlZCBhcyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgYW5kIHRoZSBzcGFjZSB0aGV5IG9jY3VweSBpbiBhIHNjZW5lIGlzIHRoZXJlZm9yZSBkZWZpbmVkXG4gKiBhcyBhIHBvc2l0aW9uICh4LCB5KSBhbmQgYSBzaXplICh3aWR0aCwgaGVpZ2h0KS4gQXQgYWxsIHRpbWVzLCBwb3NpdGlvbnMgYW5kIHNpemVzIHNob3VsZCBiZSBpbnRlZ2Vycy4gU3ViLWludGVnZXJcbiAqIHBvc2l0aW9ucyBhcmUgY29uc2lkZXJlZCB3aXRoIHRoZSB1c2Ugb2YgdGhlIGB4UmVtYWluZGVyYCBhbmQgYHlSZW1haW5kZXJgIGF0dHJpYnV0ZXMgKHRoYXQgc2hvdWxkIGhhdmUgYW4gYWJzb2x1dGVcbiAqIHZhbHVlIDwgMSlcbiAqL1xuY2xhc3MgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIG9mIHRoZSBsZWZ0bW9zdCBzaWRlIG9mIHRoZSBib3VuZGluZyBib3ggKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGluaXRpYWwgeC1jb29yZGluYXRlICh1c2VkIGZvciByZXNldCgpKVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydFggPSB4O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB5LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WSA9IHk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB3aWR0aCBvZiB0aGUgU2NlbmVFbGVtZW50IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBoZWlnaHQgb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHgtcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGZyYWN0aW9uYWwgcGFydCBvZiB0aGUgeS1wb3NpdGlvbiBvZiB0aGUgU2NlbmVFbGVtZW50IChwb3NpdGlvbiBvZiBhbiBlbGVtZW50IHNob3VsZCBhbHdheXMgYmUgYW4gaW50ZWdlcixcbiAgICAgICAgICogYnV0IGZyYWN0aW9uYWwgcGFydHMgb2YgdGhlIGNvbXB1dGVkIHBvc2l0aW9uIGNhbiBiZSByZW1lbWJlcmVkIGZvciBuZXh0IG1vdmUpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQW1vdW50IG1vdmVkIG9uIHRoZSB4LWF4aXMgc2luY2UgbGFzdCB1cGRhdGVcbiAgICAgICAgICogKHJlc2V0IGJ5IGJlZm9yZVVwZGF0ZSgpLCBpbmNyZW1lbnRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoaXMubW92ZSgpKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQW1vdW50IG1vdmVkIG9uIHRoZSB5LWF4aXMgc2luY2UgbGFzdCB1cGRhdGVcbiAgICAgICAgICogKHJlc2V0IGJ5IGJlZm9yZVVwZGF0ZSgpLCBpbmNyZW1lbnRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoaXMubW92ZSgpKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgU2NlbmVFbGVtZW50IHNob3VsZCBiZSBjb25zaWRlcmVkIGJ5IHRoZSBFbmdpbmUgb3Igbm90IChpbmFjdGl2ZSBTY2VuZUVsZW1lbnRzIGFyZSBpZ25vcmVkIHdoZW5cbiAgICAgICAgICogaW50ZXJhY3Rpb25zIGFyZSBjb21wdXRlZClcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSB0aWxlIHVzZWQgdG8gcmVwcmVzZW50IHRoZSBTY2VuZUVsZW1lbnQgKGlmIHJlcHJlc2VudGVkIGJ5IGEgc2luZ2xlIHRpbGUpXG4gICAgICAgICAqIEB0eXBlIHt1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbGVEYXRhID0gdGlsZURhdGE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDdXJyZW50IGVmZmVjdHMgYXBwbGllZCB0byB0aGUgU2NlbmVFbGVtZW50XG4gICAgICAgICAqIEB0eXBlIHtbRWZmZWN0XX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZWZmZWN0cyA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogU2NlbmUgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBpbmNsdWRlZFxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpY3Rpb25hcnkgb2YgdGltZXJzIChudW1iZXJzKSB0aGF0IGFyZSBhdXRvbWF0aWNhbGx5IGRlY3JlbWVudGVkIGF0IGVhY2ggdXBkYXRlXG4gICAgICAgICAqIEB0eXBlIHt7bnVtYmVyfX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgb2YgU2NlbmVFbGVtZW50cyB0aGF0IGFyZSBhdHRhY2hlZCB0byB0aGUgU2NlbmVFbGVtZW50XG4gICAgICAgICAqIFdoZW5ldmVyIGB0aGlzYCBpcyBtb3ZlZCwgYWxsIGF0dGFjaGVkIEVsZW1lbnRzIHdpbGwgYWxzbyBiZSBtb3ZlZCBieSB0aGUgc2FtZSBhbW91bnRcbiAgICAgICAgICpcbiAgICAgICAgICogV2FybmluZzogQmVjYXVzZSBvZiB0aGUgc3BlY2lhbCBjb25zdHJhaW50cyBvbiBBY3RvciBwb3NpdGlvbnMsIEFjdG9ycyBzaG91bGQgbm90IGJlIGF0dGFjaGVkIHRvIGFcbiAgICAgICAgICogU2NlbmVFbGVtZW50LiBUaGUgcGFydGljdWxhciBjYXNlIG9mIEFjdG9ycyBcInJpZGluZ1wiIGEgU29saWQgaXMgaGFuZGxlZCBzZXBhcmF0ZWx5IGluIHRoZSBTb2xpZC5tb3ZlKClcbiAgICAgICAgICogbWV0aG9kLlxuICAgICAgICAgKiBAdHlwZSB7U2V0PFNjZW5lRWxlbWVudD59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMgPSBuZXcgU2V0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBib3VuZGluZyByZWN0YW5nbGUgb2YgYHRoaXNgIG92ZXJsYXBzIHRoZSBib3VuZGluZyByZWN0YW5nbGUgb2YgYG90aGVyYC5cbiAgICAgKlxuICAgICAqIFR3byBTY2VuZUVsZW1lbnRzIG92ZXJsYXAgaWYgZm9yIGJvdGggZGltZW5zaW9ucyB0aGUgZW5kIHBvc2l0aW9uIG9mIGVhY2ggU2NlbmVFbGVtZW50IGlzIHN0cmljdGx5IGdyZWF0ZXIgdGhhblxuICAgICAqIHRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgb3RoZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3RoZXIge1NjZW5lRWxlbWVudH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxib29sZWFufVxuICAgICAqL1xuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyB0aGUgU2NlbmVFbGVtZW50IGluIHRoZSBDYW52YXMgYXNzb2NpYXRlZCB0byB0aGUgQ29udGV4dCBnaXZlbiBhcyBhcmd1bWVudFxuICAgICAqIEBwYXJhbSBjdHgge0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY29udGV4dCBvZiB0aGUgY2FudmFzIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgZHJhd25cbiAgICAgKi9cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzZXQsXG4gICAgICAgICAgICAgICAgMTYgKiB0aGlzLnRpbGVEYXRhLngsIDE2ICogdGhpcy50aWxlRGF0YS55LFxuICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICB0aGlzLnggKyB0aGlzLnRpbGVEYXRhLnNoaWZ0WCwgdGhpcy55ICsgdGhpcy50aWxlRGF0YS5zaGlmdFksXG4gICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBwcm9wZXJ0aWVzIGF0IHRoZSBzdGFydCBvZiBhIG5ldyB1cGRhdGUgb2YgdGhlIFNjZW5lXG4gICAgICovXG4gICAgYmVmb3JlVXBkYXRlKCkge1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHN0YXRlIG9mIHRoZSBTY2VuZUVsZW1lbnQgKGNhbGxlZCBhdCBlYWNoIGZyYW1lIHdoZW4gdGhlIFNjZW5lIGlzIGFjdGl2ZSlcbiAgICAgKiBAcGFyYW0gZGVsdGFUaW1lIHtudW1iZXJ9IHRpbWUgZWxhcHNlZCBzaW5jZSBsYXN0IHVwZGF0ZSAoaW4gc2Vjb25kcylcbiAgICAgKi9cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIC8vIHVwZGF0ZSB0aW1lcnNcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdXBkYXRlIGVmZmVjdHNcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5lZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QudXBkYXRlKGRlbHRhVGltZSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyB0aGUgU2NlbmVFbGVtZW50IGJ5IGEgZ2l2ZW4gYW1vdW50XG4gICAgICogQHBhcmFtIGR4IHtudW1iZXJ9IG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSByaWdodFxuICAgICAqIEBwYXJhbSBkeSB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgZG93blxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIC8vIG1vdmUgYWxsIGVsZW1lbnRzIGF0dGFjaGVkIHRvIHRoaXNcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLmF0dGFjaGVkRWxlbWVudHMpIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmUoZHgsIGR5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIFNjZW5lIEVsZW1lbnQgdG8gYSBnaXZlbiBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB4IHtudW1iZXJ9IHgtY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHkge251bWJlcn0geS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKi9cbiAgICBtb3ZlVG8oeCwgeSkge1xuICAgICAgICB0aGlzLm1vdmUoeCAtIHRoaXMueCAtIHRoaXMueFJlbWFpbmRlciwgeSAtIHRoaXMueSAtIHRoaXMueVJlbWFpbmRlcik7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMuc3RhcnRYO1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnN0YXJ0WTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIGZvciAoY29uc3QgdGltZXIgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RpbWVyXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lZmZlY3RzLmxlbmd0aCA9IDA7ICAgIC8vIGNsZWFyIGFsbCBlZmZlY3RzXG4gICAgfVxuXG4gICAgYWRkRWZmZWN0KGVmZmVjdCkge1xuICAgICAgICB0aGlzLmVmZmVjdHMucHVzaChlZmZlY3QpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVFZmZlY3QoZWZmZWN0KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5lZmZlY3RzLmluZGV4T2YoZWZmZWN0KTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5lZmZlY3RzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoZXMgYSBnaXZlbiBTY2VuZUVsZW1lbnQgdG8gdGhpc1xuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnQgdG8gYXR0YWNoXG4gICAgICovXG4gICAgYXR0YWNoKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmFkZChlbGVtZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRhY2hlcyBhIGdpdmVuIFNjZW5lRWxlbWVudCB0byB0aGlzXG4gICAgICogQHBhcmFtIGVsZW1lbnQge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudCB0byBkZXRhY2hcbiAgICAgKi9cbiAgICBkZXRhY2goZWxlbWVudHMpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBBY3RvcnMgYXJlIFNjZW5lRWxlbWVudHMgaW4gYSBTY2VuZSB0aGF0IGNhbm5vdCBwYXNzIHRocm91Z2ggU29saWRzIChwbGF5ZXIgY2hhcmFjdGVycyBhbmQgZW5lbWllcyBmb3IgaW5zdGFuY2UpXG4gKi9cbmNsYXNzIEFjdG9yIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB4LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWChhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdYID0gdGhpcy54ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCAtIHRoaXMud2lkdGggPCBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCArIHNvbGlkLndpZHRoID4gbmV3WCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ggPSBzb2xpZC54ICsgc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR4ID0gbmV3WCAtIHRoaXMueDtcbiAgICAgICAgICAgIHRoaXMueCA9IG5ld1g7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gZHg7ICAgICAgLy8gaWYgbW92ZW1lbnQgd2FzIHN0b3BwZWQgYnkgYSBTb2xpZCwgbW92ZWQgZGlzdGFuY2UgaXMgYW4gaW50ZWdlclxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBhbW91bnQ7ICAvLyBpZiBtb3ZlbWVudCB3YXMgbm90IHN0b3BwZWQsIG1vdmVkIGRpc3RhbmNlIG1pZ2h0IGJlIGZyYWN0aW9uYWxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIG1vdmVtZW50IHRoYXQgaXMgaW5zdWZmaWNpZW50IHRvIG1vdmUgYnkgYSBwaXhlbCBpcyBzdGlsbCBjb3VudGVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlIHRoZSBBY3RvciBhIGdpdmVuIGFtb3VudCBvbiB0aGUgeS1heGlzXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCB0cmllcyB0byBtb3ZlIHRoZSBBY3RvciBieSB0aGUgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXMgYnV0IHN0b3BzIGlmIHRoZXJlIGlzIGEgY29sbGlzaW9uIHdpdGggYVxuICAgICAqIFNvbGlkICh0aGUgcG9zaXRpb24gaXMgc2V0IGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgb3ZlcmxhcCB3aXRoIHRoZSBTb2xpZCkuIElmIHRoZXJlIHdhcyBhIGNvbGxpc2lvbiwgdGhlIGZ1bmN0aW9uXG4gICAgICogZ2l2ZW4gYXMgcGFyYW1ldGVyIGlzIGNhbGxlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhbW91bnQge251bWJlcn0gYW1vdW50IHRvIG1vdmUgb24gdGhlIHgtYXhpc1xuICAgICAqIEBwYXJhbSBvbkNvbGxpZGUge2Z1bmN0aW9uKCl9IGZ1bmN0aW9uIHRvIHJ1biBpZiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkXG4gICAgICovXG4gICAgbW92ZVkoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WSA9IHRoaXMueSArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgLSB0aGlzLmhlaWdodCA8IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSAtIHRoaXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSArIHNvbGlkLmhlaWdodCA+IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSArIHNvbGlkLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHkgPSBuZXdZIC0gdGhpcy55O1xuICAgICAgICAgICAgdGhpcy55ID0gbmV3WTtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBkeTsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgY3VycmVudGx5IFwicmlkaW5nXCIgdGhlIFNvbGlkIGdpdmVuIGFzIHBhcmFtZXRlciwgbWVhbmluZyB0aGF0IHdoZW4gdGhlIFNvbGlkXG4gICAgICogbW92ZXMgaXQgc2hvdWxkIG1vdmUgdGhlIEFjdG9yIHRvby5cbiAgICAgKiBBbiBBY3RvciBpcyBjb25zaWRlcmVkIHRvIGJlIHJpZGluZyBhIFNvbGlkIGl0IGlzIHN0YW5kaW5nIGRpcmVjdGx5IG9uIHRvcCBvZiBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzb2xpZCB7U29saWR9XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgdGhlIEFjdG9yIGlzIHJpZGluZyB0aGUgc29saWRcbiAgICAgKi9cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gdGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjYWxsIHdoZW4gdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZCB3aGlsZSBiZWluZyBwdXNoZWQgYnkgYW5vdGhlclxuICAgICAqL1xuICAgIHNxdWlzaCgpIHt9XG59XG5cblxuLyoqXG4gKiBTb2xpZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBBY3RvcnMgY2Fubm90IHBhc3MgdGhyb3VnaC4gVGhlcmUgc2hvdWxkIG5ldmVyIGJlIGFuIEFjdG9yIG92ZXJsYXBwaW5nIGEgU29saWQgKHVubGVzc1xuICogZWl0aGVyIG9uZSBpcyBtYXJrZWQgYXMgaW5hY3RpdmUpLiBXaGVuIFNvbGlkcyBtb3ZlLCB0aGV5IGludGVyYWN0IHdpdGggQWN0b3JzIHRoYXQgbWlnaHQgb3RoZXJ3aXNlIG92ZXJsYXAgKHRoZXlcbiAqIG1pZ2h0IHB1c2ggdGhlbSwga2lsbCB0aGVtLCBldGMuKS5cbiAqXG4gKiBUd28gU29saWRzIG1pZ2h0IG92ZXJsYXAsIGFuZCBpbiBnZW5lcmFsIHRoZSBtb3ZlbWVudCBvZiBhIFNvbGlkIGlzIG5vdCBhZmZlY3RlZCBieSBvdGhlciBTb2xpZHMuXG4gKi9cbmNsYXNzIFNvbGlkIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBTb2xpZCBzaG91bGQgYmUgY29uc2lkZXJlZCB3aGVuIGNoZWNraW5nIGNvbGxpc2lvbnMgd2l0aCBhbiBBY3RvclxuICAgICAgICAgKiBUaGlzIGF0dHJpYnV0ZSBpcyB1c2VkIGF1dG9tYXRpY2FsbHkgYnkgdGhlIG1vdmUoKSBtZXRob2Qgd2hlbiB0aGUgU29saWQgcHVzaGVzIGFuIEFjdG9yLiBJdCBzaG91bGQgbm90IGJlXG4gICAgICAgICAqIGNoYW5nZWQgaW4gb3RoZXIgY2lyY3Vtc3RhbmNlcyAodXNlIGlzQWN0aXZlIHRvIGRpc2FibGUgdGhlIFNvbGlkKS5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogTW9tZW50dW0gb24gdGhlIHgtYXhpcyBnaXZlbiB0byBBY3RvcnMgcmlkaW5nIHRoZSBTb2xpZCAoaW4gcGl4ZWxzL3MpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb21lbnR1bSBvbiB0aGUgeS1heGlzIGdpdmVuIHRvIEFjdG9ycyByaWRpbmcgdGhlIFNvbGlkIChpbiBwaXhlbHMvcylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIHVzZWQgdG8gc3RvcmUgbW9tZW50dW0gZm9yIGEgZmV3IGZyYW1lcyBhZnRlciB0aGUgU29saWQgc3RvcHMgbW92aW5nXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHRoZSBtb21lbnR1bSBvZiB0aGUgc29saWQgb24gdGhlIHgtYXhpcyBpZiB0aGUgbW9tZW50dW0gY291bnRlciBoYXMgbm90IGV4cGlyZWQgKDAgb3RoZXJ3aXNlKVxuICAgICAqL1xuICAgIGdldE1vbWVudHVtWCgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1YO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHRoZSBtb21lbnR1bSBvZiB0aGUgc29saWQgb24gdGhlIHgtYXhpcyBpZiB0aGUgbW9tZW50dW0gY291bnRlciBoYXMgbm90IGV4cGlyZWQgKDAgb3RoZXJ3aXNlKVxuICAgICAqL1xuICAgIGdldE1vbWVudHVtWSgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1ZO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54IC0gYWN0b3IueCAtIGFjdG9yLndpZHRoLCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPiBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSArIHRoaXMuaGVpZ2h0IC0gYWN0b3IueSwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZIDwgbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgLSBhY3Rvci55IC0gYWN0b3IuaGVpZ2h0LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtKG14LCBteSkge1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IGNvbnN0YW50cy5NT01FTlRVTV9TVE9SRV9USU1FO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IG14O1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IG15O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgU29saWQgaXMgY29uc2lkZXJlZCB0byBjb2xsaWRlIHdpdGggYW4gQWN0b3IgbW92aW5nIGJ5IGEgZ2l2ZW4gYW1vdW50IGluIGJvdGggYXhlcy5cbiAgICAgKlxuICAgICAqIFRvIHNpbXBsaWZ5IHRoZSBjb21wdXRhdGlvbiwgdGhlIGZ1bmN0aW9uIGNoZWNrcyBpZiB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBzb2xpZCBvdmVybGFwcyB3aXRoIHRoZSBzbWFsbGVzdFxuICAgICAqIHJlY3RhbmdsZSBjb250YWluaW5nIHRoZSBhcmVhcyBvY2N1cGllZCBieSB0aGUgQWN0b3IgYXQgdGhlIHN0YXJ0IGFuZCBlbmQgb2YgaXRzIG1vdmVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGFjdG9yIHtBY3Rvcn1cbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeC1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeS1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgU29saWQgb3ZlcmxhcHMgdGhlIEFjdG9yIGF0IGFueSBwb2ludCBkdXJpbmcgaXRzIG1vdmVtZW50XG4gICAgICovXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogSGF6YXJkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IGtpbGwgdGhlIHBsYXllciBvbiBjb250YWN0XG4gKi9cbmNsYXNzIEhhemFyZCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBQbGF0Zm9ybXMgYXJlIGZsYXQgU29saWRzICgwIGhlaWdodCkgdGhhdCBBY3RvcnMgY2FuIHBhc3MgdGhyb3VnaCB3aGVuIG1vdmluZyB1cHdhcmRzIGJ1dCBub3QgZG93bndhcmRzIChpZiB0aGV5IGFyZVxuICogZW50aXJlbHkgaGlnaGVyIHRoYW4gdGhlIFBsYXRmb3JtKVxuICpcbiAqIENvbnRyYXJ5IHRvIHJlZ3VsYXIgU29saWRzLCBQbGF0Zm9ybXMgYXJlIGFsbG93ZWQgdG8gb3ZlcmxhcCB3aXRoIEFjdG9ycy5cbiAqL1xuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCAwLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0IDw9IHRoaXMueSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgKyBkeSA+IHRoaXMueTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3ByaW5ncyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRocm93IEFjdG9ycyB1cCBvbiBjb250YWN0XG4gKi9cbmNsYXNzIFNwcmluZyBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCBVLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLnRpbGVEYXRhLnNoaWZ0WSA9IC1VIC8gMjtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuc3ByaW5nU291bmQpO1xuICAgICAgICBwbGF5ZXIuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0JPVU5DRSk7XG4gICAgICAgIHBsYXllci5zcGVlZFggPSAwO1xuICAgICAgICBwbGF5ZXIuc3BlZWRZID0gY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgcGxheWVyLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogRGFzaERpYW1vbmRzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgcmVzdG9yZSB0aGUgZGFzaCBjb3VudGVyIG9mIHRoZSBQbGF5ZXJzIHdobyB0b3VjaCB0aGVtXG4gKi9cbmNsYXNzIERhc2hEaWFtb25kIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKVxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUgJiYgdGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLnJlc3RvcmVEYXNoKCkpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5kYXNoRGlhbW9uZFNvdW5kKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTdHJhd2JlcnJpZXMgYXJlIGNvbGxlY3RpYmxlcyB0aGF0IFBsYXllciB0YWtlIG9uIGNvbnRhY3QuXG4gKiBJZiBhIFBsYXllciBkaWVzIGFmdGVyIGNvbGxlY3RpbmcgYSBTdHJhd2JlcnJ5IGJlZm9yZSBjaGFuZ2luZyBTY2VuZSwgdGhlIFN0cmF3YmVycnkgaXMgcmVzdG9yZWQgaW4gdGhlIFNjZW5lXG4gKiAoYW5kIHJlbW92ZWQgZnJvbSB0aGUgUGxheWVyJ3MgbGlzdCBvZiBjb2xsZWN0ZWQgU3RyYXdiZXJyaWVzKVxuICovXG5jbGFzcyBTdHJhd2JlcnJ5IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnN0cmF3YmVycnlTb3VuZCk7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmFuc2l0aW9ucyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRyYW5zZmVyIGEgUGxheWVyIGZyb20gb25lIFNjZW5lIHRvIGFub3RoZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZSB0byB3aGljaCB0aGUgUGxheWVyIGlzIHRha2VuIHdoZW4gdG91Y2hpbmcgdGhlIFRyYW5zaXRpb25cbiAgICAgICAgICogQHR5cGUge1NjZW5lfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIGluIHRoZSB0YXJnZXQgU2NlbmUgY29ycmVzcG9uZGluZyB0byB0aGlzLnggKHdoZW4gdGhlIFBsYXllciB0cmFuc2l0aW9ucyB0byB0aGUgdGFyZ2V0IFNjZW5lLFxuICAgICAgICAgKiBpdHMgcG9zaXRpb24gaXMgc2V0IHRvIGl0cyBjdXJyZW50IHgtcG9zaXRpb24gKyB0aGlzLnRhcmdldFggLSB0aGlzLnhcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueSAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeS1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WSArIHRoaXMueVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBpbmRleCBvZiB0aGUgc3Bhd24gcG9pbnQgKGluIHRoZSB0YXJnZXQgU2NlbmUncyBsaXN0IG9mIHNwYXduIHBvaW50cykgY29ycmVzcG9uZGluZyB0byB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSBzcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZS5yZXNldCgpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgcGxheWVyLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENydW1ibGluZ0Jsb2NrcyBhcmUgU29saWRzIHRoYXQgZGlzYXBwZWFyIHNob3J0bHkgYWZ0ZXIgYSBQbGF5ZXIgaGl0cyBpdCAob25seSB3aGVuIHRoZSBQbGF5ZXIgaXMgY29uc2lkZXJlZCB0byBiZVxuICogXCJjYXJyaWVkXCIgYnkgdGhlIENydW1ibGluZ0Jsb2NrKS5cbiAqIFRoZXkgcmVhcHBlYXIgYWZ0ZXIgYSBnaXZlbiB0aW1lIChpZiB0aGVyZSBhcmUgbm8gQWN0b3JzIG9uIHRoZWlyIHBvc2l0aW9uKVxuICovXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBpcyBkaXNhcHBlYXJpbmdcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIGRpc2FwcGVhcmFuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIHJlYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmZhbGwgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjsgICAvLyBkdXJhdGlvbiBiZWZvcmUgcmVhcHBlYXJpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVjb21lQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkQmVjb21lQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNob3VsZEJlY29tZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zY2VuZS5wbGF5ZXIgJiYgdGhpcy5zY2VuZS5wbGF5ZXIuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuY3J1bWJsaW5nQmxvY2tTb3VuZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTsgIC8vIGR1cmF0aW9uIGJlZm9yZSBkaXNhcHBlYXJpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IDIgKiB0aGlzLnRpbWVycy5mYWxsO1xuICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gYWxwaGE7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFRyaWdnZXJCbG9ja3MgYXJlIFNvbGlkcyB0aGF0IHN0YXJ0IG1vdmluZyB3aGVuIGFuIEFjdG9yIGlzIGNhcnJpZWQgYnkgdGhlbVxuICovXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBtb3ZlbWVudCB0byBleGVjdXRlIHdoZW4gdHJpZ2dlcmVkIGJ5IGFuIEFjdG9yXG4gICAgICAgICAqIEB0eXBlIHtFZmZlY3R9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaWxlIGluZGV4ZXMgdG8gdXNlIHdoZW4gZHJhd2luZyB0aGUgVHJpZ2dlckJsb2NrIG9uIHRoZSBTY2VuZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyW119XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXMgPSBuZXcgQXJyYXkoKHdpZHRoIC8gVSkgKiAoaGVpZ2h0IC8gVSkpLmZpbGwoMCkubWFwKF8gPT4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMuc2NlbmUucGxheWVyO1xuICAgICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5lZmZlY3RzLmluY2x1ZGVzKHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpICYmIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVtYWluaW5nQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUVmZmVjdCh0aGlzLnRyaWdnZXJlZE1vdmVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5lZmZlY3RzLmluY2x1ZGVzKHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpICYmIHBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVmZmVjdCh0aGlzLnRyaWdnZXJlZE1vdmVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlc2V0KCk7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgZm9yIChsZXQgeCA9IHRoaXMueDsgeCA8IHRoaXMueCArIHRoaXMud2lkdGg7IHggKz0gVSkge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IHRoaXMueTsgeSA8IHRoaXMueSArIHRoaXMuaGVpZ2h0OyB5ICs9IFUpIHtcbiAgICAgICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgICAgICB0aWxlc2V0LFxuICAgICAgICAgICAgICAgICAgICAxNiAqIHRoaXMuc3ByaXRlSW5kZXhlc1tpbmRleF0sIDE2ICogOCxcbiAgICAgICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgICAgICB4LCB5LFxuICAgICAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzVXAgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgZG93bndhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzVXAgZXh0ZW5kcyBIYXphcmQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHRpbGVEYXRhLnNoaWZ0WSA9IC1VIC8gMjtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCBVLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzRG93biBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyB1cHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzRG93biBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWSAtIHRoaXMubW92ZWRZIDwgMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzUmlnaHQgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgbGVmdHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzUmlnaHQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUgLyAyLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFggLSB0aGlzLm1vdmVkWCA8IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1VwIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIHJpZ2h0d2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNMZWZ0IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICB0aWxlRGF0YS5zaGlmdFggPSAtVSAvIDI7XG4gICAgICAgIHN1cGVyKHggKyBVIC8gMiwgeSwgVSAvIDIsIFUsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWCAtIHRoaXMubW92ZWRYID4gMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNlZ21lbnRzT3ZlcmxhcCxcbiAgICBUaWxlRGF0YSxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgQ3J1bWJsaW5nQmxvY2ssXG4gICAgU3Bpa2VzVXAsXG4gICAgU3Bpa2VzRG93bixcbiAgICBTcGlrZXNMZWZ0LFxuICAgIFNwaWtlc1JpZ2h0LFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IEFOSU1BVElPTl9TTE9XRE9XTiA9IDY7XG5jb25zdCBBTklNQVRJT05fSURMRSA9IFs0LCA0XTtcbmNvbnN0IEFOSU1BVElPTl9SVU4gPSBbMSwgNl07XG5jb25zdCBBTklNQVRJT05fSlVNUCA9IFs2LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9GQUxMID0gWzUsIDNdO1xuY29uc3QgQU5JTUFUSU9OX0RJRSA9IFswLCA4XTtcblxuY29uc3Qgc3ByaXRlc1NoZWV0cyA9IHt9O1xuXG5cbmZ1bmN0aW9uIGxvYWRTcHJpdGVzKGNvbG9yKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4ge1xuICAgICAgICAgICAgc3ByaXRlc1NoZWV0c1tjb2xvcl0gPSBpbWFnZTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGltYWdlLnNyYyA9IGBpbWFnZXMvaGVyb18ke2NvbG9yfS5wbmdgO1xuICAgIH0pO1xufVxuXG5cbmNvbnN0IGxvYWRBbGxTcHJpdGVzID0gUHJvbWlzZS5hbGwoW1xuICAgIGxvYWRTcHJpdGVzKCdyZWQnKSxcbiAgICBsb2FkU3ByaXRlcygnZ3JlZW4nKSxcbiAgICBsb2FkU3ByaXRlcygnYmx1ZScpLFxuXSk7XG5cblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwLCBjb2xvck5hbWUgPSAnYmx1ZScpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgOCwgMTQpO1xuICAgICAgICB0aGlzLmNvbG9yTmFtZSA9IGNvbG9yTmFtZTtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuXG4gICAgICAgIHRoaXMuaW5wdXRzID0gbmV3IGlucHV0cy5QbGF5ZXJJbnB1dHM7XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcblxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzLlNUQVRFX05PUk1BTDtcbiAgICAgICAgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gMTtcbiAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gMTtcbiAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gNDtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG5cbiAgICAgICAgLy8gdGltZXJzXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IH5+KHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgLyBBTklNQVRJT05fU0xPV0RPV04pO1xuICAgICAgICBjb25zdCByb3cgPSA0ICogdGhpcy5zcHJpdGVfcm93ICsgKHRoaXMubmJEYXNoZXMgPyAwIDogMikgKyAodGhpcy5zcHJpdGVfZGlyZWN0aW9uID09PSAtMSA/IDEgOiAwKTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldHNbdGhpcy5jb2xvck5hbWVdLFxuICAgICAgICAgICAgMTYgKiBpbmRleCwgMTYgKiByb3csXG4gICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICB0aGlzLnggLSA0LCB0aGlzLnkgLSAyLFxuICAgICAgICAgICAgMTYsIDE2KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmlucHV0cy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciArPSAxO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICU9IHRoaXMubmJfc3ByaXRlcyAqIEFOSU1BVElPTl9TTE9XRE9XTjtcblxuICAgICAgICAvLyBjaGVjayBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5jbGVhcigpO1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIHN0YW5kaW5nIG9uIGEgc29saWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc29saWQuY2FuQmVDbGltYmVkICYmIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHdhbGxzIG9uIHJpZ2h0IGFuZCBsZWZ0IGF0IGRpc3RhbmNlIDw9IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZUxlZnQgPSB0aGlzLnggLSBzb2xpZC54IC0gc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlTGVmdCAmJiBkaXN0YW5jZUxlZnQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZVJpZ2h0ID0gc29saWQueCAtIHRoaXMueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlUmlnaHQgJiYgZGlzdGFuY2VSaWdodCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy54ICsgdGhpcy53aWR0aCA9PT0gc29saWQueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy54ID09PSBzb2xpZC54ICsgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBwbGF5ZXIgaXMgaHVnZ2luZyBhIHdhbGxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSBjb25zdGFudHMuSlVNUF9HUkFDRV9USU1FO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IGNvbnN0YW50cy5TVEFURV9EQVNIIHx8IHRoaXMuZGFzaFNwZWVkWSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnVwZGF0ZUFuaW1hdGlvbigpO1xuXG4gICAgICAgIHRoaXMubW92ZVgodGhpcy5zcGVlZFggKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRYID0gMCk7XG4gICAgICAgIHRoaXMubW92ZVkodGhpcy5zcGVlZFkgKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRZID0gMCk7XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBUaGluZ3NcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5zY2VuZS50aGluZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpbmcuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyh0aGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpbmcub25Db250YWN0V2l0aCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55ID49IHRoaXMuc2NlbmUuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZHlpbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjZW5lLnNob3VsZFJlc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBIZWxkICYmIHRoaXMudGltZXJzLnZhckp1bXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFksIC1jb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyICYmXG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPD0gMCAmJlxuICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzIHx8IHRoaXMuaW5wdXRzLnlBeGlzKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhc2hTcGVlZCA9IHRoaXMuaW5wdXRzLnhBeGlzICYmIHRoaXMuaW5wdXRzLnlBeGlzID8gY29uc3RhbnRzLkRBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuREFTSF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IHRoaXMuaW5wdXRzLnhBeGlzICogTWF0aC5tYXgoTWF0aC5hYnModGhpcy5zcGVlZFgpLCBkYXNoU3BlZWQpO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gLXRoaXMuaW5wdXRzLnlBeGlzICogZGFzaFNwZWVkO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9EQVNIKTtcbiAgICAgICAgICAgIHRoaXMubmJEYXNoZXMgLT0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkge1xuICAgICAgICBsZXQgZGlkSnVtcCA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgdGhpcy50aW1lcnMuanVtcEdyYWNlID4gMCkge1xuICAgICAgICAgICAgLy8gcmVndWxhciBqdW1wXG4gICAgICAgICAgICB0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gdGhpcy5pbnB1dHMueEF4aXMgKiBjb25zdGFudHMuSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaWRKdW1wKSB7XG4gICAgICAgICAgICBsZXQgbXggPSAwO1xuICAgICAgICAgICAgbGV0IG15ID0gMDtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5jYXJyeWluZ1NvbGlkcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN4ID0gc29saWQuZ2V0TW9tZW50dW1YKCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3kgPSBzb2xpZC5nZXRNb21lbnR1bVkoKTtcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoc3gpID4gTWF0aC5hYnMobXgpKSBteCA9IHN4O1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeSkgPiBNYXRoLmFicyhteSkpIG15ID0gc3k7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogbXg7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogbXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZEp1bXA7XG4gICAgfVxuXG4gICAgdXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IHRoaXMuaW5wdXRzLnhBeGlzO1xuXG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQ0xJTUJfVVBfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5NQVhfRkFMTF9TUEVFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVBbmltYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9SVU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSlVNUCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXRlKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gbGVhdmUgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChuZXdTdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGVudGVyIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5qdW1wU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gY29uc3RhbnRzLlZBUl9KVU1QX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5kYXNoU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IGNvbnN0YW50cy5EQVNIX1RJTUUgKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRpZVNvdW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSBjb25zdGFudHMuRFlJTkdfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSBjb25zdGFudHMuQk9VTkNFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWFrZVRyYW5zaXRpb24odHJhbnNpdGlvbikge1xuICAgICAgICAvLyB2YWxpZGF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVUaGluZyhzdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzLmFkZChzdHJhd2JlcnJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNjZW5lLnNldFBsYXllcih1bmRlZmluZWQpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNldFBsYXllcih0aGlzKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5zcGF3blBvaW50SW5kZXggPSB0cmFuc2l0aW9uLnNwYXduUG9pbnRJbmRleDtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5zY2VuZS5zcGF3blBvaW50c1t0aGlzLnNjZW5lLnNwYXduUG9pbnRJbmRleF07XG4gICAgICAgIHRoaXMueCA9IHBvaW50Lng7XG4gICAgICAgIHRoaXMueSA9IHBvaW50LnkgLSA2O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiBzb2xpZC54ICsgc29saWQud2lkdGggPT09IHRoaXMueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHNvbGlkLnggPT09IHRoaXMueCArIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBzZXRBbmltYXRpb24oc3ByaXRlX3JvdywgbmJfc3ByaXRlcykge1xuICAgICAgICBpZiAoc3ByaXRlX3JvdyAhPT0gdGhpcy5zcHJpdGVfcm93KSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZV9yb3cgPSBzcHJpdGVfcm93O1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLm5iX3Nwcml0ZXMgPSBuYl9zcHJpdGVzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbiAgICBsb2FkQWxsU3ByaXRlcyxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21KU09OKGRhdGEpIHtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoZGF0YS53aWR0aCAqIFUsIGRhdGEuaGVpZ2h0ICogVSk7XG4gICAgICAgIC8vIG1ha2Ugd2FsbHNcbiAgICAgICAgY29uc3Qgd2FsbHMgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgtLjUgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKChkYXRhLndpZHRoICsgLjUpICogVSwgMCwgMCwgZGF0YS5oZWlnaHQgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IChpbmRleCAtIDEpICUgOCxcbiAgICAgICAgICAgICAgICAgICAgeTogfn4oKGluZGV4IC0gMSkgLyA4KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRYOiAwLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFk6IDAsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMiwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuc3Bhd25Qb2ludHMucHVzaCh7eDogeCwgeTogeX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDU6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNVcCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNEb3duKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCArIFUgLyAyLCB5ICsgVSAvIDIsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLkNydW1ibGluZ0Jsb2NrKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5Tb2xpZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIHZpZXdcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA+IC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2lkdGggLSBjb25zdGFudHMuVklFV19XSURUSCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA8IC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA+IC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAtIGNvbnN0YW50cy5WSUVXX0hFSUdIVCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFkgPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgVSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkUmVzZXQpIHtcbiAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRQbGF5ZXIocGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVBY3Rvcih0aGlzLnBsYXllcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgdGhpcy5hZGRBY3RvcihwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgIH1cblxuICAgIGFkZEFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmFkZChhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5kZWxldGUoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMucmVtb3ZlKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkVGhpbmcodGhpbmcpIHtcbiAgICAgICAgdGhpcy50aGluZ3MuYWRkKHRoaW5nKTtcbiAgICAgICAgdGhpbmcuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmRlbGV0ZSh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTY2VuZSxcbn1cbiIsImNvbnN0IGp1bXBTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfanVtcC5vZ2cnKTtcbmNvbnN0IGRhc2hTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfZGFzaF9waW5rX2xlZnQub2dnJyk7XG5jb25zdCBkaWVTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfZGVhdGgub2dnJyk7XG5jb25zdCBjcnVtYmxpbmdCbG9ja1NvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9mYWxsYmxvY2tfc2hha2Uub2dnJyk7XG5jb25zdCBzdHJhd2JlcnJ5U291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3N0cmF3YmVycnlfcmVkX2dldF8xdXAub2dnJyk7XG5jb25zdCBkYXNoRGlhbW9uZFNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9kaWFtb25kX3RvdWNoXzAxLm9nZycpO1xuY29uc3Qgc3ByaW5nU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3NwcmluZy5vZ2cnKTtcblxuY29uc3QgbXVzaWMgPSBuZXcgQXVkaW8oJ3NvdW5kL2JnX211c2ljLndhdicpO1xubXVzaWMubG9vcCA9IHRydWU7XG5tdXNpYy52b2x1bWUgPSAuNTtcblxuXG5mdW5jdGlvbiBwbGF5U291bmQoc291bmQpIHtcbiAgICBzb3VuZC5jdXJyZW50VGltZSA9IDA7XG4gICAgc291bmQucGxheSgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBsYXlTb3VuZCxcbiAgICBqdW1wU291bmQsXG4gICAgZGFzaFNvdW5kLFxuICAgIGRpZVNvdW5kLFxuICAgIGNydW1ibGluZ0Jsb2NrU291bmQsXG4gICAgc3RyYXdiZXJyeVNvdW5kLFxuICAgIGRhc2hEaWFtb25kU291bmQsXG4gICAgc3ByaW5nU291bmQsXG4gICAgbXVzaWMsXG59Il19
