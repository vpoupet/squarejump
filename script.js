let pressedKeys = new Set();

let canvas;
let ctx;
let timeNow = Date.now() / (SLOWDOWN_FACTOR * 1000);
let lastUpdate = timeNow;
let deltaTime = 0;
let isRunning = false;

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
    timeNow = Date.now() / (SLOWDOWN_FACTOR * 1000);
    if (timeNow - lastUpdate > 1 / FRAMES_PER_SECOND) {
        deltaTime = Math.min(timeNow - lastUpdate, 2 / FRAMES_PER_SECOND);
        ctx[1].clearRect(0, 0, canvas[1].width, canvas[1].height);
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
    if (isRunning) {
        requestAnimationFrame(update);
    }
}

window.onload = function () {
    document.addEventListener('keydown', e => {
        pressedKeys.add(e.key);
    });
    document.addEventListener('keyup', e => {
        pressedKeys.delete(e.key);
    });
    const screen = document.getElementById('game-screen');
    screen.style.width = `${WIDTH * SCALING}px`;
    screen.style.height = `${HEIGHT * SCALING}px`;
    canvas = Array.from(document.getElementsByClassName("screen-layer"));
    ctx = canvas.map(c => c.getContext('2d'));

    for (let i = 0; i < canvas.length; i++) {
        canvas[i].width = SCALING * WIDTH;
        canvas[i].height = SCALING * HEIGHT;
        ctx[i].scale(SCALING, SCALING);
    }

    ctx[0].beginPath();
    for (let i = 0; i <= HEIGHT / GRID_SIZE; i++) {
        ctx[0].moveTo(0, i * GRID_SIZE);
        ctx[0].lineTo(WIDTH, i * GRID_SIZE);
    }
    for (let i = 0; i <= WIDTH / GRID_SIZE; i++) {
        ctx[0].moveTo(i * GRID_SIZE, 0);
        ctx[0].lineTo(i * GRID_SIZE, HEIGHT);
    }
    ctx[0].strokeWidth = .5;
    ctx[0].strokeStyle = '#DDDDDD';
    ctx[0].stroke();

    start();
}
