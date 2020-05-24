const WIDTH = 64;
const HEIGHT = 48;
let pressedKeys = new Set();
let keymap = {
    right: 'ArrowRight',
    left: 'ArrowLeft',
    jump: 'ArrowUp',
}
let canvas;
let ctx;
const player = new Player();

function update() {
    gamepadAPI.update();
    if (gamepadAPI.buttonPressed('DPad-Right', true)) {
        console.log('Right');
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const block of obstacles) {
        block.draw();
    }
    player.update();
    player.draw();
    requestAnimationFrame(update);
}

window.onload = function () {
    document.addEventListener('keydown', e => {
        pressedKeys.add(e.key);
    });
    document.addEventListener('keyup', e => {
        pressedKeys.delete(e.key);
    });
    canvas = document.getElementById("game-screen");
    ctx = canvas.getContext('2d');
    canvas.width = 20 * WIDTH;
    canvas.height = 20 * HEIGHT;
    ctx.scale(20, 20);
    ctx.fillStyle = '#DDDDFF';
    update();
}

window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
});