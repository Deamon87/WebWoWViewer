'use strict';

(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.adtM2ObjectFactory', ['js.wow.render.mdxObject']);
    cacheTemplate.factory("adtM2ObjectFactory", ['mdxObject', '$q', '$timeout', 'mathHelper', function(mdxObject, $q, $timeout, mathHelper) {
        function AdtM2Object(sceneApi){
            var self = this;

            self.sceneApi = sceneApi;
            self.mdxObject = new mdxObject(sceneApi);
            self.currentDistance = 0;
            self.isRendered = true;
        }
        AdtM2Object.prototype = {


            getFileNameIdent : function (){
                return this.mdxObject.fileIdent;
            },
            getMeshesToRender : function () {
                if (!this.mdxObject) return null;
                return this.mdxObject.getMeshesToRender();
            },
            drawBB : function (){
                var gl = this.sceneApi.getGlContext();
                var uniforms = this.sceneApi.shaders.getShaderUniforms();

                var bb = this.mdxObject.getBoundingBox();

                if (bb) {
                    var bb1 = bb.ab,
                        bb2 = bb.cd;

                    var center = [
                        (bb1.x + bb2.x) / 2,
                        (bb1.y + bb2.y) / 2,
                        (bb1.z + bb2.z) / 2
                    ];

                    var scale = [
                        bb2.x - center[0],
                        bb2.y - center[1],
                        bb2.z - center[2]
                    ];

                    gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
                    gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
                    gl.uniform3fv(uniforms.uColor, new Float32Array([0.819607843, 0.058, 0.058])); //red
                    gl.uniformMatrix4fv(uniforms.uPlacementMat, false, this.placementMatrix);

                    gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
                }
            },
            drawTransparentMeshes : function () {
                this.mdxObject.drawTransparentMeshes(this.placementMatrix, 0xffffffff);
            },
            drawNonTransparentMeshes : function () {
                this.mdxObject.drawNonTransparentMeshes(this.placementMatrix, 0xffffffff);
            },
            draw : function () {
                this.mdxObject.draw(this.placementMatrix, 0xffffffff);
            },
            drawInstancedNonTransparentMeshes : function (instanceCount, placementVBO) {
                this.mdxObject.drawInstancedNonTransparentMeshes(instanceCount, placementVBO, 0xffffffff);
            },
            drawInstancedTransparentMeshes : function (instanceCount, placementVBO) {
                this.mdxObject.drawInstancedTransparentMeshes(instanceCount, placementVBO, 0xffffffff);
            },
            checkFrustumCulling : function (cameraVec4, frustumPlanes) {
                var inFrustum = this.aabb && this.mdxObject.checkFrustumCulling(cameraVec4, frustumPlanes, this.aabb);

                this.setIsRendered(this.getIsRendered() && inFrustum);
            },
            checkAgainstDepthBuffer: function (frustrumMatrix, lookAtMat4, getDepth) {
                this.setIsRendered(this.getIsRendered() && this.mdxObject.checkAgainstDepthBuffer(frustrumMatrix, lookAtMat4, this.placementMatrix, getDepth));
            },
            update : function(deltaTime, cameraPos) {
                if (!this.aabb) {
                    var bb = this.mdxObject.getBoundingBox();
                    if (bb) {
                        var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
                        var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

                        var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [a_ab, a_cd]);

                        this.diameter = vec3.distance(worldAABB[0],worldAABB[1]);
                        this.aabb = worldAABB;
                    }
                }
                if (!this.getIsRendered()) return;
                this.mdxObject.update(deltaTime, cameraPos, this.placementInvertMatrix);
            },
            createPlacementMatrix : function(mddf){
                var TILESIZE = 533.333333333;

                var posx = 32*TILESIZE - mddf.pos.x;
                var posy = mddf.pos.y;
                var posz = 32*TILESIZE - mddf.pos.z;

                var placementMatrix = mat4.create();
                mat4.identity(placementMatrix);

                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(90));
                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(90));

                mat4.translate(placementMatrix, placementMatrix, [posx, posy, posz]);

                mat4.rotateY(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.y -270));
                mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(-mddf.rotation.x));
                mat4.rotateX(placementMatrix, placementMatrix, glMatrix.toRadian(mddf.rotation.z-90));

                mat4.scale(placementMatrix, placementMatrix, [mddf.scale / 1024, mddf.scale / 1024, mddf.scale / 1024]);

                var placementInvertMatrix = mat4.create();
                mat4.invert(placementInvertMatrix, placementMatrix);

                this.placementInvertMatrix = placementInvertMatrix;
                this.placementMatrix = placementMatrix;
            },
            calcOwnPosition : function () {
                var position = vec4.fromValues(0,0,0,1);
                vec4.transformMat4(position, position, this.placementMatrix);

                this.position = position;
            },
            calcDistance : function (position) {
                function distance(aabb, p) {
                    var dx = Math.max(aabb[0][0] - p[0], 0, p[0] - aabb[1][0]);
                    var dy = Math.max(aabb[0][1] - p[1], 0, p[1] - aabb[1][1]);
                    var dz = Math.max(aabb[0][2] - p[2], 0, p[2] - aabb[1][2]);
                    return Math.sqrt(dx*dx + dy*dy + dz*dz);
                }

                if (this.aabb) {
                    this.currentDistance = distance(this.aabb, position);
                }
            },
            getCurrentDistance : function (){
                return this.currentDistance;
            },
            getDiameter : function () {
                return this.diameter;
            },
            setIsRendered : function (value) {
                this.isRendered = value;
            },
            getIsRendered : function () {
                return this.isRendered;
            },
            load : function (mddf){
                var self = this;

                self.mddf = mddf;

                self.createPlacementMatrix(mddf);
                self.calcOwnPosition();
                return self.mdxObject.load(mddf.fileName, 0);
            }
        };

        return AdtM2Object;
    }]);
})(window, jQuery);