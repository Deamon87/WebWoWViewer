import $q from 'q';
import loadDBC from './../dbcLoader.js';

var lightIntBandDBCFile = null;

export default function LightIntBandDBC(){
    var deferred = $q.defer();

    if (lightIntBandDBCFile === null) {
        lightIntBandDBCFile = [];
        var promise = loadDBC("DBFilesClient/LightIntBand.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var lightIntBandDBCRecord = {};

                lightIntBandDBCRecord.id               = dbcObject.readInt32(i, 0);
                lightIntBandDBCRecord.noOfEntries      = dbcObject.readInt32(i, 1);
                lightIntBandDBCRecord.times = [];
                for (var j = 0; j < lightIntBandDBCRecord.noOfEntries; j++) {
                    lightIntBandDBCRecord.times.push(dbcObject.readInt32(i, 1 + j));
                }

                lightIntBandDBCRecord.values = [];
                for (var j = 0; j < lightIntBandDBCRecord.noOfEntries; j++) {
                    lightIntBandDBCRecord.values.push(dbcObject.readInt32(i, 18 + j));
                }

                lightIntBandDBCRecord.floatValues = [];
                for (var j = 0; j < lightIntBandDBCRecord.noOfEntries; j++) {
                    lightIntBandDBCRecord.floatValues.push(
                        [(lightIntBandDBCRecord.values[j] & 0xff) / 255.0,
                        ((lightIntBandDBCRecord.values[j]>> 8 ) & 0xff) / 255.0,
                        ((lightIntBandDBCRecord.values[j]>> 16) & 0xff) / 255.0,
                        ((lightIntBandDBCRecord.values[j]>> 24) & 0xff) / 255.0]);
                }

                lightIntBandDBCFile[lightIntBandDBCRecord.id] = lightIntBandDBCRecord;
            }

            deferred.resolve(lightIntBandDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(lightIntBandDBCFile);
    }

    return deferred.promise;
}