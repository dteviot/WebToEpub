"use strict";

parserFactory.register("wuxiaworld.eu", () => new WuxiaworldeuParser());
parserFactory.register("wuxia.click", () => new WuxiaworldeuParser());

class WuxiaworldeuParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let host = new URL(dom.baseURI).host;
        let tocUrl = dom.baseURI.replace("/novel/", "/api/chapters/") + "/";
        let json = (await HttpClient.fetchJson(tocUrl)).json;
        return json.map(j => this.toChapter(j, host));
    }

    toChapter(json, host) {
        return ({
            sourceUrl:  `https://${host}/chapter/${json.novSlugChapSlug}`,
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
        util.removeChildElementsMatchingSelector(element, "div.mantine-Group-root, div.mantine-Container-root");
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
