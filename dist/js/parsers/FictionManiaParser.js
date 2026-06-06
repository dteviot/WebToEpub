/*
  parses fictionmania.tv
  Notes:
  * For this to work, need to go to page with set of chapters.
  * If book has more than 25 chapters, will need to get each set to chapters and
    put them together manually using "Edit Chapter URLs"
*/
"use strict";

parserFactory.register("fictionmania.tv", () => new FictionManiaParser());

class FictionManiaParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = util.hyperlinksToChapterList(dom.body, this.isChapterHref);
        return Promise.resolve(chapters.reverse());
    }

    isChapterHref(link) {
        return (link.pathname.indexOf("/stories/readhtmlstory.html") != -1) ||
            (link.pathname.indexOf("/stories/readtextstory.html") != -1);
    }

    findContent(dom) {
        let content = util.getElement(dom, "div", e => (e.style.marginLeft !== ""));
        if (content === null) {
            // older versions have text in a <pre> element
            content = dom.querySelector("pre");
        }
        return content;
    }

    customRawDomToContentStep(chapter, content) {
        if (content.tagName.toLowerCase() === "pre") {
            util.convertPreTagToPTags(chapter.rawDom, content, "\n\n");
        }
    }

    extractTitleImpl(dom) {
        return util.getElement(dom.body, "a", e => this.isChapterHref(e));
    }

    extractAuthor(dom) {
        let author = dom.querySelector("a[href*='/searchdisplay/authordisplay.html?word=']");
        return (author === null) ? super.extractAuthor(dom) : author.innerText;
    }
}
