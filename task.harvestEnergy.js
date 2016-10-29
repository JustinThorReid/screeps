var taskHarvestEnergy = {

    /** @param {Creep} creep **/
    doTask: function(creep, source = 1) {
		var sources = creep.room.find(FIND_SOURCES);
		if(creep.harvest(sources[source]) == ERR_NOT_IN_RANGE) {
			creep.moveTo(sources[source]);
		}        
	},
	
	isDone: function(creep){
		return creep.carry.energy >= creep.carryCapacity;
	},
	
	taskName: "HarvestEnergy"
};

module.exports = taskHarvestEnergy;