"use strict";

/**
  This is a dummy parser, intended to act like a parser that reads a 
  lot of chapters, slowly.  For testing other parts of WebToEpub
  Note, need to open the by looking at site rtd.moe
*/

parserFactory.register("rtd.moe", () => new FakeParser());

class FakeParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls( /* dom */ ) {
        let chapters = [];
        for (let i = 1; i < 30; ++i) {
            chapters.push({
                sourceUrl:  `https://rtd.moe/Chapter/${i}.html`,
                title: `Chapter ${i}`,
                newArc: null
            });
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    async fetchChapter(url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        this.addTitleToChapter(newDoc, url);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return newDoc.dom; 
    }

    addTitleToChapter(newDoc, url) {
        let title = newDoc.dom.createElement("h1");
        title.textContent = url;
        newDoc.content.appendChild(title);
    }

    getInformationEpubItemChildNodes( /* dom */ ) {
        return [];
    }    
}
