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
const maps = require('./maps');
const inputs = require('./inputs');
const player = require('./player');
const tiles = require('./tiles');
const sprites = require('./sprites');

const SCALING = 4;
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
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;
    const canvas = document.getElementById("layer1");
    context = canvas.getContext('2d');

    canvas.width = SCALING * constants.VIEW_WIDTH;
    canvas.height = SCALING * constants.VIEW_HEIGHT;
    context.scale(SCALING, -SCALING);
    context.translate(0, -constants.VIEW_HEIGHT);
    context.imageSmoothingEnabled = false;

    currentScene = maps.CELESTE_01;
    let p = new player.Player(currentScene.startPositionX, currentScene.startPositionY);
    currentScene.setPlayer(p);
    window.keymap = p.inputs.keymap;
    start();
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

},{"./constants":1,"./inputs":2,"./maps":4,"./player":7,"./sprites":9,"./tiles":10}],4:[function(require,module,exports){
"use strict"
const scene = require('./scene');
const movement = require('./movement');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;


function makeTransitionUp(scene1, x1, y1, scene2, x2, y2, width) {
    scene1.addElement(new physics.Transition(
        x1 * U, (y1 + 1) * U, width * U, 0, scene2, x2 * U, (y2 + 3) * U
    ));
    scene2.addElement(new physics.Transition(
        x2 * U, (y2 - 1) * U, width * U, 0, scene1, x1 * U, (y1 - 3) * U
    ));
}

function makeTransitionRight(scene1, x1, y1, scene2, x2, y2, height) {
    scene1.addElement(new physics.Transition(
        x1 * U, y1 * U, 0, height * U, scene2, (x2 + 1) * U, y2 * U
    ));
    scene2.addElement(new physics.Transition(
        x2 * U, y2 * U, 0, height * U, scene1, (x1 - 1) * U, y1 * U
    ));
}


// const CELESTE_01 = scene.Scene.fromString(`\
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     xxxx
// xx  x xxx    xxxxxxxxx              xxxx
// xx  x   x    xxxxx   x             xxxxx
// xx  xxx x    xxx     x             xxxxx
// xx  x   x    xxx                  xxxxxx
// xx  x   x    xxx                   xxxxx
// xx  xxxxx                          xxxxx
// xx                             xxxxxxxxx
// xx                             xxxxxxxxx
// x                              xxxxxxxxx
// x                 xxxx           !xxxxxx
// x                 x  x           !xxxxxx
// x                 x  x              xxxx
// x                 xxxx              xxxx
// x                 xxxx              xxxx
// x                 xxxx!!!!          xxxx
// x         xxx     xxxxxxxx           xxx
// x  P      xxx     xxxxxxxx           xxx
// xxxxx     xxx!!!!!xxxxxxxx            xx
// xxxxx     xxxxxxxxxxxxxxxx!!!          x
// xxxxx!!!!!xxxxxxxxxxxxxxxxxxx          x
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x`);

const CELESTE_01 = scene.Scene.fromJSON({ "compressionlevel":-1,
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
            "data":[10, 12, 18, 18, 13, 10, 10, 10, 12, 18, 18, 18, 18, 13, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 18, 18, 3221225477, 3221225477, 3221225476, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 12, 18, 18, 18, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 12, 18, 3221225476, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 3221225476, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 10, 10, 10, 10, 10, 11, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 3221225478, 3221225477, 3221225476, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 3221225478, 3221225477, 3221225477, 3221225477, 3221225476, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 10, 10, 10, 10, 12, 3221225476, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3221225478, 18, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1610612809, 9, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1610612809, 3221225478, 3221225477, 13, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 73, 73, 73, 73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3221225478, 13, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 2, 3, 0, 0, 0, 0, 0, 9, 10, 10, 20, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3221225478, 13, 10, 20, 2, 2, 2, 3, 0, 0, 0, 0, 0, 9, 10, 11, 73, 73, 73, 73, 73, 9, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3221225478, 13, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 11, 73, 73, 73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 73, 73, 73, 73, 73, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 20, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 20, 5, 5, 5, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9],
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
            "source":"forest.tsx"
        }],
    "tilewidth":16,
    "type":"map",
    "version":1.2,
    "width":40
});
CELESTE_01.setStartPosition(3 * U, 5 * U);

// const CELESTE_02 = scene.Scene.fromString(`\
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xx
// xxx     xx    x xxxxxxxxxxxxxxxxxx    xx
// xxx     xx    x     xxxxx  xxxxxxx    xx
// xxxxxxxxxx    x     xxxxx    xxxxx    xx
// xxx     x     x     xxxxx    xxxxx    xx
// xxxxxxxxx  S         xxxx    xxxxx    xx
// xxx     x            xxx        xx    xx
// xxxxxxxxx            xxx        xx    xx
// xx                   xxx        xx    xx
// xx                              xx    xx
// xx                               x    xx
// xx                               x    xx
// x                                     xx
// x                   !!!!!             xx
// x                   xxxxx             xx
// x                   xxxxx       xxxxxxxx
// x                   xxxx        xxxxxxxx
// x             B      xxx        xxxxxxxx
// x             xx     xxx    xxxxxxxxxxxx
// x  P          xx     xxx!!  xxxxxxxxxxxx
// x-----xxxxxxxxxx     xxxxx!!xxxxxxxxxxxx
// x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx
// x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx`);

const CELESTE_02 = scene.Scene.fromJSON({ "compressionlevel":-1,
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
            "data":[10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 18, 18, 18, 18, 12, 18, 13, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 11, 0, 17, 18, 18, 18, 13, 10, 10, 10, 12, 18, 18, 13, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 17, 18, 13, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 19, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 3221225476, 0, 0, 0, 0, 0, 17, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 19, 0, 0, 0, 0, 17, 18, 18, 13, 11, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 12, 18, 18, 18, 18, 18, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 18, 19, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 11, 0, 0, 0, 0, 9, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 9, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3221225476, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 73, 73, 73, 73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 12, 19, 0, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 21, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 17, 13, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 0, 9, 10, 11, 0, 0, 0, 0, 1, 2, 2, 2, 21, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 11, 73, 73, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 46, 47, 47, 47, 48, 1, 2, 2, 2, 5, 6, 16, 16, 9, 11, 0, 0, 0, 0, 0, 9, 10, 20, 5, 6, 73, 73, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 20, 5, 5, 21, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 11, 0, 0, 9, 11, 0, 0, 0, 0, 0, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
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
            "source":"forest.tsx"
        }],
    "tilewidth":16,
    "type":"map",
    "version":1.2,
    "width":40
});
CELESTE_02.setStartPosition(3 * U, 3 * U);
makeTransitionUp(CELESTE_01, 31, 23, CELESTE_02, 1, 0, 5);


const CELESTE_03 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xxx
xxxxxx         xxxxxxxxxxxx    xx    xxx
xxxxxx         xx         x     x    xxx
xx                        x          xxx
xx                                   xxx
x                                    xxx
x                                     xx
x        xxx                   xxx    xx
x        xxx                   xxx    xx
x          x                   xxx    xx
x          x                   xx     xx
x          x    x              xx      x
x               x              xx      x
x               xxxx            x      x
x               xxxx                   x
x               xxxx      !!!      S   x
x                 xx      xxx!!!!!     x
x                 xx      xxxxxxxx    !x
xx                 x   !!!xxxxxxxx!!!!xx
xx  P                  xxxxxxxxxxxxxxxxx
xx----xxx              xxxxxxxxxxxxxxxxx
xx    xxx              xxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_02, 34, 23, CELESTE_03, 2, 0, 4);


const CELESTE_04 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxx
xxxxxxxxxxxx      xxx    xxxxxxxxxx xxxx
xxxxxx            xxx      xxxxx    xxxx
xxxxx             xxx      !xxxx    xxxx
xxx                 x      !xxxx      xx
xxx                 x      !xxxx      xx
xxx                        !xx        xx
xxx                          x        xx
xxx     xx--                 x        xx
xxx     xx                   x        xx
xxx     xx                   x        xx
xxx     !x                            xx
xxx     !x!!                           x
xx!     !xxx                           x
xx!     !xx                            x
xx!                                    x
xx!                                    x
xxx                                    x
xxx  P                                 x
xxx----xxxx                            x
xxx    xxxx                            x
xxx    xxxx                            x`);

CELESTE_04.addSolid(new physics.TriggerBlock(14 * U, 11 * U, 3 * U, 2 * U, new movement.SequenceMovement([
    new movement.Movement(0.5),
    new movement.LinearMovement(14 * U, 11 * U, 23 * U, 12 * U, .5),
    new movement.Movement(1),
    new movement.LinearMovement(23 * U, 12 * U, 14 * U, 11 * U, 1),
])));
makeTransitionUp(CELESTE_03, 33, 23, CELESTE_04, 3, 0, 4);


const CELESTE_05 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxx
xxxxxx             xxx    xxxxxxxxxxxxxx
xxxx                                xxxx
xxxx                                  xx
xxxx                                  xx
xx                     xxx             x
xx                xxxxxxxx             x
xx                xxxxxxxx             x
xx            S    xxxxxxx    ===      x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                     xxx             x
x                      xx   ===        x
x                      xx              x
x                       x              x
x                       x         ===  x
x                                      x
x                                      x
x  x          xx             ===       x
xxxx  P       xx                       x
xxxx----xxxxxxxxxxxxxxxxxx             x
xxxx    xxxxxx  xxxxxxxxxx             x`);

makeTransitionUp(CELESTE_04, 21, 23, CELESTE_05, 4, 0, 4);


const CELESTE_06 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   xx
xx         xxxxxxxxxxxxxxxxxxxxxxxx   xx
xx         xxxxxxxxxxxxxxxxxxxxxxxx   xx
xx            xxxxxxxxxxxxxxxxxxxxx   xx
xx S          xxx    xxxxxxxxxxxxxx   xx
xx                   xxxxxxxxxxx! x   xx
xxx                   xx  xxxxxx!      x
xxx                          xxx!      x
xxxxx                        xxx!      x
xx                           xxx!      x
x     !!!                     xx!      x
x     xxx                     xxx      x
x     xxx                     xxx      x
x      xx                      xx      x
x      xx                      xx      x
x                                   B  x
x                                   xx x
x                                   xxxx
x                                   xxxx
x                       xxx         xxxx
x                       xxx         xxxx
x!                   !!!xxx         xxxx
xx    !!!            xxxxxx          xxx
xx!!!!xxx            xxxxxx          xxx
xxxxxxxxx!!!!    !!!!xxxxxx          xxx
xxxxxxxxxxxxx    xxxxxxxxxxx         xxx
xxxxxxxxxxxxx    xxxxx  xxxx          xx
xxxxxxx            xx   xxx           xx
xxxxxx                  xx            xx
xxx                      x            xx
                         x              
                         x              
                         x              
xx  P      xx    xxx     xxx            
xxx----xxxxxx    xxx!!!!!xxx        ---x
xxx    xxxxxxxxxxxxxxxxxxxxx           x`);

CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, U, 4 * U, 2 * U, new movement.SequenceMovement([
    new movement.Movement(0.5),
    new movement.LinearMovement(13 * U, U, 13 * U, 9 * U, .3),
    new movement.Movement(1),
    new movement.LinearMovement(13 * U, 9 * U, 13 * U, U, 1),
])));
makeTransitionUp(CELESTE_05, 22, 23, CELESTE_06, 3, 0, 4);


const CELESTE_07 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxx       xxxxxxxx!   xxxxxxxxxx
xxxxxxxxx           xxxxxx!   xxxxxxxxxx
xxxxxxxxx           xxxxxx!   xxxxxxxxxx
xxxxxxxxx            xxxxx!   xxxxxxxxxx
xxxxxxxxx            xxxxx!   xxxxxxxxxx
xxxxxxxxx     !       xxxx!   xxxxxxxxxx
xxxxxxxxx     x        xxx!   xxxxxxxxxx
xxxxxxxxx     x        xxx!   xxxxxxxxxx
xxxxxxxxx!    x        xxx!   xxxxxxxxxx
xxxxxxxxxx    x        xxx!   xxxxxxxxxx
xxxxxxxxxx    xB       xxx!   xxxxxxxxxx
xxxxxxxxxx    xxx--   xxxx!   xxxxxxxxxx
xxxxxxxxxx   !xxx     xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxx     xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxxx----xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxxx      xx!   xxxxxxxxxx
xxxxxxxxxx   xxx        xx!   xxxxxxxxxx
xxxxxxxxxx!  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx!!!     xx!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx      x!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx      x!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx           xxxxxxxxxx
xxxxxxxxxx   xxxxxxxxx                xx
xxxxxxxxxx      xxxxxx                xx
xxxxxxxxx           xx                 x
xxxxxxxxx           xxx---xxxx----      
xxxxxxxxx        S        xxx           
xxxxxxxxx                 xxx        P  
xxxxxxxxx         xxxxxxxxxxx    xxxxxxx
xxxxxxxxx!!!!!!!xxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxx  xxxxxxxxxxxxxxxxxxxxxx`);

makeTransitionRight(CELESTE_07, 40, 3, CELESTE_06, 0, 3, 3);


const CELESTE_08 = scene.Scene.fromString(`\
xxx                                     
xxx                                     
xxx                                     
xxx                                     
xxx                     !!!!            
xxx                 !!!!xxxx            
xxxxx     !!!!!!    xxxxxxxx            
          xxxxxx    xxxxxx              
          xxxxxx    xx                  
          xxxxxx D  x                   
          xxxxxx    x                 xx
xxxxxx    xxxxxx               xx----xxx
xxxx x    xxxxxx           --xxxx    xxx
xx   x    xxxxx              xxxx S  xxx
xx        xxxxx                      xxx
x         xxxx                       xxx
x         xxxx                       xxx
x         xxxx            -----xxxxxxxxx
x       xxxxxx              !!!xxxxxxxxx
x       xxxxxx        !!!!!!xxxxxxxxxxxx
x P     xxxxxx!!      xxxxxxxxxxxxxxxxxx
x---xxxxxxxxxxxx!!!!!!xxxxxxxxxxxxxxxxxx
x   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_06, 35, 36, CELESTE_08, 1, 0, 3);


const CELESTE_09 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxx          xxxx  xxxxxxxxxxxxxxxxxxxxx
xxx                xxx  xxxx    xxxxxxxx
x                  xx            xxxxxxx
                   xx            xxxxxxx
         !xxxxx----xx        S    xxxxxx
         !xxxxx                   xxxxxx
  P      !xxxxx                  xxxxxxx
xx---    !xxx                   xxxxxxxx
xx       !xxx            xxxxxxxxxxxxxxx
xx       !xx               xxxxxxxxxxxxx
xx   !!  !xx                   xxxxxxxxx
xx!!!xx  !xx                   xxxxxxxxx
xxxxxxx                          xxxxxxx
xxxxxxx                           xxxxxx
xxxxxxx                           x  xxx
xxxxxxx                              xxx
xxxxxxx                              xxx
xxxxxxx                              xxx
xxxx!                                 xx
xxxx!                                 xx
xxxx!                                  x`);

CELESTE_09.addSolid(new physics.TriggerBlock(14 * U, 3.5 * U, 2 * U, 3 * U, new movement.SequenceMovement([
    new movement.Movement(.5),
    new movement.LinearMovement(14 * U, 3.5 * U, 21 * U, 7.5 * U, .5),
    new movement.Movement(1),
    new movement.LinearMovement(21 * U, 7.5 * U, 14 * U, 3.5 * U, 1.5),
])));
makeTransitionRight(CELESTE_06, 40, 2, CELESTE_09, 0, 14, 4);


const CELESTE_10 = scene.Scene.fromString(`\
xx   xxxx                          xxxxx
xx   xxx                           xxxxx
xx   xx                            xxxxx
xx                                 xxxxx
xx                                  xxxx
xx        xxx                       xxxx
xx        xxx                       xxxx
xx        xxx                           
          x                                       
                                        
                                     P  
                                    xxxx
xxxxxx                              xxxx
xxxxxx                               xxx
xxxxxx                               xxx
xxxxxx         D                     xxx
xxxxxxxxx                            xxx
xxxxxxxxx                            xxx
xxxxxxxxx                    xxxx    xxx
xxxxxxxxx!!                  xxxxxxxxxxx
xxxxxxxxxxx!!!!!!!!!!!!!     xxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxx!!!!!xxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
makeTransitionRight(CELESTE_10, 40, 12, CELESTE_08, 0, 12, 4);


const CELESTE_11 = scene.Scene.fromString(`\
xxxxxxx                                xxxxxxxxx
xxxxxxx                                xxxxxxxxx
xxxxx           !!                        xxxxxx
xx              xx                        xxxxxx
xx              xx                        xxxxxx
xx  S           xx                        xxxxxx
xx              xx                         xxxxx
xx                                         xxxxx
xx xxxxxx              !!                   xxxx
xx xxxxxx              xx           !       xxxx
xx xxxxxx              xx           x!      xxxx
xx xxxxxx--     D      xx          !xx      xxxx
xx xxxxxx              xx          xxx!     xxxx
xx xxxxxx              !!          xxxx     xxxx
xx x  xxx                          !!!!      xxx
xx     x                                     xxx
xx     x                                     xxx
xx     x                                     xxx
xx   xxx!!!!      !!!!!!    B                xxx
xx   xxxxxxx!!!!!!xxxxxx!!!!xxxx             xxx
xxx  xxxxxxxxxxxxx  xxxxxxxxxxxx    B     P  xxx
xxx  xxx   x     x      x    xxxxxxxxxxxxx-- xxx
xxx  xxx   x     x      x    xxxxxxxxxxxxx   xxx`);
makeTransitionUp(CELESTE_10, 2, 23, CELESTE_11, 42, 0, 3);


const CELESTE_12 = scene.Scene.fromString(`\
xxx  xxx   x     x      x    xxxxxxxxxxx
xxx  xxxxxxxxx   x  xxxxxxxxxxxxxxxxxxxx
xxx  xx    xxxxxxxxxxxxx  xxxxxxxxxxxxxx
xxx==xx                       xxxxxxxxxx
xxx                           xxxxxxxxxx
xxx                           xxxxxxxxxx
xx                             xxxxxxxxx
xx                                xxxxxx
xx                                      
xxxxxxx                                 
xxxxxxx                                 
xxxxxxx                              P  
xx    x                     xxxxxxxxxxxx
x                             xxxxxxxxxx
x                              xxxxxxxxx
x                              xxxxxxxxx
x                              xxxxxxxxx
xxx                           xxxxxxxxxx
xxx                      xxxxxxxxxxxxxxx
xxx         xxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
makeTransitionRight(CELESTE_12, 40, 11, CELESTE_10, 0, 11, 4);
makeTransitionUp(CELESTE_12, 3, 23, CELESTE_11, 3, 0, 2);


const CELESTE_13 = scene.Scene.fromString(`\
    xxxxxxxxxxx!                                 
    xxxxxxxxxxx!                                 
    x  xxxxxxxx!                                 
    x  xxxxxxxx!                                 
    x    xxxxxx!                                 
         xxxxxx!                                 
         xxxxx                                   
         xxxxx                                   
          xxxx    D           xxxx               
  P       xxxx           -----xxxx               
xxx---    xxxx                xxxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                  xxxxxxxxxxxxxxxxx
xxx   !!!!x                     xxxxxxxxxxxxxxxxx
xxx   ----x                      xxxxxxxxxxxxxxxx
xxx       x                      xxxxxxxxxxxxxxxx
xxx                              xxxxxxxxxxxxxxxx
xxx                               xxxxxxxxxxxxxxx
xxx                               xxxxxxxxxxxxxxx
xxx     xxxxx                     xxxxxxxxxxxxxxx
xxx     xxxxx                     xxxxxxxxxxxxxxx`);

makeTransitionRight(CELESTE_08, 40, 13, CELESTE_13, 0, 13, 10);


const TEST_LEVEL = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxx                             xxxxxxxxxxxxxxx               xxxxxx
xxxxx                             xxxxxx                            xx
x                                     xx                            xx
x                     xx              xx                            xx
x                     xx              xx                            xx
x                                     xxxxx                       xxxx
x                                     xx                            xx
x                           xxxx      xx                            xx
x          xxxxxxx          xxxx      xx                            xx
x          xxxxxxxxx      xxxx        xx                            xx
x          xxxxxxxxxxxxxxxxxxx        xx                            xx
x!!        xxxxxxxxx       xxx                                    xxxx
xxx!!xx    xxxxxxxxx       x                                        xx
xxxxxxx                    x                                        xx
xxxxxxx                x   x                                        xx
xxxxxxx                x           !!!xx                            xx
xxx                    x          !xxxxx                            xx
xxx              P     x          !xxxxx                         xxxxx
xxx            xxxx    x          !xxxxx!!!!!!!!!!       !!!!!!!!xxxxx
xxx           !xxxx    xxxx       !xxxxxxxxxxxxxx!!!!!!!!!xxxxxxxxxxxx
xxxxxxxx!!!!!!!xxxx    xxxx!!!!!!!!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);

TEST_LEVEL.addElement(
    new physics.Hazard(7 * U, 20 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(7 * U, 20 * U, 7 * U, 2 * U, 1),
            new movement.Movement(1.5),
            new movement.LinearMovement(7 * U, 2 * U, 7 * U, 20 * U, 1),
        ], -1)));
TEST_LEVEL.addElement(
    new physics.Hazard(11 * U, 20 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(11 * U, 20 * U, 11 * U, 14 * U, .25),
            new movement.Movement(1.5),
            new movement.LinearMovement(11 * U, 14 * U, 11 * U, 20 * U, .25),
        ], -1)));
TEST_LEVEL.addElement(
    new physics.Hazard(U, 18 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(U, 18 * U, 20 * U, 18 * U, 1),
            new movement.Movement(1.5),
            new movement.LinearMovement(20 * U, 18 * U, U, 18 * U, 1),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, U)
        .setMovement(new movement.SequenceMovement([
            new movement.SineMovement(52 * U, 6 * U, 52 * U, 14 * U, 2, 3),
            new movement.Movement(2),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, U)
        .setMovement(new movement.SineMovement(55 * U, 16 * U, 60 * U, 16 * U, 2, -1)));


module.exports = {
    CELESTE_01,
    CELESTE_02,
    CELESTE_03,
    CELESTE_04,
    CELESTE_05,
    CELESTE_06,
    CELESTE_07,
    CELESTE_08,
    CELESTE_09,
    TEST_LEVEL,
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


class SineMovement
    extends Movement {
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
const tiles = require('./tiles');
const U = constants.GRID_SIZE;


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


function alphaToString(alpha) {
    if (alpha >= 1) {
        return 'ff';
    } else if (alpha <= 0) {
        return '00';
    } else {
        return ("0" + Math.floor(256 * alpha).toString(16)).substr(-2);
    }
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
                tiles.tilesSheet.canvas,
                tiles.tilesSheet.offsets[this.tileData.set] + 16 * (this.tileData.index - 1), 16 * this.tileData.rotation,
                16, 16,
                this.x, this.y,
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
            return dx;
        }
        return 0;
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
            return dy;
        }
        return 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.movedX = 0;
        this.movedY = 0;
    }

    isRiding(solid) {
        return this.y === solid.y + solid.height && segmentsOverlap(this.x, this.width, solid.x, solid.width);
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
                                actor.movedX += actor.moveX(this.x + this.width - actor.x, () => actor.squish());

                            } else if (riding.has(actor)) {
                                if (actor.movedX <= 0) {
                                    actor.movedX += actor.moveX(moveX);
                                } else if (actor.movedX < moveX) {
                                    actor.movedX += actor.moveX(moveX - actor.movedX);
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
                                    actor.movedX += actor.moveX(moveX);
                                } else if (actor.movedX > moveX) {
                                    actor.movedX += actor.moveX(moveX - actor.movedX);
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
                                    actor.movedY += actor.moveY(moveY);
                                } else if (actor.movedY < moveY) {
                                    actor.movedY += actor.moveY(moveY - actor.movedY);
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
                                    actor.movedY += actor.moveY(moveY);
                                } else if (actor.movedY > moveY) {
                                    actor.movedY += actor.moveY(moveY - actor.movedY);
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

    interactWith(player) {
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
        super(x, y + U / 2, width, U / 2, tileData);
        this.color = "#a8612a";
    }

    collidesWithMovingActor(actor, dx = 0, dy = 0) {
        if (dy < 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width) &&
                actor.y >= this.y + this.height &&
                actor.y + dy < this.y + this.height;
        }
        return false;
    }

    draw(ctx) {
        if (this.tileData !== undefined) {
            ctx.drawImage(
                tiles.tilesSheet.canvas,
                tiles.tilesSheet.offsets[this.tileData.set] + 16 * (this.tileData.index - 1), 16 * this.tileData.rotation,
                16, 16,
                this.x, this.y - this.height,
                8, 8);
        } else {
            super.draw(ctx);
        }
    }
}


class Spring extends Thing {
    constructor(x, y) {
        super(x, y, 2 * U, U / 2);
        this.color = "#dedf35";
    }

    interactWith(player) {
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
    }
}


class DashDiamond extends Thing {
    constructor(x, y) {
        super(x + .5 * U, y + .5 * U, U, U);
        this.color = "#79ff00";
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    interactWith(player) {
        if (player.restoreDash()) {
            this.isActive = false;
            this.timers.cooldown = 2;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        if (this.isActive) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}


class Strawberry extends Thing {
    constructor(x, y) {
        super(x + .5 * U, y + .5 * U, U, U);
        this.color = "#ff009a";
    }

    interactWith(player) {
        player.temporaryStrawberries.add(this);
        this.isActive = false;
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        if (this.isActive) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}


class Transition extends Thing {
    constructor(x, y, width, height, targetScene, targetX, targetY) {
        super(x, y, width, height);
        this.targetScene = targetScene;
        this.targetX = targetX;
        this.targetY = targetY;
    }

    interactWith(player) {
        player.transitionScene(this.targetScene);
        player.x += this.targetX - this.x;
        player.y += this.targetY - this.y;
        this.scene.transition = this;
    }
}


class CrumblingBlock extends Solid {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.isFalling = false;
        this.timers.fall = 0;
        this.timers.cooldown = 0;
        this.color = "#323232";
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isFalling) {
            if (this.timers.fall <= 0) {
                this.isFalling = false;
                this.isActive = false;
                this.timers.cooldown = 4;
            }
        } else if (!this.isActive) {
            if (this.timers.cooldown <= 0) {
                this.isActive = true;
            }
        } else {
            if (this.scene.player && this.scene.player.isRiding(this)) {
                this.isFalling = true;
                this.timers.fall = 1;
            }
        }
    }

    draw(ctx) {
        if (this.isActive) {
            if (this.isFalling) {
                const alpha = this.timers.fall;
                ctx.fillStyle = this.color + alphaToString(alpha);
                ctx.fillRect(this.x, this.y, this.width, this.height);
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }
}


class TriggerBlock extends Solid {
    constructor(x, y, width, height, movement) {
        super(x, y, width, height);
        this.triggeredMovement = movement;
        this.color = "#3b3b3b";
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
}


module.exports = {
    segmentsOverlap,
    alphaToString,
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
}

},{"./constants":1,"./tiles":10}],7:[function(require,module,exports){
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
    constructor(x, y) {
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
            this.x - 4, this.y,
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
                if (this.y === solid.y + solid.height && physics.segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                    // player is standing on a solid
                    this.carryingSolids.add(solid);
                    this.isGrounded = true;
                }
                if (physics.segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
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

        // set color
        this.color = this.nbDashes > 0 ? '#a63636' : '#3fb0f6';
        if (this.state === constants.STATE_DEAD) {
            this.color = "" + this.color + physics.alphaToString(this.timers.dying / constants.DYING_TIME);
        }

        // interact with objects
        for (const element of this.scene.elements) {
            if (element.isActive && this.overlaps(element)) {
                element.interactWith(this);
            }
        }

        if (this.y <= -this.height) {
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
                    this.speedY = Math.max(this.speedY, constants.JUMP_SPEED);
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
                    if (this.dashSpeedY > 0) {
                        this.speedY *= constants.END_DASH_UP_FACTOR;
                    }
                    this.setState(constants.STATE_NORMAL);
                }
                break;
            case constants.STATE_BOUNCE:
                if (this.timers.bounce > 0) {
                    this.speedY = constants.BOUNCE_SPEED;
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
            this.dashSpeedY = this.inputs.yAxis * dashSpeed;
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
            this.speedY = constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        } else if (this.inputs.jumpPressedBuffer && (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            this.inputs.jumpPressedBuffer = false;
            let dx = this.hasWallLeft ? 1 : -1;
            this.speedX = dx * constants.WALL_JUMP_HSPEED;
            this.speedY = constants.JUMP_SPEED;
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
                    this.speedY = constants.CLIMB_UP_SPEED;
                } else {
                    this.speedY = Math.max(this.speedY - constants.GRAVITY * deltaTime, -constants.CLIMB_SLIP_SPEED);
                }
            } else {
                this.speedY = Math.max(this.speedY - constants.GRAVITY * deltaTime, -constants.MAX_FALL_SPEED);
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

    transitionScene(targetScene) {
        // validate temporary strawberries
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.scene.removeElement(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        this.scene.setPlayer(undefined);
        targetScene.setPlayer(this);
    }

    die() {
        // reactivate temporary strawberries
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.isActive = true;
        }
        this.temporaryStrawberries.clear();
        this.setState(constants.STATE_DEAD);
        this.setAnimation(...ANIMATION_DIE);
    }

    respawn() {
        this.x = this.scene.startPositionX;
        this.y = this.scene.startPositionY;
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
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = U / 2;
        this.solids = new Set();
        this.actors = new Set();
        this.elements = new Set();
        this.transition = undefined;
        this.player = undefined;
        this.startPositionX = undefined;
        this.startPositionY = undefined;
    }

    setStartPosition(x, y) {
        this.startPositionX = x;
        this.startPositionY = y;
    }

    static fromString(s) {
        const lines = s.split('\n');
        const height = lines.length;
        const width = lines[0].length;
        const scene = new Scene(width * U, height * U);
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines[i].length; j++) {
                const x = j * U;
                const y = (height - i - 1) * U;
                switch (lines[i][j]) {
                    case 'x':
                        scene.addSolid(new physics.Solid(x, y, U, U));
                        break;
                    case '!':
                        scene.addElement(new physics.Hazard(x, y, U, U));
                        break;
                    case 'P':
                        scene.setStartPosition(x, y);
                        break;
                    case 'B':
                        scene.addElement(new physics.Spring(x, y));
                        break;
                    case 'D':
                        scene.addElement(new physics.DashDiamond(x, y));
                        break;
                    case 'S':
                        scene.addElement(new physics.Strawberry(x, y));
                        break;
                    case '-':
                        scene.addSolid(new physics.Platform(x, y, U));
                        break;
                    case '=':
                        scene.addSolid(new physics.CrumblingBlock(x, y, U, U));
                        break;
                    default:
                        break;
                }
            }
        }
        return scene;
    }

    static fromJSON(data) {
        const scene = new Scene(data.width * U, data.height * U);
        const mainLayer = data.layers.find(l => l.name === 'main');
        for (let i = 0; i < mainLayer.data.length; i++) {
            const v = mainLayer.data[i] & 0x0FFFFFFF;
            const f = (mainLayer.data[i] >> 28) & 0xF;
            if (v !== 0) {
                const x = (i % mainLayer.width) * U;
                const y = (mainLayer.height - ~~(i / mainLayer.width) - 1) * U;
                let rotation;
                switch(f) {
                    case 0b0000:
                        rotation = 0;
                        break;
                    case 0b1010:
                        rotation = 1;
                        break;
                    case 0b1100:
                        rotation = 2;
                        break;
                    case 0b0110:
                        rotation = 3;
                        break;
                    default:
                        rotation = -1;
                }
                const tileData = {
                    'set': 'forest',
                    'index': v & 0x00FFFFFF,
                    'rotation': rotation,
                }

                switch(v) {
                    case 38:
                    case 39:
                    case 40:
                    case 46:
                    case 47:
                    case 48:
                        scene.addSolid(new physics.Platform(x, y, U, tileData));
                        break;
                    case 73:
                        scene.addElement(new physics.Hazard(x, y, U, U, tileData));
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
            solid.update(deltaTime);
        }
        for (const element of this.elements) {
            element.update(deltaTime);
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
    }

    draw(ctx) {
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
        if (this.player) this.removeActor(this.player);
        if (player) this.addActor(player);
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
    spritesSheet.canvas.width = 16 * 8;
    spritesSheet.canvas.height = 16 * 18;
    spritesSheet.context = spritesSheet.canvas.getContext('2d');
    spritesSheet.context.imageSmoothingEnabled = false;
    const img = new Image();
    img.addEventListener('load', () => addSprites(img));
    img.src = "images/hero_sprites.png";
}


function addSprites(image) {
    spritesSheet.context.scale(1, -1);
    for (let i of range(9)) {
        for (let j of range(8)) {
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, 16 * j, -16 * (2 * i + 1), 16, 16);
            spritesSheet.context.save();
            spritesSheet.context.scale(-1, 1);
            spritesSheet.context.drawImage(image, 16 * j, 16 * i, 16, 16, -16 * (j+1), -16 * (2 * i + 2), 16, 16);
            spritesSheet.context.restore();
        }
    }
}


makeSprites();
module.exports = {
    spritesSheet,
};
},{}],10:[function(require,module,exports){
const tilesSheet = {};

function makeTiles(tilesets) {
    tilesSheet.nbTiles = tilesets.reduce((t, x) => t + x.tilecount, 0);
    tilesSheet.canvas = document.createElement('canvas');
    tilesSheet.canvas.width = 16 * tilesSheet.nbTiles;
    tilesSheet.canvas.height = 128;
    tilesSheet.context = tilesSheet.canvas.getContext('2d');
    tilesSheet.context.imageSmoothingEnabled = false;
    tilesSheet.offsets = {};
    tilesSheet.offset = 0;
    for (const t of tilesets) {
        const img = new Image();
        img.addEventListener('load', () => addTileset(t, img));
        img.src = 'tilemaps/' + t.image;
    }
}

function addTileset(tileset, image) {
    tilesSheet.offsets[tileset.name] = tilesSheet.offset;
    tilesSheet.context.scale(1, -1);
    for (let i = 0; i < tileset.imageheight; i += 16) {
        for (let j = 0; j < tileset.imagewidth; j += 16) {
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            tilesSheet.context.drawImage(image, j, i, 16, 16, tilesSheet.offset, -16, 16, 16);

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 32);
            tilesSheet.context.rotate(Math.PI/2);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 48);
            tilesSheet.context.rotate(Math.PI);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();

            tilesSheet.context.save();
            tilesSheet.context.translate(8 + tilesSheet.offset, 8 - 64);
            tilesSheet.context.rotate(-Math.PI / 2);
            tilesSheet.context.drawImage(image, j, i, 16, 16, -8, -8, 16, 16);
            tilesSheet.context.restore();
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            // tilesSheet.context.drawImage(image, j, i, 16, 16, 0, 0, 16, 16);
            // tilesSheet.context.restore();
            //
            // tilesSheet.context.translate(tilesSheet.offset, 16);
            // tilesSheet.context.scale(1, -1);
            // tilesSheet.context.drawImage(image, j, i, 16, 16, 0, 0, 16, 16);
            // tilesSheet.context.restore();

            tilesSheet.offset += 16;
        }
    }
}

makeTiles([
    {
        "columns": 8,
        "image": "forest_tileset.png",
        "imageheight": 160,
        "imagewidth": 128,
        "margin": 0,
        "name": "forest",
        "spacing": 0,
        "tilecount": 80,
        "tiledversion": "1.3.5",
        "tileheight": 16,
        "tilewidth": 16,
        "type": "tileset",
        "version": 1.2
    },
]);


module.exports = {
    tilesSheet: tilesSheet,
}
},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiLCJzcHJpdGVzLmpzIiwidGlsZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6a0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTgwO1xuY29uc3QgRFlJTkdfVElNRSA9IC44O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcbmxldCBwcmVzc2VkQnV0dG9ucyA9IG5ldyBTZXQoKTtcbmxldCBnYW1lcGFkUHJlc3NlZEJ1dHRvbnMgPSBbXTtcblxuY2xhc3MgUGxheWVySW5wdXRzIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5nYW1lcGFkSW5kZXggPSAwO1xuICAgICAgICB0aGlzLmdhbWVwYWRtYXAgPSB7XG4gICAgICAgICAgICBqdW1wOiAwLFxuICAgICAgICAgICAgZGFzaDogMSxcbiAgICAgICAgICAgIHVwOiAxMixcbiAgICAgICAgICAgIGRvd246IDEzLFxuICAgICAgICAgICAgbGVmdDogMTQsXG4gICAgICAgICAgICByaWdodDogMTUsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5rZXltYXAgPSB7XG4gICAgICAgICAgICByaWdodDogJ0Fycm93UmlnaHQnLFxuICAgICAgICAgICAgbGVmdDogJ0Fycm93TGVmdCcsXG4gICAgICAgICAgICB1cDogJ0Fycm93VXAnLFxuICAgICAgICAgICAgZG93bjogJ0Fycm93RG93bicsXG4gICAgICAgICAgICBqdW1wOiAnZycsXG4gICAgICAgICAgICBkYXNoOiAnZicsXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50aW1lcnMgPSB7XG4gICAgICAgICAgICBqdW1wQnVmZmVyOiAwLFxuICAgICAgICAgICAgZGFzaEJ1ZmZlcjogMCxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVHYW1lcGFkKCkge1xuICAgICAgICBwcmVzc2VkQnV0dG9ucy5jbGVhcigpO1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICBpZiAoZ2FtZXBhZCkge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBnYW1lcGFkLmJ1dHRvbnM7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChnYW1lcGFkLmJ1dHRvbnNbal0ucHJlc3NlZCkge1xuICAgICAgICAgICAgICAgICAgICBwcmVzc2VkQnV0dG9ucy5hZGQoaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBjb25zdCBnYW1lcGFkID0gbmF2aWdhdG9yLmdldEdhbWVwYWRzKClbdGhpcy5nYW1lcGFkSW5kZXhdO1xuICAgICAgICAvLyB0aGlzLnVwZGF0ZUdhbWVwYWQoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXAubGVmdCkgfHxcbiAgICAgICAgICAgIChnYW1lcGFkICYmIGdhbWVwYWQuYnV0dG9uc1t0aGlzLmdhbWVwYWRtYXAubGVmdF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnJpZ2h0KSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC5yaWdodF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLnVwKSB8fFxuICAgICAgICAgICAgKGdhbWVwYWQgJiYgZ2FtZXBhZC5idXR0b25zW3RoaXMuZ2FtZXBhZG1hcC51cF0ucHJlc3NlZCkpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRvd24pIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRvd25dLnByZXNzZWQpKSB7XG4gICAgICAgICAgICB0aGlzLnlBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJldkp1bXAgPSB0aGlzLmp1bXBIZWxkO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmp1bXApIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmp1bXBdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZKdW1wICYmIHRoaXMuanVtcEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPSBKVU1QX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyICY9IHRoaXMudGltZXJzLmp1bXBCdWZmZXIgPiAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcHJldkRhc2ggPSB0aGlzLmRhc2hIZWxkO1xuICAgICAgICB0aGlzLmRhc2hIZWxkID0gcHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwLmRhc2gpIHx8XG4gICAgICAgICAgICAoZ2FtZXBhZCAmJiBnYW1lcGFkLmJ1dHRvbnNbdGhpcy5nYW1lcGFkbWFwLmRhc2hdLnByZXNzZWQpO1xuICAgICAgICBpZiAoIXByZXZEYXNoICYmIHRoaXMuZGFzaEhlbGQpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPSBEQVNIX0JVRkZFUl9USU1FO1xuICAgICAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciA9IHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgJiYgKHRoaXMudGltZXJzLmRhc2hCdWZmZXIgPiAwKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVySW5wdXRzLFxuICAgIGdhbWVwYWRQcmVzc2VkQnV0dG9ucyxcbiAgICBwcmVzc2VkS2V5cyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuY29uc3QgdGlsZXMgPSByZXF1aXJlKCcuL3RpbGVzJyk7XG5jb25zdCBzcHJpdGVzID0gcmVxdWlyZSgnLi9zcHJpdGVzJyk7XG5cbmNvbnN0IFNDQUxJTkcgPSA0O1xubGV0IFNMT1dET1dOX0ZBQ1RPUiA9IDE7XG5jb25zdCBGSVhFRF9ERUxUQV9USU1FID0gdHJ1ZTtcbmNvbnN0IEZSQU1FX1JBVEUgPSA2MDtcblxubGV0IGNvbnRleHQ7XG5sZXQgY3VycmVudFNjZW5lO1xubGV0IGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpO1xubGV0IGlzUnVubmluZyA9IGZhbHNlO1xubGV0IGZyYW1lQ291bnRlciA9IDA7XG5sZXQgZnJhbWVSYXRlUmVmcmVzaCA9IDU7XG5sZXQgZnJhbWVSYXRlU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbmxldCBzbG93ZG93bkNvdW50ZXIgPSAwO1xubGV0IHNjcm9sbFggPSAwO1xubGV0IHNjcm9sbFkgPSAwO1xuXG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHQudHJhbnNsYXRlKHNjcm9sbFggLSB4LCBzY3JvbGxZIC0geSk7XG4gICAgc2Nyb2xsWCA9IHg7XG4gICAgc2Nyb2xsWSA9IHk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB1cGRhdGUoKTtcbn1cblxuXG5mdW5jdGlvbiBzdG9wKCkge1xuICAgIGlzUnVubmluZyA9IGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc1J1bm5pbmcpIHtcbiAgICAgICAgc2xvd2Rvd25Db3VudGVyICs9IDE7XG4gICAgICAgIGlmIChzbG93ZG93bkNvdW50ZXIgPj0gU0xPV0RPV05fRkFDVE9SKSB7XG4gICAgICAgICAgICBzbG93ZG93bkNvdW50ZXIgLT0gU0xPV0RPV05fRkFDVE9SO1xuICAgICAgICAgICAgZnJhbWVDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7ZnJhbWVDb3VudGVyIC8gZnJhbWVSYXRlUmVmcmVzaH0gRlBTYCk7XG4gICAgICAgICAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRklYRURfREVMVEFfVElNRSA/XG4gICAgICAgICAgICAgICAgMSAvIEZSQU1FX1JBVEUgOlxuICAgICAgICAgICAgICAgIE1hdGgubWluKCh0aW1lTm93IC0gbGFzdFVwZGF0ZSkgLyAoMTAwMCAqIFNMT1dET1dOX0ZBQ1RPUiksIC4wNSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19XSURUSCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUudXBkYXRlKGRlbHRhVGltZSk7XG5cbiAgICAgICAgICAgIC8vIFRyYW5zaXRpb24gZnJvbSBvbmUgcm9vbSB0byBhbm90aGVyXG4gICAgICAgICAgICBpZiAoY3VycmVudFNjZW5lLnRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICAgICAgY3VycmVudFNjZW5lID0gY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICAgICAgcHJldlNjZW5lLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRTY3JvbGwoY3VycmVudFNjZW5lLnNjcm9sbFgsIGN1cnJlbnRTY2VuZS5zY3JvbGxZKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5kcmF3KGNvbnRleHQpO1xuICAgICAgICAgICAgbGFzdFVwZGF0ZSA9IHRpbWVOb3c7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG4gICAgfVxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgICAgIGlmIChTTE9XRE9XTl9GQUNUT1IgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgLVNDQUxJTkcpO1xuICAgIGNvbnRleHQudHJhbnNsYXRlKDAsIC1jb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG5cbiAgICBjdXJyZW50U2NlbmUgPSBtYXBzLkNFTEVTVEVfMDE7XG4gICAgbGV0IHAgPSBuZXcgcGxheWVyLlBsYXllcihjdXJyZW50U2NlbmUuc3RhcnRQb3NpdGlvblgsIGN1cnJlbnRTY2VuZS5zdGFydFBvc2l0aW9uWSk7XG4gICAgY3VycmVudFNjZW5lLnNldFBsYXllcihwKTtcbiAgICB3aW5kb3cua2V5bWFwID0gcC5pbnB1dHMua2V5bWFwO1xuICAgIHN0YXJ0KCk7XG59O1xuXG4vLyBHYW1lcGFkIEFQSVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsIChldmVudCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiQSBnYW1lcGFkIGNvbm5lY3RlZDpcIik7XG4gICAgY29uc29sZS5sb2coZXZlbnQuZ2FtZXBhZCk7XG4gICAgaW5wdXRzLmdhbWVwYWRQcmVzc2VkQnV0dG9uc1tldmVudC5nYW1lcGFkLmluZGV4XSA9IG5ldyBTZXQoKTtcbn0pO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIiwgKGV2ZW50KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJBIGdhbWVwYWQgZGlzY29ubmVjdGVkOlwiKTtcbiAgICBjb25zb2xlLmxvZyhldmVudC5nYW1lcGFkKTtcbiAgICBpbnB1dHMuZ2FtZXBhZFByZXNzZWRCdXR0b25zW2V2ZW50LmdhbWVwYWQuaW5kZXhdID0gdW5kZWZpbmVkO1xufSk7XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBtb3ZlbWVudCA9IHJlcXVpcmUoJy4vbW92ZW1lbnQnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIHkxLCBzY2VuZTIsIHgyLCB5Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MSAqIFUsICh5MSArIDEpICogVSwgd2lkdGggKiBVLCAwLCBzY2VuZTIsIHgyICogVSwgKHkyICsgMykgKiBVXG4gICAgKSk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihcbiAgICAgICAgeDIgKiBVLCAoeTIgLSAxKSAqIFUsIHdpZHRoICogVSwgMCwgc2NlbmUxLCB4MSAqIFUsICh5MSAtIDMpICogVVxuICAgICkpO1xufVxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblJpZ2h0KHNjZW5lMSwgeDEsIHkxLCBzY2VuZTIsIHgyLCB5MiwgaGVpZ2h0KSB7XG4gICAgc2NlbmUxLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihcbiAgICAgICAgeDEgKiBVLCB5MSAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMiwgKHgyICsgMSkgKiBVLCB5MiAqIFVcbiAgICApKTtcbiAgICBzY2VuZTIuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MiAqIFUsIHkyICogVSwgMCwgaGVpZ2h0ICogVSwgc2NlbmUxLCAoeDEgLSAxKSAqIFUsIHkxICogVVxuICAgICkpO1xufVxuXG5cbi8vIGNvbnN0IENFTEVTVEVfMDEgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxuLy8geHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgeHh4eFxuLy8geHggIHggeHh4ICAgIHh4eHh4eHh4eCAgICAgICAgICAgICAgeHh4eFxuLy8geHggIHggICB4ICAgIHh4eHh4ICAgeCAgICAgICAgICAgICB4eHh4eFxuLy8geHggIHh4eCB4ICAgIHh4eCAgICAgeCAgICAgICAgICAgICB4eHh4eFxuLy8geHggIHggICB4ICAgIHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eFxuLy8geHggIHggICB4ICAgIHh4eCAgICAgICAgICAgICAgICAgICB4eHh4eFxuLy8geHggIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxuLy8geHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxuLy8geHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxuLy8geCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgIXh4eHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeCAgeCAgICAgICAgICAgIXh4eHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeCAgeCAgICAgICAgICAgICAgeHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgeHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgeHh4eFxuLy8geCAgICAgICAgICAgICAgICAgeHh4eCEhISEgICAgICAgICAgeHh4eFxuLy8geCAgICAgICAgIHh4eCAgICAgeHh4eHh4eHggICAgICAgICAgIHh4eFxuLy8geCAgUCAgICAgIHh4eCAgICAgeHh4eHh4eHggICAgICAgICAgIHh4eFxuLy8geHh4eHggICAgIHh4eCEhISEheHh4eHh4eHggICAgICAgICAgICB4eFxuLy8geHh4eHggICAgIHh4eHh4eHh4eHh4eHh4eHghISEgICAgICAgICAgeFxuLy8geHh4eHghISEhIXh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeFxuLy8geHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeFxuLy8geHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeGApO1xuXG5jb25zdCBDRUxFU1RFXzAxID0gc2NlbmUuU2NlbmUuZnJvbUpTT04oeyBcImNvbXByZXNzaW9ubGV2ZWxcIjotMSxcbiAgICBcImVkaXRvcnNldHRpbmdzXCI6XG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiZXhwb3J0XCI6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcImZvcm1hdFwiOlwianNvblwiLFxuICAgICAgICAgICAgICAgICAgICBcInRhcmdldFwiOlwiY2VsZXN0ZTAxLmpzb25cIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICBcImhlaWdodFwiOjIzLFxuICAgIFwiaW5maW5pdGVcIjpmYWxzZSxcbiAgICBcImxheWVyc1wiOltcbiAgICAgICAge1xuICAgICAgICAgICAgXCJkYXRhXCI6WzEwLCAxMiwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTIsIDE4LCAxOCwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEyLCAxOCwgMTgsIDE4LCAxOCwgMTgsIDE4LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc2LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMiwgMTgsIDMyMjEyMjU0NzYsIDAsIDAsIDAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDMyMjEyMjU0NzYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDEsIDIsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAzMjIxMjI1NDc4LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAzMjIxMjI1NDc4LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc3LCAzMjIxMjI1NDc2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxLCAyLCAyLCAyLCAyLCAxMCwgMTAsIDEwLCAxMCwgMTIsIDMyMjEyMjU0NzYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyMjEyMjU0NzgsIDE4LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDIsIDIsIDMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE2MTA2MTI4MDksIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE2MTA2MTI4MDksIDMyMjEyMjU0NzgsIDMyMjEyMjU0NzcsIDEzLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMSwgNzMsIDczLCA3MywgNzMsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyMjEyMjU0NzgsIDEzLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA2LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMjIxMjI1NDc4LCAxMywgMTAsIDIwLCAyLCAyLCAyLCAzLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDczLCA3MywgNzMsIDczLCA3MywgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDMyMjEyMjU0NzgsIDEzLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAyMCwgNSwgNSwgNSwgNSwgNSwgMjEsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCA3MywgNzMsIDczLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDczLCA3MywgNzMsIDczLCA3MywgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAyMCwgNSwgNSwgNiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDIwLCA1LCA1LCA1LCA1LCA1LCAyMSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5XSxcbiAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgfV0sXG4gICAgXCJuZXh0bGF5ZXJpZFwiOjgsXG4gICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAge1xuICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICBcInNvdXJjZVwiOlwiZm9yZXN0LnRzeFwiXG4gICAgICAgIH1dLFxuICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgXCJ3aWR0aFwiOjQwXG59KTtcbkNFTEVTVEVfMDEuc2V0U3RhcnRQb3NpdGlvbigzICogVSwgNSAqIFUpO1xuXG4vLyBjb25zdCBDRUxFU1RFXzAyID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbi8vIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHhcbi8vIHh4eCAgICAgeHggICAgeCB4eHh4eHh4eHh4eHh4eHh4eHggICAgeHhcbi8vIHh4eCAgICAgeHggICAgeCAgICAgeHh4eHggIHh4eHh4eHggICAgeHhcbi8vIHh4eHh4eHh4eHggICAgeCAgICAgeHh4eHggICAgeHh4eHggICAgeHhcbi8vIHh4eCAgICAgeCAgICAgeCAgICAgeHh4eHggICAgeHh4eHggICAgeHhcbi8vIHh4eHh4eHh4eCAgUyAgICAgICAgIHh4eHggICAgeHh4eHggICAgeHhcbi8vIHh4eCAgICAgeCAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbi8vIHh4eHh4eHh4eCAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbi8vIHh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbi8vIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgeHhcbi8vIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgeHhcbi8vIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgeHhcbi8vIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbi8vIHggICAgICAgICAgICAgICAgICAgISEhISEgICAgICAgICAgICAgeHhcbi8vIHggICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgICAgICAgeHhcbi8vIHggICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgeHh4eHh4eHhcbi8vIHggICAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgeHh4eHh4eHhcbi8vIHggICAgICAgICAgICAgQiAgICAgIHh4eCAgICAgICAgeHh4eHh4eHhcbi8vIHggICAgICAgICAgICAgeHggICAgIHh4eCAgICB4eHh4eHh4eHh4eHhcbi8vIHggIFAgICAgICAgICAgeHggICAgIHh4eCEhICB4eHh4eHh4eHh4eHhcbi8vIHgtLS0tLXh4eHh4eHh4eHggICAgIHh4eHh4ISF4eHh4eHh4eHh4eHhcbi8vIHggICAgIHh4eHh4eCAgeHggICAgIHh4eHh4eHh4eHh4eHh4eHh4eHhcbi8vIHggICAgIHh4eHh4eCAgeHggICAgIHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxuY29uc3QgQ0VMRVNURV8wMiA9IHNjZW5lLlNjZW5lLmZyb21KU09OKHsgXCJjb21wcmVzc2lvbmxldmVsXCI6LTEsXG4gICAgXCJlZGl0b3JzZXR0aW5nc1wiOlxuICAgICAgICB7XG4gICAgICAgICAgICBcImV4cG9ydFwiOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJmb3JtYXRcIjpcImpzb25cIixcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXJnZXRcIjpcImNlbGVzdGUwMi5qc29uXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgXCJoZWlnaHRcIjoyMyxcbiAgICBcImluZmluaXRlXCI6ZmFsc2UsXG4gICAgXCJsYXllcnNcIjpbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiZGF0YVwiOlsxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDEyLCAxOCwgMTMsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxMSwgMCwgMTcsIDE4LCAxOCwgMTgsIDEzLCAxMCwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxMywgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDE3LCAxOCwgMTMsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAzMjIxMjI1NDc2LCAwLCAwLCAwLCAwLCAwLCAxNywgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxOSwgMCwgMCwgMCwgMCwgMTcsIDE4LCAxOCwgMTMsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTgsIDE4LCAxOCwgMTgsIDE4LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxOCwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAxNywgMTEsIDAsIDAsIDAsIDAsIDksIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDExLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTIsIDE5LCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAzMjIxMjI1NDc2LCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgNzMsIDczLCA3MywgNzMsIDczLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDYsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMiwgMTksIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDQsIDUsIDUsIDUsIDUsIDUsIDIxLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDE3LCAxMywgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCA0LCA2LCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDAsIDAsIDAsIDAsIDEsIDIsIDIsIDIsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTEsIDczLCA3MywgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgNDYsIDQ3LCA0NywgNDcsIDQ4LCAxLCAyLCAyLCAyLCA1LCA2LCAxNiwgMTYsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMjAsIDUsIDYsIDczLCA3MywgOSwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCA5LCAxMSwgMCwgMCwgMCwgMCwgMCwgOSwgMTAsIDEwLCAxMCwgMjAsIDUsIDUsIDIxLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTEsIDAsIDAsIDksIDExLCAwLCAwLCAwLCAwLCAwLCA5LCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwLCAxMCwgMTAsIDEwXSxcbiAgICAgICAgICAgIFwiaGVpZ2h0XCI6MjMsXG4gICAgICAgICAgICBcImlkXCI6MSxcbiAgICAgICAgICAgIFwibmFtZVwiOlwibWFpblwiLFxuICAgICAgICAgICAgXCJvcGFjaXR5XCI6MSxcbiAgICAgICAgICAgIFwidHlwZVwiOlwidGlsZWxheWVyXCIsXG4gICAgICAgICAgICBcInZpc2libGVcIjp0cnVlLFxuICAgICAgICAgICAgXCJ3aWR0aFwiOjQwLFxuICAgICAgICAgICAgXCJ4XCI6MCxcbiAgICAgICAgICAgIFwieVwiOjBcbiAgICAgICAgfV0sXG4gICAgXCJuZXh0bGF5ZXJpZFwiOjIsXG4gICAgXCJuZXh0b2JqZWN0aWRcIjoxLFxuICAgIFwib3JpZW50YXRpb25cIjpcIm9ydGhvZ29uYWxcIixcbiAgICBcInJlbmRlcm9yZGVyXCI6XCJyaWdodC1kb3duXCIsXG4gICAgXCJ0aWxlZHZlcnNpb25cIjpcIjEuMy41XCIsXG4gICAgXCJ0aWxlaGVpZ2h0XCI6MTYsXG4gICAgXCJ0aWxlc2V0c1wiOltcbiAgICAgICAge1xuICAgICAgICAgICAgXCJmaXJzdGdpZFwiOjEsXG4gICAgICAgICAgICBcInNvdXJjZVwiOlwiZm9yZXN0LnRzeFwiXG4gICAgICAgIH1dLFxuICAgIFwidGlsZXdpZHRoXCI6MTYsXG4gICAgXCJ0eXBlXCI6XCJtYXBcIixcbiAgICBcInZlcnNpb25cIjoxLjIsXG4gICAgXCJ3aWR0aFwiOjQwXG59KTtcbkNFTEVTVEVfMDIuc2V0U3RhcnRQb3NpdGlvbigzICogVSwgMyAqIFUpO1xubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzAxLCAzMSwgMjMsIENFTEVTVEVfMDIsIDEsIDAsIDUpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDMgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eFxueHh4eHh4ICAgICAgICAgeHh4eHh4eHh4eHh4ICAgIHh4ICAgIHh4eFxueHh4eHh4ICAgICAgICAgeHggICAgICAgICB4ICAgICB4ICAgIHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgIHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgIHh4ICAgICB4eFxueCAgICAgICAgICB4ICAgIHggICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICB4ICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAhISEgICAgICBTICAgeFxueCAgICAgICAgICAgICAgICAgeHggICAgICB4eHghISEhISAgICAgeFxueCAgICAgICAgICAgICAgICAgeHggICAgICB4eHh4eHh4eCAgICAheFxueHggICAgICAgICAgICAgICAgIHggICAhISF4eHh4eHh4eCEhISF4eFxueHggIFAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHgtLS0teHh4ICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHggICAgeHh4ICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDIsIDM0LCAyMywgQ0VMRVNURV8wMywgMiwgMCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8wNCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHggICAgICB4eHggICAgeHh4eHh4eHh4eCB4eHh4XG54eHh4eHggICAgICAgICAgICB4eHggICAgICB4eHh4eCAgICB4eHh4XG54eHh4eCAgICAgICAgICAgICB4eHggICAgICAheHh4eCAgICB4eHh4XG54eHggICAgICAgICAgICAgICAgIHggICAgICAheHh4eCAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgIHggICAgICAheHh4eCAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAheHggICAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4LS0gICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4ICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4ICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgICF4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHggICAgICF4ISEgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICF4eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICF4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggIFAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHgtLS0teHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4YCk7XG5cbkNFTEVTVEVfMDQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTEgKiBVLCAzICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxMSAqIFUsIDIzICogVSwgMTIgKiBVLCAuNSksXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMyAqIFUsIDEyICogVSwgMTQgKiBVLCAxMSAqIFUsIDEpLFxuXSkpKTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wMywgMzMsIDIzLCBDRUxFU1RFXzA0LCAzLCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA1ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHhcbnh4eHh4eCAgICAgICAgICAgICB4eHggICAgeHh4eHh4eHh4eHh4eHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgIHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgIHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgUyAgICB4eHh4eHh4ICAgID09PSAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgeHggICA9PT0gICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICA9PT0gIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnggIHggICAgICAgICAgeHggICAgICAgICAgICAgPT09ICAgICAgIHhcbnh4eHggIFAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eHgtLS0teHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4eHggICAgeHh4eHh4ICB4eHh4eHh4eHh4ICAgICAgICAgICAgIHhgKTtcblxubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzA0LCAyMSwgMjMsIENFTEVTVEVfMDUsIDQsIDAsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDYgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggUyAgICAgICAgICB4eHggICAgeHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHghIHggICB4eFxueHh4ICAgICAgICAgICAgICAgICAgIHh4ICB4eHh4eHghICAgICAgeFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueHh4eHggICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueCAgICAgISEhICAgICAgICAgICAgICAgICAgICAgeHghICAgICAgeFxueCAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgeFxueCAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgeFxueCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQiAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgeHh4eFxueCEgICAgICAgICAgICAgICAgICAgISEheHh4ICAgICAgICAgeHh4eFxueHggICAgISEhICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgIHh4eFxueHghISEheHh4ICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgIHh4eFxueHh4eHh4eHh4ISEhISAgICAhISEheHh4eHh4ICAgICAgICAgIHh4eFxueHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eCAgICAgICAgIHh4eFxueHh4eHh4eHh4eHh4eCAgICB4eHh4eCAgeHh4eCAgICAgICAgICB4eFxueHh4eHh4eCAgICAgICAgICAgIHh4ICAgeHh4ICAgICAgICAgICB4eFxueHh4eHh4ICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICB4eFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxueHggIFAgICAgICB4eCAgICB4eHggICAgIHh4eCAgICAgICAgICAgIFxueHh4LS0tLXh4eHh4eCAgICB4eHghISEhIXh4eCAgICAgICAgLS0teFxueHh4ICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICAgeGApO1xuXG5DRUxFU1RFXzA2LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxMyAqIFUsIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgwLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIFUsIDEzICogVSwgOSAqIFUsIC4zKSxcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDEzICogVSwgOSAqIFUsIDEzICogVSwgVSwgMSksXG5dKSkpO1xubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzA1LCAyMiwgMjMsIENFTEVTVEVfMDYsIDMsIDAsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDcgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHggICAgICAgeHh4eHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICAgICAgICB4eHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICAgICAgICB4eHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICAgICAgICAgeHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICAgICAgICAgeHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICAhICAgICAgIHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICB4ICAgICAgICB4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ICAgICB4ICAgICAgICB4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4ISAgICB4ICAgICAgICB4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgICB4ICAgICAgICB4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgICB4QiAgICAgICB4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgICB4eHgtLSAgIHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgICF4eHggICAgIHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgIHh4eHggICAgIHh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgIHh4eHh4LS0tLXh4eHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgIHh4eHh4ICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgIHh4eCAgICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCEgIHh4eCAgICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eCAgICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eCAgICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eCAgICAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eCEhISAgICAgeHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eHh4eCAgICAgIHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eHh4eCAgICAgIHghICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eHggIHh4eHh4eCAgICAgICAgICAgeHh4eHh4eHh4eFxueHh4eHh4eHh4eCAgIHh4eHh4eHh4eCAgICAgICAgICAgICAgICB4eFxueHh4eHh4eHh4eCAgICAgIHh4eHh4eCAgICAgICAgICAgICAgICB4eFxueHh4eHh4eHh4ICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgeFxueHh4eHh4eHh4ICAgICAgICAgICB4eHgtLS14eHh4LS0tLSAgICAgIFxueHh4eHh4eHh4ICAgICAgICBTICAgICAgICB4eHggICAgICAgICAgIFxueHh4eHh4eHh4ICAgICAgICAgICAgICAgICB4eHggICAgICAgIFAgIFxueHh4eHh4eHh4ICAgICAgICAgeHh4eHh4eHh4eHggICAgeHh4eHh4eFxueHh4eHh4eHh4ISEhISEhIXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eCAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblJpZ2h0KENFTEVTVEVfMDcsIDQwLCAzLCBDRUxFU1RFXzA2LCAwLCAzLCAzKTtcblxuXG5jb25zdCBDRUxFU1RFXzA4ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eCAgICAgICAgICAgICAgICAgICAgICEhISEgICAgICAgICAgICBcbnh4eCAgICAgICAgICAgICAgICAgISEhIXh4eHggICAgICAgICAgICBcbnh4eHh4ICAgICAhISEhISEgICAgeHh4eHh4eHggICAgICAgICAgICBcbiAgICAgICAgICB4eHh4eHggICAgeHh4eHh4ICAgICAgICAgICAgICBcbiAgICAgICAgICB4eHh4eHggICAgeHggICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB4eHh4eHggRCAgeCAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB4eHh4eHggICAgeCAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eCAgICB4eHh4eHggICAgICAgICAgICAgICB4eC0tLS14eHhcbnh4eHggeCAgICB4eHh4eHggICAgICAgICAgIC0teHh4eCAgICB4eHhcbnh4ICAgeCAgICB4eHh4eCAgICAgICAgICAgICAgeHh4eCBTICB4eHhcbnh4ICAgICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgICB4eHhcbnggICAgICAgICB4eHh4ICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnggICAgICAgICB4eHh4ICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnggICAgICAgICB4eHh4ICAgICAgICAgICAgLS0tLS14eHh4eHh4eHhcbnggICAgICAgeHh4eHh4ICAgICAgICAgICAgICAhISF4eHh4eHh4eHhcbnggICAgICAgeHh4eHh4ICAgICAgICAhISEhISF4eHh4eHh4eHh4eHhcbnggUCAgICAgeHh4eHh4ISEgICAgICB4eHh4eHh4eHh4eHh4eHh4eHhcbngtLS14eHh4eHh4eHh4eHghISEhISF4eHh4eHh4eHh4eHh4eHh4eHhcbnggICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzA2LCAzNSwgMzYsIENFTEVTVEVfMDgsIDEsIDAsIDMpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDkgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgIHh4eHggIHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgIHh4eCAgeHh4eCAgICB4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgeHh4eHh4eFxuICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgeHh4eHh4eFxuICAgICAgICAgIXh4eHh4LS0tLXh4ICAgICAgICBTICAgIHh4eHh4eFxuICAgICAgICAgIXh4eHh4ICAgICAgICAgICAgICAgICAgIHh4eHh4eFxuICBQICAgICAgIXh4eHh4ICAgICAgICAgICAgICAgICAgeHh4eHh4eFxueHgtLS0gICAgIXh4eCAgICAgICAgICAgICAgICAgICB4eHh4eHh4eFxueHggICAgICAgIXh4eCAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eFxueHggICAgICAgIXh4ICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eFxueHggICAhISAgIXh4ICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHghISF4eCAgIXh4ICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHggIHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeGApO1xuXG5DRUxFU1RFXzA5LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxNCAqIFUsIDMuNSAqIFUsIDIgKiBVLCAzICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCguNSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE0ICogVSwgMy41ICogVSwgMjEgKiBVLCA3LjUgKiBVLCAuNSksXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMSAqIFUsIDcuNSAqIFUsIDE0ICogVSwgMy41ICogVSwgMS41KSxcbl0pKSk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KENFTEVTVEVfMDYsIDQwLCAyLCBDRUxFU1RFXzA5LCAwLCAxNCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8xMCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eCAgIHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4ICAgICAgICAgRCAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHh4eHh4eHh4ICAgICAgICAgICAgICAgICAgICB4eHh4ICAgIHh4eFxueHh4eHh4eHh4ISEgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHghISEhISEhISEhISEhICAgICB4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ISEhISF4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eGApO1xubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzEwLCA0MCwgMTIsIENFTEVTVEVfMDgsIDAsIDEyLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzExID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eHh4eCAgICAgICAgICAgISEgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgUyAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCB4eHh4eHggICAgICAgICAgICAgICEhICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4IHh4eHh4eCAgICAgICAgICAgICAgeHggICAgICAgICAgICEgICAgICAgeHh4eFxueHggeHh4eHh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgeCEgICAgICB4eHh4XG54eCB4eHh4eHgtLSAgICAgRCAgICAgIHh4ICAgICAgICAgICF4eCAgICAgIHh4eHhcbnh4IHh4eHh4eCAgICAgICAgICAgICAgeHggICAgICAgICAgeHh4ISAgICAgeHh4eFxueHggeHh4eHh4ICAgICAgICAgICAgICAhISAgICAgICAgICB4eHh4ICAgICB4eHh4XG54eCB4ICB4eHggICAgICAgICAgICAgICAgICAgICAgICAgICEhISEgICAgICB4eHhcbnh4ICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHggICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eCAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4ICAgeHh4ISEhISAgICAgICEhISEhISAgICBCICAgICAgICAgICAgICAgIHh4eFxueHggICB4eHh4eHh4ISEhISEheHh4eHh4ISEhIXh4eHggICAgICAgICAgICAgeHh4XG54eHggIHh4eHh4eHh4eHh4eHggIHh4eHh4eHh4eHh4eCAgICBCICAgICBQICB4eHhcbnh4eCAgeHh4ICAgeCAgICAgeCAgICAgIHggICAgeHh4eHh4eHh4eHh4eC0tIHh4eFxueHh4ICB4eHggICB4ICAgICB4ICAgICAgeCAgICB4eHh4eHh4eHh4eHh4ICAgeHh4YCk7XG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMTAsIDIsIDIzLCBDRUxFU1RFXzExLCA0MiwgMCwgMyk7XG5cblxuY29uc3QgQ0VMRVNURV8xMiA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHggIHh4eCAgIHggICAgIHggICAgICB4ICAgIHh4eHh4eHh4eHh4XG54eHggIHh4eHh4eHh4eCAgIHggIHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHggIHh4ICAgIHh4eHh4eHh4eHh4eHggIHh4eHh4eHh4eHh4eHh4XG54eHg9PXh4ICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUCAgXG54eCAgICB4ICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KENFTEVTVEVfMTIsIDQwLCAxMSwgQ0VMRVNURV8xMCwgMCwgMTEsIDQpO1xubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzEyLCAzLCAyMywgQ0VMRVNURV8xMSwgMywgMCwgMik7XG5cblxuY29uc3QgQ0VMRVNURV8xMyA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG4gICAgeHh4eHh4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgeHh4eHh4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgeCAgeHh4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgeCAgeHh4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgeCAgICB4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICB4eHh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eCAgICBEICAgICAgICAgICB4eHh4ICAgICAgICAgICAgICAgXG4gIFAgICAgICAgeHh4eCAgICAgICAgICAgLS0tLS14eHh4ICAgICAgICAgICAgICAgXG54eHgtLS0gICAgeHh4eCAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgeHh4eCAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgeHh4eCAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgeHh4eCAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgeHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAhISEheCAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAtLS0teCAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgeCAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4XG54eHggICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4XG54eHggICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uUmlnaHQoQ0VMRVNURV8wOCwgNDAsIDEzLCBDRUxFU1RFXzEzLCAwLCAxMywgMTApO1xuXG5cbmNvbnN0IFRFU1RfTEVWRUwgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICAgICAgIHh4eHh4eFxueHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHggICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICB4eHh4eHh4ICAgICAgICAgIHh4eHggICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICB4eHh4eHh4eHggICAgICB4eHh4ICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCEhICAgICAgICB4eHh4eHh4eHggICAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHh4ISF4eCAgICB4eHh4eHh4eHggICAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eHh4eCAgICAgICAgICAgICAgICB4ICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eHh4eCAgICAgICAgICAgICAgICB4ICAgICAgICAgICAhISF4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICF4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4ICAgICAgICAgICAgICBQICAgICB4ICAgICAgICAgICF4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHh4ICAgICAgICAgICAgeHh4eCAgICB4ICAgICAgICAgICF4eHh4eCEhISEhISEhISEgICAgICAgISEhISEhISF4eHh4eFxueHh4ICAgICAgICAgICAheHh4eCAgICB4eHh4ICAgICAgICF4eHh4eHh4eHh4eHh4eCEhISEhISEhIXh4eHh4eHh4eHh4eFxueHh4eHh4eHghISEhISEheHh4eCAgICB4eHh4ISEhISEhISF4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5URVNUX0xFVkVMLmFkZEVsZW1lbnQoXG4gICAgbmV3IHBoeXNpY3MuSGF6YXJkKDcgKiBVLCAyMCAqIFUsIDIgKiBVLCAyICogVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDcgKiBVLCAyMCAqIFUsIDcgKiBVLCAyICogVSwgMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCg3ICogVSwgMiAqIFUsIDcgKiBVLCAyMCAqIFUsIDEpLFxuICAgICAgICBdLCAtMSkpKTtcblRFU1RfTEVWRUwuYWRkRWxlbWVudChcbiAgICBuZXcgcGh5c2ljcy5IYXphcmQoMTEgKiBVLCAyMCAqIFUsIDIgKiBVLCAyICogVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDExICogVSwgMjAgKiBVLCAxMSAqIFUsIDE0ICogVSwgLjI1KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDExICogVSwgMTQgKiBVLCAxMSAqIFUsIDIwICogVSwgLjI1KSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZEVsZW1lbnQoXG4gICAgbmV3IHBoeXNpY3MuSGF6YXJkKFUsIDE4ICogVSwgMiAqIFUsIDIgKiBVKVxuICAgICAgICAuc2V0TW92ZW1lbnQobmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoVSwgMTggKiBVLCAyMCAqIFUsIDE4ICogVSwgMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMCAqIFUsIDE4ICogVSwgVSwgMTggKiBVLCAxKSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZFNvbGlkKFxuICAgIG5ldyBwaHlzaWNzLlNvbGlkKDAsIDAsIDMgKiBVLCBVKVxuICAgICAgICAuc2V0TW92ZW1lbnQobmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50LlNpbmVNb3ZlbWVudCg1MiAqIFUsIDYgKiBVLCA1MiAqIFUsIDE0ICogVSwgMiwgMyksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMiksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRTb2xpZChcbiAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAwLCAzICogVSwgVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TaW5lTW92ZW1lbnQoNTUgKiBVLCAxNiAqIFUsIDYwICogVSwgMTYgKiBVLCAyLCAtMSkpKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBDRUxFU1RFXzAxLFxuICAgIENFTEVTVEVfMDIsXG4gICAgQ0VMRVNURV8wMyxcbiAgICBDRUxFU1RFXzA0LFxuICAgIENFTEVTVEVfMDUsXG4gICAgQ0VMRVNURV8wNixcbiAgICBDRUxFU1RFXzA3LFxuICAgIENFTEVTVEVfMDgsXG4gICAgQ0VMRVNURV8wOSxcbiAgICBURVNUX0xFVkVMLFxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuY2xhc3MgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gY291bnQ7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgdGhpcy50aW1lciArPSBkZWx0YVRpbWU7XG4gICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICYmIHRoaXMucmVtYWluaW5nQ291bnQgJiYgdGhpcy50aW1lciA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlbWFpbmluZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICB9XG59XG5cblxuY2xhc3MgTGluZWFyTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLm14ID0gKHgyIC0geDEpIC8gZHVyYXRpb247XG4gICAgICAgIHRoaXMubXkgPSAoeTIgLSB5MSkgLyBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMudGltZXIgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKCgxIC0gcikgKiB0aGlzLngxICsgciAqIHRoaXMueDIsICgxIC0gcikgKiB0aGlzLnkxICsgciAqIHRoaXMueTIpO1xuICAgICAgICAgICAgdGhpbmcuc2V0TW9tZW50dW0odGhpcy5teCwgdGhpcy5teSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8odGhpcy54MiwgdGhpcy55Mik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2VxdWVuY2VNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihtb3ZlbWVudHMsIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcih1bmRlZmluZWQsIGNvdW50KTtcbiAgICAgICAgdGhpcy5tb3ZlbWVudHMgPSBtb3ZlbWVudHM7XG4gICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgd2hpbGUgKHRoaXMucmVtYWluaW5nQ291bnQgJiYgZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICAgICAgZGVsdGFUaW1lID0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0udGltZXIgLSB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5kdXJhdGlvbjtcbiAgICAgICAgICAgIGlmIChkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmluZGV4ID49IHRoaXMubW92ZW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNpbmVNb3ZlbWVudFxuICAgIGV4dGVuZHMgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IHRoaXMudGltZXIgKiAyICogTWF0aC5QSSAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICBjb25zdCByYXRpbyA9IChNYXRoLmNvcyhhbmdsZSkgKyAxKSAvIDI7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8ocmF0aW8gKiB0aGlzLngxICsgKDEgLSByYXRpbykgKiB0aGlzLngyLCByYXRpbyAqIHRoaXMueTEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueTIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHRoaXMueDEsIHRoaXMueTEpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1vdmVtZW50LFxuICAgIExpbmVhck1vdmVtZW50LFxuICAgIFNlcXVlbmNlTW92ZW1lbnQsXG4gICAgU2luZU1vdmVtZW50LFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHRpbGVzID0gcmVxdWlyZSgnLi90aWxlcycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqIFRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUgaWYgdGhlIGludGVyc2VjdGlvbiBvZiBib3RoIHNlZ21lbnRzIGlzIG9mIG5vbi16ZXJvIG1lYXN1cmUgKGlmIHRoZSBlbmQgb2Ygb25lIHNlZ21lbnRcbiAqIGNvaW5jaWRlcyB3aXRoIHRoZSBzdGFydCBvZiB0aGUgbmV4dCwgdGhleSBhcmUgbm90IGNvbnNpZGVyZWQgYXMgb3ZlcmxhcHBpbmcpXG4gKlxuICogQHBhcmFtIHN0YXJ0MSB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHNpemUxIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc3RhcnQyIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBzZWNvbmQgc2VnbWVudFxuICogQHBhcmFtIHNpemUyIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgdHdvIHNlZ21lbnRzIG92ZXJsYXBcbiAqL1xuZnVuY3Rpb24gc2VnbWVudHNPdmVybGFwKHN0YXJ0MSwgc2l6ZTEsIHN0YXJ0Miwgc2l6ZTIpIHtcbiAgICByZXR1cm4gc3RhcnQxIDwgc3RhcnQyICsgc2l6ZTIgJiYgc3RhcnQyIDwgc3RhcnQxICsgc2l6ZTE7XG59XG5cblxuZnVuY3Rpb24gYWxwaGFUb1N0cmluZyhhbHBoYSkge1xuICAgIGlmIChhbHBoYSA+PSAxKSB7XG4gICAgICAgIHJldHVybiAnZmYnO1xuICAgIH0gZWxzZSBpZiAoYWxwaGEgPD0gMCkge1xuICAgICAgICByZXR1cm4gJzAwJztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKFwiMFwiICsgTWF0aC5mbG9vcigyNTYgKiBhbHBoYSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTIpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0LCB0aWxlRGF0YSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnggPSB4O1xuICAgICAgICB0aGlzLnkgPSB5O1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnRpbGVEYXRhID0gdGlsZURhdGE7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIH1cblxuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBpZiAodGhpcy50aWxlRGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgICAgIHRpbGVzLnRpbGVzU2hlZXQuY2FudmFzLFxuICAgICAgICAgICAgICAgIHRpbGVzLnRpbGVzU2hlZXQub2Zmc2V0c1t0aGlzLnRpbGVEYXRhLnNldF0gKyAxNiAqICh0aGlzLnRpbGVEYXRhLmluZGV4IC0gMSksIDE2ICogdGhpcy50aWxlRGF0YS5yb3RhdGlvbixcbiAgICAgICAgICAgICAgICAxNiwgMTYsXG4gICAgICAgICAgICAgICAgdGhpcy54LCB0aGlzLnksXG4gICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgfVxuXG4gICAgbW92ZVRvKHgsIHkpIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIpO1xuICAgIH1cblxuICAgIHNldE1vdmVtZW50KG1vdmVtZW50KSB7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIEFjdG9yIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkeDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGR5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgPT09IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICB9XG59XG5cblxuY2xhc3MgU29saWQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGlsZURhdGEpO1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyM2YzJjMGInO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IDA7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW0gPSAwO1xuICAgIH1cblxuICAgIGdldE1vbWVudHVtWCgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1YO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGdldE1vbWVudHVtWSgpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZXJzLm1vbWVudHVtID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9tZW50dW1ZO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5LCBteCA9IHVuZGVmaW5lZCwgbXkgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGR4O1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gZHk7XG4gICAgICAgIGNvbnN0IG1vdmVYID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICBjb25zdCBtb3ZlWSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcblxuICAgICAgICBpZiAobW92ZVggfHwgbW92ZVkpIHtcbiAgICAgICAgICAgIGNvbnN0IHJpZGluZyA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUgJiYgYWN0b3IuaXNSaWRpbmcodGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmlkaW5nLmFkZChhY3Rvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChtb3ZlWCkge1xuICAgICAgICAgICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgodGhpcy54ICsgdGhpcy53aWR0aCAtIGFjdG9yLngsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVYKHRoaXMueCAtIGFjdG9yLnggLSBhY3Rvci53aWR0aCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWCA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgobW92ZVggLSBhY3Rvci5tb3ZlZFgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSArIHRoaXMuaGVpZ2h0IC0gYWN0b3IueSwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFkgKz0gYWN0b3IubW92ZVkobW92ZVkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFkgKz0gYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRNb21lbnR1bShteCwgbXkpIHtcbiAgICAgICAgdGhpcy50aW1lcnMubW9tZW50dW0gPSBjb25zdGFudHMuTU9NRU5UVU1fU1RPUkVfVElNRTtcbiAgICAgICAgdGhpcy5tb21lbnR1bVggPSBteDtcbiAgICAgICAgdGhpcy5tb21lbnR1bVkgPSBteTtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR4ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoICsgZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCArIGR4LCBhY3Rvci53aWR0aCAtIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQgKyBkeSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnkgKyBkeSwgYWN0b3IuaGVpZ2h0IC0gZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cblxuY2xhc3MgSGF6YXJkIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRpbGVEYXRhKTtcbiAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb2xvciA9ICcjZjMxMzE0JztcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICB9XG59XG5cblxuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIHRpbGVEYXRhKSB7XG4gICAgICAgIHN1cGVyKHgsIHkgKyBVIC8gMiwgd2lkdGgsIFUgLyAyLCB0aWxlRGF0YSk7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNhODYxMmFcIjtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgPj0gdGhpcy55ICsgdGhpcy5oZWlnaHQgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgZHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMudGlsZURhdGEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICB0aWxlcy50aWxlc1NoZWV0LmNhbnZhcyxcbiAgICAgICAgICAgICAgICB0aWxlcy50aWxlc1NoZWV0Lm9mZnNldHNbdGhpcy50aWxlRGF0YS5zZXRdICsgMTYgKiAodGhpcy50aWxlRGF0YS5pbmRleCAtIDEpLCAxNiAqIHRoaXMudGlsZURhdGEucm90YXRpb24sXG4gICAgICAgICAgICAgICAgMTYsIDE2LFxuICAgICAgICAgICAgICAgIHRoaXMueCwgdGhpcy55IC0gdGhpcy5oZWlnaHQsXG4gICAgICAgICAgICAgICAgOCwgOCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdXBlci5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU3ByaW5nIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgMiAqIFUsIFUgLyAyKTtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiI2RlZGYzNVwiO1xuICAgIH1cblxuICAgIGludGVyYWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9CT1VOQ0UpO1xuICAgICAgICBwbGF5ZXIuc3BlZWRYID0gMDtcbiAgICAgICAgcGxheWVyLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgIHBsYXllci5yZXN0b3JlRGFzaCgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBEYXNoRGlhbW9uZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHggKyAuNSAqIFUsIHkgKyAuNSAqIFUsIFUsIFUpO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjNzlmZjAwXCI7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKVxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUgJiYgdGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmIChwbGF5ZXIucmVzdG9yZURhc2goKSkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAyO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgY3R4LnN0cm9rZVJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU3RyYXdiZXJyeSBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHggKyAuNSAqIFUsIHkgKyAuNSAqIFUsIFUsIFUpO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjZmYwMDlhXCI7XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFRyYW5zaXRpb24gZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGFyZ2V0U2NlbmUsIHRhcmdldFgsIHRhcmdldFkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudGFyZ2V0U2NlbmUgPSB0YXJnZXRTY2VuZTtcbiAgICAgICAgdGhpcy50YXJnZXRYID0gdGFyZ2V0WDtcbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci50cmFuc2l0aW9uU2NlbmUodGhpcy50YXJnZXRTY2VuZSk7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG5jbGFzcyBDcnVtYmxpbmdCbG9jayBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjMzIzMjMyXCI7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuY29vbGRvd24gPSA0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHJhdyhjdHgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFscGhhID0gdGhpcy50aW1lcnMuZmFsbDtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvciArIGFscGhhVG9TdHJpbmcoYWxwaGEpO1xuICAgICAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiIzNiM2IzYlwiO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMuc2NlbmUucGxheWVyO1xuICAgICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCAmJiB0aGlzLm1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm1vdmVtZW50ID09PSB1bmRlZmluZWQgJiYgcGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudCA9IHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNlZ21lbnRzT3ZlcmxhcCxcbiAgICBhbHBoYVRvU3RyaW5nLFxuICAgIEhhemFyZCxcbiAgICBTb2xpZCxcbiAgICBBY3RvcixcbiAgICBQbGF0Zm9ybSxcbiAgICBTcHJpbmcsXG4gICAgRGFzaERpYW1vbmQsXG4gICAgU3RyYXdiZXJyeSxcbiAgICBUcmFuc2l0aW9uLFxuICAgIFRyaWdnZXJCbG9jayxcbiAgICBDcnVtYmxpbmdCbG9jayxcbn1cbiIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IHNwcml0ZXMgPSByZXF1aXJlKCcuL3Nwcml0ZXMnKTtcbmNvbnN0IEFOSU1BVElPTl9TTE9XRE9XTiA9IDY7XG5cbmNvbnN0IEFOSU1BVElPTl9JRExFID0gWzQsIDRdO1xuY29uc3QgQU5JTUFUSU9OX1JVTiA9IFsxLCA2XTtcbmNvbnN0IEFOSU1BVElPTl9KVU1QID0gWzYsIDNdO1xuY29uc3QgQU5JTUFUSU9OX0ZBTEwgPSBbNSwgM107XG5jb25zdCBBTklNQVRJT05fRElFID0gWzAsIDhdO1xuXG5jbGFzcyBQbGF5ZXIgZXh0ZW5kcyBwaHlzaWNzLkFjdG9yIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDgsIDE0KTtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuXG4gICAgICAgIHRoaXMuaW5wdXRzID0gbmV3IGlucHV0cy5QbGF5ZXJJbnB1dHM7XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcblxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzLlNUQVRFX05PUk1BTDtcbiAgICAgICAgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gMTtcbiAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gMTtcbiAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gNDtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciA9IDA7XG5cbiAgICAgICAgLy8gdGltZXJzXG4gICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2hGcmVlemUgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IH5+KHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgLyBBTklNQVRJT05fU0xPV0RPV04pO1xuICAgICAgICBjb25zdCByb3cgPSAyICogdGhpcy5zcHJpdGVfcm93ICsgKHRoaXMuc3ByaXRlX2RpcmVjdGlvbiA9PT0gLTEgPyAxIDogMCk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzcHJpdGVzLnNwcml0ZXNTaGVldC5jYW52YXMsXG4gICAgICAgICAgICAxNiAqIGluZGV4LCAxNiAqIHJvdyxcbiAgICAgICAgICAgIDE2LCAxNixcbiAgICAgICAgICAgIHRoaXMueCAtIDQsIHRoaXMueSxcbiAgICAgICAgICAgIDE2LCAxNik7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5pbnB1dHMudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgKz0gMTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25fY291bnRlciAlPSB0aGlzLm5iX3Nwcml0ZXMgKiBBTklNQVRJT05fU0xPV0RPV047XG5cbiAgICAgICAgLy8gY2hlY2sgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuY2xlYXIoKTtcbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMueSA9PT0gc29saWQueSArIHNvbGlkLmhlaWdodCAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciB3YWxscyBvbiByaWdodCBhbmQgbGVmdCBhdCBkaXN0YW5jZSA8PSBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VMZWZ0ID0gdGhpcy54IC0gc29saWQueCAtIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZUxlZnQgJiYgZGlzdGFuY2VMZWZ0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VSaWdodCA9IHNvbGlkLnggLSB0aGlzLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZVJpZ2h0ICYmIGRpc3RhbmNlUmlnaHQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMueCArIHRoaXMud2lkdGggPT09IHNvbGlkLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgcGxheWVyIGlzIGh1Z2dpbmcgYSB3YWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCB8fCB0aGlzLmRhc2hTcGVlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy51cGRhdGVBbmltYXRpb24oKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIHNldCBjb2xvclxuICAgICAgICB0aGlzLmNvbG9yID0gdGhpcy5uYkRhc2hlcyA+IDAgPyAnI2E2MzYzNicgOiAnIzNmYjBmNic7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuICAgICAgICAgICAgdGhpcy5jb2xvciA9IFwiXCIgKyB0aGlzLmNvbG9yICsgcGh5c2ljcy5hbHBoYVRvU3RyaW5nKHRoaXMudGltZXJzLmR5aW5nIC8gY29uc3RhbnRzLkRZSU5HX1RJTUUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBvYmplY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLnNjZW5lLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5pbnRlcmFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55IDw9IC10aGlzLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmR5aW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNwYXduKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wSGVsZCAmJiB0aGlzLnRpbWVycy52YXJKdW1wID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZLCBjb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSB0aGlzLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTiArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREFTSCk7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpIHtcbiAgICAgICAgbGV0IGRpZEp1bXAgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IHRoaXMuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBjb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0cy54QXhpcyAhPT0gMCkgdGhpcy5zcHJpdGVfZGlyZWN0aW9uID0gdGhpcy5pbnB1dHMueEF4aXM7XG5cbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkNMSU1CX1VQX1NQRUVEO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5tYXgodGhpcy5zcGVlZFkgLSBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgLWNvbnN0YW50cy5DTElNQl9TTElQX1NQRUVEKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gTWF0aC5tYXgodGhpcy5zcGVlZFkgLSBjb25zdGFudHMuR1JBVklUWSAqIGRlbHRhVGltZSwgLWNvbnN0YW50cy5NQVhfRkFMTF9TUEVFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cGRhdGVBbmltYXRpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLnhBeGlzICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9SVU4pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKC4uLkFOSU1BVElPTl9JRExFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbiguLi5BTklNQVRJT05fSlVNUCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0ZBTEwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBzZXRTdGF0ZShuZXdTdGF0ZSkge1xuICAgICAgICBpZiAobmV3U3RhdGUgIT09IHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGxlYXZlIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaCAobmV3U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBlbnRlciBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gY29uc3RhbnRzLlZBUl9KVU1QX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA9IGNvbnN0YW50cy5EQVNIX0NPT0xET1dOO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoID0gY29uc3RhbnRzLkRBU0hfVElNRSArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IGNvbnN0YW50cy5EWUlOR19USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IGNvbnN0YW50cy5CT1VOQ0VfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cmFuc2l0aW9uU2NlbmUodGFyZ2V0U2NlbmUpIHtcbiAgICAgICAgLy8gdmFsaWRhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuc2NlbmUucmVtb3ZlRWxlbWVudChzdHJhd2JlcnJ5KTtcbiAgICAgICAgICAgIHRoaXMuc3RyYXdiZXJyaWVzLmFkZChzdHJhd2JlcnJ5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNjZW5lLnNldFBsYXllcih1bmRlZmluZWQpO1xuICAgICAgICB0YXJnZXRTY2VuZS5zZXRQbGF5ZXIodGhpcyk7XG4gICAgfVxuXG4gICAgZGllKCkge1xuICAgICAgICAvLyByZWFjdGl2YXRlIHRlbXBvcmFyeSBzdHJhd2JlcnJpZXNcbiAgICAgICAgZm9yIChjb25zdCBzdHJhd2JlcnJ5IG9mIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzKSB7XG4gICAgICAgICAgICBzdHJhd2JlcnJ5LmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oLi4uQU5JTUFUSU9OX0RJRSk7XG4gICAgfVxuXG4gICAgcmVzcGF3bigpIHtcbiAgICAgICAgdGhpcy54ID0gdGhpcy5zY2VuZS5zdGFydFBvc2l0aW9uWDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy5zY2VuZS5zdGFydFBvc2l0aW9uWTtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuZGFzaFNwZWVkWSA9IDA7XG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX05PUk1BTCk7XG4gICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICB9XG5cbiAgICByZXN0b3JlRGFzaCgpIHtcbiAgICAgICAgaWYgKHRoaXMubmJEYXNoZXMgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzcXVpc2goKSB7XG4gICAgICAgIHRoaXMuZGllKCk7XG4gICAgfVxuXG4gICAgaXNSaWRpbmcoc29saWQpIHtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmlzUmlkaW5nKHNvbGlkKSB8fFxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkgJiZcbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiBzb2xpZC54ID09PSB0aGlzLnggKyB0aGlzLndpZHRoKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgc2V0QW5pbWF0aW9uKHNwcml0ZV9yb3csIG5iX3Nwcml0ZXMpIHtcbiAgICAgICAgaWYgKHNwcml0ZV9yb3cgIT09IHRoaXMuc3ByaXRlX3Jvdykge1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVfcm93ID0gc3ByaXRlX3JvdztcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uX2NvdW50ZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5uYl9zcHJpdGVzID0gbmJfc3ByaXRlcztcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXIsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cbmNsYXNzIFNjZW5lIHtcbiAgICBjb25zdHJ1Y3Rvcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuc2Nyb2xsWCA9IDA7XG4gICAgICAgIHRoaXMuc2Nyb2xsWSA9IFUgLyAyO1xuICAgICAgICB0aGlzLnNvbGlkcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5hY3RvcnMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblkgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgc2V0U3RhcnRQb3NpdGlvbih4LCB5KSB7XG4gICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblggPSB4O1xuICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25ZID0geTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZnJvbVN0cmluZyhzKSB7XG4gICAgICAgIGNvbnN0IGxpbmVzID0gcy5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgY29uc3Qgd2lkdGggPSBsaW5lc1swXS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKHdpZHRoICogVSwgaGVpZ2h0ICogVSk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbGluZXNbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0gaiAqIFU7XG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IChoZWlnaHQgLSBpIC0gMSkgKiBVO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobGluZXNbaV1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5Tb2xpZCh4LCB5LCBVLCBVKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnISc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLkhhemFyZCh4LCB5LCBVLCBVKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5zZXRTdGFydFBvc2l0aW9uKHgsIHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TcHJpbmcoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5EYXNoRGlhbW9uZCh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnUyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlN0cmF3YmVycnkoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJy0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuUGxhdGZvcm0oeCwgeSwgVSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJz0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuQ3J1bWJsaW5nQmxvY2soeCwgeSwgVSwgVSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNjZW5lO1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tSlNPTihkYXRhKSB7XG4gICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKGRhdGEud2lkdGggKiBVLCBkYXRhLmhlaWdodCAqIFUpO1xuICAgICAgICBjb25zdCBtYWluTGF5ZXIgPSBkYXRhLmxheWVycy5maW5kKGwgPT4gbC5uYW1lID09PSAnbWFpbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1haW5MYXllci5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gbWFpbkxheWVyLmRhdGFbaV0gJiAweDBGRkZGRkZGO1xuICAgICAgICAgICAgY29uc3QgZiA9IChtYWluTGF5ZXIuZGF0YVtpXSA+PiAyOCkgJiAweEY7XG4gICAgICAgICAgICBpZiAodiAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSAoaSAlIG1haW5MYXllci53aWR0aCkgKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSAobWFpbkxheWVyLmhlaWdodCAtIH5+KGkgLyBtYWluTGF5ZXIud2lkdGgpIC0gMSkgKiBVO1xuICAgICAgICAgICAgICAgIGxldCByb3RhdGlvbjtcbiAgICAgICAgICAgICAgICBzd2l0Y2goZikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDBiMDAwMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDBiMTAxMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDBiMTEwMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uID0gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDBiMDExMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uID0gMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRpb24gPSAtMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgdGlsZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICdzZXQnOiAnZm9yZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgJ2luZGV4JzogdiAmIDB4MDBGRkZGRkYsXG4gICAgICAgICAgICAgICAgICAgICdyb3RhdGlvbic6IHJvdGF0aW9uLFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHN3aXRjaCh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzg6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzk6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDY6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDg6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNzM6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLkhhemFyZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5Tb2xpZCh4LCB5LCBVLCBVLCB0aWxlRGF0YSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xuICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53aWR0aCAtIGNvbnN0YW50cy5WSUVXX1dJRFRILFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYIDwgLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueCAtIC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4oXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVpZ2h0IC0gY29uc3RhbnRzLlZJRVdfSEVJR0hULFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA8IC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICBVIC8gMixcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFBsYXllcihwbGF5ZXIpIHtcbiAgICAgICAgaWYgKHRoaXMucGxheWVyKSB0aGlzLnJlbW92ZUFjdG9yKHRoaXMucGxheWVyKTtcbiAgICAgICAgaWYgKHBsYXllcikgdGhpcy5hZGRBY3RvcihwbGF5ZXIpO1xuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5hZGQoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlQWN0b3IoYWN0b3IpIHtcbiAgICAgICAgdGhpcy5hY3RvcnMuZGVsZXRlKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMuYWRkKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIHJlbW92ZVNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnJlbW92ZShzb2xpZCk7XG4gICAgICAgIHNvbGlkLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGFkZEVsZW1lbnQoZWxlbWVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnRzLmFkZChlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuZGVsZXRlKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LnNjZW5lID0gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTY2VuZSxcbn1cbiIsImNvbnN0IHNwcml0ZXNTaGVldCA9IHt9O1xuXG5mdW5jdGlvbiByYW5nZShuKSB7XG4gICAgcmV0dXJuIG5ldyBBcnJheShuKS5maWxsKDApLm1hcCgoeCwgaSkgPT4gaSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVNwcml0ZXMoKSB7XG4gICAgc3ByaXRlc1NoZWV0LmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHNwcml0ZXNTaGVldC5jYW52YXMud2lkdGggPSAxNiAqIDg7XG4gICAgc3ByaXRlc1NoZWV0LmNhbnZhcy5oZWlnaHQgPSAxNiAqIDE4O1xuICAgIHNwcml0ZXNTaGVldC5jb250ZXh0ID0gc3ByaXRlc1NoZWV0LmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4gYWRkU3ByaXRlcyhpbWcpKTtcbiAgICBpbWcuc3JjID0gXCJpbWFnZXMvaGVyb19zcHJpdGVzLnBuZ1wiO1xufVxuXG5cbmZ1bmN0aW9uIGFkZFNwcml0ZXMoaW1hZ2UpIHtcbiAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5zY2FsZSgxLCAtMSk7XG4gICAgZm9yIChsZXQgaSBvZiByYW5nZSg5KSkge1xuICAgICAgICBmb3IgKGxldCBqIG9mIHJhbmdlKDgpKSB7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDE2ICogaiwgMTYgKiBpLCAxNiwgMTYsIDE2ICogaiwgLTE2ICogKDIgKiBpICsgMSksIDE2LCAxNik7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5zY2FsZSgtMSwgMSk7XG4gICAgICAgICAgICBzcHJpdGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIDE2ICogaiwgMTYgKiBpLCAxNiwgMTYsIC0xNiAqIChqKzEpLCAtMTYgKiAoMiAqIGkgKyAyKSwgMTYsIDE2KTtcbiAgICAgICAgICAgIHNwcml0ZXNTaGVldC5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tYWtlU3ByaXRlcygpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc3ByaXRlc1NoZWV0LFxufTsiLCJjb25zdCB0aWxlc1NoZWV0ID0ge307XG5cbmZ1bmN0aW9uIG1ha2VUaWxlcyh0aWxlc2V0cykge1xuICAgIHRpbGVzU2hlZXQubmJUaWxlcyA9IHRpbGVzZXRzLnJlZHVjZSgodCwgeCkgPT4gdCArIHgudGlsZWNvdW50LCAwKTtcbiAgICB0aWxlc1NoZWV0LmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRpbGVzU2hlZXQuY2FudmFzLndpZHRoID0gMTYgKiB0aWxlc1NoZWV0Lm5iVGlsZXM7XG4gICAgdGlsZXNTaGVldC5jYW52YXMuaGVpZ2h0ID0gMTI4O1xuICAgIHRpbGVzU2hlZXQuY29udGV4dCA9IHRpbGVzU2hlZXQuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdGlsZXNTaGVldC5jb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgIHRpbGVzU2hlZXQub2Zmc2V0cyA9IHt9O1xuICAgIHRpbGVzU2hlZXQub2Zmc2V0ID0gMDtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdGlsZXNldHMpIHtcbiAgICAgICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4gYWRkVGlsZXNldCh0LCBpbWcpKTtcbiAgICAgICAgaW1nLnNyYyA9ICd0aWxlbWFwcy8nICsgdC5pbWFnZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZFRpbGVzZXQodGlsZXNldCwgaW1hZ2UpIHtcbiAgICB0aWxlc1NoZWV0Lm9mZnNldHNbdGlsZXNldC5uYW1lXSA9IHRpbGVzU2hlZXQub2Zmc2V0O1xuICAgIHRpbGVzU2hlZXQuY29udGV4dC5zY2FsZSgxLCAtMSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aWxlc2V0LmltYWdlaGVpZ2h0OyBpICs9IDE2KSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgdGlsZXNldC5pbWFnZXdpZHRoOyBqICs9IDE2KSB7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQudHJhbnNsYXRlKHRpbGVzU2hlZXQub2Zmc2V0LCAxNik7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQuc2NhbGUoMSwgLTEpO1xuICAgICAgICAgICAgdGlsZXNTaGVldC5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSwgaiwgaSwgMTYsIDE2LCB0aWxlc1NoZWV0Lm9mZnNldCwgLTE2LCAxNiwgMTYpO1xuXG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQuc2F2ZSgpO1xuICAgICAgICAgICAgdGlsZXNTaGVldC5jb250ZXh0LnRyYW5zbGF0ZSg4ICsgdGlsZXNTaGVldC5vZmZzZXQsIDggLSAzMik7XG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQucm90YXRlKE1hdGguUEkvMik7XG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCBqLCBpLCAxNiwgMTYsIC04LCAtOCwgMTYsIDE2KTtcbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5yZXN0b3JlKCk7XG5cbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQudHJhbnNsYXRlKDggKyB0aWxlc1NoZWV0Lm9mZnNldCwgOCAtIDQ4KTtcbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5yb3RhdGUoTWF0aC5QSSk7XG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCBqLCBpLCAxNiwgMTYsIC04LCAtOCwgMTYsIDE2KTtcbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5yZXN0b3JlKCk7XG5cbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICB0aWxlc1NoZWV0LmNvbnRleHQudHJhbnNsYXRlKDggKyB0aWxlc1NoZWV0Lm9mZnNldCwgOCAtIDY0KTtcbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5yb3RhdGUoLU1hdGguUEkgLyAyKTtcbiAgICAgICAgICAgIHRpbGVzU2hlZXQuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsIGosIGksIDE2LCAxNiwgLTgsIC04LCAxNiwgMTYpO1xuICAgICAgICAgICAgdGlsZXNTaGVldC5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIC8vIHRpbGVzU2hlZXQuY29udGV4dC50cmFuc2xhdGUodGlsZXNTaGVldC5vZmZzZXQsIDE2KTtcbiAgICAgICAgICAgIC8vIHRpbGVzU2hlZXQuY29udGV4dC5zY2FsZSgxLCAtMSk7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCBqLCBpLCAxNiwgMTYsIDAsIDAsIDE2LCAxNik7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIHRpbGVzU2hlZXQuY29udGV4dC50cmFuc2xhdGUodGlsZXNTaGVldC5vZmZzZXQsIDE2KTtcbiAgICAgICAgICAgIC8vIHRpbGVzU2hlZXQuY29udGV4dC5zY2FsZSgxLCAtMSk7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCBqLCBpLCAxNiwgMTYsIDAsIDAsIDE2LCAxNik7XG4gICAgICAgICAgICAvLyB0aWxlc1NoZWV0LmNvbnRleHQucmVzdG9yZSgpO1xuXG4gICAgICAgICAgICB0aWxlc1NoZWV0Lm9mZnNldCArPSAxNjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxubWFrZVRpbGVzKFtcbiAgICB7XG4gICAgICAgIFwiY29sdW1uc1wiOiA4LFxuICAgICAgICBcImltYWdlXCI6IFwiZm9yZXN0X3RpbGVzZXQucG5nXCIsXG4gICAgICAgIFwiaW1hZ2VoZWlnaHRcIjogMTYwLFxuICAgICAgICBcImltYWdld2lkdGhcIjogMTI4LFxuICAgICAgICBcIm1hcmdpblwiOiAwLFxuICAgICAgICBcIm5hbWVcIjogXCJmb3Jlc3RcIixcbiAgICAgICAgXCJzcGFjaW5nXCI6IDAsXG4gICAgICAgIFwidGlsZWNvdW50XCI6IDgwLFxuICAgICAgICBcInRpbGVkdmVyc2lvblwiOiBcIjEuMy41XCIsXG4gICAgICAgIFwidGlsZWhlaWdodFwiOiAxNixcbiAgICAgICAgXCJ0aWxld2lkdGhcIjogMTYsXG4gICAgICAgIFwidHlwZVwiOiBcInRpbGVzZXRcIixcbiAgICAgICAgXCJ2ZXJzaW9uXCI6IDEuMlxuICAgIH0sXG5dKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0aWxlc1NoZWV0OiB0aWxlc1NoZWV0LFxufSJdfQ==
