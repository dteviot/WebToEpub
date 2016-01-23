/*
    Selects parser based on current URL
*/

"use strict";

var parserFactory = (function () {

    let parsers = new Map();

    var register = function(hostName, constructor) {
        if (parsers.get(hostName) == null) {
            parsers.set(hostName, constructor);
        } else {
            throw new Error("Duplicate parser registered for url " + url);
        };
    };

    var fetch = function(url) {
        let hostName = extractHostName(url);
        let constructor = parsers.get(hostName);
        return (constructor === undefined) ? undefined : constructor();
    };

    var extractHostName = function (url) {
        let parser = document.createElement("a");
        parser.href = url;
        return parser.hostname;
    };

    return {
        register: register,
        fetch: fetch
    };
})();
