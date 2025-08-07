"use strict";

parserFactory.register("peachblossomcodex.com", () => new PeachblossomcodexParser());

class PeachblossomcodexParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("div.pbc_novel_chapters_wrapper");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.et_pb_row_inner_1_tb_body");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h4.et_pb_module_header");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#main-content");
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        let note = webPageDom.querySelector("div.et_pb_row_inner_2_tb_body");
        if (note !== null) {
            content.append(note);
        }
        let footnotes = [...content.querySelectorAll(".wpcmtt")];
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.et_pb_module.et_pb_post_content")];
    }
}
