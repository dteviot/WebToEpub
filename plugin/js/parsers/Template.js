/*
  Template to use to create a new parser
*/
"use strict";

// Use one or more of these to specify when the parser is to be used
/*
parserFactory.register("template.org", function() { return new TemplateParser() });
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
    getChapterUrls(dom) {
    };

    // returns the element holding the story content in a chapter
    findContent(dom) {
    };

    // title of the story
    extractTitle(dom) {
    };

    // author of the story
    extractAuthor(dom) {
    };

    // language used
    extractLanguage(dom) {
    };

    // Optional, supply if need to do special manipulation of content
    // e.g. decrypt content
    /*
    customRawDomToContentStep(chapter, content) {
    }
    */

    // Optional, supply if need to do custom cleanup of content
    /*
    removeUnwantedElementsFromContentElement(element) {
    }
    */

    // Optional, supply if individual chapter titles are not inside the content element
    /*
    findChapterTitle(dom) {
    }
    */

    // Optional, if "next/previous chapter" are nested inside other elements,
    // this says how to find the highest parent element to remove
    /*
    findParentNodeOfChapterLinkToRemoveAt(dom) {
    }
    */

    // Optional, supply if cover image can usually be found on inital web page
    // Note, if this is supplied, populateUI() must also be supplied
    /*
    findCoverImageUrl(dom) {
    }
    */

    // Optional, supply if user should be able to specify a cover image
    /*
    populateUI(dom) {
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

    // Optional, called when user presses the "Pack EPUB" button.
    // Implement if parser needs to do anything after user sets UI settings 
    // but before collecting pages
    /*
    onStartCollecting() {
    }
    */
}
