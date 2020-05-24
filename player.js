const MAX_SPEED = 45;
const RUNNING_ACCELERATION = 15;
const AIR_ACCELERATION = 15;
const FALLING_ACCELERATION = 10;
const MAX_FALL_SPEED = 140;
const VERTICAL_JUMP_SPEED = -115;
const HORIZONTAL_JUMP_BOOST = 40;
const GROUND_FRICTION = 20;
const AIR_FRICTION = 10;
const HIGH_JUMP_TIME = 6;
const dt = 1/200;

function findCollision(startX, startY, dx, dy) {
    let endX = startX + dx;
    let endY = startY + dy;
    let ratioEnd = 1;
    let verticalCollision = false;
    let horizontalCollision = false;

    let r, x, y;
    for (let block of obstacles) {
        if (dx) {
            // test collision against vertical wall
            x = dx > 0 ? block.x : block.x + block.width;
            r = (x - startX) / dx;
            if (0 <= r && r < ratioEnd) {
                y = startY + r * dy;
                if (block.y < y && y < block.y + block.height) {
                    endX = x;
                    endY = y;
                    ratioEnd = r;
                    verticalCollision = true;
                }
            }
        }
        if (dy) {
            // test collision against floor or ceiling
            y = dy > 0 ? block.y : block.y + block.height;
            r = (y - startY) / dy;
            if (0 <= r && r < ratioEnd) {
                x = startX + r * dx;
                if (block.x < x && x < block.x + block.width) {
                    endX = x;
                    endY = y;
                    ratioEnd = r;
                    horizontalCollision = true;
                }
            }
        }
    }
    return {endX, endY, ratioEnd, verticalCollision, horizontalCollision};
}

class Player {
    constructor() {
        this.x = 3;
        this.y = 24;
        this.speedX = 0;
        this.speedY = 0;
        this.jumpCounter = 0;
    }

    hasInput(input) {
        return pressedKeys.has(keymap[input]);
    }

    move(dx, dy) {
        let {endX, endY, ratioEnd, verticalCollision, horizontalCollision} = findCollision(this.x, this.y, dx, dy);

        this.x = endX;
        this.y = endY;
        if (verticalCollision) {
            this.speedX = 0;
            this.move(0, dy * (1 - ratioEnd));
        } else if (horizontalCollision) {
            this.speedY = 0;
            this.move(dx * (1 - ratioEnd), 0);
        }
    }

    update() {
        // update counters
        if (this.jumpCounter) this.jumpCounter -= 1;

        // check if grounded
        let grounded = false;
        for (const block of obstacles) {
            if (this.y === block.y && block.x < this.x && this.x < block.x + block.width) {
                grounded = true;
                break;
            }
        }

        let sx = Math.abs(this.speedX);     // absolute value of the speed of the player
        let dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        let ix;     // 1 if player is pushing in the direction he's moving, -1 if he's pushing opposite his movement, 0 if not pushing at all
        if (gamepadAPI.buttonPressed('A') || (this.hasInput('right') && !this.hasInput('left'))) {
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
        // console.log(this.speedX);
        this.move(this.speedX * dt, this.speedY * dt);
    }

    draw() {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, 1, 1);
    }
}