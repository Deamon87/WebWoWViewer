import $q from 'q';
import loadDBC from './../dbcLoader.js';

var creatureDisplayInfoDBCFile = null;

export default function creatureDisplayInfoDBC(){
    var deferred = $q.defer();

    if (creatureDisplayInfoDBCFile === null) {
        creatureDisplayInfoDBCFile = {}
        var promise = loadDBC("DBFilesClient/CreatureDisplayInfo.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id              = dbcObject.readInt32(i, 0);
                record.model1       = dbcObject.readInt32(i, 1);
                record.sound        = dbcObject.readInt32(i, 2);
                record.displayExtra = dbcObject.readInt32(i, 3);
                record.modelScale   = dbcObject.readFloat32(i, 4);
                record.opacity      = dbcObject.readInt32(i, 5);
                record.skin1        = dbcObject.readText(i, 6);
                record.skin2        = dbcObject.readText(i, 7);
                record.skin3        = dbcObject.readText(i, 8);

                record.creatureGeosetData = dbcObject.readUInt32(i, 14);

                creatureDisplayInfoDBCFile[id] = record;
            }

            deferred.resolve(creatureDisplayInfoDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(creatureDisplayInfoDBCFile);
    }

    return deferred.promise;
}
