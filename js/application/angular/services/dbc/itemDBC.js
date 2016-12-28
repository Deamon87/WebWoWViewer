import $q from 'q';
import loadDBC from './../dbcLoader.js';

var itemDBCFile = null;

export default function itemDBC() {
    var deferred = $q.defer();

    if (itemDBCFile === null) {
        itemDBCFile = {}
        var promise = loadDBC("DBFilesClient/Item.dbc");

        promise.then(function(dbcObject) {
            for (var i = 0; i < dbcObject.getRowCount(); i++) {
                var record = {};

                var id = dbcObject.readInt32(i, 0);
                record.displayId = dbcObject.readInt32(i, 5);

                itemDBCFile[id] = record;
            }
            deferred.resolve(itemDBCFile);
        }, function (error) {
            deferred.reject();
        });
    } else {
        deferred.resolve(itemDBCFile);
    }

    return deferred.promise;
}