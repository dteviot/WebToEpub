"use strict";

parserFactory.register("mangadex.org", function() { return new MangadexParser() });

class MangadexParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let rows = [...dom.querySelectorAll("table.table-striped img[alt=\"English\"]")];
        let chapters = rows
            .map(i => i.parentElement.parentElement.querySelector("a[data-chapter-id]"))
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters.reverse());
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h3.panel-title");
    };

    findContent(dom) {
        const className = "webToEpubContent";
        let content = dom.querySelector("div." + className);
        if (content === null) {
            let select =  dom.querySelector("script[data-type=\"chapter\"]");
            if (select !== null) {
                content = dom.createElement("div");
                content.className = className;
                dom.body.appendChild(content);
                this.convertScriptToImgTagsToFollow(dom, content, select);
            }
        }
        return content;
    }

    convertScriptToImgTagsToFollow(dom, content, select) {
        let json = JSON.parse(select.textContent);
        let dataurl = json.dataurl;
        let pages = json.page_array;
        let server = json.server;
        if (server === "/data/") {
            let hostName = util.extractHostName(dom.baseURI);
            server = `https://${hostName}/data/`;
        }
        for(let page of pages) {
            let img = dom.createElement("img");
            img.src = `${server}${dataurl}/${page}`;
            content.appendChild(img);
        };
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.col-sm-3");
    }
    
    getInformationEpubItemChildNodes(dom) {
        let nodes = [];
        let summary = dom.querySelector("div.col-sm-9 table");
        if (summary != null) {
            let clone = summary.cloneNode(true);
            this.cleanInformationNode(clone);
            nodes.push(clone);
        }
        return nodes;
    }

    cleanInformationNode(node) {
        node.querySelector("button").parentElement.parentElement.remove();
    }
}
