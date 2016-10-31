/**
 * Created by phatn on 10/29/2016.
 */
module.exports = {
    createRoads: function(startPos, endPos) {
        var path = PathFinder.search(startPos, {
            pos:endPos,
            range:1
        },{
            plainCost: 2,
            swampCost: 20
        });

        for(var n in path.path) {
            var pos = path.path[n];
            pos.createConstructionSite(STRUCTURE_ROAD);
        }
    },

    // Expects bodys to be of {body:[], energy:100} format
    findBestBody: function(room, bodyList) {
        var body = [];
        var cap = room.energyCapacityAvailable;
        for (var i = 0; i < bodyList.length; i++) {
            body = bodyList[i].body;
            if (cap >= bodyList[i].energy)
                break;
        }

        return body;
    }
};