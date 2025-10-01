parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); //wap.ciweimao.com has a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // We need to call 'https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail' to be sure we get the entire ToC
        // We get the 'book_id' from the url 'www.ciweimao.com/book/book_id'
        // POST : Request : Form data : book_id=book_id&chapter_id=0&orderby=0
        // Response : JSON

        const payload = {
            book_id: this.getBookId(dom),
            chapter_id: String(0),
            orderby: String(0),
        };
        let options = {
            method: "POST",
            credentials: "include",
            body: new URLSearchParams(payload),
        };
        let newDom = (
            await HttpClient.wrapFetch(
                "https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail",
                { fetchOptions: options }
            )
        ).responseXML;

        // Because a book can be separated in volumes, we might get multiple ".book-chapter-list" each of them bound in a ".book-chapter-box" with the Volume Title stored in "h4 sub-tit"
        // They also seems to restart the chapter count on new volume, but thats on per book basis and chapters are still properly ordered in the epub.
        let menuWrapper = document.createElement("div");
        let menu = [...newDom.querySelectorAll(".book-chapter-list")];
        menu.forEach((element) =>
            menuWrapper.appendChild(element.cloneNode(true))
        );
        // Not skilled enough to find a better solution then wrapping all of them in a parent element so hyperlinksToChapterList don't throw an error.
        // Will probably get changed if we need to make our own implementation of hyperlinksToChapterList to handle VIP chapters, like QidianParser.

        return util.hyperlinksToChapterList(menuWrapper);
    }

    /*
    static isChapterVIP(chapter){
        // We need to detect if a chapter is prefaced with a ".icon-lock", if it has one, then it's a VIP chapter.
        // Example:  <li class=""> <a href="Chapter URL"> <i class="line"></i><i class='icon-lock'></i>Chapter Title</a></li>

        // We could skip this step for non premium books if we need to, by checking if a book is VIP or FREE from the content tab of the book.
    }

    static linksToChapter(){
        // Gonna grab most of this from QidianParser, because they also need to deal with Premium Chapters.
    }
    */

    getBookId(dom) {
        return dom.baseURI.split("/").pop();
    }

    getChapterId(url) {
        return url.split("/").pop();
    }

    extractTitleImpl(dom) {
        // Remove the span element from h1.title, as it includes the author's name.
        let title = dom.querySelector("h1.title");
        let clone = title.cloneNode(true);
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
        const refererUrl = `https://www.ciweimao.com/chapter/${chapterId}`;
        const ruleId = 1;

        // add declarativeNetRequest rule to set Referer/Origin headers
        const addRule = {
            id: ruleId,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    {
                        header: "Referer",
                        operation: "set",
                        value: refererUrl,
                    },
                    {
                        header: "Origin",
                        operation: "set",
                        value: "https://www.ciweimao.com",
                    },
                ],
            },
            condition: {
                urlFilter: "||www.ciweimao.com/chapter/",
                resourceTypes: ["xmlhttprequest"],
            },
        };

        await browser.declarativeNetRequest.updateSessionRules({
            addRules: [addRule],
        });

        try {
            const payload = new URLSearchParams({
                chapter_id: chapterId,
            });
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
                    "https://www.ciweimao.com/chapter/ajax_get_session_code",
                    options
                )
            ).json;

            payload.append("chapter_access_key", chapter_access_key);
            const chapterDetailJson = (
                await HttpClient.fetchJson(
                    "https://www.ciweimao.com/chapter/get_book_chapter_detail_info",
                    options
                )
            ).json;
            return this.buildChapter(
                { ...chapterDetailJson, chapter_access_key },
                url
            );
        } finally {
            await browser.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [ruleId],
            });
        }
    }

    _decryptChapterContentCryptoJS({ content, keys, accessKey }) {
        const keysLength = keys.length;
        const decryptionKeysB64 = [];
        decryptionKeysB64.push(
            keys[accessKey.charCodeAt(accessKey.length - 1) % keysLength]
        );
        decryptionKeysB64.push(keys[accessKey.charCodeAt(0) % keysLength]);

        let currentContentB64 = content;
        let finalDecryptedWordArray;

        for (const keyB64 of decryptionKeysB64) {
            // decode the inc Base64 content to a raw binary str
            const rawBinaryContent = atob(currentContentB64);

            // parse the key and extract the IV and ciphertext WordArrays
            const keyParsed = CryptoJS.enc.Base64.parse(keyB64);
            const ivParsed = CryptoJS.enc.Latin1.parse(
                rawBinaryContent.substring(0, 16)
            );
            const ciphertextParsed = CryptoJS.enc.Latin1.parse(
                rawBinaryContent.substring(16)
            );

            const decryptedWordArray = CryptoJS.AES.decrypt(
                { ciphertext: ciphertextParsed },
                keyParsed,
                { iv: ivParsed }
            );

            // it's a WordArray containing a Base64 string
            currentContentB64 = decryptedWordArray.toString(
                CryptoJS.enc.Latin1
            );
            finalDecryptedWordArray = decryptedWordArray;
        }

        return finalDecryptedWordArray.toString(CryptoJS.enc.Utf8);
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);

        let title = newDoc.dom.createElement("h1");
        title.textContent = json.chapter_name;
        newDoc.content.appendChild(title);

        let chapterText;
        if (
            json.chapter_content &&
            json.encryt_keys &&
            json.chapter_access_key
        ) {
            chapterText = this._decryptChapterContentCryptoJS({
                content: json.chapter_content,
                keys: json.encryt_keys,
                accessKey: json.chapter_access_key,
            });
        } else {
            chapterText =
                "<p>Chapter content is not encrypted or data is missing.</p>";
        }

        const tmpDiv = newDoc.dom.createElement("div");
        tmpDiv.innerHTML = chapterText;
        while (tmpDiv.firstChild) {
            newDoc.content.appendChild(tmpDiv.firstChild);
        }

        return newDoc.dom;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span"); // We need to remove the span from every p.chapter.
        super.removeUnwantedElementsFromContentElement(element);
    }

    // findChapterTitle(dom) {
    //     console.log(dom);
    //     return dom.querySelector(".read-hd h1");
    // }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover");
    }

    extractLanguage() {
        return "zh-CN"; //html lang is erroneously set to "en" on the website, but the site and books are in chinese.
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h1.title > span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".book-bd")];
    }

    cleanInformationNode(node) {
        return node; //We need to remove universal book-tip from the book description:（本站郑重提醒: 本故事纯属虚构，如有雷同，纯属巧合，切勿模仿。)
    }

    addTitleToContent(webPage, content) {
        let h2 = webPage.rawDom.createElement("h2");
        h2.innerText = webPage.title.trim();
        content.prepend(h2);
    }
}
