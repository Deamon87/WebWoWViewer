/* M2 Geometry Cache */
/* global alert: false */
'use strict';
var m2GeomCache = angular.module('js.wow.render.geometry.m2GeomCache', ['main.services.map.mdxLoader', 'js.wow.render.cacheTemplate']);
m2GeomCache.factory("m2GeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){


    function M2Geom(sceneApi){
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.indexVBO = null;

        this.assign = function(m2File){
            this.m2File = m2File;
        };


        this.provideTextureCache = function(textureCache){
            this.textureCache = textureCache;
        };

        this.textureArray = [];
        this.loadTextures = function(tSkinFile){
            /*
            this.momt = momt;

            this.textureArray.length = this.wmoGroupFile.renderBatches.length;

            for (var i = 0; i < this.wmoGroupFile.renderBatches.length ; i++){
                var textIndex = this.wmoGroupFile.renderBatches[i].tex;
                this.loadTexture(i, momt[textIndex].textureName1);
            }
            */
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
            var m2Object = this.m2File;

            this.vertexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
            gl.bufferData( gl.ARRAY_BUFFER, m2Object.modelVertex, gl.STATIC_DRAW );

            /* Index is taken from skin object */
            /*
            this.indexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO );
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array(m2Object.indicies), gl.STATIC_DRAW );
            */
        };
    }

    function M2GeomCache(sceneApi) {
        var cache = cacheTemplate(function loadGroupWmo(fileName){
            /* Must return promise */
            return mdxLoader(fileName);
        }, function process(m2File) {

            var m2GeomObj = new M2Geom(sceneApi);
            m2GeomObj.assign(m2File);
            m2GeomObj.createVBO();
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
