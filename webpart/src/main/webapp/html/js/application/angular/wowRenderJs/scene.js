/**
 * Created by Deamon on 08/03/2015.
 */

'use strict';

(function (window, $, undefined) {
    var scene = angular.module('js.wow.render.scene', [
        'js.wow.render.geometry.wmoGeomCache',
        'js.wow.render.geometry.wmoMainCache',
        'js.wow.render.geometry.m2GeomCache',
        'js.wow.render.geometry.skinGeomCache',
        'js.wow.render.wmoObjectFactory',
        'js.wow.render.texture.textureCache',
        'js.wow.render.camera.firstPersonCamera']);
    scene.factory("scene", ['$q', '$timeout', 'wmoObjectFactory', 'wmoMainCache', 'wmoGeomCache', 'textureWoWCache', 'm2GeomCache', 'skinGeomCache', 'firstPersonCamera', function ($q, $timeout, wmoObjectFactory, wmoMainCache, wmoGeomCache, textureWoWCache, m2GeomCache, skinGeomCache, firstPersonCamera) {

        var simpleVertexShader =
            "attribute vec3 aPosition; "+
            "attribute vec3 aNormal; "+
            "attribute vec2 aTexCoord; "+
            "attribute vec4 aColor; "+

            "uniform float uAlphaTest;"+
            "uniform mat4 uModelView; "+
            "uniform mat4 uPMatrix; "+


            "varying vec2 vTexCoord; "+
            "varying vec3 vNormal; "+
            "varying vec4 vColor; "+
            "varying float vAlphaTest; "+
            "void main() { " +
            "    vTexCoord = aTexCoord; "+
            "    vColor = aColor; "+
            "    gl_Position = uPMatrix * uModelView * vec4(aPosition, 1);"+
            "    vNormal = aNormal; "+
            "    vAlphaTest = uAlphaTest; "+
            "} ";

        var simpleFragmentShader =
            "precision lowp float; "+
            "varying vec3 vNormal; "+
            "varying vec2 vTexCoord; "+
            "varying vec4 vColor; "+
            "varying float vAlphaTest; "+
            "uniform sampler2D uTexture; "+
            "void main() { "+
            "   vec4 tex = texture2D(uTexture, vTexCoord); "+
            "   gl_FragColor =  vec4(" +
            "   vColor.a*tex.r + (1.0 - vColor.a)*vColor.r, " +
            "   vColor.a*tex.g + (1.0 - vColor.a)*vColor.g, " +
            "   vColor.a*tex.b + (1.0 - vColor.a)*vColor.b, " +
            "   tex.a + vColor.a" +
            "); " +
                "if(gl_FragColor.a < vAlphaTest) "+
                "   discard; "+
            "}";

        return function(canvas){

            var stats = new Stats();
            stats.setMode( 1 ); // 0: fps, 1: ms, 2: mb

            // align top-left
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.left = '0px';
            stats.domElement.style.top = '0px';

            document.body.appendChild( stats.domElement );

            var self = this;

            function throwOnGLError(err, funcName, args) {
                throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
            }

            self.sceneObjectList = [];

            self.initGlContext = function (canvas){
                try {
                    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
                    gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
                }
                catch(e) {}

                if (!gl) {
                    alert("Unable to initialize WebGL. Your browser may not support it.");
                    gl = null;
                }
                self.gl = gl;
                gl.clearDepth(1.0);
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);

                /* 1. Compile shaders */

                /* 1.1 Compile vertex shader */
                var vertexShader = gl.createShader(gl.VERTEX_SHADER);

                // Set the shader source code.
                gl.shaderSource(vertexShader, simpleVertexShader);

                // Compile the shader
                gl.compileShader(vertexShader);

                // Check if it compiled
                var success = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
                if (!success) {
                    // Something went wrong during compilation; get the error
                    throw "could not compile shader:" + gl.getShaderInfoLog(vertexShader);
                }

                /* 1.2 Compile fragment shader */
                var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

                // Set the shader source code.
                gl.shaderSource(fragmentShader, simpleFragmentShader);

                // Compile the shader
                gl.compileShader(fragmentShader);

                // Check if it compiled
                var success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
                if (!success) {
                    // Something went wrong during compilation; get the error
                    throw "could not compile shader:" + gl.getShaderInfoLog(fragmentShader);
                }

                /* 1.3 Link the program */
                var program = gl.createProgram();

                // attach the shaders.
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);

                gl.bindAttribLocation(program, 0, "aPosition");
                gl.bindAttribLocation(program, 1, "aNormal");
                gl.bindAttribLocation(program, 2, "aTexCoord");
                gl.bindAttribLocation(program, 3, "aColor");

                // link the program.
                gl.linkProgram(program);

                // Check if it linked.
                var success = gl.getProgramParameter(program, gl.LINK_STATUS);
                if (!success) {
                    // something went wrong with the link

                    throw ("program filed to link:" + gl.getProgramInfoLog (program));
                }

                var modelViewMatrix = gl.getUniformLocation(program, "uModelView");
                var projectionMatrix = gl.getUniformLocation(program, "uPMatrix");
                var uAlphaTest = gl.getUniformLocation(program, "uAlphaTest");

                self.program = program;
                self.modelViewMatrix = modelViewMatrix;
                self.projectionMatrix = projectionMatrix;

                gl.useProgram(self.program);
                var perspectiveMatrix = [];
                mat4.perspective(perspectiveMatrix, 45.0, canvas.width / canvas.height, 1, 1000  );
                gl.uniformMatrix4fv(self.projectionMatrix, false, perspectiveMatrix);
                gl.useProgram(null);
            };
            self.initGlContext(canvas);

            self.sceneApi = {
                getGlContext : function() {
                    return self.gl;
                },
                loadTexture: function(fileName){
                    return self.textureCache.loadTexture(fileName);
                },
                unLoadTexture : function (fileName){
                    self.textureCache.unLoadTexture(fileName);
                },
                loadWmoMain : function (fileName){
                    return self.wmoMainCache.loadWmoMain(fileName);
                },
                unloadWmoMain : function (fileName){
                    self.wmoMainCache.unloadWmoMain(fileName);
                },
                loadWmoGeom : function (fileName){
                    return self.wmoGeomCache.loadWmoGeom(fileName);
                },
                unloadWmoGeom : function (fileName){
                    self.wmoGeomCache.unLoadWmoGeom(fileName);
                },
                loadM2Geom : function (fileName) {
                    return self.m2GeomCache.loadM2(fileName);
                },
                unloadM2Geom : function (fileName){
                    self.m2GeomCache.unLoadM2(fileName);
                },
                loadSkinGeom : function (fileName){
                    return self.skinGeomCache.loadSkin(fileName);
                },
                unloadSkinGeom : function (fileName){
                    self.skinGeomCache.unLoadSkin(fileName);
                },
                loadAdtGeom : function (){

                },
                unloadAdtGeom : function (){

                }
                /* Shader information */
            };

            self.wmoGeomCache = new wmoGeomCache(self.sceneApi);
            self.wmoMainCache = new wmoMainCache(self.sceneApi);
            self.textureCache = new textureWoWCache(self.sceneApi);
            self.m2GeomCache = new m2GeomCache(self.sceneApi);
            self.skinGeomCache = new skinGeomCache(self.sceneApi);

            self.draw = function (deltaTime){
                var gl = self.gl;

                var cameraVecs = camera.tick(deltaTime);
                var lookAtMat4 = [];
                mat4.lookAt(lookAtMat4, cameraVecs.cameraVec3, cameraVecs.lookAtVec3, [0,0,1]);

                gl.disable(gl.BLEND);
                gl.clearColor(0.7 + 0.3, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                gl.activeTexture(gl.TEXTURE0);

                gl.useProgram(self.program);
                gl.uniformMatrix4fv(self.modelViewMatrix, false, lookAtMat4);

                stats.begin();
                var i;
                for (i = 0; i < self.sceneObjectList.length; i ++) {
                    var sceneObject = self.sceneObjectList[i];
                    sceneObject.draw();
                }
                stats.end();

                return cameraVecs;
            };

            self.loadWMOMap = function(filename){
                var wmoObject = new wmoObjectFactory(self.sceneApi);
                wmoObject.load(filename, 0);

                self.sceneObjectList = [wmoObject];
            };


            var camera = firstPersonCamera(canvas, document);

        };
    }]);
})(window, jQuery);