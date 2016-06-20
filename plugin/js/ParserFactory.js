/*
    Selects parser based on current URL
*/

"use strict";

var parserFactory = (function () {

    let parsers = new Map();

    var isWebArchive = function(hostName) {
        return extractHostName(hostName).startsWith("web.archive.org") ? 1 : 0;
    }

    var stripWebArchive = function(url) {
        var hostName = url.split('://');
        return hostName[2] ? "https://" + hostName[2] : url; 
    }

    var stripLeadingWww = function(hostName) {
        return hostName.startsWith("www.") ? hostName.substring(4) : hostName;            
    }

    var register = function (hostName, constructor) {
        if (parsers.get(stripLeadingWww(hostName)) == null) {
            parsers.set(stripLeadingWww(hostName), constructor);
        } else {
            throw new Error("Duplicate parser registered for url " + url);
        };
    };

    var fetch = function(url) {
        if (isWebArchive(url)) {
            url = stripWebArchive(url);
        }
        let hostName = stripLeadingWww(extractHostName(url));
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
