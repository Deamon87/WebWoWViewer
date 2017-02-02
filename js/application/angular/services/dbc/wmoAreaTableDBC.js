import $q from 'q';
import loadDBC from './../dbcLoader.js';

var wmoAreaTableDBCFile = null;
function binarySearch (ar, el, compare_fn) {
    var m = 0;
    var n = ar.length - 1;
    while (m <= n) {
        var k = (n + m) >> 1;
        var cmp = compare_fn(el, ar[k]);
        if (cmp > 0) {
            m = k + 1;
        } else if(cmp < 0) {
            n = k - 1;
        } else {
            return k;
        }
    }
    return -1;
}


export default function wmoAreaTableDBC(){
    var deferred = $q.defer();

    if (wmoAreaTableDBCFile === null) {
        wmoAreaTableDBCFile = [];
        var promise = loadDBC("DBFilesClient/wmoAreaTable.dbc");

        wmoAreaTableDBCFile.findRecord = function (wmoId, nameSetId, wmoGroupId) {
            "use strict";
            var index = binarySearch(wmoAreaTableDBCFile, {wmoId: wmoId, nameSetId:nameSetId, wmoGroupId:wmoGroupId},
                function(a, b){
                    if (a.wmoId < b.wmoId) {
                        return -1
                    }
                    if (a.wmoId > b.wmoId) {
                        return 1
                    }
                    if (a.nameSetId < b.nameSetId) {
                        return -1
                    }
                    if (a.nameSetId > b.nameSetId) {
                        return 1
                    }
                    if (a.wmoGroupId < b.wmoGroupId) {
                        return -1
                    }
                    if (a.wmoGroupId > b.wmoGroupId) {
                        return 1
                    }

                    return 0
                });
            if (index >=0) {
                return wmoAreaTableDBCFile[index];
            } else {
                return null;
            }
        };

        promise.then(function(dbcObject){
            for (var i = 0; i < dbcObject.getRowCount(); i++ ) {
                var wmoAreaTableDBCRecord = {};

                wmoAreaTableDBCRecord.id               = dbcObject.readInt32(i, 0);
                wmoAreaTableDBCRecord.wmoId            = dbcObject.readInt32(i, 1);
                wmoAreaTableDBCRecord.nameSetId        = dbcObject.readInt32(i, 2);
                wmoAreaTableDBCRecord.wmoGroupId       = dbcObject.readInt32(i, 3);

                wmoAreaTableDBCRecord.areaId           = dbcObject.readInt32(i, 10);
                wmoAreaTableDBCRecord.name             = dbcObject.readText(i, 11);

                wmoAreaTableDBCFile[i] = wmoAreaTableDBCRecord;
            }

            deferred.resolve(wmoAreaTableDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(wmoAreaTableDBCFile);
    }

    return deferred.promise;
}




