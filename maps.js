"use strict"
const scene = require('./scene');
const movement = require('./movement');
const physics = require('./physics');
const constants = require('./constants');
const U = constants.GRID_SIZE;


function makeTransitionUp(scene1, x1, y1, scene2, x2, y2, width) {
    const transitionUp = new physics.Transition(
        x1 * U, (y1 + 1) * U, width * U, 0, scene2, x2 * U, (y2 + 3) * U
    );
    transitionUp.boostY = constants.TRANSION_BOOST_UP;
    scene1.addElement(transitionUp);
    scene2.addElement(new physics.Transition(
        x2 * U, (y2 - 1) * U, width * U, 0, scene1, x1 * U, (y1 - 3) * U
    ))
}

function makeTransitionRight(scene1, x1, y1, scene2, x2, y2, height) {
    scene1.addElement(new physics.Transition(
        x1 * U, y1 * U, 0, height * U, scene2, (x2 + 1) * U, y2 * U
    ))
    scene2.addElement(new physics.Transition(
        x2 * U, y2 * U, 0, height * U, scene1, (x1 - 1) * U, y1 * U
    ))
}


const CELESTE_01 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx     xxxx
xx  x xxx    xxxxxxxxx              xxxx
xx  x   x    xxxxx   x             xxxxx
xx  xxx x    xxx     x             xxxxx
xx  x   x    xxx                  xxxxxx
xx  x   x    xxx                   xxxxx
xx  xxxxx                          xxxxx
xx                             xxxxxxxxx
xx                             xxxxxxxxx
x                              xxxxxxxxx
x                 xxxx           !xxxxxx
x                 x  x           !xxxxxx
x                 x  x              xxxx
x                 xxxx              xxxx
x                 xxxx              xxxx
x                 xxxx!!!!          xxxx
x         xxx     xxxxxxxx           xxx
x  P      xxx     xxxxxxxx           xxx
xxxxx     xxx!!!!!xxxxxxxx            xx
xxxxx     xxxxxxxxxxxxxxxx!!!          x
xxxxx!!!!!xxxxxxxxxxxxxxxxxxx          x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxx          x`);


const CELESTE_02 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xx
xxx     xx    x xxxxxxxxxxxxxxxxxx    xx
xxx     xx    x     xxxxx  xxxxxxx    xx
xxxxxxxxxx    x     xxxxx    xxxxx    xx
xxx     x     x     xxxxx    xxxxx    xx
xxxxxxxxx  S         xxxx    xxxxx    xx
xxx     x            xxx        xx    xx
xxxxxxxxx            xxx        xx    xx
xx                   xxx        xx    xx
xx                              xx    xx
xx                               x    xx
xx                               x    xx
x                                     xx
x                   !!!!!             xx
x                   xxxxx             xx
x                   xxxxx       xxxxxxxx
x                   xxxx        xxxxxxxx
x             B      xxx        xxxxxxxx
x             xx     xxx    xxxxxxxxxxxx
x  P          xx     xxx!!  xxxxxxxxxxxx
x-----xxxxxxxxxx     xxxxx!!xxxxxxxxxxxx
x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx
x     xxxxxx  xx     xxxxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_01, 31, 23, CELESTE_02, 1, 0, 5);


const CELESTE_03 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xxx
xxxxxx         xxxxxxxxxxxx    xx    xxx
xxxxxx         xx         x     x    xxx
xx                        x          xxx
xx                                   xxx
x                                    xxx
x                                     xx
x        xxx                   xxx    xx
x        xxx                   xxx    xx
x          x                   xxx    xx
x          x                   xx     xx
x          x    x              xx      x
x               x              xx      x
x               xxxx            x      x
x               xxxx                   x
x               xxxx      !!!      S   x
x                 xx      xxx!!!!!     x
x                 xx      xxxxxxxx    !x
xx                 x   !!!xxxxxxxx!!!!xx
xx  P                  xxxxxxxxxxxxxxxxx
xx----xxx              xxxxxxxxxxxxxxxxx
xx    xxx              xxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_02, 34, 23, CELESTE_03, 2, 0, 4);


const CELESTE_04 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxxx
xxxxxxxxxxxx      xxx    xxxxxxxxxx xxxx
xxxxxx            xxx      xxxxx    xxxx
xxxxx             xxx      !xxxx    xxxx
xxx                 x      !xxxx      xx
xxx                 x      !xxxx      xx
xxx                        !xx        xx
xxx                          x        xx
xxx     xx--                 x        xx
xxx     xx                   x        xx
xxx     xx                   x        xx
xxx     !x                            xx
xxx     !x!!                           x
xx!     !xxx                           x
xx!     !xx                            x
xx!                                    x
xx!                                    x
xxx                                    x
xxx  P                                 x
xxx----xxxx                            x
xxx    xxxx                            x
xxx    xxxx                            x`);

CELESTE_04.addSolid(new physics.TriggerBlock(14 * U, 11 * U, 3 * U, 2 * U, new movement.SequenceMovement([
    new movement.Movement(0.5),
    new movement.LinearMovement(14 * U, 11 * U, 23 * U, 12 * U, .5),
    new movement.Movement(1),
    new movement.LinearMovement(23 * U, 12 * U, 14 * U, 11 * U, 1),
])));
makeTransitionUp(CELESTE_03, 33, 23, CELESTE_04, 3, 0, 4);


const CELESTE_05 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxx    xxxxxxxxxxxxxx
xxxxxx             xxx    xxxxxxxxxxxxxx
xxxx                                xxxx
xxxx                                  xx
xxxx                                  xx
xx                     xxx             x
xx                xxxxxxxx             x
xx                xxxxxxxx             x
xx            S    xxxxxxx    ===      x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                  xxxxxx             x
xx                     xxx             x
x                      xx   ===        x
x                      xx              x
x                       x              x
x                       x         ===  x
x                                      x
x                                      x
x  x          xx             ===       x
xxxx  P       xx                       x
xxxx----xxxxxxxxxxxxxxxxxx             x
xxxx    xxxxxx  xxxxxxxxxx             x`);

makeTransitionUp(CELESTE_04, 21, 23, CELESTE_05, 4, 0, 4);


const CELESTE_06 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   xx
xx         xxxxxxxxxxxxxxxxxxxxxxxx   xx
xx         xxxxxxxxxxxxxxxxxxxxxxxx   xx
xx            xxxxxxxxxxxxxxxxxxxxx   xx
xx S          xxx    xxxxxxxxxxxxxx   xx
xx                   xxxxxxxxxxx! x   xx
xxx                   xx  xxxxxx!      x
xxx                          xxx!      x
xxxxx                        xxx!      x
xx                           xxx!      x
x     !!!                     xx!      x
x     xxx                     xxx      x
x     xxx                     xxx      x
x      xx                      xx      x
x      xx                      xx      x
x                                   B  x
x                                   xx x
x                                   xxxx
x                                   xxxx
x                       xxx         xxxx
x                       xxx         xxxx
x!                   !!!xxx         xxxx
xx    !!!            xxxxxx          xxx
xx!!!!xxx            xxxxxx          xxx
xxxxxxxxx!!!!    !!!!xxxxxx          xxx
xxxxxxxxxxxxx    xxxxxxxxxxx         xxx
xxxxxxxxxxxxx    xxxxx  xxxx          xx
xxxxxxx            xx   xxx           xx
xxxxxx                  xx            xx
xxx                      x            xx
                         x              
                         x              
                         x              
xx  P      xx    xxx     xxx            
xxx----xxxxxx    xxx!!!!!xxx        ---x
xxx    xxxxxxxxxxxxxxxxxxxxx           x`);

CELESTE_06.addSolid(new physics.TriggerBlock(13 * U, U, 4 * U, 2 * U, new movement.SequenceMovement([
    new movement.Movement(0.5),
    new movement.LinearMovement(13 * U, U, 13 * U, 9 * U, .3),
    new movement.Movement(1),
    new movement.LinearMovement(13 * U, 9 * U, 13 * U, U, 1),
])));
makeTransitionUp(CELESTE_05, 22, 23, CELESTE_06, 3, 0, 4);


const CELESTE_07 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxx       xxxxxxxx!   xxxxxxxxxx
xxxxxxxxx           xxxxxx!   xxxxxxxxxx
xxxxxxxxx           xxxxxx!   xxxxxxxxxx
xxxxxxxxx            xxxxx!   xxxxxxxxxx
xxxxxxxxx            xxxxx!   xxxxxxxxxx
xxxxxxxxx     !       xxxx!   xxxxxxxxxx
xxxxxxxxx     x        xxx!   xxxxxxxxxx
xxxxxxxxx     x        xxx!   xxxxxxxxxx
xxxxxxxxx!    x        xxx!   xxxxxxxxxx
xxxxxxxxxx    x        xxx!   xxxxxxxxxx
xxxxxxxxxx    xB       xxx!   xxxxxxxxxx
xxxxxxxxxx    xxx--   xxxx!   xxxxxxxxxx
xxxxxxxxxx   !xxx     xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxx     xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxxx----xxxx!   xxxxxxxxxx
xxxxxxxxxx   xxxxx      xx!   xxxxxxxxxx
xxxxxxxxxx   xxx        xx!   xxxxxxxxxx
xxxxxxxxxx!  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx        xx!   xxxxxxxxxx
xxxxxxxxxxx  xxx!!!     xx!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx      x!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx      x!   xxxxxxxxxx
xxxxxxxxxxx  xxxxxx           xxxxxxxxxx
xxxxxxxxxx   xxxxxxxxx                xx
xxxxxxxxxx      xxxxxx                xx
xxxxxxxxx           xx                 x
xxxxxxxxx           xxx---xxxx----      
xxxxxxxxx        S        xxx           
xxxxxxxxx                 xxx        P  
xxxxxxxxx         xxxxxxxxxxx    xxxxxxx
xxxxxxxxx!!!!!!!xxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxx  xxxxxxxxxxxxxxxxxxxxxx`);

makeTransitionRight(CELESTE_07, 40, 3, CELESTE_06, 0, 3, 3);


const CELESTE_08 = scene.Scene.fromString(`\
xxx                                     
xxx                                     
xxx                                     
xxx                                     
xxx                     !!!!            
xxx                 !!!!xxxx            
xxxxx     !!!!!!    xxxxxxxx            
          xxxxxx    xxxxxx              
          xxxxxx    xx                  
          xxxxxx D  x                   
          xxxxxx    x                 xx
xxxxxx    xxxxxx               xx----xxx
xxxx x    xxxxxx           --xxxx    xxx
xx   x    xxxxx              xxxx S  xxx
xx        xxxxx                      xxx
x         xxxx                       xxx
x         xxxx                       xxx
x         xxxx            -----xxxxxxxxx
x       xxxxxx              !!!xxxxxxxxx
x       xxxxxx        !!!!!!xxxxxxxxxxxx
x P     xxxxxx!!      xxxxxxxxxxxxxxxxxx
x---xxxxxxxxxxxx!!!!!!xxxxxxxxxxxxxxxxxx
x   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);

makeTransitionUp(CELESTE_06, 35, 36, CELESTE_08, 1, 0, 3);


const CELESTE_09 = scene.Scene.fromString(`\
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxx          xxxx  xxxxxxxxxxxxxxxxxxxxx
xxx                xxx  xxxx    xxxxxxxx
x                  xx            xxxxxxx
                   xx            xxxxxxx
         !xxxxx----xx        S    xxxxxx
         !xxxxx                   xxxxxx
  P      !xxxxx                  xxxxxxx
xx---    !xxx                   xxxxxxxx
xx       !xxx            xxxxxxxxxxxxxxx
xx       !xx               xxxxxxxxxxxxx
xx   !!  !xx                   xxxxxxxxx
xx!!!xx  !xx                   xxxxxxxxx
xxxxxxx                          xxxxxxx
xxxxxxx                           xxxxxx
xxxxxxx                           x  xxx
xxxxxxx                              xxx
xxxxxxx                              xxx
xxxxxxx                              xxx
xxxx!                                 xx
xxxx!                                 xx
xxxx!                                  x`);

CELESTE_09.addSolid(new physics.TriggerBlock(14 * U, 3.5 * U, 2 * U, 3 * U, new movement.SequenceMovement([
    new movement.Movement(.5),
    new movement.LinearMovement(14 * U, 3.5 * U, 21 * U, 7.5 * U, .5),
    new movement.Movement(1),
    new movement.LinearMovement(21 * U, 7.5 * U, 14 * U, 3.5 * U, 1.5),
])));
makeTransitionRight(CELESTE_06, 40, 2, CELESTE_09, 0, 14, 4);


const CELESTE_10 = scene.Scene.fromString(`\
xx   xxxx                          xxxxx
xx   xxx                           xxxxx
xx   xx                            xxxxx
xx                                 xxxxx
xx                                  xxxx
xx        xxx                       xxxx
xx        xxx                       xxxx
xx        xxx                           
          x                                       
                                        
                                     P  
                                    xxxx
xxxxxx                              xxxx
xxxxxx                               xxx
xxxxxx                               xxx
xxxxxx         D                     xxx
xxxxxxxxx                            xxx
xxxxxxxxx                            xxx
xxxxxxxxx                    xxxx    xxx
xxxxxxxxx!!                  xxxxxxxxxxx
xxxxxxxxxxx!!!!!!!!!!!!!     xxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxx!!!!!xxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
makeTransitionRight(CELESTE_10, 40, 12, CELESTE_08, 0, 12, 4);


const CELESTE_11 = scene.Scene.fromString(`\
xxxxxxx                                xxxxxxxxx
xxxxxxx                                xxxxxxxxx
xxxxx           !!                        xxxxxx
xx              xx                        xxxxxx
xx              xx                        xxxxxx
xx  S           xx                        xxxxxx
xx              xx                         xxxxx
xx                                         xxxxx
xx xxxxxx              !!                   xxxx
xx xxxxxx              xx           !       xxxx
xx xxxxxx              xx           x!      xxxx
xx xxxxxx--     D      xx          !xx      xxxx
xx xxxxxx              xx          xxx!     xxxx
xx xxxxxx              !!          xxxx     xxxx
xx x  xxx                          !!!!      xxx
xx     x                                     xxx
xx     x                                     xxx
xx     x                                     xxx
xx   xxx!!!!      !!!!!!    B                xxx
xx   xxxxxxx!!!!!!xxxxxx!!!!xxxx             xxx
xxx  xxxxxxxxxxxxx  xxxxxxxxxxxx    B     P  xxx
xxx  xxx   x     x      x    xxxxxxxxxxxxx-- xxx
xxx  xxx   x     x      x    xxxxxxxxxxxxx   xxx`);
makeTransitionUp(CELESTE_10, 2, 23, CELESTE_11, 42, 0, 3);


const CELESTE_12 = scene.Scene.fromString(`\
xxx  xxx   x     x      x    xxxxxxxxxxx
xxx  xxxxxxxxx   x  xxxxxxxxxxxxxxxxxxxx
xxx  xx    xxxxxxxxxxxxx  xxxxxxxxxxxxxx
xxx==xx                       xxxxxxxxxx
xxx                           xxxxxxxxxx
xxx                           xxxxxxxxxx
xx                             xxxxxxxxx
xx                                xxxxxx
xx                                      
xxxxxxx                                 
xxxxxxx                                 
xxxxxxx                              P  
xx    x                     xxxxxxxxxxxx
x                             xxxxxxxxxx
x                              xxxxxxxxx
x                              xxxxxxxxx
x                              xxxxxxxxx
xxx                           xxxxxxxxxx
xxx                      xxxxxxxxxxxxxxx
xxx         xxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
makeTransitionRight(CELESTE_12, 40, 11, CELESTE_10, 0, 11, 4);
makeTransitionUp(CELESTE_12, 3, 23, CELESTE_11, 3, 0, 2);


const CELESTE_13 = scene.Scene.fromString(`\
    xxxxxxxxxxx!                                 
    xxxxxxxxxxx!                                 
    x  xxxxxxxx!                                 
    x  xxxxxxxx!                                 
    x    xxxxxx!                                 
         xxxxxx!                                 
         xxxxx                                   
         xxxxx                                   
          xxxx    D           xxxx               
  P       xxxx           -----xxxx               
xxx---    xxxx                xxxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                 xxxxxxxxxxxxxxxxxx
xxx       xxxx                  xxxxxxxxxxxxxxxxx
xxx   !!!!x                     xxxxxxxxxxxxxxxxx
xxx   ----x                      xxxxxxxxxxxxxxxx
xxx       x                      xxxxxxxxxxxxxxxx
xxx                              xxxxxxxxxxxxxxxx
xxx                               xxxxxxxxxxxxxxx
xxx                               xxxxxxxxxxxxxxx
xxx     xxxxx                     xxxxxxxxxxxxxxx
xxx     xxxxx                     xxxxxxxxxxxxxxx`);

makeTransitionRight(CELESTE_08, 40, 13, CELESTE_13, 0, 13, 10);


const TEST_LEVEL = scene.Scene.fromString(`\
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

TEST_LEVEL.addElement(
    new physics.Hazard(7 * U, 20 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(7 * U, 20 * U, 7 * U, 2 * U, 1),
            new movement.Movement(1.5),
            new movement.LinearMovement(7 * U, 2 * U, 7 * U, 20 * U, 1),
        ], -1)));
TEST_LEVEL.addElement(
    new physics.Hazard(11 * U, 20 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(11 * U, 20 * U, 11 * U, 14 * U, .25),
            new movement.Movement(1.5),
            new movement.LinearMovement(11 * U, 14 * U, 11 * U, 20 * U, .25),
        ], -1)));
TEST_LEVEL.addElement(
    new physics.Hazard(U, 18 * U, 2 * U, 2 * U)
        .setMovement(new movement.SequenceMovement([
            new movement.Movement(1.5),
            new movement.LinearMovement(U, 18 * U, 20 * U, 18 * U, 1),
            new movement.Movement(1.5),
            new movement.LinearMovement(20 * U, 18 * U, U, 18 * U, 1),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, U)
        .setMovement(new movement.SequenceMovement([
            new movement.SineMovement(52 * U, 6 * U, 52 * U, 14 * U, 2, 3),
            new movement.Movement(2),
        ], -1)));
TEST_LEVEL.addSolid(
    new physics.Solid(0, 0, 3 * U, U)
        .setMovement(new movement.SineMovement(55 * U, 16 * U, 60 * U, 16 * U, 2, -1)));


module.exports = {
    CELESTE_01,
    CELESTE_02,
    CELESTE_03,
    CELESTE_04,
    CELESTE_05,
    CELESTE_06,
    CELESTE_07,
    CELESTE_08,
    CELESTE_09,
    TEST_LEVEL,
}
