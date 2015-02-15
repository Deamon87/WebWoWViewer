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
                        type: "library",
                        id: "library",
                        nodes: []
                    },

                    {
                        type: "camera/firstperson",
                        id : "firstPersonCamera",
                        nodes: [
                            {
                                id: "content"
                            }
                        ]
                    }
                ]
            });

            return scene;
        }
    }]);
})(window, jQuery);