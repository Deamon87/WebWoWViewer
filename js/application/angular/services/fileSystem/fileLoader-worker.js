self.addEventListener('message', function(e) {
    var opcode = e.data.opcode;
    var message = e.data.message;
    if (opcode == 'init') {
        var configService = message;
        self.fileLoader = fileLoaderStub(configService, Q);
    } else if (opcode == 'loadFile') {
        var filePath = message;
        var promise = self.fileLoader(filePath)
        promise.then(function success(a){
            self.postMessage(a);
        }, function error() {

        })
    }
}, false);