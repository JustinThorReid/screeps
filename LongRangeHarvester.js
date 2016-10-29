// long distance on roads - carry costs less could add 1 more carry with extensions
//[MOVE,MOVE,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY]




/*
Moving
- Follow path
- - If stuck, replace pathcopy with new path
- Repair roads

Dump into dest
- deposit until empty
- path to exit

Harvest until full
*/
var MODE_HARVEST = 'MODE_HARVEST';
var MODE_MOVE = 'MODE_MOVE';
var MODE_DUMP = 'MODE_DUMP';

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

var moveCreepToNode = function(creep, pos, range = 1){
	creep.memory.mode = MODE_MOVE;
	creep.memory.dest = pos;
	creep.memory.destRange = range;
	creep.memory.path = undefined;
};

// double check you are in the right place?
var doneMoving = function(creep) {
	if(creep.carry.energy > 0) {	
		creep.memory.mode = MODE_DUMP;
	} else {
		creep.memory.mode = MODE_HARVEST;
	}
}

var modeLogic = {
	'MODE_HARVEST' : function(creep) {
		var resourceNode = resourceNodes[creep.memory.assignedNode];
		
		if(creep.harvest(resourceNode.pos.lookFor(LOOK_SOURCES)[0]) == ERR_NOT_IN_RANGE) {
			console.log("LongRangeHarvester: Tried to harvest but was not in range! node - " + creep.memory.assignedNode);
			moveCreepToNode(creep, resourceNode.pos);
		} else if(creep.carry.energy >= creep.carryCapacity) {
			moveCreepToNode(creep, creep.memory.dumpTarget.pos, creep.memory.dumpTarget.minDist);
        }
	},
	
	'MODE_MOVE': function(creep) {		
		if(creep.pos.roomName === creep.memory.dest.roomName && creep.pos.getRangeTo(creep.memory.dest.x, creep.memory.dest.y) <= creep.memory.destRange){	
			doneMoving(creep);
			return;
		} else if(creep.pos.roomName === creep.memory.dest.roomName) {
			creep.memory.path = creep.pos.findPathTo(creep.memory.dest.x, creep.memory.dest.y);
		}
	
		if(!creep.memory.path || creep.memory.path.length === 0) {
			var localDest;
			if(creep.pos.roomName === creep.memory.dest.roomName) {
				localDest = creep.memory.dest;
			} else {
				// Room level pathing (might not be able to see inside)
				var nextRoom = roomPathing(creep.pos.roomName, creep.memory.dest.roomName);
				localDest = roomNavGraph[creep.pos.roomName][nextRoom];									
			}
			
			creep.say('goto ' + localDest.x + "," + localDest.y);
			creep.memory.path = creep.pos.findPathTo(localDest.x, localDest.y);
		}
		
		// Check current pos for roads needing repair
		if(creep.carry.energy > 0) {
			var road = _.filter(creep.pos.lookFor(LOOK_STRUCTURES), function (a) { return a instanceof StructureRoad;})[0];
			if(road && road.hits < road.hitsMax / 3 && creep.repair(road) == OK) {
				if(creep.carry.energy === 0) {
					doneMoving(creep);
				}
				return;
			}				
		}
		
		if(creep.moveByPath(creep.memory.path) == ERR_NOT_FOUND){
			creep.memory.path = undefined;
		}		
	},
	
	'MODE_DUMP':function(creep){
		if(creep.carry.energy === 0) {
			moveCreepToNode(creep, resourceNodes[creep.memory.assignedNode].pos);
			return;
		}
		
		var target = Game.getObjectById(creep.memory.dumpTarget.id);
		if(target instanceof StructureController) {
			if(creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
				console.log("LongRangeHarvester: Tried to upgrade but was not in range!");
			}
		} else {
			var err = creep.transfer(target, RESOURCE_ENERGY);
			if(err === ERR_NOT_IN_RANGE || err === ERR_INVALID_TARGET){
				console.log("LongRangeHarvester: Tried to transfer with error! " + err);
			}
        }
	}
};

var factory = function(nodeName){
	var resourceNode = resourceNodes[nodeName];		
	var creepName = Game.spawns['Spawn1'].createCreep([MOVE,MOVE,WORK,WORK,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY], undefined, {
		role: 'LongRangeHarvester',
		mode: MODE_MOVE,
		assignedNode:nodeName,
		dumpTarget:{
			pos:new RoomPosition(19, 13, 'W37S38'),
			minDist:3,
			id:'576a9ba357110ab231d87a28'
		}
	});
	moveCreepToNode(Game.creeps[creepName], resourceNode.pos);
};

module.exports = {
	manageLongRangeCreeps: function() {
		// Clean up
		if(Game.time % 250 === 0) {
			// Create creeps for nodes that are missing them
			for(var sourceName in resourceNodes) {
				var assignedCreeps = _.filter(Game.creeps, (creep) => creep.memory.role === 'LongRangeHarvester' && creep.memory.assignedNode === sourceName);
				var needed = resourceNodes[sourceName].creepsNeeded - assignedCreeps.length;
				
				if(needed > 0) {
					factory(sourceName);
				}
			}
		}
		
		var longRangeCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == 'LongRangeHarvester');
		for(var name in longRangeCreeps) {
			var creep = longRangeCreeps[name];
			
			modeLogic[creep.memory.mode](creep);
	    }
	},
	
	m:factory
};
