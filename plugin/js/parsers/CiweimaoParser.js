parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); // wap.ciweimao.com has a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    static BASE_URL = "https://www.ciweimao.com";

    constructor() {
        super();
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

        // can have multiple volumes, gather all chapter lists into a single wrapper
        const menuWrapper = document.createElement("div");
        const chapterLists = newDom.querySelectorAll(".book-chapter-list");
        chapterLists.forEach((element) =>
            menuWrapper.appendChild(element.cloneNode(true))
        );

        return util.hyperlinksToChapterList(menuWrapper);
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

        const payload = new URLSearchParams({ chapter_id: chapterId });
        const options = {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: payload,
        };

        const { chapter_access_key } = (
            await HttpClient.fetchJson(
                `${CiweimaoParser.BASE_URL}/chapter/ajax_get_session_code`,
                options
            )
        ).json;

        payload.append("chapter_access_key", chapter_access_key);
        const chapterDetailJson = (
            await HttpClient.fetchJson(
                `${CiweimaoParser.BASE_URL}/chapter/get_book_chapter_detail_info`,
                options
            )
        ).json;

        return this.buildChapter(
            { ...chapterDetailJson, chapter_access_key },
            url
        );
    }

    async buildChapter(json, url) {
        const newDoc = Parser.makeEmptyDocForContent(url);

        const title = newDoc.dom.createElement("h1");
        title.textContent = json.chapter_name;
        newDoc.content.appendChild(title);

        if (
            json.chapter_content &&
            json.encryt_keys &&
            json.chapter_access_key
        ) {
            const encryptedDiv = newDoc.dom.createElement("div");
            encryptedDiv.className = "encrypted-chapter-content";
            encryptedDiv.dataset.encryptedContent = json.chapter_content;
            encryptedDiv.dataset.accessKey = json.chapter_access_key;
            encryptedDiv.dataset.encryptionKeys = JSON.stringify(
                json.encryt_keys
            );

            const placeholder = newDoc.dom.createElement("p");
            placeholder.style.fontStyle = "italic";
            placeholder.style.color = "#888";
            placeholder.textContent =
                "[Chapter is encrypted and requires post-processing]";
            encryptedDiv.appendChild(placeholder);

            newDoc.content.appendChild(encryptedDiv);
        } else {
            const messageP = newDoc.dom.createElement("p");
            messageP.textContent =
                "chapter content or decryption params missing";
            newDoc.content.appendChild(messageP);
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
