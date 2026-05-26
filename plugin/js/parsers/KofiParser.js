"use strict";

/*
  KofiParser.js
  Parser for Ko-fi posts and galleries
  v4.1 - Fast Discovery Edition
*/

console.log("[WebToEpub] KofiParser v4.1 Loaded (Fast Discovery)");

parserFactory.register("ko-fi.com", () => new KofiParser());
parserFactory.registerManualSelect("Ko-fi", () => new KofiParser());

class KofiParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    _collectLinks(root) {
        let results = [];
        if (!root || !root.querySelectorAll) return results;

        for (let a of root.querySelectorAll("a")) {
            let hrefRaw = a.getAttribute("href") || "";
            let text = a.textContent.trim() || a.getAttribute("title") || "";
            results.push({ hrefRaw, text });
        }

        for (let el of root.querySelectorAll("*")) {
            if (el.shadowRoot) {
                results.push(...this._collectLinks(el.shadowRoot));
            }
        }

        for (let tmpl of root.querySelectorAll("template[shadowrootmode]")) {
            if (tmpl.content) {
                results.push(...this._collectLinks(tmpl.content));
            }
        }

        return results;
    }

    async getChapterUrls(dom) {
        console.log("[WebToEpub] getChapterUrls: Starting Discovery Process...");
        let baseUrl = this.state.chapterListUrl || dom.baseURI;
        if (typeof HttpClient !== "undefined" && HttpClient.unproxyUrl) {
            baseUrl = HttpClient.unproxyUrl(baseUrl);
        }

        let chapters = [];
        let seen = new Set();
        let normalizedBase = util.normalizeUrlForCompare(baseUrl);
        seen.add(normalizedBase);
        
        // Always add current page
        chapters.push({ sourceUrl: baseUrl, title: this.extractTitle(dom) });

        // Phase 1: Rapid Local Extraction
        try {
            console.log("[WebToEpub] Phase 1: Local DOM Sweep...");
            let allLinks = this._collectLinks(dom);
            for (let { hrefRaw, text } of allLinks) {
                this._processLink(hrefRaw, text, baseUrl, chapters, seen);
            }
        } catch (e) {
            console.error("[WebToEpub] Local Extraction Error:", e);
        }

        // Phase 2: Recursive Crawler (Matches user script logic)
        // Note: This happens in the background of the analysis call
        try {
            console.log("[WebToEpub] Phase 2: Recursive History Crawl (This may take a moment)...");
            await this._recursiveCrawl(dom, baseUrl, chapters, seen);
        } catch (e) {
            console.error("[WebToEpub] Crawler Error:", e);
        }

        console.log(`[WebToEpub] Discovery Complete. Found ${chapters.length} chapters.`);
        return chapters;
    }

    _processLink(hrefRaw, text, baseUrl, chapters, seen) {
        if (!hrefRaw || hrefRaw.startsWith("#") || hrefRaw.startsWith("javascript:")) return;
        try {
            let url = new URL(hrefRaw, baseUrl);
            let normalized = util.normalizeUrlForCompare(url.href);
            if (seen.has(normalized)) return;

            let pathname = url.pathname.toLowerCase();
            let hostname = url.hostname.toLowerCase();

            if (pathname.includes("/post/") || pathname.includes("/gallery/") || 
                hostname.includes("ouo.io") || hostname.includes("bit.ly") || hostname.includes("tinyurl.com")) {
                
                seen.add(normalized);
                // Exclude generic navigation unless explicitly labeled
                if (text.length < 2 || /^(more|support|share|gallery|donate|home|close|settings)$/i.test(text)) {
                    if (!/chapter|prev|next|older/i.test(text)) return;
                }
                
                chapters.push({ sourceUrl: url.href, title: text || url.href });
            }
        } catch (e) { /* ignore */ }
    }

    async _recursiveCrawl(dom, baseUrl, chapters, seen) {
        let currentDom = dom;
        let currentUrl = baseUrl;
        let depth = 0;
        const MAX_DEPTH = 50; // Follow up to 50 links deep

        while (depth < MAX_DEPTH) {
            depth++;
            let nextUrl = this._findFirstOtherPost(currentDom, currentUrl);
            if (!nextUrl) break;
            
            let normalized = util.normalizeUrlForCompare(nextUrl);
            if (seen.has(normalized)) break;

            console.log(`[WebToEpub] Crawling Chain Step ${depth}: ${nextUrl}`);
            try {
                // Using a slightly longer timeout for the proxy fetches
                let nextDom = await HttpClient.fetchHtml(nextUrl);
                if (!nextDom) {
                    console.log("[WebToEpub] Empty response from proxy. Ending crawl.");
                    break;
                }
                
                seen.add(normalized);
                chapters.push({
                    sourceUrl: nextUrl,
                    title: this.extractTitle(nextDom)
                });

                // On each new page, grab any links found in that page's DOM
                let subLinks = this._collectLinks(nextDom);
                for (let { hrefRaw, text } of subLinks) {
                    this._processLink(hrefRaw, text, nextUrl, chapters, seen);
                }

                currentDom = nextDom;
                currentUrl = nextUrl;
            } catch (e) {
                console.error(`[WebToEpub] Step ${depth} Failed:`, e.message);
                break;
            }
        }
    }

    _findFirstOtherPost(dom, currentUrl) {
        let currentSlug = currentUrl.split("/").pop();
        let links = this._collectLinks(dom);
        
        // Priority 1: Navigation Buttons
        for (let { hrefRaw, text } of links) {
            if (hrefRaw.includes("/post/") && !hrefRaw.includes(currentSlug)) {
                if (/prev|older|previous/i.test(text)) {
                    return new URL(hrefRaw, currentUrl).href;
                }
            }
        }
        
        // Priority 2: Any other post link found on the page (matches bash head -1)
        for (let { hrefRaw } of links) {
            if (hrefRaw.includes("/post/") && !hrefRaw.includes(currentSlug)) {
                return new URL(hrefRaw, currentUrl).href;
            }
        }
        
        return null;
    }

    findContent(dom) {
        let fromScripts = this._scanScriptsForContent(dom);
        if (fromScripts) return fromScripts;

        let articleHost = dom.querySelector(".article-host");
        if (articleHost) {
            if (articleHost.shadowRoot) return articleHost.shadowRoot.querySelector(".fr-view, .article-body") || articleHost.shadowRoot;
            let tmpl = articleHost.querySelector("template[shadowrootmode]");
            if (tmpl && tmpl.content) return tmpl.content.querySelector(".fr-view, .article-body") || tmpl.content;
        }

        return dom.querySelector(".article-body, #post-container, .post-content-container, .post-body, .p-post-content, article") || dom.body;
    }

    _scanScriptsForContent(dom) {
        for (let script of dom.querySelectorAll("script")) {
            const text = script.textContent;
            if (text.includes("article-body") || text.includes("shadowDom.innerHTML")) {
                const match = text.match(/innerHTML\s*\+?=\s*['"](.*?)['"];/s) || text.match(/['"](<div class=".*?article-body.*?">.*?)['"];/s);
                if (match) {
                    let html = match[1].replace(/\\(['"/])/g, '$1').replace(/\\n/g, '\n').replace(/\\r/g, '');
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
                    const content = doc.querySelector(".article-body") || doc.body.firstChild;
                    if (content && content.textContent.trim().length > 50) return content;
                }
            }
        }
        return null;
    }

    extractTitleImpl(dom) {
        if (dom.title === "403 Forbidden" || dom.title === "Just a moment...") return "Blocked by Cloudflare (Use Active Tab)";
        let titleElement = dom.querySelector(".article-title h1, h1, .post-title, .breakall, title");
        return titleElement ? titleElement.textContent.trim() : super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".nav-profile-title, .post-name-row a, a[href*='/home/profile'] span, .author-name");
        return authorLabel ? authorLabel.textContent.trim() : "Ko-fi Author";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".article-image, .post-main-image, #post-container img, a.label-hires");
    }

    isCustomError(ret) {
        if (!ret || !ret.title) return false;
        return ret.title === "403 Forbidden" || ret.title === "Just a moment..." || (ret.querySelector && ret.querySelector("#challenge-running") !== null);
    }

    setCustomErrorResponse(url, wrapOptions, ret) {
        let hostname = new URL(url).hostname;
        let errorMessage = `Blocked by Cloudflare on ${hostname}. Solve the captcha in the proxy tab then try again.`;
        return { url, wrapOptions, response: ret, errorMessage };
    }
}