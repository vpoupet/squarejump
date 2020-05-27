function segmentsOverlap(start1, size1, start2, size2) {
    return start1 < start2 + size2 && start2 < start1 + size1;
}

const STATE_IDLE = 0;
const STATE_JUMP = 1;
const STATE_DASH = 2;

class Actor {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.xRemainder = 0;
        this.yRemainder = 0;
    }

    moveX(amount, onCollide = undefined) {
        this.xRemainder += amount;
        let move = Math.round(this.xRemainder);
        this.xRemainder -= move;

        if (move) {
            let newX = this.x + move;
            let collisionSolid = undefined;
            if (move > 0) {
                for (const solid of solids) {
                    if (solid.collidable &&
                        this.x + this.width <= solid.x && solid.x < newX + this.width &&
                        segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                        newX = solid.x - this.width;
                        collisionSolid = solid;
                    }
                }
            } else {
                for (const solid of solids) {
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
                for (const solid of solids) {
                    if (solid.collidable &&
                        this.y + this.height <= solid.y && solid.y < newY + this.height &&
                        segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                        newY = solid.y - this.height;
                        collisionSolid = solid;
                    }
                }
            } else {
                for (const solid of solids) {
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


class PlayerInputs {
    constructor() {
        this.XAxis = 0;
        this.YAxis = 0;
        this.jumpPressTime = 0;
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

    update() {
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
            this.jumpPressTime = timeNow;
            this.jumpPressedBuffer = true;
        }
        this.jumpPressedBuffer = this.jumpPressedBuffer && (timeNow - this.jumpPressTime <= JUMP_BUFFER_TIME);

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap['dash']);
        if (!prevDash && this.dashHeld) {
            this.dashPressTime = timeNow;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (timeNow - this.dashPressTime <= DASH_BUFFER_TIME);
    }
}


class Player extends Actor {
    constructor(x, y) {
        super(x * GRID_SIZE, y * GRID_SIZE, 12, 16);
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
        this.color = '#FF0000';
    }

    update() {
        this.inputs.update();

        // check environment
        let isGrounded = false;
        let isWallHugging = false;
        let hasWallLeft = false;
        let hasWallRight = false;
        for (const solid of solids) {
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

        // update player color
        this.color = this.nbDashes > 0 ? '#FF0000' : '#0000FF';

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
                // this.speedX = this.dashX * this.dashSpeed;
                // this.speedY = this.dashY * this.dashSpeed;
                // this.dashCooldownTimer = DASH_COOLDOWN;
                // this.dashTimer = DASH_TIME;
                // this.nbDashes -= 1;
                // this.state = STATE_DASH;
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

        // check if dead
        if (this.y <= -this.height) {
            this.die();
        }
    }

    draw() {
        ctx[1].fillStyle = this.color;
        ctx[1].fillRect(this.x, HEIGHT - this.y - this.height, this.width, this.height);
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


class Solid {
    constructor(x, y, width, height) {
        this.x = x * GRID_SIZE;
        this.y = y * GRID_SIZE;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.width = width * GRID_SIZE;
        this.height = height * GRID_SIZE;
        this.collidable = true;
    }

    draw() {
        ctx[1].fillStyle = '#888888';
        ctx[1].fillRect(this.x, HEIGHT - this.y - this.height, this.width, this.height);
    }

    isOverlapping(actor) {
        return (this.x + this.width > actor.x &&
            actor.x + actor.width > this.x &&
            this.y + this.height > actor.y &&
            actor.y + actor.height > this.y);
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
                        if (this.isOverlapping(actor)) {
                            actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveX(moveX);
                        }
                    }
                } else {
                    for (const actor of actors) {
                        if (this.isOverlapping(actor)) {
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
                        if (this.isOverlapping(actor)) {
                            actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                        } else if (riding.includes(actor)) {
                            actor.moveY(moveY);
                        }
                    }
                } else {
                    for (const actor of actors) {
                        if (this.isOverlapping(actor)) {
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

    update() {}
}


class SineMovingSolid extends Solid {
    constructor(x, y, width, height, endX, endY, period) {
        super(x, y, width, height);
        this.startX = x * GRID_SIZE;
        this.startY = y * GRID_SIZE;
        this.endX = endX * GRID_SIZE;
        this.endY = endY * GRID_SIZE;
        this.period = period;
        this.angle = 0;
    }

    update() {
        super.update();
        this.angle += deltaTime * 2 * Math.PI / this.period;
        this.angle %= 2 * Math.PI;
        const ratio = (Math.cos(this.angle) + 1) / 2;
        const newX = ratio * this.startX + (1 - ratio) * this.endX;
        const newY = ratio * this.startY + (1 - ratio) * this.endY;
        this.move(newX - this.x - this.xRemainder, newY - this.y - this.yRemainder);
    }
}

actors = [
    new Player(2, 6),
]

solids = [
    new Solid(0, 0, 14, 6),
    new Solid(9, 3, 6, 5),
    new Solid(20, 0, 1, 2),
    new Solid(21, 0, 3, 5),
    new Solid(24, 0, 2, 8),
    new Solid(26, 0, 1, 6),
    new SineMovingSolid(29, 5, 4, 1, 34, 10, 4),
    new SineMovingSolid(16, 5, 6, 1, 16, 15, 6),
    new Solid(36, 0, 3, 11),
    new Solid(36, 13, 3, 14),
    new Solid(30, 13, 3, 14),
    new Solid(10, 20, 2, 1),
    new Solid(2, 26, 2, 1),
];
