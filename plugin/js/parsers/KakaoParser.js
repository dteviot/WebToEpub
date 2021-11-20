"use strict";

parserFactory.registerUrlRule(
    url => KakaoParser.isValidUrl(url),
    () => new KakaoParser()
);

class KakaoParser extends Parser {
    constructor() {
        super();
    }

    static isValidUrl(url) {
        // Return true when is on the table of contents page.
        // Perhaps narrow this down so it can't execute on the chapters, but needs
        // to execute on the chapter api
        if (util.extractHostName(url).includes("api-pagestage.kakao.com")) {
            return true;
        }
        if (util.extractHostName(url).includes("pagestage.kakao.com")) {
            if(!url.includes("episode")) {
                if(url.includes("novel")) {
                    return true;
                }
            }
        }
        return false;
    }

    async fetchChapter(url) {
        let jsonUrl;
        if (!url.includes("api-pagestage")) {
            jsonUrl = url.replace("pagestage", "api-pagestage") + "/body";
        } else {
            jsonUrl = url + "/body";
        }

        let json = (await HttpClient.fetchJson(jsonUrl)).json;

        let doc = Parser.makeEmptyDocForContent(url);

        let metaChapId = doc.dom.createElement("meta");
        metaChapId.id = "chapterId";
        metaChapId.content = url.split("/")[6];
        doc.content.appendChild(metaChapId);

        let metaNovelId = doc.dom.createElement("meta");
        metaNovelId.id = "novelId";
        metaNovelId.content = url.split("/")[4];
        doc.content.appendChild(metaNovelId);

        let novelTitle = doc.dom.createElement("meta");
        novelTitle.id = "novelTitle";
        novelTitle.content = json.novelTitle;
        doc.content.appendChild(novelTitle);

        let body = json.body.split("\n").filter(s => !util.isNullOrEmpty(s));

        let title = doc.dom.createElement("h1");
        title.id = "title";
        title.textContent = json.title + " - " + body[0];
        doc.content.appendChild(title);

        let div = doc.dom.createElement("div");
        div.id = "content";
        for(let i = 1; i < body.length; ++i){
            let p = doc.dom.createElement("p");
            p.textContent = body[i];
            div.appendChild(p);
        }
        doc.content.appendChild(div);

        return doc.dom;
    }

    findContent(dom) {
        return dom.getElementById("content");
    }

    async getChapterUrls(dom) {
        let jsonUrl = dom.baseURI.replace("pagestage", "api-pagestage");
        let json = (await HttpClient.fetchJson(jsonUrl)).json;

        jsonUrl = dom.baseURI.replace("pagestage", "api-pagestage")
                        + "/episodes?size=" + json.publishedEpisodeCount
                        + "&sort=publishedAt,id,asc";
        json = (await HttpClient.fetchJson(jsonUrl)).json;

        let chapterList = [];
        for(let chapter of json.content) {
            let url = dom.baseURI.replace("pagestage", "api-pagestage")
                    + "/episodes/" + chapter.id;
            let chapterInfo = {
                sourceUrl: url,
                title: chapter.title,
                newArc: null
            };
            chapterList.push(chapterInfo);
        }

        return Promise.resolve(chapterList);
    }

    // extractAuthor
    extractAuthor(dom) {
        return dom.querySelector("[property='article:author']").content;
    }
    // extractSubject
    extractSubject(dom) {
        return dom.querySelector("[name='tiara-pageMeta-category']").content;
    }
    // extractDescription
    extractDescription(dom) {
        return dom.querySelector("[property='og:description']").content;
    }
    // findChapterTitle
    findChapterTitle(dom) {
        return dom.getElementById("title");
    }

    // findCoverImageUrl
    findCoverImageUrl(dom) {
        return dom.querySelector("[property='og:image']").content;
    }
}