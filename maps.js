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


const loadScenes = new Promise(resolve => {
    Promise.all([
        fetch("tilemaps/celeste01.json").then(response => response.json()),
        fetch("tilemaps/celeste02.json").then(response => response.json()),
        fetch("tilemaps/celeste03.json").then(response => response.json()),
        fetch("tilemaps/celeste04.json").then(response => response.json()),
        fetch("tilemaps/celeste05.json").then(response => response.json()),
        fetch("tilemaps/celeste06.json").then(response => response.json()),
        fetch("tilemaps/celeste07.json").then(response => response.json()),
        fetch("tilemaps/celeste08.json").then(response => response.json()),
        fetch("tilemaps/celeste09.json").then(response => response.json()),
        fetch("tilemaps/celeste10.json").then(response => response.json()),
        fetch("tilemaps/celeste11.json").then(response => response.json()),
        fetch("tilemaps/celeste12.json").then(response => response.json()),
        fetch("tilemaps/celeste13.json").then(response => response.json()),
        fetch("tilemaps/celeste14.json").then(response => response.json()),
        fetch("tilemaps/celeste15.json").then(response => response.json()),
        fetch("tilemaps/celeste16.json").then(response => response.json()),
        fetch("tilemaps/louis01.json").then(response => response.json()),
        fetch("tilemaps/louis02.json").then(response => response.json()),
        fetch("tilemaps/louis03.json").then(response => response.json()),
        fetch("tilemaps/louis04.json").then(response => response.json()),
        fetch("tilemaps/louis05.json").then(response => response.json()),
        fetch("tilemaps/louis06.json").then(response => response.json()),
        fetch("tilemaps/louis07.json").then(response => response.json()),
        fetch("tilemaps/louis08.json").then(response => response.json()),

    ]).then(responses => {
        const sceneNames = [
            "CELESTE_01",
            "CELESTE_02",
            "CELESTE_03",
            "CELESTE_04",
            "CELESTE_05",
            "CELESTE_06",
            "CELESTE_07",
            "CELESTE_08",
            "CELESTE_09",
            "CELESTE_10",
            "CELESTE_11",
            "CELESTE_12",
            "CELESTE_13",
            "CELESTE_14",
            "CELESTE_15",
            "CELESTE_16",
            "LOUIS_01",
            "LOUIS_02",
            "LOUIS_03",
            "LOUIS_04",
            "LOUIS_05",
            "LOUIS_06",
            "LOUIS_07",
            "LOUIS_08",
        ];
        for (let i = 0; i < sceneNames.length; i++) {
            scenes[sceneNames[i]] = scene.Scene.fromJSON(responses[i]);
        }

        {
            // CELESTE_04
            scenes.CELESTE_04.addSolid(new physics.TriggerBlock(14 * U, 10 * U, 3 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(14 * U, 10 * U, 23 * U, 9 * U, .5),
                new effect.Effect(1),
                new effect.LinearMovement(23 * U, 9 * U, 14 * U, 10 * U, 1.5),
            ])));
        }

        {
            // CELESTE_06
            scenes.CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, 33 * U, 4 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(13 * U, 33 * U, 13 * U, 23 * U, .45),
                new effect.Effect(1),
                new effect.LinearMovement(13 * U, 23 * U, 13 * U, 33 * U, 1.5),
            ])));
        }

        {
            // CELESTE_08
            scenes.CELESTE_08.addSolid(new physics.TriggerBlock(14 * U, 16 * U, 2 * U, 3 * U, new effect.EffectSequence([
                new effect.Effect(.75),
                new effect.LinearMovement(14 * U, 16 * U, 21 * U, 12 * U, .5),
                new effect.Effect(1),
                new effect.LinearMovement(21 * U, 12 * U, 14 * U, 16 * U, 2),
            ])));
        }


        {
            // CELESTE_14
            scenes.CELESTE_14.addSolid(new physics.TriggerBlock(11 * U, 29 * U, 4 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(11 * U, 29 * U, 19 * U, 29 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(19 * U, 29 * U, 11 * U, 29 * U, 1.5),
            ])));

            scenes.CELESTE_14.addSolid(new physics.TriggerBlock(26 * U, 28 * U, 5 * U, 2 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(26 * U, 28 * U, 26 * U, 22 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(26 * U, 22 * U, 26 * U, 28 * U, 1.5),
            ])));
        }

        {
            // CELESTE_15
            const triggerBlock = new physics.TriggerBlock(24 * U, 6 * U, 2 * U, 7 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(24 * U, 6 * U, 24 * U, 17 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(24 * U, 17 * U, 24 * U, 6 * U, 1.5),
            ]));
            const spikes1 = new physics.SpikesUp(24 * U, 5 * U, new physics.TileData(40));
            const spikes2 = new physics.SpikesUp(25 * U, 5 * U, new physics.TileData(40));
            triggerBlock.attach(spikes1);
            triggerBlock.attach(spikes2);

            scenes.CELESTE_15.addSolid(triggerBlock);
            scenes.CELESTE_15.addThing(spikes1);
            scenes.CELESTE_15.addThing(spikes2);

            scenes.CELESTE_15.addSolid(new physics.TriggerBlock(15 * U, 20 * U, 2 * U, 4 * U, new effect.EffectSequence([
                new effect.Effect(.25),
                new effect.LinearMovement(15 * U, 20 * U, 9 * U, 20 * U, .35),
                new effect.Effect(1),
                new effect.LinearMovement(9 * U, 20 * U, 15 * U, 20 * U, 1.5),
            ])));
        }

        {
            // LOUIS_06
            scenes.LOUIS_06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.LOUIS_08, U, 13 * U, 0));
            scenes.LOUIS_08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.LOUIS_06, 10 * U, 15 * U, 1));

        }

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

        makeTransitionUp(scenes.LOUIS_01, 35, 0, scenes.LOUIS_02, 4, 1, 3);
        makeTransitionUp(scenes.LOUIS_03, 3, 0, scenes.LOUIS_02, 13, 0, 3);
        makeTransitionUp(scenes.LOUIS_03, 30, 1, scenes.LOUIS_02, 23, 2, 3);
        makeTransitionUp(scenes.LOUIS_04, 4, 0, scenes.LOUIS_02, 35, 3, 3);
        makeTransitionUp(scenes.LOUIS_05, 33, 0, scenes.LOUIS_06, 1, 1, 5);
        makeTransitionRight(scenes.LOUIS_06, 8, 0, scenes.LOUIS_07, 8, 1, 6);

        resolve();
    });
});


module.exports = {
    scenes,
    loadScenes,
}
