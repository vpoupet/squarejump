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
const DYING_TIME = .5;
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


class PlayerInputs {
    constructor() {
        this.xAxis = 0;
        this.yAxis = 0;
        this.jumpPressedBuffer = false;
        this.jumpHeld = false;
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

    update(deltaTime) {
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        this.xAxis = 0;
        this.yAxis = 0;
        if (pressedKeys.has(this.keymap['left'])) {
            this.xAxis -= 1;
        }
        if (pressedKeys.has(this.keymap['right'])) {
            this.xAxis += 1;
        }
        if (pressedKeys.has(this.keymap['up'])) {
            this.yAxis += 1;
        }
        if (pressedKeys.has(this.keymap['down'])) {
            this.yAxis -= 1;
        }
        const prevJump = this.jumpHeld;
        this.jumpHeld = pressedKeys.has(this.keymap['jump']);
        if (!prevJump && this.jumpHeld) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
            this.jumpPressedBuffer = true;
        } else {
            this.jumpPressedBuffer &= this.timers.jumpBuffer > 0;
        }

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap['dash']);
        if (!prevDash && this.dashHeld) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (this.timers.dashBuffer > 0);
    }
}


module.exports = {
    PlayerInputs,
    pressedKeys,
}

},{}],3:[function(require,module,exports){
"use strict";
const constants = require('./constants');
const maps = require('./maps');
const inputs = require('./inputs');
const player = require('./player');

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

            context.fillStyle = '#ffffff';  // background color
            context.fillRect(0, 0, SCALING * constants.VIEW_WIDTH, SCALING * constants.VIEW_HEIGHT);
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

window.getKeyMap = function() {
    return currentScene.player.inputs.keymap;
}

window.setKeyMap = function(d) {
    currentScene.player.inputs.keymap = d;
};

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

    currentScene = maps.CELESTE_01;
    currentScene.setPlayer(new player.Player(currentScene.startPositionX, currentScene.startPositionY));
    start();
};
},{"./constants":1,"./inputs":2,"./maps":4,"./player":7}],4:[function(require,module,exports){
"use strict"
const scene = require('./scene');
const movement = require('./movement');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;


function makeTransitionUp(scene1, x1, y1, scene2, x2, y2, width) {
    const transitionUp = new physics.Transition(
        x1 * U, (y1 + 1) * U, width * U, 0, scene2, x2 * U, (y2 + 3) * U
    );
    transitionUp.boostY = constants.TRANSION_BOOST_UP;
    scene1.addElement(transitionUp);
    scene2.addElement(new physics.Transition(
        x2 * U, (y2 - 1) * U, width * U, 0, scene1, x1 * U, (y1 - 3) * U
    ))
}

function makeTransitionRight(scene1, x1, y1, scene2, x2, y2, height) {
    scene1.addElement(new physics.Transition(
        x1 * U, y1 * U, 0, height * U, scene2, (x2 + 1) * U, y2 * U
    ))
    scene2.addElement(new physics.Transition(
        x2 * U, y2 * U, 0, height * U, scene1, (x1 - 1) * U, y1 * U
    ))
}


const CELESTE_01 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     xxxx
xx  x xxx    xxxxxxxxx              xxxx
xx  x   x    xxxxx   x             xxxxx
xx  xxx x    xxx     x             xxxxx
xx  x   x    xxx                  xxxxxx
xx  x   x    xxx                   xxxxx
xx  xxxxx                          xxxxx
xx                             xxxxxxxxx
xx                             xxxxxxxxx
x                              xxxxxxxxx
x                 xxxx           !xxxxxx
x                 x  x           !xxxxxx
x                 x  x              xxxx
x                 xxxx              xxxx
x                 xxxx              xxxx
x                 xxxx!!!!          xxxx
x         xxx     xxxxxxxx           xxx
x  P      xxx     xxxxxxxx           xxx
xxxxx     xxx!!!!!xxxxxxxx            xx
xxxxx     xxxxxxxxxxxxxxxx!!!          x
xxxxx!!!!!xxxxxxxxxxxxxxxxxxx          x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x`);


const CELESTE_02 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xx
xxx     xx    x xxxxxxxxxxxxxxxxxx    xx
xxx     xx    x     xxxxx  xxxxxxx    xx
xxxxxxxxxx    x     xxxxx    xxxxx    xx
xxx     x     x     xxxxx    xxxxx    xx
xxxxxxxxx  S         xxxx    xxxxx    xx
xxx     x            xxx        xx    xx
xxxxxxxxx            xxx        xx    xx
xx                   xxx        xx    xx
xx                              xx    xx
xx                               x    xx
xx                               x    xx
x                                     xx
x                   !!!!!             xx
x                   xxxxx             xx
x                   xxxxx       xxxxxxxx
x                   xxxx        xxxxxxxx
x             B      xxx        xxxxxxxx
x             xx     xxx    xxxxxxxxxxxx
x  P          xx     xxx!!  xxxxxxxxxxxx
x-----xxxxxxxxxx     xxxxx!!xxxxxxxxxxxx
x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx
x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx`);

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
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.xRemainder = 0;
        this.yRemainder = 0;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
    constructor(x, y, width, height) {
        super(x, y, width, height);
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
    constructor(x, y, width, height) {
        super(x, y, width, height);
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
    constructor(x, y, width) {
        super(x, y + U / 2, width, U / 2);
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

},{"./constants":1}],7:[function(require,module,exports){
"use strict"
const inputs = require('./inputs');
const physics = require('./physics');
const constants = require('./constants');


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
        // timers
        this.timers.jumpGrace = 0;
        this.timers.dashCooldown = 0;
        this.timers.dashFreeze = 0;
        this.timers.dash = 0;
        this.timers.varJump = 0;
        this.timers.dying = 0;
        this.timers.bounce = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.inputs.update(deltaTime);

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
                } else if (this.inputs.yAxis === -1) {
                    this.speedY = Math.max(this.speedY - constants.GRAVITY * deltaTime, -constants.CLIMB_SLIP_SPEED);
                } else {
                    this.speedY = 0;
                }
            } else {
                this.speedY = Math.max(this.speedY - constants.GRAVITY * deltaTime, -constants.MAX_FALL_SPEED);
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
}


module.exports = {
    Player,
}
},{"./constants":1,"./inputs":2,"./physics":6}],8:[function(require,module,exports){
"use strict";
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;


class Scene {
    constructor(width, height, startPositionX = undefined, startPositionY = undefined) {
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = U / 2;
        this.solids = new Set();
        this.actors = new Set();
        this.elements = new Set();
        this.transition = undefined;

        if (startPositionX !== undefined && startPositionY !== undefined) {
            this.player = new physics.Player(startPositionX, startPositionY);
            this.startPositionX = startPositionX;
            this.startPositionY = startPositionY;
            this.addActor(this.player);
        } else {
            this.startPositionX = undefined;
            this.startPositionY = undefined;
            this.player = undefined;
        }
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

},{"./constants":1,"./physics":6}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gRnJvbSBDZWxlc3RlIHNvdXJjZSBjb2RlXG5jb25zdCBNQVhfUlVOX1NQRUVEID0gOTA7XG5jb25zdCBSVU5fQUNDRUxFUkFUSU9OID0gMTAwMDtcbmNvbnN0IFJVTl9ERUNFTEVSQVRJT04gPSA0MDA7XG5jb25zdCBBSVJfRkFDVE9SID0gLjY1O1xuY29uc3QgSlVNUF9TUEVFRCA9IDEwNTtcbmNvbnN0IEpVTVBfSE9SSVpPTlRBTF9CT09TVCA9IDQwO1xuY29uc3QgTUFYX0ZBTExfU1BFRUQgPSAxNjA7XG5jb25zdCBHUkFWSVRZID0gOTAwO1xuY29uc3QgSlVNUF9HUkFDRV9USU1FID0gLjE7XG5jb25zdCBWQVJfSlVNUF9USU1FID0gLjI7XG5jb25zdCBDTElNQl9VUF9TUEVFRCA9IDQ1O1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IE1PTUVOVFVNX1NUT1JFX1RJTUUgPSAuMTtcbmNvbnN0IE1PTUVOVFVNX0ZBQ1RPUiA9IC43NTtcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTgwO1xuY29uc3QgRFlJTkdfVElNRSA9IC41O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9VUF9TUEVFRCxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIE1PTUVOVFVNX1NUT1JFX1RJTUUsXG4gICAgTU9NRU5UVU1fRkFDVE9SLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcblxuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmtleW1hcCA9IHtcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHVwOiAnQXJyb3dVcCcsXG4gICAgICAgICAgICBkb3duOiAnQXJyb3dEb3duJyxcbiAgICAgICAgICAgIGp1bXA6ICdnJyxcbiAgICAgICAgICAgIGRhc2g6ICdmJyxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpbWVycyA9IHtcbiAgICAgICAgICAgIGp1bXBCdWZmZXI6IDAsXG4gICAgICAgICAgICBkYXNoQnVmZmVyOiAwLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwWydsZWZ0J10pKSB7XG4gICAgICAgICAgICB0aGlzLnhBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFsncmlnaHQnXSkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwWyd1cCddKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2Rvd24nXSkpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmV2SnVtcCA9IHRoaXMuanVtcEhlbGQ7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2p1bXAnXSk7XG4gICAgICAgIGlmICghcHJldkp1bXAgJiYgdGhpcy5qdW1wSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgJj0gdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA+IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2RGFzaCA9IHRoaXMuZGFzaEhlbGQ7XG4gICAgICAgIHRoaXMuZGFzaEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2Rhc2gnXSk7XG4gICAgICAgIGlmICghcHJldkRhc2ggJiYgdGhpcy5kYXNoSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA+IDApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgcHJlc3NlZEtleXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBtYXBzID0gcmVxdWlyZSgnLi9tYXBzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcblxuY29uc3QgU0NBTElORyA9IDI7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5sZXQgY29udGV4dDtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5sZXQgc2Nyb2xsWCA9IDA7XG5sZXQgc2Nyb2xsWSA9IDA7XG5cbmZ1bmN0aW9uIHNsb3dkb3duKGZhY3Rvcikge1xuICAgIFNMT1dET1dOX0ZBQ1RPUiA9IGZhY3RvcjtcbiAgICBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKSAvIChTTE9XRE9XTl9GQUNUT1IgKiAxMDAwKTtcbn1cblxuXG5mdW5jdGlvbiBzZXRTY3JvbGwoeCwgeSkge1xuICAgIGNvbnRleHQudHJhbnNsYXRlKHNjcm9sbFggLSB4LCBzY3JvbGxZIC0geSk7XG4gICAgc2Nyb2xsWCA9IHg7XG4gICAgc2Nyb2xsWSA9IHk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB1cGRhdGUoKTtcbn1cblxuXG5mdW5jdGlvbiBzdG9wKCkge1xuICAgIGlzUnVubmluZyA9IGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc1J1bm5pbmcpIHtcbiAgICAgICAgc2xvd2Rvd25Db3VudGVyICs9IDE7XG4gICAgICAgIGlmIChzbG93ZG93bkNvdW50ZXIgPj0gU0xPV0RPV05fRkFDVE9SKSB7XG4gICAgICAgICAgICBzbG93ZG93bkNvdW50ZXIgLT0gU0xPV0RPV05fRkFDVE9SO1xuICAgICAgICAgICAgZnJhbWVDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7ZnJhbWVDb3VudGVyIC8gZnJhbWVSYXRlUmVmcmVzaH0gRlBTYCk7XG4gICAgICAgICAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRklYRURfREVMVEFfVElNRSA/XG4gICAgICAgICAgICAgICAgMSAvIEZSQU1FX1JBVEUgOlxuICAgICAgICAgICAgICAgIE1hdGgubWluKCh0aW1lTm93IC0gbGFzdFVwZGF0ZSkgLyAoMTAwMCAqIFNMT1dET1dOX0ZBQ1RPUiksIC4wNSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyNmZmZmZmYnOyAgLy8gYmFja2dyb3VuZCBjb2xvclxuICAgICAgICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfV0lEVEgsIFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFNjcm9sbChjdXJyZW50U2NlbmUuc2Nyb2xsWCwgY3VycmVudFNjZW5lLnNjcm9sbFkpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLmRyYXcoY29udGV4dCk7XG4gICAgICAgICAgICBsYXN0VXBkYXRlID0gdGltZU5vdztcbiAgICAgICAgfVxuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlKTtcbiAgICB9XG59XG5cbndpbmRvdy5nZXRLZXlNYXAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY3VycmVudFNjZW5lLnBsYXllci5pbnB1dHMua2V5bWFwO1xufVxuXG53aW5kb3cuc2V0S2V5TWFwID0gZnVuY3Rpb24oZCkge1xuICAgIGN1cnJlbnRTY2VuZS5wbGF5ZXIuaW5wdXRzLmtleW1hcCA9IGQ7XG59O1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJ3cnOlxuICAgICAgICAgICAgICAgIGlmIChTTE9XRE9XTl9GQUNUT1IgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgLVNDQUxJTkcpO1xuICAgIGNvbnRleHQudHJhbnNsYXRlKDAsIC1jb25zdGFudHMuVklFV19IRUlHSFQpO1xuXG4gICAgY3VycmVudFNjZW5lID0gbWFwcy5DRUxFU1RFXzAxO1xuICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoY3VycmVudFNjZW5lLnN0YXJ0UG9zaXRpb25YLCBjdXJyZW50U2NlbmUuc3RhcnRQb3NpdGlvblkpKTtcbiAgICBzdGFydCgpO1xufTsiLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBtb3ZlbWVudCA9IHJlcXVpcmUoJy4vbW92ZW1lbnQnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIHkxLCBzY2VuZTIsIHgyLCB5Miwgd2lkdGgpIHtcbiAgICBjb25zdCB0cmFuc2l0aW9uVXAgPSBuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MSAqIFUsICh5MSArIDEpICogVSwgd2lkdGggKiBVLCAwLCBzY2VuZTIsIHgyICogVSwgKHkyICsgMykgKiBVXG4gICAgKTtcbiAgICB0cmFuc2l0aW9uVXAuYm9vc3RZID0gY29uc3RhbnRzLlRSQU5TSU9OX0JPT1NUX1VQO1xuICAgIHNjZW5lMS5hZGRFbGVtZW50KHRyYW5zaXRpb25VcCk7XG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihcbiAgICAgICAgeDIgKiBVLCAoeTIgLSAxKSAqIFUsIHdpZHRoICogVSwgMCwgc2NlbmUxLCB4MSAqIFUsICh5MSAtIDMpICogVVxuICAgICkpXG59XG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB4MSwgeTEsIHNjZW5lMiwgeDIsIHkyLCBoZWlnaHQpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MSAqIFUsIHkxICogVSwgMCwgaGVpZ2h0ICogVSwgc2NlbmUyLCAoeDIgKyAxKSAqIFUsIHkyICogVVxuICAgICkpXG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihcbiAgICAgICAgeDIgKiBVLCB5MiAqIFUsIDAsIGhlaWdodCAqIFUsIHNjZW5lMSwgKHgxIC0gMSkgKiBVLCB5MSAqIFVcbiAgICApKVxufVxuXG5cbmNvbnN0IENFTEVTVEVfMDEgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgeHh4eFxueHggIHggeHh4ICAgIHh4eHh4eHh4eCAgICAgICAgICAgICAgeHh4eFxueHggIHggICB4ICAgIHh4eHh4ICAgeCAgICAgICAgICAgICB4eHh4eFxueHggIHh4eCB4ICAgIHh4eCAgICAgeCAgICAgICAgICAgICB4eHh4eFxueHggIHggICB4ICAgIHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggIHggICB4ICAgIHh4eCAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgIXh4eHh4eFxueCAgICAgICAgICAgICAgICAgeCAgeCAgICAgICAgICAgIXh4eHh4eFxueCAgICAgICAgICAgICAgICAgeCAgeCAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgeHh4eCEhISEgICAgICAgICAgeHh4eFxueCAgICAgICAgIHh4eCAgICAgeHh4eHh4eHggICAgICAgICAgIHh4eFxueCAgUCAgICAgIHh4eCAgICAgeHh4eHh4eHggICAgICAgICAgIHh4eFxueHh4eHggICAgIHh4eCEhISEheHh4eHh4eHggICAgICAgICAgICB4eFxueHh4eHggICAgIHh4eHh4eHh4eHh4eHh4eHghISEgICAgICAgICAgeFxueHh4eHghISEhIXh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgeGApO1xuXG5cbmNvbnN0IENFTEVTVEVfMDIgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eFxueHh4ICAgICB4eCAgICB4IHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eFxueHh4ICAgICB4eCAgICB4ICAgICB4eHh4eCAgeHh4eHh4eCAgICB4eFxueHh4eHh4eHh4eCAgICB4ICAgICB4eHh4eCAgICB4eHh4eCAgICB4eFxueHh4ICAgICB4ICAgICB4ICAgICB4eHh4eCAgICB4eHh4eCAgICB4eFxueHh4eHh4eHh4ICBTICAgICAgICAgeHh4eCAgICB4eHh4eCAgICB4eFxueHh4ICAgICB4ICAgICAgICAgICAgeHh4ICAgICAgICB4eCAgICB4eFxueHh4eHh4eHh4ICAgICAgICAgICAgeHh4ICAgICAgICB4eCAgICB4eFxueHggICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICB4eCAgICB4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eCAgICB4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCAgICB4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCAgICB4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICAhISEhISAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICB4eHh4eCAgICAgICAgICAgICB4eFxueCAgICAgICAgICAgICAgICAgICB4eHh4eCAgICAgICB4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICB4eHh4ICAgICAgICB4eHh4eHh4eFxueCAgICAgICAgICAgICBCICAgICAgeHh4ICAgICAgICB4eHh4eHh4eFxueCAgICAgICAgICAgICB4eCAgICAgeHh4ICAgIHh4eHh4eHh4eHh4eFxueCAgUCAgICAgICAgICB4eCAgICAgeHh4ISEgIHh4eHh4eHh4eHh4eFxueC0tLS0teHh4eHh4eHh4eCAgICAgeHh4eHghIXh4eHh4eHh4eHh4eFxueCAgICAgeHh4eHh4ICB4eCAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eFxueCAgICAgeHh4eHh4ICB4eCAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDEsIDMxLCAyMywgQ0VMRVNURV8wMiwgMSwgMCwgNSk7XG5cblxuY29uc3QgQ0VMRVNURV8wMyA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4XG54eHh4eHggICAgICAgICB4eHh4eHh4eHh4eHggICAgeHggICAgeHh4XG54eHh4eHggICAgICAgICB4eCAgICAgICAgIHggICAgIHggICAgeHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgeHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICB4eHggICAgICAgICAgICAgICAgICAgeHh4ICAgIHh4XG54ICAgICAgICB4eHggICAgICAgICAgICAgICAgICAgeHh4ICAgIHh4XG54ICAgICAgICAgIHggICAgICAgICAgICAgICAgICAgeHh4ICAgIHh4XG54ICAgICAgICAgIHggICAgICAgICAgICAgICAgICAgeHggICAgIHh4XG54ICAgICAgICAgIHggICAgeCAgICAgICAgICAgICAgeHggICAgICB4XG54ICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgeHggICAgICB4XG54ICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgIHggICAgICB4XG54ICAgICAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgICAgICB4XG54ICAgICAgICAgICAgICAgeHh4eCAgICAgICEhISAgICAgIFMgICB4XG54ICAgICAgICAgICAgICAgICB4eCAgICAgIHh4eCEhISEhICAgICB4XG54ICAgICAgICAgICAgICAgICB4eCAgICAgIHh4eHh4eHh4ICAgICF4XG54eCAgICAgICAgICAgICAgICAgeCAgICEhIXh4eHh4eHh4ISEhIXh4XG54eCAgUCAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4XG54eC0tLS14eHggICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4XG54eCAgICB4eHggICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wMiwgMzQsIDIzLCBDRUxFU1RFXzAzLCAyLCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA0ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eCAgICAgIHh4eCAgICB4eHh4eHh4eHh4IHh4eHhcbnh4eHh4eCAgICAgICAgICAgIHh4eCAgICAgIHh4eHh4ICAgIHh4eHhcbnh4eHh4ICAgICAgICAgICAgIHh4eCAgICAgICF4eHh4ICAgIHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgeCAgICAgICF4eHh4ICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgeCAgICAgICF4eHh4ICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICF4eCAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgeHhcbnh4eCAgICAgeHgtLSAgICAgICAgICAgICAgICAgeCAgICAgICAgeHhcbnh4eCAgICAgeHggICAgICAgICAgICAgICAgICAgeCAgICAgICAgeHhcbnh4eCAgICAgeHggICAgICAgICAgICAgICAgICAgeCAgICAgICAgeHhcbnh4eCAgICAgIXggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eCAgICAgIXghISAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4ISAgICAgIXh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4ISAgICAgIXh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eCAgUCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eC0tLS14eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eCAgICB4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eCAgICB4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhgKTtcblxuQ0VMRVNURV8wNC5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAxMSAqIFUsIDMgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgwLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxNCAqIFUsIDExICogVSwgMjMgKiBVLCAxMiAqIFUsIC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDIzICogVSwgMTIgKiBVLCAxNCAqIFUsIDExICogVSwgMSksXG5dKSkpO1xubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzAzLCAzMywgMjMsIENFTEVTVEVfMDQsIDMsIDAsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDUgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eHh4eFxueHh4eHh4ICAgICAgICAgICAgIHh4eCAgICB4eHh4eHh4eHh4eHh4eFxueHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHggICAgICAgICAgICAgICAgICAgICB4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICAgICAgeHh4eHh4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICAgICAgeHh4eHh4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICBTICAgIHh4eHh4eHggICAgPT09ICAgICAgeFxueHggICAgICAgICAgICAgICAgICB4eHh4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICAgICAgICB4eHh4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICAgICAgICB4eHh4eHggICAgICAgICAgICAgeFxueHggICAgICAgICAgICAgICAgICAgICB4eHggICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICB4eCAgID09PSAgICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgID09PSAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueCAgeCAgICAgICAgICB4eCAgICAgICAgICAgICA9PT0gICAgICAgeFxueHh4eCAgUCAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4eC0tLS14eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgICAgeFxueHh4eCAgICB4eHh4eHggIHh4eHh4eHh4eHggICAgICAgICAgICAgeGApO1xuXG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDQsIDIxLCAyMywgQ0VMRVNURV8wNSwgNCwgMCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8wNiA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgIHh4XG54eCAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgIHh4XG54eCAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgIHh4XG54eCAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgIHh4XG54eCBTICAgICAgICAgIHh4eCAgICB4eHh4eHh4eHh4eHh4eCAgIHh4XG54eCAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eCEgeCAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgeHggIHh4eHh4eCEgICAgICB4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgIHh4eCEgICAgICB4XG54eHh4eCAgICAgICAgICAgICAgICAgICAgICAgIHh4eCEgICAgICB4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eCEgICAgICB4XG54ICAgICAhISEgICAgICAgICAgICAgICAgICAgICB4eCEgICAgICB4XG54ICAgICB4eHggICAgICAgICAgICAgICAgICAgICB4eHggICAgICB4XG54ICAgICB4eHggICAgICAgICAgICAgICAgICAgICB4eHggICAgICB4XG54ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgeHggICAgICB4XG54ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgeHggICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBCICB4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eCB4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICB4eHggICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICB4eHggICAgICAgICB4eHh4XG54ISAgICAgICAgICAgICAgICAgICAhISF4eHggICAgICAgICB4eHh4XG54eCAgICAhISEgICAgICAgICAgICB4eHh4eHggICAgICAgICAgeHh4XG54eCEhISF4eHggICAgICAgICAgICB4eHh4eHggICAgICAgICAgeHh4XG54eHh4eHh4eHghISEhICAgICEhISF4eHh4eHggICAgICAgICAgeHh4XG54eHh4eHh4eHh4eHh4ICAgIHh4eHh4eHh4eHh4ICAgICAgICAgeHh4XG54eHh4eHh4eHh4eHh4ICAgIHh4eHh4ICB4eHh4ICAgICAgICAgIHh4XG54eHh4eHh4ICAgICAgICAgICAgeHggICB4eHggICAgICAgICAgIHh4XG54eHh4eHggICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgIHh4XG4gICAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAgICAgXG54eCAgUCAgICAgIHh4ICAgIHh4eCAgICAgeHh4ICAgICAgICAgICAgXG54eHgtLS0teHh4eHh4ICAgIHh4eCEhISEheHh4ICAgICAgICAtLS14XG54eHggICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgICB4YCk7XG5cbkNFTEVTVEVfMDYuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDEzICogVSwgVSwgNCAqIFUsIDIgKiBVLCBuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDAuNSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDEzICogVSwgVSwgMTMgKiBVLCA5ICogVSwgLjMpLFxuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCA5ICogVSwgMTMgKiBVLCBVLCAxKSxcbl0pKSk7XG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDUsIDIyLCAyMywgQ0VMRVNURV8wNiwgMywgMCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8wNyA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgICAgICB4eHh4eHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgICAgICAgIHh4eHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgICAgICAgIHh4eHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgICAgICAgICB4eHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgICAgICAgICB4eHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgICEgICAgICAgeHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgIHggICAgICAgIHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHggICAgIHggICAgICAgIHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHghICAgIHggICAgICAgIHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgIHggICAgICAgIHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgIHhCICAgICAgIHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgIHh4eC0tICAgeHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgIXh4eCAgICAgeHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgeHh4eCAgICAgeHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgeHh4eHgtLS0teHh4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgeHh4eHggICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgeHh4ICAgICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ISAgeHh4ICAgICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4ICAgICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4ICAgICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4ICAgICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4ISEhICAgICB4eCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4eHh4ICAgICAgeCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4eHh4ICAgICAgeCEgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCAgeHh4eHh4ICAgICAgICAgICB4eHh4eHh4eHh4XG54eHh4eHh4eHh4ICAgeHh4eHh4eHh4ICAgICAgICAgICAgICAgIHh4XG54eHh4eHh4eHh4ICAgICAgeHh4eHh4ICAgICAgICAgICAgICAgIHh4XG54eHh4eHh4eHggICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICB4XG54eHh4eHh4eHggICAgICAgICAgIHh4eC0tLXh4eHgtLS0tICAgICAgXG54eHh4eHh4eHggICAgICAgIFMgICAgICAgIHh4eCAgICAgICAgICAgXG54eHh4eHh4eHggICAgICAgICAgICAgICAgIHh4eCAgICAgICAgUCAgXG54eHh4eHh4eHggICAgICAgICB4eHh4eHh4eHh4eCAgICB4eHh4eHh4XG54eHh4eHh4eHghISEhISEheHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4ICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uUmlnaHQoQ0VMRVNURV8wNywgNDAsIDMsIENFTEVTVEVfMDYsIDAsIDMsIDMpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDggPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4ICAgICAgICAgICAgICAgICAgICAgISEhISAgICAgICAgICAgIFxueHh4ICAgICAgICAgICAgICAgICAhISEheHh4eCAgICAgICAgICAgIFxueHh4eHggICAgICEhISEhISAgICB4eHh4eHh4eCAgICAgICAgICAgIFxuICAgICAgICAgIHh4eHh4eCAgICB4eHh4eHggICAgICAgICAgICAgIFxuICAgICAgICAgIHh4eHh4eCAgICB4eCAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIHh4eHh4eCBEICB4ICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIHh4eHh4eCAgICB4ICAgICAgICAgICAgICAgICB4eFxueHh4eHh4ICAgIHh4eHh4eCAgICAgICAgICAgICAgIHh4LS0tLXh4eFxueHh4eCB4ICAgIHh4eHh4eCAgICAgICAgICAgLS14eHh4ICAgIHh4eFxueHggICB4ICAgIHh4eHh4ICAgICAgICAgICAgICB4eHh4IFMgIHh4eFxueHggICAgICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgIHh4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgIHh4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgIHh4eHggICAgICAgICAgICAtLS0tLXh4eHh4eHh4eFxueCAgICAgICB4eHh4eHggICAgICAgICAgICAgICEhIXh4eHh4eHh4eFxueCAgICAgICB4eHh4eHggICAgICAgICEhISEhIXh4eHh4eHh4eHh4eFxueCBQICAgICB4eHh4eHghISAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eFxueC0tLXh4eHh4eHh4eHh4eCEhISEhIXh4eHh4eHh4eHh4eHh4eHh4eFxueCAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDYsIDM1LCAzNiwgQ0VMRVNURV8wOCwgMSwgMCwgMyk7XG5cblxuY29uc3QgQ0VMRVNURV8wOSA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICAgeHh4eCAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHggICAgICAgICAgICAgICAgeHh4ICB4eHh4ICAgIHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICB4eHh4eHh4XG4gICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICB4eHh4eHh4XG4gICAgICAgICAheHh4eHgtLS0teHggICAgICAgIFMgICAgeHh4eHh4XG4gICAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICAgeHh4eHh4XG4gIFAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICB4eHh4eHh4XG54eC0tLSAgICAheHh4ICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4XG54eCAgICAgICAheHh4ICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4XG54eCAgICAgICAheHggICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4XG54eCAgICEhICAheHggICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eCEhIXh4ICAheHggICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeCAgeHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4YCk7XG5cbkNFTEVTVEVfMDkuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMy41ICogVSwgMiAqIFUsIDMgKiBVLCBuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAzLjUgKiBVLCAyMSAqIFUsIDcuNSAqIFUsIC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDIxICogVSwgNy41ICogVSwgMTQgKiBVLCAzLjUgKiBVLCAxLjUpLFxuXSkpKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoQ0VMRVNURV8wNiwgNDAsIDIsIENFTEVTVEVfMDksIDAsIDE0LCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzEwID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4ICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgeHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4ICAgICAgICB4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4ICAgICAgICB4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4ICAgICAgICB4eHggICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUCAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHggICAgICAgICBEICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eHh4eHh4eHggICAgICAgICAgICAgICAgICAgIHh4eHggICAgeHh4XG54eHh4eHh4eHghISAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eCEhISEhISEhISEhISEgICAgIHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHghISEhIXh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5tYWtlVHJhbnNpdGlvblJpZ2h0KENFTEVTVEVfMTAsIDQwLCAxMiwgQ0VMRVNURV8wOCwgMCwgMTIsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMTEgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4eHh4ICAgICAgICAgICAhISAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICBTICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4IHh4eHh4eCAgICAgICAgICAgICAgISEgICAgICAgICAgICAgICAgICAgeHh4eFxueHggeHh4eHh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgISAgICAgICB4eHh4XG54eCB4eHh4eHggICAgICAgICAgICAgIHh4ICAgICAgICAgICB4ISAgICAgIHh4eHhcbnh4IHh4eHh4eC0tICAgICBEICAgICAgeHggICAgICAgICAgIXh4ICAgICAgeHh4eFxueHggeHh4eHh4ICAgICAgICAgICAgICB4eCAgICAgICAgICB4eHghICAgICB4eHh4XG54eCB4eHh4eHggICAgICAgICAgICAgICEhICAgICAgICAgIHh4eHggICAgIHh4eHhcbnh4IHggIHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgISEhISAgICAgIHh4eFxueHggICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eCAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4ICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHggICB4eHghISEhICAgICAgISEhISEhICAgIEIgICAgICAgICAgICAgICAgeHh4XG54eCAgIHh4eHh4eHghISEhISF4eHh4eHghISEheHh4eCAgICAgICAgICAgICB4eHhcbnh4eCAgeHh4eHh4eHh4eHh4eCAgeHh4eHh4eHh4eHh4ICAgIEIgICAgIFAgIHh4eFxueHh4ICB4eHggICB4ICAgICB4ICAgICAgeCAgICB4eHh4eHh4eHh4eHh4LS0geHh4XG54eHggIHh4eCAgIHggICAgIHggICAgICB4ICAgIHh4eHh4eHh4eHh4eHggICB4eHhgKTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8xMCwgMiwgMjMsIENFTEVTVEVfMTEsIDQyLCAwLCAzKTtcblxuXG5jb25zdCBDRUxFU1RFXzEyID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eCAgeHh4ICAgeCAgICAgeCAgICAgIHggICAgeHh4eHh4eHh4eHhcbnh4eCAgeHh4eHh4eHh4ICAgeCAgeHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgeHggICAgeHh4eHh4eHh4eHh4eCAgeHh4eHh4eHh4eHh4eHhcbnh4eD09eHggICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQICBcbnh4ICAgIHggICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoQ0VMRVNURV8xMiwgNDAsIDExLCBDRUxFU1RFXzEwLCAwLCAxMSwgNCk7XG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMTIsIDMsIDIzLCBDRUxFU1RFXzExLCAzLCAwLCAyKTtcblxuXG5jb25zdCBDRUxFU1RFXzEzID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbiAgICB4eHh4eHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB4eHh4eHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB4ICB4eHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB4ICB4eHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICB4ICAgIHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgIHh4eHh4eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB4eHh4ICAgIEQgICAgICAgICAgIHh4eHggICAgICAgICAgICAgICBcbiAgUCAgICAgICB4eHh4ICAgICAgICAgICAtLS0tLXh4eHggICAgICAgICAgICAgICBcbnh4eC0tLSAgICB4eHh4ICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICB4eHh4ICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICB4eHh4ICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICB4eHh4ICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICB4eHh4ICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICEhISF4ICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgIC0tLS14ICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICB4ICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzA4LCA0MCwgMTMsIENFTEVTVEVfMTMsIDAsIDEzLCAxMCk7XG5cblxuY29uc3QgVEVTVF9MRVZFTCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4ICAgICAgICAgICAgICAgeHh4eHh4XG54eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgIHh4eHh4eHggICAgICAgICAgeHh4eCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgIHh4eHh4eHh4eCAgICAgIHh4eHggICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ISEgICAgICAgIHh4eHh4eHh4eCAgICAgICB4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eHghIXh4ICAgIHh4eHh4eHh4eCAgICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgIHggICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4eHh4ICAgICAgICAgICAgICAgIHggICAgICAgICAgICEhIXh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgIXh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHggICAgICAgICAgICAgIFAgICAgIHggICAgICAgICAgIXh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eHggICAgICAgICAgICB4eHh4ICAgIHggICAgICAgICAgIXh4eHh4ISEhISEhISEhISAgICAgICAhISEhISEhIXh4eHh4XG54eHggICAgICAgICAgICF4eHh4ICAgIHh4eHggICAgICAgIXh4eHh4eHh4eHh4eHh4ISEhISEhISEheHh4eHh4eHh4eHh4XG54eHh4eHh4eCEhISEhISF4eHh4ICAgIHh4eHghISEhISEhIXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cblRFU1RfTEVWRUwuYWRkRWxlbWVudChcbiAgICBuZXcgcGh5c2ljcy5IYXphcmQoNyAqIFUsIDIwICogVSwgMiAqIFUsIDIgKiBVKVxuICAgICAgICAuc2V0TW92ZW1lbnQobmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoNyAqIFUsIDIwICogVSwgNyAqIFUsIDIgKiBVLCAxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDcgKiBVLCAyICogVSwgNyAqIFUsIDIwICogVSwgMSksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRFbGVtZW50KFxuICAgIG5ldyBwaHlzaWNzLkhhemFyZCgxMSAqIFUsIDIwICogVSwgMiAqIFUsIDIgKiBVKVxuICAgICAgICAuc2V0TW92ZW1lbnQobmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTEgKiBVLCAyMCAqIFUsIDExICogVSwgMTQgKiBVLCAuMjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTEgKiBVLCAxNCAqIFUsIDExICogVSwgMjAgKiBVLCAuMjUpLFxuICAgICAgICBdLCAtMSkpKTtcblRFU1RfTEVWRUwuYWRkRWxlbWVudChcbiAgICBuZXcgcGh5c2ljcy5IYXphcmQoVSwgMTggKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudChVLCAxOCAqIFUsIDIwICogVSwgMTggKiBVLCAxKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDIwICogVSwgMTggKiBVLCBVLCAxOCAqIFUsIDEpLFxuICAgICAgICBdLCAtMSkpKTtcblRFU1RfTEVWRUwuYWRkU29saWQoXG4gICAgbmV3IHBoeXNpY3MuU29saWQoMCwgMCwgMyAqIFUsIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuU2luZU1vdmVtZW50KDUyICogVSwgNiAqIFUsIDUyICogVSwgMTQgKiBVLCAyLCAzKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgyKSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZFNvbGlkKFxuICAgIG5ldyBwaHlzaWNzLlNvbGlkKDAsIDAsIDMgKiBVLCBVKVxuICAgICAgICAuc2V0TW92ZW1lbnQobmV3IG1vdmVtZW50LlNpbmVNb3ZlbWVudCg1NSAqIFUsIDE2ICogVSwgNjAgKiBVLCAxNiAqIFUsIDIsIC0xKSkpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIENFTEVTVEVfMDEsXG4gICAgQ0VMRVNURV8wMixcbiAgICBDRUxFU1RFXzAzLFxuICAgIENFTEVTVEVfMDQsXG4gICAgQ0VMRVNURV8wNSxcbiAgICBDRUxFU1RFXzA2LFxuICAgIENFTEVTVEVfMDcsXG4gICAgQ0VMRVNURV8wOCxcbiAgICBDRUxFU1RFXzA5LFxuICAgIFRFU1RfTEVWRUwsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5jbGFzcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICB0aGlzLnRpbWVyICs9IGRlbHRhVGltZTtcbiAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gJiYgdGhpcy5yZW1haW5pbmdDb3VudCAmJiB0aGlzLnRpbWVyID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtYWluaW5nQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSB0aGlzLmNvdW50O1xuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMubXggPSAoeDIgLSB4MSkgLyBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy5teSA9ICh5MiAtIHkxKSAvIGR1cmF0aW9uO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgaWYgKHRoaXMudGltZXIgPCB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy50aW1lciAvIHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8oKDEgLSByKSAqIHRoaXMueDEgKyByICogdGhpcy54MiwgKDEgLSByKSAqIHRoaXMueTEgKyByICogdGhpcy55Mik7XG4gICAgICAgICAgICB0aGluZy5zZXRNb21lbnR1bSh0aGlzLm14LCB0aGlzLm15KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGlzLngyLCB0aGlzLnkyKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTZXF1ZW5jZU1vdmVtZW50IGV4dGVuZHMgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKG1vdmVtZW50cywgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKHVuZGVmaW5lZCwgY291bnQpO1xuICAgICAgICB0aGlzLm1vdmVtZW50cyA9IG1vdmVtZW50cztcbiAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICB3aGlsZSAodGhpcy5yZW1haW5pbmdDb3VudCAmJiBkZWx0YVRpbWUgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgICAgICBkZWx0YVRpbWUgPSB0aGlzLm1vdmVtZW50c1t0aGlzLmluZGV4XS50aW1lciAtIHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLmR1cmF0aW9uO1xuICAgICAgICAgICAgaWYgKGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5kZXggPj0gdGhpcy5tb3ZlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgU2luZU1vdmVtZW50XG4gICAgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoeDEsIHkxLCB4MiwgeTIsIGR1cmF0aW9uLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIoZHVyYXRpb24sIGNvdW50KTtcbiAgICAgICAgdGhpcy54MSA9IHgxO1xuICAgICAgICB0aGlzLnkxID0geTE7XG4gICAgICAgIHRoaXMueDIgPSB4MjtcbiAgICAgICAgdGhpcy55MiA9IHkyO1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IGFuZ2xlID0gdGhpcy50aW1lciAqIDIgKiBNYXRoLlBJIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHJhdGlvID0gKE1hdGguY29zKGFuZ2xlKSArIDEpIC8gMjtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyhyYXRpbyAqIHRoaXMueDEgKyAoMSAtIHJhdGlvKSAqIHRoaXMueDIsIHJhdGlvICogdGhpcy55MSArICgxIC0gcmF0aW8pICogdGhpcy55Mik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGluZy5tb3ZlVG8odGhpcy54MSwgdGhpcy55MSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTW92ZW1lbnQsXG4gICAgTGluZWFyTW92ZW1lbnQsXG4gICAgU2VxdWVuY2VNb3ZlbWVudCxcbiAgICBTaW5lTW92ZW1lbnQsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHR3byBzZWdtZW50cyBvbiBhIDFEIGxpbmUgb3ZlcmxhcC5cbiAqIFRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUgaWYgdGhlIGludGVyc2VjdGlvbiBvZiBib3RoIHNlZ21lbnRzIGlzIG9mIG5vbi16ZXJvIG1lYXN1cmUgKGlmIHRoZSBlbmQgb2Ygb25lIHNlZ21lbnRcbiAqIGNvaW5jaWRlcyB3aXRoIHRoZSBzdGFydCBvZiB0aGUgbmV4dCwgdGhleSBhcmUgbm90IGNvbnNpZGVyZWQgYXMgb3ZlcmxhcHBpbmcpXG4gKlxuICogQHBhcmFtIHN0YXJ0MSB7bnVtYmVyfSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgZmlyc3Qgc2VnbWVudFxuICogQHBhcmFtIHNpemUxIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc3RhcnQyIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBzZWNvbmQgc2VnbWVudFxuICogQHBhcmFtIHNpemUyIHtudW1iZXJ9IHdpZHRoIG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gd2hldGhlciB0aGUgdHdvIHNlZ21lbnRzIG92ZXJsYXBcbiAqL1xuZnVuY3Rpb24gc2VnbWVudHNPdmVybGFwKHN0YXJ0MSwgc2l6ZTEsIHN0YXJ0Miwgc2l6ZTIpIHtcbiAgICByZXR1cm4gc3RhcnQxIDwgc3RhcnQyICsgc2l6ZTIgJiYgc3RhcnQyIDwgc3RhcnQxICsgc2l6ZTE7XG59XG5cblxuZnVuY3Rpb24gYWxwaGFUb1N0cmluZyhhbHBoYSkge1xuICAgIGlmIChhbHBoYSA+PSAxKSB7XG4gICAgICAgIHJldHVybiAnZmYnO1xuICAgIH0gZWxzZSBpZiAoYWxwaGEgPD0gMCkge1xuICAgICAgICByZXR1cm4gJzAwJztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKFwiMFwiICsgTWF0aC5mbG9vcigyNTYgKiBhbHBoYSkudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTIpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIH1cblxuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgfVxuXG4gICAgbW92ZVRvKHgsIHkpIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIpO1xuICAgIH1cblxuICAgIHNldE1vdmVtZW50KG1vdmVtZW50KSB7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIEFjdG9yIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkeDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlICYmIHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuaXNBY3RpdmUgJiYgc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGR5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgPT09IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICB9XG59XG5cblxuY2xhc3MgU29saWQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb2xvciA9ICcjNmMyYzBiJztcbiAgICAgICAgdGhpcy5tb21lbnR1bVggPSAwO1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVgoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVkoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSwgbXggPSB1bmRlZmluZWQsIG15ID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzQWN0aXZlICYmIGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKHRoaXMueCArIHRoaXMud2lkdGggLSBhY3Rvci54LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPCBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggLSBhY3Rvci54IC0gYWN0b3Iud2lkdGgsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFggPiBtb3ZlWCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtb3ZlWSkge1xuICAgICAgICAgICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgKyB0aGlzLmhlaWdodCAtIGFjdG9yLnksICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPCBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZIC0gYWN0b3IubW92ZWRZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWSh0aGlzLnkgLSBhY3Rvci55IC0gYWN0b3IuaGVpZ2h0LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRZID4gbW92ZVkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0TW9tZW50dW0obXgsIG15KSB7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gY29uc3RhbnRzLk1PTUVOVFVNX1NUT1JFX1RJTUU7XG4gICAgICAgIHRoaXMubW9tZW50dW1YID0gbXg7XG4gICAgICAgIHRoaXMubW9tZW50dW1ZID0gbXk7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCArIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLnggKyBkeCwgYWN0b3Iud2lkdGggLSBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0ICsgZHkpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55ICsgZHksIGFjdG9yLmhlaWdodCAtIGR5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbmNsYXNzIEhhemFyZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyNmMzEzMTQnO1xuICAgIH1cblxuICAgIGludGVyYWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLmRpZSgpO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgdGhpcy54UmVtYWluZGVyIC09IG1vdmVYO1xuICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciAtPSBtb3ZlWTtcbiAgICAgICAgdGhpcy55ICs9IG1vdmVZO1xuICAgIH1cbn1cblxuXG5jbGFzcyBQbGF0Zm9ybSBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIHdpZHRoLCBVIC8gMik7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNhODYxMmFcIjtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgPj0gdGhpcy55ICsgdGhpcy5oZWlnaHQgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgZHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwcmluZyBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDIgKiBVLCBVIC8gMik7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNkZWRmMzVcIjtcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfQk9VTkNFKTtcbiAgICAgICAgcGxheWVyLnNwZWVkWCA9IDA7XG4gICAgICAgIHBsYXllci5zcGVlZFkgPSBjb25zdGFudHMuQk9VTkNFX1NQRUVEO1xuICAgICAgICBwbGF5ZXIucmVzdG9yZURhc2goKTtcbiAgICB9XG59XG5cblxuY2xhc3MgRGFzaERpYW1vbmQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4ICsgLjUgKiBVLCB5ICsgLjUgKiBVLCBVLCBVKTtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiIzc5ZmYwMFwiO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSlcbiAgICAgICAgaWYgKCF0aGlzLmlzQWN0aXZlICYmIHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBpZiAocGxheWVyLnJlc3RvcmVEYXNoKCkpIHtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4ICsgLjUgKiBVLCB5ICsgLjUgKiBVLCBVLCBVKTtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiI2ZmMDA5YVwiO1xuICAgIH1cblxuICAgIGludGVyYWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLnRlbXBvcmFyeVN0cmF3YmVycmllcy5hZGQodGhpcyk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgICAgICBjdHguc3Ryb2tlUmVjdCh0aGlzLngsIHRoaXMueSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIHRoaXMudGFyZ2V0WSA9IHRhcmdldFk7XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIudHJhbnNpdGlvblNjZW5lKHRoaXMudGFyZ2V0U2NlbmUpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgdGhpcy5zY2VuZS50cmFuc2l0aW9uID0gdGhpcztcbiAgICB9XG59XG5cblxuY2xhc3MgQ3J1bWJsaW5nQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50aW1lcnMuZmFsbCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMDtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiIzMyMzIzMlwiO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGlmICh0aGlzLmlzRmFsbGluZykge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmZhbGwgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNjZW5lLnBsYXllciAmJiB0aGlzLnNjZW5lLnBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXNGYWxsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5mYWxsID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0ZhbGxpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbHBoYSA9IHRoaXMudGltZXJzLmZhbGw7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3IgKyBhbHBoYVRvU3RyaW5nKGFscGhhKTtcbiAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QodGhpcy54LCB0aGlzLnksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgICAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCwgdGhpcy55LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxuY2xhc3MgVHJpZ2dlckJsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIG1vdmVtZW50KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiMzYjNiM2JcIjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnNjZW5lLnBsYXllcjtcbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQgJiYgdGhpcy5tb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCA9PT0gdW5kZWZpbmVkICYmIHBsYXllci5pc1JpZGluZyh0aGlzKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB0aGlzLnRyaWdnZXJlZE1vdmVtZW50O1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzZWdtZW50c092ZXJsYXAsXG4gICAgYWxwaGFUb1N0cmluZyxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG4gICAgQ3J1bWJsaW5nQmxvY2ssXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCA4LCAxNCk7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5pbnB1dHMudXBkYXRlKGRlbHRhVGltZSk7XG5cbiAgICAgICAgLy8gY2hlY2sgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuY2xlYXIoKTtcbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgaWYgKHNvbGlkLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMueSA9PT0gc29saWQueSArIHNvbGlkLmhlaWdodCAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgaXMgc3RhbmRpbmcgb24gYSBzb2xpZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciB3YWxscyBvbiByaWdodCBhbmQgbGVmdCBhdCBkaXN0YW5jZSA8PSBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0VcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VMZWZ0ID0gdGhpcy54IC0gc29saWQueCAtIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZUxlZnQgJiYgZGlzdGFuY2VMZWZ0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VSaWdodCA9IHNvbGlkLnggLSB0aGlzLnggLSB0aGlzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZVJpZ2h0ICYmIGRpc3RhbmNlUmlnaHQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMueCArIHRoaXMud2lkdGggPT09IHNvbGlkLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2hlY2sgaWYgcGxheWVyIGlzIGh1Z2dpbmcgYSB3YWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCB8fCB0aGlzLmRhc2hTcGVlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIHNldCBjb2xvclxuICAgICAgICB0aGlzLmNvbG9yID0gdGhpcy5uYkRhc2hlcyA+IDAgPyAnI2E2MzYzNicgOiAnIzNmYjBmNic7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuICAgICAgICAgICAgdGhpcy5jb2xvciA9IFwiXCIgKyB0aGlzLmNvbG9yICsgcGh5c2ljcy5hbHBoYVRvU3RyaW5nKHRoaXMudGltZXJzLmR5aW5nIC8gY29uc3RhbnRzLkRZSU5HX1RJTUUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaW50ZXJhY3Qgd2l0aCBvYmplY3RzXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLnNjZW5lLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5pc0FjdGl2ZSAmJiB0aGlzLm92ZXJsYXBzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5pbnRlcmFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55IDw9IC10aGlzLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmR5aW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNwYXduKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wSGVsZCAmJiB0aGlzLnRpbWVycy52YXJKdW1wID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZLCBjb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSB0aGlzLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTiArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREFTSCk7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpIHtcbiAgICAgICAgbGV0IGRpZEp1bXAgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IHRoaXMuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBjb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZIC0gY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIC1jb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1heCh0aGlzLnNwZWVkWSAtIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCAtY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXRlKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gbGVhdmUgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChuZXdTdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGVudGVyIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV047XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSBjb25zdGFudHMuREFTSF9USU1FICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gY29uc3RhbnRzLkRZSU5HX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gY29uc3RhbnRzLkJPVU5DRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyYW5zaXRpb25TY2VuZSh0YXJnZXRTY2VuZSkge1xuICAgICAgICAvLyB2YWxpZGF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVFbGVtZW50KHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRhcmdldFNjZW5lLnNldFBsYXllcih0aGlzKTtcbiAgICB9XG5cbiAgICBkaWUoKSB7XG4gICAgICAgIC8vIHJlYWN0aXZhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RFQUQpO1xuICAgIH1cblxuICAgIHJlc3Bhd24oKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMuc2NlbmUuc3RhcnRQb3NpdGlvblg7XG4gICAgICAgIHRoaXMueSA9IHRoaXMuc2NlbmUuc3RhcnRQb3NpdGlvblk7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgICAgICB0aGlzLmRpZSgpO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiBzdXBlci5pc1JpZGluZyhzb2xpZCkgfHxcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBzb2xpZC55LCBzb2xpZC5oZWlnaHQpICYmXG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHNvbGlkLnggKyBzb2xpZC53aWR0aCA9PT0gdGhpcy54KSB8fFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IDEgJiYgc29saWQueCA9PT0gdGhpcy54ICsgdGhpcy53aWR0aClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXIsXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBwaHlzaWNzID0gcmVxdWlyZSgnLi9waHlzaWNzJyk7XG5jb25zdCBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuY29uc3QgVSA9IGNvbnN0YW50cy5HUklEX1NJWkU7XG5cblxuY2xhc3MgU2NlbmUge1xuICAgIGNvbnN0cnVjdG9yKHdpZHRoLCBoZWlnaHQsIHN0YXJ0UG9zaXRpb25YID0gdW5kZWZpbmVkLCBzdGFydFBvc2l0aW9uWSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB0aGlzLnNjcm9sbFggPSAwO1xuICAgICAgICB0aGlzLnNjcm9sbFkgPSBVIC8gMjtcbiAgICAgICAgdGhpcy5zb2xpZHMgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuYWN0b3JzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmVsZW1lbnRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKHN0YXJ0UG9zaXRpb25YICE9PSB1bmRlZmluZWQgJiYgc3RhcnRQb3NpdGlvblkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXIgPSBuZXcgcGh5c2ljcy5QbGF5ZXIoc3RhcnRQb3NpdGlvblgsIHN0YXJ0UG9zaXRpb25ZKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblggPSBzdGFydFBvc2l0aW9uWDtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblkgPSBzdGFydFBvc2l0aW9uWTtcbiAgICAgICAgICAgIHRoaXMuYWRkQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zdGFydFBvc2l0aW9uWCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnBsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXJ0UG9zaXRpb24oeCwgeSkge1xuICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25YID0geDtcbiAgICAgICAgdGhpcy5zdGFydFBvc2l0aW9uWSA9IHk7XG4gICAgfVxuXG4gICAgc3RhdGljIGZyb21TdHJpbmcocykge1xuICAgICAgICBjb25zdCBsaW5lcyA9IHMuc3BsaXQoJ1xcbicpO1xuICAgICAgICBjb25zdCBoZWlnaHQgPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gbGluZXNbMF0ubGVuZ3RoO1xuICAgICAgICBjb25zdCBzY2VuZSA9IG5ldyBTY2VuZSh3aWR0aCAqIFUsIGhlaWdodCAqIFUpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGxpbmVzW2ldLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeCA9IGogKiBVO1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSAoaGVpZ2h0IC0gaSAtIDEpICogVTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGxpbmVzW2ldW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkU29saWQobmV3IHBoeXNpY3MuU29saWQoeCwgeSwgVSwgVSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJyEnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5IYXphcmQoeCwgeSwgVSwgVSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1AnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuc2V0U3RhcnRQb3NpdGlvbih4LCB5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdCJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3ByaW5nKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdEJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuRGFzaERpYW1vbmQoeCwgeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmUuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5TdHJhd2JlcnJ5KHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICctJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlBsYXRmb3JtKHgsIHksIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICc9JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLkNydW1ibGluZ0Jsb2NrKHgsIHksIFUsIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzY2VuZTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB0aGlzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBlbGVtZW50LnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5hY3RvcnMpIHtcbiAgICAgICAgICAgIGFjdG9yLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHNjcm9sbCB2aWV3XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPiAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICB0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnggLSAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPCAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci54IC0gLjQwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLnkgLSB0aGlzLnNjcm9sbFkgPiAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFkgPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWlnaHQgLSBjb25zdGFudHMuVklFV19IRUlHSFQsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyLnkgLSAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZIDwgLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoXG4gICAgICAgICAgICAgICAgICAgIFUgLyAyLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllci55IC0gLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xuICAgICAgICAgICAgZWxlbWVudC5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHRoaXMucmVtb3ZlQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICBpZiAocGxheWVyKSB0aGlzLmFkZEFjdG9yKHBsYXllcik7XG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgIH1cblxuICAgIGFkZEFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmFkZChhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5kZWxldGUoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMucmVtb3ZlKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIl19
