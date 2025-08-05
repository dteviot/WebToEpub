"use strict";

parserFactory.register("fuhuzz.pro", () => new FuhuzzParser());

class FuhuzzParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let leaves = [...dom.querySelectorAll("tbody a")];
        return leaves.map(a => ({
            sourceUrl: a.href, 
            title: a.textContent
        })).reverse();
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1")?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("img")?.src ?? null;
    }
    
    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let startString = "fid";
        let scriptElement = [...dom.querySelectorAll("script")].map(a => a.textContent).filter(s => s.includes(startString));
        let json = this.parseNextjsHydration(scriptElement[0]);
        let id = this.flatObjFn2(json, "json");
        let restURL = "https://static.ripfuhu.xyz/api/fttps:webp/"+id.fid;
        let chapjson = (await HttpClient.fetchJson(restURL)).json;
        return this.buildChapter(chapjson.images[0], url, id.currentTitle);
    }

    flatObjFn2(obj) {
        var finalObj = {}; 
        for (let key in obj) {
            if (typeof obj[key] === "object") {
                Object.assign(finalObj, this.flatObjFn2(obj[key], key));
            } else {
                finalObj[key] = obj[key];
            }
        }
        return finalObj;
    }

    parseNextjsHydration(nextjs) {
        let malformedjson = nextjs.match(/{.*}/s);
        let json;
        if (malformedjson == null) {
            malformedjson = nextjs.match(/\[.*\]/s);
            let ret = malformedjson[0];
            json = JSON.parse(ret);
            json.webtoepubformat = "backslash";
        } else {
            let ret = malformedjson[0];
            ret = ret.replaceAll("\\\\\\\"", "[webtoepubescape\"]");
            ret = ret.replaceAll("\\", "");
            ret = ret.replaceAll("[webtoepubescape\"]","\\\"");
            json = JSON.parse(ret);
            json.webtoepubformat = "array";
        }
        return json;
    }

    buildChapter(chapcontent, url, chaptitle) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = chaptitle;
        newDoc.content.appendChild(title);
        let text = chapcontent;
        text = text.replaceAll("\n\n", "\n");
        text = text.split("\n");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
        }
        return newDoc.dom;
    }
}
