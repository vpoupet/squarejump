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
const sheets = {};
const contextLayer = {};

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
    loadSheet('images/hero_red.png', 'hero_red'),
    loadSheet('images/hero_green.png', 'hero_green'),
    loadSheet('images/hero_blue.png', 'hero_blue'),
    loadSheet('images/hero_red.png', 'hero_red'),
    loadSheet('images/tileset.png', 'tiles'),
]);


module.exports = {
    TileData,
    sheets,
    loadGraphics,
    contextLayer,
}

},{}],4:[function(require,module,exports){
"use strict";

const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
const AXES_THRESHOLD = .4;

let pressedKeys = new Set();
let previouslyPressedKeys;
let currentlyPressedKeys = new Set();
let previouslyPressedButtons = [];
let currentlyPressedButtons = [];


function gamepadConnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = new Set();
}


function gamepadDisconnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = undefined;
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
        }
        this.keymap = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'g',
            dash: 'f',
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

    update(deltaTime) {
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }

        this.xAxis = (this.isPressed("left") ? -1 : 0) + (this.isPressed("right") ? 1 : 0);
        this.yAxis = (this.isPressed("up") ? 1 : 0) + (this.isPressed("down") ? -1 : 0);
        if (!this.isPreviouslyPressed("jump") && this.isPressed("jump")) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
        }
        if (!this.isPreviouslyPressed("dash") && this.isPressed("dash")) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
        }
    }
}


function waitForGamepadButton() {
    let pressedButtonIndex = undefined;
    for (const gamepad of navigator.getGamepads()) {
        if (gamepad !== null) {
            for (let i = 0; i < gamepad.buttons.length; i++) {
                if (gamepad.buttons[i].pressed) {
                    pressedButtonIndex = i;
                    console.log(pressedButtonIndex);
                }
            }
        }
    }
    if (pressedButtonIndex === undefined) {
        requestAnimationFrame(waitForGamepadButton);
    }
}


module.exports = {
    PlayerInputs,
    gamepadConnected,
    gamepadDisconnected,
    updateInputs,
    pressedKeys,
    waitForGamepadButton,
}

},{}],5:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const inputs = require('./inputs');
const maps = require('./maps_');
const menu = require('./menu');
const player = require('./player');
const sound = require('./sound');

const SCALING = 3;

let currentScene;
let menuStack = [];
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();
let scrollX = 0;
let scrollY = 0;


function setScroll(x, y) {
    graphics.contextLayer.scene.translate(scrollX - x, scrollY - y);
    scrollX = x;
    scrollY = y;
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
    if (menuStack.length > 0) {
        menuStack[0].update();
        menuStack[0].draw(graphics.contextLayer.menu);
    } else {
        currentScene.update(1 / 60);
        // Transition from one room to another
        if (currentScene.transition) {
            const prevScene = currentScene;
            currentScene = currentScene.transition.targetScene;
            prevScene.transition = undefined;
        }
        setScroll(currentScene.scrollX, currentScene.scrollY);

        let context;
        // clear and redraw on scene canvas
        context = graphics.contextLayer.scene;
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.restore();
        currentScene.draw(context);

        context = graphics.contextLayer.hud;
        context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);
        currentScene.drawHUD(context);
    }
    requestAnimationFrame(update);
}


window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
        switch (e.key) {
            case 'p':
                currentScene.isRunning = !currentScene.isRunning;
                break;
        }
    });
    document.addEventListener('keyup', e => {
        inputs.pressedKeys.delete(e.key);
    });
    document.getElementById("sound-button").addEventListener('click', toggleSound);

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;

    for (const canvas of screen.getElementsByTagName("canvas")) {
        const context = canvas.getContext('2d');
        graphics.contextLayer[canvas.id] = context;
        canvas.width = SCALING * constants.VIEW_WIDTH;
        canvas.height = SCALING * constants.VIEW_HEIGHT;
        context.scale(SCALING, SCALING);
        context.imageSmoothingEnabled = false;
    }

    // load all scenes and start game
    graphics.loadGraphics.then(() => {
        currentScene = maps.scenes.celeste01;
        currentScene.spawnPointIndex = 1;
        currentScene.setPlayer(new player.Player());
        currentScene.reset();
        update();
    });
};


function toggleSound() {
    if (sound.toggleSound()) {
        document.getElementById("sound-button").innerText = "Sound On";
    } else {
        document.getElementById("sound-button").innerText = "Sound Off";
    }
}


// Gamepad API
window.addEventListener("gamepadconnected", (event) => {
    console.log("A gamepad connected:");
    console.log(event.gamepad);
    inputs.gamepadConnected(event.gamepad);
});


window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.gamepadDisconnected(event.gamepad);
});

},{"./constants":1,"./graphics":3,"./inputs":4,"./maps_":6,"./menu":7,"./player":9,"./sound":11}],6:[function(require,module,exports){
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

},{"./constants":1,"./effect":2,"./physics":8,"./scene":10}],7:[function(require,module,exports){
const constants = require('./constants');

class Menu {
    constructor(title, options, selected = 0) {
        this.title = title;
        this.options = options;
        this.selected = selected;
    }

    draw(ctx) {
        ctx.font = 'normal 12px gameboy';
        ctx.textAlign = "center";
        const lineHeight = ctx.measureText('M').actualBoundingBoxAscent;

        this.drawLine(this.title, lineHeight, ctx);
        // ctx.fillStyle = "#ffffffaa";
        // const textMetrics = ctx.measureText(message);
        // ctx.fillRect(
        //     constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
        //     constants.VIEW_HEIGHT / 2 - textMetrics.actualBoundingBoxAscent - 5,
        //     textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
        //     textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent + 10);
        // ctx.fillStyle = "#000000";
        // ctx.fillText(message, constants.VIEW_WIDTH / 2, constants.VIEW_HEIGHT / 2);
    }

    drawLine(message, y, ctx, selected = false) {
        ctx.fillStyle = selected ? "#000000aa" : "#ffffffaa";
        const textMetrics = ctx.measureText(message);
        ctx.fillRect(
            constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
            y - textMetrics.actualBoundingBoxAscent - 5,
            textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
            textMetrics.actualBoundingBoxAscent + 10);
        ctx.fillStyle = selected ? "#ffffff" : "#000000";
        ctx.fillText(message, constants.VIEW_WIDTH / 2, y);
    }
}


function displayMessage(message, ctx, y, selected = false) {
    ctx.font = 'normal 12px gameboy';
    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffffaa";
    const textMetrics = ctx.measureText(message);
    ctx.fillRect(
        constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
        y - textMetrics.actualBoundingBoxAscent - 5,
        textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
        textMetrics.actualBoundingBoxAscent + 10);
    ctx.fillStyle = "#000000";
    ctx.fillText(message, constants.VIEW_WIDTH / 2, y);
}


module.exports = {
    Menu,
    displayMessage,
}
},{"./constants":1}],8:[function(require,module,exports){
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
        if (this.tileData !== undefined) {
            let shiftX = this.shiftX;
            let shiftY = this.shiftY;
            if (this.attachedTo) {
                shiftX += this.attachedTo.shiftX;
                shiftY += this.attachedTo.shiftY;
            }
            ctx.drawImage(
                graphics.sheets.tiles,
                16 * this.tileData.x, 16 * this.tileData.y,
                16, 16,
                this.x + this.tileData.shiftX + shiftX, this.y + this.tileData.shiftY + shiftY,
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
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(21));
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
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(13));
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
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(57));
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
 * TriggerBlocks are Solids that start moving when they carry an Actor
 */
class TriggerBlock extends Solid {
    constructor(x, y, width, height, delay, movement) {
        super(x, y, width, height);
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
        /**
         * Tile indexes to use when drawing the TriggerBlock on the Scene
         * @type {number[]}
         */
        this.spriteIndexes = new Array((width / U) * (height / U)).fill(0).map(_ => 64 + Math.floor(Math.random() * 4));
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

    draw(ctx) {
        let index = 0;
        for (let y = this.y; y < this.y + this.height; y += U) {
            for (let x = this.x; x < this.x + this.width; x += U) {
                ctx.drawImage(
                    graphics.sheets.tiles,
                    16 * (this.spriteIndexes[index] % 8), 16 * ~~(this.spriteIndexes[index] / 8),
                    16, 16,
                    x + this.shiftX, y + this.shiftY,
                    8, 8);
                index += 1;
            }
        }
    }
}


class FallingBlock extends TriggerBlock {
    constructor(x, y, width, height, delay, movement) {
        super(x, y, width, height, delay, movement);
        const w = width / U;
        const h = height / U;
        this.spriteIndexes.fill(9);
        this.spriteIndexes[0] = 3;
        this.spriteIndexes[w - 1] = 5;
        this.spriteIndexes[w * (h - 1)] = 16;
        this.spriteIndexes[w * h - 1] = 18;
        for (let i = 1; i < w - 1; i++) {
            this.spriteIndexes[i] = 4;
            this.spriteIndexes[w * (h - 1) + i] = 17;
        }
        for (let i = 1; i < h - 1; i++) {
            this.spriteIndexes[w * i] = 8;
            this.spriteIndexes[w * i + (w - 1)] = 10;
        }
    }
}


/**
 * SpikesUp are Hazards that kill the Player if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, new graphics.TileData(40, 0, -U / 2));
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
        super(x, y, U, U / 2, new graphics.TileData(42));
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
        super(x, y, U / 2, U, new graphics.TileData(41));
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
        super(x + U / 2, y, U / 2, U, new graphics.TileData(43, -U / 2, 0));
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

},{"./constants":1,"./graphics":3,"./sound":11}],9:[function(require,module,exports){
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


class Player extends physics.Actor {
    constructor(x = 0, y = 0, spriteSheet = 'hero_blue') {
        super(x, y, 8, 14);
        this.spriteSheet = spriteSheet;
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
            graphics.sheets[this.spriteSheet],
            16 * index, 16 * row,
            16, 16,
            this.x - 4 + this.shiftX, this.y - 2 + this.shiftY,
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
                if (this.inputs.isPressed("jump") && this.timers.varJump > 0) {
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
            this.inputs.isPressed("dash") &&
            this.inputs.timers.dashBuffer > 0 &&
            this.timers.dashCooldown <= 0 &&
            (this.inputs.xAxis || this.inputs.yAxis)
        ) {
            const dashSpeed = this.inputs.xAxis && this.inputs.yAxis ? constants.DASH_SPEED / Math.sqrt(2) : constants.DASH_SPEED;
            this.dashSpeedX = this.inputs.xAxis * Math.max(Math.abs(this.speedX), dashSpeed);
            this.dashSpeedY = -this.inputs.yAxis * dashSpeed;
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
        if (this.inputs.isPressed("jump") &&
            this.inputs.timers.jumpBuffer > 0 &&
            this.timers.jumpGrace > 0) {
            // regular jump
            this.speedX += this.inputs.xAxis * constants.JUMP_HORIZONTAL_BOOST;
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        } else if (
            this.inputs.isPressed("jump") &&
            this.inputs.timers.jumpBuffer > 0 &&
            (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            let dx = this.hasWallLeft ? 1 : -1;
            if ((this.inputs.xAxis === 1 && this.hasWallRight) || (this.inputs.xAxis === -1 && this.hasWallLeft)) {
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
                    this.inputs.timers.jumpBuffer = 0;
                    this.timers.varJump = constants.VAR_JUMP_TIME;
                    break;
                case constants.STATE_DASH:
                    sound.playSound(sound.dashSound);
                    this.inputs.timers.dashBuffer = 0;
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
}
},{"./constants":1,"./graphics":3,"./inputs":4,"./physics":8,"./sound":11}],10:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
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
        this.player = undefined;
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

    drawHUD(ctx) {
        ctx.fillStyle = "#ffffffaa";
        ctx.fillRect(1, 1, 42, 10);
        ctx.fillStyle = "#000000";
        ctx.textAlign = "right";
        ctx.font = 'normal 6px gameboy';
        ctx.fillText(`${this.player.strawberries.size + this.player.temporaryStrawberries.size}/20`, 40, 8);
        ctx.drawImage(graphics.sheets.tiles, 80, 16, 16, 16, 2, 2, 8, 8);
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

},{"./constants":1,"./graphics":3,"./physics":8}],11:[function(require,module,exports){
const jumpSound = new Audio('sound/char_mad_jump.ogg');
const dashSound = new Audio('sound/char_mad_dash_pink_left.ogg');
const dieSound = new Audio('sound/char_mad_death.ogg');
const crumblingBlockSound = new Audio('sound/game_gen_fallblock_shake.ogg');
const strawberrySound = new Audio('sound/game_gen_strawberry_red_get_1up.ogg');
const dashDiamondSound = new Audio('sound/game_gen_diamond_touch_01.ogg');
const springSound = new Audio('sound/game_gen_spring.ogg');
let soundOn = true;


function toggleSound() {
    soundOn = !soundOn;
    return soundOn;
}


function playSound(sound) {
    if (soundOn) {
        sound.currentTime = 0;
        sound.play();
    }
}


module.exports = {
    playSound,
    toggleSound,
    jumpSound,
    dashSound,
    dieSound,
    crumblingBlockSound,
    strawberrySound,
    dashDiamondSound,
    springSound,
}
},{}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImdyYXBoaWNzLmpzIiwiaW5wdXRzLmpzIiwibWFpbi5qcyIsIm1hcHNfLmpzIiwibWVudS5qcyIsInBoeXNpY3MuanMiLCJwbGF5ZXIuanMiLCJzY2VuZS5qcyIsInNvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4NURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3QrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTkwO1xuY29uc3QgRFlJTkdfVElNRSA9IC44O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY2xhc3MgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgRWZmZWN0U2VxdWVuY2UgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKGVmZmVjdHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5lZmZlY3RzID0gZWZmZWN0cztcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLmR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5lZmZlY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVmZmVjdHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5lZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIsIHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2luZU1vdmVtZW50IGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gdGhpcy50aW1lciAqIDIgKiBNYXRoLlBJIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhdGlvID0gKE1hdGguY29zKGFuZ2xlKSArIDEpIC8gMjtcbiAgICAgICAgICAgIGNvbnN0IGRyYXRpbyA9IE1hdGguUEkgKiBNYXRoLnNpbihhbmdsZSkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8oXG4gICAgICAgICAgICAgICAgcmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLFxuICAgICAgICAgICAgICAgIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55MixcbiAgICAgICAgICAgICAgICBkcmF0aW8gKiAodGhpcy54MiAtIHRoaXMueDEpLFxuICAgICAgICAgICAgICAgIGRyYXRpbyAqICh0aGlzLnkyIC0gdGhpcy55MSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFZmZlY3QsXG4gICAgRWZmZWN0U2VxdWVuY2UsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsImNvbnN0IHNoZWV0cyA9IHt9O1xuY29uc3QgY29udGV4dExheWVyID0ge307XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdG8gYmUgdXNlZCB3aGVuIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IG9mIHRoZSBzY2VuZVxuICovXG5jbGFzcyBUaWxlRGF0YSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHNoaWZ0WCA9IDAsIHNoaWZ0WSA9IDApIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LXBvc2l0aW9uIG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnggPSB0aGlzLmluZGV4ICUgODtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueSA9IHRoaXMuaW5kZXggPj4gMztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtb2Zmc2V0IHRvIGRyYXcgdGhlIHRpbGUgZnJvbSB0aGUgU2NlbmVFbGVtZW50J3MgcG9zaXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRYID0gc2hpZnRYO1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSBzaGlmdFk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvYWRTaGVldCh1cmwsIG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBzaGVldHNbbmFtZV0gPSBpbWFnZTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGltYWdlLnNyYyA9IHVybDtcbiAgICB9KTtcbn1cblxuXG5jb25zdCBsb2FkR3JhcGhpY3MgPSBQcm9taXNlLmFsbChbXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19yZWQucG5nJywgJ2hlcm9fcmVkJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19ncmVlbi5wbmcnLCAnaGVyb19ncmVlbicpLFxuICAgIGxvYWRTaGVldCgnaW1hZ2VzL2hlcm9fYmx1ZS5wbmcnLCAnaGVyb19ibHVlJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvaGVyb19yZWQucG5nJywgJ2hlcm9fcmVkJyksXG4gICAgbG9hZFNoZWV0KCdpbWFnZXMvdGlsZXNldC5wbmcnLCAndGlsZXMnKSxcbl0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFRpbGVEYXRhLFxuICAgIHNoZWV0cyxcbiAgICBsb2FkR3JhcGhpY3MsXG4gICAgY29udGV4dExheWVyLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IEFYRVNfVEhSRVNIT0xEID0gLjQ7XG5cbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmV2aW91c2x5UHJlc3NlZEtleXM7XG5sZXQgY3VycmVudGx5UHJlc3NlZEtleXMgPSBuZXcgU2V0KCk7XG5sZXQgcHJldmlvdXNseVByZXNzZWRCdXR0b25zID0gW107XG5sZXQgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnMgPSBbXTtcblxuXG5mdW5jdGlvbiBnYW1lcGFkQ29ubmVjdGVkKGdhbWVwYWQpIHtcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tnYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn1cblxuXG5mdW5jdGlvbiBnYW1lcGFkRGlzY29ubmVjdGVkKGdhbWVwYWQpIHtcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tnYW1lcGFkLmluZGV4XSA9IHVuZGVmaW5lZDtcbn1cblxuXG5mdW5jdGlvbiB1cGRhdGVJbnB1dHMoKSB7XG4gICAgcHJldmlvdXNseVByZXNzZWRLZXlzID0gY3VycmVudGx5UHJlc3NlZEtleXM7XG4gICAgY3VycmVudGx5UHJlc3NlZEtleXMgPSBuZXcgU2V0KHByZXNzZWRLZXlzKTtcbiAgICBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnMgPSBjdXJyZW50bHlQcmVzc2VkQnV0dG9ucztcbiAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9ucyA9IFtdO1xuICAgIGZvciAoY29uc3QgZ2FtZXBhZCBvZiBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKSkge1xuICAgICAgICBpZiAoZ2FtZXBhZCkge1xuICAgICAgICAgICAgY29uc3QgaSA9IGdhbWVwYWQuaW5kZXg7XG4gICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1tpXSA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ2FtZXBhZC5idXR0b25zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tqXS5wcmVzc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRseVByZXNzZWRCdXR0b25zW2ldLmFkZChqKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbaV0uaGFzKGopKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZ2FtZXBhZC5heGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGJ1dHRvbkluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBpZiAoZ2FtZXBhZC5heGVzW2pdID4gQVhFU19USFJFU0hPTEQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uSW5kZXggPSAyICogaiArIGdhbWVwYWQuYnV0dG9ucy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChnYW1lcGFkLmF4ZXNbal0gPCAtQVhFU19USFJFU0hPTEQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uSW5kZXggPSAyICogaiArIGdhbWVwYWQuYnV0dG9ucy5sZW5ndGggKyAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYnV0dG9uSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudGx5UHJlc3NlZEJ1dHRvbnNbaV0uYWRkKGJ1dHRvbkluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbaV0uaGFzKGJ1dHRvbkluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYnV0dG9uSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFBsYXllcklucHV0cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgdGhpcy5nYW1lcGFkSW5kZXggPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRtYXAgPSB7XG4gICAgICAgICAgICB1cDogMTIsXG4gICAgICAgICAgICBkb3duOiAxMyxcbiAgICAgICAgICAgIGxlZnQ6IDE0LFxuICAgICAgICAgICAgcmlnaHQ6IDE1LFxuICAgICAgICAgICAganVtcDogMCxcbiAgICAgICAgICAgIGRhc2g6IDEsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rZXltYXAgPSB7XG4gICAgICAgICAgICB1cDogJ0Fycm93VXAnLFxuICAgICAgICAgICAgZG93bjogJ0Fycm93RG93bicsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBqdW1wOiAnZycsXG4gICAgICAgICAgICBkYXNoOiAnZicsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7XG4gICAgICAgICAgICBqdW1wQnVmZmVyOiAwLFxuICAgICAgICAgICAgZGFzaEJ1ZmZlcjogMCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpc1ByZXNzZWQoYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50bHlQcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbYWN0aW9uXSkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0gJiZcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0uaGFzKHRoaXMuZ2FtZXBhZG1hcFthY3Rpb25dKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBpc1ByZXZpb3VzbHlQcmVzc2VkKGFjdGlvbikge1xuICAgICAgICByZXR1cm4gcHJldmlvdXNseVByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFthY3Rpb25dKSB8fFxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIHByZXZpb3VzbHlQcmVzc2VkQnV0dG9uc1t0aGlzLmdhbWVwYWRJbmRleF0gJiZcbiAgICAgICAgICAgICAgICBwcmV2aW91c2x5UHJlc3NlZEJ1dHRvbnNbdGhpcy5nYW1lcGFkSW5kZXhdLmhhcyh0aGlzLmdhbWVwYWRtYXBbYWN0aW9uXSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMueEF4aXMgPSAodGhpcy5pc1ByZXNzZWQoXCJsZWZ0XCIpID8gLTEgOiAwKSArICh0aGlzLmlzUHJlc3NlZChcInJpZ2h0XCIpID8gMSA6IDApO1xuICAgICAgICB0aGlzLnlBeGlzID0gKHRoaXMuaXNQcmVzc2VkKFwidXBcIikgPyAxIDogMCkgKyAodGhpcy5pc1ByZXNzZWQoXCJkb3duXCIpID8gLTEgOiAwKTtcbiAgICAgICAgaWYgKCF0aGlzLmlzUHJldmlvdXNseVByZXNzZWQoXCJqdW1wXCIpICYmIHRoaXMuaXNQcmVzc2VkKFwianVtcFwiKSkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmlzUHJldmlvdXNseVByZXNzZWQoXCJkYXNoXCIpICYmIHRoaXMuaXNQcmVzc2VkKFwiZGFzaFwiKSkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuZnVuY3Rpb24gd2FpdEZvckdhbWVwYWRCdXR0b24oKSB7XG4gICAgbGV0IHByZXNzZWRCdXR0b25JbmRleCA9IHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IGdhbWVwYWQgb2YgbmF2aWdhdG9yLmdldEdhbWVwYWRzKCkpIHtcbiAgICAgICAgaWYgKGdhbWVwYWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ2FtZXBhZC5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tpXS5wcmVzc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXNzZWRCdXR0b25JbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHByZXNzZWRCdXR0b25JbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChwcmVzc2VkQnV0dG9uSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUod2FpdEZvckdhbWVwYWRCdXR0b24pO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgZ2FtZXBhZENvbm5lY3RlZCxcbiAgICBnYW1lcGFkRGlzY29ubmVjdGVkLFxuICAgIHVwZGF0ZUlucHV0cyxcbiAgICBwcmVzc2VkS2V5cyxcbiAgICB3YWl0Rm9yR2FtZXBhZEJ1dHRvbixcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHNfJyk7XG5jb25zdCBtZW51ID0gcmVxdWlyZSgnLi9tZW51Jyk7XG5jb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFNDQUxJTkcgPSAzO1xuXG5sZXQgY3VycmVudFNjZW5lO1xubGV0IG1lbnVTdGFjayA9IFtdO1xubGV0IGZyYW1lQ291bnRlciA9IDA7XG5sZXQgZnJhbWVSYXRlUmVmcmVzaCA9IDU7XG5sZXQgZnJhbWVSYXRlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbmxldCBzY3JvbGxYID0gMDtcbmxldCBzY3JvbGxZID0gMDtcblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGdyYXBoaWNzLmNvbnRleHRMYXllci5zY2VuZS50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgY29uc3QgdGltZU5vdyA9IERhdGUubm93KCk7XG5cbiAgICBmcmFtZUNvdW50ZXIgKz0gMTtcbiAgICBpZiAodGltZU5vdyAtIGZyYW1lUmF0ZVN0YXJ0VGltZSA+PSAxMDAwICogZnJhbWVSYXRlUmVmcmVzaCkge1xuICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgZnJhbWVSYXRlU3RhcnRUaW1lID0gdGltZU5vdztcbiAgICB9XG5cbiAgICBpbnB1dHMudXBkYXRlSW5wdXRzKCk7XG4gICAgaWYgKG1lbnVTdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1lbnVTdGFja1swXS51cGRhdGUoKTtcbiAgICAgICAgbWVudVN0YWNrWzBdLmRyYXcoZ3JhcGhpY3MuY29udGV4dExheWVyLm1lbnUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoMSAvIDYwKTtcbiAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgaWYgKGN1cnJlbnRTY2VuZS50cmFuc2l0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgIHByZXZTY2VuZS50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuXG4gICAgICAgIGxldCBjb250ZXh0O1xuICAgICAgICAvLyBjbGVhciBhbmQgcmVkcmF3IG9uIHNjZW5lIGNhbnZhc1xuICAgICAgICBjb250ZXh0ID0gZ3JhcGhpY3MuY29udGV4dExheWVyLnNjZW5lO1xuICAgICAgICBjb250ZXh0LnNhdmUoKTtcbiAgICAgICAgY29udGV4dC5zZXRUcmFuc2Zvcm0oMSwgMCwgMCwgMSwgMCwgMCk7XG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnRleHQuY2FudmFzLndpZHRoLCBjb250ZXh0LmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG5cbiAgICAgICAgY29udGV4dCA9IGdyYXBoaWNzLmNvbnRleHRMYXllci5odWQ7XG4gICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnN0YW50cy5WSUVXX1dJRFRILCBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICBjdXJyZW50U2NlbmUuZHJhd0hVRChjb250ZXh0KTtcbiAgICB9XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG59XG5cblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBrZXlib2FyZCBldmVudHNcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZSA9PiB7XG4gICAgICAgIGlucHV0cy5wcmVzc2VkS2V5cy5hZGQoZS5rZXkpO1xuICAgICAgICBzd2l0Y2ggKGUua2V5KSB7XG4gICAgICAgICAgICBjYXNlICdwJzpcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUuaXNSdW5uaW5nID0gIWN1cnJlbnRTY2VuZS5pc1J1bm5pbmc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNvdW5kLWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRvZ2dsZVNvdW5kKTtcblxuICAgIC8vIHByZXBhcmUgY2FudmFzIGFuZCBjb250ZXh0XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG5cbiAgICBmb3IgKGNvbnN0IGNhbnZhcyBvZiBzY3JlZW4uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJjYW52YXNcIikpIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBncmFwaGljcy5jb250ZXh0TGF5ZXJbY2FudmFzLmlkXSA9IGNvbnRleHQ7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19IRUlHSFQ7XG4gICAgICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgU0NBTElORyk7XG4gICAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gbG9hZCBhbGwgc2NlbmVzIGFuZCBzdGFydCBnYW1lXG4gICAgZ3JhcGhpY3MubG9hZEdyYXBoaWNzLnRoZW4oKCkgPT4ge1xuICAgICAgICBjdXJyZW50U2NlbmUgPSBtYXBzLnNjZW5lcy5jZWxlc3RlMDE7XG4gICAgICAgIGN1cnJlbnRTY2VuZS5zcGF3blBvaW50SW5kZXggPSAxO1xuICAgICAgICBjdXJyZW50U2NlbmUuc2V0UGxheWVyKG5ldyBwbGF5ZXIuUGxheWVyKCkpO1xuICAgICAgICBjdXJyZW50U2NlbmUucmVzZXQoKTtcbiAgICAgICAgdXBkYXRlKCk7XG4gICAgfSk7XG59O1xuXG5cbmZ1bmN0aW9uIHRvZ2dsZVNvdW5kKCkge1xuICAgIGlmIChzb3VuZC50b2dnbGVTb3VuZCgpKSB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic291bmQtYnV0dG9uXCIpLmlubmVyVGV4dCA9IFwiU291bmQgT25cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNvdW5kLWJ1dHRvblwiKS5pbm5lclRleHQgPSBcIlNvdW5kIE9mZlwiO1xuICAgIH1cbn1cblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRDb25uZWN0ZWQoZXZlbnQuZ2FtZXBhZCk7XG59KTtcblxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZERpc2Nvbm5lY3RlZChldmVudC5nYW1lcGFkKTtcbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCJcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY29uc3Qgc2NlbmVzID0ge307XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25VcChzY2VuZTEsIHgxLCBpbmRleDEsIHNjZW5lMiwgeDIsIGluZGV4Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbih4MSAqIFUsIC1VLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCBzY2VuZTIuaGVpZ2h0IC0gMyAqIFUsIGluZGV4MikpO1xuICAgIHNjZW5lMi5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgyICogVSwgc2NlbmUyLmhlaWdodCwgd2lkdGggKiBVLCAwLCBzY2VuZTEsIHgxICogVSwgMiAqIFUsIGluZGV4MSkpO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB5MSwgaW5kZXgxLCBzY2VuZTIsIHkyLCBpbmRleDIsIGhlaWdodCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHNjZW5lMS53aWR0aCwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsIFUsIHkyICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsIHNjZW5lMS53aWR0aCAtIFUsIHkxICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyaWdnZXJCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgc3BlZWQgPSAyMCwgZGVsYXkgPSAuMjUpIHtcbiAgICBjb25zdCBkaXN0YW5jZSA9IE1hdGguc3FydCgoeDIgLSB4MSkgKiAoeDIgLSB4MSkgKyAoeTIgLSB5MSkgKiAoeTIgLSB5MSkpO1xuICAgIGNvbnN0IGR1cmF0aW9uMSA9IGRpc3RhbmNlIC8gc3BlZWQ7XG4gICAgY29uc3QgZHVyYXRpb24yID0gZGlzdGFuY2UgLyA3O1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgZHVyYXRpb24xKSxcbiAgICAgICAgbmV3IGVmZmVjdC5FZmZlY3QoMSksXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDIgKiBVLCB5MiAqIFUsIHgxICogVSwgeTEgKiBVLCBkdXJhdGlvbjIpLFxuICAgIF0pKTtcbn1cblxuZnVuY3Rpb24gbWFrZUZhbGxpbmdCbG9jayh4MSwgeTEsIHgyLCB5Miwgd2lkdGgsIGhlaWdodCwgZGVsYXkgPSAuNSkge1xuICAgIHJldHVybiBuZXcgcGh5c2ljcy5GYWxsaW5nQmxvY2soeDEgKiBVLCB5MSAqIFUsIHdpZHRoICogVSwgaGVpZ2h0ICogVSwgZGVsYXksIG5ldyBlZmZlY3QuRWZmZWN0U2VxdWVuY2UoW1xuICAgICAgICBuZXcgZWZmZWN0LkxpbmVhck1vdmVtZW50KHgxICogVSwgeTEgKiBVLCB4MiAqIFUsIHkyICogVSwgKHkyIC0geTEpIC8gMjUpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxLCAtMSksXG4gICAgXSkpO1xufVxuXG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAxLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEyLCAxOCwgMTgsIDEzLCAxOCwgMTMsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAyNiwgMjcsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTUsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE1LCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDI2LCAyNiwgMjYsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjYsIDI2LCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDUsIDUsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6OCxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwMSA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAyLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMiwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNiwgMjYsIDI2LCAyNiwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MSwgNDEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0NywgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgNSwgNSwgNSwgMjYsIDI2LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNiwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNCwgMjEsIDEwLCA2LCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0NywgNDgsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMDMgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMzIsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCA0NCwgMTUsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE0LCAxMCwgMjMsIDksIDMsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDExLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMiwgMywgMTcsIDE5LCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA1ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTEsIDQ4LCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAyMywgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMjAsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDI2LCAyNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIwLCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDE4LCAxOCwgMTMsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxOSwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIsIDMsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAxLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDIwLCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzgsIDQwLCAxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDldLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM2LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA2ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTMsIDMzLCAxMywgMjMsIDQsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozNSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDIsIDMsIDQ2LCA0OCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAyMCwgNiwgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOCwgMTMsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDIsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQyLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCA0MiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDE3LCAxOCwgMjcsIDM4LCAzOSwgNDAsIDQsIDUsIDUsIDM1LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCA0LCAyLCAyLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzUsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUwNyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMSwgMiwgMiwgMiwgMywgMzgsIDM5LCAzOSwgNDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjUsIDI2LCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQ0LCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQsIDYsIDAsIDAsIDQ0LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA4ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTQsIDE2LCAyMSwgMTIsIDIsIDMpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE4LCAxOCwgMzQsIDM1LCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDIyLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyNiwgMywgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDcsIDQ3LCA0OCwgNCwgMjEsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMTUsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCAxLCAyLCAyMSwgMTEsIDAsIDE0LCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDM5LCAzOSwgNDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTA5ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTEwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTIsIDE4LCAzNCwgMzQsIDM0LCAyMSwgMiwgMywgMCwgMCwgMCwgMTUsIDAsIDAsIDEsIDUsIDUsIDUsIDE4LCAzNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMzQsIDM0LCAzNCwgMTgsIDI2LCAyNiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDIwLCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyNSwgMjYsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDIsIDIsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTExID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE0LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDEsIDIsIDIsIDIsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTEsIDQxLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAzNSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMjMsIDAsIDAsIDE3LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMiwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAzMiwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAzNCwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDM0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAyMCwgMywgMCwgMCwgOSwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCA2LCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgNSwgMzQsIDM0LCAzNCwgMTgsIDExLCAwLCAxNSwgMCwgMCwgMCwgMCwgNTMsIDU0LCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNywgMjYsIDI2LCAyNiwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgNiwgNDYsIDQ4LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0OCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDhcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDIwLCA1LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCAyLCAyLCAyLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAzOCwgMzksIDM5LCA0MCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQ5LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0OVxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxMyA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMjAsIDUsIDYsIDM4LCA0MCwgNCwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMiwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCA2LCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAxLCAyNiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMSwgMjEsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMzQsIDIxLCAzNCwgNiwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDE1LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDM0LCAxOCwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA4LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMjMsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMzMsIDM1LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMiwgMiwgMywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzYsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjozNixcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE0ID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTEsIDI5LCAxOSwgMjksIDQsIDIpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjYsIDI4LCAyNiwgMjIsIDUsIDIpKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA0LCA1LCA1LCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCAyLCA1LCA1LCA1LCAyLCAyLCA2LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDIsIDMsIDQ3LCA0OCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA0MSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgNDEsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAzOCwgMzksIDM5LCA0MCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDQsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCAyLCAyLCAyLCAyLCAyLCAyLCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI5LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTUgPSBzO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjQsIDYsIDI0LCAxNywgMiwgNik7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDUgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcblxuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNSwgMjAsIDksIDIwLCAyLCA0KSk7XG5cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDM0LCAzNCwgMTgsIDE4LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMzQsIDUsIDUsIDUsIDUsIDM1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNywgNDYsIDQ3LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCAyLCAyLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjk2LFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo5NlxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxNiA9IHM7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIsIDIsIDI3LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMiwgMiwgMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMTcgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjQsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCA0MCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDEsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNCxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTE4ID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjozOCxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDM5LCA0MCwgMSwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxLCAyLCAyLCAyLCAzLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjM4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MzgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUxOSA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDIwLCAxNSwgMjAsIDcsIDIsIDQpKTtcbiAgICBzLmFkZFNvbGlkKG1ha2VGYWxsaW5nQmxvY2soMjgsIDksIDI4LCAzNSwgMywgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjcsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDMyLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgNiwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDYsIDAsIDAsIDAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDMyLCAwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgOSwgMjAsIDIsIDIsIDIsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDExLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjoyLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIwID0gcztcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAxOCwgMTgsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAxNywgMTAsIDEwLCAyMCwgNSwgMjYsIDI2LCAyNywgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTAsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgOSwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIsIDI3LCA1OCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNTgsIDU4LCA1OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCAyMSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA4LCA0NiwgNDcsIDQ4LCAzMywgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDMsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgNCwgNiwgMCwgMCwgMCwgNDEsIDQxLCA0LCA2LCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCA0LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDExLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDksIDExLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDExLCA0MSwgNDEsIDksIDIwLCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgOSwgMTEsIDUzLCA1NCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIxLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCA5LCAyMCwgNSwgNiwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIxID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDE0LCA3LCAxNCwgMTUsIDIsIDcsIC43NSk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2spO1xuICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxNCAqIFUsIDYgKiBVKTtcbiAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTUgKiBVLCA2ICogVSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgIGZhbGxpbmdCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgZmFsbGluZ0Jsb2NrLmF0dGFjaChzcGlrZXMyKTtcbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgXCJleHBvcnRcIjpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwidGFyZ2V0XCI6XCIuXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgNDMsIDQzLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgNSwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAzMywgMzQsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDExLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMzgsIDM5LCA0MCwgNCwgMjEsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDEsIDUsIDUsIDUsIDUsIDUsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAyMCwgMiwgMywgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIyID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMzMsIDE1LCAzMywgOSwgMywgMykpO1xuICAgIGNvbnN0IHRyaWdnZXJCbG9jayA9IG1ha2VUcmlnZ2VyQmxvY2soMjUsIDYsIDEzLCA2LCAyLCAzKTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI2ICogVSwgNSAqIFUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczEpO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjI3LFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTksIDAsIDE3LCAxOCwgMTgsIDExLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQzLCA0MywgNDMsIDAsIDQzLCA0MywgNDMsIDE1LCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMSwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDI2LCAyNywgNDYsIDQ3LCA0NywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCA0NiwgNDcsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyNyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDYsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQ2XG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTIzID0gcztcbiAgICBzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjIsIDE4LCAyMiwgOSwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOSwgMTksIDI5LCAxMCwgMiwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygzNiwgMTcsIDM2LCA4LCAyLCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgNDMsIDQzLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDE0LCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxOCwgMTgsIDEzLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDQyLCAwLCAwLCA0NCwgMjMsIDAsIDAsIDksIDEwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjQgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNywgMTgsIDE3LCAxMiwgNCwgMikpO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyOCwgMTksIDI4LCAxMiwgNiwgMikpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiZWRpdG9yc2V0dGluZ3NcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcIi5cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMywgNDgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMzgsIDM5LCA0MCwgMSwgMiwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQzLCA0MywgNDMsIDQzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI1ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sxID0gbWFrZUZhbGxpbmdCbG9jaygxOSwgMTYsIDE5LCAyNSwgNCwgMyk7XG4gICAgcy5hZGRTb2xpZChmYWxsaW5nQmxvY2sxKTtcbiAgICBjb25zdCBzcGlrZXMxID0gW1xuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCgyMyAqIFUsIDE3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KDIzICogVSwgMTggKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigxOSAqIFUsIDE5ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oMjAgKiBVLCAxOSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIxICogVSwgMTkgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigyMiAqIFUsIDE5ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMS5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG5cbiAgICBjb25zdCBmYWxsaW5nQmxvY2syID0gbWFrZUZhbGxpbmdCbG9jaygyMywgNiwgMjMsIDI1LCAyLCA0KTtcbiAgICBzLmFkZFNvbGlkKGZhbGxpbmdCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA3ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA4ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgZmFsbGluZ0Jsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiLlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMiwgMTgsIDE5LCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCAzOSwgNDAsIDEsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDksIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgMiwgMiwgMiwgMiwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE5LCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE0LCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ3LCA0OCwgOSwgMTAsIDExLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA2LCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyNiA9IHM7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg5LCA5LCAyNiwgOSwgMywgNSwgMzUpO1xuICAgIHMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDkgKiBVLCA4ICogVSksXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDEwICogVSwgOCAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMSAqIFUsIDggKiBVKSxcbiAgICBdXG4gICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cbn1cbntcbiAgICBjb25zdCBzID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oXG4gICAgICAgIHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgXCJpbmZpbml0ZVwiOmZhbHNlLFxuICAgICAgICAgXCJsYXllcnNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDEsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgMzksIDQwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMSwgMCwgMCwgMzIsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMSwgMCwgMzMsIDM0LCAzNSwgNTgsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDcsIDQ2LCA0OCwgMjUsIDIsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMTQsIDAsIDQ0LCA5LCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDM4LCAxNSwgMCwgMCwgNDQsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDQ0LCA5LCAxMCwgMjAsIDUsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDM1LCA0NiwgNDcsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMywgNDgsIDAsIDQ0LCA5LCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMiwgMiwgMiwgMiwgMiwgMywgNDYsIDQ3LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5XSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTI3ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDIsIDksIDEwLCA5LCAzLCA0LCAzNSk7XG4gICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDMgKiBVLCA4ICogVSk7XG4gICAgY29uc3Qgc3Bpa2VzMyA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDQgKiBVLCA4ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICBzLmFkZFRoaW5nKHNwaWtlczMpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczMpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgNSwgNSwgMiwgMiwgMiwgNSwgNiwgMzgsIDM5LCAzOSwgNDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNTgsIDU4LCA1OCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDQyLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA1LCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAzLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0OCwgMCwgMCwgMSwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMzQsIDM0LCAzNCwgMzQsIDM0LCAzNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoyLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcImR5bmFtaWNcIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MyxcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUyOCA9IHM7XG4gICAgcy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE2LCAyNSwgMTYsIDE5LCA2LCAyKSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEyLCAxOSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAzOCwgMzksIDM5LCA0MCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMywgMzUsIDQ2LCA0NywgNDcsIDQ4LCAzMywgMzUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyLCAwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgMCwgMCwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMjkgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzAgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMiwgMTksIDQ2LCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDUzLCA1NCwgMSwgMywgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzEgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jayg0LCAyMCwgMTIsIDIwLCA0LCAyLCAzMCkpO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MjgsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDQxLCA0MSwgNCwgNiwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgNDEsIDQxLCA0LCA1LCAxMiwgMTksIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzOCwgNDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA5LCAyMCwgNSwgNSwgMjEsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMzgsIDQwLCA5LCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxOSwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMSwgNDEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA2LCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQsIDUsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDM4LCA0MCwgMSwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjI4LFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzIgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6MzMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MywgNDMsIDQzLCA0MywgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCA5LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA1OCwgNTgsIDU4LCA1OCwgNTgsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDIsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAyNiwgMjYsIDI2LCAyNiwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMjAsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDMzLCAzNCwgMzQsIDUsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDksIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCA0MiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMjAsIDUsIDUsIDUsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMzQsIDM0LCAzNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDQsIDUsIDUsIDYsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCA5LCAxMCwgMTAsIDIwLCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAxNCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDUzLCA1NCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgNDIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgNCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDQyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCAyMSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCA0MiwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgMCwgMSwgMiwgMiwgMiwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMzIsIDAsIDksIDEwLCAxMCwgMTAsIDIwLCAyLCAyLCAyLCAzLCA0NiwgNDcsIDQ4LCAxLCAyLCAyLCAyLCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDYsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDIsIDIsIDMsIDQ2LCA0NywgNDgsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDY1LCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjMzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MixcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJkeW5hbWljXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo1MSxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjMsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NTFcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzMgPSBzO1xuICAgIHMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxLCAyMiwgOCwgMjIsIDMsIDMsIDMwKSk7XG4gICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jayg0OCwgMTUsIDQ4LCA3LCAyLCA0KTtcbiAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoNDggKiBVLCAxNCAqIFUpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0OSAqIFUsIDE0ICogVSk7XG4gICAgcy5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgIHMuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgcy5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTIsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMSwgMiwgMiwgMywgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMiwgNSwgNSwgNSwgNSwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0NCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDQsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQ0LCAxNywgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0OCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgOSwgMTIsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE5LCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA5LCAxMCwgMTIsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA1LCA1LCA1LCAyMSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDIxLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOCwgNDEsIDAsIDAsIDAsIDAsIDAsIDksIDE4LCAxOCwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCA2LCAwLCAwLCAwLCAwLCAwLCAyMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDksIDExLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDIsIDIsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAyMCwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA0NiwgNDcsIDQ4LCAxLCAyMSwgMTEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMjAsIDUsIDUsIDYsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNCwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgOSwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMjAsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9LCBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjoyOSxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NTIsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjUyXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM0ID0gcztcbiAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA4LCAyMywgMjMsIDMsIDQpO1xuICAgIHMuYWRkU29saWQoZmFsbGluZ0Jsb2NrKTtcbiAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIzICogVSwgNyAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDcgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA3ICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICBmYWxsaW5nQmxvY2suYXR0YWNoKHNwaWtlKTtcbiAgICAgICAgcy5hZGRUaGluZyhzcGlrZSk7XG4gICAgfVxuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxMSwgMTYsIDExLCAyNSwgMiwgMykpO1xuICAgIHMuYWRkU29saWQobWFrZUZhbGxpbmdCbG9jaygxNCwgMywgMTQsIDIyLCAzLCA1KSk7XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAyMiwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQxLCA0MSwgNCwgNSwgNSwgNSwgNSwgNiwgNDEsIDQxLCA0MSwgNDEsIDQxLCA0MSwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTQsIDAsIDAsIDQxLCA0MSwgNDEsIDQxLCA0LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDE4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAyLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMzgsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTBdLFxuICAgICAgICAgICAgICAgICBcImhlaWdodFwiOjIzLFxuICAgICAgICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJuYW1lXCI6XCJtYWluXCIsXG4gICAgICAgICAgICAgICAgIFwib3BhY2l0eVwiOjEsXG4gICAgICAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgIFwidmlzaWJsZVwiOnRydWUsXG4gICAgICAgICAgICAgICAgIFwid2lkdGhcIjo0MCxcbiAgICAgICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgICAgICAgXCJ5XCI6MFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgICAgICBcIm5leHRvYmplY3RpZFwiOjEsXG4gICAgICAgICBcIm9yaWVudGF0aW9uXCI6XCJvcnRob2dvbmFsXCIsXG4gICAgICAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgICAgICBcInRpbGVkdmVyc2lvblwiOlwiMS4zLjVcIixcbiAgICAgICAgIFwidGlsZWhlaWdodFwiOjE2LFxuICAgICAgICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZmlyc3RnaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcInNvdXJjZVwiOlwidGlsZXNldC50c3hcIlxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgXCJ0aWxld2lkdGhcIjoxNixcbiAgICAgICAgIFwidHlwZVwiOlwibWFwXCIsXG4gICAgICAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgICAgICBcIndpZHRoXCI6NDBcbiAgICAgICAgfSAgICApO1xuICAgIHNjZW5lcy5jZWxlc3RlMzUgPSBzO1xufVxue1xuICAgIGNvbnN0IHMgPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihcbiAgICAgICAgeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgICAgICBcImxheWVyc1wiOltcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDEzLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDMyLCAwLCAwLCAwLCAwLCAwLCAxNywgMTgsIDE4LCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDAsIDAsIDAsIDcsIDQ2LCA0NywgNDcsIDQ4LCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCA0NiwgNDgsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTMsIDExLCA0NiwgNDgsIDAsIDAsIDAsIDAsIDM4LCAzOSwgMzksIDQwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxNywgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDIzLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMjMsIDM4LCAzOSwgMzksIDM5LCA0MCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMTcsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTMsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTgsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCA1MywgNTQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDAsIDAsIDAsIDAsIDQsIDYsIDQ4LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAzMiwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDIsIDIsIDIsIDIsIDIxLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOV0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6NDMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImRhdGFcIjpbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNDEsIDQxLCA0MSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNDEsIDQxLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDY1LCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCA2NSwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCA2NSwgNjUsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDY1LCA2NSwgMCwgMCwgMCwgMCwgMCwgNjUsIDY1LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICAgXCJoZWlnaHRcIjo0MyxcbiAgICAgICAgICAgICAgICAgXCJpZFwiOjIsXG4gICAgICAgICAgICAgICAgIFwibmFtZVwiOlwiZHluYW1pY1wiLFxuICAgICAgICAgICAgICAgICBcIm9wYWNpdHlcIjoxLFxuICAgICAgICAgICAgICAgICBcInR5cGVcIjpcInRpbGVsYXllclwiLFxuICAgICAgICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgICAgICBcIndpZHRoXCI6NDAsXG4gICAgICAgICAgICAgICAgIFwieFwiOjAsXG4gICAgICAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwibmV4dGxheWVyaWRcIjozLFxuICAgICAgICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgICAgICAgXCJvcmllbnRhdGlvblwiOlwib3J0aG9nb25hbFwiLFxuICAgICAgICAgXCJyZW5kZXJvcmRlclwiOlwicmlnaHQtZG93blwiLFxuICAgICAgICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgICAgICBcInRpbGVoZWlnaHRcIjoxNixcbiAgICAgICAgIFwidGlsZXNldHNcIjpbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICBcImZpcnN0Z2lkXCI6MSxcbiAgICAgICAgICAgICAgICAgXCJzb3VyY2VcIjpcInRpbGVzZXQudHN4XCJcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgICAgICBcInR5cGVcIjpcIm1hcFwiLFxuICAgICAgICAgXCJ2ZXJzaW9uXCI6MS4yLFxuICAgICAgICAgXCJ3aWR0aFwiOjQwXG4gICAgICAgIH0gICAgKTtcbiAgICBzY2VuZXMuY2VsZXN0ZTM2ID0gcztcbiAgICBjb25zdCB0cmlnZ2VyQmxvY2sxID0gbWFrZVRyaWdnZXJCbG9jaygyLCAyNiwgOSwgMjYsIDIsIDMsIDMwKTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazEpO1xuICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCAyNSAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzICogVSwgMjUgKiBVKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzMSkge1xuICAgICAgICB0cmlnZ2VyQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgIHMuYWRkVGhpbmcoc3Bpa2UpO1xuICAgIH1cblxuICAgIGNvbnN0IHRyaWdnZXJCbG9jazIgPSBtYWtlVHJpZ2dlckJsb2NrKDM1LCAyMywgMzUsIDE1LCAzLCA0KTtcbiAgICBzLmFkZFNvbGlkKHRyaWdnZXJCbG9jazIpO1xuICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDM1ICogVSwgMjIgKiBVKSxcbiAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMzYgKiBVLCAyMiAqIFUpLFxuICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzNyAqIFUsIDIyICogVSksXG4gICAgXTtcbiAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczIpIHtcbiAgICAgICAgdHJpZ2dlckJsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICBzLmFkZFRoaW5nKHNwaWtlKTtcbiAgICB9XG59XG57XG4gICAgY29uc3QgcyA9IHNjZW5lLlNjZW5lLmZyb21KU09OKFxuICAgICAgICB7IFwiY29tcHJlc3Npb25sZXZlbFwiOi0xLFxuICAgICAgICAgXCJoZWlnaHRcIjoyMyxcbiAgICAgICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICAgICAgIFwibGF5ZXJzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJkYXRhXCI6WzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAyMCwgMiwgMiwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNCwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMzIsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIsIDIsIDIsIDIsIDUsIDUsIDUsIDUsIDUsIDUsIDEwLCAyMCwgNSwgNSwgMiwgMywgNDYsIDQ3LCA0OCwgMSwgMiwgMiwgMiwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDAsIDAsIDAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAwLCAwLCAwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMF0sXG4gICAgICAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICAgICAgIFwiaWRcIjoxLFxuICAgICAgICAgICAgICAgICBcIm5hbWVcIjpcIm1haW5cIixcbiAgICAgICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6XCJ0aWxlbGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgXCJ2aXNpYmxlXCI6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgICAgICBcInhcIjowLFxuICAgICAgICAgICAgICAgICBcInlcIjowXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcIm5leHRsYXllcmlkXCI6MixcbiAgICAgICAgIFwibmV4dG9iamVjdGlkXCI6MSxcbiAgICAgICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICAgICAgIFwicmVuZGVyb3JkZXJcIjpcInJpZ2h0LWRvd25cIixcbiAgICAgICAgIFwidGlsZWR2ZXJzaW9uXCI6XCIxLjMuNVwiLFxuICAgICAgICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgICAgICBcInRpbGVzZXRzXCI6W1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICAgICAgIFwic291cmNlXCI6XCJ0aWxlc2V0LnRzeFwiXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICBcInRpbGV3aWR0aFwiOjE2LFxuICAgICAgICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICAgICAgIFwidmVyc2lvblwiOjEuMixcbiAgICAgICAgIFwid2lkdGhcIjo0MFxuICAgICAgICB9ICAgICk7XG4gICAgc2NlbmVzLmNlbGVzdGUzNyA9IHM7XG59XG5cbi8vIHtcbi8vICAgICB7e2xvdWlzMDF9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwMn19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczAzfX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDR9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwNX19XG4vLyB9XG4vLyB7XG4vLyAgICAge3tsb3VpczA2fX1cbi8vIH1cbi8vIHtcbi8vICAgICB7e2xvdWlzMDd9fVxuLy8gfVxuLy8ge1xuLy8gICAgIHt7bG91aXMwOH19XG4vLyB9XG5cblxuLy8gVHJhbnNpdGlvbnNcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwMSwgMzEsIDAsIHNjZW5lcy5jZWxlc3RlMDIsIDEsIDEsIDUpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTAyLCAzNCwgMCwgc2NlbmVzLmNlbGVzdGUwMywgMiwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMDMsIDMzLCAwLCBzY2VuZXMuY2VsZXN0ZTA0LCAzLCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNCwgMjEsIDAsIHNjZW5lcy5jZWxlc3RlMDUsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTA1LCAyMiwgMCwgc2NlbmVzLmNlbGVzdGUwNiwgMywgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDcsIDI5LCAwLCBzY2VuZXMuY2VsZXN0ZTA2LCAzMCwgMSwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDYsIDMwLCAyLCBzY2VuZXMuY2VsZXN0ZTA4LCA1LCAwLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUwNiwgMzUsIDAsIHNjZW5lcy5jZWxlc3RlMDksIDEsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTEwLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTA5LCA3LCAxLCA0KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMSwgOCwgMSwgc2NlbmVzLmNlbGVzdGUxMCwgOCwgMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMTAsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMTIsIDQyLCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUxMSwgMywgMCwgc2NlbmVzLmNlbGVzdGUxMiwgMywgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMDksIDAsIDAsIHNjZW5lcy5jZWxlc3RlMTMsIDAsIDAsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxMywgLjUsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDIyLjUsIDIsIDEwKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxNSwgMjIsIDEsIHNjZW5lcy5jZWxlc3RlMTQsIDQsIDAsIDUpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE2LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxNSwgMiwgMCwgMik7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMTQsIDEsIDEsIHNjZW5lcy5jZWxlc3RlMTcsIDEwLCAyLCA5KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUxOCwgMTcsIDAsIHNjZW5lcy5jZWxlc3RlMTcsIDIsIDAsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE4LCAxOSwgMCwgc2NlbmVzLmNlbGVzdGUxOSwgMTMsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTE5LCAyLCAwLCBzY2VuZXMuY2VsZXN0ZTIwLCAyLCAwLCAyKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyMCwgMTIsIDEsIHNjZW5lcy5jZWxlc3RlMjEsIDgsIDIsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIxLCAyNiwgMSwgc2NlbmVzLmNlbGVzdGUyMiwgMjYsIDAsIDEpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTIzLCA3LCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyNywgMywgNyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjEsIDIsIDAsIHNjZW5lcy5jZWxlc3RlMjQsIDgsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTE3LCAzMywgMSwgc2NlbmVzLmNlbGVzdGUyNSwgNywgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjUsIDIyLCAwLCBzY2VuZXMuY2VsZXN0ZTIxLCAyLCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyNCwgMzIsIDAsIHNjZW5lcy5jZWxlc3RlMjYsIDQsIDEsIDQpO1xubWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuY2VsZXN0ZTI2LCAzLCAwLCBzY2VuZXMuY2VsZXN0ZTI3LCAxNiwgMywgMyk7XG5tYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5jZWxlc3RlMjcsIDIsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDI4LCAyLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUyOSwgMTMsIDEsIHNjZW5lcy5jZWxlc3RlMjgsIDE4LCAxLCA1KTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzMCwgNiwgMCwgc2NlbmVzLmNlbGVzdGUyOSwgNiwgMCwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMjcsIDYsIDIsIHNjZW5lcy5jZWxlc3RlMzEsIDYsIDAsIDIpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI3LCAzMSwgMCwgc2NlbmVzLmNlbGVzdGUzMiwgMTcsIDEsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTI4LCA1LCAwLCBzY2VuZXMuY2VsZXN0ZTMzLCA1LCAxLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUyOCwgMjgsIDIsIHNjZW5lcy5jZWxlc3RlMzMsIDI4LCAyLCAzKTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzMiwgNCwgMCwgc2NlbmVzLmNlbGVzdGUzMywgNDQsIDMsIDMpO1xubWFrZVRyYW5zaXRpb25VcChzY2VuZXMuY2VsZXN0ZTMzLCAxMCwgMCwgc2NlbmVzLmNlbGVzdGUzNCwgMywgMiwgMyk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5jZWxlc3RlMzUsIDEzLCAwLCBzY2VuZXMuY2VsZXN0ZTM0LCAzLCAwLCAzKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmNlbGVzdGUzNCwgMTUsIDEsIHNjZW5lcy5jZWxlc3RlMzYsIDI5LCAxLCA5KTtcbm1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmNlbGVzdGUzNiwgOCwgMCwgc2NlbmVzLmNlbGVzdGUzNywgNiwgMCwgMyk7XG5cbi8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLmxvdWlzMDEsIDM1LCAwLCBzY2VuZXMubG91aXMwMiwgNCwgMSwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczAzLCAzLCAwLCBzY2VuZXMubG91aXMwMiwgMTMsIDAsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwMywgMzAsIDEsIHNjZW5lcy5sb3VpczAyLCAyMywgMiwgMyk7XG4vLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5sb3VpczA0LCA0LCAwLCBzY2VuZXMubG91aXMwMiwgMzUsIDMsIDMpO1xuLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMubG91aXMwNSwgMzMsIDAsIHNjZW5lcy5sb3VpczA2LCAxLCAxLCA1KTtcbi8vIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLmxvdWlzMDYsIDgsIDAsIHNjZW5lcy5sb3VpczA3LCA4LCAxLCA2KTtcbi8vIHNjZW5lcy5sb3VpczA2LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMTEuNSAqIFUsIDE1ICogVSwgMCwgMyAqIFUsIHNjZW5lcy5sb3VpczA4LCBVLCAxMyAqIFUsIDApKTtcbi8vIHNjZW5lcy5sb3VpczA4LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMCwgMTMgKiBVLCAwLCAzICogVSwgc2NlbmVzLmxvdWlzMDYsIDEwICogVSwgMTUgKiBVLCAxKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbn1cbiIsImNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cbmNsYXNzIE1lbnUge1xuICAgIGNvbnN0cnVjdG9yKHRpdGxlLCBvcHRpb25zLCBzZWxlY3RlZCA9IDApIHtcbiAgICAgICAgdGhpcy50aXRsZSA9IHRpdGxlO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICB0aGlzLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY3R4LmZvbnQgPSAnbm9ybWFsIDEycHggZ2FtZWJveSc7XG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xuICAgICAgICBjb25zdCBsaW5lSGVpZ2h0ID0gY3R4Lm1lYXN1cmVUZXh0KCdNJykuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQ7XG5cbiAgICAgICAgdGhpcy5kcmF3TGluZSh0aGlzLnRpdGxlLCBsaW5lSGVpZ2h0LCBjdHgpO1xuICAgICAgICAvLyBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmYWFcIjtcbiAgICAgICAgLy8gY29uc3QgdGV4dE1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobWVzc2FnZSk7XG4gICAgICAgIC8vIGN0eC5maWxsUmVjdChcbiAgICAgICAgLy8gICAgIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiAtIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94TGVmdCAtIDUsXG4gICAgICAgIC8vICAgICBjb25zdGFudHMuVklFV19IRUlHSFQgLyAyIC0gdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgLSA1LFxuICAgICAgICAvLyAgICAgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hSaWdodCArIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94TGVmdCArIDEwLFxuICAgICAgICAvLyAgICAgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hEZXNjZW50ICsgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgKyAxMCk7XG4gICAgICAgIC8vIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcbiAgICAgICAgLy8gY3R4LmZpbGxUZXh0KG1lc3NhZ2UsIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiwgY29uc3RhbnRzLlZJRVdfSEVJR0hUIC8gMik7XG4gICAgfVxuXG4gICAgZHJhd0xpbmUobWVzc2FnZSwgeSwgY3R4LCBzZWxlY3RlZCA9IGZhbHNlKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBzZWxlY3RlZCA/IFwiIzAwMDAwMGFhXCIgOiBcIiNmZmZmZmZhYVwiO1xuICAgICAgICBjb25zdCB0ZXh0TWV0cmljcyA9IGN0eC5tZWFzdXJlVGV4dChtZXNzYWdlKTtcbiAgICAgICAgY3R4LmZpbGxSZWN0KFxuICAgICAgICAgICAgY29uc3RhbnRzLlZJRVdfV0lEVEggLyAyIC0gdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hMZWZ0IC0gNSxcbiAgICAgICAgICAgIHkgLSB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveEFzY2VudCAtIDUsXG4gICAgICAgICAgICB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveFJpZ2h0ICsgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hMZWZ0ICsgMTAsXG4gICAgICAgICAgICB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveEFzY2VudCArIDEwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHNlbGVjdGVkID8gXCIjZmZmZmZmXCIgOiBcIiMwMDAwMDBcIjtcbiAgICAgICAgY3R4LmZpbGxUZXh0KG1lc3NhZ2UsIGNvbnN0YW50cy5WSUVXX1dJRFRIIC8gMiwgeSk7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGRpc3BsYXlNZXNzYWdlKG1lc3NhZ2UsIGN0eCwgeSwgc2VsZWN0ZWQgPSBmYWxzZSkge1xuICAgIGN0eC5mb250ID0gJ25vcm1hbCAxMnB4IGdhbWVib3knO1xuICAgIGN0eC50ZXh0QWxpZ24gPSBcImNlbnRlclwiO1xuXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmZmZmZmFhXCI7XG4gICAgY29uc3QgdGV4dE1ldHJpY3MgPSBjdHgubWVhc3VyZVRleHQobWVzc2FnZSk7XG4gICAgY3R4LmZpbGxSZWN0KFxuICAgICAgICBjb25zdGFudHMuVklFV19XSURUSCAvIDIgLSB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveExlZnQgLSA1LFxuICAgICAgICB5IC0gdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hBc2NlbnQgLSA1LFxuICAgICAgICB0ZXh0TWV0cmljcy5hY3R1YWxCb3VuZGluZ0JveFJpZ2h0ICsgdGV4dE1ldHJpY3MuYWN0dWFsQm91bmRpbmdCb3hMZWZ0ICsgMTAsXG4gICAgICAgIHRleHRNZXRyaWNzLmFjdHVhbEJvdW5kaW5nQm94QXNjZW50ICsgMTApO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcbiAgICBjdHguZmlsbFRleHQobWVzc2FnZSwgY29uc3RhbnRzLlZJRVdfV0lEVEggLyAyLCB5KTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNZW51LFxuICAgIGRpc3BsYXlNZXNzYWdlLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0d28gc2VnbWVudHMgb24gYSAxRCBsaW5lIG92ZXJsYXAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFNjZW5lRWxlbWVudHMgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgYXBwZWFyIGluIGEgc2NlbmUgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZGVjb3JhdGlvbnMsIGV0Yy4pXG4gKlxuICogQWxsIEVsZW1lbnRzIGFyZSByZXByZXNlbnRlZCBhcyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgYW5kIHRoZSBzcGFjZSB0aGV5IG9jY3VweSBpbiBhIHNjZW5lIGlzIHRoZXJlZm9yZSBkZWZpbmVkXG4gKiBhcyBhIHBvc2l0aW9uICh4LCB5KSBhbmQgYSBzaXplICh3aWR0aCwgaGVpZ2h0KS4gQXQgYWxsIHRpbWVzLCBwb3NpdGlvbnMgYW5kIHNpemVzIHNob3VsZCBiZSBpbnRlZ2Vycy4gU3ViLWludGVnZXJcbiAqIHBvc2l0aW9ucyBhcmUgY29uc2lkZXJlZCB3aXRoIHRoZSB1c2Ugb2YgdGhlIGB4UmVtYWluZGVyYCBhbmQgYHlSZW1haW5kZXJgIGF0dHJpYnV0ZXMgKHRoYXQgc2hvdWxkIGhhdmUgYW4gYWJzb2x1dGVcbiAqIHZhbHVlIDwgMSlcbiAqL1xuY2xhc3MgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIG9mIHRoZSBsZWZ0bW9zdCBzaWRlIG9mIHRoZSBib3VuZGluZyBib3ggKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGluaXRpYWwgeC1jb29yZGluYXRlICh1c2VkIGZvciByZXNldCgpKVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydFggPSB4O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB5LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WSA9IHk7XG4gICAgICAgIHRoaXMuc2hpZnRYID0gMDtcbiAgICAgICAgdGhpcy5zaGlmdFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogd2lkdGggb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogaGVpZ2h0IG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB4LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHktcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeC1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeS1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNjZW5lRWxlbWVudCBzaG91bGQgYmUgY29uc2lkZXJlZCBieSB0aGUgRW5naW5lIG9yIG5vdCAoaW5hY3RpdmUgU2NlbmVFbGVtZW50cyBhcmUgaWdub3JlZCB3aGVuXG4gICAgICAgICAqIGludGVyYWN0aW9ucyBhcmUgY29tcHV0ZWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB1c2VkIHRvIHJlcHJlc2VudCB0aGUgU2NlbmVFbGVtZW50IChpZiByZXByZXNlbnRlZCBieSBhIHNpbmdsZSB0aWxlKVxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aWxlRGF0YSA9IHRpbGVEYXRhO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBlZmZlY3RzIGFwcGxpZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBAdHlwZSB7W0VmZmVjdF19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVmZmVjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNjZW5lIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgaW5jbHVkZWRcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaWN0aW9uYXJ5IG9mIHRpbWVycyAobnVtYmVycykgdGhhdCBhcmUgYXV0b21hdGljYWxseSBkZWNyZW1lbnRlZCBhdCBlYWNoIHVwZGF0ZVxuICAgICAgICAgKiBAdHlwZSB7e251bWJlcn19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IG9mIFNjZW5lRWxlbWVudHMgdGhhdCBhcmUgYXR0YWNoZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBXaGVuZXZlciBgdGhpc2AgaXMgbW92ZWQsIGFsbCBhdHRhY2hlZCBFbGVtZW50cyB3aWxsIGFsc28gYmUgbW92ZWQgYnkgdGhlIHNhbWUgYW1vdW50XG4gICAgICAgICAqXG4gICAgICAgICAqIFdhcm5pbmc6IEJlY2F1c2Ugb2YgdGhlIHNwZWNpYWwgY29uc3RyYWludHMgb24gQWN0b3IgcG9zaXRpb25zLCBBY3RvcnMgc2hvdWxkIG5vdCBiZSBhdHRhY2hlZCB0byBhXG4gICAgICAgICAqIFNjZW5lRWxlbWVudC4gVGhlIHBhcnRpY3VsYXIgY2FzZSBvZiBBY3RvcnMgXCJyaWRpbmdcIiBhIFNvbGlkIGlzIGhhbmRsZWQgc2VwYXJhdGVseSBpbiB0aGUgU29saWQubW92ZSgpXG4gICAgICAgICAqIG1ldGhvZC5cbiAgICAgICAgICogQHR5cGUge1NldDxTY2VuZUVsZW1lbnQ+fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lRWxlbWVudCB0byB3aGljaCB0aGlzIGlzIGF0dGFjaGVkLCBpZiBhbnlcbiAgICAgICAgICogQHR5cGUge1NjZW5lRWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgdGhpc2Agb3ZlcmxhcHMgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgb3RoZXJgLlxuICAgICAqXG4gICAgICogVHdvIFNjZW5lRWxlbWVudHMgb3ZlcmxhcCBpZiBmb3IgYm90aCBkaW1lbnNpb25zIHRoZSBlbmQgcG9zaXRpb24gb2YgZWFjaCBTY2VuZUVsZW1lbnQgaXMgc3RyaWN0bHkgZ3JlYXRlciB0aGFuXG4gICAgICogdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBvdGhlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciB7U2NlbmVFbGVtZW50fVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG4gICAgICovXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBTY2VuZUVsZW1lbnQgaW4gdGhlIENhbnZhcyBhc3NvY2lhdGVkIHRvIHRoZSBDb250ZXh0IGdpdmVuIGFzIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIGN0eCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0IG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBkcmF3blxuICAgICAqL1xuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbGVEYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzaGlmdFggPSB0aGlzLnNoaWZ0WDtcbiAgICAgICAgICAgIGxldCBzaGlmdFkgPSB0aGlzLnNoaWZ0WTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkVG8pIHtcbiAgICAgICAgICAgICAgICBzaGlmdFggKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WDtcbiAgICAgICAgICAgICAgICBzaGlmdFkgKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgZ3JhcGhpY3Muc2hlZXRzLnRpbGVzLFxuICAgICAgICAgICAgICAgIDE2ICogdGhpcy50aWxlRGF0YS54LCAxNiAqIHRoaXMudGlsZURhdGEueSxcbiAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgdGhpcy54ICsgdGhpcy50aWxlRGF0YS5zaGlmdFggKyBzaGlmdFgsIHRoaXMueSArIHRoaXMudGlsZURhdGEuc2hpZnRZICsgc2hpZnRZLFxuICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgcHJvcGVydGllcyBhdCB0aGUgc3RhcnQgb2YgYSBuZXcgdXBkYXRlIG9mIHRoZSBTY2VuZVxuICAgICAqL1xuICAgIGJlZm9yZVVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBzdGF0ZSBvZiB0aGUgU2NlbmVFbGVtZW50IChjYWxsZWQgYXQgZWFjaCBmcmFtZSB3aGVuIHRoZSBTY2VuZSBpcyBhY3RpdmUpXG4gICAgICogQHBhcmFtIGRlbHRhVGltZSB7bnVtYmVyfSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCB1cGRhdGUgKGluIHNlY29uZHMpXG4gICAgICovXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICAvLyB1cGRhdGUgdGltZXJzXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIC8vIHVwZGF0ZSBlZmZlY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnVwZGF0ZShkZWx0YVRpbWUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIFNjZW5lRWxlbWVudCBieSBhIGdpdmVuIGFtb3VudFxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgcmlnaHRcbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIGRvd25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICAvLyBtb3ZlIGFsbCBlbGVtZW50cyBhdHRhY2hlZCB0byB0aGlzXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSwgbXgsIG15KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIFNjZW5lIEVsZW1lbnQgdG8gYSBnaXZlbiBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB4IHtudW1iZXJ9IHgtY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHkge251bWJlcn0geS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKi9cbiAgICBtb3ZlVG8oeCwgeSwgbXgsIG15KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyLCBteCwgbXkpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnN0YXJ0WDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy5zdGFydFk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICBmb3IgKGNvbnN0IHRpbWVyIGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0aW1lcl0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWZmZWN0cy5sZW5ndGggPSAwOyAgICAvLyBjbGVhciBhbGwgZWZmZWN0c1xuICAgIH1cblxuICAgIGFkZEVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgdGhpcy5lZmZlY3RzLnB1c2goZWZmZWN0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlRWZmZWN0KGVmZmVjdCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZWZmZWN0cy5pbmRleE9mKGVmZmVjdCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGF0dGFjaFxuICAgICAqL1xuICAgIGF0dGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5hZGQoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0YWNoZXMgYSBnaXZlbiBTY2VuZUVsZW1lbnQgdG8gdGhpc1xuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnQgdG8gZGV0YWNoXG4gICAgICovXG4gICAgZGV0YWNoKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5hdHRhY2hlZFRvID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEFjdG9ycyBhcmUgU2NlbmVFbGVtZW50cyBpbiBhIFNjZW5lIHRoYXQgY2Fubm90IHBhc3MgdGhyb3VnaCBTb2xpZHMgKHBsYXllciBjaGFyYWN0ZXJzIGFuZCBlbmVtaWVzIGZvciBpbnN0YW5jZSlcbiAqL1xuY2xhc3MgQWN0b3IgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICB0aGlzLm1vdmVYKGR4KTtcbiAgICAgICAgdGhpcy5tb3ZlWShkeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBBY3RvciBpcyBjdXJyZW50bHkgXCJyaWRpbmdcIiB0aGUgU29saWQgZ2l2ZW4gYXMgcGFyYW1ldGVyLCBtZWFuaW5nIHRoYXQgd2hlbiB0aGUgU29saWRcbiAgICAgKiBtb3ZlcyBpdCBzaG91bGQgbW92ZSB0aGUgQWN0b3IgdG9vLlxuICAgICAqIEFuIEFjdG9yIGlzIGNvbnNpZGVyZWQgdG8gYmUgcmlkaW5nIGEgU29saWQgaXQgaXMgc3RhbmRpbmcgZGlyZWN0bHkgb24gdG9wIG9mIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvbGlkIHtTb2xpZH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNhbGwgd2hlbiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkIHdoaWxlIGJlaW5nIHB1c2hlZCBieSBhbm90aGVyXG4gICAgICovXG4gICAgc3F1aXNoKCkge1xuICAgIH1cblxuICAgIHNldE1vbWVudHVtWChteCkge1xuICAgICAgICBpZiAobXgpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtWShteSkge1xuICAgICAgICBpZiAobXkpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNvbGlkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IEFjdG9ycyBjYW5ub3QgcGFzcyB0aHJvdWdoLiBUaGVyZSBzaG91bGQgbmV2ZXIgYmUgYW4gQWN0b3Igb3ZlcmxhcHBpbmcgYSBTb2xpZCAodW5sZXNzXG4gKiBlaXRoZXIgb25lIGlzIG1hcmtlZCBhcyBpbmFjdGl2ZSkuIFdoZW4gU29saWRzIG1vdmUsIHRoZXkgaW50ZXJhY3Qgd2l0aCBBY3RvcnMgdGhhdCBtaWdodCBvdGhlcndpc2Ugb3ZlcmxhcCAodGhleVxuICogbWlnaHQgcHVzaCB0aGVtLCBraWxsIHRoZW0sIGV0Yy4pLlxuICpcbiAqIFR3byBTb2xpZHMgbWlnaHQgb3ZlcmxhcCwgYW5kIGluIGdlbmVyYWwgdGhlIG1vdmVtZW50IG9mIGEgU29saWQgaXMgbm90IGFmZmVjdGVkIGJ5IG90aGVyIFNvbGlkcy5cbiAqL1xuY2xhc3MgU29saWQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNvbGlkIHNob3VsZCBiZSBjb25zaWRlcmVkIHdoZW4gY2hlY2tpbmcgY29sbGlzaW9ucyB3aXRoIGFuIEFjdG9yXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIGlzIHVzZWQgYXV0b21hdGljYWxseSBieSB0aGUgbW92ZSgpIG1ldGhvZCB3aGVuIHRoZSBTb2xpZCBwdXNoZXMgYW4gQWN0b3IuIEl0IHNob3VsZCBub3QgYmVcbiAgICAgICAgICogY2hhbmdlZCBpbiBvdGhlciBjaXJjdW1zdGFuY2VzICh1c2UgaXNBY3RpdmUgdG8gZGlzYWJsZSB0aGUgU29saWQpLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHksIG14LCBteSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPCBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCAtIGFjdG9yLnggLSBhY3Rvci53aWR0aCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYID4gbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb3ZlWSkge1xuICAgICAgICAgICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgKyB0aGlzLmhlaWdodCAtIGFjdG9yLnksICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55IC0gYWN0b3IueSAtIGFjdG9yLmhlaWdodCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZID4gbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIFNvbGlkIGlzIGNvbnNpZGVyZWQgdG8gY29sbGlkZSB3aXRoIGFuIEFjdG9yIG1vdmluZyBieSBhIGdpdmVuIGFtb3VudCBpbiBib3RoIGF4ZXMuXG4gICAgICpcbiAgICAgKiBUbyBzaW1wbGlmeSB0aGUgY29tcHV0YXRpb24sIHRoZSBmdW5jdGlvbiBjaGVja3MgaWYgdGhlIGJvdW5kaW5nIGJveCBvZiB0aGUgc29saWQgb3ZlcmxhcHMgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAgKiByZWN0YW5nbGUgY29udGFpbmluZyB0aGUgYXJlYXMgb2NjdXBpZWQgYnkgdGhlIEFjdG9yIGF0IHRoZSBzdGFydCBhbmQgZW5kIG9mIGl0cyBtb3ZlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhY3RvciB7QWN0b3J9XG4gICAgICogQHBhcmFtIGR4IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHgtYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHktYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIFNvbGlkIG92ZXJsYXBzIHRoZSBBY3RvciBhdCBhbnkgcG9pbnQgZHVyaW5nIGl0cyBtb3ZlbWVudFxuICAgICAqL1xuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGggKyBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54ICsgZHgsIGFjdG9yLndpZHRoIC0gZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCArIGR5KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSArIGR5LCBhY3Rvci5oZWlnaHQgLSBkeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEhhemFyZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBraWxsIHRoZSBwbGF5ZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBIYXphcmQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogUGxhdGZvcm1zIGFyZSBmbGF0IFNvbGlkcyAoMCBoZWlnaHQpIHRoYXQgQWN0b3JzIGNhbiBwYXNzIHRocm91Z2ggd2hlbiBtb3ZpbmcgdXB3YXJkcyBidXQgbm90IGRvd253YXJkcyAoaWYgdGhleSBhcmVcbiAqIGVudGlyZWx5IGhpZ2hlciB0aGFuIHRoZSBQbGF0Zm9ybSlcbiAqXG4gKiBDb250cmFyeSB0byByZWd1bGFyIFNvbGlkcywgUGxhdGZvcm1zIGFyZSBhbGxvd2VkIHRvIG92ZXJsYXAgd2l0aCBBY3RvcnMuXG4gKi9cbmNsYXNzIFBsYXRmb3JtIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgMCwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCA8PSB0aGlzLnkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0ICsgZHkgPiB0aGlzLnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwcmluZ3MgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCB0aHJvdyBBY3RvcnMgdXAgb24gY29udGFjdFxuICovXG5jbGFzcyBTcHJpbmcgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy50aWxlRGF0YS5zaGlmdFkgPSAtVSAvIDI7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnNwcmluZ1NvdW5kKTtcbiAgICAgICAgcGxheWVyLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9CT1VOQ0UpO1xuICAgICAgICBwbGF5ZXIuc3BlZWRYID0gMDtcbiAgICAgICAgcGxheWVyLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgIHBsYXllci5yZXN0b3JlRGFzaCgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIERhc2hEaWFtb25kcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHJlc3RvcmUgdGhlIGRhc2ggY291bnRlciBvZiB0aGUgUGxheWVycyB3aG8gdG91Y2ggdGhlbVxuICovXG5jbGFzcyBEYXNoRGlhbW9uZCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoMjEpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRhc2hEaWFtb25kU291bmQpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFN0cmF3YmVycmllcyBhcmUgY29sbGVjdGlibGVzIHRoYXQgUGxheWVyIHRha2Ugb24gY29udGFjdC5cbiAqIElmIGEgUGxheWVyIGRpZXMgYWZ0ZXIgY29sbGVjdGluZyBhIFN0cmF3YmVycnkgYmVmb3JlIGNoYW5naW5nIFNjZW5lLCB0aGUgU3RyYXdiZXJyeSBpcyByZXN0b3JlZCBpbiB0aGUgU2NlbmVcbiAqIChhbmQgcmVtb3ZlZCBmcm9tIHRoZSBQbGF5ZXIncyBsaXN0IG9mIGNvbGxlY3RlZCBTdHJhd2JlcnJpZXMpXG4gKi9cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDEzKSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnN0cmF3YmVycnlTb3VuZCk7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmFuc2l0aW9ucyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRyYW5zZmVyIGEgUGxheWVyIGZyb20gb25lIFNjZW5lIHRvIGFub3RoZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZSB0byB3aGljaCB0aGUgUGxheWVyIGlzIHRha2VuIHdoZW4gdG91Y2hpbmcgdGhlIFRyYW5zaXRpb25cbiAgICAgICAgICogQHR5cGUge1NjZW5lfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIGluIHRoZSB0YXJnZXQgU2NlbmUgY29ycmVzcG9uZGluZyB0byB0aGlzLnggKHdoZW4gdGhlIFBsYXllciB0cmFuc2l0aW9ucyB0byB0aGUgdGFyZ2V0IFNjZW5lLFxuICAgICAgICAgKiBpdHMgcG9zaXRpb24gaXMgc2V0IHRvIGl0cyBjdXJyZW50IHgtcG9zaXRpb24gKyB0aGlzLnRhcmdldFggLSB0aGlzLnhcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueSAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeS1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WSArIHRoaXMueVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBpbmRleCBvZiB0aGUgc3Bhd24gcG9pbnQgKGluIHRoZSB0YXJnZXQgU2NlbmUncyBsaXN0IG9mIHNwYXduIHBvaW50cykgY29ycmVzcG9uZGluZyB0byB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSBzcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZS5yZXNldCgpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgcGxheWVyLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENydW1ibGluZ0Jsb2NrcyBhcmUgU29saWRzIHRoYXQgZGlzYXBwZWFyIHNob3J0bHkgYWZ0ZXIgYSBQbGF5ZXIgaGl0cyBpdCAob25seSB3aGVuIHRoZSBQbGF5ZXIgaXMgY29uc2lkZXJlZCB0byBiZVxuICogXCJjYXJyaWVkXCIgYnkgdGhlIENydW1ibGluZ0Jsb2NrKS5cbiAqIFRoZXkgcmVhcHBlYXIgYWZ0ZXIgYSBnaXZlbiB0aW1lIChpZiB0aGVyZSBhcmUgbm8gQWN0b3JzIG9uIHRoZWlyIHBvc2l0aW9uKVxuICovXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIG5ldyBncmFwaGljcy5UaWxlRGF0YSg1NykpO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgYmxvY2sgaXMgZGlzYXBwZWFyaW5nXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciBkaXNhcHBlYXJhbmNlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciByZWFwcGVhcmFuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5mYWxsIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7ICAgLy8gZHVyYXRpb24gYmVmb3JlIHJlYXBwZWFyaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNob3VsZEJlY29tZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEJlY29tZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRCZWNvbWVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmNydW1ibGluZ0Jsb2NrU291bmQpO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gLjU7ICAvLyBkdXJhdGlvbiBiZWZvcmUgZGlzYXBwZWFyaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxwaGEgPSAyICogdGhpcy50aW1lcnMuZmFsbDtcbiAgICAgICAgICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IGFscGhhO1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmlnZ2VyQmxvY2tzIGFyZSBTb2xpZHMgdGhhdCBzdGFydCBtb3Zpbmcgd2hlbiB0aGV5IGNhcnJ5IGFuIEFjdG9yXG4gKi9cbmNsYXNzIFRyaWdnZXJCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBoYXMgYmVlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3IgYnV0IGhhcyBub3QgeWV0IHN0YXJ0ZWQgZXhlY3V0aW5nIHRoZSBtb3ZlbWVudCAoZHVyaW5nXG4gICAgICAgICAqIHRyaWdnZXIgZGVsYXkpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZSBkZWxheSBiZWZvcmUgdGhlIG1vdmVtZW50IHN0YXJ0cyB3aGVuIHRoZSBibG9jayBpcyB0cmlnZ2VyZWRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsYXkgPSBkZWxheTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1vdmVtZW50IHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3JcbiAgICAgICAgICogQHR5cGUge0VmZmVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbGUgaW5kZXhlcyB0byB1c2Ugd2hlbiBkcmF3aW5nIHRoZSBUcmlnZ2VyQmxvY2sgb24gdGhlIFNjZW5lXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlcyA9IG5ldyBBcnJheSgod2lkdGggLyBVKSAqIChoZWlnaHQgLyBVKSkuZmlsbCgwKS5tYXAoXyA9PiA2NCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnNoaWZ0WCA9IDA7XG4gICAgICAgIHRoaXMuc2hpZnRZID0gMDtcbiAgICAgICAgaWYgKHRoaXMuaXNUcmlnZ2VyZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy50cmlnZ2VyIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVFZmZlY3QodGhpcy50cmlnZ2VyZWRNb3ZlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hvdWxkVHJpZ2dlciA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICBzaG91bGRUcmlnZ2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdWxkVHJpZ2dlcikge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnRyaWdnZXIgPSB0aGlzLmRlbGF5O1xuICAgICAgICAgICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGZvciAobGV0IHkgPSB0aGlzLnk7IHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDsgeSArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gdGhpcy54OyB4IDwgdGhpcy54ICsgdGhpcy53aWR0aDsgeCArPSBVKSB7XG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICAgICAgZ3JhcGhpY3Muc2hlZXRzLnRpbGVzLFxuICAgICAgICAgICAgICAgICAgICAxNiAqICh0aGlzLnNwcml0ZUluZGV4ZXNbaW5kZXhdICUgOCksIDE2ICogfn4odGhpcy5zcHJpdGVJbmRleGVzW2luZGV4XSAvIDgpLFxuICAgICAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgICAgIHggKyB0aGlzLnNoaWZ0WCwgeSArIHRoaXMuc2hpZnRZLFxuICAgICAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIEZhbGxpbmdCbG9jayBleHRlbmRzIFRyaWdnZXJCbG9jayB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgZGVsYXksIG1vdmVtZW50KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCk7XG4gICAgICAgIGNvbnN0IHcgPSB3aWR0aCAvIFU7XG4gICAgICAgIGNvbnN0IGggPSBoZWlnaHQgLyBVO1xuICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXMuZmlsbCg5KTtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzWzBdID0gMztcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgLSAxXSA9IDU7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogKGggLSAxKV0gPSAxNjtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiBoIC0gMV0gPSAxODtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCB3IC0gMTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXNbaV0gPSA0O1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiAoaCAtIDEpICsgaV0gPSAxNztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogaV0gPSA4O1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiBpICsgKHcgLSAxKV0gPSAxMDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1VwIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIGRvd253YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc1VwIGV4dGVuZHMgSGF6YXJkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgVSwgVSAvIDIsIG5ldyBncmFwaGljcy5UaWxlRGF0YSg0MCwgMCwgLVUgLyAyKSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNEb3duIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIHVwd2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNEb3duIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUgLyAyLCBuZXcgZ3JhcGhpY3MuVGlsZURhdGEoNDIpKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWSAtIHRoaXMubW92ZWRZIDwgMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzUmlnaHQgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgbGVmdHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzUmlnaHQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSAvIDIsIFUsIG5ldyBncmFwaGljcy5UaWxlRGF0YSg0MSkpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRYIC0gdGhpcy5tb3ZlZFggPCAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyByaWdodHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzTGVmdCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCArIFUgLyAyLCB5LCBVIC8gMiwgVSwgbmV3IGdyYXBoaWNzLlRpbGVEYXRhKDQzLCAtVSAvIDIsIDApKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWCAtIHRoaXMubW92ZWRYID4gMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNlZ21lbnRzT3ZlcmxhcCxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgRmFsbGluZ0Jsb2NrLFxuICAgIENydW1ibGluZ0Jsb2NrLFxuICAgIFNwaWtlc1VwLFxuICAgIFNwaWtlc0Rvd24sXG4gICAgU3Bpa2VzTGVmdCxcbiAgICBTcGlrZXNSaWdodCxcbn1cbiIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHNvdW5kID0gcmVxdWlyZSgnLi9zb3VuZCcpO1xuY29uc3QgZ3JhcGhpY3MgPSByZXF1aXJlKCcuL2dyYXBoaWNzJyk7XG5cbmNvbnN0IEFOSU1BVElPTl9TTE9XRE9XTiA9IDY7XG5jb25zdCBBTklNQVRJT05fSURMRSA9IFs0LCA0XTtcbmNvbnN0IEFOSU1BVElPTl9SVU4gPSBbMSwgNl07XG5jb25zdCBBTklNQVRJT05fSlVNUCA9IFs2LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9GQUxMID0gWzUsIDNdO1xuY29uc3QgQU5JTUFUSU9OX0RJRSA9IFswLCA4XTtcblxuXG5jbGFzcyBQbGF5ZXIgZXh0ZW5kcyBwaHlzaWNzLkFjdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcih4ID0gMCwgeSA9IDAsIHNwcml0ZVNoZWV0ID0gJ2hlcm9fYmx1ZScpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgOCwgMTQpO1xuICAgICAgICB0aGlzLnNwcml0ZVNoZWV0ID0gc3ByaXRlU2hlZXQ7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IDE7XG4gICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IDE7XG4gICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IDQ7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuXG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB+fih0aGlzLmFuaW1hdGlvbl9jb3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gNCAqIHRoaXMuc3ByaXRlX3JvdyArICh0aGlzLm5iRGFzaGVzID8gMCA6IDIpICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBncmFwaGljcy5zaGVldHNbdGhpcy5zcHJpdGVTaGVldF0sXG4gICAgICAgICAgICAxNiAqIGluZGV4LCAxNiAqIHJvdyxcbiAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgIHRoaXMueCAtIDQgKyB0aGlzLnNoaWZ0WCwgdGhpcy55IC0gMiArIHRoaXMuc2hpZnRZLFxuICAgICAgICAgICAgMTYsIDE2KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmlucHV0cy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciArPSAxO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICU9IHRoaXMubmJfc3ByaXRlcyAqIEFOSU1BVElPTl9TTE9XRE9XTjtcblxuICAgICAgICAvLyBjaGVjayBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5jbGVhcigpO1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIHN0YW5kaW5nIG9uIGEgc29saWRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc29saWQuY2FuQmVDbGltYmVkICYmIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHdhbGxzIG9uIHJpZ2h0IGFuZCBsZWZ0IGF0IGRpc3RhbmNlIDw9IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZUxlZnQgPSB0aGlzLnggLSBzb2xpZC54IC0gc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlTGVmdCAmJiBkaXN0YW5jZUxlZnQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZVJpZ2h0ID0gc29saWQueCAtIHRoaXMueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlUmlnaHQgJiYgZGlzdGFuY2VSaWdodCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICgodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgdGhpcy54ICsgdGhpcy53aWR0aCA9PT0gc29saWQueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy54ID09PSBzb2xpZC54ICsgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBwbGF5ZXIgaXMgaHVnZ2luZyBhIHdhbGxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSBjb25zdGFudHMuSlVNUF9HUkFDRV9USU1FO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IGNvbnN0YW50cy5TVEFURV9EQVNIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnVwZGF0ZUFuaW1hdGlvbigpO1xuXG4gICAgICAgIHRoaXMubW92ZVgodGhpcy5zcGVlZFggKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRYID0gMCk7XG4gICAgICAgIHRoaXMubW92ZVkodGhpcy5zcGVlZFkgKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRZID0gMCk7XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBUaGluZ3NcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5zY2VuZS50aGluZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpbmcuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyh0aGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpbmcub25Db250YWN0V2l0aCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55ID49IHRoaXMuc2NlbmUuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZHlpbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjZW5lLnNob3VsZFJlc2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmlzUHJlc3NlZChcImp1bXBcIikgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuaXNQcmVzc2VkKFwiZGFzaFwiKSAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMudGltZXJzLmRhc2hCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPD0gMCAmJlxuICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzIHx8IHRoaXMuaW5wdXRzLnlBeGlzKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhc2hTcGVlZCA9IHRoaXMuaW5wdXRzLnhBeGlzICYmIHRoaXMuaW5wdXRzLnlBeGlzID8gY29uc3RhbnRzLkRBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuREFTSF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IHRoaXMuaW5wdXRzLnhBeGlzICogTWF0aC5tYXgoTWF0aC5hYnModGhpcy5zcGVlZFgpLCBkYXNoU3BlZWQpO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gLXRoaXMuaW5wdXRzLnlBeGlzICogZGFzaFNwZWVkO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy5pc1ByZXNzZWQoXCJqdW1wXCIpICYmXG4gICAgICAgICAgICB0aGlzLmlucHV0cy50aW1lcnMuanVtcEJ1ZmZlciA+IDAgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gdGhpcy5pbnB1dHMueEF4aXMgKiBjb25zdGFudHMuSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuaXNQcmVzc2VkKFwianVtcFwiKSAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMudGltZXJzLmp1bXBCdWZmZXIgPiAwICYmXG4gICAgICAgICAgICAodGhpcy5oYXNXYWxsTGVmdCB8fCB0aGlzLmhhc1dhbGxSaWdodCkpIHtcbiAgICAgICAgICAgIC8vIHdhbGxqdW1wXG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLmhhc1dhbGxSaWdodCkgfHwgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiB0aGlzLmhhc1dhbGxMZWZ0KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaWRKdW1wKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMubW9tZW50dW1YID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiB0aGlzLm1vbWVudHVtWDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIHRoaXMubW9tZW50dW1ZO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWRKdW1wO1xuICAgIH1cblxuICAgIHVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB0aGlzLnNwcml0ZV9kaXJlY3Rpb24gPSB0aGlzLmlucHV0cy54QXhpcztcblxuICAgICAgICAvLyBob3Jpem9udGFsIG1vdmVtZW50XG4gICAgICAgIGxldCBzeCA9IE1hdGguYWJzKHRoaXMuc3BlZWRYKTsgICAgICAgIC8vIGFic29sdXRlIHZhbHVlIG9mIHRoZSBob3Jpem9udGFsIHNwZWVkIG9mIHRoZSBwbGF5ZXJcbiAgICAgICAgY29uc3QgZHggPSB0aGlzLnNwZWVkWCA+PSAwID8gMSA6IC0xOyAgICAvLyBkaXJlY3Rpb24gaW4gd2hpY2ggdGhlIHBsYXllciBpcyBtb3ZpbmdcbiAgICAgICAgY29uc3QgbXVsdCA9IHRoaXMuaXNHcm91bmRlZCA/IDEgOiBjb25zdGFudHMuQUlSX0ZBQ1RPUjtcblxuICAgICAgICAvLyBwYXNzaXZlIGRlY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA8PSAwKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzeCA+IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWF4KHN4IC0gY29uc3RhbnRzLlJVTl9ERUNFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhY3RpdmUgYWNjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzID4gMCAmJiBzeCA8IGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKSB7XG4gICAgICAgICAgICBzeCA9IE1hdGgubWluKHN4ICsgY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0LCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA8IDApIHtcbiAgICAgICAgICAgIHN4IC09IGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogc3g7XG4gICAgfVxuXG4gICAgdXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMueUF4aXMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAtY29uc3RhbnRzLkNMSU1CX1VQX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLkNMSU1CX1NMSVBfU1BFRUQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuTUFYX0ZBTExfU1BFRUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlQW5pbWF0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5zdGF0ZSA9PT0gY29uc3RhbnRzLlNUQVRFX0RFQUQpIHtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fUlVOKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzSHVnZ2luZ1dhbGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSURMRSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNwZWVkWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0pVTVApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9GQUxMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRTdGF0ZShuZXdTdGF0ZSkge1xuICAgICAgICBpZiAobmV3U3RhdGUgIT09IHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGxlYXZlIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAobmV3U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBlbnRlciBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuanVtcFNvdW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMudGltZXJzLmp1bXBCdWZmZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gY29uc3RhbnRzLlZBUl9KVU1QX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5kYXNoU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlucHV0cy50aW1lcnMuZGFzaEJ1ZmZlciA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZGllU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlVHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgICAgIC8vIHZhbGlkYXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LnNjZW5lLnJlbW92ZVRoaW5nKHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc2V0UGxheWVyKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IHRyYW5zaXRpb24uc3Bhd25Qb2ludEluZGV4O1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgZGllKCkge1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RFQUQpO1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRElFKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnNjZW5lLnNwYXduUG9pbnRzW3RoaXMuc2NlbmUuc3Bhd25Qb2ludEluZGV4XTtcbiAgICAgICAgdGhpcy54ID0gcG9pbnQueDtcbiAgICAgICAgdGhpcy55ID0gcG9pbnQueSAtIDY7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpICYmXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHNvbGlkLnggKyBzb2xpZC53aWR0aCA9PT0gdGhpcy54KSB8fFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHNldEFuaW1hdGlvbihzcHJpdGVfcm93LCBuYl9zcHJpdGVzKSB7XG4gICAgICAgIGlmIChzcHJpdGVfcm93ICE9PSB0aGlzLnNwcml0ZV9yb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IHNwcml0ZV9yb3c7XG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IGdyYXBoaWNzID0gcmVxdWlyZSgnLi9ncmFwaGljcycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZnJvbUpTT04oZGF0YSkge1xuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZShkYXRhLndpZHRoICogVSwgZGF0YS5oZWlnaHQgKiBVKTtcbiAgICAgICAgLy8gbWFrZSB3YWxsc1xuICAgICAgICBjb25zdCB3YWxscyA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAtMS41ICogVSwgZGF0YS53aWR0aCAqIFUsIDApLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKC0uNSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoKGRhdGEud2lkdGggKyAuNSkgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgZm9yIChjb25zdCB3YWxsIG9mIHdhbGxzKSB7XG4gICAgICAgICAgICB3YWxsLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgc2NlbmUuYWRkU29saWQod2FsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYWluTGF5ZXIgPSBkYXRhLmxheWVycy5maW5kKGwgPT4gbC5uYW1lID09PSAnbWFpbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1haW5MYXllci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG1haW5MYXllci5kYXRhW2ldO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IChpICUgbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IH5+KGkgLyBtYWluTGF5ZXIud2lkdGgpICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlRGF0YSA9IG5ldyBncmFwaGljcy5UaWxlRGF0YShpbmRleCAtIDEpO1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmRleCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLkRhc2hEaWFtb25kKHggKyBVIC8gMiwgeSArIFUgLyAyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLnNwYXduUG9pbnRzLnB1c2goe3g6IHgsIHk6IHl9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDM3OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ1OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ2OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuUGxhdGZvcm0oeCwgeSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQwOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzVXAoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNSaWdodCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU4OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDU5OlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDYxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCArIFUgLyAyLCB5ICsgVSAvIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDU3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuQ3J1bWJsaW5nQmxvY2soeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTA6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcHJpbmcoeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuU29saWQoeCwgeSwgVSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5lO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSdW5uaW5nKSB7XG4gICAgICAgICAgICAvLyB1cGRhdGUgYWxsIGVsZW1lbnRzXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgc29saWQuYmVmb3JlVXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpbmcuYmVmb3JlVXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgYWN0b3IuYmVmb3JlVXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICBzb2xpZC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGluZy51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBhY3Rvci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2Nyb2xsIHZpZXdcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA8IC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQgLSBjb25zdGFudHMuVklFV19IRUlHSFQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPCAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNDAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcmVzZXQgc2NlbmUgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAodGhpcy5zaG91bGRSZXNldCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3SFVEKGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmYWFcIjtcbiAgICAgICAgY3R4LmZpbGxSZWN0KDEsIDEsIDQyLCAxMCk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiMwMDAwMDBcIjtcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9IFwicmlnaHRcIjtcbiAgICAgICAgY3R4LmZvbnQgPSAnbm9ybWFsIDZweCBnYW1lYm95JztcbiAgICAgICAgY3R4LmZpbGxUZXh0KGAke3RoaXMucGxheWVyLnN0cmF3YmVycmllcy5zaXplICsgdGhpcy5wbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLnNpemV9LzIwYCwgNDAsIDgpO1xuICAgICAgICBjdHguZHJhd0ltYWdlKGdyYXBoaWNzLnNoZWV0cy50aWxlcywgODAsIDE2LCAxNiwgMTYsIDIsIDIsIDgsIDgpO1xuICAgIH1cblxuICAgIHNldFBsYXllcihwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUFjdG9yKHRoaXMucGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEFjdG9yKHBsYXllcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgfVxuXG4gICAgYWRkQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuYWRkKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmRlbGV0ZShhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5yZW1vdmUoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5hZGQodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlVGhpbmcodGhpbmcpIHtcbiAgICAgICAgdGhpcy50aGluZ3MuZGVsZXRlKHRoaW5nKTtcbiAgICAgICAgdGhpbmcuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIiwiY29uc3QganVtcFNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9qdW1wLm9nZycpO1xuY29uc3QgZGFzaFNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9kYXNoX3BpbmtfbGVmdC5vZ2cnKTtcbmNvbnN0IGRpZVNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9jaGFyX21hZF9kZWF0aC5vZ2cnKTtcbmNvbnN0IGNydW1ibGluZ0Jsb2NrU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX2ZhbGxibG9ja19zaGFrZS5vZ2cnKTtcbmNvbnN0IHN0cmF3YmVycnlTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fc3RyYXdiZXJyeV9yZWRfZ2V0XzF1cC5vZ2cnKTtcbmNvbnN0IGRhc2hEaWFtb25kU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2dhbWVfZ2VuX2RpYW1vbmRfdG91Y2hfMDEub2dnJyk7XG5jb25zdCBzcHJpbmdTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fc3ByaW5nLm9nZycpO1xubGV0IHNvdW5kT24gPSB0cnVlO1xuXG5cbmZ1bmN0aW9uIHRvZ2dsZVNvdW5kKCkge1xuICAgIHNvdW5kT24gPSAhc291bmRPbjtcbiAgICByZXR1cm4gc291bmRPbjtcbn1cblxuXG5mdW5jdGlvbiBwbGF5U291bmQoc291bmQpIHtcbiAgICBpZiAoc291bmRPbikge1xuICAgICAgICBzb3VuZC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIHNvdW5kLnBsYXkoKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGxheVNvdW5kLFxuICAgIHRvZ2dsZVNvdW5kLFxuICAgIGp1bXBTb3VuZCxcbiAgICBkYXNoU291bmQsXG4gICAgZGllU291bmQsXG4gICAgY3J1bWJsaW5nQmxvY2tTb3VuZCxcbiAgICBzdHJhd2JlcnJ5U291bmQsXG4gICAgZGFzaERpYW1vbmRTb3VuZCxcbiAgICBzcHJpbmdTb3VuZCxcbn0iXX0=
