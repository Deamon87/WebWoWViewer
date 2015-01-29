/**
 * Created by Deamon on 26/01/2015.
 */
/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {

    var main = angular.module('main.app', ['main.services.config', 'main.services.dbc.map', 'main.services.wdtLoader']);

    main.run(['mapDBC', 'wdtLoader',  function( mapDBC, wdtLoader ){
        mapDBC();

        wdtLoader("World/Maps/Expansion01/Expansion01.wdt")
    }]);

})(window, jQuery);