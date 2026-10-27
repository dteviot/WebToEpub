const AZURE_CHRONICLES_AJAX_URL =
    "https://azurechronicles.com/wp-admin/admin-ajax.php";
const AZURE_CHRONICLES_CHAPTER_PAGE_ACTION = "ac_novel_chapter_page";
const AZURE_CHRONICLES_CHAPTER_LINK_SELECTOR =
    ".chapter-row a:not([data-ac-locked])";
const AZURE_CHRONICLES_COVER_IMAGE_SELECTOR = "meta[property=\"og:image\"]";

parserFactory.register(
    "azurechronicles.com",
    () => new AzureChroniclesParser(),
);

class AzureChroniclesParser extends Parser {
    constructor() {
        super();

        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUi) {
        const chapters = [];

        const ajaxConfig = this.extractAjaxConfiguration(dom);
        const novelId = this.extractNovelId(dom);

        if (!ajaxConfig || !novelId) {
            throw new Error(
                "Failed to read data necessary for calling TOC api",
            );
        }

        let pageNumber = 1;
        let maxPages = 1;

        while (pageNumber <= maxPages) {
            const responseJson = await this.fetchTableOfContentsPage(
                ajaxConfig,
                novelId,
                pageNumber,
            );

            if (!responseJson?.success || !responseJson.data) {
                break;
            }

            maxPages = Number.parseInt(responseJson.data.max_pages, 10) || 1;

            const fragmentDom = new DOMParser().parseFromString(
                responseJson.data.html,
                "text/html",
            );
            const pageChapters =
                AzureChroniclesParser.extractChapterUrlsFromDom(fragmentDom);

            chapters.push(...pageChapters);
            chapterUrlsUi.showTocProgress(chapters);

            pageNumber++;
        }

        return chapters;
    }

    async fetchTableOfContentsPage(ajaxConfig, novelId, pageNumber) {
        const formData = new URLSearchParams({
            action: AZURE_CHRONICLES_CHAPTER_PAGE_ACTION,
            nonce: ajaxConfig.nonce,
            novel_id: novelId,
            chapter_page: pageNumber.toString(),
            order: "ASC",
            search: "",
        });

        const response = await HttpClient.fetchJson(ajaxConfig.ajaxUrl, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: formData.toString(),
        });

        return response.json;
    }

    static extractChapterUrlsFromDom(dom) {
        const links = [
            ...dom.querySelectorAll(AZURE_CHRONICLES_CHAPTER_LINK_SELECTOR),
        ];

        return links.map((a) => util.hyperLinkToChapter(a));
    }

    extractAjaxConfiguration(dom) {
        for (const script of dom.querySelectorAll("script:not([src])")) {
            const text = script.textContent;
            if (!text.includes("window.acData")) continue;

            const nonce = text.match(/nonce:\s*['"]([^'"]+)['"]/)?.[1] ?? "";
            const ajaxUrl =
                text.match(/ajaxUrl:\s*['"]([^'"]+)['"]/)?.[1] ??
                AZURE_CHRONICLES_AJAX_URL;

            return { nonce, ajaxUrl };
        }

        return null;
    }

    extractNovelId(dom) {
        const ratingEl = dom.querySelector("#ac-inline-rating");
        if (ratingEl?.dataset.id) {
            return ratingEl.dataset.id;
        }

        const modalEl = dom.querySelector("#ac-tl-modal");
        if (modalEl?.dataset.postId) {
            return modalEl.dataset.postId;
        }

        const postClass = [...dom.body.classList].find((c) =>
            c.startsWith("postid-"),
        );
        if (postClass) {
            return postClass.replace("postid-", "");
        }

        return null;
    }

    findContent(dom) {
        return (
            dom.querySelector("#ac-r-body") ||
            dom.querySelector(".ac-reader-content")
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#ac-novel-title") || dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        const cover = dom.querySelector(AZURE_CHRONICLES_COVER_IMAGE_SELECTOR);
        return cover?.content || null;
    }
}
