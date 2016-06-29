import $q from 'q';
import loadDBC from './../dbcLoader.js';

var itemDisplayInfoDBCFile = null;

export default function itemDisplayInfoDBC(){
    var deferred = $q.defer();

    if (itemDisplayInfoDBCFile === null) {
        itemDisplayInfoDBCFile = {}
        var promise = loadDBC("DBFilesClient/ItemDisplayInfo.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id                = dbcObject.readInt32(i, 0);
                record.leftModel           = dbcObject.readText(i, 1);
                record.rightModel          = dbcObject.readText(i, 2);
                record.leftTextureModel    = dbcObject.readText(i, 3);
                record.rightTextureModel   = dbcObject.readText(i, 4);
                record.inventoryIcon1      = dbcObject.readText(i, 5);
                record.inventoryIcon2      = dbcObject.readText(i, 6);
                record.geosetGroup_1       = dbcObject.readInt32(i, 7);
                record.geosetGroup_2       = dbcObject.readInt32(i, 8);
                record.geosetGroup_3       = dbcObject.readInt32(i, 9);
                record.flags               = dbcObject.readInt32(i, 10);
                record.spellVisualID       = dbcObject.readInt32(i, 11);
                record.groupSoundIndex     = dbcObject.readInt32(i, 12);
                record.helmetGeosetVis_1   = dbcObject.readInt32(i, 13);
                record.helmetGeosetVis_2   = dbcObject.readInt32(i, 14);
                record.texture_1           = dbcObject.readText(i, 15);
                record.texture_2           = dbcObject.readText(i, 16);
                record.texture_3           = dbcObject.readText(i, 17);
                record.texture_4           = dbcObject.readText(i, 18);
                record.texture_5           = dbcObject.readText(i, 19);
                record.texture_6           = dbcObject.readText(i, 20);
                record.texture_7           = dbcObject.readText(i, 21);
                record.texture_8           = dbcObject.readText(i, 22);
                record.itemVisual          = dbcObject.readInt32(i, 23);
                record.particleColorId     = dbcObject.readInt32(i, 24);

                itemDisplayInfoDBCFile[id] = record;
            }

            deferred.resolve(itemDisplayInfoDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(itemDisplayInfoDBCFile);
    }

    return deferred.promise;
}
