parserFactory.register("fenrirealm.com", () => new FenrirealmParser());

class FenrirealmParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 10000;
        this.chaptersByUrl = new Map();
    }

    async getChapterUrls(dom) {
        return this.loadAndCacheChapterList(new URL(dom.baseURI));
    }

    async loadAndCacheChapterList(url) {
        const seriesPath = this.seriesPath(url);
        const apiUrl = new URL(`/api/new/v2${seriesPath}/chapters`, url).href;
        const { json: data } = await HttpClient.fetchJson(apiUrl);
        const chapterListIsInvalid = !Array.isArray(data);
        if (chapterListIsInvalid) {
            throw new Error("Fenrir Realm returned an invalid chapter list.");
        }
        return (
            data
                // Chapter indexes restart within each volume.
                .sort((firstChapter, secondChapter) => {
                    const volumeOrder =
                        (firstChapter.group?.index ?? 0) -
                        (secondChapter.group?.index ?? 0);
                    if (volumeOrder) {
                        return volumeOrder;
                    }
                    return firstChapter.index - secondChapter.index;
                })
                .map((apiChapter) => {
                    const entry = this.buildChapterListEntry(
                        apiChapter,
                        seriesPath,
                        url,
                    );
                    this.chaptersByUrl.set(entry.sourceUrl, entry);
                    return entry;
                })
        );
    }

    buildChapterListEntry(apiChapter, seriesPath, url) {
        const hasNumericId = Number.isInteger(apiChapter.id);
        const hasSlug = Boolean(apiChapter.slug);
        const identifiersAreInvalid = !hasNumericId || !hasSlug;
        if (identifiersAreInvalid) {
            throw new Error(
                "Fenrir Realm returned invalid chapter identifiers.",
            );
        }
        const isFree = apiChapter.locked?.price === 0;
        // Leave paid and unreleased chapters unchecked to avoid failed downloads.
        const isReleased =
            Date.parse(apiChapter.locked?.unlocked_at) <= Date.now();
        const isFreeAndReleased = isFree && isReleased;
        return {
            // Match the rendered reader to the requested chapter.
            id: apiChapter.id,
            slug: apiChapter.slug,
            sourceUrl: new URL(
                `${seriesPath}/${encodeURIComponent(apiChapter.slug)}`,
                url,
            ).href,
            title: this.removeDuplicatedChapterPrefix(
                apiChapter.title || apiChapter.name || "",
            ),
            isIncludeable: isFreeAndReleased,
        };
    }

    seriesPath(url) {
        const parts = url.pathname.split("/").filter(Boolean);
        const isSeriesPath = parts[0] === "series";
        const hasSeriesSlug = Boolean(parts[1]);
        const seriesCannotBeIdentified = !isSeriesPath || !hasSeriesSlug;
        if (seriesCannotBeIdentified) {
            throw new Error(
                `Cannot identify the Fenrir Realm series from ${url.href}`,
            );
        }
        return `/series/${parts[1]}`;
    }

    async fetchChapter(url) {
        const chapter = await this.getOrLoadChapter(
            this.chapterCacheKeyFromUrl(url),
        );
        const snapshot = await this.fetchRenderedChapter(chapter);
        return this.buildChapterDocument(url, chapter, snapshot);
    }

    async fetchRenderedChapter(chapter) {
        let tabId;
        try {
            const tab = await this.callTabApi("create", {
                url: chapter.sourceUrl,
                active: false,
            });
            tabId = tab.id;
            return await this.waitForRenderedChapter(tabId, chapter);
        } catch (error) {
            const message = error.message.toLowerCase();
            const tabMissing = [
                "no tab with id",
                "invalid tab id",
                "cannot find tab",
            ].some((phrase) => message.includes(phrase));

            if (tabMissing) {
                throw new Error(
                    "The reading tab opened by WebToEpub was closed. Please do not close " +
                        "that tab: WebToEpub needs it open to read the chapter after verification. " +
                        "It will close the tab automatically when finished. Try downloading the chapter again.",
                );
            }
            throw error;
        } finally {
            if (tabId != null) {
                chrome.tabs.remove(tabId, () => {
                    void chrome.runtime.lastError;
                });
            }
        }
    }

    async waitForRenderedChapter(tabId, chapter) {
        let deadline = Date.now() + 60000;
        let previousHtml;
        let downloadIsActive = !util.getSleepController().signal.aborted;
        while (downloadIsActive) {
            const tab = await this.callTabApi("get", tabId);
            const pageHasLoaded = tab.status === "complete";
            let snapshot = null;
            if (pageHasLoaded) {
                snapshot = await this.readChapterTab(tabId, chapter.id);
            }

            const chapterIsReady = snapshot?.status === "ready";
            const contentIsUnchanged =
                chapterIsReady && snapshot.html === previousHtml;
            // Two matching snapshots avoid collecting a partially rendered chapter.
            if (contentIsUnchanged) {
                return snapshot;
            }
            previousHtml = chapterIsReady ? snapshot.html : null;

            const verificationIsRequired = snapshot?.status === "challenge";
            const waitingHasTimedOut = Date.now() >= deadline;
            const userNeedsToRetry =
                verificationIsRequired || waitingHasTimedOut;
            if (userNeedsToRetry) {
                await this.retryChapterTab(tabId, chapter);
                previousHtml = null;
                deadline = Date.now() + 60000;
            }
            await util.sleep(1000);
            downloadIsActive = !util.getSleepController().signal.aborted;
        }
        throw new Error("Fenrir Realm chapter download cancelled.");
    }

    async retryChapterTab(tabId, chapter) {
        await this.promptForChapterRetry(chapter.sourceUrl);
        const snapshot = await this.readChapterTab(tabId, chapter.id);
        const chapterIsNotReady = snapshot?.status !== "ready";
        if (chapterIsNotReady) {
            await this.callTabApi("reload", tabId);
        }
    }

    callTabApi(method, ...args) {
        return new Promise((resolve, reject) => {
            chrome.tabs[method](...args, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    readChapterTab(tabId, chapterId) {
        return new Promise((resolve, reject) => {
            const usesManifestV3 =
                chrome.runtime.getManifest().manifest_version >= 3;
            const onResult = (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    let snapshot = results?.[0];
                    if (usesManifestV3) {
                        snapshot = snapshot?.result;
                    }
                    resolve(snapshot);
                }
            };
            if (usesManifestV3) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        func: FenrirealmParser.readRenderedChapter,
                        args: [chapterId],
                    },
                    onResult,
                );
            } else {
                // Firefox's packaged MV2 build omits the scripting permission.
                // chapterId is validated as an integer by buildChapterListEntry.
                chrome.tabs.executeScript(
                    tabId,
                    {
                        code: `(${FenrirealmParser.readRenderedChapter.toString()})(${chapterId})`,
                        runAt: "document_idle",
                    },
                    onResult,
                );
            }
        });
    }

    static readRenderedChapter = (chapterId) => {
        // Runs in the reading tab's isolated world. Only read the DOM the site rendered.
        const reader = document.getElementById(`reader-area-${chapterId}`);
        const readerChallenge = reader?.querySelector(
            "[data-testid^='unlock-'], [data-testid='turnstile-widget']",
        );
        const pageChallenge = document.querySelector(
            "#challenge-running, #challenge-form",
        );
        const verificationIsRequired = Boolean(
            readerChallenge || pageChallenge,
        );
        if (verificationIsRequired) {
            return { status: "challenge" };
        }
        // The site replaces the reader with a separate purchase panel for locked chapters.
        const readerHasNoText = !reader?.textContent.trim();
        if (readerHasNoText) {
            return { status: "waiting" };
        }
        const accessIsBeingVerified =
            reader.textContent.includes("Verifying access");
        const humanConfirmationIsRequired = reader.textContent.includes(
            "Confirm you're human to continue reading",
        );
        const verificationIsPending =
            accessIsBeingVerified || humanConfirmationIsRequired;
        if (verificationIsPending) {
            return { status: "waiting" };
        }
        const chapterElementsAreMissing =
            reader.querySelector("p, img, blockquote, pre") === null;
        if (chapterElementsAreMissing) {
            return { status: "waiting" };
        }
        return {
            status: "ready",
            html: reader.innerHTML,
            title:
                reader.closest(".chapter-view")?.querySelector("h2")
                    ?.textContent || "",
        };
    };

    promptForChapterRetry(url) {
        const message = new Error(
            "Fenrir Realm has not displayed the chapter. Open the chapter URL, " +
                "complete any verification or unlock it on the site, then click Retry. " +
                "You can also complete verification in the reading tab opened by WebToEpub. " +
                "Please keep that original reading tab open: WebToEpub needs it to read the chapter " +
                "after verification and will close it automatically when finished.",
        );
        message.openurl = url;
        message.blockurl = url;
        return new Promise((resolve, reject) => {
            message.retryAction = resolve;
            message.cancelAction = () =>
                reject(new Error("Fenrir Realm chapter download cancelled."));
            ErrorLog.showErrorMessage(message);
        });
    }

    chapterCacheKeyFromUrl(url) {
        const chapterUrl = new URL(url);
        const path = chapterUrl.pathname;
        let chapterPath = path;
        const hasTrailingSlash = path.endsWith("/");
        if (hasTrailingSlash) {
            chapterPath = path.slice(0, -1);
        }
        return `${chapterUrl.origin}${chapterPath}`;
    }

    async getOrLoadChapter(sourceUrl) {
        const chapterIsNotCached = !this.chaptersByUrl.has(sourceUrl);
        if (chapterIsNotCached) {
            await this.loadAndCacheChapterList(new URL(sourceUrl));
            // A cache miss adds a TOC request; throttle before opening the chapter.
            await this.rateLimitDelay();
        }
        const chapter = this.chaptersByUrl.get(sourceUrl);
        const chapterWasNotFound = !chapter;
        if (chapterWasNotFound) {
            throw new Error(`Fenrir Realm chapter not found: ${sourceUrl}`);
        }
        return chapter;
    }

    buildChapterDocument(url, chapter, snapshot) {
        const newDoc = Parser.makeEmptyDocForContent(url);
        const title = newDoc.dom.createElement("h1");
        title.textContent = this.removeDuplicatedChapterPrefix(
            snapshot.title || chapter.title,
        );
        newDoc.content.appendChild(title);
        util.moveChildElements(
            util.sanitize(snapshot.html).body,
            newDoc.content,
        );
        return newDoc.dom;
    }

    findContent(dom) {
        return Parser.findConstructedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#series-title");
    }

    findChapterTitle(dom) {
        const titleText = dom.querySelector("h1, h2")?.textContent ?? "";
        return this.removeDuplicatedChapterPrefix(titleText);
    }

    removeDuplicatedChapterPrefix(titleText) {
        const parts = titleText.split(":");
        const prefixIsMissing = parts.length < 2;
        if (prefixIsMissing) {
            return titleText;
        }
        const prefixIsRepeated = parts[0].trim() === parts[1].trim();
        if (prefixIsRepeated) {
            return parts.slice(1).join(":");
        }
        return titleText;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(
            element,
            "[style*='width:1px']",
        );
        util.removeChildElementsMatchingSelector(
            element,
            ".reader-attribution",
        );
        super.removeUnwantedElementsFromContentElement(element);
    }

    findCoverImageUrl(dom) {
        const img = dom.querySelector(
            ".main-area .flex-col div.lazy-image-wrapper img:nth-of-type(2)",
        );
        return img?.src || null;
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".synopsis")];
    }
}
