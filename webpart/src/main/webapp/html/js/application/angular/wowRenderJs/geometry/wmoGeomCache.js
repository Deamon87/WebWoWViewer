/* WMO Geometry Cache */
/* global alert: false */
'use strict';

/* App Module */
(function (window, $, undefined) {

    function WmoGeom(glContext) {
        this.gl = glContext;


        this.combinedVBO = null;
        this.indexVBO = null;

        this.assign = function(wmoGroupObject){
            this.wmoGroupFile = wmoGroupObject;
        };


        this.provideTextureCache = function(textureCache){
            this.textureCache = textureCache;
        };

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
            this.textureCache.loadTexture(filename).then(function success(textObject){
                self.textureArray[index] = textObject;
            }, function error(){
            });
        };

        this.createVBO = function(){
            var gl = this.gl;
            var wmoGroupObject = this.wmoGroupFile;

            var appendBuffer = function(buffer1, buffer2, buffer3, buffer4) {
                var combinedBufferLen = buffer1.length + buffer2.length + buffer3.length ;
                if (buffer4) {
                    combinedBufferLen += buffer4.length;
                }

                var tmp = new Float32Array(combinedBufferLen);
                tmp.set(new Float32Array(buffer1), 0);
                tmp.set(new Float32Array(buffer2), buffer1.length);
                tmp.set(new Float32Array(buffer3), buffer1.length + buffer2.length);

                if (buffer4) {
                    tmp.set(new Float32Array(buffer4), buffer1.length + buffer2.length + buffer3.length);
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
            var wmoGroupObject = this.wmoGroupFile;

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.combinedVBO);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);
            if (wmoGroupObject.colorVerticles) {
                gl.enableVertexAttribArray(3);
            } else {
                gl.disableVertexAttribArray(3);
            }
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); // position
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, this.normalOffset*4); // normal
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, this.textOffset*4); // texcoord
            if (wmoGroupObject.colorVerticles) {
                gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, this.colorOffset * 4); // color
            }

            gl.activeTexture(gl.TEXTURE0);
            for (var j = 0; j < wmoGroupObject.renderBatches.length; j++) {
                var renderBatch = wmoGroupObject.renderBatches[j];

                var texIndex = renderBatch.tex;

                if (this.momt[texIndex].flags1 & 0x4 > 0) {
                    gl.enable(gl.CULL_FACE);
                } else {
                    gl.disable(gl.CULL_FACE);
                }
                var textureObject = this.textureArray[j];

                if (textureObject) {
                    gl.bindTexture(gl.TEXTURE_2D, textureObject.texture);
                    gl.drawElements(gl.TRIANGLES, renderBatch.count, gl.UNSIGNED_SHORT, renderBatch.startIndex * 2);
                } else {
                    //$log.log("textureObject num ", texIndex, " was not loaded")
                }
            }
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

        function WmoGeomCache() {
            var self = this;

            var cache = cacheTemplate(function loadGroupWmo(fileName){
                /* Must return promise */
                return wmoGroupLoader(fileName, true);
            }, function process(wmoGroupFile) {

                var wmoGeomObj = new WmoGeom(self.gl);
                wmoGeomObj.assign(wmoGroupFile);
                wmoGeomObj.createVBO();
                return wmoGeomObj;
            });

            self.initGlContext = function (glContext) {
                this.gl = glContext;
            };

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

