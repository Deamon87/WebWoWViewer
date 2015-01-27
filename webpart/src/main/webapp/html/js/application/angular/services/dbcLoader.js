/**
 * Created by Deamon on 26/01/2015.
 */

(function (window, $, undefined) {

    var loadDBCService = angular.module('main.services.dbcLoader', ['main.services.config']);



    loadDBCService.factory('loadDBC', ['configService', '$http', "$q", function(configService, $http, $q) {
        /*
            Returns deferredObject
        */


        return function (dbcFilePath) {
            var deferred = $q.defer();
            var fullPath = configService.urlToLoadWoWFile + dbcFilePath;

            var dbcHeaderLen = 20;

            var textDecoder = new TextDecoder("utf-8");

            $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                var dataView = new DataView(a, 0);
                var uint8Array = new Uint8Array(a);
                var offset = 0;


                var dbcIdent = String.fromCharCode.apply(null, uint8Array.subarray(offset, 4)); offset += 4;

                var rowCount = dataView.getInt32(offset, true); offset += 4;
                var colCount = dataView.getInt32(offset, true); offset += 4;
                var rowSize  = dataView.getInt32(offset, true); offset += 4;
                var textSize = dataView.getInt32(offset, true);

                /**
                 * @param array Array where to search
                 * @param valueToFind Value to search for
                 * @param start Start search at this index
                 * @param stop Stop search after this index
                 *
                 * @returns number in array
                 */
                function findInArray(array, valueToFind, start, stop){
                    for (var i = start; i <= stop; i++) {
                        if (array[i] == valueToFind) {
                            return i;
                        }
                    }
                    return undefined;
                }

                function calcOffset(row, col){
                    var offs =  dbcHeaderLen + row * (colCount * 4) + col * 4;
                    return offs;
                }
                function getTextOffset(row, col) {
                    var offs = calcOffset(row, col);
                    var textOffs = dataView.getUint32(offs, true);

                    var result = dbcHeaderLen + rowCount* (colCount*4) + textOffs;
                    return result;
                }


                var dbcObject = {
                    fileSize    : a.byteLength ,
                    getRowCount : function() {
                        return rowCount;
                    },
                    getColCount : function() {
                        return colCount;
                    },
                    getRowSize  : function() {
                        return rowSize;
                    },
                    readInt32 : function (row, col) {
                        var offs = calcOffset(row, col);
                        return dataView.getInt32(offs, true);
                    },
                    readUInt32 : function (row, col){
                        var offs = calcOffset(row, col);
                        return dataView.getUint32(offs, true);
                    },
                    readText : function (row, col) {
                        /*var textOffs = getTextOffset(row, col);

                        var tempStr = textDecoder.decode(uint8Array.subarray(textOffs, uint8Array.length));

                        var i = tempStr.indexOf("\0");
                        var result = tempStr.substring(0, i);

                        return result;*/


                         var textOffs = getTextOffset(row, col);

                         var strEnd = findInArray(uint8Array, 0, textOffs, uint8Array.length);
                         strEnd = (strEnd === undefined) ? uint8Array.length : strEnd;

                         var tempStr = textDecoder.decode(uint8Array.subarray(textOffs, strEnd));

                         return tempStr;

                    }
                };

                deferred.resolve(dbcObject);
            }).error(function a(){
                deferred.reject(null);
            });

            return deferred.promise;
        };
    }]);

})(jQuery, window);