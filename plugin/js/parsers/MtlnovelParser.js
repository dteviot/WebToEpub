"use strict";

// Use one or more of these to specify when the parser is to be used
parserFactory.register("mtlnovel.com", () => new MtlnovelParser());

class MtlnovelParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false;
    }

    async getChapterUrls(dom) {
        let tocUrls = [...dom.querySelectorAll("div#panelchapterlist amp-list")]
            .map(a => a.getAttribute("src"));
        let chapters = [];
        for(let url of tocUrls) {
            let fragment = await MtlnovelParser.fetchTocFragment(url);
            chapters = chapters.concat(fragment);
        }
        return Promise.resolve(chapters);
    };

    static async fetchTocFragment(url) {
        return HttpClient.fetchJson(url).then(function (handler) {
            return handler.json.items.map(
                item => ({
                    sourceUrl:  item.permalink,
                    title: item.no + " " + item.title,
                    newArc: null 
                })
            );
        });
    }

    findContent(dom) {
        return dom.querySelector("div.single-page");
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".entry-title");
    };

    removeUnwantedElementsFromContentElement(element) {
        let original = "";
        if (this.userPreferences.removeOriginal.value) {
            original = ", p.cn";
        }
        util.removeChildElementsMatchingCss(element, ".crumbs, .chapter-nav, .lang-btn, .sharer" + original);
        for(let e of [...element.querySelectorAll("div.post-content")]) {
            e.removeAttribute("[class]");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#panelnovelinfo div.desc")];
    }
}
