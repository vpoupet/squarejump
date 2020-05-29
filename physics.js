function segmentsOverlap(start1, size1, start2, size2) {
    return start1 < start2 + size2 && start2 < start1 + size1;
}

const STATE_IDLE = 0;
const STATE_JUMP = 1;
const STATE_DASH = 2;


class Movement {
    constructor() {}
    update(thing) {}
}


class PlayerInputs {
    constructor() {
        this.XAxis = 0;
        this.YAxis = 0;
        this.jumpPressTime = 0;
        this.dashPressTime = 0;
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
    }

    update(deltaTime) {
        this.jumpPressTime += deltaTime;
        this.dashPressTime += deltaTime;
        this.XAxis = 0;
        this.YAxis = 0;
        if (pressedKeys.has(this.keymap['left'])) {
            this.XAxis -= 1;
        }
        if (pressedKeys.has(this.keymap['right'])) {
            this.XAxis += 1;
        }
        if (pressedKeys.has(this.keymap['up'])) {
            this.YAxis += 1;
        }
        if (pressedKeys.has(this.keymap['down'])) {
            this.YAxis -= 1;
        }
        const prevJump = this.jumpHeld;
        this.jumpHeld = pressedKeys.has(this.keymap['jump']);
        if (!prevJump && this.jumpHeld) {
            this.jumpPressTime = 0;
            this.jumpPressedBuffer = true;
        }
        this.jumpPressedBuffer = this.jumpPressedBuffer && (this.jumpPressTime <= JUMP_BUFFER_TIME);

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap['dash']);
        if (!prevDash && this.dashHeld) {
            this.dashPressTime = 0;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (this.dashPressTime <= DASH_BUFFER_TIME);
    }
}


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
    }

    overlaps(other) {
        return (this.x + this.width > other.x &&
            other.x + other.width > this.x &&
            this.y + this.height > other.y &&
            other.y + other.height > this.y);
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.scene.scrollX, HEIGHT - this.y - this.height + this.scene.scrollY, this.width, this.height);
    }

    update() {
        if (this.movement) {
            this.movement.update(this);
        }
    }

    move(dx, dy) {}

    moveTo(x, y) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder);
    }

    setMovement(movement) {
        this.movement = movement;
        movement.thing = this;
    }
}

class Actor extends Thing {
    constructor(x, y, width, height) {
        super(x * GRID_SIZE, y * GRID_SIZE, width * GRID_SIZE, height * GRID_SIZE);
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
                    if (solid.collidable &&
                        this.x + this.width <= solid.x && solid.x < newX + this.width &&
                        segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                        newX = solid.x - this.width;
                        collisionSolid = solid;
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.collidable &&
                        newX < solid.x + solid.width && solid.x + solid.width <= this.x &&
                        segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                        newX = solid.x + solid.width;
                        collisionSolid = solid;
                    }
                }
            }
            this.x = newX;
            if (collisionSolid && onCollide) {
                onCollide();
            }
        }
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
                    if (solid.collidable &&
                        this.y + this.height <= solid.y && solid.y < newY + this.height &&
                        segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                        newY = solid.y - this.height;
                        collisionSolid = solid;
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.collidable &&
                        newY < solid.y + solid.height && solid.y + solid.height <= this.y &&
                        segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                        newY = solid.y + solid.height;
                        collisionSolid = solid;
                    }
                }
            }
            this.y = newY;
            if (collisionSolid && onCollide) {
                onCollide();
            }
        }
    }

    isRiding(solid) {
        return this.y === solid.y + solid.height && segmentsOverlap(this.x, this.width, solid.x, solid.width);
    }

    squish() {
    }
}


class Player extends Actor {
    constructor(x, y) {
        super(x, y, 1.5, 2);
        this.startPositionX = this.x;
        this.startPositionY = this.y;
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.nbDashes = 1;

        this.inputs = new PlayerInputs;
        this.state = STATE_IDLE;
        this.jumpGraceTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashTimer = 0;
        this.varJumpTimer = 0;
    }

    update(deltaTime) {
        this.inputs.update();

        // check environment
        let isGrounded = false;
        let isWallHugging = false;
        let hasWallLeft = false;
        let hasWallRight = false;
        for (const solid of this.scene.solids) {
            if (this.y === solid.y + solid.height && segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                // player is standing on a solid
                isGrounded = true;
            }
            if (segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                // check for walls on right and left at distance <= WALL_JUMP_CHECK_DISTANCE
                const distanceLeft = this.x - solid.x - solid.width;
                if (0 <= distanceLeft && distanceLeft <= WALL_JUMP_CHECK_DISTANCE) {
                    hasWallLeft = true;
                }
                const distanceRight = solid.x - this.x - this.width;
                if (0 <= distanceRight && distanceRight <= WALL_JUMP_CHECK_DISTANCE) {
                    hasWallRight = true;
                }

                if ((this.inputs.XAxis === 1 && this.x + this.width === solid.x) ||
                    (this.inputs.XAxis === -1 && this.x === solid.x + solid.width)) {
                    // check if player is hugging a wall
                    isWallHugging = true;
                }
            }
        }

        // update timers and counters
        if (isGrounded) {
            this.jumpGraceTimer = JUMP_GRACE_TIME;
            this.nbDashes = 1;
        } else {
            this.jumpGraceTimer -= deltaTime;
        }
        this.varJumpTimer -= deltaTime;
        this.dashCooldownTimer -= deltaTime;
        this.dashTimer -= deltaTime;

        // player movement
        // dash
        if (this.state === STATE_DASH) {
            if (this.dashTimer > DASH_TIME) {
                this.speedX = 0;
                this.speedY = 0;
            } else if (this.dashTimer > 0) {
                this.speedX = this.dashSpeedX;
                this.speedY = this.dashSpeedY;
            } else {
                this.state = STATE_IDLE;
                const speed = this.dashSpeedX && this.dashSpeedY ? END_DASH_SPEED / Math.sqrt(2) : END_DASH_SPEED;
                this.speedX = Math.sign(this.dashSpeedX) * speed;
                this.speedY = Math.sign(this.dashSpeedY) * speed;
                if (this.dashSpeedY > 0) {
                    this.speedY *= END_DASH_UP_FACTOR;
                }
            }
        } else if (this.nbDashes > 0 && this.inputs.dashPressedBuffer && this.dashCooldownTimer <= 0) {
            if (this.inputs.XAxis || this.inputs.YAxis) {
                const dashSpeed = this.inputs.XAxis && this.inputs.YAxis ? DASH_SPEED / Math.sqrt(2) : DASH_SPEED;
                this.dashSpeedX = this.inputs.XAxis * Math.max(Math.abs(this.speedX), dashSpeed);
                this.dashSpeedY = this.inputs.YAxis * dashSpeed;
                this.speedX = 0;
                this.speedY = 0;
                this.dashTimer = DASH_TIME + DASH_FREEZE_TIME;
                this.inputs.dashPressedBuffer = false;
                this.dashCooldownTimer = DASH_COOLDOWN + DASH_FREEZE_TIME;
                this.nbDashes -= 1;
                this.state = STATE_DASH;
            }
        } else {
            // horizontal movement
            let sx = Math.abs(this.speedX);        // absolute value of the horizontal speed of the player
            let dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
            let ix = this.inputs.XAxis * dx;       // 1 if player pushing towards moving direction, -1 if pushing opposite, 0 if not pushing
            const mult = isGrounded ? 1 : AIR_FACTOR;
            if (ix <= 0) {
                sx = Math.max(sx - RUN_DECELERATION * deltaTime * mult, 0);
            } else if (sx > MAX_RUN_SPEED) {
                sx = Math.max(sx - RUN_DECELERATION * deltaTime * mult, MAX_RUN_SPEED);
            }
            // player acceleration
            if (ix === 1 && sx < MAX_RUN_SPEED) {
                sx = Math.min(sx + RUN_ACCELERATION * deltaTime * mult, MAX_RUN_SPEED);
            } else if (ix === -1) {
                sx -= RUN_ACCELERATION * deltaTime * mult;
            }

            // vertical movement
            if (this.state === STATE_JUMP) {
                if (this.inputs.jumpHeld && this.varJumpTimer > 0) {
                    this.speedY = JUMP_SPEED;
                } else {
                    this.state = STATE_IDLE;
                    this.varJumpTimer = 0;
                }
            } else {
                if (this.inputs.jumpPressedBuffer && this.jumpGraceTimer > 0) {
                    // regular jump
                    this.jumpGraceTimer = 0;
                    this.varJumpTimer = VAR_JUMP_TIME;
                    this.inputs.jumpPressedBuffer = false;
                    this.state = STATE_JUMP;
                    this.speedY = JUMP_SPEED;
                    sx += ix * JUMP_HORIZONTAL_BOOST;
                } else if (this.inputs.jumpPressedBuffer && (hasWallLeft || hasWallRight)) {
                    // walljump
                    this.varJumpTimer = VAR_JUMP_TIME;
                    this.inputs.jumpPressedBuffer = false;
                    this.state = STATE_JUMP;
                    this.speedY = JUMP_SPEED;
                    sx = WALL_JUMP_HSPEED;
                    dx = hasWallLeft ? 1 : -1;
                } else if (!isGrounded) {
                    // free fall
                    if (isWallHugging) {
                        this.speedY = Math.max(this.speedY - GRAVITY * deltaTime, -CLIMB_SLIP_SPEED);
                    } else {
                        this.speedY = Math.max(this.speedY - GRAVITY * deltaTime, -MAX_FALL_SPEED);
                    }
                }
            }
            this.speedX = dx * sx;
        }

        this.moveX(this.speedX * deltaTime, () => this.speedX = 0);
        this.moveY(this.speedY * deltaTime, () => this.speedY = 0);

        // set color
        this.color = this.nbDashes > 0 ? '#a63636' : '#3fb0f6';

        // check if dead
        for (const hazard of this.scene.hazards) {
            if (this.overlaps(hazard)) {
                this.die();
                break;
            }
        }
        if (this.y <= -this.height) {
            this.die();
        }
    }

    die() {
        this.x = this.startPositionX;
        this.y = this.startPositionY;
    }

    squish() {
        this.die();
    }

    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.inputs.XAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.inputs.XAxis === 1 && solid.x === this.x + this.width)
                )
            );
    }
}


class Hazard extends Thing {
    constructor(x, y, width, height) {
        super(x * GRID_SIZE, y * GRID_SIZE, width * GRID_SIZE, height * GRID_SIZE);
        this.collidable = true;
        this.color = '#f31314';
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


class Solid extends Thing {
    constructor(x, y, width, height) {
        super(x * GRID_SIZE, y * GRID_SIZE, width * GRID_SIZE, height * GRID_SIZE);
        this.collidable = true;
        this.color = '#a1593d';
    }

    move(dx, dy) {
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        if (moveX || moveY) {
            const riding = actors.filter(x => x.isRiding(this));
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;

                if (moveX > 0) {
                    for (const actor of actors) {
                        if (this.overlaps(actor)) {
                            actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveX(moveX);
                        }
                    }
                } else {
                    for (const actor of actors) {
                        if (this.overlaps(actor)) {
                            actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveX(moveX);
                        }
                    }
                }
            }
            if (moveY) {
                this.yRemainder -= moveY;
                this.y += moveY;

                if (moveY > 0) {
                    for (const actor of actors) {
                        if (this.overlaps(actor)) {
                            actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveY(moveY);
                        }
                    }
                } else {
                    for (const actor of actors) {
                        if (this.overlaps(actor)) {
                            actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveY(moveY);
                        }
                    }
                }
            }
            this.collidable = true;
        }
    }

    update(deltaTime) {}
}


class LinearInterpolatedMovement extends Movement {
    constructor(controlPoints) {
        super();
        this.period = controlPoints.map(p => p.d).reduce((x, y) => x+y, 0);
        this.controlPoints = controlPoints.map(p => {return {x: GRID_SIZE * p.x, y: GRID_SIZE * p.y, d: p.d}});
        this.controlPoints.push(this.controlPoints[0]);
        this.timer = 0;
        this.thing = undefined;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        this.timer %= this.period;
        let t = this.timer;
        for (let i = 0; i < this.controlPoints.length; i++) {
            let d = this.controlPoints[i].d;
            if (t >= d) {
                t -= d;
            } else {
                this.thing.moveTo(
                    (1 - t/d) * this.controlPoints[i].x + (t/d) * this.controlPoints[i+1].x,
                    (1 - t/d) * this.controlPoints[i].y + (t/d) * this.controlPoints[i+1].y);
                break;
            }
        }
    }
}


class SineMovement extends Movement {
    constructor(startX, startY, endX, endY, period) {
        super();
        this.startX = startX * GRID_SIZE;
        this.startY = startY * GRID_SIZE;
        this.endX = endX * GRID_SIZE;
        this.endY = endY * GRID_SIZE;
        this.period = period;
        this.angle = 0;
        this.thing = undefined;
    }

    update(deltaTime) {
        this.angle += deltaTime * 2 * Math.PI / this.period;
        this.angle %= 2 * Math.PI;
        const ratio = (Math.cos(this.angle) + 1) / 2;
        this.thing.moveTo(ratio * this.startX + (1 - ratio) * this.endX, ratio * this.startY + (1 - ratio) * this.endY);
    }
}


class Slime extends Hazard {
    constructor(controlPoints) {
        super(controlPoints[0].x, controlPoints[0].y, 2, 2);
        this.setMovement(new LinearInterpolatedMovement(controlPoints));
    }
}


// hazards.push(new Slime([
//     {x: 7, y: 20, d: 1.5},
//     {x: 7, y: 20, d: .25},
//     {x: 7, y: 2, d: 1.5},
//     {x: 7, y: 2, d: .25},
// ]));
// hazards.push(new Slime([
//     {x: 11, y: 20, d: 1.5},
//     {x: 11, y: 20, d: .25},
//     {x: 11, y: 14, d: 1.5},
//     {x: 11, y: 14, d: .25},
// ]));
// hazards.push(new Slime([
//     {x: 1, y: 18, d: .25},
//     {x: 20, y: 18, d: 1.5},
//     {x: 20, y: 18, d: .25},
//     {x: 1, y: 18, d: 1.5},
// ]));
//

class Scene {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = 0;
        this.solids = [];
        this.hazards = [];
        this.actors = [];
        this.player = undefined;
    }

    update(deltaTime) {
        this.solids.map(x => x.update(deltaTime));
        this.hazards.map(x => x.update(deltaTime));
        this.actors.map(x => x.update(deltaTime));
        if (this.player) {
            if (this.player.x - this.scrollX > .60 * WIDTH) {
                this.scrollX = Math.min(this.width * GRID_SIZE - WIDTH, this.player.x - .60 * WIDTH);
            }
            if (this.player.x - this.scrollX < .40 * WIDTH) {
                this.scrollX = Math.max(0, this.player.x - .40 * WIDTH);
            }
        }
    }

    draw() {
        this.solids.map(x => x.draw());
        this.hazards.map(x => x.draw());
        this.actors.map(x => x.draw());
    }

    addPlayer(player) {
        this.addActor(player);
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

    addHazard(hazard) {
        this.hazards.push(hazard);
        hazard.scene = this;
    }

    loadString(s) {
        const lines = s.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines[i].length; j++) {
                if (lines[i][j] === 'x') {
                    this.addSolid(new Solid(j, lines.length - i - 1, 1, 1));
                } else if (lines[i][j] === '!') {
                    this.addHazard(new Hazard(j, lines.length - i - 1, 1, 1));
                }
            }
        }
    }
}

// solids = [
//     new Solid(0, 0, 14, 6),
//     new Solid(9, 3, 6, 5),
//     new Solid(20, 0, 1, 2),
//     new Solid(21, 0, 3, 5),
//     new Solid(24, 0, 2, 8),
//     new Solid(26, 0, 1, 6),
//     new SineMovingSolid(29, 5, 4, 1, 34, 10, 4),
//     new SineMovingSolid(16, 5, 6, 1, 16, 15, 6),
//     new Solid(36, 0, 3, 11),
//     new Solid(36, 13, 3, 14),
//     new Solid(30, 13, 3, 14),
//     new Solid(10, 20, 2, 1),
//     new Solid(2, 26, 2, 1),
// ];
