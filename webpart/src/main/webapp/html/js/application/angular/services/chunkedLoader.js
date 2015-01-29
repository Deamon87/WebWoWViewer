/**
 * Created by Deamon on 27/01/2015.
 */
(function (window, $, undefined) {

    var chunkedLoader = angular.module('main.services.chunkedLoader', ['main.services.fileReadHelper']);


    chunkedLoader.factory('chunkedLoader', ['configService', "fileReadHelper", '$http', "$q", '$log', function(configService, fileReadHelper, $http, $q, $log) {

        return function (filePath) {
            var deferred = $q.defer();
            var fullPath = configService.urlToLoadWoWFile + filePath;

            $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                var fileReader = fileReadHelper(a);

                var chunkedFileObj = {
                    loadChunkAtOffset : function (offset){
                        var offsetObj = { offs : offset };

                        /* Read chunk header */
                        var chunkIdent = "";
                        var chunkSize = 0;

                        // 8 is length of chunk header
                        if (offsetObj.offs + 8 < fileReader.getLength()) {
                            chunkIdent = fileReader.reverseStr(fileReader.readString(offsetObj, 4));
                            chunkSize = fileReader.readInt32(offsetObj);
                        }

                        /* If chunk is empty - skip it. Otherwise - load the chunkData */
                        var chunkReader = null;

                        if (chunkSize > 0) {
                            chunkReader = fileReadHelper(a, offsetObj.offs, chunkSize);
                        }

                        var chunkPiece = {
                            chunkIdent : chunkIdent,
                            chunkLen   : chunkSize,

                            nextChunkOffset : offset + 8 + chunkSize //8 is length of chunk header
                        };
                        chunkPiece.__proto__ = chunkReader;

                        return chunkPiece;
                    }
                };

                deferred.resolve(chunkedFileObj);
            }).error(function() {

            });

            return deferred.promise;
        }
    }]);

})(jQuery, window);
