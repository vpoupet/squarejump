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
const CLIMB_SLIP_SPEED = 30;
const WALL_JUMP_CHECK_DISTANCE = 3;
const WALL_JUMP_HSPEED = MAX_RUN_SPEED + JUMP_HORIZONTAL_BOOST;
const DASH_SPEED = 240;
const END_DASH_SPEED = 160;
const END_DASH_UP_FACTOR = .75;
const DASH_TIME = .15;
const DASH_COOLDOWN = .2;

// Other constants
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
    CLIMB_SLIP_SPEED,
    WALL_JUMP_CHECK_DISTANCE,
    WALL_JUMP_HSPEED,
    DASH_SPEED,
    END_DASH_SPEED,
    END_DASH_UP_FACTOR,
    DASH_TIME,
    DASH_COOLDOWN,
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

            context.fillStyle = '#221e31';  // background color
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
            case '<':
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
    scene1.addElement(new physics.Transition(
        x1 * U, (y1 + 1) * U, width * U, 0, scene2, x2 * U , (y2 + 3) * U
    ))
    scene2.addElement(new physics.Transition(
        x2 * U, (y2 - 1) * U, width * U, 0, scene1, x1 * U, (y1 - 3) * U
    ))
}

function makeTransitionRight(scene1, x1, y1, scene2, x2, y2, height) {
    scene1.addElement(new physics.Transition(
        x1 * U, y1 * U, 0, height * U, scene2, (x2 + 1) * U , y2 * U
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
xx            S    xxxxxxx    xxx      x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                     xxx             x
x                      xx   xxx        x
x                      xx              x
x                       x              x
x                       x         xxx  x
x                                      x
x                                      x
x  x          xx             xxx       x
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
xx    xxx            xxxxxx          xxx
xxxxxxxxx!!!!    !!!!xxxxxx          xxx
xxxxxxxxxxxxx    xxxxxxxxxxx         xxx
xxxxxxxxxxxxx    xxxxx  xxxx          xx
xxxxxxx            xx   xxx           xx
xxxxxx                  xx            xx
xxx                      x            xx
                         x              
                         x              
                         x              
xx   P     xx    xxx     xxx            
xxx----xxxxxx    xxx!!!!!xxx        ---x
xxx    xxxxxxxxxxxxxxxxxxxxx           x`);

CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, U, 4 * U, 2 * U, new movement.SequenceMovement([
    new movement.Movement(0.5),
    new movement.LinearMovement(13 * U, U, 13 * U, 9 * U, .25),
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
          xxxxxx S  x                   
          xxxxxx    x                 xx
xxxxxx    xxxxxx               xxxxxxxxx
xxxx x    xxxxxx           --xxxxxxxxxxx
xx   x    xxxxx              xxxxxxxxxxx
xx        xxxxx                 xxxxxxxx
x         xxxx                  xxxxxxxx
x         xxxx                  xxxxxxxx
x         xxxx            -----xxxxxxxxx
x       xxxxxx                 xxxxxxxxx
x       xxxxxx              xxxxxxxxxxxx
x P     xxxxxx!!      xxxxxxxxxxxxxxxxxx
x---xxxxxxxxxxxx!!!!!!xxxxxxxxxxxxxxxxxx
x   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_06, 35, 36, CELESTE_08, 1, 0, 3);


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
    new physics.Hazard(1 * U, 18 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(1 * U, 18 * U, 20 * U, 18 * U, 1),
            new movement.Movement(1.5),
            new movement.LinearMovement(20 * U, 18 * U, 1 * U, 18 * U, 1),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, 1 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.SineMovement(52 * U, 6 * U, 52 * U, 14 * U, 2, 3),
            new movement.Movement(2),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, 1 * U)
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
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        if (this.timer < this.duration) {
            const r = this.timer / this.duration;
            thing.moveTo((1 - r) * this.x1 + r * this.x2, (1 - r) * this.y1 + r * this.y2);
        } else {
            thing.moveTo(thing.x = this.x2, thing.y = this.y2);
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
        this.color = '#a1593d';
    }

    move(dx, dy) {
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        if (moveX || moveY) {
            const riding = this.scene.actors.filter(x => (x.isRiding(this)));
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;

                if (moveX > 0) {
                    for (const actor of this.scene.actors) {
                        if (this.overlaps(actor)) {
                            actor.movedX += actor.moveX(this.x + this.width - actor.x, () => actor.squish());

                        } else if (riding.includes(actor)) {
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
                        } else if (riding.includes(actor)) {
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
                        } else if (riding.includes(actor)) {
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
                        } else if (riding.includes(actor)) {
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

class Spikes extends Hazard {
    constructor(props) {
        super(props);

    }

}

class Platform extends Solid {
    constructor(x, y, width) {
        super(x, y + U / 2, width, U / 2);
        this.color = "#AB5C1C";
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
        super(x, y, 2 * U, U);
        this.color = "#dedf35";
    }

    interactWith(player) {
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
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
        this.scene.setPlayer(undefined);
        this.targetScene.setPlayer(player);
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
            if (this.movement === undefined &&
                segmentsOverlap(this.x, this.width, player.x, player.width) &&
                this.y + this.height === player.y) {
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
        for (const solid of this.scene.solids) {
            if (this.y === solid.y + solid.height && physics.segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                // player is standing on a solid
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
                    this.speedY = constants.JUMP_SPEED;
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
        if (this.inputs.jumpPressedBuffer && this.timers.jumpGrace > 0) {
            // regular jump
            this.inputs.jumpPressedBuffer = false;
            this.speedX += this.inputs.xAxis * constants.JUMP_HORIZONTAL_BOOST;
            this.speedY = constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            return true;
        } else if (this.inputs.jumpPressedBuffer && (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            this.inputs.jumpPressedBuffer = false;
            let dx = this.hasWallLeft ? 1 : -1;
            this.speedX = dx * constants.WALL_JUMP_HSPEED;
            this.speedY = constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            return true;
        }
        return false;
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
                this.speedY = Math.max(this.speedY - constants.GRAVITY * deltaTime, -constants.CLIMB_SLIP_SPEED);
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

    die() {
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
        this.scrollY = 0;
        this.solids = [];
        this.actors = [];
        this.elements = [];
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
        this.solids.map(x => x.update(deltaTime));
        this.elements.map(x => x.update(deltaTime));
        this.actors.map(x => x.update(deltaTime));
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
                this.scrollY = Math.max(0, this.player.y - .40 * constants.VIEW_HEIGHT);
            }
        }
    }

    draw(ctx) {
        this.solids.map(x => x.draw(ctx));
        this.elements.map(x => x.draw(ctx));
        this.actors.map(x => x.draw(ctx));
    }

    setPlayer(player) {
        if (this.player) {
            this.player.scene = undefined;
            const index = this.actors.indexOf(this.player);
            if (index !== -1) {
                this.actors.splice(index, 1);
            }
        }
        if (player) {
            this.addActor(player);
        }
        this.player = player;
    }

    addActor(actor) {
        this.actors.push(actor);
        actor.scene = this;
    }

    addSolid(solid) {
        this.solids.push(solid);
        solid.scene = this;
    }

    addElement(element) {
        this.elements.push(element);
        element.scene = this;
    }
}


module.exports = {
    Scene,
}

},{"./constants":1,"./physics":6}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNvbnN0YW50cy5qcyIsImlucHV0cy5qcyIsIm1haW4uanMiLCJtYXBzLmpzIiwibW92ZW1lbnQuanMiLCJwaHlzaWNzLmpzIiwicGxheWVyLmpzIiwic2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIEZyb20gQ2VsZXN0ZSBzb3VyY2UgY29kZVxuY29uc3QgTUFYX1JVTl9TUEVFRCA9IDkwO1xuY29uc3QgUlVOX0FDQ0VMRVJBVElPTiA9IDEwMDA7XG5jb25zdCBSVU5fREVDRUxFUkFUSU9OID0gNDAwO1xuY29uc3QgQUlSX0ZBQ1RPUiA9IC42NTtcbmNvbnN0IEpVTVBfU1BFRUQgPSAxMDU7XG5jb25zdCBKVU1QX0hPUklaT05UQUxfQk9PU1QgPSA0MDtcbmNvbnN0IE1BWF9GQUxMX1NQRUVEID0gMTYwO1xuY29uc3QgR1JBVklUWSA9IDkwMDtcbmNvbnN0IEpVTVBfR1JBQ0VfVElNRSA9IC4xO1xuY29uc3QgVkFSX0pVTVBfVElNRSA9IC4yO1xuY29uc3QgQ0xJTUJfU0xJUF9TUEVFRCA9IDMwO1xuY29uc3QgV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFID0gMztcbmNvbnN0IFdBTExfSlVNUF9IU1BFRUQgPSBNQVhfUlVOX1NQRUVEICsgSlVNUF9IT1JJWk9OVEFMX0JPT1NUO1xuY29uc3QgREFTSF9TUEVFRCA9IDI0MDtcbmNvbnN0IEVORF9EQVNIX1NQRUVEID0gMTYwO1xuY29uc3QgRU5EX0RBU0hfVVBfRkFDVE9SID0gLjc1O1xuY29uc3QgREFTSF9USU1FID0gLjE1O1xuY29uc3QgREFTSF9DT09MRE9XTiA9IC4yO1xuXG4vLyBPdGhlciBjb25zdGFudHNcbmNvbnN0IERBU0hfRlJFRVpFX1RJTUUgPSAuMDU7XG5jb25zdCBCT1VOQ0VfVElNRSA9IC4yO1xuY29uc3QgQk9VTkNFX1NQRUVEID0gMTgwO1xuY29uc3QgRFlJTkdfVElNRSA9IC41O1xuY29uc3QgU1RBVEVfTk9STUFMID0gMDtcbmNvbnN0IFNUQVRFX0pVTVAgPSAxO1xuY29uc3QgU1RBVEVfREFTSCA9IDI7XG5jb25zdCBTVEFURV9ERUFEID0gMztcbmNvbnN0IFNUQVRFX0JPVU5DRSA9IDQ7XG5cbmNvbnN0IEdSSURfU0laRSA9IDg7XG5jb25zdCBWSUVXX1dJRFRIID0gMzIwO1xuY29uc3QgVklFV19IRUlHSFQgPSAxODA7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1BWF9SVU5fU1BFRUQsXG4gICAgUlVOX0FDQ0VMRVJBVElPTixcbiAgICBSVU5fREVDRUxFUkFUSU9OLFxuICAgIEFJUl9GQUNUT1IsXG4gICAgSlVNUF9TUEVFRCxcbiAgICBKVU1QX0hPUklaT05UQUxfQk9PU1QsXG4gICAgTUFYX0ZBTExfU1BFRUQsXG4gICAgR1JBVklUWSxcbiAgICBKVU1QX0dSQUNFX1RJTUUsXG4gICAgVkFSX0pVTVBfVElNRSxcbiAgICBDTElNQl9TTElQX1NQRUVELFxuICAgIFdBTExfSlVNUF9DSEVDS19ESVNUQU5DRSxcbiAgICBXQUxMX0pVTVBfSFNQRUVELFxuICAgIERBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfU1BFRUQsXG4gICAgRU5EX0RBU0hfVVBfRkFDVE9SLFxuICAgIERBU0hfVElNRSxcbiAgICBEQVNIX0NPT0xET1dOLFxuICAgIERBU0hfRlJFRVpFX1RJTUUsXG4gICAgQk9VTkNFX1RJTUUsXG4gICAgQk9VTkNFX1NQRUVELFxuICAgIERZSU5HX1RJTUUsXG4gICAgU1RBVEVfTk9STUFMLFxuICAgIFNUQVRFX0pVTVAsXG4gICAgU1RBVEVfREFTSCxcbiAgICBTVEFURV9ERUFELFxuICAgIFNUQVRFX0JPVU5DRSxcbiAgICBHUklEX1NJWkUsXG4gICAgVklFV19XSURUSCxcbiAgICBWSUVXX0hFSUdIVCxcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IEpVTVBfQlVGRkVSX1RJTUUgPSAuMTtcbmNvbnN0IERBU0hfQlVGRkVSX1RJTUUgPSAuMTtcbmxldCBwcmVzc2VkS2V5cyA9IG5ldyBTZXQoKTtcblxuXG5jbGFzcyBQbGF5ZXJJbnB1dHMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnhBeGlzID0gMDtcbiAgICAgICAgdGhpcy55QXhpcyA9IDA7XG4gICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5qdW1wSGVsZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmtleW1hcCA9IHtcbiAgICAgICAgICAgIHJpZ2h0OiAnQXJyb3dSaWdodCcsXG4gICAgICAgICAgICBsZWZ0OiAnQXJyb3dMZWZ0JyxcbiAgICAgICAgICAgIHVwOiAnQXJyb3dVcCcsXG4gICAgICAgICAgICBkb3duOiAnQXJyb3dEb3duJyxcbiAgICAgICAgICAgIGp1bXA6ICdnJyxcbiAgICAgICAgICAgIGRhc2g6ICdmJyxcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpbWVycyA9IHtcbiAgICAgICAgICAgIGp1bXBCdWZmZXI6IDAsXG4gICAgICAgICAgICBkYXNoQnVmZmVyOiAwLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSAtPSBkZWx0YVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54QXhpcyA9IDA7XG4gICAgICAgIHRoaXMueUF4aXMgPSAwO1xuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwWydsZWZ0J10pKSB7XG4gICAgICAgICAgICB0aGlzLnhBeGlzIC09IDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByZXNzZWRLZXlzLmhhcyh0aGlzLmtleW1hcFsncmlnaHQnXSkpIHtcbiAgICAgICAgICAgIHRoaXMueEF4aXMgKz0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJlc3NlZEtleXMuaGFzKHRoaXMua2V5bWFwWyd1cCddKSkge1xuICAgICAgICAgICAgdGhpcy55QXhpcyArPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2Rvd24nXSkpIHtcbiAgICAgICAgICAgIHRoaXMueUF4aXMgLT0gMTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmV2SnVtcCA9IHRoaXMuanVtcEhlbGQ7XG4gICAgICAgIHRoaXMuanVtcEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2p1bXAnXSk7XG4gICAgICAgIGlmICghcHJldkp1bXAgJiYgdGhpcy5qdW1wSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA9IEpVTVBfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmp1bXBQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuanVtcFByZXNzZWRCdWZmZXIgJj0gdGhpcy50aW1lcnMuanVtcEJ1ZmZlciA+IDA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmV2RGFzaCA9IHRoaXMuZGFzaEhlbGQ7XG4gICAgICAgIHRoaXMuZGFzaEhlbGQgPSBwcmVzc2VkS2V5cy5oYXModGhpcy5rZXltYXBbJ2Rhc2gnXSk7XG4gICAgICAgIGlmICghcHJldkRhc2ggJiYgdGhpcy5kYXNoSGVsZCkge1xuICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA9IERBU0hfQlVGRkVSX1RJTUU7XG4gICAgICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhc2hQcmVzc2VkQnVmZmVyID0gdGhpcy5kYXNoUHJlc3NlZEJ1ZmZlciAmJiAodGhpcy50aW1lcnMuZGFzaEJ1ZmZlciA+IDApO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBQbGF5ZXJJbnB1dHMsXG4gICAgcHJlc3NlZEtleXMsXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBtYXBzID0gcmVxdWlyZSgnLi9tYXBzJyk7XG5jb25zdCBpbnB1dHMgPSByZXF1aXJlKCcuL2lucHV0cycpO1xuY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXInKTtcblxuY29uc3QgU0NBTElORyA9IDI7XG5sZXQgU0xPV0RPV05fRkFDVE9SID0gMTtcbmNvbnN0IEZJWEVEX0RFTFRBX1RJTUUgPSB0cnVlO1xuY29uc3QgRlJBTUVfUkFURSA9IDYwO1xuXG5sZXQgY29udGV4dDtcbmxldCBjdXJyZW50U2NlbmU7XG5sZXQgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XG5sZXQgaXNSdW5uaW5nID0gZmFsc2U7XG5sZXQgZnJhbWVDb3VudGVyID0gMDtcbmxldCBmcmFtZVJhdGVSZWZyZXNoID0gNTtcbmxldCBmcmFtZVJhdGVTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xubGV0IHNsb3dkb3duQ291bnRlciA9IDA7XG5cblxuZnVuY3Rpb24gc2xvd2Rvd24oZmFjdG9yKSB7XG4gICAgU0xPV0RPV05fRkFDVE9SID0gZmFjdG9yO1xuICAgIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpIC8gKFNMT1dET1dOX0ZBQ1RPUiAqIDEwMDApO1xufVxuXG5cbmZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIGlzUnVubmluZyA9IHRydWU7XG4gICAgdXBkYXRlKCk7XG59XG5cblxuZnVuY3Rpb24gc3RvcCgpIHtcbiAgICBpc1J1bm5pbmcgPSBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgY29uc3QgdGltZU5vdyA9IERhdGUubm93KCk7XG5cbiAgICBpZiAoaXNSdW5uaW5nKSB7XG4gICAgICAgIHNsb3dkb3duQ291bnRlciArPSAxO1xuICAgICAgICBpZiAoc2xvd2Rvd25Db3VudGVyID49IFNMT1dET1dOX0ZBQ1RPUikge1xuICAgICAgICAgICAgc2xvd2Rvd25Db3VudGVyIC09IFNMT1dET1dOX0ZBQ1RPUjtcbiAgICAgICAgICAgIGZyYW1lQ291bnRlciArPSAxO1xuXG4gICAgICAgICAgICBpZiAodGltZU5vdyAtIGZyYW1lUmF0ZVN0YXJ0VGltZSA+PSAxMDAwICogZnJhbWVSYXRlUmVmcmVzaCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke2ZyYW1lQ291bnRlciAvIGZyYW1lUmF0ZVJlZnJlc2h9IEZQU2ApO1xuICAgICAgICAgICAgICAgIGZyYW1lQ291bnRlciA9IDA7XG4gICAgICAgICAgICAgICAgZnJhbWVSYXRlU3RhcnRUaW1lID0gdGltZU5vdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRlbHRhVGltZSA9IEZJWEVEX0RFTFRBX1RJTUUgP1xuICAgICAgICAgICAgICAgIDEgLyBGUkFNRV9SQVRFIDpcbiAgICAgICAgICAgICAgICBNYXRoLm1pbigodGltZU5vdyAtIGxhc3RVcGRhdGUpIC8gKDEwMDAgKiBTTE9XRE9XTl9GQUNUT1IpLCAuMDUpO1xuXG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICcjMjIxZTMxJzsgIC8vIGJhY2tncm91bmQgY29sb3JcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRILCBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKTtcbiAgICAgICAgICAgIGN1cnJlbnRTY2VuZS51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgIC8vIFRyYW5zaXRpb24gZnJvbSBvbmUgcm9vbSB0byBhbm90aGVyXG4gICAgICAgICAgICBpZiAoY3VycmVudFNjZW5lLnRyYW5zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmV2U2NlbmUgPSBjdXJyZW50U2NlbmU7XG4gICAgICAgICAgICAgICAgY3VycmVudFNjZW5lID0gY3VycmVudFNjZW5lLnRyYW5zaXRpb24udGFyZ2V0U2NlbmU7XG4gICAgICAgICAgICAgICAgcHJldlNjZW5lLnRyYW5zaXRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50U2NlbmUuZHJhdyhjb250ZXh0KTtcbiAgICAgICAgICAgIGxhc3RVcGRhdGUgPSB0aW1lTm93O1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGUpO1xuICAgIH1cbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmFkZChlLmtleSk7XG4gICAgICAgIHN3aXRjaCAoZS5rZXkpIHtcbiAgICAgICAgICAgIGNhc2UgJzwnOlxuICAgICAgICAgICAgICAgIGlmIChTTE9XRE9XTl9GQUNUT1IgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oOCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2xvd2Rvd24oMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHtcbiAgICAgICAgaW5wdXRzLnByZXNzZWRLZXlzLmRlbGV0ZShlLmtleSk7XG4gICAgfSk7XG4gICAgY29uc3Qgc2NyZWVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dhbWUtc2NyZWVuJyk7XG4gICAgc2NyZWVuLnN0eWxlLndpZHRoID0gYCR7Y29uc3RhbnRzLlZJRVdfV0lEVEggKiBTQ0FMSU5HfXB4YDtcbiAgICBzY3JlZW4uc3R5bGUuaGVpZ2h0ID0gYCR7Y29uc3RhbnRzLlZJRVdfSEVJR0hUICogU0NBTElOR31weGA7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYXllcjFcIik7XG4gICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgY2FudmFzLndpZHRoID0gU0NBTElORyAqIGNvbnN0YW50cy5WSUVXX1dJRFRIO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBTQ0FMSU5HICogY29uc3RhbnRzLlZJRVdfSEVJR0hUO1xuICAgIGNvbnRleHQuc2NhbGUoU0NBTElORywgLVNDQUxJTkcpO1xuICAgIGNvbnRleHQudHJhbnNsYXRlKDAsIC1jb25zdGFudHMuVklFV19IRUlHSFQpO1xuXG4gICAgY3VycmVudFNjZW5lID0gbWFwcy5DRUxFU1RFXzAxO1xuICAgIGN1cnJlbnRTY2VuZS5zZXRQbGF5ZXIobmV3IHBsYXllci5QbGF5ZXIoY3VycmVudFNjZW5lLnN0YXJ0UG9zaXRpb25YLCBjdXJyZW50U2NlbmUuc3RhcnRQb3NpdGlvblkpKTtcbiAgICBzdGFydCgpO1xufTsiLCJcInVzZSBzdHJpY3RcIlxuY29uc3Qgc2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lJyk7XG5jb25zdCBtb3ZlbWVudCA9IHJlcXVpcmUoJy4vbW92ZW1lbnQnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG5mdW5jdGlvbiBtYWtlVHJhbnNpdGlvblVwKHNjZW5lMSwgeDEsIHkxLCBzY2VuZTIsIHgyLCB5Miwgd2lkdGgpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MSAqIFUsICh5MSArIDEpICogVSwgd2lkdGggKiBVLCAwLCBzY2VuZTIsIHgyICogVSAsICh5MiArIDMpICogVVxuICAgICkpXG4gICAgc2NlbmUyLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuVHJhbnNpdGlvbihcbiAgICAgICAgeDIgKiBVLCAoeTIgLSAxKSAqIFUsIHdpZHRoICogVSwgMCwgc2NlbmUxLCB4MSAqIFUsICh5MSAtIDMpICogVVxuICAgICkpXG59XG5cbmZ1bmN0aW9uIG1ha2VUcmFuc2l0aW9uUmlnaHQoc2NlbmUxLCB4MSwgeTEsIHNjZW5lMiwgeDIsIHkyLCBoZWlnaHQpIHtcbiAgICBzY2VuZTEuYWRkRWxlbWVudChuZXcgcGh5c2ljcy5UcmFuc2l0aW9uKFxuICAgICAgICB4MSAqIFUsIHkxICogVSwgMCwgaGVpZ2h0ICogVSwgc2NlbmUyLCAoeDIgKyAxKSAqIFUgLCB5MiAqIFVcbiAgICApKVxuICAgIHNjZW5lMi5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlRyYW5zaXRpb24oXG4gICAgICAgIHgyICogVSwgeTIgKiBVLCAwLCBoZWlnaHQgKiBVLCBzY2VuZTEsICh4MSAtIDEpICogVSwgeTEgKiBVXG4gICAgKSlcbn1cblxuXG5jb25zdCBDRUxFU1RFXzAxID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgIHh4eHhcbnh4ICB4IHh4eCAgICB4eHh4eHh4eHggICAgICAgICAgICAgIHh4eHhcbnh4ICB4ICAgeCAgICB4eHh4eCAgIHggICAgICAgICAgICAgeHh4eHhcbnh4ICB4eHggeCAgICB4eHggICAgIHggICAgICAgICAgICAgeHh4eHhcbnh4ICB4ICAgeCAgICB4eHggICAgICAgICAgICAgICAgICB4eHh4eHhcbnh4ICB4ICAgeCAgICB4eHggICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICB4eHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHhcbnggICAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICF4eHh4eHhcbnggICAgICAgICAgICAgICAgIHggIHggICAgICAgICAgICF4eHh4eHhcbnggICAgICAgICAgICAgICAgIHggIHggICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgIHh4eHghISEhICAgICAgICAgIHh4eHhcbnggICAgICAgICB4eHggICAgIHh4eHh4eHh4ICAgICAgICAgICB4eHhcbnggIFAgICAgICB4eHggICAgIHh4eHh4eHh4ICAgICAgICAgICB4eHhcbnh4eHh4ICAgICB4eHghISEhIXh4eHh4eHh4ICAgICAgICAgICAgeHhcbnh4eHh4ICAgICB4eHh4eHh4eHh4eHh4eHh4ISEhICAgICAgICAgIHhcbnh4eHh4ISEhISF4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgIHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgIHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgIHhgKTtcblxuXG5jb25zdCBDRUxFU1RFXzAyID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHhcbnh4eCAgICAgeHggICAgeCB4eHh4eHh4eHh4eHh4eHh4eHggICAgeHhcbnh4eCAgICAgeHggICAgeCAgICAgeHh4eHggIHh4eHh4eHggICAgeHhcbnh4eHh4eHh4eHggICAgeCAgICAgeHh4eHggICAgeHh4eHggICAgeHhcbnh4eCAgICAgeCAgICAgeCAgICAgeHh4eHggICAgeHh4eHggICAgeHhcbnh4eHh4eHh4eCAgUyAgICAgICAgIHh4eHggICAgeHh4eHggICAgeHhcbnh4eCAgICAgeCAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbnh4eHh4eHh4eCAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICAgICAgeHggICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgISEhISEgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgeHh4eHh4eHhcbnggICAgICAgICAgICAgICAgICAgeHh4eCAgICAgICAgeHh4eHh4eHhcbnggICAgICAgICAgICAgQiAgICAgIHh4eCAgICAgICAgeHh4eHh4eHhcbnggICAgICAgICAgICAgeHggICAgIHh4eCAgICB4eHh4eHh4eHh4eHhcbnggIFAgICAgICAgICAgeHggICAgIHh4eCEhICB4eHh4eHh4eHh4eHhcbngtLS0tLXh4eHh4eHh4eHggICAgIHh4eHh4ISF4eHh4eHh4eHh4eHhcbnggICAgIHh4eHh4eCAgeHggICAgIHh4eHh4eHh4eHh4eHh4eHh4eHhcbnggICAgIHh4eHh4eCAgeHggICAgIHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzAxLCAzMSwgMjMsIENFTEVTVEVfMDIsIDEsIDAsIDUpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDMgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4ICAgIHh4eFxueHh4eHh4ICAgICAgICAgeHh4eHh4eHh4eHh4ICAgIHh4ICAgIHh4eFxueHh4eHh4ICAgICAgICAgeHggICAgICAgICB4ICAgICB4ICAgIHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICB4ICAgICAgICAgIHh4eFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eFxueCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgeHh4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgIHh4eCAgICB4eFxueCAgICAgICAgICB4ICAgICAgICAgICAgICAgICAgIHh4ICAgICB4eFxueCAgICAgICAgICB4ICAgIHggICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICB4ICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAgICAgICAgICAgICAgeFxueCAgICAgICAgICAgICAgIHh4eHggICAgICAhISEgICAgICBTICAgeFxueCAgICAgICAgICAgICAgICAgeHggICAgICB4eHghISEhISAgICAgeFxueCAgICAgICAgICAgICAgICAgeHggICAgICB4eHh4eHh4eCAgICAheFxueHggICAgICAgICAgICAgICAgIHggICAhISF4eHh4eHh4eCEhISF4eFxueHggIFAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHgtLS0teHh4ICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eFxueHggICAgeHh4ICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eGApO1xuXG5tYWtlVHJhbnNpdGlvblVwKENFTEVTVEVfMDIsIDM0LCAyMywgQ0VMRVNURV8wMywgMiwgMCwgNCk7XG5cblxuY29uc3QgQ0VMRVNURV8wNCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4XG54eHh4eHh4eHh4eHggICAgICB4eHggICAgeHh4eHh4eHh4eCB4eHh4XG54eHh4eHggICAgICAgICAgICB4eHggICAgICB4eHh4eCAgICB4eHh4XG54eHh4eCAgICAgICAgICAgICB4eHggICAgICAheHh4eCAgICB4eHh4XG54eHggICAgICAgICAgICAgICAgIHggICAgICAheHh4eCAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgIHggICAgICAheHh4eCAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAheHggICAgICAgIHh4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4LS0gICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4ICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgIHh4ICAgICAgICAgICAgICAgICAgIHggICAgICAgIHh4XG54eHggICAgICF4ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4XG54eHggICAgICF4ISEgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICF4eHggICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICF4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eCEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggIFAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHgtLS0teHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4XG54eHggICAgeHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICB4YCk7XG5cbkNFTEVTVEVfMDQuYWRkU29saWQobmV3IHBoeXNpY3MuVHJpZ2dlckJsb2NrKDE0ICogVSwgMTEgKiBVLCAzICogVSwgMiAqIFUsIG5ldyBtb3ZlbWVudC5TZXF1ZW5jZU1vdmVtZW50KFtcbiAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMC41KSxcbiAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoMTQgKiBVLCAxMSAqIFUsIDIzICogVSwgMTIgKiBVLCAuNSksXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMyAqIFUsIDEyICogVSwgMTQgKiBVLCAxMSAqIFUsIDEpLFxuXSkpKTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wMywgMzMsIDIzLCBDRUxFU1RFXzA0LCAzLCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA1ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHhcbnh4eHh4eCAgICAgICAgICAgICB4eHggICAgeHh4eHh4eHh4eHh4eHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgIHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgIHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgUyAgICB4eHh4eHh4ICAgIHh4eCAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgICAgIHhcbnh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgeHggICB4eHggICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICB4eHggIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhcbnggIHggICAgICAgICAgeHggICAgICAgICAgICAgeHh4ICAgICAgIHhcbnh4eHggIFAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgIHhcbnh4eHgtLS0teHh4eHh4eHh4eHh4eHh4eHh4ICAgICAgICAgICAgIHhcbnh4eHggICAgeHh4eHh4ICB4eHh4eHh4eHh4ICAgICAgICAgICAgIHhgKTtcblxubWFrZVRyYW5zaXRpb25VcChDRUxFU1RFXzA0LCAyMSwgMjMsIENFTEVTVEVfMDUsIDQsIDAsIDQpO1xuXG5cbmNvbnN0IENFTEVTVEVfMDYgPSBzY2VuZS5TY2VuZS5mcm9tU3RyaW5nKGBcXFxueHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHh4eHh4eHggICB4eFxueHggUyAgICAgICAgICB4eHggICAgeHh4eHh4eHh4eHh4eHggICB4eFxueHggICAgICAgICAgICAgICAgICAgeHh4eHh4eHh4eHghIHggICB4eFxueHh4ICAgICAgICAgICAgICAgICAgIHh4ICB4eHh4eHghICAgICAgeFxueHh4ICAgICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueHh4eHggICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueHggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHghICAgICAgeFxueCAgICAgISEhICAgICAgICAgICAgICAgICAgICAgeHghICAgICAgeFxueCAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgeFxueCAgICAgeHh4ICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgeFxueCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgIHh4ICAgICAgICAgICAgICAgICAgICAgIHh4ICAgICAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQiAgeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggeFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgeHh4eFxueCAgICAgICAgICAgICAgICAgICAgICAgeHh4ICAgICAgICAgeHh4eFxueCEgICAgICAgICAgICAgICAgICAgISEheHh4ICAgICAgICAgeHh4eFxueHggICAgISEhICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgIHh4eFxueHggICAgeHh4ICAgICAgICAgICAgeHh4eHh4ICAgICAgICAgIHh4eFxueHh4eHh4eHh4ISEhISAgICAhISEheHh4eHh4ICAgICAgICAgIHh4eFxueHh4eHh4eHh4eHh4eCAgICB4eHh4eHh4eHh4eCAgICAgICAgIHh4eFxueHh4eHh4eHh4eHh4eCAgICB4eHh4eCAgeHh4eCAgICAgICAgICB4eFxueHh4eHh4eCAgICAgICAgICAgIHh4ICAgeHh4ICAgICAgICAgICB4eFxueHh4eHh4ICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICB4eFxueHh4ICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICB4eFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgIFxueHggICBQICAgICB4eCAgICB4eHggICAgIHh4eCAgICAgICAgICAgIFxueHh4LS0tLXh4eHh4eCAgICB4eHghISEhIXh4eCAgICAgICAgLS0teFxueHh4ICAgIHh4eHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgICAgeGApO1xuXG5DRUxFU1RFXzA2LmFkZFNvbGlkKG5ldyBwaHlzaWNzLlRyaWdnZXJCbG9jaygxMyAqIFUsIFUsIDQgKiBVLCAyICogVSwgbmV3IG1vdmVtZW50LlNlcXVlbmNlTW92ZW1lbnQoW1xuICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgwLjUpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIFUsIDEzICogVSwgOSAqIFUsIC4yNSksXG4gICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEpLFxuICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMyAqIFUsIDkgKiBVLCAxMyAqIFUsIFUsIDEpLFxuXSkpKTtcbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wNSwgMjIsIDIzLCBDRUxFU1RFXzA2LCAzLCAwLCA0KTtcblxuXG5jb25zdCBDRUxFU1RFXzA3ID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICAgICAgIHh4eHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgIHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgICAgICAgIHh4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgISAgICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCAgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eCEgICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeCAgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeEIgICAgICAgeHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAgeHh4LS0gICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICAheHh4ICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4ICAgICB4eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eC0tLS14eHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eCAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHghICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHggICAgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHghISEgICAgIHh4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICB4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICB4ISAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4ICB4eHh4eHggICAgICAgICAgIHh4eHh4eHh4eHhcbnh4eHh4eHh4eHggICB4eHh4eHh4eHggICAgICAgICAgICAgICAgeHhcbnh4eHh4eHh4eHggICAgICB4eHh4eHggICAgICAgICAgICAgICAgeHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHggICAgICAgICAgICAgICAgIHhcbnh4eHh4eHh4eCAgICAgICAgICAgeHh4LS0teHh4eC0tLS0gICAgICBcbnh4eHh4eHh4eCAgICAgICAgUyAgICAgICAgeHh4ICAgICAgICAgICBcbnh4eHh4eHh4eCAgICAgICAgICAgICAgICAgeHh4ICAgICAgICBQICBcbnh4eHh4eHh4eCAgICAgICAgIHh4eHh4eHh4eHh4ICAgIHh4eHh4eHhcbnh4eHh4eHh4eCEhISEhISF4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHggIHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxubWFrZVRyYW5zaXRpb25SaWdodChDRUxFU1RFXzA3LCA0MCwgMywgQ0VMRVNURV8wNiwgMCwgMywgMyk7XG5cblxuY29uc3QgQ0VMRVNURV8wOCA9IHNjZW5lLlNjZW5lLmZyb21TdHJpbmcoYFxcXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICAgICAhISEhICAgICAgICAgICAgXG54eHggICAgICAgICAgICAgICAgICEhISF4eHh4ICAgICAgICAgICAgXG54eHh4eCAgICAgISEhISEhICAgIHh4eHh4eHh4ICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHh4eHh4eCAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHh4ICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4IFMgIHggICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgeHh4eHh4ICAgIHggICAgICAgICAgICAgICAgIHh4XG54eHh4eHggICAgeHh4eHh4ICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54eHh4IHggICAgeHh4eHh4ICAgICAgICAgICAtLXh4eHh4eHh4eHh4XG54eCAgIHggICAgeHh4eHggICAgICAgICAgICAgIHh4eHh4eHh4eHh4XG54eCAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgICAgICAgIHh4eHh4eHh4XG54ICAgICAgICAgeHh4eCAgICAgICAgICAgIC0tLS0teHh4eHh4eHh4XG54ICAgICAgIHh4eHh4eCAgICAgICAgICAgICAgICAgeHh4eHh4eHh4XG54ICAgICAgIHh4eHh4eCAgICAgICAgICAgICAgeHh4eHh4eHh4eHh4XG54IFAgICAgIHh4eHh4eCEhICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4XG54LS0teHh4eHh4eHh4eHh4ISEhISEheHh4eHh4eHh4eHh4eHh4eHh4XG54ICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4YCk7XG5cbm1ha2VUcmFuc2l0aW9uVXAoQ0VMRVNURV8wNiwgMzUsIDM2LCBDRUxFU1RFXzA4LCAxLCAwLCAzKTtcblxuXG5jb25zdCBURVNUX0xFVkVMID0gc2NlbmUuU2NlbmUuZnJvbVN0cmluZyhgXFxcbnh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHh4eHh4eHh4eHggICAgICAgICAgICAgICB4eHh4eHhcbnh4eHh4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICB4eCAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHggICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgICAgICAgICAgICAgICAgICB4eHh4ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eCAgICAgICAgICB4eHh4ICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eHh4ICAgICAgeHh4eCAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnggICAgICAgICAgeHh4eHh4eHh4eHh4eHh4eHh4eCAgICAgICAgeHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnghISAgICAgICAgeHh4eHh4eHh4ICAgICAgIHh4eCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHh4eHhcbnh4eCEheHggICAgeHh4eHh4eHh4ICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgICAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgeCAgIHggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eHh4eHggICAgICAgICAgICAgICAgeCAgICAgICAgICAgISEheHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgICAgICAgeCAgICAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgICAgeHhcbnh4eCAgICAgICAgICAgICAgUCAgICAgeCAgICAgICAgICAheHh4eHggICAgICAgICAgICAgICAgICAgICAgICAgeHh4eHhcbnh4eCAgICAgICAgICAgIHh4eHggICAgeCAgICAgICAgICAheHh4eHghISEhISEhISEhICAgICAgICEhISEhISEheHh4eHhcbnh4eCAgICAgICAgICAgIXh4eHggICAgeHh4eCAgICAgICAheHh4eHh4eHh4eHh4eHghISEhISEhISF4eHh4eHh4eHh4eHhcbnh4eHh4eHh4ISEhISEhIXh4eHggICAgeHh4eCEhISEhISEheHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhcbnh4eHh4eHh4eHh4eHh4eHh4eHggICAgeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHhgKTtcblxuVEVTVF9MRVZFTC5hZGRFbGVtZW50KFxuICAgIG5ldyBwaHlzaWNzLkhhemFyZCg3ICogVSwgMjAgKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCg3ICogVSwgMjAgKiBVLCA3ICogVSwgMiAqIFUsIDEpLFxuICAgICAgICAgICAgbmV3IG1vdmVtZW50Lk1vdmVtZW50KDEuNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTGluZWFyTW92ZW1lbnQoNyAqIFUsIDIgKiBVLCA3ICogVSwgMjAgKiBVLCAxKSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZEVsZW1lbnQoXG4gICAgbmV3IHBoeXNpY3MuSGF6YXJkKDExICogVSwgMjAgKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMSAqIFUsIDIwICogVSwgMTEgKiBVLCAxNCAqIFUsIC4yNSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxMSAqIFUsIDE0ICogVSwgMTEgKiBVLCAyMCAqIFUsIC4yNSksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRFbGVtZW50KFxuICAgIG5ldyBwaHlzaWNzLkhhemFyZCgxICogVSwgMTggKiBVLCAyICogVSwgMiAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgxICogVSwgMTggKiBVLCAyMCAqIFUsIDE4ICogVSwgMSksXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuTW92ZW1lbnQoMS41KSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5MaW5lYXJNb3ZlbWVudCgyMCAqIFUsIDE4ICogVSwgMSAqIFUsIDE4ICogVSwgMSksXG4gICAgICAgIF0sIC0xKSkpO1xuVEVTVF9MRVZFTC5hZGRTb2xpZChcbiAgICBuZXcgcGh5c2ljcy5Tb2xpZCgwLCAwLCAzICogVSwgMSAqIFUpXG4gICAgICAgIC5zZXRNb3ZlbWVudChuZXcgbW92ZW1lbnQuU2VxdWVuY2VNb3ZlbWVudChbXG4gICAgICAgICAgICBuZXcgbW92ZW1lbnQuU2luZU1vdmVtZW50KDUyICogVSwgNiAqIFUsIDUyICogVSwgMTQgKiBVLCAyLCAzKSxcbiAgICAgICAgICAgIG5ldyBtb3ZlbWVudC5Nb3ZlbWVudCgyKSxcbiAgICAgICAgXSwgLTEpKSk7XG5URVNUX0xFVkVMLmFkZFNvbGlkKFxuICAgIG5ldyBwaHlzaWNzLlNvbGlkKDAsIDAsIDMgKiBVLCAxICogVSlcbiAgICAgICAgLnNldE1vdmVtZW50KG5ldyBtb3ZlbWVudC5TaW5lTW92ZW1lbnQoNTUgKiBVLCAxNiAqIFUsIDYwICogVSwgMTYgKiBVLCAyLCAtMSkpKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBDRUxFU1RFXzAxLFxuICAgIENFTEVTVEVfMDIsXG4gICAgQ0VMRVNURV8wMyxcbiAgICBDRUxFU1RFXzA0LFxuICAgIENFTEVTVEVfMDUsXG4gICAgQ0VMRVNURV8wNixcbiAgICBDRUxFU1RFXzA3LFxuICAgIENFTEVTVEVfMDgsXG4gICAgVEVTVF9MRVZFTCxcbn0iLCJcInVzZSBzdHJpY3RcIjtcblxuXG5jbGFzcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IoZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgICAgIHRoaXMudGltZXIgPSAwO1xuICAgICAgICB0aGlzLmNvdW50ID0gY291bnQ7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSBjb3VudDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICB0aGlzLnRpbWVyICs9IGRlbHRhVGltZTtcbiAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gJiYgdGhpcy5yZW1haW5pbmdDb3VudCAmJiB0aGlzLnRpbWVyID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5yZW1haW5pbmdDb3VudCAtPSAxO1xuICAgICAgICAgICAgaWYgKHRoaXMucmVtYWluaW5nQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMuZHVyYXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXNldCgpIHtcbiAgICAgICAgdGhpcy50aW1lciA9IDA7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgPSB0aGlzLmNvdW50O1xuICAgIH1cbn1cblxuXG5jbGFzcyBMaW5lYXJNb3ZlbWVudCBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSwgdGhpbmcpO1xuICAgICAgICBpZiAodGhpcy50aW1lciA8IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLnRpbWVyIC8gdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbygoMSAtIHIpICogdGhpcy54MSArIHIgKiB0aGlzLngyLCAoMSAtIHIpICogdGhpcy55MSArIHIgKiB0aGlzLnkyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGluZy54ID0gdGhpcy54MiwgdGhpbmcueSA9IHRoaXMueTIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5cbmNsYXNzIFNlcXVlbmNlTW92ZW1lbnQgZXh0ZW5kcyBNb3ZlbWVudCB7XG4gICAgY29uc3RydWN0b3IobW92ZW1lbnRzLCBjb3VudCA9IDEpIHtcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCBjb3VudCk7XG4gICAgICAgIHRoaXMubW92ZW1lbnRzID0gbW92ZW1lbnRzO1xuICAgICAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIHdoaWxlICh0aGlzLnJlbWFpbmluZ0NvdW50ICYmIGRlbHRhVGltZSA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnVwZGF0ZShkZWx0YVRpbWUsIHRoaW5nKTtcbiAgICAgICAgICAgIGRlbHRhVGltZSA9IHRoaXMubW92ZW1lbnRzW3RoaXMuaW5kZXhdLnRpbWVyIC0gdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0uZHVyYXRpb247XG4gICAgICAgICAgICBpZiAoZGVsdGFUaW1lID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pbmRleCA+PSB0aGlzLm1vdmVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtYWluaW5nQ291bnQgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlbWVudHNbdGhpcy5pbmRleF0ucmVzZXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5jbGFzcyBTaW5lTW92ZW1lbnRcbiAgICBleHRlbmRzIE1vdmVtZW50IHtcbiAgICBjb25zdHJ1Y3Rvcih4MSwgeTEsIHgyLCB5MiwgZHVyYXRpb24sIGNvdW50ID0gMSkge1xuICAgICAgICBzdXBlcihkdXJhdGlvbiwgY291bnQpO1xuICAgICAgICB0aGlzLngxID0geDE7XG4gICAgICAgIHRoaXMueTEgPSB5MTtcbiAgICAgICAgdGhpcy54MiA9IHgyO1xuICAgICAgICB0aGlzLnkyID0geTI7XG4gICAgICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lLCB0aGluZykge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lLCB0aGluZyk7XG4gICAgICAgIGlmICh0aGlzLnRpbWVyIDwgdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSB0aGlzLnRpbWVyICogMiAqIE1hdGguUEkgLyB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgcmF0aW8gPSAoTWF0aC5jb3MoYW5nbGUpICsgMSkgLyAyO1xuICAgICAgICAgICAgdGhpbmcubW92ZVRvKHJhdGlvICogdGhpcy54MSArICgxIC0gcmF0aW8pICogdGhpcy54MiwgcmF0aW8gKiB0aGlzLnkxICsgKDEgLSByYXRpbykgKiB0aGlzLnkyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaW5nLm1vdmVUbyh0aGlzLngxLCB0aGlzLnkxKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNb3ZlbWVudCxcbiAgICBMaW5lYXJNb3ZlbWVudCxcbiAgICBTZXF1ZW5jZU1vdmVtZW50LFxuICAgIFNpbmVNb3ZlbWVudCxcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdHdvIHNlZ21lbnRzIG9uIGEgMUQgbGluZSBvdmVybGFwLlxuICogVGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSBpZiB0aGUgaW50ZXJzZWN0aW9uIG9mIGJvdGggc2VnbWVudHMgaXMgb2Ygbm9uLXplcm8gbWVhc3VyZSAoaWYgdGhlIGVuZCBvZiBvbmUgc2VnbWVudFxuICogY29pbmNpZGVzIHdpdGggdGhlIHN0YXJ0IG9mIHRoZSBuZXh0LCB0aGV5IGFyZSBub3QgY29uc2lkZXJlZCBhcyBvdmVybGFwcGluZylcbiAqXG4gKiBAcGFyYW0gc3RhcnQxIHtudW1iZXJ9IGNvb3JkaW5hdGUgb2YgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTEge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEBwYXJhbSBzdGFydDIge251bWJlcn0gY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIHNlY29uZCBzZWdtZW50XG4gKiBAcGFyYW0gc2l6ZTIge251bWJlcn0gd2lkdGggb2YgdGhlIGZpcnN0IHNlZ21lbnRcbiAqIEByZXR1cm5zIHtib29sZWFufSB3aGV0aGVyIHRoZSB0d28gc2VnbWVudHMgb3ZlcmxhcFxuICovXG5mdW5jdGlvbiBzZWdtZW50c092ZXJsYXAoc3RhcnQxLCBzaXplMSwgc3RhcnQyLCBzaXplMikge1xuICAgIHJldHVybiBzdGFydDEgPCBzdGFydDIgKyBzaXplMiAmJiBzdGFydDIgPCBzdGFydDEgKyBzaXplMTtcbn1cblxuXG4vKipcbiAqIFRoaW5ncyBhcmUgdGhlIHN1cGVyY2xhc3Mgb2YgYWxsIG9iamVjdHMgdGhhdCBpbnRlcmFjdCBpbiB0aGUgcGh5c2ljcyBtb2RlbCAob2JzdGFjbGVzLCBwbGF0Zm9ybXMsIHBsYXllcnMsIGhhemFyZHMsXG4gKiBldGMuKVxuICogQWxsIHRoaW5ncyBhcmUgcmVwcmVzZW50ZWQgYXMgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveGVzIGFuZCB0aGUgc3BhY2UgdGhleSBvY2N1cHkgaW4gYSBzY2VuZSBpcyB0aGVyZWZvcmUgZGVmaW5lZFxuICogYXMgYSBwb3NpdGlvbiAoeCwgeSkgYW5kIGEgc2l6ZSAod2lkdGgsIGhlaWdodCkuIEF0IGFsbCB0aW1lcywgcG9zaXRpb25zIGFuZCBzaXplcyBzaG91bGQgYmUgaW50ZWdlcnMuIFN1Yi1pbnRlZ2VyXG4gKiBwb3NpdGlvbnMgYXJlIGNvbnNpZGVyZWQgd2l0aCB0aGUgdXNlIG9mIHRoZSBgeFJlbWFpbmRlcmAgYW5kIGB5UmVtYWluZGVyYCBhdHRyaWJ1dGVzICh0aGF0IHNob3VsZCBoYXZlIGFuIGFic29sdXRlXG4gKiB2YWx1ZSA8IDEpXG4gKi9cbmNsYXNzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciA9IDA7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnIzAwMDAwMCc7XG4gICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuc2NlbmUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudGltZXJzID0ge307XG4gICAgfVxuXG4gICAgb3ZlcmxhcHMob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzLnggKyB0aGlzLndpZHRoID4gb3RoZXIueCAmJlxuICAgICAgICAgICAgb3RoZXIueCArIG90aGVyLndpZHRoID4gdGhpcy54ICYmXG4gICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA+IG90aGVyLnkgJiZcbiAgICAgICAgICAgIG90aGVyLnkgKyBvdGhlci5oZWlnaHQgPiB0aGlzLnkpO1xuICAgIH1cblxuICAgIGRyYXcoY3R4KSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xuICAgICAgICBjdHguZmlsbFJlY3QodGhpcy54IC0gdGhpcy5zY2VuZS5zY3JvbGxYLCB0aGlzLnkgLSB0aGlzLnNjZW5lLnNjcm9sbFksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIGZvciAoY29uc3QgdCBpbiB0aGlzLnRpbWVycykge1xuICAgICAgICAgICAgdGhpcy50aW1lcnNbdF0gLT0gZGVsdGFUaW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm1vdmVtZW50KSB7XG4gICAgICAgICAgICB0aGlzLm1vdmVtZW50LnVwZGF0ZShkZWx0YVRpbWUsIHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbW92ZShkeCwgZHkpIHtcbiAgICB9XG5cbiAgICBtb3ZlVG8oeCwgeSkge1xuICAgICAgICB0aGlzLm1vdmUoeCAtIHRoaXMueCAtIHRoaXMueFJlbWFpbmRlciwgeSAtIHRoaXMueSAtIHRoaXMueVJlbWFpbmRlcik7XG4gICAgfVxuXG4gICAgc2V0TW92ZW1lbnQobW92ZW1lbnQpIHtcbiAgICAgICAgdGhpcy5tb3ZlbWVudCA9IG1vdmVtZW50O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG5cblxuY2xhc3MgQWN0b3IgZXh0ZW5kcyBUaGluZyB7XG4gICAgY29uc3RydWN0b3IoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICBzdXBlcih4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgbW92ZVgoYW1vdW50LCBvbkNvbGxpZGUgPSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGFtb3VudDtcbiAgICAgICAgbGV0IG1vdmUgPSBNYXRoLnJvdW5kKHRoaXMueFJlbWFpbmRlcik7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlO1xuXG4gICAgICAgIGlmIChtb3ZlKSB7XG4gICAgICAgICAgICBsZXQgbmV3WCA9IHRoaXMueCArIG1vdmU7XG4gICAgICAgICAgICBsZXQgY29sbGlzaW9uU29saWQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAobW92ZSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCBtb3ZlLCAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnggLSB0aGlzLndpZHRoIDwgbmV3WCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ggPSBzb2xpZC54IC0gdGhpcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCBtb3ZlLCAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnggKyBzb2xpZC53aWR0aCA+IG5ld1gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdYID0gc29saWQueCArIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblNvbGlkID0gc29saWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkeCA9IG5ld1ggLSB0aGlzLng7XG4gICAgICAgICAgICB0aGlzLnggPSBuZXdYO1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvblNvbGlkICYmIG9uQ29sbGlkZSkge1xuICAgICAgICAgICAgICAgIG9uQ29sbGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGR4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIG1vdmVZKGFtb3VudCwgb25Db2xsaWRlID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMueVJlbWFpbmRlciArPSBhbW91bnQ7XG4gICAgICAgIGxldCBtb3ZlID0gTWF0aC5yb3VuZCh0aGlzLnlSZW1haW5kZXIpO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgLT0gbW92ZTtcblxuICAgICAgICBpZiAobW92ZSkge1xuICAgICAgICAgICAgbGV0IG5ld1kgPSB0aGlzLnkgKyBtb3ZlO1xuICAgICAgICAgICAgbGV0IGNvbGxpc2lvblNvbGlkID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG1vdmUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzb2xpZCBvZiB0aGlzLnNjZW5lLnNvbGlkcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc29saWQuY29sbGlkZXNXaXRoTW92aW5nQWN0b3IodGhpcywgMCwgbW92ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC55IC0gdGhpcy5oZWlnaHQgPCBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgLSB0aGlzLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25Tb2xpZCA9IHNvbGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb2xpZC5jb2xsaWRlc1dpdGhNb3ZpbmdBY3Rvcih0aGlzLCAwLCBtb3ZlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQgPiBuZXdZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3WSA9IHNvbGlkLnkgKyBzb2xpZC5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU29saWQgPSBzb2xpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR5ID0gbmV3WSAtIHRoaXMueTtcbiAgICAgICAgICAgIHRoaXMueSA9IG5ld1k7XG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uU29saWQgJiYgb25Db2xsaWRlKSB7XG4gICAgICAgICAgICAgICAgb25Db2xsaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZHk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICBzdXBlci51cGRhdGUoZGVsdGFUaW1lKTtcbiAgICAgICAgdGhpcy5tb3ZlZFggPSAwO1xuICAgICAgICB0aGlzLm1vdmVkWSA9IDA7XG4gICAgfVxuXG4gICAgaXNSaWRpbmcoc29saWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueSA9PT0gc29saWQueSArIHNvbGlkLmhlaWdodCAmJiBzZWdtZW50c092ZXJsYXAodGhpcy54LCB0aGlzLndpZHRoLCBzb2xpZC54LCBzb2xpZC53aWR0aCk7XG4gICAgfVxuXG4gICAgc3F1aXNoKCkge1xuICAgIH1cbn1cblxuXG5jbGFzcyBTb2xpZCBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmNvbGxpZGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmNvbG9yID0gJyNhMTU5M2QnO1xuICAgIH1cblxuICAgIG1vdmUoZHgsIGR5KSB7XG4gICAgICAgIHRoaXMueFJlbWFpbmRlciArPSBkeDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyICs9IGR5O1xuICAgICAgICBjb25zdCBtb3ZlWCA9IE1hdGgucm91bmQodGhpcy54UmVtYWluZGVyKTtcbiAgICAgICAgY29uc3QgbW92ZVkgPSBNYXRoLnJvdW5kKHRoaXMueVJlbWFpbmRlcik7XG5cbiAgICAgICAgaWYgKG1vdmVYIHx8IG1vdmVZKSB7XG4gICAgICAgICAgICBjb25zdCByaWRpbmcgPSB0aGlzLnNjZW5lLmFjdG9ycy5maWx0ZXIoeCA9PiAoeC5pc1JpZGluZyh0aGlzKSkpO1xuICAgICAgICAgICAgdGhpcy5jb2xsaWRhYmxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChtb3ZlWCkge1xuICAgICAgICAgICAgICAgIHRoaXMueFJlbWFpbmRlciAtPSBtb3ZlWDtcbiAgICAgICAgICAgICAgICB0aGlzLnggKz0gbW92ZVg7XG5cbiAgICAgICAgICAgICAgICBpZiAobW92ZVggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYWN0b3Igb2YgdGhpcy5zY2VuZS5hY3RvcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm92ZXJsYXBzKGFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWCArPSBhY3Rvci5tb3ZlWCh0aGlzLnggKyB0aGlzLndpZHRoIC0gYWN0b3IueCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5pbmNsdWRlcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA8IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWCArPSBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVgodGhpcy54IC0gYWN0b3IueCAtIGFjdG9yLndpZHRoLCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5pbmNsdWRlcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRYID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRYICs9IGFjdG9yLm1vdmVYKG1vdmVYKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWCA+IG1vdmVYKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWCArPSBhY3Rvci5tb3ZlWChtb3ZlWCAtIGFjdG9yLm1vdmVkWCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICAgICAgICAgIHRoaXMueSArPSBtb3ZlWTtcblxuICAgICAgICAgICAgICAgIGlmIChtb3ZlWSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55ICsgdGhpcy5oZWlnaHQgLSBhY3Rvci55LCAoKSA9PiBhY3Rvci5zcXVpc2goKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJpZGluZy5pbmNsdWRlcyhhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0b3IubW92ZWRZIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZWRZICs9IGFjdG9yLm1vdmVZKG1vdmVZKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFjdG9yLm1vdmVkWSA8IG1vdmVZKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSAtIGFjdG9yLm1vdmVkWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhY3RvciBvZiB0aGlzLnNjZW5lLmFjdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0b3IubW92ZVkodGhpcy55IC0gYWN0b3IueSAtIGFjdG9yLmhlaWdodCwgKCkgPT4gYWN0b3Iuc3F1aXNoKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyaWRpbmcuaW5jbHVkZXMoYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdG9yLm1vdmVkWSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdG9yLm1vdmVkWSArPSBhY3Rvci5tb3ZlWShtb3ZlWSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhY3Rvci5tb3ZlZFkgPiBtb3ZlWSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rvci5tb3ZlZFkgKz0gYWN0b3IubW92ZVkobW92ZVkgLSBhY3Rvci5tb3ZlZFkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR4ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoICsgZHgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnksIGFjdG9yLmhlaWdodCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCArIGR4LCBhY3Rvci53aWR0aCAtIGR4KSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR5ID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLnksIHRoaXMuaGVpZ2h0LCBhY3Rvci55LCBhY3Rvci5oZWlnaHQgKyBkeSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZHkgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2xsaWRhYmxlICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgYWN0b3IueCwgYWN0b3Iud2lkdGgpICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIGFjdG9yLnkgKyBkeSwgYWN0b3IuaGVpZ2h0IC0gZHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cblxuY2xhc3MgSGF6YXJkIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgc3VwZXIoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuY29sbGlkYWJsZSA9IHRydWU7XG4gICAgICAgIHRoaXMuY29sb3IgPSAnI2YzMTMxNCc7XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICBwbGF5ZXIuZGllKCk7XG4gICAgfVxuXG4gICAgbW92ZShkeCwgZHkpIHtcbiAgICAgICAgdGhpcy54UmVtYWluZGVyICs9IGR4O1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgKz0gZHk7XG4gICAgICAgIGNvbnN0IG1vdmVYID0gTWF0aC5yb3VuZCh0aGlzLnhSZW1haW5kZXIpO1xuICAgICAgICBjb25zdCBtb3ZlWSA9IE1hdGgucm91bmQodGhpcy55UmVtYWluZGVyKTtcblxuICAgICAgICB0aGlzLnhSZW1haW5kZXIgLT0gbW92ZVg7XG4gICAgICAgIHRoaXMueCArPSBtb3ZlWDtcbiAgICAgICAgdGhpcy55UmVtYWluZGVyIC09IG1vdmVZO1xuICAgICAgICB0aGlzLnkgKz0gbW92ZVk7XG4gICAgfVxufVxuXG5jbGFzcyBTcGlrZXMgZXh0ZW5kcyBIYXphcmQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcblxuICAgIH1cblxufVxuXG5jbGFzcyBQbGF0Zm9ybSBleHRlbmRzIFNvbGlkIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5LCB3aWR0aCkge1xuICAgICAgICBzdXBlcih4LCB5ICsgVSAvIDIsIHdpZHRoLCBVIC8gMik7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiNBQjVDMUNcIjtcbiAgICB9XG5cbiAgICBjb2xsaWRlc1dpdGhNb3ZpbmdBY3RvcihhY3RvciwgZHggPSAwLCBkeSA9IDApIHtcbiAgICAgICAgaWYgKGR5IDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29sbGlkYWJsZSAmJlxuICAgICAgICAgICAgICAgIHNlZ21lbnRzT3ZlcmxhcCh0aGlzLngsIHRoaXMud2lkdGgsIGFjdG9yLngsIGFjdG9yLndpZHRoKSAmJlxuICAgICAgICAgICAgICAgIGFjdG9yLnkgPj0gdGhpcy55ICsgdGhpcy5oZWlnaHQgJiZcbiAgICAgICAgICAgICAgICBhY3Rvci55ICsgZHkgPCB0aGlzLnkgKyB0aGlzLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5cbmNsYXNzIFNwcmluZyBleHRlbmRzIFRoaW5nIHtcbiAgICBjb25zdHJ1Y3Rvcih4LCB5KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIDIgKiBVLCBVKTtcbiAgICAgICAgdGhpcy5jb2xvciA9IFwiI2RlZGYzNVwiO1xuICAgIH1cblxuICAgIGludGVyYWN0V2l0aChwbGF5ZXIpIHtcbiAgICAgICAgcGxheWVyLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9CT1VOQ0UpO1xuICAgICAgICBwbGF5ZXIuc3BlZWRYID0gMDtcbiAgICAgICAgcGxheWVyLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgIHBsYXllci5yZXN0b3JlRGFzaCgpO1xuICAgIH1cbn1cblxuXG5jbGFzcyBUcmFuc2l0aW9uIGV4dGVuZHMgVGhpbmcge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRhcmdldFNjZW5lLCB0YXJnZXRYLCB0YXJnZXRZKSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lID0gdGFyZ2V0U2NlbmU7XG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHRhcmdldFg7XG4gICAgICAgIHRoaXMudGFyZ2V0WSA9IHRhcmdldFk7XG4gICAgfVxuXG4gICAgaW50ZXJhY3RXaXRoKHBsYXllcikge1xuICAgICAgICB0aGlzLnNjZW5lLnNldFBsYXllcih1bmRlZmluZWQpO1xuICAgICAgICB0aGlzLnRhcmdldFNjZW5lLnNldFBsYXllcihwbGF5ZXIpO1xuICAgICAgICBwbGF5ZXIueCArPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XG4gICAgICAgIHBsYXllci55ICs9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcbiAgICAgICAgdGhpcy5zY2VuZS50cmFuc2l0aW9uID0gdGhpcztcbiAgICB9XG59XG5cblxuY2xhc3MgVHJpZ2dlckJsb2NrIGV4dGVuZHMgU29saWQge1xuICAgIGNvbnN0cnVjdG9yKHgsIHksIHdpZHRoLCBoZWlnaHQsIG1vdmVtZW50KSB7XG4gICAgICAgIHN1cGVyKHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLnRyaWdnZXJlZE1vdmVtZW50ID0gbW92ZW1lbnQ7XG4gICAgICAgIHRoaXMuY29sb3IgPSBcIiMzYjNiM2JcIjtcbiAgICB9XG5cbiAgICB1cGRhdGUoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN1cGVyLnVwZGF0ZShkZWx0YVRpbWUpO1xuICAgICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnNjZW5lLnBsYXllcjtcbiAgICAgICAgaWYgKHBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMubW92ZW1lbnQgJiYgdGhpcy5tb3ZlbWVudC5yZW1haW5pbmdDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlbWVudCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgcGxheWVyLngsIHBsYXllci53aWR0aCkgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnkgKyB0aGlzLmhlaWdodCA9PT0gcGxheWVyLnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50ID0gdGhpcy50cmlnZ2VyZWRNb3ZlbWVudDtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVtZW50LnJlc2V0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgc2VnbWVudHNPdmVybGFwLFxuICAgIEhhemFyZCxcbiAgICBTb2xpZCxcbiAgICBBY3RvcixcbiAgICBQbGF0Zm9ybSxcbiAgICBTcHJpbmcsXG4gICAgVHJhbnNpdGlvbixcbiAgICBUcmlnZ2VyQmxvY2ssXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuY29uc3QgaW5wdXRzID0gcmVxdWlyZSgnLi9pbnB1dHMnKTtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cblxuY2xhc3MgUGxheWVyIGV4dGVuZHMgcGh5c2ljcy5BY3RvciB7XG4gICAgY29uc3RydWN0b3IoeCwgeSkge1xuICAgICAgICBzdXBlcih4LCB5LCA4LCAxNCk7XG4gICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFggPSAwO1xuICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSAwO1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcblxuICAgICAgICB0aGlzLmlucHV0cyA9IG5ldyBpbnB1dHMuUGxheWVySW5wdXRzO1xuICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBjb25zdGFudHMuU1RBVEVfTk9STUFMO1xuICAgICAgICAvLyB0aW1lcnNcbiAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaENvb2xkb3duID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZGFzaEZyZWV6ZSA9IDA7XG4gICAgICAgIHRoaXMudGltZXJzLmRhc2ggPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSAwO1xuICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSAwO1xuICAgIH1cblxuICAgIHVwZGF0ZShkZWx0YVRpbWUpIHtcbiAgICAgICAgc3VwZXIudXBkYXRlKGRlbHRhVGltZSk7XG4gICAgICAgIHRoaXMuaW5wdXRzLnVwZGF0ZShkZWx0YVRpbWUpO1xuXG4gICAgICAgIC8vIGNoZWNrIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMuaXNHcm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmlzSHVnZ2luZ1dhbGwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5oYXNXYWxsTGVmdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IHNvbGlkIG9mIHRoaXMuc2NlbmUuc29saWRzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy55ID09PSBzb2xpZC55ICsgc29saWQuaGVpZ2h0ICYmIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueCwgdGhpcy53aWR0aCwgc29saWQueCwgc29saWQud2lkdGgpKSB7XG4gICAgICAgICAgICAgICAgLy8gcGxheWVyIGlzIHN0YW5kaW5nIG9uIGEgc29saWRcbiAgICAgICAgICAgICAgICB0aGlzLmlzR3JvdW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igd2FsbHMgb24gcmlnaHQgYW5kIGxlZnQgYXQgZGlzdGFuY2UgPD0gV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzdGFuY2VMZWZ0ID0gdGhpcy54IC0gc29saWQueCAtIHNvbGlkLndpZHRoO1xuICAgICAgICAgICAgICAgIGlmICgwIDw9IGRpc3RhbmNlTGVmdCAmJiBkaXN0YW5jZUxlZnQgPCBjb25zdGFudHMuV0FMTF9KVU1QX0NIRUNLX0RJU1RBTkNFKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzV2FsbExlZnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBkaXN0YW5jZVJpZ2h0ID0gc29saWQueCAtIHRoaXMueCAtIHRoaXMud2lkdGg7XG4gICAgICAgICAgICAgICAgaWYgKDAgPD0gZGlzdGFuY2VSaWdodCAmJiBkaXN0YW5jZVJpZ2h0IDwgY29uc3RhbnRzLldBTExfSlVNUF9DSEVDS19ESVNUQU5DRSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1dhbGxSaWdodCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiB0aGlzLnggKyB0aGlzLndpZHRoID09PSBzb2xpZC54KSB8fFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgPT09IC0xICYmIHRoaXMueCA9PT0gc29saWQueCArIHNvbGlkLndpZHRoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiBwbGF5ZXIgaXMgaHVnZ2luZyBhIHdhbGxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0h1Z2dpbmdXYWxsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5qdW1wR3JhY2UgPSBjb25zdGFudHMuSlVNUF9HUkFDRV9USU1FO1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IGNvbnN0YW50cy5TVEFURV9EQVNIIHx8IHRoaXMuZGFzaFNwZWVkWSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVNb3ZlbWVudChkZWx0YVRpbWUpO1xuXG4gICAgICAgIHRoaXMubW92ZVgodGhpcy5zcGVlZFggKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRYID0gMCk7XG4gICAgICAgIHRoaXMubW92ZVkodGhpcy5zcGVlZFkgKiBkZWx0YVRpbWUsICgpID0+IHRoaXMuc3BlZWRZID0gMCk7XG5cbiAgICAgICAgLy8gc2V0IGNvbG9yXG4gICAgICAgIHRoaXMuY29sb3IgPSB0aGlzLm5iRGFzaGVzID4gMCA/ICcjYTYzNjM2JyA6ICcjM2ZiMGY2JztcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IGNvbnN0YW50cy5TVEFURV9ERUFEKSB7XG4gICAgICAgICAgICBsZXQgYWxwaGEgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKDI1NSAqIHRoaXMudGltZXJzLmR5aW5nIC8gY29uc3RhbnRzLkRZSU5HX1RJTUUpKTtcbiAgICAgICAgICAgIHRoaXMuY29sb3IgPSBcIlwiICsgdGhpcy5jb2xvciArIChcIjBcIiArIGFscGhhLnRvU3RyaW5nKDE2KSkuc3Vic3RyKC0yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGludGVyYWN0IHdpdGggb2JqZWN0c1xuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdGhpcy5zY2VuZS5lbGVtZW50cykge1xuICAgICAgICAgICAgaWYgKHRoaXMub3ZlcmxhcHMoZWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmludGVyYWN0V2l0aCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnkgPD0gLXRoaXMuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0aGlzLmRpZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXBkYXRlTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuZHlpbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc3Bhd24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFggPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50cnlVcGRhdGVEYXNoKGRlbHRhVGltZSkpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRyeVVwZGF0ZUp1bXAoZGVsdGFUaW1lKSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0pVTVA6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBIZWxkICYmIHRoaXMudGltZXJzLnZhckp1bXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RBU0g6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZXJzLmRhc2ggPiBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoMCA8IHRoaXMudGltZXJzLmRhc2ggJiYgdGhpcy50aW1lcnMuZGFzaCA8PSBjb25zdGFudHMuREFTSF9USU1FKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gdGhpcy5kYXNoU3BlZWRYO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IHRoaXMuZGFzaFNwZWVkWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpKSBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbmQgb2YgZGFzaFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcGVlZCA9IHRoaXMuZGFzaFNwZWVkWCAmJiB0aGlzLmRhc2hTcGVlZFkgPyBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQgLyBNYXRoLnNxcnQoMikgOiBjb25zdGFudHMuRU5EX0RBU0hfU1BFRUQ7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gTWF0aC5zaWduKHRoaXMuZGFzaFNwZWVkWCkgKiBzcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLnNpZ24odGhpcy5kYXNoU3BlZWRZKSAqIHNwZWVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoU3BlZWRZID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgKj0gY29uc3RhbnRzLkVORF9EQVNIX1VQX0ZBQ1RPUjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9OT1JNQUwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lcnMuYm91bmNlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IGNvbnN0YW50cy5CT1VOQ0VfU1BFRUQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3Jpem9udGFsTW92ZW1lbnQoZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRyeVVwZGF0ZURhc2goZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICh0aGlzLm5iRGFzaGVzID4gMCAmJlxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuZGFzaFByZXNzZWRCdWZmZXIgJiZcbiAgICAgICAgICAgIHRoaXMudGltZXJzLmRhc2hDb29sZG93biA8PSAwICYmXG4gICAgICAgICAgICAodGhpcy5pbnB1dHMueEF4aXMgfHwgdGhpcy5pbnB1dHMueUF4aXMpXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgZGFzaFNwZWVkID0gdGhpcy5pbnB1dHMueEF4aXMgJiYgdGhpcy5pbnB1dHMueUF4aXMgPyBjb25zdGFudHMuREFTSF9TUEVFRCAvIE1hdGguc3FydCgyKSA6IGNvbnN0YW50cy5EQVNIX1NQRUVEO1xuICAgICAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gdGhpcy5pbnB1dHMueEF4aXMgKiBNYXRoLm1heChNYXRoLmFicyh0aGlzLnNwZWVkWCksIGRhc2hTcGVlZCk7XG4gICAgICAgICAgICB0aGlzLmRhc2hTcGVlZFkgPSB0aGlzLmlucHV0cy55QXhpcyAqIGRhc2hTcGVlZDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYID0gMDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmRhc2hQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTiArIGNvbnN0YW50cy5EQVNIX0ZSRUVaRV9USU1FO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfREFTSCk7XG4gICAgICAgICAgICB0aGlzLm5iRGFzaGVzIC09IDE7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdHJ5VXBkYXRlSnVtcChkZWx0YVRpbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmIHRoaXMudGltZXJzLmp1bXBHcmFjZSA+IDApIHtcbiAgICAgICAgICAgIC8vIHJlZ3VsYXIganVtcFxuICAgICAgICAgICAgdGhpcy5pbnB1dHMuanVtcFByZXNzZWRCdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRYICs9IHRoaXMuaW5wdXRzLnhBeGlzICogY29uc3RhbnRzLkpVTVBfSE9SSVpPTlRBTF9CT09TVDtcbiAgICAgICAgICAgIHRoaXMuc3BlZWRZID0gY29uc3RhbnRzLkpVTVBfU1BFRUQ7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9KVU1QKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyICYmICh0aGlzLmhhc1dhbGxMZWZ0IHx8IHRoaXMuaGFzV2FsbFJpZ2h0KSkge1xuICAgICAgICAgICAgLy8gd2FsbGp1bXBcbiAgICAgICAgICAgIHRoaXMuaW5wdXRzLmp1bXBQcmVzc2VkQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgZHggPSB0aGlzLmhhc1dhbGxMZWZ0ID8gMSA6IC0xO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIGNvbnN0YW50cy5XQUxMX0pVTVBfSFNQRUVEO1xuICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBjb25zdGFudHMuSlVNUF9TUEVFRDtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoY29uc3RhbnRzLlNUQVRFX0pVTVApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHVwZGF0ZUhvcml6b250YWxNb3ZlbWVudChkZWx0YVRpbWUpIHtcbiAgICAgICAgLy8gaG9yaXpvbnRhbCBtb3ZlbWVudFxuICAgICAgICBsZXQgc3ggPSBNYXRoLmFicyh0aGlzLnNwZWVkWCk7ICAgICAgICAvLyBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGUgaG9yaXpvbnRhbCBzcGVlZCBvZiB0aGUgcGxheWVyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy5zcGVlZFggPj0gMCA/IDEgOiAtMTsgICAgLy8gZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBwbGF5ZXIgaXMgbW92aW5nXG4gICAgICAgIGNvbnN0IG11bHQgPSB0aGlzLmlzR3JvdW5kZWQgPyAxIDogY29uc3RhbnRzLkFJUl9GQUNUT1I7XG5cbiAgICAgICAgLy8gcGFzc2l2ZSBkZWNlbGVyYXRpb25cbiAgICAgICAgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPD0gMCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3ggPiBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1heChzeCAtIGNvbnN0YW50cy5SVU5fREVDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWN0aXZlIGFjY2VsZXJhdGlvblxuICAgICAgICBpZiAoZHggKiB0aGlzLmlucHV0cy54QXhpcyA+IDAgJiYgc3ggPCBjb25zdGFudHMuTUFYX1JVTl9TUEVFRCkge1xuICAgICAgICAgICAgc3ggPSBNYXRoLm1pbihzeCArIGNvbnN0YW50cy5SVU5fQUNDRUxFUkFUSU9OICogZGVsdGFUaW1lICogbXVsdCwgY29uc3RhbnRzLk1BWF9SVU5fU1BFRUQpO1xuICAgICAgICB9IGVsc2UgaWYgKGR4ICogdGhpcy5pbnB1dHMueEF4aXMgPCAwKSB7XG4gICAgICAgICAgICBzeCAtPSBjb25zdGFudHMuUlVOX0FDQ0VMRVJBVElPTiAqIGRlbHRhVGltZSAqIG11bHQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zcGVlZFggPSBkeCAqIHN4O1xuICAgIH1cblxuICAgIHVwZGF0ZVZlcnRpY2FsTW92ZW1lbnQoZGVsdGFUaW1lKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0dyb3VuZGVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0h1Z2dpbmdXYWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zcGVlZFkgPSBNYXRoLm1heCh0aGlzLnNwZWVkWSAtIGNvbnN0YW50cy5HUkFWSVRZICogZGVsdGFUaW1lLCAtY29uc3RhbnRzLkNMSU1CX1NMSVBfU1BFRUQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwZWVkWSA9IE1hdGgubWF4KHRoaXMuc3BlZWRZIC0gY29uc3RhbnRzLkdSQVZJVFkgKiBkZWx0YVRpbWUsIC1jb25zdGFudHMuTUFYX0ZBTExfU1BFRUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0U3RhdGUobmV3U3RhdGUpIHtcbiAgICAgICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLnN0YXRlKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAvLyBvbiBsZWF2ZSBzdGF0ZSBhY3Rpb25zXG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfTk9STUFMOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9KVU1QOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy52YXJKdW1wID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREFTSDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0RFQUQ6XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX0JPVU5DRTpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuYm91bmNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKG5ld1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgLy8gb24gZW50ZXIgc3RhdGUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzLlNUQVRFX05PUk1BTDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfSlVNUDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuanVtcEdyYWNlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMudmFySnVtcCA9IGNvbnN0YW50cy5WQVJfSlVNUF9USU1FO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlucHV0cy5qdW1wUHJlc3NlZEJ1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEFURV9EQVNIOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5kYXNoQ29vbGRvd24gPSBjb25zdGFudHMuREFTSF9DT09MRE9XTjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZGFzaCA9IGNvbnN0YW50cy5EQVNIX1RJTUUgKyBjb25zdGFudHMuREFTSF9GUkVFWkVfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfREVBRDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aW1lcnMuZHlpbmcgPSBjb25zdGFudHMuRFlJTkdfVElNRTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBjb25zdGFudHMuU1RBVEVfQk9VTkNFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRpbWVycy5ib3VuY2UgPSBjb25zdGFudHMuQk9VTkNFX1RJTUU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGllKCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKGNvbnN0YW50cy5TVEFURV9ERUFEKTtcbiAgICB9XG5cbiAgICByZXNwYXduKCkge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnNjZW5lLnN0YXJ0UG9zaXRpb25YO1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnNjZW5lLnN0YXJ0UG9zaXRpb25ZO1xuICAgICAgICB0aGlzLnhSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnlSZW1haW5kZXIgPSAwO1xuICAgICAgICB0aGlzLnNwZWVkWCA9IDA7XG4gICAgICAgIHRoaXMuc3BlZWRZID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRYID0gMDtcbiAgICAgICAgdGhpcy5kYXNoU3BlZWRZID0gMDtcbiAgICAgICAgZm9yIChjb25zdCB0IGluIHRoaXMudGltZXJzKSB7XG4gICAgICAgICAgICB0aGlzLnRpbWVyc1t0XSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXRTdGF0ZShjb25zdGFudHMuU1RBVEVfTk9STUFMKTtcbiAgICAgICAgdGhpcy5yZXN0b3JlRGFzaCgpO1xuICAgIH1cblxuICAgIHJlc3RvcmVEYXNoKCkge1xuICAgICAgICB0aGlzLm5iRGFzaGVzID0gMTtcbiAgICB9XG5cbiAgICBzcXVpc2goKSB7XG4gICAgICAgIHRoaXMuZGllKCk7XG4gICAgfVxuXG4gICAgaXNSaWRpbmcoc29saWQpIHtcbiAgICAgICAgcmV0dXJuIHN1cGVyLmlzUmlkaW5nKHNvbGlkKSB8fFxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgIHBoeXNpY3Muc2VnbWVudHNPdmVybGFwKHRoaXMueSwgdGhpcy5oZWlnaHQsIHNvbGlkLnksIHNvbGlkLmhlaWdodCkgJiZcbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gLTEgJiYgc29saWQueCArIHNvbGlkLndpZHRoID09PSB0aGlzLngpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLmlucHV0cy54QXhpcyA9PT0gMSAmJiBzb2xpZC54ID09PSB0aGlzLnggKyB0aGlzLndpZHRoKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBsYXllcixcbn0iLCJcInVzZSBzdHJpY3RcIjtcbmNvbnN0IHBoeXNpY3MgPSByZXF1aXJlKCcuL3BoeXNpY3MnKTtcbmNvbnN0IGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5jb25zdCBVID0gY29uc3RhbnRzLkdSSURfU0laRTtcblxuXG5jbGFzcyBTY2VuZSB7XG4gICAgY29uc3RydWN0b3Iod2lkdGgsIGhlaWdodCwgc3RhcnRQb3NpdGlvblggPSB1bmRlZmluZWQsIHN0YXJ0UG9zaXRpb25ZID0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHRoaXMuc2Nyb2xsWCA9IDA7XG4gICAgICAgIHRoaXMuc2Nyb2xsWSA9IDA7XG4gICAgICAgIHRoaXMuc29saWRzID0gW107XG4gICAgICAgIHRoaXMuYWN0b3JzID0gW107XG4gICAgICAgIHRoaXMuZWxlbWVudHMgPSBbXTtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGlmIChzdGFydFBvc2l0aW9uWCAhPT0gdW5kZWZpbmVkICYmIHN0YXJ0UG9zaXRpb25ZICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucGxheWVyID0gbmV3IHBoeXNpY3MuUGxheWVyKHN0YXJ0UG9zaXRpb25YLCBzdGFydFBvc2l0aW9uWSk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25YID0gc3RhcnRQb3NpdGlvblg7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25ZID0gc3RhcnRQb3NpdGlvblk7XG4gICAgICAgICAgICB0aGlzLmFkZEFjdG9yKHRoaXMucGxheWVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UG9zaXRpb25ZID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzZXRTdGFydFBvc2l0aW9uKHgsIHkpIHtcbiAgICAgICAgdGhpcy5zdGFydFBvc2l0aW9uWCA9IHg7XG4gICAgICAgIHRoaXMuc3RhcnRQb3NpdGlvblkgPSB5O1xuICAgIH1cblxuICAgIHN0YXRpYyBmcm9tU3RyaW5nKHMpIHtcbiAgICAgICAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gbGluZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCB3aWR0aCA9IGxpbmVzWzBdLmxlbmd0aDtcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUod2lkdGggKiBVLCBoZWlnaHQgKiBVKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBsaW5lc1tpXS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSBqICogVTtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gKGhlaWdodCAtIGkgLSAxKSAqIFU7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChsaW5lc1tpXVtqXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZFNvbGlkKG5ldyBwaHlzaWNzLlNvbGlkKHgsIHksIFUsIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICchJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZEVsZW1lbnQobmV3IHBoeXNpY3MuSGF6YXJkKHgsIHksIFUsIFUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdQJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lLnNldFN0YXJ0UG9zaXRpb24oeCwgeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRFbGVtZW50KG5ldyBwaHlzaWNzLlNwcmluZyh4LCB5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnLSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRTb2xpZChuZXcgcGh5c2ljcy5QbGF0Zm9ybSh4LCB5LCBVKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2NlbmU7XG4gICAgfVxuXG4gICAgdXBkYXRlKGRlbHRhVGltZSkge1xuICAgICAgICB0aGlzLnNvbGlkcy5tYXAoeCA9PiB4LnVwZGF0ZShkZWx0YVRpbWUpKTtcbiAgICAgICAgdGhpcy5lbGVtZW50cy5tYXAoeCA9PiB4LnVwZGF0ZShkZWx0YVRpbWUpKTtcbiAgICAgICAgdGhpcy5hY3RvcnMubWFwKHggPT4geC51cGRhdGUoZGVsdGFUaW1lKSk7XG4gICAgICAgIC8vIHNjcm9sbCB2aWV3XG4gICAgICAgIGlmICh0aGlzLnBsYXllcikge1xuICAgICAgICAgICAgaWYgKHRoaXMucGxheWVyLnggLSB0aGlzLnNjcm9sbFggPiAuNjAgKiBjb25zdGFudHMuVklFV19XSURUSCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsWCA9IE1hdGgubWluKHRoaXMud2lkdGggLSBjb25zdGFudHMuVklFV19XSURUSCwgdGhpcy5wbGF5ZXIueCAtIC42MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXIueCAtIHRoaXMuc2Nyb2xsWCA8IC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxYID0gTWF0aC5tYXgoMCwgdGhpcy5wbGF5ZXIueCAtIC40MCAqIGNvbnN0YW50cy5WSUVXX1dJRFRIKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZID4gLjYwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5taW4odGhpcy5oZWlnaHQgLSBjb25zdGFudHMuVklFV19IRUlHSFQsIHRoaXMucGxheWVyLnkgLSAuNjAgKiBjb25zdGFudHMuVklFV19IRUlHSFQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBsYXllci55IC0gdGhpcy5zY3JvbGxZIDwgLjQwICogY29uc3RhbnRzLlZJRVdfSEVJR0hUKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY3JvbGxZID0gTWF0aC5tYXgoMCwgdGhpcy5wbGF5ZXIueSAtIC40MCAqIGNvbnN0YW50cy5WSUVXX0hFSUdIVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkcmF3KGN0eCkge1xuICAgICAgICB0aGlzLnNvbGlkcy5tYXAoeCA9PiB4LmRyYXcoY3R4KSk7XG4gICAgICAgIHRoaXMuZWxlbWVudHMubWFwKHggPT4geC5kcmF3KGN0eCkpO1xuICAgICAgICB0aGlzLmFjdG9ycy5tYXAoeCA9PiB4LmRyYXcoY3R4KSk7XG4gICAgfVxuXG4gICAgc2V0UGxheWVyKHBsYXllcikge1xuICAgICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMucGxheWVyLnNjZW5lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSB0aGlzLmFjdG9ycy5pbmRleE9mKHRoaXMucGxheWVyKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFjdG9ycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWN0b3IocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjtcbiAgICB9XG5cbiAgICBhZGRBY3RvcihhY3Rvcikge1xuICAgICAgICB0aGlzLmFjdG9ycy5wdXNoKGFjdG9yKTtcbiAgICAgICAgYWN0b3Iuc2NlbmUgPSB0aGlzO1xuICAgIH1cblxuICAgIGFkZFNvbGlkKHNvbGlkKSB7XG4gICAgICAgIHRoaXMuc29saWRzLnB1c2goc29saWQpO1xuICAgICAgICBzb2xpZC5zY2VuZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgYWRkRWxlbWVudChlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgZWxlbWVudC5zY2VuZSA9IHRoaXM7XG4gICAgfVxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNjZW5lLFxufVxuIl19
