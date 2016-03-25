import angular from 'angular';
import angularProgressbar from 'angular-ui-bootstrap/src/progressbar';
import 'bootstrap-loader';
import 'angular-ui-bootstrap/template/progressbar/progress.html.js';
import 'angular-ui-bootstrap/template/progressbar/progressbar.html.js';

var wowJsRender = angular.module('main.directives.fileDownloader', [
    angularProgressbar,
    "uib/template/progressbar/progress.html",
    "uib/template/progressbar/progressbar.html"]);

wowJsRender.directive('fileDownloader', [function () {
    return {
        restrict: 'E',
        scope : {
            url : "=",
            loadedFile : "=loadedFile",
            fileProgress : '='
        },
        link: function postLink(scope, element, attrs) {
            scope.fileProgress = 0;
            function updateProgress(evt) {
                if (evt.lengthComputable) {  //evt.loaded the bytes browser receive
                    //evt.total the total bytes seted by the header
                    //
                    scope.fileProgress = (evt.loaded / evt.total) * 100;
                    scope.$apply();
                }
            }

            //scope.startDownloading = function(){
                var req = new XMLHttpRequest();
                req.onprogress = updateProgress;
                req.responseType = "arraybuffer";

                req.open('GET', scope.url, true);
                req.onreadystatechange = function (aEvt) {
                    if (req.readyState == 4) {
                        scope.loadedFile = req.response;
                        scope.$apply();
                    }
                };
                req.send();

            //};

        }
    }
}])