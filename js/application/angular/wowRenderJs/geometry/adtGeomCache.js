import cacheTemplate from './../cache.js';

class ADTGeom {
    constructor(sceneApi, wdtFile) {
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.wdtFile = wdtFile;
        this.combinedVBO = null;
        this.textureArray = new Array(255);
        for (var i = 0; i < 256; i++) {
            this.textureArray[i] = [];
        }
    }

    assign(adtFile) {
        this.adtFile = adtFile;
    }
    loadTextures() {
        var gl = this.gl;
        var mcnkObjs = this.adtFile.mcnkObjs;

        /* 1. Load rgb textures */
        for (var i = 0; i < mcnkObjs.length; i++) {
            var mcnkObj = mcnkObjs[i];

            if (mcnkObj.textureLayers && (mcnkObj.textureLayers.length > 0)) {
                for (var j = 0; j < mcnkObj.textureLayers.length; j++) {
                    //if (mcnkObj.textureLayers[j].textureID < 0)
                    this.loadTexture(i, j, mcnkObj.textureLayers[j].textureName);
                }
            }
        }

        /* 2. Load alpha textures */
        var chunkCount = mcnkObjs.length;
        var maxAlphaTexPerChunk = 4;
        var alphaTexSize = 64;

        var texWidth = maxAlphaTexPerChunk * alphaTexSize;
        var texHeight = alphaTexSize;

        var megaAlphaTexture = parseAlphaTextures(this.adtFile, this.wdtFile);
        var alphaTextures = [];
        for (var i = 0; i < mcnkObjs.length; i++) {
            var alphaTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, alphaTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, texWidth, texHeight, 0, gl.ALPHA, gl.UNSIGNED_BYTE, new Uint8Array(megaAlphaTexture[i]));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.generateMipmap(gl.TEXTURE_2D);

            gl.bindTexture(gl.TEXTURE_2D, null);
            alphaTextures.push(alphaTexture)
        }

        this.alphaTextures = alphaTextures;
    }
    loadTexture(index, layerInd, filename) {
        var self = this;
        this.sceneApi.resources.loadTexture(filename).then(function success(textObject) {
            self.textureArray[index][layerInd] = textObject;
        }, function error() {
        });
    }
    createTriangleStrip() {
        var mcnkObjs = this.adtFile.mcnkObjs;

        function isHole(hole, i, j) {
            var holetab_h = [0x1111, 0x2222, 0x4444, 0x8888];
            var holetab_v = [0x000F, 0x00F0, 0x0F00, 0xF000];

            return (hole & holetab_h[i] & holetab_v[j]) != 0;
        }

        function indexMapBuf(x, y) {
            var result = ((y + 1) >>> 1) * 9 + (y >>> 1) * 8 + x;
            return result;
        }

        var strips = [];
        var stripOffsets = [];

        for (var i = 0; i < mcnkObjs.length; i++) {
            var mcnkObj = mcnkObjs[i];
            var hole = mcnkObj.holes;
            stripOffsets.push(strips.length);

            var j = 0;
            var first = true;
            for (var x = 0; x < 4; x++) {
                for (var y = 0; y < 4; y++) {
                    if (!isHole(hole, x, y)) {
                        var _i = x * 2;
                        var _j = y * 4;

                        for (var k = 0; k < 2; k++) {
                            if (!first) {
                                strips.push(indexMapBuf(_i, _j + k * 2));
                            } else
                                first = false;

                            for (var l = 0; l < 3; l++) {

                                strips.push(indexMapBuf(_i + l, _j + k * 2));
                                strips.push(indexMapBuf(_i + l, _j + k * 2 + 2));
                            }
                            strips.push(indexMapBuf(_i + 2, _j + k * 2 + 2));
                        }
                    }
                }
            }
        }
        stripOffsets.push(strips.length);
        var result = {strips: strips, stripOffsets: stripOffsets};
        this.triangleStrip = result;
    }
    createVBO() {
        var gl = this.gl;
        var m2Object = this.adtFile;

        /* 1. help index + Heights + texCoords +  */
        var vboArray = [];

        /* 1.1 help index */
        this.indexOffset = vboArray.length;
        for (var i = 0; i < 9 * 9 + 8 * 8; i++) {
            vboArray.push(i);
        }

        /* 1.2 Heights */
        this.heightOffset = vboArray.length;
        var mcnkObjs = this.adtFile.mcnkObjs;
        for (var i = 0; i < mcnkObjs.length; i++) {
            for (var j = 0; j < 145; j++) {
                vboArray.push(mcnkObjs[i].heights[j]);
            }
        }

        /* 1.3 Make combinedVbo */
        this.combinedVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.combinedVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vboArray), gl.STATIC_DRAW);

        /* 2. Strips */
        this.stripVBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stripVBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(this.triangleStrip.strips), gl.STATIC_DRAW);
    }
    draw() {
        var gl = this.gl;
        var stripOffsets = this.triangleStrip.stripOffsets;
        var shaderUniforms = this.sceneApi.shaders.getShaderUniforms();
        var shaderAttributes = this.sceneApi.shaders.getShaderAttributes();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stripVBO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.combinedVbo);

        gl.vertexAttribPointer(shaderAttributes.aIndex, 1, gl.FLOAT, false, 0, this.indexOffset * 4);

        //Draw
        var mcnkObjs = this.adtFile.mcnkObjs;
        for (var i = 0; i < 256; i++) {
            var mcnkObj = mcnkObjs[i];
            gl.vertexAttribPointer(shaderAttributes.aHeight, 1, gl.FLOAT, false, 0, (this.heightOffset + i * 145) * 4);
            gl.uniform3f(shaderUniforms.uPos, mcnkObj.pos.x, mcnkObj.pos.y, mcnkObj.pos.z);

            if ((this.textureArray[i]) && (this.textureArray[i][0])) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.textureArray[i][0].texture);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this.alphaTextures[i]);

                //Bind layer textures
                for (var j = 1; j < this.textureArray[i].length; j++) {
                    gl.activeTexture(gl.TEXTURE1 + j);
                    if ((this.textureArray[i][j]) && (this.textureArray[i][j].texture)) {
                        //gl.enable(gl.TEXTURE_2D);
                        gl.bindTexture(gl.TEXTURE_2D, this.textureArray[i][j].texture);
                    } else {
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                }

                var stripLength = (i == 0) ? 0 : stripOffsets[i + 1] - stripOffsets[i];
                gl.drawElements(gl.TRIANGLE_STRIP, stripLength, gl.UNSIGNED_SHORT, stripOffsets[i] * 2);
            }
        }
    }
}

class AdtGeomCache {
    constructor (sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadAdtFile(fileName) {
            /* Must return promise */
            return adtLoader(fileName);
        }, function process(adtFile) {
            var adtGeomObj = new ADTGeom(sceneApi, sceneApi.getCurrentWdt());
            adtGeomObj.assign(adtFile);
            adtGeomObj.createTriangleStrip();
            adtGeomObj.createVBO();
            adtGeomObj.loadTextures();

            return adtGeomObj;
        });

        self.loadAdt = function (fileName) {
            return cache.get(fileName);
        };

        self.unLoadAdt = function (fileName) {
            cache.remove(fileName)
        }
    }
}

export default AdtGeomCache;
