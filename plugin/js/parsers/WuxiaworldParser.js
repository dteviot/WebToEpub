/*
  Parses www.wuxiaworld.com
*/
"use strict";

parserFactory.register("wuxiaworld.com", () => new WuxiaworldParser());

class WuxiaworldParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [];
        let chaptersElement = dom.querySelector("div.content div.panel-group");
        if (chaptersElement != null) {
            chapters = util.hyperlinksToChapterList(chaptersElement, 
                WuxiaworldParser.isChapterHref, WuxiaworldParser.getChapterArc);
            WuxiaworldParser.removeArcsWhenOnlyOne(chapters);
        }
        if (0 === chapters.length) {
            chapters = [...dom.querySelectorAll("li.chapter-item a")]
                .map(link => util.hyperLinkToChapter(link));
        }
        if (0 === chapters.length) {
            let novelUrlMatch = dom.baseURI.match(/wuxiaworld\.com\/novel\/([^/?#]+)/);
            if (novelUrlMatch) {
                let novelSlug = novelUrlMatch[1];
                let searchArea = dom.querySelector("#full-width-tabpanel-1") || dom.body;
                let links = [...searchArea.querySelectorAll("a")].filter(a => {
                    let href = a.getAttribute("href");
                    let isChapter = href && href.startsWith(`/novel/${novelSlug}/`) && href.length > `/novel/${novelSlug}/`.length;
                    
                    if (isChapter) {
                        let statusDiv = a.querySelector("div[role='status']");
                        if (!statusDiv) {
                            return false; // Not in the chapter list (e.g., hero section buttons)
                        }
                        if (statusDiv.innerHTML.trim() !== "") {
                            return false; // Filter locked/wait chapters
                        }
                        return true;
                    }
                    return false;
                });

                let seen = new Set();
                chapters = links.filter(a => {
                    let href = a.href;
                    if (seen.has(href)) return false;
                    seen.add(href);
                    return true;
                }).map(a => {
                    let titleSpan = a.querySelector(".font-set-sb16 span, .line-clamp-1 span");
                    return {
                        sourceUrl: a.href,
                        title: titleSpan ? titleSpan.textContent.trim() : a.textContent.trim()
                    };
                });
                
                chapters.reverse();
            }
        }
        return Promise.resolve(chapters);  
    }

    static isChapterHref(link) {
        let parent = link.parentNode;
        return (parent.tagName.toLowerCase() === "li")
            && (parent.className === "chapter-item");
    }

    static getChapterArc(link) {
        let isPanel = function(element) {
            return (element.tagName.toLowerCase() === "div")
                && (element.className === "panel panel-default");
        };
        
        let parent = link;
        do {
            parent = parent.parentNode;
            if (parent == null) {
                return null;
            }
        } while (!isPanel(parent));
        
        let arc = parent.querySelector("span.title a");
        return arc == null ? null : arc.textContent.trim();
    }

    static removeArcsWhenOnlyOne(chapters) {
        let arcCount = chapters.reduce((p, c) => p + (c.newArc != null), 0);
        if (arcCount < 2) {
            chapters.forEach(c => c.newArc = null);
        }
    }

    // find the node(s) holding the story content
    findContent(dom) {
        let candidates = [...dom.querySelectorAll("div.fr-view:not(.panel-body)")];
        let content = WuxiaworldParser.elementWithMostParagraphs(candidates);
        this.cleanContent(content);
        return content;
    }

    static elementWithMostParagraphs(elements) {
        if (elements.length === 0) {
            return null;
        }
        return elements.map(
            e => ({e: e, numParagraphs: [...e.querySelectorAll("p")].length})
        ).reduce(
            (a, c) => a.numParagraphs < c.numParagraphs ? c : a
        ).e;
    }

    cleanContent(content)
    {
        util.removeChildElementsMatchingSelector(content, "button, #spoiler_teaser");
        let toDelete = [...content.querySelectorAll("a")]
            .filter(a => a.textContent === "Teaser");
        util.removeElements(toDelete);
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.caption h4");
    }

    findCoverImageUrl(dom) {
        let oldCover = util.getFirstImgSrc(dom, "div.novel-index");
        if (oldCover) {
            return oldCover;
        }
        let newCover = dom.querySelector("img[src*='/covers/']");
        return newCover ? newCover.src : super.findCoverImageUrl(dom);
    }

    extractAuthor(dom) {
        // Use a more specific selector to avoid scanning all divs on the page
        let labels = [...dom.querySelectorAll("div.flex-row > div, div.text-gray-t3 > div")];
        let authorLabel = labels.find(div => div.textContent.trim() === "Author:");
        if (authorLabel && authorLabel.nextElementSibling) {
            return authorLabel.nextElementSibling.textContent.trim();
        }
        return super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.media-novel-index div.media-body")];
        let summary = [...dom.querySelectorAll("div.fr-view")];
        nodes.push(summary[1]);
        return nodes;
    }
}
