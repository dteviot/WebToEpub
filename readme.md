# WebToEpub
(c) 2015 David Teviotdale   

A simple Extension for Firefox and Chrome that converts a story on Baka-Tsuki into an EPUB.
Also works with 
* ArchiveOfOurOwn.org
* blogspot (some)
* mugglenet.com
* FanFiction.net
* gravitytales.com
* hellping.org
* krytykal.org
* moonbunnycafe.com
* nanodesu (some of the *thetranslation.wordpress.com sites)
* readlightnovel.com
* royalroadl.com 
* shikkakutranslations.org
* sonako.wikia.com
* wuxiaworld.com
* and many other sites

Credits
* Firefox mod by Markus Vieth
* Michael Fox (Belldandu)
* typhoon71
* toshiya44
* dreamer2908
* Parser for German Project Gutenberg by GallusMax
* Hogesyx

## How to use with Baka-Tsuki:
* Browse to a Baka-Tsuki web page that has the full text of a story.
* Click on the WebToEpub icon on top right of the window.
* Check story details are correct.
* Select image to use for cover.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the images being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to use with Archive of Our Own:
* Browse to first chapter of story you want.
* Click on the WebToEpub icon on top right of the window.
* Check story details are correct.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the additional chapters are being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to use for site that there is no specific parser for:
* Examine the HTML of a chapter the web page and find the tag holding the content.  Take note of:
    * Type: `<div>` or `<article>`
    * id (if present)
    * class (if present and id not present)
* Browse to page that has URLs for the chapters you want to fetch.
* Click on the WebToEpub icon on top right of the window.
* When warning "No parser found for this URL. Default parser will be used. You will need to specify how to obtain content for each chapter." appears, click "OK".
* Select the URLs to the chapters you want.
* Above the "Pack EPUB" button set 
    * the `<body>` drop down to type of the tag holding the content you found in the first step.  Note, if it's neither `<div>` or `<article>` leave value as `<body>`.
    * next drop down to one of `<Class Starts With>`, `<Class is>`, `<ID Starts With>` or `<ID is>`
    * the text box to the value of the id or class
* Click "Pack EPUB"

## How to create Parsers for new sites
For details on how to extend, see http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

## How to install 
### from Chrome Web Store
* Start Chrome
* Go to https://chrome.google.com/webstore/detail/webtoepub/akiljllkbielkidmammnifcnibaigelm
* Click on the "Add to Chrome" button.

### with Firefox
* Start Firefox
* Go to https://addons.mozilla.org/en-US/firefox/addon/webtoepub-for-baka-tsuki
* Click on "Download anyway"

## How to install from Source
### Chrome
1. Download the extension. 
    1. For most recent release, go to https://github.com/dteviot/WebToEpub and click on the "Download Zip" button.
    2. For current development branch, go to https://github.com/dteviot/WebToEpub/tree/ExperimentalTabMode and click on the "Download Zip" button.
2. Unpack zip file and move the "plugin" directory to the location you want to keep it.
3. In the "plugin" directory from the previous step there is a "jszip" directory.  Create a "dist" directory inside this "jszip" directory.
4. Download jszip library v3.0.0 from https://github.com/Stuk/jszip
5. Extract jszip.min.js from the jszip library and copy to the "dist" directory you created in step 3.
6. Open Chrome and type "chrome://extensions" into the browser.
7. Make sure "Developer Mode" at the top of the page is checked.
8. Press the "Load unpacked extension.." button and browse to the "plugin" directory from step 2.
9. On Chrome you may see a warning message "Unrecognized manifest key 'applications'."  This can be safely ignored.  (The source version supports both Firefox and Chrome. The 'applications' key is needed by Firefox, but Chrome does not recognise it.)

### Firefox
1. Make sure you can install unsigned addons (only possible in Nightly and Developer Edition).
2. Download the extension.
    1. For most recent release, go to https://github.com/dteviot/WebToEpub and click on the "Download Zip" button.
    2. For current development branch, go to https://github.com/dteviot/WebToEpub/tree/ExperimentalTabMode and click on the "Download Zip" button.
3. Unpack zip file and move the "plugin" directory to the location you want to keep it.
4. In the "plugin" directory from the previous step there is a "jszip" directory.  Create a "dist" directory inside this "jszip" directory.
5. Download jszip library v3.0.0 from https://github.com/Stuk/jszip
6. Extract jszip.min.js from the jszip library and copy to the "dist" directory you created in step 4.
7. Open Firefox and type "about:debugging" into the URL bar.
8. Click "Load Temporary Add-on".
9. Open the "plugin" directory from step 3 and select manifest.json.

## License information
Licenced under GPLv3.

WebToEpub uses the following libraries:
* JSZip library v3.0.0: https://github.com/Stuk/jszip, which is dual licensed with the MIT license or GPLv3.
* quint: http://qunitjs.com/, licensed under MIT license.

## Other notes
### To run unit tests under Chrome
* Close all running copies of Chrome 
* Start Chrome with command line argument --allow-file-access-from-files
* Load unitTest/Tests.html
* If you get **_Failed to read the 'localStorage' property from 'Window': Access is denied for this document_** errors
    * Type **_chrome://settings/content_** into Chrome's search bar 
    * Uncheck **_Block third-party cookies and site data_**
    * Click **_Finished_**
    * Re-run unit tests
* When finished with unit tests. 
    * Restore original value of **_Block third-party cookies and site data_** (if you changed it).
    * close all running copies of Chrome

### To run unit tests under Firefox
* Start Firefox 
* Go to about:config
* Find security.fileuri.strict_origin_policy parameter
* Set it to false
* Load unitTest/Tests.html
* (Remember to reset security.fileuri.strict_origin_policy to true when done.

### To run eslint (and build the plugins)
* Install Node.js (if not already installed)
* Use node's package manager to download and install eslint and the "xmldom" https://www.npmjs.com/package/xmldom package. (Needed by pack.js)
* Use Node.js to run eslint/pack.js
* This will produce 3 files in the eslint directory.
    * WebToEpub0.0.0.x.xpi   (Firefox version of plug-in.)
    * WebToEpub0.0.0.x.zip   (Chrome version of plug-in.)
    * packed.js  (All JavaScript files packaged into single file, for eslint to examine.)
* Command line for eslint is "eslint packed.js > error.txt"
