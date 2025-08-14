"use strict";

parserFactory.register("gravitytales.com", () => new GravityTalesParser());

class GravityTalesParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chaptersElement = dom.querySelector("ul.list");
        if (chaptersElement) {
            return util.hyperlinksToChapterList(chaptersElement);
        }

        // logic as @ 2018-06-10
        chaptersElement = dom.querySelector("div#chapters div.tab-content");
        let chapters = util.hyperlinksToChapterList(chaptersElement);
        if (0 < chapters.length) {
            return Promise.resolve(chapters);
        }

        // older logic
        let novelId = GravityTalesParser.getNovelId(dom);
        if (novelId !== null) {
            return GravityTalesParser.fetchUrlsOfChapters(novelId, dom.baseURI, HttpClient.fetchJson); 
        }
        let content = this.findContent(dom) ||
            dom.querySelector("chapters") ||
            dom.body;
        return util.hyperlinksToChapterList(content, this.isChapterHref);
    }

    isChapterHref(link) {
        return (link.hostname === "gravitytales.com") &&
            (link.search === "");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("meta[property='og:title']");
        if (title !== null) {
            return title.getAttribute("content");
        }
        return dom.querySelector("h3");
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return dom.querySelector("div.entry-content")
            || dom.querySelector("div.content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title") ||
            dom.querySelector("#single h1");
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "previous" chapter may be immediate child of <p> tag to remove
        // "next" chapter has a <strong> tag wrapping it, then the maybe a <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    static getNovelId(dom) {
        let contentElement = dom.querySelector("div#contentElement");
        let init = (contentElement === null) ? null : contentElement.getAttribute("ng-init");
        let valArray = [];
        if (!util.isNullOrEmpty(init)) {
            valArray = init.split(";")
                .map(s => GravityTalesParser.splitAtEquals(s))
                .filter(a => (a.length === 2) && a[0] === "novelId")
                .map(a => parseInt(a[1]));
        }
        if (valArray.length === 1) {
            return valArray[0];
        }
        return GravityTalesParser.searchForNovelIdinScriptTags(dom);
    }

    /**
     * Convert string like "novel = 7" into ["novel", "7"]
     */
    static splitAtEquals(param) {
        return param.split("=").map(s => s.trim());
    }

    static fetchUrlsOfChapters(novelId, baseUri, fetchJson) {
        let chapterGroupsUrl = `https://gravitytales.com/api/novels/chaptergroups/${novelId}`;
        return fetchJson(chapterGroupsUrl).then(function(handler) {
            return Promise.all(
                handler.json.map(group => GravityTalesParser.fetchChapterListForGroup(novelId, group, fetchJson))
            );
        }).then(function(chapterLists) {
            return GravityTalesParser.mergeChapterLists(chapterLists, baseUri);
        });
    } 

    static fetchChapterListForGroup(novelId, chapterGroup, fetchJson) {
        let groupId = chapterGroup.ChapterGroupId;
        let chaptersUrl = `https://gravitytales.com/api/novels/chaptergroup/${groupId}`;
        return fetchJson(chaptersUrl).then(function(handler) {
            return {
                groupTitle: chapterGroup.Title,
                chapters: handler.json
            };
        });
    }

    static mergeChapterLists(chapterLists, baseUri) {
        let uniqueChapters = new Set();
        return chapterLists.reduce(function(chapters, chapterList) {
            let groupTitle = chapterList.groupTitle;
            for (let c of chapterList.chapters) {
                let url = util.removeTrailingSlash(baseUri + "/" + c.Slug);
                if (!uniqueChapters.has(url)) {
                    uniqueChapters.add(url);
                    chapters.push(GravityTalesParser.makeChapter(url, c.Name, groupTitle));
                    // only first chapter in each group gets the arc name
                    if (groupTitle != null) {
                        groupTitle = null; 
                    }
                }
            }
            return chapters;
        }, []);
    }

    static makeChapter(sourceUrl, title, newArc) {
        return {
            sourceUrl: sourceUrl,
            title: title,
            newArc: newArc
        };
    }

    static searchForNovelIdinScriptTags(dom) {
        for (let e of dom.querySelectorAll("script")) {
            let novelId = GravityTalesParser.searchForNovelIdinString(e.innerText);
            if ( novelId !== null) {
                return novelId;
            }
        }
        return null;
    }

    static searchForNovelIdinString(s) {
        let searchFor = "novelId:";
        let startIndex = s.indexOf(searchFor);
        if (0 <= startIndex)
        {
            let novelId = s.substring(startIndex + searchFor.length);
            novelId = GravityTalesParser.removeStringAfterChar(novelId, ",");
            novelId = GravityTalesParser.removeStringAfterChar(novelId, "}").trim();
            return parseInt(novelId);
        }
        return null;
    }

    static removeStringAfterChar(s, c) {
        let endIndex = s.indexOf(c);
        return (0 <= endIndex) ? s.substring(0, endIndex) : s;
    }

    findCoverImageUrl(dom) {
        if (dom.querySelector("div.cover")) {
            return util.getFirstImgSrc(dom, "div.cover");            
        }

        let img = dom.querySelector("div#coverImg");
        if (img !== null) {
            let style = img.getAttribute("style");
            if (!util.isNullOrEmpty(style)) {
                let startIndex = style.indexOf("url(") + 4;
                let endIndex = style.indexOf(");", startIndex);
                if (startIndex < endIndex) {
                    return style.substring(startIndex, endIndex);
                }
            }
        }
        return null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.desc, p.description")];
    }
}
