/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('attacker');
 * mod.thing == 'a thing'; // true
 */

module.exports = {
    run: function(creep) {
        run: function(creep) {
            if(Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS).length){
                var target = Game.spawns['Spawn1'].room.find(FIND_HOSTILE_CREEPS)[0];
                if(creep.attack(target) !== 0) {
                    creep.moveTo(target.pos);
                }
            } else {
                creep.moveTo(new RoomPosition(15, 2, 'E3S19'));
            }
        }
	}
};