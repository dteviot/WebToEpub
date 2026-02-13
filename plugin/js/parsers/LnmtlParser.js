/*
  parses lnmtl.com
*/
"use strict";

//dead url/ parser
parserFactory.register("lnmtl.com", () => new LnmtlParser());

class LnmtlParser extends Parser {
    constructor() {
        super();
    }

    populateUIImpl() {
        document.getElementById("removeOriginalRow").hidden = false; 
        document.getElementById("removeTranslatedRow").hidden = false; 
    }
  
    async getChapterUrls(dom) {
        let volumesList = LnmtlParser.findVolumesList(dom);
        if (volumesList.length !== 0) {
            let lists = await LnmtlParser.fetchChapterLists(volumesList, HttpClient.fetchJson);
            return LnmtlParser.mergeChapterLists(lists); 
        }

        let table = dom.querySelector("#volumes-container table");
        return Promise.resolve(util.hyperlinksToChapterList(table));
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-body");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h3.dashhead-title");
    }

    customRawDomToContentStep(chapter, content) {
        for (let s of content.querySelectorAll("sentence")) {
            if (this.userPreferences.removeOriginal.value && s.className === "original") {
                s.remove();
            } else if (this.userPreferences.removeTranslated.value && s.className === "translated") {
                s.remove();
            } else {
                let p = s.ownerDocument.createElement("p");
                p.innerText = s.innerText;
                s.replaceWith(p);
            }
        } 
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.jumbotron.novel");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description")];
    }

    static findVolumesList(dom) {
        let startString = "lnmtl.volumes = ";
        let scriptElement = util.getElement(dom, "script", e => 0 <= e.textContent.indexOf(startString));
        if (scriptElement !== null) {
            return util.locateAndExtractJson(scriptElement.textContent, startString);
        }
        return []; 
    }

    static async fetchChapterLists(volumesList, fetchJson) {
        return await Promise.all(
            volumesList.map(volume => LnmtlParser.fetchChapterListsForVolume(volume, fetchJson))
        );
    }

    static async fetchChapterListsForVolume(volumeInfo, fetchJson) {
        let restUrl = LnmtlParser.makeChapterListUrl(volumeInfo.id, 1);
        let handler = await fetchJson(restUrl);
        let firstPage = handler.json;
        let pagesForVolume = [handler];
        for ( let i = 2; i <= firstPage.last_page; ++i) {
            let url = LnmtlParser.makeChapterListUrl(volumeInfo.id, i);
            pagesForVolume.push(await fetchJson(url));
        }
        return pagesForVolume;
    }

    static makeChapterListUrl(volumeId, page) {
        return `http://lnmtl.com/chapter?page=${page}&volumeId=${volumeId}`;
    }

    static mergeChapterLists(lists) {
        let chapters = [];
        for (let list of lists) {
            for (let page of list) {
                for (let chapter of page.json.data) {
                    chapters.push({
                        sourceUrl: chapter.site_url,
                        title: "#" + chapter.number + ": " + chapter.title,
                        newArc: null                    
                    });
                }
            }
        }
        return chapters;
    }
}
