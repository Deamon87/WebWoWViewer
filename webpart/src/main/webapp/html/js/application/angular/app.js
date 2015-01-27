/**
 * Created by Deamon on 26/01/2015.
 */
/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {

    var main = angular.module('main.app', ['main.services.config', 'main.services.dbcLoader', 'main.services.dbc.map']);

    main.run(['mapDBC', function(mapDBC){
        mapDBC();
    }]);

})(window, jQuery);