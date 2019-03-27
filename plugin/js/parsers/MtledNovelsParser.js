"use strict";

parserFactory.register("mtled-novels.com", () => new MtledNovelsParser());

class MtledNovelsParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false;
    }

    getChapterUrls(dom) {
        let menu = dom.querySelector("div.card__body");
        return Promise.resolve(util.hyperlinksToChapterList(menu));
    };

    findContent(dom) {
        return dom.querySelector("div.text_content");
    };

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    };

    customRawDomToContentStep(chapter, content) {
        if (this.userPreferences.removeOriginal.value) {
            util.removeChildElementsMatchingCss(content, "div[id='raw']");
        } 
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.profile__img");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.profile__info")];
    }
}
