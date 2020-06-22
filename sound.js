const jumpSound = new Audio('sound/char_mad_jump.ogg');
const dashSound = new Audio('sound/char_mad_dash_pink_left.ogg');
const dieSound = new Audio('sound/char_mad_death.ogg');
const crumblingBlockSound = new Audio('sound/game_gen_fallblock_shake.ogg');
const strawberrySound = new Audio('sound/game_gen_strawberry_red_get_1up.ogg');
const dashDiamondSound = new Audio('sound/game_gen_diamond_touch_01.ogg');
const springSound = new Audio('sound/game_gen_spring.ogg');
let soundOn = true;


function toggleSound() {
    soundOn = !soundOn;
    return soundOn;
}


function playSound(sound) {
    if (soundOn) {
        sound.currentTime = 0;
        sound.play();
    }
}


module.exports = {
    playSound,
    toggleSound,
    jumpSound,
    dashSound,
    dieSound,
    crumblingBlockSound,
    strawberrySound,
    dashDiamondSound,
    springSound,
}