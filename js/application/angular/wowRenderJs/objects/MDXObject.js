import $q from 'q';
import AnimationManager from './../manager/animationManager.js'
import mathHelper from './../math/mathHelper.js';
import {vec4, mat4, vec3, quat} from 'gl-matrix';

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
        this.leftHandClosed = value;
    }
    setRightHandClosed(value) {
        this.rightHandClosed = value;
    }

    load (modelName, skinNum, meshIds,replaceTextures){
        var self = this;

        var nameTemplate = modelName.split('.')[0];
        var modelFileName = nameTemplate + '.m2';
        var skinFileName = nameTemplate + '00.skin';
        modelFileName = modelFileName.toLowerCase();
        skinFileName = skinFileName.toLowerCase();

        var m2Promise = this.sceneApi.resources.loadM2Geom(modelFileName);
        var skinPromise = this.sceneApi.resources.loadSkinGeom(skinFileName);

        this.fileIdent = modelFileName + " " +skinFileName;
        this.fileIdent = this.fileIdent.replace(/\0/g, '');

        return $q.all([m2Promise,skinPromise]).then(function(result){
            var m2Geom = result[0];
            var skinGeom = result[1];

            self.m2Geom = m2Geom;
            self.skinGeom = skinGeom;

            if (!m2Geom) {
                $log.log("m2 file failed to load : "+ modelName);
            } else {
                var gl = self.sceneApi.getGlContext();
                m2Geom.createVAO(skinGeom);
                self.hasBillboarded = self.checkIfHasBillboarded();

                self.makeTextureArray(meshIds, replaceTextures)

                self.initAnimationManager(m2Geom.m2File);
                self.initBoneAnimMatrices();
                self.initSubmeshColors();
                self.initTextureAnimMatrices();
                self.initTransparencies();
            }
            return true;
        });
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
            shaderNames = getTabledShaderNames(shaderId, m2Batch.op_count, m2Batch.tex_unit_number2);
            if ( !shaderNames )
                shaderNames = getTabledShaderNames(shaderId, m2Batch.op_count, 0x11, m2Batch.tex_unit_number2);
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
               var isTransparent = mdxObject.m2File.renderFlags[renderFlagIndex].blend >= 2;

               var shaderNames = this.getShaderNames(subMesh);

               materialData.layer = skinTextureDefinition.layer;
               materialData.isRendered = true;
               materialData.isTransparent = isTransparent;
               materialData.meshIndex = skinTextureDefinition.submeshIndex;
               materialData.shaderNames = shaderNames;

               var textureUnit;
               if (skinTextureDefinition.textureUnitNum <= mdxObject.m2File.textUnitLookup.length) {
                   textureUnit = mdxObject.m2File.textUnitLookup[skinTextureDefinition.textureUnitNum];
                   if (textureUnit == -1) {
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

           materialArray.sort(function (a, b) {
               return a.layer - b.layer;
           });
           this.materialArray = materialArray;

       } catch(e) {
           console.log(e);
           debugger;
       }

    }
    checkFrustumCulling (cameraVec4, frustumPlanes, aabb, num_planes) {
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

    getBoundingBox () {
        if (!this.m2Geom) return null;

        return {
            ab : this.m2Geom.m2File.BoundingCorner1,
            cd : this.m2Geom.m2File.BoundingCorner2
        }
    }
    update (deltaTime, cameraPos, invPlacementMat) {
        if (!this.m2Geom) return;
        //if (!this.materialArray) return;

        /* 1. Calc local camera */
        var cameraInlocalPos = vec4.create();
        vec4.copy(cameraInlocalPos, cameraPos);
        vec4.transformMat4(cameraInlocalPos, cameraInlocalPos, invPlacementMat);

        /* 2. Update animation values */
        this.animationManager.update(deltaTime, cameraInlocalPos, this.bonesMatrices, this.textAnimMatrices, this.subMeshColors, this.transparencies);
        this.combinedBoneMatrix = this.combineBoneMatrixes();

        /* 3. Resort m2 meshes against distance to screen */
        var skinData = this.skinGeom.skinFile.header;

        this.materialArray.sort(function(a, b) {
            var result = a.layer - b.layer;
            if (result == 0) {
                var mesh1Pos = skinData.subMeshes[a.meshIndex].pos;
                var mesh2Pos = skinData.subMeshes[b.meshIndex].pos;

                var mesh1Vec = vec3.create();
                vec3.subtract(mesh1Vec, [mesh1Pos.x, mesh1Pos.y, mesh1Pos.z], cameraInlocalPos);

                var mesh2Vec = vec3.create();
                vec3.subtract(mesh2Vec, [mesh2Pos.x, mesh2Pos.y, mesh2Pos.z], cameraInlocalPos);

                var distMesh1 = vec3.length(mesh1Vec)
                var distMesh2 = vec3.length(mesh2Vec);

                result = distMesh2 - distMesh1;
            }

            return result;
        });

        this.currentTime += deltaTime;
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
        var identMat = mat4.create();
        mat4.identity(identMat);

        for (var i = 0; i < this.materialArray.length; i++) {
            var materialData = this.materialArray[i];
            if (!(materialData.isTransparent ^ !drawTransparent)) continue;

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
            if (transparency < 0.0001) continue;

            this.m2Geom.drawMesh(i, materialData, this.skinGeom, meshColor, transparency, textureMatrix1, textureMatrix2, instanceCount)
        }
    }
    drawInstanced(drawTransparent, instanceCount, placementVBO) {
        if (!this.m2Geom || !this.skinGeom) return;

        this.m2Geom.setupAttributes(this.skinGeom);
        var combinedMatrix = this.boneMatrix;
        this.m2Geom.setupUniforms(null, combinedMatrix, null, drawTransparent);
        this.m2Geom.setupPlacementAttribute(placementVBO);
        this.drawMeshes(drawTransparent, instanceCount);
    }

    draw(drawTransparent, placementMatrix, diffuseColor) {
        if (!this.m2Geom || !this.skinGeom) return;

        var vaoBinded = this.m2Geom.bindVao();
        if (!vaoBinded) {
            this.m2Geom.setupAttributes(this.skinGeom);
        }

        var combinedMatrix = this.combinedBoneMatrix;
        this.m2Geom.setupUniforms(placementMatrix, combinedMatrix, diffuseColor, drawTransparent);

        this.drawMeshes(drawTransparent, -1);

        if (vaoBinded) {
            this.m2Geom.unbindVao()
        }
    }

}

export default MDXObject;