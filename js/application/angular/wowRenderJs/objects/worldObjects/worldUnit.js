import WorldObject from './worldObject.js'
import TextureCompositionManager from './../../manager/textureCompositionManager.js'
import WowTextureRegions from './../../math/wowTextureRegions.js';
import CharacterComponents from '../../algorithms/characterComponents'
import {vec4, mat4, vec3, quat} from 'gl-matrix';


const fHairGeoset = [1, 3, 2, 16, 17];

const UNIT_MAINHAND_SLOT = 0;
const UNIT_OFFHAND_SLOT  = 1;
const UNIT_RANGED_SLOT   = 2;

const virtualItemMap = [1, 0, 1];
const helm_race_names = ['', 'hu', 'or', 'dw', 'ni', 'sc', 'ta', 'gn', 'tr', 'go',
'be', 'dr', 'fo', 'na', 'br', 'sk', 'vr', 'tu', 'ft', 'fwt', 'ns', 'it'];
const helm_gender = ['m', 'f'];

function extractFilePath(filePath) {
    for (var i = filePath.length-1; i >0; i-- ) {
        if (filePath[i] == '\\' || filePath[i] == '/') {
            return filePath.substr(0, i+1);
        }
    }

    return '';
}



function findSectionRec(csd, race, gender, section, type, color) {
    for (var i = 0; i < csd.length; i++) {
        if (csd[i].race == race &&
            csd[i].gender == gender &&
            csd[i].section == section &&
            ((type < 0) || (csd[i].type == type))
            &&
            csd[i].color == color
        ) {
            return csd[i];
        }
    }
    return null;
}
function findHairGeosetRec(chgd, race, gender, type ) {
    for (var i = 0; i < chgd.length; i++) {
        if (chgd[i].race == race &&
            chgd[i].gender == gender &&
            chgd[i].hairStyle == type
        ) {
            return chgd[i];
        }
    }
    return null;
}

function findFaceHairStyleRec(cfhsd, race, gender, type ) {
    for (var i = 0; i < cfhsd.length; i++) {
        if (cfhsd[i].race == race &&
            cfhsd[i].gender == gender &&
            cfhsd[i].hairStyle == type
        ) {
            return cfhsd[i];
        }
    }
    return null;
}



class WorldUnit extends WorldObject {
    constructor(sceneApi){
        super();

        this.sceneApi = sceneApi;

        this.currentTime = 0;

        this.movementFlag = 0;

        /* Speed block */
        this.speedWalk = 0;
        this.speedRun = 0;
        this.speedRunBack = 0;
        this.speedSwim = 0;
        this.speedSwimBack = 0;
        this.speedFly = 0;
        this.speedFlyBack = 0;
        this.speedTurnRate = 0;

        this.isMoving = false;


        this.objectModel = null;
        this.mountModel = null;
        this.items = new Array(3);
        this.helmet = null;
        this.textureCompositionManager = new TextureCompositionManager(sceneApi);
    }
    setSpeedWalk(value){
        this.speedWalk = value;
    }
    setSpeedRun(value) {
        this.speedRun = value;
    }
    setSpeedRunBack(value) {
        this.speedRunBack = value;
    }
    setSpeedSwim(value) {
        this.speedSwim = value;
    }
    setSpeedSwimBack(value) {
        this.speedSwimBack = value;
    }
    setSpeedFly(value) {
        this.speedFly = value;
    }
    setSpeedFlyBack(value) {
        this.speedFlyBack = value;
    }
    setSpeedTurnRate(value) {
        this.speedTurnRate = value; // rads per second?
    }
    getAnimationIdByMovementFlag(){
        var animationId = 0;
        if ((this.movementFlag & 0x100) > 0) {
            animationId = 5;
        } else {
            animationId = 4;
        }

        return animationId;
    }

    createMaterialFromOwnItem(){

    }

    createMaterialData(replaceTextures, meshIds, race, gender,
                       skin, face, hairType, hairStyle, faceHairStyle,
                       helmItem, shoulderItem, capeItem, chestItem, shirtItem, tabardItem, wristItem, glovesItem, beltItem, legsItem, bootsItem) {


        var idid = this.sceneApi.dbc.getItemDisplayInfoDBC();
        var csd = this.sceneApi.dbc.getCharSectionsDBC();
        var chgd = this.sceneApi.dbc.getCharHairGeosetsDBC();
        var cfhsd = this.sceneApi.dbc.getCharacterFacialHairStylesDBC();

        //Base Skin
        var charSect = findSectionRec(csd, race,gender, 0, -1, skin);
        if (charSect != null) {
            //replaceTextures[1] = charSect.texture1
            this.textureCompositionManager.addTexture(WowTextureRegions.Base, charSect.texture1, null);
        }
        //Face
        var charSect = findSectionRec(csd, race,gender, 1, face, skin);
        if (charSect != null) {
            this.textureCompositionManager.addTexture(WowTextureRegions.FaceLower, charSect.texture1, null);
            this.textureCompositionManager.addTexture(WowTextureRegions.FaceUpper, charSect.texture2, null);
        }

        //Hair
        var charSect = findSectionRec(csd, race,gender, 3, hairType, hairStyle);
        if (charSect != null) {
            replaceTextures[6] = charSect.texture1;

            this.textureCompositionManager.addTexture(WowTextureRegions.FaceLower, charSect.texture2, null);
            this.textureCompositionManager.addTexture(WowTextureRegions.FaceUpper, charSect.texture3, null);
            //charSect.texture2 == scalp Lower
            //charSect.texture3 == scalp Upper
        }

        var charHair = findHairGeosetRec(chgd, race, gender, hairType);
        if ((charHair != null) && (charHair.geoset != 0))
            meshIds[0] = charHair.geoset;

        //FaceHair
        var charSect = findSectionRec(csd, race,gender, 2, faceHairStyle, hairStyle);
        if (charSect != null) {
            this.textureCompositionManager.addTexture(WowTextureRegions.FaceLower, charSect.texture1, null);
            this.textureCompositionManager.addTexture(WowTextureRegions.FaceUpper, charSect.texture2, null);

        }
        var charFHStyle = findFaceHairStyleRec(cfhsd, race, gender, faceHairStyle);
        if (charFHStyle != null) {
            for (var i = 0; i < 3; i++)
                if (charFHStyle.geoset[i] != 0)
                    meshIds[fHairGeoset[i]] = charFHStyle.geoset[i];
        }

        //Underwear
        var charSect = findSectionRec(csd, race,gender, 4, -1, skin);
        if (charSect != null) {
            //replaceTextures[1] = charSect.texture1
            this.textureCompositionManager.addTexture(WowTextureRegions.LegUpper, charSect.texture1, null);
            this.textureCompositionManager.addTexture(WowTextureRegions.TorsoUpper, charSect.texture2, null);
        }

        /* Items */
        var ItemDInfo = idid[helmItem];
        if (ItemDInfo) {
            this.helmet = this.createHelmetFromItemDisplayInfo(race, gender, ItemDInfo)
        }
        ItemDInfo = idid[shoulderItem];
        if (ItemDInfo) {
            var leftModel = ItemDInfo.leftModel;
            var rightModel = ItemDInfo.rightModel;

            var leftModelTexture = ItemDInfo.leftTextureModel;
            var rightModelTexture = ItemDInfo.rightTextureModel;

            this.leftShoulder = this.createShoulderFromItemDisplayInfo(leftModel, leftModelTexture);
            this.rightShoulder = this.createShoulderFromItemDisplayInfo(rightModel, rightModelTexture);


        }
        ItemDInfo = idid[shirtItem];
        if (ItemDInfo){
            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
        ItemDInfo = idid[wristItem];
        if (ItemDInfo){
            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }


        ItemDInfo = idid[chestItem];
        if (ItemDInfo) {
            meshIds[8] = 1 + ItemDInfo.geosetGroup_1;
            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }

        ItemDInfo = idid[beltItem];
        if (ItemDInfo) {
            meshIds[18] = 1 + ItemDInfo.geosetGroup_3;
            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
        ItemDInfo = idid[legsItem];
        if (ItemDInfo) {
            if (meshIds[8] > 1)
                meshIds[13] = 1 + ItemDInfo.geosetGroup_3;

            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
        ItemDInfo = idid[bootsItem];
        if (ItemDInfo) {
            meshIds[5] = 1 + ItemDInfo.geosetGroup_1;

            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
        ItemDInfo = idid[glovesItem];
        if (ItemDInfo) {
            meshIds[4] = 1 + ItemDInfo.geosetGroup_1;

            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
        ItemDInfo = idid[tabardItem];
        if (ItemDInfo) {
            if (meshIds[8] == 1) {
                meshIds[12] = 1 + ItemDInfo.geosetGroup_1;
                CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
            }

        }
        ItemDInfo = idid[capeItem];
        if (ItemDInfo) {
            replaceTextures[2] ='Item\\ObjectComponents\\Cape\\'+ ItemDInfo.leftTextureModel + '.BLP';
            meshIds[15] = 1 + ItemDInfo.geosetGroup_1;
            CharacterComponents.addAllTextures(this.textureCompositionManager, ItemDInfo, gender);
        }
    }
    createModelFromDisplayId(value) {
        var cdid = this.sceneApi.dbc.getCreatureDisplayInfoDBC();
        var cdied = this.sceneApi.dbc.getCreatureDisplayInfoExtraDBC();
        var cmdd = this.sceneApi.dbc.getCreatureModelDataDBC();


        var displayInf = cdid[value];
        var displayIDScale = displayInf.modelScale;
        this.displayIDScale = displayIDScale;

        var modelFilename = cmdd[displayInf.model1].modelName;
        var modelScale = cmdd[displayInf.model1].modelScale;
        this.modelScale = modelScale;

        var replaceTextures = [];
        if (displayInf.skin1 != '')
            replaceTextures[11] = extractFilePath(modelFilename)+displayInf.skin1+'.blp';

        if (displayInf.skin2 != '')
            replaceTextures[12] = extractFilePath(modelFilename)+displayInf.skin2+'.blp';

        if (displayInf.skin3 != '')
            replaceTextures[13] = extractFilePath(modelFilename)+displayInf.skin3+'.blp';

        var meshIds = [];
        for (var i = 0; i < 19; i++)
            meshIds[i] = 1;

        var useMeshId = false;
        if (displayInf.displayExtra > 0 || displayInf.creatureGeosetData > 0) {
            var useMeshId = true;
        }

        if (displayInf.displayExtra > 0) {

            var displayExtraInfo = cdied[displayInf.displayExtra];

            replaceTextures[1] = 'Textures\\BakedNpcTextures\\'+displayExtraInfo.skinTexture;

            this.createMaterialData(replaceTextures, meshIds, displayExtraInfo.race, displayExtraInfo.gender,
                displayExtraInfo.skin, displayExtraInfo.face, displayExtraInfo.hairType, displayExtraInfo.hairStyle, displayExtraInfo.faceHairStyle,
                displayExtraInfo.helmItem, displayExtraInfo.shoulderItem, displayExtraInfo.capeItem,
                displayExtraInfo.cuirassItem, displayExtraInfo.shirtItem, displayExtraInfo.tabardItem, displayExtraInfo.wristItem,
                displayExtraInfo.glovesItem, displayExtraInfo.beltItem, displayExtraInfo.legsItem ,displayExtraInfo.bootsItem);


        } else {
            if (this.createMaterialFromOwnItem(replaceTextures, meshIds)) {
                useMeshId = true;
            }
        }//DisplayExtra


        var model = this.sceneApi.objects.loadWorldM2Obj(modelFilename,(useMeshId) ? meshIds : null, replaceTextures);
        return model;
    }
    createHelmetFromItemDisplayInfo(race, gender, ItemDInfo) {
        var helmPath = "Item\\ObjectComponents\\head\\";
        var suffix = "_" + helm_race_names[race] + helm_gender[gender];

        var modelName = helmPath + ItemDInfo.leftModel;
        var nameTemplate = modelName.split('.')[0];
        modelName = nameTemplate + suffix + '.m2';

        var replaceTextures = [];
        if (ItemDInfo.leftTextureModel)
            replaceTextures[2] = helmPath + ItemDInfo.leftTextureModel + '.blp';


        var model = this.sceneApi.objects.loadWorldM2Obj(modelName, null, replaceTextures);
        return model
    }
    createShoulderFromItemDisplayInfo(modelName, texture) {
        var shoulderPath = "item/objectcomponents/shoulder/";
        var suffix = '';
        var trueModelName = shoulderPath + modelName;
        var nameTemplate = trueModelName.split('.')[0];
        trueModelName = nameTemplate + suffix + '.m2';

        var replaceTextures = [];
        if (texture)
            replaceTextures[2] = shoulderPath + texture + '.blp';


        var model = this.sceneApi.objects.loadWorldM2Obj(trueModelName, null, replaceTextures);
        return model
    }

    update (deltaTime, cameraPos, viewMat) {
        var objectModelIsLoaded = this.objectModel && this.objectModel.m2Geom && this.objectModel.m2Geom.m2File;
        var objectModelHasBones = objectModelIsLoaded &&  this.objectModel.bonesMatrices;
        /* 1. Calculate current position */
        if (this.isMoving) {
            if ((this.currentMovingTime + deltaTime) >= this.totalMovingTime) {
                this.setPosition(this.pointsArray[this.pointsArray.length - 1]);

                if (this.onStopfaceToFloat) {
                    this.setRotation(this.faceToRotation);
                }

                this.isMoving = false;
            } else {
                //Take the totalPath by last point
                var totalPath = this.pointsTotalPath[this.pointsTotalPath.length - 1];
                var currentPath = (totalPath / this.totalMovingTime) * (this.currentMovingTime + deltaTime);
                var pointIndex = 0;
                var result = this.pointsTotalPath[0]

                for (var i = 1; i < this.pointsArray.length; i++) {
                    if (currentPath < this.pointsTotalPath[i]) {
                        var value1 = this.pointsArray[i - 1];
                        var value2 = this.pointsArray[i];

                        var path1 = this.pointsTotalPath[i - 1];
                        var path2 = this.pointsTotalPath[i];

                        var diff = vec4.create();
                        vec3.subtract(diff, value2, value1);
                        vec3.scale(diff, diff, (currentPath - path1)/(path2 - path1));
                        var result = vec3.create();
                        vec3.add(result, value1, diff);

                        //CalcF
                        //vec3.scale(diff, diff, -1)
                        vec3.normalize(diff, diff);
                        if (diff[1] < 0) {
                            this.setRotation(2 * Math.PI - Math.acos(diff[0]));
                        } else {
                            this.setRotation(Math.acos(diff[0]));
                        }

                        break;
                    }
                }

                this.setPosition(result);
            }
            this.currentMovingTime += deltaTime;
        }

        /* 2. Update position for all models */
        var properScale = this.displayIDScale * this.modelScale;
        if (this.scale > 0.0001) {
            properScale = this.displayIDScale * this.modelScale *  this.scale;
        }

        if (this.mountModel && objectModelIsLoaded) {
            if (this.isMoving) {
                var animationId = this.getAnimationIdByMovementFlag();
                this.mountModel.setAnimationId(animationId, false);
            } else {
                this.mountModel.setAnimationId(0); //Stand(0) animation
            }

            /* Update placement matrix */
            this.mountModel.createPlacementMatrix(this.pos, this.f, properScale);

            /* Update bone matrices */
            if (this.mountModel.loaded) {
                this.mountModel.objectUpdate(deltaTime, cameraPos, viewMat);
            }

            if (this.mountModel.bonesMatrices) {
                /* Update main model */
                this.objectModel.createPlacementMatrixFromParent(this.mountModel, 0, properScale);
                this.objectModel.setAnimationId(91, false);
            }
            //this.objectModel.animation
        } else if (objectModelIsLoaded){
            if (this.isMoving) {
                var animationId = this.getAnimationIdByMovementFlag()
                this.objectModel.setAnimationId(animationId, false);
            } else {
                this.objectModel.setAnimationId(0); //Stand(0) animation
            }
            this.objectModel.createPlacementMatrix(this.pos, this.f, properScale);
        }

        /* Configure hands */
        if (objectModelIsLoaded) {
            if (this.items[0] && this.items[0].m2Geom) {
                this.objectModel.setRightHandClosed(true)
            }
            if (this.items[1] && this.items[1].m2Geom) {
                this.objectModel.setLeftHandClosed(true)
            }
        }

        /* Update bone matrices */
        this.objectModel.objectUpdate(deltaTime, cameraPos, viewMat);

        if (objectModelIsLoaded && objectModelHasBones && this.helmet) {
            /* Update helm model */
            this.helmet.createPlacementMatrixFromParent(this.objectModel, 11, properScale);

            if (this.helmet.loaded) {
                this.helmet.objectUpdate(deltaTime, cameraPos, viewMat);
            }
        }

        if (objectModelIsLoaded && objectModelHasBones && this.leftShoulder) {
            /* Update left shoulder model */
            this.leftShoulder.createPlacementMatrixFromParent(this.objectModel, 6, properScale);

            if (this.leftShoulder.loaded) {
                this.leftShoulder.objectUpdate(deltaTime, cameraPos, viewMat);
            }
        }
        if (objectModelIsLoaded && objectModelHasBones && this.rightShoulder) {
            /* Update right shoulder model */
            this.rightShoulder.createPlacementMatrixFromParent(this.objectModel, 5, properScale);

            if (this.rightShoulder.loaded) {
                this.rightShoulder.objectUpdate(deltaTime, cameraPos, viewMat);
            }
        }


        //3. Update placement matrices for items
        if ( objectModelIsLoaded && objectModelHasBones) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i]) {
                    this.items[i].createPlacementMatrixFromParent(this.objectModel, virtualItemMap[i], properScale);
                    if (this.items[i].loaded) {
                        this.items[i].objectUpdate(deltaTime, cameraPos, viewMat);
                    }
                }
            }
        }

        if (this.objectModel && this.objectModel.loaded) {
            if (this.textureCompositionManager.update()) {
                this.objectModel.overrideModelTexture(this.textureCompositionManager.texture);
            }
        }




        this.currentTime += deltaTime;
    }
    setMovingData(currentMovingTime, totalMovingTime, movementFlag, points) {
        this.onStopfaceToGuid = false;
        this.onStopfaceToFloat = false;

        this.currentMovingTime = currentMovingTime;
        this.totalMovingTime = totalMovingTime;
        this.pointsArray = points;

        //Calculate total path for points
        var totalPath = 0;
        var pointsTotalPath = new Array(this.pointsArray.length);
        var prevPoint = this.pointsArray[0];
        for (var i = 0; i < this.pointsArray.length; i++) {
            var deltaX = prevPoint[0] - this.pointsArray[i][0];
            var deltaY = prevPoint[1] - this.pointsArray[i][1];
            var deltaZ = prevPoint[2] - this.pointsArray[i][2];

            totalPath += Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ * deltaZ);
            pointsTotalPath[i] = totalPath;

            prevPoint = this.pointsArray[i];
        }
        this.pointsTotalPath = pointsTotalPath;
        this.movementFlag = movementFlag;

        this.isMoving = true;
    }
    moveToFromCurrent(time, packetPoints) {
        this.onStopfaceToGuid = false;
        this.onStopfaceToFloat = false;

        var packetPointsReal = new Array();
        packetPointsReal.push(this.getPosition());
        for (var i = 0; i < packetPoints.length; i++) {
            packetPointsReal.push(packetPoints[i])
        }

        this.currentMovingTime = 0;
        this.totalMovingTime = time;
        this.pointsArray = packetPointsReal;

        //Calculate total path for points
        var totalPath = 0;
        var pointsTotalPath = new Array(this.pointsArray.length);
        var prevPoint = this.pointsArray[0];
        for (var i = 0; i < this.pointsArray.length; i++) {
            var deltaX = prevPoint[0] - this.pointsArray[i][0];
            var deltaY = prevPoint[1] - this.pointsArray[i][1];
            var deltaZ = prevPoint[2] - this.pointsArray[i][2];

            totalPath += Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ * deltaZ);
            pointsTotalPath[i] = totalPath;

            prevPoint = this.pointsArray[i];
        }
        this.pointsTotalPath = pointsTotalPath;
        this.movementFlag = 0;
        this.isMoving = true;
    }
    setFacingOnMovementEndGuid(guid) {
        this.onStopfaceToGuid = true;
        this.faceToGuid = guid;
    }
    setFacingOnMovementEndFacing(float) {
        this.onStopfaceToFloat = true;
        this.faceToRotation = float;
    }
    setCurrentTime(value){
        this.currentTime = value;
    }
    setUnitRace(race) {
        this.unitRace = race;
    }
    setUnitClass(unitClass) {
        this.unitClass = unitClass;
    }
    setUnitGender(gender){
        this.unitGender = gender;
    }
    setUnitPowerType(powerType){

    }
    setVirtualItemSlot(slot, displayId, itemClass, itemSubClass, itemInventoryType) {
        var idid = this.sceneApi.dbc.getItemDisplayInfoDBC();

        /* 1. Free previous model */

        /* 2. Configure new model */
        var modelPath;
        if (itemInventoryType == 14) {
            modelPath = "item/objectcomponents/shield/";
        } else {
            modelPath = "item/objectcomponents/weapon/";
        }
        var ItemDInfo = idid[displayId];
        if (ItemDInfo) {
            var modelName;
            var replaceTextures = [];

            modelName = ItemDInfo.leftModel;
            if (ItemDInfo.leftTextureModel)
                replaceTextures[2] = modelPath + ItemDInfo.leftTextureModel + '.blp';

            if (slot != UNIT_MAINHAND_SLOT) {
                if (ItemDInfo.rightModel != "") {
                    modelName = ItemDInfo.rightModel;
                    if (ItemDInfo.rightTextureModel)
                        replaceTextures[2] = modelPath + ItemDInfo.rightTextureModel + '.blp';
                }
            }
            modelName = modelPath + modelName;

            var model = this.sceneApi.objects.loadWorldM2Obj(modelName, null, replaceTextures);

            this.items[slot] = model;
        }
    }

    setMountDisplayId(value) {
        this.mountDisplayId = value;
        this.mountModelChanged = true;

    }
    setDisplayId( value ) {
        this.displayId = value;
        this.modelChanged = value;
    }
    setNativeDisplayId( value ) {
        this.nativeDisplayId = value;
        this.modelChanged = true;
    }
    setEntry ( value ) {
        this.entry = value;
    }
    complete () {
        if (this.modelChanged)  {
            var model = this.createModelFromDisplayId(this.nativeDisplayId);
            this.objectModel = model;
        }

        if (this.mountModelChanged) {
            var model = this.createModelFromDisplayId(this.mountDisplayId);
            this.mountModel = model;
        }
    }
}

export default WorldUnit;