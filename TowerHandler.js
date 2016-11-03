/**
 * Created by phatn on 11/2/2016.
 */
module.exports = {
    manageTowers: function(roomObj) {
        var towers = _.filter(roomObj.find(FIND_STRUCTURES), function (object) {
            return object.structureType == STRUCTURE_TOWER && object.energy > 0;
        });

        var damagedCreeps = [];
        _.each(roomObj.find(FIND_MY_CREEPS), function (creepObj) {
           if(creepObj.hits < creepObj.hitsMax) {
               damagedCreeps.push(creepObj);
           }
        });

        var damagedStructures = [];
        _.each(roomObj.find(FIND_STRUCTURES), function (object) {
            if(object.hits < 1000) {
                damagedStructures.push(object);
            }
        });

        _.each(towers, function(towerObj) {
            if(damagedCreeps.length) {
                towerObj.heal(damagedCreeps[0]);
            } else if(damagedStructures.length) {
                towerObj.repair(damagedStructures[0]);
            }
        });
    }
};