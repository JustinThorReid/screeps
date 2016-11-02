/**
 * Created by phatn on 11/1/2016.
 */
var helperFunctions = require("HelperFunctions");

var Memorydata = {};
Memorydata.rooms = Memorydata.rooms || {};
Memorydata.sources = Memorydata.sources || {};

function addSourceData(sourceObj) {
    var sourceData = {};
    sourceData.id = sourceObj.id;
    sourceData.slots = _.map(_.filter(sourceObj.room.lookForAtArea(LOOK_TERRAIN, sourceObj.pos.y - 1, sourceObj.pos.x - 1, sourceObj.pos.y + 1, sourceObj.pos.x + 1, true), function (object) {
        return object[LOOK_TERRAIN] !== "wall";
    }), function (object) {
        return {x: object.x, y: object.y};
    });

    sourceData.storage = _.map(helperFunctions.findContainersAroundPos(sourceObj.room, sourceObj.pos), function(object) {
        return {id: object[LOOK_STRUCTURES].id};
    });

    Memorydata.sources[sourceObj.id] = sourceData;
    return sourceData;
}

function addRoomData(room) {
    var roomData = {
        sourceIds:[]
    };
    var sources = room.find(FIND_SOURCES);

    _.each(sources, function(source) {
        addSourceData(source);
        roomData.sourceIds.push(source.id);
    });

    Memorydata.rooms[room.name] = roomData;
    return roomData;
}

// Always returns a value
var getRoomDataFromObj = function (roomObj) {
    if(Memorydata.rooms[roomObj.name]) {
        return Memorydata.rooms[roomObj.name];
    }

    return addRoomData(roomObj);
};

var getEnergySources = function (roomObj) {
    var roomDat = getRoomDataFromObj(roomObj);

    return _.map(roomDat.sourceIds, function(sourceId) {
        return Memorydata.sources[sourceId];
    });
};




module.exports = {
    "getRoomDataFromObj" : getRoomDataFromObj,
    "getEnergySources" : getEnergySources
};