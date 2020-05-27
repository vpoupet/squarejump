let pressedKeys = new Set();

let canvas;
let ctx;
let timeNow = Date.now() / (SLOWDOWN_FACTOR * 1000);
let lastUpdate = timeNow;
let deltaTime = 0;

function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
}
function update() {
    timeNow = Date.now() / (SLOWDOWN_FACTOR * 1000);
    if (timeNow - lastUpdate > 1 / FRAMES_PER_SECOND) {
        deltaTime = Math.min(timeNow - lastUpdate, 2 / FRAMES_PER_SECOND);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const solid of solids) {
            solid.update();
            solid.draw();
        }
        for (const actor of actors) {
            actor.update();
            actor.draw();
        }
        lastUpdate = timeNow;
    }
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
    canvas.width = SCALING * WIDTH;
    canvas.height = SCALING * HEIGHT;
    ctx.scale(SCALING, SCALING);
    update();
}

window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
});