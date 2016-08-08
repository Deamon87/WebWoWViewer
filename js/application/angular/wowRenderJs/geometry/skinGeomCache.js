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