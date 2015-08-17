/**
 * Created by Deamon on 08/02/2015.
 */
/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {

    var main = angular.module('main.app',
        ['main.services.config',
            'main.services.dbc.map',
            'main.services.map.adtLoader',
            'main.services.map.wdtLoader',
            'main.services.map.wmoLoader',
            'main.services.map.blpLoader',
            'main.services.map.mdxLoader',
            'main.services.map.skinLoader',

            'main.directives.wowJsRender'

        ]);

    main.run(['mapDBC', 'wdtLoader', 'wmoLoader', 'wmoGroupLoader', 'mdxLoader', 'skinLoader', 'blpLoader', '$log',
        function( mapDBC, wdtLoader, wmoLoader, wmoGroupLoader, mdxLoader, skinLoader, blpLoader, $log ) {
            mapDBC();
        }]);
})(window, jQuery);

