/*
  Parser used when can't match a parser for the document
*/
"use strict";

parserFactory.registerManualSelect(
    "Default", 
    () => new DefaultParser()
);

class DefaultParser extends Parser {
    constructor() {
        super();
        this.siteConfigs = new DefaultParserSiteSettings();
        this.logic = null;
    }

    _getChaptersFromPage(dom, config, isFirstPage) {
        let testUrl = config ? config.testUrl : null;
        let allLinks = Array.from(dom.body.getElementsByTagName("a"));

        if (isFirstPage && util.isNullOrEmpty(testUrl)) {
            let getScore = (text) => {
                let s = 0;
                text = (text || "").trim().toLowerCase();
                if (/\b(chapter|ch|chap|vol|volume)\b/i.test(text)) s += 10;
                if (/\d+/.test(text)) s += 5;
                if (/\b(read|now|online|start|first|begin)\b/i.test(text)) s -= 10;
                return s;
            };

            for (let i = 0; i < allLinks.length; i++) {
                if (getScore(allLinks[i].innerText || allLinks[i].textContent) >= 10) {
                    let validBlock = false;
                    for (let j = 1; j <= 5 && (i + j) < allLinks.length; j++) {
                        if (getScore(allLinks[i + j].innerText || allLinks[i + j].textContent) >= 5) {
                            let pBase = (allLinks[i].href || "").replace(/\d+/g, '');
                            let cBase = (allLinks[i + j].href || "").replace(/\d+/g, '');
                            if (pBase === cBase && pBase.length > 10) {
                                validBlock = true;
                                break;
                            }
                        }
                    }
                    if (validBlock) {
                        testUrl = allLinks[i].href;
                        if (config) config.testUrl = testUrl;
                        break;
                    }
                }
            }
        }

        if (util.isNullOrEmpty(testUrl)) {
            return util.hyperlinksToChapterList(dom.body);
        }

        let host = "";
        let prefixPath = "";
        try {
            let parsedTestUrl = new URL(testUrl);
            host = parsedTestUrl.hostname;
            let pathParts = parsedTestUrl.pathname.split("/").filter(p => p !== "");
            if (pathParts.length >= 2) {
                prefixPath = "/" + pathParts.slice(0, 2).join("/");
            }
        } catch (e) {
            // fallback
        }

        let firstChapterLinkIndex = -1;
        if (isFirstPage) {
            let targetUrl = util.normalizeUrlForCompare(testUrl);
            let matchIndices = [];
            for (let i = 0; i < allLinks.length; i++) {
                if (util.normalizeUrlForCompare(allLinks[i].href) === targetUrl) {
                    matchIndices.push(i);
                }
            }

            if (matchIndices.length > 0) {
                let bestIndex = matchIndices[0];
                let bestScore = -999;
                for (let idx of matchIndices) {
                    let text = allLinks[idx].innerText || allLinks[idx].textContent || "";
                    text = text.trim().toLowerCase();
                    let score = 0;
                    if (/\b(chapter|ch|chap|vol|volume)\b/i.test(text)) score += 10;
                    if (/\d+/.test(text)) score += 5;
                    if (/\b(read|now|online|start|first|begin)\b/i.test(text)) score -= 10;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestIndex = idx;
                    } else if (score === bestScore) {
                        bestIndex = idx;
                    }
                }
                firstChapterLinkIndex = bestIndex;
            }
        }

        let filteredLinks = allLinks;
        if (isFirstPage && firstChapterLinkIndex >= 0) {
            filteredLinks = allLinks.slice(firstChapterLinkIndex);
        }

        let finalLinks = filteredLinks.filter(link => {
            try {
                let u = new URL(link.href, dom.baseURI);
                if (host && u.hostname !== host) return false;
                if (prefixPath && !u.pathname.startsWith(prefixPath)) return false;

                // Filter out links pointing back to TOC URL itself
                let normLink = util.normalizeUrlForCompare(link.href);
                let normToc = util.normalizeUrlForCompare(dom.baseURI);
                if (normLink === normToc) return false;

                return true;
            } catch (e) {
                return false;
            }
        });

        let tempDiv = dom.createElement("div");
        for (let link of finalLinks) {
            tempDiv.appendChild(link.cloneNode(true));
        }

        return util.hyperlinksToChapterList(tempDiv);
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let hostName = util.extractHostName(dom.baseURI);
        let config = this.siteConfigs.getConfigForSite(hostName) || {};
        let chapters = this._getChaptersFromPage(dom, config, true);
        let logic = this.siteConfigs.constructFindContentLogicForSite(hostName);

        if (!logic.findNextPageUrl) {
            return chapters;
        }

        let maxPages = 100; // Limit to 100 pages to avoid infinite loops
        let pageCount = 1;
        let currentUrl = dom.baseURI;
        let currentDom = dom;
        let pageUrlSets = [];

        while (currentDom != null && pageCount <= maxPages) {
            let pageChapters = this._getChaptersFromPage(currentDom, config, pageCount === 1);
            let pageUrls = new Set(pageChapters.map(c => c.sourceUrl));
            pageUrlSets.push(pageUrls);

            // Add chapters from current page (skip first page as it's already added)
            if (pageCount > 1) {
                chapters = chapters.concat(pageChapters);
            }

            if (chapterUrlsUI) {
                chapterUrlsUI.showTocProgress(chapters);
            }

            let nextUrl = logic.findNextPageUrl(currentDom, currentUrl);
            if (!nextUrl || nextUrl === currentUrl) {
                break;
            }

            await this.rateLimitDelay();
            currentUrl = nextUrl;
            try {
                let xhr = await HttpClient.wrapFetch(currentUrl);
                currentDom = xhr.responseXML;
                if (!currentDom) {
                    let html = xhr.responseText || "";
                    if (html) {
                        currentDom = new DOMParser().parseFromString(html, "text/html");
                    } else {
                        break;
                    }
                }
            } catch (e) {
                console.warn("[DefaultParser] Failed to fetch next TOC page:", e);
                break;
            }
            pageCount++;
        }

        // Filter out common links (appearing on >1 page)
        if (pageCount > 1) {
            let commonUrls = new Set();
            for (let url of chapters.map(c => c.sourceUrl)) {
                let appearanceCount = 0;
                for (let pageSet of pageUrlSets) {
                    if (pageSet.has(url)) appearanceCount++;
                }
                if (appearanceCount > 1) commonUrls.add(url);
            }
            chapters = chapters.filter(ch => !commonUrls.has(ch.sourceUrl));
        }

        return chapters;
    }

    findContent(dom) {
        let hostName = util.extractHostName(dom.baseURI);
        this.logic = this.siteConfigs.constructFindContentLogicForSite(hostName);
        return this.logic.findContent(dom); 
    }

    populateUI(dom) {
        super.populateUI(dom);
        let hostname = util.extractHostName(dom.baseURI);
        DefaultParserUI.setupDefaultParserUI(hostname, this);
    }

    // override default (keep nearly everything, may be wanted)
    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("script[src], iframe"));
        util.removeComments(element);
        util.removeUnwantedWordpressElements(element);
        util.removeMicrosoftWordCrapElements(element);
        this.logic.removeUnwanted(element);
    }

    findChapterTitle(dom) {
        return this.logic.findChapterTitle(dom);
    }
}
