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
    }
};