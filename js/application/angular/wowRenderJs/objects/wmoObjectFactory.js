'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', ['js.wow.render.wmoM2ObjectFactory']);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', 'wmoM2ObjectFactory', function($q, $timeout, wmoM2ObjectFactory) {

        function WmoObject(sceneApi){
            var self = this;
            self.sceneApi = sceneApi;

            self.wmoGroupArray = [];
            self.doodadsArray = [];
        }
        WmoObject.prototype = {
            loadGeom : function (num, filename){
                var self = this;
                self.sceneApi.loadWmoGeom(filename).then(
                    function success(wmoGeom){
                        self.wmoGroupArray[num] = wmoGeom;

                        /* 1. Load textures */
                        wmoGeom.loadTextures(self.wmoObj.momt);

                    }, function error(){
                    }
                );
            },
            checkIfUseLocalLighting : function(pos) {
                var lastGroupInfo = null;
                for (var i = 0; i < this.wmoObj.nGroups; i++) {
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;

                    if( bb1.x <= pos.x && pos.x <= bb2.x
                        && bb1.y <= pos.y && pos.y <= bb2.y
                        && bb1.z <= pos.z && pos.z <= bb2.z ) {
                        // Point is in bounding box

                        //Now check if this bb is smaller than previous one
                        /*if (lastGroupInfo) {
                            if (lastGroupInfo.bb1.x > bb1.x || lastGroupInfo.bb2.x > bb2.x
                                || lastGroupInfo.bb1.y > bb1.y || lastGroupInfo.bb2.y < bb2.y
                                || lastGroupInfo.bb1.z > bb1.z || lastGroupInfo.bb2.z < bb2.z
                            ) {
                                continue;
                            }
                        } */

                        lastGroupInfo = groupInfo;
                    }
                }

                if (lastGroupInfo && ((lastGroupInfo.flags & 0x2000) > 0)) {
                    return true
                } else {
                    return false;
                }
            },
            createPlacementMatrix : function(modf){
                var TILESIZE = 533.333333333;

                var posx = modf.pos.x-32*TILESIZE;
                var posy = modf.pos.y;
                var posz = modf.pos.z-32*TILESIZE;

                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.y - 90));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-modf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.z));

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(-90));

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            loadDoodads : function (doodadsInd){
                var self = this;
                var doodadsSet = self.wmoObj.modd[doodadsInd];

                this.doodadsArray = [];
                for (var i = 0; i < doodadsSet.doodads.length; i++) {
                //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
                    var doodad = doodadsSet.doodads[i];
                    this.loadDoodad(i, doodad);
                }
            },
            loadDoodad : function (index, doodad) {
                var self = this;

                self.doodadsArray[index] = new wmoM2ObjectFactory(self.sceneApi);
                var useLocalLighting = self.checkIfUseLocalLighting(doodad.pos);
                self.doodadsArray[index].load(doodad, self.placementMatrix, useLocalLighting);
            },
            load : function (modf){
                var deferred = $q.defer();
                var self = this;

                var filename = modf.fileName;
                var doodadsInd = modf.doodadSet;

                /* 1. Create matrix */
                self.createPlacementMatrix(modf);

                var wmoMailPromise = self.sceneApi.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = [];
                    self.wmoGroupArray.length  = wmoObj.nGroups;

                    /* 1. Load wmo group files */
                    var template = filename.substr(0, filename.lastIndexOf("."));
                    for (var i = 0; i < wmoObj.nGroups; i++) {
                        /* Fill the string with zeros, so it would have length of 3 */
                        var num = (i).toString();
                        for (;num.length != 3; ){
                            num = '0' + num;
                        }

                        self.loadGeom(i, template + "_" + num + ".wmo");
                    }

                    /* 2. Load doodads */
                    self.loadDoodads(doodadsInd);

                    deferred.resolve(self);
                }, function error (){
                });

                return deferred.promise;
            },
            drawBB : function () {
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.getShaderUniforms();

                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;

                    var center = [
                        (bb1.x + bb2.x)/2,
                        (bb1.y + bb2.y)/2,
                        (bb1.z + bb2.z)/2
                    ];

                    var scale = [
                        bb2.x - center[0],
                        bb2.y - center[1],
                        bb2.z - center[2]
                    ];

                    gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
                    gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));

                    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
                }

            },
            draw : function () {
                /* Draw */
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.getShaderUniforms();

                if (this.placementMatrix) {
                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
                }

                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    if (this.wmoGroupArray[i]){
                        this.wmoGroupArray[i].draw();
                    }
                }

                for (var i = 0; i < this.doodadsArray.length; i++) {
                    //if (i != window.dboNumber){
                    //    continue;
                    //}
                    this.doodadsArray[i].draw()
                }
            }
        };

        return WmoObject;
    }]);
})(window, jQuery);