const constants = require('./constants');

class Menu {
    constructor(title, options, selected = 0) {
        this.title = title;
        this.options = options;
        this.selected = selected;
    }

    draw(ctx) {
        ctx.font = 'normal 12px gameboy';
        ctx.textAlign = "center";
        const lineHeight = ctx.measureText('M').actualBoundingBoxAscent;

        this.drawLine(this.title, lineHeight, ctx);
        // ctx.fillStyle = "#ffffffaa";
        // const textMetrics = ctx.measureText(message);
        // ctx.fillRect(
        //     constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
        //     constants.VIEW_HEIGHT / 2 - textMetrics.actualBoundingBoxAscent - 5,
        //     textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
        //     textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent + 10);
        // ctx.fillStyle = "#000000";
        // ctx.fillText(message, constants.VIEW_WIDTH / 2, constants.VIEW_HEIGHT / 2);
    }

    drawLine(message, y, ctx, selected = false) {
        ctx.fillStyle = selected ? "#000000aa" : "#ffffffaa";
        const textMetrics = ctx.measureText(message);
        ctx.fillRect(
            constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
            y - textMetrics.actualBoundingBoxAscent - 5,
            textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
            textMetrics.actualBoundingBoxAscent + 10);
        ctx.fillStyle = selected ? "#ffffff" : "#000000";
        ctx.fillText(message, constants.VIEW_WIDTH / 2, y);
    }
}


function displayMessage(message, ctx, y, selected = false) {
    ctx.font = 'normal 12px gameboy';
    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffffaa";
    const textMetrics = ctx.measureText(message);
    ctx.fillRect(
        constants.VIEW_WIDTH / 2 - textMetrics.actualBoundingBoxLeft - 5,
        y - textMetrics.actualBoundingBoxAscent - 5,
        textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft + 10,
        textMetrics.actualBoundingBoxAscent + 10);
    ctx.fillStyle = "#000000";
    ctx.fillText(message, constants.VIEW_WIDTH / 2, y);
}


module.exports = {
    Menu,
    displayMessage,
}