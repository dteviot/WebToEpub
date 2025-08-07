"use strict";

//dead url/ parser
parserFactory.register("engnovel.com", () => new EngnovelParser());

class EngnovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = EngnovelParser.extractPartialChapterList(dom);
        let formData = EngnovelParser.getTocFetchInfo(dom);
        chapterUrlsUI.showTocProgress(chapters);
        for (let i = 2; i <= formData.maxPage; ++i) {
            let partialList = await EngnovelParser.fetchPartialChapterList(formData.id, i);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    static getTocFetchInfo(dom) {
        let pagination = [...dom.querySelectorAll("div#pagination a")]
            .map(a => parseInt(a.getAttribute("data-page")));

        return {
            id: dom.querySelector("input#id_post").getAttribute("value"),
            maxPage: Math.max(1, ...pagination)
        };
    }

    static async fetchPartialChapterList(id, page) {
        let fetchUrl = "https://engnovel.com/wp-admin/admin-ajax.php";
        let options = {
            method: "POST",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            credentials: "include",
            body: `action=tw_ajax&type=pagination&id=${id}&page=${page}`
        };
        let json = (await HttpClient.fetchJson(fetchUrl, options)).json;
        let dom = util.sanitize(json.list_chap);
        return EngnovelParser.extractPartialChapterList(dom);
    }

    static extractPartialChapterList(dom) {
        let chapterlist = [...dom.querySelectorAll("ul.list-chapter")].pop();
        return util.hyperlinksToChapterList(chapterlist);
    }    

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h3.title");
    }

    findChapterTitle(dom) {
        return dom.querySelector("a.chapter-title").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.desc-text")];
    }
}
