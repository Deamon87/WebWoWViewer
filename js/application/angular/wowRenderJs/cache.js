
class Cache {
    constructor(load, process) {
        this.cache = {};
        this.queueForLoad = {};
    }
    /*
     * Queue load functions
     */
    get (fileName) {
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

    resolve(fileName) {
        var queue = queueForLoad[fileName];
        for (var i = 0; i < queue.length; i++) {
            var obj = getCached(fileName);
            queue[i].resolve(obj)
        }
        this.queueForLoad[fileName] = undefined;
    }

    reject(fileName, obj) {
        var queue = queueForLoad[fileName];
        for (var i = 0; i < queue.length; i++) {
            queue[i].reject(obj)
        }
        this.queueForLoad[fileName] = undefined;
    }

    launchLoadingIn1ms(fileName){
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
     put (fileName, obj) {
        var container = {
            obj: obj,
            counter: 1
        };

        this.cache[fileName] = container;
    }
    getCached(fileName) {
        var container = this.cache[fileName];
        if (container === undefined){
            return undefined;
        }
        container.counter += 1;

        return container.obj;
    }

    remove (fileName) {
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

export default function(load, process){
    return new Cache(load, process);
}
