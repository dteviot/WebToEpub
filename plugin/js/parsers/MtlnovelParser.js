"use strict";
parserFactory.register("mtlnovel.com", () => new MtlnovelParser());
parserFactory.registerUrlRule(
    url => (util.extractHostName(url).endsWith(".mtlnovel.com")),
    () => new MtlnovelParser()
);

class MtlnovelParser extends Parser{
    constructor() {
        super();
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeOriginalRow").hidden = false;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let tocUrls = [...dom.querySelectorAll("#panelchapterlist amp-list")]
            .map(e => e.getAttribute("src"));
        let chapters = [];
        for (let tocUrl of tocUrls) {
            let json = (await HttpClient.fetchJson(tocUrl)).json;
            let partialList = this.chaptersFromJson(json);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    };

    chaptersFromJson(json) {
        return json.items.map(
            i => ({
                title: i.no + " " + i.title,
                sourceUrl: i.permalink
            })
        )
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
        util.removeChildElementsMatchingCss(element, ".crumbs, .chapter-nav, .lang-btn, .sharer," +
            " amp-embed, .link-title, ol.link-box, a.view-more, button" + original);
        for(let e of [...element.querySelectorAll("div")]) {
            e.removeAttribute("[class]");
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#panelnovelinfo div.desc")];
    }
}
