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
        'js.wow.render.geometry.adtGeomCache',

        'js.wow.render.wmoObjectFactory',
        'js.wow.render.adtObjectFactory',
        'js.wow.render.texture.textureCache',
        'js.wow.render.camera.firstPersonCamera',
        'js.wow.render.scene.graph']);
    scene.factory("scene", ['$q', '$timeout', '$http',
            'graphManager',
            'wdtLoader',
            'adtM2ObjectFactory', 'adtObjectFactory', 'wmoObjectFactory',
            'wmoMainCache', 'wmoGeomCache', 'textureWoWCache', 'm2GeomCache', 'skinGeomCache', 'adtGeomCache',
            'firstPersonCamera',
        function ($q, $timeout, $http,
                  graphManager,
                  wdtLoader,
                  adtM2ObjectFactory, adtObjectFactory, wmoObjectFactory,
                  wmoMainCache, wmoGeomCache, textureWoWCache, m2GeomCache, skinGeomCache, adtGeomCache,
                  firstPersonCamera) {

        function Scene (canvas) {
            var stats = new Stats();
            stats.setMode( 1 ); // 0: fps, 1: ms, 2: mb

            // align top-left
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.left = '0px';
            stats.domElement.style.top = '0px';

            document.body.appendChild( stats.domElement );
            this.stats = stats;

            var self = this;
            self.enableDeferred = false;

            self.sceneObjectList = [];
            self.sceneAdts = [];


            self.initGlContext(canvas);
            self.initArrayInstancedExt();
            self.initDepthTextureExt();
            self.initRenderBuffers();
            self.initAnisotropicExt();
            self.initCompressedTextureS3tcExt();
            self.initShaders().then(function success() {
                self.isShadersLoaded = true;
            }, function error(){
            });
            self.initSceneApi();
            self.initSceneGraph();
            self.createBlackPixelTexture();



            if (self.enableDeferred) {
                self.initDeferredRendering();
            }

            self.initBoxVBO();
            self.initCaches();
            self.initCamera(canvas, document);

        }
        Scene.prototype = {
            instancing_ext : null,
            compileShader : function(vectShaderString, fragmentShaderString) {
                var gl = this.gl;

                /* 1.1 Compile vertex shader */
                var vertexShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vertexShader, "#define COMPILING_VS 1\r\n "+vectShaderString);
                gl.compileShader(vertexShader);

                // Check if it compiled
                var success = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
                if (!success) {
                    // Something went wrong during compilation; get the error
                    throw "could not compile shader:" + gl.getShaderInfoLog(vertexShader);
                }

                /* 1.2 Compile fragment shader */
                var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fragmentShader, "#define COMPILING_FS 1\r\n "+fragmentShaderString);
                gl.compileShader(fragmentShader);

                // Check if it compiled
                var success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
                if (!success) {
                    // Something went wrong during compilation; get the error
                    throw "could not compile shader:" + gl.getShaderInfoLog(fragmentShader);
                }

                /* 1.3 Link the program */
                var program = gl.createProgram();
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);

                // link the program.
                gl.linkProgram(program);

                // Check if it linked.
                var success = gl.getProgramParameter(program, gl.LINK_STATUS);
                if (!success) {
                    // something went wrong with the link

                    throw ("program filed to link:" + gl.getProgramInfoLog (program));
                }

                var shader = {};
                shader['program'] = program;

                //From https://github.com/greggman/webgl-fundamentals/blob/master/webgl/resources/webgl-utils.js

                //Get attributes
                var shaderAttribs = {};
                var attribNum = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
                for (var ii = 0; ii < attribNum; ++ii) {
                    var attribInfo = gl.getActiveAttrib(program, ii);
                    if (!attribInfo) {
                        break;
                    }
                    var index = gl.getAttribLocation(program, attribInfo.name);
                    shaderAttribs[attribInfo.name] = index;
                }
                shader.shaderAttributes = shaderAttribs;


                //Get uniforms
                var shaderUniforms = {};
                var uniformsNumber = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
                for (var ii = 0; ii < uniformsNumber; ++ii) {
                    var uniformInfo = gl.getActiveUniform(program, ii);
                    if (!uniformInfo) {
                        break;
                    }

                    var name = uniformInfo.name;
                    if (name.substr(-3) === "[0]") {
                        name = name.substr(0, name.length - 3);
                    }

                    var uniformLoc = gl.getUniformLocation(program, name);
                    shaderUniforms[name] = uniformLoc;
                }
                shader.shaderUniforms = shaderUniforms;

                return shader;
            },
            createBlackPixelTexture : function () {
                var gl = this.gl;
                var blackPixelTexture = gl.createTexture();

                gl.bindTexture(gl.TEXTURE_2D, blackPixelTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

                gl.generateMipmap(gl.TEXTURE_2D);

                gl.bindTexture(gl.TEXTURE_2D, null);

                this.blackPixelTexture = blackPixelTexture;
            },
            initGlContext : function (canvas){
                function throwOnGLError(err, funcName, args) {
                    throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
                }

                try {
                    var gl = canvas.getContext("webgl", {premultipliedAlpha: false, alpha: false }) || canvas.getContext("experimental-webgl", {premultipliedAlpha: false});
                    gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
                }
                catch(e) {}

                if (!gl) {
                    alert("Unable to initialize WebGL. Your browser may not support it.");
                    gl = null;
                }

                this.gl = gl;
                this.canvas = canvas;
            },
            initArrayInstancedExt : function (){
                var gl = this.gl;
                var instancing_ext = gl.getExtension('ANGLE_instanced_arrays');
                if (instancing_ext) {
                    this.instancing_ext = instancing_ext;
                }
            },
            initAnisotropicExt : function (){
                var gl = this.gl;
                var anisotropic_ext = gl.getExtension('EXT_texture_filter_anisotropic');
                if (anisotropic_ext) {
                    this.anisotropic_ext = anisotropic_ext;
                }
            },
            initCompressedTextureS3tcExt : function () {
                var gl = this.gl;
                var ext = (
                    gl.getExtension("WEBGL_compressed_texture_s3tc") ||
                    gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
                    gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
                );
                if (ext) {
                    this.comp_tex_ext = ext;
                }
            },
            initDepthTextureExt : function () {
                var gl = this.gl;

                var depth_texture_ext = gl.getExtension('WEBGL_depth_texture');
                if (depth_texture_ext) {
                    this.depth_texture_ext = depth_texture_ext;
                }
            },
            initDeferredRendering : function (){
                var gl = this.gl;

                var wdb_ext = gl.getExtension('WEBGL_draw_buffers');
                if (wdb_ext) {
                    gl.getExtension("WEBGL_depth_texture");
                    gl.getExtension("OES_texture_float");
                    gl.getExtension("OES_texture_float_linear");
                    // We can use deferred shading
                    this.deferredRendering = true;

                    // Taken from https://hacks.mozilla.org/2014/01/webgl-deferred-shading/
                    // And https://github.com/YuqinShao/Tile_Based_WebGL_DeferredShader/blob/master/deferredshading/deferred.js

                    var depthTexture = gl.createTexture();
                    var normalTexture = gl.createTexture();
                    var positionTexture = gl.createTexture();
                    var colorTexture = gl.createTexture();
                    var depthRGBTexture = gl.createTexture();

                    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.canvas.width, this.canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);


                    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.FLOAT, null);


                    gl.bindTexture(gl.TEXTURE_2D, positionTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.FLOAT, null);


                    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.FLOAT, null);


                    gl.bindTexture(gl.TEXTURE_2D, depthRGBTexture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.FLOAT, null);

                    var fbo = gl.createFramebuffer();
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                    var bufs = [];
                    bufs[0] = wdb_ext.COLOR_ATTACHMENT0_WEBGL;
                    bufs[1] = wdb_ext.COLOR_ATTACHMENT1_WEBGL;
                    bufs[2] = wdb_ext.COLOR_ATTACHMENT2_WEBGL;
                    bufs[3] = wdb_ext.COLOR_ATTACHMENT3_WEBGL;
                    wdb_ext.drawBuffersWEBGL(bufs);

                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[0], gl.TEXTURE_2D, depthRGBTexture, 0);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[1], gl.TEXTURE_2D, normalTexture, 0);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[2], gl.TEXTURE_2D, positionTexture, 0);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[3], gl.TEXTURE_2D, colorTexture, 0);


                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
            },
            initShaders : function (){
                var self = this;
                var promise = null;
                var promisesArray = [];

                /* Get and compile shaders */
                promise = $http.get("glsl/renderFrameBufferShader.glsl")
                    .then(function success(result){
                        var shaderText = result.data;
                        var shader = self.compileShader(shaderText, shaderText);
                        self.renderFrameShader = shader;
                    },function error(){
                        throw 'could not load shader'
                    });
                promisesArray.push(promise);

                promise = $http.get("glsl/WmoShader.glsl")
                    .then(function success(result){
                        var shaderText = result.data;
                        var shader = self.compileShader(shaderText, shaderText);
                        self.wmoShader = shader;

                        var instancingShader = self.compileShader("#define INSTANCED 1\r\n "+shaderText, "#define INSTANCED 1\r\n "+shaderText);
                        self.wmoInstancingShader = instancingShader;
                    },function error(){
                        throw 'could not load shader'
                    });
                promisesArray.push(promise);

                promise = $http.get("glsl/m2Shader.glsl")
                    .then(function success(result){
                        var shaderText = result.data;
                        var shader = self.compileShader(shaderText, shaderText);
                        self.m2Shader = shader;

                        var instancingShader = self.compileShader("#define INSTANCED 1\r\n "+shaderText, "#define INSTANCED 1\r\n "+shaderText);
                        self.m2InstancingShader = instancingShader;
                    },function error(){
                        throw 'could not load shader'
                    });
                promisesArray.push(promise);

                promise = $http.get("glsl/drawBBShader.glsl")
                    .then(function success(result){
                        var shaderText = result.data;
                        var shader = self.compileShader(shaderText, shaderText);
                        self.bbShader = shader;
                    },function error(){
                        throw 'could not load shader'
                    });

                promisesArray.push(promise);promise = $http.get("glsl/adtShader.glsl")
                    .then(function success(result){
                        var shaderText = result.data;
                        var shader = self.compileShader(shaderText, shaderText);
                        self.adtShader = shader;
                    },function error(){
                        throw 'could not load shader'
                    });
                promisesArray.push(promise);


                return $q.all(promisesArray)
            },
            initCaches : function (){
                this.wmoGeomCache = new wmoGeomCache(this.sceneApi);
                this.wmoMainCache = new wmoMainCache(this.sceneApi);
                this.textureCache = new textureWoWCache(this.sceneApi);
                this.m2GeomCache = new m2GeomCache(this.sceneApi);
                this.skinGeomCache = new skinGeomCache(this.sceneApi);
                this.adtGeomCache = new adtGeomCache(this.sceneApi);
            },
            initRenderBuffers : function () {
                var gl = this.gl;
                if(!this.depth_texture_ext) { return; }

                // Create a color texture
                var colorTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, colorTexture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

                // Create the depth texture
                var depthTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.canvas.width, this.canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

                var framebuffer = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

                this.frameBuffer = framebuffer;
                this.frameBufferColorTexture = colorTexture;


                var verts = [
                    1,  1,
                    -1,  1,
                    -1, -1,
                    1,  1,
                    -1, -1,
                    1, -1,
                ];
                var vertBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

                this.vertBuffer = vertBuffer;
            },
            initSceneGraph : function () {
                this.graphManager = new graphManager(this.sceneApi);
            },
            initSceneApi : function() {
                var self = this;
                this.sceneApi = {
                    getGlContext: function () {
                        return self.gl;
                    },
                    getCurrentWdt : function (){
                        return self.currentWdt;
                    },
                    getBlackPixelTexture : function () {
                        return self.blackPixelTexture;
                    },
                    extensions : {
                        getInstancingExt : function (){
                            return self.instancing_ext;
                        },
                        getAnisotropicExt : function () {
                            return self.anisotropic_ext;
                        },
                        getComprTextExt : function () {
                            return self.comp_tex_ext;
                        }
                    },
                    shaders : {
                        activateAdtShader : function () {
                            self.activateAdtShader();
                        },
                        activateWMOShader : function () {
                            self.activateWMOShader()
                        },
                        deactivateWMOShader : function () {
                            self.deactivateWMOShader()
                        },
                        activateM2Shader : function () {
                            self.activateM2Shader()
                        },
                        deactivateM2Shader : function () {
                            self.deactivateM2Shader();
                        },
                        activateM2InstancingShader : function (){
                            self.activateM2InstancingShader();
                        },
                        deactivateM2InstancingShader : function (){
                            self.deactivateM2InstancingShader();
                        },
                        getShaderUniforms: function () {
                            return self.currentShaderProgram.shaderUniforms;
                        },
                        getShaderAttributes: function () {
                            return self.currentShaderProgram.shaderAttributes;
                        }

                    },

                    objects : {
                        loadAdtM2Obj : function (doodad){
                            return self.graphManager.addAdtM2Object(doodad);
                        },
                        loadAdtWmo : function (wmoDef){
                            return self.graphManager.addWmoObject(wmoDef);
                        },
                        loadWmoM2Obj : function (doodadDef, placementMatrix, useLocalLightning){
                            return self.graphManager.addWmoM2Object(doodadDef, placementMatrix, useLocalLightning);
                        },
                        loadAdtChunk: function(fileName) {
                            return self.graphManager.addADTObject(fileName)
                        }
                    },
                    resources : {
                        loadTexture: function (fileName) {
                            return self.textureCache.loadTexture(fileName);
                        },
                        unLoadTexture: function (fileName) {
                            self.textureCache.unLoadTexture(fileName);
                        },
                        loadWmoMain: function (fileName) {
                            return self.wmoMainCache.loadWmoMain(fileName);
                        },
                        unloadWmoMain: function (fileName) {
                            self.wmoMainCache.unloadWmoMain(fileName);
                        },
                        loadWmoGeom: function (fileName) {
                            return self.wmoGeomCache.loadWmoGeom(fileName);
                        },
                        unloadWmoGeom: function (fileName) {
                            self.wmoGeomCache.unLoadWmoGeom(fileName);
                        },
                        loadM2Geom: function (fileName) {
                            return self.m2GeomCache.loadM2(fileName);
                        },
                        unloadM2Geom: function (fileName) {
                            self.m2GeomCache.unLoadM2(fileName);
                        },
                        loadSkinGeom: function (fileName) {
                            return self.skinGeomCache.loadSkin(fileName);
                        },
                        unloadSkinGeom: function (fileName) {
                            self.skinGeomCache.unLoadSkin(fileName);
                        },
                        loadAdtGeom: function (fileName) {
                            return self.adtGeomCache.loadAdt(fileName);
                        },
                        unloadAdtGeom: function (fileName) {
                            self.adtGeomCache.unLoadAdt(fileName);
                        }
                    }
                };
            },
            initCamera : function (canvas, document){
                this.camera = firstPersonCamera(canvas, document);
            },
            initBoxVBO : function(){
                var gl = this.gl;

                //From https://en.wikibooks.org/wiki/OpenGL_Programming/Bounding_box
                var vertices = [
                    -1, -1, -1, //0
                    1, -1, -1,  //1
                    1, -1, 1,   //2
                    -1, -1, 1,  //3
                    -1, 1, 1,   //4
                    1, 1, 1,    //5
                    1, 1, -1,   //6
                    -1, 1, -1,  //7
                ];

                var vbo_vertices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vbo_vertices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                var elements = [
                    0, 1, 1, 2, 2, 3, 3, 0,
                    4, 5, 5, 6, 6, 7, 7, 4,
                    7, 6, 6, 1, 1, 0, 0, 7,
                    3, 2, 2, 5, 5, 4, 4, 3,
                    6, 5, 5, 2, 2, 1, 1, 6,
                    0, 3, 3, 4, 4, 7, 7, 0
                ];
                var ibo_elements = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo_elements);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(elements), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
                this.bbBoxVars = {
                    vbo_vertices : vbo_vertices,
                    ibo_elements : ibo_elements
                }
            },

            glClearScreen : function(gl){
                gl.clearDepth(1.0);
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);

                gl.disable(gl.BLEND);
                gl.clearColor(0.6, 0.95, 1.0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.disable(gl.CULL_FACE);
            },                  
            activateRenderFrameShader : function() {
                this.currentShaderProgram = this.renderFrameShader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    gl.useProgram(this.currentShaderProgram.program);
                    var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                    gl.activeTexture(gl.TEXTURE0);
                }
            },
            activateAdtShader : function(){
                this.currentShaderProgram = this.adtShader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    var instExt = this.sceneApi.extensions.getInstancingExt();
                    var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                    gl.useProgram(this.currentShaderProgram.program);

                    gl.enableVertexAttribArray(shaderAttributes.aHeight);
                    gl.enableVertexAttribArray(shaderAttributes.aIndex);

                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);

                    if (this.currentWdt && ((this.currentWdt.flags & 0x04) > 0)) {
                        gl.uniform1i(this.currentShaderProgram.shaderUniforms.uNewFormula, 1);
                    } else {
                        gl.uniform1i(this.currentShaderProgram.shaderUniforms.uNewFormula, 0);
                    }

                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uLayer0, 0);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uAlphaTexture, 1);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uLayer1, 2);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uLayer2, 3);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uLayer3, 4);
                }
            },
            activateWMOShader : function() {
                this.currentShaderProgram = this.wmoShader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    gl.useProgram(this.currentShaderProgram.program);
                    var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                    gl.enableVertexAttribArray(shaderAttributes.aPosition);
                    //gl.disableVertexAttribArray(shaderAttributes.aNormal);
                    gl.enableVertexAttribArray(shaderAttributes.aTexCoord);

                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);

                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture2, 1);

                    gl.activeTexture(gl.TEXTURE0);
                }
            },
            deactivateWMOShader : function () {
                var gl = this.gl;
                var instExt = this.sceneApi.extensions.getInstancingExt();
                var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                //gl.disableVertexAttribArray(shaderAttributes.aPosition);
                if (shaderAttributes.aNormal) {
                    gl.disableVertexAttribArray(shaderAttributes.aNormal);
                }

                gl.disableVertexAttribArray(shaderAttributes.aTexCoord);
                gl.disableVertexAttribArray(shaderAttributes.aTexCoord2);

                gl.disableVertexAttribArray(shaderAttributes.aColor);
                gl.disableVertexAttribArray(shaderAttributes.aColor2);
            },
            activateM2Shader : function() {
                this.currentShaderProgram = this.m2Shader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    gl.useProgram(this.currentShaderProgram.program);
                    var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                    gl.enableVertexAttribArray(shaderAttributes.aPosition);
                    if (shaderAttributes.aNormal) {
                        gl.enableVertexAttribArray(shaderAttributes.aNormal);
                    }
                    gl.enableVertexAttribArray(shaderAttributes.boneWeights);
                    gl.enableVertexAttribArray(shaderAttributes.bones);
                    gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
                    gl.enableVertexAttribArray(shaderAttributes.aTexCoord2);
                    gl.disableVertexAttribArray(shaderAttributes.aColor);

                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.isBillboard, 0);

                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);
                    gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture2, 1);


                    gl.activeTexture(gl.TEXTURE0);
                }
            },
            deactivateM2Shader : function () {
                var gl = this.gl;
                var instExt = this.sceneApi.extensions.getInstancingExt();
                var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                //gl.disableVertexAttribArray(shaderAttributes.aPosition);
                if (shaderAttributes.aNormal) {
                    gl.disableVertexAttribArray(shaderAttributes.aNormal);
                }
                gl.disableVertexAttribArray(shaderAttributes.boneWeights);
                gl.disableVertexAttribArray(shaderAttributes.bones);

                gl.disableVertexAttribArray(shaderAttributes.aTexCoord);
                gl.disableVertexAttribArray(shaderAttributes.aTexCoord2);
            },
            activateM2InstancingShader : function () {
                this.currentShaderProgram = this.m2InstancingShader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    var instExt = this.sceneApi.extensions.getInstancingExt();
                    var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                    gl.useProgram(this.currentShaderProgram.program);

                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);

                    gl.activeTexture(gl.TEXTURE0);

                    gl.enableVertexAttribArray(shaderAttributes.aPosition);
                    if (shaderAttributes.aNormal) {
                        gl.enableVertexAttribArray(shaderAttributes.aNormal);
                    }
                    gl.enableVertexAttribArray(shaderAttributes.boneWeights);
                    gl.enableVertexAttribArray(shaderAttributes.bones);
                    gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
                    gl.enableVertexAttribArray(shaderAttributes.aTexCoord2);
                    gl.disableVertexAttribArray(shaderAttributes.aColor);

                    gl.enableVertexAttribArray(shaderAttributes.uPlacementMat + 0);
                    gl.enableVertexAttribArray(shaderAttributes.uPlacementMat + 1);
                    gl.enableVertexAttribArray(shaderAttributes.uPlacementMat + 2);
                    gl.enableVertexAttribArray(shaderAttributes.uPlacementMat + 3);
                    if (instExt != null) {
                        instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 0, 1);
                        instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 1, 1);
                        instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 2, 1);
                        instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 3, 1);
                    }
                }

            },
            deactivateM2InstancingShader : function () {
                var gl = this.gl;
                var instExt = this.sceneApi.extensions.getInstancingExt();
                var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

                //gl.disableVertexAttribArray(shaderAttributes.aPosition);
                if (shaderAttributes.aNormal) {
                    gl.disableVertexAttribArray(shaderAttributes.aNormal);
                }
                gl.disableVertexAttribArray(shaderAttributes.boneWeights);
                gl.disableVertexAttribArray(shaderAttributes.bones);
                gl.disableVertexAttribArray(shaderAttributes.aTexCoord);
                gl.disableVertexAttribArray(shaderAttributes.aTexCoord2);

                if (instExt) {
                    instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 0, 0);
                    instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 1, 0);
                    instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 2, 0);
                    instExt.vertexAttribDivisorANGLE(shaderAttributes.uPlacementMat + 3, 0);
                }
                gl.disableVertexAttribArray(shaderAttributes.uPlacementMat + 0);
                gl.disableVertexAttribArray(shaderAttributes.uPlacementMat + 1);
                gl.disableVertexAttribArray(shaderAttributes.uPlacementMat + 2);
                gl.disableVertexAttribArray(shaderAttributes.uPlacementMat + 3);

            },
            activateBoundingBoxShader : function () {
                this.currentShaderProgram = this.bbShader;
                if (this.currentShaderProgram) {
                    var gl = this.gl;
                    gl.useProgram(this.currentShaderProgram.program);

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bbBoxVars.ibo_elements);
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.bbBoxVars.vbo_vertices);

                    gl.enableVertexAttribArray(this.currentShaderProgram.shaderAttributes.aPosition);
                    gl.vertexAttribPointer(this.currentShaderProgram.shaderAttributes.aPosition, 3, gl.FLOAT, false, 0, 0);  // position

                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
                    gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);
                }
            },


            draw : function (deltaTime) {
                var gl = this.gl;

                gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
                //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                var cameraVecs = this.camera.tick(deltaTime);

                var lookAtMat4 = [];
                mat4.lookAt(lookAtMat4, cameraVecs.cameraVec3, cameraVecs.lookAtVec3, [0,0,1]);

                var perspectiveMatrix = [];
                mat4.perspective(perspectiveMatrix, 45.0, this.canvas.width / this.canvas.height, 1, 1000  );

                this.perspectiveMatrix = perspectiveMatrix;
                this.lookAtMat4 = lookAtMat4;

                if (!this.isShadersLoaded) return;

                this.glClearScreen(gl);
                gl.activeTexture(gl.TEXTURE0);

                this.stats.begin();

                this.graphManager.setCameraPos(
                    vec4.fromValues(
                        cameraVecs.cameraVec3[0],
                        cameraVecs.cameraVec3[1],
                        cameraVecs.cameraVec3[2],
                        1
                    )
                );
                this.graphManager.setLookAtMat(lookAtMat4);
                this.graphManager.update(deltaTime);

                this.graphManager.draw();
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                //Draw frameBuffer

                this.activateRenderFrameShader();
                this.glClearScreen(gl);


                gl.bindTexture(gl.TEXTURE_2D, this.frameBufferColorTexture);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                this.stats.end();

                return cameraVecs;
            },


            loadM2File : function (mddf) {
                this.sceneApi.objects.loadAdtM2Obj(mddf);
            },
            loadWMOFile : function(modf){
                this.sceneApi.objects.loadAdtWmo(modf);
            },
            loadMap : function (mapName, x, y){
                var self = this;
                var wdtFileName = "world/maps/"+mapName+"/"+mapName+".wdt";

                wdtLoader(wdtFileName).then(function success(wdtFile){
                    self.currentWdt = wdtFile;
                    if (wdtFile.isWMOMap) {

                        self.sceneApi.objects.loadAdtWmo(wdtFile.modfChunk)
                    } else {
                        var adtFileName = "world/maps/"+mapName+"/"+mapName+"_"+x+"_"+y+".adt";
                        self.graphManager.addADTObject(adtFileName);
                    }

                }, function error(){
                })
            },
            setCameraPos : function (x, y, z) {
                this.camera.setCameraPos(x,y,z);
            }
        };

        return Scene;
    }]);
})(window, jQuery);