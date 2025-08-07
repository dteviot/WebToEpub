/*
  Template to use to create a new parser
*/
"use strict";

// Use one or more of these to specify when the parser is to be used
/*
// Use this function if site's host name is sufficient.  
// i.e. All pages are on same site, and use same format.
parserFactory.register("template.org", () => new TemplateParser());

// Use this function if site's URL is sufficient
parserFactory.registerUrlRule(
    url => TemplateParser.urlMeetsSelectionCriteria(url), 
    () => new TemplateParser()
);

// Use this if pages are on multiple sites, or host name isn't unique
parserFactory.registerRule(
    function(url, dom) {
        return TemplateParser.urlMeetsSelectionCriteria(url) ||
            TemplateParser.domMeetsSelectionCritera(dom); 
    }, 
    () => new TemplateParser()
);
*/

class TemplateParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
        //Optional Parameters:

        /*
        // Minimum delay (in ms) between page requests. Useful for 403 error prevention.
        // If the sites this parser accesses throttles requests or uses cloudflare, it is recommended to set this.
        this.minimumThrottle = 3000;
        */
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    /*
    async getChapterUrls(dom, chapterUrlsUI) {
        // Most common implementation is to find element holding the hyperlinks to 
        // the web pages holding the chapters.  Then call util.hyperlinksToChapterList()
        // to convert the links into a list of URLs the parser will collect.
        let menu = dom.querySelector("div.su-tabs-panes");
        return util.hyperlinksToChapterList(menu);

        // Almost as common, find links on page and convert.
        return [...dom.querySelectorAll("li.wp-manga-chapter.free-chap a")]
            .map(a => util.hyperLinkToChapter(a));

        // Need to walk multiple ToC pages, page by page
        return (await this.walkTocPages(dom, 
            TemplateParser.chaptersFromDom, 
            TemplateParser.nextTocPageUrl, 
            chapterUrlsUI
        ));

        // Can get list of all ToC pages
        let tocPage1chapters = TemplateParser.extractPartialChapterList(dom);
        let urlsOfTocPages  = TemplateParser.getUrlsOfTocPages(dom);
        return (await this.getChaptersFromAllTocPages(tocPage1chapters,
            TemplateParser.extractPartialChapterList,
            urlsOfTocPages,
            chapterUrlsUI
        ));
    }
    */

    // returns the element holding the story content in a chapter
    /*
    findContent(dom) {
        // typical implementation is find node with all wanted content
        // return is the element holding just the wanted content.
        return dom.querySelector("article");
    }
    */

    // title of the story  (not to be confused with title of each chapter)
    /*
    extractTitleImpl(dom) {
        // typical implementation is find node with the Title and return name from title
        // NOTE. Can return Title as a string, or an  HTML element
        return dom.querySelector("h1");
    }
    */

    // author of the story
    // Optional, if not provided, will default to "<unknown>"
    /*
    extractAuthor(dom) {
        // typical implementation is find node with the author's name and return name from title
        // Major points to note
        //   1. Return the Author's name as a string, not a HTML element
        //   2. If can't find Author, call the base implementation
        let authorLabel = dom.querySelector(".meta span a");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }
    */

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    /*
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }
    */

    // load EpubMetaInfo async in local variable to retieve with all other Metadata functions
    // Optional, will default to "return"
    /*
    async loadEpubMetaInfo(){
        let data = (await HttpClient.fetchJson(api)).json;
        this.subject = data.subject;
        ...
        return;
    }
    */

    // Genre of the story
    // Optional, Genre for metadata, if not provided, will default to ""
    /*
    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("[property='genre']")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }
    */

    // Description of the story
    // Optional, Description for metadata, if not provided, will default to ""
    /*
    extractDescription(dom) {
        return dom.querySelector("div [property='description']").textContent.trim();
    }
    */

    // Optional, supply if need to do special manipulation of content
    // e.g. decrypt content
    /*
    customRawDomToContentStep(chapter, content) {
        // for example of this, refer to LnmtlParser
    }
    */

    // Optional, supply if need to do custom cleanup of content
    /*
    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button");
        super.removeUnwantedElementsFromContentElement(element);
    }
    */

    // Optional, supply if individual chapter titles are not inside the content element
    /*
    findChapterTitle(dom) {
        // typical implementation is find node with the Title
        // Return Title element, OR the title as a string
        return dom.querySelector("h3.dashhead-title");
    }
    */

    // Optional, if "next/previous chapter" are nested inside other elements,
    // this says how to find the highest parent element to remove
    /*
    findParentNodeOfChapterLinkToRemoveAt(link) {
        // The links may be wrapped, so need to walk up tree to find the 
        // highest element holding the chapter links.
        // e.g. Following code assumes links are sometimes enclosed in a <strong> tag
        // that is enclosed in a <p> tag.  We want to remove the <p> tag
        // and everything inside it
        let toRemove = util.moveIfParent(link, "strong");
        return util.moveIfParent(toRemove, "p");    
    }
    */

    // Optional, supply if cover image can usually be found on inital web page
    // Notes.
    //   1. If cover image is first image in content section, do not implement this function
    /*
    findCoverImageUrl(dom) {
        // Most common implementation is get first image in specified container. e.g. 
        return util.getFirstImgSrc(dom, "div.td-ss-main-sidebar");
    }
    */

    // Optional, supply if need to chase hyperlinks in page to get all chapter content
    // or site can send challenge pages for some chapters
    /*
    async fetchChapter(url) {
        return (await HttpClient.wrapFetch(url)).responseXML;

        // Handling to catch sites that send challenge pages
        // Note, need to implement isCustomError() and setCustomErrorResponse()
        let options = { parser: this };
        return (await HttpClient.wrapFetch(url, options)).responseXML;
    }
    */

    // Optional, supply these if site can send challenge pages for some chapters
    /*
    // return true if response is a challenge response
    isCustomError(response){
        return (response.responseXML.title == "Just a moment...");
    }

    // what to do if encounter challenge
    setCustomErrorResponse(url, wrapOptions){
        let newresp = {};
        newresp.url = url;
        newresp.wrapOptions = wrapOptions;
        newresp.response = {};
        newresp.response.url = this.RestToUrl(checkedresponse.response.url);
        newresp.response.status = 403;
        return newresp;
    }
    */

    // Optional, supply if need to modify DOM before normal processing steps
    /*
    preprocessRawDom(webPageDom) {
    }
    */

    // Optional, called when user presses the "Pack EPUB" button.
    // Implement if parser needs to do anything after user sets UI settings 
    // but before collecting pages
    /*
    onStartCollecting() {
    }
    */

    // Optional, Return elements from page
    // that are to be shown on epub's "information" page
    /*
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-details")];
    }
    */

    // Optional, Any cleanup operations to perform on the nodes
    // returned by getInformationEpubItemChildNodes
    /*
    cleanInformationNode(node) {
        return node;
    }
    */
}
