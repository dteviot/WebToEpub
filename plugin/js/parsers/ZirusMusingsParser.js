/*
  Parses the Lazy Dungeon Master story on https://zirusmusings.com/ldm-ch84/
*/
"use strict";

//dead url
parserFactory.register("zirusmusings.com", () => new ZirusMusingsParser());
parserFactory.register("zirusmusings.net", () => new ZirusMusingsParser());

class ZirusMusingsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocHtml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        let nextjsraw = tocHtml.querySelector("#__NEXT_DATA__").innerHTML;
        let nextjsjson = JSON.parse(nextjsraw);
        let chaps = nextjsjson.props.pageProps.data.volumes;
        chaps = chaps.map(a => a.chapters).map(a => {
            a[0].newArc = a[0].volumeTitle;
            return a;
        });
        chaps = chaps.flatMap(a => a).filter(a => a.published!=null);
        return chaps.map(a => ({
            sourceUrl: "https://www.zirusmusings.net/series/" + a.series + "/" + a.chapter, 
            title: a.title,
            newArc: a.newArc
        }));
    }
    
    async loadEpubMetaInfo(dom) {
        let tocHtml = (await HttpClient.wrapFetch(dom.baseURI)).responseXML;
        let nextjsraw = tocHtml.querySelector("#__NEXT_DATA__").innerHTML;
        let nextjsjson = JSON.parse(nextjsraw);
        let bookinfo = nextjsjson.props.pageProps.data;
        this.title = bookinfo?.name;
        this.author = bookinfo?.author;
        this.description = bookinfo?.summary;
        this.img = (bookinfo?.cover!=null)?"https://www.zirusmusings.net"+bookinfo?.cover:"";
        return;
    }

    extractTitleImpl() {
        return (this.title!=null)?this.title:"";
    }

    extractAuthor() {
        return (this.author!=null)?this.author:"";
    }

    extractDescription() {
        return (this.description!=null)?this.description.trim():"";
    }

    findCoverImageUrl() {
        return this.img;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async fetchChapter(url) {
        let dom = (await HttpClient.wrapFetch(url)).responseXML;
        let nextjsraw = dom.querySelector("#__NEXT_DATA__").innerHTML;
        let nextjsjson = JSON.parse(nextjsraw);
        return this.buildChapter(nextjsjson.props.pageProps, url);
    }

    buildChapter(chapcontent, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let title = newDoc.dom.createElement("h1");
        title.textContent = chapcontent.data.title?chapcontent.data.title:"Chapter "+chapcontent.data.chapter;
        newDoc.content.appendChild(title);
        let content = util.sanitize(chapcontent.content);
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }
}
