/* WMO Geometry Cache */
/* global alert: false */
'use strict';

/* App Module */
(function (window, $, undefined) {

    function WmoGeom(glContext) {
        this.gl = glContext;


        this.verticlesVBO = null;
        this.normalsVBO = null;
        this.textCoordsVBO = null;
        this.colorsVBO = null;
        this.indexVBO = null;

        this.assign = function(wmoGroupObject){
            this.wmoGroupFile = wmoGroupObject;
        };

        this.createVBO = function(){
            var gl = this.gl;
            var wmoGroupObject = this.wmoGroupFile;

            this.colorsVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.colorsVBO);
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(wmoGroupObject.colorVerticles), gl.STATIC_DRAW );

            this.normalsVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.normalsVBO );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(wmoGroupObject.normals), gl.STATIC_DRAW );

            this.verticlesVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.verticlesVBO );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(wmoGroupObject.verticles), gl.STATIC_DRAW );

            this.textCoordsVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.textCoordsVBO );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(wmoGroupObject.textCoords), gl.STATIC_DRAW );

            this.indexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.indexVBO );
            gl.bufferData( gl.ARRAY_BUFFER, new Int16Array(wmoGroupObject.indicies), gl.STATIC_DRAW );
        };

        /*this.createBatches = function(){
            this.batches = [];
        };*/

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

