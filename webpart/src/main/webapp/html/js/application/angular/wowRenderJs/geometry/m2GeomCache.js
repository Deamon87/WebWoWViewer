/* M2 Geometry Cache */
/* global alert: false */
'use strict';
var m2GeomCache = angular.module('js.wow.render.geometry.m2GeomCache', ['main.services.map.mdxLoader', 'js.wow.render.cacheTemplate']);
m2GeomCache.factory("m2GeomCache", ['mdxLoader', 'cacheTemplate', '$q', function(mdxLoader, cacheTemplate, $q){


    function M2Geom(sceneApi){
        this.sceneApi = sceneApi;
        this.gl = sceneApi.getGlContext();

        this.combinedVBO = null;
        this.textureArray = [];
    }
    M2Geom.prototype = {
        assign: function (m2File) {
            this.m2File = m2File;
        },
        loadTextures : function(){
             var textureDefinition = this.m2File.textureDefinition;

             for (var i = 0; i < textureDefinition.length ; i++){
                this.loadTexture(i, textureDefinition[i].textureName);
             }
        },
        loadTexture : function(index, filename){
            var self = this;
            this.sceneApi.loadTexture(filename).then(function success(textObject){
                self.textureArray[index] = textObject;
            }, function error(){
            });
        },
        createVBO : function(){
            var gl = this.gl;
            var m2Object = this.m2File;

            this.vertexVBO = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexVBO);
            gl.bufferData( gl.ARRAY_BUFFER, m2Object.vertexes, gl.STATIC_DRAW );

            /* Index is taken from skin object */
        },
        draw : function (skinObject, submeshArray) {
            var gl = this.gl;
            var m2Object = this.m2File;

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skinObject.indexVBO);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexVBO);
            gl.enableVertexAttribArray(0);
            gl.enableVertexAttribArray(1);
            gl.enableVertexAttribArray(2);

            /*
             {name: "pos",           type : "vector3f"},           0+12 = 12
             {name: "bonesWeight",   type : "uint8Array", len: 4}, 12+4 = 16
             {name: "bones",         type : "uint8Array", len: 4}, 16+4 = 20
             {name: "normal",        type : "vector3f"},           20+12 = 32
             {name: "textureX",      type : "float32"},            32+4 = 36
             {name: "textureY",      type : "float32"},            36+4 = 40
             {name : "unk1",         type : "int32"},              40+4 = 44
             {name : "unk2",         type : "int32"}               44+4 = 48
            */

            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 48, 0);  // position
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, 20); // normal
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 48, 32); // texcoord

            if (submeshArray) {
                for (var i = 0; i < submeshArray.length; i++) {
                    if (submeshArray[i].isRendered) {

                        if (submeshArray[i].textureTexUnit1) {
                            gl.bindTexture(gl.TEXTURE_2D, submeshArray[i].textureTexUnit1.texture);
                            gl.drawElements(gl.TRIANGLES, skinObject.skinFile.header.subMeshes[i].idxCount, gl.UNSIGNED_SHORT, skinObject.skinFile.header.subMeshes[i].idxStart * 2);
                        }
                    }
                }
            }
        }
    };

    function M2GeomCache(sceneApi) {
        var self = this;

        var cache = cacheTemplate(function loadGroupWmo(fileName){
            /* Must return promise */
            return mdxLoader(fileName);
        }, function process(m2File) {

            var m2GeomObj = new M2Geom(sceneApi);
            m2GeomObj.assign(m2File);
            m2GeomObj.createVBO();
            m2GeomObj.loadTextures();

            return m2GeomObj;
        });


        self.loadM2 = function (fileName){
            return cache.get(fileName);
        };

        self.unLoadM2 = function (fileName) {
            cache.remove(fileName)
        }
    }

    return M2GeomCache;
}]);
