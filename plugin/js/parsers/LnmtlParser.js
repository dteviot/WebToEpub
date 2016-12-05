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

        let volumesContainer = dom.getElementById("volumes-container");
        let chapters = [];
        if (volumesContainer !== null) {
            let table = util.getElement(volumesContainer, "table");
            if (table !== null) {
                chapters = util.hyperlinksToChapterList(table);
            }
        }
        return Promise.resolve(chapters);
    }

    extractTitle(dom) {
        let title = util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:title"));
        return (title === null) ? super.extractTitle(dom) : title.getAttribute("content");
    }

    findContent(dom) {
        return util.getElement(dom, "div", e => e.className.startsWith("chapter-body"));
    }

    findChapterTitle(dom) {
        return util.getElement(dom, "h3", e => (e.className === "dashhead-title"));
    }

    customRawDomToContentStep(chapter, content) {
        let sentences = util.getElements(content, "sentence");
        for(let s of sentences) {
            if (s.className === "original") {
                s.remove();
            } else {
                let p = s.ownerDocument.createElement("p");
                p.innerText = s.innerText;
                s.parentNode.replaceChild(p, s);
            }
        } 
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    findCoverImageUrl(dom) {
        if (dom != null) {
            let div = util.getElement(dom, "div", e => e.className.startsWith("jumbotron novel"));
            if (div !== null) { 
                let cover = util.getElement(div, "img");
                if (cover !== null) {
                    return cover.src;
                };
            };
        };
        return null;
    }

    static findVolumesList(dom) {
        let startString = "lnmtl.volumes = ";
        let scriptElement = util.getElement(dom, "script", e => 0 <= e.innerText.indexOf(startString));
        if (scriptElement !== null) {
            let text = scriptElement.innerText;
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
        return fetchJson(restUrl).then(function (firstPage) {
            let pagesForVolume = [Promise.resolve(firstPage)];
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
                for(let chapter of page.data) {
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
