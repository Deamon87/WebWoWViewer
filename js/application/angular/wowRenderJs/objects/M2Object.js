import $q from 'q';
import config from './../../services/config';
import AnimationManager from './../manager/animationManager.js'
import mathHelper from './../math/mathHelper.js';
import QuickSort from './../math/quickSort';
import {vec4, mat4, vec3, quat} from 'gl-matrix';

const pixelShaderTable = {
    "Combiners_Opaque" : 0,
    "Combiners_Decal" : 1,
    "Combiners_Add" : 2,
    "Combiners_Mod2x" : 3,
    "Combiners_Fade" : 4,
    "Combiners_Mod" : 5,
    "Combiners_Opaque_Opaque" : 6,
    "Combiners_Opaque_Add" : 7,
    "Combiners_Opaque_Mod2x" : 8,
    "Combiners_Opaque_Mod2xNA" : 9,
    "Combiners_Opaque_AddNA" : 10,
    "Combiners_Opaque_Mod" : 11,
    "Combiners_Mod_Opaque" : 12,
    "Combiners_Mod_Add" : 13,
    "Combiners_Mod_Mod2x" : 14,
    "Combiners_Mod_Mod2xNA" : 15,
    "Combiners_Mod_AddNA" : 16,
    "Combiners_Mod_Mod" : 17,
    "Combiners_Add_Mod" : 18,
    "Combiners_Mod2x_Mod2x" : 19
}

class MDXObject {
    constructor(sceneApi){
        this.sceneApi = sceneApi;
        this.currentAnimationStart = 0;
        this.currentAnimation = 0;
        this.currentTime = 0;
        this.isAnimated = false;
        this.subMeshColors = null;
        this.hasBillboarded = false;
        this.rightHandClosed = false;
        this.leftHandClosed = false;
        this.localBB = null;

        this.loaded = false;
        this.loading = false;
    }

    getFileNameIdent(){
        return this.fileIdent;
    }
    getHasBillboarded() {
        return this.hasBillboarded;
    }
    getIsInstancable() {
        return true;
    }
    setLeftHandClosed(value) {
        this.animationManager.setLeftHandClosed(value);
    }
    setRightHandClosed(value) {
        this.animationManager.setRightHandClosed(value);
    }

    createAABB(){
        var bb = this.getBoundingBox();
        if (bb) {
            var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
            var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

            var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [a_ab, a_cd]);

            this.diameter = vec3.distance(worldAABB[0],worldAABB[1]);
            this.aabb = worldAABB;
        }
    }

    setLoadParams (modelName, skinNum, meshIds, replaceTextures) {
        this.modelName = modelName;
        this.skinNum = skinNum;
        this.meshIds = meshIds;
        this.replaceTextures = replaceTextures;

        var nameTemplate = modelName.split('.')[0];
        var modelFileName = nameTemplate + '.m2';
        var skinFileName = nameTemplate + '00.skin';
        modelFileName = modelFileName.toLowerCase();
        skinFileName = skinFileName.toLowerCase();

        this.fileIdent = modelFileName + " " +skinFileName;
        this.fileIdent = this.fileIdent.replace(/\0/g, '');
    }

    load() {
        var self = this;

        var nameTemplate = this.modelName.split('.')[0];
        var modelFileName = nameTemplate + '.m2';
        var skinFileName = nameTemplate + '00.skin';

        var m2Promise = this.sceneApi.resources.loadM2Geom(modelFileName);
        var skinPromise = this.sceneApi.resources.loadSkinGeom(skinFileName);

        return $q.all([m2Promise,skinPromise]).then(function(result){
            var m2Geom = result[0];
            var skinGeom = result[1];

            self.m2Geom = m2Geom;
            self.skinGeom = skinGeom;

            skinGeom.fixData(m2Geom.m2File);
            skinGeom.calcBBForSkinSections(m2Geom.m2File);

            if (!m2Geom) {
                $log.log("m2 file failed to load : "+ modelName);
            } else {
                var gl = self.sceneApi.getGlContext();
                m2Geom.createVAO(skinGeom);
                self.hasBillboarded = self.checkIfHasBillboarded();

                self.makeTextureArray(self.meshIds, self.replaceTextures);
                self.updateLocalBB( [self.m2Geom.m2File.BoundingCorner1, self.m2Geom.m2File.BoundingCorner2]);

                self.createAABB();

                self.initAnimationManager(m2Geom.m2File);
                self.initBoneAnimMatrices();
                self.initSubmeshColors();
                self.initTextureAnimMatrices();
                self.initTransparencies();
                self.initCameras();
                self.initLights();

                self.postLoad();
                self.loaded = true;
            }

            return true;
        });
    }
    postLoad(){

    }
    getShaderNames(m2Batch){
        function getTabledShaderNames(shaderId, op_count, tex_unit_number2){
            var v4 = (shaderId >> 4) & 7;
            var v5 = shaderId & 7;
            var v6 = (shaderId >> 4) & 8;
            var v7 = shaderId & 8;

            var vertexShaderName;
            var pixelShaderName;
            if ( op_count == 1 ) {
                if ( v6 )
                {
                    vertexShaderName = "Diffuse_Env";
                }
                else
                {
                    vertexShaderName = "Diffuse_T2";
                    if ( tex_unit_number2 )
                        vertexShaderName = "Diffuse_T1";
                }
                switch ( v4 )
                {

                    case 0:
                        pixelShaderName = "Combiners_Opaque";
                        break;
                    case 2:
                        pixelShaderName = "Combiners_Decal";
                        break;
                    case 3:
                        pixelShaderName = "Combiners_Add";
                        break;
                    case 4:
                        pixelShaderName = "Combiners_Mod2x";
                        break;
                    case 5:
                        pixelShaderName = "Combiners_Fade";
                        break;
                    default:
                        pixelShaderName = "Combiners_Mod";
                        break;
                }
            } else {
                if ( v6 )
                {
                    vertexShaderName = "Diffuse_Env_T2";
                    if ( v7 )
                        vertexShaderName = "Diffuse_Env_Env";
                }
                else if ( shaderId & 8 )
                {
                    vertexShaderName = "Diffuse_T1_Env";
                }
                else
                {
                    vertexShaderName = "Diffuse_T1_T2";
                }
                if ( !v4 )
                {
                    switch ( v5 )
                    {
                        case 0:
                            pixelShaderName = "Combiners_Opaque_Opaque";
                            break;
                        case 3:
                            pixelShaderName = "Combiners_Opaque_Add";
                            break;
                        case 4:
                            pixelShaderName = "Combiners_Opaque_Mod2x";
                            break;
                        case 6:
                            pixelShaderName = "Combiners_Opaque_Mod2xNA";
                            break;
                        case 7:
                            pixelShaderName = "Combiners_Opaque_AddNA";
                            break;
                        default:
                            pixelShaderName = "Combiners_Opaque_Mod";
                            break;
                    }
                } else if ( v4 == 1 ) {
                    switch ( v5 )
                    {
                        case 0:
                            pixelShaderName = "Combiners_Mod_Opaque";
                            break;
                        case 3:
                            pixelShaderName = "Combiners_Mod_Add";
                            break;
                        case 4:
                            pixelShaderName = "Combiners_Mod_Mod2x";
                            break;
                        case 6:
                            pixelShaderName = "Combiners_Mod_Mod2xNA";
                            break;
                        case 7:
                            pixelShaderName = "Combiners_Mod_AddNA";
                            break;
                        default:
                            pixelShaderName = "Combiners_Mod_Mod";
                            break;

                    }
                } else if ( v4 == 3 ) {
                    if ( v5 == 1 )
                    {
                        pixelShaderName = "Combiners_Add_Mod";
                    }
                    return 0;
                } else if ( v4 != 4 ) {
                    return 0;
                } else if ( v5 == 1 ) {
                    pixelShaderName = "Combiners_Mod_Mod2x";
                } else {
                    if ( v5 != 4 )
                        return 0;
                    pixelShaderName = "Combiners_Mod2x_Mod2x";
                }
            }
            return { vertex: vertexShaderName, pixel : pixelShaderName }
        }

        var shaderId = m2Batch.shaderId;
        var shaderNames;
        var vertexShader;
        var pixelShader;
        if ( !(shaderId & 0x8000) ) {
            shaderNames = getTabledShaderNames(shaderId, m2Batch.op_count, m2Batch.textureUnitNum);
            if ( !shaderNames )
                shaderNames = getTabledShaderNames(shaderId, m2Batch.op_count, 0x11, m2Batch.textureUnitNum);
            return shaderNames;
        }
        switch ( shaderId & 0x7FFF ) {
            case 0:
                return 0;
            case 1:
                vertexShader = "Combiners_Opaque_Mod2xNA_Alpha";
                pixelShader = "Diffuse_T1_Env";
                break;
            case 2:
                vertexShader = "Combiners_Opaque_AddAlpha";
                pixelShader = "Diffuse_T1_Env";
                break;
            case 3:
                vertexShader = "Combiners_Opaque_AddAlpha_Alpha";
                pixelShader = "Diffuse_T1_Env";
                break;
            default:
                break;
        }

        return { vertex: vertexShader, pixel : pixelShader }
    }
    makeTextureArray (meshIds, replaceTextures) {
       try {
           var self = this;
           var mdxObject = this.m2Geom;
           var skinObject = this.skinGeom;

           /* 1. Free previous subMeshArray */

           /* 2. Fill the materialArray */
           var materialArray = new Array();


           var subMeshes = skinObject.skinFile.header.subMeshes;
           for (var i = 0; i < skinObject.skinFile.header.texs.length; i++) {
               var materialData = {
                   isRendered: false,
                   isTransparent: false,
                   isEnviromentMapping: false,
                   meshIndex: -1,
                   textureTexUnit1: null,
                   textureTexUnit2: null,
                   textureTexUnit3: null
               };

               var skinTextureDefinition = skinObject.skinFile.header.texs[i];
               var subMesh = subMeshes[skinTextureDefinition.submeshIndex];

               if (meshIds && (meshIds.length > 0) && (subMesh.meshID > 0) && (meshIds[(subMesh.meshID / 100) | 0] != (subMesh.meshID % 100))) {
                   continue;
               }
               materialArray.push(materialData);

               var op_count = skinTextureDefinition.op_count;

               var renderFlagIndex = skinTextureDefinition.renderFlagIndex;
               //var isTransparent = (mdxObject.m2File.renderFlags[renderFlagIndex].blend >= 2);
               var isTransparent = (mdxObject.m2File.renderFlags[renderFlagIndex].blend >= 2) ||
                   ((mdxObject.m2File.renderFlags[renderFlagIndex].flags & 0x10) > 0);

               var shaderNames = this.getShaderNames(skinTextureDefinition);

               materialData.layer = skinTextureDefinition.layer;
               materialData.isRendered = true;
               materialData.isTransparent = isTransparent;
               materialData.meshIndex = skinTextureDefinition.submeshIndex;
               materialData.shaderNames = shaderNames;

               materialData.renderFlag =  mdxObject.m2File.renderFlags[renderFlagIndex].flags;
               materialData.renderBlending = mdxObject.m2File.renderFlags[renderFlagIndex].blend;

               var textureUnit;
               if (skinTextureDefinition.textureUnitNum <= mdxObject.m2File.textUnitLookup.length) {
                   textureUnit = mdxObject.m2File.textUnitLookup[skinTextureDefinition.textureUnitNum];
                   if (textureUnit == 0xFFFF) {
                       //Enviroment mapping
                       materialData.isEnviromentMapping = true;
                   }
               }

               if (op_count > 0) {
                   var mdxTextureIndex = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex];
                   var mdxTextureDefinition = mdxObject.m2File.textureDefinition[mdxTextureIndex];
                   materialData.texUnit1TexIndex = i;
                   materialData.xWrapTex1 = mdxTextureDefinition.flags & 1 > 0;
                   materialData.yWrapTex1 = mdxTextureDefinition.flags & 2 > 0;

                   if (mdxTextureDefinition.texType == 0) {
                       materialData.textureUnit1TexName = mdxTextureDefinition.textureName;
                   } else {
                       materialData.textureUnit1TexName = replaceTextures[mdxTextureDefinition.texType];
                   }
               }
               if (op_count > 1) {
                   var mdxTextureIndex1 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 1];
                   var mdxTextureDefinition1 = mdxObject.m2File.textureDefinition[mdxTextureIndex1];
                   materialData.xWrapTex2 = mdxTextureDefinition.flags & 1 > 0;
                   materialData.yWrapTex2 = mdxTextureDefinition.flags & 2 > 0;
                   materialData.texUnit2TexIndex = i;

                   if (mdxTextureDefinition1.texType == 0) {
                       materialData.textureUnit2TexName = mdxTextureDefinition1.textureName;
                   } else {
                       materialData.textureUnit2TexName = replaceTextures[mdxTextureDefinition1.texType];
                   }
               }
               if (op_count > 2) {
                   var mdxTextureIndex2 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 2];
                   var mdxTextureDefinition2 = mdxObject.m2File.textureDefinition[mdxTextureIndex2];
                   materialData.xWrapTex3 = mdxTextureDefinition.flags & 1 > 0;
                   materialData.yWrapTex3 = mdxTextureDefinition.flags & 2 > 0;
                   materialData.texUnit3TexIndex = i;

                   if (mdxTextureDefinition2.texType == 0) {
                       materialData.textureUnit3TexName = mdxTextureDefinition2.textureName;
                   } else {
                       materialData.textureUnit3TexName = replaceTextures[mdxTextureDefinition2.texType];
                   }
               }
           }

           for (var i = 0; i < materialArray.length; i++) {
               var materialData = materialArray[i];
               if (materialData.textureUnit1TexName) {
                   (function (materialData) {
                       self.sceneApi.resources.loadTexture(materialData.textureUnit1TexName)
                           .then(function success(textObject) {
                               materialData.texUnit1Texture = textObject;
                           }, function error() {
                           });
                   })(materialData);
               }
               if (materialData.textureUnit2TexName) {
                   (function (materialData) {
                       self.sceneApi.resources.loadTexture(materialData.textureUnit2TexName)
                           .then(function success(textObject) {
                               materialData.texUnit2Texture = textObject;
                           }, function error() {
                           });
                   })(materialData);
               }
               if (materialData.textureUnit3TexName) {
                   (function (materialData) {
                       self.sceneApi.resources.loadTexture(materialData.textureUnit3TexName)
                           .then(function success(textObject) {
                               materialData.texUnit3Texture = textObject;
                           }, function error() {
                           });
                   })(materialData);
               }
           }

           this.materialArray = materialArray;

       } catch(e) {
           console.log(e);
           debugger;
       }

    }
    checkFrustumCulling (cameraVec4, frustumPlanes, num_planes) {
        var aabb = this.aabb;

        //1. Check if camera position is inside Bounding Box
        if (
            cameraVec4[0] > aabb[0][0] && cameraVec4[0] < aabb[1][0] &&
            cameraVec4[1] > aabb[0][1] && cameraVec4[1] < aabb[1][1] &&
            cameraVec4[2] > aabb[0][2] && cameraVec4[2] < aabb[1][2]
        ) return true;

        //2. Check aabb is inside camera frustum
        var result = mathHelper.checkFrustum(frustumPlanes, aabb, num_planes);
        return result;
    }
    checkAgainstDepthBuffer(frustumMatrix, lookAtMat4, placementMatrix, checkDepth) {
        var bb = this.getBoundingBox();
        if (!bb) return false;

        var combinedMat4 = mat4.create();

        mat4.multiply(combinedMat4, frustumMatrix, lookAtMat4);
        mat4.multiply(combinedMat4, combinedMat4, placementMatrix);

        var bb1 = bb.ab,
            bb2 = bb.cd;

        var bb1vec = vec4.fromValues(bb1.x, bb1.y, bb1.z, 1);
        var bb2vec = vec4.fromValues(bb2.x, bb2.y, bb2.z, 1);

        vec4.transformMat4(bb1vec, bb1vec, combinedMat4);
        vec4.transformMat4(bb2vec, bb2vec, combinedMat4);

        //Perspective divide
        vec4.scale(bb1vec, bb1vec, 1/bb1vec[3]);
        vec4.scale(bb2vec, bb2vec, 1/bb2vec[3]);

        var depth = Math.max(0, Math.min(bb1vec[2], bb2vec[2]));

        var min_x = Math.min(bb1vec[0], bb2vec[0]); min_x = Math.max(min_x, -1.0);
        var max_x = Math.max(bb1vec[0], bb2vec[0]); max_x = Math.min(max_x, 1.0);

        var min_y = Math.min(bb1vec[1], bb2vec[1]); min_y = Math.max(min_y, -1.0);
        var max_y = Math.max(bb1vec[1], bb2vec[1]); max_y = Math.min(max_y, 1.0);

        return checkDepth(min_x, max_x, min_y, max_y, depth);
    }

    setAnimationId(animationId) {
        this.animationManager.setAnimationId(animationId);
    }

    getCombinedColor(skinData, materialData, subMeshColors) {
        var colorIndex = skinData.texs[materialData.texUnit1TexIndex].colorIndex;
        var submeshColor = new Float32Array([1,1,1,1]);
        if ((colorIndex >= 0) && (subMeshColors)) {
            var color = subMeshColors[colorIndex];
            submeshColor = color;
        }

        return submeshColor;
    }
    getTransparency(skinData, materialData,transparencies) {
        var transparency = 1.0;
        var transpIndex = skinData.texs[materialData.texUnit1TexIndex].transpIndex;
        if ((transpIndex >= 0) && (transparencies)) {
            transparency = transparencies[transpIndex];
        }

        return transparency;
    }

    updateLocalBB(localBB) {
        this.localBB = localBB
    }
    getBoundingBox () {
        return {
            ab: this.localBB[0],
            cd: this.localBB[1]
        }
    }

    update (deltaTime, cameraPos, viewMat) {
        if (!this.loaded) return;
        if (!this.getIsRendered()) return;
        var invPlacementMat = this.getInvertModelMatrix();

        //if (!this.materialArray) return;

        /* 1. Calc local camera */
        var cameraInlocalPos = vec4.create();
        vec4.copy(cameraInlocalPos, cameraPos);
        vec4.transformMat4(cameraInlocalPos, cameraInlocalPos, invPlacementMat);

        /* 2. Update animation values */
        this.animationManager.update(deltaTime, cameraInlocalPos, this.bonesMatrices, this.textAnimMatrices,
            this.subMeshColors, this.transparencies, this.cameras, this.lights);

        for (var i = 0; i < this.lights.length; i++) {
            var light = this.lights[i];
            vec4.transformMat4(light.position, light.position, this.placementMatrix);
            vec4.transformMat4(light.position, light.position, viewMat);
        }

        this.combinedBoneMatrix = this.combineBoneMatrixes();

        this.currentTime += deltaTime;
    }

    sortMaterials(lookAtMat4) {
        if (!this.loaded ) return;
        if (!this.getIsRendered()) return;

        /* 3. Resort m2 meshes against distance to screen */
        var skinData = this.skinGeom.skinFile.header;
        var skinGeom = this.skinGeom;

        var modelViewMat = mat4.create();
        mat4.multiply(modelViewMat, this.placementMatrix, lookAtMat4);

        var zeroVect = vec3.create();

        /* 3.1 Transform aabb with current mat */
        var transformedAABB = new Array(skinGeom.subMeshBBs.length);
        for (var i = 0 ; i < transformedAABB.length; i++) {
            var aabb = skinGeom.subMeshBBs[i];
            transformedAABB[i] = mathHelper.transformAABBWithMat4(modelViewMat, aabb);
        }

        QuickSort.multiQuickSort(
            this.materialArray,
            0, this.materialArray.length-1,
            function sortOnLevel (a, b) {
                return a.layer - b.layer;
            },
            function test1 (a, b) {
                var aabb1_t = transformedAABB[a.meshIndex];
                var aabb2_t = transformedAABB[b.meshIndex];

                var isInsideAABB1 = mathHelper.isPointInsideAABB(aabb1_t,zeroVect);
                var isInsideAABB2 = mathHelper.isPointInsideAABB(aabb2_t,zeroVect);

                if (!isInsideAABB1 && isInsideAABB2) {
                    return 1
                } else if (isInsideAABB1 && !isInsideAABB2) {
                    return -1
                }

                var result;
                if (isInsideAABB1 && isInsideAABB1) {
                    result = aabb1_t[0][2] - aabb2_t[0][2];
                } else if (!(isInsideAABB1 && isInsideAABB1)) {
                    result = aabb2_t[0][2] - aabb1_t[0][2];
                }


                return result;
            }
        );
    }

    /*
    * Animation functions
    *
    * */
    checkIfHasBillboarded() {
        var m2File = this.m2Geom.m2File;
        for (var i = 0; i < m2File.nBones; i++) {
            var boneDefinition = m2File.bones[i];
            if ((boneDefinition.flags & 0x48) > 0) {
                return true;
            }
        }

        return false;
    }

    initAnimationManager (m2File) {
        this.animationManager = new AnimationManager(m2File)
    }
    initTextureAnimMatrices() {
        var m2File = this.m2Geom.m2File;

        var textAnimMatrices = new Array(m2File.nTexAnims);
        for (var i = 0; i < m2File.nTexAnims; i++) {
            textAnimMatrices[i] = mat4.create();;
        }

        this.textAnimMatrices = textAnimMatrices;
    }
    initCameras() {
        var m2File = this.m2Geom.m2File;

        var cameras = new Array(m2File.nCameras);
        for (var i = 0; i < m2File.nCameras; i++) {
            cameras[i] = {};
        }

        this.cameras = cameras;
    }
    initLights() {
        var m2File = this.m2Geom.m2File;

        var lights = new Array(m2File.nLights);
        for (var i = 0; i < m2File.nLights; i++) {
            lights[i] = {};
        }

        this.lights = lights;
    }
    initBoneAnimMatrices() {
        var m2File = this.m2Geom.m2File;

        var bonesMatrices = new Array(m2File.nBones);
        for (var i = 0; i < m2File.nBones; i++) {
            bonesMatrices[i] = mat4.create();
        }

        this.bonesMatrices = bonesMatrices;
    }
    initSubmeshColors() {
        var m2File = this.m2Geom.m2File;
        this.subMeshColors = new Array(m2File.colors.length);
        for (var i = 0; i < this.subMeshColors.length; i++) {
            this.subMeshColors[i] = [1.0,1.0,1.0,1.0];
        }
    }
    initTransparencies() {
        var m2File = this.m2Geom.m2File;
        this.transparencies = new Array(m2File.transparencies.length);
        for (var i = 0; i < this.transparencies.length; i++) {
            this.transparencies[i] = 1.0;
        }
    }
    combineBoneMatrixes () {
        var combinedMatrix = new Float32Array(this.bonesMatrices.length * 16);
        for (var i = 0; i < this.bonesMatrices.length; i++) {
            combinedMatrix.set(this.bonesMatrices[i], i*16);
        }

        return combinedMatrix;
    }

    /*
    * Draw functions
    *
    * */

    drawMeshes(drawTransparent, instanceCount) {
        var originalFogColor = this.sceneApi.getFogColor();
        var identMat = mat4.create();
        mat4.identity(identMat);

        var meshIdsTobeRendered = window.meshestoBeRendered;
        for (var i = 0; i < this.materialArray.length; i++) {
            var materialData = this.materialArray[i];
            if (!(materialData.isTransparent ^ !drawTransparent)) continue;

            if (meshIdsTobeRendered && !meshIdsTobeRendered[materialData.texUnit1TexIndex]) continue;

            /* Get right texture animation matrix */
            var textureMatrix1 = identMat;
            var textureMatrix2 = identMat;
            var skinData = this.skinGeom.skinFile.header;
            if (materialData.texUnit1TexIndex >= 0 && skinData.texs[materialData.texUnit1TexIndex]) {
                var textureAnim = skinData.texs[materialData.texUnit1TexIndex].textureAnim;
                var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim];
                if (textureMatIndex !== undefined && this.textAnimMatrices && textureMatIndex >= 0 && textureMatIndex <  this.textAnimMatrices.length) {
                    textureMatrix1 = this.textAnimMatrices[textureMatIndex];
                }
                if (materialData.texUnit2TexIndex >= 0) {
                    var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim+1];
                    if (textureMatIndex !== undefined && this.textAnimMatrices && textureMatIndex >= 0 && textureMatIndex <  this.textAnimMatrices.length) {
                        textureMatrix2 = this.textAnimMatrices[textureMatIndex];
                    }
                }
            }
            var meshColor = this.getCombinedColor(skinData, materialData, this.subMeshColors);
            var transparency = this.getTransparency(skinData, materialData, this.transparencies)

            //Don't draw meshes with 0 transp
            if ((transparency < 0.0001) || (meshColor[3] < 0.001)) continue;

            var pixelShaderIndex = pixelShaderTable[materialData.shaderNames.pixel];
            this.m2Geom.drawMesh(materialData, this.skinGeom, meshColor, transparency, textureMatrix1, textureMatrix2, pixelShaderIndex, originalFogColor, instanceCount)
        }
    }
    drawInstanced(drawTransparent, instanceCount, placementVBO) {
        if (!this.m2Geom || !this.skinGeom) return;

        this.m2Geom.setupAttributes(this.skinGeom);
        var combinedMatrix = this.combinedBoneMatrix;
        this.m2Geom.setupUniforms(null, combinedMatrix, null, drawTransparent, this.lights);
        this.m2Geom.setupPlacementAttribute(placementVBO);
        this.drawMeshes(drawTransparent, instanceCount);
    }

    draw(drawTransparent, placementMatrix, diffuseColor) {
        if (!this.loaded) {
            if (!this.loading) {
                this.loading = true;
                MDXObject.prototype.load.apply(this);
            }
            return;
        }

        var vaoBinded = this.m2Geom.bindVao();
        if (!vaoBinded) {
            this.m2Geom.setupAttributes(this.skinGeom);
        }

        var combinedMatrix = this.combinedBoneMatrix;
        this.m2Geom.setupUniforms(placementMatrix, combinedMatrix, diffuseColor, drawTransparent, this.lights);

        this.drawMeshes(drawTransparent, -1);

        if (vaoBinded) {
            this.m2Geom.unbindVao()
        }
    }
    drawBB (color){
        if (!this.loaded) return;

        function drawBBInternal(bb1, bb2, color, placementMatrix) {
            var center = [
                (bb1.x + bb2.x) / 2,
                (bb1.y + bb2.y) / 2,
                (bb1.z + bb2.z) / 2
            ];

            var scale = [
                bb2.x - center[0],
                bb2.y - center[1],
                bb2.z - center[2]
            ];

            gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
            gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
            gl.uniform3fv(uniforms.uColor, new Float32Array(color)); //red
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }
        function drawBBInternal2(center, scale, color, placementMatrix) {
            gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
            gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
            gl.uniform3fv(uniforms.uColor, new Float32Array(color)); //red
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }

        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();

        var bb = this                           .getBoundingBox();

        if (bb) {
            var bb1 = bb.ab,
                bb2 = bb.cd;

            drawBBInternal(bb1, bb2, color, this.placementMatrix);

            //Draw possible BBs
            var skinData = this.skinGeom.skinFile.header;
            for (var i = 0; i < this.materialArray.length; i++) {
                var a = this.materialArray[i];
                //var mesh1Corner1 = skinData.subMeshes[a.meshIndex].pos;
                //var mesh1Corner2 = skinData.subMeshes[a.meshIndex].centerBoundingBox;
                //var radius = skinData.subMeshes[a.meshIndex].radius;
                var aabb = this.skinGeom.subMeshBBs[a.meshIndex];


                //drawBBInternal2([mesh1Corner1.x, mesh1Corner1.y, mesh1Corner1.z], [radius,radius,radius], [0.0, 0.8, 0], this.placementMatrix);
                drawBBInternal(
                    {x : aabb[0][0], y : aabb[0][1], z : aabb[0][2]},
                    {x : aabb[1][0], y : aabb[1][1], z : aabb[1][2]},
                    [0.0, 0.8, 0], this.placementMatrix);
            }
        }
    }

}

export default MDXObject;