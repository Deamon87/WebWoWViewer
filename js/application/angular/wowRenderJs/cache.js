import $q from 'q';

class Cache {
    constructor() {
        this.cache = new Map();
        this.queueForLoad = new Map();

        this.objectsToBeProcessed = new Map();
    }
    /* Functions that must be overloaded */
    load(fileName) {
    }
    process(file) {
    }
    processCacheQueue(limit) {
        var objectsProcessed = 0;

        var queueIter = this.objectsToBeProcessed.keys();
        var fileName = queueIter.next().value;
        while (fileName != null) {
            var loadedObject = this.objectsToBeProcessed.get(fileName);

            var finalObject = this.process(loadedObject);

            this.put(fileName, finalObject);
            this.resolve(fileName);

            this.objectsToBeProcessed.delete(fileName);

            objectsProcessed++;
            if (objectsProcessed > limit) {
                break;
            }

            fileName = queueIter.next().value;
        }
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
        var queue;
        if (!this.queueForLoad.has(fileName)) {
            /* 2.1 If object is not loading yet - launch the loading process */
            queue = [];
            this.load(fileName).then(function success(loadedObj) {
                self.objectsToBeProcessed.set(fileName, loadedObj);

            }, function error(object) {
                self.reject(fileName);

            });
        } else {
            queue = this.queueForLoad.get(fileName);
        }
        queue.push(deferred);
        this.queueForLoad.set(fileName, queue);

        return deferred.promise;
    };

    resolve(fileName) {
        var queue = this.queueForLoad.get(fileName);
        for (var i = 0; i < queue.length; i++) {
            var obj = this.getCached(fileName); // Increases counter by 1
            queue[i].resolve(obj)
        }
        this.queueForLoad.delete(fileName);
    }

    reject(fileName, obj) {
        var queue = this.queueForLoad.get(fileName);
        for (var i = 0; i < queue.length; i++) {
            queue[i].reject(obj)
        }
        this.queueForLoad.delete(fileName);
    }

    /*
    * Cache storage functions
    */
     put (fileName, obj) {
        var container = {
            obj: obj,
            counter: 1
        };

        this.cache.set(fileName, container);
    }
    getCached(fileName) {
        var container = this.cache.get(fileName);
        if (!container){
            return null;
        }
        container.counter += 1;

        return container.obj;
    }

    remove (fileName) {
        var container = this.cache.get(fileName);
        if (!container) {
            /* TODO: Log the message? */
            return;
        }

        /* Destroy container if usage counter is 0 or less */
        container.counter -= 1;
        if (container.counter <= 0) {
            this.cache.delete(fileName);
            container.obj.destroy();
        }
    }
}

export default Cache;