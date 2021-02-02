"use strict";
parserFactory.register("alphapolis.co.jp", () => new AlphapolisParser());
class AlphapolisParser extends Parser{
    constructor() {
        super();
    }
    async getChapterUrls(dom) {
		let menu = dom.querySelector("div.episodes");
        return util.hyperlinksToChapterList(menu);
    }
    findContent(dom) {
        return dom.querySelector("div#novelBoby");
    }
    extractTitleImpl(dom) {
        return dom.querySelector("h2.title");
    }
extractAuthor(dom) {
    let authorLink = dom.querySelector("div.author a");
    return (authorLink === null) ? super.extractAuthor(dom) : authorLink.textContent;
};
    extractLanguage(dom) {
        return "jp";
    }
    findChapterTitle(dom) {
        return dom.querySelector("h2.episode-title");
    }
    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.content-info .cover");
    }
	getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.abstract")];
    }
}
