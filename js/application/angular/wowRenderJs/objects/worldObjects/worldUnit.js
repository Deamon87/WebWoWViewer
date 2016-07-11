import MDXObject from './worldObject.js';

const fHairGeoset = [1, 3, 2];

function extractFilePath(filePath) {
    for (var i = filePath.length-1; i >0; i-- ) {
        if (filePath[i] == '\\' || filePath[i] == '/') {
            return filePath.substr(0, i+1);
        }
    }

    return '';
}

class WorldUnit {
    constructor(sceneApi){
        this.sceneApi = sceneApi;
        this.m2Object = null;

    }

    setDisplayId( value ) {
        var cdid = this.sceneApi.getCreatureDisplayInfoDBC();
        var cdied = this.sceneApi.getCreatureDisplayInfoExtraDBC();
        var cmdd = this.sceneApi.getCreatureModelDataDBC();
        var idid = this.sceneApi.getItemDisplayInfoDBC();

        var displayInf = cdid[value];
        var displayIDScale = displayInf.modelScale;

        var modelFilename = cmdd[displayInf.model1].modelName;
        var modelScale = cmdd[displayInf.model1].modelScale;

        var model = this.sceneApi.loadWorldM2Obj(modelFilename);

        var replaceTextures = [];
        if (displayInf.skin1 != '')
            replaceTextures[11] = extractFilePath(modelFilename)+displayInf.skin1+'.blp';

        if (displayInf.skin2 != '')
            replaceTextures[12] = extractFilePath(modelFilename)+displayInf.skin2+'.blp';

        if (displayInf.skin3 != '')
            replaceTextures[13] = extractFilePath(modelFilename)+displayInf.skin3+'.blp';

        var meshIds = [];
        if (displayInf[value].displayExtra > 0) {
            var displayExtraInfo = cdied[displayInf[value].displayExtra];

            for (var i = 0; i < 19; i++)
                meshIds[i] = 1;

            meshIds[7] = -1;
            replaceTextures[1] = 'Textures\\BakedNpcTextures\\'+displayExtraInfo.skin;

            //Hair
            var charSect = findSectionRec(displayExtraInfo.race,displayExtraInfo.gender, 3,
                displayExtraInfo.hairType, displayExtraInfo.hairStyle);
            if (charSect != null)
                replaceTextures[6] = charSect.texture1;

            var charHair = findHairGeosetRec( displayExtraInfo.race, displayExtraInfo.gender, displayExtraInfo.hairType);
            if ((charHair != null) && (charHair.geoset != 0))
                meshIds[0] = charHair.geoset;

            //FaceHair
            var charFHStyle = findFaceHairStyleRec(displayExtraInfo.race,displayExtraInfo.gender,displayExtraInfo.faceHairStyle);
            if (charFHStyle != null) {
                for (var i = 0; i < 3; i++)
                    if (charFHStyle.geoset[i] != 0)
                        meshIds[fHairGeoset[i]] = charFHStyle.geoset[i];
            }

            var charSect = findSectionRec(displayExtraInfo.race,displayExtraInfo.gender,2,displayExtraInfo.faceHairStyle,displayExtraInfo.hairStyle);
            if (charSect != null) {
                replaceTextures[8] = charSect.texture1;
            }

            /* Items */
            var ItemDInfo = idid[displayExtraInfo.helmItem];
            if (ItemDInfo.id >0) {

            }
            ItemDInfo = idid[displayExtraInfo.shoulderItem];
            if (ItemDInfo.id > 0) {

            }
            ItemDInfo = idid[displayExtraInfo.shirtItem];
            if (ItemDInfo.id >0 ){

            }
            ItemDInfo = idid[displayExtraInfo.cuirassItem];
            if (ItemDInfo.id > 0) {
                meshIds[8] = 1 + ItemDInfo.geosetGroup_1;
            }

            ItemDInfo = idid[displayExtraInfo.beltItem];
            if (ItemDInfo.id > 0) {
                meshIds[18] = 1 + ItemDInfo.geosetGroup_3;
            }
            ItemDInfo = idid[displayExtraInfo.legsItem];
            if (ItemDInfo.id >0) {
                if (meshIds[8] > 1)
                    meshIds[13] = 1 + ItemDInfo.geosetGroup_3;
            }
            ItemDInfo = idid[displayExtraInfo.bootsItem];
            if (ItemDInfo.id > 0) {
                meshIds[5] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.ringsItem];
            if (ItemDInfo.id > 0){

            }
            ItemDInfo = idid[displayExtraInfo.glovesItem];
            if (ItemDInfo.id >0) {
                meshIds[4] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.tabardItem];
            if (ItemDInfo.id > 0) {
                if (meshIds[8] == 1)
                    meshIds[12] = 1 + ItemDInfo.geosetGroup_1;
            }
            ItemDInfo = idid[displayExtraInfo.capeItem];
            if (ItemDInfo.id > 0) {
                replaceTextures[2] ='Item\\ObjectComponents\\Cape\\'+ ItemDInfo.leftTextureModel + '.BLP';
                meshIds[15] = 1 + ItemDInfo.geosetGroup_1;
            }
        }//DisplayExtra

        model.makeTextureArray(meshIds, replaceTextures);


        this.model = model;
    }
    setEntry ( value ) {
        this.entry = value;

        //1. Get displayId from entry


        //2. Set displayId
        this.setDisplayId(0)
    }
}