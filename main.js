var genericCreepHandler = require("GenericCreepHandler");
var longRangeHarvester = require('LongRangeHarvester');
var roleAttacker = require('attacker');

module.exports.loop = function () {
	// Old memory cleanup
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
			console.log('Clearing non-existing creep memory:', name);
        }
    }
	
	longRangeHarvester.manageLongRangeCreeps();
    genericCreepHandler.run(_.filter(Game.creeps, (creep) => creep.memory.role == genericCreepHandler.role));

    var attackers = _.filter(Game.creeps, (creep) => creep.memory.role == 'attacker');
    if(attackers.length < 2) {
        var newName = Game.spawns['Spawn1'].createCreep([MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK], undefined, {role: 'attacker'});
        console.log('Spawning new attacker: ' + newName);
    }

    if(!Game.spawns['Spawn1'].room.controller.safeMode && Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS).length) {
        Game.spawns['Spawn1'].room.controller.activateSafeMode();
    }


    var source = 0;
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'attacker') {
            roleAttacker.run(creep);
        }
    }
}