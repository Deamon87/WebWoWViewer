import angular from 'angular';
import Scene from './../wowRenderJs/scene.js';
import config from './../services/config.js';


var wowJsRender = angular.module('main.directives.wowJsRender', []);
wowJsRender.directive('wowJsRender', ['$log', '$timeout', '$interval', '$window',
    function ($log, $timeout, $interval, $window) {
    return {
        restrict: 'E',
        template:
            '<div class="canvas-form-container" style="width: 100%; height: 100%">' +
            '<canvas width = "79%" height = "768" style="float:left"></canvas>' +
            '<div style="display: inline-block;float: left; width: 225px">' +
            '<div>camera = ( {{cameraVecs.cameraVec3[0]}}, {{cameraVecs.cameraVec3[1]}}, {{cameraVecs.cameraVec3[2]}} )</div>' +
            '<div>lookAt = ( {{cameraVecs.lookAtVec3[0]}}, {{cameraVecs.lookAtVec3[1]}}, {{cameraVecs.lookAtVec3[2]}} )</div>' +
            '<div>Group number = {{updateResult.interiorGroupNum}}</div>'+
            '<div>BSP Node Id = {{updateResult.nodeId}}</div>'+
            '<div>Controls: W - forward, S - backward, A - left, D - right, Q - up, E - down, Mouse - move camera</p>'+
            '<div style="display: block"><input type="checkbox" ng-model="drawM2" >Draw M2 objects</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawPortals">Draw portals</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawM2BB">Draw M2 BB</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawWmoBB">Draw Wmo BB</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="usePortalCulling">Use portal culling</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="doubleCameraDebug">Double camera debug</div>'+
            '<div style="display: block"><input type="checkbox" ng-disabled="!doubleCameraDebug" ng-model="useSecondCamera">Control debug camera</div>'+
            '<div style="display: block;"><button ng-disabled="!doubleCameraDebug" ng-style="{color: (doubleCameraDebug) ? 0 : \'rgb(200,200,200)\'};" ng-click="copyToDebugCamera()">Copy main camera to debug camera</button></div>'+
            '</div>'+
            '</div>',
        link: function postLink(scope, element, attrs) {
            var canvas = element.find('canvas')[0];
            canvas.width =  element.children()[0].clientWidth * 0.79;
            canvas.height =  element.children()[0].clientHeight;

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
                    rotation : {x : 0, y : 0, z : 0},
                    doodadSet: 0
                });

            } else if (sceneParams.sceneType == 'm2') {
                sceneObj.loadM2File({
                    fileName : sceneParams.modelName,
                    uniqueId : 0,
                    pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                    rotation : {x : 0, y : 0, z : 0},
                    scale    : 1024
                });
            }

            scope.drawM2BB = config.getDrawM2BB();
            scope.drawWmoBB = config.getDrawWmoBB();
            scope.drawBSP = config.getRenderBSP();
            scope.drawM2 = config.getRenderM2();
            scope.drawPortals = config.getRenderPortals();
            scope.usePortalCulling = config.getUsePortalCulling();
            scope.useSecondCamera = config.getUseSecondCamera();
            scope.doubleCameraDebug = config.getDoubleCameraDebug();


            scope.$watch('drawM2BB', function (newValue) {
                config.setDrawM2BB(newValue);
            });

            scope.$watch('drawWmoBB', function (newValue) {
                config.setDrawWmoBB(newValue);
            });

            scope.$watch('drawBSP', function (newValue) {
                config.setRenderBSP(newValue);
            });


            scope.$watch('drawM2', function (newValue) {
                config.setRenderM2(newValue);
            });

            scope.$watch('drawPortals', function (newValue) {
                config.setRenderPortals(newValue);
            });

            scope.$watch('usePortalCulling', function (newValue) {
                config.setUsePortalCulling(newValue);
            });

            scope.$watch('doubleCameraDebug', function (newValue) {
                config.setDoubleCameraDebug(newValue);
                if (!newValue) {
                    config.setUseSecondCamera(false);
                } else {
                    config.setUseSecondCamera(scope.useSecondCamera);
                }
            });

            scope.$watch('useSecondCamera', function (newValue) {
                config.setUseSecondCamera(newValue);
            });
            scope.copyToDebugCamera = function () {
                sceneObj.copyFirstCameraToDebugCamera();
            };

            scope.loadPacket = function () {
                sceneObj.loadPackets();
            };
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
