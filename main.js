var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepair = require('role.repair');
var longRangeHarvester = require('LongRangeHarvester');

module.exports.loop = function () {

	// Old memory cleanup
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
			console.log('Clearing non-existing creep memory:', name);
        }
    }
	
	//longRangeHarvester.manageLongRangeCreeps();

    var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
    if(harvesters.length < 2) {
        var newName = Game.spawns['Spawn1'].createCreep([MOVE,WORK,CARRY], undefined, {role: 'harvester'});
        console.log('Spawning new harvester: ' + newName);
    }
    
    var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
    if(harvesters.length < 4) {
        var newName = Game.spawns['Spawn1'].createCreep([MOVE,WORK,CARRY], undefined, {role: 'upgrader'});
        console.log('Spawning new upgrader: ' + newName);
    }

    // Check if spawn needs refilling first
    var energyStorage = Game.spawns['Spawn1'].room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                structure.energy < structure.energyCapacity;
        }
    });
    var building = Game.spawns['Spawn1'].room.find(FIND_CONSTRUCTION_SITES);
    var repairList = Game.spawns['Spawn1'].room.find(FIND_STRUCTURES, {
        filter: function(object){
            return object.structureType === STRUCTURE_ROAD && (object.hits < object.hitsMax / 3);
        } 
    });

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            if(energyStorage.length) {
                roleHarvester.run(creep);
            } else if(repairList.length) {
                roleRepair.run(creep);
            } else if(building.length) {
                roleBuilder.run(creep);
            } else {
                roleUpgrader.run(creep);
            }
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
        if(creep.memory.role == 'attacker') {
            roleAttacker.run(creep);
        }
    }
}