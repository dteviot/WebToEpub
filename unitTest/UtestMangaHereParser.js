
"use strict";

module("MangaHereParser");


test("extractFilenameFromClearText", function (assert) {
    let actual = MangaHereParser.extractFilenameFromClearText(
        "function dm5imagefun(){var pix=\"//a.mangahere.cc/store/manga/11110/061.1/compressed\";var pvalue=[\"/k20190103_161010_2748.jpg?token=c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a&ttl=1548025200\"]"
    );
    assert.equal(actual, "http://a.mangahere.cc/store/manga/11110/061.1/compressed/k20190103_161010_2748.jpg?token=c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a&ttl=1548025200");
});

test("decrypt", function (assert) {
    let actual = MangaHereParser.decrypt(
        "l b(){3 4=\"//a.e.9/5/c/6/7.1/8\";3 2=[\"/k.j?o=n&m=h\"];f(3 i=0;i<2.g;i++){p(i==0){2[i]=\"//a.e.9/5/c/6/7.1/8\"+2[i];t}2[i]=4+2[i]}r 2}3 d;d=b();q=s;",
        30,
        30,
        "||pvalue|var|pix|store|11110|061|compressed|cc||dm5imagefun|manga||mangahere|for|length|1548025200||jpg|k20190103_161010_2748|function|ttl|c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a|token|if|currentimageid|return|14300825|continue".split("|"),
        0,
        {}
    );
    let filtered = MangaHereParser.extractFilenameFromClearText(actual);
    assert.equal(filtered, "http://a.mangahere.cc/store/manga/11110/061.1/compressed/k20190103_161010_2748.jpg?token=c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a&ttl=1548025200");
});

test("decryptChapterFun", function (assert) {
    let rawInput = `eval(function(p,a,c,k,e,d){e=function(c){return(c<a?"":e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)d[e(c)]=k[c]||e(c);k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1;};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p;}('l f(){3 j="//a.8.c/g/4/7/5.1/e";3 2=["/o.h?6=m&9=b","/n.h?6=p&9=b"];k(3 i=0;i<2.q;i++){v(i==0){2[i]="//a.8.c/g/4/7/5.1/e"+2[i];s}2[i]=j+2[i]}t 2}3 d;d=f();r=u;',32,32,'||pvalue|var|manga|061|token|11110|mangahere|ttl||1548025200|cc||compressed|dm5imagefun|store|jpg||pix|for|function|2523bca6b6e10783845bc524dbec18a73454a867|k20190103_161010_2748|k20190103_161010_2747|c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a|length|currentimageid|continue|return|14300828|if'.split('|'),0,{}))`;
    let actual = MangaHereParser.decryptChapterFun(rawInput)
    assert.deepEqual(actual, 
        [
            "http://a.mangahere.cc/store/manga/11110/061.1/compressed/k20190103_161010_2747.jpg?token=2523bca6b6e10783845bc524dbec18a73454a867&ttl=1548025200",
            "http://a.mangahere.cc/store/manga/11110/061.1/compressed/k20190103_161010_2748.jpg?token=c9cbbe3a58535b9040d5d23708a3d5d7d6d2a89a&ttl=1548025200"
        ]
    );
});

QUnit.test("makeImgJsonUrls", function (assert) {
    let dom = new DOMParser().parseFromString(MangaHereSample, "text/html");
    let actual = MangaHereParser.makeImgJsonUrls("http://www.mangahere.cc/manga/isekai_nonbiri_nouka/c038/1.html", dom);
    assert.equal(actual.length, 5);
    assert.equal(actual[0], "http://www.mangahere.cc/manga/isekai_nonbiri_nouka/c038/chapterfun.ashx?cid=549660&page=1");
    assert.equal(actual[4], "http://www.mangahere.cc/manga/isekai_nonbiri_nouka/c038/chapterfun.ashx?cid=549660&page=5");
});

let MangaHereSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Isekai Nonbiri Nouka 38 - Read Isekai Nonbiri Nouka Chapter 38 Online - Page 1</title>
    <meta name="og:url" content="http://www.mangahere.co/manga/isekai_nonbiri_nouka/c038/1.html" />
</head>
<body class="reader-page">
    <script type="text/javascript" src="//static.mangahere.cc/v201901181/mangahere/js/jquery-1.8.3.min.js"></script>
    <script type="text/javascript">        var csshost = "http://static.mangahere.cc/v201901181/mangahere/"; var comicid = 28771; var chapterid = 549660; var userid = 0; var imagepage = 4; var imagecount = 5; var pagerrefresh = false; var pagetype = 2; var postpageindex = 1; var postpagecount = 0; var postcount = 0; var postsort = 0; var topicId = 0; var prechapterurl = "/manga/isekai_nonbiri_nouka/c037/1.html"; var nextchapterurl = "/manga/isekai_nonbiri_nouka/c039/1.html";    </script>
</body>
</html>`
