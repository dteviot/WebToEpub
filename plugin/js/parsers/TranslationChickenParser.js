"use strict";

parserFactory.register("translationchicken.com", function() { return new TranslationChickenParser(); });

class TranslationChickenParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    findContent(dom) {
        let content = dom.querySelector("div.post-content");
        let feature = dom.querySelector("div.featured-media");
        if (feature !== null)
        {
            feature.remove();
            content.insertBefore(feature, content.children[0]);
        }
        return content;
    }
}
