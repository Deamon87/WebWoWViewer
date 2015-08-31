/* adt Geometry Cache */
'use strict';
var adtGeomCache = angular.module('js.wow.render.geometry.adtGeomCache', ['main.services.map.adtLoader', 'js.wow.render.cacheTemplate']);
adtGeomCache.factory("adtGeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){
    function ADTGeom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.textureArray = [];
    }
    ADTGeom.prototype = {
        assign: function (adtFile) {
            this.adtFile = adtFile;
        },
        loadTextures : function(){
            var textureDefinition = this.adtFile.textureDefinition;

            for (var i = 0; i < textureDefinition.length ; i++){
                this.loadTexture(i, textureDefinition[i].textureName);
            }
        },
        loadTexture : function(index, filename){
            var self = this;
            this.sceneApi.loadTexture(filename).then(function success(textObject){
                self.textureArray[index] = textObject;
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