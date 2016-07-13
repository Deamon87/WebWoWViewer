import WorldObject from './worldObject.js'
import {mat4, vec4, vec3, glMatrix} from 'gl-matrix';


class WorldGameObject extends WorldObject {
    constructor(sceneApi) {
        super();
        this.sceneApi = sceneApi;

        this.objectModel = null;
    }

    setDisplayId(value) {
        var godid = this.sceneApi.dbc.getGameObjectDisplayInfoDBC();
        var godidRec = godid[value];
        if (godidRec) {
            var modelName = godidRec.modelName;

            if (modelName.toLowerCase().split('.')[1] == 'mdx') {
                this.objectModel = this.sceneApi.objects.loadWorldM2Obj(modelName, null, null);
            }
        }
    }
    setRotationQuaternion(quaternion) {
        var rotationMatrix = mat4.create();
        mat4.fromQuat(rotationMatrix, quaternion)

        this.rotationMatrix = rotationMatrix;
    }
    update (deltaTime, cameraPos) {
        var properScale = 1.0;
        if (this.scale > 0.0001) {
            properScale = this.scale;
        }

        if (this.objectModel && this.objectModel.m2Geom && this.objectModel.m2Geom.m2File) {
            this.objectModel.createPlacementMatrix(this.pos, this.f, properScale, this.rotationMatrix);

            /* Update bone matrices */
            this.objectModel.objectUpdate(deltaTime, cameraPos);
        }
    }
}

export default WorldGameObject;