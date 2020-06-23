"use strict"
const scene = require('./scene');
const effect = require('./effect');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;

const scenes = {};


function makeTransitionUp(scene1, x1, index1, scene2, x2, index2, width) {
    scene1.addThing(new physics.Transition(x1 * U, -U, width * U, 0, scene2, x2 * U, scene2.height - 3 * U, index2));
    scene2.addThing(new physics.Transition(x2 * U, scene2.height, width * U, 0, scene1, x1 * U, 2 * U, index1));
}


function makeTransitionRight(scene1, y1, index1, scene2, y2, index2, height) {
    scene1.addThing(new physics.Transition(scene1.width, y1 * U, 0, height * U, scene2, U, y2 * U, index2));
    scene2.addThing(new physics.Transition(0, y2 * U, 0, height * U, scene1, scene1.width - U, y1 * U, index1));
}


function makeTriggerBlock(x1, y1, x2, y2, width, height, speed = 20, delay = .25) {
    const distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    const duration1 = distance / speed;
    const duration2 = distance / 7;
    return new physics.TriggerBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, duration1),
        new effect.Effect(1),
        new effect.LinearMovement(x2 * U, y2 * U, x1 * U, y1 * U, duration2),
    ]));
}

function makeFallingBlock(x1, y1, x2, y2, width, height, delay = .5) {
    return new physics.FallingBlock(x1 * U, y1 * U, width * U, height * U, delay, new effect.EffectSequence([
        new effect.LinearMovement(x1 * U, y1 * U, x2 * U, y2 * U, (y2 - y1) / 25),
        new effect.Effect(1, -1),
    ]));
}


const loadScenes = new Promise(resolve => {
    const nbScenes = 37;
    const scenePromises = [];
    const sceneNames = [];
    for (let i = 1; i <= nbScenes; i++) {
        const num = i < 10 ? '0' + i : '' + i;
        scenePromises.push(fetch(`tilemaps/celeste${num}.json`).then(response => response.json()));
        sceneNames.push(`CELESTE_${num}`);
    }

    Promise.all(scenePromises).then(responses => {
        for (let i = 0; i < nbScenes; i++) {
            scenes[sceneNames[i]] = scene.Scene.fromJSON(responses[i]);
        }

        // CELESTE_04
        scenes.CELESTE_04.addSolid(makeTriggerBlock(14, 10, 23, 9, 3, 2));

        // CELESTE_06
        scenes.CELESTE_06.addSolid(makeTriggerBlock(13, 33, 13, 23, 4, 2));

        // CELESTE_08
        scenes.CELESTE_08.addSolid(makeTriggerBlock(14, 16, 21, 12, 2, 3));

        // CELESTE_14
        scenes.CELESTE_14.addSolid(makeTriggerBlock(11, 29, 19, 29, 4, 2));
        scenes.CELESTE_14.addSolid(makeTriggerBlock(26, 28, 26, 22, 5, 2));

        // CELESTE_15
        {
            const triggerBlock = makeTriggerBlock(24, 6, 24, 17, 2, 6);
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U);
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addThing(spikes1);
            scenes.CELESTE_15.addThing(spikes2);

            scenes.CELESTE_15.addSolid(makeTriggerBlock(15, 20, 9, 20, 2, 4));
        }

        // CELESTE_19
        scenes.CELESTE_19.addSolid(makeTriggerBlock(20, 15, 20, 7, 2, 4));
        scenes.CELESTE_19.addSolid(makeFallingBlock(28, 9, 28, 35, 3, 2));

        // CELESTE_21
        {
            // const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75, .5);
            const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75);
            const spikes1 = new physics.SpikesUp(14 * U, 6 * U);
            const spikes2 = new physics.SpikesUp(15 * U, 6 * U);
            fallingBlock.attach(spikes1);
            fallingBlock.attach(spikes2);
            scenes.CELESTE_21.addSolid(fallingBlock);
            scenes.CELESTE_21.addThing(spikes1);
            scenes.CELESTE_21.addThing(spikes2);
        }

        // CELESTE_22
        {
            scenes.CELESTE_22.addSolid(makeTriggerBlock(33, 15, 33, 9, 3, 3));

            const triggerBlock = makeTriggerBlock(25, 6, 13, 6, 2, 3);
            const spikes1 = new physics.SpikesUp(25 * U, 5 * U);
            const spikes2 = new physics.SpikesUp(26 * U, 5 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_22.addSolid(triggerBlock);
            scenes.CELESTE_22.addThing(spikes1);
            scenes.CELESTE_22.addThing(spikes2);
        }

        // CELESTE_23
        scenes.CELESTE_23.addSolid(makeTriggerBlock(22, 18, 22, 9, 2, 2));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(29, 19, 29, 10, 2, 2));
        scenes.CELESTE_23.addSolid(makeTriggerBlock(36, 17, 36, 8, 2, 2));

        // CELESTE_24
        scenes.CELESTE_24.addSolid(makeTriggerBlock(17, 18, 17, 12, 4, 2));
        scenes.CELESTE_24.addSolid(makeTriggerBlock(28, 19, 28, 12, 6, 2));

        // CELESTE_25
        {
            const fallingBlock1 = makeFallingBlock(19, 16, 19, 25, 4, 3);
            const spikes1 = [
                new physics.SpikesRight(23 * U, 17 * U),
                new physics.SpikesRight(23 * U, 18 * U),
                new physics.SpikesDown(19 * U, 19 * U),
                new physics.SpikesDown(20 * U, 19 * U),
                new physics.SpikesDown(21 * U, 19 * U),
                new physics.SpikesDown(22 * U, 19 * U),
            ];
            for (const spike of spikes1) {
                fallingBlock1.attach(spike);
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock1);

            const fallingBlock2 = makeFallingBlock(23, 6, 23, 25, 2, 4);
            const spikes2 = [
                new physics.SpikesLeft(22 * U, 7 * U),
                new physics.SpikesLeft(22 * U, 8 * U),
            ];
            for (const spike of spikes2) {
                fallingBlock2.attach(spike);
                scenes.CELESTE_25.addThing(spike);
            }
            scenes.CELESTE_25.addSolid(fallingBlock2);
        }

        // CELESTE_26
        {
            const triggerBlock = makeTriggerBlock(9, 9, 26, 9, 3, 5, 35);
            const spikes = [
                new physics.SpikesUp(9 * U, 8 * U),
                new physics.SpikesUp(10 * U, 8 * U),
                new physics.SpikesUp(11 * U, 8 * U),
            ]
            for (const spike of spikes) {
                triggerBlock.attach(spike);
                scenes.CELESTE_26.addThing(spike);
            }
            scenes.CELESTE_26.addSolid(triggerBlock);
        }

        // CELESTE_27
        {
            const triggerBlock = makeTriggerBlock(2, 9, 10, 9, 3, 4, 35);
            const spikes1 = new physics.SpikesUp(2 * U, 8 * U);
            const spikes2 = new physics.SpikesUp(3 * U, 8 * U);
            const spikes3 = new physics.SpikesUp(4 * U, 8 * U);
            scenes.CELESTE_27.addSolid(triggerBlock);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            triggerBlock.attach(spikes3);
            scenes.CELESTE_27.addThing(spikes1);
            scenes.CELESTE_27.addThing(spikes2);
            scenes.CELESTE_27.addThing(spikes3);
        }

        // CELESTE_28
        scenes.CELESTE_28.addSolid(makeTriggerBlock(16, 25, 16, 19, 6, 2));

        // CELESTE_31
        scenes.CELESTE_31.addSolid(makeTriggerBlock(4, 20, 12, 20, 4, 2, 30));

        // CELESTE_33
        {
            scenes.CELESTE_33.addSolid(makeTriggerBlock(1, 22, 8, 22, 3, 3, 30));
            const triggerBlock = makeTriggerBlock(48, 15, 48, 7, 2, 4);
            scenes.CELESTE_33.addSolid(triggerBlock);
            const spikes1 = new physics.SpikesUp(48 * U, 14 * U);
            const spikes2 = new physics.SpikesUp(49 * U, 14 * U);
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);
            scenes.CELESTE_33.addThing(spikes1);
            scenes.CELESTE_33.addThing(spikes2);
        }

        // CELESTE_34
        {
            const fallingBlock = makeFallingBlock(23, 8, 23, 23, 3, 4);
            scenes.CELESTE_34.addSolid(fallingBlock);
            const spikes = [
                new physics.SpikesUp(23 * U, 7 * U),
                new physics.SpikesUp(24 * U, 7 * U),
                new physics.SpikesUp(25 * U, 7 * U),
            ];
            for (const spike of spikes) {
                fallingBlock.attach(spike);
                scenes.CELESTE_34.addThing(spike);
            }
            scenes.CELESTE_34.addSolid(makeFallingBlock(11, 16, 11, 25, 2, 3));
            scenes.CELESTE_34.addSolid(makeFallingBlock(14, 3, 14, 22, 3, 5));
        }

        // CELESTE_36
        {
            const triggerBlock1 = makeTriggerBlock(2, 26, 9, 26, 2, 3, 30);
            scenes.CELESTE_36.addSolid(triggerBlock1);
            const spikes1 = [
                new physics.SpikesUp(2 * U, 25 * U),
                new physics.SpikesUp(3 * U, 25 * U),
            ];
            for (const spike of spikes1) {
                triggerBlock1.attach(spike);
                scenes.CELESTE_36.addThing(spike);
            }

            const triggerBlock2 = makeTriggerBlock(35, 23, 35, 15, 3, 4);
            scenes.CELESTE_36.addSolid(triggerBlock2);
            const spikes2 = [
                new physics.SpikesUp(35 * U, 22 * U),
                new physics.SpikesUp(36 * U, 22 * U),
                new physics.SpikesUp(37 * U, 22 * U),
            ];
            for (const spike of spikes2) {
                triggerBlock2.attach(spike);
                scenes.CELESTE_36.addThing(spike);
            }
        }

        // LOUIS_06
        // scenes.LOUIS_06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.LOUIS_08, U, 13 * U, 0));
        // scenes.LOUIS_08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.LOUIS_06, 10 * U, 15 * U, 1));

        // Transitions
        makeTransitionUp(scenes.CELESTE_01, 31, 0, scenes.CELESTE_02, 1, 1, 5);
        makeTransitionUp(scenes.CELESTE_02, 34, 0, scenes.CELESTE_03, 2, 1, 4);
        makeTransitionUp(scenes.CELESTE_03, 33, 0, scenes.CELESTE_04, 3, 1, 4);
        makeTransitionUp(scenes.CELESTE_04, 21, 0, scenes.CELESTE_05, 4, 1, 4);
        makeTransitionUp(scenes.CELESTE_05, 22, 0, scenes.CELESTE_06, 3, 1, 4);
        makeTransitionRight(scenes.CELESTE_07, 29, 0, scenes.CELESTE_06, 30, 1, 3);
        makeTransitionRight(scenes.CELESTE_06, 30, 2, scenes.CELESTE_08, 5, 0, 4);
        makeTransitionUp(scenes.CELESTE_06, 35, 0, scenes.CELESTE_09, 1, 2, 3);
        makeTransitionRight(scenes.CELESTE_10, 7, 0, scenes.CELESTE_09, 7, 1, 4);
        makeTransitionRight(scenes.CELESTE_11, 8, 1, scenes.CELESTE_10, 8, 1, 4);
        makeTransitionUp(scenes.CELESTE_10, 2, 1, scenes.CELESTE_12, 42, 1, 3);
        makeTransitionUp(scenes.CELESTE_11, 3, 0, scenes.CELESTE_12, 3, 0, 2);
        makeTransitionRight(scenes.CELESTE_09, 0, 0, scenes.CELESTE_13, 0, 0, 10);
        makeTransitionRight(scenes.CELESTE_13, .5, 1, scenes.CELESTE_14, 22.5, 2, 10);
        makeTransitionRight(scenes.CELESTE_15, 22, 1, scenes.CELESTE_14, 4, 0, 5);
        makeTransitionRight(scenes.CELESTE_16, 19, 0, scenes.CELESTE_15, 2, 0, 2);
        makeTransitionRight(scenes.CELESTE_14, 1, 1, scenes.CELESTE_17, 10, 2, 9);
        makeTransitionRight(scenes.CELESTE_18, 17, 0, scenes.CELESTE_17, 2, 0, 3);
        makeTransitionUp(scenes.CELESTE_18, 19, 0, scenes.CELESTE_19, 13, 1, 4);
        makeTransitionRight(scenes.CELESTE_19, 2, 0, scenes.CELESTE_20, 2, 0, 2);
        makeTransitionRight(scenes.CELESTE_20, 12, 1, scenes.CELESTE_21, 8, 2, 3);
        makeTransitionUp(scenes.CELESTE_21, 26, 1, scenes.CELESTE_22, 26, 0, 1);
        makeTransitionUp(scenes.CELESTE_23, 7, 0, scenes.CELESTE_21, 27, 3, 7);
        makeTransitionRight(scenes.CELESTE_21, 2, 0, scenes.CELESTE_24, 8, 1, 4);
        makeTransitionUp(scenes.CELESTE_17, 33, 1, scenes.CELESTE_25, 7, 0, 3);
        makeTransitionUp(scenes.CELESTE_25, 22, 0, scenes.CELESTE_21, 2, 2, 3);
        makeTransitionUp(scenes.CELESTE_24, 32, 0, scenes.CELESTE_26, 4, 1, 4);
        makeTransitionRight(scenes.CELESTE_26, 3, 0, scenes.CELESTE_27, 16, 3, 3);
        makeTransitionUp(scenes.CELESTE_27, 2, 1, scenes.CELESTE_28, 28, 2, 5);
        makeTransitionRight(scenes.CELESTE_29, 13, 1, scenes.CELESTE_28, 18, 1, 5);
        makeTransitionRight(scenes.CELESTE_30, 6, 0, scenes.CELESTE_29, 6, 0, 3);
        makeTransitionRight(scenes.CELESTE_27, 6, 2, scenes.CELESTE_31, 6, 0, 2);
        makeTransitionUp(scenes.CELESTE_27, 31, 0, scenes.CELESTE_32, 17, 1, 3);
        makeTransitionUp(scenes.CELESTE_28, 5, 0, scenes.CELESTE_33, 5, 1, 3);
        makeTransitionUp(scenes.CELESTE_28, 28, 2, scenes.CELESTE_33, 28, 2, 3);
        makeTransitionUp(scenes.CELESTE_32, 4, 0, scenes.CELESTE_33, 44, 3, 3);
        makeTransitionUp(scenes.CELESTE_33, 10, 0, scenes.CELESTE_34, 3, 2, 3);
        makeTransitionRight(scenes.CELESTE_35, 13, 0, scenes.CELESTE_34, 3, 0, 3);
        makeTransitionRight(scenes.CELESTE_34, 15, 1, scenes.CELESTE_36, 29, 1, 9);
        makeTransitionUp(scenes.CELESTE_36, 8, 0, scenes.CELESTE_37, 6, 0, 3);

        // makeTransitionUp(scenes.LOUIS_01, 35, 0, scenes.LOUIS_02, 4, 1, 3);
        // makeTransitionUp(scenes.LOUIS_03, 3, 0, scenes.LOUIS_02, 13, 0, 3);
        // makeTransitionUp(scenes.LOUIS_03, 30, 1, scenes.LOUIS_02, 23, 2, 3);
        // makeTransitionUp(scenes.LOUIS_04, 4, 0, scenes.LOUIS_02, 35, 3, 3);
        // makeTransitionUp(scenes.LOUIS_05, 33, 0, scenes.LOUIS_06, 1, 1, 5);
        // makeTransitionRight(scenes.LOUIS_06, 8, 0, scenes.LOUIS_07, 8, 1, 6);

        resolve();
    });
});


module.exports = {
    scenes,
    loadScenes,
}
