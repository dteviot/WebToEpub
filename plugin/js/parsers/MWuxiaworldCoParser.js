"use strict";

parserFactory.register("m.wuxiaworld.co", () => new MWuxiaworldCoParser());

class MWuxiaworldCoParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = MWuxiaworldCoParser.chaptersFromDom(dom);
        if (10 < chapters) {
            return Promise.resolve(chapters);
        } else {
            return HttpClient.wrapFetch(dom.baseURI + "/all.html").then(function (xhr) {
                return MWuxiaworldCoParser.chaptersFromDom(xhr.responseXML);
            });
        }
    }

    static chaptersFromDom(dom) {
        let menu = dom.querySelector("div#chapterlist");
        return util.hyperlinksToChapterList(menu)
            .filter(c => !c.sourceUrl.endsWith("#bottom"));
    }

    findContent(dom) {
        return dom.querySelector("div#chaptercontent");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("span.title");
    };

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("p.author");
        if (authorLabel !== null) {
            let labels = authorLabel.textContent.split("：");
            return labels[(labels.length === 1) ? 0 : 1]; 
        }
        return super.extractAuthor(dom);
    };

    findChapterTitle(dom) {
        let span = dom.querySelector("span.title")
        return (span === null) ? null : span.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.synopsisArea");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.synopsisArea_detail, p.review")];
    }

    cleanInformationNode(node) {
        node.removeAttribute("style");
    }
}
