import dropZoneHtml from 'ngtemplate!raw-loader!./../../../../html/partials/dropZone.html'

class NgDirectoryDragDrop {
    /*@ngInject*/
    constructor($templateCache, $log){
        //this.template = $templateCache.get('account/directives/copyright/copyright.directive.html');
        this.templateUrl = dropZoneHtml;
        this.$log = $log;
        this.scope = {fileList: '=', filesToBeRead: '=', filesRead : '='};
        this.restrict = 'E';

    }
    link(scope, element) {
        var self = this;
        this.fileList = scope.fileList;
        this.scopeInstance = scope;
        this.scopeInstance.filesToBeRead = 0;
        this.scopeInstance.filesRead = 0;

        element[0].addEventListener("dragover", function(e) {
            e.preventDefault();
        });

        element[0].addEventListener("drop", function(e) {
            var files;
            e.preventDefault();
            if (!e.dataTransfer) {
                return;
            }

            files = e.dataTransfer.files;
            var items = null;
            if (files.length) {
                var items = e.dataTransfer.items;
                if (items) {
                    self.handleIncomingFileList(items);
                }
            }
            if (items == null){
                this.addPlainFileList(items)
            }
        });
    }

    handleIncomingFileList(files) {
        if (files && files.length) {
            this.addStructuredFileList(files);
        }
    }
    addStructuredFileList(items){
        var itemsLen = items.length;
        for (var i = 0; i < itemsLen; i++) {
            var item = items[i];
            var entry = null;
            if (item.webkitGetAsEntry != null) {
                entry = item.webkitGetAsEntry()
            }

            if (entry) {
                if (entry.isFile && (item.getAsFile != null)) {
                    this.push(item.getAsFile());
                } else if (entry.isDirectory) {
                    this.addFilesFromDirectory(entry, entry.name);
                }
            } else if (item.getAsFile != null) {
                if ((item.kind == null) || item.kind === "file") {
                    this.fileList.push(item.getAsFile());
                }
            }
        }
    }
    addFilesFromDirectory(directory, path) {
        var dirReader;
        var self = this;
        dirReader = directory.createReader();
        dirReader.readEntries(function (entries) {
            if (entries.length > 0) {
                for (var i = 0, _len = entries.length; i < _len; i++) {
                    var entry = entries[i];
                    if (entry.isFile) {
                        //self.filesToBeRead++;
                        self.scopeInstance.$apply(function(scope){scope.filesToBeRead++})
                        entry.file(function (file) {
                            /*
                             if (file.name.substring(0, 1) === '.') {
                             return;
                             } */
                            file.fullPath = "" + path + "/" + file.name;
                            //self.scopeInstance.filesRead++;
                            self.scopeInstance.$apply(function(scope){scope.filesRead++});
                            self.$log.log("added ",file.fullPath);
                        }, function error(fileError) {
                            //self.scopeInstance.filesToBeRead--;
                            self.scopeInstance.$apply(function(scope){scope.filesToBeRead--})
                            self.$log.log(fileError);
                        });
                    } else if (entry.isDirectory) {
                        self.addFilesFromDirectory(entry, "" + path + "/" + entry.name);
                    }
                }
            }
        }, function (error) {
            self.$log.log(error);
        });
    };

    addPlainFileList(files) {
        var filesLen = files.length;
        for (var i = 0; i < filesLen; i++) {
            var file = files[i];
            this.fileList.push(file);
        }

        this.scopeInstance.filesRead+=filesLen;
        this.scopeInstance.filesToBeRead+=filesLen;
    }

    static createInstance($templateCache, $log) {
        var instantiated = new NgDirectoryDragDrop($templateCache, $log);
        return instantiated;
    }
}

NgDirectoryDragDrop.createInstance.$inject = ['$templateCache', '$log'];

export {NgDirectoryDragDrop}


