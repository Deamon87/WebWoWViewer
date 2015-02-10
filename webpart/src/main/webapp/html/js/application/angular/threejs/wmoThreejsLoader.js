/**
 * Created by Deamon on 08/02/2015.
 */
(function (window, $, undefined) {

    var wmoThreejsLoader = angular.module('main.threejs.wmoThreejsLoader', ['main.services.map.wmoLoader']);
    wmoThreejsLoader.factory('wmoThreejsLoader', ['$q', 'wmoLoader', 'wmoGroupLoader', function($q, wmoLoader, wmoGroupLoader){
        return function (wmoFilePath){

            var group = new THREE.Group();
            var deferred = $q.defer();

            wmoLoader(wmoFilePath).then(function success(wmoFile){
                var wmoGroupPromises = [];

                /* Get file name for group wmo */
                var template = wmoFilePath.substr(0, wmoFilePath.lastIndexOf("."));
                for (var i = 0; i < wmoFile.nGroups; i++) {

                    /* Fill the string with zeros, so it would have length of 3 */
                    var num = (i).toString();
                    for (; num.length != 3;) {
                        num = '0' + num;
                    }

                    /* Load Group wmo */

                    var wmoGroupPromise = wmoGroupLoader(template + "_" + num + ".wmo", true);
                    wmoGroupPromises.push(wmoGroupPromise);

                    wmoGroupPromise.then(function success(wmoGroupFile){
                        var geometry = new THREE.BufferGeometry();

                        geometry.addAttribute( 'index', new THREE.BufferAttribute( new Uint16Array(wmoGroupFile.indicies), 1 ) );
                        geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array(wmoGroupFile.verticles), 3 ) );
                        geometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array(wmoGroupFile.normals), 3 ) );
                        geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array(wmoGroupFile.colorVerticles), 4 ) );

                        geometry.computeBoundingSphere();

                        //var material = new THREE.PointCloudMaterial( { size: 15, vertexColors: THREE.VertexColors } );
                        var material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors });

                        var mesh = new THREE.Mesh( geometry, material);
                        group.add(mesh);

                    }, function error(){
                    })
                }
                $q.all(wmoGroupPromises).then(function success(){
                    deferred.resolve(group);
                }, function error(){
                    deferred.reject()
                });
            }, function error(){
                deferred.reject()
            });

            return deferred.promise;
        }
    }]);
})(window, jQuery);