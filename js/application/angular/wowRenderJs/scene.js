import Stats from 'stats.js';
import axios from 'axios';

import drawDepthShader          from 'drawDepthShader.glsl';
import renderFrameBufferShader  from 'renderFrameBufferShader.glsl';
import readDepthBuffer          from 'readDepthBuffer.glsl';
import wmoShader                from 'WmoShader.glsl';
import m2Shader                 from 'm2Shader.glsl';
import drawBBShader             from 'drawBBShader.glsl';
import adtShader                from 'adtShader.glsl';
import drawPortalShader         from 'drawPortalShader.glsl';
import drawFrustumShader        from 'drawFrustum.glsl';
import textureCompositionShader from 'textureCompositionShader.glsl';

import GraphManager from './manager/sceneGraphManager.js'
import WorldObjectManager from './manager/worldObjectManager.js'
import config from './../services/config.js'

import wdtLoader from './../services/map/wdtLoader.js';

import AdtGeomCache    from './geometry/adtGeomCache.js';
import M2GeomCache     from './geometry/m2GeomCache.js';
import SkinGeomCache   from './geometry/skinGeomCache.js';
import WmoGeomCache    from './geometry/wmoGeomCache.js';
import WmoMainCache    from './geometry/wmoMainCache.js';
import TextureWoWCache from './texture/textureCache.js';

import firstPersonCamera from './camera/firstPersonCamera.js'

import {mat4, vec4, vec3, glMatrix} from 'gl-matrix'

/* DBC stuff */
import $q from 'q';
import animationDataDBC             from './../services/dbc/animationDataDBC.js'
import characterFacialHairStylesDBC from './../services/dbc/characterFacialHairStylesDBC.js'
import charHairGeosetsDBC           from './../services/dbc/charHairGeosetsDBC.js'
import charSectionsDBC              from './../services/dbc/charSectionsDBC.js'
import creatureDisplayInfoDBC       from './../services/dbc/creatureDisplayInfoDBC.js'
import lightDBC                     from './../services/dbc/lightDBC.js'
import lightParamsDBC               from './../services/dbc/lightParamsDBC.js'
import lightFloatBandDBC            from './../services/dbc/lightFloatBandDBC.js'
import lightIntBandDBC              from './../services/dbc/lightIntBandDBC.js'
import creatureDisplayInfoExtraDBC  from './../services/dbc/creatureDisplayInfoExtraDBC.js'
import creatureModelDataDBC         from './../services/dbc/creatureModelDataDBC.js'
import gameObjectDisplayInfoDBC     from './../services/dbc/gameObjectDisplayInfoDBC.js'
import helmetGeosetVisDataDBC       from './../services/dbc/helmetGeosetVisDataDBC.js'
import itemDisplayInfoDBC           from './../services/dbc/itemDisplayInfoDBC.js'
import itemDBC                      from './../services/dbc/itemDBC.js'
import mapDBC                       from './../services/dbc/mapDBC.js'

/*************/

glMatrix.setMatrixArrayType(Array);


class Scene {
    constructor(canvas) {
        var stats = new Stats();
        stats.setMode(1); // 0: fps, 1: ms, 2: mb

        // align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.body.appendChild(stats.domElement);
        this.stats = stats;

        var self = this;
        self.enableDeferred = false;

        self.sceneObjectList = [];
        self.sceneAdts = [];

        this.secondCamera = [0,0,0];
        this.secondCameraLookAt = [0,0,0];

        this.mainCamera = [0,0,0];
        this.mainCameraLookAt = [0,0,0];
        this.fogColor = [0.117647, 0.207843, 0.392157];

        this.uFogStart = -1;
        this.uFogEnd  = -1;

        self.initGlContext(canvas);
        self.initArrayInstancedExt();
        self.initDepthTextureExt();
        if (self.enableDeferred) {
            self.initDeferredRendering();
        }
        self.initRenderBuffers();
        self.initAnisotropicExt();
        self.initVertexArrayObjectExt();
        self.initCompressedTextureS3tcExt();
        self.initFrameTerminatorExt();

        self.initShaders()
        self.isShadersLoaded = true;

        self.initSceneApi();
        self.initSceneGraph();
        self.createBlackPixelTexture();

        self.initBoxVBO();
        self.initTextureCompVBO();
        self.initCaches();
        self.initCamera(canvas, document);

        /* Unit and Player data */
        animationDataDBC().then(function success(a) {
            self.animationDataDBC = a;
        });
        characterFacialHairStylesDBC().then(function success(a) {
            self.characterFacialHairStylesDBC = a;
        });
        charHairGeosetsDBC().then(function success(a) {
            self.charHairGeosetsDBC = a;
        });
        charSectionsDBC().then(function success(a) {
            self.charSectionsDBC = a;
        });
        creatureDisplayInfoDBC().then(function success(a) {
            self.creatureDisplayInfoDBC = a;
        });
        creatureDisplayInfoExtraDBC().then(function success(a) {
            self.creatureDisplayInfoExtraDBC = a;
        });
        creatureModelDataDBC().then(function success(a) {
            self.creatureModelDataDBC = a;
        });
        gameObjectDisplayInfoDBC().then(function success(a) {
            self.gameObjectDisplayInfoDBC = a;
        });
        itemDisplayInfoDBC().then(function success(a) {
            self.itemDisplayInfoDBC = a;
        });
        itemDBC().then(function success(a) {
            self.itemDBC = a;
        });
        helmetGeosetVisDataDBC().then(function success(a) {
            self.helmetGeosetVisDataDBC = a;
        });

        /* Map and area data */
        mapDBC().then(function success(a) {
            self.mapDBC = a;
        });



        /* Lights information */
        lightDBC().then(function success(a) {
            self.lightDBC = a;
        });
        lightFloatBandDBC().then(function success(a) {
            self.lightFloatBandDBC = a;
        });
        lightIntBandDBC().then(function success(a) {
            self.lightIntBandDBC = a;
        });
        lightParamsDBC().then(function success(a) {
            self.lightParamsDBC = a;
        });

    }

    compileShader (vertShaderString, fragmentShaderString) {
        var gl = this.gl;

        if (this.enableDeferred) {
            vertShaderString = "#define ENABLE_DEFERRED 1\r\n"+vertShaderString;
            fragmentShaderString = "#define ENABLE_DEFERRED 1\r\n"+fragmentShaderString;
        }

        /* 1.1 Compile vertex shader */
        var maxMatrixUniforms = (gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) / 4) - 6;

        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, "#define MAX_MATRIX_NUM "+maxMatrixUniforms+"\r\n"+"#define COMPILING_VS 1\r\n "+vertShaderString);
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
    }
    createBlackPixelTexture() {
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
    }
    initGlContext (canvas){
        function throwOnGLError(err, funcName, args) {
            throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
        }
        function validateNoneOfTheArgsAreUndefined(functionName, args) {
            for (var ii = 0; ii < args.length; ++ii) {
                if (args[ii] === undefined) {
                    console.error("undefined passed to gl." + functionName + "(" +
                        WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
                }
            }
        }

        try {
            var gl = canvas.getContext("webgl", {premultipliedAlpha: false, alpha: false }) || canvas.getContext("experimental-webgl", {premultipliedAlpha: false});
            gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError, validateNoneOfTheArgsAreUndefined);
        }
        catch(e) {}

        if (!gl) {
            alert("Unable to initialize WebGL. Your browser may not support it.");
            gl = null;
        }

        this.gl = gl;
        this.canvas = canvas;
    }
    initArrayInstancedExt(){
        var gl = this.gl;
        var instancing_ext = gl.getExtension('ANGLE_instanced_arrays');
        if (instancing_ext) {
            this.instancing_ext = instancing_ext;
        }
    }
    initAnisotropicExt (){
        var gl = this.gl;
        var anisotropic_ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (anisotropic_ext) {
            this.anisotropic_ext = anisotropic_ext;
        }
    }
    initVertexArrayObjectExt () {
        var gl = this.gl;
        var vao_ext = gl.getExtension("OES_vertex_array_object")
        if (vao_ext) {
            this.vao_ext = vao_ext;
        }
    }
    initCompressedTextureS3tcExt () {
        var gl = this.gl;
        var ext = (
            gl.getExtension("WEBGL_compressed_texture_s3tc") ||
            gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
            gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
        );
        if (ext) {
            this.comp_tex_ext = ext;
        }  else {
            this.comp_tex_ext = null;
        }
    }
    initDepthTextureExt () {
        var gl = this.gl;

        var depth_texture_ext = gl.getExtension('WEBGL_depth_texture');
        if (depth_texture_ext) {
            this.depth_texture_ext = depth_texture_ext;
        }
    }
    initDeferredRendering (){
        var gl = this.gl;

        var wdb_ext = gl.getExtension('WEBGL_draw_buffers');
        if (wdb_ext) {
            this.wdb_ext = wdb_ext;
        } else {
            this.enableDeferred = false;
        }
    }
    //For WebInspector
    initFrameTerminatorExt() {
        var gl = this.gl;
        var glext_ft = gl.getExtension("GLI_frame_terminator")
        if (glext_ft) {
            this.glext_ft = glext_ft;
        }
    }
    initShaders (){
        var self = this;

        /* Get and compile shaders */
        self.textureCompositionShader = self.compileShader(textureCompositionShader, textureCompositionShader);

        self.renderFrameShader = self.compileShader(renderFrameBufferShader, renderFrameBufferShader);

        self.drawDepthBuffer = self.compileShader(drawDepthShader, drawDepthShader);

        self.readDepthBuffer = self.compileShader(readDepthBuffer, readDepthBuffer);

        self.wmoShader = self.compileShader(wmoShader, wmoShader);
        self.wmoInstancingShader = self.compileShader("#define INSTANCED 1\r\n " + wmoShader, "#define INSTANCED 1\r\n " + wmoShader);

        self.m2Shader = self.compileShader(m2Shader, m2Shader);
        self.m2InstancingShader = self.compileShader("#define INSTANCED 1\r\n " + m2Shader, "#define INSTANCED 1\r\n " + m2Shader);

        self.bbShader = self.compileShader(drawBBShader, drawBBShader);

        self.adtShader = self.compileShader(adtShader, adtShader);

        self.drawPortalShader = self.compileShader(drawPortalShader, drawPortalShader);
        self.drawFrustumShader = self.compileShader(drawFrustumShader, drawFrustumShader);
    }
    initCaches (){
        this.wmoGeomCache = new WmoGeomCache(this.sceneApi);
        this.wmoMainCache = new WmoMainCache(this.sceneApi);
        this.textureCache = new TextureWoWCache(this.sceneApi);
        this.m2GeomCache = new M2GeomCache(this.sceneApi);
        this.skinGeomCache = new SkinGeomCache(this.sceneApi);
        this.adtGeomCache = new AdtGeomCache(this.sceneApi);
    }
    initDrawBuffers (frameBuffer) {
        var gl = this.gl;
        var wdb_ext = this.wdb_ext;
        // Taken from https://hacks.mozilla.org/2014/01/webgl-deferred-shading/
        // And https://github.com/YuqinShao/Tile_Based_WebGL_DeferredShader/blob/master/deferredshading/deferred.js

        this.texture_floatExt = gl.getExtension("OES_texture_float");
        this.texture_floatLinExt = gl.getExtension("OES_texture_float_linear");

        var normalTexture = gl.createTexture();
        var positionTexture = gl.createTexture();
        var colorTexture = gl.createTexture();
        var depthRGBTexture = gl.createTexture();

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


        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        var bufs = [];
        bufs[0] = wdb_ext.COLOR_ATTACHMENT0_WEBGL;
        bufs[1] = wdb_ext.COLOR_ATTACHMENT1_WEBGL;
        bufs[2] = wdb_ext.COLOR_ATTACHMENT2_WEBGL;
        bufs[3] = wdb_ext.COLOR_ATTACHMENT3_WEBGL;
        wdb_ext.drawBuffersWEBGL(bufs);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[0], gl.TEXTURE_2D, depthRGBTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[1], gl.TEXTURE_2D, normalTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[2], gl.TEXTURE_2D, positionTexture, 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, bufs[3], gl.TEXTURE_2D, colorTexture, 0);

        this.depthRGBTexture = depthRGBTexture;
        this.normalTexture = normalTexture;
        this.positionTexture = positionTexture;
        this.colorTexture = colorTexture;
    }
    initRenderBuffers () {
        var gl = this.gl;
        if(!this.depth_texture_ext) { return; }

        var framebuffer = gl.createFramebuffer();
        if (this.enableDeferred) {
            this.initDrawBuffers(framebuffer)
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

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


        if (!this.enableDeferred) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
        }
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

        this.frameBuffer = framebuffer;
        this.frameBufferColorTexture = colorTexture;
        this.frameBufferDepthTexture = depthTexture;

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
    }
    initSceneGraph () {
        this.graphManager = new GraphManager(this.sceneApi);
        this.worldObjectManager = new WorldObjectManager(this.sceneApi);
    }
    initSceneApi () {
        var self = this;
        this.sceneApi = {
            drawCamera : function () {
                return self.drawCamera();
            },
            getGlContext: function () {
                return self.gl;
            },
            getCurrentWdt : function (){
                return self.currentWdt;
            },
            getBlackPixelTexture : function () {
                return self.blackPixelTexture;
            },
            setFogColor: function (color) {
                self.fogColor = color;
            },
            getFogColor: function () {
                return self.fogColor;
            },
            getIsDebugCamera() {
                return self.isDebugCamera;
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
                },
                getVaoExt : function () {
                    return self.vao_ext;
                }
            },
            shaders : {
                activateBoundingBoxShader : function () {
                    self.activateBoundingBoxShader();
                },
                deativateBoundingBoxShader : function() {
                    self.deactivateBoundingBoxShader();
                },
                activateFrustumBoxShader : function () {
                    self.activateFrustumBoxShader();
                },
                activateAdtShader : function () {
                    self.activateAdtShader();
                },
                activateDrawPortalShader : function () {
                    self.activateDrawPortalShader();
                },
                activateTextureCompositionShader : function (texture) {
                    self.activateTextureCompositionShader(texture);
                },
                deactivateTextureCompositionShader: function () {
                    self.deactivateTextureCompositionShader();
                },
                activateWMOShader : function () {
                    self.activateWMOShader()
                },
                deactivateWMOShader : function () {
                    self.deactivateWMOShader()
                },

                /* M2 shader functions */
                activateM2ShaderAttribs : function () {
                    self.activateM2ShaderAttribs();
                },
                deactivateM2ShaderAttribs : function () {
                    self.deactivateM2ShaderAttribs();
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
            dbc : {
                getCharacterFacialHairStylesDBC : function() {
                    return self.characterFacialHairStylesDBC;
                },
                getCharHairGeosetsDBC : function() {
                    return self.charHairGeosetsDBC;
                },
                getCharSectionsDBC : function () {
                    return self.charSectionsDBC;
                },
                getCreatureDisplayInfoDBC : function () {
                    return self.creatureDisplayInfoDBC;
                },
                getCreatureDisplayInfoExtraDBC : function () {
                    return self.creatureDisplayInfoExtraDBC;
                },
                getCreatureModelDataDBC : function () {
                    return self.creatureModelDataDBC;
                },
                getGameObjectDisplayInfoDBC : function () {
                    return self.gameObjectDisplayInfoDBC;
                },
                getItemDisplayInfoDBC : function () {
                    return self.itemDisplayInfoDBC;
                },
                getItemDBC : function () {
                    return self.itemDBC;
                },

                /* Map and area data */
                getMapDBC : function () {
                    return self.mapDBC;
                },

                /* Lights information */
                getLightDBC : function () {
                    return self.lightDBC;
                },
                getLightFloatBandDBC : function () {
                    return self.lightFloatBandDBC;
                },
                getLightIntBandDBC : function () {
                    return self.lightIntBandDBC;
                },
                getLightParamsDBC : function () {
                    return self.lightParamsDBC;
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
                loadWorldM2Obj : function (modelName, meshIds,replaceTextures){
                    return self.graphManager.addWorldMDXObject(modelName, meshIds,replaceTextures);
                },
                loadAdtChunk: function(fileName) {
                    return self.graphManager.addADTObject(0,0, fileName)
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
    }
    initCamera (canvas, document){
        this.camera = firstPersonCamera(canvas, document);
    }
    initBoxVBO (){
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
    }
    initTextureCompVBO (){
        var gl = this.gl;

        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Create the depth texture
        var depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, 1024, 1024, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //From https://en.wikibooks.org/wiki/OpenGL_Programming/Bounding_box
        var textureCoords = [
            0,0,
            1,0,
            0,1,
            1,1,
        ];

        var textureCoordsVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        var elements = [
            0,1,2,
            1,3,2
        ];
        var elementsIBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsIBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(elements), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


        this.textureCompVars = {
            textureCoords : textureCoordsVBO,
            elements : elementsIBO,
            framebuffer: framebuffer,
            depthTexture: depthTexture
        }
    }

    glClearScreen (gl, fogColor){
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.disable(gl.BLEND);
        //gl.clearColor(0.6, 0.95, 1.0, 1);
        //gl.clearColor(0.117647, 0.207843, 0.392157, 1);
        //gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.CULL_FACE);
    }
    activateRenderFrameShader () {
        this.currentShaderProgram = this.renderFrameShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.activeTexture(gl.TEXTURE0);

            gl.disableVertexAttribArray(1);

            gl.uniform2fv(this.currentShaderProgram.shaderUniforms.uResolution, new Float32Array([this.canvas.width, this.canvas.height]))

            gl.uniform1i(this.currentShaderProgram.shaderUniforms.u_sampler, 0);
            if (this.currentShaderProgram.shaderUniforms.u_depth) {
                gl.uniform1i(this.currentShaderProgram.shaderUniforms.u_depth, 1);
            }
        }
    }
    activateTextureCompositionShader(texture) {
        this.currentShaderProgram = this.textureCompositionShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureCompVars.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.textureCompVars.depthTexture, 0);


            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCompVars.textureCoords);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.textureCompVars.elements);


            gl.vertexAttribPointer(this.currentShaderProgram.shaderAttributes.aTextCoord, 2, gl.FLOAT, false, 0, 0);  // position

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);

            gl.depthMask(true);
            gl.disable(gl.CULL_FACE);

            gl.clearColor(0,0,1,1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.DEPTH_TEST);
            gl.depthMask(false);
            gl.viewport(0,0,1024,1024)
        }
    }
    activateRenderDepthShader () {
        this.currentShaderProgram = this.drawDepthBuffer;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();



            gl.activeTexture(gl.TEXTURE0);
        }
    }
    activateReadDepthBuffer () {
        this.currentShaderProgram = this.readDepthBuffer;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.activeTexture(gl.TEXTURE0);

            gl.enableVertexAttribArray(this.currentShaderProgram.shaderAttributes.position);
            gl.enableVertexAttribArray(this.currentShaderProgram.shaderAttributes.texture);

        }
    }
    activateAdtShader (){
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

            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogStart, this.uFogStart);
            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogEnd, this.uFogEnd);

            gl.uniform3fv(this.currentShaderProgram.shaderUniforms.uFogColor, this.fogColor);
        }
    }
    activateWMOShader () {
        this.currentShaderProgram = this.wmoShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.enableVertexAttribArray(shaderAttributes.aPosition);
            if (shaderAttributes.aNormal) {
                gl.enableVertexAttribArray(shaderAttributes.aNormal);
            }
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord2);
            gl.enableVertexAttribArray(shaderAttributes.aColor);
            gl.enableVertexAttribArray(shaderAttributes.aColor2);

            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);

            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);
            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture2, 1);

            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogStart, this.uFogStart);
            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogEnd, this.uFogEnd);

            gl.uniform3fv(this.currentShaderProgram.shaderUniforms.uFogColor, this.fogColor);

            gl.activeTexture(gl.TEXTURE0);
        }
    }
    deactivateWMOShader () {
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
    }
    deactivateTextureCompositionShader() {
        var gl = this.gl;
        gl.useProgram(this.currentShaderProgram.program);
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    activateM2ShaderAttribs() {
        var gl = this.gl;
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();
         gl.enableVertexAttribArray(shaderAttributes.aPosition);
         if (shaderAttributes.aNormal) {
            gl.enableVertexAttribArray(shaderAttributes.aNormal);
         }
         gl.enableVertexAttribArray(shaderAttributes.boneWeights);
         gl.enableVertexAttribArray(shaderAttributes.bones);
         gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
         gl.enableVertexAttribArray(shaderAttributes.aTexCoord2);
    }
    deactivateM2ShaderAttribs() {
        var gl = this.gl;
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.disableVertexAttribArray(shaderAttributes.aPosition);

        if (shaderAttributes.aNormal) {
            gl.disableVertexAttribArray(shaderAttributes.aNormal);
        }
        gl.disableVertexAttribArray(shaderAttributes.boneWeights);
        gl.disableVertexAttribArray(shaderAttributes.bones);

        gl.disableVertexAttribArray(shaderAttributes.aTexCoord);
        gl.disableVertexAttribArray(shaderAttributes.aTexCoord2);
        gl.enableVertexAttribArray(0);
    }
    activateM2Shader () {
        this.currentShaderProgram = this.m2Shader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);
            gl.enableVertexAttribArray(0);
            if (!this.vao_ext) {
                this.activateM2ShaderAttribs()
            }

            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);
            if (this.currentShaderProgram.shaderUniforms.isBillboard) {
                gl.uniform1i(this.currentShaderProgram.shaderUniforms.isBillboard, 0);
            }

            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);
            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture2, 1);

            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogStart, this.uFogStart);
            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogEnd, this.uFogEnd);

            gl.uniform3fv(this.currentShaderProgram.shaderUniforms.uFogColor, this.fogColor);


            gl.activeTexture(gl.TEXTURE0);
        }
    }
    deactivateM2Shader () {
        var gl = this.gl;
        var instExt = this.sceneApi.extensions.getInstancingExt();

        if (!this.vao_ext) {
            this.deactivateM2ShaderAttribs()
        }
    }
    activateM2InstancingShader () {
        this.currentShaderProgram = this.m2InstancingShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            var instExt = this.sceneApi.extensions.getInstancingExt();
            var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

            gl.useProgram(this.currentShaderProgram.program);

            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);

            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture, 0);
            gl.uniform1i(this.currentShaderProgram.shaderUniforms.uTexture2, 1);

            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogStart, this.uFogStart);
            gl.uniform1f(this.currentShaderProgram.shaderUniforms.uFogEnd, this.uFogEnd);

            gl.activeTexture(gl.TEXTURE0);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(shaderAttributes.aPosition);
            if (shaderAttributes.aNormal) {
                gl.enableVertexAttribArray(shaderAttributes.aNormal);
            }
            gl.enableVertexAttribArray(shaderAttributes.boneWeights);
            gl.enableVertexAttribArray(shaderAttributes.bones);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord);
            gl.enableVertexAttribArray(shaderAttributes.aTexCoord2);

            gl.enableVertexAttribArray(shaderAttributes.aPlacementMat + 0);
            gl.enableVertexAttribArray(shaderAttributes.aPlacementMat + 1);
            gl.enableVertexAttribArray(shaderAttributes.aPlacementMat + 2);
            gl.enableVertexAttribArray(shaderAttributes.aPlacementMat + 3);
            gl.enableVertexAttribArray(shaderAttributes.aDiffuseColor);
            if (instExt != null) {
                instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 0, 1);
                instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 1, 1);
                instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 2, 1);
                instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 3, 1);
                instExt.vertexAttribDivisorANGLE(shaderAttributes.aDiffuseColor, 1);
            }

            gl.uniform3fv(this.currentShaderProgram.shaderUniforms.uFogColor, this.fogColor);
        }

    }
    deactivateM2InstancingShader () {
        var gl = this.gl;
        var instExt = this.sceneApi.extensions.getInstancingExt();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.disableVertexAttribArray(shaderAttributes.aPosition);
        if (shaderAttributes.aNormal) {
            gl.disableVertexAttribArray(shaderAttributes.aNormal);
        }
        gl.disableVertexAttribArray(shaderAttributes.boneWeights);
        gl.disableVertexAttribArray(shaderAttributes.bones);
        gl.disableVertexAttribArray(shaderAttributes.aTexCoord);
        gl.disableVertexAttribArray(shaderAttributes.aTexCoord2);

        if (instExt) {
            instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 0, 0);
            instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 1, 0);
            instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 2, 0);
            instExt.vertexAttribDivisorANGLE(shaderAttributes.aPlacementMat + 3, 0);
        }
        gl.disableVertexAttribArray(shaderAttributes.aPlacementMat + 0);
        gl.disableVertexAttribArray(shaderAttributes.aPlacementMat + 1);
        gl.disableVertexAttribArray(shaderAttributes.aPlacementMat + 2);
        gl.disableVertexAttribArray(shaderAttributes.aPlacementMat + 3);

        gl.enableVertexAttribArray(0);
    }
    activateBoundingBoxShader () {
        this.currentShaderProgram = this.bbShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bbBoxVars.ibo_elements);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.bbBoxVars.vbo_vertices);

            //gl.enableVertexAttribArray(this.currentShaderProgram.shaderAttributes.aPosition);
            gl.vertexAttribPointer(this.currentShaderProgram.shaderAttributes.aPosition, 3, gl.FLOAT, false, 0, 0);  // position

            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);
        }
    }
    activateFrustumBoxShader () {
        this.currentShaderProgram = this.drawFrustumShader;
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
    }
    activateDrawPortalShader () {
        this.currentShaderProgram = this.drawPortalShader;
        if (this.currentShaderProgram) {
            var gl = this.gl;
            gl.useProgram(this.currentShaderProgram.program);

            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uLookAtMat, false, this.lookAtMat4);
            gl.uniformMatrix4fv(this.currentShaderProgram.shaderUniforms.uPMatrix, false, this.perspectiveMatrix);
        }
    }
    drawTexturedQuad(gl, texture, x, y, width, height, canv_width, canv_height, drawDepth) {
        gl.disable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);

        gl.vertexAttribPointer(this.drawDepthBuffer.shaderAttributes.position, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uWidth, width/canv_width);
        gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uHeight, height/canv_height);
        gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uX, x/canv_width);
        gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uY, y/canv_height);
        gl.uniform1i(this.drawDepthBuffer.shaderUniforms.drawDepth, (drawDepth) ? 1 : 0);

        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.enable(gl.DEPTH_TEST);
    }
    drawFrameBuffer () {
        var gl = this.gl;

        if (this.enableDeferred){
            gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
        } else {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBufferColorTexture);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.frameBufferDepthTexture);
        }
        var uniforms = this.currentShaderProgram.shaderUniforms;

        if(uniforms.gauss_offsets) {
            gl.uniform1fv(uniforms.gauss_offsets, [0.0/this.canvas.height, 1.0/this.canvas.height, 2.0/this.canvas.height, 3.0/this.canvas.height, 4.0/this.canvas.height]);
            gl.uniform1fv(uniforms.gauss_weights, [0.2270270270, 0.1945945946, 0.1216216216,0.0540540541, 0.0162162162]);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    drawCamera () {
        var gl = this.gl;
        var uniforms = this.currentShaderProgram.shaderUniforms;

        gl.disable(gl.DEPTH_TEST);

        var invViewFrustum = mat4.create();
        mat4.invert(invViewFrustum, this.viewCameraForRender);


        gl.uniformMatrix4fv(uniforms.uInverseViewProjection, false, new Float32Array(invViewFrustum));

        gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.DEPTH_TEST);
    }
    draw (deltaTime) {
        var gl = this.gl;
        if (!this.depthBuffer) {
            var depthBuffer = new Uint8Array(this.canvas.width*this.canvas.height*4);
            this.depthBuffer = depthBuffer;
        }

        this.stats.begin();
        var cameraVector;

        if (config.getUseSecondCamera()) {
            cameraVector = this.secondCamera;
        } else {
            cameraVector = this.mainCamera;
        }

        var farPlane = 400;
        var nearPlane = 1;
        var fov = 45.0;

        //If use camera settings
        //Figure out way to assign the object with camera
        //config.setCameraM2(this.graphManager.m2Objects[0]);
        var m2Object = config.getCameraM2();
        if (m2Object && m2Object.loaded) {
            m2Object.updateCameras(deltaTime);

            var cameraSettings = m2Object.cameras[0];
            farPlane = cameraSettings.farClip;
            nearPlane = cameraSettings.nearClip;
            fov = cameraSettings.fov * 32 * Math.PI / 180;

            this.mainCamera = cameraSettings.currentPosition;
            vec4.transformMat4(this.mainCamera, this.mainCamera, m2Object.placementMatrix);
            this.mainCameraLookAt = cameraSettings.currentTarget;
            vec4.transformMat4(this.mainCameraLookAt, this.mainCameraLookAt, m2Object.placementMatrix);
            cameraVecs = {
                lookAtVec3: this.mainCameraLookAt,
                cameraVec3: this.mainCamera,
                staticCamera: true
            }
        }

        if (this.uFogStart == -1) {
            this.uFogStart = farPlane - 10;
        }
        if (this.uFogEnd == -1) {
            this.uFogEnd = farPlane;
        }

        if (!(m2Object && m2Object.loaded) || config.getUseSecondCamera()){
            this.camera.setCameraPos(cameraVector[0], cameraVector[1], cameraVector[2]);
            var cameraVecs = this.camera.tick(deltaTime);


            if (config.getUseSecondCamera()) {
                this.secondCamera = cameraVecs.cameraVec3;
                this.secondCameraLookAt = cameraVecs.lookAtVec3;
            } else {
                this.mainCamera = cameraVecs.cameraVec3;
                this.mainCameraLookAt = cameraVecs.lookAtVec3;
            }
        }

        var adt_x = Math.floor((32 - (this.mainCamera[1] / 533.33333)));
        var adt_y = Math.floor((32 - (this.mainCamera[0] / 533.33333)));

        //TODO: HACK!!
        for (var x = adt_x-1; x <= adt_x+1; x++) {
            for (var y = adt_y-1; y <= adt_y+1; y++) {
                this.addAdtChunkToCurrentMap(x, y);
            }
        }

        var lookAtMat4 = [];

        mat4.lookAt(lookAtMat4, this.mainCamera, this.mainCameraLookAt, [0,0,1]);

        //Second camera for debug
        var secondLookAtMat = [];
        mat4.lookAt(secondLookAtMat, this.secondCamera, this.secondCameraLookAt, [0,0,1]);

        var perspectiveMatrix = mat4.create();
        mat4.perspective(perspectiveMatrix, fov, this.canvas.width / this.canvas.height, nearPlane, farPlane);
        //var o_height = (this.canvas.height * (533.333/256/* zoom 7 in Alram viewer */))/ 8 ;
        //var o_width = o_height * this.canvas.width / this.canvas.height;
        //mat4.ortho(perspectiveMatrix, -o_width, o_width, -o_height, o_height, 1, 1000);


        var perspectiveMatrixForCulling = mat4.create();
        mat4.perspective(perspectiveMatrixForCulling, fov, this.canvas.width / this.canvas.height, nearPlane, farPlane);

        //Camera for rendering
        var perspectiveMatrixForCameraRender = mat4.create();
        mat4.perspective(perspectiveMatrixForCameraRender, fov, this.canvas.width / this.canvas.height, nearPlane, farPlane);

        var viewCameraForRender = mat4.create();
        mat4.multiply(viewCameraForRender, perspectiveMatrixForCameraRender,lookAtMat4)
        //

        this.perspectiveMatrix = perspectiveMatrix;
        this.viewCameraForRender = viewCameraForRender;
        if (!this.isShadersLoaded) return;

        var cameraPos = vec4.fromValues(
            this.mainCamera[0],
            this.mainCamera[1],
            this.mainCamera[2],
            1
        );
        this.graphManager.setCameraPos(cameraPos);

        //Matrixes from previous frame
        if (this.perspectiveMatrix && this.lookAtMat4) {
            //this.graphManager.checkAgainstDepthBuffer(this.perspectiveMatrix, this.lookAtMat4, this.floatDepthBuffer, this.canvas.width, this.canvas.height);
        }

        this.graphManager.setLookAtMat(lookAtMat4);

        // Update objects
        var updateRes = this.graphManager.update(deltaTime);
        this.worldObjectManager.update(deltaTime, cameraPos, lookAtMat4);

        this.graphManager.checkCulling(perspectiveMatrixForCulling, lookAtMat4);
        this.graphManager.sortGeometry(perspectiveMatrixForCulling, lookAtMat4);


        gl.viewport(0,0,this.canvas.width, this.canvas.height);
        if (config.getDoubleCameraDebug()) {
            //Draw static camera
            this.isDebugCamera = true;
            this.lookAtMat4 = secondLookAtMat;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

            this.glClearScreen(gl, this.fogColor);

            gl.activeTexture(gl.TEXTURE0);
            gl.depthMask(true);
            gl.enableVertexAttribArray(0);
            this.graphManager.draw();
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            //Draw debug camera from framebuffer into screen
            this.glClearScreen(gl, this.fogColor);
            this.activateRenderFrameShader();
            gl.viewport(0,0,this.canvas.width, this.canvas.height);
            gl.enableVertexAttribArray(0);
            this.drawFrameBuffer();

            this.isDebugCamera = false;
        }

        //Render real camera
        this.lookAtMat4 = lookAtMat4;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        this.glClearScreen(gl, this.fogColor);

        gl.activeTexture(gl.TEXTURE0);
        gl.depthMask(true);
        gl.enableVertexAttribArray(0);
        this.graphManager.draw();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (!config.getDoubleCameraDebug()) {
            //Draw real camera into screen

            this.glClearScreen(gl, this.fogColor);
            gl.enableVertexAttribArray(0);
            this.activateRenderFrameShader();
            gl.viewport(0,0,this.canvas.width, this.canvas.height);
            this.drawFrameBuffer();
        } else {
            //Draw real camera into square at bottom of screen

            this.activateRenderDepthShader();
            gl.enableVertexAttribArray(0);
            this.drawTexturedQuad(gl, this.frameBufferColorTexture,
                this.canvas.width * 0.60,
                0,//this.canvas.height * 0.75,
                this.canvas.width * 0.40,
                this.canvas.height * 0.40,
                this.canvas.width, this.canvas.height);
        }
        if (config.getDrawDepthBuffer()) {
            this.activateRenderDepthShader();
            gl.enableVertexAttribArray(0);
            gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uFarPlane, farPlane);
            gl.uniform1f(this.drawDepthBuffer.shaderUniforms.uNearPlane, nearPlane);

            this.drawTexturedQuad(gl, this.frameBufferDepthTexture,
                this.canvas.width * 0.60,
                0,//this.canvas.height * 0.75,
                this.canvas.width * 0.40,
                this.canvas.height * 0.40,
                this.canvas.width, this.canvas.height,
                true);
        }



        this.stats.end();
        if (this.glext_ft && this.glext_ft.frameTerminator) {
            this.glext_ft.frameTerminator();
        }

        return {cameraVecs : cameraVecs, updateResult : updateRes};
    }
    loadM2File (mddf) {
        return this.sceneApi.objects.loadAdtM2Obj(mddf);
    }
    loadWMOFile(modf){
        this.graphManager.loadWmoMap(modf);
    }
    loadMap (mapName, x, y){
        var self = this;
        var wdtFileName = "world/maps/"+mapName+"/"+mapName+".wdt";


        wdtLoader(wdtFileName).then(function success(wdtFile){
            self.currentWdt = wdtFile;
            self.currentMapName = mapName;
            if (wdtFile.isWMOMap) {
                self.graphManager.loadWmoMap(wdtFile.modfChunk);
            } else {
                var adtFileName = "world/maps/"+mapName+"/"+mapName+"_"+x+"_"+y+".adt";
                self.graphManager.addADTObject(x, y, adtFileName);
            }

        }, function error(){
        })
    }
    addAdtChunkToCurrentMap(x,y) {
        if (!this.currentWdt) return;
        if (this.currentWdt.isWMOMap) return;

        if (this.currentWdt.tileTable[y][x]) {
            var adtFileName = "world/maps/"+this.currentMapName+"/"+this.currentMapName+"_"+x+"_"+y+".adt";
            this.graphManager.addADTObject(x, y, adtFileName);
        }
    }
    setCameraPos (x, y, z) {
        this.mainCamera = [x,y,z];
        //this.camera.setCameraPos(x,y,z);
    }
    setFogStart(value) {
        this.uFogStart  = value;
    }
    setFogEnd(value) {
        this.uFogEnd = value;
    }
    setFogColor(value) {
        this.fogColor = value;
    }
    loadPackets() {
        //this.worldObjectManager.loadAllPacket();
        this.worldObjectManager.startPlayingPackets();
    }
    loadAllPackets() {
        this.worldObjectManager.loadAllPacket();
    }
    copyFirstCameraToDebugCamera() {
        this.secondCamera = this.mainCamera
        this.secondCameraLookAt = this.mainCameraLookAt;
    }
}

export default Scene;