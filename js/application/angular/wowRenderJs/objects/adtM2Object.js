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
    getInvertModelMatrix() {
        return this.placementInvertMatrix;
    }
    drawBB (){
       super.drawBB([0.819607843, 0.058, 0.058])
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