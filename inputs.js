"use strict";
const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
let pressedKeys = new Set();
let pressedButtons = new Set();
let gamepadPressedButtons = [];

class PlayerInputs {
    constructor() {
        this.xAxis = 0;
        this.yAxis = 0;
        this.jumpPressedBuffer = false;
        this.jumpHeld = false;
        this.gamepadIndex = 0;
        this.gamepadmap = {
            jump: 0,
            dash: 1,
            up: 12,
            down: 13,
            left: 14,
            right: 15,
        }
        this.keymap = {
            right: 'ArrowRight',
            left: 'ArrowLeft',
            up: 'ArrowUp',
            down: 'ArrowDown',
            jump: 'g',
            dash: 'f',
        }
        this.timers = {
            jumpBuffer: 0,
            dashBuffer: 0,
        };
    }

    updateGamepad() {
        pressedButtons.clear();
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (gamepad) {
            for (let j = 0; j < gamepad.buttons; j++) {
                if (gamepad.buttons[j].pressed) {
                    pressedButtons.add(j);
                }
            }
        }
    }

    update(deltaTime) {
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        // this.updateGamepad();

        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }
        this.xAxis = 0;
        this.yAxis = 0;
        if (pressedKeys.has(this.keymap.left) ||
            (gamepad && gamepad.buttons[this.gamepadmap.left].pressed)) {
            this.xAxis -= 1;
        }
        if (pressedKeys.has(this.keymap.right) ||
            (gamepad && gamepad.buttons[this.gamepadmap.right].pressed)) {
            this.xAxis += 1;
        }
        if (pressedKeys.has(this.keymap.up) ||
            (gamepad && gamepad.buttons[this.gamepadmap.up].pressed)) {
            this.yAxis += 1;
        }
        if (pressedKeys.has(this.keymap.down) ||
            (gamepad && gamepad.buttons[this.gamepadmap.down].pressed)) {
            this.yAxis -= 1;
        }
        const prevJump = this.jumpHeld;
        this.jumpHeld = pressedKeys.has(this.keymap.jump) ||
            (gamepad && gamepad.buttons[this.gamepadmap.jump].pressed);
        if (!prevJump && this.jumpHeld) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
            this.jumpPressedBuffer = true;
        } else {
            this.jumpPressedBuffer &= this.timers.jumpBuffer > 0;
        }

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap.dash) ||
            (gamepad && gamepad.buttons[this.gamepadmap.dash].pressed);
        if (!prevDash && this.dashHeld) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (this.timers.dashBuffer > 0);
    }
}


module.exports = {
    PlayerInputs,
    gamepadPressedButtons,
    pressedKeys,
}
