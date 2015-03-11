/* WMO Main Cache */
/* global alert: false */
'use strict';
(function (window, $, undefined) {

    var wmoGeomCache = angular.module('js.wow.render.geometry.wmoMainCache', ['main.services.map.wmoLoader', 'js.wow.render.cacheTemplate']);
    wmoGeomCache.factory("wmoMainCache", ['wmoLoader', 'cacheTemplate', '$q', function(wmoLoader, cacheTemplate, $q){

        function WmoMainCache() {
            var self = this;

            var cache = cacheTemplate(function loadGroupWmo(fileName){
                /* Must return promise */
                return wmoLoader(fileName);
            }, function (a){
                return a;
            });

            self.initGlContext = function (glContext) {
                this.gl = glContext;
            };

            self.loadWmoMain = function (fileName){
                return cache.get(fileName);
            };

            self.unLoadWmoMain = function (fileName) {
                cache.remove(fileName)
            }
        }

        return WmoMainCache;
    }]);

})(window, jQuery);

