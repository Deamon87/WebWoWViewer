import mathHelper from './../math/mathHelper.js';

class ADTObject {
    constructor(sceneApi, wdtFile) {
        this.sceneApi = sceneApi;
        this.drawChunk = new Array(256);
        this.aabbs = [];
        this.m2Array = null;
        this.wmoArray = null;

        for (var i = 0; i < 256; i++) {
            this.drawChunk[i] = true;
        }
    }

    resetCandidateForDrawing() {
        this.isCandidateForDrawing = false;
        if (this.m2Array) {
            for (var i = 0; i < this.m2Array.length; i++) {
                if (this.m2Array[i]) {
                    this.m2Array[i].resetCandidateForDrawing();
                }
            }
        }
        if (this.wmoArray) {
            for (var i = 0; i < this.wmoArray.length; i++) {
                this.wmoArray[i].resetCandidateForDrawing();
            }
        }
    }

    checkFrustumCulling (cameraVec4, frustumPlanes, lookAtMat4, num_planes, m2ObjectsCandidates, wmoCandidates) {
        if (!this.adtGeom) return;
        var adtFile = this.adtGeom.adtFile;

        for (var i = 0; i < 256; i++) {
            var mcnk = adtFile.mcnkObjs[i];
            var aabb = this.aabbs[i];
            if (!aabb) continue;

            //1. Check if camera position is inside Bounding Box
            if (
                cameraVec4[0] > aabb[0][0] && cameraVec4[0] < aabb[1][0] &&
                cameraVec4[1] > aabb[0][1] && cameraVec4[1] < aabb[1][1] &&
                cameraVec4[2] > aabb[0][2] && cameraVec4[2] < aabb[1][2]
            ) {
                this.drawChunk[i] = true;
                continue;
            }

            //2. Check aabb is inside camera frustum
            var result = mathHelper.checkFrustum(frustumPlanes, aabb, num_planes);
            this.drawChunk[i] = result;

            //3. If the chunk is set to be drawn, set all M2s and WMOs into candidate for drawing
            if (result) {
                if (mcnk.m2Refs) {
                    for (var j= 0; j < mcnk.m2Refs.length; j++) {
                        var m2Ref = mcnk.m2Refs[j];

                        m2ObjectsCandidates.add(this.m2Array[m2Ref])
                    }
                }
                if (this.wmoArray) {
                    for (var j = 0; j < mcnk.wmoRefs.length; j++) {
                        var wmoRef = mcnk.wmoRefs[j];
                        wmoCandidates.add(this.wmoArray[wmoRef])
                    }
                }
            }
        }
    }

    calcBoundingBoxes() {
        var aabbs = new Array(256);
        var adtFile = this.adtGeom.adtFile;
        for(var i = 0 ; i < 256; i++) {
            var mcnk = adtFile.mcnkObjs[i];

            //Loop over heights
            var minZ = 999999;
            var maxZ = -999999;
            for (var j = 0; j < mcnk.heights.length; j++) {
                var heightVal = mcnk.heights[j];
                if (minZ > heightVal) minZ = heightVal;
                if (maxZ < heightVal) maxZ = heightVal;
            }

            var minX = mcnk.pos.x - (533.3433333 / 16.0);
            var maxX = mcnk.pos.x;
            var minY = mcnk.pos.y - (533.3433333 / 16.0);
            var maxY = mcnk.pos.y;
            minZ += mcnk.pos.z;
            maxZ += mcnk.pos.z;

            aabbs[i] = [[minX, minY, minZ], [maxX, maxY, maxZ]];
        }

        this.aabbs = aabbs;
    }

    loadM2s() {
        var self = this;
        var m2Positions = this.adtGeom.adtFile.mddf;
        if (!m2Positions) return;

        this.m2Array = new Array(m2Positions.length);
        for (var i = 0; i < m2Positions.length; i++) {
            //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
            var doodad = m2Positions[i];
            //this.loadM2(i, doodad);
            this.m2Array[i] = this.sceneApi.objects.loadAdtM2Obj(doodad);
        }
    }

    loadWmos() {
        var self = this;
        var wmoPositions = this.adtGeom.adtFile.wmoObjs;
        if (!wmoPositions) return;


        this.wmoArray = new Array(wmoPositions.length);
        for (var i = 0; i < wmoPositions.length; i++) {
            var wmoDef = wmoPositions[i];
            self.wmoArray[i] = self.sceneApi.objects.loadAdtWmo(wmoDef);
        }
    }

    load(modelName) {
        var self = this;

        var adtPromise = this.sceneApi.resources.loadAdtGeom(modelName);
        adtPromise.then(function (result) {
            self.adtGeom = result;

            self.calcBoundingBoxes();

            self.loadM2s();
            self.loadWmos();
        });
    }

    draw(deltaTime) {
        if (this.adtGeom) {
            this.adtGeom.draw(this.drawChunk);
        }
    }
}


export default ADTObject;