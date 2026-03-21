"use strict";

parserFactory.register("xtruyen.vn", () => new XTruyenParser());

class XTruyenParser extends Parser {
    constructor() {
        super();
    }

    get filename() {
        return this.title + ".epub";
    }

    getTocUrl(dom) {
        let tocLink = dom.querySelector("#chapter-heading a");
        if (tocLink) {
            return tocLink.href;
        }
        return dom.querySelector("link[rel='canonical']")?.href || dom.baseURI;
    }
    // Handles lazy-loaded chapters //
    async getChapterUrls(dom) {
        let chapters = [];
        let tocUrl = this.getTocUrl(dom);
        let tocDom = dom;
        
        if (tocUrl && tocUrl !== dom.baseURI) {
            try {
                let response = await HttpClient.wrapFetch(tocUrl);
                tocDom = response.responseXML;
            } catch (e) {}
        }

        let baseUrl = tocDom.querySelector("link[rel='canonical']")?.href || tocDom.baseURI;
        baseUrl = baseUrl.split('/chuong-')[0];
        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }

        let firstNum = 1;
        let lastNum = 0;

        let volumnsUl = tocDom.querySelector(".volumns");
        if (volumnsUl) {
            let lists = Array.from(tocDom.querySelectorAll("li.has-child"));
            if(lists.length > 0) {
               let lastList = lists[lists.length - 1];
               let dataValue = lastList.getAttribute("data-value");
               if(dataValue) {
                   let matches = dataValue.match(/\d+/g);
                   if(matches && matches.length >= 2) {
                       lastNum = parseInt(matches[matches.length - 1]);
                   }
               }
            }
            if (lastNum === 0) {
                let dataLast = volumnsUl.getAttribute("data-last");
                if (dataLast) {
                    let lMatch = dataLast.match(/\d+/);
                    if (lMatch) {
                        lastNum = parseInt(lMatch[0]);
                    }
                }
            }
        } else {
            let volOptions = Array.from(tocDom.querySelectorAll("select.volume-select option"));
            if (volOptions.length > 0) {
                let lastOptionText = volOptions[volOptions.length - 1].textContent;
                let matches = lastOptionText.match(/\d+/g);
                if (matches && matches.length >= 1) {
                    lastNum = parseInt(matches[matches.length - 1]);
                }
            }
        }

        let titleMap = {};

        let allLinks = [...Array.from(tocDom.querySelectorAll("a")), ...Array.from(dom.querySelectorAll("a"))];
        allLinks.forEach(a => {
            let href = a.href || "";
            let match = href.match(/chuong-(\d+)/);
            if (match) {
                let num = parseInt(match[1]);
                let text = a.textContent.trim();
                if (text && text.length > 3) {
                    titleMap[num] = text;
                }
            }
        });

        let currentUrl = dom.querySelector("link[rel='canonical']")?.href || dom.baseURI;
        let currentChapMatch = currentUrl.match(/chuong-(\d+)/);
        if (currentChapMatch) {
            let currentNum = parseInt(currentChapMatch[1]);
            let currentTitleNode = dom.querySelector("h1#chapter-heading + h2") || dom.querySelector("h2");
            if (currentTitleNode) {
                titleMap[currentNum] = currentTitleNode.textContent.trim();
            }
        }

        if (lastNum > 0) {
            for (let i = firstNum; i <= lastNum; i++) {
                chapters.push({
                    sourceUrl: `${baseUrl}chuong-${i}/`,
                    title: titleMap[i] || `Chương ${i}`
                });
            }
            return chapters;
        }

        return chapters;
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let scriptNode = dom.querySelector("#script-x");
        if (scriptNode) {
            let match = scriptNode.textContent.match(/const data_x\s*=\s*"([^"]+)"/);
            if (match && match[1]) {
                try {
                    let decryptedText = await this.decryptContent(match[1]);
                    let contentDiv = dom.querySelector("#chapter-reading-content");
                    if (contentDiv) {
                        contentDiv.innerHTML = decryptedText;
                    }
                } catch (e) {}
            }
        }
        return dom;
    }

    //// Decrypts obfuscated 'data_x' (Anagram) ////
    async decryptContent(data_x) {
        const c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
        const s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let translated = '';
        
        for (let char of data_x) {
            let idx = c.indexOf(char);
            translated += idx > -1 ? s[idx] : char;
        }
        
        const binaryStr = atob(translated);
        const binary = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            binary[i] = binaryStr.charCodeAt(i);
        }

        const ds = new DecompressionStream('deflate');
        const decompressedStream = new Response(binary).body.pipeThrough(ds);
        return await new Response(decompressedStream).text();
    }

    findContent(dom) {
        return dom.querySelector("#chapter-reading-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".post-title h1")?.textContent.trim();
    }

    extractAuthor(dom) {
        return dom.querySelector(".author-content a")?.textContent.trim() || super.extractAuthor(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".summary_image");
    }

    findChapterTitle(dom) {
        let titleNode = dom.querySelector("h1#chapter-heading + h2") || dom.querySelector("h2");
        return titleNode ? titleNode.textContent.trim() : super.findChapterTitle(dom);
    }

    extractSubject(dom) {
        let genres = Array.from(dom.querySelectorAll(".genres-content a"));
        return genres.map(a => a.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".summary__content.show-more")?.textContent.trim() || super.extractDescription(dom);
    }
}