/**
 * Created by Deamon on 31/01/2015.
 */
(function (window, $, undefined) {
    var sceneJsElem = angular.module('main.directives.sceneJsElem', ['main.services.wowSceneJsService']);

    sceneJsElem.directive('sceneJsElem', ['$log', '$timeout', '$interval', 'wowSceneJsService', function ($log, $timeout, $interval, wowSceneJsService) {
        return {
            restrict: 'E',
            template: '<canvas id = "{{elemId}}" width="1280" height="720"></canvas>',

            link: function postLink(scope, element, attrs) {
                var camera, scene, renderer;

                var elemId = element.data("id");
                if (elemId === undefined){
                    $log.error("sceneJsElem must have nonnull data-id attribute");

                    return
                }

                var scene;

                scope.elemId = elemId;
                $timeout(function(){
                    scene = wowSceneJsService(elemId);

                    scene.getNode("content", function(content){


                        content.addNode({
                            type: "import/wmo",
                            //src : "World/wmo/Dungeon/Ulduar/Ulduar_dwarf77.wmo"
                            //src : "World/wmo/Northrend/Dalaran/ND_Dalaran.wmo"
                            //src : "World/wmo/KhazModan/Cities/Ironforge/ironforge.wmo"
                            src : "World/wmo/Dungeon/LD_DragonIsles/DragonIsles_D.wmo"
                            //src : "World/wmo/Azeroth/Buildings/Stormwind/Stormwind.wmo"
                        });

                        var numTasks = 0;
                        $interval(function () {
                            var status = scene.getStatus();
                            var info = {};

                            if (!status) {
                                info.innerHTML = "Scene status: not found";
                                return;
                            }
                            if (status.destroyed) {
                                info.innerHTML = "Scene status: destroyed";
                                return;
                            }
                            if (status.numTasks != numTasks) {
                                info.innerHTML = "Scene status: loads in progress: " + status.numTasks;
                                scope.numTasks = status.numTasks;
                            }
                        }, 100);

                    });

                }, 0);


            }
        }
    }]);


})(jQuery, window);
