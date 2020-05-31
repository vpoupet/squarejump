let pressedKeys = new Set();
let canvas;
let ctx;
let scene;
let lastUpdate = Date.now();
let isRunning = false;
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();
let slowdownCounter = 0;

function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
}


function start() {
    isRunning = true;
    update();
}


function stop() {
    isRunning = false;
}


function update() {
    const timeNow = Date.now();

    if (isRunning) {
        slowdownCounter += 1;
        if (slowdownCounter >= SLOWDOWN_FACTOR) {
            slowdownCounter -= SLOWDOWN_FACTOR;
            frameCounter += 1;

            if (timeNow - frameRateStartTime >= 1000 * frameRateRefresh) {
                console.log(`${frameCounter / frameRateRefresh} FPS`);
                frameCounter = 0;
                frameRateStartTime = timeNow;
            }
            const deltaTime = FIXED_DELTA_TIME ?
                1 / FRAME_RATE :
                Math.min((timeNow - lastUpdate) / (1000 * SLOWDOWN_FACTOR), .05);

            ctx.fillStyle = '#221e31';  // background color
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            scene.update(deltaTime);
            scene.draw();
            lastUpdate = timeNow;
        }
        requestAnimationFrame(update);
    }
}


window.onload = function () {
    document.addEventListener('keydown', e => {
        pressedKeys.add(e.key);
        switch (e.key) {
            case '<':
                if (SLOWDOWN_FACTOR === 1) {
                    slowdown(8);
                } else {
                    slowdown(1);
                }
                break;
        }
    });
    document.addEventListener('keyup', e => {
        pressedKeys.delete(e.key);
    });
    const screen = document.getElementById('game-screen');
    screen.style.width = `${WIDTH * SCALING}px`;
    screen.style.height = `${HEIGHT * SCALING}px`;
    canvas = document.getElementById("layer1");
    ctx = canvas.getContext('2d');

    canvas.width = SCALING * WIDTH;
    canvas.height = SCALING * HEIGHT;
    ctx.scale(SCALING, SCALING);

    scene = TEST_LEVEL;
    start();
}
;