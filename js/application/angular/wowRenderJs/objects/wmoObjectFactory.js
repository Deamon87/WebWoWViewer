'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.wmoObjectFactory', ['js.wow.render.wmoM2ObjectFactory']);
    cacheTemplate.factory("wmoObjectFactory", ['$q', '$timeout', 'wmoM2ObjectFactory', function($q, $timeout, wmoM2ObjectFactory) {

        function WmoObject(sceneApi){
            var self = this;
            self.sceneApi = sceneApi;

            self.wmoGroupArray = [];
            self.doodadsArray = [];
            self.drawGroup = [];
        }
        WmoObject.prototype = {
            loadGeom : function (num, filename){
                var self = this;
                self.sceneApi.resources.loadWmoGeom(filename).then(
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

                var posx = 32*TILESIZE - modf.pos.x;
                var posy = modf.pos.y;
                var posz = 32*TILESIZE - modf.pos.z;


                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(90));

                // with FPosition do glTranslatef(x,y,z);
                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.y+90));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.z-90));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(modf.rotation.x));

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            loadDoodads : function (doodadsInd){
                var self = this;
                if (!self.wmoObj.modd) {
                    return;
                }
                self.currentDoodadSet = self.wmoObj.mods[doodadsInd];

                var doodadsSet = self.wmoObj.mods[doodadsInd];
                var doodadDefArray = self.wmoObj.modd;

                this.doodadsArray =  new Array(doodadsSet.number);
                for (var i = 0; i < doodadsSet.number; i++) {
                //for (var i = 0; i < (doodadsSet.doodads.length > 10) ? 10 : doodadsSet.doodads.length; i++) {
                    var doodad = doodadDefArray[doodadsSet.index + i];
                    this.loadDoodad(i, doodad);
                }
            },
            loadDoodad : function (index, doodad) {
                var self = this;

                var useLocalLighting = self.checkIfUseLocalLighting(doodad.pos);
                this.doodadsArray[index] = self.sceneApi.objects.loadWmoM2Obj(doodad, self.placementMatrix, useLocalLighting);
                return this.doodadsArray[index];
            },
            load : function (modf){
                var deferred = $q.defer();
                var self = this;

                var filename = modf.fileName;
                var doodadsInd = modf.doodadSet;

                /* 1. Create matrix */
                self.createPlacementMatrix(modf);

                var wmoMailPromise = self.sceneApi.resources.loadWmoMain(filename);
                wmoMailPromise.then(function success(wmoObj){
                    self.wmoObj = wmoObj;
                    self.wmoGroupArray = new Array(wmoObj.nGroups);

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
                var uniforms = this.sceneApi.shaders.getShaderUniforms();

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
            setDoodadGroupDrawing : function (index, doDraw) {
                var groupInfo = this.wmoObj.groupInfos[index];
                var doodadsSet = this.currentDoodadSet;

                if (doodadsSet && this.wmoGroupArray[index]) {
                    var doodadRefs = this.wmoGroupArray[index].wmoGroupFile.doodadRefs;

                    if (doodadRefs) {
                        for (var i = 0; i < doodadRefs.length; i++) {
                            var doodadIndex = doodadRefs[i];
                            if (
                                (doodadIndex - doodadsSet.index < 0) ||
                                (doodadIndex > doodadsSet.index + doodadsSet.number - 1)
                            ) continue;

                            var mdxObject = this.doodadsArray[doodadIndex - doodadsSet.index];
                            //mdxObject.setIsRendered(mdxObject.getIsRendered() || doDraw);
                            mdxObject.setIsRendered(doDraw);
                        }
                    }
                }

                this.drawGroup[index] = doDraw;
            },
            checkFrustrumCulling : function (frustrumMatrix, lookAtMat4) {
                /*for (var i = 0; i < this.doodadsArray.length; i++) {
                    this.doodadsArray[i].setIsRendered(false);
                } */
                var combinedMat4 = mat4.create();

                mat4.multiply(combinedMat4, frustrumMatrix, lookAtMat4);
                mat4.multiply(combinedMat4, combinedMat4, this.placementMatrix);

                for (var i = 0; i < this.wmoGroupArray.length; i++) {
                    var groupInfo = this.wmoObj.groupInfos[i];
                    var bb1 = groupInfo.bb1,
                        bb2 = groupInfo.bb2;

                    var bb1vec = vec4.fromValues(bb1.x, bb1.y, bb1.z, 1);
                    var bb2vec = vec4.fromValues(bb2.x, bb2.y, bb2.z, 1);

                    vec4.transformMat4(bb1vec, bb1vec, combinedMat4);
                    vec4.transformMat4(bb2vec, bb2vec, combinedMat4);

                    //Perspective divide
                    vec4.scale(bb1vec, bb1vec, 1/bb1vec[3]);
                    vec4.scale(bb2vec, bb2vec, 1/bb2vec[3]);

                    if ((bb1vec[2] >= 0 && bb1vec[2] <= 1) || (bb2vec[2] >= 0 && bb2vec[2] <= 1)){
                        this.setDoodadGroupDrawing(i, true);
                    } else {
                        this.setDoodadGroupDrawing(i, false);
                    }
                }
            },
            update : function () {

            },
            draw : function () {
                /* Draw */
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.shaders.getShaderUniforms();

                if (this.placementMatrix) {
                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);
                }

                for (var i = 0; i < this.wmoGroupArray.length; i++){
                    if (this.wmoGroupArray[i] && this.drawGroup[i]){
                        this.wmoGroupArray[i].draw();
                    }
                }
            }
        };

        return WmoObject;
    }]);
})(window, jQuery);