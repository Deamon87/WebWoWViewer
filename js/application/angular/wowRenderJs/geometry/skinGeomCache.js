import cacheTemplate from './../cache.js';
import skinLoader from './../../services/map/skinLoader.js'

class SkinGeom {
    constructor(sceneApi) {
        this.gl = sceneApi.getGlContext();

        this.indexVBO = null;
        this.fixedAlready = false;
    }

    assign(skinFile) {
        this.skinFile = skinFile;
    };

    fixShaderIdBasedOnBlendOverride(m2File) {
        var skinFileData = this.skinFile.header;
        for (var i = 0; i < skinFileData.texs.length; i++){
            var skinTextureDefinition = skinFileData.texs[i];
            if ((skinTextureDefinition.shaderId & 0x8000) > 0) continue;

            var hasBlendingOverrides = (m2File.ModelType & 0x8) > 0;
            var renderFlag = m2File.renderFlags[skinTextureDefinition.renderFlagIndex];
            var blendingMode = renderFlag.blend;

            if (!hasBlendingOverrides) {
                var texUnit = m2File.textUnitLookup[skinTextureDefinition.textureUnitNum];

                var newShaderId = (blendingMode != 0) ? 1 : 0;
                if (texUnit > 2) {
                    newShaderId |= 8;
                }
                newShaderId = newShaderId << 4;
                if (texUnit == 1) {
                    newShaderId = newShaderId | 0x4000;
                }

                skinTextureDefinition.shaderId = newShaderId;
            } else {
                var op_count = skinTextureDefinition.op_count;
                var currShaderId = skinTextureDefinition.shaderId;
                var runtimeShaderVals = [0,0];

                var newShaderId = 0;
                for (var j = 0; j <= op_count; j++) {
                    var blendMapVal = m2File.blendOverrides[currShaderId + j];
                    if (j == 0 && blendingMode == 0) {
                        blendMapVal = 0;
                    }

                    var texUnit = m2File.textUnitLookup[skinTextureDefinition.textureUnitNum + j];

                    runtimeShaderVals[j] = blendMapVal;
                    if (texUnit > 2) {
                        runtimeShaderVals[j] = blendMapVal | 8;
                    }

                    if ( (texUnit == 1) && (j+1 == op_count) )
                        newShaderId |= 0x4000;
                }

                newShaderId |= (runtimeShaderVals[1] & 0xFFFF) | ((runtimeShaderVals[0] << 4) & 0xFFFF);
                skinTextureDefinition.shaderId = newShaderId;
            }
        }
    }
    fixShaderIdBasedOnLayer(m2File) {
        var skinFileData = this.skinFile.header;

        var reducingIsNeeded = false;
        var prevRenderFlagIndex = -1;

        var lowerLayerSkin = null;
        var someFlags = 0;
        for (var i = 0; i < skinFileData.nTex; i++) {
            var texDef = skinFileData.texs[i];
            var currRenderFlagIndex = texDef.renderFlagIndex;
            if (currRenderFlagIndex == prevRenderFlagIndex) {
                reducingIsNeeded = true;
                continue;
            }
            prevRenderFlagIndex = currRenderFlagIndex;
            var renderFlag = m2File.renderFlags[currRenderFlagIndex];

            var lowerBits = texDef.shaderId & 7;
            if (texDef.layer == 0) {

                if ((texDef.op_count >= 1) && (renderFlag.blend == 0)) {
                    texDef.shader_id &= 0xFF8F;
                }
                lowerLayerSkin = texDef;
            }
            //Line 84
            if ((someFlags & 0xFF) == 1) {
                var blendingMode = renderFlag.blend;
                if ((blendingMode == 2 || blendingMode == 1)
                    && (texDef.op_count == 1)
                    && ((((renderFlag.flags & 0xff) ^ (m2File.renderFlags[lowerLayerSkin.renderFlagIndex].flags & 0xff)) & 1) == 0)
                    && texDef.textureIndex == lowerLayerSkin.textureIndex)
                {
                    if (m2File.transLookup[lowerLayerSkin.transpIndex] == m2File.transLookup[texDef.transpIndex]) {
                        texDef.shader_id = 0x8000;
                        lowerLayerSkin.shader_id = 0x8001;
                        someFlags = (someFlags&0xFF00) | 3;
                        continue;
                    }
                }
                someFlags = (someFlags&0xFF00);
            }
            //Line 105
            if ((someFlags & 0xFF) < 2){
                if ((renderFlag.blend == 0) && (texDef.op_count == 2) && ((lowerBits == 4) || (lowerBits == 6))){
                   if ( (m2File.textUnitLookup[texDef.textureUnitNum] == 0) &&  (m2File.textUnitLookup[texDef.textureUnitNum+1] > 2)) {
                       someFlags = (someFlags&0xFF00) | 1;
                   }
                }
            }
            //Line 114
            if ((someFlags >> 8) != 0) {
                if ((someFlags >> 8) == 1) {
                    //Line 119
                    var blend = renderFlag.blend;
                    if ((blend != 4) && (renderFlag != 6) || (texDef.op_count != 1) || (m2File.textUnitLookup[texDef.textureUnitNum] <= 2)) {

                    } else  if (m2File.transLookup[lowerLayerSkin.transpIndex] == m2File.transLookup[texDef.transpIndex]) {
                        //Line 124
                        texDef.shader_id = 0x8000;
                        lowerLayerSkin.shader_id = renderFlag.blend != 4 ? 14 : 0x8002;
                        //lowerLayerSkin.op_count = 2;
                        //TODO: Implement packing of textures

                        someFlags = (someFlags & 0xFF) | (2 << 8);
                        continue;
                    }
                } else {
                    //Line 140
                    if ((someFlags >> 8) != 2) {
                        continue;
                    }
                    var blend = renderFlag.blend;

                    if ((blend != 2) && (renderFlag != 1)
                        || (texDef.op_count != 1)
                        || ((((renderFlag.flags & 0xff) ^ (m2File.renderFlags[lowerLayerSkin.renderFlagIndex].flags & 0xff)) & 1) == 0)
                        || ((texDef.textureIndex & 0xff) != (lowerLayerSkin.textureIndex&0xff))) {

                    } else  if (m2File.transLookup[lowerLayerSkin.transpIndex] == m2File.transLookup[texDef.transpIndex]) {
                        texDef.shader_id = 0x8000;
                        lowerLayerSkin.shader_id = ((lowerLayerSkin.shader_id == 0x8002? 2 : 0) - 0x7FFF) & 0xFFFF;
                        someFlags = (someFlags & 0xFF) | (3 << 8);
                        continue;
                    }
                }
                someFlags = (someFlags & 0xFF);
            }
            if ( (renderFlag.blend == 0) && (texDef.op_count == 1) && (m2File.textUnitLookup[texDef.textureUnitNum] == 0)) {
                someFlags = (someFlags & 0xFF) | (1 << 8);
            }
        }

        if (reducingIsNeeded) {
            var prevRenderFlagIndex = -1;
            for (var i = 0; i < skinFileData.nTex; i++) {
                var texDef = skinFileData.texs[i];
                var renderFlagIndex =texDef.renderFlagIndex;
                if (renderFlagIndex == prevRenderFlagIndex) {
                    texDef.shader_id =      skinFileData.texs[i-1].shader_id;
                    texDef.op_count =       skinFileData.texs[i-1].op_count;
                    texDef.textureIndex =   skinFileData.texs[i-1].textureIndex;
                    texDef.textureUnitNum = skinFileData.texs[i-1].textureUnitNum;
                } else {
                    prevRenderFlagIndex = renderFlagIndex;
                }
            }
        }
    }

    fixData(m2File) {
        if (!this.fixedAlready) {
            this.fixShaderIdBasedOnBlendOverride(m2File);
            this.fixShaderIdBasedOnLayer(m2File);

            this.fixedAlready = true;
        }
    }

    createVBO() {
        var gl = this.gl;
        var skinObject = this.skinFile;


        var skinFileHeader = this.skinFile.header;
        var indicies = new Array(skinFileHeader.triangles.length);

        for (var i = 0; i < indicies.length; i++) {
            indicies[i] = skinFileHeader.indexes[skinFileHeader.triangles[i]];
        }
        this.indicies = indicies;


        this.indexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indicies), gl.STATIC_DRAW);
    };
    createBaricentricVBO() {
        function checkTriangleDebug(i) {
            var map = [-1, -1, -1];

            for (var j = 0; j < 3; j++) {
                if (baryCentricCoords[indicies[i + j] * 3] == 1) {
                    if (map[0] != -1) {
                        debugger
                    }
                    map[0] = j;
                }
                if (baryCentricCoords[indicies[i + j] * 3 + 1] == 1) {
                    if (map[1] != -1) {
                        debugger
                    }
                    map[1] = j;
                }
                if (baryCentricCoords[indicies[i + j] * 3 + 2] == 1) {
                    if (map[2] != -1) {
                        debugger
                    }
                    map[2] = j;
                }
            }


            if ((map[0] == map[1] && map[0] != -1) || (map[0] == map[2] && map[0] != -1) || (map[1] == map[2] && map[1] != -1)) {
                console.log("map[0] - " + baryCentricCoordsWrittenOn[indicies[i + map[0]]] +
                    "\n map[1] - " + baryCentricCoordsWrittenOn[indicies[i + map[1]]] +
                    "\n map[2] - " + baryCentricCoordsWrittenOn[indicies[i + map[2]]]+ "\n") ;

            }
            if (map[0] == -1 || map[1] == -1 || map[2] == -1) {
                console.log("map[0] - " + baryCentricCoordsWrittenOn[indicies[i + map[0]]] +
                    "\n map[1] - " + baryCentricCoordsWrittenOn[indicies[i + map[1]]] +
                    "\n map[2] - " + baryCentricCoordsWrittenOn[indicies[i + map[2]]]+ "\n\n") ;
            }
        }
        function checkTriangle(i, debugString) {
            var map = [-1, -1, -1];

            for (var j = 0; j < 3; j++) {
                if (baryCentricCoords[indicies[i + j] * 3] == 1) {
                    if (map[0] != -1) {
                        debugger
                    }
                    map[0] = j;
                }
                if (baryCentricCoords[indicies[i + j] * 3 + 1] == 1) {
                    if (map[1] != -1) {
                        debugger
                    }
                    map[1] = j;
                }
                if (baryCentricCoords[indicies[i + j] * 3 + 2] == 1) {
                    if (map[2] != -1) {
                        debugger
                    }
                    map[2] = j;
                }
            }


            if ((map[0] == map[1] && map[0] != -1) || (map[0] == map[2] && map[0] != -1) || (map[1] == map[2] && map[1] != -1)) {
                console.log("map[0] - " + baryCentricCoordsWrittenOn[indicies[i + map[0]]] +
                    " map[1] - " + baryCentricCoordsWrittenOn[indicies[i + map[1]]] +
                    " map[2] - " + baryCentricCoordsWrittenOn[indicies[i + map[2]]])
                debugger;
            }

            for (var k = 0; k < 3; k++) {
                var valueFound = false;
                for (var j = 0; j < 3; j++) {
                    if (map[j] == k) {
                        valueFound = true;
                        break;
                    }
                }

                if (!valueFound) {
                    for (var j = 0; j < 3; j++) {
                        if (map[j] == -1) {
                            map[j] = k;
                            break;
                        }
                    }
                }
            }

            if ((map[0] == map[1] && map[0] != -1) || (map[0] == map[2] && map[0] != -1) || (map[1] == map[2] && map[1] != -1)) {
                debugger;
            }

            baryCentricCoords[indicies[i + map[0]] * 3] = 1;
            baryCentricCoords[indicies[i + map[0]] * 3 + 1] = 0;
            baryCentricCoords[indicies[i + map[0]] * 3 + 2] = 0;

            baryCentricCoords[indicies[i + map[1]] * 3 + 0] = 0;
            baryCentricCoords[indicies[i + map[1]] * 3 + 1] = 1;
            baryCentricCoords[indicies[i + map[1]] * 3 + 2] = 0;

            baryCentricCoords[indicies[i + map[2]] * 3 + 0] = 0;
            baryCentricCoords[indicies[i + map[2]] * 3 + 1] = 0;
            baryCentricCoords[indicies[i + map[2]] * 3 + 2] = 1;

            baryCentricCoordsWrittenOn[indicies[i + map[0]]] =  debugString;
            baryCentricCoordsWrittenOn[indicies[i + map[1]]] =  debugString;
            baryCentricCoordsWrittenOn[indicies[i + map[2]]] =  debugString;
        }


        var gl = this.gl;
        var indicies = this.indicies;
        var skinFile = this.skinFile.header;

        this.baryCentricVBO = gl.createBuffer();

        var maxInd = Math.max(...indicies);
        var baryCentricCoords = new Array((maxInd + 1) * 3);
        var baryCentricCoordsWrittenOn = new Array((maxInd + 1));

        for (var meshIndex = 0; meshIndex < skinFile.nSub; meshIndex++) {

            var trianglesPerVerticle = new Array();
            var startIndex = skinFile.subMeshes[meshIndex].StartTriangle;

            for (var i = startIndex; i < startIndex + skinFile.subMeshes[meshIndex].nTriangles; i+=3) {
                for (j = 0; j < 3; j++) {
                    if (!trianglesPerVerticle[indicies[i + j]]) {
                        trianglesPerVerticle[indicies[i + j]] = new Array();
                    }
                    trianglesPerVerticle[indicies[i + j]].push((i - startIndex) / 3);
                }
            }


            var trianglesGraph = new Array(skinFile.subMeshes[meshIndex].nTriangles / 3);
            for (var i = startIndex; i < startIndex + skinFile.subMeshes[meshIndex].nTriangles; i+=3) {
                trianglesGraph[(i - startIndex) /3] = new Array();
            }


            for (var i = startIndex; i < startIndex + skinFile.subMeshes[meshIndex].nTriangles; i+=3) {
                var triangleInd = (i - startIndex)/3;

                for (var j = 0; j < 3; j++) {
                    for (var k = 0; k < trianglesPerVerticle[indicies[i + j]].length; k++) {
                        var secondTrisInd = trianglesPerVerticle[indicies[i + j]][k];

                        trianglesGraph[triangleInd][secondTrisInd] = 1;
                        trianglesGraph[secondTrisInd][triangleInd] = 1;
                    }
                }
            }

            var visitedTriangles = new Array(skinFile.subMeshes[meshIndex].nTriangles / 3);
            for (var l = 0; l < skinFile.subMeshes[meshIndex].nTriangles/3; l++) {
                if (visitedTriangles[l] == 1) continue;

                var toBeVisitedNextLoop = new Array();
                toBeVisitedNextLoop.push(l);
                visitedTriangles[l] = 1;
                var loopsPassed = 0;
                do {

                    var toBeVisitedThisLoop = toBeVisitedNextLoop;
                    toBeVisitedNextLoop = new Array();
                    for (var i = 0; i < toBeVisitedThisLoop.length; i++) {
                        var triangleInd = toBeVisitedThisLoop[i];

                        checkTriangle(triangleInd * 3 + startIndex, "meshIndex = "+meshIndex+" l = "+l+" i = "+i+" loopsPassed = "+loopsPassed);
                        for (var j = 0; j < skinFile.subMeshes[meshIndex].nTriangles / 3; j++) {
                            if ((trianglesGraph[triangleInd][j] == 1) && (visitedTriangles[j] != 1)) {
                                toBeVisitedNextLoop.push(j);
                                visitedTriangles[j] = 1;
                            }
                        }
                    }
                    loopsPassed++;
                } while (toBeVisitedNextLoop.length > 0);
            }
        }

        //RecheckTris
        for (var meshIndex = 0; meshIndex < skinFile.nSub; meshIndex++) {
            for (var l = 0; l < skinFile.subMeshes[meshIndex].nTriangles; l+=3) {
                checkTriangleDebug(skinFile.subMeshes[meshIndex].StartTriangle + l)
            }
        }


        gl.bindBuffer(gl.ARRAY_BUFFER, this.baryCentricVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(baryCentricCoords), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.baryCentricCoords = baryCentricCoords;
    }
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
            skinGeomObj.createBaricentricVBO();
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