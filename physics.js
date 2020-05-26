function segmentsOverlap(left1, size1, left2, size2) {
    return left1 < left2 + size2 && left2 < left1 + size1;
}

class Actor {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.grounded = false;
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


class Player extends Actor {
    constructor() {
        super(START_POSITION_X * GRID_SIZE, START_POSITION_Y * GRID_SIZE, 12, 16);
        this.speedX = 0;
        this.speedY = 0;

        this.lastGrounded = 0;
        this.jumpStartTime = 0;
        this.canJump = true;
    }

    hasInput(input) {
        return pressedKeys.has(keymap[input]);
    }

    update() {
        // get inputs
        const hasInputRight = this.hasInput('right') && !this.hasInput('left');
        const hasInputLeft = this.hasInput('left') && !this.hasInput('right');

        // check if grounded
        this.grounded = false;
        for (const solid of solids) {
            if (this.y === solid.y + solid.height && segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                this.grounded = true;
                break;
            }
        }
        if (this.grounded) {
            this.canJump = true;
            this.lastGrounded = timeNow;
        }

        let sx = Math.abs(this.speedX);        // absolute value of the speed of the player
        let dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        let ix;     // 1 if player is pushing in the direction he's moving, -1 if he's pushing opposite his movement, 0 if not pushing at all
        if (hasInputRight) {
            ix = dx;
        } else if (hasInputLeft) {
            ix = -dx;
        } else {
            ix = 0;
        }

        const mult = this.grounded ? 1 : AIR_FACTOR;
        // horizontal movement
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
        if (this.hasInput('jump') &&
            this.canJump &&
            timeNow - this.lastGrounded <= JUMP_GRACE_TIME) {
            this.speedY = JUMP_SPEED;
            sx += ix * JUMP_HORIZONTAL_BOOST;
            this.canJump = false;
            this.jumpStartTime = timeNow;
        } else if (this.hasInput('jump') &&
            timeNow - this.jumpStartTime <= VAR_JUMP_TIME) {
            this.speedY = JUMP_SPEED;
        } else if (!this.grounded) {
            this.jumpStartTime = 0;
            this.speedY = Math.max(this.speedY - GRAVITY * deltaTime, -MAX_FALL_SPEED);
        }
        this.speedX = dx * sx;

        this.moveX(this.speedX * deltaTime, () => this.speedX = 0);
        this.moveY(this.speedY * deltaTime, () => this.speedY = 0);

        // check if dead
        if (this.y < 0) {
            this.die();
        }
    }

    draw() {
        ctx.fillStyle = this.grounded ? '#0000FF' : '#FF0000';
        ctx.fillRect(this.x, HEIGHT - this.y - this.height, this.width, this.height);
    }

    die() {
        this.x = START_POSITION_X * GRID_SIZE;
        this.y = START_POSITION_Y * GRID_SIZE;
    }

    squish() {
        this.die();
    }

    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.hasInputLeft && solid.x + solid.width === this.x) ||
                    (this.hasInputRight && solid.x === this.x + this.width)
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
        ctx.fillStyle = '#888888';
        ctx.fillRect(this.x, HEIGHT - this.y - this.height, this.width, this.height);
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
    new Player(),
]

solids = [
    new Solid(0, 0, 14, 6),
    new Solid(9, 3, 6, 5),
    new Solid(20, 0, 1, 2),
    new Solid(21, 0, 3, 5),
    new Solid(24, 0, 2, 8),
    new Solid(26, 0, 1, 6),
    new SineMovingSolid(29, 5, 4, 1, 34, 10, 4),
    new SineMovingSolid(9, 5, 6, 1, 9, 15, 6),
    new Solid(36, 0, 3, 30),
];
