# WebToEpub for Firefox
mod by Markus Vieth
(c) 2015 David Teviotdale

A simple Firefox Extension that converts a story on Baka-Tsuki into an EPUB.
Also works with ArchiveOfOurOwn.org and FanFiction.net.

## How to use with Baka-Tsuki:
* In Firefox, browse to a Baka-Tsuki web page that has the full text of a story.
* Click on the WebToEpub icon on top right of the Firefox window.
* Check story details are correct.
* Select image to use for cover.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the images being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to use with Archive of Our Own:
* In Firefox, browse to first chapter of story you want.
* Click on the WebToEpub icon on top right of the Firefox window.
* Check story details are correct.
* Click the "Pack EPUB" button.
* Wait for progress bar to finish (indicating the additional chapters are being downloaded) and the generated EPUB to be placed in your downloads directory.

## How to install
* Start Firefox
* Go to https://github.com/Gusser93/WebToEpubForFirefox/releases
* Click on webtoepub-***-fx.an.xpi.

## How to install from Source
* Download the extension. Go to https://github.com/Gusser93/WebToEpubForFirefox and click on the "Download Zip" button.
* Open zip file and pack the content of "plugin" folder in a zip file (with manifest.json on root level).
* Change the extension from zip to xpi
* Open Firefox and type "about:addons" into the browser.
* Make sure you can install unsigned addons (only possible in Nightly and Developer Edition).
* Drag & Drop the xpi file in the Firefox window.

For details on how to extend, see http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

## License information
Licenced under GPLv3.

WebToEpub uses the following libraries:
* JSZip library: https://github.com/Stuk/jszip, which is dual licensed with the MIT license or GPLv3.
* quint: http://qunitjs.com/, licensed under MIT license.
