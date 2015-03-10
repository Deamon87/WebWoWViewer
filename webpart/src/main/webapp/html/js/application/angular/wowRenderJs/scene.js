/**
 * Created by Deamon on 08/03/2015.
 */

'use strict';


(function (window, $, undefined) {
    var scene = angular.module('js.wow.render.scene', ['js.wow.render.geometry.wmoGeomCache', 'js.wow.render.geometry.wmoMainCache']);
    scene.factory("scene", ['$q', '$timeout', 'wmoMainCache', 'wmoGeomCache', function ($q, $timeout, wmoMainCache, wmoGeomCache) {

        return function(canvas){
            var self = this;

            self.initGlContext = function (canvas){
                try {
                    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
                }
                catch(e) {}

                if (!gl) {
                    alert("Unable to initialize WebGL. Your browser may not support it.");
                    gl = null;
                }
                this.gl = gl;
                gl.clearDepth(1.0);
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL)
            };
            self.initGlContext(canvas);

            self.wmoGeomCache = new wmoGeomCache();
            self.wmoGeomCache.initGlContext(self.gl);

            self.wmoMainCache = new wmoMainCache();
            self.wmoMainCache.initGlContext(self.gl);



            self.draw = function (deltaTime){
                var gl = self.gl;

                gl.disable(gl.BLEND);
                gl.clearColor(0.7 + 0.3, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                //gl.MatrixMode(GL_MODELVIEW);
                //gl.LoadIdentity();


                //gl.enableClientState(gl.TEXTURE_COORD_ARRAY);
                gl.activeTexture(gl.TEXTURE0);
                //gl.enable(gl.TEXTURE_2D);

                //gl.enableClientState(gl.VERTEX_ARRAY);
                //gl.enableClientState(gl.NORMAL_ARRAY);


            };

            self.loadWMOMap = function(filename){
               var wmoPromise = self.wmoMainCache.loadWmoMain(filename);
                wmoPromise.then(function success(wmoObj){
                    console.log(wmoObj);

                    var template = filename.substr(0, filename.lastIndexOf("."));
                    for (var i = 0; i < wmoObj.nGroups; i++) {
                        /* Fill the string with zeros, so it would have length of 3 */
                        var num = (i).toString();
                        for (;num.length != 3; ){
                            num = '0' + num;
                        }


                        self.wmoGeomCache.loadWmoGeom(template + "_" + num + ".wmo");
                    }

                }, function error(){

                });
            }


        };
    }]);
})(window, jQuery);