/**
 * Created by phatn on 10/29/2016.
 */
module.exports = {
    createRoads: function(startPos, endPos) {
        var path = new PathFinder().search(startPos, {
            pos:endPos,
            range:1
        });

        for(var n in path) {
            var pos = path[n];
            var room = Game.rooms[pos.roomName];

            if(room) {
                room.createConstructionSite(STRUCTURE_ROAD);
            }
        }
    }
};