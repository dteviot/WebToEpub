"use strict";

module("ComrademaoParser");

test("extractPartialChapterList", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let chapterUrls = ComrademaoParser.extractPartialChapterList(dom);
    assert.equal(chapterUrls.length, 10);
    assert.deepEqual(chapterUrls[8], {
        newArc: null,
        sourceUrl: "https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1993/",
        title: "Shoujo Grand Summoning Chapter 1993"
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

test("listUrlsHoldingChapterLists", function (assert) {
    let dom = new DOMParser().parseFromString(ComrademaoToCSample, "text/html");
    let actual = ComrademaoParser.listUrlsHoldingChapterLists(dom);
    assert.equal(actual.length, 201);
    assert.equal(actual[0], "https://comrademao.com/novel/shoujo-grand-summoning/");
    assert.equal(actual[200], "https://comrademao.com/novel/shoujo-grand-summoning/page/201/")
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

let ComrademaoToCSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Shoujo Grand Summoning &#8211; Comrade Mao</title>
    <base href="https://comrademao.com/novel/shoujo-grand-summoning/" />
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
    <table class="table table-hover">
    <thead><tr><th>Date</th><th>Chapter</th></tr></thead>
    <tbody>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-epilogue/">Shoujo Grand Summoning Chapter epilogue</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-2000/">Shoujo Grand Summoning Chapter 2000</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1999/">Shoujo Grand Summoning Chapter 1999</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1998/">Shoujo Grand Summoning Chapter 1998</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1997/">Shoujo Grand Summoning Chapter 1997</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1996/">Shoujo Grand Summoning Chapter 1996</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1995/">Shoujo Grand Summoning Chapter 1995</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1994/">Shoujo Grand Summoning Chapter 1994</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1993/">Shoujo Grand Summoning Chapter 1993</a></td></tr>
    <tr><td>December 24, 2018</td><td><a href="https://comrademao.com/mtl/shoujo-grand-summoning/shoujo-grand-summoning-chapter-1992/">Shoujo Grand Summoning Chapter 1992</a></td></tr>
    </tbody>
    </table>
    <nav class="pagination pagination-lg text-center">
        <div class="column">
            <span aria-current='page' class='page-numbers current'>1</span>
            <a class='page-numbers' href='https://comrademao.com/novel/shoujo-grand-summoning/page/2/'>2</a>
            <a class='page-numbers' href='https://comrademao.com/novel/shoujo-grand-summoning/page/3/'>3</a>
            <span class="page-numbers dots">&hellip;</span>
            <a class='page-numbers' href='https://comrademao.com/novel/shoujo-grand-summoning/page/201/'>201</a>
            <a class="next page-numbers" href="https://comrademao.com/novel/shoujo-grand-summoning/page/2/">Next &raquo;</a>
        </div><div class="column text-right hidden-xs-down"></div>
    </nav>
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
