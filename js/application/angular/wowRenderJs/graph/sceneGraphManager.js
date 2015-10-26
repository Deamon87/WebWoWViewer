'use strict';

(function (window, $, undefined) {
    var sceneGraph = angular.module('js.wow.render.scene.graph', []);
    sceneGraph.factory("graphManager", ['$q', 'wmoM2ObjectFactory', function($q, wmoM2ObjectFactory ){

        function GraphManager(){

        }

        GraphManager.prototype = {
            addAdtM2Object : function (doodad){

            },
            addWmoM2Object : function (doodadDef, placementMatrix, useLocalLighting){
                var wmoM2Object = new wmoM2ObjectFactory(this.sceneApi);
                wmoM2Object.load(doodadDef, placementMatrix, useLocalLighting);
            },
            addWmoObject : function (wmoDef){

            },
            update : function(deltaTime) {

            },
            draw : function () {

            }
        };

        return GraphManager;
    }]);

})(window, jQuery);