"use strict";

//not dead yet
parserFactory.register("tapas.io", () => new TapasParser());
//dead url
parserFactory.register("m.tapas.io", () => new TapasParser());

class TapasParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let pageNum = 1;
        let retrieve_count = 20;
        
        let seriesId = dom.querySelector("meta[property='al:android:url']").getAttribute("content").split("/", 4).pop();
        let chapterList = [];
        let chapterResponse = {};

        do
        {
            chapterResponse = await TapasParser.fetchPartialChapterList(seriesId, pageNum++, retrieve_count);
            var chapters = TapasParser.parseEpisodeDataToChapterList(chapterResponse.episodes);
            chapterUrlsUI.showTocProgress(chapters.map(item => item));
            chapterList = chapterList.concat(chapters);
        } while (chapterResponse.pagination.has_next && chapterResponse.episodes.length == retrieve_count);

        return chapterList;
    }

    static async fetchPartialChapterList(id, page, retrieve_count)
    {
        let restUrl = `https://tapas.io/series/${id}/episodes?page=${page}&sort=OLDEST&max_limit=${retrieve_count}`;
        let response = await HttpClient.fetchJson(restUrl);
        return response.json.data;
    }

    static parseEpisodeDataToChapterList(episodes)
    {
        return episodes.filter(item => item.free || item.free_access || item.unlocked)
            .map(item => {
                let title = item.scene + ": " + item.title;
                return {
                    sourceUrl:`https://tapas.io/episode/${item.id}`, 
                    title: title
                };
            } );
    }

    findContent(dom) {
        return dom.querySelector("#viewport") || dom.querySelector("article");
    }

    extractTitleImpl(dom) {
        const title =
            dom.querySelector(".series-root .title") ||
            dom.querySelector(".center-info .center-info__title--small") ||
            dom.querySelector("title");
        return title.textContent;
    }

    extractAuthor(dom) {
        let authorLabel =
            dom.querySelector(".creator") ||
            dom.querySelector(".viewer-section--episode .name-wrapper .name");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.textContent;
    }

    findChapterTitle(dom) {
        const title =
            dom.querySelector(".center-info .js-ep-title") ||
            dom.querySelector("div.viewer__header p.title");
        return title.textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".info--bottom") ||
            util.getFirstImgSrc(dom, ".info-body") ||
            util.getFirstImgSrc(dom, ".thumb");
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            this.removeJunk(element);
        });
    }

    removeJunk(element) {
        element.removeAttribute("dir");
        element.removeAttribute("role");
        if (element.hasAttribute("style")) {
            // This site has a ton of inline styles that make the epub look bizarre
            let styleText = element.getAttribute("style");

            // Map of style patterns to their semantic HTML equivalents
            const styleToTag = [
                { regex: /font-style\s*:\s*(italic|oblique)\s*;/g, match: /italic|oblique/, tag: "i" },
                { regex: /font-weight\s*:\s*(bold|[7-9]\d\d)\s*;/g, match: /bold|[7-9]\d\d/, tag: "b" },
                { regex: /text-decoration\s*:\s*underline\s*;/g, match: /underline/, tag: "u" }
            ];

            // Apply semantic tags and remove corresponding styles
            for (const style of styleToTag) {
                if (style.match.test(styleText)) {
                    const wrapper = document.createElement(style.tag);
                    while (element.firstChild) {
                        wrapper.appendChild(element.firstChild);
                    }
                    element.appendChild(wrapper);
                    styleText = styleText.replace(style.regex, "");
                }
            }

            // Remove non-semantic font-weight
            styleText = styleText.replace(/font-weight\s*:\s*(normal|[1-4]\d\d)\s*;/g, "");
            styleText = styleText.trim();

            if (styleText && /italic|bold|font-weight|underline|line-through/.test(styleText)) {
                element.setAttribute("style", styleText);
            } else {
                element.removeAttribute("style");
            }
        }
        if (element.tagName === "B" && element.hasAttribute("id")) {
            element.removeAttribute("id");
        }
    }

    preprocessRawDom(webPageDom) {
        util.resolveLazyLoadedImages(webPageDom, "article img.js-lazy");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".description__body")];
    }
}
