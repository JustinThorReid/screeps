var moveTask = require("task.move");

var MODE_DEPOSIT_ENERGY = 0;
var MODE_COLLECT_ENERGY = 1;

// Hardcoded resource nodes
var resourceNodes = {
'W37S39_16_16':{
	pos:new RoomPosition(16, 16, 'W37S39'),
	creepsNeeded:3,
	creepsAssigned:['Joe']
},

'W37S39_29_3':{
	pos:new RoomPosition(29, 3, 'W37S39'),
	creepsNeeded:2,
	creepsAssigned:['Bob']
}};

var roomNavGraph = {
	'W37S39': { // Home -1y
		'W37S38':new RoomPosition(30,  0, 'W37S39'),
		'W36S39':new RoomPosition(49, 36, 'W37S39')
	},
	'W37S38':{ // Home
		'W37S39':new RoomPosition(30, 49, 'W37S38')
	},
	'W36S39':{ // Home -1x -1y
		'W37S39':new RoomPosition(0, 36, 'W36S39')
	}
};

/*
// Does not handle loops in the room graph
// Does not have room costs
// Stops at first path found
var _roomPathingTrace = function(destNode) {	
	var child = destNode;
	
	while(child.parentNode.parentNode) {
		child = child.parentNode;
	}
	
	return child.name;
}

var roomPathing = function(sourceName, destName) {	
	var allRooms = Object.keys(roomNavGraph);
	var roomsToCheck = [];
	
	roomsToCheck.push({
		'parentNode':undefined,
		'name':sourceName
	});	
	_.pull(allRooms, sourceName);
	
	for(var i = 0; i < roomsToCheck.length; i++) {
		var possibleExits = Object.keys(roomNavGraph[roomsToCheck[i].name]);
		
		for(var possibleExitId in possibleExits) {
			var possibleExit = possibleExits[possibleExitId];
			if(_.includes(allRooms, possibleExit)) {
				var newNode = {
					'name':possibleExit,
					'parentNode':roomsToCheck[i]
				};
				
				roomsToCheck.push(newNode);
				_.pull(allRooms, possibleExit);
				
				if(possibleExit === destName) {
					console.log(roomsToCheck.length);
					return _roomPathingTrace(newNode);
				}
			}
		}
	}
	
	console.log("LongRangeHarvester: Error on room pathing, no path found " + sourceName + " -> " + destName);
}
*/

var bodyList = [
	{
		body:[MOVE,MOVE,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY],
		energy:600
	},
	{
		body:[MOVE,MOVE,WORK,CARRY,CARRY,CARRY],
		energy:350
	},
	{
		body:[MOVE,MOVE,WORK,CARRY,CARRY],
		energy:300
	}
];
var factory = function(){
	var body = [];
	var cap = Game.spawns['Spawn1'].energyCapacity;
	for(var i = 0; i < bodyList.length; i++) {
		body = bodyList[i].body;
		if(cap >= bodyList[i].energy)
			break;
	}

	var creepName = Game.spawns['Spawn1'].createCreep(body, undefined, {
		role: 'LongRangeHarvester',
		currentTask: MODE_COLLECT_ENERGY,
		depositTarget:{
			pos:new RoomPosition(25, 32, 'E3S18'),
			id:'55c34a6b5be41a0a6e80c1d8'
		},
		collectTarget:{
			pos:new RoomPosition(32, 28, 'E2S18'),
			id:'55c34a6b5be41a0a6e80bcef'
		}
	});
};

var depositEnergy = function (creep) {
	// Ran out of energy, can't deposit
	if(creep.carry.energy == 0) {
		creep.memory.currentTask = MODE_COLLECT_ENERGY;
		return;
	}

	var target = Game.getObjectById(creep.memory.depositTarget.id);
	var err = creep.transfer(target, RESOURCE_ENERGY);
	if(err === ERR_NOT_IN_RANGE){
		moveTask(creep, target.pos);
	}
};
var collectEnergy = function (creep) {
	// Ran out of energy, can't deposit
	if(creep.carry.energy == creep.carryCapacity) {
		creep.memory.currentTask = MODE_DEPOSIT_ENERGY;
		return;
	}
	var target = Game.getObjectById(creep.memory.collectTarget.id);
	if(!target || creep.harvest(target) == ERR_NOT_IN_RANGE) {
		moveTask(creep, new RoomPosition(creep.memory.collectTarget.pos.x, creep.memory.collectTarget.pos.y, creep.memory.collectTarget.pos.roomName));
	}
};

module.exports = {
	manageLongRangeCreeps: function() {
		var longRangeCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == 'LongRangeHarvester');
		if(longRangeCreeps.length < 3) {
			factory();
		}

		for(var name in longRangeCreeps) {
			var creep = longRangeCreeps[name];

			if(creep.memory.currentTask === MODE_DEPOSIT_ENERGY) {
				depositEnergy(creep);
			} else {
				collectEnergy(creep);
			}
	    }
	},
	
	m:factory
};
