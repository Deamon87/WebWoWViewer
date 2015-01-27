(function (window, $, undefined) {

    var configService = angular.module('main.services.config', []);


    configService.factory('configService', [function() {
        return {
            urlToLoadWoWFile: '/get/'
        }

    }]);

})(jQuery, window);
