/**
 * Created by phatn on 10/30/2016.
 */
var helperFunctions = require("HelperFunctions");
var moveTask = require("task.move");

var NEEDED_CREEPS = 8;
var MIN_UPGRADING = 1; // must have 1 to keep from loosing the room

var TASK_HARVEST = "TASK_HARVEST";
var TASK_UPGRADING = "TASK_UPGRADING";
var TASK_REPAIR = "TASK_REPAIR";
var TASK_BUILD = "TASK_BUILD";
var TASK_DEPOSIT = "TASK_DEPOSIT";

/*
rooms = {
    "E1S1": [{
        'id':'asda',
        'slots':[
            {x:1, y:1}
        ]
    }]
 */
var rooms = {};
function addRoomData(room) {
    var roomData = [];
    var sources = _.shuffle(room.find(FIND_SOURCES));

    _.each(sources, function(source) {
        var sourceData = {};
        sourceData.id = source.id;
        sourceData.slots = _.map(_.filter(room.lookForAtArea(LOOK_TERRAIN, source.pos.y-1, source.pos.x-1, source.pos.y+1, source.pos.x+1, true), function(object){
            return object[LOOK_TERRAIN] !== "wall";
        }), function(object) {
           return {x: object.x, y: object.y};
        });

        roomData.push(sourceData);
    });

    rooms[room.name] = roomData;
    return roomData;
}

var tasks = {
};
tasks[TASK_HARVEST] = {
    init: function(creep) {
        creep.memory.subrole = TASK_HARVEST;

        var roomSources = rooms[creep.room.name];
        if (!roomSources) {
            roomSources = addRoomData(creep.room);
        }

         // Find first slot that has no creep
         var sourceToUse = false;
         _.each(roomSources, function(source) {
             _.each(source.slots, function(slot) {
                 if(!creep.room.lookForAt(LOOK_CREEP, slot.x, slot.y).length) {
                     sourceToUse = source;
                     return false; // break;
                 }
             });

             if(sourceToUse) {
                return false; // break;
             }
         });

        if(!sourceToUse){
            sourceToUse = roomSources[Math.floor(Math.random() * roomSources.length)];
        }
        //var slot = source.slots[Math.floor(Math.random() * source.slots.length)];

        creep.memory.harvestId = source.id;
        //creep.memory.harvestSlot = slot;
    },

    run: function (creep){
        if(creep.carry.energy < creep.carryCapacity) {
            var source = Gme.getObjectById(creep.memory.harvestId);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                moveTask(creep, source.pos);
            }
        }
        else {
            creep.memory.subrole = undefined;
            return true; // Done with task
        }
    },
    count: 0
};

tasks[TASK_UPGRADING] = {
    init: function (creep) {
        creep.memory.subrole = TASK_UPGRADING;
    },
    run: function (creep) {
        if(creep.carry.energy === 0){
            creep.memory.subrole = undefined;
            return true; // Done with task
        } else if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            moveTask(creep, creep.room.controller.pos, creep.room.controller.ticksToDowngrade < 2500);
        }
    },
    count: 0
};

tasks[TASK_REPAIR] = {
    init: function (creep) {
        creep.memory.subrole = TASK_REPAIR;
    },
    run: function (creep) {
        var repairObj = Game.getObjectById(Memory.needsRepair[0]);

        if(!repairObj || creep.carry.energy == 0) {
            creep.memory.subrole = undefined;
            return true; // Done with task
        } else {
            if (creep.repair(repairObj) == ERR_NOT_IN_RANGE) {
                creep.moveTo(repairObj);
            }
        }
    },
    count: 0
};

// Higher is more important
var buildingPriority = {};
buildingPriority[STRUCTURE_EXTENSION] = 10;
buildingPriority[STRUCTURE_TOWER] = 9;
buildingPriority[STRUCTURE_WALL] = 8;
buildingPriority[STRUCTURE_RAMPART] = 7;
buildingPriority[STRUCTURE_ROAD] = 6;
buildingPriority[STRUCTURE_CONTAINER] = 2;


tasks[TASK_BUILD] = {
    findHighestPriority: function(constructionList) {
        if(!constructionList.length) {
            return undefined;
        }

        var highest = {
            val: constructionList[0],
            priority: buildingPriority[constructionList[0].structureType] || -1000
        };

        _.each(constructionList, function(object){
            if(buildingPriority[object.structureType] > highest.priority) {
                highest.val = object;
                highest.priority = buildingPriority[object.structureType];
            }
        });

        return highest.val;
    },
    init: function(creep) {
        creep.memory.subrole = TASK_BUILD;
        creep.memory.targetBuilding = highestPriorityConstruction.id;
    },
    run: function (creep){
        var target = Game.getObjectById(creep.memory.targetBuilding);
        if(target && target instanceof ConstructionSite) {
            if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        } else {
            creep.memory.subrole = undefined;
            creep.memory.targetBuilding = undefined;
            return true; // Done with task
        }
    },
    count: 0
};

tasks[TASK_DEPOSIT] = {
    init: function (creep) {
        creep.memory.subrole = TASK_DEPOSIT;
    },
    run: function (creep){
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                    structure.energy < structure.energyCapacity;
            }
        });

        if(targets.length > 0) {
            if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                moveTask(creep, targets[0].pos, false, false, false);
            }
        } else {
            creep.memory.subrole = undefined;
            return true; // Done with task
        }
    },
    count: 0
};

// Focus on building first, then upgrading
// Keep spawner filled first, then repair

/*
Task should be sticky - don't stop upgrading once started


Move to task
Start Task
Harvest -> choose task

pull out creeps to meet minimum upgrade
pull out creeps to meet minimum repair

if spawn needs
- make sure there are minimum number of tasked creeps

if construction
- assign creeps to random construction jobs

assign more to repair
assign rest to upgrade

 */

function findTask(creep) {
    if(creep.carry.energy == 0) {
        return TASK_HARVEST;
    }

    if(tasks[TASK_UPGRADING].count < MIN_UPGRADING) {
        return TASK_UPGRADING;
    }

    if(creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
        var neededEnergy = creep.room.energyCapacityAvailable - creep.room.energyAvailable;
        var bodyUsed = helperFunctions.findBestBody(creep.room, GENERIC_BODIES);
        var energyPerCreep = _.countBy(bodyUsed)[CARRY] * 50;
        var inRoute = energyPerCreep * tasks[TASK_DEPOSIT].count;

        if(creep.room.energyAvailable + inRoute < creep.room.energyCapacityAvailable){
            return TASK_DEPOSIT;
        }
    }

    if(Memory.needsRepair.length > tasks[TASK_REPAIR].count) {
        return TASK_REPAIR;
    }

    if(highestPriorityConstruction) {
        return TASK_BUILD;
    }

    return TASK_UPGRADING;
}

var MAX_REPAIR_HITS = 300000;
var highestPriorityConstruction = {};

module.exports = {
    role: 'GenericWorkerCreep',
    run: function(creeps) {
        // Create more creeps
        if(creeps.length < NEEDED_CREEPS) {
            var newName = Game.spawns['Spawn1'].createCreep([MOVE,MOVE,WORK,WORK,WORK,CARRY], undefined, {role: 'GenericWorkerCreep'});
            console.log('Spawning new generic: ' + newName);
        }

        // Build lists
        var spawnStorageList = [],
            constructionList = [],
            repairList = [];
        _.each(Game.spawns['Spawn1'].room.find(FIND_STRUCTURES), function (object) {
           if((object.structureType == STRUCTURE_EXTENSION || object.structureType == STRUCTURE_SPAWN) && object.energy < object.energyCapacity) {
               spawnStorageList.push(object);
           } else if(object.structureType == STRUCTURE_CONSTRUCTION_SITE) {
               constructionList.push(object);
           } else if(object.hits < object.hitsMax / 2.5 && object.hits < MAX_REPAIR_HITS) {
               repairList.push(object);
           }
        });

        var controller = Game.spawns['Spawn1'].room.controller;
        var highestPriorityConstruction = tasks[TASK_BUILD].findHighestPriority(constructionList);

        if(Game.time % 100 === 0) {
            var repairList = _.sort(repairList, ['hits']);
            var repairList = _.map(repairList, function(object) {
                return object.id;
            });
            Memory.needsRepair = _.union(Memory.needsRepair, repairList);

            var repairObj = Game.getObjectById(Memory.needsRepair[0]);
            while(repairObj && (repairObj.hits === repairObj.hitsMax || repairObj.hits > MAX_REPAIR_HITS)) {
                repairObj = Game.getObjectById(Memory.needsRepair.pop());
            }
        }

        // Handle creeps
        var untaskedCreeps = [];
        _.each(creeps, function (creep) {
            var subrole = creep.memory.subrole;

            if(subrole) {
                if(tasks[subrole].run(creep)){
                    untaskedCreeps.push(creep);
                } else {
                    tasks[subrole].count++;
                }
            } else {
                untaskedCreeps.push(creep);
            }
        });

        // Assign jobs
        _.each(untaskedCreeps, function(creep) {
            var subrole = findTask(creep);

            tasks[subrole].count++;
            tasks[subrole].init(creep);
            tasks[subrole].run(creep);
        });
    }
}