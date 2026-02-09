"use strict";

parserFactory.register("ficbook.net", () => new FicbookParser());
parserFactory.register("fic.fan", () => new FicbookParser());
parserFactory.register("fanfictionero.com", () => new FicbookParser());
parserFactory.register("ficador.com", () => new FicbookParser());

class FicbookParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let links = [...dom.querySelectorAll("a.part-link")];
        if (links.length == 0) {
            return [{
                sourceUrl: dom.baseURI, 
                title: dom.querySelector("#part_content > div.title-area.text-center.word-break > h2").textContent
            }];
        }
        let chapters = [];
        for (let link of links) {
            chapters.push({
                sourceUrl: link.href,
                title: link.innerText
            });
            chapterUrlsUI.showTocProgress(chapters);
        }
        return chapters;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']").getAttribute("content");
    }
    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("#content");
    }
    customRawDomToContentStep(chapter, content) {
        let paragraphed_text = content.innerText.split("\n\n").map(x=>"<p>" + x + "</p>").join("");
        let sanitized_text = util.sanitize("<div id='content'>" + paragraphed_text + "</div>")
            .querySelector("#content");
        content.replaceChildren();
        util.moveChildElements(sanitized_text, content);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.heading");
    }

    extractAuthor(dom) {
        let author = dom.querySelector("a.creator-username")?.innerText;
        return author ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll("div.description strong, div.description a")]);
        return tags.map(e => e.textContent).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("meta[name='description']")?.textContent;
    }
    extractSeriesInfo(dom, metaInfo) {  // eslint-disable-line no-unused-vars
        metaInfo.fileName = this.extractTitleImpl(dom).textContent;
    }

    findChapterTitle(dom) {
        return dom.querySelector("#part_content h2[itemprop='headline']");
    }
}
