class Scene {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = 0;
        this.solids = [];
        this.hazards = [];
        this.actors = [];
        this.player = undefined;
    }

    update(deltaTime) {
        this.solids.map(x => x.update(deltaTime));
        this.hazards.map(x => x.update(deltaTime));
        this.actors.map(x => x.update(deltaTime));
        if (this.player) {
            if (this.player.x - this.scrollX > .60 * WIDTH) {
                this.scrollX = Math.min(this.width * GRID_SIZE - WIDTH, this.player.x - .60 * WIDTH);
            }
            if (this.player.x - this.scrollX < .40 * WIDTH) {
                this.scrollX = Math.max(0, this.player.x - .40 * WIDTH);
            }
        }
    }

    draw() {
        this.solids.map(x => x.draw());
        this.hazards.map(x => x.draw());
        this.actors.map(x => x.draw());
    }

    addPlayer(player) {
        this.addActor(player);
        this.player = player;
    }

    addActor(actor) {
        this.actors.push(actor);
        actor.scene = this;
    }

    addSolid(solid) {
        this.solids.push(solid);
        solid.scene = this;
    }

    addHazard(hazard) {
        this.hazards.push(hazard);
        hazard.scene = this;
    }

    loadString(s) {
        const lines = s.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines[i].length; j++) {
                if (lines[i][j] === 'x') {
                    this.addSolid(new Solid(j, lines.length - i - 1, 1, 1));
                } else if (lines[i][j] === '!') {
                    this.addHazard(new Hazard(j, lines.length - i - 1, 1, 1));
                }
            }
        }
    }
}
