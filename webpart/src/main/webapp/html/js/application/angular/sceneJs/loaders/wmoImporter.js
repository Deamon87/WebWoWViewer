/**
 * Created by Deamon on 01/02/2015.
 */
(function (window, $, undefined) {
    var wmoLoader = angular.module('main.angular.sceneJs.loader.wmoImporter', ['main.services.map.wmoLoader']);

    /*
     * Loader for group wmo files
     * These files contain geometry
     * */
    wmoLoader.factory('registerWMOImporter', ["wmoLoader", 'wmoGroupLoader', '$log', function (wmoLoader, wmoGroupLoader, $log) {
        SceneJS.Types.addType("import/wmo", {
                construct: function (params) {
                    if (!params.src) {
                        this.log("error", "Attribute expected: src");
                    }

                    // Notify SceneJS so it can support loading/busy indicators etc
                    this._taskId = this.taskStarted("Loading .wmo");
                    var self = this;

                    wmoLoader(params.src).then(function success(wmoObj) {
                        /* Node creation */

                        /* Create group wmos */
                        var template = params.src.substr(0, params.src.lastIndexOf("."));
                        for (var i = 0; i < wmoObj.nGroups; i++) {
                            /* Fill the string with zeros, so it would have length of 3 */
                            var num = (i).toString();
                            for (;num.length != 3; ){
                                num = '0' + num;
                            }

                            self.addNode({
                                type: "import/groupWmo",
                                wmoObj : wmoObj,
                                src: template + "_" + num + ".wmo"
                            })
                        }

                        self._taskId = self.taskFinished(self._taskId);

                    }, function error() {
                        /* */

                        self.log("error", "Failed to load file: " + params.src);
                        self._taskId = self.taskFailed(self._taskId);
                    });
                }
            });
        SceneJS.Types.addType("import/groupWmo", {

                construct: function (params) {
                    if (!params.src) {
                        this.log("error", "Attribute expected: src");
                    }

                    // Notify SceneJS so it can support loading/busy indicators etc
                    this._taskId = this.taskStarted("Loading group .wmo");
                    var self = this;

                    var wmoObject = params.wmoObj;

                    wmoGroupLoader(params.src, true).then(function success(wmoGroupFile) {

                        var material = self.addNode({
                            type: "material",
                            color: { r: 0.2, g: 0.2, b: 0.6 }
                        });

                        var translate = material.addNode({
                            type: "translate",
                            x: 0
                        });

                        var geometry = translate.addNode({
                            type: "geometry",

                            primitive: "triangles",

                            positions: wmoGroupFile.verticles,
                            normals :  wmoGroupFile.normals,
                            uv      :  wmoGroupFile.textCoords,
                            colors  :  wmoGroupFile.colorVerticles
                        });
                        for (var i = 0; i < wmoGroupFile.renderBatches.length; i++) {

                            var batch = wmoGroupFile.renderBatches[i];
                            var startInd = batch.startIndex;
                            var endInd= startInd + batch.count;

                            var partIndicies = [];
                            for (var j = startInd; j < endInd; j++) {
                                partIndicies.push(wmoGroupFile.indicies[j]);
                            }


                            var material = geometry.addNode({
                                type : "import/blp",
                                src : wmoObject.momt[batch.tex].textureName1,
                                nodes: [{
                                    type: "shader",
                                    shaders: [
                                        {
                                            stage: "fragment",
                                            code: [
                                                //"attribute vec3 SCENEJS_aVertex;",
                                                //"attribute vec2 SCENEJS_aUVCoord;",
                                                //"varying vec4 SCENEJS_vColor;",
                                                "vec3 baseColorBlend(vec3 color, float blendFactor, sampler2D sampler, vec2 texCoords){",
                                                "   return color*texture2D(sampler, vec2(texCoords.x, 1.0 - texCoords.y)).rgb;",
                                                "}"

                                            ],
                                            hooks: {
                                                baseColorBlendFunc : "baseColorBlend"
                                            }
                                        }
                                    ],
                                    params : {

                                    },
                                    nodes: [{
                                        type: "geometry",
                                        indices: partIndicies
                                    }]
                                }]
                            });
                        }

                        self._taskId = self.taskFinished(self._taskId);
                    }, function error() {
                        self.log("error", "Failed to load file: " + params.src);
                        self._taskId = self.taskFailed(self._taskId);
                    });
                }
            });
     }]);
})(window, jQuery);
/*
 if (library.getNode(textureName) == null){
 library.addNode({
 type : "import/blp",
 src: textureName,
 id : textureName
 });
 }

 var material = geometry.addNode({
 type: "texture",
 codeId : wmoObject.momt[batch.tex].textureName1,
 nodes : [{
 type: "shader",
 shaders: [
 {
 stage: "fragment",
 code: [
 //"attribute vec3 SCENEJS_aVertex;",
 //"attribute vec2 SCENEJS_aUVCoord;",
 //"varying vec4 SCENEJS_vColor;",
 "vec3 baseColorBlend(vec3 color, float blendFactor, sampler2D sampler, vec2 texCoords){",
 "   return color*texture2D(sampler, vec2(texCoords.x, 1.0 - texCoords.y)).rgb;",
 "}"

 ],
 hooks: {
 baseColorBlendFunc: "baseColorBlend"
 }
 }
 ],
 params: {},
 nodes: [{
 type: "geometry",
 indices: partIndicies
 }]
 }]
 })
 */