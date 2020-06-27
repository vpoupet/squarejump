"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const sound = require('./sound');

const U = constants.GRID_SIZE;


/**
 * Tests whether two segments on a 1D line overlap.
 *
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
 * SceneElements are the superclass of all objects that appear in a scene (obstacles, platforms, players, hazards,
 * decorations, etc.)
 *
 * All Elements are represented as axis-aligned bounding boxes and the space they occupy in a scene is therefore defined
 * as a position (x, y) and a size (width, height). At all times, positions and sizes should be integers. Sub-integer
 * positions are considered with the use of the `xRemainder` and `yRemainder` attributes (that should have an absolute
 * value < 1)
 */
class SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        /**
         * x-coordinate of the leftmost side of the bounding box (in pixels)
         * @type {number}
         */
        this.x = x;
        /**
         * y-coordinate of the leftmost side of the bounding box (in pixels)
         * @type {number}
         */
        this.y = y;
        /**
         * initial x-coordinate (used for reset())
         */
        this.startX = x;
        /**
         * initial y-coordinate (used for reset())
         */
        this.startY = y;
        this.shiftX = 0;
        this.shiftY = 0;
        /**
         * width of the SceneElement (in pixels)
         * @type {number}
         */
        this.width = width;
        /**
         * height of the SceneElement (in pixels)
         * @type {number}
         */
        this.height = height;
        /**
         * fractional part of the x-position of the SceneElement (position of an element should always be an integer,
         * but fractional parts of the computed position can be remembered for next move)
         * @type {number}
         */
        this.xRemainder = 0;
        /**
         * fractional part of the y-position of the SceneElement (position of an element should always be an integer,
         * but fractional parts of the computed position can be remembered for next move)
         * @type {number}
         */
        this.yRemainder = 0;
        /**
         * Amount moved on the x-axis since last update
         * (reset by beforeUpdate(), incremented automatically by this.move())
         * @type {number}
         */
        this.movedX = 0;
        /**
         * Amount moved on the y-axis since last update
         * (reset by beforeUpdate(), incremented automatically by this.move())
         * @type {number}
         */
        this.movedY = 0;
        /**
         * Whether the SceneElement should be considered by the Engine or not (inactive SceneElements are ignored when
         * interactions are computed)
         * @type {boolean}
         */
        this.isActive = true;
        /**
         * Information about the tile used to represent the SceneElement (if represented by a single tile)
         * @type {undefined}
         */
        this.tileData = tileData;
        /**
         * Current effects applied to the SceneElement
         * @type {[Effect]}
         */
        this.effects = [];
        /**
         * Scene in which the SceneElement is included
         * @type {undefined}
         */
        this.scene = undefined;
        /**
         * Dictionary of timers (numbers) that are automatically decremented at each update
         * @type {{number}}
         */
        this.timers = {};
        /**
         * Set of SceneElements that are attached to the SceneElement
         * Whenever `this` is moved, all attached Elements will also be moved by the same amount
         *
         * Warning: Because of the special constraints on Actor positions, Actors should not be attached to a
         * SceneElement. The particular case of Actors "riding" a Solid is handled separately in the Solid.move()
         * method.
         * @type {Set<SceneElement>}
         */
        this.attachedElements = new Set();
        /**
         * The SceneElement to which this is attached, if any
         * @type {SceneElement}
         */
        this.attachedTo = undefined;
    }

    /**
     * Returns true if the bounding rectangle of `this` overlaps the bounding rectangle of `other`.
     *
     * Two SceneElements overlap if for both dimensions the end position of each SceneElement is strictly greater than
     * the start position of the other.
     *
     * @param other {SceneElement}
     * @returns {boolean|boolean}
     */
    overlaps(other) {
        return (this.x + this.width > other.x &&
            other.x + other.width > this.x &&
            this.y + this.height > other.y &&
            other.y + other.height > this.y);
    }

    /**
     * Draws the SceneElement in the Canvas associated to the Context given as argument
     * @param ctx {CanvasRenderingContext2D} context of the canvas in which the SceneElement is drawn
     */
    draw(ctx) {
        if (this.tileData !== undefined) {
            let shiftX = this.shiftX;
            let shiftY = this.shiftY;
            if (this.attachedTo) {
                shiftX += this.attachedTo.shiftX;
                shiftY += this.attachedTo.shiftY;
            }
            ctx.drawImage(
                graphics.sheets.tiles,
                16 * this.tileData.x, 16 * this.tileData.y,
                16, 16,
                this.x + this.tileData.shiftX + shiftX, this.y + this.tileData.shiftY + shiftY,
                8, 8);
        }
    }

    /**
     * Reset properties at the start of a new update of the Scene
     */
    beforeUpdate() {
        this.movedX = 0;
        this.movedY = 0;
    }

    /**
     * Update the state of the SceneElement (called at each frame when the Scene is active)
     * @param deltaTime {number} time elapsed since last update (in seconds)
     */
    update(deltaTime) {
        // update timers
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        // update effects
        for (const effect of this.effects) {
            effect.update(deltaTime, this);
        }
    }

    /**
     * Moves the SceneElement by a given amount
     * @param dx {number} number of pixels to move right
     * @param dy {number} number of pixels to move down
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    move(dx, dy, mx = 0, my = 0) {
        // move all elements attached to this
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
        }

        // change position
        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        this.xRemainder -= moveX;
        this.x += moveX;
        this.movedX += moveX;
        this.yRemainder -= moveY;
        this.y += moveY;
        this.movedY += moveY;
    }

    /**
     * Move the Scene Element to a given position
     * @param x {number} x-coordinate of the target position
     * @param y {number} y-coordinate of the target position
     */
    moveTo(x, y, mx, my) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder, mx, my);
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.isActive = true;
        for (const timer in this.timers) {
            this.timers[timer] = 0;
        }
        this.effects.length = 0;    // clear all effects
    }

    addEffect(effect) {
        this.effects.push(effect);
        return this;
    }

    removeEffect(effect) {
        const index = this.effects.indexOf(effect);
        if (index !== -1) {
            this.effects.splice(index, 1);
        }
        return this;
    }

    /**
     * Attaches a given SceneElement to this
     * @param element {SceneElement} the SceneElement to attach
     */
    attach(element) {
        this.attachedElements.add(element);
        element.attachedTo = this;
    }

    /**
     * Detaches a given SceneElement to this
     * @param element {SceneElement} the SceneElement to detach
     */
    detach(element) {
        this.attachedElements.delete(element);
        element.attachedTo = undefined;
    }
}


/**
 * Actors are SceneElements in a Scene that cannot pass through Solids (player characters and enemies for instance)
 */
class Actor extends SceneElement {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.momentumX = 0;
        this.momentumY = 0;
        this.timers.momentumX = 0;
        this.timers.momentumY = 0;
    }

    move(dx, dy, mx = 0, my = 0) {
        this.moveX(dx);
        this.moveY(dy);
    }

    /**
     * Move the Actor a given amount on the x-axis
     *
     * This method tries to move the Actor by the given amount on the x-axis but stops if there is a collision with a
     * Solid (the position is set immediately before the overlap with the Solid). If there was a collision, the function
     * given as parameter is called.
     *
     * @param amount {number} amount to move on the x-axis
     * @param onCollide {function()} function to run if the Actor collides with a Solid
     */
    moveX(amount, onCollide = undefined) {
        this.xRemainder += amount;
        let move = Math.round(this.xRemainder);
        this.xRemainder -= move;

        if (move) {
            let newX = this.x + move;
            let collisionSolid = undefined;
            if (move > 0) {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, move, 0)) {
                        if (solid.x - this.width < newX) {
                            newX = solid.x - this.width;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, move, 0)) {
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
                this.movedX += dx;      // if movement was stopped by a Solid, moved distance is an integer
            } else {
                this.movedX += amount;  // if movement was not stopped, moved distance might be fractional
            }
        } else {
            this.movedX += amount;  // movement that is insufficient to move by a pixel is still counted
        }
    }

    /**
     * Move the Actor a given amount on the y-axis
     *
     * This method tries to move the Actor by the given amount on the y-axis but stops if there is a collision with a
     * Solid (the position is set immediately before the overlap with the Solid). If there was a collision, the function
     * given as parameter is called.
     *
     * @param amount {number} amount to move on the x-axis
     * @param onCollide {function()} function to run if the Actor collides with a Solid
     */
    moveY(amount, onCollide = undefined) {
        this.yRemainder += amount;
        let move = Math.round(this.yRemainder);
        this.yRemainder -= move;

        if (move) {
            let newY = this.y + move;
            let collisionSolid = undefined;
            if (move > 0) {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, 0, move)) {
                        if (solid.y - this.height < newY) {
                            newY = solid.y - this.height;
                            collisionSolid = solid;
                        }
                    }
                }
            } else {
                for (const solid of this.scene.solids) {
                    if (solid.isActive && solid.collidesWithMovingActor(this, 0, move)) {
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
                this.movedY += dy;      // if movement was stopped by a Solid, moved distance is an integer
            } else {
                this.movedY += amount;  // if movement was not stopped, moved distance might be fractional
            }
        } else {
            this.movedY += amount;  // movement that is insufficient to move by a pixel is still counted
        }
    }

    /**
     * Returns true if the Actor is currently "riding" the Solid given as parameter, meaning that when the Solid
     * moves it should move the Actor too.
     * An Actor is considered to be riding a Solid it is standing directly on top of it.
     *
     * @param solid {Solid}
     * @returns {boolean} true if the Actor is riding the solid
     */
    isRiding(solid) {
        return this.y + this.height === solid.y && segmentsOverlap(this.x, this.width, solid.x, solid.width);
    }

    /**
     * Method to call when the Actor collides with a Solid while being pushed by another
     */
    squish() {
    }

    setMomentumX(mx) {
        if (mx) {
            this.momentumX = mx;
            this.timers.momentumX = constants.MOMENTUM_STORE_TIME;
        }
    }

    setMomentumY(my) {
        if (my) {
            this.momentumY = my;
            this.timers.momentumY = constants.MOMENTUM_STORE_TIME;
        }
    }
}


/**
 * Solids are SceneElements that Actors cannot pass through. There should never be an Actor overlapping a Solid (unless
 * either one is marked as inactive). When Solids move, they interact with Actors that might otherwise overlap (they
 * might push them, kill them, etc.).
 *
 * Two Solids might overlap, and in general the movement of a Solid is not affected by other Solids.
 */
class Solid extends SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
        /**
         * Whether the Solid should be considered when checking collisions with an Actor
         * This attribute is used automatically by the move() method when the Solid pushes an Actor. It should not be
         * changed in other circumstances (use isActive to disable the Solid).
         * @type {boolean}
         */
        this.collidable = true;
        /**
         * Whether a Player character can climb on (or slowly slide against) the sides of the Solid
         * @type {boolean}
         */
        this.canBeClimbed = true;
    }

    move(dx, dy, mx = 0, my = 0) {
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
        }

        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);
        const moveY = Math.round(this.yRemainder);

        if (moveX || moveY) {
            const riding = new Set();
            for (const actor of this.scene.actors) {
                if (actor.isActive && actor.isRiding(this)) {
                    riding.add(actor);
                }
            }
            this.collidable = false;

            if (moveX) {
                this.xRemainder -= moveX;
                this.x += moveX;
                this.movedX += moveX;

                if (moveX > 0) {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                if (actor.movedX <= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX < moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                                actor.setMomentumX(mx);
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                if (actor.movedX >= 0) {
                                    actor.moveX(moveX);
                                } else if (actor.movedX > moveX) {
                                    actor.moveX(moveX - actor.movedX);
                                }
                                actor.setMomentumX(mx);
                            }
                        }
                    }
                }
            }
            if (moveY) {
                this.yRemainder -= moveY;
                this.y += moveY;
                this.movedY += moveY;

                if (moveY > 0) {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                if (actor.movedY <= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY < moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                                actor.setMomentumY(my);
                            }
                        }
                    }
                } else {
                    for (const actor of this.scene.actors) {
                        if (actor.isActive) {
                            if (this.overlaps(actor)) {
                                actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                if (actor.movedY >= 0) {
                                    actor.moveY(moveY);
                                } else if (actor.movedY > moveY) {
                                    actor.moveY(moveY - actor.movedY);
                                }
                                actor.setMomentumY(my);
                            }
                        }
                    }
                }
            }
            this.collidable = true;
        }
    }

    /**
     * Returns true if the Solid is considered to collide with an Actor moving by a given amount in both axes.
     *
     * To simplify the computation, the function checks if the bounding box of the solid overlaps with the smallest
     * rectangle containing the areas occupied by the Actor at the start and end of its movement.
     *
     * @param actor {Actor}
     * @param dx {number} amount traveled by the Actor on the x-axis from its current position
     * @param dy {number} amount traveled by the Actor on the y-axis from its current position
     * @returns {boolean} whether the Solid overlaps the Actor at any point during its movement
     */
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


/**
 * Hazards are SceneElements that kill the player on contact
 */
class Hazard extends SceneElement {
    constructor(x, y, width, height, tileData = undefined) {
        super(x, y, width, height, tileData);
    }

    onContactWith(player) {
        player.die();
    }
}


/**
 * Platforms are flat Solids (0 height) that Actors can pass through when moving upwards but not downwards (if they are
 * entirely higher than the Platform)
 *
 * Contrary to regular Solids, Platforms are allowed to overlap with Actors.
 */
class Platform extends Solid {
    constructor(x, y, width, tileData) {
        super(x, y, width, 0, tileData);
        this.canBeClimbed = false;
    }

    collidesWithMovingActor(actor, dx = 0, dy = 0) {
        if (dy > 0) {
            return this.collidable &&
                segmentsOverlap(this.x, this.width, actor.x, actor.width) &&
                actor.y + actor.height <= this.y &&
                actor.y + actor.height + dy > this.y;
        }
        return false;
    }
}


/**
 * Springs are SceneElements that throw Actors up on contact
 */
class Spring extends SceneElement {
    constructor(x, y, tileData) {
        super(x, y + U / 2, U, U / 2, tileData);
        this.tileData.shiftY = -U / 2;
    }

    onContactWith(player) {
        sound.playSound(sound.effects.spring);
        player.setState(constants.STATE_BOUNCE);
        player.speedX = 0;
        player.speedY = constants.BOUNCE_SPEED;
        player.restoreDash();
    }
}


/**
 * DashDiamonds are SceneElements that restore the dash counter of the Players who touch them
 */
class DashDiamond extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(21));
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    onContactWith(player) {
        if (player.restoreDash()) {
            sound.playSound(sound.effects.dashDiamond);
            this.isActive = false;
            this.timers.cooldown = 2;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


/**
 * Strawberries are collectibles that Player take on contact.
 * If a Player dies after collecting a Strawberry before changing Scene, the Strawberry is restored in the Scene
 * (and removed from the Player's list of collected Strawberries)
 */
class Strawberry extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(13));
    }

    onContactWith(player) {
        if (player.isActive) {
            sound.playSound(sound.effects.strawberry);
            player.temporaryStrawberries.add(this);
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


/**
 * Transitions are SceneElements that transfer a Player from one Scene to another on contact
 */
class Transition extends SceneElement {
    constructor(x, y, width, height, targetScene, targetX, targetY, spawnPointIndex = 0) {
        super(x, y, width, height);
        /**
         * The Scene to which the Player is taken when touching the Transition
         * @type {Scene}
         */
        this.targetScene = targetScene;
        /**
         * x-coordinate in the target Scene corresponding to this.x (when the Player transitions to the target Scene,
         * its position is set to its current x-position + this.targetX - this.x
         * @type {number}
         */
        this.targetX = targetX;
        /**
         * y-coordinate in the target Scene corresponding to this.y (when the Player transitions to the target Scene,
         * its position is set to its current y-position + this.targetY + this.y
         * @type {number}
         */
        this.targetY = targetY;
        /**
         * The index of the spawn point (in the target Scene's list of spawn points) corresponding to the Transition
         * @type {number}
         */
        this.spawnPointIndex = spawnPointIndex;
    }

    onContactWith(player) {
        this.targetScene.reset();
        player.x += this.targetX - this.x;
        player.y += this.targetY - this.y;
        player.makeTransition(this);
        this.scene.transition = this;
    }
}


/**
 * CrumblingBlocks are Solids that disappear shortly after a Player hits it (only when the Player is considered to be
 * "carried" by the CrumblingBlock).
 * They reappear after a given time (if there are no Actors on their position)
 */
class CrumblingBlock extends Solid {
    constructor(x, y) {
        super(x, y, U, U, new graphics.TileData(57));
        /**
         * Whether the block is disappearing
         * @type {boolean}
         */
        this.isFalling = false;
        /**
         * Timer for disappearance
         * @type {number}
         */
        this.timers.fall = 0;
        /**
         * Timer for reappearance
         * @type {number}
         */
        this.timers.cooldown = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.isFalling) {
            if (this.timers.fall <= 0) {
                this.isFalling = false;
                this.isActive = false;
                this.timers.cooldown = 2;   // duration before reappearing
            }
        } else if (!this.isActive) {
            if (this.timers.cooldown <= 0) {
                let shouldBecomeActive = true;
                for (const actor of this.scene.actors) {
                    if (actor.isActive && this.overlaps(actor)) {
                        shouldBecomeActive = false;
                    }
                }
                if (shouldBecomeActive) {
                    this.isActive = true;
                }
            }
        } else {
            for (const actor of this.scene.actors) {
                if (actor.isRiding(this)) {
                    sound.playSound(sound.effects.crumblingBlock);
                    this.isFalling = true;
                    this.timers.fall = .5;  // duration before disappearing
                    break;
                }
            }
        }
    }

    reset() {
        super.reset();
        this.isFalling = false;
    }

    draw(ctx) {
        if (this.isActive) {
            if (this.isFalling) {
                const alpha = 2 * this.timers.fall;
                ctx.save();
                ctx.globalAlpha = alpha;
                super.draw(ctx);
                ctx.restore();
            } else {
                super.draw(ctx);
            }
        }
    }
}


/**
 * TriggerBlocks are Solids that start moving when they carry an Actor
 */
class TriggerBlock extends Solid {
    constructor(x, y, width, height, delay, movement) {
        super(x, y, width, height);
        /**
         * Whether the block has been triggered by an Actor but has not yet started executing the movement (during
         * trigger delay)
         * @type {boolean}
         */
        this.isTriggered = false;
        /**
         * Time delay before the movement starts when the block is triggered
         * @type {number}
         */
        this.delay = delay;
        /**
         * movement to execute when triggered by an Actor
         * @type {Effect}
         */
        this.triggeredMovement = movement;
        /**
         * Tile indexes to use when drawing the TriggerBlock on the Scene
         * @type {number[]}
         */
        this.spriteIndexes = new Array((width / U) * (height / U)).fill(0).map(_ => 64 + Math.floor(Math.random() * 4));
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.shiftX = 0;
        this.shiftY = 0;
        if (this.isTriggered) {
            if (this.timers.trigger <= 0) {
                this.isTriggered = false;
                this.triggeredMovement.reset();
                this.addEffect(this.triggeredMovement);
            } else {
                this.shiftX = Math.floor(Math.random() * 3) - 1;
                this.shiftY = Math.floor(Math.random() * 3) - 1;
            }
        } else if (this.effects.includes(this.triggeredMovement)) {
            if (this.triggeredMovement.remainingCount === 0) {
                this.removeEffect(this.triggeredMovement);
            }
        } else {
            let shouldTrigger = false;
            for (const actor of this.scene.actors) {
                if (actor.isRiding(this)) {
                    shouldTrigger = true;
                }
            }
            if (shouldTrigger) {
                this.timers.trigger = this.delay;
                this.isTriggered = true;
            }
        }
    }

    reset() {
        super.reset();
        this.isTriggered = false;
        this.triggeredMovement.reset();
    }

    draw(ctx) {
        let index = 0;
        for (let y = this.y; y < this.y + this.height; y += U) {
            for (let x = this.x; x < this.x + this.width; x += U) {
                ctx.drawImage(
                    graphics.sheets.tiles,
                    16 * (this.spriteIndexes[index] % 8), 16 * ~~(this.spriteIndexes[index] / 8),
                    16, 16,
                    x + this.shiftX, y + this.shiftY,
                    8, 8);
                index += 1;
            }
        }
    }
}


class FallingBlock extends TriggerBlock {
    constructor(x, y, width, height, delay, movement) {
        super(x, y, width, height, delay, movement);
        const w = width / U;
        const h = height / U;
        this.spriteIndexes.fill(9);
        this.spriteIndexes[0] = 3;
        this.spriteIndexes[w - 1] = 5;
        this.spriteIndexes[w * (h - 1)] = 16;
        this.spriteIndexes[w * h - 1] = 18;
        for (let i = 1; i < w - 1; i++) {
            this.spriteIndexes[i] = 4;
            this.spriteIndexes[w * (h - 1) + i] = 17;
        }
        for (let i = 1; i < h - 1; i++) {
            this.spriteIndexes[w * i] = 8;
            this.spriteIndexes[w * i + (w - 1)] = 10;
        }
    }
}


/**
 * SpikesUp are Hazards that kill the Player if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, new graphics.TileData(40, 0, -U / 2));
    }

    onContactWith(player) {
        if (player.movedY - this.movedY >= 0) {
            player.die();
        }
    }
}


/**
 * SpikesDown are Hazards that kill the Player if it moves upwards on them
 */
class SpikesDown extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U / 2, new graphics.TileData(42));
    }

    onContactWith(player) {
        if (player.movedY - this.movedY < 0) {
            player.die();
        }
    }
}


/**
 * SpikesRight are Hazards that kill the Player if it moves leftwards on them
 */
class SpikesRight extends SceneElement {
    constructor(x, y) {
        super(x, y, U / 2, U, new graphics.TileData(41));
    }

    onContactWith(player) {
        if (player.movedX - this.movedX < 0) {
            player.die();
        }
    }
}


/**
 * SpikesUp are Hazards that kill the Player if it moves rightwards on them
 */
class SpikesLeft extends SceneElement {
    constructor(x, y, tileData) {
        super(x + U / 2, y, U / 2, U, new graphics.TileData(43, -U / 2, 0));
    }

    onContactWith(player) {
        if (player.movedX - this.movedX > 0) {
            player.die();
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
    FallingBlock,
    CrumblingBlock,
    SpikesUp,
    SpikesDown,
    SpikesLeft,
    SpikesRight,
}
