"use strict";

parserFactory.register("wtr-lab.com", () => new WtrlabParser());

class WtrlabParser extends Parser{
    constructor() {
        super();
        this.maxSimultanousFetchSize = 1;
    }

    populateUI(dom) {
        super.populateUI(dom);
        document.getElementById("removeChapterNumberRow").hidden = false; 
        document.getElementById("selectTranslationGoogleRow").hidden = false; 
    }

    async getChapterUrls(dom) {
        let json = dom.querySelector("script#__NEXT_DATA__")?.textContent;
        json = JSON.parse(json);
        this.magickey = json.buildId;
        let leaves = dom.baseURI.split("/");
        let language = leaves[leaves.length - 3];
        let id = leaves[leaves.length - 2].slice(6);
        let slug = leaves[leaves.length - 1].split("?")[0];

        let chapters = (await HttpClient.fetchJson("https://wtr-lab.com/api/chapters/" + id)).json;
        
        return chapters.chapters.map(a => ({
            sourceUrl: "https://wtr-lab.com/"+language+"/serie-"+id+"/"+slug+"/"+a.order, 
            title: (document.getElementById("removeChapterNumberCheckbox").checked)?a.title:a.order+": "+a.title
        }));
    }

    formatTitle(link) {
        let span = link.querySelector("span").textContent.trim();
        let num = link.querySelector("b").textContent.trim().replace("#", "");
        return num + ": " + span;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".image-wrap");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div#contents-tabpane-about")];
    }

    async fetchChapter(url) {
        let leaves = url.split("/");
        let language = leaves[leaves.length - 4];
        let id = leaves[leaves.length - 3].slice(6);
        let chapter = leaves[leaves.length - 1];
        
        let fetchUrl = "https://wtr-lab.com/api/reader/get";
        let formData = 
            {
                "translate":((document.getElementById("selectTranslationGoogleCheckbox").checked)?"google":"ai"),
                "language":language,
                "raw_id":id,
                "chapter_no":chapter,
                "retry":false,
                "force_retry":false
            };
        let header = {"Content-Type": "application/json;charset=UTF-8"}
        let options = {
            method: "POST",
            body: JSON.stringify(formData),
            headers: header
        };
        let json = (await HttpClient.fetchJson(fetchUrl, options)).json;

        while (json.data.data.task?true:false) {
            await util.sleep(10000);
            json = (await HttpClient.fetchJson(fetchUrl, options)).json;
        }
        if (json.success == false) {
            return;
        }
        return this.buildChapter(json, url);
    }

    buildChapter(json, url) {
        let leaves = url.split("/");
        let chapter = leaves[leaves.length - 1];
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = ((document.getElementById("removeChapterNumberCheckbox").checked)?"":chapter+": ")+json.chapter.title;
        newDoc.content.appendChild(title);
        let br = document.createElement("br");
        for (let element of json.data.data.body) {
            let pnode = newDoc.dom.createElement("p");
            pnode.textContent = element;
            newDoc.content.appendChild(pnode);
            newDoc.content.appendChild(br);
        }
        return newDoc.dom;
    }
}
