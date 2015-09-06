/* adt Geometry Cache */
'use strict';
var adtGeomCache = angular.module('js.wow.render.geometry.adtGeomCache', ['main.services.map.adtLoader', 'js.wow.render.cacheTemplate']);
adtGeomCache.factory("adtGeomCache", ['adtLoader', 'cacheTemplate', '$q', function(adtLoader, cacheTemplate, $q){
    function ADTGeom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.textureArray = new Array(255);
        this.triangleStrip = this.createTriangleStrip;

    }
    ADTGeom.prototype = {
        assign: function (adtFile) {
            this.adtFile = adtFile;
        },
        loadTextures : function(){
            var mcnkObjs = this.adtFile.mcnkObjs;

            for (var i = 0; i < mcnkObjs.length; i++) {
                var mcnkObj = mcnkObjs[i];

                if(mcnkObj.textureLayers && (mcnkObj.textureLayers.length > 0)) {
                    for (var j = 0; j < mcnkObj.textureLayers.length; j++ ) {
                        this.loadTexture(i, j, mcnkObj.textureLayers[i].textureName);
                    }
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
            var stripObjs = [];
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

            return { strips : strips, stripOffsets : stripOffsets};
        },
        createVBO : function(){
            var gl = this.gl;
            var m2Object = this.adtFile;

            this.heightVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
            gl.bufferData( gl.ARRAY_BUFFER, m2Object.vertexes, gl.STATIC_DRAW );

            this.stripVBO = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.stripVBO);
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Float32Array(this.triangleStrip), gl.STATIC_DRAW );
        }
    };


}]);