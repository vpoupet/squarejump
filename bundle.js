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
const BOUNCE_SPEED = 190;
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

/**
 * Effects are objects that can be associated to a SceneElement and can execute an action on the element at each frame
 *
 * Effects have a `duration` (associated to a timer) and a `count` that sets the number of times the effect will be
 * executed on the element (for its full duration every time)
 */
class Effect {
    constructor(duration, count = 1) {
        /**
         * Duration of the Effect (in seconds)
         *
         * If the duration is <= 0, the effect is considered to have infinite duration
         * @type {number}
         */
        this.duration = duration;
        /**
         * Number of times that the Effect should be repeated
         *
         * Every time the timer reaches 0, the count is decremented by 1. If the count is 0, the effect is stopped.
         * (if the count is < 0, the effect repeats infinitely)
         * @type {number}
         */
        this.count = count;
        /**
         * Timer to measure the remaining time of the Effect
         * @type {number}
         */
        this.timer = duration;
        /**
         * Number of repetitions left to perform
         * @type {number}
         */
        this.remainingCount = count;
    }

    /**
     * This method is called automatically by the SceneElement on each of its Effects
     * @param deltaTime {number} time elapsed since last update
     * @param element {SceneElement} the element to which the Effect is attached
     */
    update(deltaTime, element) {
        this.timer -= deltaTime;
        if (this.duration > 0 && this.remainingCount && this.timer <= 0) {
            this.remainingCount -= 1;
            if (this.remainingCount) {
                this.timer += this.duration;
            }
        }
    }

    /**
     * Restore the Effect to its initial state
     */
    reset() {
        this.timer = this.duration;
        this.remainingCount = this.count;
    }
}


/**
 * An EffectSequence is a list of effects that are executed one after the other
 * The EffectSequence has no duration of its own. The `count` attribute defines how many times the whole sequence is
 * repeated.
 *
 * Each individual Effect in the sequence has its own duration and number of repetitions
 */
class EffectSequence extends Effect {
    constructor(effects, count = 1) {
        super(0, count);
        /**
         * List of Effects in the sequence
         * @type {[Effect]}
         */
        this.effects = effects;
        /**
         * Index of the currently executing Effect in the sequence
         * @type {number}
         */
        this.index = 0;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        while (this.remainingCount && deltaTime > 0) {
            this.effects[this.index].update(deltaTime, element);
            deltaTime = -this.effects[this.index].timer;
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


/**
 * A LinearMovement moves the SceneElement in a linear trajectory from a starting point to a target point in a given
 * time.
 */
class LinearMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        /**
         * x coordinate of the starting point
         */
        this.x1 = x1;
        /**
         * y coordinate of the starting point
         */
        this.y1 = y1;
        /**
         * x coordinate of the target point
         */
        this.x2 = x2;
        /**
         * y coordinate of the target point
         */
        this.y2 = y2;
        /**
         * momentum of the movement along the x-axis
         * @type {number}
         */
        this.mx = (x2 - x1) / duration;
        /**
         * momentum of the movement along the y-axis
         * @type {number}
         */
        this.my = (y2 - y1) / duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer > 0) {
            const r = this.timer / this.duration;
            element.moveTo(r * this.x1 + (1 - r) * this.x2, r * this.y1 + (1 - r) * this.y2, this.mx, this.my);
        } else {
            element.moveTo(this.x2, this.y2);
        }
    }
}


/**
 * A SineMovement moves the SceneElement back and forth between two points in a sine-based trajectory
 */
class SineMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        /**
         * x coordinate of the starting point
         */
        this.x1 = x1;
        /**
         * y coordinate of the starting point
         */
        this.y1 = y1;
        /**
         * x coordinate of the target point
         */
        this.x2 = x2;
        /**
         * y coordinate of the target point
         */
        this.y2 = y2;
        this.duration = duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer > 0) {
            const angle = (this.duration - this.timer) * 2 * Math.PI / this.duration;
            const ratio = (Math.cos(angle) + 1) / 2;
            const dratio = Math.PI * Math.sin(angle) / this.duration;
            element.moveTo(
                ratio * this.x1 + (1 - ratio) * this.x2,
                ratio * this.y1 + (1 - ratio) * this.y2,
                dratio * (this.x2 - this.x1),
                dratio * (this.y2 - this.y1)
            );
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
const players = [];
let currentScene;
const scaling = 3;

module.exports = {
    players,
    currentScene,
    scaling,
}

},{}],4:[function(require,module,exports){
const sheets = {};

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


function loadSheet(url, name) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            sheets[name] = image;
            resolve();
        });
        image.src = url;
    });
}


const loadGraphics = Promise.all([
    loadSheet('images/hero_red.png', 'red'),
    loadSheet('images/hero_green.png', 'green'),
    loadSheet('images/hero_blue.png', 'blue'),
    loadSheet('images/tileset.png', 'tiles'),
]);


module.exports = {
    TileData,
    sheets,
    loadGraphics,
}

},{}],5:[function(require,module,exports){
"use strict";

const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
const AXES_THRESHOLD = .4;

let pressedKeys = new Set();
let previouslyPressedKeys;
let currentlyPressedKeys = new Set();
let previouslyPressedButtons = [];
let currentlyPressedButtons = [];


function onGamepadConnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = new Set();
}


function onGamepadDisconnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = undefined;
}


function isTappedKey(key) {
    return currentlyPressedKeys.has(key) && !previouslyPressedKeys.has(key);
}


function isPressedKey(key) {
    return currentlyPressedKeys.has(key);
}


function getPressedKeys() {
    return new Set(currentlyPressedKeys);
}


function getTappedKeys() {
    const tappedKeys = new Set();
    for (const key of currentlyPressedKeys) {
        if (!previouslyPressedKeys.has(key)) {
            tappedKeys.add(key);
        }
    }
    return tappedKeys;
}


function getPressedButtons() {
    return currentlyPressedButtons.map(s => new Set(s));
}


function getTappedButtons() {
    const tappedButtons = [];
    for (let i = 0; i < currentlyPressedButtons.length; i++) {
        const s = new Set();
        for (const button of currentlyPressedButtons[i]) {
            if (!previouslyPressedButtons[i].has(button)) {
                s.add(button);
            }
        }
        tappedButtons.push(s);
    }
    return tappedButtons;
}


function updateInputs() {
    previouslyPressedKeys = currentlyPressedKeys;
    currentlyPressedKeys = new Set(pressedKeys);
    previouslyPressedButtons = currentlyPressedButtons;
    currentlyPressedButtons = [];
    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            const i = gamepad.index;
            currentlyPressedButtons[i] = new Set();
            for (let j = 0; j < gamepad.buttons.length; j++) {
                if (gamepad.buttons[j].pressed) {
                    currentlyPressedButtons[i].add(j);
                    if (!previouslyPressedButtons[i].has(j)) {
                        console.log(j);
                    }
                }
            }
            for (let j = 0; j < gamepad.axes.length; j++) {
                let buttonIndex = 0;
                if (gamepad.axes[j] > AXES_THRESHOLD) {
                    buttonIndex = 2 * j + gamepad.buttons.length;
                } else if (gamepad.axes[j] < -AXES_THRESHOLD) {
                    buttonIndex = 2 * j + gamepad.buttons.length + 1;
                }
                if (buttonIndex) {
                    currentlyPressedButtons[i].add(buttonIndex);
                    if (!previouslyPressedButtons[i].has(buttonIndex)) {
                        console.log(buttonIndex);
                    }
                }
            }
        }
    }
}


class PlayerInputs {
    constructor() {
        this.xAxis = 0;
        this.yAxis = 0;
        this.gamepadIndex = 0;
        this.gamepadmap = {
            up: 12,
            down: 13,
            left: 14,
            right: 15,
            jump: 0,
            dash: 1,
            pause: 9,
        }
        this.keymap = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'g',
            dash: 'f',
            pause: 'Escape',
        }
        this.timers = {
            jumpBuffer: 0,
            dashBuffer: 0,
        };
    }

    isPressed(action) {
        return currentlyPressedKeys.has(this.keymap[action]) ||
            (
                currentlyPressedButtons[this.gamepadIndex] &&
                currentlyPressedButtons[this.gamepadIndex].has(this.gamepadmap[action])
            );
    }

    isPreviouslyPressed(action) {
        return previouslyPressedKeys.has(this.keymap[action]) ||
            (
                previouslyPressedButtons[this.gamepadIndex] &&
                previouslyPressedButtons[this.gamepadIndex].has(this.gamepadmap[action])
            );
    }

    isTapped(action) {
        return this.isPressed(action) && !this.isPreviouslyPressed(action);
    }

    update(deltaTime) {
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }

        this.xAxis = (this.isPressed("left") ? -1 : 0) + (this.isPressed("right") ? 1 : 0);
        this.yAxis = (this.isPressed("up") ? 1 : 0) + (this.isPressed("down") ? -1 : 0);
        if (this.isTapped("jump")) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
        }
        if (this.isTapped("dash")) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
        }
    }
}


module.exports = {
    PlayerInputs,
    onGamepadConnected,
    onGamepadDisconnected,
    updateInputs,
    pressedKeys,
    isTappedKey,
    isPressedKey,
    getPressedKeys,
    getTappedKeys,
    getPressedButtons,
    getTappedButtons,
}

},{}],6:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const globals = require('./globals');
const graphics = require('./graphics');
const inputs = require('./inputs');
const maps = require('./maps_');
const menu = require('./menu');
const player = require('./player');

let context;
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();


function setScaling(scale) {
    globals.scaling = scale;
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * scale}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * scale}px`;

    const canvas = document.getElementById("screen-canvas");
    canvas.width = scale * constants.VIEW_WIDTH;
    canvas.height = scale * constants.VIEW_HEIGHT;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.scale(globals.scaling, globals.scaling);
}


function update() {
    const timeNow = Date.now();

    frameCounter += 1;
    if (timeNow - frameRateStartTime >= 1000 * frameRateRefresh) {
        console.log(`${frameCounter / frameRateRefresh} FPS`);
        frameCounter = 0;
        frameRateStartTime = timeNow;
    }

    inputs.updateInputs();
    for (const player of globals.players) {
        player.update();
    }
    context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);

    if (menu.menuStack.length > 0) {
        menu.menuStack[0].update();
    } else {
        globals.currentScene.update(1 / 60);
        // Transition from one room to another
        if (globals.currentScene.transition) {
            const prevScene = globals.currentScene;
            globals.currentScene = globals.currentScene.transition.targetScene;
            prevScene.transition = undefined;
        }
    }

    context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);
    globals.currentScene.draw(context);
    if (menu.menuStack[0]) {
        menu.menuStack[0].draw(context);
    }
    requestAnimationFrame(update);
}


window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
    });
    document.addEventListener('keyup', e => {
        inputs.pressedKeys.delete(e.key);
    });

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * globals.scaling}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * globals.scaling}px`;

    const canvas = document.getElementById("screen-canvas");
    canvas.width = globals.scaling * constants.VIEW_WIDTH;
    canvas.height = globals.scaling * constants.VIEW_HEIGHT;
    context = canvas.getContext('2d');
    context.scale(globals.scaling, globals.scaling);
    context.imageSmoothingEnabled = false;

    // load all scenes and start game
    graphics.loadGraphics.then(() => {
        globals.players.push(new player.Player('blue'));
        globals.currentScene = maps.scenes.celeste01;
        globals.currentScene.spawnPointIndex = 1;
        update();
    });
};


// Gamepad API
window.addEventListener("gamepadconnected", (event) => {
    console.log("A gamepad connected:");
    console.log(event.gamepad);
    inputs.onGamepadConnected(event.gamepad);
});


window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.onGamepadDisconnected(event.gamepad);
});

},{"./constants":1,"./globals":3,"./graphics":4,"./inputs":5,"./maps_":7,"./menu":8,"./player":10}],7:[function(require,module,exports){
"use strict"
const constants = require('./constants');
const effect = require('./effect');
const physics = require('./physics');
const scene = require('./scene');
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


function makeTriggerBlock(x1, y1, x2, y2, width, height, speed = 20, delay = .25) {
    const distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    const duration1 = distance / speed;
    const duration2 = distance / 7;
    return new physics.TriggerBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, duration1),
        new effect.Effect(1),
        new effect.LinearMovement(x2 * U, y2 * U, x1 * U, y1 * U, duration2),
    ]));
}

function makeFallingBlock(x1, y1, x2, y2, width, height, delay = .5) {
    return new physics.FallingBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, (y2 - y1) / 25),
        new effect.Effect(1, -1),
    ]));
}

{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "format":"json",
                 "target":"celeste01.json"
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 12, 18, 18, 13, 18, 13, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 15, 0, 17, 18, 11, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 18, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 12, 18, 19, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 10, 10, 10, 10, 11, 0, 0, 9, 26, 27, 0, 15, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 9, 10, 10, 10, 10, 10, 11, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 10, 10, 10, 10, 10, 11, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 17, 26, 26, 26, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 26, 26, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 17, 18, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 9, 5, 5, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 2, 3, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 20, 2, 2, 2, 3, 0, 0, 0, 0, 0, 9, 10, 11, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":8,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste01 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "format":"json",
                 "target":"celeste02.json"
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 12, 18, 18, 13, 12, 18, 18, 18, 18, 12, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 18, 19, 0, 0, 9, 11, 0, 0, 0, 0, 15, 0, 17, 18, 18, 18, 13, 10, 10, 10, 12, 18, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 17, 18, 13, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 20, 26, 26, 26, 26, 26, 12, 19, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 14, 0, 0, 23, 0, 0, 0, 0, 0, 17, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 20, 26, 26, 26, 26, 26, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 19, 0, 0, 0, 0, 17, 18, 18, 13, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 12, 18, 34, 34, 34, 34, 34, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 1, 2, 2, 2, 21, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 11, 41, 41, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 46, 47, 47, 47, 48, 1, 2, 2, 5, 5, 5, 26, 26, 10, 11, 0, 0, 0, 0, 0, 9, 10, 20, 5, 6, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 20, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste02 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 11, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 17, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 11, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 4, 5, 6, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 6, 0, 0, 0, 0, 41, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 41, 4, 21, 10, 6, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 21, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 21, 10, 10, 11, 46, 47, 47, 48, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste03 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 13, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 12, 18, 18, 19, 0, 9, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 32, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 11, 48, 0, 0, 0, 0, 0, 44, 9, 10, 10, 11, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 44, 9, 12, 18, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 1, 3, 46, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 44, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 12, 19, 0, 0, 0, 0, 0, 44, 15, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 44, 9, 5, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 44, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 38, 39, 39, 40, 1, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste04 = s;
    s.addSolid(makeTriggerBlock(14, 10, 23, 9, 3, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 4, 5, 5, 5, 5, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 0, 0, 0, 9, 20, 5, 5, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 46, 47, 47, 48, 1, 2, 2, 2, 2, 3, 17, 19, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste05 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":36,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 11, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 32, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 11, 48, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 12, 18, 18, 13, 10, 10, 10, 10, 11, 42, 0, 23, 0, 0, 0, 17, 13, 10, 20, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 17, 18, 18, 13, 10, 11, 42, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 0, 9, 10, 12, 18, 26, 27, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 11, 42, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 20, 6, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 17, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 11, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 5, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 41, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 20, 6, 41, 41, 41, 41, 4, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 20, 5, 5, 5, 5, 21, 10, 11, 41, 41, 41, 41, 0, 0, 0, 0, 41, 41, 41, 41, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 6, 0, 0, 0, 0, 4, 5, 5, 5, 21, 18, 18, 13, 10, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 17, 18, 13, 10, 19, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 32, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 9, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 20, 6, 46, 47, 47, 48, 4, 5, 5, 5, 21, 11, 0, 0, 0, 0, 9, 10, 11, 41, 41, 41, 41, 41, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 38, 38, 40, 1, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 5, 5, 21, 10, 20, 5, 5, 5, 5, 5, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":36,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":36,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste06 = s;
    s.addSolid(makeTriggerBlock(13, 33, 13, 23, 4, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":35,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 6, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 15, 53, 54, 0, 0, 0, 0, 0, 0, 9, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 2, 3, 46, 48, 0, 0, 0, 4, 21, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 41, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 4, 21, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 20, 6, 38, 39, 39, 40, 17, 18, 13, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 6, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 11, 41, 41, 41, 0, 0, 0, 0, 0, 17, 11, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 15, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 23, 42, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 18, 18, 13, 10, 20, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 17, 18, 27, 38, 39, 40, 4, 5, 5, 35, 46, 47, 47, 48, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 5, 5, 5, 21, 10, 11, 0, 0, 0, 0, 4, 2, 2, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 41, 41, 41, 41, 1, 2, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":35,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste07 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 13, 10, 10, 12, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 9, 10, 12, 18, 18, 13, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 1, 2, 2, 2, 3, 38, 39, 39, 40, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 2, 3, 46, 47, 48, 0, 0, 0, 0, 44, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 44, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 26, 2, 2, 2, 2, 2, 21, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 44, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 41, 41, 0, 0, 44, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 4, 6, 0, 0, 44, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste08 = s;
    s.addSolid(makeTriggerBlock(14, 16, 21, 12, 2, 3));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 4, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 18, 18, 34, 35, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 4, 5, 5, 5, 21, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 6, 0, 0, 0, 0, 9, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 22, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 26, 3, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 46, 47, 47, 48, 4, 21, 10, 10, 12, 18, 19, 0, 15, 0, 0, 0, 0, 9, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 40, 1, 2, 21, 11, 0, 14, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 23, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 39, 39, 39, 40, 1, 2, 2, 2, 2, 2, 21, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 4, 5, 21, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 4, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 41, 41, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 46, 47, 48, 1, 2, 2, 2, 21, 10, 10, 10, 10, 10, 5, 6, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste09 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 11, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 6, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste10 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 15, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 12, 18, 34, 34, 34, 21, 2, 3, 0, 0, 0, 15, 0, 0, 1, 5, 5, 5, 18, 34, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 9, 11, 0, 0, 0, 0, 17, 18, 18, 34, 34, 34, 18, 26, 26, 18, 18, 18, 19, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 58, 58, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 10, 11, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 5, 5, 5, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 12, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 12, 18, 18, 19, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 26, 2, 2, 5, 5, 5, 5, 5, 2, 2, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste11 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 1, 2, 2, 2, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 41, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 9, 10, 10, 10, 10, 11, 46, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 9, 6, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 11, 41, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 9, 18, 18, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 35, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 23, 0, 0, 17, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 43, 43, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 1, 2, 11, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 32, 0, 0, 9, 10, 20, 5, 5, 5, 6, 41, 41, 41, 41, 41, 41, 4, 34, 5, 5, 5, 6, 41, 41, 41, 41, 4, 5, 34, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 20, 3, 0, 0, 9, 10, 12, 18, 18, 18, 20, 34, 34, 34, 34, 34, 6, 0, 0, 17, 18, 18, 18, 5, 34, 34, 34, 18, 11, 0, 15, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 32, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 15, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 15, 0, 17, 26, 26, 26, 34, 34, 34, 34, 34, 34, 6, 46, 48, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 15, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 9, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":48,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":48
        }    );
    scenes.celeste12 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 18, 13, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 17, 18, 13, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 19, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 39, 39, 39, 40, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 2, 2, 3, 46, 47, 48, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 20, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 5, 5, 2, 2, 2, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 41, 41, 41, 41, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 38, 39, 39, 40, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 4, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":49,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":49
        }    );
    scenes.celeste13 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":36,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 12, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 10, 10, 11, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 9, 12, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 10, 12, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 20, 5, 6, 38, 40, 4, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 19, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 12, 19, 46, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 6, 38, 40, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 17, 18, 18, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 11, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 1, 26, 3, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 15, 0, 15, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 15, 0, 0, 0, 0, 0, 1, 21, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 34, 21, 34, 6, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 15, 0, 9, 2, 2, 2, 21, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 15, 0, 9, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 34, 18, 5, 21, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 8, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 23, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 33, 35, 42, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 2, 2, 3, 46, 47, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10],
                 "height":36,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":36,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste14 = s;
    s.addSolid(makeTriggerBlock(11, 29, 19, 29, 4, 2));
    s.addSolid(makeTriggerBlock(26, 28, 26, 22, 5, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":29,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 12, 18, 18, 18, 18, 18, 13, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 18, 19, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 32, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 38, 40, 4, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 2, 2, 6, 0, 0, 0, 9, 10, 10, 2, 2, 3, 47, 48, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 12, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 13, 10, 10, 12, 19, 58, 58, 58, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 41, 15, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 6, 38, 39, 39, 40, 1, 2, 2, 2, 5, 5, 21, 10, 10, 11, 0, 0, 0, 4, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 12, 18, 18, 18, 18, 13, 10, 10, 11, 0, 0, 41, 9, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 4, 21, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 21, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 20, 5, 5, 5, 5, 6, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 11, 0, 0, 53, 54, 0, 0, 0, 4, 5, 5, 5, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 2, 2, 2, 2, 2, 2, 21, 10, 10, 10, 10, 10, 10, 10],
                 "height":29,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":29,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste15 = s;
    const triggerBlock = makeTriggerBlock(24, 6, 24, 17, 2, 6);
    s.addSolid(triggerBlock);
    const spikes1 = new physics.SpikesUp(24 * U, 5 * U);
    const spikes2 = new physics.SpikesUp(25 * U, 5 * U);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);

    s.addSolid(makeTriggerBlock(15, 20, 9, 20, 2, 4));

}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 34, 34, 34, 18, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 39, 40, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 34, 5, 5, 5, 5, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 46, 47, 47, 47, 48, 1, 2, 2, 2, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":96,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":96
        }    );
    scenes.celeste16 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[12, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 13, 11, 0, 0, 0, 9, 10, 10, 10, 19, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 18, 19, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 9, 10, 10, 10, 2, 2, 27, 0, 0, 0, 0, 0, 0, 0, 43, 43, 0, 0, 0, 0, 0, 0, 17, 13, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 21, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 32, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 2, 2, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste17 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":24,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 40, 1, 3, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 33, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 40, 1, 2, 2, 2, 2, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 41, 41, 41, 41, 41, 9, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10],
                 "height":24,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste18 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":38,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 39, 40, 1, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 38, 39, 39, 40, 1, 2, 2, 2, 3, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 20, 5, 6, 41, 41, 41, 41, 41, 41, 41, 41, 4, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 6, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10],
                 "height":38,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":38,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste19 = s;
    s.addSolid(makeTriggerBlock(20, 15, 20, 7, 2, 4));
    s.addSolid(makeFallingBlock(28, 9, 28, 35, 3, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":27,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 18, 18, 18, 18, 18, 18, 13, 11, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 13, 10, 10, 10, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 17, 13, 10, 10, 0, 32, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 6, 46, 47, 48, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 11, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 32, 0, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 41, 9, 20, 2, 2, 2, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 41, 41, 9, 11, 0, 0, 0, 0, 4, 5, 5, 21, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 4, 5, 5, 5, 5, 5, 5, 5, 5, 21, 11, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 34, 34, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":27,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste20 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 11, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 9, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 18, 18, 10, 20, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 17, 10, 10, 20, 5, 26, 26, 27, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 9, 10, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 2, 27, 58, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 0, 0, 0, 0, 0, 41, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 41, 4, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 46, 47, 48, 33, 5, 5, 5, 21, 10, 10, 20, 3, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 15, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 46, 47, 48, 4, 6, 0, 0, 0, 41, 41, 4, 6, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 38, 39, 40, 4, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 11, 41, 41, 41, 4, 5, 21, 11, 0, 0, 9, 11, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 20, 5, 5, 5, 21, 10, 10, 11, 41, 41, 9, 20, 5, 6, 41, 41, 41, 41, 41, 41, 41, 0, 9, 11, 53, 54, 32, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 21, 10, 10, 20, 5, 5, 5, 5, 5, 5, 6, 0, 9, 20, 5, 6, 38, 40, 9, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste21 = s;
    const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75);
    s.addSolid(fallingBlock);
    const spikes1 = new physics.SpikesUp(14 * U, 6 * U);
    const spikes2 = new physics.SpikesUp(15 * U, 6 * U);
    s.addThing(spikes1);
    s.addThing(spikes2);
    fallingBlock.attach(spikes1);
    fallingBlock.attach(spikes2);
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 19, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 43, 43, 43, 43, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 12, 18, 18, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 4, 5, 5, 5, 5, 5, 5, 5, 5, 34, 34, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 41, 41, 0, 0, 0, 0, 0, 33, 34, 5, 5, 5, 21, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 6, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 11, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 38, 39, 40, 4, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 5, 6, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 32, 0, 0, 1, 5, 5, 5, 5, 5, 2, 21, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 1, 2, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 2, 2, 2, 2, 2, 5, 5, 21, 10, 20, 2, 3, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste22 = s;
    s.addSolid(makeTriggerBlock(33, 15, 33, 9, 3, 3));
    const triggerBlock = makeTriggerBlock(25, 6, 13, 6, 2, 3);
    const spikes1 = new physics.SpikesUp(25 * U, 5 * U);
    const spikes2 = new physics.SpikesUp(26 * U, 5 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":27,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 12, 18, 18, 19, 0, 17, 18, 18, 11, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 43, 43, 43, 0, 43, 43, 43, 15, 0, 0, 9, 10, 12, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 9, 18, 19, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 18, 18, 18, 13, 10, 10, 12, 18, 18, 18, 13, 10, 10, 12, 18, 19, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 12, 19, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 2, 2, 2, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 26, 27, 46, 47, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 20, 5, 6, 46, 47, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 46, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":27,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":46,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":27,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":46,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":46
        }    );
    scenes.celeste23 = s;
    s.addSolid(makeTriggerBlock(22, 18, 22, 9, 2, 2));
    s.addSolid(makeTriggerBlock(29, 19, 29, 10, 2, 2));
    s.addSolid(makeTriggerBlock(36, 17, 36, 8, 2, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 43, 43, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 14, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 32, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 12, 19, 0, 0, 1, 2, 21, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 17, 13, 10, 10, 11, 42, 0, 0, 17, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 42, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 12, 18, 18, 18, 18, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 19, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 42, 0, 0, 44, 9, 18, 18, 13, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 42, 0, 0, 44, 23, 0, 0, 9, 10, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste24 = s;
    s.addSolid(makeTriggerBlock(17, 18, 17, 12, 4, 2));
    s.addSolid(makeTriggerBlock(28, 19, 28, 12, 6, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 17, 18, 11, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 11, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 0, 1, 2, 3, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 38, 39, 40, 1, 2, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 43, 43, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste25 = s;
    const fallingBlock1 = makeFallingBlock(19, 16, 19, 25, 4, 3);
    s.addSolid(fallingBlock1);
    const spikes1 = [
        new physics.SpikesRight(23 * U, 17 * U),
        new physics.SpikesRight(23 * U, 18 * U),
        new physics.SpikesDown(19 * U, 19 * U),
        new physics.SpikesDown(20 * U, 19 * U),
        new physics.SpikesDown(21 * U, 19 * U),
        new physics.SpikesDown(22 * U, 19 * U),
    ];
    for (const spike of spikes1) {
        fallingBlock1.attach(spike);
        s.addThing(spike);
    }

    const fallingBlock2 = makeFallingBlock(23, 6, 23, 25, 2, 4);
    s.addSolid(fallingBlock2);
    const spikes2 = [
        new physics.SpikesLeft(22 * U, 7 * U),
        new physics.SpikesLeft(22 * U, 8 * U),
    ];
    for (const spike of spikes2) {
        fallingBlock2.attach(spike);
        s.addThing(spike);
    }
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "editorsettings":
            {
             "export":
                {
                 "target":"."
                }
            },
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 12, 18, 13, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 11, 0, 0, 0, 17, 13, 12, 18, 19, 0, 17, 18, 18, 13, 10, 10, 10, 11, 0, 38, 39, 40, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 12, 19, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 11, 0, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 10, 10, 10, 11, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 17, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 32, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 46, 47, 47, 48, 9, 10, 11, 41, 41, 41, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 20, 5, 5, 6, 41, 41, 41, 41, 41, 41, 4, 5, 5, 5, 6, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste26 = s;
    const triggerBlock = makeTriggerBlock(9, 9, 26, 9, 3, 5, 35);
    s.addSolid(triggerBlock);
    const spikes = [
        new physics.SpikesUp(9 * U, 8 * U),
        new physics.SpikesUp(10 * U, 8 * U),
        new physics.SpikesUp(11 * U, 8 * U),
    ]
    for (const spike of spikes) {
        triggerBlock.attach(spike);
        s.addThing(spike);
    }
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 11, 0, 0, 0, 0, 0, 9, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 1, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 39, 40, 17, 18, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 11, 0, 0, 32, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 33, 34, 35, 58, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 46, 48, 25, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 14, 0, 44, 9, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 44, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 15, 0, 0, 44, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 44, 9, 10, 20, 5, 2, 2, 2, 5, 5, 5, 5, 35, 46, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 48, 0, 44, 9, 10, 10, 12, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 2, 2, 2, 2, 2, 3, 46, 47, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste27 = s;
    const triggerBlock = makeTriggerBlock(2, 9, 10, 9, 3, 4, 35);
    const spikes1 = new physics.SpikesUp(2 * U, 8 * U);
    const spikes2 = new physics.SpikesUp(3 * U, 8 * U);
    const spikes3 = new physics.SpikesUp(4 * U, 8 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    s.addThing(spikes3);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
    triggerBlock.attach(spikes3);
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":28,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 11, 0, 0, 0, 9, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 5, 5, 2, 2, 2, 5, 6, 38, 39, 39, 40, 4, 5, 21, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 10, 11, 58, 58, 58, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 12, 19, 42, 0, 0, 44, 17, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 0, 32, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 4, 5, 21, 10, 10, 11, 46, 47, 48, 0, 0, 1, 2, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 34, 34, 34, 34, 34, 34, 21, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10],
                 "height":28,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":28,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste28 = s;
    s.addSolid(makeTriggerBlock(16, 25, 16, 19, 6, 2));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 12, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 13, 12, 19, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 18, 19, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 1, 3, 38, 39, 39, 40, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 2, 2, 2, 2, 3, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 35, 46, 47, 47, 48, 33, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 10, 10, 10, 11, 41, 41, 0, 0, 0, 4, 6, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 41, 41, 9, 11, 0, 0, 0, 0, 0, 0, 0, 1, 2, 5, 5, 21, 10, 10, 10, 10, 10, 10, 20, 5, 6, 0, 0, 0, 9, 11, 41, 41, 41, 41, 4, 5, 5, 5, 5, 5, 5, 5, 21, 11, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 41, 41, 9, 20, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste29 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste30 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 13, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 19, 46, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53, 54, 1, 3, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 21, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":23,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste31 = s;
    s.addSolid(makeTriggerBlock(4, 20, 12, 20, 4, 2, 30));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":28,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 17, 13, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 41, 41, 4, 6, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 41, 41, 4, 5, 12, 19, 42, 0, 0, 0, 0, 0, 0, 0, 38, 40, 9, 10, 10, 10, 10, 11, 0, 0, 32, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 41, 41, 9, 20, 5, 5, 21, 10, 11, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 38, 40, 9, 12, 19, 0, 0, 0, 0, 0, 0, 0, 4, 5, 21, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 19, 0, 0, 0, 0, 4, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 21, 10, 10, 10, 11, 41, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 20, 6, 41, 41, 41, 41, 41, 4, 5, 5, 5, 5, 21, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 11, 0, 38, 40, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 11, 41, 41, 41, 41, 41, 41, 41, 41, 4, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":28,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste32 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":33,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 43, 43, 43, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 9, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58, 58, 58, 58, 58, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 26, 26, 26, 26, 13, 10, 10, 10, 10, 10, 20, 5, 5, 6, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 13, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 13, 10, 10, 10, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 19, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 0, 0, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 33, 34, 34, 5, 5, 5, 6, 41, 41, 41, 9, 12, 18, 18, 18, 18, 18, 18, 18, 18, 19, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 5, 5, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 34, 34, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 4, 5, 5, 6, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 20, 5, 6, 0, 0, 0, 0, 0, 0, 14, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 53, 54, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 4, 6, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 42, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 4, 5, 5, 5, 21, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 20, 5, 21, 11, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 42, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 0, 1, 2, 2, 2, 21, 10, 10, 10, 10, 11, 0, 0, 0, 0, 32, 0, 9, 10, 10, 10, 20, 2, 2, 2, 3, 46, 47, 48, 1, 2, 2, 2, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 6, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 3, 46, 47, 48, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 10, 10],
                 "height":33,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":51,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":33,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":51,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":51
        }    );
    scenes.celeste33 = s;
    s.addSolid(makeTriggerBlock(1, 22, 8, 22, 3, 3, 30));
    const triggerBlock = makeTriggerBlock(48, 15, 48, 7, 2, 4);
    const spikes1 = new physics.SpikesUp(48 * U, 14 * U);
    const spikes2 = new physics.SpikesUp(49 * U, 14 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":29,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 18, 18, 18, 18, 18, 18, 18, 18, 13, 12, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 18, 19, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 44, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 44, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 44, 17, 13, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 18, 19, 0, 0, 0, 9, 12, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 17, 19, 0, 0, 0, 17, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 9, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 21, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 0, 0, 0, 0, 0, 0, 4, 5, 21, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 12, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 41, 0, 0, 0, 0, 0, 9, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 6, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 0, 32, 0, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 9, 11, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 20, 5, 5, 2, 2, 2, 2, 2, 2, 10, 10, 11, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 20, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 40, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 9, 11, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 9, 10, 10, 11, 41, 41, 41, 0, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 46, 47, 48, 1, 21, 11, 41, 41, 41, 41, 41, 4, 5, 5, 5, 5, 21, 10, 10, 20, 5, 5, 6, 41, 41, 41, 41, 41, 4, 6, 41, 41, 41, 41, 41, 41, 41, 41, 41, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 21, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":29,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":52,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":29,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":52,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":52
        }    );
    scenes.celeste34 = s;
    const fallingBlock = makeFallingBlock(23, 8, 23, 23, 3, 4);
    s.addSolid(fallingBlock);
    const spikes = [
        new physics.SpikesUp(23 * U, 7 * U),
        new physics.SpikesUp(24 * U, 7 * U),
        new physics.SpikesUp(25 * U, 7 * U),
    ];
    for (const spike of spikes) {
        fallingBlock.attach(spike);
        s.addThing(spike);
    }
    s.addSolid(makeFallingBlock(11, 16, 11, 25, 2, 3));
    s.addSolid(makeFallingBlock(14, 3, 14, 22, 3, 5));
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 17, 13, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 4, 5, 5, 5, 5, 6, 41, 41, 41, 41, 41, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 41, 41, 41, 41, 4, 5, 21, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 21, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 9, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 18, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 38, 4, 21, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste35 = s;
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":43,
         "infinite":false,
         "layers":[
                {
                 "data":[10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 17, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 17, 18, 13, 10, 10, 12, 18, 18, 18, 18, 18, 18, 18, 18, 13, 18, 18, 18, 18, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 32, 0, 0, 0, 0, 0, 17, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 7, 46, 47, 47, 48, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 46, 48, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 13, 11, 46, 48, 0, 0, 0, 0, 38, 39, 39, 40, 17, 11, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 17, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 12, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 23, 38, 39, 39, 39, 40, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 53, 54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 6, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 32, 0, 0, 9, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 2, 2, 2, 2, 21, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
                 "height":43,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }, 
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 41, 41, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 65, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                 "height":43,
                 "id":2,
                 "name":"dynamic",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":3,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste36 = s;
    const triggerBlock1 = makeTriggerBlock(2, 26, 9, 26, 2, 3, 30);
    s.addSolid(triggerBlock1);
    const spikes1 = [
        new physics.SpikesUp(2 * U, 25 * U),
        new physics.SpikesUp(3 * U, 25 * U),
    ];
    for (const spike of spikes1) {
        triggerBlock1.attach(spike);
        s.addThing(spike);
    }

    const triggerBlock2 = makeTriggerBlock(35, 23, 35, 15, 3, 4);
    s.addSolid(triggerBlock2);
    const spikes2 = [
        new physics.SpikesUp(35 * U, 22 * U),
        new physics.SpikesUp(36 * U, 22 * U),
        new physics.SpikesUp(37 * U, 22 * U),
    ];
    for (const spike of spikes2) {
        triggerBlock2.attach(spike);
        s.addThing(spike);
    }
}
{
    const s = scene.Scene.fromJSON(
        { "compressionlevel":-1,
         "height":23,
         "infinite":false,
         "layers":[
                {
                 "data":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 10, 10, 20, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 4, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 10, 20, 5, 5, 2, 3, 46, 47, 48, 1, 2, 2, 2, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
                 "height":23,
                 "id":1,
                 "name":"main",
                 "opacity":1,
                 "type":"tilelayer",
                 "visible":true,
                 "width":40,
                 "x":0,
                 "y":0
                }],
         "nextlayerid":2,
         "nextobjectid":1,
         "orientation":"orthogonal",
         "renderorder":"right-down",
         "tiledversion":"1.3.5",
         "tileheight":16,
         "tilesets":[
                {
                 "firstgid":1,
                 "source":"tileset.tsx"
                }],
         "tilewidth":16,
         "type":"map",
         "version":1.2,
         "width":40
        }    );
    scenes.celeste37 = s;
}

// {
//     {{louis01}}
// }
// {
//     {{louis02}}
// }
// {
//     {{louis03}}
// }
// {
//     {{louis04}}
// }
// {
//     {{louis05}}
// }
// {
//     {{louis06}}
// }
// {
//     {{louis07}}
// }
// {
//     {{louis08}}
// }


// Transitions
makeTransitionUp(scenes.celeste01, 31, 0, scenes.celeste02, 1, 1, 5);
makeTransitionUp(scenes.celeste02, 34, 0, scenes.celeste03, 2, 1, 4);
makeTransitionUp(scenes.celeste03, 33, 0, scenes.celeste04, 3, 1, 4);
makeTransitionUp(scenes.celeste04, 21, 0, scenes.celeste05, 4, 1, 4);
makeTransitionUp(scenes.celeste05, 22, 0, scenes.celeste06, 3, 1, 4);
makeTransitionRight(scenes.celeste07, 29, 0, scenes.celeste06, 30, 1, 3);
makeTransitionRight(scenes.celeste06, 30, 2, scenes.celeste08, 5, 0, 4);
makeTransitionUp(scenes.celeste06, 35, 0, scenes.celeste09, 1, 2, 3);
makeTransitionRight(scenes.celeste10, 7, 0, scenes.celeste09, 7, 1, 4);
makeTransitionRight(scenes.celeste11, 8, 1, scenes.celeste10, 8, 1, 4);
makeTransitionUp(scenes.celeste10, 2, 1, scenes.celeste12, 42, 1, 3);
makeTransitionUp(scenes.celeste11, 3, 0, scenes.celeste12, 3, 0, 2);
makeTransitionRight(scenes.celeste09, 0, 0, scenes.celeste13, 0, 0, 10);
makeTransitionRight(scenes.celeste13, .5, 1, scenes.celeste14, 22.5, 2, 10);
makeTransitionRight(scenes.celeste15, 22, 1, scenes.celeste14, 4, 0, 5);
makeTransitionRight(scenes.celeste16, 19, 0, scenes.celeste15, 2, 0, 2);
makeTransitionRight(scenes.celeste14, 1, 1, scenes.celeste17, 10, 2, 9);
makeTransitionRight(scenes.celeste18, 17, 0, scenes.celeste17, 2, 0, 3);
makeTransitionUp(scenes.celeste18, 19, 0, scenes.celeste19, 13, 1, 4);
makeTransitionRight(scenes.celeste19, 2, 0, scenes.celeste20, 2, 0, 2);
makeTransitionRight(scenes.celeste20, 12, 1, scenes.celeste21, 8, 2, 3);
makeTransitionUp(scenes.celeste21, 26, 1, scenes.celeste22, 26, 0, 1);
makeTransitionUp(scenes.celeste23, 7, 0, scenes.celeste21, 27, 3, 7);
makeTransitionRight(scenes.celeste21, 2, 0, scenes.celeste24, 8, 1, 4);
makeTransitionUp(scenes.celeste17, 33, 1, scenes.celeste25, 7, 0, 3);
makeTransitionUp(scenes.celeste25, 22, 0, scenes.celeste21, 2, 2, 3);
makeTransitionUp(scenes.celeste24, 32, 0, scenes.celeste26, 4, 1, 4);
makeTransitionRight(scenes.celeste26, 3, 0, scenes.celeste27, 16, 3, 3);
makeTransitionUp(scenes.celeste27, 2, 1, scenes.celeste28, 28, 2, 5);
makeTransitionRight(scenes.celeste29, 13, 1, scenes.celeste28, 18, 1, 5);
makeTransitionRight(scenes.celeste30, 6, 0, scenes.celeste29, 6, 0, 3);
makeTransitionRight(scenes.celeste27, 6, 2, scenes.celeste31, 6, 0, 2);
makeTransitionUp(scenes.celeste27, 31, 0, scenes.celeste32, 17, 1, 3);
makeTransitionUp(scenes.celeste28, 5, 0, scenes.celeste33, 5, 1, 3);
makeTransitionUp(scenes.celeste28, 28, 2, scenes.celeste33, 28, 2, 3);
makeTransitionUp(scenes.celeste32, 4, 0, scenes.celeste33, 44, 3, 3);
makeTransitionUp(scenes.celeste33, 10, 0, scenes.celeste34, 3, 2, 3);
makeTransitionRight(scenes.celeste35, 13, 0, scenes.celeste34, 3, 0, 3);
makeTransitionRight(scenes.celeste34, 15, 1, scenes.celeste36, 29, 1, 9);
makeTransitionUp(scenes.celeste36, 8, 0, scenes.celeste37, 6, 0, 3);

// makeTransitionUp(scenes.louis01, 35, 0, scenes.louis02, 4, 1, 3);
// makeTransitionUp(scenes.louis03, 3, 0, scenes.louis02, 13, 0, 3);
// makeTransitionUp(scenes.louis03, 30, 1, scenes.louis02, 23, 2, 3);
// makeTransitionUp(scenes.louis04, 4, 0, scenes.louis02, 35, 3, 3);
// makeTransitionUp(scenes.louis05, 33, 0, scenes.louis06, 1, 1, 5);
// makeTransitionRight(scenes.louis06, 8, 0, scenes.louis07, 8, 1, 6);
// scenes.louis06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.louis08, U, 13 * U, 0));
// scenes.louis08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.louis06, 10 * U, 15 * U, 1));

module.exports = {
    scenes,
}

},{"./constants":1,"./effect":2,"./physics":9,"./scene":11}],8:[function(require,module,exports){
const constants = require('./constants');
const globals = require('./globals');
const inputs = require('./inputs');
const sound = require('./sound');

const MENU_FONT_SIZE = 12;
const MENU_PADDING = 5;
const menuStack = [];


class MenuLine {
    constructor(text) {
        this.text = text;
    }

    draw(ctx, y, textColor = "#000000", bgColor = "#ffffffcc") {
        ctx.fillStyle = bgColor;
        const textMetrics = ctx.measureText(this.text);
        ctx.fillRect(
            constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - MENU_PADDING,
            y - textMetrics.actualBoundingBoxAscent - MENU_PADDING,
            textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 2 * MENU_PADDING,
            textMetrics.actualBoundingBoxAscent + 2 * MENU_PADDING);
        ctx.fillStyle = textColor;
        ctx.fillText(this.text, constants.VIEW_WIDTH / 2, y);
    }
}


class MenuOption extends MenuLine {
    constructor(text) {
        super(text);
        this.isSelected = false;
        this.onActivate = undefined;
        this.onRight = undefined;
        this.onLeft = undefined;
    }

    draw(ctx, y) {
        if (this.isSelected) {
            super.draw(ctx, y, '#ffffff', '#000000cc');
        } else {
            super.draw(ctx, y, '#000000', '#ffffffcc');
        }
    }

    setOnActivate(f) {
        this.onActivate = f;
        return this;
    }

    setOnRight(f) {
        this.onRight = f;
        return this;
    }

    setOnLeft(f) {
        this.onLeft = f;
        return this;
    }
}


class Menu {
    constructor(title = undefined) {
        if (title) {
            this.title = new MenuLine(title);
        }
        this.lines = [];
    }

    draw(ctx) {
        ctx.save();
        ctx.font = `normal ${MENU_FONT_SIZE}px gameboy`;
        ctx.textAlign = "center";
        const lineHeight = ctx.measureText('M').actualBoundingBoxAscent + 2.5 * MENU_PADDING;

        let yOffset;
        if (this.title) {
            yOffset = constants.VIEW_HEIGHT / 2 - this.lines.length * lineHeight / 2;
            this.title.draw(ctx, yOffset);
            yOffset += 1.5 * lineHeight;
        } else {
            yOffset = constants.VIEW_HEIGHT / 2 - (this.lines.length - 1) * lineHeight / 2;
        }

        for (const line of this.lines) {
            line.draw(ctx, yOffset);
            yOffset += lineHeight;
        }
        ctx.restore();
    }
}


class LineSelectMenu extends Menu {
    constructor(title = undefined) {
        super(title);
        this.selected = 0;
        this.canQuit = true;
    }

    draw(ctx) {
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].isSelected = (i === this.selected);
        }
        super.draw(ctx);
    }

    update() {
        // default menu controls
        if (inputs.isTappedKey("Escape") && this.canQuit) {
            menuStack.shift();
        } else if (inputs.isTappedKey("ArrowDown")) {
            if (this.selected < this.lines.length - 1) {
                this.selected += 1;
            }
        } else if (inputs.isTappedKey("ArrowUp")) {
            if (this.selected > 0) {
                this.selected -= 1;
            }
        } else if (inputs.isTappedKey("ArrowRight") && this.lines[this.selected].onRight) {
            this.lines[this.selected].onRight();
        } else if (inputs.isTappedKey("ArrowLeft") && this.lines[this.selected].onLeft) {
            this.lines[this.selected].onLeft();
        } else if (inputs.isTappedKey("Enter") && this.lines[this.selected].onActivate) {
            this.lines[this.selected].onActivate();
            // player-specific menu controls
        } else if (globals.players.some(p => p.inputs.isTapped("pause")) && this.canQuit) {
            while (menuStack.length) {
                menuStack.shift();
            }
        } else if (globals.players.some(p => p.inputs.isTapped("dash")) && this.canQuit) {
            menuStack.shift();
        } else if (globals.players.some(p => p.inputs.isTapped("down"))) {
            if (this.selected < this.lines.length - 1) {
                this.selected += 1;
            }
        } else if (globals.players.some(p => p.inputs.isTapped("up"))) {
            if (this.selected > 0) {
                this.selected -= 1;
            }
        } else if (globals.players.some(p => p.inputs.isTapped("right")) && this.lines[this.selected].onRight) {
            this.lines[this.selected].onRight();
        } else if (globals.players.some(p => p.inputs.isTapped("left")) && this.lines[this.selected].onLeft) {
            this.lines[this.selected].onLeft();
        } else if (globals.players.some(p => p.inputs.isTapped("jump")) && this.lines[this.selected].onActivate) {
            this.lines[this.selected].onActivate();
        }
    }
}


class ControlsMenu extends Menu {
    constructor() {
        super();
        this.actions = ["up", "down", "left", "right", "jump", "dash", "pause"];
        this.lines = [
            new MenuLine('Press Key/Button for'),
            new MenuLine(),
        ];
        this.setActionIndex(0);
    }

    setActionIndex(index) {
        this.actionIndex = index;
        this.lines[1].text = this.actions[this.actionIndex].toUpperCase();
    }

    update() {
        const tappedKeys = inputs.getTappedKeys();
        if (tappedKeys.size > 0) {
            globals.players[0].inputs.keymap[this.actions[this.actionIndex]] = tappedKeys.values().next().value;
            if (this.actionIndex >= this.actions.length - 1) {
                this.setActionIndex(0);
                menuStack.shift();
            } else {
                this.setActionIndex(this.actionIndex + 1);
            }
        }
        const tappedButtons = inputs.getTappedButtons();
        for (let i = 0; i < tappedButtons.length; i++) {
            if (tappedButtons[i].size > 0) {
                globals.players[0].inputs.gamepadIndex = i;
                globals.players[0].inputs.gamepadmap[this.actions[this.actionIndex]] = tappedButtons[i].values().next().value;
                if (this.actionIndex >= this.actions.length - 1) {
                    this.setActionIndex(0);
                    menuStack.shift();
                } else {
                    this.setActionIndex(this.actionIndex + 1);
                }
                break;
            }
        }
    }
}


// Controls mapping menu
const controlsMenu = new ControlsMenu();

// General options menu
const optionsMenu = new LineSelectMenu("Options");
optionsMenu.lines.push(
    new MenuOption("SFX Volume: lllll ")
        .setOnRight(function () {
            sound.incrementSoundVolume();
            this.text = "SFX Volume: "
                + "l".repeat(sound.getSoundVolume())
                + ".".repeat(5 - sound.getSoundVolume())
                + " ";
        })
        .setOnLeft(function () {
            sound.decrementSoundVolume();
            this.text = "SFX Volume: "
                + "l".repeat(sound.getSoundVolume())
                + ".".repeat(5 - sound.getSoundVolume())
                + " ";
        }));
optionsMenu.lines.push(
    new MenuOption("Music Volume: lllll ")
        .setOnRight(function () {
            sound.incrementMusicVolume();
            this.text = "Music Volume: "
                + "l".repeat(sound.getMusicVolume())
                + ".".repeat(5 - sound.getMusicVolume())
                + " ";
        })
        .setOnLeft(function () {
            sound.decrementMusicVolume();
            this.text = "Music Volume: "
                + "l".repeat(sound.getMusicVolume())
                + ".".repeat(5 - sound.getMusicVolume())
                + " ";
        }));

// Main pause menu
const mainMenu = new LineSelectMenu("Paused");
mainMenu.lines.push(new MenuOption("Resume").setOnActivate(function () {
    console.log("resume");
    menuStack.shift()
}));
mainMenu.lines.push(new MenuOption("Options").setOnActivate(function () {
    menuStack.unshift(optionsMenu);
}));
mainMenu.lines.push(new MenuOption("Controls").setOnActivate(function () {
    menuStack.unshift(controlsMenu);
}));

// Initial menu
const startMenu = new LineSelectMenu("Squarejump");
startMenu.canQuit = false;
startMenu.lines.push(new MenuOption("Start").setOnActivate(function () {
    globals.currentScene.addActor(globals.players[0].character);
    globals.currentScene.reset();
    sound.bgMusic.play();
    menuStack.shift();
}));
startMenu.lines.push(new MenuOption("Options").setOnActivate(function () {
    menuStack.unshift(optionsMenu);
}));
startMenu.lines.push(new MenuOption("Controls").setOnActivate(function () {
    menuStack.unshift(controlsMenu);
}));


menuStack.unshift(startMenu);
module.exports = {
    menuStack,
    mainMenu,
}
},{"./constants":1,"./globals":3,"./inputs":5,"./sound":12}],9:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const sound = require('./sound');

const U = constants.GRID_SIZE;
const ANIMATION_SLOWDOWN = 6;
const PLAYER_ANIMATION_IDLE = [4, 4];
const PLAYER_ANIMATION_RUN = [1, 6];
const PLAYER_ANIMATION_JUMP = [6, 3];
const PLAYER_ANIMATION_FALL = [5, 3];
const PLAYER_ANIMATION_DIE = [0, 8];


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
    constructor(x, y, width, height, tiles = undefined) {
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
         * Amount by which the element is shifted along the x-axis when drawn (doesn't affect actual physics)
         * @type {number}
         */
        this.shiftX = 0;
        /**
         * Amount by which the element is shifted along the y-axis when drawn (doesn't affect actual physics)
         * @type {number}
         */
        this.shiftY = 0;
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
        this.tiles = tiles;
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
        /**
         * The SceneElement to which this is attached, if any
         * @type {SceneElement}
         */
        this.attachedTo = undefined;
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
        if (this.tiles !== undefined) {
            let shiftX = this.shiftX;
            let shiftY = this.shiftY;
            if (this.attachedTo) {
                shiftX += this.attachedTo.shiftX;
                shiftY += this.attachedTo.shiftY;
            }
            for (const tileData of this.tiles) {
                ctx.drawImage(
                    graphics.sheets.tiles,
                    16 * tileData.x, 16 * tileData.y,
                    16, 16,
                    this.x + tileData.shiftX + shiftX, this.y + tileData.shiftY + shiftY,
                    8, 8);
            }
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
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    move(dx, dy, mx = 0, my = 0) {
        // move all elements attached to this
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
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
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    moveTo(x, y, mx = 0, my = 0) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder, mx, my);
    }

    /**
     * Sets the element back to its original state (used when Scene is reset)
     */
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.isActive = true;
        for (const timer in this.timers) {
            this.timers[timer] = 0;
        }
        this.effects.length = 0;    // clear all effects
    }

    /**
     * Adds an effect to the SceneElement
     * @param effect {Effect} the Effect that is added
     * @returns {SceneElement} the SceneElement
     */
    addEffect(effect) {
        this.effects.push(effect);
        return this;
    }

    /**
     * Removes an effect on the SceneElement
     * @param effect {Effect} the Effect to remove
     * @returns {SceneElement} the SceneElement
     */
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
        element.attachedTo = this;
    }

    /**
     * Detaches a given SceneElement to this
     * @param element {SceneElement} the SceneElement to detach
     */
    detach(element) {
        this.attachedElements.delete(element);
        element.attachedTo = undefined;
    }
}


/**
 * Actors are SceneElements in a Scene that cannot pass through Solids (player characters and enemies for instance)
 */
class Actor extends SceneElement {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        /**
         * Momentum held along the x-axis (given by carrying Solids)
         * This attribute should be set using Actor.setMomentumX() to initalize the associated timer
         * @type {number}
         */
        this.momentumX = 0;
        /**
         * Momentum held along the y-axis (given by carrying Solids)
         * This attribute should be set using Actor.setMomentumY() to initalize the associated timer
         * @type {number}
         */
        this.momentumY = 0;
        /**
         * Timer for storing momentum along the x-axis
         * @type {number}
         */
        this.timers.momentumX = 0;
        /**
         * Timer for storing momentum along the y-axis
         * @type {number}
         */
        this.timers.momentumY = 0;
    }

    move(dx, dy, mx = 0, my = 0) {
        this.moveX(dx);
        this.moveY(dy);
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
     * Method called when the Actor collides with a Solid while being pushed by another
     */
    squish() {}

    /**
     * Method called when the Actor dies
     */
    die() {}

    /**
     * Sets the value of this.mx and starts the associated timer
     * @param mx {number} value of momentum along the x-axis
     */
    setMomentumX(mx) {
        if (mx) {
            this.momentumX = mx;
            this.timers.momentumX = constants.MOMENTUM_STORE_TIME;
        }
    }

    /**
     * Sets the value of this.my and starts the associated timer
     * @param my {number} value of momentum along the y-axis
     */
    setMomentumY(my) {
        if (my) {
            this.momentumY = my;
            this.timers.momentumY = constants.MOMENTUM_STORE_TIME;
        }
    }
}


class PlayerCharacter extends Actor {
    constructor(player, x = 0, y = 0) {
        super(x, y, 8, 14);
        /**
         * Associated Player
         */
        this.player = player;
        /**
         * Current speed along x-axis
         * @type {number}
         */
        this.speedX = 0;
        /**
         * Current speed along y-axis
         * @type {number}
         */
        this.speedY = 0;
        /**
         * Current dashing speed along x-axis
         * @type {number}
         */
        this.dashSpeedX = 0;
        /**
         * Current dashing speed along y-axis
         * @type {number}
         */
        this.dashSpeedY = 0;
        /**
         * Number of available dashes (should be 1 or 0)
         * @type {number}
         */
        this.nbDashes = 1;
        /**
         * Whether the character is standing on a solid
         * (set automatically during update)
         * @type {boolean}
         */
        this.isGrounded = true;
        /**
         * Whether the character is against a wall (and pressing the direction towards the wall)
         * (set automatically during update)
         * @type {boolean}
         */
        this.isHuggingWall = false;
        /**
         * Whether there is a climbable Solid to the left of the character at a distance of at most
         * constants.WALL_JUMP_CHECK_DISTANCE
         * (set automatically during update)
         * @type {boolean}
         */
        this.hasWallLeft = false;
        /**
         * Whether there is a climbable Solid to the right of the character at a distance of at most
         * constants.WALL_JUMP_CHECK_DISTANCE
         * (set automatically during update)
         * @type {boolean}
         */
        this.hasWallRight = false;
        /**
         * Set of Strawberries that have been taken by the character in the current Scene
         * - if the player dies, these Strawberries are reactivated in the Scene (and the player must take them again)
         * - if the player changes Scene, these Strawberries are removed from the Scene and stored as "regular"
         *     Strawberries for the player.
         * @type {Set<Strawberry>}
         */
        this.temporaryStrawberries = new Set();
        /**
         * Set of Strawberries that have been permanently taken by the player
         * @type {Set<Strawberry>}
         */
        this.strawberries = new Set();

        /**
         * Current state of the PlayerCharacter
         * @type {number}
         */
        this.state = constants.STATE_NORMAL;
        /**
         * Direction that the character is facing (1 if facing right, -1 if facing left)
         * @type {number}
         */
        this.spriteDirection = 1;
        /**
         * Row of the currently playing sprite animation in the sprite sheet
         *
         * This value corresponds to the row in the "simple" sprite sheet. The real sprite sheets used have 4 copies
         * of each row (two directions and two colors, whether the player can dash or not) so the actual row used when
         * drawing the sprite is (4 * this.spriteRow + k) where 0 ≤ k ≤ 3 depends on the state of the player.
         * @type {number}
         */
        this.spriteRow = 1;
        /**
         * Number of sprites in the currently playing sprite animation
         * @type {number}
         */
        this.nbSprites = 4;
        /**
         * Counter to detemine which sprite of the current animation should be drawn
         *
         * The counter is incremented by 1 at each frame so the index of the sprite drawn is
         * ~~(this.animationCount / ANIMATION_SLOWDOWN) % this.nbSprites
         * @type {number}
         */
        this.animationCounter = 0;

        // timers
        /**
         * Delay after leaving the ground during which the player is still allowed to jump ("Coyote time")
         * @type {number}
         */
        this.timers.jumpGrace = 0;
        /**
         * Cooldown duration of dash (impossible to dash during this time)
         * @type {number}
         */
        this.timers.dashCooldown = 0;
        /**
         * Short time during which the player is frozen in place when dashing
         * @type {number}
         */
        this.timers.dashFreeze = 0;
        /**
         * Duration of the dash (speed is fixed during this time period)
         * @type {number}
         */
        this.timers.dash = 0;
        /**
         * Duration after a jump during which the player has a fixed upwards speed if the jump button is held
         * @type {number}
         */
        this.timers.varJump = 0;
        /**
         * Time interval after the player dies before it respawns
         * @type {number}
         */
        this.timers.dying = 0;
        /**
         * Duration after touching a Spring during which the upwards speed of the player is fixed
         * @type {number}
         */
        this.timers.bounce = 0;
    }

    draw(ctx) {
        const index = ~~(this.animationCounter / ANIMATION_SLOWDOWN);
        const row = 4 * this.spriteRow + (this.nbDashes ? 0 : 2) + (this.spriteDirection === -1 ? 1 : 0);
        ctx.drawImage(
            graphics.sheets[this.player.color],
            16 * index, 16 * row,
            16, 16,
            this.x - 4 + this.shiftX, this.y - 2 + this.shiftY,
            16, 16);
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.animationCounter += 1;
        this.animationCounter %= this.nbSprites * ANIMATION_SLOWDOWN;

        // check environment
        this.isGrounded = false;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;
        for (const solid of this.scene.solids) {
            if (solid.isActive) {
                if (this.y + this.height === solid.y && segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                    // player is standing on a solid
                    this.isGrounded = true;
                }
                if (solid.canBeClimbed && segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                    // check for walls on right and left at distance <= WALL_JUMP_CHECK_DISTANCE
                    const distanceLeft = this.x - solid.x - solid.width;
                    if (0 <= distanceLeft && distanceLeft < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallLeft = true;
                    }
                    const distanceRight = solid.x - this.x - this.width;
                    if (0 <= distanceRight && distanceRight < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallRight = true;
                    }

                    if ((this.player.inputs.xAxis === 1 && this.x + this.width === solid.x) ||
                        (this.player.inputs.xAxis === -1 && this.x === solid.x + solid.width)) {
                        // player is hugging a wall
                        this.isHuggingWall = true;
                    }
                }
            }
        }

        if (this.isGrounded) {
            this.timers.jumpGrace = constants.JUMP_GRACE_TIME;
            if (this.state !== constants.STATE_DASH) {
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

    /**
     * Updates the movement of the PlayerCharacter (mostly its speed) according to its current state and player inputs
     * @param deltaTime {number} duration since last update
     */
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
                if (this.tryUpdateDash()) break;
                if (this.tryUpdateJump()) break;
                this.updateHorizontalMovement(deltaTime);
                this.updateVerticalMovement(deltaTime);
                break;
            case constants.STATE_JUMP:
                if (this.player.inputs.isPressed("jump") && this.timers.varJump > 0) {
                    this.speedY = Math.min(this.speedY, -constants.JUMP_SPEED);
                } else {
                    this.setState(constants.STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                this.tryUpdateDash();
                break;
            case constants.STATE_DASH:
                if (this.timers.dash > constants.DASH_TIME) {
                    this.speedX = 0;
                    this.speedY = 0;
                } else if (0 < this.timers.dash && this.timers.dash <= constants.DASH_TIME) {
                    this.speedX = this.dashSpeedX;
                    this.speedY = this.dashSpeedY;
                    if (this.tryUpdateJump()) break;
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

    /**
     * Checks if the character should dash (depending on player input and availability) and starts the dash (if it
     * should).
     *
     * This method is called during updateMovement() if the current state of the PlayerCharacter can be interrupted by
     * a dash.
     * @returns {boolean} whether a dash has started
     */
    tryUpdateDash() {
        if (this.nbDashes > 0 &&
            this.player.inputs.isPressed("dash") &&
            this.player.inputs.timers.dashBuffer > 0 &&
            this.timers.dashCooldown <= 0 &&
            (this.player.inputs.xAxis || this.player.inputs.yAxis)
        ) {
            const dashSpeed = this.player.inputs.xAxis && this.player.inputs.yAxis ? constants.DASH_SPEED / Math.sqrt(2) : constants.DASH_SPEED;
            this.dashSpeedX = this.player.inputs.xAxis * Math.max(Math.abs(this.speedX), dashSpeed);
            this.dashSpeedY = -this.player.inputs.yAxis * dashSpeed;
            this.speedX = 0;
            this.speedY = 0;
            this.timers.dashCooldown = constants.DASH_COOLDOWN + constants.DASH_FREEZE_TIME;
            this.setState(constants.STATE_DASH);
            this.nbDashes -= 1;
            return true;
        }
        return false;
    }

    /**
     * Checks if the character should jump (depending on player input and availability) and starts the dash (if it
     * should).
     *
     * This method is called during updateMovement() if the current state of the PlayerCharacter can be interrupted by
     * a jump.
     * @returns {boolean} whether a jump has started
     */
    tryUpdateJump() {
        let didJump = false;
        if (this.player.inputs.isPressed("jump") &&
            this.player.inputs.timers.jumpBuffer > 0 &&
            this.timers.jumpGrace > 0) {
            // regular jump
            this.speedX += this.player.inputs.xAxis * constants.JUMP_HORIZONTAL_BOOST;
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        } else if (
            this.player.inputs.isPressed("jump") &&
            this.player.inputs.timers.jumpBuffer > 0 &&
            (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            let dx = this.hasWallLeft ? 1 : -1;
            if ((this.player.inputs.xAxis === 1 && this.hasWallRight) || (this.player.inputs.xAxis === -1 && this.hasWallLeft)) {
                this.speedX = 0;
            } else {
                this.speedX = dx * constants.WALL_JUMP_HSPEED;
            }
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        }
        if (didJump) {
            if (this.timers.momentumX > 0) {
                this.speedX += constants.MOMENTUM_FACTOR * this.momentumX;
            }
            if (this.timers.momentumY > 0) {
                this.speedY += constants.MOMENTUM_FACTOR * this.momentumY;
            }
        }
        return didJump;
    }

    /**
     * Updates the horizontal speed (this.speedX) of the PlayerCharacter depending on player input and current
     * situation
     * @param deltaTime
     */
    updateHorizontalMovement(deltaTime) {
        if (this.player.inputs.xAxis !== 0) this.spriteDirection = this.player.inputs.xAxis;

        // horizontal movement
        let sx = Math.abs(this.speedX);        // absolute value of the horizontal speed of the player
        const dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        const mult = this.isGrounded ? 1 : constants.AIR_FACTOR;

        // passive deceleration
        if (dx * this.player.inputs.xAxis <= 0) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, 0);
        } else if (sx > constants.MAX_RUN_SPEED) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        }

        // active acceleration
        if (dx * this.player.inputs.xAxis > 0 && sx < constants.MAX_RUN_SPEED) {
            sx = Math.min(sx + constants.RUN_ACCELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        } else if (dx * this.player.inputs.xAxis < 0) {
            sx -= constants.RUN_ACCELERATION * deltaTime * mult;
        }
        this.speedX = dx * sx;
    }

    /**
     * Updates the vertical speed (this.speedY) of the PlayerCharacter depending on player input and current
     * situation
     * @param deltaTime
     */
    updateVerticalMovement(deltaTime) {
        if (!this.isGrounded) {
            if (this.isHuggingWall) {
                if (this.player.inputs.yAxis === 1) {
                    this.speedY = -constants.CLIMB_UP_SPEED;
                } else {
                    this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.CLIMB_SLIP_SPEED);
                }
            } else {
                this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.MAX_FALL_SPEED);
            }
        }
    }

    /**
     * Sets the current sprite animation to play depending on the state of the PlayerCharacter
     */
    updateAnimation() {
        if (this.state === constants.STATE_DEAD) {

        } else {
            if (this.isGrounded) {
                if (this.player.inputs.xAxis !== 0) {
                    this.setAnimation(...PLAYER_ANIMATION_RUN);
                } else {
                    this.setAnimation(...PLAYER_ANIMATION_IDLE);
                }
            } else if (this.isHuggingWall) {
                this.setAnimation(...PLAYER_ANIMATION_IDLE);
            } else {
                if (this.speedY > 0) {
                    this.setAnimation(...PLAYER_ANIMATION_FALL);
                } else {
                    this.setAnimation(...PLAYER_ANIMATION_JUMP);
                }
            }
        }
    }

    /**
     * Sets the currently playing sprite animation
     * @param sprite_row {number} row of the animation in the (simple) sprite sheet
     * @param nb_sprites {number} number of sprites in the animation
     */
    setAnimation(sprite_row, nb_sprites) {
        if (sprite_row !== this.spriteRow) {
            this.spriteRow = sprite_row;
            this.animationCounter = 0;
            this.nbSprites = nb_sprites;
        }
    }

    /**
     * Changes the state of the PlayerCharacter
     *
     * If the new state is different from the current state, special actions can be performed when leaving the current
     * state and when entering the new state. This method does nothing if the new state is the same as the current
     * state.
     *
     * @param newState {number} new state of the PlayerCharacter
     */
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
                    sound.playSound(sound.effects.jump);
                    this.timers.jumpGrace = 0;
                    this.player.inputs.timers.jumpBuffer = 0;
                    this.timers.varJump = constants.VAR_JUMP_TIME;
                    break;
                case constants.STATE_DASH:
                    sound.playSound(sound.effects.dash);
                    this.player.inputs.timers.dashBuffer = 0;
                    this.timers.dashCooldown = constants.DASH_COOLDOWN;
                    this.timers.dash = constants.DASH_TIME + constants.DASH_FREEZE_TIME;
                    break;
                case constants.STATE_DEAD:
                    sound.playSound(sound.effects.die);
                    this.timers.dying = constants.DYING_TIME;
                    break;
                case constants.STATE_BOUNCE:
                    this.timers.bounce = constants.BOUNCE_TIME;
                    break;
            }
            this.state = newState;
        }
    }

    /**
     * Executes a transition from a Scene to another (triggered when the PlayerCharacter touches a Transition)
     * @param transition {Transition} the Transition object that triggered the Scene change
     */
    makeTransition(transition) {
        // store temporary strawberries permanently
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.scene.removeThing(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        // move PlayerCharacter the the new Scene
        this.scene.removeActor(this);
        transition.targetScene.addActor(this);
        transition.targetScene.spawnPointIndex = transition.spawnPointIndex;
        this.restoreDash();
    }

    squish() {
        this.die();
    }

    die() {
        this.isActive = false;
        this.temporaryStrawberries.clear();
        this.setState(constants.STATE_DEAD);
        this.setAnimation(...PLAYER_ANIMATION_DIE);
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

    /**
     * Restores the dash ability to the PlayerCharacter
     * @returns {boolean} true if the PlayerCharacter didn't have a dash when the function was called
     */
    restoreDash() {
        if (this.nbDashes === 1) {
            return false;
        } else {
            this.nbDashes = 1;
            return true;
        }
    }

    /**
     * Returns true if the PlayerCharacter is currently "riding" the Solid given as parameter, meaning that when the
     * Solid moves it should move the PlayerCharacter too.
     * A PlayerCharacter is considered to be riding a Solid it is standing directly on top of it or if it is hugging
     * it (touching on left or right and pressing direction towards the Solid)
     *
     * @param solid {Solid}
     * @returns {boolean} true if the PlayerCharacter is riding the solid
     */
    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                solid.canBeClimbed &&
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.player.inputs.xAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.player.inputs.xAxis === 1 && solid.x === this.x + this.width)
                )
            );
    }
}


/**
 * Solids are SceneElements that Actors cannot pass through. There should never be an Actor overlapping a Solid (unless
 * either one is marked as inactive). When Solids move, they interact with Actors that might otherwise overlap (they
 * might push them, kill them, etc.).
 *
 * Two Solids might overlap, and in general the movement of a Solid is not affected by other Solids.
 */
class Solid extends SceneElement {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
        /**
         * Whether the Solid should be considered when checking collisions with an Actor
         * This attribute is used automatically by the move() method when the Solid pushes an Actor. It should not be
         * changed in other circumstances (use isActive to disable the Solid).
         * @type {boolean}
         */
        this.collidable = true;
        /**
         * Whether a Player character can climb on (or slowly slide against) the sides of the Solid
         * @type {boolean}
         */
        this.canBeClimbed = true;
    }

    /**
     * Moves the Solid by a given amount
     *
     * After the Solid is moved, all Actors of the Scene must be checked
     * - Actors that overlap the new position of the Solid must be pushed
     * - Actors that are riding the solid must be carried
     *
     * The implementation is close to the description of the Celeste and Towerfall engine :
     * https://medium.com/@MattThorson/celeste-and-towerfall-physics-d24bd2ae0fc5
     * (with some modifications, for instance the fact that the Solid is moved by its full amount in one step, not
     * 1 pixel at a time)
     *
     * @param dx {number} number of pixels to move right
     * @param dy {number} number of pixels to move down
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    move(dx, dy, mx = 0, my = 0) {
        // move all attached elements
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
        }

        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);  // integer amount to move
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
                                // push actors that overlap with this after move
                                actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
                                if (actor.movedX <= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX < moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                                actor.setMomentumX(mx);
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                // push actors that overlap with this after move
                                actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
                                if (actor.movedX >= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX > moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                                actor.setMomentumX(mx);
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
                                // push actors that overlap with this after move
                                actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
                                if (actor.movedY <= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY < moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                                actor.setMomentumY(my);
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                // push actors that overlap with this after move
                                actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
                                if (actor.movedY >= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY > moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                                actor.setMomentumY(my);
                            }
                        }
                    }
                }
            }
            this.collidable = true;
        }
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
 * Platforms are flat Solids (0 height) that Actors can pass through when moving upwards but not downwards (if they are
 * entirely higher than the Platform)
 *
 * Contrary to regular Solids, Platforms are allowed to overlap with Actors.
 */
class Platform extends Solid {
    constructor(x, y, width, tiles) {
        super(x, y, width, 0, tiles);
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
 * CrumblingBlocks are Solids that disappear shortly after a Player hits it (only when the Player is considered to be
 * "carried" by the CrumblingBlock).
 * They reappear after a given time (if there are no Actors on their position)
 */
class CrumblingBlock extends Solid {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(57)]);
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
            for (const actor of this.scene.actors) {
                if (actor.isRiding(this)) {
                    sound.playSound(sound.effects.crumblingBlock);
                    this.isFalling = true;
                    this.timers.fall = .5;  // duration before disappearing
                    break;
                }
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
 * TriggerBlocks are Solids that start moving when they carry an Actor
 */
class TriggerBlock extends Solid {
    constructor(x, y, width, height, delay, movement, tiles = undefined) {
        if (tiles === undefined) {
            tiles = [];
            for (let i = 0; i < height; i += U) {
                for (let j = 0; j < width; j += U) {
                    const index = 64 + Math.floor(Math.random() * 4);
                    tiles.push(new graphics.TileData(index, j, i));
                }
            }
        }
        super(x, y, width, height, tiles);
        /**
         * Whether the block has been triggered by an Actor but has not yet started executing the movement (during
         * trigger delay)
         * @type {boolean}
         */
        this.isTriggered = false;
        /**
         * Time delay before the movement starts when the block is triggered
         * @type {number}
         */
        this.delay = delay;
        /**
         * movement to execute when triggered by an Actor
         * @type {Effect}
         */
        this.triggeredMovement = movement;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.shiftX = 0;
        this.shiftY = 0;
        if (this.isTriggered) {
            if (this.timers.trigger <= 0) {
                this.isTriggered = false;
                this.triggeredMovement.reset();
                this.addEffect(this.triggeredMovement);
            } else {
                this.shiftX = Math.floor(Math.random() * 3) - 1;
                this.shiftY = Math.floor(Math.random() * 3) - 1;
            }
        } else if (this.effects.includes(this.triggeredMovement)) {
            if (this.triggeredMovement.remainingCount === 0) {
                this.removeEffect(this.triggeredMovement);
            }
        } else {
            let shouldTrigger = false;
            for (const actor of this.scene.actors) {
                if (actor.isRiding(this)) {
                    shouldTrigger = true;
                }
            }
            if (shouldTrigger) {
                this.timers.trigger = this.delay;
                this.isTriggered = true;
            }
        }
    }

    reset() {
        super.reset();
        this.isTriggered = false;
        this.triggeredMovement.reset();
    }
}


/**
 * FallingBlocks are TriggerBlocks that fall when triggered by an Actor
 *
 * Their behavior is the same as a TriggerBlock (the fall is defined by the associated movement) but are represented
 * with different tiles.
 */
class FallingBlock extends TriggerBlock {
    constructor(x, y, width, height, delay, movement) {
        const tiles = [];
        tiles.push(new graphics.TileData(3));
        tiles.push(new graphics.TileData(5, width - U, 0));
        tiles.push(new graphics.TileData(16, 0, height - U));
        tiles.push(new graphics.TileData(18, width - U, height - U));
        for (let x = U; x < width - U; x += U) {
            tiles.push(new graphics.TileData(4, x, 0));
            tiles.push(new graphics.TileData(17, x, height - U));
        }
        for (let y = U; y < height - U; y += U) {
            tiles.push(new graphics.TileData(8, 0, y));
            tiles.push(new graphics.TileData(10, width - U, y));
        }
        for (let x = U; x < width - U; x += U) {
            for (let y = U; y < height - U; y += U) {
                tiles.push(new graphics.TileData(9, x, y));
            }
        }
        super(x, y, width, height, delay, movement, tiles);
    }
}


/**
 * Things are SceneElements that do not interact with Solid physics, but can have an effect when an Actor touches them
 */
class Thing extends SceneElement {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
    }

    /**
     * Action to execute when an Actor touches the Thing
     * @param actor {Actor} the Actor that touches the Thing
     */
    onContactWith(actor) {}
}


/**
 * Hazards are Things that kill the Actor on contact
 */
class Hazard extends Thing {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
    }

    onContactWith(actor) {
        actor.die();
    }
}


/**
 * Springs are SceneElements that throw Players up on contact
 */
class Spring extends Thing {
    constructor(x, y) {
        const tiles1 = [
            new graphics.TileData(52, 0, -U / 2),
            new graphics.TileData(53, U, -U / 2)
        ];
        const tiles2 = [
            new graphics.TileData(54, 0, -U / 2),
            new graphics.TileData(55, U, -U / 2)
        ]
        super(x, y + U / 2, 2 * U, U / 2, tiles1);
        this.tiles1 = tiles1;
        this.tiles2 = tiles2;
        this.timers.extended = 0;
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter) {
            sound.playSound(sound.effects.spring);
            actor.setState(constants.STATE_BOUNCE);
            actor.speedX = 0;
            actor.speedY = constants.BOUNCE_SPEED;
            actor.restoreDash();
            this.timers.extended = .25;
        }
    }

    draw(ctx) {
        this.tiles = (this.timers.extended > 0) ? this.tiles2 : this.tiles1;
        super.draw(ctx);
    }
}


/**
 * DashDiamonds are SceneElements that restore the dash counter of the Players who touch them
 */
class DashDiamond extends Thing {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(21)]);
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter && actor.isActive) {
            if (actor.restoreDash()) {
                sound.playSound(sound.effects.dashDiamond);
                this.isActive = false;
                this.timers.cooldown = 2;
            }
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


/**
 * Strawberries are collectibles that Players take on contact.
 * If a Player dies after collecting a Strawberry before changing Scene, the Strawberry is restored in the Scene
 * (and removed from the Player's list of collected Strawberries)
 */
class Strawberry extends Thing {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(13)]);
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter && actor.isActive) {
            sound.playSound(sound.effects.strawberry);
            actor.temporaryStrawberries.add(this);
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
 * SpikesUp are Hazards that kill an Actor if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, [new graphics.TileData(40, 0, -U / 2)]);
    }

    onContactWith(actor) {
        if (actor.movedY - this.movedY >= 0) {
            actor.die();
        }
    }
}


/**
 * SpikesDown are Hazards that kill an Actor if it moves upwards on them
 */
class SpikesDown extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U / 2, [new graphics.TileData(42)]);
    }

    onContactWith(actor) {
        if (actor.movedY - this.movedY < 0) {
            actor.die();
        }
    }
}


/**
 * SpikesRight are Hazards that kill an Actor if it moves leftwards on them
 */
class SpikesRight extends SceneElement {
    constructor(x, y) {
        super(x, y, U / 2, U, [new graphics.TileData(41)]);
    }

    onContactWith(actor) {
        if (actor.movedX - this.movedX < 0) {
            actor.die();
        }
    }
}


/**
 * SpikesUp are Hazards that kill an Actor if it moves rightwards on them
 */
class SpikesLeft extends SceneElement {
    constructor(x, y) {
        super(x + U / 2, y, U / 2, U, [new graphics.TileData(43, -U / 2, 0)]);
    }

    onContactWith(actor) {
        if (actor.movedX - this.movedX > 0) {
            actor.die();
        }
    }
}


/**
 * Transitions are SceneElements that transfer a Player from one Scene to another on contact
 */
class Transition extends Thing {
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

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter) {
            this.targetScene.reset();
            actor.x += this.targetX - this.x;
            actor.y += this.targetY - this.y;
            actor.makeTransition(this);
            this.scene.transition = this;
        }
    }
}


module.exports = {
    Actor,
    PlayerCharacter,
    Solid,
    Platform,
    CrumblingBlock,
    TriggerBlock,
    FallingBlock,
    Thing,
    Hazard,
    Spring,
    DashDiamond,
    Strawberry,
    SpikesUp,
    SpikesDown,
    SpikesRight,
    SpikesLeft,
    Transition,
}

},{"./constants":1,"./graphics":4,"./sound":12}],10:[function(require,module,exports){
const physics = require('./physics');
const inputs = require('./inputs');

class Player {
    constructor(color) {
        this.color = color;
        this.character = new physics.PlayerCharacter(this);
        this.inputs = new inputs.PlayerInputs();
    }

    update(deltaTime) {
        this.inputs.update(deltaTime);
    }
}

module.exports = {
    Player,
}
},{"./inputs":5,"./physics":9}],11:[function(require,module,exports){
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
                        scene.addSolid(new physics.Platform(x, y, U, [tileData]));
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
                        scene.addThing(new physics.Hazard(x, y, U, U, [tileData]));
                        break;
                    case 13:
                        scene.addThing(new physics.Strawberry(x + U / 2, y + U / 2));
                        break;
                    case 57:
                        scene.addSolid(new physics.CrumblingBlock(x, y));
                        break;
                    case 52:
                        scene.addThing(new physics.Spring(x, y));
                        break;
                    case 53:
                        break;
                    default:
                        scene.addSolid(new physics.Solid(x, y, U, U, [tileData]));
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

},{"./constants":1,"./globals":3,"./graphics":4,"./inputs":5,"./menu":8,"./physics":9}],12:[function(require,module,exports){
const effects = {
    jump: new Audio('sound/char_mad_jump.ogg'),
    dash: new Audio('sound/char_mad_dash_pink_left.ogg'),
    die: new Audio('sound/char_mad_death.ogg'),
    crumblingBlock: new Audio('sound/game_gen_fallblock_shake.ogg'),
    strawberry: new Audio('sound/game_gen_strawberry_red_get_1up.ogg'),
    dashDiamond: new Audio('sound/game_gen_diamond_touch_01.ogg'),
    spring: new Audio('sound/game_gen_spring.ogg'),
}
const bgMusic = new Audio('sound/bg_music.wav');
bgMusic.loop = true;

let soundVolume;
let musicVolume;

function getSoundVolume() {
    return soundVolume;
}


function setSoundVolume(value) {
    soundVolume = value;
    for (const effect of Object.values(effects)) {
        effect.volume = soundVolume / 16;
    }
}


function incrementSoundVolume() {
    if (soundVolume < 5) {
        setSoundVolume(soundVolume + 1);
    }
}


function decrementSoundVolume() {
    if (soundVolume > 0) {
        setSoundVolume(soundVolume - 1);
    }
}


function getMusicVolume() {
    return musicVolume;
}


function setMusicVolume(value) {
    musicVolume = value;
    bgMusic.volume = musicVolume / 24;
}


function incrementMusicVolume() {
    if (musicVolume < 5) {
        setMusicVolume(musicVolume + 1);
    }
}


function decrementMusicVolume() {
    if (musicVolume > 0) {
        setMusicVolume(musicVolume - 1);
    }
}


function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}


setSoundVolume(5);
setMusicVolume(5);

module.exports = {
    effects,
    bgMusic,
    getSoundVolume,
    getMusicVolume,
    playSound,
    incrementSoundVolume,
    decrementSoundVolume,
    incrementMusicVolume,
    decrementMusicVolume,
}
},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImdsb2JhbHMuanMiLCJncmFwaGljcy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzXy5qcyIsIm1lbnUuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeDVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3cERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfVVBfU1BFRUQgPSA0NTtcbmNvbnN0IENMSU1CX1NMSVBfU1BFRUQgPSAzMDtcbmNvbnN0IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSA9IDM7XG5jb25zdCBXQUxMX0pVTVBfSFNQRUVEID0gTUFYX1JVTl9TUEVFRCArIEpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbmNvbnN0IERBU0hfU1BFRUQgPSAyNDA7XG5jb25zdCBFTkRfREFTSF9TUEVFRCA9IDE2MDtcbmNvbnN0IEVORF9EQVNIX1VQX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfVElNRSA9IC4xNTtcbmNvbnN0IERBU0hfQ09PTERPV04gPSAuMjtcblxuLy8gT3RoZXIgY29uc3RhbnRzXG5jb25zdCBNT01FTlRVTV9TVE9SRV9USU1FID0gLjE7XG5jb25zdCBNT01FTlRVTV9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX0ZSRUVaRV9USU1FID0gLjA1O1xuY29uc3QgQk9VTkNFX1RJTUUgPSAuMjtcbmNvbnN0IEJPVU5DRV9TUEVFRCA9IDE5MDtcbmNvbnN0IERZSU5HX1RJTUUgPSAuODtcbmNvbnN0IFNUQVRFX05PUk1BTCA9IDA7XG5jb25zdCBTVEFURV9KVU1QID0gMTtcbmNvbnN0IFNUQVRFX0RBU0ggPSAyO1xuY29uc3QgU1RBVEVfREVBRCA9IDM7XG5jb25zdCBTVEFURV9CT1VOQ0UgPSA0O1xuXG5jb25zdCBHUklEX1NJWkUgPSA4O1xuY29uc3QgVklFV19XSURUSCA9IDMyMDtcbmNvbnN0IFZJRVdfSEVJR0hUID0gMTgwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNQVhfUlVOX1NQRUVELFxuICAgIFJVTl9BQ0NFTEVSQVRJT04sXG4gICAgUlVOX0RFQ0VMRVJBVElPTixcbiAgICBBSVJfRkFDVE9SLFxuICAgIEpVTVBfU1BFRUQsXG4gICAgSlVNUF9IT1JJWk9OVEFMX0JPT1NULFxuICAgIE1BWF9GQUxMX1NQRUVELFxuICAgIEdSQVZJVFksXG4gICAgSlVNUF9HUkFDRV9USU1FLFxuICAgIFZBUl9KVU1QX1RJTUUsXG4gICAgQ0xJTUJfVVBfU1BFRUQsXG4gICAgQ0xJTUJfU0xJUF9TUEVFRCxcbiAgICBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UsXG4gICAgV0FMTF9KVU1QX0hTUEVFRCxcbiAgICBEQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1VQX0ZBQ1RPUixcbiAgICBEQVNIX1RJTUUsXG4gICAgREFTSF9DT09MRE9XTixcbiAgICBNT01FTlRVTV9TVE9SRV9USU1FLFxuICAgIE1PTUVOVFVNX0ZBQ1RPUixcbiAgICBEQVNIX0ZSRUVaRV9USU1FLFxuICAgIEJPVU5DRV9USU1FLFxuICAgIEJPVU5DRV9TUEVFRCxcbiAgICBEWUlOR19USU1FLFxuICAgIFNUQVRFX05PUk1BTCxcbiAgICBTVEFURV9KVU1QLFxuICAgIFNUQVRFX0RBU0gsXG4gICAgU1RBVEVfREVBRCxcbiAgICBTVEFURV9CT1VOQ0UsXG4gICAgR1JJRF9TSVpFLFxuICAgIFZJRVdfV0lEVEgsXG4gICAgVklFV19IRUlHSFQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogRWZmZWN0cyBhcmUgb2JqZWN0cyB0aGF0IGNhbiBiZSBhc3NvY2lhdGVkIHRvIGEgU2NlbmVFbGVtZW50IGFuZCBjYW4gZXhlY3V0ZSBhbiBhY3Rpb24gb24gdGhlIGVsZW1lbnQgYXQgZWFjaCBmcmFtZVxuICpcbiAqIEVmZmVjdHMgaGF2ZSBhIGBkdXJhdGlvbmAgKGFzc29jaWF0ZWQgdG8gYSB0aW1lcikgYW5kIGEgYGNvdW50YCB0aGF0IHNldHMgdGhlIG51bWJlciBvZiB0aW1lcyB0aGUgZWZmZWN0IHdpbGwgYmVcbiAqIGV4ZWN1dGVkIG9uIHRoZSBlbGVtZW50IChmb3IgaXRzIGZ1bGwgZHVyYXRpb24gZXZlcnkgdGltZSlcbiAqL1xuY2xhc3MgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEdXJhdGlvbiBvZiB0aGUgRWZmZWN0IChpbiBzZWNvbmRzKVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB0aGUgZHVyYXRpb24gaXMgPD0gMCwgdGhlIGVmZmVjdCBpcyBjb25zaWRlcmVkIHRvIGhhdmUgaW5maW5pdGUgZHVyYXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE51bWJlciBvZiB0aW1lcyB0aGF0IHRoZSBFZmZlY3Qgc2hvdWxkIGJlIHJlcGVhdGVkXG4gICAgICAgICAqXG4gICAgICAgICAqIEV2ZXJ5IHRpbWUgdGhlIHRpbWVyIHJlYWNoZXMgMCwgdGhlIGNvdW50IGlzIGRlY3JlbWVudGVkIGJ5IDEuIElmIHRoZSBjb3VudCBpcyAwLCB0aGUgZWZmZWN0IGlzIHN0b3BwZWQuXG4gICAgICAgICAqIChpZiB0aGUgY291bnQgaXMgPCAwLCB0aGUgZWZmZWN0IHJlcGVhdHMgaW5maW5pdGVseSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIHRvIG1lYXN1cmUgdGhlIHJlbWFpbmluZyB0aW1lIG9mIHRoZSBFZmZlY3RcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXIgPSBkdXJhdGlvbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE51bWJlciBvZiByZXBldGl0aW9ucyBsZWZ0IHRvIHBlcmZvcm1cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgYXV0b21hdGljYWxseSBieSB0aGUgU2NlbmVFbGVtZW50IG9uIGVhY2ggb2YgaXRzIEVmZmVjdHNcbiAgICAgKiBAcGFyYW0gZGVsdGFUaW1lIHtudW1iZXJ9IHRpbWUgZWxhcHNlZCBzaW5jZSBsYXN0IHVwZGF0ZVxuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBlbGVtZW50IHRvIHdoaWNoIHRoZSBFZmZlY3QgaXMgYXR0YWNoZWRcbiAgICAgKi9cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHRoaXMudGltZXIgLT0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA+IDAgJiYgdGhpcy5yZW1haW5pbmdDb3VudCAmJiB0aGlzLnRpbWVyIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciArPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSB0aGUgRWZmZWN0IHRvIGl0cyBpbml0aWFsIHN0YXRlXG4gICAgICovXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBBbiBFZmZlY3RTZXF1ZW5jZSBpcyBhIGxpc3Qgb2YgZWZmZWN0cyB0aGF0IGFyZSBleGVjdXRlZCBvbmUgYWZ0ZXIgdGhlIG90aGVyXG4gKiBUaGUgRWZmZWN0U2VxdWVuY2UgaGFzIG5vIGR1cmF0aW9uIG9mIGl0cyBvd24uIFRoZSBgY291bnRgIGF0dHJpYnV0ZSBkZWZpbmVzIGhvdyBtYW55IHRpbWVzIHRoZSB3aG9sZSBzZXF1ZW5jZSBpc1xuICogcmVwZWF0ZWQuXG4gKlxuICogRWFjaCBpbmRpdmlkdWFsIEVmZmVjdCBpbiB0aGUgc2VxdWVuY2UgaGFzIGl0cyBvd24gZHVyYXRpb24gYW5kIG51bWJlciBvZiByZXBldGl0aW9uc1xuICovXG5jbGFzcyBFZmZlY3RTZXF1ZW5jZSBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoZWZmZWN0cywgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKDAsIGNvdW50KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIExpc3Qgb2YgRWZmZWN0cyBpbiB0aGUgc2VxdWVuY2VcbiAgICAgICAgICogQHR5cGUge1tFZmZlY3RdfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lZmZlY3RzID0gZWZmZWN0cztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSBjdXJyZW50bHkgZXhlY3V0aW5nIEVmZmVjdCBpbiB0aGUgc2VxdWVuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IC10aGlzLmVmZmVjdHNbdGhpcy5pbmRleF0udGltZXI7XG4gICAgICAgICAgICBpZiAoZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLmVmZmVjdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLmVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogQSBMaW5lYXJNb3ZlbWVudCBtb3ZlcyB0aGUgU2NlbmVFbGVtZW50IGluIGEgbGluZWFyIHRyYWplY3RvcnkgZnJvbSBhIHN0YXJ0aW5nIHBvaW50IHRvIGEgdGFyZ2V0IHBvaW50IGluIGEgZ2l2ZW5cbiAqIHRpbWUuXG4gKi9cbmNsYXNzIExpbmVhck1vdmVtZW50IGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogeCBjb29yZGluYXRlIG9mIHRoZSBzdGFydGluZyBwb2ludFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICAvKipcbiAgICAgICAgICogeSBjb29yZGluYXRlIG9mIHRoZSBzdGFydGluZyBwb2ludFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICAvKipcbiAgICAgICAgICogeCBjb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9pbnRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHkgY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvaW50XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBtb21lbnR1bSBvZiB0aGUgbW92ZW1lbnQgYWxvbmcgdGhlIHgtYXhpc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICAvKipcbiAgICAgICAgICogbW9tZW50dW0gb2YgdGhlIG1vdmVtZW50IGFsb25nIHRoZSB5LWF4aXNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKHIgKiB0aGlzLngxICsgKDEgLSByKSAqIHRoaXMueDIsIHIgKiB0aGlzLnkxICsgKDEgLSByKSAqIHRoaXMueTIsIHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBBIFNpbmVNb3ZlbWVudCBtb3ZlcyB0aGUgU2NlbmVFbGVtZW50IGJhY2sgYW5kIGZvcnRoIGJldHdlZW4gdHdvIHBvaW50cyBpbiBhIHNpbmUtYmFzZWQgdHJhamVjdG9yeVxuICovXG5jbGFzcyBTaW5lTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0aW5nIHBvaW50XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0aW5nIHBvaW50XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4IGNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldCBwb2ludFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICAvKipcbiAgICAgICAgICogeSBjb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9pbnRcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyID4gMCkge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSAodGhpcy5kdXJhdGlvbiAtIHRoaXMudGltZXIpICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgY29uc3QgZHJhdGlvID0gTWF0aC5QSSAqIE1hdGguc2luKGFuZ2xlKSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyhcbiAgICAgICAgICAgICAgICByYXRpbyAqIHRoaXMueDEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueDIsXG4gICAgICAgICAgICAgICAgcmF0aW8gKiB0aGlzLnkxICsgKDEgLSByYXRpbykgKiB0aGlzLnkyLFxuICAgICAgICAgICAgICAgIGRyYXRpbyAqICh0aGlzLngyIC0gdGhpcy54MSksXG4gICAgICAgICAgICAgICAgZHJhdGlvICogKHRoaXMueTIgLSB0aGlzLnkxKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKHRoaXMueDEsIHRoaXMueTEpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEVmZmVjdCxcbiAgICBFZmZlY3RTZXF1ZW5jZSxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTaW5lTW92ZW1lbnQsXG59IiwiY29uc3QgcGxheWVycyA9IFtdO1xubGV0IGN1cnJlbnRTY2VuZTtcbmNvbnN0IHNjYWxpbmcgPSAzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwbGF5ZXJzLFxuICAgIGN1cnJlbnRTY2VuZSxcbiAgICBzY2FsaW5nLFxufVxuIiwiY29uc3Qgc2hlZXRzID0ge307XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdG8gYmUgdXNlZCB3aGVuIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IG9mIHRoZSBzY2VuZVxuICovXG5jbGFzcyBUaWxlRGF0YSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHNoaWZ0WCA9IDAsIHNoaWZ0WSA9IDApIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LXBvc2l0aW9uIG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnggPSB0aGlzLmluZGV4ICUgODtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueSA9IHRoaXMuaW5kZXggPj4gMztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtb2Zmc2V0IHRvIGRyYXcgdGhlIHRpbGUgZnJvbSB0aGUgU2NlbmVFbGVtZW50J3MgcG9zaXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRYID0gc2hpZnRYO1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSBzaGlmdFk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvYWRTaGVldCh1cmwsIG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBzaGVldHNbbmFtZV0gPSBpbWFnZTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGltYWdlLnNyYyA9IHVybDtcbiAgICB9KTtcbn1cblxuXG5jb25zdCBsb2FkR3JhcGhpY3MgPSBQcm9taXNlLmFsbChbXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19yZWQucG5nJywgJ3JlZCcpLFxuICAgIGxvYWRTaGVldCgnaW1hZ2VzL2hlcm9fZ3JlZW4ucG5nJywgJ2dyZWVuJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19ibHVlLnBuZycsICdibHVlJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvdGlsZXNldC5wbmcnLCAndGlsZXMnKSxcbl0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFRpbGVEYXRhLFxuICAgIHNoZWV0cyxcbiAgICBsb2FkR3JhcGhpY3MsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgQVhFU19USFJFU0hPTEQgPSAuNDtcblxubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXZpb3VzbHlQcmVzc2VkS2V5cztcbmxldCBjdXJyZW50bHlQcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnMgPSBbXTtcbmxldCBjdXJyZW50bHlQcmVzc2VkQnV0dG9ucyA9IFtdO1xuXG5cbmZ1bmN0aW9uIG9uR2FtZXBhZENvbm5lY3RlZChnYW1lcGFkKSB7XG4gICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbZ2FtZXBhZC5pbmRleF0gPSBuZXcgU2V0KCk7XG59XG5cblxuZnVuY3Rpb24gb25HYW1lcGFkRGlzY29ubmVjdGVkKGdhbWVwYWQpIHtcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tnYW1lcGFkLmluZGV4XSA9IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBpc1RhcHBlZEtleShrZXkpIHtcbiAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEtleXMuaGFzKGtleSkgJiYgIXByZXZpb3VzbHlQcmVzc2VkS2V5cy5oYXMoa2V5KTtcbn1cblxuXG5mdW5jdGlvbiBpc1ByZXNzZWRLZXkoa2V5KSB7XG4gICAgcmV0dXJuIGN1cnJlbnRseVByZXNzZWRLZXlzLmhhcyhrZXkpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFByZXNzZWRLZXlzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KGN1cnJlbnRseVByZXNzZWRLZXlzKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRUYXBwZWRLZXlzKCkge1xuICAgIGNvbnN0IHRhcHBlZEtleXMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgY3VycmVudGx5UHJlc3NlZEtleXMpIHtcbiAgICAgICAgaWYgKCFwcmV2aW91c2x5UHJlc3NlZEtleXMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIHRhcHBlZEtleXMuYWRkKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcHBlZEtleXM7XG59XG5cblxuZnVuY3Rpb24gZ2V0UHJlc3NlZEJ1dHRvbnMoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRseVByZXNzZWRCdXR0b25zLm1hcChzID0+IG5ldyBTZXQocykpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFRhcHBlZEJ1dHRvbnMoKSB7XG4gICAgY29uc3QgdGFwcGVkQnV0dG9ucyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgZm9yIChjb25zdCBidXR0b24gb2YgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0pIHtcbiAgICAgICAgICAgIGlmICghcHJldmlvdXNseVByZXNzZWRCdXR0b25zW2ldLmhhcyhidXR0b24pKSB7XG4gICAgICAgICAgICAgICAgcy5hZGQoYnV0dG9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0YXBwZWRCdXR0b25zLnB1c2gocyk7XG4gICAgfVxuICAgIHJldHVybiB0YXBwZWRCdXR0b25zO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZUlucHV0cygpIHtcbiAgICBwcmV2aW91c2x5UHJlc3NlZEtleXMgPSBjdXJyZW50bHlQcmVzc2VkS2V5cztcbiAgICBjdXJyZW50bHlQcmVzc2VkS2V5cyA9IG5ldyBTZXQocHJlc3NlZEtleXMpO1xuICAgIHByZXZpb3VzbHlQcmVzc2VkQnV0dG9ucyA9IGN1cnJlbnRseVByZXNzZWRCdXR0b25zO1xuICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zID0gW107XG4gICAgZm9yIChjb25zdCBnYW1lcGFkIG9mIG5hdmlnYXRvci5nZXRHYW1lcGFkcygpKSB7XG4gICAgICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gZ2FtZXBhZC5pbmRleDtcbiAgICAgICAgICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zW2ldID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2FtZXBhZC5idXR0b25zW2pdLnByZXNzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0uYWRkKGopO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1tpXS5oYXMoaikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmF4ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgYnV0dG9uSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmF4ZXNbal0gPiBBWEVTX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25JbmRleCA9IDIgKiBqICsgZ2FtZXBhZC5idXR0b25zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGdhbWVwYWQuYXhlc1tqXSA8IC1BWEVTX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25JbmRleCA9IDIgKiBqICsgZ2FtZXBhZC5idXR0b25zLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChidXR0b25JbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tpXS5hZGQoYnV0dG9uSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1tpXS5oYXMoYnV0dG9uSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhidXR0b25JbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgUGxheWVySW5wdXRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZG1hcCA9IHtcbiAgICAgICAgICAgIHVwOiAxMixcbiAgICAgICAgICAgIGRvd246IDEzLFxuICAgICAgICAgICAgbGVmdDogMTQsXG4gICAgICAgICAgICByaWdodDogMTUsXG4gICAgICAgICAgICBqdW1wOiAwLFxuICAgICAgICAgICAgZGFzaDogMSxcbiAgICAgICAgICAgIHBhdXNlOiA5LFxuICAgICAgICB9XG4gICAgICAgIHRoaXMua2V5bWFwID0ge1xuICAgICAgICAgICAgdXA6ICdBcnJvd1VwJyxcbiAgICAgICAgICAgIGRvd246ICdBcnJvd0Rvd24nLFxuICAgICAgICAgICAgbGVmdDogJ0Fycm93TGVmdCcsXG4gICAgICAgICAgICByaWdodDogJ0Fycm93UmlnaHQnLFxuICAgICAgICAgICAganVtcDogJ2cnLFxuICAgICAgICAgICAgZGFzaDogJ2YnLFxuICAgICAgICAgICAgcGF1c2U6ICdFc2NhcGUnLFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGltZXJzID0ge1xuICAgICAgICAgICAganVtcEJ1ZmZlcjogMCxcbiAgICAgICAgICAgIGRhc2hCdWZmZXI6IDAsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaXNQcmVzc2VkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwW2FjdGlvbl0pIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdICYmXG4gICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdLmhhcyh0aGlzLmdhbWVwYWRtYXBbYWN0aW9uXSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgaXNQcmV2aW91c2x5UHJlc3NlZChhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzbHlQcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbYWN0aW9uXSkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdICYmXG4gICAgICAgICAgICAgICAgcHJldmlvdXNseVByZXNzZWRCdXR0b25zW3RoaXMuZ2FtZXBhZEluZGV4XS5oYXModGhpcy5nYW1lcGFkbWFwW2FjdGlvbl0pXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIGlzVGFwcGVkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1ByZXNzZWQoYWN0aW9uKSAmJiAhdGhpcy5pc1ByZXZpb3VzbHlQcmVzc2VkKGFjdGlvbik7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueEF4aXMgPSAodGhpcy5pc1ByZXNzZWQoXCJsZWZ0XCIpID8gLTEgOiAwKSArICh0aGlzLmlzUHJlc3NlZChcInJpZ2h0XCIpID8gMSA6IDApO1xuICAgICAgICB0aGlzLnlBeGlzID0gKHRoaXMuaXNQcmVzc2VkKFwidXBcIikgPyAxIDogMCkgKyAodGhpcy5pc1ByZXNzZWQoXCJkb3duXCIpID8gLTEgOiAwKTtcbiAgICAgICAgaWYgKHRoaXMuaXNUYXBwZWQoXCJqdW1wXCIpKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID0gSlVNUF9CVUZGRVJfVElNRTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pc1RhcHBlZChcImRhc2hcIikpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPSBEQVNIX0JVRkZFUl9USU1FO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcklucHV0cyxcbiAgICBvbkdhbWVwYWRDb25uZWN0ZWQsXG4gICAgb25HYW1lcGFkRGlzY29ubmVjdGVkLFxuICAgIHVwZGF0ZUlucHV0cyxcbiAgICBwcmVzc2VkS2V5cyxcbiAgICBpc1RhcHBlZEtleSxcbiAgICBpc1ByZXNzZWRLZXksXG4gICAgZ2V0UHJlc3NlZEtleXMsXG4gICAgZ2V0VGFwcGVkS2V5cyxcbiAgICBnZXRQcmVzc2VkQnV0dG9ucyxcbiAgICBnZXRUYXBwZWRCdXR0b25zLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgZ2xvYmFscyA9IHJlcXVpcmUoJy4vZ2xvYmFscycpO1xuY29uc3QgZ3JhcGhpY3MgPSByZXF1aXJlKCcuL2dyYXBoaWNzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgbWFwcyA9IHJlcXVpcmUoJy4vbWFwc18nKTtcbmNvbnN0IG1lbnUgPSByZXF1aXJlKCcuL21lbnUnKTtcbmNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5cbmxldCBjb250ZXh0O1xubGV0IGZyYW1lQ291bnRlciA9IDA7XG5sZXQgZnJhbWVSYXRlUmVmcmVzaCA9IDU7XG5sZXQgZnJhbWVSYXRlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuXG5mdW5jdGlvbiBzZXRTY2FsaW5nKHNjYWxlKSB7XG4gICAgZ2xvYmFscy5zY2FsaW5nID0gc2NhbGU7XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBzY2FsZX1weGA7XG4gICAgc2NyZWVuLnN0eWxlLmhlaWdodCA9IGAke2NvbnN0YW50cy5WSUVXX0hFSUdIVCAqIHNjYWxlfXB4YDtcblxuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2NyZWVuLWNhbnZhc1wiKTtcbiAgICBjYW52YXMud2lkdGggPSBzY2FsZSAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBzY2FsZSAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICBjb250ZXh0LnNldFRyYW5zZm9ybShzY2FsZSwgMCwgMCwgc2NhbGUsIDAsIDApO1xuICAgIGNvbnRleHQuc2NhbGUoZ2xvYmFscy5zY2FsaW5nLCBnbG9iYWxzLnNjYWxpbmcpO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGZyYW1lQ291bnRlciArPSAxO1xuICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2ZyYW1lQ291bnRlciAvIGZyYW1lUmF0ZVJlZnJlc2h9IEZQU2ApO1xuICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgIH1cblxuICAgIGlucHV0cy51cGRhdGVJbnB1dHMoKTtcbiAgICBmb3IgKGNvbnN0IHBsYXllciBvZiBnbG9iYWxzLnBsYXllcnMpIHtcbiAgICAgICAgcGxheWVyLnVwZGF0ZSgpO1xuICAgIH1cbiAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjb25zdGFudHMuVklFV19XSURUSCwgY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcblxuICAgIGlmIChtZW51Lm1lbnVTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1lbnUubWVudVN0YWNrWzBdLnVwZGF0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGdsb2JhbHMuY3VycmVudFNjZW5lLnVwZGF0ZSgxIC8gNjApO1xuICAgICAgICAvLyBUcmFuc2l0aW9uIGZyb20gb25lIHJvb20gdG8gYW5vdGhlclxuICAgICAgICBpZiAoZ2xvYmFscy5jdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgY29uc3QgcHJldlNjZW5lID0gZ2xvYmFscy5jdXJyZW50U2NlbmU7XG4gICAgICAgICAgICBnbG9iYWxzLmN1cnJlbnRTY2VuZSA9IGdsb2JhbHMuY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnN0YW50cy5WSUVXX1dJRFRILCBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgIGdsb2JhbHMuY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgaWYgKG1lbnUubWVudVN0YWNrWzBdKSB7XG4gICAgICAgIG1lbnUubWVudVN0YWNrWzBdLmRyYXcoY29udGV4dCk7XG4gICAgfVxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xufVxuXG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBnbG9iYWxzLnNjYWxpbmd9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBnbG9iYWxzLnNjYWxpbmd9cHhgO1xuXG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzY3JlZW4tY2FudmFzXCIpO1xuICAgIGNhbnZhcy53aWR0aCA9IGdsb2JhbHMuc2NhbGluZyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBnbG9iYWxzLnNjYWxpbmcgKiBjb25zdGFudHMuVklFV19IRUlHSFQ7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGNvbnRleHQuc2NhbGUoZ2xvYmFscy5zY2FsaW5nLCBnbG9iYWxzLnNjYWxpbmcpO1xuICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICAvLyBsb2FkIGFsbCBzY2VuZXMgYW5kIHN0YXJ0IGdhbWVcbiAgICBncmFwaGljcy5sb2FkR3JhcGhpY3MudGhlbigoKSA9PiB7XG4gICAgICAgIGdsb2JhbHMucGxheWVycy5wdXNoKG5ldyBwbGF5ZXIuUGxheWVyKCdibHVlJykpO1xuICAgICAgICBnbG9iYWxzLmN1cnJlbnRTY2VuZSA9IG1hcHMuc2NlbmVzLmNlbGVzdGUwMTtcbiAgICAgICAgZ2xvYmFscy5jdXJyZW50U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gMTtcbiAgICAgICAgdXBkYXRlKCk7XG4gICAgfSk7XG59O1xuXG5cbi8vIEdhbWVwYWQgQVBJXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMub25HYW1lcGFkQ29ubmVjdGVkKGV2ZW50LmdhbWVwYWQpO1xufSk7XG5cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkZGlzY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGRpc2Nvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLm9uR2FtZXBhZERpc2Nvbm5lY3RlZChldmVudC5nYW1lcGFkKTtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MSAqIFUsIC1VLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCBzY2VuZTIuaGVpZ2h0IC0gMyAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgyICogVSwgc2NlbmUyLmhlaWdodCwgd2lkdGggKiBVLCAwLCBzY2VuZTEsIHgxICogVSwgMiAqIFUsIGluZGV4MSkpO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB5MSwgaW5kZXgxLCBzY2VuZTIsIHkyLCBpbmRleDIsIGhlaWdodCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsIHNjZW5lMS53aWR0aCAtIFUsIHkxICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyaWdnZXJCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgc3BlZWQgPSAyMCwgZGVsYXkgPSAuMjUpIHtcbiAgICBjb25zdCBkaXN0YW5jZSA9IE1hdGguc3FydCgoeDIgLSB4MSkgKiAoeDIgLSB4MSkgKyAoeTIgLSB5MSkgKiAoeTIgLSB5MSkpO1xuICAgIGNvbnN0IGR1cmF0aW9uMSA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gICAgY29uc3QgZHVyYXRpb24yID0gZGlzdGFuY2UgLyA3O1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgZHVyYXRpb24xKSxcbiAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDIgKiBVLCB5MiAqIFUsIHgxICogVSwgeTEgKiBVLCBkdXJhdGlvbjIpLFxuICAgIF0pKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZhbGxpbmdCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgZGVsYXkgPSAuNSkge1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5GYWxsaW5nQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgKHkyIC0geTEpIC8gMjUpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxLCAtMSksXG4gICAgXSkpO1xufVxuXG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAxLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEyLCAxOCwgMTgsIDEzLCAxOCwgMTMsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAyNiwgMjcsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE1LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDI2LCAyNiwgMjYsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjYsIDI2LCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDUsIDUsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6OCxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwMSA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAyLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMiwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgNSwgNSwgNSwgMjYsIDI2LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNiwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNCwgMjEsIDEwLCA2LCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0NywgNDgsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDMgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMzIsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCA0NCwgMTUsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE0LCAxMCwgMjMsIDksIDMsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDExLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMiwgMywgMTcsIDE5LCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA1ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTEsIDQ4LCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAyMywgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMjAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDI2LCAyNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDE4LCAxOCwgMTMsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxOSwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIsIDMsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDIwLCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzgsIDQwLCAxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA2ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTMsIDMzLCAxMywgMjMsIDQsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDIsIDMsIDQ2LCA0OCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNiwgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOCwgMTMsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDE3LCAxOCwgMjcsIDM4LCAzOSwgNDAsIDQsIDUsIDUsIDM1LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCA0LCAyLCAyLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzUsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMSwgMiwgMiwgMiwgMywgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjUsIDI2LCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQ0LCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQsIDYsIDAsIDAsIDQ0LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA4ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTQsIDE2LCAyMSwgMTIsIDIsIDMpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE4LCAxOCwgMzQsIDM1LCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDIyLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyNiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgMjEsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCAxLCAyLCAyMSwgMTEsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDM5LCAzOSwgNDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA5ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTEwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTIsIDE4LCAzNCwgMzQsIDM0LCAyMSwgMiwgMywgMCwgMCwgMCwgMTUsIDAsIDAsIDEsIDUsIDUsIDUsIDE4LCAzNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMzQsIDM0LCAzNCwgMTgsIDI2LCAyNiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDIwLCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNSwgMjYsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDIsIDIsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTExID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE0LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDEsIDIsIDIsIDIsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAzNSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMjMsIDAsIDAsIDE3LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMiwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAzNCwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDM0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgMywgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCA2LCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgNSwgMzQsIDM0LCAzNCwgMTgsIDExLCAwLCAxNSwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNywgMjYsIDI2LCAyNiwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgNiwgNDYsIDQ4LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0OCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDhcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCA1LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCAyLCAyLCAyLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAzOCwgMzksIDM5LCA0MCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQ5LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0OVxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxMyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMjAsIDUsIDYsIDM4LCA0MCwgNCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCA2LCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAxLCAyNiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMSwgMjEsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMzQsIDIxLCAzNCwgNiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDM0LCAxOCwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA4LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMjMsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMzMsIDM1LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMiwgMiwgMywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE0ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTEsIDI5LCAxOSwgMjksIDQsIDIpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjYsIDI4LCAyNiwgMjIsIDUsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA0LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyLCAyLCA2LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDIsIDMsIDQ3LCA0OCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNDEsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTUgPSBzO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjQsIDYsIDI0LCAxNywgMiwgNik7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDUgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcblxuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNSwgMjAsIDksIDIwLCAyLCA0KSk7XG5cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDM0LCAzNCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMzQsIDUsIDUsIDUsIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgNDYsIDQ3LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCAyLCAyLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjk2LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo5NlxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxNiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIsIDIsIDI3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMiwgMiwgMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTcgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjQsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDEsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE4ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozOCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxLCAyLCAyLCAyLCAzLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxOSA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDIwLCAxNSwgMjAsIDcsIDIsIDQpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VGYWxsaW5nQmxvY2soMjgsIDksIDI4LCAzNSwgMywgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjcsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgNiwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDMyLCAwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgOSwgMjAsIDIsIDIsIDIsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDExLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAxOCwgMTgsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAxNywgMTAsIDEwLCAyMCwgNSwgMjYsIDI2LCAyNywgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDI3LCA1OCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0NiwgNDcsIDQ4LCAzMywgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDMsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgNCwgNiwgMCwgMCwgMCwgNDEsIDQxLCA0LCA2LCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCA0LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDExLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDksIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDExLCA0MSwgNDEsIDksIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgOSwgMTEsIDUzLCA1NCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIxLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCA5LCAyMCwgNSwgNiwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIxID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDE0LCA3LCAxNCwgMTUsIDIsIDcsIC43NSk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxNCAqIFUsIDYgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTUgKiBVLCA2ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIGZhbGxpbmdCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgZmFsbGluZ0Jsb2NrLmF0dGFjaChzcGlrZXMyKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgNDMsIDQzLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMzgsIDM5LCA0MCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDEsIDUsIDUsIDUsIDUsIDUsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAyMCwgMiwgMywgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIyID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMzMsIDE1LCAzMywgOSwgMywgMykpO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjUsIDYsIDEzLCA2LCAyLCAzKTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI2ICogVSwgNSAqIFUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczEpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDE3LCAxOCwgMTgsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQzLCA0MywgNDMsIDAsIDQzLCA0MywgNDMsIDE1LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQ2XG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIzID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjIsIDE4LCAyMiwgOSwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOSwgMTksIDI5LCAxMCwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygzNiwgMTcsIDM2LCA4LCAyLCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgNDMsIDQzLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDE0LCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxOCwgMTgsIDEzLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDQyLCAwLCAwLCA0NCwgMjMsIDAsIDAsIDksIDEwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjQgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNywgMTgsIDE3LCAxMiwgNCwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOCwgMTksIDI4LCAxMiwgNiwgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMzgsIDM5LCA0MCwgMSwgMiwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI1ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sxID0gbWFrZUZhbGxpbmdCbG9jaygxOSwgMTYsIDE5LCAyNSwgNCwgMyk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2sxKTtcbiAgICBjb25zdCBzcGlrZXMxID0gW1xuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCgyMyAqIFUsIDE3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KDIzICogVSwgMTggKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigxOSAqIFUsIDE5ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oMjAgKiBVLCAxOSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIxICogVSwgMTkgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigyMiAqIFUsIDE5ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMS5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG5cbiAgICBjb25zdCBmYWxsaW5nQmxvY2syID0gbWFrZUZhbGxpbmdCbG9jaygyMywgNiwgMjMsIDI1LCAyLCA0KTtcbiAgICBzLmFkZFNvbGlkKGZhbGxpbmdCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA4ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTgsIDE5LCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCAzOSwgNDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgOSwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyNiA9IHM7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg5LCA5LCAyNiwgOSwgMywgNSwgMzUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDkgKiBVLCA4ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDEwICogVSwgOCAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMSAqIFUsIDggKiBVKSxcbiAgICBdXG4gICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMzIsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMSwgMCwgMzMsIDM0LCAzNSwgNTgsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDQ2LCA0OCwgMjUsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMTQsIDAsIDQ0LCA5LCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAxNSwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMjAsIDUsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDM1LCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgNDgsIDAsIDQ0LCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMiwgMiwgMiwgMiwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI3ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDIsIDksIDEwLCA5LCAzLCA0LCAzNSk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDMgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMyA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDQgKiBVLCA4ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczMpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczMpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgNSwgNSwgMiwgMiwgMiwgNSwgNiwgMzgsIDM5LCAzOSwgNDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAzLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyOCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE2LCAyNSwgMTYsIDE5LCA2LCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAzOCwgMzksIDM5LCA0MCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzUsIDQ2LCA0NywgNDcsIDQ4LCAzMywgMzUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjkgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzAgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMSwgMywgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzEgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jayg0LCAyMCwgMTIsIDIwLCA0LCAyLCAzMCkpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDQxLCA0MSwgNCwgNiwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0LCA1LCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCA0MCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyNiwgMjYsIDI2LCAyNiwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDQsIDUsIDUsIDYsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAzLCA0NiwgNDcsIDQ4LCAxLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NTFcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzMgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxLCAyMiwgOCwgMjIsIDMsIDMsIDMwKSk7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg0OCwgMTUsIDQ4LCA3LCAyLCA0KTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoNDggKiBVLCAxNCAqIFUpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0OSAqIFUsIDE0ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMiwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOCwgNDEsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCAxLCAyMSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjUyXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM0ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA4LCAyMywgMjMsIDMsIDQpO1xuICAgIHMuYWRkU29saWQoZmFsbGluZ0Jsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIzICogVSwgNyAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDcgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA3ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICBmYWxsaW5nQmxvY2suYXR0YWNoKHNwaWtlKTtcbiAgICAgICAgcy5hZGRUaGluZyhzcGlrZSk7XG4gICAgfVxuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxMSwgMTYsIDExLCAyNSwgMiwgMykpO1xuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxNCwgMywgMTQsIDIyLCAzLCA1KSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzUgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDcsIDQ2LCA0NywgNDcsIDQ4LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDQsIDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIsIDIsIDIsIDIsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjo0MyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM2ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sxID0gbWFrZVRyaWdnZXJCbG9jaygyLCAyNiwgOSwgMjYsIDIsIDMsIDMwKTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazEpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCAyNSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzICogVSwgMjUgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMSkge1xuICAgICAgICB0cmlnZ2VyQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cblxuICAgIGNvbnN0IHRyaWdnZXJCbG9jazIgPSBtYWtlVHJpZ2dlckJsb2NrKDM1LCAyMywgMzUsIDE1LCAzLCA0KTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDM1ICogVSwgMjIgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMzYgKiBVLCAyMiAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzNyAqIFUsIDIyICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDUsIDEwLCAyMCwgNSwgNSwgMiwgMywgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzNyA9IHM7XG59XG5cbi8vIHtcbi8vICAgICB7e2xvdWlzMDF9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwMn19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczAzfX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDR9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwNX19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczA2fX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDd9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwOH19XG4vLyB9XG5cblxuLy8gVHJhbnNpdGlvbnNcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwMSwgMzEsIDAsIHNjZW5lcy5jZWxlc3RlMDIsIDEsIDEsIDUpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTAyLCAzNCwgMCwgc2NlbmVzLmNlbGVzdGUwMywgMiwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMDMsIDMzLCAwLCBzY2VuZXMuY2VsZXN0ZTA0LCAzLCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNCwgMjEsIDAsIHNjZW5lcy5jZWxlc3RlMDUsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTA1LCAyMiwgMCwgc2NlbmVzLmNlbGVzdGUwNiwgMywgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDcsIDI5LCAwLCBzY2VuZXMuY2VsZXN0ZTA2LCAzMCwgMSwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDYsIDMwLCAyLCBzY2VuZXMuY2VsZXN0ZTA4LCA1LCAwLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNiwgMzUsIDAsIHNjZW5lcy5jZWxlc3RlMDksIDEsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTEwLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTA5LCA3LCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMSwgOCwgMSwgc2NlbmVzLmNlbGVzdGUxMCwgOCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMTAsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMTIsIDQyLCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUxMSwgMywgMCwgc2NlbmVzLmNlbGVzdGUxMiwgMywgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDksIDAsIDAsIHNjZW5lcy5jZWxlc3RlMTMsIDAsIDAsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMywgLjUsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDIyLjUsIDIsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxNSwgMjIsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDQsIDAsIDUpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE2LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxNSwgMiwgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTQsIDEsIDEsIHNjZW5lcy5jZWxlc3RlMTcsIDEwLCAyLCA5KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxOCwgMTcsIDAsIHNjZW5lcy5jZWxlc3RlMTcsIDIsIDAsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE4LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxOSwgMTMsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE5LCAyLCAwLCBzY2VuZXMuY2VsZXN0ZTIwLCAyLCAwLCAyKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyMCwgMTIsIDEsIHNjZW5lcy5jZWxlc3RlMjEsIDgsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIxLCAyNiwgMSwgc2NlbmVzLmNlbGVzdGUyMiwgMjYsIDAsIDEpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIzLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyNywgMywgNyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjEsIDIsIDAsIHNjZW5lcy5jZWxlc3RlMjQsIDgsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE3LCAzMywgMSwgc2NlbmVzLmNlbGVzdGUyNSwgNywgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjUsIDIyLCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyLCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyNCwgMzIsIDAsIHNjZW5lcy5jZWxlc3RlMjYsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTI2LCAzLCAwLCBzY2VuZXMuY2VsZXN0ZTI3LCAxNiwgMywgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjcsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDI4LCAyLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyOSwgMTMsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDE4LCAxLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzMCwgNiwgMCwgc2NlbmVzLmNlbGVzdGUyOSwgNiwgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjcsIDYsIDIsIHNjZW5lcy5jZWxlc3RlMzEsIDYsIDAsIDIpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI3LCAzMSwgMCwgc2NlbmVzLmNlbGVzdGUzMiwgMTcsIDEsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI4LCA1LCAwLCBzY2VuZXMuY2VsZXN0ZTMzLCA1LCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyOCwgMjgsIDIsIHNjZW5lcy5jZWxlc3RlMzMsIDI4LCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzMiwgNCwgMCwgc2NlbmVzLmNlbGVzdGUzMywgNDQsIDMsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTMzLCAxMCwgMCwgc2NlbmVzLmNlbGVzdGUzNCwgMywgMiwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMzUsIDEzLCAwLCBzY2VuZXMuY2VsZXN0ZTM0LCAzLCAwLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzNCwgMTUsIDEsIHNjZW5lcy5jZWxlc3RlMzYsIDI5LCAxLCA5KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzNiwgOCwgMCwgc2NlbmVzLmNlbGVzdGUzNywgNiwgMCwgMyk7XG5cbi8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmxvdWlzMDEsIDM1LCAwLCBzY2VuZXMubG91aXMwMiwgNCwgMSwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczAzLCAzLCAwLCBzY2VuZXMubG91aXMwMiwgMTMsIDAsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwMywgMzAsIDEsIHNjZW5lcy5sb3VpczAyLCAyMywgMiwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczA0LCA0LCAwLCBzY2VuZXMubG91aXMwMiwgMzUsIDMsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwNSwgMzMsIDAsIHNjZW5lcy5sb3VpczA2LCAxLCAxLCA1KTtcbi8vIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmxvdWlzMDYsIDgsIDAsIHNjZW5lcy5sb3VpczA3LCA4LCAxLCA2KTtcbi8vIHNjZW5lcy5sb3VpczA2LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMTEuNSAqIFUsIDE1ICogVSwgMCwgMyAqIFUsIHNjZW5lcy5sb3VpczA4LCBVLCAxMyAqIFUsIDApKTtcbi8vIHNjZW5lcy5sb3VpczA4LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgMTMgKiBVLCAwLCAzICogVSwgc2NlbmVzLmxvdWlzMDYsIDEwICogVSwgMTUgKiBVLCAxKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbn1cbiIsImNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IE1FTlVfRk9OVF9TSVpFID0gMTI7XG5jb25zdCBNRU5VX1BBRERJTkcgPSA1O1xuY29uc3QgbWVudVN0YWNrID0gW107XG5cblxuY2xhc3MgTWVudUxpbmUge1xuICAgIGNvbnN0cnVjdG9yKHRleHQpIHtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCwgeSwgdGV4dENvbG9yID0gXCIjMDAwMDAwXCIsIGJnQ29sb3IgPSBcIiNmZmZmZmZjY1wiKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb25zdCB0ZXh0TWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dCh0aGlzLnRleHQpO1xuICAgICAgICBjdHguZmlsbFJlY3QoXG4gICAgICAgICAgICBjb25zdGFudHMuVklFV19XSURUSCAvIDIgLSB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveExlZnQgLSBNRU5VX1BBRERJTkcsXG4gICAgICAgICAgICB5IC0gdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgLSBNRU5VX1BBRERJTkcsXG4gICAgICAgICAgICB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveFJpZ2h0ICsgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hMZWZ0ICsgMiAqIE1FTlVfUEFERElORyxcbiAgICAgICAgICAgIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94QXNjZW50ICsgMiAqIE1FTlVfUEFERElORyk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0ZXh0Q29sb3I7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLnRleHQsIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiwgeSk7XG4gICAgfVxufVxuXG5cbmNsYXNzIE1lbnVPcHRpb24gZXh0ZW5kcyBNZW51TGluZSB7XG4gICAgY29uc3RydWN0b3IodGV4dCkge1xuICAgICAgICBzdXBlcih0ZXh0KTtcbiAgICAgICAgdGhpcy5pc1NlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25BY3RpdmF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5vblJpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uTGVmdCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCwgeSkge1xuICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGVkKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCwgeSwgJyNmZmZmZmYnLCAnIzAwMDAwMGNjJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCwgeSwgJyMwMDAwMDAnLCAnI2ZmZmZmZmNjJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRPbkFjdGl2YXRlKGYpIHtcbiAgICAgICAgdGhpcy5vbkFjdGl2YXRlID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0T25SaWdodChmKSB7XG4gICAgICAgIHRoaXMub25SaWdodCA9IGY7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldE9uTGVmdChmKSB7XG4gICAgICAgIHRoaXMub25MZWZ0ID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKHRpdGxlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICAgICAgdGhpcy50aXRsZSA9IG5ldyBNZW51TGluZSh0aXRsZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saW5lcyA9IFtdO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5mb250ID0gYG5vcm1hbCAke01FTlVfRk9OVF9TSVpFfXB4IGdhbWVib3lgO1xuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcbiAgICAgICAgY29uc3QgbGluZUhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dCgnTScpLmFjdHVhbEJvdW5kaW5nQm94QXNjZW50ICsgMi41ICogTUVOVV9QQURESU5HO1xuXG4gICAgICAgIGxldCB5T2Zmc2V0O1xuICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgeU9mZnNldCA9IGNvbnN0YW50cy5WSUVXX0hFSUdIVCAvIDIgLSB0aGlzLmxpbmVzLmxlbmd0aCAqIGxpbmVIZWlnaHQgLyAyO1xuICAgICAgICAgICAgdGhpcy50aXRsZS5kcmF3KGN0eCwgeU9mZnNldCk7XG4gICAgICAgICAgICB5T2Zmc2V0ICs9IDEuNSAqIGxpbmVIZWlnaHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5T2Zmc2V0ID0gY29uc3RhbnRzLlZJRVdfSEVJR0hUIC8gMiAtICh0aGlzLmxpbmVzLmxlbmd0aCAtIDEpICogbGluZUhlaWdodCAvIDI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgdGhpcy5saW5lcykge1xuICAgICAgICAgICAgbGluZS5kcmF3KGN0eCwgeU9mZnNldCk7XG4gICAgICAgICAgICB5T2Zmc2V0ICs9IGxpbmVIZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG59XG5cblxuY2xhc3MgTGluZVNlbGVjdE1lbnUgZXh0ZW5kcyBNZW51IHtcbiAgICBjb25zdHJ1Y3Rvcih0aXRsZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih0aXRsZSk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWQgPSAwO1xuICAgICAgICB0aGlzLmNhblF1aXQgPSB0cnVlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5saW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5saW5lc1tpXS5pc1NlbGVjdGVkID0gKGkgPT09IHRoaXMuc2VsZWN0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgbWVudSBjb250cm9sc1xuICAgICAgICBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiRXNjYXBlXCIpICYmIHRoaXMuY2FuUXVpdCkge1xuICAgICAgICAgICAgbWVudVN0YWNrLnNoaWZ0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiQXJyb3dEb3duXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA8IHRoaXMubGluZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJBcnJvd1VwXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkIC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiQXJyb3dSaWdodFwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uUmlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25SaWdodCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0cy5pc1RhcHBlZEtleShcIkFycm93TGVmdFwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uTGVmdCkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vbkxlZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJFbnRlclwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSgpO1xuICAgICAgICAgICAgLy8gcGxheWVyLXNwZWNpZmljIG1lbnUgY29udHJvbHNcbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwicGF1c2VcIikpICYmIHRoaXMuY2FuUXVpdCkge1xuICAgICAgICAgICAgd2hpbGUgKG1lbnVTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBtZW51U3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwiZGFzaFwiKSkgJiYgdGhpcy5jYW5RdWl0KSB7XG4gICAgICAgICAgICBtZW51U3RhY2suc2hpZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwiZG93blwiKSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkIDwgdGhpcy5saW5lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJ1cFwiKSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwicmlnaHRcIikpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25SaWdodCkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vblJpZ2h0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcImxlZnRcIikpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25MZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uTGVmdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJqdW1wXCIpKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIENvbnRyb2xzTWVudSBleHRlbmRzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmFjdGlvbnMgPSBbXCJ1cFwiLCBcImRvd25cIiwgXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJqdW1wXCIsIFwiZGFzaFwiLCBcInBhdXNlXCJdO1xuICAgICAgICB0aGlzLmxpbmVzID0gW1xuICAgICAgICAgICAgbmV3IE1lbnVMaW5lKCdQcmVzcyBLZXkvQnV0dG9uIGZvcicpLFxuICAgICAgICAgICAgbmV3IE1lbnVMaW5lKCksXG4gICAgICAgIF07XG4gICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgoMCk7XG4gICAgfVxuXG4gICAgc2V0QWN0aW9uSW5kZXgoaW5kZXgpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25JbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLmxpbmVzWzFdLnRleHQgPSB0aGlzLmFjdGlvbnNbdGhpcy5hY3Rpb25JbmRleF0udG9VcHBlckNhc2UoKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIGNvbnN0IHRhcHBlZEtleXMgPSBpbnB1dHMuZ2V0VGFwcGVkS2V5cygpO1xuICAgICAgICBpZiAodGFwcGVkS2V5cy5zaXplID4gMCkge1xuICAgICAgICAgICAgZ2xvYmFscy5wbGF5ZXJzWzBdLmlucHV0cy5rZXltYXBbdGhpcy5hY3Rpb25zW3RoaXMuYWN0aW9uSW5kZXhdXSA9IHRhcHBlZEtleXMudmFsdWVzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uSW5kZXggPj0gdGhpcy5hY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjdGlvbkluZGV4KDApO1xuICAgICAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjdGlvbkluZGV4KHRoaXMuYWN0aW9uSW5kZXggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0YXBwZWRCdXR0b25zID0gaW5wdXRzLmdldFRhcHBlZEJ1dHRvbnMoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXBwZWRCdXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGFwcGVkQnV0dG9uc1tpXS5zaXplID4gMCkge1xuICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5pbnB1dHMuZ2FtZXBhZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uaW5wdXRzLmdhbWVwYWRtYXBbdGhpcy5hY3Rpb25zW3RoaXMuYWN0aW9uSW5kZXhdXSA9IHRhcHBlZEJ1dHRvbnNbaV0udmFsdWVzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkluZGV4ID49IHRoaXMuYWN0aW9ucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgoMCk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgodGhpcy5hY3Rpb25JbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vLyBDb250cm9scyBtYXBwaW5nIG1lbnVcbmNvbnN0IGNvbnRyb2xzTWVudSA9IG5ldyBDb250cm9sc01lbnUoKTtcblxuLy8gR2VuZXJhbCBvcHRpb25zIG1lbnVcbmNvbnN0IG9wdGlvbnNNZW51ID0gbmV3IExpbmVTZWxlY3RNZW51KFwiT3B0aW9uc1wiKTtcbm9wdGlvbnNNZW51LmxpbmVzLnB1c2goXG4gICAgbmV3IE1lbnVPcHRpb24oXCJTRlggVm9sdW1lOiBsbGxsbCBcIilcbiAgICAgICAgLnNldE9uUmlnaHQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc291bmQuaW5jcmVtZW50U291bmRWb2x1bWUoKTtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiU0ZYIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5zZXRPbkxlZnQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc291bmQuZGVjcmVtZW50U291bmRWb2x1bWUoKTtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiU0ZYIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pKTtcbm9wdGlvbnNNZW51LmxpbmVzLnB1c2goXG4gICAgbmV3IE1lbnVPcHRpb24oXCJNdXNpYyBWb2x1bWU6IGxsbGxsIFwiKVxuICAgICAgICAuc2V0T25SaWdodChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzb3VuZC5pbmNyZW1lbnRNdXNpY1ZvbHVtZSgpO1xuICAgICAgICAgICAgdGhpcy50ZXh0ID0gXCJNdXNpYyBWb2x1bWU6IFwiXG4gICAgICAgICAgICAgICAgKyBcImxcIi5yZXBlYXQoc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiLlwiLnJlcGVhdCg1IC0gc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiIFwiO1xuICAgICAgICB9KVxuICAgICAgICAuc2V0T25MZWZ0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNvdW5kLmRlY3JlbWVudE11c2ljVm9sdW1lKCk7XG4gICAgICAgICAgICB0aGlzLnRleHQgPSBcIk11c2ljIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRNdXNpY1ZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRNdXNpY1ZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pKTtcblxuLy8gTWFpbiBwYXVzZSBtZW51XG5jb25zdCBtYWluTWVudSA9IG5ldyBMaW5lU2VsZWN0TWVudShcIlBhdXNlZFwiKTtcbm1haW5NZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJSZXN1bWVcIikuc2V0T25BY3RpdmF0ZShmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coXCJyZXN1bWVcIik7XG4gICAgbWVudVN0YWNrLnNoaWZ0KClcbn0pKTtcbm1haW5NZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJPcHRpb25zXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIG1lbnVTdGFjay51bnNoaWZ0KG9wdGlvbnNNZW51KTtcbn0pKTtcbm1haW5NZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJDb250cm9sc1wiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBtZW51U3RhY2sudW5zaGlmdChjb250cm9sc01lbnUpO1xufSkpO1xuXG4vLyBJbml0aWFsIG1lbnVcbmNvbnN0IHN0YXJ0TWVudSA9IG5ldyBMaW5lU2VsZWN0TWVudShcIlNxdWFyZWp1bXBcIik7XG5zdGFydE1lbnUuY2FuUXVpdCA9IGZhbHNlO1xuc3RhcnRNZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJTdGFydFwiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBnbG9iYWxzLmN1cnJlbnRTY2VuZS5hZGRBY3RvcihnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyKTtcbiAgICBnbG9iYWxzLmN1cnJlbnRTY2VuZS5yZXNldCgpO1xuICAgIHNvdW5kLmJnTXVzaWMucGxheSgpO1xuICAgIG1lbnVTdGFjay5zaGlmdCgpO1xufSkpO1xuc3RhcnRNZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJPcHRpb25zXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIG1lbnVTdGFjay51bnNoaWZ0KG9wdGlvbnNNZW51KTtcbn0pKTtcbnN0YXJ0TWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiQ29udHJvbHNcIikuc2V0T25BY3RpdmF0ZShmdW5jdGlvbiAoKSB7XG4gICAgbWVudVN0YWNrLnVuc2hpZnQoY29udHJvbHNNZW51KTtcbn0pKTtcblxuXG5tZW51U3RhY2sudW5zaGlmdChzdGFydE1lbnUpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbWVudVN0YWNrLFxuICAgIG1haW5NZW51LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuY29uc3QgQU5JTUFUSU9OX1NMT1dET1dOID0gNjtcbmNvbnN0IFBMQVlFUl9BTklNQVRJT05fSURMRSA9IFs0LCA0XTtcbmNvbnN0IFBMQVlFUl9BTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgUExBWUVSX0FOSU1BVElPTl9KVU1QID0gWzYsIDNdO1xuY29uc3QgUExBWUVSX0FOSU1BVElPTl9GQUxMID0gWzUsIDNdO1xuY29uc3QgUExBWUVSX0FOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlIGlmIHRoZSBpbnRlcnNlY3Rpb24gb2YgYm90aCBzZWdtZW50cyBpcyBvZiBub24temVybyBtZWFzdXJlIChpZiB0aGUgZW5kIG9mIG9uZSBzZWdtZW50XG4gKiBjb2luY2lkZXMgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIG5leHQsIHRoZXkgYXJlIG5vdCBjb25zaWRlcmVkIGFzIG92ZXJsYXBwaW5nKVxuICpcbiAqIEBwYXJhbSBzdGFydDEge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMSB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHN0YXJ0MiB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgc2Vjb25kIHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMiB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIHR3byBzZWdtZW50cyBvdmVybGFwXG4gKi9cbmZ1bmN0aW9uIHNlZ21lbnRzT3ZlcmxhcChzdGFydDEsIHNpemUxLCBzdGFydDIsIHNpemUyKSB7XG4gICAgcmV0dXJuIHN0YXJ0MSA8IHN0YXJ0MiArIHNpemUyICYmIHN0YXJ0MiA8IHN0YXJ0MSArIHNpemUxO1xufVxuXG5cbi8qKlxuICogU2NlbmVFbGVtZW50cyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBhcHBlYXIgaW4gYSBzY2VuZSAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBkZWNvcmF0aW9ucywgZXRjLilcbiAqXG4gKiBBbGwgRWxlbWVudHMgYXJlIHJlcHJlc2VudGVkIGFzIGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3hlcyBhbmQgdGhlIHNwYWNlIHRoZXkgb2NjdXB5IGluIGEgc2NlbmUgaXMgdGhlcmVmb3JlIGRlZmluZWRcbiAqIGFzIGEgcG9zaXRpb24gKHgsIHkpIGFuZCBhIHNpemUgKHdpZHRoLCBoZWlnaHQpLiBBdCBhbGwgdGltZXMsIHBvc2l0aW9ucyBhbmQgc2l6ZXMgc2hvdWxkIGJlIGludGVnZXJzLiBTdWItaW50ZWdlclxuICogcG9zaXRpb25zIGFyZSBjb25zaWRlcmVkIHdpdGggdGhlIHVzZSBvZiB0aGUgYHhSZW1haW5kZXJgIGFuZCBgeVJlbWFpbmRlcmAgYXR0cmlidXRlcyAodGhhdCBzaG91bGQgaGF2ZSBhbiBhYnNvbHV0ZVxuICogdmFsdWUgPCAxKVxuICovXG5jbGFzcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBvZiB0aGUgbGVmdG1vc3Qgc2lkZSBvZiB0aGUgYm91bmRpbmcgYm94IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB4LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBpbml0aWFsIHktY29vcmRpbmF0ZSAodXNlZCBmb3IgcmVzZXQoKSlcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3RhcnRZID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBieSB3aGljaCB0aGUgZWxlbWVudCBpcyBzaGlmdGVkIGFsb25nIHRoZSB4LWF4aXMgd2hlbiBkcmF3biAoZG9lc24ndCBhZmZlY3QgYWN0dWFsIHBoeXNpY3MpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNoaWZ0WCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgYnkgd2hpY2ggdGhlIGVsZW1lbnQgaXMgc2hpZnRlZCBhbG9uZyB0aGUgeS1heGlzIHdoZW4gZHJhd24gKGRvZXNuJ3QgYWZmZWN0IGFjdHVhbCBwaHlzaWNzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogd2lkdGggb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogaGVpZ2h0IG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB4LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHktcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeC1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeS1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNjZW5lRWxlbWVudCBzaG91bGQgYmUgY29uc2lkZXJlZCBieSB0aGUgRW5naW5lIG9yIG5vdCAoaW5hY3RpdmUgU2NlbmVFbGVtZW50cyBhcmUgaWdub3JlZCB3aGVuXG4gICAgICAgICAqIGludGVyYWN0aW9ucyBhcmUgY29tcHV0ZWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB1c2VkIHRvIHJlcHJlc2VudCB0aGUgU2NlbmVFbGVtZW50IChpZiByZXByZXNlbnRlZCBieSBhIHNpbmdsZSB0aWxlKVxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aWxlcyA9IHRpbGVzO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBlZmZlY3RzIGFwcGxpZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBAdHlwZSB7W0VmZmVjdF19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVmZmVjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNjZW5lIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgaW5jbHVkZWRcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaWN0aW9uYXJ5IG9mIHRpbWVycyAobnVtYmVycykgdGhhdCBhcmUgYXV0b21hdGljYWxseSBkZWNyZW1lbnRlZCBhdCBlYWNoIHVwZGF0ZVxuICAgICAgICAgKiBAdHlwZSB7e251bWJlcn19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IG9mIFNjZW5lRWxlbWVudHMgdGhhdCBhcmUgYXR0YWNoZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBXaGVuZXZlciBgdGhpc2AgaXMgbW92ZWQsIGFsbCBhdHRhY2hlZCBFbGVtZW50cyB3aWxsIGFsc28gYmUgbW92ZWQgYnkgdGhlIHNhbWUgYW1vdW50XG4gICAgICAgICAqXG4gICAgICAgICAqIFdhcm5pbmc6IEJlY2F1c2Ugb2YgdGhlIHNwZWNpYWwgY29uc3RyYWludHMgb24gQWN0b3IgcG9zaXRpb25zLCBBY3RvcnMgc2hvdWxkIG5vdCBiZSBhdHRhY2hlZCB0byBhXG4gICAgICAgICAqIFNjZW5lRWxlbWVudC4gVGhlIHBhcnRpY3VsYXIgY2FzZSBvZiBBY3RvcnMgXCJyaWRpbmdcIiBhIFNvbGlkIGlzIGhhbmRsZWQgc2VwYXJhdGVseSBpbiB0aGUgU29saWQubW92ZSgpXG4gICAgICAgICAqIG1ldGhvZC5cbiAgICAgICAgICogQHR5cGUge1NldDxTY2VuZUVsZW1lbnQ+fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lRWxlbWVudCB0byB3aGljaCB0aGlzIGlzIGF0dGFjaGVkLCBpZiBhbnlcbiAgICAgICAgICogQHR5cGUge1NjZW5lRWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgdGhpc2Agb3ZlcmxhcHMgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgb3RoZXJgLlxuICAgICAqXG4gICAgICogVHdvIFNjZW5lRWxlbWVudHMgb3ZlcmxhcCBpZiBmb3IgYm90aCBkaW1lbnNpb25zIHRoZSBlbmQgcG9zaXRpb24gb2YgZWFjaCBTY2VuZUVsZW1lbnQgaXMgc3RyaWN0bHkgZ3JlYXRlciB0aGFuXG4gICAgICogdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBvdGhlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciB7U2NlbmVFbGVtZW50fVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG4gICAgICovXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBTY2VuZUVsZW1lbnQgaW4gdGhlIENhbnZhcyBhc3NvY2lhdGVkIHRvIHRoZSBDb250ZXh0IGdpdmVuIGFzIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIGN0eCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0IG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBkcmF3blxuICAgICAqL1xuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzaGlmdFggPSB0aGlzLnNoaWZ0WDtcbiAgICAgICAgICAgIGxldCBzaGlmdFkgPSB0aGlzLnNoaWZ0WTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkVG8pIHtcbiAgICAgICAgICAgICAgICBzaGlmdFggKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WDtcbiAgICAgICAgICAgICAgICBzaGlmdFkgKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdGlsZURhdGEgb2YgdGhpcy50aWxlcykge1xuICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgICAgIGdyYXBoaWNzLnNoZWV0cy50aWxlcyxcbiAgICAgICAgICAgICAgICAgICAgMTYgKiB0aWxlRGF0YS54LCAxNiAqIHRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy54ICsgdGlsZURhdGEuc2hpZnRYICsgc2hpZnRYLCB0aGlzLnkgKyB0aWxlRGF0YS5zaGlmdFkgKyBzaGlmdFksXG4gICAgICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgcHJvcGVydGllcyBhdCB0aGUgc3RhcnQgb2YgYSBuZXcgdXBkYXRlIG9mIHRoZSBTY2VuZVxuICAgICAqL1xuICAgIGJlZm9yZVVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBzdGF0ZSBvZiB0aGUgU2NlbmVFbGVtZW50IChjYWxsZWQgYXQgZWFjaCBmcmFtZSB3aGVuIHRoZSBTY2VuZSBpcyBhY3RpdmUpXG4gICAgICogQHBhcmFtIGRlbHRhVGltZSB7bnVtYmVyfSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCB1cGRhdGUgKGluIHNlY29uZHMpXG4gICAgICovXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICAvLyB1cGRhdGUgdGltZXJzXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIC8vIHVwZGF0ZSBlZmZlY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnVwZGF0ZShkZWx0YVRpbWUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIFNjZW5lRWxlbWVudCBieSBhIGdpdmVuIGFtb3VudFxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgcmlnaHRcbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIGRvd25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICAvLyBtb3ZlIGFsbCBlbGVtZW50cyBhdHRhY2hlZCB0byB0aGlzXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSwgbXgsIG15KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIFNjZW5lIEVsZW1lbnQgdG8gYSBnaXZlbiBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB4IHtudW1iZXJ9IHgtY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHkge251bWJlcn0geS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmVUbyh4LCB5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICB0aGlzLm1vdmUoeCAtIHRoaXMueCAtIHRoaXMueFJlbWFpbmRlciwgeSAtIHRoaXMueSAtIHRoaXMueVJlbWFpbmRlciwgbXgsIG15KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBlbGVtZW50IGJhY2sgdG8gaXRzIG9yaWdpbmFsIHN0YXRlICh1c2VkIHdoZW4gU2NlbmUgaXMgcmVzZXQpXG4gICAgICovXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMuc3RhcnRYO1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnN0YXJ0WTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIGZvciAoY29uc3QgdGltZXIgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RpbWVyXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lZmZlY3RzLmxlbmd0aCA9IDA7ICAgIC8vIGNsZWFyIGFsbCBlZmZlY3RzXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiBlZmZlY3QgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAqIEBwYXJhbSBlZmZlY3Qge0VmZmVjdH0gdGhlIEVmZmVjdCB0aGF0IGlzIGFkZGVkXG4gICAgICogQHJldHVybnMge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudFxuICAgICAqL1xuICAgIGFkZEVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgdGhpcy5lZmZlY3RzLnB1c2goZWZmZWN0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhbiBlZmZlY3Qgb24gdGhlIFNjZW5lRWxlbWVudFxuICAgICAqIEBwYXJhbSBlZmZlY3Qge0VmZmVjdH0gdGhlIEVmZmVjdCB0byByZW1vdmVcbiAgICAgKiBAcmV0dXJucyB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50XG4gICAgICovXG4gICAgcmVtb3ZlRWZmZWN0KGVmZmVjdCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZWZmZWN0cy5pbmRleE9mKGVmZmVjdCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGF0dGFjaFxuICAgICAqL1xuICAgIGF0dGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5hZGQoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0YWNoZXMgYSBnaXZlbiBTY2VuZUVsZW1lbnQgdG8gdGhpc1xuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnQgdG8gZGV0YWNoXG4gICAgICovXG4gICAgZGV0YWNoKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5hdHRhY2hlZFRvID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEFjdG9ycyBhcmUgU2NlbmVFbGVtZW50cyBpbiBhIFNjZW5lIHRoYXQgY2Fubm90IHBhc3MgdGhyb3VnaCBTb2xpZHMgKHBsYXllciBjaGFyYWN0ZXJzIGFuZCBlbmVtaWVzIGZvciBpbnN0YW5jZSlcbiAqL1xuY2xhc3MgQWN0b3IgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb21lbnR1bSBoZWxkIGFsb25nIHRoZSB4LWF4aXMgKGdpdmVuIGJ5IGNhcnJ5aW5nIFNvbGlkcylcbiAgICAgICAgICogVGhpcyBhdHRyaWJ1dGUgc2hvdWxkIGJlIHNldCB1c2luZyBBY3Rvci5zZXRNb21lbnR1bVgoKSB0byBpbml0YWxpemUgdGhlIGFzc29jaWF0ZWQgdGltZXJcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1vbWVudHVtIGhlbGQgYWxvbmcgdGhlIHktYXhpcyAoZ2l2ZW4gYnkgY2FycnlpbmcgU29saWRzKVxuICAgICAgICAgKiBUaGlzIGF0dHJpYnV0ZSBzaG91bGQgYmUgc2V0IHVzaW5nIEFjdG9yLnNldE1vbWVudHVtWSgpIHRvIGluaXRhbGl6ZSB0aGUgYXNzb2NpYXRlZCB0aW1lclxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIHN0b3JpbmcgbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW1YID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciBzdG9yaW5nIG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtWSA9IDA7XG4gICAgfVxuXG4gICAgbW92ZShkeCwgZHksIG14ID0gMCwgbXkgPSAwKSB7XG4gICAgICAgIHRoaXMubW92ZVgoZHgpO1xuICAgICAgICB0aGlzLm1vdmVZKGR5KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlIHRoZSBBY3RvciBhIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCB0cmllcyB0byBtb3ZlIHRoZSBBY3RvciBieSB0aGUgZ2l2ZW4gYW1vdW50IG9uIHRoZSB4LWF4aXMgYnV0IHN0b3BzIGlmIHRoZXJlIGlzIGEgY29sbGlzaW9uIHdpdGggYVxuICAgICAqIFNvbGlkICh0aGUgcG9zaXRpb24gaXMgc2V0IGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgb3ZlcmxhcCB3aXRoIHRoZSBTb2xpZCkuIElmIHRoZXJlIHdhcyBhIGNvbGxpc2lvbiwgdGhlIGZ1bmN0aW9uXG4gICAgICogZ2l2ZW4gYXMgcGFyYW1ldGVyIGlzIGNhbGxlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhbW91bnQge251bWJlcn0gYW1vdW50IHRvIG1vdmUgb24gdGhlIHgtYXhpc1xuICAgICAqIEBwYXJhbSBvbkNvbGxpZGUge2Z1bmN0aW9uKCl9IGZ1bmN0aW9uIHRvIHJ1biBpZiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkXG4gICAgICovXG4gICAgbW92ZVgoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WCA9IHRoaXMueCArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCBtb3ZlLCAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnggLSB0aGlzLndpZHRoIDwgbmV3WCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ggPSBzb2xpZC54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCBtb3ZlLCAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnggKyBzb2xpZC53aWR0aCA+IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCArIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeCA9IG5ld1ggLSB0aGlzLng7XG4gICAgICAgICAgICB0aGlzLnggPSBuZXdYO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGR4OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeS1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVZKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55IC0gdGhpcy5oZWlnaHQgPCBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgLSB0aGlzLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgPiBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR5ID0gbmV3WSAtIHRoaXMueTtcbiAgICAgICAgICAgIHRoaXMueSA9IG5ld1k7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gZHk7ICAgICAgLy8gaWYgbW92ZW1lbnQgd2FzIHN0b3BwZWQgYnkgYSBTb2xpZCwgbW92ZWQgZGlzdGFuY2UgaXMgYW4gaW50ZWdlclxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBpZiBtb3ZlbWVudCB3YXMgbm90IHN0b3BwZWQsIG1vdmVkIGRpc3RhbmNlIG1pZ2h0IGJlIGZyYWN0aW9uYWxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGFtb3VudDsgIC8vIG1vdmVtZW50IHRoYXQgaXMgaW5zdWZmaWNpZW50IHRvIG1vdmUgYnkgYSBwaXhlbCBpcyBzdGlsbCBjb3VudGVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIEFjdG9yIGlzIGN1cnJlbnRseSBcInJpZGluZ1wiIHRoZSBTb2xpZCBnaXZlbiBhcyBwYXJhbWV0ZXIsIG1lYW5pbmcgdGhhdCB3aGVuIHRoZSBTb2xpZFxuICAgICAqIG1vdmVzIGl0IHNob3VsZCBtb3ZlIHRoZSBBY3RvciB0b28uXG4gICAgICogQW4gQWN0b3IgaXMgY29uc2lkZXJlZCB0byBiZSByaWRpbmcgYSBTb2xpZCBpdCBpcyBzdGFuZGluZyBkaXJlY3RseSBvbiB0b3Agb2YgaXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc29saWQge1NvbGlkfVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHRoZSBBY3RvciBpcyByaWRpbmcgdGhlIHNvbGlkXG4gICAgICovXG4gICAgaXNSaWRpbmcoc29saWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueSArIHRoaXMuaGVpZ2h0ID09PSBzb2xpZC55ICYmIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgY2FsbGVkIHdoZW4gdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZCB3aGlsZSBiZWluZyBwdXNoZWQgYnkgYW5vdGhlclxuICAgICAqL1xuICAgIHNxdWlzaCgpIHt9XG5cbiAgICAvKipcbiAgICAgKiBNZXRob2QgY2FsbGVkIHdoZW4gdGhlIEFjdG9yIGRpZXNcbiAgICAgKi9cbiAgICBkaWUoKSB7fVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhpcy5teCBhbmQgc3RhcnRzIHRoZSBhc3NvY2lhdGVkIHRpbWVyXG4gICAgICogQHBhcmFtIG14IHtudW1iZXJ9IHZhbHVlIG9mIG1vbWVudHVtIGFsb25nIHRoZSB4LWF4aXNcbiAgICAgKi9cbiAgICBzZXRNb21lbnR1bVgobXgpIHtcbiAgICAgICAgaWYgKG14KSB7XG4gICAgICAgICAgICB0aGlzLm1vbWVudHVtWCA9IG14O1xuICAgICAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW1YID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzLm15IGFuZCBzdGFydHMgdGhlIGFzc29jaWF0ZWQgdGltZXJcbiAgICAgKiBAcGFyYW0gbXkge251bWJlcn0gdmFsdWUgb2YgbW9tZW50dW0gYWxvbmcgdGhlIHktYXhpc1xuICAgICAqL1xuICAgIHNldE1vbWVudHVtWShteSkge1xuICAgICAgICBpZiAobXkpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBQbGF5ZXJDaGFyYWN0ZXIgZXh0ZW5kcyBBY3RvciB7XG4gICAgY29uc3RydWN0b3IocGxheWVyLCB4ID0gMCwgeSA9IDApIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgOCwgMTQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogQXNzb2NpYXRlZCBQbGF5ZXJcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBzcGVlZCBhbG9uZyB4LWF4aXNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEN1cnJlbnQgc3BlZWQgYWxvbmcgeS1heGlzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDdXJyZW50IGRhc2hpbmcgc3BlZWQgYWxvbmcgeC1heGlzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBkYXNoaW5nIHNwZWVkIGFsb25nIHktYXhpc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIE51bWJlciBvZiBhdmFpbGFibGUgZGFzaGVzIChzaG91bGQgYmUgMSBvciAwKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBjaGFyYWN0ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgKiAoc2V0IGF1dG9tYXRpY2FsbHkgZHVyaW5nIHVwZGF0ZSlcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgY2hhcmFjdGVyIGlzIGFnYWluc3QgYSB3YWxsIChhbmQgcHJlc3NpbmcgdGhlIGRpcmVjdGlvbiB0b3dhcmRzIHRoZSB3YWxsKVxuICAgICAgICAgKiAoc2V0IGF1dG9tYXRpY2FsbHkgZHVyaW5nIHVwZGF0ZSlcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlcmUgaXMgYSBjbGltYmFibGUgU29saWQgdG8gdGhlIGxlZnQgb2YgdGhlIGNoYXJhY3RlciBhdCBhIGRpc3RhbmNlIG9mIGF0IG1vc3RcbiAgICAgICAgICogY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRVxuICAgICAgICAgKiAoc2V0IGF1dG9tYXRpY2FsbHkgZHVyaW5nIHVwZGF0ZSlcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZXJlIGlzIGEgY2xpbWJhYmxlIFNvbGlkIHRvIHRoZSByaWdodCBvZiB0aGUgY2hhcmFjdGVyIGF0IGEgZGlzdGFuY2Ugb2YgYXQgbW9zdFxuICAgICAgICAgKiBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAqIChzZXQgYXV0b21hdGljYWxseSBkdXJpbmcgdXBkYXRlKVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgb2YgU3RyYXdiZXJyaWVzIHRoYXQgaGF2ZSBiZWVuIHRha2VuIGJ5IHRoZSBjaGFyYWN0ZXIgaW4gdGhlIGN1cnJlbnQgU2NlbmVcbiAgICAgICAgICogLSBpZiB0aGUgcGxheWVyIGRpZXMsIHRoZXNlIFN0cmF3YmVycmllcyBhcmUgcmVhY3RpdmF0ZWQgaW4gdGhlIFNjZW5lIChhbmQgdGhlIHBsYXllciBtdXN0IHRha2UgdGhlbSBhZ2FpbilcbiAgICAgICAgICogLSBpZiB0aGUgcGxheWVyIGNoYW5nZXMgU2NlbmUsIHRoZXNlIFN0cmF3YmVycmllcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSBTY2VuZSBhbmQgc3RvcmVkIGFzIFwicmVndWxhclwiXG4gICAgICAgICAqICAgICBTdHJhd2JlcnJpZXMgZm9yIHRoZSBwbGF5ZXIuXG4gICAgICAgICAqIEB0eXBlIHtTZXQ8U3RyYXdiZXJyeT59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCBvZiBTdHJhd2JlcnJpZXMgdGhhdCBoYXZlIGJlZW4gcGVybWFuZW50bHkgdGFrZW4gYnkgdGhlIHBsYXllclxuICAgICAgICAgKiBAdHlwZSB7U2V0PFN0cmF3YmVycnk+fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEN1cnJlbnQgc3RhdGUgb2YgdGhlIFBsYXllckNoYXJhY3RlclxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaXJlY3Rpb24gdGhhdCB0aGUgY2hhcmFjdGVyIGlzIGZhY2luZyAoMSBpZiBmYWNpbmcgcmlnaHQsIC0xIGlmIGZhY2luZyBsZWZ0KVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcHJpdGVEaXJlY3Rpb24gPSAxO1xuICAgICAgICAvKipcbiAgICAgICAgICogUm93IG9mIHRoZSBjdXJyZW50bHkgcGxheWluZyBzcHJpdGUgYW5pbWF0aW9uIGluIHRoZSBzcHJpdGUgc2hlZXRcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyB2YWx1ZSBjb3JyZXNwb25kcyB0byB0aGUgcm93IGluIHRoZSBcInNpbXBsZVwiIHNwcml0ZSBzaGVldC4gVGhlIHJlYWwgc3ByaXRlIHNoZWV0cyB1c2VkIGhhdmUgNCBjb3BpZXNcbiAgICAgICAgICogb2YgZWFjaCByb3cgKHR3byBkaXJlY3Rpb25zIGFuZCB0d28gY29sb3JzLCB3aGV0aGVyIHRoZSBwbGF5ZXIgY2FuIGRhc2ggb3Igbm90KSBzbyB0aGUgYWN0dWFsIHJvdyB1c2VkIHdoZW5cbiAgICAgICAgICogZHJhd2luZyB0aGUgc3ByaXRlIGlzICg0ICogdGhpcy5zcHJpdGVSb3cgKyBrKSB3aGVyZSAwIOKJpCBrIOKJpCAzIGRlcGVuZHMgb24gdGhlIHN0YXRlIG9mIHRoZSBwbGF5ZXIuXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwcml0ZVJvdyA9IDE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBOdW1iZXIgb2Ygc3ByaXRlcyBpbiB0aGUgY3VycmVudGx5IHBsYXlpbmcgc3ByaXRlIGFuaW1hdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5uYlNwcml0ZXMgPSA0O1xuICAgICAgICAvKipcbiAgICAgICAgICogQ291bnRlciB0byBkZXRlbWluZSB3aGljaCBzcHJpdGUgb2YgdGhlIGN1cnJlbnQgYW5pbWF0aW9uIHNob3VsZCBiZSBkcmF3blxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGUgY291bnRlciBpcyBpbmNyZW1lbnRlZCBieSAxIGF0IGVhY2ggZnJhbWUgc28gdGhlIGluZGV4IG9mIHRoZSBzcHJpdGUgZHJhd24gaXNcbiAgICAgICAgICogfn4odGhpcy5hbmltYXRpb25Db3VudCAvIEFOSU1BVElPTl9TTE9XRE9XTikgJSB0aGlzLm5iU3ByaXRlc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hbmltYXRpb25Db3VudGVyID0gMDtcblxuICAgICAgICAvLyB0aW1lcnNcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGF5IGFmdGVyIGxlYXZpbmcgdGhlIGdyb3VuZCBkdXJpbmcgd2hpY2ggdGhlIHBsYXllciBpcyBzdGlsbCBhbGxvd2VkIHRvIGp1bXAgKFwiQ295b3RlIHRpbWVcIilcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb29sZG93biBkdXJhdGlvbiBvZiBkYXNoIChpbXBvc3NpYmxlIHRvIGRhc2ggZHVyaW5nIHRoaXMgdGltZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTaG9ydCB0aW1lIGR1cmluZyB3aGljaCB0aGUgcGxheWVyIGlzIGZyb3plbiBpbiBwbGFjZSB3aGVuIGRhc2hpbmdcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogRHVyYXRpb24gb2YgdGhlIGRhc2ggKHNwZWVkIGlzIGZpeGVkIGR1cmluZyB0aGlzIHRpbWUgcGVyaW9kKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEdXJhdGlvbiBhZnRlciBhIGp1bXAgZHVyaW5nIHdoaWNoIHRoZSBwbGF5ZXIgaGFzIGEgZml4ZWQgdXB3YXJkcyBzcGVlZCBpZiB0aGUganVtcCBidXR0b24gaXMgaGVsZFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lIGludGVydmFsIGFmdGVyIHRoZSBwbGF5ZXIgZGllcyBiZWZvcmUgaXQgcmVzcGF3bnNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIER1cmF0aW9uIGFmdGVyIHRvdWNoaW5nIGEgU3ByaW5nIGR1cmluZyB3aGljaCB0aGUgdXB3YXJkcyBzcGVlZCBvZiB0aGUgcGxheWVyIGlzIGZpeGVkXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gfn4odGhpcy5hbmltYXRpb25Db3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gNCAqIHRoaXMuc3ByaXRlUm93ICsgKHRoaXMubmJEYXNoZXMgPyAwIDogMikgKyAodGhpcy5zcHJpdGVEaXJlY3Rpb24gPT09IC0xID8gMSA6IDApO1xuICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgZ3JhcGhpY3Muc2hlZXRzW3RoaXMucGxheWVyLmNvbG9yXSxcbiAgICAgICAgICAgIDE2ICogaW5kZXgsIDE2ICogcm93LFxuICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgdGhpcy54IC0gNCArIHRoaXMuc2hpZnRYLCB0aGlzLnkgLSAyICsgdGhpcy5zaGlmdFksXG4gICAgICAgICAgICAxNiwgMTYpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uQ291bnRlciArPSAxO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbkNvdW50ZXIgJT0gdGhpcy5uYlNwcml0ZXMgKiBBTklNQVRJT05fU0xPV0RPV047XG5cbiAgICAgICAgLy8gY2hlY2sgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIHN0YW5kaW5nIG9uIGEgc29saWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvbGlkLmNhbkJlQ2xpbWJlZCAmJiBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy54ICsgdGhpcy53aWR0aCA9PT0gc29saWQueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIGh1Z2dpbmcgYSB3YWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy51cGRhdGVBbmltYXRpb24oKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIGludGVyYWN0IHdpdGggVGhpbmdzXG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuc2NlbmUudGhpbmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHModGhpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaW5nLm9uQ29udGFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMueSA+PSB0aGlzLnNjZW5lLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIG1vdmVtZW50IG9mIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgKG1vc3RseSBpdHMgc3BlZWQpIGFjY29yZGluZyB0byBpdHMgY3VycmVudCBzdGF0ZSBhbmQgcGxheWVyIGlucHV0c1xuICAgICAqIEBwYXJhbSBkZWx0YVRpbWUge251bWJlcn0gZHVyYXRpb24gc2luY2UgbGFzdCB1cGRhdGVcbiAgICAgKi9cbiAgICB1cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5keWluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NlbmUuc2hvdWxkUmVzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZURhc2goKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcCgpKSBicmVhaztcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLmlzUHJlc3NlZChcImp1bXBcIikgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJ5VXBkYXRlRGFzaCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKCkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIHNob3VsZCBkYXNoIChkZXBlbmRpbmcgb24gcGxheWVyIGlucHV0IGFuZCBhdmFpbGFiaWxpdHkpIGFuZCBzdGFydHMgdGhlIGRhc2ggKGlmIGl0XG4gICAgICogc2hvdWxkKS5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBkdXJpbmcgdXBkYXRlTW92ZW1lbnQoKSBpZiB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgUGxheWVyQ2hhcmFjdGVyIGNhbiBiZSBpbnRlcnJ1cHRlZCBieVxuICAgICAqIGEgZGFzaC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciBhIGRhc2ggaGFzIHN0YXJ0ZWRcbiAgICAgKi9cbiAgICB0cnlVcGRhdGVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy5pc1ByZXNzZWQoXCJkYXNoXCIpICYmXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnB1dHMudGltZXJzLmRhc2hCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPD0gMCAmJlxuICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyB8fCB0aGlzLnBsYXllci5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICYmIHRoaXMucGxheWVyLmlucHV0cy55QXhpcyA/IGNvbnN0YW50cy5EQVNIX1NQRUVEIC8gTWF0aC5zcXJ0KDIpIDogY29uc3RhbnRzLkRBU0hfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5wbGF5ZXIuaW5wdXRzLnlBeGlzICogZGFzaFNwZWVkO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIHNob3VsZCBqdW1wIChkZXBlbmRpbmcgb24gcGxheWVyIGlucHV0IGFuZCBhdmFpbGFiaWxpdHkpIGFuZCBzdGFydHMgdGhlIGRhc2ggKGlmIGl0XG4gICAgICogc2hvdWxkKS5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBkdXJpbmcgdXBkYXRlTW92ZW1lbnQoKSBpZiB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgUGxheWVyQ2hhcmFjdGVyIGNhbiBiZSBpbnRlcnJ1cHRlZCBieVxuICAgICAqIGEganVtcC5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciBhIGp1bXAgaGFzIHN0YXJ0ZWRcbiAgICAgKi9cbiAgICB0cnlVcGRhdGVKdW1wKCkge1xuICAgICAgICBsZXQgZGlkSnVtcCA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLmlzUHJlc3NlZChcImp1bXBcIikgJiZcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5KVU1QX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfSlVNUCk7XG4gICAgICAgICAgICBkaWRKdW1wID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy5pc1ByZXNzZWQoXCJqdW1wXCIpICYmXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnB1dHMudGltZXJzLmp1bXBCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICAodGhpcy5oYXNXYWxsTGVmdCB8fCB0aGlzLmhhc1dhbGxSaWdodCkpIHtcbiAgICAgICAgICAgIC8vIHdhbGxqdW1wXG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy5oYXNXYWxsUmlnaHQpIHx8ICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMuaGFzV2FsbExlZnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bVggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIHRoaXMubW9tZW50dW1YO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtWSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogdGhpcy5tb21lbnR1bVk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZEp1bXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgaG9yaXpvbnRhbCBzcGVlZCAodGhpcy5zcGVlZFgpIG9mIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgZGVwZW5kaW5nIG9uIHBsYXllciBpbnB1dCBhbmQgY3VycmVudFxuICAgICAqIHNpdHVhdGlvblxuICAgICAqIEBwYXJhbSBkZWx0YVRpbWVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgIT09IDApIHRoaXMuc3ByaXRlRGlyZWN0aW9uID0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzO1xuXG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA8PSAwKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzeCA+IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhY3RpdmUgYWNjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSB2ZXJ0aWNhbCBzcGVlZCAodGhpcy5zcGVlZFkpIG9mIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgZGVwZW5kaW5nIG9uIHBsYXllciBpbnB1dCBhbmQgY3VycmVudFxuICAgICAqIHNpdHVhdGlvblxuICAgICAqIEBwYXJhbSBkZWx0YVRpbWVcbiAgICAgKi9cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMueUF4aXMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkNMSU1CX1VQX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLkNMSU1CX1NMSVBfU1BFRUQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuTUFYX0ZBTExfU1BFRUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBzcHJpdGUgYW5pbWF0aW9uIHRvIHBsYXkgZGVwZW5kaW5nIG9uIHRoZSBzdGF0ZSBvZiB0aGUgUGxheWVyQ2hhcmFjdGVyXG4gICAgICovXG4gICAgdXBkYXRlQW5pbWF0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gY29uc3RhbnRzLlNUQVRFX0RFQUQpIHtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uUExBWUVSX0FOSU1BVElPTl9SVU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLlBMQVlFUl9BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5QTEFZRVJfQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVlZFkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLlBMQVlFUl9BTklNQVRJT05fRkFMTCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uUExBWUVSX0FOSU1BVElPTl9KVU1QKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50bHkgcGxheWluZyBzcHJpdGUgYW5pbWF0aW9uXG4gICAgICogQHBhcmFtIHNwcml0ZV9yb3cge251bWJlcn0gcm93IG9mIHRoZSBhbmltYXRpb24gaW4gdGhlIChzaW1wbGUpIHNwcml0ZSBzaGVldFxuICAgICAqIEBwYXJhbSBuYl9zcHJpdGVzIHtudW1iZXJ9IG51bWJlciBvZiBzcHJpdGVzIGluIHRoZSBhbmltYXRpb25cbiAgICAgKi9cbiAgICBzZXRBbmltYXRpb24oc3ByaXRlX3JvdywgbmJfc3ByaXRlcykge1xuICAgICAgICBpZiAoc3ByaXRlX3JvdyAhPT0gdGhpcy5zcHJpdGVSb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlUm93ID0gc3ByaXRlX3JvdztcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ291bnRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLm5iU3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSBzdGF0ZSBvZiB0aGUgUGxheWVyQ2hhcmFjdGVyXG4gICAgICpcbiAgICAgKiBJZiB0aGUgbmV3IHN0YXRlIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBjdXJyZW50IHN0YXRlLCBzcGVjaWFsIGFjdGlvbnMgY2FuIGJlIHBlcmZvcm1lZCB3aGVuIGxlYXZpbmcgdGhlIGN1cnJlbnRcbiAgICAgKiBzdGF0ZSBhbmQgd2hlbiBlbnRlcmluZyB0aGUgbmV3IHN0YXRlLiBUaGlzIG1ldGhvZCBkb2VzIG5vdGhpbmcgaWYgdGhlIG5ldyBzdGF0ZSBpcyB0aGUgc2FtZSBhcyB0aGUgY3VycmVudFxuICAgICAqIHN0YXRlLlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1N0YXRlIHtudW1iZXJ9IG5ldyBzdGF0ZSBvZiB0aGUgUGxheWVyQ2hhcmFjdGVyXG4gICAgICovXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuanVtcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuZGFzaCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuZGFzaEJ1ZmZlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5kaWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeGVjdXRlcyBhIHRyYW5zaXRpb24gZnJvbSBhIFNjZW5lIHRvIGFub3RoZXIgKHRyaWdnZXJlZCB3aGVuIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgdG91Y2hlcyBhIFRyYW5zaXRpb24pXG4gICAgICogQHBhcmFtIHRyYW5zaXRpb24ge1RyYW5zaXRpb259IHRoZSBUcmFuc2l0aW9uIG9iamVjdCB0aGF0IHRyaWdnZXJlZCB0aGUgU2NlbmUgY2hhbmdlXG4gICAgICovXG4gICAgbWFrZVRyYW5zaXRpb24odHJhbnNpdGlvbikge1xuICAgICAgICAvLyBzdG9yZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzIHBlcm1hbmVudGx5XG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVUaGluZyhzdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzLmFkZChzdHJhd2JlcnJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICAvLyBtb3ZlIFBsYXllckNoYXJhY3RlciB0aGUgdGhlIG5ldyBTY2VuZVxuICAgICAgICB0aGlzLnNjZW5lLnJlbW92ZUFjdG9yKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLmFkZEFjdG9yKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IHRyYW5zaXRpb24uc3Bhd25Qb2ludEluZGV4O1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uUExBWUVSX0FOSU1BVElPTl9ESUUpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICBjb25zdCBwb2ludCA9IHRoaXMuc2NlbmUuc3Bhd25Qb2ludHNbdGhpcy5zY2VuZS5zcGF3blBvaW50SW5kZXhdO1xuICAgICAgICB0aGlzLnggPSBwb2ludC54O1xuICAgICAgICB0aGlzLnkgPSBwb2ludC55IC0gNjtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlcyB0aGUgZGFzaCBhYmlsaXR5IHRvIHRoZSBQbGF5ZXJDaGFyYWN0ZXJcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgUGxheWVyQ2hhcmFjdGVyIGRpZG4ndCBoYXZlIGEgZGFzaCB3aGVuIHRoZSBmdW5jdGlvbiB3YXMgY2FsbGVkXG4gICAgICovXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgaXMgY3VycmVudGx5IFwicmlkaW5nXCIgdGhlIFNvbGlkIGdpdmVuIGFzIHBhcmFtZXRlciwgbWVhbmluZyB0aGF0IHdoZW4gdGhlXG4gICAgICogU29saWQgbW92ZXMgaXQgc2hvdWxkIG1vdmUgdGhlIFBsYXllckNoYXJhY3RlciB0b28uXG4gICAgICogQSBQbGF5ZXJDaGFyYWN0ZXIgaXMgY29uc2lkZXJlZCB0byBiZSByaWRpbmcgYSBTb2xpZCBpdCBpcyBzdGFuZGluZyBkaXJlY3RseSBvbiB0b3Agb2YgaXQgb3IgaWYgaXQgaXMgaHVnZ2luZ1xuICAgICAqIGl0ICh0b3VjaGluZyBvbiBsZWZ0IG9yIHJpZ2h0IGFuZCBwcmVzc2luZyBkaXJlY3Rpb24gdG93YXJkcyB0aGUgU29saWQpXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc29saWQge1NvbGlkfVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHRoZSBQbGF5ZXJDaGFyYWN0ZXIgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBzb2xpZC5jYW5CZUNsaW1iZWQgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFNvbGlkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IEFjdG9ycyBjYW5ub3QgcGFzcyB0aHJvdWdoLiBUaGVyZSBzaG91bGQgbmV2ZXIgYmUgYW4gQWN0b3Igb3ZlcmxhcHBpbmcgYSBTb2xpZCAodW5sZXNzXG4gKiBlaXRoZXIgb25lIGlzIG1hcmtlZCBhcyBpbmFjdGl2ZSkuIFdoZW4gU29saWRzIG1vdmUsIHRoZXkgaW50ZXJhY3Qgd2l0aCBBY3RvcnMgdGhhdCBtaWdodCBvdGhlcndpc2Ugb3ZlcmxhcCAodGhleVxuICogbWlnaHQgcHVzaCB0aGVtLCBraWxsIHRoZW0sIGV0Yy4pLlxuICpcbiAqIFR3byBTb2xpZHMgbWlnaHQgb3ZlcmxhcCwgYW5kIGluIGdlbmVyYWwgdGhlIG1vdmVtZW50IG9mIGEgU29saWQgaXMgbm90IGFmZmVjdGVkIGJ5IG90aGVyIFNvbGlkcy5cbiAqL1xuY2xhc3MgU29saWQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNvbGlkIHNob3VsZCBiZSBjb25zaWRlcmVkIHdoZW4gY2hlY2tpbmcgY29sbGlzaW9ucyB3aXRoIGFuIEFjdG9yXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIGlzIHVzZWQgYXV0b21hdGljYWxseSBieSB0aGUgbW92ZSgpIG1ldGhvZCB3aGVuIHRoZSBTb2xpZCBwdXNoZXMgYW4gQWN0b3IuIEl0IHNob3VsZCBub3QgYmVcbiAgICAgICAgICogY2hhbmdlZCBpbiBvdGhlciBjaXJjdW1zdGFuY2VzICh1c2UgaXNBY3RpdmUgdG8gZGlzYWJsZSB0aGUgU29saWQpLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmVzIHRoZSBTb2xpZCBieSBhIGdpdmVuIGFtb3VudFxuICAgICAqXG4gICAgICogQWZ0ZXIgdGhlIFNvbGlkIGlzIG1vdmVkLCBhbGwgQWN0b3JzIG9mIHRoZSBTY2VuZSBtdXN0IGJlIGNoZWNrZWRcbiAgICAgKiAtIEFjdG9ycyB0aGF0IG92ZXJsYXAgdGhlIG5ldyBwb3NpdGlvbiBvZiB0aGUgU29saWQgbXVzdCBiZSBwdXNoZWRcbiAgICAgKiAtIEFjdG9ycyB0aGF0IGFyZSByaWRpbmcgdGhlIHNvbGlkIG11c3QgYmUgY2FycmllZFxuICAgICAqXG4gICAgICogVGhlIGltcGxlbWVudGF0aW9uIGlzIGNsb3NlIHRvIHRoZSBkZXNjcmlwdGlvbiBvZiB0aGUgQ2VsZXN0ZSBhbmQgVG93ZXJmYWxsIGVuZ2luZSA6XG4gICAgICogaHR0cHM6Ly9tZWRpdW0uY29tL0BNYXR0VGhvcnNvbi9jZWxlc3RlLWFuZC10b3dlcmZhbGwtcGh5c2ljcy1kMjRiZDJhZTBmYzVcbiAgICAgKiAod2l0aCBzb21lIG1vZGlmaWNhdGlvbnMsIGZvciBpbnN0YW5jZSB0aGUgZmFjdCB0aGF0IHRoZSBTb2xpZCBpcyBtb3ZlZCBieSBpdHMgZnVsbCBhbW91bnQgaW4gb25lIHN0ZXAsIG5vdFxuICAgICAqIDEgcGl4ZWwgYXQgYSB0aW1lKVxuICAgICAqXG4gICAgICogQHBhcmFtIGR4IHtudW1iZXJ9IG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSByaWdodFxuICAgICAqIEBwYXJhbSBkeSB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgZG93blxuICAgICAqIEBwYXJhbSBteCB7bnVtYmVyfSBtb21lbnR1bSBhbG9uZyB0aGUgeC1heGlzIChvcHRpb25hbClcbiAgICAgKiBAcGFyYW0gbXkge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHktYXhpcyAob3B0aW9uYWwpXG4gICAgICovXG4gICAgbW92ZShkeCwgZHksIG14ID0gMCwgbXkgPSAwKSB7XG4gICAgICAgIC8vIG1vdmUgYWxsIGF0dGFjaGVkIGVsZW1lbnRzXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSwgbXgsIG15KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTsgIC8vIGludGVnZXIgYW1vdW50IHRvIG1vdmVcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHVzaCBhY3RvcnMgdGhhdCBvdmVybGFwIHdpdGggdGhpcyBhZnRlciBtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXJyeSBhY3RvcnMgdGhhdCBhcmUgcmlkaW5nIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYIDwgbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIGFjdG9ycyB0aGF0IG92ZXJsYXAgd2l0aCB0aGlzIGFmdGVyIG1vdmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54IC0gYWN0b3IueCAtIGFjdG9yLndpZHRoLCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXJyeSBhY3RvcnMgdGhhdCBhcmUgcmlkaW5nIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYID4gbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb3ZlWSkge1xuICAgICAgICAgICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIGFjdG9ycyB0aGF0IG92ZXJsYXAgd2l0aCB0aGlzIGFmdGVyIG1vdmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWShteSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjYXJyeSBhY3RvcnMgdGhhdCBhcmUgcmlkaW5nIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZIDwgbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIGFjdG9ycyB0aGF0IG92ZXJsYXAgd2l0aCB0aGlzIGFmdGVyIG1vdmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55IC0gYWN0b3IueSAtIGFjdG9yLmhlaWdodCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FycnkgYWN0b3JzIHRoYXQgYXJlIHJpZGluZyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA+IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBTb2xpZCBpcyBjb25zaWRlcmVkIHRvIGNvbGxpZGUgd2l0aCBhbiBBY3RvciBtb3ZpbmcgYnkgYSBnaXZlbiBhbW91bnQgaW4gYm90aCBheGVzLlxuICAgICAqXG4gICAgICogVG8gc2ltcGxpZnkgdGhlIGNvbXB1dGF0aW9uLCB0aGUgZnVuY3Rpb24gY2hlY2tzIGlmIHRoZSBib3VuZGluZyBib3ggb2YgdGhlIHNvbGlkIG92ZXJsYXBzIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgICogcmVjdGFuZ2xlIGNvbnRhaW5pbmcgdGhlIGFyZWFzIG9jY3VwaWVkIGJ5IHRoZSBBY3RvciBhdCB0aGUgc3RhcnQgYW5kIGVuZCBvZiBpdHMgbW92ZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYWN0b3Ige0FjdG9yfVxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBhbW91bnQgdHJhdmVsZWQgYnkgdGhlIEFjdG9yIG9uIHRoZSB4LWF4aXMgZnJvbSBpdHMgY3VycmVudCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSBkeSB7bnVtYmVyfSBhbW91bnQgdHJhdmVsZWQgYnkgdGhlIEFjdG9yIG9uIHRoZSB5LWF4aXMgZnJvbSBpdHMgY3VycmVudCBwb3NpdGlvblxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSBTb2xpZCBvdmVybGFwcyB0aGUgQWN0b3IgYXQgYW55IHBvaW50IGR1cmluZyBpdHMgbW92ZW1lbnRcbiAgICAgKi9cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR4ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoICsgZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCArIGR4LCBhY3Rvci53aWR0aCAtIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQgKyBkeSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnkgKyBkeSwgYWN0b3IuaGVpZ2h0IC0gZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBQbGF0Zm9ybXMgYXJlIGZsYXQgU29saWRzICgwIGhlaWdodCkgdGhhdCBBY3RvcnMgY2FuIHBhc3MgdGhyb3VnaCB3aGVuIG1vdmluZyB1cHdhcmRzIGJ1dCBub3QgZG93bndhcmRzIChpZiB0aGV5IGFyZVxuICogZW50aXJlbHkgaGlnaGVyIHRoYW4gdGhlIFBsYXRmb3JtKVxuICpcbiAqIENvbnRyYXJ5IHRvIHJlZ3VsYXIgU29saWRzLCBQbGF0Zm9ybXMgYXJlIGFsbG93ZWQgdG8gb3ZlcmxhcCB3aXRoIEFjdG9ycy5cbiAqL1xuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIHRpbGVzKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCAwLCB0aWxlcyk7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0IDw9IHRoaXMueSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgKyBkeSA+IHRoaXMueTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQ3J1bWJsaW5nQmxvY2tzIGFyZSBTb2xpZHMgdGhhdCBkaXNhcHBlYXIgc2hvcnRseSBhZnRlciBhIFBsYXllciBoaXRzIGl0IChvbmx5IHdoZW4gdGhlIFBsYXllciBpcyBjb25zaWRlcmVkIHRvIGJlXG4gKiBcImNhcnJpZWRcIiBieSB0aGUgQ3J1bWJsaW5nQmxvY2spLlxuICogVGhleSByZWFwcGVhciBhZnRlciBhIGdpdmVuIHRpbWUgKGlmIHRoZXJlIGFyZSBubyBBY3RvcnMgb24gdGhlaXIgcG9zaXRpb24pXG4gKi9cbmNsYXNzIENydW1ibGluZ0Jsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg1NyldKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGJsb2NrIGlzIGRpc2FwcGVhcmluZ1xuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgZGlzYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgcmVhcHBlYXJhbmNlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyOyAgIC8vIGR1cmF0aW9uIGJlZm9yZSByZWFwcGVhcmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzaG91bGRCZWNvbWVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRCZWNvbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQmVjb21lQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuY3J1bWJsaW5nQmxvY2spO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTsgIC8vIGR1cmF0aW9uIGJlZm9yZSBkaXNhcHBlYXJpbmdcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFscGhhID0gMiAqIHRoaXMudGltZXJzLmZhbGw7XG4gICAgICAgICAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBhbHBoYTtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogVHJpZ2dlckJsb2NrcyBhcmUgU29saWRzIHRoYXQgc3RhcnQgbW92aW5nIHdoZW4gdGhleSBjYXJyeSBhbiBBY3RvclxuICovXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgZGVsYXksIG1vdmVtZW50LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodGlsZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGlsZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGVpZ2h0OyBpICs9IFUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdpZHRoOyBqICs9IFUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSA2NCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpO1xuICAgICAgICAgICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YShpbmRleCwgaiwgaSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBoYXMgYmVlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3IgYnV0IGhhcyBub3QgeWV0IHN0YXJ0ZWQgZXhlY3V0aW5nIHRoZSBtb3ZlbWVudCAoZHVyaW5nXG4gICAgICAgICAqIHRyaWdnZXIgZGVsYXkpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZSBkZWxheSBiZWZvcmUgdGhlIG1vdmVtZW50IHN0YXJ0cyB3aGVuIHRoZSBibG9jayBpcyB0cmlnZ2VyZWRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsYXkgPSBkZWxheTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1vdmVtZW50IHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3JcbiAgICAgICAgICogQHR5cGUge0VmZmVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnNoaWZ0WCA9IDA7XG4gICAgICAgIHRoaXMuc2hpZnRZID0gMDtcbiAgICAgICAgaWYgKHRoaXMuaXNUcmlnZ2VyZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy50cmlnZ2VyIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVFZmZlY3QodGhpcy50cmlnZ2VyZWRNb3ZlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hvdWxkVHJpZ2dlciA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICBzaG91bGRUcmlnZ2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdWxkVHJpZ2dlcikge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnRyaWdnZXIgPSB0aGlzLmRlbGF5O1xuICAgICAgICAgICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEZhbGxpbmdCbG9ja3MgYXJlIFRyaWdnZXJCbG9ja3MgdGhhdCBmYWxsIHdoZW4gdHJpZ2dlcmVkIGJ5IGFuIEFjdG9yXG4gKlxuICogVGhlaXIgYmVoYXZpb3IgaXMgdGhlIHNhbWUgYXMgYSBUcmlnZ2VyQmxvY2sgKHRoZSBmYWxsIGlzIGRlZmluZWQgYnkgdGhlIGFzc29jaWF0ZWQgbW92ZW1lbnQpIGJ1dCBhcmUgcmVwcmVzZW50ZWRcbiAqIHdpdGggZGlmZmVyZW50IHRpbGVzLlxuICovXG5jbGFzcyBGYWxsaW5nQmxvY2sgZXh0ZW5kcyBUcmlnZ2VyQmxvY2sge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCkge1xuICAgICAgICBjb25zdCB0aWxlcyA9IFtdO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgzKSk7XG4gICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUsIHdpZHRoIC0gVSwgMCkpO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxNiwgMCwgaGVpZ2h0IC0gVSkpO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxOCwgd2lkdGggLSBVLCBoZWlnaHQgLSBVKSk7XG4gICAgICAgIGZvciAobGV0IHggPSBVOyB4IDwgd2lkdGggLSBVOyB4ICs9IFUpIHtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQsIHgsIDApKTtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDE3LCB4LCBoZWlnaHQgLSBVKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgeSA9IFU7IHkgPCBoZWlnaHQgLSBVOyB5ICs9IFUpIHtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDgsIDAsIHkpKTtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDEwLCB3aWR0aCAtIFUsIHkpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCB4ID0gVTsgeCA8IHdpZHRoIC0gVTsgeCArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gVTsgeSA8IGhlaWdodCAtIFU7IHkgKz0gVSkge1xuICAgICAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDksIHgsIHkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQsIHRpbGVzKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBUaGluZ3MgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBkbyBub3QgaW50ZXJhY3Qgd2l0aCBTb2xpZCBwaHlzaWNzLCBidXQgY2FuIGhhdmUgYW4gZWZmZWN0IHdoZW4gYW4gQWN0b3IgdG91Y2hlcyB0aGVtXG4gKi9cbmNsYXNzIFRoaW5nIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBhbiBBY3RvciB0b3VjaGVzIHRoZSBUaGluZ1xuICAgICAqIEBwYXJhbSBhY3RvciB7QWN0b3J9IHRoZSBBY3RvciB0aGF0IHRvdWNoZXMgdGhlIFRoaW5nXG4gICAgICovXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge31cbn1cblxuXG4vKipcbiAqIEhhemFyZHMgYXJlIFRoaW5ncyB0aGF0IGtpbGwgdGhlIEFjdG9yIG9uIGNvbnRhY3RcbiAqL1xuY2xhc3MgSGF6YXJkIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGFjdG9yLmRpZSgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwcmluZ3MgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCB0aHJvdyBQbGF5ZXJzIHVwIG9uIGNvbnRhY3RcbiAqL1xuY2xhc3MgU3ByaW5nIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgY29uc3QgdGlsZXMxID0gW1xuICAgICAgICAgICAgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUyLCAwLCAtVSAvIDIpLFxuICAgICAgICAgICAgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUzLCBVLCAtVSAvIDIpXG4gICAgICAgIF07XG4gICAgICAgIGNvbnN0IHRpbGVzMiA9IFtcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1NCwgMCwgLVUgLyAyKSxcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1NSwgVSwgLVUgLyAyKVxuICAgICAgICBdXG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgMiAqIFUsIFUgLyAyLCB0aWxlczEpO1xuICAgICAgICB0aGlzLnRpbGVzMSA9IHRpbGVzMTtcbiAgICAgICAgdGhpcy50aWxlczIgPSB0aWxlczI7XG4gICAgICAgIHRoaXMudGltZXJzLmV4dGVuZGVkID0gMDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3RvciBpbnN0YW5jZW9mIFBsYXllckNoYXJhY3Rlcikge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuc3ByaW5nKTtcbiAgICAgICAgICAgIGFjdG9yLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9CT1VOQ0UpO1xuICAgICAgICAgICAgYWN0b3Iuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIGFjdG9yLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICBhY3Rvci5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZXh0ZW5kZWQgPSAuMjU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICB0aGlzLnRpbGVzID0gKHRoaXMudGltZXJzLmV4dGVuZGVkID4gMCkgPyB0aGlzLnRpbGVzMiA6IHRoaXMudGlsZXMxO1xuICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogRGFzaERpYW1vbmRzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgcmVzdG9yZSB0aGUgZGFzaCBjb3VudGVyIG9mIHRoZSBQbGF5ZXJzIHdobyB0b3VjaCB0aGVtXG4gKi9cbmNsYXNzIERhc2hEaWFtb25kIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSgyMSldKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgoYWN0b3IpIHtcbiAgICAgICAgaWYgKGFjdG9yIGluc3RhbmNlb2YgUGxheWVyQ2hhcmFjdGVyICYmIGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAoYWN0b3IucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5lZmZlY3RzLmRhc2hEaWFtb25kKTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFN0cmF3YmVycmllcyBhcmUgY29sbGVjdGlibGVzIHRoYXQgUGxheWVycyB0YWtlIG9uIGNvbnRhY3QuXG4gKiBJZiBhIFBsYXllciBkaWVzIGFmdGVyIGNvbGxlY3RpbmcgYSBTdHJhd2JlcnJ5IGJlZm9yZSBjaGFuZ2luZyBTY2VuZSwgdGhlIFN0cmF3YmVycnkgaXMgcmVzdG9yZWQgaW4gdGhlIFNjZW5lXG4gKiAoYW5kIHJlbW92ZWQgZnJvbSB0aGUgUGxheWVyJ3MgbGlzdCBvZiBjb2xsZWN0ZWQgU3RyYXdiZXJyaWVzKVxuICovXG5jbGFzcyBTdHJhd2JlcnJ5IGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSgxMyldKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3RvciBpbnN0YW5jZW9mIFBsYXllckNoYXJhY3RlciAmJiBhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuc3RyYXdiZXJyeSk7XG4gICAgICAgICAgICBhY3Rvci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuYWRkKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1VwIGFyZSBIYXphcmRzIHRoYXQga2lsbCBhbiBBY3RvciBpZiBpdCBtb3ZlcyBkb3dud2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIEhhemFyZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCBbbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQwLCAwLCAtVSAvIDIpXSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBpZiAoYWN0b3IubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgYWN0b3IuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNEb3duIGFyZSBIYXphcmRzIHRoYXQga2lsbCBhbiBBY3RvciBpZiBpdCBtb3ZlcyB1cHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzRG93biBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVIC8gMiwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MildKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA8IDApIHtcbiAgICAgICAgICAgIGFjdG9yLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzUmlnaHQgYXJlIEhhemFyZHMgdGhhdCBraWxsIGFuIEFjdG9yIGlmIGl0IG1vdmVzIGxlZnR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc1JpZ2h0IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUgLyAyLCBVLCBbbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQxKV0pO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgoYWN0b3IpIHtcbiAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCAtIHRoaXMubW92ZWRYIDwgMCkge1xuICAgICAgICAgICAgYWN0b3IuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgYW4gQWN0b3IgaWYgaXQgbW92ZXMgcmlnaHR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0xlZnQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCArIFUgLyAyLCB5LCBVIC8gMiwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MywgLVUgLyAyLCAwKV0pO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgoYWN0b3IpIHtcbiAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCAtIHRoaXMubW92ZWRYID4gMCkge1xuICAgICAgICAgICAgYWN0b3IuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmFuc2l0aW9ucyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRyYW5zZmVyIGEgUGxheWVyIGZyb20gb25lIFNjZW5lIHRvIGFub3RoZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZLCBzcGF3blBvaW50SW5kZXggPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lIHRvIHdoaWNoIHRoZSBQbGF5ZXIgaXMgdGFrZW4gd2hlbiB0b3VjaGluZyB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7U2NlbmV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueCAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeC1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WCAtIHRoaXMueFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRYID0gdGFyZ2V0WDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBpbiB0aGUgdGFyZ2V0IFNjZW5lIGNvcnJlc3BvbmRpbmcgdG8gdGhpcy55ICh3aGVuIHRoZSBQbGF5ZXIgdHJhbnNpdGlvbnMgdG8gdGhlIHRhcmdldCBTY2VuZSxcbiAgICAgICAgICogaXRzIHBvc2l0aW9uIGlzIHNldCB0byBpdHMgY3VycmVudCB5LXBvc2l0aW9uICsgdGhpcy50YXJnZXRZICsgdGhpcy55XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFkgPSB0YXJnZXRZO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGluZGV4IG9mIHRoZSBzcGF3biBwb2ludCAoaW4gdGhlIHRhcmdldCBTY2VuZSdzIGxpc3Qgb2Ygc3Bhd24gcG9pbnRzKSBjb3JyZXNwb25kaW5nIHRvIHRoZSBUcmFuc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IHNwYXduUG9pbnRJbmRleDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3RvciBpbnN0YW5jZW9mIFBsYXllckNoYXJhY3Rlcikge1xuICAgICAgICAgICAgdGhpcy50YXJnZXRTY2VuZS5yZXNldCgpO1xuICAgICAgICAgICAgYWN0b3IueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgICAgICBhY3Rvci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgICAgIGFjdG9yLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5zY2VuZS50cmFuc2l0aW9uID0gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBBY3RvcixcbiAgICBQbGF5ZXJDaGFyYWN0ZXIsXG4gICAgU29saWQsXG4gICAgUGxhdGZvcm0sXG4gICAgQ3J1bWJsaW5nQmxvY2ssXG4gICAgVHJpZ2dlckJsb2NrLFxuICAgIEZhbGxpbmdCbG9jayxcbiAgICBUaGluZyxcbiAgICBIYXphcmQsXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgU3Bpa2VzVXAsXG4gICAgU3Bpa2VzRG93bixcbiAgICBTcGlrZXNSaWdodCxcbiAgICBTcGlrZXNMZWZ0LFxuICAgIFRyYW5zaXRpb24sXG59XG4iLCJjb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuXG5jbGFzcyBQbGF5ZXIge1xuICAgIGNvbnN0cnVjdG9yKGNvbG9yKSB7XG4gICAgICAgIHRoaXMuY29sb3IgPSBjb2xvcjtcbiAgICAgICAgdGhpcy5jaGFyYWN0ZXIgPSBuZXcgcGh5c2ljcy5QbGF5ZXJDaGFyYWN0ZXIodGhpcyk7XG4gICAgICAgIHRoaXMuaW5wdXRzID0gbmV3IGlucHV0cy5QbGF5ZXJJbnB1dHMoKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IG1lbnUgPSByZXF1aXJlKCcuL21lbnUnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcblxuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKGRhdGEud2lkdGggKiBVLCBkYXRhLmhlaWdodCAqIFUpO1xuICAgICAgICAvLyBtYWtlIHdhbGxzXG4gICAgICAgIGNvbnN0IHdhbGxzID0gW1xuICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKC0uNSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgoZGF0YS53aWR0aCArIC41KSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoaW5kZXggLSAxKTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zcGF3blBvaW50cy5wdXNoKHt4OiB4LCB5OiB5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUsIFt0aWxlRGF0YV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzVXAoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIFt0aWxlRGF0YV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3RyYXdiZXJyeSh4ICsgVSAvIDIsIHkgKyBVIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5DcnVtYmxpbmdCbG9jayh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuU29saWQoeCwgeSwgVSwgVSwgW3RpbGVEYXRhXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJFc2NhcGVcIikgfHwgZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcInBhdXNlXCIpKSkge1xuICAgICAgICAgICAgICAgIG1lbnUubWVudVN0YWNrLnVuc2hpZnQobWVudS5tYWluTWVudSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdXBkYXRlIGFsbCBlbGVtZW50c1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgICAgIHNvbGlkLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaW5nLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGFjdG9yLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgc29saWQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpbmcudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgYWN0b3IudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNjcm9sbCB2aWV3XG4gICAgICAgICAgICBpZiAoZ2xvYmFscy5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSB0aGlzLnNjcm9sbFggPCAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSB0aGlzLnNjcm9sbFkgPiAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAtIGNvbnN0YW50cy5WSUVXX0hFSUdIVCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIueSAtIC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZXNldCBzY2VuZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmICh0aGlzLnNob3VsZFJlc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5yZXNldCgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHgudHJhbnNsYXRlKC10aGlzLnNjcm9sbFgsIC10aGlzLnNjcm9sbFkpO1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAvLyBkcmF3IEhVRFxuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmYWFcIjtcbiAgICAgICAgY3R4LmZpbGxSZWN0KDEsIDEsIDQyLCAxMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwicmlnaHRcIjtcbiAgICAgICAgY3R4LmZvbnQgPSAnbm9ybWFsIDZweCBnYW1lYm95JztcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke2dsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIuc3RyYXdiZXJyaWVzLnNpemUgKyBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnRlbXBvcmFyeVN0cmF3YmVycmllcy5zaXplfS8yMGAsIDQwLCA4KTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShncmFwaGljcy5zaGVldHMudGlsZXMsIDgwLCAxNiwgMTYsIDE2LCAyLCAyLCA4LCA4KTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmFkZCh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5kZWxldGUodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2NlbmUsXG59XG4iLCJjb25zdCBlZmZlY3RzID0ge1xuICAgIGp1bXA6IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfanVtcC5vZ2cnKSxcbiAgICBkYXNoOiBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2Rhc2hfcGlua19sZWZ0Lm9nZycpLFxuICAgIGRpZTogbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9kZWF0aC5vZ2cnKSxcbiAgICBjcnVtYmxpbmdCbG9jazogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9mYWxsYmxvY2tfc2hha2Uub2dnJyksXG4gICAgc3RyYXdiZXJyeTogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zdHJhd2JlcnJ5X3JlZF9nZXRfMXVwLm9nZycpLFxuICAgIGRhc2hEaWFtb25kOiBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX2RpYW1vbmRfdG91Y2hfMDEub2dnJyksXG4gICAgc3ByaW5nOiBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3NwcmluZy5vZ2cnKSxcbn1cbmNvbnN0IGJnTXVzaWMgPSBuZXcgQXVkaW8oJ3NvdW5kL2JnX211c2ljLndhdicpO1xuYmdNdXNpYy5sb29wID0gdHJ1ZTtcblxubGV0IHNvdW5kVm9sdW1lO1xubGV0IG11c2ljVm9sdW1lO1xuXG5mdW5jdGlvbiBnZXRTb3VuZFZvbHVtZSgpIHtcbiAgICByZXR1cm4gc291bmRWb2x1bWU7XG59XG5cblxuZnVuY3Rpb24gc2V0U291bmRWb2x1bWUodmFsdWUpIHtcbiAgICBzb3VuZFZvbHVtZSA9IHZhbHVlO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIE9iamVjdC52YWx1ZXMoZWZmZWN0cykpIHtcbiAgICAgICAgZWZmZWN0LnZvbHVtZSA9IHNvdW5kVm9sdW1lIC8gMTY7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGluY3JlbWVudFNvdW5kVm9sdW1lKCkge1xuICAgIGlmIChzb3VuZFZvbHVtZSA8IDUpIHtcbiAgICAgICAgc2V0U291bmRWb2x1bWUoc291bmRWb2x1bWUgKyAxKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZGVjcmVtZW50U291bmRWb2x1bWUoKSB7XG4gICAgaWYgKHNvdW5kVm9sdW1lID4gMCkge1xuICAgICAgICBzZXRTb3VuZFZvbHVtZShzb3VuZFZvbHVtZSAtIDEpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNdXNpY1ZvbHVtZSgpIHtcbiAgICByZXR1cm4gbXVzaWNWb2x1bWU7XG59XG5cblxuZnVuY3Rpb24gc2V0TXVzaWNWb2x1bWUodmFsdWUpIHtcbiAgICBtdXNpY1ZvbHVtZSA9IHZhbHVlO1xuICAgIGJnTXVzaWMudm9sdW1lID0gbXVzaWNWb2x1bWUgLyAyNDtcbn1cblxuXG5mdW5jdGlvbiBpbmNyZW1lbnRNdXNpY1ZvbHVtZSgpIHtcbiAgICBpZiAobXVzaWNWb2x1bWUgPCA1KSB7XG4gICAgICAgIHNldE11c2ljVm9sdW1lKG11c2ljVm9sdW1lICsgMSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGRlY3JlbWVudE11c2ljVm9sdW1lKCkge1xuICAgIGlmIChtdXNpY1ZvbHVtZSA+IDApIHtcbiAgICAgICAgc2V0TXVzaWNWb2x1bWUobXVzaWNWb2x1bWUgLSAxKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gcGxheVNvdW5kKHNvdW5kKSB7XG4gICAgc291bmQuY3VycmVudFRpbWUgPSAwO1xuICAgIHNvdW5kLnBsYXkoKTtcbn1cblxuXG5zZXRTb3VuZFZvbHVtZSg1KTtcbnNldE11c2ljVm9sdW1lKDUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlZmZlY3RzLFxuICAgIGJnTXVzaWMsXG4gICAgZ2V0U291bmRWb2x1bWUsXG4gICAgZ2V0TXVzaWNWb2x1bWUsXG4gICAgcGxheVNvdW5kLFxuICAgIGluY3JlbWVudFNvdW5kVm9sdW1lLFxuICAgIGRlY3JlbWVudFNvdW5kVm9sdW1lLFxuICAgIGluY3JlbWVudE11c2ljVm9sdW1lLFxuICAgIGRlY3JlbWVudE11c2ljVm9sdW1lLFxufSJdfQ==
