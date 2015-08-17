/**
 * Created by Deamon on 27/02/2015.
 */


'use strict';


(function (window, $, undefined) {
    var cacheTemplate = angular.module('js.wow.render.cacheTemplate', []);
    cacheTemplate.factory("cacheTemplate", ['$q', '$timeout', function($q, $timeout) {
        function Cache(load, process) {
            var cache = {};
            var queueForLoad = {};
            /*
            * Queue load functions
            */
            this.get = function(fileName) {
                var deferred = $q.defer();

                /* 1. Return the promise right away, if object is already in cache */
                var obj = getCached(fileName);
                if (obj) {
                    deferred.resolve(obj);
                    return deferred.promise;
                }

                /* 2. Otherwise put the deferred to queue for resolving later */
                var queue = queueForLoad[fileName];
                if (queue === undefined) {
                    /* 2.1 If object is not loading yet - launch the loading process */
                    queue = [];
                    launchLoadingIn1ms(fileName)
                }
                queue.push(deferred);
                queueForLoad[fileName] = queue;

                return deferred.promise;
            };

            function resolve(fileName) {
                var queue = queueForLoad[fileName];
                for (var i = 0; i < queue.length; i++) {
                    var obj = getCached(fileName);
                    queue[i].resolve(obj)
                }
                queueForLoad[fileName] = undefined;
            }

            function reject(fileName, obj) {
                var queue = queueForLoad[fileName];
                for (var i = 0; i < queue.length; i++) {
                    queue[i].reject(obj)
                }
                queueForLoad[fileName] = undefined;
            }

            function launchLoadingIn1ms(fileName){
                $timeout(function() {
                    load(fileName).then(function success(loadedObj) {
                        var finalObject = process(loadedObj);

                        put(fileName, finalObject);
                        resolve(fileName);
                    }, function error(object) {
                        reject(fileName);
                    });
                }, 1);
            }

            /*
            * Cache storage functions
            */
            function put (fileName, obj) {
                var container = {
                    obj: obj,
                    counter: 1
                };

                cache[fileName] = container;
            }
            function getCached(fileName) {
                var container = cache[fileName];
                if (container === undefined){
                    return undefined;
                }
                container.counter += 1;

                return container.obj;
            }
            this.remove = function (fileName) {
                var container = cache[fileName];
                if (!container) {
                    /* TODO: Log the message? */
                    return;
                }

                /* Destroy container if usage counter is 0 or less */
                container.counter -= 1;
                if (container.counter <= 0) {
                    cache[fileName] = null;
                    container.obj.destroy();
                }
            }
        }

        return function(load, process){
            return new Cache(load, process);
        }
    }]);
})(window, jQuery);