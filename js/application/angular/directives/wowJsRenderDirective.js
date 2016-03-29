import angular from 'angular';
import Scene from './../wowRenderJs/scene.js';
import config from './../services/config.js';


var wowJsRender = angular.module('main.directives.wowJsRender', []);
wowJsRender.directive('wowJsRender', ['$log', '$timeout', '$interval', '$window',
    function ($log, $timeout, $interval, $window) {
    return {
        restrict: 'E',
        template:
            '<div class=""><canvas width = "1024" height = "768" ></canvas>' +
            '<div>camera = ( {{cameraVecs.cameraVec3[0]}}, {{cameraVecs.cameraVec3[1]}}, {{cameraVecs.cameraVec3[2]}} )</div>' +
            '<div>lookAt = ( {{cameraVecs.lookAtVec3[0]}}, {{cameraVecs.lookAtVec3[1]}}, {{cameraVecs.lookAtVec3[2]}} )</div>' +
            '<div>Group number = {{updateResult.interiorGroupNum}}</div>'+
            '<div>BSP Node Id = {{updateResult.nodeId}}</div>'+
            '<input type="checkbox" ng-model="drawM2" >Draw M2 objects</input><input type="checkbox" ng-model="drawPortals" >Draw portals</input>' +
            '</div>',
        link: function postLink(scope, element, attrs) {
            var canvas = element.find('canvas')[0];

            var sceneParams = config.getSceneParams();
            var sceneObj = new Scene(canvas);
            var lastTimeStamp = undefined;

            if (sceneParams.sceneType == 'map') {
                var adt_x = Math.floor((32 - (sceneParams.y / 533.33333)));
                var adt_y = Math.floor((32 - (sceneParams.x / 533.33333)));

                sceneObj.loadMap(sceneParams.mapName, adt_x, adt_y);
                sceneObj.setCameraPos(sceneParams.x, sceneParams.y, sceneParams.z);
            } else if (sceneParams.sceneType == 'wmo') {
                sceneObj.loadWMOFile({
                    fileName : sceneParams.fileName,
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    doodadSet: 0
                });

            } else if (sceneParams.sceneType == 'm2') {
                sceneObj.loadM2File({
                    fileName : sceneParams.modelName,
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y: 0, z : 0},
                    scale    : 1024
                });
            }

            scope.$watch('drawM2', function (newValue) {
                config.setRenderM2(newValue);
            });
            scope.$watch('drawPortals', function (newValue) {
                config.setRenderPortals(newValue);
            });
            var renderfunc = function(){
                var currentTimeStamp = new Date().getTime();
                var timeDelta = 0;
                if (lastTimeStamp !== undefined) {
                    timeDelta = currentTimeStamp - lastTimeStamp;
                }
                lastTimeStamp = currentTimeStamp;

                var result = sceneObj.draw(timeDelta);
                var cameraVecs = result.cameraVecs;
                var updateResult = result.updateResult;
                scope.cameraVecs = cameraVecs;
                scope.updateResult = updateResult;

                //scope.$digest();

                $window.requestAnimationFrame(renderfunc);
            };
            $window.requestAnimationFrame(renderfunc);

            $window.setInterval(function(){
                scope.$digest();
            }, 200);
        }
    }
}]);
