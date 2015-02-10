/**
 * Created by Deamon on 01/02/2015.
 */
(function (window, $, undefined) {

    var fileReadHelper = angular.module('main.services.wowSceneJsService', ['main.services.config', 'main.angular.sceneJs.firstPersonCamera']);


    fileReadHelper.factory('wowSceneJsService', ['$log', 'registerFirstPersonCamera', function ($log, registerFirstPersonCamera) {
        // Define scene

        return function(canvasId) {
            SceneJS.setConfigs({
                pluginPath: "/html/js/lib/bower/scenejs/api/latest/plugins"
            });

            var scene = SceneJS.createScene({

                canvasId: canvasId,
                nodes: [
                    {
                        type: "camera/firstperson",
                        id : "firstPersonCamera",
                        nodes: [
                            {
                                id: "content"
                            }
/*
                            {
                                type: "rotate",
                                id: "myRotate",
                                x: -1, y: 0, z: 0, // Axis of rotation
                                angle: 90.0,
                                nodes: [
                                    {
                                        type: "rotate",
                                        x: 0, y: 0, z: -1, // Axis of rotation
                                        angle: 90.0,
                                        nodes: [
                                            {
                                                id: "content"
                                            }
                                        ]
                                    }
                                ]
                            }
*/
                        ]
                    }
                ]
            });

            return scene;
        }
    }]);
})(window, jQuery);