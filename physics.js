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
const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
const STATE_IDLE = 0;
const STATE_JUMP = 1;
const STATE_DASH = 2;


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
        if (this.movement) {
            this.movement.update(deltaTime, this);
        }
    }

    move(dx, dy) {}

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
            const riding = this.scene.actors.filter(x => x.isRiding(this));
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
