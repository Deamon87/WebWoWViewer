import $q from 'q';
import loadDBC from './../dbcLoader.js';

var characterFacialHairStylesDBCFile = null;

export default function characterFacialHairStylesDBC(){
    var deferred = $q.defer();

    if (characterFacialHairStylesDBCFile === null) {
        characterFacialHairStylesDBCFile = [];
        var promise = loadDBC("DBFilesClient/CharacterFacialHairStyles.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                record.race        = dbcObject.readInt32(i, 0);
                record.gender      = dbcObject.readInt32(i, 1);
                record.hairStyle   = dbcObject.readInt32(i, 2);
                record.geoset = [];
                for( var j = 0; j < 5; j++)
                    record.geoset[j] = dbcObject.readInt32(i, 3+j);

                characterFacialHairStylesDBCFile[i] = record;
            }

            deferred.resolve(characterFacialHairStylesDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(characterFacialHairStylesDBCFile);
    }

    return deferred.promise;
}
