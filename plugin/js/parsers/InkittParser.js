// Ai generated + Gemini 3.8 Flash
"use strict";

parserFactory.register("inkitt.com", () => new InkittParser());

class InkittParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 1000;
    }

    async getChapterUrls(dom) {
        // 1. Try React-on-Rails embedded chapter list
        let script = dom.querySelector("script[data-component-name=\"StoryChaptersList\"]");
        if (script) {
            try {
                let data = JSON.parse(script.textContent);
                if (Array.isArray(data?.chapters) && 0 < data.chapters.length) {
                    return data.chapters.map(c => {
                        let name = (c.name || c.original_name || "").trim();
                        let title;
                        if (name) {
                            title = (/^\d+[\s.:]/.test(name) || name.toLowerCase().startsWith("chapter"))
                                ? name
                                : `${c.number}. ${name}`;
                        } else {
                            title = `Chapter ${c.number}`;
                        }
                        return {
                            sourceUrl: new URL(c.path, dom.baseURI).href,
                            title: title.trim()
                        };
                    });
                }
            } catch (err) {
                // Ignore JSON parse errors and proceed to fallbacks
            }
        }

        // 2. Fallback to HTML dropdown / chapter list links
        let links = [...dom.querySelectorAll("ul.chapter-list-dropdown a.chapter-link, a.chapter-link, .chapters-list a, .chapter-list a")];
        if (0 < links.length) {
            return links.map(link => {
                let nr = link.querySelector("span.chapter-nr, span[class*=\"chapter-nr\"]")?.textContent?.trim();
                let name = link.querySelector(".chapter-title, .chapter-name, span[class*=\"chapter-name\"]")?.textContent?.trim();
                let title;
                if (nr && name) {
                    title = `${nr} ${name}`;
                } else {
                    title = link.textContent.trim().replace(/\s+/g, " ");
                }
                return {
                    sourceUrl: link.href,
                    title: title
                };
            });
        }

        // 3. Fallback: if opened on a chapter reader page without TOC, fetch story overview page
        let storyMatch = dom.baseURI.match(/^(https?:\/\/[^/]+\/stories\/[^/?#]+)/);
        if (storyMatch && dom.baseURI.includes("/chapters/")) {
            let storyDom = (await HttpClient.wrapFetch(storyMatch[1])).responseXML;
            return this.getChapterUrls(storyDom);
        }

        return [];
    }

    findContent(dom) {
        return dom.querySelector("#story-text-container, article.default-style, #chapterText");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h2.chapter-head-title, .chapter-head-title");
    }

    extractTitleImpl(dom) {
        let h1 = dom.querySelector("h1.story-title, h1");
        if (h1 && !util.isElementWhiteSpace(h1)) {
            return h1;
        }

        let script = dom.querySelector("script[data-component-name=\"StoryLeftPanel\"], script[data-component-name=\"StoryCover\"]");
        if (script) {
            try {
                let data = JSON.parse(script.textContent);
                if (data?.story_title || data?.storyTitle) {
                    return (data.story_title || data.storyTitle).trim();
                }
            } catch (err) {
                // Ignore
            }
        }

        let ogTitle = dom.querySelector("meta[property=\"og:title\"]");
        return ogTitle?.content ?? super.extractTitleImpl(dom);
    }

    extractAuthor(dom) {
        let author = dom.querySelector("span[id=\"storyAuthor\"], a.author-link .name, a.author-link")?.textContent?.trim();
        if (author) {
            return author;
        }

        let script = dom.querySelector("script[data-component-name=\"StoryDetails\"], script[data-component-name=\"StoryLeftPanel\"]");
        if (script) {
            try {
                let data = JSON.parse(script.textContent);
                if (data?.authorName || data?.author_name) {
                    return (data.authorName || data.author_name).trim();
                }
            } catch (err) {
                // Ignore
            }
        }

        let meta = dom.querySelector("meta[property=\"author\"], meta[name=\"author\"]");
        return meta?.content?.trim() ?? super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        let coverWrapper = dom.querySelector("div.story-cover-wrapper");
        if (coverWrapper?.hasAttribute("data-cover-url")) {
            return coverWrapper.getAttribute("data-cover-url");
        }

        let script = dom.querySelector("script[data-component-name=\"StoryCover\"]");
        if (script) {
            try {
                let data = JSON.parse(script.textContent);
                if (data?.coverUrl) {
                    return data.coverUrl;
                }
            } catch (err) {
                // Ignore
            }
        }

        let ogImage = dom.querySelector("meta[property=\"og:image\"], meta[itemprop=\"image\"]");
        if (ogImage?.content) {
            return ogImage.content;
        }

        let div = dom.querySelector("div.story-horizontal-cover__front, div.story-horizontal-cover [style*=\"background-image\"]");
        return util.extractUrlFromBackgroundImage(div);
    }

    extractDescription(dom) {
        let summary = dom.querySelector("p.story-summary");
        if (summary) {
            return summary.textContent.trim();
        }

        let meta = dom.querySelector("meta[property=\"og:description\"], meta[name=\"description\"]");
        return meta?.content?.trim() ?? super.extractDescription(dom);
    }

    extractSubject(dom) {
        let script = dom.querySelector("script[data-component-name=\"StoryDetails\"]");
        if (script) {
            try {
                let data = JSON.parse(script.textContent);
                if (Array.isArray(data?.genres)) {
                    return data.genres.map(g => g.name).filter(Boolean).join(", ");
                }
            } catch (err) {
                // Ignore
            }
        }

        let genres = [...dom.querySelectorAll("dd a[href*=\"/genres/\"]")];
        if (0 < genres.length) {
            return genres.map(g => g.textContent.trim()).join(", ");
        }

        return super.extractSubject(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button, .inline-comment-bubble, .comment-count");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("p.story-summary")];
    }
}
