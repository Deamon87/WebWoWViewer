import adtM2ObjectFactory from './../objects/adtM2Object.js';

class ADTObject {
    constructor(sceneApi, wdtFile) {
        this.sceneApi = sceneApi;
        this.m2Array = [];
    }

    loadM2s() {
        var self = this;
        var m2Positions = this.adtGeom.adtFile.mddf;
        if (!m2Positions) return;

        this.m2Array = [];
        for (var i = 0; i < m2Positions.length; i++) {
            //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
            var doodad = m2Positions[i];
            //this.loadM2(i, doodad);
            this.sceneApi.objects.loadAdtM2Obj(doodad);
        }
    }

    loadM2(index, doodad) {
        var self = this;

        self.m2Array[index] = new adtM2ObjectFactory(self.sceneApi);
        self.m2Array[index].load(doodad, false)
    }

    loadWmos() {
        var self = this;
        var wmoPositions = this.adtGeom.adtFile.wmoObjs;
        if (!wmoPositions) return;


        this.wmoArray = [];
        wmoPositions.forEach(function (wmoDef) {
            self.sceneApi.objects.loadAdtWmo(wmoDef);
        });
    }

    load(modelName) {
        var self = this;

        var adtPromise = this.sceneApi.resources.loadAdtGeom(modelName);
        adtPromise.then(function (result) {
            self.adtGeom = result;

            self.loadM2s();
            self.loadWmos();
        });
    }

    draw(deltaTime) {
        if (this.adtGeom) {
            this.adtGeom.draw();
        }
    }
}
export default ADTObject;