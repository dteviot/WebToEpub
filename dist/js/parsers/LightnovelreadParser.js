"use strict";

//dead url
parserFactory.register("lightnovelread.com", () => new LightnovelreadParser());
parserFactory.register("goblinsguide.com", () => new GoblinsguideParser());

class LightnovelreadParser extends WordpressBaseParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom, chapterUrlsUI) {
        let cat_id, countPosts, baseUrl;
        [cat_id, countPosts, baseUrl] = this.extractScript(dom);
        let chapters = [];
        for (let offset = 0; offset < countPosts; offset += 100) {
            let formData = this.createFormData(cat_id, offset);
            let partialList = await (this.fetchToc(formData, baseUrl));
            chapterUrlsUI.showTocProgress(partialList);
            chapters = chapters.concat(partialList);
        }
        return chapters;
    }

    extractScript(dom) {
        let baseUrl = dom.baseURI.replace("light-novels", "novel")
            .replace("goblinsguide.com/category", "goblinsguide.com");
        let search = "const cat_id = ";
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.innerText.includes(search))
            .map(s => s.innerText);
        script = script[0].split("\n");
        let cat_id = this.extractNumber(script, search);
        let countPosts = this.extractNumber(script, "const countPosts = ");
        return [cat_id, countPosts, baseUrl];
    }

    extractNumber(strings, search) {
        let s = strings.filter(s => s.includes(search))
            .map(s => s.replace(search, ""))
            .map(s => parseInt(s.replace(";", "")));
        return s[0];
    }

    async fetchToc(formData, baseUrl) {
        let options = {
            method: "POST",
            credentials: "include",
            body: formData
        };
        let json = (await HttpClient.fetchJson(this.tocPostUrl(), options)).json;
        return json.map(j => this.jsonToChapter(j, baseUrl));
    }

    tocPostUrl() {
        return "https://lightnovelread.com/wp-content/themes/lightnovelread/template-parts/post/menu-query.php";
    }

    createFormData(cat_id, offset) {
        let formData = new FormData();
        formData.append("cat_id", cat_id);
        formData.append("offset", offset);
        formData.append("limit", 100);
        return formData;
    }

    jsonToChapter(json, baseUrl) {
        return ({
            sourceUrl:  baseUrl + json.post_name,
            title: json.post_title || json.post_name
        });
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.js-bookcard");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".category-exerpt.description")];
    }
}

class GoblinsguideParser extends LightnovelreadParser {
    constructor() {
        super();
    }

    tocPostUrl() {
        return "https://goblinsguide.com/wp-content/themes/goblinsguide/template-parts/category/chapters-query.php";
    }

    removeUnwantedElementsFromContentElement(element) {
        let child = element.children[0];
        if (child.tagName === "A") {
            child.remove();
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}