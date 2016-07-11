import $q from 'q';
import loadDBC from './../dbcLoader.js';

var charSectionsDBCFile = null;

export default function charSectionsDBC(){
    var deferred = $q.defer();

    if (charSectionsDBCFile === null) {
        charSectionsDBCFile = []
        var promise = loadDBC("DBFilesClient/CharSections.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};


                var id            = dbcObject.readInt32(i, 0);
                record.race       = dbcObject.readInt32(i, 1);
                record.gender     = dbcObject.readInt32(i, 2);
                record.section    = dbcObject.readInt32(i, 3);
                record.texture1   = dbcObject.readText(i, 4);
                record.texture2   = dbcObject.readText(i, 5);
                record.texture3   = dbcObject.readText(i, 6);
                record.unk        = dbcObject.readInt32(i, 7);
                record.type       = dbcObject.readInt32(i, 8);
                record.color      = dbcObject.readInt32(i, 9);

                charSectionsDBCFile[i] = record;
            }

            deferred.resolve(charSectionsDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(charSectionsDBCFile);
    }

    return deferred.promise;
}
