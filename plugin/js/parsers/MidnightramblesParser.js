"use strict";

parserFactory.register("midnightrambles.in", () => new MidnightramblesParser());

class MidnightramblesParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span[data-ez-ph-id]");
        [...element.querySelectorAll("span")]
            .filter(s => s.id.startsWith("ezoic-"))
            .forEach(s => s.remove());
        super.removeUnwantedElementsFromContentElement(element);
    }
}
