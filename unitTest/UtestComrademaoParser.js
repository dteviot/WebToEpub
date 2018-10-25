"use strict";

module("ComrademaoParser");

test("chaptersFromDom", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let chapterUrls = ComrademaoParser.chaptersFromDom(dom);
    assert.equal(chapterUrls.length, 2);
    assert.deepEqual(chapterUrls[1], {
        newArc: null,
        sourceUrl: "https://comrademao.com/?p=562316",
        title: "Six hundred and sixty-six chapter"
    });
});

test("extractTitleImpl", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let parser = new ComrademaoParser();
    let actual = parser.extractTitleImpl(dom);
    assert.equal(actual.textContent, "The Legend of Futian");
});

test("extractAuthor", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let parser = new ComrademaoParser();
    let actual = parser.extractAuthor(dom);
    assert.equal(actual.trim(), "Jing Wu Hen & 净无痕");
});

test("customRawDomToContentStep_removeOriginal", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoChapterSample, "text/html");
    let parser = new ComrademaoParser();
    parser.userPreferences = { removeOriginal: { value: true} };
    let content = parser.findContent(dom);
    parser.customRawDomToContentStep(null, content);
    let paragraphs = [...content.querySelectorAll("p")];
    assert.equal(paragraphs.length, 3);
});

test("customRawDomToContentStep_keepOriginal", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoChapterSample, "text/html");
    let parser = new ComrademaoParser();
    parser.userPreferences = { removeOriginal: { value: false} };
    let content = parser.findContent(dom);
    parser.customRawDomToContentStep(null, content);
    let paragraphs = [...content.querySelectorAll("p")];
    assert.equal(paragraphs.length, 6);
});

test("stringToChapter", function (assert) {
    let chapter = ComrademaoParser.stringToChapter(
        "<a href=\"https:\/\/comrademao.com\/?p=462525\">Chapter 577 The strength of the outbreak<\/a>",
        new DOMParser()
    );
    assert.deepEqual(chapter, {
        newArc: null,
        sourceUrl: "https://comrademao.com/?p=462525",
        title: "Chapter 577 The strength of the outbreak"
    });
});

test("makeChapterUrlsFromAjaxResponse", function (assert) {
    let json = JSON.parse(ComrademaoAjaxResponseSample);
    let chapters = ComrademaoParser.makeChapterUrlsFromAjaxResponse(json);
    assert.equal(chapters.length, 10);
});

test("getUrlforTocAjaxCall", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let url = ComrademaoParser.getUrlforTocAjaxCall(dom);
    assert.equal(url, "https://comrademao.com/wp-admin/admin-ajax.php?action=get_wdtable&table_id=3&wdt_var1=163443");
});

test("getWdtnonce", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let wdtnonce = ComrademaoParser.getWdtnonce(dom);
    assert.equal(wdtnonce, "5b5e209fcb");
});

test("getInformationEpubItemChildNodes", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let parser = new ComrademaoParser();
    let nodes = parser.getInformationEpubItemChildNodes(dom);
    assert.equal(nodes.length, 1);
});

let ComrademaoToCSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>The Legend of Futian &#8211; Comrade Mao</title>
    <base href="https://comrademao.com/novel/the-legend-of-futian/" />
    <link rel='shortlink' href='https://comrademao.com/?p=163443' />
</head>
<body>
    <div class="page-title-product_2">
        <div class="wrap-content"><div class="author" style=""> <img src="https://comrademao.com/wp-content/themes/book-junky/assets/images/author.png" alt=""> Jing Wu Hen &amp; 净无痕</div><h4 style="">The Legend of Futian</h4><div><div class="woocommerce"><div class="woocommerce-product-rating"> <span class="star-rating  bj-color-#7151ed"> <span style="width:0%"></span> </span><span class="bj-rating-counts" style="color:#7151ed;">0 Ratings</span></div></div></div><p style="">In a time when the Divine Prefectures of the East Sea were in great disarray, Emperor Ye Qing and Donghuang the Great appeared to save the day. Under their rule, the prefectures united and all nations as well as their kings have been controlled. However, the legend of these two great heroes becomes altered when Emperor Ye Qing’s name is wiped from the history books after his sudden death. All statues and images of him were destroyed and his name a taboo. Only the legend of Donghuang the Great shall live on. Fifteen years later, a young man by the name of Ye Futian begins his journey in search for his true identity. The legend of Futian was going to be one for the history books.</p></div>
    </div>
    <input type="hidden" id="wdtNonceFrontendEdit" name="wdtNonceFrontendEdit" value="5b5e209fcb">
    <table id="table_1" class="responsive display nowrap data-t data-t wpDataTable dataTable no-footer" style="" data-described-by="table_1_desc" data-wpdatatable_id="3" role="grid">
        <tbody>
            <tr role="row" class="odd">
                <td class="column-post_post_date sorting_1">20/10/2018 11:34 AM</td>
                <td class=" column-post_title_with_link_to_post">
                    <span class="responsiveExpander"></span>
                    <a href="https://comrademao.com/?p=562316">Six hundred and sixty-six chapter</a>
                </td>
            </tr>
            <tr role="row" class="even">
                <td class="column-post_post_date sorting_1">20/10/2018 11:33 AM</td>
                <td class=" column-post_title_with_link_to_post">
                    <span class="responsiveExpander"></span><a href="https://comrademao.com/?p=562315">Chapter 605 Chapter Qingu</a>
                </td>
            </tr>
        </tbody>
    </table>

    <div class="dataTables_paginate paging_full_numbers" id="table_1_paginate" style="display: block;">
        <a class="paginate_button first disabled" aria-controls="table_1" data-dt-idx="0" tabindex="0" id="table_1_first">First</a>
        <a class="paginate_button previous disabled" aria-controls="table_1" data-dt-idx="1" tabindex="0" id="table_1_previous">Previous</a>
        <span>
            <a class="paginate_button current" aria-controls="table_1" data-dt-idx="2" tabindex="0">1</a>
            <a class="paginate_button " aria-controls="table_1" data-dt-idx="3" tabindex="0">2</a>
            <a class="paginate_button " aria-controls="table_1" data-dt-idx="4" tabindex="0">3</a>
            <a class="paginate_button " aria-controls="table_1" data-dt-idx="5" tabindex="0">4</a>
            <a class="paginate_button " aria-controls="table_1" data-dt-idx="6" tabindex="0">5</a>
            <span class="ellipsis">…</span>
            <a class="paginate_button " aria-controls="table_1" data-dt-idx="7" tabindex="0">57</a>
        </span>
        <a class="paginate_button next" aria-controls="table_1" data-dt-idx="8" tabindex="0" id="table_1_next">Next</a>
        <a class="paginate_button last" aria-controls="table_1" data-dt-idx="9" tabindex="0" id="table_1_last">Last</a>
    </div>
</body>
</html>`

let ComrademaoChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Chapter 935: Gigantic Reproductive System - Chinese Fantasy Novels</title>
    <base href="https://comrademao.com/chapter/mtl/the-legend-of-futian/six-hundred-and-sixty-six-chapter/" />
</head>

<body>
<div class="entry-content">
<main id="main" class="site-main" role="main">
Qingu is one of the remains of the Most Holy Palace and a relic of great prestige.<p></p>
<div class="collapse multi-collapse" id="CollapseRaw"><div class="card card-body"><p>&nbsp;&nbsp;&nbsp;&nbsp;由此可见柳狂生此人是怎样的人，人如其名，狂生狂生，哪怕死后，道宫天之骄子，皆不入他眼。</p></div></div>
<p> The reason is not only because of the reputation of Liu Niang, but also because Qingu never really touched Liu’s wild piano and got his approval.</p>
<div class="collapse multi-collapse" id="CollapseRaw"><div class="card card-body"><p>&nbsp;&nbsp;&nbsp;&nbsp;琴谷入口是一处石洞，此刻有不少人来到此地，最前方之人正是叶伏天，他双手环抱古琴，琴曲依旧未断，若断，很可能便会打断琴谷和他之间的共鸣。</p></div></div>
<p> It can be seen that Liu is mad at this person, who is as famous as his name, wild and mad, even after death, the prince of Daogong Tian is not in his eyes.</p>
<div class="collapse multi-collapse" id="CollapseRaw"><div class="card card-body"><p>&nbsp;&nbsp;&nbsp;&nbsp;他能够感受到，这片琴谷之中，蕴藏非常强大的琴道意志力量。</p></div></div>
</div>
</div>
</body>
</html>
`

let ComrademaoAjaxResponseSample =
`{
    "draw": 2,
    "recordsTotal": "383929",
    "recordsFiltered": "561",
    "data": [
        ["05\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=462525\\\">Chapter 577 The strength of the outbreak<\\/a>", "163.443"],
        ["05\\/10\\/2018 11:33 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=462524\\\">The 576th chapter<\\/a>", "163.443"],
        ["04\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=458826\\\">The fifth hundred seventy-five chapter three<\\/a>", "163.443"],
        ["04\\/10\\/2018 11:33 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=458825\\\">Chapter 576 gives way?<\\/a>", "163.443"],
        ["03\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=453743\\\">Chapter 537 The last six<\\/a>", "163.443"],
        ["03\\/10\\/2018 11:33 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=453742\\\">The 576th chapter<\\/a>", "163.443"],
        ["02\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=448154\\\">The fifty-seventh chapter of the first ten battle<\\/a>", "163.443"],
        ["02\\/10\\/2018 11:33 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=448153\\\">The 570th chapter of Baiyuncheng Ergongzi (three more)<\\/a>", "163.443"],
        ["01\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=436116\\\">Chapter 569 The rest of the transformation (two more)<\\/a>", "163.443"],
        ["01\\/10\\/2018 11:34 AM", "<a href=\\\"https:\\/\\/comrademao.com\\/?p=436115\\\">Chapter 558, reaching the top ten<\\/a>", "163.443"]    ]
}
`
