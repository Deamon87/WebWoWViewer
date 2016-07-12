import WorldUnit from '../objects/worldObjects/worldUnit.js'
import packet from '../../../packet.json'
//import packet from '../../../femaleGuardWithHelm.json'
import {vec3} from 'gl-matrix'

class WorldObjectManager {
    constructor(sceneApi){
        this.objectMap = {};
        this.sceneApi = sceneApi;
    }

    update(deltaTime, cameraPos) {
        for (var field in this.objectMap) {
            if (this.objectMap.hasOwnProperty(field)) {
                this.objectMap[field].update(deltaTime, cameraPos);
            }
        }
    }
    loadAllPacket(){
        for (var i = 0; i < packet.length; i++){
            if (packet[i].opcode == 'SMSG_COMPRESSED_UPDATE_OBJECT') {
                var updates = packet[i].payload.updates;
                for (var j = 0; j < updates.length; j++) {
                    if (updates[j].updateType == 'UPDATE_TYPE_CREATE_FULL' &&
                        (updates[j].obj_type == 3 || updates[j].obj_type == 4 )){

                        var updateFields = updates[j].updateFields;

                        var guid = 0;
                        for (var k = 0; k < updateFields['OBJECT_FIELD_GUID'].length; k++) {
                            guid += updateFields['OBJECT_FIELD_GUID'][k].index*0xFFFFFFFF +
                                updateFields['OBJECT_FIELD_GUID'][k].value;
                        }
                        if (this.objectMap[guid]) continue;

                        var newWorldUnit = new WorldUnit(this.sceneApi);

                        this.objectMap[guid] = newWorldUnit;


                        newWorldUnit.setPosition(vec3.fromValues(updates[j].x, updates[j].y, updates[j].z));
                        newWorldUnit.setRotation(updates[j].f);
                        newWorldUnit.setDisplayId(updateFields["UNIT_FIELD_DISPLAYID"]);
                        if (updateFields.hasOwnProperty("UNIT_FIELD_MOUNTDISPLAYID")){
                            newWorldUnit.setMountDisplayId(updateFields["UNIT_FIELD_MOUNTDISPLAYID"])
                        }

                        if (updateFields.hasOwnProperty("OBJECT_FIELD_SCALE_X")){
                            newWorldUnit.setScale(updateFields["OBJECT_FIELD_SCALE_X"])
                        }


                    }
                }
            }
        }
    }

}
export default WorldObjectManager;