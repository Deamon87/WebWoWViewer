import WorldUnit from '../objects/worldObjects/worldUnit.js'
import WorldGameObject from '../objects/worldObjects/worldGameObject.js'
import packet from '../../../mountedNpc.json'
//import packet from '../../../packet.json'
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
                    if (updates[j].updateType == 'UPDATE_TYPE_CREATE_FULL'){

                        var updateFields = updates[j].updateFields;

                        var guid = 0;
                        for (var k = 0; k < updateFields['OBJECT_FIELD_GUID'].length; k++) {
                            guid += updateFields['OBJECT_FIELD_GUID'][k].index*0xFFFFFFFF +
                                updateFields['OBJECT_FIELD_GUID'][k].value;
                        }
                        if (this.objectMap[guid]) continue;

                        if (updates[j].obj_type == 3) {

                            var newWorldUnit = new WorldUnit(this.sceneApi);

                            this.objectMap[guid] = newWorldUnit;

                            newWorldUnit.setPosition(vec3.fromValues(updates[j].x, updates[j].y, updates[j].z));
                            newWorldUnit.setRotation(updates[j].f);
                            newWorldUnit.setDisplayId(updateFields["UNIT_FIELD_DISPLAYID"]);
                            if (updateFields.hasOwnProperty("UNIT_FIELD_MOUNTDISPLAYID")) {
                                newWorldUnit.setMountDisplayId(updateFields["UNIT_FIELD_MOUNTDISPLAYID"])
                            }

                            if (updateFields.hasOwnProperty("OBJECT_FIELD_SCALE_X")) {
                                newWorldUnit.setScale(updateFields["OBJECT_FIELD_SCALE_X"])
                            }

                            if (updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY']) {
                                for (var k = 0; k < updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'].length; k++) {
                                    newWorldUnit.setVirtualItemSlot(
                                        updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'][k].index,
                                        updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'][k].value
                                    )
                                }
                            }

                        } else if (updates[j].obj_type == 5) {
                            var newWorldGameObject = new WorldGameObject(this.sceneApi);

                            this.objectMap[guid] = newWorldGameObject;



                            newWorldGameObject.setPosition(
                                vec3.fromValues(updates[j].static_x, updates[j].static_y, updates[j].static_z));
                            newWorldGameObject.setRotation(updates[j].static_f);
                            newWorldGameObject.setDisplayId(updateFields["GAMEOBJECT_DISPLAYID"]);

                            var rotationQuaternion = [0, 0, 0, 0];
                            for (var k = 0; k < updateFields['GAMEOBJECT_ROTATION'].length; k++) {
                                rotationQuaternion[updateFields['GAMEOBJECT_ROTATION'][k].index] =
                                    updateFields['GAMEOBJECT_ROTATION'][k].value;
                            }
                            newWorldGameObject.setRotationQuaternion(rotationQuaternion);

                            if (updateFields.hasOwnProperty("OBJECT_FIELD_SCALE_X")) {
                                newWorldGameObject.setScale(updateFields["OBJECT_FIELD_SCALE_X"])
                            }

                        }
                    }
                }
            }
        }
    }

}
export default WorldObjectManager;