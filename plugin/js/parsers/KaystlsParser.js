// Ai generated + Gemini 3.8 Flash
"use strict";

parserFactory.register("kaystls.site", () => new KaystlsParser());

class KaystlsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        let tocData = this.extractTocFromScript(dom);

        // If user opened extension on a chapter page, fetch series page for full metadata
        if (tocData?.isChapter && tocData?.seriesHref) {
            try {
                let seriesDom = (await HttpClient.fetchHtml(tocData.seriesHref)).responseXML;
                if (seriesDom) {
                    this.state.firstPageDom = seriesDom;
                    let seriesToc = this.extractTocFromScript(seriesDom);
                    if (seriesToc?.chapters?.length > 0) {
                        tocData = seriesToc;
                    }
                }
            } catch {
                // If fetch fails, keep current tocData
            }
        }

        if (tocData?.chapters?.length > 0) {
            return tocData.chapters
                .map(c => ({
                    sourceUrl: new URL(c.href, dom.baseURI).href,
                    title: c.title?.trim()
                }))
                .filter(c => util.isUrl(c.sourceUrl) && !util.isNullOrEmpty(c.title));
        }

        // Fallback: DOM navigation links
        let chapterElements = dom.querySelectorAll(
            "div.wp-block-columns a.wp-block-navigation-item__content, " +
            ".wp-block-navigation a.wp-block-navigation-item__content, " +
            ".kstoc-list a, " +
            "div.entry-content a[href*='/chapter-']"
        );
        return [...chapterElements].map(a => util.hyperLinkToChapter(a));
    }

    extractTocFromScript(dom) {
        let script = dom.querySelector("script#kay-series-toc-js-js-after");
        let scriptElements = script ? [script] : dom.querySelectorAll("script");
        for (let s of scriptElements) {
            let text = s.textContent;
            if (text && text.includes("KaySeriesTOCData")) {
                let start = text.indexOf("window.KaySeriesTOCData");
                let braceStart = text.indexOf("{", start);
                let end = text.indexOf("};\n", braceStart);
                if (end === -1) {
                    end = text.indexOf("};", braceStart);
                }
                if (braceStart !== -1 && end !== -1) {
                    try {
                        let jsonStr = text.substring(braceStart, end + 1);
                        let data = JSON.parse(jsonStr);
                        if (Array.isArray(data.chapters) && data.chapters.length > 0) {
                            return data;
                        }
                    } catch {
                        // ignore JSON parse error
                    }
                }
            }
        }
        return null;
    }

    findContent(dom) {
        // Chapters are formatted into columns where one column holds story paragraphs
        let columns = dom.querySelectorAll("div.entry-content div.wp-block-columns > div.wp-block-column");
        let bestColumn = null;
        let maxParagraphs = 0;
        for (let col of columns) {
            let count = col.querySelectorAll("p.wp-block-paragraph, p").length;
            if (count > maxParagraphs) {
                maxParagraphs = count;
                bestColumn = col;
            }
        }
        if (bestColumn && maxParagraphs >= 3) {
            return bestColumn;
        }

        return dom.querySelector("div.entry-content div.wp-block-columns")
            ?? dom.querySelector("div.entry-content")
            ?? dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("div.wp-block-columns.alignwide h1, div.wp-block-columns h1");
        if (!title) {
            let h1s = dom.querySelectorAll("article h1, .entry-content h1, h1");
            for (let h1 of h1s) {
                if (!h1.closest(".wp-block-cover")) {
                    return h1;
                }
            }
        }
        return title;
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.entry-content h3.wp-block-heading, div.entry-content h3, div.entry-content h2");
    }

    extractAuthor(dom) {
        let meta = dom.querySelector("meta[name=\"author\"]");
        if (meta && meta.content) {
            return meta.content.trim();
        }
        let authorNode = dom.querySelector(".author a, .byline a, span.author");
        return authorNode?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.wp-block-cover")
            ?? dom.querySelector("img.wp-block-cover__image-background")?.getAttribute("src");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            "div.code-block, #nav_inner_page_backwards, #nav_inner_page_forwards, " +
            "#message_content, .donate, .ko-fi-button, .kay-subscribe-row, div.wp-block-buttons"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }
}
