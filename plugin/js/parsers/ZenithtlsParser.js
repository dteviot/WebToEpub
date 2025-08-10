"use strict";

parserFactory.register("zenithtls.com", () => new ZenithtlsParser());

class ZenithtlsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let leaves = dom.baseURI.split("/");
        let id = leaves[leaves.length - 1];
        id = id.replace(/#google_vignette.*$/,"");
        let chapters = (await HttpClient.fetchJson("https://www.zenithtls.com/api/chapter?novelId="+id+"&limit=0&page=1")).json;
        return chapters.chapters.map(a => ({
            sourceUrl: "https://www.zenithtls.com/chapter/" + a.id, 
            title: a.title, 
            isIncludeable: (a.price==0||a.price==null)
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        let leaves = dom.baseURI.split("/");
        let id = leaves[leaves.length - 1];
        let bookinfo = (await HttpClient.fetchJson("https://www.zenithtls.com/api/novels/" + id)).json;
        this.title = bookinfo?.title;
        this.author = bookinfo?.translator?.username;
        this.tags = bookinfo?.tags;
        this.description = bookinfo?.synopsis;
        this.img = (bookinfo?.cover?.url!=null)?"https://www.zenithtls.com/"+bookinfo?.cover?.url:"";
        return;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl() {
        return (this.title!=null)?this.title:"";
    }

    extractAuthor() {
        return (this.author!=null)?this.author:"";
    }

    extractSubject() {
        let tags = this.tags;
        return tags.join(", ");
    }

    extractDescription() {
        return (this.description!=null)?this.description.trim():"";
    }

    findCoverImageUrl() {
        return this.img;
    }
    
    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let startString = "self.__next_f.push(";
        let scriptElement = [...dom.querySelectorAll("script")].map(a => a.textContent).filter(s => s.includes(startString));
        let json = [];
        let i = 0;
        let j = 0;
        let longestindex = 0;
        let longestcontent = 0;
        //search longest content to build chapter
        while ( j < scriptElement.length) {
            try {
                json[i] = this.parseNextjsHydration(scriptElement[j]);
                i++;
                if (scriptElement[j].length > longestcontent) {
                    longestcontent = scriptElement[j].length;
                    longestindex = i-1;
                }
            } catch (error) {
                //catch maleformed json
            }
            j++;
        }
        if (json[longestindex].webtoepubformat == "backslash") {
            json[longestindex].title = "";
            for (let jsonentry of json) {
                try {
                    json[longestindex].title = jsonentry.chapter.title.trim();
                } catch (error) {
                    //set title
                }
            }
        }
        return this.buildChapter(json[longestindex], url);
    }

    parseNextjsHydration(nextjs) {
        let malformedjson = nextjs.match(/{.*}/s);
        let json;
        if (malformedjson == null) {
            malformedjson = nextjs.match(/\[.*\]/s);
            let ret = malformedjson[0];
            json = JSON.parse(ret);
            json.webtoepubformat = "backslash";
        } else {
            let ret = malformedjson[0];
            ret = ret.replaceAll("\\\\\\\"", "[webtoepubescape\"]");
            ret = ret.replaceAll("\\", "");
            ret = ret.replaceAll("[webtoepubescape\"]","\\\"");
            json = JSON.parse(ret);
            json.webtoepubformat = "array";
        }
        return json;
    }

    buildChapter(json, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        let br = newDoc.dom.createElement("br");
        if (json.webtoepubformat == "backslash") {
            title.textContent = json.title;
            newDoc.content.appendChild(title);
            let text = json[json[0]];
            text = text.replaceAll("\n\n", "\n");
            text = text.split("\n");
            for (let element of text) {
                let pnode = newDoc.dom.createElement("p");
                //filter title
                if (element != json.title) {
                    pnode.textContent = element;
                    newDoc.content.appendChild(pnode);
                }
                newDoc.content.appendChild(br);
            }
        } else {
            title.textContent = json.chapter.title;
            newDoc.content.appendChild(title);
            let textleaves = json.chapter.content.root.children.filter(a => a.direction!=null);
            for (let element of textleaves) {
                let newtext = "";
                element.children.map(a => newtext += a.text);
                let pnode = newDoc.dom.createElement("p");
                pnode.textContent = newtext;
                newDoc.content.appendChild(pnode);
                newDoc.content.appendChild(br);
            }
        }
        return newDoc.dom;
    }
}
