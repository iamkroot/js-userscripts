// ==UserScript==
// @name         CS341 RevealJS FA fix
// @namespace    iamkroot
// @version      2024-01-24
// @description  Fix glyph due to old FontAwesome files
// @author       You
// @match        https://cs341.cs.illinois.edu/slides/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=illinois.edu
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    // taken from https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
    function waitForElm(selector) {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (document.querySelector(selector)) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    waitForElm("#toggle-notes").then((n) => {
        const inner = n.firstChild.firstChild;
        inner.classList.remove("fa-pencil");
        inner.classList.add("fa-pen");
    });
    // const l = document.createElement("link");
    // l.setAttribute("rel", "stylesheet");
    // l.setAttribute("href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/css/font-awesome.css");
    // document.head.appendChild(l);
})();