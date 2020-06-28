"use strict";
const constants = require('./constants');
const globals = require('./globals');
const graphics = require('./graphics');
const inputs = require('./inputs');
const maps = require('./maps_');
const menu = require('./menu');
const player = require('./player');

let context;
let frameCounter = 0;
let frameRateRefresh = 5;
let frameRateStartTime = Date.now();


function setScaling(scale) {
    globals.scaling = scale;
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * scale}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * scale}px`;

    const canvas = document.getElementById("screen-canvas");
    canvas.width = scale * constants.VIEW_WIDTH;
    canvas.height = scale * constants.VIEW_HEIGHT;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.scale(globals.scaling, globals.scaling);
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
    for (const player of globals.players) {
        player.update();
    }
    context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);

    if (menu.menuStack.length > 0) {
        menu.menuStack[0].update();
    } else {
        globals.currentScene.update(1 / 60);
        // Transition from one room to another
        if (globals.currentScene.transition) {
            const prevScene = globals.currentScene;
            globals.currentScene = globals.currentScene.transition.targetScene;
            prevScene.transition = undefined;
        }
    }

    context.clearRect(0, 0, constants.VIEW_WIDTH, constants.VIEW_HEIGHT);
    globals.currentScene.draw(context);
    if (menu.menuStack[0]) {
        menu.menuStack[0].draw(context);
    }
    requestAnimationFrame(update);
}


window.onload = function () {
    // keyboard events
    document.addEventListener('keydown', e => {
        inputs.pressedKeys.add(e.key);
    });
    document.addEventListener('keyup', e => {
        inputs.pressedKeys.delete(e.key);
    });

    // prepare canvas and context
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * globals.scaling}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * globals.scaling}px`;

    const canvas = document.getElementById("screen-canvas");
    canvas.width = globals.scaling * constants.VIEW_WIDTH;
    canvas.height = globals.scaling * constants.VIEW_HEIGHT;
    context = canvas.getContext('2d');
    context.scale(globals.scaling, globals.scaling);
    context.imageSmoothingEnabled = false;

    // load all scenes and start game
    graphics.loadGraphics.then(() => {
        globals.players.push(new player.Player('blue'));
        globals.currentScene = maps.scenes.celeste01;
        globals.currentScene.spawnPointIndex = 1;
        update();
    });
};


// Gamepad API
window.addEventListener("gamepadconnected", (event) => {
    console.log("A gamepad connected:");
    console.log(event.gamepad);
    inputs.onGamepadConnected(event.gamepad);
});


window.addEventListener("gamepaddisconnected", (event) => {
    console.log("A gamepad disconnected:");
    console.log(event.gamepad);
    inputs.onGamepadDisconnected(event.gamepad);
});
