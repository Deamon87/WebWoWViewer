'use strict';

(function (window, $, undefined) {
    var mdxObject = angular.module('js.wow.render.mdxObject', ['js.wow.math.mathHelper']);
    mdxObject.factory("mdxObject", ['$q', '$timeout', '$log', 'mathHelper', function($q, $timeout, $log, mathHelper) {

        function MDXObject(sceneApi){
            this.sceneApi = sceneApi;
            this.currentAnimation = 0;
            this.currentTime = 0;
            this.isAnimated = false;
        }
        MDXObject.prototype = {
            sceneApi : null,
            subMeshColors : null,
            load : function (modelName, skinNum, submeshRenderData){
                var self = this;

                var nameTemplate = modelName.split('.')[0];
                var modelFileName = nameTemplate + '.m2';
                var skinFileName = nameTemplate + '00.skin';

                var m2Promise = this.sceneApi.resources.loadM2Geom(modelFileName);
                var skinPromise = this.sceneApi.resources.loadSkinGeom(skinFileName);

                this.fileIdent = modelFileName + " " +skinFileName;

                return $q.all([m2Promise,skinPromise]).then(function(result){
                    var m2Geom = result[0];
                    var skinGeom = result[1];

                    self.m2Geom = m2Geom;
                    self.skinGeom = skinGeom;

                    if (!m2Geom) {
                        $log.log("m2 file failed to load : "+ modelName);
                    } else {
                        var gl = self.sceneApi.getGlContext();
                        //var result = self.createVAO(gl, m2Geom, skinGeom);
                        //self.vao = result.vao;
                        //self.vaoExt = result.ext;

                        self.makeSubmeshArray(m2Geom, skinGeom, submeshRenderData)
                    }
                });
            },
            makeSubmeshArray : function (mdxObject, skinObject, submeshRenderData) {
                var self = this;
                var submeshArray = new Array(15);

                /* 1. Free previous subMeshArray */

                /* 2. Fill the meshArrays */
                if (submeshRenderData) {
                    submeshRenderData.forEach(function (object, index) {
                        submeshArray[index] = {
                            submeshIndex: 0
                            //texture1: {},
                            //texture2: {},
                            //texture3: {}
                        }
                    });
                } else {
                    submeshArray.length = skinObject.skinFile.header.subMeshes.length;
                    for (var i = 0; i < submeshArray.length; i++) {
                        submeshArray[i] = {
                            isRendered: false,
                            isTransparent : false,
                            textureTexUnit1: null,
                            textureTexUnit2: null,
                            textureTexUnit3: null
                        };
                    }

                    for (var i = 0; i < skinObject.skinFile.header.texs.length ; i++) {
                        var skinTextureDefinition = skinObject.skinFile.header.texs[i];
                        var mdxTextureIndex = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex];
                        var mdxTextureDefinition = mdxObject.m2File.textureDefinition[mdxTextureIndex];
                        var textureUnit = mdxObject.m2File.textUnitLookup[skinTextureDefinition.textureUnitNum];
                        var op_count = skinTextureDefinition.op_count;

                        var renderFlagIndex = skinTextureDefinition.renderFlagIndex;
                        var isTransparent = mdxObject.m2File.renderFlags[renderFlagIndex].blend >= 2;

                        var submeshData = submeshArray[skinTextureDefinition.submeshIndex];

                        submeshData.isRendered = true;
                        submeshData.isTransparent = isTransparent;
                        if (textureUnit == 0) {
                            submeshData.texUnit1TexIndex = i;
                            submeshData.textureUnit1TexName = mdxTextureDefinition.textureName;
                            if (op_count > 1) {
                                var mdxTextureIndex1 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 1];
                                var mdxTextureDefinition1 = mdxObject.m2File.textureDefinition[mdxTextureIndex1];
                                submeshData.textureUnit2TexName = mdxTextureDefinition1.textureName;
                            }
                            if (op_count > 2) {
                                var mdxTextureIndex2 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 2];
                                var mdxTextureDefinition2 = mdxObject.m2File.textureDefinition[mdxTextureIndex2];
                                submeshData.textureUnit2TexName = mdxTextureDefinition2.textureName;
                            }
                        } else if (textureUnit == 1) {
                            submeshData.texUnit2TexIndex = i;
                            submeshData.textureUnit2TexName = mdxTextureDefinition.textureName;
                            if (op_count > 1) {
                                $log.log("textureUnit = 1 and op_count > 1 " + this.fileIdent);
                                var mdxTextureIndex2 = mdxObject.m2File.texLookup[skinTextureDefinition.textureIndex + 1];
                                var mdxTextureDefinition2 = mdxObject.m2File.textureDefinition[mdxTextureIndex2];
                                submeshData.textureUnit3TexName = mdxTextureDefinition2.textureName;
                            }
                        } else if (textureUnit == 2) {
                            $log.log("textureUnit = 2 " + this.fileIdent);
                            submeshData.texUnit3TexIndex = i;
                            submeshData.textureUnit3TexName = mdxTextureDefinition.textureName;
                        }
                    }

                    for (var i = 0; i < submeshArray.length; i++) {
                        var submeshData = submeshArray[i];
                        if (submeshData.textureUnit1TexName) {
                            (function (submeshData) {
                                self.sceneApi.resources.loadTexture(submeshData.textureUnit1TexName)
                                    .then(function success(textObject) {
                                        submeshData.texUnit1Texture = textObject;
                                    }, function error() {
                                    });
                            })(submeshData);
                        }
                        if (submeshData.textureUnit2TexName) {
                            (function (submeshData) {
                                self.sceneApi.resources.loadTexture(submeshData.textureUnit2TexName)
                                    .then(function success(textObject) {
                                        submeshData.texUnit2Texture = textObject;
                                    }, function error() {
                                    });
                            })(submeshData);
                        }
                        if (submeshData.textureUnit3TexName) {
                            (function (submeshData) {
                                self.sceneApi.resources.loadTexture(submeshData.textureUnit3TexName)
                                    .then(function success(textObject) {
                                        submeshData.texUnit3Texture = textObject;
                                    }, function error() {
                                    });
                            })(submeshData);
                        }
                    }
                }

                this.submeshArray = submeshArray;
            },
            checkFrustumCulling : function (cameraVec4, frustumPlanes, aabb) {
                //1. Check if camera position is inside frustum
                if (
                    cameraVec4[0] > aabb[0][0] && cameraVec4[0] < aabb[1][0] &&
                    cameraVec4[1] > aabb[0][1] && cameraVec4[1] < aabb[1][1] &&
                    cameraVec4[2] > aabb[0][2] && cameraVec4[2] < aabb[1][2]
                ) return true;

                //2. Check aabb is inside camera frustum
                var result = mathHelper.checkFrustum(frustumPlanes, aabb);
                return result;
            },
            checkAgainstDepthBuffer: function (frustumMatrix, lookAtMat4, placementMatrix, checkDepth) {
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
            },
            createVAO: function (gl, m2Geom, skinObject){
                var ext = gl.getExtension("OES_vertex_array_object"); // Vendor prefixes may apply!
                if (ext) {
                    var vao = ext.createVertexArrayOES();
                    ext.bindVertexArrayOES(vao);

                    m2Geom.setupAttributes(gl, skinObject);

                    ext.bindVertexArrayOES(null);
                }

                return {vao : vao, ext : ext};
            },
            getSubMeshColor : function (deltaTime) {
                var colors = this.m2Geom.m2File.colors;
                if (colors.length > 0) {

                    var result = this.subMeshColors;
                    if (!result) {
                        result = new Array(colors.length);
                    }

                    for (var i = 0; i < colors.length; i++) {
                        var vector = colors[i].color.valuesPerAnimation[0][0];
                        var alpha = colors[i].alpha.valuesPerAnimation[0][0];

                        result[i] = [vector.x, vector.y, vector.z, alpha/32767];
                    }

                    return result;

                } else {
                    return null;
                }
            },
            getTransperencies : function (deltaTime) {
                var transparencies = this.m2Geom.m2File.transparencies;
                if (transparencies.length > 0) {

                    var result = this.transperencies;
                    if (!result) {
                        result = new Array(transparencies.length);
                    }

                    for (var i = 0; i < transparencies.length; i++) {
                        var transparency = transparencies[i].values.valuesPerAnimation[0][0];
                        result[i] = transparency/32767;
                    }

                    return result;

                } else {
                    return null;
                }
            },
            getMeshesToRender : function() {
                var meshesToRender = [];
                if (this.submeshArray) {
                    for (var i = 0; i < this.submeshArray.length; i++) {
                        if (!this.submeshArray[i].isRendered) continue;
                        if (this.submeshArray[i].texUnit1TexIndex === undefined) continue;

                        var colorIndex = this.skinGeom.skinFile.header.texs[this.submeshArray[i].texUnit1TexIndex].colorIndex;
                        var renderFlagIndex = this.skinGeom.skinFile.header.texs[this.submeshArray[i].texUnit1TexIndex].renderFlagIndex;
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
            },
            getBoundingBox : function () {
                if (!this.m2Geom) return null;

                return {
                    ab : this.m2Geom.m2File.BoundingCorner1,
                    cd : this.m2Geom.m2File.BoundingCorner2
                }
            },
            update : function(deltaTime, cameraPos, invPlacementMat) {
                if (!this.m2Geom) return;

                var subMeshColors = this.getSubMeshColor(deltaTime);
                this.subMeshColors = subMeshColors;

                var transperencies = this.getTransperencies(deltaTime);
                this.transperencies = transperencies;

                this.calcBones(this.currentAnimation, this.currentTime + deltaTime, cameraPos, invPlacementMat);
                this.calcAnimMatrixes(this.currentTime + deltaTime);

                this.currentTime += deltaTime;
            },
            interpolateValues : function (currentTime, interpolType, time1, time2, value1, value2){
                //Support and use only linear interpolation for now
                if (interpolType >= 1) {
                    var diff = vec4.create();
                    vec4.subtract(diff, value2, value1);
                    vec4.scale(diff, diff, (currentTime - time1)/(time2 - time1));
                    var result = vec4.create();
                    vec4.add(result, value1, diff);

                    return result;
                }
            },
            getTimedValue : function (value_type, currTime, interpolType, times, values) {
                function convertInt16ToFloat(value){
                    return (((value < 0) ? value + 32768 : value - 32767)/ 32767.0);
                }

                var times_len = times.length;
                var result;
                if (times_len > 1) {
                    var maxTime = times[times_len-1];
                    var animTime = currTime % maxTime;

                    for (var i = 0; i < times_len; i++) {
                        if (times[i] > animTime) {
                            var value1 = values[i-1];
                            var value2 = values[i];

                            var time1 = times[i-1];
                            var time2 = times[i];

                            if (value_type == 0) {
                                value1 = [value1.x, value1.y, value1.z, 0];
                                value2 = [value2.x, value2.y, value2.z, 0];
                            } else if (value_type == 1) {
                                value1 = [convertInt16ToFloat(value1[0]),
                                    convertInt16ToFloat(value1[1]),
                                    convertInt16ToFloat(value1[2]),
                                    convertInt16ToFloat(value1[3])];

                                value2 = [convertInt16ToFloat(value2[0]),
                                    convertInt16ToFloat(value2[1]),
                                    convertInt16ToFloat(value2[2]),
                                    convertInt16ToFloat(value2[3])];
                            }
                            result = this.interpolateValues(animTime,
                                interpolType, time1, time2, value1, value2);

                            break;
                        }
                    }
                } else {
                    result = values[0];
                }

                return result;
            },
            calcAnimMatrixes : function (time) {
                if (!this.textAnimMatrix) {
                    var textAnimMatrix = new Array(this.m2Geom.m2File.texAnims.length);
                    for (var i = 0; i < textAnimMatrix.length; i++) {
                        textAnimMatrix[i] = mat4.create();
                    }

                    this.textAnimMatrix = textAnimMatrix;
                }

                var animation = this.currentAnimation;
                for (var i = 0; i < this.m2Geom.m2File.texAnims.length; i++) {
                    var animBlock = this.m2Geom.m2File.texAnims[i];

                    var tranformMat = mat4.identity(this.textAnimMatrix[i]);

                    if (animBlock.translation.valuesPerAnimation.length > 0 && animBlock.translation.valuesPerAnimation[animation].length > 0) {
                        var transVec = this.getTimedValue(
                            0,
                            time,
                            animBlock.translation.interpolation_type,
                            animBlock.translation.timestampsPerAnimation[animation],
                            animBlock.translation.valuesPerAnimation[animation]);

                        if (transVec) {
                            transVec = mat4.translate(tranformMat, tranformMat, [
                                transVec[0],
                                transVec[1],
                                transVec[2],
                                0
                            ]);
                        }
                    }
                    if (animBlock.rotation.valuesPerAnimation.length > 0 &&
                        animBlock.rotation.valuesPerAnimation[animation].length > 0) {

                        var quaternionVec4 = this.getTimedValue(
                            1,
                            time,
                            animBlock.rotation.interpolation_type,
                            animBlock.rotation.timestampsPerAnimation[animation],
                            animBlock.rotation.valuesPerAnimation[animation]);

                        if (quaternionVec4) {
                            var orientMatrix = mat4.create();
                            mat4.fromQuat(orientMatrix, quaternionVec4 );
                            mat4.multiply(tranformMat, tranformMat, orientMatrix);
                        }
                    }

                    if (animBlock.scale.valuesPerAnimation.length > 0 &&
                        animBlock.scale.valuesPerAnimation[animation].length > 0) {

                        var scaleVec3 = this.getTimedValue(
                            0,
                            time,
                            animBlock.scale.interpolation_type,
                            animBlock.scale.timestampsPerAnimation[animation],
                            animBlock.scale.valuesPerAnimation[animation]);

                        mat4.scale(tranformMat, tranformMat, [
                                scaleVec3[0],
                                scaleVec3[1],
                                scaleVec3[2]
                            ]
                        );
                    }

                    this.textAnimMatrix[i] = tranformMat;
                }
            },
            calcBoneMatrix : function (index, bone, animation, time, cameraPos, invPlacementMat){
                if (bone.isCalculated) return;
                var boneDefinition = this.m2Geom.m2File.bones[index];
                var parentBone = boneDefinition.parent_bone;

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

                if (boneDefinition.translation.valuesPerAnimation.length > 0 && boneDefinition.translation.valuesPerAnimation[animation].length > 0) {
                    var transVec = this.getTimedValue(
                        0,
                        time,
                        boneDefinition.translation.interpolation_type,
                        boneDefinition.translation.timestampsPerAnimation[animation],
                        boneDefinition.translation.valuesPerAnimation[animation]);

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

                if ((boneDefinition.flags & 0x8) > 0) {
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

                    var modelRight = vec3.create();
                    vec3.cross(modelRight, [0,0,1], modelForward);
                    vec3.normalize(modelRight,modelRight);

                    var modelUp = vec3.create();
                    vec3.cross(modelUp, modelForward, modelRight);
                    vec3.normalize(modelUp, modelUp);

                    mat4.multiply(tranformMat, tranformMat,
                        [
                            modelForward[0],modelForward[1],modelForward[2],0,
                            modelRight[0],modelRight[1],modelRight[2],0,
                            modelUp[0],modelUp[1],modelUp[2],0,
                            0,0,0,1
                        ]);
                    this.isAnimated = true;
                } else if (boneDefinition.rotation.valuesPerAnimation.length > 0 &&
                    boneDefinition.rotation.valuesPerAnimation[animation].length > 0) {

                    var quaternionVec4 = this.getTimedValue(
                        1,
                        time,
                        boneDefinition.rotation.interpolation_type,
                        boneDefinition.rotation.timestampsPerAnimation[animation],
                        boneDefinition.rotation.valuesPerAnimation[animation]);

                    if (quaternionVec4) {
                        var orientMatrix = mat4.create();
                        mat4.fromQuat(orientMatrix, quaternionVec4 );
                        mat4.multiply(tranformMat, tranformMat, orientMatrix);
                        this.isAnimated = true;
                    }
                }

                if (boneDefinition.scale.valuesPerAnimation.length > 0 &&
                    boneDefinition.scale.valuesPerAnimation[animation].length > 0) {

                    var scaleVec3 = this.getTimedValue(
                        0,
                        time,
                        boneDefinition.scale.interpolation_type,
                        boneDefinition.scale.timestampsPerAnimation[animation],
                        boneDefinition.scale.valuesPerAnimation[animation]);

                    mat4.scale(tranformMat, tranformMat, [
                            scaleVec3[0],
                            scaleVec3[1],
                            scaleVec3[2]
                        ]
                    );
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
            },
            combineBoneMatrixes : function() {
                var combinedMatrix = new Float32Array(this.bones.length * 16);
                for (var i = 0; i < this.bones.length; i++) {
                    combinedMatrix.set(this.bones[i].tranformMat, i*16);
                }

                return combinedMatrix;
            },
            calcBones : function (animation, time, cameraPos, invPlacementMat) {
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
            },
            drawInstancedNonTransparentMeshes : function (instanceCount, placementVBO, color) {
                if (!this.m2Geom) return;

                this.m2Geom.setupAttributes(this.skinGeom);
                var combinedMatrix = this.boneMatrix;
                this.m2Geom.setupUniforms(null, combinedMatrix);
                this.m2Geom.setupPlacementAttribute(placementVBO);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (subMeshData.isTransparent) continue;

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, textureMatrix, instanceCount)
                }
            },
            drawInstancedTransparentMeshes : function (instanceCount, placementVBO, color) {
                if (!this.m2Geom) return;

                var identMat = mat4.create();
                mat4.identity(identMat);

                this.m2Geom.setupAttributes(this.skinGeom);
                var combinedMatrix = this.boneMatrix;
                this.m2Geom.setupUniforms(null, combinedMatrix);
                this.m2Geom.setupPlacementAttribute(placementVBO);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (!subMeshData.isTransparent) continue;

                    /* Get right texture animation matrix */
                    var textureMatrix;
                    var skinData = this.skinGeom.skinFile.header;

                    if (subMeshData.texUnit1TexIndex >= 0 && skinData.texs[subMeshData.texUnit1TexIndex]) {
                        var textureAnim = skinData.texs[subMeshData.texUnit1TexIndex].textureAnim;
                        var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim];
                        if (textureMatIndex >= 0) {
                            textureMatrix = this.textAnimMatrix[textureMatIndex];
                        } else {
                            textureMatrix = identMat;
                        }
                    }

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, textureMatrix, instanceCount)
                }
            },
            drawNonTransparentMeshes : function (placementMatrix, color) {
                if (!this.m2Geom || !this.skinGeom) return;

                var identMat = mat4.create();
                mat4.identity(identMat);

                this.m2Geom.setupAttributes(this.skinGeom);
                var combinedMatrix = this.boneMatrix;
                this.m2Geom.setupUniforms(placementMatrix, combinedMatrix);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (subMeshData.isTransparent) continue;

                    /* Get right texture animation matrix */
                    var textureMatrix;
                    var skinData = this.skinGeom.skinFile.header;
                    if (subMeshData.texUnit1TexIndex >= 0 && skinData.texs[subMeshData.texUnit1TexIndex]) {
                        var textureAnim = skinData.texs[subMeshData.texUnit1TexIndex].textureAnim;
                        var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim];
                        if (textureMatIndex >= 0) {
                            textureMatrix = this.textAnimMatrix[textureMatIndex];
                        } else {
                            textureMatrix = identMat;
                        }
                    }

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, textureMatrix)
                }
            },
            drawTransparentMeshes : function (placementMatrix, color) {
                if (!this.m2Geom || !this.skinGeom) return;

                var identMat = mat4.create();
                mat4.identity(identMat);

                this.m2Geom.setupAttributes(this.skinGeom);
                var combinedMatrix = this.boneMatrix;
                this.m2Geom.setupUniforms(placementMatrix, combinedMatrix);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (!subMeshData.isTransparent) continue;

                    /* Get right texture animation matrix */
                    var textureMatrix;
                    var skinData = this.skinGeom.skinFile.header;
                    if (subMeshData.texUnit1TexIndex >= 0 && skinData.texs[subMeshData.texUnit1TexIndex]) {
                        var textureAnim = skinData.texs[subMeshData.texUnit1TexIndex].textureAnim;
                        var textureMatIndex = this.m2Geom.m2File.texAnimLookup[textureAnim];
                        if (textureMatIndex >= 0) {
                            textureMatrix = this.textAnimMatrix[textureMatIndex];
                        } else {
                            textureMatrix = identMat;
                        }
                    }

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, textureMatrix)
                }
            },
            draw : function (placementMatrix, color){
                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                if ((this.m2Geom) && (this.skinGeom)) {
                    this.m2Geom.draw(this.skinGeom, this.submeshArray, placementMatrix, colorVector, this.subMeshColors, this.transperencies, this.vao, this.vaoExt);
                }
            }
        };

        return MDXObject;
    }]);
})(window, jQuery);