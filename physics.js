"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const sound = require('./sound');

const U = constants.GRID_SIZE;
const ANIMATION_SLOWDOWN = 6;
const PLAYER_ANIMATION_IDLE = [4, 4];
const PLAYER_ANIMATION_RUN = [1, 6];
const PLAYER_ANIMATION_JUMP = [6, 3];
const PLAYER_ANIMATION_FALL = [5, 3];
const PLAYER_ANIMATION_DIE = [0, 8];


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
    constructor(x, y, width, height, tiles = undefined) {
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
        /**
         * Amount by which the element is shifted along the x-axis when drawn (doesn't affect actual physics)
         * @type {number}
         */
        this.shiftX = 0;
        /**
         * Amount by which the element is shifted along the y-axis when drawn (doesn't affect actual physics)
         * @type {number}
         */
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
        this.tiles = tiles;
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
        if (this.tiles !== undefined) {
            let shiftX = this.shiftX;
            let shiftY = this.shiftY;
            if (this.attachedTo) {
                shiftX += this.attachedTo.shiftX;
                shiftY += this.attachedTo.shiftY;
            }
            for (const tileData of this.tiles) {
                ctx.drawImage(
                    graphics.sheets.tiles,
                    16 * tileData.x, 16 * tileData.y,
                    16, 16,
                    this.x + tileData.shiftX + shiftX, this.y + tileData.shiftY + shiftY,
                    8, 8);
            }
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
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    moveTo(x, y, mx = 0, my = 0) {
        this.move(x - this.x - this.xRemainder, y - this.y - this.yRemainder, mx, my);
    }

    /**
     * Sets the element back to its original state (used when Scene is reset)
     */
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.isActive = true;
        for (const timer in this.timers) {
            this.timers[timer] = 0;
        }
        this.effects.length = 0;    // clear all effects
    }

    /**
     * Adds an effect to the SceneElement
     * @param effect {Effect} the Effect that is added
     * @returns {SceneElement} the SceneElement
     */
    addEffect(effect) {
        this.effects.push(effect);
        return this;
    }

    /**
     * Removes an effect on the SceneElement
     * @param effect {Effect} the Effect to remove
     * @returns {SceneElement} the SceneElement
     */
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
        /**
         * Momentum held along the x-axis (given by carrying Solids)
         * This attribute should be set using Actor.setMomentumX() to initalize the associated timer
         * @type {number}
         */
        this.momentumX = 0;
        /**
         * Momentum held along the y-axis (given by carrying Solids)
         * This attribute should be set using Actor.setMomentumY() to initalize the associated timer
         * @type {number}
         */
        this.momentumY = 0;
        /**
         * Timer for storing momentum along the x-axis
         * @type {number}
         */
        this.timers.momentumX = 0;
        /**
         * Timer for storing momentum along the y-axis
         * @type {number}
         */
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
     * Method called when the Actor collides with a Solid while being pushed by another
     */
    squish() {}

    /**
     * Method called when the Actor dies
     */
    die() {}

    /**
     * Sets the value of this.mx and starts the associated timer
     * @param mx {number} value of momentum along the x-axis
     */
    setMomentumX(mx) {
        if (mx) {
            this.momentumX = mx;
            this.timers.momentumX = constants.MOMENTUM_STORE_TIME;
        }
    }

    /**
     * Sets the value of this.my and starts the associated timer
     * @param my {number} value of momentum along the y-axis
     */
    setMomentumY(my) {
        if (my) {
            this.momentumY = my;
            this.timers.momentumY = constants.MOMENTUM_STORE_TIME;
        }
    }
}


class PlayerCharacter extends Actor {
    constructor(player, x = 0, y = 0) {
        super(x, y, 8, 14);
        /**
         * Associated Player
         */
        this.player = player;
        /**
         * Current speed along x-axis
         * @type {number}
         */
        this.speedX = 0;
        /**
         * Current speed along y-axis
         * @type {number}
         */
        this.speedY = 0;
        /**
         * Current dashing speed along x-axis
         * @type {number}
         */
        this.dashSpeedX = 0;
        /**
         * Current dashing speed along y-axis
         * @type {number}
         */
        this.dashSpeedY = 0;
        /**
         * Number of available dashes (should be 1 or 0)
         * @type {number}
         */
        this.nbDashes = 1;
        /**
         * Whether the character is standing on a solid
         * (set automatically during update)
         * @type {boolean}
         */
        this.isGrounded = true;
        /**
         * Whether the character is against a wall (and pressing the direction towards the wall)
         * (set automatically during update)
         * @type {boolean}
         */
        this.isHuggingWall = false;
        /**
         * Whether there is a climbable Solid to the left of the character at a distance of at most
         * constants.WALL_JUMP_CHECK_DISTANCE
         * (set automatically during update)
         * @type {boolean}
         */
        this.hasWallLeft = false;
        /**
         * Whether there is a climbable Solid to the right of the character at a distance of at most
         * constants.WALL_JUMP_CHECK_DISTANCE
         * (set automatically during update)
         * @type {boolean}
         */
        this.hasWallRight = false;
        /**
         * Set of Strawberries that have been taken by the character in the current Scene
         * - if the player dies, these Strawberries are reactivated in the Scene (and the player must take them again)
         * - if the player changes Scene, these Strawberries are removed from the Scene and stored as "regular"
         *     Strawberries for the player.
         * @type {Set<Strawberry>}
         */
        this.temporaryStrawberries = new Set();
        /**
         * Set of Strawberries that have been permanently taken by the player
         * @type {Set<Strawberry>}
         */
        this.strawberries = new Set();

        /**
         * Current state of the PlayerCharacter
         * @type {number}
         */
        this.state = constants.STATE_NORMAL;
        /**
         * Direction that the character is facing (1 if facing right, -1 if facing left)
         * @type {number}
         */
        this.spriteDirection = 1;
        /**
         * Row of the currently playing sprite animation in the sprite sheet
         *
         * This value corresponds to the row in the "simple" sprite sheet. The real sprite sheets used have 4 copies
         * of each row (two directions and two colors, whether the player can dash or not) so the actual row used when
         * drawing the sprite is (4 * this.spriteRow + k) where 0 ≤ k ≤ 3 depends on the state of the player.
         * @type {number}
         */
        this.spriteRow = 1;
        /**
         * Number of sprites in the currently playing sprite animation
         * @type {number}
         */
        this.nbSprites = 4;
        /**
         * Counter to detemine which sprite of the current animation should be drawn
         *
         * The counter is incremented by 1 at each frame so the index of the sprite drawn is
         * ~~(this.animationCount / ANIMATION_SLOWDOWN) % this.nbSprites
         * @type {number}
         */
        this.animationCounter = 0;

        // timers
        /**
         * Delay after leaving the ground during which the player is still allowed to jump ("Coyote time")
         * @type {number}
         */
        this.timers.jumpGrace = 0;
        /**
         * Cooldown duration of dash (impossible to dash during this time)
         * @type {number}
         */
        this.timers.dashCooldown = 0;
        /**
         * Short time during which the player is frozen in place when dashing
         * @type {number}
         */
        this.timers.dashFreeze = 0;
        /**
         * Duration of the dash (speed is fixed during this time period)
         * @type {number}
         */
        this.timers.dash = 0;
        /**
         * Duration after a jump during which the player has a fixed upwards speed if the jump button is held
         * @type {number}
         */
        this.timers.varJump = 0;
        /**
         * Time interval after the player dies before it respawns
         * @type {number}
         */
        this.timers.dying = 0;
        /**
         * Duration after touching a Spring during which the upwards speed of the player is fixed
         * @type {number}
         */
        this.timers.bounce = 0;
    }

    draw(ctx) {
        const index = ~~(this.animationCounter / ANIMATION_SLOWDOWN);
        const row = 4 * this.spriteRow + (this.nbDashes ? 0 : 2) + (this.spriteDirection === -1 ? 1 : 0);
        ctx.drawImage(
            graphics.sheets[this.player.color],
            16 * index, 16 * row,
            16, 16,
            this.x - 4 + this.shiftX, this.y - 2 + this.shiftY,
            16, 16);
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.animationCounter += 1;
        this.animationCounter %= this.nbSprites * ANIMATION_SLOWDOWN;

        // check environment
        this.isGrounded = false;
        this.isHuggingWall = false;
        this.hasWallLeft = false;
        this.hasWallRight = false;
        for (const solid of this.scene.solids) {
            if (solid.isActive) {
                if (this.y + this.height === solid.y && segmentsOverlap(this.x, this.width, solid.x, solid.width)) {
                    // player is standing on a solid
                    this.isGrounded = true;
                }
                if (solid.canBeClimbed && segmentsOverlap(this.y, this.height, solid.y, solid.height)) {
                    // check for walls on right and left at distance <= WALL_JUMP_CHECK_DISTANCE
                    const distanceLeft = this.x - solid.x - solid.width;
                    if (0 <= distanceLeft && distanceLeft < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallLeft = true;
                    }
                    const distanceRight = solid.x - this.x - this.width;
                    if (0 <= distanceRight && distanceRight < constants.WALL_JUMP_CHECK_DISTANCE) {
                        this.hasWallRight = true;
                    }

                    if ((this.player.inputs.xAxis === 1 && this.x + this.width === solid.x) ||
                        (this.player.inputs.xAxis === -1 && this.x === solid.x + solid.width)) {
                        // player is hugging a wall
                        this.isHuggingWall = true;
                    }
                }
            }
        }

        if (this.isGrounded) {
            this.timers.jumpGrace = constants.JUMP_GRACE_TIME;
            if (this.state !== constants.STATE_DASH) {
                this.restoreDash();
            }
        }

        this.updateMovement(deltaTime);
        this.updateAnimation();

        this.moveX(this.speedX * deltaTime, () => this.speedX = 0);
        this.moveY(this.speedY * deltaTime, () => this.speedY = 0);

        // interact with Things
        if (this.isActive) {
            for (const thing of this.scene.things) {
                if (thing.isActive && this.overlaps(thing)) {
                    thing.onContactWith(this);
                }
            }
        }

        if (this.y >= this.scene.height) {
            this.die();
        }
    }

    /**
     * Updates the movement of the PlayerCharacter (mostly its speed) according to its current state and player inputs
     * @param deltaTime {number} duration since last update
     */
    updateMovement(deltaTime) {
        switch (this.state) {
            case constants.STATE_DEAD:
                if (this.timers.dying <= 0) {
                    this.scene.shouldReset = true;
                }
                this.speedX = 0;
                this.speedY = 0;
                break;
            case constants.STATE_NORMAL:
                if (this.tryUpdateDash()) break;
                if (this.tryUpdateJump()) break;
                this.updateHorizontalMovement(deltaTime);
                this.updateVerticalMovement(deltaTime);
                break;
            case constants.STATE_JUMP:
                if (this.player.inputs.isPressed("jump") && this.timers.varJump > 0) {
                    this.speedY = Math.min(this.speedY, -constants.JUMP_SPEED);
                } else {
                    this.setState(constants.STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                this.tryUpdateDash();
                break;
            case constants.STATE_DASH:
                if (this.timers.dash > constants.DASH_TIME) {
                    this.speedX = 0;
                    this.speedY = 0;
                } else if (0 < this.timers.dash && this.timers.dash <= constants.DASH_TIME) {
                    this.speedX = this.dashSpeedX;
                    this.speedY = this.dashSpeedY;
                    if (this.tryUpdateJump()) break;
                } else {
                    // end of dash
                    const speed = this.dashSpeedX && this.dashSpeedY ? constants.END_DASH_SPEED / Math.sqrt(2) : constants.END_DASH_SPEED;
                    this.speedX = Math.sign(this.dashSpeedX) * speed;
                    this.speedY = Math.sign(this.dashSpeedY) * speed;
                    if (this.dashSpeedY < 0) {
                        this.speedY *= constants.END_DASH_UP_FACTOR;
                    }
                    this.setState(constants.STATE_NORMAL);
                }
                break;
            case constants.STATE_BOUNCE:
                if (this.timers.bounce > 0) {
                    this.speedY = -constants.BOUNCE_SPEED;
                } else {
                    this.setState(constants.STATE_NORMAL);
                }
                this.updateHorizontalMovement(deltaTime);
                break;
        }
    }

    /**
     * Checks if the character should dash (depending on player input and availability) and starts the dash (if it
     * should).
     *
     * This method is called during updateMovement() if the current state of the PlayerCharacter can be interrupted by
     * a dash.
     * @returns {boolean} whether a dash has started
     */
    tryUpdateDash() {
        if (this.nbDashes > 0 &&
            this.player.inputs.isPressed("dash") &&
            this.player.inputs.timers.dashBuffer > 0 &&
            this.timers.dashCooldown <= 0 &&
            (this.player.inputs.xAxis || this.player.inputs.yAxis)
        ) {
            const dashSpeed = this.player.inputs.xAxis && this.player.inputs.yAxis ? constants.DASH_SPEED / Math.sqrt(2) : constants.DASH_SPEED;
            this.dashSpeedX = this.player.inputs.xAxis * Math.max(Math.abs(this.speedX), dashSpeed);
            this.dashSpeedY = -this.player.inputs.yAxis * dashSpeed;
            this.speedX = 0;
            this.speedY = 0;
            this.timers.dashCooldown = constants.DASH_COOLDOWN + constants.DASH_FREEZE_TIME;
            this.setState(constants.STATE_DASH);
            this.nbDashes -= 1;
            return true;
        }
        return false;
    }

    /**
     * Checks if the character should jump (depending on player input and availability) and starts the dash (if it
     * should).
     *
     * This method is called during updateMovement() if the current state of the PlayerCharacter can be interrupted by
     * a jump.
     * @returns {boolean} whether a jump has started
     */
    tryUpdateJump() {
        let didJump = false;
        if (this.player.inputs.isPressed("jump") &&
            this.player.inputs.timers.jumpBuffer > 0 &&
            this.timers.jumpGrace > 0) {
            // regular jump
            this.speedX += this.player.inputs.xAxis * constants.JUMP_HORIZONTAL_BOOST;
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        } else if (
            this.player.inputs.isPressed("jump") &&
            this.player.inputs.timers.jumpBuffer > 0 &&
            (this.hasWallLeft || this.hasWallRight)) {
            // walljump
            let dx = this.hasWallLeft ? 1 : -1;
            if ((this.player.inputs.xAxis === 1 && this.hasWallRight) || (this.player.inputs.xAxis === -1 && this.hasWallLeft)) {
                this.speedX = 0;
            } else {
                this.speedX = dx * constants.WALL_JUMP_HSPEED;
            }
            this.speedY = -constants.JUMP_SPEED;
            this.setState(constants.STATE_JUMP);
            didJump = true;
        }
        if (didJump) {
            if (this.timers.momentumX > 0) {
                this.speedX += constants.MOMENTUM_FACTOR * this.momentumX;
            }
            if (this.timers.momentumY > 0) {
                this.speedY += constants.MOMENTUM_FACTOR * this.momentumY;
            }
        }
        return didJump;
    }

    /**
     * Updates the horizontal speed (this.speedX) of the PlayerCharacter depending on player input and current
     * situation
     * @param deltaTime
     */
    updateHorizontalMovement(deltaTime) {
        if (this.player.inputs.xAxis !== 0) this.spriteDirection = this.player.inputs.xAxis;

        // horizontal movement
        let sx = Math.abs(this.speedX);        // absolute value of the horizontal speed of the player
        const dx = this.speedX >= 0 ? 1 : -1;    // direction in which the player is moving
        const mult = this.isGrounded ? 1 : constants.AIR_FACTOR;

        // passive deceleration
        if (dx * this.player.inputs.xAxis <= 0) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, 0);
        } else if (sx > constants.MAX_RUN_SPEED) {
            sx = Math.max(sx - constants.RUN_DECELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        }

        // active acceleration
        if (dx * this.player.inputs.xAxis > 0 && sx < constants.MAX_RUN_SPEED) {
            sx = Math.min(sx + constants.RUN_ACCELERATION * deltaTime * mult, constants.MAX_RUN_SPEED);
        } else if (dx * this.player.inputs.xAxis < 0) {
            sx -= constants.RUN_ACCELERATION * deltaTime * mult;
        }
        this.speedX = dx * sx;
    }

    /**
     * Updates the vertical speed (this.speedY) of the PlayerCharacter depending on player input and current
     * situation
     * @param deltaTime
     */
    updateVerticalMovement(deltaTime) {
        if (!this.isGrounded) {
            if (this.isHuggingWall) {
                if (this.player.inputs.yAxis === 1) {
                    this.speedY = -constants.CLIMB_UP_SPEED;
                } else {
                    this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.CLIMB_SLIP_SPEED);
                }
            } else {
                this.speedY = Math.min(this.speedY + constants.GRAVITY * deltaTime, constants.MAX_FALL_SPEED);
            }
        }
    }

    /**
     * Sets the current sprite animation to play depending on the state of the PlayerCharacter
     */
    updateAnimation() {
        if (this.state === constants.STATE_DEAD) {

        } else {
            if (this.isGrounded) {
                if (this.player.inputs.xAxis !== 0) {
                    this.setAnimation(...PLAYER_ANIMATION_RUN);
                } else {
                    this.setAnimation(...PLAYER_ANIMATION_IDLE);
                }
            } else if (this.isHuggingWall) {
                this.setAnimation(...PLAYER_ANIMATION_IDLE);
            } else {
                if (this.speedY > 0) {
                    this.setAnimation(...PLAYER_ANIMATION_FALL);
                } else {
                    this.setAnimation(...PLAYER_ANIMATION_JUMP);
                }
            }
        }
    }

    /**
     * Sets the currently playing sprite animation
     * @param sprite_row {number} row of the animation in the (simple) sprite sheet
     * @param nb_sprites {number} number of sprites in the animation
     */
    setAnimation(sprite_row, nb_sprites) {
        if (sprite_row !== this.spriteRow) {
            this.spriteRow = sprite_row;
            this.animationCounter = 0;
            this.nbSprites = nb_sprites;
        }
    }

    /**
     * Changes the state of the PlayerCharacter
     *
     * If the new state is different from the current state, special actions can be performed when leaving the current
     * state and when entering the new state. This method does nothing if the new state is the same as the current
     * state.
     *
     * @param newState {number} new state of the PlayerCharacter
     */
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
                    sound.playSound(sound.effects.jump);
                    this.timers.jumpGrace = 0;
                    this.player.inputs.timers.jumpBuffer = 0;
                    this.timers.varJump = constants.VAR_JUMP_TIME;
                    break;
                case constants.STATE_DASH:
                    sound.playSound(sound.effects.dash);
                    this.player.inputs.timers.dashBuffer = 0;
                    this.timers.dashCooldown = constants.DASH_COOLDOWN;
                    this.timers.dash = constants.DASH_TIME + constants.DASH_FREEZE_TIME;
                    break;
                case constants.STATE_DEAD:
                    sound.playSound(sound.effects.die);
                    this.timers.dying = constants.DYING_TIME;
                    break;
                case constants.STATE_BOUNCE:
                    this.timers.bounce = constants.BOUNCE_TIME;
                    break;
            }
            this.state = newState;
        }
    }

    /**
     * Executes a transition from a Scene to another (triggered when the PlayerCharacter touches a Transition)
     * @param transition {Transition} the Transition object that triggered the Scene change
     */
    makeTransition(transition) {
        // store temporary strawberries permanently
        for (const strawberry of this.temporaryStrawberries) {
            strawberry.scene.removeThing(strawberry);
            this.strawberries.add(strawberry);
        }
        this.temporaryStrawberries.clear();
        // move PlayerCharacter the the new Scene
        this.scene.removeActor(this);
        transition.targetScene.addActor(this);
        transition.targetScene.spawnPointIndex = transition.spawnPointIndex;
        this.restoreDash();
    }

    squish() {
        this.die();
    }

    die() {
        this.isActive = false;
        this.temporaryStrawberries.clear();
        this.setState(constants.STATE_DEAD);
        this.setAnimation(...PLAYER_ANIMATION_DIE);
    }

    reset() {
        super.reset();
        const point = this.scene.spawnPoints[this.scene.spawnPointIndex];
        this.x = point.x;
        this.y = point.y - 6;
        this.xRemainder = 0;
        this.yRemainder = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.dashSpeedX = 0;
        this.dashSpeedY = 0;
        this.setState(constants.STATE_NORMAL);
        this.restoreDash();
    }

    /**
     * Restores the dash ability to the PlayerCharacter
     * @returns {boolean} true if the PlayerCharacter didn't have a dash when the function was called
     */
    restoreDash() {
        if (this.nbDashes === 1) {
            return false;
        } else {
            this.nbDashes = 1;
            return true;
        }
    }

    /**
     * Returns true if the PlayerCharacter is currently "riding" the Solid given as parameter, meaning that when the
     * Solid moves it should move the PlayerCharacter too.
     * A PlayerCharacter is considered to be riding a Solid it is standing directly on top of it or if it is hugging
     * it (touching on left or right and pressing direction towards the Solid)
     *
     * @param solid {Solid}
     * @returns {boolean} true if the PlayerCharacter is riding the solid
     */
    isRiding(solid) {
        return super.isRiding(solid) ||
            (
                solid.canBeClimbed &&
                segmentsOverlap(this.y, this.height, solid.y, solid.height) &&
                (
                    (this.player.inputs.xAxis === -1 && solid.x + solid.width === this.x) ||
                    (this.player.inputs.xAxis === 1 && solid.x === this.x + this.width)
                )
            );
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
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
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

    /**
     * Moves the Solid by a given amount
     *
     * After the Solid is moved, all Actors of the Scene must be checked
     * - Actors that overlap the new position of the Solid must be pushed
     * - Actors that are riding the solid must be carried
     *
     * The implementation is close to the description of the Celeste and Towerfall engine :
     * https://medium.com/@MattThorson/celeste-and-towerfall-physics-d24bd2ae0fc5
     * (with some modifications, for instance the fact that the Solid is moved by its full amount in one step, not
     * 1 pixel at a time)
     *
     * @param dx {number} number of pixels to move right
     * @param dy {number} number of pixels to move down
     * @param mx {number} momentum along the x-axis (optional)
     * @param my {number} momentum along the y-axis (optional)
     */
    move(dx, dy, mx = 0, my = 0) {
        // move all attached elements
        for (const thing of this.attachedElements) {
            thing.move(dx, dy, mx, my);
        }

        this.xRemainder += dx;
        this.yRemainder += dy;
        const moveX = Math.round(this.xRemainder);  // integer amount to move
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
                                // push actors that overlap with this after move
                                actor.moveX(this.x + this.width - actor.x, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
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
                                // push actors that overlap with this after move
                                actor.moveX(this.x - actor.x - actor.width, () => actor.squish());
                                actor.setMomentumX(mx);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
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
                                // push actors that overlap with this after move
                                actor.moveY(this.y + this.height - actor.y, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
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
                                // push actors that overlap with this after move
                                actor.moveY(this.y - actor.y - actor.height, () => actor.squish());
                                actor.setMomentumY(my);
                            } else if (riding.has(actor)) {
                                // carry actors that are riding this
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
 * Platforms are flat Solids (0 height) that Actors can pass through when moving upwards but not downwards (if they are
 * entirely higher than the Platform)
 *
 * Contrary to regular Solids, Platforms are allowed to overlap with Actors.
 */
class Platform extends Solid {
    constructor(x, y, width, tiles) {
        super(x, y, width, 0, tiles);
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
 * CrumblingBlocks are Solids that disappear shortly after a Player hits it (only when the Player is considered to be
 * "carried" by the CrumblingBlock).
 * They reappear after a given time (if there are no Actors on their position)
 */
class CrumblingBlock extends Solid {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(57)]);
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
    constructor(x, y, width, height, delay, movement, tiles = undefined) {
        if (tiles === undefined) {
            tiles = [];
            for (let i = 0; i < height; i += U) {
                for (let j = 0; j < width; j += U) {
                    const index = 64 + Math.floor(Math.random() * 4);
                    tiles.push(new graphics.TileData(index, j, i));
                }
            }
        }
        super(x, y, width, height, tiles);
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
}


/**
 * FallingBlocks are TriggerBlocks that fall when triggered by an Actor
 *
 * Their behavior is the same as a TriggerBlock (the fall is defined by the associated movement) but are represented
 * with different tiles.
 */
class FallingBlock extends TriggerBlock {
    constructor(x, y, width, height, delay, movement) {
        const tiles = [];
        tiles.push(new graphics.TileData(3));
        tiles.push(new graphics.TileData(5, width - U, 0));
        tiles.push(new graphics.TileData(16, 0, height - U));
        tiles.push(new graphics.TileData(18, width - U, height - U));
        for (let x = U; x < width - U; x += U) {
            tiles.push(new graphics.TileData(4, x, 0));
            tiles.push(new graphics.TileData(17, x, height - U));
        }
        for (let y = U; y < height - U; y += U) {
            tiles.push(new graphics.TileData(8, 0, y));
            tiles.push(new graphics.TileData(10, width - U, y));
        }
        for (let x = U; x < width - U; x += U) {
            for (let y = U; y < height - U; y += U) {
                tiles.push(new graphics.TileData(9, x, y));
            }
        }
        super(x, y, width, height, delay, movement, tiles);
    }
}


/**
 * Things are SceneElements that do not interact with Solid physics, but can have an effect when an Actor touches them
 */
class Thing extends SceneElement {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
    }

    /**
     * Action to execute when an Actor touches the Thing
     * @param actor {Actor} the Actor that touches the Thing
     */
    onContactWith(actor) {}
}


/**
 * Hazards are Things that kill the Actor on contact
 */
class Hazard extends Thing {
    constructor(x, y, width, height, tiles = undefined) {
        super(x, y, width, height, tiles);
    }

    onContactWith(actor) {
        actor.die();
    }
}


/**
 * Springs are SceneElements that throw Players up on contact
 */
class Spring extends Thing {
    constructor(x, y) {
        const tiles1 = [
            new graphics.TileData(52, 0, -U / 2),
            new graphics.TileData(53, U, -U / 2)
        ];
        const tiles2 = [
            new graphics.TileData(54, 0, -U / 2),
            new graphics.TileData(55, U, -U / 2)
        ]
        super(x, y + U / 2, 2 * U, U / 2, tiles1);
        this.tiles1 = tiles1;
        this.tiles2 = tiles2;
        this.timers.extended = 0;
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter) {
            sound.playSound(sound.effects.spring);
            actor.setState(constants.STATE_BOUNCE);
            actor.speedX = 0;
            actor.speedY = constants.BOUNCE_SPEED;
            actor.restoreDash();
            this.timers.extended = .25;
        }
    }

    draw(ctx) {
        this.tiles = (this.timers.extended > 0) ? this.tiles2 : this.tiles1;
        super.draw(ctx);
    }
}


/**
 * DashDiamonds are SceneElements that restore the dash counter of the Players who touch them
 */
class DashDiamond extends Thing {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(21)]);
    }

    update(deltaTime) {
        super.update(deltaTime)
        if (!this.isActive && this.timers.cooldown <= 0) {
            this.isActive = true;
        }
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter && actor.isActive) {
            if (actor.restoreDash()) {
                sound.playSound(sound.effects.dashDiamond);
                this.isActive = false;
                this.timers.cooldown = 2;
            }
        }
    }

    draw(ctx) {
        if (this.isActive) {
            super.draw(ctx);
        }
    }
}


/**
 * Strawberries are collectibles that Players take on contact.
 * If a Player dies after collecting a Strawberry before changing Scene, the Strawberry is restored in the Scene
 * (and removed from the Player's list of collected Strawberries)
 */
class Strawberry extends Thing {
    constructor(x, y) {
        super(x, y, U, U, [new graphics.TileData(13)]);
    }

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter && actor.isActive) {
            sound.playSound(sound.effects.strawberry);
            actor.temporaryStrawberries.add(this);
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
 * SpikesUp are Hazards that kill an Actor if it moves downwards on them
 */
class SpikesUp extends Hazard {
    constructor(x, y) {
        super(x, y + U / 2, U, U / 2, [new graphics.TileData(40, 0, -U / 2)]);
    }

    onContactWith(actor) {
        if (actor.movedY - this.movedY >= 0) {
            actor.die();
        }
    }
}


/**
 * SpikesDown are Hazards that kill an Actor if it moves upwards on them
 */
class SpikesDown extends SceneElement {
    constructor(x, y) {
        super(x, y, U, U / 2, [new graphics.TileData(42)]);
    }

    onContactWith(actor) {
        if (actor.movedY - this.movedY < 0) {
            actor.die();
        }
    }
}


/**
 * SpikesRight are Hazards that kill an Actor if it moves leftwards on them
 */
class SpikesRight extends SceneElement {
    constructor(x, y) {
        super(x, y, U / 2, U, [new graphics.TileData(41)]);
    }

    onContactWith(actor) {
        if (actor.movedX - this.movedX < 0) {
            actor.die();
        }
    }
}


/**
 * SpikesUp are Hazards that kill an Actor if it moves rightwards on them
 */
class SpikesLeft extends SceneElement {
    constructor(x, y) {
        super(x + U / 2, y, U / 2, U, [new graphics.TileData(43, -U / 2, 0)]);
    }

    onContactWith(actor) {
        if (actor.movedX - this.movedX > 0) {
            actor.die();
        }
    }
}


/**
 * Transitions are SceneElements that transfer a Player from one Scene to another on contact
 */
class Transition extends Thing {
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

    onContactWith(actor) {
        if (actor instanceof PlayerCharacter) {
            this.targetScene.reset();
            actor.x += this.targetX - this.x;
            actor.y += this.targetY - this.y;
            actor.makeTransition(this);
            this.scene.transition = this;
        }
    }
}


module.exports = {
    Actor,
    PlayerCharacter,
    Solid,
    Platform,
    CrumblingBlock,
    TriggerBlock,
    FallingBlock,
    Thing,
    Hazard,
    Spring,
    DashDiamond,
    Strawberry,
    SpikesUp,
    SpikesDown,
    SpikesRight,
    SpikesLeft,
    Transition,
}
