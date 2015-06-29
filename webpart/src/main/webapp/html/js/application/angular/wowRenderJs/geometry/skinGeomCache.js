/* Skin geometry Cache */
/* global alert: false */
'use strict';

var m2GeomCache = angular.module('js.wow.render.geometry.skinGeomCache', ['main.services.map.skinLoader', 'js.wow.render.cacheTemplate']);
m2GeomCache.factory("skinGeomCache", ['skinLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){

    function SkinGeom(sceneApi){
        this.gl = sceneApi.getGlContext();

        this.indexVBO = null;

        this.assign = function(skinFile){
            this.skinFile = skinFile;
        };

        this.createVBO = function(){
            var gl = this.gl;
            var m2Object = this.m2File;

             this.indexVBO = gl.createBuffer();
             gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indexVBO );
             gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Int16Array(m2Object.indicies), gl.STATIC_DRAW );
        };
    }

    function SkinGeomCache(sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadGroupWmo(fileName){
            /* Must return promise */
            return skinLoader(fileName, true);
        }, function process(skinFile) {

            var skinGeomObj = new SkinGeom(sceneApi);
            skinGeomObj.assign(skinFile);
            skinGeomObj.createVBO();
            return skinGeomObj;
        });

        self.loadSkin = function (fileName){
            return cache.get(fileName);
        };

        self.unLoadSkin = function (fileName) {
            cache.remove(fileName)
        }
    }

    return SkinGeomCache;
}]);