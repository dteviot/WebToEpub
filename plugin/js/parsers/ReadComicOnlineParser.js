"use strict";

parserFactory.register("readcomiconline.to", () => new ReadComicOnlineParser());

/**
 * This one kind of works, 
 * There are issues with site's anti-copy stuff.
 * Usually need to open a first page of chapter before rest will work.
 * Also, sometimes pages return a CAPTCHA
 */
class ReadComicOnlineParser extends Parser{
    constructor() {
        super();
    }

    static extractImageUrls(dom) {
        let prefix = "lstImages.push(\"";
        let script = [...dom.querySelectorAll("script")]
            .map(s => s.textContent)
            .filter(s => s.includes(prefix))[0];
        let urls = [];
        let index = script.indexOf(prefix);
        while(0 < index) {
            index += prefix.length;
            let suffix = script.indexOf("\"", index);
            urls.push(script.substring(index, suffix));
            index = script.indexOf(prefix, suffix);
        }
        return urls;
    }

    async getChapterUrls(dom) {
        let toc = dom.querySelector("table.listing");
        return util.hyperlinksToChapterList(toc).reverse();
    }

    findContent(dom) {
        let content = Parser.findConstrutedContent(dom);
        if (content === null) {
            content = dom.createElement("div");
            content.className = Parser.WEB_TO_EPUB_CLASS_NAME;
            dom.body.appendChild(content);
            let imgUrls = ReadComicOnlineParser.extractImageUrls(dom);
            for(let u of imgUrls) {
                let img = dom.createElement("img");
                img.src = u;
                content.appendChild(img);
            }
        }
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("a.bigChar").textContent;
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div#rightside div.barContent");
    }

    getInformationEpubItemChildNodes(dom) {
        return [dom.querySelector("div.barContent")];
    }
}
