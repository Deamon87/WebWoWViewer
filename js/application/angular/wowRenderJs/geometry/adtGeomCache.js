/* adt Geometry Cache */
'use strict';
var adtGeomCache = angular.module('js.wow.render.geometry.adtGeomCache', ['main.services.map.adtLoader', 'js.wow.render.cacheTemplate']);
adtGeomCache.factory("adtGeomCache", ['adtLoader', 'cacheTemplate', '$q', function(adtLoader, cacheTemplate, $q){
    function parseAlphaTextures(adtObj){
        for (var i = 0; i < adtObj.mcnkObjs.length; i++) {
            var mcnkObj = adtObj.mcnkObjs[i];
            var alphaArray = mcnkObj.alphaArray;
            var layers = mcnkObj.textureLayers;

            for (var j = 0; j < layers.length; j++ ) {
                if (layers[i].flag & 0x200 > 0) {
                    //Compressed
                } else {
                    //Uncompressed
                }
            }
        }
    }
    function ADTGeom(sceneApi, wdtFile){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.wdtFile = wdtFile;
        this.combinedVBO = null;
        this.textureArray = new Array(255);
        this.triangleStrip = this.createTriangleStrip;

    }
    ADTGeom.prototype = {
        assign: function (adtFile) {
            this.adtFile = adtFile;
        },
        loadTextures : function(){
            var gl = this.gl;
            var mcnkObjs = this.adtFile.mcnkObjs;

            /* 1. Load rgb textures */
            for (var i = 0; i < mcnkObjs.length; i++) {
                var mcnkObj = mcnkObjs[i];

                if(mcnkObj.textureLayers && (mcnkObj.textureLayers.length > 0)) {
                    for (var j = 0; j < mcnkObj.textureLayers.length; j++ ) {
                        this.loadTexture(i, j, mcnkObj.textureLayers[i].textureName);
                    }
                }
            }

            /* 2. Load alpha textures */
            var chunkCount = mcnkObjs.length;
            var maxAlphaTexPerChunk = 4;
            var alphaTexSize = 64;

            var texWidth = maxAlphaTexPerChunk * alphaTexSize;
            var texHeight = chunkCount * alphaTexSize;
            var alphaTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, alphaTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, texWidth, texHeight, 0, gl.ALPHA, gl.UNSIGNED_BYTE);

            for (var i = 0; i < mcnkObjs.length; i++) {
                var layers = mcnkObjs[i].textureLayers;
                for (var j = 0; j < layers.length; j++) {
                    layers[j]
                }

            }
        },
        loadTexture : function(index, layerInd, filename){
            var self = this;
            this.sceneApi.loadTexture(filename).then(function success(textObject){
                self.textureArray[index][layerInd] = textObject;
            }, function error(){
            });
        },
        createTriangleStrip : function (){
            var mcnkObjs = this.adtFile.mcnkObjs;

            function isHole(hole, i, j) {
                var holetab_h = [0x1111, 0x2222, 0x4444, 0x8888];
                var holetab_v = [0x000F, 0x00F0, 0x0F00, 0xF000];

                return (hole & holetab_h[i] & holetab_v[j]) != 0;
            }
            function indexMapBuf(x, y){
                var result = ((y+1) >> 1)*9 + (y >> 1)*8 + x;
                return result;
            }

            var strips = [];
            var stripOffsets = [];

            for (var i = 0; i < mcnkObjs.length; i++) {
                var mcnkObj = mcnkObjs[i];
                var hole = mcnkObj.holes;
                stripOffsets.push(strips.length);

                var j = 0;
                var first = true;
                for (var x = 0; x < 4; x++) {
                    for (var y = 0; y < 4; y++) {
                        if (!isHole(hole, x, y)) {
                            var _i = x * 2;
                            var _j = y * 4;

                            for (var k = 0; k < 2; k++) {
                                if (!first) {
                                    strips.push(indexMapBuf(_i, _j + k * 2));
                                }

                                first = false;
                                for (var l = 0; l < 3; l++) {

                                    strips.push(indexMapBuf(_i + l, _j + k * 2));
                                    strips.push(indexMapBuf(_i + l, _j + k * 2 + 2));
                                }
                                strips.push(indexMapBuf(_i + 2, _j + k * 2 + 2));
                            }
                        }
                    }
                }
            }
            stripOffsets.push(strips.length);

            return { strips : strips, stripOffsets : stripOffsets};
        },
        createVBO : function(){
            var gl = this.gl;
            var m2Object = this.adtFile;

            /* 1. help index + Heights + texCoords +  */
            var vboArray = [];

            /* 1.1 help index */
            for (var i = 0; i < 9*9+8*8; i++) {
                vboArray.push(i);
            }

            /* 1.2 Heights */
            var mcnkObjs = this.adtFile.mcnkObjs;
            for (var i = 0; i < mcnkObjs.length; i++) {
                for (var j = 0; j < 145; j++) {
                    vboArray.push(mcnkObjs[i].heights[j]);
                }
            }

            /* 1.3 texCoords */
            var coords = this.sceneApi.getAdtTexCoordinates();
            for (var i = 0; i < coords.length; i++) {
                vboArray.push(coords[i]);
            }

            /* 1.4 Make combinedVbo */
            this.combinedVbo = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.combinedVbo);
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vboArray), gl.STATIC_DRAW );

            this.indexOffset = 0;
            this.heightOffset = coords.length;
            this.textOffset = coords.length + mcnkObjs.length*145;

            /* 2. Strips */
            this.stripVBO = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.stripVBO);
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Float32Array(this.triangleStrip.strips), gl.STATIC_DRAW );
        },
        draw : function () {
            var gl = this.gl;
            var stripOffsets = this.triangleStrip.stripOffsets;
            var shaderUniforms = this.sceneApi.getShaderUniforms();
            var shaderAttributes = this.sceneApi.getShaderAttributes();

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexVBO);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.heightVBO);

            gl.enableVertexAttribArray(shaderAttributes.aHeight);
            gl.enableVertexAttribArray(shaderAttributes.aIndex);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord);

            gl.vertexAttribPointer(shaderAttributes.aIndex,  1, gl.FLOAT, false, 0, this.indexOffset);
            gl.vertexAttribPointer(shaderAttributes.aTexCoord, 1, gl.FLOAT, false, 0, this.textOffset);

            //Draw
            var mcnkObjs = this.adtFile.mcnkObjs;
            for (var i = 0; i < mcnkObjs.length; i++) {
                var mcnkObj = mcnkObjs[i];
                gl.vertexAttribPointer(shaderAttributes.aHeight, 1, gl.FLOAT, false, 0, this.heightOffset+i*145);
                gl.uniform3fv(shaderUniforms.aPos, mcnkObj.pos);


                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, textureObject.texture);
                gl.drawElements(gl.TRIANGLE_STRIP, stripOffsets[i+1] , gl.UNSIGNED_SHORT, stripOffsets[i]*2);
            }
        }
    };

    function AdtGeomCache(sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadAdtFile(fileName){
            /* Must return promise */
            return adtLoader(fileName);
        }, function process(m2File) {
            var adtGeomObj = new ADTGeom(sceneApi);
            adtGeomObj.assign(m2File);
            adtGeomObj.createVBO();
            adtGeomObj.loadTextures();

            return adtGeomObj;
        });

        self.loadAdt = function (fileName){
            return cache.get(fileName);
        };

        self.unLoadAdt = function (fileName) {
            cache.remove(fileName)
        }
    }

    return AdtGeomCache;
}]);