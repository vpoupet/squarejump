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


const loadScenes = new Promise(resolve => {
    const nbScenes = 37;
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
        scenes.CELESTE_04.addSolid(makeTriggerBlock(14, 10, 23, 9, 3, 2));

        // CELESTE_06
        scenes.CELESTE_06.addSolid(makeTriggerBlock(13, 33, 13, 23, 4, 2));

        // CELESTE_08
        scenes.CELESTE_08.addSolid(makeTriggerBlock(14, 16, 21, 12, 2, 3));

        // CELESTE_14
        scenes.CELESTE_14.addSolid(makeTriggerBlock(11, 29, 19, 29, 4, 2));
        scenes.CELESTE_14.addSolid(makeTriggerBlock(26, 28, 26, 22, 5, 2));

        // CELESTE_15
        {
            const triggerBlock = makeTriggerBlock(24, 6, 24, 17, 2, 6);
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U);
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addThing(spikes1);
            scenes.CELESTE_15.addThing(spikes2);

            scenes.CELESTE_15.addSolid(makeTriggerBlock(15, 20, 9, 20, 2, 4));
        }

        // CELESTE_19
        scenes.CELESTE_19.addSolid(makeTriggerBlock(20, 15, 20, 7, 2, 4));
        scenes.CELESTE_19.addSolid(makeFallingBlock(28, 9, 28, 35, 3, 2));

        // CELESTE_21
        {
            // const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75, .5);
            const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75);
            const spikes1 = new physics.SpikesUp(14 * U, 6 * U);
            const spikes2 = new physics.SpikesUp(15 * U, 6 * U);
            fallingBlock.attach(spikes1);
            fallingBlock.attach(spikes2);
            scenes.CELESTE_21.addSolid(fallingBlock);
            scenes.CELESTE_21.addThing(spikes1);
            scenes.CELESTE_21.addThing(spikes2);
        }

        // CELESTE_22
        {
            scenes.CELESTE_22.addSolid(makeTriggerBlock(33, 15, 33, 9, 3, 3));

            const triggerBlock = makeTriggerBlock(25, 6, 13, 6, 2, 3);
            const spikes1 = new physics.SpikesUp(25 * U, 5 * U);
            const spikes2 = new physics.SpikesUp(26 * U, 5 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_22.addSolid(triggerBlock);
            scenes.CELESTE_22.addThing(spikes1);
            scenes.CELESTE_22.addThing(spikes2);
        }

        // CELESTE_23
        scenes.CELESTE_23.addSolid(makeTriggerBlock(22, 18, 22, 9, 2, 2));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(29, 19, 29, 10, 2, 2));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(36, 17, 36, 8, 2, 2));

        // CELESTE_24
        scenes.CELESTE_24.addSolid(makeTriggerBlock(17, 18, 17, 12, 4, 2));
        scenes.CELESTE_24.addSolid(makeTriggerBlock(28, 19, 28, 12, 6, 2));

        // CELESTE_25
        {
            const fallingBlock1 = makeFallingBlock(19, 16, 19, 25, 4, 3);
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
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock1);

            const fallingBlock2 = makeFallingBlock(23, 6, 23, 25, 2, 4);
            const spikes2 = [
                new physics.SpikesLeft(22 * U, 7 * U),
                new physics.SpikesLeft(22 * U, 8 * U),
            ];
            for (const spike of spikes2) {
                fallingBlock2.attach(spike);
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock2);
        }

        // CELESTE_26
        {
            const triggerBlock = makeTriggerBlock(9, 9, 26, 9, 3, 5, 35);
            const spikes = [
                new physics.SpikesUp(9 * U, 8 * U),
                new physics.SpikesUp(10 * U, 8 * U),
                new physics.SpikesUp(11 * U, 8 * U),
            ]
            for (const spike of spikes) {
                triggerBlock.attach(spike);
                scenes.CELESTE_26.addThing(spike);
            }
            scenes.CELESTE_26.addSolid(triggerBlock);
        }

        // CELESTE_27
        {
            const triggerBlock = makeTriggerBlock(2, 9, 10, 9, 3, 4, 35);
            const spikes1 = new physics.SpikesUp(2 * U, 8 * U);
            const spikes2 = new physics.SpikesUp(3 * U, 8 * U);
            const spikes3 = new physics.SpikesUp(4 * U, 8 * U);
            scenes.CELESTE_27.addSolid(triggerBlock);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            triggerBlock.attach(spikes3);
            scenes.CELESTE_27.addThing(spikes1);
            scenes.CELESTE_27.addThing(spikes2);
            scenes.CELESTE_27.addThing(spikes3);
        }

        // CELESTE_28
        scenes.CELESTE_28.addSolid(makeTriggerBlock(16, 25, 16, 19, 6, 2));

        // CELESTE_31
        scenes.CELESTE_31.addSolid(makeTriggerBlock(4, 20, 12, 20, 4, 2, 30));

        // CELESTE_33
        {
            scenes.CELESTE_33.addSolid(makeTriggerBlock(1, 22, 8, 22, 3, 3, 30));
            const triggerBlock = makeTriggerBlock(48, 15, 48, 7, 2, 4);
            scenes.CELESTE_33.addSolid(triggerBlock);
            const spikes1 = new physics.SpikesUp(48 * U, 14 * U);
            const spikes2 = new physics.SpikesUp(49 * U, 14 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_33.addThing(spikes1);
            scenes.CELESTE_33.addThing(spikes2);
        }

        // CELESTE_34
        {
            const fallingBlock = makeFallingBlock(23, 8, 23, 23, 3, 4);
            scenes.CELESTE_34.addSolid(fallingBlock);
            const spikes = [
                new physics.SpikesUp(23 * U, 7 * U),
                new physics.SpikesUp(24 * U, 7 * U),
                new physics.SpikesUp(25 * U, 7 * U),
            ];
            for (const spike of spikes) {
                fallingBlock.attach(spike);
                scenes.CELESTE_34.addThing(spike);
            }
            scenes.CELESTE_34.addSolid(makeFallingBlock(11, 16, 11, 25, 2, 3));
            scenes.CELESTE_34.addSolid(makeFallingBlock(14, 3, 14, 22, 3, 5));
        }

        // CELESTE_36
        {
            const triggerBlock1 = makeTriggerBlock(2, 26, 9, 26, 2, 3, 30);
            scenes.CELESTE_36.addSolid(triggerBlock1);
            const spikes1 = [
                new physics.SpikesUp(2 * U, 25 * U),
                new physics.SpikesUp(3 * U, 25 * U),
            ];
            for (const spike of spikes1) {
                triggerBlock1.attach(spike);
                scenes.CELESTE_36.addThing(spike);
            }

            const triggerBlock2 = makeTriggerBlock(35, 23, 35, 15, 3, 4);
            scenes.CELESTE_36.addSolid(triggerBlock2);
            const spikes2 = [
                new physics.SpikesUp(35 * U, 22 * U),
                new physics.SpikesUp(36 * U, 22 * U),
                new physics.SpikesUp(37 * U, 22 * U),
            ];
            for (const spike of spikes2) {
                triggerBlock2.attach(spike);
                scenes.CELESTE_36.addThing(spike);
            }
        }

        // LOUIS_06
        // scenes.LOUIS_06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.LOUIS_08, U, 13 * U, 0));
        // scenes.LOUIS_08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.LOUIS_06, 10 * U, 15 * U, 1));

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
        makeTransitionRight(scenes.CELESTE_26, 3, 0, scenes.CELESTE_27, 16, 3, 3);
        makeTransitionUp(scenes.CELESTE_27, 2, 1, scenes.CELESTE_28, 28, 2, 5);
        makeTransitionRight(scenes.CELESTE_29, 13, 1, scenes.CELESTE_28, 18, 1, 5);
        makeTransitionRight(scenes.CELESTE_30, 6, 0, scenes.CELESTE_29, 6, 0, 3);
        makeTransitionRight(scenes.CELESTE_27, 6, 2, scenes.CELESTE_31, 6, 0, 2);
        makeTransitionUp(scenes.CELESTE_27, 31, 0, scenes.CELESTE_32, 17, 1, 3);
        makeTransitionUp(scenes.CELESTE_28, 5, 0, scenes.CELESTE_33, 5, 1, 3);
        makeTransitionUp(scenes.CELESTE_28, 28, 2, scenes.CELESTE_33, 28, 2, 3);
        makeTransitionUp(scenes.CELESTE_32, 4, 0, scenes.CELESTE_33, 44, 3, 3);
        makeTransitionUp(scenes.CELESTE_33, 10, 0, scenes.CELESTE_34, 3, 2, 3);
        makeTransitionRight(scenes.CELESTE_35, 13, 0, scenes.CELESTE_34, 3, 0, 3);
        makeTransitionRight(scenes.CELESTE_34, 15, 1, scenes.CELESTE_36, 29, 1, 9);
        makeTransitionUp(scenes.CELESTE_36, 8, 0, scenes.CELESTE_37, 6, 0, 3);

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
        super(x, y, U, U, new TileData(21));
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
        super(x, y, U, U, new TileData(13));
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
        super(x, y, U, U, new TileData(57));
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
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, new TileData(40, 0, -U / 2));
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
        super(x, y, U, U / 2, new TileData(42));
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
        super(x, y, U / 2, U, new TileData(41));
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
        super(x + U / 2, y, U / 2, U, new TileData(43, -U / 2, 0));
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
        ctx.fillText(`${this.player.strawberries.size + this.player.temporaryStrawberries.size}/20`, 40, 8);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImVmZmVjdC5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwicGh5c2ljcy5qcyIsInBsYXllci5qcyIsInNjZW5lLmpzIiwic291bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfVVBfU1BFRUQgPSA0NTtcbmNvbnN0IENMSU1CX1NMSVBfU1BFRUQgPSAzMDtcbmNvbnN0IFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSA9IDM7XG5jb25zdCBXQUxMX0pVTVBfSFNQRUVEID0gTUFYX1JVTl9TUEVFRCArIEpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbmNvbnN0IERBU0hfU1BFRUQgPSAyNDA7XG5jb25zdCBFTkRfREFTSF9TUEVFRCA9IDE2MDtcbmNvbnN0IEVORF9EQVNIX1VQX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfVElNRSA9IC4xNTtcbmNvbnN0IERBU0hfQ09PTERPV04gPSAuMjtcblxuLy8gT3RoZXIgY29uc3RhbnRzXG5jb25zdCBNT01FTlRVTV9TVE9SRV9USU1FID0gLjE7XG5jb25zdCBNT01FTlRVTV9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX0ZSRUVaRV9USU1FID0gLjA1O1xuY29uc3QgQk9VTkNFX1RJTUUgPSAuMjtcbmNvbnN0IEJPVU5DRV9TUEVFRCA9IDE5MDtcbmNvbnN0IERZSU5HX1RJTUUgPSAuODtcbmNvbnN0IFNUQVRFX05PUk1BTCA9IDA7XG5jb25zdCBTVEFURV9KVU1QID0gMTtcbmNvbnN0IFNUQVRFX0RBU0ggPSAyO1xuY29uc3QgU1RBVEVfREVBRCA9IDM7XG5jb25zdCBTVEFURV9CT1VOQ0UgPSA0O1xuXG5jb25zdCBHUklEX1NJWkUgPSA4O1xuY29uc3QgVklFV19XSURUSCA9IDMyMDtcbmNvbnN0IFZJRVdfSEVJR0hUID0gMTgwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNQVhfUlVOX1NQRUVELFxuICAgIFJVTl9BQ0NFTEVSQVRJT04sXG4gICAgUlVOX0RFQ0VMRVJBVElPTixcbiAgICBBSVJfRkFDVE9SLFxuICAgIEpVTVBfU1BFRUQsXG4gICAgSlVNUF9IT1JJWk9OVEFMX0JPT1NULFxuICAgIE1BWF9GQUxMX1NQRUVELFxuICAgIEdSQVZJVFksXG4gICAgSlVNUF9HUkFDRV9USU1FLFxuICAgIFZBUl9KVU1QX1RJTUUsXG4gICAgQ0xJTUJfVVBfU1BFRUQsXG4gICAgQ0xJTUJfU0xJUF9TUEVFRCxcbiAgICBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UsXG4gICAgV0FMTF9KVU1QX0hTUEVFRCxcbiAgICBEQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1NQRUVELFxuICAgIEVORF9EQVNIX1VQX0ZBQ1RPUixcbiAgICBEQVNIX1RJTUUsXG4gICAgREFTSF9DT09MRE9XTixcbiAgICBNT01FTlRVTV9TVE9SRV9USU1FLFxuICAgIE1PTUVOVFVNX0ZBQ1RPUixcbiAgICBEQVNIX0ZSRUVaRV9USU1FLFxuICAgIEJPVU5DRV9USU1FLFxuICAgIEJPVU5DRV9TUEVFRCxcbiAgICBEWUlOR19USU1FLFxuICAgIFNUQVRFX05PUk1BTCxcbiAgICBTVEFURV9KVU1QLFxuICAgIFNUQVRFX0RBU0gsXG4gICAgU1RBVEVfREVBRCxcbiAgICBTVEFURV9CT1VOQ0UsXG4gICAgR1JJRF9TSVpFLFxuICAgIFZJRVdfV0lEVEgsXG4gICAgVklFV19IRUlHSFQsXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuY2xhc3MgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgRWZmZWN0U2VxdWVuY2UgZXh0ZW5kcyBFZmZlY3Qge1xuICAgIGNvbnN0cnVjdG9yKGVmZmVjdHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5lZmZlY3RzID0gZWZmZWN0cztcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgZWxlbWVudCkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5lZmZlY3RzW3RoaXMuaW5kZXhdLmR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5lZmZlY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVmZmVjdHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICBzdXBlci5yZXNldCgpO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgdGhpcy5lZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QucmVzZXQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIEVmZmVjdCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIsIHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2luZU1vdmVtZW50IGV4dGVuZHMgRWZmZWN0IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCBlbGVtZW50KSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIGVsZW1lbnQpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gdGhpcy50aW1lciAqIDIgKiBNYXRoLlBJIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhdGlvID0gKE1hdGguY29zKGFuZ2xlKSArIDEpIC8gMjtcbiAgICAgICAgICAgIGNvbnN0IGRyYXRpbyA9IE1hdGguUEkgKiBNYXRoLnNpbihhbmdsZSkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgZWxlbWVudC5tb3ZlVG8oXG4gICAgICAgICAgICAgICAgcmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLFxuICAgICAgICAgICAgICAgIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55MixcbiAgICAgICAgICAgICAgICBkcmF0aW8gKiAodGhpcy54MiAtIHRoaXMueDEpLFxuICAgICAgICAgICAgICAgIGRyYXRpbyAqICh0aGlzLnkyIC0gdGhpcy55MSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBFZmZlY3QsXG4gICAgRWZmZWN0U2VxdWVuY2UsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xubGV0IHByZXNzZWRCdXR0b25zID0gbmV3IFNldCgpO1xubGV0IGdhbWVwYWRQcmVzc2VkQnV0dG9ucyA9IFtdO1xuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmdhbWVwYWRJbmRleCA9IDA7XG4gICAgICAgIHRoaXMuZ2FtZXBhZG1hcCA9IHtcbiAgICAgICAgICAgIGp1bXA6IDAsXG4gICAgICAgICAgICBkYXNoOiAxLFxuICAgICAgICAgICAgdXA6IDEyLFxuICAgICAgICAgICAgZG93bjogMTMsXG4gICAgICAgICAgICBsZWZ0OiAxNCxcbiAgICAgICAgICAgIHJpZ2h0OiAxNSxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmtleW1hcCA9IHtcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHVwOiAnQXJyb3dVcCcsXG4gICAgICAgICAgICBkb3duOiAnQXJyb3dEb3duJyxcbiAgICAgICAgICAgIGp1bXA6ICdnJyxcbiAgICAgICAgICAgIGRhc2g6ICdmJyxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpbWVycyA9IHtcbiAgICAgICAgICAgIGp1bXBCdWZmZXI6IDAsXG4gICAgICAgICAgICBkYXNoQnVmZmVyOiAwLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHVwZGF0ZUdhbWVwYWQoKSB7XG4gICAgICAgIHByZXNzZWRCdXR0b25zLmNsZWFyKCk7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIGlmIChnYW1lcGFkKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGdhbWVwYWQuYnV0dG9uczsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdhbWVwYWQuYnV0dG9uc1tqXS5wcmVzc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXNzZWRCdXR0b25zLmFkZChqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGNvbnN0IGdhbWVwYWQgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKVt0aGlzLmdhbWVwYWRJbmRleF07XG4gICAgICAgIC8vIHRoaXMudXBkYXRlR2FtZXBhZCgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcC5sZWZ0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5sZWZ0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdIDwgLS4yKSkge1xuICAgICAgICAgICAgdGhpcy54QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAucmlnaHQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLnJpZ2h0XS5wcmVzc2VkKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5heGVzWzBdID4gLjIpKXtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYXhlc1sxXSA8IC0uMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmF4ZXNbMV0gPiAuMikpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmV2SnVtcCA9IHRoaXMuanVtcEhlbGQ7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuanVtcCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuanVtcF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkp1bXAgJiYgdGhpcy5qdW1wSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgJj0gdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA+IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2RGFzaCA9IHRoaXMuZGFzaEhlbGQ7XG4gICAgICAgIHRoaXMuZGFzaEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAuZGFzaCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAuZGFzaF0ucHJlc3NlZCk7XG4gICAgICAgIGlmICghcHJldkRhc2ggJiYgdGhpcy5kYXNoSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA+IDApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgZ2FtZXBhZFByZXNzZWRCdXR0b25zLFxuICAgIHByZXNzZWRLZXlzLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcblxuY29uc3QgU0NBTElORyA9IDM7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5jb25zdCBjb250ZXh0TGF5ZXIgPSB7fTtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5sZXQgc2Nyb2xsWCA9IDA7XG5sZXQgc2Nyb2xsWSA9IDA7XG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHRMYXllci5zY2VuZS50cmFuc2xhdGUoc2Nyb2xsWCAtIHgsIHNjcm9sbFkgLSB5KTtcbiAgICBzY3JvbGxYID0geDtcbiAgICBzY3JvbGxZID0geTtcbn1cblxuXG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpc1J1bm5pbmcgPSB0cnVlO1xuICAgIHVwZGF0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaXNSdW5uaW5nID0gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGNvbnN0IHRpbWVOb3cgPSBEYXRlLm5vdygpO1xuXG4gICAgaWYgKGlzUnVubmluZykge1xuICAgICAgICBzbG93ZG93bkNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHNsb3dkb3duQ291bnRlciA+PSBTTE9XRE9XTl9GQUNUT1IpIHtcbiAgICAgICAgICAgIHNsb3dkb3duQ291bnRlciAtPSBTTE9XRE9XTl9GQUNUT1I7XG4gICAgICAgICAgICBmcmFtZUNvdW50ZXIgKz0gMTtcblxuICAgICAgICAgICAgaWYgKHRpbWVOb3cgLSBmcmFtZVJhdGVTdGFydFRpbWUgPj0gMTAwMCAqIGZyYW1lUmF0ZVJlZnJlc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtmcmFtZUNvdW50ZXIgLyBmcmFtZVJhdGVSZWZyZXNofSBGUFNgKTtcbiAgICAgICAgICAgICAgICBmcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICAgICAgICAgIGZyYW1lUmF0ZVN0YXJ0VGltZSA9IHRpbWVOb3c7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkZWx0YVRpbWUgPSBGSVhFRF9ERUxUQV9USU1FID9cbiAgICAgICAgICAgICAgICAxIC8gRlJBTUVfUkFURSA6XG4gICAgICAgICAgICAgICAgTWF0aC5taW4oKHRpbWVOb3cgLSBsYXN0VXBkYXRlKSAvICgxMDAwICogU0xPV0RPV05fRkFDVE9SKSwgLjA1KTtcblxuICAgICAgICAgICAgY3VycmVudFNjZW5lLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuXG4gICAgICAgICAgICBsZXQgY29udGV4dDtcbiAgICAgICAgICAgIC8vIGNsZWFyIGFuZCByZWRyYXcgb24gc2NlbmUgY2FudmFzXG4gICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dExheWVyLnNjZW5lO1xuICAgICAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBjb250ZXh0LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcbiAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIGNvbnRleHQuY2FudmFzLndpZHRoLCBjb250ZXh0LmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuZHJhdyhjb250ZXh0KTtcblxuICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRMYXllci5odWQ7XG4gICAgICAgICAgICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCBjb250ZXh0LmNhbnZhcy53aWR0aCAvIFNDQUxJTkcsIGNvbnRleHQuY2FudmFzLmhlaWdodCAvIFNDQUxJTkcpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXdIVUQoY29udGV4dCk7XG5cbiAgICAgICAgICAgIGxhc3RVcGRhdGUgPSB0aW1lTm93O1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuICAgIH1cbn1cblxud2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBrZXlib2FyZCBldmVudHNcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZSA9PiB7XG4gICAgICAgIGlucHV0cy5wcmVzc2VkS2V5cy5hZGQoZS5rZXkpO1xuICAgICAgICBzd2l0Y2ggKGUua2V5KSB7XG4gICAgICAgICAgICBjYXNlICd3JzpcbiAgICAgICAgICAgICAgICBpZiAoU0xPV0RPV05fRkFDVE9SID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHNsb3dkb3duKDgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNsb3dkb3duKDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZSA9PiB7XG4gICAgICAgIGlucHV0cy5wcmVzc2VkS2V5cy5kZWxldGUoZS5rZXkpO1xuICAgIH0pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic291bmQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdG9nZ2xlU291bmQpO1xuXG4gICAgLy8gcHJlcGFyZSBjYW52YXMgYW5kIGNvbnRleHRcbiAgICBjb25zdCBzY3JlZW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1zY3JlZW4nKTtcbiAgICBzY3JlZW4uc3R5bGUud2lkdGggPSBgJHtjb25zdGFudHMuVklFV19XSURUSCAqIFNDQUxJTkd9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBTQ0FMSU5HfXB4YDtcblxuICAgIGZvciAoY29uc3QgY2FudmFzIG9mIHNjcmVlbi5nZXRFbGVtZW50c0J5VGFnTmFtZShcImNhbnZhc1wiKSkge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHRMYXllcltjYW52YXMuaWRdID0gY29udGV4dDtcbiAgICAgICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVDtcbiAgICAgICAgY29udGV4dC5zY2FsZShTQ0FMSU5HLCBTQ0FMSU5HKTtcbiAgICAgICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBsb2FkIGFsbCBzY2VuZXMgYW5kIHN0YXJ0IGdhbWVcbiAgICBwbGF5ZXIubG9hZEFsbFNwcml0ZXMudGhlbigoKSA9PiB7XG4gICAgICAgIG1hcHMubG9hZFNjZW5lcy50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIC8vIGxvYWQgc3RhcnRpbmcgc2NlbmVcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZSA9IG1hcHMuc2NlbmVzLkNFTEVTVEVfMDE7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuc3Bhd25Qb2ludEluZGV4ID0gMTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoKSk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUucmVzZXQoKTtcbiAgICAgICAgICAgIHN0YXJ0KCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59O1xuXG5cbmZ1bmN0aW9uIHRvZ2dsZVNvdW5kKCkge1xuICAgIGlmIChzb3VuZC50b2dnbGVTb3VuZCgpKSB7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic291bmQtYnV0dG9uXCIpLmlubmVyVGV4dCA9IFwiU291bmQgT25cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNvdW5kLWJ1dHRvblwiKS5pbm5lclRleHQgPSBcIlNvdW5kIE9mZlwiO1xuICAgIH1cbn1cblxuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBlZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5jb25zdCBzY2VuZXMgPSB7fTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIGluZGV4MSwgc2NlbmUyLCB4MiwgaW5kZXgyLCB3aWR0aCkge1xuICAgIHNjZW5lMS5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKHgxICogVSwgLVUsIHdpZHRoICogVSwgMCwgc2NlbmUyLCB4MiAqIFUsIHNjZW5lMi5oZWlnaHQgLSAzICogVSwgaW5kZXgyKSk7XG4gICAgc2NlbmUyLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oeDIgKiBVLCBzY2VuZTIuaGVpZ2h0LCB3aWR0aCAqIFUsIDAsIHNjZW5lMSwgeDEgKiBVLCAyICogVSwgaW5kZXgxKSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHkxLCBpbmRleDEsIHNjZW5lMiwgeTIsIGluZGV4MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oc2NlbmUxLndpZHRoLCB5MSAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMiwgVSwgeTIgKiBVLCBpbmRleDIpKTtcbiAgICBzY2VuZTIuYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgc2NlbmUxLndpZHRoIC0gVSwgeTEgKiBVLCBpbmRleDEpKTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlVHJpZ2dlckJsb2NrKHgxLCB5MSwgeDIsIHkyLCB3aWR0aCwgaGVpZ2h0LCBzcGVlZCA9IDIwLCBkZWxheSA9IC4yNSkge1xuICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KCh4MiAtIHgxKSAqICh4MiAtIHgxKSArICh5MiAtIHkxKSAqICh5MiAtIHkxKSk7XG4gICAgY29uc3QgZHVyYXRpb24xID0gZGlzdGFuY2UgLyBzcGVlZDtcbiAgICBjb25zdCBkdXJhdGlvbjIgPSBkaXN0YW5jZSAvIDc7XG4gICAgcmV0dXJuIG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jayh4MSAqIFUsIHkxICogVSwgd2lkdGggKiBVLCBoZWlnaHQgKiBVLCBkZWxheSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDEgKiBVLCB5MSAqIFUsIHgyICogVSwgeTIgKiBVLCBkdXJhdGlvbjEpLFxuICAgICAgICBuZXcgZWZmZWN0LkVmZmVjdCgxKSxcbiAgICAgICAgbmV3IGVmZmVjdC5MaW5lYXJNb3ZlbWVudCh4MiAqIFUsIHkyICogVSwgeDEgKiBVLCB5MSAqIFUsIGR1cmF0aW9uMiksXG4gICAgXSkpO1xufVxuXG5mdW5jdGlvbiBtYWtlRmFsbGluZ0Jsb2NrKHgxLCB5MSwgeDIsIHkyLCB3aWR0aCwgaGVpZ2h0LCBkZWxheSA9IC41KSB7XG4gICAgcmV0dXJuIG5ldyBwaHlzaWNzLkZhbGxpbmdCbG9jayh4MSAqIFUsIHkxICogVSwgd2lkdGggKiBVLCBoZWlnaHQgKiBVLCBkZWxheSwgbmV3IGVmZmVjdC5FZmZlY3RTZXF1ZW5jZShbXG4gICAgICAgIG5ldyBlZmZlY3QuTGluZWFyTW92ZW1lbnQoeDEgKiBVLCB5MSAqIFUsIHgyICogVSwgeTIgKiBVLCAoeTIgLSB5MSkgLyAyNSksXG4gICAgICAgIG5ldyBlZmZlY3QuRWZmZWN0KDEsIC0xKSxcbiAgICBdKSk7XG59XG5cblxuY29uc3QgbG9hZFNjZW5lcyA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIGNvbnN0IG5iU2NlbmVzID0gMzc7XG4gICAgY29uc3Qgc2NlbmVQcm9taXNlcyA9IFtdO1xuICAgIGNvbnN0IHNjZW5lTmFtZXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBuYlNjZW5lczsgaSsrKSB7XG4gICAgICAgIGNvbnN0IG51bSA9IGkgPCAxMCA/ICcwJyArIGkgOiAnJyArIGk7XG4gICAgICAgIHNjZW5lUHJvbWlzZXMucHVzaChmZXRjaChgdGlsZW1hcHMvY2VsZXN0ZSR7bnVtfS5qc29uYCkudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpKTtcbiAgICAgICAgc2NlbmVOYW1lcy5wdXNoKGBDRUxFU1RFXyR7bnVtfWApO1xuICAgIH1cblxuICAgIFByb21pc2UuYWxsKHNjZW5lUHJvbWlzZXMpLnRoZW4ocmVzcG9uc2VzID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuYlNjZW5lczsgaSsrKSB7XG4gICAgICAgICAgICBzY2VuZXNbc2NlbmVOYW1lc1tpXV0gPSBzY2VuZS5TY2VuZS5mcm9tSlNPTihyZXNwb25zZXNbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8wNFxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8wNC5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE0LCAxMCwgMjMsIDksIDMsIDIpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzA2XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzA2LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTMsIDMzLCAxMywgMjMsIDQsIDIpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzA4XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzA4LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTQsIDE2LCAyMSwgMTIsIDIsIDMpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzE0XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzE0LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMTEsIDI5LCAxOSwgMjksIDQsIDIpKTtcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTQuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyNiwgMjgsIDI2LCAyMiwgNSwgMikpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMTVcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jaygyNCwgNiwgMjQsIDE3LCAyLCA2KTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDUgKiBVKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczIgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDUgKiBVKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuXG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8xNS5hZGRUaGluZyhzcGlrZXMyKTtcblxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMTUuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNSwgMjAsIDksIDIwLCAyLCA0KSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDRUxFU1RFXzE5XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzE5LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjAsIDE1LCAyMCwgNywgMiwgNCkpO1xuICAgICAgICBzY2VuZXMuQ0VMRVNURV8xOS5hZGRTb2xpZChtYWtlRmFsbGluZ0Jsb2NrKDI4LCA5LCAyOCwgMzUsIDMsIDIpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzIxXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIGNvbnN0IGZhbGxpbmdCbG9jayA9IG1ha2VGYWxsaW5nQmxvY2soMTQsIDcsIDE0LCAxNSwgMiwgNywgLjc1LCAuNSk7XG4gICAgICAgICAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDE0LCA3LCAxNCwgMTUsIDIsIDcsIC43NSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMxID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTQgKiBVLCA2ICogVSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMTUgKiBVLCA2ICogVSk7XG4gICAgICAgICAgICBmYWxsaW5nQmxvY2suYXR0YWNoKHNwaWtlczEpO1xuICAgICAgICAgICAgZmFsbGluZ0Jsb2NrLmF0dGFjaChzcGlrZXMyKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIxLmFkZFNvbGlkKGZhbGxpbmdCbG9jayk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMS5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzIxLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8yMlxuICAgICAgICB7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMi5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDMzLCAxNSwgMzMsIDksIDMsIDMpKTtcblxuICAgICAgICAgICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jaygyNSwgNiwgMTMsIDYsIDIsIDMpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI1ICogVSwgNSAqIFUpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMiA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDI2ICogVSwgNSAqIFUpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMi5hZGRTb2xpZCh0cmlnZ2VyQmxvY2spO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjIuYWRkVGhpbmcoc3Bpa2VzMSk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yMi5hZGRUaGluZyhzcGlrZXMyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENFTEVTVEVfMjNcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygyMiwgMTgsIDIyLCA5LCAyLCAyKSk7XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzIzLmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjksIDE5LCAyOSwgMTAsIDIsIDIpKTtcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygzNiwgMTcsIDM2LCA4LCAyLCAyKSk7XG5cbiAgICAgICAgLy8gQ0VMRVNURV8yNFxuICAgICAgICBzY2VuZXMuQ0VMRVNURV8yNC5hZGRTb2xpZChtYWtlVHJpZ2dlckJsb2NrKDE3LCAxOCwgMTcsIDEyLCA0LCAyKSk7XG4gICAgICAgIHNjZW5lcy5DRUxFU1RFXzI0LmFkZFNvbGlkKG1ha2VUcmlnZ2VyQmxvY2soMjgsIDE5LCAyOCwgMTIsIDYsIDIpKTtcblxuICAgICAgICAvLyBDRUxFU1RFXzI1XG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IGZhbGxpbmdCbG9jazEgPSBtYWtlRmFsbGluZ0Jsb2NrKDE5LCAxNiwgMTksIDI1LCA0LCAzKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoMjMgKiBVLCAxNyAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1JpZ2h0KDIzICogVSwgMTggKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDE5ICogVSwgMTkgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIwICogVSwgMTkgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIxICogVSwgMTkgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNEb3duKDIyICogVSwgMTkgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgICAgICAgICBmYWxsaW5nQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjUuYWRkVGhpbmcoc3Bpa2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjUuYWRkU29saWQoZmFsbGluZ0Jsb2NrMSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGZhbGxpbmdCbG9jazIgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA2LCAyMywgMjUsIDIsIDQpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMiA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNMZWZ0KDIyICogVSwgNyAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc0xlZnQoMjIgKiBVLCA4ICogVSksXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMyKSB7XG4gICAgICAgICAgICAgICAgZmFsbGluZ0Jsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI1LmFkZFRoaW5nKHNwaWtlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI1LmFkZFNvbGlkKGZhbGxpbmdCbG9jazIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8yNlxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDksIDksIDI2LCA5LCAzLCA1LCAzNSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoOSAqIFUsIDggKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMCAqIFUsIDggKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgxMSAqIFUsIDggKiBVKSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3Bpa2Ugb2Ygc3Bpa2VzKSB7XG4gICAgICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZSk7XG4gICAgICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjYuYWRkVGhpbmcoc3Bpa2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjYuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENFTEVTVEVfMjdcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgdHJpZ2dlckJsb2NrID0gbWFrZVRyaWdnZXJCbG9jaygyLCA5LCAxMCwgOSwgMywgNCwgMzUpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IG5ldyBwaHlzaWNzLlNwaWtlc1VwKDIgKiBVLCA4ICogVSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMyAqIFUsIDggKiBVKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczMgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0ICogVSwgOCAqIFUpO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjcuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMSk7XG4gICAgICAgICAgICB0cmlnZ2VyQmxvY2suYXR0YWNoKHNwaWtlczIpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMzKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzI3LmFkZFRoaW5nKHNwaWtlczEpO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjcuYWRkVGhpbmcoc3Bpa2VzMik7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8yNy5hZGRUaGluZyhzcGlrZXMzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENFTEVTVEVfMjhcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMjguYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxNiwgMjUsIDE2LCAxOSwgNiwgMikpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMzFcbiAgICAgICAgc2NlbmVzLkNFTEVTVEVfMzEuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jayg0LCAyMCwgMTIsIDIwLCA0LCAyLCAzMCkpO1xuXG4gICAgICAgIC8vIENFTEVTVEVfMzNcbiAgICAgICAge1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMzMuYWRkU29saWQobWFrZVRyaWdnZXJCbG9jaygxLCAyMiwgOCwgMjIsIDMsIDMsIDMwKSk7XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sgPSBtYWtlVHJpZ2dlckJsb2NrKDQ4LCAxNSwgNDgsIDcsIDIsIDQpO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMzMuYWRkU29saWQodHJpZ2dlckJsb2NrKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczEgPSBuZXcgcGh5c2ljcy5TcGlrZXNVcCg0OCAqIFUsIDE0ICogVSk7XG4gICAgICAgICAgICBjb25zdCBzcGlrZXMyID0gbmV3IHBoeXNpY3MuU3Bpa2VzVXAoNDkgKiBVLCAxNCAqIFUpO1xuICAgICAgICAgICAgdHJpZ2dlckJsb2NrLmF0dGFjaChzcGlrZXMxKTtcbiAgICAgICAgICAgIHRyaWdnZXJCbG9jay5hdHRhY2goc3Bpa2VzMik7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8zMy5hZGRUaGluZyhzcGlrZXMxKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzMzLmFkZFRoaW5nKHNwaWtlczIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8zNFxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBmYWxsaW5nQmxvY2sgPSBtYWtlRmFsbGluZ0Jsb2NrKDIzLCA4LCAyMywgMjMsIDMsIDQpO1xuICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMzQuYWRkU29saWQoZmFsbGluZ0Jsb2NrKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlcyA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyMyAqIFUsIDcgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNCAqIFUsIDcgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyNSAqIFUsIDcgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlcykge1xuICAgICAgICAgICAgICAgIGZhbGxpbmdCbG9jay5hdHRhY2goc3Bpa2UpO1xuICAgICAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzM0LmFkZFRoaW5nKHNwaWtlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzM0LmFkZFNvbGlkKG1ha2VGYWxsaW5nQmxvY2soMTEsIDE2LCAxMSwgMjUsIDIsIDMpKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzM0LmFkZFNvbGlkKG1ha2VGYWxsaW5nQmxvY2soMTQsIDMsIDE0LCAyMiwgMywgNSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ0VMRVNURV8zNlxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2sxID0gbWFrZVRyaWdnZXJCbG9jaygyLCAyNiwgOSwgMjYsIDIsIDMsIDMwKTtcbiAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzM2LmFkZFNvbGlkKHRyaWdnZXJCbG9jazEpO1xuICAgICAgICAgICAgY29uc3Qgc3Bpa2VzMSA9IFtcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgyICogVSwgMjUgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzICogVSwgMjUgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNwaWtlIG9mIHNwaWtlczEpIHtcbiAgICAgICAgICAgICAgICB0cmlnZ2VyQmxvY2sxLmF0dGFjaChzcGlrZSk7XG4gICAgICAgICAgICAgICAgc2NlbmVzLkNFTEVTVEVfMzYuYWRkVGhpbmcoc3Bpa2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0cmlnZ2VyQmxvY2syID0gbWFrZVRyaWdnZXJCbG9jaygzNSwgMjMsIDM1LCAxNSwgMywgNCk7XG4gICAgICAgICAgICBzY2VuZXMuQ0VMRVNURV8zNi5hZGRTb2xpZCh0cmlnZ2VyQmxvY2syKTtcbiAgICAgICAgICAgIGNvbnN0IHNwaWtlczIgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU3Bpa2VzVXAoMzUgKiBVLCAyMiAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNwaWtlc1VwKDM2ICogVSwgMjIgKiBVKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5TcGlrZXNVcCgzNyAqIFUsIDIyICogVSksXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzcGlrZSBvZiBzcGlrZXMyKSB7XG4gICAgICAgICAgICAgICAgdHJpZ2dlckJsb2NrMi5hdHRhY2goc3Bpa2UpO1xuICAgICAgICAgICAgICAgIHNjZW5lcy5DRUxFU1RFXzM2LmFkZFRoaW5nKHNwaWtlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExPVUlTXzA2XG4gICAgICAgIC8vIHNjZW5lcy5MT1VJU18wNi5hZGRUaGluZyhuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKDExLjUgKiBVLCAxNSAqIFUsIDAsIDMgKiBVLCBzY2VuZXMuTE9VSVNfMDgsIFUsIDEzICogVSwgMCkpO1xuICAgICAgICAvLyBzY2VuZXMuTE9VSVNfMDguYWRkVGhpbmcobmV3IHBoeXNpY3MuVHJhbnNpdGlvbigwLCAxMyAqIFUsIDAsIDMgKiBVLCBzY2VuZXMuTE9VSVNfMDYsIDEwICogVSwgMTUgKiBVLCAxKSk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbnNcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMSwgMzEsIDAsIHNjZW5lcy5DRUxFU1RFXzAyLCAxLCAxLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMiwgMzQsIDAsIHNjZW5lcy5DRUxFU1RFXzAzLCAyLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wMywgMzMsIDAsIHNjZW5lcy5DRUxFU1RFXzA0LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNCwgMjEsIDAsIHNjZW5lcy5DRUxFU1RFXzA1LCA0LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8wNSwgMjIsIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8wNywgMjksIDAsIHNjZW5lcy5DRUxFU1RFXzA2LCAzMCwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDYsIDMwLCAyLCBzY2VuZXMuQ0VMRVNURV8wOCwgNSwgMCwgNCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMDYsIDM1LCAwLCBzY2VuZXMuQ0VMRVNURV8wOSwgMSwgMiwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTAsIDcsIDAsIHNjZW5lcy5DRUxFU1RFXzA5LCA3LCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xMSwgOCwgMSwgc2NlbmVzLkNFTEVTVEVfMTAsIDgsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzEwLCAyLCAxLCBzY2VuZXMuQ0VMRVNURV8xMiwgNDIsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzExLCAzLCAwLCBzY2VuZXMuQ0VMRVNURV8xMiwgMywgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMDksIDAsIDAsIHNjZW5lcy5DRUxFU1RFXzEzLCAwLCAwLCAxMCk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmVzLkNFTEVTVEVfMTMsIC41LCAxLCBzY2VuZXMuQ0VMRVNURV8xNCwgMjIuNSwgMiwgMTApO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE1LCAyMiwgMSwgc2NlbmVzLkNFTEVTVEVfMTQsIDQsIDAsIDUpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE2LCAxOSwgMCwgc2NlbmVzLkNFTEVTVEVfMTUsIDIsIDAsIDIpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE0LCAxLCAxLCBzY2VuZXMuQ0VMRVNURV8xNywgMTAsIDIsIDkpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzE4LCAxNywgMCwgc2NlbmVzLkNFTEVTVEVfMTcsIDIsIDAsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzE4LCAxOSwgMCwgc2NlbmVzLkNFTEVTVEVfMTksIDEzLCAxLCA0KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8xOSwgMiwgMCwgc2NlbmVzLkNFTEVTVEVfMjAsIDIsIDAsIDIpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzIwLCAxMiwgMSwgc2NlbmVzLkNFTEVTVEVfMjEsIDgsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzIxLCAyNiwgMSwgc2NlbmVzLkNFTEVTVEVfMjIsIDI2LCAwLCAxKTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8yMywgNywgMCwgc2NlbmVzLkNFTEVTVEVfMjEsIDI3LCAzLCA3KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8yMSwgMiwgMCwgc2NlbmVzLkNFTEVTVEVfMjQsIDgsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzE3LCAzMywgMSwgc2NlbmVzLkNFTEVTVEVfMjUsIDcsIDAsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzI1LCAyMiwgMCwgc2NlbmVzLkNFTEVTVEVfMjEsIDIsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzI0LCAzMiwgMCwgc2NlbmVzLkNFTEVTVEVfMjYsIDQsIDEsIDQpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzI2LCAzLCAwLCBzY2VuZXMuQ0VMRVNURV8yNywgMTYsIDMsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzI3LCAyLCAxLCBzY2VuZXMuQ0VMRVNURV8yOCwgMjgsIDIsIDUpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzI5LCAxMywgMSwgc2NlbmVzLkNFTEVTVEVfMjgsIDE4LCAxLCA1KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuQ0VMRVNURV8zMCwgNiwgMCwgc2NlbmVzLkNFTEVTVEVfMjksIDYsIDAsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzI3LCA2LCAyLCBzY2VuZXMuQ0VMRVNURV8zMSwgNiwgMCwgMik7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMjcsIDMxLCAwLCBzY2VuZXMuQ0VMRVNURV8zMiwgMTcsIDEsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzI4LCA1LCAwLCBzY2VuZXMuQ0VMRVNURV8zMywgNSwgMSwgMyk7XG4gICAgICAgIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkNFTEVTVEVfMjgsIDI4LCAyLCBzY2VuZXMuQ0VMRVNURV8zMywgMjgsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzMyLCA0LCAwLCBzY2VuZXMuQ0VMRVNURV8zMywgNDQsIDMsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5DRUxFU1RFXzMzLCAxMCwgMCwgc2NlbmVzLkNFTEVTVEVfMzQsIDMsIDIsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzM1LCAxMywgMCwgc2NlbmVzLkNFTEVTVEVfMzQsIDMsIDAsIDMpO1xuICAgICAgICBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lcy5DRUxFU1RFXzM0LCAxNSwgMSwgc2NlbmVzLkNFTEVTVEVfMzYsIDI5LCAxLCA5KTtcbiAgICAgICAgbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuQ0VMRVNURV8zNiwgOCwgMCwgc2NlbmVzLkNFTEVTVEVfMzcsIDYsIDAsIDMpO1xuXG4gICAgICAgIC8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzAxLCAzNSwgMCwgc2NlbmVzLkxPVUlTXzAyLCA0LCAxLCAzKTtcbiAgICAgICAgLy8gbWFrZVRyYW5zaXRpb25VcChzY2VuZXMuTE9VSVNfMDMsIDMsIDAsIHNjZW5lcy5MT1VJU18wMiwgMTMsIDAsIDMpO1xuICAgICAgICAvLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wMywgMzAsIDEsIHNjZW5lcy5MT1VJU18wMiwgMjMsIDIsIDMpO1xuICAgICAgICAvLyBtYWtlVHJhbnNpdGlvblVwKHNjZW5lcy5MT1VJU18wNCwgNCwgMCwgc2NlbmVzLkxPVUlTXzAyLCAzNSwgMywgMyk7XG4gICAgICAgIC8vIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmVzLkxPVUlTXzA1LCAzMywgMCwgc2NlbmVzLkxPVUlTXzA2LCAxLCAxLCA1KTtcbiAgICAgICAgLy8gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZXMuTE9VSVNfMDYsIDgsIDAsIHNjZW5lcy5MT1VJU18wNywgOCwgMSwgNik7XG5cbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2NlbmVzLFxuICAgIGxvYWRTY2VuZXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBzb3VuZCA9IHJlcXVpcmUoJy4vc291bmQnKTtcblxuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbi8qKlxuICogVGlsZXMgc2hlZXRcbiAqIEB0eXBlIHtIVE1MSW1hZ2VFbGVtZW50fVxuICovXG5jb25zdCB0aWxlc2V0ID0gbmV3IEltYWdlKCk7XG50aWxlc2V0LnNyYyA9ICd0aWxlbWFwcy90aWxlc2V0LnBuZyc7XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGlsZSB0byBiZSB1c2VkIHdoZW4gcmVwcmVzZW50aW5nIGFuIGVsZW1lbnQgb2YgdGhlIHNjZW5lXG4gKi9cbmNsYXNzIFRpbGVEYXRhIHtcbiAgICBjb25zdHJ1Y3RvcihpbmRleCwgc2hpZnRYID0gMCwgc2hpZnRZID0gMCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogSW5kZXggb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHgtcG9zaXRpb24gb2YgdGhlIHRpbGUgaW4gdGhlIHRpbGVzZXRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMueCA9IHRoaXMuaW5kZXggJSA4O1xuICAgICAgICAvKipcbiAgICAgICAgICogeS1wb3NpdGlvbiBvZiB0aGUgdGlsZSBpbiB0aGUgdGlsZXNldFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy55ID0gdGhpcy5pbmRleCA+PiAzO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1vZmZzZXQgdG8gZHJhdyB0aGUgdGlsZSBmcm9tIHRoZSBTY2VuZUVsZW1lbnQncyBwb3NpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zaGlmdFggPSBzaGlmdFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LW9mZnNldCB0byBkcmF3IHRoZSB0aWxlIGZyb20gdGhlIFNjZW5lRWxlbWVudCdzIHBvc2l0aW9uXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnNoaWZ0WSA9IHNoaWZ0WTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlIGlmIHRoZSBpbnRlcnNlY3Rpb24gb2YgYm90aCBzZWdtZW50cyBpcyBvZiBub24temVybyBtZWFzdXJlIChpZiB0aGUgZW5kIG9mIG9uZSBzZWdtZW50XG4gKiBjb2luY2lkZXMgd2l0aCB0aGUgc3RhcnQgb2YgdGhlIG5leHQsIHRoZXkgYXJlIG5vdCBjb25zaWRlcmVkIGFzIG92ZXJsYXBwaW5nKVxuICpcbiAqIEBwYXJhbSBzdGFydDEge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMSB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHN0YXJ0MiB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgc2Vjb25kIHNlZ21lbnRcbiAqIEBwYXJhbSBzaXplMiB7bnVtYmVyfSB3aWR0aCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIHR3byBzZWdtZW50cyBvdmVybGFwXG4gKi9cbmZ1bmN0aW9uIHNlZ21lbnRzT3ZlcmxhcChzdGFydDEsIHNpemUxLCBzdGFydDIsIHNpemUyKSB7XG4gICAgcmV0dXJuIHN0YXJ0MSA8IHN0YXJ0MiArIHNpemUyICYmIHN0YXJ0MiA8IHN0YXJ0MSArIHNpemUxO1xufVxuXG5cbi8qKlxuICogU2NlbmVFbGVtZW50cyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBhcHBlYXIgaW4gYSBzY2VuZSAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBkZWNvcmF0aW9ucywgZXRjLilcbiAqXG4gKiBBbGwgRWxlbWVudHMgYXJlIHJlcHJlc2VudGVkIGFzIGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3hlcyBhbmQgdGhlIHNwYWNlIHRoZXkgb2NjdXB5IGluIGEgc2NlbmUgaXMgdGhlcmVmb3JlIGRlZmluZWRcbiAqIGFzIGEgcG9zaXRpb24gKHgsIHkpIGFuZCBhIHNpemUgKHdpZHRoLCBoZWlnaHQpLiBBdCBhbGwgdGltZXMsIHBvc2l0aW9ucyBhbmQgc2l6ZXMgc2hvdWxkIGJlIGludGVnZXJzLiBTdWItaW50ZWdlclxuICogcG9zaXRpb25zIGFyZSBjb25zaWRlcmVkIHdpdGggdGhlIHVzZSBvZiB0aGUgYHhSZW1haW5kZXJgIGFuZCBgeVJlbWFpbmRlcmAgYXR0cmlidXRlcyAodGhhdCBzaG91bGQgaGF2ZSBhbiBhYnNvbHV0ZVxuICogdmFsdWUgPCAxKVxuICovXG5jbGFzcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB4LWNvb3JkaW5hdGUgb2YgdGhlIGxlZnRtb3N0IHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54ID0geDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIHktY29vcmRpbmF0ZSBvZiB0aGUgbGVmdG1vc3Qgc2lkZSBvZiB0aGUgYm91bmRpbmcgYm94IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICAvKipcbiAgICAgICAgICogaW5pdGlhbCB4LWNvb3JkaW5hdGUgKHVzZWQgZm9yIHJlc2V0KCkpXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0WCA9IHg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBpbml0aWFsIHktY29vcmRpbmF0ZSAodXNlZCBmb3IgcmVzZXQoKSlcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3RhcnRZID0geTtcbiAgICAgICAgdGhpcy5zaGlmdFggPSAwO1xuICAgICAgICB0aGlzLnNoaWZ0WSA9IDA7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB3aWR0aCBvZiB0aGUgU2NlbmVFbGVtZW50IChpbiBwaXhlbHMpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBoZWlnaHQgb2YgdGhlIFNjZW5lRWxlbWVudCAoaW4gcGl4ZWxzKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBmcmFjdGlvbmFsIHBhcnQgb2YgdGhlIHgtcG9zaXRpb24gb2YgdGhlIFNjZW5lRWxlbWVudCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCBzaG91bGQgYWx3YXlzIGJlIGFuIGludGVnZXIsXG4gICAgICAgICAqIGJ1dCBmcmFjdGlvbmFsIHBhcnRzIG9mIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBjYW4gYmUgcmVtZW1iZXJlZCBmb3IgbmV4dCBtb3ZlKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIGZyYWN0aW9uYWwgcGFydCBvZiB0aGUgeS1wb3NpdGlvbiBvZiB0aGUgU2NlbmVFbGVtZW50IChwb3NpdGlvbiBvZiBhbiBlbGVtZW50IHNob3VsZCBhbHdheXMgYmUgYW4gaW50ZWdlcixcbiAgICAgICAgICogYnV0IGZyYWN0aW9uYWwgcGFydHMgb2YgdGhlIGNvbXB1dGVkIHBvc2l0aW9uIGNhbiBiZSByZW1lbWJlcmVkIGZvciBuZXh0IG1vdmUpXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQW1vdW50IG1vdmVkIG9uIHRoZSB4LWF4aXMgc2luY2UgbGFzdCB1cGRhdGVcbiAgICAgICAgICogKHJlc2V0IGJ5IGJlZm9yZVVwZGF0ZSgpLCBpbmNyZW1lbnRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoaXMubW92ZSgpKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogQW1vdW50IG1vdmVkIG9uIHRoZSB5LWF4aXMgc2luY2UgbGFzdCB1cGRhdGVcbiAgICAgICAgICogKHJlc2V0IGJ5IGJlZm9yZVVwZGF0ZSgpLCBpbmNyZW1lbnRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoaXMubW92ZSgpKVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgU2NlbmVFbGVtZW50IHNob3VsZCBiZSBjb25zaWRlcmVkIGJ5IHRoZSBFbmdpbmUgb3Igbm90IChpbmFjdGl2ZSBTY2VuZUVsZW1lbnRzIGFyZSBpZ25vcmVkIHdoZW5cbiAgICAgICAgICogaW50ZXJhY3Rpb25zIGFyZSBjb21wdXRlZClcbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSB0aWxlIHVzZWQgdG8gcmVwcmVzZW50IHRoZSBTY2VuZUVsZW1lbnQgKGlmIHJlcHJlc2VudGVkIGJ5IGEgc2luZ2xlIHRpbGUpXG4gICAgICAgICAqIEB0eXBlIHt1bmRlZmluZWR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbGVEYXRhID0gdGlsZURhdGE7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDdXJyZW50IGVmZmVjdHMgYXBwbGllZCB0byB0aGUgU2NlbmVFbGVtZW50XG4gICAgICAgICAqIEB0eXBlIHtbRWZmZWN0XX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZWZmZWN0cyA9IFtdO1xuICAgICAgICAvKipcbiAgICAgICAgICogU2NlbmUgaW4gd2hpY2ggdGhlIFNjZW5lRWxlbWVudCBpcyBpbmNsdWRlZFxuICAgICAgICAgKiBAdHlwZSB7dW5kZWZpbmVkfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpY3Rpb25hcnkgb2YgdGltZXJzIChudW1iZXJzKSB0aGF0IGFyZSBhdXRvbWF0aWNhbGx5IGRlY3JlbWVudGVkIGF0IGVhY2ggdXBkYXRlXG4gICAgICAgICAqIEB0eXBlIHt7bnVtYmVyfX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXQgb2YgU2NlbmVFbGVtZW50cyB0aGF0IGFyZSBhdHRhY2hlZCB0byB0aGUgU2NlbmVFbGVtZW50XG4gICAgICAgICAqIFdoZW5ldmVyIGB0aGlzYCBpcyBtb3ZlZCwgYWxsIGF0dGFjaGVkIEVsZW1lbnRzIHdpbGwgYWxzbyBiZSBtb3ZlZCBieSB0aGUgc2FtZSBhbW91bnRcbiAgICAgICAgICpcbiAgICAgICAgICogV2FybmluZzogQmVjYXVzZSBvZiB0aGUgc3BlY2lhbCBjb25zdHJhaW50cyBvbiBBY3RvciBwb3NpdGlvbnMsIEFjdG9ycyBzaG91bGQgbm90IGJlIGF0dGFjaGVkIHRvIGFcbiAgICAgICAgICogU2NlbmVFbGVtZW50LiBUaGUgcGFydGljdWxhciBjYXNlIG9mIEFjdG9ycyBcInJpZGluZ1wiIGEgU29saWQgaXMgaGFuZGxlZCBzZXBhcmF0ZWx5IGluIHRoZSBTb2xpZC5tb3ZlKClcbiAgICAgICAgICogbWV0aG9kLlxuICAgICAgICAgKiBAdHlwZSB7U2V0PFNjZW5lRWxlbWVudD59XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmF0dGFjaGVkRWxlbWVudHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgU2NlbmVFbGVtZW50IHRvIHdoaWNoIHRoaXMgaXMgYXR0YWNoZWQsIGlmIGFueVxuICAgICAgICAgKiBAdHlwZSB7U2NlbmVFbGVtZW50fVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2hlZFRvID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIG9mIGB0aGlzYCBvdmVybGFwcyB0aGUgYm91bmRpbmcgcmVjdGFuZ2xlIG9mIGBvdGhlcmAuXG4gICAgICpcbiAgICAgKiBUd28gU2NlbmVFbGVtZW50cyBvdmVybGFwIGlmIGZvciBib3RoIGRpbWVuc2lvbnMgdGhlIGVuZCBwb3NpdGlvbiBvZiBlYWNoIFNjZW5lRWxlbWVudCBpcyBzdHJpY3RseSBncmVhdGVyIHRoYW5cbiAgICAgKiB0aGUgc3RhcnQgcG9zaXRpb24gb2YgdGhlIG90aGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIG90aGVyIHtTY2VuZUVsZW1lbnR9XG4gICAgICogQHJldHVybnMge2Jvb2xlYW58Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBvdmVybGFwcyhvdGhlcikge1xuICAgICAgICByZXR1cm4gKHRoaXMueCArIHRoaXMud2lkdGggPiBvdGhlci54ICYmXG4gICAgICAgICAgICBvdGhlci54ICsgb3RoZXIud2lkdGggPiB0aGlzLnggJiZcbiAgICAgICAgICAgIHRoaXMueSArIHRoaXMuaGVpZ2h0ID4gb3RoZXIueSAmJlxuICAgICAgICAgICAgb3RoZXIueSArIG90aGVyLmhlaWdodCA+IHRoaXMueSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRHJhd3MgdGhlIFNjZW5lRWxlbWVudCBpbiB0aGUgQ2FudmFzIGFzc29jaWF0ZWQgdG8gdGhlIENvbnRleHQgZ2l2ZW4gYXMgYXJndW1lbnRcbiAgICAgKiBAcGFyYW0gY3R4IHtDYW52YXNSZW5kZXJpbmdDb250ZXh0MkR9IGNvbnRleHQgb2YgdGhlIGNhbnZhcyBpbiB3aGljaCB0aGUgU2NlbmVFbGVtZW50IGlzIGRyYXduXG4gICAgICovXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMudGlsZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHNoaWZ0WCA9IHRoaXMuc2hpZnRYO1xuICAgICAgICAgICAgbGV0IHNoaWZ0WSA9IHRoaXMuc2hpZnRZO1xuICAgICAgICAgICAgaWYgKHRoaXMuYXR0YWNoZWRUbykge1xuICAgICAgICAgICAgICAgIHNoaWZ0WCArPSB0aGlzLmF0dGFjaGVkVG8uc2hpZnRYO1xuICAgICAgICAgICAgICAgIHNoaWZ0WSArPSB0aGlzLmF0dGFjaGVkVG8uc2hpZnRZO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICB0aWxlc2V0LFxuICAgICAgICAgICAgICAgIDE2ICogdGhpcy50aWxlRGF0YS54LCAxNiAqIHRoaXMudGlsZURhdGEueSxcbiAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgdGhpcy54ICsgdGhpcy50aWxlRGF0YS5zaGlmdFggKyBzaGlmdFgsIHRoaXMueSArIHRoaXMudGlsZURhdGEuc2hpZnRZICsgc2hpZnRZLFxuICAgICAgICAgICAgICAgIDgsIDgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgcHJvcGVydGllcyBhdCB0aGUgc3RhcnQgb2YgYSBuZXcgdXBkYXRlIG9mIHRoZSBTY2VuZVxuICAgICAqL1xuICAgIGJlZm9yZVVwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBzdGF0ZSBvZiB0aGUgU2NlbmVFbGVtZW50IChjYWxsZWQgYXQgZWFjaCBmcmFtZSB3aGVuIHRoZSBTY2VuZSBpcyBhY3RpdmUpXG4gICAgICogQHBhcmFtIGRlbHRhVGltZSB7bnVtYmVyfSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCB1cGRhdGUgKGluIHNlY29uZHMpXG4gICAgICovXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICAvLyB1cGRhdGUgdGltZXJzXG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIC8vIHVwZGF0ZSBlZmZlY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIHRoaXMuZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LnVwZGF0ZShkZWx0YVRpbWUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIFNjZW5lRWxlbWVudCBieSBhIGdpdmVuIGFtb3VudFxuICAgICAqIEBwYXJhbSBkeCB7bnVtYmVyfSBudW1iZXIgb2YgcGl4ZWxzIHRvIG1vdmUgcmlnaHRcbiAgICAgKiBAcGFyYW0gZHkge251bWJlcn0gbnVtYmVyIG9mIHBpeGVscyB0byBtb3ZlIGRvd25cbiAgICAgKiBAcGFyYW0gbXgge251bWJlcn0gbW9tZW50dW0gYWxvbmcgdGhlIHgtYXhpcyAob3B0aW9uYWwpXG4gICAgICogQHBhcmFtIG15IHtudW1iZXJ9IG1vbWVudHVtIGFsb25nIHRoZSB5LWF4aXMgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICAvLyBtb3ZlIGFsbCBlbGVtZW50cyBhdHRhY2hlZCB0byB0aGlzXG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy5hdHRhY2hlZEVsZW1lbnRzKSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlKGR4LCBkeSwgbXgsIG15KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNoYW5nZSBwb3NpdGlvblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgIHRoaXMubW92ZWRZICs9IG1vdmVZO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIFNjZW5lIEVsZW1lbnQgdG8gYSBnaXZlbiBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB4IHtudW1iZXJ9IHgtY29vcmRpbmF0ZSBvZiB0aGUgdGFyZ2V0IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHkge251bWJlcn0geS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQgcG9zaXRpb25cbiAgICAgKi9cbiAgICBtb3ZlVG8oeCwgeSwgbXgsIG15KSB7XG4gICAgICAgIHRoaXMubW92ZSh4IC0gdGhpcy54IC0gdGhpcy54UmVtYWluZGVyLCB5IC0gdGhpcy55IC0gdGhpcy55UmVtYWluZGVyLCBteCwgbXkpO1xuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnN0YXJ0WDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy5zdGFydFk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICBmb3IgKGNvbnN0IHRpbWVyIGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0aW1lcl0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZWZmZWN0cy5sZW5ndGggPSAwOyAgICAvLyBjbGVhciBhbGwgZWZmZWN0c1xuICAgIH1cblxuICAgIGFkZEVmZmVjdChlZmZlY3QpIHtcbiAgICAgICAgdGhpcy5lZmZlY3RzLnB1c2goZWZmZWN0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlRWZmZWN0KGVmZmVjdCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuZWZmZWN0cy5pbmRleE9mKGVmZmVjdCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMuZWZmZWN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGEgZ2l2ZW4gU2NlbmVFbGVtZW50IHRvIHRoaXNcbiAgICAgKiBAcGFyYW0gZWxlbWVudCB7U2NlbmVFbGVtZW50fSB0aGUgU2NlbmVFbGVtZW50IHRvIGF0dGFjaFxuICAgICAqL1xuICAgIGF0dGFjaChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5hZGQoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuYXR0YWNoZWRUbyA9IHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGV0YWNoZXMgYSBnaXZlbiBTY2VuZUVsZW1lbnQgdG8gdGhpc1xuICAgICAqIEBwYXJhbSBlbGVtZW50IHtTY2VuZUVsZW1lbnR9IHRoZSBTY2VuZUVsZW1lbnQgdG8gZGV0YWNoXG4gICAgICovXG4gICAgZGV0YWNoKGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5hdHRhY2hlZEVsZW1lbnRzLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5hdHRhY2hlZFRvID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEFjdG9ycyBhcmUgU2NlbmVFbGVtZW50cyBpbiBhIFNjZW5lIHRoYXQgY2Fubm90IHBhc3MgdGhyb3VnaCBTb2xpZHMgKHBsYXllciBjaGFyYWN0ZXJzIGFuZCBlbmVtaWVzIGZvciBpbnN0YW5jZSlcbiAqL1xuY2xhc3MgQWN0b3IgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gMDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICB0aGlzLm1vdmVYKGR4KTtcbiAgICAgICAgdGhpcy5tb3ZlWShkeSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTW92ZSB0aGUgQWN0b3IgYSBnaXZlbiBhbW91bnQgb24gdGhlIHgtYXhpc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdHJpZXMgdG8gbW92ZSB0aGUgQWN0b3IgYnkgdGhlIGdpdmVuIGFtb3VudCBvbiB0aGUgeC1heGlzIGJ1dCBzdG9wcyBpZiB0aGVyZSBpcyBhIGNvbGxpc2lvbiB3aXRoIGFcbiAgICAgKiBTb2xpZCAodGhlIHBvc2l0aW9uIGlzIHNldCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIG92ZXJsYXAgd2l0aCB0aGUgU29saWQpLiBJZiB0aGVyZSB3YXMgYSBjb2xsaXNpb24sIHRoZSBmdW5jdGlvblxuICAgICAqIGdpdmVuIGFzIHBhcmFtZXRlciBpcyBjYWxsZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYW1vdW50IHtudW1iZXJ9IGFtb3VudCB0byBtb3ZlIG9uIHRoZSB4LWF4aXNcbiAgICAgKiBAcGFyYW0gb25Db2xsaWRlIHtmdW5jdGlvbigpfSBmdW5jdGlvbiB0byBydW4gaWYgdGhlIEFjdG9yIGNvbGxpZGVzIHdpdGggYSBTb2xpZFxuICAgICAqL1xuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBkeDsgICAgICAvLyBpZiBtb3ZlbWVudCB3YXMgc3RvcHBlZCBieSBhIFNvbGlkLCBtb3ZlZCBkaXN0YW5jZSBpcyBhbiBpbnRlZ2VyXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRYICs9IGFtb3VudDsgIC8vIGlmIG1vdmVtZW50IHdhcyBub3Qgc3RvcHBlZCwgbW92ZWQgZGlzdGFuY2UgbWlnaHQgYmUgZnJhY3Rpb25hbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5tb3ZlZFggKz0gYW1vdW50OyAgLy8gbW92ZW1lbnQgdGhhdCBpcyBpbnN1ZmZpY2llbnQgdG8gbW92ZSBieSBhIHBpeGVsIGlzIHN0aWxsIGNvdW50ZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1vdmUgdGhlIEFjdG9yIGEgZ2l2ZW4gYW1vdW50IG9uIHRoZSB5LWF4aXNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIHRyaWVzIHRvIG1vdmUgdGhlIEFjdG9yIGJ5IHRoZSBnaXZlbiBhbW91bnQgb24gdGhlIHktYXhpcyBidXQgc3RvcHMgaWYgdGhlcmUgaXMgYSBjb2xsaXNpb24gd2l0aCBhXG4gICAgICogU29saWQgKHRoZSBwb3NpdGlvbiBpcyBzZXQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBvdmVybGFwIHdpdGggdGhlIFNvbGlkKS4gSWYgdGhlcmUgd2FzIGEgY29sbGlzaW9uLCB0aGUgZnVuY3Rpb25cbiAgICAgKiBnaXZlbiBhcyBwYXJhbWV0ZXIgaXMgY2FsbGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIGFtb3VudCB7bnVtYmVyfSBhbW91bnQgdG8gbW92ZSBvbiB0aGUgeC1heGlzXG4gICAgICogQHBhcmFtIG9uQ29sbGlkZSB7ZnVuY3Rpb24oKX0gZnVuY3Rpb24gdG8gcnVuIGlmIHRoZSBBY3RvciBjb2xsaWRlcyB3aXRoIGEgU29saWRcbiAgICAgKi9cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZWRZICs9IGR5OyAgICAgIC8vIGlmIG1vdmVtZW50IHdhcyBzdG9wcGVkIGJ5IGEgU29saWQsIG1vdmVkIGRpc3RhbmNlIGlzIGFuIGludGVnZXJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gYW1vdW50OyAgLy8gaWYgbW92ZW1lbnQgd2FzIG5vdCBzdG9wcGVkLCBtb3ZlZCBkaXN0YW5jZSBtaWdodCBiZSBmcmFjdGlvbmFsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVkWSArPSBhbW91bnQ7ICAvLyBtb3ZlbWVudCB0aGF0IGlzIGluc3VmZmljaWVudCB0byBtb3ZlIGJ5IGEgcGl4ZWwgaXMgc3RpbGwgY291bnRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBBY3RvciBpcyBjdXJyZW50bHkgXCJyaWRpbmdcIiB0aGUgU29saWQgZ2l2ZW4gYXMgcGFyYW1ldGVyLCBtZWFuaW5nIHRoYXQgd2hlbiB0aGUgU29saWRcbiAgICAgKiBtb3ZlcyBpdCBzaG91bGQgbW92ZSB0aGUgQWN0b3IgdG9vLlxuICAgICAqIEFuIEFjdG9yIGlzIGNvbnNpZGVyZWQgdG8gYmUgcmlkaW5nIGEgU29saWQgaXQgaXMgc3RhbmRpbmcgZGlyZWN0bHkgb24gdG9wIG9mIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHNvbGlkIHtTb2xpZH1cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgQWN0b3IgaXMgcmlkaW5nIHRoZSBzb2xpZFxuICAgICAqL1xuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWV0aG9kIHRvIGNhbGwgd2hlbiB0aGUgQWN0b3IgY29sbGlkZXMgd2l0aCBhIFNvbGlkIHdoaWxlIGJlaW5nIHB1c2hlZCBieSBhbm90aGVyXG4gICAgICovXG4gICAgc3F1aXNoKCkge1xuICAgIH1cblxuICAgIHNldE1vbWVudHVtWChteCkge1xuICAgICAgICBpZiAobXgpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVggPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtWShteSkge1xuICAgICAgICBpZiAobXkpIHtcbiAgICAgICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bVkgPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNvbGlkcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IEFjdG9ycyBjYW5ub3QgcGFzcyB0aHJvdWdoLiBUaGVyZSBzaG91bGQgbmV2ZXIgYmUgYW4gQWN0b3Igb3ZlcmxhcHBpbmcgYSBTb2xpZCAodW5sZXNzXG4gKiBlaXRoZXIgb25lIGlzIG1hcmtlZCBhcyBpbmFjdGl2ZSkuIFdoZW4gU29saWRzIG1vdmUsIHRoZXkgaW50ZXJhY3Qgd2l0aCBBY3RvcnMgdGhhdCBtaWdodCBvdGhlcndpc2Ugb3ZlcmxhcCAodGhleVxuICogbWlnaHQgcHVzaCB0aGVtLCBraWxsIHRoZW0sIGV0Yy4pLlxuICpcbiAqIFR3byBTb2xpZHMgbWlnaHQgb3ZlcmxhcCwgYW5kIGluIGdlbmVyYWwgdGhlIG1vdmVtZW50IG9mIGEgU29saWQgaXMgbm90IGFmZmVjdGVkIGJ5IG90aGVyIFNvbGlkcy5cbiAqL1xuY2xhc3MgU29saWQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdoZXRoZXIgdGhlIFNvbGlkIHNob3VsZCBiZSBjb25zaWRlcmVkIHdoZW4gY2hlY2tpbmcgY29sbGlzaW9ucyB3aXRoIGFuIEFjdG9yXG4gICAgICAgICAqIFRoaXMgYXR0cmlidXRlIGlzIHVzZWQgYXV0b21hdGljYWxseSBieSB0aGUgbW92ZSgpIG1ldGhvZCB3aGVuIHRoZSBTb2xpZCBwdXNoZXMgYW4gQWN0b3IuIEl0IHNob3VsZCBub3QgYmVcbiAgICAgICAgICogY2hhbmdlZCBpbiBvdGhlciBjaXJjdW1zdGFuY2VzICh1c2UgaXNBY3RpdmUgdG8gZGlzYWJsZSB0aGUgU29saWQpLlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIGEgUGxheWVyIGNoYXJhY3RlciBjYW4gY2xpbWIgb24gKG9yIHNsb3dseSBzbGlkZSBhZ2FpbnN0KSB0aGUgc2lkZXMgb2YgdGhlIFNvbGlkXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jYW5CZUNsaW1iZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IDAsIG15ID0gMCkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMuYXR0YWNoZWRFbGVtZW50cykge1xuICAgICAgICAgICAgdGhpbmcubW92ZShkeCwgZHksIG14LCBteSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIGlmIChtb3ZlWCB8fCBtb3ZlWSkge1xuICAgICAgICAgICAgY29uc3QgcmlkaW5nID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSAmJiBhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByaWRpbmcuYWRkKGFjdG9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICAgICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVkWCArPSBtb3ZlWDtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPCBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLnNldE1vbWVudHVtWChteCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCAtIGFjdG9yLnggLSBhY3Rvci53aWR0aCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWChtb3ZlWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYID4gbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVgobXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb3ZlWSkge1xuICAgICAgICAgICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlZFkgKz0gbW92ZVk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgKyB0aGlzLmhlaWdodCAtIGFjdG9yLnksICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3Iuc2V0TW9tZW50dW1ZKG15KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55IC0gYWN0b3IueSAtIGFjdG9yLmhlaWdodCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZID4gbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5zZXRNb21lbnR1bVkobXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIFNvbGlkIGlzIGNvbnNpZGVyZWQgdG8gY29sbGlkZSB3aXRoIGFuIEFjdG9yIG1vdmluZyBieSBhIGdpdmVuIGFtb3VudCBpbiBib3RoIGF4ZXMuXG4gICAgICpcbiAgICAgKiBUbyBzaW1wbGlmeSB0aGUgY29tcHV0YXRpb24sIHRoZSBmdW5jdGlvbiBjaGVja3MgaWYgdGhlIGJvdW5kaW5nIGJveCBvZiB0aGUgc29saWQgb3ZlcmxhcHMgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAgKiByZWN0YW5nbGUgY29udGFpbmluZyB0aGUgYXJlYXMgb2NjdXBpZWQgYnkgdGhlIEFjdG9yIGF0IHRoZSBzdGFydCBhbmQgZW5kIG9mIGl0cyBtb3ZlbWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBhY3RvciB7QWN0b3J9XG4gICAgICogQHBhcmFtIGR4IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHgtYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIGR5IHtudW1iZXJ9IGFtb3VudCB0cmF2ZWxlZCBieSB0aGUgQWN0b3Igb24gdGhlIHktYXhpcyBmcm9tIGl0cyBjdXJyZW50IHBvc2l0aW9uXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHdoZXRoZXIgdGhlIFNvbGlkIG92ZXJsYXBzIHRoZSBBY3RvciBhdCBhbnkgcG9pbnQgZHVyaW5nIGl0cyBtb3ZlbWVudFxuICAgICAqL1xuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGggKyBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54ICsgZHgsIGFjdG9yLndpZHRoIC0gZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCArIGR5KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSArIGR5LCBhY3Rvci5oZWlnaHQgLSBkeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIEhhemFyZHMgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCBraWxsIHRoZSBwbGF5ZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBIYXphcmQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxufVxuXG5cbi8qKlxuICogUGxhdGZvcm1zIGFyZSBmbGF0IFNvbGlkcyAoMCBoZWlnaHQpIHRoYXQgQWN0b3JzIGNhbiBwYXNzIHRocm91Z2ggd2hlbiBtb3ZpbmcgdXB3YXJkcyBidXQgbm90IGRvd253YXJkcyAoaWYgdGhleSBhcmVcbiAqIGVudGlyZWx5IGhpZ2hlciB0aGFuIHRoZSBQbGF0Zm9ybSlcbiAqXG4gKiBDb250cmFyeSB0byByZWd1bGFyIFNvbGlkcywgUGxhdGZvcm1zIGFyZSBhbGxvd2VkIHRvIG92ZXJsYXAgd2l0aCBBY3RvcnMuXG4gKi9cbmNsYXNzIFBsYXRmb3JtIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCB0aWxlRGF0YSkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgMCwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNhbkJlQ2xpbWJlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGFjdG9yLmhlaWdodCA8PSB0aGlzLnkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgYWN0b3IuaGVpZ2h0ICsgZHkgPiB0aGlzLnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwcmluZ3MgYXJlIFNjZW5lRWxlbWVudHMgdGhhdCB0aHJvdyBBY3RvcnMgdXAgb24gY29udGFjdFxuICovXG5jbGFzcyBTcHJpbmcgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgVSwgVSAvIDIsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy50aWxlRGF0YS5zaGlmdFkgPSAtVSAvIDI7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnNwcmluZ1NvdW5kKTtcbiAgICAgICAgcGxheWVyLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9CT1VOQ0UpO1xuICAgICAgICBwbGF5ZXIuc3BlZWRYID0gMDtcbiAgICAgICAgcGxheWVyLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgIHBsYXllci5yZXN0b3JlRGFzaCgpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIERhc2hEaWFtb25kcyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHJlc3RvcmUgdGhlIGRhc2ggY291bnRlciBvZiB0aGUgUGxheWVycyB3aG8gdG91Y2ggdGhlbVxuICovXG5jbGFzcyBEYXNoRGlhbW9uZCBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVLCBuZXcgVGlsZURhdGEoMjEpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpXG4gICAgICAgIGlmICghdGhpcy5pc0FjdGl2ZSAmJiB0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRhc2hEaWFtb25kU291bmQpO1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFN0cmF3YmVycmllcyBhcmUgY29sbGVjdGlibGVzIHRoYXQgUGxheWVyIHRha2Ugb24gY29udGFjdC5cbiAqIElmIGEgUGxheWVyIGRpZXMgYWZ0ZXIgY29sbGVjdGluZyBhIFN0cmF3YmVycnkgYmVmb3JlIGNoYW5naW5nIFNjZW5lLCB0aGUgU3RyYXdiZXJyeSBpcyByZXN0b3JlZCBpbiB0aGUgU2NlbmVcbiAqIChhbmQgcmVtb3ZlZCBmcm9tIHRoZSBQbGF5ZXIncyBsaXN0IG9mIGNvbGxlY3RlZCBTdHJhd2JlcnJpZXMpXG4gKi9cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgVSwgVSwgbmV3IFRpbGVEYXRhKDEzKSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLnN0cmF3YmVycnlTb3VuZCk7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmFuc2l0aW9ucyBhcmUgU2NlbmVFbGVtZW50cyB0aGF0IHRyYW5zZmVyIGEgUGxheWVyIGZyb20gb25lIFNjZW5lIHRvIGFub3RoZXIgb24gY29udGFjdFxuICovXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0YXJnZXRTY2VuZSwgdGFyZ2V0WCwgdGFyZ2V0WSwgc3Bhd25Qb2ludEluZGV4ID0gMCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBTY2VuZSB0byB3aGljaCB0aGUgUGxheWVyIGlzIHRha2VuIHdoZW4gdG91Y2hpbmcgdGhlIFRyYW5zaXRpb25cbiAgICAgICAgICogQHR5cGUge1NjZW5lfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZSA9IHRhcmdldFNjZW5lO1xuICAgICAgICAvKipcbiAgICAgICAgICogeC1jb29yZGluYXRlIGluIHRoZSB0YXJnZXQgU2NlbmUgY29ycmVzcG9uZGluZyB0byB0aGlzLnggKHdoZW4gdGhlIFBsYXllciB0cmFuc2l0aW9ucyB0byB0aGUgdGFyZ2V0IFNjZW5lLFxuICAgICAgICAgKiBpdHMgcG9zaXRpb24gaXMgc2V0IHRvIGl0cyBjdXJyZW50IHgtcG9zaXRpb24gKyB0aGlzLnRhcmdldFggLSB0aGlzLnhcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiB5LWNvb3JkaW5hdGUgaW4gdGhlIHRhcmdldCBTY2VuZSBjb3JyZXNwb25kaW5nIHRvIHRoaXMueSAod2hlbiB0aGUgUGxheWVyIHRyYW5zaXRpb25zIHRvIHRoZSB0YXJnZXQgU2NlbmUsXG4gICAgICAgICAqIGl0cyBwb3NpdGlvbiBpcyBzZXQgdG8gaXRzIGN1cnJlbnQgeS1wb3NpdGlvbiArIHRoaXMudGFyZ2V0WSArIHRoaXMueVxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBpbmRleCBvZiB0aGUgc3Bhd24gcG9pbnQgKGluIHRoZSB0YXJnZXQgU2NlbmUncyBsaXN0IG9mIHNwYXduIHBvaW50cykgY29ycmVzcG9uZGluZyB0byB0aGUgVHJhbnNpdGlvblxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSBzcGF3blBvaW50SW5kZXg7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgdGhpcy50YXJnZXRTY2VuZS5yZXNldCgpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgcGxheWVyLm1ha2VUcmFuc2l0aW9uKHRoaXMpO1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIENydW1ibGluZ0Jsb2NrcyBhcmUgU29saWRzIHRoYXQgZGlzYXBwZWFyIHNob3J0bHkgYWZ0ZXIgYSBQbGF5ZXIgaGl0cyBpdCAob25seSB3aGVuIHRoZSBQbGF5ZXIgaXMgY29uc2lkZXJlZCB0byBiZVxuICogXCJjYXJyaWVkXCIgYnkgdGhlIENydW1ibGluZ0Jsb2NrKS5cbiAqIFRoZXkgcmVhcHBlYXIgYWZ0ZXIgYSBnaXZlbiB0aW1lIChpZiB0aGVyZSBhcmUgbm8gQWN0b3JzIG9uIHRoZWlyIHBvc2l0aW9uKVxuICovXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUsIFUsIG5ldyBUaWxlRGF0YSg1NykpO1xuICAgICAgICAvKipcbiAgICAgICAgICogV2hldGhlciB0aGUgYmxvY2sgaXMgZGlzYXBwZWFyaW5nXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciBkaXNhcHBlYXJhbmNlXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gMDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbWVyIGZvciByZWFwcGVhcmFuY2VcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5mYWxsIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDI7ICAgLy8gZHVyYXRpb24gYmVmb3JlIHJlYXBwZWFyaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5jb29sZG93biA8PSAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNob3VsZEJlY29tZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUgJiYgdGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZEJlY29tZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzaG91bGRCZWNvbWVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmNydW1ibGluZ0Jsb2NrU291bmQpO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gLjU7ICAvLyBkdXJhdGlvbiBiZWZvcmUgZGlzYXBwZWFyaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgc3VwZXIucmVzZXQoKTtcbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxwaGEgPSAyICogdGhpcy50aW1lcnMuZmFsbDtcbiAgICAgICAgICAgICAgICBjdHguc2F2ZSgpO1xuICAgICAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IGFscGhhO1xuICAgICAgICAgICAgICAgIHN1cGVyLmRyYXcoY3R4KTtcbiAgICAgICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBUcmlnZ2VyQmxvY2tzIGFyZSBTb2xpZHMgdGhhdCBzdGFydCBtb3Zpbmcgd2hlbiB0aGV5IGNhcnJ5IGFuIEFjdG9yXG4gKi9cbmNsYXNzIFRyaWdnZXJCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGV0aGVyIHRoZSBibG9jayBoYXMgYmVlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3IgYnV0IGhhcyBub3QgeWV0IHN0YXJ0ZWQgZXhlY3V0aW5nIHRoZSBtb3ZlbWVudCAoZHVyaW5nXG4gICAgICAgICAqIHRyaWdnZXIgZGVsYXkpXG4gICAgICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pc1RyaWdnZXJlZCA9IGZhbHNlO1xuICAgICAgICAvKipcbiAgICAgICAgICogVGltZSBkZWxheSBiZWZvcmUgdGhlIG1vdmVtZW50IHN0YXJ0cyB3aGVuIHRoZSBibG9jayBpcyB0cmlnZ2VyZWRcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsYXkgPSBkZWxheTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIG1vdmVtZW50IHRvIGV4ZWN1dGUgd2hlbiB0cmlnZ2VyZWQgYnkgYW4gQWN0b3JcbiAgICAgICAgICogQHR5cGUge0VmZmVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRpbGUgaW5kZXhlcyB0byB1c2Ugd2hlbiBkcmF3aW5nIHRoZSBUcmlnZ2VyQmxvY2sgb24gdGhlIFNjZW5lXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJbXX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlcyA9IG5ldyBBcnJheSgod2lkdGggLyBVKSAqIChoZWlnaHQgLyBVKSkuZmlsbCgwKS5tYXAoXyA9PiA2NCArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLnNoaWZ0WCA9IDA7XG4gICAgICAgIHRoaXMuc2hpZnRZID0gMDtcbiAgICAgICAgaWYgKHRoaXMuaXNUcmlnZ2VyZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy50cmlnZ2VyIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzVHJpZ2dlcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuYWRkRWZmZWN0KHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnNoaWZ0WSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmVmZmVjdHMuaW5jbHVkZXModGhpcy50cmlnZ2VyZWRNb3ZlbWVudCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyaWdnZXJlZE1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVFZmZlY3QodGhpcy50cmlnZ2VyZWRNb3ZlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgc2hvdWxkVHJpZ2dlciA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICBzaG91bGRUcmlnZ2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc2hvdWxkVHJpZ2dlcikge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnRyaWdnZXIgPSB0aGlzLmRlbGF5O1xuICAgICAgICAgICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuaXNUcmlnZ2VyZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyZWRNb3ZlbWVudC5yZXNldCgpO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGZvciAobGV0IHkgPSB0aGlzLnk7IHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDsgeSArPSBVKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB4ID0gdGhpcy54OyB4IDwgdGhpcy54ICsgdGhpcy53aWR0aDsgeCArPSBVKSB7XG4gICAgICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICAgICAgdGlsZXNldCxcbiAgICAgICAgICAgICAgICAgICAgMTYgKiAodGhpcy5zcHJpdGVJbmRleGVzW2luZGV4XSAlIDgpLCAxNiAqIH5+KHRoaXMuc3ByaXRlSW5kZXhlc1tpbmRleF0gLyA4KSxcbiAgICAgICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgICAgICB4ICsgdGhpcy5zaGlmdFgsIHkgKyB0aGlzLnNoaWZ0WSxcbiAgICAgICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBGYWxsaW5nQmxvY2sgZXh0ZW5kcyBUcmlnZ2VyQmxvY2sge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIGRlbGF5LCBtb3ZlbWVudCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBkZWxheSwgbW92ZW1lbnQpO1xuICAgICAgICBjb25zdCB3ID0gd2lkdGggLyBVO1xuICAgICAgICBjb25zdCBoID0gaGVpZ2h0IC8gVTtcbiAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzLmZpbGwoOSk7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1swXSA9IDM7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3IC0gMV0gPSA1O1xuICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXNbdyAqIChoIC0gMSldID0gMTY7XG4gICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogaCAtIDFdID0gMTg7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdyAtIDE7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVJbmRleGVzW2ldID0gNDtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogKGggLSAxKSArIGldID0gMTc7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZUluZGV4ZXNbdyAqIGldID0gODtcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlSW5kZXhlc1t3ICogaSArICh3IC0gMSldID0gMTA7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuLyoqXG4gKiBTcGlrZXNVcCBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyBkb3dud2FyZHMgb24gdGhlbVxuICovXG5jbGFzcyBTcGlrZXNVcCBleHRlbmRzIEhhemFyZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIFUsIFUgLyAyLCBuZXcgVGlsZURhdGEoNDAsIDAsIC1VIC8gMikpO1xuICAgIH1cblxuICAgIG9uQ29udGFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIubW92ZWRZIC0gdGhpcy5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzRG93biBhcmUgSGF6YXJkcyB0aGF0IGtpbGwgdGhlIFBsYXllciBpZiBpdCBtb3ZlcyB1cHdhcmRzIG9uIHRoZW1cbiAqL1xuY2xhc3MgU3Bpa2VzRG93biBleHRlbmRzIFNjZW5lRWxlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCBVLCBVIC8gMiwgbmV3IFRpbGVEYXRhKDQyKSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFkgLSB0aGlzLm1vdmVkWSA8IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG4vKipcbiAqIFNwaWtlc1JpZ2h0IGFyZSBIYXphcmRzIHRoYXQga2lsbCB0aGUgUGxheWVyIGlmIGl0IG1vdmVzIGxlZnR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc1JpZ2h0IGV4dGVuZHMgU2NlbmVFbGVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIFUgLyAyLCBVLCBuZXcgVGlsZURhdGEoNDEpKTtcbiAgICB9XG5cbiAgICBvbkNvbnRhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLm1vdmVkWCAtIHRoaXMubW92ZWRYIDwgMCkge1xuICAgICAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbi8qKlxuICogU3Bpa2VzVXAgYXJlIEhhemFyZHMgdGhhdCBraWxsIHRoZSBQbGF5ZXIgaWYgaXQgbW92ZXMgcmlnaHR3YXJkcyBvbiB0aGVtXG4gKi9cbmNsYXNzIFNwaWtlc0xlZnQgZXh0ZW5kcyBTY2VuZUVsZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHggKyBVIC8gMiwgeSwgVSAvIDIsIFUsIG5ldyBUaWxlRGF0YSg0MywgLVUgLyAyLCAwKSk7XG4gICAgfVxuXG4gICAgb25Db250YWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHBsYXllci5tb3ZlZFggLSB0aGlzLm1vdmVkWCA+IDApIHtcbiAgICAgICAgICAgIHBsYXllci5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZWdtZW50c092ZXJsYXAsXG4gICAgdGlsZXNldCxcbiAgICBUaWxlRGF0YSxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgRmFsbGluZ0Jsb2NrLFxuICAgIENydW1ibGluZ0Jsb2NrLFxuICAgIFNwaWtlc1VwLFxuICAgIFNwaWtlc0Rvd24sXG4gICAgU3Bpa2VzTGVmdCxcbiAgICBTcGlrZXNSaWdodCxcbn1cbiIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHNvdW5kID0gcmVxdWlyZSgnLi9zb3VuZCcpO1xuXG5jb25zdCBBTklNQVRJT05fU0xPV0RPV04gPSA2O1xuY29uc3QgQU5JTUFUSU9OX0lETEUgPSBbNCwgNF07XG5jb25zdCBBTklNQVRJT05fUlVOID0gWzEsIDZdO1xuY29uc3QgQU5JTUFUSU9OX0pVTVAgPSBbNiwgM107XG5jb25zdCBBTklNQVRJT05fRkFMTCA9IFs1LCAzXTtcbmNvbnN0IEFOSU1BVElPTl9ESUUgPSBbMCwgOF07XG5cbmNvbnN0IHNwcml0ZXNTaGVldHMgPSB7fTtcblxuXG5mdW5jdGlvbiBsb2FkU3ByaXRlcyhjb2xvcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldHNbY29sb3JdID0gaW1hZ2U7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBpbWFnZS5zcmMgPSBgaW1hZ2VzL2hlcm9fJHtjb2xvcn0ucG5nYDtcbiAgICB9KTtcbn1cblxuXG5jb25zdCBsb2FkQWxsU3ByaXRlcyA9IFByb21pc2UuYWxsKFtcbiAgICBsb2FkU3ByaXRlcygncmVkJyksXG4gICAgbG9hZFNwcml0ZXMoJ2dyZWVuJyksXG4gICAgbG9hZFNwcml0ZXMoJ2JsdWUnKSxcbl0pO1xuXG5cbmNsYXNzIFBsYXllciBleHRlbmRzIHBoeXNpY3MuQWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCwgY29sb3JOYW1lID0gJ2JsdWUnKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5jb2xvck5hbWUgPSBjb2xvck5hbWU7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IDE7XG4gICAgICAgIHRoaXMuc3ByaXRlX3JvdyA9IDE7XG4gICAgICAgIHRoaXMubmJfc3ByaXRlcyA9IDQ7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuXG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSB+fih0aGlzLmFuaW1hdGlvbl9jb3VudGVyIC8gQU5JTUFUSU9OX1NMT1dET1dOKTtcbiAgICAgICAgY29uc3Qgcm93ID0gNCAqIHRoaXMuc3ByaXRlX3JvdyArICh0aGlzLm5iRGFzaGVzID8gMCA6IDIpICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzcHJpdGVzU2hlZXRzW3RoaXMuY29sb3JOYW1lXSxcbiAgICAgICAgICAgIDE2ICogaW5kZXgsIDE2ICogcm93LFxuICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgdGhpcy54IC0gNCArIHRoaXMuc2hpZnRYLCB0aGlzLnkgLSAyICsgdGhpcy5zaGlmdFksXG4gICAgICAgICAgICAxNiwgMTYpO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB0aGlzLmFuaW1hdGlvbl9jb3VudGVyICs9IDE7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgJT0gdGhpcy5uYl9zcHJpdGVzICogQU5JTUFUSU9OX1NMT1dET1dOO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmNsZWFyKCk7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgIGlmIChzb2xpZC5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gc29saWQueSAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jYW5CZUNsaW1iZWQgJiYgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlTGVmdCA9IHRoaXMueCAtIHNvbGlkLnggLSBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsUmlnaHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiB0aGlzLnggPT09IHNvbGlkLnggKyBzb2xpZC53aWR0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBsYXllciBpcyBodWdnaW5nIGEgd2FsbFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzR3JvdW5kZWQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IGNvbnN0YW50cy5KVU1QX0dSQUNFX1RJTUU7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gY29uc3RhbnRzLlNUQVRFX0RBU0gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMudXBkYXRlQW5pbWF0aW9uKCk7XG5cbiAgICAgICAgdGhpcy5tb3ZlWCh0aGlzLnNwZWVkWCAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFggPSAwKTtcbiAgICAgICAgdGhpcy5tb3ZlWSh0aGlzLnNwZWVkWSAqIGRlbHRhVGltZSwgKCkgPT4gdGhpcy5zcGVlZFkgPSAwKTtcblxuICAgICAgICAvLyBpbnRlcmFjdCB3aXRoIFRoaW5nc1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnNjZW5lLnRoaW5ncykge1xuICAgICAgICAgICAgICAgIGlmICh0aGluZy5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKHRoaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGluZy5vbkNvbnRhY3RXaXRoKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnkgPj0gdGhpcy5zY2VuZS5oZWlnaHQpIHtcbiAgICAgICAgICAgIHRoaXMuZGllKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5keWluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NlbmUuc2hvdWxkUmVzZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmVydGljYWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbnB1dHMuanVtcEhlbGQgJiYgdGhpcy50aW1lcnMudmFySnVtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSwgLWNvbnN0YW50cy5KVU1QX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZGFzaCA+IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICgwIDwgdGhpcy50aW1lcnMuZGFzaCAmJiB0aGlzLnRpbWVycy5kYXNoIDw9IGNvbnN0YW50cy5EQVNIX1RJTUUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSB0aGlzLmRhc2hTcGVlZFg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gdGhpcy5kYXNoU3BlZWRZO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGVuZCBvZiBkYXNoXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNwZWVkID0gdGhpcy5kYXNoU3BlZWRYICYmIHRoaXMuZGFzaFNwZWVkWSA/IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5FTkRfREFTSF9TUEVFRDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRYKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGguc2lnbih0aGlzLmRhc2hTcGVlZFkpICogc3BlZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2hTcGVlZFkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSAqPSBjb25zdGFudHMuRU5EX0RBU0hfVVBfRkFDVE9SO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5ib3VuY2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gLWNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAtdGhpcy5pbnB1dHMueUF4aXMgKiBkYXNoU3BlZWQ7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICB0aGlzLmlucHV0cy5kYXNoUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV04gKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RBU0gpO1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyAtPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSB7XG4gICAgICAgIGxldCBkaWRKdW1wID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciAmJiB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPiAwKSB7XG4gICAgICAgICAgICAvLyByZWd1bGFyIGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWCArPSB0aGlzLmlucHV0cy54QXhpcyAqIGNvbnN0YW50cy5KVU1QX0hPUklaT05UQUxfQk9PU1Q7XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgJiYgKHRoaXMuaGFzV2FsbExlZnQgfHwgdGhpcy5oYXNXYWxsUmlnaHQpKSB7XG4gICAgICAgICAgICAvLyB3YWxsanVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCBkeCA9IHRoaXMuaGFzV2FsbExlZnQgPyAxIDogLTE7XG4gICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMuaGFzV2FsbFJpZ2h0KSB8fCAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMuaGFzV2FsbExlZnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWCA9IGR4ICogY29uc3RhbnRzLldBTExfSlVNUF9IU1BFRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bVggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggKz0gY29uc3RhbnRzLk1PTUVOVFVNX0ZBQ1RPUiAqIHRoaXMubW9tZW50dW1YO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtWSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSArPSBjb25zdGFudHMuTU9NRU5UVU1fRkFDVE9SICogdGhpcy5tb21lbnR1bVk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZEp1bXA7XG4gICAgfVxuXG4gICAgdXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAodGhpcy5pbnB1dHMueEF4aXMgIT09IDApIHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9IHRoaXMuaW5wdXRzLnhBeGlzO1xuXG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IC1jb25zdGFudHMuQ0xJTUJfVVBfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1pbih0aGlzLnNwZWVkWSArIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCBjb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWluKHRoaXMuc3BlZWRZICsgY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIGNvbnN0YW50cy5NQVhfRkFMTF9TUEVFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVBbmltYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9SVU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSlVNUCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXRlKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gbGVhdmUgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChuZXdTdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGVudGVyIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5qdW1wU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gY29uc3RhbnRzLlZBUl9KVU1QX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kLnBsYXlTb3VuZChzb3VuZC5kYXNoU291bmQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IGNvbnN0YW50cy5EQVNIX1RJTUUgKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgc291bmQucGxheVNvdW5kKHNvdW5kLmRpZVNvdW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSBjb25zdGFudHMuRFlJTkdfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSBjb25zdGFudHMuQk9VTkNFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbWFrZVRyYW5zaXRpb24odHJhbnNpdGlvbikge1xuICAgICAgICAvLyB2YWxpZGF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVUaGluZyhzdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzLmFkZChzdHJhd2JlcnJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNjZW5lLnNldFBsYXllcih1bmRlZmluZWQpO1xuICAgICAgICB0cmFuc2l0aW9uLnRhcmdldFNjZW5lLnNldFBsYXllcih0aGlzKTtcbiAgICAgICAgdHJhbnNpdGlvbi50YXJnZXRTY2VuZS5zcGF3blBvaW50SW5kZXggPSB0cmFuc2l0aW9uLnNwYXduUG9pbnRJbmRleDtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIGRpZSgpIHtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgICAgIGNvbnN0IHBvaW50ID0gdGhpcy5zY2VuZS5zcGF3blBvaW50c1t0aGlzLnNjZW5lLnNwYXduUG9pbnRJbmRleF07XG4gICAgICAgIHRoaXMueCA9IHBvaW50Lng7XG4gICAgICAgIHRoaXMueSA9IHBvaW50LnkgLSA2O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICBpZiAodGhpcy5uYkRhc2hlcyA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5uYkRhc2hlcyA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiBzb2xpZC54ICsgc29saWQud2lkdGggPT09IHRoaXMueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHNvbGlkLnggPT09IHRoaXMueCArIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBzZXRBbmltYXRpb24oc3ByaXRlX3JvdywgbmJfc3ByaXRlcykge1xuICAgICAgICBpZiAoc3ByaXRlX3JvdyAhPT0gdGhpcy5zcHJpdGVfcm93KSB7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZV9yb3cgPSBzcHJpdGVfcm93O1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG4gICAgICAgICAgICB0aGlzLm5iX3Nwcml0ZXMgPSBuYl9zcHJpdGVzO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbiAgICBsb2FkQWxsU3ByaXRlcyxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdpZHRoIG9mIHRoZSBTY2VuZSBpbiBwaXhlbHNcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlaWdodCBvZiB0aGUgc2NlbmUgaW4gcGl4ZWxzXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50aGluZ3MgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuc3Bhd25Qb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5zcGF3blBvaW50SW5kZXggPSAwO1xuICAgICAgICB0aGlzLnNob3VsZFJlc2V0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21KU09OKGRhdGEpIHtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoZGF0YS53aWR0aCAqIFUsIGRhdGEuaGVpZ2h0ICogVSk7XG4gICAgICAgIC8vIG1ha2Ugd2FsbHNcbiAgICAgICAgY29uc3Qgd2FsbHMgPSBbXG4gICAgICAgICAgICAgICAgbmV3IHBoeXNpY3MuU29saWQoMCwgLTEuNSAqIFUsIGRhdGEud2lkdGggKiBVLCAwKSxcbiAgICAgICAgICAgICAgICBuZXcgcGh5c2ljcy5Tb2xpZCgtLjUgKiBVLCAwLCAwLCBkYXRhLmhlaWdodCAqIFUpLFxuICAgICAgICAgICAgICAgIG5ldyBwaHlzaWNzLlNvbGlkKChkYXRhLndpZHRoICsgLjUpICogVSwgMCwgMCwgZGF0YS5oZWlnaHQgKiBVKSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3Qgd2FsbCBvZiB3YWxscykge1xuICAgICAgICAgICAgd2FsbC5jYW5CZUNsaW1iZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKHdhbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWFpbkxheWVyID0gZGF0YS5sYXllcnMuZmluZChsID0+IGwubmFtZSA9PT0gJ21haW4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYWluTGF5ZXIuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBtYWluTGF5ZXIuZGF0YVtpXTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB+fihpIC8gbWFpbkxheWVyLndpZHRoKSAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IChpbmRleCAtIDEpICUgOCxcbiAgICAgICAgICAgICAgICAgICAgeTogfn4oKGluZGV4IC0gMSkgLyA4KSxcbiAgICAgICAgICAgICAgICAgICAgc2hpZnRYOiAwLFxuICAgICAgICAgICAgICAgICAgICBzaGlmdFk6IDAsXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5kZXggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4ICsgVSAvIDIsIHkgKyBVIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzE6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zcGF3blBvaW50cy5wdXNoKHt4OiB4LCB5OiB5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzNzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0MDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLlNwaWtlc1VwKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQxOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzUmlnaHQoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TcGlrZXNEb3duKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3Bpa2VzTGVmdCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1ODpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OTpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2MTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFRoaW5nKG5ldyBwaHlzaWNzLkhhemFyZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRUaGluZyhuZXcgcGh5c2ljcy5TdHJhd2JlcnJ5KHggKyBVIC8gMiwgeSArIFUgLyAyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1NzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLkNydW1ibGluZ0Jsb2NrKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDUwOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUyOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDUzOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkVGhpbmcobmV3IHBoeXNpY3MuU3ByaW5nKHgsIHksIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUsIHRpbGVEYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuZTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgdGhpbmcgb2YgdGhpcy50aGluZ3MpIHtcbiAgICAgICAgICAgIHRoaW5nLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmJlZm9yZVVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53aWR0aCAtIGNvbnN0YW50cy5WSUVXX1dJRFRILFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYIDwgLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVpZ2h0IC0gY29uc3RhbnRzLlZJRVdfSEVJR0hULFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA8IC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zaG91bGRSZXNldCkge1xuICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMuc2hvdWxkUmVzZXQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChjb25zdCB0aGluZyBvZiB0aGlzLnRoaW5ncykge1xuICAgICAgICAgICAgdGhpbmcucmVzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5yZXNldCgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBmb3IgKGNvbnN0IHRoaW5nIG9mIHRoaXMudGhpbmdzKSB7XG4gICAgICAgICAgICB0aGluZy5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNvbGlkcykge1xuICAgICAgICAgICAgc29saWQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXdIVUQoY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIiNmZmZmZmZhYVwiO1xuICAgICAgICBjdHguZmlsbFJlY3QoMSwgMSwgNDIsIDEwKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiIzAwMDAwMFwiO1xuICAgICAgICBjdHgudGV4dEFsaWduID0gXCJyaWdodFwiO1xuICAgICAgICBjdHguZm9udCA9ICdub3JtYWwgNnB4IGdhbWVib3knO1xuICAgICAgICBjdHguZmlsbFRleHQoYCR7dGhpcy5wbGF5ZXIuc3RyYXdiZXJyaWVzLnNpemUgKyB0aGlzLnBsYXllci50ZW1wb3JhcnlTdHJhd2JlcnJpZXMuc2l6ZX0vMjBgLCA0MCwgOCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UocGh5c2ljcy50aWxlc2V0LCA4MCwgMTYsIDE2LCAxNiwgMiwgMiwgOCwgOCk7XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWN0b3IocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZFRoaW5nKHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGhpbmdzLmFkZCh0aGluZyk7XG4gICAgICAgIHRoaW5nLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVUaGluZyh0aGluZykge1xuICAgICAgICB0aGlzLnRoaW5ncy5kZWxldGUodGhpbmcpO1xuICAgICAgICB0aGluZy5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2NlbmUsXG59XG4iLCJjb25zdCBqdW1wU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2p1bXAub2dnJyk7XG5jb25zdCBkYXNoU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2Rhc2hfcGlua19sZWZ0Lm9nZycpO1xuY29uc3QgZGllU291bmQgPSBuZXcgQXVkaW8oJ3NvdW5kL2NoYXJfbWFkX2RlYXRoLm9nZycpO1xuY29uc3QgY3J1bWJsaW5nQmxvY2tTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fZmFsbGJsb2NrX3NoYWtlLm9nZycpO1xuY29uc3Qgc3RyYXdiZXJyeVNvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zdHJhd2JlcnJ5X3JlZF9nZXRfMXVwLm9nZycpO1xuY29uc3QgZGFzaERpYW1vbmRTb3VuZCA9IG5ldyBBdWRpbygnc291bmQvZ2FtZV9nZW5fZGlhbW9uZF90b3VjaF8wMS5vZ2cnKTtcbmNvbnN0IHNwcmluZ1NvdW5kID0gbmV3IEF1ZGlvKCdzb3VuZC9nYW1lX2dlbl9zcHJpbmcub2dnJyk7XG5sZXQgc291bmRPbiA9IHRydWU7XG5cblxuZnVuY3Rpb24gdG9nZ2xlU291bmQoKSB7XG4gICAgc291bmRPbiA9ICFzb3VuZE9uO1xuICAgIHJldHVybiBzb3VuZE9uO1xufVxuXG5cbmZ1bmN0aW9uIHBsYXlTb3VuZChzb3VuZCkge1xuICAgIGlmIChzb3VuZE9uKSB7XG4gICAgICAgIHNvdW5kLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgc291bmQucGxheSgpO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwbGF5U291bmQsXG4gICAgdG9nZ2xlU291bmQsXG4gICAganVtcFNvdW5kLFxuICAgIGRhc2hTb3VuZCxcbiAgICBkaWVTb3VuZCxcbiAgICBjcnVtYmxpbmdCbG9ja1NvdW5kLFxuICAgIHN0cmF3YmVycnlTb3VuZCxcbiAgICBkYXNoRGlhbW9uZFNvdW5kLFxuICAgIHNwcmluZ1NvdW5kLFxufSJdfQ==
