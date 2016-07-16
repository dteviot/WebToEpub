# WebToEpub
(c) 2015 David Teviotdale   
Firefox mod by Markus Vieth

A simple Extension for Firefox and Chrome that converts a story on Baka-Tsuki into an EPUB.
Also works with 
* ArchiveOfOurOwn.org
* mugglenet.com
* FanFiction.net
* royalroadl.com 

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
* Download the extension. Go to https://github.com/dteviot/WebToEpub and click on the "Download Zip" button.
* Open zip file and copy the "plugin" folder where you want to keep it.
* Open Chrome and type "chrome://extensions" into the browser.
* Make sure "Developer Mode" at the top of the page is checked.
* Press the "Load unpacked extension.." button and browse to the "plugin" folder from step 2.

For details on how to extend, see http://www.codeproject.com/Articles/1060680/Web-to-EPUB-Extension-for-Chrome.

### Firefox
* Make sure you can install unsigned addons (only possible in Nightly and Developer Edition).
* Download the extension. Go to https://github.com/dteviot/WebToEpub and click on the "Download Zip" button.
* Open zip file and pack the content of "plugin" folder in a zip file (with manifest.json on root level).
* Change the extension from zip to xpi
* Open Firefox and type "about:addons" into the browser.
* Drag & Drop the xpi file in the Firefox window.

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
* When finished, close all running copies of Chrome

### To run unit tests under Firefox
* Start Firefox 
* Go to about:config
* Find security.fileuri.strict_origin_policy parameter
* Set it to false
* Load unitTest/Tests.html
* (Remember to reset security.fileuri.strict_origin_policy to true when done.
