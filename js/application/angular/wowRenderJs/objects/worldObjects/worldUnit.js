import WorldObject from './worldObject.js'
import {vec4, mat4, vec3, quat} from 'gl-matrix';


const fHairGeoset = [1, 3, 2];

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
            csd[i].type == type &&
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

    createModelFromDisplayId(value){
        var csd = this.sceneApi.dbc.getCharSectionsDBC();
        var chgd = this.sceneApi.dbc.getCharHairGeosetsDBC();
        var cfhsd = this.sceneApi.dbc.getCharacterFacialHairStylesDBC();

        var cdid = this.sceneApi.dbc.getCreatureDisplayInfoDBC();
        var cdied = this.sceneApi.dbc.getCreatureDisplayInfoExtraDBC();
        var cmdd = this.sceneApi.dbc.getCreatureModelDataDBC();
        var idid = this.sceneApi.dbc.getItemDisplayInfoDBC();

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

        meshIds[7] = 1; // ears

        if (displayInf.displayExtra > 0) {
            var displayExtraInfo = cdied[displayInf.displayExtra];

            replaceTextures[1] = 'Textures\\BakedNpcTextures\\'+displayExtraInfo.skinTexture;

            //Hair
            var charSect = findSectionRec(csd, displayExtraInfo.race,displayExtraInfo.gender, 3,
                displayExtraInfo.hairType, displayExtraInfo.hairStyle);
            if (charSect != null)
                replaceTextures[6] = charSect.texture1;

            var charHair = findHairGeosetRec(chgd, displayExtraInfo.race, displayExtraInfo.gender, displayExtraInfo.hairType);
            if ((charHair != null) && (charHair.geoset != 0))
                meshIds[0] = charHair.geoset;

            //FaceHair
            var charSect = findSectionRec(csd, displayExtraInfo.race,displayExtraInfo.gender, 2,displayExtraInfo.faceHairStyle,displayExtraInfo.hairStyle);
            if (charSect != null) {
                replaceTextures[8] = charSect.texture1;
            }
            var charFHStyle = findFaceHairStyleRec(cfhsd, displayExtraInfo.race,
                displayExtraInfo.gender, displayExtraInfo.faceHairStyle);
            if (charFHStyle != null) {
                for (var i = 0; i < 3; i++)
                    if (charFHStyle.geoset[i] != 0)
                        meshIds[fHairGeoset[i]] = charFHStyle.geoset[i];
            }

            /* Items */
            var ItemDInfo = idid[displayExtraInfo.helmItem];
            if (ItemDInfo) {
                this.helmet = this.createHelmetFromItemDisplayInfo(displayExtraInfo.race, displayExtraInfo.gender, ItemDInfo)
            }
            ItemDInfo = idid[displayExtraInfo.shoulderItem];
            if (ItemDInfo) {

            }
            ItemDInfo = idid[displayExtraInfo.shirtItem];
            if (ItemDInfo){

            }
            ItemDInfo = idid[displayExtraInfo.cuirassItem];
            if (ItemDInfo) {
                meshIds[8] = 1 + ItemDInfo.geosetGroup_1;
            }

            ItemDInfo = idid[displayExtraInfo.beltItem];
            if (ItemDInfo) {
                meshIds[18] = 1 + ItemDInfo.geosetGroup_3;
            }
            ItemDInfo = idid[displayExtraInfo.legsItem];
            if (ItemDInfo) {
                if (meshIds[8] > 1)
                    meshIds[13] = 1 + ItemDInfo.geosetGroup_3;
            }
            ItemDInfo = idid[displayExtraInfo.bootsItem];
            if (ItemDInfo) {
                meshIds[5] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.ringsItem];
            if (ItemDInfo){

            }
            ItemDInfo = idid[displayExtraInfo.glovesItem];
            if (ItemDInfo) {
                meshIds[4] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.tabardItem];
            if (ItemDInfo) {
                if (meshIds[8] == 1)
                    meshIds[12] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.capeItem];
            if (ItemDInfo) {
                replaceTextures[2] ='Item\\ObjectComponents\\Cape\\'+ ItemDInfo.leftTextureModel + '.BLP';
                meshIds[15] = 1 + ItemDInfo.geosetGroup_1;
            }
        }//DisplayExtra


        var model = this.sceneApi.objects.loadWorldM2Obj(modelFilename,meshIds,replaceTextures);
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

    update (deltaTime, cameraPos, debugServerTime) {
        var objectModelIsLoaded = this.objectModel && this.objectModel.m2Geom && this.objectModel.m2Geom.m2File;
        var objectModelHasBones = objectModelIsLoaded && this.objectModel.bonesMatrices;
        /* 1. Calculate current position */
        if (this.isMoving) {
            if ((this.currentMovingTime + deltaTime) >= this.totalMovingTime) {
                this.setPosition(this.pointsArray[this.pointsArray.length - 1]);
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
        var properScale = this.displayIDScale;
        if (this.scale > 0.0001) {
            properScale = this.displayIDScale * this.scale;
        }

        if (this.mountModel && this.mountModel.m2Geom != null && this.mountModel.m2Geom.m2File != null &&
            objectModelIsLoaded
        ) {
            if (this.isMoving) {
                var animationId = this.getAnimationIdByMovementFlag();
                this.mountModel.setAnimationId(animationId, false);
            } else {
                this.mountModel.setAnimationId(0); //Stand(0) animation
            }

            /* Update placement matrix */
            this.mountModel.createPlacementMatrix(this.pos, this.f, properScale);

            /* Update bone matrices */
            this.mountModel.objectUpdate(deltaTime, cameraPos);

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
        this.objectModel.objectUpdate(deltaTime, cameraPos);

        if (objectModelIsLoaded && objectModelHasBones &&
            this.helmet && this.helmet.m2Geom != null && this.helmet.m2Geom.m2File != null) {
            /* Update helm model */
            this.helmet.createPlacementMatrixFromParent(this.objectModel, 11, properScale);

            this.helmet.objectUpdate(deltaTime, cameraPos);
        }


        //3. Update placement matrices for items
        if ( objectModelIsLoaded && objectModelHasBones) {
            for (var i = 0; i < this.items.length; i++) {
                if (this.items[i] && this.items[i].m2Geom) {
                    this.items[i].createPlacementMatrixFromParent(this.objectModel, virtualItemMap[i], properScale);
                    this.items[i].objectUpdate(deltaTime, cameraPos);
                }
            }
        }



        this.currentTime += deltaTime;
    }
    setMovingData(currentMovingTime, totalMovingTime, movementFlag, points) {
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

    setCurrentTime(value){
        this.currentTime = value;
    }
    setVirtualItemSlot(slot, displayId) {
        var idid = this.sceneApi.dbc.getItemDisplayInfoDBC();

        /* 1. Free previous model */

        /* 2. Configure new model */
        var modelPath;
        if (slot == 0) {
            modelPath = "item/objectcomponents/weapon/";
        } else if (slot == 1)  {
            modelPath = "item/objectcomponents/shield/";
        } else if (slot == 2) {
            modelPath = "item/objectcomponents/weapon/";
        }
        var ItemDInfo = idid[displayId];
        if (ItemDInfo) {
            var modelName;
            if (slot == UNIT_MAINHAND_SLOT || slot == UNIT_RANGED_SLOT) {
                modelName = ItemDInfo.leftModel
            } else {
                modelName = ItemDInfo.leftModel
            }
            modelName = modelPath + modelName;

            var replaceTextures = [];
            if (ItemDInfo.leftTextureModel)
                replaceTextures[2] = modelPath + ItemDInfo.leftTextureModel + '.blp';

            var model = this.sceneApi.objects.loadWorldM2Obj(modelName, null, replaceTextures);

            this.items[slot] = model;
        }
    }

    setMountDisplayId(value) {
        var model = this.createModelFromDisplayId(value);

        this.mountModel = model;
    }
    setDisplayId( value ) {
        var model = this.createModelFromDisplayId(value);

        this.objectModel = model;
    }
    setEntry ( value ) {
        this.entry = value;

        //1. Get displayId from entry


        //2. Set displayId
        this.setDisplayId(0)
    }
}

export default WorldUnit;