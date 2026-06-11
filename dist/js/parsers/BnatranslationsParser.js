"use strict";

//dead url/ parser
parserFactory.register("bnatranslations.com", () => new BnatranslationsParser());

class BnatranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".elementor-text-editor a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("article .post__content .elementor-widget-container");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".page__title h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".page__title h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".elementor-widget-container");
    }

    preprocessRawDom(chapterDom) {
        util.removeChildElementsMatchingSelector(chapterDom, ".elementor-button-wrapper");
        let containers = [...chapterDom.querySelectorAll("article .post__content .elementor-widget-container")];
        let container = containers[0];
        let i = 0;
        while (++i < containers.length) {
            let hasFollowButton = containers[i].querySelector(".wordpress-follow-button") != null;
            if (hasFollowButton) {
                break;
            }
            util.moveChildElements(containers[i], container);
            containers[i].remove();
        }
    }
}
