"use strict";
const constants = require('./constants');
const maps = require('./maps');
const inputs = require('./inputs');
const player = require('./player');

const SCALING = 2;
let SLOWDOWN_FACTOR = 1;
const FIXED_DELTA_TIME = true;
const FRAME_RATE = 60;

let context;
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
    context.translate(scrollX - x, scrollY - y);
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

            context.fillStyle = '#ffffff';  // background color
            context.fillRect(0, 0, SCALING * constants.VIEW_WIDTH, SCALING * constants.VIEW_HEIGHT);
            currentScene.update(deltaTime);
            // Transition from one room to another
            if (currentScene.transition) {
                const prevScene = currentScene;
                currentScene = currentScene.transition.targetScene;
                prevScene.transition = undefined;
            }
            setScroll(currentScene.scrollX, currentScene.scrollY);
            currentScene.draw(context);
            lastUpdate = timeNow;
        }
        requestAnimationFrame(update);
    }
}


window.onload = function () {
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
    const screen = document.getElementById('game-screen');
    screen.style.width = `${constants.VIEW_WIDTH * SCALING}px`;
    screen.style.height = `${constants.VIEW_HEIGHT * SCALING}px`;
    const canvas = document.getElementById("layer1");
    context = canvas.getContext('2d');

    canvas.width = SCALING * constants.VIEW_WIDTH;
    canvas.height = SCALING * constants.VIEW_HEIGHT;
    context.scale(SCALING, -SCALING);
    context.translate(0, -constants.VIEW_HEIGHT);

    currentScene = maps.CELESTE_01;
    currentScene.setPlayer(new player.Player(currentScene.startPositionX, currentScene.startPositionY));
    start();
};