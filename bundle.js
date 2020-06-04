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


function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
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
        ctx.fillRect(this.x - this.scene.scrollX, this.y - this.scene.scrollY, this.width, this.height);
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
                    if (solid.collidesWithMovingActor(this, move, 0)) {
                        if (solid.x - this.width < newX) {
                            newX = solid.x - this.width;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.collidesWithMovingActor(this, move, 0)) {
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
                    if (solid.collidesWithMovingActor(this, 0, move)) {
                        if (solid.y - this.height < newY) {
                            newY = solid.y - this.height;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.collidesWithMovingActor(this, 0, move)) {
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
                if (actor.isRiding(this)) {
                    riding.add(actor);
                }
            }
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;

                if (moveX > 0) {
                    for (const actor of this.scene.actors) {
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
                } else {
                    for (const actor of this.scene.actors) {
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
            if (moveY) {
                this.yRemainder -= moveY;
                this.y += moveY;

                if (moveY > 0) {
                    for (const actor of this.scene.actors) {
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
                } else {
                    for (const actor of this.scene.actors) {
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
        this.isActive = true;
        this.color = "#79ff00";
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    interactWith(player) {
        if (this.isActive) {
            player.restoreDash();
            this.isActive = false;
            this.timers.cooldown = 2;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x - this.scene.scrollX, this.y - this.scene.scrollY, this.width, this.height);
        if (this.isActive) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.scene.scrollX, this.y - this.scene.scrollY, this.width, this.height);
        }
    }
}


class Strawberry extends Thing {
    constructor(x, y) {
        super(x + .5 * U, y + .5 * U, U, U);
        this.isActive = true;
        this.color = "#ff009a";
    }

    interactWith(player) {
        if (this.isActive) {
            player.temporaryStrawberries.add(this);
            this.isActive = false;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.strokeRect(this.x - this.scene.scrollX, this.y - this.scene.scrollY, this.width, this.height);
        if (this.isActive) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.scene.scrollX, this.y - this.scene.scrollY, this.width, this.height);
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
    Hazard,
    Solid,
    Actor,
    Platform,
    Spring,
    DashDiamond,
    Strawberry,
    Transition,
    TriggerBlock,
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
            let alpha = Math.max(0, Math.floor(255 * this.timers.dying / constants.DYING_TIME));
            this.color = "" + this.color + ("0" + alpha.toString(16)).substr(-2);
        }

        // interact with objects
        for (const element of this.scene.elements) {
            if (this.overlaps(element)) {
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
        this.nbDashes = 1;
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
                this.scrollX = Math.min(this.width - constants.VIEW_WIDTH, this.player.x - .60 * constants.VIEW_WIDTH);
            } else if (this.player.x - this.scrollX < .40 * constants.VIEW_WIDTH) {
                this.scrollX = Math.max(0, this.player.x - .40 * constants.VIEW_WIDTH);
            }
            if (this.player.y - this.scrollY > .60 * constants.VIEW_HEIGHT) {
                this.scrollY = Math.min(this.height - constants.VIEW_HEIGHT, this.player.y - .60 * constants.VIEW_HEIGHT);
            } else if (this.player.y - this.scrollY < .40 * constants.VIEW_HEIGHT) {
                this.scrollY = Math.max(U / 2, this.player.y - .40 * constants.VIEW_HEIGHT);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBGcm9tIENlbGVzdGUgc291cmNlIGNvZGVcbmNvbnN0IE1BWF9SVU5fU1BFRUQgPSA5MDtcbmNvbnN0IFJVTl9BQ0NFTEVSQVRJT04gPSAxMDAwO1xuY29uc3QgUlVOX0RFQ0VMRVJBVElPTiA9IDQwMDtcbmNvbnN0IEFJUl9GQUNUT1IgPSAuNjU7XG5jb25zdCBKVU1QX1NQRUVEID0gMTA1O1xuY29uc3QgSlVNUF9IT1JJWk9OVEFMX0JPT1NUID0gNDA7XG5jb25zdCBNQVhfRkFMTF9TUEVFRCA9IDE2MDtcbmNvbnN0IEdSQVZJVFkgPSA5MDA7XG5jb25zdCBKVU1QX0dSQUNFX1RJTUUgPSAuMTtcbmNvbnN0IFZBUl9KVU1QX1RJTUUgPSAuMjtcbmNvbnN0IENMSU1CX1VQX1NQRUVEID0gNDU7XG5jb25zdCBDTElNQl9TTElQX1NQRUVEID0gMzA7XG5jb25zdCBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UgPSAzO1xuY29uc3QgV0FMTF9KVU1QX0hTUEVFRCA9IE1BWF9SVU5fU1BFRUQgKyBKVU1QX0hPUklaT05UQUxfQk9PU1Q7XG5jb25zdCBEQVNIX1NQRUVEID0gMjQwO1xuY29uc3QgRU5EX0RBU0hfU1BFRUQgPSAxNjA7XG5jb25zdCBFTkRfREFTSF9VUF9GQUNUT1IgPSAuNzU7XG5jb25zdCBEQVNIX1RJTUUgPSAuMTU7XG5jb25zdCBEQVNIX0NPT0xET1dOID0gLjI7XG5cbi8vIE90aGVyIGNvbnN0YW50c1xuY29uc3QgTU9NRU5UVU1fU1RPUkVfVElNRSA9IC4xO1xuY29uc3QgTU9NRU5UVU1fRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9GUkVFWkVfVElNRSA9IC4wNTtcbmNvbnN0IEJPVU5DRV9USU1FID0gLjI7XG5jb25zdCBCT1VOQ0VfU1BFRUQgPSAxODA7XG5jb25zdCBEWUlOR19USU1FID0gLjU7XG5jb25zdCBTVEFURV9OT1JNQUwgPSAwO1xuY29uc3QgU1RBVEVfSlVNUCA9IDE7XG5jb25zdCBTVEFURV9EQVNIID0gMjtcbmNvbnN0IFNUQVRFX0RFQUQgPSAzO1xuY29uc3QgU1RBVEVfQk9VTkNFID0gNDtcblxuY29uc3QgR1JJRF9TSVpFID0gODtcbmNvbnN0IFZJRVdfV0lEVEggPSAzMjA7XG5jb25zdCBWSUVXX0hFSUdIVCA9IDE4MDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTUFYX1JVTl9TUEVFRCxcbiAgICBSVU5fQUNDRUxFUkFUSU9OLFxuICAgIFJVTl9ERUNFTEVSQVRJT04sXG4gICAgQUlSX0ZBQ1RPUixcbiAgICBKVU1QX1NQRUVELFxuICAgIEpVTVBfSE9SSVpPTlRBTF9CT09TVCxcbiAgICBNQVhfRkFMTF9TUEVFRCxcbiAgICBHUkFWSVRZLFxuICAgIEpVTVBfR1JBQ0VfVElNRSxcbiAgICBWQVJfSlVNUF9USU1FLFxuICAgIENMSU1CX1VQX1NQRUVELFxuICAgIENMSU1CX1NMSVBfU1BFRUQsXG4gICAgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFLFxuICAgIFdBTExfSlVNUF9IU1BFRUQsXG4gICAgREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9TUEVFRCxcbiAgICBFTkRfREFTSF9VUF9GQUNUT1IsXG4gICAgREFTSF9USU1FLFxuICAgIERBU0hfQ09PTERPV04sXG4gICAgTU9NRU5UVU1fU1RPUkVfVElNRSxcbiAgICBNT01FTlRVTV9GQUNUT1IsXG4gICAgREFTSF9GUkVFWkVfVElNRSxcbiAgICBCT1VOQ0VfVElNRSxcbiAgICBCT1VOQ0VfU1BFRUQsXG4gICAgRFlJTkdfVElNRSxcbiAgICBTVEFURV9OT1JNQUwsXG4gICAgU1RBVEVfSlVNUCxcbiAgICBTVEFURV9EQVNILFxuICAgIFNUQVRFX0RFQUQsXG4gICAgU1RBVEVfQk9VTkNFLFxuICAgIEdSSURfU0laRSxcbiAgICBWSUVXX1dJRFRILFxuICAgIFZJRVdfSEVJR0hULFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgSlVNUF9CVUZGRVJfVElNRSA9IC4xO1xuY29uc3QgREFTSF9CVUZGRVJfVElNRSA9IC4xO1xubGV0IHByZXNzZWRLZXlzID0gbmV3IFNldCgpO1xuXG5cbmNsYXNzIFBsYXllcklucHV0cyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMueEF4aXMgPSAwO1xuICAgICAgICB0aGlzLnlBeGlzID0gMDtcbiAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICB0aGlzLmp1bXBIZWxkID0gZmFsc2U7XG4gICAgICAgIHRoaXMua2V5bWFwID0ge1xuICAgICAgICAgICAgcmlnaHQ6ICdBcnJvd1JpZ2h0JyxcbiAgICAgICAgICAgIGxlZnQ6ICdBcnJvd0xlZnQnLFxuICAgICAgICAgICAgdXA6ICdBcnJvd1VwJyxcbiAgICAgICAgICAgIGRvd246ICdBcnJvd0Rvd24nLFxuICAgICAgICAgICAganVtcDogJ2cnLFxuICAgICAgICAgICAgZGFzaDogJ2YnLFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGltZXJzID0ge1xuICAgICAgICAgICAganVtcEJ1ZmZlcjogMCxcbiAgICAgICAgICAgIGRhc2hCdWZmZXI6IDAsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2xlZnQnXSkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwWydyaWdodCddKSkge1xuICAgICAgICAgICAgdGhpcy54QXhpcyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ3VwJ10pKSB7XG4gICAgICAgICAgICB0aGlzLnlBeGlzICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFsnZG93biddKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyAtPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByZXZKdW1wID0gdGhpcy5qdW1wSGVsZDtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFsnanVtcCddKTtcbiAgICAgICAgaWYgKCFwcmV2SnVtcCAmJiB0aGlzLmp1bXBIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID0gSlVNUF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5qdW1wUHJlc3NlZEJ1ZmZlciAmPSB0aGlzLnRpbWVycy5qdW1wQnVmZmVyID4gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZXZEYXNoID0gdGhpcy5kYXNoSGVsZDtcbiAgICAgICAgdGhpcy5kYXNoSGVsZCA9IHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFsnZGFzaCddKTtcbiAgICAgICAgaWYgKCFwcmV2RGFzaCAmJiB0aGlzLmRhc2hIZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQnVmZmVyID0gREFTSF9CVUZGRVJfVElNRTtcbiAgICAgICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGFzaFByZXNzZWRCdWZmZXIgPSB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyICYmICh0aGlzLnRpbWVycy5kYXNoQnVmZmVyID4gMCk7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcklucHV0cyxcbiAgICBwcmVzc2VkS2V5cyxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IG1hcHMgPSByZXF1aXJlKCcuL21hcHMnKTtcbmNvbnN0IGlucHV0cyA9IHJlcXVpcmUoJy4vaW5wdXRzJyk7XG5jb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllcicpO1xuXG5jb25zdCBTQ0FMSU5HID0gMjtcbmxldCBTTE9XRE9XTl9GQUNUT1IgPSAxO1xuY29uc3QgRklYRURfREVMVEFfVElNRSA9IHRydWU7XG5jb25zdCBGUkFNRV9SQVRFID0gNjA7XG5cbmxldCBjb250ZXh0O1xubGV0IGN1cnJlbnRTY2VuZTtcbmxldCBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcbmxldCBpc1J1bm5pbmcgPSBmYWxzZTtcbmxldCBmcmFtZUNvdW50ZXIgPSAwO1xubGV0IGZyYW1lUmF0ZVJlZnJlc2ggPSA1O1xubGV0IGZyYW1lUmF0ZVN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5sZXQgc2xvd2Rvd25Db3VudGVyID0gMDtcblxuXG5mdW5jdGlvbiBzbG93ZG93bihmYWN0b3IpIHtcbiAgICBTTE9XRE9XTl9GQUNUT1IgPSBmYWN0b3I7XG4gICAgbGFzdFVwZGF0ZSA9IERhdGUubm93KCkgLyAoU0xPV0RPV05fRkFDVE9SICogMTAwMCk7XG59XG5cblxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaXNSdW5uaW5nID0gdHJ1ZTtcbiAgICB1cGRhdGUoKTtcbn1cblxuXG5mdW5jdGlvbiBzdG9wKCkge1xuICAgIGlzUnVubmluZyA9IGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcbiAgICBjb25zdCB0aW1lTm93ID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc1J1bm5pbmcpIHtcbiAgICAgICAgc2xvd2Rvd25Db3VudGVyICs9IDE7XG4gICAgICAgIGlmIChzbG93ZG93bkNvdW50ZXIgPj0gU0xPV0RPV05fRkFDVE9SKSB7XG4gICAgICAgICAgICBzbG93ZG93bkNvdW50ZXIgLT0gU0xPV0RPV05fRkFDVE9SO1xuICAgICAgICAgICAgZnJhbWVDb3VudGVyICs9IDE7XG5cbiAgICAgICAgICAgIGlmICh0aW1lTm93IC0gZnJhbWVSYXRlU3RhcnRUaW1lID49IDEwMDAgKiBmcmFtZVJhdGVSZWZyZXNoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCR7ZnJhbWVDb3VudGVyIC8gZnJhbWVSYXRlUmVmcmVzaH0gRlBTYCk7XG4gICAgICAgICAgICAgICAgZnJhbWVDb3VudGVyID0gMDtcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGVTdGFydFRpbWUgPSB0aW1lTm93O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRklYRURfREVMVEFfVElNRSA/XG4gICAgICAgICAgICAgICAgMSAvIEZSQU1FX1JBVEUgOlxuICAgICAgICAgICAgICAgIE1hdGgubWluKCh0aW1lTm93IC0gbGFzdFVwZGF0ZSkgLyAoMTAwMCAqIFNMT1dET1dOX0ZBQ1RPUiksIC4wNSk7XG5cbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJyNmZmZmZmYnOyAgLy8gYmFja2dyb3VuZCBjb2xvclxuICAgICAgICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfV0lEVEgsIFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgY3VycmVudFNjZW5lLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICAgICAgLy8gVHJhbnNpdGlvbiBmcm9tIG9uZSByb29tIHRvIGFub3RoZXJcbiAgICAgICAgICAgIGlmIChjdXJyZW50U2NlbmUudHJhbnNpdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZTY2VuZSA9IGN1cnJlbnRTY2VuZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50U2NlbmUgPSBjdXJyZW50U2NlbmUudHJhbnNpdGlvbi50YXJnZXRTY2VuZTtcbiAgICAgICAgICAgICAgICBwcmV2U2NlbmUudHJhbnNpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS5kcmF3KGNvbnRleHQpO1xuICAgICAgICAgICAgbGFzdFVwZGF0ZSA9IHRpbWVOb3c7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG4gICAgfVxufVxuXG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuYWRkKGUua2V5KTtcbiAgICAgICAgc3dpdGNoIChlLmtleSkge1xuICAgICAgICAgICAgY2FzZSAndyc6XG4gICAgICAgICAgICAgICAgaWYgKFNMT1dET1dOX0ZBQ1RPUiA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93big4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzbG93ZG93bigxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGUgPT4ge1xuICAgICAgICBpbnB1dHMucHJlc3NlZEtleXMuZGVsZXRlKGUua2V5KTtcbiAgICB9KTtcbiAgICBjb25zdCBzY3JlZW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2FtZS1zY3JlZW4nKTtcbiAgICBzY3JlZW4uc3R5bGUud2lkdGggPSBgJHtjb25zdGFudHMuVklFV19XSURUSCAqIFNDQUxJTkd9cHhgO1xuICAgIHNjcmVlbi5zdHlsZS5oZWlnaHQgPSBgJHtjb25zdGFudHMuVklFV19IRUlHSFQgKiBTQ0FMSU5HfXB4YDtcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxheWVyMVwiKTtcbiAgICBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICBjYW52YXMud2lkdGggPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfV0lEVEg7XG4gICAgY2FudmFzLmhlaWdodCA9IFNDQUxJTkcgKiBjb25zdGFudHMuVklFV19IRUlHSFQ7XG4gICAgY29udGV4dC5zY2FsZShTQ0FMSU5HLCAtU0NBTElORyk7XG4gICAgY29udGV4dC50cmFuc2xhdGUoMCwgLWNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG5cbiAgICBjdXJyZW50U2NlbmUgPSBtYXBzLkNFTEVTVEVfMDE7XG4gICAgY3VycmVudFNjZW5lLnNldFBsYXllcihuZXcgcGxheWVyLlBsYXllcihjdXJyZW50U2NlbmUuc3RhcnRQb3NpdGlvblgsIGN1cnJlbnRTY2VuZS5zdGFydFBvc2l0aW9uWSkpO1xuICAgIHN0YXJ0KCk7XG59OyIsIlwidXNlIHN0cmljdFwiXG5jb25zdCBzY2VuZSA9IHJlcXVpcmUoJy4vc2NlbmUnKTtcbmNvbnN0IG1vdmVtZW50ID0gcmVxdWlyZSgnLi9tb3ZlbWVudCcpO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uVXAoc2NlbmUxLCB4MSwgeTEsIHNjZW5lMiwgeDIsIHkyLCB3aWR0aCkge1xuICAgIGNvbnN0IHRyYW5zaXRpb25VcCA9IG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oXG4gICAgICAgIHgxICogVSwgKHkxICsgMSkgKiBVLCB3aWR0aCAqIFUsIDAsIHNjZW5lMiwgeDIgKiBVLCAoeTIgKyAzKSAqIFVcbiAgICApO1xuICAgIHRyYW5zaXRpb25VcC5ib29zdFkgPSBjb25zdGFudHMuVFJBTlNJT05fQk9PU1RfVVA7XG4gICAgc2NlbmUxLmFkZEVsZW1lbnQodHJhbnNpdGlvblVwKTtcbiAgICBzY2VuZTIuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MiAqIFUsICh5MiAtIDEpICogVSwgd2lkdGggKiBVLCAwLCBzY2VuZTEsIHgxICogVSwgKHkxIC0gMykgKiBVXG4gICAgKSlcbn1cblxuZnVuY3Rpb24gbWFrZVRyYW5zaXRpb25SaWdodChzY2VuZTEsIHgxLCB5MSwgc2NlbmUyLCB4MiwgeTIsIGhlaWdodCkge1xuICAgIHNjZW5lMS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oXG4gICAgICAgIHgxICogVSwgeTEgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTIsICh4MiArIDEpICogVSwgeTIgKiBVXG4gICAgKSlcbiAgICBzY2VuZTIuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MiAqIFUsIHkyICogVSwgMCwgaGVpZ2h0ICogVSwgc2NlbmUxLCAoeDEgLSAxKSAqIFUsIHkxICogVVxuICAgICkpXG59XG5cblxuY29uc3QgQ0VMRVNURV8wMSA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICB4eHh4XG54eCAgeCB4eHggICAgeHh4eHh4eHh4ICAgICAgICAgICAgICB4eHh4XG54eCAgeCAgIHggICAgeHh4eHggICB4ICAgICAgICAgICAgIHh4eHh4XG54eCAgeHh4IHggICAgeHh4ICAgICB4ICAgICAgICAgICAgIHh4eHh4XG54eCAgeCAgIHggICAgeHh4ICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgeCAgIHggICAgeHh4ICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICB4eHh4ICAgICAgICAgICAheHh4eHh4XG54ICAgICAgICAgICAgICAgICB4ICB4ICAgICAgICAgICAheHh4eHh4XG54ICAgICAgICAgICAgICAgICB4ICB4ICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICB4eHh4ICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICB4eHh4ICAgICAgICAgICAgICB4eHh4XG54ICAgICAgICAgICAgICAgICB4eHh4ISEhISAgICAgICAgICB4eHh4XG54ICAgICAgICAgeHh4ICAgICB4eHh4eHh4eCAgICAgICAgICAgeHh4XG54ICBQICAgICAgeHh4ICAgICB4eHh4eHh4eCAgICAgICAgICAgeHh4XG54eHh4eCAgICAgeHh4ISEhISF4eHh4eHh4eCAgICAgICAgICAgIHh4XG54eHh4eCAgICAgeHh4eHh4eHh4eHh4eHh4eCEhISAgICAgICAgICB4XG54eHh4eCEhISEheHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICB4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICB4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICB4YCk7XG5cblxuY29uc3QgQ0VMRVNURV8wMiA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4XG54eHggICAgIHh4ICAgIHggeHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4XG54eHggICAgIHh4ICAgIHggICAgIHh4eHh4ICB4eHh4eHh4ICAgIHh4XG54eHh4eHh4eHh4ICAgIHggICAgIHh4eHh4ICAgIHh4eHh4ICAgIHh4XG54eHggICAgIHggICAgIHggICAgIHh4eHh4ICAgIHh4eHh4ICAgIHh4XG54eHh4eHh4eHggIFMgICAgICAgICB4eHh4ICAgIHh4eHh4ICAgIHh4XG54eHggICAgIHggICAgICAgICAgICB4eHggICAgICAgIHh4ICAgIHh4XG54eHh4eHh4eHggICAgICAgICAgICB4eHggICAgICAgIHh4ICAgIHh4XG54eCAgICAgICAgICAgICAgICAgICB4eHggICAgICAgIHh4ICAgIHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4ICAgIHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgIHh4XG54eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgICEhISEhICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgIHh4eHh4ICAgICAgICAgICAgIHh4XG54ICAgICAgICAgICAgICAgICAgIHh4eHh4ICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgICAgICAgICAgIHh4eHggICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgICAgIEIgICAgICB4eHggICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgICAgIHh4ICAgICB4eHggICAgeHh4eHh4eHh4eHh4XG54ICBQICAgICAgICAgIHh4ICAgICB4eHghISAgeHh4eHh4eHh4eHh4XG54LS0tLS14eHh4eHh4eHh4ICAgICB4eHh4eCEheHh4eHh4eHh4eHh4XG54ICAgICB4eHh4eHggIHh4ICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4XG54ICAgICB4eHh4eHggIHh4ICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wMSwgMzEsIDIzLCBDRUxFU1RFXzAyLCAxLCAwLCA1KTtcblxuXG5jb25zdCBDRUxFU1RFXzAzID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICB4eHhcbnh4eHh4eCAgICAgICAgIHh4eHh4eHh4eHh4eCAgICB4eCAgICB4eHhcbnh4eHh4eCAgICAgICAgIHh4ICAgICAgICAgeCAgICAgeCAgICB4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICB4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICB4eHggICAgeHhcbnggICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICB4eHggICAgeHhcbnggICAgICAgICAgeCAgICAgICAgICAgICAgICAgICB4eHggICAgeHhcbnggICAgICAgICAgeCAgICAgICAgICAgICAgICAgICB4eCAgICAgeHhcbnggICAgICAgICAgeCAgICB4ICAgICAgICAgICAgICB4eCAgICAgIHhcbnggICAgICAgICAgICAgICB4ICAgICAgICAgICAgICB4eCAgICAgIHhcbnggICAgICAgICAgICAgICB4eHh4ICAgICAgICAgICAgeCAgICAgIHhcbnggICAgICAgICAgICAgICB4eHh4ICAgICAgICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICB4eHh4ICAgICAgISEhICAgICAgUyAgIHhcbnggICAgICAgICAgICAgICAgIHh4ICAgICAgeHh4ISEhISEgICAgIHhcbnggICAgICAgICAgICAgICAgIHh4ICAgICAgeHh4eHh4eHggICAgIXhcbnh4ICAgICAgICAgICAgICAgICB4ICAgISEheHh4eHh4eHghISEheHhcbnh4ICBQICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHhcbnh4LS0tLXh4eCAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHhcbnh4ICAgIHh4eCAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzAyLCAzNCwgMjMsIENFTEVTVEVfMDMsIDIsIDAsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDQgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4ICAgICAgeHh4ICAgIHh4eHh4eHh4eHggeHh4eFxueHh4eHh4ICAgICAgICAgICAgeHh4ICAgICAgeHh4eHggICAgeHh4eFxueHh4eHggICAgICAgICAgICAgeHh4ICAgICAgIXh4eHggICAgeHh4eFxueHh4ICAgICAgICAgICAgICAgICB4ICAgICAgIXh4eHggICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICB4ICAgICAgIXh4eHggICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgIXh4ICAgICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICB4eFxueHh4ICAgICB4eC0tICAgICAgICAgICAgICAgICB4ICAgICAgICB4eFxueHh4ICAgICB4eCAgICAgICAgICAgICAgICAgICB4ICAgICAgICB4eFxueHh4ICAgICB4eCAgICAgICAgICAgICAgICAgICB4ICAgICAgICB4eFxueHh4ICAgICAheCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueHh4ICAgICAheCEhICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHghICAgICAheHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHghICAgICAheHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4ICBQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4LS0tLXh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4ICAgIHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeFxueHh4ICAgIHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeGApO1xuXG5DRUxFU1RFXzA0LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxNCAqIFUsIDExICogVSwgMyAqIFUsIDIgKiBVLCBuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDAuNSksXG4gICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KDE0ICogVSwgMTEgKiBVLCAyMyAqIFUsIDEyICogVSwgLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjMgKiBVLCAxMiAqIFUsIDE0ICogVSwgMTEgKiBVLCAxKSxcbl0pKSk7XG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDMsIDMzLCAyMywgQ0VMRVNURV8wNCwgMywgMCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8wNSA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eHh4eHh4eHh4eHh4XG54eHh4eHggICAgICAgICAgICAgeHh4ICAgIHh4eHh4eHh4eHh4eHh4XG54eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4XG54eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eCAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgICAgICB4eHh4eHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgICAgICB4eHh4eHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgIFMgICAgeHh4eHh4eCAgICA9PT0gICAgICB4XG54eCAgICAgICAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICAgICB4XG54eCAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgPT09ICAgICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgPT09ICB4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54ICB4ICAgICAgICAgIHh4ICAgICAgICAgICAgID09PSAgICAgICB4XG54eHh4ICBQICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICB4XG54eHh4LS0tLXh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICAgICB4XG54eHh4ICAgIHh4eHh4eCAgeHh4eHh4eHh4eCAgICAgICAgICAgICB4YCk7XG5cbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wNCwgMjEsIDIzLCBDRUxFU1RFXzA1LCA0LCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA2ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgeHhcbnh4ICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgeHhcbnh4ICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgeHhcbnh4ICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgeHhcbnh4IFMgICAgICAgICAgeHh4ICAgIHh4eHh4eHh4eHh4eHh4ICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4ISB4ICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICB4eCAgeHh4eHh4ISAgICAgIHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4ISAgICAgIHhcbnh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgeHh4ISAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4ISAgICAgIHhcbnggICAgICEhISAgICAgICAgICAgICAgICAgICAgIHh4ISAgICAgIHhcbnggICAgIHh4eCAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgIHhcbnggICAgIHh4eCAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgIHhcbnggICAgICB4eCAgICAgICAgICAgICAgICAgICAgICB4eCAgICAgIHhcbnggICAgICB4eCAgICAgICAgICAgICAgICAgICAgICB4eCAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEIgIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4IHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgIHh4eHhcbnghICAgICAgICAgICAgICAgICAgICEhIXh4eCAgICAgICAgIHh4eHhcbnh4ICAgICEhISAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICB4eHhcbnh4ISEhIXh4eCAgICAgICAgICAgIHh4eHh4eCAgICAgICAgICB4eHhcbnh4eHh4eHh4eCEhISEgICAgISEhIXh4eHh4eCAgICAgICAgICB4eHhcbnh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHggICAgICAgICB4eHhcbnh4eHh4eHh4eHh4eHggICAgeHh4eHggIHh4eHggICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICB4eCAgIHh4eCAgICAgICAgICAgeHhcbnh4eHh4eCAgICAgICAgICAgICAgICAgIHh4ICAgICAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgeHhcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgICAgICBcbnh4ICBQICAgICAgeHggICAgeHh4ICAgICB4eHggICAgICAgICAgICBcbnh4eC0tLS14eHh4eHggICAgeHh4ISEhISF4eHggICAgICAgIC0tLXhcbnh4eCAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgICAgICAgIHhgKTtcblxuQ0VMRVNURV8wNi5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTMgKiBVLCBVLCA0ICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTMgKiBVLCBVLCAxMyAqIFUsIDkgKiBVLCAuMyksXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIDkgKiBVLCAxMyAqIFUsIFUsIDEpLFxuXSkpKTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wNSwgMjIsIDIzLCBDRUxFU1RFXzA2LCAzLCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA3ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICAgICAgIHh4eHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgIHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgIHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgISAgICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCEgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeEIgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeHh4LS0gICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAheHh4ICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4ICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eC0tLS14eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eCAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHghICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHghISEgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICB4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICB4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICAgICAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eHh4eHggICAgICAgICAgICAgICAgeHhcbnh4eHh4eHh4eHggICAgICB4eHh4eHggICAgICAgICAgICAgICAgeHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHggICAgICAgICAgICAgICAgIHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4LS0teHh4eC0tLS0gICAgICBcbnh4eHh4eHh4eCAgICAgICAgUyAgICAgICAgeHh4ICAgICAgICAgICBcbnh4eHh4eHh4eCAgICAgICAgICAgICAgICAgeHh4ICAgICAgICBQICBcbnh4eHh4eHh4eCAgICAgICAgIHh4eHh4eHh4eHh4ICAgIHh4eHh4eHhcbnh4eHh4eHh4eCEhISEhISF4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHggIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzA3LCA0MCwgMywgQ0VMRVNURV8wNiwgMCwgMywgMyk7XG5cblxuY29uc3QgQ0VMRVNURV8wOCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAhISEhICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICEhISF4eHh4ICAgICAgICAgICAgXG54eHh4eCAgICAgISEhISEhICAgIHh4eHh4eHh4ICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHh4eHh4eCAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHh4ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4IEQgIHggICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHggICAgICAgICAgICAgICAgIHh4XG54eHh4eHggICAgeHh4eHh4ICAgICAgICAgICAgICAgeHgtLS0teHh4XG54eHh4IHggICAgeHh4eHh4ICAgICAgICAgICAtLXh4eHggICAgeHh4XG54eCAgIHggICAgeHh4eHggICAgICAgICAgICAgIHh4eHggUyAgeHh4XG54eCAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgeHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgIC0tLS0teHh4eHh4eHh4XG54ICAgICAgIHh4eHh4eCAgICAgICAgICAgICAgISEheHh4eHh4eHh4XG54ICAgICAgIHh4eHh4eCAgICAgICAgISEhISEheHh4eHh4eHh4eHh4XG54IFAgICAgIHh4eHh4eCEhICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4XG54LS0teHh4eHh4eHh4eHh4ISEhISEheHh4eHh4eHh4eHh4eHh4eHh4XG54ICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wNiwgMzUsIDM2LCBDRUxFU1RFXzA4LCAxLCAwLCAzKTtcblxuXG5jb25zdCBDRUxFU1RFXzA5ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICB4eHh4ICB4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eCAgICAgICAgICAgICAgICB4eHggIHh4eHggICAgeHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgIHh4eHh4eHhcbiAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgIHh4eHh4eHhcbiAgICAgICAgICF4eHh4eC0tLS14eCAgICAgICAgUyAgICB4eHh4eHhcbiAgICAgICAgICF4eHh4eCAgICAgICAgICAgICAgICAgICB4eHh4eHhcbiAgUCAgICAgICF4eHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eHhcbnh4LS0tICAgICF4eHggICAgICAgICAgICAgICAgICAgeHh4eHh4eHhcbnh4ICAgICAgICF4eHggICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHhcbnh4ICAgICAgICF4eCAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHhcbnh4ICAgISEgICF4eCAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4ISEheHggICF4eCAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4ICB4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHghICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhgKTtcblxuQ0VMRVNURV8wOS5hZGRTb2xpZChuZXcgcGh5c2ljcy5UcmlnZ2VyQmxvY2soMTQgKiBVLCAzLjUgKiBVLCAyICogVSwgMyAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxNCAqIFUsIDMuNSAqIFUsIDIxICogVSwgNy41ICogVSwgLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxKSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjEgKiBVLCA3LjUgKiBVLCAxNCAqIFUsIDMuNSAqIFUsIDEuNSksXG5dKSkpO1xubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzA2LCA0MCwgMiwgQ0VMRVNURV8wOSwgMCwgMTQsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMTAgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHggICB4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICB4eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICB4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHggICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHggICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueHggICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eCAgICAgICAgIEQgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgICAgICAgICAgeHh4eCAgICB4eHhcbnh4eHh4eHh4eCEhICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ISEhISEhISEhISEhISAgICAgeHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCEhISEheHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcbm1ha2VUcmFuc2l0aW9uUmlnaHQoQ0VMRVNURV8xMCwgNDAsIDEyLCBDRUxFU1RFXzA4LCAwLCAxMiwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8xMSA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHh4eHggICAgICAgICAgICEhICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggIFMgICAgICAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4XG54eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eFxueHggeHh4eHh4ICAgICAgICAgICAgICAhISAgICAgICAgICAgICAgICAgICB4eHh4XG54eCB4eHh4eHggICAgICAgICAgICAgIHh4ICAgICAgICAgICAhICAgICAgIHh4eHhcbnh4IHh4eHh4eCAgICAgICAgICAgICAgeHggICAgICAgICAgIHghICAgICAgeHh4eFxueHggeHh4eHh4LS0gICAgIEQgICAgICB4eCAgICAgICAgICAheHggICAgICB4eHh4XG54eCB4eHh4eHggICAgICAgICAgICAgIHh4ICAgICAgICAgIHh4eCEgICAgIHh4eHhcbnh4IHh4eHh4eCAgICAgICAgICAgICAgISEgICAgICAgICAgeHh4eCAgICAgeHh4eFxueHggeCAgeHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAhISEhICAgICAgeHh4XG54eCAgICAgeCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHhcbnh4ICAgICB4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueHggICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4XG54eCAgIHh4eCEhISEgICAgICAhISEhISEgICAgQiAgICAgICAgICAgICAgICB4eHhcbnh4ICAgeHh4eHh4eCEhISEhIXh4eHh4eCEhISF4eHh4ICAgICAgICAgICAgIHh4eFxueHh4ICB4eHh4eHh4eHh4eHh4ICB4eHh4eHh4eHh4eHggICAgQiAgICAgUCAgeHh4XG54eHggIHh4eCAgIHggICAgIHggICAgICB4ICAgIHh4eHh4eHh4eHh4eHgtLSB4eHhcbnh4eCAgeHh4ICAgeCAgICAgeCAgICAgIHggICAgeHh4eHh4eHh4eHh4eCAgIHh4eGApO1xubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzEwLCAyLCAyMywgQ0VMRVNURV8xMSwgNDIsIDAsIDMpO1xuXG5cbmNvbnN0IENFTEVTVEVfMTIgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4ICB4eHggICB4ICAgICB4ICAgICAgeCAgICB4eHh4eHh4eHh4eFxueHh4ICB4eHh4eHh4eHggICB4ICB4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICB4eCAgICB4eHh4eHh4eHh4eHh4ICB4eHh4eHh4eHh4eHh4eFxueHh4PT14eCAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxueHh4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFAgIFxueHggICAgeCAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eGApO1xubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzEyLCA0MCwgMTEsIENFTEVTVEVfMTAsIDAsIDExLCA0KTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8xMiwgMywgMjMsIENFTEVTVEVfMTEsIDMsIDAsIDIpO1xuXG5cbmNvbnN0IENFTEVTVEVfMTMgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxuICAgIHh4eHh4eHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHh4eHh4eHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHggIHh4eHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHggIHh4eHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIHggICAgeHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgeHh4eHh4ISAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIHh4eHggICAgRCAgICAgICAgICAgeHh4eCAgICAgICAgICAgICAgIFxuICBQICAgICAgIHh4eHggICAgICAgICAgIC0tLS0teHh4eCAgICAgICAgICAgICAgIFxueHh4LS0tICAgIHh4eHggICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgIHh4eHggICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgIHh4eHggICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgIHh4eHggICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgIHh4eHggICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgISEhIXggICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgLS0tLXggICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eFxueHh4ICAgICB4eHh4eCAgICAgICAgICAgICAgICAgICAgIHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblJpZ2h0KENFTEVTVEVfMDgsIDQwLCAxMywgQ0VMRVNURV8xMywgMCwgMTMsIDEwKTtcblxuXG5jb25zdCBURVNUX0xFVkVMID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHggICAgICAgICAgICAgICB4eHh4eHhcbnh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eCAgICAgICAgICB4eHh4ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eHh4ICAgICAgeHh4eCAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnghISAgICAgICAgeHh4eHh4eHh4ICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eCEheHggICAgeHh4eHh4eHh4ICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgeCAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgeCAgICAgICAgICAgISEheHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgUCAgICAgeCAgICAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4eCAgICAgICAgICAgIHh4eHggICAgeCAgICAgICAgICAheHh4eHghISEhISEhISEhICAgICAgICEhISEhISEheHh4eHhcbnh4eCAgICAgICAgICAgIXh4eHggICAgeHh4eCAgICAgICAheHh4eHh4eHh4eHh4eHghISEhISEhISF4eHh4eHh4eHh4eHhcbnh4eHh4eHh4ISEhISEhIXh4eHggICAgeHh4eCEhISEhISEheHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxuVEVTVF9MRVZFTC5hZGRFbGVtZW50KFxuICAgIG5ldyBwaHlzaWNzLkhhemFyZCg3ICogVSwgMjAgKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCg3ICogVSwgMjAgKiBVLCA3ICogVSwgMiAqIFUsIDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoNyAqIFUsIDIgKiBVLCA3ICogVSwgMjAgKiBVLCAxKSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZEVsZW1lbnQoXG4gICAgbmV3IHBoeXNpY3MuSGF6YXJkKDExICogVSwgMjAgKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMSAqIFUsIDIwICogVSwgMTEgKiBVLCAxNCAqIFUsIC4yNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMSAqIFUsIDE0ICogVSwgMTEgKiBVLCAyMCAqIFUsIC4yNSksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRFbGVtZW50KFxuICAgIG5ldyBwaHlzaWNzLkhhemFyZChVLCAxOCAqIFUsIDIgKiBVLCAyICogVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgxLjUpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50LkxpbmVhck1vdmVtZW50KFUsIDE4ICogVSwgMjAgKiBVLCAxOCAqIFUsIDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMjAgKiBVLCAxOCAqIFUsIFUsIDE4ICogVSwgMSksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRTb2xpZChcbiAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAwLCAzICogVSwgVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5TaW5lTW92ZW1lbnQoNTIgKiBVLCA2ICogVSwgNTIgKiBVLCAxNCAqIFUsIDIsIDMpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDIpLFxuICAgICAgICBdLCAtMSkpKTtcblRFU1RfTEVWRUwuYWRkU29saWQoXG4gICAgbmV3IHBoeXNpY3MuU29saWQoMCwgMCwgMyAqIFUsIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2luZU1vdmVtZW50KDU1ICogVSwgMTYgKiBVLCA2MCAqIFUsIDE2ICogVSwgMiwgLTEpKSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgQ0VMRVNURV8wMSxcbiAgICBDRUxFU1RFXzAyLFxuICAgIENFTEVTVEVfMDMsXG4gICAgQ0VMRVNURV8wNCxcbiAgICBDRUxFU1RFXzA1LFxuICAgIENFTEVTVEVfMDYsXG4gICAgQ0VMRVNURV8wNyxcbiAgICBDRUxFU1RFXzA4LFxuICAgIENFTEVTVEVfMDksXG4gICAgVEVTVF9MRVZFTCxcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbmNsYXNzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3RvcihkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMuY291bnQgPSBjb3VudDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IGNvdW50O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKSB7XG4gICAgICAgIHRoaXMudGltZXIgKz0gZGVsdGFUaW1lO1xuICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAmJiB0aGlzLnJlbWFpbmluZ0NvdW50ICYmIHRoaXMudGltZXIgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLnJlbWFpbmluZ0NvdW50IC09IDE7XG4gICAgICAgICAgICBpZiAodGhpcy5yZW1haW5pbmdDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlc2V0KCkge1xuICAgICAgICB0aGlzLnRpbWVyID0gMDtcbiAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCA9IHRoaXMuY291bnQ7XG4gICAgfVxufVxuXG5cbmNsYXNzIExpbmVhck1vdmVtZW50IGV4dGVuZHMgTW92ZW1lbnQge1xuICAgIGNvbnN0cnVjdG9yKHgxLCB5MSwgeDIsIHkyLCBkdXJhdGlvbiwgY291bnQgPSAxKSB7XG4gICAgICAgIHN1cGVyKGR1cmF0aW9uLCBjb3VudCk7XG4gICAgICAgIHRoaXMueDEgPSB4MTtcbiAgICAgICAgdGhpcy55MSA9IHkxO1xuICAgICAgICB0aGlzLngyID0geDI7XG4gICAgICAgIHRoaXMueTIgPSB5MjtcbiAgICAgICAgdGhpcy5teCA9ICh4MiAtIHgxKSAvIGR1cmF0aW9uO1xuICAgICAgICB0aGlzLm15ID0gKHkyIC0geTEpIC8gZHVyYXRpb247XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyKTtcbiAgICAgICAgICAgIHRoaW5nLnNldE1vbWVudHVtKHRoaXMubXgsIHRoaXMubXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHRoaXMueDIsIHRoaXMueTIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNlcXVlbmNlTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IobW92ZW1lbnRzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMubW92ZW1lbnRzID0gbW92ZW1lbnRzO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0uZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLm1vdmVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTaW5lTW92ZW1lbnRcbiAgICBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHJhdGlvICogdGhpcy54MSArICgxIC0gcmF0aW8pICogdGhpcy54MiwgcmF0aW8gKiB0aGlzLnkxICsgKDEgLSByYXRpbykgKiB0aGlzLnkyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNb3ZlbWVudCxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTZXF1ZW5jZU1vdmVtZW50LFxuICAgIFNpbmVNb3ZlbWVudCxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdHdvIHNlZ21lbnRzIG9uIGEgMUQgbGluZSBvdmVybGFwLlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIH1cblxuICAgIG92ZXJsYXBzKG90aGVyKSB7XG4gICAgICAgIHJldHVybiAodGhpcy54ICsgdGhpcy53aWR0aCA+IG90aGVyLnggJiZcbiAgICAgICAgICAgIG90aGVyLnggKyBvdGhlci53aWR0aCA+IHRoaXMueCAmJlxuICAgICAgICAgICAgdGhpcy55ICsgdGhpcy5oZWlnaHQgPiBvdGhlci55ICYmXG4gICAgICAgICAgICBvdGhlci55ICsgb3RoZXIuaGVpZ2h0ID4gdGhpcy55KTtcbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCAtIHRoaXMuc2NlbmUuc2Nyb2xsWCwgdGhpcy55IC0gdGhpcy5zY2VuZS5zY3JvbGxZLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdIC09IGRlbHRhVGltZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC51cGRhdGUoZGVsdGFUaW1lLCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgfVxuXG4gICAgbW92ZVRvKHgsIHkpIHtcbiAgICAgICAgdGhpcy5tb3ZlKHggLSB0aGlzLnggLSB0aGlzLnhSZW1haW5kZXIsIHkgLSB0aGlzLnkgLSB0aGlzLnlSZW1haW5kZXIpO1xuICAgIH1cblxuICAgIHNldE1vdmVtZW50KG1vdmVtZW50KSB7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufVxuXG5cbmNsYXNzIEFjdG9yIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIG1vdmVYKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1ggPSB0aGlzLnggKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54IC0gdGhpcy53aWR0aCA8IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgbW92ZSwgMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC54ICsgc29saWQud2lkdGggPiBuZXdYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WCA9IHNvbGlkLnggKyBzb2xpZC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHggPSBuZXdYIC0gdGhpcy54O1xuICAgICAgICAgICAgdGhpcy54ID0gbmV3WDtcbiAgICAgICAgICAgIGlmIChjb2xsaXNpb25Tb2xpZCAmJiBvbkNvbGxpZGUpIHtcbiAgICAgICAgICAgICAgICBvbkNvbGxpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkeDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlWShhbW91bnQsIG9uQ29sbGlkZSA9IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gYW1vdW50O1xuICAgICAgICBsZXQgbW92ZSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmU7XG5cbiAgICAgICAgaWYgKG1vdmUpIHtcbiAgICAgICAgICAgIGxldCBuZXdZID0gdGhpcy55ICsgbW92ZTtcbiAgICAgICAgICAgIGxldCBjb2xsaXNpb25Tb2xpZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChtb3ZlID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zY2VuZS5zb2xpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLmNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKHRoaXMsIDAsIG1vdmUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQueSAtIHRoaXMuaGVpZ2h0IDwgbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55IC0gdGhpcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55ICsgc29saWQuaGVpZ2h0ID4gbmV3WSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1kgPSBzb2xpZC55ICsgc29saWQuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeSA9IG5ld1kgLSB0aGlzLnk7XG4gICAgICAgICAgICB0aGlzLnkgPSBuZXdZO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGR5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMubW92ZWRYID0gMDtcbiAgICAgICAgdGhpcy5tb3ZlZFkgPSAwO1xuICAgIH1cblxuICAgIGlzUmlkaW5nKHNvbGlkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnkgPT09IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgJiYgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpO1xuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICB9XG59XG5cblxuY2xhc3MgU29saWQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb2xvciA9ICcjNmMyYzBiJztcbiAgICAgICAgdGhpcy5tb21lbnR1bVggPSAwO1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLm1vbWVudHVtID0gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVgoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBnZXRNb21lbnR1bVkoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVycy5tb21lbnR1bSA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vbWVudHVtWTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSwgbXggPSB1bmRlZmluZWQsIG15ID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFjdG9yLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJpZGluZy5hZGQoYWN0b3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAobW92ZVgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgICAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1vdmVYID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgodGhpcy54ICsgdGhpcy53aWR0aCAtIGFjdG9yLngsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaGFzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3Rvci5tb3ZlZFggPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFggKz0gYWN0b3IubW92ZVgobW92ZVgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYWN0b3IubW92ZWRYIDwgbW92ZVgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYIC0gYWN0b3IubW92ZWRYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuc2NlbmUuYWN0b3JzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vdmVybGFwcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlWCh0aGlzLnggLSBhY3Rvci54IC0gYWN0b3Iud2lkdGgsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWCArPSBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5oYXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPCBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFkgKz0gYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVZKHRoaXMueSAtIGFjdG9yLnkgLSBhY3Rvci5oZWlnaHQsICgpID0+IGFjdG9yLnNxdWlzaCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmlkaW5nLmhhcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA+IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldE1vbWVudHVtKG14LCBteSkge1xuICAgICAgICB0aGlzLnRpbWVycy5tb21lbnR1bSA9IGNvbnN0YW50cy5NT01FTlRVTV9TVE9SRV9USU1FO1xuICAgICAgICB0aGlzLm1vbWVudHVtWCA9IG14O1xuICAgICAgICB0aGlzLm1vbWVudHVtWSA9IG15O1xuICAgIH1cblxuICAgIGNvbGxpZGVzV2l0aE1vdmluZ0FjdG9yKGFjdG9yLCBkeCA9IDAsIGR5ID0gMCkge1xuICAgICAgICBpZiAoZHggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGggKyBkeCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSwgYWN0b3IuaGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54ICsgZHgsIGFjdG9yLndpZHRoIC0gZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCArIGR5KTtcbiAgICAgICAgfSBlbHNlIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgYWN0b3IueSArIGR5LCBhY3Rvci5oZWlnaHQgLSBkeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG5jbGFzcyBIYXphcmQgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jb2xvciA9ICcjZjMxMzE0JztcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci5kaWUoKTtcbiAgICB9XG5cbiAgICBtb3ZlKGR4LCBkeSkge1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgKz0gZHg7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBkeTtcbiAgICAgICAgY29uc3QgbW92ZVggPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIGNvbnN0IG1vdmVZID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuXG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgdGhpcy54ICs9IG1vdmVYO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZVk7XG4gICAgICAgIHRoaXMueSArPSBtb3ZlWTtcbiAgICB9XG59XG5cblxuY2xhc3MgUGxhdGZvcm0gZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgpIHtcbiAgICAgICAgc3VwZXIoeCwgeSArIFUgLyAyLCB3aWR0aCwgVSAvIDIpO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjYTg2MTJhXCI7XG4gICAgfVxuXG4gICAgY29sbGlkZXNXaXRoTW92aW5nQWN0b3IoYWN0b3IsIGR4ID0gMCwgZHkgPSAwKSB7XG4gICAgICAgIGlmIChkeSA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbGxpZGFibGUgJiZcbiAgICAgICAgICAgICAgICBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBhY3Rvci54LCBhY3Rvci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ID49IHRoaXMueSArIHRoaXMuaGVpZ2h0ICYmXG4gICAgICAgICAgICAgICAgYWN0b3IueSArIGR5IDwgdGhpcy55ICsgdGhpcy5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuXG5jbGFzcyBTcHJpbmcgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCAyICogVSwgVSAvIDIpO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjZGVkZjM1XCI7XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0JPVU5DRSk7XG4gICAgICAgIHBsYXllci5zcGVlZFggPSAwO1xuICAgICAgICBwbGF5ZXIuc3BlZWRZID0gY29uc3RhbnRzLkJPVU5DRV9TUEVFRDtcbiAgICAgICAgcGxheWVyLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxufVxuXG5cbmNsYXNzIERhc2hEaWFtb25kIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHkpIHtcbiAgICAgICAgc3VwZXIoeCArIC41ICogVSwgeSArIC41ICogVSwgVSwgVSk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gXCIjNzlmZjAwXCI7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKVxuICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUgJiYgdGhpcy50aW1lcnMuY29vbGRvd24gPD0gMCkge1xuICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBwbGF5ZXIucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gMjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHRoaXMueCAtIHRoaXMuc2NlbmUuc2Nyb2xsWCwgdGhpcy55IC0gdGhpcy5zY2VuZS5zY3JvbGxZLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLnggLSB0aGlzLnNjZW5lLnNjcm9sbFgsIHRoaXMueSAtIHRoaXMuc2NlbmUuc2Nyb2xsWSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFN0cmF3YmVycnkgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4ICsgLjUgKiBVLCB5ICsgLjUgKiBVLCBVLCBVKTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNmZjAwOWFcIjtcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBwbGF5ZXIudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IHRoaXMuY29sb3I7XG4gICAgICAgIGN0eC5zdHJva2VSZWN0KHRoaXMueCAtIHRoaXMuc2NlbmUuc2Nyb2xsWCwgdGhpcy55IC0gdGhpcy5zY2VuZS5zY3JvbGxZLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLnggLSB0aGlzLnNjZW5lLnNjcm9sbFgsIHRoaXMueSAtIHRoaXMuc2NlbmUuc2Nyb2xsWSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFRyYW5zaXRpb24gZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgdGFyZ2V0U2NlbmUsIHRhcmdldFgsIHRhcmdldFkpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudGFyZ2V0U2NlbmUgPSB0YXJnZXRTY2VuZTtcbiAgICAgICAgdGhpcy50YXJnZXRYID0gdGFyZ2V0WDtcbiAgICAgICAgdGhpcy50YXJnZXRZID0gdGFyZ2V0WTtcbiAgICB9XG5cbiAgICBpbnRlcmFjdFdpdGgocGxheWVyKSB7XG4gICAgICAgIHBsYXllci50cmFuc2l0aW9uU2NlbmUodGhpcy50YXJnZXRTY2VuZSk7XG4gICAgICAgIHBsYXllci54ICs9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcbiAgICAgICAgcGxheWVyLnkgKz0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xuICAgICAgICB0aGlzLnNjZW5lLnRyYW5zaXRpb24gPSB0aGlzO1xuICAgIH1cbn1cblxuXG5jbGFzcyBGYWxsaW5nQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuaXNGYWxsaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5jb29sZG93biA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgaWYgKHRoaXMuaXNGYWxsaW5nKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZmFsbCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmNvb2xkb3duID0gNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmNvb2xkb3duIDw9IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmlzRmFsbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuc2NlbmUucGxheWVyICYmIHRoaXMuc2NlbmUucGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0ZhbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmZhbGwgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBUcmlnZ2VyQmxvY2sgZXh0ZW5kcyBTb2xpZCB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCwgbW92ZW1lbnQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQgPSBtb3ZlbWVudDtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiIzNiM2IzYlwiO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMuc2NlbmUucGxheWVyO1xuICAgICAgICBpZiAocGxheWVyKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCAmJiB0aGlzLm1vdmVtZW50LnJlbWFpbmluZ0NvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm1vdmVtZW50ID09PSB1bmRlZmluZWQgJiYgcGxheWVyLmlzUmlkaW5nKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudCA9IHRoaXMudHJpZ2dlcmVkTW92ZW1lbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudC5yZXNldCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNlZ21lbnRzT3ZlcmxhcCxcbiAgICBIYXphcmQsXG4gICAgU29saWQsXG4gICAgQWN0b3IsXG4gICAgUGxhdGZvcm0sXG4gICAgU3ByaW5nLFxuICAgIERhc2hEaWFtb25kLFxuICAgIFN0cmF3YmVycnksXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCA4LCAxNCk7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMgPSBuZXcgU2V0KCk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50cy5TVEFURV9OT1JNQUw7XG4gICAgICAgIC8vIHRpbWVyc1xuICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5kYXNoRnJlZXplID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5keWluZyA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5pbnB1dHMudXBkYXRlKGRlbHRhVGltZSk7XG5cbiAgICAgICAgLy8gY2hlY2sgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5pc0dyb3VuZGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxMZWZ0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FycnlpbmdTb2xpZHMuY2xlYXIoKTtcbiAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgaWYgKHRoaXMueSA9PT0gc29saWQueSArIHNvbGlkLmhlaWdodCAmJiBwaHlzaWNzLnNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIHNvbGlkLngsIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgIC8vIHBsYXllciBpcyBzdGFuZGluZyBvbiBhIHNvbGlkXG4gICAgICAgICAgICAgICAgdGhpcy5jYXJyeWluZ1NvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciB3YWxscyBvbiByaWdodCBhbmQgbGVmdCBhdCBkaXN0YW5jZSA8PSBXQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0VcbiAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZUxlZnQgPSB0aGlzLnggLSBzb2xpZC54IC0gc29saWQud2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VMZWZ0ICYmIGRpc3RhbmNlTGVmdCA8IGNvbnN0YW50cy5XQUxMX0pVTVBfQ0hFQ0tfRElTVEFOQ0UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3RhbmNlUmlnaHQgPSBzb2xpZC54IC0gdGhpcy54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICBpZiAoMCA8PSBkaXN0YW5jZVJpZ2h0ICYmIGRpc3RhbmNlUmlnaHQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbFJpZ2h0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHRoaXMueCArIHRoaXMud2lkdGggPT09IHNvbGlkLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgdGhpcy54ID09PSBzb2xpZC54ICsgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoZWNrIGlmIHBsYXllciBpcyBodWdnaW5nIGEgd2FsbFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhcnJ5aW5nU29saWRzLmFkZChzb2xpZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNIdWdnaW5nV2FsbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gY29uc3RhbnRzLkpVTVBfR1JBQ0VfVElNRTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBjb25zdGFudHMuU1RBVEVfREFTSCB8fCB0aGlzLmRhc2hTcGVlZFkgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZURhc2goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKTtcblxuICAgICAgICB0aGlzLm1vdmVYKHRoaXMuc3BlZWRYICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWCA9IDApO1xuICAgICAgICB0aGlzLm1vdmVZKHRoaXMuc3BlZWRZICogZGVsdGFUaW1lLCAoKSA9PiB0aGlzLnNwZWVkWSA9IDApO1xuXG4gICAgICAgIC8vIHNldCBjb2xvclxuICAgICAgICB0aGlzLmNvbG9yID0gdGhpcy5uYkRhc2hlcyA+IDAgPyAnI2E2MzYzNicgOiAnIzNmYjBmNic7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlID09PSBjb25zdGFudHMuU1RBVEVfREVBRCkge1xuICAgICAgICAgICAgbGV0IGFscGhhID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcigyNTUgKiB0aGlzLnRpbWVycy5keWluZyAvIGNvbnN0YW50cy5EWUlOR19USU1FKSk7XG4gICAgICAgICAgICB0aGlzLmNvbG9yID0gXCJcIiArIHRoaXMuY29sb3IgKyAoXCIwXCIgKyBhbHBoYS50b1N0cmluZygxNikpLnN1YnN0cigtMik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbnRlcmFjdCB3aXRoIG9iamVjdHNcbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHRoaXMuc2NlbmUuZWxlbWVudHMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5pbnRlcmFjdFdpdGgodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy55IDw9IC10aGlzLmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5kaWUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVwZGF0ZU1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmR5aW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNwYXduKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlRGFzaChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVKdW1wKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9yaXpvbnRhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy5qdW1wSGVsZCAmJiB0aGlzLnRpbWVycy52YXJKdW1wID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZLCBjb25zdGFudHMuSlVNUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSB0aGlzLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTiArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREFTSCk7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpIHtcbiAgICAgICAgbGV0IGRpZEp1bXAgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IHRoaXMuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIGRpZEp1bXAgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBjb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgZGlkSnVtcCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpZEp1bXApIHtcbiAgICAgICAgICAgIGxldCBteCA9IDA7XG4gICAgICAgICAgICBsZXQgbXkgPSAwO1xuICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLmNhcnJ5aW5nU29saWRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3ggPSBzb2xpZC5nZXRNb21lbnR1bVgoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzeSA9IHNvbGlkLmdldE1vbWVudHVtWSgpO1xuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhzeCkgPiBNYXRoLmFicyhteCkpIG14ID0gc3g7XG4gICAgICAgICAgICAgICAgaWYgKE1hdGguYWJzKHN5KSA+IE1hdGguYWJzKG15KSkgbXkgPSBzeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZICs9IGNvbnN0YW50cy5NT01FTlRVTV9GQUNUT1IgKiBteTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlkSnVtcDtcbiAgICB9XG5cbiAgICB1cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIC8vIGhvcml6b250YWwgbW92ZW1lbnRcbiAgICAgICAgbGV0IHN4ID0gTWF0aC5hYnModGhpcy5zcGVlZFgpOyAgICAgICAgLy8gYWJzb2x1dGUgdmFsdWUgb2YgdGhlIGhvcml6b250YWwgc3BlZWQgb2YgdGhlIHBsYXllclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMuc3BlZWRYID49IDAgPyAxIDogLTE7ICAgIC8vIGRpcmVjdGlvbiBpbiB3aGljaCB0aGUgcGxheWVyIGlzIG1vdmluZ1xuICAgICAgICBjb25zdCBtdWx0ID0gdGhpcy5pc0dyb3VuZGVkID8gMSA6IGNvbnN0YW50cy5BSVJfRkFDVE9SO1xuXG4gICAgICAgIC8vIHBhc3NpdmUgZGVjZWxlcmF0aW9uXG4gICAgICAgIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDw9IDApIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIDApO1xuICAgICAgICB9IGVsc2UgaWYgKHN4ID4gY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5tYXgoc3ggLSBjb25zdGFudHMuUlVOX0RFQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjdGl2ZSBhY2NlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPiAwICYmIHN4IDwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpIHtcbiAgICAgICAgICAgIHN4ID0gTWF0aC5taW4oc3ggKyBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQsIGNvbnN0YW50cy5NQVhfUlVOX1NQRUVEKTtcbiAgICAgICAgfSBlbHNlIGlmIChkeCAqIHRoaXMuaW5wdXRzLnhBeGlzIDwgMCkge1xuICAgICAgICAgICAgc3ggLT0gY29uc3RhbnRzLlJVTl9BQ0NFTEVSQVRJT04gKiBkZWx0YVRpbWUgKiBtdWx0O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3BlZWRYID0gZHggKiBzeDtcbiAgICB9XG5cbiAgICB1cGRhdGVWZXJ0aWNhbE1vdmVtZW50KGRlbHRhVGltZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNHcm91bmRlZCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNIdWdnaW5nV2FsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlucHV0cy55QXhpcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5DTElNQl9VUF9TUEVFRDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLnlBeGlzID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZIC0gY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIC1jb25zdGFudHMuQ0xJTUJfU0xJUF9TUEVFRCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1heCh0aGlzLnNwZWVkWSAtIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCAtY29uc3RhbnRzLk1BWF9GQUxMX1NQRUVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFN0YXRlKG5ld1N0YXRlKSB7XG4gICAgICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gbGVhdmUgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9ERUFEOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9CT1VOQ0U6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmJvdW5jZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChuZXdTdGF0ZSkge1xuICAgICAgICAgICAgICAgIC8vIG9uIGVudGVyIHN0YXRlIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9OT1JNQUw6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmp1bXBHcmFjZSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLnZhckp1bXAgPSBjb25zdGFudHMuVkFSX0pVTVBfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gY29uc3RhbnRzLkRBU0hfQ09PTERPV047XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSBjb25zdGFudHMuREFTSF9USU1FICsgY29uc3RhbnRzLkRBU0hfRlJFRVpFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGltZXJzLmR5aW5nID0gY29uc3RhbnRzLkRZSU5HX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gY29uc3RhbnRzLkJPVU5DRV9USU1FO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyYW5zaXRpb25TY2VuZSh0YXJnZXRTY2VuZSkge1xuICAgICAgICAvLyB2YWxpZGF0ZSB0ZW1wb3Jhcnkgc3RyYXdiZXJyaWVzXG4gICAgICAgIGZvciAoY29uc3Qgc3RyYXdiZXJyeSBvZiB0aGlzLnRlbXBvcmFyeVN0cmF3YmVycmllcykge1xuICAgICAgICAgICAgc3RyYXdiZXJyeS5zY2VuZS5yZW1vdmVFbGVtZW50KHN0cmF3YmVycnkpO1xuICAgICAgICAgICAgdGhpcy5zdHJhd2JlcnJpZXMuYWRkKHN0cmF3YmVycnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2NlbmUuc2V0UGxheWVyKHVuZGVmaW5lZCk7XG4gICAgICAgIHRhcmdldFNjZW5lLnNldFBsYXllcih0aGlzKTtcbiAgICB9XG5cbiAgICBkaWUoKSB7XG4gICAgICAgIC8vIHJlYWN0aXZhdGUgdGVtcG9yYXJ5IHN0cmF3YmVycmllc1xuICAgICAgICBmb3IgKGNvbnN0IHN0cmF3YmVycnkgb2YgdGhpcy50ZW1wb3JhcnlTdHJhd2JlcnJpZXMpIHtcbiAgICAgICAgICAgIHN0cmF3YmVycnkuaXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGVtcG9yYXJ5U3RyYXdiZXJyaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0RFQUQpO1xuICAgIH1cblxuICAgIHJlc3Bhd24oKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMuc2NlbmUuc3RhcnRQb3NpdGlvblg7XG4gICAgICAgIHRoaXMueSA9IHRoaXMuc2NlbmUuc3RhcnRQb3NpdGlvblk7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHQgaW4gdGhpcy50aW1lcnMpIHtcbiAgICAgICAgICAgIHRoaXMudGltZXJzW3RdID0gMDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICB0aGlzLnJlc3RvcmVEYXNoKCk7XG4gICAgfVxuXG4gICAgcmVzdG9yZURhc2goKSB7XG4gICAgICAgIHRoaXMubmJEYXNoZXMgPSAxO1xuICAgIH1cblxuICAgIHNxdWlzaCgpIHtcbiAgICAgICAgdGhpcy5kaWUoKTtcbiAgICB9XG5cbiAgICBpc1JpZGluZyhzb2xpZCkge1xuICAgICAgICByZXR1cm4gc3VwZXIuaXNSaWRpbmcoc29saWQpIHx8XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgcGh5c2ljcy5zZWdtZW50c092ZXJsYXAodGhpcy55LCB0aGlzLmhlaWdodCwgc29saWQueSwgc29saWQuaGVpZ2h0KSAmJlxuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAtMSAmJiBzb2xpZC54ICsgc29saWQud2lkdGggPT09IHRoaXMueCkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMuaW5wdXRzLnhBeGlzID09PSAxICYmIHNvbGlkLnggPT09IHRoaXMueCArIHRoaXMud2lkdGgpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGxheWVyLFxufSIsIlwidXNlIHN0cmljdFwiO1xuY29uc3QgcGh5c2ljcyA9IHJlcXVpcmUoJy4vcGh5c2ljcycpO1xuY29uc3QgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbmNvbnN0IFUgPSBjb25zdGFudHMuR1JJRF9TSVpFO1xuXG5cbmNsYXNzIFNjZW5lIHtcbiAgICBjb25zdHJ1Y3Rvcih3aWR0aCwgaGVpZ2h0LCBzdGFydFBvc2l0aW9uWCA9IHVuZGVmaW5lZCwgc3RhcnRQb3NpdGlvblkgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gVSAvIDI7XG4gICAgICAgIHRoaXMuc29saWRzID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLmFjdG9ycyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cyA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGlmIChzdGFydFBvc2l0aW9uWCAhPT0gdW5kZWZpbmVkICYmIHN0YXJ0UG9zaXRpb25ZICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGxheWVyID0gbmV3IHBoeXNpY3MuUGxheWVyKHN0YXJ0UG9zaXRpb25YLCBzdGFydFBvc2l0aW9uWSk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25YID0gc3RhcnRQb3NpdGlvblg7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25ZID0gc3RhcnRQb3NpdGlvblk7XG4gICAgICAgICAgICB0aGlzLmFkZEFjdG9yKHRoaXMucGxheWVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25ZID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRTdGFydFBvc2l0aW9uKHgsIHkpIHtcbiAgICAgICAgdGhpcy5zdGFydFBvc2l0aW9uWCA9IHg7XG4gICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblkgPSB5O1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tU3RyaW5nKHMpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gbGluZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCB3aWR0aCA9IGxpbmVzWzBdLmxlbmd0aDtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUod2lkdGggKiBVLCBoZWlnaHQgKiBVKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBsaW5lc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBqICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gKGhlaWdodCAtIGkgLSAxKSAqIFU7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChsaW5lc1tpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICchJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdQJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLnNldFN0YXJ0UG9zaXRpb24oeCwgeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnRCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLkRhc2hEaWFtb25kKHgsIHkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuU3RyYXdiZXJyeSh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnLSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc29saWRzKSB7XG4gICAgICAgICAgICBzb2xpZC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xuICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGFjdG9yIG9mIHRoaXMuYWN0b3JzKSB7XG4gICAgICAgICAgICBhY3Rvci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzY3JvbGwgdmlld1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci54IC0gdGhpcy5zY3JvbGxYID4gLjYwICogY29uc3RhbnRzLlZJRVdfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbFggPSBNYXRoLm1pbih0aGlzLndpZHRoIC0gY29uc3RhbnRzLlZJRVdfV0lEVEgsIHRoaXMucGxheWVyLnggLSAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPCAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWF4KDAsIHRoaXMucGxheWVyLnggLSAuNDAgKiBjb25zdGFudHMuVklFV19XSURUSCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA+IC42MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWluKHRoaXMuaGVpZ2h0IC0gY29uc3RhbnRzLlZJRVdfSEVJR0hULCB0aGlzLnBsYXllci55IC0gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueSAtIHRoaXMuc2Nyb2xsWSA8IC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWSA9IE1hdGgubWF4KFUgLyAyLCB0aGlzLnBsYXllci55IC0gLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGZvciAoY29uc3Qgc29saWQgb2YgdGhpcy5zb2xpZHMpIHtcbiAgICAgICAgICAgIHNvbGlkLmRyYXcoY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5lbGVtZW50cykge1xuICAgICAgICAgICAgZWxlbWVudC5kcmF3KGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLmFjdG9ycykge1xuICAgICAgICAgICAgYWN0b3IuZHJhdyhjdHgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHRoaXMucmVtb3ZlQWN0b3IodGhpcy5wbGF5ZXIpO1xuICAgICAgICBpZiAocGxheWVyKSB0aGlzLmFkZEFjdG9yKHBsYXllcik7XG4gICAgICAgIHRoaXMucGxheWVyID0gcGxheWVyO1xuICAgIH1cblxuICAgIGFkZEFjdG9yKGFjdG9yKSB7XG4gICAgICAgIHRoaXMuYWN0b3JzLmFkZChhY3Rvcik7XG4gICAgICAgIGFjdG9yLnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5kZWxldGUoYWN0b3IpO1xuICAgICAgICBhY3Rvci5zY2VuZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBhZGRTb2xpZChzb2xpZCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5hZGQoc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcmVtb3ZlU29saWQoc29saWQpIHtcbiAgICAgICAgdGhpcy5zb2xpZHMucmVtb3ZlKHNvbGlkKTtcbiAgICAgICAgc29saWQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgYWRkRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50LnNjZW5lID0gdGhpcztcbiAgICB9XG5cbiAgICByZW1vdmVFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgIGVsZW1lbnQuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIl19
