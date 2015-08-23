(function (window, $, undefined) {
    var configService = angular.module('main.services.config', []);
    configService.factory('configService', [function() {
        var urlToLoadWoWFile = '/get/';

        var savedUrlForLoading = localStorage.getItem('urlForLoading');
        if (savedUrlForLoading) {
            urlToLoadWoWFile = savedUrlForLoading;
        }

        return {

            getUrlToLoadWoWFile: function (){
                return urlToLoadWoWFile;
            },
            setUrlToLoadWoWFile : function (url){
                urlToLoadWoWFile = url;
                localStorage.setItem('urlForLoading', url);
            }
        }


    }]);

})(jQuery, window);
