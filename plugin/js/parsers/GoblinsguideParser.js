"use strict";

parserFactory.register("goblinsguide.com", () => new GoblinsguideParser());

class GoblinsguideParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div#chapters a")]
            .map(a => util.hyperLinkToChapter(a));
    }

    async fetchTocPage(cat_id, cat_slug, chapter) {
        var data = new URLSearchParams();
        data.append("cat_id", cat_id);
        data.append("chapter", chapter);
        data.append("cat_slug", cat_slug);
        
        let options = {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: data.toString()
        };
        let fetchUrl = "https://goblinsguide.com/wp-content/themes/goblinsguide/template-parts/post/menu-query.php";
        return HttpClient.wrapFetch(fetchUrl, {fetchOptions: options});
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".category-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        let child = element.children[0];
        if (child.tagName === "A") {
            child.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.js-bookcard");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.category-exerpt p")];
    }
}
