import cacheTemplate from './../cache.js';
import mdxLoader from './../../services/map/mdxLoader.js';


class M2Geom {
    constructor(sceneApi) {
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();
        this.combinedVBO = null;
        this.vao = null;
        this.textureArray = []
    }

    assign(m2File) {
        this.m2File = m2File;
    }

    loadTextures() {
        var textureDefinition = this.m2File.textureDefinition;

        for (var i = 0; i < textureDefinition.length; i++) {
            this.loadTexture(i, textureDefinition[i].textureName);
        }
    }

    loadTexture(index, filename) {
        var self = this;
        this.sceneApi.resources.loadTexture(filename).then(function success(textObject) {
            self.textureArray[index] = textObject;
        }, function error() {
        });
    }

    createVBO() {
        var gl = this.gl;
        var m2File = this.m2File;

        this.vertexVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexVBO);
        gl.bufferData(gl.ARRAY_BUFFER, m2File.vertexes, gl.STATIC_DRAW);

        /* Index is taken from skin object */
    }

    createVAO(skinObject){
        var gl = this.gl;
        var vao_ext = this.sceneApi.extensions.getVaoExt();

        if (vao_ext) {
            var vao = vao_ext.createVertexArrayOES();
            vao_ext.bindVertexArrayOES(vao);

            this.sceneApi.shaders.activateM2Shader();
            this.sceneApi.shaders.activateM2ShaderAttribs();
            this.setupAttributes(skinObject);
            vao_ext.bindVertexArrayOES(null);
            this.sceneApi.shaders.deactivateM2Shader();

            this.vao = vao;
        }
    }

    setupPlacementAttribute(placementVBO) {
        var gl = this.gl;
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindBuffer(gl.ARRAY_BUFFER, placementVBO);

        //"Official" way to pass mat4 to shader as attribute
        gl.vertexAttribPointer(shaderAttributes.aPlacementMat + 0, 4, gl.FLOAT, false, 16 * 5, 0);  // position
        gl.vertexAttribPointer(shaderAttributes.aPlacementMat + 1, 4, gl.FLOAT, false, 16 * 5, 16);  // position
        gl.vertexAttribPointer(shaderAttributes.aPlacementMat + 2, 4, gl.FLOAT, false, 16 * 5, 32);  // position
        gl.vertexAttribPointer(shaderAttributes.aPlacementMat + 3, 4, gl.FLOAT, false, 16 * 5, 48);  // position
        gl.vertexAttribPointer(shaderAttributes.aDiffuseColor, 4, gl.FLOAT, false, 16 * 5, 64); //Diffuse color

    }


    setupAttributes(skinObject) {
        var gl = this.gl;
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexVBO);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinObject.indexVBO);
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

        gl.vertexAttribPointer(shaderAttributes.aPosition, 3, gl.FLOAT, false, 48, 0);  // position
        gl.vertexAttribPointer(shaderAttributes.boneWeights, 4, gl.UNSIGNED_BYTE, true, 48, 12);  // bonesWeight
        gl.vertexAttribPointer(shaderAttributes.bones, 4, gl.UNSIGNED_BYTE, false, 48, 16);  // bones
        if (shaderAttributes.aNormal) {
            gl.vertexAttribPointer(shaderAttributes.aNormal, 3, gl.FLOAT, false, 48, 20); // normal
        }
        gl.vertexAttribPointer(shaderAttributes.aTexCoord, 2, gl.FLOAT, false, 48, 32); // texcoord
        gl.vertexAttribPointer(shaderAttributes.aTexCoord2, 2, gl.FLOAT, false, 48, 40); // texcoord
    }


    setupUniforms(placementMatrix, boneMatrix, diffuseColor, drawTransparent, lights) {
        var gl = this.gl;
        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var m2File = this.m2File;
        if (placementMatrix) {
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);
        }

        if (boneMatrix) {
            gl.uniformMatrix4fv(uniforms.uBoneMatrixes, false, boneMatrix);
        } else {
            gl.uniformMatrix4fv(uniforms.uBoneMatrixes, false, new Float32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,]));
        }

        //Set proper color
        if (diffuseColor) {
            gl.uniform4fv(uniforms.uDiffuseColor, diffuseColor);
        }
        if (drawTransparent) {
            gl.uniform1i(uniforms.isTransparent, 1);
        } else {
            gl.uniform1i(uniforms.isTransparent, 0);
        }

        //Setup lights

        var activeLights = (lights) ? (lights.length | 0) : 0;
        /*
        for (var i = 0; i < lights.length; i++) {
            if (lights[i].attenuation_end - lights[i].attenuation_start > 0.01) {
                activeLights++;
            }
        }*/
        gl.uniform1i(uniforms.uLightCount, activeLights);
        var index = 0;
        for (var i = 0; i < lights.length; i++) {
            //if (lights[i].attenuation_end - lights[i].attenuation_start <= 0.01) continue;
            gl.uniform4fv(uniforms["pc_lights["+index+"].color"], new Float32Array(lights[i].diffuse_color));
            gl.uniform4fv(uniforms["pc_lights["+index+"].attenuation"], new Float32Array([lights[i].attenuation_start, lights[i].diffuse_intensity, lights[i].attenuation_end, activeLights]));
            gl.uniform4fv(uniforms["pc_lights["+index+"].position"], new Float32Array(lights[i].position));
            index++;
        }
        for (var i = index; i < 3; i++) {
            gl.uniform4fv(uniforms["pc_lights["+index+"].color"], new Float32Array([0,0,0,0]));
            gl.uniform4fv(uniforms["pc_lights["+index+"].attenuation"], new Float32Array([0,0,0,0]));
            gl.uniform4fv(uniforms["pc_lights["+index+"].position"], new Float32Array([0,0,0,0]));
            index++;
        }

        var diffuseFound = false;
        for (var i = 0; i < lights.length; i++) {
            if (lights[i].ambient_color) {
                if (lights[i].ambient_color[0] != 0 && lights[i].ambient_color[1] != 0 && lights[i].ambient_color[2] != 0) {
                    gl.uniform4fv(uniforms.uPcColor, new Float32Array(lights[i].ambient_color));
                    diffuseFound = true;
                    break;
                }
            }
        }

        if (!diffuseFound) {
            gl.uniform4fv(uniforms.uPcColor, new Float32Array([1.0, 1.0, 1.0, 1.0]));
        }
    }

    bindVao() {
        var vaoExt = this.sceneApi.extensions.getVaoExt();
        if (this.vao && vaoExt) {
            vaoExt.bindVertexArrayOES(this.vao);
            return true
        }
        return false
    }
    unbindVao() {
        var vaoExt = this.sceneApi.extensions.getVaoExt();
        if (this.vao && vaoExt) {
            vaoExt.bindVertexArrayOES(null);
        }
    }

   drawMesh(materialData, skinObject, meshColor, transparency, textureMatrix1, textureMatrix2, pixelShaderIndex, originalFogColor, instanceCount) {
        var gl = this.gl;
        var m2File = this.m2File;
        var instExt = this.sceneApi.extensions.getInstancingExt();
        var blackPixelText = this.sceneApi.getBlackPixelTexture();
        var skinData = skinObject.skinFile.header;

        var uniforms = this.sceneApi.shaders.getShaderUniforms();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();
        var fogChanged = false;

        gl.uniformMatrix4fv(uniforms.uTextMat1, false, new Float32Array(textureMatrix1));
        gl.uniformMatrix4fv(uniforms.uTextMat2, false, new Float32Array(textureMatrix2));
        gl.uniform4fv(uniforms.uColor, meshColor);
        gl.uniform1f(uniforms.uTransparency, transparency);
        gl.uniform1i(uniforms.uPixelShader, pixelShaderIndex);


        if (materialData.isRendered) {
            if (materialData.texUnit1Texture) {
                //try {
                gl.depthMask(true);


                var textMaterial = skinData.texs[materialData.texUnit1TexIndex];
                var renderFlagIndex = textMaterial.renderFlagIndex;
                var renderFlag = m2File.renderFlags[renderFlagIndex];

                gl.uniform1i(uniforms.uBlendMode, renderFlag.blend);
                switch (renderFlag.blend) {
                    case 0 : //Blend_Opaque
                        gl.disable(gl.BLEND);
                        gl.uniform1f(uniforms.uAlphaTest, -1.0);
                        break;
                    case 1 : //Blend_AlphaKey
                        gl.disable(gl.BLEND);
                        //gl.uniform1f(uniforms.uAlphaTest, 2.9);
                        gl.uniform1f(uniforms.uAlphaTest, 0.903921569);
                        //gl.uniform1f(uniforms.uAlphaTest, meshColor[4]*transparency*(252/255));
                        break;
                    case 2 : //Blend_Alpha
                        gl.uniform1f(uniforms.uAlphaTest, -1);
                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // default blend func
                        break;
                    case 3 : //Blend_NoAlphaAdd
                        gl.uniform1f(uniforms.uAlphaTest, -1);
                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.ONE, gl.ONE);

                        //Override fog
                        gl.uniform3fv(uniforms.uFogColor, new Float32Array([0,0,0]));
                        fogChanged = true;

                        break;
                    case 4 : //Blend_Add
                        gl.uniform1f(uniforms.uAlphaTest, 0.00392157);
                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

                        gl.uniform3fv(uniforms.uFogColor, new Float32Array([0,0,0]));
                        fogChanged = true;
                        break;

                    case 5: //Blend_Mod
                        gl.uniform1f(uniforms.uAlphaTest, 0.00392157);
                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.DST_COLOR, gl.ZERO);

                        gl.uniform3fv(uniforms.uFogColor, new Float32Array([1.0,1.0,1.0]));
                        fogChanged = true;
                        break;

                    case 6: //Blend_Mod2x
                        gl.uniform1f(uniforms.uAlphaTest, 0.00392157);
                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR);

                        gl.uniform3fv(uniforms.uFogColor, new Float32Array([0.5,0.5,0.5]));
                        fogChanged = true;
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



                if ((renderFlag.flags & 0x1 > 0)|| (renderFlag.blend == 5) || (renderFlag.blend == 6)) {
                    gl.uniform1i(uniforms.uUseDiffuseColor, 0)
                } else {
                    gl.uniform1i(uniforms.uUseDiffuseColor, 1)
                }
                if ((renderFlag.flags & 0x2) > 0 ) {
                    gl.uniform1i(uniforms.uUnFogged, 1)
                } else {
                    gl.uniform1i(uniforms.uUnFogged, 0)
                }

                if ((renderFlag.flags & 0x4) > 0) {
                    gl.disable(gl.CULL_FACE);
                } else {
                    gl.enable(gl.CULL_FACE);
                }

                if ((renderFlag.flags & 0x8) > 0) {
                    //gl.uniform1i(uniforms.isBillboard, 1);
                }


                if ((renderFlag.flags & 0x10) > 0) {
                    //gl.disable(gl.DEPTH_TEST);
                    gl.depthMask(false);
                } else {
                    // gl.enable(gl.DEPTH_TEST);
                    gl.depthMask(true);
                }

                if (materialData.isEnviromentMapping) {
                    gl.uniform1i(uniforms.isEnviroment, 1);
                } else {
                    gl.uniform1i(uniforms.isEnviroment, 0);
                }

                /* Set up texture animation */
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, materialData.texUnit1Texture.texture);
                if (materialData.xWrapTex1) {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                }
                if (materialData.yWrapTex1) {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                if (materialData.texUnit2Texture != null) {
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, materialData.texUnit2Texture.texture);

                    if (materialData.xWrapTex2) {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    } else {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    }
                    if (materialData.yWrapTex2) {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                    } else {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    }
                } else {
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, blackPixelText);
                }

                var meshIndex = materialData.meshIndex;
                if (instanceCount == -1) {
                    //var error = gl.getError(); // Drop error flag
                    gl.drawElements(gl.TRIANGLES, skinData.subMeshes[meshIndex].nTriangles, gl.UNSIGNED_SHORT, skinData.subMeshes[meshIndex].StartTriangle * 2);
                } else {
                    instExt.drawElementsInstancedANGLE(gl.TRIANGLES, skinData.subMeshes[meshIndex].nTriangles, gl.UNSIGNED_SHORT, skinData.subMeshes[meshIndex].StartTriangle * 2, instanceCount);
                }
                if (materialData.texUnit2Texture != null) {
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.activeTexture(gl.TEXTURE0);
                }

                /*
                 if ((renderFlag.flags & 0x8) > 0) {
                 gl.uniform1i(uniforms.isBillboard, 0);
                 }
                 */

                gl.depthMask(true);
                gl.disable(gl.BLEND);

                if (fogChanged && originalFogColor) {
                    gl.uniform3fv(uniforms.uFogColor, originalFogColor);
                }
            }
        }
    }
}

class M2GeomCache {
    constructor(sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadGroupWmo(fileName) {
            /* Must return promise */
            return mdxLoader(fileName);
        }, function process(m2File) {

            var m2GeomObj = new M2Geom(sceneApi);
            m2GeomObj.assign(m2File);
            m2GeomObj.createVBO();
            m2GeomObj.loadTextures();

            return m2GeomObj;
        });


        self.loadM2 = function (fileName) {
            return cache.get(fileName);
        };

        self.unLoadM2 = function (fileName) {
            cache.remove(fileName)
        }
    }
}

export default M2GeomCache;
