/**
 * Created by Deamon on 08/02/2015.
 */

(function (window, $, undefined) {
    var firstPersonCamera = angular.module('main.angular.sceneJs.firstPersonCamera', []);

    firstPersonCamera.factory('registerFirstPersonCamera', ["wmoLoader", 'wmoGroupLoader', '$log', function (wmoLoader, wmoGroupLoader, $log) {

        SceneJS.Types.addType("camera/firstperson", {
            construct: function (params) {
                var theScene = this.getScene();
                var canvas = theScene.getCanvas();

                var self = this;

                this.addNode({
                    type: "lookAt",
                    id : "cameraLookAt",
                    up : {x : 0, y : 0, z : 1},
                    nodes: params.nodes
                });

                /* Handlers for elem */
                var camera = [0,0,0];
                var MDDepth = 0, MDHorizontal = 0, MDVertical = 0;

                var mleft_pressed = 0;
                var m_x = 0, m_y = 0;
                var ah = 0, av = 0;
                function keyDown(event) {
                    var key = String.fromCharCode(event.keyCode || event.charCode);
                    switch (key) {
                        case 'W' :
                            MDDepth = 1;
                            break;
                        case 'S' :
                            MDDepth = -1;
                            break;
                        case 'A' :
                            MDHorizontal = -1;
                            break;
                        case 'D':
                            MDHorizontal = 1;
                            break;
                        case 'Q':
                            MDVertical = 1;
                            break;

                        case 'E':
                            MDVertical = -1;
                            break;
                    }
                }
                function keyUp(event) {
                    var key = String.fromCharCode(event.keyCode || event.charCode);
                    switch (key) {
                        case 'W' :
                            MDDepth = 0;
                            break;
                        case 'S' :
                            MDDepth = 0;
                            break;
                        case 'A' :
                            MDHorizontal = 0;
                            break;
                        case 'D':
                            MDHorizontal = 0;
                            break;
                        case 'Q':
                            MDVertical = 0;
                            break;

                        case 'E':
                            MDVertical = 0;
                            break;
                    }
                }
                function mouseDown(event){
                    if (event.button === 0 ) {
                        mleft_pressed = 1;
                        m_x = event.pageX;
                        m_y = event.pageY;
                    }
                }
                function mouseUp (event) {
                    if (event.button === 0) {
                        mleft_pressed = 0;
                    }
                }
                function mouseMove(event){
                    if (mleft_pressed === 1) {
                        ah = ah + (event.pageX - m_x) / 4.0;
                        av = av + (event.pageY - m_y) / 4.0;
                        if (av < -89) {
                            av = -89
                        } else if (av > 89) {
                            av = 89;
                        }
                        m_x = event.pageX;
                        m_y = event.pageY;
                    }
                }

                canvas.addEventListener( 'mousemove', mouseMove , false );
                canvas.addEventListener( 'mousedown', mouseDown , false );
                canvas.addEventListener( 'mouseup',   mouseUp , false );

                var lastDownTarget;
                document.addEventListener('mousedown', function(event) {
                    lastDownTarget = event.target;
                 }, false);

                document.addEventListener('keydown', function(event) {
                    if(lastDownTarget == canvas) {
                        keyDown(event)
                    }
                }, false);
                document.addEventListener('keyup', function(event) {
                    if(lastDownTarget == canvas) {
                        keyUp(event)
                    }
                }, false);


                function VectorRotateAroundY(vec3, alpha){
                    var s = Math.sin(alpha), c = Math.cos(alpha);
                    return [
                        c*vec3[0]+s*vec3[2],
                        vec3[1],
                        c*vec3[2]-s*vec3[0]
                    ]
                }
                function VectorRotateAroundZ(vec3, alpha){
                    var s = Math.sin(alpha), c = Math.cos(alpha);
                    return [
                        c*vec3[0]+s*vec3[1],
                        c*vec3[1]-s*vec3[0],
                        vec3[2]
                    ]
                }
                function degToRad(degrees){
                    return degrees * ( Math.PI/180 );
                }

                function normalizeVector(vec3){
                    var invLen = rSqrt(vectorNorm(vec3));
                    return [
                        vec3[0]*invLen,
                        vec3[1]*invLen,
                        vec3[2]*invLen
                    ];
                }
                function vectorNorm(vec3){
                    return vec3[0]*vec3[0]+vec3[1]*vec3[1]+vec3[2]*vec3[2];
                }

                function rSqrt(v) {
                    return 1 / Math.sqrt(v);
                }
                function scaleVector(vec3, factor) {
                    return [
                        vec3[0]*factor,
                        vec3[1]*factor,
                        vec3[2]*factor
                    ]
                }

                function addVector(vec3_1, vec3_2) {
                    return [
                        vec3_1[0] + vec3_2[0],
                        vec3_1[1] + vec3_2[1],
                        vec3_1[2] + vec3_2[2]
                    ];
                }

                theScene.on("tick", function(tickObj) {
                    var dir = [1,0,0];
                    var moveSpeed = 0.5;

                    var dTime = tickObj.time - tickObj.prevTime;

                    dir = VectorRotateAroundY(dir,degToRad(av));
                    dir = VectorRotateAroundZ(dir,degToRad(ah));

                    if (MDHorizontal !== 0) {
                        var right = VectorRotateAroundZ(dir, degToRad(90));
                        right[2] = 0;

                        right = normalizeVector(right);
                        right = scaleVector(right, dTime * moveSpeed * MDHorizontal);

                        camera = addVector(camera, right);
                    }

                    if (MDDepth !== 0) {
                        var movDir = dir;
                        movDir = scaleVector(movDir, dTime * moveSpeed * MDDepth);
                        camera = addVector(camera, movDir);
                    }
                    if (MDVertical !== 0) {
                        camera[2] = camera[2] + dTime * moveSpeed * MDVertical;
                    }

                    var lookat = addVector(camera, dir);
                    theScene.getNode("cameraLookAt", function(cameraLookAt){
                        cameraLookAt.setLook({x: lookat[0], y: lookat[1], z: lookat[2] });
                        cameraLookAt.setEye({x: camera[0], y: camera[1], z: camera[2] });

                        self.publish("lookAtUpdated", {
                            lookAt: lookat,
                            camera: camera,
                            av : av,
                            ah : ah
                        });
                    });
                });
            }
        });
    }]);

})(window, jQuery);