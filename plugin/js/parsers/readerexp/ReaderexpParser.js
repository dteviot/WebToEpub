"use strict";

parserFactory.register("en.readerexp.com", () => new ReaderexpParser());

class ReaderexpParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        // Can get list of all ToC pages
        let tocPage1chapters = this.extractPartialChapterList(dom);
        let urlsOfTocPages  = this.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            this.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }

    extractPartialChapterList(dom) {
        return [...dom.querySelectorAll("#list-chapters .chapter-item-v2 a")]
            .map(link => ({
                sourceUrl:  link.href,
                title: link.querySelector(".title").innerText.trim(),
            }));
    }

    getUrlsOfTocPages(dom) {
        let urls = [];
        let url = new URL(dom.baseURI);
        const chaptersPerTocPage = 36;
        let numTocPages = Math.ceil(this.getNumberOfChapters(dom) / chaptersPerTocPage);
        for(let i = 2; i <= numTocPages; ++i) {
            url.searchParams.set("page", i);
            urls.push(url.toString());
        }
        return urls;
    }

    getNumberOfChapters(dom) {
        let script = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes("numberOfPages"))[0];
        return script
            ? parseInt(JSON.parse(script)?.numberOfPages ?? 0)
            : 0;
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content-v1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-info h2");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    findChapterTitle(dom) {
        return dom.querySelector("li.breadcrumb-item.active");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-img");
    }

    preprocessRawDom(webPageDom) {
        this.decryptProtected(webPageDom);
    }

    decryptProtected(webPageDom) {
        let element = webPageDom.querySelector(".chapter-content-v1 .protected");
        if (element) {
            const encryptedContent = element.getAttribute("data-content");
            element.removeAttribute("data-content");
            let decrypted = this.decryptAes(decodeURIComponent(encryptedContent));
            console.log(decrypted)
            element.innerHTML = decrypted;
        }
    }

    decryptAes(str) {
        var key = CryptoJS.enc.Hex.parse("61626326312a7e235e325e2373305e3d295e5e3725623334");
        var iv = CryptoJS.enc.Hex.parse("31323334353637383930383533373237");
        var decrypted = CryptoJS.AES.decrypt(str, key, {
            mode: CryptoJS.mode.CTR,
            iv: iv,
            padding: CryptoJS.pad.NoPadding
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("#description")];
    }
}
