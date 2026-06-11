"use strict";

//dead url/ parser
parserFactory.register("mtled-novels.com", () => new MtledNovelsParser());

class MtledNovelsParser extends Parser {
    constructor() {
        super();
    }

    populateUIImpl() {
        document.getElementById("removeOriginalRow").hidden = false;
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("div.card__body a:not(.list-group-item)")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return dom.querySelector("div.text_content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    customRawDomToContentStep(chapter, content) {
        if (this.userPreferences.removeOriginal.value) {
            util.removeChildElementsMatchingSelector(content, "div[id='raw']");
        } 
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.profile__img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.profile__info")];
    }
}
