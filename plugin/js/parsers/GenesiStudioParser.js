/*
  Parses files on https://genesistudio.com
*/
"use strict";

parserFactory.register("genesistudio.com", () => new GenesiStudioParser());

class GenesiStudioParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }
    
    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        let data = (await HttpClient.fetchJson(dom.baseURI + "/__data.json")).json;
        let tmpids = data.nodes[2].data[0].chapters;
        let jsdata = data.nodes[2].data[tmpids];
        let extractfreechapter = [...jsdata.match(/return{.*}}],/)[0].matchAll(/'id':0.*?,/g)];
        let freechapterids = extractfreechapter.map(e => Number(e[0].replace("'id':","").replace(",","")));

        let returnchapters = freechapterids.map(e => ({
            sourceUrl:  "https://genesistudio.com/viewer/"+e,
            title: "[placeholder]"
        }));
        return returnchapters;
    }

    async fetchChapter(url) {
        let apiUrl = url + "/__data.json";
        let json = (await HttpClient.fetchJson(apiUrl)).json;
        let newDoc = Parser.makeEmptyDocForContent(url);

        this.appendElement(newDoc, "h1", this.titleFromJson(json));
        let index = json.nodes[2].data[0].content;
        let content = json.nodes[2].data[index];
        this.appendContent(newDoc, content);
        let notes = json.nodes[2].data[json.nodes[2].data[0].footnotes];
        if (notes !== null && notes != "") {
            this.appendContent(newDoc, notes);
        }
        return newDoc.dom; 
    }

    appendContent(newDoc, content) {
        let div = new DOMParser().parseFromString("<div>" + content + "</div>", "text/html")
            .querySelector("div");
        newDoc.content.append(div);
    }

    appendElement(newDoc, tag, text) {
        let element = newDoc.dom.createElement(tag);
        element.textContent = text;
        newDoc.content.appendChild(element);
    }
    
    titleFromJson(json) {
        return json.nodes[1].data[json.nodes[1].data[1].chapter_title] ?? "";
    }
    
    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }
    
    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        let img = [...dom.querySelectorAll("img")]
            .map(i => i.src)
            .filter(i => i.startsWith("https://api.genesistudio.com/storage/v1/render/image/public"))[0];
        return img ?? null;
    }
}
