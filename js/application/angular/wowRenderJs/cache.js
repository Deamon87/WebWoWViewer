import $q from 'q';

class Cache {
    constructor(load, process) {
        this.cache = {};
        this.queueForLoad = {};

        this.load = load;
        this.process = process;
    }
    /*
     * Queue load functions
     */
    get (fileName) {
        var deferred = $q.defer();

        /* 1. Return the promise right away, if object is already in cache */
        var obj = this.getCached(fileName);
        if (obj) {
            deferred.resolve(obj);
            return deferred.promise;
        }

        /* 2. Otherwise put the deferred to queue for resolving later */
        var queue = this.queueForLoad[fileName];
        if (queue === undefined) {
            /* 2.1 If object is not loading yet - launch the loading process */
            queue = [];
            this.load(fileName).then(function success(loadedObj) {
                var finalObject = this.process(loadedObj);

                this.put(fileName, finalObject);
                this.resolve(fileName);
            }, function error(object) {
                reject(fileName);
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
        this.queueForLoad[fileName] = undefined;
    }

    reject(fileName, obj) {
        var queue = this.queueForLoad[fileName];
        for (var i = 0; i < queue.length; i++) {
            queue[i].reject(obj)
        }
        this.queueForLoad[fileName] = undefined;
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

export default function(load, process){
    return new Cache(load, process);
}
