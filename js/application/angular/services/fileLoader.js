(function (window, $, fileLoaderStub, undefined) {

    var fileLoader = angular.module('main.services.fileLoader', ['main.services.config']);

    fileLoader.factory('fileLoader', ['configService', 'fileReadHelper', '$http', '$window', "$q",
        function(configService, fileReadHelper, $http, $window, $q) {
            if (fileLoaderStub) {
                return fileLoaderStub(configService, $q);
            } else {
                var messageId = 0;
                var messageTable = {};
                var worker = new Worker($window.requestWorker);
                worker.onmessage = function(e) {
                    var opcode = e.data.opcode;
                    var message = e.data.message;
                    var recv_messageId = e.data.messageId;

                    if (opcode == 'fileLoaded') {
                        messageTable[recv_messageId].resolve(message);
                        delete messageTable[recv_messageId];
                    }
                };

                var inited = false;
                return function (fileName) {
                    if (!inited) {
                        worker.postMessage({opcode: 'init', message: {
                            arhiveFile : configService.getArhiveFile(),
                            fileReadMethod : configService.getFileReadMethod(),
                            urlToLoadWoWFile : configService.getUrlToLoadWoWFile()
                        }});

                        inited = true;
                    }


                    var defer = $q.defer();
                    worker.postMessage({opcode: 'loadFile', messageId: messageId, message: fileName});
                    messageTable[messageId] = defer;

                    return defer.promise;
                }
            }


    }]);
})(window, jQuery, null);