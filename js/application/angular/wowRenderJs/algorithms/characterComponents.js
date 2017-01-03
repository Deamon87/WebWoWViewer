import WowTextureRegions from '../math/wowTextureRegions'
class CharacterComponents {

    static generateGeosetFromItems(sceneApi, meshIds, helmItem, shoulderItem,
        capeItem, chestItem, shirtItem, tabardItem, wristItem, glovesItem, beltItem, legsItem, bootsItem) {


        var idid = this.sceneApi.dbc.getItemDisplayInfoDBC();

        var glovesItemRec = idid[glovesItem];
        var chestItemRec = idid[chestItem];
        var shirtItemRec = idid[shirtItem];
        var helmItemRec = idid[helmItem];
        var shoulderItemRec = idid[shoulderItem];
        var capeItemRec = idid[capeItem];
        var tabardItemRec = idid[tabardItem];
        var wristItemRec = idid[wristItem];
        var beltItemRec = idid[beltItem];
        var legsItemRec = idid[legsItem];
        var bootsItemRec = idid[bootsItem];


        if (glovesItemRec && (glovesItemRec.geosetGroup_1 > 0)) {
            meshIds[4] = 1 + glovesItemRec.geosetGroup_1;


            //this.addAllTextures(ItemDInfo, gender_prefix);
        } else if (chestItemRec && (chestItemRec.geosetGroup_1 > 0)){
            meshIds[8] = 1 + glovesItemRec.geosetGroup_1;
        }
        //Chest
        if (meshIds[8] == 1 && shirtItemRec && (shirtItemRec.geosetGroup_1 > 0)) {
            meshIds[8] = 1 + shirtItemRec.geosetGroup_1;
        }

        //Belt
        var hasBulkyBeltFlag = false;
        if (beltItemRec && (((beltItemRec.flags >> 9) & 1) > 0)) {
            hasBulkyBeltFlag = true;
        }

        //Chest again
        if (chestItemRec && (chestItemRec.geosetGroup_3 > 0)) {
            var dressPants = false;
            var dressChestpiece = true;

            meshIds[13] = 1 + chestItemRec.geosetGroup_3;
        } else if (legsItemRec && (legsItemRec.geosetGroup_3 > 0)){
            dressPants = true;
            dressChestpiece = false;

            meshIds[13] = 1 + legsItemRec.geosetGroup_3;
        } else {
            dressPants = false;
            dressChestpiece = false;

            if (bootsItemRec && (bootsItemRec.geosetGroup_1 > 0)) {
                meshIds[5] = 1 + legsItemRec.geosetGroup_1;
            } else if (legsItemRec && legsItemRec.geosetGroup_2){
                meshIds[9] = 1 + legsItemRec.geosetGroup_2;
            }
        }

        // BOOTS (6) - m_geosetGroup[1] modifies 2000 (yes, 2000) and has some fun conditionals



    }
    static generateTexturesFromItems(sceneApi, textureCompositionManager, meshIds, replaceTextures, helmItem, shoulderItem,
         capeItem, chestItem, shirtItem, tabardItem, wristItem, glovesItem, beltItem, legsItem, bootsItem) {


    }

    static addAllTextures(textureCompositionManager, itemDisplayInfoRec, gender) {
        if (itemDisplayInfoRec.texture_1 != '')
            textureCompositionManager.addTexture(WowTextureRegions.ArmUpper,   'item/texturecomponents/armuppertexture/'+itemDisplayInfoRec.texture_1, gender);
        if (itemDisplayInfoRec.texture_2 != '')
            textureCompositionManager.addTexture(WowTextureRegions.ArmLower,   'item/texturecomponents/armlowertexture/'+itemDisplayInfoRec.texture_2, gender);
        if (itemDisplayInfoRec.texture_3 != '')
            textureCompositionManager.addTexture(WowTextureRegions.Hand,       'item/texturecomponents/handtexture/'+itemDisplayInfoRec.texture_3, gender);
        if (itemDisplayInfoRec.texture_4 != '')
            textureCompositionManager.addTexture(WowTextureRegions.TorsoUpper, 'item/texturecomponents/torsouppertexture/'+itemDisplayInfoRec.texture_4, gender);
        if (itemDisplayInfoRec.texture_5 != '')
            textureCompositionManager.addTexture(WowTextureRegions.TorsoLower, 'item/texturecomponents/torsolowertexture/'+itemDisplayInfoRec.texture_5, gender);
        if (itemDisplayInfoRec.texture_6 != '')
            textureCompositionManager.addTexture(WowTextureRegions.LegUpper,   'item/texturecomponents/leguppertexture/'+itemDisplayInfoRec.texture_6, gender);
        if (itemDisplayInfoRec.texture_7 != '')
            textureCompositionManager.addTexture(WowTextureRegions.LegLower,   'item/texturecomponents/leglowertexture/'+itemDisplayInfoRec.texture_7, gender);
        if (itemDisplayInfoRec.texture_8 != '')
            textureCompositionManager.addTexture(WowTextureRegions.Foot,       'item/texturecomponents/foottexture/'+itemDisplayInfoRec.texture_8, gender);
    }
}

export default CharacterComponents;