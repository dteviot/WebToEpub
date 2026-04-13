"use strict";

parserFactory.register("vozer.io", () => new VozerParser());
parserFactory.register("congphap.com", () => new VozerParser());
parserFactory.register("quykhu.com", () => new VozerParser());

class VozerParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const chapters = [];
        const addedUrls = new Set();
        let maxPage = 1;

        dom.querySelectorAll("a[href*='pagechap=']").forEach(a => {
            const match = a.getAttribute("href").match(/pagechap=(\d+)/);
            if (match) {
                const pageNum = parseInt(match[1], 10);
                if (pageNum > maxPage) {
                    maxPage = pageNum;
                }
            }
        });

        const extractChapters = (docDom) => {
            const list = [];
            const links = Array.from(docDom.querySelectorAll("a[href*='/chuong-']"));

            links.forEach(link => {
                const text = link.textContent.trim();
                if (!text) return; 

                const href = link.getAttribute("href");
                if (href && !href.includes("#")) {
                    const fullUrl = new URL(href, docDom.baseURI).href;
                    const cleanUrl = fullUrl.split("?")[0];

                    if (!addedUrls.has(cleanUrl)) {
                        addedUrls.add(cleanUrl);
                        list.push({
                            title: text.replace(/\s+/g, " "),
                            sourceUrl: fullUrl
                        });
                    }
                }
            });
            return list;
        };

        chapters.push(...extractChapters(dom));

        if (maxPage > 1) {
            const baseUrl = dom.baseURI.split("?")[0];
            const fetchPromises = [];

            for (let i = 2; i <= maxPage; i++) {
                const pageUrl = `${baseUrl}?pagechap=${i}`;
                const request = HttpClient.wrapFetch(pageUrl)
                    .then(res => extractChapters(res.responseXML))
                    .catch(() => []);
                fetchPromises.push(request);
            }

            const results = await Promise.all(fetchPromises);
            results.forEach(list => {
                if (list && list.length > 0) {
                    chapters.push(...list);
                }
            });
        }

        chapters.sort((a, b) => {
            const numA = parseInt(a.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            const numB = parseInt(b.sourceUrl.match(/chuong-(\d+)/)?.[1] || 0, 10);
            return numA - numB;
        });

        return chapters;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.text-2xl.font-bold")?.textContent.trim();
    }

    extractAuthor(dom) {
        const labels = Array.from(dom.querySelectorAll("span, p"));
        const authorLabel = labels.find(el => el.textContent.includes("Tác giả:"));
        if (authorLabel) {
            const strong = authorLabel.parentElement?.querySelector("strong") || authorLabel.querySelector("strong");
            return strong ? strong.textContent.trim() : null;
        }
        return null;
    }

    extractSubject(dom) {
        const labels = Array.from(dom.querySelectorAll("span, p"));
        const typeLabel = labels.find(el => el.textContent.includes("Thể loại:"));
        if (typeLabel) {
            const aTag = typeLabel.parentElement?.querySelector("a") || typeLabel.querySelector("a");
            return aTag ? aTag.textContent.trim() : null;
        }
        return null;
    }

    findCoverImageUrl(dom) {
        return dom.querySelector("meta[property='og:image']")?.content || util.getFirstImgSrc(dom, "img.border-4");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1#chapter-title")?.textContent.trim();
    }

    findContent(dom) {
        return dom.querySelector("ol.chap");
    }
}