const constants = require('./constants');
const globals = require('./globals');
const inputs = require('./inputs');
const sound = require('./sound');

const MENU_FONT_SIZE = 12;
const MENU_PADDING = 5;
const menuStack = [];


class MenuLine {
    constructor(text) {
        this.text = text;
    }

    draw(ctx, y, textColor = "#000000", bgColor = "#ffffffcc") {
        ctx.fillStyle = bgColor;
        const textMetrics = ctx.measureText(this.text);
        ctx.fillRect(
            constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - MENU_PADDING,
            y - textMetrics.actualBoundingBoxAscent - MENU_PADDING,
            textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 2 * MENU_PADDING,
            textMetrics.actualBoundingBoxAscent + 2 * MENU_PADDING);
        ctx.fillStyle = textColor;
        ctx.fillText(this.text, constants.VIEW_WIDTH / 2, y);
    }
}


class MenuOption extends MenuLine {
    constructor(text) {
        super(text);
        this.isSelected = false;
        this.onActivate = undefined;
        this.onRight = undefined;
        this.onLeft = undefined;
    }

    draw(ctx, y) {
        if (this.isSelected) {
            super.draw(ctx, y, '#ffffff', '#000000cc');
        } else {
            super.draw(ctx, y, '#000000', '#ffffffcc');
        }
    }

    setOnActivate(f) {
        this.onActivate = f;
        return this;
    }

    setOnRight(f) {
        this.onRight = f;
        return this;
    }

    setOnLeft(f) {
        this.onLeft = f;
        return this;
    }
}


class Menu {
    constructor(title = undefined) {
        if (title) {
            this.title = new MenuLine(title);
        }
        this.lines = [];
    }

    draw(ctx) {
        ctx.save();
        ctx.font = `normal ${MENU_FONT_SIZE}px gameboy`;
        ctx.textAlign = "center";
        const lineHeight = ctx.measureText('M').actualBoundingBoxAscent + 2.5 * MENU_PADDING;

        let yOffset;
        if (this.title) {
            yOffset = constants.VIEW_HEIGHT / 2 - this.lines.length * lineHeight / 2;
            this.title.draw(ctx, yOffset);
            yOffset += 1.5 * lineHeight;
        } else {
            yOffset = constants.VIEW_HEIGHT / 2 - (this.lines.length - 1) * lineHeight / 2;
        }

        for (const line of this.lines) {
            line.draw(ctx, yOffset);
            yOffset += lineHeight;
        }
        ctx.restore();
    }
}


class LineSelectMenu extends Menu {
    constructor(title = undefined) {
        super(title);
        this.selected = 0;
        this.canQuit = true;
    }

    draw(ctx) {
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].isSelected = (i === this.selected);
        }
        super.draw(ctx);
    }

    update() {
        // default menu controls
        if (inputs.isTappedKey("Escape") && this.canQuit) {
            menuStack.shift();
        } else if (inputs.isTappedKey("ArrowDown")) {
            if (this.selected < this.lines.length - 1) {
                this.selected += 1;
            }
        } else if (inputs.isTappedKey("ArrowUp")) {
            if (this.selected > 0) {
                this.selected -= 1;
            }
        } else if (inputs.isTappedKey("ArrowRight") && this.lines[this.selected].onRight) {
            this.lines[this.selected].onRight();
        } else if (inputs.isTappedKey("ArrowLeft") && this.lines[this.selected].onLeft) {
            this.lines[this.selected].onLeft();
        } else if (inputs.isTappedKey("Enter") && this.lines[this.selected].onActivate) {
            this.lines[this.selected].onActivate();
            // player-specific menu controls
        } else if (globals.players.some(p => p.inputs.isTapped("pause")) && this.canQuit) {
            while (menuStack.length) {
                menuStack.shift();
            }
        } else if (globals.players.some(p => p.inputs.isTapped("dash")) && this.canQuit) {
            menuStack.shift();
        } else if (globals.players.some(p => p.inputs.isTapped("down"))) {
            if (this.selected < this.lines.length - 1) {
                this.selected += 1;
            }
        } else if (globals.players.some(p => p.inputs.isTapped("up"))) {
            if (this.selected > 0) {
                this.selected -= 1;
            }
        } else if (globals.players.some(p => p.inputs.isTapped("right")) && this.lines[this.selected].onRight) {
            this.lines[this.selected].onRight();
        } else if (globals.players.some(p => p.inputs.isTapped("left")) && this.lines[this.selected].onLeft) {
            this.lines[this.selected].onLeft();
        } else if (globals.players.some(p => p.inputs.isTapped("jump")) && this.lines[this.selected].onActivate) {
            this.lines[this.selected].onActivate();
        }
    }
}


class ControlsMenu extends Menu {
    constructor() {
        super();
        this.actions = ["up", "down", "left", "right", "jump", "dash", "pause"];
        this.lines = [
            new MenuLine('Press Key/Button for'),
            new MenuLine(),
        ];
        this.setActionIndex(0);
    }

    setActionIndex(index) {
        this.actionIndex = index;
        this.lines[1].text = this.actions[this.actionIndex].toUpperCase();
    }

    update() {
        const tappedKeys = inputs.getTappedKeys();
        if (tappedKeys.size > 0) {
            globals.players[0].inputs.keymap[this.actions[this.actionIndex]] = tappedKeys.values().next().value;
            if (this.actionIndex >= this.actions.length - 1) {
                this.setActionIndex(0);
                menuStack.shift();
            } else {
                this.setActionIndex(this.actionIndex + 1);
            }
        }
        const tappedButtons = inputs.getTappedButtons();
        for (let i = 0; i < tappedButtons.length; i++) {
            if (tappedButtons[i].size > 0) {
                globals.players[0].inputs.gamepadIndex = i;
                globals.players[0].inputs.gamepadmap[this.actions[this.actionIndex]] = tappedButtons[i].values().next().value;
                if (this.actionIndex >= this.actions.length - 1) {
                    this.setActionIndex(0);
                    menuStack.shift();
                } else {
                    this.setActionIndex(this.actionIndex + 1);
                }
                break;
            }
        }
    }
}


// Controls mapping menu
const controlsMenu = new ControlsMenu();

// General options menu
const optionsMenu = new LineSelectMenu("Options");
optionsMenu.lines.push(
    new MenuOption("SFX Volume: lllll ")
        .setOnRight(function () {
            sound.incrementSoundVolume();
            this.text = "SFX Volume: "
                + "l".repeat(sound.getSoundVolume())
                + ".".repeat(5 - sound.getSoundVolume())
                + " ";
        })
        .setOnLeft(function () {
            sound.decrementSoundVolume();
            this.text = "SFX Volume: "
                + "l".repeat(sound.getSoundVolume())
                + ".".repeat(5 - sound.getSoundVolume())
                + " ";
        }));
optionsMenu.lines.push(
    new MenuOption("Music Volume: lllll ")
        .setOnRight(function () {
            sound.incrementMusicVolume();
            this.text = "Music Volume: "
                + "l".repeat(sound.getMusicVolume())
                + ".".repeat(5 - sound.getMusicVolume())
                + " ";
        })
        .setOnLeft(function () {
            sound.decrementMusicVolume();
            this.text = "Music Volume: "
                + "l".repeat(sound.getMusicVolume())
                + ".".repeat(5 - sound.getMusicVolume())
                + " ";
        }));

// Main pause menu
const mainMenu = new LineSelectMenu("Paused");
mainMenu.lines.push(new MenuOption("Resume").setOnActivate(function () {
    console.log("resume");
    menuStack.shift()
}));
mainMenu.lines.push(new MenuOption("Options").setOnActivate(function () {
    menuStack.unshift(optionsMenu);
}));
mainMenu.lines.push(new MenuOption("Controls").setOnActivate(function () {
    menuStack.unshift(controlsMenu);
}));

// Initial menu
const startMenu = new LineSelectMenu("Squarejump");
startMenu.canQuit = false;
startMenu.lines.push(new MenuOption("Start").setOnActivate(function () {
    globals.currentScene.addActor(globals.players[0].character);
    globals.currentScene.reset();
    sound.bgMusic.play();
    menuStack.shift();
}));
startMenu.lines.push(new MenuOption("Options").setOnActivate(function () {
    menuStack.unshift(optionsMenu);
}));
startMenu.lines.push(new MenuOption("Controls").setOnActivate(function () {
    menuStack.unshift(controlsMenu);
}));


menuStack.unshift(startMenu);
module.exports = {
    menuStack,
    mainMenu,
}