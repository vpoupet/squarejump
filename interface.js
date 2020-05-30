class PlayerInputs {
    constructor() {
        this.XAxis = 0;
        this.YAxis = 0;
        this.jumpPressTime = 0;
        this.dashPressTime = 0;
        this.jumpPressedBuffer = false;
        this.jumpHeld = false;
        this.keymap = {
            right: 'ArrowRight',
            left: 'ArrowLeft',
            up: 'ArrowUp',
            down: 'ArrowDown',
            jump: 'g',
            dash: 'f',
        }
    }

    update(deltaTime) {
        this.jumpPressTime += deltaTime;
        this.dashPressTime += deltaTime;
        this.XAxis = 0;
        this.YAxis = 0;
        if (pressedKeys.has(this.keymap['left'])) {
            this.XAxis -= 1;
        }
        if (pressedKeys.has(this.keymap['right'])) {
            this.XAxis += 1;
        }
        if (pressedKeys.has(this.keymap['up'])) {
            this.YAxis += 1;
        }
        if (pressedKeys.has(this.keymap['down'])) {
            this.YAxis -= 1;
        }
        const prevJump = this.jumpHeld;
        this.jumpHeld = pressedKeys.has(this.keymap['jump']);
        if (!prevJump && this.jumpHeld) {
            this.jumpPressTime = 0;
            this.jumpPressedBuffer = true;
        }
        this.jumpPressedBuffer = this.jumpPressedBuffer && (this.jumpPressTime <= JUMP_BUFFER_TIME);

        const prevDash = this.dashHeld;
        this.dashHeld = pressedKeys.has(this.keymap['dash']);
        if (!prevDash && this.dashHeld) {
            this.dashPressTime = 0;
            this.dashPressedBuffer = true;
        }
        this.dashPressedBuffer = this.dashPressedBuffer && (this.dashPressTime <= DASH_BUFFER_TIME);
    }
}
