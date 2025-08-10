"use strict";

parserFactory.register("dark-novels.ru", () => new DarkNovelsParser());

class DarkNovelsParser extends Parser {
    constructor() {
        super();
    }

    getChapterUrls(dom) {
        let chapters = [...dom.querySelectorAll("tr.chapter a")]
            .map(a => util.hyperLinkToChapter(a));
        return Promise.resolve(chapters);
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-info-container h2");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.book-cover-container");
    }

    async fetchChapter(url) {
        let fetchUrl = "https://api.dark-novels.ru/v1/books/chapter/";
        let formData = DarkNovelsParser.convertUrlToForm(url);
        let options = {
            method: "POST",
            credentials: "include",
            body: formData
        };
        let xhr = await HttpClient.wrapFetch(fetchUrl, {fetchOptions: options});
        return DarkNovelsParser.buildContentHtml(xhr, fetchUrl);
    }

    static convertUrlToForm(url) {
        let pathName = new URL(url).pathname
            .split("/")
            .filter(p => p !== null)
            .reverse();
        let formData = new FormData();
        formData.append("b", pathName[1]);
        formData.append("f", "html");
        formData.append("c", pathName[0]);
        return formData;
    }

    static async buildContentHtml(xhr, fetchUrl) {
        let newDoc = Parser.makeEmptyDocForContent(fetchUrl);
        let rawContent = await DarkNovelsParser.getStringFromZip(xhr.arrayBuffer);
        let text = "<div id=\"raw\">" + rawContent + "</div>";
        let rawDom = util.sanitize(text);
        let content = rawDom.querySelector("div#raw");
        newDoc.content.appendChild(content);
        return newDoc.dom;
    }
    
    static async getStringFromZip(arrayBuffer) {
        // server is down so i am unable to test the code here is my guess
        let theFile = null;
        let zipreader = await new zip.Uint8ArrayReader(arrayBuffer);
        let Zip = new zip.ZipReader(zipreader, {useWebWorkers: false});
        let ZipContent = await Zip.getEntries();
        ZipContent = ZipContent.filter(a => a.directory == false);
        for (let element of ZipContent) {
            theFile = await element.getData(new zip.TextWriter());
        }
        return theFile;
        /* old implementation
        let zip = await new JSZip().loadAsync(arrayBuffer);
        let theFile = null;
        zip.forEach(function (relativePath, file) {
            if (!file.dir) {
                // can't call file.async() in here, because it's async
                theFile = file;
            }
        });
        return theFile.async("text");
        */
    }
    
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.description")];
    }
}
