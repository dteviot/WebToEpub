/*
  Parser for gutenberg.spiegel.de. 
  Start at Chapter 1, frequently a link like /buch/nnn/1, where nnn is the numbr of the book.
  Derived from:
  Template to use to create a new parser
*/
"use strict";

// Use one or more of these to specify when the parser is to be used

// Use this function if site's host name is sufficient.  
// i.e. All pages are on same site, and use same format.
parserFactory.register("gutenberg.spiegel.de", function() { return new GutenbergDEParser() });

class GutenbergDEParser extends Parser{
    constructor() {
        super();
    }

    // returns promise with the URLs of the chapters to fetch
    // promise is used because may need to fetch the list of URLs from internet
    
    getChapterUrls(dom) {
        // Most common implementation is to find element holding the hyperlinks to 
        // the web pages holding the chapters.  Then call util.hyperlinksToChapterList()
        // to convert the links into a list of URLs the parser will collect.
        let menu = dom.querySelector("ul.gbnav");
        return Promise.resolve(util.hyperlinksToChapterList(menu));        
    };
    

    // returns the element holding the story content in a chapter
    
    findContent(dom) {
        // typical implementation is find node with all wanted content
        // return is the element holding just the wanted content.
        return dom.querySelector("div#gutenb");
    };
    

    // title of the story  (not to be confused with title of each chapter)
    
    extractTitle(dom) {
        // typical implementation is find node with the Title and return name from title
        // NOTE. Return Title as a string, not a HTML element
        return dom.querySelector("h2.title").textContent.trim();
    };
    

    // author of the story
    // Optional, if not provided, will default to "<unknown>"
    
    extractAuthor(dom) {
        // typical implementation is find node with the author's name and return name from title
        // Major points to note

	return dom.querySelector("h3.author").textContent.trim();

        //   1. Return the Author's name as a string, not a HTML element
        //   2. If can't find Author, call the base implementation
        let authorLabel = util.getElement(dom, "strong", e => e.textContent === "Author:");
        return (authorLabel === null) ? super.extractAuthor(dom) : authorLabel.nextElementSibling.textContent;

    };
    

    // language used
    // Optional, if not provided, will default to ISO code for English "en"
    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    };


}
