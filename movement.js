class Movement {
    constructor(duration, count = 1) {
        this.duration = duration;
        this.timer = 0;
        this.count = count;
        this.remainingCount = count;
    }

    update(deltaTime, thing) {
        this.timer += deltaTime;
        if (this.duration && this.remainingCount && this.timer > this.duration) {
            this.remainingCount -= 1;
            if (this.remainingCount) {
                this.timer -= this.duration;
            }
        }
    }

    reset() {
        this.timer = 0;
        this.remainingCount = this.count;
    }
}


class LinearMovement extends Movement {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1 * GRID_SIZE;
        this.y1 = y1 * GRID_SIZE;
        this.x2 = x2 * GRID_SIZE;
        this.y2 = y2 * GRID_SIZE;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        if (this.timer < this.duration) {
            const r = this.timer / this.duration;
            thing.x = (1 - r) * this.x1 + r * this.x2;
            thing.y = (1 - r) * this.y1 + r * this.y2;
        } else {
            thing.x = this.x2;
            thing.y = this.y2;
        }
    }
}


class SequenceMovement extends Movement {
    constructor(movements, count = 1) {
        super(undefined, count);
        this.movements = movements;
        this.index = 0;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        while (this.remainingCount && deltaTime > 0) {
            this.movements[this.index].update(deltaTime, thing);
            deltaTime = this.movements[this.index].timer - this.movements[this.index].duration;
            if (deltaTime > 0) {
                this.index += 1;
                if (this.index >= this.movements.length) {
                    this.index = 0;
                    this.remainingCount -= 1;
                }
                this.movements[this.index].reset();
            }
        }
    }
}

// class LinearInterpolatedMovement extends Movement {
//     constructor(controlPoints) {
//         super();
//         this.period = controlPoints.map(p => p.d).reduce((x, y) => x+y, 0);
//         this.controlPoints = controlPoints.map(p => {return {x: GRID_SIZE * p.x, y: GRID_SIZE * p.y, d: p.d}});
//         this.controlPoints.push(this.controlPoints[0]);
//         this.timer = 0;
//         this.thing = undefined;
//     }
//
//     update(deltaTime, thing) {
//         this.timer += deltaTime;
//         this.timer %= this.period;
//         let t = this.timer;
//         for (let i = 0; i < this.controlPoints.length; i++) {
//             let d = this.controlPoints[i].d;
//             if (t >= d) {
//                 t -= d;
//             } else {
//                 this.thing.moveTo(
//                     (1 - t/d) * this.controlPoints[i].x + (t/d) * this.controlPoints[i+1].x,
//                     (1 - t/d) * this.controlPoints[i].y + (t/d) * this.controlPoints[i+1].y);
//                 break;
//             }
//         }
//     }
// }


class SineMovement
    extends Movement {
    constructor(x1, y1, x2, y2, duration, count = 1) {
        super(duration, count);
        this.x1 = x1 * GRID_SIZE;
        this.y1 = y1 * GRID_SIZE;
        this.x2 = x2 * GRID_SIZE;
        this.y2 = y2 * GRID_SIZE;
        this.duration = duration;
    }

    update(deltaTime, thing) {
        super.update(deltaTime, thing);
        // if (this.timer < this.duration) {
        const angle = this.timer * 2 * Math.PI / this.duration;
        const ratio = (Math.cos(angle) + 1) / 2;
        thing.moveTo(ratio * this.x1 + (1 - ratio) * this.x2, ratio * this.y1 + (1 - ratio) * this.y2);
        // } else {
        //     thing.x = this.x2;
        //     thing.y = this.y2
        // }
    }
}
