"use strict";

module("AsianHobbyistParser");


test("findUrlOfFirstPageOfChapter", function (assert) {
    let dom = new DOMParser().parseFromString(AsianHobbyistSample1, "text/html");
    let actual = AsianHobbyistParser.findUrlOfFirstPageOfChapter(dom);
    assert.equal(actual, "https://www.asianhobbyist.com/oma-79/");

    dom = new DOMParser().parseFromString(AsianHobbyistSample2, "text/html");
    actual = AsianHobbyistParser.findUrlOfFirstPageOfChapter(dom);
    assert.equal(actual, "https://www.asianhobbyist.com/mn-1/");

    dom = new DOMParser().parseFromString(AsianHobbyistSample5, "text/html");
    actual = AsianHobbyistParser.findUrlOfFirstPageOfChapter(dom);
    assert.equal(actual, "https://www.asianhobbyist.com/mcm-318/");
});

test("isPaged", function (assert) {
    let dom = new DOMParser().parseFromString(AsianHobbyistSample1, "text/html");
    let actual = AsianHobbyistParser.isPaged(dom);
    assert.notOk(actual);

    dom = new DOMParser().parseFromString(AsianHobbyistSample3, "text/html");    
    actual = AsianHobbyistParser.isPaged(dom);
    assert.ok(actual);
});

test("findNextPageUrl", function (assert) {
    let dom = new DOMParser().parseFromString(AsianHobbyistSample1, "text/html");
    let actual = AsianHobbyistParser.findNextPageUrl(dom);
    assert.strictEqual(actual, null);

    dom = new DOMParser().parseFromString(AsianHobbyistSample3, "text/html");    
    actual = AsianHobbyistParser.findNextPageUrl(dom);
    assert.equal(actual, "https://www.asianhobbyist.com/oma-79/2/");

    dom = new DOMParser().parseFromString(AsianHobbyistSample4, "text/html");    
    actual = AsianHobbyistParser.findNextPageUrl(dom);
    assert.strictEqual(actual, null);
});

test("removeNextPageHyperlink", function (assert) {
    let dom = new DOMParser().parseFromString(
        "<a href=\"https://www.asianhobbyist.com/ega-71/3\">Continue on Page 3</a>"+
        "<a href=\"https://www.asianhobbyist.com/ega-71/4/\">Continue on Page 4</a>",
        "text/html"
    );
    AsianHobbyistParser.removeNextPageHyperlink(dom, "https://www.asianhobbyist.com/ega-71/4");
    assert.equal(dom.body.innerHTML, "<a href=\"https://www.asianhobbyist.com/ega-71/3\">Continue on Page 3</a>");
});


let AsianHobbyistSample1 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>One Man Army Chapter 79 &#8211; Asian Hobbyist</title>
    <base href="https://www.asianhobbyist.com/one-man-army-chapter-79/" />
</head>

<body class="post-template-default single single-post postid-24013 single-format-standard themify-fw-4-0-9 themify-simple-1-3-2 skin-default webkit not-ie default_width sidebar1 no-home no-touch builder-parallax-scrolling-active header-horizontal fixed-header">
<div class="entry-content">
<div class="osny-nightmode osny-nightmode--center">
    <div class="osny-night-mode-wp__container">
        <i class="night-mode-wp-moon-o night-mode-wp-moon-icon-size-large"></i>
        <i class="night-mode-wp-light-up night-mode-wp-moon-icon-size-large"></i>
        <input type="checkbox" class="osny-nightmode-switch-wp" id="nightmode-qJm">
        <small class="osny-nightmode__title">Dark Theme</small>
    </div>
</div>
<div class='code-block code-block-14' style='margin: 8px auto; text-align: center; clear: both;'>
    <a href="https://www.asianhobbyist.com/android-mobile-app-live/">Install Mobile app With Offline Browsing</a>
</div>
<div class='code-block code-block-10' style='margin: 8px auto; text-align: center; clear: both;'>
    <a href="https://forum.novelupdates.com/threads/how-does-the-asian-hobbyist-page-function.72718/#post-4308281">Click Here for Help With Chapter Issues</a>
</div>
<div class='code-block code-block-9' style='margin: 8px auto; text-align: center; clear: both;'>
    <img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/plus.png" alt="+" id="plus" style="display:inline;cursor:pointer; height:60px" onclick="changeFontSize_my(2); return false;" /><img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/100.png" alt="100%" id="100" style="display:inline;cursor:pointer; height:50px" onclick="revertStyles_my(2); return false;" /><img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/minus.png" alt="-" id="minus" style="display:inline;cursor:pointer; height:40px" onclick="changeFontSize_my(-2); return false;" />
</div>
<div class='nnl_container'><a class='nnl_next_chapter' href='https://www.asianhobbyist.com/one-man-army-chapter-80/'>Next Chapter</a></div><p><img src="https://cdn.novelupdates.com/images/2016/11/One-Man-Army.jpg" /></p>
<p>Chapter 79 &lt;[episode 41]Hall of Gladiators (2)&gt;</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>Kyaaaaaa!</p>
<p>&nbsp;</p>
<p>&#8216;oh no!&#8217;</p>
<p>As soon as the critical strike burst, the damage was amplified to a nonsense level, and the visuals from the tremendous hit flashed on Red Sun&#8217;s body.</p>
<p>Even though Red Sun saw the Lone King&#8217;s sword was stabbing his heart, he did not think he would fall.</p>
<p>No matter how accurate the sword of his enemy, he can not die from a single strike. No matter the opponent, he has</p>
<div class="post-embed">
    <blockquote class="wp-embedded-content" data-secret="98UbXOuCr4"><p><a href="https://www.asianhobbyist.com/oma-79/">OMA 79</a></p></blockquote>
    <p><iframe class="wp-embedded-content" sandbox="allow-scripts" security="restricted" style="position: absolute; clip: rect(1px, 1px, 1px, 1px);" src="https://www.asianhobbyist.com/oma-79/embed/#?secret=98UbXOuCr4" data-secret="98UbXOuCr4" width="600" height="338" title="&#8220;OMA 79&#8221; &#8212; Asian Hobbyist" marginwidth="0" marginheight="0" scrolling="no"></iframe>
</div>
<div class='nnl_container'><a class='nnl_next_chapter' href='https://www.asianhobbyist.com/one-man-army-chapter-80/'>Next Chapter</a></div><div id="themify_builder_content-24013" data-postid="24013" class="themify_builder_content themify_builder_content-24013 themify_builder">

</div>
</div>
</body>
</html>
`

let AsianHobbyistSample2 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>Maou ni Nattanode 1 &#8211; Asian Hobbyist</title>
    <base href="https://www.asianhobbyist.com/maou-ni-1/" />
</head>
<body class="post-template-default single single-post postid-15794 single-format-standard themify-fw-4-0-9 themify-simple-1-3-2 skin-default webkit not-ie default_width sidebar1 no-home no-touch builder-parallax-scrolling-active header-horizontal fixed-header">
<div class="entry-content">
<div class="osny-nightmode osny-nightmode--center">
    <div class="osny-night-mode-wp__container">
        <i class="night-mode-wp-moon-o night-mode-wp-moon-icon-size-large"></i>
        <i class="night-mode-wp-light-up night-mode-wp-moon-icon-size-large"></i>
        <input type="checkbox" class="osny-nightmode-switch-wp" id="nightmode-hGP">
        <small class="osny-nightmode__title">Dark Theme</small>
    </div>
</div>
<div class='code-block code-block-9' style='margin: 8px auto; text-align: center; clear: both;'>
    <img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/plus.png" alt="+" id="plus" style="display:inline;cursor:pointer; height:60px" onclick="changeFontSize_my(2); return false;" /><img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/100.png" alt="100%" id="100" style="display:inline;cursor:pointer; height:50px" onclick="revertStyles_my(2); return false;" /><img src="https://www.asianhobbyist.com/wp-content/plugins/zoom-widget/elements/images/1/minus.png" alt="-" id="minus" style="display:inline;cursor:pointer; height:40px" onclick="changeFontSize_my(-2); return false;" />
</div>
<div class='nnl_container'><a class='nnl_next_chapter' href='https://www.asianhobbyist.com/maou-ni-2/'>Next Chapter</a></div><p><img src="https://i.imgur.com/Zbs5vl5.jpg?1" /></p>
<p>&nbsp;</p>
<p>Song : <a href="https://www.youtube.com/watch?v=MDjdMxHHmF4">Roxette- Sleeping In My Car</a></p>
<p>&nbsp;</p>
<p>Here is the first chapter enjoy.</p>
<p>Maou ni Nattanode</p>
<p>Chapter 1 It seems like I have grown wings</p>
<p>&nbsp;</p>
<p>“Ah&#8211;”</p>
<p>&nbsp;</p>
<p>I stared at my face and body reflected on the hand mirror from various different angles.</p>
<p>&nbsp;</p>
<p>Black hair, black clothes and the face I have seen countless times now. My face did not quite have any special traits, except the sharp looks, if you count that as one.</p>
<p>Without a tall figure nor a short one, and without a tough body nor a weak one.</p>
<p>&nbsp;</p>
<p>Well, up till that, it is fine.</p>
<p>Only up till that.</p>
<p>&nbsp;</p>
<p>The reason I am staring at myself like this is not because I am a narcissist. I was confirming something particular.</p>
<p>&nbsp;</p>
<p>I changed the angle of the hand mirror and reaffirmed my back.</p>
<p>&nbsp;</p>
<p>Reflected on the mirror, there were &#8212;- wings.</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p><a href="https://www.asianhobbyist.com/mn-1/">Continue Reading Chapter</a></p>
<p>&nbsp;</p>
<div class='nnl_container'><a class='nnl_next_chapter' href='https://www.asianhobbyist.com/maou-ni-2/'>Next Chapter</a></div><div id="themify_builder_content-15794" data-postid="15794" class="themify_builder_content themify_builder_content-15794 themify_builder">

</div>
<div class='code-block code-block-15' style='margin: 8px 0; clear: both;'>
    <a href="https://www.asianhobbyist.com/android-mobile-app-live/">Install Mobile app With Offline Browsing</a>
</div>
</div>
</body>
</html>`

let AsianHobbyistSample3 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>Maou ni Nattanode 1 &#8211; Asian Hobbyist</title>
    <base href="https://www.asianhobbyist.com/oma-79/" />
</head>
<body class="page-template-default page page-id-24014 themify-fw-4-0-9 themify-simple-1-3-2 skin-default webkit not-ie default_width sidebar1 no-home no-touch builder-parallax-scrolling-active header-horizontal fixed-header">
<div class="acp_wrapper">
<div id="acp_wrapper" class="acp_wrapper">
    <ul class="paging_btns" id="acp_paging_menu">
        <li style="display: none; width: 195.25px;" class="acp_previous_page button_style" id="item4"><a href="https://www.asianhobbyist.com/oma-79/4/"><div class="acp_title"><font style="font-size:100%" my="my">Previous Page</font></div></a></li>
        <li style="width: 195.25px;" class="acp_next_page button_style" id="item2"><a href="https://www.asianhobbyist.com/oma-79/2/"><div class="acp_title"><font style="font-size:100%" my="my">Next Page</font></div></a></li>
    </ul>
    <div id="acp_content" class="acp_content">
        <p><img src="https://cdn.novelupdates.com/images/2016/11/One-Man-Army.jpg"></p>
        <p><font style="font-size:100%" my="my">Chapter 79 &lt;[episode 41]Hall of Gladiators (2)&gt;</font></p>
        <p><font style="font-size:100%" my="my">Kyaaaaaa!</font></p>
        <p>&nbsp;</p>
    </div>
    <ul class="paging_btns" id="acp_paging_menu"><li style="display: none; width: 195.25px;" class="acp_previous_page button_style" id="item4"><a href="https://www.asianhobbyist.com/oma-79/4/"><div class="acp_title"><font style="font-size:100%" my="my">Previous Page</font></div></a></li><li style="width: 195.25px;" class="acp_next_page button_style" id="item2"><a href="https://www.asianhobbyist.com/oma-79/2/"><div class="acp_title"><font style="font-size:100%" my="my">Next Page</font></div></a></li></ul>
</div>
</div>
</body>
</body>
</html>`

let AsianHobbyistSample4 =
`<!DOCTYPE html>
<html lang="en-US">
<head>
    <title>One Man Army Chapter 79 &#8211; Asian Hobbyist</title>
    <base href="https://www.asianhobbyist.com/ega-71/3/" />
</head>

<body class="post-template-default single single-post postid-24013 single-format-standard themify-fw-4-0-9 themify-simple-1-3-2 skin-default webkit not-ie default_width sidebar1 no-home no-touch builder-parallax-scrolling-active header-horizontal fixed-header">
</body>
<ul class="paging_btns" id="acp_paging_menu">
    <li style="" class="acp_previous_page button_style" id="item2"><a href="https://www.asianhobbyist.com/ega-71/2/"><div class="acp_title">Previous Page</div></a></li>
    <li style="display:none;" class="acp_next_page button_style" id="item1"><a href="https://www.asianhobbyist.com/ega-71/"><div class="acp_title" >Next Page</div></a></li>
</ul>
</body>
</html>`

let AsianHobbyistSample5 =
`<!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Maou ni Nattanode 1 &#8211; Asian Hobbyist</title>
    <base href="https://www.asianhobbyist.com/magi-craft-meister-chapter-318/" />
</head>
<body>
    <div class="entry-content">
        <p><img src="https://cdn.novelupdates.com/images/2015/07/magicraftmeister.jpg" /></p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <p>https://www.asianhobbyist.com/mcm-318/</p>
        <div id="themify_builder_content-23948" data-postid="23948" class="themify_builder_content themify_builder_content-23948 themify_builder">
        </div>
    </div>
</body>
</html>`
