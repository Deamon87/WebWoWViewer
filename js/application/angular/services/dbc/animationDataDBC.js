import $q from 'q';
import loadDBC from './../dbcLoader.js';

var animationDataDBCFile = null;

export default function animationDataDBC(){
    var deferred = $q.defer();

    if (animationDataDBCFile === null) {
        animationDataDBCFile = [];
        var promise = loadDBC("DBFilesClient/AnimationData.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                record.id             = dbcObject.readInt32(i, 0);
                record.name           = dbcObject.readText(i, 1);
                record.weaponFlags    = dbcObject.readInt32(i, 2);
                record.bodyFlags      = dbcObject.readInt32(i, 3);
                record.flags          = dbcObject.readInt32(i, 4);
                record.fallbackID     = dbcObject.readInt32(i, 5);
                record.behaviorID     = dbcObject.readInt32(i, 6);
                record.behaviorTier   = dbcObject.readInt32(i, 7);

                animationDataDBCFile[record.id] = record;
            }

            deferred.resolve(animationDataDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(animationDataDBCFile);
    }

    return deferred.promise;
}
