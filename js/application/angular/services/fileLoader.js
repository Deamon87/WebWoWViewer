(function (window, $, undefined) {

    var fileLoader = angular.module('main.services.fileLoader', ['main.services.config']);

    fileLoader.factory('fileLoader', ['configService', 'fileReadHelper', '$http', "$q", function(configService, fileReadHelper, $http, $q) {
        var zipEntries;
        var initDefers = [];
        function initZipEntries() {
            var defer = $q.defer();
            initDefers.push(defer);

            var zipFile = configService.getArhiveFile();
            zip.workerScriptsPath = 'js/lib/bower/zip.js/WebContent/';
            zip.createReader(new zip.BlobReader(new Blob([zipFile])), function(reader) {

                // get all entries from the zip
                reader.getEntries(function(entries) {
                    initDefers.forEach(function(defer){
                        defer.resolve(entries);
                    });
                    initDefers = [];
                });
            }, function(error) {
                // onerror callback
                initDefers.forEach(function(defer){
                    defer.reject(error);
                });
                initDefers = [];
            });

            return defer.promise;
        }
        function readZipFile(fileName){
            var defer = $q.defer();

            var result = null;
            zipEntries.every(function(entry) {
                if(entry.filename.toLowerCase() == fileName.toLowerCase()) {
                    result = entry;
                    return false;
                }

                return true;
            });

            if (result) {
                result.getData(new zip.BlobWriter(), function(data) {
                    var fileReader = new FileReader;
                    fileReader.onload = function (evt) {
                        // Read out file contents as a Data URL
                        var result = evt.target.result;
                        defer.resolve(result);
                    };
                    // Load blob as Data URL
                    fileReader.readAsArrayBuffer(data);
                });
            } else {
                defer.reject(null);
            }

            return defer.promise;
        }

        function fileLoader(filePath) {
            if (configService.getFileReadMethod() == 'http') {
                var defer = $q.defer();

                var fullPath = configService.getUrlToLoadWoWFile() + filePath;

                $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                    defer.resolve(a);
                })
                .error(function(a){
                    defer.reject(a);
                });

                return defer.promise;
            } else if (configService.getFileReadMethod() == 'zip') {
                var defer = $q.defer();

                if (!zipEntries) {
                    initZipEntries().then(function succees(a){
                        zipEntries = a;
                        readZipFile(filePath).then(function success(fileData) {
                            defer.resolve(fileData);
                        }, function error(e) {
                            defer.reject(e);
                        });
                    }, function error(a){
                        defer.reject(a);
                    });
                } else {
                    readZipFile(filePath).then(function success(fileData) {
                        defer.resolve(fileData);
                    }, function error(e) {
                        defer.reject(e);
                    });
                }

                return defer.promise;
            }
        }

        return fileLoader;
    }]);
})(window, jQuery);