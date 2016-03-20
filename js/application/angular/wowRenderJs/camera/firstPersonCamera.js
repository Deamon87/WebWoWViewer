import {vec3} from 'gl-matrix';

export default function initCamera(canvas, document) {
    /* Handlers for elem */
    var camera = [0, 0, 0];
    var MDDepth = 0, MDHorizontal = 0, MDVertical = 0;
    var staticCamera = false;

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

            case 'K' :
                staticCamera = !staticCamera;
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

    function mouseDown(event) {
        if (event.button === 0) {
            mleft_pressed = 1;
            m_x = event.pageX;
            m_y = event.pageY;
        }
    }

    function touchStart(event) {
        mleft_pressed = 1;
        m_x = event.pageX;
        m_y = event.pageY;
    }

    function touchMove(event) {
        var x = event.touches[0].pageX; // Собираем данные
        var y = event.touches[0].pageY; // и еще

        if (mleft_pressed === 1) {
            ah = ah + (x - m_x) / 4.0;
            av = av + (y - m_y) / 4.0;
            if (av < -89) {
                av = -89
            } else if (av > 89) {
                av = 89;
            }
            m_x = x;
            m_y = y;
        }
    }

    function mouseUp(event) {
        if (event.button === 0) {
            mleft_pressed = 0;
        }
    }

    function mouseMove(event) {
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

    function mouseout(event) {
        mleft_pressed = 0;
    }

    canvas.addEventListener('mousemove', mouseMove, false);
    canvas.addEventListener('touchmove', touchMove, false);
    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('touchstart', touchStart, false);
    canvas.addEventListener('mouseup', mouseUp, false);
    canvas.addEventListener('touchend', mouseUp, false);
    canvas.addEventListener('mouseout', mouseout, false);

    var lastDownTarget;
    document.addEventListener('mousedown', function (event) {
        lastDownTarget = event.target;
    }, false);

    document.addEventListener('keydown', function (event) {
        if (lastDownTarget == canvas) {
            keyDown(event)
        }
    }, false);
    document.addEventListener('keyup', function (event) {
        if (lastDownTarget == canvas) {
            keyUp(event)
        }
    }, false);

    function degToRad(degrees) {
        return degrees * ( Math.PI / 180 );
    }


    return {
        tick: function (timeDelta) {
            var dir = [1, 0, 0];
            var moveSpeed = 0.02;

            var dTime = timeDelta;

            /* Calc look at position */

            dir = vec3.rotateY(dir, dir, [0, 0, 0], degToRad(av));
            dir = vec3.rotateZ(dir, dir, [0, 0, 0], degToRad(-ah));

            var lookat = [];

            /* Calc camera position */
            if (MDHorizontal !== 0) {
                var right = [];
                vec3.rotateZ(right, dir, [0, 0, 0], degToRad(-90));
                right[2] = 0;

                vec3.normalize(right, right);
                vec3.scale(right, right, dTime * moveSpeed * MDHorizontal);

                vec3.add(camera, camera, right);
            }

            if (MDDepth !== 0) {
                var movDir = [];
                vec3.copy(movDir, dir);

                vec3.scale(movDir, movDir, dTime * moveSpeed * MDDepth);
                vec3.add(camera, camera, movDir);
            }
            if (MDVertical !== 0) {
                camera[2] = camera[2] + dTime * moveSpeed * MDVertical;
            }

            vec3.add(lookat, camera, dir);

            return {
                lookAtVec3: lookat,
                cameraVec3: camera,
                staticCamera: staticCamera
            }
        },
        setCameraPos: function (x, y, z) {
            camera = [x, y, z];
        }
    }
};