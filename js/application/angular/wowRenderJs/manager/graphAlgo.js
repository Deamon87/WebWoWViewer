class AABBGraph {
    constructor (){
        this.wmo = null;

        this.adts = new Array(64);
        for (var i = 0; i < 64; i++) {
            this.adts[i] = new Array(64);
            for (var j = 0; j < 64; j++) {
                this.adts[i][j] = null;
            }
        }
        this.isWmoMap = false;
    }

    queryGeometry(frustum) {

    }
}

class Leaf {
    queryGeometry(frustum) {
    }
}
class ADTLeaf extends Leaf{
    constructor(adt) {
        this.adtFile = adt;

        this.chunks = new Array(16);
        for (var i = 0; i < 16; i++) {
            this.chunks[i] = new Array(16);
            for (var j = 0; j < 16; j++) {
                this.chunks[i][j] = null;
            }
        }

        this.wmoObjects = [];
    }
    queryGeometry(frustum) {

    }
}


class WMOLeaf {
    constructor(wmoFile) {
        this.wmoFile = wmoFile;

    }
}