var moveTask = require("task.move");
var helperFunctions = require("HelperFunctions");

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

var HYBRID = "HYBRID";
var MINER = "MINER";
var HAULER = "HAULER";
var actions = {};

/// Hybrid actions
actions[HYBRID] = (function(){
	var MODE_DEPOSIT_ENERGY = 0;
	var MODE_COLLECT_ENERGY = 1;

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

	return {
		run: function(creep) {
			if(creep.memory.currentTask === MODE_DEPOSIT_ENERGY) {
				depositEnergy(creep);
			} else {
				collectEnergy(creep);
			}
		},

		spawnNew: function(spawner, sourceMemDat, depositMemDat){
			var hybridBodyTypes = [
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

			var body = helperFunctions.findBestBody(spawner.room, hybridBodyTypes);

			var creepName = spawner.createCreep(body, undefined, {
				role: 'LongRangeHarvester',
				subrole: HYBRID,
				currentTask: MODE_COLLECT_ENERGY,
				depositTarget: depositMemDat,
				collectTarget: sourceMemDat
			});
			console.log("Spawning new long range hybrid: " + creepName);
		},
		spawnHauler: function(){
			var HAULER = [
				{
					body:[MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY],
					energy:500
				},
				{
					body:[MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY],
					energy:450
				},
				{
					body:[MOVE,MOVE,CARRY,CARRY,CARRY,CARRY],
					energy:300
				}
				];
		}
	};
})();

// Steps for a miner that is at a mining site
actions[MINER] = (function(){
	var actionWhenInPosition = function(creep) {
		if(creep.carry.energy < creep.carryCapacity) {
			var source = Game.getObjectById(creep.memory.collectTarget.id);
			creep.harvest(source);
		} else {
			var target = Game.getObjectById(creep.memory.depositTarget.id);

			if(target) {
				if(target.hits < target.hitsMax/3) {
					creep.repair(target);
				} else {
					creep.transfer(target, RESOURCE_ENERGY);
				}
			} else {
				var constructionSite = _.filter(creep.pos.lookFor(LOOK_CONSTRUCTION_SITES), function (obj) {
					return obj.structureType === STRUCTURE_CONTAINER;
				});
				if(constructionSite.length){
					creep.build(constructionSite[0]);
				} else {
					var container = _.filter(creep.pos.lookFor(LOOK_STRUCTURES), function (obj) {
						return obj.structureType === STRUCTURE_CONTAINER;
					});

					if(container.length) {
						creep.memory.depositTarget.id = container[0].id;
					} else {
						creep.pos.createConstructionSite(STRUCTURE_CONTAINER);
						creep.memory.depositTarget.id = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES);
					}
				}
			}
		}
	};

	var moveToDesiredPosition = function(creep){
		if(creep.memory.desiredPosition){
			var destPos = new RoomPosition(creep.memory.desiredPosition.x, creep.memory.desiredPosition.y, creep.memory.desiredPosition.roomName);

			if(creep.pos.isEqualTo(destPos)){
				creep.memory.inPosition = true;
				delete creep.memory.desiredPosition;
			} else {
				creep.moveTo(destPos);
			}
		} else {
			var source = Game.getObjectById(creep.memory.collectTarget.id);
			if (source) {
				var allObjects = source.room.lookAtArea(source.pos.y-1, source.pos.x-1, source.pos.y+1, source.pos.x+1, true);
				var containers = _.filter(allObjects, function (a) {
					return (a['type'] == LOOK_STRUCTURES && a.structure.structureType == STRUCTURE_CONTAINER) ||
						(a['type'] == LOOK_CONSTRUCTION_SITES && a.constructionSite.structureType == STRUCTURE_CONTAINER);
				});

				if(containers.length) {
					containers = containers[0][containers[0]['type']];
					creep.memory.desiredPosition = containers.pos;
					creep.memory.depositTarget.id = containers.id;
				} else {
					var goodTerrain = _.filter(allObjects, function (a) {
						return (a['type'] == LOOK_TERRAIN && a[LOOK_TERRAIN] !== "wall");
					});

					var structures = source.room.lookForAt(LOOK_STRUCTURES, goodTerrain[0].x, goodTerrain[0].y);
					for(var i in structures) {
						structures[i].destroy();
					}
					var constructionSites = source.room.lookForAt(LOOK_CONSTRUCTION_SITES, goodTerrain[0].x, goodTerrain[0].y) || [];
					for(var i in constructionSites) {
						constructionSites[i].destroy();
					}

					source.room.createConstructionSite(goodTerrain[0].x, goodTerrain[0].y, STRUCTURE_CONTAINER);
					var depositObject = source.room.lookForAt(LOOK_CONSTRUCTION_SITES, goodTerrain[0].x, goodTerrain[0].y)[0][LOOK_CONSTRUCTION_SITES];

					creep.memory.desiredPosition = depositObject.pos;
					creep.memory.depositTarget.id = depositObject;
				}
			} else {
				creep.moveTo(new RoomPosition(creep.memory.collectTarget.pos.x, creep.memory.collectTarget.pos.y, creep.memory.collectTarget.pos.roomName));
			}
		}
	};

	return {
		run: function(creep) {
			if(creep.memory.inPosition === true) {
				actionWhenInPosition(creep);
			} else {
				moveToDesiredPosition(creep);
			}
		},

		// sourceMemDat is source data from Memory (pos/id)
		spawnNew: function(spawner, sourceMemDat) {

			// 5 WORK is max to drain a source in claimed room
			// 2.5 WORK is max to drain source in unclaimed
			var minerBodyTypesOwnedRoom = [{
				body:[MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, CARRY],
				energy:650
			},{
				body:[MOVE,MOVE,WORK,WORK,WORK,WORK,CARRY],
				energy:550
			},{
				body:[MOVE,WORK,WORK,WORK,CARRY],
				energy:400
			},{
				// Will have to dump on ground
				body:[MOVE,WORK,WORK],
				energy:250
			}];

			var body = helperFunctions.findBestBody(spawner.room, minerBodyTypesOwnedRoom);

			var creepName = spawner.createCreep(body, undefined, {
				role: 'LongRangeHarvester',
				subrole: MINER,
				collectTarget: sourceMemDat,
				depositTarget:{}
			});
			console.log("Spawning miner: " + creepName);
		}
	}
})();


module.exports = {
	manageLongRangeCreeps: function() {
		var spawner = Game.spawns['Spawn1'];
		var longRangeCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == 'LongRangeHarvester');

		if(longRangeCreeps.length < 3) {
			actions[HYBRID].spawnNew(spawner, {
				pos: new RoomPosition(32, 28, 'E2S18'),
				id: '55c34a6b5be41a0a6e80bcef'
			},{
				pos: new RoomPosition(25, 32, 'E3S18'),
				id: '55c34a6b5be41a0a6e80c1d8'
			});
		}

		for(var name in longRangeCreeps) {
			var creep = longRangeCreeps[name];

			actions[creep.memory.subrole].run(creep);
	    }
	},

	_actions: actions
};
