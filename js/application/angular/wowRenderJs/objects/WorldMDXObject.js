import MDXObject from './MDXObject.js';
import config from './../../services/config.js'
import mathHelper from './../math/mathHelper.js';
import {mat4, vec4, vec3} from 'gl-matrix';

class WmoM2Object extends MDXObject {
    constructor(){
        super();
        this.diffuseColor = new Float32Array([1,1,1,1]);

    }

    update (deltaTime, cameraPos) {
        if (!this.aabb) {
            var bb = super.getBoundingBox();
            if (bb) {
                var a_ab = vec4.fromValues(bb.ab.x,bb.ab.y,bb.ab.z,1);
                var a_cd = vec4.fromValues(bb.cd.x,bb.cd.y,bb.cd.z,1);

                var worldAABB = mathHelper.transformAABBWithMat4(this.placementMatrix, [a_ab, a_cd]);

                this.diameter = vec3.distance(worldAABB[0],worldAABB[1]);
                this.aabb = worldAABB;
            }
        }
        if (!this.getIsRendered()) return;
        super.update(deltaTime, cameraPos, this.placementInvertMatrix);
    }
    createPlacementMatrix (pos, f, scale){
        var placementMatrix = mat4.create();
        mat4.identity(placementMatrix);

        mat4.translate(placementMatrix, placementMatrix, pos);
        mat4.rotateZ(placementMatrix, placementMatrix, glMatrix.toRadian(f));

        mat4.scale(placementMatrix, placementMatrix, [scale / 1024, scale / 1024, scale / 1024]);

        var placementInvertMatrix = mat4.create();
        mat4.invert(placementInvertMatrix, placementMatrix);

        this.placementInvertMatrix = placementInvertMatrix;
        this.placementMatrix = placementMatrix;
    }
    createPlacementMatrixFromParent (parentM2, attachment, pos, f, scale){
12
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