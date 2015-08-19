/* WMO Geometry Cache */
/* global alert: false */
'use strict';

/* App Module */
(function (window, $, undefined) {

    function WmoGeom(wmoGroupFile, sceneApi) {
        this.gl = sceneApi.getGlContext();
        this.sceneApi = sceneApi;

        this.combinedVBO = null;
        this.indexVBO = null;
        this.wmoGroupFile = wmoGroupFile;

        this.textureArray = [];
        this.loadTextures = function(momt){
            this.momt = momt;
            this.textureArray.length = this.wmoGroupFile.renderBatches.length;

            for (var i = 0; i < this.wmoGroupFile.renderBatches.length ; i++){
                var textIndex = this.wmoGroupFile.renderBatches[i].tex;
                this.loadTexture(i, momt[textIndex].textureName1);
            }
        };
        this.loadTexture = function(index, filename){
            var self = this;

            sceneApi.loadTexture(filename).then(function success(textObject){
                self.textureArray[index] = textObject;
            }, function error(){
            });
        };

        this.createVBO = function(){
            var gl = this.gl;
            var wmoGroupObject = this.wmoGroupFile;

            var appendBuffer = function(buffer1, buffer2, buffer3, buffer4) {
                var combinedBufferLen = buffer1.length*4 + buffer2.length*4 + buffer3.length*4 ;
                if (buffer4) {
                    combinedBufferLen += buffer4.length;
                }

                var tmp = new Uint8Array(combinedBufferLen);
                tmp.set(new Uint8Array(new Float32Array(buffer1).buffer), 0);
                tmp.set(new Uint8Array(new Float32Array(buffer2).buffer), buffer1.length*4);
                tmp.set(new Uint8Array(new Float32Array(buffer3).buffer), (buffer1.length + buffer2.length)*4);

                if (buffer4) {
                    tmp.set(new Uint8Array(buffer4.buffer), (buffer1.length + buffer2.length + buffer3.length)*4);
                }
                return tmp;
            };

            var combinedArray =
                appendBuffer(
                    wmoGroupObject.verticles,
                    wmoGroupObject.normals,
                    wmoGroupObject.textCoords,
                    wmoGroupObject.colorVerticles
                );

            this.combinedVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.combinedVBO);
            gl.bufferData( gl.ARRAY_BUFFER, combinedArray, gl.STATIC_DRAW );

            this.positionOffset = 0;
            this.normalOffset = wmoGroupObject.verticles.length;
            this.textOffset = wmoGroupObject.verticles.length + wmoGroupObject.normals.length;
            this.colorOffset = wmoGroupObject.verticles.length + wmoGroupObject.normals.length + wmoGroupObject.textCoords.length;

            this.indexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO );
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array(wmoGroupObject.indicies), gl.STATIC_DRAW );
        };

        this.draw = function(){
            var gl = this.gl;
            var shaderUniforms = this.sceneApi.getShaderUniforms();
            var shaderAttributes = this.sceneApi.getShaderAttributes();
            var wmoGroupObject = this.wmoGroupFile;
            var isIndoor = (wmoGroupObject.mogp.Flags & 0x2000) > 0;

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.combinedVBO);
            gl.enableVertexAttribArray(shaderAttributes.aPosition);
            //gl.enableVertexAttribArray(shaderAttributes.aNormal);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord);


            gl.vertexAttribPointer(shaderAttributes.aPosition, 3, gl.FLOAT, false, 0, 0); // position
            //gl.vertexAttribPointer(shaderAttributes.aNormal, 3, gl.FLOAT, false, 0, this.normalOffset*4); // normal
            gl.vertexAttribPointer(shaderAttributes.aTexCoord, 2, gl.FLOAT, false, 0, this.textOffset*4); // texcoord

            if (isIndoor && (wmoGroupObject.colorVerticles) &&(wmoGroupObject.colorVerticles.length > 0)) {
                gl.enableVertexAttribArray(shaderAttributes.aColor);
                gl.vertexAttribPointer(shaderAttributes.aColor, 4, gl.UNSIGNED_BYTE, true, 0, this.colorOffset * 4); // color
            } else {
                gl.disableVertexAttribArray(shaderAttributes.aColor);
                gl.vertexAttrib4f(shaderAttributes.aColor, 1.0, 1.0, 1.0, 1.0);
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1f(shaderUniforms.uAlphaTest, -1.0);
            for (var j = 0; j < wmoGroupObject.renderBatches.length; j++) {
                var renderBatch = wmoGroupObject.renderBatches[j];

                var texIndex = renderBatch.tex;

                if (this.momt[texIndex].blendMode != 0) {
                    if ((this.momt[texIndex].flags1 & 0x80) > 0) {

                        gl.uniform1f(shaderUniforms.uAlphaTest, 0.3);
                        //glAlphaFunc(GL_GREATER, 0.3);
                    }
                    if ((this.momt[texIndex].flags1 & 0x01) > 0) {
                        gl.uniform1f(shaderUniforms.uAlphaTest, 0.1);
                        //glAlphaFunc(GL_GREATER, 0.1);
                    }
                } else {
                    gl.uniform1f(shaderUniforms.uAlphaTest, -1.0);
                }

                if ((this.momt[texIndex].flags1 & 0x4) > 0) {
                    gl.disable(gl.CULL_FACE);
                } else {
                    gl.enable(gl.CULL_FACE);
                }
                var textureObject = this.textureArray[j];

                if (textureObject) {
                    gl.bindTexture(gl.TEXTURE_2D, textureObject.texture);
                    gl.drawElements(gl.TRIANGLES, renderBatch.count, gl.UNSIGNED_SHORT, renderBatch.startIndex * 2);

                    var lastError = gl.getError()
                    if (lastError!=0) {
                        debugger;
                    }
                } else {
                  //$log.log("textureObject num ", texIndex, " was not loaded")
                }
            }
            gl.uniform1f(shaderUniforms.uAlphaTest, -1.0);
        };

        this.destroy = function() {
            var gl = this.gl;
            if (this.texture) {
                gl.deleteTexture(this.texture);
            }

            this.texture = null;
        }
    }

    var wmoGeomCache = angular.module('js.wow.render.geometry.wmoGeomCache', ['main.services.map.wmoLoader', 'js.wow.render.cacheTemplate']);
    wmoGeomCache.factory("wmoGeomCache", ['wmoGroupLoader', 'cacheTemplate', '$q', function(wmoGroupLoader, cacheTemplate, $q){

        function WmoGeomCache(sceneApi) {
            var self = this;

            var cache = cacheTemplate(function loadGroupWmo(fileName){
                /* Must return promise */
                return wmoGroupLoader(fileName, true);
            }, function process(wmoGroupFile) {

                var wmoGeomObj = new WmoGeom(wmoGroupFile, sceneApi);
                wmoGeomObj.createVBO();
                return wmoGeomObj;
            });

            self.loadWmoGeom = function (fileName){
                return cache.get(fileName);
            };

            self.unLoadWmoGeom = function (fileName) {
                cache.remove(fileName)
            }
        }

        return WmoGeomCache;
    }]);

})(window, jQuery);

