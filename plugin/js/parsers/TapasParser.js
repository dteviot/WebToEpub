"use strict";

//dead url/ parser
parserFactory.register("tapas.io", () => new TapasParser());
//dead url
parserFactory.register("m.tapas.io", () => new TapasParser());

class TapasParser extends Parser{
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
                return {
                    sourceUrl:`https://tapas.io/episode/${item.id}`, 
                    title:item.title 
                };
            } );
    }

    findContent(dom) {
        return dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".series-root a.title").textContent;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".creator");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.viewer__header p.title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".thumb");
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "article img.js-lazy");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".description__body")];
    }
}
