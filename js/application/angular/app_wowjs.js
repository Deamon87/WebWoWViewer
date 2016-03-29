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
                name: 'Shattrath city (WotLK)',
                source: 'zip',
                url: 'http://deamon87.github.io/WoWFiles/shattrath.zip',
                sceneType: 'map',
                mapId: 530,
                mapName: 'Expansion01',
                x: -1663,
                y: 5098,
                z: 27
            },
            {
                name: 'Ironforge (WotLK)',
                source: 'zip',
                url: 'http://deamon87.github.io/WoWFiles/ironforge.zip',
                sceneType: 'wmo',
                fileName: 'World/wmo/KhazModan/Cities/Ironforge/ironforge.wmo'
            }
        ],
        custom: [
            {
                name: 'Raw coordinates',
                source: 'http',
                sceneType: 'customMap'
            },
            {
                name: 'Azeroth adt 31-31',
                source: 'http',
                sceneType: 'map',
                mapId: 0,
                mapName: 'Azeroth',
                x: 0,
                y: 0,
                z: 0
            },
            {
                name: 'Eye of Storm',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'NetherstormBG',
                x: 2110,
                y: 1489,
                z: 1474
            },
            {
                name: 'Halls Of Reflection',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'HallsOfReflection',
                x: 5243.2461346537075,
                y: 1938.6550422193939,
                z: 717.0332923206179
            },
            {
                name: 'Darkshire',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'Azeroth',
                x: -10559.7,
                y: -1189.02,
                z: 29.0698
            },
            {
                name: 'Forsaken start',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'Azeroth',
                x: 2000,
                y: 1600,
                z: 137
            },
            {
                name: 'Deeprun Tram',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'DeeprunTram',
                x: 17066.666666656,
                y: 17066.666666656,
                z: 0
            },
            {
                name: 'Karazahn',
                source: 'http',
                sceneType: 'map',
                //mapId: 0,
                mapName: 'Karazahn',
                x: -10666.666666656,
                y: -1600,
                z: 170
            },
            {
                name: 'Gnome subway glass(Wotlk)',
                source: 'http',
                sceneType: 'm2',
                modelName: 'WORLD\\GENERIC\\GNOME\\PASSIVE DOODADS\\GNOMEMACHINE\\GNOMESUBWAYGLASS.m2'
            },
            {
                name: 'Ironforge garage machine',
                source: 'http',
                sceneType: 'm2',
                modelName: 'WORLD\\KHAZMODAN\\IRONFORGE\\PASSIVEDOODADS\\GARAGEMACHINE\\GARAGEMACHINE.m2'
            },
            {
                name: 'KARAZAN CHANDELIER',
                source: 'http',
                sceneType: 'm2',
                modelName: 'WORLD\\AZEROTH\\KARAZAHN\\PASSIVEDOODADS\\CHANDELIERS\\KARAZANCHANDELIER_02.m2'
            }
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
