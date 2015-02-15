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

            'main.angular.sceneJs.loader.wmoImporter',
            'main.angular.sceneJs.loader.blpImporter',
            'main.angular.sceneJs.firstPersonCamera',
            'main.directives.sceneJsElem'

        ]);

    main.run(['mapDBC', 'wdtLoader', 'wmoLoader', 'wmoGroupLoader', 'mdxLoader', 'skinLoader', 'blpLoader', '$log',
        'registerWMOImporter', 'registerFirstPersonCamera', 'registerBlpImporter',
        function( mapDBC, wdtLoader, wmoLoader, wmoGroupLoader, mdxLoader, skinLoader, blpLoader, $log,
                  registerWMOImporter, registerFirstPersonCamera, registerBlpImporter ) {
            mapDBC();


            //
            //var mdxSuccess = function(result){
            //    $log.info("mdx loaded", result);
            //
            //    /* Load textures for this m2 object */
            //    for (var i = 0; i < result.textureDefinition.length; i++) {
            //        blpLoader(result.textureDefinition[i].textureName).then(
            //            function success(result) {
            //                $log.info("blp loaded", result);
            //            }
            //        );
            //    }
            //};
            //mdxLoader("World/Expansion02/Doodads/BoreanTundra/SnowPiles/Borean_Snowpile_01.M2").then(
            //    mdxSuccess,
            //    function error(){
            //
            //    }
            //);
            //skinLoader("World/Expansion02/Doodads/BoreanTundra/SnowPiles/Borean_Snowpile_0100.skin").then(
            //    function(result){
            //        $log.info(result);
            //
            //    },
            //    function error(){
            //
            //    }
            //);
            //
            //wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_004.wmo");
            //wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_070.wmo");
            //wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_073.wmo");
            //wmoGroupLoader("World/wmo/Northrend/Dalaran/ND_Dalaran_074.wmo");
        }]);
})(window, jQuery);

