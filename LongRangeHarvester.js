var moveTask = require("task.move");
var helperFunctions = require("HelperFunctions");

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

			if(target && !(target instanceof constructionSite)) {
				if(target.hits < target.hitsMax) {
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
					return (a['type'] == LOOK_STRUCTURES && a[LOOK_STRUCTURES].structureType == STRUCTURE_CONTAINER) ||
						(a['type'] == LOOK_CONSTRUCTION_SITES && a[LOOK_CONSTRUCTION_SITES].structureType == STRUCTURE_CONTAINER);
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

actions[HAULER] = (function(){
	var MODE_DEPOSIT_ENERGY = 0;
	var MODE_COLLECT_ENERGY = 1;

	var haulerBodiesNoWork = [
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
	var haulerBodiesWork = [{
		body:[MOVE,MOVE,CARRY,CARRY,WORK],
		energy:300
	}];

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
		var target = Game.getObjectById(creep.memory.collectTarget.id);

		if(creep.carry && creep.carry.energy == creep.carryCapacity || (target && target.store[RESOURCE_ENERGY] === 0)) {
			creep.memory.currentTask = MODE_DEPOSIT_ENERGY;
			return;
		}
		if(!target || creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
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

		// Expecting a container source/dest
		spawnNew: function(spawner, sourceMemDat, destMemDat){
			var body = helperFunctions.findBestBody(spawner.room, destMemDat.needsWork ? haulerBodiesWork : haulerBodiesNoWork);

			var creepName = spawner.createCreep(body, undefined, {
				role: 'LongRangeHarvester',
				subrole: HAULER,
				collectTarget: sourceMemDat,
				depositTarget: destMemDat
			});
			console.log("Spawning hauler: " + creepName);
		}
	}
})();
// Hardcoded resource nodes
/*
 var scoutData = {
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
 */


module.exports = {
	manageLongRangeCreeps: function() {
		var spawner = Game.spawns['Spawn1'];
		var longRangeCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == 'LongRangeHarvester');

		if(!spawner.spawning) {
			var miningSourceIds = [];
			var haulingSourceIds = [];
			_.each(longRangeCreeps, function (creep) {
				if (creep.memory.subrole === MINER) {
					miningSourceIds.push(creep.memory.collectTarget.id);
				} else if(creep.memory.subrole === HAULER) {
					haulingSourceIds.push(creep.memory.collectTarget.id);
				}
			});

			var scoutSources = {};
			var scoutSourceIds = [];
			var realContainerIds = [];
			for(var n in Memory.scoutData.rooms) {
				if(Memory.scoutData.rooms[n].shouldUse) {
					_.each(Memory.scoutData.rooms[n].sourceDat, function (sourceDat) {
						var containers = helperFunctions.findContainersAroundPos(Game.rooms[n], sourceDat.pos);
						if(containers.length) {
							realContainerIds.push(object[LOOK_STRUCTURES].id);
						}

						scoutSources[sourceDat.id] = sourceDat;
						scoutSourceIds.push(sourceDat.id);
					});
				}
			}
			var sourcesNeeded = _.difference(scoutSourceIds, miningSourceIds);
			_.each(sourcesNeeded, function (sourceId) {
				actions[MINER].spawnNew(spawner, scoutSources[sourceId]);
			});

			// Put into storage first, if not then room controller
			var destOpts;
			if(spawner.room.storage) {
				destOpts = {
					id:spawner.room.storage.id,
					pos:spawner.room.storage.pos,
					needsWork: false
				};
			} else {
				destOpts = {
					id:spawner.room.controller.id,
					pos:spawner.room.controller.pos,
					needsWork: true
				};
			}
			var haulingNeeded = _.difference(scoutSourceIds, realContainerIds);
			_.each(haulingNeeded, function (sourceId) {
				actions[HAULER].spawnNew(spawner, scoutSources[sourceId], destOpts);
			});

			/*
			if (longRangeCreeps.length < 3) {
				actions[HYBRID].spawnNew(spawner, {
					pos: new RoomPosition(32, 28, 'E2S18'),
					id: '55c34a6b5be41a0a6e80bcef'
				}, {
					pos: new RoomPosition(25, 32, 'E3S18'),
					id: '55c34a6b5be41a0a6e80c1d8'
				});
			}
			*/
		}

		for(var name in longRangeCreeps) {
			var creep = longRangeCreeps[name];

			actions[creep.memory.subrole].run(creep);
	    }
	},

	_actions: actions
};
