"use strict";

parserFactory.register("akknovel.com", function () {return new AkkParser();});

class AkkParser extends Parser {
  constructor() {
    super();
  }

  async getChapterUrls(dom, chapterUrlsUI) {
    return this.getChapterUrlsFromMultipleTocPages(
      dom,
      this.extractPartialChapterList,
      this.getUrlsOfTocPages,
      chapterUrlsUI
    );
  }
  
  getUrlsOfTocPages(dom) {
    let link = dom.querySelector("li.last a");
    let urls = [];
    if (link != null) {
      let limit = link.getAttribute("data-page") || "-1";
      limit = parseInt(limit) + 1;
      for (let i = 1; i <= limit; ++i) {
        urls.push(AkkParser.buildUrlForTocPage(link, i));
      }
    }
    return urls;
  }

  extractPartialChapterList(dom) {
    console.log(
      [...dom.querySelectorAll("div.chapter-item a")].map((link) =>
        util.hyperLinkToChapter(link)
      )
    );
    return [...dom.querySelectorAll("div.chapter-item a")].map((link) =>
      util.hyperLinkToChapter(link)
    );
  }

  findContent(dom) {
    return (
      dom.querySelector("#chr-content") || dom.querySelector("#chapter-content")
    );
  }

  extractTitleImpl(dom) {
    return dom.querySelector("h1");
  }

  findChapterTitle(dom) {
    return dom.querySelector("h1").textContent;
  }

  findCoverImageUrl(dom) {
    return util.getFirstImgSrc(dom, "div.grid");
  }

  getInformationEpubItemChildNodes(dom) {
    return [...dom.querySelectorAll("div#intro")];
  }
}
