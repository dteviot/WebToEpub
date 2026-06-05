"use strict";

parserFactory.register("manhwatop.com", () => new ManhwatopParser());

class ManhwatopParser extends MadaraParser {
    constructor() {
        super();
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, ".reading-content img");
        util.removeChildElementsMatchingSelector(webPageDom, "img[alt='ManhwaTop']");
    }
}
