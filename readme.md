# WebToEpub
(c) 2015 David Teviotdale

A simple Chrome Extension that converts a story on Baka-Tsuki into an EPUB.
Also works with ArchiveOfOurOwn.org and FanFiction.net.

## How to use with Baka-Tsuki:
* In Chrome, browse to a Baka-Tsuki web page that has the full text of a story.
* Click on the WebToEpub icon on top right of the Chrome window.
* Check story details are correct.
* Select image to use for cover.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the images being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to use with Archive of Our Own:
* In Chrome, browse to first chapter of story you want.
* Click on the WebToEpub icon on top right of the Chrome window.
* Check story details are correct.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the additional chapters are being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to install from Chrome Web Store
* Start Chrome
* Go to https://chrome.google.com/webstore/deta ... cnibaigelm
* Click on the "Add to Chrome" button.

## How to install from Source
* Download the extension. Go to https://github.com/dteviot/WebToEpub and click on the "Download Zip" button.
* Open zip file and copy the "plugin" folder where you want to keep it.
* Open Chrome and type "chrome://extensions" into the browser.
* Make sure "Developer Mode" at the top of the page is checked.
* Press the "Load unpacked extension.." button and browse to the "plugin" folder from step 2.

For details on how to extend, see http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

## License information
Licenced under GPLv3.

WebToEpub uses the following libraries:
* JSZip library: https://github.com/Stuk/jszip, which is dual licensed with the MIT license or GPLv3.
* quint: http://qunitjs.com/, licensed under MIT license.
