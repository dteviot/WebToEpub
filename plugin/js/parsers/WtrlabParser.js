"use strict";

parserFactory.register("wtr-lab.com", () => new WtrlabParser());

class WtrlabParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let items = [...dom.querySelectorAll("div.accordion a.chapter-item")];
        return items.map(a => ({
            sourceUrl:  a.href,
            title: this.formatTitle(a)
        }));
    }

    formatTitle(link) {
        let span = link.querySelector("span").textContent.trim();
        let num = link.querySelector("b").textContent.trim().replace("#", "");
        return num + ": " + span;
    }

    extractApplicationJson(dom) {
        let json = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        return JSON.parse(json);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".img-wrap");
    }

    preprocessRawDom(webPageDom) {
        let json = this.extractApplicationJson(webPageDom);
        let chapterdata = json.props.pageProps.serie.chapter_data.data;
        if (chapterdata.title) {
            let content = webPageDom.createElement("div");
            content.className = Parser.WEB_TO_EPUB_CLASS_NAME;
            webPageDom.body.appendChild(content);
            let header = webPageDom.createElement("h1");
            header.textContent = chapterdata.title;
            content.appendChild(header);
            for (let text of chapterdata.body) {
                let p = webPageDom.createElement("p");
                p.appendChild(webPageDom.createTextNode(text))
                content.appendChild(p);
            }
        }
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#contents-tabpane-about")];
    }
}
