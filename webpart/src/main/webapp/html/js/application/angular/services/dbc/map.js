/**
 * Created by Deamon on 26/01/2015.
 */

(function (window, $, undefined) {

    var mapDBCService = angular.module('main.services.dbc.map', ['main.services.dbcLoader']);

    mapDBCService.factory('mapDBC', ['loadDBC', "$q", function(loadDBC, $q) {
        var mapDBCFile;

        return function(){
            var deferred = $q.defer();

            if (mapDBCFile === undefined) {
                var promise = loadDBC("DBFilesClient/Map.dbc");

                promise.then(function(dbcObject){
                    mapDBCFile = {};

                    for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                        var mapDBCRecord = {};

                        mapDBCRecord.id      = dbcObject.readInt32(i, 0);
                        mapDBCRecord.mapName = dbcObject.readText(i, 1);
                        mapDBCRecord.wdtName = dbcObject.readText(i, 5);

                        mapDBCFile[mapDBCRecord.id] = mapDBCRecord;
                    }

                    deferred.resolve(mapDBCFile);
                }, function (error) {
                    deferred.reject();
                });
            } else {
                deferred.resolve(mapDBCFile);
            }

            return deferred.promise;
        };
    }]);

})(window, jQuery);