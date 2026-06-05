"use strict";

parserFactory.register("novels.pl", () => new NovelsplParser());

class NovelsplParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let toc = dom.querySelector("tbody#chapters");
        let chapters = util.hyperlinksToChapterList(toc);
        let tocInfo = NovelsplParser.getTocFetchInfo(dom);
        if (tocInfo != null) {
            chapterUrlsUI.showTocProgress(chapters);
            chapters = await NovelsplParser.fetchMultipleToc(chapters, tocInfo, chapterUrlsUI);
        }
        return chapters.reverse();
    }

    static getTocFetchInfo(dom) {
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent.includes("function load(page)"))
            .map(s => s.textContent)[0];
        if (script != null) {
            let index = script.indexOf("data:");
            let end = script.indexOf(", page:", index);
            script = script.substring(index, end) 
                .replace("id:", "\"id\":")
                .replace("novel:", "\"novel\":")
                .replace("max:", "\"max\":")
                .replace(/'/g, "\"");
            return util.locateAndExtractJson(script + "}", "data:");
        }
        return null;
    }

    static async fetchMultipleToc(chapters, tocInfo, chapterUrlsUI) {
        let maxPage = Math.ceil(tocInfo.max / 50);
        for (let i = 2; i <= maxPage; ++i) {
            let partialList = await NovelsplParser.fetchTocData(i, tocInfo);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }    

    static async fetchTocData(page, tocInfo) {
        let formData = new FormData();
        formData.append("id", tocInfo.id);
        formData.append("novel", tocInfo.novel);
        formData.append("max", tocInfo.max);
        formData.append("page", page);

        let fetchUrl = "https://www.novels.pl/ajax/ajaxGetChapters.php";
        let options = {
            method: "POST",
            credentials: "include",
            body: formData
        };
        let xhr = await HttpClient.wrapFetch(fetchUrl, {fetchOptions: options});
        return util.hyperlinksToChapterList(xhr.responseXML);
    }

    findContent(dom) {
        return dom.querySelector("div.article");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h4[itemprop='name>']");
    }

    removeUnwantedElementsFromContentElement(element) {
        for (let p of [...element.querySelectorAll("p")]) {
            let c = p.textContent;
            if ((c === "This chapter is updated by Novels.pl") || 
                (c === "Liked it? Take a second to support Novels on Patreon!")) {
                p.remove();
            }
        }
        util.removeChildElementsMatchingSelector(element, "ul.pager");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.imageCover");
    }

    preprocessRawDom(chapterDom) {
        util.removeChildElementsMatchingSelector(chapterDom, "a[href='https://www.patreon.com/novelspl']");
    }

    getInformationEpubItemChildNodes(dom) {
        let description = NovelsplParser.getDescriptionMarker(dom);
        return description === null ? [] : [description];
    }

    static getDescriptionMarker(dom) {
        let marker = dom.querySelector("p[itemprop='description']");
        return marker === null ? null : marker.parentElement;
    }
}
