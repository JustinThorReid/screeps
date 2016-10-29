var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep, repairList) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('harvesting');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('repairing');
	    }

	    if(creep.memory.building) {
            var roadToRepair = creep.pos.findClosestByRange(repairList);
            
            if(creep.repair(roadToRepair) == ERR_NOT_IN_RANGE) {
                creep.moveTo(roadToRepair);
            }
	    }
	    else {
	        var source = creep.pos.findClosestByRange(FIND_SOURCES);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
	    }
	}
};

module.exports = roleBuilder;
