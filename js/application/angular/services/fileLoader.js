(function (window, $, fileLoaderStub, undefined) {

    var fileLoader = angular.module('main.services.fileLoader', ['main.services.config']);

    fileLoader.factory('fileLoader', ['configService', 'fileReadHelper', '$http', '$window', "$q",
        function(configService, fileReadHelper, $http, $window, $q) {
            if (fileLoaderStub) {
                return fileLoaderStub(configService, $q);
            } else {

                var worker = new Worker($window.requestWorker);
                worker.onmessage = function(e) {

                };
                worker.postMessage({opcode: 'init', message: configService});
            }
    }]);
})(window, jQuery, null);