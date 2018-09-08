"use strict";

parserFactory.register("forum.babelchain.org", () => new BabelChainParser());

class BabelChainParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = BabelChainParser.getChapterUrlsFromRenderedTocPage(dom);
        if (!BabelChainParser.mayBeMoreChapters(chapters)) {
            return Promise.resolve(chapters.reverse());
        }
        return HttpClient.wrapFetch(dom.baseURI).then(
            response => BabelChainParser.walkTocPages(response.responseXML, [])
        );
    };

    static getChapterUrlsFromRenderedTocPage(dom) {
        return [...dom.querySelectorAll("span.link-top-line a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div.post");
    };

    findChapterTitle(dom) {
        return this.extractTitle(dom);
    }

    static walkTocPages(dom, chapters) {
        let newChapters = BabelChainParser.getChapterUrlsFromRawTocPage(dom);
        chapters = chapters.concat(newChapters);
        let next = BabelChainParser.findNextTocPageUrl(dom);
        if ((next != null) && BabelChainParser.mayBeMoreChapters(newChapters)) {
            return HttpClient.wrapFetch(next.href).then(
                response => BabelChainParser.walkTocPages(response.responseXML, chapters)
            )
        }
        return Promise.resolve(chapters.reverse());
    }

    static getChapterUrlsFromRawTocPage(dom) {
        return [...dom.querySelectorAll("div.topic-list a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    static findNextTocPageUrl(dom) {
        return dom.querySelector("a[rel='next']");
    }

    static mayBeMoreChapters(chapters) {
        // Each ToC page may have up to 30 chapters
        return 30 <= chapters.length;
    }
}
