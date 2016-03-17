class SkinGeom {
    constructor(sceneApi) {
        this.gl = sceneApi.getGlContext();

        this.indexVBO = null;
    }
    assign (skinFile) {
        this.skinFile = skinFile;
    };

    createVBO() {
        var gl = this.gl;
        var skinObject = this.skinFile;

        var indicies = [];
        var skinFileHeader = this.skinFile.header;
        indicies.length = skinFileHeader.triangles.length;

        for (var i = 0; i < indicies.length; i++) {
            indicies[i] = skinFileHeader.indexes[skinFileHeader.triangles[i]];
        }

        this.indexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indicies), gl.STATIC_DRAW);
    };
}

class SkinGeomCache {
    constructor (sceneApi){
        this.cache = cacheTemplate(function loadGroupWmo(fileName) {
            /* Must return promise */
            return skinLoader(fileName, true);
        }, function process(skinFile) {

            var skinGeomObj = new SkinGeom(sceneApi);
            skinGeomObj.assign(skinFile);
            skinGeomObj.createVBO();
            return skinGeomObj;
        });
    }
    loadSkin (fileName){
        return this.cache.get(fileName);
    };

    unLoadSkin(fileName) {
        this.cache.remove(fileName)
    }
}

export default SkinGeomCache;