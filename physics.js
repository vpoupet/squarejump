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


class FallingBlock extends Solid {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.isActive = true;
        this.isFalling = false;
        this.timers.fall = 0;
        this.timers.cooldown = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isFalling) {
            if (this.timers.fall <= 0) {
                this.isActive = false;
                this.timers.cooldown = 4;
            }
        } else if (!this.isActive) {
            if (this.timers.cooldown <= 0) {
                this.isActive = true;
                this.isFalling = false;
            }
        } else {
            if (this.scene.player && this.scene.player.isRiding(this)) {
                this.isFalling = true;
                this.timers.fall = 1;
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
