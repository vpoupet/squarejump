const playerCharacter = require('./playerCharacter');
const inputs = require('./inputs');

class Player {
    constructor(color) {
        this.color = color;
        this.character = new playerCharacter.PlayerCharacter(this);
        this.inputs = new inputs.PlayerInputs();
    }

    update(deltaTime) {
        this.inputs.update(deltaTime);
    }
}

module.exports = {
    Player,
}