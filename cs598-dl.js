// ==UserScript==
// @name         CS598 AIE site helpers
// @namespace    iamkroot
// @version      2024-09-16
// @description  Some helpers
// @author       iamkroot
// @match        https://minjiazhang.github.io/courses/24fall-schedule.html
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.io
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    Array.from(document.querySelectorAll("td.c5")).filter(td => td.textContent == "pdf").forEach((td, i) => {
        const title = td.parentElement.children[2];
        title.textContent = `${i+1} - `.padStart(5, 0) + title.textContent;
    });

    function downloadAll() {
        let cmds = Array.from(document.querySelectorAll("td.c5")).filter(td => td.textContent == "pdf").reduce((urls, td, i) => {
            const filename = td.firstChild.href.split('/').pop();
            if (!filename.endsWith(".pdf")) return urls;
            const date = td.parentElement.children[0];
            const title = `${i+1} - `.padStart(5, 0) + decodeURIComponent(filename) + ` (${date.textContent})`;
            return [...urls, {url: td.firstChild.href, title}];
        }, []).map(({url, title}) => `wget -O "${title}" "${url}"`).join("\n");
        copy(cmds);
    }
    // Your code here...
})();