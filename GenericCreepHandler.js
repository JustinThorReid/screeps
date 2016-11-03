/**
 * Created by phatn on 10/30/2016.
 */
var helperFunctions = require("HelperFunctions");
var moveTask = require("task.move");
var roomData = require("RoomDat");

var NEEDED_CREEPS = 4;
var MAX_REPAIR_HITS = 300000;

var TASK_HARVEST = "TASK_HARVEST";
var TASK_UPGRADING = "TASK_UPGRADING";
var TASK_REPAIR = "TASK_REPAIR";
var TASK_BUILD = "TASK_BUILD";
var TASK_DEPOSIT = "TASK_DEPOSIT";
var TASK_REFILL = "TASK_REFILL";

var TYPE_STORAGE = "TYPE_STORAGE";
var TYPE_SOURCE = "TYPE_SOURCE";

var GENERIC_BODIES = [{
    body:[MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY],
    energy:950
},{
    body:[MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,CARRY,CARRY,CARRY],
    energy:800
},{
    body:[MOVE, MOVE, WORK, WORK, WORK, CARRY],
    energy:450
},{
    body:[MOVE,MOVE,WORK,CARRY,CARRY],
    energy:300
}];


var tasks = {
};
tasks[TASK_HARVEST] = (function() {
    return {
        init: function(creep) {
            creep.memory.subrole = TASK_HARVEST;
            creep.memory.harvestId = undefined;
            creep.memory.harvestType = undefined;

            // In a storage based room, no sources or containers need to be considered
            if(creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                creep.memory.harvestId = creep.room.storage.id;
                creep.memory.harvestType = TYPE_STORAGE;
            } else {
                var roomSources = _.shuffle(roomData.getEnergySources(creep.room));
                var sourceToUse = roomSources[0];

                if(sourceToUse.storage.length) {
                    _.each(sourceToUse.storage, function (storageDat) {
                        var storageObj = Game.getObjectById(storageDat.id);

                        if(storageObj && storageObj.store[RESOURCE_ENERGY] > 0) {
                            creep.memory.harvestId = storageDat.id;
                            creep.memory.harvestType = TYPE_STORAGE;
                            return false; //break;
                        }
                    });
                }

                // Default to the source itself
                if(!creep.memory.harvestId) {
                    creep.memory.harvestId = sourceToUse.id;
                    creep.memory.harvestType = TYPE_SOURCE;
                }
            }
        },

        run: function (creep){
            if(creep.carry.energy < creep.carryCapacity) {
                var harvestObj = Game.getObjectById(creep.memory.harvestId);
                if(!harvestObj) {
                    console.log("Creep with TASK_HARVEST did not have source: " + creep.room.name);
                    tasks[TASK_HARVEST].init(creep);
                    return;
                }

                if(creep.memory.harvestType === TYPE_STORAGE) {
                    if(!harvestObj || harvestObj.store[RESOURCE_ENERGY] <= 0) {
                        tasks[TASK_HARVEST].init(creep);
                        return;
                    }

                    if(creep.withdraw(harvestObj, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE){
                        moveTask(creep, harvestObj.pos);
                    }
                } else {
                    if (creep.harvest(harvestObj) === ERR_NOT_IN_RANGE) {
                        moveTask(creep, harvestObj.pos);
                    }
                }
            }
            else {
                return true; // Done with task
            }
        },
        count: 0
    }
})();

tasks[TASK_UPGRADING] = {
    init: function (creep) {
        creep.memory.subrole = TASK_UPGRADING;
    },
    run: function (creep) {
        if(creep.carry.energy === 0){
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
        var repairObj = Memory.needsRepair[0] && Game.getObjectById(Memory.needsRepair[0].id);

        if(!repairObj || creep.carry.energy == 0) {
            return true; // Done with task
        } else {
            var err = creep.repair(repairObj);
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(repairObj);
            } else if(err !== OK) {
                console.log(creep.name + " could not repair " + repairObj.id);
                return true; // Done with task
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
    },
    run: function (creep){
        var target = Game.getObjectById(Memory.highestPriorityConstructionId);
        if(target && target instanceof ConstructionSite && creep.carry.energy > 0) {
            var err = creep.build(target);
            if(err === ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            } else if(err !== OK) {
                console.log(creep.name + " could not build " + target.id);
                return true; // Quit task
            }
        } else {
            if(!target || !(target instanceof ConstructionSite)){
                Memory.highestPriorityConstructionId = undefined;
            }

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
        var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                    structure.energy < structure.energyCapacity;
            }
        });

        if(target) {
            var err = creep.transfer(target, RESOURCE_ENERGY);
            if(err === ERR_NOT_IN_RANGE) {
                moveTask(creep, target.pos, false, false, false);
            } else if(err !== OK) {
                console.log(creep.name + " could not transfer to " + target.id);
                return true; // Quit task
            }
        } else {
            return true; // Done with task
        }

        if(creep.carry.energy == 0) {
            return true; // Done with task
        }
    },
    count: 0
};

tasks[TASK_REFILL] = {
    init: function (creep) {
        creep.memory.subrole = TASK_REFILL;
    },
    run: function (creep){
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity;
            }
        });

        if(targets.length > 0) {
            var err = creep.transfer(targets[0], RESOURCE_ENERGY);
            if(err === ERR_NOT_IN_RANGE) {
                moveTask(creep, targets[0].pos, false, false, false);
            } else if(err !== OK) {
                console.log(creep.name + "could not refill " + targets[0].id);
                return true; //Quit task
            }
        } else {
            return true; // Done with task
        }

        if(creep.carry.energy == 0) {
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

function findTask(creep, nonSpawnRefillList) {
    if(creep.carry.energy == 0) {
        return TASK_HARVEST;
    }

    if(creep.room.controller.ticksToDowngrade < 10000 && tasks[TASK_UPGRADING].count < 1) {
        return TASK_UPGRADING;
    }

    if(creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
        var neededEnergy = creep.room.energyCapacityAvailable - creep.room.energyAvailable;
        var inRoute = creep.carryCapacity * tasks[TASK_DEPOSIT].count;

        if(creep.room.energyAvailable + inRoute < creep.room.energyCapacityAvailable){
            return TASK_DEPOSIT;
        }
    }

    if(nonSpawnRefillList.length > tasks[TASK_REFILL].count) {
        return TASK_REFILL;
    }

    if(Memory.needsRepair.length > tasks[TASK_REPAIR].count) {
        return TASK_REPAIR;
    }

    if(Memory.highestPriorityConstructionId) {
        return TASK_BUILD;
    }

    return TASK_UPGRADING;
}

module.exports = {
    role: 'GenericWorkerCreep',
    run: function(creeps) {
        // Create more creeps
        if(creeps.length <= 1) {
            var newName = Game.spawns['Spawn1'].createCreep(helperFunctions.findBestBodyImmediate(Game.spawns['Spawn1'].room, GENERIC_BODIES), undefined, {role: 'GenericWorkerCreep'});
            console.log('Spawning new generic NOW: ' + newName);
        } else if(creeps.length < NEEDED_CREEPS) {
            var newName = Game.spawns['Spawn1'].createCreep(helperFunctions.findBestBody(Game.spawns['Spawn1'].room, GENERIC_BODIES), undefined, {role: 'GenericWorkerCreep'});
            console.log('Spawning new generic: ' + newName);
        }

        // Build lists
        var spawnStorageList = [],
            repairList = [],
            refillList = [];
        _.each(Game.spawns['Spawn1'].room.find(FIND_STRUCTURES), function (object) {
           if((object.structureType == STRUCTURE_EXTENSION || object.structureType == STRUCTURE_SPAWN) && object.energy < object.energyCapacity) {
               spawnStorageList.push(object);
           }

           if(object.structureType == STRUCTURE_TOWER && object.energy < object.energyCapacity){
               refillList.push(object);
           }

           if(object.hits < Math.min(MAX_REPAIR_HITS, object.hitsMax) / 2.5) {
               repairList.push(object);
           }
        });

        var controller = Game.spawns['Spawn1'].room.controller;

        if(Game.time % 11 === 0) {
            var constructionList = Game.spawns['Spawn1'].room.find(FIND_MY_CONSTRUCTION_SITES);
            var highestPriorityObject = tasks[TASK_BUILD].findHighestPriority(constructionList);

            if(highestPriorityObject){
                Memory.highestPriorityConstructionId = highestPriorityObject.id;
            } else {
                Memory.highestPriorityConstructionId = undefined;
            }
        }

        var keys = {};
        for(var n in Memory.needsRepair) {
            keys[Memory.needsRepair[n].id] = true;
        }

        _.each(repairList, function(object) {
            if(!keys[object.id]) {
                Memory.needsRepair.push({
                    id:object.id,
                    hits:object.hits
                });
            }
        });
        Memory.needsRepair = _.sortBy(Memory.needsRepair, 'hits');

        if(Memory.needsRepair[0]) {
            var repairObj = Game.getObjectById(Memory.needsRepair[0].id);
            while (Memory.needsRepair.length > 0 && (!repairObj || repairObj.hits >= Math.min(MAX_REPAIR_HITS, repairObj.hitsMax))) {
                Memory.needsRepair.pop();

                if(!Memory.needsRepair[0]) {
                    break;
                }
                repairObj = Game.getObjectById(Memory.needsRepair[0].id);
            }
        }

        tasks[TASK_HARVEST].count = 0;
        tasks[TASK_DEPOSIT].count = 0;
        tasks[TASK_UPGRADING].count = 0;
        tasks[TASK_REPAIR].count = 0;
        tasks[TASK_BUILD].count = 0;

        // Handle creeps
        var untaskedCreeps = [];
        _.each(creeps, function (creep) {
            var subrole = creep.memory.subrole;

            if(subrole) {
                if(tasks[subrole].run(creep)){
                    creep.memory.subrole = undefined;
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
            var subrole = findTask(creep, refillList);

            tasks[subrole].count++;
            tasks[subrole].init(creep);
            tasks[subrole].run(creep);

            creep.say(subrole);
        });
    }
}