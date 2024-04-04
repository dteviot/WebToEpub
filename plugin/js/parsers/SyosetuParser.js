"use strict";

parserFactory.register("ncode.syosetu.com", () => new SyosetuParser());
parserFactory.register("novel18.syosetu.com", () => new SyosetuParser());

class SyosetuParser extends Parser{
    constructor() {
        super();
        this.infoPageDom = null;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        await this.fetchAndAttachInfoPage(dom);
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    async fetchAndAttachInfoPage(dom) {
        const infoPageUrl = dom.querySelector("#head_nav > li:nth-child(2) > a").href;
        this.infoPageDom = (await HttpClient.fetchHtml(infoPageUrl)).responseXML; // Parse and store the info page DOM
    }

    getUrlsOfTocPages(dom) {
        let lastPage = dom.querySelector("a.novelview_pager-last");
        let urls = [];
        if (lastPage) {
            const lastPageNumber = parseInt(lastPage.href.split("?p=")[1]);
            const baseUrl = lastPage.href.substring(0, lastPage.href.lastIndexOf("?p="));
            for (let i = 2; i <= lastPageNumber; i++) {
                urls.push(`${baseUrl}?p=${i}`);
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        let chapterList = dom.querySelector("div.index_box") || dom.querySelector("div.novel_sublist");
        return [...chapterList.querySelectorAll("a")].map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return dom.querySelector("div#novel_honbun");
    };

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_title");
    };

    extractAuthor(dom) {
        const authorDiv = dom.querySelector("div.novel_writername");
        if (authorDiv) {
            const authorText = authorDiv.textContent.trim().replace(/^作者：/, "");
            return authorDiv.querySelector("a")?.textContent.trim() || authorText;
        }
        return super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        let element = dom.querySelector(".novel_subtitle");
        return (element === null) ? null : element.textContent;
    }

    getInformationEpubItemChildNodes() {
        const infoNodes = [];
        const infoTable = this.infoPageDom.querySelector("#infodata");
        const infoTableClone = infoTable.cloneNode(true);
        infoNodes.push(infoTableClone);
        return infoNodes;
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingCss(node, "#qr, #pre_info > a");
        const preInfoDiv = node.querySelector("#pre_info");
        this.removePipeCharacter(preInfoDiv);
        let sibling = preInfoDiv.querySelector("#noveltype_notend")?.nextSibling;
        if (sibling) {
            sibling.textContent = sibling.textContent.replace(/^全/, " 全");
        }
    }
    
    removePipeCharacter(contentElement) {
        let walker = contentElement.ownerDocument.createTreeWalker(contentElement, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            let node = walker.currentNode;
            node.textContent = node.textContent.replace(/\|/g, "");
        };
    }    
}