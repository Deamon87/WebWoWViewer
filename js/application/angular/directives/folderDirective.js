import folderHtml from 'ngtemplate?relativeTo=/html/partials/!raw-loader!./../../../../html/partials/folderEditor.html';
import folderNode from 'ngtemplate?relativeTo=/html/partials/!raw-loader!./../../../../html/partials/folderEditorNode.html';

class NgFolderEditor {
    /*@ngInject*/
    constructor($templateCache, $log){
        this.templateUrl = folderHtml;
        this.$log = $log;
        this.scope = {fileList: '='};
        this.restrict = 'E';
    }
    link(scope, element) {
        var self = this;
    }

    static createInstance($templateCache, $log) {
        var instantiated = new NgFolderEditor($templateCache, $log);
        return instantiated;
    }
}

NgFolderEditor.createInstance.$inject = ['$templateCache', '$log'];

export {NgFolderEditor}