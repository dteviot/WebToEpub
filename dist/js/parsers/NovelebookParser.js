"use strict";

parserFactory.register("novelebook.com", () => new NovelebookParser());

class NovelebookParser extends Parser {
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
        let urls = [];
        let pageNumberInput = dom.querySelector(".pagination-wg .page-number");
        let maxPage = 0;
        if (pageNumberInput) {
            maxPage = parseInt(pageNumberInput.getAttribute("data-max") || "0");
        }

        if (maxPage === 0) {
            // Fallback to searching all links
            let links = [...dom.querySelectorAll(".pagination-wg .pagination li a")];
            for (let link of links) {
                try {
                    let url = new URL(link.href, dom.baseURI);
                    let page = parseInt(url.searchParams.get("page") || "0");
                    if (page > maxPage) maxPage = page;
                } catch (e) { }
            }
        }

        if (maxPage > 0) {
            let baseUrl = dom.baseURI.split("?")[0];
            for (let i = 1; i <= maxPage; ++i) {
                urls.push(`${baseUrl}?page=${i}`);
            }
        }
        return urls;
    }

    extractPartialChapterList(dom) {
        let links = [...dom.querySelectorAll(".chapters-table a[ord]")];
        // Sort by the 'ord' attribute to fix columnar layout
        links.sort((a, b) => {
            let ordA = parseInt(a.getAttribute("ord") || "0");
            let ordB = parseInt(b.getAttribute("ord") || "0");
            return ordA - ordB;
        });
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        let content = dom.querySelector(".readerbody-wg");
        if (content) {
            this.deobfuscateContent(content, dom);
        }
        return content;
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.chapter-title")?.textContent || super.findChapterTitle(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.book-title") || super.extractTitleImpl(dom);
    }

    deobfuscateContent(container, dom) {
        // Parse the style block to find pseudo-element mappings
        // The style block usually contains rules like:
        // p.bikwyyxv::before{content:attr(imgazobf)}
        // p.bikwyyxv::after{content:attr(fzaaelim)}
        let styleBlocks = [...dom.querySelectorAll("style")];
        let beforeMap = new Map(); // class -> attrName
        let afterMap = new Map();  // class -> attrName

        let beforeRegex = /p\.(\w+)::before\s*\{\s*content\s*:\s*attr\s*\(\s*(\w+)\s*\)\s*\}/g;
        let afterRegex = /p\.(\w+)::after\s*\{\s*content\s*:\s*attr\s*\(\s*(\w+)\s*\)\s*\}/g;

        for (let style of styleBlocks) {
            let text = style.textContent;
            let match;
            while ((match = beforeRegex.exec(text)) !== null) {
                beforeMap.set(match[1], match[2]);
            }
            while ((match = afterRegex.exec(text)) !== null) {
                afterMap.set(match[1], match[2]);
            }
        }

        // Apply de-obfuscation to each <p> tag
        let paragraphs = [...container.querySelectorAll("p")];
        for (let p of paragraphs) {
            // Some paragraphs might have multiple classes
            let classes = p.className.split(/\s+/);
            let beforeText = "";
            let afterText = "";

            for (let cls of classes) {
                let beforeAttr = beforeMap.get(cls);
                let afterAttr = afterMap.get(cls);
                if (beforeAttr) {
                    beforeText += (p.getAttribute(beforeAttr) || "");
                }
                if (afterAttr) {
                    afterText = (p.getAttribute(afterAttr) || "") + afterText;
                }
            }

            if (beforeText || afterText) {
                p.textContent = beforeText + p.textContent + afterText;
            }
        }
    }
}
