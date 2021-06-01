"use strict";

parserFactory.register("goblinsguide.com", () => new GoblinsguideParser());

class GoblinsguideParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let bookmenu = dom.querySelector("aside#bookmenu");
        let script = bookmenu.querySelector("script").textContent;
        let cat_id = new RegExp("const cat_id1 = (\\d+);").exec(script)[1];
        let cat_slug = new RegExp("const cat_slug = \"([^\"]+)").exec(script)[1];
        let chapters = [];
        for(let e of bookmenu.querySelectorAll("li.ex1 span.caret")) {
            let chapter = e.getAttribute("data-id");
            let html = (await this.fetchTocPage(cat_id, cat_slug, chapter)).responseXML;
            let partialList = util.hyperlinksToChapterList(html.body);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
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
        return dom.querySelector("h1.entry-title");
    }

    removeUnwantedElementsFromContentElement(element) {
        let child = element.children[0];
        if (child.tagName === "A") {
            child.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.entry-content")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "noscript");
        let link = node.querySelector("a");
        if (link != null) {
            link.remove();
        }
    }
}
