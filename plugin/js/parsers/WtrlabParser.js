"use strict";

parserFactory.register("wtr-lab.com", () => new WtrlabParser());

class WtrlabParser extends Parser{
    constructor() {
        super();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    async getChapterUrls(dom) {
        let leaves = dom.baseURI.split("/");
        let id = leaves[leaves.length - 2].slice(6);
        let slug = leaves[leaves.length - 1].split("?")[0];

        let chapters = (await HttpClient.fetchJson("https://wtr-lab.com/api/chapters/" + id)).json;
        
        return chapters.chapters.map(a => ({
            sourceUrl: "https://wtr-lab.com/en/serie-"+id+"/"+slug+"/old/chapter-"+a.order, 
            title: a.title
        }));
    }

    formatTitle(link) {
        let span = link.querySelector("span").textContent.trim();
        let num = link.querySelector("b").textContent.trim().replace("#", "");
        return num + ": " + span;
    }

    extractApplicationJson(dom) {
        let json = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        return JSON.parse(json);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".image-wrap");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#contents-tabpane-about")];
    }

    async fetchChapter(url) {
        let restUrl = this.toRestUrl(url);
        let json;
        json = (await HttpClient.fetchJson(restUrl)).json;
        while (json.pageProps.serie.chapter_data.data.title?false:true) {
            await util.sleep(10000);
            json = (await HttpClient.fetchJson(restUrl)).json;
        }
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        //i don't know if the magic key is static
        let magickey = "2T34D6i1AkSTNllaRtVDh";
        return url.replace("https://wtr-lab.com/en/","https://wtr-lab.com/_next/data/"+magickey+"/en/")+".json?service=google";
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = json.pageProps.serie.chapter_data.data.title;
        newDoc.content.appendChild(title);
        let br = document.createElement("br");
        for (let element of json.pageProps.serie.chapter_data.data.body) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
