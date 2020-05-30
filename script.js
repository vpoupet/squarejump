let pressedKeys = new Set();
let canvas;
let ctx;
let scene;
let lastUpdate = Date.now();
let isRunning = false;


function slowdown(factor) {
    SLOWDOWN_FACTOR = factor;
    lastUpdate = Date.now() / (SLOWDOWN_FACTOR * 1000);
}


function start() {
    isRunning = true;
    update();
}


function stop() {
    isRunning = false;
}


function update() {
    const timeNow = Date.now();
    let deltaTime = (timeNow - lastUpdate) / (1000 * SLOWDOWN_FACTOR);
    if (deltaTime > 1 / FRAMES_PER_SECOND) {
        deltaTime = Math.min(deltaTime, 2 / FRAMES_PER_SECOND);
        ctx.fillStyle = '#221e31';  // background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        scene.update(deltaTime);
        scene.draw();
        lastUpdate = timeNow;
    }
    if (isRunning) {
        requestAnimationFrame(update);
    }
}


window.onload = function () {
    document.addEventListener('keydown', e => {
        pressedKeys.add(e.key);
    });
    document.addEventListener('keyup', e => {
        pressedKeys.delete(e.key);
    });
    const screen = document.getElementById('game-screen');
    screen.style.width = `${WIDTH * SCALING}px`;
    screen.style.height = `${HEIGHT * SCALING}px`;
    canvas = document.getElementById("layer1");
    ctx = canvas.getContext('2d');

    canvas.width = SCALING * WIDTH;
    canvas.height = SCALING * HEIGHT;
    ctx.scale(SCALING, SCALING);

    scene = new Scene(70, 24);
    scene.loadString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxx                             xxxxxxxxxxxxxxx               xxxxxx
xxxxx                             xxxxxx                            xx
x                                     xx                            xx
x                     xx              xx                            xx
x                     xx              xx                            xx
x                                     xxxxx                       xxxx
x                                     xx                            xx
x                           xxxx      xx                            xx
x          xxxxxxx          xxxx      xx                            xx
x          xxxxxxxxx      xxxx        xx                            xx
x          xxxxxxxxxxxxxxxxxxx        xx                            xx
x!!        xxxxxxxxx       xxx                                    xxxx
xxx!!xx    xxxxxxxxx       x                                        xx
xxxxxxx                    x                                        xx
xxxxxxx                x   x                                        xx
xxxxxxx                x           !!!xx                            xx
xxx                    x          !xxxxx                            xx
xxx                    x          !xxxxx                         xxxxx
xxx            xxxx    x          !xxxxx!!!!!!!!!!       !!!!!!!!xxxxx
xxx           !xxxx    xxxx       !xxxxxxxxxxxxxx!!!!!!!!!xxxxxxxxxxxx
xxxxxxxx!!!!!!!xxxx    xxxx!!!!!!!!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
    scene.addPlayer(new Player(16, 4));
    scene.addHazard(new Hazard(7, 20, 2, 2).setMovement(new SequenceMovement([
        new Movement(1.5),
        new LinearMovement(7, 20, 7, 2, 1),
        new Movement(1.5),
        new LinearMovement(7, 2, 7, 20, 1),
    ], -1)))
    scene.addHazard(new Hazard(11, 20, 2, 2).setMovement(new SequenceMovement([
        new Movement(1.5),
        new LinearMovement(11, 20, 11, 14, .25),
        new Movement(1.5),
        new LinearMovement(11, 14, 11, 20, .25),
    ], -1)));
    scene.addHazard(new Hazard(1, 18, 2, 2).setMovement(new SequenceMovement([
        new Movement(1.5),
        new LinearMovement(1, 18, 20, 18, 1),
        new Movement(1.5),
        new LinearMovement(20, 18, 1, 18, 1),
    ], -1)));
    // scene.addHazard(new Slime([
    //     {x: 1, y: 18, d: .25},
    //     {x: 20, y: 18, d: 1.5},
    //     {x: 20, y: 18, d: .25},
    //     {x: 1, y: 18, d: 1.5},
    // ]));
    scene.addSolid(
        new Solid(0, 0, 3, 1).setMovement(
            new SequenceMovement([
                new SineMovement(52, 6, 52, 14, 2, 3),
                new Movement(2),
            ], -1)));
    scene.addSolid(
        new Solid(0, 0, 3, 1).setMovement(
            new SineMovement(55, 16, 60, 16, 2)));
    start();
};