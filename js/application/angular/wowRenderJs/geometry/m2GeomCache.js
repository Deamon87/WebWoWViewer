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
        setupAttributes : function(gl, skinObject){
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinObject.indexVBO);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexVBO);
            gl.enableVertexAttribArray(shaderAttributes.aPosition);
            //gl.enableVertexAttribArray(shaderAttributes.aNormal);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
            gl.disableVertexAttribArray(shaderAttributes.aColor);

            //gl.vertexAttrib4f(shaderAttributes.aColor, 0.5, 0.5, 0.5, 0.5);

            /*
             {name: "pos",           type : "vector3f"},           0+12 = 12
             {name: "bonesWeight",   type : "uint8Array", len: 4}, 12+4 = 16
             {name: "bones",         type : "uint8Array", len: 4}, 16+4 = 20
             {name: "normal",        type : "vector3f"},           20+12 = 32
             {name: "textureX",      type : "float32"},            32+4 = 36
             {name: "textureY",      type : "float32"},            36+4 = 40
             {name : "unk1",         type : "int32"},              40+4 = 44
             {name : "unk2",         type : "int32"}               44+4 = 48
             */

            gl.vertexAttribPointer(shaderAttributes.aPosition, 3, gl.FLOAT, false, 48, 0);  // position
            //gl.vertexAttribPointer(shaderAttributes.aNormal, 3, gl.FLOAT, false, 48, 20); // normal
            gl.vertexAttribPointer(shaderAttributes.aTexCoord, 2, gl.FLOAT, false, 48, 32); // texcoord
        },
        draw : function (skinObject, submeshArray, placementMatrix, colorVector, subMeshColors, vao, vaoExt) {
            var gl = this.gl;
            var m2Object = this.m2File;
            var uniforms = this.sceneApi.shaders.getShaderUniforms();
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);
            //gl.uniform4f(uniforms.uGlobalLighting, colorVector[0], colorVector[1],colorVector[2],colorVector[3]);

            //if (!vao) {
                this.setupAttributes(gl, skinObject);
            //} else {
            //    vaoExt.bindVertexArrayOES(vao);
            //}

            if (submeshArray) {
                for (var i = 0; i < submeshArray.length; i++) {
                    if (submeshArray[i].isRendered) {
                        if (submeshArray[i].texUnit1Texture) {
                            //try {
                                var colorIndex = skinObject.skinFile.header.texs[submeshArray[i].texUnit1TexIndex].colorIndex;
                                if ((colorIndex > 0) && (subMeshColors)) {
                                    var submeshColor = subMeshColors[colorIndex];

                                    gl.vertexAttrib4f(shaderAttributes.aColor,
                                        submeshColor[0],
                                        submeshColor[1],
                                        submeshColor[2],
                                        submeshColor[3])

                                } else {
                                    gl.vertexAttrib4f(shaderAttributes.aColor,
                                        colorVector[0],
                                        colorVector[1],
                                        colorVector[2],
                                        colorVector[3]);

                                }

                                var renderFlagIndex = skinObject.skinFile.header.texs[submeshArray[i].texUnit1TexIndex].renderFlagIndex;
                                switch (m2Object.renderFlags[renderFlagIndex].blend) {
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
                                        gl.uniform1f(uniforms.uAlphaTest, -1);
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
                            gl.bindTexture(gl.TEXTURE_2D, submeshArray[i].texUnit1Texture.texture);
                            gl.drawElements(gl.TRIANGLES, skinObject.skinFile.header.subMeshes[i].idxCount, gl.UNSIGNED_SHORT, skinObject.skinFile.header.subMeshes[i].idxStart * 2);
                        }
                    }
                }
            }
            gl.uniform1f(uniforms.uAlphaTest, -1);
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
