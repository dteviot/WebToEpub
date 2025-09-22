"use strict";

//not dead yet
parserFactory.register("tapas.io", () => new TapasParser());
//dead url
parserFactory.register("m.tapas.io", () => new TapasParser());

class TapasParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let pageNum = 1;
        let retrieve_count = 20;
        
        let seriesId = dom.querySelector("meta[property='al:android:url']").getAttribute("content").split("/", 4).pop();
        let chapterList = [];
        let chapterResponse = {};

        do
        {
            chapterResponse = await TapasParser.fetchPartialChapterList(seriesId, pageNum++, retrieve_count);
            var chapters = TapasParser.parseEpisodeDataToChapterList(chapterResponse.episodes);
            chapterUrlsUI.showTocProgress(chapters.map(item => item));
            chapterList = chapterList.concat(chapters);
        } while (chapterResponse.pagination.has_next && chapterResponse.episodes.length == retrieve_count);

        return chapterList;
    }

    static async fetchPartialChapterList(id, page, retrieve_count)
    {
        let restUrl = `https://tapas.io/series/${id}/episodes?page=${page}&sort=OLDEST&max_limit=${retrieve_count}`;
        let response = await HttpClient.fetchJson(restUrl);
        return response.json.data;
    }

    static parseEpisodeDataToChapterList(episodes)
    {
        return episodes.filter(item => item.free || item.free_access || item.unlocked)
            .map(item => {
                let title = item.scene + ": " + item.title;
                return {
                    sourceUrl:`https://tapas.io/episode/${item.id}`, 
                    title: title
                };
            } );
    }

    findContent(dom) {
        return dom.querySelector("#viewport") || dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        const title =
            dom.querySelector(".series-root .title") ||
            dom.querySelector(".center-info .center-info__title--small") ||
            dom.querySelector("title");
        return title.textContent;
    }

    extractAuthor(dom) {
        let authorLabel =
            dom.querySelector(".creator") ||
            dom.querySelector(".viewer-section--episode .name-wrapper .name");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        const title =
            dom.querySelector(".center-info .js-ep-title") ||
            dom.querySelector("div.viewer__header p.title");
        return title?.textContent ?? null;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".info--bottom") ||
            util.getFirstImgSrc(dom, ".info-body") ||
            util.getFirstImgSrc(dom, ".thumb");
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            util.removeAttributes(element, ["dir", "role", "lang"]);
            util.replaceSemanticInlineStylesWithTags(element, true);
            if (element.id?.startsWith("docs-internal-guid-")) {
                element.removeAttribute("id");
            }
            element.classList.remove("MsoNormal");

            if (element.tagName?.toLowerCase() === "w:sdt") {
                // tag <w:sdt> is not valid XHTML, convert it to span with class="sdttag"
                util.removeAttributes(element, ["id", "sdttag"]);
                const spanElement = element.ownerDocument.createElement("span");
                spanElement.classList.add("sdttag");
                util.convertElement(element, spanElement);
            }
        });
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "article img.js-lazy");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".description__body")];
    }
}
