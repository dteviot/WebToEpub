"use strict";

parserFactory.register("sexstories.com", () => new SexStoriesParser());

class SexStoriesParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("tbody");
        return util.hyperlinksToChapterList(menu);
    }

    findContent(dom) {
        return dom.querySelector("div#story_center_panel");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("#content h3:nth-of-type(2)");
    }

    extractAuthor(dom) {
        return dom.querySelector("h3.notice div.left").textContent;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "button, span.title_link, .top_info," +
            " .story_date, .fontSizer, div.block_panel .story_info, #vote_details_div, #rating, #addfavorite," +
            " .title_panel, #bottom_panel, .count_comments, .pager, #comments");
        super.removeUnwantedElementsFromContentElement(element);
    }
}
