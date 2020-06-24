"use strict"
const constants = require('./constants');
const effect = require('./effect');
const physics = require('./physics');
const scene = require('./scene');
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

{
    {{celeste01}}
}
{
    {{celeste02}}
}
{
    {{celeste03}}
}
{
    {{celeste04}}
    s.addSolid(makeTriggerBlock(14, 10, 23, 9, 3, 2));
}
{
    {{celeste05}}
}
{
    {{celeste06}}
    s.addSolid(makeTriggerBlock(13, 33, 13, 23, 4, 2));
}
{
    {{celeste07}}
}
{
    {{celeste08}}
    s.addSolid(makeTriggerBlock(14, 16, 21, 12, 2, 3));
}
{
    {{celeste09}}
}
{
    {{celeste10}}
}
{
    {{celeste11}}
}
{
    {{celeste12}}
}
{
    {{celeste13}}
}
{
    {{celeste14}}
    s.addSolid(makeTriggerBlock(11, 29, 19, 29, 4, 2));
    s.addSolid(makeTriggerBlock(26, 28, 26, 22, 5, 2));
}
{
    {{celeste15}}
    const triggerBlock = makeTriggerBlock(24, 6, 24, 17, 2, 6);
    s.addSolid(triggerBlock);
    const spikes1 = new physics.SpikesUp(24 * U, 5 * U);
    const spikes2 = new physics.SpikesUp(25 * U, 5 * U);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);

    s.addSolid(makeTriggerBlock(15, 20, 9, 20, 2, 4));

}
{
    {{celeste16}}
}
{
    {{celeste17}}
}
{
    {{celeste18}}
}
{
    {{celeste19}}
    s.addSolid(makeTriggerBlock(20, 15, 20, 7, 2, 4));
    s.addSolid(makeFallingBlock(28, 9, 28, 35, 3, 2));
}
{
    {{celeste20}}
}
{
    {{celeste21}}
    const fallingBlock = makeFallingBlock(14, 7, 14, 15, 2, 7, .75);
    s.addSolid(fallingBlock);
    const spikes1 = new physics.SpikesUp(14 * U, 6 * U);
    const spikes2 = new physics.SpikesUp(15 * U, 6 * U);
    s.addThing(spikes1);
    s.addThing(spikes2);
    fallingBlock.attach(spikes1);
    fallingBlock.attach(spikes2);
}
{
    {{celeste22}}
    s.addSolid(makeTriggerBlock(33, 15, 33, 9, 3, 3));
    const triggerBlock = makeTriggerBlock(25, 6, 13, 6, 2, 3);
    const spikes1 = new physics.SpikesUp(25 * U, 5 * U);
    const spikes2 = new physics.SpikesUp(26 * U, 5 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
}
{
    {{celeste23}}
    s.addSolid(makeTriggerBlock(22, 18, 22, 9, 2, 2));
    s.addSolid(makeTriggerBlock(29, 19, 29, 10, 2, 2));
    s.addSolid(makeTriggerBlock(36, 17, 36, 8, 2, 2));
}
{
    {{celeste24}}
    s.addSolid(makeTriggerBlock(17, 18, 17, 12, 4, 2));
    s.addSolid(makeTriggerBlock(28, 19, 28, 12, 6, 2));
}
{
    {{celeste25}}
    const fallingBlock1 = makeFallingBlock(19, 16, 19, 25, 4, 3);
    s.addSolid(fallingBlock1);
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
        s.addThing(spike);
    }

    const fallingBlock2 = makeFallingBlock(23, 6, 23, 25, 2, 4);
    s.addSolid(fallingBlock2);
    const spikes2 = [
        new physics.SpikesLeft(22 * U, 7 * U),
        new physics.SpikesLeft(22 * U, 8 * U),
    ];
    for (const spike of spikes2) {
        fallingBlock2.attach(spike);
        s.addThing(spike);
    }
}
{
    {{celeste26}}
    const triggerBlock = makeTriggerBlock(9, 9, 26, 9, 3, 5, 35);
    s.addSolid(triggerBlock);
    const spikes = [
        new physics.SpikesUp(9 * U, 8 * U),
        new physics.SpikesUp(10 * U, 8 * U),
        new physics.SpikesUp(11 * U, 8 * U),
    ]
    for (const spike of spikes) {
        triggerBlock.attach(spike);
        s.addThing(spike);
    }
}
{
    {{celeste27}}
    const triggerBlock = makeTriggerBlock(2, 9, 10, 9, 3, 4, 35);
    const spikes1 = new physics.SpikesUp(2 * U, 8 * U);
    const spikes2 = new physics.SpikesUp(3 * U, 8 * U);
    const spikes3 = new physics.SpikesUp(4 * U, 8 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    s.addThing(spikes3);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
    triggerBlock.attach(spikes3);
}
{
    {{celeste28}}
    s.addSolid(makeTriggerBlock(16, 25, 16, 19, 6, 2));
}
{
    {{celeste29}}
}
{
    {{celeste30}}
}
{
    {{celeste31}}
    s.addSolid(makeTriggerBlock(4, 20, 12, 20, 4, 2, 30));
}
{
    {{celeste32}}
}
{
    {{celeste33}}
    s.addSolid(makeTriggerBlock(1, 22, 8, 22, 3, 3, 30));
    const triggerBlock = makeTriggerBlock(48, 15, 48, 7, 2, 4);
    const spikes1 = new physics.SpikesUp(48 * U, 14 * U);
    const spikes2 = new physics.SpikesUp(49 * U, 14 * U);
    s.addSolid(triggerBlock);
    s.addThing(spikes1);
    s.addThing(spikes2);
    triggerBlock.attach(spikes1);
    triggerBlock.attach(spikes2);
}
{
    {{celeste34}}
    const fallingBlock = makeFallingBlock(23, 8, 23, 23, 3, 4);
    s.addSolid(fallingBlock);
    const spikes = [
        new physics.SpikesUp(23 * U, 7 * U),
        new physics.SpikesUp(24 * U, 7 * U),
        new physics.SpikesUp(25 * U, 7 * U),
    ];
    for (const spike of spikes) {
        fallingBlock.attach(spike);
        s.addThing(spike);
    }
    s.addSolid(makeFallingBlock(11, 16, 11, 25, 2, 3));
    s.addSolid(makeFallingBlock(14, 3, 14, 22, 3, 5));
}
{
    {{celeste35}}
}
{
    {{celeste36}}
    const triggerBlock1 = makeTriggerBlock(2, 26, 9, 26, 2, 3, 30);
    s.addSolid(triggerBlock1);
    const spikes1 = [
        new physics.SpikesUp(2 * U, 25 * U),
        new physics.SpikesUp(3 * U, 25 * U),
    ];
    for (const spike of spikes1) {
        triggerBlock1.attach(spike);
        s.addThing(spike);
    }

    const triggerBlock2 = makeTriggerBlock(35, 23, 35, 15, 3, 4);
    s.addSolid(triggerBlock2);
    const spikes2 = [
        new physics.SpikesUp(35 * U, 22 * U),
        new physics.SpikesUp(36 * U, 22 * U),
        new physics.SpikesUp(37 * U, 22 * U),
    ];
    for (const spike of spikes2) {
        triggerBlock2.attach(spike);
        s.addThing(spike);
    }
}
{
    {{celeste37}}
}

// {
//     {{louis01}}
// }
// {
//     {{louis02}}
// }
// {
//     {{louis03}}
// }
// {
//     {{louis04}}
// }
// {
//     {{louis05}}
// }
// {
//     {{louis06}}
// }
// {
//     {{louis07}}
// }
// {
//     {{louis08}}
// }


// Transitions
makeTransitionUp(scenes.celeste01, 31, 0, scenes.celeste02, 1, 1, 5);
makeTransitionUp(scenes.celeste02, 34, 0, scenes.celeste03, 2, 1, 4);
makeTransitionUp(scenes.celeste03, 33, 0, scenes.celeste04, 3, 1, 4);
makeTransitionUp(scenes.celeste04, 21, 0, scenes.celeste05, 4, 1, 4);
makeTransitionUp(scenes.celeste05, 22, 0, scenes.celeste06, 3, 1, 4);
makeTransitionRight(scenes.celeste07, 29, 0, scenes.celeste06, 30, 1, 3);
makeTransitionRight(scenes.celeste06, 30, 2, scenes.celeste08, 5, 0, 4);
makeTransitionUp(scenes.celeste06, 35, 0, scenes.celeste09, 1, 2, 3);
makeTransitionRight(scenes.celeste10, 7, 0, scenes.celeste09, 7, 1, 4);
makeTransitionRight(scenes.celeste11, 8, 1, scenes.celeste10, 8, 1, 4);
makeTransitionUp(scenes.celeste10, 2, 1, scenes.celeste12, 42, 1, 3);
makeTransitionUp(scenes.celeste11, 3, 0, scenes.celeste12, 3, 0, 2);
makeTransitionRight(scenes.celeste09, 0, 0, scenes.celeste13, 0, 0, 10);
makeTransitionRight(scenes.celeste13, .5, 1, scenes.celeste14, 22.5, 2, 10);
makeTransitionRight(scenes.celeste15, 22, 1, scenes.celeste14, 4, 0, 5);
makeTransitionRight(scenes.celeste16, 19, 0, scenes.celeste15, 2, 0, 2);
makeTransitionRight(scenes.celeste14, 1, 1, scenes.celeste17, 10, 2, 9);
makeTransitionRight(scenes.celeste18, 17, 0, scenes.celeste17, 2, 0, 3);
makeTransitionUp(scenes.celeste18, 19, 0, scenes.celeste19, 13, 1, 4);
makeTransitionRight(scenes.celeste19, 2, 0, scenes.celeste20, 2, 0, 2);
makeTransitionRight(scenes.celeste20, 12, 1, scenes.celeste21, 8, 2, 3);
makeTransitionUp(scenes.celeste21, 26, 1, scenes.celeste22, 26, 0, 1);
makeTransitionUp(scenes.celeste23, 7, 0, scenes.celeste21, 27, 3, 7);
makeTransitionRight(scenes.celeste21, 2, 0, scenes.celeste24, 8, 1, 4);
makeTransitionUp(scenes.celeste17, 33, 1, scenes.celeste25, 7, 0, 3);
makeTransitionUp(scenes.celeste25, 22, 0, scenes.celeste21, 2, 2, 3);
makeTransitionUp(scenes.celeste24, 32, 0, scenes.celeste26, 4, 1, 4);
makeTransitionRight(scenes.celeste26, 3, 0, scenes.celeste27, 16, 3, 3);
makeTransitionUp(scenes.celeste27, 2, 1, scenes.celeste28, 28, 2, 5);
makeTransitionRight(scenes.celeste29, 13, 1, scenes.celeste28, 18, 1, 5);
makeTransitionRight(scenes.celeste30, 6, 0, scenes.celeste29, 6, 0, 3);
makeTransitionRight(scenes.celeste27, 6, 2, scenes.celeste31, 6, 0, 2);
makeTransitionUp(scenes.celeste27, 31, 0, scenes.celeste32, 17, 1, 3);
makeTransitionUp(scenes.celeste28, 5, 0, scenes.celeste33, 5, 1, 3);
makeTransitionUp(scenes.celeste28, 28, 2, scenes.celeste33, 28, 2, 3);
makeTransitionUp(scenes.celeste32, 4, 0, scenes.celeste33, 44, 3, 3);
makeTransitionUp(scenes.celeste33, 10, 0, scenes.celeste34, 3, 2, 3);
makeTransitionRight(scenes.celeste35, 13, 0, scenes.celeste34, 3, 0, 3);
makeTransitionRight(scenes.celeste34, 15, 1, scenes.celeste36, 29, 1, 9);
makeTransitionUp(scenes.celeste36, 8, 0, scenes.celeste37, 6, 0, 3);

// makeTransitionUp(scenes.louis01, 35, 0, scenes.louis02, 4, 1, 3);
// makeTransitionUp(scenes.louis03, 3, 0, scenes.louis02, 13, 0, 3);
// makeTransitionUp(scenes.louis03, 30, 1, scenes.louis02, 23, 2, 3);
// makeTransitionUp(scenes.louis04, 4, 0, scenes.louis02, 35, 3, 3);
// makeTransitionUp(scenes.louis05, 33, 0, scenes.louis06, 1, 1, 5);
// makeTransitionRight(scenes.louis06, 8, 0, scenes.louis07, 8, 1, 6);
// scenes.louis06.addThing(new physics.Transition(11.5 * U, 15 * U, 0, 3 * U, scenes.louis08, U, 13 * U, 0));
// scenes.louis08.addThing(new physics.Transition(0, 13 * U, 0, 3 * U, scenes.louis06, 10 * U, 15 * U, 1));

module.exports = {
    scenes,
}
