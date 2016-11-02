/**
 * Created by phatn on 10/29/2016.
 */

// Source manager
var sourceManager = (function(){
    Memory.knownSources = Memory.knownSources || {};

    return {
        saveSource: function(originalSource) {
            Memory.knownSources[originalSource.id] = {
                pos: originalSource.pos
            }
        }
    };
})();


module.exports = {
    source: {

    }
};