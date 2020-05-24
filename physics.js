const MAX_SPEED = 45;
const RUNNING_ACCELERATION = 15;
const AIR_ACCELERATION = 10;
const FALLING_ACCELERATION = 10;
const MAX_FALL_SPEED = 140;
const VERTICAL_JUMP_SPEED = -115;
const HORIZONTAL_JUMP_BOOST = 40;
const GROUND_FRICTION = 20;
const AIR_FRICTION = 10;
const HIGH_JUMP_TIME = 6;
const dt = 1/200;


class Actor {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    moveX(amount, onCollide = undefined) {
        if (amount === 0) return;
        const d = Math.sign(amount);
        let newX = this.x + amount;
        let collisionSolid = undefined;
        for (const solid of solids) {
            const solidX = amount > 0 ? solid.x : solid.x + solid.width;
            if (solid.y < this.y && this.y < solid.y + solid.height && this.x * d <= solidX * d && solidX * d < newX * d) {
                collisionSolid = solid;
                newX = solidX;
            }
        }
        this.x = newX;
        if (collisionSolid && onCollide) {
            onCollide();
        }
    }

    moveY(amount, onCollide = undefined) {
        if (amount === 0) return;
        const d = Math.sign(amount);
        let newY = this.y + amount;
        let collisionSolid = undefined;
        for (const solid of solids) {
            const solidY = amount > 0 ? solid.y : solid.y + solid.height;
            if (solid.x < this.x && this.x < solid.x + solid.width && this.y * d <= solidY * d && solidY * d < newY * d) {
                collisionSolid = solid;
                newY = solidY;
            }
        }
        this.y = newY;
        if (collisionSolid && onCollide) {
            onCollide();
        }
    }
}


class Physics extends Actor {
    constructor() {
        super(3, 24);
        this.speedX = 0;
        this.speedY = 0;
        this.jumpCounter = 0;
    }

    hasInput(input) {
        return pressedKeys.has(keymap[input]);
    }

    update() {
        // update counters
        if (this.jumpCounter) this.jumpCounter -= 1;

        // check if grounded
        let grounded = false;
        for (const solid of solids) {
            if (this.y === solid.y && solid.x < this.x && this.x < solid.x + solid.width) {
                grounded = true;
                break;
            }
        }

        let sx = Math.abs(this.speedX);     // absolute value of the speed of the player
        let dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        let ix;     // 1 if player is pushing in the direction he's moving, -1 if he's pushing opposite his movement, 0 if not pushing at all
        if (this.hasInput('right') && !this.hasInput('left')) {
            ix = dx;
        } else if (this.hasInput('left') && !this.hasInput('right')) {
            ix = -dx;
        } else {
            ix = 0;
        }

        if (grounded) {
            // ground friction
            if (ix <= 0) {
                // player is not pushing in the direction he's moving
                sx = Math.max(sx - GROUND_FRICTION, 0);
            } else if (sx > MAX_SPEED) {
                sx = Math.max(sx - GROUND_FRICTION, MAX_SPEED);
            }

            // player acceleration
            if (ix === 1 && sx < MAX_SPEED) {
                sx = Math.min(sx + RUNNING_ACCELERATION, MAX_SPEED);
            } else if (ix === -1) {
                sx -= RUNNING_ACCELERATION;
            }

            if (this.hasInput('jump')) {
                this.jumpCounter = HIGH_JUMP_TIME;
                this.speedY = VERTICAL_JUMP_SPEED;
                sx += ix * HORIZONTAL_JUMP_BOOST;
            }
        } else {
            // airborne
            if (this.hasInput('jump') && this.jumpCounter) {
                this.speedY = VERTICAL_JUMP_SPEED;
            } else {
                this.jumpCounter = 0;
                this.speedY = Math.min(this.speedY + FALLING_ACCELERATION, MAX_FALL_SPEED);
            }

            if (sx > MAX_SPEED) {
                sx = Math.max(sx - AIR_FRICTION, MAX_SPEED);
            }
            if (ix === 1 && sx < MAX_SPEED) {
                sx = Math.min(sx + RUNNING_ACCELERATION, MAX_SPEED);
            } else if (ix === -1) {
                sx -= AIR_ACCELERATION;
            }
        }

        this.speedX = dx * sx;
        this.moveX(this.speedX * dt, () => this.speedX = 0);
        this.moveY(this.speedY * dt, () => this.speedY = 0);
    }

    draw() {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, 1, 1);
    }
}


class Solid {
    constructor(x, y, width, height) {
        this.x = x - 1;
        this.y = y - 1;
        this.width = width + 1;
        this.height = height + 1;
    }

    draw() {
        ctx.fillStyle = '#888888';
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 1, this.height - 1);
    }
}


solids = [
    new Solid(2, 46, 60, 1),
    new Solid(15, 41, 10, 5),
    new Solid(35, 41, 10, 5),
    new Solid(29, 41, 2, 1),
    new Solid(20, 35, 4, 1),
    new Solid(30, 30, 4, 1),
    new Solid(20, 25, 4, 1),
    new Solid(30, 20, 4, 1),
    new Solid(38, 20, 10, 3),
    new Solid(46, 31, 10, 13),
    new Solid(56, 43, 1, 1),
    new Solid(56, 37, 1, 1),
    new Solid(56, 31, 1, 1),
];
