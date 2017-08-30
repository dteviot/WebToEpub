/*
  parses lnmtl.com
*/
"use strict";

parserFactory.register("lnmtl.com", function() { return new LnmtlParser() });

class LnmtlParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let volumesList = LnmtlParser.findVolumesList(dom);
        if (volumesList.length !== 0) {
            return LnmtlParser.fetchChapterLists(volumesList, HttpClient.fetchJson).then(function (lists) {
                return LnmtlParser.mergeChapterLists(lists); 
            });
        };

        let table = dom.querySelector("#volumes-container table");
        return Promise.resolve(util.hyperlinksToChapterList(table));
    }

    extractTitle(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        return (title === null) ? super.extractTitle(dom) : title.getAttribute("content");
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-body");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3.dashhead-title");
    }

    customRawDomToContentStep(chapter, content) {
        for(let s of content.querySelectorAll("sentence")) {
            if (s.className === "original") {
                s.remove();
            } else {
                let p = s.ownerDocument.createElement("p");
                p.innerText = s.innerText;
                s.replaceWith(p);
            }
        } 
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.jumbotron.novel");
    }

    static findVolumesList(dom) {
        let startString = "lnmtl.volumes = ";
        let scriptElement = util.getElement(dom, "script", e => 0 <= e.textContent.indexOf(startString));
        if (scriptElement !== null) {
            let text = scriptElement.textContent;
            let startIndex = text.indexOf(startString) + startString.length;
            text = text.substring(startIndex);
            let endIndex = text.indexOf("}];");
            return JSON.parse(text.substring(0, endIndex + 2));  
        }
        return []; 
    }

    static fetchChapterLists(volumesList, fetchJson) {
        return Promise.all(
            volumesList.map(volume => LnmtlParser.fetchChapterListsForVolume(volume, fetchJson))
        );
    }

    static fetchChapterListsForVolume(volumeInfo, fetchJson) {
        let restUrl = LnmtlParser.makeChapterListUrl(volumeInfo.id, 1);
        return fetchJson(restUrl).then(function (handler) {
            let firstPage = handler.json;
            let pagesForVolume = [Promise.resolve(handler)];
            for( let i = 2; i <= firstPage.last_page; ++i) {
                let url = LnmtlParser.makeChapterListUrl(volumeInfo.id, i);
                pagesForVolume.push(fetchJson(url));
            };
            return Promise.all(pagesForVolume);
        })
    }

    static makeChapterListUrl(volumeId, page) {
        return `http://lnmtl.com/chapter?page=${page}&volumeId=${volumeId}`;
    }

    static mergeChapterLists(lists) {
        let chapters = [];
        for(let list of lists) {
            for (let page of list) {
                for(let chapter of page.json.data) {
                    chapters.push({
                        sourceUrl: chapter.site_url,
                        title: "#" + chapter.number + ": " + chapter.title,
                        newArc: null                    
                    });
                };
            };
        };
        return chapters;
    }
}
