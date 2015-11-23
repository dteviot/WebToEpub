/*
    Wrapper for EPUB information
*/

/*
    Any EPUB we create should have following info
    <param name="uuid" type="string">identifier for this EPUB.  (i.e. "origin" URL story was downloaded from)</param>
    <param name="title" type="string">The Title of the story</param>
    <param name="author" type="string">The writer of the story</param>
    <param name="language" type="string">Language code of story. Defaults to "en" (English)</param>
*/
function EpubMetaInfo() {
    this.uuid = "No UUID supplied";
    this.title = "No title supplied";
    this.author = "No author supplied";
    this.language = "en";
}
