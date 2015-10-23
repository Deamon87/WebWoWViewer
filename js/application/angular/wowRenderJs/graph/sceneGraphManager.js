'use strict';

(function (window, $, undefined) {
    var sceneGraph = angular.module('js.wow.render.scene.graph', []);
    sceneGraph.factory("graphManager", ['$q', function($q){

        function GraphManager(){

        }

        GraphManager.prototype = {
            addAdtM2Object : function (doodad){

            },
            addWmoM2Object : function (doodadDef){

            },
            addWmoObject : function (wmoDef){

            },
            update : function(deltaTime) {

            },
            draw : function () {

            }
        };

        return new GraphManager;
    }]);

})(window, jQuery);