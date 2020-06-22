"use strict";
const constants = require('./constants');
const inputs = require('./inputs');
const player = require('./player');
const sound = require('./sound');
const maps = require('./maps');

const SCALING = 3;
let SLOWDOWN_FACTOR = 1;
const FIXED_DELTA_TIME = true;
const FRAME_RATE = 60;

const contextLayer = {};
let currentScene;
let lastUpdate = Date.now();
let isRunning = false;
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();
let slowdownCounter = 0;
let scrollX = 0;
let scrollY = 0;

function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
}


function setScroll(x, y) {
    contextLayer.scene.translate(scrollX - x, scrollY - y);
    scrollX = x;
    scrollY = y;
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

            currentScene.update(deltaTime);
            // Transition from one room to another
            if (currentScene.transition) {
                const prevScene = currentScene;
                currentScene = currentScene.transition.targetScene;
                prevScene.transition = undefined;
            }
            setScroll(currentScene.scrollX, currentScene.scrollY);

            let context;
            // clear and redraw on scene canvas
            context = contextLayer.scene;
            context.save();
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            context.restore();
            currentScene.draw(context);

            context = contextLayer.hud;
            context.clearRect(0, 0, context.canvas.width / SCALING, context.canvas.height / SCALING);
            currentScene.drawHUD(context);

            lastUpdate = timeNow;
        }
        requestAnimationFrame(update);
    }
}

window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
        switch (e.key) {
            case 'w':
                if (SLOWDOWN_FACTOR === 1) {
                    slowdown(8);
                } else {
                    slowdown(1);
                }
                break;
        }
    });
    document.addEventListener('keyup', e => {
        inputs.pressedKeys.delete(e.key);
    });
    document.getElementById("sound-button").addEventListener('click', toggleSound);

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;

    for (const canvas of screen.getElementsByTagName("canvas")) {
        const context = canvas.getContext('2d');
        contextLayer[canvas.id] = context;
        canvas.width = SCALING * constants.VIEW_WIDTH;
        canvas.height = SCALING * constants.VIEW_HEIGHT;
        context.scale(SCALING, SCALING);
        context.imageSmoothingEnabled = false;
    }

    // load all scenes and start game
    player.loadAllSprites.then(() => {
        maps.loadScenes.then(() => {
            // load starting scene
            currentScene = maps.scenes.CELESTE_01;
            currentScene.spawnPointIndex = 1;
            currentScene.setPlayer(new player.Player());
            currentScene.reset();
            start();
        })
    });
};


function toggleSound() {
    if (sound.toggleSound()) {
        document.getElementById("sound-button").innerText = "Sound On";
    } else {
        document.getElementById("sound-button").innerText = "Sound Off";
    }
}


// Gamepad API
window.addEventListener("gamepadconnected", (event) => {
    console.log("A gamepad connected:");
    console.log(event.gamepad);
    inputs.gamepadPressedButtons[event.gamepad.index] = new Set();
});

window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.gamepadPressedButtons[event.gamepad.index] = undefined;
});
