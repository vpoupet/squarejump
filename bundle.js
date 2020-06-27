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

},{"./constants":1,"./effect":2,"./physics":9,"./scene":12}],8:[function(require,module,exports){
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
},{"./constants":1,"./globals":3,"./inputs":5,"./sound":13}],9:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const sound = require('./sound');

const U = constants.GRID_SIZE;


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
        this.shiftX = 0;
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
     */
    moveTo(x, y, mx, my) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder, mx, my);
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
        this.momentumX = 0;
        this.momentumY = 0;
        this.timers.momentumX = 0;
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
     * Method to call when the Actor collides with a Solid while being pushed by another
     */
    squish() {
    }

    setMomentumX(mx) {
        if (mx) {
            this.momentumX = mx;
            this.timers.momentumX = constants.MOMENTUM_STORE_TIME;
        }
    }

    setMomentumY(my) {
        if (my) {
            this.momentumY = my;
            this.timers.momentumY = constants.MOMENTUM_STORE_TIME;
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

    move(dx, dy, mx = 0, my = 0) {
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
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
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
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
                                actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
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
                                actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
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
                                actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
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
 * Hazards are SceneElements that kill the player on contact
 */
class Hazard extends SceneElement {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
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
 * Springs are SceneElements that throw Actors up on contact
 */
class Spring extends SceneElement {
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

    onContactWith(player) {
        sound.playSound(sound.effects.spring);
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
        this.timers.extended = .25;
    }

    draw(ctx) {
        this.tiles = (this.timers.extended > 0) ? this.tiles2 : this.tiles1;
        super.draw(ctx);
    }
}


/**
 * DashDiamonds are SceneElements that restore the dash counter of the Players who touch them
 */
class DashDiamond extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(21)]);
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    onContactWith(player) {
        if (player.restoreDash()) {
            sound.playSound(sound.effects.dashDiamond);
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
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(13)]);
    }

    onContactWith(player) {
        if (player.isActive) {
            sound.playSound(sound.effects.strawberry);
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
 * SpikesUp are Hazards that kill the Player if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, [new graphics.TileData(40, 0, -U / 2)]);
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
    constructor(x, y) {
        super(x, y, U, U / 2, [new graphics.TileData(42)]);
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
    constructor(x, y) {
        super(x, y, U / 2, U, [new graphics.TileData(41)]);
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
    constructor(x, y) {
        super(x + U / 2, y, U / 2, U, [new graphics.TileData(43, -U / 2, 0)]);
    }

    onContactWith(player) {
        if (player.movedX - this.movedX > 0) {
            player.die();
        }
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
    FallingBlock,
    CrumblingBlock,
    SpikesUp,
    SpikesDown,
    SpikesLeft,
    SpikesRight,
}

},{"./constants":1,"./graphics":4,"./sound":13}],10:[function(require,module,exports){
const playerCharacter = require('./playerCharacter');
const inputs = require('./inputs');

class Player {
    constructor(color) {
        this.color = color;
        this.character = new playerCharacter.PlayerCharacter(this);
        this.inputs = new inputs.PlayerInputs();
    }

    update(deltaTime) {
        this.inputs.update(deltaTime);
    }
}

module.exports = {
    Player,
}
},{"./inputs":5,"./playerCharacter":11}],11:[function(require,module,exports){
"use strict"
const inputs = require('./inputs');
const physics = require('./physics');
const constants = require('./constants');
const sound = require('./sound');
const graphics = require('./graphics');

const ANIMATION_SLOWDOWN = 6;
const ANIMATION_IDLE = [4, 4];
const ANIMATION_RUN = [1, 6];
const ANIMATION_JUMP = [6, 3];
const ANIMATION_FALL = [5, 3];
const ANIMATION_DIE = [0, 8];


class PlayerCharacter extends physics.Actor {
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

                    if ((this.player.inputs.xAxis === 1 && this.x + this.width === solid.x) ||
                        (this.player.inputs.xAxis === -1 && this.x === solid.x + solid.width)) {
                        // check if player is hugging a wall
                        this.carryingSolids.add(solid);
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
                if (this.tryUpdateDash(deltaTime)) break;
                if (this.tryUpdateJump(deltaTime)) break;
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

    tryUpdateJump(deltaTime) {
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
                    this.setAnimation(...ANIMATION_RUN);
                } else {
                    this.setAnimation(...ANIMATION_IDLE);
                }
            } else if (this.isHuggingWall) {
                this.setAnimation(...ANIMATION_IDLE);
            } else {
                if (this.speedY > 0) {
                    this.setAnimation(...ANIMATION_FALL);
                } else {
                    this.setAnimation(...ANIMATION_JUMP);
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


module.exports = {
    PlayerCharacter,
}
},{"./constants":1,"./graphics":4,"./inputs":5,"./physics":9,"./sound":13}],12:[function(require,module,exports){
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

},{"./constants":1,"./globals":3,"./graphics":4,"./inputs":5,"./menu":8,"./physics":9}],13:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImdsb2JhbHMuanMiLCJncmFwaGljcy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzXy5qcyIsIm1lbnUuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwicGxheWVyQ2hhcmFjdGVyLmpzIiwic2NlbmUuanMiLCJzb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3g1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ24vQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTkwO1xuY29uc3QgRFlJTkdfVElNRSA9IC44O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY2xhc3MgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgRWZmZWN0U2VxdWVuY2UgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKGVmZmVjdHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5lZmZlY3RzID0gZWZmZWN0cztcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLmR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5lZmZlY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVmZmVjdHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5lZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIsIHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2luZU1vdmVtZW50IGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gdGhpcy50aW1lciAqIDIgKiBNYXRoLlBJIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhdGlvID0gKE1hdGguY29zKGFuZ2xlKSArIDEpIC8gMjtcbiAgICAgICAgICAgIGNvbnN0IGRyYXRpbyA9IE1hdGguUEkgKiBNYXRoLnNpbihhbmdsZSkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8oXG4gICAgICAgICAgICAgICAgcmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLFxuICAgICAgICAgICAgICAgIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55MixcbiAgICAgICAgICAgICAgICBkcmF0aW8gKiAodGhpcy54MiAtIHRoaXMueDEpLFxuICAgICAgICAgICAgICAgIGRyYXRpbyAqICh0aGlzLnkyIC0gdGhpcy55MSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFZmZlY3QsXG4gICAgRWZmZWN0U2VxdWVuY2UsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsImNvbnN0IHBsYXllcnMgPSBbXTtcbmNvbnN0IHNjYWxpbmcgPSAzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwbGF5ZXJzLFxuICAgIHNjYWxpbmcsXG59XG4iLCJjb25zdCBzaGVldHMgPSB7fTtcblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB0byBiZSB1c2VkIHdoZW4gcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQgb2YgdGhlIHNjZW5lXG4gKi9cbmNsYXNzIFRpbGVEYXRhIHtcbiAgICBjb25zdHJ1Y3RvcihpbmRleCwgc2hpZnRYID0gMCwgc2hpZnRZID0gMCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5kZXggb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHRoaXMuaW5kZXggJSA4O1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1wb3NpdGlvbiBvZiB0aGUgdGlsZSBpbiB0aGUgdGlsZXNldFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0gdGhpcy5pbmRleCA+PiAzO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFggPSBzaGlmdFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LW9mZnNldCB0byBkcmF3IHRoZSB0aWxlIGZyb20gdGhlIFNjZW5lRWxlbWVudCdzIHBvc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNoaWZ0WSA9IHNoaWZ0WTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gbG9hZFNoZWV0KHVybCwgbmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNoZWV0c1tuYW1lXSA9IGltYWdlO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgaW1hZ2Uuc3JjID0gdXJsO1xuICAgIH0pO1xufVxuXG5cbmNvbnN0IGxvYWRHcmFwaGljcyA9IFByb21pc2UuYWxsKFtcbiAgICBsb2FkU2hlZXQoJ2ltYWdlcy9oZXJvX3JlZC5wbmcnLCAncmVkJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19ncmVlbi5wbmcnLCAnZ3JlZW4nKSxcbiAgICBsb2FkU2hlZXQoJ2ltYWdlcy9oZXJvX2JsdWUucG5nJywgJ2JsdWUnKSxcbiAgICBsb2FkU2hlZXQoJ2ltYWdlcy90aWxlc2V0LnBuZycsICd0aWxlcycpLFxuXSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgVGlsZURhdGEsXG4gICAgc2hlZXRzLFxuICAgIGxvYWRHcmFwaGljcyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBKVU1QX0JVRkZFUl9USU1FID0gLjE7XG5jb25zdCBEQVNIX0JVRkZFUl9USU1FID0gLjE7XG5jb25zdCBBWEVTX1RIUkVTSE9MRCA9IC40O1xuXG5sZXQgcHJlc3NlZEtleXMgPSBuZXcgU2V0KCk7XG5sZXQgcHJldmlvdXNseVByZXNzZWRLZXlzO1xubGV0IGN1cnJlbnRseVByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXZpb3VzbHlQcmVzc2VkQnV0dG9ucyA9IFtdO1xubGV0IGN1cnJlbnRseVByZXNzZWRCdXR0b25zID0gW107XG5cblxuZnVuY3Rpb24gb25HYW1lcGFkQ29ubmVjdGVkKGdhbWVwYWQpIHtcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tnYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn1cblxuXG5mdW5jdGlvbiBvbkdhbWVwYWREaXNjb25uZWN0ZWQoZ2FtZXBhZCkge1xuICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zW2dhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIGlzVGFwcGVkS2V5KGtleSkge1xuICAgIHJldHVybiBjdXJyZW50bHlQcmVzc2VkS2V5cy5oYXMoa2V5KSAmJiAhcHJldmlvdXNseVByZXNzZWRLZXlzLmhhcyhrZXkpO1xufVxuXG5cbmZ1bmN0aW9uIGlzUHJlc3NlZEtleShrZXkpIHtcbiAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEtleXMuaGFzKGtleSk7XG59XG5cblxuZnVuY3Rpb24gZ2V0UHJlc3NlZEtleXMoKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoY3VycmVudGx5UHJlc3NlZEtleXMpO1xufVxuXG5cbmZ1bmN0aW9uIGdldFRhcHBlZEtleXMoKSB7XG4gICAgY29uc3QgdGFwcGVkS2V5cyA9IG5ldyBTZXQoKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBjdXJyZW50bHlQcmVzc2VkS2V5cykge1xuICAgICAgICBpZiAoIXByZXZpb3VzbHlQcmVzc2VkS2V5cy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGFwcGVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFwcGVkS2V5cztcbn1cblxuXG5mdW5jdGlvbiBnZXRQcmVzc2VkQnV0dG9ucygpIHtcbiAgICByZXR1cm4gY3VycmVudGx5UHJlc3NlZEJ1dHRvbnMubWFwKHMgPT4gbmV3IFNldChzKSk7XG59XG5cblxuZnVuY3Rpb24gZ2V0VGFwcGVkQnV0dG9ucygpIHtcbiAgICBjb25zdCB0YXBwZWRCdXR0b25zID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50bHlQcmVzc2VkQnV0dG9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBzID0gbmV3IFNldCgpO1xuICAgICAgICBmb3IgKGNvbnN0IGJ1dHRvbiBvZiBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tpXSkge1xuICAgICAgICAgICAgaWYgKCFwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbaV0uaGFzKGJ1dHRvbikpIHtcbiAgICAgICAgICAgICAgICBzLmFkZChidXR0b24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRhcHBlZEJ1dHRvbnMucHVzaChzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcHBlZEJ1dHRvbnM7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlSW5wdXRzKCkge1xuICAgIHByZXZpb3VzbHlQcmVzc2VkS2V5cyA9IGN1cnJlbnRseVByZXNzZWRLZXlzO1xuICAgIGN1cnJlbnRseVByZXNzZWRLZXlzID0gbmV3IFNldChwcmVzc2VkS2V5cyk7XG4gICAgcHJldmlvdXNseVByZXNzZWRCdXR0b25zID0gY3VycmVudGx5UHJlc3NlZEJ1dHRvbnM7XG4gICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGdhbWVwYWQgb2YgbmF2aWdhdG9yLmdldEdhbWVwYWRzKCkpIHtcbiAgICAgICAgaWYgKGdhbWVwYWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGkgPSBnYW1lcGFkLmluZGV4O1xuICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0gPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVwYWQuYnV0dG9ucy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmJ1dHRvbnNbal0ucHJlc3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tpXS5hZGQoaik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJldmlvdXNseVByZXNzZWRCdXR0b25zW2ldLmhhcyhqKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVwYWQuYXhlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGxldCBidXR0b25JbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYXhlc1tqXSA+IEFYRVNfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbkluZGV4ID0gMiAqIGogKyBnYW1lcGFkLmJ1dHRvbnMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZ2FtZXBhZC5heGVzW2pdIDwgLUFYRVNfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbkluZGV4ID0gMiAqIGogKyBnYW1lcGFkLmJ1dHRvbnMubGVuZ3RoICsgMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJ1dHRvbkluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zW2ldLmFkZChidXR0b25JbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJldmlvdXNseVByZXNzZWRCdXR0b25zW2ldLmhhcyhidXR0b25JbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJ1dHRvbkluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZEluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5nYW1lcGFkbWFwID0ge1xuICAgICAgICAgICAgdXA6IDEyLFxuICAgICAgICAgICAgZG93bjogMTMsXG4gICAgICAgICAgICBsZWZ0OiAxNCxcbiAgICAgICAgICAgIHJpZ2h0OiAxNSxcbiAgICAgICAgICAgIGp1bXA6IDAsXG4gICAgICAgICAgICBkYXNoOiAxLFxuICAgICAgICAgICAgcGF1c2U6IDksXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rZXltYXAgPSB7XG4gICAgICAgICAgICB1cDogJ0Fycm93VXAnLFxuICAgICAgICAgICAgZG93bjogJ0Fycm93RG93bicsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBqdW1wOiAnZycsXG4gICAgICAgICAgICBkYXNoOiAnZicsXG4gICAgICAgICAgICBwYXVzZTogJ0VzY2FwZScsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7XG4gICAgICAgICAgICBqdW1wQnVmZmVyOiAwLFxuICAgICAgICAgICAgZGFzaEJ1ZmZlcjogMCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpc1ByZXNzZWQoYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50bHlQcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbYWN0aW9uXSkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0gJiZcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0uaGFzKHRoaXMuZ2FtZXBhZG1hcFthY3Rpb25dKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBpc1ByZXZpb3VzbHlQcmVzc2VkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gcHJldmlvdXNseVByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFthY3Rpb25dKSB8fFxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIHByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0gJiZcbiAgICAgICAgICAgICAgICBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdLmhhcyh0aGlzLmdhbWVwYWRtYXBbYWN0aW9uXSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgaXNUYXBwZWQoYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzUHJlc3NlZChhY3Rpb24pICYmICF0aGlzLmlzUHJldmlvdXNseVByZXNzZWQoYWN0aW9uKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy54QXhpcyA9ICh0aGlzLmlzUHJlc3NlZChcImxlZnRcIikgPyAtMSA6IDApICsgKHRoaXMuaXNQcmVzc2VkKFwicmlnaHRcIikgPyAxIDogMCk7XG4gICAgICAgIHRoaXMueUF4aXMgPSAodGhpcy5pc1ByZXNzZWQoXCJ1cFwiKSA/IDEgOiAwKSArICh0aGlzLmlzUHJlc3NlZChcImRvd25cIikgPyAtMSA6IDApO1xuICAgICAgICBpZiAodGhpcy5pc1RhcHBlZChcImp1bXBcIikpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPSBKVU1QX0JVRkZFUl9USU1FO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmlzVGFwcGVkKFwiZGFzaFwiKSkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVySW5wdXRzLFxuICAgIG9uR2FtZXBhZENvbm5lY3RlZCxcbiAgICBvbkdhbWVwYWREaXNjb25uZWN0ZWQsXG4gICAgdXBkYXRlSW5wdXRzLFxuICAgIHByZXNzZWRLZXlzLFxuICAgIGlzVGFwcGVkS2V5LFxuICAgIGlzUHJlc3NlZEtleSxcbiAgICBnZXRQcmVzc2VkS2V5cyxcbiAgICBnZXRUYXBwZWRLZXlzLFxuICAgIGdldFByZXNzZWRCdXR0b25zLFxuICAgIGdldFRhcHBlZEJ1dHRvbnMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBnbG9iYWxzID0gcmVxdWlyZSgnLi9nbG9iYWxzJyk7XG5jb25zdCBncmFwaGljcyA9IHJlcXVpcmUoJy4vZ3JhcGhpY3MnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBtYXBzID0gcmVxdWlyZSgnLi9tYXBzXycpO1xuY29uc3QgbWVudSA9IHJlcXVpcmUoJy4vbWVudScpO1xuY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcblxubGV0IGN1cnJlbnRTY2VuZTtcbmxldCBjb250ZXh0O1xubGV0IGZyYW1lQ291bnRlciA9IDA7XG5sZXQgZnJhbWVSYXRlUmVmcmVzaCA9IDU7XG5sZXQgZnJhbWVSYXRlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuXG5mdW5jdGlvbiBzZXRTY2FsaW5nKHNjYWxlKSB7XG4gICAgZ2xvYmFscy5zY2FsaW5nID0gc2NhbGU7XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBzY2FsZX1weGA7XG4gICAgc2NyZWVuLnN0eWxlLmhlaWdodCA9IGAke2NvbnN0YW50cy5WSUVXX0hFSUdIVCAqIHNjYWxlfXB4YDtcblxuICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2NyZWVuLWNhbnZhc1wiKTtcbiAgICBjYW52YXMud2lkdGggPSBzY2FsZSAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBzY2FsZSAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICBjb250ZXh0LnNldFRyYW5zZm9ybShzY2FsZSwgMCwgMCwgc2NhbGUsIDAsIDApO1xuICAgIGNvbnRleHQuc2NhbGUoZ2xvYmFscy5zY2FsaW5nLCBnbG9iYWxzLnNjYWxpbmcpO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGZyYW1lQ291bnRlciArPSAxO1xuICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGAke2ZyYW1lQ291bnRlciAvIGZyYW1lUmF0ZVJlZnJlc2h9IEZQU2ApO1xuICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgIH1cblxuICAgIGlucHV0cy51cGRhdGVJbnB1dHMoKTtcbiAgICBmb3IgKGNvbnN0IHBsYXllciBvZiBnbG9iYWxzLnBsYXllcnMpIHtcbiAgICAgICAgcGxheWVyLnVwZGF0ZSgpO1xuICAgIH1cbiAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjb25zdGFudHMuVklFV19XSURUSCwgY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcblxuICAgIGlmIChtZW51Lm1lbnVTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1lbnUubWVudVN0YWNrWzBdLnVwZGF0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoMSAvIDYwKTtcbiAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgaWYgKGN1cnJlbnRTY2VuZS50cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgIHByZXZTY2VuZS50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgY29uc3RhbnRzLlZJRVdfV0lEVEgsIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgaWYgKG1lbnUubWVudVN0YWNrWzBdKSB7XG4gICAgICAgIG1lbnUubWVudVN0YWNrWzBdLmRyYXcoY29udGV4dCk7XG4gICAgfVxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xufVxuXG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8ga2V5Ym9hcmQgZXZlbnRzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBnbG9iYWxzLnNjYWxpbmd9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBnbG9iYWxzLnNjYWxpbmd9cHhgO1xuXG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzY3JlZW4tY2FudmFzXCIpO1xuICAgIGNhbnZhcy53aWR0aCA9IGdsb2JhbHMuc2NhbGluZyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBnbG9iYWxzLnNjYWxpbmcgKiBjb25zdGFudHMuVklFV19IRUlHSFQ7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGNvbnRleHQuc2NhbGUoZ2xvYmFscy5zY2FsaW5nLCBnbG9iYWxzLnNjYWxpbmcpO1xuICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICAvLyBsb2FkIGFsbCBzY2VuZXMgYW5kIHN0YXJ0IGdhbWVcbiAgICBncmFwaGljcy5sb2FkR3JhcGhpY3MudGhlbigoKSA9PiB7XG4gICAgICAgIGdsb2JhbHMucGxheWVycy5wdXNoKG5ldyBwbGF5ZXIuUGxheWVyKCdibHVlJykpO1xuICAgICAgICBjdXJyZW50U2NlbmUgPSBtYXBzLnNjZW5lcy5jZWxlc3RlMDE7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zcGF3blBvaW50SW5kZXggPSAxO1xuICAgICAgICBjdXJyZW50U2NlbmUuYWRkQWN0b3IoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlcik7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5yZXNldCgpO1xuICAgICAgICB1cGRhdGUoKTtcbiAgICB9KTtcbn07XG5cblxuLy8gR2FtZXBhZCBBUElcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiZ2FtZXBhZGNvbm5lY3RlZFwiLCAoZXZlbnQpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcIkEgZ2FtZXBhZCBjb25uZWN0ZWQ6XCIpO1xuICAgIGNvbnNvbGUubG9nKGV2ZW50LmdhbWVwYWQpO1xuICAgIGlucHV0cy5vbkdhbWVwYWRDb25uZWN0ZWQoZXZlbnQuZ2FtZXBhZCk7XG59KTtcblxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMub25HYW1lcGFkRGlzY29ubmVjdGVkKGV2ZW50LmdhbWVwYWQpO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGVmZmVjdCA9IHJlcXVpcmUoJy4vZWZmZWN0Jyk7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBzY2VuZSA9IHJlcXVpcmUoJy4vc2NlbmUnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jb25zdCBzY2VuZXMgPSB7fTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIGluZGV4MSwgc2NlbmUyLCB4MiwgaW5kZXgyLCB3aWR0aCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oeDIgKiBVLCBzY2VuZTIuaGVpZ2h0LCB3aWR0aCAqIFUsIDAsIHNjZW5lMSwgeDEgKiBVLCAyICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHkxLCBpbmRleDEsIHNjZW5lMiwgeTIsIGluZGV4MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oc2NlbmUxLndpZHRoLCB5MSAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMiwgVSwgeTIgKiBVLCBpbmRleDIpKTtcbiAgICBzY2VuZTIuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlVHJpZ2dlckJsb2NrKHgxLCB5MSwgeDIsIHkyLCB3aWR0aCwgaGVpZ2h0LCBzcGVlZCA9IDIwLCBkZWxheSA9IC4yNSkge1xuICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KCh4MiAtIHgxKSAqICh4MiAtIHgxKSArICh5MiAtIHkxKSAqICh5MiAtIHkxKSk7XG4gICAgY29uc3QgZHVyYXRpb24xID0gZGlzdGFuY2UgLyBzcGVlZDtcbiAgICBjb25zdCBkdXJhdGlvbjIgPSBkaXN0YW5jZSAvIDc7XG4gICAgcmV0dXJuIG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jayh4MSAqIFUsIHkxICogVSwgd2lkdGggKiBVLCBoZWlnaHQgKiBVLCBkZWxheSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDEgKiBVLCB5MSAqIFUsIHgyICogVSwgeTIgKiBVLCBkdXJhdGlvbjEpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCh4MiAqIFUsIHkyICogVSwgeDEgKiBVLCB5MSAqIFUsIGR1cmF0aW9uMiksXG4gICAgXSkpO1xufVxuXG5mdW5jdGlvbiBtYWtlRmFsbGluZ0Jsb2NrKHgxLCB5MSwgeDIsIHkyLCB3aWR0aCwgaGVpZ2h0LCBkZWxheSA9IC41KSB7XG4gICAgcmV0dXJuIG5ldyBwaHlzaWNzLkZhbGxpbmdCbG9jayh4MSAqIFUsIHkxICogVSwgd2lkdGggKiBVLCBoZWlnaHQgKiBVLCBkZWxheSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDEgKiBVLCB5MSAqIFUsIHgyICogVSwgeTIgKiBVLCAoeTIgLSB5MSkgLyAyNSksXG4gICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEsIC0xKSxcbiAgICBdKSk7XG59XG5cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZm9ybWF0XCI6XCJqc29uXCIsXG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCJjZWxlc3RlMDEuanNvblwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTIsIDE4LCAxOCwgMTMsIDE4LCAxMywgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNSwgMCwgMTcsIDE4LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE1LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDI2LCAyNywgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMjYsIDI2LCAyNiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyNiwgMjYsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgNSwgNSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMjAsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjo4LFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTAxID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZm9ybWF0XCI6XCJqc29uXCIsXG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCJjZWxlc3RlMDIuanNvblwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEyLCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgMjYsIDI2LCAyNiwgMjYsIDI2LCAxMiwgMTksIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMTQsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgMjYsIDI2LCAyNiwgMjYsIDI2LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAzNCwgMzQsIDM0LCAzNCwgMzQsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCA1LCA1LCA1LCAyNiwgMjYsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwMiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDcsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgNDEsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0LCAyMSwgMTAsIDYsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwMyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAzMiwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDQ4LCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgNDQsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgNSwgMzUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDM4LCAzOSwgMzksIDQwLCAxLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA0ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTQsIDEwLCAyMywgOSwgMywgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyMCwgNSwgNSwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCAyLCAyLCAzLCAxNywgMTksIDEsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDUgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDE0LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDMyLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMSwgNDgsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDIzLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAyMCwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMjYsIDI3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgNDEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDYsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTgsIDE4LCAxMywgMTAsIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDE5LCAwLCAwLCA5LCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMiwgMywgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDksIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMjAsIDYsIDQ2LCA0NywgNDcsIDQ4LCA0LCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOCwgNDAsIDEsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDYgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxMywgMzMsIDEzLCAyMywgNCwgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjM1LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNSwgNTMsIDU0LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMiwgMywgNDYsIDQ4LCAwLCAwLCAwLCA0LCAyMSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQxLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA2LCAzOCwgMzksIDM5LCA0MCwgMTcsIDE4LCAxMywgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDIwLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMTcsIDE4LCAyNywgMzgsIDM5LCA0MCwgNCwgNSwgNSwgMzUsIDQ2LCA0NywgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDQsIDIsIDIsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAxLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA3ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxLCAyLCAyLCAyLCAzLCAzOCwgMzksIDM5LCA0MCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyLCAzLCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNSwgMjYsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgNDQsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNCwgNiwgMCwgMCwgNDQsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDggPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNCwgMTYsIDIxLCAxMiwgMiwgMykpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxOCwgMTgsIDE4LCAzNCwgMzUsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDIxLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMjIsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDI2LCAzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDQ2LCA0NywgNDcsIDQ4LCA0LCAyMSwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDEsIDIsIDIxLCAxMSwgMCwgMTQsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCAxLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDkgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMiwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTAgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMiwgMTgsIDM0LCAzNCwgMzQsIDIxLCAyLCAzLCAwLCAwLCAwLCAxNSwgMCwgMCwgMSwgNSwgNSwgNSwgMTgsIDM0LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAzNCwgMzQsIDM0LCAxOCwgMjYsIDI2LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA1OCwgNTgsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTAsIDExLCAwLCAwLCAwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMjAsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDI1LCAyNiwgMiwgMiwgNSwgNSwgNSwgNSwgNSwgMiwgMiwgMiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTEgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMSwgMiwgMiwgMiwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDgsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDM1LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAyMywgMCwgMCwgMTcsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDQzLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxLCAyLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDMyLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDM0LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgMzQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCAzLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDIwLCAzNCwgMzQsIDM0LCAzNCwgMzQsIDYsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCA1LCAzNCwgMzQsIDM0LCAxOCwgMTEsIDAsIDE1LCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTUsIDAsIDE3LCAyNiwgMjYsIDI2LCAzNCwgMzQsIDM0LCAzNCwgMzQsIDM0LCA2LCA0NiwgNDgsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDksIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQ4LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0OFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxMiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCAzOSwgMzksIDQwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMiwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDUsIDUsIDIsIDIsIDIsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDksXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQ5XG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTEzID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAyMCwgNSwgNiwgMzgsIDQwLCA0LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDYsIDM4LCA0MCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDEsIDI2LCAzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAxNSwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxLCAyMSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAzNCwgMjEsIDM0LCA2LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMTUsIDAsIDksIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMTUsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMzQsIDE4LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDgsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAyMywgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAzMywgMzUsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAyLCAyLCAzLCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTQgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxMSwgMjksIDE5LCAyOSwgNCwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyNiwgMjgsIDI2LCAyMiwgNSwgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAzOCwgNDAsIDQsIDUsIDUsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDIsIDIsIDYsIDAsIDAsIDAsIDksIDEwLCAxMCwgMiwgMiwgMywgNDcsIDQ4LCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE5LCA1OCwgNTgsIDU4LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDYsIDM4LCAzOSwgMzksIDQwLCAxLCAyLCAyLCAyLCA1LCA1LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgNDEsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCA0LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjksXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjksXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxNSA9IHM7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jaygyNCwgNiwgMjQsIDE3LCAyLCA2KTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI0ICogVSwgNSAqIFUpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDUgKiBVKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczEpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuXG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE1LCAyMCwgOSwgMjAsIDIsIDQpKTtcblxufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNCwgMzQsIDM0LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAzNCwgNSwgNSwgNSwgNSwgMzUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA3LCA0NiwgNDcsIDQ3LCA0NywgNDgsIDEsIDIsIDIsIDIsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6OTYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjk2XG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE2ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMiwgMiwgMjcsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyLCAyLCAyLCAyLCAyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxNyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyNCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDE0LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzMsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCA0MCwgMSwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI0LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTggPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjM4LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDM5LCAzOSwgNDAsIDEsIDIsIDIsIDIsIDMsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozOCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE5ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjAsIDE1LCAyMCwgNywgMiwgNCkpO1xuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygyOCwgOSwgMjgsIDM1LCAzLCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCA2LCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMzIsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA5LCAyMCwgMiwgMiwgMiwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDExLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzMsIDM0LCAzNCwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjAgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDE4LCAxOCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDE3LCAxMCwgMTAsIDIwLCA1LCAyNiwgMjYsIDI3LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCA5LCAxMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMiwgMjcsIDU4LCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDgsIDQ2LCA0NywgNDgsIDMzLCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAyMCwgMywgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCA0LCA2LCAwLCAwLCAwLCA0MSwgNDEsIDQsIDYsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgNDAsIDQsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTEsIDQxLCA0MSwgNDEsIDQsIDUsIDIxLCAxMSwgMCwgMCwgOSwgMTEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAyMCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTEsIDQxLCA0MSwgOSwgMjAsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCA5LCAxMSwgNTMsIDU0LCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDYsIDAsIDksIDIwLCA1LCA2LCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjEgPSBzO1xuICAgIGNvbnN0IGZhbGxpbmdCbG9jayA9IG1ha2VGYWxsaW5nQmxvY2soMTQsIDcsIDE0LCAxNSwgMiwgNywgLjc1KTtcbiAgICBzLmFkZFNvbGlkKGZhbGxpbmdCbG9jayk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDE0ICogVSwgNiAqIFUpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxNSAqIFUsIDYgKiBVKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczEpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgZmFsbGluZ0Jsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICBmYWxsaW5nQmxvY2suYXR0YWNoKHNwaWtlczIpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCA0MywgNDMsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAzNCwgMzQsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAzOCwgMzksIDQwLCA0LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMSwgNSwgNSwgNSwgNSwgNSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMSwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCA1LCA1LCAyMSwgMTAsIDIwLCAyLCAzLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjIgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygzMywgMTUsIDMzLCA5LCAzLCAzKSk7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jaygyNSwgNiwgMTMsIDYsIDIsIDMpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDUgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjYgKiBVLCA1ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjcsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMTcsIDE4LCAxOCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDMsIDQzLCA0MywgMCwgNDMsIDQzLCA0MywgMTUsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDIsIDIsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMjYsIDI3LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDQ2LCA0NywgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0NixcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0NixcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDZcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjMgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyMiwgMTgsIDIyLCA5LCAyLCAyKSk7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDI5LCAxOSwgMjksIDEwLCAyLCAyKSk7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDM2LCAxNywgMzYsIDgsIDIsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCA0MywgNDMsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMTQsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAxLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDE3LCAxMywgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDIsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDE4LCAxOCwgMTMsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgNDIsIDAsIDAsIDQ0LCAyMywgMCwgMCwgOSwgMTAsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyNCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE3LCAxOCwgMTcsIDEyLCA0LCAyKSk7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDI4LCAxOSwgMjgsIDEyLCA2LCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMTcsIDE4LCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCAwLCAxLCAyLCAzLCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAzOCwgMzksIDQwLCAxLCAyLCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDQzLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjUgPSBzO1xuICAgIGNvbnN0IGZhbGxpbmdCbG9jazEgPSBtYWtlRmFsbGluZ0Jsb2NrKDE5LCAxNiwgMTksIDI1LCA0LCAzKTtcbiAgICBzLmFkZFNvbGlkKGZhbGxpbmdCbG9jazEpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KDIzICogVSwgMTcgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoMjMgKiBVLCAxOCAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDE5ICogVSwgMTkgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigyMCAqIFUsIDE5ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oMjEgKiBVLCAxOSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIyICogVSwgMTkgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMSkge1xuICAgICAgICBmYWxsaW5nQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cblxuICAgIGNvbnN0IGZhbGxpbmdCbG9jazIgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA2LCAyMywgMjUsIDIsIDQpO1xuICAgIHMuYWRkU29saWQoZmFsbGluZ0Jsb2NrMik7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IFtcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCgyMiAqIFUsIDcgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCgyMiAqIFUsIDggKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMikge1xuICAgICAgICBmYWxsaW5nQmxvY2syLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOCwgMTksIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzgsIDM5LCA0MCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDcsIDQ4LCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI2ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDksIDksIDI2LCA5LCAzLCA1LCAzNSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlcyA9IFtcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoOSAqIFUsIDggKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTAgKiBVLCA4ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDExICogVSwgOCAqIFUpLFxuICAgIF1cbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlKTtcbiAgICAgICAgcy5hZGRUaGluZyhzcGlrZSk7XG4gICAgfVxufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgNDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAzMiwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDExLCAwLCAzMywgMzQsIDM1LCA1OCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgNDYsIDQ4LCAyNSwgMiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAxNCwgMCwgNDQsIDksIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDE1LCAwLCAwLCA0NCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgNDQsIDksIDEwLCAyMCwgNSwgMiwgMiwgMiwgNSwgNSwgNSwgNSwgMzUsIDQ2LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCA0OCwgMCwgNDQsIDksIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAyLCAyLCAyLCAyLCAyLCAzLCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjcgPSBzO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMiwgOSwgMTAsIDksIDMsIDQsIDM1KTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMiAqIFUsIDggKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMyAqIFUsIDggKiBVKTtcbiAgICBjb25zdCBzcGlrZXMzID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoNCAqIFUsIDggKiBVKTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMyk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMyk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyOCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCA1LCA1LCAyLCAyLCAyLCA1LCA2LCAzOCwgMzksIDM5LCA0MCwgNCwgNSwgMjEsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA1OCwgNTgsIDU4LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDIsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDMsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCAwLCAwLCAxLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAzNCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI4ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTYsIDI1LCAxNiwgMTksIDYsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTIsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDM4LCAzOSwgMzksIDQwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMiwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNSwgNDYsIDQ3LCA0NywgNDgsIDMzLCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDksIDExLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDksIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyOSA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzMCA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgNDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTMsIDU0LCAxLCAzLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzMSA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDQsIDIwLCAxMiwgMjAsIDQsIDIsIDMwKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyOCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMywgMCwgMCwgNDEsIDQxLCA0LCA2LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MSwgNDEsIDQsIDUsIDEyLCAxOSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCA0MCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDksIDIwLCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzOCwgNDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzgsIDQwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzMiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjozMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgMiwgMiwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDI2LCAyNiwgMjYsIDI2LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzMsIDM0LCAzNCwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgOSwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAzNCwgMzQsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgNCwgNSwgNSwgNiwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgNTMsIDU0LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDIsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDEsIDIsIDIsIDIsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgNDYsIDQ3LCA0OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjUxLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjUxLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo1MVxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzMyA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDEsIDIyLCA4LCAyMiwgMywgMywgMzApKTtcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDQ4LCAxNSwgNDgsIDcsIDIsIDQpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0OCAqIFUsIDE0ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDQ5ICogVSwgMTQgKiBVKTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDE3LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDIxLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgMjEsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDYsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgOSwgMTEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyMCwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDgsIDEsIDIxLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAyMCwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MixcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MixcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NTJcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzQgPSBzO1xuICAgIGNvbnN0IGZhbGxpbmdCbG9jayA9IG1ha2VGYWxsaW5nQmxvY2soMjMsIDgsIDIzLCAyMywgMywgNCk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlcyA9IFtcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjMgKiBVLCA3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI0ICogVSwgNyAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDcgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzKSB7XG4gICAgICAgIGZhbGxpbmdCbG9jay5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG4gICAgcy5hZGRTb2xpZChtYWtlRmFsbGluZ0Jsb2NrKDExLCAxNiwgMTEsIDI1LCAyLCAzKSk7XG4gICAgcy5hZGRTb2xpZChtYWtlRmFsbGluZ0Jsb2NrKDE0LCAzLCAxNCwgMjIsIDMsIDUpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzNSA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjo0MyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgNywgNDYsIDQ3LCA0NywgNDgsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMzgsIDM5LCAzOSwgNDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMzgsIDM5LCAzOSwgMzksIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMCwgMCwgMCwgMCwgNCwgNiwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDMyLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMiwgMiwgMiwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjo0MyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjQzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzYgPSBzO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jazEgPSBtYWtlVHJpZ2dlckJsb2NrKDIsIDI2LCA5LCAyNiwgMiwgMywgMzApO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrMSk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IFtcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMiAqIFUsIDI1ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDMgKiBVLCAyNSAqIFUpLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMxKSB7XG4gICAgICAgIHRyaWdnZXJCbG9jazEuYXR0YWNoKHNwaWtlKTtcbiAgICAgICAgcy5hZGRUaGluZyhzcGlrZSk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJpZ2dlckJsb2NrMiA9IG1ha2VUcmlnZ2VyQmxvY2soMzUsIDIzLCAzNSwgMTUsIDMsIDQpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrMik7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IFtcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMzUgKiBVLCAyMiAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzNiAqIFUsIDIyICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDM3ICogVSwgMjIgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMikge1xuICAgICAgICB0cmlnZ2VyQmxvY2syLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgMiwgMiwgMiwgMiwgNSwgNSwgNSwgNSwgNSwgNSwgMTAsIDIwLCA1LCA1LCAyLCAzLCA0NiwgNDcsIDQ4LCAxLCAyLCAyLCAyLCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM3ID0gcztcbn1cblxuLy8ge1xuLy8gICAgIHt7bG91aXMwMX19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczAyfX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDN9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwNH19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczA1fX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDZ9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwN319XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczA4fX1cbi8vIH1cblxuXG4vLyBUcmFuc2l0aW9uc1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTAxLCAzMSwgMCwgc2NlbmVzLmNlbGVzdGUwMiwgMSwgMSwgNSk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMDIsIDM0LCAwLCBzY2VuZXMuY2VsZXN0ZTAzLCAyLCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwMywgMzMsIDAsIHNjZW5lcy5jZWxlc3RlMDQsIDMsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTA0LCAyMSwgMCwgc2NlbmVzLmNlbGVzdGUwNSwgNCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMDUsIDIyLCAwLCBzY2VuZXMuY2VsZXN0ZTA2LCAzLCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUwNywgMjksIDAsIHNjZW5lcy5jZWxlc3RlMDYsIDMwLCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUwNiwgMzAsIDIsIHNjZW5lcy5jZWxlc3RlMDgsIDUsIDAsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTA2LCAzNSwgMCwgc2NlbmVzLmNlbGVzdGUwOSwgMSwgMiwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTAsIDcsIDAsIHNjZW5lcy5jZWxlc3RlMDksIDcsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTExLCA4LCAxLCBzY2VuZXMuY2VsZXN0ZTEwLCA4LCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUxMCwgMiwgMSwgc2NlbmVzLmNlbGVzdGUxMiwgNDIsIDEsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTExLCAzLCAwLCBzY2VuZXMuY2VsZXN0ZTEyLCAzLCAwLCAyKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUwOSwgMCwgMCwgc2NlbmVzLmNlbGVzdGUxMywgMCwgMCwgMTApO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTEzLCAuNSwgMSwgc2NlbmVzLmNlbGVzdGUxNCwgMjIuNSwgMiwgMTApO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE1LCAyMiwgMSwgc2NlbmVzLmNlbGVzdGUxNCwgNCwgMCwgNSk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTYsIDE5LCAwLCBzY2VuZXMuY2VsZXN0ZTE1LCAyLCAwLCAyKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxNCwgMSwgMSwgc2NlbmVzLmNlbGVzdGUxNywgMTAsIDIsIDkpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE4LCAxNywgMCwgc2NlbmVzLmNlbGVzdGUxNywgMiwgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMTgsIDE5LCAwLCBzY2VuZXMuY2VsZXN0ZTE5LCAxMywgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTksIDIsIDAsIHNjZW5lcy5jZWxlc3RlMjAsIDIsIDAsIDIpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTIwLCAxMiwgMSwgc2NlbmVzLmNlbGVzdGUyMSwgOCwgMiwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjEsIDI2LCAxLCBzY2VuZXMuY2VsZXN0ZTIyLCAyNiwgMCwgMSk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjMsIDcsIDAsIHNjZW5lcy5jZWxlc3RlMjEsIDI3LCAzLCA3KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyMSwgMiwgMCwgc2NlbmVzLmNlbGVzdGUyNCwgOCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMTcsIDMzLCAxLCBzY2VuZXMuY2VsZXN0ZTI1LCA3LCAwLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyNSwgMjIsIDAsIHNjZW5lcy5jZWxlc3RlMjEsIDIsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI0LCAzMiwgMCwgc2NlbmVzLmNlbGVzdGUyNiwgNCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjYsIDMsIDAsIHNjZW5lcy5jZWxlc3RlMjcsIDE2LCAzLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyNywgMiwgMSwgc2NlbmVzLmNlbGVzdGUyOCwgMjgsIDIsIDUpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTI5LCAxMywgMSwgc2NlbmVzLmNlbGVzdGUyOCwgMTgsIDEsIDUpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTMwLCA2LCAwLCBzY2VuZXMuY2VsZXN0ZTI5LCA2LCAwLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyNywgNiwgMiwgc2NlbmVzLmNlbGVzdGUzMSwgNiwgMCwgMik7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjcsIDMxLCAwLCBzY2VuZXMuY2VsZXN0ZTMyLCAxNywgMSwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjgsIDUsIDAsIHNjZW5lcy5jZWxlc3RlMzMsIDUsIDEsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI4LCAyOCwgMiwgc2NlbmVzLmNlbGVzdGUzMywgMjgsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTMyLCA0LCAwLCBzY2VuZXMuY2VsZXN0ZTMzLCA0NCwgMywgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMzMsIDEwLCAwLCBzY2VuZXMuY2VsZXN0ZTM0LCAzLCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzNSwgMTMsIDAsIHNjZW5lcy5jZWxlc3RlMzQsIDMsIDAsIDMpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTM0LCAxNSwgMSwgc2NlbmVzLmNlbGVzdGUzNiwgMjksIDEsIDkpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTM2LCA4LCAwLCBzY2VuZXMuY2VsZXN0ZTM3LCA2LCAwLCAzKTtcblxuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwMSwgMzUsIDAsIHNjZW5lcy5sb3VpczAyLCA0LCAxLCAzKTtcbi8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmxvdWlzMDMsIDMsIDAsIHNjZW5lcy5sb3VpczAyLCAxMywgMCwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczAzLCAzMCwgMSwgc2NlbmVzLmxvdWlzMDIsIDIzLCAyLCAzKTtcbi8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmxvdWlzMDQsIDQsIDAsIHNjZW5lcy5sb3VpczAyLCAzNSwgMywgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczA1LCAzMywgMCwgc2NlbmVzLmxvdWlzMDYsIDEsIDEsIDUpO1xuLy8gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMubG91aXMwNiwgOCwgMCwgc2NlbmVzLmxvdWlzMDcsIDgsIDEsIDYpO1xuLy8gc2NlbmVzLmxvdWlzMDYuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigxMS41ICogVSwgMTUgKiBVLCAwLCAzICogVSwgc2NlbmVzLmxvdWlzMDgsIFUsIDEzICogVSwgMCkpO1xuLy8gc2NlbmVzLmxvdWlzMDguYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCAxMyAqIFUsIDAsIDMgKiBVLCBzY2VuZXMubG91aXMwNiwgMTAgKiBVLCAxNSAqIFUsIDEpKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2NlbmVzLFxufVxuIiwiY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcblxuY29uc3QgTUVOVV9GT05UX1NJWkUgPSAxMjtcbmNvbnN0IE1FTlVfUEFERElORyA9IDU7XG5jb25zdCBtZW51U3RhY2sgPSBbXTtcblxuXG5jbGFzcyBNZW51TGluZSB7XG4gICAgY29uc3RydWN0b3IodGV4dCkge1xuICAgICAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgIH1cblxuICAgIGRyYXcoY3R4LCB5LCB0ZXh0Q29sb3IgPSBcIiMwMDAwMDBcIiwgYmdDb2xvciA9IFwiI2ZmZmZmZmNjXCIpIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGJnQ29sb3I7XG4gICAgICAgIGNvbnN0IHRleHRNZXRyaWNzID0gY3R4Lm1lYXN1cmVUZXh0KHRoaXMudGV4dCk7XG4gICAgICAgIGN0eC5maWxsUmVjdChcbiAgICAgICAgICAgIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiAtIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94TGVmdCAtIE1FTlVfUEFERElORyxcbiAgICAgICAgICAgIHkgLSB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveEFzY2VudCAtIE1FTlVfUEFERElORyxcbiAgICAgICAgICAgIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94UmlnaHQgKyB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveExlZnQgKyAyICogTUVOVV9QQURESU5HLFxuICAgICAgICAgICAgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgKyAyICogTUVOVV9QQURESU5HKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRleHRDb2xvcjtcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMudGV4dCwgY29uc3RhbnRzLlZJRVdfV0lEVEggLyAyLCB5KTtcbiAgICB9XG59XG5cblxuY2xhc3MgTWVudU9wdGlvbiBleHRlbmRzIE1lbnVMaW5lIHtcbiAgICBjb25zdHJ1Y3Rvcih0ZXh0KSB7XG4gICAgICAgIHN1cGVyKHRleHQpO1xuICAgICAgICB0aGlzLmlzU2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5vbkFjdGl2YXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLm9uUmlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMub25MZWZ0ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGRyYXcoY3R4LCB5KSB7XG4gICAgICAgIGlmICh0aGlzLmlzU2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4LCB5LCAnI2ZmZmZmZicsICcjMDAwMDAwY2MnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4LCB5LCAnIzAwMDAwMCcsICcjZmZmZmZmY2MnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE9uQWN0aXZhdGUoZikge1xuICAgICAgICB0aGlzLm9uQWN0aXZhdGUgPSBmO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZXRPblJpZ2h0KGYpIHtcbiAgICAgICAgdGhpcy5vblJpZ2h0ID0gZjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0T25MZWZ0KGYpIHtcbiAgICAgICAgdGhpcy5vbkxlZnQgPSBmO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cblxuY2xhc3MgTWVudSB7XG4gICAgY29uc3RydWN0b3IodGl0bGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHRpdGxlKSB7XG4gICAgICAgICAgICB0aGlzLnRpdGxlID0gbmV3IE1lbnVMaW5lKHRpdGxlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpbmVzID0gW107XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4LmZvbnQgPSBgbm9ybWFsICR7TUVOVV9GT05UX1NJWkV9cHggZ2FtZWJveWA7XG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xuICAgICAgICBjb25zdCBsaW5lSGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KCdNJykuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgKyAyLjUgKiBNRU5VX1BBRERJTkc7XG5cbiAgICAgICAgbGV0IHlPZmZzZXQ7XG4gICAgICAgIGlmICh0aGlzLnRpdGxlKSB7XG4gICAgICAgICAgICB5T2Zmc2V0ID0gY29uc3RhbnRzLlZJRVdfSEVJR0hUIC8gMiAtIHRoaXMubGluZXMubGVuZ3RoICogbGluZUhlaWdodCAvIDI7XG4gICAgICAgICAgICB0aGlzLnRpdGxlLmRyYXcoY3R4LCB5T2Zmc2V0KTtcbiAgICAgICAgICAgIHlPZmZzZXQgKz0gMS41ICogbGluZUhlaWdodDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHlPZmZzZXQgPSBjb25zdGFudHMuVklFV19IRUlHSFQgLyAyIC0gKHRoaXMubGluZXMubGVuZ3RoIC0gMSkgKiBsaW5lSGVpZ2h0IC8gMjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiB0aGlzLmxpbmVzKSB7XG4gICAgICAgICAgICBsaW5lLmRyYXcoY3R4LCB5T2Zmc2V0KTtcbiAgICAgICAgICAgIHlPZmZzZXQgKz0gbGluZUhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lU2VsZWN0TWVudSBleHRlbmRzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKHRpdGxlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHRpdGxlKTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZCA9IDA7XG4gICAgICAgIHRoaXMuY2FuUXVpdCA9IHRydWU7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmxpbmVzW2ldLmlzU2VsZWN0ZWQgPSAoaSA9PT0gdGhpcy5zZWxlY3RlZCk7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgLy8gZGVmYXVsdCBtZW51IGNvbnRyb2xzXG4gICAgICAgIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJFc2NhcGVcIikgJiYgdGhpcy5jYW5RdWl0KSB7XG4gICAgICAgICAgICBtZW51U3RhY2suc2hpZnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJBcnJvd0Rvd25cIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkIDwgdGhpcy5saW5lcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlucHV0cy5pc1RhcHBlZEtleShcIkFycm93VXBcIikpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJBcnJvd1JpZ2h0XCIpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25SaWdodCkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vblJpZ2h0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5wdXRzLmlzVGFwcGVkS2V5KFwiQXJyb3dMZWZ0XCIpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25MZWZ0KSB7XG4gICAgICAgICAgICB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uTGVmdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGlucHV0cy5pc1RhcHBlZEtleShcIkVudGVyXCIpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vbkFjdGl2YXRlKCk7XG4gICAgICAgICAgICAvLyBwbGF5ZXItc3BlY2lmaWMgbWVudSBjb250cm9sc1xuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJwYXVzZVwiKSkgJiYgdGhpcy5jYW5RdWl0KSB7XG4gICAgICAgICAgICB3aGlsZSAobWVudVN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJkYXNoXCIpKSAmJiB0aGlzLmNhblF1aXQpIHtcbiAgICAgICAgICAgIG1lbnVTdGFjay5zaGlmdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJkb3duXCIpKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgPCB0aGlzLmxpbmVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcInVwXCIpKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZCAtPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGdsb2JhbHMucGxheWVycy5zb21lKHAgPT4gcC5pbnB1dHMuaXNUYXBwZWQoXCJyaWdodFwiKSkgJiYgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vblJpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmxpbmVzW3RoaXMuc2VsZWN0ZWRdLm9uUmlnaHQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnMuc29tZShwID0+IHAuaW5wdXRzLmlzVGFwcGVkKFwibGVmdFwiKSkgJiYgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vbkxlZnQpIHtcbiAgICAgICAgICAgIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25MZWZ0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcImp1bXBcIikpICYmIHRoaXMubGluZXNbdGhpcy5zZWxlY3RlZF0ub25BY3RpdmF0ZSkge1xuICAgICAgICAgICAgdGhpcy5saW5lc1t0aGlzLnNlbGVjdGVkXS5vbkFjdGl2YXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgQ29udHJvbHNNZW51IGV4dGVuZHMgTWVudSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IFtcInVwXCIsIFwiZG93blwiLCBcImxlZnRcIiwgXCJyaWdodFwiLCBcImp1bXBcIiwgXCJkYXNoXCIsIFwicGF1c2VcIl07XG4gICAgICAgIHRoaXMubGluZXMgPSBbXG4gICAgICAgICAgICBuZXcgTWVudUxpbmUoJ1ByZXNzIEtleS9CdXR0b24gZm9yJyksXG4gICAgICAgICAgICBuZXcgTWVudUxpbmUoKSxcbiAgICAgICAgXTtcbiAgICAgICAgdGhpcy5zZXRBY3Rpb25JbmRleCgwKTtcbiAgICB9XG5cbiAgICBzZXRBY3Rpb25JbmRleChpbmRleCkge1xuICAgICAgICB0aGlzLmFjdGlvbkluZGV4ID0gaW5kZXg7XG4gICAgICAgIHRoaXMubGluZXNbMV0udGV4dCA9IHRoaXMuYWN0aW9uc1t0aGlzLmFjdGlvbkluZGV4XS50b1VwcGVyQ2FzZSgpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgY29uc3QgdGFwcGVkS2V5cyA9IGlucHV0cy5nZXRUYXBwZWRLZXlzKCk7XG4gICAgICAgIGlmICh0YXBwZWRLZXlzLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uaW5wdXRzLmtleW1hcFt0aGlzLmFjdGlvbnNbdGhpcy5hY3Rpb25JbmRleF1dID0gdGFwcGVkS2V5cy52YWx1ZXMoKS5uZXh0KCkudmFsdWU7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25JbmRleCA+PSB0aGlzLmFjdGlvbnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgoMCk7XG4gICAgICAgICAgICAgICAgbWVudVN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWN0aW9uSW5kZXgodGhpcy5hY3Rpb25JbmRleCArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRhcHBlZEJ1dHRvbnMgPSBpbnB1dHMuZ2V0VGFwcGVkQnV0dG9ucygpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRhcHBlZEJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0YXBwZWRCdXR0b25zW2ldLnNpemUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFscy5wbGF5ZXJzWzBdLmlucHV0cy5nYW1lcGFkSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5pbnB1dHMuZ2FtZXBhZG1hcFt0aGlzLmFjdGlvbnNbdGhpcy5hY3Rpb25JbmRleF1dID0gdGFwcGVkQnV0dG9uc1tpXS52YWx1ZXMoKS5uZXh0KCkudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uSW5kZXggPj0gdGhpcy5hY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBY3Rpb25JbmRleCgwKTtcbiAgICAgICAgICAgICAgICAgICAgbWVudVN0YWNrLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBY3Rpb25JbmRleCh0aGlzLmFjdGlvbkluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8vIENvbnRyb2xzIG1hcHBpbmcgbWVudVxuY29uc3QgY29udHJvbHNNZW51ID0gbmV3IENvbnRyb2xzTWVudSgpO1xuLy8gR2VuZXJhbCBvcHRpb25zIG1lbnVcbmNvbnN0IG9wdGlvbnNNZW51ID0gbmV3IExpbmVTZWxlY3RNZW51KFwiT3B0aW9uc1wiKTtcbm9wdGlvbnNNZW51LmxpbmVzLnB1c2goXG4gICAgbmV3IE1lbnVPcHRpb24oXCJTRlggVm9sdW1lOiBsbGxsbCBcIilcbiAgICAgICAgLnNldE9uUmlnaHQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc291bmQuaW5jcmVtZW50U291bmRWb2x1bWUoKTtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiU0ZYIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5zZXRPbkxlZnQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc291bmQuZGVjcmVtZW50U291bmRWb2x1bWUoKTtcbiAgICAgICAgICAgIHRoaXMudGV4dCA9IFwiU0ZYIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRTb3VuZFZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pKTtcbm9wdGlvbnNNZW51LmxpbmVzLnB1c2goXG4gICAgbmV3IE1lbnVPcHRpb24oXCJNdXNpYyBWb2x1bWU6IGxsbGxsIFwiKVxuICAgICAgICAuc2V0T25SaWdodChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzb3VuZC5pbmNyZW1lbnRNdXNpY1ZvbHVtZSgpO1xuICAgICAgICAgICAgdGhpcy50ZXh0ID0gXCJNdXNpYyBWb2x1bWU6IFwiXG4gICAgICAgICAgICAgICAgKyBcImxcIi5yZXBlYXQoc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiLlwiLnJlcGVhdCg1IC0gc291bmQuZ2V0TXVzaWNWb2x1bWUoKSlcbiAgICAgICAgICAgICAgICArIFwiIFwiO1xuICAgICAgICB9KVxuICAgICAgICAuc2V0T25MZWZ0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNvdW5kLmRlY3JlbWVudE11c2ljVm9sdW1lKCk7XG4gICAgICAgICAgICB0aGlzLnRleHQgPSBcIk11c2ljIFZvbHVtZTogXCJcbiAgICAgICAgICAgICAgICArIFwibFwiLnJlcGVhdChzb3VuZC5nZXRNdXNpY1ZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIuXCIucmVwZWF0KDUgLSBzb3VuZC5nZXRNdXNpY1ZvbHVtZSgpKVxuICAgICAgICAgICAgICAgICsgXCIgXCI7XG4gICAgICAgIH0pKTtcbi8vIG9wdGlvbnNNZW51LmxpbmVzLnB1c2goXG4vLyAgICAgbmV3IE1lbnVPcHRpb24oXCJTY2FsZTogeDJcIilcbi8vICAgICAgICAgLnNldE9uUmlnaHQoZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgaWYgKGdsb2JhbHMuc2NhbGluZyA8IDQpIHtcbi8vICAgICAgICAgICAgICAgICBnbG9iYWxzLnNjYWxpbmcgKz0gMTtcbi8vICAgICAgICAgICAgIH1cbi8vICAgICAgICAgfSlcbi8vIClcbi8vIE1haW4gcGF1c2UgbWVudVxuY29uc3QgbWFpbk1lbnUgPSBuZXcgTGluZVNlbGVjdE1lbnUoXCJQYXVzZWRcIik7XG5tYWluTWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiUmVzdW1lXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKFwicmVzdW1lXCIpO1xuICAgIG1lbnVTdGFjay5zaGlmdCgpXG59KSk7XG5tYWluTWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiT3B0aW9uc1wiKS5zZXRPbkFjdGl2YXRlKGZ1bmN0aW9uICgpIHtcbiAgICBtZW51U3RhY2sudW5zaGlmdChvcHRpb25zTWVudSk7XG59KSk7XG5tYWluTWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiQ29udHJvbHNcIikuc2V0T25BY3RpdmF0ZShmdW5jdGlvbiAoKSB7XG4gICAgbWVudVN0YWNrLnVuc2hpZnQoY29udHJvbHNNZW51KTtcbn0pKTtcbi8vIG1haW5NZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJSZXN0YXJ0XCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuLy8gICAgIGNvbnNvbGUubG9nKFwicmVzdGFydC4uLlwiKTtcbi8vIH0pKTtcbi8vIEluaXRpYWwgbWVudVxuY29uc3Qgc3RhcnRNZW51ID0gbmV3IExpbmVTZWxlY3RNZW51KFwiU3F1YXJlanVtcFwiKTtcbnN0YXJ0TWVudS5jYW5RdWl0ID0gZmFsc2U7XG5zdGFydE1lbnUubGluZXMucHVzaChuZXcgTWVudU9wdGlvbihcIlN0YXJ0XCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIHNvdW5kLmJnTXVzaWMucGxheSgpO1xuICAgIG1lbnVTdGFjay5zaGlmdCgpO1xufSkpO1xuc3RhcnRNZW51LmxpbmVzLnB1c2gobmV3IE1lbnVPcHRpb24oXCJPcHRpb25zXCIpLnNldE9uQWN0aXZhdGUoZnVuY3Rpb24gKCkge1xuICAgIG1lbnVTdGFjay51bnNoaWZ0KG9wdGlvbnNNZW51KTtcbn0pKTtcbnN0YXJ0TWVudS5saW5lcy5wdXNoKG5ldyBNZW51T3B0aW9uKFwiQ29udHJvbHNcIikuc2V0T25BY3RpdmF0ZShmdW5jdGlvbiAoKSB7XG4gICAgbWVudVN0YWNrLnVuc2hpZnQoY29udHJvbHNNZW51KTtcbn0pKTtcblxuXG5tZW51U3RhY2sudW5zaGlmdChzdGFydE1lbnUpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbWVudVN0YWNrLFxuICAgIG1haW5NZW51LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0d28gc2VnbWVudHMgb24gYSAxRCBsaW5lIG92ZXJsYXAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFNjZW5lRWxlbWVudHMgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgYXBwZWFyIGluIGEgc2NlbmUgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZGVjb3JhdGlvbnMsIGV0Yy4pXG4gKlxuICogQWxsIEVsZW1lbnRzIGFyZSByZXByZXNlbnRlZCBhcyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgYW5kIHRoZSBzcGFjZSB0aGV5IG9jY3VweSBpbiBhIHNjZW5lIGlzIHRoZXJlZm9yZSBkZWZpbmVkXG4gKiBhcyBhIHBvc2l0aW9uICh4LCB5KSBhbmQgYSBzaXplICh3aWR0aCwgaGVpZ2h0KS4gQXQgYWxsIHRpbWVzLCBwb3NpdGlvbnMgYW5kIHNpemVzIHNob3VsZCBiZSBpbnRlZ2Vycy4gU3ViLWludGVnZXJcbiAqIHBvc2l0aW9ucyBhcmUgY29uc2lkZXJlZCB3aXRoIHRoZSB1c2Ugb2YgdGhlIGB4UmVtYWluZGVyYCBhbmQgYHlSZW1haW5kZXJgIGF0dHJpYnV0ZXMgKHRoYXQgc2hvdWxkIGhhdmUgYW4gYWJzb2x1dGVcbiAqIHZhbHVlIDwgMSlcbiAqL1xuY2xhc3MgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIG9mIHRoZSBsZWZ0bW9zdCBzaWRlIG9mIHRoZSBib3VuZGluZyBib3ggKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGluaXRpYWwgeC1jb29yZGluYXRlICh1c2VkIGZvciByZXNldCgpKVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydFggPSB4O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB5LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WSA9IHk7XG4gICAgICAgIHRoaXMuc2hpZnRYID0gMDtcbiAgICAgICAgdGhpcy5zaGlmdFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogd2lkdGggb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogaGVpZ2h0IG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB4LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHktcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeC1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeS1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNjZW5lRWxlbWVudCBzaG91bGQgYmUgY29uc2lkZXJlZCBieSB0aGUgRW5naW5lIG9yIG5vdCAoaW5hY3RpdmUgU2NlbmVFbGVtZW50cyBhcmUgaWdub3JlZCB3aGVuXG4gICAgICAgICAqIGludGVyYWN0aW9ucyBhcmUgY29tcHV0ZWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB1c2VkIHRvIHJlcHJlc2VudCB0aGUgU2NlbmVFbGVtZW50IChpZiByZXByZXNlbnRlZCBieSBhIHNpbmdsZSB0aWxlKVxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aWxlcyA9IHRpbGVzO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBlZmZlY3RzIGFwcGxpZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBAdHlwZSB7W0VmZmVjdF19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVmZmVjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNjZW5lIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgaW5jbHVkZWRcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaWN0aW9uYXJ5IG9mIHRpbWVycyAobnVtYmVycykgdGhhdCBhcmUgYXV0b21hdGljYWxseSBkZWNyZW1lbnRlZCBhdCBlYWNoIHVwZGF0ZVxuICAgICAgICAgKiBAdHlwZSB7e251bWJlcn19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IG9mIFNjZW5lRWxlbWVudHMgdGhhdCBhcmUgYXR0YWNoZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBXaGVuZXZlciBgdGhpc2AgaXMgbW92ZWQsIGFsbCBhdHRhY2hlZCBFbGVtZW50cyB3aWxsIGFsc28gYmUgbW92ZWQgYnkgdGhlIHNhbWUgYW1vdW50XG4gICAgICAgICAqXG4gICAgICAgICAqIFdhcm5pbmc6IEJlY2F1c2Ugb2YgdGhlIHNwZWNpYWwgY29uc3RyYWludHMgb24gQWN0b3IgcG9zaXRpb25zLCBBY3RvcnMgc2hvdWxkIG5vdCBiZSBhdHRhY2hlZCB0byBhXG4gICAgICAgICAqIFNjZW5lRWxlbWVudC4gVGhlIHBhcnRpY3VsYXIgY2FzZSBvZiBBY3RvcnMgXCJyaWRpbmdcIiBhIFNvbGlkIGlzIGhhbmRsZWQgc2VwYXJhdGVseSBpbiB0aGUgU29saWQubW92ZSgpXG4gICAgICAgICAqIG1ldGhvZC5cbiAgICAgICAgICogQHR5cGUge1NldDxTY2VuZUVsZW1lbnQ+fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lRWxlbWVudCB0byB3aGljaCB0aGlzIGlzIGF0dGFjaGVkLCBpZiBhbnlcbiAgICAgICAgICogQHR5cGUge1NjZW5lRWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgdGhpc2Agb3ZlcmxhcHMgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgb3RoZXJgLlxuICAgICAqXG4gICAgICogVHdvIFNjZW5lRWxlbWVudHMgb3ZlcmxhcCBpZiBmb3IgYm90aCBkaW1lbnNpb25zIHRoZSBlbmQgcG9zaXRpb24gb2YgZWFjaCBTY2VuZUVsZW1lbnQgaXMgc3RyaWN0bHkgZ3JlYXRlciB0aGFuXG4gICAgICogdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBvdGhlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciB7U2NlbmVFbGVtZW50fVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG4gICAgICovXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBTY2VuZUVsZW1lbnQgaW4gdGhlIENhbnZhcyBhc3NvY2lhdGVkIHRvIHRoZSBDb250ZXh0IGdpdmVuIGFzIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIGN0eCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0IG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBkcmF3blxuICAgICAqL1xuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzaGlmdFggPSB0aGlzLnNoaWZ0WDtcbiAgICAgICAgICAgIGxldCBzaGlmdFkgPSB0aGlzLnNoaWZ0WTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkVG8pIHtcbiAgICAgICAgICAgICAgICBzaGlmdFggKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WDtcbiAgICAgICAgICAgICAgICBzaGlmdFkgKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdGlsZURhdGEgb2YgdGhpcy50aWxlcykge1xuICAgICAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgICAgIGdyYXBoaWNzLnNoZWV0cy50aWxlcyxcbiAgICAgICAgICAgICAgICAgICAgMTYgKiB0aWxlRGF0YS54LCAxNiAqIHRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy54ICsgdGlsZURhdGEuc2hpZnRYICsgc2hpZnRYLCB0aGlzLnkgKyB0aWxlRGF0YS5zaGlmdFkgKyBzaGlmdFksXG4gICAgICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgcHJvcGVydGllcyBhdCB0aGUgc3RhcnQgb2YgYSBuZXcgdXBkYXRlIG9mIHRoZSBTY2VuZVxuICAgICAqL1xuICAgIGJlZm9yZVVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBzdGF0ZSBvZiB0aGUgU2NlbmVFbGVtZW50IChjYWxsZWQgYXQgZWFjaCBmcmFtZSB3aGVuIHRoZSBTY2VuZSBpcyBhY3RpdmUpXG4gICAgICogQHBhcmFtIGRlbHRhVGltZSB7bnVtYmVyfSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCB1cGRhdGUgKGluIHNlY29uZHMpXG4gICAgICovXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICAvLyB1cGRhdGUgdGltZXJzXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIC8vIHVwZGF0ZSBlZmZlY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnVwZGF0ZShkZWx0YVRpbWUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIFNjZW5lRWxlbWVudCBieSBhIGdpdmVuIGFtb3VudFxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgcmlnaHRcbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIGRvd25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICAvLyBtb3ZlIGFsbCBlbGVtZW50cyBhdHRhY2hlZCB0byB0aGlzXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSwgbXgsIG15KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIFNjZW5lIEVsZW1lbnQgdG8gYSBnaXZlbiBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB4IHtudW1iZXJ9IHgtY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHkge251bWJlcn0geS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKi9cbiAgICBtb3ZlVG8oeCwgeSwgbXgsIG15KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyLCBteCwgbXkpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnN0YXJ0WDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy5zdGFydFk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICBmb3IgKGNvbnN0IHRpbWVyIGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0aW1lcl0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWZmZWN0cy5sZW5ndGggPSAwOyAgICAvLyBjbGVhciBhbGwgZWZmZWN0c1xuICAgIH1cblxuICAgIGFkZEVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgdGhpcy5lZmZlY3RzLnB1c2goZWZmZWN0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlRWZmZWN0KGVmZmVjdCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZWZmZWN0cy5pbmRleE9mKGVmZmVjdCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGF0dGFjaFxuICAgICAqL1xuICAgIGF0dGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5hZGQoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0YWNoZXMgYSBnaXZlbiBTY2VuZUVsZW1lbnQgdG8gdGhpc1xuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnQgdG8gZGV0YWNoXG4gICAgICovXG4gICAgZGV0YWNoKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5hdHRhY2hlZFRvID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEFjdG9ycyBhcmUgU2NlbmVFbGVtZW50cyBpbiBhIFNjZW5lIHRoYXQgY2Fubm90IHBhc3MgdGhyb3VnaCBTb2xpZHMgKHBsYXllciBjaGFyYWN0ZXJzIGFuZCBlbmVtaWVzIGZvciBpbnN0YW5jZSlcbiAqL1xuY2xhc3MgQWN0b3IgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICB0aGlzLm1vdmVYKGR4KTtcbiAgICAgICAgdGhpcy5tb3ZlWShkeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBBY3RvciBpcyBjdXJyZW50bHkgXCJyaWRpbmdcIiB0aGUgU29saWQgZ2l2ZW4gYXMgcGFyYW1ldGVyLCBtZWFuaW5nIHRoYXQgd2hlbiB0aGUgU29saWRcbiAgICAgKiBtb3ZlcyBpdCBzaG91bGQgbW92ZSB0aGUgQWN0b3IgdG9vLlxuICAgICAqIEFuIEFjdG9yIGlzIGNvbnNpZGVyZWQgdG8gYmUgcmlkaW5nIGEgU29saWQgaXQgaXMgc3RhbmRpbmcgZGlyZWN0bHkgb24gdG9wIG9mIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvbGlkIHtTb2xpZH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNhbGwgd2hlbiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkIHdoaWxlIGJlaW5nIHB1c2hlZCBieSBhbm90aGVyXG4gICAgICovXG4gICAgc3F1aXNoKCkge1xuICAgIH1cblxuICAgIHNldE1vbWVudHVtWChteCkge1xuICAgICAgICBpZiAobXgpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtWShteSkge1xuICAgICAgICBpZiAobXkpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNvbGlkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IEFjdG9ycyBjYW5ub3QgcGFzcyB0aHJvdWdoLiBUaGVyZSBzaG91bGQgbmV2ZXIgYmUgYW4gQWN0b3Igb3ZlcmxhcHBpbmcgYSBTb2xpZCAodW5sZXNzXG4gKiBlaXRoZXIgb25lIGlzIG1hcmtlZCBhcyBpbmFjdGl2ZSkuIFdoZW4gU29saWRzIG1vdmUsIHRoZXkgaW50ZXJhY3Qgd2l0aCBBY3RvcnMgdGhhdCBtaWdodCBvdGhlcndpc2Ugb3ZlcmxhcCAodGhleVxuICogbWlnaHQgcHVzaCB0aGVtLCBraWxsIHRoZW0sIGV0Yy4pLlxuICpcbiAqIFR3byBTb2xpZHMgbWlnaHQgb3ZlcmxhcCwgYW5kIGluIGdlbmVyYWwgdGhlIG1vdmVtZW50IG9mIGEgU29saWQgaXMgbm90IGFmZmVjdGVkIGJ5IG90aGVyIFNvbGlkcy5cbiAqL1xuY2xhc3MgU29saWQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNvbGlkIHNob3VsZCBiZSBjb25zaWRlcmVkIHdoZW4gY2hlY2tpbmcgY29sbGlzaW9ucyB3aXRoIGFuIEFjdG9yXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIGlzIHVzZWQgYXV0b21hdGljYWxseSBieSB0aGUgbW92ZSgpIG1ldGhvZCB3aGVuIHRoZSBTb2xpZCBwdXNoZXMgYW4gQWN0b3IuIEl0IHNob3VsZCBub3QgYmVcbiAgICAgICAgICogY2hhbmdlZCBpbiBvdGhlciBjaXJjdW1zdGFuY2VzICh1c2UgaXNBY3RpdmUgdG8gZGlzYWJsZSB0aGUgU29saWQpLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHksIG14LCBteSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPCBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCAtIGFjdG9yLnggLSBhY3Rvci53aWR0aCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYID4gbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb3ZlWSkge1xuICAgICAgICAgICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgKyB0aGlzLmhlaWdodCAtIGFjdG9yLnksICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55IC0gYWN0b3IueSAtIGFjdG9yLmhlaWdodCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZID4gbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIFNvbGlkIGlzIGNvbnNpZGVyZWQgdG8gY29sbGlkZSB3aXRoIGFuIEFjdG9yIG1vdmluZyBieSBhIGdpdmVuIGFtb3VudCBpbiBib3RoIGF4ZXMuXG4gICAgICpcbiAgICAgKiBUbyBzaW1wbGlmeSB0aGUgY29tcHV0YXRpb24sIHRoZSBmdW5jdGlvbiBjaGVja3MgaWYgdGhlIGJvdW5kaW5nIGJveCBvZiB0aGUgc29saWQgb3ZlcmxhcHMgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAgKiByZWN0YW5nbGUgY29udGFpbmluZyB0aGUgYXJlYXMgb2NjdXBpZWQgYnkgdGhlIEFjdG9yIGF0IHRoZSBzdGFydCBhbmQgZW5kIG9mIGl0cyBtb3ZlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhY3RvciB7QWN0b3J9XG4gICAgICogQHBhcmFtIGR4IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHgtYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHktYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIFNvbGlkIG92ZXJsYXBzIHRoZSBBY3RvciBhdCBhbnkgcG9pbnQgZHVyaW5nIGl0cyBtb3ZlbWVudFxuICAgICAqL1xuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGggKyBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54ICsgZHgsIGFjdG9yLndpZHRoIC0gZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCArIGR5KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSArIGR5LCBhY3Rvci5oZWlnaHQgLSBkeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEhhemFyZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBraWxsIHRoZSBwbGF5ZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBIYXphcmQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVzKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogUGxhdGZvcm1zIGFyZSBmbGF0IFNvbGlkcyAoMCBoZWlnaHQpIHRoYXQgQWN0b3JzIGNhbiBwYXNzIHRocm91Z2ggd2hlbiBtb3ZpbmcgdXB3YXJkcyBidXQgbm90IGRvd253YXJkcyAoaWYgdGhleSBhcmVcbiAqIGVudGlyZWx5IGhpZ2hlciB0aGFuIHRoZSBQbGF0Zm9ybSlcbiAqXG4gKiBDb250cmFyeSB0byByZWd1bGFyIFNvbGlkcywgUGxhdGZvcm1zIGFyZSBhbGxvd2VkIHRvIG92ZXJsYXAgd2l0aCBBY3RvcnMuXG4gKi9cbmNsYXNzIFBsYXRmb3JtIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCB0aWxlcykge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgMCwgdGlsZXMpO1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCA8PSB0aGlzLnkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0ICsgZHkgPiB0aGlzLnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwcmluZ3MgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCB0aHJvdyBBY3RvcnMgdXAgb24gY29udGFjdFxuICovXG5jbGFzcyBTcHJpbmcgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgY29uc3QgdGlsZXMxID0gW1xuICAgICAgICAgICAgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUyLCAwLCAtVSAvIDIpLFxuICAgICAgICAgICAgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUzLCBVLCAtVSAvIDIpXG4gICAgICAgIF07XG4gICAgICAgIGNvbnN0IHRpbGVzMiA9IFtcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1NCwgMCwgLVUgLyAyKSxcbiAgICAgICAgICAgIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1NSwgVSwgLVUgLyAyKVxuICAgICAgICBdXG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgMiAqIFUsIFUgLyAyLCB0aWxlczEpO1xuICAgICAgICB0aGlzLnRpbGVzMSA9IHRpbGVzMTtcbiAgICAgICAgdGhpcy50aWxlczIgPSB0aWxlczI7XG4gICAgICAgIHRoaXMudGltZXJzLmV4dGVuZGVkID0gMDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5zcHJpbmcpO1xuICAgICAgICBwbGF5ZXIuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0JPVU5DRSk7XG4gICAgICAgIHBsYXllci5zcGVlZFggPSAwO1xuICAgICAgICBwbGF5ZXIuc3BlZWRZID0gY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgcGxheWVyLnJlc3RvcmVEYXNoKCk7XG4gICAgICAgIHRoaXMudGltZXJzLmV4dGVuZGVkID0gLjI1O1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIHRoaXMudGlsZXMgPSAodGhpcy50aW1lcnMuZXh0ZW5kZWQgPiAwKSA/IHRoaXMudGlsZXMyIDogdGhpcy50aWxlczE7XG4gICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBEYXNoRGlhbW9uZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCByZXN0b3JlIHRoZSBkYXNoIGNvdW50ZXIgb2YgdGhlIFBsYXllcnMgd2hvIHRvdWNoIHRoZW1cbiAqL1xuY2xhc3MgRGFzaERpYW1vbmQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSgyMSldKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuZGFzaERpYW1vbmQpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFN0cmF3YmVycmllcyBhcmUgY29sbGVjdGlibGVzIHRoYXQgUGxheWVyIHRha2Ugb24gY29udGFjdC5cbiAqIElmIGEgUGxheWVyIGRpZXMgYWZ0ZXIgY29sbGVjdGluZyBhIFN0cmF3YmVycnkgYmVmb3JlIGNoYW5naW5nIFNjZW5lLCB0aGUgU3RyYXdiZXJyeSBpcyByZXN0b3JlZCBpbiB0aGUgU2NlbmVcbiAqIChhbmQgcmVtb3ZlZCBmcm9tIHRoZSBQbGF5ZXIncyBsaXN0IG9mIGNvbGxlY3RlZCBTdHJhd2JlcnJpZXMpXG4gKi9cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSgxMyldKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5zdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuYWRkKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFRyYW5zaXRpb25zIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgdHJhbnNmZXIgYSBQbGF5ZXIgZnJvbSBvbmUgU2NlbmUgdG8gYW5vdGhlciBvbiBjb250YWN0XG4gKi9cbmNsYXNzIFRyYW5zaXRpb24gZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZLCBzcGF3blBvaW50SW5kZXggPSAwKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lIHRvIHdoaWNoIHRoZSBQbGF5ZXIgaXMgdGFrZW4gd2hlbiB0b3VjaGluZyB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7U2NlbmV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueCAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeC1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WCAtIHRoaXMueFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRYID0gdGFyZ2V0WDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBpbiB0aGUgdGFyZ2V0IFNjZW5lIGNvcnJlc3BvbmRpbmcgdG8gdGhpcy55ICh3aGVuIHRoZSBQbGF5ZXIgdHJhbnNpdGlvbnMgdG8gdGhlIHRhcmdldCBTY2VuZSxcbiAgICAgICAgICogaXRzIHBvc2l0aW9uIGlzIHNldCB0byBpdHMgY3VycmVudCB5LXBvc2l0aW9uICsgdGhpcy50YXJnZXRZICsgdGhpcy55XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldFkgPSB0YXJnZXRZO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGluZGV4IG9mIHRoZSBzcGF3biBwb2ludCAoaW4gdGhlIHRhcmdldCBTY2VuZSdzIGxpc3Qgb2Ygc3Bhd24gcG9pbnRzKSBjb3JyZXNwb25kaW5nIHRvIHRoZSBUcmFuc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IHNwYXduUG9pbnRJbmRleDtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lLnJlc2V0KCk7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICBwbGF5ZXIubWFrZVRyYW5zaXRpb24odGhpcyk7XG4gICAgICAgIHRoaXMuc2NlbmUudHJhbnNpdGlvbiA9IHRoaXM7XG4gICAgfVxufVxuXG5cbi8qKlxuICogQ3J1bWJsaW5nQmxvY2tzIGFyZSBTb2xpZHMgdGhhdCBkaXNhcHBlYXIgc2hvcnRseSBhZnRlciBhIFBsYXllciBoaXRzIGl0IChvbmx5IHdoZW4gdGhlIFBsYXllciBpcyBjb25zaWRlcmVkIHRvIGJlXG4gKiBcImNhcnJpZWRcIiBieSB0aGUgQ3J1bWJsaW5nQmxvY2spLlxuICogVGhleSByZWFwcGVhciBhZnRlciBhIGdpdmVuIHRpbWUgKGlmIHRoZXJlIGFyZSBubyBBY3RvcnMgb24gdGhlaXIgcG9zaXRpb24pXG4gKi9cbmNsYXNzIENydW1ibGluZ0Jsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg1NyldKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGJsb2NrIGlzIGRpc2FwcGVhcmluZ1xuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgZGlzYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lciBmb3IgcmVhcHBlYXJhbmNlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyOyAgIC8vIGR1cmF0aW9uIGJlZm9yZSByZWFwcGVhcmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgICAgIGxldCBzaG91bGRCZWNvbWVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG91bGRCZWNvbWVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2hvdWxkQmVjb21lQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmVmZmVjdHMuY3J1bWJsaW5nQmxvY2spO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTsgIC8vIGR1cmF0aW9uIGJlZm9yZSBkaXNhcHBlYXJpbmdcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFscGhhID0gMiAqIHRoaXMudGltZXJzLmZhbGw7XG4gICAgICAgICAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBhbHBoYTtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogVHJpZ2dlckJsb2NrcyBhcmUgU29saWRzIHRoYXQgc3RhcnQgbW92aW5nIHdoZW4gdGhleSBjYXJyeSBhbiBBY3RvclxuICovXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgZGVsYXksIG1vdmVtZW50LCB0aWxlcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodGlsZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGlsZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGVpZ2h0OyBpICs9IFUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHdpZHRoOyBqICs9IFUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSA2NCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpO1xuICAgICAgICAgICAgICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YShpbmRleCwgaiwgaSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlcyk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBoYXMgYmVlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3IgYnV0IGhhcyBub3QgeWV0IHN0YXJ0ZWQgZXhlY3V0aW5nIHRoZSBtb3ZlbWVudCAoZHVyaW5nXG4gICAgICAgICAqIHRyaWdnZXIgZGVsYXkpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZSBkZWxheSBiZWZvcmUgdGhlIG1vdmVtZW50IHN0YXJ0cyB3aGVuIHRoZSBibG9jayBpcyB0cmlnZ2VyZWRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsYXkgPSBkZWxheTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1vdmVtZW50IHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3JcbiAgICAgICAgICogQHR5cGUge0VmZmVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnNoaWZ0WCA9IDA7XG4gICAgICAgIHRoaXMuc2hpZnRZID0gMDtcbiAgICAgICAgaWYgKHRoaXMuaXNUcmlnZ2VyZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy50cmlnZ2VyIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVFZmZlY3QodGhpcy50cmlnZ2VyZWRNb3ZlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hvdWxkVHJpZ2dlciA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICBzaG91bGRUcmlnZ2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdWxkVHJpZ2dlcikge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnRyaWdnZXIgPSB0aGlzLmRlbGF5O1xuICAgICAgICAgICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBGYWxsaW5nQmxvY2sgZXh0ZW5kcyBUcmlnZ2VyQmxvY2sge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCkge1xuICAgICAgICBjb25zdCB0aWxlcyA9IFtdO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgzKSk7XG4gICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDUsIHdpZHRoIC0gVSwgMCkpO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxNiwgMCwgaGVpZ2h0IC0gVSkpO1xuICAgICAgICB0aWxlcy5wdXNoKG5ldyBncmFwaGljcy5UaWxlRGF0YSgxOCwgd2lkdGggLSBVLCBoZWlnaHQgLSBVKSk7XG4gICAgICAgIGZvciAobGV0IHggPSBVOyB4IDwgd2lkdGggLSBVOyB4ICs9IFUpIHtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQsIHgsIDApKTtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDE3LCB4LCBoZWlnaHQgLSBVKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgeSA9IFU7IHkgPCBoZWlnaHQgLSBVOyB5ICs9IFUpIHtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDgsIDAsIHkpKTtcbiAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDEwLCB3aWR0aCAtIFUsIHkpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCB4ID0gVTsgeCA8IHdpZHRoIC0gVTsgeCArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB5ID0gVTsgeSA8IGhlaWdodCAtIFU7IHkgKz0gVSkge1xuICAgICAgICAgICAgICAgIHRpbGVzLnB1c2gobmV3IGdyYXBoaWNzLlRpbGVEYXRhKDksIHgsIHkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQsIHRpbGVzKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyBkb3dud2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIEhhemFyZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCBbbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQwLCAwLCAtVSAvIDIpXSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNEb3duIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIHVwd2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNEb3duIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUgLyAyLCBbbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQyKV0pO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPCAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNSaWdodCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyBsZWZ0d2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNSaWdodCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVIC8gMiwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MSldKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWCAtIHRoaXMubW92ZWRYIDwgMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzVXAgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgcmlnaHR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0xlZnQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCArIFUgLyAyLCB5LCBVIC8gMiwgVSwgW25ldyBncmFwaGljcy5UaWxlRGF0YSg0MywgLVUgLyAyLCAwKV0pO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRYIC0gdGhpcy5tb3ZlZFggPiAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2VnbWVudHNPdmVybGFwLFxuICAgIEhhemFyZCxcbiAgICBTb2xpZCxcbiAgICBBY3RvcixcbiAgICBQbGF0Zm9ybSxcbiAgICBTcHJpbmcsXG4gICAgRGFzaERpYW1vbmQsXG4gICAgU3RyYXdiZXJyeSxcbiAgICBUcmFuc2l0aW9uLFxuICAgIFRyaWdnZXJCbG9jayxcbiAgICBGYWxsaW5nQmxvY2ssXG4gICAgQ3J1bWJsaW5nQmxvY2ssXG4gICAgU3Bpa2VzVXAsXG4gICAgU3Bpa2VzRG93bixcbiAgICBTcGlrZXNMZWZ0LFxuICAgIFNwaWtlc1JpZ2h0LFxufVxuIiwiY29uc3QgcGxheWVyQ2hhcmFjdGVyID0gcmVxdWlyZSgnLi9wbGF5ZXJDaGFyYWN0ZXInKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5cbmNsYXNzIFBsYXllciB7XG4gICAgY29uc3RydWN0b3IoY29sb3IpIHtcbiAgICAgICAgdGhpcy5jb2xvciA9IGNvbG9yO1xuICAgICAgICB0aGlzLmNoYXJhY3RlciA9IG5ldyBwbGF5ZXJDaGFyYWN0ZXIuUGxheWVyQ2hhcmFjdGVyKHRoaXMpO1xuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLmlucHV0cy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbn0iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuXG5jb25zdCBBTklNQVRJT05fU0xPV0RPV04gPSA2O1xuY29uc3QgQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBBTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgQU5JTUFUSU9OX0pVTVAgPSBbNiwgM107XG5jb25zdCBBTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cblxuY2xhc3MgUGxheWVyQ2hhcmFjdGVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IocGxheWVyLCB4ID0gMCwgeSA9IDApIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgOCwgMTQpO1xuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuXG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcblxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzLlNUQVRFX05PUk1BTDtcbiAgICAgICAgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gMTtcbiAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gMTtcbiAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gNDtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG5cbiAgICAgICAgLy8gdGltZXJzXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IH5+KHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgLyBBTklNQVRJT05fU0xPV0RPV04pO1xuICAgICAgICBjb25zdCByb3cgPSA0ICogdGhpcy5zcHJpdGVfcm93ICsgKHRoaXMubmJEYXNoZXMgPyAwIDogMikgKyAodGhpcy5zcHJpdGVfZGlyZWN0aW9uID09PSAtMSA/IDEgOiAwKTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgIGdyYXBoaWNzLnNoZWV0c1t0aGlzLnBsYXllci5jb2xvcl0sXG4gICAgICAgICAgICAxNiAqIGluZGV4LCAxNiAqIHJvdyxcbiAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgIHRoaXMueCAtIDQgKyB0aGlzLnNoaWZ0WCwgdGhpcy55IC0gMiArIHRoaXMuc2hpZnRZLFxuICAgICAgICAgICAgMTYsIDE2KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICs9IDE7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgJT0gdGhpcy5uYl9zcHJpdGVzICogQU5JTUFUSU9OX1NMT1dET1dOO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jYW5CZUNsaW1iZWQgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy54ICsgdGhpcy53aWR0aCA9PT0gc29saWQueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgcGxheWVyIGlzIGh1Z2dpbmcgYSB3YWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy51cGRhdGVBbmltYXRpb24oKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIGludGVyYWN0IHdpdGggVGhpbmdzXG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuc2NlbmUudGhpbmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaW5nLmlzQWN0aXZlICYmIHRoaXMub3ZlcmxhcHModGhpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaW5nLm9uQ29udGFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMueSA+PSB0aGlzLnNjZW5lLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmR5aW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2VuZS5zaG91bGRSZXNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci5pbnB1dHMuaXNQcmVzc2VkKFwianVtcFwiKSAmJiB0aGlzLnRpbWVycy52YXJKdW1wID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZLCAtY29uc3RhbnRzLkpVTVBfU1BFRUQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5kYXNoID4gY29uc3RhbnRzLkRBU0hfVElNRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKDAgPCB0aGlzLnRpbWVycy5kYXNoICYmIHRoaXMudGltZXJzLmRhc2ggPD0gY29uc3RhbnRzLkRBU0hfVElNRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IHRoaXMuZGFzaFNwZWVkWDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSB0aGlzLmRhc2hTcGVlZFk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZW5kIG9mIGRhc2hcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3BlZWQgPSB0aGlzLmRhc2hTcGVlZFggJiYgdGhpcy5kYXNoU3BlZWRZID8gY29uc3RhbnRzLkVORF9EQVNIX1NQRUVEIC8gTWF0aC5zcXJ0KDIpIDogY29uc3RhbnRzLkVORF9EQVNIX1NQRUVEO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFgpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWSkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGFzaFNwZWVkWSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZICo9IGNvbnN0YW50cy5FTkRfREFTSF9VUF9GQUNUT1I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmJvdW5jZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMubmJEYXNoZXMgPiAwICYmXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnB1dHMuaXNQcmVzc2VkKFwiZGFzaFwiKSAmJlxuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW5wdXRzLnRpbWVycy5kYXNoQnVmZmVyID4gMCAmJlxuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duIDw9IDAgJiZcbiAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgfHwgdGhpcy5wbGF5ZXIuaW5wdXRzLnlBeGlzKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhc2hTcGVlZCA9IHRoaXMucGxheWVyLmlucHV0cy54QXhpcyAmJiB0aGlzLnBsYXllci5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICogTWF0aC5tYXgoTWF0aC5hYnModGhpcy5zcGVlZFgpLCBkYXNoU3BlZWQpO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gLXRoaXMucGxheWVyLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9EQVNIKTtcbiAgICAgICAgICAgIHRoaXMubmJEYXNoZXMgLT0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkge1xuICAgICAgICBsZXQgZGlkSnVtcCA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLmlzUHJlc3NlZChcImp1bXBcIikgJiZcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5KVU1QX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfSlVNUCk7XG4gICAgICAgICAgICBkaWRKdW1wID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHRoaXMucGxheWVyLmlucHV0cy5pc1ByZXNzZWQoXCJqdW1wXCIpICYmXG4gICAgICAgICAgICB0aGlzLnBsYXllci5pbnB1dHMudGltZXJzLmp1bXBCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICAodGhpcy5oYXNXYWxsTGVmdCB8fCB0aGlzLmhhc1dhbGxSaWdodCkpIHtcbiAgICAgICAgICAgIC8vIHdhbGxqdW1wXG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgaWYgKCh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy5oYXNXYWxsUmlnaHQpIHx8ICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMuaGFzV2FsbExlZnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bVggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIHRoaXMubW9tZW50dW1YO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtWSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogdGhpcy5tb21lbnR1bVk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZEp1bXA7XG4gICAgfVxuXG4gICAgdXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzICE9PSAwKSB0aGlzLnNwcml0ZV9kaXJlY3Rpb24gPSB0aGlzLnBsYXllci5pbnB1dHMueEF4aXM7XG5cbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5wbGF5ZXIuaW5wdXRzLnhBeGlzID4gMCAmJiBzeCA8IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWluKHN4ICsgY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggKiB0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQ0xJTUJfVVBfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5NQVhfRkFMTF9TUEVFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVBbmltYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fUlVOKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNwZWVkWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9KVU1QKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRTdGF0ZShuZXdTdGF0ZSkge1xuICAgICAgICBpZiAobmV3U3RhdGUgIT09IHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGxlYXZlIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAobmV3U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBlbnRlciBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5qdW1wKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW5wdXRzLnRpbWVycy5qdW1wQnVmZmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IGNvbnN0YW50cy5WQVJfSlVNUF9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZWZmZWN0cy5kYXNoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIuaW5wdXRzLnRpbWVycy5kYXNoQnVmZmVyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV047XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSBjb25zdGFudHMuREFTSF9USU1FICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5lZmZlY3RzLmRpZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gY29uc3RhbnRzLkRZSU5HX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gY29uc3RhbnRzLkJPVU5DRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1ha2VUcmFuc2l0aW9uKHRyYW5zaXRpb24pIHtcbiAgICAgICAgLy8gdmFsaWRhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuc2NlbmUucmVtb3ZlVGhpbmcoc3RyYXdiZXJyeSk7XG4gICAgICAgICAgICB0aGlzLnN0cmF3YmVycmllcy5hZGQoc3RyYXdiZXJyeSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zY2VuZS5yZW1vdmVBY3Rvcih0aGlzKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5hZGRBY3Rvcih0aGlzKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5zcGF3blBvaW50SW5kZXggPSB0cmFuc2l0aW9uLnNwYXduUG9pbnRJbmRleDtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5zY2VuZS5zcGF3blBvaW50c1t0aGlzLnNjZW5lLnNwYXduUG9pbnRJbmRleF07XG4gICAgICAgIHRoaXMueCA9IHBvaW50Lng7XG4gICAgICAgIHRoaXMueSA9IHBvaW50LnkgLSA2O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMucGxheWVyLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBsYXllci5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHNldEFuaW1hdGlvbihzcHJpdGVfcm93LCBuYl9zcHJpdGVzKSB7XG4gICAgICAgIGlmIChzcHJpdGVfcm93ICE9PSB0aGlzLnNwcml0ZV9yb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IHNwcml0ZV9yb3c7XG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyQ2hhcmFjdGVyLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdsb2JhbHMgPSByZXF1aXJlKCcuL2dsb2JhbHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IG1lbnUgPSByZXF1aXJlKCcuL21lbnUnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcblxuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKGRhdGEud2lkdGggKiBVLCBkYXRhLmhlaWdodCAqIFUpO1xuICAgICAgICAvLyBtYWtlIHdhbGxzXG4gICAgICAgIGNvbnN0IHdhbGxzID0gW1xuICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKC0uNSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgoZGF0YS53aWR0aCArIC41KSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoaW5kZXggLSAxKTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zcGF3blBvaW50cy5wdXNoKHt4OiB4LCB5OiB5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUsIFt0aWxlRGF0YV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzVXAoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIFt0aWxlRGF0YV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3RyYXdiZXJyeSh4ICsgVSAvIDIsIHkgKyBVIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5DcnVtYmxpbmdCbG9jayh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuU29saWQoeCwgeSwgVSwgVSwgW3RpbGVEYXRhXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcbiAgICAgICAgICAgIGlmIChpbnB1dHMuaXNUYXBwZWRLZXkoXCJFc2NhcGVcIikgfHwgZ2xvYmFscy5wbGF5ZXJzLnNvbWUocCA9PiBwLmlucHV0cy5pc1RhcHBlZChcInBhdXNlXCIpKSkge1xuICAgICAgICAgICAgICAgIG1lbnUubWVudVN0YWNrLnVuc2hpZnQobWVudS5tYWluTWVudSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdXBkYXRlIGFsbCBlbGVtZW50c1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgICAgIHNvbGlkLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaW5nLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGFjdG9yLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgc29saWQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpbmcudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgYWN0b3IudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNjcm9sbCB2aWV3XG4gICAgICAgICAgICBpZiAoZ2xvYmFscy5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2xvYmFscy5wbGF5ZXJzWzBdLmNoYXJhY3Rlci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSB0aGlzLnNjcm9sbFggPCAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSB0aGlzLnNjcm9sbFkgPiAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhlaWdodCAtIGNvbnN0YW50cy5WSUVXX0hFSUdIVCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIueSAtIC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyByZXNldCBzY2VuZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmICh0aGlzLnNob3VsZFJlc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5yZXNldCgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHgudHJhbnNsYXRlKC10aGlzLnNjcm9sbFgsIC10aGlzLnNjcm9sbFkpO1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAvLyBkcmF3IEhVRFxuICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmYWFcIjtcbiAgICAgICAgY3R4LmZpbGxSZWN0KDEsIDEsIDQyLCAxMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwicmlnaHRcIjtcbiAgICAgICAgY3R4LmZvbnQgPSAnbm9ybWFsIDZweCBnYW1lYm95JztcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke2dsb2JhbHMucGxheWVyc1swXS5jaGFyYWN0ZXIuc3RyYXdiZXJyaWVzLnNpemUgKyBnbG9iYWxzLnBsYXllcnNbMF0uY2hhcmFjdGVyLnRlbXBvcmFyeVN0cmF3YmVycmllcy5zaXplfS8yMGAsIDQwLCA4KTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShncmFwaGljcy5zaGVldHMudGlsZXMsIDgwLCAxNiwgMTYsIDE2LCAyLCAyLCA4LCA4KTtcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmFkZCh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5kZWxldGUodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2NlbmUsXG59XG4iLCJjb25zdCBlZmZlY3RzID0ge1xuICAgIGp1bXA6IG5ldyBBdWRpbygnc291bmQvY2hhcl9tYWRfanVtcC5vZ2cnKSxcbiAgICBkYXNoOiBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2Rhc2hfcGlua19sZWZ0Lm9nZycpLFxuICAgIGRpZTogbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9kZWF0aC5vZ2cnKSxcbiAgICBjcnVtYmxpbmdCbG9jazogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9mYWxsYmxvY2tfc2hha2Uub2dnJyksXG4gICAgc3RyYXdiZXJyeTogbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zdHJhd2JlcnJ5X3JlZF9nZXRfMXVwLm9nZycpLFxuICAgIGRhc2hEaWFtb25kOiBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX2RpYW1vbmRfdG91Y2hfMDEub2dnJyksXG4gICAgc3ByaW5nOiBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX3NwcmluZy5vZ2cnKSxcbn1cbmNvbnN0IGJnTXVzaWMgPSBuZXcgQXVkaW8oJ3NvdW5kL2JnX211c2ljLndhdicpO1xuYmdNdXNpYy5sb29wID0gdHJ1ZTtcblxubGV0IHNvdW5kVm9sdW1lO1xubGV0IG11c2ljVm9sdW1lO1xuXG5mdW5jdGlvbiBnZXRTb3VuZFZvbHVtZSgpIHtcbiAgICByZXR1cm4gc291bmRWb2x1bWU7XG59XG5cblxuZnVuY3Rpb24gc2V0U291bmRWb2x1bWUodmFsdWUpIHtcbiAgICBzb3VuZFZvbHVtZSA9IHZhbHVlO1xuICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIE9iamVjdC52YWx1ZXMoZWZmZWN0cykpIHtcbiAgICAgICAgZWZmZWN0LnZvbHVtZSA9IHNvdW5kVm9sdW1lIC8gMTY7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGluY3JlbWVudFNvdW5kVm9sdW1lKCkge1xuICAgIGlmIChzb3VuZFZvbHVtZSA8IDUpIHtcbiAgICAgICAgc2V0U291bmRWb2x1bWUoc291bmRWb2x1bWUgKyAxKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gZGVjcmVtZW50U291bmRWb2x1bWUoKSB7XG4gICAgaWYgKHNvdW5kVm9sdW1lID4gMCkge1xuICAgICAgICBzZXRTb3VuZFZvbHVtZShzb3VuZFZvbHVtZSAtIDEpO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBnZXRNdXNpY1ZvbHVtZSgpIHtcbiAgICByZXR1cm4gbXVzaWNWb2x1bWU7XG59XG5cblxuZnVuY3Rpb24gc2V0TXVzaWNWb2x1bWUodmFsdWUpIHtcbiAgICBtdXNpY1ZvbHVtZSA9IHZhbHVlO1xuICAgIGJnTXVzaWMudm9sdW1lID0gbXVzaWNWb2x1bWUgLyAxNjtcbn1cblxuXG5mdW5jdGlvbiBpbmNyZW1lbnRNdXNpY1ZvbHVtZSgpIHtcbiAgICBpZiAobXVzaWNWb2x1bWUgPCA1KSB7XG4gICAgICAgIHNldE11c2ljVm9sdW1lKG11c2ljVm9sdW1lICsgMSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGRlY3JlbWVudE11c2ljVm9sdW1lKCkge1xuICAgIGlmIChtdXNpY1ZvbHVtZSA+IDApIHtcbiAgICAgICAgc2V0TXVzaWNWb2x1bWUobXVzaWNWb2x1bWUgLSAxKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gcGxheVNvdW5kKHNvdW5kKSB7XG4gICAgc291bmQuY3VycmVudFRpbWUgPSAwO1xuICAgIHNvdW5kLnBsYXkoKTtcbn1cblxuXG5zZXRTb3VuZFZvbHVtZSg1KTtcbnNldE11c2ljVm9sdW1lKDUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBlZmZlY3RzLFxuICAgIGJnTXVzaWMsXG4gICAgZ2V0U291bmRWb2x1bWUsXG4gICAgZ2V0TXVzaWNWb2x1bWUsXG4gICAgcGxheVNvdW5kLFxuICAgIGluY3JlbWVudFNvdW5kVm9sdW1lLFxuICAgIGRlY3JlbWVudFNvdW5kVm9sdW1lLFxuICAgIGluY3JlbWVudE11c2ljVm9sdW1lLFxuICAgIGRlY3JlbWVudE11c2ljVm9sdW1lLFxufSJdfQ==
