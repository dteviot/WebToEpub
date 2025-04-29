"use strict";

parserFactory.register("wtr-lab.com", () => new WtrlabParser());

class WtrlabParser extends Parser{
    constructor() {
        super();
    }

    clampSimultanousFetchSize() {
        return 1;
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeChapterNumberRow").hidden = false; 
        document.getElementById("selectTranslationGoogleRow").hidden = false; 
    }

    async getChapterUrls(dom) {
        let json = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        json = JSON.parse(json);
        this.magickey = json.buildId;
        let leaves = dom.baseURI.split("/");
        let id = leaves[leaves.length - 2].slice(6);
        let slug = leaves[leaves.length - 1].split("?")[0];

        let chapters = (await HttpClient.fetchJson("https://wtr-lab.com/api/chapters/" + id)).json;
        
        return chapters.chapters.map(a => ({
            sourceUrl: "https://wtr-lab.com/en/serie-"+id+"/"+slug+"/old/chapter-"+a.order, 
            title: (document.getElementById("removeChapterNumberCheckbox").checked)?a.title:a.order+": "+a.title
        }));
    }

    formatTitle(link) {
        let span = link.querySelector("span").textContent.trim();
        let num = link.querySelector("b").textContent.trim().replace("#", "");
        return num + ": " + span;
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
        while (json.pageProps.serie.chapter_data?.data.title?false:true) {
            if (json.pageProps.needs_login?(json.pageProps.needs_login == true):false) {
                ErrorLog.log("Failed to fetch page you need to login to get Ai page.");
                break;
            }
            await util.sleep(10000);
            json = (await HttpClient.fetchJson(restUrl)).json;
        }
        return this.buildChapter(json, url);
    }

    toRestUrl(url) {
        return url.replace("https://wtr-lab.com/en/","https://wtr-lab.com/_next/data/"+this.magickey+"/en/")+".json?service="+((document.getElementById("selectTranslationGoogleCheckbox").checked)?"google":"ai");
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
