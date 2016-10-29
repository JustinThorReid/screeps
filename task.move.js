/**
 * Created by phatn on 10/29/2016.
 */
module.exports = function(creep, destPos, inHurry=false, build=true, repair=true) {
    // Do things while walking
    if(!inHurry && creep.carry.energy > 0) {
        var road = _.filter(creep.pos.look(), function (a) {
            if(a['type'] == LOOK_STRUCTURES && a.structure.structureType == STRUCTURE_ROAD) {
                return true;
            } else if(a['type'] == LOOK_CONSTRUCTION_SITES && a.constructionSite.structureType == STRUCTURE_ROAD) {
                return true;
            }
        })[0];

        if(road)
            road = road[road['type']];

        // Start construction
        if(!road) {
            creep.pos.createConstructionSite(STRUCTURE_ROAD);
            creep.build(creep.pos.look(LOOK_CONSTRUCTION_SITES)[0]);
            return;
        }

        // Build roads
        else if(build && road instanceof ConstructionSite) {
            creep.build(road);
            return;
        }

        // Repair road
        else if(repair && road.hits < road.hitsMax / 2 && creep.repair(road) === OK) {
            return; // Can not move so quit now
        }
    }

    creep.moveTo(destPos);
};