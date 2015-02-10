/**
 * Created by Deamon on 07/02/2015.
 */
(function (window, $, undefined) {

    var adtLoader = angular.module('main.services.map.adtLoader', ['main.services.linedFileLoader']);
    adtLoader.factory('adtLoader', ['linedFileLoader', '$log', '$q', function (linedFileLoader, $log, $q) {
        return function(filename){



        }

    }]);
})(window, jQuery);
