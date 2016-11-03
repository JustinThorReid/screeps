/**
 * Created by phatn on 11/2/2016.
 */
var helperFunctions = require("HelperFunctions");

var ROLE_CLAIM = "ROLE_CLAIM";

var claimBodies = [{
    body: [MOVE, MOVE, CLAIM],
    energy: 700
}];

module.exports = {
    manageClaims: function() {
        var claimCreeps = _.filter(Game.creeps, (creep) => creep.memory.role === ROLE_CLAIM);

        var roomsToClaim = [];
        for (var n in Memory.scoutData.rooms) {
            if (Memory.scoutData.rooms[n].shouldUse) {
                if(Game.rooms[n]) {
                    if(Game.rooms[n].controller.level === 0) {
                        roomsToClaim.push(n);
                    }
                } else {
                    roomsToClaim.push(n);
                }
            }
        }

        _.each(roomsToClaim, function (roomName) {
            var creepsTargeted = 0;
            _.each(claimCreeps, function(creepObj) {
                if(creepObj.memory.targetRoom === roomName) {
                    creepsTargeted += 1;
                }
            });

            if(creepsTargeted < 2) {
                var name = Game.spawns['Spawn1'].createCreep(helperFunctions.findBestBody(Game.spawns['Spawn1'].room, claimBodies), undefined, {
                    role: ROLE_CLAIM,
                    targetRoom:roomName
                });
                console.log("Spawning claim creep: " + name);
            }
        });

        _.each(claimCreeps, function(creepObj) {
            var roomObj = Game.rooms[creepObj.memory.targetRoom];
            if(!roomObj) {
                creepObj.moveTo(new RoomPosition(25,25,creepObj.memory.targetRoom));
            } else {
                var err = creepObj.reserveController(roomObj.controller);
                if(err === ERR_NOT_IN_RANGE) {
                    creepObj.moveTo(roomObj.controller);
                } else if(err !== OK) {
                    console.log(creepObj.name + " could not claim " + roomObj.name);
                }
            }

            if(creepObj.memory.targetRoom === roomName) {
                creepsTargeted += 1;
            }
        });

    }
};