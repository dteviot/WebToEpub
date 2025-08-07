"use strict";

parserFactory.register("dasuitl.com", () => new DasuitlParser());

class DasuitlParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".card_title");
    }    

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".wp-block-buttons");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".card_title");
    }
}
