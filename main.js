"use strict";
const constants = require('./constants');
const graphics = require('./graphics');
const inputs = require('./inputs');
const maps = require('./maps_');
const menu = require('./menu');
const player = require('./player');
const sound = require('./sound');

const SCALING = 3;

let currentScene;
let menuStack = [];
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();
let scrollX = 0;
let scrollY = 0;


function setScroll(x, y) {
    graphics.contextLayer.scene.translate(scrollX - x, scrollY - y);
    scrollX = x;
    scrollY = y;
}


function update() {
    const timeNow = Date.now();

    frameCounter += 1;
    if (timeNow - frameRateStartTime >= 1000 * frameRateRefresh) {
        console.log(`${frameCounter / frameRateRefresh} FPS`);
        frameCounter = 0;
        frameRateStartTime = timeNow;
    }

    inputs.updateInputs();
    if (menuStack.length > 0) {
        menuStack[0].update();
        menuStack[0].draw(graphics.contextLayer.menu);
    } else {
        currentScene.update(1 / 60);
        // Transition from one room to another
        if (currentScene.transition) {
            const prevScene = currentScene;
            currentScene = currentScene.transition.targetScene;
            prevScene.transition = undefined;
        }
        setScroll(currentScene.scrollX, currentScene.scrollY);

        let context;
        // clear and redraw on scene canvas
        context = graphics.contextLayer.scene;
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.restore();
        currentScene.draw(context);

        context = graphics.contextLayer.hud;
        context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);
        currentScene.drawHUD(context);
    }
    requestAnimationFrame(update);
}


window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
        switch (e.key) {
            case 'p':
                currentScene.isRunning = !currentScene.isRunning;
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
        graphics.contextLayer[canvas.id] = context;
        canvas.width = SCALING * constants.VIEW_WIDTH;
        canvas.height = SCALING * constants.VIEW_HEIGHT;
        context.scale(SCALING, SCALING);
        context.imageSmoothingEnabled = false;
    }

    // load all scenes and start game
    graphics.loadGraphics.then(() => {
        currentScene = maps.scenes.celeste01;
        currentScene.spawnPointIndex = 1;
        currentScene.setPlayer(new player.Player());
        currentScene.reset();
        update();
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
    inputs.gamepadConnected(event.gamepad);
});


window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.gamepadDisconnected(event.gamepad);
});
