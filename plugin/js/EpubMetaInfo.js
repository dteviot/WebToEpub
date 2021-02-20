/*
    Wrapper for EPUB information
*/

"use strict";

/*
    Any EPUB we create should have following info
    <param name="uuid" type="string">identifier for this EPUB.  (i.e. "origin" URL story was downloaded from)</param>
    <param name="title" type="string">The Title of the story</param>
    <param name="author" type="string">The writer of the story</param>
    <param name="language" type="string">Language code of story. Defaults to "en" (English)</param>
    <param name="seriesName" type="string">If book is part of series, has name of series.  null if not part of a series</param>
    <param name="seriesIndex" type="string">If book is part of series, has index of book in series.  null if not part of a series</param>
*/
class EpubMetaInfo {
    constructor () {
        this.uuid = chrome.i18n.getMessage("defaultUUID");
        this.title = chrome.i18n.getMessage("defaultTitle");
        this.author = chrome.i18n.getMessage("defaultAuthor");

        this.language = "en";
        this.fileName = "web.epub";
        this.subject = "";
        this.description = "";
        this.seriesName = null;
        this.seriesIndex = null;
        this.styleSheet = EpubMetaInfo.getDefaultStyleSheet();
        this.translator = null;
        this.fileAuthorAs = null;
    }

    getFileAuthorAs() {
        return (this.fileAuthorAs === null) ? this.author : this.fileAuthorAs;
    }

    static getDefaultStyleSheet() {
        return ""+
        // Style for svg images. I got this from BTE-Gen epunbs. Works nicely.
        "div.svg_outer {\r"+
        "   display: block;\r"+
        "   margin-bottom: 0;\r"+
        "   margin-left: 0;\r"+
        "   margin-right: 0;\r"+
        "   margin-top: 0;\r"+
        "   padding-bottom: 0;\r"+
        "   padding-left: 0;\r"+
        "   padding-right: 0;\r"+
        "   padding-top: 0;\r"+
        "   text-align: left;\r"+
        "}\r"+
        "div.svg_inner {\r"+
        "   display: block;\r"+
        "   text-align: center;\r"+
        "}\r"+

        // Centered headings and some margin to make sure it's not too close to the content.
        "h1, h2 {\r"+
        "   text-align: center;\r"+
        "   page-break-before: always;\r"+
        "   margin-bottom: 10%;\r"+
        "   margin-top: 10%;\r"+
        "}\r"+
        "h3, h4, h5, h6 {\r"+
        "   text-align: center;\r"+
        "   margin-bottom: 15%;\r"+
        "   margin-top: 10%;\r"+
        "}\r"+

        // Style for lists. Calibre sometimes has issues with the placement of lists, this fixes it.
        "ol, ul {\r"+
        "   padding-left: 8%;\r"+
        "}\r"+

        "body {\r"+
        "  margin: 2%;\r"+
        "}\r"+

        //Breaks extremely long words, screams, wails etc to fit viewer window.
        "p {\r"+
        "  overflow-wrap: break-word;\r"+
        "}\r"+

        // Prevent texts inside mutliple definition list tags going outside viewer window.
        // Example https://www.baka-tsuki.org/project/index.php?title=The_Unexplored_Summon_Blood_Sign:Volume2_Opening2
        // It looks okay in a browser but in devices with small screen, it's almost unreadable.
        "dd, dt, dl {\r"+
        "  padding: 0;\r"+
        "  margin: 0;\r"+
        "}\r"+

        "img {\r"+
        "   display: block;\r"+
        "   min-height: 1em;\r"+
        "   max-height: 100%;\r"+
        "   max-width: 100%;\r"+
        "   padding-bottom: 0;\r"+
        "   padding-left: 0;\r"+
        "   padding-right: 0;\r"+
        "   padding-top: 0;\r"+
        "   margin-left: auto;\r"+
        "   margin-right: auto;\r"+
        "   margin-bottom: 2%;\r"+
        "   margin-top: 2%;\r"+
        "}\r"+

        // images embedded in sentances (e.g. Emoji)
        "img.inline {\r"+
        "   display: inline;\r"+
        "   min-height: 1em;\r"+
        "   margin-bottom: 0;\r"+
        "   margin-top: 0;\r"+
        "}\r"+

        // differentiate caption text from body text 
       ".thumbcaption {\r"+
       "  display: block;\r"+
       "  font-size: 0.9em;\r"+
       "  padding-right: 5%;\r"+
       "  padding-left: 5%;\r"+
       "}\r"+
       
        // To make hr tags more visible. BT doesn't use them very often but other sites might.
        "hr {\r"+
        "   color: black;\r"+
        "   background-color: black;\r"+
        "   height: 2px;\r"+
        "}\r"+

        // Styling all links.
        "a:link {\r"+
        "   text-decoration: none;\r"+
        "   color: #0B0080;\r"+
        "}\r"+
        "a:visited {\r"+
        "   text-decoration: none;\r"+
        "}\r"+
        "a:hover {\r"+
        "   text-decoration: underline;\r"+
        "}\r"+
        "a:active {\r"+
        "   text-decoration: underline;\r"+
        "}"+

        "table {\r"+
        "   width: 90%;\r"+
        "   border-collapse: collapse;\r"+
        "}\r"+
        "table, th, td {\r"+
        "   border: 1px solid black;\r"+
        "}\r";
    }
}
