const effects = {
    jump: new Audio('sound/char_mad_jump.ogg'),
    dash: new Audio('sound/char_mad_dash_pink_left.ogg'),
    die: new Audio('sound/char_mad_death.ogg'),
    crumblingBlock: new Audio('sound/game_gen_fallblock_shake.ogg'),
    strawberry: new Audio('sound/game_gen_strawberry_red_get_1up.ogg'),
    dashDiamond: new Audio('sound/game_gen_diamond_touch_01.ogg'),
    spring: new Audio('sound/game_gen_spring.ogg'),
}
const bgMusic = new Audio('sound/bg_music.wav');
bgMusic.loop = true;

let soundVolume;
let musicVolume;

function getSoundVolume() {
    return soundVolume;
}


function setSoundVolume(value) {
    soundVolume = value;
    for (const effect of Object.values(effects)) {
        effect.volume = soundVolume / 16;
    }
}


function incrementSoundVolume() {
    if (soundVolume < 5) {
        setSoundVolume(soundVolume + 1);
    }
}


function decrementSoundVolume() {
    if (soundVolume > 0) {
        setSoundVolume(soundVolume - 1);
    }
}


function getMusicVolume() {
    return musicVolume;
}


function setMusicVolume(value) {
    musicVolume = value;
    bgMusic.volume = musicVolume / 16;
}


function incrementMusicVolume() {
    if (musicVolume < 5) {
        setMusicVolume(musicVolume + 1);
    }
}


function decrementMusicVolume() {
    if (musicVolume > 0) {
        setMusicVolume(musicVolume - 1);
    }
}


function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}


setSoundVolume(5);
setMusicVolume(5);

module.exports = {
    effects,
    bgMusic,
    getSoundVolume,
    getMusicVolume,
    playSound,
    incrementSoundVolume,
    decrementSoundVolume,
    incrementMusicVolume,
    decrementMusicVolume,
}