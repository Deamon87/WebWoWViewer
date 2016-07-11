import $q from 'q';
import loadDBC from './../dbcLoader.js';

var lightParamsDBCFile = null;

export default function lightParamsDBC(){
    var deferred = $q.defer();

    if (lightParamsDBCFile === null) {
        lightParamsDBCFile = [];
        var promise = loadDBC("DBFilesClient/LightParams.dbc");

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var lightParamsDBCRecord = {};

                try {
                    lightParamsDBCRecord.id = dbcObject.readInt32(i, 0);
                    lightParamsDBCRecord.highlightSky = dbcObject.readInt32(i, 1);
                    lightParamsDBCRecord.lightSkyboxID = dbcObject.readFloat32(i, 2);
                    lightParamsDBCRecord.cloudTypeID = dbcObject.readFloat32(i, 3);
                    lightParamsDBCRecord.glow = dbcObject.readFloat32(i, 4);
                    lightParamsDBCRecord.waterShallowAlpha = dbcObject.readFloat32(i, 5);
                    lightParamsDBCRecord.waterDeepAlpha = dbcObject.readFloat32(i, 6);
                    lightParamsDBCRecord.oceanShallowAlpha = dbcObject.readFloat32(i, 7);
                    lightParamsDBCRecord.oceanDeepAlpha = dbcObject.readFloat32(i, 8);
                    //lightParamsDBCRecord.flags = dbcObject.readInt32(i, 9);

                    lightParamsDBCFile[lightParamsDBCRecord.id] = lightParamsDBCRecord;
                } catch(e) {
                    console.log(e)
                }
            }

            deferred.resolve(lightParamsDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(lightParamsDBCFile);
    }

    return deferred.promise;
}