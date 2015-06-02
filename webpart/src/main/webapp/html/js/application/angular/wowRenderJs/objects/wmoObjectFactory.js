

'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', []);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', function($q, $timeout) {

        function WmoObject(){
            var self = this;

            self.wmoGroupArray = [];

            self.initGlContex = function(gl) {
                self.gl = gl;
            };

            self.setCaches = function(wmoMainCache, wmoGeomCache, textureCache){
                self.wmoMainCache = wmoMainCache;
                self.wmoGeomCache = wmoGeomCache;
                self.textureCache = textureCache;
            };

            self.loadGeom = function (num, filename){
                self.wmoGeomCache.loadWmoGeom(filename).then(
                    function success(wmoGeom){
                        self.wmoGroupArray[num] = wmoGeom;

                        /* 1. Load textures */
                        wmoGeom.provideTextureCache(self.textureCache);
                        wmoGeom.loadTextures(self.wmoObj.momt);

                    }, function error(){

                    }
                );
            };

            self.load = function (filename){
                var deferred = $q.defer();

                var wmoMailPromise = self.wmoMainCache.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = [];
                    self.wmoGroupArray.length = wmoObj.nGroups;

                    /* 1. Load wmo group files */
                    var template = filename.substr(0, filename.lastIndexOf("."));
                    for (var i = 0; i < wmoObj.nGroups; i++) {
                        /* Fill the string with zeros, so it would have length of 3 */
                        var num = (i).toString();
                        for (;num.length != 3; ){
                            num = '0' + num;
                        }

                        self.loadGeom(i, template + "_" + num + ".wmo");

                    }

                    /* 2. Load doodads */

                }, function error (){


                });
            };

            self.draw = function () {

                /* Draw */
                for (var i = 0; i < self.wmoGroupArray.length; i++){
                    if (self.wmoGroupArray[i]){
                        self.wmoGroupArray[i].draw();
                    }
                }



            }
        }

        return WmoObject;
    }]);
})(window, jQuery);