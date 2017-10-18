/*
  Parser for www.wattpad.com
*/
"use strict";

parserFactory.register("wattpad.com", function() { return new WattpadParser() });

class WattpadParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("ul.table-of-contents");
        if (menu == null) {
            return this.fetchChapterList(dom);
        }
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    fetchChapterList(dom) {
        let storyId = WattpadParser.extractStoryId(dom.baseURI);
        let chaptersUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`;
        return HttpClient.fetchJson(chaptersUrl).then(function (handler) {
            return handler.json.parts.map(p => ({sourceUrl: p.url, title: p.title}))
        });
    }

    static extractStoryId(url) {
        let hyperlink = document.createElement("a");
        hyperlink.href = url;
        let path = hyperlink.pathname;
        return path.split("/").filter(s => s.includes("-"))[0].split("-")[0];
    }

    findContent(dom) {
        return dom.querySelector("div[data-page-number]");
    };

    // title of the story  (not to be confused with title of each chapter)
    extractTitle(dom) {
        return dom.querySelector("div#story-landing h1").textContent.trim();
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.author-info a.on-navigate");
        if (authorLabel === null) {
            return super.extractAuthor(dom)
        }
        let path = authorLabel.getAttribute("href").split("/");
        return path[path.length - 1];
    };

    // custom cleanup of content
    removeUnwantedElementsFromContentElement(element) {
        for(let pre of [...element.querySelectorAll("pre")]) {
            util.moveElementsOutsideTag(pre);
            pre.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    // individual chapter titles are not inside the content element
    findChapterTitle(dom) {
        return dom.querySelector("h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }
}
