"use strict";

parserFactory.register("www.ciweimao.com", () => new CiweimaoParser());

class CiweimaoParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 3000;
        this.imgChapterIds = new Set();
    }

    async getChapterUrls(dom) {
        let payload = new URLSearchParams();
        payload.append("book_id", this.getBookId(dom));
        payload.append("chapter_id", 0);
        payload.append("orderby", 0);

        let options = {
            method: "POST",
            credentials: "include",
            body: payload
        };

        let newDom = (await HttpClient.wrapFetch("https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail", {fetchOptions: options})).responseXML;

        let menuWrapper = document.createElement("div");
        let menu = [...newDom.querySelectorAll(".book-chapter-list")];
        menu.forEach((element) => menuWrapper.appendChild(element.cloneNode(true)));

        this.imgChapterIds.clear();
        let chapterLinks = [ ...menuWrapper.querySelectorAll("a[href*='/chapter']"),];

        let chapters = chapterLinks.map((link) => {
            return {
                sourceUrl: link.href,
                title: link.textContent.trim(),
                isIncludeable: !this.isLocked(link),
            };
        });

        return chapters;
    }

    isLocked(link) {
        if (link.querySelector(".icon-lock")) {
            return true; //locked
        } 
        else if (link.querySelector(".icon-unlock")) {
            //this.lockedChapterIds.add(this.getChapterId(link.href));
            return true; //unlocked chapter img, not implemented
        } 
        else {
            return false; //free
        }
    }

    getBookId(dom) {
        return dom.baseURI.split("/").pop();
    }

    getChapterId(url) {
        return url.split("/").pop();
    }

    extractTitleImpl(dom) {
        let title = dom.querySelector("h1.title");
        const clone = title.cloneNode(true);
        clone.querySelector("span")?.remove();
        return clone;
    }

    findContent(dom) {
        return dom.querySelector("div");
    }

    async fetchChapter(url) {
        let chapterId = this.getChapterId(url);

        let rules = [
            {
                id: 1,
                priority: 1,
                action: {
                    type: "modifyHeaders",
                    requestHeaders: [
                        {
                            header: "referer",
                            operation: "set",
                            value: url,
                        },
                        {
                            header: "origin",
                            operation: "set",
                            value: "https://www.ciweimao.com",
                        },
                    ],
                },
                condition: {
                    urlFilter: "*://www.ciweimao.com/*",
                },
            },
        ];

        await HttpClient.setDeclarativeNetRequestRules(rules);

        let payload = new URLSearchParams();
        payload.append("chapter_id", chapterId);

        let options = {
            method: "POST",
            credentials: "include",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: payload.toString()
        };

        let chapterJson;
        if (this.imgChapterIds.has(chapterId)) {
            //unlock chapter img, not implemented
            chapterJson = (await HttpClient.fetchJson("https://www.ciweimao.com/chapter/ajax_get_image_session_code", options)).json;
        }
        else {
            //free chapter
            let chapterAjaxKeyJson = (await HttpClient.fetchJson("https://www.ciweimao.com/chapter/ajax_get_session_code", options)).json; 
            if (chapterAjaxKeyJson.code != 100000) {
                throw new Error("Failed with error code: " + chapterAjaxKeyJson.code);
            }

            let chapterAccessKey = chapterAjaxKeyJson.chapter_access_key;
            payload = new URLSearchParams();
            payload.append("chapter_id", chapterId);
            payload.append("chapter_access_key", chapterAjaxKeyJson.chapter_access_key);

            options.body = payload.toString();

            let chapterDetailJson = (await HttpClient.fetchJson("https://www.ciweimao.com/chapter/get_book_chapter_detail_info", options)).json;
            if (chapterDetailJson.code != 100000) {
                throw new Error("Failed with error code: " + chapterDetailJson.code);
            }

            chapterJson = { ...chapterDetailJson, chapterAccessKey};
        }

        return this.buildEncryptedChapter(chapterJson, url);
    }

    async buildEncryptedChapter(chapterJson, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let chapterId = this.getChapterId(url);

        //unlocked chapter img, not implemented
        if (this.imgChapterIds.has(chapterId)) {
            let heightUrl = new URL("https://www.ciweimao.com/chapter/get_book_chapter_image_height");
            let options = {
                chapter_id: chapterId,
                area_width: 871,
                font: "undefined",
                font_size: 16,
                bg_color_name: "white",
                text_color_name: "white",
            };
            heightUrl.search = new URLSearchParams(options).toString();
            await HttpClient.wrapFetch(heightUrl.href);

            let imageUrl = new URL("https://www.ciweimao.com/chapter/book_chapter_image");
            imageUrl.search = new URLSearchParams({
                ...options,
                image_code: chapterJson.image_code,
            }).toString();

            let img = newDoc.dom.createElement("img");
            img.src = imageUrl.href;
            newDoc.content.appendChild(img);
        }
        //free chapter
        else {
            let chapterText = chapterJson.chapter_content;
            let encryptKeys = chapterJson.encryt_keys;
            let chapterAccessKey = chapterJson.chapterAccessKey;

            let disclaimerDiv = newDoc.dom.createElement("div");
            disclaimerDiv.id = "disclaimer";
            disclaimerDiv.textContent = "Warning: Chapters need postprocessing using https://dteviot.github.io/EpubEditor/ browser tool. Navigate to the address, Drag and drop your epub file in the Drop Zone, and use the Ciweimao-EpubEditor-Companion-Script provided at https://github.com/Yomafil/EpubEditor-Companion-Scripts, by inputing it's content in the text area beside the Drop Zone, and clicking on the 'Run async script' button.";
            newDoc.content.appendChild(disclaimerDiv);

            let chapterContentDiv = newDoc.dom.createElement("div");
            chapterContentDiv.id = "chapter-content";
            chapterContentDiv.textContent = chapterText;
            newDoc.content.appendChild(chapterContentDiv);

            let chapterEncryptKeysDiv = newDoc.dom.createElement("div");
            chapterEncryptKeysDiv.id = "chapter-encryption-keys";
            chapterEncryptKeysDiv.textContent = encryptKeys;
            newDoc.content.appendChild(chapterEncryptKeysDiv);

            let chapterAccessKeyDiv = newDoc.dom.createElement("div");
            chapterAccessKeyDiv.id = "chapter-access-key";
            chapterAccessKeyDiv.textContent = chapterAccessKey;
            newDoc.content.appendChild(chapterAccessKeyDiv);
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

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".label-box span")];

        if (tags[0].textContent.trim() === "暂无标签") {//No tags available
            return "";
        }

        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".book-desc").textContent.trim();
    }

    extractPublisher() {
        return "Ciweimao";
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