"use strict";

/**
 * Effects are objects that can be associated to a SceneElement and can execute an action on the element at each frame
 *
 * Effects have a `duration` (associated to a timer) and a `count` that sets the number of times the effect will be
 * executed on the element (for its full duration every time)
 */
class Effect {
    constructor(duration, count = 1) {
        /**
         * Duration of the Effect (in seconds)
         *
         * If the duration is <= 0, the effect is considered to have infinite duration
         * @type {number}
         */
        this.duration = duration;
        /**
         * Number of times that the Effect should be repeated
         *
         * Every time the timer reaches 0, the count is decremented by 1. If the count is 0, the effect is stopped.
         * (if the count is < 0, the effect repeats infinitely)
         * @type {number}
         */
        this.count = count;
        /**
         * Timer to measure the remaining time of the Effect
         * @type {number}
         */
        this.timer = duration;
        /**
         * Number of repetitions left to perform
         * @type {number}
         */
        this.remainingCount = count;
    }

    /**
     * This method is called automatically by the SceneElement on each of its Effects
     * @param deltaTime {number} time elapsed since last update
     * @param element {SceneElement} the element to which the Effect is attached
     */
    update(deltaTime, element) {
        this.timer -= deltaTime;
        if (this.duration > 0 && this.remainingCount && this.timer <= 0) {
            this.remainingCount -= 1;
            if (this.remainingCount) {
                this.timer += this.duration;
            }
        }
    }

    /**
     * Restore the Effect to its initial state
     */
    reset() {
        this.timer = this.duration;
        this.remainingCount = this.count;
    }
}


/**
 * An EffectSequence is a list of effects that are executed one after the other
 * The EffectSequence has no duration of its own. The `count` attribute defines how many times the whole sequence is
 * repeated.
 *
 * Each individual Effect in the sequence has its own duration and number of repetitions
 */
class EffectSequence extends Effect {
    constructor(effects, count = 1) {
        super(0, count);
        /**
         * List of Effects in the sequence
         * @type {[Effect]}
         */
        this.effects = effects;
        /**
         * Index of the currently executing Effect in the sequence
         * @type {number}
         */
        this.index = 0;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        while (this.remainingCount && deltaTime > 0) {
            this.effects[this.index].update(deltaTime, element);
            deltaTime = -this.effects[this.index].timer;
            if (deltaTime > 0) {
                this.index += 1;
                if (this.index >= this.effects.length) {
                    this.index = 0;
                    this.remainingCount -= 1;
                }
                this.effects[this.index].reset();
            }
        }
    }

    reset() {
        super.reset();
        this.index = 0;
        for (const effect of this.effects) {
            effect.reset();
        }
    }
}


/**
 * A LinearMovement moves the SceneElement in a linear trajectory from a starting point to a target point in a given
 * time.
 */
class LinearMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        /**
         * x coordinate of the starting point
         */
        this.x1 = x1;
        /**
         * y coordinate of the starting point
         */
        this.y1 = y1;
        /**
         * x coordinate of the target point
         */
        this.x2 = x2;
        /**
         * y coordinate of the target point
         */
        this.y2 = y2;
        /**
         * momentum of the movement along the x-axis
         * @type {number}
         */
        this.mx = (x2 - x1) / duration;
        /**
         * momentum of the movement along the y-axis
         * @type {number}
         */
        this.my = (y2 - y1) / duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer > 0) {
            const r = this.timer / this.duration;
            element.moveTo(r * this.x1 + (1 - r) * this.x2, r * this.y1 + (1 - r) * this.y2, this.mx, this.my);
        } else {
            element.moveTo(this.x2, this.y2);
        }
    }
}


/**
 * A SineMovement moves the SceneElement back and forth between two points in a sine-based trajectory
 */
class SineMovement extends Effect {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        /**
         * x coordinate of the starting point
         */
        this.x1 = x1;
        /**
         * y coordinate of the starting point
         */
        this.y1 = y1;
        /**
         * x coordinate of the target point
         */
        this.x2 = x2;
        /**
         * y coordinate of the target point
         */
        this.y2 = y2;
        this.duration = duration;
    }

    update(deltaTime, element) {
        super.update(deltaTime, element);
        if (this.timer > 0) {
            const angle = (this.duration - this.timer) * 2 * Math.PI / this.duration;
            const ratio = (Math.cos(angle) + 1) / 2;
            const dratio = Math.PI * Math.sin(angle) / this.duration;
            element.moveTo(
                ratio * this.x1 + (1 - ratio) * this.x2,
                ratio * this.y1 + (1 - ratio) * this.y2,
                dratio * (this.x2 - this.x1),
                dratio * (this.y2 - this.y1)
            );
        } else {
            element.moveTo(this.x1, this.y1);
        }
    }
}


module.exports = {
    Effect,
    EffectSequence,
    LinearMovement,
    SineMovement,
}