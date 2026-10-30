"use strict";

parserFactory.register("crimsonscrolls.net", () => new CrimsonscrollsParser());

class CrimsonscrollsParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let novelId = dom.querySelector("[data-novel-chapters]")?.getAttribute("data-novel-chapters");
        if (!novelId) {
            return [];
        }
        let tiers = [...dom.querySelectorAll("[data-chapter-access-tier]")]
            .map(b => b.getAttribute("data-chapter-access-tier"));
        if (tiers.length === 0) {
            tiers = ["free"];
        }
        let restUrl = CrimsonscrollsParser.extractCsv2(dom)?.rest
            ?? "https://crimsonscrolls.net/wp-json/crimsonscrolls/v2/";
        let loggedIn = CrimsonscrollsParser.isLoggedIn(dom);

        let chapters = [];
        let seen = new Set();
        for (let tier of tiers) {
            let tierChapters = [];
            let page = 1;
            let pages = 1;
            do {
                let json = await this.fetchTocPage(restUrl, novelId, tier, page);
                pages = Number(json?.pages ?? 1);
                for (let item of json?.items ?? []) {
                    if (item.url && !seen.has(item.url)) {
                        seen.add(item.url);
                        tierChapters.push(CrimsonscrollsParser.itemToChapter(item));
                    }
                }
                chapterUrlsUI.showTocProgress(chapters.concat(tierChapters));
                ++page;
            } while (page <= pages);

            if (tierChapters.length === 0) {
                continue;
            }
            let accessible = (tier === "free")
                || (loggedIn && await this.userCanAccessChapter(tierChapters[0].sourceUrl));
            for (let c of tierChapters) {
                c.isIncludeable = accessible;
            }
            chapters.push(...tierChapters);
        }
        return chapters;
    }

    async fetchTocPage(restUrl, novelId, tier, page) {
        let params = new URLSearchParams({
            novel_id: novelId,
            tier: tier,
            page: String(page),
            per_page: "100",
            search: "",
            order: "ASC"
        });
        return (await HttpClient.fetchJson(restUrl + "novel-chapters?" + params.toString())).json;
    }

    static itemToChapter(item) {
        let number = String(item.number ?? "").trim();
        let title = String(item.title ?? "").trim();
        let fullTitle = number
            ? "Chapter " + number + (title ? ": " + title : "")
            : (title || "Chapter");
        return {
            sourceUrl: item.url,
            title: fullTitle
        };
    }

    static extractCsv2(dom) {
        for (let script of dom.querySelectorAll("script")) {
            let match = script.textContent.match(/CSV2\s*=\s*(\{.*?\});/s);
            if (match) {
                try {
                    return JSON.parse(match[1]);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }

    static isLoggedIn(dom) {
        if (dom.body?.classList.contains("logged-in")) {
            return true;
        }
        return !!CrimsonscrollsParser.extractCsv2(dom)?.loggedIn;
    }

    async userCanAccessChapter(url) {
        try {
            let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
            return (chapterDom.querySelector("article.cs-reader") !== null)
                && (chapterDom.querySelector(".cs-tier-gate") === null);
        } catch (e) {
            return false;
        }
    }

    findContent(dom) {
        return dom.querySelector("article.cs-reader");
    }

    findChapterTitle(dom) {
        return dom.querySelector(".cs-reader-title h1");
    }

    removeUnwantedElementsFromContentElement(element) {
        // keep the chapter <h1>, only drop the novel name shown above it
        util.removeChildElementsMatchingSelector(element, ".cs-reader-title p, .cs-chapter-ad, "
            + ".cs-reader-end-watermark, .cs-copy-watermark, .cs-tier-gate");
        super.removeUnwantedElementsFromContentElement(element);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".cs-novel-info h1");
    }

    extractAuthor(dom) {
        let author = dom.querySelector(".cs-novel-creator-card--author strong a");
        return author?.textContent ?? super.extractAuthor(dom);
    }

    extractSubject(dom) {
        return [...dom.querySelectorAll(".cs-detail-genres a")]
            .map(a => a.textContent.trim())
            .join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".cs-synopsis-content")?.textContent.trim() ?? "";
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.getAttribute("content")
            ?? util.getFirstImgSrc(dom, ".cs-cover");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".cs-synopsis-content")];
    }
}
