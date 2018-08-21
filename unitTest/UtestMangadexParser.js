
"use strict";

module("UtestMangadexParser");

QUnit.test("getChapterUrls", function (assert) {
    let done = assert.async(); 
    let dom = new DOMParser().parseFromString(MangadexSample, "text/html");
    return new MangadexParser().getChapterUrls(dom).then(
        function(chapters) {
            assert.equal(2, chapters.length);
            assert.equal("https://mangadex.org/chapter/422459", chapters[0].sourceUrl);
            assert.equal("https://mangadex.org/chapter/424587", chapters[1].sourceUrl);
            done();
        }
    );
});

QUnit.test("jsonToHtmlWithImgTags", function (assert) {
    let json = {
        "hash": "79a3fd70cf0627bc8031afb119fb09b7",
        "server": "https:\/\/s5.mangadex.org\/data\/",
        "page_array": ["F1.png", "F2.png"]
    };
    let out = MangadexParser.jsonToHtmlWithImgTags("https://mangadex.org/chapter/424587", json);
    let actual = [...out.querySelectorAll("img")].map(i => i.src);
    assert.deepEqual(actual, [
        "https://s5.mangadex.org/data/79a3fd70cf0627bc8031afb119fb09b7/F1.png",
        "https://s5.mangadex.org/data/79a3fd70cf0627bc8031afb119fb09b7/F2.png"
    ]);
});

QUnit.test("getInformationEpubItemChildNodes", function (assert) {
    let dom = new DOMParser().parseFromString(MangadexSample, "text/html");
    let parser = new MangadexParser();
    let rows = parser.getInformationEpubItemChildNodes(dom);
    assert.equal(rows.length, 9);
    assert.equal(rows[8].querySelector("div.strong").textContent, "Description:");
});

let MangadexSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Isekai Maou to Shoukan Shoujo Dorei Majutsu (Manga) - MangaDex</title>
    <base href="https://mangadex.org/chapter/424587" />
</head>

<body>

    <div class="container" role="main" id="content">
        <div class="card mb-3">
            <div class="card-body p-0">
                <div class="row edit">
                    <div class="col-xl-3 col-lg-4 col-md-5"><img class="rounded" width="100%" src="/images/manga/15950.jpg?1533304813" /></div>
                    <div class="col-xl-9 col-lg-8 col-md-7">
                        <div class="row m-0 py-1 px-0">
                            <div class="col-lg-3 col-xl-2 strong">Alt name(s):</div>
                            <div class="col-lg-9 col-xl-10">
                                <ul class="list-inline m-0">
                                    <li class='list-inline-item'><span class='fas fa-book fa-fw ' aria-hidden='true'></span> How NOT to Summon a Demon Lord</li>
                                    <li class='list-inline-item'><span class='fas fa-book fa-fw ' aria-hidden='true'></span> Le Roi D&eacute;mon d'un autre monde et la magie d'esclavage des invocatrices</li>
                                </ul>
                            </div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Author:</div>
                            <div class="col-lg-9 col-xl-10"><a href="/?page=search&author=Murasaki Yukiya" title="Other manga by this author">Murasaki Yukiya</a></div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Artist:</div>
                            <div class="col-lg-9 col-xl-10"><a href="/?page=search&artist=Fukuda Naoto" title="Other manga by this artist">Fukuda Naoto</a></div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Demographic:</div>
                            <div class="col-lg-9 col-xl-10"><span class="badge badge-secondary"><a class="genre" href="/?page=search&demo=1" title="Search for Shounen titles">Shounen</a></span></div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Genres:</div>
                            <div class="col-lg-9 col-xl-10"><span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=2'>Action</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=5'>Comedy</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=8'>Drama</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=9'>Ecchi</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=10'>Fantasy</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=12'>Harem</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=23'>Romance</a></span> <span class='badge badge-secondary'><a class='genre' href='/?page=search&genres_inc=41'>Isekai</a></span> </div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Rating:</div>
                            <div class="col-lg-9 col-xl-10"><span class="text-primary"><span class='fas fa-star fa-fw ' aria-hidden='true' title='Rating'></span> 7.46</span> <span class="small"><span class='fas fa-user fa-fw ' aria-hidden='true' title='Users'></span> 394</span></div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Pub. status:</div>
                            <div class="col-lg-9 col-xl-10">Ongoing</div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Stats:</div>
                            <div class="col-lg-9 col-xl-10">
                                <ul class="list-inline m-0">
                                    <li class="list-inline-item text-info"><span class='fas fa-eye fa-fw ' aria-hidden='true' title='Views'></span> 348,073</li>
                                    <li class="list-inline-item text-success"><span class='fas fa-bookmark fa-fw ' aria-hidden='true' title='Follows'></span> 10,000</li>
                                    <li class="list-inline-item"><span class='far fa-file fa-fw ' aria-hidden='true' title='Total chapters'></span> 128</li>
                                </ul>
                            </div>
                        </div>
                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Description:</div>
                            <div class="col-lg-9 col-xl-10">In the MMORPG Cross Reverie, Takuma Sakamoto is so powerful that he is lauded as the &ldquo;Demon Lord&rdquo; by other players. One day, he is summoned to a world outside his own-- but with the same appearance he had in the game! There, he meets two girls who both proclaim themselves to be his Summoner. They perform an Enslavement Ritual to turn him into their Summon... but that&rsquo;s when Takuma&rsquo;s passive ability &lt;&lt;Magic Reflection&gt;&gt; activates! Instead, it is the girls who become enslaved! Though Takuma may be the strongest Sorcerer there is, he has no idea how to talk with other people. It is here he makes his choice: to act based on his persona from the game! &ldquo;Amazing? But of course... I am Diablo, the being known and feared as the Demon Lord!&rdquo; So begins a tale of adventure with an earth-shakingly powerful Demon Lord (or at least someone who acts like one) taking on another world! <strong>[Source: J-Novel Club]</strong></div>
                        </div>

                        <div class='row m-0 py-1 px-0 border-top'>
                            <div class='col-lg-3 col-xl-2 strong'>Links:</div>
                            <div class='col-lg-9 col-xl-10'><ul class='list-inline' style='margin-bottom: 0;'><li class='list-inline-item'><img src='/images/misc/mu.png' /> <a rel='noopener noreferrer' target='_blank' href='https://www.mangaupdates.com/series.html?id=124600'>MangaUpdates</a></li><li class='list-inline-item'><img src='/images/misc/nu.png' /> <a rel='noopener noreferrer' target='_blank' href='https://www.novelupdates.com/series/isekai-maou-to-shoukan-shoujo-dorei-majutsu/'>NovelUpdates</a></li><li class='list-inline-item'><img src='/images/misc/amz.png' /> <a rel='noopener noreferrer' target='_blank' href='https://www.amazon.co.jp/dp/B07FCMHXPR/'>Amazon.co.jp</a></li><li class='list-inline-item'><img src='/images/misc/cdj.png' /> <a rel='noopener noreferrer' target='_blank' href='http://www.cdjapan.co.jp/product/NEOBK-1905450'>CDJapan</a></li><li class='list-inline-item'><img src='/images/misc/mal.png' /> <a rel='noopener noreferrer' target='_blank' href='https://myanimelist.net/manga/91714'>MyAnimeList</a></li><li class='list-inline-item'><span class='fas fa-external-link-alt fa-fw ' aria-hidden='true'></span> <a rel='noopener noreferrer' target='_blank' href='http://www.sevenseasentertainment.com/series/how-not-to-summon-a-demon-lord/'>Official English</a></li></ul></div>
                        </div>

                        <div class="row m-0 py-1 px-0 border-top">
                            <div class="col-lg-3 col-xl-2 strong">Actions:</div>
                            <div class="col-lg-9 col-xl-10">
                                <button class='btn btn-secondary' id='upload_button' disabled title='You need to log in to use this function.'><span class='fas fa-upload fa-fw ' aria-hidden='true' title='Upload'></span> <span class='d-none d-xl-inline'>Upload chapter</span></button>                            <button class='btn btn-secondary ' disabled title='You need to log in to use this function.'><span class='fas fa-bookmark fa-fw ' aria-hidden='true' title='Follow'></span> <span class='d-none d-xl-inline'>Follow</span></button>                            <div class='btn-group '>
                                    <button disabled title='You need to log in to use this function.' type='button' class='btn btn-primary dropdown-toggle' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
                                        <span class='fas fa-star fa-fw ' aria-hidden='true'></span>  <span class='caret'></span>
                                    </button>
                                    <div class='dropdown-menu'><a class=' dropdown-item manga_rating_button' id='10' data-manga-id='15950' href='#'>(10) Masterpiece</a><a class=' dropdown-item manga_rating_button' id='9' data-manga-id='15950' href='#'>(9) Great</a><a class=' dropdown-item manga_rating_button' id='8' data-manga-id='15950' href='#'>(8) Very good</a><a class=' dropdown-item manga_rating_button' id='7' data-manga-id='15950' href='#'>(7) Good</a><a class=' dropdown-item manga_rating_button' id='6' data-manga-id='15950' href='#'>(6) Fine</a><a class=' dropdown-item manga_rating_button' id='5' data-manga-id='15950' href='#'>(5) Average</a><a class=' dropdown-item manga_rating_button' id='4' data-manga-id='15950' href='#'>(4) Bad</a><a class=' dropdown-item manga_rating_button' id='3' data-manga-id='15950' href='#'>(3) Very bad</a><a class=' dropdown-item manga_rating_button' id='2' data-manga-id='15950' href='#'>(2) Horrible</a><a class=' dropdown-item manga_rating_button' id='1' data-manga-id='15950' href='#'>(1) Appalling</a></div>
                                </div>                                                        <button type="button" class="btn btn-warning float-right mr-1" data-toggle="modal" data-target="#manga_report_modal"><span class='fas fa-flag fa-fw ' aria-hidden='true'></span> <span class="d-none d-xl-inline">Report</span></button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Tab panes -->
        <div class="edit tab-content">
            <div class="chapter-container ">
                <div class="row no-gutters">
                    <div class="col ">
                        <div class="chapter-row d-flex row no-gutters p-2 align-items-center border-bottom odd-row">
                            <div class="col col-lg-5 row no-gutters align-items-center flex-nowrap text-truncate pr-1 order-lg-2">
                                <a href='/chapter/425797' class='text-truncate'>Ch. 37.2</a>                                <div></div>
                            </div>
                            <div class="chapter-list-flag col-auto text-center order-lg-4" style="flex: 0 0 2.5em;">
                                <img class='rounded align-text-bottom d-inline-block flag' src='/images/flags/mx.png' alt='Spanish (LATAM)' title='Spanish (LATAM)' />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row no-gutters">
                    <div class="col ">
                        <div class="chapter-row d-flex row no-gutters p-2 align-items-center border-bottom odd-row">
                            <div class="col col-lg-5 row no-gutters align-items-center flex-nowrap text-truncate pr-1 order-lg-2">
                                <a href='/chapter/424587' class='text-truncate'>
                                    <span>Ch. 37.2 </span>
                                    <span>- Demon King and Demon King III</span>
                                </a>                                <div></div>
                            </div>
                            <div class="chapter-list-flag col-auto text-center order-lg-4" style="flex: 0 0 2.5em;">
                                <img class='rounded align-text-bottom d-inline-block flag' src='/images/flags/gb.png' alt='English' title='English' />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row no-gutters">
                    <div class="col ">
                        <div class="chapter-row d-flex row no-gutters p-2 align-items-center border-bottom odd-row">
                            <div class="col col-lg-5 row no-gutters align-items-center flex-nowrap text-truncate pr-1 order-lg-2">
                                <a href='/chapter/422459' class='text-truncate'>
                                    <span>Ch. 37.1 </span>
                                    <span>- Demon King and Demon King III</span>
                                </a>                                <div></div>
                            </div>
                            <div class="chapter-list-flag col-auto text-center order-lg-4" style="flex: 0 0 2.5em;">
                                <img class='rounded align-text-bottom d-inline-block flag' src='/images/flags/gb.png' alt='English' title='English' />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div> <!-- /container -->
</body>
</html>`
