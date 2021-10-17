"use strict";

parserFactory.register("mtlnation.com", () => new MtlnationParser());

class MtlnationParser extends MadaraParser{
    constructor() {
        super();
    }

    findContent(dom) {
        let content = dom.querySelector("div.reading-content");
        if (content === null) {
            let footer = dom.querySelector(".entry-header.footer");
            if (footer !== null) {
                content = footer.previousElementSibling;
                if (content !== null) {
                    content.className = "reading-content";
                }
            }
        }
        return super.findContent(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingCss(element, ".code-block, #text-chapter-toolbar, label[style]");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
