import fileLoaderStub from './../fileSystem/fileLoaderStub.js';
import Q from 'q';

self.addEventListener('message', function(e) {
    var opcode = e.data.opcode;
    var message = e.data.message;
    var messageId = e.data.messageId;

    if (opcode == 'init') {

        var configService = {
            getArchiveFile : function () {
                return message.archiveFile
            },
            getFileReadMethod : function () {
                return message.fileReadMethod
            },
            getUrlToLoadWoWFile: function () {
                return message.urlToLoadWoWFile;
            }
        };
        self.fileLoader = fileLoaderStub(configService, Q);


    } else if (opcode == 'loadFile') {
        var filePath = message;

        (function(self, messageId) {
            var promise = self.fileLoader(filePath)
            promise.then(function success(a){
                self.postMessage({ opcode: 'fileLoaded', messageId: messageId, message: a});
            }, function error() {
            })
        })(self, messageId)
    }
}, false);