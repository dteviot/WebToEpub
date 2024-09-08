"use strict";

parserFactory.register("fictionzone.net", () => new MtlarchiveParser());
parserFactory.register("mtlarchive.com", () => new MtlarchiveParser());
parserFactory.register("reader-hub.com", () => new MtlarchiveParser());

class MtlarchiveParser extends Parser{
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [...dom.querySelectorAll("div.chapters .list-wrapper a")]
            .map(a => this.toChapter(a));

        chapterUrlsUI.showTocProgress(chapters);
        let storyId = await this.findStoryId(dom.baseURI);
        if (0 < storyId) {
            let numTocPages = this.findNumTocPages(dom);
            for(let page = 2; page <= numTocPages; ++page) {
                let partialList = await this.fetchTocData(storyId, page, dom.baseURI);
                chapterUrlsUI.showTocProgress(partialList);
                chapters = chapters.concat(partialList);
            }
        }
        return chapters;
    }

    toChapter(link) {
        return ({
            title: link.querySelector("span.chapter-title").textContent,
            sourceUrl: link.href
        });
    }

    async findStoryId(url) {
        let baseurl = new URL(url);
        let payload = `{"path": "${baseurl.pathname}",` +
            "\"headers\": {\"content-type\":\"application/json\"}, \"method\": \"get\" }";
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: payload
        };
        let json = (await HttpClient.fetchJson(baseurl.origin + "/api/__api_party/api-v1", options)).json;
        return json._data.id;
        /* old logic
        
        let json = JSON.parse(dom.querySelector("script#__NUXT_DATA__").textContent);
        // exact position of story ID moves, but it's before string with cover image's URL slug
        for(let index = 15; index <= 30; ++index) {
            let examine = json[index];
            if ((typeof examine === "string") && examine.startsWith("novel_covers/")) {
                return json[index - 1];
            }
        }
        return 0;  
        */
    }

    findNumTocPages(dom) {
        let pages = [...dom.querySelectorAll(".pagination span")]
            .map(s => parseInt(s.textContent) || 0);
        return (0 < pages.length)
            ? Math.max(...pages)
            : 0;
    }

    async fetchTocData(storyId, page, url) {
        let baseurl = new URL(url);
        let payload = `{"path": "/chapter/all/${storyId}", "query": {"page":${page}},` +
            "\"headers\": {\"content-type\":\"application/json\"}, \"method\": \"get\" }";
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: payload
        };
        let json = (await HttpClient.fetchJson(baseurl.origin + "/api/__api_party/api-v1", options)).json;
        return json._data.map(j => this.jsonToChapter(j, url));
    }

    jsonToChapter(json, url) {
        return ({
            sourceUrl: url + "/" + json.slug,
            title: json.title
        });   
    }    

    findContent(dom) {
        return dom.querySelector(".chapter-wrap");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".novel-author .content");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#synopsis .content")];
    }
}
