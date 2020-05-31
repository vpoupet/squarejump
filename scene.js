class Scene {
    constructor(width, height, startPositionX = undefined, startPositionY = undefined) {
        this.width = width;
        this.height = height;
        this.scrollX = 0;
        this.scrollY = 0;
        this.solids = [];
        this.hazards = [];
        this.actors = [];
        if (startPositionX !== undefined && startPositionY !== undefined) {
            this.player = new Player(startPositionX, startPositionY);
            this.startPositionX = startPositionX * GRID_SIZE;
            this.startPositionY = startPositionY * GRID_SIZE;
            this.addActor(this.player);
        } else {
            this.startPositionX = undefined;
            this.startPositionY = undefined;
            this.player = undefined;
        }
    }

    setStartPosition(x, y) {
        this.startPositionX = x * GRID_SIZE;
        this.startPositionY = y * GRID_SIZE;
        this.player = new Player(x, y);
        this.addActor(this.player);
    }

    static fromString(s) {
        const lines = s.split('\n');
        const height = lines.length;
        const width = lines[0].length;
        const scene = new Scene(width, height);
        for (let i = 0; i < lines.length; i++) {
            for (let j = 0; j < lines[i].length; j++) {
                switch (lines[i][j]) {
                    case 'x':
                        scene.addSolid(new Solid(j, height - i - 1, 1, 1));
                        break;
                    case '!':
                        scene.addHazard(new Hazard(j, height - i - 1, 1, 1));
                        break;
                    case 'P':
                        scene.setStartPosition(j, height - i - 1);
                        break;
                }
            }
        }
        return scene;
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
}


const FORSAKEN_CITY_1 = Scene.fromString(`\
xxx                                     
xxx                                     
xxx                                     
xxx                                     
xxx                     !!!!            
xxx                 !!!!xxxx            
xxxxx     !!!!!!    xxxxxxxx            
          xxxxxx    xxxxxx              
          xxxxxx    xx                  
          xxxxxx B  x                   
  P       xxxxxx    x                 xx
xxxxxx    xxxxxx               xxxxxxxxx
xxxx x    xxxxxx           --xxxxxxxxxxx
xx   x    xxxxx              xxxxxxxxxxx
xx        xxxxx                 xxxxxxxx
x         xxxx                  xxxxxxxx
x         xxxx                  xxxxxxxx
x         xxxx            -----xxxxxxxxx
x       xxxxxx                 xxxxxxxxx
x       xxxxxx              xxxxxxxxxxxx
x       xxxxxx!!      xxxxxxxxxxxxxxxxxx
x---xxxxxxxxxxxx!!!!!!xxxxxxxxxxxxxxxxxx
x   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);


const FORSAKEN_CITY_2 = Scene.fromString(`\
xxxx                                xxxxx
xxxx                                xxxxx
xx           !!                        xx
             xx                        xx
             xx                        xx
S            xx                        xx
             xx                         x
 P                                      x
xxxxxx              !!                   
xxxxxx              xx           !       
xxxxxx              xx           x!      
xxxxxx--     D      xx          !xx      
xxxxxx              xx          xxx!     
xxxxxx              !!          xxxx     
x  xxx                          !!!!     
    x                                    
    x                                    
    x                                    
  xxx!!!!      !!!!!!    BB              
  xxxxxxx!!!!!!xxxxxx!!!!xxxx            
  xxxxxxxxxxxxx  xxxxxxxxxxxx            
  xxx   x     x      x    xxxxxxxxxxxxx--
  xxx   x     x      x    xxxxxxxxxxxxx`);


const TEST_LEVEL = Scene.fromString(`\
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
xxx              P     x          !xxxxx                         xxxxx
xxx            xxxx    x          !xxxxx!!!!!!!!!!       !!!!!!!!xxxxx
xxx           !xxxx    xxxx       !xxxxxxxxxxxxxx!!!!!!!!!xxxxxxxxxxxx
xxxxxxxx!!!!!!!xxxx    xxxx!!!!!!!!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);

TEST_LEVEL.addHazard(new Hazard(7, 20, 2, 2).setMovement(new SequenceMovement([
    new Movement(1.5),
    new LinearMovement(7, 20, 7, 2, 1),
    new Movement(1.5),
    new LinearMovement(7, 2, 7, 20, 1),
], -1)))
TEST_LEVEL.addHazard(new Hazard(11, 20, 2, 2).setMovement(new SequenceMovement([
    new Movement(1.5),
    new LinearMovement(11, 20, 11, 14, .25),
    new Movement(1.5),
    new LinearMovement(11, 14, 11, 20, .25),
], -1)));
TEST_LEVEL.addHazard(new Hazard(1, 18, 2, 2).setMovement(new SequenceMovement([
    new Movement(1.5),
    new LinearMovement(1, 18, 20, 18, 1),
    new Movement(1.5),
    new LinearMovement(20, 18, 1, 18, 1),
], -1)));
TEST_LEVEL.addSolid(
    new Solid(0, 0, 3, 1).setMovement(
        new SequenceMovement([
            new SineMovement(52, 6, 52, 14, 2, 3),
            new Movement(2),
        ], -1)));
TEST_LEVEL.addSolid(
    new Solid(0, 0, 3, 1).setMovement(
        new SineMovement(55, 16, 60, 16, 2)));
