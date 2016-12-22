import MDXObject from './M2Object.js';
import config from './../../services/config.js'
import mathHelper from './../math/mathHelper.js';
import {mat4, vec4, vec3, glMatrix} from 'gl-matrix';

class WorldMDXObject extends MDXObject {
    constructor(sceneApi){
        super(sceneApi);
        this.diffuseColor = new Float32Array([1,1,1,1]);
        this.aabb = null;
    }
    calcDistance (position) {
        this.currentDistance = 0;
    }
    getIsInstancable() {
        return false;
    }
    getCurrentDistance(){
        return 0;
    }
    setIsRendered (value) {
        //if (value === undefined) return;

        this.isRendered = value;
    }
    getDiameter () {
        return 100;
    }
    getDiffuseColor(){
        return new Float32Array([1,1,1,1]);
    }
    getInvertModelMatrix() {
        return this.placementInvertMatrix;
    }

    update (deltaTime, cameraPos, viewMat) {

    }
    objectUpdate (deltaTime, cameraPos, viewMat) {
        if (!this.getIsRendered()) return;
        super.update(deltaTime, cameraPos, viewMat);
    }
    createAABB() {
        if (!this.placementMatrix || !this.loaded) {
            return
        }
        super.createAABB();
    }
    checkFrustumCulling (cameraVec4, frustumPlanes, num_planes) {
        if (!this.aabb) return false;
        if (!this.loaded) return true;

        return super.checkFrustumCulling(cameraVec4, frustumPlanes, num_planes);
    }


    createPlacementMatrix (pos, f, scale, rotationMatrix){
        var placementMatrix = mat4.create();
        mat4.identity(placementMatrix);

        mat4.translate(placementMatrix, placementMatrix, pos);

        if (rotationMatrix) {
            mat4.multiply(placementMatrix,placementMatrix, rotationMatrix);
        } else {
            mat4.rotateZ(placementMatrix, placementMatrix, f);
        }

        mat4.scale(placementMatrix, placementMatrix, [scale , scale , scale ]);

        var placementInvertMatrix = mat4.create();
        mat4.invert(placementInvertMatrix, placementMatrix);

        this.placementInvertMatrix = placementInvertMatrix;
        this.placementMatrix = placementMatrix;

        this.createAABB();
    }
    createPlacementMatrixFromParent (parentM2, attachment, scale){
        var parentM2File = parentM2.m2Geom.m2File;
        var attIndex = parentM2File.attachLookups[attachment];
        var attachInfo = parentM2File.attachments[attIndex];

        var boneId = attachInfo.bone;
        var parentBoneTransMat = parentM2.bonesMatrices[boneId];

        var placementMatrix = mat4.create();
        mat4.identity(placementMatrix);
        mat4.multiply(placementMatrix,placementMatrix, parentM2.placementMatrix);

        mat4.multiply(placementMatrix, placementMatrix, parentBoneTransMat);
        mat4.translate(placementMatrix, placementMatrix, [
            attachInfo.pos.x,
            attachInfo.pos.y,
            attachInfo.pos.z,
            0
        ]);

        var placementInvertMatrix = mat4.create();
        mat4.invert(placementInvertMatrix, placementMatrix);

        this.placementInvertMatrix = placementInvertMatrix;
        this.placementMatrix = placementMatrix;

        this.createAABB();
    }

    /* Draw functions */

    drawTransparentMeshes () {
        this.draw(true, this.placementMatrix, this.diffuseColor);
    }
    drawNonTransparentMeshes () {
        this.draw(false, this.placementMatrix, this.diffuseColor);
    }
    drawInstancedNonTransparentMeshes (instanceCount, placementVBO) {
        this.drawInstanced(false, instanceCount, placementVBO);
    }
    drawInstancedTransparentMeshes (instanceCount, placementVBO) {
        this.drawInstanced(true, instanceCount, placementVBO);
    }

}

export default WorldMDXObject;