import WorldUnit from '../objects/worldObjects/worldUnit.js'
import WorldPlayer from '../objects/worldObjects/worldPlayer.js'
import WorldGameObject from '../objects/worldObjects/worldGameObject.js'
//import packetList from '../../../mountedNpc.json'
//import packetList from '../../../47EC8D2E.json'
//import packetList from '../../../npc_wood.json'
//import packetList from '../../../player.json'
//import packetList from '../../../player2.json'
//import packetList from '../../../packet.json'
//import packetList from '../../../attacketdMinion1.json'
let packetList = [];
import {vec3} from 'gl-matrix'


class WorldObjectManager {
    constructor(sceneApi){
        this.objectMap = {};
        this.sceneApi = sceneApi;
        this.lastPacketIndex = 0;

        this.playPackets = false;
    }

    update(deltaTime, cameraPos, viewMat) {
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
                this.objectMap[field].update(deltaTime, cameraPos, viewMat);
            }
        }
    }

    processPacket(packet) {
        if (packet.opcode == 'SMSG_COMPRESSED_UPDATE_OBJECT') {
            var updates = packet.payload.updates;
            for (var j = 0; j < updates.length; j++) {
                if (updates[j].updateType == 'UPDATE_TYPE_CREATE_FULL' || updates[j].updateType == 'UPDATE_TYPE_CREATE_SELF'){

                    var update = updates[j];
                    var updateFields = update.updateFields;

                    var guid = update.objectGuid;
                    /*
                    for (var k = 0; k < updateFields['OBJECT_FIELD_GUID'].length; k++) {
                        guid += updateFields['OBJECT_FIELD_GUID'][k].value << (updateFields['OBJECT_FIELD_GUID'][k].index*32);
                    }*/

                    if (this.objectMap[guid]) continue;


                    if (update.obj_type == 3 || update.obj_type == 4) {
                        //Player + unit;
                        var newWorldUnit
                        if (update.obj_type == 4) {
                            newWorldUnit = new WorldPlayer(this.sceneApi);
                        } else {
                            newWorldUnit = new WorldUnit(this.sceneApi);
                        }
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
                        if (updateFields.hasOwnProperty("UNIT_FIELD_DISPLAYID")) {
                            newWorldUnit.setDisplayId(updateFields["UNIT_FIELD_DISPLAYID"]);
                        }
                        if (updateFields.hasOwnProperty("UNIT_FIELD_NATIVEDISPLAYID")) {
                            newWorldUnit.setNativeDisplayId(updateFields["UNIT_FIELD_NATIVEDISPLAYID"]);
                        }
                        if (updateFields.hasOwnProperty("UNIT_FIELD_MOUNTDISPLAYID")) {
                            newWorldUnit.setMountDisplayId(updateFields["UNIT_FIELD_MOUNTDISPLAYID"])
                        }

                        if (updateFields.hasOwnProperty("OBJECT_FIELD_SCALE_X")) {
                            newWorldUnit.setScale(updateFields["OBJECT_FIELD_SCALE_X"])
                        }

                        //Items to wear
                        var itemsToWear = [];
                        if (updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY']) {
                            for (var k = 0; k < updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'].length; k++) {
                                var item_index = updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'][k].index;

                                itemsToWear[item_index] = {
                                    displayId: updateFields['UNIT_VIRTUAL_ITEM_SLOT_DISPLAY'][k].value
                                }
                            }
                        }
                        if (updateFields['UNIT_VIRTUAL_ITEM_INFO']) {
                            for (var k = 0; k < updateFields['UNIT_VIRTUAL_ITEM_INFO'].length; k++) {
                                var infoIndex = updateFields['UNIT_VIRTUAL_ITEM_INFO'][k].index;
                                var itemIndex = (infoIndex / 2) | 0;
                                var itemInfoType = infoIndex % 2;

                                var item_valueInfo = updateFields['UNIT_VIRTUAL_ITEM_INFO'][k].value;
                                var itemToWear = itemsToWear[itemIndex];

                                if (itemInfoType == 0) {
                                    itemToWear.itemClass = item_valueInfo[0];
                                    itemToWear.itemSubClass = item_valueInfo[1];
                                    itemToWear.itemMaterial = item_valueInfo[2];
                                } else if (itemInfoType == 1) {
                                    itemToWear.itemInventoryType = item_valueInfo[0];
                                    itemToWear.itemSheath = item_valueInfo[1];
                                }
                            }
                        }

                        for (var k = 0; k < itemsToWear.length; k++) {
                            var itemToWear = itemsToWear[k];
                            newWorldUnit.setVirtualItemSlot(k, itemToWear.displayId, itemToWear.itemClass,
                                itemToWear.itemSubClass, itemToWear.itemInventoryType)
                        }


                        if (updateFields.hasOwnProperty('UNIT_FIELD_BYTES_0')) {

                            var race = updateFields['UNIT_FIELD_BYTES_0'][0];
                            var clas = updateFields['UNIT_FIELD_BYTES_0'][1];
                            var gender = updateFields['UNIT_FIELD_BYTES_0'][2];
                            var powerType = updateFields['UNIT_FIELD_BYTES_0'][3];
                            newWorldUnit.setUnitRace(race);
                            newWorldUnit.setUnitClass(clas);
                            newWorldUnit.setUnitGender(gender);
                            newWorldUnit.setUnitPowerType(powerType);
                        }

                        if (update.obj_type == 4) {
                            //Player
                            if (updateFields.hasOwnProperty("PLAYER_BYTES")) {
                                // skin, face, hair, haircolor
                                var skin = updateFields['PLAYER_BYTES'][0];
                                var face = updateFields['PLAYER_BYTES'][1];
                                var hair = updateFields['PLAYER_BYTES'][2];
                                var hairColor = updateFields['PLAYER_BYTES'][3];

                                newWorldUnit.setPlayerSkin(skin);
                                newWorldUnit.setPlayerFace(face);
                                newWorldUnit.setPlayerHair(hair);
                                newWorldUnit.setPlayerHairColor(hairColor);
                            }

                            if (updateFields.hasOwnProperty("PLAYER_BYTES_2")) {
                                // facehair
                                var faceFeatures = updateFields['PLAYER_BYTES_2'][0];
                                newWorldUnit.setPlayerFaceFeatures(faceFeatures);
                            }

                            //Head
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_1_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_1_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setHeadItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Neck
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_2_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_2_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setNeckItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Shoulders
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_3_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_3_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setShouldersItem(itemData[kk].value);
                                    }
                                }
                            }

                            //BODY
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_4_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_4_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setBodyItem(itemData[kk].value);
                                    }
                                }
                            }

                            //Chest
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_5_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_5_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setChestItem(itemData[kk].value);
                                    }
                                }
                            }

                            //Waist
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_6_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_6_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setWaistItem(itemData[kk].value);
                                    }
                                }
                            }

                            //Legs
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_7_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_7_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setLegsItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Boots
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_8_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_8_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setFeetItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Wrist
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_9_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_9_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setWristItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Hands
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_10_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_10_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setHandsItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Back
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_15_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_15_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setBackItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Main hand
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_15_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_15_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setMainHandItem(itemData[kk].value);
                                    }
                                }
                            }
                            //Off hand
                            if (updateFields.hasOwnProperty("PLAYER_VISIBLE_ITEM_16_0")) {
                                var itemData = updateFields['PLAYER_VISIBLE_ITEM_16_0'];
                                for (var kk =0 ; kk < itemData.length; kk++) {
                                    if (itemData[kk].index == 0) {
                                        newWorldUnit.setMainHandItem(itemData[kk].value);
                                    }
                                }
                            }

                        }

                        newWorldUnit.complete()

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
                this.objectMap[guid].setMovingData(0, moveTime, payload.m_move_flag, packetPoints);
                if (payload.m_stop_flag == 3) {
                    this.objectMap[guid].setFacingOnMovementEndGuid(payload.m_stop_flag_turn_to_guid)
                } else if (payload.m_stop_flag == 4) {
                    this.objectMap[guid].setFacingOnMovementEndFacing(payload.m_stop_flag_face_to)
                }
            } else {
                this.objectMap[guid].moveToFromCurrent(1000, packetPoints);
            }

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