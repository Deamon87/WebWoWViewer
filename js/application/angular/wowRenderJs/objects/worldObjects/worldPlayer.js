import WorldUnit from './worldUnit.js';

//For ref: http://images.staticjw.com/wor/3751/addon-use-char.png
const player_item_HEAD = 1;
const player_item_NECK = 2;
const player_item_SHOULDERS = 3;
const player_item_BODY = 4;
const player_item_CHEST = 5;
const player_item_WAIST = 6;
const player_item_LEGS = 7;
const player_item_FEET = 8;
const player_item_WRIST = 9;
const player_item_HAND = 10;
const player_item_FINGER1 = 11;
const player_item_FINGER2 = 12;
const player_item_TRINKET1 = 13;
const player_item_TRINKET2 = 14;
const player_item_BACK = 15;
const player_item_MAINHAND = 16;
const player_item_OFFHAND = 17;
const player_item_RELIC = 18;
const player_item_TABARD = 19;

class WorldPlayer extends WorldUnit {
    constructor(sceneApi) {
        super(sceneApi);

        this.headItemId = -1;
        this.neckItemId = -1;
        this.shoulderItemId = -1;
        this.bodyItemId = -1;
        this.chestItemId = -1;
        this.waistItemId = -1;
        this.legsItemId = -1;
        this.feetItemId = -1;
        this.wristItemId = -1;
        this.handsItemId = -1;
        this.backItemId = -1;
        this.mainHandItemId = -1;
        this.offHandItemId = -1;
        this.tabardItemId = -1;
    }

    setPlayerFaceFeatures(faceFeatures) {
        this.playerFaceFeatures = faceFeatures;
    }

    setPlayerSkin(skin) {
        this.playerSkin = skin;
    }

    setPlayerFace(face) {
        this.playerFace = face;
    }

    setPlayerHair(hair) {
        this.playerHair = hair;
    }

    setPlayerHairColor(hairColor) {
        this.playerHairColor = hairColor;
    }

    /* Items */
    setHeadItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.headItemId = itemRecord.displayId;
        }

    }

    setNeckItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.neckItemId = itemRecord.displayId;
        }
    }

    setShouldersItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.shoulderItemId = itemRecord.displayId;
        }
    }

    setBodyItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.bodyItemId = itemRecord.displayId;
        }
    }

    setChestItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.chestItemId = itemRecord.displayId;
        }
    }

    setWaistItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.waistItemId = itemRecord.displayId;
        }
    }

    setLegsItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.legsItemId = itemRecord.displayId;
        }
    }

    setFeetItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.feetItemId = itemRecord.displayId;
        }
    }

    setWristItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.wristItemId = itemRecord.displayId;
        }
    }

    setHandsItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.handsItemId = itemRecord.displayId;
        }
    }

    setBackItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.backItemId = itemRecord.displayId;
        }
    }

    setMainHandItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.mainHandItemId = itemRecord.displayId;
        }
    }

    setOffHandItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.offHandItemId = itemRecord.displayId;
        }
    }

    setTabardItem(entry) {
        var itemRecord = this.sceneApi.dbc.getItemDBC()[entry];
        if (itemRecord) {
            this.tabardItemId = itemRecord.displayId;
        }
    }

    /* ---------------*/

    createMaterialFromOwnItem(replaceTextures, meshIds) {
        this.createMaterialData(replaceTextures, meshIds,
            this.unitRace, this.unitGender,


            this.playerSkin, this.playerFace, this.playerHair, this.playerHairColor, this.playerFaceFeatures,
             //-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1);
            this.headItemId, this.shoulderItemId, this.backItemId, this.chestItemId, -1, this.tabardItemId,
            this.wristItemId, this.handsItemId, this.waistItemId, this.legsItemId, this.feetItemId);

        return true;
    }
}
export default WorldPlayer;
