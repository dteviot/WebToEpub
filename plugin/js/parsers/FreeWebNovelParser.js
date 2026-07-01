"use strict";

parserFactory.register("freewebnovel.com", () => new FreeWebNovelComParser());
parserFactory.register("bednovel.com", () => new FreeWebNovelParser());
parserFactory.register("innnovel.com", () => new FreeWebNovelParser());
parserFactory.register("libread.com", () => new FreeWebNovelParser());
parserFactory.register("novellive.com", () => new NovelliveParser());
parserFactory.register("novellive.app", () => new NovelliveParser());
parserFactory.register("novellive.net", () => new NovelliveParser());
parserFactory.register("readwn.org", () => new NovelliveParser());

class FreeWebNovelParser extends Parser {

    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let menu = dom.querySelector("ul#idData");
        let chapters = util.hyperlinksToChapterList(menu);

        let totalPage = 1;
        let indexSelect = dom.querySelector("#indexselect");
        if (indexSelect) {
            totalPage = indexSelect.querySelectorAll("option").length;
        } else {
            let scripts = [...dom.querySelectorAll("script")];
            for (let script of scripts) {
                let match = /totalPage:\s*(\d+)/.exec(script.textContent);
                if (match) {
                    totalPage = parseInt(match[1]);
                    break;
                }
            }
        }

        if (totalPage > 1) {
            chapterUrlsUI.showTocProgress(chapters);
            let baseUrl = dom.baseURI;
            let urlObj = new URL(baseUrl);
            urlObj.search = "";
            urlObj.hash = "";
            let baseNovelUrl = urlObj.toString();

            for (let page = 2; page <= totalPage; ++page) {
                await this.rateLimitDelay();
                let url = `${baseNovelUrl}?ajax=chapters&page=${page}`;
                try {
                    let response = await HttpClient.fetchJson(url);
                    if (response?.json?.code === 200 && response.json.html) {
                        let parser = new DOMParser();
                        let tempDom = parser.parseFromString(response.json.html, "text/html");
                        util.setBaseTag(url, tempDom);
                        let partialChapters = util.hyperlinksToChapterList(tempDom);
                        if (partialChapters.length > 0) {
                            chapterUrlsUI.showTocProgress(partialChapters);
                            chapters = chapters.concat(partialChapters);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch TOC page: " + page, e);
                }
            }
        }

        return chapters;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.tit");
    }

    extractAuthor(dom) {
        let element = dom.querySelector("[title=Author]");
        return element ? element.parentNode.querySelector("a").textContent.trim() : "";
    }

    extractSubject(dom) {
        let element = dom.querySelector("[title=Genre]");
        if (!element) {
            return "";
        }
        let tags = [...element.parentNode.querySelectorAll("a")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.pic");
    }

    findChapterTitle(dom) {
        return dom.querySelector("span.chapter");
    }

    findContent(dom) {
        return dom.querySelector("div#article") || dom.querySelector("div.txt");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.inner")];
    }

    removeUnwantedElementsFromContentElement(content) {
        // Remove ads injected by third-party ad networks (such as SSP ads and PubFuture networks)
        // whose div IDs start with 'bg-ssp-' or 'pf-'
        util.removeChildElementsMatchingSelector(content, "div[id^='bg-ssp-'], div[id^='pf-']");

        // Clean up any remaining ad divs or empty wrapper divs left behind after ads are deleted
        for (let div of content.querySelectorAll("div")) {
            if (div.id.startsWith("bg-ssp-") || div.id.startsWith("pf-")) {
                div.remove();
            }
            // Remove parent wrapper divs if they are now completely empty
            if (div.children.length === 0 && div.textContent.trim() === "") {
                div.remove();
            }
        }

        // Convert escaped/literal HTML tags (like &lt;strong&gt; or &lt;b&gt;) in text nodes to actual DOM elements
        let walker = content.ownerDocument.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        let nodesToReplace = [];
        let node;
        while ((node = walker.nextNode())) {
            let val = node.nodeValue;
            if (val && /(<strong|<b|<i|<em|<span|<br)/i.test(val)) {
                nodesToReplace.push(node);
            }
        }
        for (let tNode of nodesToReplace) {
            let parent = tNode.parentNode;
            if (parent) {
                let doc = util.sanitize(tNode.nodeValue);
                let body = doc.body;
                while (body.firstChild) {
                    parent.insertBefore(body.firstChild, tNode);
                }
                tNode.remove();
            }
        }

        // Clean embedded obfuscated/standard watermarks inside text nodes (e.g. freewebnovel.com, reewebnovel.com)
        // Re-walk to ensure we also clean watermarks in any newly parsed text nodes
        walker = content.ownerDocument.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        while ((node = walker.nextNode())) {
            let val = node.nodeValue;
            if (val) {
                // Normalize using NFKD to convert mathematical/stylized characters to standard ASCII
                let normalized = val.normalize("NFKD");
                if (/reewebnovel/i.test(normalized)) {
                    node.nodeValue = normalized.replace(/f?reewebnovel(?:\s*\.\s*com|\s+com)?/gi, "");
                }
            }
        }

        super.removeUnwantedElementsFromContentElement(content);
    }
}

class NovelliveParser extends FreeWebNovelParser {

    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        return this.getChapterUrlsFromMultipleTocPages(dom,
            this.extractPartialChapterList,
            this.getUrlsOfTocPages,
            chapterUrlsUI
        );
    }

    getUrlsOfTocPages(dom) {
        // lastUrl should be example https://novellive.com/book/<some-novel-name>/<index>
        let lastUrl = [...dom.querySelectorAll(".page a.index-container-btn")]?.pop()?.href;
        let urls = [];
        if (lastUrl) {
            let lastTocIndex = lastUrl.lastIndexOf("/");
            let lastIndexPageName = lastUrl.substring(lastTocIndex + 1);
            let lastIndex = parseInt(lastIndexPageName);
            let tocHasMultiplePages = !isNaN(lastIndex);
            if (tocHasMultiplePages) {
                let baseUrl = lastUrl.substring(0, lastTocIndex + 1);
                for (let i = 2; i <= lastIndex; ++i) {
                    urls.push(baseUrl + i);
                }
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelector(".m-newest2").querySelectorAll("ul li a")]
            .map(a => util.hyperLinkToChapter(a));
    }
}

class FreeWebNovelComParser extends FreeWebNovelParser {
    constructor() {
        super();
    }
    removeUnwantedElementsFromContentElement(content) {
        // Remove 'sub' elements inside paragraphs (which are sometimes used to hide watermarks or corrupt text)
        util.removeChildElementsMatchingSelector(content, "p sub");

        // Remove anti-scraping watermark paragraphs warning users to support the author on the original site
        for (let p of content.querySelectorAll("p")) {
            let text = p.textContent.toLowerCase();
            if (text.includes("this story originates from") || text.includes("ensure the author gets the support")) {
                p.remove();
            }
        }

        super.removeUnwantedElementsFromContentElement(content);
    }
}