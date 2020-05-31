// From Celeste
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
const SUPER_JUMP_HORIZONTAL_SPEED = 260;

// Other constants
const DASH_FREEZE_TIME = .05;
const DYING_TIME = .5;
const STATE_NORMAL = 0;
const STATE_JUMP = 1;
const STATE_DASH = 2;
const STATE_DASH_FREEZE = 3;
const STATE_DEAD = 4;

function segmentsOverlap(start1, size1, start2, size2) {
    return start1 < start2 + size2 && start2 < start1 + size1;
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
        this.ridingSolid = undefined;
        this.timers = {};
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

    update(deltaTime) {
        super.update(deltaTime);
        this.ridingSolid = undefined;
        for (const solid of this.scene.solids) {
            if (this.isRiding(solid)) {
                this.ridingSolid = solid;
                break;
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
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.nbDashes = 1;

        this.inputs = new PlayerInputs;
        this.isGrounded = true;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;

        this.state = STATE_NORMAL;
        // timers
        this.timers.jumpGrace = 0;
        this.timers.dashCooldown = 0;
        this.timers.dashFreeze = 0;
        this.timers.dash = 0;
        this.timers.varJump = 0;
        this.timers.dying = 0;
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
            if (this.y === solid.y + solid.height && segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                // player is standing on a solid
                this.isGrounded = true;
            }
            if (segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                // check for walls on right and left at distance <= WALL_JUMP_CHECK_DISTANCE
                const distanceLeft = this.x - solid.x - solid.width;
                if (0 <= distanceLeft && distanceLeft < WALL_JUMP_CHECK_DISTANCE) {
                    this.hasWallLeft = true;
                }
                const distanceRight = solid.x - this.x - this.width;
                if (0 <= distanceRight && distanceRight < WALL_JUMP_CHECK_DISTANCE) {
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
            this.timers.jumpGrace = JUMP_GRACE_TIME;
            this.nbDashes = 1;
        }

        this.updateMovement(deltaTime);

        this.moveX(this.speedX * deltaTime, () => this.speedX = 0);
        this.moveY(this.speedY * deltaTime, () => this.speedY = 0);

        // set color
        this.color = this.nbDashes > 0 ? '#a63636' : '#3fb0f6';
        if (this.state === STATE_DEAD) {
            let alpha = Math.max(0, Math.floor(255 * this.timers.dying / DYING_TIME));
            this.color = "" + this.color + ("0" + alpha.toString(16)).substr(-2);
        }

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

    updateMovement(deltaTime) {
        switch (this.state) {
            case STATE_DEAD:
                if (this.timers.dying <= 0) {
                    this.respawn();
                }
                this.speedX = 0;
                this.speedY = 0;
                break;
            case STATE_NORMAL:
                if (this.tryUpdateDash(deltaTime)) break;
                if (this.tryUpdateJump(deltaTime)) break;
                this.updateHorizontalMovement(deltaTime);
                this.updateVerticalMovement(deltaTime);
                break;
            case STATE_JUMP:
                if (this.inputs.jumpHeld && this.timers.varJump > 0) {
                    this.speedY = JUMP_SPEED;
                } else {
                    this.setState(STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                break;
            case STATE_DASH_FREEZE:
                if (this.timers.dashFreeze <= 0) {
                    this.setState(STATE_DASH);
                }
                break;
            case STATE_DASH:
                if (this.tryUpdateJump(deltaTime)) break;
                if (this.timers.dash > 0) {
                    // still dashing
                    this.speedX = this.dashSpeedX;
                    this.speedY = this.dashSpeedY;
                } else {
                    // end of dash
                    const speed = this.dashSpeedX && this.dashSpeedY ? END_DASH_SPEED / Math.sqrt(2) : END_DASH_SPEED;
                    this.speedX = Math.sign(this.dashSpeedX) * speed;
                    this.speedY = Math.sign(this.dashSpeedY) * speed;
                    if (this.dashSpeedY > 0) {
                        this.speedY *= END_DASH_UP_FACTOR;
                    }
                    this.setState(STATE_NORMAL);
                }
                break;
        }
    }

    tryUpdateDash(deltaTime) {
        if (this.nbDashes > 0 &&
            this.inputs.dashPressedBuffer &&
            this.timers.dashCooldown <= 0 &&
            (this.inputs.xAxis || this.inputs.yAxis)
        ) {
            const dashSpeed = this.inputs.xAxis && this.inputs.yAxis ? DASH_SPEED / Math.sqrt(2) : DASH_SPEED;
            this.dashSpeedX = this.inputs.xAxis * Math.max(Math.abs(this.speedX), dashSpeed);
            this.dashSpeedY = this.inputs.yAxis * dashSpeed;
            this.speedX = 0;
            this.speedY = 0;
            this.inputs.dashPressedBuffer = false;
            this.timers.dashCooldown = DASH_COOLDOWN + DASH_FREEZE_TIME;
            this.setState(STATE_DASH_FREEZE);
            return true;
        }
        return false;
    }

    tryUpdateJump(deltaTime) {
        if (this.inputs.jumpPressedBuffer && this.timers.jumpGrace > 0) {
            // regular jump
            this.inputs.jumpPressedBuffer = false;
            this.speedX += this.inputs.xAxis * JUMP_HORIZONTAL_BOOST;
            this.speedY = JUMP_SPEED;
            this.setState(STATE_JUMP);
            return true;
        } else if (this.inputs.jumpPressedBuffer && (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            this.inputs.jumpPressedBuffer = false;
            let dx = this.hasWallLeft ? 1 : -1;
            this.speedX = dx * WALL_JUMP_HSPEED;
            this.speedY = JUMP_SPEED;
            this.setState(STATE_JUMP);
            return true;
        }
        return false;
    }

    updateHorizontalMovement(deltaTime) {
        // horizontal movement
        let sx = Math.abs(this.speedX);        // absolute value of the horizontal speed of the player
        const dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        const mult = this.isGrounded ? 1 : AIR_FACTOR;

        // passive deceleration
        if (dx * this.inputs.xAxis <= 0) {
            sx = Math.max(sx - RUN_DECELERATION * deltaTime * mult, 0);
        } else if (sx > MAX_RUN_SPEED) {
            sx = Math.max(sx - RUN_DECELERATION * deltaTime * mult, MAX_RUN_SPEED);
        }

        // active acceleration
        if (dx * this.inputs.xAxis > 0 && sx < MAX_RUN_SPEED) {
            sx = Math.min(sx + RUN_ACCELERATION * deltaTime * mult, MAX_RUN_SPEED);
        } else if (dx * this.inputs.xAxis < 0) {
            sx -= RUN_ACCELERATION * deltaTime * mult;
        }
        this.speedX = dx * sx;
    }

    updateVerticalMovement(deltaTime) {
        if (!this.isGrounded) {
            if (this.isHuggingWall) {
                this.speedY = Math.max(this.speedY - GRAVITY * deltaTime, -CLIMB_SLIP_SPEED);
            } else {
                this.speedY = Math.max(this.speedY - GRAVITY * deltaTime, -MAX_FALL_SPEED);
            }
        }
    }

    setState(newState) {
        if (newState !== this.state) {
            switch (this.state) {
                // on leave state actions
                case STATE_NORMAL:
                    break;
                case STATE_JUMP:
                    this.timers.varJump = 0;
                    break;
                case STATE_DASH_FREEZE:
                    this.timers.dashFreeze = 0;
                    this.timers.jumpGrace = 0;
                    break;
                case STATE_DASH:
                    this.timers.dash = 0;
                    break;
                case STATE_DEAD:
                    break;
            }
            switch (newState) {
                // on enter state actions
                case STATE_NORMAL:
                    break;
                case STATE_JUMP:
                    this.timers.jumpGrace = 0;
                    this.timers.varJump = VAR_JUMP_TIME;
                    this.inputs.jumpPressedBuffer = false;
                    break;
                case STATE_DASH_FREEZE:
                    this.timers.dashFreeze = DASH_FREEZE_TIME;
                    this.timers.dashCooldown = DASH_COOLDOWN;
                    break;
                case STATE_DASH:
                    this.timers.dash = DASH_TIME;
                    this.nbDashes -= 1;
                    break;
                case STATE_DEAD:
                    this.timers.dying = DYING_TIME;
                    break;
            }
            this.state = newState;
        }
    }

    die() {
        this.setState(STATE_DEAD);
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
        this.setState(STATE_NORMAL);
        this.nbDashes = 1;
    }

    squish() {
        this.die();
    }

    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.inputs.xAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.inputs.xAxis === 1 && solid.x === this.x + this.width)
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
            const riding = this.scene.actors.filter(x => x.isRiding(this));
            // const riding = this.scene.actors.filter(x => x.ridingSolid === this);
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;

                if (moveX > 0) {
                    for (const actor of this.scene.actors) {
                        if (this.overlaps(actor)) {
                            actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveX(moveX);
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
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
                    for (const actor of this.scene.actors) {
                        if (this.overlaps(actor)) {
                            actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveY(moveY);
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
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
}
