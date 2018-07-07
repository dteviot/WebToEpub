"use strict";

parserFactory.register("69shu.com", function() { return new ShuParser() });

class ShuParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let linkToChapters = dom.querySelector("a.button.read");
        return HttpClient.wrapFetch(linkToChapters.href, this.makeOptions()).then(function (xhr) {
            let lists = [...xhr.responseXML.querySelectorAll("ul.mulu_list")];
            return util.hyperlinksToChapterList(lists[1]);
        });
    }

    findContent(dom) {
        return dom.querySelector("div.yd_text2");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.status h1 a");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("p.author a");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    };

    findChapterTitle(dom) {
        return dom.querySelector("td.ydleft h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.imgbox");
    }

    fetchChapter(url) {
        // site does not tell us gb18030 is used to encode text
        return HttpClient.wrapFetch(url, this.makeOptions()).then(function (xhr) {
            return Promise.resolve(xhr.responseXML);
        });
    }

    makeOptions() {
        return ({
            makeTextDecoder: () => new TextDecoder("gb18030")
        });
    }
}
