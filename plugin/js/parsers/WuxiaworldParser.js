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
                let searchArea = dom.body;
                let links = [...searchArea.querySelectorAll("a")].filter(a => {
                    let href = a.getAttribute("href");
                    let isChapter = href && href.startsWith(`/novel/${novelSlug}/`) && href.length > `/novel/${novelSlug}/`.length;
                    
                    if (isChapter && a.classList.contains("group")) {
                        let statusDiv = a.querySelector("div[role='status']");
                        if (statusDiv && statusDiv.innerHTML.trim() !== "") {
                            // If the status div has an SVG, check if it's a lock/wait icon.
                            // If it's just a bookmark icon, we shouldn't filter it out.
                            // Wuxiaworld wait icons usually have a clock, locked chapters have a lock.
                            if (statusDiv.innerHTML.includes("svg") && !statusDiv.innerHTML.includes("bookmark")) {
                                return false; // Filter locked/wait chapters
                            }
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

    extractTitleImpl(dom) {
        // Modern Wuxiaworld novel pages contain many h4 headings ("Details",
        // "Reviews", etc.).  The old selector `span[data-testid='title'], h4`
        // could grab the "Details" h4 and make every EPUB filename "Details".
        // Prefer the explicit series name first, then the main novel h1.
        let seriesName = WuxiaworldParser.getSeriesNameFromDjac(dom);
        if (seriesName) {
            return seriesName;
        }

        let novel = WuxiaworldParser.getNovelFromReactState(dom);
        if (novel && novel.name) {
            return novel.name.trim();
        }

        let h1 = [...dom.querySelectorAll("main h1, h1")]
            .find(e => {
                let text = e.textContent.trim();
                return text !== "" && text !== "Related Novels";
            });
        if (h1) {
            return h1.textContent.trim();
        }

        let chapterTitle = dom.querySelector("span[data-testid='title']");
        if (chapterTitle && chapterTitle.textContent.trim() !== "") {
            return chapterTitle.textContent.trim();
        }

        let badHeadings = new Set(["Details", "Reviews", "Translator's Notice", "Related Novels", "Chapters", "About"]);
        let h4 = [...dom.querySelectorAll("h4")]
            .find(e => {
                let text = e.textContent.trim();
                return text !== "" && !badHeadings.has(text);
            });
        return h4 ? h4.textContent.trim() : super.extractTitleImpl(dom);
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
        if (!content) {
            // Tab-scraped pages use div.chapter-content > div.fr-view
            let chapterContent = dom.querySelector("div.chapter-content div.fr-view");
            if (chapterContent) {
                content = chapterContent;
            }
        }
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
        if (content == null) {
            return;
        }
        util.removeChildElementsMatchingSelector(content, "button, #spoiler_teaser, span[aria-hidden='true']");
        let toDelete = [...content.querySelectorAll("a")]
            .filter(a => a.textContent === "Teaser");
        util.removeElements(toDelete);
    }

    findChapterTitle(dom) {
        let titleNode = dom.querySelector("h4[data-testid='heading'] span[data-testid='title'], h4[data-testid='heading']");
        if (titleNode && titleNode.textContent.trim() !== "") {
            return titleNode;
        }
        
        // Fallback to extracting from the page <title> tag (React SSR returns empty skeletons for headings)
        let docTitle = dom.querySelector("title");
        if (docTitle && docTitle.textContent.includes(" - ")) {
            let parts = docTitle.textContent.split(" - ");
            let chapterTitle = parts.slice(1).join(" - ").trim();
            if (chapterTitle) {
                let h1 = dom.createElement("h1");
                h1.textContent = chapterTitle;
                return h1;
            }
        }
        
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

        let stateNovel = WuxiaworldParser.getNovelFromReactState(dom);
        if (stateNovel && stateNovel.authorName && stateNovel.authorName.value) {
            return stateNovel.authorName.value.trim();
        }
        return super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("div.media-novel-index div.media-body")];
        let summary = [...dom.querySelectorAll("div.fr-view")];
        if (summary.length > 1) {
            nodes.push(summary[1]);
        } else if (summary.length > 0) {
            nodes.push(summary[0]);
        }
        return nodes;
    }

    // ── Helper methods for React state and JSON-LD parsing ──

    static parseAssignedJson(text, variableName) {
        let varIndex = text.indexOf(variableName);
        if (varIndex < 0) {
            return null;
        }

        let start = text.indexOf("{", varIndex);
        if (start < 0) {
            return null;
        }

        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let i = start; i < text.length; ++i) {
            let ch = text[i];
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (ch === "\\") {
                    escaped = true;
                } else if (ch === "\"") {
                    inString = false;
                }
                continue;
            }

            if (ch === "\"") {
                inString = true;
            } else if (ch === "{") {
                ++depth;
            } else if (ch === "}") {
                --depth;
                if (depth === 0) {
                    return JSON.parse(text.substring(start, i + 1));
                }
            }
        }

        return null;
    }

    static getReactQueryState(dom) {
        let scripts = [...dom.querySelectorAll("script")]
            .filter(s => s.textContent && s.textContent.includes("__REACT_QUERY_STATE__"));

        for (let script of scripts) {
            try {
                let state = WuxiaworldParser.parseAssignedJson(script.textContent, "__REACT_QUERY_STATE__");
                if (state) {
                    return state;
                }
            } catch (e) {
                console.error("Wuxiaworld React state parse error: " + e.message);
            }
        }
        return null;
    }

    static getSeriesNameFromDjac(dom) {
        let nodes = [...dom.querySelectorAll("[data-djac-params]")];
        for (let node of nodes) {
            try {
                let params = JSON.parse(node.getAttribute("data-djac-params"));
                if (params && params.series_name) {
                    return params.series_name.trim();
                }
            } catch (e) {
                // Ignore malformed analytics payloads.
            }
        }
        return null;
    }

    static getNovelFromReactState(dom) {
        let state = WuxiaworldParser.getReactQueryState(dom);
        for (let query of (state && state.queries) || []) {
            let data = query.state && query.state.data;
            let item = data && data.item;
            if (item && item.name && item.slug && item.chapterInfo) {
                return item;
            }
            if (item && item.name && item.chapterInfo) {
                return item;
            }
        }
        return null;
    }

    static getArticleAccessFromJsonLd(dom) {
        let scripts = [...dom.querySelectorAll("script[type='application/ld+json']")];

        let asBool = function(value) {
            if (value === true || value === "true") {
                return true;
            }
            if (value === false || value === "false") {
                return false;
            }
            return null;
        };

        let flatten = function(value) {
            if (value == null) {
                return [];
            }
            if (Array.isArray(value)) {
                return value.flatMap(flatten);
            }
            if (typeof value === "object") {
                let items = [value];
                if (value["@graph"]) {
                    items = items.concat(flatten(value["@graph"]));
                }
                return items;
            }
            return [];
        };

        let sawTrue = false;
        let sawFalse = false;
        for (let script of scripts) {
            try {
                let items = flatten(JSON.parse(script.textContent.trim()));
                for (let item of items) {
                    let type = item["@type"];
                    let isArticle = type === "Article" || (Array.isArray(type) && type.includes("Article"));
                    if (!isArticle) {
                        continue;
                    }

                    let itemFree = asBool(item.isAccessibleForFree);
                    let partFree = null;
                    let parts = flatten(item.hasPart);
                    for (let part of parts) {
                        let value = asBool(part.isAccessibleForFree);
                        if (value != null) {
                            partFree = value;
                            break;
                        }
                    }

                    if (itemFree === true || partFree === true) {
                        sawTrue = true;
                    }
                    if (itemFree === false || partFree === false) {
                        sawFalse = true;
                    }
                }
            } catch (e) {
                // Ignore non-JSON or malformed JSON-LD blocks.
            }
        }
        if (sawTrue) {
            return true;
        }
        if (sawFalse) {
            return false;
        }
        return null;
    }

    static hasTeaserMarkers(dom) {
        if (dom.querySelector("#spoiler_teaser")) {
            return true;
        }

        // The teaser view/link can appear as a text link or button.  Keep this
        // narrow so ordinary prose containing the word "teaser" does not count.
        let teaserLinks = [...dom.querySelectorAll("a, button")]
            .some(e => e.textContent && e.textContent.trim() === "Teaser");
        if (teaserLinks) {
            return true;
        }

        return WuxiaworldParser.getArticleAccessFromJsonLd(dom) === false;
    }

    // ── Tab-scraping helpers for unlocked chapter fetching ──

    /*
      Wait for the real/full Wuxiaworld chapter, not merely for any chapter
      paragraph.  The teaser and the real page can both contain
      div.chapter-content/div.fr-view/p, so the old selector-only wait can stop
      too early.  The full hydrated chapter is marked by Wuxiaworld's Article
      JSON-LD changing to isAccessibleForFree:true, while the teaser/locked
      version has isAccessibleForFree:false.  We require that full-page marker
      plus actual chapter paragraphs before closing the tab and scraping HTML.
    */
    static async waitForFullChapter(tabId, {
        minParagraphs = 1,
        timeout = 60000,
        pollInterval = 250
    } = {}) {
        try {
            let results = await chrome.scripting.executeScript({
                target: {tabId: tabId},
                func: (min, to, interval) => {
                    return new Promise(resolve => {
                        const asBool = (value) => {
                            if (value === true || value === "true") return true;
                            if (value === false || value === "false") return false;
                            return null;
                        };

                        const flatten = (value) => {
                            if (value == null) return [];
                            if (Array.isArray(value)) return value.flatMap(flatten);
                            if (typeof value === "object") {
                                let items = [value];
                                if (value["@graph"]) {
                                    items = items.concat(flatten(value["@graph"]));
                                }
                                return items;
                            }
                            return [];
                        };

                        const getArticleAccessFromJsonLd = () => {
                            let scripts = [...document.querySelectorAll("script[type='application/ld+json']")];
                            let sawTrue = false;
                            let sawFalse = false;
                            for (let script of scripts) {
                                try {
                                    let items = flatten(JSON.parse(script.textContent.trim()));
                                    for (let item of items) {
                                        let type = item["@type"];
                                        let isArticle = type === "Article" || (Array.isArray(type) && type.includes("Article"));
                                        if (!isArticle) continue;

                                        let itemFree = asBool(item.isAccessibleForFree);
                                        let partFree = null;
                                        let parts = flatten(item.hasPart);
                                        for (let part of parts) {
                                            let value = asBool(part.isAccessibleForFree);
                                            if (value != null) {
                                                partFree = value;
                                                break;
                                            }
                                        }

                                        if (itemFree === true || partFree === true) sawTrue = true;
                                        if (itemFree === false || partFree === false) sawFalse = true;
                                    }
                                } catch (e) {
                                    // Ignore malformed JSON-LD while React is updating.
                                }
                            }
                            if (sawTrue) return true;
                            if (sawFalse) return false;
                            return null;
                        };

                        const getReactIsTeaser = () => {
                            let state = window.__REACT_QUERY_STATE__;
                            if (state && Array.isArray(state.queries)) {
                                for (let query of state.queries) {
                                    if (query.queryKey && query.queryKey[0] === "chapter") {
                                        let item = query.state && query.state.data && query.state.data.item;
                                        if (item && typeof item.isTeaser === "boolean") {
                                            return item.isTeaser;
                                        }
                                    }
                                }
                            }
                            return null;
                        };

                        const getStatus = () => {
                            let content = document.querySelector("div.chapter-content div.fr-view");
                            let paragraphCount = content ? content.querySelectorAll("p").length : 0;
                            let uidParagraphCount = content ? content.querySelectorAll("p[data-uid]").length : 0;
                            let articleAccess = getArticleAccessFromJsonLd();
                            let reactIsTeaser = getReactIsTeaser();
                            let spoilerTeaser = !!document.querySelector("#spoiler_teaser");
                            let teaserLink = [...document.querySelectorAll("a, button")]
                                .some(e => e.textContent && e.textContent.trim() === "Teaser");

                            let hasEnoughText = !!content && paragraphCount >= min;
                            let fullAccessMarker = articleAccess === true;
                            let teaserMarker = articleAccess === false || reactIsTeaser === true || spoilerTeaser || teaserLink;
                            let ready = hasEnoughText && fullAccessMarker && !teaserMarker;

                            return {
                                ready: ready,
                                paragraphCount: paragraphCount,
                                uidParagraphCount: uidParagraphCount,
                                articleAccess: articleAccess,
                                reactIsTeaser: reactIsTeaser,
                                spoilerTeaser: spoilerTeaser,
                                teaserLink: teaserLink,
                                href: location.href,
                                title: document.title
                            };
                        };

                        let settled = false;
                        let observer = null;
                        let pollTimer = null;
                        let timeoutTimer = null;

                        const finish = (status) => {
                            if (settled) return;
                            settled = true;
                            if (observer) observer.disconnect();
                            if (pollTimer) clearInterval(pollTimer);
                            if (timeoutTimer) clearTimeout(timeoutTimer);
                            resolve(status);
                        };

                        const check = () => {
                            let status = getStatus();
                            if (status.ready) {
                                finish(status);
                            }
                            return status;
                        };

                        let lastStatus = check();
                        if (settled) return;

                        observer = new MutationObserver(() => {
                            lastStatus = check();
                        });
                        observer.observe(document.documentElement, {
                            childList: true,
                            subtree: true,
                            characterData: true
                        });

                        pollTimer = setInterval(() => {
                            lastStatus = check();
                        }, interval);

                        timeoutTimer = setTimeout(() => {
                            lastStatus = getStatus();
                            lastStatus.ready = false;
                            lastStatus.timedOut = true;
                            finish(lastStatus);
                        }, to);
                    });
                },
                args: [minParagraphs, timeout, pollInterval]
            });

            if (results && results.length > 0 && results[0].result) {
                return results[0].result;
            }
        } catch (e) {
            console.error("waitForFullChapter failed: " + e.message);
        }

        return {ready: false, error: "waitForFullChapter failed"};
    }

    static waitForTabLoad(tabId, timeout = 20000) {
        return new Promise(resolve => {
            let done = false;
            let timer = null;

            const finish = (value) => {
                if (done) return;
                done = true;
                if (timer) clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(listener);
                resolve(value);
            };

            const listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === "complete") {
                    finish(true);
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
            chrome.tabs.get(tabId, tab => {
                if (chrome.runtime.lastError || !tab) {
                    finish(false);
                } else if (tab.status === "complete") {
                    finish(true);
                }
            });

            timer = setTimeout(() => finish(false), timeout);
        });
    }

    async fetchChapter(url) {
        // Fast background fetch first
        let dom = await super.fetchChapter(url);
        
        let needsTabScrape = false;
        
        // 1. Check if the server explicitly marked it as a teaser in the React state
        let state = WuxiaworldParser.getReactQueryState(dom);
        for (let query of (state && state.queries) || []) {
            if (query.queryKey && query.queryKey[0] === "chapter") {
                if (query.state && query.state.data && query.state.data.item) {
                    if (query.state.data.item.isTeaser) {
                        needsTabScrape = true;
                    }
                }
            }
        }

        // 2. New Wuxiaworld pages expose teaser/full state in Article JSON-LD.
        //    Teaser/locked pages have isAccessibleForFree:false; the hydrated
        //    full chapter has isAccessibleForFree:true.  If the background fetch
        //    sees the teaser marker, force a real-tab scrape.
        if (!needsTabScrape && WuxiaworldParser.hasTeaserMarkers(dom)) {
            needsTabScrape = true;
        }
        
        // 3. Check if the content div is completely missing from the SSR HTML
        if (!needsTabScrape && !this.findContent(dom)) {
            needsTabScrape = true;
        }
        
        if (needsTabScrape) {
            let tabId = null;
            try {
                tabId = await new Promise(resolve => {
                    chrome.tabs.create({url: url, active: false}, tab => resolve(tab.id));
                });

                await WuxiaworldParser.waitForTabLoad(tabId, 20000);

                // Do not stop at "some paragraph exists"; teasers can also have
                // chapter-content/fr-view paragraphs.  Wait for the full-only
                // Article JSON-LD marker (isAccessibleForFree:true) AND chapter
                // paragraphs before grabbing the tab HTML.
                let status = await WuxiaworldParser.waitForFullChapter(tabId, {
                    minParagraphs: 1,
                    timeout: 60000,
                    pollInterval: 250
                });

                if (!status.ready) {
                    throw new Error("Timed out waiting for full chapter content; refusing to scrape teaser. Last status: " + JSON.stringify(status));
                }

                // Extract the DOM from the tab only after the full chapter marker is present.
                let html = await new Promise((resolve, reject) => {
                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        func: () => document.documentElement.outerHTML
                    }, (results) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else if (results && results.length > 0) {
                            resolve(results[0].result);
                        } else {
                            reject(new Error("No HTML returned"));
                        }
                    });
                });
                
                if (html) {
                    let parser = new DOMParser();
                    dom = parser.parseFromString(html, "text/html");
                    util.setBaseTag(url, dom);
                }
            } catch (err) {
                console.error("Tab-scraping fallback failed for " + url + ": " + err.message);
                // Do not silently return the teaser DOM as if it were the full chapter.
                throw err;
            } finally {
                if (tabId != null) {
                    chrome.tabs.remove(tabId);
                }
            }
        }
        
        return dom;
    }
}
