/*
    Wrapper for EPUB information
*/

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
        this.uuid = "No UUID supplied";
        this.title = "No title supplied";
        this.author = "No author supplied";
        this.language = "en";
        this.fileName = "web.epub";
        this.seriesName = null;
        this.seriesIndex = null;
        this.styleSheet = EpubMetaInfo.getDefaultStyleSheet();
    }

    static getDefaultStyleSheet() {
        return "img { max-width: 100%; max-height: 100%; padding: 0; margin: 0; } " +
               "div.svg_outer { display: block; margin-bottom: 0; margin-left: 0; margin-right: 0; margin-top: 0; padding-bottom: 0; padding-left: 0; "+
                           "padding-right: 0; padding-top: 0; text-align: left } " +
               "div.svg_inner { display: block; text-align: center } "
        ;
    }
}
