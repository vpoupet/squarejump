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

const contextLayer = {};
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
    contextLayer.scene.translate(scrollX - x, scrollY - y);
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

            currentScene.update(deltaTime);
            // Transition from one room to another
            if (currentScene.transition) {
                const prevScene = currentScene;
                currentScene = currentScene.transition.targetScene;
                prevScene.transition = undefined;
            }
            setScroll(currentScene.scrollX, currentScene.scrollY);

            let context;
            // clear and redraw on scene canvas
            context = contextLayer.scene;
            context.save();
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            context.restore();
            currentScene.draw(context);

            context = contextLayer.hud;
            context.clearRect(0, 0, context.canvas.width / SCALING, context.canvas.height / SCALING);
            currentScene.drawHUD(context);

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
    document.getElementById("sound-button").addEventListener('click', toggleSound);

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;

    for (const canvas of screen.getElementsByTagName("canvas")) {
        const context = canvas.getContext('2d');
        contextLayer[canvas.id] = context;
        canvas.width = SCALING * constants.VIEW_WIDTH;
        canvas.height = SCALING * constants.VIEW_HEIGHT;
        context.scale(SCALING, SCALING);
        context.imageSmoothingEnabled = false;
    }

    // load all scenes and start game
    player.loadAllSprites.then(() => {
        maps.loadScenes.then(() => {
            // load starting scene
            currentScene = maps.scenes.CELESTE_01;
            currentScene.spawnPointIndex = 1;
            currentScene.setPlayer(new player.Player());
            currentScene.reset();
            start();
        })
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


function makeTriggerBlock(x1, y1, x2, y2, width, height, delay, dur1, pause, dur2) {
    return new physics.TriggerBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, dur1),
        new effect.Effect(pause),
        new effect.LinearMovement(x2 * U, y2 * U, x1 * U, y1 * U, dur2),
    ]));
}

function makeFallingBlock(x1, y1, x2, y2, width, height, delay, dur) {
    return new physics.FallingBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, dur),
        new effect.Effect(1, -1),
    ]));
}


const loadScenes = new Promise(resolve => {
    const nbScenes = 26;
    const scenePromises = [];
    const sceneNames = [];
    for (let i = 1; i <= nbScenes; i++) {
        const num = i < 10 ? '0' + i : '' + i;
        scenePromises.push(fetch(`tilemaps/celeste${num}.json`).then(response => response.json()));
        sceneNames.push(`CELESTE_${num}`);
    }

    Promise.all(scenePromises).then(responses => {
        for (let i = 0; i < nbScenes; i++) {
            scenes[sceneNames[i]] = scene.Scene.fromJSON(responses[i]);
        }

        // CELESTE_04
        scenes.CELESTE_04.addSolid(makeTriggerBlock(14, 10, 23, 9, 3, 2, .75, .5, 1, 1.5));

        // CELESTE_06
        scenes.CELESTE_06.addSolid(makeTriggerBlock(13, 33, 13, 23, 4, 2, .75, .45, 1, 1.5));

        // CELESTE_08
        scenes.CELESTE_08.addSolid(makeTriggerBlock(14, 16, 21, 12, 2, 3, .75, .5, 1, 2));

        // CELESTE_14
        scenes.CELESTE_14.addSolid(makeTriggerBlock(11, 29, 19, 29, 4, 2, .25, .35, 1, 1.5));
        scenes.CELESTE_14.addSolid(makeTriggerBlock(26, 28, 26, 22, 5, 2, .25, .35, 1, 1.5));

        // CELESTE_15
        {
            const triggerBlock = makeTriggerBlock(24, 6, 24, 17, 2, 6, .25, .35, 1, 1.5);
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U, new physics.TileData(40));
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U, new physics.TileData(40));
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addThing(spikes1);
            scenes.CELESTE_15.addThing(spikes2);

            scenes.CELESTE_15.addSolid(makeTriggerBlock(15, 20, 9, 20, 2, 4, .25, .35, 1, 1.5));
        }

        // CELESTE_19
        scenes.CELESTE_19.addSolid(makeTriggerBlock(20, 15, 20, 7, 2, 4, .25, .35, 1, 1.5));
        scenes.CELESTE_19.addSolid(makeFallingBlock(28, 9, 28, 35, 3, 2, .25, 1));

        // CELESTE_21
        {
            const triggerBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75, .5);
            const spikes1 = new physics.SpikesUp(14 * U, 6 * U, new physics.TileData(40));
            const spikes2 = new physics.SpikesUp(15 * U, 6 * U, new physics.TileData(40));
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_21.addSolid(triggerBlock);
            scenes.CELESTE_21.addThing(spikes1);
            scenes.CELESTE_21.addThing(spikes2);
        }

        // CELESTE_22
        {
            scenes.CELESTE_22.addSolid(makeTriggerBlock(33, 15, 33, 9, 3, 3, .25, .25, .75, 1.5));

            const triggerBlock = makeTriggerBlock(25, 6, 13, 6, 2, 3, .25, .5, 1, 1.5);
            const spikes1 = new physics.SpikesUp(25 * U, 5 * U, new physics.TileData(40));
            const spikes2 = new physics.SpikesUp(26 * U, 5 * U, new physics.TileData(40));
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_22.addSolid(triggerBlock);
            scenes.CELESTE_22.addThing(spikes1);
            scenes.CELESTE_22.addThing(spikes2);

        }

        // CELESTE_23
        scenes.CELESTE_23.addSolid(makeTriggerBlock(22, 18, 22, 9, 2, 2, .25, .5, 1, 1.5));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(29, 19, 29, 10, 2, 2, .25, .5, 1, 1.5));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(36, 17, 36, 8, 2, 2, .25, .5, 1, 1.5));

        // CELESTE_24
        scenes.CELESTE_24.addSolid(makeTriggerBlock(17, 18, 17, 12, 4, 2, .25, .35, 1, 1.5));
        scenes.CELESTE_24.addSolid(makeTriggerBlock(28, 19, 28, 12, 6, 2, .25, .4, 1, 1.5));

        // CELESTE_25
        {
            const fallingBlock1 = makeFallingBlock(19, 16, 19, 25, 4, 3, .25, .5);
            const spikes1 = [
                new physics.SpikesRight(23 * U, 17 * U, new physics.TileData(41)),
                new physics.SpikesRight(23 * U, 18 * U, new physics.TileData(41)),
                new physics.SpikesDown(19 * U, 19 * U, new physics.TileData(42)),
                new physics.SpikesDown(20 * U, 19 * U, new physics.TileData(42)),
                new physics.SpikesDown(21 * U, 19 * U, new physics.TileData(42)),
                new physics.SpikesDown(22 * U, 19 * U, new physics.TileData(42)),
            ];
            for (const spike of spikes1) {
                fallingBlock1.attach(spike);
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock1);

            const fallingBlock2 = makeFallingBlock(23, 6, 23, 25, 2, 4, .25, 1);
            const spikes2 = [
                new physics.SpikesLeft(22 * U, 7 * U, new physics.TileData(43)),
                new physics.SpikesLeft(22 * U, 8 * U, new physics.TileData(43)),
            ];
            for (const spike of spikes2) {
                fallingBlock2.attach(spike);
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock2);
        }

        // CELESTE_26
        {
            const triggerBlock = makeTriggerBlock(9, 9, 26, 9, 3, 5, .25, .5, 1, 1.5);
            const spikes = [
                new physics.SpikesUp(9 * U, 8 * U, new physics.TileData(40)),
                new physics.SpikesUp(10 * U, 8 * U, new physics.TileData(40)),
                new physics.SpikesUp(11 * U, 8 * U, new physics.TileData(40)),
            ]
            for (const spike of spikes) {
                triggerBlock.attach(spike);
                scenes.CELESTE_26.addThing(spike);
            }
            scenes.CELESTE_26.addSolid(triggerBlock);
        }

        // Transitions
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
        makeTransitionRight(scenes.CELESTE_14, 1, 1, scenes.CELESTE_17, 10, 2, 9);
        makeTransitionRight(scenes.CELESTE_18, 17, 0, scenes.CELESTE_17, 2, 0, 3);
        makeTransitionUp(scenes.CELESTE_18, 19, 0, scenes.CELESTE_19, 13, 1, 4);
        makeTransitionRight(scenes.CELESTE_19, 2, 0, scenes.CELESTE_20, 2, 0, 2);
        makeTransitionRight(scenes.CELESTE_20, 12, 1, scenes.CELESTE_21, 8, 2, 3);
        makeTransitionUp(scenes.CELESTE_21, 26, 1, scenes.CELESTE_22, 26, 0, 1);
        makeTransitionUp(scenes.CELESTE_23, 7, 0, scenes.CELESTE_21, 27, 3, 7);
        makeTransitionRight(scenes.CELESTE_21, 2, 0, scenes.CELESTE_24, 8, 1, 4);
        makeTransitionUp(scenes.CELESTE_17, 33, 1, scenes.CELESTE_25, 7, 0, 3);
        makeTransitionUp(scenes.CELESTE_25, 22, 0, scenes.CELESTE_21, 2, 2, 3);
        makeTransitionUp(scenes.CELESTE_24, 32, 0, scenes.CELESTE_26, 4, 1, 4);

        // LOUIS_06
        // scenes.LOUIS_06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.LOUIS_08, U, 13 * U, 0));
        // scenes.LOUIS_08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.LOUIS_06, 10 * U, 15 * U, 1));

        // makeTransitionUp(scenes.LOUIS_01, 35, 0, scenes.LOUIS_02, 4, 1, 3);
        // makeTransitionUp(scenes.LOUIS_03, 3, 0, scenes.LOUIS_02, 13, 0, 3);
        // makeTransitionUp(scenes.LOUIS_03, 30, 1, scenes.LOUIS_02, 23, 2, 3);
        // makeTransitionUp(scenes.LOUIS_04, 4, 0, scenes.LOUIS_02, 35, 3, 3);
        // makeTransitionUp(scenes.LOUIS_05, 33, 0, scenes.LOUIS_06, 1, 1, 5);
        // makeTransitionRight(scenes.LOUIS_06, 8, 0, scenes.LOUIS_07, 8, 1, 6);

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
                tileset,
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
                    tileset,
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
    tileset,
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
    FallingBlock,
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

    drawHUD(ctx) {
        ctx.fillStyle = "#ffffffaa";
        ctx.fillRect(1, 1, 42, 10);
        ctx.fillStyle = "#000000";
        ctx.textAlign = "right";
        ctx.font = 'normal 6px gameboy';
        ctx.fillText(`${this.player.strawberries.size + this.player.temporaryStrawberries.size}/15`, 40, 8);
        ctx.drawImage(physics.tileset, 80, 16, 16, 16, 2, 2, 8, 8);
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwicGh5c2ljcy5qcyIsInBsYXllci5qcyIsInNjZW5lLmpzIiwic291bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBGcm9tIENlbGVzdGUgc291cmNlIGNvZGVcbmNvbnN0IE1BWF9SVU5fU1BFRUQgPSA5MDtcbmNvbnN0IFJVTl9BQ0NFTEVSQVRJT04gPSAxMDAwO1xuY29uc3QgUlVOX0RFQ0VMRVJBVElPTiA9IDQwMDtcbmNvbnN0IEFJUl9GQUNUT1IgPSAuNjU7XG5jb25zdCBKVU1QX1NQRUVEID0gMTA1O1xuY29uc3QgSlVNUF9IT1JJWk9OVEFMX0JPT1NUID0gNDA7XG5jb25zdCBNQVhfRkFMTF9TUEVFRCA9IDE2MDtcbmNvbnN0IEdSQVZJVFkgPSA5MDA7XG5jb25zdCBKVU1QX0dSQUNFX1RJTUUgPSAuMTtcbmNvbnN0IFZBUl9KVU1QX1RJTUUgPSAuMjtcbmNvbnN0IENMSU1CX1VQX1NQRUVEID0gNDU7XG5jb25zdCBDTElNQl9TTElQX1NQRUVEID0gMzA7XG5jb25zdCBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UgPSAzO1xuY29uc3QgV0FMTF9KVU1QX0hTUEVFRCA9IE1BWF9SVU5fU1BFRUQgKyBKVU1QX0hPUklaT05UQUxfQk9PU1Q7XG5jb25zdCBEQVNIX1NQRUVEID0gMjQwO1xuY29uc3QgRU5EX0RBU0hfU1BFRUQgPSAxNjA7XG5jb25zdCBFTkRfREFTSF9VUF9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX1RJTUUgPSAuMTU7XG5jb25zdCBEQVNIX0NPT0xET1dOID0gLjI7XG5cbi8vIE90aGVyIGNvbnN0YW50c1xuY29uc3QgTU9NRU5UVU1fU1RPUkVfVElNRSA9IC4xO1xuY29uc3QgTU9NRU5UVU1fRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9GUkVFWkVfVElNRSA9IC4wNTtcbmNvbnN0IEJPVU5DRV9USU1FID0gLjI7XG5jb25zdCBCT1VOQ0VfU1BFRUQgPSAxOTA7XG5jb25zdCBEWUlOR19USU1FID0gLjg7XG5jb25zdCBTVEFURV9OT1JNQUwgPSAwO1xuY29uc3QgU1RBVEVfSlVNUCA9IDE7XG5jb25zdCBTVEFURV9EQVNIID0gMjtcbmNvbnN0IFNUQVRFX0RFQUQgPSAzO1xuY29uc3QgU1RBVEVfQk9VTkNFID0gNDtcblxuY29uc3QgR1JJRF9TSVpFID0gODtcbmNvbnN0IFZJRVdfV0lEVEggPSAzMjA7XG5jb25zdCBWSUVXX0hFSUdIVCA9IDE4MDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTUFYX1JVTl9TUEVFRCxcbiAgICBSVU5fQUNDRUxFUkFUSU9OLFxuICAgIFJVTl9ERUNFTEVSQVRJT04sXG4gICAgQUlSX0ZBQ1RPUixcbiAgICBKVU1QX1NQRUVELFxuICAgIEpVTVBfSE9SSVpPTlRBTF9CT09TVCxcbiAgICBNQVhfRkFMTF9TUEVFRCxcbiAgICBHUkFWSVRZLFxuICAgIEpVTVBfR1JBQ0VfVElNRSxcbiAgICBWQVJfSlVNUF9USU1FLFxuICAgIENMSU1CX1VQX1NQRUVELFxuICAgIENMSU1CX1NMSVBfU1BFRUQsXG4gICAgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFLFxuICAgIFdBTExfSlVNUF9IU1BFRUQsXG4gICAgREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9VUF9GQUNUT1IsXG4gICAgREFTSF9USU1FLFxuICAgIERBU0hfQ09PTERPV04sXG4gICAgTU9NRU5UVU1fU1RPUkVfVElNRSxcbiAgICBNT01FTlRVTV9GQUNUT1IsXG4gICAgREFTSF9GUkVFWkVfVElNRSxcbiAgICBCT1VOQ0VfVElNRSxcbiAgICBCT1VOQ0VfU1BFRUQsXG4gICAgRFlJTkdfVElNRSxcbiAgICBTVEFURV9OT1JNQUwsXG4gICAgU1RBVEVfSlVNUCxcbiAgICBTVEFURV9EQVNILFxuICAgIFNUQVRFX0RFQUQsXG4gICAgU1RBVEVfQk9VTkNFLFxuICAgIEdSSURfU0laRSxcbiAgICBWSUVXX1dJRFRILFxuICAgIFZJRVdfSEVJR0hULFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbmNsYXNzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHRoaXMudGltZXIgKz0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAmJiB0aGlzLnJlbWFpbmluZ0NvdW50ICYmIHRoaXMudGltZXIgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1haW5pbmdDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgfVxufVxuXG5cbmNsYXNzIEVmZmVjdFNlcXVlbmNlIGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihlZmZlY3RzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMuZWZmZWN0cyA9IGVmZmVjdHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS50aW1lciAtIHRoaXMuZWZmZWN0c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMuZWZmZWN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICB0aGlzLm15ID0gKHkyIC0geTEpIC8gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy50aW1lciAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0TW9tZW50dW0odGhpcy5teCwgdGhpcy5teSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngyLCB0aGlzLnkyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTaW5lTW92ZW1lbnQgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8ocmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLCByYXRpbyAqIHRoaXMueTEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueTIpO1xuICAgICAgICAgICAgY29uc3QgZHJhdGlvID0gTWF0aC5QSSAqIE1hdGguc2luKGFuZ2xlKSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCBteCA9IGRyYXRpbyAqICh0aGlzLngyIC0gdGhpcy54MSk7XG4gICAgICAgICAgICBjb25zdCBteSA9IGRyYXRpbyAqICh0aGlzLnkyIC0gdGhpcy55MSk7XG4gICAgICAgICAgICBlbGVtZW50LnNldE1vbWVudHVtKG14LCBteSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFZmZlY3QsXG4gICAgRWZmZWN0U2VxdWVuY2UsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXNzZWRCdXR0b25zID0gbmV3IFNldCgpO1xubGV0IGdhbWVwYWRQcmVzc2VkQnV0dG9ucyA9IFtdO1xuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmdhbWVwYWRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZG1hcCA9IHtcbiAgICAgICAgICAgIGp1bXA6IDAsXG4gICAgICAgICAgICBkYXNoOiAxLFxuICAgICAgICAgICAgdXA6IDEyLFxuICAgICAgICAgICAgZG93bjogMTMsXG4gICAgICAgICAgICBsZWZ0OiAxNCxcbiAgICAgICAgICAgIHJpZ2h0OiAxNSxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtleW1hcCA9IHtcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHVwOiAnQXJyb3dVcCcsXG4gICAgICAgICAgICBkb3duOiAnQXJyb3dEb3duJyxcbiAgICAgICAgICAgIGp1bXA6ICdnJyxcbiAgICAgICAgICAgIGRhc2g6ICdmJyxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpbWVycyA9IHtcbiAgICAgICAgICAgIGp1bXBCdWZmZXI6IDAsXG4gICAgICAgICAgICBkYXNoQnVmZmVyOiAwLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHVwZGF0ZUdhbWVwYWQoKSB7XG4gICAgICAgIHByZXNzZWRCdXR0b25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVwYWQuYnV0dG9uczsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tqXS5wcmVzc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXNzZWRCdXR0b25zLmFkZChqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIC8vIHRoaXMudXBkYXRlR2FtZXBhZCgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5sZWZ0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5sZWZ0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdIDwgLS4yKSkge1xuICAgICAgICAgICAgdGhpcy54QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAucmlnaHQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLnJpZ2h0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdID4gLjIpKXtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYXhlc1sxXSA8IC0uMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmF4ZXNbMV0gPiAuMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmV2SnVtcCA9IHRoaXMuanVtcEhlbGQ7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuanVtcCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuanVtcF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkp1bXAgJiYgdGhpcy5qdW1wSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgJj0gdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA+IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2RGFzaCA9IHRoaXMuZGFzaEhlbGQ7XG4gICAgICAgIHRoaXMuZGFzaEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuZGFzaCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuZGFzaF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkRhc2ggJiYgdGhpcy5kYXNoSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA+IDApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgZ2FtZXBhZFByZXNzZWRCdXR0b25zLFxuICAgIHByZXNzZWRLZXlzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcblxuY29uc3QgU0NBTElORyA9IDM7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5jb25zdCBjb250ZXh0TGF5ZXIgPSB7fTtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5sZXQgc2Nyb2xsWCA9IDA7XG5sZXQgc2Nyb2xsWSA9IDA7XG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHRMYXllci5zY2VuZS50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpc1J1bm5pbmcgPSB0cnVlO1xuICAgIHVwZGF0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaXNSdW5uaW5nID0gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGlzUnVubmluZykge1xuICAgICAgICBzbG93ZG93bkNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHNsb3dkb3duQ291bnRlciA+PSBTTE9XRE9XTl9GQUNUT1IpIHtcbiAgICAgICAgICAgIHNsb3dkb3duQ291bnRlciAtPSBTTE9XRE9XTl9GQUNUT1I7XG4gICAgICAgICAgICBmcmFtZUNvdW50ZXIgKz0gMTtcblxuICAgICAgICAgICAgaWYgKHRpbWVOb3cgLSBmcmFtZVJhdGVTdGFydFRpbWUgPj0gMTAwMCAqIGZyYW1lUmF0ZVJlZnJlc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgIGZyYW1lUmF0ZVN0YXJ0VGltZSA9IHRpbWVOb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSBGSVhFRF9ERUxUQV9USU1FID9cbiAgICAgICAgICAgICAgICAxIC8gRlJBTUVfUkFURSA6XG4gICAgICAgICAgICAgICAgTWF0aC5taW4oKHRpbWVOb3cgLSBsYXN0VXBkYXRlKSAvICgxMDAwICogU0xPV0RPV05fRkFDVE9SKSwgLjA1KTtcblxuICAgICAgICAgICAgY3VycmVudFNjZW5lLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuXG4gICAgICAgICAgICBsZXQgY29udGV4dDtcbiAgICAgICAgICAgIC8vIGNsZWFyIGFuZCByZWRyYXcgb24gc2NlbmUgY2FudmFzXG4gICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dExheWVyLnNjZW5lO1xuICAgICAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBjb250ZXh0LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcbiAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnRleHQuY2FudmFzLndpZHRoLCBjb250ZXh0LmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuZHJhdyhjb250ZXh0KTtcblxuICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRMYXllci5odWQ7XG4gICAgICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjb250ZXh0LmNhbnZhcy53aWR0aCAvIFNDQUxJTkcsIGNvbnRleHQuY2FudmFzLmhlaWdodCAvIFNDQUxJTkcpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXdIVUQoY29udGV4dCk7XG5cbiAgICAgICAgICAgIGxhc3RVcGRhdGUgPSB0aW1lTm93O1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuICAgIH1cbn1cblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBrZXlib2FyZCBldmVudHNcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZSA9PiB7XG4gICAgICAgIGlucHV0cy5wcmVzc2VkS2V5cy5hZGQoZS5rZXkpO1xuICAgICAgICBzd2l0Y2ggKGUua2V5KSB7XG4gICAgICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgICAgICAgICBpZiAoU0xPV0RPV05fRkFDVE9SID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHNsb3dkb3duKDgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNsb3dkb3duKDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZSA9PiB7XG4gICAgICAgIGlucHV0cy5wcmVzc2VkS2V5cy5kZWxldGUoZS5rZXkpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic291bmQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlU291bmQpO1xuXG4gICAgLy8gcHJlcGFyZSBjYW52YXMgYW5kIGNvbnRleHRcbiAgICBjb25zdCBzY3JlZW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1zY3JlZW4nKTtcbiAgICBzY3JlZW4uc3R5bGUud2lkdGggPSBgJHtjb25zdGFudHMuVklFV19XSURUSCAqIFNDQUxJTkd9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBTQ0FMSU5HfXB4YDtcblxuICAgIGZvciAoY29uc3QgY2FudmFzIG9mIHNjcmVlbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhbnZhc1wiKSkge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHRMYXllcltjYW52YXMuaWRdID0gY29udGV4dDtcbiAgICAgICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICAgICAgY29udGV4dC5zY2FsZShTQ0FMSU5HLCBTQ0FMSU5HKTtcbiAgICAgICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBsb2FkIGFsbCBzY2VuZXMgYW5kIHN0YXJ0IGdhbWVcbiAgICBwbGF5ZXIubG9hZEFsbFNwcml0ZXMudGhlbigoKSA9PiB7XG4gICAgICAgIG1hcHMubG9hZFNjZW5lcy50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8vIGxvYWQgc3RhcnRpbmcgc2NlbmVcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZSA9IG1hcHMuc2NlbmVzLkNFTEVTVEVfMDE7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gMTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoKSk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUucmVzZXQoKTtcbiAgICAgICAgICAgIHN0YXJ0KCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59O1xuXG5cbmZ1bmN0aW9uIHRvZ2dsZVNvdW5kKCkge1xuICAgIGlmIChzb3VuZC50b2dnbGVTb3VuZCgpKSB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic291bmQtYnV0dG9uXCIpLmlubmVyVGV4dCA9IFwiU291bmQgT25cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNvdW5kLWJ1dHRvblwiKS5pbm5lclRleHQgPSBcIlNvdW5kIE9mZlwiO1xuICAgIH1cbn1cblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jb25zdCBzY2VuZXMgPSB7fTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIGluZGV4MSwgc2NlbmUyLCB4MiwgaW5kZXgyLCB3aWR0aCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oeDIgKiBVLCBzY2VuZTIuaGVpZ2h0LCB3aWR0aCAqIFUsIDAsIHNjZW5lMSwgeDEgKiBVLCAyICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHkxLCBpbmRleDEsIHNjZW5lMiwgeTIsIGluZGV4MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oc2NlbmUxLndpZHRoLCB5MSAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMiwgVSwgeTIgKiBVLCBpbmRleDIpKTtcbiAgICBzY2VuZTIuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlVHJpZ2dlckJsb2NrKHgxLCB5MSwgeDIsIHkyLCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgZHVyMSwgcGF1c2UsIGR1cjIpIHtcbiAgICByZXR1cm4gbmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKHgxICogVSwgeTEgKiBVLCB3aWR0aCAqIFUsIGhlaWdodCAqIFUsIGRlbGF5LCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCh4MSAqIFUsIHkxICogVSwgeDIgKiBVLCB5MiAqIFUsIGR1cjEpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdChwYXVzZSksXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDIgKiBVLCB5MiAqIFUsIHgxICogVSwgeTEgKiBVLCBkdXIyKSxcbiAgICBdKSk7XG59XG5cbmZ1bmN0aW9uIG1ha2VGYWxsaW5nQmxvY2soeDEsIHkxLCB4MiwgeTIsIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBkdXIpIHtcbiAgICByZXR1cm4gbmV3IHBoeXNpY3MuRmFsbGluZ0Jsb2NrKHgxICogVSwgeTEgKiBVLCB3aWR0aCAqIFUsIGhlaWdodCAqIFUsIGRlbGF5LCBuZXcgZWZmZWN0LkVmZmVjdFNlcXVlbmNlKFtcbiAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCh4MSAqIFUsIHkxICogVSwgeDIgKiBVLCB5MiAqIFUsIGR1ciksXG4gICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEsIC0xKSxcbiAgICBdKSk7XG59XG5cblxuY29uc3QgbG9hZFNjZW5lcyA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIGNvbnN0IG5iU2NlbmVzID0gMjY7XG4gICAgY29uc3Qgc2NlbmVQcm9taXNlcyA9IFtdO1xuICAgIGNvbnN0IHNjZW5lTmFtZXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBuYlNjZW5lczsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG51bSA9IGkgPCAxMCA/ICcwJyArIGkgOiAnJyArIGk7XG4gICAgICAgIHNjZW5lUHJvbWlzZXMucHVzaChmZXRjaChgdGlsZW1hcHMvY2VsZXN0ZSR7bnVtfS5qc29uYCkudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpKTtcbiAgICAgICAgc2NlbmVOYW1lcy5wdXNoKGBDRUxFU1RFXyR7bnVtfWApO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKHNjZW5lUHJvbWlzZXMpLnRoZW4ocmVzcG9uc2VzID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYlNjZW5lczsgaSsrKSB7XG4gICAgICAgICAgICBzY2VuZXNbc2NlbmVOYW1lc1tpXV0gPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihyZXNwb25zZXNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8wNFxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNC5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE0LCAxMCwgMjMsIDksIDMsIDIsIC43NSwgLjUsIDEsIDEuNSkpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMDZcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDYuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxMywgMzMsIDEzLCAyMywgNCwgMiwgLjc1LCAuNDUsIDEsIDEuNSkpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMDhcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMDguYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNCwgMTYsIDIxLCAxMiwgMiwgMywgLjc1LCAuNSwgMSwgMikpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMTRcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxMSwgMjksIDE5LCAyOSwgNCwgMiwgLjI1LCAuMzUsIDEsIDEuNSkpO1xuICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNC5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDI2LCAyOCwgMjYsIDIyLCA1LCAyLCAuMjUsIC4zNSwgMSwgMS41KSk7XG5cbiAgICAgICAgLy8gQ0VMRVNURV8xNVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDI0LCA2LCAyNCwgMTcsIDIsIDYsIC4yNSwgLjM1LCAxLCAxLjUpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI0ICogVSwgNSAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMjUgKiBVLCA1ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDApKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuXG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRUaGluZyhzcGlrZXMyKTtcblxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNSwgMjAsIDksIDIwLCAyLCA0LCAuMjUsIC4zNSwgMSwgMS41KSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDRUxFU1RFXzE5XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzE5LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjAsIDE1LCAyMCwgNywgMiwgNCwgLjI1LCAuMzUsIDEsIDEuNSkpO1xuICAgICAgICBzY2VuZXMuQ0VMRVNURV8xOS5hZGRTb2xpZChtYWtlRmFsbGluZ0Jsb2NrKDI4LCA5LCAyOCwgMzUsIDMsIDIsIC4yNSwgMSkpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMjFcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZUZhbGxpbmdCbG9jaygxNCwgNywgMTQsIDE1LCAyLCA3LCAuNzUsIC41KTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxNCAqIFUsIDYgKiBVLCBuZXcgcGh5c2ljcy5UaWxlRGF0YSg0MCkpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDE1ICogVSwgNiAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIxLmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMS5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIxLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8yMlxuICAgICAgICB7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMi5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDMzLCAxNSwgMzMsIDksIDMsIDMsIC4yNSwgLjI1LCAuNzUsIDEuNSkpO1xuXG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDI1LCA2LCAxMywgNiwgMiwgMywgLjI1LCAuNSwgMSwgMS41KTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDUgKiBVLCBuZXcgcGh5c2ljcy5UaWxlRGF0YSg0MCkpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI2ICogVSwgNSAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIyLmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMi5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIyLmFkZFRoaW5nKHNwaWtlczIpO1xuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDRUxFU1RFXzIzXG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzIzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjIsIDE4LCAyMiwgOSwgMiwgMiwgLjI1LCAuNSwgMSwgMS41KSk7XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzIzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjksIDE5LCAyOSwgMTAsIDIsIDIsIC4yNSwgLjUsIDEsIDEuNSkpO1xuICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMy5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDM2LCAxNywgMzYsIDgsIDIsIDIsIC4yNSwgLjUsIDEsIDEuNSkpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMjRcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjQuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNywgMTgsIDE3LCAxMiwgNCwgMiwgLjI1LCAuMzUsIDEsIDEuNSkpO1xuICAgICAgICBzY2VuZXMuQ0VMRVNURV8yNC5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDI4LCAxOSwgMjgsIDEyLCA2LCAyLCAuMjUsIC40LCAxLCAxLjUpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzI1XG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IGZhbGxpbmdCbG9jazEgPSBtYWtlRmFsbGluZ0Jsb2NrKDE5LCAxNiwgMTksIDI1LCA0LCAzLCAuMjUsIC41KTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoMjMgKiBVLCAxNyAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQxKSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoMjMgKiBVLCAxOCAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQxKSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigxOSAqIFUsIDE5ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDIpKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIwICogVSwgMTkgKiBVLCBuZXcgcGh5c2ljcy5UaWxlRGF0YSg0MikpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oMjEgKiBVLCAxOSAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQyKSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzRG93bigyMiAqIFUsIDE5ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDIpKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgICAgICAgICBmYWxsaW5nQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjUuYWRkVGhpbmcoc3Bpa2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjUuYWRkU29saWQoZmFsbGluZ0Jsb2NrMSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGZhbGxpbmdCbG9jazIgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA2LCAyMywgMjUsIDIsIDQsIC4yNSwgMSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gW1xuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA3ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDMpKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KDIyICogVSwgOCAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQzKSksXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMyKSB7XG4gICAgICAgICAgICAgICAgZmFsbGluZ0Jsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI1LmFkZFRoaW5nKHNwaWtlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI1LmFkZFNvbGlkKGZhbGxpbmdCbG9jazIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8yNlxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDksIDksIDI2LCA5LCAzLCA1LCAuMjUsIC41LCAxLCAxLjUpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzID0gW1xuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDkgKiBVLCA4ICogVSwgbmV3IHBoeXNpY3MuVGlsZURhdGEoNDApKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMCAqIFUsIDggKiBVLCBuZXcgcGh5c2ljcy5UaWxlRGF0YSg0MCkpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDExICogVSwgOCAqIFUsIG5ldyBwaHlzaWNzLlRpbGVEYXRhKDQwKSksXG4gICAgICAgICAgICBdXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2UpO1xuICAgICAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI2LmFkZFRoaW5nKHNwaWtlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI2LmFkZFNvbGlkKHRyaWdnZXJCbG9jayk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmFuc2l0aW9uc1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAxLCAzMSwgMCwgc2NlbmVzLkNFTEVTVEVfMDIsIDEsIDEsIDUpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAyLCAzNCwgMCwgc2NlbmVzLkNFTEVTVEVfMDMsIDIsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzAzLCAzMywgMCwgc2NlbmVzLkNFTEVTVEVfMDQsIDMsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA0LCAyMSwgMCwgc2NlbmVzLkNFTEVTVEVfMDUsIDQsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzA1LCAyMiwgMCwgc2NlbmVzLkNFTEVTVEVfMDYsIDMsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzA3LCAyOSwgMCwgc2NlbmVzLkNFTEVTVEVfMDYsIDMwLCAxLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wNiwgMzAsIDIsIHNjZW5lcy5DRUxFU1RFXzA4LCA1LCAwLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNiwgMzUsIDAsIHNjZW5lcy5DRUxFU1RFXzA5LCAxLCAyLCAzKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMCwgNywgMCwgc2NlbmVzLkNFTEVTVEVfMDksIDcsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzExLCA4LCAxLCBzY2VuZXMuQ0VMRVNURV8xMCwgOCwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTAsIDIsIDEsIHNjZW5lcy5DRUxFU1RFXzEyLCA0MiwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTEsIDMsIDAsIHNjZW5lcy5DRUxFU1RFXzEyLCAzLCAwLCAyKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wOSwgMCwgMCwgc2NlbmVzLkNFTEVTVEVfMTMsIDAsIDAsIDEwKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMywgLjUsIDEsIHNjZW5lcy5DRUxFU1RFXzE0LCAyMi41LCAyLCAxMCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTUsIDIyLCAxLCBzY2VuZXMuQ0VMRVNURV8xNCwgNCwgMCwgNSk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTYsIDE5LCAwLCBzY2VuZXMuQ0VMRVNURV8xNSwgMiwgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTQsIDEsIDEsIHNjZW5lcy5DRUxFU1RFXzE3LCAxMCwgMiwgOSk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTgsIDE3LCAwLCBzY2VuZXMuQ0VMRVNURV8xNywgMiwgMCwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTgsIDE5LCAwLCBzY2VuZXMuQ0VMRVNURV8xOSwgMTMsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE5LCAyLCAwLCBzY2VuZXMuQ0VMRVNURV8yMCwgMiwgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMjAsIDEyLCAxLCBzY2VuZXMuQ0VMRVNURV8yMSwgOCwgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMjEsIDI2LCAxLCBzY2VuZXMuQ0VMRVNURV8yMiwgMjYsIDAsIDEpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzIzLCA3LCAwLCBzY2VuZXMuQ0VMRVNURV8yMSwgMjcsIDMsIDcpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzIxLCAyLCAwLCBzY2VuZXMuQ0VMRVNURV8yNCwgOCwgMSwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMTcsIDMzLCAxLCBzY2VuZXMuQ0VMRVNURV8yNSwgNywgMCwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMjUsIDIyLCAwLCBzY2VuZXMuQ0VMRVNURV8yMSwgMiwgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMjQsIDMyLCAwLCBzY2VuZXMuQ0VMRVNURV8yNiwgNCwgMSwgNCk7XG5cbiAgICAgICAgLy8gTE9VSVNfMDZcbiAgICAgICAgLy8gc2NlbmVzLkxPVUlTXzA2LmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oMTEuNSAqIFUsIDE1ICogVSwgMCwgMyAqIFUsIHNjZW5lcy5MT1VJU18wOCwgVSwgMTMgKiBVLCAwKSk7XG4gICAgICAgIC8vIHNjZW5lcy5MT1VJU18wOC5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKDAsIDEzICogVSwgMCwgMyAqIFUsIHNjZW5lcy5MT1VJU18wNiwgMTAgKiBVLCAxNSAqIFUsIDEpKTtcblxuICAgICAgICAvLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMSwgMzUsIDAsIHNjZW5lcy5MT1VJU18wMiwgNCwgMSwgMyk7XG4gICAgICAgIC8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAzLCAzLCAwLCBzY2VuZXMuTE9VSVNfMDIsIDEzLCAwLCAzKTtcbiAgICAgICAgLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMwLCAxLCBzY2VuZXMuTE9VSVNfMDIsIDIzLCAyLCAzKTtcbiAgICAgICAgLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDQsIDQsIDAsIHNjZW5lcy5MT1VJU18wMiwgMzUsIDMsIDMpO1xuICAgICAgICAvLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wNSwgMzMsIDAsIHNjZW5lcy5MT1VJU18wNiwgMSwgMSwgNSk7XG4gICAgICAgIC8vIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkxPVUlTXzA2LCA4LCAwLCBzY2VuZXMuTE9VSVNfMDcsIDgsIDEsIDYpO1xuXG4gICAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjZW5lcyxcbiAgICBsb2FkU2NlbmVzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3Qgc291bmQgPSByZXF1aXJlKCcuL3NvdW5kJyk7XG5cbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG4vKipcbiAqIFRpbGVzIHNoZWV0XG4gKiBAdHlwZSB7SFRNTEltYWdlRWxlbWVudH1cbiAqL1xuY29uc3QgdGlsZXNldCA9IG5ldyBJbWFnZSgpO1xudGlsZXNldC5zcmMgPSAndGlsZW1hcHMvdGlsZXNldC5wbmcnO1xuXG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRpbGUgdG8gYmUgdXNlZCB3aGVuIHJlcHJlc2VudGluZyBhbiBlbGVtZW50IG9mIHRoZSBzY2VuZVxuICovXG5jbGFzcyBUaWxlRGF0YSB7XG4gICAgY29uc3RydWN0b3IoaW5kZXgsIHNoaWZ0WCA9IDAsIHNoaWZ0WSA9IDApIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZGV4IG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LXBvc2l0aW9uIG9mIHRoZSB0aWxlIGluIHRoZSB0aWxlc2V0XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnggPSB0aGlzLmluZGV4ICUgODtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueSA9IHRoaXMuaW5kZXggPj4gMztcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtb2Zmc2V0IHRvIGRyYXcgdGhlIHRpbGUgZnJvbSB0aGUgU2NlbmVFbGVtZW50J3MgcG9zaXRpb25cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2hpZnRYID0gc2hpZnRYO1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFkgPSBzaGlmdFk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0d28gc2VnbWVudHMgb24gYSAxRCBsaW5lIG92ZXJsYXAuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFNjZW5lRWxlbWVudHMgYXJlIHRoZSBzdXBlcmNsYXNzIG9mIGFsbCBvYmplY3RzIHRoYXQgYXBwZWFyIGluIGEgc2NlbmUgKG9ic3RhY2xlcywgcGxhdGZvcm1zLCBwbGF5ZXJzLCBoYXphcmRzLFxuICogZGVjb3JhdGlvbnMsIGV0Yy4pXG4gKlxuICogQWxsIEVsZW1lbnRzIGFyZSByZXByZXNlbnRlZCBhcyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgYW5kIHRoZSBzcGFjZSB0aGV5IG9jY3VweSBpbiBhIHNjZW5lIGlzIHRoZXJlZm9yZSBkZWZpbmVkXG4gKiBhcyBhIHBvc2l0aW9uICh4LCB5KSBhbmQgYSBzaXplICh3aWR0aCwgaGVpZ2h0KS4gQXQgYWxsIHRpbWVzLCBwb3NpdGlvbnMgYW5kIHNpemVzIHNob3VsZCBiZSBpbnRlZ2Vycy4gU3ViLWludGVnZXJcbiAqIHBvc2l0aW9ucyBhcmUgY29uc2lkZXJlZCB3aXRoIHRoZSB1c2Ugb2YgdGhlIGB4UmVtYWluZGVyYCBhbmQgYHlSZW1haW5kZXJgIGF0dHJpYnV0ZXMgKHRoYXQgc2hvdWxkIGhhdmUgYW4gYWJzb2x1dGVcbiAqIHZhbHVlIDwgMSlcbiAqL1xuY2xhc3MgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIG9mIHRoZSBsZWZ0bW9zdCBzaWRlIG9mIHRoZSBib3VuZGluZyBib3ggKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0geTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGluaXRpYWwgeC1jb29yZGluYXRlICh1c2VkIGZvciByZXNldCgpKVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zdGFydFggPSB4O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB5LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WSA9IHk7XG4gICAgICAgIHRoaXMuc2hpZnRYID0gMDtcbiAgICAgICAgdGhpcy5zaGlmdFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogd2lkdGggb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogaGVpZ2h0IG9mIHRoZSBTY2VuZUVsZW1lbnQgKGluIHBpeGVscylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAvKipcbiAgICAgICAgICogZnJhY3Rpb25hbCBwYXJ0IG9mIHRoZSB4LXBvc2l0aW9uIG9mIHRoZSBTY2VuZUVsZW1lbnQgKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgc2hvdWxkIGFsd2F5cyBiZSBhbiBpbnRlZ2VyLFxuICAgICAgICAgKiBidXQgZnJhY3Rpb25hbCBwYXJ0cyBvZiB0aGUgY29tcHV0ZWQgcG9zaXRpb24gY2FuIGJlIHJlbWVtYmVyZWQgZm9yIG5leHQgbW92ZSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHktcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeC1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFtb3VudCBtb3ZlZCBvbiB0aGUgeS1heGlzIHNpbmNlIGxhc3QgdXBkYXRlXG4gICAgICAgICAqIChyZXNldCBieSBiZWZvcmVVcGRhdGUoKSwgaW5jcmVtZW50ZWQgYXV0b21hdGljYWxseSBieSB0aGlzLm1vdmUoKSlcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW92ZWRZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNjZW5lRWxlbWVudCBzaG91bGQgYmUgY29uc2lkZXJlZCBieSB0aGUgRW5naW5lIG9yIG5vdCAoaW5hY3RpdmUgU2NlbmVFbGVtZW50cyBhcmUgaWdub3JlZCB3aGVuXG4gICAgICAgICAqIGludGVyYWN0aW9ucyBhcmUgY29tcHV0ZWQpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB1c2VkIHRvIHJlcHJlc2VudCB0aGUgU2NlbmVFbGVtZW50IChpZiByZXByZXNlbnRlZCBieSBhIHNpbmdsZSB0aWxlKVxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aWxlRGF0YSA9IHRpbGVEYXRhO1xuICAgICAgICAvKipcbiAgICAgICAgICogQ3VycmVudCBlZmZlY3RzIGFwcGxpZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBAdHlwZSB7W0VmZmVjdF19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVmZmVjdHMgPSBbXTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNjZW5lIGluIHdoaWNoIHRoZSBTY2VuZUVsZW1lbnQgaXMgaW5jbHVkZWRcbiAgICAgICAgICogQHR5cGUge3VuZGVmaW5lZH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaWN0aW9uYXJ5IG9mIHRpbWVycyAobnVtYmVycykgdGhhdCBhcmUgYXV0b21hdGljYWxseSBkZWNyZW1lbnRlZCBhdCBlYWNoIHVwZGF0ZVxuICAgICAgICAgKiBAdHlwZSB7e251bWJlcn19XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycyA9IHt9O1xuICAgICAgICAvKipcbiAgICAgICAgICogU2V0IG9mIFNjZW5lRWxlbWVudHMgdGhhdCBhcmUgYXR0YWNoZWQgdG8gdGhlIFNjZW5lRWxlbWVudFxuICAgICAgICAgKiBXaGVuZXZlciBgdGhpc2AgaXMgbW92ZWQsIGFsbCBhdHRhY2hlZCBFbGVtZW50cyB3aWxsIGFsc28gYmUgbW92ZWQgYnkgdGhlIHNhbWUgYW1vdW50XG4gICAgICAgICAqXG4gICAgICAgICAqIFdhcm5pbmc6IEJlY2F1c2Ugb2YgdGhlIHNwZWNpYWwgY29uc3RyYWludHMgb24gQWN0b3IgcG9zaXRpb25zLCBBY3RvcnMgc2hvdWxkIG5vdCBiZSBhdHRhY2hlZCB0byBhXG4gICAgICAgICAqIFNjZW5lRWxlbWVudC4gVGhlIHBhcnRpY3VsYXIgY2FzZSBvZiBBY3RvcnMgXCJyaWRpbmdcIiBhIFNvbGlkIGlzIGhhbmRsZWQgc2VwYXJhdGVseSBpbiB0aGUgU29saWQubW92ZSgpXG4gICAgICAgICAqIG1ldGhvZC5cbiAgICAgICAgICogQHR5cGUge1NldDxTY2VuZUVsZW1lbnQ+fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFNjZW5lRWxlbWVudCB0byB3aGljaCB0aGlzIGlzIGF0dGFjaGVkLCBpZiBhbnlcbiAgICAgICAgICogQHR5cGUge1NjZW5lRWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgdGhpc2Agb3ZlcmxhcHMgdGhlIGJvdW5kaW5nIHJlY3RhbmdsZSBvZiBgb3RoZXJgLlxuICAgICAqXG4gICAgICogVHdvIFNjZW5lRWxlbWVudHMgb3ZlcmxhcCBpZiBmb3IgYm90aCBkaW1lbnNpb25zIHRoZSBlbmQgcG9zaXRpb24gb2YgZWFjaCBTY2VuZUVsZW1lbnQgaXMgc3RyaWN0bHkgZ3JlYXRlciB0aGFuXG4gICAgICogdGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSBvdGhlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBvdGhlciB7U2NlbmVFbGVtZW50fVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufGJvb2xlYW59XG4gICAgICovXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERyYXdzIHRoZSBTY2VuZUVsZW1lbnQgaW4gdGhlIENhbnZhcyBhc3NvY2lhdGVkIHRvIHRoZSBDb250ZXh0IGdpdmVuIGFzIGFyZ3VtZW50XG4gICAgICogQHBhcmFtIGN0eCB7Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEfSBjb250ZXh0IG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBkcmF3blxuICAgICAqL1xuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLnRpbGVEYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzaGlmdFggPSB0aGlzLnNoaWZ0WDtcbiAgICAgICAgICAgIGxldCBzaGlmdFkgPSB0aGlzLnNoaWZ0WTtcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFjaGVkVG8pIHtcbiAgICAgICAgICAgICAgICBzaGlmdFggKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WDtcbiAgICAgICAgICAgICAgICBzaGlmdFkgKz0gdGhpcy5hdHRhY2hlZFRvLnNoaWZ0WTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgdGlsZXNldCxcbiAgICAgICAgICAgICAgICAxNiAqIHRoaXMudGlsZURhdGEueCwgMTYgKiB0aGlzLnRpbGVEYXRhLnksXG4gICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgIHRoaXMueCArIHRoaXMudGlsZURhdGEuc2hpZnRYICsgc2hpZnRYLCB0aGlzLnkgKyB0aGlzLnRpbGVEYXRhLnNoaWZ0WSArIHNoaWZ0WSxcbiAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHByb3BlcnRpZXMgYXQgdGhlIHN0YXJ0IG9mIGEgbmV3IHVwZGF0ZSBvZiB0aGUgU2NlbmVcbiAgICAgKi9cbiAgICBiZWZvcmVVcGRhdGUoKSB7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgc3RhdGUgb2YgdGhlIFNjZW5lRWxlbWVudCAoY2FsbGVkIGF0IGVhY2ggZnJhbWUgd2hlbiB0aGUgU2NlbmUgaXMgYWN0aXZlKVxuICAgICAqIEBwYXJhbSBkZWx0YVRpbWUge251bWJlcn0gdGltZSBlbGFwc2VkIHNpbmNlIGxhc3QgdXBkYXRlIChpbiBzZWNvbmRzKVxuICAgICAqL1xuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgLy8gdXBkYXRlIHRpbWVyc1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgZWZmZWN0c1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiB0aGlzLmVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmVzIHRoZSBTY2VuZUVsZW1lbnQgYnkgYSBnaXZlbiBhbW91bnRcbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIHJpZ2h0XG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSBkb3duXG4gICAgICovXG4gICAgbW92ZShkeCwgZHkpIHtcbiAgICAgICAgLy8gbW92ZSBhbGwgZWxlbWVudHMgYXR0YWNoZWQgdG8gdGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hhbmdlIHBvc2l0aW9uXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG4gICAgICAgIHRoaXMubW92ZWRYICs9IG1vdmVYO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgU2NlbmUgRWxlbWVudCB0byBhIGdpdmVuIHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHgge251bWJlcn0geC1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0geSB7bnVtYmVyfSB5LWNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldCBwb3NpdGlvblxuICAgICAqL1xuICAgIG1vdmVUbyh4LCB5KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy54ID0gdGhpcy5zdGFydFg7XG4gICAgICAgIHRoaXMueSA9IHRoaXMuc3RhcnRZO1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgZm9yIChjb25zdCB0aW1lciBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdGltZXJdID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVmZmVjdHMubGVuZ3RoID0gMDsgICAgLy8gY2xlYXIgYWxsIGVmZmVjdHNcbiAgICB9XG5cbiAgICBhZGRFZmZlY3QoZWZmZWN0KSB7XG4gICAgICAgIHRoaXMuZWZmZWN0cy5wdXNoKGVmZmVjdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZUVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmVmZmVjdHMuaW5kZXhPZihlZmZlY3QpO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLmVmZmVjdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBhIGdpdmVuIFNjZW5lRWxlbWVudCB0byB0aGlzXG4gICAgICogQHBhcmFtIGVsZW1lbnQge1NjZW5lRWxlbWVudH0gdGhlIFNjZW5lRWxlbWVudCB0byBhdHRhY2hcbiAgICAgKi9cbiAgICBhdHRhY2goZWxlbWVudCkge1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LmF0dGFjaGVkVG8gPSB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGRldGFjaFxuICAgICAqL1xuICAgIGRldGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBBY3RvcnMgYXJlIFNjZW5lRWxlbWVudHMgaW4gYSBTY2VuZSB0aGF0IGNhbm5vdCBwYXNzIHRocm91Z2ggU29saWRzIChwbGF5ZXIgY2hhcmFjdGVycyBhbmQgZW5lbWllcyBmb3IgaW5zdGFuY2UpXG4gKi9cbmNsYXNzIEFjdG9yIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB4LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWChhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdYID0gdGhpcy54ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCAtIHRoaXMud2lkdGggPCBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIG1vdmUsIDApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueCArIHNvbGlkLndpZHRoID4gbmV3WCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ggPSBzb2xpZC54ICsgc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR4ID0gbmV3WCAtIHRoaXMueDtcbiAgICAgICAgICAgIHRoaXMueCA9IG5ld1g7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gZHg7ICAgICAgLy8gaWYgbW92ZW1lbnQgd2FzIHN0b3BwZWQgYnkgYSBTb2xpZCwgbW92ZWQgZGlzdGFuY2UgaXMgYW4gaW50ZWdlclxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBhbW91bnQ7ICAvLyBpZiBtb3ZlbWVudCB3YXMgbm90IHN0b3BwZWQsIG1vdmVkIGRpc3RhbmNlIG1pZ2h0IGJlIGZyYWN0aW9uYWxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIG1vdmVtZW50IHRoYXQgaXMgaW5zdWZmaWNpZW50IHRvIG1vdmUgYnkgYSBwaXhlbCBpcyBzdGlsbCBjb3VudGVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlIHRoZSBBY3RvciBhIGdpdmVuIGFtb3VudCBvbiB0aGUgeS1heGlzXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCB0cmllcyB0byBtb3ZlIHRoZSBBY3RvciBieSB0aGUgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXMgYnV0IHN0b3BzIGlmIHRoZXJlIGlzIGEgY29sbGlzaW9uIHdpdGggYVxuICAgICAqIFNvbGlkICh0aGUgcG9zaXRpb24gaXMgc2V0IGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgb3ZlcmxhcCB3aXRoIHRoZSBTb2xpZCkuIElmIHRoZXJlIHdhcyBhIGNvbGxpc2lvbiwgdGhlIGZ1bmN0aW9uXG4gICAgICogZ2l2ZW4gYXMgcGFyYW1ldGVyIGlzIGNhbGxlZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhbW91bnQge251bWJlcn0gYW1vdW50IHRvIG1vdmUgb24gdGhlIHgtYXhpc1xuICAgICAqIEBwYXJhbSBvbkNvbGxpZGUge2Z1bmN0aW9uKCl9IGZ1bmN0aW9uIHRvIHJ1biBpZiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkXG4gICAgICovXG4gICAgbW92ZVkoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WSA9IHRoaXMueSArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSAmJiBzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgLSB0aGlzLmhlaWdodCA8IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSAtIHRoaXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSArIHNvbGlkLmhlaWdodCA+IG5ld1kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdZID0gc29saWQueSArIHNvbGlkLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHkgPSBuZXdZIC0gdGhpcy55O1xuICAgICAgICAgICAgdGhpcy55ID0gbmV3WTtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBkeTsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgY3VycmVudGx5IFwicmlkaW5nXCIgdGhlIFNvbGlkIGdpdmVuIGFzIHBhcmFtZXRlciwgbWVhbmluZyB0aGF0IHdoZW4gdGhlIFNvbGlkXG4gICAgICogbW92ZXMgaXQgc2hvdWxkIG1vdmUgdGhlIEFjdG9yIHRvby5cbiAgICAgKiBBbiBBY3RvciBpcyBjb25zaWRlcmVkIHRvIGJlIHJpZGluZyBhIFNvbGlkIGl0IGlzIHN0YW5kaW5nIGRpcmVjdGx5IG9uIHRvcCBvZiBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBzb2xpZCB7U29saWR9XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgdGhlIEFjdG9yIGlzIHJpZGluZyB0aGUgc29saWRcbiAgICAgKi9cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gdGhpcy55ICsgdGhpcy5oZWlnaHQgPT09IHNvbGlkLnkgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCB0byBjYWxsIHdoZW4gdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZCB3aGlsZSBiZWluZyBwdXNoZWQgYnkgYW5vdGhlclxuICAgICAqL1xuICAgIHNxdWlzaCgpIHtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBTb2xpZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBBY3RvcnMgY2Fubm90IHBhc3MgdGhyb3VnaC4gVGhlcmUgc2hvdWxkIG5ldmVyIGJlIGFuIEFjdG9yIG92ZXJsYXBwaW5nIGEgU29saWQgKHVubGVzc1xuICogZWl0aGVyIG9uZSBpcyBtYXJrZWQgYXMgaW5hY3RpdmUpLiBXaGVuIFNvbGlkcyBtb3ZlLCB0aGV5IGludGVyYWN0IHdpdGggQWN0b3JzIHRoYXQgbWlnaHQgb3RoZXJ3aXNlIG92ZXJsYXAgKHRoZXlcbiAqIG1pZ2h0IHB1c2ggdGhlbSwga2lsbCB0aGVtLCBldGMuKS5cbiAqXG4gKiBUd28gU29saWRzIG1pZ2h0IG92ZXJsYXAsIGFuZCBpbiBnZW5lcmFsIHRoZSBtb3ZlbWVudCBvZiBhIFNvbGlkIGlzIG5vdCBhZmZlY3RlZCBieSBvdGhlciBTb2xpZHMuXG4gKi9cbmNsYXNzIFNvbGlkIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBTb2xpZCBzaG91bGQgYmUgY29uc2lkZXJlZCB3aGVuIGNoZWNraW5nIGNvbGxpc2lvbnMgd2l0aCBhbiBBY3RvclxuICAgICAgICAgKiBUaGlzIGF0dHJpYnV0ZSBpcyB1c2VkIGF1dG9tYXRpY2FsbHkgYnkgdGhlIG1vdmUoKSBtZXRob2Qgd2hlbiB0aGUgU29saWQgcHVzaGVzIGFuIEFjdG9yLiBJdCBzaG91bGQgbm90IGJlXG4gICAgICAgICAqIGNoYW5nZWQgaW4gb3RoZXIgY2lyY3Vtc3RhbmNlcyAodXNlIGlzQWN0aXZlIHRvIGRpc2FibGUgdGhlIFNvbGlkKS5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICAvKipcbiAgICAgICAgICogTW9tZW50dW0gb24gdGhlIHgtYXhpcyBnaXZlbiB0byBBY3RvcnMgcmlkaW5nIHRoZSBTb2xpZCAoaW4gcGl4ZWxzL3MpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb21lbnR1bSBvbiB0aGUgeS1heGlzIGdpdmVuIHRvIEFjdG9ycyByaWRpbmcgdGhlIFNvbGlkIChpbiBwaXhlbHMvcylcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIHVzZWQgdG8gc3RvcmUgbW9tZW50dW0gZm9yIGEgZmV3IGZyYW1lcyBhZnRlciB0aGUgU29saWQgc3RvcHMgbW92aW5nXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHRoZSBtb21lbnR1bSBvZiB0aGUgc29saWQgb24gdGhlIHgtYXhpcyBpZiB0aGUgbW9tZW50dW0gY291bnRlciBoYXMgbm90IGV4cGlyZWQgKDAgb3RoZXJ3aXNlKVxuICAgICAqL1xuICAgIGdldE1vbWVudHVtWCgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1YO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHRoZSBtb21lbnR1bSBvZiB0aGUgc29saWQgb24gdGhlIHgtYXhpcyBpZiB0aGUgbW9tZW50dW0gY291bnRlciBoYXMgbm90IGV4cGlyZWQgKDAgb3RoZXJ3aXNlKVxuICAgICAqL1xuICAgIGdldE1vbWVudHVtWSgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1ZO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54IC0gYWN0b3IueCAtIGFjdG9yLndpZHRoLCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPiBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSArIHRoaXMuaGVpZ2h0IC0gYWN0b3IueSwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZIDwgbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgLSBhY3Rvci55IC0gYWN0b3IuaGVpZ2h0LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtKG14LCBteSkge1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IGNvbnN0YW50cy5NT01FTlRVTV9TVE9SRV9USU1FO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IG14O1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IG15O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgU29saWQgaXMgY29uc2lkZXJlZCB0byBjb2xsaWRlIHdpdGggYW4gQWN0b3IgbW92aW5nIGJ5IGEgZ2l2ZW4gYW1vdW50IGluIGJvdGggYXhlcy5cbiAgICAgKlxuICAgICAqIFRvIHNpbXBsaWZ5IHRoZSBjb21wdXRhdGlvbiwgdGhlIGZ1bmN0aW9uIGNoZWNrcyBpZiB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBzb2xpZCBvdmVybGFwcyB3aXRoIHRoZSBzbWFsbGVzdFxuICAgICAqIHJlY3RhbmdsZSBjb250YWluaW5nIHRoZSBhcmVhcyBvY2N1cGllZCBieSB0aGUgQWN0b3IgYXQgdGhlIHN0YXJ0IGFuZCBlbmQgb2YgaXRzIG1vdmVtZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIGFjdG9yIHtBY3Rvcn1cbiAgICAgKiBAcGFyYW0gZHgge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeC1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gYW1vdW50IHRyYXZlbGVkIGJ5IHRoZSBBY3RvciBvbiB0aGUgeS1heGlzIGZyb20gaXRzIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgU29saWQgb3ZlcmxhcHMgdGhlIEFjdG9yIGF0IGFueSBwb2ludCBkdXJpbmcgaXRzIG1vdmVtZW50XG4gICAgICovXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogSGF6YXJkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IGtpbGwgdGhlIHBsYXllciBvbiBjb250YWN0XG4gKi9cbmNsYXNzIEhhemFyZCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBQbGF0Zm9ybXMgYXJlIGZsYXQgU29saWRzICgwIGhlaWdodCkgdGhhdCBBY3RvcnMgY2FuIHBhc3MgdGhyb3VnaCB3aGVuIG1vdmluZyB1cHdhcmRzIGJ1dCBub3QgZG93bndhcmRzIChpZiB0aGV5IGFyZVxuICogZW50aXJlbHkgaGlnaGVyIHRoYW4gdGhlIFBsYXRmb3JtKVxuICpcbiAqIENvbnRyYXJ5IHRvIHJlZ3VsYXIgU29saWRzLCBQbGF0Zm9ybXMgYXJlIGFsbG93ZWQgdG8gb3ZlcmxhcCB3aXRoIEFjdG9ycy5cbiAqL1xuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCAwLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY2FuQmVDbGltYmVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0IDw9IHRoaXMueSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgKyBhY3Rvci5oZWlnaHQgKyBkeSA+IHRoaXMueTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3ByaW5ncyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRocm93IEFjdG9ycyB1cCBvbiBjb250YWN0XG4gKi9cbmNsYXNzIFNwcmluZyBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCBVLCBVIC8gMiwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLnRpbGVEYXRhLnNoaWZ0WSA9IC1VIC8gMjtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuc3ByaW5nU291bmQpO1xuICAgICAgICBwbGF5ZXIuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0JPVU5DRSk7XG4gICAgICAgIHBsYXllci5zcGVlZFggPSAwO1xuICAgICAgICBwbGF5ZXIuc3BlZWRZID0gY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgcGxheWVyLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogRGFzaERpYW1vbmRzIGFyZSBTY2VuZUVsZW1lbnRzIHRoYXQgcmVzdG9yZSB0aGUgZGFzaCBjb3VudGVyIG9mIHRoZSBQbGF5ZXJzIHdobyB0b3VjaCB0aGVtXG4gKi9cbmNsYXNzIERhc2hEaWFtb25kIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKVxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUgJiYgdGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLnJlc3RvcmVEYXNoKCkpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5kYXNoRGlhbW9uZFNvdW5kKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTdHJhd2JlcnJpZXMgYXJlIGNvbGxlY3RpYmxlcyB0aGF0IFBsYXllciB0YWtlIG9uIGNvbnRhY3QuXG4gKiBJZiBhIFBsYXllciBkaWVzIGFmdGVyIGNvbGxlY3RpbmcgYSBTdHJhd2JlcnJ5IGJlZm9yZSBjaGFuZ2luZyBTY2VuZSwgdGhlIFN0cmF3YmVycnkgaXMgcmVzdG9yZWQgaW4gdGhlIFNjZW5lXG4gKiAoYW5kIHJlbW92ZWQgZnJvbSB0aGUgUGxheWVyJ3MgbGlzdCBvZiBjb2xsZWN0ZWQgU3RyYXdiZXJyaWVzKVxuICovXG5jbGFzcyBTdHJhd2JlcnJ5IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnN0cmF3YmVycnlTb3VuZCk7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmFuc2l0aW9ucyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRyYW5zZmVyIGEgUGxheWVyIGZyb20gb25lIFNjZW5lIHRvIGFub3RoZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZSB0byB3aGljaCB0aGUgUGxheWVyIGlzIHRha2VuIHdoZW4gdG91Y2hpbmcgdGhlIFRyYW5zaXRpb25cbiAgICAgICAgICogQHR5cGUge1NjZW5lfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIGluIHRoZSB0YXJnZXQgU2NlbmUgY29ycmVzcG9uZGluZyB0byB0aGlzLnggKHdoZW4gdGhlIFBsYXllciB0cmFuc2l0aW9ucyB0byB0aGUgdGFyZ2V0IFNjZW5lLFxuICAgICAgICAgKiBpdHMgcG9zaXRpb24gaXMgc2V0IHRvIGl0cyBjdXJyZW50IHgtcG9zaXRpb24gKyB0aGlzLnRhcmdldFggLSB0aGlzLnhcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueSAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeS1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WSArIHRoaXMueVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBpbmRleCBvZiB0aGUgc3Bhd24gcG9pbnQgKGluIHRoZSB0YXJnZXQgU2NlbmUncyBsaXN0IG9mIHNwYXduIHBvaW50cykgY29ycmVzcG9uZGluZyB0byB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSBzcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZS5yZXNldCgpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgcGxheWVyLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENydW1ibGluZ0Jsb2NrcyBhcmUgU29saWRzIHRoYXQgZGlzYXBwZWFyIHNob3J0bHkgYWZ0ZXIgYSBQbGF5ZXIgaGl0cyBpdCAob25seSB3aGVuIHRoZSBQbGF5ZXIgaXMgY29uc2lkZXJlZCB0byBiZVxuICogXCJjYXJyaWVkXCIgYnkgdGhlIENydW1ibGluZ0Jsb2NrKS5cbiAqIFRoZXkgcmVhcHBlYXIgYWZ0ZXIgYSBnaXZlbiB0aW1lIChpZiB0aGVyZSBhcmUgbm8gQWN0b3JzIG9uIHRoZWlyIHBvc2l0aW9uKVxuICovXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCB0aWxlRGF0YSk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBpcyBkaXNhcHBlYXJpbmdcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIGRpc2FwcGVhcmFuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZXIgZm9yIHJlYXBwZWFyYW5jZVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmZhbGwgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjsgICAvLyBkdXJhdGlvbiBiZWZvcmUgcmVhcHBlYXJpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVjb21lQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkQmVjb21lQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNob3VsZEJlY29tZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zY2VuZS5wbGF5ZXIgJiYgdGhpcy5zY2VuZS5wbGF5ZXIuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuY3J1bWJsaW5nQmxvY2tTb3VuZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAuNTsgIC8vIGR1cmF0aW9uIGJlZm9yZSBkaXNhcHBlYXJpbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IDIgKiB0aGlzLnRpbWVycy5mYWxsO1xuICAgICAgICAgICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gYWxwaGE7XG4gICAgICAgICAgICAgICAgc3VwZXIuZHJhdyhjdHgpO1xuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFRyaWdnZXJCbG9ja3MgYXJlIFNvbGlkcyB0aGF0IHN0YXJ0IG1vdmluZyB3aGVuIHRoZXkgY2FycnkgYW4gQWN0b3JcbiAqL1xuY2xhc3MgVHJpZ2dlckJsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIGJsb2NrIGhhcyBiZWVuIHRyaWdnZXJlZCBieSBhbiBBY3RvciBidXQgaGFzIG5vdCB5ZXQgc3RhcnRlZCBleGVjdXRpbmcgdGhlIG1vdmVtZW50IChkdXJpbmdcbiAgICAgICAgICogdHJpZ2dlciBkZWxheSlcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaW1lIGRlbGF5IGJlZm9yZSB0aGUgbW92ZW1lbnQgc3RhcnRzIHdoZW4gdGhlIGJsb2NrIGlzIHRyaWdnZXJlZFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5kZWxheSA9IGRlbGF5O1xuICAgICAgICAvKipcbiAgICAgICAgICogbW92ZW1lbnQgdG8gZXhlY3V0ZSB3aGVuIHRyaWdnZXJlZCBieSBhbiBBY3RvclxuICAgICAgICAgKiBAdHlwZSB7RWZmZWN0fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudCA9IG1vdmVtZW50O1xuICAgICAgICAvKipcbiAgICAgICAgICogVGlsZSBpbmRleGVzIHRvIHVzZSB3aGVuIGRyYXdpbmcgdGhlIFRyaWdnZXJCbG9jayBvbiB0aGUgU2NlbmVcbiAgICAgICAgICogQHR5cGUge251bWJlcltdfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzID0gbmV3IEFycmF5KCh3aWR0aCAvIFUpICogKGhlaWdodCAvIFUpKS5maWxsKDApLm1hcChfID0+IDY0ICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNCkpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuc2hpZnRYID0gMDtcbiAgICAgICAgdGhpcy5zaGlmdFkgPSAwO1xuICAgICAgICBpZiAodGhpcy5pc1RyaWdnZXJlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLnRyaWdnZXIgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRFZmZlY3QodGhpcy50cmlnZ2VyZWRNb3ZlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRYID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykgLSAxO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hpZnRZID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykgLSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZWZmZWN0cy5pbmNsdWRlcyh0aGlzLnRyaWdnZXJlZE1vdmVtZW50KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQucmVtYWluaW5nQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUVmZmVjdCh0aGlzLnRyaWdnZXJlZE1vdmVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBzaG91bGRUcmlnZ2VyID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNob3VsZFRyaWdnZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzaG91bGRUcmlnZ2VyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudHJpZ2dlciA9IHRoaXMuZGVsYXk7XG4gICAgICAgICAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlc2V0KCk7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgZm9yIChsZXQgeSA9IHRoaXMueTsgeSA8IHRoaXMueSArIHRoaXMuaGVpZ2h0OyB5ICs9IFUpIHtcbiAgICAgICAgICAgIGZvciAobGV0IHggPSB0aGlzLng7IHggPCB0aGlzLnggKyB0aGlzLndpZHRoOyB4ICs9IFUpIHtcbiAgICAgICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgICAgICB0aWxlc2V0LFxuICAgICAgICAgICAgICAgICAgICAxNiAqICh0aGlzLnNwcml0ZUluZGV4ZXNbaW5kZXhdICUgOCksIDE2ICogfn4odGhpcy5zcHJpdGVJbmRleGVzW2luZGV4XSAvIDgpLFxuICAgICAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgICAgIHggKyB0aGlzLnNoaWZ0WCwgeSArIHRoaXMuc2hpZnRZLFxuICAgICAgICAgICAgICAgICAgICA4LCA4KTtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIEZhbGxpbmdCbG9jayBleHRlbmRzIFRyaWdnZXJCbG9jayB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgZGVsYXksIG1vdmVtZW50KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCk7XG4gICAgICAgIGNvbnN0IHcgPSB3aWR0aCAvIFU7XG4gICAgICAgIGNvbnN0IGggPSBoZWlnaHQgLyBVO1xuICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXMuZmlsbCg5KTtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzWzBdID0gMztcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgLSAxXSA9IDU7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogKGggLSAxKV0gPSAxNjtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiBoIC0gMV0gPSAxODtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCB3IC0gMTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXNbaV0gPSA0O1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiAoaCAtIDEpICsgaV0gPSAxNztcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogaV0gPSA4O1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW3cgKiBpICsgKHcgLSAxKV0gPSAxMDtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1VwIGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIGRvd253YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc1VwIGV4dGVuZHMgSGF6YXJkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICB0aWxlRGF0YS5zaGlmdFkgPSAtVSAvIDI7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWSAtIHRoaXMubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc0Rvd24gYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgdXB3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0Rvd24gZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA8IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1JpZ2h0IGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIGxlZnR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc1JpZ2h0IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVIC8gMiwgVSwgdGlsZURhdGEpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRYIC0gdGhpcy5tb3ZlZFggPCAwKSB7XG4gICAgICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyByaWdodHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzTGVmdCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgdGlsZURhdGEpIHtcbiAgICAgICAgdGlsZURhdGEuc2hpZnRYID0gLVUgLyAyO1xuICAgICAgICBzdXBlcih4ICsgVSAvIDIsIHksIFUgLyAyLCBVLCB0aWxlRGF0YSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFggLSB0aGlzLm1vdmVkWCA+IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZWdtZW50c092ZXJsYXAsXG4gICAgdGlsZXNldCxcbiAgICBUaWxlRGF0YSxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgRmFsbGluZ0Jsb2NrLFxuICAgIENydW1ibGluZ0Jsb2NrLFxuICAgIFNwaWtlc1VwLFxuICAgIFNwaWtlc0Rvd24sXG4gICAgU3Bpa2VzTGVmdCxcbiAgICBTcGlrZXNSaWdodCxcbn1cbiIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHNvdW5kID0gcmVxdWlyZSgnLi9zb3VuZCcpO1xuXG5jb25zdCBBTklNQVRJT05fU0xPV0RPV04gPSA2O1xuY29uc3QgQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBBTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgQU5JTUFUSU9OX0pVTVAgPSBbNiwgM107XG5jb25zdCBBTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cbmNvbnN0IHNwcml0ZXNTaGVldHMgPSB7fTtcblxuXG5mdW5jdGlvbiBsb2FkU3ByaXRlcyhjb2xvcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldHNbY29sb3JdID0gaW1hZ2U7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbWFnZS5zcmMgPSBgaW1hZ2VzL2hlcm9fJHtjb2xvcn0ucG5nYDtcbiAgICB9KTtcbn1cblxuXG5jb25zdCBsb2FkQWxsU3ByaXRlcyA9IFByb21pc2UuYWxsKFtcbiAgICBsb2FkU3ByaXRlcygncmVkJyksXG4gICAgbG9hZFNwcml0ZXMoJ2dyZWVuJyksXG4gICAgbG9hZFNwcml0ZXMoJ2JsdWUnKSxcbl0pO1xuXG5cbmNsYXNzIFBsYXllciBleHRlbmRzIHBoeXNpY3MuQWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCwgY29sb3JOYW1lID0gJ2JsdWUnKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5jb2xvck5hbWUgPSBjb2xvck5hbWU7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IDE7XG4gICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IDE7XG4gICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IDQ7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuXG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB+fih0aGlzLmFuaW1hdGlvbl9jb3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gNCAqIHRoaXMuc3ByaXRlX3JvdyArICh0aGlzLm5iRGFzaGVzID8gMCA6IDIpICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzcHJpdGVzU2hlZXRzW3RoaXMuY29sb3JOYW1lXSxcbiAgICAgICAgICAgIDE2ICogaW5kZXgsIDE2ICogcm93LFxuICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgdGhpcy54IC0gNCArIHRoaXMuc2hpZnRYLCB0aGlzLnkgLSAyICsgdGhpcy5zaGlmdFksXG4gICAgICAgICAgICAxNiwgMTYpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICs9IDE7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgJT0gdGhpcy5uYl9zcHJpdGVzICogQU5JTUFUSU9OX1NMT1dET1dOO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jYW5CZUNsaW1iZWQgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiB0aGlzLnggPT09IHNvbGlkLnggKyBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBsYXllciBpcyBodWdnaW5nIGEgd2FsbFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IGNvbnN0YW50cy5KVU1QX0dSQUNFX1RJTUU7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gY29uc3RhbnRzLlNUQVRFX0RBU0gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMudXBkYXRlQW5pbWF0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5tb3ZlWCh0aGlzLnNwZWVkWCAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFggPSAwKTtcbiAgICAgICAgdGhpcy5tb3ZlWSh0aGlzLnNwZWVkWSAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFkgPSAwKTtcblxuICAgICAgICAvLyBpbnRlcmFjdCB3aXRoIFRoaW5nc1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnNjZW5lLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIGlmICh0aGluZy5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKHRoaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGluZy5vbkNvbnRhY3RXaXRoKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnkgPj0gdGhpcy5zY2VuZS5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5keWluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NlbmUuc2hvdWxkUmVzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcEhlbGQgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5pbnB1dHMueUF4aXMgKiBkYXNoU3BlZWQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlucHV0cy5kYXNoUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciAmJiB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPiAwKSB7XG4gICAgICAgICAgICAvLyByZWd1bGFyIGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSB0aGlzLmlucHV0cy54QXhpcyAqIGNvbnN0YW50cy5KVU1QX0hPUklaT05UQUxfQk9PU1Q7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgKHRoaXMuaGFzV2FsbExlZnQgfHwgdGhpcy5oYXNXYWxsUmlnaHQpKSB7XG4gICAgICAgICAgICAvLyB3YWxsanVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBkeCA9IHRoaXMuaGFzV2FsbExlZnQgPyAxIDogLTE7XG4gICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMuaGFzV2FsbFJpZ2h0KSB8fCAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMuaGFzV2FsbExlZnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gdGhpcy5pbnB1dHMueEF4aXM7XG5cbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5DTElNQl9TTElQX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5taW4odGhpcy5zcGVlZFkgKyBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZUFuaW1hdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IGNvbnN0YW50cy5TVEFURV9ERUFEKSB7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX1JVTik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0lETEUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zcGVlZFkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9KVU1QKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRkFMTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmp1bXBTb3VuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRhc2hTb3VuZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBzb3VuZC5wbGF5U291bmQoc291bmQuZGllU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBtYWtlVHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgICAgIC8vIHZhbGlkYXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LnNjZW5lLnJlbW92ZVRoaW5nKHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRyYW5zaXRpb24udGFyZ2V0U2NlbmUuc2V0UGxheWVyKHRoaXMpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNwYXduUG9pbnRJbmRleCA9IHRyYW5zaXRpb24uc3Bhd25Qb2ludEluZGV4O1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgZGllKCkge1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RFQUQpO1xuICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fRElFKTtcbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnNjZW5lLnNwYXduUG9pbnRzW3RoaXMuc2NlbmUuc3Bhd25Qb2ludEluZGV4XTtcbiAgICAgICAgdGhpcy54ID0gcG9pbnQueDtcbiAgICAgICAgdGhpcy55ID0gcG9pbnQueSAtIDY7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpICYmXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHNvbGlkLnggKyBzb2xpZC53aWR0aCA9PT0gdGhpcy54KSB8fFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHNldEFuaW1hdGlvbihzcHJpdGVfcm93LCBuYl9zcHJpdGVzKSB7XG4gICAgICAgIGlmIChzcHJpdGVfcm93ICE9PSB0aGlzLnNwcml0ZV9yb3cpIHtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IHNwcml0ZV9yb3c7XG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyID0gMDtcbiAgICAgICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IG5iX3Nwcml0ZXM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyLFxuICAgIGxvYWRBbGxTcHJpdGVzLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jbGFzcyBTY2VuZSB7XG4gICAgY29uc3RydWN0b3Iod2lkdGgsIGhlaWdodCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogV2lkdGggb2YgdGhlIFNjZW5lIGluIHBpeGVsc1xuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICAvKipcbiAgICAgICAgICogSGVpZ2h0IG9mIHRoZSBzY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnNjcm9sbFggPSAwO1xuICAgICAgICB0aGlzLnNjcm9sbFkgPSBVIC8gMjtcbiAgICAgICAgdGhpcy5zb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuYWN0b3JzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRoaW5ncyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50cyA9IFtdO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMucGxheWVyID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnNwYXduUG9pbnRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZnJvbUpTT04oZGF0YSkge1xuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZShkYXRhLndpZHRoICogVSwgZGF0YS5oZWlnaHQgKiBVKTtcbiAgICAgICAgLy8gbWFrZSB3YWxsc1xuICAgICAgICBjb25zdCB3YWxscyA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAtMS41ICogVSwgZGF0YS53aWR0aCAqIFUsIDApLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKC0uNSAqIFUsIDAsIDAsIGRhdGEuaGVpZ2h0ICogVSksXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoKGRhdGEud2lkdGggKyAuNSkgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgZm9yIChjb25zdCB3YWxsIG9mIHdhbGxzKSB7XG4gICAgICAgICAgICB3YWxsLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgc2NlbmUuYWRkU29saWQod2FsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYWluTGF5ZXIgPSBkYXRhLmxheWVycy5maW5kKGwgPT4gbC5uYW1lID09PSAnbWFpbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1haW5MYXllci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG1haW5MYXllci5kYXRhW2ldO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IChpICUgbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IH5+KGkgLyBtYWluTGF5ZXIud2lkdGgpICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogKGluZGV4IC0gMSkgJSA4LFxuICAgICAgICAgICAgICAgICAgICB5OiB+figoaW5kZXggLSAxKSAvIDgpLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFg6IDAsXG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0WTogMCxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmRleCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLkRhc2hEaWFtb25kKHggKyBVIC8gMiwgeSArIFUgLyAyLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zcGF3blBvaW50cy5wdXNoKHt4OiB4LCB5OiB5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc1VwKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc0Rvd24oeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCh4LCB5LCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjA6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5IYXphcmQoeCwgeSwgVSwgVSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3RyYXdiZXJyeSh4ICsgVSAvIDIsIHkgKyBVIC8gMiwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDU3OlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuQ3J1bWJsaW5nQmxvY2soeCwgeSwgdGlsZURhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDUwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUyOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3ByaW5nKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuZTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53aWR0aCAtIGNvbnN0YW50cy5WSUVXX1dJRFRILFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYIDwgLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVpZ2h0IC0gY29uc3RhbnRzLlZJRVdfSEVJR0hULFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA8IC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zaG91bGRSZXNldCkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5yZXNldCgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXdIVUQoY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZmZmZmZhYVwiO1xuICAgICAgICBjdHguZmlsbFJlY3QoMSwgMSwgNDIsIDEwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJyaWdodFwiO1xuICAgICAgICBjdHguZm9udCA9ICdub3JtYWwgNnB4IGdhbWVib3knO1xuICAgICAgICBjdHguZmlsbFRleHQoYCR7dGhpcy5wbGF5ZXIuc3RyYXdiZXJyaWVzLnNpemUgKyB0aGlzLnBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuc2l6ZX0vMTVgLCA0MCwgOCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UocGh5c2ljcy50aWxlc2V0LCA4MCwgMTYsIDE2LCAxNiwgMiwgMiwgOCwgOCk7XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWN0b3IocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmFkZCh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5kZWxldGUodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2NlbmUsXG59XG4iLCJjb25zdCBqdW1wU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2p1bXAub2dnJyk7XG5jb25zdCBkYXNoU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2Rhc2hfcGlua19sZWZ0Lm9nZycpO1xuY29uc3QgZGllU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2RlYXRoLm9nZycpO1xuY29uc3QgY3J1bWJsaW5nQmxvY2tTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fZmFsbGJsb2NrX3NoYWtlLm9nZycpO1xuY29uc3Qgc3RyYXdiZXJyeVNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zdHJhd2JlcnJ5X3JlZF9nZXRfMXVwLm9nZycpO1xuY29uc3QgZGFzaERpYW1vbmRTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fZGlhbW9uZF90b3VjaF8wMS5vZ2cnKTtcbmNvbnN0IHNwcmluZ1NvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zcHJpbmcub2dnJyk7XG5sZXQgc291bmRPbiA9IHRydWU7XG5cblxuZnVuY3Rpb24gdG9nZ2xlU291bmQoKSB7XG4gICAgc291bmRPbiA9ICFzb3VuZE9uO1xuICAgIHJldHVybiBzb3VuZE9uO1xufVxuXG5cbmZ1bmN0aW9uIHBsYXlTb3VuZChzb3VuZCkge1xuICAgIGlmIChzb3VuZE9uKSB7XG4gICAgICAgIHNvdW5kLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgc291bmQucGxheSgpO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwbGF5U291bmQsXG4gICAgdG9nZ2xlU291bmQsXG4gICAganVtcFNvdW5kLFxuICAgIGRhc2hTb3VuZCxcbiAgICBkaWVTb3VuZCxcbiAgICBjcnVtYmxpbmdCbG9ja1NvdW5kLFxuICAgIHN0cmF3YmVycnlTb3VuZCxcbiAgICBkYXNoRGlhbW9uZFNvdW5kLFxuICAgIHNwcmluZ1NvdW5kLFxufSJdfQ==
