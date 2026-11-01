parserFactory.register("hangulplanet.com", () => new HangulPlanetParser());

class HangulPlanetParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1500;
        this.novelDom = null;
    }

    novelUrl(dom) {
        const url = new URL(dom.baseURI);
        const [, route, novelSlug] = url.pathname.split("/");
        if (route !== "novel" || !novelSlug) {
            throw new Error(
                "Open a Hangul Planet novel or chapter page first.",
            );
        }
        return `${url.origin}/novel/${novelSlug}`;
    }

    async loadEpubMetaInfo(dom) {
        this.novelDom = dom.querySelector("#chapters")
            ? dom
            : (await HttpClient.wrapFetch(this.novelUrl(dom))).responseXML;
    }

    async getChapterUrls(dom, chapterUrlsUi) {
        const novelUrl = this.novelUrl(dom);
        const firstPageUrl = `${novelUrl}?order=asc`;
        const firstPage = (await HttpClient.wrapFetch(firstPageUrl))
            .responseXML;
        const seenChapterUrls = new Set();
        const chapters = await this.walkTocPages(
            firstPage,
            (page) => {
                this.restoreStreamedChapters(page);
                const toc = page.querySelector("#chapters");
                if (!toc) {
                    throw new Error(
                        "Could not find Hangul Planet's public chapter list.",
                    );
                }
                return this.extractPublicChapters(
                    toc,
                    novelUrl,
                    seenChapterUrls,
                );
            },
            (page) => {
                const toc = page.querySelector("#chapters");
                if (!toc) {
                    throw new Error(
                        "Could not find Hangul Planet's public chapter list.",
                    );
                }
                return this.findNextTocPageUrl(toc, novelUrl);
            },
            {
                showTocProgress: (chapters) =>
                    chapterUrlsUi?.showTocProgress(chapters),
            },
        );
        if (!chapters.length) {
            throw new Error("No public chapters found on Hangul Planet.");
        }
        return chapters;
    }

    extractPublicChapters(toc, novelUrl, seenChapterUrls) {
        const chapters = [];
        for (const link of toc.querySelectorAll("a[href]")) {
            const chapterUrl = new URL(link.getAttribute("href"), novelUrl);
            if (!chapterUrl.href.startsWith(`${novelUrl}/`)) {
                continue;
            }
            chapterUrl.search = "";
            chapterUrl.hash = "";
            if (seenChapterUrls.has(chapterUrl.href)) {
                continue;
            }
            seenChapterUrls.add(chapterUrl.href);
            chapters.push({
                sourceUrl: chapterUrl.href,
                title: (
                    link.querySelector(".line-clamp-1") || link
                ).textContent.trim(),
            });
        }
        return chapters;
    }

    findNextTocPageUrl(toc, novelUrl) {
        const nextPageLink = toc.querySelector(
            "a[rel=next][href]:not([aria-disabled=true])",
        );
        if (!nextPageLink) {
            return null;
        }
        const nextPageUrl = new URL(
            nextPageLink.getAttribute("href"),
            novelUrl,
        );
        const novelPageUrl = new URL(novelUrl);
        if (
            nextPageUrl.origin !== novelPageUrl.origin ||
            nextPageUrl.pathname !== novelPageUrl.pathname
        ) {
            throw new Error("Hangul Planet pagination left the novel page.");
        }
        nextPageUrl.hash = "";
        return nextPageUrl.href;
    }

    restoreStreamedChapters(dom) {
        for (const placeholder of dom.querySelectorAll("template[id^=\"P:\"]")) {
            const streamedContentId = `S:${placeholder.id.slice(2)}`;
            const streamedContent = dom.getElementById(streamedContentId);
            if (streamedContent) {
                placeholder.replaceWith(...streamedContent.childNodes);
                streamedContent.remove();
            }
        }
    }

    findContent(dom) {
        return dom.querySelector("article[data-reader-article] .reader-prose");
    }

    extractTitleImpl(dom) {
        return Parser.extractTitleDefault(this.novelDom || dom);
    }

    findCoverImageUrl(dom) {
        return (
            (this.novelDom || dom).querySelector("meta[property=\"og:image\"]")
                ?.content || null
        );
    }

    extractDescription(dom) {
        const page = this.novelDom || dom;
        const synopsis = [...page.querySelectorAll("section")].find(
            (section) =>
                section.querySelector("h2")?.textContent.trim() === "Synopsis",
        );
        return synopsis?.querySelector(".prose")?.textContent.trim() || "";
    }

    extractSubject(dom) {
        return [
            ...(this.novelDom || dom).querySelectorAll(
                "a[href*=\"/browse?genre=\"]",
            ),
        ]
            .map((link) => link.textContent.trim())
            .join(", ");
    }

    removeUnwantedElementsFromContentElement(content) {
        for (const paragraph of content.querySelectorAll("p")) {
            const paragraphText = paragraph.textContent.trim().toLowerCase();
            if (paragraphText.startsWith("join our discord server:")) {
                paragraph.remove();
            }
        }
        super.removeUnwantedElementsFromContentElement(content);
    }
}
