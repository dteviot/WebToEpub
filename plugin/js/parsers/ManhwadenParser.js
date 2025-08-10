"use strict";

parserFactory.register("manhwaden.com", () => new ManhwadenParser());

class ManhwadenParser extends MadaraParser {
    constructor() {
        super();
    }

    preprocessRawDom(webPageDom) {
        util.removeChildElementsMatchingSelector(webPageDom, "img:not([src])");
    }
}
