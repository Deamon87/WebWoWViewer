import MDXObject from './MDXObject.js';
import mathHelper from './../math/mathHelper.js';
import {mat4, vec4, vec3} from 'gl-matrix';

class WmoM2Object extends MDXObject {
    constructor(sceneApi) {
        super(sceneApi);

        var self = this;
        self.sceneApi = sceneApi;
        self.currentDistance = 0;
        self.isRendered = true;
        self.useLocalLighting = true;
    }
    checkFrustumCullingAndSet (cameraVec4, frustumPlanes) {
        var inFrustum = this.checkFrustumCulling(cameraVec4, frustumPlanes);
        this.setIsRendered(this.getIsRendered() && inFrustum);
    }
    checkFrustumCulling (cameraVec4, frustumPlanes) {
        var inFrustum = this.aabb && super.checkFrustumCulling(cameraVec4, frustumPlanes, this.aabb);
        return inFrustum;
    }
    checkAgainstDepthBuffer(frustumMatrix, lookAtMat4, getDepth) {
        this.setIsRendered(this.getIsRendered() && super.checkAgainstDepthBuffer(frustumMatrix, lookAtMat4, this.placementMatrix, getDepth));
    }
    updateAABB (){
        var bb = super.getBoundingBox();
        if (bb) {
            var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
            var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

            var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [a_ab, a_cd]);

            this.diameter = vec3.distance(worldAABB[0], worldAABB[1]);
            this.aabb = worldAABB;
        }
    }
    update(deltaTime, cameraPos) {
        if (!this.getIsRendered()) return;
        super.update(deltaTime, cameraPos, this.placementInvertMatrix);
    }
    drawTransparentMeshes () {
        var diffuseColor = (this.useLocalLighting) ? this.diffuseColor : 0xffffffff;
        super.drawTransparentMeshes(this.placementMatrix, diffuseColor);
    }
    drawNonTransparentMeshes () {
        var diffuseColor = (this.useLocalLighting) ? this.diffuseColor : 0xffffffff;
        super.drawNonTransparentMeshes(this.placementMatrix, diffuseColor);
    }
    draw () {
        var diffuseColor = (this.useLocalLighting) ? this.diffuseColor : 0xffffffff;
        super.draw(this.placementMatrix, diffuseColor);
    }
    drawInstancedNonTransparentMeshes (instanceCount, placementVBO) {
        var diffuseColor = (this.useLocalLighting) ? this.diffuseColor : 0xffffffff;
        super.drawInstancedNonTransparentMeshes(instanceCount, placementVBO, diffuseColor);
    }
    drawInstancedTransparentMeshes (instanceCount, placementVBO) {
        var diffuseColor = (this.useLocalLighting) ? this.diffuseColor : 0xffffffff;
        super.drawInstancedTransparentMeshes(instanceCount, placementVBO, diffuseColor);
    }
    drawBB () {
        var gl = this.sceneApi.getGlContext();
        var uniforms = this.sceneApi.shaders.getShaderUniforms();

        var bb = super.getBoundingBox();

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
    }

    createPlacementMatrix (doodad, wmoPlacementMatrix){
        var placementMatrix = mat4.create();
        mat4.identity(placementMatrix);
        mat4.multiply(placementMatrix, placementMatrix, wmoPlacementMatrix);

        mat4.translate(placementMatrix, placementMatrix, [doodad.pos.x,doodad.pos.y,doodad.pos.z]);

        var orientMatrix = mat4.create();
        mat4.fromQuat(orientMatrix,
            [doodad.rotation.imag.x,
            doodad.rotation.imag.y,
            doodad.rotation.imag.z,
            doodad.rotation.real]
        );
        mat4.multiply(placementMatrix, placementMatrix, orientMatrix);

        mat4.scale(placementMatrix, placementMatrix, [doodad.scale, doodad.scale, doodad.scale]);

        var placementInvertMatrix = mat4.create();
        mat4.invert(placementInvertMatrix, placementMatrix);

        this.placementInvertMatrix = placementInvertMatrix;
        this.placementMatrix = placementMatrix;
    }
    calcOwnPosition () {
        var position = vec4.fromValues(0,0,0,1 );
        vec4.transformMat4(position, position, this.placementMatrix);

        this.position = position;
    }
    calcDistance (position) {
        function distance(aabb, p) {
            var dx = Math.max(aabb[0][0] - p[0], 0, p[0] - aabb[1][0]);
            var dy = Math.max(aabb[0][1] - p[1], 0, p[1] - aabb[1][1]);
            var dz = Math.max(aabb[0][2] - p[2], 0, p[2] - aabb[1][2]);
            return Math.sqrt(dx*dx + dy*dy + dz*dz);
        }

        if (this.aabb) {
            this.currentDistance = distance(this.aabb, position);
        }
    }
    setUseLocalLighting(value) {
        this.useLocalLighting = value;
    }
    getCurrentDistance (){
        return this.currentDistance;
    }
    getDiameter () {
        return this.diameter;
    }
    setIsRendered (value) {
        this.isRendered = value;
    }
    getIsRendered () {
        return this.isRendered;
    }
    load (doodad, wmoPlacementMatrix, useLocalColor){
        var self = this;

        self.doodad = doodad;
        self.diffuseColor = doodad.color;

        self.createPlacementMatrix(doodad, wmoPlacementMatrix);
        self.calcOwnPosition();

        return super.load(doodad.modelName, 0).then(function success(){
            self.updateAABB();
        }, function error(){});
    }
}

export default WmoM2Object;