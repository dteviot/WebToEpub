function getActiveTab() {
    return new Promise(function (resolve, reject) {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
            if ((tabs != null) && (0 < tabs.length)) {
                resolve(tabs[0].id);
            } else {
                reject();
            }
        });
    });
}

function openTabWindow() {
    // open new tab window, passing ID of open tab with content to convert to epub as query parameter.
    getActiveTab().then(function (tabId) {
        let url = chrome.runtime.getURL("popup.html") + "?id=";
        url += tabId;
        chrome.tabs.create({url: url});
        window.close();
    });
}

chrome.browserAction.onClicked.addListener(
    function () {
        openTabWindow();
    }
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    fetch(request.input, request.init).then(function (response) {
        return response.text().then(function (text) {
            sendResponse([{
                body: text,
                status: response.status,
                statusText: response.statusText,
            }, null]);
        });
    }, function (error) {
        sendResponse([null, error]);
    });
    return true;
});


