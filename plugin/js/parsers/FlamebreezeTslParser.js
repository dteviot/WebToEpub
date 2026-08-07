"use strict";

parserFactory.register("flamebreezetsl.com", () => new FlamebreezeTslParser());

class FlamebreezeTslParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let chapters = [];
        let grid = dom.querySelector("div.eb-post-grid-wrapper");
        if (!grid) {
            // Fallback for regular parsing if grid is not found
            let anchors = [...dom.querySelectorAll("div.ebpg-entry-wrapper h2.ebpg-entry-title a")];
            return anchors.map(a => ({
                sourceUrl: a.href,
                title: a.textContent.trim(),
                newArc: null
            }));
        }

        let queryDataStr = grid.getAttribute("data-querydata");
        let attributesStr = grid.getAttribute("data-attributes");
        if (!queryDataStr || !attributesStr) {
            return [];
        }

        let page = 1;
        while (true) {
            let body = {
                query_data: queryDataStr,
                attributes: attributesStr,
                query_param_string: "",
                pageNumber: page
            };
            
            let url = new URL("/wp-json/essential-blocks/v1/queries?_locale=user", dom.baseURI).href;
            let response = await HttpClient.fetchJson(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (!response.json) {
                break;
            }

            let htmlString = response.json;
            if (typeof htmlString !== "string") {
                break;
            }

            // Create a temp DOM to parse the HTML string
            let tempDom = new DOMParser().parseFromString(htmlString, "text/html");
            let anchors = [...tempDom.querySelectorAll("a.ebpg-grid-post-link")];
            if (anchors.length === 0) {
                break;
            }

            let partialList = anchors.map(a => ({
                sourceUrl: a.href,
                title: a.textContent.trim(),
                newArc: null
            }));
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
            
            // Check if there are no more posts (the response includes the text 'No more posts' in a hidden paragraph)
            let noPosts = tempDom.querySelector(".eb-loadmore-no-post");
            if (noPosts && noPosts.style.display !== "none" && anchors.length < 20) {
                // Not a great check, but if we got anchors we should probably continue just in case,
                // or just rely on anchors.length == 0 on the next page
            }
            page++;
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("div.eb-fullwidth-content-wrapper, div.entry-content, main.eb-fullwidth-container, #content main, main");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h2.wp-block-post-title, h1.entry-title, h1.ast-post-title, h1");
    }

    extractAuthor(dom) {
        let rows = [...dom.querySelectorAll("figure.wp-block-table table tr, table tr")];
        for (let row of rows) {
            let cells = row.querySelectorAll("td");
            if (cells.length >= 2 && cells[0].textContent.includes("Author")) {
                return cells[1].textContent.trim().replace(/\s+/g, " ");
            }
        }
        return super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.wp-block-post-title, h1.entry-title, h1.ast-post-title, h1, h2");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("figure.wp-block-post-featured-image img, div.post-thumb img, .wp-block-post-featured-image img");
        return img ? img.src : null;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element,
            ".wp-block-navigation, .post-navigation-link-previous, .post-navigation-link-next, " +
            ".wp-block-comments, .wp-block-uagb-post-grid, #jp-relatedposts, .sharedaddy, " +
            ".wp-block-post-author, .is-position-sticky, .akismet-fields-container, " +
            "header, #masthead, .site-header, .site-branding, .header-widget-area, " +
            "figure.wp-block-post-featured-image, .uagb-heading-text, #block-44"
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    cleanInformationNode(node) {
        let links = [...node.querySelectorAll("a")];
        for (let link of links) {
            util.flattenNode(link);
        }
        super.cleanInformationNode(node);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [...dom.querySelectorAll("figure.wp-block-table, .wp-block-post-excerpt, div.entry-content p")];
        return nodes.length > 0 ? nodes : [...dom.querySelectorAll("main p")];
    }
}

