"use strict";

parserFactory.register("spiritfanfiction.com", () => new SpiritfanfictionParser());

class SpiritfanfictionParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("table.listagemCapitulos");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div.texto-capitulo");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tituloPrincipal");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.tituloPrincipal");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "section.boxConteudo");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("section.boxConteudo div.texto")];
    }
}
