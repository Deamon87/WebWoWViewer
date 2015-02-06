/**
 * Created by Deamon on 03/02/2015.
 */

(function (window, $, undefined) {

    var linedFileLoader = angular.module('main.services.linedFileLoader', ['main.services.fileReadHelper']);


    linedFileLoader.factory('linedFileLoader', ['configService', "fileReadHelper", '$http', "$q", '$log', function (configService, fileReadHelper, $http, $q, $log) {
        return function (filePath) {
            var deferred = $q.defer();
            var fullPath = configService.urlToLoadWoWFile + filePath;

            $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                var fileReader = fileReadHelper(a);

                function LinedFileObj(){
                    this.loadDataAtOffset = function (offset, length) {
                        return fileReadHelper(a, offset, length)
                    }
                }
                LinedFileObj.prototype = fileReader;

                var linedFileObj = new LinedFileObj();

                deferred.resolve(linedFileObj);
            }).error(function() {
                deferred.reject();
            });

            return deferred.promise;
        };

    }]);

})(window, jQuery);