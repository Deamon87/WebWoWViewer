import angular from 'angular';
import angularDropdown from 'angular-ui-bootstrap/src/dropdown';
import angularTabs from 'angular-ui-bootstrap/src/tabs';
//import 'imports?this=>global!ng-scrollbar/dist/ng-scrollbar.min.js';
import './directives/wowJsRenderDirective.js';
import './directives/fileDownload.js';
import {NgDirectoryDragDrop} from './directives/ng-dropzone.js';

import {UrlChooserCtrl} from './controller/urlChooserCtrl.js';
import ui_tree from 'angular-ui-tree';

import 'angular-ui-tree/dist/angular-ui-tree.min.css'
import 'style.scss';

var main = angular.module('main.app',
    [
        'main.directives.wowJsRender',
        'main.directives.fileDownloader',
        ui_tree,
        angularDropdown,
        angularTabs
    ]);

main.controller("UrlChooserCtrl", UrlChooserCtrl.instantiate);
main.directive("ngDropzone", NgDirectoryDragDrop.createInstance);

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
