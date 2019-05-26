"use strict";

module("ComrademaoParser");

test("chaptersFromDom", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let chapterUrls = ComrademaoParser.chaptersFromDom(dom);
    assert.equal(chapterUrls.length, 3);
    assert.deepEqual(chapterUrls[2], {
        newArc: null,
        sourceUrl: "https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-epilogue/",
        title: "Shoujo Grand Summoning Chapter epilogue"
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

test("getUrlforTocAjaxCall", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let url = ComrademaoParser.getUrlforTocAjaxCall(dom);
    assert.equal(url, "https://comrademao.com/wp-admin/admin-ajax.php?action=movie_datatables&start=0&length=10000&p2m=2370820");
});

test("makeChapterUrlsFromAjaxResponse", function (assert) {
    let chapters = ComrademaoParser.makeChapterUrlsFromAjaxResponse(ComrademaoAjaxResponseSample);
    assert.equal(chapters.length, 4);
    assert.deepEqual(chapters[0], {
        newArc: null,
        sourceUrl: "https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1998/",
        title: "Shoujo Grand Summoning Chapter 1998"
    });
});

test("customRawDomToContentStep_removeOriginal", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoChapterSample, "text/html");
    let parser = new ComrademaoParser();
    parser.userPreferences = { removeOriginal: { value: true} };
    let content = parser.findContent(dom);
    parser.customRawDomToContentStep(null, content);
    let paragraphs = [...content.querySelectorAll("p")];
    assert.equal(paragraphs.length, 2);
});

test("customRawDomToContentStep_keepOriginal", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoChapterSample, "text/html");
    let parser = new ComrademaoParser();
    parser.userPreferences = { removeOriginal: { value: false} };
    let content = parser.findContent(dom);
    parser.customRawDomToContentStep(null, content);
    let paragraphs = [...content.querySelectorAll("p")];
    assert.equal(paragraphs.length, 4);
});

test("getInformationEpubItemChildNodes", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let parser = new ComrademaoParser();
    let nodes = parser.getInformationEpubItemChildNodes(dom);
    assert.equal(nodes.length, 1);
});

test("findChapterTitle", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoChapterSample, "text/html");
    let parser = new ComrademaoParser();
    let title = parser.findChapterTitle(dom);
    assert.equal(title, "Shoujo Grand Summoning Chapter 1994");
});

let ComrademaoToCSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Shoujo Grand Summoning &#8211; Comrade Mao</title>
    <base href="https://comrademao.com/novel/shoujo-grand-summoning/" />
    <link rel="shortlink" href="https://comrademao.com/?p=2370820">
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

    <div class="content">
    <table id="chapters" class="table table-sm table-hover dataTable no-footer" role="grid" aria-describedby="chapters_info" style="width: 684px;">
        <thead>
            <tr role="row"><th class="sorting_disabled" rowspan="1" colspan="1" style="width: 197px;">Date</th><th class="sorting_disabled" rowspan="1" colspan="1" style="width: 455px;">Title</th></tr>
        </thead>
        <tbody>
            <tr role="row" class="odd"><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-epilogue/">Shoujo Grand Summoning Chapter epilogue</a></td></tr>
            <tr role="row" class="even"><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-2000/">Shoujo Grand Summoning Chapter 2000</a></td></tr>
            <tr role="row" class="odd"><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1999/">Shoujo Grand Summoning Chapter 1999</a></td></tr>
        </tbody>
    </table>
    <ul class="pagination">
        <li class="paginate_button previous disabled" id="chapters_previous"><a href="#" aria-controls="chapters" data-dt-idx="0" tabindex="0">Previous</a></li>
        <li class="paginate_button active"><a href="#" aria-controls="chapters" data-dt-idx="1" tabindex="0">1</a></li>
        <li class="paginate_button "><a href="#" aria-controls="chapters" data-dt-idx="2" tabindex="0">2</a></li>
        <li class="paginate_button "><a href="#" aria-controls="chapters" data-dt-idx="3" tabindex="0">3</a></li>
        <li class="paginate_button "><a href="#" aria-controls="chapters" data-dt-idx="4" tabindex="0">4</a></li>
        <li class="paginate_button "><a href="#" aria-controls="chapters" data-dt-idx="5" tabindex="0">5</a></li>
        <li class="paginate_button disabled" id="chapters_ellipsis"><a href="#" aria-controls="chapters" data-dt-idx="6" tabindex="0">…</a></li><li class="paginate_button "><a href="#" aria-controls="chapters" data-dt-idx="7" tabindex="0">201</a></li>
        <li class="paginate_button next" id="chapters_next"><a href="#" aria-controls="chapters" data-dt-idx="8" tabindex="0">Next</a></li>
    </ul>
</div>
</body>
</html>`

let ComrademaoChapterSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>>Shoujo Grand Summoning Chapter 1994 &#8211; Comrade Mao</title>
    <base href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1994/" />
</head>

<body>
<main id="main" class="site-main" role="main">
<div class="entry-content">
<div class="container">
<a href="#raw1" data-toggle="collapse">
    <p>    Above the black cloud layer, Beast King was floating in the air, watching the battlefield below, his face gradually ugly.</p>
</a>
<div id="raw1" class="collapse">
    <p>    在那黑压压的乌云层上方，兽王正临空悬浮在了这里，看着下方的战场，脸色渐渐的难看了起来。</p>
</div>
</div>	<div class="container">
<a href="#raw2" data-toggle="collapse">
    <p>    Since the beginning of this war, ten minutes later, the first Pseudo Beast King was wiped out by the Magicannon of Kazami Yuuka. At the same time, the number of the Magical Beast, which is about Hundred Thousand, has all died in the hands of Kazami Yuuka.</p>
</a>
<div id="raw2" class="collapse">
    <p>    自这场大战掀开序幕，十分钟以后，第一个伪兽王在风见幽香的魔炮下灰飞烟灭，同时，数量大约在十万左右的飞行魔兽也已经全部死在风见幽香的手中。</p>
</div>
</div>

</div>
</div>
</body>
</html>
`
let ComrademaoAjaxResponseSample = {
    "draw": 0,
    "recordsTotal": 2001,
    "recordsFiltered": 2001,
    "data": [
        ["December 24, 2018", "<a href=\"https:\/\/comrademao.com\/mtl\/shoujo-grand-summoning\/shoujo-grand-summoning-chapter-epilogue\/\">Shoujo Grand Summoning Chapter epilogue<\/a>"],
        ["December 24, 2018", "<a href=\"https:\/\/comrademao.com\/mtl\/shoujo-grand-summoning\/shoujo-grand-summoning-chapter-2000\/\">Shoujo Grand Summoning Chapter 2000<\/a>"],
        ["December 24, 2018", "<a href=\"https:\/\/comrademao.com\/mtl\/shoujo-grand-summoning\/shoujo-grand-summoning-chapter-1999\/\">Shoujo Grand Summoning Chapter 1999<\/a>"],
        ["December 24, 2018", "<a href=\"https:\/\/comrademao.com\/mtl\/shoujo-grand-summoning\/shoujo-grand-summoning-chapter-1998\/\">Shoujo Grand Summoning Chapter 1998<\/a>"]
    ]
};
