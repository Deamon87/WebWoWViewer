import $q from 'q';
import loadDBC from './../dbcLoader.js';

var lightFloatBandDBCFile = null;

export default function LightFloatBandDBC(){
    var deferred = $q.defer();

    if (lightFloatBandDBCFile === null) {
        lightFloatBandDBCFile = [];
        var promise = loadDBC("DBFilesClient/LightFloatBand.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var lightFloatBandDBCRecord = {};

                lightFloatBandDBCRecord.id               = dbcObject.readInt32(i, 0);
                lightFloatBandDBCRecord.noOfEntries      = dbcObject.readInt32(i, 1);
                lightFloatBandDBCRecord.times = [];
                for (var j = 0; j < lightFloatBandDBCRecord.noOfEntries; j++) {
                    lightFloatBandDBCRecord.times.push(dbcObject.readInt32(i, 1 + j));
                }

                lightFloatBandDBCRecord.values = [];
                for (var j = 0; j < lightFloatBandDBCRecord.noOfEntries; j++) {
                    lightFloatBandDBCRecord.values.push(dbcObject.readFloat32(i, 18 + j));
                }

                lightFloatBandDBCFile[lightFloatBandDBCRecord.id] = lightFloatBandDBCRecord;
            }

            deferred.resolve(lightFloatBandDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(lightFloatBandDBCFile);
    }

    return deferred.promise;
}