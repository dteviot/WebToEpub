"use strict";

parserFactory.register("estar.jp", () => new EstarParser());

class EstarParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let rule = 
        [{
            "id": 1,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [{ "header": "origin", "operation": "remove" }]
            },
            "condition": { "urlFilter" : "estar.jp"}
        }];
        await HttpClient.setDeclarativeNetRequestRules(rule);

        let leaves = dom.baseURI.split("/");
        let id = leaves[leaves.length - 1];
        let fetchUrl = "https://estar.jp/api/graphql";
        let formData = {"query":"pages/novels/workId/episodes","data":{"workId":id,"first":30,"page":1}};
        let header = {"Content-Type": "application/json;charset=UTF-8", "x-from": "https://estar.jp/"};
        let options = {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(formData),
            headers: header
        };
        let bookinfo = (await HttpClient.fetchJson(fetchUrl, options)).json;
        formData = {"query":"pages/novels/workId/episodes","data":{"workId":id,"first":bookinfo.data.novel.episodeCount,"page":1}};
        options = {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(formData),
            headers: header
        };
        bookinfo = (await HttpClient.fetchJson(fetchUrl, options)).json;
        let chapters = bookinfo.data.novel.episodes.nodes.map(a => ({
            sourceUrl: "https://estar.jp/novels/"+bookinfo.data.novel.workId+"/viewer?page="+a.pageNo, 
            title: a.title
        }));
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.info .title").textContent;
    }

    extractAuthor(dom) {
        return dom.querySelector("div.info .nickname").textContent;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".tags a")];
        return tags.map(a => a.textContent).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".description").textContent.trim();
    }

    findCoverImageUrl(dom) {
        let pic = dom.querySelector(".novelData picture meta");
        return pic.content;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        return this.buildChapter(dom, url);
    }

    buildChapter(dom, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = dom.querySelector("h1.subject").textContent;
        newDoc.content.appendChild(title);
        let text = dom.querySelector(".mainBody .content").textContent;
        text = text.replace("\n\n", "\n");
        text = text.split("\n");
        let br = newDoc.dom.createElement("br");
        for (let element of text) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
