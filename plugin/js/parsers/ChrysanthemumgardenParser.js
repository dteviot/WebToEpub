"use strict";

parserFactory.register("chrysanthemumgarden.com", () => new ChrysanthemumgardenParser());

class ChrysanthemumgardenParser extends WordpressBaseParser{
    constructor() {
        super();
    }

    customRawDomToContentStep(chapter, content) {
        let notes = [...chapter.rawDom.querySelectorAll("div.tooltip-container")];
        for(let n of notes) {
            content.appendChild(n);
        }
    }
}
