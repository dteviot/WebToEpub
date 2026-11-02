// Ai generated + Copilot
"use strict";

parserFactory.register("noveli.to", () => new NoveliParser());

class NoveliParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
        this.minimumThrottle = 5000;
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let pageUrl = new URL(dom.baseURI);
        let novelSlug = pageUrl.pathname.match(/^\/novel\/([^/]+)/)?.[1];
        if (novelSlug == null) {
            throw new Error(`Could not determine the Noveli novel slug from ${pageUrl.href}`);
        }

        let chaptersUrl = new URL(
            `/api/novels/${encodeURIComponent(novelSlug)}/chapters`,
            pageUrl.origin
        );
        let response = (await HttpClient.fetchJson(chaptersUrl.href)).json;
        if (!response?.success || !Array.isArray(response.chapters)) {
            throw new Error(
                `Could not load the Noveli chapter list for ${novelSlug}: ` +
                (response?.message || "Unexpected API response")
            );
        }

        let chapters = response.chapters
            .map((chapter, index) => {
                if (chapter?.id == null) {
                    throw new Error(`Noveli returned a chapter without an ID at index ${index}`);
                }
                let title = typeof chapter.title === "string" ? chapter.title.trim() : "";
                if (!title) {
                    title = `Chapter ${chapter.chapter_number ?? index + 1}`;
                }
                return {
                    chapterNumber: Number(chapter.chapter_number),
                    sourceUrl: new URL(
                        `/novel/${encodeURIComponent(novelSlug)}/chapter/${encodeURIComponent(chapter.id)}`,
                        pageUrl.origin
                    ).href,
                    title
                };
            })
            .sort((left, right) => {
                if (!Number.isFinite(left.chapterNumber) || !Number.isFinite(right.chapterNumber)) {
                    return 0;
                }
                return left.chapterNumber - right.chapterNumber;
            })
            .map(({sourceUrl, title}) => ({sourceUrl, title}));

        chapterUrlsUI.showTocProgress(chapters);
        return chapters;
    }

    async fetchChapter(url) {
        let tabId;
        try {
            tabId = await new Promise((resolve, reject) => {
                chrome.tabs.create({url: url, active: false}, tab => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (tab?.id == null) {
                        reject(new Error(`Could not open the Noveli reading page ${url}`));
                    } else {
                        resolve(tab.id);
                    }
                });
            });

            await NoveliParser.waitForTabLoad(tabId);
            await util.sleep(5000);

            let html = await new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    func: () => document.documentElement.outerHTML
                }, results => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (results?.[0]?.result) {
                        resolve(results[0].result);
                    } else {
                        reject(new Error(`No rendered HTML returned for Noveli chapter ${url}`));
                    }
                });
            });

            let dom = new DOMParser().parseFromString(html, "text/html");
            util.setBaseTag(url, dom);
            let content = this.findContent(dom);
            if (content == null || content.querySelectorAll("p, img, image, hr").length === 0) {
                throw new Error(`Noveli did not render readable chapter content at ${url}`);
            }
            return dom;
        } finally {
            if (tabId != null) {
                chrome.tabs.remove(tabId);
            }
        }
    }

    static waitForTabLoad(tabId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            let done = false;
            let timer;
            let finish = error => {
                if (done) {
                    return;
                }
                done = true;
                clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(listener);
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };
            let listener = (updatedTabId, changeInfo) => {
                if (updatedTabId === tabId && changeInfo.status === "complete") {
                    finish();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
            chrome.tabs.get(tabId, tab => {
                if (chrome.runtime.lastError) {
                    finish(new Error(chrome.runtime.lastError.message));
                } else if (tab?.status === "complete") {
                    finish();
                }
            });
            timer = setTimeout(
                () => finish(new Error(`Timed out loading Noveli reading page in tab ${tabId}`)),
                timeout
            );
        });
    }

    findContent(dom) {
        return dom.querySelector("main .chapter-content, main #chapter-content, main");
    }

    removeUnwantedElementsFromContentElement(element) {
        super.removeUnwantedElementsFromContentElement(element);

        let findTextElement = text => [...element.querySelectorAll("*")]
            .filter(candidate => candidate.textContent.includes(text))
            .sort((left, right) => left.textContent.length - right.textContent.length)[0];
        let audioHeading = findTextElement("AI Audiobook Narration");
        let playAudioButton = findTextElement("Play Chapter Audio");
        if (audioHeading != null && playAudioButton != null) {
            let audioPanel = audioHeading;
            while (audioPanel != null && !audioPanel.contains(playAudioButton)) {
                audioPanel = audioPanel.parentElement;
            }
            if (audioPanel != null && audioPanel !== element) {
                audioPanel.remove();
            } else {
                audioHeading.remove();
                playAudioButton.remove();
            }
        }

        util.removeChildElementsMatchingSelector(
            element,
            "button, [role='button'], [aria-label*='comment' i], [title*='comment' i]"
        );
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".text-2xl") ?? dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("p.text-sm > span:nth-child(1)");
        return authorLabel?.textContent.trim() || super.extractAuthor(dom);
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("div.space-y-2:nth-child(3) > div:nth-child(1)")];
        return tags.map(element => element.textContent.trim()).filter(Boolean).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector("div.leading-relaxed")?.textContent.trim() ?? "";
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.w-full");
    }
}
