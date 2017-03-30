/*
  Parses gravitytales.com
*/
"use strict";

parserFactory.register("gravitytales.com", function() { return new GravityTalesParser() });

class GravityTalesParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let that = this;
        let novelId = GravityTalesParser.getNovelId(dom);
        if (novelId !== null) {
            return GravityTalesParser.fetchUrlsOfChapters(novelId, dom.baseURI, HttpClient.fetchJson); 
        }
        let content = that.findContent(dom);
        if (content === null) {
            content = util.getElement(dom, "chapters");
        }
        if (content === null) {
            content = dom.body;
        }
        let chapters = util.hyperlinksToChapterList(content, that.isChapterHref);
        return Promise.resolve(chapters);
    }

    isChapterHref(link) {
        return (link.hostname === "gravitytales.com") &&
            (link.search === "");
    }

    extractTitle(dom) {
        let title = util.getElement(dom, "meta", e => (e.getAttribute("property") === "og:title"));
        if (title !== null) {
            return title.getAttribute("content");
        }
        title = util.getElement(dom, "h3");
        if (title !== null) {
            return title.innerText;
        }
        return super.extractTitle(dom);
    }

    // find the node(s) holding the story content
    findContent(dom) {
        return util.getElement(dom, "div", e => e.className.startsWith("entry-content"));
    }

    findChapterTitle(dom) {
        let title = util.getElement(dom, "h1", e => (e.className === "entry-title"));
        return (title === null) ? util.getElement(dom, "h3") : title;
    }

    findParentNodeOfChapterLinkToRemoveAt(link) {
        // "previous" chapter may be immediate child of <p> tag to remove
        // "next" chapter has a <strong> tag wrapping it, then the maybe a <p> tag
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");
    }

    populateUI(dom) {
        super.populateUI(dom);
        CoverImageUI.showCoverImageUrlInput(true);
    }

    static getNovelId(dom) {
        let contentElement = util.getElement(dom.body, "div", e => e.id === "contentElement");
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
        return fetchJson(chapterGroupsUrl).then(function (handler) {
            return Promise.all(
                handler.json.map(group => GravityTalesParser.fetchChapterListForGroup(novelId, group, fetchJson))
            );
        }).then(function (chapterLists) {
            return GravityTalesParser.mergeChapterLists(chapterLists, baseUri);
        });
    } 

    static fetchChapterListForGroup(novelId, chapterGroup, fetchJson) {
        let groupId = chapterGroup.ChapterGroupId;
        let chaptersUrl = `https://gravitytales.com/api/novels/chaptergroup/${groupId}`;
        return fetchJson(chaptersUrl).then(function (handler) {
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
            for(let c of chapterList.chapters) {
                let url = util.normalizeUrl(baseUri + "/" + c.Slug);
                if (!uniqueChapters.has(url)) {
                    uniqueChapters.add(url);
                    chapters.push(GravityTalesParser.makeChapter(url, c.Name, groupTitle));
                    // only first chapter in each group gets the arc name
                    if (groupTitle != null) {
                        groupTitle = null; 
                    };
                };
            };
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
        for(let e of util.getElements(dom, "script")) {
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
}
