/* WMO Main Cache */
/* global alert: false */
'use strict';
(function (window, $, undefined) {

    function WmoMain(glContext) {
        this.gl = glContext;

        this.assign = function(wmoObject){
            this.wmoObject = wmoObject;
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

    var wmoGeomCache = angular.module('js.wow.render.geometry.wmoMainCache', ['main.services.map.wmoLoader', 'js.wow.render.cacheTemplate']);
    wmoGeomCache.factory("wmoMainCache", ['wmoLoader', 'cacheTemplate', '$q', function(wmoLoader, cacheTemplate, $q){

        function WmoMainCache() {
            var self = this;

            var cache = cacheTemplate(function loadGroupWmo(fileName){
                /* Must return promise */
                return wmoLoader(fileName);
            }, function process(wmoMainFile) {
                return wmoMainFile;
            });

            self.initGlContext = function (glContext) {
                this.gl = glContext;
            };

            self.loadWmoMain = function (fileName){
                return cache.get(fileName);
            };

            self.unLoadWmoGeom = function (fileName) {
                cache.remove(fileName)
            }
        }

        return WmoMainCache;
    }]);

})(window, jQuery);

