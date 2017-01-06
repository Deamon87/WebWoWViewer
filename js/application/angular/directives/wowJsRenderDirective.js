import angular from 'angular';
import Scene from './../wowRenderJs/scene.js';
import config from './../services/config.js';

import 'hammerjs';
import 'imports?window=>global!hammerjs';
import 'hammer-timejs';

var events = function (element, camera) {
    "use strict";

    var mleft_pressed = 0;
    var m_x = 0, m_y = 0;

    var _document = document;
    _document.cameraSpeed = 0.02;

    function keyDown(event) {
        var key = String.fromCharCode(event.keyCode || event.charCode);
        switch (key) {
            case 'W' :
                camera.startMovingForward();
                break;
            case 'S' :
                camera.startMovingBackwards();
                break;
            case 'A' :
                camera.startStrafingLeft();
                break;
            case 'D':
                camera.startStrafingRight();
                break;
            case 'Q':
                camera.startMovingUp();
                break;
            case 'E':
                camera.startMovingDown();
                break;
        }
    }

    function keyUp(event) {
        var key = String.fromCharCode(event.keyCode || event.charCode);
        switch (key) {
            case 'W' :
                camera.stopMovingForward();
                break;
            case 'S' :
                camera.stopMovingBackwards();
                break;
            case 'A' :
                camera.stopStrafingLeft();
                break;
            case 'D':
                camera.stopStrafingRight();
                break;
            case 'Q':
                camera.stopMovingUp();
                break;

            case 'E':
                camera.stopMovingDown();
                break;
        }
    }

    function mouseDown(event) {
        if (event.button === 0) {
            mleft_pressed = 1;
            m_x = event.pageX;
            m_y = event.pageY;
        }
    }

    function mouseUp(event) {
        if (event.button === 0) {
            mleft_pressed = 0;
        }
    }

    function mouseMove(event) {
        if (!pointerIsLocked) {
            if (mleft_pressed === 1) {
                camera.addHorizontalViewDir((event.pageX - m_x) / 4.0);
                camera.addVerticalViewDir((event.pageY - m_y) / 4.0);

                m_x = event.pageX;
                m_y = event.pageY;
            }
        } else {
            var delta_x = event.movementX ||
                event.mozMovementX          ||
                event.webkitMovementX       ||
                0;
            var delta_y = event.movementY ||
                event.mozMovementY      ||
                event.webkitMovementY   ||
                0;

            camera.addHorizontalViewDir((delta_x) / 4.0);
            camera.addVerticalViewDir((delta_y) / 4.0);
        }
    }

    function mouseout(event) {
        mleft_pressed = 0;
    }

    //From http://www.html5rocks.com/en/tutorials/pointerlock/intro/
    var havePointerLock = 'pointerLockElement' in document ||
        'mozPointerLockElement' in document ||
        'webkitPointerLockElement' in document;

    if (havePointerLock) {
        element.addEventListener("click", function () {
            "use strict";
            element.requestPointerLock = element.requestPointerLock ||
                element.mozRequestPointerLock ||
                element.webkitRequestPointerLock;
            // Ask the browser to lock the pointer
            element.requestPointerLock();
        }, false);

        var pointerIsLocked = false;
        var pointerLockCallback = function (e) {
            "use strict";

            pointerIsLocked =
                (document.pointerLockElement === element ||
                document.mozPointerLockElement === element ||
                document.webkitPointerLockElement === element);
        };
        document.addEventListener('pointerlockchange', pointerLockCallback, false);
        document.addEventListener('mozpointerlockchange', pointerLockCallback, false);
        document.addEventListener('webkitpointerlockchange', pointerLockCallback, false);
    }

    element.addEventListener('mousemove', mouseMove, false);
    element.addEventListener('mousedown', mouseDown, false);
    element.addEventListener('mouseup', mouseUp, false);
    element.addEventListener('mouseout', mouseout, false);



    var lastDownTarget;
    document.addEventListener('mousedown', function (event) {
        lastDownTarget = event.target;
    }, false);

    document.addEventListener('keydown', function (event) {
        if (lastDownTarget == element) {
            keyDown(event)
        }
    }, false);
    document.addEventListener('keyup', function (event) {
        if (lastDownTarget == element) {
            keyUp(event)
        }
    }, false);


    var isPitchGoingOn = false;
    function touchStart(event) {
        if (isPitchGoingOn) return;
        mleft_pressed = 1;
        m_x = event.touches[0].pageX;
        m_y = event.touches[0].pageY;
    }

    function touchMove(event) {
        if (isPitchGoingOn) return;
        var x = event.touches[0].pageX; // Собираем данные
        var y = event.touches[0].pageY; // и еще

        if (mleft_pressed === 1) {
            camera.addHorizontalViewDir((x - m_x) / 4.0);
            camera.addVerticalViewDir((y - m_y) / 4.0);

            m_x = x;
            m_y = y;
        }
    }
    function touchEnd(event) {
        mleft_pressed = 0;
    }


    element.addEventListener('touchstart', touchStart, false);
    element.addEventListener('touchmove', touchMove, false);
    element.addEventListener('touchend', touchEnd, false);

    var mc = new Hammer(element);
    mc.get('pinch').set({ enable: true });
    var pinchScale = 0;
    mc.on("pinchstart pinchin pinchout pinchend", function(ev) {
        if (ev.type == 'pinchstart') {
            pinchScale = ev.scale;
            isPitchGoingOn = true;
        } else if (ev.type == 'pinchend') {
            pinchScale = 0;
            isPitchGoingOn = false;
        } else if (ev.type == 'pinchin') {
            camera.addDepthDiff((ev.scale - pinchScale) * 5);
            pinchScale = ev.scale;
        } else if (ev.type == 'pinchout') {

            camera.addDepthDiff((ev.scale - pinchScale) * 5);
            pinchScale = ev.scale;
        }
    });
}


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
            '<div style="display: block"><input type="checkbox" ng-model="drawAdt" >Draw ADT objects</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawM2" >Draw M2 objects</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawPortals">Draw portals</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawM2BB">Draw M2 BB</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawWmoBB">Draw Wmo BB</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawBSP">Draw BSP leafs</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="drawDepth">Draw Depth buffer</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="usePortalCulling">Use portal culling</div>' +
            '<div style="display: block"><input type="checkbox" ng-model="doubleCameraDebug">Double camera debug</div>'+
            '<div style="display: block"><input type="checkbox" ng-disabled="!doubleCameraDebug" ng-model="useSecondCamera">Control debug camera</div>'+
            '<div style="display: block;"><button ng-disabled="!doubleCameraDebug" ng-style="{color: (doubleCameraDebug) ? 0 : \'rgb(200,200,200)\'};" ng-click="copyToDebugCamera()">Copy main camera to debug camera</button></div>'+
            '<div style="display: block;"><button ng-click="loadPacket()">Parse packets</button></div>'+
            '<div style="display: block;"><button ng-click="loadAllPackets()">Parse all packets</button></div>'+
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
                    var m2Object = sceneObj.loadM2File({
                        fileName : sceneParams.modelName,
                        uniqueId : 0,
                        pos      : {x : 0 + 17066.666666656, y : 0, z : 0 + 17066.666666656},
                        rotation : {x : 0, y : 0, z : 0},
                        scale    : 1024
                    });
                    if (sceneParams.cameraIndex !== undefined) {
                        config.setCameraM2(m2Object);
                    }
                    if (sceneParams.fogStart) {
                        sceneObj.setFogStart(sceneParams.fogStart)
                    }
                    if (sceneParams.fogEnd) {
                        sceneObj.setFogEnd(sceneParams.fogEnd);
                    }
                    if (sceneParams.fogColor) {
                        sceneObj.setFogColor(sceneParams.fogColor);
                    }
                }

                scope.drawM2BB = config.getDrawM2BB();
                scope.drawAdt = config.getRenderAdt();
                scope.drawWmoBB = config.getDrawWmoBB();
                scope.drawBSP = config.getRenderBSP();
                scope.drawM2 = config.getRenderM2();
                scope.drawPortals = config.getRenderPortals();
                scope.usePortalCulling = config.getUsePortalCulling();
                scope.useSecondCamera = config.getUseSecondCamera();
                scope.doubleCameraDebug = config.getDoubleCameraDebug();

                events(canvas, sceneObj.camera)

                scope.$watch('drawM2BB', function (newValue) {
                    config.setDrawM2BB(newValue);
                });
               scope.$watch('drawAdt', function (newValue) {
                    config.setRenderAdt(newValue);
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
                scope.$watch('drawDepth', function (newValue) {
                    config.setDrawDepthBuffer(newValue);
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
                scope.loadAllPackets = function () {
                    sceneObj.loadAllPackets();
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
