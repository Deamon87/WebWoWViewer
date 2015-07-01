/* M2 Geometry Cache */
/* global alert: false */
'use strict';
var m2GeomCache = angular.module('js.wow.render.geometry.m2GeomCache', ['main.services.map.mdxLoader', 'js.wow.render.cacheTemplate']);
m2GeomCache.factory("m2GeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){


    function M2Geom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.indexVBO = null;
        this.textureArray = [];
    }
    M2Geom.prototype = {
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
            this.sceneApi.loadTexture(filename).then(function success(textObject){
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
