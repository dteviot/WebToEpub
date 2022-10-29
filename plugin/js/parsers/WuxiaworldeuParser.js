"use strict";

parserFactory.register("wuxiaworld.eu", () => new WuxiaworldeuParser());

class WuxiaworldeuParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocUrl = dom.baseURI.replace("/novel/", "/api/chapters/") + "/";
        let json = (await HttpClient.fetchJson(tocUrl)).json;
        return json.map(this.toChapter);
    }

    toChapter(json) {
        return ({
            sourceUrl:  "https://www.wuxiaworld.eu/chapter/" + json.novSlugChapSlug,
            title: json.title
        });
    }

    findContent(dom) {
        return dom.querySelector("#chapterText")?.parentElement?.parentElement;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h5");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, "div.mantine-Group-root, div.mantine-Container-root");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.mantine-Image-imageWrapper");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".mantine-Spoiler-root")];
    }
}
