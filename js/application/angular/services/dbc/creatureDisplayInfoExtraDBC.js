import $q from 'q';
import loadDBC from './../dbcLoader.js';

var creatureDisplayInfoExtraDBCFile = null;

export default function creatureDisplayInfoExtraDBC(){
    var deferred = $q.defer();

    if (creatureDisplayInfoExtraDBCFile === null) {
        creatureDisplayInfoExtraDBCFile = {}
        var promise = loadDBC("DBFilesClient/CreatureDisplayInfoExtra.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id              = dbcObject.readInt32(i, 0);

                record.race           = dbcObject.readInt32(i, 1);
                record.gender         = dbcObject.readInt32(i, 2);
                record.skin           = dbcObject.readInt32(i, 3);
                record.face           = dbcObject.readInt32(i, 4);
                record.hairType       = dbcObject.readInt32(i, 5);
                record.hairStyle      = dbcObject.readInt32(i, 6);
                record.faceHairStyle  = dbcObject.readInt32(i, 7);
                record.helmItem       = dbcObject.readInt32(i, 8);
                record.shoulderItem   = dbcObject.readInt32(i, 9);
                record.shirtItem      = dbcObject.readInt32(i, 10);
                record.cuirassItem    = dbcObject.readInt32(i, 11);
                record.beltItem       = dbcObject.readInt32(i, 12);
                record.legsItem       = dbcObject.readInt32(i, 13);
                record.bootsItem      = dbcObject.readInt32(i, 14);
                record.ringsItem      = dbcObject.readInt32(i, 15);
                record.glovesItem     = dbcObject.readInt32(i, 16);
                record.tabardItem     = dbcObject.readInt32(i, 17);
                record.capeItem       = dbcObject.readInt32(i, 18);
                record.CanEquip       = dbcObject.readInt32(i, 19);
                record.skinTexture    = dbcObject.readText(i, 20);

                creatureDisplayInfoExtraDBCFile[id] = record;
            }

            deferred.resolve(creatureDisplayInfoExtraDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(creatureDisplayInfoExtraDBCFile);
    }

    return deferred.promise;
}
