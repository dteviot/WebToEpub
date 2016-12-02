/*
    Selects parser based on current URL
*/

"use strict";

class ParserFactory{
    constructor() {
        this.parsers = new Map();
        this.parserRules = [];
    }

    static isWebArchive(url) {
        let host = util.extractHostName(url);
        let subs = ["web", "web-beta"];
        for (let sub of subs) {
            if (host.startsWith(sub + ".archive.org")) {
               return true;
            }
        }
        return false;
    }

    static stripWebArchive(url) {
        var hostName = url.split("://");
        return hostName[2] ? "https://" + hostName[2] : url; 
    }

    static stripLeadingWww(hostName) {
        return hostName.startsWith("www.") ? hostName.substring(4) : hostName;            
    }

    register(hostName, constructor) {
        if (this.parsers.get(ParserFactory.stripLeadingWww(hostName)) == null) {
            this.parsers.set(ParserFactory.stripLeadingWww(hostName), constructor);
        } else {
            throw new Error("Duplicate parser registered for hostName " + hostName);
        };
    }

    /*
    *  @param {function} test predicate that checks if parser can handle URL
    *  @param {function} constructor to obtain parser to handle the URL
    */
    registerRule(test, constructor) {
        this.parserRules.push( {test: test, constructor: constructor } );
    }

    fetch(url, dom) {
        if (ParserFactory.isWebArchive(url)) {
            url = ParserFactory.stripWebArchive(url);
        }
        let hostName = ParserFactory.stripLeadingWww(util.extractHostName(url));
        let constructor = this.parsers.get(hostName);
        if (constructor !== undefined) {
            return constructor();
        }

        // no exact match found, see if any parser is willing to handle the URL and/or DOM
        for (let pair of this.parserRules.filter(p => p.test(url, dom))) {
            return pair.constructor();
        }

        // still no parser found, fall back to default
        return new DefaultParser();
    }
}

let parserFactory = new ParserFactory();
