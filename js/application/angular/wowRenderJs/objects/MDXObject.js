'use strict';

(function (window, $, undefined) {
    var mdxObject = angular.module('js.wow.render.mdxObject', []);
    mdxObject.factory("mdxObject", ['$q', '$timeout', '$log', function($q, $timeout, $log) {

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

                this.currentTime += deltaTime;
            },
            calcBoneMatrix : function (index, bone, animation, time, cameraPos, invPlacementMat){
                function convertInt16ToFloat(value){
                    return (((value < 0) ? value + 32768 : value - 32767)/ 32767.0);
                }

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

                if (boneDefinition.translation.valuesPerAnimation.length > 0 &&
                    boneDefinition.translation.valuesPerAnimation[animation].length > 0) {

                    var transVec = boneDefinition.translation.valuesPerAnimation[animation][0];
                    if (transVec) {
                        transVec = mat4.translate(tranformMat, tranformMat, [
                            transVec.x,
                            transVec.y,
                            transVec.z,
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

                } else if (boneDefinition.rotation.valuesPerAnimation.length > 0 &&
                    boneDefinition.rotation.valuesPerAnimation[animation].length > 0) {

                    var quaternionVec4 = boneDefinition.rotation.valuesPerAnimation[animation][0];
                    if (quaternionVec4) {
                        var orientMatrix = mat4.create();
                        mat4.fromQuat(orientMatrix,
                            [
                                convertInt16ToFloat(quaternionVec4[0]),
                                convertInt16ToFloat(quaternionVec4[1]),
                                convertInt16ToFloat(quaternionVec4[2]),
                                convertInt16ToFloat(quaternionVec4[3])]
                        );
                        mat4.multiply(tranformMat, tranformMat, orientMatrix);
                        this.isAnimated = true;
                    }
                }

                if (boneDefinition.scale.valuesPerAnimation.length > 0 &&
                    boneDefinition.scale.valuesPerAnimation[animation].length > 0) {

                    var scaleVec3 = boneDefinition.scale.valuesPerAnimation[animation][0];
                    mat4.scale(tranformMat, tranformMat, [
                            scaleVec3.x,
                            scaleVec3.y,
                            scaleVec3.z
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
                //this.m2Geom.setupUniforms(placementMatrix);
                this.m2Geom.setupPlacementAttribute(placementVBO);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (subMeshData.isTransparent) continue;

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, instanceCount)
                }
            },
            drawInstancedTransparentMeshes : function (instanceCount, placementVBO, color) {
                if (!this.m2Geom) return;

                this.m2Geom.setupAttributes(this.skinGeom);
                //this.m2Geom.setupUniforms(placementMatrix);
                this.m2Geom.setupPlacementAttribute(placementVBO);

                var colorVector = [color&0xff, (color>> 8)&0xff,
                    (color>>16)&0xff, (color>> 24)&0xff];
                colorVector[0] /= 255.0; colorVector[1] /= 255.0;
                colorVector[2] /= 255.0; colorVector[3] /= 255.0;

                for (var i = 0; i < this.submeshArray.length; i++) {
                    var subMeshData = this.submeshArray[i];
                    if (!subMeshData.isTransparent) continue;

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies, instanceCount)
                }
            },
            drawNonTransparentMeshes : function (placementMatrix, color) {
                if (!this.m2Geom) return;

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

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies)
                }
            },
            drawTransparentMeshes : function (placementMatrix, color) {
                if (!this.m2Geom) return;

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

                    this.m2Geom.drawMesh(i, subMeshData, this.skinGeom, this.subMeshColors, colorVector, this.transperencies)
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