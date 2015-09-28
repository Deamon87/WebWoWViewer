(function (window, $, undefined) {

    var fileLoader = angular.module('main.services.fileLoader', ['main.services.config']);

    fileLoader.factory('fileLoader', ['configService', 'fileReadHelper', '$http', "$q", function(configService, fileReadHelper, $http, $q) {
        var zipEntries;
        var initDefers = [];
        function initZipEntries() {
            var defer = $q.defer();
            initDefers.push(defer);

            var zipFile = configService.getArhiveFile();
            zip.createReader(new zip.BlobReader(new Blob([zipFile])), function(reader) {

                // get all entries from the zip
                reader.getEntries(function(entries) {
                    var len = initDefers.length;
                    for (var i = 0; i < len; i++) {
                        initDefers[i].resolve(entries);
                    }
                    initDefers = [];
                });
            }, function(error) {
                // onerror callback
                var len = initDefers.length;
                for (var i = 0; i < len; i++) {
                    initDefers[i].reject(error);
                }
                initDefers = [];
            });

            return defer.promise;
        }
        function readZipFile(fileName){
            var defer = $q.defer();
            fileName = fileName.replace(/\u0000/g, '');

            var result = null;
            zipEntries.every(function(entry) {
                if(entry.filename.trim().toLowerCase() == fileName.toLowerCase()) {
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
                var fullPath = configService.getUrlToLoadWoWFile() + filePath;

                return $http.get(fullPath, {responseType: "arraybuffer"}).success(function(a) {
                    return a;
                })
                .error(function(a){
                    return a;
                });

            } else if (configService.getFileReadMethod() == 'zip') {
                if (!zipEntries) {
                    return initZipEntries().then(function succees(a){
                        zipEntries = a;
                        return readZipFile(filePath);
                    }, function error(a){

                    }).then(function success(fileData) {
                        return fileData;
                    }, function error(e) {
                        return e;
                    });
                } else {
                    return readZipFile(filePath).then(function success(fileData) {
                        return fileData;
                    }, function error(e) {
                        return e;
                    });
                }
            }
        }

        return fileLoader;
    }]);
})(window, jQuery);