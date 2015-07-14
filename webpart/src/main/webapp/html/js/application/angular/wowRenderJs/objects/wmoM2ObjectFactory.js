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

            draw : function () {
                this.mdxObject.draw(this.placementMatrix, this.diffuseColor);
            },
            createPlacementMatrix : function(doodad){
                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

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
            load : function (doodad){
                var self = this;

                self.diffuseColor = doodad.color;
                self.createPlacementMatrix(doodad);
                self.mdxObject.load(doodad.modelName, 0);
            }
        };

        return WmoM2Object;
    }]);
})(window, jQuery);