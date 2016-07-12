import WorldUnit from '../objects/worldObjects/worldUnit.js'
import packet from '../../../packet.json'
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
                        updates[j].updateFields['OBJECT_FIELD_TYPE'] == 9){

                        var updateFields = updates[j].updateFields;

                        var newWorldUnit = new WorldUnit(this.sceneApi);
                        var guid = 0;
                        for (var k = 0; k < updateFields['OBJECT_FIELD_GUID'].length; k++) {
                            guid += updateFields['OBJECT_FIELD_GUID'][k].index*0xFFFFFFFF +
                                updateFields['OBJECT_FIELD_GUID'][k].value;
                        }

                        this.objectMap[guid] = newWorldUnit;


                        newWorldUnit.setPosition(vec3.fromValues(updates[j].x, updates[j].y, updates[j].z));
                        newWorldUnit.setDisplayId(updateFields["UNIT_FIELD_DISPLAYID"]);
                        //if (updateFields.hasOwnProperty("UNIT_FIELD_MOUNTDISPLAYID")){
                        //    updateFields["UNIT_FIELD_MOUNTDISPLAYID"]
                        //}
                    }
                }
            }
        }
    }

}
export default WorldObjectManager;