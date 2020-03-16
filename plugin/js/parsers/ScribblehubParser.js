"use strict";

parserFactory.register("scribblehub.com", function() { return new ScribblehubParser() });

class ScribblehubParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        return ScribblehubParser.walkTocPages(dom, [], dom.baseURI, 2);
    };

    static getChapterUrlsFromTocPage(dom) {
        return [...dom.querySelectorAll("a.toc_a")]
            .map(a => util.hyperLinkToChapter(a))
    }

    static walkTocPages(dom, chapters, baseUrl, nextTocIndex) {
        let newChaps = ScribblehubParser.getChapterUrlsFromTocPage(dom);
        chapters = chapters.concat(newChaps);

        // This is a hack, if less than 15 chapters in returned ToC, 
        // assume we've reached end
        if (newChaps.length < 15) {
            return Promise.resolve(chapters.reverse());
        }
        let nextToc = ScribblehubParser.nextTocPageUrl(baseUrl, nextTocIndex);
        return HttpClient.wrapFetch(nextToc).then(
            response => ScribblehubParser.walkTocPages(response.responseXML, chapters, baseUrl, nextTocIndex + 1)
        )
    }

    static nextTocPageUrl(baseUrl, nextTocIndex) {
        return `${baseUrl}?toc=${nextTocIndex}`;
    }

    findContent(dom) {
        return dom.querySelector("div#chp_contents");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("div.fic_title");
    };

    extractAuthor(dom) {
        let author = dom.querySelector("span.auth_name_fic");
        return (author === null) ? super.extractAuthor(dom) : author.textContent;
    };
    
    findChapterTitle(dom) {
        return dom.querySelector("div.chapter-title");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.fic_image");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.fic_row.details")];
    }
}
