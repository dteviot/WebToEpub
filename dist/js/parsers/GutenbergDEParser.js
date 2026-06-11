/*
  Parser for gutenberg.spiegel.de. 
  Start at Chapter 1, frequently a link like /buch/nnn/1, where nnn is the gutenberg book number.
  Derived from:
  Template to use to create a new parser
*/
"use strict";

// Use one or more of these to specify when the parser is to be used

// Use this function if site's host name is sufficient.  
// i.e. All pages are on same site, and use same format.
//dead url/ parser
parserFactory.register("gutenberg.spiegel.de", () => new GutenbergDEParser());

class GutenbergDEParser extends Parser {
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
    }
    

    // returns the element holding the story content in a chapter
    
    findContent(dom) {
        // typical implementation is find node with all wanted content
        // return is the element holding just the wanted content.
        return dom.querySelector("div#gutenb");
    }
    

    // title of the story  (not to be confused with title of each chapter)
    
    extractTitleImpl(dom) {
        // typical implementation is find node with the Title and return name from title
        // NOTE. Return Title as a string, not a HTML element

        // this works if chapter 1 contains a cover with separate class attributes 
        let titleElem=dom.querySelector("h2.title");
        if (null != titleElem) return titleElem.textContent.trim();

        // else rely on the div showing a breadcrumb 
        let gbbreadcrumb=dom.querySelector("div.gbbreadcrumb");
        let titleE=gbbreadcrumb.firstElementChild.nextElementSibling.nextElementSibling;
        return titleE;
    }
    

    // author of the story
    // Optional, if not provided, will default to "<unknown>"
    
    extractAuthor(dom) {
        // typical implementation is find node with the author's name and return name from title
        // Major points to note

        let authorElem=dom.querySelector("h3.author");
        if (null != authorElem) return authorElem.textContent.trim();

        let gbbreadcrumb=dom.querySelector("div.gbbreadcrumb");
        let authorA=gbbreadcrumb.firstElementChild.nextElementSibling;
        if (authorA) return authorA.textContent.trim();

        return super.extractAuthor(dom);
    }
}
