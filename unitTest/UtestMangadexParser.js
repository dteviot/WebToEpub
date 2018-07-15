
"use strict";

module("UtestMangadexParser");

QUnit.test("findContent", function (assert) {
    let dom = new DOMParser().parseFromString(
        MangadexSample, "text/html");
    let parser = new MangadexParser();
    let out = parser.findContent(dom);
    let images = [...out.querySelectorAll("img")];
    assert.equal(images.length, 32);
    assert.equal(images[0].src, "https://mangadex.org/data/8ca1fa56082f0ffd8694447119e47e96/Z1.jpg");
});

QUnit.test("getInformationEpubItemChildNodes", function (assert) {
    let dom = new DOMParser().parseFromString(
        MangadexSample, "text/html");
    let parser = new MangadexParser();
    let out = parser.getInformationEpubItemChildNodes(dom);
    let rows = [...out[0].querySelectorAll("tr")];
    assert.equal(rows.length, 10);
    assert.equal(rows[9].querySelector("th").textContent, "Links:");
});

let MangadexSample =
`<!DOCTYPE html>
<html lang="en">
<head>
    <title>Vol. 1 Ch. 4 (Sekai Saikyou no Kouei: Meikyuukoku no Shinjin Tansakusha) - MangaDex</title>
    <base href="https://mangadex.org/manga/25623/sekai-saikyou-no-kouei-meikyuukoku-no-shinjin-tansakusha" />
</head>

<body>
<div class="col-sm-9">
				<table class="table table-condensed">
					<tbody><tr style="border-top: 0;">
						<th width="105px">Alt name(s):</th>
						<td>
							<ul class="list-inline" style="margin-bottom: 0;">
							<li><span class="fas fa-book fa-fw" aria-hidden="true" title=""></span> World Strongest Rearguard – Labyrinth Country and Dungeon Seekers</li><li><span class="fas fa-book fa-fw" aria-hidden="true" title=""></span> 世界最強の後衛 ～迷宮国の新人探索者～</li><li><span class="fas fa-book fa-fw" aria-hidden="true" title=""></span> 세계최강의 후위 ~미궁나라의 신인탐색가~</li>							</ul>
						</td>
					</tr>
					<tr>
						<th>Author:</th>
						<td><a href="/?page=search&amp;author=Toowa" title="Other manga by this author">Toowa</a></td>
					</tr>
					<tr>
						<th>Artist:</th>
						<td><a href="/?page=search&amp;artist=Rikizo" title="Other manga by this artist">Rikizo</a></td>
					</tr>
										<tr>
						<th>Demographic:</th>
						<td><span class="label label-default"><a class="genre" href="/?page=search&amp;demo=1" title="Search for Shounen titles">Shounen</a></span></td>
					</tr>
										<tr>
						<th>Genres:</th>
						<td><span class="label label-default"><a class="genre" href="/?page=search&amp;genres=2">Action</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=3">Adventure</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=5">Comedy</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=9">Ecchi</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=10">Fantasy</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=12">Harem</a></span> <span class="label label-default"><a class="genre" href="/?page=search&amp;genres=41">Isekai</a></span> </td>
					</tr>
					<tr>
						<th>Rating:</th>
						<td class=""><span class="fas fa-star fa-fw" aria-hidden="true" title="Rating"></span> 7.94 <span class="small"><span class="fas fa-user fa-fw" aria-hidden="true" title="Users"></span> 270</span></td>
					</tr>
					<tr>
						<th>Pub. status:</th>
						<td>Ongoing</td>
					</tr>
					<tr>
						<th>Stats:</th>
						<td>
							<ul class="list-inline" style="margin-bottom: 0;">
								<li class="text-info"><span class="fas fa-eye fa-fw" aria-hidden="true" title="Views"></span> 166,594</li>
								<li class="text-success"><span class="fas fa-bookmark fa-fw" aria-hidden="true" title="Follows"></span> 7,204</li>
								<li><span class="far fa-file fa-fw" aria-hidden="true" title="Total chapters"></span> 7</li>
							</ul>
						</td>
					</tr>
					<tr>
						<th>Description:</th>
						<td>Workaholic assistant Atobe Arihito fell asleep in his company's bus that was traveling for a vacation. When he awoke he learned he had died due to the bus getting into an accident, and that he had reincarnated into a world of reincarnators - to the Labyrinth Country. To his surprise he was discovered by his slave driving manager, Igarashi Kyouka, who further explains their role in this world.<br>
<br>
In Labyrinth Country, Reincarnators are expected to choose a job and form parties to fight against monsters in Labyrinths. "Valkyrie" Kyouka had expected Arihito to work with her once again, but he declines due to his knowledge of her demanding nature. As they depart she vows to make him regret not choosing her. And thus starts Arihito's adventure as a "Rear Guard".<br>
<br>
Based off of the LN/WN series of the same name.</td>
					</tr>
										
		<tr>
			<th>Links:</th>
			<td><ul class="list-inline" style="margin-bottom: 0;"><li><img src="/images/misc/mu.png"> <a rel="noopener noreferrer" target="_blank" href="https://www.mangaupdates.com/series.html?id=148262">MangaUpdates</a></li><li><img src="/images/misc/nu.png"> <a rel="noopener noreferrer" target="_blank" href="https://www.novelupdates.com/series/world-strongest-rearguard-labyrinth-country-and-dungeon-seekers/">NovelUpdates</a></li><li><img src="/images/misc/mal.png"> <a rel="noopener noreferrer" target="_blank" href="https://myanimelist.net/manga/113980">MyAnimeList</a></li><li><span class="fas fa-external-link-alt fa-fw" aria-hidden="true" title=""></span> <a rel="noopener noreferrer" target="_blank" href="http://seiga.nicovideo.jp/comic/33376">Raw</a></li></ul></td>
		</tr>					<tr>
						<th>Actions:</th>
						<td>
							<button class="btn btn-default" id="upload_button" disabled="" title="You need to log in to use this function."><span class="fas fa-upload fa-fw" aria-hidden="true" title="Upload"></span> <span class="visible-md-inline visible-lg-inline">Upload chapter</span></button>							<button class="btn btn-success" disabled="" title="You need to log in to use this function."><span class="fas fa-bookmark fa-fw" aria-hidden="true" title="Follow"></span> <span class="visible-md-inline visible-lg-inline">Follow</span> <span class="caret"></span></button>							<div class="btn-group">
		<button disabled="" title="You need to log in to use this function." type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="fas fa-star fa-fw" aria-hidden="true" title=""></span> <span class="hidden-xs hidden-sm">Rating</span> <span class="caret"></span>
		</button>
		<ul class="dropdown-menu"><li class=""><a class="manga_rating_button" id="10" href="#">(10) Masterpiece</a></li><li class=""><a class="manga_rating_button" id="9" href="#">(9) Great</a></li><li class=""><a class="manga_rating_button" id="8" href="#">(8) Very good</a></li><li class=""><a class="manga_rating_button" id="7" href="#">(7) Good</a></li><li class=""><a class="manga_rating_button" id="6" href="#">(6) Fine</a></li><li class=""><a class="manga_rating_button" id="5" href="#">(5) Average</a></li><li class=""><a class="manga_rating_button" id="4" href="#">(4) Bad</a></li><li class=""><a class="manga_rating_button" id="3" href="#">(3) Very bad</a></li><li class=""><a class="manga_rating_button" id="2" href="#">(2) Horrible</a></li><li class=""><a class="manga_rating_button" id="1" href="#">(1) Appalling</a></li></ul>
	</div>													</td>
					</tr>
									</tbody></table>
			</div>
<script data-type="chapter">{"manga_title":"Sekai Saikyou no Kouei: Meikyuukoku no Shinjin Tansakusha","manga_url":"\/manga\/25623\/sekai-saikyou-no-kouei-meikyuukoku-no-shinjin-tansakusha","lang":"Japanese","flag_url":"jp","prev_chapter_id":325491,"next_chapter_id":0,"prev_pages":32,"manga_id":25623,"chapter_id":408203,"dataurl":"8ca1fa56082f0ffd8694447119e47e96","server":"\/data\/","page_array":["Z1.jpg","Z2.jpg","Z3.jpg","Z4.jpg","Z5.jpg","Z6.jpg","Z7.jpg","Z8.jpg","Z9.jpg","Z10.jpg","Z11.jpg","Z12.jpg","Z13.jpg","Z14.jpg","Z15.jpg","Z16.jpg","Z17.jpg","Z18.jpg","Z19.jpg","Z20.jpg","Z21.jpg","Z22.jpg","Z23.jpg","Z24.jpg","Z25.jpg","Z26.jpg","Z27.jpg","Z28.jpg","Z29.jpg","Z30.jpg","Z31.jpg","Z32.jpg"],"other_groups":{"408203":{"lang_name":"English","lang_flag":"gb","group_id":853,"group_id_2":0,"group_id_3":0,"group_name":"Loli Mamoritai","group_name_2":null,"group_name_3":null}},"other_chapters":[{"id":408203,"name":"Volume 1 Chapter 4"},{"id":325491,"name":"Volume 1 Chapter 3"},{"id":257658,"name":"Volume 1 Chapter 2"},{"id":257520,"name":"Volume 1 Chapter 1"}],"chapter_title":"","long_strip":0}</script>
</body>
</html>

`
