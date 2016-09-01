import angular from 'angular';
import angularDropdown from 'angular-ui-bootstrap/src/dropdown';
import configService from './services/config.js';
import './directives/wowJsRenderDirective.js';
import './directives/fileDownload.js';

var main = angular.module('main.app',
    [
        'main.directives.wowJsRender',
        'main.directives.fileDownloader',
        angularDropdown
    ]);

main.controller("UrlChooserCtrl",[ '$scope', function($scope) {
    $scope.isReadyForStart = false;
    $scope.isReadyForDownload = false;

    $scope.params = {};
    $scope.params.urlForLoading = configService.getUrlToLoadWoWFile();
    $scope.params.zipFile = null;

    $scope.selectedModeName = "Please select mode";

    var parameters = {
            predefined: [{
                name: 'Gryphon roost',
                source: 'zip',
                url: 'http://deamon87.github.io/WoWFiles/shattrath.zip',
                sceneType: 'm2',
                modelName: 'world\\generic\\human\\passive doodads\\gryphonroost\\gryphonroost01.m2',
                x: 0,
                y: 0,
                z: 0
            },
        ],
        custom: [
        ]
    };

    $scope.selectionOptions = parameters;
    $scope.status = {};
    $scope.status.isopen = false;

    $scope.selectMode = function (value) {
        $scope.selectedValue = value;
        $scope.selectedSource = value.source;
        $scope.selectedModeName = value.name;

        configService.setArchiveUrl(value.url);
        configService.setFileReadMethod(value.source);
    };



    $scope.startApplication = function () {
        configService.setUrlToLoadWoWFile($scope.params.urlForLoading);
        $scope.params.zipUrl = configService.getArchiveUrl();
        $scope.params.downLoadProgress = 0;

        configService.setSceneParams($scope.selectedValue);

        $scope.isReadyForDownload = configService.getFileReadMethod() == "zip" ;
        $scope.isReadyForStart = configService.getFileReadMethod() == "http" ;
    };

    $scope.$watch('params.zipFile', function(newValue){
        if (newValue) {

            configService.setArchiveFile(newValue);

            $scope.isReadyForDownload = false;
            $scope.isReadyForStart = true;
        }
    })
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


main.run(['$log', function( $log ) {

}]);
