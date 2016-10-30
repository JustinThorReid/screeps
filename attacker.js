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
        creep.moveTo(new RoomPosition(15, 2, 'E3S19'));
	}
};