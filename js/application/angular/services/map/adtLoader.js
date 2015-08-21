/**
 * Created by Deamon on 07/02/2015.
 */
(function (window, $, undefined) {

    var adtLoader = angular.module('main.services.map.adtLoader', ['main.services.linedFileLoader']);
    adtLoader.factory('adtLoader', ['chunkedLoader', 'fileReadHelper', '$log', '$q', function (chunkedLoader, fileReadHelper, $log, $q) {
        return function(filename){
            var deferred = $q.defer();

            function ADTLoader() {
                var handlerTable = {
                    "MVER" : function (wmoObject, chunk) {
                        if (chunk.chunkIdent !== "MVER") {
                            throw "Got bad group ADT file " + filename;
                        }
                        var version = chunk.readInt32({offs: 0});
                        //$log.info("Loading ", filename, ", version ", version);
                    },
                    "MHDR" : function () {

                    },
                    "MCIN" : function () {

                    },
                    "MTEX" : function () {

                    },
                    "MMDX" : function () {

                    },
                    "MMID" : function () {

                    },
                    "MWMO" : function () {

                    },
                    "MWID" : function () {

                    },
                    "MDDF" : function () {

                    },
                    "MODF" : function () {

                    }
                };

                this.getHandler = function (sectionName) {
                    return handlerTable[sectionName];
                }
            }

            var promise = chunkedLoader(filename);
            promise.then(function (chunkedFile) {
                /* First chunk in file has to be MVER */

                var adtObj = {};
                chunkedFile.processFile(adtObj, new ADTLoader(), 0);

                deferred.resolve(adtObj);
            }, function error() {
                deferred.reject();
            });

            return deferred.promise;
        }

    }]);
})(window, jQuery);
