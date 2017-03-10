import axios from 'axios';


class Module {
    readAsync (url, onload, onerror) {
        return axios.get(url,{responseType: "arraybuffer"}).then(function success(a) {
            onload(a.data);
        }, function error(a) {
            onerror("axios error" + e);
            throw a;
        });
    }
}

var TOTAL_MEMORY = 806777216;
function readAsync (url, onload, onerror) {
    console.log("url = "+url);
    return axios.get("http://localhost:8888/"+url,{responseType: "arraybuffer"}).then(function success(a) {
        debugger;
        onload(a.data);

    }, function error(a) {
        debugger;
        onerror("axios error" + a);
        throw a;
    });
};

export {readAsync, TOTAL_MEMORY};