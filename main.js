var genericCreepHandler = require("GenericCreepHandler");
var longRangeHarvester = require('LongRangeHarvester');
var roleAttacker = require('attacker');

Memory.scoutData = Memory.scoutData || {};
Memory.scoutData.rooms = Memory.scoutData.rooms || {};

module.exports.loop = function () {
	// Old memory cleanup
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
			console.log('Clearing non-existing creep memory:', name);
        }
    }

    var scoutRooms = Object.keys(Memory.scoutData.rooms);
    var realRooms = Object.keys(Game.rooms);
    var roomsToAdd = _.difference(realRooms, scoutRooms);
    _.each(roomsToAdd, function (roomName) {
        var scoutRoom = {
            sourceDat:[]
        };
        var sources = Game.rooms[roomName].find(FIND_SOURCES);
        _.each(sources, function (sourceObj) {
            scoutRoom.sourceDat.push({
                id: sourceObj.id,
                pos: sourceObj.pos
            });
        });

        Memory.scoutData.rooms[roomName] = scoutRoom;
    });
	
	longRangeHarvester.manageLongRangeCreeps();
    genericCreepHandler.run(_.filter(Game.creeps, (creep) => creep.memory.role == genericCreepHandler.role));

    var attackers = _.filter(Game.creeps, (creep) => creep.memory.role == 'attacker');
    if(attackers.length < 3) {
        var newName = Game.spawns['Spawn1'].createCreep([MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK], undefined, {role: 'attacker'});
        console.log('Spawning new attacker: ' + newName);
    }
    for(var name in attackers) {
        var creep = attackers[name];
        roleAttacker.run(creep);
    }

    if(!Game.spawns['Spawn1'].room.controller.safeMode && Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS).length) {
        Game.spawns['Spawn1'].room.controller.activateSafeMode();
    }
}