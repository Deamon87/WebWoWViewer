(function (window, $, undefined) {
    var configService = angular.module('main.services.config', []);
    configService.factory('configService', [function() {
        var urlToLoadWoWFile = '/get/';
        var readFileMethod = 'zip';
        var archiveUrl = 'http://deamon87.github.io/WoWFiles/shattrath.zip';
        var archiveFile = null;

        var savedUrlForLoading = localStorage.getItem('urlForLoading');
        if (savedUrlForLoading) {
            urlToLoadWoWFile = savedUrlForLoading;
        }

        //zip.workerScriptsPath = 'js/lib/bower/zip.js/WebContent/';
        /*zip.workerScripts = {
            deflater: ['<zip_js_dir>/z-worker.js', '<zip_js_dir>/deflate.js'],
            inflater: null
        };*/

        return {

            getUrlToLoadWoWFile: function (){
                return urlToLoadWoWFile;
            },
            setUrlToLoadWoWFile : function (url){
                urlToLoadWoWFile = url;
                localStorage.setItem('urlForLoading', url);
            },
            getFileReadMethod : function(){
                return readFileMethod;
            },
            getArchiveUrl : function (){
                return archiveUrl;
            },

            getArhiveFile : function (){
                return archiveFile;
            },
            setArchiveFile : function(archive) {
                archiveFile = archive;
            }

        }


    }]);

})(jQuery, window);
