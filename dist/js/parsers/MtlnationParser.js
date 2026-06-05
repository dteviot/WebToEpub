"use strict";

parserFactory.register("mtlnation.com", () => new MtlnationParser());

class MtlnationParser extends MadaraParser {
    constructor() {
        super();
    }

    disabled() {
        return UIText.Warning.parserDisabledNotification;
    }

    findContent(dom) {
        if (dom.querySelector("div.reading-content") === null) {
            let content = dom.querySelector("div[data-position='footer']")?.previousElementSibling;
            if (content != null) {
                content.className = "reading-content";
            }
        }
        return super.findContent(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".code-block, #text-chapter-toolbar, [style='display:none;']");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
