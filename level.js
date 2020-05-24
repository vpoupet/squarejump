class Block {
    constructor(x, y, width, height) {
        this.x = x - 1;
        this.y = y - 1;
        this.width = width + 1;
        this.height = height + 1;
    }

    contains(x, y) {
        return (this.x < x && x < this.x + this.width && this.y < y && y < this.y + this.height);
    }

    verticalCollision(x, y, dx, dy) {

    }
    isOnTop(x, y) {
        return (this.x < x && x < this.x + this.width && this.y === y);
    }

    draw() {
        ctx.fillStyle = '#888888';
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 1, this.height - 1);
    }
}

obstacles = [
    new Block(2, 46, 60, 1),
    new Block(15, 40, 10, 6),
    new Block(35, 41, 10, 5),
    new Block(29, 41, 2, 1),
    new Block(20, 35, 4, 1),
    new Block(30, 30, 4, 1),
    new Block(20, 25, 4, 1),
    new Block(30, 20, 4, 1),
    new Block(38, 20, 10, 3),
    new Block(46, 31, 10, 13),
    new Block(56, 43, 1, 1),
    new Block(56, 37, 1, 1),
    new Block(56, 31, 1, 1),
];
