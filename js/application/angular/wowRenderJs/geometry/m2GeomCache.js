/* M2 Geometry Cache */
/* global alert: false */
'use strict';
var m2GeomCache = angular.module('js.wow.render.geometry.m2GeomCache', ['main.services.map.mdxLoader', 'js.wow.render.cacheTemplate']);
m2GeomCache.factory("m2GeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){


    function M2Geom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();
    }
    M2Geom.prototype = {
        sceneApi : null,
        gl : null,
        combinedVBO : null,
        textureArray : [],

        assign: function (m2File) {
            this.m2File = m2File;
        },
        loadTextures : function(){
             var textureDefinition = this.m2File.textureDefinition;

             for (var i = 0; i < textureDefinition.length ; i++){
                this.loadTexture(i, textureDefinition[i].textureName);
             }
        },
        loadTexture : function(index, filename){
            var self = this;
            this.sceneApi.resources.loadTexture(filename).then(function success(textObject){
                self.textureArray[index] = textObject;
            }, function error(){
            });
        },
        createVBO : function(){
            var gl = this.gl;
            var m2Object = this.m2File;

            this.vertexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
            gl.bufferData( gl.ARRAY_BUFFER, m2Object.vertexes, gl.STATIC_DRAW );

            /* Index is taken from skin object */
        },
        setupPlacementAttribute : function (placementVBO) {
            var gl = this.gl;
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.bindBuffer(gl.ARRAY_BUFFER, placementVBO);

            //"Official" way to pass mat4 to shader as attribute
            gl.vertexAttribPointer(shaderAttributes.uPlacementMat+0, 4, gl.FLOAT, false, 16*4, 0);  // position
            gl.vertexAttribPointer(shaderAttributes.uPlacementMat+1, 4, gl.FLOAT, false, 16*4, 16);  // position
            gl.vertexAttribPointer(shaderAttributes.uPlacementMat+2, 4, gl.FLOAT, false, 16*4, 32);  // position
            gl.vertexAttribPointer(shaderAttributes.uPlacementMat+3, 4, gl.FLOAT, false, 16*4, 48);  // position
        },
        setupAttributes : function(skinObject){
            var gl = this.gl;
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinObject.indexVBO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexVBO);
            //gl.vertexAttrib4f(shaderAttributes.aColor, 0.5, 0.5, 0.5, 0.5);

            /*
             {name: "pos",           type : "vector3f"},           0+12 = 12
             {name: "bonesWeight",   type : "uint8Array", len: 4}, 12+4 = 16
             {name: "bones",         type : "uint8Array", len: 4}, 16+4 = 20
             {name: "normal",        type : "vector3f"},           20+12 = 32
             {name: "textureX",      type : "float32"},            32+4 = 36
             {name: "textureY",      type : "float32"},            36+4 = 40
             {name : "textureX2",    type : "float32"},            40+4 = 44
             {name : "textureY2",    type : "float32"}             44+4 = 48
             */

            gl.vertexAttribPointer(shaderAttributes.aPosition,   3, gl.FLOAT, false, 48, 0);  // position
            gl.vertexAttribPointer(shaderAttributes.boneWeights, 4, gl.UNSIGNED_BYTE, true, 48, 12);  // bonesWeight
            gl.vertexAttribPointer(shaderAttributes.bones,       4, gl.UNSIGNED_BYTE, false, 48, 16);  // bones
            if (shaderAttributes.aNormal) {
                gl.vertexAttribPointer(shaderAttributes.aNormal, 3, gl.FLOAT, false, 48, 20); // normal
            }
            gl.vertexAttribPointer(shaderAttributes.aTexCoord, 2, gl.FLOAT, false, 48, 32); // texcoord
            gl.vertexAttribPointer(shaderAttributes.aTexCoord2, 2, gl.FLOAT, false, 48, 40); // texcoord
        },
        setupUniforms : function (placementMatrix, boneMatrix) {
            var gl = this.gl;
            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            if (placementMatrix) {
                gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);
            }

            if (boneMatrix) {
                gl.uniformMatrix4fv(uniforms.uBoneMatrixes, false, boneMatrix);
            }
        },
        draw : function (skinObject, submeshArray, placementMatrix, colorVector, subMeshColors, transperencies, vao, vaoExt) {
            var gl = this.gl;
            var m2Object = this.m2File;
            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            this.setupUniforms(placementMatrix);

            //gl.uniform4f(uniforms.uGlobalLighting, colorVector[0], colorVector[1],colorVector[2],colorVector[3]);

            //if (!vao) {
                this.setupAttributes(skinObject);
            //} else {
            //    vaoExt.bindVertexArrayOES(vao);
            //}

            if (submeshArray) {
                for (var i = 0; i < submeshArray.length; i++) {
                    this.drawMesh(i, submeshArray[i], skinObject, subMeshColors, transperencies)
                }
            }
            gl.uniform1f(uniforms.uAlphaTest, -1);
        },
        drawMesh : function (meshIndex, subMeshData, skinObject, subMeshColors,  colorVector, transperencies, textureMatrix1, textureMatrix2, instanceCount){
            var gl = this.gl;
            var m2File = this.m2File;
            var instExt = this.sceneApi.extensions.getInstancingExt();
            var blackPixelText = this.sceneApi.getBlackPixelTexture();
            var skinData = skinObject.skinFile.header;

            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.uniformMatrix4fv(uniforms.uTextMat1, false, textureMatrix1);
            gl.uniformMatrix4fv(uniforms.uTextMat2, false, textureMatrix2);

            if (subMeshData.isRendered) {
                if (subMeshData.texUnit1Texture) {
                    //try {
                    var colorIndex = skinData.texs[subMeshData.texUnit1TexIndex].colorIndex;
                    var submeshColor = [colorVector[0], colorVector[1], colorVector[2], colorVector[3]];
                    if ((colorIndex >= 0) && (subMeshColors)) {
                        var color = subMeshColors[colorIndex];
                        submeshColor = [
                            submeshColor[0] * color[0],
                            submeshColor[1] * color[1],
                            submeshColor[2] * color[2],
                            submeshColor[3] * color[3]
                        ];
                    }
                    var transperency = 1.0;
                    var transpIndex = skinData.texs[subMeshData.texUnit1TexIndex].transpIndex;
                    if ((transpIndex >= 0) && (transperencies)) {
                        transperency = transperencies[transpIndex];
                    }
                    //submeshColor[0] = submeshColor[0] * transperency;
                    //submeshColor[1] = submeshColor[1] * transperency;
                    //submeshColor[2] = submeshColor[2] * transperency;
                    submeshColor[3] = submeshColor[3] * transperency;

                    if (transperency == 0) {
                        return;
                    }

                    gl.vertexAttrib4f(shaderAttributes.aColor,
                        submeshColor[0],
                        submeshColor[1],
                        submeshColor[2],
                        submeshColor[3]);

                    gl.depthMask(true);

                    var renderFlagIndex = skinData.texs[subMeshData.texUnit1TexIndex].renderFlagIndex;
                    var renderFlag = m2File.renderFlags[renderFlagIndex];
                    switch (renderFlag.blend) {
                        case 0 : //BM_OPAQUE
                            gl.disable(gl.BLEND);
                            gl.uniform1f(uniforms.uAlphaTest, -1.0);
                            break;
                        case 1 : //BM_TRANSPARENT
                            gl.disable(gl.BLEND);
                            //gl.uniform1f(uniforms.uAlphaTest, 2.9);
                            gl.uniform1f(uniforms.uAlphaTest, 0.903921569);
                            break;
                        case 2 : //BM_ALPHA_BLEND
                            gl.uniform1f(uniforms.uAlphaTest, -1);
                            gl.enable(gl.BLEND);
                            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // default blend func
                            break;
                        case 3 : //BM_ADDITIVE
                            gl.uniform1f(uniforms.uAlphaTest, -1);
                            gl.enable(gl.BLEND);
                            gl.blendFunc(gl.SRC_COLOR, gl.ONE);
                            break;
                        case 4 : //BM_ADDITIVE_ALPHA
                            gl.uniform1f(uniforms.uAlphaTest, 0.00392157);
                            gl.enable(gl.BLEND);
                            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                            break;
                        default :
                            gl.uniform1f(uniforms.uAlphaTest, -1);
                            gl.enable(gl.BLEND);
                            gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR);

                            break;
                    }
                    //}catch (e) {
                    //    debugger;
                    //}

                    if ((renderFlag.flags & 0x8) > 0) {
                        //gl.uniform1i(uniforms.isBillboard, 1);
                    }

                    if ((renderFlag.flags & 0x4) > 0) {
                        gl.disable(gl.CULL_FACE);
                    } else {
                        gl.enable(gl.CULL_FACE);
                    }

                    if ((renderFlag.flags & 0x10) > 0) {
                        gl.depthMask(false);
                    } else {
                        gl.depthMask(true);
                    }

                    /* Set up texture animation */


                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, subMeshData.texUnit1Texture.texture);
                    if (subMeshData.texUnit2Texture != null) {
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, subMeshData.texUnit2Texture.texture);
                    } else {
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, blackPixelText);
                    }

                    if (instanceCount == undefined) {
                        gl.drawElements(gl.TRIANGLES, skinData.subMeshes[meshIndex].idxCount, gl.UNSIGNED_SHORT, skinData.subMeshes[meshIndex].idxStart * 2);
                    } else {
                        instExt.drawElementsInstancedANGLE(gl.TRIANGLES, skinData.subMeshes[meshIndex].idxCount, gl.UNSIGNED_SHORT, skinData.subMeshes[meshIndex].idxStart * 2, instanceCount);
                    }
                    if (subMeshData.texUnit2Texture != null) {
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                        gl.activeTexture(gl.TEXTURE0);
                    }

                    /*
                    if ((renderFlag.flags & 0x8) > 0) {
                        gl.uniform1i(uniforms.isBillboard, 0);
                    }
                    */

                    gl.depthMask(true)

                }
            }
        }
    };

    function M2GeomCache(sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadGroupWmo(fileName){
            /* Must return promise */
            return mdxLoader(fileName);
        }, function process(m2File) {

            var m2GeomObj = new M2Geom(sceneApi);
            m2GeomObj.assign(m2File);
            m2GeomObj.createVBO();
            m2GeomObj.loadTextures();

            return m2GeomObj;
        });


        self.loadM2 = function (fileName){
            return cache.get(fileName);
        };

        self.unLoadM2 = function (fileName) {
            cache.remove(fileName)
        }
    }

    return M2GeomCache;
}]);
