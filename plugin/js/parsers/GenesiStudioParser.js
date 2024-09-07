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
        tmpids = data.nodes[2].data[tmpids].free;
        let freeChapterids = data.nodes[2].data[tmpids];
        
        let returnchapters = freeChapterids.map(e => ({
            sourceUrl:  `https://genesistudio.com/viewer/${data.nodes[2].data[data.nodes[2].data[e].id]}`,
            title: `${data.nodes[2].data[data.nodes[2].data[e].chapter_title]}`
        }));
        return returnchapters;
    }

    async fetchChapter(url) {
        let apiUrl = url + "/__data.json";
        let json = (await HttpClient.fetchJson(apiUrl)).json;
        let newDoc = Parser.makeEmptyDocForContent(url);

        this.appendElement(newDoc, "h1", this.titleFromJson(json));
        this.appendContent(newDoc, json.nodes[2].data[json.nodes[2].data[0].content]);
        let notes = json.nodes[2].data[json.nodes[2].data[0].footnotes];
        if (notes !== null && notes != "") {
            this.appendElement(newDoc, "h3", "Notes");
            this.appendContent(newDoc, notes);
        }
        return newDoc.dom; 
    }

    appendContent(newDoc, content) {
        var div = document.createElement("div");
        div.innerHTML = content;
        while (div.children.length > 0) {
            newDoc.content.appendChild(div.children[0]);
        }
    }

    appendElement(newDoc, tag, text) {
        let element = newDoc.dom.createElement(tag);
        element.textContent = text;
        newDoc.content.appendChild(element);
    }
    
    titleFromJson(json) {
        let title = "";
        title += util.isNullOrEmpty(json.nodes[1].data[json.nodes[1].data[1].chapter_title])
            ? ""
            : `${json.nodes[1].data[json.nodes[1].data[1].chapter_title]}`;
        return title;
    }
    
    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }
    
    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        let imgs = dom.querySelectorAll("img");
        for (let i = 0; i < imgs.length; i++) {
            if (imgs[i].src.search("https://api.genesistudio.com/storage/v1/render/image/public")==0) {
                return imgs[i].src;
            }
        }
        return null;
    }
}
