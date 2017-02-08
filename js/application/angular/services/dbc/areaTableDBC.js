import $q from 'q';
import loadDBC from './../dbcLoader.js';

var areaTableDBCFile = null;

export default function areaTableDBC(){
    var deferred = $q.defer();

    if (areaTableDBCFile === null) {
        areaTableDBCFile = [];
        var promise = loadDBC("DBFilesClient/AreaTable.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var record = {};

                record.id                           = dbcObject.readInt32(i, 0);
                record.mapId                        = dbcObject.readInt32(i, 1);
                record.parentAreaId                 = dbcObject.readInt32(i, 2);
                record.areaBit                      = dbcObject.readInt32(i, 3);
                record.flags                        = dbcObject.readInt32(i, 4);
                record.soundPreferences             = dbcObject.readInt32(i, 5);
                record.soundPreferencesUnderwater   = dbcObject.readInt32(i, 6);
                record.soundAmbience                = dbcObject.readInt32(i, 7);
                record.zoneMusic                    = dbcObject.readInt32(i, 8);
                record.zoneIntroMusic               = dbcObject.readInt32(i, 9);
                record.explorationLevel             = dbcObject.readInt32(i, 10);
                record.name                         = dbcObject.readText(i, 11);
                record.lightId                      = dbcObject.readInt32(i, 35);


                areaTableDBCFile[record.id] = record;
            }

            deferred.resolve(areaTableDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(areaTableDBCFile);
    }

    return deferred.promise;
}
