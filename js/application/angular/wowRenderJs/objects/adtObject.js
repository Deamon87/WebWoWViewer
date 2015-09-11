'use strict';

(function (window, $, undefined) {
    var adtObjectFactory = angular.module('js.wow.render.adtObjectFactory', []);
    adtObjectFactory.factory("adtObjectFactory", ['$q', function($q) {
        function ADTObject(sceneApi){
            this.sceneApi = sceneApi;
        }
        ADTObject.prototype = {
            load: function (modelName) {
                var self = this;

                var adtPromise = this.sceneApi.loadAdtGeom(modelName);
                adtPromise.then( function (result) {
                    self.adtGeom = result;
                });
            },
            draw : function (deltaTime){
                if (this.adtGeom) {
                    this.adtGeom.draw();
                }
            }
        }

    }]);
})(window, jQuery);