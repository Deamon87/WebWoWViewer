(function (window, $, undefined) {
    var configService = angular.module('main.services.config', []);
    configService.factory('configService', [function() {
        var urlToLoadWoWFile = '/get/';

        return {

            getUrlToLoadWoWFile: function (){
                return urlToLoadWoWFile;
            },
            setUrlToLoadWoWFile : function (url){
                console.log("url = "+url);
                urlToLoadWoWFile = url;
            }
        }


    }]);

})(jQuery, window);
