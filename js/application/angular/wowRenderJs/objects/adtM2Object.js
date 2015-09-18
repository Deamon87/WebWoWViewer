'use strict';

(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.adtM2ObjectFactory', ['js.wow.render.mdxObject']);
    cacheTemplate.factory("adtM2ObjectFactory", ['mdxObject', '$q', '$timeout', function(mdxObject, $q, $timeout) {
        function AdtM2Object(sceneApi){
            var self = this;

            self.sceneApi = sceneApi;
            self.mdxObject = new mdxObject(sceneApi);
        }
        AdtM2Object.prototype = {
            drawBB : function (){

            },
            draw : function (deltaTime) {
                this.mdxObject.draw(deltaTime, this.placementMatrix, 0xffffffff);
            },
            createPlacementMatrix : function(mddf){
                var TILESIZE = 533.333333333;

                var posx = mddf.pos.x-32*TILESIZE;
                var posy = mddf.pos.y;
                var posz = mddf.pos.z-32*TILESIZE;

                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.y - 90));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-mddf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.z));

                //glscalef(Fscale,Fscale,Fscale);
                mat4.scale(placementMatrix, placementMatrix, [mddf.scale / 1024, mddf.scale / 1024, mddf.scale / 1024]);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            load : function (mddf){
                var self = this;

                self.mddf = mddf;

                self.createPlacementMatrix(mddf);
                self.mdxObject.load(mddf.fileName, 0);
            }
        };

        return AdtM2Object;
    }]);
})(window, jQuery);