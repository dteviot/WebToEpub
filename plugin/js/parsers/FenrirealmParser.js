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
            const snapshot = await this.waitForRenderedChapter(tabId, chapter);
            // The trace shows a read-token request finishing after the chapter is visible.
            // Allow that work to settle before closing the page; this duration is provisional.
            await util.sleep(1000);
            return snapshot;
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
        let downloadIsActive = !util.getSleepController().signal.aborted;
        while (downloadIsActive) {
            const snapshot = await this.observeChapterTab(tabId, chapter.id);
            const chapterIsReady = snapshot.status === "ready";
            if (chapterIsReady) {
                return snapshot;
            }
            await this.retryChapterTab(tabId, chapter);
            downloadIsActive = !util.getSleepController().signal.aborted;
        }
        throw new Error("Fenrir Realm chapter download cancelled.");
    }

    observeChapterTab(tabId, chapterId) {
        return new Promise((resolve, reject) => {
            const signal = util.getSleepController().signal;
            let settled = false;
            let installation;
            const timer = setTimeout(() => finish({status: "timeout"}), 60000);

            chrome.tabs.onUpdated.addListener(onTabUpdated);
            chrome.tabs.onRemoved.addListener(onTabRemoved);
            chrome.runtime.onMessage.addListener(onChapterSnapshot);
            signal.addEventListener("abort", onCancelled, {once: true});

            if (signal.aborted) {
                onCancelled();
                return;
            }
            this.callTabApi("get", tabId).then(tab => {
                onTabUpdated(tabId, {status: tab.status});
            }, error => finish(null, error));

            function onTabRemoved(closedTabId) {
                if (closedTabId === tabId) {
                    finish(null, new Error(`No tab with id: ${tabId}`));
                }
            }

            function onCancelled() {
                finish(null, new Error("Fenrir Realm chapter download cancelled."));
            }

            function onChapterSnapshot(message, sender) {
                const isOurTab = sender.tab?.id === tabId;
                const isOurChapter = message.chapterId === chapterId;
                const isSnapshot = message.type === "fenrirChapterSnapshot";
                if (isOurTab && isOurChapter && isSnapshot) {
                    finish(message.snapshot);
                }
            }

            const parser = this;
            function onTabUpdated(updatedTabId, changeInfo) {
                const isOurTab = updatedTabId === tabId;
                const pageHasLoaded = changeInfo.status === "complete";
                const shouldInstallObserver = isOurTab && pageHasLoaded && !installation && !settled;
                if (shouldInstallObserver) {
                    installation = parser.readChapterTab(tabId, chapterId, true);
                    installation.then(snapshot => {
                        const observationHasFinished = snapshot?.status !== "observing";
                        if (observationHasFinished) {
                            finish(snapshot);
                        }
                    }, error => finish(null, error));
                }
            }

            function finish(snapshot, error) {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(onTabUpdated);
                chrome.tabs.onRemoved.removeListener(onTabRemoved);
                chrome.runtime.onMessage.removeListener(onChapterSnapshot);
                signal.removeEventListener("abort", onCancelled);
                // Await installation so cancellation cannot leave a late observer running.
                installation?.then(() => {
                    chrome.tabs.sendMessage(tabId, {
                        type: "fenrirStopObservation",
                        chapterId: chapterId,
                    }, () => { void chrome.runtime.lastError; });
                }, () => {});
                if (error) {
                    reject(error);
                } else {
                    resolve(snapshot);
                }
            }
        });
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

    readChapterTab(tabId, chapterId, observeChanges = false) {
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
                        args: [chapterId, observeChanges],
                    },
                    onResult,
                );
            } else {
                // Firefox's packaged MV2 build omits the scripting permission.
                chrome.tabs.executeScript(
                    tabId,
                    {
                        code: `(${FenrirealmParser.readRenderedChapter.toString()})(${chapterId}, ${observeChanges})`,
                        runAt: "document_idle",
                    },
                    onResult,
                );
            }
        });
    }

    static readRenderedChapter = (chapterId, observeChanges) => {
        const initialSnapshot = inspectReader();
        const chapterIsWaiting = initialSnapshot.status === "waiting";
        const shouldObserveChanges = observeChanges && chapterIsWaiting;
        if (shouldObserveChanges) {
            return waitForReaderChange();
        }
        return initialSnapshot;

        function inspectReader() {
            const reader = document.getElementById(`reader-area-${chapterId}`);
            if (verificationIsRequired(reader)) {
                return { status: "challenge" };
            }
            if (chapterIsNotReady(reader)) {
                return { status: "waiting" };
            }
            return createChapterSnapshot(reader);
        }

        function verificationIsRequired(reader) {
            const readerChallenge = reader?.querySelector(
                "[data-testid^='unlock-'], [data-testid='turnstile-widget']",
            );
            const pageChallenge = document.querySelector(
                "#challenge-running, #challenge-form",
            );
            return Boolean(readerChallenge || pageChallenge);
        }

        function chapterIsNotReady(reader) {
            // A locked chapter's purchase panel replaces the reader entirely.
            const readerHasNoText = !reader?.textContent.trim();
            if (readerHasNoText) {
                return true;
            }
            const accessIsBeingVerified =
                reader.textContent.includes("Verifying access");
            const humanConfirmationIsRequired = reader.textContent.includes(
                "Confirm you're human to continue reading",
            );
            const verificationIsPending =
                accessIsBeingVerified || humanConfirmationIsRequired;
            if (verificationIsPending) {
                return true;
            }
            return storyContentIsMissing(reader);
        }

        function storyContentIsMissing(reader) {
            const chapterElements = [
                ...reader.querySelectorAll("p, img, blockquote, pre"),
            ];
            const hasStoryContent = chapterElements.some((element) => {
                const unwantedContainer = element.closest(
                    ".footnotes, [role='complementary'], [aria-label='Advertisement']",
                );
                return unwantedContainer === null;
            });
            return !hasStoryContent;
        }

        function createChapterSnapshot(reader) {
            const chapterHeading = reader
                .closest(".chapter-view")
                ?.querySelector("h2");
            return {
                status: "ready",
                html: reader.innerHTML,
                title: chapterHeading?.textContent || "",
            };
        }

        function waitForReaderChange() {
            const observer = new MutationObserver(checkReaderAfterChange);
            chrome.runtime.onMessage.addListener(onStopObservation);
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
            });
            return {status: "observing"};

            function checkReaderAfterChange() {
                const snapshot = inspectReader();
                const waitingHasFinished = snapshot.status !== "waiting";
                if (waitingHasFinished) {
                    stopObservation();
                    chrome.runtime.sendMessage({
                        type: "fenrirChapterSnapshot",
                        chapterId: chapterId,
                        snapshot: snapshot,
                    }, () => { void chrome.runtime.lastError; });
                }
            }

            function onStopObservation(message) {
                const isStopRequest = message.type === "fenrirStopObservation";
                const isOurChapter = message.chapterId === chapterId;
                if (isStopRequest && isOurChapter) {
                    stopObservation();
                }
            }

            function stopObservation() {
                observer.disconnect();
                chrome.runtime.onMessage.removeListener(onStopObservation);
            }
        }
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
