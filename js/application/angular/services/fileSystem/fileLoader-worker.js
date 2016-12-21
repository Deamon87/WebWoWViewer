import fileLoaderStub from './../fileSystem/fileLoaderStub.js';
import Q from 'bluebird';

Q.setScheduler(function(fn) {
    fn();
});

self.addEventListener('message', function(e) {
    //console.log("Worker got message = "+e);
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
            var promise = self.fileLoader(filePath);
            promise.then(function success(a){
                //console.log("Worker sent file = "+a);
                //debugger;
                if (!a) {
                    console.log("Unable to load file \""+filePath+"\"");
                } else {
                    self.postMessage({opcode: 'fileLoaded', messageId: messageId, message: a.buffer}, [a.buffer]);
                }
            }, function error() {
                //debugger;
            })
        })(self, messageId)
    }
}, false);