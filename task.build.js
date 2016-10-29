var taskBuild = {

    /** @param {Creep} creep **/
    doTask: function(creep) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('harvesting');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('building');
	    }

	    if(creep.memory.building) {
	        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0]);
                }
            }
	    }
	},
	
	taskName: "Build"
};

module.exports = taskBuild;


Memory.prefabBuilder = function(prefab) {
	return Game.spawns['Spawn1'].createCreep(prefab.body, undefined, prefab.memory);
}




function createCreep(){
	var creep = Memory.prefabBuilder(Memory.prefabs.smallHarvester);
	
	var taskList = [{
		shouldDo: function(){
			// should harvest?
		},
		task: taskHarvestEnergy
	}];
	
	creep.brain = {
		think: function(){
			if(!creep.brain.currentTask.shouldDo) {
				// find a task we should do next
			}
			
			creep.brain.currentTask.task.doTask();
		},
		
		currentTask: taskList[0];
	}
}


// In main
/*
for each creep
	creep.brain.think()
*/