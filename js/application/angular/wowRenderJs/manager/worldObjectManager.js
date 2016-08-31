import WorldUnit from '../objects/worldObjects/worldUnit.js'
import WorldGameObject from '../objects/worldObjects/worldGameObject.js'
//import packetList from '../../../mountedNpc.json'
//import packetList from '../../../packet.json'
//import packetList from '../../../attacketdMinion1.json'
import {vec3} from 'gl-matrix'

class WorldObjectManager {
    constructor(sceneApi){
        this.objectMap = {};
        this.sceneApi = sceneApi;
        this.lastPacketIndex = 0;

        this.playPackets = false;
    }

    update(deltaTime, cameraPos) {
        /* 1. Load the next portion of packets */
        if (this.playPackets) {
            this.serverTime += deltaTime;

            this.clientTime += deltaTime;

            for (var i = this.lastPacketIndex; i < packetList.length; i++) {
                if (this.clientTime > packetList[i].tickcount) {
                    this.processPacket(packetList[i]);
                    this.lastPacketIndex = i+1;
                } else {
                    break;
                }
            }
        }

        /* 2. Update models */
        for (var field in this.objectMap) {
            if (this.objectMap.hasOwnProperty(field)) {
                this.objectMap[field].update(deltaTime, cameraPos, this.serverTime);
            }
        }
    }

    processPacket(packet) {
        if (packet.opcode == 'SMSG_COMPRESSED_UPDATE_OBJECT') {
            var updates = packet.payload.updates;
            for (var j = 0; j < updates.length; j++) {
                if (updates[j].updateType == 'UPDATE_TYPE_CREATE_FULL'){

                    var update = updates[j];
                    var updateFields = update.updateFields;

                    var guid = update.objectGuid;
                    /*
                    for (var k = 0; k < updateFields['OBJECT_FIELD_GUID'].length; k++) {
                        guid += updateFields['OBJECT_FIELD_GUID'][k].value << (updateFields['OBJECT_FIELD_GUID'][k].index*32);
                    }*/

                    if (this.objectMap[guid]) continue;

                    if (update.obj_type == 3) {

                        var newWorldUnit = new WorldUnit(this.sceneApi);
                        this.objectMap[guid] = newWorldUnit;

                        newWorldUnit.setSpeedWalk(update.speedWalk);
                        newWorldUnit.setSpeedRun(update.speedRun);
                        newWorldUnit.setSpeedRunBack(update.speedRunBack);
                        newWorldUnit.setSpeedSwim(update.speedSwim);
                        newWorldUnit.setSpeedSwimBack(update.speedSwimBack);
                        newWorldUnit.setSpeedFly(update.speedFly);
                        newWorldUnit.setSpeedFlyBack(update.speedFlyBack);
                        newWorldUnit.setSpeedTurnRate(update.speedTurnRate);

                        if (update.points) {
                            var vectorArray = new Array(update.points.length);
                            for (var i = 0; i < vectorArray.length; i++) {
                                var pointObj = update.points[i];
                                vectorArray[i] = [pointObj.x, pointObj.y, pointObj.z];
                            }
                            newWorldUnit.setMovingData(update.curr_time, update.total_time, update.movementflag, vectorArray);
                        }

                        newWorldUnit.setCurrentTime(update.timestamp);
                        newWorldUnit.setPosition(vec3.fromValues(update.x, update.y, update.z));
                        newWorldUnit.setRotation(update.f);
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

                    } else if (update.obj_type == 5) {
                        var newWorldGameObject = new WorldGameObject(this.sceneApi);

                        this.objectMap[guid] = newWorldGameObject;



                        newWorldGameObject.setPosition(
                            vec3.fromValues(updates[j].static_x, update.static_y, update.static_z));
                        newWorldGameObject.setRotation(update.static_f);
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
        } else if (packet.opcode == 'SMSG_MONSTER_MOVE'){
            var payload = packet.payload;
            var guid = payload.m_guid;

            if (!this.objectMap[guid]) return;

            var packetPoints = [];
            packetPoints.push([payload.m_x, payload.m_y, payload.m_z]);
            var moveTime = payload.m_move_time;
            if (payload.m_stop_flag != 1) {
                if ((payload.m_move_flag & 0x200) == 0) {
                    //packed
                    var halfVector = [
                        (payload.m_x + payload.m_end_x) * 0.5,
                        (payload.m_y + payload.m_end_y) * 0.5,
                        (payload.m_z + payload.m_end_z) * 0.5,
                    ];
                    for (var i = 0; i < payload.m_move_point_run.length; i++) {
                        var uint32 = payload.m_move_point_run[i];
                        var x = (((uint32 & 0x7FFF) << (21 + 32)) >> (21 + 32)) * 0.25;
                        var y = ((((uint32 & 0xFFFF) >> 11) << (21 + 32)) >> (21 + 32)) * 0.25;
                        var z = ((((uint32 & 0xFFFF) >> 22) << (22 + 32)) >> (22 + 32)) * 0.25;

                        packetPoints.push([
                                halfVector[0] - x,
                                halfVector[1] - y,
                                halfVector[2] - z
                            ]
                        );
                    }
                } else {
                    for (var i = 0; i < payload.m_move_point_run.length; i++) {
                        var pointObj = payload.m_move_point_run[i]
                        packetPoints.push([pointObj.x, pointObj.y, pointObj.z]);
                    }
                }
                packetPoints.push([payload.m_end_x, payload.m_end_y, payload.m_end_z]);
            } else {

            }
            this.objectMap[guid].setMovingData(0, moveTime, payload.m_move_flag, packetPoints);
        }
    }
    startPlayingPackets() {
        this.serverTime = 0;
        this.clientTime = packetList[0].tickcount - 500;
        this.lastPacketIndex = 0;

        this.playPackets = true;
    }

    loadAllPacket(){
        for (var i = 0; i < packetList.length; i++){
            this.processPacket(packetList[i]);
        }
    }

}
export default WorldObjectManager;