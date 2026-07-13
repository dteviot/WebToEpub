parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); // wap.ciweimao.com has a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    static BASE_URL = "https://www.ciweimao.com";

    constructor() {
        super();
        this.minimumThrottle = 1500;
        this.lockedChapterIds = new Set();
    }

    async getChapterUrls(dom) {
        const payload = {
            book_id: this.getBookId(dom),
            chapter_id: "0",
            orderby: "0",
        };
        const options = {
            method: "POST",
            credentials: "include",
            body: new URLSearchParams(payload),
        };
        const newDom = (
            await HttpClient.wrapFetch(
                `${CiweimaoParser.BASE_URL}/chapter/get_chapter_list_in_chapter_detail`,
                { fetchOptions: options }
            )
        ).responseXML;

        const menuWrapper = document.createElement("div");
        const chapterLists = newDom.querySelectorAll(".book-chapter-list");
        chapterLists.forEach((element) =>
            menuWrapper.appendChild(element.cloneNode(true))
        );

        this.lockedChapterIds.clear();
        const chapterLinks = [
            ...menuWrapper.querySelectorAll("a[href*='/chapter/']"),
        ];

        const chapters = chapterLinks.map((link) => {
            const sourceUrl = link.href;
            const title = link.textContent.trim();

            if (link.querySelector(".icon-lock")) {
                // locked
                return {
                    sourceUrl,
                    title,
                    isIncludeable: false,
                };
            } else if (link.querySelector(".icon-unlock")) {
                // accessable but img chapter
                const chapterId = this.getChapterId(sourceUrl);
                this.lockedChapterIds.add(chapterId);
                return {
                    sourceUrl,
                    title,
                };
            } else {
                // free chatper
                return {
                    sourceUrl,
                    title,
                };
            }
        });

        return chapters;
    }

    getBookId(dom) {
        // book ID is the last part of the path in the base URI
        return dom.baseURI.split("/").pop();
    }

    getChapterId(url) {
        return url.split("/").pop();
    }

    extractTitleImpl(dom) {
        // rm the author's name (in a span) from the main title
        const title = dom.querySelector("h1.title");
        const clone = title.cloneNode(true);
        clone.querySelector("span")?.remove();
        return clone;
    }

    findContent(dom) {
        return dom.querySelector("div");
        // We can also have images in the encrypted chapter_content.
        // The content is in "#J_BookRead"
    }

    async fetchChapter(url) {
        const chapterId = this.getChapterId(url);
        const rules = [
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "referer",
                            operation: "set",
                            value: `${CiweimaoParser.BASE_URL}/chapter/${chapterId}`,
                        },
                        {
                            header: "origin",
                            operation: "set",
                            value: CiweimaoParser.BASE_URL,
                        },
                    ],
                },
                condition: {
                    urlFilter: `*://${
                        new URL(CiweimaoParser.BASE_URL).hostname
                    }/*`,
                },
            },
        ];

        await HttpClient.setDeclarativeNetRequestRules(rules);

        let chapterJson;
        const payload = new URLSearchParams({ chapter_id: chapterId });
        const postOptions = {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: payload,
        };

        if (this.lockedChapterIds.has(chapterId)) {
            // locked (image)
            chapterJson = (
                await HttpClient.fetchJson(
                    `${CiweimaoParser.BASE_URL}/chapter/ajax_get_image_session_code`,
                    postOptions
                )
            ).json;
        } else {
            // unlocked (text)
            const { chapter_access_key } = (
                await HttpClient.fetchJson(
                    `${CiweimaoParser.BASE_URL}/chapter/ajax_get_session_code`,
                    postOptions
                )
            ).json;

            payload.append("chapter_access_key", chapter_access_key);
            const chapterDetailJson = (
                await HttpClient.fetchJson(
                    `${CiweimaoParser.BASE_URL}/chapter/get_book_chapter_detail_info`,
                    postOptions
                )
            ).json;

            chapterJson = { ...chapterDetailJson, chapter_access_key };
        }

        return this.buildChapter(chapterJson, url);
    }

    _base64ToArrayBuffer(base64) {
        const binary_string = atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async _decryptChapterContentNative({ content, keys, accessKey }) {
        const keysLength = keys.length;
        const decryptionKeysB64 = [];
        decryptionKeysB64.push(
            keys[accessKey.charCodeAt(accessKey.length - 1) % keysLength]
        );
        decryptionKeysB64.push(keys[accessKey.charCodeAt(0) % keysLength]);

        let currentContentB64 = content;
        let finalDecryptedBuffer;

        for (const keyB64 of decryptionKeysB64) {
            const keyData = this._base64ToArrayBuffer(keyB64);
            const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyData,
                { name: "AES-CBC" },
                false, // not extractable
                ["decrypt"]
            );

            const rawContentBuffer =
                this._base64ToArrayBuffer(currentContentB64);
            const iv = rawContentBuffer.slice(0, 16);
            const ciphertext = rawContentBuffer.slice(16);
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: "AES-CBC", iv: iv },
                cryptoKey,
                ciphertext
            );

            currentContentB64 = new TextDecoder("latin1").decode(
                decryptedBuffer
            );
            finalDecryptedBuffer = decryptedBuffer;
        }

        return new TextDecoder("utf-8").decode(finalDecryptedBuffer);
    }

    async buildChapter(json, url) {
        const newDoc = Parser.makeEmptyDocForContent(url);
        const chapterId = this.getChapterId(url);

        // locked image
        if (this.lockedChapterIds.has(chapterId)) {
            if (json.image_code && json.encryt_keys && json.access_key) {
                // trigger server to gen full-height img
                const heightUrl = new URL(
                    `${CiweimaoParser.BASE_URL}/chapter/get_book_chapter_image_height`
                );
                // todo: tune
                const imageOptions = {
                    chapter_id: chapterId,
                    area_width: 871,
                    font: "undefined",
                    font_size: 16,
                    bg_color_name: "white",
                    text_color_name: "white",
                };
                heightUrl.search = new URLSearchParams(imageOptions).toString();
                await HttpClient.wrapFetch(heightUrl.href); // don't need the resp

                const decryptedImageCode =
                    await this._decryptChapterContentNative({
                        content: json.image_code,
                        keys: json.encryt_keys,
                        accessKey: json.access_key,
                    });

                const imageUrl = new URL(
                    `${CiweimaoParser.BASE_URL}/chapter/book_chapter_image`
                );
                imageUrl.search = new URLSearchParams({
                    ...imageOptions,
                    image_code: decryptedImageCode.trim(),
                }).toString();

                const img = newDoc.dom.createElement("img");
                img.src = imageUrl.href;
                newDoc.content.appendChild(img);
            }
            // unlocked text
        } else if (
            json.chapter_content &&
            json.encryt_keys &&
            json.chapter_access_key
        ) {
            const chapterText = await this._decryptChapterContentNative({
                content: json.chapter_content,
                keys: json.encryt_keys,
                accessKey: json.chapter_access_key,
            });

            const tmpDiv = newDoc.dom.createElement("div");
            tmpDiv.innerHTML = chapterText;
            while (tmpDiv.firstChild) {
                newDoc.content.appendChild(tmpDiv.firstChild);
            }
        } else {
            const p = newDoc.dom.createElement("p");
            p.textContent = "Chapter content couldn't be loaded";
            newDoc.content.appendChild(p);
        }

        return newDoc.dom;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    extractLanguage() {
        return "zh-CN";
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h1.title > span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".book-bd")];
    }

    cleanInformationNode(node) {
        const elementsToRemove = node.querySelectorAll(
            ".book-tip, [style*=\"display:none\"]"
        );
        elementsToRemove.forEach((el) => el.remove());
        return node;
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
}
