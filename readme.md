<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
 <div align="center">
   
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![GPLv3 License][license-shield]][license-url]

 </div>
<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/dteviot/WebToEpub">
    <img src="doc/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">WebToEpub</h3>

  <p align="center">
    Extension that converts Web Novels (and other web pages) into an EPUB for offline reading.
    <br />
    <a href="https://github.com/dteviot/WebToEpub/wiki"><strong>Explore the wiki »</strong></a>
    <br />
    <br />
    <a href="https://github.com/dteviot/WebToEpub/issues/new?assignees=&labels=&projects=&template=add-site-request.md&title=Please+add+site+https%3A%2F%2F%3F%3F%3F%3F">Add Site Request</a>
    ·
    <a href="https://github.com/dteviot/WebToEpub/issues/new?assignees=&labels=&projects=&template=bug_report.md&title=">Bug Report</a>
    ·
    <a href="https://github.com/dteviot/WebToEpub/issues/new?assignees=&labels=&projects=&template=feature_request.md&title=">Feature Request</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#supported-sites">Supported Sites</a></li>
        <li>
          <a href="#built-with">Built With</a>
          <ul>
            <li><a href="#libraries-used-in-webtoepub">Libraries used (in WebToEpub)</a></li>
            <li><a href="#libraries-used-by-webtoepub-build-process">Libraries used by WebToEpub build process</a></li>  
        </li>
      </ul>
    </li>
    <li>
      <a href="#installation">Installation</a>
      <ul>
        <li>
          <a href="#firefox">Firefox</a>
          <ul>
            <li>
              <a href="#from-firefox-add-ons">From Firefox Add-ons</a>
            </li>
            <li>
              <a href="#from-source-firefox">From Source (Firefox)</a>
            </li>
          </ul>
        </li>
        <li>
          <a href="#chrome">Chrome</a>
          <ul>
            <li>
              <a href="#from-chrome-web-store">From Chrome Web Store</a>
            </li>
            <li>
              <a href="#from-source-chrome">From Source (Chrome)</a>
            </li>
          </ul>
        </li>
        <li><a href="#from-source-developers">From Source (Developers)</a></li>
        <li><a href="#android-untested">Android (untested)</a></li>
      </ul>
    <li>
      <a href="#usage">Usage</a>
      <ul>
        <li><a href="#how-to-use-with-baka-tsuki">How to use with Baka-Tsuki</a></li>
        <li><a href="#how-to-use-with-archive-of-our-own">How to use with Archive of Our Own</a></li>
        <li><a href="#how-to-use-for-site-that-there-is-no-specific-parser-for">How to use for site that there is no specific parser for</a></li>
        <li><a href="#how-to-create-parsers-for-new-sites">How to create Parsers for new sites</a></li>
      </ul>
    </li>
    <li>
      <a href="#contributing">Contributing</a>
      <ul>
        <li>
          <a href="#top-contributors">Top Contributors</a>
        </li>
        <li>
          <a href="#credits">Credits</a>
        </li>
      </ul>
    </li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#notes">Notes</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

![WebToEpub Screen Shot][product-screenshot]

&copy; 2015 David Teviotdale

WebToEpub is a browser extension for Firefox and Chrome that converts web novels and other web pages into EPUB format. It supports a wide range of websites, including:

- Baka-Tsuki.org
- ArchiveOfOurOwn.org
- FanFiction.net
- Wuxiaworld.com
- Royalroad.com and many more...

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Supported Sites

<details>
  <summary>Last we checked, the following sites were known to work</summary>
  <ul>
    <li>230book.net</li>
    <li>38xs.com</li>
    <li>4ksw.com</li>
    <li>888novel.com</li>
    <li>88xiaoshuo.net</li>
    <li>8muses.com</li>
    <li>a-t.nu</li>
    <li>aerialrain.com</li>
    <li>akknovel.com</li>
    <li>all-novelfull.net</li>
    <li>allnovel.org</li>
    <li>allnovelbin.net</li>
    <li>allnovelbook.com</li>
    <li>allnovelfull.app</li>
    <li>allnovelfull.com</li>
    <li>allnovelfull.net</li>
    <li>allnovelfull.org</li>
    <li>allnovelnext.com</li>
    <li>alphapolis.co.jp</li>
    <li>alternatehistory.com</li>
    <li>amor-yaoi.com</li>
    <li>anythingnovel.com</li>
    <li>arcanetranslations.com</li>
    <li>archiveofourown.org</li>
    <li>asianfanfics.com</li>
    <li>asianhobbyist.com</li>
    <li>asianovel.net</li>
    <li>asstr.org</li>
    <li>babelnovel.com</li>
    <li>baka-tsuki.org</li>
    <li>bakapervert.wordpress.com</li>
    <li>bednovel.com</li>
    <li>bestlightnovel.com</li>
    <li>betwixtedbutterfly.com</li>
    <li>bnatranslations.com</li>
    <li>book18.org</li>
    <li>bookalb.com</li>
    <li>bookswithqianya.com</li>
    <li>botitranslation.com</li>
    <li>boxnovel.net</li>
    <li>boxnovel.org</li>
    <li>boxnovelfull.com</li>
    <li>boylove.cc</li>
    <li>bqka.cc</li>
    <li>cangji.net</li>
    <li>cclawtranslations.home.blog</li>
    <li>chaleuria.com</li>
    <li>chichipeph.com</li>
    <li>chickengege.org</li>
    <li>chinesewuxia.world</li>
    <li>chrysanthemumgarden.com</li>
    <li>chyoa.com</li>
    <li>ckandawrites.online</li>
    <li>comics.8muses.com</li>
    <li>comrademao.com</li>
    <li>coronatranslation.com</li>
    <li>creativenovels.com</li>
    <li>crimsonmagic.me</li>
    <li>crimsontranslations.com</li>
    <li>cyborg-tl.com</li>
    <li>czbooks.net</li>
    <li>daotranslate.com</li>
    <li>daotranslate.us</li>
    <li>dark-novels.ru</li>
    <li>deviantart.com</li>
    <li>dummynovels.com</li>
    <li>edanglarstranslations.com</li>
    <li>engnovel.com</li>
    <li>erofus.com</li>
    <li>exiledrebelsscanlations.com</li>
    <li>faloomtl.com</li>
    <li>fanfiction.com.br</li>
    <li>fanfiction.mugglenet.com</li>
    <li>fanfiction.net</li>
    <li>fanmtl.com</li>
    <li>fannovel.com</li>
    <li>fannovels.com</li>
    <li>fansmtl.com</li>
    <li>fastnovel.net</li>
    <li>ffxs8.com</li>
    <li>fictionhunt.com</li>
    <li>fictionmania.tv</li>
    <li>fictionpress.com</li>
    <li>fictionzone.net</li>
    <li>ficwad.com</li>
    <li>fimfiction.net</li>
    <li>finestories.com</li>
    <li>flying-lines.com</li>
    <li>forum.questionablequesting.com</li>
    <li>forums.nrvnqsr.com</li>
    <li>forums.spacebattles.com</li>
    <li>forums.sufficientvelocity.com</li>
    <li>foxteller.com</li>
    <li>freelightnovel.net</li>
    <li>freenovelsread.com</li>
    <li>freewebnovel.com</li>
    <li>freewn.com</li>
    <li>frostfire10.wordpress.com</li>
    <li>fullnovel.co</li>
    <li>gamefaqs.gamespot.com</li>
    <li>genesistls.com</li>
    <li>genesistudio.com</li>
    <li>goblinsguide.com</li>
    <li>graverobbertl.site</li>
    <li>gravitynovels.com</li>
    <li>gravitytales.com</li>
    <li>gunnerkrigg.com</li>
    <li>gutenberg.spiegel.de</li>
    <li>helheimscans.com</li>
    <li>hellping.org</li>
    <li>hentai-foundry.com</li>
    <li>hiscension.com</li>
    <li>hostednovel.com</li>
    <li>hoxionia.com</li>
    <li>hui3r.wordpress.com</li>
    <li>idleturtle-translations.com</li>
    <li>idnovel.my.id</li>
    <li>imgur.com</li>
    <li>indomtl.com</li>
    <li>indowebnovel.id</li>
    <li>inkitt.com</li>
    <li>innnovel.com</li>
    <li>inoveltranslation.com</li>
    <li>isekaicyborg.wordpress.com</li>
    <li>isekaiscan.com</li>
    <li>isotls.com</li>
    <li>jade-rabbit.net</li>
    <li>japtem.com</li>
    <li>jjwxc.net</li>
    <li>jobnib.com</li>
    <li>jonaxxstories.com</li>
    <li>jpmtl.com</li>
    <li>kakuyomu.jp</li>
    <li>kaystls.site</li>
    <li>kemono.su</li>
    <li>knoxt.space</li>
    <li>kobatochan.com</li>
    <li>krytykal.org</li>
    <li>lazygirltranslations.com</li>
    <li>liberspark.com</li>
    <li>libread.com</li>
    <li>libri7.com</li>
    <li>lightnovelbastion.com</li>
    <li>lightnovelbox.com</li>
    <li>lightnovelcave.com</li>
    <li>lightnovelfr.com</li>
    <li>lightnovelpub.com</li>
    <li>lightnovelpub.fan</li>
    <li>lightnovelread.com</li>
    <li>lightnovelreader.org</li>
    <li>lightnovels.live</li>
    <li>lightnovels.me</li>
    <li>lightnovelstranslations.com</li>
    <li>lightnovelworld.co</li>
    <li>lightnovelworld.com</li>
    <li>lightsnovel.com</li>
    <li>listnovel.com</li>
    <li>literotica.com</li>
    <li>lnmtl.com</li>
    <li>lnreader.org</li>
    <li>m.88xiaoshuo.net</li>
    <li>m.bqg225.com</li>
    <li>m.chinesefantasynovels.com</li>
    <li>m.freelightnovel.net</li>
    <li>m.gzbpi.com</li>
    <li>m.metanovel.org</li>
    <li>m.mywuxiaworld.com</li>
    <li>m.novelspread.com</li>
    <li>m.qqxs.vip</li>
    <li>m.tapas.io</li>
    <li>m.wuxiaworld.co</li>
    <li>m.xklxsw.net</li>
    <li>machine-translation.org</li>
    <li>madnovel.com</li>
    <li>magic.wizards.com</li>
    <li>mandarinducktales.com</li>
    <li>mangabob.com</li>
    <li>mangadex.org</li>
    <li>mangahere.cc</li>
    <li>mangakakalot.com</li>
    <li>mangallama.com</li>
    <li>manganelo.com</li>
    <li>manganov.com</li>
    <li>mangaread.co</li>
    <li>mangasushi.net</li>
    <li>manhwaden.com</li>
    <li>manhwatop.com</li>
    <li>marx2mao.com</li>
    <li>mayanovel.com</li>
    <li>mcstories.com</li>
    <li>meionovel.id</li>
    <li>midnightrambles.in</li>
    <li>moonbunnycafe.com</li>
    <li>moonlightnovel.com</li>
    <li>moonquill.com</li>
    <li>morenovel.net</li>
    <li>mtlarchive.com</li>
    <li>mtled-novels.com</li>
    <li>mtlnation.com</li>
    <li>mtlnovel.com</li>
    <li>mtlreader.com</li>
    <li>mtnovel.net</li>
    <li>myxls.net</li>
    <li>nanomashin.online</li>
    <li>ncode.syosetu.com</li>
    <li>nightcomic.com</li>
    <li>noblemtl.com</li>
    <li>novel-bin.com</li>
    <li>novel-bin.net</li>
    <li>novel-bin.org</li>
    <li>novel-next.com</li>
    <li>novel.babelchain.org</li>
    <li>novel.naver.com</li>
    <li>novel18.syosetu.com</li>
    <li>novel35.com</li>
    <li>novelactive.org</li>
    <li>novelall.com</li>
    <li>novelbin.com</li>
    <li>novelbin.me</li>
    <li>novelbin.net</li>
    <li>novelbuddy.com</li>
    <li>novelbuddy.io</li>
    <li>novelcool.com</li>
    <li>novelcranel.org</li>
    <li>novelcrush.com</li>
    <li>novelebook.net</li>
    <li>novelfever.com</li>
    <li>novelfire.docsachhay.net</li>
    <li>novelfull.com</li>
    <li>novelfull.net</li>
    <li>novelfullbook.com</li>
    <li>novelgate.net</li>
    <li>novelgo.id</li>
    <li>novelgreat.net</li>
    <li>novelhall.com</li>
    <li>novelhi.com</li>
    <li>novelhold.com</li>
    <li>novelhulk.net</li>
    <li>novellive.app</li>
    <li>novellive.com</li>
    <li>novellive.net</li>
    <li>novelmania.com.br</li>
    <li>novelmao.com</li>
    <li>novelmax.net</li>
    <li>novelmedium.com</li>
    <li>novelmt.com</li>
    <li>novelmtl.com</li>
    <li>novelnext.com</li>
    <li>novelnext.dramanovels.io</li>
    <li>novelnext.net</li>
    <li>novelnextz.com</li>
    <li>novelonlinefree.com</li>
    <li>novelonlinefree.info</li>
    <li>novelonlinefull.com</li>
    <li>novelonomicon.com</li>
    <li>novelpassion.com</li>
    <li>novelplex.org</li>
    <li>novelpub.com</li>
    <li>novels.pl</li>
    <li>novelsect.com</li>
    <li>novelsemperor.com</li>
    <li>novelsemperor.net</li>
    <li>novelsknight.com</li>
    <li>novelsparadise.net</li>
    <li>novelspread.com</li>
    <li>novelsrock.com</li>
    <li>noveltoon.mobi</li>
    <li>noveltop1.org</li>
    <li>noveltranslatedbyc.blogspot.com</li>
    <li>noveltrench.com</li>
    <li>noveltrust.net</li>
    <li>noveluniverse.com</li>
    <li>novelupdates.cc</li>
    <li>novelupdates.online</li>
    <li>novelusb.com</li>
    <li>novelusb.net</li>
    <li>novelversetranslations.com</li>
    <li>novelxo.net</li>
    <li>novicetranslations.com</li>
    <li>ntruyen.vn</li>
    <li>nyantl.wordpress.com</li>
    <li>octopii.co</li>
    <li>onlinenovelbook.com</li>
    <li>ontimestory.eu</li>
    <li>ossantl.com</li>
    <li>panda-novel.com</li>
    <li>pandamtl.com</li>
    <li>pandapama.com</li>
    <li>pandasnovel.com</li>
    <li>patreon.com</li>
    <li>pawread.com</li>
    <li>peachblossomcodex.com</li>
    <li>peachpitting.com</li>
    <li>peachpuff.in</li>
    <li>pery.info</li>
    <li>piaotia.com</li>
    <li>puretl.com</li>
    <li>qinxiaoshuo.com</li>
    <li>quanben.io</li>
    <li>quanben5.io</li>
    <li>questionablequesting.com</li>
    <li>quotev.com</li>
    <li>raeitranslations.com</li>
    <li>rainingtl.org</li>
    <li>rainofsnow.com</li>
    <li>raisingthedead.ninja</li>
    <li>ranobes.net</li>
    <li>ranobes.top</li>
    <li>re-library.com</li>
    <li>readcomiconline.li</li>
    <li>reader-hub.com</li>
    <li>readfreebooksonline.org</li>
    <li>readhive.org</li>
    <li>readlightnovel.cc</li>
    <li>readlightnovel.me</li>
    <li>readlightnovel.meme</li>
    <li>readlightnovel.org</li>
    <li>readlightnovel.today</li>
    <li>readlitenovel.com</li>
    <li>readnoveldaily.com</li>
    <li>readnovelfull.com</li>
    <li>readnovelfull.me</li>
    <li>readnovelfull.org</li>
    <li>readwebnovel.xyz</li>
    <li>readwn.com</li>
    <li>readwn.org</li>
    <li>rebirth.online</li>
    <li>reddit.com</li>
    <li>royalroad.com</li>
    <li>royalroadl.com</li>
    <li>rtd.moe</li>
    <li>rtenzo.net</li>
    <li>rubymaybetranslations.com</li>
    <li>scifistories.com</li>
    <li>scribblehub.com</li>
    <li>secondlifetranslations.com</li>
    <li>semprot.com</li>
    <li>sexstories.com</li>
    <li>shalvationtranslations.wordpress.com</li>
    <li>shanghaifantasy.com</li>
    <li>shikkakutranslations.org</li>
    <li>shinsori.com</li>
    <li>shintranslations.com</li>
    <li>shirokuns.com</li>
    <li>shmtranslations.com</li>
    <li>shubaow.net</li>
    <li>shubaowb.com</li>
    <li>shw5.cc</li>
    <li>sites.google.com</li>
    <li>sj.uukanshu.com</li>
    <li>sjks88.com</li>
    <li>skydemonorder.com</li>
    <li>skythewoodtl.com</li>
    <li>snowycodex.com</li>
    <li>sonako.fandom.com</li>
    <li>sonako.wikia.com</li>
    <li>sousetsuka.com</li>
    <li>soverse.com</li>
    <li>spiritfanfiction.com</li>
    <li>sspai.com</li>
    <li>starlightstream.net</li>
    <li>sto.cx</li>
    <li>storiesonline.net</li>
    <li>storyseedling.com</li>
    <li>sweek.com</li>
    <li>systemtranslation.com</li>
    <li>taffygirl13.wordpress.com</li>
    <li>tamagotl.com</li>
    <li>taonovel.com</li>
    <li>tapas.io</li>
    <li>tapread.com</li>
    <li>teanovel.com</li>
    <li>teanovel.net</li>
    <li>teenfic.net</li>
    <li>thenovelbin.org</li>
    <li>tigertranslations.org</li>
    <li>timotxt.com</li>
    <li>titannovel.net</li>
    <li>tl.rulate.ru</li>
    <li>tomotranslations.com</li>
    <li>topnovelfull.com</li>
    <li>translationchicken.com</li>
    <li>travistranslations.com</li>
    <li>truyenfull.vn</li>
    <li>truyenyy.com</li>
    <li>trxs.me</li>
    <li>ultimaguil.org</li>
    <li>universalnovel.com</li>
    <li>unlimitednovelfailures.mangamatters.com</li>
    <li>untamedalley.com</li>
    <li>veratales.com</li>
    <li>vipnovel.com</li>
    <li>volarenovels.com</li>
    <li>wanderertl130.id</li>
    <li>wanderinginn.com</li>
    <li>watashiwasugoidesu.com</li>
    <li>wattpad.com</li>
    <li>webnovel.com</li>
    <li>webnovel.live</li>
    <li>webnovelonline.com</li>
    <li>webnovelpub.com</li>
    <li>webnovelpub.pro</li>
    <li>wenku8.net</li>
    <li>wfxs.tw</li>
    <li>whitemoonlightnovels.com</li>
    <li>wnmtl.com</li>
    <li>wnmtl.org</li>
    <li>woopread.com</li>
    <li>wordexcerpt.com</li>
    <li>worldnovel.online</li>
    <li>wtr-lab.com</li>
    <li>wuxia-world.online</li>
    <li>wuxia.blog</li>
    <li>wuxia.city</li>
    <li>wuxia.click</li>
    <li>wuxiabee.com</li>
    <li>wuxiabee.net</li>
    <li>wuxiabee.org</li>
    <li>wuxiafox.com</li>
    <li>wuxiago.com</li>
    <li>wuxiahere.com</li>
    <li>wuxiahub.com</li>
    <li>wuxiamtl.com</li>
    <li>wuxiaone.com</li>
    <li>wuxiap.com</li>
    <li>wuxiapub.com</li>
    <li>wuxiar.com</li>
    <li>wuxiaspot.com</li>
    <li>wuxiau.com</li>
    <li>wuxiaworld.co</li>
    <li>wuxiaworld.com</li>
    <li>wuxiaworld.eu</li>
    <li>wuxiaworld.live</li>
    <li>wuxiaworld.online</li>
    <li>wuxiaworld.site</li>
    <li>wuxiaworld.world</li>
    <li>wuxiazone.com</li>
    <li>wxscs.com</li>
    <li>xbiquge.so</li>
    <li>xiaoshuogui.com</li>
    <li>xiaxuenovels.xyz</li>
    <li>yoraikun.wordpress.com</li>
    <li>yushubo.net</li>
    <li>zenithnovels.com</li>
    <li>zeonic-republic.net</li>
    <li>zhenhunxiaoshuo.com</li>
    <li>zinnovel.net</li>
    <li>zirusmusings.com</li>
  </ul>
</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- Node.js
- eslint

##### Libraries used (in WebToEpub)

- zip.js

#### Libraries used by WebToEpub build process

- @xmldom/xmldom
- copyfiles
- quint

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- INSTALLATION -->

## Installation

### Firefox

#### From Firefox Add-ons

Open Firefox and visit [WebToEpub on Firefox Add-ons][firefox-add-ons].

#### From Source (Firefox)

The easiest set of steps is using Firefox.

1. Download prebuilt Firefox version of extension from https://github.com/dteviot/WebToEpub/releases/tag/developer-build.
2. Open Firefox and type "about:debugging#/runtime/this-firefox" into the URL bar.
3. Click "Load Temporary Add-on".
4. Click on the zip file you downloaded in step 1.
   ![Installing in Firefox screenshot](doc/FirefoxLoadFromSource.png?raw=true)

### Chrome

#### From Chrome Web Store

Open Chrome (or any Chromium-based browser like Edge, Opera, etc.) and go to [WebToEpub on Chrome Web Store][chrome-web-store].

#### From Source (Chrome)

1. Download prebuilt Chrome version of extension from https://github.com/dteviot/WebToEpub/releases/tag/developer-build.
2. Unpack zip file
3. Open Chrome and type "chrome://extensions" into the browser.
4. Make sure "Developer Mode" at the top of the page is checked.
5. Press the "Load unpacked extension.." button and browse to unpacked zip directory from step 2.
   ![wte-chrome-small](https://user-images.githubusercontent.com/20068737/136224439-57af48bd-21fb-463d-99db-74f44769327e.gif)

### From Source (Developers)

1. Clone this repo.

   ```sh
    git clone https://github.com/dteviot/WebToEpub.git
   ```

2. Build extension.

   - Install [Node.js](https://nodejs.org/) (if not already installed)
   - Run `npm install` to install dependencies
   - Run `npm run lint` to build plugin and lint
   - This will produce 3 files in the eslint directory.
     - WebToEpub0.0.0.x.xpi (Firefox version of plug-in)
     - WebToEpub0.0.0.x.zip (Chrome version of plug-in)
     - packed.js
   - Lint tests are OK if output ends with `Wrote Zip to disk; Done in XXXs.`

3. Install extension in browser of choice, using instructions above.

See [notes](#notes) for more information.

### Android (untested)

- Caution I have not (and do not test) on Android. I've been told the following work, but I can't guarantee them.
- Get yourself `Kiwi browser`, `Yandex browser`, or `Firefox`.
- Install from [Chrome web store][chrome-web-store] for Kiwi and Yandex, or from [Mozilla add-ons][firefox-add-ons] for Firefox.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

### How to use with Baka-Tsuki:

- Browse to a Baka-Tsuki web page that has the full text of a story.
- Click on the WebToEpub icon on top right of the window.
- Check story details are correct.
- Select image to use for cover.
- Click the "Pack EPUB" button.
- Wait for progress bar to finish (indicating the images being downloaded) and the generated EPUB to be placed in your downloads directory.

### How to use with Archive of Our Own:

- Browse to first chapter of story you want.
- Click on the WebToEpub icon on top right of the window.
- Check story details are correct.
- Click the "Pack EPUB" button.
- Wait for progress bar to finish (indicating the additional chapters are being downloaded) and the generated EPUB to be placed in your downloads directory.

### How to use for site that there is no specific parser for:

See: https://github.com/dteviot/WebToEpub/wiki/FAQ#how-to-convert-a-new-site-using-the-default-parser

### How to create Parsers for new sites

For details on how to extend, see the following

- https://github.com/dteviot/WebToEpub/wiki/FAQ#how-to-write-a-new-parser
- http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

> [!NOTE]
>
> Read [CONTRIBUTING.md](/CONTRIBUTING.md) first.

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors

<a href="https://github.com/dteviot/WebToEpub/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dteviot/WebToEpub" alt="contrib.rocks image" />
</a>

### Credits

<details>
  <summary>Contributors</summary>
  <ul>
    <li>Firefox port by Markus Vieth</li>
    <li>Michael Fox (Belldandu)</li>
    <li>typhoon71</li>
    <li>toshiya44</li>
    <li>dreamer2908</li>
    <li>Parser for German Project Gutenberg by GallusMax</li>
    <li>Hogesyx</li>
    <li>Asif Mahmood</li>
    <li>snnsnn</li>
    <li>Sergii Pravdzivyi</li>
    <li>Aurimas Niekis</li>
    <li>Tom Goetz</li>
    <li>Alen Toma (css styling)</li>
    <li>JimmXinu</li>
    <li>gamebeaker (additional metadata, Library)</li>
    <li>Kondeeza</li>
    <li>Mathnerd314</li>
    <li>Sickan90</li>
    <li>Miracutor</li>
    <li>Kiradien</li>
    <li>Synteresis</li>
    <li>Lej77</li>
    <li>nandakishore2009 (Parsers for madnovel.com, www.panda-novel.com)</li>
    <li>courli79</li>
    <li>Dimava</li>
    <li>alethiophile</li>
    <li>Yoanhg421</li>
    <li>Leone Jacob Sunil (ImLJS)</li>
    <li>xRahul</li>
    <li>Oleksii Taranenko</li>
    <li>Naheulf</li>
    <li>perishableloc</li>
    <li>praschke</li>
    <li>ImmortalDreamer</li>
    <li>ktrin</li>
    <li>nozwock</li>
    <li>Tyderion</li>
    <li>Darthagnon</li>
    <li>LucasFreitaslpf1</li>
    <li>Jemeni11</li>
    <li>maforn</li>
    <li>phazei</li>
    <li>rizkiv1</li>
    <li>pavan3999</li>
    <li>Anartigone</li>
    <li>crybx</li>
  </ul>
</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Licensed under GPLv3. See [LICENSE][license-url] for more information.

WebToEpub uses the following libraries:

- zip.js library v2.7.57: https://github.com/gildas-lormeau/zip.js, licensed under BSD 3-Clause.
- quint: http://qunitjs.com/, licensed under MIT license.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

David Teviotdale - [@dteviot](https://github.com/dteviot)

Project Link: [https://github.com/dteviot/WebToEpub](https://github.com/dteviot/WebToEpub)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- NOTES -->

## Notes

### To run unit tests

- Install [Node.js](https://nodejs.org/) (if not already installed)
- Run `npm install` to install dependencies
- Run `npm test`
- Tests will be launched in your default browser. To open them in different browser, open the page URL in it.

> ### To run unit tests without Node.js
>
> - If you are not trying to run unit tests in `/unitTest/` folder, you do not need this
> - If you can use nodejs, see previous paragraph instead
> - If you can not install nodejs or http-server is not working when you run `npm test`, and you have no alternative ways to serve files (like [chrome Web Server app](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb) for example), you have to allow browser to run local html files to run tests.
>
> #### To run unit tests (without local server) under Chrome
>
> - Close all running copies of Chrome
> - Start Chrome with command line argument `--allow-file-access-from-files`. That is:
>   - Open a command propmt
>   - Browse to the directory holding Chrome
>   - Type in command `chrome.exe --allow-file-access-from-files` . Press "Enter".
>   - If you don't do this, some tests will fail with error messages containing the text **_Failed to execute 'send' on 'XMLHttpRequest': Failed to load_**.
> - Load `unitTest/Tests.html`
> - If you get **_Failed to read the 'localStorage' property from 'Window': Access is denied for this document_** errors
>   - Type **_chrome://settings/content_** into Chrome's search bar
>   - Uncheck **_Block third-party cookies and site data_**
>   - Click **_Finished_**
>   - Re-run unit tests
> - When finished with unit tests.
>   - Restore original value of **_Block third-party cookies and site data_** (if you changed it).
>   - close all running copies of Chrome
>
> #### To run unit tests (without local server) under Firefox
>
> - Start Firefox
> - Go to `about:config`
> - Find `security.fileuri.strict_origin_policy` parameter
> - Set it to false
> - Load `unitTest/Tests.html`
> - (Remember to reset `security.fileuri.strict_origin_policy` to true when done.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/dteviot/WebToEpub.svg?style=for-the-badge
[contributors-url]: https://github.com/dteviot/WebToEpub/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dteviot/WebToEpub.svg?style=for-the-badge
[forks-url]: https://github.com/dteviot/WebToEpub/network/members
[stars-shield]: https://img.shields.io/github/stars/dteviot/WebToEpub.svg?style=for-the-badge
[stars-url]: https://github.com/dteviot/WebToEpub/stargazers
[issues-shield]: https://img.shields.io/github/issues/dteviot/WebToEpub.svg?style=for-the-badge
[issues-url]: https://github.com/dteviot/WebToEpub/issues

<!-- GitHub can't automtically ID the current license so let's hard code it -->

[license-shield]: https://img.shields.io/badge/LICENSE-GPLv3-%23555555?style=for-the-badge&label=LICENSE&color=285959
[license-url]: /LICENSE.md
[product-screenshot]: doc/product-screenshot.png

<!-- Store Links -->

[firefox-add-ons]: https://addons.mozilla.org/en-US/firefox/addon/webtoepub-for-baka-tsuki
[chrome-web-store]: https://chrome.google.com/webstore/detail/webtoepub/akiljllkbielkidmammnifcnibaigelm
