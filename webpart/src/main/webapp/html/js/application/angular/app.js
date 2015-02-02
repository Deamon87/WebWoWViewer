/**
 * Created by Deamon on 26/01/2015.
 */
/* global alert: false */

'use strict';

/* App Module */
(function (window, $, undefined) {

    var main = angular.module('main.app',
        ['main.services.config',
            'main.services.dbc.map',
            'main.services.map.wdtLoader',
            'main.services.map.wmoLoader',
            'main.services.wowSceneJsService',

            'main.angular.sceneJs.loader.wmoImporter',

            'main.directives.sceneJsElem'
        ]);

    main.run(['mapDBC', 'wdtLoader', 'wmoLoader', 'wmoGroupLoader', 'registerWMOImporter', function( mapDBC, wdtLoader, wmoLoader, wmoGroupLoader, registerWMOImporter ){
        mapDBC();

        wdtLoader("World/Maps/Expansion01/Expansion01.wdt");
        wmoLoader("World/wmo/Azeroth/Buildings/Prison_Camp/prisonHQ_Redridge.wmo");

        wmoLoader("World/wmo/Dungeon/Azjol_Lowercity/Azjol_Lowercity.wmo");
        wmoLoader("World/wmo/Dungeon/Thor_Modan/Thor_Modan.wmo");
        wmoLoader("World/wmo/Dungeon/Ulduar/Ulduar_dwarf77.wmo");

        wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_004.wmo");
        wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_070.wmo");
        wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_073.wmo");
        wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_074.wmo");


    }]);

})(window, jQuery);