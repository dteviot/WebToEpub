/*
    Selects parser based on current URL
*/

"use strict";

function ParserFactory(url) {
    let parsers = [
        new ArchiveOfOurOwnParser(),
        new FanFictionParser()
    ];
    return parsers.filter(p => p.canParse(url));
}
