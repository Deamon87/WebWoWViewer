import MDXObject from './M2Object.js';
import mathHelper from './../math/mathHelper.js';

import {mat4, vec4, vec3, glMatrix} from 'gl-matrix';


class AdtM2Object extends MDXObject {
    constructor(sceneApi, localBB){
        super(sceneApi, localBB);

        var self = this;
        self.sceneApi = sceneApi;
        self.currentDistance = 0;
        self.isRendered = true;
    }

    getDiffuseColor() {
        return this.diffuseColor;
    }
    drawBB (){
        function drawBBInternal(bb1, bb2, color, placementMatrix) {
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
            gl.uniform3fv(uniforms.uColor, new Float32Array(color)); //red
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }
        function drawBBInternal2(center, scale, color, placementMatrix) {
            gl.uniform3fv(uniforms.uBBScale, new Float32Array(scale));
            gl.uniform3fv(uniforms.uBBCenter, new Float32Array(center));
            gl.uniform3fv(uniforms.uColor, new Float32Array(color)); //red
            gl.uniformMatrix4fv(uniforms.uPlacementMat, false, placementMatrix);

            gl.drawElements(gl.LINES, 48, gl.UNSIGNED_SHORT, 0);
        }

        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();

        var bb = super.getBoundingBox();

        if (bb) {
            var bb1 = bb.ab,
                bb2 = bb.cd;

            drawBBInternal(bb1, bb2, [0.819607843, 0.058, 0.058], this.placementMatrix);

            //Draw possible BBs
            var skinData = this.skinGeom.skinFile.header;
            for (var i = 0; i < this.materialArray.length; i++) {
                var a = this.materialArray[i];
                //var mesh1Corner1 = skinData.subMeshes[a.meshIndex].pos;
                //var mesh1Corner2 = skinData.subMeshes[a.meshIndex].centerBoundingBox;
                //var radius = skinData.subMeshes[a.meshIndex].radius;
                var aabb = this.skinGeom.subMeshBBs[a.meshIndex];


                //drawBBInternal2([mesh1Corner1.x, mesh1Corner1.y, mesh1Corner1.z], [radius,radius,radius], [0.0, 0.8, 0], this.placementMatrix);
                drawBBInternal(
                    {x : aabb[0][0], y : aabb[0][1], z : aabb[0][2]},
                    {x : aabb[1][0], y : aabb[1][1], z : aabb[1][2]},
                    [0.0, 0.8, 0], this.placementMatrix);
            }
        }
    }
    drawTransparentMeshes () {
        super.draw(true, this.placementMatrix, this.diffuseColor);
    }
    drawNonTransparentMeshes () {
        super.draw(false, this.placementMatrix, this.diffuseColor);
    }
    draw () {
        super.draw(this.placementMatrix, this.diffuseColor);
    }
    drawInstancedNonTransparentMeshes (instanceCount, placementVBO) {
        super.drawInstanced(false, instanceCount, placementVBO, 0xffffffff);
    }
    drawInstancedTransparentMeshes (instanceCount, placementVBO) {
        super.drawInstanced(true, instanceCount, placementVBO, 0xffffffff);
    }
    checkFrustumCullingAndSet (cameraVec4, frustumPlanes, num_planes) {
        var inFrustum = this.checkFrustumCulling(cameraVec4, frustumPlanes, num_planes);
        this.setIsRendered(this.getIsRendered() && inFrustum);
    }
    checkFrustumCulling (cameraVec4, frustumPlanes, num_planes) {
        if (!this.loaded) {
            return true;
        }
        var inFrustum = super.checkFrustumCulling(cameraVec4, frustumPlanes, num_planes);
        return inFrustum;
    }
    checkAgainstDepthBuffer(frustrumMatrix, lookAtMat4, getDepth) {
        this.setIsRendered(this.getIsRendered() && super.checkAgainstDepthBuffer(frustrumMatrix, lookAtMat4, this.placementMatrix, getDepth));
    }
    update (deltaTime, cameraPos, viewMat) {
        if (!this.getIsRendered()) return;
        super.update(deltaTime, cameraPos, viewMat, this.placementInvertMatrix);
    }
    createPlacementMatrix (mddf){
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
    }
    calcOwnPosition () {
        var position = vec4.fromValues(0,0,0,1);
        vec4.transformMat4(position, position, this.placementMatrix);

        this.position = position;
    }
    calcDistance (position) {
        if (this.loaded) {
            this.currentDistance = mathHelper.distanceFromAABBToPoint(this.aabb, position);
        }
    }
    getCurrentDistance (){
        return this.currentDistance;
    }
    getDiameter () {
        return this.diameter;
    }
    setIsRendered (value) {
       //if (value === undefined) return;

        this.isRendered = value;
    }
    getIsRendered () {
        return this.isRendered;
    }
    load (mddf){
        var self = this;

        self.mddf = mddf;
        self.diffuseColor = new Float32Array([1,1,1,1]);

        self.createPlacementMatrix(mddf);
        self.calcOwnPosition();

        return super.setLoadParams(mddf.fileName, 0);
    }
}

export default AdtM2Object;