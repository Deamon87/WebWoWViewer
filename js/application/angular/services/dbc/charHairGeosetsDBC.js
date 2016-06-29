import $q from 'q';
import loadDBC from './../dbcLoader.js';

var charHairGeosetsDBCFile = null;

export default function characterFacialHairStylesDBC(){
    var deferred = $q.defer();

    if (charHairGeosetsDBCFile === null) {
        charHairGeosetsDBCFile = {}
        var promise = loadDBC("DBFilesClient/CharacterFacialHairStyles.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id            = dbcObject.readInt32(i, 0);
                record.race       = dbcObject.readInt32(i, 1);
                record.gender     = dbcObject.readInt32(i, 2);
                record.hairStyle  = dbcObject.readInt32(i, 3);
                record.geoset     = dbcObject.readInt32(i, 4);
                record.unk        = dbcObject.readInt32(i, 5);

                charHairGeosetsDBCFile[i] = record;
            }

            deferred.resolve(charHairGeosetsDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(charHairGeosetsDBCFile);
    }

    return deferred.promise;
}
