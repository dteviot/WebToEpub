/*
  https://fantasy-books.live/ was renamed to creativenovels.com
*/
"use strict";
parserFactory.register("creativenovels.com", function() { return new CreativeNovelsParser() });
class CreativeNovelsParser extends Parser{
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chaptersElement = dom.querySelector("div.post_box");
        return Promise.resolve(util.hyperlinksToChapterList(chaptersElement));
    }

    findContent(dom) {
        return dom.querySelector("div.content");
    };

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("div.team, div.x-donate-1,"+
            " div.navigation, div.navi, header.entry-header"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector("header.entry-header h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "header");
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [dom.querySelector("div.title").parentElement];
        let summary = dom.querySelectorAll("div.tabcontent, div.tabcontent1");
        for(let node of summary) {
            let clone = node.cloneNode(true);
            this.makeHiddenNodesVisible(clone);
            nodes.push(clone);
        }
        return nodes;
    }
    
    makeHiddenNodesVisible(node) {
        node.removeAttribute("style");
    }
}
