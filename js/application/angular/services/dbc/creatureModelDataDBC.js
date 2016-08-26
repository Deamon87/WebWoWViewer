import $q from 'q';
import loadDBC from './../dbcLoader.js';

var creatureModelDataDBCFile = null;

export default function creatureDisplayInfoExtraDBC(){
    var deferred = $q.defer();

    if (creatureModelDataDBCFile === null) {
        creatureModelDataDBCFile = {}
        var promise = loadDBC("DBFilesClient/CreatureModelData.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id                = dbcObject.readInt32(i, 0);

                record.unk            = dbcObject.readInt32(i, 1);
                record.modelName      = dbcObject.readText(i, 2);
                record.modelScale     = dbcObject.readFloat32(i, 3);

                record.minCorner      = {
                    x : dbcObject.readFloat32(i, 18),
                    y : dbcObject.readFloat32(i, 19),
                    z : dbcObject.readFloat32(i, 20),
                };
                record.maxCorner      = {
                    x : dbcObject.readFloat32(i, 21),
                    y : dbcObject.readFloat32(i, 22),
                    z : dbcObject.readFloat32(i, 23),
                };

                creatureModelDataDBCFile[id] = record;
            }

            deferred.resolve(creatureModelDataDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(creatureModelDataDBCFile);
    }

    return deferred.promise;
}
