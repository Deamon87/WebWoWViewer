import $q from 'q';
import mathHelper from './../math/mathHelper.js';
import {vec4, mat4, vec3, quat} from 'gl-matrix';

class MDXObject {
    constructor(sceneApi){
        this.sceneApi = sceneApi;
        this.currentAnimationStart = 0;
        this.currentAnimation = 0;
        this.currentTime = 0;
        this.isAnimated = false;
        this.subMeshColors
    }

    getFileNameIdent(){
        return this.fileIdent;
    }

    load (modelName, skinNum, submeshRenderData){
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


                self.makeTextureArray(m2Geom, skinGeom, submeshRenderData)
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
    makeTextureArray (mdxObject, skinObject, submeshRenderData) {
        var self = this;

        /* 1. Free previous subMeshArray */

        /* 2. Fill the materialArray */
        var materialArray = new Array(skinObject.skinFile.header.texs.length);
        for (var i = 0; i < materialArray.length; i++) {
            materialArray[i] = {
                isRendered: false,
                isTransparent : false,
                isEnviromentMapping : false,
                meshIndex : -1,
                textureTexUnit1: null,
                textureTexUnit2: null,
                textureTexUnit3: null
            };
        }

        var subMeshes = this.skinGeom.skinFile.header.subMeshes;
        for (var i = 0; i < skinObject.skinFile.header.texs.length ; i++) {
            var skinTextureDefinition = skinObject.skinFile.header.texs[i];
            var mdxTextureIndex = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex];

            var op_count = skinTextureDefinition.op_count;

            var renderFlagIndex = skinTextureDefinition.renderFlagIndex;
            var isTransparent = mdxObject.m2File.renderFlags[renderFlagIndex].blend >= 2;

            var materialData = materialArray[i];

            var subMesh = subMeshes[skinTextureDefinition.submeshIndex];

            var shaderNames = this.getShaderNames(subMesh);

            materialData.layer =  skinTextureDefinition.layer;
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

                materialData.textureUnit1TexName = mdxTextureDefinition.textureName;
            }
            if (op_count > 1) {
                var mdxTextureIndex1 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 1];
                var mdxTextureDefinition1 = mdxObject.m2File.textureDefinition[mdxTextureIndex1];
                materialData.xWrapTex2 = mdxTextureDefinition.flags & 1 > 0;
                materialData.yWrapTex2 = mdxTextureDefinition.flags & 2 > 0;
                materialData.texUnit2TexIndex = i;
                materialData.textureUnit2TexName = mdxTextureDefinition1.textureName;
            }
            if (op_count > 2) {
                var mdxTextureIndex2 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 2];
                var mdxTextureDefinition2 = mdxObject.m2File.textureDefinition[mdxTextureIndex2];
                materialData.xWrapTex3 = mdxTextureDefinition.flags & 1 > 0;
                materialData.yWrapTex3 = mdxTextureDefinition.flags & 2 > 0;
                materialData.texUnit3TexIndex = i;
                materialData.textureUnit3TexName = mdxTextureDefinition2.textureName;
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

        materialArray.sort(function(a,b){
            return a.layer - b.layer;
        });

        this.materialArray = materialArray;
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
    checkCurrentAnimation (animation, currentTime) {
        var animationRecord = this.m2Geom.m2File.animations[animation];
        if (currentTime > this.currentAnimationStart+animationRecord.length) {
            var nextAnimation = animationRecord.next_animation;
            this.currentAnimationStart = currentTime;

            if (nextAnimation >= 0) {
                this.currentAnimation = nextAnimation;
                return nextAnimation
            }
        }
        return this.currentAnimation;
    }

    getSubMeshColor (animation, time) {
        var colors = this.m2Geom.m2File.colors;
        var animationRecord = this.m2Geom.m2File.animations[animation];

        if (colors.length > 0) {
            var result = this.subMeshColors;
            if (!result) {
                result = new Array(colors.length);
            }

            for (var i = 0; i < colors.length; i++) {
                var colorVec = this.getTimedValue(
                    0,
                    time,
                    animationRecord.length,
                    animation,
                    colors[i].color);
                var alpha = this.getTimedValue(
                    2,
                    time,
                    animationRecord.length,
                    animation,
                    colors[i].alpha);

                if (colorVec) {
                    result[i] = [colorVec[0], colorVec[1], colorVec[2],1]
                } else {
                    result[i] = [1.0, 1.0, 1.0, 1.0]
                }
                if (alpha) {
                    result[i][3] = alpha[0];
                }
            }

            return result;

        } else {
            return null;
        }
    }
    getTransperencies(animation, time) {
        var transparencies = this.m2Geom.m2File.transparencies;
        var animationRecord = this.m2Geom.m2File.animations[animation];

        if (transparencies.length > 0) {

            var result = this.transperencies;
            if (!result) {
                result = new Array(transparencies.length);
            }

            for (var i = 0; i < transparencies.length; i++) {
                var transparency = this.getTimedValue(
                    2,
                    time,
                    animationRecord.length,
                    animation,
                    transparencies[i].values);

                if (transparency) {
                    result[i] = transparency[0];
                } else {
                    debugger;
                }
            }

            return result;

        } else {
            return null;
        }
    }
    getMeshesToRender() {
        var meshesToRender = [];
        if (this.materialArray) {
            for (var i = 0; i < this.materialArray.length; i++) {
                if (!this.materialArray[i].isRendered) continue;
                if (this.materialArray[i].texUnit1TexIndex === undefined) continue;

                var colorIndex = this.skinGeom.skinFile.header.texs[this.materialArray[i].texUnit1TexIndex].colorIndex;
                var renderFlagIndex = this.skinGeom.skinFile.header.texs[this.materialArray[i].texUnit1TexIndex].renderFlagIndex;
                var isTransparent = this.m2Geom.m2File.renderFlags[renderFlagIndex].blend > 0;
                var meshColor = (colorIndex > -1 && this.subMeshColors) ? this.subMeshColors[colorIndex] : null;

                var mesh = {
                    m2Object: this,
                    skin: this.skinGeom,
                    meshIndex: i,
                    color: meshColor,
                    transparency: 0,
                    isTransparent: isTransparent,
                    animationMatrix: null
                };

                meshesToRender.push(mesh);
            }
        }

        return meshesToRender;
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

        var animation = this.currentAnimation;
        animation = this.checkCurrentAnimation(animation, this.currentTime + deltaTime);


        var subMeshColors = this.getSubMeshColor(animation, this.currentTime + deltaTime);
        this.subMeshColors = subMeshColors;

        var transperencies = this.getTransperencies(animation, this.currentTime + deltaTime);
        this.transperencies = transperencies;

        this.calcBones(animation, this.currentTime + deltaTime, cameraPos, invPlacementMat);
        this.calcAnimMatrixes(animation, this.currentTime + deltaTime);

        var skinData = this.skinGeom.skinFile.header;
        this.materialArray.sort(function(a, b) {
            var result = a.layer - b.layer;
            if (result == 0) {
                var mesh1Pos = skinData.subMeshes[a.meshIndex].pos;
                var mesh2Pos = skinData.subMeshes[b.meshIndex].pos;

                var mesh1Vec = vec3.create();
                vec3.subtract(mesh1Vec, [mesh1Pos.x, mesh1Pos.y, mesh1Pos.z], cameraPos);

                var mesh2Vec = vec3.create();
                vec3.subtract(mesh2Vec, [mesh2Pos.x, mesh2Pos.y, mesh2Pos.z], cameraPos);

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

    interpolateValues (currentTime, interpolType, time1, time2, value1, value2, valueType){
        //Support and use only linear interpolation for now
        if (interpolType == 0) {
            return value1;
        } else if (interpolType >= 1) {

            if (valueType == 1 || valueType == 3) {
                var result = vec4.create();
                quat.slerp(result, value1, value2, (currentTime - time1)/(time2 - time1));
            } else {
                var diff = vec4.create();
                vec4.subtract(diff, value2, value1);
                vec4.scale(diff, diff, (currentTime - time1)/(time2 - time1));
                var result = vec4.create();
                vec4.add(result, value1, diff);
            }

            return result;
        }
    }
    getTimedValue (value_type, currTime, maxTime, animation, animationBlock) {
        function convertInt16ToFloat(value){
            return (((value < 0) ? value + 32768 : value - 32767)/ 32767.0);
            //return (value / 32768) - 1.0
        }

        function convertValueTypeToVec4(value, type){
            if (type == 0) {
                return [value.x, value.y, value.z, 0];
            } else if (type == 1) {
                return [convertInt16ToFloat(value[0]),
                    convertInt16ToFloat(value[1]),
                    convertInt16ToFloat(value[2]),
                    convertInt16ToFloat(value[3])];
            } else if (type == 2) {
                return [value/32767,value/32767, value/32767, value/32767];
            } else if (type == 3) {
                return [value.x,value.y, value.z, value.w];
            }
        }

        var globalSequence = animationBlock.global_sequence;
        var interpolType = animationBlock.interpolation_type;

        var times = animationBlock.timestampsPerAnimation[animation];
        var values =  animationBlock.valuesPerAnimation[animation];

        //Hack
        if (times == undefined) {
            animation = 0;
            times = animationBlock.timestampsPerAnimation[animation];
            values =  animationBlock.valuesPerAnimation[animation];
        }
        if (times.length == 0) {
            return undefined;
        }

        if (globalSequence >=0) {
            maxTime = this.m2Geom.m2File.globalSequences[globalSequence];
        }

        var times_len = times.length;
        var result;
        if (times_len > 1) {
            //var maxTime = times[times_len-1];
            var animTime = currTime % maxTime;

            if (animTime > times[times_len-1] && animTime <= maxTime) {
                result = convertValueTypeToVec4(values[0], value_type);
            } else {
                result =  convertValueTypeToVec4(times[times_len-1], value_type);
                for (var i = 0; i < times_len; i++) {
                    if (times[i] > animTime) {
                        var value1 = values[i - 1];
                        var value2 = values[i];

                        var time1 = times[i - 1];
                        var time2 = times[i];

                        value1 = convertValueTypeToVec4(value1, value_type);
                        value2 = convertValueTypeToVec4(value2, value_type);

                        result = this.interpolateValues(animTime,
                            interpolType, time1, time2, value1, value2, value_type);

                        if (value_type == 1 || value_type == 3) {
                            vec4.normalize(result, result); //quaternion has to be normalized after lerp operation
                        }

                        break;
                    }
                }
            }
        } else {
            result = convertValueTypeToVec4(values[0], value_type);
        }

        return result;
    }
    calcAnimMatrixes (animation, time) {
        if (!this.textAnimMatrix) {
            var textAnimMatrix = new Array(this.m2Geom.m2File.texAnims.length);
            for (var i = 0; i < textAnimMatrix.length; i++) {
                textAnimMatrix[i] = mat4.create();
            }

            this.textAnimMatrix = textAnimMatrix;
        }

        var animationRecord = this.m2Geom.m2File.animations[animation];
        for (var i = 0; i < this.m2Geom.m2File.texAnims.length; i++) {
            var animBlock = this.m2Geom.m2File.texAnims[i];

            var tranformMat = mat4.identity(this.textAnimMatrix[i]);

            transVec = mat4.translate(tranformMat, tranformMat, [
                0.5,
                0.5,
                0,
                0
            ]);

            if (animBlock.translation.valuesPerAnimation.length > 0) {
                var transVec = this.getTimedValue(
                    0,
                    time,
                    animationRecord.length,
                    animation,
                    animBlock.translation);

                if (transVec) {
                    transVec = mat4.translate(tranformMat, tranformMat, [
                        transVec[0],
                        transVec[1],
                        transVec[2],
                        0
                    ]);
                }
            }
            if (animBlock.rotation.valuesPerAnimation.length > 0) {

                var quaternionVec4 = this.getTimedValue(
                    3,
                    time,
                    animationRecord.length,
                    animation,
                    animBlock.rotation);

                if (quaternionVec4) {
                    var orientMatrix = mat4.create();

                    mat4.fromQuat(orientMatrix, quaternionVec4 );
                    mat4.multiply(tranformMat, tranformMat, orientMatrix);
                }
            }

            if (animBlock.scale.valuesPerAnimation.length > 0) {

                var scaleVec3 = this.getTimedValue(
                    0,
                    time,
                    animationRecord.length,
                    animation,
                    animBlock.scale);

                if (scaleVec3) {
                    mat4.scale(tranformMat, tranformMat, [
                            scaleVec3[0],
                            scaleVec3[1],
                            scaleVec3[2]
                        ]
                    );
                }
            }
            transVec = mat4.translate(tranformMat, tranformMat, [
                -0.5,
                -0.5,
                0,
                0
            ]);

            this.textAnimMatrix[i] = tranformMat;
        }
    }
    calcBoneMatrix (index, bone, animation, time, cameraPos, invPlacementMat){
        if (bone.isCalculated) return;
        var boneDefinition = this.m2Geom.m2File.bones[index];
        var parentBone = boneDefinition.parent_bone;
        var animationRecord = this.m2Geom.m2File.animations[animation];

        //2. Calc current transformation matrix

        var tranformMat = mat4.create();
        tranformMat = mat4.identity(tranformMat);

        if (parentBone>=0) {
            this.calcBoneMatrix(parentBone, this.bones[parentBone], animation, time, cameraPos, invPlacementMat);
            mat4.multiply(tranformMat, tranformMat, this.bones[parentBone].tranformMat);
        }

        mat4.translate(tranformMat, tranformMat, [
            boneDefinition.pivot.x,
            boneDefinition.pivot.y,
            boneDefinition.pivot.z,
            0
        ]);

        if (boneDefinition.translation.valuesPerAnimation.length > 0) {
            var transVec = this.getTimedValue(
                0,
                time,
                animationRecord.length,
                animation,
                boneDefinition.translation);

            if (transVec) {
                transVec = mat4.translate(tranformMat, tranformMat, [
                    transVec[0],
                    transVec[1],
                    transVec[2],
                    0
                ]);
                this.isAnimated = true;
            }
        }

        if (((boneDefinition.flags & 0x8) > 0) || ((boneDefinition.flags & 0x40) > 0)) {
            //From http://gamedev.stackexchange.com/questions/112270/calculating-rotation-matrix-for-an-object-relative-to-a-planets-surface-in-monog
            var modelForward = vec3.create();
            var cameraInlocalPos = vec4.create();

            vec4.copy(cameraInlocalPos, cameraPos);
            vec4.transformMat4(cameraInlocalPos, cameraInlocalPos, invPlacementMat);

            if (parentBone>=0) {
                vec4.transformMat4(cameraInlocalPos, cameraInlocalPos, this.bones[parentBone].inverTransforMat);
            }
            vec4.subtract(cameraInlocalPos, cameraInlocalPos, [
                boneDefinition.pivot.x,
                boneDefinition.pivot.y,
                boneDefinition.pivot.z,
                0
            ]);

            vec3.normalize(modelForward, cameraInlocalPos);

            if ((boneDefinition.flags & 0x40) > 0) {
                //Cylindrical billboard

                var modelUp = vec3.fromValues(0,0,1);

                var modelRight = vec3.create();
                vec3.cross(modelRight, modelUp, modelForward);
                vec3.normalize(modelRight, modelRight);

                vec3.cross(modelForward, modelRight, modelUp);
                vec3.normalize(modelForward, modelForward);

                vec3.cross(modelRight, modelUp, modelForward);
                vec3.normalize(modelRight, modelRight);

            } else {
                //Spherical billboard
                var modelRight = vec3.create();
                vec3.cross(modelRight, [0, 0, 1], modelForward);
                vec3.normalize(modelRight, modelRight);

                var modelUp = vec3.create();
                vec3.cross(modelUp, modelForward, modelRight);
                vec3.normalize(modelUp, modelUp);
            }


            mat4.multiply(tranformMat, tranformMat,
                [
                    modelForward[0],modelForward[1],modelForward[2],0,
                    modelRight[0],modelRight[1],modelRight[2],0,
                    modelUp[0],modelUp[1],modelUp[2],0,
                    0,0,0,1
                ]);
            this.isAnimated = true;
        } else if (boneDefinition.rotation.valuesPerAnimation.length > 0) {

            var quaternionVec4 = this.getTimedValue(
                1,
                time,
                animationRecord.length,
                animation,
                boneDefinition.rotation);

            if (quaternionVec4) {
                var orientMatrix = mat4.create();
                mat4.fromQuat(orientMatrix, quaternionVec4 );
                mat4.multiply(tranformMat, tranformMat, orientMatrix);
                this.isAnimated = true;
            }
        }

        if (boneDefinition.scale.valuesPerAnimation.length > 0) {

            var scaleVec3 = this.getTimedValue(
                0,
                time,
                animationRecord.length,
                animation,
                boneDefinition.scale);

            if (scaleVec3) {
                mat4.scale(tranformMat, tranformMat, [
                        scaleVec3[0],
                        scaleVec3[1],
                        scaleVec3[2]
                    ]
                );
            }
            this.isAnimated = true;
        }

        mat4.translate(tranformMat, tranformMat, [
            -boneDefinition.pivot.x,
            -boneDefinition.pivot.y,
            -boneDefinition.pivot.z,
            0
        ]);

        var invertTransformMat = mat4.create();
        mat4.invert(invertTransformMat, tranformMat);
        bone.tranformMat = tranformMat;
        bone.inverTransforMat = invertTransformMat;
    }
    combineBoneMatrixes () {
        var combinedMatrix = new Float32Array(this.bones.length * 16);
        for (var i = 0; i < this.bones.length; i++) {
            combinedMatrix.set(this.bones[i].tranformMat, i*16);
        }

        return combinedMatrix;
    }
    calcBones (animation, time, cameraPos, invPlacementMat) {
        if (!this.m2Geom) return null;

        var m2File = this.m2Geom.m2File;
        if (!this.bones) {
            this.bones = new Array(m2File.nBones);
            for (var i = 0; i < m2File.nBones; i++) {
                if (!this.bones[i]) this.bones[i] = {};
                this.bones[i].isCalculated = false;
            }
        }

        if (!this.boneMatrix || this.isAnimated) {
            for (var i = 0; i < m2File.nBones; i++) {
                this.calcBoneMatrix(i, this.bones[i], animation, time, cameraPos, invPlacementMat);
            }
        }

        this.boneMatrix = this.combineBoneMatrixes();
    }

    /*
    * Draw functions
    *
    * */

    drawMeshes(drawTransparent, colorVector, instanceCount) {
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
                if (textureMatIndex !== undefined && this.textAnimMatrix && textureMatIndex >= 0 && textureMatIndex <  this.textAnimMatrix.length) {
                    textureMatrix1 = this.textAnimMatrix[textureMatIndex];
                }
                if (materialData.texUnit2TexIndex >= 0) {
                    var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim+1];
                    if (textureMatIndex !== undefined && this.textAnimMatrix && textureMatIndex >= 0 && textureMatIndex <  this.textAnimMatrix.length) {
                        textureMatrix2 = this.textAnimMatrix[textureMatIndex];
                    }
                }
            }

            this.m2Geom.drawMesh(i, materialData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, textureMatrix1, textureMatrix2, instanceCount)
        }
    }
    drawInstanced(drawTransparent, instanceCount, placementVBO, color) {
        if (!this.m2Geom || !this.skinGeom) return;

        this.m2Geom.setupAttributes(this.skinGeom);
        var combinedMatrix = this.boneMatrix;
        this.m2Geom.setupUniforms(null, combinedMatrix);
        this.m2Geom.setupPlacementAttribute(placementVBO);

        var colorVector = [color&0xff, (color>> 8)&0xff,
            (color>>16)&0xff, (color>> 24)&0xff];
        colorVector[0] /= 255.0; colorVector[1] /= 255.0;
        colorVector[2] /= 255.0; colorVector[3] /= 255.0;

        this.drawMeshes(drawTransparent, colorVector, instanceCount);
    }

    draw(drawTransparent, placementMatrix, color) {
        if (!this.m2Geom || !this.skinGeom) return;

        var vaoBinded = this.m2Geom.bindVao();
        if (!vaoBinded) {
            this.m2Geom.setupAttributes(this.skinGeom);
        }

        var combinedMatrix = this.boneMatrix;
        this.m2Geom.setupUniforms(placementMatrix, combinedMatrix);

        var colorVector = [color&0xff, (color>> 8)&0xff,
            (color>>16)&0xff, (color>> 24)&0xff];
        colorVector[0] /= 255.0; colorVector[1] /= 255.0;
        colorVector[2] /= 255.0; colorVector[3] /= 255.0;

        this.drawMeshes(drawTransparent, colorVector);

        if (vaoBinded) {
            this.m2Geom.unbindVao()
        }
    }

}

export default MDXObject;