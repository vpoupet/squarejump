"use strict";

const JUMP_BUFFER_TIME = .1;
const DASH_BUFFER_TIME = .1;
const AXES_THRESHOLD = .4;

let pressedKeys = new Set();
let previouslyPressedKeys;
let currentlyPressedKeys = new Set();
let previouslyPressedButtons = [];
let currentlyPressedButtons = [];


function onGamepadConnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = new Set();
}


function onGamepadDisconnected(gamepad) {
    currentlyPressedButtons[gamepad.index] = undefined;
}


function isTappedKey(key) {
    return currentlyPressedKeys.has(key) && !previouslyPressedKeys.has(key);
}


function isPressedKey(key) {
    return currentlyPressedKeys.has(key);
}


function getPressedKeys() {
    return new Set(currentlyPressedKeys);
}


function getTappedKeys() {
    const tappedKeys = new Set();
    for (const key of currentlyPressedKeys) {
        if (!previouslyPressedKeys.has(key)) {
            tappedKeys.add(key);
        }
    }
    return tappedKeys;
}


function getPressedButtons() {
    return currentlyPressedButtons.map(s => new Set(s));
}


function getTappedButtons() {
    const tappedButtons = [];
    for (let i = 0; i < currentlyPressedButtons.length; i++) {
        const s = new Set();
        for (const button of currentlyPressedButtons[i]) {
            if (!previouslyPressedButtons[i].has(button)) {
                s.add(button);
            }
        }
        tappedButtons.push(s);
    }
    return tappedButtons;
}


function updateInputs() {
    previouslyPressedKeys = currentlyPressedKeys;
    currentlyPressedKeys = new Set(pressedKeys);
    previouslyPressedButtons = currentlyPressedButtons;
    currentlyPressedButtons = [];
    for (const gamepad of navigator.getGamepads()) {
        if (gamepad) {
            const i = gamepad.index;
            currentlyPressedButtons[i] = new Set();
            for (let j = 0; j < gamepad.buttons.length; j++) {
                if (gamepad.buttons[j].pressed) {
                    currentlyPressedButtons[i].add(j);
                    if (!previouslyPressedButtons[i].has(j)) {
                        console.log(j);
                    }
                }
            }
            for (let j = 0; j < gamepad.axes.length; j++) {
                let buttonIndex = 0;
                if (gamepad.axes[j] > AXES_THRESHOLD) {
                    buttonIndex = 2 * j + gamepad.buttons.length;
                } else if (gamepad.axes[j] < -AXES_THRESHOLD) {
                    buttonIndex = 2 * j + gamepad.buttons.length + 1;
                }
                if (buttonIndex) {
                    currentlyPressedButtons[i].add(buttonIndex);
                    if (!previouslyPressedButtons[i].has(buttonIndex)) {
                        console.log(buttonIndex);
                    }
                }
            }
        }
    }
}


class PlayerInputs {
    constructor() {
        this.xAxis = 0;
        this.yAxis = 0;
        this.gamepadIndex = 0;
        this.gamepadmap = {
            up: 12,
            down: 13,
            left: 14,
            right: 15,
            jump: 0,
            dash: 1,
            pause: 9,
        }
        this.keymap = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'g',
            dash: 'f',
            pause: 'Escape',
        }
        this.timers = {
            jumpBuffer: 0,
            dashBuffer: 0,
        };
    }

    isPressed(action) {
        return currentlyPressedKeys.has(this.keymap[action]) ||
            (
                currentlyPressedButtons[this.gamepadIndex] &&
                currentlyPressedButtons[this.gamepadIndex].has(this.gamepadmap[action])
            );
    }

    isPreviouslyPressed(action) {
        return previouslyPressedKeys.has(this.keymap[action]) ||
            (
                previouslyPressedButtons[this.gamepadIndex] &&
                previouslyPressedButtons[this.gamepadIndex].has(this.gamepadmap[action])
            );
    }

    isTapped(action) {
        return this.isPressed(action) && !this.isPreviouslyPressed(action);
    }

    update(deltaTime) {
        for (const t in this.timers) {
            this.timers[t] -= deltaTime;
        }

        this.xAxis = (this.isPressed("left") ? -1 : 0) + (this.isPressed("right") ? 1 : 0);
        this.yAxis = (this.isPressed("up") ? 1 : 0) + (this.isPressed("down") ? -1 : 0);
        if (this.isTapped("jump")) {
            this.timers.jumpBuffer = JUMP_BUFFER_TIME;
        }
        if (this.isTapped("dash")) {
            this.timers.dashBuffer = DASH_BUFFER_TIME;
        }
    }
}


module.exports = {
    PlayerInputs,
    onGamepadConnected,
    onGamepadDisconnected,
    updateInputs,
    pressedKeys,
    isTappedKey,
    isPressedKey,
    getPressedKeys,
    getTappedKeys,
    getPressedButtons,
    getTappedButtons,
}
