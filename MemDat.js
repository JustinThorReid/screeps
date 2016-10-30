/**
 * Created by phatn on 10/29/2016.
 */

// Copy information for storage in Memory
function MemDat(originalObject) {
    this.id = originalObject.id;
    this.pos = originalObject.pos;
}

module.exports = MemDat;