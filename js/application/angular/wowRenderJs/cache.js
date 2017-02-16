import $q from 'q';

class Cache {
    constructor() {
        this.cache = {};
        this.queueForLoad = {};

        this.objectsToBeProcessed = []
    }
    /* Functions that must be overloaded */
    load(fileName) {
    }
    process(file) {
    }

    /*
     * Queue load functions
     */
    get (fileName) {
        var deferred = $q.defer();
        var self = this;

        /* 1. Return the promise right away, if object is already in cache */
        var obj = this.getCached(fileName);
        if (obj) {
            deferred.resolve(obj);
            return deferred.promise;
        }

        /* 2. Otherwise put the deferred to queue for resolving later */
        var queue = this.queueForLoad[fileName];
        if (!queue) {
            /* 2.1 If object is not loading yet - launch the loading process */
            queue = [];
            this.load(fileName).then(function success(loadedObj) {
                self.objectsToBeProcessed.push(loadedObj);
            }, function error(object) {
                self.reject(fileName);

            });
        }
        queue.push(deferred);
        this.queueForLoad[fileName] = queue;

        return deferred.promise;
    };

    resolve(fileName) {
        var queue = this.queueForLoad[fileName];
        for (var i = 0; i < queue.length; i++) {
            var obj = this.getCached(fileName);
            queue[i].resolve(obj)
        }
        this.queueForLoad[fileName] = null;
    }

    reject(fileName, obj) {
        var queue = this.queueForLoad[fileName];
        for (var i = 0; i < queue.length; i++) {
            queue[i].reject(obj)
        }
        this.queueForLoad[fileName] = null;
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
        if (!container){
            return null;
        }
        container.counter += 1;

        return container.obj;
    }

    remove (fileName) {
        var container = this.cache[fileName];
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

export default Cache;