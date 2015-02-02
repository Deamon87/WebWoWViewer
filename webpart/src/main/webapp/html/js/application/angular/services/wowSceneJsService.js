/**
 * Created by Deamon on 01/02/2015.
 */
(function (window, $, undefined) {

    var fileReadHelper = angular.module('main.services.wowSceneJsService', ['main.services.config']);


    fileReadHelper.factory('wowSceneJsService', ['$log', function ($log) {
        // Define scene

        return function(canvasId) {
            SceneJS.setConfigs({
                pluginPath: "/html/js/lib/bower/scenejs/api/latest/plugins"
            });

            var scene = SceneJS.createScene({

                canvasId : canvasId,

                nodes: [
                    {
                        type: "cameras/orbit",
                        yaw: 30,
                        pitch: -30,
                        zoom: 25,
                        zoomSensitivity: 1.0,

                        nodes: [
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
                                        nodes : [
                                            {
                                                id: "content"
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

            return scene;
        }
    }]);
})(window, jQuery);