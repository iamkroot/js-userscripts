// ==UserScript==
// @name         DumpHTML
// @namespace    iamkroot
// @version      2025-03-25
// @description  try to take over the world!
// @author       iamkroot
// @match        https://app.diagrams.net/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=diagrams.net
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @run-at document-body
// ==/UserScript==

(function() {
    'use strict';
    var saveAsFile = function(fileName, fileContents) {
        if (typeof(Blob) != 'undefined') { // Alternative 1: using Blob
            var textFileAsBlob = new Blob([fileContents], {type: 'text/plain'});
            var downloadLink = document.createElement("a");
            downloadLink.download = fileName;
            if (window.webkitURL != null) {
                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
            } else {
                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                downloadLink.onclick = document.body.removeChild(event.target);
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }
            downloadLink.click();
        } else { // Alternative 2: using Data
            var pp = document.createElement('a');
            pp.setAttribute('href', 'data:text/plain;charset=utf-8,' +
                encodeURIComponent(fileContents));
            pp.setAttribute('download', fileName);
            pp.onclick = document.body.removeChild(event.target);
            pp.click();
        }
    } // saveAsFile
    let fileContents = document.documentElement.outerHTML;
    let fileName = `${document.title}.html`;
    let blob = new Blob([fileContents], {type: 'text/plain'});
    var downloadLink = document.createElement("a");
    downloadLink.download = fileName;
    // if (window.webkitURL != null) {
    //     downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    // } else {
        downloadLink.href = window.URL.createObjectURL(blob);
        // downloadLink.onclick = document.body.removeChild(event.target);
        // downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    // }
    // downloadLink.click();
GM_registerMenuCommand("Dump HTML", function() {
    // let blob = new Blob([fileContents], {type: 'text/plain'});
saveAsFile(fileName, fileContents);
    // GM_download({url:blob, name: fileName})
}, "d");// Your code here...
})();