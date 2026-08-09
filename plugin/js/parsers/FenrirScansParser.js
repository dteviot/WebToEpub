"use strict";

parserFactory.register("fenrirscans.com", () => new FenrirScansParser());

class FenrirScansParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.novel-title-main");
    }

    extractAuthor(dom) {
        let authorLink = dom.querySelector("a.author-link");
        return authorLink ? authorLink.textContent.trim() : super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.novel-cover-large");
    }

    extractLanguage() {
        return "tr";
    }

    findContent(dom) {
        return dom.querySelector("div.chapter-content");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);
        let titleElement = element.querySelector("h3.chapter-title, h4.chapter-title");
        if (titleElement) {
            titleElement.remove();
        }
    }

    async getChapterUrls(dom) {
        let chapters = [];

        let paginationNav = dom.querySelector("div.chapters-pagination-nav");
        if (!paginationNav) {
            throw new Error("Unable to find chapter list on page.");
        }

        let novelId = paginationNav.getAttribute("data-novel-id");
        let totalChapters = parseInt(paginationNav.getAttribute("data-total"));
        let perPage = 100;

        let nonce = this.extractNonce(dom);
        if (!nonce) {
            throw new Error("Unable to find starlab_ajax nonce.");
        }

        let totalPages = Math.ceil(totalChapters / perPage);

        for (let page = 1; page <= totalPages; page++) {
            try {
                let body = new URLSearchParams({
                    action: "load_all_chapters",
                    novel_id: novelId,
                    page: String(page),
                    per_page: String(perPage),
                    sort_order: "oldest",
                    nonce: nonce
                });

                let response = await fetch(
                    "https://fenrirscans.com/wp-admin/admin-ajax.php",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            "X-Requested-With": "XMLHttpRequest"
                        },
                        credentials: "include",
                        body: body.toString()
                    }
                );

                if (!response.ok) {
                    continue;
                }

                let responseText = await response.text();
                if (!responseText || responseText.trim() === "-1") {
                    break;
                }

                let responseJson;
                try {
                    responseJson = JSON.parse(responseText);
                } catch (e) {
                    continue;
                }

                if (responseJson.success && responseJson.data?.all_chapters) {
                    for (let chapter of responseJson.data.all_chapters) {
                        chapters.push({
                            sourceUrl: chapter.url,
                            title: chapter.title
                        });
                    }
                }

                if (page < totalPages) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                // ignore failed page continue with next one
            }
        }

        return chapters;
    }

    extractNonce(dom) {
        let ajaxScript = dom.querySelector("#starlab-main-js-extra");
        if (!ajaxScript) {
            return null;
        }
        let match = ajaxScript.textContent.match(/var\s+starlab_ajax\s*=\s*(\{.*?\});/);
        if (!match) {
            return null;
        }
        try {
            return JSON.parse(match[1]).nonce;
        } catch (e) {
            return null;
        }
    }
}