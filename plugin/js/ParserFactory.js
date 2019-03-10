/*
    Selects parser based on current URL
*/

"use strict";

class ParserFactory{
    constructor() {
        this.parsers = new Map();
        this.parserRules = [];
        this.parserUrlRules = [];
        this.manualSelection = [];
        this.registerManualSelect("", function() { return undefined });
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

    reregister(hostName, constructor) {
        this.parsers.set(ParserFactory.stripLeadingWww(hostName), constructor);
    }

    registerManualSelect(name, constructor) {
        this.manualSelection.push({name, constructor});
    };

    /*
    *  @param {function} test predicate that checks if parser can handle URL & DOM
    *  @param {function} constructor to obtain parser to handle the URL
    */
    registerRule(test, constructor) {
        this.parserRules.push( {test: test, constructor: constructor } );
    }

    /*
    *  @param {function} test predicate that checks if parser can handle URL
    *  @param {function} constructor to obtain parser to handle the URL
    */
    registerUrlRule(test, constructor) {
        this.parserUrlRules.push( {test: test, constructor: constructor } );
    }

    fetchByUrl(url) {
        if (ParserFactory.isWebArchive(url)) {
            url = ParserFactory.stripWebArchive(url);
        }
        let hostName = ParserFactory.stripLeadingWww(util.extractHostName(url));
        let constructor = this.parsers.get(hostName);
        if (constructor !== undefined) {
            return constructor(url);
        }

        for (let pair of this.parserUrlRules) {
            if (pair.test(url)) {
                return pair.constructor(url);
            }
        }

        return null;
    }

    fetch(url, dom) {
        let forUrl = this.fetchByUrl(url);
        if (forUrl != null) {
            return forUrl;
        }

        // no exact match found, see if any parser is willing to handle the URL and/or DOM
        let maxConfidence = 0;
        let constructor = null;
        for (let pair of this.parserRules) {
            let confidence = (pair.test(url, dom) * 1.0);
            if (maxConfidence < confidence) {
                maxConfidence = confidence;
                constructor = pair.constructor;
            }
        }
        if (0 < maxConfidence) {
            return constructor(url);
        }

        // still no parser found, fall back to default
        return new DefaultParser();
    }

    populateManualParserSelectionTag(selectTag) {
        let options = selectTag.options;
        if (options.length === 0) {
            for(let p of this.manualSelection) {
                options.add(new Option(p.name));
            }
        }
    }

    manuallySelectParser(parserName) {
        for(let m of this.manualSelection) {
            if (m.name === parserName) {
                return m.constructor();
            }
        }
    }
}

let parserFactory = new ParserFactory();
