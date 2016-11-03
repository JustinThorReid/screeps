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

        _.each(towers, function(towerObj) {
            if(damagedCreeps.length) {
                towerObj.repair(damagedCreeps[0]);
            }
        });
    }
};