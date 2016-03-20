import configService from './config.js';
import fileReadHelper from './fileReadHelper.js';
import FileWorker from 'worker?inline=true!./fileSystem/fileLoader-worker.js';
//import $log;
import $q from 'q';

var messageId = 0;
var messageTable = {};
var worker = new FileWorker();
worker.onmessage = function(e) {
    var opcode = e.data.opcode;
    var message = e.data.message;
    var recv_messageId = e.data.messageId;

    if (opcode == 'fileLoaded') {
        //Imply message is Uint8Array
        var defer = messageTable[recv_messageId].defer;
        var fileName = messageTable[recv_messageId].fileName;
        if (message) {
            messageTable[recv_messageId].defer.resolve(message.buffer);
        } else {
            //$log.info("Could not load file = " + fileName);
        }
        delete messageTable[recv_messageId];
    }
};
var inited = false;

export default function (fileName) {
    if (!inited) {
        worker.postMessage({opcode: 'init', message: {
            archiveFile : configService.getArchiveFile(),
            fileReadMethod : configService.getFileReadMethod(),
            urlToLoadWoWFile : configService.getUrlToLoadWoWFile()
        }});

        inited = true;
    }


    var defer = $q.defer();
    worker.postMessage({opcode: 'loadFile', messageId: messageId, message: fileName});
    messageTable[messageId] = {defer: defer, fileName : fileName};
    messageId++;

    return defer.promise;
}

