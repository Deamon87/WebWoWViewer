'use strict';

(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoM2ObjectFactory', ['js.wow.render.mdxObject']);
    cacheTemplate.factory("wmoM2ObjectFactory", ['mdxObject', '$q', '$timeout', function(mdxObject, $q, $timeout) {
        function WmoM2Object(sceneApi){
            var self = this;

            self.sceneApi = sceneApi;
            self.mdxObject = new mdxObject(sceneApi);
        }
        WmoM2Object.prototype = {
            sceneApi : null,
            mdxObject : null,

            getMeshesToRender : function () {
                if (!this.mdxObject) return null;
                return this.mdxObject.getMeshesToRender();
            },
            update: function (deltaTime) {
                this.mdxObject.update(deltaTime);
            },
            draw : function () {
                this.mdxObject.draw(this.placementMatrix, this.diffuseColor);
            },
            createPlacementMatrix : function(doodad, wmoPlacementMatrix){
                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);
                mat4.multiply(placementMatrix, placementMatrix, wmoPlacementMatrix);

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [doodad.pos.x,doodad.pos.y,doodad.pos.z]);

                var orientMatrix = mat4.create();
                mat4.fromQuat(orientMatrix,
                    [doodad.rotation.imag.x,
                    doodad.rotation.imag.y,
                    doodad.rotation.imag.z,
                    doodad.rotation.real]
                );
                mat4.multiply(placementMatrix, placementMatrix, orientMatrix);

                //glscalef(Fscale,Fscale,Fscale);
                mat4.scale(placementMatrix, placementMatrix, [doodad.scale, doodad.scale, doodad.scale]);

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            load : function (doodad, wmoPlacementMatrix, useLocalColor){
                var self = this;

                self.doodad = doodad;

                if (useLocalColor) {
                    self.diffuseColor = doodad.color;
                } else {
                    self.diffuseColor = 0xffffffff;
                }
                self.createPlacementMatrix(doodad, wmoPlacementMatrix);
                return self.mdxObject.load(doodad.modelName, 0);
            }
        };

        return WmoM2Object;
    }]);
})(window, jQuery);