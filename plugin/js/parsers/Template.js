/*
  Template to use to create a new parser
*/
"use strict";

// Use one or more of these to specify when the parser is to be used
/*
// Use this function if site's host name is sufficient.  
// i.e. All pages are on same site, and use same format.
parserFactory.register("template.org", function() { return new TemplateParser() });

// Use this if pages are on multiple sites, or host name isn't unique
parserFactory.registerRule(
    function(url, dom) {
        return TemplateParser.urlMeetsSelectionCriteria(url) ||
            TemplateParser.domMeetsSelectionCritera(dom); 
    }, 
    function() { return new TemplateParser() }
);
*/

class TemplateParser extends Parser{
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    /*
    getChapterUrls(dom) {
        // Most common implementation is to find element holding the hyperlinks to 
        // the web pages holding the chapters.  Then call util.hyperlinksToChapterList()
        // to convert the links into a list of URLs the parser will collect.
        let menu = dom.querySelector("div.su-tabs-panes");
        return Promise.resolve(util.hyperlinksToChapterList(menu));        
    };
    */

    // returns the element holding the story content in a chapter
    /*
    findContent(dom) {
        // typical implementation is find node with all wanted content
        // return is the element holding just the wanted content.
        return dom.querySelector("article");
    };
    */

    // title of the story  (not to be confused with title of each chapter)
    /*
    extractTitle(dom) {
        // typical implementation is find node with the Title and return name from title
        // NOTE. Return Title as a string, not a HTML element
        return dom.querySelector("h1").textContent.trim();
    };
    */

    // author of the story
    // Optional, if not provided, will default to "<unknown>"
    /*
    extractAuthor(dom) {
        // typical implementation is find node with the author's name and return name from title
        // Major points to note
        //   1. Return the Author's name as a string, not a HTML element
        //   2. If can't find Author, call the base implementation
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextElementSibling.textContent;
    };
    */

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    /*
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    };
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
        // for example of this, refer to Wikipedia parser
    }
    */

    // Optional, supply if individual chapter titles are not inside the content element
    /*
    findChapterTitle(dom) {
        // typical implementation is find node with the Title
        // Return Title element, NOT the title as a string
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
    /*
    fetchChapter(url) {
        return HttpClient.wrapFetch(url).then(function (xhr) {
            Promise.resolve(xhr.responseXML);
        });
    }
    */

    // Optional, supply if source has 100s of chapters and there's lots of
    // elements in DOM that are not included in the epub.
    /*
    removeUnusedElementsToReduceMemoryConsumption(chapterDom) {
    }
    */

    // Optional, called when user presses the "Pack EPUB" button.
    // Implement if parser needs to do anything after user sets UI settings 
    // but before collecting pages
    /*
    onStartCollecting() {
    }
    */

    // Optional, Return elements from page used to get Chapter URLs
    // that are to be shown on epub's "information" page
    /*
    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-details")];
    }
    */
}
