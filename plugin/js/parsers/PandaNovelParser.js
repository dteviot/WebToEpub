"use strict";

parserFactory.register("panda-novel.com", () => new PandaNovelParser());
parserFactory.register("pandasnovel.com", () => new PandaNovelParser());
parserFactory.register("www.lightsnovel.com", () => new PandaNovelParser());

class PandaNovelParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let urlsOfTocPages = PandaNovelParser.getUrlsOfTocPages(dom);
        let baseUrl = new URL(dom.baseURI).origin;
        for (let url of urlsOfTocPages) {
            await this.rateLimitDelay();
            let jsonContent = (await HttpClient.fetchJson(url)).json;
            let partialList = PandaNovelParser.extractPartialChapterList(jsonContent.data.list, baseUrl);
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    static getUrlsOfTocPages(dom) {
        let pageIds = [...dom.querySelectorAll("ul.pagination li a")]
            .filter(a => a.text)
            .map(a => parseInt(a.text.trim()));
        pageIds.concat(1);
        let maxPage = Math.max(...pageIds);
        let baseUrl = new URL(dom.baseURI).origin;
        let bookId = parseInt(dom.baseURI.split("-").pop());
        let urls = [];
        for (let i = 1; i <= maxPage; ++i) {
            urls.push(baseUrl + "/api/book/chapters/" + bookId + "/" + i);
        }
        return urls;
    }

    static extractPartialChapterList(jsonContent, baseUrl) {
        return jsonContent.map(data => ({
            sourceUrl: baseUrl + data.chapterUrl,
            title: data.name.trim()
        }));
    }

    findContent(dom) {
        return dom.querySelector("#novelArticle2");
    }

    customRawDomToContentStep(webPage, content) {
        let html = this.getRealContent(webPage, content);
        html = html.replaceAll(/<br><br>|<\/p><p>/g, "</p>\n<p>").replaceAll(/(?<!\n)<p>/g, "\n<p>");
        util.parseHtmlAndInsertIntoContent(html, content);
        util.removeChildElementsMatchingSelector(content, "ins");
    }

    getRealContent(webPage, content) {
        let startString = "_pageParameter['contents'] =";
        let scriptElement = [...webPage.rawDom.querySelectorAll("script")]
            .map(s => s.textContent.trim())
            .filter(s => s.includes(startString));
        if (0 === scriptElement.length) {
            return "\n<p>" + content.innerHTML + "</p>";
        }
        let temp = scriptElement[0];
        let start = temp.indexOf("\"");
        let end = temp.lastIndexOf("\"");
        temp = this.addMissingPTag(temp.substring(start + 1, end));
        temp = "{\"a\": \"" +  temp + "\"}";
        let temp2 = JSON.parse(temp);
        return temp2.a;
    }

    addMissingPTag(html) {
        let addStartTag = (s) => s.trim().startsWith("<p>")
            ? s
            : "<p>" + s;
        let paragraphs = html.split("<\\/p>")
            .map(addStartTag);
        return paragraphs.join("<\\/p>");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-desc h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".novel-content h2");
    }

    extractAuthor(dom) {
        //Note: In "a[href*='/author']" forward slash is required
        let authorLabel = [...dom.querySelectorAll(".novel-desc a[href*='/author']")].map(x => x.textContent.trim());
        return (authorLabel.length === 0) ? super.extractAuthor(dom) : authorLabel.join(", ");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".novel-ins, sub");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        return dom.querySelector(".novel-cover [style*=background-image]").dataset.src;
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector(".details-section dd")];
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".details-tags li")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
}
