import FileLoader from './../fileSystem/fileLoaderStub.js';
import Q from 'bluebird';

Q.setScheduler(function(fn) {
    fn();
});

var worker = self;
addEventListener('message', function(e) {
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
            },
            getFileList : function () {
                return message.fileList;
            }
        };
        worker.fileLoader = new FileLoader(configService);


    } else if (opcode == 'loadFile') {
        var filePath = message;

        var promise = worker.fileLoader.getFile(filePath);
        promise.then(function success(a){
            //console.log("Worker sent file = "+a);
            //debugger;
            if (a) {
                worker.postMessage({opcode: 'fileLoaded', messageId: messageId, message: a.buffer}, [a.buffer]);
                //console.log("messageId "+ messageId+ " sent")
                console.log("messageId "+ messageId+ " sent");
            }
        }, function error() {
            console.log("Unable to load file \""+filePath+"\"");
            worker.postMessage({opcode: 'fileLoaded', messageId: messageId, message: null});
        })

    }
}, false);

