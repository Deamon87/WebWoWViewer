import axios from 'axios';


class Module {
    constructor() {
        this.TOTAL_MEMORY = 806777216;
    }

    readAsync(url, onload, onerror) {
        console.log("url = " + url);
        return axios.get("http://localhost:8888/" + url, {responseType: "arraybuffer"}).then(function success(a) {
            debugger;
            onload(a.data);

        }, function error(a) {
            debugger;
            onerror("axios error" + a);
            throw a;
        });
    };
}




export default Module;