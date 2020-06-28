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
            element.moveTo((1 - r) * this.x1 + r * this.x2, (1 - r) * this.y1 + r * this.y2, this.mx, this.my);
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
const scaling = 3;

module.exports = {
    players,
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

let currentScene;
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
        currentScene.update(1 / 60);
        // Transition from one room to another
        if (currentScene.transition) {
            const prevScene = currentScene;
            currentScene = currentScene.transition.targetScene;
            prevScene.transition = undefined;
        }
    }

    context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);
    currentScene.draw(context);
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
        currentScene = maps.scenes.celeste01;
        currentScene.spawnPointIndex = 1;
        currentScene.addActor(globals.players[0].character);
        currentScene.reset();
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
// optionsMenu.lines.push(
//     new MenuOption("Scale: x2")
//         .setOnRight(function () {
//             if (globals.scaling < 4) {
//                 globals.scaling += 1;
//             }
//         })
// )
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
// mainMenu.lines.push(new MenuOption("Restart").setOnActivate(function () {
//     console.log("restart...");
// }));
// Initial menu
const startMenu = new LineSelectMenu("Squarejump");
startMenu.canQuit = false;
startMenu.lines.push(new MenuOption("Start").setOnActivate(function () {
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
     * Method called when the Actor should die
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
        this.player = player;
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.nbDashes = 1;

        this.isGrounded = true;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;
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
            graphics.sheets[this.player.color],
            16 * index, 16 * row,
            16, 16,
            this.x - 4 + this.shiftX, this.y - 2 + this.shiftY,
            16, 16);
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.animation_counter += 1;
        this.animation_counter %= this.nb_sprites * ANIMATION_SLOWDOWN;

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

    updateHorizontalMovement(deltaTime) {
        if (this.player.inputs.xAxis !== 0) this.sprite_direction = this.player.inputs.xAxis;

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

    makeTransition(transition) {
        // validate temporary strawberries
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.scene.removeThing(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        this.scene.removeActor(this);
        transition.targetScene.addActor(this);
        transition.targetScene.spawnPointIndex = transition.spawnPointIndex;
        this.restoreDash();
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
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.player.inputs.xAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.player.inputs.xAxis === 1 && solid.x === this.x + this.width)
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
    bgMusic.volume = musicVolume / 16;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImdsb2JhbHMuanMiLCJncmFwaGljcy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzXy5qcyIsIm1lbnUuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3g1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3K0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfVVBfU1BFRUQgPSA0NTtcbmNvbnN0IENMSU1CX1NMSVBfU1BFRUQgPSAzMDtcbmNvbnN0IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSA9IDM7XG5jb25zdCBXQUxMX0pVTVBfSFNQRUVEID0gTUFYX1JVTl9TUEVFRCArIEpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbmNvbnN0IERBU0hfU1BFRUQgPSAyNDA7XG5jb25zdCBFTkRfREFTSF9TUEVFRCA9IDE2MDtcbmNvbnN0IEVORF9EQVNIX1VQX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfVElNRSA9IC4xNTtcbmNvbnN0IERBU0hfQ09PTERPV04gPSAuMjtcblxuLy8gT3RoZXIgY29uc3RhbnRzXG5jb25zdCBNT01FTlRVTV9TVE9SRV9USU1FID0gLjE7XG5jb25zdCBNT01FTlRVTV9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX0ZSRUVaRV9USU1FID0gLjA1O1xuY29uc3QgQk9VTkNFX1RJTUUgPSAuMjtcbmNvbnN0IEJPVU5DRV9TUEVFRCA9IDE5MDtcbmNvbnN0IERZSU5HX1RJTUUgPSAuODtcbmNvbnN0IFNUQVRFX05PUk1BTCA9IDA7XG5jb25zdCBTVEFURV9KVU1QID0gMTtcbmNvbnN0IFNUQVRFX0RBU0ggPSAyO1xuY29uc3QgU1RBVEVfREVBRCA9IDM7XG5jb25zdCBTVEFURV9CT1VOQ0UgPSA0O1xuXG5jb25zdCBHUklEX1NJWkUgPSA4O1xuY29uc3QgVklFV19XSURUSCA9IDMyMDtcbmNvbnN0IFZJRVdfSEVJR0hUID0gMTgwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNQVhfUlVOX1NQRUVELFxuICAgIFJVTl9BQ0NFTEVSQVRJT04sXG4gICAgUlVOX0RFQ0VMRVJBVElPTixcbiAgICBBSVJfRkFDVE9SLFxuICAgIEpVTVBfU1BFRUQsXG4gICAgSlVNUF9IT1JJWk9OVEFMX0JPT1NULFxuICAgIE1BWF9GQUxMX1NQRUVELFxuICAgIEdSQVZJVFksXG4gICAgSlVNUF9HUkFDRV9USU1FLFxuICAgIFZBUl9KVU1QX1RJTUUsXG4gICAgQ0xJTUJfVVBfU1BFRUQsXG4gICAgQ0xJTUJfU0xJUF9TUEVFRCxcbiAgICBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UsXG4gICAgV0FMTF9KVU1QX0hTUEVFRCxcbiAgICBEQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1VQX0ZBQ1RPUixcbiAgICBEQVNIX1RJTUUsXG4gICAgREFTSF9DT09MRE9XTixcbiAgICBNT01FTlRVTV9TVE9SRV9USU1FLFxuICAgIE1PTUVOVFVNX0ZBQ1RPUixcbiAgICBEQVNIX0ZSRUVaRV9USU1FLFxuICAgIEJPVU5DRV9USU1FLFxuICAgIEJPVU5DRV9TUEVFRCxcbiAgICBEWUlOR19USU1FLFxuICAgIFNUQVRFX05PUk1BTCxcbiAgICBTVEFURV9KVU1QLFxuICAgIFNUQVRFX0RBU0gsXG4gICAgU1RBVEVfREVBRCxcbiAgICBTVEFURV9CT1VOQ0UsXG4gICAgR1JJRF9TSVpFLFxuICAgIFZJRVdfV0lEVEgsXG4gICAgVklFV19IRUlHSFQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNsYXNzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHRoaXMudGltZXIgKz0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAmJiB0aGlzLnJlbWFpbmluZ0NvdW50ICYmIHRoaXMudGltZXIgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1haW5pbmdDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgfVxufVxuXG5cbmNsYXNzIEVmZmVjdFNlcXVlbmNlIGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihlZmZlY3RzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMuZWZmZWN0cyA9IGVmZmVjdHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS50aW1lciAtIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMuZWZmZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICB0aGlzLm15ID0gKHkyIC0geTEpIC8gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy50aW1lciAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyLCB0aGlzLm14LCB0aGlzLm15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKHRoaXMueDIsIHRoaXMueTIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNpbmVNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IHRoaXMudGltZXIgKiAyICogTWF0aC5QSSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYXRpbyA9IChNYXRoLmNvcyhhbmdsZSkgKyAxKSAvIDI7XG4gICAgICAgICAgICBjb25zdCBkcmF0aW8gPSBNYXRoLlBJICogTWF0aC5zaW4oYW5nbGUpIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKFxuICAgICAgICAgICAgICAgIHJhdGlvICogdGhpcy54MSArICgxIC0gcmF0aW8pICogdGhpcy54MixcbiAgICAgICAgICAgICAgICByYXRpbyAqIHRoaXMueTEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueTIsXG4gICAgICAgICAgICAgICAgZHJhdGlvICogKHRoaXMueDIgLSB0aGlzLngxKSxcbiAgICAgICAgICAgICAgICBkcmF0aW8gKiAodGhpcy55MiAtIHRoaXMueTEpXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8odGhpcy54MSwgdGhpcy55MSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgRWZmZWN0LFxuICAgIEVmZmVjdFNlcXVlbmNlLFxuICAgIExpbmVhck1vdmVtZW50LFxuICAgIFNpbmVNb3ZlbWVudCxcbn0iLCJjb25zdCBwbGF5ZXJzID0gW107XG5jb25zdCBzY2FsaW5nID0gMztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGxheWVycyxcbiAgICBzY2FsaW5nLFxufVxuIiwiY29uc3Qgc2hlZXRzID0ge307XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdG8gYmUgdXNlZCB3aGVuIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IG9mIHRoZSBzY2VuZVxuICovXG5jbGFzcyBUaWxlRGF0YSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHNoaWZ0WCA9IDAsIHNoaWZ0WSA9IDApIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LXBvc2l0aW9uIG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnggPSB0aGlzLmluZGV4ICUgODtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueSA9IHRoaXMuaW5kZXggPj4gMztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtb2Zmc2V0IHRvIGRyYXcgdGhlIHRpbGUgZnJvbSB0aGUgU2NlbmVFbGVtZW50J3MgcG9zaXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRYID0gc2hpZnRYO1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSBzaGlmdFk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvYWRTaGVldCh1cmwsIG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBzaGVldHNbbmFtZV0gPSBpbWFnZTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGltYWdlLnNyYyA9IHVybDtcbiAgICB9KTtcbn1cblxuXG5jb25zdCBsb2FkR3JhcGhpY3MgPSBQcm9taXNlLmFsbChbXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19yZWQucG5nJywgJ3JlZCcpLFxuICAgIGxvYWRTaGVldCgnaW1hZ2VzL2hlcm9fZ3JlZW4ucG5nJywgJ2dyZWVuJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19ibHVlLnBuZycsICdibHVlJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvdGlsZXNldC5wbmcnLCAndGlsZXMnKSxcbl0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFRpbGVEYXRhLFxuICAgIHNoZWV0cyxcbiAgICBsb2FkR3JhcGhpY3MsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgQVhFU19USFJFU0hPTEQgPSAuNDtcblxubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXZpb3VzbHlQcmVzc2VkS2V5cztcbmxldCBjdXJyZW50bHlQcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnMgPSBbXTtcbmxldCBjdXJyZW50bHlQcmVzc2VkQnV0dG9ucyA9IFtdO1xuXG5cbmZ1bmN0aW9uIG9uR2FtZXBhZENvbm5lY3RlZChnYW1lcGFkKSB7XG4gICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbZ2FtZXBhZC5pbmRleF0gPSBuZXcgU2V0KCk7XG59XG5cblxuZnVuY3Rpb24gb25HYW1lcGFkRGlzY29ubmVjdGVkKGdhbWVwYWQpIHtcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tnYW1lcGFkLmluZGV4XSA9IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiBpc1RhcHBlZEtleShrZXkpIHtcbiAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEtleXMuaGFzKGtleSkgJiYgIXByZXZpb3VzbHlQcmVzc2VkS2V5cy5oYXMoa2V5KTtcbn1cblxuXG5mdW5jdGlvbiBpc1ByZXNzZWRLZXkoa2V5KSB7XG4gICAgcmV0dXJuIGN1cnJlbnRseVByZXNzZWRLZXlzLmhhcyhrZXkpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFByZXNzZWRLZXlzKCkge1xuICAgIHJldHVybiBuZXcgU2V0KGN1cnJlbnRseVByZXNzZWRLZXlzKTtcbn1cblxuXG5mdW5jdGlvbiBnZXRUYXBwZWRLZXlzKCkge1xuICAgIGNvbnN0IHRhcHBlZEtleXMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgY3VycmVudGx5UHJlc3NlZEtleXMpIHtcbiAgICAgICAgaWYgKCFwcmV2aW91c2x5UHJlc3NlZEtleXMuaGFzKGtleSkpIHtcbiAgICAgICAgICAgIHRhcHBlZEtleXMuYWRkKGtleSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcHBlZEtleXM7XG59XG5cblxuZnVuY3Rpb24gZ2V0UHJlc3NlZEJ1dHRvbnMoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRseVByZXNzZWRCdXR0b25zLm1hcChzID0+IG5ldyBTZXQocykpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFRhcHBlZEJ1dHRvbnMoKSB7XG4gICAgY29uc3QgdGFwcGVkQnV0dG9ucyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgZm9yIChjb25zdCBidXR0b24gb2YgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0pIHtcbiAgICAgICAgICAgIGlmICghcHJldmlvdXNseVByZXNzZWRCdXR0b25zW2ldLmhhcyhidXR0b24pKSB7XG4gICAgICAgICAgICAgICAgcy5hZGQoYnV0dG9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0YXBwZWRCdXR0b25zLnB1c2gocyk7XG4gICAgfVxuICAgIHJldHVybiB0YXBwZWRCdXR0b25zO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZUlucHV0cygpIHtcbiAgICBwcmV2aW91c2x5UHJlc3NlZEtleXMgPSBjdXJyZW50bHlQcmVzc2VkS2V5cztcbiAgICBjdXJyZW50bHlQcmVzc2VkS2V5cyA9IG5ldyBTZXQocHJlc3NlZEtleXMpO1xuICAgIHByZXZpb3VzbHlQcmVzc2VkQnV0dG9ucyA9IGN1cnJlbnRseVByZXNzZWRCdXR0b25zO1xuICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zID0gW107XG4gICAgZm9yIChjb25zdCBnYW1lcGFkIG9mIG5hdmlnYXRvci5nZXRHYW1lcGFkcygpKSB7XG4gICAgICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICAgICAgICBjb25zdCBpID0gZ2FtZXBhZC5pbmRleDtcbiAgICAgICAgICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zW2ldID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2FtZXBhZC5idXR0b25zW2pdLnByZXNzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0uYWRkKGopO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1tpXS5oYXMoaikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmF4ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgYnV0dG9uSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmF4ZXNbal0gPiBBWEVTX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25JbmRleCA9IDIgKiBqICsgZ2FtZXBhZC5idXR0b25zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGdhbWVwYWQuYXhlc1tqXSA8IC1BWEVTX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25JbmRleCA9IDIgKiBqICsgZ2FtZXBhZC5idXR0b25zLmxlbmd0aCArIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChidXR0b25JbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tpXS5hZGQoYnV0dG9uSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1tpXS5oYXMoYnV0dG9uSW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhidXR0b25JbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgUGxheWVySW5wdXRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZG1hcCA9IHtcbiAgICAgICAgICAgIHVwOiAxMixcbiAgICAgICAgICAgIGRvd246IDEzLFxuICAgICAgICAgICAgbGVmdDogMTQsXG4gICAgICAgICAgICByaWdodDogMTUsXG4gICAgICAgICAgICBqdW1wOiAwLFxuICAgICAgICAgICAgZGFzaDogMSxcbiAgICAgICAgICAgIHBhdXNlOiA5LFxuICAgICAgICB9XG4gICAgICAgIHRoaXMua2V5bWFwID0ge1xuICAgICAgICAgICAgdXA6ICdBcnJvd1VwJyxcbiAgICAgICAgICAgIGRvd246ICdBcnJvd0Rvd24nLFxuICAgICAgICAgICAgbGVmdDogJ0Fycm93TGVmdCcsXG4gICAgICAgICAgICByaWdodDogJ0Fycm93UmlnaHQnLFxuICAgICAgICAgICAganVtcDogJ2cnLFxuICAgICAgICAgICAgZGFzaDogJ2YnLFxuICAgICAgICAgICAgcGF1c2U6ICdFc2NhcGUnLFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGltZXJzID0ge1xuICAgICAgICAgICAganVtcEJ1ZmZlcjogMCxcbiAgICAgICAgICAgIGRhc2hCdWZmZXI6IDAsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaXNQcmVzc2VkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwW2FjdGlvbl0pIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdICYmXG4gICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdLmhhcyh0aGlzLmdhbWVwYWRtYXBbYWN0aW9uXSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgaXNQcmV2aW91c2x5UHJlc3NlZChhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzbHlQcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbYWN0aW9uXSkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdICYmXG4gICAgICAgICAgICAgICAgcHJldmlvdXNseVByZXNzZWRCdXR0b25zW3RoaXMuZ2FtZXBhZEluZGV4XS5oYXModGhpcy5nYW1lcGFkbWFwW2FjdGlvbl0pXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIGlzVGFwcGVkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1ByZXNzZWQoYWN0aW9uKSAmJiAhdGhpcy5pc1ByZXZpb3VzbHlQcmVzc2VkKGFjdGlvbik7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueEF4aXMgPSAodGhpcy5pc1ByZXNzZWQoXCJsZWZ0XCIpID8gLTEgOiAwKSArICh0aGlzLmlzUHJlc3NlZChcInJpZ2h0XCIpID8gMSA6IDApO1xuICAgICAgICB0aGlzLnlBeGlzID0gKHRoaXMuaXNQcmVzc2VkKFwidXBcIikgPyAxIDogMCkgKyAodGhpcy5pc1ByZXNzZWQoXCJkb3duXCIpID8gLTEgOiAwKTtcbiAgICAgICAgaWYgKHRoaXMuaXNUYXBwZWQoXCJqdW1wXCIpKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID0gSlVNUF9CVUZGRVJfVElNRTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5pc1RhcHBlZChcImRhc2hcIikpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPSBEQVNIX0JVRkZFUl9USU1FO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcklucHV0cyxcbiAgICBvbkdhbWVwYWRDb25uZWN0ZWQsXG4gICAgb25HYW1lcGFkRGlzY29ubmVjdGVkLFxuICAgIHVwZGF0ZUlucHV0cyxcbiAgICBwcmVzc2VkS2V5cyxcbiAgICBpc1RhcHBlZEtleSxcbiAgICBpc1ByZXNzZWRLZXksXG4gICAgZ2V0UHJlc3NlZEtleXMsXG4gICAgZ2V0VGFwcGVkS2V5cyxcbiAgICBnZXRQcmVzc2VkQnV0dG9ucyxcbiAgICBnZXRUYXBwZWRCdXR0b25zLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgZ2xvYmFscyA9IHJlcXVpcmUoJy4vZ2xvYmFscycpO1xuY29uc3QgZ3JhcGhpY3MgPSByZXF1aXJlKCcuL2dyYXBoaWNzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgbWFwcyA9IHJlcXVpcmUoJy4vbWFwc18nKTtcbmNvbnN0IG1lbnUgPSByZXF1aXJlKCcuL21lbnUnKTtcbmNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5cbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgY29udGV4dDtcbmxldCBmcmFtZUNvdW50ZXIgPSAwO1xubGV0IGZyYW1lUmF0ZVJlZnJlc2ggPSA1O1xubGV0IGZyYW1lUmF0ZVN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cblxuZnVuY3Rpb24gc2V0U2NhbGluZyhzY2FsZSkge1xuICAgIGdsb2JhbHMuc2NhbGluZyA9IHNjYWxlO1xuICAgIGNvbnN0IHNjcmVlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lLXNjcmVlbicpO1xuICAgIHNjcmVlbi5zdHlsZS53aWR0aCA9IGAke2NvbnN0YW50cy5WSUVXX1dJRFRIICogc2NhbGV9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBzY2FsZX1weGA7XG5cbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNjcmVlbi1jYW52YXNcIik7XG4gICAgY2FudmFzLndpZHRoID0gc2NhbGUgKiBjb25zdGFudHMuVklFV19XSURUSDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gc2NhbGUgKiBjb25zdGFudHMuVklFV19IRUlHSFQ7XG4gICAgY29udGV4dC5zZXRUcmFuc2Zvcm0oc2NhbGUsIDAsIDAsIHNjYWxlLCAwLCAwKTtcbiAgICBjb250ZXh0LnNjYWxlKGdsb2JhbHMuc2NhbGluZywgZ2xvYmFscy5zY2FsaW5nKTtcbn1cblxuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgY29uc3QgdGltZU5vdyA9IERhdGUubm93KCk7XG5cbiAgICBmcmFtZUNvdW50ZXIgKz0gMTtcbiAgICBpZiAodGltZU5vdyAtIGZyYW1lUmF0ZVN0YXJ0VGltZSA+PSAxMDAwICogZnJhbWVSYXRlUmVmcmVzaCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgZnJhbWVSYXRlU3RhcnRUaW1lID0gdGltZU5vdztcbiAgICB9XG5cbiAgICBpbnB1dHMudXBkYXRlSW5wdXRzKCk7XG4gICAgZm9yIChjb25zdCBwbGF5ZXIgb2YgZ2xvYmFscy5wbGF5ZXJzKSB7XG4gICAgICAgIHBsYXllci51cGRhdGUoKTtcbiAgICB9XG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgY29uc3RhbnRzLlZJRVdfV0lEVEgsIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG5cbiAgICBpZiAobWVudS5tZW51U3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICBtZW51Lm1lbnVTdGFja1swXS51cGRhdGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjdXJyZW50U2NlbmUudXBkYXRlKDEgLyA2MCk7XG4gICAgICAgIC8vIFRyYW5zaXRpb24gZnJvbSBvbmUgcm9vbSB0byBhbm90aGVyXG4gICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgY29uc3QgcHJldlNjZW5lID0gY3VycmVudFNjZW5lO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lID0gY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnN0YW50cy5WSUVXX1dJRFRILCBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgIGN1cnJlbnRTY2VuZS5kcmF3KGNvbnRleHQpO1xuICAgIGlmIChtZW51Lm1lbnVTdGFja1swXSkge1xuICAgICAgICBtZW51Lm1lbnVTdGFja1swXS5kcmF3KGNvbnRleHQpO1xuICAgIH1cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGtleWJvYXJkIGV2ZW50c1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG5cbiAgICAvLyBwcmVwYXJlIGNhbnZhcyBhbmQgY29udGV4dFxuICAgIGNvbnN0IHNjcmVlbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdnYW1lLXNjcmVlbicpO1xuICAgIHNjcmVlbi5zdHlsZS53aWR0aCA9IGAke2NvbnN0YW50cy5WSUVXX1dJRFRIICogZ2xvYmFscy5zY2FsaW5nfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogZ2xvYmFscy5zY2FsaW5nfXB4YDtcblxuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2NyZWVuLWNhbnZhc1wiKTtcbiAgICBjYW52YXMud2lkdGggPSBnbG9iYWxzLnNjYWxpbmcgKiBjb25zdGFudHMuVklFV19XSURUSDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gZ2xvYmFscy5zY2FsaW5nICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb250ZXh0LnNjYWxlKGdsb2JhbHMuc2NhbGluZywgZ2xvYmFscy5zY2FsaW5nKTtcbiAgICBjb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgLy8gbG9hZCBhbGwgc2NlbmVzIGFuZCBzdGFydCBnYW1lXG4gICAgZ3JhcGhpY3MubG9hZEdyYXBoaWNzLnRoZW4oKCkgPT4ge1xuICAgICAgICBnbG9iYWxzLnBsYXllcnMucHVzaChuZXcgcGxheWVyLlBsYXllcignYmx1ZScpKTtcbiAgICAgICAgY3VycmVudFNjZW5lID0gbWFwcy5zY2VuZXMuY2VsZXN0ZTAxO1xuICAgICAgICBjdXJyZW50U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gMTtcbiAgICAgICAgY3VycmVudFNjZW5lLmFkZEFjdG9yKGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIpO1xuICAgICAgICBjdXJyZW50U2NlbmUucmVzZXQoKTtcbiAgICAgICAgdXBkYXRlKCk7XG4gICAgfSk7XG59O1xuXG5cbi8vIEdhbWVwYWQgQVBJXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMub25HYW1lcGFkQ29ubmVjdGVkKGV2ZW50LmdhbWVwYWQpO1xufSk7XG5cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkZGlzY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGRpc2Nvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLm9uR2FtZXBhZERpc2Nvbm5lY3RlZChldmVudC5nYW1lcGFkKTtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MSAqIFUsIC1VLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCBzY2VuZTIuaGVpZ2h0IC0gMyAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgyICogVSwgc2NlbmUyLmhlaWdodCwgd2lkdGggKiBVLCAwLCBzY2VuZTEsIHgxICogVSwgMiAqIFUsIGluZGV4MSkpO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB5MSwgaW5kZXgxLCBzY2VuZTIsIHkyLCBpbmRleDIsIGhlaWdodCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsIHNjZW5lMS53aWR0aCAtIFUsIHkxICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyaWdnZXJCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgc3BlZWQgPSAyMCwgZGVsYXkgPSAuMjUpIHtcbiAgICBjb25zdCBkaXN0YW5jZSA9IE1hdGguc3FydCgoeDIgLSB4MSkgKiAoeDIgLSB4MSkgKyAoeTIgLSB5MSkgKiAoeTIgLSB5MSkpO1xuICAgIGNvbnN0IGR1cmF0aW9uMSA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gICAgY29uc3QgZHVyYXRpb24yID0gZGlzdGFuY2UgLyA3O1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgZHVyYXRpb24xKSxcbiAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDIgKiBVLCB5MiAqIFUsIHgxICogVSwgeTEgKiBVLCBkdXJhdGlvbjIpLFxuICAgIF0pKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZhbGxpbmdCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgZGVsYXkgPSAuNSkge1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5GYWxsaW5nQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgKHkyIC0geTEpIC8gMjUpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxLCAtMSksXG4gICAgXSkpO1xufVxuXG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAxLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEyLCAxOCwgMTgsIDEzLCAxOCwgMTMsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAyNiwgMjcsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE1LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDI2LCAyNiwgMjYsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjYsIDI2LCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDUsIDUsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6OCxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwMSA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAyLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMiwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgNSwgNSwgNSwgMjYsIDI2LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNiwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNCwgMjEsIDEwLCA2LCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0NywgNDgsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDMgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMzIsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCA0NCwgMTUsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE0LCAxMCwgMjMsIDksIDMsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDExLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMiwgMywgMTcsIDE5LCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA1ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTEsIDQ4LCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAyMywgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMjAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDI2LCAyNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDE4LCAxOCwgMTMsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxOSwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIsIDMsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDIwLCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzgsIDQwLCAxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA2ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTMsIDMzLCAxMywgMjMsIDQsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDIsIDMsIDQ2LCA0OCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNiwgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOCwgMTMsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDE3LCAxOCwgMjcsIDM4LCAzOSwgNDAsIDQsIDUsIDUsIDM1LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCA0LCAyLCAyLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzUsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMSwgMiwgMiwgMiwgMywgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjUsIDI2LCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQ0LCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQsIDYsIDAsIDAsIDQ0LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA4ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTQsIDE2LCAyMSwgMTIsIDIsIDMpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE4LCAxOCwgMzQsIDM1LCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDIyLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyNiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgMjEsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCAxLCAyLCAyMSwgMTEsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDM5LCAzOSwgNDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA5ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTEwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTIsIDE4LCAzNCwgMzQsIDM0LCAyMSwgMiwgMywgMCwgMCwgMCwgMTUsIDAsIDAsIDEsIDUsIDUsIDUsIDE4LCAzNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMzQsIDM0LCAzNCwgMTgsIDI2LCAyNiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDIwLCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNSwgMjYsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDIsIDIsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTExID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE0LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDEsIDIsIDIsIDIsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAzNSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMjMsIDAsIDAsIDE3LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMiwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAzNCwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDM0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgMywgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCA2LCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgNSwgMzQsIDM0LCAzNCwgMTgsIDExLCAwLCAxNSwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNywgMjYsIDI2LCAyNiwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgNiwgNDYsIDQ4LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0OCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDhcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCA1LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCAyLCAyLCAyLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAzOCwgMzksIDM5LCA0MCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQ5LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0OVxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxMyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMjAsIDUsIDYsIDM4LCA0MCwgNCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCA2LCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAxLCAyNiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMSwgMjEsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMzQsIDIxLCAzNCwgNiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDM0LCAxOCwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA4LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMjMsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMzMsIDM1LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMiwgMiwgMywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE0ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTEsIDI5LCAxOSwgMjksIDQsIDIpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjYsIDI4LCAyNiwgMjIsIDUsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA0LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyLCAyLCA2LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDIsIDMsIDQ3LCA0OCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNDEsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTUgPSBzO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjQsIDYsIDI0LCAxNywgMiwgNik7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDUgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcblxuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNSwgMjAsIDksIDIwLCAyLCA0KSk7XG5cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDM0LCAzNCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMzQsIDUsIDUsIDUsIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgNDYsIDQ3LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCAyLCAyLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjk2LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo5NlxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxNiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIsIDIsIDI3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMiwgMiwgMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTcgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjQsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDEsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE4ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozOCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxLCAyLCAyLCAyLCAzLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxOSA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDIwLCAxNSwgMjAsIDcsIDIsIDQpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VGYWxsaW5nQmxvY2soMjgsIDksIDI4LCAzNSwgMywgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjcsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgNiwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDMyLCAwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgOSwgMjAsIDIsIDIsIDIsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDExLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAxOCwgMTgsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAxNywgMTAsIDEwLCAyMCwgNSwgMjYsIDI2LCAyNywgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDI3LCA1OCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0NiwgNDcsIDQ4LCAzMywgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDMsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgNCwgNiwgMCwgMCwgMCwgNDEsIDQxLCA0LCA2LCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCA0LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDExLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDksIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDExLCA0MSwgNDEsIDksIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgOSwgMTEsIDUzLCA1NCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIxLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCA5LCAyMCwgNSwgNiwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIxID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDE0LCA3LCAxNCwgMTUsIDIsIDcsIC43NSk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxNCAqIFUsIDYgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTUgKiBVLCA2ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIGZhbGxpbmdCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgZmFsbGluZ0Jsb2NrLmF0dGFjaChzcGlrZXMyKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgNDMsIDQzLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMzgsIDM5LCA0MCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDEsIDUsIDUsIDUsIDUsIDUsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAyMCwgMiwgMywgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIyID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMzMsIDE1LCAzMywgOSwgMywgMykpO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjUsIDYsIDEzLCA2LCAyLCAzKTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI2ICogVSwgNSAqIFUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczEpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDE3LCAxOCwgMTgsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQzLCA0MywgNDMsIDAsIDQzLCA0MywgNDMsIDE1LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQ2XG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIzID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjIsIDE4LCAyMiwgOSwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOSwgMTksIDI5LCAxMCwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygzNiwgMTcsIDM2LCA4LCAyLCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgNDMsIDQzLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDE0LCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxOCwgMTgsIDEzLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDQyLCAwLCAwLCA0NCwgMjMsIDAsIDAsIDksIDEwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjQgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNywgMTgsIDE3LCAxMiwgNCwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOCwgMTksIDI4LCAxMiwgNiwgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMzgsIDM5LCA0MCwgMSwgMiwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI1ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sxID0gbWFrZUZhbGxpbmdCbG9jaygxOSwgMTYsIDE5LCAyNSwgNCwgMyk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2sxKTtcbiAgICBjb25zdCBzcGlrZXMxID0gW1xuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCgyMyAqIFUsIDE3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KDIzICogVSwgMTggKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigxOSAqIFUsIDE5ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oMjAgKiBVLCAxOSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIxICogVSwgMTkgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigyMiAqIFUsIDE5ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMS5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG5cbiAgICBjb25zdCBmYWxsaW5nQmxvY2syID0gbWFrZUZhbGxpbmdCbG9jaygyMywgNiwgMjMsIDI1LCAyLCA0KTtcbiAgICBzLmFkZFNvbGlkKGZhbGxpbmdCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA4ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTgsIDE5LCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCAzOSwgNDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgOSwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyNiA9IHM7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg5LCA5LCAyNiwgOSwgMywgNSwgMzUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDkgKiBVLCA4ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDEwICogVSwgOCAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMSAqIFUsIDggKiBVKSxcbiAgICBdXG4gICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMzIsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMSwgMCwgMzMsIDM0LCAzNSwgNTgsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDQ2LCA0OCwgMjUsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMTQsIDAsIDQ0LCA5LCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAxNSwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMjAsIDUsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDM1LCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgNDgsIDAsIDQ0LCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMiwgMiwgMiwgMiwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI3ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDIsIDksIDEwLCA5LCAzLCA0LCAzNSk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDMgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMyA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDQgKiBVLCA4ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczMpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczMpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgNSwgNSwgMiwgMiwgMiwgNSwgNiwgMzgsIDM5LCAzOSwgNDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAzLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyOCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE2LCAyNSwgMTYsIDE5LCA2LCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAzOCwgMzksIDM5LCA0MCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzUsIDQ2LCA0NywgNDcsIDQ4LCAzMywgMzUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjkgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzAgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMSwgMywgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzEgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jayg0LCAyMCwgMTIsIDIwLCA0LCAyLCAzMCkpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDQxLCA0MSwgNCwgNiwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0LCA1LCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCA0MCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyNiwgMjYsIDI2LCAyNiwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDQsIDUsIDUsIDYsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAzLCA0NiwgNDcsIDQ4LCAxLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NTFcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzMgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxLCAyMiwgOCwgMjIsIDMsIDMsIDMwKSk7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg0OCwgMTUsIDQ4LCA3LCAyLCA0KTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoNDggKiBVLCAxNCAqIFUpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0OSAqIFUsIDE0ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMiwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOCwgNDEsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCAxLCAyMSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjUyXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM0ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA4LCAyMywgMjMsIDMsIDQpO1xuICAgIHMuYWRkU29saWQoZmFsbGluZ0Jsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIzICogVSwgNyAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDcgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA3ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICBmYWxsaW5nQmxvY2suYXR0YWNoKHNwaWtlKTtcbiAgICAgICAgcy5hZGRUaGluZyhzcGlrZSk7XG4gICAgfVxuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxMSwgMTYsIDExLCAyNSwgMiwgMykpO1xuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxNCwgMywgMTQsIDIyLCAzLCA1KSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzUgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDcsIDQ2LCA0NywgNDcsIDQ4LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDQsIDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIsIDIsIDIsIDIsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjo0MyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM2ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sxID0gbWFrZVRyaWdnZXJCbG9jaygyLCAyNiwgOSwgMjYsIDIsIDMsIDMwKTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazEpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCAyNSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzICogVSwgMjUgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMSkge1xuICAgICAgICB0cmlnZ2VyQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cblxuICAgIGNvbnN0IHRyaWdnZXJCbG9jazIgPSBtYWtlVHJpZ2dlckJsb2NrKDM1LCAyMywgMzUsIDE1LCAzLCA0KTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDM1ICogVSwgMjIgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMzYgKiBVLCAyMiAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzNyAqIFUsIDIyICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDUsIDEwLCAyMCwgNSwgNSwgMiwgMywgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzNyA9IHM7XG59XG5cbi8vIHtcbi8vICAgICB7e2xvdWlzMDF9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwMn19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczAzfX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDR9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwNX19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczA2fX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDd9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwOH19XG4vLyB9XG5cblxuLy8gVHJhbnNpdGlvbnNcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwMSwgMzEsIDAsIHNjZW5lcy5jZWxlc3RlMDIsIDEsIDEsIDUpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTAyLCAzNCwgMCwgc2NlbmVzLmNlbGVzdGUwMywgMiwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMDMsIDMzLCAwLCBzY2VuZXMuY2VsZXN0ZTA0LCAzLCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNCwgMjEsIDAsIHNjZW5lcy5jZWxlc3RlMDUsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTA1LCAyMiwgMCwgc2NlbmVzLmNlbGVzdGUwNiwgMywgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDcsIDI5LCAwLCBzY2VuZXMuY2VsZXN0ZTA2LCAzMCwgMSwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDYsIDMwLCAyLCBzY2VuZXMuY2VsZXN0ZTA4LCA1LCAwLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNiwgMzUsIDAsIHNjZW5lcy5jZWxlc3RlMDksIDEsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTEwLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTA5LCA3LCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMSwgOCwgMSwgc2NlbmVzLmNlbGVzdGUxMCwgOCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMTAsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMTIsIDQyLCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUxMSwgMywgMCwgc2NlbmVzLmNlbGVzdGUxMiwgMywgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDksIDAsIDAsIHNjZW5lcy5jZWxlc3RlMTMsIDAsIDAsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMywgLjUsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDIyLjUsIDIsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxNSwgMjIsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDQsIDAsIDUpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE2LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxNSwgMiwgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTQsIDEsIDEsIHNjZW5lcy5jZWxlc3RlMTcsIDEwLCAyLCA5KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxOCwgMTcsIDAsIHNjZW5lcy5jZWxlc3RlMTcsIDIsIDAsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE4LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxOSwgMTMsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE5LCAyLCAwLCBzY2VuZXMuY2VsZXN0ZTIwLCAyLCAwLCAyKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyMCwgMTIsIDEsIHNjZW5lcy5jZWxlc3RlMjEsIDgsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIxLCAyNiwgMSwgc2NlbmVzLmNlbGVzdGUyMiwgMjYsIDAsIDEpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIzLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyNywgMywgNyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjEsIDIsIDAsIHNjZW5lcy5jZWxlc3RlMjQsIDgsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE3LCAzMywgMSwgc2NlbmVzLmNlbGVzdGUyNSwgNywgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjUsIDIyLCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyLCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyNCwgMzIsIDAsIHNjZW5lcy5jZWxlc3RlMjYsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTI2LCAzLCAwLCBzY2VuZXMuY2VsZXN0ZTI3LCAxNiwgMywgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjcsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDI4LCAyLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyOSwgMTMsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDE4LCAxLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzMCwgNiwgMCwgc2NlbmVzLmNlbGVzdGUyOSwgNiwgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjcsIDYsIDIsIHNjZW5lcy5jZWxlc3RlMzEsIDYsIDAsIDIpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI3LCAzMSwgMCwgc2NlbmVzLmNlbGVzdGUzMiwgMTcsIDEsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI4LCA1LCAwLCBzY2VuZXMuY2VsZXN0ZTMzLCA1LCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyOCwgMjgsIDIsIHNjZW5lcy5jZWxlc3RlMzMsIDI4LCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzMiwgNCwgMCwgc2NlbmVzLmNlbGVzdGUzMywgNDQsIDMsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTMzLCAxMCwgMCwgc2NlbmVzLmNlbGVzdGUzNCwgMywgMiwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMzUsIDEzLCAwLCBzY2VuZXMuY2VsZXN0ZTM0LCAzLCAwLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzNCwgMTUsIDEsIHNjZW5lcy5jZWxlc3RlMzYsIDI5LCAxLCA5KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzNiwgOCwgMCwgc2NlbmVzLmNlbGVzdGUzNywgNiwgMCwgMyk7XG5cbi8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmxvdWlzMDEsIDM1LCAwLCBzY2VuZXMubG91aXMwMiwgNCwgMSwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczAzLCAzLCAwLCBzY2VuZXMubG91aXMwMiwgMTMsIDAsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwMywgMzAsIDEsIHNjZW5lcy5sb3VpczAyLCAyMywgMiwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczA0LCA0LCAwLCBzY2VuZXMubG91aXMwMiwgMzUsIDMsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwNSwgMzMsIDAsIHNjZW5lcy5sb3VpczA2LCAxLCAxLCA1KTtcbi8vIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmxvdWlzMDYsIDgsIDAsIHNjZW5lcy5sb3VpczA3LCA4LCAxLCA2KTtcbi8vIHNjZW5lcy5sb3VpczA2LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMTEuNSAqIFUsIDE1ICogVSwgMCwgMyAqIFUsIHNjZW5lcy5sb3VpczA4LCBVLCAxMyAqIFUsIDApKTtcbi8vIHNjZW5lcy5sb3VpczA4LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgMTMgKiBVLCAwLCAzICogVSwgc2NlbmVzLmxvdWlzMDYsIDEwICogVSwgMTUgKiBVLCAxKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbn1cbiIsImNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IE1FTlVfRk9OVF9TSVpFID0gMTI7XG5jb25zdCBNRU5VX1BBRERJTkcgPSA1O1xuY29uc3QgbWVudVN0YWNrID0gW107XG5cblxuY2xhc3MgTWVudUxpbmUge1xuICAgIGNvbnN0cnVjdG9yKHRleHQpIHtcbiAgICAgICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCwgeSwgdGV4dENvbG9yID0gXCIjMDAwMDAwXCIsIGJnQ29sb3IgPSBcIiNmZmZmZmZjY1wiKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb25zdCB0ZXh0TWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dCh0aGlzLnRleHQpO1xuICAgICAgICBjdHguZmlsbFJlY3QoXG4gICAgICAgICAgICBjb25zdGFudHMuVklFV19XSURUSCAvIDIgLSB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveExlZnQgLSBNRU5VX1BBRERJTkcsXG4gICAgICAgICAgICB5IC0gdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgLSBNRU5VX1BBRERJTkcsXG4gICAgICAgICAgICB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveFJpZ2h0ICsgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hMZWZ0ICsgMiAqIE1FTlVfUEFERElORyxcbiAgICAgICAgICAgIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94QXNjZW50ICsgMiAqIE1FTlVfUEFERElORyk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0ZXh0Q29sb3I7XG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLnRleHQsIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiwgeSk7XG4gICAgfVxufVxuXG5cbmNsYXNzIE1lbnVPcHRpb24gZXh0ZW5kcyBNZW51TGluZSB7XG4gICAgY29uc3RydWN0b3IodGV4dCkge1xuICAgICAgICBzdXBlcih0ZXh0KTtcbiAgICAgICAgdGhpcy5pc1NlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMub25BY3RpdmF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5vblJpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uTGVmdCA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCwgeSkge1xuICAgICAgICBpZiAodGhpcy5pc1NlbGVjdGVkKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCwgeSwgJyNmZmZmZmYnLCAnIzAwMDAwMGNjJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCwgeSwgJyMwMDAwMDAnLCAnI2ZmZmZmZmNjJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRPbkFjdGl2YXRlKGYpIHtcbiAgICAgICAgdGhpcy5vbkFjdGl2YXRlID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0T25SaWdodChmKSB7XG4gICAgICAgIHRoaXMub25SaWdodCA9IGY7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldE9uTGVmdChmKSB7XG4gICAgICAgIHRoaXMub25MZWZ0ID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKHRpdGxlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICAgICAgdGhpcy50aXRsZSA9IG5ldyBNZW51TGluZSh0aXRsZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saW5lcyA9IFtdO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC5mb250ID0gYG5vcm1hbCAke01FTlVfRk9OVF9TSVpFfXB4IGdhbWVib3lgO1xuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcbiAgICAgICAgY29uc3QgbGluZUhlaWdodCA9IGN0eC5tZWFzdXJlVGV4dCgnTScpLmFjdHVhbEJvdW5kaW5nQm94QXNjZW50ICsgMi41ICogTUVOVV9QQURESU5HO1xuXG4gICAgICAgIGxldCB5T2Zmc2V0O1xuICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgeU9mZnNldCA9IGNvbnN0YW50cy5WSUVXX0hFSUdIVCAvIDIgLSB0aGlzLmxpbmVzLmxlbmd0aCAqIGxpbmVIZWlnaHQgLyAyO1xuICAgICAgICAgICAgdGhpcy50aXRsZS5kcmF3KGN0eCwgeU9mZnNldCk7XG4gICAgICAgICAgICB5T2Zmc2V0ICs9IDEuNSAqIGxpbmVIZWlnaHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB5T2Zmc2V0ID0gY29uc3RhbnRzLlZJRVdfSEVJR0hUIC8gMiAtICh0aGlzLmxpbmVzLmxlbmd0aCAtIDEpICogbGluZUhlaWdodCAvIDI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgdGhpcy5saW5lcykge1xuICAgICAgICAgICAgbGluZS5kcmF3KGN0eCwgeU9mZnNldCk7XG4gICAgICAgICAgICB5T2Zmc2V0ICs9IGxpbmVIZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG59XG5cblxuY2xhc3MgTGluZVNlbGVjdE1lbnUgZXh0ZW5kcyBNZW51IHtcbiAgICBjb25zdHJ1Y3Rvcih0aXRsZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih0aXRsZSk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWQgPSAwO1xuICAgICAgICB0aGlzLmNhblF1aXQgPSB0cnVlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5saW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5saW5lc1tpXS5pc1NlbGVjdGVkID0gKGkgPT09IHRoaXMuc2VsZWN0ZWQpO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIC8vIGRlZmF1bHQgbWVudSBjb250cm9sc1xuICAgICAgICBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiRXNjYXBlXCIpICYmIHRoaXMuY2FuUXVpdCkge1xuICAgICAgICAgICAgbWVudVN0YWNrLnNoaWZ0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiQXJyb3dEb3duXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA8IHRoaXMubGluZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJBcnJvd1VwXCIpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkIC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiQXJyb3dSaWdodFwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uUmlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25SaWdodCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0cy5pc1RhcHBlZEtleShcIkFycm93TGVmdFwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uTGVmdCkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vbkxlZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJFbnRlclwiKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSgpO1xuICAgICAgICAgICAgLy8gcGxheWVyLXNwZWNpZmljIG1lbnUgY29udHJvbHNcbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwicGF1c2VcIikpICYmIHRoaXMuY2FuUXVpdCkge1xuICAgICAgICAgICAgd2hpbGUgKG1lbnVTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBtZW51U3RhY2suc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwiZGFzaFwiKSkgJiYgdGhpcy5jYW5RdWl0KSB7XG4gICAgICAgICAgICBtZW51U3RhY2suc2hpZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwiZG93blwiKSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkIDwgdGhpcy5saW5lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJ1cFwiKSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwicmlnaHRcIikpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25SaWdodCkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vblJpZ2h0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcImxlZnRcIikpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25MZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uTGVmdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJqdW1wXCIpKSAmJiB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIENvbnRyb2xzTWVudSBleHRlbmRzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmFjdGlvbnMgPSBbXCJ1cFwiLCBcImRvd25cIiwgXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJqdW1wXCIsIFwiZGFzaFwiLCBcInBhdXNlXCJdO1xuICAgICAgICB0aGlzLmxpbmVzID0gW1xuICAgICAgICAgICAgbmV3IE1lbnVMaW5lKCdQcmVzcyBLZXkvQnV0dG9uIGZvcicpLFxuICAgICAgICAgICAgbmV3IE1lbnVMaW5lKCksXG4gICAgICAgIF07XG4gICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgoMCk7XG4gICAgfVxuXG4gICAgc2V0QWN0aW9uSW5kZXgoaW5kZXgpIHtcbiAgICAgICAgdGhpcy5hY3Rpb25JbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLmxpbmVzWzFdLnRleHQgPSB0aGlzLmFjdGlvbnNbdGhpcy5hY3Rpb25JbmRleF0udG9VcHBlckNhc2UoKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKSB7XG4gICAgICAgIGNvbnN0IHRhcHBlZEtleXMgPSBpbnB1dHMuZ2V0VGFwcGVkS2V5cygpO1xuICAgICAgICBpZiAodGFwcGVkS2V5cy5zaXplID4gMCkge1xuICAgICAgICAgICAgZ2xvYmFscy5wbGF5ZXJzWzBdLmlucHV0cy5rZXltYXBbdGhpcy5hY3Rpb25zW3RoaXMuYWN0aW9uSW5kZXhdXSA9IHRhcHBlZEtleXMudmFsdWVzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uSW5kZXggPj0gdGhpcy5hY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjdGlvbkluZGV4KDApO1xuICAgICAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFjdGlvbkluZGV4KHRoaXMuYWN0aW9uSW5kZXggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0YXBwZWRCdXR0b25zID0gaW5wdXRzLmdldFRhcHBlZEJ1dHRvbnMoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXBwZWRCdXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGFwcGVkQnV0dG9uc1tpXS5zaXplID4gMCkge1xuICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5pbnB1dHMuZ2FtZXBhZEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uaW5wdXRzLmdhbWVwYWRtYXBbdGhpcy5hY3Rpb25zW3RoaXMuYWN0aW9uSW5kZXhdXSA9IHRhcHBlZEJ1dHRvbnNbaV0udmFsdWVzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkluZGV4ID49IHRoaXMuYWN0aW9ucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgoMCk7XG4gICAgICAgICAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgodGhpcy5hY3Rpb25JbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vLyBDb250cm9scyBtYXBwaW5nIG1lbnVcbmNvbnN0IGNvbnRyb2xzTWVudSA9IG5ldyBDb250cm9sc01lbnUoKTtcbi8vIEdlbmVyYWwgb3B0aW9ucyBtZW51XG5jb25zdCBvcHRpb25zTWVudSA9IG5ldyBMaW5lU2VsZWN0TWVudShcIk9wdGlvbnNcIik7XG5vcHRpb25zTWVudS5saW5lcy5wdXNoKFxuICAgIG5ldyBNZW51T3B0aW9uKFwiU0ZYIFZvbHVtZTogbGxsbGwgXCIpXG4gICAgICAgIC5zZXRPblJpZ2h0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNvdW5kLmluY3JlbWVudFNvdW5kVm9sdW1lKCk7XG4gICAgICAgICAgICB0aGlzLnRleHQgPSBcIlNGWCBWb2x1bWU6IFwiXG4gICAgICAgICAgICAgICAgKyBcImxcIi5yZXBlYXQoc291bmQuZ2V0U291bmRWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiLlwiLnJlcGVhdCg1IC0gc291bmQuZ2V0U291bmRWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiIFwiO1xuICAgICAgICB9KVxuICAgICAgICAuc2V0T25MZWZ0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNvdW5kLmRlY3JlbWVudFNvdW5kVm9sdW1lKCk7XG4gICAgICAgICAgICB0aGlzLnRleHQgPSBcIlNGWCBWb2x1bWU6IFwiXG4gICAgICAgICAgICAgICAgKyBcImxcIi5yZXBlYXQoc291bmQuZ2V0U291bmRWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiLlwiLnJlcGVhdCg1IC0gc291bmQuZ2V0U291bmRWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiIFwiO1xuICAgICAgICB9KSk7XG5vcHRpb25zTWVudS5saW5lcy5wdXNoKFxuICAgIG5ldyBNZW51T3B0aW9uKFwiTXVzaWMgVm9sdW1lOiBsbGxsbCBcIilcbiAgICAgICAgLnNldE9uUmlnaHQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc291bmQuaW5jcmVtZW50TXVzaWNWb2x1bWUoKTtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiTXVzaWMgVm9sdW1lOiBcIlxuICAgICAgICAgICAgICAgICsgXCJsXCIucmVwZWF0KHNvdW5kLmdldE11c2ljVm9sdW1lKCkpXG4gICAgICAgICAgICAgICAgKyBcIi5cIi5yZXBlYXQoNSAtIHNvdW5kLmdldE11c2ljVm9sdW1lKCkpXG4gICAgICAgICAgICAgICAgKyBcIiBcIjtcbiAgICAgICAgfSlcbiAgICAgICAgLnNldE9uTGVmdChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzb3VuZC5kZWNyZW1lbnRNdXNpY1ZvbHVtZSgpO1xuICAgICAgICAgICAgdGhpcy50ZXh0ID0gXCJNdXNpYyBWb2x1bWU6IFwiXG4gICAgICAgICAgICAgICAgKyBcImxcIi5yZXBlYXQoc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiLlwiLnJlcGVhdCg1IC0gc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiIFwiO1xuICAgICAgICB9KSk7XG4vLyBvcHRpb25zTWVudS5saW5lcy5wdXNoKFxuLy8gICAgIG5ldyBNZW51T3B0aW9uKFwiU2NhbGU6IHgyXCIpXG4vLyAgICAgICAgIC5zZXRPblJpZ2h0KGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgICAgIGlmIChnbG9iYWxzLnNjYWxpbmcgPCA0KSB7XG4vLyAgICAgICAgICAgICAgICAgZ2xvYmFscy5zY2FsaW5nICs9IDE7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgIH0pXG4vLyApXG4vLyBNYWluIHBhdXNlIG1lbnVcbmNvbnN0IG1haW5NZW51ID0gbmV3IExpbmVTZWxlY3RNZW51KFwiUGF1c2VkXCIpO1xubWFpbk1lbnUubGluZXMucHVzaChuZXcgTWVudU9wdGlvbihcIlJlc3VtZVwiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZyhcInJlc3VtZVwiKTtcbiAgICBtZW51U3RhY2suc2hpZnQoKVxufSkpO1xubWFpbk1lbnUubGluZXMucHVzaChuZXcgTWVudU9wdGlvbihcIk9wdGlvbnNcIikuc2V0T25BY3RpdmF0ZShmdW5jdGlvbiAoKSB7XG4gICAgbWVudVN0YWNrLnVuc2hpZnQob3B0aW9uc01lbnUpO1xufSkpO1xubWFpbk1lbnUubGluZXMucHVzaChuZXcgTWVudU9wdGlvbihcIkNvbnRyb2xzXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIG1lbnVTdGFjay51bnNoaWZ0KGNvbnRyb2xzTWVudSk7XG59KSk7XG4vLyBtYWluTWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiUmVzdGFydFwiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbi8vICAgICBjb25zb2xlLmxvZyhcInJlc3RhcnQuLi5cIik7XG4vLyB9KSk7XG4vLyBJbml0aWFsIG1lbnVcbmNvbnN0IHN0YXJ0TWVudSA9IG5ldyBMaW5lU2VsZWN0TWVudShcIlNxdWFyZWp1bXBcIik7XG5zdGFydE1lbnUuY2FuUXVpdCA9IGZhbHNlO1xuc3RhcnRNZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJTdGFydFwiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBzb3VuZC5iZ011c2ljLnBsYXkoKTtcbiAgICBtZW51U3RhY2suc2hpZnQoKTtcbn0pKTtcbnN0YXJ0TWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiT3B0aW9uc1wiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBtZW51U3RhY2sudW5zaGlmdChvcHRpb25zTWVudSk7XG59KSk7XG5zdGFydE1lbnUubGluZXMucHVzaChuZXcgTWVudU9wdGlvbihcIkNvbnRyb2xzXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIG1lbnVTdGFjay51bnNoaWZ0KGNvbnRyb2xzTWVudSk7XG59KSk7XG5cblxubWVudVN0YWNrLnVuc2hpZnQoc3RhcnRNZW51KTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG1lbnVTdGFjayxcbiAgICBtYWluTWVudSxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBncmFwaGljcyA9IHJlcXVpcmUoJy4vZ3JhcGhpY3MnKTtcbmNvbnN0IHNvdW5kID0gcmVxdWlyZSgnLi9zb3VuZCcpO1xuXG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcbmNvbnN0IEFOSU1BVElPTl9TTE9XRE9XTiA9IDY7XG5jb25zdCBQTEFZRVJfQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBQTEFZRVJfQU5JTUFUSU9OX1JVTiA9IFsxLCA2XTtcbmNvbnN0IFBMQVlFUl9BTklNQVRJT05fSlVNUCA9IFs2LCAzXTtcbmNvbnN0IFBMQVlFUl9BTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IFBMQVlFUl9BTklNQVRJT05fRElFID0gWzAsIDhdO1xuXG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0d28gc2VnbWVudHMgb24gYSAxRCBsaW5lIG92ZXJsYXAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFNjZW5lRWxlbWVudHMgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgYXBwZWFyIGluIGEgc2NlbmUgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZGVjb3JhdGlvbnMsIGV0Yy4pXG4gKlxuICogQWxsIEVsZW1lbnRzIGFyZSByZXByZXNlbnRlZCBhcyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgYW5kIHRoZSBzcGFjZSB0aGV5IG9jY3VweSBpbiBhIHNjZW5lIGlzIHRoZXJlZm9yZSBkZWZpbmVkXG4gKiBhcyBhIHBvc2l0aW9uICh4LCB5KSBhbmQgYSBzaXplICh3aWR0aCwgaGVpZ2h0KS4gQXQgYWxsIHRpbWVzLCBwb3NpdGlvbnMgYW5kIHNpemVzIHNob3VsZCBiZSBpbnRlZ2Vycy4gU3ViLWludGVnZXJcbiAqIHBvc2l0aW9ucyBhcmUgY29uc2lkZXJlZCB3aXRoIHRoZSB1c2Ugb2YgdGhlIGB4UmVtYWluZGVyYCBhbmQgYHlSZW1haW5kZXJgIGF0dHJpYnV0ZXMgKHRoYXQgc2hvdWxkIGhhdmUgYW4gYWJzb2x1dGVcbiAqIHZhbHVlIDwgMSlcbiAqL1xuY2xhc3MgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIG9mIHRoZSBsZWZ0bW9zdCBzaWRlIG9mIHRoZSBib3VuZGluZyBib3ggKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGluaXRpYWwgeC1jb29yZGluYXRlICh1c2VkIGZvciByZXNldCgpKVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydFggPSB4O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB5LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WSA9IHk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgYnkgd2hpY2ggdGhlIGVsZW1lbnQgaXMgc2hpZnRlZCBhbG9uZyB0aGUgeC1heGlzIHdoZW4gZHJhd24gKGRvZXNuJ3QgYWZmZWN0IGFjdHVhbCBwaHlzaWNzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFggPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQW1vdW50IGJ5IHdoaWNoIHRoZSBlbGVtZW50IGlzIHNoaWZ0ZWQgYWxvbmcgdGhlIHktYXhpcyB3aGVuIGRyYXduIChkb2Vzbid0IGFmZmVjdCBhY3R1YWwgcGh5c2ljcylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHdpZHRoIG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGhlaWdodCBvZiB0aGUgU2NlbmVFbGVtZW50IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGZyYWN0aW9uYWwgcGFydCBvZiB0aGUgeC1wb3NpdGlvbiBvZiB0aGUgU2NlbmVFbGVtZW50IChwb3NpdGlvbiBvZiBhbiBlbGVtZW50IHNob3VsZCBhbHdheXMgYmUgYW4gaW50ZWdlcixcbiAgICAgICAgICogYnV0IGZyYWN0aW9uYWwgcGFydHMgb2YgdGhlIGNvbXB1dGVkIHBvc2l0aW9uIGNhbiBiZSByZW1lbWJlcmVkIGZvciBuZXh0IG1vdmUpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB5LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgbW92ZWQgb24gdGhlIHgtYXhpcyBzaW5jZSBsYXN0IHVwZGF0ZVxuICAgICAgICAgKiAocmVzZXQgYnkgYmVmb3JlVXBkYXRlKCksIGluY3JlbWVudGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhpcy5tb3ZlKCkpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vdmVkWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbW91bnQgbW92ZWQgb24gdGhlIHktYXhpcyBzaW5jZSBsYXN0IHVwZGF0ZVxuICAgICAgICAgKiAocmVzZXQgYnkgYmVmb3JlVXBkYXRlKCksIGluY3JlbWVudGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhpcy5tb3ZlKCkpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBTY2VuZUVsZW1lbnQgc2hvdWxkIGJlIGNvbnNpZGVyZWQgYnkgdGhlIEVuZ2luZSBvciBub3QgKGluYWN0aXZlIFNjZW5lRWxlbWVudHMgYXJlIGlnbm9yZWQgd2hlblxuICAgICAgICAgKiBpbnRlcmFjdGlvbnMgYXJlIGNvbXB1dGVkKVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdXNlZCB0byByZXByZXNlbnQgdGhlIFNjZW5lRWxlbWVudCAoaWYgcmVwcmVzZW50ZWQgYnkgYSBzaW5nbGUgdGlsZSlcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGlsZXMgPSB0aWxlcztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEN1cnJlbnQgZWZmZWN0cyBhcHBsaWVkIHRvIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgICAgICogQHR5cGUge1tFZmZlY3RdfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lZmZlY3RzID0gW107XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTY2VuZSBpbiB3aGljaCB0aGUgU2NlbmVFbGVtZW50IGlzIGluY2x1ZGVkXG4gICAgICAgICAqIEB0eXBlIHt1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgICAgICAvKipcbiAgICAgICAgICogRGljdGlvbmFyeSBvZiB0aW1lcnMgKG51bWJlcnMpIHRoYXQgYXJlIGF1dG9tYXRpY2FsbHkgZGVjcmVtZW50ZWQgYXQgZWFjaCB1cGRhdGVcbiAgICAgICAgICogQHR5cGUge3tudW1iZXJ9fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7fTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCBvZiBTY2VuZUVsZW1lbnRzIHRoYXQgYXJlIGF0dGFjaGVkIHRvIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgICAgICogV2hlbmV2ZXIgYHRoaXNgIGlzIG1vdmVkLCBhbGwgYXR0YWNoZWQgRWxlbWVudHMgd2lsbCBhbHNvIGJlIG1vdmVkIGJ5IHRoZSBzYW1lIGFtb3VudFxuICAgICAgICAgKlxuICAgICAgICAgKiBXYXJuaW5nOiBCZWNhdXNlIG9mIHRoZSBzcGVjaWFsIGNvbnN0cmFpbnRzIG9uIEFjdG9yIHBvc2l0aW9ucywgQWN0b3JzIHNob3VsZCBub3QgYmUgYXR0YWNoZWQgdG8gYVxuICAgICAgICAgKiBTY2VuZUVsZW1lbnQuIFRoZSBwYXJ0aWN1bGFyIGNhc2Ugb2YgQWN0b3JzIFwicmlkaW5nXCIgYSBTb2xpZCBpcyBoYW5kbGVkIHNlcGFyYXRlbHkgaW4gdGhlIFNvbGlkLm1vdmUoKVxuICAgICAgICAgKiBtZXRob2QuXG4gICAgICAgICAqIEB0eXBlIHtTZXQ8U2NlbmVFbGVtZW50Pn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cyA9IG5ldyBTZXQoKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZUVsZW1lbnQgdG8gd2hpY2ggdGhpcyBpcyBhdHRhY2hlZCwgaWYgYW55XG4gICAgICAgICAqIEB0eXBlIHtTY2VuZUVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmF0dGFjaGVkVG8gPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBib3VuZGluZyByZWN0YW5nbGUgb2YgYHRoaXNgIG92ZXJsYXBzIHRoZSBib3VuZGluZyByZWN0YW5nbGUgb2YgYG90aGVyYC5cbiAgICAgKlxuICAgICAqIFR3byBTY2VuZUVsZW1lbnRzIG92ZXJsYXAgaWYgZm9yIGJvdGggZGltZW5zaW9ucyB0aGUgZW5kIHBvc2l0aW9uIG9mIGVhY2ggU2NlbmVFbGVtZW50IGlzIHN0cmljdGx5IGdyZWF0ZXIgdGhhblxuICAgICAqIHRoZSBzdGFydCBwb3NpdGlvbiBvZiB0aGUgb3RoZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3RoZXIge1NjZW5lRWxlbWVudH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxib29sZWFufVxuICAgICAqL1xuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyB0aGUgU2NlbmVFbGVtZW50IGluIHRoZSBDYW52YXMgYXNzb2NpYXRlZCB0byB0aGUgQ29udGV4dCBnaXZlbiBhcyBhcmd1bWVudFxuICAgICAqIEBwYXJhbSBjdHgge0NhbnZhc1JlbmRlcmluZ0NvbnRleHQyRH0gY29udGV4dCBvZiB0aGUgY2FudmFzIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgZHJhd25cbiAgICAgKi9cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc2hpZnRYID0gdGhpcy5zaGlmdFg7XG4gICAgICAgICAgICBsZXQgc2hpZnRZID0gdGhpcy5zaGlmdFk7XG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2hlZFRvKSB7XG4gICAgICAgICAgICAgICAgc2hpZnRYICs9IHRoaXMuYXR0YWNoZWRUby5zaGlmdFg7XG4gICAgICAgICAgICAgICAgc2hpZnRZICs9IHRoaXMuYXR0YWNoZWRUby5zaGlmdFk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRpbGVEYXRhIG9mIHRoaXMudGlsZXMpIHtcbiAgICAgICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgICAgICBncmFwaGljcy5zaGVldHMudGlsZXMsXG4gICAgICAgICAgICAgICAgICAgIDE2ICogdGlsZURhdGEueCwgMTYgKiB0aWxlRGF0YS55LFxuICAgICAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMueCArIHRpbGVEYXRhLnNoaWZ0WCArIHNoaWZ0WCwgdGhpcy55ICsgdGlsZURhdGEuc2hpZnRZICsgc2hpZnRZLFxuICAgICAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHByb3BlcnRpZXMgYXQgdGhlIHN0YXJ0IG9mIGEgbmV3IHVwZGF0ZSBvZiB0aGUgU2NlbmVcbiAgICAgKi9cbiAgICBiZWZvcmVVcGRhdGUoKSB7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgc3RhdGUgb2YgdGhlIFNjZW5lRWxlbWVudCAoY2FsbGVkIGF0IGVhY2ggZnJhbWUgd2hlbiB0aGUgU2NlbmUgaXMgYWN0aXZlKVxuICAgICAqIEBwYXJhbSBkZWx0YVRpbWUge251bWJlcn0gdGltZSBlbGFwc2VkIHNpbmNlIGxhc3QgdXBkYXRlIChpbiBzZWNvbmRzKVxuICAgICAqL1xuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgLy8gdXBkYXRlIHRpbWVyc1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgZWZmZWN0c1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLmVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmVzIHRoZSBTY2VuZUVsZW1lbnQgYnkgYSBnaXZlbiBhbW91bnRcbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIHJpZ2h0XG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSBkb3duXG4gICAgICogQHBhcmFtIG14IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB4LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqIEBwYXJhbSBteSB7bnVtYmVyfSBtb21lbnR1bSBhbG9uZyB0aGUgeS1heGlzIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBtb3ZlKGR4LCBkeSwgbXggPSAwLCBteSA9IDApIHtcbiAgICAgICAgLy8gbW92ZSBhbGwgZWxlbWVudHMgYXR0YWNoZWQgdG8gdGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHksIG14LCBteSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjaGFuZ2UgcG9zaXRpb25cbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGR4O1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gZHk7XG4gICAgICAgIGNvbnN0IG1vdmVYID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICBjb25zdCBtb3ZlWSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy5tb3ZlZFggKz0gbW92ZVg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuICAgICAgICB0aGlzLm1vdmVkWSArPSBtb3ZlWTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlIHRoZSBTY2VuZSBFbGVtZW50IHRvIGEgZ2l2ZW4gcG9zaXRpb25cbiAgICAgKiBAcGFyYW0geCB7bnVtYmVyfSB4LWNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldCBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB5IHtudW1iZXJ9IHktY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIG14IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB4LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqIEBwYXJhbSBteSB7bnVtYmVyfSBtb21lbnR1bSBhbG9uZyB0aGUgeS1heGlzIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBtb3ZlVG8oeCwgeSwgbXggPSAwLCBteSA9IDApIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIsIG14LCBteSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgZWxlbWVudCBiYWNrIHRvIGl0cyBvcmlnaW5hbCBzdGF0ZSAodXNlZCB3aGVuIFNjZW5lIGlzIHJlc2V0KVxuICAgICAqL1xuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnN0YXJ0WDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy5zdGFydFk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICBmb3IgKGNvbnN0IHRpbWVyIGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0aW1lcl0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWZmZWN0cy5sZW5ndGggPSAwOyAgICAvLyBjbGVhciBhbGwgZWZmZWN0c1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gZWZmZWN0IHRvIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgKiBAcGFyYW0gZWZmZWN0IHtFZmZlY3R9IHRoZSBFZmZlY3QgdGhhdCBpcyBhZGRlZFxuICAgICAqIEByZXR1cm5zIHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgKi9cbiAgICBhZGRFZmZlY3QoZWZmZWN0KSB7XG4gICAgICAgIHRoaXMuZWZmZWN0cy5wdXNoKGVmZmVjdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYW4gZWZmZWN0IG9uIHRoZSBTY2VuZUVsZW1lbnRcbiAgICAgKiBAcGFyYW0gZWZmZWN0IHtFZmZlY3R9IHRoZSBFZmZlY3QgdG8gcmVtb3ZlXG4gICAgICogQHJldHVybnMge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudFxuICAgICAqL1xuICAgIHJlbW92ZUVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmVmZmVjdHMuaW5kZXhPZihlZmZlY3QpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLmVmZmVjdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGdpdmVuIFNjZW5lRWxlbWVudCB0byB0aGlzXG4gICAgICogQHBhcmFtIGVsZW1lbnQge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudCB0byBhdHRhY2hcbiAgICAgKi9cbiAgICBhdHRhY2goZWxlbWVudCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LmF0dGFjaGVkVG8gPSB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGRldGFjaFxuICAgICAqL1xuICAgIGRldGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBBY3RvcnMgYXJlIFNjZW5lRWxlbWVudHMgaW4gYSBTY2VuZSB0aGF0IGNhbm5vdCBwYXNzIHRocm91Z2ggU29saWRzIChwbGF5ZXIgY2hhcmFjdGVycyBhbmQgZW5lbWllcyBmb3IgaW5zdGFuY2UpXG4gKi9cbmNsYXNzIEFjdG9yIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogTW9tZW50dW0gaGVsZCBhbG9uZyB0aGUgeC1heGlzIChnaXZlbiBieSBjYXJyeWluZyBTb2xpZHMpXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIHNob3VsZCBiZSBzZXQgdXNpbmcgQWN0b3Iuc2V0TW9tZW50dW1YKCkgdG8gaW5pdGFsaXplIHRoZSBhc3NvY2lhdGVkIHRpbWVyXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb21lbnR1bSBoZWxkIGFsb25nIHRoZSB5LWF4aXMgKGdpdmVuIGJ5IGNhcnJ5aW5nIFNvbGlkcylcbiAgICAgICAgICogVGhpcyBhdHRyaWJ1dGUgc2hvdWxkIGJlIHNldCB1c2luZyBBY3Rvci5zZXRNb21lbnR1bVkoKSB0byBpbml0YWxpemUgdGhlIGFzc29jaWF0ZWQgdGltZXJcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciBzdG9yaW5nIG1vbWVudHVtIGFsb25nIHRoZSB4LWF4aXNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3Igc3RvcmluZyBtb21lbnR1bSBhbG9uZyB0aGUgeS1heGlzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICB0aGlzLm1vdmVYKGR4KTtcbiAgICAgICAgdGhpcy5tb3ZlWShkeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBBY3RvciBpcyBjdXJyZW50bHkgXCJyaWRpbmdcIiB0aGUgU29saWQgZ2l2ZW4gYXMgcGFyYW1ldGVyLCBtZWFuaW5nIHRoYXQgd2hlbiB0aGUgU29saWRcbiAgICAgKiBtb3ZlcyBpdCBzaG91bGQgbW92ZSB0aGUgQWN0b3IgdG9vLlxuICAgICAqIEFuIEFjdG9yIGlzIGNvbnNpZGVyZWQgdG8gYmUgcmlkaW5nIGEgU29saWQgaXQgaXMgc3RhbmRpbmcgZGlyZWN0bHkgb24gdG9wIG9mIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvbGlkIHtTb2xpZH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIGNhbGxlZCB3aGVuIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWQgd2hpbGUgYmVpbmcgcHVzaGVkIGJ5IGFub3RoZXJcbiAgICAgKi9cbiAgICBzcXVpc2goKSB7fVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIGNhbGxlZCB3aGVuIHRoZSBBY3RvciBzaG91bGQgZGllXG4gICAgICovXG4gICAgZGllKCkge31cblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMubXggYW5kIHN0YXJ0cyB0aGUgYXNzb2NpYXRlZCB0aW1lclxuICAgICAqIEBwYXJhbSBteCB7bnVtYmVyfSB2YWx1ZSBvZiBtb21lbnR1bSBhbG9uZyB0aGUgeC1heGlzXG4gICAgICovXG4gICAgc2V0TW9tZW50dW1YKG14KSB7XG4gICAgICAgIGlmIChteCkge1xuICAgICAgICAgICAgdGhpcy5tb21lbnR1bVggPSBteDtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtWCA9IGNvbnN0YW50cy5NT01FTlRVTV9TVE9SRV9USU1FO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhpcy5teSBhbmQgc3RhcnRzIHRoZSBhc3NvY2lhdGVkIHRpbWVyXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IHZhbHVlIG9mIG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXNcbiAgICAgKi9cbiAgICBzZXRNb21lbnR1bVkobXkpIHtcbiAgICAgICAgaWYgKG15KSB7XG4gICAgICAgICAgICB0aGlzLm1vbWVudHVtWSA9IG15O1xuICAgICAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW1ZID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgUGxheWVyQ2hhcmFjdGVyIGV4dGVuZHMgQWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHBsYXllciwgeCA9IDAsIHkgPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IDE7XG4gICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IDE7XG4gICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IDQ7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuXG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB+fih0aGlzLmFuaW1hdGlvbl9jb3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gNCAqIHRoaXMuc3ByaXRlX3JvdyArICh0aGlzLm5iRGFzaGVzID8gMCA6IDIpICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBncmFwaGljcy5zaGVldHNbdGhpcy5wbGF5ZXIuY29sb3JdLFxuICAgICAgICAgICAgMTYgKiBpbmRleCwgMTYgKiByb3csXG4gICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICB0aGlzLnggLSA0ICsgdGhpcy5zaGlmdFgsIHRoaXMueSAtIDIgKyB0aGlzLnNoaWZ0WSxcbiAgICAgICAgICAgIDE2LCAxNik7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciArPSAxO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICU9IHRoaXMubmJfc3ByaXRlcyAqIEFOSU1BVElPTl9TTE9XRE9XTjtcblxuICAgICAgICAvLyBjaGVjayBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMueSArIHRoaXMuaGVpZ2h0ID09PSBzb2xpZC55ICYmIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc29saWQuY2FuQmVDbGltYmVkICYmIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciB3YWxscyBvbiByaWdodCBhbmQgbGVmdCBhdCBkaXN0YW5jZSA8PSBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VMZWZ0ID0gdGhpcy54IC0gc29saWQueCAtIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZUxlZnQgJiYgZGlzdGFuY2VMZWZ0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VSaWdodCA9IHNvbGlkLnggLSB0aGlzLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZVJpZ2h0ICYmIGRpc3RhbmNlUmlnaHQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy54ID09PSBzb2xpZC54ICsgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgaHVnZ2luZyBhIHdhbGxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSBjb25zdGFudHMuSlVNUF9HUkFDRV9USU1FO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IGNvbnN0YW50cy5TVEFURV9EQVNIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnVwZGF0ZUFuaW1hdGlvbigpO1xuXG4gICAgICAgIHRoaXMubW92ZVgodGhpcy5zcGVlZFggKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRYID0gMCk7XG4gICAgICAgIHRoaXMubW92ZVkodGhpcy5zcGVlZFkgKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRZID0gMCk7XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBUaGluZ3NcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5zY2VuZS50aGluZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpbmcuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyh0aGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpbmcub25Db250YWN0V2l0aCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55ID49IHRoaXMuc2NlbmUuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZHlpbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjZW5lLnNob3VsZFJlc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVEYXNoKCkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLmlucHV0cy5pc1ByZXNzZWQoXCJqdW1wXCIpICYmIHRoaXMudGltZXJzLnZhckp1bXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFksIC1jb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyeVVwZGF0ZURhc2goKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcCgpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cnlVcGRhdGVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy5pc1ByZXNzZWQoXCJkYXNoXCIpICYmXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnB1dHMudGltZXJzLmRhc2hCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPD0gMCAmJlxuICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyB8fCB0aGlzLnBsYXllci5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICYmIHRoaXMucGxheWVyLmlucHV0cy55QXhpcyA/IGNvbnN0YW50cy5EQVNIX1NQRUVEIC8gTWF0aC5zcXJ0KDIpIDogY29uc3RhbnRzLkRBU0hfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5wbGF5ZXIuaW5wdXRzLnlBeGlzICogZGFzaFNwZWVkO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMuaXNQcmVzc2VkKFwianVtcFwiKSAmJlxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW5wdXRzLnRpbWVycy5qdW1wQnVmZmVyID4gMCAmJlxuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID4gMCkge1xuICAgICAgICAgICAgLy8gcmVndWxhciBqdW1wXG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgKiBjb25zdGFudHMuSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW5wdXRzLmlzUHJlc3NlZChcImp1bXBcIikgJiZcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA+IDAgJiZcbiAgICAgICAgICAgICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIGxldCBkeCA9IHRoaXMuaGFzV2FsbExlZnQgPyAxIDogLTE7XG4gICAgICAgICAgICBpZiAoKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLmhhc1dhbGxSaWdodCkgfHwgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy5oYXNXYWxsTGVmdCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBjb25zdGFudHMuV0FMTF9KVU1QX0hTUEVFRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5KVU1QX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfSlVNUCk7XG4gICAgICAgICAgICBkaWRKdW1wID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlkSnVtcCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtWCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogdGhpcy5tb21lbnR1bVg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW1ZID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiB0aGlzLm1vbWVudHVtWTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgIT09IDApIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IHRoaXMucGxheWVyLmlucHV0cy54QXhpcztcblxuICAgICAgICAvLyBob3Jpem9udGFsIG1vdmVtZW50XG4gICAgICAgIGxldCBzeCA9IE1hdGguYWJzKHRoaXMuc3BlZWRYKTsgICAgICAgIC8vIGFic29sdXRlIHZhbHVlIG9mIHRoZSBob3Jpem9udGFsIHNwZWVkIG9mIHRoZSBwbGF5ZXJcbiAgICAgICAgY29uc3QgZHggPSB0aGlzLnNwZWVkWCA+PSAwID8gMSA6IC0xOyAgICAvLyBkaXJlY3Rpb24gaW4gd2hpY2ggdGhlIHBsYXllciBpcyBtb3ZpbmdcbiAgICAgICAgY29uc3QgbXVsdCA9IHRoaXMuaXNHcm91bmRlZCA/IDEgOiBjb25zdGFudHMuQUlSX0ZBQ1RPUjtcblxuICAgICAgICAvLyBwYXNzaXZlIGRlY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA8IDApIHtcbiAgICAgICAgICAgIHN4IC09IGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogc3g7XG4gICAgfVxuXG4gICAgdXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLnlBeGlzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5DTElNQl9TTElQX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IGNvbnN0YW50cy5TVEFURV9ERUFEKSB7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLlBMQVlFUl9BTklNQVRJT05fUlVOKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5QTEFZRVJfQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uUExBWUVSX0FOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5QTEFZRVJfQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLlBMQVlFUl9BTklNQVRJT05fSlVNUCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuanVtcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuZGFzaCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuZGFzaEJ1ZmZlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5kaWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlVHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgICAgIC8vIHZhbGlkYXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LnNjZW5lLnJlbW92ZVRoaW5nKHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUucmVtb3ZlQWN0b3IodGhpcyk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuYWRkQWN0b3IodGhpcyk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gdHJhbnNpdGlvbi5zcGF3blBvaW50SW5kZXg7XG4gICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICB9XG5cbiAgICBkaWUoKSB7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREVBRCk7XG4gICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLlBMQVlFUl9BTklNQVRJT05fRElFKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnNjZW5lLnNwYXduUG9pbnRzW3RoaXMuc2NlbmUuc3Bhd25Qb2ludEluZGV4XTtcbiAgICAgICAgdGhpcy54ID0gcG9pbnQueDtcbiAgICAgICAgdGhpcy55ID0gcG9pbnQueSAtIDY7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHNldEFuaW1hdGlvbihzcHJpdGVfcm93LCBuYl9zcHJpdGVzKSB7XG4gICAgICAgIGlmIChzcHJpdGVfcm93ICE9PSB0aGlzLnNwcml0ZV9yb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IHNwcml0ZV9yb3c7XG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTb2xpZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBBY3RvcnMgY2Fubm90IHBhc3MgdGhyb3VnaC4gVGhlcmUgc2hvdWxkIG5ldmVyIGJlIGFuIEFjdG9yIG92ZXJsYXBwaW5nIGEgU29saWQgKHVubGVzc1xuICogZWl0aGVyIG9uZSBpcyBtYXJrZWQgYXMgaW5hY3RpdmUpLiBXaGVuIFNvbGlkcyBtb3ZlLCB0aGV5IGludGVyYWN0IHdpdGggQWN0b3JzIHRoYXQgbWlnaHQgb3RoZXJ3aXNlIG92ZXJsYXAgKHRoZXlcbiAqIG1pZ2h0IHB1c2ggdGhlbSwga2lsbCB0aGVtLCBldGMuKS5cbiAqXG4gKiBUd28gU29saWRzIG1pZ2h0IG92ZXJsYXAsIGFuZCBpbiBnZW5lcmFsIHRoZSBtb3ZlbWVudCBvZiBhIFNvbGlkIGlzIG5vdCBhZmZlY3RlZCBieSBvdGhlciBTb2xpZHMuXG4gKi9cbmNsYXNzIFNvbGlkIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBTb2xpZCBzaG91bGQgYmUgY29uc2lkZXJlZCB3aGVuIGNoZWNraW5nIGNvbGxpc2lvbnMgd2l0aCBhbiBBY3RvclxuICAgICAgICAgKiBUaGlzIGF0dHJpYnV0ZSBpcyB1c2VkIGF1dG9tYXRpY2FsbHkgYnkgdGhlIG1vdmUoKSBtZXRob2Qgd2hlbiB0aGUgU29saWQgcHVzaGVzIGFuIEFjdG9yLiBJdCBzaG91bGQgbm90IGJlXG4gICAgICAgICAqIGNoYW5nZWQgaW4gb3RoZXIgY2lyY3Vtc3RhbmNlcyAodXNlIGlzQWN0aXZlIHRvIGRpc2FibGUgdGhlIFNvbGlkKS5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciBhIFBsYXllciBjaGFyYWN0ZXIgY2FuIGNsaW1iIG9uIChvciBzbG93bHkgc2xpZGUgYWdhaW5zdCkgdGhlIHNpZGVzIG9mIHRoZSBTb2xpZFxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyB0aGUgU29saWQgYnkgYSBnaXZlbiBhbW91bnRcbiAgICAgKlxuICAgICAqIEFmdGVyIHRoZSBTb2xpZCBpcyBtb3ZlZCwgYWxsIEFjdG9ycyBvZiB0aGUgU2NlbmUgbXVzdCBiZSBjaGVja2VkXG4gICAgICogLSBBY3RvcnMgdGhhdCBvdmVybGFwIHRoZSBuZXcgcG9zaXRpb24gb2YgdGhlIFNvbGlkIG11c3QgYmUgcHVzaGVkXG4gICAgICogLSBBY3RvcnMgdGhhdCBhcmUgcmlkaW5nIHRoZSBzb2xpZCBtdXN0IGJlIGNhcnJpZWRcbiAgICAgKlxuICAgICAqIFRoZSBpbXBsZW1lbnRhdGlvbiBpcyBjbG9zZSB0byB0aGUgZGVzY3JpcHRpb24gb2YgdGhlIENlbGVzdGUgYW5kIFRvd2VyZmFsbCBlbmdpbmUgOlxuICAgICAqIGh0dHBzOi8vbWVkaXVtLmNvbS9ATWF0dFRob3Jzb24vY2VsZXN0ZS1hbmQtdG93ZXJmYWxsLXBoeXNpY3MtZDI0YmQyYWUwZmM1XG4gICAgICogKHdpdGggc29tZSBtb2RpZmljYXRpb25zLCBmb3IgaW5zdGFuY2UgdGhlIGZhY3QgdGhhdCB0aGUgU29saWQgaXMgbW92ZWQgYnkgaXRzIGZ1bGwgYW1vdW50IGluIG9uZSBzdGVwLCBub3RcbiAgICAgKiAxIHBpeGVsIGF0IGEgdGltZSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgcmlnaHRcbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIGRvd25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICAvLyBtb3ZlIGFsbCBhdHRhY2hlZCBlbGVtZW50c1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHksIG14LCBteSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7ICAvLyBpbnRlZ2VyIGFtb3VudCB0byBtb3ZlXG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHB1c2ggYWN0b3JzIHRoYXQgb3ZlcmxhcCB3aXRoIHRoaXMgYWZ0ZXIgbW92ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggKyB0aGlzLndpZHRoIC0gYWN0b3IueCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FycnkgYWN0b3JzIHRoYXQgYXJlIHJpZGluZyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1YKG14KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHVzaCBhY3RvcnMgdGhhdCBvdmVybGFwIHdpdGggdGhpcyBhZnRlciBtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCAtIGFjdG9yLnggLSBhY3Rvci53aWR0aCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FycnkgYWN0b3JzIHRoYXQgYXJlIHJpZGluZyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1YKG14KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW92ZVkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHVzaCBhY3RvcnMgdGhhdCBvdmVybGFwIHdpdGggdGhpcyBhZnRlciBtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSArIHRoaXMuaGVpZ2h0IC0gYWN0b3IueSwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2FycnkgYWN0b3JzIHRoYXQgYXJlIHJpZGluZyB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHVzaCBhY3RvcnMgdGhhdCBvdmVybGFwIHdpdGggdGhpcyBhZnRlciBtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhcnJ5IGFjdG9ycyB0aGF0IGFyZSByaWRpbmcgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWShteSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgU29saWQgaXMgY29uc2lkZXJlZCB0byBjb2xsaWRlIHdpdGggYW4gQWN0b3IgbW92aW5nIGJ5IGEgZ2l2ZW4gYW1vdW50IGluIGJvdGggYXhlcy5cbiAgICAgKlxuICAgICAqIFRvIHNpbXBsaWZ5IHRoZSBjb21wdXRhdGlvbiwgdGhlIGZ1bmN0aW9uIGNoZWNrcyBpZiB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBzb2xpZCBvdmVybGFwcyB3aXRoIHRoZSBzbWFsbGVzdFxuICAgICAqIHJlY3RhbmdsZSBjb250YWluaW5nIHRoZSBhcmVhcyBvY2N1cGllZCBieSB0aGUgQWN0b3IgYXQgdGhlIHN0YXJ0IGFuZCBlbmQgb2YgaXRzIG1vdmVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGFjdG9yIHtBY3Rvcn1cbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeC1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeS1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgU29saWQgb3ZlcmxhcHMgdGhlIEFjdG9yIGF0IGFueSBwb2ludCBkdXJpbmcgaXRzIG1vdmVtZW50XG4gICAgICovXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogUGxhdGZvcm1zIGFyZSBmbGF0IFNvbGlkcyAoMCBoZWlnaHQpIHRoYXQgQWN0b3JzIGNhbiBwYXNzIHRocm91Z2ggd2hlbiBtb3ZpbmcgdXB3YXJkcyBidXQgbm90IGRvd253YXJkcyAoaWYgdGhleSBhcmVcbiAqIGVudGlyZWx5IGhpZ2hlciB0aGFuIHRoZSBQbGF0Zm9ybSlcbiAqXG4gKiBDb250cmFyeSB0byByZWd1bGFyIFNvbGlkcywgUGxhdGZvcm1zIGFyZSBhbGxvd2VkIHRvIG92ZXJsYXAgd2l0aCBBY3RvcnMuXG4gKi9cbmNsYXNzIFBsYXRmb3JtIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCB0aWxlcykge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgMCwgdGlsZXMpO1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCA8PSB0aGlzLnkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0ICsgZHkgPiB0aGlzLnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENydW1ibGluZ0Jsb2NrcyBhcmUgU29saWRzIHRoYXQgZGlzYXBwZWFyIHNob3J0bHkgYWZ0ZXIgYSBQbGF5ZXIgaGl0cyBpdCAob25seSB3aGVuIHRoZSBQbGF5ZXIgaXMgY29uc2lkZXJlZCB0byBiZVxuICogXCJjYXJyaWVkXCIgYnkgdGhlIENydW1ibGluZ0Jsb2NrKS5cbiAqIFRoZXkgcmVhcHBlYXIgYWZ0ZXIgYSBnaXZlbiB0aW1lIChpZiB0aGVyZSBhcmUgbm8gQWN0b3JzIG9uIHRoZWlyIHBvc2l0aW9uKVxuICovXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIFtuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNTcpXSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBpcyBkaXNhcHBlYXJpbmdcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIGRpc2FwcGVhcmFuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIHJlYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmZhbGwgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjsgICAvLyBkdXJhdGlvbiBiZWZvcmUgcmVhcHBlYXJpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVjb21lQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkQmVjb21lQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNob3VsZEJlY29tZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5lZmZlY3RzLmNydW1ibGluZ0Jsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gLjU7ICAvLyBkdXJhdGlvbiBiZWZvcmUgZGlzYXBwZWFyaW5nXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IDIgKiB0aGlzLnRpbWVycy5mYWxsO1xuICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gYWxwaGE7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFRyaWdnZXJCbG9ja3MgYXJlIFNvbGlkcyB0aGF0IHN0YXJ0IG1vdmluZyB3aGVuIHRoZXkgY2FycnkgYW4gQWN0b3JcbiAqL1xuY2xhc3MgVHJpZ2dlckJsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCwgdGlsZXMgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHRpbGVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRpbGVzID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhlaWdodDsgaSArPSBVKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB3aWR0aDsgaiArPSBVKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gNjQgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KTtcbiAgICAgICAgICAgICAgICAgICAgdGlsZXMucHVzaChuZXcgZ3JhcGhpY3MuVGlsZURhdGEoaW5kZXgsIGosIGkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZXMpO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgYmxvY2sgaGFzIGJlZW4gdHJpZ2dlcmVkIGJ5IGFuIEFjdG9yIGJ1dCBoYXMgbm90IHlldCBzdGFydGVkIGV4ZWN1dGluZyB0aGUgbW92ZW1lbnQgKGR1cmluZ1xuICAgICAgICAgKiB0cmlnZ2VyIGRlbGF5KVxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWUgZGVsYXkgYmVmb3JlIHRoZSBtb3ZlbWVudCBzdGFydHMgd2hlbiB0aGUgYmxvY2sgaXMgdHJpZ2dlcmVkXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmRlbGF5ID0gZGVsYXk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBtb3ZlbWVudCB0byBleGVjdXRlIHdoZW4gdHJpZ2dlcmVkIGJ5IGFuIEFjdG9yXG4gICAgICAgICAqIEB0eXBlIHtFZmZlY3R9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5zaGlmdFggPSAwO1xuICAgICAgICB0aGlzLnNoaWZ0WSA9IDA7XG4gICAgICAgIGlmICh0aGlzLmlzVHJpZ2dlcmVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMudHJpZ2dlciA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVzZXQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEVmZmVjdCh0aGlzLnRyaWdnZXJlZE1vdmVtZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdFggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKSAtIDE7XG4gICAgICAgICAgICAgICAgdGhpcy5zaGlmdFkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5lZmZlY3RzLmluY2x1ZGVzKHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHNob3VsZFRyaWdnZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvdWxkVHJpZ2dlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNob3VsZFRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy50cmlnZ2VyID0gdGhpcy5kZWxheTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVzZXQoKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBGYWxsaW5nQmxvY2tzIGFyZSBUcmlnZ2VyQmxvY2tzIHRoYXQgZmFsbCB3aGVuIHRyaWdnZXJlZCBieSBhbiBBY3RvclxuICpcbiAqIFRoZWlyIGJlaGF2aW9yIGlzIHRoZSBzYW1lIGFzIGEgVHJpZ2dlckJsb2NrICh0aGUgZmFsbCBpcyBkZWZpbmVkIGJ5IHRoZSBhc3NvY2lhdGVkIG1vdmVtZW50KSBidXQgYXJlIHJlcHJlc2VudGVkXG4gKiB3aXRoIGRpZmZlcmVudCB0aWxlcy5cbiAqL1xuY2xhc3MgRmFsbGluZ0Jsb2NrIGV4dGVuZHMgVHJpZ2dlckJsb2NrIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQpIHtcbiAgICAgICAgY29uc3QgdGlsZXMgPSBbXTtcbiAgICAgICAgdGlsZXMucHVzaChuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMykpO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSg1LCB3aWR0aCAtIFUsIDApKTtcbiAgICAgICAgdGlsZXMucHVzaChuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMTYsIDAsIGhlaWdodCAtIFUpKTtcbiAgICAgICAgdGlsZXMucHVzaChuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMTgsIHdpZHRoIC0gVSwgaGVpZ2h0IC0gVSkpO1xuICAgICAgICBmb3IgKGxldCB4ID0gVTsgeCA8IHdpZHRoIC0gVTsgeCArPSBVKSB7XG4gICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSg0LCB4LCAwKSk7XG4gICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxNywgeCwgaGVpZ2h0IC0gVSkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHkgPSBVOyB5IDwgaGVpZ2h0IC0gVTsgeSArPSBVKSB7XG4gICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSg4LCAwLCB5KSk7XG4gICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxMCwgd2lkdGggLSBVLCB5KSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgeCA9IFU7IHggPCB3aWR0aCAtIFU7IHggKz0gVSkge1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IFU7IHkgPCBoZWlnaHQgLSBVOyB5ICs9IFUpIHtcbiAgICAgICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSg5LCB4LCB5KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgZGVsYXksIG1vdmVtZW50LCB0aWxlcyk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogVGhpbmdzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgZG8gbm90IGludGVyYWN0IHdpdGggU29saWQgcGh5c2ljcywgYnV0IGNhbiBoYXZlIGFuIGVmZmVjdCB3aGVuIGFuIEFjdG9yIHRvdWNoZXMgdGhlbVxuICovXG5jbGFzcyBUaGluZyBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZXMgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFjdGlvbiB0byBleGVjdXRlIHdoZW4gYW4gQWN0b3IgdG91Y2hlcyB0aGUgVGhpbmdcbiAgICAgKiBAcGFyYW0gYWN0b3Ige0FjdG9yfSB0aGUgQWN0b3IgdGhhdCB0b3VjaGVzIHRoZSBUaGluZ1xuICAgICAqL1xuICAgIG9uQ29udGFjdFdpdGgoYWN0b3IpIHt9XG59XG5cblxuLyoqXG4gKiBIYXphcmRzIGFyZSBUaGluZ3MgdGhhdCBraWxsIHRoZSBBY3RvciBvbiBjb250YWN0XG4gKi9cbmNsYXNzIEhhemFyZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBhY3Rvci5kaWUoKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcHJpbmdzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgdGhyb3cgUGxheWVycyB1cCBvbiBjb250YWN0XG4gKi9cbmNsYXNzIFNwcmluZyBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIGNvbnN0IHRpbGVzMSA9IFtcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1MiwgMCwgLVUgLyAyKSxcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1MywgVSwgLVUgLyAyKVxuICAgICAgICBdO1xuICAgICAgICBjb25zdCB0aWxlczIgPSBbXG4gICAgICAgICAgICBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNTQsIDAsIC1VIC8gMiksXG4gICAgICAgICAgICBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNTUsIFUsIC1VIC8gMilcbiAgICAgICAgXVxuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIDIgKiBVLCBVIC8gMiwgdGlsZXMxKTtcbiAgICAgICAgdGhpcy50aWxlczEgPSB0aWxlczE7XG4gICAgICAgIHRoaXMudGlsZXMyID0gdGlsZXMyO1xuICAgICAgICB0aGlzLnRpbWVycy5leHRlbmRlZCA9IDA7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBpZiAoYWN0b3IgaW5zdGFuY2VvZiBQbGF5ZXJDaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5lZmZlY3RzLnNwcmluZyk7XG4gICAgICAgICAgICBhY3Rvci5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfQk9VTkNFKTtcbiAgICAgICAgICAgIGFjdG9yLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICBhY3Rvci5zcGVlZFkgPSBjb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICAgICAgYWN0b3IucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmV4dGVuZGVkID0gLjI1O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgdGhpcy50aWxlcyA9ICh0aGlzLnRpbWVycy5leHRlbmRlZCA+IDApID8gdGhpcy50aWxlczIgOiB0aGlzLnRpbGVzMTtcbiAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIERhc2hEaWFtb25kcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHJlc3RvcmUgdGhlIGRhc2ggY291bnRlciBvZiB0aGUgUGxheWVycyB3aG8gdG91Y2ggdGhlbVxuICovXG5jbGFzcyBEYXNoRGlhbW9uZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIFtuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMjEpXSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKVxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUgJiYgdGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3RvciBpbnN0YW5jZW9mIFBsYXllckNoYXJhY3RlciAmJiBhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKGFjdG9yLnJlc3RvcmVEYXNoKCkpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5kYXNoRGlhbW9uZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTdHJhd2JlcnJpZXMgYXJlIGNvbGxlY3RpYmxlcyB0aGF0IFBsYXllcnMgdGFrZSBvbiBjb250YWN0LlxuICogSWYgYSBQbGF5ZXIgZGllcyBhZnRlciBjb2xsZWN0aW5nIGEgU3RyYXdiZXJyeSBiZWZvcmUgY2hhbmdpbmcgU2NlbmUsIHRoZSBTdHJhd2JlcnJ5IGlzIHJlc3RvcmVkIGluIHRoZSBTY2VuZVxuICogKGFuZCByZW1vdmVkIGZyb20gdGhlIFBsYXllcidzIGxpc3Qgb2YgY29sbGVjdGVkIFN0cmF3YmVycmllcylcbiAqL1xuY2xhc3MgU3RyYXdiZXJyeSBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIFtuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMTMpXSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBpZiAoYWN0b3IgaW5zdGFuY2VvZiBQbGF5ZXJDaGFyYWN0ZXIgJiYgYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5lZmZlY3RzLnN0cmF3YmVycnkpO1xuICAgICAgICAgICAgYWN0b3IudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgYW4gQWN0b3IgaWYgaXQgbW92ZXMgZG93bndhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzVXAgZXh0ZW5kcyBIYXphcmQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCBVLCBVIC8gMiwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MCwgMCwgLVUgLyAyKV0pO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgoYWN0b3IpIHtcbiAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSAtIHRoaXMubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgIGFjdG9yLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzRG93biBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgYW4gQWN0b3IgaWYgaXQgbW92ZXMgdXB3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0Rvd24gZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSAvIDIsIFtuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNDIpXSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBpZiAoYWN0b3IubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPCAwKSB7XG4gICAgICAgICAgICBhY3Rvci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1JpZ2h0IGFyZSBIYXphcmRzIHRoYXQga2lsbCBhbiBBY3RvciBpZiBpdCBtb3ZlcyBsZWZ0d2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNSaWdodCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVIC8gMiwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MSldKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3Rvci5tb3ZlZFggLSB0aGlzLm1vdmVkWCA8IDApIHtcbiAgICAgICAgICAgIGFjdG9yLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzVXAgYXJlIEhhemFyZHMgdGhhdCBraWxsIGFuIEFjdG9yIGlmIGl0IG1vdmVzIHJpZ2h0d2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNMZWZ0IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHggKyBVIC8gMiwgeSwgVSAvIDIsIFUsIFtuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNDMsIC1VIC8gMiwgMCldKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKGFjdG9yKSB7XG4gICAgICAgIGlmIChhY3Rvci5tb3ZlZFggLSB0aGlzLm1vdmVkWCA+IDApIHtcbiAgICAgICAgICAgIGFjdG9yLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogVHJhbnNpdGlvbnMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCB0cmFuc2ZlciBhIFBsYXllciBmcm9tIG9uZSBTY2VuZSB0byBhbm90aGVyIG9uIGNvbnRhY3RcbiAqL1xuY2xhc3MgVHJhbnNpdGlvbiBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZSB0byB3aGljaCB0aGUgUGxheWVyIGlzIHRha2VuIHdoZW4gdG91Y2hpbmcgdGhlIFRyYW5zaXRpb25cbiAgICAgICAgICogQHR5cGUge1NjZW5lfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIGluIHRoZSB0YXJnZXQgU2NlbmUgY29ycmVzcG9uZGluZyB0byB0aGlzLnggKHdoZW4gdGhlIFBsYXllciB0cmFuc2l0aW9ucyB0byB0aGUgdGFyZ2V0IFNjZW5lLFxuICAgICAgICAgKiBpdHMgcG9zaXRpb24gaXMgc2V0IHRvIGl0cyBjdXJyZW50IHgtcG9zaXRpb24gKyB0aGlzLnRhcmdldFggLSB0aGlzLnhcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueSAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeS1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WSArIHRoaXMueVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBpbmRleCBvZiB0aGUgc3Bhd24gcG9pbnQgKGluIHRoZSB0YXJnZXQgU2NlbmUncyBsaXN0IG9mIHNwYXduIHBvaW50cykgY29ycmVzcG9uZGluZyB0byB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSBzcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChhY3Rvcikge1xuICAgICAgICBpZiAoYWN0b3IgaW5zdGFuY2VvZiBQbGF5ZXJDaGFyYWN0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0U2NlbmUucmVzZXQoKTtcbiAgICAgICAgICAgIGFjdG9yLnggKz0gdGhpcy50YXJnZXRYIC0gdGhpcy54O1xuICAgICAgICAgICAgYWN0b3IueSArPSB0aGlzLnRhcmdldFkgLSB0aGlzLnk7XG4gICAgICAgICAgICBhY3Rvci5tYWtlVHJhbnNpdGlvbih0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuc2NlbmUudHJhbnNpdGlvbiA9IHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgQWN0b3IsXG4gICAgUGxheWVyQ2hhcmFjdGVyLFxuICAgIFNvbGlkLFxuICAgIFBsYXRmb3JtLFxuICAgIENydW1ibGluZ0Jsb2NrLFxuICAgIFRyaWdnZXJCbG9jayxcbiAgICBGYWxsaW5nQmxvY2ssXG4gICAgVGhpbmcsXG4gICAgSGF6YXJkLFxuICAgIFNwcmluZyxcbiAgICBEYXNoRGlhbW9uZCxcbiAgICBTdHJhd2JlcnJ5LFxuICAgIFNwaWtlc1VwLFxuICAgIFNwaWtlc0Rvd24sXG4gICAgU3Bpa2VzUmlnaHQsXG4gICAgU3Bpa2VzTGVmdCxcbiAgICBUcmFuc2l0aW9uLFxufVxuIiwiY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcblxuY2xhc3MgUGxheWVyIHtcbiAgICBjb25zdHJ1Y3Rvcihjb2xvcikge1xuICAgICAgICB0aGlzLmNvbG9yID0gY29sb3I7XG4gICAgICAgIHRoaXMuY2hhcmFjdGVyID0gbmV3IHBoeXNpY3MuUGxheWVyQ2hhcmFjdGVyKHRoaXMpO1xuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLmlucHV0cy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5jb25zdCBncmFwaGljcyA9IHJlcXVpcmUoJy4vZ3JhcGhpY3MnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBtZW51ID0gcmVxdWlyZSgnLi9tZW51Jyk7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5cbmNsYXNzIFNjZW5lIHtcbiAgICBjb25zdHJ1Y3Rvcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaWR0aCBvZiB0aGUgU2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWlnaHQgb2YgdGhlIHNjZW5lIGluIHBpeGVsc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuc2Nyb2xsWCA9IDA7XG4gICAgICAgIHRoaXMuc2Nyb2xsWSA9IFUgLyAyO1xuICAgICAgICB0aGlzLnNvbGlkcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5hY3RvcnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGhpbmdzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRzID0gW107XG4gICAgICAgIHRoaXMudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZnJvbUpTT04oZGF0YSkge1xuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZShkYXRhLndpZHRoICogVSwgZGF0YS5oZWlnaHQgKiBVKTtcbiAgICAgICAgLy8gbWFrZSB3YWxsc1xuICAgICAgICBjb25zdCB3YWxscyA9IFtcbiAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKDAsIC0xLjUgKiBVLCBkYXRhLndpZHRoICogVSwgMCksXG4gICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgtLjUgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoKGRhdGEud2lkdGggKyAuNSkgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IHdhbGwgb2Ygd2FsbHMpIHtcbiAgICAgICAgICAgIHdhbGwuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgICAgICAgICBzY2VuZS5hZGRTb2xpZCh3YWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1haW5MYXllciA9IGRhdGEubGF5ZXJzLmZpbmQobCA9PiBsLm5hbWUgPT09ICdtYWluJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWFpbkxheWVyLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gbWFpbkxheWVyLmRhdGFbaV07XG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0gKGkgJSBtYWluTGF5ZXIud2lkdGgpICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gfn4oaSAvIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGVEYXRhID0gbmV3IGdyYXBoaWNzLlRpbGVEYXRhKGluZGV4IC0gMSk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGluZGV4IC0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDIxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuRGFzaERpYW1vbmQoeCArIFUgLyAyLCB5ICsgVSAvIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDMxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuc3Bhd25Qb2ludHMucHVzaCh7eDogeCwgeTogeX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDU6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVLCBbdGlsZURhdGFdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc1VwKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNEb3duKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1ODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLkhhemFyZCh4LCB5LCBVLCBVLCBbdGlsZURhdGFdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCArIFUgLyAyLCB5ICsgVSAvIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDU3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuQ3J1bWJsaW5nQmxvY2soeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcHJpbmcoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUsIFt0aWxlRGF0YV0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5lO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiRXNjYXBlXCIpIHx8IGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJwYXVzZVwiKSkpIHtcbiAgICAgICAgICAgICAgICBtZW51Lm1lbnVTdGFjay51bnNoaWZ0KG1lbnUubWFpbk1lbnUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBhbGwgZWxlbWVudHNcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICBzb2xpZC5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGluZy5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBhY3Rvci5iZWZvcmVVcGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgICAgIHNvbGlkLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaW5nLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGFjdG9yLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICAgICAgaWYgKGdsb2JhbHMucGxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIueCAtIHRoaXMuc2Nyb2xsWCA+IC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53aWR0aCAtIGNvbnN0YW50cy5WSUVXX1dJRFRILFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci54IC0gdGhpcy5zY3JvbGxYIDwgLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci54IC0gLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQgLSBjb25zdGFudHMuVklFV19IRUlHSFQsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci55IC0gdGhpcy5zY3JvbGxZIDwgLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICAgICAgVSAvIDIsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVzZXQgc2NlbmUgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAodGhpcy5zaG91bGRSZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy5zY3JvbGxYLCAtdGhpcy5zY3JvbGxZKTtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgLy8gZHJhdyBIVURcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmZmZmZmFhXCI7XG4gICAgICAgIGN0eC5maWxsUmVjdCgxLCAxLCA0MiwgMTApO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjMDAwMDAwXCI7XG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcInJpZ2h0XCI7XG4gICAgICAgIGN0eC5mb250ID0gJ25vcm1hbCA2cHggZ2FtZWJveSc7XG4gICAgICAgIGN0eC5maWxsVGV4dChgJHtnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnN0cmF3YmVycmllcy5zaXplICsgZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuc2l6ZX0vMjBgLCA0MCwgOCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoZ3JhcGhpY3Muc2hlZXRzLnRpbGVzLCA4MCwgMTYsIDE2LCAxNiwgMiwgMiwgOCwgOCk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgfVxuXG4gICAgYWRkQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuYWRkKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmRlbGV0ZShhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5yZW1vdmUoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5hZGQodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlVGhpbmcodGhpbmcpIHtcbiAgICAgICAgdGhpcy50aGluZ3MuZGVsZXRlKHRoaW5nKTtcbiAgICAgICAgdGhpbmcuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIiwiY29uc3QgZWZmZWN0cyA9IHtcbiAgICBqdW1wOiBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2p1bXAub2dnJyksXG4gICAgZGFzaDogbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9kYXNoX3BpbmtfbGVmdC5vZ2cnKSxcbiAgICBkaWU6IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfZGVhdGgub2dnJyksXG4gICAgY3J1bWJsaW5nQmxvY2s6IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fZmFsbGJsb2NrX3NoYWtlLm9nZycpLFxuICAgIHN0cmF3YmVycnk6IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fc3RyYXdiZXJyeV9yZWRfZ2V0XzF1cC5vZ2cnKSxcbiAgICBkYXNoRGlhbW9uZDogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9kaWFtb25kX3RvdWNoXzAxLm9nZycpLFxuICAgIHNwcmluZzogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zcHJpbmcub2dnJyksXG59XG5jb25zdCBiZ011c2ljID0gbmV3IEF1ZGlvKCdzb3VuZC9iZ19tdXNpYy53YXYnKTtcbmJnTXVzaWMubG9vcCA9IHRydWU7XG5cbmxldCBzb3VuZFZvbHVtZTtcbmxldCBtdXNpY1ZvbHVtZTtcblxuZnVuY3Rpb24gZ2V0U291bmRWb2x1bWUoKSB7XG4gICAgcmV0dXJuIHNvdW5kVm9sdW1lO1xufVxuXG5cbmZ1bmN0aW9uIHNldFNvdW5kVm9sdW1lKHZhbHVlKSB7XG4gICAgc291bmRWb2x1bWUgPSB2YWx1ZTtcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBPYmplY3QudmFsdWVzKGVmZmVjdHMpKSB7XG4gICAgICAgIGVmZmVjdC52b2x1bWUgPSBzb3VuZFZvbHVtZSAvIDE2O1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBpbmNyZW1lbnRTb3VuZFZvbHVtZSgpIHtcbiAgICBpZiAoc291bmRWb2x1bWUgPCA1KSB7XG4gICAgICAgIHNldFNvdW5kVm9sdW1lKHNvdW5kVm9sdW1lICsgMSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGRlY3JlbWVudFNvdW5kVm9sdW1lKCkge1xuICAgIGlmIChzb3VuZFZvbHVtZSA+IDApIHtcbiAgICAgICAgc2V0U291bmRWb2x1bWUoc291bmRWb2x1bWUgLSAxKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZ2V0TXVzaWNWb2x1bWUoKSB7XG4gICAgcmV0dXJuIG11c2ljVm9sdW1lO1xufVxuXG5cbmZ1bmN0aW9uIHNldE11c2ljVm9sdW1lKHZhbHVlKSB7XG4gICAgbXVzaWNWb2x1bWUgPSB2YWx1ZTtcbiAgICBiZ011c2ljLnZvbHVtZSA9IG11c2ljVm9sdW1lIC8gMTY7XG59XG5cblxuZnVuY3Rpb24gaW5jcmVtZW50TXVzaWNWb2x1bWUoKSB7XG4gICAgaWYgKG11c2ljVm9sdW1lIDwgNSkge1xuICAgICAgICBzZXRNdXNpY1ZvbHVtZShtdXNpY1ZvbHVtZSArIDEpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBkZWNyZW1lbnRNdXNpY1ZvbHVtZSgpIHtcbiAgICBpZiAobXVzaWNWb2x1bWUgPiAwKSB7XG4gICAgICAgIHNldE11c2ljVm9sdW1lKG11c2ljVm9sdW1lIC0gMSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIHBsYXlTb3VuZChzb3VuZCkge1xuICAgIHNvdW5kLmN1cnJlbnRUaW1lID0gMDtcbiAgICBzb3VuZC5wbGF5KCk7XG59XG5cblxuc2V0U291bmRWb2x1bWUoNSk7XG5zZXRNdXNpY1ZvbHVtZSg1KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZWZmZWN0cyxcbiAgICBiZ011c2ljLFxuICAgIGdldFNvdW5kVm9sdW1lLFxuICAgIGdldE11c2ljVm9sdW1lLFxuICAgIHBsYXlTb3VuZCxcbiAgICBpbmNyZW1lbnRTb3VuZFZvbHVtZSxcbiAgICBkZWNyZW1lbnRTb3VuZFZvbHVtZSxcbiAgICBpbmNyZW1lbnRNdXNpY1ZvbHVtZSxcbiAgICBkZWNyZW1lbnRNdXNpY1ZvbHVtZSxcbn0iXX0=
