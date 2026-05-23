"use strict";
parserFactory.register("atlantisviendong.com", () => new AtlantisVienDongParser());
class AtlantisVienDongParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }
    async getChapterUrls(dom) {
        let menu = dom.querySelector(".uk-nav-sub");
        return util.hyperlinksToChapterList(menu);
    }

    // this website has some template that change every webpage so had to make a function to find the template by index and then use that to find the content and title and other info
    findTemplateByIndex(dom, index) {
        let selector = `[id$="#${index}"]`;
        for (let element of dom.querySelectorAll(selector)) {
            if (element.id.startsWith("template-") && element.id.endsWith(`#${index}`)) {
                return element;
            }
        }
        return null;
    }
    
    findContent(dom) {
        let element = this.findTemplateByIndex(dom, 0);
        if (element) {
            // Remove plus symbols at the end of sentences
            element.innerHTML = element.innerHTML.replace(/\s*\+\s*/g, " ");
        }
        return element;
    }

    extractTitleImpl(dom) {
        return this.findTemplateByIndex(dom, 1);
    }

    extractAuthor(dom) {
        let authorLabel = this.findTemplateByIndex(dom, 2)?.querySelector("strong:nth-child(1)");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("div.uk-grid-margin-small:nth-child(1)")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return this.findTemplateByIndex(dom, 7)?.querySelector("div:nth-child(2)")?.textContent.trim();
    }

    // There is a element that does has the chapter and content but theres some trash in it so this is included
    findChapterTitle(dom) {
        return dom.querySelector("h1.uk-text-center");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#image");
    }
}
