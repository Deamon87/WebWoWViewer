import $q from 'q';
import loadDBC from './../dbcLoader.js';

var gameObjectDisplayInfoDBCFile = null;

export default function gameObjectDisplayInfoDBC(){
    var deferred = $q.defer();

    if (gameObjectDisplayInfoDBCFile === null) {
        gameObjectDisplayInfoDBCFile = {}
        var promise = loadDBC("DBFilesClient/GameObjectDisplayInfo.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                var id                = dbcObject.readInt32(i, 0);

                record.modelName      = dbcObject.readText(i, 1);

                gameObjectDisplayInfoDBCFile[id] = record;
            }

            deferred.resolve(gameObjectDisplayInfoDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(gameObjectDisplayInfoDBCFile);
    }

    return deferred.promise;
}
