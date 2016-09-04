/*
  Makes HTML calls using Fetch API
*/
"use strict";

class HttpClient {
    constructor() {
    }

    static wrapFetch(url) {
        let that = this;
        let state = {
            isHtml: function () { return this.contentType.startsWith("text/html"); }
        };
        return fetch(url).then(function(response) {
            return HttpClient.checkResponseAndGetData(state, response);
        }).then(function(data) {
            state.addData(state, data);
            return state;
        });
    }

    static checkResponseAndGetData(state, response) {
        if(!response.ok) {
            return Promise.reject(new Error("Fetch of '" + response.url + "' failed with network error " + response.status));
        } else {
            state.response = response;
            state.contentType = response.headers.get("content-type");
            if (state.isHtml()) {
                state.addData = HttpClient.responseToHtml;
                return response.text();
            } else {
                state.addData = HttpClient.responseToBinary;
                return response.arrayBuffer();
            }
        }
    }

    static responseToHtml(state, data) {
        let html = new DOMParser().parseFromString(data, "text/html");
        util.setBaseTag(state.response.url, html);
        state.responseXML = html;
    }

    static responseToBinary(state, data) {
        state.arrayBuffer = data;
    }
}
