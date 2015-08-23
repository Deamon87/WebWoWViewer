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
            'main.glsl.cache',
            'main.directives.wowJsRender'

        ]);

    main.controller("UrlChooserCtrl",['$scope', 'configService',function($scope, configService){
        $scope.isReadyForStart = false;
        $scope.params = {};
        $scope.params.urlForLoading = '';

        $scope.startApplication = function () {
            configService.setUrlToLoadWoWFile($scope.params.urlForLoading);
            $scope.isReadyForStart = true;
        }
    }]);

    main.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {

        /* 1. Interception of http ajax requests */
        $provide.factory('myHttpInterceptor', ['$window', '$q', '$templateCache', function ($window, $q, $templateCache) {
            return {

                'request': function (config) {
                    if (config.url) {
                        var index = config.url.indexOf('.glsl'),
                            isRequestToShader = index > -1;

                        if (!isRequestToShader) {
                            if (!config.params) {
                                config.params = {};
                            }
                            //config.params.t = new Date().getTime();
                        } else {
                            config.cache = $templateCache;
                        }
                    }

                    return config;
                }
            };
        }]);

        $httpProvider.interceptors.push('myHttpInterceptor');
    }]);


    main.run(['mapDBC', 'adtLoader', 'wdtLoader', 'wmoLoader', 'wmoGroupLoader', 'mdxLoader', 'skinLoader', 'blpLoader', '$log',
        function( mapDBC, adtLoader, wdtLoader, wmoLoader, wmoGroupLoader, mdxLoader, skinLoader, blpLoader, $log ) {

        }]);
})(window, jQuery);

