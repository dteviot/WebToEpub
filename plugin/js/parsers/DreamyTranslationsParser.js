"use strict";

parserFactory.register("dreamy-translations.com", () => new DreamyTranslationsParser());
parserFactory.register("dreamytranslations.com", () => new DreamyTranslationsParser());

parserFactory.registerManualSelect(
    "Dreamy Translations",
    () => new DreamyTranslationsParser()
);

class DreamyTranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("a")]
            .filter(a => a.href && a.href.includes("/chapter/") && a.hasAttribute("data-chapter-index"));
            
        let chapters = links.map(a => {
            let title = "";
            let chNumSpan = a.querySelector("span.font-medium");
            let titleP = a.querySelector("p.truncate");
            
            if (chNumSpan && titleP) {
                title = chNumSpan.textContent.trim() + " - " + titleP.textContent.trim();
            } else {
                title = a.textContent.trim();
            }
            
            return {
                sourceUrl: a.href,
                title: title
            };
        });
        
        return chapters;
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img[src*=\\"/covers/\\"]");
        if (img) {
            return img.src;
        }
        return super.findCoverImageUrl(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("sup.tl-note"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("button.text-2xl span > span");
    }
}
