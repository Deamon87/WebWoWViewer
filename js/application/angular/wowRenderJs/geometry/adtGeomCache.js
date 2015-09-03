/* adt Geometry Cache */
'use strict';
var adtGeomCache = angular.module('js.wow.render.geometry.adtGeomCache', ['main.services.map.adtLoader', 'js.wow.render.cacheTemplate']);
adtGeomCache.factory("adtGeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){
    function ADTGeom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.textureArray = new Array(255);
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
        createVBO : function(){
            var gl = this.gl;
            var m2Object = this.adtFile;

            this.vertexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
            gl.bufferData( gl.ARRAY_BUFFER, m2Object.vertexes, gl.STATIC_DRAW );

            /* Index is taken from skin object */
        }
    };


}]);