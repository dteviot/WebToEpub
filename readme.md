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

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![GPLv3 License][license-shield]][license-url]

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
        <li><a href="#built-with">Built With</a></li>
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
  <summary>Full list of Supported Sites (296)</summary>
  <ul>
    <li>230Book</li>
    <li>4ksw</li>
    <li>69shu</li>
    <li>888novel</li>
    <li>88xiaoshuo</li>
    <li>ActiveTranslations</li>
    <li>Adultfanfiction</li>
    <li>Aerialrain</li>
    <li>Akknovel</li>
    <li>Alphapolis</li>
    <li>Amoryaoi</li>
    <li>AnythingNovel</li>
    <li>ArchiveOfOurOwn</li>
    <li>Asianfanfics</li>
    <li>AsianHobbyist</li>
    <li>Asianovel</li>
    <li>Asstr</li>
    <li>BabelChain</li>
    <li>BakaTsuki</li>
    <li>BakaTsukiSeriesPage</li>
    <li>Betwixtedbutterfly</li>
    <li>Blogspot</li>
    <li>Bnatranslations</li>
    <li>Book18</li>
    <li>Bookswithqianya</li>
    <li>Booktoki152</li>
    <li>Botitranslation</li>
    <li>BoxnovelOrg</li>
    <li>Boylove</li>
    <li>Bqg225</li>
    <li>Cangji</li>
    <li>CClawTranslations</li>
    <li>Chaleuria</li>
    <li>Chichipeph</li>
    <li>Chickengege</li>
    <li>ChineseFantasyNovels</li>
    <li>Chrysanthemumgarden</li>
    <li>Chyoa</li>
    <li>Comrademao</li>
    <li>Coronatranslation</li>
    <li>CreativeNovels</li>
    <li>Crimsontranslations</li>
    <li>Czbooks</li>
    <li>DarkNovels</li>
    <li>DeviantArt</li>
    <li>Dummynovels</li>
    <li>Edanglarstranslations</li>
    <li>EightMuses</li>
    <li>Engnovel</li>
    <li>Erofus</li>
    <li>Exiledrebelsscanlations</li>
    <li>FanFiction</li>
    <li>FastNovel</li>
    <li>Ffxs8</li>
    <li>Fictionhunt</li>
    <li>FictionMania</li>
    <li>Ficwad</li>
    <li>Fimfiction</li>
    <li>FlyingLines</li>
    <li>Foxaholic</li>
    <li>Foxteller</li>
    <li>Freelightnovel</li>
    <li>FreeWebNovel</li>
    <li>Fullnovel</li>
    <li>GamefaqsGamespot</li>
    <li>GenesiStudio</li>
    <li>Graverobbertl</li>
    <li>GravityNovels</li>
    <li>GravityTales</li>
    <li>Gunnerkrigg</li>
    <li>GutenbergDE</li>
    <li>Gzbp</li>
    <li>Helheimscans</li>
    <li>Hellping</li>
    <li>HentaiFoundry</li>
    <li>Hiscension</li>
    <li>Hostednovel</li>
    <li>Hui3r</li>
    <li>Idleturtletranslations</li>
    <li>Idnovelmyid</li>
    <li>Imgur</li>
    <li>Indomtl</li>
    <li>Indowebnovel</li>
    <li>Inkitt</li>
    <li>Inoveltranslation</li>
    <li>IsekaiScan</li>
    <li>Isotls</li>
    <li>JadeRabbit</li>
    <li>Japtem</li>
    <li>Jjwxc</li>
    <li>Jonaxxstories</li>
    <li>Jpmtl</li>
    <li>Kakao</li>
    <li>Kakuyomu</li>
    <li>Kaystls</li>
    <li>Kemonoparty</li>
    <li>Kobatochan</li>
    <li>Krytykal</li>
    <li>Liberspark</li>
    <li>Libri7</li>
    <li>LightNovelBastion</li>
    <li>Lightnovelbox</li>
    <li>Lightnovelfr</li>
    <li>Lightnovelreader</li>
    <li>Lightnovelread</li>
    <li>Lightnovelsme</li>
    <li>LightNovelsTranslations</li>
    <li>LightNovelWorld</li>
    <li>Literotica</li>
    <li>Lnmtl</li>
    <li>MachineTranslation</li>
    <li>Madara</li>
    <li>Madnovel</li>
    <li>MagicWizards</li>
    <li>Mandarinducktales</li>
    <li>Mangadex</li>
    <li>MangaHere</li>
    <li>Mangakakalot</li>
    <li>Mangallama</li>
    <li>Manganelo</li>
    <li>Manganov</li>
    <li>MangaRead</li>
    <li>Manhwaden</li>
    <li>Manhwatop</li>
    <li>Marx2mao</li>
    <li>Mayanovel</li>
    <li>McStories</li>
    <li>Meionovel</li>
    <li>Metanovel</li>
    <li>Midnightrambles</li>
    <li>MMyWwuxiaWorld</li>
    <li>MoonQuill</li>
    <li>Mtlarchive</li>
    <li>MtledNovels</li>
    <li>Mtlnation</li>
    <li>Mtlnovel</li>
    <li>Mtlreader</li>
    <li>Mtnovel</li>
    <li>MuggleNet</li>
    <li>Myxls</li>
    <li>Nanodesu</li>
    <li>Nanomashinonline</li>
    <li>Nepustation</li>
    <li>Noblemtl</li>
    <li>NovelAll</li>
    <li>Novelcool</li>
    <li>NovelCrush</li>
    <li>NovelFever</li>
    <li>Novelfull</li>
    <li>Novelgo</li>
    <li>Novelgreat</li>
    <li>Novelhall</li>
    <li>Novelhi</li>
    <li>Novelhold</li>
    <li>Novelmania</li>
    <li>Novelmao</li>
    <li>Novelmedium</li>
    <li>NovelNaver</li>
    <li>NovelOnlineFree</li>
    <li>Novelonomicon</li>
    <li>Novelpassion</li>
    <li>Novelplex</li>
    <li>Novelsect</li>
    <li>Novelsemperor</li>
    <li>Novelspl</li>
    <li>NovelSpread</li>
    <li>NovelsRock</li>
    <li>Noveltoon</li>
    <li>Noveltranslatedbyc</li>
    <li>NovelUniverse</li>
    <li>NovelUpdatesOnline</li>
    <li>NovelUpdates</li>
    <li>Novelversetranslations</li>
    <li>Novicetranslations</li>
    <li>Nrvnqsr</li>
    <li>Ntruyen</li>
    <li>NyahFanfiction</li>
    <li>Nyantl</li>
    <li>Octopii</li>
    <li>Onlinenovelbook</li>
    <li>Ontimestory</li>
    <li>Ossantl</li>
    <li>PandaNovel</li>
    <li>Patreon</li>
    <li>Pawread</li>
    <li>Peachblossomcodex</li>
    <li>Peachpitting</li>
    <li>Peachpuff</li>
    <li>Ptwxz</li>
    <li>Puretl</li>
    <li>Qidian</li>
    <li>Qinxiaoshuo</li>
    <li>Qqxs</li>
    <li>Quanben5</li>
    <li>Quanben</li>
    <li>Quotev</li>
    <li>Raeitranslations</li>
    <li>RainOfSnow</li>
    <li>Ranobes</li>
    <li>ReadComicOnline</li>
    <li>Readhive</li>
    <li>ReadLightNovelCc</li>
    <li>ReadLightNovel</li>
    <li>Readnoveldaily</li>
    <li>Readnovelfullorg</li>
    <li>ReadNovelFull</li>
    <li>Readwn</li>
    <li>RebirthOnline.js</li>
    <li>Reddit</li>
    <li>ReLibrary</li>
    <li>RoyalRoad</li>
    <li>RtdMoe</li>
    <li>Rtenzo</li>
    <li>Rubymaybetranslations</li>
    <li>Rulate</li>
    <li>Scribblehub</li>
    <li>Secondlifetranslations</li>
    <li>Semprot</li>
    <li>SexStories</li>
    <li>Shanghaifantasy</li>
    <li>Shikkakutranslations</li>
    <li>Shinsori</li>
    <li>Shintranslations</li>
    <li>Shirokuns</li>
    <li>Shmtranslations</li>
    <li>Shubaowb</li>
    <li>Shubaow</li>
    <li>Shw5</li>
    <li>SitesGoogle</li>
    <li>Sjks88</li>
    <li>Sjuukanshu</li>
    <li>Skydemonorder</li>
    <li>SnowyCodex</li>
    <li>Sonako</li>
    <li>Soverse</li>
    <li>Spacebattles</li>
    <li>Spiritfanfiction</li>
    <li>Sspai</li>
    <li>Starlightstream</li>
    <li>Stocx</li>
    <li>StorySeedling</li>
    <li>Sweek</li>
    <li>Syosetu</li>
    <li>SystemTranslation</li>
    <li>Taffygirl13</li>
    <li>Tapas</li>
    <li>Tapread</li>
    <li>Teanovel</li>
    <li>Teenfic</li>
    <li>Template.js</li>
    <li>Tigertranslations</li>
    <li>Timotxt</li>
    <li>Titannovel</li>
    <li>Tomotranslations</li>
    <li>TranslationChicken</li>
    <li>Travistranslations</li>
    <li>Truyenfull</li>
    <li>Truyenyy</li>
    <li>Trxs</li>
    <li>Tumblr</li>
    <li>Ultimaguil</li>
    <li>UnlimitedNovelFailures</li>
    <li>UntamedAlley</li>
    <li>VipNovel</li>
    <li>Volarenovels</li>
    <li>Wanderinginn</li>
    <li>Watashiwasugoidesu</li>
    <li>Wattpad</li>
    <li>WebNovelOnline</li>
    <li>Wenku8</li>
    <li>Wfxs</li>
    <li>Wikipedia</li>
    <li>Wix</li>
    <li>WLPublishing</li>
    <li>WnmtlOrg</li>
    <li>Wnmtl</li>
    <li>Woopread</li>
    <li>Wordexcerpt</li>
    <li>WordpressBase</li>
    <li>WorldnovelOnline</li>
    <li>Wtrlab</li>
    <li>WuxiaBlog</li>
    <li>Wuxiacity</li>
    <li>WuxiaworldCo</li>
    <li>Wuxiaworldeu</li>
    <li>Wuxiaworld</li>
    <li>WuxiaworldWorld</li>
    <li>Xbiquge</li>
    <li>Xiaoshuogui</li>
    <li>Xiaxuenovels</li>
    <li>Xklxsw</li>
    <li>Yushubo</li>
    <li>ZenithNovels</li>
    <li>Zeonicrepublic</li>
    <li>Zhenhunxiaoshuo</li>
    <li>ZirusMusings</li>
  </ul>
</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- HTML
- CSS
- JS
- jszip
- @xmldom/xmldom
- copyfiles
- eslint
- http-server

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

See: https://dteviot.github.io/Projects/webToEpub_DefaultParser.html

### How to create Parsers for new sites

For details on how to extend, see the following

- https://dteviot.github.io/Projects/webToEpub_FAQ.html#write-parser
- https://dteviot.github.io/Projects/webToEpub_FAQ.html
- http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

> [Note] Read [CONTRIBUTING.md](/CONTRIBUTING.md) first.

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/dteviot/WebToEpub/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dteviot/WebToEpub" alt="contrib.rocks image" />
</a>

### Credits:

<details>
  <summary>Credits:</summary>
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
  </ul>
</details>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Licensed under GPLv3. See [LICENSE][license-url] for more information.

WebToEpub uses the following libraries:

- JSZip library v3.0.0: https://github.com/Stuk/jszip, which is dual licensed with the MIT license or GPLv3.
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
