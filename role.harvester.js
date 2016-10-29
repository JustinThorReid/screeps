var moveTask = require("task.move");

var roleHarvester = {

    /** @param {Creep} creep **/
    run: function(creep, sourceId) {
	    if(creep.carry.energy < creep.carryCapacity) {
	        var source = creep.room.find(FIND_SOURCES);
            if(creep.harvest(source[sourceId]) == ERR_NOT_IN_RANGE) {
                moveTask(creep, source[sourceId].pos);
            }
        }
        else {
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
            }
        }
	}
};

module.exports = roleHarvester;