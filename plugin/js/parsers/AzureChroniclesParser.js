parserFactory.register(
    "azurechronicles.com",
    () => new AzureChroniclesParser(),
);

class AzureChroniclesParser extends Parser {
    // eslint-disable-line no-unused-vars
    constructor() {
        super();

        this.minimumThrottle = 3000;
    }

    async getChapterUrls(dom, chapterUrlsUi) {
        const chapters = [];

        // Extract ajax config from page script
        const config = this.extractAcData(dom);
        const novelId = this.extractNovelId(dom);

        if (!config || !novelId) {
            throw new Error(
                "Failed to read data necessary for calling TOC api",
            );
        }

        // Make POST request to API for TOC data
        let page = 1;
        let maxPages = 1;

        while (page <= maxPages) {
            const formData = new URLSearchParams();
            formData.append("action", "ac_novel_chapter_page");
            formData.append("nonce", config.nonce);
            formData.append("novel_id", novelId);
            formData.append("chapter_page", page.toString());
            formData.append("order", "ASC");
            formData.append("search", "");

            const fetchOptions = {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",
                },
                body: formData.toString(),
            };

            const response = await HttpClient.fetchJson(
                config.ajaxUrl,
                fetchOptions,
            );
            const json = response.json;

            if (!json?.success || !json.data) {
                break;
            }

            maxPages = parseInt(json.data.max_pages, 10) || 1;

            // Parse returned HTML fragment
            const fragmentDom = new DOMParser().parseFromString(
                json.data.html,
                "text/html",
            );
            const pageChapters =
                AzureChroniclesParser.chaptersFromDom(fragmentDom);

            chapters.push(...pageChapters);
            chapterUrlsUi.showTocProgress(chapters);

            page++;
        }

        return chapters;
    }

    static chaptersFromDom(dom) {
        // Exclude locked chapters that cannot be fetched
        const links = [
            ...dom.querySelectorAll(".chapter-row a:not([data-ac-locked])"),
        ];

        // If no locked filter is needed or user is logged in via browser session:
        // let links = [...dom.querySelectorAll(".chapter-row a")];

        return links.map((a) => util.hyperLinkToChapter(a));
    }

    extractAcData(dom) {
        for (const script of dom.querySelectorAll("script:not([src])")) {
            const text = script.textContent;
            if (!text.includes("window.acData")) continue;

            const nonce = text.match(/nonce:\s*['"]([^'"]+)['"]/)?.[1] ?? "";
            const ajaxUrl =
                text.match(/ajaxUrl:\s*['"]([^'"]+)['"]/)?.[1] ??
                "https://azurechronicles.com/wp-admin/admin-ajax.php";

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
            return postClass.replace("postid-", ""); // 'postid-24681' -> '24681'
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
        const cover = dom.querySelector('meta[property="og:image"]');
        return cover?.content || null;
    }

    // author of the story
    // Optional, if not provided, will default to "<unknown>"
    /*
    extractAuthor(dom) {
        // typical implementation is find node with the author's name and return name from title
        // Major points to note
        //   1. Return the Author's name as a string, not a HTML element
        //   2. If can't find Author, call the base implementation
        let authorLabel = dom.querySelector(".meta span a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }
    */

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    /*
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }
    */

    // load EpubMetaInfo async in local variable to retieve with all other Metadata functions
    // Optional, will default to "return"
    /*
    async loadEpubMetaInfo(){
        let data = (await HttpClient.fetchJson(api)).json;
        this.subject = data.subject;
        ...
        return;
    }
    */

    // Genre of the story
    // Optional, Genre for metadata, if not provided, will default to ""
    /*
    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("[property='genre']")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    */

    // Description of the story
    // Optional, Description for metadata, if not provided, will default to ""
    /*
    extractDescription(dom) {
        return dom.querySelector("div [property='description']").textContent.trim();
    }
    */

    // Publisher of the story
    // Optional, Publisher for metadata, if not provided, will default to ""
    /*
    extractPublisher(dom) {
        // Element from dom containing publisher data
        return dom.querySelector("").textContent.trim();

        return "site_name";
    }
    */

    // Optional, supply if need to do special manipulation of content
    // e.g. decrypt content
    /*
    customRawDomToContentStep(chapter, content) {
        // for example of this, refer to LnmtlParser
    }
    */

    // Optional, supply if need to do custom cleanup of content
    /*
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }
    */

    // Optional, supply if individual chapter titles are not inside the content element
    /*
    findChapterTitle(dom) {
        // typical implementation is find node with the Title
        // Return Title element, OR the title as a string
        return dom.querySelector("h3.dashhead-title");
    }
    */

    // Optional, if "next/previous chapter" are nested inside other elements,
    // this says how to find the highest parent element to remove
    /*
    findParentNodeOfChapterLinkToRemoveAt(link) {
        // The links may be wrapped, so need to walk up tree to find the 
        // highest element holding the chapter links.
        // e.g. Following code assumes links are sometimes enclosed in a <strong> tag
        // that is enclosed in a <p> tag.  We want to remove the <p> tag
        // and everything inside it
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");    
    }
    */

    // Optional, supply if need to chase hyperlinks in page to get all chapter content
    // or site can send challenge pages for some chapters
    /*
    async fetchChapter(url) {
        // NoContentToError403 option will not be able to handle challenge pages
        return (await HttpClient.wrapFetch(url)).responseXML;

        // Handling to catch sites that send challenge pages
        // needed for the NoContentToError403 option to work
        // Note, need to implement isCustomError() and setCustomErrorResponse()
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }
    */

    // Optional, supply these if site can send challenge pages for some chapters
    /*
    // return true if response is a challenge response
    isCustomError(response) {
        return (response.responseXML.title == "Just a moment...");
    }

    // what to do if encounter challenge
    setCustomErrorResponse(url, wrapOptions) {
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {};
        newresp.response.url = this.RestToUrl(checkedresponse.response.url);
        newresp.response.status = 403;
        return newresp;
    }
    */

    // Optional, supply if need to modify DOM before normal processing steps
    /*
    preprocessRawDom(webPageDom) {
    }
    */

    // Optional, called when user presses the "Pack EPUB" button.
    // Implement if parser needs to do anything after user sets UI settings
    // but before collecting pages
    /*
    onStartCollecting() {
    }
    */

    // Optional, Return elements from page
    // that are to be shown on epub's "information" page
    /*
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-details")];
    }
    */

    // Optional, Any cleanup operations to perform on the nodes
    // returned by getInformationEpubItemChildNodes
    /*
    cleanInformationNode(node) {
        return node;
    }
    */
}
